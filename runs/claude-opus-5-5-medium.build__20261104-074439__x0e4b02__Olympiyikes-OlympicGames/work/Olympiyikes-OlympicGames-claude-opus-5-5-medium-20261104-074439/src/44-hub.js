/* OLYMPIYIKES! — AI Hub sessions (§12.2): "Hub Heats" in ghost mode. Three dealt events on the hub's clock, the other
 * players as ghosts, points per event, progress, one result; time-up, end and leave handled. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;
const GROUPS = [['sprint', 'swim'], ['javelin', 'archery', 'weights', 'diving', 'skijump'], ['downhill', 'bobsled']];
const SEATS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const READY_S = 5, SPLASH_S = 4;
const H = O.Hub = {
  info: null, events: [], slots: [], slot: -1, total: 0, perfs: {}, sent: false, ended: false, frozen: false, ghosts: {}, lastSend: 0, sends: 0, card: null, started: false, cardAnswered: null, others: {}, progT: 0,
  /** boot: connect, deal, build the card */
  async connect() {
    const AI = window.AIHub; if (!AI || !AI.active) return null;
    const info = await AI.connect({ mode: 'ghost', seats: [1, 4], card: true });
    if (!info) return null;
    H.info = info; O.hubLive = true;
    const rd = AI.rng('deal'); H.events = GROUPS.map(g => g[Math.floor(rd() * g.length)]);
    const rn = AI.rng('nations'), nats = O.NATIONS.map(n => n.id); for (let i = nats.length - 1; i > 0; i--) { const j = Math.floor(rn() * (i + 1)); [nats[i], nats[j]] = [nats[j], nats[i]]; }
    H.nats = nats; H.players = (info.players || []).map((p, i) => ({ id: p.id, name: String(p.name || 'P' + (i + 1)).slice(0, 14).toUpperCase(), color: p.color || SEATS[i % 4], nat: nats[i % 8], ready: false }));
    let t = 0; H.slots = H.events.map(id => { const len = READY_S + ((O.EVENTS[id].hub || {}).seconds || 45) + SPLASH_S, s = { id, start: t, len }; t += len; return s; });
    AI.on('card', c => { H.card = c; if (c && c.ready) for (const p of H.players) p.ready = c.ready.includes(p.id); });
    AI.on('start', () => { H.started = true; });
    AI.on('message', (d, from) => H.onMessage(d, from));
    AI.on('leave', ({ id }) => { delete H.ghosts[id]; delete H.others[id]; const p = H.players.find(q => q.id === id); if (p) p.left = true; });
    AI.on('time-up', () => { if (!H.sent) H.sendResult(); H.frozen = true; O.hubFrozen = true; O.banner('TIME!', { life: 3 }); });
    AI.on('end', () => { H.ended = true; H.frozen = true; O.hubFrozen = true; O.hubEnded = true; for (const p of game.players) p.clear(); game.audio.music(null); O.Comms.reset(); });
    return info;
  },
  me() { return H.players.find(p => p.id === H.info.me) || H.players[0]; },
  time() { const AI = window.AIHub; return AI && AI.time ? AI.time() : -Infinity; },
  /** called each step from the hub scenes and the event scene */
  update() {
    if (!H.info || H.ended) return;
    const t = H.time() / 1000;
    if (H.started && t >= 0) {
      const k = H.slots.findIndex(s => t >= s.start && t < s.start + s.len);
      const want = k < 0 ? H.slots.length : k;
      if (want !== H.slot) {
        if (H.slot >= 0 && H.slot < H.slots.length && !H.perfs[H.slot]) H.finalize(H.slot, null);   // reached the slot's end unfinished
        H.slot = want;
        if (want < H.slots.length) H.enterSlot(want); else { if (!H.sent) H.sendResult(); game.go('hubSplash', { final: true }, { fade: 0 }); }
      }
    }
    // progress about once a second
    H.progT += 1 / 120; if (H.progT > 1 && H.started && !H.sent) { H.progT = 0; H.progress(); }
  },
  enterSlot(i) {
    const s = H.slots[i], me = H.me();
    const meet = O.flow.newMeet('hub', { events: [s.id], players: [{ nat: me.nat, input: 0, color: me.color }], practice: true });
    meet.mode = 'hub'; meet.seed = (H.info.seed || 1) + i * 7; O.meet = meet; meet.rival = 'TRB';
    game.go('ev:' + s.id, { hub: true }, { fade: 0 });
  },
  slotT() { if (H.slot < 0 || H.slot >= H.slots.length) return 0; return H.time() / 1000 - H.slots[H.slot].start; },
  /** the event scene waits through the GET READY part of its slot */
  hold(ctx) { return H.slotT() < READY_S; },
  eventEnter(ctx) { ctx.hubSlot = H.slot; },
  attemptDone(ctx) { H.progress(); },
  eventDone(ctx) {
    const row = ctx.results.rows.find(r => r.a.human) || ctx.results.rows[0];
    H.finalize(ctx.hubSlot !== undefined ? ctx.hubSlot : H.slot, row);
    game.go('hubSplash', { slot: H.slot }, { fade: 0 });
  },
  finalize(i, row) {
    if (H.perfs[i]) return;
    const s = H.slots[i], def = O.EVENTS[s.id], v = row ? row.v : null, pts = v == null ? 0 : Math.round(def.points(v));
    H.perfs[i] = { id: s.id, v, pts, display: v == null ? 'DNF' : def.measure.fmt(v) };
    H.total += pts;
    if (!H.ended) window.AIHub.send({ t: 'r', e: s.id, i, perf: v, pts, total: H.total }, { reliable: true });
    H.progress();
  },
  progress() {
    if (!H.info || H.ended || H.sent) return;
    const last = Object.keys(H.perfs).map(Number).sort().pop(), p = last !== undefined ? H.perfs[last] : null;
    window.AIHub.progress({ score: H.total, label: p ? O.EVENTS[p.id].short + ' · ' + p.display + ' · ' + O.fmt.num(p.pts) + ' pts' : 'Warming up' });
  },
  sendResult() {
    if (H.sent || H.ended) return; H.sent = true;
    const stats = {}, awards = [];
    H.slots.forEach((s, i) => { const p = H.perfs[i]; stats[O.EVENTS[s.id].short] = p ? p.display : 'DNF'; if (p && p.v != null) { const wr = O.EVENTS[s.id].measure.wr[0]; if (O.better(O.EVENTS[s.id], p.v, wr)) awards.push({ title: 'WORLD RECORD', detail: O.EVENTS[s.id].short + ' · ' + p.display }); } });
    window.AIHub.result({ score: H.total, stats, awards });
  },
  /** ghost samples at ~10 a second */
  tick(ctx) {
    if (!H.info || H.ended || !ctx.def.ghostState) return;
    const now = game.real; if (now - H.lastSend < .1) return; H.lastSend = now;
    const a = ctx.humans[0]; if (!a) return; a.S = a.S || {};
    let s; try { s = ctx.def.ghostState(ctx, a).map(v => typeof v === 'number' && isFinite(v) ? Math.round(v * 10) / 10 : 0); } catch (e) { s = [0, 0, 0, 0, 0]; }
    window.AIHub.send({ t: 'g', e: ctx.def.id, i: H.slot, a: a.attempts.length, s, perf: O.agg(ctx, a) }, { reliable: false }); H.sends++;
  },
  onMessage(d, from) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'g' && Array.isArray(d.s)) H.ghosts[from] = { e: d.e, i: d.i, s: d.s, perf: d.perf, at: game.real };
    if (d.t === 'r') H.others[from] = { total: d.total, last: d.pts, e: d.e };
  },
  ghostList(ctx) { const out = []; H.players.forEach((p, i) => { if (p.id === H.info.me || p.left) return; const gh = H.ghosts[p.id]; if (gh && gh.e === ctx.def.id) out.push({ s: gh.s, color: p.color, name: p.name, i }); }); return out; },
  drawGhosts(ctx, r) {
    if (!H.info) return;
    const list = H.ghostList(ctx); H.grig = H.grig || O.makeRig(O.NATIONS[0], 'track');
    list.forEach((gh, k) => { const pos = ctx.def.ghostDraw ? ctx.def.ghostDraw(ctx, r, gh.s, k) : null; if (!pos) return; r.actor(pos[0], pos[1], pos[2], (g, ox, oy) => { H.grig.draw(g, ox, oy, r.view); }, { alpha: .45, flash: gh.color, flashMix: .6 }); r.queue(pos[0], pos[1], pos[2] + 48, g => { const p = r.w(pos[0], pos[1], pos[2] + 48); E.font.text(g, gh.name, p[0], p[1], gh.color, { align: 'center', outline: '#000', font: 'tiny' }); }); });
    r.overlay(g => {
      const x = 8, y = 34; O.panel(g, x, y, 120, 12 + H.players.length * 11, { alpha: .8 });
      H.players.forEach((p, i) => { const mine = p.id === H.info.me, tot = mine ? H.total : (H.others[p.id] ? H.others[p.id].total : 0); const gh = H.ghosts[p.id]; E.font.text(g, p.name, x + 6, y + 5 + i * 11, p.left ? '#5a6080' : p.color, { outline: false, font: 'tiny' }); E.font.text(g, O.fmt.num(tot) + (gh && !mine && gh.perf != null && gh.e === ctx.def.id ? ' · ' + O.EVENTS[gh.e].measure.fmt(gh.perf) : ''), x + 114, y + 5 + i * 11, '#ffffff', { outline: false, font: 'tiny', align: 'right' }); });
      if (H.slotT() < READY_S) { const s = H.slots[H.slot], def = O.EVENTS[s.id]; O.panel(g, r.W / 2 - 130, r.H * .25, 260, 70); O.text(g, 'EVENT ' + (H.slot + 1) + ' OF 3 · GET READY', r.W / 2, r.H * .25 + 6, '#ffd060', { align: 'center' }); O.title(g, def.name, r.W / 2, r.H * .25 + 20, 2); O.text(g, def.howto.goal, r.W / 2, r.H * .25 + 44, '#ffffff', { align: 'center' }); O.title(g, String(Math.max(1, Math.ceil(READY_S - H.slotT()))), r.W / 2, r.H * .25 + 76, 3); }
      const left = H.slots[H.slot] ? H.slots[H.slot].start + H.slots[H.slot].len - SPLASH_S - H.time() / 1000 : 0; if (left < 10 && left > 0) O.text(g, 'SLOT ENDS ' + left.toFixed(0), r.W / 2, 34, '#ff8a6a', { align: 'center' });
    });
  },
  /** dev: an offline preview hub with three sample ghosts, to see the card and ghost rendering without a session */
  preview() {
    let t0 = null; const handlers = {};
    window.AIHub = { active: true, connect: async () => ({ me: 0, players: [{ id: 0, name: 'YOU' }, { id: 1, name: 'GHOST A' }, { id: 2, name: 'GHOST B' }, { id: 3, name: 'GHOST C' }], seed: 7 }),
      rng: l => E.rng(O.hashStr('preview|' + l)), on(k, f) { (handlers[k] = handlers[k] || []).push(f); return () => {}; }, ready() { t0 = game.real + 6; for (const f of handlers.start || []) f({ in: 3000 }); }, answer() {}, time: () => t0 == null ? -Infinity : (game.real - t0) * 1000,
      send() { return true; }, progress() {}, result() {} };
    H.connect().then(() => { H.previewing = true; game.go('hubCard', {}, { fade: 0 }); game.every(.1, () => { for (const p of H.players.slice(1)) { const s = H.slots[Math.max(0, H.slot)]; if (!s || !O.ctx) continue; const me = O.ctx.humans && O.ctx.humans[0]; if (!me || !me.S) continue; let st; try { st = O.ctx.def.ghostState(O.ctx, me); } catch (e) { continue; } st = st.slice(); st[0] += (p.id - 1.5) * 30 * Math.sin(game.real + p.id); H.ghosts[p.id] = { e: s.id, i: H.slot, s: st, perf: null, at: game.real }; } }); });
  }
};
E.HOOKS.step.push(() => { if (H.info) H.update(); if (H.info && O.ctx && game.sceneName && game.sceneName.startsWith('ev:')) H.tick(O.ctx); });

