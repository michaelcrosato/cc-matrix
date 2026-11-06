// The only network: the AI Hub client, when a hub opened the page.
export const hub = () => (typeof globalThis !== 'undefined' ? globalThis.AIHub : undefined);
export const SEAT_COLORS = [0xe8443a, 0x3b82f6, 0x22c55e, 0xf5b700];
export const SEAT_PALETTE = ['red', 'blue', 'green', 'sand'];

/** Ghosts: 100 ms, not tied to rendering. Start as soon as `start` arrives, even with score 0. */
export class GhostSender {
  timer = null;
  start(getState, h = hub()) {
    if (this.timer || !h) return;
    this.timer = setInterval(() => {
      const s = getState();
      if (!s) return;
      h.send({ a: s.area, x: s.x, y: s.y, c: s.clip, t: s.time, s: s.score }, { reliable: false });
      h.progress({ score: s.score, label: s.label });
    }, 100);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
