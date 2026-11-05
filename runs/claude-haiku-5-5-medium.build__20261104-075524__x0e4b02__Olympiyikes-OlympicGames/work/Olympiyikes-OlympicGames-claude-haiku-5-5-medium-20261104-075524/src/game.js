// OLYMPIYIKES! — the game: a vertical slice on my-3D2dge. Three events (100m Dash, Ski Jump, Archery), Quick Games
// (the three in a row, with a medal table), Single Event, Records, How to Play, About & Credits, attract mode after
// 10 s idle on the title and menus, and a dev mode (pause menu) with live balance sliders and a reset to defaults.
(() => {
'use strict';
const E = My3D2dge, { clamp } = E;
const M = 12;                       // world units per metre (the engine's tile is 16)
const TITLE = 'OLYMPIYIKES!';
const IDLE_TO_ATTRACT = 10;         // seconds without input on the title or a menu
const INTRO = 2.4, COUNT = 3, DONE_WAIT = .9;

/* ---- controls: one preset for the whole game (PlayStation names; the controls screen can show Xbox glyphs) ---- */
const OLY_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'],
  left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  confirm: ['Enter', 'Pad0'],                   // ✕ / A
  cancel: ['Backspace', 'KeyB'],
  action: ['Space', 'KeyF', 'Pad0', 'Mouse0'],  // take off, release
  mashL: ['KeyJ', 'Pad2'],                      // □ / X
  mashR: ['KeyK', 'Pad1'],                      // ○ / B
  turbo: ['KeyL', 'Pad3'],                      // △ / Y
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
};

/* ---- the balance tunables: defaults, and the sliders' ranges [min, max, step, label] ---- */
const TUNE_DEFAULTS = { sprintGain: 1, turboMult: 1.3, hypeGain: 1, cpuSkill: 1, jumpLift: 1, windStrength: 1, balanceWind: 1, swayAmount: 1 };
const TUNE_RANGE = {
  sprintGain: [.5, 1.6, .05, 'Dash speed from mashing'], turboMult: [1, 2, .05, 'Yikes Turbo speed'],
  hypeGain: [0, 3, .1, 'HYPE per clean beat'], cpuSkill: [.5, 1.5, .05, 'Rival strength'],
  jumpLift: [.5, 1.6, .05, 'Ski jump lift'], windStrength: [0, 2, .1, 'Wind (ski jump, archery)'],
  balanceWind: [0, 2, .1, 'Balance gusts (ski jump)'], swayAmount: [0, 2, .1, 'Archery sway'],
};
const TUNE = Object.assign({}, TUNE_DEFAULTS, E.store.get('oly:tune', {}));
const saveTune = () => E.store.set('oly:tune', TUNE);
const cheat = { infinite: false };    // dev: infinite HYPE and perfect timing (the attract mode's pilot uses this)

/* ---- seeded randomness: the same seed gives the same rivals and wind ---- */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashStr = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/* ---- nations: the player's is fixed in this slice; the rest are rivals ---- */
const NATIONS = [
  { id: 'SUN', name: 'SUNVALE', col: '#f2b632', dark: '#8a5a12' },
  { id: 'TUR', name: 'TURBONIA', col: '#d7263d', dark: '#6a1220' },
  { id: 'FRM', name: 'FRIMLAND', col: '#3a86ff', dark: '#1d3f80' },
  { id: 'OAK', name: 'OAKVIK', col: '#2a9d8f', dark: '#155149' },
  { id: 'PAP', name: 'PAPAYA BAY', col: '#ff7f50', dark: '#8a3e20' },
  { id: 'NIM', name: 'NIMBUS', col: '#9b5de5', dark: '#4d2d74' },
  { id: 'KRO', name: 'KROMAWA', col: '#8ac926', dark: '#476314' },
  { id: 'MIS', name: 'MISTRAL', col: '#c9c9d6', dark: '#606070' },
];
const PLAYER = NATIONS[0];

/* ---- events: the card text, the rule and the best-score direction ---- */
const EVENTS = {
  sprint: { name: '100m DASH', venue: 'GLORY STADIUM', view: 'brawler', best: 'min',
    about: 'Mash LEFT and RIGHT in turn. Every clean beat fills HYPE; a full meter gives a Yikes Turbo.',
    rule: 'Lowest time wins' },
  skijump: { name: 'SKI JUMP', venue: 'MOUNT GLORY', view: 'side', best: 'max',
    about: 'Mash down the inrun. Stop the sweep in the middle for a clean take-off, then hold LEFT or RIGHT to balance.',
    rule: 'Furthest jump, plus style' },
  archery: { name: 'ARCHERY', venue: 'BULLSEYE LAWN', view: 'overhead', best: 'max',
    about: 'Three arrows. The sway moves the aim; press ACTION to release on the gold. The D-pad nudges it a little.',
    rule: 'Highest total of three arrows' },
};
const ORDER = ['sprint', 'skijump', 'archery'];

/* ---- the game object: the engine's pause menu, with Dev mode added ---- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, bg: '#0b0f24', input: OLY_KEYS, id: 'olympiyikes',
  menu: {
    items: [['Dev mode', () => openDev()]],
    quit: 'title',
    controls: { mashL: 'Mash left', mashR: 'Mash right', action: 'Action: take off, release',
      turbo: 'Yikes Turbo', confirm: 'Choose', cancel: 'Back' },
  },
});
const A = game.audio;
let cur = { name: 'title', data: null };          // the scene on screen, for the dev mode's way back
const go = (name, data, opts) => { cur = { name, data }; game.go(name, data, opts); };
const record = id => E.store.get('oly:best:' + id, null);

/* ---- the meet: Quick Games (the three events in a row) and its medal table ---- */
let meet = null;                                   // { quick, list, i, results: { id: result }, seed }
let attractIdx = 0;

/* ---- drawing helpers ---- */
function panel(r, x, y, w, h) { r.overlay(g => E.ui.box(g, x, y, w, h, { bg: ['#1d2650', '#0e1430'], border: '#f2b632' })); }
function centreText(r, s, y, col = '#f7f2e0', scale = 1) { r.text(s, r.W / 2, y, col, { align: 'center', scale, outline: '#1a0c10' }); }
const btn = (a, word) => game.input.label(a) + ' ' + word;
function para(r, s, y, col = '#f7f2e0') {
  const lines = E.font.wrap(s, r.W * .7, {});
  lines.forEach((l, i) => r.text(l, r.W / 2, y + i * 12, col, { align: 'center', outline: '#1a0c10' }));
}
function speak(r, s) { r.text(s, r.W / 2, r.H - 26, '#fff6c8', { align: 'center', outline: '#1a0c10' }); }
const cue = (s) => s > 0 ? String(s) : 'GO';

/* ---- the commit: a finished event becomes a result, a record, and the next step of the meet ---- */
function commitResult(id, result, attract) {
  if (attract) return attractNext();
  const best = record(id);
  const better = !best || (EVENTS[id].best === 'min' ? result.value < best.value : result.value > best.value);
  result.newBest = better;
  if (better) E.store.set('oly:best:' + id, { value: result.value, label: result.label });
  if (meet && meet.quick) {
    meet.results[id] = result;
    meet.i++;
    if (meet.i < meet.list.length) return go('ev', { id: meet.list[meet.i], quick: true });
    return go('medals', null);
  }
  return go('results', { id, result });
}

/* ==================== SPRINT: 100 m dash, four lanes, brawler view ==================== */
function makeSprint(d) {
  const rand = rng(hashStr('sprint:' + d.seed));
  const lanes = [40, 64, 88, 112];
  const mkRig = (n, hair) => new E.Humanoid({ size: 1.3, build: 'chibi', hair: 'short', outfit: 'shirt', sleeves: 'short',
    colors: { cloth: n.col, coat: n.col, trim: n.dark, skin: '#e0b48a', hair, pants: '#24263a', boot: '#1d1b26' } });
  const player = { n: PLAYER, lane: lanes[0], v: 0, dist: 0, finishT: null, rig: mkRig(PLAYER, '#2a1f14') };
  const cpu = NATIONS.slice(1, 4).map((n, i) => ({ n, lane: lanes[i + 1], v: 0, dist: 0, finishT: null,
    ph: rand() * 6.28, base: 9.3 + rand() * .3 - .15, rig: mkRig(n, ['#101010', '#8a5a2e', '#e8c07a'][i]) }));
  const ev = { t: 0, phase: 'intro', doneT: 0, hits: [], lastKey: null, hype: 0, turbo: 0, stumble: 0, raceT: 0, falseStart: false, autoT: 0, autoK: 'R' };
  const rate = () => ev.hits.filter(h => ev.raceT - h < 1).length;
  function mash(k) {
    if (ev.phase === 'count') { ev.falseStart = true; return; }
    if (ev.phase !== 'race' || player.finishT !== null || ev.stumble > 0) return;
    if (k === ev.lastKey) { ev.stumble = .6; ev.hits.length = 0; ev.hype = Math.max(0, ev.hype - .2); A.sfx('hurt', { vol: .4 }); }
    else { ev.hits.push(ev.raceT); ev.hype = clamp(ev.hype + .07 * TUNE.hypeGain, 0, 1); }
    ev.lastKey = k;
  }
  function turboPress() { if ((ev.hype >= 1 || cheat.infinite) && ev.turbo <= 0) { ev.turbo = 2; ev.hype = 0; A.sfx('powerup'); } }
  function raceStep(dt) {
    ev.raceT += dt; ev.stumble = Math.max(0, ev.stumble - dt); ev.turbo = Math.max(0, ev.turbo - dt);
    ev.hype = cheat.infinite ? 1 : clamp(ev.hype - .03 * dt, 0, 1);
    const pTarget = clamp(5.6 + .55 * rate(), 0, 11.2) * TUNE.sprintGain * (ev.turbo > 0 ? TUNE.turboMult : 1) * (ev.stumble > 0 ? .4 : 1);
    player.v += clamp(pTarget - player.v, -3 * dt, 3 * dt);
    player.dist += player.v * dt;
    if (player.dist >= 100 && player.finishT === null) player.finishT = ev.raceT - (player.dist - 100) / Math.max(1, player.v);
    for (const c of cpu) {
      const target = (c.base + .35 * Math.sin(ev.raceT * 1.3 + c.ph)) * TUNE.cpuSkill;
      c.v += clamp(target - c.v, -3 * dt, 3 * dt);
      c.dist += c.v * dt;
      if (c.dist >= 100 && c.finishT === null) c.finishT = ev.raceT - (c.dist - 100) / Math.max(1, c.v);
    }
  }
  const all = () => [player, ...cpu];
  return {
    id: 'sprint', ev, attract: !!d.attract,
    update(dt, p) {
      ev.t += dt;
      if (ev.phase === 'intro' && ev.t > INTRO) { ev.phase = 'count'; ev.t = 0; }
      else if (ev.phase === 'count') {
        if (!d.attract && (p.pressed('mashL') || p.pressed('mashR'))) mash('?');
        if (ev.t > COUNT) { ev.phase = 'race'; ev.t = 0; ev.raceT = 0; A.sfx('confirm'); }
        else { const s = Math.ceil(COUNT - ev.t); if (s !== ev.cueNum && s >= 1) { ev.cueNum = s; A.sfx('blip'); } }
      } else if (ev.phase === 'race') {
        if (d.attract) {
          ev.autoT += dt;
          if (ev.autoT > .118) { ev.autoT = 0; ev.autoK = ev.autoK === 'L' ? 'R' : 'L'; mash(ev.autoK); }
          if (ev.hype >= 1 || cheat.infinite) turboPress();
        } else {
          if (p.pressed('mashL')) mash('L');
          if (p.pressed('mashR')) mash('R');
          if (p.pressed('turbo')) turboPress();
        }
        raceStep(dt);
        if (all().every(a => a.finishT !== null)) { ev.phase = 'done'; ev.doneT = 0; }
      } else if (ev.phase === 'done') ev.doneT += dt;
      for (const a of all()) if (a.rig) a.rig.update(dt, { x: a.dist * M, y: a.lane, z: 0, vx: a.v * M, vy: 0, facing: 0, run: clamp(a.v / 10, 0, 1) });
      game.focus(player.dist * M + 80, 52, 8);
    },
    draw(r) { drawSprint(r, player, cpu, ev, d, rate); },
    ready: () => ev.phase === 'done' && ev.doneT > DONE_WAIT,
    result() {
      const field = all().slice().sort((a, b) => (a.finishT ?? 999) - (b.finishT ?? 999));
      const time = (player.finishT ?? 99) + (ev.falseStart ? .7 : 0);
      return { value: time, label: time.toFixed(2) + ' s', rank: field.indexOf(player) + 1,
        rivals: cpu.map(c => ({ n: c.n, value: c.finishT ?? 99, label: (c.finishT ?? 99).toFixed(2) + ' s' })), falseStart: ev.falseStart };
    },
    _pilot: () => null,
  };
}
function drawSprint(r, player, cpu, ev, d, rate) {
  r.sky(['#2a4c8a', '#7aa6d8', '#f7d28a']);
  // the track is painted on the ground: lanes and the finish line (decal: under the athletes)
  r.decal(g => {
    const q = (x0, y0, x1, y1, col) => E.px.poly(g, [r.w(x0, y0, 0), r.w(x1, y0, 0), r.w(x1, y1, 0), r.w(x0, y1, 0)].filter(Boolean), col);
    q(-300, -40, 1600, 200, '#2f6b35');                                 // the infield
    for (let i = 0; i < 4; i++) q(-300, 28 + i * 24, 1600, 52 + i * 24, i % 2 ? '#b8532c' : '#c4642f');
    q(1200, 28, 1204, 124, '#fdfdfd');                                  // the finish line
  });
  for (const a of [player, ...cpu]) if (a.rig) r.actor(a.dist * M, a.lane, 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view));
  r.text(PLAYER.name, 6, 8, '#fff6c8', { outline: '#1a0c10' });
  r.text(`${player.dist.toFixed(1)} m`, 6, 22, '#f7f2e0', { outline: '#1a0c10' });
  r.text('HYPE', r.W - 78, 8, '#f7f2e0', { outline: '#1a0c10' });
  r.overlay(g => {
    E.ui.bar(g, r.W - 78, 20, 70, 8, ev.hype, ev.hype >= 1 ? '#ffd166' : '#f2b632');
    if (ev.turbo > 0) E.ui.bar(g, r.W - 78, 32, 70, 4, ev.turbo / 2, '#ff7f50');
  });
  if (ev.phase === 'intro') { centreText(r, 'SPRINT • 100m DASH', r.H * .3, '#fff6c8', 2); para(r, EVENTS.sprint.about, r.H * .5); }
  if (ev.phase === 'count') centreText(r, cue(Math.ceil(COUNT - ev.t)), r.H * .4, '#fff6c8', 4);
  if (ev.phase === 'race' && ev.raceT < .4) centreText(r, 'GO!', r.H * .4, '#ffd166', 4);
  if (ev.falseStart) speak(r, 'FALSE START! +0.7 s');
  else if (ev.phase === 'race') speak(r, `${game.input.label('mashL')} and ${game.input.label('mashR')}: mash in turn  •  ${btn('turbo', 'turbo')}`);
  if (ev.phase === 'done') speak(r, d.attract ? '' : `${btn('confirm', 'to continue')}`);
}

