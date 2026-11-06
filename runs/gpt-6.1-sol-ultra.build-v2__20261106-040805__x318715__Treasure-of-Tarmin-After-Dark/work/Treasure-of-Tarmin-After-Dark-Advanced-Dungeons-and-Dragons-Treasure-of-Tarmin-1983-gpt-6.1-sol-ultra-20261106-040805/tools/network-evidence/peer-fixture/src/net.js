import { createRun, command, advance, snapshot, restore, removePlayer } from './core.js';

export const NET_VERSION = 1;
const PREFIX = 'TARMIN1.';
const MAX_INVITE = 160000;
const MAX_PACKET = 15500;
const MAX_COMMANDS = 16;
const nop = () => {};
const clock = () => globalThis.performance?.now() ?? Date.now();
const clone = (value) => JSON.parse(JSON.stringify(value));
const token = () => {
  const bytes = new Uint32Array(3);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((n) => n.toString(36)).join('-');
};
const encode = (value) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
};
const decode = (text) => {
  const raw = atob(text);
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(raw, (c) => c.charCodeAt(0))));
};

export function encodeInvite(description) {
  if (!description || !['offer', 'answer'].includes(description.type) || typeof description.sdp !== 'string') throw new Error('No complete connection description.');
  return PREFIX + encode({ v: NET_VERSION, type: description.type, sdp: description.sdp });
}

export function decodeInvite(text, expectedType) {
  if (typeof text !== 'string' || text.length > MAX_INVITE) throw new Error('The connection code is too long.');
  const clean = text.trim();
  if (!clean.startsWith(PREFIX)) throw new Error('Paste a complete TARMIN1 connection code.');
  let value;
  try { value = decode(clean.slice(PREFIX.length)); } catch { throw new Error('The connection code is damaged or incomplete.'); }
  if (value.v !== NET_VERSION || value.type !== expectedType || typeof value.sdp !== 'string' || value.sdp.length < 40 || value.sdp.length > 100000 || !value.sdp.startsWith('v=0')) {
    throw new Error(`This step needs a compatible ${expectedType} code.`);
  }
  return { type: value.type, sdp: value.sdp };
}

function validAction(action) {
  return action && typeof action === 'object' && !Array.isArray(action) && typeof action.type === 'string' && action.type.length <= 40 && JSON.stringify(action).length < 2048 && !action.type.startsWith('dev') && !['tune', 'setTuning', 'debug', 'jump', 'restart', 'new', 'load', 'restore'].includes(action.type);
}

/** Solo uses the same command/clock boundary as either network authority. */
export function createSoloController({ players = [{ id: 'solo', name: 'Adventurer' }], seed = 14383, tuning, state, onState = nop, onStatus = nop } = {}) {
  let run = state ? restore(state) : createRun({ players, seed, tuning, mode: 'solo' });
  let ended = false;
  let paused = false;
  const localId = String(players[0]?.id ?? Object.keys(run.players)[0]);
  const timer = setInterval(() => {
    if (!ended && !paused && run.encounter?.deadline != null) { advance(run, clock()); onState(run); }
  }, 50);
  const controller = {
    mode: 'solo', authority: true, server: false, localId, started: true,
    get state() { return run; }, get paused() { return paused; },
    send(action) {
      if (ended || paused) return { ok: false, reason: paused ? 'The expedition is paused.' : 'The expedition has ended.' };
      const result = command(run, localId, action, clock());
      onState(run, result); return result;
    },
    replaceState(value) { run = restore(value); onState(run); },
    pause(value = true) { paused = !!value; onStatus(paused ? 'paused' : 'playing'); },
    close() { ended = true; clearInterval(timer); },
    diagnostics() { return { mode: 'solo', authority: true, outbound: 0, received: 0, ended }; },
  };
  onState(run); return controller;
}

