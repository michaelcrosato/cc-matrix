/* UFOh Orbit: AI Hub Session Protocol v1 authoritative shared-world adapter. */
const NEUTRAL = Object.freeze({ mx: 0, my: 0, ax: 0, ay: 0, aim: false, fire: false });
const OMIT = new Set(['content', 'replay', 'history', 'rngCalls', 'nextId', 'counters', 'boss']);
const copy = value => JSON.parse(JSON.stringify(value));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const round = value => Math.round(value * 1000) / 1000;
const tau = Math.PI * 2;

export function cleanIntent(value) {
  if (!value || typeof value !== 'object') return { ...NEUTRAL };
  const out = { ...NEUTRAL };
  for (const key of ['mx', 'my']) out[key] = finite(value[key]) ? clamp(value[key], -1, 1) : 0;
  for (const key of ['ax', 'ay']) out[key] = finite(value[key]) ? clamp(value[key], -1000000, 1000000) : 0;
  const aimMagnitude = Math.max(1,Math.hypot(out.ax,out.ay));
  out.ax /= aimMagnitude; out.ay /= aimMagnitude;
  const n = Math.hypot(out.mx, out.my);
  if (n > 1) { out.mx /= n; out.my /= n; }
  out.aim = value.aim === true && Math.hypot(out.ax, out.ay) > .1;
  out.fire = value.fire === true;
  return out;
}

/* Repeated actor dictionaries become a table. No gameplay actor is culled. */
function pack(value) {
  if (finite(value)) return round(value);
  if (Array.isArray(value)) {
    if (value.length > 1 && value.every(v => v && !Array.isArray(v) && typeof v === 'object')) {
      const keys = [...new Set(value.flatMap(v => Object.keys(v)))];
      return { $table: keys, rows: value.map(v => keys.map(k => v[k] === undefined ? null : pack(v[k]))) };
    }
    return value.map(pack);
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([,v]) => typeof v !== 'function' && v !== undefined).map(([k,v]) => [k, pack(v)]));
  return value;
}
function unpack(value) {
  if (Array.isArray(value)) return value.map(unpack);
  if (value && typeof value === 'object') {
    if (Array.isArray(value.$table) && Array.isArray(value.rows)) return value.rows.map(row => Object.fromEntries(value.$table.map((k,i) => [k,unpack(row[i])])));
    return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,unpack(v)]));
  }
  return value;
}

export function encodeWorld(world) {
  const state = {};
  for (const [key,value] of Object.entries(world)) {
    if (OMIT.has(key) || typeof value === 'function') continue;
    state[key] = key === 'events' ? value.slice(-24) : value;
  }
  return JSON.stringify(pack(state));
}
export function decodeWorld(payload) {
  const state = unpack(JSON.parse(payload));
  state.boss = state.enemies?.find(e => e.type === 'boss') ?? null;
  return state;
}

/**
 * Call connect once, then tick from the native fixed-step scene, including local overlays.
 * start receives the Hub identities; the simulation keeps stable pilot array indices.
 * applyWorld is for nonhost render state only. Damage and score never run there.
 */
export class HubAdapter {
  constructor(config = {}) {
    this.config = config;
    this.hub = config.hub ?? globalThis.AIHub;
    this.active = false;
    this.state = 'standalone';
    this.info = null;
    this.localIndex = -1;
    this.isHost = false;
    this.server = false;
    this.elapsed = 0;
    this.sequence = 0;
    this.frameSequence = 0;
    this.snapshotSequence = -1;
    this.inputClock = 0;
    this.pendingFire = false;
    this.snapshotClock = 0;
    this.remote = new Map();
    this.liveIds = new Set();
    this.unsubscribers = [];
    this.outgoing = [];
    this.sentTimes = [];
    this.chunks = new Map();
    this.localHistory = [];
    this.previous = null;
    this.current = null;
    this.receivedAt = 0;
    this.lastLocalIntent = { ...NEUTRAL };
    this.finished = false;
    this.finishPending = null;
    this.stats = { sent: 0, received: 0, inputs: 0, snapshots: 0, dropped: 0, rejected: 0, maxBytes: 0, maxRate: 0, corrections: 0, acknowledged: -1 };
  }

  setState(state) {
    this.state = state;
    this.config.onState?.(state);
  }

