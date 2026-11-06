/* GAME START — arcade kit lifecycle adapted for simultaneous defense and a shared Hub world. */
(function (root) {
  'use strict';
  const E = root.My3D2dge, A = root.ABJ, { px } = E, { text, frame, planet, gold, pale } = A.paint;
  const KEYS = {
    up: ['ArrowUp', 'KeyW', 'Pad12', 'PadAxisUp'], down: ['ArrowDown', 'KeyS', 'Pad13', 'PadAxisDown'],
    left: ['ArrowLeft', 'KeyA', 'Pad14', 'PadAxisLeft'], right: ['ArrowRight', 'KeyD', 'Pad15', 'PadAxisRight'],
    fire: ['Space', 'Mouse0', 'Pad0', 'Pad7'], repair: ['KeyQ', 'Mouse2', 'Pad2', 'Pad4'],
    confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'], pause: ['Escape', 'Pad9'], start: ['Enter', 'Pad9'], menu: ['Act:menu'],
    halves: { left: { fire: ['Space', 'KeyF', 'Mouse0'], repair: ['KeyQ', 'KeyG', 'Mouse2'], confirm: ['Enter', 'Space'], cancel: ['Escape'] }, right: { fire: ['Period', 'Numpad1'], repair: ['Slash', 'Numpad2'] } }
  };
  const game = new E.Game({ canvas: 'screen', res: [480, 270], expand: true, view: 'overhead', views: ['overhead'], draw: true, input: KEYS, id: 'astro-battle-jam-v1', menu: false, corner: false, fullscreen: 'button', autoPause: false, camera: { zoom: false } });
  game.settings.define({ key: 'music', value: .10, group: 'Sound', label: 'Music', type: 'slider', min: 0, max: 1, step: .05, apply: (g, v) => { g.audio.musicVolume = v; g.audio.applyVolume(); } });
  game.settings.define({ key: 'glyphs', value: 'playstation', group: 'Controller', label: 'Button glyphs', type: 'select', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { for (const i of g.players) i.glyphs = v; } });
  game.settings.define({ key: 'voice', value: .65, group: 'Sound', label: 'Alien voices', type: 'slider', min: 0, max: 1, step: .05, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } });
  game.settings.define({ key: 'touchAssist', value: true, group: 'Touch', label: 'Assisted touch fire' });
  for (const [key, d] of Object.entries(A.TUNING)) game.settings.define({ key: 'jam_' + key, label: d.label, group: 'Balance', type: 'slider', value: d.value, min: d.min, max: d.max, step: d.step, help: d.help });
  // Versioned local records are deliberately independent of run state and attract randomness.
  let records = [];
  try { const saved = E.store.get('jam-records-v1', null); if (saved?.version === 1 && Array.isArray(saved.entries)) records = saved.entries.filter(r => r && Number.isFinite(r.score) && Number.isInteger(r.difficulty) && typeof r.coop === 'boolean').slice(0, 80); } catch {}
  const app = {
    game, screen: 'title', focus: 0, stack: [], rows: [], difficulty: 1, seats: 1, sim: null, session: null,
    idle: 0, elapsed: 0, uiTime: 0, gate: true, pointer: null, pointerPending: null, pointerTarget: null,
    primary: 'keyboard', touch: false, contacts: new Map(), touchId: null, touchX: 0, touchRepair: false,
    demo: null, demoTime: 0, demoScene: -1, diagnostics: false, timeScale: 1, stepOnce: false, seed: 1979,
    aboutPage: 0, resultSaved: false, lastOutcome: null, backFocus: {}, state: null, ended: false,
    records, report: A.REPORT, devType: 0, deviceSeats: [], lastPadState: new Map(), activity: false, flash: 0
  };
  const view = new A.View(game), audio = new A.Audio(game); app.view = view; app.audio = audio;
  view.onEvent = e => audio.event(e);
  const isMenu = () => !['play', 'attract', 'hubwait', 'hubend'].includes(app.screen);
  const inRun = () => !!app.sim || !!app.session;
  const state = () => app.session?.state || app.sim?.s || app.demo?.s || app.state;
  const clearInput = () => { for (const i of game.players) i.consumeAll(); app.pointerPending = null; app.touchRepair = false; app.pointerTarget = null; app.gate = true; };
  const resetOwnership = () => { game.timeScale = 1; app.timeScale = 1; app.stepOnce = false; app.diagnostics = false; game.paused = false; app.contacts.clear(); app.touchId = null; app.pointerTarget = null; };
  function show(name, push = true) {
    if (push) { app.stack.push({ screen: app.screen, focus: app.focus }); app.backFocus[app.screen] = app.focus; }
    app.panelReveal = game.reduceMotion ? 1 : 0; game.tween(app, { panelReveal: 1 }, .16, { ease: 'outCubic' });
    app.screen = name; app.focus = app.backFocus[name] || 0; app.idle = 0; app.rows = []; clearInput();
    game.allowJoin(name === 'lobby' && app.seats === 2 && !app.session ? { max: 2, onJoin: () => { app.idle = 0; } } : false);
    layoutRows();
  }
  function back() {
    if (app.screen === 'play') { show('pause'); return; }
    const prev = app.stack.pop();
    if (prev) { app.screen = prev.screen; app.focus = prev.focus; app.idle = 0; game.allowJoin(app.screen === 'lobby' && app.seats === 2 && !app.session ? { max: 2 } : false); clearInput(); layoutRows(); }
    else if (app.session) { app.screen = app.ended ? 'hubend' : 'play'; clearInput(); }
    else title();
  }
  function title() {
    if (app.session) return;
    resetOwnership(); app.sim = null; app.demo = null; app.stack = []; app.screen = 'title'; app.focus = 0; app.idle = 0; app.resultSaved = false;
    app.logoReveal = game.reduceMotion ? 1 : 0; game.tween(app, { logoReveal: 1 }, .4, { ease: 'outCubic' });
    game.allowJoin(false); while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);
    game.input.use(KEYS); clearInput(); view.reset(); audio.song(0); layoutRows();
  }
  function lobby(n) { if (n === 1) while (game.players.length > 1) game.removePlayer(game.players.at(-1)); app.seats = n; app.resultSaved = false; show('lobby'); }
  function start() {
    if (app.session) return;
    if (app.seats === 2 && game.players.length < 2) return;
    resetOwnership(); game.allowJoin(false); app.stack = []; app.screen = 'play'; app.focus = 0;
    app.accumulator = 0; app.testCommands = null; app.sim = new A.Sim({ seed: app.seed, difficulty: app.difficulty, players: Array.from({ length: app.seats }, (_, i) => i) });
    app.demo = null; app.resultSaved = false; app.lastOutcome = null; view.reset(); clearInput();
    for (const [k, v] of Object.entries(app.sim.s.tuning)) game.settings.set('jam_' + k, v);
    audio.location = -1; audio.song(0);
  }
  function assisted() { if (!app.session && app.sim) app.sim.s.assisted = true; }
  function changeBalance(key, value) { if (app.session || !app.sim) return; assisted(); app.sim.s.tuning[key] = game.settings.set('jam_' + key, value); }
  function resetBalance() {
    if (app.session || !app.sim) return;
    assisted(); game.settings.reset('Balance'); const defaults = A.defaults(app.difficulty);
    for (const [k, v] of Object.entries(defaults)) { game.settings.set('jam_' + k, v); app.sim.s.tuning[k] = v; }
  }
  function encounter(n, phase = 1) { if (app.session || !app.sim) return; assisted(); app.sim.startEncounter(n, phase); app.sim.s.dev.invulnerable = false; app.timeScale = 1; app.stepOnce = false; view.reset(); }
  function spawn(type) {
    if (!app.sim || app.session) return; assisted(); const q = app.sim, s = q.s;
    if (type === 'saucer') { s.saucer = { x: 18, y: 39, dir: 1, pass: s.saucers++ }; return; }
    if (s.boss) { view.toast = { text: 'SELECT A FORMATION BEFORE SPAWNING A MARCHER.', time: 3 }; return; }
    const empty = [];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) if (!s.enemies.some(e => e.row === row && e.col === col)) empty.push({ row, col });
    const cell = empty[0]; if (cell) s.enemies.push({ ...cell, id: q.id(), type, hp: type === 'A' ? 2 : 1, hit: 0, attack: 0 });
    else { const e = s.enemies[0]; e.type = type; e.hp = type === 'A' ? 2 : 1; }
  }
  function selectGame() { app.controlsStart = true; show('controls'); }
  function menuSpec() {
    const s = state(); const disabled = app.session ? 'Hub owns the shared world' : '';
    const btn = (label, fn, help = '', why = '') => ({ label, fn, help, disabled: why });
    const setting = key => { const d = game.settings.spec(key); return { label: d.label, key, help: d.help || '', spec: d }; };
    const bal = key => ({ label: A.TUNING[key].label, key: 'jam_' + key, balance: key, spec: game.settings.spec('jam_' + key), help: A.TUNING[key].help, disabled });
    switch (app.screen) {
      case 'title': return { title: '', kicker: 'A PLANETARY DEFENSE CARTRIDGE', rows: [btn('SOLO DEFENSE', () => lobby(1), 'Three deployments. One planet. Make it count.'), btn('LOCAL CO-OP', () => lobby(2), 'Two cannons, one battlefield, six shared deployments.'), btn('HOW TO PLAY', () => { app.controlsStart = false; show('controls'); }), btn('SETTINGS', () => show('settings')), btn('LOCAL RECORDS', () => show('records')), btn('ABOUT / CREDITS', () => { app.aboutPage = 0; show('about'); })] };
      case 'lobby': return { title: app.seats === 1 ? 'SOLO DEFENSE' : 'LOCAL CO-OP', kicker: 'LOCK IN YOUR DEFENSE', text: app.seats === 2 ? (game.players.length > 1 ? 'BOTH CANNONS READY. YOUR SEATS STAY YOURS.' : 'P2: OPTIONS ON A SPARE PAD, OR 2 ON KEYBOARD.') : 'SIX FORMATIONS. THREE LOCATIONS. ONE FLAGSHIP.', rows: [
        { label: 'DIFFICULTY', value: A.DIFFICULTIES[app.difficulty].name, adjust: d => { app.difficulty = (app.difficulty + d + 4) % 4; }, help: A.DIFFICULTIES[app.difficulty].text },
        btn('CONTROLS & DEPLOY', selectGame, 'Brief controls, then straight into the defense.', app.seats === 2 && game.players.length < 2 ? 'Waiting for the second local player' : ''), btn('BACK', back)
      ] };
      case 'controls': return { title: app.touch ? 'THUMBS AT THE READY' : 'TWO ACTIONS. ONE PLANET.', kicker: 'FIELD MANUAL / ' + (app.touch ? 'TOUCH' : app.primary === 'gamepad' ? game.settings.glyphs.toUpperCase() : 'KEYBOARD & MOUSE'), rows: [btn(app.controlsStart ? 'DEPLOY CANNONS' : 'GOT IT', () => { if (app.controlsStart) start(); else back(); })] };
      case 'pause': return { title: app.session ? 'LOCAL OVERLAY' : 'DEFENSE PAUSED', kicker: app.session ? 'THE SHARED BATTLE CONTINUES' : A.LOCATIONS[s.location].name, rows: [btn('RESUME DEFENSE', () => { app.stack = []; app.screen = 'play'; clearInput(); }), btn('SETTINGS', () => show('settings')), btn('DEVELOPER TOOLS', () => show('dev')), btn('CONTROLS', () => { app.controlsStart = false; show('controls'); }), btn('RESTART RUN', () => start(), '', disabled), btn('RETURN TO TITLE', title, '', disabled)] };
      case 'settings': return { title: 'MAKE YOURSELF AT HOME', kicker: 'SETTINGS', rows: [btn('SOUND', () => show('sound')), btn('COMFORT & CONTROLS', () => show('comfort')), btn('FULL SCREEN', () => { game.fullscreen.toggle(); }, game.fullscreen.supported ? 'Toggle the browser full-screen view.' : 'This browser keeps its own full-screen controls.'), btn('RESET PREFERENCES', () => { for (const group of ['Sound', 'Comfort', 'Controller', 'Touch']) game.settings.reset(group); }, 'Music resets to 10%. Records stay saved.'), btn('BACK', back)] };
      case 'sound': return { title: 'A LITTLE SPACE MUSIC', kicker: 'SOUND / LEFT & RIGHT TO ADJUST', rows: [setting('volume'), setting('music'), setting('effects'), setting('voice'), setting('sound'), btn('BACK', back)] };
      case 'comfort': return { title: 'YOUR KIND OF COSMOS', kicker: 'COMFORT & CONTROLS', rows: [setting('glyphs'), setting('motion'), setting('shake'), setting('flashes'), setting('touchAssist'), btn('BACK', back)] };
      case 'dev': return { title: 'THE MAINTENANCE HATCH', kicker: 'DEVELOPER TOOLS / RUNS BECOME ASSISTED', text: disabled || 'World changes mark this run as assisted.', rows: [btn('ENCOUNTERS & RESOURCES', () => show('encounters')), btn('LIVE BALANCE / CANNON', () => show('balance0')), btn('LIVE BALANCE / INVADERS', () => show('balance1')), btn('LIVE BALANCE / REPAIRS', () => show('balance2')), { label: 'DIAGNOSTIC OVERLAYS', value: app.diagnostics ? 'ON' : 'OFF', adjust: () => { app.diagnostics = !app.diagnostics; }, help: 'Collision edges, tick, seed and telegraph timing.' }, btn('BACK', back)] };
      case 'encounters': return { title: 'QUICK FIELD REPAIRS', kicker: 'DEVELOPER TOOLS', text: disabled || 'ASSISTED CONTROLS / ' + s.tick + ' TICKS / SEED ' + s.seed, rows: [
        { label: 'ENCOUNTER', value: s.encounter === 6 ? 'FLAGSHIP P' + s.boss.phase : 'FORMATION ' + (s.encounter + 1), adjust: d => encounter((s.encounter + d + 7) % 7), disabled, help: 'Left/right selects a formation or the flagship.' },
        btn('FLAGSHIP / CORE PHASE', () => encounter(6, 2), 'Start directly at the exposed core.', disabled),
        { label: 'INVULNERABLE', value: s.dev.invulnerable ? 'ON' : 'OFF', adjust: () => { if (app.sim && !app.session) { assisted(); s.dev.invulnerable = !s.dev.invulnerable; } }, disabled },
        btn('MORE TOOLS', () => show('resources')), btn('BACK', back)
      ] };
      case 'resources': return { title: 'SPARES & SCIENCE', kicker: 'DEVELOPER TOOLS', rows: [
        btn('ADD DEPLOYMENT & REPAIRS', () => { assisted(); s.reserve++; for (const p of s.ships) p.charges = 3; app.sim.restoreSpectators(); }, 'One reserve deployment, three repair charges per seat.', disabled),
        { label: 'SPAWN', value: ['MARCHER', 'ARMOUR', 'BOMBARDIER', 'SAUCER'][app.devType], adjust: d => { app.devType = (app.devType + d + 4) % 4; }, fn: () => spawn(['o', 'A', 'B', 'saucer'][app.devType]), help: 'Choose, then confirm: fill a gap or refit the first marcher.', disabled },
        btn('SEED & TIME', () => show('time')), btn('STATE SUMMARY', () => show('state')), btn('RESTART ENCOUNTER', () => encounter(s.encounter, s.boss?.phase || 1), 'Restores normal time and disables invulnerability.', disabled), btn('BACK', back)
      ] };
      case 'time': return { title: 'CLOCKWORK COSMOS', kicker: 'DETERMINISTIC FIELD TOOLS', rows: [
        { label: 'SEED FOR NEXT RUN', value: String(app.seed), adjust: d => { app.seed = (app.seed + d) >>> 0; }, fn: () => show('seed'), help: 'Confirm opens digit entry; left/right changes by one.', disabled },
        { label: 'TIME SCALE', value: app.timeScale === 0 ? 'STOPPED' : app.timeScale + 'x', adjust: d => { if (!app.session) { assisted(); const times = [0, .25, .5, 1, 2]; app.timeScale = times[(times.indexOf(app.timeScale) + d + times.length) % times.length]; } }, disabled, help: 'Applies while playing. Menus remain responsive.' },
        btn('STEP ONE TICK', () => { assisted(); app.sim.step({}); view.update(A.STEP, s, false); }, 'Advance the paused world by exactly 1/120 second.', disabled),
        btn('RESTART WITH SEED', () => { start(); assisted(); }, 'A fresh assisted run with the seed above.', disabled), btn('BACK', back)
      ] };
      case 'state': return { title: 'DEFENSE DIAGNOSTICS', kicker: 'READ-ONLY STATE SUMMARY', rows: [btn('BACK', back)] };
      case 'seed': return { title: 'SET A REPEATABLE SKY', kicker: 'SEED ENTRY', text: 'TYPE DIGITS, OR SELECT EACH DIGIT WITH THE PAD.', rows: [
        { label: 'SEED', value: app.seedEntry || String(app.seed), adjust: d => { app.seedEntry = String(Math.max(0, Math.min(4294967295, Number(app.seedEntry || app.seed) + d))); }, fn: () => { app.seed = Number(app.seedEntry || app.seed) >>> 0; back(); }, help: 'Keyboard digits and Backspace edit. Pad rows below select digits.', disabled }, { label: 'DIGIT POSITION', value: String((app.seedCursor || 0) + 1) + ' / 10', adjust: d => { app.seedCursor = ((app.seedCursor || 0) + d + 10) % 10; }, disabled }, { label: 'DIGIT VALUE', value: String(app.seedEntry || app.seed).padStart(10, '0')[app.seedCursor || 0], adjust: d => { const chars = String(app.seedEntry || app.seed).padStart(10, '0').split(''), i = app.seedCursor || 0; chars[i] = String((Number(chars[i]) + d + 10) % 10); app.seedEntry = String(Math.min(4294967295, Number(chars.join('')))); }, disabled }, btn('ACCEPT SEED', () => { app.seed = Number(app.seedEntry || app.seed) >>> 0; back(); }, '', disabled), btn('BACK', back)
      ] };
      case 'balance0': return { title: 'CANNON BENCH', kicker: 'LIVE BALANCE / LEFT & RIGHT', rows: [bal('playerSpeed'), bal('recovery'), bal('shotSpeed'), btn('RESET ALL BALANCE', resetBalance, 'Restore the selected difficulty preset.', disabled), btn('BACK', back)] };
      case 'balance1': return { title: 'INVADER BENCH', kicker: 'LIVE BALANCE / LEFT & RIGHT', rows: [bal('march'), bal('descent'), bal('fireInterval'), bal('bombSpeed'), btn('BACK', back)] };
      case 'balance2': return { title: 'MASONRY BENCH', kicker: 'LIVE BALANCE / LEFT & RIGHT', rows: [bal('salvageEvery'), bal('repairYield'), bal('bossHealth'), btn('BACK', back)] };
      case 'records': return { title: 'THE PLANET REMEMBERS', kicker: 'LOCAL RECORDS / DIFFICULTY & MODE', rows: [{ label: 'FILTER', value: A.DIFFICULTIES[app.difficulty].name + ' / ' + (app.seats === 2 ? 'CO-OP' : 'SOLO'), adjust: d => { const filter = (app.difficulty * 2 + (app.seats - 1) + d + 8) % 8; app.difficulty = Math.floor(filter / 2); app.seats = filter % 2 + 1; } }, { label: 'TABLE', value: app.recordAssisted ? 'ASSISTED' : 'NORMAL', adjust: () => { app.recordAssisted = !app.recordAssisted; } }, btn('BACK', back)] };
      case 'about': return { title: 'SMALL CANNONS. BIG THANKS.', kicker: 'ABOUT / CREDITS', rows: [btn('NEXT PAGE', () => { app.aboutPage = (app.aboutPage + 1) % aboutPages().length; }), btn('PREVIOUS PAGE', () => { app.aboutPage = (app.aboutPage + aboutPages().length - 1) % aboutPages().length; }), btn('BACK', back)] };
      case 'results': return { title: s.won ? 'PLANET DEFENDED!' : s.reason === 'BREACH' ? 'THE SKY GOT TOO CLOSE.' : 'THE LAST CANNON FALLS.', kicker: s.won ? 'A LITTLE RUDE. A LOT DEFEATED.' : 'DEFENSE REPORT / ' + s.reason, rows: app.session ? [] : [btn('PLAY AGAIN', start), btn('SETTINGS', () => show('settings')), btn('RETURN TO TITLE', title)] };
      default: return { title: '', rows: [] };
    }
  }
  function aboutPages() {
    const r = app.report;
    const pages = [{ title: 'THE CARTRIDGE', body: 'Astro Battle Jam\nOriginal art, formations, repair rules and flagship.\nBuilt with my-3D2dge v0.89.1 (MIT).\nHub session client 1.4.0, Protocol v1.\nStandalone: solo or local co-op.\nAI Hub: online shared-world co-op for 1-2 seats.\nNo external matchmaking. No asset or audio downloads.' }];
    if (!r) return pages;
    const labels = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
    for (const [k, v] of Object.entries(r.sourceInformation)) pages.push({ title: 'SOURCE INFORMATION / ' + labels[k], body: v });
    const qs = A.REPORT_QUESTIONS;
    for (const [key, title] of [['testingFeedback', 'TESTING FEEDBACK'], ['engineFeedback', 'ENGINE FEEDBACK'], ['promptFeedback', 'PROMPT FEEDBACK']]) r[key].forEach((v, i) => pages.push({ title: title + ' / ' + (i + 1), body: qs[key][i] + '\n\n' + v }));
    const scale = game.H > 400 ? 2 : 1;
    const buttonY = game.H > 400 ? Math.round(game.H * .64) : 192;
    const bodyY = game.H > 400 ? Math.round(game.H * .34) + 24 : 97;
    const capacity = Math.max(5, Math.floor((buttonY - bodyY - 10) / E.font.lineHeight({ scale })));
    const paged = [];
    for (const page of pages) {
      const lines = E.font.wrap(page.body, Math.min(390, game.W - 70), { scale });
      for (let at = 0; at < lines.length; at += capacity) paged.push({ title: page.title + (lines.length > capacity ? ' / ' + (Math.floor(at / capacity) + 1) : ''), body: lines.slice(at, at + capacity).join('\n') });
    }
    return paged;
  }
  function layoutRows() {
    if (!isMenu()) { app.rows = []; layoutFieldUI(); return; }
    if (app.screen === 'about') app.aboutPage = Math.max(0, Math.min(app.aboutPage, aboutPages().length - 1));
    const spec = menuSpec(), W = game.W, H = game.H, compactPortrait = H > 400 && H < 700, title = app.screen === 'title', custom = ['controls', 'about', 'records', 'results', 'state'].includes(app.screen);
    const width = title && H < 400 ? 220 : Math.min(420, W - 48), x = title && H < 400 ? W - width - 24 : Math.round((W - width) / 2);
    let y = title ? (compactPortrait ? 285 : H > 400 ? Math.max(300, H * .4) : app.touch ? 56 : 77) : app.touch && H <= 400 ? 59 : Math.max(65, Math.round(H / 2 - 73));
    if (custom) y = H > 400 ? Math.round(H * .64) : app.screen === 'about' ? 192 : app.screen === 'controls' ? 203 : app.screen === 'results' ? 185 : 185;
    if (app.screen === 'lobby') y += 32;
    const h = H > 400 ? (compactPortrait ? 40 : 56) : app.touch ? 31 : title ? 23 : custom ? 21 : 25;
    app.rows = spec.rows.map((row, i) => ({ ...row, box: { x, y: y + i * (h + (H > 400 ? compactPortrait ? 6 : 8 : app.touch ? 2 : custom ? 2 : 3)), w: width, h } }));
    app.focus = Math.max(0, Math.min(app.rows.length - 1, app.focus)); app.spec = spec;
    layoutFieldUI();
  }
  function layoutFieldUI() {
    const W = game.W, H = game.H;
    const off = view.offset(); app.menuBox = app.touch ? (H > 400 ? { x: W - 142, y: H - 86, w: 116, h: 56 } : { x: off.x + 408, y: off.y + 1, w: 54, h: 34 }) : { x: off.x + 425, y: off.y + 34, w: 37, h: 20 };
    const p = state()?.ships?.find(q => q.id === (app.session?.info.me ?? 0));
    app.repairBox = { x: W - 146, y: H > 400 ? off.y + 295 : H - 51, w: 120, h: H > 400 ? 52 : 28 };
    if (p && app.touch) { const proxy = Object.create(A.Sim.prototype); proxy.s = state(); app.canTouchRepair = proxy.repairTarget(p).usable; } else app.canTouchRepair = false;
  }

  function rowValue(row) {
    if (row.key) { const v = game.settings[row.key], sp = row.spec; if (sp.type === 'slider') return row.balance ? String(+Number(v).toFixed(2)) : Math.round(v * 100) + '%'; if (sp.type === 'toggle') return v ? 'ON' : 'OFF'; const option = sp.options?.find(o => (Array.isArray(o) ? o[0] : o) === v); return Array.isArray(option) ? option[1] : String(v); }
    return row.value;
  }
  function activate(row, direction = 0, atX = null) {
    if (!row) return;
    if (row.disabled) { game.audio.sfx('bump'); return; }
    if (row.key) {
      const sp = row.spec, current = game.settings[row.key]; let v;
      if (sp.type === 'slider') {
        v = atX === null ? current + (direction || 1) * (sp.step || .05) : (sp.min ?? 0) + Math.max(0, Math.min(1, (atX - row.box.x - row.box.w * .58) / (row.box.w * .36))) * ((sp.max ?? 1) - (sp.min ?? 0));
      } else if (sp.type === 'toggle') v = !current;
      else { const options = sp.options.map(x => Array.isArray(x) ? x[0] : x), index = options.indexOf(current); v = options[(index + (direction || 1) + options.length) % options.length]; }
      if (row.balance) changeBalance(row.balance, v); else game.settings.set(row.key, v);
    } else if (row.adjust && direction) row.adjust(direction);
    else if (row.fn) row.fn();
    else if (row.adjust) row.adjust(1);
    game.audio.sfx('select'); layoutRows();
  }
  function wake() {
    app.idle = 0; app.activity = true;
    if (app.screen === 'attract') { title(); app.wakeGuard = app.uiTime + .5; return true; }
    return false;
  }
  function pollActivity() {
    // Real axes/trigger changes count; polling, stick drift and held buttons do not.
    if (game.headless || typeof navigator === 'undefined') return false;
    let pads = []; try { pads = Array.from(navigator.getGamepads?.() || []); } catch {}
    let significant = false;
    for (const p of pads) if (p && p.connected !== false) {
      const values = [...p.axes.map(v => Math.abs(v) > .22 ? +v.toFixed(1) : 0), ...p.buttons.map(b => b.value > .18 ? +b.value.toFixed(1) : b.pressed ? 1 : 0)];
      const old = app.lastPadState.get(p.index);
      if (old && values.some((v, i) => v !== old[i] && (v || old[i]))) significant = true;
      else if (!old && values.some(v => v)) significant = true;
      app.lastPadState.set(p.index, values);
    }
    if (significant) { app.primary = 'gamepad'; return wake(); }
    return false;
  }
  function sample(id, index) {
    const p = state().ships.find(p => p.id === id), i = game.players[index] || game.input;
    const axis = i.move()[0], keyboard = i.down('left') || i.down('right');
    let move = axis;
    if (keyboard && i.lastDevice !== 'gamepad') app.pointerTarget = null;
    if (index === 0 && app.touch && app.touchId !== null) move = Math.max(-1, Math.min(1, app.touchX / 36));
    else if (index === 0 && app.pointerTarget !== null && !keyboard && p) move = Math.max(-1, Math.min(1, (app.pointerTarget - p.x) / 8));
    let fire = i.down('fire') || i.pressed('fire');
    if (index === 0 && app.touch && game.settings.touchAssist && app.touchId !== null && p) {
      const cover = state().bunkers.some(b => Math.abs(b.x + 24 - p.x) < 25 && b.rows.some(row => row & (1 << Math.floor((p.x - b.x) / 3))));
      fire = !cover || app.contacts.size >= 2;
    }
    if (index === 0 && app.touch && app.contacts.size >= 2) fire = true;
    const repair = i.down('repair') || i.pressed('repair') || index === 0 && app.touchRepair;
    return { move, fire: app.gate ? false : fire, repair: app.gate ? false : repair };
  }
  function attract(dt) {
    app.demoTime += dt;
    const scene = Math.floor(app.demoTime / 13) % 5;
    if (scene !== app.demoScene) {
      app.demoScene = scene; app.demo = new A.Sim({ seed: 8000 + scene, demo: true }); const q = app.demo;
      q.startEncounter([0, 1, 3, 5, 6][scene], scene === 4 && Math.floor(app.demoTime / 65) % 2 ? 2 : 1);
      q.s.phaseTicks = 1; q.s.ships[0].charges = 3;
      if (scene === 1) { for (const b of q.s.bunkers) b.rows = b.rows.map((n, i) => i < 6 ? n & 0xb2db : n); q.s.nextSaucer = 150; }
      view.reset();
    }
    for (let k = 0; k < 2; k++) { const q = app.demo; if (q.s.phase === 'victory' || q.s.phase === 'defeat') break; q.step({ 0: A.pilot(q.s, 0) }); }
    view.update(dt, app.demo.s, false);
  }
  function result(s) {
    if (app.resultSaved) return;
    app.resultSaved = true; app.lastOutcome = s.reason;
    if (!app.session && !s.demo) {
      const entry = { score: s.score, difficulty: s.difficulty, coop: s.ships.length === 2, assisted: s.assisted, won: s.won, seconds: Math.round(s.tick / 120) };
      records.push(entry); records.sort((a, b) => b.score - a.score); records = records.slice(0, 80); app.records = records;
      E.store.set('jam-records-v1', { version: 1, entries: records });
    }
    app.stack = []; app.screen = 'results'; app.focus = 0; clearInput(); layoutRows();
  }
  function update(dt) {
    app.uiTime += dt; if (!inRun() && app.screen !== 'attract') audio.song(0); game.focus(240, 135, 0); game.cam.smooth = 0;
    const wokePad = pollActivity();
    if (wokePad) { app.activity = false; return; }
    if (game.input.anyPressed() || game.players.some(i => i.pressed('start'))) { app.idle = 0; if (app.screen === 'attract') { title(); return; } }
    if (game.input.lastDevice === 'gamepad' && (game.input.anyPressed() || Math.abs(game.input.move()[0]) > .3)) app.primary = 'gamepad';
    if (!app.session && app.screen === 'play' && game.players.some(i => i.padLost)) show('pause');
    if (app.gate && !game.players.some(i => i.down('fire') || i.down('confirm') || i.down('repair') || i.down('pause') || i.down('start')) && app.contacts.size === 0) app.gate = false;
    layoutRows();
    // Menu geometry and hover focus are updated without relying on draw.
    if (app.pointer) {
      const at = app.rows.findIndex(r => inside(app.pointer.x, app.pointer.y, r.box));
      if (at >= 0 && app.pointer.changed) app.focus = at;
      app.pointer.changed = false;
    }
    if (app.screen === 'attract') { attract(dt); app.activity = false; return; }
    if (app.session) {
      if (app.ended) return;
      const local = app.session.info.server ? A.NEUTRAL : (app.screen === 'play' ? sample(app.session.info.me, 0) : A.NEUTRAL);
      app.session.localCommand(local); app.session.update();
      const s = app.session.state;
      view.update(dt, s, app.session.started && app.session.hub.time() >= 0); audio.song(s.location, !!s.boss);
      if (app.session.started && app.session.hub.time() >= 0 && app.screen === 'hubwait') app.screen = 'play';
      if (s.phase === 'victory' || s.phase === 'defeat') result(s);
    }
    if ((app.screen === 'play' || app.screen === 'hubwait') && !app.session && app.sim) {
      const commands = Object.fromEntries(app.sim.s.ships.map((p, index) => [p.id, sample(p.id, index)]));
      app.accumulator = (app.accumulator || 0) + dt * app.timeScale;
      while (app.accumulator + 1e-9 >= A.STEP) { app.sim.step(commands); app.accumulator -= A.STEP; }
      const s = app.sim.s; view.update(dt, s, true); audio.song(s.location, !!s.boss);
      if (s.phase === 'victory' || s.phase === 'defeat') result(s);
    }
    if (app.screen === 'play') {
      if (game.players.some(i => i.pressed('pause') || i.pressed('menu')) && !app.gate) { show('pause'); game.audio.sfx('pause'); }
      if (app.pointerPending && inside(app.pointerPending.x, app.pointerPending.y, app.menuBox)) show('pause');
      if (app.pointerPending && app.touch && app.canTouchRepair && inside(app.pointerPending.x, app.pointerPending.y, app.repairBox)) app.touchRepair = true;
    } else if (isMenu()) {
      const I = game.input;
      if (!app.gate) {
        if (I.repeat('up', .35, .12)) { app.focus = (app.focus + app.rows.length - 1) % app.rows.length; game.audio.sfx('select'); }
        if (I.repeat('down', .35, .12)) { app.focus = (app.focus + 1) % app.rows.length; game.audio.sfx('select'); }
        if (I.repeat('left', .35, .12)) activate(app.rows[app.focus], -1);
        if (I.repeat('right', .35, .12)) activate(app.rows[app.focus], 1);
        if (I.pressed('confirm') || I.pressed('start')) activate(app.rows[app.focus]);
        if (I.pressed('cancel') && app.screen !== 'seed') back();
      }
      const click = app.pointerPending;
      if (click) { const at = app.rows.findIndex(r => inside(click.x, click.y, r.box)); if (at >= 0) { app.focus = at; activate(app.rows[at], 0, app.rows[at].key && app.rows[at].spec.type === 'slider' ? click.x : null); clearInput(); } }
      if (!app.session && !app.sim && !app.activity) { app.idle += dt; if (app.idle >= 10) { app.screen = 'attract'; app.demoScene = -1; app.demoTime = 0; clearInput(); } }
    }
    app.pointerPending = null; app.touchRepair = false; app.activity = false;
  }
  function draw(r) {
    const s = app.session?.visualState() || state() || app.state;
    const plainTitle = !app.sim && !app.session && !app.demo;
    view.draw(r, s, { title: plainTitle, demo: app.screen === 'attract', overlay: isMenu(), touch: app.touch, diagnostics: app.diagnostics });
    const W = r.W, H = r.H, t = game.time;
    if (app.screen === 'attract') return;
    r.overlay(g => {
      if (app.screen === 'play') {
        const b = app.menuBox; if (b) { frame(g, b.x, b.y, b.w, b.h, '#688b96', '#102538'); text(g, app.touch ? 'MENU' : 'ESC', b.x + b.w / 2, b.y + 7, pale, 1, 'center'); }
        if (app.touch && app.canTouchRepair) { const b = app.repairBox; frame(g, b.x, b.y, b.w, b.h, gold, '#293536'); text(g, 'REPAIR', b.x + b.w / 2, b.y + Math.floor(b.h / 2) - 6, gold, 2, 'center'); }
        return;
      }
      if (app.screen === 'hubwait' || app.screen === 'hubend') {
        const words = app.screen === 'hubwait' ? 'CANNONS READY' : app.endedReason === 'host-left' ? 'HOST LEFT / ROUND VOID' : 'DEFENSE REPORT SENT';
        frame(g, W / 2 - 200, H / 2 - 31, 400, 65, '#8ce8d5', '#0d2436'); text(g, words, W / 2, H / 2 - 17, pale, 2, 'center'); text(g, app.screen === 'hubwait' ? 'THE HUB IS COUNTING US IN.' : 'THE HUB HANDLES THE NEXT ROUND.', W / 2, H / 2 + 10, '#98bbc2', 1, 'center'); return;
      }
      const spec = app.spec || menuSpec(), titleScreen = app.screen === 'title';
      if (!titleScreen) px.blend(g, .9, 'normal', () => px.rect(g, 0, 0, W, H, '#0b1b2e'));
      if (titleScreen) {
        const compactTitle = H > 400 && H < 700;
        const left = H > 400 ? W / 2 : 135, top = (compactTitle ? 80 : H > 400 ? 128 : 49) + (game.reduceMotion ? 0 : Math.round((1 - (app.logoReveal ?? 1)) * 6));
        text(g, 'SECTOR 07 / DEFENSE IN PROGRESS', H > 400 ? W / 2 : 30, H > 400 ? 43 : 20, '#8aaeb5', 1, H > 400 ? 'center' : 'left');
        E.font.title(g, 'ASTRO', left, top, { align: 'center', scale: compactTitle ? 5 : H > 400 ? 6 : 4, colors: ['#fff7d9', '#a6f0d2', '#52bfba'], depth: 3, depthColor: '#123f51' });
        E.font.title(g, 'BATTLE JAM', left, top + (compactTitle ? 46 : H > 400 ? 57 : 38), { align: 'center', scale: compactTitle ? 4 : H > 400 ? 5 : 3, colors: ['#fff2ca', '#ffc278', '#e88378'], depth: 3, depthColor: '#5b3848' });
        text(g, 'CUT A LANE. PATCH THE PLANET.', left, top + (compactTitle ? 90 : H > 400 ? 108 : 72), '#b3d5cf', 1, 'center');
        const yy = top + (compactTitle ? 130 : H > 400 ? 160 : 105);
        for (let i = 0; i < 4; i++) { const x = left - 65 + i * 44, y = yy + Math.round(Math.sin(t * 1.8 + i) * 3); px.sprite(g, A.art.enemies[i].frames[Math.floor(t * 2) % 2], x - 8, y - 6, { scale: 2 }); }
        px.sprite(g, A.art.cannons[0], left - 8, yy + 40, { scale: 2 });
        if (H < 400) { px.line(g, 252, 61, 252, 230, '#385764'); text(g, '01', 32, 229, '#8bd8c6'); text(g, 'PLANET. TWO CANNONS. NO MANNERS.', 52, 229, '#91aab5'); }
      } else {
        const top = (H > 400 ? Math.max(45, H / 2 - 210) : 22) + (game.reduceMotion ? 0 : Math.round((1 - (app.panelReveal ?? 1)) * 3));
        text(g, spec.kicker || '', W / 2, top, '#76d8c6', 1, 'center');
        text(g, spec.title || '', W / 2, top + 18, pale, H > 400 && (spec.title || '').length < 27 ? 3 : 2, 'center');
        if (spec.text) text(g, spec.text, W / 2, top + 41, '#b6c7cd', 1, 'center');
      }
      if (app.screen === 'controls') drawControls(g, W, H);
      if (app.screen === 'about') {
        const pages = aboutPages(), p = pages[Math.min(app.aboutPage, pages.length - 1)], y = H > 400 ? Math.round(H * .34) : 73;
        text(g, p.title, W / 2, y, gold, 1, 'center');
        const lines = E.font.wrap(p.body, Math.min(390, W - 70), { scale: 1 });
        text(g, p.body, W / 2 - Math.min(390, W - 70) / 2, y + 24, '#d3e0dd', H > 400 ? 2 : 1, 'left', Math.min(390, W - 70));
        text(g, 'PAGE ' + (app.aboutPage + 1) + ' / ' + pages.length, W - 35, H > 400 ? Math.max(45, H / 2 - 210) : 22, '#8aa8b4', 1, 'right');
      }
      if (app.screen === 'records') {
        const list = records.filter(r => r.difficulty === app.difficulty && r.coop === (app.seats === 2) && !!r.assisted === !!app.recordAssisted);
        const y = H > 400 ? H * .35 : 79;
        if (!list.length) text(g, 'NO RECORD YET. THE PLANET IS WAITING.', W / 2, y + 28, '#b6c8cf', 1, 'center');
        list.slice(0, 5).forEach((v, i) => { const xx = W / 2 - 175, yy = y + i * 22; text(g, '#' + (i + 1), xx, yy, '#80dac7'); text(g, String(v.score).padStart(6, '0'), xx + 35, yy, pale, 2); text(g, v.assisted ? 'ASSISTED' : v.won ? 'DEFENDED' : 'STOOD FIRM', xx + 140, yy + 2, v.assisted ? gold : '#abc4c9'); text(g, v.seconds + 's', xx + 300, yy + 2, '#8fa8b6'); });
      }
      if (app.screen === 'results') drawResults(g, W, H, s);
      if (app.screen === 'state') {
        const y = H > 400 ? H * .34 : 76, network = app.session;
        const lines = ['TICK ' + s.tick + ' / EPOCH ' + s.epoch + ' / SEED ' + s.seed,
          'ENCOUNTER ' + (s.encounter + 1) + ' / ' + s.phase.toUpperCase(),
          'ENEMIES ' + s.enemies.length + ' / SHOTS ' + s.shots.length + ' / SALVAGE ' + s.pickups.length,
          'ACTIVE ' + s.ships.filter(p => p.active).length + ' / PENDING ' + s.ships.filter(p => p.wait).length + ' / RESERVE ' + s.reserve,
          'SCORE ' + s.score + ' / EXTRA ' + (s.extra ? 'AWARDED' : 'AT 1000'),
          'REPAIRS ' + s.stats.repairs + ' / LOSSES ' + s.stats.deaths,
          network ? 'NET ' + network.debug.sent + ' SENT / ' + network.debug.received + ' RECEIVED / MAX ' + network.debug.maxBytes + 'B' : 'LOCAL AUTHORITY / RNG ' + s.rng];
        lines.forEach((line, i) => text(g, line, W / 2 - 190, y + i * (H > 400 ? 27 : 13), i % 2 ? '#9ecdc8' : '#d3ded8', H > 400 ? 2 : 1));
      }
      for (let i = 0; i < app.rows.length; i++) {
        const row = app.rows[i], b = row.box, focused = i === app.focus, color = row.disabled ? '#66818d' : focused ? '#b4f5d9' : '#799ba7';
        if (focused) frame(g, b.x, b.y, b.w, b.h, '#abedce', '#234b51');
        else { px.blend(g, .85, 'normal', () => px.rect(g, b.x, b.y, b.w, b.h, '#102a3a')); px.rect(g, b.x, b.y + b.h - 1, b.w, 1, '#284958'); }
        if (focused) text(g, '>', b.x + 7, b.y + Math.floor((b.h - 7) / 2), color, 1);
        const value = rowValue(row), small = value !== undefined || row.key || row.label.length > 24;
        const labelScale = H > 400 ? (small ? 2 : 3) : small ? 1 : 2;
        text(g, row.label, b.x + 19, b.y + Math.floor((b.h - labelScale * 7) / 2), row.disabled ? '#6f8590' : focused ? '#fff5dc' : '#bfd4d8', labelScale);
        if (value !== undefined) text(g, '< ' + value + ' >', b.x + b.w - 11, b.y + Math.floor((b.h - (H > 400 ? 14 : 7)) / 2), color, H > 400 ? 2 : 1, 'right');
        if (row.key && row.spec.type === 'slider') {
          const v = game.settings[row.key], sp = row.spec, fraction = (v - (sp.min ?? 0)) / ((sp.max ?? 1) - (sp.min ?? 0));
          px.rect(g, b.x + b.w * .58, b.y + b.h - 5, b.w * .36, 1, '#395961'); px.rect(g, b.x + b.w * .58, b.y + b.h - 6, b.w * .36 * fraction, 2, color);
        }
      }
      const focused = app.rows[app.focus];
      if (focused && !(app.touch && H <= 400) && !['controls', 'records', 'about', 'results'].includes(app.screen)) {
        const hint = focused.disabled || focused.help;
        if (hint) text(g, hint, W / 2, H > 400 ? app.rows.at(-1).box.y + 48 : titleScreen ? 237 : 245, focused.disabled ? gold : '#91b4ba', 1, 'center');
      }
      if (app.screen !== 'about') {
        const prompts = app.touch && H <= 400 && focused?.disabled ? focused.disabled : app.touch ? 'TAP TO CHOOSE' : app.primary === 'gamepad' ? 'D-PAD / ' + (game.settings.glyphs === 'xbox' ? 'A CONFIRM   B BACK' : 'CROSS CONFIRM   CIRCLE BACK') : 'ARROWS / ENTER   ESC BACK';
        text(g, prompts, W / 2, H - 9, '#83a5b2', 1, 'center');
      }
      if (titleScreen && (!app.touch || H > 400)) text(g, 'ORIGINAL ARCADE DEFENSE / 1-2 PLAYERS', W / 2, H > 400 ? H - 45 : 249, '#668c9b', 1, 'center');
    });
  }
  function drawControls(g, W, H) {
    const y = H > 400 ? H * .31 : 78, x = W / 2 - 180, pad = app.primary === 'gamepad';
    const controls = app.touch ? [['DRAG LOWER AREA', 'Move your cannon horizontally.'], ['AUTO FIRE', 'Shoots when the upward lane is clear.'], ['SECOND FINGER', 'Hold to fire through cover and cut a lane.'], ['REPAIR BUTTON', 'Appears when charge and damage meet.']] : pad ? [[game.settings.glyphs === 'xbox' ? 'STICK / D-PAD' : 'LEFT STICK / D-PAD', 'Move along the defense apron.'], [game.settings.glyphs === 'xbox' ? 'A / RT' : 'CROSS / R2', 'Hold to fire. Two missiles at a time.'], [game.settings.glyphs === 'xbox' ? 'X / LB' : 'SQUARE / L1', 'Rebuild your nearest bunker.'], ['OPTIONS', 'Pause, settings and developer tools.']] : [['A D / ARROWS / MOUSE', 'Move or point toward your firing lane.'], ['SPACE / LEFT CLICK', 'Hold to fire. Shots also cut your cover.'], ['Q / RIGHT CLICK', 'Repair the nearest bunker with salvage.'], ['ESC', 'Pause, settings and developer tools.']];
    controls.forEach(([key, desc], i) => { text(g, key, x, y + i * (H > 400 ? 56 : 25), gold, H > 400 ? 2 : 1); text(g, desc, x, y + i * (H > 400 ? 56 : 25) + (H > 400 ? 20 : 11), '#c1d7d8', H > 400 ? 2 : 1, 'left', W - 120); });
    text(g, 'CATCH GOLD SALVAGE. PROTECT THE BREACH LINE.', W / 2, y + (H > 400 ? 239 : 108), '#8be0cc', 1, 'center');
    if (app.seats === 2 && game.players[1]?.half) text(g, 'P2: ARROWS MOVE / . FIRE / / REPAIR', W / 2, y + 121, '#ffb99c', 1, 'center');
  }
  function drawResults(g, W, H, s) {
    const y = H > 400 ? H * .34 : 78;
    if (s.won) { for (let i = 0; i < 22; i++) { const x = W / 2 + Math.sin(i * 2.4 + game.time * .2) * (75 + i * 4), yy = y + Math.cos(i * 3.1 + game.time * .3) * 25; px.rect(g, x, yy, 2, 2, i % 2 ? gold : '#9cedcf'); } }
    text(g, String(s.score).padStart(6, '0'), W / 2, y, gold, 3, 'center');
    text(g, 'TEAM SCORE / ' + Math.floor(s.tick / 120 / 60) + ':' + String(Math.floor(s.tick / 120) % 60).padStart(2, '0') + ' / ' + (s.assisted ? 'ASSISTED' : A.DIFFICULTIES[s.difficulty].name), W / 2, y + 29, '#90b9c0', 1, 'center');
    s.ships.forEach((p, i) => { text(g, 'P' + (i + 1) + '  ' + p.score + ' POINTS   ' + p.kills + ' KILLS   ' + p.repairs + ' REPAIRS', W / 2, y + 49 + i * 15, i ? '#ffc5aa' : '#a1e9d3', 1, 'center'); });
    text(g, s.won ? 'SIX FORMATIONS. FLAGSHIP DOWN. HOME IN ONE PIECE.' : 'THE PLANET WILL TAKE ANOTHER STAND.', W / 2, y + 89, '#c3d5d5', 1, 'center');
  }
  function inside(x, y, b) { return !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
  function position(e) { const c = game.screen.canvas, b = c.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * game.W, y: (e.clientY - b.top) / b.height * game.H }; }
  if (!game.headless) {
    const canvas = game.screen.canvas;
    canvas.style.touchAction = 'none';
    // Native engine touch is replaced by relative steering so no permanent controller obscures the field.
    game.settings.define({ ...game.settings.spec('touch'), value: 'off' }); game.settings.set('touch', 'off');
    game.input.touchEnabled = false; game.input.touchFilter = () => false;
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      if (app.ended) return;
      if (e.isTrusted) audio.unlock();
      const point = position(e), touch = e.pointerType === 'touch'; app.touch = touch; app.primary = touch ? 'touch' : 'mouse';
      if (wake() || app.uiTime < (app.wakeGuard || 0)) { e.preventDefault(); clearInput(); return; }
      app.pointer = { ...point, changed: true }; app.pointerPending = { ...point, button: e.button };
      if (touch) {
        e.preventDefault(); try { if (e.isTrusted) canvas.setPointerCapture?.(e.pointerId); } catch {}
        if (app.screen === 'play' && inside(point.x, point.y, app.menuBox)) { show('pause'); app.pointerPending = null; return; }
        if (app.screen === 'play' && app.canTouchRepair && inside(point.x, point.y, app.repairBox)) { app.touchRepair = true; return; }
        app.contacts.set(e.pointerId, point);
        if (app.touchId === null) { app.touchId = e.pointerId; app.touchStart = point.x; app.touchX = 0; }
      }
    });
    canvas.addEventListener('pointermove', e => {
      const point = position(e), touch = e.pointerType === 'touch';
      if (touch) {
        if (app.contacts.has(e.pointerId)) { app.contacts.set(e.pointerId, point); if (app.touchId === e.pointerId) app.touchX = point.x - app.touchStart; wake(); }
      } else if (!app.pointer || Math.hypot(point.x - app.pointer.x, point.y - app.pointer.y) > .5) {
        const wasDemo = wake(); app.primary = 'mouse'; app.touch = false; app.pointer = { ...point, changed: true };
        if (!wasDemo && app.screen === 'play') app.pointerTarget = Math.max(29, Math.min(451, point.x - view.offset().x));
      }
    });
    const release = e => { app.contacts.delete(e.pointerId); if (e.pointerId === app.touchId) { const next = app.contacts.entries().next().value; app.touchId = next ? next[0] : null; app.touchX = 0; if (next) app.touchStart = next[1].x; } };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release); canvas.addEventListener('lostpointercapture', release);
    root.addEventListener('keydown', e => {
      if (app.ended) return;
      if (e.isTrusted) audio.unlock();
      if (wake() || app.uiTime < (app.wakeGuard || 0)) { e.preventDefault(); clearInput(); return; }
      app.primary = 'keyboard'; app.touch = false;
      if (app.screen === 'seed' && !app.session) {
        if (/^Digit\d$/.test(e.code)) { app.seedEntry = (app.seedEntry || '') + e.code.at(-1); app.seedEntry = String(Math.min(4294967295, Number(app.seedEntry.slice(-10)))); }
        else if (e.code === 'Backspace') app.seedEntry = (app.seedEntry || String(app.seed)).slice(0, -1) || '0';
      }
      if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'].includes(e.code)) app.pointerTarget = null;
    });
    const focusLoss = () => { app.contacts.clear(); app.touchId = null; app.touchX = 0; app.pointerTarget = null; if (!app.session && app.screen === 'play') show('pause'); };
    root.addEventListener('blur', focusLoss);
    root.addEventListener('resize', () => { app.contacts.clear(); app.touchId = null; app.touchX = 0; layoutRows(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) focusLoss(); });
  }
  app.state = new A.Sim({ seed: 123, demo: true }).s;
  game.start({ scene: 'cabinet', scenes: { cabinet: { view: 'overhead', views: ['overhead'], camera: { zoom: false }, touch: [], pausable: false, enter() { game.lights.enabled = true; game.lights.ambient = .9; game.lights.dark = [5, 12, 30]; game.lights.refresh(); game.focus(240, 135, 0); game.cam.snap = true; }, update, draw, back } } });
  game.debug = {
    snapshot: () => ({ title: A.TITLE, screen: app.screen, focus: app.focus, rows: app.rows.map(r => ({ label: r.label, value: rowValue(r), box: r.box, disabled: r.disabled || '' })), world: A.clone(state()), primary: app.primary, touch: app.touch, touchContacts: app.contacts.size, pointerTarget: app.pointerTarget, idle: app.idle, timeScale: app.timeScale, diagnostics: app.diagnostics, settings: { music: game.settings.music, glyphs: game.settings.glyphs }, records: app.records, session: app.session ? { info: app.session.info, started: app.session.started, ended: app.session.ended, debug: app.session.debug, ack: app.session.ack, inputAck: app.session.inputAck, pendingInputs: app.session.unacked.length } : null }),
    command: (id, command) => { if (app.session || !app.sim || app.screen !== 'play') return false; app.testCommands = app.testCommands || {}; app.testCommands[id] = { move: Math.max(-1, Math.min(1, Number(command.move) || 0)), fire: !!command.fire, repair: !!command.repair }; return true; },
    clearCommands: () => { app.testCommands = null; },
    show, start, title, menuSpec, aboutPages, get app() { return app; }
  };
  const realSample = sample;
  sample = function (id, index) { return app.testCommands?.[id] || realSample(id, index); };
  root.__game = { game, app, sim: () => app.sim, view, audio, A };
  audio.song(0); layoutRows();
  (async () => {
    if (!root.AIHub) return;
    const info = await root.AIHub.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) return;
    resetOwnership(); game.allowJoin(false); app.sim = null; app.demo = null; app.stack = []; app.screen = 'hubwait'; clearInput();
    app.session = new A.Session(root.AIHub, info, () => {}, reason => { app.ended = true; app.endedReason = reason; app.screen = 'hubend'; app.contacts.clear(); game.input.clear(); audio.stop(); });
    root.AIHub.probe(() => ({ scene: app.screen, world: { tick: state().tick, score: state().score, encounter: state().encounter, ships: state().ships.map(p => ({ id: p.id, x: p.x, active: p.active, charges: p.charges, deaths: p.deaths })), bunkers: state().bunkers.map(b => b.rows), phase: state().phase }, menu: isMenu(), input: app.session.current }));
  })().catch(error => game.fail('session', error));
})(globalThis);
/* GAME END */
