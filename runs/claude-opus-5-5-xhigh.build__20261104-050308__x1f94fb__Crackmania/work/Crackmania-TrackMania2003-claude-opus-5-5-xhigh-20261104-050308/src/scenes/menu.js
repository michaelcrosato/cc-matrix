// CRACKMANIA front end (PLAN §5.1-5.13, §3.3): pages over the showcase. MAIN (RACE, PUZZLE, SURVIVAL, BUILD,
// MULTIPLAYER, GARAGE, REPLAYS, OPTIONS, ABOUT), environment and track select, puzzles, gauntlets, build slots, hot seat
// and split screen set-up, the online tile, replays, the About pages, the player's name. Tiles at least 96 x 64, a
// prompt bar on every page, hover focuses and a click picks, Escape / Circle / a right click goes back
import { ctx, E } from '../ctx.js';
import { MENU_INPUT } from '../input.js';
import { Focus, tile, rowItem, panel, T1, T2, title, UI, accent, toast, drawToasts, LetterWheel } from '../ui/kit.js';
import { promptBar, promptRow } from '../ui/glyphs.js';
import { medal, coin, lock, emblem, carSide, MEDAL_NAME } from '../ui/icons.js';
import { showcase, stepShowcase, drawShowcase } from './showcase.js';
import { ENVS, ENV_IDS } from '../env/envs.js';
import { ENV_TRACKS, PUZZLES } from '../data/tracks.js';
import * as C from '../modes/campaign.js';
import { fmt } from '../race/run.js';
import { startSurvival, RANKS } from '../modes/survival.js';
import { startHotSeat } from '../modes/hotseat.js';
import { startSplit } from '../modes/split.js';
import { Track } from '../track/track.js';
import { ABOUT } from '../data/about.js';
const F = () => E.font;
const st = { stack: [], focus: new Focus(), t: 0, page: null, cocoGhost: false, hs: { n: 2, names: ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5', 'PLAYER 6', 'PLAYER 7', 'PLAYER 8'], attempts: 2, cup: 3, random: false, picks: [] }, sp: { bestOf: 1, track: 0 }, wheel: null, aboutPage: 0, aboutScroll: 0, confirm: null };
export const menuState = st;
const P = () => ctx.profile;
const minimapCache = new Map();
/** a track's route as a little polyline (decimated samples, normalised) */
function minimap(track) {
  const key = track.id + ':' + track.version; if (minimapCache.has(key)) return minimapCache.get(key);
  const S = track.samples(8); if (!S.length) { minimapCache.set(key, null); return null; }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of S) { x0 = Math.min(x0, s.p[0]); y0 = Math.min(y0, s.p[1]); x1 = Math.max(x1, s.p[0]); y1 = Math.max(y1, s.p[1]); }
  const m = { pts: S.map(s => [s.p[0], s.p[1], s.p[2]]), x0, y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }; minimapCache.set(key, m); return m;
}
export function drawMinimap(g, track, x, y, w, h, col = '#ffffff', dot = null) {
  const m = minimap(track); if (!m) return;
  const k = Math.min(w / m.w, h / m.h), ox = x + (w - m.w * k) / 2, oy = y + (h - m.h * k) / 2;
  for (let i = 1; i < m.pts.length; i++) { const a = m.pts[i - 1], b = m.pts[i]; E.px.line(g, ox + (a[0] - m.x0) * k, oy + (a[1] - m.y0) * k, ox + (b[0] - m.x0) * k, oy + (b[1] - m.y0) * k, b[2] > 4 ? '#ffd060' : col, 1); }
  const s = m.pts[0]; E.px.rect(g, ox + (s[0] - m.x0) * k - 1, oy + (s[1] - m.y0) * k - 1, 3, 3, '#5ad06a');
  const f = m.pts[m.pts.length - 1]; E.px.rect(g, ox + (f[0] - m.x0) * k - 1, oy + (f[1] - m.y0) * k - 1, 3, 3, '#ff5a4a');
  if (dot) E.px.rect(g, ox + (dot[0] - m.x0) * k - 2, oy + (dot[1] - m.y0) * k - 2, 4, 4, '#ffd060');
}
/** a grid of tiles in the safe area: n items, cols, the area below the title and above the prompt bar */
function grid(r, n, cols, o = {}) {
  const top = o.top ?? 54, bottom = o.bottom ?? r.H - 28, gap = o.gap ?? 8, margin = 12, w = Math.min(o.maxW || 150, (r.W - margin * 2 - gap * (cols - 1)) / cols), rows = Math.ceil(n / cols), h = Math.max(o.minH ?? 64, Math.min(o.maxH || 90, (bottom - top - gap * (rows - 1)) / rows));
  const tw = cols * w + (cols - 1) * gap, x0 = (r.W - tw) / 2, th = rows * h + (rows - 1) * gap, y0 = top + Math.max(0, (bottom - top - th) / 2);
  return Array.from({ length: n }, (_, i) => ({ x: Math.round(x0 + (i % cols) * (w + gap)), y: Math.round(y0 + Math.floor(i / cols) * (h + gap)), w: Math.round(w), h: Math.round(h) }));
}
function header(g, r, text, sub) {
  E.px.blend(g, .6, 'normal', () => E.px.rect(g, 0, 0, r.W, 44, '#05040a'));
  title(g, text, 14, 10, 2, ['#ffffff', '#ffe8b0', accent()], 'left');
  if (sub) T1(g, sub, 16, 30, UI.dim);
  // the wallet and the name, top right (clear of the engine's corner buttons)
  const ca = ctx.game.cornerArea && ctx.game.cornerArea(), right = r.W - 14 - (ca && ca.y0 < 40 ? (r.W - ca.x0) : 0);
  coin(g, right - 6, 16); T2(g, String(P().coppers), right - 16, 10, '#ffb070', 'right');
  T1(g, P().p.name, right, 28, UI.dim, 'right');
}
const go = (page, o = {}) => { st.stack.push(Object.assign({ page }, o)); st.focus.reset(o.focus || 0); st.t = 0; ctx.game.input.consumeAll(); };
const back = () => { if (st.wheel) { st.wheel = null; return; } if (st.confirm) { st.confirm = null; return; } if (st.stack.length > 1) { const top = st.stack.pop(); ctx.sound.sfx('back'); st.focus.reset(top.from || 0); } else ctx.game.go('title'); };
const cur = () => st.stack[st.stack.length - 1] || { page: 'main' };
export const vr = () => ({ W: ctx.game.W || 427, H: ctx.game.H || 240 });
/* ---- the pages: each returns { title, sub, items(r), draw(g, r), prompts } ---- */
const PAGES = {
  main: () => ({ title: 'CRACKMANIA', sub: 'CRACK THE CLOCK', items(r) {
    const L = [
      ['RACE', 'RACE AGAINST THE CLOCK', () => go('env')], ['PUZZLE', C.ENV_ORDER.some(C.puzzlesOpen) ? 'FIND THE MISSING ROAD' : 'MEDAL ON A 2ND TRACK', () => go('puzzles'), !C.ENV_ORDER.some(C.puzzlesOpen)],
      ['SURVIVAL', C.ENV_ORDER.some(C.survivalOpen) ? 'THE GHOST GUILD' : 'MEDAL ON A 3RD TRACK', () => go('survival'), !C.ENV_ORDER.some(C.survivalOpen)],
      ['BUILD', 'THE TRACK EDITOR', () => go('build')], ['MULTIPLAYER', 'HOT SEAT, SPLIT, ONLINE', () => go('multi')], ['GARAGE', 'THE PAINT SHOP', () => ctx.game.go('garage')],
      ['REPLAYS', P().p.replays.length + ' SAVED', () => go('replays')], ['OPTIONS', 'SETTINGS, CONTROLS', () => ctx.game.menu('settings')], ['ABOUT', 'CREDITS, INFO', () => go('about')]
    ];
    const G = grid(r, 9, 3, { maxW: 140, maxH: 74, minH: 44, gap: 6, top: 52 });
    return L.map(([label, sub, f, locked], i) => Object.assign(G[i], { id: label, label, sub, onPick: locked ? () => { ctx.sound.sfx('error'); toast('LOCKED: ' + sub, '#ff9a6a'); } : f, locked,
      draw: (g, q, foc, k, t) => tile(g, q, foc, k, t, { labelY: q.h / 2 - 10, subY: q.h - 11, inner: (g2, x, y, w, h) => { mainIcon(g2, label, x + 14, y + 12, t); if (locked) lock(g2, x + w - 10, y + 11); } }) }));
  }, extra(g, r) { const n = P().p.name; T1(g, 'HELLO ' + n + ' · ' + C.ENV_ORDER.reduce((a, e) => a + C.medalCount(e), 0) + ' MEDALS', r.W / 2, 48, UI.dim, 'center'); },
  prompts: [['confirm', 'SELECT'], ['cancel', 'TITLE'], ['secondary', 'NAME']], secondary: () => { st.wheel = new LetterWheel(P().p.name, 10); st.wheelDone = n => { P().p.name = n; P().save(); }; } }),
  env: () => ({ title: 'RACE', sub: 'PICK AN ENVIRONMENT', items(r) {
    const G = grid(r, 3, 3, { maxW: 160, maxH: 150 });
    return ENV_IDS.map((e, i) => { const open = C.envOpen(e), E2 = ENVS[e]; return Object.assign(G[i], { id: e, label: E2.name, sub: open ? E2.tagline.toUpperCase() : 'LOCKED', disabled: false, onPick: open ? () => go('tracks', { env: e, from: i }) : () => { ctx.sound.sfx('error'); toast(C.envNeed(e), '#ff9a6a'); },
      draw: (g, q, foc, k, t) => tile(g, q, foc, k, t, { accent: E2.accent, labelY: 8, inner: (g2, x, y, w, h) => {
        emblem(g2, e, x + w / 2, y + 42, 1.6); carSide(g2, E2.car, x + w / 2, y + h - 36, 1.3, ctx.profile.paint(E2.car).body, !open);
        if (!open) { lock(g2, x + w / 2, y + 44, 2); T1(g2, C.envNeed(e), x + w / 2, y + h - 26, '#ff9a6a', 'center', { wrap: w - 10 }); }
        else { const n = C.medalCount(e), gd = C.medalCount(e, 3); T1(g2, CAR(E2.car) + ' · ' + n + '/5 MEDALS · G ' + gd + '/5', x + w / 2, y + h - 26, '#ffffff', 'center'); }
      } }) }); });
  }, prompts: [['confirm', 'SELECT'], ['cancel', 'BACK']] }),
  tracks: (pg) => { const e = pg.env, E2 = ENVS[e]; return { title: E2.name, sub: E2.tagline.toUpperCase() + (st.cocoGhost ? " · RACING COCO'S GHOST" : ''), items(r) {
    const ids = ENV_TRACKS[e], G = grid(r, 5, 5, { maxW: 96, maxH: 140, bottom: r.H - 58 });
    return ids.map((id, i) => { const tr = ctx.tracks[id], open = C.trackOpen(id), rec = P().record(id), m = rec ? rec.medal : 0; return Object.assign(G[i], { id, label: id, sub: open ? (rec && rec.bestSteps ? fmt(rec.bestSteps) : 'NO TIME') : 'LOCKED', onPick: open ? () => { ctx.sound.sfx('confirm'); C.raceCampaign(id, { coco: st.cocoGhost }); } : () => { ctx.sound.sfx('error'); toast('MEDAL ON ' + ids[i - 1] + ' FIRST', '#ff9a6a'); },
      draw: (g, q, foc, k, t) => tile(g, q, foc, k, t, { accent: E2.accent, labelY: 6, subY: q.h - 24, inner: (g2, x, y, w, h) => {
        T1(g2, tr.name.toUpperCase(), x + w / 2, y + 26, open ? '#ffffff' : '#6a6688', 'center', { wrap: w - 6 });
        if (open) drawMinimap(g2, tr, x + 10, y + 40, w - 20, h - 74, foc ? E2.accent : '#c8c4e8'); else lock(g2, x + w / 2, y + h / 2 + 4, 2);
        medal(g2, x + w / 2, y + h - 9, m, 5);
      } }) }); });
  }, extra(g, r) { const q = st.focus.cur; if (!q) return; const T = ctx.medals[q.id]; if (!T) return; const y = r.H - 52; panel(g, r.W / 2 - 170, y, 340, 22, {}); let x = r.W / 2 - 160; for (const [m, s] of [[1, T.bronze], [2, T.silver], [3, T.gold], [4, T.author]]) { medal(g, x + 6, y + 11, m, 5); T1(g, fmt(s), x + 16, y + 7, '#ffffff'); x += 84; } },
  prompts: () => [['confirm', 'RACE'], ['secondary', st.cocoGhost ? "COCO'S GHOST: ON" : "COCO'S GHOST: OFF"], ['cancel', 'BACK']], secondary: () => { st.cocoGhost = !st.cocoGhost; ctx.sound.sfx('tick'); } }; },
  puzzles: () => ({ title: 'PUZZLE', sub: 'FIND THE MISSING ROAD', items(r) {
    const G = grid(r, 6, 3, { maxW: 150, maxH: 96 });
    return PUZZLES.map((p, i) => { const open = C.puzzleOpen(p.id), rec = P().p.puzzles[p.id]; return Object.assign(G[i], { id: p.id, label: p.name.toUpperCase(), sub: open ? (rec && rec.bestSteps ? fmt(rec.bestSteps) : 'UNSOLVED') : 'MEDAL ON ' + ENV_TRACKS[p.env][1], onPick: open ? () => ctx.game.go('editor', { puzzle: p.id }) : () => { ctx.sound.sfx('error'); toast('LOCKED', '#ff9a6a'); },
      draw: (g, q, foc, k, t) => tile(g, q, foc, k, t, { accent: ENVS[p.env].accent, labelY: 10, inner: (g2, x, y, w, h) => { emblem(g2, p.env, x + 16, y + h / 2 + 4, 1); if (!open) lock(g2, x + w - 14, y + 14); medal(g2, x + w - 16, y + h / 2 + 4, rec ? rec.medal : 0, 6); T1(g2, p.id, x + w / 2, y + h / 2, UI.dim, 'center'); } }) }); });
  }, prompts: [['confirm', 'SOLVE'], ['cancel', 'BACK']] }),
  survival: () => ({ title: 'SURVIVAL', sub: 'THREE GHOSTS. ONE ROAD.', items(r) {
    const G = grid(r, 3, 3, { maxW: 160, maxH: 120 });
    return ENV_IDS.map((e, i) => { const open = C.survivalOpen(e), rec = P().p.survival[e]; return Object.assign(G[i], { id: e, label: ENVS[e].name, sub: open ? (rec ? 'BEST: ' + RANKS[rec.bestRank] + (rec.cleared ? ' ★' : '') : 'NOT TRIED') : 'MEDAL ON ' + ENV_TRACKS[e][2], onPick: open ? () => startSurvival(e) : () => { ctx.sound.sfx('error'); toast('LOCKED', '#ff9a6a'); },
      draw: (g, q, foc, k, t) => tile(g, q, foc, k, t, { accent: ENVS[e].accent, labelY: 8, inner: (g2, x, y, w, h) => { emblem(g2, e, x + w / 2, y + 44, 1.4); T1(g2, '5 ROUNDS · GAUNTLET', x + w / 2, y + 66, UI.dim, 'center'); if (!open) lock(g2, x + w - 14, y + 14); } }) }); });
  }, prompts: [['confirm', 'START'], ['cancel', 'BACK']] }),
  build: () => ({ title: 'BUILD', sub: 'YOUR TRACKS · 6 SLOTS', items(r) {
    const G = grid(r, 6, 3, { maxW: 150, maxH: 90 });
    return P().p.slots.map((s, i) => Object.assign(G[i], { id: 'slot' + i, label: s ? s.name : 'EMPTY SLOT', sub: s ? (s.author ? 'VALIDATED ' + fmt(s.author) : 'NOT VALIDATED') : 'NEW TRACK', onPick: () => s ? ctx.game.go('editor', { slot: i }) : go('newtrack', { slot: i, from: i }),
      draw: (g, q, foc, k, t) => tile(g, q, foc, k, t, { accent: s ? ENVS[s.env].accent : accent(), labelY: 10, inner: (g2, x, y, w, h) => { if (s) { emblem(g2, s.env, x + 14, y + h / 2 + 4, .9); const tr = slotTrack(i); if (tr) drawMinimap(g2, tr, x + 28, y + 26, w - 40, h - 44, '#c8c4e8'); if (s.author) medal(g2, x + w - 12, y + 12, 4, 5); } else T1(g2, '+', x + w / 2, y + h / 2 - 2, accent(), 'center', { scale: 3 }); } }) }));
  }, prompts: [['confirm', 'OPEN'], ['tertiary', 'DELETE'], ['cancel', 'BACK']], tertiary: () => { const i = st.focus.i, s = P().p.slots[i]; if (!s) return; st.confirm = { text: 'DELETE "' + s.name + '"?', yes: () => { P().p.slots[i] = null; P().save(); toast('DELETED'); } }; } }),
  newtrack: (pg) => ({ title: 'NEW TRACK', sub: 'PICK ITS ENVIRONMENT', items(r) {
    const G = grid(r, 3, 3, { maxW: 150, maxH: 110 });
    return ENV_IDS.map((e, i) => Object.assign(G[i], { id: e, label: ENVS[e].name, sub: C.envOpen(e) || true ? ENVS[e].tagline.toUpperCase() : '', onPick: () => ctx.game.go('editor', { slot: pg.slot, env: e, fresh: true }), draw: (g, q, foc, k, t) => tile(g, q, foc, k, t, { accent: ENVS[e].accent, labelY: 8, inner: (g2, x, y, w, h) => emblem(g2, e, x + w / 2, y + h / 2 + 4, 1.6) }) }));
  }, prompts: [['confirm', 'BUILD'], ['cancel', 'BACK']] }),
  multi: () => ({ title: 'MULTIPLAYER', sub: 'SAME ROAD, SAME CLOCK', items(r) {
    const G = grid(r, 3, 3, { maxW: 160, maxH: 120 });
    return [['HOT SEAT', '2-8 PLAYERS, ONE PAD', () => go('hotseat')], ['SPLIT SCREEN', '2-4 PLAYERS AT ONCE', () => go('split')], ['ONLINE', 'AI HUB SESSIONS', () => go('online')]].map(([label, sub, f], i) => Object.assign(G[i], { id: label, label, sub, onPick: f, draw: (g, q, foc, k, t) => tile(g, q, foc, k, t, { labelY: 10, inner: (g2, x, y, w, h) => mainIcon(g2, label, x + w / 2, y + h / 2 - 2, t) }) }));
  }, prompts: [['confirm', 'SELECT'], ['cancel', 'BACK']] }),
  online: () => ({ title: 'ONLINE', sub: 'GHOST RACES IN AI HUB', items(r) { return [Object.assign({ id: 'ok', x: r.W / 2 - 60, y: r.H - 80, w: 120, h: 30, label: 'OK', onPick: back }, { draw: tile })]; },
    extra(g, r) { const x = r.W / 2; panel(g, x - 190, 62, 380, 120, {}); const L = ['Online races run in AI Hub sessions:', 'open CRACKMANIA from AI Hub with friends.', '', 'Up to four players time-attack the same track', 'for three minutes and see each other as ghosts.', 'Best time wins. Retry as often as you like.']; L.forEach((l, i) => T1(g, l, x, 72 + i * 16, i < 2 ? '#ffffff' : UI.dim, 'center', { scale: i < 2 ? 1 : 1 })); },
    prompts: [['confirm', 'OK'], ['cancel', 'BACK']] }),
  hotseat: () => { const H = st.hs; return { title: 'HOT SEAT', sub: 'TAKE TURNS ON ONE CONTROLLER', items(r) {
    const x = r.W / 2 - 150, w = 300, h = 24, y0 = 56; let y = y0; const rows = [];
    const row = (id, label, value, o = {}) => { rows.push(Object.assign({ id, x, y, w, h, label, value, draw: rowItem }, o)); y += h + 5; };
    row('n', 'PLAYERS', '◀ ' + H.n + ' ▶', { onLeft: () => { H.n = Math.max(2, H.n - 1); }, onRight: () => { H.n = Math.min(8, H.n + 1); }, onPick: () => { H.n = H.n % 8 + 1 || 2; if (H.n < 2) H.n = 2; } });
    row('names', 'NAMES', H.names.slice(0, H.n).join(', ').slice(0, 26) + '…', { onPick: () => go('hsnames') });
    row('att', 'ATTEMPTS EACH', '◀ ' + H.attempts + ' ▶', { onLeft: () => { H.attempts = Math.max(1, H.attempts - 1); }, onRight: () => { H.attempts = Math.min(3, H.attempts + 1); }, onPick: () => { H.attempts = H.attempts % 3 + 1; } });
    row('cup', 'TRACKS IN THE CUP', '◀ ' + H.cup + ' ▶', { onLeft: () => { H.cup = Math.max(1, H.cup - 1); }, onRight: () => { H.cup = Math.min(5, H.cup + 1); }, onPick: () => { H.cup = H.cup % 5 + 1; } });
    row('rnd', 'TRACK ORDER', H.random ? 'RANDOM' : 'IN ORDER', { onLeft: () => { H.random = !H.random; }, onRight: () => { H.random = !H.random; }, onPick: () => { H.random = !H.random; } });
    row('pick', 'PICK TRACKS', (H.picks.length ? H.picks.join(' ') : 'AUTO'), { onPick: () => go('hspick') });
    y += 6; row('go', 'START THE CUP', '', { onPick: () => startHotSeat({ names: H.names.slice(0, H.n), attempts: H.attempts, tracks: cupTracks(H) }) });
    return rows;
  }, prompts: [['confirm', 'SELECT'], ['left', 'CHANGE'], ['cancel', 'BACK']] }; },
  hsnames: () => { const H = st.hs; return { title: 'NAMES', sub: 'WHO IS PLAYING', items(r) { const G = grid(r, H.n, 2, { maxW: 180, maxH: 30 }); return H.names.slice(0, H.n).map((n, i) => Object.assign(G[i], { id: 'n' + i, label: n, onPick: () => { st.wheel = new LetterWheel(n, 10); st.wheelDone = v => { H.names[i] = v; }; }, draw: rowItem })); }, prompts: [['confirm', 'RENAME'], ['cancel', 'DONE']] }; },
  hspick: () => { const H = st.hs; return { title: 'PICK TRACKS', sub: 'UP TO ' + H.cup + ' · YOUR OWN VALIDATED TRACKS TOO', items(r) {
    const L = availableTracks(), G = grid(r, L.length, 6, { maxW: 70, maxH: 44 });
    return L.map((t, i) => Object.assign(G[i], { id: t.key, label: t.key.length > 4 ? t.label.slice(0, 6) : t.key, sub: H.picks.includes(t.key) ? '✓ ' + (H.picks.indexOf(t.key) + 1) : '', onPick: () => { const k = H.picks.indexOf(t.key); if (k >= 0) H.picks.splice(k, 1); else if (H.picks.length < H.cup) H.picks.push(t.key); else toast('THE CUP IS FULL'); }, draw: (g, q, foc, kk, tt) => tile(g, q, foc, kk, tt, { accent: ENVS[t.track.env].accent, labelY: 6 }) }));
  }, prompts: [['confirm', 'PICK'], ['cancel', 'DONE']] }; },
  split: () => { const SP = st.sp; return { title: 'SPLIT SCREEN', sub: 'EVERYONE JOINS, THEN START', enter() { ctx.game.allowJoin({ max: 4 }); }, items(r) {
    const x = r.W / 2 - 150, w = 300, h = 24; let y = 150; const rows = [];
    const L = availableTracks(); SP.track = Math.min(SP.track, L.length - 1);
    rows.push({ id: 'trk', x, y, w, h, label: 'TRACK', value: '◀ ' + L[SP.track].label + ' ▶', draw: rowItem, onLeft: () => { SP.track = (SP.track - 1 + L.length) % L.length; }, onRight: () => { SP.track = (SP.track + 1) % L.length; }, onPick: () => { SP.track = (SP.track + 1) % L.length; } }); y += h + 5;
    rows.push({ id: 'bo', x, y, w, h, label: 'RACES', value: 'BEST OF ' + SP.bestOf, draw: rowItem, onLeft: () => { SP.bestOf = SP.bestOf === 1 ? 3 : 1; }, onRight: () => { SP.bestOf = SP.bestOf === 1 ? 3 : 1; }, onPick: () => { SP.bestOf = SP.bestOf === 1 ? 3 : 1; } }); y += h + 11;
    rows.push({ id: 'go', x, y, w, h, label: ctx.game.players.length >= 2 ? 'START (' + ctx.game.players.length + ' PLAYERS)' : 'WAITING FOR PLAYER 2', draw: rowItem, disabled: ctx.game.players.length < 2, onPick: () => startSplit({ inputs: ctx.game.players.slice(), track: L[SP.track].track, bestOf: SP.bestOf }) });
    return rows;
  }, extra(g, r) {
    const n = ctx.game.players.length, x0 = r.W / 2 - 4 * 38;
    for (let i = 0; i < 4; i++) { const x = x0 + i * 76, q = ctx.game.players[i], on = !!q; panel(g, x, 54, 70, 84, { border: on ? ['#3ab0f0', '#e8402a', '#3ac850', '#ffc21a'][i] : '#3a3658' }); T2(g, 'P' + (i + 1), x + 35, 60, on ? '#ffffff' : '#6a6688', 'center'); if (on) { carSide(g, 'coyote', x + 35, 108, .9, ['#3ab0f0', '#e8402a', '#3ac850', '#ffc21a'][i]); T1(g, q.half ? (q.half === 'left' ? 'KEYS: WASD' : 'KEYS: ARROWS') : q.pad !== null && q.pad !== undefined ? 'PAD ' + (q.pad + 1) : 'KEYBOARD', x + 35, 122, UI.dim, 'center'); } else T1(g, 'JOIN', x + 35, 98, '#6a6688', 'center'); }
    T1(g, 'Pads: press Options (Start) to join · Keyboard: player 2 presses 2 (arrows), player 1 keeps WASD', r.W / 2, r.H - 44, UI.dim, 'center');
  }, leave() { }, prompts: [['confirm', 'SELECT'], ['cancel', 'BACK']] }; },
  replays: () => ({ title: 'REPLAYS', sub: '10 SLOTS', items(r) {
    const L = P().p.replays, x = r.W / 2 - 180, w = 360, h = 22; let y = 54;
    if (!L.length) return [{ id: 'none', x, y: 80, w, h: 30, label: 'NO REPLAYS YET', disabled: true, draw: rowItem }];
    return L.map((rp, i) => { const q = { id: 'r' + i, x, y, w, h, label: (rp.trackName || rp.track || '').toUpperCase().slice(0, 18), value: fmt(rp.steps) + ' · ' + (rp.car || '').toUpperCase(), draw: rowItem, onPick: () => ctx.game.go('replay', { replay: rp }) }; y += h + 4; return q; });
  }, prompts: [['confirm', 'WATCH'], ['tertiary', 'DELETE'], ['cancel', 'BACK']], tertiary: () => { const i = st.focus.i, L = P().p.replays; if (!L[i]) return; st.confirm = { text: 'DELETE THIS REPLAY?', yes: () => { L.splice(i, 1); P().save(); toast('DELETED'); } }; } }),
  about: () => ({ title: 'ABOUT', sub: ABOUT.pages[st.aboutPage][0], items(r) { return []; }, extra(g, r) { aboutPage(g, r); }, prompts: [['tabL', 'PREV'], ['tabR', 'NEXT'], ['up', 'SCROLL'], ['cancel', 'BACK']], tabs: true })
};
const CAR = id => ({ coyote: 'COYOTE', pebble: 'PEBBLE', moose: 'MOOSE' }[id]);
function slotTrack(i) { const s = P().p.slots[i]; if (!s) return null; const key = 'slot' + i + ':' + s.saved; if (!slotTrack.c || slotTrack.c.key !== key) { try { slotTrack.c = { key, t: Track.fromJSON(s.track) }; } catch (e) { slotTrack.c = { key, t: null }; } } return slotTrack.c.t; }
/** the tracks a multiplayer game can use: the open campaign tracks and the validated custom ones */
export function availableTracks() {
  const L = [];
  for (const e of ENV_IDS) for (const id of ENV_TRACKS[e]) if (C.trackOpen(id)) L.push({ key: id, label: id + ' ' + ctx.tracks[id].name.toUpperCase(), track: ctx.tracks[id] });
  P().p.slots.forEach((s, i) => { if (s && s.author) { const t = Track.fromJSON(s.track); t.id = 'slot' + i; t.name = s.name; L.push({ key: 'C' + (i + 1), label: 'C' + (i + 1) + ' ' + s.name, track: t, custom: true }); } });
  return L;
}
function cupTracks(H) { const L = availableTracks(); let picked = H.picks.map(k => (L.find(t => t.key === k) || {}).track).filter(Boolean); if (!picked.length) { const R = E.rng(H.random ? Math.floor(ctx.game.real * 1000) : 1); const pool = L.slice(); picked = []; while (picked.length < H.cup && pool.length) picked.push(pool.splice(H.random ? Math.floor(R() * pool.length) : 0, 1)[0].track); } return picked.slice(0, H.cup); }
function mainIcon(g, label, x, y, t) {
  const a = accent();
  if (label === 'RACE') { E.px.rect(g, x - 10, y - 3, 20, 6, '#3a3a44'); E.px.rect(g, x - 2 + ((t * 20) % 10) - 5, y - 1, 4, 2, '#ffd23a'); flagIcon(g, x + 8, y - 10); }
  else if (label === 'PUZZLE') { E.px.rect(g, x - 9, y - 7, 8, 8, a); E.px.rect(g, x + 1, y - 7, 8, 8, '#4a4670'); E.px.rect(g, x - 9, y + 2, 8, 8, '#4a4670'); E.px.rect(g, x + 1, y + 2, 8, 8, a); }
  else if (label === 'SURVIVAL') { for (let i = 0; i < 3; i++) { E.px.disc(g, x - 8 + i * 8, y, 4, ['#ff8a2a', '#a86ae8', '#e8f0ff'][i]); E.px.rect(g, x - 10 + i * 8, y + 2, 5, 4, ['#ff8a2a', '#a86ae8', '#e8f0ff'][i]); } }
  else if (label === 'BUILD') { E.px.rect(g, x - 8, y - 2, 16, 4, '#ffd030'); E.px.rect(g, x - 2, y - 8, 4, 16, '#8a6a42'); }
  else if (label === 'MULTIPLAYER' || label === 'HOT SEAT' || label === 'SPLIT SCREEN' || label === 'ONLINE') { E.px.disc(g, x - 5, y - 2, 4, '#3ab0f0'); E.px.disc(g, x + 5, y - 2, 4, '#e8402a'); E.px.rect(g, x - 9, y + 2, 8, 6, '#3ab0f0'); E.px.rect(g, x + 1, y + 2, 8, 6, '#e8402a'); }
  else if (label === 'GARAGE') carSide(g, 'coyote', x, y + 6, .5, ctx.profile.paint('coyote').body);
  else if (label === 'REPLAYS') { E.px.rect(g, x - 9, y - 6, 18, 12, '#2a2848'); E.px.poly(g, [[x - 3, y - 4], [x + 5, y], [x - 3, y + 4]], a); }
  else if (label === 'OPTIONS') { E.px.disc(g, x, y, 7, '#8a86b8'); E.px.disc(g, x, y, 3, '#1a1630'); for (let i = 0; i < 6; i++) { const q = i * Math.PI / 3 + t; E.px.rect(g, x + Math.cos(q) * 8 - 1, y + Math.sin(q) * 8 - 1, 3, 3, '#8a86b8'); } }
  else if (label === 'ABOUT') { E.px.disc(g, x, y, 7, a); T1(g, 'i', x + 1, y - 4, '#1a1630', 'center'); }
}
const flagIcon = (g, x, y) => { E.px.rect(g, x, y, 1, 12, '#c8c8d0'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) E.px.rect(g, x + 1 + i * 3, y + j * 3, 3, 3, (i + j) & 1 ? '#1a1a22' : '#ffffff'); };
function aboutPage(g, r) {
  const [head, lines] = ABOUT.pages[st.aboutPage], x = 20, w = r.W - 40, top = 56, bottom = r.H - 30;
  panel(g, 12, top - 6, r.W - 24, bottom - top + 6, {});
  let y = top - st.aboutScroll; const lh = 11;
  g.save(); g.beginPath(); g.rect(14, top - 4, r.W - 28, bottom - top + 2); g.clip();
  for (const L0 of lines) { const head = L0.startsWith('# '), L = head ? L0.slice(2) : L0, wrapped = F().wrap(L, w); if (head) y += 3; for (const s of wrapped) { if (y > top - 12 && y < bottom) T1(g, s, x, y, head ? '#ffd060' : '#ffffff'); y += lh; } y += 3; }
  g.restore(); g._c = null;
  st.aboutMax = Math.max(0, y + st.aboutScroll - bottom + 10);
  T1(g, (st.aboutPage + 1) + ' / ' + ABOUT.pages.length, r.W - 20, 36, UI.dim, 'right');
}
/* ---- the scene ---- */
export const menuScene = {
  input: MENU_INPUT, touch: [], camera: { zoom: false },
  enter(d) {
    ctx.game.splitScreen(0);
    if (!ctx.session || ctx.session.kind !== 'demo') showcase('D3'); else ctx.music.play('title');
    st.stack = [{ page: 'main' }]; st.focus.reset(0); st.t = 0; st.wheel = null; st.confirm = null;
    if (d && d.page && d.page !== 'main') { if (d.page === 'tracks') st.stack.push({ page: 'env' }); st.stack.push({ page: d.page, env: d.env }); }
    ctx.game.input.consumeAll();
    if (d && d.beats) runBeats(d.beats);
  },
  exit() { if (cur().page !== 'split') ctx.game.allowJoin(false); },
  update(dt) {
    const I = ctx.game.input; st.t += dt;
    stepShowcase(dt);
    if (ctx.talk.update(dt)) return;
    if (ctx.attract.idle(dt, 'menu')) return;
    const pg = cur(), def = PAGES[pg.page](pg);
    if (pg.page === 'split' && !pg.joined) { pg.joined = true; ctx.game.allowJoin({ max: 4 }); } else if (pg.page !== 'split' && ctx.game._join) { ctx.game.allowJoin(false); while (ctx.game.players.length > 1) ctx.game.removePlayer(ctx.game.players.length); }
    if (st.wheel) { st.wheel.update(I); if (st.wheel.done) { st.wheelDone && st.wheelDone(st.wheel.name); st.wheel = null; ctx.sound.sfx('confirm'); } else if (I.pressed('cancel')) st.wheel = null; return; }
    if (st.confirm) { if (I.pressed('confirm')) { st.confirm.yes(); st.confirm = null; I.consumeAll(); } else if (I.pressed('cancel')) { st.confirm = null; I.consumeAll(); } return; }
    if (I.pressed('cancel')) { back(); return; }
    if (def.secondary && I.pressed('secondary')) def.secondary();
    if (def.tertiary && I.pressed('tertiary')) def.tertiary();
    if (def.tabs) {
      const n = ABOUT.pages.length;
      if (I.pressed('tabR') || I.repeat('right')) { st.aboutPage = (st.aboutPage + 1) % n; st.aboutScroll = 0; ctx.sound.sfx('move'); }
      if (I.pressed('tabL') || I.repeat('left')) { st.aboutPage = (st.aboutPage - 1 + n) % n; st.aboutScroll = 0; ctx.sound.sfx('move'); }
      if (I.down('down')) st.aboutScroll = Math.min(st.aboutMax || 0, st.aboutScroll + 120 * dt);
      if (I.down('up')) st.aboutScroll = Math.max(0, st.aboutScroll - 120 * dt);
      const z = I.zoom && I.zoom(); if (z && z !== 1) st.aboutScroll = Math.max(0, Math.min(st.aboutMax || 0, st.aboutScroll + (z < 1 ? 30 : -30)));
      return;
    }
    st.focus.set(def.items(vr())); st.focus.update(dt, I);
  },
  draw(r) {
    drawShowcase(r);
    const pg = cur(), def = PAGES[pg.page](pg);
    r.overlay(g => {
      E.px.blend(g, .35, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#05040a'));
      header(g, r, def.title, def.sub);
      st.focus.set(def.items(r)); st.focus.draw(g);
      if (def.extra) def.extra(g, r);
      const pr = typeof def.prompts === 'function' ? def.prompts() : def.prompts; promptBar(g, r, pr);
      if (st.wheel) { E.px.blend(g, .7, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#05040a')); T2(g, 'NAME', r.W / 2, r.H / 2 - 50, '#ffffff', 'center'); st.wheel.draw(g, r.W / 2, r.H / 2 - 16); promptBar(g, r, [['up', 'LETTER'], ['right', 'MOVE'], ['confirm', 'DONE'], ['cancel', 'CANCEL']]); }
      if (st.confirm) { E.px.blend(g, .7, 'normal', () => E.px.rect(g, 0, 0, r.W, r.H, '#05040a')); panel(g, r.W / 2 - 140, r.H / 2 - 30, 280, 60, { border: '#ff5a4a' }); T2(g, st.confirm.text, r.W / 2, r.H / 2 - 18, '#ffffff', 'center'); promptRow(g, r.W / 2, r.H / 2 + 8, [['confirm', 'YES'], ['cancel', 'NO']], { align: 'center' }); }
      drawToasts(g, r, 1 / 60);
    });
    ctx.talk.draw(r);
  },
  back() { back(); return true; }
};
/** the story beats a result opened, one after another */
export function runBeats(list) {
  for (const [id, env] of list) {
    if (id === 'cracked') { if (ctx.profile.seen('cracked:' + env)) continue; ctx.profile.mark('cracked:' + env); ctx.talk.scene([['coco', 'You cracked ' + ENVS[env].name + '. I will need more asphalt.']]); }
    else if (id === 'ending') { ctx.profile.p.ended = true; ctx.profile.save(); ctx.talk.beat('ending', { onDone: () => ctx.game.go('credits', { ending: true }) }); }
    else ctx.talk.beat(id);
  }
}
// typed letters go to the name wheel (a keyboard player types their name)
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (st.wheel && (e.key.length === 1 || e.key === 'Backspace')) { (st.wheel.typed || (st.wheel.typed = [])).push(e.key); } });
export { PAGES, go as goPage };
