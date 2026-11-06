// Sparse. Gone during cutscenes. Never dense. Bottom left coverage, bottom right ammo, one prompt.
import { THREE } from '../../pixel-engine.js';
import { WEAPONS } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { ammoOf, statsOf, count } from '../core/run.js';
import { codeFor, glyphWidth } from '../core/ui.js';
import { iconFor } from '../models/icons.js';
const p3 = new THREE.Vector3();
export function project(cam, W, H, v) { p3.copy(v).project(cam); return [(p3.x + 1) / 2 * W, (1 - p3.y) / 2 * H, p3.z]; }
export function drawHud(A, ui) {
  const P = A.player, run = A.run, W = ui.W, H = ui.H; if (!P) return;
  const cinematic = A.cutscene || (P.locked && A.dialog.active);
  if (A.hideHud || cinematic) return;
  if (A.minimalHud) { const b0 = A.interact.best; if (b0 && !P.action) drawPrompt(ui, 'action', b0.verb); if (A.objT > 0 && A.objective) ui.text(8, 8, A.objective, { color: 'sand' }); A.extraHud?.(ui); return; }
  // Coverage
  const k = run.health / run.maxHealth, low = k < 0.25, x = 8; let y = H - 22;
  ui.text(x, y - 10, low && Math.floor(ui.t * 3) % 2 ? 'LAPSED' : 'COVERAGE', { color: low ? 'red' : 'mist' });
  ui.bar(x, y, 92, 6, k, low ? 'red' : k < 0.5 ? 'orange' : 'lime');
  if (A.dame?.active) { const dk = A.dame.hp / A.dame.maxHp; ui.text(x, y + 8, 'DAME', { color: A.dame.carried ? 'red' : 'mist' }); ui.bar(x + 30, y + 9, 62, 4, dk, dk < 0.3 ? 'red' : 'sand'); }
  // Ammo
  const id = run.weapon, st = run.weapons[id], S = statsOf(run, id); const am = A.infiniteAmmo ? '--' : `${st.ammo}/${ammoOf(run, id)}`; const m = ui.measure(am, 2);
  ui.text(W - 8 - m.width, H - 22, am, { scale: 2, color: st.ammo === 0 ? 'red' : 'white' });
  const ic = iconFor(id); ui.hud.sprite(W - 12 - m.width - ic.w, H - 24, ic.rows, ic.colors);
  const gren = run.items.filter((i) => ITEMS[i.id].kind === 'grenade').length; if (gren) ui.text(W - 8 - 42, H - 34, `GRENADES ${gren}`.slice(0, 11), { color: 'sand' });
  if (P.reloadT > 0) { ui.text(W / 2 - 24, H - 58, 'RELOADING', { color: 'sand' }); ui.bar(W / 2 - 24, H - 49, 54, 2, 1 - P.reloadT / P.reloadMax, 'sand'); }
  // Money
  if (A.moneyShow > 0) { const t = `${run.money} D`; const mm = ui.measure(t); ui.text(W - 8 - mm.width, 8, t, { color: 'sand' }); }
  // Objective
  if (A.objT > 0 && A.objective) ui.text(8, 8, A.objective, { color: 'sand' });
  // Prompt
  const best = A.interact.best;
  if (best && !P.action && !A.qte.active && !P.aiming) drawPrompt(ui, 'action', best.verb ?? best.label);
  else if (best?.enemy && !A.qte.active && !P.action) drawPrompt(ui, 'action', best.verb);
  else if (A.cmdPrompt && !P.action && !A.qte.active) drawPrompt(ui, 'command', A.cmdPrompt, H - 62);
  // Laser dot
  if (P.dotOn && !P.stats.scope) {
    const [dx, dy, dz] = project(A.ctx.camera.camera, W, H, P.dot); if (dz < 1) { const c = P.dotZone === 'head' ? 'lime' : P.dotZone === 'leg' ? 'sand' : 'red'; ui.rect(dx - 1, dy - 1, 3, 3, c); ui.rect(dx, dy, 1, 1, 'white'); }
  }
  if (P.dotOn && P.stats.scope) drawScope(ui);
  // Low health
  if (low) { const a = Math.floor(ui.t * 2.4) % 2; if (a) { ui.rect(0, 0, W, 2, 'red'); ui.rect(0, H - 2, W, 2, 'red'); ui.rect(0, 0, 2, H, 'red'); ui.rect(W - 2, 0, 2, H, 'red'); } }
  // Damage direction
  if (P.hitDirT > 0) { const d = P.hitDir - P.camYaw, sx = Math.sin(-d), cy = Math.cos(d); const hx = W / 2 + sx * (W / 2 - 20), hy = H / 2 - cy * (H / 2 - 20); for (let i = -2; i <= 2; i++) ui.rect(hx + i * 6 * cy, hy + i * 6 * sx, 6, 3, 'red'); }
  // Dame taken
  if (A.dame?.carried) { ui.center(24, `DAME TAKEN ${Math.ceil(A.dame.lostT)}`, { color: 'red', scale: 2 }); }
  if (P.limpets > 0 && Math.floor(ui.t * 4) % 2) ui.center(44, 'LIMPET ON YOU', { color: 'lime' });
  // Pointer
  if (A.needClick && !A.attract && A.app.dtShown !== false) ui.center(H - 60, 'CLICK TO AIM', { color: 'sand' });
  A.extraHud?.(ui);
}
function drawScope(ui) { const W = ui.W, H = ui.H, r = H / 2 - 20, cx = W / 2, cy = H / 2; for (let y = 0; y < H; y += 2) { const dy = y - cy, half = Math.abs(dy) < r ? Math.sqrt(r * r - dy * dy) : 0; if (half === 0) { ui.rect(0, y, W, 2, 'ink'); continue; } ui.rect(0, y, cx - half, 2, 'ink'); ui.rect(cx + half, y, W - cx - half, 2, 'ink'); } ui.rect(cx - 40, cy, 80, 1, 'ink'); ui.rect(cx, cy - 40, 1, 80, 'ink'); ui.rect(cx - 1, cy - 1, 3, 3, 'red'); }
export function drawPrompt(ui, action, verb, y = ui.H - 44) { const code = codeFor(action), gw = glyphWidth(code), m = ui.measure(verb); const tot = gw + 4 + m.width, x = Math.round(ui.W / 2 - tot / 2); ui.rect(x - 4, y - 2, tot + 8, 15, 'ink'); ui.glyph(code, x, y); ui.text(x + gw + 4, y + 2, verb, { color: 'white' }); }
export function drawQte(A, ui) {
  const q = A.qte; if (!q.active) return; const o = q.opt, cx = ui.W / 2, cy = ui.H / 2 - 16, k = Math.max(0, q.t / q.max), r = 10 + Math.round(16 * k);
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; ui.rect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, 2, 2, k < 0.33 ? 'red' : 'white'); }
  const act = o.type === 'alternate' ? (q.want === 0 ? 'action' : 'dodge') : (o.button === 'dodge' ? 'dodge' : 'action'); const code = codeFor(act), gw = glyphWidth(code); ui.glyph(code, Math.round(cx - gw / 2), cy - 5);
  ui.center(cy + r + 6, o.label ?? (o.type === 'mash' ? 'MASH' : 'NOW'), { color: 'sand' });
  if (o.type !== 'press') ui.bar(cx - 30, cy + r + 16, 60, 3, q.fill / (o.fill ?? 8), 'sand');
}
export function drawSubs(A, ui) {
  let y = A.cutscene ? 30 : 22; for (const s of A.subs) { const lines = ui.wrap(s.text.slice(0, Math.floor(s.n)), Math.min(ui.W - 40, 360)); for (const l of lines) { const m = ui.measure(l); ui.rect(ui.W / 2 - m.width / 2 - 2, y - 1, m.width + 4, 9, 'ink'); ui.text(ui.W / 2 - m.width / 2, y, l, { color: s.color }); y += 9; } y += 2; }
  for (const b of A.barks) { const m = ui.measure(b.text); if (b.screen) ui.text(b.screen[0] - m.width / 2, b.screen[1], b.text, { color: b.color ?? 'orange' }); }
  if (A.hintText && A.hintT > 0) { const m = ui.measure(A.hintText); const x = ui.W / 2 - m.width / 2; ui.rect(x - 5, ui.H - 76, m.width + 10, 13, 'navy'); ui.text(x, ui.H - 73, A.hintText, { color: 'white' }); }
}
