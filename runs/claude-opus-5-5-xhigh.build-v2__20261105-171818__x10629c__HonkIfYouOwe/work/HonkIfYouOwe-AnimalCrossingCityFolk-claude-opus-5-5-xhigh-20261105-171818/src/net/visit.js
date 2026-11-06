// Visit: a friend comes to your village, on its own. BroadcastChannel on one computer; serverless
// WebRTC with invite codes across two. Star of up to 3 guests; the host's world is authoritative.
// These objects are only ever created outside a Hub session.
import { Transport } from './transport.js';
import { packAvatar, unpackAvatar, RemoteTrack, SEND_RATE, chunkString } from './protocol.js';
import { Actor } from '../actors/rig.js';
import { avatarDef } from '../art/critter.js';
import { newWorld } from '../core/save.js';
import { store } from '../core/storage.js';
import { ITEMS } from '../data/items.js';
import { LANDMARKS } from '../data/town.js';
import { addItem, hasRoom } from '../systems/economy.js';
import { drawText } from '../ui/draw.js';

const CHANNEL = 'honk-if-you-owe:gates';
const GUEST_KEY = 'honk:guest';
const uid = () => Math.floor(Math.random() * 1e9).toString(36);

/** One BroadcastChannel per open gate; same browser profile only. */
export class BroadcastTransport extends Transport {
  constructor(role, gateId = null, onHosts = null) {
    super();
    this.id = uid();
    this.isHost = role === 'host';
    this.gateId = gateId ?? (this.isHost ? this.id : null);
    this.onHosts = onHosts;
    this.lobby = new BroadcastChannel(CHANNEL);
    this.lobby.onmessage = (e) => this.onLobby(e.data);
    if (this.isHost) { this.open(); this.announceT = setInterval(() => this.announce(), 1000); this.announce(); }
    else this.lobby.postMessage({ k: 'who' });
  }
  open() {
    this.ch = new BroadcastChannel(`${CHANNEL}:${this.gateId}`);
    this.ch.onmessage = (e) => {
      const m = e.data;
      if (m.to && m.to !== this.id) return;
      if (m.from === this.id) return;
      if (m.join && this.isHost) { this.emit('join', m.from, m.join); return; }
      if (m.bye) { this.emit('leave', m.from); return; }
      this.emit('message', m.d, m.from);
    };
  }
  announce() { this.lobby.postMessage({ k: 'gate', id: this.gateId, name: this.hostName ?? 'A village', count: this.guestCount ?? 0 }); }
  onLobby(m) {
    if (m.k === 'who' && this.isHost) this.announce();
    if (m.k === 'gate' && !this.isHost) this.onHosts?.(m);
  }
  joinGate(gateId, hello) { this.gateId = gateId; this.open(); this.ch.postMessage({ from: this.id, join: hello }); }
  send(d, { to } = {}) {
    if (!this.budget.take(performance.now())) return false;
    this.ch?.postMessage({ from: this.id, to, d });
    return true;
  }
  close() {
    clearInterval(this.announceT);
    this.ch?.postMessage({ from: this.id, bye: true });
    this.ch?.close();
    this.lobby?.close();
  }
}

