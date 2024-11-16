import { jest } from '@jest/globals';
import { CacheWithTTL } from '../../lib/cache/CacheWithTTL.js';

describe('CacheWithTTL', () => {
  let cache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new CacheWithTTL({ stdTTL: 1, maxSize: 1024 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store and retrieve items', () => {
    cache.set('key1', 'value1', 1000);
    expect(cache.get('key1')).toBe('value1');
  });

  it('should expire items after TTL', () => {
    cache.set('key1', 'value1', 500);
    jest.advanceTimersByTime(600);
    expect(cache.get('key1')).toBeNull();
  });

  it('should remove the least recently used item when size exceeds maxSize', () => {
    cache.set('key1', 'x'.repeat(508), 1000); // ~512 byte
    cache.set('key2', 'x'.repeat(508), 1000);
    cache.set('key3', 'x'.repeat(508), 1000);

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('x'.repeat(508));
    expect(cache.get('key3')).toBe('x'.repeat(508));
  });

  it('should clear all items', () => {
    cache.set('key1', 'value1', 1000);
    cache.clear();
    expect(cache.get('key1')).toBeNull();
  });

  it('should return stats correctly', () => {
    cache.set('key1', 'value1', 1000);
    const stats = cache.getStats();
    expect(stats.entries).toBe(1);
    expect(stats.currentSize).toBeGreaterThan(0);
  });

  it('should handle failed cache sets', () => {
    const hugeValue = 'x'.repeat(2048); // Larger than maxSize
    const result = cache.set('key1', hugeValue, 1000);
    expect(result).toBe(false);
  });

  it('should handle multiple LRU removals', () => {
    // Fill the cache with elements that occupy ~100 bytes each
    for (let i = 0; i < 12; i++) {
      // 12 * 100 > 1024
      cache.set(`key${i}`, 'x'.repeat(100), 1000);
    }

    // Verify that first elements were removed to make space
    expect(cache.get('key0')).toBeNull();
    expect(cache.get('key1')).toBeNull();
    // Last elements should still be in cache
    expect(cache.get('key10')).toBe('x'.repeat(100));
    expect(cache.get('key11')).toBe('x'.repeat(100));
  });

  it('should handle real-world response caching', () => {
    const response = {
      status: 200,
      data: { id: 1, title: 'test', body: 'content' },
      headers: { 'content-type': 'application/json' },
      config: { url: 'https://api.example.com/posts/1' },
    };

    // Test with real response
    const result = cache.set('test-key', response, 1000);
    expect(result).toBe(true);

    // Verify cache size
    const stats = cache.getStats();
    expect(stats.currentSize).toBeGreaterThan(0);
    expect(stats.currentSize).toBeLessThan(cache.maxSize);
  });

  it('should handle edge cases in cache operations', () => {
    // Test with undefined values
    expect(cache.set(undefined, 'value', 1000)).toBe(false);
    expect(cache.get(undefined)).toBeNull();

    // Test with invalid TTL
    cache.set('key1', 'value1', -1);
    expect(cache.get('key1')).toBeNull();

    // Test cache cleanup
    cache.cleanExpired();
    expect(cache.getStats().entries).toBe(0);

    // Test LRU removal on empty cache
    expect(cache.removeLeastRecentlyUsed()).toBe(false);
  });

  it('should reject values larger than maxSize', () => {
    const cache = new CacheWithTTL({ maxSize: 10 }); // Very small size
    const largeValue = { data: 'x'.repeat(100) }; // Value larger than maxSize
    expect(cache.set('key', largeValue, 1000)).toBe(false);
  });

  it('should handle removal of non-existent entries', () => {
    const cache = new CacheWithTTL();
    expect(cache.removeEntry('non-existent-key')).toBeNull();
  });
});

