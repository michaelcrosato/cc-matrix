// AI Hub session flow (protocol v1, shared-world). The host's sim is the only truth. Clients build the same map from the
// seed, mirror the host's snapshots and events, and send only intent. Network only through AIHub.
import { TITLE, SEAT_COLORS, SEAT_PALETTE } from '../data/meta.js';
import { CLASSES } from '../data/classes.js';
import { ZONES } from '../data/zones.js';
import { createHero, autoLoadout } from '../sim/progress.js';
import { startKnell, knellKill, knellTick, knellBossDead } from '../sim/knell.js';
import { refreshStats, livingHeroes, ev } from '../sim/core.js';
import { equipItem } from '../sim/hero.js';
import { stepWorld } from '../sim/world.js';
import { serializeHero } from '../save/save.js';
import { botIntent } from '../sim/bot.js';

const SEAT_CLASS = ['bellwarden', 'lamplighter', 'sexton', 'bellwarden'];
const NAMES = ['Ash', 'Briar', 'Cobb', 'Dusk'];
const SNAP_EVENTS = new Set(['spawn', 'hit', 'hurt', 'kill', 'propBreak', 'gold', 'tallow', 'pickup', 'levelup', 'banner', 'subtitle', 'bossStart', 'bossDead', 'fx', 'tele', 'sfx', 'shake', 'castStart', 'castFire', 'heal', 'revive', 'heroDeath', 'toast', 'dodge', 'potion', 'requiem', 'knellDone', 'dark', 'music', 'comet', 'crumble', 'flash', 'drop', 'wake', 'mattack', 'cantcast', 'equip']);

export async function sessionBoot(opts) {
  if (typeof AIHub === 'undefined' || !AIHub.active) return null;
  const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (!info) return null;
  return new Session(info);
}