// ---- WebRTC with invite codes: a Gate Pass goes to the friend, a Reply Slip comes back ---------------
const ICE = typeof location !== 'undefined' && /iceServers=none/.test(location.search) ? [] : [{ urls: 'stun:stun.l.google.com:19302' }];
export async function packCode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (const b of out) bin += String.fromCharCode(b);
  return btoa(bin);
}
export async function unpackCode(code) {
  const bin = atob(code.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(stream).text());
}
const waitForIce = (pc) => new Promise((resolve) => {
  if (pc.iceGatheringState === 'complete') { resolve(); return; }
  const t = setTimeout(resolve, 4000);
  pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); } });
});
export class RtcTransport extends Transport {
  constructor(role) { super(); this.id = uid(); this.isHost = role === 'host'; this.peers = new Map(); this.pending = null; }
  wire(peerId, pc, ch) {
    const peer = { id: peerId, pc, rel: ch, unrel: null };
    this.peers.set(peerId, peer);
    ch.onmessage = (e) => this.deliver(peer, e.data);
    ch.onopen = () => this.emit('open', peer.id);
    ch.onclose = () => { this.peers.delete(peer.id); this.emit('leave', peer.id); };
    pc.ondatachannel = (e) => this.acceptChannel(peer, e.channel);
    return peer;
  }
  acceptChannel(peer, ch) {
    if (ch.label === 'rel') { peer.rel = ch; ch.onmessage = (e) => this.deliver(peer, e.data); ch.onopen = () => this.emit('open', peer.id); if (ch.readyState === 'open') this.emit('open', peer.id); ch.onclose = () => { this.peers.delete(peer.id); this.emit('leave', peer.id); }; }
    else { peer.unrel = ch; ch.onmessage = (e) => this.deliver(peer, e.data); }
  }
  deliver(peer, raw) {
    const m = JSON.parse(raw);
    if (m.join && this.isHost) { peer.gid = m.from; peer.id = m.from; this.peers.set(m.from, peer); this.emit('join', m.from, m.join); return; }
    this.emit('message', m.d, peer.gid ?? peer.id);
  }
  /** Host: make a Gate Pass for one more friend. */
  async makePass() {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const rel = pc.createDataChannel('rel', { ordered: true });
    const unrel = pc.createDataChannel('unrel', { ordered: false, maxRetransmits: 0 });
    const peerId = `p${uid()}`;
    const peer = this.wire(peerId, pc, rel);
    peer.unrel = unrel;
    unrel.onmessage = (e) => this.deliver(peer, e.data);
    await pc.setLocalDescription(await pc.createOffer());
    await waitForIce(pc);
    this.pending = peer;
    return packCode({ t: pc.localDescription.type, s: pc.localDescription.sdp });
  }
  /** Guest: read a Gate Pass, make a Reply Slip. */
  async answerPass(code) {
    const offer = await unpackCode(code);
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer = { id: 'host', pc, rel: null, unrel: null };
    this.peers.set('host', peer);
    pc.ondatachannel = (e) => this.acceptChannel(peer, e.channel);
    await pc.setRemoteDescription({ type: offer.t, sdp: offer.s });
    await pc.setLocalDescription(await pc.createAnswer());
    await waitForIce(pc);
    return packCode({ t: pc.localDescription.type, s: pc.localDescription.sdp });
  }
  /** Host: read the Reply Slip. */
  async acceptReply(code) {
    const answer = await unpackCode(code);
    await this.pending.pc.setRemoteDescription({ type: answer.t, sdp: answer.s });
  }
  joinGate(_, hello) { const p = this.peers.get('host'); p?.rel?.send(JSON.stringify({ from: this.id, join: hello })); }
  send(d, { to, reliable = true } = {}) {
    if (!this.budget.take(performance.now())) return false;
    const raw = JSON.stringify({ d });
    for (const [id, peer] of this.peers) {
      if (to && id !== to) continue;
      const ch = reliable ? peer.rel : (peer.unrel?.readyState === 'open' ? peer.unrel : peer.rel);
      if (ch?.readyState === 'open') ch.send(raw);
    }
    return true;
  }
  close() { for (const p of this.peers.values()) p.pc.close(); this.peers.clear(); }
}

