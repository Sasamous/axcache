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

  // Generate a longer hash by combining multiple hash calculations
  const stringToHash = safeStringify(normalizedConfig);
  let hash1 = 0, hash2 = 0, hash3 = 0, hash4 = 0;
  
  for (let i = 0; i < stringToHash.length; i++) {
    const char = stringToHash.charCodeAt(i);
    // Generate 4 different hashes using different bit shifts
    hash1 = ((hash1 << 5) - hash1) + char;
    hash2 = ((hash2 << 7) - hash2) + char;
    hash3 = ((hash3 << 11) - hash3) + char;
    hash4 = ((hash4 << 13) - hash4) + char;
    
    // Convert each to 32-bit integer
    hash1 = hash1 & hash1;
    hash2 = hash2 & hash2;
    hash3 = hash3 & hash3;
    hash4 = hash4 & hash4;
  }

  // Combine all hashes into a 32-character string
  return [hash1, hash2, hash3, hash4]
    .map(h => Math.abs(h).toString(16).padStart(8, '0'))
    .join('');
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

