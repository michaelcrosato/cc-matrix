/* AI Hub authority adapter. Protocol/client are vendored unchanged separately. */
(() => {
  'use strict';
  const VERSION = 1;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const neutral = () => ({ dir: null, action: false });
  function intent(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.dir !== null && (!Number.isInteger(value.dir) || value.dir < 0 || value.dir > 3)) return null;
    if (typeof value.action !== 'boolean') return null;
    return { dir: value.dir, action: value.action };
  }
  const finite = x => Number.isFinite(x) ? x : 0;
  // Lossless record tables send repeated actor field names once, preserving the
  // complete public snapshot without serializing the actors/players alias twice.
  function packState(state) {
    const keys = [], byKey = new Map();
    const index = key => { if (!byKey.has(key)) { byKey.set(key, keys.length); keys.push(key); } return byKey.get(key); };
    function encode(value) {
      if (!value || typeof value !== 'object') return value;
      if (Array.isArray(value)) {
        if (value.length > 1 && value.every(v => v && typeof v === 'object' && !Array.isArray(v))) {
          const shape = Object.keys(value[0]), signature = shape.join('\u0001');
          if (value.every(v => Object.keys(v).join('\u0001') === signature)) {
            return [2, shape.map(index), value.map(v => shape.map(k => encode(v[k])))];
          }
        }
        return [1, ...value.map(encode)];
      }
      const result = [0];
      for (const key of Object.keys(value)) result.push(index(key), encode(value[key]));
      return result;
    }
    const value = { ...state };
    if (value.actors && value.players) delete value.players;
    const root = encode(value);
    return { d: keys, s: root };
  }
  function unpackState(packet) {
    if (!packet || !Array.isArray(packet.d) || !Array.isArray(packet.s)) throw Error('Invalid state table');
    function decode(value, depth = 0) {
      if (!Array.isArray(value)) return value;
      if (depth > 40) throw Error('State table nesting');
      if (value[0] === 1) return value.slice(1).map(v => decode(v, depth + 1));
      const result = {};
      if (value[0] === 2) return value[2].map(row => {
        const record = {};
        value[1].forEach((key, i) => { const name = packet.d[key]; if (name === '__proto__' || name === 'constructor' || name === 'prototype') throw Error('Invalid state key'); record[name] = decode(row[i], depth + 1); });
        return record;
      });
      if (value[0] !== 0) throw Error('Invalid state tag');
      for (let i = 1; i < value.length; i += 2) {
        const name = packet.d[value[i]];
        if (name === '__proto__' || name === 'constructor' || name === 'prototype' || typeof name !== 'string') throw Error('Invalid state key');
        result[name] = decode(value[i + 1], depth + 1);
      }
      return result;
    }
    const result = decode(packet.s);
    if (result.actors) result.players = result.actors;
    return result;
  }
  function stateSummary(state) {
    const actors = state.actors || state.players || [];
    return { revision: state.revision, tick: state.tick, stageIndex: state.stageIndex, phase: state.phase,
      foodMask: state.foodMask, score: state.score, lives: state.lives, power: state.power, gate: state.gate,
      actors: actors.map(a => [a.id, a.x, a.y, a.dir, a.invulnerable]),
      foods: (state.foods || []).map(f => [f.id, f.x, f.y, f.dir, f.alive]),
      enemies: (state.enemies || []).map(e => [e.id, e.x, e.y, e.dir, e.state]) };
  }
  function viewState(state, includeStatic) {
    const result = {};
    for (const k of ['mode', 'seed', 'tick', 'revision', 'phase', 'stageIndex', 'elapsed', 'stageElapsed', 'score', 'lives', 'power', 'chain', 'remaining', 'foodMask', 'gate', 'reveal', 'echo', 'lastEcho', 'chirpCooldown', 'clearTimer']) {
      if (own(state, k)) result[k] = state[k];
    }
    const take = (record, fields) => { const clean = {}; for (const k of fields) if (own(record, k)) clean[k] = record[k]; return clean; };
    result.actors = (state.actors || state.players || []).map(a => take(a, ['id', 'seat', 'x', 'y', 'dir', 'invulnerable', 'invuln', 'anim', 'turn', 'nextDir', 'moving']));
    result.foods = (state.foods || []).map(f => take(f, ['id', 'x', 'y', 'dir', 'power', 'alive', 'anim', 'turn', 'nextDir', 'moving']));
    result.enemies = (state.enemies || []).map(e => take(e, ['id', 'x', 'y', 'dir', 'role', 'state', 'release', 'anim', 'turn', 'nextDir', 'moving']));
    // Presentation events are deduplicated by id by the caller, never replayed by the simulation.
    result.events = (state.events || []).slice(-6);
    if (includeStatic) {
      for (const k of ['board', 'config', 'stats']) if (own(state, k)) result[k] = state[k];
    }
    return result;
  }

  async function create(callbacks = {}) {
    const H = globalThis.AIHub;
    if (!H) return null;
    let info = null, stopped = false, finished = false, started = false, prepared = false;
    let elapsed = 0, sendAt = -100, inputAt = -100, repairAt = -100;
    let inputSeq = 0, stateSeq = 0, lastRevision = -1, lastTick = -1, lastStateSeq = -1;
    let local = neutral(), pendingAction = false, lastSent = '', pendingRepair = null;
    const incoming = new Map(), active = new Map(), removeHandlers = [];
    const recentStates = [];
    let lastAccepted = null, maxPacketBytes = 0;
    let staticState = null, staticRevision = -1;
    let retainedRng = null;
    const call = (name, ...args) => typeof callbacks[name] === 'function' ? callbacks[name](...args) : undefined;
    const host = () => !!info && H.isHost;
    const live = () => !!info && prepared && started && !finished && !stopped && H.time() >= 0;
    const revOf = s => finite(s && (s.revision ?? s.stageRevision ?? s.rev));
    const tickOf = s => finite(s && s.tick);

    function send(packet, reliable, to) {
      if (!info || stopped || finished) return false;
      const json = JSON.stringify(packet);
      const bytes = new TextEncoder().encode(json).length;
      maxPacketBytes = Math.max(maxPacketBytes, bytes);
      if (bytes > 16384) {
        H.fail('The shared maze snapshot exceeded the Hub packet limit.');
        stopped = true;
        call('onEnd', { reason: 'snapshot-too-large' });
        return false;
      }
      return H.send(packet, { reliable, ...(to === undefined ? {} : { to }) });
    }
    function publish(reliable = false) {
      if (!host() || !prepared || stopped || finished) return false;
      const state = call('getState');
      if (!state) return false;
      // Reliable repair packets carry board/config/stats. Routine packets carry
      // exact view values; clients never run collision or gameplay prediction.
      const reduced = viewState(state, reliable);
      const packet = { v: VERSION, t: 's', q: ++stateSeq, r: revOf(state), k: tickOf(state), e: 1, b: reliable ? 1 : 0, s: packState(reduced) };
      if (reliable) pendingRepair = packet;
      const ok = send(packet, reliable);
      if (ok) { recentStates.push({ q: packet.q, state: stateSummary(state) }); if (recentStates.length > 24) recentStates.shift(); }
      if (ok && reliable) pendingRepair = null;
      return ok;
    }
    function applyLocal(value) {
      const seat = String(H.me);
      if (!active.has(seat) || H.server) return;
      incoming.set(seat, { q: inputSeq, at: elapsed, intent: value });
      call('onIntent', seat, value);
    }
    function finish(result = {}) {
      if (!host() || stopped || finished) return false;
      const state = call('getState') || {};
      const ids = [...active.values()].map(p => p.id);
      const score = finite(result.score ?? state.score);
      const scores = {}, stats = {};
      for (const id of ids) {
        scores[id] = score;
        const s = result.stats && (own(result.stats, id) ? result.stats[id] : result.stats);
        stats[id] = s && typeof s === 'object' && !Array.isArray(s) ? s : {
          'Stages completed': finite(state.stageIndex),
          'Snacks remaining': Array.isArray(state.foods) ? state.foods.filter(f => f.alive !== false).length : 'unknown',
          'Team lives': finite(state.lives),
        };
      }
      // Terminal state is sent while game traffic is still allowed; finish is exactly once.
      publish(true);
      finished = true;
      pendingRepair = null;
      H.finish({ standings: ids.length ? [ids] : [], scores, won: result.won === true, stats });
      return true;
    }
    removeHandlers.push(H.on('start', data => {
      if (stopped) return;
      started = true;
      local = neutral();
      call('onStart', data);
    }));
    removeHandlers.push(H.on('message', (message, from) => {
      if (stopped || finished || !info || !message || message.v !== VERSION) return;
      if (message.t === 'i' && host()) {
        const seat = String(from), previous = incoming.get(seat);
        const value = intent(message.i), seq = message.q;
        if (!active.has(seat) || !value || !Number.isSafeInteger(seq) || seq < 1 || seq > 1e9) return;
        if (previous && (seq <= previous.q || seq - previous.q > 1000)) return;
        if (!live()) return;
        incoming.set(seat, { q: seq, at: elapsed, intent: value });
        call('onIntent', seat, value);
      } else if (message.t === 's' && !host() && String(from) === String(H.host)) {
        if (!Number.isSafeInteger(message.q) || !Number.isFinite(message.r) || !Number.isFinite(message.k)) return;
        if (message.q <= lastStateSeq || message.r < lastRevision || (message.r === lastRevision && message.k < lastTick)) return;
        let state;
        try { state = message.e === 1 ? unpackState(message.s) : message.s; } catch { return; }
        if (!state || typeof state !== 'object' || revOf(state) !== message.r || tickOf(state) !== message.k) return;
        if (message.b === 1) { staticState = { board: state.board, config: state.config, stats: state.stats }; staticRevision = message.r; }
        if (message.b === 0) {
          if (!staticState || staticRevision !== message.r) return;
          Object.assign(state, staticState);
        }
        lastStateSeq = message.q; lastRevision = message.r; lastTick = message.k;
        lastAccepted = { q: message.q, state: stateSummary(state) };
        call('onState', state, { sequence: message.q, revision: message.r, at: elapsed });
      }
    }));
    removeHandlers.push(H.on('leave', data => {
      if (stopped || !data) return;
      const seat = String(data.id);
      active.delete(seat); incoming.delete(seat);
      call('onIntent', seat, neutral());
      call('onLeave', seat, data);
      if (host()) publish(true);
    }));
    removeHandlers.push(H.on('time-up', data => {
      if (!host() || stopped || finished) return;
      const result = call('onTimeUp', data);
      // A synchronous result keeps us comfortably inside the Hub's grace interval.
      finish(result && typeof result === 'object' ? result : { won: false });
    }));
    removeHandlers.push(H.on('end', data => {
      if (stopped) return;
      stopped = true; local = neutral(); pendingAction = false; incoming.clear(); pendingRepair = null;
      call('onEnd', data);
    }));
    info = await H.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) {
      for (const remove of removeHandlers) remove();
      return null;
    }
    retainedRng = H.rng('world');
    for (const player of H.players) active.set(String(player.id), player);
    await call('onPrepare', [...active.values()], H.seed, { isHost: H.isHost, isServer: H.server === true, localSeat: H.server ? null : String(H.me) });
    prepared = true;
    if (host()) publish(true);
    if (!stopped) H.ready();

    return {
      get isHost() { return host(); },
      get isServer() { return H.server === true; },
      get localSeat() { return H.server ? null : String(H.me); },
      get players() { return [...active.values()]; },
      get live() { return live(); },
      get ended() { return stopped; },
      get finished() { return finished; },
      get time() { return H.time(); },
      rng() { return retainedRng(); },
      input(value) {
        if (!live() || H.server) return false;
        const clean = intent(value);
        if (!clean) return false;
        local = clean;
        if (clean.action) pendingAction = true;
        if (host()) applyLocal(clean);
        return true;
      },
      tick(dt) {
        elapsed += Math.max(0, Math.min(.25, finite(dt)));
        if (stopped || finished || !prepared) return false;
        if (host()) {
          for (const [seat, value] of incoming) {
            if (elapsed - value.at > .65 && (value.intent.dir !== null || value.intent.action)) {
              value.intent = neutral();
              call('onIntent', seat, value.intent);
            }
          }
          if (elapsed - sendAt >= .1) { sendAt = elapsed; publish(false); }
          if (elapsed - repairAt >= .5) {
            repairAt = elapsed;
            // Only the newest state is retained when back-pressure drops a reliable packet.
            if (pendingRepair && send(pendingRepair, true)) pendingRepair = null;
            else publish(true);
          }
        } else if (live() && !H.server) {
          const outgoing = { dir: local.dir, action: pendingAction || local.action };
          const key = JSON.stringify(outgoing);
          if (elapsed - inputAt >= .07 && (key !== lastSent || elapsed - inputAt >= .2)) {
            inputAt = elapsed;
            if (send({ v: VERSION, t: 'i', q: ++inputSeq, i: outgoing }, false, H.host)) {
              lastSent = key;
              pendingAction = false;
            }
          }
        }
        return live();
      },
      transition() { return publish(true); },
      finish,
      diagnostics() {
        return { active: true, isHost: host(), isServer: H.server === true, localSeat: H.server ? null : String(H.me), live: live(), ended: stopped,
          inputSequence: inputSeq, stateSequence: host() ? stateSeq : lastStateSeq, revision: lastRevision, tick: lastTick, seats: [...active.keys()],
          maxPacketBytes, lastAccepted, recentStates: host() ? recentStates.slice() : [] };
      },
      dispose() { stopped = true; for (const remove of removeHandlers) remove(); incoming.clear(); pendingRepair = null; },
    };
  }
  globalThis.ChompNet = Object.freeze({ create, sanitizeIntent: intent, packState, unpackState });
})();
