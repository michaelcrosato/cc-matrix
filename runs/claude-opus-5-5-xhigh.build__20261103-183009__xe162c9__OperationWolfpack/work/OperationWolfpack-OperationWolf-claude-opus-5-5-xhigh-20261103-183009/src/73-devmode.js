// Dev mode (11): from the pause menu. Live sliders (settings in the hidden group "Dev": each writes WP.T at once, even
// mid-fight; RESET TO DEFAULTS = settings.reset('Dev')), cheats, views, jumps, spawns, flow tools and the designer's
// data tools (a ready-to-paste stage line for the point under the crosshair). Also the RANGE (target practice).
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E;
const D = WP.Dev = { cheats: {}, stepOnce: false, frozen: false, toast: null, perf: { ms: 0, last: 0 }, range: { t0: 0, times: [] } };
const CHEATS = [['devGod', 'God mode', 'god'], ['devAmmo', 'Infinite ammo', 'ammo'], ['devGren', 'Infinite grenades', 'grenades'], ['devOneHit', 'One-hit kills', 'oneHit'], ['devHold', 'Enemies hold fire', 'holdFire'], ['devBot', 'Bot autopilot (P1)', 'bot']];
const VIEWS = [['devShapes', 'Show hit shapes'], ['devPaths', 'Show paths and spawn markers'], ['devPerf', 'Perf overlay']];
D.anyCheat = () => Object.keys(D.cheats).some(k => D.cheats[k]);
D.SPAWNABLE = () => Object.keys(WP.TYPES).filter(k => { const t = WP.TYPES[k]; return t.kind !== 'proj' && t.kind !== 'pickup' && t.kind !== 'boss' && t.kind !== 'prop' && !t.scenery; });
D.define = game => {
  const S = game.settings;
  for (const [k, label, def, min, max, step] of WP.TUNING_SPEC) S.define({ key: 't_' + k, group: 'Dev', label, type: 'slider', value: def, min, max, step, apply: (g, v) => { WP.T[k] = v; if (k === 'timeScale' && g.sceneName === 'play') g.timeScale = v; } });
  for (const [k, label, c] of CHEATS) S.define({ key: k, group: 'Dev', label, type: 'toggle', value: false, apply: (g, v) => { D.cheats[c] = v; if (c === 'bot') D.setBot(v); } });
  for (const [k, label] of VIEWS) S.define({ key: k, group: 'Dev', label, type: 'toggle', value: false, apply: (g, v) => { if (k === 'devShapes') WP.ctx.devShapes = v; } });
  S.define({ key: 'devSlow', group: 'Dev', label: 'Slow motion', type: 'select', value: 1, options: [[1, '1x'], [.5, '.5x'], [.25, '.25x'], [.1, '.1x']], apply: (g, v) => { g.settings.set('t_timeScale', v); } });
  S.define({ key: 'devOp', group: 'Dev', label: 'Jump: operation', type: 'select', value: 'op1', options: WP.OPS.map(o => [o, o.toUpperCase().replace('OP', 'OP ') + ' ' + WP.TEXT.ops[o][0]]) });
  S.define({ key: 'devBeat', group: 'Dev', label: 'Jump: beat', type: 'select', value: 'start', options: [['start', 'Start']].concat(Array.from({ length: 18 }, (_, i) => ['b' + (i + 1), 'Beat ' + (i + 1)]), [['boss', 'Boss'], ['partB', 'Part B (Op 6)']]) });
  S.define({ key: 'devSpawn', group: 'Dev', label: 'Spawn type', type: 'select', value: 'rifleman', options: D.SPAWNABLE().map(k => [k, k]) });
  S.define({ key: 'devHostages', group: 'Dev', label: 'Hostages (set)', type: 'select', value: 5, options: [0, 1, 2, 3, 4, 5].map(n => [n, String(n)]) });
  S.define({ key: 'devEnding', group: 'Dev', label: 'Ending to play', type: 'select', value: 5, options: [0, 1, 2, 3, 4, 5].map(n => [n, n + ' hostages']) });
  S.define({ key: 'devCut', group: 'Dev', label: 'Cutscene to play', type: 'select', value: 'briefing', options: [['briefing', 'Briefing'], ['interrogation', 'Interrogation'], ['aftermath', 'Kennel aftermath'], ['takeoff', 'Takeoff']] });
  S.define({ key: 'devSound', group: 'Dev', label: 'Sound board', type: 'select', value: 'smg', options: Object.keys(WP.Audio.SFX).map(k => [k, k]) });
};
D.setBot = on => { if (on) { const b = WP.Bot.make({ fair: false }); WP.Input.override(0, (w, p, dt) => WP.Bot.frame(b, w, p, dt)); } else WP.Input.override(0, null); };
D.say = (title, text) => { D.toast = { title, text, t: 3 }; if (WP.ctx.game.shell) WP.ctx.game.shell.toast(title, text); };
/** jump to an operation and beat (or the boss, or Op 6's part B) */
D.jump = (game, op, beat) => {
  const st = WP.STAGE[op]; if (!st) return;
  if (!WP.Flow.run) WP.Flow.newRun();
  let d = 0, after = null;
  if (beat === 'boss') { const bh = st.holds.find(h => h.until === 'boss'); d = (bh ? bh.d : st.rail[st.rail.length - 1].d) - 1; }
  else if (beat === 'partB') { after = sim => WP.Op6 && WP.Op6.partB(sim); }
  else if (beat && beat !== 'start') { const i = +beat.slice(1) - 1, b = st.beats[Math.min(i, st.beats.length - 1)]; d = Math.max(0, (b && b.at !== undefined ? b.at : 0) - 2); }
  game.go('play', { op, d, noCard: true, jump: sim => { if (beat === 'boss') { for (const k in sim.quotas) sim.quotas[k] = 0; } if (after) after(sim); } });
};
D.actions = game => {
  const S = game.settings, sim = () => WP.Flow.sim, play = () => game.sceneName === 'play' && sim();
  const close = () => { game.shell.hide(); };
  return [
    ['GO (jump)', () => { close(); D.jump(game, S.devOp, S.devBeat); }],
    ['RANGE', () => { close(); game.go('play', { op: 'range', noCard: true, fresh: true }); }],
    ['SPAWN AT CROSSHAIR', () => { const s = play(); if (!s) return; const p = s.players[0], f = s.view.toFloor(p.x, p.y); if (!f) return D.say('SPAWN', 'Aim at the floor.'); const D0 = s.view.depth(f[0], f[1]), L = s.view.lateral(f[0], f[1]); s.spawn(S.devSpawn, { lx: L, dz: D0 }); D.say('SPAWN', S.devSpawn + ' at lx ' + Math.round(L) + ', dz ' + Math.round(D0)); }],
    ['FILL QUOTAS', () => { const s = play(); if (s) for (const k in s.quotas) s.quotas[k] = 0; }],
    ['TRIGGER BOSS', () => { const s = play(); if (s && s.stage.boss && !s.boss) { for (const k in s.quotas) s.quotas[k] = 0; s.d = s.rail.length; s.flags.bossCalled = true; WP.Bosses.start(s, s.stage.boss); } }],
    ['KILL ALL', () => { const s = play(); if (s) for (const e of s.ents) { const k = WP.TYPES[e.type].kind; if (!e.dead && (k === 'infantry' || k === 'vehicle' || k === 'air' || k === 'boat') && !WP.TYPES[e.type].friendly && !WP.TYPES[e.type].scenery) s.kill(e, 0, 'body', 'dev'); if (k === 'proj') e.gone = true; } }],
    ['DAMAGE SELF 25', () => { const s = play(); if (s) s.hurtPlayer(s.players[0], 25, { kind: 'dev' }); }],
    ['HEAL', () => { const s = play(); if (s) for (const p of s.players) { p.damage = 0; p.down = false; } }],
    ['GIVE 3 MAGS', () => { const s = play(); if (s) for (let i = 0; i < 3; i++) s.players[0].spares.push(Math.round(WP.T.magSize)); }],
    ['GIVE 3 GRENADES', () => { const s = play(); if (s) s.players[0].grenades += 3; }],
    ['GIVE FURY', () => { const s = play(); if (s) { s.players[0].fury = 10; s.ev('fury', { pid: 0 }); } }],
    ['GIVE DYNAMITE', () => { const s = play(); if (s) WP.Supply.dynamite(s, s.players[0]); }],
    ['SET HOSTAGES', () => { if (WP.Flow.run) { WP.Flow.run.hostagesFreed = S.devHostages; WP.Flow.run.hostagesSaved = S.devHostages; } D.say('HOSTAGES', 'Set to ' + S.devHostages); }],
    ['PLAY ENDING', () => { close(); if (!WP.Flow.run) WP.Flow.newRun(); WP.Flow.run.hostagesSaved = S.devEnding; game.go('ending', { n: S.devEnding }); }],
    ['PLAY CUTSCENE', () => { close(); if (!WP.Flow.run) WP.Flow.newRun(); game.go('cutscene', { id: S.devCut, next: 'title' }); }],
    ['PLAY SOUND', () => { WP.Audio.play(S.devSound); }],
    ['COPY SPAWN LINE', () => { const s = play(); if (!s) return; const p = s.players[0], f = s.view.toFloor(p.x, p.y); if (!f) return; const line = "['" + S.devSpawn + "', { lx: " + Math.round(s.view.lateral(f[0], f[1])) + ', dz: ' + Math.round(s.view.depth(f[0], f[1])) + ' }]'; console.log(line); D.say('SPAWN LINE (console)', line); try { navigator.clipboard && navigator.clipboard.writeText(line); } catch (e) { /* no clipboard */ } }],
    ['COPY PROP LINE', () => { const s = play(); if (!s) return; const p = s.players[0], f = s.view.toFloor(p.x, p.y); if (!f) return; const line = "['crate', 'c?', " + Math.round(f[0]) + ', ' + Math.round(WP.Y0 - f[1]) + ']'; console.log(line); D.say('PROP LINE (console)', line); try { navigator.clipboard && navigator.clipboard.writeText(line); } catch (e) { /* no clipboard */ } }],
    ['STEP ONE FRAME', () => { D.stepOnce = true; }],
    ['RESET TO DEFAULTS', () => { S.reset('Dev'); game.shell.show('dev', {}); D.say('DEV', 'Every slider and toggle is back to its default.'); }],
    ['RESET SAVE', () => { WP.Store.reset(); D.say('SAVE', 'High scores, unlocks and tips are cleared.'); }]
  ];
};
D.open = game => {
  game.shell.show('dev', { kicker: 'Tools', title: 'DEV MODE', text: 'Live balance sliders change play at once. Jump, spawn and flow tools act on the operation under the menu.',
    rows: () => [['CHEATS', CHEATS.map(c => c[0])], ['VIEW', VIEWS.map(v => v[0]).concat(['devSlow'])], ['JUMP', ['devOp', 'devBeat']], ['SPAWN', ['devSpawn']], ['FLOW', ['devHostages', 'devEnding', 'devCut', 'devSound']], ['BALANCE', WP.TUNING_SPEC.map(s => 't_' + s[0])]],
    actions: () => D.actions(game).concat([['Back', () => game.shell.back()]]) });
};
// ---------- each step and the overlay ----------
D.update = (dt, sim) => {
  if (D.toast) { D.toast.t -= dt; if (D.toast.t <= 0) D.toast = null; }
  const now = typeof performance !== 'undefined' ? performance.now() : 0; D.perf.ms = D.perf.ms * .9 + (now - (D.perf.last || now)) * .1; D.perf.last = now;
};
D.overlay = (g, sim) => {
  const S = WP.ctx.game.settings;
  if (S.devPerf) {
    const F = WP.HUD.F, y = 40;
    px.blend(g, .7, 'normal', () => px.rect(g, 330, y - 2, 146, 62, '#000'));
    F(g, 'FRAME ' + D.perf.ms.toFixed(1) + ' ms', 334, y, '#a8ffa8'); F(g, 'ENTS ' + sim.ents.length + '  FX ' + WP.FX.parts.length, 334, y + 10, '#a8ffa8');
    F(g, 'RAIL d ' + Math.round(sim.d) + (sim.hold ? '  HOLD' : ''), 334, y + 20, '#a8ffa8'); F(g, 'BEAT ' + ((sim.beats.filter(b => b.fired).pop() || {}).id || '-') + '  SEED ' + sim.seed, 334, y + 30, '#a8ffa8');
    F(g, 'SHAPES ' + sim.shapes.length + '  CACHE ' + WP.Render.cache.size, 334, y + 40, '#a8ffa8');
  }
  if (S.devPaths) {   // spawn markers: where each unfired beat's spawns will appear
    const F = WP.HUD.F;
    for (const b of sim.beats) { if (b.fired || b.at === undefined) continue; const dx = b.at - sim.d; if (dx > 600) continue; F(g, b.id + ' +' + Math.round(dx), WP.W / 2 + dx * .4, 60, '#ff80ff'); }
    for (const e of sim.ents) { if (e.dead || !e.mvx) continue; const p = sim.view.project(e.x, e.y, e.z), q = sim.view.project(e.x + e.mvx * 60, e.y + e.mvy * 60, e.z); if (p && q) px.line(g, p[0], p[1], q[0], q[1], '#ff80ff'); }
  }
  if (sim.stage.id === 'range') {
    const F = WP.HUD.F, t = D.range.times, avg = t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0;
    F(g, 'RANGE: TIME TO TARGET ' + (t.length ? t[t.length - 1].toFixed(2) + ' s  AVG ' + avg.toFixed(2) + ' s' : '-'), WP.W / 2, 40, '#ffd040', { align: 'center' });
  }
};
// ---------- the RANGE: target practice ----------
WP.defStage({
  id: 'range', n: 0, name: 'RANGE', music: 'map', sky: 'day', fog: { color: '#b8c8d8', near: 500, far: 1400 }, floor: 'range', outside: '#7a6a4a',
  cam: { h: 28, pitch: 6, fov: 60 }, rail: [{ d: 0, x: 0, y: WP.Y0, angle: -Math.PI / 2 }, { d: 10, x: 10, y: WP.Y0 }], speed: 1, holds: [{ d: 9, until: 'flag', flag: 'never' }],
  scenery: [WP.Layout.row('palm', -600, 600, 900, { every: 120, jitter: 40, size: [1.2, 1.5] }), WP.Layout.row('sandbags', -300, 300, 40, { every: 300 })],
  props: [['target', 't1', -120, 60], ['target', 't2', 60, 120], ['target', 't3', -40, 200], ['target', 't4', 160, 400], ['target', 't5', -220, 600]],
  beats: [{ at: 0, run: sim => { WP.Dev.range.next(sim); } }], quotas: {}, boss: null,
  step(sim, dt) {
    const R = WP.Dev.range;
    R.thrT = (R.thrT || 4) - dt;
    if (R.thrT <= 0) { R.thrT = 6; const g = sim.spawn('grenadier', { lx: 150, dz: 140, beh: 'stand', cycles: 1 }); if (g) g.noQuota = true; }
    R.civT = (R.civT || 3) - dt;
    if (R.civT <= 0) { R.civT = 9; sim.spawn('villager', { side: 'L', dz: 110 }); }
    if (!sim.ents.some(e => e.type === 'dummy' && !e.dead)) R.next(sim);
  }
});
D.range.next = sim => {
  const R = D.range, dz = [60, 120, 200, 320, 450, 600][Math.floor(sim.R.ai() * 6)], lx = (sim.R.ai() - .5) * sim.view.halfWidth(dz) * 1.4;
  if (R.t0) R.times.push(sim.t - R.t0); if (R.times.length > 10) R.times.shift();
  const e = sim.spawn('dummy', { lx, dz, beh: sim.R.ai() < .4 ? 'sway' : 'stand', cycles: 99 }); if (e) { e.noQuota = true; e.offOK = true; }
  R.t0 = sim.t;
};
WP.TYPES.dummy.fire = null;
})();
