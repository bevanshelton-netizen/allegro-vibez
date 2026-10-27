export function normalizeSplits(splits) {
  if (!Array.isArray(splits) || splits.length === 0) {
    const error = new Error('rights splits are required');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  const normalized = splits.map((split, index) => {
    if (!split || typeof split !== 'object') {
      const error = new Error(`split ${index + 1} must be an object`);
      error.code = 'INVALID_REQUEST';
      throw error;
    }
    const share = Number(split.sharePercent);
    if (!Number.isFinite(share) || share < 0 || share > 100) {
      const error = new Error(`split ${index + 1} has an invalid share`);
      error.code = 'INVALID_REQUEST';
      throw error;
    }
    return { ...split, sharePercent: share };
  });
  const total = normalized.reduce((sum, split) => sum + split.sharePercent, 0);
  if (Math.abs(total - 100) > 0.000001) {
    const error = new Error(`rights splits must total 100%; received ${total}`);
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return normalized;
}