/* ==================== SKI JUMP: side view, inrun, take-off timing, flight balance ==================== */
const groundZ = x => x < 0 ? 10 + .45 * -x : Math.max(-60, 10 - .0205 * x);   // the inrun, then the landing hill
function makeSkijump(d) {
  const rand = rng(hashStr('skijump:' + d.seed));
  const wind = rand() * 6.28;
  const cpu = NATIONS.slice(1, 4).map(n => ({ n, base: 92 + rand() * 10 }));
  const me = { x: -600, z: groundZ(-600), vx: 0, vz: 0, ph: 'inrun', b: 0, tumble: false, takeoffQ: 0, style: 0,
    distM: 0, slide: 0, telemarkT: -9, hits: [], lastK: null, autoT: 0, autoK: 'R', tail: null, rig: null };
  me.rig = new E.Humanoid({ size: 1.3, build: 'chibi', hair: 'short', outfit: 'shirt', sleeves: 'short',
    colors: { cloth: PLAYER.col, coat: PLAYER.col, trim: PLAYER.dark, skin: '#e0b48a', hair: '#2a1f14', pants: '#24263a', boot: '#1d1b26' } });
  const ev = { t: 0, phase: 'intro', runT: 0, doneT: 0, bar: 0, barOn: false };
  const barPos = () => Math.abs(((ev.bar * 1.4) % 2) - 1);      // triangle sweep 0..1..0
  const rate = () => me.hits.filter(h => ev.runT - h < 1).length;
  function mashTo(k) { if (k === me.lastK) { me.hits.length = 0; return; } me.hits.push(ev.runT); me.lastK = k; }
  function takeoff(q) {
    me.ph = 'air'; me.takeoffQ = q;
    me.vz = (60 + 60 * q) * TUNE.jumpLift;
    me.vx = Math.max(me.vx, 1);
    A.sfx('boom', { vol: .4 });
  }
  function landing() {
    me.ph = 'land'; me.distM = Math.max(0, me.x / M);
    const telemark = ev.runT - me.telemarkT < .5;
    me.style = Math.round((1 - Math.min(1, Math.abs(me.b))) * 10) + (telemark ? 6 : 0) + Math.round(me.takeoffQ * 6) + (me.tumble ? 0 : 4);
    if (me.tumble) me.style = Math.max(0, me.style - 8);
    me.telemark = telemark;
  }
  function airStep(dt, p) {
    const w = (Math.sin(ev.runT * 1.9 + wind) * .6 + Math.sin(ev.runT * 3.7 + 1) * .4) * TUNE.windStrength * TUNE.balanceWind * .8;
    if (d.attract) me.b = Math.sin(ev.runT * 2.4) * .12;
    else {
      const k = (p.down('right') ? 1 : 0) - (p.down('left') ? 1 : 0);
      me.b += (w + k * 1.4) * dt - .6 * me.b * dt;
    }
    if (Math.abs(me.b) >= 1 && !me.tumble) { me.tumble = true; A.sfx('hit'); }
    const glide = me.tumble ? 0 : 1 - Math.min(1, Math.abs(me.b));
    me.x += me.vx * M * dt * (me.tumble ? .6 : 1);
    me.vz -= 60 * dt * (1 - .3 * glide);
    me.z += me.vz * dt;
    if (me.vz < 0 && me.z <= groundZ(me.x)) { me.z = groundZ(me.x); landing(); }
  }
  function step(dt, p) {
    ev.runT += dt;
    if (me.ph === 'inrun') {
      if (d.attract) { me.autoT += dt; if (me.autoT > .12) { me.autoT = 0; me.autoK = me.autoK === 'L' ? 'R' : 'L'; mashTo(me.autoK); } }
      else { if (p.pressed('mashL')) mashTo('L'); if (p.pressed('mashR')) mashTo('R'); }
      const target = (14 + .7 * rate()) * TUNE.sprintGain;
      me.vx += clamp(target - me.vx, -4 * dt, 4 * dt);
      me.x += me.vx * M * dt;
      me.z = groundZ(me.x);
      if (me.x > -60) ev.barOn = true;
      if (me.x >= 0) takeoff(0);             // no take-off press in time: a stumble off the lip
    } else if (me.ph === 'air') {
      if (!d.attract && p.pressed('action')) me.telemarkT = ev.runT;
      airStep(dt, p);
    } else if (me.ph === 'land') {
      me.slide += dt;
      me.vx = Math.max(0, me.vx - 8 * dt); me.x += me.vx * M * dt;
      me.z = groundZ(me.x);
      if (me.slide > 1.4) me.ph = 'done';
    }
  }
  return {
    id: 'skijump', ev, attract: !!d.attract,
    update(dt, p) {
      ev.t += dt;
      if (ev.phase === 'intro') { if (ev.t > INTRO) { ev.phase = 'count'; ev.t = 0; } }
      else if (ev.phase === 'count') {
        if (ev.t > COUNT) { ev.phase = 'run'; ev.t = 0; ev.runT = 0; A.sfx('confirm'); }
        else { const s = Math.ceil(COUNT - ev.t); if (s !== ev.cueNum && s >= 1) { ev.cueNum = s; A.sfx('blip'); } }
      } else if (ev.phase === 'run') {
        ev.bar += dt;
        if (me.ph === 'inrun' && ev.barOn) {
          if (d.attract && Math.abs(barPos() - .5) < .08) takeoff(1);
          else if (!d.attract && p.pressed('action')) takeoff(clamp(1 - Math.abs(barPos() - .5) * 2.4, 0, 1));
        }
        if (me.ph !== 'done') step(dt, p);
        if (me.ph === 'done') { ev.phase = 'done'; ev.doneT = 0; }
      } else if (ev.phase === 'done') ev.doneT += dt;
      me.rig.update(dt, { x: me.x, y: 0, z: me.z, vx: me.vx * M, vy: 0, facing: 0, air: me.ph === 'air', run: clamp(me.vx / 25, 0, 1),
        pose: me.ph === 'done' && me.tumble ? 'down' : undefined });
      game.focus(me.x + 120, 0, me.z + 30);
    },
    draw(r) { drawSkijump(r, me, ev, barPos()); },
    ready: () => ev.phase === 'done' && ev.doneT > DONE_WAIT,
    result() {
      const score = Math.round((me.distM + me.style * .4) * 10) / 10;
      const rivals = cpu.map(c => ({ n: c.n, dist: c.base * TUNE.cpuSkill })).sort((a, b) => b.dist - a.dist);
      const rank = rivals.filter(c => c.dist > score).length + 1;
      return { value: score, label: score.toFixed(1) + ' m', rank, rivals: rivals.map(c => ({ n: c.n, value: c.dist, label: c.dist.toFixed(1) + ' m' })), style: me.style, tumble: me.tumble };
    },
  };
}
function drawSkijump(r, me, ev, bp) {
  r.sky(['#1a2a54', '#5d86c4', '#dfe8f5']);
  // the slope: a row of depth-sorted boxes, from the inrun, over the lip, down the landing hill
  for (let x = -700; x < 900; x += 8) {
    const z = groundZ(x + 4);
    r.queue(x + 4, 0, z / 2, g => r.box(g, x, -40, -80, x + 8, 40, z, '#f2f7fc', '#9fb7d2'));
  }
  if (me.rig) r.actor(me.x, 0, me.z, (g, ox, oy) => me.rig.draw(g, ox, oy, r.view));
  r.text(PLAYER.name, 6, 8, '#fff6c8', { outline: '#1a0c10' });
  if (ev.phase === 'intro') { centreText(r, 'SKI JUMP • MOUNT GLORY', r.H * .3, '#fff6c8', 2); para(r, EVENTS.skijump.about, r.H * .45); }
  if (ev.phase === 'count') centreText(r, cue(Math.ceil(COUNT - ev.t)), r.H * .4, '#fff6c8', 4);
  if (ev.phase === 'run' && ev.barOn && me.ph === 'inrun') {
    r.overlay(g => {
      const w = r.W * .5, x0 = r.W * .25, y0 = r.H * .86;
      E.px.rect(g, x0 - 4, y0 - 4, w + 8, 18, '#0e1430');
      E.px.rect(g, x0, y0 + 4, w, 6, '#44506f');
      E.px.rect(g, x0 + w * .35, y0 + 4, w * .3, 6, '#7ee08a');
      E.px.rect(g, x0 + w * bp, y0 - 2, 3, 14, '#fff6c8');
    });
    speak(r, `${btn('action', 'take off')} on the green`);
  }
  if (me.ph === 'air') {
    r.text('BALANCE', 6, 22, '#f7f2e0', { outline: '#1a0c10' });
    r.overlay(g => E.ui.bar(g, 6, 32, 80, 6, .5 + me.b / 2, Math.abs(me.b) > .7 ? '#e63946' : '#7ee08a'));
    speak(r, 'HOLD LEFT OR RIGHT TO BALANCE');
  }
  if (me.ph === 'land' || me.ph === 'done') {
    centreText(r, `${me.distM.toFixed(1)} m`, r.H * .34, '#ffd166', 3);
    if (me.tumble) centreText(r, 'OLYMPIYIKES!', r.H * .44, '#ff7f50', 2);
  }
  if (ev.phase === 'done') speak(r, `${btn('confirm', 'to continue')}`);
}

