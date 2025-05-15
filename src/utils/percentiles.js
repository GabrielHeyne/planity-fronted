export function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(i);
  const upper = Math.ceil(i);
  const weight = i % 1;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

