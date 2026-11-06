import { Sim } from '../sim/sim.js';
import { physicsReady } from '../sim/physics.js';
import { applyUnreliable, decodeKeyframe, keyframeOf, unreliableOf } from '../sim/snapshot.js';
import { createView } from '../view/renderer.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function ship(bucket, data, reliable) {
  let text;
  try { text = JSON.stringify(data); } catch { return false; }
  const cap = data.t === 's' ? 1100 : 16000;
  if (text.length > cap) return false;
  const now = performance.now();
  bucket.tokens = Math.min(bucket.burst, bucket.tokens + ((now - bucket.t) / 1000) * bucket.rate);
  bucket.t = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return AIHub.send(data, { reliable: !!reliable });
}

function integrate(local, frame, tuning, dt) {
  if (frame.source === 'abs' && Number.isFinite(frame.x) && Number.isFinite(frame.y)) {
    local.x = frame.x;
    local.y = frame.y;
  } else {
    const sx = frame.x || 0;
    const sy = frame.y || 0;
    const mag = Math.hypot(sx, sy);
    if (mag > 0.12) {
      const sm = Math.min(1, mag);
      const speed = tuning.tipSpeed * sm ** tuning.stickCurve * (frame.steady ? tuning.steadyFactor : 1);
      local.x += (sx / mag) * speed * dt;
      local.y += (sy / mag) * speed * dt;
    }
  }
  local.x = clamp(local.x, -1.55, 1.9);
  local.y = clamp(local.y, -0.95, 0.95);
  if (frame.tool) local.tool = frame.tool;
  local.use = frame.use || 0;
  local.steady = !!frame.steady;
}

function outcome(model, info, left) {
  const sim = model.sim;
  const present = (info.players || []).filter((p) => !left.has(p.id));
  const scoreOf = (id) => {
    const seat = sim?.seats?.find((s) => s.id === id);
    return seat ? seat.score || 0 : 0;
  };
  const ranked = present.slice().sort((a, b) => scoreOf(b.id) - scoreOf(a.id) || a.id - b.id);
  const standings = [];
  for (const p of ranked) {
    const score = scoreOf(p.id);
    const last = standings[standings.length - 1];
    if (last && scoreOf(last[0]) === score) last.push(p.id);
    else standings.push([p.id]);
  }
  const scores = {};
  const stats = {};
  const awards = [];
  for (const p of present) {
    scores[p.id] = scoreOf(p.id);
    const seat = sim?.seats?.find((s) => s.id === p.id);
    const raw = seat?.stats || { Cuts: 0, Stitches: 0, Burns: 0, Saves: 0, Accuracy: 100 };
    stats[p.id] = {
      Cuts: raw.Cuts || 0,
      Stitches: raw.Stitches || 0,
      Burns: raw.Burns || 0,
      Saves: raw.Saves || 0,
      Accuracy: raw.Accuracy ?? 100,
    };
  }
  if (ranked[0]) awards.push({ id: ranked[0].id, title: 'Steadiest Hands', detail: 'Led the table this round' });
  const won = !!(sim && sim.complete && !sim.failed && sim.vitals > 0);
  return { standings, scores, won, stats, awards };
}

