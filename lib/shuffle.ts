/**
 * Seeded shuffle for "stable content + variable presentation".
 * - Deterministic for a given seed.
 * - Uses a small PRNG (mulberry32) + Fisher-Yates.
 * - Does NOT drop or duplicate items.
 */

function hashSeed(seed: string): number {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = items.slice();
  const rng = mulberry32(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function shuffleWindow<T>(items: T[], windowSize: number, seed: string): T[] {
  const n = Math.max(0, Math.min(items.length, windowSize));
  if (n <= 1) return items;
  const head = seededShuffle(items.slice(0, n), seed);
  return head.concat(items.slice(n));
}
