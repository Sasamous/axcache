import createAxcache from '../../lib/axcache.js';
import { jest, expect, describe, it, beforeEach } from '@jest/globals';
import type { AxiosResponse } from 'axios';
import type { Axcache, AxcacheConfig, AxcacheStats, AxcacheRequestConfig } from '../../lib/types';

describe('README.md Examples', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Usage Example', () => {
    it('should demonstrate basic usage scenario', async () => {
      const api = createAxcache();
      
      // First request - should be cached
      const response: AxiosResponse = await api.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      // Second request - should use cache
      const cachedResponse: AxiosResponse = await api.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(cachedResponse.status).toBe(200);
      expect(cachedResponse.data).toEqual(response.data);
    });
  });

  describe('Advanced Configuration Example', () => {
    it('should handle advanced configuration options', async () => {
      const onCacheHit = jest.fn();
      const onCacheMiss = jest.fn();
      const onCacheWrite = jest.fn();

      const config: AxcacheConfig = {
        stdTTL: 3600,
        maxSizeMB: 50,
        onCacheHit,
        onCacheMiss,
        onCacheWrite,
        baseURL: 'https://jsonplaceholder.typicode.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      };

      const api= createAxcache(config);

      const response: AxiosResponse = await api.get('/posts/1');
      expect(response.status).toBe(200);
      expect(onCacheMiss).toHaveBeenCalled();
      expect(onCacheWrite).toHaveBeenCalled();

      const cachedResponse: AxiosResponse = await api.get('/posts/1');
      expect(cachedResponse.status).toBe(200);
      expect(onCacheHit).toHaveBeenCalled();
    });
  });

  describe('Custom Cache Duration Example', () => {
    it('should handle different TTL configurations', async () => {
      const api= createAxcache({ stdTTL: 3600 });

      const config: AxcacheRequestConfig = {
        ttl: 0.1 // 100ms
      };

      // Test short TTL
      const shortLivedResponse: AxiosResponse = await api.get('https://jsonplaceholder.typicode.com/posts/1', config);
      expect(shortLivedResponse.status).toBe(200);

      // Wait for cache expiration
      await new Promise(r => setTimeout(r, 150));

      // Should be a fresh request
      const newResponse: AxiosResponse = await api.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(newResponse.status).toBe(200);
    });
  });

  describe('Cache Monitoring Example', () => {
    it('should provide accurate cache monitoring', async () => {
      const onCacheHit = jest.fn();
      const onCacheMiss = jest.fn();
      const onCacheWrite = jest.fn();

      const api= createAxcache({
        maxSizeMB: 10,
        onCacheHit,
        onCacheMiss,
        onCacheWrite
      });

      // Initial request
      await api.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(onCacheMiss).toHaveBeenCalled();
      expect(onCacheWrite).toHaveBeenCalled();

      // Cached request
      await api.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(onCacheHit).toHaveBeenCalled();

      const stats: AxcacheStats = api.getCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.maxSize).toBe(10 * 1024 * 1024);
      expect(stats.currentSize).toBeGreaterThan(0);
    });
  });

  describe('Authentication Example', () => {
    it('should properly handle authentication headers', async () => {
      const api = createAxcache({
        baseURL: 'https://jsonplaceholder.typicode.com',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      const response: AxiosResponse = await api.get('/posts/1');
      expect(response.status).toBe(200);
      expect(response.config.headers['Authorization']).toBe('Bearer test-token');
    });
  });

  describe('Selective Cache Invalidation Example', () => {
    it('should demonstrate cache invalidation scenarios', async () => {
      const api = createAxcache();

      // Cache some data
      await api.get('https://jsonplaceholder.typicode.com/posts/1');
      await api.get('https://jsonplaceholder.typicode.com/posts/2');

      const stats1: AxcacheStats = api.getCacheStats();
      expect(stats1.entries).toBe(2);

      // Invalidate specific cache entry
      const wasInvalidated: boolean = api.invalidateCache('https://jsonplaceholder.typicode.com/posts/1');
      expect(wasInvalidated).toBe(true);

      const stats2: AxcacheStats = api.getCacheStats();
      expect(stats2.entries).toBe(1);
    });
  });

  describe('Memory Management Example', () => {
    it('should handle memory limits correctly', async () => {
      const api = createAxcache({
        maxSizeMB: 0.1 // Very small cache (100KB)
      });

      // Make multiple requests to test memory limits
      await api.get('https://jsonplaceholder.typicode.com/posts');
      await api.get('https://jsonplaceholder.typicode.com/comments');

      const stats: AxcacheStats = api.getCacheStats();
      expect(stats.currentSize).toBeLessThanOrEqual(0.1 * 1024 * 1024);
    });
  });

  describe('Error Handling Example', () => {
    it('should handle network errors appropriately', async () => {
      const api = createAxcache();

      try {
        await api.get('https://non-existent-domain.invalid');
        fail('Should have thrown an error');
      } catch (error: unknown) {
        expect(error).toBeDefined();
        const stats: AxcacheStats = api.getCacheStats();
        expect(stats.entries).toBe(0); // Errors should not be cached
      }
    });
  });

  describe('Request Configuration Example', () => {
    it('should handle various request configurations', async () => {
      interface PostData {
        id: number;
        title: string;
        body: string;
        userId: number;
      }

      const api = createAxcache({
        baseURL: 'https://jsonplaceholder.typicode.com'
      });

      const response: AxiosResponse<PostData> = await api.get<PostData>('/posts/1', {
        params: { _format: 'json' },
        headers: {
          'Accept': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(1);
      expect(response.data.title).toBeDefined();
    });
  });

  describe('Force Refresh Example', () => {
    it('should force a fresh request when specified', async () => {
      const api = createAxcache();

      // Initial request (cached)
      const initialResponse: AxiosResponse = await api.get('https://jsonplaceholder.typicode.com/posts/1');
      expect(initialResponse.status).toBe(200);

      // Force a fresh request, ignoring cache
      const freshResponse: AxiosResponse = await api.get('https://jsonplaceholder.typicode.com/posts/1', {
        forceRefresh: true
      } as AxcacheRequestConfig);
      expect(freshResponse.status).toBe(200);
    });
  });

  describe('Cache Monitoring Intervals Example', () => {
    it('should track cache statistics over time', async () => {
      const api = createAxcache({
        maxSizeMB: 10
      });

      // Make some requests to populate cache
      await api.get('https://jsonplaceholder.typicode.com/posts/1');
      await api.get('https://jsonplaceholder.typicode.com/posts/2');

      const stats: AxcacheStats = api.getCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.maxSize).toBe(10 * 1024 * 1024);
      expect(stats.currentSize).toBeGreaterThan(0);
      expect((stats.currentSize / (1024 * 1024)).toFixed(2)).toBeDefined();
    });
  });

  describe('Multiple Requests Example', () => {
    it('should handle multiple requests with different parameters', async () => {
      const api = createAxcache({
        baseURL: 'https://jsonplaceholder.typicode.com'
      });

      // Make parallel requests
      const [users, posts, comments] = await Promise.all([
        api.get('/users'),
        api.get('/posts'),
        api.get('/comments')
      ]);

      expect(users.status).toBe(200);
      expect(posts.status).toBe(200);
      expect(comments.status).toBe(200);

      const stats: AxcacheStats = api.getCacheStats();
      expect(stats.entries).toBe(3);
    });
  });

  describe('Query Parameters Example', () => {
    it('should handle requests with query parameters', async () => {
      const api = createAxcache();

      const response: AxiosResponse = await api.get('https://jsonplaceholder.typicode.com/posts', {
        params: {
          userId: 1,
          _limit: 5
        }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Cache Key Generation Example', () => {
    it('should generate unique cache keys for different query parameters', async () => {
      const api = createAxcache();

      // Make requests with different query parameters
      await api.get('https://jsonplaceholder.typicode.com/posts', {
        params: { userId: 1 }
      });

      await api.get('https://jsonplaceholder.typicode.com/posts', {
        params: { userId: 2 }
      });

      const stats: AxcacheStats = api.getCacheStats();
      expect(stats.entries).toBe(2); // Should be two different cache entries
    });
  });
}); 