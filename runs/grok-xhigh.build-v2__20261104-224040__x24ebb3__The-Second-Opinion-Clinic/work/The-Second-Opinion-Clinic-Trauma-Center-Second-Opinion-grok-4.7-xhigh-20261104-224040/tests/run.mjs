/**
 * The Second Opinion Clinic — one test command.
 *
 * Filters (also documented in docs/AUTHORING.md):
 *   sim      tool rules, gifts, rank, sliders, codec, determinism, balance
 *   content  story length, About fields, banned strings, campaign save
 *   audio    rendered voice and one effect are finite and not silent
 *   browser  pad stand-in, keys, mouse, attract, touch gate, dev sliders
 *   launch   two file:// boots, fresh-profile music, aimed tool
 *   hub      five shared-world harness URLs
 *   cal      print Resident bot scores (not part of the default)
 *   all      every filter except cal
 *
 * Default (no argument): sim + content + audio.
 * Prints only failures and one count line. Exit 0 when nothing failed.
 * `cal` may also print scores.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSong } from '../pixel-engine.js';
import { ABOUT_FIELDS, AI_HUB, ENGINE_FEEDBACK, PROMPT_FEEDBACK, SOURCE_INFORMATION, TESTING_FEEDBACK } from '../src/content/about.js';
import { playCampaign } from '../src/content/campaign.js';
import { ALL_OPS } from '../src/content/ops.js';
import { CAST, SCENES } from '../src/content/story.js';
import { applySlider, getConfig, resetConfig } from '../src/core/config.js';
import { SONGS } from '../src/audio/songs.js';
import { effectBuffer, rms, voicePcm } from '../src/audio/voice.js';
import { Clinic } from '../src/game/clinic.js';
import { buildStandings, openSession, stopSession } from '../src/net/session.js';
import { applyDecoded, decodeState, encodeFast, snapshotOf } from '../src/sim/codec.js';
import { createOp, devCheat, hashSim, retryStage, step } from '../src/sim/op.js';
import { play, sameHash } from '../src/sim/run.js';
import { rankFor } from '../src/sim/score.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DT = 1 / 60;
const BOSSES = new Set(['op5', 'op7', 'op8', 'op9']);
const fails = [];
let passed = 0;

function check(name, cond) {
  if (cond) passed += 1;
  else fails.push(name);
}

function approx(a, b, eps = 0.05) {
  return Math.abs(a - b) <= eps;
}

function mini(spawn, extra = {}) {
  return {
    id: 'mini',
    title: 'Mini',
    time: 80,
    par: 100,
    doses: 3,
    vitals: { start: 80, drain: 0 },
    tools: ['drain', 'forceps', 'suture', 'gel', 'syringe', 'scalpel', 'laser', 'scanner', 'dressing'],
    gifts: ['quiet', 'look'],
    stages: [{ spawn: Array.isArray(spawn) ? spawn : [spawn] }],
    ...extra,
  };
}

function run(sim, input, n, dt = DT) {
  for (let i = 0; i < n; i++) step(sim, { 0: input }, dt);
  return sim;
}

function ent(sim, id) {
  return sim.entities.find((e) => e.id === id);
}

function rated(sim, kind) {
  return sim.events.some((e) => e.type === 'rate' && e.rate === kind);
}

function testTools() {
  resetConfig();
  const pool = { id: 'p', kind: 'pool', x: 0, z: 0, r: 0.9 };
  let sim = createOp(mini(pool));
  run(sim, { place: true, x: 0, z: 0, tool: 'drain', use: true }, 40);
  check('drain CLEAN', ent(sim, 'p')?.done === true && rated(sim, 'CLEAN'));

  sim = createOp(mini({ id: 'far', kind: 'pool', x: 4, z: 0, r: 0.6 }));
  run(sim, { place: true, x: 0, z: 0, tool: 'drain', use: true }, 40);
  check('drain dry SLOPPY', rated(sim, 'SLOPPY') && sim.entities.some((e) => e.kind === 'nick'));

  sim = createOp(mini({ id: 'h', kind: 'hook', x: 0, z: 0, pull: 1, dx: 0, dz: 1 }));
  run(sim, { place: true, x: 0, z: 0, tool: 'forceps', use: true }, 2);
  for (let z = 0; z <= 1.05; z += 0.04) {
    step(sim, { 0: { place: true, x: 0, z, tool: 'forceps', use: true } }, DT);
  }
  check('forceps CLEAN', ent(sim, 'h')?.done === true && rated(sim, 'CLEAN'));

  sim = createOp(mini({ id: 'h2', kind: 'hook', x: 0, z: 0, pull: 1.2, dx: 0, dz: 1 }));
  step(sim, { 0: { place: true, x: 0, z: 0, tool: 'forceps', use: true } }, DT);
  run(sim, { place: true, x: 1.6, z: 0.1, tool: 'forceps', use: true }, 3);
  check('forceps off path MISTAKE', rated(sim, 'MISTAKE') && sim.mistakes >= 1);

  sim = createOp(mini({ id: 'mag', kind: 'magnet', x: 0, z: 0, pull: 1.1, dx: 0, dz: 1, speedLimit: 3.2 }));
  step(sim, { 0: { place: true, x: 0, z: 0, tool: 'forceps', use: true } }, DT);
  for (let i = 0; i < 20; i++) {
    const z = Math.min(0.5, (i + 1) * 3.2 * 0.4 * DT);
    step(sim, { 0: { place: true, x: 0, z, tool: 'forceps', use: true } }, DT);
  }
  const before = ent(sim, 'mag').pulled;
  step(sim, { 0: { place: true, x: 0, z: 1.1, tool: 'forceps', use: true } }, DT);
  check('magnet snap', ent(sim, 'mag').pulled < before || sim.events.some((e) => e.type === 'snap'));

  sim = createOp(mini({ id: 'core', kind: 'core', x: 0, z: 0, pull: 2, dx: 0, dz: 1, tether: true }));
  step(sim, { 0: { place: true, x: 0, z: 0, tool: 'forceps', use: true } }, DT);
  run(sim, { place: true, x: 0, z: 0.5, tool: 'forceps', use: true }, 8);
  step(sim, { 0: { place: true, x: 0, z: 0.5, tool: 'forceps', use: false } }, DT);
  check('tether early release SLOPPY', rated(sim, 'SLOPPY') && sim.entities.some((e) => e.kind === 'wound'));

  sim = createOp(mini({ id: 'cut', kind: 'incision', x: 0, z: 0, len: 0.7, dx: 1, dz: 0 }));
  for (let x = 0; x <= 0.75; x += 0.05) {
    step(sim, { 0: { place: true, x, z: 0, tool: 'scalpel', use: true } }, DT);
  }
  check('scalpel CLEAN', ent(sim, 'cut')?.done === true && rated(sim, 'CLEAN'));

  sim = createOp(mini({ id: 'cut2', kind: 'incision', x: 0, z: 0, len: 1.2, dx: 1, dz: 0 }));
  step(sim, { 0: { place: true, x: 0, z: 0, tool: 'scalpel', use: true } }, DT);
  step(sim, { 0: { place: true, x: 0.15, z: 1.0, tool: 'scalpel', use: true } }, DT);
  check('scalpel off path MISTAKE', rated(sim, 'MISTAKE') && sim.entities.some((e) => e.kind === 'pool' && e.id !== 'cut2'));

  sim = createOp(mini({ id: 'w', kind: 'wound', x: 0, z: 0, len: 0.9, dx: 1, dz: 0 }));
  const wound = ent(sim, 'w');
  let side = 1;
  for (const slot of wound.slots) {
    const along = slot.at;
    step(sim, { 0: { place: true, x: along, z: 0.48 * side, tool: 'suture', use: true } }, DT);
    run(sim, { place: true, x: along, z: 0.48 * side, tool: 'suture', use: true }, 28);
    side *= -1;
    step(sim, { 0: { place: true, x: along, z: 0.48 * side, tool: 'suture', use: true } }, DT);
  }
  check('suture done', ent(sim, 'w')?.done === true);

  sim = createOp(mini({ id: 'poly', kind: 'polyp', x: 0, z: 0 }));
  run(sim, { place: true, x: 0, z: 0, tool: 'laser', use: true }, 50);
  check('laser CLEAN', ent(sim, 'poly')?.done === true && rated(sim, 'CLEAN'));

  sim = createOp(mini({ id: 'keep', kind: 'pool', x: 3, z: 0, r: 0.4 }));
  run(sim, { place: true, x: 0, z: 0, tool: 'laser', use: true }, 40);
  check('laser stray MISTAKE', rated(sim, 'MISTAKE') && sim.mistakes >= 1);

  sim = createOp(mini({ id: 'hid', kind: 'cyst', x: 0.4, z: 0.2, hidden: true, real: true }));
  step(sim, { 0: { place: true, x: 0.4, z: 0.2, tool: 'scanner', use: true } }, DT);
  check('scanner reveal', ent(sim, 'hid')?.hidden === false && ent(sim, 'hid')?.marked === true);

  sim = createOp(mini({ id: 'g', kind: 'gel', x: 0, z: 0, w: 0.6, h: 0.4 }));
  run(sim, { place: true, x: 0, z: 0, tool: 'gel', use: true }, 5);
  check('gel CLEAN', ent(sim, 'g')?.done === true && rated(sim, 'CLEAN'));

  const ringKeep = [
    { id: 'ring', kind: 'ring', x: 0, z: 0, optional: true },
    { id: 'keep2', kind: 'hook', x: 4, z: 0, pull: 1.2, dx: 0, dz: 1 },
  ];
  sim = createOp(mini(ringKeep));
  const v0 = sim.tables[0].vitals;
  run(sim, { place: true, x: 0, z: 0, tool: 'syringe', use: true }, 30);
  step(sim, { 0: { place: true, x: 0, z: 0, tool: 'syringe', use: false } }, DT);
  check('syringe inside', sim.doses === 2 && approx(sim.tables[0].vitals, v0 + getConfig().syringeDose, 0.02) && rated(sim, 'CLEAN'));

  sim = createOp(mini(ringKeep));
  const v1 = sim.tables[0].vitals;
  run(sim, { place: true, x: 3.2, z: 3, tool: 'syringe', use: true }, 30);
  step(sim, { 0: { place: true, x: 3.2, z: 3, tool: 'syringe', use: false } }, DT);
  check('syringe outside', sim.doses === 2 && approx(sim.tables[0].vitals, v1, 0.02) && rated(sim, 'SLOPPY'));

  sim = createOp(mini({ id: 'fr', kind: 'fragment', x: 0, z: 0, ang: 0, targetAng: 40 }));
  step(sim, { 0: { place: true, x: 0, z: 0, tool: 'forceps', use: true } }, DT);
  step(sim, { 0: { place: true, x: 0, z: 0, tool: 'forceps', use: false, angle: 40 } }, DT);
  check('fragment within 5 CLEAN', ent(sim, 'fr')?.done === true && rated(sim, 'CLEAN'));

  sim = createOp(mini({ id: 'beat', kind: 'incision', x: 0, z: 0, len: 0.8, dx: 1, dz: 0, window: 'diastole' }, { heart: true }));
  step(sim, { 0: { place: true, x: 0, z: 0, tool: 'scalpel', use: true } }, DT);
  check('systole SLOPPY', sim.diastole === false && rated(sim, 'SLOPPY') && !(ent(sim, 'beat')?.maxAlong > 0));

  sim = createOp(mini({ id: 'anchor', kind: 'pool', x: 3, z: 0, r: 0.5 }));
  run(sim, { place: true, x: 0, z: 0, tool: 'laser', use: true }, 200);
  check('fifth mistake fails', sim.phase === 'lost' && sim.reason === 'mistakes' && sim.mistakes >= 5);
}

function testGifts() {
  resetConfig();
  let sim = createOp(mini({ id: 'p', kind: 'pool', x: 0, z: 0, r: 0.7 }, { vitals: { start: 70, drain: 0.4 } }));
  sim.composure = 100;
  const v = sim.tables[0].vitals;
  const t = sim.timeLeft;
  run(sim, { gift: true, place: true, x: 1, z: 1, tool: 'forceps' }, 60);
  check('quiet timescale', approx(t - sim.timeLeft, 0.25, 0.03));
  check('quiet holds vitals', approx(sim.tables[0].vitals, v, 0.02));
  check('quiet drains composure', approx(sim.composure, 82, 0.6));

  sim = createOp(mini({ id: 'p', kind: 'pool', x: 0, z: 0, r: 1.1 }, { surgeon: 'sabine', time: 100 }));
  sim.composure = 100;
  run(sim, { place: true, x: 1, z: 1, tool: 'forceps', use: false }, 260);
  ent(sim, 'p').r = 0.31;
  sim.score = 999;
  sim.mistakes = 2;
  sim.timeLeft = 11;
  const target = sim.realT + DT - sim.config.lookSeconds;
  let sample = null;
  for (const h of sim.hist) if (h.t <= target + 1e-6) sample = h;
  check('look has a sample', !!sample);
  step(sim, { 0: { gift: true, place: true, x: 3, z: -2, tool: 'forceps' } }, DT);
  const back = ent(sim, 'p');
  const snapEnt = sample?.data.entities.find((e) => e.id === 'p');
  check('look restores score', sim.score === sample?.data.score);
  check('look restores clock', sim.timeLeft === sample?.data.timeLeft);
  check('look restores mistakes', sim.mistakes === sample?.data.mistakes);
  check('look restores pool', !!back && !!snapEnt && approx(back.r, snapEnt.r, 0.001));
  check('look leaves the cursor', approx(sim.seats[0].x, 3, 0.001) && approx(sim.seats[0].z, -2, 0.001));

  sim = createOp(mini({ id: 'p', kind: 'pool', x: 2, z: 0, r: 0.5 }));
  devCheat(sim, 'blue');
  for (let i = 0; i < 500 && sim.phase === 'codeblue'; i++) {
    const half = (sim.config.blueZone || 0.2) / 2;
    const inZone = Math.abs(sim.code.needle - 0.5) <= half - 0.01;
    step(sim, { 0: { charge: !inZone } }, DT);
  }
  check('code blue success', sim.phase === 'play' && sim.tables[0].vitals === 25 && sim.flags.blueDone === true);

  sim = createOp(mini({ id: 'p', kind: 'pool', x: 2, z: 0, r: 0.5 }));
  devCheat(sim, 'blue');
  run(sim, {}, 760);
  check('code blue timeout', sim.phase === 'lost' && sim.reason === 'codeblue');
}

function testRankSlidersCodec() {
  resetConfig();
  check('rank S', rankFor(85, 100) === 'S');
  check('rank A', rankFor(70, 100) === 'A' && rankFor(84.9, 100) === 'A');
  check('rank B', rankFor(50, 100) === 'B' && rankFor(69, 100) === 'B');
  check('rank C', rankFor(49, 100) === 'C');
  check('rank cap', rankFor(100, 100, 'A') === 'A');

  const live = getConfig();
  const before = live.drainRate;
  try {
    applySlider('drainRate', 2.2);
    check('slider apply', getConfig().drainRate === 2.2);
    let threw = false;
    try { applySlider('not-a-slider', 1); } catch { threw = true; }
    check('slider rejects unknown', threw);
    resetConfig();
    check('slider reset', getConfig().drainRate === before);
  } finally {
    resetConfig();
  }

  const op1 = ALL_OPS.find((o) => o.id === 'op1');
  check('same seed hash', sameHash(op1).length > 0);

  const sim = createOp(mini([
    { id: 'p', kind: 'pool', x: 0.25, z: -0.4, r: 0.8 },
    { id: 'g', kind: 'gel', x: 1, z: 0.2, w: 1.2, h: 0.8 },
  ]));
  ent(sim, 'g').cells[0].on = 1;
  ent(sim, 'g').cells[2].on = 1;
  sim.score = 40;
  sim.mistakes = 1;
  sim.doses = 2;
  sim.timeLeft = 55.5;
  const packed = encodeFast(sim);
  const view = decodeState(packed);
  ent(sim, 'p').r = 0.2;
  ent(sim, 'p').x = 4;
  sim.score = 1;
  sim.timeLeft = 3;
  sim.mistakes = 4;
  sim.doses = 0;
  applyDecoded(sim, packed);
  check('codec round trip',
    ent(sim, 'p').done === false
    && approx(ent(sim, 'p').x, 0.25, 0.03)
    && approx(ent(sim, 'p').r, 0.8, 0.03)
    && sim.score === 40
    && sim.mistakes === 1
    && sim.doses === 2
    && approx(sim.timeLeft, 55.5, 0.06)
    && view.entities.find((e) => e.id === 'g').gel === ((1 << 0) | (1 << 2)));

  let peakFast = 0;
  let peakKey = 0;
  for (const def of ALL_OPS) {
    const played = play(def, 1, { seed: 1, codec: true });
    if (played._peakFast > peakFast) peakFast = played._peakFast;
    if (played._peakKey > peakKey) peakKey = played._peakKey;
  }
  check('fast snapshot under 1100', peakFast > 0 && peakFast < 1100);
  check('key snapshot under 16384', peakKey > 0 && peakKey < 16384);

  const retry = createOp(mini({ id: 'p', kind: 'pool', x: 0, z: 0, r: 0.85 }));
  const r0 = ent(retry, 'p').r;
  ent(retry, 'p').r = 0.3;
  step(retry, { 0: { place: true, x: 2.2, z: -1.1, tool: 'drain', use: false } }, DT);
  retryStage(retry);
  check('retry restores pool and keeps cursor',
    approx(ent(retry, 'p').r, r0, 0.001)
    && approx(retry.seats[0].x, 2.2, 0.001)
    && approx(retry.seats[0].z, -1.1, 0.001)
    && retry.persist.rankCap === 'B');
  void hashSim;
}

function stageOf(def, id) {
  return def.stages.findIndex((st) => (st.spawn || []).some((s) => s.id === id));
}

function testBalance(print) {
  resetConfig();
  for (const def of ALL_OPS) {
    const idle = play(def, 0, { seed: 1 });
    check(`${def.id} idle fails`, idle.phase === 'lost');
    if (['op1', 'op2', 'op3'].includes(def.id)) {
      const low = play(def, 0.4, { seed: 1 });
      check(`${def.id} skill 0.4 clears`, low.phase === 'won');
    }
    const mid = play(def, 0.7, { seed: 1 });
    const clock = mid.timeLeft / mid.timeMax;
    const rankOk = mid.rank === 'S' || mid.rank === 'A' || mid.rank === 'B';
    check(`${def.id} skill 0.7 clears`, mid.phase === 'won' && rankOk);
    if (!BOSSES.has(def.id)) check(`${def.id} skill 0.7 clock`, mid.phase === 'won' && clock >= 0.2);
    let sawLie = false;
    const full = play(def, 1, { seed: 1, onFrame(s) { if (s.lie && s.shown === 99) sawLie = true; } });
    check(`${def.id} skill 1 S`, full.phase === 'won' && full.rank === 'S' && full.finalScore === def.par);
    if (print) {
      console.log(`${def.id} par ${def.par} skill1 ${full.finalScore} ${full.rank} left ${Math.floor(full.timeLeft)} skill0.7 ${mid.finalScore} ${mid.rank}`);
    }
    if (def.id === 'op1') {
      check('op1 twelfth hook', ent(full, 'h12')?.done === true && stageOf(def, 'h12') > stageOf(def, 'h1'));
    }
    if (def.id === 'op2') {
      const tumor = stageOf(def, 'tumor');
      const prop = def.stages.findIndex((st) => (st.spawn || []).some((s) => s.kind === 'prop' || s.kind === 'magnet'));
      check('op2 tumour after props', tumor > prop && prop >= 0);
    }
    if (def.id === 'op3') check('op3 three tables and quiet', full.tables.length === 3 && full.persist.quietUnlocked === true);
    if (def.id === 'op4') check('op4 fragments', full.entities.filter((e) => e.kind === 'fragment' && e.done).length >= 6);
    if (def.id === 'op5') check('op5 knock', full.flags.knocked === true);
    if (def.id === 'op6') check('op6 rewind and pink', full.persist.rewound === true && full.persist.clotSeen === true && full.flags.pink === true);
    if (def.id === 'op7') check('op7 sob and stalk', (full.strain?.sobs || 0) >= 3 && full.entities.some((e) => e.kind === 'stalk' && e.done));
    if (def.id === 'op8') check('op8 shock and massage', full.flags.blueDone === true && full.flags.massaged === true);
    if (def.id === 'op9') {
      check('op9 lie was up', sawLie);
      check('op9 copy and tether', full.flags.copied === true && full.entities.some((e) => e.kind === 'tether' && e.done));
    }
    if (def.id === 'op10') {
      const start = Array.isArray(def.vitals.start) ? def.vitals.start[0] : def.vitals.start;
      check('op10 pain and vitals', full.pain > 0 && full.tables[0].vitals > start);
    }
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'vendor' || name === 'packs' || name === 'examples') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|html|md)$/.test(name) && !name.includes('pixel-engine')) out.push(p);
  }
  return out;
}

const FONT = /^[A-Za-z0-9 .,;:!?\-+%/()[\]'"#&*=<>]*$/;

function testContent() {
  const banned = [String.fromCharCode(84, 79, 68, 79), 'place' + 'holder', 'st' + 'ub'];
  const names = ['Derek Stiles', 'Angie Thompson', 'Naomi Kimishima', 'Nozomi Weaver', 'Hope Hospital', 'Caduceus', 'Delphi', 'GUILT', 'Healing Touch', 'Kyriaki', 'Deftera', 'Triti', 'Tetarti', 'Pempti', 'Paraskevi', 'Savato'];
  const files = walk(join(root, 'src')).concat(walk(join(root, 'docs')), [join(root, 'game.js')]).filter((p) => !p.endsWith('run.mjs'));
  let bad = '';
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const word of banned) if (text.includes(word)) bad = `${file} ${word}`;
    for (const word of names) if (text.includes(word)) bad = `${file} ${word}`;
  }
  check('shipped source is clean', bad === '');
  if (bad) fails[fails.length - 1] = fails[fails.length - 1] + ' ' + bad;

  const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
  const labels = ABOUT_FIELDS.map(([label]) => label);
  check('about fields', keys.every((k) => SOURCE_INFORMATION[k]) && labels.includes('Usage') && labels.includes('Source') && labels.includes('Genre and Perspective'));
  check('usage string', SOURCE_INFORMATION.usage === 'added on import');
  check('hub card', AI_HUB.genre === 'Simulation' && AI_HUB.series === 'Trauma Center' && AI_HUB.players === '1\u20134');
  check('feedback counts', TESTING_FEEDBACK.length === 4 && ENGINE_FEEDBACK.length === 6 && PROMPT_FEEDBACK.length === 4 && ENGINE_FEEDBACK[4] === 'none');

  let storyBad = '';
  for (const scene of SCENES) {
    if (scene.lines.length < 8 || scene.lines.length > 16) storyBad = `${scene.id} lines ${scene.lines.length}`;
    for (const row of scene.lines) {
      if (!CAST[row.who]) storyBad = `${scene.id} who ${row.who}`;
      if (row.say.length > 57 || !FONT.test(row.say)) storyBad = `${scene.id} say ${row.say}`;
    }
  }
  check('story lines', storyBad === '');
  if (storyBad) fails[fails.length - 1] = fails[fails.length - 1] + ' ' + storyBad;

  const played = playCampaign({ skill: 1, seed: 1 });
  const ids = SCENES.map((s) => s.id);
  check('campaign scenes', ids.every((id) => played.save.scenes.includes(id)));
  check('campaign ops', ALL_OPS.filter((op) => op.n <= 10).every((op) => played.save.ops[op.id]?.won === true));
  check('campaign log', played.save.log === true && played.save.credits === true && played.save.quiet === true);

  const board = buildStandings([{ id: 0 }, { id: 1 }, { id: 2 }], (p) => [10, 40, 40][p.id]);
  check('standings order', JSON.stringify(board.standings) === '[[1,2],[0]]' && board.scores[1] === 40);
}

function finiteBuf(buf) {
  if (!buf || !buf.length) return false;
  for (let i = 0; i < buf.length; i++) if (!Number.isFinite(buf[i])) return false;
  return true;
}

function testAudio() {
  const notes = [];
  for (const [name, song] of Object.entries(SONGS)) {
    let ok = true;
    try { parseSong(song); } catch { ok = false; }
    check(`song ${name}`, ok);
    notes.push(`${name} ${ok ? 'parsed' : 'bad'}`);
  }
  const voice = voicePcm('ilya', 'The truth, stat.');
  const effect = effectBuffer();
  const voiceRms = rms(voice);
  const effectRms = rms(effect);
  check('voice finite', finiteBuf(voice) && voiceRms > 0.01);
  check('effect finite', finiteBuf(effect) && effectRms > 0.01);
  const scratch = process.env.SOC_SCRATCH || '/home/micha/dev/cc-matrix/runs/grok-xhigh.build-v2__20261104-224040__x24ebb3/tmp/grok-goal-9c48352445aa/implementer';
  mkdirSync(scratch, { recursive: true });
  writeFileSync(join(scratch, 'audio.txt'), [
    `voice samples=${voice.length} rms=${voiceRms.toFixed(4)} finite=${finiteBuf(voice)}`,
    `effect samples=${effect.length} rms=${effectRms.toFixed(4)} finite=${finiteBuf(effect)}`,
    ...notes,
  ].join('\n') + '\n');
}

function shellCtx(extra = {}) {
  const down = extra.down || {};
  const pressed = new Set(extra.pressed || []);
  const nop = () => {};
  return {
    input: {
      gamepadButtons: {},
      preventKeys: { add: nop },
      wasPressed: (key) => pressed.has(key),
      isDown: (key) => !!down[key],
      mouseDelta: extra.mouseDelta || { x: 0, y: 0 },
      pointer: extra.pointer || { x: 0.2, y: -0.1, over: true },
      wheel: 0,
    },
    audio: { volume: { music: 0.1 }, playMusic: nop, stopLoops: nop, play: nop, register: nop, setVolume: nop },
    hud: { width: 480, height: 270, clear: nop, text: nop, rect: nop, sprite: nop, measure: () => ({ width: 12 }) },
    camera: {
      camera: { position: { set: nop }, lookAt: nop },
      rayAt(_x, _y, o, d) {
        o.set(2.2, 6, -0.8);
        d.set(0, -1, 0);
      },
    },
  };
}

function fakeHub({ isHost, me }) {
  const on = {};
  let t = -1;
  const hub = {
    isHost,
    me,
    host: 0,
    round: 0,
    players: [{ id: 0, name: 'A' }, { id: 1, name: 'B' }],
    sent: [],
    rng() { return () => 0.2; },
    time() { return t; },
    setTime(n) { t = n; },
    send(data, opts) { hub.sent.push({ data, opts }); },
    on(ev, fn) { (on[ev] = on[ev] || []).push(fn); },
    emit(ev, data) { (on[ev] || []).forEach((fn) => fn(data)); },
    finish() {},
    fail() {},
    probe() {},
  };
  return hub;
}

function testHands() {
  const clinic = new Clinic();
  clinic.beginOp('op1', { seed: 1 });
  clinic.device = 'mouse';
  clinic.humanInput = { place: true, x: -3.1, z: -1.1, use: true, tool: 'drain' };
  clinic.padInputs = { 0: { sx: 0, sz: 0, use: false } };
  const pool = clinic.sim.entities.find((e) => e.id === 'p1');
  const r0 = pool.r;
  for (let i = 0; i < 40; i++) clinic.fixedUpdate({}, 1 / 60);
  check('idle pad yields to mouse', pool.r < r0 - 0.05);

  const keys = new Clinic();
  keys.beginOp('op1', { seed: 1 });
  keys.device = 'key';
  keys.humanInput = { sx: 1, sz: 0, use: false };
  keys.padInputs = { 0: { sx: 0, sz: 0, use: false } };
  const x0 = keys.sim.seats[0].x;
  for (let i = 0; i < 20; i++) keys.fixedUpdate({}, 1 / 60);
  check('idle pad yields to keys', keys.sim.seats[0].x > x0 + 0.2);

  const couch = new Clinic();
  couch.beginOp('op1', { seed: 1, seats: 2, consult: true });
  couch.device = 'mouse';
  couch.humanInput = { sx: 1, sz: 0, use: false };
  couch.padInputs = { 0: { sx: -1, sz: 0, use: false }, 1: { sx: -1, sz: 0, use: false } };
  const left0 = couch.sim.seats[0].x;
  const right0 = couch.sim.seats[1].x;
  for (let i = 0; i < 20; i++) couch.fixedUpdate({}, 1 / 60);
  check('last device keeps the other pad', couch.sim.seats[0].x > left0 + 0.2 && couch.sim.seats[1].x < right0 - 0.2);

  const stick = new Clinic();
  stick.beginOp('op1', { seed: 1 });
  stick.device = 'pad';
  stick.humanInput = { place: true, x: 3, z: 0, use: false };
  stick.padInputs = { 0: { sx: -1, sz: 0, use: false } };
  const stick0 = stick.sim.seats[0].x;
  for (let i = 0; i < 15; i++) stick.fixedUpdate({}, 1 / 60);
  check('pad device uses the stick', stick.sim.seats[0].x < stick0 - 0.15);

  const dev = new Clinic();
  dev.beginOp('op1', { seed: 1 });
  dev.goto('dev');
  dev.devTab = 2;
  check('jump lists ops', dev.devRows()[0] === 'LIST OPS' && dev.devRows().some((row) => row.includes('Eleven')));
  dev.nudge(1);
  check('jump list cycles to stages', dev.jumpKind === 'stage' && dev.devRows().includes('STAGE 1'));
  dev.focus = 2;
  dev.pickDev();
  check('jump stage', dev.mode === 'op' && dev.sim.stageIndex === 1 && dev.sim.entities.some((e) => e.id === 'w1'));
  dev.goto('dev');
  dev.devTab = 2;
  dev.jumpKind = 'scene';
  dev.focus = 2;
  dev.pickDev();
  check('jump scene', dev.mode === 'story' && dev.scene()?.id === 'rounds');

  const spawned = new Clinic();
  spawned.beginOp('op1', { seed: 1 });
  spawned.goto('dev');
  spawned.devTab = 3;
  const before = spawned.sim.entities.length;
  for (const label of ['Spawn pool', 'Spawn bleeder', 'Spawn laceration', 'Spawn hook', 'Spawn strain']) {
    spawned.focus = spawned.devRows().indexOf(label);
    spawned.pickDev();
  }
  const kinds = spawned.sim.entities.slice(before).map((e) => e.kind);
  check('spawn kinds', kinds.includes('pool') && kinds.includes('bleeder') && kinds.includes('wound') && kinds.includes('hook') && spawned.sim.strain?.name === 'introit');
  spawned.devTab = 4;
  const view = spawned.devRows();
  check('view tools', view.some((row) => row.startsWith('HITBOXES')) && view.some((row) => row.startsWith('BOT PLAYS')) && view.includes('FRAME STEP') && view.some((row) => row.startsWith('FPS')) && view.some((row) => row.startsWith('SIM ')));
  const t0 = spawned.sim.t;
  spawned.focus = view.indexOf('FRAME STEP');
  spawned.pickDev();
  check('frame step', spawned.sim.t > t0);
  spawned.focus = 1;
  spawned.pickDev();
  check('bot plays toggle', spawned.forceBot === true);
  spawned.focus = 3;
  spawned.nudge(1);
  check('sim speed up', Math.abs(spawned.simSpeed - 1.1) < 0.001);
  spawned.nudge(-30);
  check('sim speed floor', Math.abs(spawned.simSpeed - 0.1) < 0.001);
  spawned.nudge(40);
  check('sim speed ceiling', Math.abs(spawned.simSpeed - 3) < 0.001);
  spawned.update(shellCtx(), 1 / 60);
  check('fps stat', spawned.devRows().some((row) => row.startsWith('FPS') && Number(row.slice(4)) > 10));
  const prevLog = console.log;
  let copied = '';
  console.log = (line) => { copied += String(line); };
  try {
    spawned.devTab = 3;
    spawned.focus = spawned.devRows().indexOf('Copy op JSON');
    spawned.pickDev();
  } finally {
    console.log = prevLog;
  }
  check('copy op json', copied.includes('op1'));
  testHandsOnInput();
}

function press(clinic, key) {
  clinic.update(shellCtx({ pressed: key ? [key] : [], down: key ? { [key]: true } : {} }), 1 / 60);
}

function withIdlePad(fn) {
  const nav = globalThis.navigator;
  const prev = nav.getGamepads;
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  nav.getGamepads = () => [{ connected: true, index: 0, mapping: 'standard', axes: [0, 0, 0, 0], buttons }];
  try {
    fn();
  } finally {
    if (prev) nav.getGamepads = prev;
    else delete nav.getGamepads;
  }
}

function aimAt(clinic, x, z) {
  const ctx = shellCtx({
    mouseDelta: { x: 0, y: 0 },
    pointer: { x: 0.2, y: -0.15, over: true },
    down: { MouseLeft: true },
  });
  ctx.camera.rayAt = (_px, _py, o, d) => {
    o.set(x, 6, z);
    d.set(0, -1, 0);
  };
  return ctx;
}

/** Last device, Dev Mode, through readInput. An idle connected pad must not win. */
function testHandsOnInput() {
  withIdlePad(() => {
    const clinic = new Clinic();
    clinic.beginOp('op1', { seed: 1 });
    const pool = clinic.sim.entities.find((e) => e.id === 'p1');
    const r0 = pool.r;
    const first = aimAt(clinic, pool.x, pool.z);
    first.input.mouseDelta = { x: 4, y: 0 };
    clinic.update(first, 1 / 60);
    clinic.fixedUpdate(first, 1 / 60);
    for (let i = 0; i < 40; i++) {
      const held = aimAt(clinic, pool.x, pool.z);
      clinic.update(held, 1 / 60);
      clinic.fixedUpdate(held, 1 / 60);
    }
    check('input path idle pad yields to mouse', pool.r < r0 - 0.05 && clinic.device === 'mouse');

    const keys = new Clinic();
    keys.beginOp('op1', { seed: 1 });
    const x0 = keys.sim.seats[0].x;
    press(keys, 'KeyD');
    keys.fixedUpdate({}, 1 / 60);
    for (let i = 0; i < 20; i++) {
      keys.update(shellCtx({ down: { KeyD: true } }), 1 / 60);
      keys.fixedUpdate({}, 1 / 60);
    }
    check('input path idle pad yields to keys', keys.device === 'key' && keys.sim.seats[0].x > x0 + 0.2);
  });

  const dev = new Clinic();
  dev.beginOp('op1', { seed: 1 });
  dev.mode = 'pause';
  dev.focus = 4;
  press(dev, 'Enter');
  check('input path opens dev', dev.mode === 'dev' && dev.devTab === 0);
  press(dev, 'KeyE');
  press(dev, 'KeyE');
  check('input path jump tab', dev.devTab === 2 && dev.devRows()[0] === 'LIST OPS');
  press(dev, 'ArrowRight');
  check('input path stage list', dev.jumpKind === 'stage' && dev.devRows().includes('STAGE 1'));
  press(dev, 'ArrowDown');
  press(dev, 'ArrowDown');
  press(dev, 'Enter');
  check('input path jump stage', dev.mode === 'op' && dev.sim.stageIndex === 1);

  press(dev, 'Escape');
  press(dev, 'ArrowDown');
  press(dev, 'ArrowDown');
  press(dev, 'ArrowDown');
  press(dev, 'ArrowDown');
  press(dev, 'Enter');
  press(dev, 'KeyE');
  press(dev, 'KeyE');
  press(dev, 'KeyE');
  const before = dev.sim.entities.length;
  for (let i = 0; i < 4; i++) press(dev, 'ArrowDown');
  press(dev, 'Enter');
  for (let i = 0; i < 4; i++) {
    press(dev, 'ArrowDown');
    press(dev, 'Enter');
  }
  const spawned = dev.sim.entities.slice(before).map((e) => e.kind);
  check('input path spawn kinds', dev.devTab === 3 && spawned.includes('pool') && spawned.includes('bleeder') && spawned.includes('wound') && spawned.includes('hook') && dev.sim.strain?.name === 'introit');
  press(dev, 'KeyE');
  const t0 = dev.sim.t;
  for (let i = 0; i < 4; i++) press(dev, 'ArrowDown');
  press(dev, 'Enter');
  check('input path frame step', dev.devTab === 4 && dev.sim.t > t0 && dev.devRows().some((row) => row.startsWith('FPS')) && dev.devRows().some((row) => row.startsWith('SIM ')));

  const scenes = new Clinic();
  scenes.beginOp('op1', { seed: 1 });
  scenes.mode = 'pause';
  scenes.focus = 4;
  press(scenes, 'Enter');
  press(scenes, 'KeyE');
  press(scenes, 'KeyE');
  press(scenes, 'ArrowRight');
  press(scenes, 'ArrowRight');
  check('input path scene list', scenes.jumpKind === 'scene' && scenes.devRows()[0] === 'LIST SCENES');
  press(scenes, 'ArrowDown');
  press(scenes, 'ArrowDown');
  press(scenes, 'Enter');
  check('input path jump scene', scenes.mode === 'story' && scenes.scene()?.id === 'rounds');
}

