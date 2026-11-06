// Host-authoritative co-op transport. AI Hub traffic uses only AIHub.send().
export function createNetwork(callbacks = {}) {
  let role = 'offline', status = 'Offline', code = '', peer = null, connection = null;
  let channel = null, roomToken = '', guestToken = '', transport = '', closed = false;
  const members = new Map();
  const inputSequences = new Map();
  const hubSeats = new Map();
  const pendingInput = { jump: false, action: false, up: false, down: false };
  let hub = false, server = false, me = 0, players = [], started = false, ending = false;
  let seq = 0, lastInput = -Infinity, lastState = -Infinity, lastReceived = 0;
  let generation = 0, joinTimer = null, hubTimer = null, pingTimer = null;
  let receivedState = -1;
  const subscriptions = [];
  const clock = () => performance.now();
  const safeCall = (name, ...args) => callbacks[name]?.(...args);
  const announce = text => {
    status = text;
    safeCall('onStatus', { role, status, code, players, me, server, hub, started, transport });
  };
  const random = n => {
    const bytes = crypto.getRandomValues(new Uint8Array(n));
    return [...bytes].map(b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  };
  function sanitizedInput(input) {
    return {
      x: Math.max(-1, Math.min(1, Number(input?.x) || 0)),
      jump: !!input?.jump, duck: !!input?.duck, up: !!input?.up,
      down: !!input?.down, action: !!input?.action,
    };
  }
  function send(data) {
    if (closed || ending) return false;
    if (hub) return AIHub.send(data, role === 'guest' ? { to: AIHub.host, reliable: true } : { reliable: true });
    if (role === 'host') {
      let sent = false;
      if ([...members.values()].some(m => m.transport === 'local') && channel) { channel.postMessage({ token: roomToken, ...data }); sent = true; }
      for (const member of members.values()) if (member.conn?.open) { try { member.conn.send(data); sent = true; } catch {} }
      return sent;
    }
    if (transport === 'local' && channel) {
      channel.postMessage({ token: roomToken, ...data });
      return true;
    }
    if (connection?.open) {
      try { connection.send(data); return true; } catch { return false; }
    }
    return false;
  }
  function receive(data, from) {
    if (closed || ending || !data || typeof data !== 'object') return;
    lastReceived = clock();
    if (data.type === 'welcome' && role === 'guest' && !hub) {
      me = Number(data.seat);
      players = data.players || [];
      announce('Connected · waiting for the host to start');
      safeCall('onPartner', { players });
    } else if (data.type === 'roster' && !hub && role === 'guest') {
      players = data.players || [];
      announce(started ? 'Co-op chase in progress' : 'Partner connected · ready for a co-op chase');
    } else if (data.type === 'input' && role === 'host') {
      const seat = hub ? hubSeats.get(from) : Number(from);
      if (!Number.isInteger(seat) || !Number.isFinite(Number(data.seq)) || Number(data.seq) <= (inputSequences.get(seat) ?? -1)) return;
      inputSequences.set(seat, Number(data.seq));
      if (seat >= 0) safeCall('onInput', sanitizedInput(data.input), seat);
    } else if (data.type === 'state' && role === 'guest') {
      if (hub && from !== AIHub.host) return;
      if (!Number.isFinite(Number(data.seq)) || Number(data.seq) <= receivedState) return;
      receivedState = Number(data.seq);
      safeCall('onState', data.state);
    } else if (data.type === 'start' && role === 'guest' && !hub) {
      started = true;
      announce('Co-op chase in progress');
      safeCall('onStart', { ...data.info, players, me, isHost: false, server: false });
    } else if (data.type === 'finish' && role === 'guest' && !hub) {
      started = false;
      safeCall('onFinish', data.result);
    } else if (data.type === 'bye' && !hub) {
      if (role === 'host') removeMember(Number(from), 'Partner left the room');
      else handleDisconnect('Host left the room');
    } else if (data.type === 'ping' && role === 'host') {
      send({ type: 'pong' });
    }
  }
  function handleDisconnect(text) {
    const wasPlaying = started;
    started = false;
    guestToken = '';
    players = role === 'host' ? [{ id: 0, name: 'Officer 1' }] : [];
    announce(text);
    safeCall('onDisconnect', { wasPlaying, role });
  }
  function roster() {
    players = [{ id: 0, name: 'Officer 1' }, ...[...members.values()].sort((a, b) => a.seat - b.seat).map(m => ({ id: m.seat, name: `Officer ${m.seat + 1}` }))];
    send({ type: 'roster', players });
  }
  function removeMember(seat, message) {
    for (const [token, member] of members) if (member.seat === seat) { members.delete(token); member.conn?.close(); break; }
    inputSequences.delete(seat);
    roster();
    safeCall('onLeave', { id: seat, seat, reason: 'disconnected' });
    announce(message);
  }
  function nextSeat() {
    return [1, 2, 3].find(seat => ![...members.values()].some(m => m.seat === seat));
  }
  function openChannel(room, ownGeneration) {
    if (typeof globalThis.BroadcastChannel !== 'function') return;
    channel = new BroadcastChannel(`keystone-caper-cart-v1-${room}`);
    channel.onmessage = event => {
      const data = event.data;
      if (generation !== ownGeneration || !data || data.token === roomToken || (data.to && data.to !== roomToken)) return;
      if (role === 'host' && data.type === 'hello') {
        let member = members.get(data.token);
        if (!member) {
          const seat = nextSeat();
          if (seat === undefined || started) { channel.postMessage({ type: 'busy', token: roomToken, to: data.token }); return; }
          member = { seat, transport: 'local', lastSeen: clock() };
          members.set(data.token, member);
        }
        roster();
        channel.postMessage({ type: 'welcome', token: roomToken, to: data.token, seat: member.seat, players });
        announce('Partner connected · ready for a co-op chase');
        safeCall('onPartner', { players });
      } else if (role === 'guest' && data.type === 'welcome' && data.to === roomToken) {
        if (transport && transport !== 'local') return;
        clearTimeout(joinTimer);
        transport = 'local';
        guestToken = data.token;
        connection?.close(); connection = null;
        peer?.destroy(); peer = null;
        receive(data);
      } else if (data.type === 'busy' && data.to === roomToken) {
        clearTimeout(joinTimer);
        announce('Room full or chase in progress · try another room');
      } else if (role === 'host' && members.get(data.token)?.transport === 'local') { const member = members.get(data.token); member.lastSeen = clock(); receive(data, member.seat); }
      else if (role === 'guest' && transport === 'local' && data.token === guestToken) receive(data);
    };
  }
  let peerLibrary;
  function loadPeer() {
    if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
    if (!peerLibrary) peerLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
      script.onload = () => globalThis.Peer ? resolve(globalThis.Peer) : reject(new Error('PeerJS unavailable'));
      script.onerror = () => reject(new Error('Internet signaling could not load'));
      document.head.append(script);
    }).catch(error => { peerLibrary = null; throw error; });
    return peerLibrary;
  }
  function wireConnection(conn, ownGeneration, hosting) {
    let memberKey = '';
    if (!hosting) connection = conn;
    conn.on('open', () => {
      if (ownGeneration !== generation || closed) return conn.close();
      if (!hosting && transport === 'local') return conn.close();
      clearTimeout(joinTimer);
      if (hosting) {
        const seat = nextSeat();
        if (seat === undefined || started) { conn.send({ type: 'busy' }); setTimeout(() => conn.close(), 100); return; }
        memberKey = conn.peer;
        members.set(memberKey, { seat, transport: 'rtc', conn, lastSeen: clock() });
        roster();
        conn.send({ type: 'welcome', seat, players });
        announce('Partner connected · ready for a co-op chase');
        safeCall('onPartner', { players });
      } else {
        transport = 'rtc';
        announce('Connected · joining the co-op room');
      }
    });
    conn.on('data', data => {
      if (generation !== ownGeneration) return;
      if (hosting) { const member = members.get(memberKey); if (member) { member.lastSeen = clock(); receive(data, member.seat); } }
      else if (transport === 'rtc') {
        if (data?.type === 'busy') announce('Room full or chase in progress · try another room');
        else receive(data);
      }
    });
    conn.on('close', () => {
      if (generation !== ownGeneration || closed) return;
      if (hosting) { const member = members.get(memberKey); if (member) removeMember(member.seat, 'Partner disconnected'); }
      else if (transport === 'rtc') handleDisconnect('Host disconnected · return to Online to reconnect');
    });
    conn.on('error', () => {
      if (generation === ownGeneration && !closed && transport !== 'local') announce('Connection failed · check the room code and try again');
    });
  }
  function heartbeat() {
    lastReceived = clock();
    pingTimer = setInterval(() => {
      if (closed || hub || ending) return;
      if (role === 'guest' && transport) {
        if (clock() - lastReceived > 12000) { transport = ''; handleDisconnect('Host is no longer responding · reconnect from Online'); }
        else send({ type: 'ping' });
      } else if (role === 'host') {
        for (const member of [...members.values()]) if (clock() - member.lastSeen > 12000) removeMember(member.seat, 'Partner is no longer responding');
      }
    }, 1000);
  }
  function cleanup() {
    generation++;
    closed = true;
    clearTimeout(joinTimer);
    clearInterval(hubTimer);
    clearInterval(pingTimer);
    subscriptions.splice(0).forEach(off => off());
    connection?.close();
    for (const member of members.values()) member.conn?.close();
    members.clear(); inputSequences.clear(); hubSeats.clear();
    peer?.destroy();
    channel?.close();
    connection = peer = channel = null;
    transport = '';
    guestToken = '';
    started = false;
    receivedState = -1;
    for (const key of Object.keys(pendingInput)) pendingInput[key] = false;
    lastInput = lastState = -Infinity;
    ending = false;
  }
  const api = {
    get role() { return role; }, get status() { return status; }, get code() { return code; },
    get isHost() { return role !== 'guest'; }, get active() { return role !== 'offline'; },
    get hub() { return hub; }, get server() { return server; }, get me() { return me; },
    get players() { return players; }, get started() { return started; },
    get connected() { return hub || players.length > 1; },
    async initHub() {
      if (!globalThis.AIHub?.active) return null;
      hub = true; closed = false;
      const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4] });
      if (!info) { hub = false; return null; }
      role = info.isHost ? 'host' : 'guest';
      server = !!info.server;
      players = info.players.slice();
      players.forEach((p, i) => hubSeats.set(p.id, i));
      me = server ? -1 : players.findIndex(p => p.id === info.me);
      transport = 'hub';
      announce('AI Hub · waiting for the shared countdown');
      subscriptions.push(AIHub.on('message', receive));
      subscriptions.push(AIHub.on('start', detail => {
        hubTimer = setInterval(() => {
          if (AIHub.time() < 0) return;
          clearInterval(hubTimer);
          if (ending) return;
          started = true;
          announce('AI Hub co-op chase in progress');
          safeCall('onStart', { ...info, ...detail, me, players, isHost: role === 'host', server });
        }, 20);
      }));
      subscriptions.push(AIHub.on('time-up', detail => { safeCall('onTimeUp', detail); }));
      subscriptions.push(AIHub.on('leave', detail => {
        const index = hubSeats.get(detail.id);
        players = AIHub.players.slice();
        safeCall('onLeave', { ...detail, seat: index });
        announce('AI Hub · officer left');
      }));
      subscriptions.push(AIHub.on('end', detail => {
        ending = true; started = false;
        clearInterval(hubTimer);
        safeCall('onEnd', detail.reason);
        announce(`AI Hub · ${detail.reason}`);
      }));
      AIHub.ready();
      return { ...info, me, players };
    },
    async host() {
      if (hub) return code;
      cleanup();
      closed = false; role = 'host'; me = 0;
      code = random(6); roomToken = random(18);
      players = [{ id: 0, name: 'Officer 1' }];
      const ownGeneration = generation;
      openChannel(code, ownGeneration);
      heartbeat();
      announce(`Room ${code} · opening internet connection…`);
      try {
        const Peer = await loadPeer();
        if (generation !== ownGeneration) return code;
        peer = new Peer(`keystone-caper-cart-${code}`, { debug: 0 });
        peer.on('open', () => { if (generation === ownGeneration && !members.size) announce(`Room ${code} · share this code with your partner`); });
        peer.on('connection', conn => wireConnection(conn, ownGeneration, true));
        peer.on('error', error => {
          if (generation !== ownGeneration || transport) return;
          announce(error.type === 'unavailable-id' ? 'Room code collision · create a new room' : `Room ${code} · local tabs available; internet signaling unavailable`);
        });
      } catch {
        if (generation === ownGeneration && !transport) announce(`Room ${code} · local tabs available; internet signaling unavailable`);
      }
      return code;
    },
    async join(value) {
      if (hub) return false;
      const room = String(value).trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(room)) { announce('Enter the six-character room code'); return false; }
      cleanup();
      closed = false; role = 'guest'; me = 1; code = room;
      roomToken = random(18); players = [];
      const ownGeneration = generation;
      openChannel(room, ownGeneration);
      heartbeat();
      announce(`Joining room ${room}…`);
      channel?.postMessage({ type: 'hello', token: roomToken });
      joinTimer = setTimeout(() => { if (generation === ownGeneration && !transport) announce('Room not found · check the code and keep the host page open'); }, 16000);
      await new Promise(resolve => setTimeout(resolve, 300));
      if (transport === 'local' || generation !== ownGeneration) return true;
      try {
        const Peer = await loadPeer();
        if (generation !== ownGeneration || transport === 'local') return true;
        peer = new Peer({ debug: 0 });
        peer.on('open', () => {
          if (generation !== ownGeneration || transport === 'local') return;
          wireConnection(peer.connect(`keystone-caper-cart-${room}`, { reliable: true, serialization: 'json' }), ownGeneration, false);
        });
        peer.on('error', error => {
          if (generation === ownGeneration && transport !== 'local') announce(error.type === 'peer-unavailable' ? 'Room not found · check the code and keep the host page open' : 'Connection failed · internet signaling unavailable');
        });
      } catch {
        if (generation === ownGeneration && !transport) announce('Internet connection unavailable · local tabs can still connect');
      }
      return true;
    },
    start(info = {}) {
      if (role !== 'host' || hub || closed) return false;
      started = true;
      send({ type: 'start', info });
      announce('Co-op chase in progress');
      safeCall('onStart', { ...info, players, me, isHost: true, server: false });
      return true;
    },
    sendInput(input) {
      if (role !== 'guest' || !started || ending) return false;
      for (const key of Object.keys(pendingInput)) pendingInput[key] ||= !!input?.[key];
      if (clock() - lastInput < 70) return false;
      lastInput = clock();
      const frame = { ...sanitizedInput(input) };
      for (const key of Object.keys(pendingInput)) { frame[key] = pendingInput[key]; pendingInput[key] = false; }
      return send({ type: 'input', seq: ++seq, input: frame });
    },
    sendState(state) {
      if (role !== 'host' || !started || ending || clock() - lastState < 70) return false;
      lastState = clock();
      return send({ type: 'state', seq: ++seq, state });
    },
    finish(score, won) {
      if (role !== 'host' || ending) return;
      if (hub) {
        const ids = AIHub.players.map(p => p.id);
        AIHub.finish({ standings: [ids], scores: Object.fromEntries(ids.map(id => [id, Number(score) || 0])), won: !!won });
      } else {
        send({ type: 'finish', result: { score: Number(score) || 0, won: !!won } });
      }
    },
    leave() {
      if (hub) return false;
      send({ type: 'bye' });
      cleanup();
      role = 'offline'; code = ''; players = []; me = 0;
      announce('Offline');
      return true;
    },
  };
  return api;
}