  async connect() {
    if (!this.hub?.connect) return false;
    const info = await this.hub.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) return false;
    this.info = info;
    this.active = true;
    this.isHost = info.isHost === true;
    this.server = info.server === true;
    this.localIndex = info.players.findIndex(p => p.id === info.me);
    this.liveIds = new Set(info.players.map(p => p.id));
    for (const p of info.players) this.remote.set(p.id, { sequence: -1, at: -Infinity, input: { ...NEUTRAL } });
    this.setState('waiting');
    this.config.start?.({ players: info.players, seed: info.seed, server: this.server, isHost: this.isHost, localIndex: this.localIndex });
    this.unsubscribers.push(
      this.hub.on('start', () => this.setState('countdown')),
      this.hub.on('message', (data, from) => this.receive(data, from)),
      this.hub.on('leave', ({id}) => this.leave(id)),
      this.hub.on('time-up', () => this.timeUp()),
      this.hub.on('end', detail => this.end(detail)),
    );
    this.hub.ready();
    return true;
  }

  receive(data, from) {
    if (!this.active || this.state === 'ended' || !data || data.game !== 'ufoh-orbit-v1') return;
    this.stats.received++;
    if (this.isHost && data.kind === 'input') {
      if (!this.liveIds.has(from) || !Number.isSafeInteger(data.seq) || data.seq < 0) { this.stats.rejected++; return; }
      const entry = this.remote.get(from);
      if (!entry || data.seq <= entry.sequence) { this.stats.rejected++; return; }
      entry.sequence = data.seq;
      entry.at = this.elapsed;
      entry.input = cleanIntent(data.input);
      this.stats.inputs++;
      return;
    }
    if (this.isHost || from !== this.hub.host || data.kind !== 'world') { this.stats.rejected++; return; }
    if (!Number.isSafeInteger(data.seq) || data.seq <= this.snapshotSequence) { this.stats.rejected++; return; }
    if (!Number.isSafeInteger(data.total) || data.total < 1 || data.total > 128 || !Number.isSafeInteger(data.part) || data.part < 0 || data.part >= data.total || typeof data.payload !== 'string' || data.payload.length > 12000) { this.stats.rejected++; return; }
    let entry = this.chunks.get(data.seq);
    if (!entry) { entry = { total:data.total, parts:new Array(data.total), ack:data.ack ?? {}, at:this.elapsed }; this.chunks.set(data.seq, entry); }
    if (entry.total !== data.total) { this.stats.rejected++; return; }
    entry.parts[data.part] = data.payload;
    if (entry.parts.filter(v => typeof v === 'string').length !== entry.total) return;
    try {
      const world = decodeWorld(entry.parts.join(''));
      if (!Array.isArray(world.players) || !Array.isArray(world.enemies) || !finite(world.time)) throw new Error('invalid world');
      this.previous = this.current ? copy(this.current) : copy(world);
      this.current = world;
      this.receivedAt = this.elapsed;
      this.snapshotSequence = data.seq;
      this.stats.snapshots++;
      this.stats.acknowledged = entry.ack[this.info.me] ?? -1;
      this.localHistory = this.localHistory.filter(x => x.seq > this.stats.acknowledged);
      for (const seq of this.chunks.keys()) if (seq <= data.seq) this.chunks.delete(seq);
      this.config.applyWorld?.(copy(world));
    } catch {
      this.stats.rejected++;
    }
  }

  leave(id) {
    this.liveIds.delete(id);
    const entry = this.remote.get(id);
    if (entry) { entry.input = { ...NEUTRAL }; entry.at = -Infinity; }
    const index = this.info.players.findIndex(p => p.id === id);
    if (this.isHost && index >= 0) {
      if (this.config.onLeave) this.config.onLeave(index, id);
      else {
        const p = this.config.getWorld?.()?.players[index];
        if (p) { p.down = true; p.departed = true; p.active = false; p.hull = 0; p.vx = 0; p.vy = 0; }
      }
    }
  }

  queueWorld(final = false) {
    if (!this.isHost || this.state === 'ended') return;
    const world = this.config.getSnapshot?.() ?? this.config.getWorld?.();
    if (!world) return;
    const payload = encodeWorld(world);
    const pieces = [];
    for (let offset=0; offset<payload.length;) {
      let length = Math.min(7000,payload.length-offset);
      while (new TextEncoder().encode(JSON.stringify({payload:payload.slice(offset,offset+length)})).length > 14000) length=Math.floor(length*.8);
      pieces.push(payload.slice(offset,offset+length));
      offset += length;
    }
    if (!pieces.length) pieces.push('');
    const count = pieces.length;
    const ack = Object.fromEntries([...this.remote].map(([id,entry]) => [id,entry.sequence]));
    const seq = this.frameSequence++;
    /* A pending snapshot is completed before the next one; whole actor sets survive congestion. */
    for (let part=0; part<count; part++) this.outgoing.push({ game:'ufoh-orbit-v1',kind:'world',seq,part,total:count,ack,payload:pieces[part],final });
  }

  send(data, options) {
    const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
    this.stats.maxBytes = Math.max(this.stats.maxBytes, bytes);
    if (bytes > 16384) { this.stats.rejected++; return false; }
    this.sentTimes = this.sentTimes.filter(t => this.elapsed-t < 1);
    if (this.sentTimes.length >= 16) return false;
    const sent = this.hub.send(data, { reliable:true, ...options });
    if (sent === false) { this.stats.dropped++; return false; }
    this.sentTimes.push(this.elapsed);
    this.stats.sent++;
    this.stats.maxRate = Math.max(this.stats.maxRate,this.sentTimes.length);
    return true;
  }

  flush() {
    let sent = 0;
    while (this.outgoing.length && sent < 2) {
      if (!this.send(this.outgoing[0])) break;
      this.outgoing.shift();
      sent++;
    }
    if (this.finishPending && !this.outgoing.length) {
      const result = this.finishPending;
      this.finishPending = null;
      this.hub.finish(result);
      this.finished = true;
      this.setState('finished');
    }
  }

  finish(won) {
    if (!this.isHost || this.finished || this.finishPending || this.state === 'ended') return;
    const world = this.config.getWorld?.();
    const ids = [...this.liveIds];
    const score = Math.max(0,Number(world?.score) || 0);
    this.outgoing.length = 0;
    this.queueWorld(true);
    this.finishPending = { standings: ids.length ? [ids] : [], scores:Object.fromEntries(ids.map(id => [id,score])), won:won === true };
    this.setState('finishing');
    this.flush();
  }

  timeUp() {
    if (!this.isHost || this.finished || this.state === 'ended') return;
    const world = this.config.getWorld?.();
    if (world?.status === 'running') {
      world.status = 'defeat';
      world.objective = 'TIME UP. THE SPACE MACHINERY WINS THIS ROUND.';
      this.config.onTimeUp?.(world);
    }
    this.finish(world?.status === 'victory');
  }

  end(detail) {
    if (this.state === 'ended') return;
    this.outgoing.length = 0;
    this.localHistory.length = 0;
    this.lastLocalIntent = { ...NEUTRAL };
    this.pendingFire = false;
    for (const entry of this.remote.values()) entry.input = { ...NEUTRAL };
    this.setState('ended');
    this.config.onEnd?.(detail);
  }

  tick(dt, localInput = NEUTRAL, options = {}) {
    if (!this.active || this.state === 'ended' || this.state === 'finished') return;
    this.elapsed += dt;
    if (options.paused) this.pendingFire = false;
    if (this.finishPending) { this.flush(); return; }
    if (!Number.isFinite(this.hub.time()) || this.hub.time() < 0 || !['countdown','running'].includes(this.state)) return;
    if (this.state !== 'running') this.setState('running');
    const input = cleanIntent(options.paused ? NEUTRAL : localInput);
    this.lastLocalIntent = input;
    if (this.isHost) {
      if (this.localIndex >= 0 && !this.server) {
        const local = this.remote.get(this.info.me);
        local.input = input;
        local.at = this.elapsed;
        local.sequence = this.sequence++;
      }
      const inputs = this.info.players.map(p => {
        const entry = this.remote.get(p.id);
        return this.liveIds.has(p.id) && entry && this.elapsed-entry.at <= .5 ? entry.input : NEUTRAL;
      });
      this.config.step?.(inputs,dt);
      const world = this.config.getWorld?.();
      if (world?.status === 'victory' || world?.status === 'defeat') { this.finish(world.status === 'victory'); return; }
      this.snapshotClock += dt;
      if (this.snapshotClock >= .125 && !this.outgoing.length) { this.snapshotClock %= .125; this.queueWorld(); }
      this.flush();
    } else {
      // Preserve a press that happens between the 10 Hz intent samples. A successful
      // send consumes the latch; held fire continues through the current input.
      this.pendingFire = this.pendingFire || input.fire;
      this.inputClock += dt;
      if (this.inputClock >= .1) {
        this.inputClock %= .1;
        const seq = this.sequence++;
        const packetInput = { ...input, fire: input.fire || this.pendingFire };
        if (this.send({ game:'ufoh-orbit-v1',kind:'input',seq,input:packetInput },{ to:this.hub.host })) {
          this.pendingFire = false;
          this.localHistory.push({ seq,input:packetInput,at:this.elapsed });
          if (this.localHistory.length > 12) this.localHistory.shift();
        }
      }
      this.present(dt,{ ...input, fire: input.fire || this.pendingFire });
    }
    for (const [seq,entry] of this.chunks) if (this.elapsed-entry.at > 2) this.chunks.delete(seq);
  }

  present(dt,input) {
    if (!this.current) return;
    const world = copy(this.current);
    const age = Math.max(0,this.elapsed-this.receivedAt);
    const previous = this.previous ?? this.current;
    const span = Math.max(.001,this.current.time-previous.time);
    const t = clamp(age/span,0,1);
    for (const key of ['players','enemies','bullets']) {
      const before = new Map((previous[key] ?? []).map(a => [a.id,a]));
      for (const a of world[key] ?? []) {
        if (key === 'players' && a === world.players[this.localIndex]) continue;
        const b = before.get(a.id);
        if (b) { a.x = b.x+(a.x-b.x)*t; a.y = b.y+(a.y-b.y)*t; }
      }
    }
    const p = world.players[this.localIndex];
    if (p && !p.down) {
      const balance = world.balance ?? {};
      const speed = Number(balance.moveSpeed ?? balance.playerSpeed ?? 180) * (p.shield > 0 ? Number(balance.recoverySpeed ?? balance.recoverySpeedFactor ?? .5) : 1);
      const horizon = clamp(age+Math.min(.1,this.localHistory.length*.015),0,.22);
      const targetX = clamp(p.x+input.mx*speed*horizon,18,942);
      const targetY = clamp(p.y+input.my*speed*horizon,18,522);
      const shown = this.config.getWorld?.()?.players?.[this.localIndex];
      if (shown && Math.hypot(shown.x-targetX,shown.y-targetY) < 150) {
        const k = 1-Math.exp(-dt*18);
        p.x = shown.x+(targetX-shown.x)*k;
        p.y = shown.y+(targetY-shown.y)*k;
      } else { p.x=targetX;p.y=targetY;this.stats.corrections++; }
      let angle = p.angle ?? 0;
      const x = input.aim ? input.ax : input.mx, y = input.aim ? input.ay : input.my;
      if (Math.hypot(x,y) > .1) {
        const target = (Math.atan2(y,x)+tau)%tau;
        const delta = (target-angle+tau)%tau;
        angle = (angle+Math.min(delta,horizon*Number(balance.aimSpeed ?? balance.cannonSlew ?? tau)))%tau;
        p.targetAngle=target;
      }
      p.angle=angle;
      p.shield=Math.max(0,p.shield-age);
      if (input.fire || this.localHistory.some(h => h.input.fire)) p.shield=Math.max(p.shield,Number(balance.shieldRecharge ?? 1.6));
    }
    this.config.applyWorld?.(world);
  }

  snapshot() {
    return { active:this.active,state:this.state,isHost:this.isHost,server:this.server,localIndex:this.localIndex,players:[...this.liveIds],elapsed:round(this.elapsed),sequence:this.sequence,snapshotSequence:this.snapshotSequence,queue:this.outgoing.length,finished:this.finished,stats:{ ...this.stats } };
  }

  dispose() {
    for (const unsubscribe of this.unsubscribers) unsubscribe?.();
    this.unsubscribers.length = 0;
    this.end({ reason:'disposed' });
  }
}
