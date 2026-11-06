(() => {
  const game = window.__game;
  const trace = [];
  let frames = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let phase = 'initializing';
  const snapshot = () => game.state;
  const mark = label => {
    const s = snapshot();
    trace.push({ label, frames, x: +s.position.x.toFixed(2), y: +s.position.y.toFixed(2), treasures: s.treasures.length, lives: s.lives, hits: s.metrics.hits });
  };
  const frame = (input = {}) => {
    if (++frames > 25000) throw new Error('Simulation budget exceeded');
    game.input({ x: 0, y: 0, jump: false, action: false, ...input });
    game.step(1);
    const s = snapshot();
    if (s.mode !== 'playing' && s.mode !== 'won') throw new Error(`Expedition stopped: ${s.mode} (${s.damageCause || s.reason || 'unknown'})`);
    return s;
  };
  const wait = (condition, maximum = 600, input = {}, label = 'waiting') => {
    for (let i = 0; i < maximum; i++) {
      const s = snapshot();
      if (condition(s, i)) return s;
      frame(input);
    }
    throw new Error(`Timed out ${label}`);
  };
  function moveTo(target, options = {}) {
    const { tolerance = .25, max = 1500, avoidLadders = true, hazards = true } = options;
    for (let i = 0; i < max; i++) {
      const s = snapshot(), p = s.position;
      if (s.mode === 'won') return s;
      if (s.swinging && options.allowSwing) return s;
      const difference = target - p.x, dir = Math.sign(difference);
      if (Math.abs(difference) < tolerance && Math.abs(s.velocity.x) < 1 && s.grounded) return s;
      let x = Math.abs(difference) > 1.7 ? dir : clamp(difference * 2.4 - s.velocity.x * .15, -1, 1);
      let jump = false;
      if (s.grounded && Math.abs(difference) > .45) {
        if (hazards) {
          for (const h of game.getHazards()) {
            if (h.type === 'crocodile' || Math.abs(h.y - (p.y - .9)) > 1.1) continue;
            const distance = (h.x - p.x) * dir;
            if (distance > -.25 && distance < (p.y < -2 ? 3.35 : 2.7)) jump = true;
          }
        }
        if (avoidLadders && p.y > -2) {
          for (const ladder of game.level.ladders) {
            const distance = (ladder - p.x) * dir;
            if (distance > 0 && distance < 2.8 && Math.abs(target - ladder) > 1.7) jump = true;
          }
        }
        for (const gap of game.level.gaps) {
          if (gap.type === 'quicksand') {
            const edge = dir > 0 ? gap.a : gap.b;
            const distance = (edge - p.x) * dir;
            if (distance > 0 && distance < 1.6) jump = true;
          }
        }
      }
      frame({ x, jump });
    }
    throw new Error(`Timed out moving to ${target}`);
  }
  function treasure(index) {
    const t = game.level.treasures[index];
    moveTo(t.x, { tolerance: .2 });
    wait(s => s.treasures.includes(index), 180, {}, `collecting treasure ${index}`);
    mark(`Treasure ${index + 1}: ${t.type}`);
  }
  function useLadder(x) {
    const s = snapshot(), side = s.position.x < x ? -1 : 1;
    moveTo(x + side * 1.35, { tolerance: .13, avoidLadders: false });
    frame({ action: true });
    if (!snapshot().climbing) throw new Error(`Ladder ${x} did not engage`);
    wait(s => !s.climbing, 150, {}, `climbing at ${x}`);
    frame();
    mark(`Ladder ${x}`);
  }
  function crossVine(index) {
    const v = game.level.vines[index];
    const gap = game.level.gaps.find(g => v.x > g.a && v.x < g.b);
    const stage = gap.a - 1.9;
    moveTo(stage, { tolerance: .16, allowSwing: true });
    if (!snapshot().swinging) {
      wait(() => game.getVines()[index].angle < -.83, 600, {}, `vine ${index + 1} backswing`);
      frame({ x: 1, jump: true });
      wait(s => !!s.swinging, 90, { x: 1 }, `catching vine ${index + 1}`);
    }
    mark(`Caught vine ${index + 1}`);
    let previous = snapshot().swinging.angle;
    wait(s => {
      const a = s.swinging.angle, increasing = a > previous;
      previous = a;
      return a > .69 && increasing;
    }, 600, {}, `vine ${index + 1} forward swing`);
    frame({ x: 1, jump: true });
    wait(s => s.position.x > gap.b + .6 && s.grounded, 150, { x: 1 }, `landing after vine ${index + 1}`);
    mark(`Released vine ${index + 1}`);
  }
  function jumpTo(target, options = {}) {
    const start = snapshot().position.x;
    frame({ x: Math.sign(target - start), jump: true });
    return moveTo(target, { ...options, hazards: false, avoidLadders: false, max: 240 });
  }
  try {
    if (!game?.ready) throw new Error('Game is not ready');
    game.setManual(true);
    game.start();
    frame();
    phase = 'opening treasures';
    treasure(0);
    treasure(1);
    phase = 'first vine';
    crossVine(0);
    treasure(2);
    phase = 'first tunnel';
    useLadder(54);
    treasure(3);
    useLadder(54);
    phase = 'crocodile crossing';
    moveTo(70.45);
    // Wait for a fresh closed-jaw interval before stepping onto the first head.
    wait(() => game.getHazards().find(h => h.type === 'crocodile' && Math.abs(h.x - 74) < .1)?.open, 450, {}, 'first crocodile opens');
    wait(() => !game.getHazards().find(h => h.type === 'crocodile' && Math.abs(h.x - 74) < .1)?.open, 450, {}, 'first crocodile closes');
    jumpTo(74.0);
    jumpTo(77.0);
    if (!snapshot().treasures.includes(4)) wait(s => s.treasures.includes(4), 30, {}, 'crocodile gold');
    mark('Crocodile gold');
    jumpTo(83.5);
    phase = 'quicksand and rattler';
    treasure(5);
    treasure(6);
    phase = 'second vine';
    crossVine(1);
    treasure(7);
    phase = 'second tunnel';
    useLadder(164);
    treasure(8);
    useLadder(164);
    phase = 'fire trail';
    treasure(9);
    // Clear the ladder, settle, then jump the fire as a separate obstacle.
    moveTo(196.35, { avoidLadders: false });
    jumpTo(200.0);
    treasure(10);
    phase = 'final vine';
    crossVine(2);
    treasure(11);
    phase = 'finish';
    jumpTo(256.0);
    jumpTo(261.0);
    moveTo(266, { tolerance: 2 });
    wait(s => s.mode === 'won', 240, { x: 1 }, 'reaching gate');
    mark('Expedition complete');
    const state = snapshot();
    return { pass: state.mode === 'won' && state.treasures.length === 12 && state.metrics.vineCatches >= 3 && state.metrics.vineReleases >= 3 && state.metrics.climbs >= 4, phase, frames, trace, cheats: false, state };
  } catch (error) {
    mark(`Failure: ${error.message}`);
    return { pass: false, phase, frames, trace, cheats: false, error: String(error.message || error), state: game?.state };
  } finally {
    game?.input({ x: 0, y: 0, jump: false, action: false });
  }
})()
