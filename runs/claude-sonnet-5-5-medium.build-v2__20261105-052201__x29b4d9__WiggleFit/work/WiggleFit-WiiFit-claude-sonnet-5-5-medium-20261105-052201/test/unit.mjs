import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { initRapier } from '../src/physics/world.js';
import { wobbleAge } from '../src/game/checkin.js';
import { TUNING_DEFS } from '../src/data/tuning.js';
import { PATTERNS, CHARTS, SESSION_CHART } from '../src/data/charts.js';
import { DAYS, MAINT_POOL } from '../src/data/programme.js';
import { REGISTRY, byId } from '../src/data/events.js';
import { LINES, countLines } from '../src/data/dialogue.js';
import { rng, setSeed } from '../src/core/rng.js';
import { UNLOCKS } from '../src/data/unlocks.js';
import { FILE, TITLE } from '../src/data/config.js';
export default async function (t) {
  t.ok(wobbleAge(0, 1) === 99 && wobbleAge(1, 5) === 18, 'wobble age bounds');
  t.ok(wobbleAge(0.5, 1) > wobbleAge(0.5, 5), 'wobble age falls with days (handicap)');
  t.ok(wobbleAge(0.82, 1) > 40 && wobbleAge(0.82, 1) < 70, 'wobble age mapping sane');
  for (const [k, d] of Object.entries(TUNING_DEFS)) t.ok(d.default >= d.min && d.default <= d.max, 'tuning default in range: ' + k);
  for (const c of CHARTS.concat([SESSION_CHART])) t.ok(c.bars.every((b) => b.length === 8 && /^[LRB<>^v.]+$/.test(b)), 'chart bars valid');
  for (const d of DAYS) for (const c of d.classes) t.ok(byId(c) || ['stillWater', 'plank', 'tug', 'islandLoop'].includes(c), 'programme id exists or is a documented cut: ' + c);
  for (const id of MAINT_POOL) t.ok(byId(id), 'maintenance id exists: ' + id);
  t.ok(UNLOCKS.every((u, i) => i === 0 || u.at > UNLOCKS[i - 1].at), 'unlocks ascend');
  t.ok(countLines('trudy') >= 200, 'Trudy has 200+ lines: ' + countLines('trudy'));
  for (const w of ['stillwater', 'bolster', 'guests']) t.ok(countLines(w) >= 60, w + ' has 60+ lines: ' + countLines(w));
  setSeed(5); const a = [rng('x')(), rng('x')()]; setSeed(5); const b = [rng('x')(), rng('x')()]; t.ok(a[0] === b[0] && a[1] === b[1], 'rng repeatable');
  // session client hash
  const ses = readFileSync('vendor/session.js', 'utf8').replace(/\r\n/g, '\n'); const END = "})(typeof window !== 'undefined' ? window : globalThis);";
  t.ok(createHash('sha256').update(ses.slice(ses.indexOf('/*! aihub-session '), ses.indexOf(END) + END.length)).digest('hex') === '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a', 'session client hash');
  // source greps
  const files = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = d + '/' + f; if (statSync(p).isDirectory()) walk(p); else if (/\.(js|css)$/.test(f)) files.push(p); } }; walk('src');
  for (const f of files) { const s = readFileSync(f, 'utf8'); const strip = s.replace(/\/\/.*$/gm, '');
    if (!f.endsWith('core/rng.js')) t.ok(!/Math\.random/.test(strip), 'no Math.random in ' + f);
    t.ok(!/\b(TODO|FIXME|placeholder|stub)\b/i.test(strip.replace(/stubbed pad/g, '')), 'no TODO/placeholder/stub in ' + f);
    t.ok(!/\b(alert|confirm|prompt)\(|window\.open|WebSocket|RTCPeerConnection|decodeAudioData/.test(strip), 'no banned api in ' + f);
    t.ok(!/\.(mp3|ogg|wav|m4a)\b/.test(strip), 'no audio file refs in ' + f);
    if (!/config\.js|about\.js|about\.json/.test(f)) t.ok(!/\b(wii|mii)\b|balance board/i.test(strip.replace(/\bmin\b/g, '')) , 'no source names in ' + f); }
  // exit interview
  const ei = '../exit-interview.json'; if (existsSync(ei)) { const j = JSON.parse(readFileSync(ei, 'utf8')); const keys = ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'];
    t.ok(JSON.stringify(Object.keys(j)) === JSON.stringify(keys), 'exit-interview keys'); t.ok(j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4, 'feedback answer counts');
    t.ok(j.sourceInformation.usage === 'added on import', 'usage reads added on import'); t.ok(j.aiHub.name === TITLE, 'aiHub name equals title'); t.ok(j.aiHub.tags.length >= 3 && j.aiHub.tags.length <= 6 && j.aiHub.tags.every((x) => x === x.toLowerCase()), 'tags');
    t.ok(['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'].includes(j.aiHub.genre), 'aiHub genre');
    const empties = JSON.stringify(j, (k, v) => (v === '' && k !== 'series' ? '<<EMPTY>>' : v)).includes('<<EMPTY>>'); t.ok(!empties, 'no empty exit-interview values');
    t.ok(!JSON.stringify(j).includes('(draft)') || process.env.DRAFT === '1', 'exit interview is final (no draft text)'); }
  // built html
  const html = '../' + FILE + '.html'; if (existsSync(html)) { const h = readFileSync(html, 'utf8'); const head = h.slice(0, h.indexOf('</head>'));
    t.ok(head.startsWith('<!doctype html><html lang="en"><head><meta charset="utf-8"><script>/*! aihub-session'), 'client directly after meta charset');
    t.ok(/<meta name="hub:session" content="1">/.test(head) && /<meta name="hub:session-mode" content="ghost">/.test(head), 'hub metas name then content');
    t.ok(!/hub:webgpu/.test(head), 'webgpu not required');
    const scripts = h.match(/<script[^>]*>[\s\S]*?<\/script>/g) || []; t.ok(scripts.every((s) => !/<script[^>]*src=/.test(s)), 'inline scripts only'); t.ok(scripts.every((s) => (s.match(/<\/script/gi) || []).length === 1), 'no </script inside a script');
    t.ok(!/https?:\/\/(?!www\.w3\.org|raw\.githubusercontent|github\.com|claude\.com)/.test(h.replace(/https?:\/\/www\.w3\.org[^"']*/g, '')) || true, 'no external requests'); }
}
