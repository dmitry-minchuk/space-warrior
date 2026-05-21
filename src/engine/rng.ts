// Mulberry32 — small fast deterministic PRNG. Used for procedural art generation
// so the same ship looks the same every run.
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience for non-deterministic places where Math.random is fine.
export function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
export function rndInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
