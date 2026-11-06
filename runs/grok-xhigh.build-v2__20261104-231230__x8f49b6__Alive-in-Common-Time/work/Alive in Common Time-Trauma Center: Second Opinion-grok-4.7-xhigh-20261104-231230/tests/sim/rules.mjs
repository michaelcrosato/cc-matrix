import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { Sim } from '../../src/sim/sim.js';
import { rankFor } from '../../src/sim/scoring.js';
import { applyUnreliable, bytesOf, decodeKeyframe, keyframeOf, unreliableOf, VIEW_FIELDS } from '../../src/sim/snapshot.js';
import { ALL_OPS, getOp, storyOrder } from '../../src/data/ops/index.js';
import { SCENES, storyLineCount } from '../../src/data/story/scenes.js';
import { SPEAKERS } from '../../src/data/cast.js';
import { BARKS } from '../../src/data/barks.js';
import { inDrape } from '../../src/sim/field.js';
import { TUNING_DEFAULTS } from '../../src/config/tuning.js';

const BANNED = [
  'Derek Stiles', 'Angie Thompson', 'Naomi Kimishima', 'Caduceus', 'Delphi',
  'GUILT', 'Healing Touch', 'Hope Hospital', 'Kyriaki', 'Deftera', 'Triti',
  'Tetarti', 'Pempti', 'Paraskevi', 'Savato',
];

const MUST = [
  'Thirty-one years in this room, child',
  'Then simulate faster.',
  'the best hands',
  'the worst nerves',
  'Everything went quiet.',
  'I have heard of that once.',
  'Tumors do not keep time, child.',
  'Surgeon on Call',
  'heartbeat',
  'Please wash your hands.',
  'REQUIEM',
  'Bravo, Doctor',
  'Your hands are excellent',
  'He waits for the silence',
  'For Augustin, who signed',
  'Every heart I mended',
  'I handed her the knife',
  'You cannot operate',
  'You held the forceps wrong',
  'a patient',
  'Good hands, child.',
  'Opus 2',
];

function filesUnder(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) filesUnder(p, out);
    else if (name.endsWith('.js') || name.endsWith('.json') || name.endsWith('.css') || name.endsWith('.md')) out.push(p);
  }
  return out;
}

function walkAt(node, found) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.at) && node.at.length >= 2 && typeof node.at[0] === 'number' && typeof node.at[1] === 'number') {
    found.push(node.at);
  }
  for (const value of Object.values(node)) walkAt(value, found);
}

