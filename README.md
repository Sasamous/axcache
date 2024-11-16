# axcache

![License](https://img.shields.io/npm/l/axcache)
![Version](https://img.shields.io/npm/v/axcache)
![Downloads](https://img.shields.io/npm/dt/axcache)

A powerful caching wrapper for Axios with advanced features including TTL (Time To Live), cache invalidation, and memory management.

## Features

- 🚀 Automatic caching of GET requests
- ⏰ Configurable TTL (Time To Live) for cache entries
- 🧹 Automatic cache cleanup and memory management
- 💾 Size-based cache eviction (LRU)
- 🔄 Force refresh capability
- 🎯 Selective cache invalidation
- 📊 Cache statistics and monitoring
- ⚙️ Full Axios configuration support

## Installation

```bash
npm install axcache
```

## Basic Usage

```javascript
import createAxcache from 'axcache';

// Create an instance with default options
const axcache = createAxcache();

// Make a GET request - it will be cached
const response = await axcache.get('https://api.example.com/data');

// Subsequent identical requests will use the cache
const cachedResponse = await axcache.get('https://api.example.com/data');
```

## Advanced Configuration

```javascript
const axcache = createAxcache({
  // Axcache specific options
  stdTTL: 3600, // Cache TTL in seconds (default: 24 hours)
  maxSizeMB: 50, // Max cache size in MB (default: 50MB)
  onCacheHit: (key) => console.log(`Cache hit: ${key}`),
  onCacheMiss: (key) => console.log(`Cache miss: ${key}`),
  onCacheWrite: (key) => console.log(`Cache write: ${key}`),

  // Standard Axios options
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer token',
  },
  validateStatus: (status) => status < 500,
});
```

## Configuration Options

### Axcache Options

| Option         | Type       | Default     | Description                     |
| -------------- | ---------- | ----------- | ------------------------------- |
| `stdTTL`       | `number`   | 86400       | Default TTL in seconds          |
| `maxSizeMB`    | `number`   | 50          | Maximum cache size in megabytes |
| `onCacheHit`   | `function` | `undefined` | Callback for cache hits         |
| `onCacheMiss`  | `function` | `undefined` | Callback for cache misses       |
| `onCacheWrite` | `function` | `undefined` | Callback for cache writes       |

### Axios Options

All standard Axios configuration options are supported. Common options include:

| Option           | Type       | Default     | Description               |
| ---------------- | ---------- | ----------- | ------------------------- |
| `baseURL`        | `string`   | `undefined` | Base URL for requests     |
| `timeout`        | `number`   | `undefined` | Request timeout in ms     |
| `headers`        | `object`   | `undefined` | Request headers           |
| `auth`           | `object`   | `undefined` | Basic auth credentials    |
| `responseType`   | `string`   | `undefined` | Response type             |
| `validateStatus` | `function` | `undefined` | Define valid status codes |

## API Methods

### `get(url[, config])`

Makes a GET request with caching support.

```javascript
// Basic GET request
const response = await axcache.get('https://api.example.com/data');

// With custom TTL
const response = await axcache.get('https://api.example.com/data', {
  ttl: 300, // 5 minutes
});

// Force refresh (bypass cache)
const response = await axcache.get('https://api.example.com/data', {
  forceRefresh: true,
});
```

### `invalidateCache(url[, params])`

Invalidates cache for specific URL and parameters.

```javascript
axcache.invalidateCache('https://api.example.com/data', { id: 1 });
```

### `getCacheStats()`

Returns current cache statistics.

```javascript
const stats = axcache.getCacheStats();
// {
//   entries: 10,
//   currentSize: 256000,
//   maxSizeMB: 50,
//   lastCleanup: 1648389120000
// }
```

## Migration Example

### Before (with Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});
```

### After (with axcache)

```javascript
import createAxcache from 'axcache';

const api = createAxcache({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  stdTTL: 3600,
  maxSizeMB: 10, // 10MB cache size
});
```

## Examples

### Basic Caching

```javascript
import createAxcache from 'axcache';

const api = createAxcache();

// This request will be cached
const users = await api.get('https://api.example.com/users');

// This request will use the cached response
const cachedUsers = await api.get('https://api.example.com/users');
```

### Custom Cache Duration

```javascript
const api = createAxcache({
  stdTTL: 3600, // Default 1 hour cache
});

// Override TTL for specific requests
const shortLivedData = await api.get('https://api.example.com/prices', {
  ttl: 300, // Cache for 5 minutes
});

const longLivedData = await api.get('https://api.example.com/constants', {
  ttl: 86400, // Cache for 24 hours
});
```

### Force Refresh

```javascript
const api = createAxcache();

// Initial request (cached)
const data = await api.get('https://api.example.com/data');

// Force a fresh request, ignoring cache
const freshData = await api.get('https://api.example.com/data', {
  forceRefresh: true,
});
```

### Cache Monitoring

```javascript
const api = createAxcache({
  maxSizeMB: 10,
  onCacheHit: (key) => console.log(`Cache hit: ${key}`),
  onCacheMiss: (key) => console.log(`Cache miss: ${key}`),
  onCacheWrite: (key) => console.log(`Cache write: ${key}`),
});

// Monitor cache statistics
setInterval(() => {
  const stats = api.getCacheStats();
  console.log('Cache stats:', {
    entries: stats.entries,
    size: `${(stats.currentSize / (1024 * 1024)).toFixed(2)}MB`,
    maxSize: `${stats.maxSizeMB}MB`,
  });
}, 60000);
```

### With Authentication

```javascript
const api = createAxcache({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer your-token-here',
  },
});

// All requests will include the Authorization header
const protectedData = await api.get('/protected-endpoint');
```

### Selective Cache Invalidation

```javascript
const api = createAxcache();

// Cache some data
await api.get('/users/123');
await api.get('/users/123/posts');

// Invalidate specific cache entry
api.invalidateCache('/users/123');

// Invalidate with query parameters
api.invalidateCache('/users', { role: 'admin' });
```

## Best Practices

1. **Configure TTL Appropriately**

   - Use shorter TTL for frequently changing data
   - Use longer TTL for static content
   - Consider using custom TTL per request when needed

2. **Memory Management**

   - Monitor cache size using `getCacheStats()`
   - Set appropriate `maxSize` based on your application's memory constraints
   - Consider your application's traffic patterns when setting cache size

3. **Cache Invalidation**

   - Use `forceRefresh` for one-time cache bypass
   - Use `invalidateCache` for programmatic cache clearing
   - Implement proper cache invalidation strategies based on your data update patterns

4. **Axios Configuration**
   - Set appropriate timeouts
   - Configure proper base URLs
   - Set up authentication headers when needed
   - Use proper error handling

## Acknowledgments

This project uses the following major dependencies:
- [Axios](https://github.com/axios/axios) - Licensed under MIT

## License

ISC © Salvatore Criniti

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
The dependencies included in this project are licensed under their own respective licenses.
