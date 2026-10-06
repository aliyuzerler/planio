import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import { RedisThrottlerStorage } from "../src/common/guards/redis-throttler.storage";

describe("Redis throttler storage (e2e)", () => {
  let redis: Redis;
  let storage: RedisThrottlerStorage;

  beforeAll(() => {
    redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    storage = new RedisThrottlerStorage(redis);
  });

  afterAll(async () => {
    await redis.quit().catch(() => undefined);
  });

  it("counts hits within the window and blocks past the limit", async () => {
    const key = `test:${randomUUID()}`;
    const first = await storage.increment(key, 60_000, 3, 60_000, "default");
    expect(first).toMatchObject({ totalHits: 1, isBlocked: false });

    await storage.increment(key, 60_000, 3, 60_000, "default");
    const third = await storage.increment(key, 60_000, 3, 60_000, "default");
    expect(third).toMatchObject({ totalHits: 3, isBlocked: false });

    const fourth = await storage.increment(key, 60_000, 3, 60_000, "default");
    expect(fourth.totalHits).toBeGreaterThan(3);
    expect(fourth.isBlocked).toBe(true);
    expect(fourth.timeToBlockExpire).toBeGreaterThan(0);

    // Blok sürerken sayaç artmaz, blok kalır.
    const blocked = await storage.increment(key, 60_000, 3, 60_000, "default");
    expect(blocked.isBlocked).toBe(true);
  });

  it("resets the counter after the window expires", async () => {
    const key = `test:${randomUUID()}`;
    const ttl = 120;
    await storage.increment(key, ttl, 1, ttl, "default");
    const blockedHit = await storage.increment(key, ttl, 1, ttl, "default");
    expect(blockedHit.isBlocked).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, ttl + 150));

    const fresh = await storage.increment(key, ttl, 1, ttl, "default");
    expect(fresh).toMatchObject({ totalHits: 1, isBlocked: false });
  });

  it("keeps keys isolated", async () => {
    const keyA = `test:${randomUUID()}`;
    const keyB = `test:${randomUUID()}`;
    await storage.increment(keyA, 60_000, 10, 60_000, "default");
    const recordB = await storage.increment(keyB, 60_000, 10, 60_000, "default");
    expect(recordB.totalHits).toBe(1);
  });
});
