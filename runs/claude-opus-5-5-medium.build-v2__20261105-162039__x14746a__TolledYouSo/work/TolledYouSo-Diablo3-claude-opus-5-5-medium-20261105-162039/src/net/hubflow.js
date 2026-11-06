// AI Hub sessions: connect, build the round from the seed, own card, play, finish, end.
import { Engine, THREE } from '../../pixel-engine.js';
import { CLASSES } from '../data/classes.js';
import { TITLE } from '../data/meta.js';
import { addHero, newWorld, stepWorld } from '../sim/step.js';
import { presetHero, scoreOf, SEAT_CLASS, setupRound } from '../sim/round.js';
import { NetClient } from './client.js';
import { hubColors } from './mirror.js';
import { NetHost } from './host.js';
import { prompt } from '../ui/glyphs.js';

export function hubTransport(info) {
  const handlers = [];
  AIHub.on('message', (d, from) => { if (d?.k !== 'hi') for (const h of handlers) h(d, from); });
  return { me: info.me, send: (d, o) => AIHub.send(d, o), on: (fn) => handlers.push(fn) };
}
export function buildRoundWorld(info) {
  const w = newWorld({ seed: info.seed, difficulty: 0 }); w.mode = 'session';
  for (const p of info.players) { const h = addHero(w, { seat: p.id, cls: SEAT_CLASS[p.id % 4], name: p.name }); presetHero(w, h); }
  setupRound(w, info.players.length);
  w.events.length = 0;
  return w;
}
// One session object drives the game inside the engine's hooks.
export class Session {
  constructor(info) { this.info = info; this.phase = 'card'; this.card = { left: null, ready: [], asking: 0, asked: false, paused: false, starting: false }; this.ended = false; this.finished = false; this.answered = false; this.server = !!info.server; this.timeUp = false; }
  async setup(game) {
    this.game = game; const info = this.info; const ctx = game.ctx;
    this.world = buildRoundWorld(info);
    const t = hubTransport(info);
    this.isHost = info.isHost;
    this.net = info.isHost ? new NetHost(t, this.world) : new NetClient(t, this.world, info.me);
    this.net.onEvent = (ev) => this.world.events.push(ev);
    if (info.isHost) { this.net.intentFor = (seat, w, view) => (seat === info.me ? game.router.intentFor(0, w, view, w.heroes.find((h) => h.seat === seat)) : this.net.remoteIntent(seat)); this.net.canStep = () => this.playing(); }
    else { this.net.intentFor = () => ({}); this.net.fixed = (dt) => { if (this.playing() && !this.ended) { const h = this.world.heroes.find((q) => q.seat === info.me); const it = h ? game.router.intentFor(0, this.world, game.play.view, h) : { moveX: 0, moveZ: 0, pressed: {}, held: {} }; this.net.step(it); } }; this.net.canStep = () => false; }
    this.net.update = () => {};
    AIHub.on('card', (c) => { this.card = c; });
    AIHub.on('start', () => { this.phase = 'countdown'; });
    AIHub.on('leave', ({ id }) => { const h = this.world.heroes.find((q) => q.seat === id); if (h) { h.left = true; if (!this.server) game.play?.hud.toast(`${h.name} HAS LEFT.`, 'mist'); } });
    AIHub.on('time-up', () => { this.timeUp = true; if (this.isHost) this.finish(false); });
    AIHub.on('end', () => this.end());
    if (!this.server) {
      game.play.begin(this.world, { local: info.players.some((p) => p.id === info.me) ? [info.me] : [], net: this.net });
      game.shell.state = 'session';
      game.music.play('knell');
      game.settings.load({});
      this.onKey = (e) => { if (this.phase !== 'card' || this.ended) return; if (e.key === 'Enter') { AIHub.answer('ready'); this.answered = true; } if (e.key === 'm' || e.key === 'M') AIHub.answer('more'); };
      if (typeof window !== 'undefined') window.addEventListener('keydown', this.onKey);
    } else { this.net.update = () => {}; }
    AIHub.ready();
    // Before play, intents and snapshots still flow at 10 Hz on a timer, however slowly frames arrive, so every copy knows the others are there.
    t.send({ k: 'hi' }, { reliable: true });
    this.beat = setInterval(() => { if (this.ended || this.playing()) { clearInterval(this.beat); return; } if (this.isHost) this.net.beat(); else this.net.heartbeat(); }, 100);
  }
  playing() { return AIHub.time() >= 0 && !this.ended; }
  fixed(dt) {
    if (this.ended) return;
    if (!this.playing()) return;
    if (this.server) { if (this.playing()) { stepWorld(this.world, this.gather()); this.net.afterStep(); const ev = this.world.events; this.world.events = []; this.net.outgoing(ev); this.check(); } return; }
    this.game.play.fixed(dt);
    if (this.isHost) this.check();
  }
  gather() { const out = {}; for (const h of this.world.heroes) if (!h.left) out[h.seat] = this.net.remoteIntent(h.seat); return out; }
  check() { const r = this.world.round; if (r?.wardenDead && !this.finished) this.finish(true); if (!this.finished && this.world.heroes.every((h) => h.left) ) this.finish(false); }
  finish(won) {
    if (this.finished) return; this.finished = true;
    const players = this.world.heroes.filter((h) => !h.left);
    const scored = players.map((h) => ({ h, s: Math.round(scoreOf(h)) })).sort((a, b) => b.s - a.s);
    const standings = []; let last = null; for (const { h, s } of scored) { if (last === s) standings[standings.length - 1].push(h.seat); else standings.push([h.seat]); last = s; }
    const scores = {}; const stats = {}; for (const { h, s } of scored) { scores[h.seat] = s; stats[h.seat] = { Damage: Math.round(h.damage), Kills: h.kills, Revives: h.revives, Deaths: h.deaths, Gold: h.goldEarned }; }
    const top = (key, title, detail) => { if (!players.length) return null; const best = players.reduce((a, b) => (b[key] > a[key] ? b : a)); return best[key] > 0 ? { id: best.seat, title, detail: `${detail}: ${Math.round(best[key])}` } : null; };
    const awards = [top('damage', 'Bell-Ringer', 'Most damage'), top('kills', 'Undertaker', 'Most kills'), top('revives', 'Good Samaritan', 'Most revives'), top('goldEarned', 'Collector', 'Most gold'), top('deaths', 'Regular Customer', 'Most deaths')].filter(Boolean);
    AIHub.finish({ standings, scores, won, stats, awards });
  }
  end() {
    if (this.ended) return; this.ended = true; clearInterval(this.beat);
    if (typeof window !== 'undefined' && this.onKey) window.removeEventListener('keydown', this.onKey);
    if (this.game && !this.server) { this.game.music.stopAll(); this.game.voice.stop(); this.game.play.running = false; this.game.ctx.engine.timeScale = 0; }
  }
  update(dt) {
    const game = this.game; const ui = game.ui; if (this.server || !game) return;
    if (this.ended) { return; }
    const play = game.play; const m = ui.m;
    if (this.phase === 'card') { play.ctx.camera.setZoom(1.2); this.keepCardView(dt); this.drawCard(ui, m); return; }
    if (AIHub.time() >= 0) this.phase = 'play';
    play.update(dt);
    if (this.phase === 'countdown') { const left = Math.ceil(-AIHub.time() / 1000); ui.textC(ui.W / 2, ui.H * 0.34, String(Math.max(1, left)), { color: 'sand', scale: 4 }); }
    const round = this.world.round; if (this.isHost && round) round.tShown = round.t;
  }
  keepCardView(dt) {
    const play = this.game.play; const w = this.world; const e = w.zone.entrance;
    play.view.update(w, dt, 1, {}); play.target.set(e.x, 0.9, e.z); play.view.focus.set(e.x, 0, e.z);
    w.events.length = 0;
  }
  drawCard(ui, m) {
    const info = this.info; const c = this.card;
    const W = Math.min(ui.W - 8, 380); const X = ui.W / 2 - W / 2; const Y = 6; const H = ui.H - 12;
    ui.frame(X, Y, W, H, 'sand', 'ink');
    ui.textC(ui.W / 2, Y + 5, TITLE, { color: 'sand', scale: ui.measure(TITLE, 2) < W - 8 ? 2 : 1 });
    let y = Y + 24; y += ui.para(X + 6, y, 'FILL THE KNELL, THEN SLAY ITS WARDEN TOGETHER.', W - 12, { color: 'white' }) + 3;
    info.players.forEach((p) => { const rd = c.ready?.includes(p.id); ui.rect(X + 6, y, 7, 7, hubColors[p.id % 4]); ui.text(X + 16, y, String(p.name).slice(0, Math.floor((W - 90) / 6)), { color: hubColors[p.id % 4] }); ui.textR(X + W - 6, y, rd ? 'READY' : CLASSES[SEAT_CLASS[p.id % 4]].name.slice(0, 11), { color: rd ? 'lime' : 'mist' }); y += 10; });
    y += 3; let x = X + 6;
    for (const [a, l] of [['move', 'MOVE'], ['skill0', 'ATTACK'], ['skill1', 'SKILL'], ['dodge', 'DODGE'], ['potion', 'DRINK']]) { const lw = ui.measure(l) + 20 + (a === 'move' || a === 'dodge' ? 16 : 0); if (x + lw > X + W - 4) { x = X + 6; y += 13; } const pw = prompt(ui, x, y, a); x += pw + 3; x += ui.text(x, y + 2, l, { color: 'mist' }) + 6; }
    y += 15; y += ui.para(X + 6, y, 'STAND ON A CLASS FONT FOR 2 S IN THE FIRST ROOM TO SWAP.', W - 12, { color: 'mist' }) + 3;
    const secs = c.left === null || c.left === undefined ? '' : `${Math.ceil(c.left / 1000)} S`;
    ui.textC(ui.W / 2, y, c.paused ? 'HOLDING: MORE TIME ASKED' : c.starting ? 'STARTING' : secs, { color: 'sand' });
    const by = Y + H - 26;
    const bw = Math.floor((W - 16) / 2);
    if (ui.button('card:ready', X + 5, by, bw, 20, c.ready?.includes(info.me) ? 'READY!' : 'READY', { border: 'lime' }) || (this.game.router.pads.some((p) => (p.b & 1) && !(p.prev & 1)))) { AIHub.answer('ready'); }
    if (ui.button('card:more', X + 11 + bw, by, bw, 20, c.asked ? 'NEVER MIND' : 'MORE TIME', { first: false }) || (this.game.router.pads.some((p) => (p.b & 8) && !(p.prev & 8)))) { AIHub.answer('more'); }
  }
}
export async function runHubFlow(info, createGame, options, onFail) {
  const session = new Session(info);
  try { return await Engine.start(createGame({ session, noSaveBoot: true }), options); } catch (e) { AIHub.fail(String(e?.message ?? e)); onFail(e); return null; }
}
// A copy with no player: the engine on no GPU, driven by a timer.
export async function runServerCopy(info, createGame) {
  const session = new Session(info);
  const engine = await Engine.headless(createGame({ session, noSaveBoot: true }), {});
  let last = performance.now(); let acc = 0;
  const timer = setInterval(() => { const now = performance.now(); acc += Math.min(0.5, (now - last) / 1000); last = now; const n = Math.floor(acc * 60); if (n > 0) { acc -= n / 60; engine.step(n); } if (session.ended) clearInterval(timer); }, 33);
  return engine;
}
export { THREE };