export function runSession(model, info) {
  const left = new Set();
  const cmds = new Map();
  const bucket = { tokens: 8, burst: 8, rate: 16, t: performance.now() };
  const local = { x: -1.05, y: 0.62, tool: 'gel', use: 0, steady: false };
  let ended = false;
  let finished = false;
  let base = null;
  let seq = 0;
  let acc = 0;
  let accI = 0;
  let accS = 100;
  let accK = 1000;
  let accE = 0;
  let failedGfx = false;
  let last = performance.now();
  const evQueue = [];
  model.sessionInfo = info;
  model.mode = 'session';
  model.screen = 'Card';
  model.card = { left: null, ready: [], asking: 0 };
  model.sessionPause = false;

  function finish(forceWon) {
    if (!info.isHost || finished || ended) return;
    finished = true;
    const out = outcome(model, info, left);
    if (typeof forceWon === 'boolean') out.won = forceWon && out.won;
    try { AIHub.finish(out); } catch { /* host only; the client warns if misused */ }
  }

  AIHub.on('card', (card) => {
    model.card = card || model.card;
    if (AIHub.time() === -Infinity) model.screen = 'Card';
    model.paint?.();
  });
  AIHub.on('start', () => {
    model.started = true;
  });
  AIHub.on('message', (data, from) => {
    if (!data || ended) return;
    if (data.t === 'i' || data.t === 'a') {
      if (!model.sim || from === AIHub.me) return;
      const cur = cmds.get(from) || { source: 'abs', x: 0, y: 0, use: 0, tool: 'gel' };
      if (data.t === 'i') {
        cur.source = 'abs';
        cur.x = data.x;
        cur.y = data.y;
        if (data.tool) cur.tool = data.tool;
        cur.use = data.use || 0;
        cur.steady = !!data.steady;
      } else {
        if (data.syringe) cur.syringe = true;
        if (data.special) cur.special = true;
        if (data.alt) cur.alt = true;
        if (data.swap) cur.swap = true;
        if (data.siteDelta) cur.siteDelta = data.siteDelta;
        if (Number.isInteger(data.site)) cur.site = data.site;
      }
      cmds.set(from, cur);
      return;
    }
    if (from !== info.host) return;
    if (data.t === 'k') {
      const dec = decodeKeyframe(data);
      if (!base || dec.tick == null || base.tick == null || dec.tick >= base.tick) base = dec;
    } else if (data.t === 's' && base) {
      base = applyUnreliable(base, data);
    } else if (data.t === 'e' && data.ev) {
      model.remoteEvents = data.ev;
    }
    model.netState = base;
  });
  AIHub.on('leave', ({ id }) => {
    left.add(id);
    try { model.sim?.leave(id); } catch { /* already gone */ }
  });
  AIHub.on('time-up', () => {
    if (model.sim?.complete) finish(true);
    else finish(false);
  });
  AIHub.on('end', () => {
    ended = true;
    model.screen = 'Round over';
    try { model.audio?.ctx?.suspend?.(); } catch { /* already suspended */ }
    model.paint?.();
  });

  AIHub.ready();

  const boot = (async () => {
    if (info.isHost) {
      let physics = false;
      try { await physicsReady(); physics = true; } catch { physics = false; }
      const rng = AIHub.rng('world');
      rng.int = (n) => Math.floor(rng() * n);
      rng.seed = AIHub.seed || 1;
      model.sim = new Sim({
        op: 'grand-rounds',
        players: info.players,
        rng,
        network: true,
        physics,
        tuning: model.tuning,
        difficulty: 'resident',
      });
      model.opId = 'grand-rounds';
    }
    if (!info.server) {
      const webgl = model.params.get('webgl') === '1';
      try {
        model.view = await createView(model.canvas, { webgl });
      } catch {
        try {
          model.view = await createView(model.canvas, { webgl: true });
        } catch {
          if (!failedGfx) { failedGfx = true; AIHub.fail('graphics unavailable'); }
        }
      }
      model.backend = model.view?.backend || 'none';
    }
  })();
  boot.catch(() => { /* keep the rejection off the page; graphics failures already called fail once */ });

  (function pump() {
    if (ended) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const sample = model.input.poll();
    const clock = AIHub.time();
    if (model.screen === 'Card' || clock === -Infinity) {
      if (sample.seats.some((s) => s.edges?.confirm)) AIHub.answer('ready');
      if (sample.seats.some((s) => s.edges?.more || s.edges?.special)) AIHub.answer('more');
    }
    if (clock >= 0 && model.sim && info.isHost) {
      if (!info.server && !model.sessionPause) {
        const mine = sample.seats.find((s) => s.index === 0);
        if (mine) model.sim.input(AIHub.me, mine.frame);
      }
      for (const [id, cmd] of cmds) model.sim.input(id, cmd);
      acc += dt;
      let guard = 0;
      let stepped = false;
      while (acc >= 1 / 60 && guard < 5) {
        model.sim.step();
        acc -= 1 / 60;
        guard += 1;
        stepped = true;
        for (const ev of model.sim.events || []) {
          evQueue.push(ev);
          model.playEvent?.(ev);
        }
      }
      if (stepped) {
        for (const cmd of cmds.values()) {
          cmd.syringe = false;
          cmd.special = false;
          cmd.alt = false;
          cmd.swap = false;
          cmd.siteDelta = 0;
        }
      }
      if (model.sim.over) finish(!!model.sim.complete);
      accS += dt * 1000;
      accK += dt * 1000;
      accE += dt * 1000;
      if (accS >= 100) {
        accS = 0;
        ship(bucket, unreliableOf(model.sim), false);
      }
      if (accK >= 1000) {
        accK = 0;
        ship(bucket, keyframeOf(model.sim), true);
      }
      if (accE >= 200 && evQueue.length) {
        accE = 0;
        const ev = evQueue.splice(0, 8).map((e) => ({ type: e.type, who: e.who, key: e.key, id: e.id }));
        ship(bucket, { t: 'e', ev }, true);
      }
    } else if (clock >= 0 && !info.isHost && !info.server) {
      const mine = sample.seats.find((s) => s.index === 0);
      const frame = mine?.frame || { source: 'stick', x: 0, y: 0, use: 0 };
      integrate(local, frame, model.tuning, dt);
      accI += dt * 1000;
      if (accI >= 1000 / 12) {
        accI = 0;
        seq += 1;
        ship(bucket, {
          t: 'i', x: local.x, y: local.y, tool: local.tool, use: local.use, steady: local.steady, seq,
        }, false);
      }
      if (frame.syringe || frame.special || frame.alt || frame.swap || frame.siteDelta) {
        accE += dt * 1000;
        if (accE >= 340) {
          accE = 0;
          ship(bucket, {
            t: 'a',
            syringe: !!frame.syringe, special: !!frame.special, alt: !!frame.alt,
            swap: !!frame.swap, siteDelta: frame.siteDelta || 0,
          }, true);
        }
      }
    }
    // time() is -Infinity on the card, negative through the 3-2-1, and only then >= 0.
    if (Number.isFinite(clock) && clock < 0) {
      if (model.screen === 'Card' || model.screen === 'Countdown') model.screen = 'Countdown';
      model.countN = Math.max(1, Math.ceil(-clock / 1000));
    } else if (clock >= 0 && clock < 1e12) {
      if (model.screen === 'Card' || model.screen === 'Countdown') {
        model.screen = 'Operation';
        model.reached.add('Operation');
      }
      model.countN = 0;
    }
    if ((sample.menu.back || sample.seats.some((s) => s.edges?.pause)) && clock >= 0 && model.screen === 'Operation') {
      model.sessionPause = !model.sessionPause;
    } else if (model.sessionPause && (sample.menu.back || sample.seats.some((s) => s.edges?.back))) {
      model.sessionPause = false;
    } else if (model.sessionPause) {
      model.applySettings?.(sample);
    }
    model.tickAudio?.();
    if (!info.server && model.view && !model.painting) {
      if (info.isHost && model.sim) model.syncFromSim?.();
      else if (model.netState) {
        const st = model.netState;
        const me = st.seats?.find((s) => s.id === AIHub.me);
        if (me) { me.x = local.x; me.y = local.y; me.tool = local.tool; }
        model.decorateState?.(st);
        model.painting = true;
        try {
          model.view.showOr?.();
          model.view.setPortrait?.(model.screen === 'Operation');
          model.view.sync(st, dt);
        } catch { /* view catches up next frame */ }
        const drawn = model.view.render?.();
        if (drawn?.then) drawn.then(() => { model.painting = false; }, () => { model.painting = false; });
        else model.painting = false;
      }
    }
    model.paint?.();
    setTimeout(pump, 16);
  })();
}
