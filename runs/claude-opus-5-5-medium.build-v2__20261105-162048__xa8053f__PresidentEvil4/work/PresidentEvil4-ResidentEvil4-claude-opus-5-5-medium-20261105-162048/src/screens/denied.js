// CLAIM DENIED: a big rubber stamp, then Continue or Quit.
export class DeniedScreen {
  constructor(A, reason) { this.A = A; this.reason = reason; this.s = { focus: 0 }; this.t = 0; A.ctx.audio.play('stamp'); A.ctx.engine.shake.add(0.6); }
  update(ui) {
    this.t += 1 / 60; const A = this.A; ui.dim(); ui.rect(0, 40, ui.W, ui.H - 76, 'ink'); const k = Math.min(1, this.t / 0.14), sc = k < 1 ? 5 : 4; const m = ui.measure('CLAIM DENIED', 4); const w = m.width + 16, x = ui.W / 2 - w / 2, y = 54;
    for (let j = 0; j < 2; j++) { ui.rect(x - j, y - j, w + j * 2, 1, 'red'); ui.rect(x - j, y + 44 + j, w + j * 2, 1, 'red'); ui.rect(x - j, y - j, 1, 45 + j * 2, 'red'); ui.rect(x + w - 1 + j, y - j, 1, 45 + j * 2, 'red'); }
    ui.center(y + 8, 'CLAIM DENIED', { scale: 4, color: 'red' }); ui.center(y + 52, this.reason, { color: 'mist' });
    if (this.t < 0.7) return;
    const i = ui.list(this.s, [{ label: 'CONTINUE' }, { label: 'QUIT TO TITLE' }], { x: ui.W / 2 - 80, y: 136, w: 160, rowH: 18 });
    ui.prompts([['confirm', 'SELECT']]);
    if (i === 0) { A.menu = null; A.ctx.engine.timeScale = 1; A.app.restartCheckpoint(); }
    if (i === 1) { A.menu = null; A.ctx.engine.timeScale = 1; A.app.goTitle(); }
  }
}
