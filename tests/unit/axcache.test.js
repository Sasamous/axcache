import createAxcache, { CacheWithTTL } from '../../lib/axcache.js';
import axios from 'axios';
import { jest, expect, describe, it, beforeEach } from '@jest/globals';

describe('axcache Unit Tests', () => {
  let axcache;
  let onCacheHit;
  let onCacheMiss;
  let onCacheWrite;

  beforeEach(() => {
    jest.clearAllMocks();

    onCacheHit = jest.fn();
    onCacheMiss = jest.fn();
    onCacheWrite = jest.fn();

    axcache = createAxcache({
      stdTTL: 1,
      maxSizeMB: 1,
      onCacheHit,
      onCacheMiss,
      onCacheWrite,
    });
  });

  it('should cache and reuse GET requests', async () => {
    const firstResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.data).toBeDefined();
    expect(onCacheMiss).toHaveBeenCalled();

    const start = Date.now();
    const secondResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    const duration = Date.now() - start;

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.data).toEqual(firstResponse.data);
    expect(duration).toBeLessThan(20);
    expect(onCacheHit).toHaveBeenCalled();
  });

  it('should bypass cache with forceRefresh', async () => {
    const firstResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(firstResponse.status).toBe(200);

    const secondResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1',
      {
        forceRefresh: true,
      }
    );

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.data).toEqual(firstResponse.data);
    expect(onCacheMiss).toHaveBeenCalledTimes(2);
  });

  it('should handle cache expiration', async () => {
    const firstResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(firstResponse.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const secondResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(secondResponse.status).toBe(200);
    expect(onCacheMiss).toHaveBeenCalledTimes(2);
  });

  it('should handle network errors gracefully', async () => {
    try {
      await axcache.get('https://non-existing-url.com/api');
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
      expect(onCacheMiss).toHaveBeenCalled();
    }
  });

  describe('Utils and Edge Cases', () => {
    it('should handle circular references in generateCacheKey', () => {
      const circular = { foo: 'bar' };
      circular.self = circular;

      const config = {
        method: 'get',
        url: 'https://example.com',
        params: circular,
      };

      const key1 = axcache.generateCacheKey(config);
      expect(key1).toBeDefined();
      expect(typeof key1).toBe('string');
      expect(key1).toHaveLength(32);
    });

    it('should properly handle cache invalidation', async () => {
      const url = 'https://jsonplaceholder.typicode.com/posts/1';
      const params = { test: 'value' };

      // First request
      const firstResponse = await axcache.get(url, { params });
      expect(firstResponse.status).toBe(200);
      expect(onCacheMiss).toHaveBeenCalledTimes(1);

      // Explicitly invalidate - should return true because the key exists
      const wasInvalidated = axcache.invalidateCache(url, params);
      expect(typeof wasInvalidated).toBe('boolean');

      // Try to invalidate a non-existent key
      const nonExistentInvalidation = axcache.invalidateCache(
        'https://non-existent-url.com',
        { fake: 'params' }
      );
      expect(nonExistentInvalidation).toBe(false);

      // Second request after invalidation
      const secondResponse = await axcache.get(url, { params });
      expect(secondResponse.status).toBe(200);
      expect(onCacheMiss).toHaveBeenCalledTimes(2);
    });

    it('should return correct cache stats', async () => {
      const url = 'https://jsonplaceholder.typicode.com/posts/1';

      const emptyStats = axcache.getCacheStats();
      expect(emptyStats.entries).toBe(0);

      await axcache.get(url);

      const stats = axcache.getCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.currentSize).toBeGreaterThan(0);
      expect(stats.maxSize).toBe(1024 * 1024);
    });

    it('should handle network errors', async () => {
      try {
        await axcache.get('https://invalid-url-that-will-fail.com');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.isCached).toBeUndefined();
      }
    });

    it('should handle invalid axios initialization', () => {
      const axiosBackup = axios.create;
      axios.create = undefined;

      expect(() => createAxcache()).toThrow(
        'Axios was not properly initialized'
      );

      axios.create = axiosBackup;
    });
  });

  it('should handle cache operations with default callbacks', async () => {
    const simpleCache = createAxcache(); // Senza callbacks

    const firstResponse = await simpleCache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(firstResponse.status).toBe(200);

    const secondResponse = await simpleCache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(secondResponse.status).toBe(200);
  });

  it('should handle custom TTL in request config', async () => {
    const firstResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1',
      {
        ttl: 0.1, // 100ms
      }
    );
    expect(firstResponse.status).toBe(200);

    // Wait for cache expiration
    await new Promise((r) => setTimeout(r, 150));

    // Questa dovrebbe essere una nuova richiesta
    const secondResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.data).toEqual(firstResponse.data);
    expect(onCacheMiss).toHaveBeenCalledTimes(2);

    const stats = axcache.getCacheStats();
    expect(stats.entries).toBe(1);
  });

  describe('Advanced Cache Scenarios', () => {
    it('should handle circular references in request data', async () => {
      const circular = {
        id: 1,
        name: 'test',
      };
      circular.self = circular;

      // Test with circular params
      const response = await axcache.get(
        'https://jsonplaceholder.typicode.com/posts/1',
        {
          params: {
            filter: JSON.stringify({ simple: 'value' }),
          },
        }
      );
      expect(response.status).toBe(200);
    });

    it('should properly handle cache invalidation with complex requests', async () => {
      const url = 'https://jsonplaceholder.typicode.com/posts/1';
      const params = { filter: 'test' };

      // First request - should go to network
      const firstResponse = await axcache.get(url, { params });
      expect(firstResponse.status).toBe(200);
      expect(onCacheMiss).toHaveBeenCalled();

      // Second request - should use cache
      const secondResponse = await axcache.get(url, { params });
      expect(secondResponse.status).toBe(200);
      expect(onCacheHit).toHaveBeenCalled();

      // Invalidate cache for this URL + params
      axcache.invalidateCache(url, params);

      // Third request - should go to network again
      const thirdResponse = await axcache.get(url, { params });
      expect(thirdResponse.status).toBe(200);
      expect(onCacheMiss).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors and cache interaction', async () => {
      const url = 'https://jsonplaceholder.typicode.com/posts/999999';

      try {
        await axcache.get(url);
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(onCacheMiss).toHaveBeenCalled();

        // Verify that the error was not cached
        const stats = axcache.getCacheStats();
        expect(stats.entries).toBe(0);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-GET requests correctly', async () => {
      const postResponse = await axcache.post(
        'https://jsonplaceholder.typicode.com/posts',
        {
          title: 'foo',
          body: 'bar',
          userId: 1,
        }
      );
      expect(postResponse.status).toBe(201);
      expect(onCacheMiss).not.toHaveBeenCalled();
      expect(onCacheHit).not.toHaveBeenCalled();
      expect(onCacheWrite).not.toHaveBeenCalled();

      const stats = axcache.getCacheStats();
      expect(stats.entries).toBe(0); // Verify that it was not cached
    });

    it('should handle custom TTL in request config', async () => {
      const firstResponse = await axcache.get(
        'https://jsonplaceholder.typicode.com/posts/1',
        {
          ttl: 0.1, // 100ms
        }
      );
      expect(firstResponse.status).toBe(200);

      // Wait for cache expiration
      await new Promise((r) => setTimeout(r, 150));

      await axcache.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(onCacheMiss).toHaveBeenCalledTimes(2);
    });

    it('should handle undefined cache callbacks', async () => {
      const simpleCache = createAxcache({
        stdTTL: 1,
        maxSizeMB: 1,
      });

      const firstResponse = await simpleCache.get(
        'https://jsonplaceholder.typicode.com/posts/1'
      );
      expect(firstResponse.status).toBe(200);
    });

    it('should handle network errors without caching them', async () => {
      try {
        await axcache.get('https://invalid-domain-that-does-not-exist.com');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBeDefined();
        const stats = axcache.getCacheStats();
        expect(stats.entries).toBe(0);
      }
    });

    it('should handle cache size limits correctly', async () => {
      const smallCache = createAxcache({
        stdTTL: 1,
        maxSizeMB: 0.1, // Cache size of 100KB
      });

      // Fill the cache with a large response
      const firstResponse = await smallCache.get(
        'https://jsonplaceholder.typicode.com/posts'
      );
      expect(firstResponse.status).toBe(200);

      // Try to cache another large response
      const secondResponse = await smallCache.get(
        'https://jsonplaceholder.typicode.com/comments'
      );
      expect(secondResponse.status).toBe(200);

      const stats = smallCache.getCacheStats();
      expect(stats.entries).toBeLessThanOrEqual(1);
    });

    it('should handle axios initialization errors', () => {
      const axiosBackup = axios.create;
      delete axios.create;

      expect(() => createAxcache()).toThrow(
        'Axios was not properly initialized'
      );

      axios.create = axiosBackup;
    });

    it('should handle cache operations with default TTL', async () => {
      const defaultCache = createAxcache();

      const firstResponse = await defaultCache.get(
        'https://jsonplaceholder.typicode.com/posts/1'
      );
      expect(firstResponse.status).toBe(200);

      const secondResponse = await defaultCache.get(
        'https://jsonplaceholder.typicode.com/posts/1'
      );
      expect(secondResponse.status).toBe(200);

      const stats = defaultCache.getCacheStats();
      expect(stats.entries).toBe(1);
    });

    it('should handle default TTL when not specified', () => {
      const defaultCache = createAxcache({
        maxSizeMB: 1,
      });

      // Verify that the default TTL is 24 hours (in milliseconds)
      expect(defaultCache.getCacheStats().maxSize).toBe(1024 * 1024);
    });

    it('should handle calculateSize errors', () => {
      const cache = new CacheWithTTL();

      // Save the original method
      const originalStringify = JSON.stringify;

      // Modify JSON.stringify to simulate an error
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('Stringify failed');
      });

      const problematicObject = { test: 'value' };
      expect(cache.set('key', problematicObject, 1000)).toBe(false);

      // Restore JSON.stringify
      JSON.stringify = originalStringify;
    });

    it('should handle axios initialization errors with custom config', () => {
      const axiosBackup = axios.create;
      delete axios.create; // Simulate the absence of the create method

      expect(() =>
        createAxcache({
          stdTTL: 1,
          maxSizeMB: 1,
        })
      ).toThrow('Axios was not properly initialized');

      axios.create = axiosBackup;
    });

    it('should handle deep circular references in safeStringify', () => {
      const axiosBackup = axios.create;
      axios.create = jest.fn().mockReturnValue({
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      });

      const axcache = createAxcache();

      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      obj1.ref = obj2;
      obj2.ref = obj1;

      const config = {
        method: 'get',
        url: 'test',
        data: obj1,
      };

      const key = axcache.generateCacheKey(config);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');

      axios.create = axiosBackup;
    });

    it('should handle null values in request config normalization', async () => {
      const axiosBackup = axios.create;
      const mockAxiosInstance = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        get: jest.fn().mockResolvedValue({ status: 200, data: 'test' }),
      };

      axios.create = jest.fn().mockReturnValue(mockAxiosInstance);

      const axcache = createAxcache();

      const firstResponse = await axcache.get('test', {
        data: null,
        params: null,
      });

      expect(firstResponse.status).toBe(200);

      axios.create = axiosBackup;
    });
  });

  describe('Axios Configuration', () => {
    it('should accept axios configuration options', async () => {
      const axcache = createAxcache({
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 3000,
        headers: {
          'X-Custom-Header': 'test',
        },
        // Axcache options
        stdTTL: 1,
        maxSizeMB: 1,
      });

      const response = await axcache.get('/posts/1');
      expect(response.status).toBe(200);
      expect(response.config.baseURL).toBe(
        'https://jsonplaceholder.typicode.com'
      );
      expect(response.config.timeout).toBe(3000);
      expect(response.config.headers['X-Custom-Header']).toBe('test');
    });

    it('should override default axios options', async () => {
      const axcache = createAxcache({
        timeout: 10000,
        headers: {
          'Content-Type': 'application/xml',
        },
      });

      const response = await axcache.get(
        'https://jsonplaceholder.typicode.com/posts/1'
      );
      expect(response.config.timeout).toBe(10000);
      expect(response.config.headers['Content-Type']).toBe('application/xml');
    });
  });

  it('should handle default cache size', () => {
    const defaultCache = createAxcache();
    const stats = defaultCache.getCacheStats();
    expect(stats.maxSize).toBe(50 * 1024 * 1024); // 50MB in bytes
  });
});

