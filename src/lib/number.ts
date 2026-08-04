export function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}
