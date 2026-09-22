'use strict';

/**
 * Cache layer — Redis when REDIS_URL is set, in-process TTL cache otherwise.
 * API surface: get(key), set(key, value, ttlSeconds), del(pattern), flush().
 */

const config = require('./index');

class MemoryCache {
  constructor() { this.store = new Map(); this.kind = 'memory'; }
  async init() { return this; }
  async close() { this.store.clear(); }

  async get(key) {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expires && hit.expires < Date.now()) { this.store.delete(key); return null; }
    return hit.value;
  }

  async set(key, value, ttlSeconds = config.redis.ttlSeconds) {
    this.store.set(key, { value, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 });
    return true;
  }

  async del(pattern) {
    const rx = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    for (const key of [...this.store.keys()]) if (rx.test(key)) this.store.delete(key);
    return true;
  }

  async flush() { this.store.clear(); return true; }
}

class RedisCache {
  constructor() { this.client = null; this.kind = 'redis'; }
  async init() {
    const { createClient } = require('redis');
    this.client = createClient({ url: config.redis.url });
    this.client.on('error', (err) => console.warn('[redis]', err.message));
    await this.client.connect();
    return this;
  }
  async close() { if (this.client) await this.client.quit(); }
  async get(key) { const v = await this.client.get(key); return v ? JSON.parse(v) : null; }
  async set(key, value, ttlSeconds = config.redis.ttlSeconds) {
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds || undefined });
    return true;
  }
  async del(pattern) {
    const keys = await this.client.keys(pattern);
    if (keys.length) await this.client.del(keys);
    return true;
  }
  async flush() { await this.client.flushDb(); return true; }
}

let cachePromise = null;

function getCache() {
  if (!cachePromise) {
    const useRedis = Boolean(config.redis.url) && process.env.FORCE_MEMORY_CACHE !== 'true';
    const cache = useRedis ? new RedisCache() : new MemoryCache();
    cachePromise = cache.init().catch((err) => {
      if (config.env === 'production' && useRedis) throw err;
      console.warn('[cache] Redis unavailable, falling back to memory cache:', err.message);
      cachePromise = new MemoryCache().init();
      return cachePromise;
    });
  }
  return cachePromise;
}

async function closeCache() {
  if (cachePromise) { const c = await cachePromise; await c.close(); cachePromise = null; }
}

module.exports = { getCache, closeCache, MemoryCache, RedisCache };
