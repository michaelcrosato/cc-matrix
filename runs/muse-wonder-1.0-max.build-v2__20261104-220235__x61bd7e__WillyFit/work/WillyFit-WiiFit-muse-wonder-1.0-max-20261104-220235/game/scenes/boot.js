// Willy Fit — boot: game, talk, saves, contestants, session runner factory, attract/dev hooks.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  const inSession = !!(window.AIHub && window.AIHub.active);
  G.inSession = inSession;
  const game = new E.Game({
    canvas: 'screen', id: 'willyfit', res: 'ps1', expand: true, touch: 'never', input: G.INPUT,
    autoPause: !inSession, live: inSession, fullscreen: inSession ? false : 'button',
    menu: {
      quit: inSession ? false : 'title',
      items: inSession ? [] : [['Restart Session', () => { if (G._restartSession) G._restartSession(); }], ['Dev Mode', () => { G.devOpen = true; }]],
      settings: [
        { key: 'music', value: 0.1 },
        { key: 'glyphs', value: 'playstation' },
        { key: 'voice', label: 'Voice volume', value: 0.8, min: 0, max: 1, step: 0.1 },
        { key: 'gentle', label: 'Gentle Mode', value: false },
        { key: 'breathToggle', label: 'Breath: Toggle (else Hold)', value: false },
        { key: 'tips', label: "Tare's Tips", value: true }
      ],
      controls: { breath: 'Breath / Effort', catchL: 'Catch left', catchR: 'Catch right', paceL: 'Jog step left', paceR: 'Jog step right', stepL: 'Step left', stepD: 'Step down', stepU: 'Step up', stepR: 'Step right', jump: 'Jump', interact: 'Interact', more: 'More time / More', retry: 'Retry' }
    }
  });
  G.game = game;
  if (typeof document !== 'undefined') document.addEventListener('pointerover', e => {
    const b = e.target.closest && e.target.closest('.esh-sh button:not(:disabled), .esh-sh input:not(:disabled)');
    if (b && e.pointerType === 'mouse') b.focus({ preventScroll: true });
  });
  try { new E.Shell(game, { theme: { ink: '#20404c', paper: '#f7fbfb', accent: '#14a8c8', muted: '#5f7f8a', danger: '#e0553a', line: '#c8dde2', font: 'system-ui, sans-serif', titleFont: 'system-ui, sans-serif' } }); } catch (e) {}
  G.initAudio(game);
  const talk = new E.Dialog(game, { bg: ['#ffffff', '#eaf6f8'], border: '#2cc6e6', color: '#20404c', nameColor: '#14a8c8', voice: (ch, i, t) => G.babble(t.name || 'You', ch, game) });
  talk.shadow = null;
  G.talk = talk;
  try { if (game.audio && game.audio.bus) { /* voice slider applied each frame in scenes */ } } catch (e) {}
  // Saves
  game.saves.write = () => ({ data: JSON.parse(JSON.stringify(G.member)), place: 'Day ' + G.member.day + ' · ' + G.member.nickname, level: G.member.day });
  game.saves.read = save => { if (save && save.data) { G.member = Object.assign(G.newMember(), save.data); } };
  G.autosave = function () { try { game.saves.save('auto'); } catch (e) {} };
  G.say = function (name, lines, opts) {
    const arr = Array.isArray(lines) ? lines : [lines];
    try { talk.say(arr, Object.assign({ name: name }, opts || {})); } catch (e) {}
  };
  G.makeContestant = function (opts) {
    opts = opts || {};
    const rig = G.makeRig(opts.rigOpts || G.playerRigOpts());
    const bal = new G.Balance(opts.params || { k: 12, c: 6, s: 6, A: 3, nf: 1.3, R: 0.26 }, opts.rng || Math.random);
    const c = { rig: rig, bal: bal, input: opts.input || null, bot: null, device: null, name: opts.name || 'You', color: opts.color || '#ff7a59', local: !!opts.local, score: 0 };
    if (opts.bot) c.bot = G.makeBot(opts.bot, opts.seed || 7);
    else if (opts.input) c.device = new G.DeviceIntent(opts.input);
    const self = c;
    c.getIntent = function (dt) {
      let it;
      if (G.DEV.botSkill && G.DEV.botSkill !== 'off' && self.local && !opts.bot) {
        if (!self._devBot) self._devBot = G.makeBot(G.DEV.botSkill, 42);
        it = self._devBot.intent(self.bal, dt, self.bal.ring);
      }
      else if (self.bot) it = self.bot.intent(self.bal, dt, self.bal.ring);
      else if (self.device) it = self.device.read(dt, game);
      else it = { lean: { x: 0, y: 0 }, breath: 0, breathHeld: false, source: 'keyboard' };
      self._lastIntent = it;
      return it;
    };
    return c;
  };
  G.rngFrom = function (seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  };
  G.seedFor = function (str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  game.debug = { snapshot() { const s = G._snap || {}; return Object.assign({}, s, { scene: game.sceneName || s.scene || 'none', title: G.TITLE, spineAge: G.spineAge().age, minutes: G.member.minutes, day: G.member.day, hash: G.hashState() }); } };
  G._snap = {};
  G.setSnap = function (o) { G._snap = o; };
  // Attract idle tracking
  G.lastInputT = 0; G.attractOn = false;
  game.hook('input', () => {
    try {
      if (game.input.anyPressed && game.input.anyPressed()) G.lastInputT = game.real;
      const pt = game.input.pointer ? game.input.pointer() : null;
      if (pt && (pt[0] !== G._mpX || pt[1] !== G._mpY)) { G._mpX = pt[0]; G._mpY = pt[1]; G.lastInputT = game.real; }
    } catch (e) {}
  });
  G.idleSeconds = function () { return game.real - G.lastInputT; };
  // Dev panel state
  G.devOpen = false;
  G._restartSession = null;
})();
