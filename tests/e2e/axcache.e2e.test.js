import createAxcache from '../../lib/axcache.js';
import { jest, expect, describe, it, beforeEach } from '@jest/globals';

describe('axcache E2E Tests', () => {
  let axcache;
  let onCacheHit;
  let onCacheMiss;
  let onCacheWrite;

  beforeEach(() => {
    onCacheHit = jest.fn();
    onCacheMiss = jest.fn();
    onCacheWrite = jest.fn();

    axcache = createAxcache({
      stdTTL: 2,
      maxSizeMB: 10,
      onCacheHit,
      onCacheMiss,
      onCacheWrite,
    });
  });

  it('should cache a GET request and reuse it', async () => {
    const firstResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(firstResponse.status).toBe(200);

    const start = Date.now();
    const secondResponse = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    const duration = Date.now() - start;

    expect(secondResponse.status).toBe(200);
    expect(duration).toBeLessThan(20);
  });

  it('should expire cache after TTL', async () => {
    await axcache.get('https://jsonplaceholder.typicode.com/posts/1');
    await new Promise((r) => setTimeout(r, 2100));

    const response = await axcache.get(
      'https://jsonplaceholder.typicode.com/posts/1'
    );
    expect(response.status).toBe(200);
  });

  describe('Advanced Request Scenarios', () => {
    it('should handle requests with query parameters', async () => {
      const params = { userId: 1, _limit: 5 };

      const response1 = await axcache.get(
        'https://jsonplaceholder.typicode.com/posts',
        { params }
      );
      expect(response1.status).toBe(200);
      expect(response1.data.length).toBeLessThanOrEqual(5);
      expect(onCacheMiss).toHaveBeenCalled();

      const response2 = await axcache.get(
        'https://jsonplaceholder.typicode.com/posts',
        { params }
      );
      expect(response2.data).toEqual(response1.data);
      expect(onCacheHit).toHaveBeenCalled();
    });

    it('should handle multiple concurrent requests', async () => {
      // First execute all requests
      const requests = Array(5)
        .fill()
        .map((_, i) =>
          axcache.get(`https://jsonplaceholder.typicode.com/posts/${i + 1}`)
        );
      await Promise.all(requests);

      // Then execute the same requests again to verify the cache
      const cachedRequests = Array(5)
        .fill()
        .map((_, i) =>
          axcache.get(`https://jsonplaceholder.typicode.com/posts/${i + 1}`)
        );
      await Promise.all(cachedRequests);

      expect(onCacheHit).toHaveBeenCalledTimes(5);
    });

    it('should handle requests with different HTTP methods', async () => {
      // GET request should be cached
      const getResponse = await axcache.get(
        'https://jsonplaceholder.typicode.com/posts/1'
      );
      expect(getResponse.status).toBe(200);
      expect(onCacheWrite).toHaveBeenCalled();

      // POST request should not be cached
      const postResponse = await axcache.post(
        'https://jsonplaceholder.typicode.com/posts',
        {
          title: 'foo',
          body: 'bar',
          userId: 1,
        }
      );
      expect(postResponse.status).toBe(201);
      expect(onCacheWrite).toHaveBeenCalledTimes(1); // Not incremented

      // PUT request should not be cached
      const putResponse = await axcache.put(
        'https://jsonplaceholder.typicode.com/posts/1',
        {
          title: 'updated',
        }
      );
      expect(putResponse.status).toBe(200);
      expect(onCacheWrite).toHaveBeenCalledTimes(1); // Not incremented
    });
  });

  describe('Cache Control Features', () => {
    it('should force refresh when requested', async () => {
      // First normal request
      await axcache.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(onCacheMiss).toHaveBeenCalledTimes(1);

      // Second request with forceRefresh
      await axcache.get('https://jsonplaceholder.typicode.com/posts/1', {
        forceRefresh: true,
      });
      expect(onCacheMiss).toHaveBeenCalledTimes(2);
    });

    it('should handle custom TTL per request', async () => {
      // Request with short TTL
      await axcache.get('https://jsonplaceholder.typicode.com/posts/1', {
        ttl: 0.5, // 500ms
      });

      // Before TTL - should use cache
      await axcache.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(onCacheHit).toHaveBeenCalled();

      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 600));

      // After TTL - should make a new request
      await axcache.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(onCacheMiss).toHaveBeenCalledTimes(2);
    });

    it('should handle cache invalidation', async () => {
      const url = 'https://jsonplaceholder.typicode.com/posts/1';

      // Cache the response
      await axcache.get(url);
      expect(onCacheMiss).toHaveBeenCalledTimes(1);

      // Invalidate the cache
      axcache.invalidateCache(url);

      // Should make a new request
      await axcache.get(url);
      expect(onCacheMiss).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors appropriately', async () => {
      try {
        await axcache.get('https://non-existent-domain-12345.com');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.code).toBeDefined();
        expect(onCacheWrite).not.toHaveBeenCalled();
      }
    });

    it('should handle 404 responses', async () => {
      try {
        await axcache.get('https://jsonplaceholder.typicode.com/posts/999999');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(onCacheWrite).not.toHaveBeenCalled();
      }
    });

    it('should handle rate limiting', async () => {
      const requests = Array(50)
        .fill()
        .map(() => axcache.get('https://jsonplaceholder.typicode.com/posts/1'));

      await Promise.all(requests).catch((error) => {
        expect(error).toBeDefined();
      });
    });
  });

  describe('Cache Performance', () => {
    it('should handle large responses', async () => {
      const response = await axcache.get(
        'https://jsonplaceholder.typicode.com/photos'
      );
      expect(response.status).toBe(200);
      expect(response.data.length).toBeGreaterThan(0);
      expect(onCacheWrite).toHaveBeenCalled();

      const cachedResponse = await axcache.get(
        'https://jsonplaceholder.typicode.com/photos'
      );
      expect(cachedResponse.data).toEqual(response.data);
      expect(onCacheHit).toHaveBeenCalled();
    });

    it('should maintain performance with multiple cached items', async () => {
      // Cache multiple responses
      for (let i = 1; i <= 10; i++) {
        await axcache.get(`https://jsonplaceholder.typicode.com/posts/${i}`);
      }

      // Measure time to retrieve from cache
      const start = Date.now();
      await axcache.get('https://jsonplaceholder.typicode.com/posts/1');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(20);
    });
  });
});
