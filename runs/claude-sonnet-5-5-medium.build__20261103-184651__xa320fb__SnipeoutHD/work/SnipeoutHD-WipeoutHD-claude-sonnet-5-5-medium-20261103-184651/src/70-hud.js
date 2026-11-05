(() => {
const E = My3D2dge, SN = globalThis.SN, px = SN.px;
const { clamp } = SN;
const HUD = SN.HUD = { calls: [], radio: null, feed: [], t: 0 };
HUD.call = (text, color = '#ffffff', secs = 1.6, scale = 2, owner) => { HUD.calls.push({ text, color, life: secs, max: secs, scale, owner }); if (HUD.calls.length > 3) HUD.calls.shift(); };
HUD.say = (who, text, secs = 4) => { HUD.radio = { who, text, life: secs, max: secs }; };
HUD.reset = () => { HUD.calls.length = 0; HUD.radio = null; HUD.feed.length = 0; };
HUD.tick = dt => { HUD.t += dt; for (const c of HUD.calls) c.life -= dt; HUD.calls = HUD.calls.filter(c => c.life > 0); if (HUD.radio && (HUD.radio.life -= dt) <= 0) HUD.radio = null; for (const f of HUD.feed) f.life -= dt; HUD.feed = HUD.feed.filter(f => f.life > 0); };
const T = (g, s, x, y, c = '#fff', o) => E.font.text(g, s, Math.round(x), Math.round(y), c, o === undefined ? '#0b0814' : o);
const bar = (g, x, y, w, h, f, col, back = '#1a1630') => { px(g, x - 1, y - 1, w + 2, h + 2, '#05030c'); px(g, x, y, w, h, back); px(g, x, y, Math.max(0, Math.round(w * clamp(f, 0, 1))), h, col); px(g, x, y, Math.round(w * clamp(f, 0, 1)), 1, 'rgba(255,255,255,.35)'); };
HUD.minimap = (g, race, x, y, size) => {
  const tr = race.track; if (!tr._mm || tr._mm.size !== size) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const p of tr.C) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); } const sc = size / Math.max(b - a, d - c); tr._mm = { size, a, c, sc, ox: (size - (b - a) * sc) / 2, oy: (size - (d - c) * sc) / 2, pts: tr.C.filter((_, i) => i % 6 === 0).map(p => [Math.round((p[0] - a) * sc), Math.round((p[1] - c) * sc)]) }; }
  const m = tr._mm; px(g, x - 3, y - 3, size + 6, size + 6, 'rgba(8,6,20,.55)');
  g.fillStyle = '#6f6aa8'; for (const p of m.pts) g.fillRect(x + m.ox + p[0], y + m.oy + p[1], 2, 2);
  for (const sh of race.ships) { if (!sh.alive) continue; const p = sh.pos, X = x + m.ox + (p[0] - m.a) * m.sc, Y = y + m.oy + (p[1] - m.c) * m.sc; px(g, X - 1, Y - 1, sh.control === 'human' ? 5 : 3, sh.control === 'human' ? 5 : 3, sh.control === 'human' ? '#ffffff' : sh.color); }
};
// the race HUD. `focus` is the craft being followed; `opts.compact` for demo overlays
HUD.draw = (r, race, focus, opts = {}) => {
  if (!SN.CHEATS.showHud) return;
  r.overlay(g => {
    const W = r.W, H = r.H, sh = focus; if (!sh) return;
    const mode = race.mode, kmh = Math.round(SN.kmh(sh.v)), pad = 10;
    if (race.state === 'grid') { const n = Math.ceil(race.countdown); if (n > 0 && n <= 3) { const k = race.countdown % 1; E.font.title(g, String(n), W / 2, H * .30, { scale: 6 + Math.round((1 - k) * 2), align: 'center', colors: ['#fff', '#ffe08a', '#ff8a2a'] }); } if (sh.control === 'human' && !opts.demo) { bar(g, W / 2 - 40, H * .30 + 62, 80, 4, sh.launch, sh.launch > .35 && sh.launch < .75 ? '#5dff9a' : '#ff6b6b'); T(g, 'HOLD THRUST: RELEASE THE LAUNCH IN THE GREEN', W / 2, H * .30 + 70, '#cfc8ff', { align: 'center' }); } }
    // speed
    if (!opts.hideSpeed) {
      E.font.title(g, String(kmh), W - pad - 4, H - 58, { scale: 4, align: 'right', colors: ['#ffffff', '#9fe8ff', '#4cc8ff'], depth: 2, depthColor: '#10304a' }); T(g, 'KM/H', W - pad - 2, H - 22, '#9fe8ff', { align: 'right' });
    }
    // shield energy
    const ef = sh.energy / 100, ec = ef > .5 ? '#5dff9a' : ef > .25 ? '#ffd23c' : (Math.floor(HUD.t * 6) % 2 ? '#ff3b3b' : '#ff8a8a');
    T(g, 'SHIELD', pad, H - 38, '#d8d4ff'); bar(g, pad + 38, H - 36, 80, 6, ef, ec);
    if (sh.shieldT > 0) T(g, 'BULWARK ' + sh.shieldT.toFixed(1), pad, H - 50, '#4aa8ff');
    if (sh.autoT > 0) T(g, 'AUTOPILOT ' + sh.autoT.toFixed(1), pad, H - 62, '#ff9bd8');
    if (sh.boostT > 0) T(g, 'BOOST', pad + 84, H - 50, '#8fe0ff');
    // weapon box
    if (race.rules.weapons) { const bx = W - pad - 34, by = H - 118; px(g, bx - 2, by - 2, 36, 36, '#05030c'); px(g, bx, by, 32, 32, 'rgba(26,22,48,.8)'); if (sh.weapon) { SN.WeaponIcon(g, sh.weapon, bx + 4, by + 4, 2); T(g, SN.WEAPONS[sh.weapon].name, bx + 16, by + 36, SN.WEAPONS[sh.weapon].color, { align: 'center' }); } else T(g, 'EMPTY', bx + 16, by + 12, '#6a6490', { align: 'center' }); if (sh.weapon && !opts.demo) { SN.Glyph.left(g, [['fire', 'FIRE'], ['absorb', 'ABSORB']], bx - 112, by + 10); } }
    // top left: position and lap
    if (mode === 'race' || mode === 'time' || mode === 'academy') {
      const total = race.ships.length;
      if (mode !== 'time' && mode !== 'academy') E.font.title(g, SN.ord(sh.place), pad, pad, { scale: 3, colors: ['#fff6c8', '#ffd36a'], depth: 1, depthColor: '#4a2a1a' }), T(g, '/' + total, pad + 54, pad + 14, '#cfc8ff');
      T(g, 'LAP ' + Math.min(sh.lap, race.laps) + '/' + race.laps, pad, pad + 30, '#ffffff');
      T(g, SN.fmtTime(race.time * 1000), W - 64, pad, '#ffffff', { align: 'right' });
      if (sh.lapTimes.length) T(g, 'LAST ' + SN.fmtTime(sh.lapTimes[sh.lapTimes.length - 1]) + '  BEST ' + SN.fmtTime(Math.min(...sh.lapTimes)), W - 64, pad + 12, '#9fe8ff', { align: 'right' });
      if (race.ghostBest) T(g, 'GHOST ' + SN.fmtTime(race.ghostBest), W - 64, pad + 24, '#9fd8ff', { align: 'right' });
    }
    if (mode === 'snipeout') { T(g, String(sh.score), pad, pad, '#ffe08a', { scale: 3 }); T(g, 'POINTS  ' + SN.ord(sh.place) + ' of ' + race.ships.length, pad + 8 + String(sh.score).length * 18, pad + 14, '#cfc8ff'); const left = Math.max(0, race.rules.timeLimit - race.time); T(g, SN.fmtTime(left * 1000).slice(0, 4), W - 64, pad, left < 20 ? '#ff6b6b' : '#fff', { align: 'right' }); if (race.rules.scoreGoal) T(g, 'GOAL ' + race.rules.scoreGoal, W - 64, pad + 12, '#ffd36a', { align: 'right' }); T(g, 'KOs ' + sh.kills, pad, pad + 30, '#ff9b9b'); }
    if (mode === 'overclock') { E.font.title(g, 'ZONE ' + race.zone, pad, pad, { scale: 3, colors: ['#ff9bf0', '#ff2fb4'] }); T(g, 'SCORE ' + race.score, pad, pad + 30, '#fff'); T(g, 'NEXT ZONE ' + Math.max(0, 15 - race.zoneT).toFixed(0) + 's', W - 64, pad, '#9fe8ff', { align: 'right' }); if (race.rules.zoneGoal) T(g, 'GOAL ZONE ' + race.rules.zoneGoal, W - 64, pad + 12, '#ffd36a', { align: 'right' }); }
    // standings
    if (mode === 'race' && !opts.hideBoard) { const ord = race.ships.slice().sort((a, b) => a.place - b.place); let yy = pad + 46; for (const o of ord.slice(0, 5)) { const me = o === sh; px(g, pad, yy, 3, 8, o.color); T(g, o.place + ' ' + o.name.slice(0, 11), pad + 6, yy, me ? '#ffffff' : '#a8a2d8', me ? '#2a1a4a' : '#0b0814'); yy += 10; } }
    if (!opts.hideMap) HUD.minimap(g, race, W - pad - 52, pad + 36, 48);
    // academy drill
    if (mode === 'academy' && race.state !== 'over') { const d = SN.DRILLS[race.drillIdx]; if (d) { px(g, W / 2 - 150, pad, 300, 36, 'rgba(10,8,28,.7)'); T(g, 'DRILL ' + (race.drillIdx + 1) + '/' + SN.DRILLS.length, W / 2, pad + 3, '#ffd36a', { align: 'center' }); T(g, HUD.fill(d.text), W / 2, pad + 15, '#fff', { align: 'center', wrap: 290 }); } }
    // callouts
    let cy = H * .24; for (const c of HUD.calls) { if (c.owner && c.owner !== sh) continue; const k = clamp(Math.min(c.life, c.max - c.life) * 6, 0, 1); g.globalAlpha = k; E.font.title(g, c.text, W / 2, cy, { scale: c.scale, align: 'center', colors: [c.color, c.color] }); g.globalAlpha = 1; cy += 8 + c.scale * 9; }
    if (HUD.radio) { const rd = HUD.radio, w = Math.min(W - 40, 300); px(g, W / 2 - w / 2, H - 52, w, 24, 'rgba(10,8,28,.72)'); px(g, W / 2 - w / 2, H - 52, 3, 24, '#7a6aff'); T(g, rd.who, W / 2 - w / 2 + 8, H - 49, '#ffd36a'); T(g, rd.text, W / 2 - w / 2 + 8, H - 38, '#fff', { wrap: w - 14 }); }
    if (race.state === 'racing' && sh.alive === false && race.mode !== 'snipeout') T(g, 'ELIMINATED', W / 2, H * .4, '#ff4a4a', { align: 'center', scale: 2 });
    if (!sh.alive && sh.respawnAt) T(g, 'REPAIR IN ' + Math.max(0, sh.respawnAt - race.time).toFixed(1), W / 2, H * .45, '#ffd36a', { align: 'center' });
    if (race.state === 'racing' && sh.fr && !opts.demo) { const rel = ((sh.psi) > 0 ? 1 : -1); }
    for (const f of HUD.feed) T(g, f.text, W / 2, H * .6 + HUD.feed.indexOf(f) * 10, f.color, { align: 'center' });
    if (opts.replay) { if (Math.floor(HUD.t * 1.2) % 2 === 0) T(g, 'REPLAY', W / 2, 12, '#9fe8ff', { align: 'center', scale: 2 }); SN.Glyph.left(g, [['confirm', 'EXIT REPLAY']], W / 2 - 50, H - 16); }
    if (opts.demo) { if (Math.floor(HUD.t * 1.2) % 2 === 0) T(g, 'DEMO', W / 2, 12, '#ffffff', { align: 'center', scale: 2 }); T(g, 'PRESS ANY BUTTON', W / 2, H - 14, '#ffd36a', { align: 'center' }); }
    if (SN.CHEATS.hitboxes && sh) T(g, 'u ' + (sh.u / 16).toFixed(1) + ' psi ' + sh.psi.toFixed(2) + ' h ' + (sh.h / 16).toFixed(1) + ' s ' + (sh.s / 16).toFixed(0), pad, H - 74, '#7aff7a');
  });
  // name tags above rivals
  if (!opts.hideTags && SN.R.world && race.state !== 'over') {
    r.overlay(g => { for (const o of race.ships) { if (o === focus || !o.alive) continue; const d = o.dist - focus.dist; if (d < -50 * 16 || d > 260 * 16) continue; const p = SN.R.world.project(o.pos[0], o.pos[1], o.pos[2] + 70); if (p && p[0] > 0 && p[0] < r.W && p[1] > 0 && p[1] < r.H) { T(g, o.name.slice(0, 12), p[0], p[1], o.color, { align: 'center' }); if (focus.lockTarget === o) T(g, '[ ]', p[0], p[1] + 10, '#ff3b3b', { align: 'center' }); } } });
  }
};
HUD.fill = s => s.replace(/\{(\w+)\}/g, (m, a) => (SN.Glyph.label(a) || a).replace('✕', 'X').replace('○', 'O').replace('□', 'Square').replace('△', 'Triangle').replace('←', 'Left').replace('→', 'Right').replace('↑', 'Up').replace('↓', 'Down'));
})();
