/* Multiplayer adapter for AI Hub Session Protocol v1 and standalone co-op.
 * AI Hub's unmodified vendor/session.js MUST be the first script in <head>.
 * Standalone: same-origin tabs use BroadcastChannel; other devices use
 * PeerJS 1.5.5's public signaling service and a reliable WebRTC data channel.
 * No external network transport is created while AIHub.active is true.
 */
export function createNetwork(callbacks = {}) {
  const notify = (key, ...args) => callbacks[key]?.(...args);
  const hub = globalThis.AIHub;
  const active = !!hub?.active;
  const token = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const prefix = 'lost-hieroglyph-v1-';
  let hosting = false, room = '', linked = false, begun = false, ended = false;
  let peers = [], mySeat = 0, noPlayer = false, hubConnected = false;
  let peer = null, connection = null, channel = null, peerToken = '', mode = '';
  let generation = 0, heartbeat = null, retry = null, lastSeen = 0;
  let seq = 0, lastState = -1, startTimer = null, finished = false;
  const status = text => notify('onStatus', text);
  const peerEvent = (id, connected) => notify('onPeer', {id, connected, name: id === 0 ? 'Dr. Vale' : 'Rafi'});
  const envelope = (kind, data) => ({game:'lost-hieroglyph', kind, data, seq:++seq, from:token});
  const hubOffs = [];

  function receive(message, from) {
    if (!message || message.game !== 'lost-hieroglyph' || ended) return;
    lastSeen = performance.now();
    if (message.kind === 'state' && !hosting) {
      if ((message.seq ?? 0) < lastState) return;
      lastState = message.seq ?? 0;
      notify('onState', message.data, from);
    } else if (message.kind === 'input' && hosting) {
      notify('onInput', message.data, from ?? 1);
    } else if (message.kind === 'depart') {
      linked = false;
      peerEvent(hosting ? 1 : 0, false);
      status(hosting ? `Room ${room} · partner left` : 'The expedition leader disconnected.');
    }
  }

  function transmit(kind, data) {
    if (ended) return false;
    const message = envelope(kind, data);
    if (active) {
      if (!hubConnected) return false;
      return hub.send(message, hosting ? {reliable:true} : {to:hub.host,reliable:true});
    }
    if (!linked && kind !== 'depart') return false;
    if (mode === 'local') { channel?.postMessage(message); return true; }
    if (connection?.open) { connection.send(message); return true; }
    return false;
  }

  function markLinked(transport) {
    if (linked) return;
    linked = true;
    mode = transport;
    lastSeen = performance.now();
    clearInterval(retry); retry = null;
    peerEvent(hosting ? 1 : 0, true);
    status(`${transport === 'local' ? 'Local' : 'Online'} co-op connected · ${room}`);
  }

  function createLocalChannel() {
    if (!globalThis.BroadcastChannel) return;
    channel = new BroadcastChannel(prefix + room);
    channel.onmessage = event => {
      const m = event.data;
      if (!m || m.from === token || m.game !== 'lost-hieroglyph') return;
      if (hosting && m.kind === 'hello') {
        if ((linked && mode !== 'local') || (peerToken && peerToken !== m.from)) {
          channel.postMessage({...envelope('full',null), to:m.from});
          return;
        }
        peerToken = m.from;
        channel.postMessage({...envelope('welcome',null), to:m.from});
        markLinked('local');
      } else if (!hosting && m.kind === 'welcome' && m.to === token) {
        if (linked && mode !== 'local') return;
        peerToken = m.from;
        markLinked('local');
        // Stop remote signaling after an entirely local connection is made.
        connection?.close(); connection = null;
        peer?.destroy(); peer = null;
      } else if (!hosting && m.kind === 'full' && m.to === token) {
        status('That expedition already has two explorers.');
      } else if (mode === 'local' && m.from === peerToken) receive(m, hosting ? 1 : 0);
    };
  }

  function wireConnection(conn, transportGeneration) {
    conn.on('open', () => {
      if (transportGeneration !== generation || (linked && mode === 'local')) { conn.close(); return; }
      if (hosting && connection?.open && connection !== conn) { conn.send(envelope('full',null)); conn.close(); return; }
      connection = conn;
      markLinked('webrtc');
    });
    conn.on('data', message => {
      if (connection !== conn || transportGeneration !== generation) return;
      if (message?.kind === 'full') { status('That expedition already has two explorers.'); return; }
      receive(message, hosting ? 1 : 0);
    });
    conn.on('close', () => {
      if (connection !== conn || transportGeneration !== generation) return;
      connection = null;
      if (mode !== 'webrtc') return;
      linked = false;
      peerEvent(hosting ? 1 : 0, false);
      status(hosting ? `Room ${room} · partner disconnected` : 'Connection lost. Return to the lobby to reconnect.');
    });
    conn.on('error', () => {
      if (transportGeneration === generation && mode !== 'local') status('Connection interrupted. Check the room code and try again.');
    });
  }

  async function startRemote(transportGeneration) {
    // Import only upon an explicit standalone host/join action, never in AI Hub.
    try {
      const {Peer} = await import('https://esm.sh/peerjs@1.5.5?bundle');
      if (active || transportGeneration !== generation || (linked && mode === 'local')) return;
      peer = hosting ? new Peer(prefix + room) : new Peer();
      peer.on('open', () => {
        if (transportGeneration !== generation) return;
        if (hosting) status(`Online room ${room} · waiting for your partner`);
        else wireConnection(peer.connect(prefix + room, {reliable:true,serialization:'json'}), transportGeneration);
      });
      peer.on('connection', conn => {
        if (hosting) wireConnection(conn, transportGeneration); else conn.close();
      });
      peer.on('error', err => {
        if (transportGeneration !== generation || mode === 'local') return;
        const text = err.type === 'peer-unavailable' ? 'Room not found. Check the code or ask the host to reopen it.' :
          err.type === 'unavailable-id' ? 'Room code already in use. Host a new expedition.' :
          `Online service unavailable. Same-device co-op remains available with code ${room}.`;
        status(text);
      });
    } catch {
      if (transportGeneration === generation && !linked) status(`Online service unavailable. Same-device co-op remains available with code ${room}.`);
    }
  }

  function startHeartbeat() {
    clearInterval(heartbeat);
    heartbeat = setInterval(() => {
      if (!linked) return;
      transmit('ping', null);
      if (performance.now() - lastSeen > 15000) {
        linked = false;
        peerToken = '';
        peerEvent(hosting ? 1 : 0, false);
        status(hosting ? `Room ${room} · partner disconnected` : 'The expedition leader disconnected.');
      }
    }, 2000);
  }

  function resetStandalone() {
    ++generation;
    clearInterval(heartbeat); clearInterval(retry);
    heartbeat = null; retry = null;
    channel?.close(); channel = null;
    connection?.close(); connection = null;
    peer?.destroy(); peer = null;
    linked = false; peerToken = ''; mode = ''; begun = false; ended = false;
    lastState = -1; finished = false; peers = []; room = '';
  }

  async function connectHub() {
    if (!active) return null;
    if (hubConnected) return hub;
    hubOffs.push(hub.on('start', event => {
      clearTimeout(startTimer);
      const delay = Math.max(0, Number(event.in) || 0);
      notify('onCountdown', delay);
      startTimer = setTimeout(() => { if (!ended) { begun = true; notify('onStart'); } }, delay);
    }));
    hubOffs.push(hub.on('message', (message, from) => {
      if (message?.kind === 'state' && from !== hub.host) return;
      receive(message, from);
    }));
    hubOffs.push(hub.on('leave', event => {
      peers = peers.filter(p => p.id !== event.id);
      peerEvent(event.id, false);
    }));
    hubOffs.push(hub.on('time-up', event => {
      notify('onTimeUp', event);
      // Always submit a valid team result even if the game is still animating.
      if (hosting && !finished) finish({won:false,score:0});
    }));
    hubOffs.push(hub.on('end', event => {
      ended = true; begun = false; linked = false;
      clearTimeout(startTimer);
      notify('onEnd', event);
    }));
    const info = await hub.connect({mode:'shared-world',seats:[1,2]});
    if (!info) return null;
    hosting = !!info.isHost;
    noPlayer = !!info.server;
    mySeat = info.me;
    peers = [...info.players];
    hubConnected = true;
    linked = peers.length > 1 || noPlayer;
    status(`AI Hub expedition · ${info.players.length} explorer${info.players.length === 1 ? '' : 's'}`);
    for (const p of peers) if (p.id !== mySeat) peerEvent(p.id, true);
    return info;
  }

  async function host() {
    if (active) return connectHub();
    resetStandalone();
    hosting = true; mySeat = 0;
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const random = new Uint8Array(6); crypto.getRandomValues(random);
    room = [...random].map(n => alphabet[n % alphabet.length]).join('');
    peers = [{id:0,name:'Dr. Vale'},{id:1,name:'Rafi'}];
    createLocalChannel(); startHeartbeat();
    status(`Room ${room} · opening online expedition`);
    void startRemote(generation);
    return room;
  }

  async function join(code) {
    if (active) return connectHub();
    const cleaned = String(code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
    if (!/^[A-Z0-9]{6}$/.test(cleaned)) { status('Enter the host’s six-character room code.'); return false; }
    resetStandalone(); hosting = false; mySeat = 1; room = cleaned;
    peers = [{id:0,name:'Dr. Vale'},{id:1,name:'Rafi'}];
    createLocalChannel(); startHeartbeat();
    const hello = () => channel?.postMessage(envelope('hello',null));
    hello(); retry = setInterval(hello,700);
    const current = generation;
    setTimeout(() => { if (generation === current && !linked) void startRemote(current); },350);
    status(`Joining expedition ${room}…`);
    return true;
  }

  function leave() {
    if (active) return false; // The hub owns leaving, restarts and the round.
    if (linked) transmit('depart',null);
    resetStandalone(); hosting = false; mySeat = 0;
    status('Solo expedition');
    return true;
  }

  function finish({won = true, score = 0, stats} = {}) {
    if (!active || !hosting || finished || ended || !hubConnected) return false;
    finished = true;
    const ids = peers.map(p => p.id);
    hub.finish({standings:[ids],scores:Object.fromEntries(ids.map(id => [id,Number(score)||0])),won:!!won,...(stats ? {stats} : {})});
    return true;
  }

  return {
    host, join, leave, connectHub, finish,
    ready() { if (active && hubConnected) hub.ready(); },
    sendState(data) { return hosting && transmit('state',data); },
    sendInput(data) { return !hosting && transmit('input',data); },
    update() {},
    get active() { return active; },
    get isHost() { return hosting; },
    get connected() { return linked; },
    get peerCount() { return active ? peers.filter(p => p.id !== mySeat).length : linked ? 1 : 0; },
    get code() { return room; },
    get me() { return mySeat; },
    get players() { return peers; },
    get server() { return noPlayer; },
    get started() { return begun; },
    get ended() { return ended; },
    get transport() { return active ? 'hub' : mode || 'none'; },
  };
}