/* ==================== ARCHERY: overhead, a target and a sway ==================== */
const RING = 6;                                     // virtual pixels per ring (ten rings: 60 px)
function makeArchery(d) {
  const rand = rng(hashStr('archery:' + d.seed));
  const wind = rand() * 6.28;
  const cpu = NATIONS.slice(1, 4).map(n => ({ n, base: 6.5 + rand() * 2 }));
  const ev = { t: 0, aT: 0, phase: 'intro', doneT: 0, shots: [], nudge: [0, 0] };
  const sway = () => {
    const a = 26 * TUNE.swayAmount, w = 14 * TUNE.windStrength;
    return [Math.sin(ev.aT * 1.3) * a + Math.sin(ev.aT * .47 + wind) * w, Math.cos(ev.aT * 1.1) * a * .7 + Math.sin(ev.aT * .63 + wind) * w * .5];
  };
  function release() {
    if (ev.phase !== 'shoot' || ev.shots.length >= 3) return;
    const s = sway();
    const x = s[0] + ev.nudge[0], y = s[1] + ev.nudge[1];
    const dist = Math.hypot(x, y);
    const sc = cheat.infinite ? 10 : clamp(10 - Math.floor(dist / RING), 0, 10);
    ev.shots.push({ x, y, sc, t: 0 });
    A.sfx(sc >= 9 ? 'coin' : 'hit', { vol: .6 });
    if (ev.shots.length >= 3) { ev.phase = 'done'; ev.doneT = 0; }
  }
  return {
    id: 'archery', ev, attract: !!d.attract,
    update(dt, p) {
      ev.t += dt; ev.aT += dt;
      if (ev.phase === 'intro') { if (ev.t > INTRO) { ev.phase = 'count'; ev.t = 0; } }
      else if (ev.phase === 'count') {
        if (ev.t > COUNT) { ev.phase = 'shoot'; ev.t = 0; A.sfx('confirm'); }
        else { const s = Math.ceil(COUNT - ev.t); if (s !== ev.cueNum && s >= 1) { ev.cueNum = s; A.sfx('blip'); } }
      } else if (ev.phase === 'shoot') {
        if (d.attract) { const s = sway(); if (Math.hypot(s[0], s[1]) < 3) release(); }
        else {
          const k = (p.down('right') ? 1 : 0) - (p.down('left') ? 1 : 0);
          const j = (p.down('down') ? 1 : 0) - (p.down('up') ? 1 : 0);
          ev.nudge = [clamp(ev.nudge[0] + k * 60 * dt, -20, 20), clamp(ev.nudge[1] + j * 60 * dt, -20, 20)];
          if (p.pressed('action') || p.pressed('confirm')) release();
        }
      } else if (ev.phase === 'done') ev.doneT += dt;
      for (const s of ev.shots) s.t += dt;
    },
    draw(r) { drawArchery(r, ev, sway()); },
    ready: () => ev.phase === 'done' && ev.doneT > DONE_WAIT,
    result() {
      const total = ev.shots.reduce((a, s) => a + s.sc, 0);
      const rivals = cpu.map(c => ({ n: c.n, score: Math.round(c.base * 3 * TUNE.cpuSkill) }));
      const rank = rivals.filter(c => c.score > total).length + 1;
      return { value: total, label: total + ' / 30', rank, rivals: rivals.map(c => ({ n: c.n, value: c.score, label: c.score + ' / 30' })), arrows: ev.shots.map(s => s.sc) };
    },
  };
}
function drawArchery(r, ev, s) {
  const sc = Math.min(r.W / 320, r.H / 240);
  const cx = r.W * .66, cy = r.H * .5;
  r.overlay(g => {
    E.px.rect(g, 0, 0, r.W, r.H, '#7fb36a');
    for (let score = 1; score <= 10; score++) {
      const col = score >= 9 ? '#ffd166' : score >= 7 ? '#e63946' : score >= 5 ? '#3a86ff' : score >= 3 ? '#222222' : '#f4f4f4';
      E.px.disc(g, cx, cy, RING * (11 - score) * sc, col);
    }
    const ax = cx + (s[0] + ev.nudge[0]) * sc, ay = cy + (s[1] + ev.nudge[1]) * sc;
    E.px.line(g, ax - 6, ay, ax + 6, ay, '#ffffff', 1);
    E.px.line(g, ax, ay - 6, ax, ay + 6, '#ffffff', 1);
    for (const sh of ev.shots) E.px.disc(g, cx + sh.x * sc, cy + sh.y * sc, 2, '#1a1a1a');
  });
  const total = ev.shots.reduce((a, b) => a + b.sc, 0);
  r.text(`ARROWS ${ev.shots.length} / 3`, 6, 8, '#f7f2e0', { outline: '#1a0c10' });
  r.text(`TOTAL ${total}`, 6, 22, '#ffd166', { outline: '#1a0c10' });
  if (ev.phase === 'intro') { centreText(r, 'ARCHERY • BULLSEYE LAWN', r.H * .3, '#fff6c8', 2); para(r, EVENTS.archery.about, r.H * .45); }
  if (ev.phase === 'count') centreText(r, ev.t < COUNT ? cue(Math.ceil(COUNT - ev.t)) : 'SHOOT', r.H * .4, '#fff6c8', 4);
  if (ev.phase === 'shoot') speak(r, `${btn('action', 'release')}`);
  const last = ev.shots[ev.shots.length - 1];
  if (last && last.t < .9) centreText(r, String(last.sc), r.H * .72, '#ffd166', 3);
  if (ev.phase === 'done') speak(r, `${btn('confirm', 'to continue')}`);
}

