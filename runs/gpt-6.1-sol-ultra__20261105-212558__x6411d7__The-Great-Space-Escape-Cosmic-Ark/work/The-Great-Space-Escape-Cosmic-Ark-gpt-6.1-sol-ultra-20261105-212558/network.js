/* AI Hub shared-world adapter. Standalone co-op is handled by the same simulation locally. */
export async function createNetwork(callbacks = {}) {
  const hub = globalThis.AIHub;
  const listeners = [];
  let readyCalled = false;
  let startReceived = false;
  let started = false;
  let ended = false;
  let reported = false;
  let pendingInput = {};
  let pendingState = null;
  let inputClock = 0;
  let stateClock = 0;
  let inputSeq = 0;
  let stateSeq = 0;
  let lastStateSeq = -1;
  let lastStateAt = 0;
  const inputSequences = new Map();
  const counts = { sentInputs: 0, receivedInputs: 0, sentStates: 0, receivedStates: 0, dropped: 0, oversize: 0, maxBytes: 0 };
  const info = hub ? await hub.connect({ mode: 'shared-world', seats: [1, 4] }) : null;
  const net = {
    active: !!info,
    info,
    isHost: info ? !!info.isHost : true,
    me: info ? info.me : 0,
    players: info ? info.players.slice() : [{ id: 0, name: 'Pilot 1', color: '#f3b05c' }],
    ready() {
      if (!net.active || readyCalled || ended) return;
      readyCalled = true;
      hub.ready();
    },
    sendInput(input) {
      if (!net.active || net.isHost || ended || reported) return;
      pendingInput = plainCopy(input, 2048) || {};
    },
    broadcast(state) {
      if (!net.active || !net.isHost || ended || reported) return;
      pendingState = state;
    },
    finish(score = 0, won = false) {
      if (!net.active || !net.isHost || ended || reported) return;
      reported = true;
      const value = Number.isFinite(Number(score)) ? Number(score) : 0;
      const ids = net.players.map(p => p.id);
      const scores = Object.fromEntries(ids.map(id => [id, value]));
      hub.finish({ standings: [ids], scores, won: !!won });
    },
    tick(dt = 0) {
      if (!net.active || ended || reported) return;
      if (!started && startReceived && hub.time() >= 0) {
        started = true;
        inputClock = 1;
        stateClock = 1;
        callbacks.onStart?.(info);
      }
      if (!started || ended || reported) return;
      const elapsed = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, 1));
      inputClock += elapsed;
      stateClock += elapsed;
      if (!net.isHost && inputClock >= 1 / 15) {
        inputClock %= 1 / 15;
        if (hub.send({ kind: 'input', sequence: inputSeq++, input: pendingInput }, { to: info.host, reliable: false })) counts.sentInputs++;
        else counts.dropped++;
      }
      if (net.isHost && pendingState && stateClock >= 1 / 10) {
        stateClock %= 1 / 10;
        const packet = { kind: 'world', sequence: stateSeq++, state: pendingState };
        let text;
        try { text = JSON.stringify(packet); } catch { text = null; }
        // Leave room below the protocol limit, even when Unicode uses multiple bytes.
        const bytes = text ? new TextEncoder().encode(text).byteLength : Infinity;
        counts.maxBytes = Math.max(counts.maxBytes, Number.isFinite(bytes) ? bytes : 0);
        if (bytes <= 16000) {
          if (hub.send(packet, { reliable: true })) counts.sentStates++;
          else counts.dropped++;
        } else counts.oversize++;
      }
    },
    diagnostics() {
      return { ...counts, active: net.active, host: net.isHost, me: net.me, server: !!info?.server,
        ready: readyCalled, started, ended, reported, players: net.players.map(p => p.id),
        lastStateAge: lastStateAt ? Math.max(0, performance.now() - lastStateAt) : null };
    },
    dispose() {
      ended = true;
      for (const off of listeners) off();
      listeners.length = 0;
      pendingState = null;
      pendingInput = {};
    }
  };
  if (!info) return net;
  listeners.push(hub.on('start', () => { startReceived = true; }));
  listeners.push(hub.on('message', (packet, from) => {
    if (ended || reported || !packet || typeof packet !== 'object') return;
    if (packet.kind === 'input' && net.isHost && net.players.some(p => p.id === from)) {
      if (!Number.isInteger(packet.sequence) || packet.sequence <= (inputSequences.get(from) ?? -1)) return;
      const input = plainCopy(packet.input, 2048);
      if (!input) return;
      inputSequences.set(from, packet.sequence);
      counts.receivedInputs++;
      callbacks.onInput?.(from, input);
    } else if (packet.kind === 'world' && !net.isHost && from === info.host) {
      if (!Number.isInteger(packet.sequence) || packet.sequence <= lastStateSeq || !packet.state || typeof packet.state !== 'object') return;
      lastStateSeq = packet.sequence;
      lastStateAt = performance.now();
      counts.receivedStates++;
      callbacks.onState?.(packet.state);
    }
  }));
  listeners.push(hub.on('leave', data => {
    net.players = net.players.filter(p => p.id !== data.id);
    inputSequences.delete(data.id);
    callbacks.onLeave?.(data);
  }));
  listeners.push(hub.on('time-up', data => {
    if (ended || reported) return;
    if (callbacks.onTimeUp) callbacks.onTimeUp(data);
    else if (net.isHost) net.finish(0, false);
  }));
  listeners.push(hub.on('end', data => {
    if (ended) return;
    ended = true;
    pendingState = null;
    pendingInput = {};
    callbacks.onEnd?.(data);
  }));
  return net;
}

function plainCopy(value, limit) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    const text = JSON.stringify(value);
    if (text.length > limit) return null;
    return JSON.parse(text);
  } catch { return null; }
}
