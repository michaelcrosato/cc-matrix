/* MAIN: the match scene, every scene registered, the 10-foot theme for the engine's HTML screens (pause, settings,
 * controls, help, Dev), the Help screen by context, deep links (#match, #drill/<id>, #attract, #story/ch3, #dev,
 * #setup, #about), game.debug for tests and tools, the touch-only gate and the AI Hub start, then game.start. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, game = FF.game, S = FF.sim;

const match = {
  input: FF.KEYS, view: 'broadcast', pausable: !FF.inHub, camera: { zoom: [.7, 1.4], start: 1 },
  enter(d) { FF.match.setup(d || { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [{ input: game.input, team: 0 }], qLen: game.settings.quarterLen, difficulty: game.settings.difficulty, cards: [[FF.rndCard()], [FF.rndCard()]] }); },
  exit() { FF.crowdAudio.stop(); game.timeScale = 1; FF.match.overlay = null; FF.replay.play = null; S.replaying = false; S.halftimeHook = null; S.afterPlayHook = null; game.audio.duck(false); },
  update(dt) {
    const D = FF.dev;
    if (D.step) { if (!D.stepOnce) return; D.stepOnce = false; }
    FF.cut.update(dt);
    if (FF.cut.lines && S.phase === 'HALFTIME') { FF.Stadium.update(dt); return; }
    FF.match.update(dt);
  },
  draw(r) { FF.match.draw(r); if (FF.dev.on) FF.dev.draw(r); if (FF.dev.hudOff) return; }
};
FF.scenes.match = match;
// every scene that isn't a match shares the input map, and cleans up its weather
for (const [k, s] of Object.entries(FF.scenes)) { s.input = s.input || FF.KEYS; const en = s.enter; s.enter = function (d) { game.saves.canSave = k === 'story'; return en ? en.call(this, d) : undefined; }; const ex = s.exit; s.exit = function () { if (k !== 'match' && k !== 'drill' && k !== 'hub') { FF.crowdAudio.stop(); } if (ex) ex.call(this); }; }

/* ---- the 10-foot theme for the engine's HTML screens (engine change E9 done as a stylesheet of the game's own) ---- */
if (typeof document !== 'undefined') {
  const css = `.esh{--ink:#f4f0e6;--paper:rgba(14,16,34,.94);--accent:#ffb02e;--muted:#a9a6c0;--danger:#ff6a5a;--line:rgba(255,176,46,.35);--font:system-ui,sans-serif;--titleFont:"Arial Black",Impact,system-ui,sans-serif;font-size:clamp(17px,1.6vw,30px)!important}
.esh .esh-pan{max-width:min(94vw,44em)!important;padding:1.1em 1.4em!important}.esh h2{font-size:1.9em!important;font-family:var(--titleFont)!important;letter-spacing:.03em}.esh button{font-size:1em!important;min-height:2.5em!important;padding:.45em 1.1em!important}
.esh .esh-row{font-size:1em!important;min-height:2.4em}.esh input[type=range]{min-width:9em;height:1.4em}.esh .esh-k{font-size:.85em!important;letter-spacing:.08em}.esh kbd{font-size:.95em!important}.esh button:focus-visible,.esh button:focus{outline:3px solid var(--accent)!important;outline-offset:2px}`;
  const st = document.createElement('style'); st.id = 'ff-10ft'; st.textContent = css; document.head.appendChild(st);
}

/* ---- Help by context, for the device used last ---- */
const help = () => {
  const L = a => FF.glyph.label(a, game.input, FF.glyph.device() === 'gamepad' ? 'gamepad' : 'keyboard');
  return { title: 'HOW TO PLAY', keys: [[L('up') + ' / stick', 'Run (any direction)'], [L('turbo'), 'Turbo (hold)'], [L('b1'), 'Hike · Dive · Tackle · Kick meter'], [L('b2'), 'Stiff arm · Switch defender'], [L('b3'), 'Spin · Strip · Flip the play'], [L('b4'), 'Hurdle · Jump · Fiasco Cards'], [L('lb') + ' / ' + L('rb'), 'Lateral · Tabs · both: star special'], ['1 2 3 / ' + L('b1') + ' ' + L('b2') + ' ' + L('b3'), 'Throw to a receiver (QB behind the line)'], ['Mouse', 'Click a receiver to throw, a defender to switch, the QB to hike']],
    sections: [['Offense', 'Pick a play card, hike, then throw to a receiver with his button or run. Hold turbo with the button for a Rocket Pass.'], ['Ball carrier', 'Spin, stiff arm and hurdle past tacklers. Dive to fall forward. Lateral to a teammate behind you.'], ['Defense', 'Switch to the defender nearest the ball. Tackle, or hold turbo and tackle for a Big Hit that can force a fumble. Late hits are legal (Fiasco rules).'],
      ['Kicking', 'Three taps: start the meter, set the power, set the aim. The green band is straight.'], ['Fiasco rules', '7 on 7. Four downs to gain 20 yards. No penalties. Every disaster fills your Fiasco Meter: fill it to draw a Fiasco Card.']] };
};
if (game.shell && game.shell._o) { game.shell._o.screens = Object.assign(game.shell._o.screens || {}, { help: help() }); Object.defineProperty(game.shell._o.screens, 'help', { get: help, configurable: true }); }

