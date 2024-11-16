import { safeStringify } from '../utils/cacheUtils.js';

// Constants for cache configuration
const DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute in milliseconds

export class CacheWithTTL {
  constructor({ stdTTL = DEFAULT_TTL, maxSize = DEFAULT_MAX_SIZE } = {}) {
    this.cache = new Map();
    this.stdTTL = stdTTL * 1000;
    this.maxSize = maxSize;
    this.currentSize = 0;
    this.lastCleanup = Date.now();
    this.accessOrder = new Map();
  }

  // Calculates the size of a value in bytes when serialized
  static calculateSize(value) {
    try {
      const serialized = safeStringify(value);
      if (!serialized) {
        return 0;
      }
      return Buffer.byteLength(serialized, 'utf8');
    } catch {
      return 0;
    }
  }

  // Checks if enough time has passed to warrant a cache cleanup
  shouldCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup > CLEANUP_INTERVAL) {
      this.lastCleanup = now;
      return true;
    }
    return false;
  }

  // Removes all expired entries from the cache
  cleanExpired() {
    if (!this.shouldCleanup()) {
      return;
    }

    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.removeEntry(key));
  }

  get(key) {
    this.cleanExpired();
    const entry = this.cache.get(key);

    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) {
        this.removeEntry(key);
      }
      return null;
    }

    const now = Date.now();
    entry.lastAccessed = now;
    this.accessOrder.delete(key);
    this.accessOrder.set(key, now);

    return entry.value;
  }

  set(key, value, ttl) {
    if (!key || value === undefined || ttl <= 0) {
      return false;
    }

    this.cleanExpired();

    try {
      const valueSize = CacheWithTTL.calculateSize(value);
      if (valueSize === 0 || valueSize > this.maxSize) {
        return false;
      }

      if (this.cache.has(key)) {
        this.removeEntry(key);
      }

      const spaceNeeded = this.currentSize + valueSize - this.maxSize;
      if (spaceNeeded > 0) {
        this.makeSpace(spaceNeeded);
      }

      const now = Date.now();
      this.cache.set(key, {
        value,
        size: valueSize,
        expiresAt: now + ttl,
        lastAccessed: now,
      });

      this.accessOrder.set(key, now);
      this.currentSize += valueSize;
      return true;
    } catch {
      return false;
    }
  }

  removeLeastRecentlyUsed() {
    if (this.cache.size === 0) {
      return false;
    }

    const oldestKey = Array.from(this.accessOrder.entries()).sort(
      ([, a], [, b]) => a - b
    )[0]?.[0];

    if (!oldestKey) {
      return false;
    }

    return this.removeEntry(oldestKey) !== null;
  }

  // Makes space in the cache by removing least recently used items
  makeSpace(spaceNeeded) {
    const entries = Array.from(this.accessOrder.entries()).sort(
      ([, a], [, b]) => a - b
    );

    let freedSpace = 0;
    const keysToRemove = [];

    for (const [key] of entries) {
      const entry = this.cache.get(key);
      if (!entry) {
        continue;
      }

      keysToRemove.push(key);
      freedSpace += entry.size;

      if (freedSpace >= spaceNeeded) {
        break;
      }
    }

    keysToRemove.forEach((key) => this.removeEntry(key));
  }

  removeEntry(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    this.currentSize -= entry.size;
    this.cache.delete(key);
    this.accessOrder.delete(key);
    return entry;
  }

  getStats() {
    return {
      entries: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      lastCleanup: this.lastCleanup,
    };
  }

  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;
    return true;
  }

  delete(key) {
    return this.removeEntry(key) !== null;
  }
}
