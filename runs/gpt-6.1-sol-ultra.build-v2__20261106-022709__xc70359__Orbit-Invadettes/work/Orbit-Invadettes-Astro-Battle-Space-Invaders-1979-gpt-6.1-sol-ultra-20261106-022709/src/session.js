/**
 * Orbit Invadettes — AI Hub Session Protocol v1 shared authority.
 * Upstream session.js remains pristine and is embedded before this module.
 * Host: complete, lossless compact snapshots, reliable at 10 Hz.
 * Guests: bounded actions, unreliable at 10 Hz, monotonically acknowledged
 * repair edges. No participant predicts damage, inventory or score.
 */
const STEP = 1 / 120;
const HEARTBEAT_MS = 100;
const STALE_MS = 650;
const MAX_BYTES = 16_000;
const MAX_PRESENTATION_EVENTS = 64;
const KEYS = (
  'tick time seed rng epoch encounter status reason score reserve extraAwarded assisted players enemies bullets pickups bunkers formation boss saucer events tuning difficulty location encounterTime transitionTime nextEncounter killCount stats intro eventSeq ' +
  'seat id x y alive respawn protected charges kills repairs recovery active gone mask original cols rows cell center row col type hp maxHp telegraph flash vy owner kind r life dir timer beat initial interval ' +
  'phase emitters open cycle safeLane age hit playerSpeed shotRecovery marchInterval descent fireInterval playerShotSpeed bombSpeed salvageEvery repairYield bossHealth ' +
  'shotTimer fireTimer saucerTimer bossTimer nextId shots hits lost deployed earned missed caught spent repaired totalKills lastDamage moved fired repairedCover info delay duration ' +
  'fireColumn fireCycle volleyTimer nextSaucer repairCount shield introMoved introFire introRepair name value count bossPhase breach enemyKills spawnTimer safe transition'
).trim().split(/\s+/);
const KEY_INDEX = new Map(KEYS.map((key, index) => [key, '~' + index.toString(36)]));
const KEY_REVERSE = new Map([...KEY_INDEX].map(([key, value]) => [value, key]));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const neutral = () => ({ move: 0, fire: false, repair: false });
const byteLength = (value) => new TextEncoder().encode(JSON.stringify(value)).length;

/** Preserve every state field; bit masks and repeated object keys are packed. */
export function packWorld(value) {
  if (Array.isArray(value)) {
    if (value.length >= 32 && value.every((item) => item === 0 || item === 1)) {
      let hex = '';
      for (let i = 0; i < value.length; i += 4) {
        let nibble = 0;
        for (let j = 0; j < 4; j++) if (value[i + j]) nibble |= 1 << j;
        hex += nibble.toString(16);
      }
      return ['$bits', value.length, hex];
    }
    return value.map(packWorld);
  }
  if (!value || typeof value !== 'object') return value;
  const packed = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const compact = KEY_INDEX.get(key) ?? (key.startsWith('~') ? '~' + key : key);
    packed[compact] = packWorld(child);
  }
  return packed;
}

export function unpackWorld(value) {
  if (Array.isArray(value)) {
    if (value[0] === '$bits' && Number.isInteger(value[1]) && value[1] >= 0 &&
        value[1] <= 4096 && typeof value[2] === 'string') {
      const result = [];
      for (let i = 0; i < value[1]; i++) result.push((parseInt(value[2][i >> 2], 16) >> (i & 3)) & 1);
      return result;
    }
    return value.map(unpackWorld);
  }
  if (!value || typeof value !== 'object') return value;
  const unpacked = {};
  for (const [key, child] of Object.entries(value)) {
    const original = KEY_REVERSE.get(key) ?? (key.startsWith('~~') ? key.slice(1) : key);
    if (original === '__proto__' || original === 'constructor' || original === 'prototype') continue;
    unpacked[original] = unpackWorld(child);
  }
  return unpacked;
}

