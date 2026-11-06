// The Claim Form after each chapter: 5 big lines, then a stamp with a thud, and bonus Doubloons.
import { app } from '../core/app.js';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function gradeOf(stats) {
  const acc = stats.shots ? stats.hits / stats.shots : 0;
  let score = 0;
  if (acc > 0.5) score++;
  if (acc > 0.7) score++;
  if (stats.deaths === 0) score += 2;
  else if (stats.deaths <= 1) score++;
  if (stats.heads >= 10) score++;
  if (stats.kicks >= 8) score++;
  if (stats.deductions < 800) score++;
  return score >= 5 ? 'APPROVED' : score >= 3 ? 'PENDING' : 'DENIED';
}

export function openForm(area, { next, title = 'CLAIM FORM', final = false } = {}) {
  const { run } = area;
  const s = run.stats;
  const stamp = gradeOf(s);
  const bonus = stamp === 'APPROVED' ? 1500 : stamp === 'PENDING' ? 700 : 200;
  let t = 0;
  let stamped = false;
  let paid = false;
  const screen = {
    frozen: true,
    name: 'form',
    stamp,
    advance() {
      if (screen.done) return;
      screen.done = true;
      for (const k of Object.keys(s)) run.totals[k] = (run.totals[k] ?? 0) + s[k];
      run.resetChapterStats();
      app.close(screen);
      next?.();
    },
    update(ctx, ui) {
      t += ui.dt;
      ctx.hud.clear();
      const { hud, W, H } = ui;
      const w = Math.min(360, W - 16); const x = (W - w) >> 1;
      hud.rect(x - 2, 6, w + 4, H - 28, 'night');
      hud.rect(x, 8, w, H - 32, 'mist');
      ui.centerText(14, 'OSTRANDER MUTUAL ASSURANCE', { color: 'ink', shadow: false }, x, w);
      ui.centerText(26, title, { scale: 2, color: 'ink', shadow: false }, x, w);
      hud.rect(x + 12, 44, w - 24, 1, 'ink');
      const rows = [
        ['TIME', fmtTime(s.time)],
        ['ACCURACY', `${s.shots ? Math.round((s.hits / s.shots) * 100) : 0}%`],
        ['HEADSHOTS', String(s.heads)],
        ['KICKS', String(s.kicks)],
        ['DEDUCTIONS', `${s.deductions}`],
      ];
      rows.forEach(([a, b], i) => {
        if (t < 0.2 + i * 0.18) return;
        const y = 54 + i * 22;
        ui.text(x + 18, y, a, { scale: 2, color: 'night', shadow: false });
        ui.text(x + w - 18 - ui.width(b, 2), y, b, { scale: 2, color: 'ink', shadow: false });
        hud.rect(x + 18, y + 16, w - 36, 1, 'slate');
      });
      if (t > 1.5 && !stamped) {
        stamped = true;
        ctx.audio.play('stamp');
      }
      if (stamped) {
        const color = stamp === 'APPROVED' ? 'green' : stamp === 'PENDING' ? 'navy' : 'red';
        const sw = ui.width(stamp, 3) + 20;
        const sx = x + w - sw - 14; const sy = H - 74;
        hud.rect(sx, sy, sw, 34, color);
        hud.rect(sx + 2, sy + 2, sw - 4, 30, 'mist');
        ui.text(sx + 10, sy + 6, stamp, { scale: 3, color, shadow: false });
        if (!paid) { paid = true; run.money += bonus; }
        ui.text(x + 18, H - 62, `BONUS ${bonus} DOUBLOONS`, { color: 'ink', shadow: false });
      }
      if (t > 1.9) {
        ui.promptBar([['confirm', final ? 'CLOSE THE FILE' : 'FILE IT']]);
        const hit = ui.widget('form', 0, 0, W, H);
        if (hit) { ctx.audio.play('uiConfirm'); screen.advance(); }
      }
    },
  };
  app.open(screen);
  return screen;
}
