// Visit mode on its own: Open my gate / Visit a friend. Host's world is authoritative; guests keep only pockets and beans.
import { G, bus } from '../state.js';
import { UI, panel, menu, promptRow } from '../ui/kit.js';
import { drawText, textWidth } from '../ui/font.js';
import { Toasts, Script, say } from '../ui/dialogue.js';
import { BroadcastTransport, RtcTransport } from './transport.js';
import { serialize, deserialize, saveNow, loadSave, hasSave, markPlaying } from '../core/save.js';
import { storage } from '../core/storage.js';
import { setPlace, Trans } from '../world/places.js';
import { Actor } from '../actors/actor.js';
import { lookDef } from '../actors/player.js';
import { NPC } from '../actors/npcs.js';
import { THREE } from '../engine.js';
import { LANDMARK, BUILDINGS } from '../world/layout.js';
import { removeEnt, addEnt, giveItem, rebuildGrid } from '../core/world.js';
import { NEIGHBOURS } from '../data/cast.js';
import { ITEMS, EMOTE_CLIP } from '../data/items.js';
import { T } from '../dev/tuning.js';
const CANNED = ['Hello!', 'Nice town.', 'Is that goose always like that?', 'Look at this!', 'Thanks!', 'Bye!'];
const VISITOR_KEY = 'sillyfolk:visitor';
const myId = () => { let id = storage.get('sillyfolk:sid'); id = (typeof crypto !== 'undefined' ? crypto.randomUUID?.() : null) ?? String(Date.now() + Math.floor(performance.now())); return id; };
const Announce = 'sillyfolk-gates';
class Session {
  constructor(role) { this.role = role; this.id = myId(); this.avatars = new Map(); this.transports = []; this.guests = new Map(); this.group = new THREE.Group(); G.ctx.scene.add(this.group); this.meT = 0; this.snapT = 0; this.entT = 0; this.lastEnts = new Map(); }
  addTransport(t) { this.transports.push(t); t.on('message', (d, f) => this.onMsg(d, f, t)); }
  send(d, o = {}) { for (const t of this.transports) t.send(d, o); }
  avatar(id, look, name) { let v = this.avatars.get(id); if (v) return v; const a = new Actor(lookDef(look, 'g' + id.slice(0, 4))); a.addTo(this.group); a.play('Idle'); v = { a, name, x: 0, z: 0, f: 0, place: 'town', hist: [], bubble: null, bubbleT: 0 }; this.avatars.set(id, v); return v; }
  dropAvatar(id) { const v = this.avatars.get(id); if (v) { v.a.removeFrom(); this.avatars.delete(id); } }
  meNow() { const w = G.world; return { t: 'me', x: +w.p.x.toFixed(2), z: +w.p.z.toFixed(2), f: +w.p.facing.toFixed(2), place: w.p.place, a: G.player.speed > 0 ? 1 : 0 }; }
  update(dt) {
    const now = performance.now() - 120; const place = G.world.p.place;
    for (const v of this.avatars.values()) { const hs = v.hist; let x = v.x, z = v.z, f = v.f, a = v.mv; if (hs.length >= 2) { let A = hs[0], B = hs[hs.length - 1]; for (let i = 0; i < hs.length - 1; i++) if (hs[i].t <= now && hs[i + 1].t >= now) { A = hs[i]; B = hs[i + 1]; break; } const k = Math.max(0, Math.min(1, (now - A.t) / Math.max(1, B.t - A.t))); x = A.x + (B.x - A.x) * k; z = A.z + (B.z - A.z) * k; f = B.f; a = B.a; v.x = x; v.z = z; } v.a.visible = v.place === place; if (v.place === place && G.place) { v.a.place(x, G.place.heightAt(x, z), z); v.a.targetFacing = f; if (v.a.onceT <= 0) v.a.play(a ? 'Jog' : 'Idle'); v.a.update(dt); } v.bubbleT = Math.max(0, v.bubbleT - dt); }
  }
  drawBubbles(h) { for (const v of this.avatars.values()) { if (!v.a.visible) continue; const pos = v.a.root.position; const [x, y] = G.view.project(pos.x, pos.y + 1.7, pos.z); const nw = textWidth(v.name) + 6; h.rect(x - nw / 2, y - 10, nw, 11, 'ink'); drawText(h, x, y - 8, v.name, { color: 'sand', align: 'center' }); if (v.bubbleT > 0 && v.bubble) { const w = textWidth(v.bubble) + 10; panel(h, x - w / 2, y - 28, w, 15); drawText(h, x, y - 24, v.bubble, { color: 'ink', align: 'center' }); } } }
  emote(e) { this.send({ t: 'ev', from: this.id, emote: e }); }
  phrase(i) { this.send({ t: 'ev', from: this.id, phrase: i }); const w = G.world; Toasts.add(`You say: ${CANNED[i]}`); }
  applyGesture(d) { const v = this.avatars.get(d.from); if (!v) return; if (d.emote) v.a.play(EMOTE_CLIP[d.emote], { then: 'Idle', restart: true }); if (d.phrase != null) { v.bubble = CANNED[d.phrase]; v.bubbleT = 3; } }
}
export class HostSession extends Session {
  constructor() { super('host'); this.bc = null; this.announceT = 0; }
  openBroadcast() { this.announcer = new BroadcastChannel(Announce); this.announcer.onmessage = (e) => { if (e.data?.t === 'who') this.announce(); }; const t = new BroadcastTransport('sillyfolk-gate-' + this.id, this.id); this.addTransport(t); this.bc = t; this.announce(); }
  announce() { this.announcer?.postMessage({ t: 'gate', id: this.id, name: G.world.name, town: G.world.town }); }
  async openRtc(iceServers) { this.rtc = this.rtc ?? new RtcTransport(this.id, iceServers); if (!this.transports.includes(this.rtc)) this.addTransport(this.rtc); this.rtc.onopen = (peer) => {}; this.rtc.onfail = () => Toasts.add('The connection failed. Make a fresh Gate Pass and try again.', 6); this.pendingPeer = 'peer' + (this.rtc.peers.size + 1); return this.rtc.makeGatePass(this.pendingPeer); }
  async acceptReply(code) { await this.rtc.acceptReply(code, this.pendingPeer); }
  onMsg(d, from, t) {
    if (d.t === 'hello') { if (this.guests.has(from)) return; if (this.guests.size >= 3) { t.send({ t: 'full' }, { to: from }); return; } this.guests.set(from, { name: d.name, t }); this.avatar(from, d.look, d.name); this.sendTown(from, t); Toasts.add(`${d.name} got off the bus.`, 4); G.world.stats.visitors = (G.world.stats.visitors ?? 0) + 1; bus.emit('visitorJoined', d.name); }
    else if (d.t === 'me') { const v = this.avatars.get(from); if (v) { v.place = d.place; v.hist.push({ t: performance.now(), x: d.x, z: d.z, f: d.f, a: d.a }); if (v.hist.length > 6) v.hist.shift(); v.x = d.x; v.z = d.z; v.f = d.f; v.mv = d.a; } }
    else if (d.t === 'do') this.doAction(d, from, t);
    else if (d.t === 'ev') { this.applyGesture(d); this.send(d); }
    else if (d.t === 'bye') { this.guests.delete(from); this.dropAvatar(from); Toasts.add('Your visitor went home. The bus never came. They just left.'); this.send({ t: 'gone', id: from }); }
  }
  sendTown(to, t) { const w = G.world; const { mail, mailQueue, memory, ...rest } = JSON.parse(serialize(w)); rest.p.pockets = []; rest.p.beans = 0; const text = JSON.stringify(rest); const CH = 12000; const n = Math.ceil(text.length / CH); let i = 0; this.chunkQ = this.chunkQ ?? []; for (; i < n; i++) this.chunkQ.push({ to, t, msg: { t: 'town', i, n, s: text.slice(i * CH, (i + 1) * CH), host: w.name, hostLook: w.p.look, hostId: this.id } }); }
  doAction(d, from, t) { const w = G.world; if (d.a === 'catch') { const v = this.avatars.get(from); const ok = !!v && !!ITEMS[d.it] && ['fish', 'bug'].includes(ITEMS[d.it].cat) && v.place === 'town' && Math.hypot(v.x - d.x, v.z - d.z) < 8; t.send({ t: 'ev', caught: d.it, ok }, { to: from }); w.stats.guestCatches = (w.stats.guestCatches ?? 0) + (ok ? 1 : 0); return; } const e = d.id ? w.ents[d.id] : null; if (d.a === 'pick' && e && (e.t === 'item' || e.t === 'shell')) { removeEnt(w, e); t.send({ t: 'ev', got: e.it, value: e.value }, { to: from }); } if (d.a === 'shake' && e?.t === 'tree' && e.fruit > 0) { const n = e.fruit; e.fruit = 0; e.regrow = T.fruitRegrow; w.dirty = true; for (let i = 0; i < n; i++) t.send({ t: 'ev', got: 'pear' }, { to: from }); } if (d.a === 'drop' && d.it) { const tx = Math.floor(d.x), tz = Math.floor(d.z); addEnt(w, { t: 'item', it: d.it, x: tx + 0.5, z: tz + 0.5, from: 'guest' }); } }
  fixed(dt) {
    this.announceT -= dt; if (this.announceT <= 0) { this.announceT = 2; this.announce(); }
    if (this.chunkQ?.length) { this.chunkT = (this.chunkT ?? 0) - dt; if (this.chunkT <= 0) { this.chunkT = 0.08; const c = this.chunkQ[0]; if (c.t.send(c.msg, { to: c.to }) !== false) this.chunkQ.shift(); } }
    this.snapT -= dt; if (this.snapT <= 0 && this.guests.size) { this.snapT = 0.1; const w = G.world; const others = [...this.avatars.entries()].map(([id, v]) => [id, +v.x.toFixed(2), +v.z.toFixed(2), +v.f.toFixed(2), v.mv ? 1 : 0, v.place]); const npcs = NEIGHBOURS.filter((n) => w.npcs[n].place === 'town').map((n) => { const r = NPC.rt[n]; return [n, +r.x.toFixed(1), +r.z.toFixed(1)]; }); this.send({ t: 'snap', min: Math.floor(w.clock.minute), day: w.clock.day, h: [this.id, +w.p.x.toFixed(2), +w.p.z.toFixed(2), +w.p.facing.toFixed(2), G.player.speed > 0 ? 1 : 0, w.p.place], o: others, n: npcs }, { reliable: false }); }
    this.entT -= dt; if (this.entT <= 0 && this.guests.size) { this.entT = 1; const w = G.world; const removed = [], added = []; const now = new Map(Object.entries(w.ents).map(([id, e]) => [id, `${e.t}:${e.fruit ?? ''}:${e.age ?? ''}`])); if (this.lastEnts.size) { for (const id of this.lastEnts.keys()) if (!now.has(id)) removed.push(id); for (const [id, sig] of now) if (this.lastEnts.get(id) !== sig) added.push(w.ents[id]); } this.lastEnts = now; if (removed.length || added.length) this.send({ t: 'ents', removed, added: added.slice(0, 30) }); }
  }
  close() { this.send({ t: 'hostgone' }); for (const t of this.transports) t.close(); this.announcer?.close(); this.transports = []; for (const id of [...this.avatars.keys()]) this.dropAvatar(id); }
}
export class GuestSession extends Session {
  constructor() { super('guest'); this.chunks = []; }
  joinBroadcast(hostId) { this.sharedProfile = true; const t = new BroadcastTransport('sillyfolk-gate-' + hostId, this.id); this.addTransport(t); this.hostId = hostId; this.hello(); }
  async joinRtc(code, iceServers) { const t = new RtcTransport(this.id, iceServers); this.addTransport(t); t.onopen = () => this.hello(); t.onfail = () => Toasts.add('The connection failed. Ask your friend for a fresh Gate Pass.', 6); return t.acceptGatePass(code, 'host'); }
  hello() { const own = loadVisitor(this.sharedProfile); this.own = own; this.helloCount = (this.helloCount ?? 0) + 1; this.helloT = 1.5; this.send({ t: 'hello', name: own.name, look: own.look }); }
  onMsg(d, from) {
    if (d.t === 'town') { this.chunks[d.i] = d.s; if (this.chunks.filter(Boolean).length === d.n) this.arrive(JSON.parse(this.chunks.join('')), d); }
    else if (d.t === 'full') { Toasts.add('That gate is full. Three visitors is a crowd. The goose counted.'); G.visit = null; }
    else if (d.t === 'snap') { const w = G.world; if (!w.guest) return; w.clock.minute = d.min; if (d.day !== w.clock.day) w.clock.day = d.day; const list = [d.h, ...d.o]; for (const [id, x, z, f, a, place] of list) { if (id === this.id) continue; const v = this.avatars.get(id) ?? this.avatar(id, id === this.hostKey ? this.hostLook : { hair: 2, hairColor: 'ink', eyes: 1, shirt: 's_red' }, id === this.hostKey ? this.hostName : 'A visitor'); v.place = place; v.hist.push({ t: performance.now(), x, z, f, a }); if (v.hist.length > 6) v.hist.shift(); v.x = x; v.z = z; v.f = f; v.mv = a; } for (const [n, x, z] of d.n) { const r = NPC.rt[n]; if (r) { r.x = x; r.z = z; if (w.npcs[n]) w.npcs[n].place = 'town'; r.path = null; } } }
    else if (d.t === 'ents') { const w = G.world; if (!w.guest) return; for (const id of d.removed) { const e = w.ents[id]; if (e) removeEnt(w, e); } for (const e of d.added) { if (w.ents[e.id]) { Object.assign(w.ents[e.id], e); w.dirty = true; } else { w.ents[e.id] = e; rebuildGrid(w); w.dirty = true; } } }
    else if (d.t === 'ev') { if (d.caught) { this.lastClaim = d; if (!d.ok) { const i = G.world.p.pockets.findIndex((e) => e?.id === d.caught); if (i >= 0) { G.world.p.pockets[i] = null; Toasts.add('Your host says that one got away.'); this.save(); } } } else if (d.got) { if (giveItem(G.world, d.value ? { id: d.got, value: d.value } : { id: d.got })) { G.ctx.audio.play('pickup'); Toasts.add(`Got ${ITEMS[d.got]?.name}.`); this.save(); } } else this.applyGesture(d); }
    else if (d.t === 'hostgone') { Toasts.add('Your host went to bed. You are sent home with what you carry.'); this.leave(); }
    else if (d.t === 'gone') this.dropAvatar(d.id);
  }
  arrive(snap, m) { const own = this.own; const w = snap; rebuildGrid(w); w.guest = true; w.name = own.name; w.p.pockets = own.pockets.slice(); while (w.p.pockets.length < 15) w.p.pockets.push(null); w.p.beans = own.beans; w.p.look = own.look; w.p.tools = ['net', 'rod', 'can']; w.p.tool = null; w.p.place = 'town'; w.day1 = { done: true }; this.hostKey = m.hostId; this.hostLook = m.hostLook; this.hostName = m.host; G.mode = 'play'; UI.clear(); Trans.go(() => { G.game.useWorld(w); G.view.zoomTarget = T.zoom; G.player.actor.visible = true; G.player.rebuild(); setPlace('town', LANDMARK.busStop[0], LANDMARK.busStop[1] + 1, 0); Toasts.add(`You arrive in ${w.town} by bus. Mind the goose.`, 4); bus.emit('visitArrived'); }, 'fade', 2.4); }
  /** The client claims a catch; the host checks it was in reach of where it last saw the guest. */
  claim(id) { const w = G.world; this.send({ t: 'do', a: 'catch', it: id, x: w.p.x, z: w.p.z }); }
  fixed(dt) { /* keep asking until the town starts to arrive */ if (this.helloCount && !this.chunks.length && !G.world?.guest) { this.helloT -= dt; if (this.helloT <= 0) this.hello(); } this.meT -= dt; if (this.meT <= 0 && G.world?.guest) { this.meT = 0.1; this.send(this.meNow(), { reliable: false }); } }
  save() { const w = G.world; if (!w.guest) return; storage.setJSON(VISITOR_KEY, { name: w.name, look: w.p.look, pockets: w.p.pockets.filter(Boolean), beans: w.p.beans }); }
  leave() { this.save(); this.send({ t: 'bye' }); const own = storage.getJSON(VISITOR_KEY); const s = this.sharedProfile ? null : loadSave(); if (s && own) { s.p.pockets = [...own.pockets]; while (s.p.pockets.length < 15) s.p.pockets.push(null); s.p.beans = own.beans; saveNow(s, Date.now()); } for (const t of this.transports) t.close(); for (const id of [...this.avatars.keys()]) this.dropAvatar(id); G.visit = null; G.game.toTitle(); bus.emit('visitLeft'); }
}
function loadVisitor(shared) { const v = storage.getJSON(VISITOR_KEY); if (shared && v) return v; const s = shared ? null : loadSave(); if (s) return { name: s.name, look: s.p.look, pockets: s.p.pockets.filter(Boolean), beans: s.p.beans }; if (v) return v; const o = { name: 'Visitor', look: { hair: 1, hairColor: 'plum', eyes: 4, shirt: 's_sky' }, pockets: [], beans: 500 }; return o; }
// ---- DOM paste box: pixel-styled, needs a keyboard, says so
function pasteBox(title, text, onDone) { const d = document.createElement('div'); d.id = 'sf-paste'; d.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:60vw;background:#f4f4f4;border:6px solid #ffcd75;padding:18px;font:18px monospace;color:#1a1c2c;z-index:9;cursor:auto'; const h = document.createElement('div'); h.textContent = title; const ta = document.createElement('textarea'); ta.style.cssText = 'width:100%;height:22vh;font:14px monospace;margin:10px 0'; ta.value = text ?? ''; const row = document.createElement('div'); const mk = (label, f) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'font:16px monospace;margin-right:10px;padding:8px 14px'; b.onclick = f; row.appendChild(b); return b; }; if (text) mk('Copy', () => { ta.select(); navigator.clipboard?.writeText(ta.value).catch(() => {}); }); mk('OK', () => { d.remove(); onDone?.(ta.value.trim()); }); mk('Cancel', () => { d.remove(); onDone?.(null); }); d.append(h, ta, row); document.body.appendChild(d); ta.focus(); if (text) ta.select(); return d; }
// ---- Menus
export function openVisitMenu() {
  const m = menu({ id: 'visit', title: 'Visit', w: 330, items: () => [{ label: 'Open my gate', disabled: !hasSave(), value: () => (hasSave() ? '' : 'needs a save'), action: () => openGate() }, { label: 'Visit a friend', action: () => { UI.push(friendMenu()); } }], }); UI.push(m);
}
function openGate() { UI.clear(); G.game.continueGame(); const s = new HostSession(); s.openBroadcast(); G.visit = wrap(s); setTimeoutFrames(() => { UI.push(gateMenu(s)); }); }
const setTimeoutFrames = (f) => Script.run((function* () { yield 1.2; f(); })(), { background: true });
function gateMenu(s) { const m = menu({ id: 'gate', title: 'Your gate is open', sub: 'Friends in other windows of this browser can see it. For another computer, make a Gate Pass.', w: 360, items: [{ label: 'Make a Gate Pass (invite code)', action: async () => { const code = await s.openRtc(); pasteBox('Gate Pass. Send it to your friend. They will send back a Reply Slip. Yes, this is a friend code. Yes, it is 600 characters. (Needs a keyboard.)', code, () => { pasteBox('Paste their Reply Slip here:', '', async (r) => { if (r) { try { await s.acceptReply(r); Toasts.add('They are on the bus.'); } catch { Toasts.add('That is not a Reply Slip. It might be a poem.'); } } }); }); } }, { label: 'Carry on', action: () => UI.pop(m) }] }); return m; }
function friendMenu() { const gates = new Map(); const ch = new BroadcastChannel(Announce); ch.onmessage = (e) => { if (e.data?.t === 'gate') gates.set(e.data.id, e.data); }; ch.postMessage({ t: 'who' }); const m = menu({ id: 'friends', title: 'Visit a friend', w: 360, onBack: () => { ch.close(); UI.pop(m); }, items: () => [...[...gates.values()].slice(0, 4).map((g) => ({ label: `${g.name}, of ${g.town}`, action: () => { ch.close(); const s = new GuestSession(); G.visit = wrap(s); s.joinBroadcast(g.id); Toasts.add('Waiting for the bus…'); } })), { label: 'I have a Gate Pass', action: () => pasteBox('Paste the Gate Pass your friend sent you. (Needs a keyboard.)', '', async (code) => { if (!code) return; ch.close(); const s = new GuestSession(); G.visit = wrap(s); try { const reply = await s.joinRtc(code); pasteBox('Your Reply Slip. Send it back to your friend:', reply, () => {}); } catch { Toasts.add('That is not a Gate Pass.'); G.visit = null; } }) }, { label: gates.size ? 'Looking for more gates…' : 'No open gates in this browser yet…', disabled: true }] }); return m; }
function wrap(s) { return { session: s, hosting: () => s.role === 'host', emote: (e) => s.emote(e), fixed: (dt) => s.fixed(dt), update: (dt) => s.update(dt), bubbles: (h) => s.drawBubbles(h), leave: () => { if (s.role === 'guest') s.leave(); else { s.close(); G.visit = null; } }, phrase: (i) => s.phrase(i), guest: s.role === 'guest', CANNED }; }
export { CANNED, wrap, loadVisitor, openGate };
