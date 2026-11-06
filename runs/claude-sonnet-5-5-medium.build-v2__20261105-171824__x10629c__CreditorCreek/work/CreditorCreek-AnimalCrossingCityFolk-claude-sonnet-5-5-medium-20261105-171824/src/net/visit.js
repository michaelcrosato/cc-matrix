// Visit: two windows on one computer over BroadcastChannel (created only outside AI Hub sessions). Host's town is sent once; avatars sync at 10 Hz.
import { Actor } from '../actors/actor.js';
import { avatarSpec } from '../actors/player.js';
import { ListScreen } from '../ui/screens.js';
import { newWorld, loadWorld, saveWorld, hasSave } from '../core/world.js';
import * as rtc from './rtc.js';
const CH = 'creditor-creek-visit';
export const visit = {
  ch: null, peers: [], role: null, remotes: {}, hosts: {}, id: Math.random().toString(36).slice(2, 8), sendT: 0,
  supported() { return typeof BroadcastChannel !== 'undefined' && !(typeof window !== 'undefined' && window.AIHub?.active); },
  open() { if (this.ch) return; this.ch = new BroadcastChannel(CH); this.ch.onmessage = (e) => this.onMsg(e.data); },
  async openMenu(g) {
    if (!this.supported()) { g.ui.toast('Visiting needs a browser with BroadcastChannel'); return; }
    this.open(); const pick = await new Promise(res => { const items = [{ label: 'Open my gate', sub: hasSave() ? 'Let friends in another window on this computer visit your town. They can pick fruit and drop gifts. They cannot fell trees.' : 'You need a saved town first.', v: 'host', disabled: !hasSave() }, { label: 'Visit a friend', sub: 'Looks for open gates in other windows on this computer.', v: 'guest' }, { label: 'Open my gate by code', sub: 'For a friend on another computer. You make a Gate Pass; they send back a Reply Slip. Friend codes, but longer. Needs a keyboard.', v: 'hostcode', disabled: !hasSave() || typeof RTCPeerConnection === 'undefined' }, { label: 'Visit by code', sub: 'Paste a friend\'s Gate Pass and send them the Reply Slip. Needs a keyboard.', v: 'guestcode', disabled: typeof RTCPeerConnection === 'undefined' }]; const sc = new ListScreen({ title: 'Visit', items, onPick: (it) => 'close', pickLabel: 'Go' }); g.ui.push(sc); sc.promise.then(res); });
    if (!pick) return; if (pick.v === 'hostcode') { await this.hostByCode(g); return; } if (pick.v === 'guestcode') { await this.guestByCode(g); return; }
    if (pick.v === 'host') { this.role = 'host'; g.startGame(loadWorld(), false); g.visit = this; g.ui.toast('Your gate is open. Friends can join from the title screen.'); this.announce(g); }
    else { await this.guestMenu(g); }
  },
  send(m, except) { this.ch?.postMessage(m); for (const p of this.peers) if (p !== except && p.ch.readyState === 'open') p.ch.send(JSON.stringify(m)); },
  attach(p) { this.peers.push(p); p.ch.onmessage = (e) => { const m = JSON.parse(e.data); if (this.role === 'host' && m.t === 'pos') this.send(m, p); if (this.role === 'host' && m.t === 'join') m.to = this.id; this.onMsg(m, p); }; p.ch.onclose = () => { this.peers = this.peers.filter(x => x !== p); }; },
  announce(g) { this.ch?.postMessage({ t: 'host', id: this.id, name: g.world.name }); },
  async guestMenu(g) {
    this.hosts = {}; this.ch.postMessage({ t: 'ask' }); await new Promise(r => g.after(1.2, r));
    const list = Object.values(this.hosts).filter(h => Date.now() - h.at < 4000); if (!list.length) { await g.say(null, 'No open gates found. Open one in another window first.'); g.showTitle(); return; }
    const pick = await new Promise(res => { const sc = new ListScreen({ title: 'Open gates', items: list.map(h => ({ label: h.name + "'s town", sub: 'Arrive by bus. The bus does not run while you have company.', h })), onPick: () => 'close', pickLabel: 'Visit' }); g.ui.push(sc); sc.promise.then(res); });
    if (!pick) return; this.role = 'guest'; this.hostId = pick.h.id; this.ch.postMessage({ t: 'join', id: this.id, name: g.world.name ?? 'Guest', to: pick.h.id });
  },
  async hostByCode(g, ice) {
    try { this.role = 'host'; g.startGame(loadWorld(), false); g.visit = this; const { pc, ch, code } = await rtc.makeOffer(ice); await g.ui.toast('Gate Pass ready'); const slip = await (this.codeFn ?? rtc.codeBox)('Gate Pass: send this to your friend', code, true).then(async () => (this.codeFn ?? rtc.codeBox)('Paste the Reply Slip from your friend', '', false)); await rtc.finish(pc, slip); await rtc.open(ch); this.attach({ pc, ch }); g.ui.toast('A friend is at the gate'); }
    catch (e) { g.ui.toast('Could not connect: ' + e.message); }
  },
  async guestByCode(g, ice) {
    try { this.role = 'guest'; const offer = await (this.codeFn ?? rtc.codeBox)("Paste your friend's Gate Pass", '', false); const { pc, chP, code } = await rtc.acceptOffer(offer, ice); await (this.codeFn ?? rtc.codeBox)('Reply Slip: send this back to your friend', code, true); const ch = await chP; await rtc.open(ch); const peer = { pc, ch }; this.attach(peer); this.hostId = 'rtc'; ch.send(JSON.stringify({ t: 'join', id: this.id, name: g.world?.name ?? 'Guest', to: 'rtc' })); }
    catch (e) { g.ui.toast('Could not connect: ' + e.message); this.role = null; }
  },
  onMsg(m, via) {
    const g = window.__GAME__?.game; if (!g || !m) return;
    if (m.t === 'ask' && this.role === 'host') this.announce(g);
    else if (m.t === 'host') this.hosts[m.id] = { id: m.id, name: m.name, at: Date.now() };
    else if (m.t === 'join' && this.role === 'host' && m.to === this.id) { const w = g.world; (via ? (x) => via.ch.send(JSON.stringify(x)) : (x) => this.ch.postMessage(x))({ t: 'town', to: m.id, from: this.id, town: w.town, day: w.day, min: w.min, year: w.year, name: w.name, look: w.look, seed: w.seed, townName: w.townName }); this.addRemote(g, m.id, m.name); g.ui.toast(`${m.name} arrives by bus`); }
    else if (m.t === 'town' && this.role === 'guest' && m.to === this.id) this.arrive(g, m);
    else if (m.t === 'town' && this.role === 'guest' && this.hostId === 'rtc' && m.to === this.id) this.arrive(g, m);
    else if (m.t === 'pos' && m.id !== this.id) { if (!this.remotes[m.id]) this.addRemote(g, m.id, m.name ?? 'Friend'); const r = this.remotes[m.id]; r.tx = m.x; r.tz = m.z; r.yaw = m.yaw; r.moving = m.mv; r.look = m.look; }
    else if (m.t === 'leave') { this.dropRemote(g, m.id); if (this.role === 'guest' && m.id === this.hostId) { g.ui.toast('The host closed the gate. You are sent home.'); this.leave(g); } }
    else if (m.t === 'gift' && m.to === this.id) { g.give(m.item); g.ui.toast('A friend dropped a gift: ' + m.item); }
  },
  arrive(g, m) {
    this.own = hasSave() ? loadWorld() : null; const w = newWorld(m.seed); w.town = m.town; w.day = m.day; w.min = m.min; w.year = m.year; w.townName = m.townName; w.name = this.own?.name ?? 'Guest'; w.look = this.own?.look ?? w.look; w.pockets = this.own?.pockets ?? []; w.beans = this.own?.beans ?? 0; w.tools = ['net', 'rod']; w.noSave = true; w.errands.active = false; w.visiting = true;
    g.ui.clear(); g.startGame(w, false); g.visit = this; g.flags.slowDayOne = false; g.ui.toast(`Welcome to ${m.townName}`); this.addRemote(g, m.from ?? this.hostId, m.name);
  },
  addRemote(g, id, name) { if (this.remotes[id]) return; const a = new Actor(avatarSpec({ hair: 'orange', hairStyle: 2, skin: 'sand', outfit: 'tee_blue' })); a.name = name; g.ctx.scene.add(a.root); this.remotes[id] = { a, tx: 0, tz: 0, name, yaw: 0, x: 0, z: 0 }; },
  dropRemote(g, id) { const r = this.remotes[id]; if (r) { g.ctx.scene.remove(r.a.root); delete this.remotes[id]; } },
  update(g, dt) {
    if (!this.role || (!this.ch && !this.peers.length)) return; this.sendT += dt; const p = g.player;
    if (this.sendT > 0.1) { this.sendT = 0; this.send({ t: 'pos', id: this.id, name: g.world.name, x: p.pos.x, z: p.pos.z, yaw: p.yaw, mv: p.speed > 0.1, look: g.world.look }); }
    for (const r of Object.values(this.remotes)) { r.x += ((r.tx ?? r.x) - r.x) * Math.min(1, dt * 8); r.z += ((r.tz ?? r.z) - r.z) * Math.min(1, dt * 8); r.a.setPos(r.x, r.z); r.a.yaw = r.yaw; r.a.locomote(r.moving ? 3 : 0, 'jog'); r.a.root.visible = g.place === 'town'; r.a.update(dt, g.t); }
  },
  leave(g) {
    this.send({ t: 'leave', id: this.id }); for (const p of this.peers) { try { p.pc.close(); } catch {} } this.peers = []; for (const id of Object.keys(this.remotes)) this.dropRemote(g, id);
    if (this.role === 'guest' && this.own) { this.own.pockets = g.world.pockets; this.own.beans = g.world.beans; saveWorld(this.own); }
    this.role = null; g.visit = null; if (this.ch) { this.ch.close(); this.ch = null; } g.quitToTitle();
  },
};
