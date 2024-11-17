import axios from 'axios';
import { CacheWithTTL } from './cache/CacheWithTTL.js';
import {
  generateCacheKey,
  createNormalizedConfig,
} from './utils/cacheUtils.js';

/**
 * @typedef {import('./types/index.d.ts').Axcache} Axcache
 * @typedef {import('./types/index.d.ts').AxcacheConfig} AxcacheConfig
 */

const DEFAULT_TTL = 3600;
const DEFAULT_MAX_SIZE_MB = 50;
const MB_TO_BYTES = 1024 * 1024;

/**
 * @param {AxcacheConfig} options
 * @returns {Axcache}
 */
const createAxcache = (options = {}) => {
  const {
    stdTTL = DEFAULT_TTL,
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    onCacheHit = () => {},
    onCacheMiss = () => {},
    onCacheWrite = () => {},
    ...axiosOptions
  } = options;

  const maxSize = maxSizeMB * MB_TO_BYTES;
  const cache = new CacheWithTTL({ stdTTL, maxSize });

  if (typeof axios?.create !== 'function') {
    throw new Error('Axios was not properly initialized');
  }

  const instance = axios.create({
    ...axiosOptions,
  });

  instance.interceptors.request.use(async (config) => {
    if (config.method?.toLowerCase() !== 'get') {
      return config;
    }

    const normalizedConfig = createNormalizedConfig(config);
    const cacheKey = generateCacheKey(normalizedConfig);

    config.cacheKey = cacheKey;
    config._ttl = config.ttl ? config.ttl * 1000 : cache.stdTTL;

    const cachedResponse = cache.get(cacheKey);
    if (!cachedResponse || config.forceRefresh) {
      onCacheMiss(cacheKey);
      return config;
    }

    onCacheHit(cacheKey);
    return Promise.reject({ isCached: true, cachedResponse });
  });

  instance.interceptors.response.use(
    (response) => {
      if (response.config.method?.toLowerCase() === 'get') {
        const cacheKey = response.config.cacheKey;
        const ttl = response.config._ttl;

        const clonedResponse = {
          ...response,
          request: undefined,
          config: {
            ...response.config,
            transformRequest: undefined,
            transformResponse: undefined,
            adapter: undefined,
          },
        };

        if (cache.set(cacheKey, clonedResponse, ttl)) {
          onCacheWrite(cacheKey, clonedResponse);
        }
      }
      return response;
    },
    (error) => {
      if (error.isCached) {
        return Promise.resolve(error.cachedResponse);
      }
      return Promise.reject(error);
    }
  );

  instance.clearCache = () => cache.clear();
  instance.invalidateCache = (url, params = {}) => {
    const normalizedConfig = createNormalizedConfig(url, params);
    const cacheKey = generateCacheKey(normalizedConfig);
    return cache.delete(cacheKey);
  };
  instance.getCacheStats = () => ({
    entries: cache.getStats().entries,
    currentSize: cache.getStats().currentSize,
    maxSize: maxSize,
  });
  instance.generateCacheKey = generateCacheKey;

  return instance;
};

export { CacheWithTTL, generateCacheKey, createNormalizedConfig };
export default createAxcache;