/** One host owns the model. Reliable deltas preserve all authoritative fields. */
function networkController({ mode, localId, authority, server = false, players, seed, expedition, sendPacket, onState = nop, onStatus = nop, onEnd = nop, now = clock, finish = nop, roster = () => players, initialState = null }) {
  let state = authority ? createRun({ players, seed, mode, expedition }) : initialState;
  let started = mode === 'webrtc';
  let ended = false;
  let finished = false;
  let seq = 0;
  let hostRevision = 0;
  let appliedRevision = -1;
  let lastSent = -Infinity;
  let lastHeartbeat = -Infinity;
  let lastSerialized = new Map();
  let lastWhole = '';
  let sending = [];
  let pending = [];
  const seen = new Map();
  const incoming = new Map();
  const stats = { sent: 0, received: 0, bytes: 0, rejected: 0, maxPacket: 0, sentTimes: [], peakPerSecond: 0 };
  const envelope = (p) => ({ v: NET_VERSION, e: expedition, ...p });
  const queue = (value) => {
    const raw = JSON.stringify(envelope(value));
    if (new TextEncoder().encode(raw).length <= MAX_PACKET) { sending.push(envelope(value)); return; }
    const text = encode(value);
    const id = `${hostRevision}-${seq}-${token()}`;
    const parts = Math.ceil(text.length / 11500);
    if (parts > 64) throw new Error('The expedition state is too large to synchronize.');
    for (let i = 0; i < parts; i++) sending.push(envelope({ t: 'chunk', id, i, n: parts, text: text.slice(i * 11500, (i + 1) * 11500) }));
  };
  const transmit = (p) => {
    if (ended) return;
    const bytes = new TextEncoder().encode(JSON.stringify(p)).length;
    if (bytes > MAX_PACKET) { stats.rejected++; return; }
    const sent = sendPacket(p);
    if (sent !== false) {
      const at = clock(); stats.sent++; stats.bytes += bytes; stats.maxPacket = Math.max(stats.maxPacket, bytes);
      stats.sentTimes = stats.sentTimes.filter((t) => at - t < 1000); stats.sentTimes.push(at);
      stats.peakPerSecond = Math.max(stats.peakPerSecond, stats.sentTimes.length);
    }
  };
  const broadcast = (full = false) => {
    if (!authority || !state) return;
    const whole = snapshot(state);
    const serialized = JSON.stringify(whole);
    if (!full && serialized === lastWhole && now() - lastHeartbeat < 1000) return;
    const fields = {};
    const removed = [];
    for (const key of Object.keys(whole)) {
      const s = JSON.stringify(whole[key]);
      if (full || s !== lastSerialized.get(key)) fields[key] = whole[key];
    }
    for (const key of lastSerialized.keys()) if (!(key in whole)) removed.push(key);
    hostRevision++;
    queue({ t: full ? 'state' : 'delta', r: hostRevision, at: Math.max(0, now()), state: fields, removed });
    lastWhole = serialized; lastSerialized = new Map(Object.entries(whole).map(([k, v]) => [k, JSON.stringify(v)])); lastHeartbeat = now();
  };
  const announce = () => {
    if (authority && state && !finished && ['victory', 'defeat'].includes(state.status)) {
      finished = true; broadcast(true); finish(state.status === 'victory', state);
    }
  };
  const apply = (id, actions, packet) => {
    if (!authority || !state || !started || finished || now() < 0 || !state.players?.[String(id)] || !Array.isArray(actions) || actions.length > MAX_COMMANDS) { stats.rejected++; return; }
    for (const entry of actions) {
      if (!entry || !Number.isSafeInteger(entry.n) || entry.n <= (seen.get(String(id)) ?? 0) || !validAction(entry.action)) { stats.rejected++; continue; }
      seen.set(String(id), entry.n);
      const action = entry.action;
      // A stale movement can never pass through an encounter that began in transit.
      if (action.type === 'move' && packet.combat !== (state.encounter?.id ?? null)) { stats.rejected++; continue; }
      command(state, String(id), action, Math.max(0, now()));
    }
    onState(state); announce();
  };
  const consume = (p, from, trustedHost) => {
    if (!p || p.v !== NET_VERSION || p.e !== expedition || ended) { stats.rejected++; return; }
    stats.received++;
    if (p.t === 'chunk') {
      if (!trustedHost || !Number.isInteger(p.n) || p.n < 1 || p.n > 64 || !Number.isInteger(p.i) || p.i < 0 || p.i >= p.n || typeof p.text !== 'string' || p.text.length > 11500 || typeof p.id !== 'string' || p.id.length > 100) { stats.rejected++; return; }
      if (!incoming.has(p.id)) { if (incoming.size >= 4) incoming.delete(incoming.keys().next().value); incoming.set(p.id, { n: p.n, parts: new Map(), at: clock() }); }
      const c = incoming.get(p.id);
      if (p.n !== c.n) { incoming.delete(p.id); stats.rejected++; return; }
      c.parts.set(p.i, p.text);
      if (c.parts.size === c.n) {
        incoming.delete(p.id);
        try { consume(envelope(decode(Array.from({ length: c.n }, (_, i) => c.parts.get(i)).join(''))), from, trustedHost); } catch { stats.rejected++; }
      }
      return;
    }
    if (authority) {
      if (p.t === 'commands') apply(from, p.actions, p);
      if (p.t === 'resync') broadcast(true);
      return;
    }
    if (!trustedHost || !['state', 'delta'].includes(p.t) || !Number.isSafeInteger(p.r) || p.r <= appliedRevision || !p.state || typeof p.state !== 'object' || Array.isArray(p.state)) { stats.rejected++; return; }
    if (p.t === 'delta' && (state == null || p.r !== appliedRevision + 1)) { queue({ t: 'resync' }); return; }
    try {
      const next = p.t === 'state' ? p.state : { ...snapshot(state), ...p.state };
      for (const key of p.removed ?? []) { if (typeof key === 'string' && !['__proto__', 'constructor', 'prototype'].includes(key)) delete next[key]; }
      state = restore(next); appliedRevision = p.r; onState(state);
    } catch { stats.rejected++; queue({ t: 'resync' }); }
  };
  const tick = () => {
    if (ended || !started || now() < 0) return;
    if (authority && state && !finished) { const before = state.eventSeq; advance(state, Math.max(0, now())); if (state.eventSeq !== before) onState(state); announce(); }
    if (clock() - lastSent < 125) return;
    lastSent = clock();
    if (authority) broadcast();
    else if (pending.length) { queue({ t: 'commands', actions: pending.splice(0, MAX_COMMANDS), combat: state?.encounter?.id ?? null }); }
    else if (now() - lastHeartbeat >= 1000) { queue({ t: 'commands', actions: [], combat: state?.encounter?.id ?? null }); lastHeartbeat = now(); }
    // At most sixteen sends/second, leaving four for Hub lifecycle messages.
    for (let i = 0; i < 2 && sending.length; i++) transmit(sending.shift());
    for (const [id, c] of incoming) if (clock() - c.at > 15000) incoming.delete(id);
  };
  const timer = setInterval(tick, 25);
  const controller = {
    mode, authority, server, localId: String(localId), expedition,
    get state() { return state; }, get started() { return started && now() >= 0; }, get ended() { return ended; },
    get countdown() { return Math.max(0, 900000 - Math.max(0, now())); },
    send(action) {
      if (ended || finished || !started || now() < 0 || server) return { ok: false, reason: ended || finished ? 'The expedition has ended.' : 'Wait for the expedition to start.' };
      if (!validAction(action)) return { ok: false, reason: 'That action is unavailable in cooperative play.' };
      const entry = { n: ++seq, action: clone(action) };
      if (entry.action.round == null) entry.action.round = state?.encounter?.round ?? 0;
      if (authority) {
        const result = command(state, String(localId), entry.action, Math.max(0, now())); onState(state, result); announce(); return result;
      }
      if (pending.length >= MAX_COMMANDS) return { ok: false, reason: 'Wait for the previous actions to arrive.' };
      pending.push(entry); return { ok: true, pending: true };
    },
    receive: consume,
    start() { if (!ended) { started = true; onStatus('playing'); if (authority) broadcast(true); onState(state); } },
    leave(id) { if (!ended && authority && state) { removePlayer(state, String(id)); onState(state); broadcast(true); announce(); } },
    timeUp() { if (!ended && authority && !finished) { finished = true; finish(false, state); } },
    close(reason = 'closed') { if (ended) return; ended = true; started = false; clearInterval(timer); sending = []; pending = []; incoming.clear(); onStatus('ended', reason); onEnd({ reason, state }); },
    diagnostics() { return { ...stats, sentTimes: undefined, mode, authority, server, started, ended, queued: sending.length, expedition, hostRevision, appliedRevision, participants: roster().map((p) => p.id) }; },
    flush: tick,
  };
  if (authority) { broadcast(true); onState(state); }
  return controller;
}