/* ---- the game's own card (§12.2): the dealt events, the players lined up, controls, the countdown ---- */
O.scene('hubCard', {
  lock: 0,
  enter() { this.t = 0; this.blob = O.Art.mascot(); this.rigs = H.players.map(p => O.makeRig(O.NAT[p.nat], 'ceremony')); O.music('title'); this.readyR = null; this.moreR = null; },
  update(dt) {
    this.t += dt; this.rigs.forEach((rg, i) => rg.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: H.players[i] && H.players[i].ready ? 'cheer' : null })); this.blob.update(dt, { squash: Math.sin(this.t * 5) * .1 });
    const I = game.input, AI = window.AIHub;
    if (!H.started) {
      const c = I.clicked();
      if (I.pressed('confirm') || (c && this.readyR && O.hit(c, this.readyR))) { AI.answer('ready'); O.sfx('confirm'); }
      if (I.pressed('more') || (c && this.moreR && O.hit(c, this.moreR))) { AI.answer('more'); O.sfx('select'); }
    }
  },
  draw(r) {
    const s0 = H.slots[0]; O.bgCard(r, s0 ? O.EVENTS[s0.id].season : null);
    r.overlay(g => {
      O.stripeBg(g, r, this.t); O.title(g, 'OLYMPIYIKES!', r.W / 2, 6, 3); O.text(g, 'HUB HEATS · MOST POINTS OVER THREE EVENTS WINS', r.W / 2, 34, '#ffd060', { align: 'center' });
      H.slots.forEach((s, i) => { const d = O.EVENTS[s.id], x = r.W / 2 - 150 + i * 104; O.panel(g, x, 48, 92, 54); O.Art.picto(g, x + 30, 52, d.pictogram, 2, d.season); O.text(g, (i + 1) + '. ' + d.short.toUpperCase(), x + 46, 88, '#ffffff', { align: 'center' }); });
      H.players.forEach((p, i) => { const x = r.W / 2 - (H.players.length - 1) * 40 + i * 80, y = 168; if (this.rigs[i]) this.rigs[i].draw(g, x, y, E.VIEWS.brawler); O.text(g, p.name, x, y + 4, p.color, { align: 'center' }); O.text(g, p.ready ? 'READY ✓' : '...', x, y + 15, p.ready ? '#4fe0a8' : '#7a82aa', { align: 'center' }); O.Art.flag(g, x - 8, y + 26, 16, 10, O.NAT[p.nat]); });
      // this player's controls
      const cy = 212; O.Prompt.draw(g, 14, cy, 'move', { device: 'keyboard', label: 'MOVE' }); O.Prompt.draw(g, 14, cy + 12, 'mashL', { device: 'keyboard' }); O.Prompt.draw(g, 30, cy + 12, 'mashR', { device: 'keyboard', label: 'MASH' }); O.Prompt.draw(g, 14, cy + 24, 'action', { device: 'keyboard', label: 'ACT' });
      O.Prompt.draw(g, 110, cy, 'move', { device: 'gamepad', label: 'MOVE' }); O.Prompt.draw(g, 110, cy + 12, 'mashL', { device: 'gamepad' }); O.Prompt.draw(g, 124, cy + 12, 'mashR', { device: 'gamepad', label: 'MASH' }); O.Prompt.draw(g, 110, cy + 24, 'action', { device: 'gamepad', label: 'ACT' });
      const c = H.card; const left = c && c.left != null ? Math.ceil(c.left / 1000) : null;
      if (!H.started) {
        this.readyR = [r.W - 150, r.H - 54, 66, 22]; this.moreR = [r.W - 78, r.H - 54, 70, 22];
        O.panel(g, this.readyR[0], this.readyR[1], 66, 22, { border: '#4fe0a8' }); O.Prompt.draw(g, this.readyR[0] + 4, this.readyR[1] + 6, 'confirm', { label: 'READY' });
        O.panel(g, this.moreR[0], this.moreR[1], 70, 22, { border: c && c.asked ? '#ffd060' : '#3a4070' }); O.Prompt.draw(g, this.moreR[0] + 4, this.moreR[1] + 6, 'more', { label: 'MORE TIME' });
        O.text(g, c && c.paused ? 'PAUSED: MORE TIME ASKED' : left != null ? 'STARTS IN ' + left : c && c.starting ? 'STARTING...' : '', r.W - 80, r.H - 70, '#ffffff', { align: 'center' });
      } else { const t = H.time() / 1000; if (t < 0) O.title(g, String(Math.ceil(-t)), r.W / 2, r.H * .45, 6); }
    });
  }
});
O.scene('hubSplash', {
  lock: 0,
  enter(d) { this.d = d; this.t = 0; if (d.final) O.music('table'); },
  update(dt) { this.t += dt; },
  draw(r) {
    O.bgCard(r);
    r.overlay(g => {
      O.stripeBg(g, r, this.t);
      O.title(g, this.d.final ? (H.ended ? 'ROUND OVER' : 'HEATS COMPLETE') : 'RESULT', r.W / 2, 14, 3);
      H.slots.forEach((s, i) => { const p = H.perfs[i], d = O.EVENTS[s.id], y = 60 + i * 26; O.Art.picto(g, r.W / 2 - 140, y, d.pictogram, 1, d.season); O.text(g, d.name, r.W / 2 - 118, y + 4, '#ffffff'); O.text(g, p ? p.display + ' · ' + O.fmt.num(p.pts) + ' PTS' : i === H.slot ? 'IN PROGRESS' : '—', r.W / 2 + 140, y + 4, '#ffd060', { align: 'right' }); });
      O.text(g, 'TOTAL ' + O.fmt.num(H.total), r.W / 2, 150, '#ffffff', { align: 'center', scale: 2 });
      H.players.forEach((p, i) => { if (p.id === H.info.me) return; const o = H.others[p.id]; O.text(g, p.name + ' ' + O.fmt.num(o ? o.total : 0), r.W / 2, 176 + i * 11, p.color, { align: 'center' }); });
      if (!this.d.final && H.slots[H.slot + 1]) { const left = H.slots[H.slot].start + H.slots[H.slot].len - H.time() / 1000; O.text(g, 'NEXT: ' + O.EVENTS[H.slots[H.slot + 1].id].name + ' IN ' + Math.max(0, Math.ceil(left)), r.W / 2, r.H - 30, '#c8d0f0', { align: 'center' }); }
    });
  }
});
O.HUB_GROUPS = GROUPS;
})();
