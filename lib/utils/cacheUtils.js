import crypto from 'crypto';

// Safely handle circular references in objects
export const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
};
export const generateCacheKey = (config) => {
  const normalizedConfig = {
    method: config.method ?? 'get',
    url: config.url,
    params: config.params,
    data: typeof config.data === 'object' ? '[RequestData]' : config.data,
  };

  return crypto
    .createHash('sha256')
    .update(safeStringify(normalizedConfig))
    .digest('hex');
};

export const createNormalizedConfig = (urlOrConfig, params = {}) => {
  const baseConfig =
    typeof urlOrConfig === 'string'
      ? { url: urlOrConfig, params }
      : { ...urlOrConfig };

  const method = (baseConfig.method ?? 'get').toLowerCase();

  return {
    method,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...baseConfig,
    params: baseConfig.params ?? params,
  };
};

