/* Shared-world transport. The host alone simulates; clients send controls. */
export function createNetwork(callbacks = {}) {
  const cb = { onInput() {}, onSnapshot() {}, onRole() {}, onStart() {}, onStatus() {}, onTimeUp() {}, onEnd() {}, onLeave() {}, ...callbacks };
  const sdk = globalThis.AIHub;
  const uid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  let mode = sdk?.active ? 'hub' : 'solo';
  let host = true, connected = false, ended = false, started = false, me = 0, server = false;
  let players = [{ id: 0, name: 'Frost One', color: '#f6b54b' }];
  let channel = null, pc = null, dc = null, room = '', peer = null, heartbeat = null, startTimer = null;
  let lastInputAt = -Infinity, lastSnapshotAt = -Infinity, inputSeq = 0, snapshotSeq = 0;
  let lastRemoteSnapshot = -1, lastScore = 0, finished = false, pendingInput = null;
  const remoteInputs = new Map();
  const remoteForces = new Map();
  const detach = [];
  const now = () => performance.now();
  const role = () => mode === 'solo' ? 'solo' : host ? 'host' : 'guest';
  const reportRole = () => cb.onRole({ isHost: host, role: role(), me, server, players: players.slice(), transport: mode });
  const status = text => cb.onStatus(text);
  function send(data, reliable = true, to) {
    if (ended) return false;
    if (mode === 'hub') return !!sdk?.send(data, { reliable, ...(to !== undefined ? { to } : {}) });
    if (mode === 'local' && channel) { channel.postMessage({ ...data, from: uid }); return true; }
    if (mode === 'peer' && dc?.readyState === 'open') { dc.send(JSON.stringify(data)); return true; }
    return false;
  }
  function startLocal(detail = {}) {
    if (started || ended) return;
    started = true;
    cb.onStart({ hub: mode === 'hub', me, server, ...detail });
  }
  function receive(data, from) {
    if (!data || (ended && data.kind !== 'restart')) return;
    if (data.kind === 'restart' && !host) {
      if (mode === 'hub' || (mode === 'peer' && from !== 0)) return;
      ended = finished = started = false; pendingInput = null;
      startLocal({ restart: true });
    } else if (data.kind === 'input' && host) {
      const id = mode === 'hub' ? from : 1;
      if (!players.some(p => p.id === id)) return;
      const prev = remoteInputs.get(id) ?? -1;
      if (Number(data.seq) <= prev && !data.input?.force) return;
      if (data.input?.force) {
        if (Number(data.seq) <= (remoteForces.get(id) ?? -1)) return;
        remoteForces.set(id, Number(data.seq));
      }
      remoteInputs.set(id, Math.max(prev, Number(data.seq)));
      cb.onInput(data.input || {}, id);
    } else if (data.kind === 'snapshot' && !host) {
      if (mode === 'hub' && from !== sdk.host) return;
      if (Number(data.seq) <= lastRemoteSnapshot) return;
      lastRemoteSnapshot = Number(data.seq);
      cb.onSnapshot(data.state);
    } else if (data.kind === 'start' && !host) {
      startLocal();
    } else if (data.kind === 'finish' && !host) {
      cb.onEnd({ reason: 'finished', won: !!data.won, score: Number(data.score) || 0 });
      ended = true;
    }
  }
  function closeTransport() {
    if (heartbeat) clearInterval(heartbeat);
    if (startTimer) clearTimeout(startTimer);
    heartbeat = startTimer = null;
    if (channel) { channel.postMessage({ kind: 'left', from: uid }); channel.close(); channel = null; }
    if (dc) { dc.close(); dc = null; }
    if (pc) { pc.close(); pc = null; }
    peer = null;
    connected = false;
  }
  function standaloneReset(asHost, transport) {
    if (sdk?.active) throw new Error('AI Hub owns the session transport.');
    closeTransport();
    mode = transport; host = asHost; me = asHost ? 0 : 1; server = false;
    ended = started = finished = false; pendingInput = null;
    players = [{ id: 0, name: 'Frost One', color: '#f6b54b' }, { id: 1, name: 'Frost Two', color: '#65cfe0' }];
    lastInputAt = lastSnapshotAt = -Infinity;
    inputSeq = snapshotSeq = 0; lastRemoteSnapshot = -1;
    remoteInputs.clear(); remoteForces.clear();
    reportRole();
  }
  function openRoom(code, asHost) {
    standaloneReset(asHost, 'local');
    room = String(code || 'HOTH').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20) || 'HOTH';
    if (!globalThis.BroadcastChannel) { status('This browser cannot link local tabs. Use a peer link.'); return room; }
    channel = new BroadcastChannel(`bites-frost-v1-${room}`);
    channel.onmessage = ({ data }) => {
      if (!data || data.from === uid || (data.to && data.to !== uid)) return;
      if (host && data.kind === 'hello') {
        if (peer && peer !== data.from) { send({ kind: 'full', to: data.from }); return; }
        peer = data.from; connected = true;
        send({ kind: 'welcome', to: peer, started });
        status(`Frost Two linked · ${room}`); reportRole();
      } else if (!host && data.kind === 'welcome') {
        peer = data.from; connected = true;
        status(`Frost One linked · ${room}`); reportRole();
        if (data.started) startLocal();
      } else if (!host && data.kind === 'full') {
        status('That room already has two pilots. Choose another room.');
      } else if (data.kind === 'left' && data.from === peer) {
        connected = false; peer = null;
        cb.onLeave({ id: host ? 1 : 0, reason: 'disconnected' });
        status(host ? 'Wingmate disconnected. You can keep flying.' : 'Host disconnected. Return to the flight menu.');
        reportRole();
      } else if (data.from === peer) receive(data, host ? 1 : 0);
    };
    heartbeat = setInterval(() => { if (!host && !connected) send({ kind: 'hello' }); }, 700);
    if (!asHost) send({ kind: 'hello' });
    status(asHost ? `Room ${room} open · waiting for Frost Two` : `Calling room ${room}…`);
    return room;
  }
  function wireDataChannel(next) {
    dc = next;
    dc.onmessage = event => { try { receive(JSON.parse(event.data), host ? 1 : 0); } catch {} };
    dc.onopen = () => { connected = true; reportRole(); status('Peer link established. Both pilots ready.'); if (host && started) send({ kind: 'start' }); };
    dc.onclose = () => { if (!ended) { connected = false; cb.onLeave({ id: host ? 1 : 0, reason: 'disconnected' }); status('Peer link disconnected.'); reportRole(); } };
  }
  function createPeer(asHost) {
    standaloneReset(asHost, 'peer');
    if (!globalThis.RTCPeerConnection) throw new Error('WebRTC is unavailable in this browser.');
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.ondatachannel = event => wireDataChannel(event.channel);
    pc.onconnectionstatechange = () => { if (pc?.connectionState === 'failed') status('Peer connection failed. Try a new link or local-tab room.'); };
    if (asHost) wireDataChannel(pc.createDataChannel('frost', { ordered: true }));
    return pc;
  }
  async function gathered(connection) {
    if (connection.iceGatheringState === 'complete') return;
    await new Promise(resolve => {
      const timer = setTimeout(done, 5000);
      function done() { clearTimeout(timer); connection.removeEventListener('icegatheringstatechange', changed); resolve(); }
      function changed() { if (connection.iceGatheringState === 'complete') done(); }
      connection.addEventListener('icegatheringstatechange', changed);
    });
  }
  function encodeDescription(d) { return btoa(JSON.stringify({ type: d.type, sdp: d.sdp })); }
  function decodeDescription(text) {
    const d = JSON.parse(atob(String(text).trim()));
    if (!['offer', 'answer'].includes(d.type) || typeof d.sdp !== 'string') throw new Error('That is not a Frost peer link.');
    return d;
  }
  async function connect() {
    if (!sdk?.active) { reportRole(); return null; }
    detach.push(sdk.on('message', receive));
    detach.push(sdk.on('start', () => {
      const waitForClock = () => {
        if (ended) return;
        const left = -sdk.time();
        if (left > 0) startTimer = setTimeout(waitForClock, Math.min(50, left + 1));
        else startLocal();
      };
      waitForClock();
    }));
    detach.push(sdk.on('time-up', detail => {
      cb.onTimeUp(detail);
      // Guarantee the hub receives the team's result even if a caller has no custom time-up handler.
      if (host && !finished) finish(false, lastScore);
    }));
    detach.push(sdk.on('leave', detail => {
      players = sdk.players.slice();
      cb.onLeave(detail); reportRole();
    }));
    detach.push(sdk.on('end', detail => {
      ended = true; started = false; connected = false;
      if (startTimer) clearTimeout(startTimer);
      cb.onEnd(detail);
    }));
    const info = await sdk.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) { mode = 'solo'; reportRole(); return null; }
    mode = 'hub'; host = info.isHost; server = info.server === true;
    me = info.me; players = info.players.slice(); connected = true;
    reportRole(); status(server ? 'AI Hub authority · dedicated host' : `AI Hub · ${host ? 'host pilot' : 'wingmate'}`);
    return info;
  }
  function finish(won, score = lastScore) {
    if (!host || finished || ended) return;
    finished = true; lastScore = Number(score) || 0;
    if (mode === 'hub') {
      const ids = players.map(p => p.id);
      sdk.finish({ standings: [ids], scores: Object.fromEntries(ids.map(id => [id, lastScore])), won: !!won });
    } else if (mode !== 'solo') send({ kind: 'finish', won: !!won, score: lastScore });
  }
  return {
    connect,
    ready() { if (mode === 'hub') sdk.ready(); },
    start() { if (mode === 'hub' || !host) return; if (mode !== 'solo') send({ kind: 'start' }); startLocal(); },
    restart() {
      if (mode === 'hub' || !host || ended) return false;
      finished = started = false; pendingInput = null;
      if (mode !== 'solo') send({ kind: 'restart' });
      startLocal({ restart: true }); return true;
    },
    host(code) { return openRoom(code, true); },
    join(code) { return openRoom(code, false); },
    solo() { if (sdk?.active) return; closeTransport(); mode = 'solo'; host = true; me = 0; ended = started = finished = false; players = [{ id: 0, name: 'Frost One', color: '#f6b54b' }]; reportRole(); },
    async createOffer() { const p = createPeer(true); await p.setLocalDescription(await p.createOffer()); await gathered(p); status('Send this offer to your wingmate. Paste their answer to complete the link.'); return encodeDescription(p.localDescription); },
    async answerOffer(code) { const p = createPeer(false); await p.setRemoteDescription(decodeDescription(code)); await p.setLocalDescription(await p.createAnswer()); await gathered(p); status('Send this answer to the host.'); return encodeDescription(p.localDescription); },
    async acceptAnswer(code) { if (!pc || !host) throw new Error('Create a host offer first.'); await pc.setRemoteDescription(decodeDescription(code)); status('Opening peer link…'); },
    sendInput(input) {
      if (host || ended || !connected) return false;
      // Keep a one-frame ability press until the next transmission slot.
      pendingInput = { ...input, force: !!input.force || !!pendingInput?.force };
      if (now() - lastInputAt < 66.7) return false;
      lastInputAt = now();
      const outgoing = pendingInput; pendingInput = null;
      return send({ kind: 'input', seq: ++inputSeq, input: outgoing }, !!outgoing.force, mode === 'hub' ? sdk.host : undefined);
    },
    sendSnapshot(state, force = false) {
      if (!host || ended || !connected || (!force && now() - lastSnapshotAt < 66.7)) return false;
      lastSnapshotAt = now();
      if (Number.isFinite(state?.score)) lastScore = state.score;
      // Reliable snapshots may exceed one MTU; the 16 KiB hub cap still applies.
      return send({ kind: 'snapshot', seq: ++snapshotSeq, state }, true);
    },
    finish,
    inspect() { return { transport: mode, role: role(), isHost: host, me, server, connected, started, ended, players: players.slice(), room }; },
    fail(message) { if (mode === 'hub') sdk.fail(message); },
    close() { closeTransport(); for (const fn of detach.splice(0)) fn(); ended = true; },
    get isHost() { return host; }, get connected() { return connected; }, get role() { return role(); },
    get hub() { return mode === 'hub'; }, get server() { return server; }, get me() { return me; },
    get players() { return players.slice(); }, get room() { return room; }, get started() { return started; }, get ended() { return ended; },
    get transport() { return mode; },
  };
}