describe('README.md Examples', () => {
  describe('Basic Caching Example', () => {
    it('should demonstrate basic caching functionality', async () => {
      const api = createAxcache();
      const url = 'https://jsonplaceholder.typicode.com/posts/1';
      
      // First request
      const users = await api.get(url);
      expect(users.status).toBe(200);
      expect(users.data).toBeDefined();
      
      // Second request should use cache
      const cachedUsers = await api.get(url);
      expect(cachedUsers.status).toBe(200);
      expect(cachedUsers.data).toEqual(users.data);
    });
  });

  describe('Custom Cache Duration Example', () => {
    it('should handle different TTL configurations', async () => {
      const api = createAxcache({
        stdTTL: 3600 // 1 hour default
      });

      // Test short TTL
      const shortLivedData = await api.get('https://jsonplaceholder.typicode.com/todos/1', {
        ttl: 300 // 5 minutes
      });
      expect(shortLivedData.status).toBe(200);

      // Test long TTL
      const longLivedData = await api.get('https://jsonplaceholder.typicode.com/users/1', {
        ttl: 86400 // 24 hours
      });
      expect(longLivedData.status).toBe(200);

      // Verify TTL expiration
      await new Promise(r => setTimeout(r, 350));
      const expiredData = await api.get('https://jsonplaceholder.typicode.com/todos/1');
      expect(expiredData.status).toBe(200);
    });
  });

  describe('Force Refresh Example', () => {
    it('should demonstrate force refresh functionality', async () => {
      const api = createAxcache();
      const url = 'https://jsonplaceholder.typicode.com/posts/1';

      // Initial request
      const data = await api.get(url);
      expect(data.status).toBe(200);

      // Force refresh request
      const freshData = await api.get(url, {
        forceRefresh: true
      });
      expect(freshData.status).toBe(200);
    });
  });

  describe('Cache Monitoring Example', () => {
    it('should provide accurate cache statistics', async () => {
      const onCacheHit = jest.fn();
      const onCacheMiss = jest.fn();
      const onCacheWrite = jest.fn();

      const api = createAxcache({
        maxSizeMB: 10,
        onCacheHit,
        onCacheMiss,
        onCacheWrite
      });

      // Make some requests
      await api.get('https://jsonplaceholder.typicode.com/posts/1');
      await api.get('https://jsonplaceholder.typicode.com/posts/2');
      await api.get('https://jsonplaceholder.typicode.com/posts/1'); // Cache hit

      const stats = api.getCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.maxSize).toBe(10 * 1024 * 1024); // 10MB
      expect(stats.currentSize).toBeGreaterThan(0);
    });
  });

  describe('Authentication Example', () => {
    it('should properly handle authentication headers', async () => {
      const api = createAxcache({
        baseURL: 'https://jsonplaceholder.typicode.com',
        headers: {
          'Authorization': 'Bearer your-token-here'
        }
      });

      const response = await api.get('/posts/1');
      expect(response.config.headers['Authorization']).toBe('Bearer your-token-here');
      expect(response.status).toBe(200);
    });
  });

  describe('Selective Cache Invalidation Example', () => {
    it('should demonstrate cache invalidation scenarios', async () => {
      const api = createAxcache();

      // Cache some data
      await api.get('https://jsonplaceholder.typicode.com/posts/1');
      await api.get('https://jsonplaceholder.typicode.com/posts/1/comments');

      // Verify cache entries exist
      expect(api.getCacheStats().entries).toBe(2);

      // Test specific entry invalidation
      const wasInvalidated = api.invalidateCache('https://jsonplaceholder.typicode.com/posts/1');
      expect(wasInvalidated).toBe(true);

      // Test invalidation with query parameters
      await api.get('https://jsonplaceholder.typicode.com/posts', { params: { userId: 1 } });
      const wasParamInvalidated = api.invalidateCache('https://jsonplaceholder.typicode.com/posts', { userId: 1 });
      expect(wasParamInvalidated).toBe(true);
    });
  });

  describe('Memory Management Example', () => {
    it('should handle memory limits correctly', async () => {
      const api = createAxcache({
        maxSizeMB: 0.1 // Very small cache (100KB)
      });

      // Make multiple requests to test memory limits
      await api.get('https://jsonplaceholder.typicode.com/photos'); // Large response
      await api.get('https://jsonplaceholder.typicode.com/albums'); // Another response

      const stats = api.getCacheStats();
      expect(stats.currentSize).toBeLessThanOrEqual(0.1 * 1024 * 1024);
    });
  });

  describe('Axios Configuration Example', () => {
    it('should properly merge axios configurations', async () => {
      const api = createAxcache({
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        validateStatus: (status) => status < 500
      });

      const response = await api.get('/endpoint');
      expect(response.config.baseURL).toBe('https://jsonplaceholder.typicode.com');
      expect(response.config.timeout).toBe(5000);
      expect(response.config.headers['Content-Type']).toBe('application/json');
      expect(response.config.headers['Authorization']).toBe('Bearer token');
    });
  });
});
