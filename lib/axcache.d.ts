import { Axcache, AxcacheConfig } from './types/index.d.ts';

declare const createAxcache: (options?: AxcacheConfig) => Axcache;

export default createAxcache; 