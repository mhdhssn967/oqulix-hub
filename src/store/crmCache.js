export const crmCache = {
  data: null,
  timestamp: 0,
  activeSegment: null
};

export const clearCRMCache = () => {
  crmCache.timestamp = 0;
};
