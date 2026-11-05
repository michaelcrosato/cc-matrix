// The front end: title (and the touch-only gate), main menu, environment / track / puzzle / gauntlet selects,
// multiplayer setup, replays, Build's slots, results, standings, cards between turns, About and the credits roll.
// Ten-foot rules: big tiles, one focus, a prompt bar, back on every page; the mouse hovers and clicks the same tiles.
import { Focus, text, tw, big, panel, promptBar, medalIcon, coinIcon, envIcon, lockIcon, COL, MEDAL_COL, LetterWheel } from './ui.js';
import { TRACKS, PUZZLES, ENV_ORDER, ENV_INFO, RANKS, RIVALS } from './data.js';
import { fmt } from './run.js';
import { Demo } from './demo.js';
import { ABOUT } from './about.js';
import { makeCast } from './app.js';
import { shareCode } from './track.js';

const E = globalThis.My3D2dge, px = E.px;
export const FRONT_INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12', 'PadAxisUp'], down: ['KeyS', 'ArrowDown', 'Pad13', 'PadAxisDown'], left: ['KeyA', 'ArrowLeft', 'Pad14', 'PadAxisLeft'], right: ['KeyD', 'ArrowRight', 'Pad15', 'PadAxisRight'],
  confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'], start: ['Enter', 'Pad9'], pause: ['KeyP', 'Pad9'],
  alt: ['KeyR', 'Pad3'], del: ['Delete', 'KeyX', 'Pad2'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], replay: ['KeyV', 'Pad2']
};

