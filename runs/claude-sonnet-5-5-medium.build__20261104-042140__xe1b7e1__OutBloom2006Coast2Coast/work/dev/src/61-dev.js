/* Dev mode: reached from the pause menu. The sim freezes while the panel is open. Live sliders for the gameplay
 * variables (with a reset to defaults), cheats, warps and spawners. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px, game = OB.game, { clamp } = E, T = OB.txt;
const dev = OB.dev;
const rows = R => {
  const out = [
    { t: 'toggle', label: 'God mode (no crashes)', get: () => dev.god, set: v => { dev.god = v; } },
    { t: 'toggle', label: 'Infinite daylight', get: () => dev.infTime, set: v => { dev.infTime = v; } },
    { t: 'toggle', label: 'Debug readout', get: () => dev.showDebug, set: v => { dev.showDebug = v; } },
    { t: 'act', label: 'Warp to the fork', run: () => { R.z = Math.max(R.z, R.stage.gateZ - OB.AHEAD - 16000); } },
    { t: 'act', label: 'Warp past the gate', run: () => { R.z = R.stage.gateZ - OB.AHEAD + 10; dev.open = false; } },
    { t: 'act', label: 'Add 30 s of daylight', run: () => { R.clock += 30; } },
    { t: 'act', label: 'Boost now', run: () => { R.boost = 2; R.speed = Math.max(R.speed, 200); } },
    { t: 'act', label: 'Give a passenger request', run: () => { if (!R.req) R.startRequest(); } },
    { t: 'act', label: 'Add 5 petals', run: () => { R.petals += 5; } },
    { t: 'act', label: 'Clear the traffic', run: () => { R.traffic.length = 0; } },
    { t: 'act', label: 'Add 10 seeds', run: () => { OB.save.seeds += 10; OB.persist(); } },
    { t: 'act', label: 'Unlock the whole garden', run: () => { for (const b of OB.BEDS) if (!OB.save.planted.includes(b.id)) { OB.save.planted.push(b.id); OB.save[b.kind === 'car' ? 'cars' : b.kind === 'color' ? 'colors' : 'songs'].push(b.ref); } OB.persist(); } },
    { t: 'act', label: 'Reset all sliders to defaults', run: () => OB.resetTuning() }
  ];
  for (const k of Object.keys(OB.TMETA)) { const [name, lo, hi, st, u] = OB.TMETA[k]; out.push({ t: 'slider', label: name, key: k, lo, hi, st, u }); }
  out.push({ t: 'act', label: 'Close dev mode', run: () => { dev.open = false; } });
  return out;
};
OB.devRows = rows;
OB.devUpdate = (dt, R) => {
  const I = game.input, rs = rows(R); dev.row = clamp(dev.row, 0, rs.length - 1);
  if (I.repeat('up')) { dev.row = (dev.row + rs.length - 1) % rs.length; OB.sfx('select'); } if (I.repeat('down')) { dev.row = (dev.row + 1) % rs.length; OB.sfx('select'); }
  const r = rs[dev.row], d = (I.repeat('right') ? 1 : 0) - (I.repeat('left') ? 1 : 0);
  if (r.t === 'slider' && d) { OB.T[r.key] = clamp(Math.round((OB.T[r.key] + d * r.st) / r.st * 1e4) / 1e4 * r.st, r.lo, r.hi); OB.T[r.key] = Math.round(OB.T[r.key] * 1000) / 1000; }
  if (r.t === 'toggle' && (d || I.pressed('confirm'))) { r.set(!r.get()); OB.sfx('select'); }
  if (r.t === 'act' && I.pressed('confirm')) { OB.sfx('confirm'); r.run(); }
  if (I.pressed('cancel')) { dev.open = false; OB.sfx('cancel'); }
  I.consumeAll && I.consumeAll();
};
OB.devDraw = (g, W, H, R) => {
  const rs = rows(R), w = 200, x = W - w - 8, vis = 14, top = clamp(dev.row - 6, 0, Math.max(0, rs.length - vis)), y = 8;
  OB.panel(g, x, y, w, vis * 13 + 24, { bg: '#10081ce8', border: '#7aff9a' });
  T(g, 'DEV MODE · game paused', x + w / 2, y + 4, '#7aff9a', { align: 'center' });
  for (let i = 0; i < vis && top + i < rs.length; i++) {
    const r = rs[top + i], yy = y + 18 + i * 13, sel = top + i === dev.row;
    if (sel) px.rect(g, x + 3, yy - 2, w - 6, 12, '#2a5a3a');
    T(g, r.label, x + 8, yy, sel ? '#ffffff' : '#c8f0d0', {});
    if (r.t === 'slider') { const v = OB.T[r.key], u = (v - r.lo) / (r.hi - r.lo); px.rect(g, x + 112, yy + 3, 50, 3, '#1a3a2a'); px.rect(g, x + 112, yy + 3, Math.round(50 * clamp(u, 0, 1)), 3, '#7aff9a'); T(g, String(Math.round(v * 100) / 100) + (r.u === 'x' ? '' : r.u), x + w - 6, yy, '#ffe27a', { align: 'right', font: 'tiny' }); }
    else if (r.t === 'toggle') T(g, r.get() ? 'ON' : 'OFF', x + w - 8, yy, r.get() ? '#7aff9a' : '#a8a8b8', { align: 'right' });
  }
  OB.drawPrompts(g, W, H, [['up', 'Move'], ['left', 'Adjust'], ['confirm', 'Do'], ['cancel', 'Close']]);
};
})();