function cleanCommand(command = {}) {
  const result = {
    move: finite(command.move) ? clamp(command.move, -1, 1) : 0,
    fire: command.fire === true,
    repair: command.repair === true,
  };
  if (finite(command.targetX)) result.targetX = clamp(command.targetX, 18, 462);
  return result;
}

/** Connect only through the actual Hub client; null means ordinary standalone. */
export async function connectSession(options) {
  const hub = options.hub ?? globalThis.AIHub;
  if (!hub?.connect) return null;
  const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
  if (!info) return null;
  return createSessionController(info, { ...options, hub });
}

/** Exported separately for deterministic protocol tests with a fake Hub clock. */
export function createSessionController(info, {
  hub = globalThis.AIHub,
  createWorld,
  stepWorld,
  leaveSeat,
  onWorld = () => {},
  onEvents = () => {},
  onEnd = () => {},
  onStart = () => {},
  now = () => globalThis.performance.now(),
  schedule = (fn) => globalThis.setInterval(fn, 16),
  cancel = (id) => globalThis.clearInterval(id),
}) {
  if (typeof createWorld !== 'function' || typeof stepWorld !== 'function') {
    throw new TypeError('Hub integration needs createWorld and stepWorld.');
  }
  const roster = info.players.slice(0, 2).map((player) => ({ ...player }));
  const idToSeat = new Map(roster.map((player, seat) => [player.id, seat]));
  const ownSeat = info.server ? -1 : (idToSeat.get(info.me) ?? -1);
  const worldRng = hub.rng('world'); // Capture ONCE. A repeated call restarts this stream.
  const seed = Math.floor(worldRng() * 0x100000000) >>> 0;
  let world = createWorld({ seed, players: roster.length, difficulty: 1, ids: roster.map((player) => player.id) });
  let previousWorld = null;
  let previousAt = 0;
  let snapshotAt = 0;
  let snapshotSeq = 0;
  let lastSnapshotSeq = -1;
  let localPacketSeq = 0;
  let localRepairSeq = 0;
  let localRepairHeld = false;
  let localCommand = neutral();
  let overlayOpen = false;
  const movementHistory = [];
  let lastMovementSignature = '';
  let started = false;
  let playable = false;
  let ended = false;
  let finished = false;
  let finishCalled = false;
  let finishDeadline = Infinity;
  let phase = 'waiting';
  let timer = null;
  let lastSend = -Infinity;
  let initialSent = false;
  let latestEvent = 0;
  let presentationQueue = [];
  const activeIds = new Set(roster.map((player) => player.id));
  const terminalAcks = new Set(info.isHost && ownSeat >= 0 ? [info.me] : []);
  const slots = roster.map(() => ({
    command: neutral(), packetSeq: -1, receivedAt: -Infinity,
    repairSeq: 0, repairAck: 0, timedOut: false, overlay: false,
  }));
  const offs = [];
  const diagnostics = {
    protocol: 1, client: '1.4.0', strategy: 'reliable complete snapshots at 10 Hz',
    snapshotBytes: 0, maxSnapshotBytes: 0, snapshotsSent: 0, snapshotsReceived: 0,
    inputPackets: 0, rejectedInputs: 0, staleInputs: 0, inputTimeouts: 0,
    eventsReceived: 0, targetTick: 0, finishCalls: 0, stopped: false,
    localInputSeq: 0, localRepairSeq: 0, repairAcks: slots.map(() => 0),
    inputAcks: slots.map(() => -1),
    rejectedSnapshots: 0, terminalAcks: 0, pumpErrors: [],
  };

  function collectEvents(events) {
    if (!events?.length) return;
    const fresh = events.filter((event) => !finite(event.id) || event.id > latestEvent);
    if (!fresh.length) return;
    for (const event of fresh) if (finite(event.id)) latestEvent = Math.max(latestEvent, event.id);
    onEvents(fresh);
    presentationQueue.push(...fresh);
    if (presentationQueue.length > MAX_PRESENTATION_EVENTS) {
      presentationQueue = presentationQueue.slice(-MAX_PRESENTATION_EVENTS);
    }
  }

  function sendSnapshot(terminal = false) {
    if (ended || !info.isHost) return false;
    // events are transported separately because the simulation clears them each tick.
    const savedEvents = world.events;
    world.events = [];
    let packed;
    try { packed = packWorld(world); }
    finally { world.events = savedEvents; }
    const packet = {
      t: 's', n: ++snapshotSeq, at: Math.round(hub.time()),
      w: packed, a: slots.map((slot) => slot.repairAck), i: slots.map((slot) => slot.packetSeq),
      e: presentationQueue, over: terminal ? 1 : 0,
    };
    const size = byteLength(packet);
    diagnostics.snapshotBytes = size;
    diagnostics.maxSnapshotBytes = Math.max(diagnostics.maxSnapshotBytes, size);
    if (size >= MAX_BYTES) {
      // Never silently truncate a world or let the upstream client emit size warnings.
      hub.fail('Orbit Invadettes complete world exceeded its verified snapshot envelope.');
      stopInternal('snapshot-too-large');
      return false;
    }
    const sent = hub.send(packet, { reliable: true });
    if (sent !== false) {
      diagnostics.snapshotsSent++;
      presentationQueue = [];
    }
    return sent !== false;
  }

  function sendInput() {
    if (ended || finished || ownSeat < 0 || info.isHost) return;
    const c = overlayOpen ? neutral() : localCommand;
    const packet = {
      t: 'i', n: ++localPacketSeq, at: Math.round(hub.time()),
      m: c.move, f: c.fire ? 1 : 0, r: localRepairSeq, o: overlayOpen ? 1 : 0,
    };
    if (finite(c.targetX)) packet.x = c.targetX;
    hub.send(packet, { to: info.host, reliable: false });
    diagnostics.inputPackets++;
    diagnostics.localInputSeq = localPacketSeq;
  }

  function receiveInput(packet, from) {
    const seat = idToSeat.get(from);
    if (seat === undefined || !activeIds.has(from) || from === info.me ||
        !Number.isSafeInteger(packet.n) || packet.n < 0 ||
        !finite(packet.at) || !finite(packet.m) || Math.abs(packet.m) > 1 ||
        (packet.f !== 0 && packet.f !== 1) ||
        (packet.o !== undefined && packet.o !== 0 && packet.o !== 1) ||
        !Number.isSafeInteger(packet.r) || packet.r < 0 ||
        (packet.x !== undefined && (!finite(packet.x) || packet.x < 18 || packet.x > 462)) ||
        (packet.seat !== undefined && packet.seat !== seat) ||
        (packet.id !== undefined && packet.id !== from)) {
      diagnostics.rejectedInputs++;
      return;
    }
    const slot = slots[seat];
    const timeline = hub.time();
    if (packet.n <= slot.packetSeq || packet.at < timeline - 2000 || packet.at > timeline + 1000) {
      diagnostics.staleInputs++;
      return;
    }
    if (packet.r < slot.repairSeq) {
      diagnostics.rejectedInputs++;
      return;
    }
    slot.packetSeq = packet.n;
    slot.receivedAt = timeline;
    // A long disconnect may skip many key presses. Recover movement on the
    // next valid heartbeat, and bound any surviving one-shot backlog.
    if (packet.r - slot.repairAck > 3) slot.repairAck = packet.r - 1;
    slot.repairSeq = packet.r;
    slot.overlay = packet.o === 1;
    if (slot.overlay) slot.repairAck = slot.repairSeq;
    slot.timedOut = false;
    slot.command = { move: packet.m, fire: !!packet.f, repair: false };
    if (finite(packet.x)) slot.command.targetX = packet.x;
    diagnostics.inputPackets++;
  }

  function commandsForTick() {
    const timeline = hub.time();
    return slots.map((slot, seat) => {
      const id = roster[seat].id;
      if (!activeIds.has(id)) return neutral();
      if (seat === ownSeat && !info.server) {
        slot.command = overlayOpen ? neutral() : localCommand;
        slot.overlay = overlayOpen;
        slot.receivedAt = timeline;
        slot.repairSeq = localRepairSeq;
      }
      if (slot.overlay) {
        slot.repairAck = slot.repairSeq;
        diagnostics.repairAcks[seat] = slot.repairAck;
        return neutral();
      }
      if (timeline - slot.receivedAt > STALE_MS) {
        if (!slot.timedOut) { diagnostics.inputTimeouts++; slot.timedOut = true; }
        // Expired one-shot actions must not fire later when the connection returns.
        slot.repairAck = slot.repairSeq;
        return neutral();
      }
      const command = { ...slot.command, repair: false };
      if (slot.repairAck < slot.repairSeq) {
        slot.repairAck++;
        command.repair = !overlayOpen || seat !== ownSeat;
      }
      diagnostics.repairAcks[seat] = slot.repairAck;
      return command;
    });
  }

  function sendFinish() {
    if (ended || finishCalled || !info.isHost) return;
    finishCalled = true;
    diagnostics.finishCalls++;
    const ids = [...activeIds];
    const scores = {};
    const stats = {};
    for (const id of ids) {
      const player = world.players.find((candidate) => candidate.id === id);
      scores[id] = finite(player?.score) ? player.score : 0;
      stats[id] = {
        'Team score': world.score || 0,
        'Aliens cleared': player?.kills || 0,
        'Repairs': player?.repairs || 0,
      };
    }
    hub.finish({ standings: ids.length ? [ids] : [], scores, won: world.status === 'victory', stats });
  }

  function allTerminalAcknowledged() {
    return [...activeIds].every((id) => id === info.me || terminalAcks.has(id));
  }

  function finish(reason, graceMs = 5000) {
    if (ended || finished || !info.isHost) return;
    finished = true;
    phase = 'finished';
    if (reason === 'time-expired' && world.status !== 'victory') {
      world.status = 'defeat';
      world.reason = 'time-expired';
      world.events = [{
        id: ++world.eventSeq, tick: world.tick, type: 'defeat',
        x: 240, y: 135, value: 'time-expired',
      }];
      collectEvents(world.events);
    }
    onWorld(world);
    sendSnapshot(true); // Full reliable terminal state BEFORE finish().
    finishDeadline = now() + clamp(graceMs - 150, 0, 1200);
    if (allTerminalAcknowledged()) sendFinish();
  }

  function receiveSnapshot(packet) {
    if (!Number.isSafeInteger(packet.n) || packet.n <= lastSnapshotSeq || !packet.w) {
      diagnostics.rejectedSnapshots++;
      return;
    }
    const snapshot = unpackWorld(packet.w);
    if (!Number.isSafeInteger(snapshot.tick) || snapshot.tick < 0 ||
        !Array.isArray(snapshot.players) || snapshot.players.length !== roster.length ||
        snapshot.players.some((player, seat) => player.id !== roster[seat].id)) {
      diagnostics.rejectedSnapshots++;
      return;
    }
    if (snapshot.tick < world.tick || (snapshot.epoch ?? 0) < (world.epoch ?? 0)) {
      diagnostics.rejectedSnapshots++;
      return;
    }
    lastSnapshotSeq = packet.n;
    previousWorld = world;
    previousAt = snapshotAt;
    snapshotAt = now();
    world = snapshot;
    world.events = [];
    diagnostics.snapshotsReceived++;
    diagnostics.snapshotBytes = byteLength(packet);
    diagnostics.maxSnapshotBytes = Math.max(diagnostics.maxSnapshotBytes, diagnostics.snapshotBytes);
    if (Array.isArray(packet.i)) diagnostics.inputAcks = packet.i.slice(0, roster.length);
    const historyBefore = movementHistory.findLastIndex((sample) => sample.at <= world.time * 1000);
    if (historyBefore > 0) movementHistory.splice(0, historyBefore);
    if (Array.isArray(packet.a)) {
      diagnostics.repairAcks = packet.a.slice(0, roster.length);
    }
    onWorld(world);
    if (Array.isArray(packet.e)) {
      const fresh = packet.e.filter((event) => event && finite(event.id) && event.id > latestEvent);
      if (fresh.length) {
        latestEvent = Math.max(...fresh.map((event) => event.id));
        diagnostics.eventsReceived += fresh.length;
        onEvents(fresh);
      }
    }
    if (packet.over === 1) {
      finished = true;
      phase = 'finished';
      hub.send({ t: 'z', n: packet.n }, { to: info.host, reliable: true });
    }
  }

  function stopInternal(reason) {
    if (ended) return;
    ended = true;
    phase = 'ended';
    localCommand = neutral();
    presentationQueue = [];
    diagnostics.stopped = true;
    if (timer !== null) { cancel(timer); timer = null; }
    for (const off of offs.splice(0)) off();
    onEnd({ reason, world });
  }

  function pump() {
    if (ended) return;
    try {
      if (!started) return;
      const timeline = hub.time();
      const monotonic = now();
      if (finished) {
        if (info.isHost && !finishCalled && (allTerminalAcknowledged() || monotonic >= finishDeadline)) {
          sendFinish();
        }
        return;
      }
      if (timeline < 0) {
        if (info.isHost && !initialSent) { initialSent = true; sendSnapshot(); }
        return;
      }
      if (!playable) { playable = true; phase = 'playing'; onStart({ world, info }); }
      if (info.isHost) {
        // The shared clock is authoritative. A slow RAF cannot silently lose game time.
        const target = Math.floor(timeline * 120 / 1000);
        diagnostics.targetTick = target;
        let steps = 0;
        while (world.tick < target && steps < 2400 && !ended && !finished) {
          stepWorld(world, commandsForTick(), STEP);
          collectEvents(world.events);
          steps++;
          if (world.status === 'victory' || world.status === 'defeat') finish(world.reason);
        }
        onWorld(world);
      }
      if (ended || finished) return;
      if (monotonic - lastSend >= HEARTBEAT_MS) {
        lastSend = monotonic;
        if (info.isHost) sendSnapshot();
        else sendInput();
      }
    } catch (error) {
      diagnostics.pumpErrors.push(String(error?.stack || error));
      hub.fail('Orbit Invadettes could not continue the authoritative round.');
      stopInternal('simulation-error');
    }
  }

  const controller = {
    active: true,
    isHost: !!info.isHost,
    server: !!info.server,
    seat: ownSeat,
    info,
    diagnostics,
    get world() { return world; },
    get phase() { return phase; },
    get ended() { return ended; },
    update(command = {}, overlay = false) {
      if (ended || finished || ownSeat < 0) return;
      overlayOpen = !!overlay;
      const c = cleanCommand(command);
      if (!overlayOpen && c.repair && !localRepairHeld) localRepairSeq++;
      localRepairHeld = c.repair;
      localCommand = overlayOpen ? neutral() : c;
      diagnostics.localRepairSeq = localRepairSeq;
      if (!info.isHost) {
        const signature = JSON.stringify([localCommand.move,localCommand.targetX ?? null,overlayOpen]);
        const timeline = hub.time();
        if (signature !== lastMovementSignature && finite(timeline) && timeline >= 0) {
          movementHistory.push({at:timeline,move:localCommand.move,targetX:localCommand.targetX});
          if (movementHistory.length > 256) movementHistory.shift();
          lastMovementSignature = signature;
        }
      }
    },
    /** Visual interpolation only. Never simulate, collide, repair or award score here. */
    interpolatedWorld(at = now()) {
      if (info.isHost || !previousWorld || previousWorld.epoch !== world.epoch ||
          world.status !== 'playing' || snapshotAt <= previousAt) return world;
      const alpha = clamp((at - snapshotAt) / Math.max(HEARTBEAT_MS, snapshotAt - previousAt), 0, 1);
      const view = { ...world };
      for (const key of ['players', 'enemies', 'bullets', 'pickups']) {
        const old = new Map((previousWorld[key] || []).map((entity) => [entity.id ?? entity.seat, entity]));
        view[key] = (world[key] || []).map((entity) => {
          const prior = old.get(entity.id ?? entity.seat);
          if (!prior || (key === 'players' && prior.alive !== entity.alive)) return entity;
          return {
            ...entity,
            x: finite(prior.x) && finite(entity.x) ? prior.x + (entity.x - prior.x) * alpha : entity.x,
            y: finite(prior.y) && finite(entity.y) ? prior.y + (entity.y - prior.y) * alpha : entity.y,
          };
        });
      }
      // Only local horizontal movement is predicted. Every combat fact still
      // comes from the complete authoritative snapshot. Input packet sequence
      // acknowledgments let diagnostics verify reconciliation progress.
      const own = view.players?.[ownSeat];
      if (own?.alive && own.active !== false && movementHistory.length) {
        const until = hub.time();
        const from = Math.max(world.time * 1000, until - 500);
        const speed = finite(world.tuning?.playerSpeed) ? world.tuning.playerSpeed : 150;
        let position = world.players[ownSeat].x;
        let cursor = from;
        let command = movementHistory.findLast((sample) => sample.at <= from) ?? neutral();
        const integrate = (finish) => {
          const seconds = Math.max(0,finish-cursor)/1000;
          let distance = command.move*speed*seconds;
          if (Math.abs(command.move)<0.03 && finite(command.targetX)) {
            const delta=command.targetX-position;
            distance=clamp(delta,-speed*seconds,speed*seconds);
          }
          position=clamp(position+distance,18,462);cursor=finish;
        };
        for (const sample of movementHistory) if (sample.at>from && sample.at<until) { integrate(sample.at); command=sample; }
        integrate(until);
        view.players=view.players.slice();
        view.players[ownSeat]={...own,x:position};
      }
      return view;
    },
    /** Internal cancellation only; Hub owns all next-round navigation. */
    stop() { stopInternal('stopped'); },
    pump,
  };

  offs.push(hub.on('start', () => { started = true; phase = 'countdown'; pump(); }));
  offs.push(hub.on('message', (packet, from) => {
    if (ended || !packet || typeof packet !== 'object') return;
    if (info.isHost && packet.t === 'i' && !finished) receiveInput(packet, from);
    else if (!info.isHost && from === info.host && packet.t === 's') receiveSnapshot(packet);
    else if (info.isHost && finished && packet.t === 'z' &&
             activeIds.has(from) && Number.isSafeInteger(packet.n) && packet.n === snapshotSeq) {
      terminalAcks.add(from);
      diagnostics.terminalAcks = terminalAcks.size;
      if (allTerminalAcknowledged()) sendFinish();
    }
  }));
  offs.push(hub.on('leave', ({ id }) => {
    if (ended) return;
    activeIds.delete(id);
    const seat = idToSeat.get(id);
    if (seat !== undefined) {
      slots[seat].command = neutral();
      slots[seat].repairAck = slots[seat].repairSeq;
      if (info.isHost) {
        if (typeof leaveSeat === 'function') leaveSeat(world, seat);
        else {
          const player = world.players[seat];
          player.active = false; player.gone = true; player.alive = false; player.respawn = 0;
        }
        onWorld(world);
      }
    }
    if (id === info.host) stopInternal('host-left');
    else if (info.isHost && started && !finished) sendSnapshot();
  }));
  offs.push(hub.on('time-up', ({ graceMs = 5000 } = {}) => {
    if (info.isHost) finish('time-expired', graceMs);
  }));
  offs.push(hub.on('end', ({ reason }) => stopInternal(reason)));
  collectEvents(world.events);
  onWorld(world);
  timer = schedule(pump);
  hub.ready(); // All handlers and world exist; no gesture or audio unlock is required.
  return controller;
}
