// The shell: theme, 10-foot CSS, the game's settings (group Game), help, pause items, and the dev mode (section 11):
// live balance sliders (group Dev, hidden from Settings) with a reset, cheats, view toggles, jumps, spawns, flow and
// designer tools.
(() => {
const E = My3D2dge, WP = globalThis.WP, T = WP.T;
const Dev = WP.Dev = { toast: null, toastT: 0 };
WP.THEME = { ink: '#f2ead3', paper: 'rgba(18,22,14,.92)', accent: '#e0b040', danger: '#e05a3a', line: 'rgba(224,176,64,.35)', titleFont: "Impact, 'Arial Black', sans-serif" };
WP.CSS = '.esh{font-size:20px}.esh h2{font-size:34px;letter-spacing:2px}.esh button{font-size:18px;padding:14px 18px}.esh input[type=range]{width:260px}.esh .esh-sec{font-size:16px;margin-top:14px}' +
  'body{background:#1a1e12 radial-gradient(circle at 50% 50%,#2a3020 0,#12160c 70%)}';
WP.setupShell = game => {
  const S = game.settings;
  // the game's own settings (group Game)
  S.define({ key: 'difficulty', label: 'Difficulty', type: 'select', value: 'veteran', options: [['recruit', 'Recruit'], ['veteran', 'Veteran'], ['arcade', 'Arcade']], group: 'Game', help: 'Recruit: easier shots and resupply. Arcade: the original\'s rules.' });
  S.define({ key: 'assist', label: 'Aim assist', type: 'select', value: 'medium', options: [['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], group: 'Game', help: 'For sticks and keys; never the mouse' });
  S.define({ key: 'aimSpeed', label: 'Crosshair speed', type: 'slider', value: 1, min: .5, max: 2, step: .05, group: 'Game' });
  S.define({ key: 'xsize', label: 'Crosshair size', type: 'select', value: 'l', options: [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']], group: 'Game' });
  S.define({ key: 'symbols', label: 'Button symbols', type: 'select', value: S.glyphs === 'xbox' ? 'xbox' : 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], group: 'Game', apply: (g, v) => { if (g.settings.glyphs !== v) g.settings.set('glyphs', v); for (const p of g.players || []) p.glyphs = v; } });
  S.define({ key: 'showGun', label: 'Show gun', type: 'toggle', value: true, group: 'Game' });
  S.define({ key: 'markers', label: 'Friendly markers', type: 'toggle', value: true, group: 'Game' });
  // the dev sliders (group Dev): each writes WP.T at once
  for (const [k, label, def, min, max, step] of WP.TUNING_SPEC) S.define({ key: 'dev_' + k, label, type: 'slider', value: def, min, max, step, group: 'Dev', apply: (g, v) => { T[k] = v; } });
  const cheat = (k, label) => S.define({ key: 'cheat_' + k, label, type: 'toggle', value: false, group: 'Dev', apply: (g, v) => { WP.CHEATS[k] = !!v; } });
  cheat('god', 'God mode'); cheat('ammo', 'Infinite ammo'); cheat('grenades', 'Infinite grenades'); cheat('oneHit', 'One-hit kills'); cheat('holdFire', 'Enemies hold fire'); cheat('autopilot', 'Bot autopilot (P1)');
  cheat('hitShapes', 'Show hit shapes'); cheat('paths', 'Show spawn markers'); cheat('perf', 'Perf overlay');
  S.define({ key: 'dev_slow', label: 'Slow motion', type: 'select', value: 1, options: [[1, '1x'], [.5, '0.5x'], [.25, '0.25x'], [.1, '0.1x']], group: 'Dev', apply: (g, v) => { if (g.settings.dev_timeScale !== v) g.settings.set('dev_timeScale', v); } });
  S.define({ key: 'dev_op', label: 'Jump: operation', type: 'select', value: 1, options: [1, 2, 3, 4, 5, 6].map(n => [n, 'OP ' + n + ' ' + WP.TEXT.ops[n - 1][0]]), group: 'Dev' });
  S.define({ key: 'dev_beat', label: 'Jump: beat', type: 'select', value: 'b1', options: Dev.beatOptions(), group: 'Dev' });
  S.define({ key: 'dev_type', label: 'Spawn: type', type: 'select', value: 'rifleman', options: Object.keys(WP.TYPES).filter(k => !['pgrenade', 'cell', 'cargoPlane', 'jeep2'].includes(k) && !WP.TYPES[k].kind.startsWith('boss') && WP.TYPES[k].kind !== 'prop').map(k => [k, k.toUpperCase()]), group: 'Dev' });
  S.define({ key: 'dev_hostages', label: 'Set hostages', type: 'select', value: 5, options: [0, 1, 2, 3, 4, 5].map(n => [n, String(n)]), group: 'Dev', apply: (g, v) => { WP.run.hostagesFreed = v; const s = WP.Play.sim; if (s && s.stage.hostages) s.host.n = v; } });
  S.define({ key: 'dev_ending', label: 'Play ending', type: 'select', value: 5, options: [0, 1, 2, 3, 4, 5].map(n => [n, n + ' hostages']), group: 'Dev' });
  S.define({ key: 'dev_cut', label: 'Play cutscene', type: 'select', value: 'briefing', options: [['briefing', 'Briefing'], ['interrogation', 'Interrogation'], ['aftermath', 'Kennel aftermath'], ['credits', 'Credits']], group: 'Dev' });
  E.Shell.hiddenGroups = ['Dev'];
  if (typeof document !== 'undefined' && !document.getElementById('wp-css')) { const st = document.createElement('style'); st.id = 'wp-css'; st.textContent = WP.CSS; document.head.appendChild(st); }
  new E.Shell(game, { theme: WP.THEME, screens: { help: {
    keys: () => { const I = game.input; return [['MOUSE / L-STICK / WASD', 'Aim'], [I.label('fire', 'mouse') + ' / ' + I.label('fire', 'gamepad') + ' / ' + I.label('fire', 'keyboard'), 'Fire (hold)'], [I.label('grenade', 'mouse') + ' / ' + I.label('grenade', 'gamepad') + ' / G', 'Grenade'], [I.label('reload', 'keyboard') + ' / ' + I.label('reload', 'gamepad'), 'Reload'], [I.label('snap', 'keyboard') + ' / ' + I.label('snap', 'gamepad'), 'Snap to threat'], ['ESC / OPTIONS', 'Pause']]; },
    sections: [['HOW TO PLAY', WP.TEXT.help.join(' ')], ['CO-OP', 'Press Options on another controller to join as WOLF 2 to 4.']] } } });
};
Dev.beatOptions = () => { const out = []; for (let i = 1; i <= 16; i++) out.push(['b' + i, 'BEAT ' + i]); out.push(['boss', 'BOSS'], ['B', 'OP 6 PART B']); return out; };
Dev.keys = () => WP.TUNING_SPEC.map(s => 'dev_' + s[0]);
Dev.changed = () => WP.TUNING_SPEC.filter(([k, , d]) => Math.abs(T[k] - d) > 1e-9).map(s => s[0]);
Dev.say = (s) => { Dev.toast = s; Dev.toastT = 3; if (WP.game && WP.game.shell && WP.game.shell.toast) WP.game.shell.toast('DEV', s, 3); };
// the dev screen (an E.Shell screen with rows: pad, keys and mouse all work)
Dev.open = () => {
  const g = WP.game; if (!g.shell || !g.shell.show) return false;
  const sim = () => WP.Play.sim, p1 = () => sim() && sim().players[0];
  const act = (label, fn) => [label, () => { fn(); g.shell.show('dev', {}); }];
  g.shell.show('dev', { kicker: 'OPERATION BIG BAD WOLF', title: 'DEV MODE', text: () => 'Changed: ' + (Dev.changed().join(', ') || 'none') + (sim() ? ' | OP ' + sim().opn + ' d ' + Math.round(sim().d) + ' t ' + sim().t.toFixed(1) + ' seed ' + sim().seed : ''),
    rows: [['BALANCE', Dev.keys()], ['CHEATS', ['cheat_god', 'cheat_ammo', 'cheat_grenades', 'cheat_oneHit', 'cheat_holdFire', 'cheat_autopilot']], ['VIEW', ['cheat_hitShapes', 'cheat_paths', 'cheat_perf', 'dev_slow']], ['JUMP / SPAWN / FLOW', ['dev_op', 'dev_beat', 'dev_type', 'dev_hostages', 'dev_ending', 'dev_cut']]],
    actions: () => [
      ['Reset to defaults', () => { g.settings.reset('Dev'); g.shell.show('dev', {}); Dev.say('Sliders and cheats reset'); }],
      ['Jump: go', () => { g.shell.hide(); Dev.jump(g.settings.dev_op, g.settings.dev_beat); }],
      ['Range (target practice)', () => { g.shell.hide(); g.go('play', { range: true }); }],
      act('Spawn at crosshair', () => Dev.spawn(g.settings.dev_type)),
      act('Step one frame', () => Dev.stepFrame()),
      act('Fill quotas', () => { const s = sim(); if (s) for (const k in s.q) s.q[k] = 0; }),
      act('Trigger boss', () => { const s = sim(); if (s && !s.bossSpawned) { for (const k in s.q) s.q[k] = 0; if (s.stage.partB && s.part === 'A') s.startPartB(); else { for (const h of s.holds) if (h.until !== 'boss') h.state = 'done'; s.d = s.rail.end; s.startBoss(); } } }),
      act('Kill all', () => { const s = sim(); if (s) for (const e of s.ents) if (!e.dead && (e.kind === 'infantry' || e.kind === 'vehicle')) s.kill(e, s.players[0], 'body'); }),
      act('Damage self 25', () => { const s = sim(); if (s) { s.players[0].damage = Math.min(99, s.players[0].damage + 25); } }),
      act('Heal', () => { const p = p1(); if (p) { p.damage = 0; p.down = false; } }),
      act('Give 3 mags', () => { const p = p1(); if (p) p.spares.push(T.magSize, T.magSize, T.magSize); }),
      act('Give 3 grenades', () => { const p = p1(); if (p) p.grenades = Math.min(9, p.grenades + 3); }),
      act('Give FURY', () => { const p = p1(); if (p) p.fury = T.furySeconds; }),
      act('Give DYNAMITE', () => { const s = sim(); if (s) WP.dynamite(s, s.players[0]); }),
      ['Play ending', () => { g.shell.hide(); g.go('ending', { n: g.settings.dev_ending }); }],
      ['Play cutscene', () => { g.shell.hide(); g.go(g.settings.dev_cut === 'credits' ? 'credits' : 'cutscene', { id: g.settings.dev_cut, next: 'title' }); }],
      act('Copy spawn line', () => Dev.copyLine('spawn')),
      act('Copy prop line', () => Dev.copyLine('prop')),
      act('Reset save', () => { for (const k of ['wp:tips', 'wp:cleared', 'arcade:wolfpack:campaign']) E.store.set(k, null); Dev.say('Save reset: high scores, unlocks, tips'); }),
      ['Back', () => g.shell.back()]
    ] });
  return true;
};
Dev.jump = (op, beat) => { WP.game.go('play', { op: +op, jump: beat, dev: true }); };
Dev.spawn = type => {
  const s = WP.Play.sim; if (!s) return; const p = s.players[0], f = s.view.toFloor(p.x, p.y);
  if (!f) { Dev.say('Aim at the ground to spawn'); return; }
  const [lx, dz] = s.w2c(f[0], f[1]), Ty = WP.TYPES[type];
  const o = { lx, dz }; if (Ty.kind === 'vehicle') o.side = lx < 0 ? 'L' : 'R'; if (type === 'vulture') { o.anchor = 'cam'; o.z = 70; }
  if (Ty.kind === 'projectile') { s.launch(type, { x: f[0], y: f[1], z: 20, T: { h: 20 } }); return; }
  if (Ty.kind === 'pickup') { s.drop('fury', f[0], f[1], 20); return; }
  s.spawn(type, o); Dev.say('Spawned ' + type + ' at lx ' + Math.round(lx) + ' dz ' + Math.round(dz));
};
Dev.copyLine = kind => {
  const s = WP.Play.sim; if (!s) return; const p = s.players[0], f = s.view.toFloor(p.x, p.y); if (!f) { Dev.say('Aim at the ground'); return; }
  const [lx, dz] = s.w2c(f[0], f[1]);
  const line = kind === 'spawn' ? "['" + WP.game.settings.dev_type + "', { lx: " + Math.round(lx) + ', dz: ' + Math.round(dz) + ' }]' : "['crate', 'c?', " + Math.round(f[0] - s.stage.ox) + ', ' + Math.round(f[1] - s.stage.oy) + ']';
  console.log(line); Dev.say(line); try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(line); } catch (e) { /* the clipboard is optional */ }
};
Dev.stepFrame = () => { const sc = WP.Play.scene; if (sc && WP.Play.sim) { sc.update(1 / 120, true); } };
// the hit-shape and spawn-marker overlays
Dev.drawOverlay = (g, world) => {
  const px = E.px;
  if (WP.CHEATS.hitShapes) for (const s of world.allShapes()) { const c = s.cover ? '#40a0ff' : s.e.kind === 'civilian' || s.e.kind === 'hostage' ? '#40ff60' : s.part === 'head' ? '#ff40ff' : '#ffff40'; if (s.c) { for (let a = 0; a < 16; a++) { const t = a / 16 * 6.283; px.rect(g, Math.round(s.c[0] + Math.cos(t) * s.c[2]), Math.round(s.c[1] + Math.sin(t) * s.c[2]), 1, 1, c); } } else { const r = s.r; px.rect(g, r[0], r[1], r[2] - r[0], 1, c); px.rect(g, r[0], r[3], r[2] - r[0], 1, c); px.rect(g, r[0], r[1], 1, r[3] - r[1], c); px.rect(g, r[2], r[1], 1, r[3] - r[1], c); } }
  if (WP.CHEATS.paths) { for (const b of world.beats || []) { if (b.fired || b.at === undefined) continue; const lx = WP.worldToCam(world.cam, world.stage.ox + b.at, world.stage.oy)[0]; const p = world.view.project(world.stage.ox + b.at, world.stage.oy - 150, 0); if (p) { px.rect(g, p[0], p[1] - 20, 1, 20, '#ff60ff'); WP.UI.txt(g, b.id, p[0] + 2, p[1] - 20, '#ff60ff', { font: 'tiny' }); } } }
  if (WP.CHEATS.perf) { const s = world; WP.UI.txt(g, 'ents ' + s.ents.length + ' fx ' + WP.Render.fx.length + ' d ' + Math.round(s.d) + ' beat ' + ((s.beats || []).filter(b => b.fired).length) + ' seed ' + s.seed + ' ms ' + (WP.game.frameMs ? WP.game.frameMs.toFixed(1) : '-'), 4, 26, '#80ff80', { font: 'tiny' }); }
};
})();