describe('CacheWithTTL Edge Cases', () => {
  let cache;
  let originalCalculateSize;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new CacheWithTTL({ stdTTL: 1, maxSize: 1024 });
    // Save the original method
    originalCalculateSize = CacheWithTTL.calculateSize;
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore the original method
    CacheWithTTL.calculateSize = originalCalculateSize;
  });

  it('should handle calculateSize errors', () => {
    // Direct mock of the calculateSize method
    CacheWithTTL.calculateSize = jest.fn().mockImplementation(() => {
      throw new Error('Size calculation failed');
    });

    const circular = { a: 1 };
    circular.self = circular;

    // Verify that the set fails when calculateSize throws an error
    expect(cache.set('key1', circular, 1000)).toBe(false);

    // Verify that the mock was called
    expect(CacheWithTTL.calculateSize).toHaveBeenCalled();
  });

  it('should handle size limits correctly', () => {
    // Mock the calculateSize method to return specific sizes
    CacheWithTTL.calculateSize = jest
      .fn()
      .mockReturnValueOnce(2000) // First call: too large
      .mockReturnValueOnce(5); // Second call: acceptable size

    // Try to add an element that is too large
    expect(cache.set('key1', 'large value', 1000)).toBe(false);

    // Try to add an element of acceptable size
    expect(cache.set('key2', 'small', 1000)).toBe(true);

    // Verify that the mock was called correctly
    expect(CacheWithTTL.calculateSize).toHaveBeenCalledTimes(2);
  });

  it('should handle edge cases in cache size management', () => {
    // Mock the calculateSize method to return a fixed size
    CacheWithTTL.calculateSize = jest.fn().mockReturnValue(400);

    // Fill the cache up to the limit (1024 bytes)
    expect(cache.set('key1', 'value1', 1000)).toBe(true);
    expect(cache.set('key2', 'value2', 1000)).toBe(true);

    // This should cause the eviction of key1
    expect(cache.set('key3', 'value3', 1000)).toBe(true);

    // Verify that the first element was removed
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
  });

  it('should handle concurrent modifications during size check', () => {
    // Mock the calculateSize method to return a fixed size
    CacheWithTTL.calculateSize = jest.fn().mockReturnValue(400);

    // Fill the cache
    expect(cache.set('key1', 'value1', 1000)).toBe(true);

    // Simulate a concurrent modification emptying the cache
    cache.clear();

    // Try to add a new element
    expect(cache.set('key2', 'value2', 1000)).toBe(true);
  });

  it('should handle edge cases in LRU removal', () => {
    // Mock the calculateSize method to return a fixed size
    CacheWithTTL.calculateSize = jest.fn().mockReturnValue(400);

    // Fill the cache
    expect(cache.set('key1', 'value1', 1000)).toBe(true);
    expect(cache.set('key2', 'value2', 1000)).toBe(true);

    // Access key2 to make it more recent
    cache.get('key2');

    // Empty the cache during the LRU removal process
    const originalDelete = cache.cache.delete;
    cache.cache.delete = jest.fn().mockImplementation((key) => {
      cache.clear(); // Simulate a concurrent modification
      return originalDelete.call(cache.cache, key);
    });

    // Try to add a new element that should cause an LRU removal
    expect(cache.set('key3', 'value3', 1000)).toBe(true);

    // Restore the original delete method
    cache.cache.delete = originalDelete;
  });

  it('should handle empty cache during LRU removal', () => {
    // Try to remove from an empty cache
    expect(cache.removeLeastRecentlyUsed()).toBe(false);

    // Add an element and manually remove it
    expect(cache.set('key1', 'value1', 1000)).toBe(true);
    cache.clear();

    // Try to remove again from an empty cache
    expect(cache.removeLeastRecentlyUsed()).toBe(false);
  });

  it('should handle concurrent modifications during LRU removal', () => {
    // Mock calculateSize to return a known size
    CacheWithTTL.calculateSize = jest.fn().mockReturnValue(400);

    // Fill the cache
    expect(cache.set('key1', 'value1', 1000)).toBe(true);
    expect(cache.set('key2', 'value2', 1000)).toBe(true);

    // Simulate a concurrent modification during the LRU removal
    const originalDelete = cache.cache.delete;
    let deleteCount = 0;
    cache.cache.delete = jest.fn().mockImplementation((key) => {
      deleteCount++;
      if (deleteCount === 1) {
        // At the first call, empty the cache
        cache.clear();
        return true;
      }
      return originalDelete.call(cache.cache, key);
    });

    // Add an element that should cause an LRU removal
    expect(cache.set('key3', 'value3', 1000)).toBe(true);

    // Restore the original method
    cache.cache.delete = originalDelete;
  });

  it('should handle edge cases in size calculation', () => {
    // Mock calculateSize to simulate various scenarios
    CacheWithTTL.calculateSize = jest
      .fn()
      .mockReturnValueOnce(cache.maxSize) // Exactly maxSize
      .mockReturnValueOnce(cache.maxSize + 1) // Too large
      .mockReturnValueOnce(cache.maxSize - 1); // Just under maxSize

    // Test with value that occupies exactly maxSize
    expect(cache.set('key1', 'value1', 1000)).toBe(true);

    // Test with value that is too large
    expect(cache.set('key2', 'value2', 1000)).toBe(false);

    // Test with value just under maxSize
    expect(cache.set('key3', 'value3', 1000)).toBe(true);
  });
});