/** Connect before renderer/audio boot; a server copy never needs either. */
export async function connectHub({ onState = nop, onStatus = nop, onEnd = nop } = {}) {
  const hub = globalThis.AIHub;
  if (!hub) return null;
  const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
  if (!info) return null;
  let finished = false;
  let active = true;
  let participants = info.players.slice();
  const expedition = `hub-${info.seed}-${info.round}`;
  const controller = networkController({
    mode: 'hub', localId: info.me, authority: info.isHost, server: info.server === true,
    players: participants, seed: info.seed, expedition, now: () => hub.time(),
    sendPacket: (packet) => active && hub.send(packet, { reliable: true, ...(info.isHost ? {} : { to: info.host }) }),
    onState, onStatus, onEnd, roster: () => participants,
    finish(won, state) {
      if (!active || !info.isHost || finished) return;
      finished = true;
      const ids = participants.map((p) => p.id);
      const scores = Object.fromEntries(ids.map((id) => [id, (state?.floor ?? 0) * 100 + (state?.bossDefeated ? 50 : 0) + (state?.treasureClaimed ? 1000 : 0)]));
      const stats = Object.fromEntries(ids.map((id) => [id, { depth: (state?.floor ?? 0) + 1, treasure: state?.treasureClaimed ? 1 : 0, rounds: state?.stats?.rounds ?? 0 }]));
      hub.finish({ standings: [ids], scores, won: !!won && !state?.modified, stats });
    },
  });
  const endSession = controller.close.bind(controller);
  controller.limitMs = info.limitMs;
  Object.defineProperty(controller, 'countdown', { get: () => Math.max(0, info.limitMs - Math.max(0, hub.time())) });
  const off = [];
  off.push(hub.on('start', () => controller.start()));
  off.push(hub.on('message', (data, from) => { if (active) controller.receive(data, String(from), from === info.host); }));
  off.push(hub.on('leave', ({ id, reason }) => {
    if (!active) return;
    participants = participants.filter((p) => p.id !== id);
    if (id === info.host) { active = false; endSession('host-left'); } else { controller.leave(id); onStatus('player-left', reason); }
  }));
  off.push(hub.on('time-up', () => { controller.timeUp(); onStatus('time-up'); }));
  off.push(hub.on('end', ({ reason }) => { active = false; endSession(reason); for (const remove of off) remove(); }));
  controller.closeSession = endSession;
  // The Hub owns departure/end; game menu Quit cannot end a scored session.
  controller.close = () => {};
  onStatus('waiting', info.server ? 'Authority ready; waiting for the Hub clock.' : 'Waiting for the Hub clock.');
  hub.ready();
  return controller;
}

