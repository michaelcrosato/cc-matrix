import { ALL_OPS } from '../data/ops/index.js';
import { SCENES } from '../data/story/scenes.js';
import { rankFor } from '../sim/scoring.js';
import { Sim } from '../sim/sim.js';
import { resetTuning, TUNING_DEFAULTS } from '../config/tuning.js';

const STRAINS = ['adagio', 'staccato', 'tremolo', 'legato', 'crescendo', 'fermata', 'coda'];

export const DEV_IDS = [
  ...ALL_OPS.map((op) => `op:${op.id}`),
  'phase-next', 'unlock', 'scene-next',
  'complete-objective', 'complete-phase', 'win', 'fail',
  'rank:S', 'rank:A', 'rank:B', 'rank:C', 'rank:D',
  'god', 'freeze', 'composure', 'clamps',
  'bleeder', ...STRAINS.map((k) => `strain:${k}`),
  'arrest', 'fortissimo', 'hush', 'sforzando',
  'speed', 'step', 'auto',
  'overlay:grid', 'overlay:targets', 'overlay:beat', 'overlay:input',
  'ink:lines', 'ink:tone', 'ink:boil', 'ink:shadows',
  'reset-page', 'reset-all',
];

function fresh(model, opId) {
  const prev = model.sim;
  try { prev?.physics?.free?.(); } catch { /* world already freed */ }
  const sim = new Sim({
    op: opId,
    seed: 1,
    physics: false,
    tuning: model.tuning,
    difficulty: model.settings.difficulty || 'resident',
    players: 1,
  });
  model.sim = sim;
  model.screen = 'Operation';
  model.overlay = null;
  model.opId = opId;
  model.reached?.add('Operation');
  model.resultShown = false;
  return sim;
}

export function runDev(model, id, arg) {
  const name = String(id || '');
  const sim = () => model.sim;
  const go = (fn) => {
    try { fn(); } catch { /* a tool on a finished op stays quiet */ }
  };
  if (name.startsWith('op:')) {
    const opId = name.slice(3);
    go(() => {
      const simx = fresh(model, opId);
      if (arg) simx.skipTo(arg);
    });
    return true;
  }
  if (name === 'jump') {
    go(() => {
      const simx = fresh(model, arg?.op || 'broken-glass');
      if (arg?.phase) simx.skipTo(arg.phase);
    });
    return true;
  }
  if (name === 'unlock') {
    model.save.unlocked = true;
    model.persist?.();
    return true;
  }
  if (name === 'scene-next' || name === 'scene') {
    const cur = SCENES.findIndex((s) => s.id === (arg || model.sceneId));
    const next = SCENES[(cur + 1 + SCENES.length) % SCENES.length];
    model.openScene?.(arg && name === 'scene' ? arg : next.id, () => model.setScreen?.('Main Menu', null));
    return true;
  }
  const live = sim();
  if (!live) return true;
  if (name === 'phase-next') {
    go(() => {
      const phases = live.op.phases;
      const i = Math.min(phases.length - 1, live.phaseIndex + 1);
      live.skipTo(phases[i].id);
    });
  } else if (name === 'complete-objective') {
    go(() => {
      for (const e of live.entities) e.alive = false;
      live.vitals = 100;
      live.flags.stabilized = true;
      live.arrestsSurvived = 99;
      if (!live.over) live.completePhase();
    });
  } else if (name === 'complete-phase') {
    go(() => { if (!live.over) live.completePhase(); });
  } else if (name === 'win') {
    go(() => { if (!live.over) live.succeed(); });
  } else if (name === 'fail') {
    go(() => { if (!live.over) live.fail('vitals'); });
  } else if (name.startsWith('rank:')) {
    go(() => {
      const letter = name.slice(5);
      const par = live.op.parScore || 1;
      const ratio = { S: 1, A: 0.8, B: 0.6, C: 0.4, D: 0.1 }[letter] ?? 0.8;
      live.score = Math.round(par * ratio);
      live.rank = rankFor(live.score, par, null);
      live.over = true;
      live.complete = true;
      live.failed = null;
      model.screen = 'Report';
      model.reached?.add('Report');
    });
  } else if (name === 'god') {
    live.cheats.lockVitals = !live.cheats.lockVitals;
  } else if (name === 'freeze') {
    live.cheats.freezeTimer = !live.cheats.freezeTimer;
  } else if (name === 'composure') {
    live.cheats.infiniteComposure = !live.cheats.infiniteComposure;
  } else if (name === 'clamps') {
    live.cheats.infiniteClamps = !live.cheats.infiniteClamps;
  } else if (name === 'bleeder') {
    go(() => {
      const seat = live.seats[0];
      live.spawn({ kind: 'bleeder', site: live.activeSite, at: [seat.x, seat.y] });
    });
  } else if (name.startsWith('strain:')) {
    go(() => {
      const kind = name.slice(7);
      const seat = live.seats[0];
      live.spawn({ kind, strain: kind, site: live.activeSite, at: [seat.x, seat.y], hp: 40 });
    });
  } else if (name === 'arrest') {
    go(() => { if (!live.arrest) live.beginArrest({ clock: 8 }); });
  } else if (name === 'fortissimo') {
    go(() => live.act({ event: 'fortissimo' }));
  } else if (name === 'hush') {
    go(() => {
      live.hushPhase = 'wash';
      live.hushT = live.tuning.hushDuration;
      live.events.push({ type: 'hush', phase: 'wash' });
    });
  } else if (name === 'sforzando') {
    go(() => { live.sforzandoT = live.tuning.sforzandoDuration; });
  } else if (name === 'speed') {
    const cur = live.cheats.timeScale || 1;
    live.cheats.timeScale = cur >= 4 ? 0.1 : Math.round(Math.min(4, cur * 2) * 10) / 10;
  } else if (name === 'step') {
    go(() => { if (!live.over) live.step(); });
  } else if (name === 'auto') {
    model.botOn = !model.botOn;
  } else if (name.startsWith('overlay:')) {
    const key = name.slice(8);
    model.overlays[key] = !model.overlays[key];
  } else if (name === 'ink:lines') {
    const u = model.view?.ink?.u;
    if (u) u.lineOn.value = u.lineOn.value ? 0 : 1;
  } else if (name === 'ink:tone') {
    const u = model.view?.ink?.u;
    if (u) u.toneOn.value = u.toneOn.value ? 0 : 1;
  } else if (name === 'ink:boil') {
    model.view?.setBoil?.(!(model.boilOn === false));
    model.boilOn = model.boilOn === false;
  } else if (name === 'ink:shadows') {
    const map = model.view?.renderer?.shadowMap;
    if (map) map.enabled = !map.enabled;
  } else if (name === 'reset-all') {
    resetTuning(model.tuning);
  } else if (name === 'reset-page') {
    const keys = arg || Object.keys(TUNING_DEFAULTS);
    resetTuning(model.tuning, keys);
  }
  if (live.over && live.complete && model.screen === 'Operation') {
    model.screen = 'Report';
    model.reached?.add('Report');
  } else if (live.over && live.failed && model.screen === 'Operation') {
    model.screen = 'Fail';
    model.reached?.add('Fail');
  }
  model.paint?.();
  return true;
}
