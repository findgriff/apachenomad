import "dotenv/config";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { Prisma, PrismaClient } from "@prisma/client";
import { searchLeg } from "@nomad/amadeus-adapter";
import { priceKey, redis, takeToken } from "@nomad/shared";

const prisma = new PrismaClient();

const redisConnection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

type Edge = { o: string; d: string; date: string };

const filtersHash = (params: {
  includeAirlines?: string[];
  excludeAirlines?: string[];
  maxConnections?: number;
}) =>
  `inc=${(params.includeAirlines || []).join(",")}|exc=${(params.excludeAirlines || []).join(",")}|conn=${
    params.maxConnections ?? 1
  }`;

async function fetchLegPrice(
  edge: Edge,
  jobId: string,
  jobConfig: {
    includeAirlines?: string[];
    excludeAirlines?: string[];
    maxConnections?: 0 | 1;
    currency: string;
  },
) {
  const key = priceKey({
    o: edge.o,
    d: edge.d,
    date: edge.date,
    inc: jobConfig.includeAirlines,
    exc: jobConfig.excludeAirlines,
  });

  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  await takeToken("amadeus", 10);
  const result = await searchLeg({
    origin: edge.o,
    dest: edge.d,
    date: edge.date,
    currency: jobConfig.currency,
    includeAirlines: jobConfig.includeAirlines,
    excludeAirlines: jobConfig.excludeAirlines,
    maxConnections: jobConfig.maxConnections,
  });

  await redis.setex(key, 60 * 60 * 24, JSON.stringify(result));

  await prisma.priceMatrix.upsert({
    where: {
      jobId_orig_dest_depDate_filtersHash: {
        jobId,
        orig: edge.o,
        dest: edge.d,
        depDate: new Date(edge.date),
        filtersHash: filtersHash({
          includeAirlines: jobConfig.includeAirlines,
          excludeAirlines: jobConfig.excludeAirlines,
          maxConnections: jobConfig.maxConnections,
        }),
      },
    },
    update: {
      offerId: result.offerId ?? undefined,
      priceCents: result.minPriceCents ?? undefined,
      currency: result.currency ?? jobConfig.currency,
      legs: result.legs as Prisma.InputJsonValue,
      fetchedAt: new Date(result.fetchedAt),
    },
    create: {
      jobId,
      orig: edge.o,
      dest: edge.d,
      depDate: new Date(edge.date),
      filtersHash: filtersHash({
        includeAirlines: jobConfig.includeAirlines,
        excludeAirlines: jobConfig.excludeAirlines,
        maxConnections: jobConfig.maxConnections,
      }),
      offerId: result.offerId ?? undefined,
      priceCents: result.minPriceCents ?? undefined,
      currency: result.currency ?? jobConfig.currency,
      legs: result.legs as Prisma.InputJsonValue,
    },
  });

  return result;
}

async function updateJobStatus(jobId: string, status: string) {
  await prisma.job.update({ where: { id: jobId }, data: { status } });
}

new Worker(
  "jobs",
  async (job: Job) => {
    const jobId = (job.data as any).jobId as string | undefined;
    if (!jobId) return;

    const dbJob = await prisma.job.findUnique({ where: { id: jobId } });
    if (!dbJob) return;

    try {
      await updateJobStatus(jobId, "running");

      const start = new Date(dbJob.windowStart);
      const end = new Date(dbJob.windowEnd);
      const dates: string[] = [];
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
      }
      if (!dates.length) {
        throw new Error("Invalid date window for job");
      }

      const citySequence = [dbJob.origin, ...dbJob.cities];
      if (dbJob.endFixed) {
        citySequence.push(dbJob.endFixed);
      } else {
        citySequence.push(dbJob.origin);
      }
      const minNights = Math.max(dbJob.nightsMin, 1);

      const jobConfig = {
        includeAirlines: dbJob.includeAirlines,
        excludeAirlines: dbJob.excludeAirlines,
        maxConnections: dbJob.maxConnections as 0 | 1,
        currency: dbJob.currency,
      };

      const legs: Edge[] = [];
      let legDate = dates[0];
      for (let i = 0; i < citySequence.length - 1; i++) {
        const depDate = legDate ?? dates[0];
        legs.push({
          o: citySequence[i],
          d: citySequence[i + 1],
          date: depDate,
        });
        const next = new Date(depDate);
        next.setUTCDate(next.getUTCDate() + minNights);
        const nextStr = next.toISOString().slice(0, 10);
        legDate = dates.find((d) => d >= nextStr) ?? dates[dates.length - 1];
      }

      const pricedLegs = [];
      let total = 0;

      for (const leg of legs) {
        const res = await fetchLegPrice(leg, jobId, jobConfig);
        pricedLegs.push({ ...leg, result: res });
        if (res.minPriceCents == null) {
          total = Number.NaN;
        } else if (!Number.isNaN(total)) {
          total += res.minPriceCents;
        }
      }

      const totalPriceCents = Number.isNaN(total) ? null : total;

      await prisma.result.upsert({
        where: { jobId_rank: { jobId, rank: 1 } },
        update: {
          cityOrder: citySequence,
          dates: legs.map((l) => new Date(l.date)),
          totalPriceCents: totalPriceCents ?? 0,
          currency: dbJob.currency,
          pricingDeltaPct: 0,
          deepLink: "#",
          legs: pricedLegs as Prisma.InputJsonValue,
          pricedAt: new Date(),
        },
        create: {
          jobId,
          rank: 1,
          cityOrder: citySequence,
          dates: legs.map((l) => new Date(l.date)),
          totalPriceCents: totalPriceCents ?? 0,
          currency: dbJob.currency,
          pricingDeltaPct: 0,
          deepLink: "#",
          legs: pricedLegs as Prisma.InputJsonValue,
          pricedAt: new Date(),
        },
      });

      await updateJobStatus(jobId, totalPriceCents !== null ? "done" : "partial");
    } catch (err) {
      await updateJobStatus(jobId, "error");
      console.error("Worker error", err);
    }
  },
  { connection: redisConnection },
);