/* ==================== the event scene: intro, count-in, play, done, commit ==================== */
const MAKERS = { sprint: makeSprint, skijump: makeSkijump, archery: makeArchery };
let active = null;
function eventScene() {
  return {
    pausable: true,
    enter(data) {
      cur = { name: 'ev', data };
      const ev = EVENTS[data.id];
      game.setView(ev.view);
      active = MAKERS[data.id](data);
      if (!data.attract) A.music(E.songs.adventure);
      else A.music(E.songs.title);
    },
    update(dt) {
      const p = game.input;
      if (active.attract && p.anyPressed()) return go('title');
      active.update(dt, p);
      if (active.ready() && (active.attract || game.input.pressed('confirm') || game.input.pressed('action'))) {
        commitResult(active.id, Object.assign(active.result(), { attract: active.attract }), active.attract);
      }
    },
    draw(r) {
      active.draw(r);
      if (active.attract) r.text('ATTRACT • PRESS ANY BUTTON', r.W / 2, r.H - 12, '#ffd166', { align: 'center', outline: '#1a0c10' });
    },
  };
}

/* ==================== results, medals, records, how to play, about (the screens) ==================== */
function resultsScene() {
  let data = null;                                  // this scene's own data: the global cur can change during a fade
  return {
    enter(d) { data = d; cur = { name: 'results', data: d }; A.music(E.songs.victory, { loop: false }); },
    update() { if (game.input.pressed('confirm') || game.input.pressed('cancel')) go('title'); },
    draw(r) {
      r.sky(['#101848', '#402a70']);
      if (!data) return;
      const { id, result } = data;
      centreText(r, EVENTS[id].name, 22, '#fff6c8', 2);
      centreText(r, `${PLAYER.name}  •  ${result.label}`, 56, '#f7f2e0', 2);
      centreText(r, `RANK ${result.rank} OF 4${result.newBest ? '   NEW RECORD!' : ''}`, 84, result.newBest ? '#ffd166' : '#f7f2e0');
      panel(r, r.W * .2, 110, r.W * .6, 90);
      let y = 120;
      for (const rv of result.rivals) { r.text(rv.n.name, r.W * .3, y, rv.n.col, { outline: '#1a0c10' }); r.text(rv.label, r.W * .7, y, '#f7f2e0', { align: 'right', outline: '#1a0c10' }); y += 16; }
      centreText(r, `${btn('confirm', 'back to the title')}  •  RECORD ${record(id) ? record(id).label : '—'}`, r.H - 26, '#fff6c8');
    },
  };
}
// the Quick Games field is the player's nation and the three rivals, in all three events
const FIELD = NATIONS.slice(0, 4);
function medalRows() {
  const tally = Object.fromEntries(FIELD.map(n => [n.id, { n, g: 0, s: 0, b: 0 }]));
  for (const id of ORDER) {
    const res = meet && meet.results[id];
    if (!res) continue;
    const field = [{ n: PLAYER, v: res.value }, ...res.rivals.map(c => ({ n: c.n, v: c.value }))];
    field.sort((a, b) => (EVENTS[id].best === 'min' ? a.v - b.v : b.v - a.v));
    ['g', 's', 'b'].forEach((k, i) => tally[field[i].n.id][k]++);
  }
  return Object.values(tally).sort((a, b) => b.g - a.g || b.s - a.s || b.b - a.b);
}
function medalsScene() {
  return {
    enter() { cur = { name: 'medals', data: null }; A.music(E.songs.victory, { loop: false }); },
    update() { if (game.input.pressed('confirm') || game.input.pressed('cancel')) go('title'); },
    draw(r) {
      r.sky(['#101848', '#402a70']);
      centreText(r, 'QUICK GAMES • MEDAL TABLE', 14, '#fff6c8', 2);
      panel(r, r.W * .12, 40, r.W * .76, r.H * .66);
      r.text('NATION', r.W * .2, 50, '#ffd166'); r.text('G', r.W * .58, 50, '#ffd166'); r.text('S', r.W * .66, 50, '#ffd166'); r.text('B', r.W * .74, 50, '#ffd166');
      let y = 70;
      for (const row of medalRows()) {
        r.text(row.n.name, r.W * .2, y, row.n.col, { outline: '#1a0c10' });
        r.text(String(row.g), r.W * .58, y, '#f7f2e0'); r.text(String(row.s), r.W * .66, y, '#f7f2e0'); r.text(String(row.b), r.W * .74, y, '#f7f2e0');
        y += 18;
      }
      centreText(r, btn('confirm', 'back to the title'), r.H - 26, '#fff6c8');
    },
  };
}
function recordsScene() {
  return {
    enter() { cur = { name: 'records', data: null }; },
    update() { if (game.input.pressed('confirm') || game.input.pressed('cancel')) go('menu'); },
    draw(r) {
      r.sky(['#101848', '#402a70']);
      centreText(r, 'RECORDS', 20, '#fff6c8', 2);
      panel(r, r.W * .12, 52, r.W * .76, r.H * .5);
      let y = 66;
      for (const id of ORDER) {
        const rec = record(id);
        r.text(EVENTS[id].name, r.W * .2, y, '#ffd166', { outline: '#1a0c10' });
        r.text(rec ? `${rec.label}  (${PLAYER.name})` : 'NO RECORD YET', r.W * .5, y, '#f7f2e0', { outline: '#1a0c10' });
        y += 26;
      }
      r.text('Records are saved in this browser.', r.W * .2, y + 10, '#c9c9d6');
      centreText(r, btn('confirm', 'back'), r.H - 26, '#fff6c8');
    },
  };
}
function howtoScene() {
  return {
    enter() { cur = { name: 'howto', data: null }; },
    update() { if (game.input.pressed('confirm') || game.input.pressed('cancel')) go('menu'); },
    draw(r) {
      r.sky(['#101848', '#402a70']);
      centreText(r, 'HOW TO PLAY', 16, '#fff6c8', 2);
      let y = 46;
      const lines = [
        `${btn('mashL', '')} and ${game.input.label('mashR')}: mash in turn (the same button twice stumbles you)`,
        `${btn('turbo', '')}: spend a full HYPE meter on a burst`,
        `${btn('action', '')}: take off and release (ski jump, archery)`,
        'LEFT and RIGHT: balance in the air, nudge the arrow',
        'Yikes: a stumble or a tumble is funny, and quick to recover from',
      ];
      for (const l of lines) { r.text(l, r.W * .08, y, '#f7f2e0'); y += 16; }
      y += 6;
      for (const id of ORDER) { r.text(EVENTS[id].name + ' • ' + EVENTS[id].rule, r.W * .08, y, '#ffd166'); y += 14; r.text(EVENTS[id].about, r.W * .1, y, '#c9c9d6'); y += 22; }
      centreText(r, btn('confirm', 'back'), r.H - 26, '#fff6c8');
    },
  };
}
function aboutScene() {
  return {
    enter() { cur = { name: 'about', data: null }; },
    update() { if (game.input.pressed('confirm') || game.input.pressed('cancel')) go('menu'); },
    draw(r) {
      r.sky(['#101848', '#402a70']);
      const pages = ABOUT();
      const pg = Math.floor((game.time || 0) / 7) % pages.length;
      centreText(r, 'ABOUT & CREDITS', 12, '#fff6c8', 2);
      panel(r, r.W * .06, 34, r.W * .88, r.H * .7);
      let y = 44;
      r.text(pages[pg].title, r.W * .1, y, '#ffd166', { outline: '#1a0c10' }); y += 16;
      for (const l of pages[pg].lines) { r.text(l, r.W * .1, y, '#f7f2e0'); y += 11; }
      centreText(r, `${btn('confirm', 'back')}  •  ${pg + 1} / ${pages.length}`, r.H - 26, '#fff6c8');
    },
  };
}

