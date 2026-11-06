// Every widget records its rect each frame, so a script can check nothing overflows.
// The bottom rows of the screen: prompts sit on the safe margin, everything else stays above them.
export const PROMPT_Y = 23; // hud.height - this
export const ABOVE_PROMPTS = 30;

export const layout = {
  rects: [],
  prompts: [],
  record: false,
  begin() { this.rects.length = 0; this.prompts.length = 0; },
  rec(name, x, y, w, h, text = '') { if (this.record) this.rects.push({ name, x, y, w, h, text }); },
  /** Everything outside the screen, less a margin. TVs crop their edges: the plan asks for 12 art px. */
  overflow(width, height, margin = 0) {
    return this.rects.filter((r) => r.x < margin || r.y < margin || r.x + r.w > width - margin || r.y + r.h > height - margin);
  },
};
