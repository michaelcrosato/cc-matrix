// Sources of state for the operation view: the host's own sim, or the network's copy. A client moves its
// own tip locally at once and corrects gently; everything else draws from snapshots about 120 ms behind.
import { applyKey, applySnap, emptyView, smoothView } from '../sim/codec.js';
import { OPS } from '../content/ops/index.js';
import { SeatControl } from '../input/cursor.js';
import { App } from '../app.js';
import { chooseRound } from './host.js';

const hub = () => window.AIHub;

export class HostSource {
  constructor(host, info) {
    this.host = host;
    this.state = host.sim;
    this.seatIndex = host.seatByPlayer.get(info.me);
    this.control = this.seatIndex != null ? new SeatControl(App, this.seatIndex, 'all') : null;
  }
  drain() { return this.host.takeLocalEvents(); }
  fixed(ctx, stage, dt) {
    if (!this.control || this.ended) return;
    App.devices.poll(ctx);
    this.control.frameEdges(ctx, this.state);
    const inp = this.control.step(ctx, this.state, stage, dt);
    this.host.setLocalInput(this.seatIndex, { ...inp });
  }
  localTip() { return this.control ? { x: this.control.x, z: this.control.z } : null; }
}

export class ClientSource {
  constructor(info) {
    this.info = info;
    this.def = OPS[chooseRound(info)];
    this.state = emptyView(this.def, info.players);
    this.state.seats.forEach((s) => { s.x = s.tx = (s.id % 2 ? 3 : -3); s.z = s.tz = s.id < 2 ? 0.5 : 1.5; });
    this.seatIndex = info.players.findIndex((p) => p.id === info.me);
    this.control = this.seatIndex >= 0 ? new SeatControl(App, this.seatIndex, 'all') : null;
    if (this.control) { this.control.x = this.state.seats[this.seatIndex].x; this.control.z = this.state.seats[this.seatIndex].z; this.control.tool = this.state.tools[0]; }
    this.events = [];
    this.n = 0;
    this.lastSend = 0;
    this.gotKey = false;
    this.timer = setInterval(() => this.sendInput(), 66);
  }
  onMessage(data) {
    if (data.t === 'k') { applyKey(this.state, data); this.gotKey = true; }
    else if (data.t === 's' && this.gotKey) applySnap(this.state, data);
    else if (data.t === 'e') this.events.push(...data.ev);
  }
  drain() { const e = this.events; this.events = []; return e; }
  fixed(ctx, stage, dt) {
    smoothView(this.state, dt);
    if (!this.control || this.ended) return;
    App.devices.poll(ctx);
    this.control.frameEdges(ctx, this.state);
    this.inp = { ...this.control.step(ctx, this.state, stage, dt) };
    // Gentle correction if the local tip has drifted over a unit from the host's view of it.
    const s = this.state.seats[this.seatIndex];
    if (s && Math.hypot(s.tx - this.control.x, s.tz - this.control.z) > 3) { this.control.x += (s.tx - this.control.x) * 0.02; this.control.z += (s.tz - this.control.z) * 0.02; }
  }
  localTip(seat) { return seat.id === this.seatIndex && this.control ? { x: this.control.x, z: this.control.z } : null; }
  /** 15 Hz, always, even idle: the harness requires traffic both ways. */
  sendInput() {
    if (this.ended || hub().time() === -Infinity) return;
    const i = this.inp ?? {};
    const s = this.state.seats[this.seatIndex];
    hub().send({ t: 'i', n: ++this.n, x: Math.round((i.x ?? s?.x ?? 0) * 100), z: Math.round((i.z ?? s?.z ?? 0) * 100), tool: i.tool ?? null, use: i.use ? 1 : 0, gift: i.gift ? 1 : 0, steady: i.steady ? 1 : 0, a: i.a ? 1 : 0, b: i.b ? 1 : 0, rot: i.rot ? Math.round(i.rot) : 0 }, { to: hub().host, reliable: false });
  }
  stop() { this.ended = true; clearInterval(this.timer); }
}
