/* ---- RANDOMNESS: seeded streams. play: gameplay (seam, AI errors, fielding), seeded per match; cosmetic: crowd,
 * particles, commentary choice, so gameplay never depends on them. In AI Hub sessions the over's deliveries come from
 * AIHub.rng. Simulation code never calls Math.random. ---- */
const RNG = {
  play: E.rng(1), cosmetic: E.rng(99),
  seed(n) { this.play = E.rng(n >>> 0 || 1); this.cosmetic = E.rng((n * 7 + 13) >>> 0 || 99); },
  /** a normal sample (Box-Muller) from stream r */
  normal(r = RNG.play) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); },
  range(a, b, r = RNG.play) { return a + (b - a) * r(); },
  pick(list, r = RNG.play) { return list[Math.floor(r() * list.length) % list.length]; }
};
K.RNG = RNG;