/* ---- game.debug: the handle tests and tools read ---- */
game.debug = {
  snapshot() {
    const B = S.ball || {};
    return { scene: game.sceneName, mode: FF.match.mode, phase: S.phase, clock: Math.round(S.clock * 10) / 10, quarter: S.quarter, score: S.score, down: S.down, toGo: S.toGo, los: Math.round(S.los || 0), possession: S.poss,
      ball: { state: B.state, x: Math.round(B.x || 0), y: Math.round(B.y || 0), z: Math.round(B.z || 0), holder: B.holder ? B.holder.id : null },
      athletes: S.athletes.map(a => ({ id: a.id, team: a.team, pos: a.slot, x: Math.round(a.b.x), y: Math.round(a.b.y), z: Math.round(a.b.z), pose: a.pose, ctl: a.ctl })),
      controlled: Object.fromEntries(FF.control.humans.map(h => ['p' + h.n, h.a ? h.a.id : null])), events: FF.bus.log.slice(-10).map(e => e.ev), errors: game.errors.length, attract: game.sceneName === 'attract' ? FF.data.attract[FF.scenes.attract.i].id : null };
  },
  scenario(spec) { game.go('match', spec, { fade: 0 }); },
  cheat(name, on = true) { FF.dev.setCheat(name, on); },
  playLab: (o, d, n, opt) => FF.dev.playLab(o, d, n, opt),
  skipCutscene() { if (FF.cut.lines) { FF.cut.lines = null; const t = FF.scenes.cutscene.d && FF.scenes.cutscene.d.then; if (t) t(); } },
  finishGame(w) { S.finishNow(w); }, setClock(s) { S.clock = s; }, setScore(h, a) { S.score = [h, a]; },
  giveCard(t, id) { S.cards[t].push(id); }, setHot(id) { FF.ots.setHot(S.athlete(id)); }, fast(on) { FF.fast = !!on; }
};

/* ---- deep links ---- */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').replace(/^#/, ''); if (!h) return null;
  const [k, arg] = h.split('/');
  if (k === 'match') return ['match', arg === 'off' || arg === 'def' ? { mode: 'exhibition', home: 'fiascos', away: arg === 'def' ? 'owls' : 'mudhogs', humans: [{ input: game.input, team: 0 }], qLen: 120, cards: [['HOT_SAUCE'], ['MEGA_HIT']], start: { possession: arg === 'off' ? 0 : 1, los: 35, down: 1, toGo: 20 } } : arg && FF.stadium(arg).id === arg ? { mode: 'exhibition', stadium: arg, home: FF.stadium(arg).home, away: FF.stadium(arg).home === 'fiascos' ? 'dynasty' : 'fiascos', humans: [{ input: game.input, team: 0 }], qLen: 120, cards: [[], []], start: { possession: 0, los: 35, down: 1, toGo: 20 } } : null];
  if (k === 'drill') return ['title', null, () => FF.drills.start(arg || 'cones')];
  if (k === 'attract') return ['attract', { from: 'title' }];
  if (k === 'story') { const n = +String(arg || 'ch0').replace(/\D/g, '') || 0; return ['title', null, () => { FF.story.newGame(); FF.story.state().started = 1; FF.story.play(n); }]; }
  if (k === 'dev') { game.after(.3, () => { game.pause && game.pause('player'); FF.dev.open(); }); return ['match', null]; }
  if (['setup', 'about', 'records', 'menu', 'practice', 'credits'].includes(k)) return [k, null];
  return null;
}

/* ---- the touch-only gate, and unlocking it ---- */
FF.touchOnly = FF.detectTouchOnly();
if (FF.touchOnly) { game.input.touchEnabled = false; if (typeof addEventListener === 'function') { addEventListener('keydown', () => { FF.touchOnly = false; }); addEventListener('gamepadconnected', () => { FF.touchOnly = false; FF.inputUsed = true; }); } }
if (typeof addEventListener === 'function') addEventListener('keydown', () => { FF.inputUsed = true; }, { once: true });
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'KeyV' && !e.repeat && (game.sceneName === 'match' || game.sceneName === 'drill') && !FF.inHub) { const L = ['broadcast', 'sky', 'blimp'], i = L.indexOf(game.settings.camera); game.settings.set('camera', L[(i + 1) % L.length]); game.note(game.settings.camera.toUpperCase() + ' CAM'); } });
game.settings.onChange = (k) => { if (k === 'bigHeads' && game.settings.bigHeads && !FF.store.get('bigHeadsUnlocked', false) && !FF.dev.on) { game.settings.set('bigHeads', false); game.note('WIN THE FIASCO CUP TO UNLOCK BIG HEADS'); } if (k === 'voices') FF.voiceVol = 1; };

/* ---- start ---- */
const boot = { steps: [['Painting the field', () => { FF.Stadium.build('tumbleweed', FF.team('fiascos'), FF.team('mudhogs'), {}); }], ['Suiting up the players', () => { FF.Rigs.clear(); }], ['Warming up the announcers', () => { FF.talk.portraits(); }]], title: 'HAMERICAN FOOTBALL' };
const waiting = { input: FF.KEYS, view: 'broadcast', update() {}, draw(r) { r.sky(['#07060d', '#0e0a1a', '#14102a']); r.overlay(g => E.font.text(g, 'CONNECTING TO THE HUB...', game.W / 2, game.H / 2, '#8a86a0', { align: 'center', outline: false })); } };
FF.scenes.waiting = waiting;
const link = !FF.inHub && deepLink();
game.start({ scenes: FF.scenes, scene: FF.inHub ? 'waiting' : link ? link[0] : 'title', data: link ? link[1] : undefined, boot });
if (link && link[2]) { if (FF.headless) link[2](); else game.booted.then(link[2]); }
if (FF.inHub) FF.net.start().then(ok => { if (!ok) game.go('title'); }).catch(e => game.fail('hub', e));
})();
