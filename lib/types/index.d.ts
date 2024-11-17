import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface AxcacheStats {
  entries: number;
  currentSize: number;
  maxSize: number;
}

export interface AxcacheRequestConfig extends AxiosRequestConfig {
  ttl?: number;
  forceRefresh?: boolean;
}

export interface AxcacheConfig extends AxiosRequestConfig {
  stdTTL?: number;
  maxSizeMB?: number;
  onCacheHit?: (key: string) => void;
  onCacheMiss?: (key: string) => void;
  onCacheWrite?: (key: string, value: any) => void;
}

export interface Axcache extends AxiosInstance {
  clearCache: () => boolean;
  invalidateCache: (url: string, params?: Record<string, any>) => boolean;
  getCacheStats: () => AxcacheStats;
  generateCacheKey: (config: AxcacheRequestConfig) => string;
}

export function createAxcache(options?: AxcacheConfig): Axcache;
export default createAxcache; 