/* ==================== the title, the menus, attract ==================== */
const touchOnly = () => typeof matchMedia === 'function' && matchMedia('(any-hover: none)').matches && matchMedia('(any-pointer: coarse)').matches;
let idle = 0, menuObj = null;
function titleScene() {
  return {
    enter() { cur = { name: 'title', data: null }; idle = 0; A.music(E.songs.title); },
    update(dt) {
      if (game.input.anyPressed()) idle = 0; else idle += dt;
      if (game.input.pressed('confirm') || game.input.pressed('start')) { if (!touchOnly()) { A.sfx('select'); return go('menu'); } }
      if (idle > IDLE_TO_ATTRACT) return go('attract');
    },
    draw(r) {
      r.sky(['#101848', '#402a70', '#f7d28a']);
      r.overlay(g => E.font.title(g, TITLE, r.W / 2, r.H * .18, { scale: 3, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 3, depthColor: '#6a2a1a' }));
      centreText(r, 'Faster. Higher. Yikes.', r.H * .42, '#f7f2e0');
      if (touchOnly()) centreText(r, 'Controller or keyboard required', r.H * .6, '#ffd166');
      else if (Math.floor((game.real || 0) * 2) % 2 === 0) centreText(r, `PRESS ${game.input.label('confirm').toUpperCase()} TO START`, r.H * .6, '#fff6c8');
      centreText(r, 'OPTIONS: PAUSE  •  DEV MODE: PAUSE MENU', r.H - 40, '#c9c9d6');
      r.text('DEMO', 4, r.H - 12, '#c9c9d6');
    },
  };
}
function menuScene() {
  return {
    enter() {
      cur = { name: 'menu', data: null }; idle = 0;
      menuObj = new E.Menu(game, ['QUICK GAMES', 'SINGLE EVENT', 'RECORDS', 'HOW TO PLAY', 'ABOUT & CREDITS', 'BACK'], {
        x: 'center', y: 80, title: 'THE GAMES',
        onPick(i) {
          idle = 0; A.sfx('confirm');
          if (i === 0) { meet = { quick: true, list: ORDER.slice(), i: 0, results: {}, seed: 1 + ((Date.now() >>> 0) % 9999) }; return go('ev', { id: meet.list[0], seed: meet.seed }); }
          if (i === 1) return go('pick');
          if (i === 2) return go('records');
          if (i === 3) return go('howto');
          if (i === 4) return go('about');
          return go('title');
        },
        onCancel() { go('title'); },
      });
    },
    update(dt) {
      if (game.input.anyPressed()) idle = 0; else idle += dt;
      menuObj.update(dt);
      if (idle > IDLE_TO_ATTRACT) go('attract');
    },
    draw(r) { r.sky(['#101848', '#402a70']); menuObj.draw(r); },
  };
}
function pickScene() {
  return {
    enter() {
      cur = { name: 'pick', data: null }; meet = null;
      menuObj = new E.Menu(game, ORDER.map(id => EVENTS[id].name).concat(['BACK']), {
        x: 'center', y: 80, title: 'SINGLE EVENT',
        onPick(i) { if (i >= ORDER.length) return go('menu'); go('ev', { id: ORDER[i], seed: 1 + ((Date.now() >>> 0) % 9999) }); },
        onCancel() { go('menu'); },
      });
    },
    update(dt) { menuObj.update(dt); },
    draw(r) { r.sky(['#101848', '#402a70']); menuObj.draw(r); },
  };
}
function attractScene() {
  return {
    enter() { cur = { name: 'attract', data: null }; attractIdx = -1; meet = null; attractNext(); },
    update() { if (game.input.anyPressed()) go('title'); },
    draw(r) { r.text('ATTRACT • PRESS ANY BUTTON', r.W / 2, r.H - 12, '#ffd166', { align: 'center', outline: '#1a0c10' }); },
  };
}
function attractNext() {
  attractIdx++;
  if (attractIdx >= ORDER.length) return go('title');
  go('ev', { id: ORDER[attractIdx], attract: true, seed: 777 + attractIdx });
}

