export const lerp = (a, b, i) => a + (b - a) * i;
export const ilerp = (a, b, n) => (n - a) / (b - a);
export const clamp = (a, b, n) => Math.max(a, Math.min(n, b));
