import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { lookupCityCode } from "@nomad/amadeus-adapter";

const app = Fastify({ logger: true });

const prisma = new PrismaClient();

const redisConnection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const jobsQ = new Queue("jobs", { connection: redisConnection });

const JobSchema = z.object({
  origin: z.string(),
  endFixed: z.string().optional().nullable(),
  cities: z.array(z.string()).min(2).max(6),
  windowStart: z.string(),
  windowEnd: z.string(),
  nightsMin: z.number().int().min(1),
  nightsMax: z.number().int(),
  weekendOnly: z.boolean().optional(),
  cabin: z.literal("ECONOMY").default("ECONOMY"),
  maxConnections: z.union([z.literal(0), z.literal(1)]).default(1),
  includeAirlines: z.array(z.string()).optional(),
  excludeAirlines: z.array(z.string()).optional(),
  currency: z.string().default(process.env.CURRENCY || "EUR"),
  budgetJobCents: z.number().int().default(Number(process.env.JOB_COST_CAP_CENTS || 200)),
});

const iataCode = /^[A-Za-z]{3}$/;

async function resolveLocationCode(value: string, label: string): Promise<string> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  if (iataCode.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const resolved = await lookupCityCode(trimmed);
  if (!resolved?.iataCode) {
    throw new Error(`Unknown city name: ${trimmed}`);
  }
  return resolved.iataCode.toUpperCase();
}

app.register(cors, {
  origin: true,
});

app.post("/jobs", async (req, reply) => {
  const parsed = JobSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues });
  }

  const body = parsed.data;
  let origin: string;
  let cities: string[];
  let endFixed: string | null = null;

  try {
    origin = await resolveLocationCode(body.origin, "origin");
    cities = await Promise.all(body.cities.map((city, index) => resolveLocationCode(city, `city ${index + 1}`)));
    const trimmedEnd = body.endFixed?.trim();
    if (trimmedEnd) {
      endFixed = await resolveLocationCode(trimmedEnd, "end");
    }
  } catch (error: any) {
    return reply.code(400).send({ error: error?.message ?? "Invalid city input" });
  }

  const job = await prisma.job.create({
    data: {
      status: "queued",
      ...body,
      origin,
      cities,
      endFixed,
      windowStart: new Date(body.windowStart),
      windowEnd: new Date(body.windowEnd),
    },
  });

  await jobsQ.add("optimize", { jobId: job.id });

  return reply.code(202).send({ id: job.id, statusUrl: `/jobs/${job.id}` });
});

app.get("/jobs/:id", async (req, reply) => {
  const id = (req.params as any).id as string;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { Result: true },
  });

  if (!job) {
    return reply.code(404).send({ error: "not found" });
  }

  return reply.send(job);
});

const port = Number(process.env.API_PORT || 3001);
const host = process.env.API_HOST || "0.0.0.0";

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
