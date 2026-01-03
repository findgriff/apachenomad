import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const priceKey = (p: {
  o: string;
  d: string;
  date: string;
  inc?: string[];
  exc?: string[];
}) =>
  `price:amadeus:v1:${p.o}:${p.d}:${p.date}:cabin=E:conn<=1:inc=${(
    p.inc || []
  ).join(",")}:exc=${(p.exc || []).join(",")}:bags=hand`;

export const takeToken = async (bucket: string, rate = 10): Promise<void> => {
  const now = Date.now();
  const key = `rl:${bucket}:${Math.floor(now / 1000)}`;
  const n = await redis.incr(key);
  await redis.expire(key, 2);
  if (n > rate) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return takeToken(bucket, rate);
  }
};
