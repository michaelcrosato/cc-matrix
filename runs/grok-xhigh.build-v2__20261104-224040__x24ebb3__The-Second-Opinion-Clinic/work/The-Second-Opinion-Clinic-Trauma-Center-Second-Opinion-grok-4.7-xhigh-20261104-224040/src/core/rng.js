/** Seeded generator. Gameplay never calls Math.random. */
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return {
    next() {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    },
    float(a, b) {
      return a + this.next() * (b - a);
    },
    int(n) {
      return Math.floor(this.next() * n);
    },
    state() {
      return s;
    },
    set(v) {
      s = v >>> 0;
    },
  };
}
