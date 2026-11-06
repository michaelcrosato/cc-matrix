/** Shared-world host loop. The server copy runs this and never starts the renderer. */

import { applyDecoded, encodeFast, encodeKey } from '../sim/codec.js';
import { createOp, step } from '../sim/op.js';
import { SESSION_OPS } from '../content/ops.js';

const DT = 1 / 60;

export function buildStandings(players, scoreOf) {
  const scores = {};
  const ids = [];
  for (const p of players || []) {
    if (!Number.isInteger(p.id) || ids.includes(p.id)) continue;
    ids.push(p.id);
    const n = Number(scoreOf(p));
    scores[p.id] = Number.isFinite(n) ? Math.round(n) : 0;
  }
  ids.sort((a, b) => scores[b] - scores[a] || a - b);
  const standings = [];
  for (const id of ids) {
    const group = standings[standings.length - 1];
    if (group && scores[group[0]] === scores[id]) group.push(id);
    else standings.push([id]);
  }
  return { standings, scores };
}

function allow(state, cost = 1) {
  const t = nowMs();
  state.tokens = Math.min(30, state.tokens + ((t - state.refill) / 1000) * 16);
  state.refill = t;
  if (state.tokens < cost) return false;
  state.tokens -= cost;
  return true;
}

function nowMs() {
  return globalThis.performance?.now?.() || Date.now();
}

function finishRound(hub, state, won) {
  if (state.finished || state.ended || !hub.isHost) return;
  const players = (hub.players || []).filter((p) => Number.isInteger(p.id));
  if (!players.length) return;
  state.finished = true;
  const { standings, scores } = buildStandings(players, (p) => state.sim?.seats?.[p.id]?.score || 0);
  const stats = {};
  for (const p of players) {
    stats[p.id] = {
      SCORE: String(scores[p.id]).slice(0, 16),
      MISTAKES: String(state.sim?.mistakes || 0).slice(0, 16),
    };
  }
  const best = standings[0]?.[0];
  const awards = best == null ? [] : [{ id: best, title: 'STEADIEST HAND', detail: 'Held the line' }];
  const patientSaved = !!won && state.sim?.phase === 'won';
  hub.finish({ standings, scores, won: patientSaved, stats, awards });
}

function beginOp(hub, state) {
  const list = SESSION_OPS.filter(Boolean);
  const def = list[(hub.round || 0) % list.length];
  const seed = Math.floor(hub.rng('deal')() * 1e9);
  const seats = Math.max(1, (hub.players || []).length);
  state.sim = createOp(def, { seed, seats, consult: true, difficulty: 'resident' });
  state.onSim?.(state.sim);
}

function applySnap(state, snap) {
  if (!state.sim || !snap) return;
  const view = applyDecoded(state.sim, snap);
  const me = state.me;
  (view.seats || []).forEach((s, i) => {
    const seat = state.sim.seats[i];
    if (!seat) return;
    if (i === me) {
      const dx = (s.x ?? seat.x) - seat.x;
      const dz = (s.z ?? seat.z) - seat.z;
      if (Math.hypot(dx, dz) > 1) {
        seat.x += dx * 0.35;
        seat.z += dz * 0.35;
      }
    } else {
      seat.x = s.x;
      seat.z = s.z;
      if (s.tool) seat.tool = s.tool;
    }
  });
  if (view.phase) state.sim.phase = view.phase;
  if (view.strainDead) state.sim.flags.strainDead = true;
}

function hostInputs(state) {
  const inputs = {};
  const n = state.sim?.seats?.length || 0;
  for (let i = 0; i < n; i++) {
    const net = state.inputs[i] || {};
    if (i === state.me && state.local) inputs[i] = { ...net, ...state.local };
    else inputs[i] = net;
  }
  return inputs;
}

/**
 * Attach the hub listeners and the host timer.
 * `hub` is the session client. Returns the shared state.
 */
