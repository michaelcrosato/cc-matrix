// 90-main.js — new E.Game, settings, pause-menu items (incl. Dev mode), the AI Hub session flow (card, countdown,
// host/replica/server, end), scene registry, boot steps and game.debug. Starts the game.
const HUBACTIVE = typeof AIHub !== 'undefined' && AIHub.active;
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty (new runs)', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], group: 'Game' },
  { key: 'aimAssist', label: 'Aim assist (controller)', type: 'select', value: 'medium', options: [['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], group: 'Game' },
  { key: 'padSpeed', label: 'Aim speed (controller)', type: 'slider', value: 1, min: .5, max: 2, step: .1, group: 'Game' },
  { key: 'coverMode', label: 'Cover control', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']], group: 'Game' },
  { key: 'autoFire', label: 'Hold fire to repeat (handgun)', type: 'select', value: 'on', options: [['on', 'On'], ['off', 'Off']], group: 'Game' },
  { key: 'reticle', label: 'Reticle', type: 'select', value: 'cross', options: [['cross', 'Cross'], ['ring', 'Ring'], ['dot', 'Dot']], group: 'Game' },
  { key: 'reticleSize', label: 'Reticle size', type: 'select', value: 'M', options: [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']], group: 'Game' },
  { key: 'threatSize', label: 'Crisis rings', type: 'select', value: 'normal', options: [['normal', 'Normal'], ['large', 'Large']], group: 'Game' },
  { key: 'subtitles', label: 'Subtitles', type: 'select', value: 'on', options: [['on', 'On'], ['off', 'Off']], group: 'Game' }
];
function createGame() {
  const items = HUBACTIVE ? [] : [
    ['Restart scene', () => { game.resume(); const s = Run.sim; if (s && Run.mode !== 'host') { s.jump(s.stage, s.sceneId); Pres.reset(); resetHud(); } }],
    ['Restart stage', () => { game.resume(); if (Run.sim) { Run.carry = null; Run.newSim(Run.sim.stage); game.go('play'); } }],
    ['Dev mode', () => { game.resume(); if (!Dev.items.length) Dev.build(); Dev.open = true; game.input.consumeAll(); }]
  ];
  const g = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, input: INPUT, autoPause: !HUBACTIVE, corner: HUBACTIVE ? false : undefined, fullscreen: HUBACTIVE ? false : undefined,
    menu: { items, settings: SETTINGS, controls: NAMES, quit: HUBACTIVE ? false : 'title' } });
  return g;
}
function applyHubGuards() { }
function buildScenes() {
  const S = Object.assign({}, Scenes);
  S.play = { pausable: !HUBACTIVE, camera: { zoom: false }, touch: [], enter: playEnter, update: playUpdate, draw: playDraw, exit() { game.splitScreen(0); } };
  S.session = Scenes.session; S.server = Scenes.server;
  return S;
}
// ---- AI Hub session ----
const Hub = { card: null, started: false, ended: null };
Scenes.session = { camera: { zoom: false }, touch: [], pausable: false,
  enter() { this.t = 0; musicFor(game, 'briefing'); Run._song = 'briefing'; },
  update(dt) { const A = window.AIHub; this.t += dt; const I = game.input; if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) A.answer('ready'); if (I.pressed('more')) A.answer('more'); if (Hub.started && !Hub.went) { Hub.went = true; game.go('play'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, A = window.AIHub, st = reg('stage', Run.stage), c = Hub.card || {}; drawBackdrop(g, W, H, game.time, .55); E.font.title(g, 'TIDE CRISIS 3', W / 2, 10, { scale: 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 2, align: 'center' });
    T(g, 'STAGE ' + Run.stage + ' — ' + st.name, W / 2, 46, '#ffd36a', { scale: 2, align: 'center' }); T(g, st.place + ' · ' + st.clock, W / 2, 64, '#9fb8e8', { scale: 1, align: 'center' });
    const pl = (A.players || []); pl.forEach((p, i) => { const x = W / 2 - pl.length * 52 + i * 104 + 6, ready = c.ready && c.ready.includes(p.id); E.ui.box(g, x, 80, 92, 40, { bg: ['#10244a', '#081428'], border: p.color }); T(g, AGENT_NAME[i] || 'AGENT', x + 46, 86, p.color, { scale: 1, align: 'center' }); T(g, String(p.name || '').slice(0, 14), x + 46, 98, '#ffffff', { scale: 1, align: 'center' }); T(g, ready ? '✓ READY' : '…', x + 46, 109, ready ? '#7cff8a' : '#6a7ea8', { scale: 1, align: 'center' }); });
    T(g, 'GOAL: Clear the stage together — most points wins', W / 2, 134, '#ffffff', { scale: 1, align: 'center' });
    const L = a => game.input.label(a); T(g, 'AIM ' + (game.input.lastDevice === 'gamepad' ? 'STICK' : 'MOUSE') + '  ·  FIRE [' + L('fire') + ']  ·  HOLD [' + L('cover') + '] COVER + RELOAD  ·  [' + L('next') + '] WEAPON', W / 2, 150, '#9fe3ff', { scale: 1, align: 'center' });
    const left = c.paused ? 'PAUSED' : c.starting ? 'GET READY…' : c.left != null ? Math.ceil(c.left / 1000) + 's' : ''; T(g, left, W / 2, 172, '#ffd36a', { scale: 3, align: 'center' });
    T(g, '[' + L('confirm') + '] READY   [' + (game.input.lastDevice === 'gamepad' ? '△' : 'M') + '] MORE TIME', W / 2, H - 16, '#9fb8e8', { scale: 1, align: 'center' }); }); }
};
Scenes.server = { camera: { zoom: false }, touch: [], pausable: false,
  enter() { this.t = 0; }, update(dt) { const sim = Run.sim; if (Hub.ended) return; if (window.AIHub.time() < 0) return; const cmds = netHostCommands(sim); sim.step(dt, cmds); netHostStep(sim, dt); stepPres(dt, sim); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, sim = Run.sim; px.rect(g, 0, 0, W, H, '#050a1c'); E.font.title(g, 'TIDE CRISIS 3', W / 2, 30, { scale: 3, colors: ['#ffffff', '#3aa0e8'], align: 'center' }); T(g, 'HOSTING · ' + sim.players.length + ' AGENTS · AREA ' + sim.sceneId, W / 2, 100, '#ffd36a', { scale: 2, align: 'center' }); T(g, Hub.ended ? 'ROUND OVER' : 'PHASE ' + sim.phase.toUpperCase() + ' · TIME ' + sim.timer.toFixed(0), W / 2, 130, '#9fe3ff', { scale: 1, align: 'center' }); }); }
};
async function hubBoot() {
  const A = window.AIHub; let info = null;
  try { info = await A.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
  if (!info) return null;
  const stage = ((info.round - 1) % 3 + 3) % 3 + 1, np = info.players.length;
  Run.hub = { me: info.me, isHost: info.isHost, server: info.server, info }; Run.mode = info.isHost ? (info.server ? 'server' : 'host') : 'replica'; Run.stage = stage; Run.np = np; Run.diff = 'normal'; Run.carry = null;
  const specs = info.players.map((p, i) => ({ name: String(p.name || 'P' + (i + 1)), agent: AGENT[i], color: p.color || PCOL[i] }));
  const sim = new Sim({ mode: Run.mode, stage, scene: reg('stage', stage).scenes[0], difficulty: 'normal', players: specs, seed: info.seed | 0, noContinue: true });
  if (!info.isHost) { sim.replica = true; sim.mode = 'replica'; sim.jump(stage, reg('stage', stage).scenes[0], {}); }
  Run.sim = sim; HUD.shown = {};
  A.on('card', c => { Hub.card = c; }); A.on('start', () => { Hub.started = true; });
  window.addEventListener('keydown', e => { if (Hub.went || Hub.ended) return; if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter') A.answer('ready'); else if (e.code === 'KeyM') A.answer('more'); });
  A.on('end', ev => { Hub.ended = ev; NET.over = true; game.input.clear(); try { game.audio.stopMusic && game.audio.stopMusic(); game.audio.mute && game.audio.mute(); } catch (e) { } });
  if (info.isHost) netHostInit(sim); else netClientInit(sim);
  A.ready(); return info;
}
function hubOverlay(g, W, H) { const e = Hub.ended; if (!e) return; px.rect(g, 0, 0, W, H, '#000000c0'); const txt_ = e.reason === 'host-left' ? 'HOST LEFT — ROUND VOID' : e.reason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER'; T(g, txt_, W / 2, H / 2 - 8, '#ffffff', { scale: 3, align: 'center' }); }
// ---- boot ----
let started = false;
function boot() {
  if (started) return; started = true;
  game = createGame(); arcade = new E.Arcade(game, { id: 'tc3', lives: 5, hud: false, idle: 1e9, demo: 1e9 });
  game.input.wheelCodes = true; try { game.input.use && 0; } catch (e) { }
  const scenes = buildScenes(); for (const k of ['title', 'menu', 'difficulty', 'select', 'coop', 'briefing', 'cutscene', 'results', 'gameover', 'records', 'about', 'ending', 'attract']) { if (!scenes[k]) scenes[k] = Scenes[k]; }
  const wrapDraw = s => { if (!HUBACTIVE) return; const d = s.draw; s.draw = function (r) { d.call(this, r); r.overlay(g => hubOverlay(g, r.W, r.H)); }; }; if (HUBACTIVE) { wrapDraw(scenes.play); wrapDraw(scenes.server); wrapDraw(scenes.session); }
  game.debug = makeDebug();
  const steps = [['Tuning the lanterns', () => { defineAudio(game); validateOnBoot(); }], ['Raising the tide barrier', () => { backdropSim(); }]];
  steps.push(['Calling the hub', async () => { if (HUBACTIVE) { const info = await hubBoot(); if (info) { Run.bootHub = info; } } }]);
  const startScene = () => HUBACTIVE && Run.hub ? (Run.hub.server ? 'server' : 'session') : 'title';
  game.start({ scene: 'title', scenes, boot: { title: 'TIDE CRISIS 3', steps }, });
}
function validateOnBoot() { const errs = validateContent(); if (errs.length) console.warn('content: ' + errs.slice(0, 6).join(' | ')); }
function makeDebug() {
  return {
    snapshot() { const s = Run.sim; return { scene: game.sceneName, phase: s && s.phase, stage: s && s.stage, sceneId: s && s.sceneId, timer: s && +s.timer.toFixed(1), players: s && s.players.map(p => ({ score: p.score, lives: p.lives, c: +p.c.toFixed(2), weapon: p.weapon, mag: p.mag, ammo: p.ammo.slice(), down: p.down, st: p.st })), enemies: s && s.enemies.filter(e => !e.dead).length, threats: s && s.threats.length, boss: s && s.boss && { id: s.boss.id, dead: s.boss.dead, parts: Object.fromEntries(Object.entries(s.boss.parts).map(([k, p]) => [k, +p.hp.toFixed(1)])) }, errors: game.errors.length, mode: Run.mode }; },
    get sim() { return Run.sim; }, Run, tune, TUNE, TC, NET, Sim, reg, Voice, ABOUT, aboutPages, touchOnly, Attract, WEAPONS, SKIN, Bot, Dev, HUD, Pres, R3, validateContent, game,
    start(mode, stage, diff, np, seed) { Run.begin(mode, stage, diff, np); const sim = Run.newSim(stage, null, Object.assign(mode === 'range' ? { mode: 'range', lives: 99 } : {}, seed != null ? { seed } : {})); if (mode === 'range') { Run.newSim(0, 'T-1', { mode: 'range', lives: 99 }); } game.go('play'); return Run.sim; },
    jump(stage, sceneId, o) { Run.sim.jump(stage, sceneId, o); Pres.reset(); },
    cheat(k, v) { Run.sim.cheats[k] = v === undefined ? 1 : v; }, bot(on, style) { Run.botOn = on; Bot.setStyle(style || 'fair'); },
    aimAt(i, pt) { const s = Run.sim, a = R3.aimOf(s.pose(i), pt); if (a) { s.players[i].aim = [a[0], a[1]]; AimOverride[i] = [a[0], a[1]]; } return a; },
    fire(i) { game.input.tap('fire'); }, cover(i, on) { game.input.hold('cover', on); }
  };
}
const AimOverride = {};
if (typeof document !== 'undefined' || true) boot();
