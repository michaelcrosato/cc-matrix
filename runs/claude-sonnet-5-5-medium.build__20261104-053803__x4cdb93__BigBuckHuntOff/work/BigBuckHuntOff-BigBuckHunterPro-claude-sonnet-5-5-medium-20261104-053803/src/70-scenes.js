/* Game shell and the front-end scenes: title, menu, lodge, about, attract. */
(() => {
const BB = globalThis.BB, E = BB.E, px = E.px, clamp = BB.clamp, txt = BB.txt;
const SH = E.Input.SHMUP;
const INPUT = {
  up: SH.up, down: SH.down, left: SH.left, right: SH.right, start: SH.start, pause: SH.pause, confirm: SH.confirm, cancel: SH.cancel,
  fire: ['Mouse0', 'Space', 'Pad7'], pump: ['KeyR', 'Mouse1', 'Pad2', 'Pad5'], scope: ['Mouse2', 'KeyQ', 'Pad6'], breath: ['ShiftLeft', 'ShiftRight', 'Pad4'], call: ['KeyE', 'KeyC', 'Pad3']
};
BB.INPUT = INPUT;
BB.makeGame = (opts = {}) => {
  const game = new E.Game(Object.assign({
    canvas: opts.headless ? undefined : 'screen', res: [480, 270], expand: true, bg: '#000', input: INPUT, headless: !!opts.headless,
    menu: {
      items: [['Restart site', () => BB.pauseAction('site')], ['Restart hunt', () => BB.pauseAction('hunt')], ['Dev mode', () => BB.pauseAction('dev')]],
      settings: [
        { key: 'glyphs', label: 'Button glyphs', options: ['PlayStation', 'Xbox'], value: 'PlayStation', group: 'Game' },
        { key: 'assist', label: 'Aim assist', options: ['Off', 'Light', 'Strong'], value: 'Light', group: 'Game' },
        { key: 'autopump', label: 'Auto-pump', options: ['Off', 'On'], value: 'Off', group: 'Game' },
        { key: 'scopeToggle', label: 'Scope', options: ['Hold', 'Toggle'], value: 'Hold', group: 'Game' },
        { key: 'rule', label: 'Doe rule', options: ['Classic', 'Casual'], value: 'Classic', group: 'Game' }
      ],
      controls: { fire: 'Fire', pump: 'Pump', scope: 'Scope', breath: 'Hold breath', call: 'Call', confirm: 'Confirm', cancel: 'Back' },
      quit: 'title'
    }
  }, opts.extra || {}));
  BB.game = game; return game;
};

/* ---------- vista backdrop (title, menus, dialog) ---------- */
BB.makeBackdrop = (siteId, anim) => {
  const ctx = BB.createSite(siteId, [], { mode: 'backdrop' }); ctx.state = 'backdrop';
  const sp = ctx.hunt.species;
  const mk = (sex, pts, b, r, pose, face) => { const [x, y] = BB.polar(b, r); const a = BB.makeAnimal({ species: sp, sex, pts, x, y, face: face || 1 }, ctx); a.mode = 'graze'; a.linger = 9999; a.grazeT = BB.rand(1, 3, 'ai'); ctx.animals.push(a); };
  if (anim !== false) { mk('male', 10, -12, 44, 'graze', 1); mk('female', 0, 4, 52, 'graze', -1); mk('male', 8, 22, 64, 'graze', -1); mk('female', 0, -26, 58, 'graze', 1); }
  ctx.panT = 0;
  return ctx;
};
BB.updateBackdrop = (ctx, dt) => {
  ctx.sceneTime += dt; ctx.t += dt; ctx.panT += dt;
  ctx.view.yaw = (-8 + Math.sin(ctx.panT * .09) * 12) * Math.PI / 180; BB.updateView(ctx.view);
  for (const a of ctx.animals) { BB.updateAnimal(a, dt, ctx); }
};

/* ---------- idle / attract ---------- */
let idle = 0, lastPtr = null;
BB.anyInput = () => {
  const I = BB.game.input; if (!I) return false;
  let any = I.anyPressed();
  const pm = I.padMove || [0, 0]; if (Math.hypot(pm[0], pm[1]) > .3 || (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .3)) any = true;
  const p = I.pointer ? I.pointer() : null; if (p) { if (lastPtr && Math.hypot(p[0] - lastPtr[0], p[1] - lastPtr[1]) > 3) any = true; lastPtr = p.slice(); }
  return any;
};
BB.idleTick = (dt, goAttract) => { if (BB.anyInput()) idle = 0; else { idle += dt; if (idle >= 10 && !BB.dev.open) { idle = 0; goAttract(); } } };
BB.resetIdle = () => { idle = 0; };
BB.idleValue = () => idle;

BB.touchOnly = () => { try { return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches; } catch (e) { return false; } };

/* ---------- main menu ---------- */
BB.party = [{ type: 'human', input: null }];
const HUNT_BLURB = { hollow: 'Autumn morning. Whitetail deer. Uncle Dub guides.', bugle: 'Alpine dusk. Elk. Loretta runs the trap house.', muskeg: 'First snow. Moose. Big Earl has the chili.' };
function menuPages(M) {
  const go = (p) => { M.stack.push(p); M.menu = null; };
  const startHunt = (huntId, mode) => BB.startRun(mode, { hunt: huntId });
  return {
    main: () => [
      { label: 'HUNT-OFF', desc: 'The campaign. Three hunts, a trophy and a bonus game each. Climb the standings.', fn: () => BB.startRun('huntoff', { hunt: 'hollow' }) },
      { label: 'SINGLE HUNT', desc: 'One hunt: three sites, a trophy and a bonus game.', fn: () => go('single') },
      { label: 'PARTY HUNT', desc: 'Up to four on one screen. Own reticles, shared deer. First hit takes it.', fn: () => go('party') },
      { label: 'BONUS GAMES', desc: 'Crow Patrol, Saucer Season and Snowball Standoff, on their own.', fn: () => go('bonus') },
      { label: 'PRACTICE RANGE', desc: "Uncle Dub's seven stations. Aim, pump, scope, call.", fn: () => BB.startRun('range', {}) },
      { label: 'THE LODGE', desc: 'Your trophy wall, stars and high scores.', fn: () => BB.game.go('lodge') },
      { label: 'SETTINGS', desc: 'Glyphs, aim assist, auto-pump, sound and controls.', fn: () => BB.game.menu('settings') },
      { label: 'ABOUT & CREDITS', desc: 'Source information, feedback and credits.', fn: () => BB.game.go('about') }
    ],
    single: () => BB.HUNT_LIST.map(h => ({ label: BB.HUNTS[h].name.toUpperCase(), badge: BB.huntStars(h) + '★', desc: HUNT_BLURB[h], hunt: h, fn: () => startHunt(h, 'single') })),
    bonus: () => BB.BONUS_ORDER.map(b => ({ label: BB.BONUS[b].name.toUpperCase(), desc: BB.BONUS[b].desc, fn: () => BB.startRun('bonus', { bonus: b }) })),
    party: () => [
      ...BB.HUNT_LIST.map(h => ({ label: 'HUNT: ' + BB.HUNTS[h].name.toUpperCase(), desc: HUNT_BLURB[h], fn: () => BB.startRun('party', { hunt: h }) })),
      { label: 'ADD BOT HUNTER', desc: 'Fill an empty seat with a bot (novice, average, expert).', fn: () => { if (BB.party.length < 4) { BB.party.push({ type: 'bot', skill: ['novice', 'average', 'expert'][BB.party.length % 3] }); BB.sfx('uiOk'); } } },
      { label: 'REMOVE LAST', desc: 'Free the last seat.', fn: () => { if (BB.party.length > 1) { const l = BB.party.pop(); if (l.type === 'human' && l.input) BB.game.removePlayer(l.input); } } }
    ]
  };
}
BB.huntStars = h => BB.HUNT_PLAN[h].sites.reduce((s, id) => s + (BB.records.stars[id] || 0), 0);

/* ---------- scenes ---------- */
BB.buildScenes = (game) => {
  const scenes = {};
  /* title */
  scenes.title = {
    view: 'overhead', pausable: false,
    enter() { BB.bg = BB.makeBackdrop('hollow1'); BB.music('title'); BB.resetIdle(); BB.curSite = null; BB.titleT = 0; game.allowJoin(false); game.timeScale = 1; },
    update(dt) {
      BB.titleT += dt; BB.updateBackdrop(BB.bg, dt); const I = game.input;
      const clk = I.clicked && I.clicked();
      if (clk && BB.settingsRect && clk[0] >= BB.settingsRect[0] && clk[0] < BB.settingsRect[0] + BB.settingsRect[2] && clk[1] >= BB.settingsRect[1] && clk[1] < BB.settingsRect[1] + BB.settingsRect[3]) { game.menu('settings'); return; }
      if (BB.titleT > .3 && (I.pressed('start') || I.pressed('confirm') || (clk && !BB.touchOnly()))) { BB.sfx('uiOk'); game.go('menu'); return; }
      BB.idleTick(dt, () => game.go('attract'));
    },
    draw(r) {
      r.overlay(g => {
        const W = r.W, H = r.H; BB.renderMain(g, BB.bg, BB.bg.sceneTime); BB.FG.knoll(g, BB.bg.view, 0); BB.drawWeather(g, BB.bg.view, BB.bg.hunt, 1 / 60);
        px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W, H, '#10121e'));
        const bob = Math.sin(BB.titleT * 1.5) * 2;
        E.font.title(g, 'BIG BUCK', W / 2, 30 + bob, { scale: 4, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608', depth: 3, depthColor: '#5a2a0a', align: 'center' });
        E.font.title(g, 'HUNT-OFF', W / 2, 74 + bob, { scale: 4, colors: ['#ff8a5a', '#c0392b'], outline: '#2a0a08', depth: 3, depthColor: '#5a1608', align: 'center' });
        const tag = 'THE 41ST ANNUAL BUCKS-ONLY SHOOTING MATCH'; txt(g, tag, W / 2 - BB.tw(tag) / 2, 116, '#fff3c8');
        if (BB.touchOnly() || (game.input.lastDevice === 'touch')) {
          const m = 'CONTROLLER OR KEYBOARD REQUIRED'; E.ui.box(g, W / 2 - BB.tw(m) / 2 - 10, H - 70, BB.tw(m) + 20, 22, { bg: ['#3a1a1a', '#220f0f'], border: '#ff7a6a', alpha: .95 }); txt(g, m, W / 2 - BB.tw(m) / 2, H - 63, '#ffb0a0');
        } else if (Math.floor(BB.titleT * 2) % 2 === 0) { const p = 'PRESS START'; txt(g, p, W / 2 - BB.tw(p, { scale: 2 }) / 2, H - 68, '#ffffff', { scale: 2 }); }
        BB.prompts(g, [['start', 'START']], W / 2, H - 46, 'center');
        /* settings button (touch-only devices and everyone) */
        const sw = 62, sx = W - sw - 8, sy = H - 22; BB.settingsRect = [sx, sy, sw, 16]; E.ui.box(g, sx, sy, sw, 16, { bg: ['#1d2236', '#101426'], border: '#7a86b8', alpha: .9 }); txt(g, 'SETTINGS', sx + 8, sy + 5, '#c8d0f0');
        txt(g, 'v' + BB.VERSION + ' • ' + E.versionLabel().split(' ')[0], 6, H - 12, '#8a90b0');
        txt(g, '© 2026 WHISKER LAKE LODGE', W / 2 - 60, H - 12, '#8a90b0');
      });
    }
  };
  /* menu */
  const M = { stack: ['main'], menu: null, pages: null, party: false };
  BB.menuState = M;
  const ensure = () => {
    const key = M.stack[M.stack.length - 1];
    if (!M.menu || M.menu.key !== key) {
      M.pages = M.pages || menuPages(M);
      const items = M.pages[key](); M.menu = new BB.Menu(items); M.menu.key = key;
      if (key === 'party') { game.allowJoin({ max: 4, keys: false, onJoin: (inp) => { BB.party.push({ type: 'human', input: inp }); } }); BB.party = BB.party.slice(0, 1); BB.party[0].input = game.input; } else if (M.partyOpen) { game.allowJoin(false); }
      M.partyOpen = key === 'party';
    }
  };
  scenes.menu = {
    view: 'overhead', pausable: false,
    enter(d) { BB.bg = BB.makeBackdrop('hollow1'); BB.music('title'); BB.resetIdle(); M.stack = ['main']; M.menu = null; M.pages = null; BB.party = [{ type: 'human', input: game.input }]; game.timeScale = 1; BB.curSite = null; },
    exit() { if (M.partyOpen) { game.allowJoin(false); M.partyOpen = false; } },
    update(dt) {
      BB.updateBackdrop(BB.bg, dt); ensure();
      const out = M.menu.update(game.input, dt);
      if (out.pick && out.pick.fn) out.pick.fn();
      if (out.back) { if (M.stack.length > 1) { const was = M.stack.pop(); if (was === 'party') { for (const q of game.players.slice(1)) game.removePlayer(q); BB.party = [{ type: 'human', input: game.input }]; game.allowJoin(false); M.partyOpen = false; } M.menu = null; } else game.go('title'); }
      BB.idleTick(dt, () => game.go('attract'));
    },
    draw(r) {
      r.overlay(g => {
        const W = r.W, H = r.H; ensure(); BB.renderMain(g, BB.bg, BB.bg.sceneTime); BB.drawWeather(g, BB.bg.view, BB.bg.hunt, 1 / 60);
        px.blend(g, .62, 'normal', () => px.rect(g, 0, 0, W, H, '#0c0e1a'));
        const key = M.stack[M.stack.length - 1], titles = { main: 'MAIN MENU', single: 'SINGLE HUNT', bonus: 'BONUS GAMES', party: 'PARTY HUNT' };
        E.font.title(g, titles[key], 16, 12, { scale: 2, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608' });
        const lw = 200, h = key === 'main' ? 24 : 28; BB.drawList(g, M.menu, 16, 40, lw, h);
        /* description card */
        const it = M.menu.cur, cx = 236, cw = W - cx - 12; E.ui.box(g, cx, 40, cw, 140, { bg: ['#1b2240', '#10152a'], border: '#ffd36a', alpha: .95 });
        if (it) { const lines = E.font.wrap(it.desc || '', cw - 16); lines.forEach((l, i) => txt(g, l, cx + 8, 48 + i * 11, '#e8e4ff')); }
        if (key === 'single' && it && it.hunt) { const hu = BB.HUNTS[it.hunt]; const a = { species: hu.species, sex: 'male', age: 'adult', pts: 10, face: 1, phase: 0, gait: 'stand', pose: 'alert', mode: 'stand' }; BB.drawAnimal(g, a, cx + cw / 2, 168, 38, null, { scale: BB.SPECIES[hu.species].size }); txt(g, hu.time + ' • ' + hu.species.toUpperCase(), cx + 8, 134, hu.hudColor); }
        if (key === 'party') {
          const y0 = 146; for (let i = 0; i < 4; i++) { const p = BB.party[i], x = cx + 6 + i * (cw - 8) / 4; px.rect(g, x, y0, (cw - 14) / 4, 28, '#0e1224'); px.rect(g, x, y0, (cw - 14) / 4, 2, BB.COLORS[i]); txt(g, 'P' + (i + 1), x + 4, y0 + 6, BB.COLORS[i]); txt(g, p ? (p.type === 'bot' ? 'BOT ' + p.skill.slice(0, 3).toUpperCase() : i === 0 ? 'YOU' : 'READY') : 'PRESS', x + 4, y0 + 16, p ? '#fff' : '#7a7a90'); }
          const msg = 'Press ' + BB.glyphLabel('join', 'pad') + ' on a free pad to join'; txt(g, msg, cx + 8, 184, '#9fb0d8');
        }
        BB.prompts(g, [['confirm', 'SELECT'], ['cancel', 'BACK']], W / 2, H - 20, 'center');
        if (BB.records.champion) txt(g, '★ HUNT-OFF CHAMPION', W - 130, 14, '#ffe27a');
      });
    }
  };
  /* lodge */
  scenes.lodge = {
    view: 'overhead', pausable: false,
    enter() { BB.music('lodge'); BB.lodgeT = 0; BB.lodgePage = 0; },
    update(dt) { BB.lodgeT += dt; const I = game.input; if (I.pressed('cancel') || (I.pressed('confirm') && BB.lodgeT > .3)) game.go('menu'); if (I.pressed('left')) BB.lodgePage = 0; if (I.pressed('right')) BB.lodgePage = 1; },
    draw(r) {
      r.overlay(g => {
        const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#3a2616'); for (let y = 0; y < H; y += 14) px.rect(g, 0, y, W, 1, '#2c1c10'); px.rect(g, 0, H - 40, W, 40, '#5a3a20'); px.rect(g, 0, H - 40, W, 2, '#7a5430');
        E.font.title(g, 'THE LODGE', W / 2, 8, { scale: 3, colors: ['#ffe27a', '#d9822a'], outline: '#1a0e06', align: 'center' });
        const mounts = [['ironrack', 'OLD IRON RACK', 'whitetail', 14], ['duke', 'THE DUKE', 'elk', 14], ['bigmo', 'BIG MO', 'moose', 72]];
        mounts.forEach((m, i) => {
          const x = 70 + i * ((W - 140) / 2), y = 106, got = BB.records.mounts[m[0]];
          E.ui.box(g, x - 56, 44, 112, 100, { bg: ['#2a1c10', '#1c1209'], border: got ? '#ffd36a' : '#5a4a3a', alpha: 1 });
          const a = { species: m[2], sex: 'male', age: 'adult', pts: m[3], face: 1, phase: 0, gait: 'stand', pose: 'alert', mode: 'stand' };
          const msc = BB.SPECIES[m[2]].size; if (got) BB.drawAnimal(g, a, x, y + 22, 46 / msc, null, { scale: msc }); else { BB.drawAnimal(g, a, x, y + 22, 46 / msc, null, { xray: true, scale: msc }); px.blend(g, .7, 'normal', () => px.rect(g, x - 54, 46, 108, 96, '#150d06')); txt(g, 'EMPTY MOUNT', x - 28, y - 4, '#8a7a6a'); }
          txt(g, m[1], x - BB.tw(m[1]) / 2, 134, got ? '#ffe27a' : '#8a7a6a');
        });
        let tot = 0, max = 0; for (const h of BB.HUNT_LIST) for (const s of BB.HUNT_PLAN[h].sites) { tot += BB.records.stars[s] || 0; max += 3; }
        txt(g, 'STARS ' + tot + '/' + max, 20, 156, '#ffe27a'); txt(g, 'RANGE BADGE: ' + (BB.records.range ? 'EARNED' : 'NOT YET'), 120, 156, BB.records.range ? '#9fe08a' : '#8a7a6a'); txt(g, 'HUNT-OFF CHAMPION: ' + (BB.records.champion ? 'YES' : 'NO'), 250, 156, BB.records.champion ? '#9fe08a' : '#8a7a6a');
        txt(g, 'KILLS ' + BB.records.kills, 400, 156, '#c8c8dc');
        /* high-score table */
        const t = BB.records.tables['huntoff'] || []; E.ui.box(g, 20, 170, W - 40, 56, { bg: ['#1b1208', '#120c06'], border: '#7a5430', alpha: 1 });
        txt(g, 'HUNT-OFF STANDINGS', 28, 174, '#ffd36a'); if (!t.length) txt(g, 'NO ENTRIES YET. GO WIN SOMETHING.', 28, 190, '#8a7a6a'); t.slice(0, 4).forEach((e, i) => txt(g, (i + 1) + '. ' + e.name + '  ' + BB.fmt(e.score), 28 + (i % 2) * 210, 188 + Math.floor(i / 2) * 12, '#fff'));
        BB.prompts(g, [['cancel', 'BACK']], W / 2, H - 20, 'center');
      });
    }
  };
  /* about */
  scenes.about = {
    view: 'overhead', pausable: false,
    enter() { BB.aboutPage = 0; BB.aboutScroll = 0; BB.music('lodge'); },
    update(dt) {
      const I = game.input, n = BB.REPORT_PAGES.length;
      if (I.pressed('cancel')) game.go('menu');
      if (I.pressed('left') || I.pressed('confirm') && false) BB.aboutPage = (BB.aboutPage + n - 1) % n; if (I.pressed('right') || I.pressed('confirm')) BB.aboutPage = (BB.aboutPage + 1) % n;
      if (I.repeat('down', .3, .05)) BB.aboutScroll += 14; if (I.repeat('up', .3, .05)) BB.aboutScroll = Math.max(0, BB.aboutScroll - 14);
      if (I.padAim) BB.aboutScroll = Math.max(0, BB.aboutScroll + I.padAim[1] * 4);
      const clk = I.clicked && I.clicked(); if (clk) BB.aboutPage = (BB.aboutPage + 1) % n;
    },
    draw(r) {
      r.overlay(g => {
        const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#10131f'); const pg = BB.REPORT_PAGES[BB.aboutPage];
        E.font.title(g, 'ABOUT & CREDITS', 12, 6, { scale: 2, colors: ['#ffe27a', '#d9822a'], outline: '#2a1608' });
        BB.REPORT_PAGES.forEach((p, i) => { txt(g, p.tab, 12 + i * 86, 28, i === BB.aboutPage ? '#ffe27a' : '#6a7090'); });
        px.rect(g, 8, 40, W - 16, 1, '#3a4264');
        const lines = BB.reportLines(pg, W - 36); const maxS = Math.max(0, lines.length * 10 - (H - 90)); BB.aboutScroll = Math.min(BB.aboutScroll, maxS);
        g.save(); g.beginPath(); g.rect(0, 44, W, H - 80); g.clip();
        lines.forEach((l, i) => txt(g, l.t, 16 + (l.ind || 0), 46 + i * 10 - BB.aboutScroll, l.c || '#d8d8ec'));
        g.restore(); px.reset(g);
        BB.prompts(g, [['tab', 'PAGE'], ['cancel', 'BACK']], W / 2, H - 20, 'center');
      });
    }
  };
  return scenes;
};
})();
