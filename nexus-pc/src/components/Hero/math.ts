export const clamp = (v: number, min = 0, max = 1): number => Math.max(min, Math.min(max, v));

export const smooth = (a: number, b: number, x: number): number => {
  if (b === a) return x >= b ? 1 : 0;
  let t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
