// The Claim Form: five big lines and a rubber stamp.
export function gradeOf(stats) { const acc = stats.shots ? stats.hits / stats.shots : 0; return acc > 0.65 && stats.deaths < 2 ? 'APPROVED' : acc > 0.4 ? 'PENDING' : 'DENIED'; }
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export class FormScreen {
  constructor(A, next, o = {}) {
    this.A = A; this.next = next; this.t = 0; this.title = o.title ?? `CLAIM FORM ${A.run.chapter}`; const r = A.run, b = r.chapterBase, S = r.stats;
    this.c = { time: S.time - b.time, shots: S.shots - b.shots, hits: S.hits - b.hits, heads: S.heads - b.heads, kicks: S.kicks - b.kicks, deaths: S.deaths - (b.deaths ?? 0) };
    this.grade = gradeOf(this.c); this.bonus = { APPROVED: 1500, PENDING: 800, DENIED: 300 }[this.grade]; r.money += this.bonus; r.chapterBase = { ...S }; this.stamped = false;
  }
  update(ui) {
    this.t += 1 / 60; const c = this.c, r = this.A.run; ui.rect(0, 0, ui.W, ui.H, 'ink'); const W = 300, x = ui.W / 2 - W / 2; ui.rect(x, 16, W, ui.H - 46, 'sand'); ui.rect(x + 3, 19, W - 6, ui.H - 52, 'white');
    ui.center(26, 'OSTRANDER MUTUAL ASSURANCE', { color: 'plum', shadow: false }); ui.center(38, this.title, { scale: 2, color: 'ink', shadow: false });
    const acc = c.shots ? Math.round((c.hits / c.shots) * 100) : 0; const lines = [['TIME', mmss(c.time)], ['ACCURACY', `${acc}%`], ['HEADSHOTS', c.heads], ['KICKS', c.kicks], ['DEDUCTIONS', `-${r.deductions}`]];
    lines.forEach(([k, v], i) => { if (this.t < 0.2 + i * 0.2) return; const y = 66 + i * 21; ui.text(x + 16, y, k, { scale: 2, color: 'navy', shadow: false }); const m = ui.measure(v, 2); ui.text(x + W - 16 - m.width, y, v, { scale: 2, color: 'ink', shadow: false }); });
    if (this.t > 1.5) { if (!this.stamped) { this.stamped = true; ui.ctx.audio.play('stamp'); ui.ctx.engine.shake.add(0.5); } const col = { APPROVED: 'green', PENDING: 'orange', DENIED: 'red' }[this.grade]; const m = ui.measure(this.grade, 3); const sx = x + W - m.width - 30, sy = 172; for (let j = 0; j < 2; j++) { ui.rect(sx - 4 - j, sy - 4 - j, m.width + 8 + j * 2, 1, col); ui.rect(sx - 4 - j, sy + 25 + j, m.width + 8 + j * 2, 1, col); ui.rect(sx - 4 - j, sy - 4 - j, 1, 29 + j * 2, col); ui.rect(sx + m.width + 3 + j, sy - 4 - j, 1, 29 + j * 2, col); } ui.text(sx, sy, this.grade, { scale: 3, color: col, shadow: false }); ui.text(x + 16, 182, `BONUS ${this.bonus} D`, { color: 'plum', shadow: false }); }
    if (this.t > 1.8) { ui.prompts([['confirm', 'FILE IT']]); if (ui.confirm || ui.click) { const A = this.A; A.menu = null; A.ctx.engine.timeScale = 1; this.next(); } }
  }
}
