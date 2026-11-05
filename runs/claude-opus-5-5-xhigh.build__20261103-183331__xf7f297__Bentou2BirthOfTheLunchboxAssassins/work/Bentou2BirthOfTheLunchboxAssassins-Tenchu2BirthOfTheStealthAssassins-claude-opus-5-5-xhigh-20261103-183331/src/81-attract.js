/* ---- ATTRACT MODE: after 10 s without input on the title, a loop of vignettes the autopilot plays with cheats
 * (invulnerable, endless tools). Each loads its level, keeps only the actors it lists, runs its beats and stops at its cap.
 * Any key, button, stick, mouse move, wheel, click or touch returns to the title ---- */
const Attract = { i: 0, loops: 0, visits: {}, log: [] };
const V = (o) => Object.assign({ cap: 24, keep: [], char: 'sojiro', extra: [] }, o);
Attract.VIGNETTES = [
  V({ id: 'rooftops', title: 'Rooftops', level: 'm1', keep: [], extra: [{ id: 'v1g', type: 'ashigaru', at: [16, 23], facing: 90, mode: 'post' }], char: 'kaede',
    beats: [{ at: [3, 19, 40], facing: 0 }, { wait: .6 }, { goto: [11, 19], gait: 'sprint', max: 5 }, { wait: .3 }, { grapple: [14, 19, 64], max: 4 }, { wait: .4 }, { goto: [16, 20], gait: 'crouch', max: 4 }, { wait: .6 },
      { cut: 'v1g', from: 'above', spot: [16, 21], max: 6 }, { wait: 2.5 }] }),
  V({ id: 'silentcut', title: 'Silent Cut', level: 'm1', keep: ['south1', 'south2'], char: 'sojiro',
    beats: [{ fn: M => { const g = Mission.find(M, 'south1'); g.x = cellC(13); g.y = cellC(35); g.mode = 'post'; g.route = null; g.home = { x: g.x, y: g.y, z: 0, facing: 0 }; g.facing = 0; } }, { at: [8, 35], facing: 0, crouch: true }, { wait: 1.4, gait: 'crouch', focus: true }, { cut: 'south1', gait: 'crouch', max: 10 }, { wait: 2.5 }] }),
  V({ id: 'rice', title: 'Rice for the Hungry', level: 'm1', keep: ['garden'], char: 'kaede',
    beats: [{ fn: M => { const g = Mission.find(M, 'garden'); g.x = cellC(30); g.y = cellC(13); g.ri = 1; } }, { at: [39, 15], facing: 180, crouch: true }, { wait: .5, gait: 'crouch' }, { use: 'poisonball', aim: [35, 13] }, { wait: 1, gait: 'crouch' },
      { until: M => { const g = Mission.find(M, 'garden'); return !g.alive; }, max: 16 }, { wait: 1 }, { fn: (M, h) => { const g = Mission.find(M, 'garden'); h.x = g.x + 10; h.y = g.y; } }, { press: 'interactPressed' }, { goto: [31, 13], gait: 'walk', max: 9 }, { press: 'interactPressed' }, { wait: 2 }] }),
  V({ id: 'moat', title: 'The Moat', level: 'm2', keep: ['archerSW'], extra: [{ id: 'v4g', type: 'ashigaru', at: [24, 30], facing: 270, mode: 'post', lantern: true }], char: 'sojiro',
    beats: [{ at: [22, 22], facing: 90 }, { wait: .4 }, { press: 'crouchPressed' }, { goto: [24, 28], gait: 'walk', max: 8 }, { cut: 'v4g', from: 'water', water: [24, 29], max: 6 }, { wait: 3 }] }),
  V({ id: 'smoke', title: 'Smoke and Steel', level: 'm2', keep: ['northpat', 'loopsam', 'bellash'], char: 'kaede', cheats: { god: true, infinite: true },
    beats: [{ fn: M => { for (const id of ['northpat', 'loopsam']) { const g = Mission.find(M, id); g.x = cellC(44 + (id === 'loopsam' ? 3 : -3)); g.y = cellC(19); } const b = Mission.find(M, 'bellash'); b.x = cellC(47); b.y = cellC(24); } }, { at: [44, 22], facing: 270 }, { wait: 2.6 },
      { use: 'smoke', feet: true }, { goto: [40, 26], gait: 'run', max: 3 }, { wait: 1.5 }, { fight: 9 }, { wait: 1 }] }),
  V({ id: 'oni', title: 'Oni on the Roof', level: 'm3', keep: [], boss: true, char: 'sojiro', cap: 28,
    beats: [{ at: [18, 17, 160], facing: 0 }, { fn: M => { const b = M.bosses[0]; Bosses.start(b, M); b.hp = Math.round(b.maxHp * .52); } }, { wait: 2.4 }, { fight: 8 }, { fn: M => { const b = M.bosses[0]; b.hp = Math.min(b.hp, 40); } }, { fight: 6, until2: M => M.bosses[0].defeated }, { wait: 3 }] }),
  V({ id: 'report', title: 'Report', report: true, cap: 9 })
];
const attractScene = Object.assign({}, B.missionScene, {
  pausable: false, isMission: true,
  enter(d) {
    const i = (d && d.i) || 0; Attract.i = i % Attract.VIGNETTES.length; if (Attract.i === 0 && d && d.i) Attract.loops++;
    const v = Attract.VIGNETTES[Attract.i]; Attract.v = v; Attract.t = 0; Attract.visits[v.id] = (Attract.visits[v.id] || 0) + 1; this.since = game.real + .2; B.noteInput(); B.lastInput = game.real;
    if (v.report) { this.report = true; B.Music.play('results'); game.setView('side'); Lt.enabled = false; game.weather = null; this.rig = Rigs.make(v.char); return; }
    this.report = false;
    const M = Mission.create(v.level, { mode: 'attract', char: v.char, missionId: v.level, cheats: Object.assign({ god: true, infinite: true }, v.cheats || {}) });
    M.guards = M.guards.filter(g => v.keep.includes(g.id)); M.civs = []; M.triggers = []; M.objectives = []; M.timer = null; M.escort = null; M.npcs = [];
    if (!v.boss) M.bosses = [];
    for (const s of v.extra) M.guards.push(Enemies.spawn(s, M, M.level.faction));
    M.hero.bento = TOOL_ORDER.slice(0, 8).map(t => ({ tool: t, n: B.get('tool', t).stack }));
    Autopilot.load(v.beats, v.id);
    MS.enter({ M });
  },
  update(dt) {
    B.pollInput(); Attract.t += dt;
    if (B.lastInput > this.since || game.input.anyPressed()) { game.go('title', { menu: true }, { fade: 'dissolve' }); return; }
    const v = Attract.v;
    if (this.report) { this.rig._post = Rigs.bow(clamp((Attract.t - 2) * 2, 0, 1)); this.rig.update(dt, { x: -150, y: 0, z: 0, facing: Math.PI / 2 }); game.focus(-100, 0, 30 + (game.H / 2 - 52) / -game.view.bz); if (Attract.t > v.cap) game.go('attract', { i: Attract.i + 1 }, { fade: 'dissolve' }); return; }
    const M = B.M; if (!M) return;
    MS.step(dt, M);
    if ((Autopilot.done() && Attract.t > 3) || Attract.t > v.cap) { Attract.log.push(...Autopilot.log.splice(0)); game.go('attract', { i: Attract.i + 1 }, { fade: 'dissolve' }); }
  },
  draw(r) {
    if (this.report) Attract.drawReport(r, this.rig); else if (B.M) MS.draw(r, B.M);
    r.overlay(g => {
      E.font.title(g, 'BENTOU 2', 6, 6, { scale: 1, colors: ['#fff4c8', '#e8b04a', '#d8402a'], depth: 1 });
      E.font.text(g, 'DEMO PLAY', r.W - 8, 8, '#f4ead5', { align: 'right', shadow: '#000', outline: false });
      if (!this.report && Attract.v) E.font.text(g, Attract.v.title, r.W - 8, 18, '#e8b04a', { align: 'right', shadow: '#000', outline: false });
      if (Math.floor(game.real * 1.6) % 2 === 0) Glyph.text(g, B.touchOnly() ? 'TAP TO RETURN' : 'PRESS ANY BUTTON', r.W / 2, r.H - 16, '#f4ead5', { align: 'center' });
    });
  },
  exit() { B.missionScene.exit(); }
});
Attract.drawReport = (r, rig) => {
  const t = Attract.t, W = r.W, H = r.H;
  r.overlay(g => { px.rect(g, 0, 0, W, H, '#140c0c'); });
  if (t < 5.5) {
    r.overlay(g => {
      const sw = Math.min(240, W - 120), sx = Math.round((W - sw) / 2) + 30, sh = Math.round((H - 50) * clamp(t / .8, 0, 1));
      px.rect(g, sx, 16, sw, sh, '#e8dcc0'); px.rect(g, sx - 6, 12, sw + 12, 6, '#5a3a20');
      const L = [['Time', '6:41'], ['Silent Cuts', 9], ['Kills', 0], ['Times detected', 0], ['Civilians harmed', 0], ['Optional tasks', 1]];
      L.forEach((l, i) => { if (t > .8 + i * .25) { E.font.text(g, l[0], sx + 12, 30 + i * 13, '#3a2a20', { outline: false }); E.font.text(g, String(l[1]), sx + sw - 60, 30 + i * 13, '#1a1418', { align: 'right', outline: false }); } });
      if (t > 2.8) { Art.hanko(g, sx + sw - 30, 50, Math.round(lerp(40, 22, clamp((t - 2.8) * 6, 0, 1))), 'GK', 1); E.font.text(g, '"Not one grain out of place."', sx + sw / 2, 30 + 7 * 13, '#3a2a20', { align: 'center', outline: false }); }
    });
    if (t > 2.8 && !Attract.stamped) { Attract.stamped = true; Au.sfx('stamp'); }
    r.actor(-150, 0, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
  } else {
    Attract.stamped = false;
    TITLE_BG.draw(r);
    r.overlay(g => { E.font.title(g, 'BENTOU 2', W / 2, Math.round(H * .3), { align: 'center', scale: 4, colors: ['#fff4c8', '#ffd36a', '#e8b04a', '#d8402a'], depth: 3 }); E.font.text(g, 'Seen by none. Fed by all.', W / 2, Math.round(H * .3) + 40, '#f4ead5', { align: 'center', shadow: '#000', outline: false }); });
  }
};
B.Attract = Attract; B.attractScene = attractScene;
