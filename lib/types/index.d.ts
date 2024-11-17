import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface AxcacheOptions extends AxiosRequestConfig {
  stdTTL?: number;
  maxSizeMB?: number;
  onCacheHit?: (key: string) => void;
  onCacheMiss?: (key: string) => void;
  onCacheWrite?: (key: string) => void;
}

export interface Axcache {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  getCacheStats(): { entries: number; size: number };
  clearCache(): void;
}

declare function createAxcache(options?: AxcacheOptions): Axcache;
export default createAxcache; 