export function openSession(hub) {
  const state = {
    sim: null,
    inputs: {},
    local: { x: 0, z: 1.2, tool: 'forceps', use: false, gift: false, steady: false, sx: 0, sz: 0 },
    card: null,
    started: false,
    ended: false,
    finished: false,
    lastT: null,
    tokens: 16,
    refill: nowMs(),
    acc: { input: 0, snap: 0, key: 0, ping: 0 },
    me: hub.me,
    timer: 0,
    silence: null,
    onSim: null,
  };

  const send = (data, reliable) => {
    if (state.ended || state.finished) return;
    if (!allow(state)) return;
    hub.send(data, { reliable: !!reliable });
  };

  hub.on('card', (card) => {
    state.card = card;
  });
  hub.on('start', () => {
    state.started = true;
    state.me = hub.me;
    if (state.sim) return;
    try {
      beginOp(hub, state);
    } catch (err) {
      hub.fail(String(err?.message || err));
    }
  });
  hub.on('message', (data) => {
    if (!data || data.t === 'p') return;
    if (data.t === 'i' && Number.isInteger(data.n)) {
      state.inputs[data.n] = {
        x: data.x, z: data.z, sx: data.sx, sz: data.sz, tool: data.tool,
        use: !!data.use, gift: !!data.gift, steady: !!data.steady, place: !!data.place,
      };
      return;
    }
    if ((data.t === 's' || data.t === 'k') && !hub.isHost) applySnap(state, data.snap);
  });
  hub.on('leave', (info) => {
    if (info && info.id === hub.host) state.hostGone = true;
  });
  hub.on('time-up', () => {
    if (state.hostGone) return;
    finishRound(hub, state, false);
  });
  hub.on('end', () => {
    state.ended = true;
    clearInterval(state.timer);
    state.silence?.();
  });

  hub.probe?.(() => ({
    scene: state.sim ? 'op' : 'card',
    menu: '',
    world: state.sim?.id || 'card',
    input: 'pad',
  }));

  const sessionTick = () => {
    try {
    if (state.ended) return;
    const t = hub.time();
    const wall = nowMs();
    if (!hub.isHost && state.me != null) {
      state.acc.input += wall - (state.acc.inputAt || wall);
      state.acc.inputAt = wall;
      if (state.acc.input >= 66) {
        state.acc.input = 0;
        const loc = state.local || {};
        const body = {
          t: 'i', n: state.me, x: loc.x ?? 0, z: loc.z ?? 0, sx: loc.sx || 0, sz: loc.sz || 0,
          tool: loc.tool || 'forceps', use: !!loc.use, gift: !!loc.gift, steady: !!loc.steady,
          place: !!loc.place,
        };
        if (!allow(state)) return;
        hub.send(body, { to: hub.host, reliable: false });
      }
    } else if (hub.isHost) {
      state.acc.ping += wall - (state.acc.pingAt || wall);
      state.acc.pingAt = wall;
      if (!state.started || t < 0) {
        if (state.acc.ping >= 250) {
          state.acc.ping = 0;
          send({ t: 'p' }, false);
        }
        return;
      }
      if (state.sim && !state.finished) {
        if (state.lastT == null) state.lastT = t;
        let steps = Math.round((t - state.lastT) / (DT * 1000));
        if (steps > 4) steps = 4;
        if (steps < 0) steps = 0;
        state.lastT += steps * DT * 1000;
        for (let i = 0; i < steps; i++) step(state.sim, hostInputs(state), DT);
        if (state.sim.phase === 'won' || state.sim.phase === 'lost') finishRound(hub, state, state.sim.phase === 'won');
      }
      state.acc.snap += wall - (state.acc.snapAt || wall);
      state.acc.snapAt = wall;
      if (state.sim && state.acc.snap >= 84) {
        state.acc.snap = 0;
        send({ t: 's', snap: encodeFast(state.sim) }, false);
      }
      state.acc.key += wall - (state.acc.keyAt || wall);
      state.acc.keyAt = wall;
      if (state.sim && state.acc.key >= 1000) {
        state.acc.key = 0;
        send({ t: 'k', snap: encodeKey(state.sim) }, true);
      }
    }
    } catch {
      /* A bad tick must not take the round down. */
    }
  };
  state.pump = sessionTick;
  state.timer = setInterval(sessionTick, 34);

  return state;
}

export function stopSession(state) {
  if (!state) return;
  state.ended = true;
  clearInterval(state.timer);
}
