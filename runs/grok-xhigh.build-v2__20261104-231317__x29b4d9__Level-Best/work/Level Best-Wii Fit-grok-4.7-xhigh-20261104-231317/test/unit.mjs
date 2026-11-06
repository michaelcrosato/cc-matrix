import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wobbleAge, marblePayout, tiersOpen, medalOf } from '../src/game/score.js';
import { programmeSteps, dayPlan, DAY_TABLE } from '../src/data/programme.js';
import { eventIds } from '../src/events/index.js';
import { CHARTS, notesOf } from '../src/data/charts.js';
import { TUNING_DEFS } from '../src/data/tuning.js';
import { LINES, lineById } from '../src/data/dialogue.js';
import { memoryStorage, readSave, writeSave } from '../src/core/save.js';
import { resetRng, rng } from '../src/core/rng.js';
import { SAVE_VERSION } from '../src/data/config.js';
import { ABOUT } from '../src/data/about.js';
import { TITLE } from '../src/data/config.js';
import { assert } from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.resolve(root, '..', 'Level Best-Wii Fit-grok-4.7-xhigh-20261104-231317.html');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

function draw(label, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(rng(label));
  return out;
}

export async function unitTests() {
  const tests = [];
  const add = (name, fn) => tests.push([name, fn]);

  add('wobble age stays between 18 and 99 and falls as the handicap drops', () => {
    const ages = [0, 1, 2, 3, 4].map((day) => wobbleAge(0.6, day));
    for (const age of ages) assert(age >= 18 && age <= 99, String(age));
    assert(ages[4] < ages[0], ages.join(','));
    assert(wobbleAge(1, 4) === 18, String(wobbleAge(1, 4)));
    assert(wobbleAge(0, 0) <= 99, String(wobbleAge(0, 0)));
  });

  add('marbles pay a minimum, a medal and a first clear', () => {
    const paid = marblePayout({ seconds: 60, form: 90, firstClear: true, perMin: 2, medalScale: 1 });
    const again = marblePayout({ seconds: 60, form: 90, firstClear: false, perMin: 2, medalScale: 1 });
    assert(paid >= 2, String(paid));
    assert(paid === again + 2, `${paid} vs ${again}`);
    assert(medalOf(97) === 'suspicious', medalOf(97));
    assert(medalOf(85) === 'exemplary', medalOf(85));
    assert(medalOf(65) === 'pleasant', medalOf(65));
    assert(medalOf(40) === 'adequate', medalOf(40));
    assert(medalOf(39) === 'attended', medalOf(39));
  });

  add('tiers open from the best score', () => {
    assert(tiersOpen({}) === 1, 'empty');
    assert(tiersOpen({ 1: 64 }) === 1, '64');
    assert(tiersOpen({ 1: 65 }) === 2, '65');
    assert(tiersOpen({ 1: 90, 2: 84 }) === 2, '84');
    assert(tiersOpen({ 1: 90, 2: 85 }) === 3, '85');
  });

  add('the programme is built from the registry', () => {
    const ids = eventIds();
    assert(ids.length === 14, String(ids.length));
    for (const day of DAY_TABLE) {
      for (const id of day.classes) assert(ids.includes(id), id);
    }
    const steps = programmeSteps(ids);
    assert(steps.length === 14, steps.join(','));
    const cut = programmeSteps(ids.filter((id) => id !== 'islandLoop'));
    assert(!cut.includes('islandLoop'), 'cut event remained');
    const day = dayPlan(3, ids.filter((id) => id !== 'islandLoop'));
    assert(day.classes.includes('springboard') && !day.classes.includes('islandLoop'), day.classes.join(','));
    assert(dayPlan(9, ids).maintenance, 'maintenance');
  });

  add('charts and tuning defaults are inside their bounds', () => {
    for (const chart of Object.values(CHARTS)) {
      assert(chart.cells.length > 0, 'empty chart');
      assert(chart.cellDt > 0, 'cell');
      notesOf(chart);
    }
    for (const def of TUNING_DEFS) {
      assert(def.default >= def.min && def.default <= def.max, def.id);
      assert(def.step > 0, def.id);
    }
  });

  add('every dialogue id exists once', () => {
    const seen = new Set();
    const counts = {};
    for (const line of LINES) {
      assert(line.id && line.speaker && line.bucket && line.text, JSON.stringify(line).slice(0, 80));
      assert(!seen.has(line.id), line.id);
      seen.add(line.id);
      counts[line.speaker] = (counts[line.speaker] || 0) + 1;
      assert(lineById(line.id).text === line.text, line.id);
    }
    assert(counts.trudy >= 200, `trudy ${counts.trudy}`);
    assert(counts.stillwater >= 60, `stillwater ${counts.stillwater}`);
    assert(counts.bolster >= 60, `bolster ${counts.bolster}`);
    assert(counts.guest >= 60, `guest ${counts.guest}`);
  });

  add('a corrupt or old save is ignored', () => {
    const storage = memoryStorage();
    assert(readSave(storage, 'missing') === null, 'missing');
    storage.setItem('bad', '{');
    assert(readSave(storage, 'bad') === null, 'corrupt');
    storage.setItem('old', JSON.stringify({ version: 0, profile: { dayIndex: 3 } }));
    assert(readSave(storage, 'old') === null, 'old');
    writeSave(storage, 'ok', { profile: { dayIndex: 2 }, settings: { music: 10 } });
    const saved = readSave(storage, 'ok');
    assert(saved && saved.version === SAVE_VERSION && saved.profile.dayIndex === 2, 'round trip');
  });

  add('rng repeats for a label and a seed', () => {
    resetRng(7);
    const a = draw('class', 4);
    resetRng(7);
    const b = draw('class', 4);
    assert(a.join() === b.join(), `${a} vs ${b}`);
    resetRng(8);
    const c = draw('class', 4);
    assert(a.join() !== c.join(), 'seed ignored');
  });

  add('the session client hash matches the release', () => {
    const session = readFileSync(path.join(root, 'vendor/session.js'), 'utf8').replace(/\r\n/g, '\n');
    const end = '})(typeof window !== \'undefined\' ? window : globalThis);';
    const start = session.indexOf('/*! aihub-session ');
    const hash = createHash('sha256').update(session.slice(start, session.indexOf(end) + end.length)).digest('hex');
    assert(hash === '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a', hash);
  });

  add('exit-interview.json matches the task shape and the about screen data', () => {
    const json = JSON.parse(readFileSync(path.resolve(root, '..', 'exit-interview.json'), 'utf8'));
    const keys = ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'];
    assert(JSON.stringify(Object.keys(json)) === JSON.stringify(keys), Object.keys(json).join(','));
    const infoKeys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    assert(JSON.stringify(Object.keys(json.sourceInformation)) === JSON.stringify(infoKeys), Object.keys(json.sourceInformation).join(','));
    for (const key of infoKeys) {
      assert(json.sourceInformation[key] !== '' || key === 'usage', key);
    }
    assert(json.sourceInformation.usage === 'added on import', json.sourceInformation.usage);
    assert(json.testingFeedback.length === 4, 'testing');
    assert(json.engineFeedback.length === 6, 'engine');
    assert(json.promptFeedback.length === 4, 'prompt');
    for (const list of [json.testingFeedback, json.engineFeedback, json.promptFeedback]) {
      for (const line of list) assert(String(line).trim().length > 0, 'empty feedback');
    }
    const hub = json.aiHub;
    assert(hub.name === TITLE, hub.name);
    assert(hub.type === 'Game', hub.type);
    assert(hub.genre === 'Sports', hub.genre);
    assert(hub.source === 'Wii Fit', hub.source);
    assert(hub.series === '', 'series');
    assert(hub.players === '1–4', hub.players);
    assert(hub.controls.length > 0, 'controls');
    assert(hub.tags.length >= 3 && hub.tags.length <= 6, 'tags');
    for (const tag of hub.tags) assert(tag === tag.toLowerCase() && !/\s/.test(tag), tag);
    assert(JSON.stringify(ABOUT) === JSON.stringify(json), 'about.js drifted from exit-interview.json');
  });

  add('source stays inside the rules', () => {
    const files = walk(path.join(root, 'src'));
    const banned = [
      [/Math\.random/, 'Math.random'],
      [/\bTODO\b/, 'TODO'],
      [/\bFIXME\b/, 'FIXME'],
      [/placeholder/i, 'placeholder'],
      [/\bstub\b/i, 'stub'],
      [/\balert\s*\(/, 'alert'],
      [/\bconfirm\s*\(/, 'confirm'],
      [/\bprompt\s*\(/, 'prompt'],
      [/window\.open/, 'window.open'],
      [/WebSocket/, 'WebSocket'],
      [/RTCPeerConnection/, 'RTCPeerConnection'],
      [/decodeAudioData/, 'decodeAudioData'],
      [/\.(mp3|ogg|wav|flac|aac)\b/i, 'audio file'],
      [/\.compute\s*\(/, 'compute'],
    ];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const rel = path.relative(root, file);
      for (const [re, label] of banned) {
        if (rel === 'src/core/rng.js' && label === 'Math.random') continue;
        if (re.test(text)) assert(false, `${rel} contains ${label}`);
      }
      if (rel !== 'src/data/about.js' && /wii|mii\b|balance board/i.test(text)) {
        assert(false, `${rel} names the source`);
      }
    }
  });

  add('the built page carries the hub client, the metas and no stubs', () => {
    assert(existsSync(htmlPath), 'built HTML is missing');
    const html = readFileSync(htmlPath, 'utf8');
    assert(html.startsWith('<!doctype html>'), 'doctype');
    const head = html.slice(0, 400);
    assert(head.includes('<meta charset="utf-8"><script>'), 'client is not first');
    assert(html.indexOf('<meta charset="utf-8"><script>') < html.indexOf('hub:session'), 'metas before client');
    const metas = [
      ['hub:session', '1'],
      ['hub:session-players', '1-4'],
      ['hub:session-mode', 'ghost'],
      ['hub:session-minutes', '3'],
      ['hub:session-goal', 'Stay balanced through the class: highest score wins'],
      ['hub:session-howto', 'Lean: stick, WASD or mouse. Feet: L2 R2, Q E or clicks. Flail: Square or F'],
      ['hub:session-type', 'Game'],
      ['hub:session-source', 'Wii Fit'],
    ];
    for (const [name, content] of metas) {
      assert(html.includes(`<meta name="${name}" content="${content}">`), name);
    }
    assert(!html.includes('hub:webgpu'), 'webgpu required meta');
    const bundle = html.slice(html.lastIndexOf('<script>') + 8);
    const closer = bundle.indexOf('</script>');
    assert(closer > 0, 'bundle script');
    assert(!bundle.slice(0, closer).includes('</script'), 'script broke out');
    assert(!/\bTODO\b|\bFIXME\b|placeholder|\bstub\b/i.test(html), 'built file has a stub word');
    assert(html.includes('data:font/woff2;base64,'), 'font');
    assert(html.includes('__LEVEL_BEST_WASM__'), 'wasm');
    assert(!/https?:\/\//.test(html.replace(/http:\/\/www\.w3\.org/g, '')), 'external request');
  });

  return tests;
}
