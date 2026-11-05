// CRACKMANIA title (PLAN §5.11, §5.12, §7.6): the logo cracking open over the showcase (D3, the bot lapping it, TV
// cameras), PRESS START, Coco's welcome the first time; on a touch-only device the gate ("Controller or keyboard
// required" and SETTINGS); ten seconds idle starts the attract mode
import { ctx, E } from '../ctx.js';
import { showcase, stepShowcase, drawShowcase } from './showcase.js';
import { MENU_INPUT } from '../input.js';
import { Focus, panel, T1, T2, tile, UI, drawToasts } from '../ui/kit.js';
import { promptRow, promptBar } from '../ui/glyphs.js';
import { VERSION } from '../version.js';
const F = () => E.font;
export const touchOnly = () => {
  if (typeof matchMedia !== 'function') return false;
  const coarse = matchMedia('(pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
  let pad = false; try { pad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(p => p && p.connected); } catch (e) { /* blocked */ }
  return coarse && !fine && !pad && !ctx.keyUsed;
};
if (typeof addEventListener === 'function') { addEventListener('keydown', () => { ctx.keyUsed = true; }, { capture: true }); addEventListener('gamepadconnected', () => { ctx.keyUsed = true; }); }
/** the logo with its cracks: t seconds since it appeared */
export function logo(g, x, y, scale = 4, t = 9) {
  F().title(g, 'CRACKMANIA', x, y, { scale, colors: ['#fff6d0', '#ffd060', '#ff8a2a', '#c8402a'], depth: 3, depthColor: '#2a0e06', align: 'center' });
  const w = F().width('CRACKMANIA') * scale, h = 7 * scale, x0 = x - w / 2, k = Math.min(1, t / 1.2), R = E.rng(11);
  // cracks: zig-zags growing across the letters from the first C's corner
  for (let c = 0; c < 3; c++) {
    let px = x0 + w * (.06 + c * .3), py = y + R() * h, n = Math.floor(14 * k);
    for (let i = 0; i < n; i++) { const nx = Math.min(x0 + w - 2, px + 3 + R() * 5 * scale / 2), ny = Math.max(y, Math.min(y + h, py + (R() - .5) * 4 * scale / 2)); E.px.line(g, px, py, nx, ny, '#1a0806', 1); px = nx; py = ny; }
  }
  if (t > 1.2 && t < 1.8) { const a = 1 - (t - 1.2) / .6; E.px.blend(g, a, 'normal', () => { for (let i = 0; i < 24; i++) E.px.rect(g, x0 + R() * w, y + h + (t - 1.2) * 40 * R(), 2, 2, i % 2 ? '#3a3a40' : '#5a5a62'); }); }
  if (t > 2 && (t % 5) < .3) E.px.blend(g, .8, 'add', () => E.px.rect(g, x0 + ((t % 5) / .3) * w, y, 3, h, '#ffffff'));
}
const st = { t: 0, idle: 0, gate: false, focus: new Focus(), leaving: false };
export const titleGate = () => st.gate;
export const titleScene = {
  input: MENU_INPUT, touch: [], camera: { zoom: false },
  prepareShowcase() { return true; },
  enter() {
    st.t = 0; st.idle = 0; st.leaving = false; st.gate = touchOnly();
    if (!ctx.session || ctx.session.kind !== 'demo' || ctx.session.track.id !== 'D3') showcase('D3'); else if (ctx.music) ctx.music.play('title');
    ctx.game.input.consumeAll();
  },
  update(dt) {
    const I = ctx.game.input; st.t += dt;
    stepShowcase(dt);
    if (ctx.talk.update(dt)) { st.idle = 0; return; }
    if (st.leaving) return;
    if (ctx.attract.idle(dt, 'title')) return;
    if (st.gate) {
      if (!touchOnly()) { st.gate = false; I.consumeAll(); return; }
      st.focus.update(dt, I); return;
    }
    if (I.anyPressed() || (I.clicked && I.clicked())) {
      I.consumeAll(); ctx.sound.sfx('confirm'); st.leaving = true;
      if (!ctx.profile.seen('welcome')) ctx.talk.beat('welcome', { onDone: () => ctx.game.go('menu') }); else ctx.game.go('menu');
    }
  },
  draw(r) {
    drawShowcase(r);
    const g0 = ctx.game;
    r.overlay(g => {
      E.px.blend(g, .45, 'normal', () => E.px.rect(g, 0, 0, r.W, 64, '#05040a'));
      logo(g, r.W / 2, Math.max(12, r.H * .1), r.W > 400 ? 4 : 3, st.t);
      T1(g, 'CRACK THE CLOCK', r.W / 2, Math.max(12, r.H * .1) + 36, '#ffd060', 'center');
      if (st.gate) {
        const msg = 'Controller or keyboard required', big = F().width(msg, { scale: 2 }) + 24 <= r.W - 8, pw = Math.min(r.W - 8, (big ? F().width(msg, { scale: 2 }) : F().width(msg)) + 24);
        panel(g, r.W / 2 - pw / 2, r.H * .48, pw, 46, { border: '#ff9a2a' });
        if (big) T2(g, msg, r.W / 2, r.H * .48 + 8, '#ffffff', 'center'); else T1(g, msg, r.W / 2, r.H * .48 + 10, '#ffffff', 'center');
        T1(g, 'Connect a gamepad or a keyboard to play', r.W / 2, r.H * .48 + 30, UI.dim, 'center');
        const b = { id: 'settings', x: r.W / 2 - 60, y: r.H * .48 + 60, w: 120, h: 32, label: 'SETTINGS', onPick: () => g0.menu('settings'), draw: tile };
        st.focus.set([b]); st.focus.draw(g);
      } else if (!st.leaving && !ctx.talk.open) {
        if (Math.floor(st.t * 1.6) % 2 === 0) T2(g, 'PRESS START', r.W / 2, r.H * .7, '#ffffff', 'center');
        const dev = g0.input.lastDevice; promptRow(g, r.W / 2, r.H * .7 + 22, [[dev === 'gamepad' ? 'start' : 'confirm', 'START']], { align: 'center' });
      }
      T1(g, 'v' + VERSION + ' · ' + (E.World3D.backend || ''), 6, r.H - 12, '#8a86a8');
      T1(g, '© 2026 · an homage to TrackMania (2003)', r.W - 6, r.H - 12, '#8a86a8', 'right');
    });
    ctx.talk.draw(r);
  }
};