function testSessionHands() {
  const hostHub = fakeHub({ isHost: true, me: 0 });
  globalThis.AIHub = hostHub;
  const hostState = openSession(hostHub);
  try {
    hostHub.setTime(0);
    hostHub.emit('start');
    hostState.pump();
    const host = new Clinic({ session: hostState });
    host.mode = 'session';
    host.update(shellCtx({ mouseDelta: { x: 1, y: 0 }, pointer: { x: 0.4, y: -0.2, over: true } }), 1 / 60);
    const aim = hostState.local.x;
    check('host keeps mouse aim', hostState.local.place === true && Math.abs(aim - 2.2) < 0.25);
    const before = hostState.sim.seats[0].x;
    hostHub.setTime(200);
    hostState.pump();
    check('host place reaches sim', Math.abs(hostState.sim.seats[0].x - aim) < 0.05 && Math.abs(hostState.sim.seats[0].x - before) > 0.5);
  } finally {
    stopSession(hostState);
  }

  const clientHub = fakeHub({ isHost: false, me: 1 });
  globalThis.AIHub = clientHub;
  const clientState = openSession(clientHub);
  try {
    clientHub.setTime(10);
    clientHub.emit('start');
    const client = new Clinic({ session: clientState });
    client.mode = 'session';
    const spawnX = clientState.sim.seats[1].x;
    client.update(shellCtx({ mouseDelta: { x: 2, y: 0 }, pointer: { x: 0.25, y: 0.05, over: true } }), 1 / 60);
    check('client mouse tip', Math.abs(client.sim.seats[1].x - 2.2) < 0.25 && Math.abs(client.sim.seats[1].x - spawnX) > 0.5);
    clientState.acc.inputAt = nowMs() - 80;
    clientState.pump();
    const packet = clientHub.sent.find((row) => row.data && row.data.t === 'i' && row.data.place);
    check('client sends place', !!packet && Math.abs(packet.data.x - client.sim.seats[1].x) < 0.05);
    const drifted = client.sim.seats[1].x;
    const snap = encodeFast(client.sim);
    snap.u[1][0] = 0;
    clientHub.emit('message', { t: 's', snap });
    const eased = client.sim.seats[1].x;
    check('client eases large drift', eased < drifted - 0.4 && eased > 0.3);
    const held = client.sim.seats[1].x;
    const near = encodeFast(client.sim);
    near.u[1][0] = Math.round((held + 0.4) * 20);
    clientHub.emit('message', { t: 's', snap: near });
    check('client keeps small drift', Math.abs(client.sim.seats[1].x - held) < 0.001);

    const keyed = new Clinic({ session: clientState });
    keyed.mode = 'session';
    const from = clientState.sim.seats[1].x;
    keyed.update(shellCtx({ pressed: ['KeyD'], down: { KeyD: true } }), 1 / 60);
    check('client stick tip', keyed.sim.seats[1].x > from + 0.05);
  } finally {
    stopSession(clientState);
    delete globalThis.AIHub;
  }
}

function nowMs() {
  return globalThis.performance?.now?.() || Date.now();
}

const arg = process.argv[2] || 'default';
const want = new Set(
  arg === 'all' ? ['sim', 'content', 'audio', 'browser', 'launch', 'hub']
    : arg === 'default' ? ['sim', 'content', 'audio']
      : [arg],
);

async function main() {
  if (want.has('sim') || want.has('cal') || want.has('hands')) {
    if (!want.has('hands')) {
      testTools();
      testGifts();
      testRankSlidersCodec();
      testBalance(arg === 'cal');
    }
    if (want.has('sim') || want.has('hands')) {
      testHands();
      testSessionHands();
    }
  }
  if (want.has('content')) testContent();
  if (want.has('audio')) testAudio();
  if (want.has('browser') || want.has('launch') || want.has('hub')) {
    const live = await import('./live.mjs');
    if (want.has('browser')) await live.browser(root, check);
    if (want.has('launch')) await live.launch(root, check);
    if (want.has('hub')) await live.hub(root, check);
  }
  if (fails.length) {
    for (const f of fails) console.log('FAIL ' + f);
  }
  console.log(`${passed} passed, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
}

main();
