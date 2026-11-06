// The in-game HUD: sparse, 10-foot readable, gone during cutscenes.
import { THREE } from '../../pixel-engine.js';
import { ui } from '../core/ui.js';
import { glyphName } from '../core/device.js';
import { SPEAKERS } from '../audio/voice.js';
import { WEAPONS } from '../data/weapons.js';

const { Vector3 } = THREE;
const _v = new Vector3();
const COLORS = { MAX: 'sand', DAME: 'mist', COMMODORE: 'red', FATHOM: 'green', PYM: 'cyan', MENDER: 'orange', NILS: 'sky', ISLANDER: 'orange', MONK: 'mist', BOSUN: 'red', ANSGAR: 'orange' };

export function drawHud(a) {
  const hud = a.ctx.hud, W = ui.W, H = ui.H, run = a.run, p = a.player;
  const sc = a.scripts;
  if (sc.cut) return drawCut(a);
  if (a.hideHud) return;
  // low health edge
  const hpf = run.hp / run.maxHp;
  if (hpf < 0.25 && !p.dead) { const pulse = 0.5 + 0.5 * Math.sin(a.time * 6); const t = 2 + Math.round(pulse * 3); ui.rect(0, 0, W, t, 'red'); ui.rect(0, H - t, W, t, 'red'); ui.rect(0, 0, t, H, 'red'); ui.rect(W - t, 0, t, H, 'red'); }
  // damage arcs
  for (const d of a.dmgArcs) {
    const k = Math.max(0, d.t / 0.7); const cx = W / 2 + Math.sin(d.ang) * (H / 2 - 20), cy = H / 2 - Math.cos(d.ang) * (H / 2 - 20);
    for (let i = -3; i <= 3; i++) ui.rect(Math.round(cx + Math.cos(d.ang) * i * 4 - 2), Math.round(cy + Math.sin(d.ang) * i * 4 - 2), 4, 4, k > 0.5 ? 'red' : 'plum');
  }
  // coverage bar
  const bx = 8, by = H - 34;
  ui.text(bx, by - 10, hpf < 0.25 ? 'LAPSED' : 'COVERAGE', { color: hpf < 0.25 ? 'red' : 'sand' });
  ui.bar(bx, by, 74, 6, hpf, hpf < 0.25 ? 'red' : hpf < 0.5 ? 'orange' : 'lime');
  if (a.dame && a.dame.alive) { ui.text(bx, by + 9, 'DAME', { color: 'mist' }); ui.bar(bx + 26, by + 10, 48, 4, a.dame.hp / a.dame.maxHp, 'plum'); }
  if (a.dame?.grabbedBy) { ui.text(W / 2, 30, 'DAME TAKEN ' + Math.ceil(a.dame.grabT), { align: 'center', color: 'red', scale: 2 }); }
  // ammo
  const w = p.weapon, st = run.stat(w.id);
  const mag = run.mags[w.id] ?? 0;
  const ax = W - 10;
  ui.text(ax, H - 36, `${mag}/${run.ammo(w.id)}`, { align: 'right', scale: 2, color: mag === 0 ? 'red' : 'white' });
  ui.text(ax, H - 18, w.name, { align: 'right', color: 'mist' });
  if (p.reloading) ui.text(ax, H - 50, 'RELOADING', { align: 'right', color: 'sand' });
  const gr = run.grenade && run.case.count(run.grenade) > 0 ? run.grenade : run.grenades()[0];
  if (gr) ui.text(ax, H - 8, `${gr.toUpperCase()} x${run.case.count(gr)}`, { align: 'right', color: 'sky' });
  // doubloons
  if (a.moneyShow > 0) ui.text(W - 8, 8, `${run.doubloons} DBL`, { align: 'right', color: 'sand' });
  // objective
  if (a.objective && a.objectiveShow > 0) ui.text(8, 8, a.objective, { color: 'white' });
  // timers
  if (a.timerLabel) { ui.text(W / 2, 8, a.timerLabel, { align: 'center', scale: 2, color: a.timerColor || 'sand' }); }
  if (a.tideGauge) drawTide(a);
  // context prompt
  if (a.prompt && !sc.dlg && !sc.qte) {
    const label = a.prompt.label; const g = glyphName(a.prompt.verb || 'action');
    const gw = Math.max(9, ui.measure(g) + 4); const tw = ui.measure(label);
    const x = Math.floor((W - (gw + 4 + tw)) / 2), y = H - 44;
    ui.rect(x - 4, y - 3, gw + tw + 12, 13, 'ink');
    ui.glyph(a.prompt.verb || 'action', x, y); ui.text(x + gw + 4, y, label, { color: 'white' });
  }
  // laser dot
  if (p.aiming && !p.dead) drawDot(a);
  if (!a.pointerOK && a.needsLockHint) ui.text(W / 2, H / 2 + 20, 'CLICK TO AIM', { align: 'center', color: 'sand', scale: 2 });
  // hints
  if (a.hint && a.hintT > 0) { ui.rect(W / 2 - ui.measure(a.hint) / 2 - 5, 26, ui.measure(a.hint) + 10, 12, 'ink'); ui.text(W / 2, 29, a.hint, { align: 'center', color: 'sand' }); }
  // boss bar
  if (a.boss?.barInfo) { const b = a.boss.barInfo(); ui.text(W / 2, 14, b.name, { align: 'center', color: 'red' }); ui.bar(W / 2 - 60, 24, 120, 5, b.frac, 'red'); }
  // barks
  let by2 = H - 70;
  for (const b of sc.barks) { const col = COLORS[b.who] || 'white'; ui.text(W / 2, by2, `${b.who}: ${b.text}`, { align: 'center', color: col }); by2 -= 10; }
  // dialogue and qte
  if (sc.dlg) drawDialogue(a);
  if (sc.qte) drawQte(a);
  if (a.stamp) drawStamp(a);
  if (a.flashT > 0) ui.rect(0, 0, W, H, a.flashColor || 'white');
}
function drawDot(a) {
  const ray = a.combat.aimRay({}); const hit = a.combat.trace(ray, 80);
  a.aimHit = hit;
  _v.set(hit.point.x, hit.point.y, hit.point.z);
  const cam = a.ctx.camera.camera; _v.project(cam);
  const x = Math.round((_v.x + 1) / 2 * ui.W), y = Math.round((1 - _v.y) / 2 * ui.H);
  const col = hit.kind === 'enemy' ? (hit.zone === 'head' ? 'lime' : hit.zone === 'leg' ? 'sand' : 'red') : 'red';
  ui.rect(x - 1, y - 1, 3, 3, col); ui.rect(x, y, 1, 1, 'white');
}
function drawTide(a) {
  const g = a.tideGauge, x = ui.W - 14, y = 30, h = 90;
  ui.rect(x - 1, y - 1, 8, h + 2, 'ink'); ui.rect(x, y, 6, h, 'night');
  ui.rect(x, y + h - Math.round(h * g.level), 6, Math.round(h * g.level), g.level > 0.7 ? 'red' : 'cyan');
  ui.text(x - 26, y + h + 4, Math.max(0, Math.ceil(g.left)) + 'S', { color: 'sand' });
}
function drawDialogue(a) {
  const d = a.scripts.dlg, W = ui.W, H = ui.H;
  const x = 20, w = W - 40, y = H - 70, h = 54;
  ui.panel(x, y, w, h, { fill: 'ink', edge: 'slate' });
  const col = COLORS[d.who] || 'white';
  ui.text(x + 6, y + 5, d.who, { color: col });
  const shown = d.text.slice(0, Math.floor(d.typed));
  const lines = ui.wrap(shown, w - 14);
  lines.slice(0, 3).forEach((l, i) => ui.text(x + 6, y + 17 + i * 11, l, { color: 'white' }));
  if (d.typed >= d.text.length && Math.sin(a.time * 8) > 0) ui.glyph('confirm', x + w - 18, y + h - 12);
}
function drawCut(a) {
  const c = a.scripts.cut, tl = c.tl, W = ui.W, H = ui.H;
  const bars = tl.bars(); const bh = Math.round(bars * 30);
  ui.rect(0, 0, W, bh, 'ink'); ui.rect(0, H - bh, W, bh, 'ink');
  const line = tl.line();
  if (line) {
    const who = (line.who || '').toUpperCase(); const col = COLORS[who] || 'white';
    const txt = line.text.toUpperCase(); const lines = ui.wrap(txt, W - 60);
    const y0 = H - bh - lines.length * 11 - 8;
    lines.forEach((l, i) => { ui.text(W / 2, y0 + i * 11, i === 0 && who ? `${who}: ${l}` : l, { align: 'center', color: i === 0 ? col : 'white' }); });
  }
  const sk = a.scripts.skipHeld; if (sk > 0) { ui.bar(W - 60, H - 14, 50, 3, sk / 0.6, 'sand'); ui.text(W - 62, H - 24, 'SKIP', { align: 'right', color: 'mist' }); }
  else ui.text(W - 8, H - 12, '', {});
}
function drawQte(a) {
  const q = a.scripts.qte, W = ui.W, H = ui.H, cx = W / 2, cy = H / 2 - 10;
  const f = Math.max(0, 1 - q.t / q.window);
  const R = 10 + f * 26;
  for (let i = 0; i < 40; i++) { const ang = i / 40 * Math.PI * 2; ui.rect(Math.round(cx + Math.cos(ang) * R), Math.round(cy + Math.sin(ang) * R), 2, 2, f < 0.3 ? 'red' : 'sand'); }
  const verb = q.type === 'press' && q.verb === 'dodge' ? 'dodge' : q.verb;
  ui.rect(cx - 11, cy - 6, 22, 14, 'ink'); ui.glyph(verb, cx - Math.floor((Math.max(9, ui.measure(glyphName(verb)) + 4)) / 2), cy - 3);
  if (q.label) ui.text(cx, cy + 40, q.label, { align: 'center', color: 'white' });
  if (q.type !== 'press') ui.bar(cx - 30, cy + 52, 60, 5, q.bar || 0, 'lime');
}
function drawStamp(a) {
  const s = a.stamp; const t = a.time - s.t0; const k = Math.min(1, t / 0.18);
  const sc = 3; const w = ui.measure(s.text, sc);
  ui.rect(ui.W / 2 - w / 2 - 8, ui.H / 2 - 16 + (1 - k) * -40, w + 16, 32, 'ink');
  ui.text(ui.W / 2, ui.H / 2 - 10 + (1 - k) * -40, s.text, { align: 'center', scale: sc, color: s.color || 'red' });
}
export { WEAPONS };