export function ruleTests() {
  const fails = [];
  let passed = 0;
  const pass = (name, fn) => {
    try {
      const msg = fn();
      if (msg) fails.push(`${name}: ${msg}`);
      else passed += 1;
    } catch (err) {
      fails.push(`${name}: ${err.message}`);
    }
  };

  pass('determinism', () => {
    const hashes = [0, 1].map(() => {
      const sim = new Sim({ op: 'broken-glass', seed: 7, physics: false });
      for (let i = 0; i < 200; i++) {
        sim.input(0, { source: 'stick', x: i % 2 ? 1 : -0.4, y: 0.2, use: i % 5 === 0 ? 1 : 0, tool: 'gel' });
        sim.step();
      }
      return sim.hash();
    });
    if (hashes[0] !== hashes[1]) return `${hashes[0]} != ${hashes[1]}`;
    return null;
  });

  pass('tip speed', () => {
    const sim = new Sim({ op: 'broken-glass', seed: 1, physics: false });
    sim.tuning.aimAssist = 0;
    const x0 = sim.seats[0].x;
    for (let i = 0; i < 60; i++) {
      sim.input(0, { source: 'stick', x: 1, y: 0, use: 0 });
      sim.step();
    }
    const dx = sim.seats[0].x - x0;
    const want = sim.tuning.tipSpeed;
    if (Math.abs(dx - want) > want * 0.05) return `moved ${dx.toFixed(3)} want ${want}`;
    return null;
  });

  pass('beat and timer', () => {
    const sim = new Sim({ op: 'broken-glass', seed: 1, physics: false });
    const t0 = sim.timer;
    for (let i = 0; i < 120; i++) sim.step();
    if (sim.beat.count < 2) return `beat ${sim.beat.count}`;
    if (!(sim.timer < t0)) return `timer ${sim.timer} from ${t0}`;
    if (Math.abs(sim.time - 2) > 0.02) return `time ${sim.time}`;
    return null;
  });

  pass('fail reasons', () => {
    const vitals = new Sim({ op: 'broken-glass', seed: 1, physics: false });
    vitals.vitals = 0;
    vitals.step();
    if (vitals.failed !== 'vitals') return `vitals -> ${vitals.failed}`;
    const time = new Sim({ op: 'broken-glass', seed: 1, physics: false });
    time.timer = 0;
    time.step();
    if (time.failed !== 'time') return `time -> ${time.failed}`;
    const miss = new Sim({ op: 'broken-glass', seed: 1, physics: false });
    miss.misses = miss.missLimit;
    miss.step();
    if (miss.failed !== 'miss') return `miss -> ${miss.failed}`;
    return null;
  });

  pass('retry floors', () => {
    const sim = new Sim({ op: 'broken-glass', seed: 1, physics: false });
    sim.checkpoint = { score: 3, vitals: 10, timer: 10, index: sim.phaseIndex };
    sim.retryPhase();
    if (sim.vitals < 60 || sim.timer < 90) return `vitals ${sim.vitals} timer ${sim.timer}`;
    return null;
  });

  pass('notes after two failures', () => {
    const sim = new Sim({ op: 'broken-glass', seed: 1, physics: false });
    sim.fail('vitals');
    sim.retryPhase();
    if (sim.notesOffer) return 'offered after one failure';
    sim.fail('vitals');
    if (!sim.notesOffer) return 'no offer after two';
    return null;
  });

  pass('difficulty and consult', () => {
    const easy = new Sim({ op: 'broken-glass', difficulty: 'easy', physics: false, seed: 1 });
    const resident = new Sim({ op: 'broken-glass', difficulty: 'resident', physics: false, seed: 1 });
    if (easy.diff.drains !== 0.6) return `easy drain ${easy.diff.drains}`;
    if (!(easy.timer > resident.timer)) return `easy timer ${easy.timer} resident ${resident.timer}`;
    const plain = new Sim({ op: 'legato', physics: false, seed: 1 });
    const careful = new Sim({ op: 'legato', physics: false, seed: 1, consult: 'careful' });
    const aggressive = new Sim({ op: 'legato', physics: false, seed: 1, consult: 'aggressive' });
    if (Math.abs(careful.timer - (plain.timer + 60)) > 0.01) return `careful timer ${careful.timer} plain ${plain.timer}`;
    if (Math.abs(aggressive.timer - Math.max(45, plain.timer - 40)) > 0.01) return `aggressive timer ${aggressive.timer}`;
    if (!(careful.mods.drain < plain.mods.drain)) return 'careful drain';
    return null;
  });

  pass('hush slows the clock only', () => {
    const sim = new Sim({ op: 'broken-glass', seed: 1, physics: false });
    sim.hushPhase = 'wash';
    sim.hushT = 5;
    const timer0 = sim.timer;
    const time0 = sim.time;
    sim.step();
    const dTime = sim.time - time0;
    const dTimer = timer0 - sim.timer;
    if (Math.abs(dTime - 1 / 60) > 1e-6) return `sim.time moved ${dTime}`;
    if (!(dTimer < (1 / 60) * 0.5)) return `timer moved ${dTimer}`;
    return null;
  });

  pass('grand rounds scale', () => {
    const one = new Sim({ op: 'grand-rounds', players: 1, physics: false, seed: 1 });
    const four = new Sim({ op: 'grand-rounds', players: 4, physics: false, seed: 1 });
    if (one.countScale !== 1) return `1 seat scale ${one.countScale}`;
    if (Math.abs(four.countScale - (1 + 0.5 * 3)) > 1e-9) return `4 seat scale ${four.countScale}`;
    if (Math.abs(four.grHp - (1 + 0.25 * 3)) > 1e-9) return `4 seat hp ${four.grHp}`;
    return null;
  });

  pass('ranks', () => {
    const want = [
      [1000, 'S', 'Chief of Surgery'],
      [800, 'A', 'Attending'],
      [600, 'B', 'Resident'],
      [400, 'C', 'Intern'],
      [0, 'D', 'Malpractice Suit Pending'],
    ];
    for (const [score, id, title] of want) {
      const row = rankFor(score, 1000, null);
      if (row.id !== id || row.title !== title) return `${score} -> ${row.id} ${row.title}`;
    }
    return null;
  });

  pass('snapshot round trip', () => {
    const sim = new Sim({ op: 'grand-rounds', players: 4, physics: false, seed: 1 });
    for (let i = 0; i < 30; i++) {
      sim.input(0, { source: 'stick', x: 0.2, y: 0, use: 0, tool: 'gel' });
      sim.step();
    }
    const key = keyframeOf(sim);
    const decoded = decodeKeyframe(key);
    for (const field of VIEW_FIELDS) {
      if (!(field in decoded)) return `missing ${field}`;
    }
    const next = applyUnreliable(decoded, unreliableOf(sim));
    if (next.tick !== sim.tick) return `tick ${next.tick} != ${sim.tick}`;
    if (bytesOf(key) > 16384) return `keyframe ${bytesOf(key)}`;
    return null;
  });

  pass('skipTo', () => {
    const sim = new Sim({ op: 'staccato', physics: false, seed: 1 });
    const id = sim.op.phases[1].id;
    if (!sim.skipTo(id)) return 'refused';
    if (sim.phase?.id !== id) return sim.phase?.id;
    return null;
  });

  pass('story length and lines', () => {
    const n = storyLineCount();
    if (n < 250 || n > 350) return `${n} lines`;
    const text = SCENES.map((s) => s.lines.map((l) => l.text).join('\n')).join('\n');
    const missing = MUST.filter((line) => !text.toLowerCase().includes(line.toLowerCase()));
    if (missing.length) return `missing ${missing.join(' | ')}`;
    return null;
  });

  pass('bea wording', () => {
    const bad = [];
    for (const scene of SCENES) {
      if (scene.id === 'S16') continue;
      for (const line of scene.lines) {
        if (line.who === 'bea' && /good/i.test(line.text)) bad.push(`${scene.id}: ${line.text}`);
      }
    }
    const barkText = JSON.stringify(BARKS);
    if (/good/i.test(barkText)) bad.push('bark file');
    if (bad.length) return bad.join('; ');
    return null;
  });

  pass('teaches cover the kit', () => {
    const need = ['scalpel', 'forceps', 'suction', 'gel', 'suture', 'laser', 'scanner', 'clamp', 'syringe', 'defib', 'hush', 'sforzando', 'adagio', 'staccato', 'tremolo', 'legato', 'crescendo', 'fermata', 'coda'];
    const got = new Set(ALL_OPS.flatMap((op) => op.teaches || []));
    const missing = need.filter((id) => !got.has(id));
    if (missing.length) return missing.join(', ');
    return null;
  });

  pass('operation data', () => {
    for (const id of storyOrder()) {
      const op = getOp(id);
      if (!op.phases?.length) return `${id} has no phases`;
      if (!op.patient?.name) return `${id} has no patient`;
      for (const phase of op.phases) {
        if (!phase.objective) return `${id} ${phase.id} has no objective`;
      }
      for (const who of JSON.stringify(op).match(/"who":"([a-z]+)"/g) || []) {
        const name = who.slice(7, -1);
        if (!SPEAKERS.includes(name)) return `${id} speaker ${name}`;
      }
    }
    const points = [];
    for (const op of ALL_OPS) walkAt(op, points);
    const outside = points.filter(([x, y]) => !inDrape(x, y));
    if (outside.length) return `outside drape ${outside.slice(0, 4).map((p) => p.join(',')).join(' ; ')}`;
    return null;
  });

  pass('no Math.random in sim', () => {
    const root = path.resolve('src/sim');
    for (const file of filesUnder(root)) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('Math.random')) return path.relative(root, file);
    }
    return null;
  });

  pass('banned names', () => {
    const root = path.resolve('src');
    for (const file of filesUnder(root)) {
      const text = readFileSync(file, 'utf8');
      for (const word of BANNED) {
        if (text.includes(word)) return `${path.relative(root, file)} has ${word}`;
      }
    }
    return null;
  });

  pass('tuning is read', () => {
    const root = path.resolve('src');
    const blob = filesUnder(root).map((file) => readFileSync(file, 'utf8')).join('\n');
    const dead = Object.keys(TUNING_DEFAULTS).filter((key) => !blob.includes(key));
    if (dead.length) return dead.join(', ');
    return null;
  });

  return { fails, passed };
}