class Session {
  constructor(info) { this.info = info; this.active = true; this.server = !!info.server; this.isHost = !!info.isHost || !!info.server; this.me = info.me; this.players = info.players; this.started = false; this.ended = false; this.cardState = { left: null, ready: [], asked: false, starting: false }; this.remote = {}; this.queue = []; this.sendAcc = 0; this.evAcc = 0; this.evBuf = []; this.known = new Map(); this.dropIds = new Set(); this.frame = 0; this.hash = {}; this.pendingCmd = []; this.left = new Set(); this.finished = false; this.lastLoadout = ''; }
  async afterStart(game, engine) {
    this.game = game; this.engine = engine; game.net = this;
    const n = this.players.length;
    const w = game.newWorld({ seed: this.info.seed >>> 0, diff: 'pilgrim', session: true });
    w.acct = { stash: [[], [], []], devotion: { core: 0, offence: 0, defence: 0, utility: 0, xp: 0, level: 0 }, bests: {}, unlocks: {}, grandKeys: 0, codex: { bestiary: {}, lore: {}, seen: {} } };
    w.camp = null; w.session = true; w.hooks.onRespawn = null;
    this.players.forEach((p, i) => { const h = createHero(w, { seat: p.id, cls: SEAT_CLASS[p.id % 4], name: p.name.slice(0, 10) || NAMES[i], level: 12 }); h.level = 12; autoLoadout(h, { tones: true, vows: true }); refreshStats(w, h, true); h.color = p.color; });
    game.seats = this.server ? [] : [{ seat: this.me, kind: 'kbm' }]; game.localSeat = this.server ? -1 : this.me; game.mode = 'session'; game.serverMode = this.server;
    startKnell(w, { tier: 0, mods: [], grand: false, session: true, level: 12 });
    w.knell.total = 230 * (1 + 0.45 * (n - 1));
    if (!this.server) game.beginKnellView();
    game.sessionPaused = true; game.session = this;
    AIHub.on('card', (c) => { this.cardState = c; });
    AIHub.on('start', () => { this.started = true; });
    AIHub.on('message', (data, from) => this.onMessage(data, from));
    AIHub.on('leave', (e) => this.onLeave(e));
    AIHub.on('time-up', () => { if (this.isHost) this.finish(false); });
    AIHub.on('end', () => this.onEnd());
    if (!this.server) { game.pushOverlay('card', {}, false); this.installCardKeys(); }
    if (this.server) this.driveServer(engine);
    AIHub.ready();
  }
  installCardKeys() {
    this.keyFn = (e) => { if (this.started || this.ended) return; if (e.key === 'Enter') { AIHub.answer('ready'); } else if (e.key === 'm' || e.key === 'M') AIHub.answer('more'); };
    window.addEventListener('keydown', this.keyFn);
  }
  driveServer(engine) {
    let last = performance.now();
    const tick = () => { if (this.ended) return; const now = performance.now(); const dt = Math.min(0.5, (now - last) / 1000); last = now; engine.step(Math.max(1, Math.round(dt * 60))); };
    this.timer = setInterval(tick, 50);
  }
  // ---- per frame, from TollGame ----
  playing() { return this.started && AIHub.time() >= 0 && !this.ended; }
  preStep(w, intents) {
    if (!this.playing()) { this.game.sessionPaused = true; return; }
    this.game.sessionPaused = false;
    if (!this.isHost) return;
    for (const p of this.players) { if (this.left.has(p.id)) continue; const r = this.remote[p.id]; if (p.id !== this.me && r) { intents[p.id] = r; this.remote[p.id] = { ...r, pressed: [false, false, false, false, false, false], dodge: false, potion: false, interact: false }; } }
    if (this.server) for (const h of w.heroes) if (!intents[h.seat] && !this.left.has(h.seat)) intents[h.seat] = intents[h.seat] || {};
  }
  postStep(w) {
    if (!this.isHost || this.finished) return;
    if (w.knell && w.knell.done) this.finish(w.knell.won);
  }
  update(game, dt) {
    if (this.ended) return; this.frame++;
    game.sessionPaused = !this.playing();
    if (!this.playing()) { if (this.isHost) return; }
    const w = game.world; if (!w) return;
    // card -> play: close the card overlay when started
    if (this.started && game.overlay && game.overlay.type === 'card' && AIHub.time() >= -2900) game.closeAll();
    if (this.isHost) { this.hostSend(w, dt); } else this.clientSend(game, w, dt);
  }
  // ---- host ----
  hostSend(w, dt) {
    this.sendAcc += dt; this.evAcc += dt;
    if (this.sendAcc >= 0.1) { this.sendAcc = 0; AIHub.send(this.snapshot(w), { reliable: false }); this.vSync(w); }
    if (this.evAcc >= 0.2) { this.evAcc = 0; this.flushEvents(w); }
  }
  snapshot(w) {
    const hs = w.heroes.filter((h) => !h.gone).map((h) => [h.id, Math.round(h.x * 10), Math.round(h.z * 10), Math.round(h.facing * 10), (h.moving ? 1 : 0) | (h.dodgeT > 0 ? 2 : 0), Math.round(h.hp), Math.round(h.res), (h.alive ? 1 : 0) | (h.inv_t > 0 ? 2 : 0), Math.round(h.air * 10 || 0)]);
    const focus = livingHeroes(w); const cx = focus.length ? focus[0].x : 0, cz = focus.length ? focus[0].z : 0;
    const mons = w.monsters.filter((m) => !m.dead && !m.prop && m.state !== 'dormant').map((m) => ({ m, d: Math.min(...(focus.length ? focus : [{ x: cx, z: cz }]).map((h) => Math.hypot(h.x - m.x, h.z - m.z))) })).sort((a, b) => a.d - b.d);
    const near = mons.slice(0, 24); const rest = mons.slice(24).filter((e) => e.d < 40); const slice = rest.length ? rest.filter((e, i) => (i + this.frame) % 3 === 0).slice(0, 6) : [];
    const ms = near.concat(slice).map(({ m }) => [m.id, Math.round(m.x * 10), Math.round(m.z * 10), Math.round(m.facing * 10), Math.round(m.hp), m.stunT > 0 ? 1 : 0]);
    const k = w.knell; const f = k ? [Math.round(k.fill * 1000), k.phase === 'warden' ? 1 : k.phase === 'done' ? 2 : 0] : [0, 0];
    return { t: 's', n: Math.round(w.t * 10), h: hs, m: ms, k: f };
  }
  vSync(w) {
    // each player's own loadout state, only to them
    for (const p of this.players) {
      if (p.id === this.me || this.left.has(p.id)) continue;
      const h = w.heroes.find((q) => q.seat === p.id); if (!h) continue;
      const s = JSON.stringify([h.level, h.gold, h.inv.length, Object.values(h.gear).map((g) => g && g.uid), h.skills.map((q) => q && q.id + q.tone), h.vows, h.mats]);
      if (s !== this.hash[p.id]) { this.hash[p.id] = s; AIHub.send({ t: 'v', hero: serializeHero(h), upg: h.upgrade || 0 }, { to: p.id, reliable: true }); }
    }
  }
  collect(w, e) { if (SNAP_EVENTS.has(e.t)) this.evBuf.push(e); }
  onEvent(e, w) { if (!this.isHost) return; this.collect(w, e); }
  flushEvents(w) {
    // drop views: added and removed since last time
    const adds = []; const seen = new Set();
    for (const d of w.drops) { seen.add(d.id); if (!this.dropIds.has(d.id)) { this.dropIds.add(d.id); adds.push({ id: d.id, kind: d.kind, x: d.x, z: d.z, v: d.v, owner: d.owner, item: d.item, gem: d.gem }); } }
    const gone = []; for (const id of this.dropIds) if (!seen.has(id)) { gone.push(id); this.dropIds.delete(id); }
    const spawns = [];
    let evs = this.evBuf; this.evBuf = [];
    const slim = evs.map((e) => { const o = { ...e }; delete o.tick; return o; });
    let json = JSON.stringify({ t: 'e', e: slim, da: adds, dr: gone });
    while (json.length > 12000 && slim.length > 1) { const half = slim.splice(Math.floor(slim.length / 2)); this.evBuf.unshift(...half.map((e) => e)); json = JSON.stringify({ t: 'e', e: slim, da: adds, dr: gone }); }
    if (slim.length || adds.length || gone.length) AIHub.send(JSON.parse(json), { reliable: true });
  }
  // ---- client ----
  clientSend(game, w, dt) {
    this.sendAcc += dt; const I = game.pending[this.me];
    if (I) { this.sendEdges(I); I.pressed = [false, false, false, false, false, false]; I.dodge = false; I.potion = false; I.interact = false; }
    // loadout sync
    if (this.sendAcc >= 0.1) {
      this.sendAcc = 0; const h = w.heroes.find((q) => q.seat === this.me);
      if (I) AIHub.send({ t: 'i', mx: +I.mx.toFixed(2), mz: +I.mz.toFixed(2), ax: I.ax == null ? null : +I.ax.toFixed(1), az: I.az == null ? null : +I.az.toFixed(1), soft: I.soft ? 1 : 0, held: I.held.map((b) => (b ? 1 : 0)), ij: I.interactHold ? 1 : 0 }, { reliable: false });
      if (h) { const L = JSON.stringify([Object.values(h.gear).map((g) => g && g.uid), h.skills.map((q) => q && q.id + ':' + q.tone), h.vows]); if (L !== this.lastLoadout) { this.lastLoadout = L; AIHub.send({ t: 'x', gear: Object.fromEntries(Object.entries(h.gear).map(([s, g]) => [s, g && g.uid])), skills: h.skills, vows: h.vows }, { reliable: true }); } }
    }
  }
  sendEdges(I) {
    const any = I.pressed.some(Boolean) || I.dodge || I.potion || I.interact; if (!any) return;
    const ok = AIHub.send({ t: 'c', p: I.pressed.map((b) => (b ? 1 : 0)), d: I.dodge ? 1 : 0, q: I.potion ? 1 : 0, e: I.interact ? 1 : 0 }, { reliable: true });
    if (!ok) this.pendingCmd.push(I);
  }
  cmd(kind, arg) { AIHub.send({ t: 'k', k: kind, a: arg }, { reliable: true }); }
  // ---- both ----
  onMessage(m, from) {
    if (this.ended || !m) return; const game = this.game; const w = game && game.world; if (!w) return;
    if (this.isHost) {
      if (m.t === 'i') { const r = this.remote[from] || (this.remote[from] = { mx: 0, mz: 0, held: [false, false, false, false, false, false], pressed: [false, false, false, false, false, false] }); Object.assign(r, { mx: m.mx, mz: m.mz, ax: m.ax, az: m.az, soft: !!m.soft, held: m.held.map(Boolean), interactHold: !!m.ij }); }
      else if (m.t === 'c') { const r = this.remote[from] || (this.remote[from] = { mx: 0, mz: 0, held: [false, false, false, false, false, false], pressed: [false, false, false, false, false, false] }); for (let i = 0; i < 6; i++) if (m.p[i]) r.pressed[i] = true; if (m.d) r.dodge = true; if (m.q) r.potion = true; if (m.e) r.interact = true; }
      else if (m.t === 'x') this.applyLoadout(w, from, m);
      else if (m.t === 'k') { const h = w.heroes.find((q) => q.seat === from); if (h && m.k === 'drop') { const i = h.inv.findIndex((x) => x.uid === m.a); if (i >= 0) h.inv.splice(i, 1); } }
    } else {
      if (m.t === 's') this.applySnapshot(w, m);
      else if (m.t === 'e') this.applyEvents(game, w, m);
      else if (m.t === 'v') { const h = w.heroes.find((q) => q.seat === this.me); if (h) { for (const k of ['level', 'xp', 'inv', 'gear', 'gold', 'mats', 'gems', 'reliquary']) h[k] = m.hero[k]; if (!game.overlay || game.overlay.type !== 'hero') { h.skills = m.hero.skills; h.vows = m.hero.vows; } h.upgrade = m.upg; h._specKey = null; refreshStats(w, h, false); } }
    }
  }
  applyLoadout(w, seat, m) {
    const h = w.heroes.find((q) => q.seat === seat); if (!h) return;
    for (const [slot, uid] of Object.entries(m.gear || {})) { if (uid && (!h.gear[slot] || h.gear[slot].uid !== uid) && h.inv.some((x) => x.uid === uid)) equipItem(w, h, uid); }
    if (Array.isArray(m.skills)) { const ok = m.skills.every((s) => !s || (CLASSES[h.cls].skills.includes(s.id))); if (ok) { h.skills = m.skills.slice(0, 6); h._specKey = null; } }
    if (Array.isArray(m.vows)) h.vows = m.vows.slice(0, 2); autoLoadout(h); refreshStats(w, h);
  }
  applySnapshot(w, m) {
    w.t = m.n / 10;
    for (const a of m.h) { const h = w.heroes.find((q) => q.id === a[0]); if (!h) continue; const nx = a[1] / 10, nz = a[2] / 10;
      if (h.seat === this.me && h.alive) { const err = Math.hypot(nx - h.x, nz - h.z); if (err > 1.2) { h.x = nx; h.z = nz; } else { h.x += (nx - h.x) * 0.25; h.z += (nz - h.z) * 0.25; } }
      else { h.tx = nx; h.tz = nz; if (h.x === 0 && h.z === 0) { h.x = nx; h.z = nz; } }
      h.facing = a[3] / 10; h.moving = !!(a[4] & 1); h.dodgeT = a[4] & 2 ? 0.2 : 0; h.hp = a[5]; h.res = a[6]; h.alive = !!(a[7] & 1); h.air = (a[8] || 0) / 10; }
    for (const a of m.m) { const mo = w.monsters.find((q) => q.id === a[0]); if (!mo) continue; mo.tx = a[1] / 10; mo.tz = a[2] / 10; mo.facing = a[3] / 10; mo.hp = a[4]; mo.stunT = a[5] ? 0.2 : 0; mo.moving = true; mo.state = mo.state === 'dormant' ? 'aggro' : mo.state; }
    if (w.knell) { w.knell.fill = m.k[0] / 1000; w.knell.phase = m.k[1] === 1 ? 'warden' : m.k[1] === 2 ? 'done' : 'fill'; }
  }
  applyEvents(game, w, m) {
    for (const d of m.da || []) { if (!w.drops.some((q) => q.id === d.id)) w.drops.push({ ...d, t: 0 }); }
    for (const id of m.dr || []) { const d = w.drops.find((q) => q.id === id); if (d) d.dead = true; }
    for (const e of m.e || []) {
      if (e.t === 'spawn' && !w.monsters.some((q) => q.id === e.id)) { w.monsters.push({ id: e.id, type: e.type, x: e.x, z: e.z, tx: e.x, tz: e.z, hp: e.hp || 1, maxHp: e.hp || 1, r: 0.5, scale: e.scale || 1, elite: !!e.elite, rare: !!e.rare, aff: [], status: {}, kx: 0, kz: 0, stunT: 0, flash: 0, team: e.team || 'monster', name: e.name || '', state: 'aggro', dead: false, big: false, boss: null, facing: 0 }); }
      if (e.t === 'kill') { const mo = w.monsters.find((q) => q.id === e.id); if (mo) mo.dead = true; }
      if (e.t === 'bossStart') { const b = w.monsters.find((q) => q.id === e.id); if (b) { b.boss = e.boss; b.bossBar = true; b.name = e.name; } }
      w.events.push(e);
    }
    w.drops = w.drops.filter((d) => !d.dead);
    if (w.monsters.some((q) => q.dead)) w.monsters = w.monsters.filter((q) => !q.dead || false);
  }
  /** Called each render frame on clients: glide mirrored entities toward the host's positions. */
  interp(w, dt) {
    const k = Math.min(1, dt * 9);
    for (const h of w.heroes) if (h.tx != null && h.seat !== this.me) { h.x += (h.tx - h.x) * k; h.z += (h.tz - h.z) * k; }
    for (const m of w.monsters) if (m.tx != null) { m.x += (m.tx - m.x) * k; m.z += (m.tz - m.z) * k; }
  }
  onLeave(e) { this.left.add(e.id); const w = this.game.world; if (!w) return; const h = w.heroes.find((q) => q.seat === e.id); if (h) { h.gone = true; if (this.isHost) ev(w, { t: 'toast', seat: 0, text: h.name.toUpperCase() + ' LEFT' }); } }
  finish(won) {
    if (this.finished) return; this.finished = true; const w = this.game.world;
    const stats = {}, scores = {}; const rows = [];
    for (const h of w.heroes) { if (this.left.has(h.seat)) continue; const sc = Math.round(h.damageDone / 100 + 50 * h.revives + 20 * h.eliteKills - 30 * h.deaths); scores[h.seat] = sc; stats[h.seat] = { 'Damage': Math.round(h.damageDone), 'Kills': h.kills, 'Revives': h.revives, 'Gold': h.goldFound, 'Deaths': h.deaths }; rows.push({ id: h.seat, sc, h }); }
    rows.sort((a, b) => b.sc - a.sc); const standings = []; for (const r of rows) { const last = standings[standings.length - 1]; if (last && scores[last[0]] === r.sc) last.push(r.id); else standings.push([r.id]); }
    const best = (f) => rows.slice().sort((a, b) => f(b.h) - f(a.h))[0];
    const awards = []; if (rows.length) { const a = best((h) => h.damageDone), b = best((h) => h.kills), c = best((h) => h.revives), d = best((h) => h.goldFound), e = best((h) => h.deaths); awards.push({ id: a.id, title: 'Bell-Ringer', detail: 'Most damage' }, { id: b.id, title: 'Undertaker', detail: 'Most kills' }, { id: c.id, title: 'Good Samaritan', detail: 'Most revives' }, { id: d.id, title: 'Collector', detail: 'Most gold' }, { id: e.id, title: 'Regular Customer', detail: 'Most deaths' }); }
    try { AIHub.finish({ standings, scores, won: !!won, stats, awards }); } catch (err) { console.warn(err); }
  }
  onEnd() { this.ended = true; const g = this.game; if (!g) return; g.sessionPaused = true; g.ctx.input.release(); try { g.audio.stopAll(); } catch {} if (this.timer) clearInterval(this.timer); if (this.keyFn) window.removeEventListener('keydown', this.keyFn); }
  // ---- the game's own card ----
  drawCard(ui, nav) {
    const g = this.game; const hud = ui.hud; const W = ui.hudW, H = ui.hudH; const c = this.cardState || {};
    hud.rect(0, 0, W, 44, 'ink'); hud.rect(0, 44, W, 2, 'plum'); hud.rect(0, H - 70, W, 70, 'ink'); hud.rect(0, H - 71, W, 1, 'plum');
    ui.center(8, TITLE.toUpperCase(), { scale: 3, color: 'sand' });
    // players
    this.players.forEach((p, i) => { const x = Math.round(W / 2 - this.players.length * 54 + i * 108); const ready = (c.ready || []).includes(p.id); hud.rect(x, H - 66, 104, 14, SEAT_PALETTE[p.id % 4]); hud.rect(x + 1, H - 65, 102, 12, 'night'); ui.text(x + 4, H - 62, (p.name || 'PLAYER').toUpperCase().slice(0, 10), { color: SEAT_PALETTE[p.id % 4] }); ui.text(x + 66, H - 62, ready ? 'READY' : '...', { color: ready ? 'lime' : 'slate' }); });
    ui.center(H - 48, 'GOAL: FILL THE KNELL, THEN SLAY ITS WARDEN TOGETHER', { color: 'white' });
    const left = c.left == null ? '' : Math.ceil(c.left / 1000) + 'S'; ui.center(H - 36, c.paused ? 'WAITING FOR MORE TIME' : c.starting ? 'STARTING' : 'ROUND STARTS IN ' + left, { color: 'sky' });
    const gl = g.glyphs; let x = Math.round(W / 2 - 150); const y = H - 22;
    x += gl.draw(hud, x, y, 'move') + 2; ui.text(x, y + 2, 'MOVE', { color: 'mist' }); x += 34;
    x += gl.draw(hud, x, y, 'skill1') + 2; ui.text(x, y + 2, 'ATTACK', { color: 'mist' }); x += 44;
    x += gl.draw(hud, x, y, 'skill2') + 2; ui.text(x, y + 2, 'SKILLS', { color: 'mist' }); x += 40; x += gl.draw(hud, x, y, 'dodge') + 2; ui.text(x, y + 2, 'DODGE', { color: 'mist' });
    const rz = ui.zone('ready', W - 130, H - 22, 52, 14); hud.rect(W - 131, H - 23, 54, 16, rz.focused ? 'sand' : 'slate'); hud.rect(W - 130, H - 22, 52, 14, 'plum'); ui.text(W - 124, H - 18, 'READY', { color: 'white' }); if (rz.clicked) AIHub.answer('ready');
    const mz = ui.zone('more', W - 70, H - 22, 56, 14); hud.rect(W - 71, H - 23, 58, 16, mz.focused ? 'sand' : 'slate'); hud.rect(W - 70, H - 22, 56, 14, 'night'); ui.text(W - 66, H - 18, 'MORE TIME', { color: 'white' }); if (mz.clicked || (nav.alt2)) AIHub.answer('more');
    if (nav.ok && g.glyphs.device === 'pad') AIHub.answer('ready');
  }
}
