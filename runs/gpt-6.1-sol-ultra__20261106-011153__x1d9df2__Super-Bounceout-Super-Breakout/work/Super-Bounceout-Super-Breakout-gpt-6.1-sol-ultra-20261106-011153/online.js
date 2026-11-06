/* Super Bounceout network adapter. AI Hub sessions use only the supplied hub client.
   Standalone uses same-origin BroadcastChannel or PeerJS/WebRTC across devices. */
let peerLoader;
function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (!peerLoader) peerLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
    script.onload = () => window.Peer ? resolve(window.Peer) : reject(new Error('Connection library unavailable'));
    script.onerror = () => reject(new Error('Connection service unavailable. Same-device rooms still work.'));
    document.head.appendChild(script);
  }).catch(error => { peerLoader = null; throw error; });
  return peerLoader;
}
function randomCode() {
  const values = crypto.getRandomValues(new Uint8Array(6));
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(values, n => letters[n % letters.length]).join('');
}
export function createOnline(callbacks = {}) {
  const hub = window.AIHub;
  const tabId = crypto.randomUUID?.() || String(Math.random()).slice(2);
  let role = 'solo', connected = false, roomCode = '', info = null, started = false, ended = false;
  let peer = null, connection = null, channel = null, transport = '', remoteId = '', generation = 0;
  let pulse = null, retry = null, remoteSeen = 0, joiningAt = 0, lastInput = -Infinity, lastState = -Infinity, score = 0, reported = false;
  let seatMap = [], hubInitialized = false, pendingInput = {};
  const call = (name, ...args) => { if (typeof callbacks[name] === 'function') callbacks[name](...args); };
  const isHub = () => !!hub?.active;
  const setRole = next => { role = next; call('onRole', role, api.info); };
  const status = message => call('onStatus', message);
  function announceStart() {
    if (started || ended) return;
    started = true;
    call('onStart', api.info);
  }
  function closeTransport() {
    generation++;
    clearInterval(pulse); pulse = null;
    clearTimeout(retry); retry = null;
    if (channel) { channel.onmessage = null; channel.close(); channel = null; }
    if (connection) { const old = connection; connection = null; try { old.close(); } catch {} }
    if (peer) { const old = peer; peer = null; try { old.destroy(); } catch {} }
    transport = ''; remoteId = '';
  }
  function losePartner(message) {
    if (!connected) return;
    connected = false;
    status(message);
    call('onLeave', role === 'host' ? 1 : 0);
    if (role === 'guest') { ended = true; call('onEnd', 'host-left'); }
  }
  function post(message) {
    if (ended) return false;
    if (isHub()) return hub.send(message, { to: role === 'guest' ? hub.host : undefined, reliable: message.kind !== 'input' });
    if (!connected && !['hello', 'welcome', 'ping', 'pong'].includes(message.kind)) return false;
    if (transport === 'peer' && connection?.open) {
      try { connection.send(message); return true; } catch { return false; }
    }
    if (channel) { channel.postMessage({ ...message, sender: tabId, target: remoteId || undefined }); return true; }
    return false;
  }
  function accept(kind) {
    if (connected || ended) return;
    transport = kind;
    connected = true;
    remoteSeen = performance.now();
    status(kind === 'peer' ? 'Partner connected • online co-op' : 'Partner connected • same-device co-op');
    announceStart();
  }
  function receive(message, source = 'peer', sender) {
    if (!message || typeof message !== 'object' || ended) return;
    if (message.sender === tabId || (message.target && message.target !== tabId)) return;
    if (message.kind === 'hello' && role === 'host') {
      if (connected && transport !== source) return;
      if (remoteId && sender && remoteId !== sender) return;
      remoteId = sender || remoteId;
      post({ kind: 'welcome', version: 1 });
      accept(source);
      return;
    }
    if (message.kind === 'welcome' && role === 'guest') {
      if (remoteId && sender && remoteId !== sender) return;
      remoteId = sender || remoteId;
      accept(source);
      return;
    }
    if (!connected || (transport !== source && !isHub())) return;
    if (remoteId && sender && sender !== remoteId && !isHub()) return;
    remoteSeen = performance.now();
    if (message.kind === 'ping') post({ kind: 'pong' });
    else if (message.kind === 'input' && role === 'host') {
      const seat = isHub() ? seatMap.indexOf(sender) : 1;
      if (seat >= 0 && seat <= 1) call('onInput', message.input, seat);
    } else if (message.kind === 'state' && role === 'guest') call('onState', message.state);
    else if (message.kind === 'leave') losePartner(role === 'host' ? 'Partner left • continue solo' : 'Host left the room');
  }
  function openBroadcast() {
    if (!('BroadcastChannel' in window)) return;
    try {
      channel = new BroadcastChannel('super-bounceout-v1-' + roomCode);
      channel.onmessage = event => receive(event.data, 'broadcast', event.data?.sender);
    } catch {}
  }
  function beginPulse() {
    joiningAt = performance.now();
    pulse = setInterval(() => {
      if (ended) return;
      if (connected) {
        if (performance.now() - remoteSeen > 12000) losePartner(role === 'host' ? 'Partner disconnected • continue solo' : 'Connection to host lost');
        else post({ kind: 'ping' });
      } else if (role === 'guest') {
        post({ kind: 'hello', version: 1 });
        if (performance.now() - joiningAt > 25000) status('Room not reached. Check the code and host connection, then try again.');
      }
    }, 800);
  }
  function bindConnection(dataConnection, token) {
    if (token !== generation) { dataConnection.close(); return; }
    if (connection && connection !== dataConnection) { dataConnection.close(); return; }
    connection = dataConnection;
    dataConnection.on('open', () => {
      if (token !== generation || (connected && transport === 'broadcast')) { dataConnection.close(); return; }
      transport = 'peer';
      if (role === 'guest') dataConnection.send({ kind: 'hello', version: 1 });
    });
    dataConnection.on('data', message => receive(message, 'peer'));
    dataConnection.on('close', () => { if (connection === dataConnection) { connection = null; if (transport === 'peer') losePartner('Partner disconnected'); } });
    dataConnection.on('error', error => { if (token === generation && !connected) status('Connection failed: ' + (error.message || 'try the room again')); });
  }
  async function openPeer(token) {
    try {
      const Peer = await loadPeer();
      if (token !== generation || (connected && transport === 'broadcast')) return;
      const id = role === 'host' ? 'super-bounceout-v1-' + roomCode : undefined;
      peer = new Peer(id, { debug: 0 });
      peer.on('open', () => {
        if (token !== generation) return;
        if (role === 'host' && !connected) status('Room ' + roomCode + ' • ready for a partner');
        else if (!connected) bindConnection(peer.connect('super-bounceout-v1-' + roomCode, { reliable: true, serialization: 'json' }), token);
      });
      peer.on('connection', conn => {
        if (role !== 'host' || connected || connection) conn.close();
        else bindConnection(conn, token);
      });
      peer.on('error', error => {
        if (token !== generation || connected) return;
        if (role === 'guest' && error.type === 'peer-unavailable' && performance.now() - joiningAt < 20000) {
          if (connection) { try { connection.close(); } catch {} connection = null; }
          retry = setTimeout(() => {
            if (token === generation && !connected && peer && !peer.destroyed) bindConnection(peer.connect('super-bounceout-v1-' + roomCode, { reliable: true, serialization: 'json' }), token);
          }, 1400);
        } else status(error.type === 'unavailable-id' ? 'Room code is in use. Create another room.' : 'Online relay unavailable • same-device rooms still work.');
      });
      peer.on('disconnected', () => { if (token === generation && !connected) status('Room service disconnected • create or join again.'); });
    } catch (error) { if (token === generation && !connected) status(error.message); }
  }
  const api = {
    get role() { return role; },
    get connected() { return connected; },
    get roomCode() { return roomCode; },
    get isHub() { return isHub(); },
    get active() { return role !== 'solo'; },
    get started() { return started; },
    get ended() { return ended; },
    get server() { return !!(isHub() && hub.server); },
    get mySeat() { return isHub() ? seatMap.indexOf(hub.me) : role === 'guest' ? 1 : 0; },
    get players() { return isHub() ? hub.players : [{ id: 0, name: 'P1', color: '#f5b700' }, { id: 1, name: 'P2', color: '#39d9d2' }]; },
    get info() { return info || { isHost: role === 'host', me: role === 'guest' ? 1 : 0, host: 0, players: api.players, server: false }; },
    async init() {
      if (!isHub() || hubInitialized) return info;
      hubInitialized = true;
      hub.on('start', () => { connected = true; announceStart(); });
      hub.on('message', (data, from) => {
        if (role === 'guest' && from !== hub.host) return;
        receive(data, 'hub', from);
      });
      hub.on('leave', ({ id }) => { const seat = seatMap.indexOf(id); call('onLeave', seat); status('A partner left the round'); });
      hub.on('time-up', () => { call('onTimeUp'); api.finish(score, false); });
      hub.on('end', ({ reason }) => { ended = true; connected = false; call('onEnd', reason); });
      info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
      if (!info) { hubInitialized = false; return null; }
      seatMap = info.players.map(player => player.id);
      connected = true;
      setRole(info.isHost ? 'host' : 'guest');
      status('AI Hub • waiting for the round');
      return info;
    },
    ready() { if (isHub()) hub.ready(); },
    host() {
      if (isHub()) return '';
      api.leave(); ended = false; started = false; reported = false;
      roomCode = randomCode(); setRole('host'); openBroadcast(); beginPulse();
      status('Room ' + roomCode + ' • opening online connection…');
      openPeer(generation);
      return roomCode;
    },
    join(code) {
      if (isHub()) return false;
      const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!/^[A-Z0-9]{6}$/.test(clean)) { status('Enter the six-character room code.'); return false; }
      api.leave(); ended = false; started = false; reported = false;
      roomCode = clean; setRole('guest'); openBroadcast(); beginPulse();
      status('Connecting to room ' + roomCode + '…');
      post({ kind: 'hello', version: 1 });
      const token = generation;
      retry = setTimeout(() => { if (token === generation && !connected) openPeer(token); }, 900);
      return true;
    },
    leave() {
      if (isHub()) return false;
      if (connected) post({ kind: 'leave' });
      closeTransport(); connected = false; started = false; ended = false; roomCode = ''; info = null; pendingInput = {}; lastInput = -Infinity; lastState = -Infinity;
      setRole('solo'); return true;
    },
    sendInput(input) {
      if (role !== 'guest' || !connected || ended || !started) return false;
      pendingInput = { ...pendingInput, ...input, serve: !!(pendingInput.serve || input?.serve), burst: !!(pendingInput.burst || input?.burst) };
      const now = performance.now(); if (now - lastInput < 67) return false;
      const sent = post({ kind: 'input', input: pendingInput });
      if (sent) { lastInput = now; pendingInput = {}; }
      return sent;
    },
    sendState(state) {
      if (role !== 'host' || !connected || ended || !started) return false;
      const now = performance.now(); if (now - lastState < 67) return false; lastState = now;
      if (Number.isFinite(state?.score)) score = state.score;
      return post({ kind: 'state', state });
    },
    time() { return isHub() ? hub.time() : started ? 0 : -Infinity; },
    finish(teamScore = score, won = false) {
      if (!isHub() || role !== 'host' || ended || reported) return;
      reported = true;
      const ids = hub.players.map(player => player.id);
      const scores = Object.fromEntries(ids.map(id => [id, Number(teamScore) || 0]));
      hub.finish({ standings: [ids], scores, won: !!won });
    }
  };
  window.addEventListener('beforeunload', () => { if (!isHub() && connected) post({ kind: 'leave' }); closeTransport(); });
  return api;
}
