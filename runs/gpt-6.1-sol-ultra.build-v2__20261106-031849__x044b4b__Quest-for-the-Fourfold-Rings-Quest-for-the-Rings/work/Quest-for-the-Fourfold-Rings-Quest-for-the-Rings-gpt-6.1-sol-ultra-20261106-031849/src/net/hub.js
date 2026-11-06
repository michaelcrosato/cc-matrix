/* Shared-world authority adapter for the unmodified AI Hub Session Protocol v1 client. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const INPUT_PERIOD = 0.1;
  const SNAPSHOT_PERIOD = 0.1;
  const STALE_SECONDS = 0.8;
  const MAX_EDGE_QUEUE = 24;
  const EDGE_NAMES = ['power', 'dodge', 'ping', 'primary', 'interact'];
  const neutral = () => ({ mx: 0, my: 0, ax: 1, ay: 0, primary: false, interact: false, power: false, dodge: false, ping: false });
  const number = (v) => typeof v === 'number' && Number.isFinite(v);
  const integer = (v) => Number.isSafeInteger(v) && v >= 0;
  const round = (n) => Math.round(n * 1000) / 1000;

  function normalized(input) {
    const v = neutral();
    if (!input || typeof input !== 'object') return v;
    for (const key of ['mx', 'my', 'ax', 'ay']) v[key] = number(input[key]) ? Math.max(-1, Math.min(1, input[key])) : v[key];
    const movement = Math.hypot(v.mx, v.my);
    if (movement > 1) { v.mx /= movement; v.my /= movement; }
    const aim = Math.hypot(v.ax, v.ay);
    if (aim > 1) { v.ax /= aim; v.ay /= aim; }
    for (const key of ['primary', 'interact', ...EDGE_NAMES]) v[key] = input[key] === true;
    return v;
  }

  function validInput(v) {
    return Array.isArray(v) && v.length === 5 && v.slice(0, 4).every((n) => number(n) && Math.abs(n) <= 1.001) && integer(v[4]) && v[4] <= 3 && Math.hypot(v[0], v[1]) <= 1.002;
  }

  function decodeInput(v) {
    return { mx: v[0], my: v[1], ax: v[2], ay: v[3], primary: !!(v[4] & 1), interact: !!(v[4] & 2), power: false, dodge: false, ping: false };
  }

  function encodeInput(v) {
    return [round(v.mx), round(v.my), round(v.ax), round(v.ay), (v.primary ? 1 : 0) | (v.interact ? 2 : 0)];
  }

  function validIntent(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    switch (value.type) {
      case 'route':
        if (!['dungeon', 'crystal', 'inferno', 'shifting', 'cacheCrystal', 'cacheShift', 'final'].includes(value.value)) return null;
        return { type: value.type, value: value.value };
      case 'hero':
        if (!['warrior', 'wizard', 'phantom', 'changeling'].includes(value.value)) return null;
        return { type: 'hero', value: value.value };
      case 'retry': case 'board': case 'courtyardContinue':
        return { type: value.type };
      default: return null;
    }
  }

  async function setup(options = {}) {
    const hub = root.AIHub;
    if (!hub || typeof hub.connect !== 'function') return null;
    const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) return null;

    const players = info.players.slice(0, 2);
    const playerIds = players.map((p) => p.id);
    const seatForId = new Map(players.map((p, index) => [p.id, index]));
    const authority = info.isHost === true;
    const server = info.server === true;
    const localSeat = server ? -1 : (seatForId.get(info.me) ?? -1);
    const absent = new Set();
    const streams = new Map();
    const lastInputSequence = [-1, -1];
    const lastEdgeSequence = [0, 0];
    const lastIntentSequence = [-1, -1];
    const remoteInput = [neutral(), neutral()];
    const inputAge = [Infinity, Infinity];
    const inputEpoch = [-1, -1];
    const queuedEdges = [[], []];
    const pendingLocalEdges = [];
    const unsubscribers = [];
    let pendingSnapshot = null;
    let startSeen = false;
    let startNotified = false;
    let ended = false;
    let finished = false;
    let clock = 0;
    let inputAccumulator = INPUT_PERIOD;
    let snapshotAccumulator = SNAPSHOT_PERIOD;
    let inputSequence = 0;
    let intentSequence = 0;
    let edgeSequence = 0;
    let snapshotSequence = 0;
    let lastSnapshotSequence = -1;
    let lastSnapshotEpoch = -1;
    let lastSentEpoch = -1;
    let observedEpoch = -1;
    let lastSnapshotClock = -Infinity;
    let lastIntentClock = -Infinity;
    let droppedMessages = 0;
    let sentMessages = 0;
    let maxPacketBytes = 0;
    let lastLocal = neutral();
    let currentLocal = neutral();
    let initialized = false;
    let latestSnapshot = null;
    let previousSnapshot = null;
    let lastSnapshotAt = 0;
    const getEpoch = () => {
      const value = options.getEpoch ? options.getEpoch() : 0;
      return integer(value) ? value : 0;
    };
    const chooser = () => players.findIndex((p) => !absent.has(p.id));
    const safeCallback = (name, ...args) => typeof options[name] === 'function' ? options[name](...args) : undefined;

    const api = {
      info,
      active: true,
      authority,
      server,
      localSeat,
      players,
      commands: [neutral(), neutral()],
      playing: false,
      ended: false,
      phase: 'briefing',
      get routeChooser() { return chooser(); },
      get lastSnapshot() { return latestSnapshot; },
      get previousSnapshot() { return previousSnapshot; },
      get interpolation() { return Math.max(0, Math.min(1, (clock - lastSnapshotAt) / SNAPSHOT_PERIOD)); },
      rng(label) {
        const key = String(label);
        if (!streams.has(key)) streams.set(key, hub.rng(key));
        return streams.get(key);
      },
      update,
      intent,
      finish,
      forceSnapshot() { if (authority) snapshotAccumulator = SNAPSHOT_PERIOD; },
      inspect() {
        return { authority, server, localSeat, phase: api.phase, playing: api.playing, ended, epoch: getEpoch(), sentMessages, droppedMessages, maxPacketBytes, lastInputSequence: lastInputSequence.slice(), acknowledgedEdges: lastEdgeSequence.slice(), pendingEdges: pendingLocalEdges.length, absent: [...absent] };
      },
      dispose() {
        ended = true;
        api.ended = true;
        api.playing = false;
        for (const unbind of unsubscribers.splice(0)) unbind();
        api.commands = [neutral(), neutral()];
        pendingLocalEdges.length = 0;
        queuedEdges.forEach((queue) => { queue.length = 0; });
      },
    };

    function send(packet, settings) {
      if (ended || finished) return false;
      let encoded;
      try { encoded = JSON.stringify(packet); } catch (_) { return false; }
      const size = new TextEncoder().encode(encoded).length;
      if (size > 16384) { droppedMessages++; return false; }
      maxPacketBytes = Math.max(maxPacketBytes, size);
      const sent = hub.send(packet, settings);
      if (sent) sentMessages++; else droppedMessages++;
      return sent;
    }

    function applySnapshot(packet) {
      if (!packet || !integer(packet.q) || !integer(packet.e) || packet.e < lastSnapshotEpoch || packet.q <= lastSnapshotSequence) return;
      if (!packet.s || typeof packet.s !== 'object') return;
      if (packet.e !== lastSnapshotEpoch) {
        pendingLocalEdges.length = 0;
        lastLocal = neutral();
      }
      lastSnapshotSequence = packet.q;
      lastSnapshotEpoch = packet.e;
      if (Array.isArray(packet.a) && localSeat >= 0 && integer(packet.a[localSeat])) {
        const ack = packet.a[localSeat];
        while (pendingLocalEdges.length && pendingLocalEdges[0][0] <= ack) pendingLocalEdges.shift();
      }
      previousSnapshot = latestSnapshot;
      latestSnapshot = packet.s;
      lastSnapshotAt = clock;
      safeCallback('applySnapshot', packet.s, { epoch: packet.e, sequence: packet.q, reliableTransition: packet.t === 'transition' });
    }

    function receive(packet, from) {
      if (ended || !packet || typeof packet !== 'object' || packet.v !== VERSION) return;
      if (!authority) {
        if (from !== info.host || (packet.t !== 'snapshot' && packet.t !== 'transition')) return;
        if (!initialized) { pendingSnapshot = packet; return; }
        applySnapshot(packet);
        return;
      }
      const seat = seatForId.get(from);
      if (seat === undefined || absent.has(from) || from === info.me || !startSeen || hub.time() < 0) return;
      if (!integer(packet.e) || packet.e !== getEpoch()) return;
      if (packet.t === 'input') {
        if (!integer(packet.q) || packet.q <= lastInputSequence[seat] || !validInput(packet.i) || !Array.isArray(packet.x) || packet.x.length > MAX_EDGE_QUEUE) return;
        if (!packet.x.every((edge) => Array.isArray(edge) && edge.length === 2 && integer(edge[0]) && edge[0] > 0 && integer(edge[1]) && edge[1] > 0 && edge[1] < 32)) return;
        lastInputSequence[seat] = packet.q;
        remoteInput[seat] = decodeInput(packet.i);
        inputAge[seat] = 0;
        inputEpoch[seat] = packet.e;
        for (const edge of packet.x) {
          if (edge[0] <= lastEdgeSequence[seat]) continue;
          lastEdgeSequence[seat] = edge[0];
          if (queuedEdges[seat].length < MAX_EDGE_QUEUE) queuedEdges[seat].push([packet.e, edge[1]]);
        }
      } else if (packet.t === 'intent') {
        if (!integer(packet.q) || packet.q <= lastIntentSequence[seat]) return;
        const action = validIntent(packet.i);
        if (!action || (action.type !== 'hero' && seat !== chooser())) return;
        lastIntentSequence[seat] = packet.q;
        safeCallback('onIntent', seat, action);
        snapshotAccumulator = SNAPSHOT_PERIOD;
      }
    }

    function intent(action) {
      if (ended || finished || !api.playing || localSeat < 0 || absent.has(info.me) || clock - lastIntentClock < 0.15) return false;
      const validated = validIntent(action);
      if (!validated || (validated.type !== 'hero' && localSeat !== chooser())) return false;
      lastIntentClock = clock;
      if (authority) {
        safeCallback('onIntent', localSeat, validated);
        snapshotAccumulator = SNAPSHOT_PERIOD;
        return true;
      }
      return send({ v: VERSION, t: 'intent', e: getEpoch(), q: ++intentSequence, i: validated }, { to: info.host, reliable: true });
    }

    function finish(outcome) {
      if (!authority || ended || finished) return false;
      // Publish the terminal authoritative state even when victory falls
      // between the regular ten-hertz slots. This one reliable transition
      // precedes finish; gameplay copies must see the world that was scored.
      const terminal = initialized ? safeCallback('readSnapshot') : null;
      if (terminal && typeof terminal === 'object') {
        send({ v: VERSION, t: 'transition', e: getEpoch(), q: ++snapshotSequence, a: lastEdgeSequence.slice(), s: terminal }, { reliable: true });
      }
      finished = true;
      api.playing = false;
      api.phase = 'result';
      const value = outcome || safeCallback('getOutcome') || {};
      const remaining = playerIds.filter((id) => !absent.has(id));
      const score = Number.isFinite(value.score) ? value.score : 0;
      const scores = Object.fromEntries(remaining.map((id) => [id, score]));
      hub.finish({ standings: [remaining], scores, won: value.won === true });
      api.commands = [neutral(), neutral()];
      safeCallback('onFinish', { won: value.won === true, score });
      return true;
    }

    function update(dt, input) {
      if (ended || finished || !initialized) return;
      const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.25)) : 0;
      clock += elapsed;
      if (!startSeen || hub.time() < 0) {
        api.phase = startSeen ? 'countdown' : 'briefing';
        api.commands = [neutral(), neutral()];
        lastLocal = normalized(input);
        return;
      }
      api.playing = true;
      api.phase = 'playing';
      if (!startNotified) { startNotified = true; safeCallback('onStart'); }
      const epochNow = getEpoch();
      if (observedEpoch !== epochNow) {
        observedEpoch = epochNow;
        queuedEdges.forEach((queue) => {
          for (let i = queue.length - 1; i >= 0; i--) if (queue[i][0] !== epochNow) queue.splice(i, 1);
        });
      }
      currentLocal = normalized(input);
      let newEdges = 0;
      for (let i = 0; i < EDGE_NAMES.length; i++) {
        const key = EDGE_NAMES[i];
        if (currentLocal[key] && !lastLocal[key]) newEdges |= 1 << i;
      }
      // UI passes edge booleans for powers, dodges and pings. A held source can
      // still use the rising-edge check above without accidentally chaining.
      lastLocal = { ...currentLocal };
      for (let i = 0; i < 2; i++) {
        inputAge[i] += elapsed;
        api.commands[i] = inputAge[i] <= STALE_SECONDS && inputEpoch[i] === epochNow && !absent.has(playerIds[i]) ? { ...remoteInput[i] } : neutral();
      }
      if (localSeat >= 0 && !absent.has(info.me)) {
        api.commands[localSeat] = { ...currentLocal, power: !!(newEdges & 1), dodge: !!(newEdges & 2), ping: !!(newEdges & 4) };
      }
      if (authority) {
        for (let i = 0; i < 2; i++) {
          const queued = queuedEdges[i].shift();
          const edge = queued && queued[0] === epochNow ? queued[1] : 0;
          for (let j = 0; j < EDGE_NAMES.length; j++) api.commands[i][EDGE_NAMES[j]] = api.commands[i][EDGE_NAMES[j]] || !!(edge & (1 << j));
        }
      } else if (newEdges && pendingLocalEdges.length < MAX_EDGE_QUEUE) {
        pendingLocalEdges.push([++edgeSequence, newEdges]);
      }
      inputAccumulator += elapsed;
      if (!authority && localSeat >= 0 && inputAccumulator >= INPUT_PERIOD) {
        inputAccumulator %= INPUT_PERIOD;
        send({ v: VERSION, t: 'input', e: getEpoch(), q: ++inputSequence, i: encodeInput(currentLocal), x: pendingLocalEdges.slice() }, { to: info.host, reliable: false });
      }
      if (authority) {
        snapshotAccumulator += elapsed;
        if (snapshotAccumulator >= SNAPSHOT_PERIOD && clock - lastSnapshotClock >= SNAPSHOT_PERIOD - 0.001) {
          lastSnapshotClock = clock;
          snapshotAccumulator %= SNAPSHOT_PERIOD;
          const state = safeCallback('readSnapshot');
          if (state && typeof state === 'object') {
            const epoch = getEpoch();
            const transition = epoch !== lastSentEpoch;
            const packet = { v: VERSION, t: transition ? 'transition' : 'snapshot', e: epoch, q: ++snapshotSequence, a: lastEdgeSequence.slice(), s: state };
            const size = new TextEncoder().encode(JSON.stringify(packet)).length;
            if (send(packet, { reliable: transition || size > 1200 })) lastSentEpoch = epoch;
          }
        }
        const outcome = safeCallback('getOutcome');
        if (outcome && outcome.won === true) finish(outcome);
      }
    }

    // Attach every lifecycle handler before preparing the world or readying.
    unsubscribers.push(hub.on('message', receive));
    unsubscribers.push(hub.on('start', () => { startSeen = true; api.phase = 'countdown'; }));
    unsubscribers.push(hub.on('leave', (event) => {
      if (ended || !event || !seatForId.has(event.id) || absent.has(event.id)) return;
      absent.add(event.id);
      const seat = seatForId.get(event.id);
      remoteInput[seat] = neutral();
      api.commands[seat] = neutral();
      inputAge[seat] = Infinity;
      queuedEdges[seat].length = 0;
      safeCallback('onLeave', event.id, seat, event.reason);
      snapshotAccumulator = SNAPSHOT_PERIOD;
    }));
    unsubscribers.push(hub.on('time-up', () => {
      if (authority && !ended && !finished) finish(safeCallback('getOutcome') || { won: false, score: 0 });
    }));
    unsubscribers.push(hub.on('end', (event) => {
      if (ended) return;
      ended = true;
      api.ended = true;
      api.playing = false;
      api.phase = 'ended';
      api.commands = [neutral(), neutral()];
      pendingLocalEdges.length = 0;
      queuedEdges.forEach((queue) => { queue.length = 0; });
      safeCallback('onEnd', event);
    }));

    try {
      await safeCallback('prepare', { ...info, players, localSeat, authority, server, rng: api.rng });
      initialized = true;
      if (pendingSnapshot) { applySnapshot(pendingSnapshot); pendingSnapshot = null; }
      hub.ready();
    } catch (error) {
      api.dispose();
      hub.fail('The expedition could not prepare: ' + String(error && error.message || error));
      throw error;
    }
    return api;
  }

  root.RingNet = { setup, VERSION, neutral, normalized, validIntent };
})(typeof window !== 'undefined' ? window : globalThis);
