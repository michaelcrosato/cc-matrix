import { parentPort, workerData } from 'node:worker_threads';
import { Sim } from '../../src/sim/sim.js';
import { botInput } from '../../src/sim/bot.js';
import { getOp } from '../../src/data/ops/index.js';
import { bytesOf, keyframeOf, unreliableOf } from '../../src/sim/snapshot.js';

const RANK = ['S', 'A', 'B', 'C', 'D'];

function report(sim, op, mode) {
  const frac = op.timer ? sim.time / op.timer : 0;
  const rank = sim.rank?.id || null;
  if (op.noFail) {
    if (!sim.complete || sim.failed) return `${mode} ${op.id} did not complete (${sim.failed || 'open'}) t=${sim.time.toFixed(1)}`;
    if (rank) return `${mode} ${op.id} ranked ${rank}`;
    return null;
  }
  if (!sim.complete || sim.failed) {
    return `${mode} ${op.id} failed ${sim.failed || 'open'} t=${sim.time.toFixed(1)} vmin=${sim.vitalsMin.toFixed(1)} score=${sim.score} rank=${rank}`;
  }
  if (mode === 'normal') {
    if (frac < 0.45 || frac > 0.75) {
      return `${mode} ${op.id} clear ${frac.toFixed(3)} of ${op.timer}s score=${sim.score} vmin=${sim.vitalsMin.toFixed(1)}`;
    }
    if (sim.vitalsMin < 35) return `${mode} ${op.id} vitalsMin ${sim.vitalsMin.toFixed(1)}`;
    if (rank !== 'S' && rank !== 'A') return `${mode} ${op.id} rank ${rank} score=${sim.score}`;
  }
  if (mode === 'sloppy') {
    const idx = RANK.indexOf(rank);
    if (idx < 0 || idx > RANK.indexOf('C')) return `${mode} ${op.id} rank ${rank} score=${sim.score} vmin=${sim.vitalsMin.toFixed(1)}`;
  }
  return null;
}

function playJob(job) {
  const op = getOp(job.id);
  const sim = new Sim({
    op: job.id,
    seed: 1,
    physics: false,
    difficulty: job.mode === 'sloppy' ? 'easy' : 'resident',
    players: job.players || 1,
  });
  const opts = job.mode === 'sloppy' ? { noise: 0.03, reactionDelay: 0.25 } : {};
  let maxS = 0;
  let maxK = 0;
  let maxE = 0;
  let n = 0;
  while (!sim.over && n < 1e7) {
    for (const seat of sim.seats) {
      if (!seat.out) sim.input(seat.id, botInput(sim, { id: seat.id }, opts));
    }
    sim.step();
    if (job.measure) {
      maxS = Math.max(maxS, bytesOf(unreliableOf(sim)));
      maxK = Math.max(maxK, bytesOf(keyframeOf(sim)));
      maxE = Math.max(maxE, sim.entities.length);
    }
    n += 1;
  }
  return { fail: report(sim, op, job.mode), maxS, maxK, maxE };
}

function idleJob(job) {
  const op = getOp(job.id);
  const sim = new Sim({ op: job.id, seed: 1, physics: false, difficulty: 'resident', players: job.players || 1 });
  const cap = op.noFail ? 6000 : Math.round((op.timer || 40) * 60 + 100);
  let n = 0;
  while (!sim.over && n < cap) {
    sim.step();
    n += 1;
  }
  if (op.noFail) {
    if (sim.failed) return { fail: `idle ${op.id} failed ${sim.failed} at step ${n}` };
    return { fail: null };
  }
  if (!sim.failed) return { fail: `idle ${op.id} still going after ${n} steps` };
  return { fail: null };
}

function run(job) {
  try {
    return job.mode === 'idle' ? idleJob(job) : playJob(job);
  } catch (err) {
    return { fail: `${job.mode} ${job.id}: ${err.stack || err.message}` };
  }
}

if (workerData) {
  parentPort.postMessage(run(workerData));
} else {
  parentPort.on('message', (job) => {
    if (!job) return;
    parentPort.postMessage(run(job));
  });
}
