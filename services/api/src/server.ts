import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const app = Fastify({ logger: true });

const prisma = new PrismaClient();

const redisConnection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const jobsQ = new Queue("jobs", { connection: redisConnection });

const JobSchema = z.object({
  origin: z.string(),
  endFixed: z.string().optional().nullable(),
  cities: z.array(z.string()).min(3).max(6),
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

app.register(cors, {
  origin: true,
});

app.post("/jobs", async (req, reply) => {
  const parsed = JobSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.issues });
  }

  const body = parsed.data;

  const job = await prisma.job.create({
    data: {
      status: "queued",
      ...body,
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