/* ==================== dev mode: sliders, the cheat, reset ==================== */
let devRows = [], devSel = 0;
function openDev() { go('dev', { from: cur }); }
function devScene() {
  let from = null;                                  // where Dev mode was opened from (its own copy, see resultsScene)
  return {
    enter(d) {
      from = d && d.from || null;
      cur = { name: 'dev', data: d }; devSel = 0;
      devRows = Object.keys(TUNE_RANGE).map(k => ({ k }));
      devRows.push({ k: 'cheat' }, { k: 'reset' });
    },
    update() {
      const p = game.input;
      if (p.pressed('cancel') || p.pressed('pause')) return from ? go(from.name, from.data) : go('title');
      if (p.pressed('up')) devSel = (devSel + devRows.length - 1) % devRows.length;
      if (p.pressed('down')) devSel = (devSel + 1) % devRows.length;
      const row = devRows[devSel];
      if (row.k === 'cheat' && p.pressed('confirm')) { cheat.infinite = !cheat.infinite; A.sfx('select'); }
      if (row.k === 'reset' && p.pressed('confirm')) { Object.assign(TUNE, TUNE_DEFAULTS); cheat.infinite = false; saveTune(); A.sfx('confirm'); }
      if (TUNE_RANGE[row.k]) {
        const [lo, hi, step] = TUNE_RANGE[row.k];
        const dir = (p.pressed('right') ? 1 : 0) - (p.pressed('left') ? 1 : 0);
        if (dir) { TUNE[row.k] = clamp(Math.round((TUNE[row.k] + dir * step) / step) * step, lo, hi); saveTune(); }
      }
    },
    draw(r) {
      r.sky(['#101848', '#402a70']);
      centreText(r, 'DEV MODE', 8, '#ffd166', 2);
      let y = 36;
      devRows.forEach((row, i) => {
        const sel = i === devSel, label = row.k === 'cheat' ? 'Cheat: infinite HYPE, perfect timing' : row.k === 'reset' ? 'Reset all to defaults' : TUNE_RANGE[row.k][3];
        r.text((sel ? '> ' : '  ') + label, r.W * .08, y, sel ? '#fff6c8' : '#c9c9d6');
        if (TUNE_RANGE[row.k]) {
          const v = TUNE[row.k], [lo, hi] = TUNE_RANGE[row.k];
          r.overlay(g => { E.px.rect(g, r.W * .62, y + 3, r.W * .26, 4, '#44506f'); E.px.rect(g, r.W * .62 + r.W * .26 * (v - lo) / (hi - lo) - 2, y, 4, 10, '#f2b632'); });
          r.text(v.toFixed(2), r.W * .92, y, '#f7f2e0', { align: 'right' });
        } else if (row.k === 'cheat') r.text(cheat.infinite ? 'ON' : 'OFF', r.W * .92, y, '#f7f2e0', { align: 'right' });
        y += 16;
      });
      centreText(r, 'up/down choose • left/right adjust • confirm toggles or resets • cancel goes back', r.H - 26, '#c9c9d6');
    },
  };
}