/** Host and guest sides of a visit, behind one Transport. */
export class VisitSession {
  constructor(g, transport, role) {
    this.g = g;
    this.t = transport;
    this.role = role;
    this.remotes = new Map();
    this.sendT = 0;
    this.incoming = [];
    this.emoteT = new Map();
    transport.on('message', (d, from) => this.onMessage(d, from));
    transport.on('join', (id, hello) => this.onJoin(id, hello));
    transport.on('leave', (id) => this.onLeave(id));
    g.net = this;
    g.visiting = true;
    g.events.emit('visitStart', { role });
  }
  addRemote(id, name, seat) {
    if (this.remotes.has(id)) return this.remotes.get(id);
    const a = new Actor(avatarDef({ shirt: ['red', 'blue', 'green', 'sand'][seat % 4], hair: seat % 8, hairColor: 'orange' }, `visit-${id}`), { name, seed: seat + 3 });
    a.addTo(this.g.town.group);
    const r = { id, name, a, track: new RemoteTrack(), seat };
    this.remotes.set(id, r);
    return r;
  }
  onJoin(id, hello) {
    const g = this.g;
    if (this.remotes.size >= 3) { this.t.send({ t: 'full' }, { to: id }); return; }
    const seat = this.remotes.size + 1;
    this.addRemote(id, clean(hello.name), seat);
    // A chunked reliable town snapshot: tiles, objects, weather, time, neighbours
    const w = g.world;
    const snapshot = JSON.stringify({ seed: w.seed, clock: w.clock, town: w.town, npcs: w.npcs, flags: { forceWeather: w.flags.forceWeather ?? null, shackRoof: w.flags.shackRoof }, player: { homeTier: w.player.homeTier, name: w.player.name, town: w.player.town }, home: { wallColor: w.home.wallColor, roofColor: w.home.roofColor }, store: w.store, museum: { open: true }, hostName: w.player.name });
    const chunks = chunkString(snapshot);
    chunks.forEach((c, i) => this.t.send({ t: 'town', i, n: chunks.length, c }, { to: id, reliable: true }));
    this.t.send({ t: 'hello', seat, host: w.player.name }, { to: id, reliable: true });
    g.events.emit('visitJoined', { id, name: hello.name });
    g.ui.toastMsg(`${clean(hello.name)} has come by bus.`);
    g.sound('busHorn');
  }
  onLeave(id) {
    const g = this.g;
    if (this.role === 'guest' && (id === 'host' || id === this.hostId)) { g.ui.toastMsg('The host went home. So do you.'); this.leave(); return; }
    const r = this.remotes.get(id);
    if (r) { r.a.remove(); this.remotes.delete(id); g.ui.toastMsg(`${r.name} caught the bus home.`); g.events.emit('visitLeft', { id }); }
  }
  onMessage(d, from) {
    const g = this.g;
    switch (d.t) {
      case 'me': {
        const r = this.remotes.get(from);
        if (r) r.track.push(g.ctx.time * 1000, unpackAvatar(d.a));
        break;
      }
      case 'snap': {
        for (const raw of d.a) { const u = unpackAvatar(raw); if (u.id === this.t.id) continue; const r = this.remotes.get(u.id) ?? this.addRemote(u.id, u.id === 'host' ? this.hostName ?? 'Host' : 'Visitor', this.remotes.size + 1); r.track.push(g.ctx.time * 1000, u); }
        break;
      }
      case 'town': {
        this.incoming[d.i] = d.c;
        if (this.incoming.filter(Boolean).length === d.n) this.buildGuestTown(JSON.parse(this.incoming.join('')));
        break;
      }
      case 'hello': this.hostName = clean(d.host); break;
      case 'do': this.onDo(d, from); break;
      case 'ev': this.onEv(d, from); break;
      case 'emote': { const r = this.remotes.get(from) ?? [...this.remotes.values()].find((x) => x.id === d.id); r?.a.play(d.clip, 0.1, { once: true }); if (this.role === 'host') this.t.send({ t: 'emote', id: from, clip: d.clip }); break; }
      case 'full': g.ui.toastMsg('That gate is full.'); this.leave(); break;
      case 'bye': this.leave(); break;
      default: break;
    }
  }
  /** Guest: build a temporary town from the host's. Your own save is untouched. */
  buildGuestTown(snap) {
    const g = this.g;
    const w = newWorld(snap.seed, { demo: true });
    Object.assign(w.clock, snap.clock);
    w.town = snap.town;
    w.npcs = snap.npcs;
    w.player.homeTier = snap.player.homeTier;
    w.player.name = g.guestProfile?.name ?? 'Visitor';
    w.player.town = snap.player.town;
    w.player.beans = g.guestProfile?.beans ?? 0;
    w.player.pockets = g.guestProfile?.pockets ?? Array(15).fill(null);
    w.player.tools = ['net', 'rod'];
    w.player.look = g.guestProfile?.look ?? w.player.look;
    w.flags = { ...w.flags, ...snap.flags, visiting: true };
    w.home.wallColor = snap.home.wallColor; w.home.roofColor = snap.home.roofColor;
    w.store = snap.store;
    w.museum.open = true;
    this.hostName = clean(snap.hostName);
    g.visitArrive(w);
    g.events.emit('visitArrived', {});
    g.ui.toastMsg(`Welcome to ${clean(snap.player.town)}. Bus doesn't run while you have company.`);
  }
  /** Host validates: catches and pickups claimed by a guest. */
  onDo(d, from) {
    const g = this.g;
    const w = g.world;
    if (d.a === 'pick') {
      const o = w.town.objects[d.k];
      if (!o || !['drop', 'shell', 'driftwood', 'flowerGift'].includes(o.k)) { this.t.send({ t: 'ev', k: 'denied', key: d.k }, { to: from }); return; }
      delete w.town.objects[d.k];
      g.town.dirty.add(d.k);
      this.t.send({ t: 'ev', k: 'obj', key: d.k, o: null });
      this.t.send({ t: 'ev', k: 'granted', item: o.item, key: d.k }, { to: from });
      g.events.emit('visitPick', { from, item: o.item });
    } else if (d.a === 'shake') {
      const o = w.town.objects[d.k];
      if (!o || o.k !== 'tree') return;
      g.life.shakeTree(d.k, o);
      for (const k of Object.keys(w.town.objects)) if (w.town.objects[k].k === 'drop') this.t.send({ t: 'ev', k: 'obj', key: k, o: w.town.objects[k] });
      this.t.send({ t: 'ev', k: 'obj', key: d.k, o });
    } else if (d.a === 'gift') {
      const [x, z] = d.at;
      const key = `${x},${z}`;
      if (!w.town.objects[key]) { w.town.objects[key] = { k: 'drop', item: d.item }; g.town.dirty.add(key); this.t.send({ t: 'ev', k: 'obj', key, o: w.town.objects[key] }); }
      g.events.emit('visitGift', { from, item: d.item });
    }
  }
  onEv(d) {
    const g = this.g;
    const w = g.world;
    if (d.k === 'obj') { if (d.o) w.town.objects[d.key] = d.o; else delete w.town.objects[d.key]; g.town.dirty.add(d.key); }
    if (d.k === 'granted') { addItem(g, d.item); g.sound('pickUp'); }
    if (d.k === 'denied') g.ui.toastMsg('Somebody got there first.');
  }
  /** Each frame. Own avatar is predicted; remotes render 120 ms in the past and snap if 3 m off. */
  update(dt) {
    const g = this.g;
    const now = g.ctx.time * 1000;
    for (const r of this.remotes.values()) {
      const tr = r.track.at(now);
      if (tr.seen) { r.a.x = tr.x; r.a.z = tr.z; r.a.y = g.town.height(tr.x, tr.z); r.a.turnTo = tr.facing; if (!r.a.current?.once || r.a.finished) r.a.play(tr.action ? 'Jog' : 'Idle', 0.15); }
      r.a.update(dt);
      r.a.visible = g.place === g.town;
    }
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = SEND_RATE;
    const p = g.player;
    const self = { id: this.t.id, x: p.x, z: p.z, facing: p.facing, action: p.speed > 0.2 ? 1 : 0 };
    if (this.role === 'guest') this.t.send({ t: 'me', a: packAvatar(self) }, { reliable: false });
    else {
      const list = [packAvatar({ ...self, id: 'host' })];
      for (const r of this.remotes.values()) list.push(packAvatar({ id: r.id, x: r.a.x, z: r.a.z, facing: r.a.facing, action: r.track.action }));
      this.t.send({ t: 'snap', a: list }, { reliable: false });
    }
  }
  emote(em) {
    const CLIP = { laugh: 'Laugh', cry: 'Cry', shock: 'Shock', anger: 'Anger', love: 'Love', shrug: 'Shrug', bow: 'Bow', dance: 'Dance' };
    this.t.send({ t: 'emote', clip: CLIP[em] });
  }
  /** Leave: a guest keeps pockets and beans, nothing else. */
  leave() {
    const g = this.g;
    if (this.left) return;
    this.left = true;
    const role = this.role;
    if (role === 'guest') {
      store.set(GUEST_KEY, { pockets: g.world.player.pockets, beans: g.world.player.beans });
      const saved = store.get('honk:save');
      if (saved) { saved.player.pockets = g.world.player.pockets; saved.player.beans = g.world.player.beans; store.set('honk:save', saved); }
    } else this.t.send({ t: 'bye' });
    this.t.close();
    for (const r of this.remotes.values()) r.a.remove();
    this.remotes.clear();
    g.net = null;
    g.visiting = false;
    g.events.emit('visitEnd', { role });
    if (role === 'guest') g.goTitleFromVisit();
  }
}
const clean = (s) => String(s ?? '').replace(/[^A-Za-z0-9 .,!?'&()_-]/g, '').slice(0, 14);
export const visitActors = { LANDMARKS, ITEMS, hasRoom, drawText };
