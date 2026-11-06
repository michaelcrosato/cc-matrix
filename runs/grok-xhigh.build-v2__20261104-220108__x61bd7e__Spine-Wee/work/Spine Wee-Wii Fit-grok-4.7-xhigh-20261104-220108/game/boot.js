/* Boot: the game, the shell, the lean, saves, and the hub session. */
var G = G || {};
(function () {
  'use strict';
  const E = My3D2dge;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function approach(cur, target, rate, dt) {
    const d = target - cur, m = rate * dt;
    if (Math.abs(d) <= m) return target;
    return cur + (d < 0 ? -m : m);
  }

  function hashScene() {
    let hash = '';
    try { hash = (typeof location !== 'undefined' && location && location.hash) || ''; } catch (e) { hash = ''; }
    return hash;
  }

  function topIdle(game) {
    const n = game.sceneName;
    if (G.attracting || G.inSession) return false;
    if (n === 'title' || n === 'slots' || n === 'about') return true;
    if (n === 'class' && !G.session) return true;
    return false;
  }

  function freshLean() {
    return { ux: 0, uy: 0, breath: 0, effort: 0, source: 'keys', jump: false, catchL: false, catchR: false, paceL: false, paceR: false };
  }

  /* One player's lean. The first player keeps the mouse, the dev-panel key filter, and the shared breath latch. */
  function readOne(game, I, lean, dt, primary) {
    const panel = primary && !!(G.dev && G.dev.panel);
    const held = I.held;
    if (primary && (held.has('KeyA') || held.has('KeyD') || held.has('KeyW') || held.has('KeyS') ||
        held.has('ArrowLeft') || held.has('ArrowRight') || held.has('ArrowUp') || held.has('ArrowDown'))) {
      G._keyAt = I.clock;
    }
    const pad = I.padMove || [0, 0];
    const padMag = Math.hypot(pad[0], pad[1]);
    const p = primary ? I.pointer() : null;
    const W = (game.screen && game.screen.W) || 320;
    const H = (game.screen && game.screen.H) || 240;
    const overPanel = panel && p && p[0] < W / 3;
    const mouseOn = primary && !!(I.mouse && I.mouse.active && p && I.mouse.t >= (G._keyAt || 0) && !overPanel);

    if (padMag > 0.12) {
      let ux = pad[0], uy = -pad[1];
      const len = Math.hypot(ux, uy) || 1;
      if (len > 1) { ux /= len; uy /= len; }
      lean.ux = ux; lean.uy = uy; lean.source = 'pad';
    } else if (mouseOn) {
      const reach = (G.dev && G.dev.v && G.dev.v.reach) || 0.33;
      const denom = Math.max(1, H * reach);
      let ux = (p[0] - W / 2) / denom;
      let uy = -(p[1] - H / 2) / denom;
      const len = Math.hypot(ux, uy) || 1;
      if (len > 1) { ux /= len; uy /= len; }
      lean.ux = ux; lean.uy = uy; lean.source = 'mouse';
    } else {
      let kx = 0, ky = 0;
      if (panel) {
        if (held.has('KeyA')) kx -= 1;
        if (held.has('KeyD')) kx += 1;
        if (held.has('KeyW')) ky += 1;
        if (held.has('KeyS')) ky -= 1;
      } else {
        if (I.down('left')) kx -= 1;
        if (I.down('right')) kx += 1;
        if (I.down('up')) ky += 1;
        if (I.down('down')) ky -= 1;
      }
      const nudge = (G.dev && G.dev.v && G.dev.v.nudge) || 2.2;
      if (kx || ky) {
        const len = Math.hypot(kx, ky) || 1;
        lean.ux = approach(lean.ux, kx / len, nudge, dt);
        lean.uy = approach(lean.uy, ky / len, nudge, dt);
      } else if (lean.source !== 'mouse') {
        lean.ux = approach(lean.ux, 0, 0.5, dt);
        lean.uy = approach(lean.uy, 0, 0.5, dt);
      }
      lean.source = 'keys';
    }

    const mode = (game.settings && game.settings.breathMode) || 'hold';
    if (primary) {
      if (mode === 'toggle' && I.pressed('breath')) G._breathLatch = !G._breathLatch;
    } else if (mode === 'toggle' && I.pressed('breath')) lean._latch = !lean._latch;
    let target = 0;
    if (mode === 'toggle') target = (primary ? G._breathLatch : lean._latch) ? 1 : 0;
    else target = I.down('breath') ? 1 : 0;
    const dir = target >= lean.breath ? 1 : -1;
    if (lean.breath !== target) lean.breath = clamp(lean.breath + dir * 0.25 * dt, 0, 1);
    const pv = I.padValues || [];
    const trig = Math.max(pv[6] || 0, pv[7] || 0);
    if (mode !== 'toggle' && trig > 0.02) lean.breath = trig;

    lean.effort = Math.max(lean.breath, I.value('paceR') || 0);
    lean.jump = !!I.pressed('jump');
    lean.catchL = !!I.pressed('catchL');
    lean.catchR = !!I.pressed('catchR');
    lean.paceL = !!I.down('paceL');
    lean.paceR = !!I.down('paceR');

    if (primary) {
      const cv = game.screen && game.screen.canvas;
      if (cv && cv.style) {
        const hide = lean.source === 'mouse' && (game.sceneName === 'play' || game.sceneName === 'duel' || game.sceneName === 'attract');
        cv.style.cursor = hide ? 'none' : '';
      }
    }
  }

  function readLean(game, dt) {
    const players = (game.players && game.players.length) ? game.players : [game.input];
    if (!G.leans || G.leans[0] !== G.lean) G.leans = [G.lean];
    while (G.leans.length < players.length) G.leans.push(freshLean());
    if (G.leans.length > players.length) G.leans.length = players.length;
    readOne(game, players[0], G.lean, dt, true);
    for (let i = 1; i < players.length; i++) readOne(game, players[i], G.leans[i], dt, false);
  }

  function installShellCss() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('spine-shell-css')) {
      const st = document.createElement('style');
      st.id = 'spine-shell-css';
      st.textContent = '@media (min-height:700px){.esh-mod{zoom:1.5}}@media (min-height:1000px){.esh-mod{zoom:2}}.esh button:focus,.esh input:focus{outline:3px solid var(--accent);outline-offset:2px}[data-sys=need]{background:rgba(5,3,12,.35)!important;align-items:flex-end!important}';
      document.head.appendChild(st);
    }
    if (!G._hoverFocus) {
      G._hoverFocus = true;
      document.addEventListener('pointerover', function (e) {
        const b = e.target && e.target.closest && e.target.closest('.esh-sh button:not(:disabled), .esh-sh input:not(:disabled)');
        if (b && e.pointerType === 'mouse') b.focus({ preventScroll: true });
      });
    }
  }

  function saveWrite() {
    if (G.attracting || G.inSession) return;
    const p = JSON.parse(JSON.stringify(G.profile));
    return { data: p, place: 'Day ' + p.day + '  ' + p.name, level: p.day };
  }
  function saveRead(save) {
    const d = (save && save.data) || {};
    const next = G.freshProfile(d.slot || 0);
    Object.assign(next, d);
    if (!next.look) next.look = { hair: 0, skin: 1, top: 0, bottom: 0 };
    if (!next.flags) next.flags = { arrival: false, tareDay: false, games: false };
    if (!next.unlocks) next.unlocks = [];
    if (!next.played) next.played = {};
    if (!next.bestPct) next.bestPct = {};
    if (!next.spineDays) next.spineDays = [next.spine || 71];
    G.profile = next;
  }

  function wireHub(game) {
    if (!G.inSession || typeof AIHub === 'undefined' || !AIHub.on || !AIHub.connect) return;
    AIHub.on('message', function (d, from) {
      if (!d || d.t !== 'g') return;
      const gh = { t: 'g', a: d.a, l: d.l, p: d.p, w: d.w, s: d.s, from: from, name: String(from || 'ghost'), color: '#8fd3f4' };
      const i = G.ghosts.findIndex(function (q) { return q.from === from; });
      if (i >= 0) G.ghosts[i] = gh;
      else G.ghosts.push(gh);
      if (G.ghosts.length > 8) G.ghosts.shift();
    });
    AIHub.on('leave', function (info) {
      const id = info && info.id;
      G.ghosts = G.ghosts.filter(function (q) { return q.from !== id; });
    });
    AIHub.on('time-up', function () { G.hubTimeUp(); });
    AIHub.on('end', function () { G.hubEnd(); });
    AIHub.on('card', function (c) { G.hubCard = c || {}; });
    const pending = AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
    if (pending && pending.then) {
      pending.then(function (info) {
        if (!info) {
          if (game.sceneName === 'round') game.go('title');
          return;
        }
        G.hubInfo = info;
        const ready = function () { try { AIHub.ready(); } catch (e) { /* not welcomed yet */ } };
        if (game.booted && game.booted.then) game.booted.then(ready);
        else ready();
      });
    }
  }

  G.boot = function (opts) {
    opts = opts || {};
    if (G.game) {
      try { G.game.dispose(); } catch (e) { /* already gone */ }
      try { E.store.clear(); } catch (e) { /* no store */ }
      G.game = null;
    }
    G.inSession = typeof AIHub !== 'undefined' && !!AIHub.active;
    G.profile = G.freshProfile(0);
    G.driver = null;
    G.attracting = false;
    G.session = null;
    G.talk = null;
    G.idleSteps = 0;
    G.queue = null;
    G.chainAfter = null;
    G.hubOver = false;
    G.hubReported = false;
    G.hubInfo = null;
    G.hubCard = null;
    G.ghosts = [];
    G.seen = {};
    G.podium = null;
    G.phase = 'menu';
    G.left = 0;
    G.subtitle = '';
    G._keyAt = 0;
    G._breathLatch = false;
    G._attractMouse = -99;
    G.lean = { ux: 0, uy: 0, breath: 0, effort: 0, source: 'keys', jump: false, catchL: false, catchR: false, paceL: false, paceR: false };
    G.leans = [G.lean];
    if (G.dev && G.dev.reset) G.dev.reset();
    if (G.dev) { G.dev.panel = false; G.dev.on = false; G.dev.tool = 0; G.dev.bot = null; }

    const game = new E.Game({
      canvas: 'screen',
      id: 'spinewee',
      res: 'ps1',
      expand: true,
      touch: 'never',
      input: G.INPUT,
      autoPause: !G.inSession,
      live: !!G.inSession,
      fullscreen: G.inSession ? false : 'button',
      views: ['brawler', 'threequarter', 'side'],
      headless: opts.headless || typeof document === 'undefined',
      draw: !!opts.draw,
      menu: {
        quit: G.inSession ? false : 'title',
        items: G.inSession ? [] : [
          ['Restart Session', function () {
            const slot = (G.profile && G.profile.slot) || 0;
            G.profile = G.freshProfile(slot);
            G.profile.flags.arrival = true;
            G.driver = null;
            G.session = null;
            if (game.shell && game.shell.hide) game.shell.hide();
            game.go('bungalow');
          }],
          ['Dev Mode', function () {
            if (G.inSession) return;
            if (game.shell && game.shell.hide) game.shell.hide();
            G.dev.open();
          }]
        ],
        settings: [
          { key: 'music', value: 0.1 },
          { key: 'glyphs', value: 'playstation' },
          { key: 'voice', label: 'Voice', type: 'slider', value: 0.8, min: 0, max: 1, step: 0.05, apply: function (g, v) { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
          { key: 'gentle', label: 'Gentle Mode', type: 'toggle', value: false },
          { key: 'breathMode', label: 'Breath', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']] },
          { key: 'tips', label: "Tare's Tips", type: 'toggle', value: true }
        ],
        controls: {
          up: 'Lean up', down: 'Lean down', left: 'Lean left', right: 'Lean right',
          breath: 'Breathe', catchL: 'Catch left', catchR: 'Catch right',
          jump: 'Jump', paceL: 'Pace left', paceR: 'Pace right',
          stepL: 'Step left', stepR: 'Step right', stepU: 'Step up', stepD: 'Step down',
          more: 'More', retry: 'Again', interact: 'Use'
        },
        saves: { slots: 3, version: 1, write: saveWrite, read: saveRead }
      }
    });
    if (game.headless || opts.headless) game.fadeTime = 0;
    new E.Shell(game, {
      theme: {
        ink: '#20404c', paper: '#f7fbfb', accent: '#14a8c8', muted: '#5f7f8a',
        danger: '#e0553a', line: '#c8dde2', font: 'system-ui, sans-serif', titleFont: 'system-ui, sans-serif'
      }
    });
    installShellCss();
    try { G.installAudio(game); } catch (e) { /* sound stays quiet until a gesture */ }
    G.game = game;

    game.hook('input', function () {
      if (!G.attracting) return;
      const I = game.input;
      const stick = Math.hypot(I.padMove[0], I.padMove[1]) > 0.2;
      const mouse = I.mouse && I.mouse.t > (G._attractMouse == null ? -99 : G._attractMouse);
      if (I.anyPressed() || stick || mouse) {
        I.consumeAll();
        G.attracting = false;
        G.driver = null;
        G.session = null;
        G._attractMouse = I.mouse.t;
        game.go('title');
      }
    });
    game.hook('step', function (dt) {
      readLean(game, dt);
      const I = game.input;
      if (G.dev && G.dev.panel && I.pressed('more')) {
        const n = (G.dev.tools && G.dev.tools.length) || 1;
        G.dev.tool = (G.dev.tool + 1) % n;
      }
      const moved = I.anyPressed() || I.down('left') || I.down('right') || I.down('up') || I.down('down') || Math.hypot(I.padMove[0], I.padMove[1]) > 0.2;
      if (!topIdle(game) || moved) {
        if (moved) G.idleSteps = 0;
      } else {
        G.idleSteps += 1;
        if (G.idleSteps >= 1200 && game.time >= 9.999) G.startAttract();
      }
    });

    const scenes = G.wireScenes(game);
    let scene = 'title';
    let data = {};
    const hash = hashScene();
    if (G.inSession) scene = 'round';
    else if (hash === '#hub') scene = 'round';
    else if (hash === '#ending') { G.profile.ending = true; scene = 'ending'; }
    else if (hash.indexOf('#act/') === 0) {
      const parts = hash.slice(5).split('/');
      scene = 'play';
      data = { id: parts[0] || 'stork', tier: +parts[1] || 1, trial: true, skipToPlay: true };
    } else if (hash.indexOf('#day/') === 0) {
      const n = Math.max(1, Math.min(5, +hash.slice(5) || 1));
      G.profile.day = n;
      G.profile.flags.arrival = true;
      if (G.GUIDE[n]) G.profile.suggestion = G.GUIDE[n][0];
      scene = 'bungalow';
    }
    game.start({ scenes: scenes, scene: scene, data: data });
    wireHub(game);
    try { G.capture(); } catch (e) { /* the first scene still draws */ }
    return game;
  };

  if (typeof document !== 'undefined' && !G._noAuto) G.boot();
})();