/* ==================== About & Credits: the sections the task asks for ==================== */
function ABOUT() {
  return [
    { title: 'OLYMPIYIKES! • CREDITS', lines: [
      'A vertical slice of the Summer and Winter Games.',
      'Built on my-3D2dge v0.85.2, the handoff engine.',
      'Code, pixel art and sound are drawn or synthesised in code.',
      'Music: the engine\'s own chiptune loops (E.songs).',
      'Controls: mash J and K, action Space, turbo L.',
      'On a pad: square and circle mash, cross acts, triangle turbos.',
      'Dev mode: open the pause menu and choose Dev mode.'] },
    { title: 'SOURCE INFORMATION', lines: [
      'Date: 2026-11-04 07:55:24',
      'Source: the complete summer and winter Olympic games',
      'Plan: PLAN.md, the plan given for this build',
      'Genre: arcade multi-event sports',
      'Perspective: 2.5D lanes, side view, overhead archery',
      'Tech: my-3D2dge v0.85.2, plain JavaScript, canvas',
      'Art direction: engine pixel style, chibi rigs, code-drawn',
      'Animation: the engine\'s Humanoid rig poses',
      'Audio: engine chip synth and loops, no audio files',
      'Online: none',
      'Testing: scripted playthroughs and browser screenshots',
      'Research: the engine\'s own docs only',
      'Environment: Claude Code CLI (headless); Linux (WSL2)',
      'Model: claude-haiku-5-5, reasoning effort medium',
      'Usage: unknown'] },
    { title: 'TESTING FEEDBACK', lines: [
      'Issues caught: six game bugs, and harness timing fixes.',
      'Critical: two. Attract never returned to the title, and',
      'the tracks and the archery target did not draw at all.',
      'Most helpful: the scripted Quick Games run, through the',
      'medal table, since it crosses every scene change.',
      'Least helpful: the scene-name checks. They passed while the',
      'track was blank; only the screenshots caught that.'] },
    { title: 'ENGINE FEEDBACK', lines: [
      'Liked most: the scene and pause-menu setup, and the headless',
      'fixed-step advance, which made the tests repeatable.',
      'Stuck or guessed: E.hex returns arrays but the pixel',
      'helpers want CSS strings. Scene fades also eat input.',
      'Built myself: the three event simulations, attract pilot,',
      'the dev sliders and this About screen.',
      'Hardest: knowing which draws are screen space (overlay',
      'paints over actors) and which sort into the world.',
      'Engine changes: none. The engine copy is unchanged.',
      'Change: a glyph set with the controller symbols and dot.'] },
    { title: 'PROMPT FEEDBACK', lines: [
      'Liked most: the 10-foot rules and the exact file names.',
      'Confusing: the plan is 1700 lines for a team, names the',
      'Opus max folder, and the root is not stated clearly.',
      'Hardest: fitting twelve events and AI Hub into one session.',
      'Change: a first-pass scope marked by priority, the root',
      'folder spelled out, and the plan trimmed to what it needs.'] },
  ];
}

/* ==================== boot ==================== */
const scenes = {
  title: titleScene(), menu: menuScene(), pick: pickScene(), ev: eventScene(), results: resultsScene(),
  medals: medalsScene(), records: recordsScene(), howto: howtoScene(), about: aboutScene(), dev: devScene(), attract: attractScene(),
};
game.start({ scene: 'title', scenes });
if (typeof window !== 'undefined') window.__oly = game;
game.debug = {
  snapshot: () => ({ scene: cur.name, tune: { ...TUNE }, cheat: { ...cheat }, idle,
    event: active && { id: active.id, phase: active.ev.phase, t: active.ev.t, attract: active.attract, barOn: !!active.ev.barOn, bar: active.ev.bar } }),
  go, startEvent: (id, data) => go('ev', Object.assign({ id }, data)), meet: () => meet, medals: () => medalRows(),
};
})();