/** Manual offer/answer signaling. No account, broker, camera or microphone. */
export function createPeerLobby({ role, onStatus = nop, onReady = nop, onState = nop, onEnd = nop, iceServers = [], timeoutMs = 90000 } = {}) {
  if (globalThis.AIHub?.active) throw new Error('The Hub owns networking during a session.');
  if (!['host', 'guest'].includes(role)) throw new Error('Choose Host or Join.');
  if (typeof RTCPeerConnection !== 'function') throw new Error('This browser does not support WebRTC data channels.');
  const pc = new RTCPeerConnection({ iceServers });
  const epoch = token();
  let canceled = false;
  let channel;
  let controller = null;
  let expedition = null;
  let welcomed = false;
  let timeout;
  const update = (state, detail) => { if (!canceled) onStatus(state, detail); };
  const send = (value) => {
    if (canceled || channel?.readyState !== 'open' || channel.bufferedAmount > 512000) return false;
    channel.send(JSON.stringify(value)); return true;
  };
  const fail = (message) => {
    if (canceled) return;
    update('error', message); const hadController = !!controller; clean(false, message); if (!hadController) onEnd({ reason: message, state: null });
  };
  const clean = (notify = true, reason = 'closed') => {
    if (canceled) return;
    if (notify && channel?.readyState === 'open') send({ t: 'bye', v: NET_VERSION, epoch });
    canceled = true; clearTimeout(timeout);
    controller?.close(reason);
    if (channel) { channel.onopen = channel.onmessage = channel.onclose = channel.onerror = null; channel.close(); }
    pc.ondatachannel = pc.onconnectionstatechange = null; pc.close();
  };
  const setController = (isHost, eid) => {
    expedition = eid;
    controller = networkController({ mode: 'webrtc', localId: isHost ? 'host' : 'guest', authority: isHost,
      players: [{ id: 'host', name: 'Lantern bearer' }, { id: 'guest', name: 'Rune keeper' }], seed: 14383, expedition,
      sendPacket: send, onStatus: update, onEnd, onState(state, result) {
        onState(state, result);
        if (!isHost && state && !welcomed) { welcomed = true; clearTimeout(timeout); update('connected', 'The shared expedition is ready.'); onReady(controller); }
      },
    });
    if (isHost) {
      welcomed = true; clearTimeout(timeout); update('connected', 'The shared expedition is ready.'); onReady(controller);
    }
  };
  const attach = (dc) => {
    if (channel || dc.label !== 'tarmin-reliable' || dc.ordered !== true) { dc.close(); return; }
    channel = dc;
    dc.onopen = () => { update('handshake', 'Checking expedition versions…'); send({ t: 'hello', v: NET_VERSION, role, epoch }); };
    dc.onmessage = ({ data }) => {
      if (canceled || typeof data !== 'string' || data.length > 20000) return;
      let p; try { p = JSON.parse(data); } catch { return; }
      if (!p || p.v !== NET_VERSION) { fail('The other copy uses an incompatible game protocol.'); return; }
      if (p.t === 'hello') {
        if (p.role === role || typeof p.epoch !== 'string') { fail('Connect one Host to one Join copy.'); return; }
        if (role === 'host' && !controller) { const eid = `rtc-${token()}`; send({ t: 'welcome', v: NET_VERSION, e: eid }); setController(true, eid); }
        return;
      }
      if (p.t === 'welcome' && role === 'guest' && !controller && typeof p.e === 'string' && p.e.length < 120) { setController(false, p.e); return; }
      if (p.t === 'bye') {
        if (role === 'host' && controller) { controller.leave('guest'); update('player-left', 'Your ally departed. Continue alone.'); }
        else fail('The host ended this expedition.');
        return;
      }
      controller?.receive(p, role === 'host' ? 'guest' : 'host', role === 'guest');
    };
    dc.onerror = () => { if (!welcomed) fail('The data channel could not open. Retry the connection codes.'); };
    dc.onclose = () => {
      if (canceled) return;
      if (role === 'host' && controller) { controller.leave('guest'); update('player-left', 'Connection lost. Continue alone.'); }
      else fail('Connection to the host was lost. This expedition has ended.');
    };
  };
  if (role === 'host') attach(pc.createDataChannel('tarmin-reliable', { ordered: true }));
  else pc.ondatachannel = ({ channel: dc }) => attach(dc);
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') fail('Direct connection failed. Check both codes or try a local network. Some networks need a TURN relay.');
    else if (pc.connectionState === 'connecting') update('connecting', 'Opening the direct data channel…');
  };
  const gather = async () => {
    if (pc.iceGatheringState === 'complete') return;
    await new Promise((resolve, reject) => {
      const wait = setTimeout(() => { pc.removeEventListener('icegatheringstatechange', changed); reject(new Error('Candidate gathering timed out. Cancel and retry.')); }, 20000);
      const changed = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(wait); pc.removeEventListener('icegatheringstatechange', changed); resolve(); } };
      pc.addEventListener('icegatheringstatechange', changed); changed();
    });
    if (canceled) throw new Error('Connection canceled.');
  };
  const lobby = {
    role, get controller() { return controller; }, get connectionState() { return pc.connectionState; },
    async makeOffer() {
      if (role !== 'host' || canceled) throw new Error('Create an offer from a fresh Host screen.');
      update('gathering', 'Gathering direct connection addresses…');
      await pc.setLocalDescription(await pc.createOffer()); await gather();
      update('offer-ready', 'Send this offer to your ally, then paste their answer.'); return encodeInvite(pc.localDescription);
    },
    async acceptOffer(text) {
      if (role !== 'guest' || canceled) throw new Error('Paste the offer in a fresh Join screen.');
      const offer = decodeInvite(text, 'offer'); update('gathering', 'Creating your answer…');
      await pc.setRemoteDescription(offer); await pc.setLocalDescription(await pc.createAnswer()); await gather();
      update('answer-ready', 'Send this answer to the host. Keep both windows open.'); return encodeInvite(pc.localDescription);
    },
    async acceptAnswer(text) {
      if (role !== 'host' || canceled || pc.signalingState !== 'have-local-offer') throw new Error('Create a Host offer before importing an answer.');
      const answer = decodeInvite(text, 'answer'); await pc.setRemoteDescription(answer); update('connecting', 'Opening the direct data channel…');
    },
    cancel() { update('canceled', 'Connection canceled.'); clean(); },
    diagnostics() { return { role, canceled, welcomed, connectionState: pc.connectionState, signalingState: pc.signalingState, channelState: channel?.readyState, epoch, expedition, ...(controller?.diagnostics() ?? {}) }; },
  };
  timeout = setTimeout(() => fail('Connection timed out. Cancel, create fresh codes, and retry. Direct internet reachability depends on your networks.'), Math.max(1000, timeoutMs));
  update('setup', role === 'host' ? 'Create an offer for your ally.' : 'Paste the host’s offer.');
  return lobby;
}