export function frontScene(app) {
  const game = app.game, F = new Focus(game);
  const st = { page: 'title', stack: [], data: {}, t: 0, idle: 0, demo: null, logoT: 0 };
  const sfx = n => game.audio.sfx(n);
  const go = (page, data = {}, push = true) => { if (push && st.page !== page) st.stack.push([st.page, st.data]); st.page = page; st.data = data; F.set([], false); st.t = 0; sfx('ui_ok'); };
  const back = () => { const p = st.stack.pop(); if (p) { st.page = p[0]; st.data = p[1]; F.set([], false); sfx('ui_back'); } };
  app.front = { get pages() { return PAGES; }, st, get page() { return st.page; }, go, back, focusId: () => F.cur && F.cur.id, reset: (page, data) => { st.stack = page === 'title' ? [] : [['title', {}]]; if (page !== 'title' && page !== 'main') st.stack.push(['main', {}]); st.page = page; st.data = data || {}; F.set([], false); }, focus: id => F.focus(id), F };
  const P = () => app.profile;
  const deny = msg => { sfx('ui_err'); game.note(msg, 1.5); };
  const W = () => game.W, H = () => game.H;
  const grid = (list, cols, tw0, th, y0, gap = 8) => { const w = W(), totalW = cols * tw0 + (cols - 1) * gap, x0 = Math.round((w - totalW) / 2); return list.map((it, i) => Object.assign({ x: x0 + (i % cols) * (tw0 + gap), y: y0 + Math.floor(i / cols) * (th + gap), w: tw0, h: th }, it)); };

  // ---- pages: items(), draw(g), back ----
  const PAGES = {
    title: {
      items() { return [{ id: 'start', x: W() / 2 - 90, y: H() * .62, w: 180, h: 30, label: app.touchGate ? 'SETTINGS' : 'PRESS START', on: () => { if (app.touchGate) game.menu('settings'); else { app.modes.firstBoot(); } } }]; },
      draw(g) {
        logo(g, W() / 2, H() * .2);
        if (app.touchGate) { big(g, 'CONTROLLER OR KEYBOARD', W() / 2, H() * .44, '#ffffff', 2); big(g, 'REQUIRED', W() / 2, H() * .44 + 22, '#ffffff', 2); }
        else E.font.text(g, E.versionLabel ? 'v1.0 • ' + E.versionLabel() : 'v1.0', 6, H() - 12, '#8a8aa0', { outline: '#10101a' });
      }, noBack: true
    },
    main: {
      items() {
        const p = P(), T = [
          { id: 'race', label: 'RACE', sub: 'BEAT THE CLOCK', on: () => go('envs', { mode: 'race' }) },
          { id: 'puzzle', label: 'PUZZLE', sub: 'FINISH THE TRACK', on: () => go('envs', { mode: 'puzzle' }) },
          { id: 'survival', label: 'SURVIVAL', sub: 'THE GHOST GUILD', on: () => go('envs', { mode: 'survival' }) },
          { id: 'build', label: 'BUILD', sub: 'YOUR OWN TRACKS', on: () => go('build') },
          { id: 'multi', label: 'MULTIPLAYER', sub: 'HOT SEAT • SPLIT • ONLINE', on: () => go('multi') },
          { id: 'garage', label: 'GARAGE', sub: 'PAINT SHOP', on: () => app.modes.garage() },
          { id: 'replays', label: 'REPLAYS', sub: p.data.replays.length + ' SAVED', on: () => go('replays') },
          { id: 'options', label: 'OPTIONS', sub: 'SETTINGS • CONTROLS', on: () => game.menu('settings') },
          { id: 'about', label: 'ABOUT', sub: 'CREDITS', on: () => go('about', { i: 0 }) }
        ];
        const cols = W() > 380 ? 3 : 2, tw0 = Math.min(128, Math.floor((W() - 40) / cols) - 8);
        return grid(T, cols, tw0, 44, 74);
      },
      draw(g) { logo(g, W() / 2, 12, 3); wallet(g); },
      back: () => { st.stack = []; st.page = 'title'; F.set([], false); }
    },
    envs: {
      items() {
        const mode = st.data.mode, p = P();
        const T = ENV_ORDER.map(env => {
          const I = ENV_INFO[env], open = mode === 'race' ? p.envOpen(env) : mode === 'puzzle' ? p.puzzlesOpen(env) : p.survivalOpen(env);
          const g = p.goldsIn(env), m = p.medalsIn(env);
          const need = mode === 'race' ? 'MEDALS ON 3 ' + ENV_INFO[ENV_ORDER[Math.max(0, ENV_ORDER.indexOf(env) - 1)]].name + ' TRACKS' : mode === 'puzzle' ? 'A MEDAL ON TRACK 2' : 'A MEDAL ON TRACK 3';
          return { id: env, label: I.name, sub: open ? (mode === 'race' ? 'G ' + g + '/5  MEDALS ' + m + '/5' : I.tag) : need, disabled: !open, lock: !open, env, icon: (gg, x, y) => envIcon(gg, env, x, y), on: () => mode === 'race' ? go('tracks', { env }) : mode === 'puzzle' ? go('puzzles', { env }) : go('gauntlet', { env }) };
        });
        return T.map((t, i) => Object.assign(t, { x: W() / 2 - 150, y: 64 + i * 52, w: 300, h: 44 }));
      },
      draw(g) { header(g, st.data.mode === 'race' ? 'RACE' : st.data.mode === 'puzzle' ? 'PUZZLE' : 'SURVIVAL'); wallet(g); },
      denied: it => deny('LOCKED: ' + it.sub)
    },
    tracks: {
      items() {
        const env = st.data.env, p = P();
        const list = TRACKS.filter(t => t.env === env).map((t, i) => {
          const r = p.data.records[t.id], open = p.trackOpen(t.id);
          return { id: t.id, label: (i + 1) + '. ' + t.name, sub: open ? (r && r.best ? 'BEST ' + fmt(r.best) : t.teaches.toUpperCase()) : 'MEDAL THE TRACK BEFORE', disabled: !open, lock: !open, medal: r ? r.medal : 0, on: () => app.modes.campaign(t.id) };
        });
        return list.map((t, i) => Object.assign(t, { x: W() / 2 - 170, y: 50 + i * 36, w: 340, h: 32 }));
      },
      draw(g) {
        header(g, ENV_INFO[st.data.env].name); wallet(g);
        const cur = F.cur; if (cur && !cur.disabled) { const M = app.medals(cur.id); if (M && W() > 420) { let y = 60; for (const m of [4, 3, 2, 1]) { medalIcon(g, W() - 82, y, m); E.font.text(g, fmt([0, M.bronze, M.silver, M.gold, M.author][m]), W() - 62, y + 4, MEDAL_COL[m], { outline: '#10101a' }); y += 22; } } }
        promptBar(g, game, [['confirm', 'DRIVE'], ['alt', game.settings.cocoGhost ? "COCO'S GHOST: ON" : "COCO'S GHOST: OFF"], ['cancel', 'BACK']]);
      },
      alt: () => { game.settings.set('cocoGhost', !game.settings.cocoGhost); sfx('ui_move'); },
      denied: () => deny('WIN A MEDAL ON THE TRACK BEFORE')
    },
    puzzles: {
      items() {
        const env = st.data.env, p = P();
        return PUZZLES.filter(z => z.env === env).map((z, i) => { const r = p.data.puzzles[z.id]; return { id: z.id, label: z.name, sub: r && r.best ? 'BEST ' + fmt(r.best) : 'BUILD THE MISSING ROAD', medal: r ? r.medal : 0, x: W() / 2 - 150, y: 70 + i * 54, w: 300, h: 46, on: () => app.modes.puzzle(z.id) }; });
      },
      draw(g) { header(g, ENV_INFO[st.data.env].name + ' PUZZLES'); wallet(g); }
    },
    gauntlet: {
      items() { const env = st.data.env, best = P().data.survival[env]; return [{ id: 'go', label: 'START GAUNTLET', sub: best ? 'BEST: ' + (best.cleared ? 'CLEARED • ' : 'ROUND ' + best.round + ' • ') + RANKS[best.rank || 0] : '5 ROUNDS • LAST PLACE GOES HOME', x: W() / 2 - 150, y: H() - 92, w: 300, h: 46, on: () => app.modes.survival(env) }]; },
      draw(g) {
        header(g, ENV_INFO[st.data.env].name + ' GAUNTLET');
        const C = makeCast(); [C.tex, C.grav, C.bobo].forEach((c, i) => { const x = W() / 2 - 150 + i * 104; c.rig.drawPortrait(g, x, 60, 76, { zoom: 3, turn: .5, bg: '#1a2050', frame: true }); E.font.text(g, c.name, x + 38, 140, RIVALS[i].color, { outline: '#10101a', align: 'center' }); });
      }
    },
    multi: {
      items() {
        return grid([
          { id: 'hotseat', label: 'HOT SEAT', sub: '2-8 PLAYERS, ONE PAD', on: () => go('hotseat', { n: 2, attempts: 2, tracks: 3, names: P().data.hotseatNames.slice() }) },
          { id: 'split', label: 'SPLIT SCREEN', sub: '2-4 PLAYERS AT ONCE', on: () => app.modes.splitJoin() },
          { id: 'online', label: 'ONLINE', sub: 'AI HUB SESSIONS', on: () => go('online') }
        ], 1, 260, 46, 64);
      },
      draw(g) { header(g, 'MULTIPLAYER'); }
    },
    online: {
      items() { return [{ id: 'ok', label: 'BACK', x: W() / 2 - 60, y: H() - 70, w: 120, h: 32, on: back }]; },
      draw(g) { header(g, 'ONLINE'); const L = ['ONLINE RACES RUN IN AI HUB SESSIONS.', 'OPEN CRACKMANIA FROM AI HUB', 'WITH UP TO FOUR FRIENDS:', 'THREE MINUTES OF TIME ATTACK,', 'EVERYONE AS GHOSTS. BEST TIME WINS.']; L.forEach((l, i) => text(g, l, W() / 2 - tw(l) / 2, 64 + i * 22, i < 2 ? '#ffffff' : COL.dim)); }
    },
    hotseat: {
      items() {
        const d = st.data, row = (id, label, val, dx) => ({ id, label: label + ': ' + val, x: W() / 2 - 140, y: 0, w: 280, h: 30, on: () => adj(id, 1), adj: dx });
        const adj = (id, k) => { if (id === 'n') d.n = Math.max(2, Math.min(8, d.n + k)); if (id === 'att') d.attempts = Math.max(1, Math.min(3, d.attempts + k)); if (id === 'trk') d.tracks = Math.max(1, Math.min(5, d.tracks + k)); sfx('ui_move'); };
        st.adj = adj;
        const T = [row('n', 'PLAYERS', d.n), row('att', 'ATTEMPTS', d.attempts), row('trk', 'TRACKS IN THE CUP', d.tracks),
          { id: 'names', label: 'NAMES', sub: names(d).slice(0, d.n).join(' • '), x: W() / 2 - 140, w: 280, h: 30, on: () => { d.nameI = 0; d.wheel = new LetterWheel(game, names(d)[0], 10); } },
          { id: 'go', label: 'START THE CUP', x: W() / 2 - 140, w: 280, h: 34, on: () => app.modes.hotseat(names(d).slice(0, d.n), d.attempts, d.tracks) }];
        T.forEach((t, i) => t.y = 52 + i * 38);
        return T;
      },
      draw(g) { header(g, 'HOT SEAT'); const d = st.data; if (d.wheel) { panel(g, W() / 2 - 150, 60, 300, 100); text(g, 'PLAYER ' + (d.nameI + 1) + ' NAME', W() / 2 - 120, 70, '#ffd23a'); d.wheel.draw(g, W() / 2 - 120, 104); } promptBar(g, game, d.wheel ? [['up', 'LETTER'], ['confirm', 'OK'], ['cancel', 'BACK']] : [['left', 'LESS'], ['right', 'MORE'], ['confirm', 'CHOOSE'], ['cancel', 'BACK']]); },
      modal() { const d = st.data; if (!d.wheel) return false; d.wheel.update(); if (d.wheel.done) { if (!d.wheel.cancel) { const n = names(d); n[d.nameI] = d.wheel.value; d.names = n; P().data.hotseatNames = n.slice(); P().save(); if (d.nameI < d.n - 1) { d.nameI++; d.wheel = new LetterWheel(game, n[d.nameI], 10); return true; } } d.wheel = null; } return true; },
      lr(k) { const it = F.cur; if (it && it.adj !== undefined && st.adj) st.adj(it.id, k); }
    },
    replays: {
      items() {
        const R = P().data.replays;
        if (!R.length) return [{ id: 'none', label: 'NO REPLAYS YET', sub: 'SAVE ONE FROM THE RESULTS', x: W() / 2 - 150, y: 80, w: 300, h: 44, disabled: true }];
        return R.slice(0, 10).map((r, i) => ({ id: 'r' + i, label: r.trackName + '  ' + fmt(r.steps), sub: r.car.toUpperCase() + ' • ' + r.date, x: W() / 2 - 160, y: 46 + i * 30, w: 320, h: 26, on: () => app.modes.replay(r), idx: i }));
      },
      draw(g) { header(g, 'REPLAYS'); promptBar(g, game, [['confirm', 'WATCH'], ['del', 'DELETE'], ['cancel', 'BACK']]); },
      del() { const it = F.cur; if (it && it.idx !== undefined) { P().data.replays.splice(it.idx, 1); P().save(); sfx('remove'); F.set([], true); } }
    },
    build: {
      items() {
        const S = P().data.slots;
        return S.map((s, i) => ({ id: 's' + i, label: s ? s.name : 'EMPTY SLOT ' + (i + 1), sub: s ? ENV_INFO[s.env].name + (s.author ? ' • VALIDATED ' + fmt(s.author) : ' • NOT VALIDATED') : 'NEW TRACK', x: W() / 2 - 160 + (i % 2) * 164, y: 50 + Math.floor(i / 2) * 50, w: 156, h: 44, slot: i, on: () => s ? app.modes.editor({ slot: i }) : go('newtrack', { slot: i }) }));
      },
      draw(g) { header(g, 'BUILD'); wallet(g); promptBar(g, game, [['confirm', 'OPEN'], ['del', 'DELETE'], ['alt', 'IMPORT CODE'], ['cancel', 'BACK']]); },
      del() { const it = F.cur; if (it && it.slot !== undefined && P().data.slots[it.slot]) { P().data.slots[it.slot] = null; P().save(); sfx('remove'); } },
      alt() { const it = F.cur; if (it && it.slot !== undefined) app.modes.editor({ slot: it.slot, importCode: true }); }
    },
    newtrack: {
      items() { return ENV_ORDER.map((env, i) => ({ id: env, label: ENV_INFO[env].name, sub: P().envOpen(env) ? ENV_INFO[env].tag : 'LOCKED', disabled: !P().envOpen(env), lock: !P().envOpen(env), icon: (gg, x, y) => envIcon(gg, env, x, y), x: W() / 2 - 150, y: 64 + i * 52, w: 300, h: 44, on: () => app.modes.editor({ slot: st.data.slot, env }) })); },
      draw(g) { header(g, 'NEW TRACK: ENVIRONMENT'); },
      denied: () => deny('OPEN THE ENVIRONMENT IN RACE FIRST')
    },
    results: {
      items() {
        const d = st.data, T = [];
        if (d.next) T.push({ id: 'next', label: 'NEXT', on: d.next });
        T.push({ id: 'retry', label: 'RETRY', on: d.retry });
        if (d.replay) T.push({ id: 'replay', label: 'REPLAY', on: d.replay });
        if (d.saveReplay) T.push({ id: 'save', label: d.saved ? 'SAVED' : 'SAVE', disabled: !!d.saved, on: () => { d.saveReplay(); d.saved = true; sfx('coin'); } });
        T.push({ id: 'menu', label: 'MENU', on: d.menu });
        const w0 = Math.min(78, Math.floor((W() - 30) / T.length) - 6);
        return grid(T, T.length, w0, 26, H() - 54, 6);
      },
      draw(g) {
        const d = st.data, k = Math.min(1, st.t * 2), cx = W() / 2, ML = ['', 'BRONZE', 'SILVER', 'GOLD', "COCO'S TIME"];
        panel(g, cx - 170, 8, 340, H() - 66);
        big(g, d.title || 'FINISH', cx, 14, '#ffd23a', 2);
        big(g, fmt(d.steps), cx, 34, '#ffffff', 3);
        if (d.delta != null) E.font.text(g, (d.delta <= 0 ? 'NEW BEST  ' : 'BEST ' + fmt(d.best) + '  ') + (d.delta <= 0 ? '-' : '+') + (Math.abs(d.delta) / 120).toFixed(2), cx, 62, d.delta <= 0 ? COL.blue : COL.dim, { align: 'center', outline: '#10101a', scale: 1 });
        if (d.medal) { const s = Math.max(1, Math.round(2 + (1 - E.ease.outBack(k)) * 2)); medalIcon(g, cx - 8 * s - 60, 76, d.medal, s); text(g, ML[d.medal], cx - 30, 84, MEDAL_COL[d.medal]); }
        else text(g, 'NO MEDAL', cx - tw('NO MEDAL') / 2, 84, COL.dim);
        if (d.nextTarget) E.font.text(g, d.nextTarget, cx, 116, '#c8c8d8', { outline: '#10101a', align: 'center' });
        if (d.paid) { const n = Math.round(d.paid * Math.min(1, st.t / 1.2)); coinIcon(g, cx - 30, 128); text(g, '+' + n, cx - 14, 128, '#f0a050'); if (n < d.paid && (st.t * 20 | 0) % 2) game.audio.sfx('coin', { vol: .3 }); }
        if (d.quip) E.font.text(g, d.quip, cx, H() - 76, COL.text, { outline: '#10101a', align: 'center' });
        promptBar(g, game, [['confirm', 'CHOOSE'], ['alt', 'RETRY'], ['cancel', 'MENU']]);
      },
      alt: () => st.data.retry && st.data.retry(), back: () => st.data.menu && st.data.menu()
    },
    standings: {
      items() { const d = st.data; return [{ id: 'ok', label: d.button || 'CONTINUE', x: W() / 2 - 80, y: H() - 60, w: 160, h: 32, on: d.on }]; },
      draw(g) {
        const d = st.data; panel(g, W() / 2 - 180, 20, 360, H() - 90);
        big(g, d.title, W() / 2, 28, '#ffd23a', 2);
        (d.rows || []).forEach((r, i) => { const y = 58 + i * 24; text(g, r[0], W() / 2 - 160, y, r[3] || '#ffffff'); text(g, r[1], W() / 2 + 10, y, '#ffffff'); if (r[2] !== undefined) text(g, r[2], W() / 2 + 110, y, '#ffd23a'); });
        if (d.portrait) { const c = makeCast()[d.portrait]; if (c) { c.rig.drawPortrait(g, W() / 2 - 170, H() - 150, 48, { zoom: 3, turn: .5, bg: '#1a2050', frame: true, }); E.font.text(g, d.quip || '', W() / 2 - 116, H() - 130, '#ffffff', { outline: '#10101a', scale: 1, wrap: 270 }); } }
        promptBar(g, game, [['confirm', d.button || 'CONTINUE']]);
      }, back: () => st.data.on && st.data.on()
    },
    card: {
      items() { return [{ id: 'ok', label: 'READY', x: W() / 2 - 70, y: H() * .66, w: 140, h: 34, on: st.data.on }]; },
      draw(g) { const d = st.data; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W(), H(), '#05060c')); big(g, d.title, W() / 2, H() * .2, '#ffffff', 2); big(g, d.name, W() / 2, H() * .2 + 26, d.color || '#ffd23a', 4); if (d.sub) text(g, d.sub, W() / 2 - tw(d.sub) / 2, H() * .2 + 72, COL.dim); promptBar(g, game, [['confirm', 'READY']]); }, noBack: true
    },
    about: {
      items() { return [{ id: 'prev', label: '< PREV', x: 12, y: H() - 52, w: 90, h: 26, on: () => { st.data.i = (st.data.i + ABOUT.length - 1) % ABOUT.length; st.data.scroll = 0; } }, { id: 'next', label: 'NEXT >', x: W() - 102, y: H() - 52, w: 90, h: 26, on: () => { st.data.i = (st.data.i + 1) % ABOUT.length; st.data.scroll = 0; } }]; },
      draw(g) {
        st.data.i = st.data.i || 0; const pg = ABOUT[st.data.i]; panel(g, 10, 10, W() - 20, H() - 70);
        big(g, pg.title, W() / 2, 16, '#ffd23a', 2);
        const lines = []; for (const l of pg.lines) for (const w of E.font.wrap(l, W() - 50, { scale: 1 })) lines.push(w);
        const per = Math.floor((H() - 110) / 11), s = st.data.scroll || 0;
        lines.slice(s, s + per).forEach((l, i) => E.font.text(g, l, 22, 40 + i * 11, l.startsWith('-') ? '#ffffff' : '#c8c8e0', { outline: '#10101a' }));
        if (lines.length > per) E.font.text(g, (s + 1) + '-' + Math.min(lines.length, s + per) + ' / ' + lines.length + '  ↑↓ SCROLL', W() - 24, H() - 72, COL.dim, { align: 'right', outline: '#10101a' });
        E.font.text(g, (st.data.i + 1) + ' / ' + ABOUT.length, W() / 2, H() - 46, COL.dim, { align: 'center', outline: '#10101a' });
        promptBar(g, game, [['left', 'PAGE'], ['up', 'SCROLL'], ['cancel', 'BACK']]);
        st.lines = lines.length; st.per = per;
      },
      lr(k) { st.data.i = (st.data.i + ABOUT.length + k) % ABOUT.length; st.data.scroll = 0; sfx('ui_move'); },
      ud(k) { st.data.scroll = Math.max(0, Math.min(Math.max(0, (st.lines || 0) - (st.per || 10)), (st.data.scroll || 0) + k * 3)); }
    },
    credits: {
      items() { return []; },
      draw(g) {
        const lines = ['CRACKMANIA', '', 'FIFTEEN TRACKS. FIFTEEN GOLDS.', 'THE CLOCK IS CRYING IN A CORNER.', '', 'BUILT ON MY-3D2DGE', 'THREE.JS • RAPIER • AI HUB', '', 'STARRING', 'COCO ASPHALTE', 'MONSIEUR DRAPEAU', 'TEX MIRAGE', 'MLLE GRAVILLON', 'BOBO YETI', '', 'INSPIRED BY TRACKMANIA (2003, NADEO)', 'AN ORIGINAL HOMAGE, NOT AFFILIATED', '', 'NOW BUILD YOUR OWN.', 'ALLEZ!'];
        const y0 = H() - st.t * 22;
        lines.forEach((l, i) => { const y = y0 + i * 22; if (y > -20 && y < H()) big(g, l, W() / 2, y, i === 0 ? '#ffd23a' : '#ffffff', i === 0 ? 3 : 2); });
        if (y0 + lines.length * 22 < 0) { st.stack = [['title', {}]]; st.page = 'main'; F.set([], false); }
        promptBar(g, game, [['cancel', 'SKIP']]);
      }, back: () => { st.stack = [['title', {}]]; st.page = 'main'; F.set([], false); }
    }
  };
  function names(d) { const n = d.names || []; for (let i = 0; i < 8; i++) if (!n[i]) n[i] = 'PLAYER ' + (i + 1); return n; }
  function header(g, s) { big(g, s, W() / 2, 14, '#ffffff', 2); }
  function wallet(g) { const cr = game.cornerArea ? game.cornerArea() : null, y = cr ? cr.y1 + 4 : 10; coinIcon(g, W() - 90, y); text(g, String(P().coppers), W() - 74, y, '#f0a050'); }
  function logo(g, x, y, scale = 4) {
    E.font.title(g, 'CRACKMANIA', Math.round(x), Math.round(y), { scale, colors: ['#fff6d0', '#ffd060', '#ff8a2a', '#c8402a'], depth: 3, align: 'center' });
    // the crack: a zig-zag that grows across the letters
    const k = Math.min(1, st.logoT / 1.2), w = E.font.width('CRACKMANIA', { scale }) * 1.05, x0 = x - w / 2, h = 7 * scale;
    let px0 = x0, py0 = y + h * .5;
    for (let i = 1; i <= 16 * k; i++) { const nx = x0 + w * i / 16, ny = y + h * (.5 + (i % 2 ? -.12 : .1) * (1 + (i % 3) * .3)); px.line(g, Math.round(px0), Math.round(py0), Math.round(nx), Math.round(ny), '#3a1408', 1); px0 = nx; py0 = ny; }
    if (scale >= 4) E.font.text(g, 'CRACK THE CLOCK', Math.round(x), Math.round(y + h + 20), '#ffffff', { scale: 2, outline: '#10101a', align: 'center' });
  }

  function enter(data) {
    if (data && data.page) app.front.reset(data.page, data.data);
    app.music(st.page === 'credits' ? 'victory' : 'title');
    if (!st.demo && !app.online.active) st.demo = new Demo(app, 'D3', { cheat: true, skill: .98, camSwitch: 7 });
    app.race = null;
  }
  function update(dt) {
    st.t += dt; st.logoT += dt;
    const I = game.input;
    if (app.online.active) { app.online.frontUpdate && app.online.frontUpdate(dt); return; }
    if (app.devOpen) { app.dev.update(dt); return; }
    // the touch-only gate: no keyboard, mouse or pad seen yet on a coarse pointer
    if (typeof matchMedia !== 'undefined' && app.touchGate === undefined) app.touchGate = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    if (app.touchGate && (I.lastDevice === 'keyboard' && I.anyPressed() || I.lastDevice === 'gamepad')) { app.touchGate = false; }
    // attract mode: 10 s with no input on the title and the menus
    if (app.attract.on) { if (app.attract.anyInput()) { app.attract.stop(); st.idle = 0; st.stack = []; st.page = 'title'; F.set([], false); } else app.attract.step(dt); return; }
    if (inputSeen()) st.idle = 0; else st.idle += dt;
    if (st.idle > 10 && ['title', 'main', 'envs', 'tracks', 'multi', 'puzzles', 'gauntlet', 'replays', 'about', 'online'].includes(st.page) && !app.dialog.open) { app.attract.start(); st.idle = 0; return; }
    if (st.demo) st.demo.step(dt);
    const pg = PAGES[st.page];
    F.set(pg.items(), true);
    if (app.dialog.update(dt)) return;
    if (pg.modal && pg.modal()) return;
    if (pg.lr) { if (I.repeat('left', .35, .12)) { pg.lr(-1); } if (I.repeat('right', .35, .12)) pg.lr(1); }
    if (pg.ud) { if (I.repeat('up', .3, .08)) pg.ud(-1); if (I.repeat('down', .3, .08)) pg.ud(1); }
    const before = F.i, chosen = F.update(dt, { onDenied: it => pg.denied ? pg.denied(it) : deny('LOCKED') });
    if (F.moved && F.i !== before) sfx('ui_move');
    if (st.page === 'title' && !chosen && (I.pressed('start') || I.pressed('confirm')) && !app.touchGate) app.modes.firstBoot();
    if (pg.alt && I.pressed('alt')) pg.alt();
    if (pg.del && I.pressed('del')) pg.del();
    if (I.pressed('cancel') && !chosen) { if (pg.back) pg.back(); else if (!pg.noBack) back(); }
    // a right click goes back too
    app.typed.length = 0;
  }
  let lastPtr = null;
  function inputSeen() {
    const I = game.input; let seen = I.anyPressed() || Math.hypot(...I.move()) > .3;
    const p = I.pointer(); if (p && (!lastPtr || p[0] !== lastPtr[0] || p[1] !== lastPtr[1])) seen = true; lastPtr = p && p.slice();
    return seen;
  }
  function draw(r) {
    if (app.online.active) { app.online.frontDraw && app.online.frontDraw(r); return; }
    if (app.attract.on) { app.attract.draw(r); return; }
    if (st.demo) st.demo.draw(r);
    r.overlay(g => {
      const pg = PAGES[st.page];
      if (st.page !== 'title') px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05060c'));
      else px.blend(g, .25, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05060c'));
      pg.draw(g);
      F.draw(g, { accent: '#ff9a2a' });
      if (st.page === 'title' && !app.touchGate) { const it = F.items[0]; if (it && Math.floor(st.t * 2) % 2) {} }
      if (!['results', 'standings', 'card', 'about', 'tracks', 'replays', 'build', 'hotseat', 'credits'].includes(st.page)) promptBar(g, game, st.page === 'title' ? (app.touchGate ? [] : [['confirm', 'START']]) : [['confirm', 'CHOOSE'], ['cancel', 'BACK']]);
      app.dialog.draw(g, r.W, r.H);
      if (app.devOpen) app.dev.draw(g, r.W, r.H);
    });
  }
  return { input: FRONT_INPUT, touch: [], camera: false, enter, update, draw };
}
