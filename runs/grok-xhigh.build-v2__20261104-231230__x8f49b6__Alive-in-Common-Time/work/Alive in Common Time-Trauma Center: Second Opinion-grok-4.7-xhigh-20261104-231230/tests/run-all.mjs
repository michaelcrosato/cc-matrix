import { Worker } from 'node:worker_threads';
import { ALL_OPS, storyOrder } from '../src/data/ops/index.js';
import { ruleTests } from './sim/rules.mjs';

const which = process.argv[2] || 'all';
const suites = which === 'all' ? ['sim', 'browser', 'hub'] : [which];
const fails = [];
let passed = 0;

function fail(name, message) {
  fails.push({ name, message });
  console.log(`FAIL ${name}: ${message}`);
}

function openPool(width) {
  const url = new URL('./sim/worker.mjs', import.meta.url);
  const workers = Array.from({ length: width }, () => {
    const worker = new Worker(url);
    const queue = [];
    let busy = false;
    const pump = () => {
      if (busy || !queue.length) return;
      busy = true;
      const item = queue.shift();
      worker.current = item;
      worker.postMessage(item.job);
    };
    worker.on('message', (message) => {
      const item = worker.current;
      worker.current = null;
      busy = false;
      item.resolve(message);
      pump();
    });
    worker.on('error', (err) => {
      const item = worker.current;
      busy = false;
      worker.current = null;
      if (item) item.reject(err);
      pump();
    });
    return {
      run(job) {
        return new Promise((resolve, reject) => {
          queue.push({ job, resolve, reject });
          pump();
        });
      },
      close() {
        return worker.terminate();
      },
    };
  });
  let cursor = 0;
  return {
    async run(jobs) {
      const out = new Array(jobs.length);
      async function take(slot) {
        while (cursor < jobs.length) {
          const index = cursor;
          cursor += 1;
          out[index] = { job: jobs[index], result: await slot.run(jobs[index]) };
        }
      }
      await Promise.all(workers.map((slot) => take(slot)));
      return out;
    },
    async close() {
      await Promise.all(workers.map((slot) => slot.close()));
    },
  };
}

function simJobs() {
  const jobs = [];
  for (const id of storyOrder()) jobs.push({ id, mode: 'normal', players: 1, name: `normal ${id}` });
  for (const players of [1, 2, 3, 4]) {
    jobs.push({
      id: 'grand-rounds',
      mode: 'normal',
      players,
      measure: players === 4,
      name: `normal grand-rounds ${players}`,
    });
  }
  for (const id of storyOrder()) jobs.push({ id, mode: 'sloppy', players: 1, name: `sloppy ${id}` });
  jobs.push({ id: 'grand-rounds', mode: 'sloppy', players: 1, name: 'sloppy grand-rounds 1' });
  for (const op of ALL_OPS) jobs.push({ id: op.id, mode: 'idle', players: 1, name: `idle ${op.id}` });
  return jobs;
}

async function runSim() {
  const rules = ruleTests();
  for (const message of rules.fails) fail('rules', message);
  passed += rules.passed;
  const jobs = simJobs();
  const pool = openPool(4);
  const results = await pool.run(jobs);
  await pool.close();
  for (const { job, result } of results) {
    if (result.fail) fail(job.name, result.fail);
    else passed += 1;
    if (job.measure) {
      if (result.maxS > 1100) fail(job.name, `snapshot ${result.maxS} bytes`);
      else passed += 1;
      if (result.maxK > 16384) fail(job.name, `keyframe ${result.maxK} bytes`);
      else passed += 1;
    }
  }
}

async function runBrowser() {
  const { browserTests } = await import('./browser/suite.mjs');
  const result = await browserTests();
  for (const message of result.fails) fail('browser', message);
  passed += result.passed;
}

async function runHub() {
  const { hubTests } = await import('./hub/suite.mjs');
  const result = await hubTests();
  for (const message of result.fails) fail('hub', message);
  passed += result.passed;
}

const runners = { sim: runSim, browser: runBrowser, hub: runHub };
for (const name of suites) {
  const run = runners[name];
  if (!run) {
    fail('suite', `unknown suite ${name}`);
    continue;
  }
  await run();
}
console.log(`${fails.length} failed, ${passed} passed`);
process.exit(fails.length ? 1 : 0);
