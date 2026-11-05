/* MASH TV — 99-main: the engine game, its settings and pause menu, the scenes, the sound and sprites set up once, the idle
 * clock, deep links for checks and screenshots, and the debug handle. The IIFE closes here. */

MT.G = null;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown'], bg: '#07060d',
  menu: { controls: MT.CONTROL_NAMES, quit: 'title', items: [
    ['Dev mode', () => MT.openDev && MT.openDev()],
    ['Episode map', () => MT.openMap && MT.openMap()],
    ['How to play', () => MT.openHowTo && MT.openHowTo()]] } });
MT.G = game;
// settings: ours, beside the engine's standard ones (saved per game by the engine)
game.settings.define({ key: 'aimAssist', group: 'Mash TV', label: 'Aim assist (controller)', type: 'toggle', value: true, help: 'The aim nudges toward an enemy in front' });
game.settings.define({ key: 'autoFire', group: 'Mash TV', label: 'Auto-fire with the right stick', type: 'toggle', value: true, help: 'Fire while the right stick is pushed' });
game.settings.define({ key: 'camView', group: 'Mash TV', label: 'Camera', options: [['studio', 'Studio'], ['overhead', 'Overhead']], value: 'studio', help: 'Studio: a high three-quarter view. Overhead: from above', apply: (g, v) => { if (g.sceneName === 'play') g.setView(v === 'overhead' ? 'topdown' : 'threequarter'); } });
game.settings.define({ key: 'subtitles', group: 'Mash TV', label: 'Subtitles', type: 'toggle', value: true, help: 'The lower third under the show' });
game.settings.define({ key: 'chatter', group: 'Mash TV', label: 'Host chatter', options: [['normal', 'Normal'], ['less', 'Less'], ['off', 'Off']], value: 'normal', help: 'How often the host talks' });
game.settings.define({ key: 'confetti', group: 'Mash TV', label: 'Confetti amount', options: [['party', 'Party'], ['tasteful', 'Tasteful']], value: 'party', help: 'How much confetti flies' });
// the engine's button symbols: PlayStation by default, Xbox (A B X Y) on request
game.lights.enabled = false;

// sound and sprites, made once
for (const k in MT.SFX) game.audio.define(k, MT.SFX[k]);
MT.initSprites();
MT.cab = new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10, demo: 1e9, scores: 6, lives: 3 });

// the idle clock and the any-input listeners (keyboard, mouse, touch, pads polled each step)
if (typeof window !== 'undefined' && window.addEventListener) {
  const note = (k) => () => MT.noteInput(k);
  window.addEventListener('keydown', e => { MT.keyedAt = game.time; MT.noteInput('keyboard'); });
  window.addEventListener('mousedown', note('mouse'));
  window.addEventListener('wheel', note('mouse'));
  window.addEventListener('touchstart', note('touch'), { passive: true });
  window.addEventListener('gamepadbuttondown', note('gamepad'));
  window.addEventListener('mousemove', e => { if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 8) MT.noteInput('mouse'); });
}
E.HOOKS.step.push((g, dt) => { if (g.sceneName !== 'play') MT.pollPads(); });

// the scene switcher and the flow's end: a game in progress returns to the title on quit
const inHub = typeof window !== 'undefined' && !!(window.AIHub && window.AIHub.active);   // a session opens straight into the round
game.start({ scenes: MT.scenes, scene: inHub ? 'hubwait' : 'title', fade: 0 });
MT.G = game;

MT.World = World; MT.Contestant = Contestant; MT.Enemy = Enemy; MT.Boss = Boss;   // the classes, for the tests and the tools
// deep links (#room=1-1, #boss=1, #dev, #card, #lobby …) for checks and screenshots: read once at boot
MT.deepLink = () => {
  if (typeof location === 'undefined') return;
  const h = (location.hash || '').replace(/^#/, ''); if (!h) return;
  const [k, v] = h.split('='); const seed = +(new URLSearchParams(location.search || '').get('seed') || 7);
  const go = (scene, d) => game.go(scene, d, { fade: 0 });
  if (k === 'title') go('title');
  else if (k === 'lobby') go('lobby');
  else if (k === 'howto') go('howto', { page: 0 });
  else if (k === 'scores') go('scores');
  else if (k === 'about') go('about', { page: 0 });
  else if (k === 'attract') go('attract');
  else if (k === 'room' || k === 'boss' || k === 'greenroom') MT.quickRoom(game, k === 'room' ? v : k === 'boss' ? MT.bossRoom(+v || 1) : 'greenroom', seed);
  else if (k === 'gameover') go('gameover');
};
// an in-scene room start for tests and screenshots: one bot-free contestant, the room loaded at once
MT.quickRoom = (G, roomId, seed = 7) => {
  MT.seedAll(seed);
  const run = MT.startRun({ mode: 'test', diff: 'contestant', slots: [0], seed });
  run.players = [{ slot: 0, input: G.input, c: null }];
  run.ep = MT.ROOMS[roomId].ep || 1;
  G.go('play', { run, startEp: run.ep, cold: false, skipCold: true, room: roomId }, { fade: 0 });
  MT.overrideStart = roomId;
};

// the debug handle for tests and tools: the state of the run and the room
game.debug = {
  snapshot() {
    const W = MT.PLAY.W, run = MT.run;
    return { scene: game.sceneName, mode: run && run.mode, ep: run && run.ep, room: W && W.id, phase: W && W.phase, wave: W && W.waveIdx,
      alive: W && W.aliveCounted, enemies: W && W.enemies.filter(e => e.alive).length, bullets: W && W.pShots.length + (W.fShots ? W.fShots.length : 0),
      pickups: W && W.pickups.length, R: run && Math.round(run.ratings.R), keys: run && run.keys,
      players: W ? W.players.map(c => ({ slot: c.slot, x: Math.round(c.x), y: Math.round(c.y), hp: c.hp, lives: c.lives, cash: c.cash, wpn: c.weapon.id, state: c.state })) : [],
      boss: W && W.boss && { kind: W.boss.kind, alive: W.boss.alive, stance: W.boss.stance, parts: W.boss.parts.map(p => [p.id, Math.round(p.hp), p.alive]) },
      bossOver: W && !!W.bossOver, errors: game.errors.length };
  },
  tune: (k, v) => MT.setTune(k, v), resetTunes: () => MT.resetTunes(),
  quickRoom: (room, seed) => MT.quickRoom(game, room, seed)
};
game.stateHash = () => JSON.stringify(game.debug.snapshot());
MT.deepLink();
})();
