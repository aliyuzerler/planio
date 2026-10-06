import { Inject, Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../../infrastructure/redis/redis.module";

/**
 * @nestjs/throttler paketi kayıt tipini index'ten dışa aktarmıyor; arayüz
 * (increment dönüşü) birebir aynı olduğu için yerel karşılığı kullanılıyor.
 */
interface StorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * @nestjs/throttler için Redis destekli sayaç deposu. Varsayılan depo
 * süreç belleğinde çalışır: çoklu replikada her örnek kendi sayacını tutar
 * ve etkin limit replika sayısıyla çarpılır. Buradaki implementasyon tüm
 * örnekların paylaştığı Redis'te atomik (Lua) sayar.
 *
 * Anahtar: `xenior:throttle:<guard anahtarı>`; saklanan alanlar: hits,
 * expiresAt (pencere sonu, ms), blockedUntil (blok sonu, ms).
 */
const INCREMENT_SCRIPT = `
local data = redis.call('HMGET', KEYS[1], 'hits', 'expiresAt', 'blockedUntil')
local hits = tonumber(data[1]) or 0
local expiresAt = tonumber(data[2]) or 0
local blockedUntil = tonumber(data[3]) or 0
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

if expiresAt <= now then
  hits = 0
  expiresAt = now + ttl
end

local isBlocked = blockedUntil > now
if not isBlocked then
  hits = hits + 1
end

if hits > limit and not isBlocked then
  isBlocked = true
  blockedUntil = now + blockDuration
end

redis.call('HMSET', KEYS[1], 'hits', hits, 'expiresAt', expiresAt, 'blockedUntil', blockedUntil)
redis.call('PEXPIRE', KEYS[1], math.max(ttl, blockDuration) + 60000)
return {hits, math.ceil((expiresAt - now) / 1000), isBlocked and 1 or 0, math.ceil((blockedUntil - now) / 1000)}
`;

const KEY_PREFIX = "xenior:throttle:";

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<StorageRecord> {
    const result = (await this.redis.eval(
      INCREMENT_SCRIPT,
      1,
      `${KEY_PREFIX}${key}`,
      ttl,
      limit,
      blockDuration,
      Date.now(),
    )) as [number, number, number, number];

    return {
      totalHits: result[0],
      timeToExpire: Math.max(0, result[1]),
      isBlocked: result[2] === 1,
      timeToBlockExpire: Math.max(0, result[3]),
    };
  }
}
