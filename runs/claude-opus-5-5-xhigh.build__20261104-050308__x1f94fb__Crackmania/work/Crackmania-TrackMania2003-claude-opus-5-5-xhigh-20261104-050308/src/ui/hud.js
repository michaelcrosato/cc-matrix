// CRACKMANIA race HUD (PLAN §5.2): per viewport. Timer top centre (big digits), the split and delta under it after a
// checkpoint, CP count top left, the next medal top right, speed bottom right, the countdown, notes, the respawn prompt
import { ctx, E } from '../ctx.js';
import { fmt } from '../race/run.js';
import { medal, flag, MEDAL_NAME } from './icons.js';
import { promptRow } from './glyphs.js';
import { ENVS } from '../env/envs.js';
const F = () => E.font;
const DIG = ['#ffffff', '#fff2c0', '#ffd060'];
export function bigText(g, s, x, y, scale = 3, colors = DIG, align = 'center') { F().title(g, s, x, y, { scale, colors, depth: Math.max(1, scale - 1), depthColor: '#1a0a06', align, outline: '#0a0608' }); }
export function hud(r, sess, P, vi, S) {
  if (!P || sess.noHud) return;
  const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H }, X = vp.x, Y = vp.y, W = vp.w, H = vp.h, run = P.run, small = W < 300 || H < 180;
  const e = ENVS[sess.env], g0 = ctx.game;
  r.overlay(g => {
    const sc = small ? 2 : 3;
    // speed lines and a vignette above 200 km/h (not under reduce motion)
    if (run.car.kmh > 200 && !g0.reduceMotion && P.cam.mode !== 'hood') {
      const k = Math.min(1, (run.car.kmh - 200) / 80), t = (g0.real || 0);
      E.px.blend(g, .35 * k, 'add', () => { for (let i = 0; i < 14; i++) { const a = i * 2.39 + Math.floor(t * 12) * .7, rr = Math.min(W, H) * (.42 + ((i * 37 + Math.floor(t * 20)) % 10) / 40); const cx = X + W / 2 + Math.cos(a) * rr, cy = Y + H / 2 + Math.sin(a) * rr * .7; E.px.line(g, cx, cy, cx + Math.cos(a) * 14, cy + Math.sin(a) * 10, '#ffffff', 1); } });
    }
    if (sess.label && S.phase === 'intro') {
      bigText(g, sess.track.name.toUpperCase(), X + W / 2, Y + H * .3, small ? 2 : 3, ['#ffffff', e.accent2, e.accent]);
      F().text(g, sess.label, X + W / 2, Y + H * .3 + (small ? 22 : 30), '#ffffff', { align: 'center', shadow: '#000', outline: false });
      if (!small) promptRow(g, X + W / 2, Y + H - 22, [['confirm', 'SKIP']], { align: 'center', input: P.input || undefined });
      return;
    }
    // the clock
    const steps = run.finished ? run.finishSteps : run.steps;
    if (!sess.noTimer) bigText(g, fmt(steps), X + W / 2, Y + 6, sc);
    if (sess.roundClock) { const t = sess.roundClock(); F().text(g, t, X + W / 2, Y + (small ? 26 : 32), '#ffe08a', { align: 'center', shadow: '#000', outline: false, scale: small ? 1 : 2 }); }
    // the split after a checkpoint
    const note = P.split; if (note && note.t > 0) {
      const yy = Y + (small ? 24 : 34) + (sess.roundClock ? 16 : 0);
      F().text(g, fmt(note.steps), X + W / 2 - 4, yy, '#ffffff', { align: 'right', shadow: '#000', outline: false, scale: small ? 1 : 2 });
      if (note.delta !== null && note.delta !== undefined) F().text(g, fmt(note.delta, true), X + W / 2 + 4, yy, note.delta <= 0 ? '#5ab4ff' : '#ff5a4a', { align: 'left', shadow: '#000', outline: false, scale: small ? 1 : 2 });
    }
    // checkpoints, respawns
    if (sess.course.cpCount && !sess.noCp) { flag(g, X + 8, Y + 8, small ? 1 : 1.3); F().text(g, 'CP ' + run.cps.size + '/' + sess.course.cpCount, X + 24, Y + 8, '#ffffff', { shadow: '#000', outline: false, scale: small ? 1 : 2 }); }
    if (run.respawns) F().text(g, '↻ ' + run.respawns, X + 8, Y + (small ? 22 : 28), '#ffd060', { shadow: '#000', outline: false });
    if (P.name && sess.players.length > 1) F().text(g, P.name, X + 8, Y + H - 14, P.color || '#fff', { shadow: '#000', outline: false, scale: small ? 1 : 2 });
    // the next medal, and your best
    const tg = sess.targets && sess.targets(P);
    if (tg) { const tx = X + W - 10; medal(g, tx - 6, Y + 14, tg.medal, small ? 5 : 7); F().text(g, fmt(tg.steps), tx - 18, Y + 9, '#ffffff', { align: 'right', shadow: '#000', outline: false, scale: small ? 1 : 2 }); if (tg.best !== null && tg.best !== undefined) F().text(g, 'BEST ' + fmt(tg.best), tx, Y + (small ? 24 : 30), '#c8d8ff', { align: 'right', shadow: '#000', outline: false }); }
    // speed
    const mph = ctx.game.settings.units === 'mph', v = Math.round(run.car.kmh * (mph ? .6214 : 1));
    bigText(g, String(v), X + W - (small ? 34 : 46), Y + H - (small ? 26 : 36), small ? 2 : 3, ['#ffffff', '#e0f0ff', '#8ac8ff'], 'right');
    F().text(g, mph ? 'MPH' : 'KM/H', X + W - 8, Y + H - (small ? 16 : 22), '#c8d8ff', { align: 'right', shadow: '#000', outline: false });
    if (run.car.boostT > 0) { const t = g0.real || 0; for (let i = 0; i < 3; i++) E.px.disc(g, X + W - (small ? 30 : 40) - i * 6, Y + H - (small ? 34 : 46) + Math.sin(t * 30 + i) * 1.5, 2.5, i % 2 ? '#ffd060' : '#ff8a20'); }
    // the countdown
    if (run.phase === 'countdown' && S.phase !== 'intro') { const n = Math.ceil(run.count), k = run.count - Math.floor(run.count); bigText(g, String(n), X + W / 2, Y + H * .36 - (1 - k) * 4, small ? 4 : 6, ['#ffffff', '#ffd0a0', '#ff6a3a']); }
    else if (run.racing && run.steps < 70) bigText(g, 'GO!', X + W / 2, Y + H * .36, small ? 4 : 6, ['#ffffff', '#c0ffb0', '#3ad050']);
    // notes (MISSING CHECKPOINT, FINISH!, NEW RECORD!)
    let ny = Y + H * .52;
    for (const n of P.notes || []) { if (n.t <= 0) continue; if (Math.floor(n.t * 8) % 2 || n.t > .6) bigText(g, n.text, X + W / 2, ny, n.scale || (small ? 2 : 3), n.colors || ['#ffffff', n.color, n.color]); ny += small ? 20 : 30; }
    if (sess.extraHud) sess.extraHud(g, r, P, vp);
    // stopped or flopped: how to get going again
    if (run.racing && (P.stopT > 2 || P.flopT > 0) && P.input) promptRow(g, X + W / 2, Y + H - (small ? 16 : 28), [['respawn', 'RESPAWN'], sess.canRestart !== false && ['restart', 'RESTART']], { align: 'center', input: P.input });
  });
  // ghost name tags
  for (const G of sess.ghosts) if (G.name && G._screen && (!r.viewport || r.viewport.i === vi)) { const s = G._screen; r.overlay(g => F().text(g, G.name, Math.round(s[0]), Math.round(s[1]) - 8, G.color || '#ffffff', { align: 'center', shadow: '#000', outline: false })); G._screen = null; }
}
export function countdownFx() {}
