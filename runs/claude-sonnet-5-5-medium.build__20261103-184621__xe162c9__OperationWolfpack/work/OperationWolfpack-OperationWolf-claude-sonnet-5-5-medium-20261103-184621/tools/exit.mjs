// One source of truth for the Source Information, feedback sections and AI Hub fields:
// writes src/80-about.js (the in-game About screen) and ../exit-interview.json, then checks the JSON parses.
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = process.argv[2] || '301';
const src = {
  date: '2026-11-03 18:46:21',
  source: 'Operation Wolf (Taito, 1987)',
  plan: 'PLAN.md (written by claude-opus-5-5 at max effort). Followed for the title, systems and architecture; TASK.md won where they differed (file names). Scope cut to four operations.',
  genre: 'Light-gun rail shooter (shooting gallery), with boss fights and co-op',
  perspective: 'First person on a scripted rail; free crosshair, the camera never follows it',
  tech: 'my-3D2dge v0.85.2 handoff (full engine, one file, no dependencies), its Mode7 depth view, Humanoid rigs, Arcade, Menu, Backdrop; plain JavaScript in one namespace; AI Hub session client 1.4.0; Playwright 1.63.0 and headless Chromium for browser checks; Node 24 for headless tests',
  artDirection: 'The engine native look: HD Humanoid rigs drawn as pixel art on a 480x270 Mode 7 world with a perspective floor, sky, fog and billboards. New procedural pixel art for jeeps, boats, helicopters, tank, gunboat, radio truck, stilt-frame for the General, props, pickups, projectiles, telegraph rings, crosshairs and the first-person SMG',
  animation: 'The engine rig system (walk, run, point, die, kneel poses, expressions, portraits) as the base, plus new animation: popup-from-cover rise, telegraph rings closing, SMG recoil and reload, rotor spin, boss phases and stagger, pickups bobbing, explosions and smoke from a particle store',
  audio: 'All in code. Layered chip sound effects through the engine synth, songs as note data (title, four operations, boss, victory, game over) with square, pulse, triangle, saw and drum tracks, and Animalese style gibberish voices made of one blip per typed letter, with a different pitch per speaker. No audio files',
  online: 'AI Hub shared-world co-op for 1 to 4 players using lib/hub client 1.4.0: the host runs the simulation, clients send crosshair inputs at 20 Hz and receive snapshots at 14 Hz with events. Passed the hub harness conformance for 2, 3 and 4 players and for the host leaving. Local co-op on one machine: a second to fourth controller joins with Options',
  testing: 'Headless Node tests of the simulation, data and whole game flow (about ' + T + ' checks behind one command, including a scripted bot playthrough of all four operations, the attract loop and the dev screen), browser runs with Playwright (real keyboard and mouse, a faked DualSense pad, touch emulation), the AI Hub harness conformance, and screenshots for what scripts cannot check. No subagents',
  research: 'Read TASK.md, PLAN.md (its research summary of the 1987 arcade original) and the engine API card; no further web research on the source',
  environment: 'Claude Code CLI (headless); Linux; browser unknown (tested in headless Chromium through Playwright)',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
  usage: 'unknown'
};
const testing = [
  'About 10 issues: the simulation checks and the bot playthrough caught 5, the AI Hub harness caught 1, and screenshots caught 4 visual ones (a boss hidden behind a hut, the General floating above the screen, the radio box covering a boss, a label over the hints).',
  '4 were game breaking: a thrown projectile overwrote its own type with its target (any rocket or shell crashed its logic), the boss weak point sat above the boss hit box so bosses could not be killed, reinforcement gunmen spawned off screen and stalled the boss from ever arriving, and online clients sent no inputs.',
  'The scripted bot playthrough of every operation to the boss and the clear screen: it found three of the four game breaking bugs, which only show when a whole run is played.',
  'The data lint (every spawn type, radio key, rig and shape exists) and the tuning slider checks: they never failed, and the screenshots of static menus, which only found cosmetic problems.'
];
const engine = [
  'The Mode 7 module with billboards: real depth and parallax for a light-gun view, rigs scaled by distance, and project and toFloor for hit tests. Also the headless Game with exact fixed steps, E.Arcade tables and initials, E.Menu with mouse hover, and the standard pause, settings and controls with glyphs that follow the last device.',
  'A little. I was unsure what coordinates a Mode 7 floor function receives with wrap on, so the painters unwrap defensively; a hat given as a plain string showed red hair under it until I gave { style, color }; a rig tinted red on hurt looked like a bug for a while; padMove is rewritten every frame, so tests cannot inject a stick and I had to fake a whole gamepad in the browser.',
  'The rail-shooter itself: screen-space hit testing through the Mode 7 projection with cover and priorities, telegraph rings, the enemy attack machine, bosses with weak points and phases, the bot, the dev screen, and the host and client networking.',
  'Making a first-person gun view out of a 2D engine without a 3D camera: sizing rigs and billboards to the view, keeping hit shapes in step with what is drawn, and keeping the online snapshot under the hub size limit.',
  'One line: the standard glyph setting now defaults to PlayStation and offers only PlayStation and Xbox. Logged in engine/CHANGES.md. Everything else was used as it came.',
  'A light-gun kit in the handoff (crosshair, shots through the Mode 7 projection, telegraphs, shoot-down targets) and a way to inject gamepad sticks and buttons in headless tests.'
];
const prompt = [
  'The 10-foot controller-first rules and the exact exit-interview shape. The plan gave exact numbers and an architecture to build on, and the attract mode, dev mode and touch-only rules were clear and testable.',
  'The plan names a dev folder and html file for another model, date and effort while TASK.md names mine; I followed TASK.md. It was also unclear whether the plan six operations were required or advisory, and what to write for usage when no figure is exposed.',
  'Covering every required system (attract, co-op, hub, dev sliders, glyphs, touch notice, About, exit interview) and balancing four operations and four bosses with no human playtester, and judging audio without hearing it.',
  'Turn the required systems into a short acceptance checklist, say plainly which parts of a plan are binding, and provide a way to check sound headless.'
];
const aiHub = {
  name: 'Operation Wolfpack', tagline: 'The pack is going in',
  description: 'A first-person rail shooter for one to four players. Spray, reload and shoot knives and rockets out of the air as the Wolfpack storms the Hyena Legion coast, spares the civilians and brings the hostages home.',
  type: 'Game', genre: 'Shooter', source: 'Operation Wolf', series: '', players: '1–4',
  controls: 'Aim with mouse, stick or WASD; fire with click, R2 or Space; grenade with right click, L2 or G; reload with R or square; Q or L1 snaps to a threat',
  tags: ['first-person', 'arcade', 'co-op', 'shooter', 'retro', 'boss fights']
};
const out = { sourceInformation: src, testingFeedback: testing, engineFeedback: engine, promptFeedback: prompt, aiHub };
const sline = o => Object.entries({ Date: o.date, Source: o.source, Plan: o.plan, 'Genre and Perspective': o.genre + '. ' + o.perspective, Tech: o.tech, 'Art Direction': o.artDirection, Animation: o.animation, Audio: o.audio, Online: o.online, Testing: o.testing, Research: o.research, Environment: o.environment, Model: o.model, Usage: o.usage }).map(([k, v]) => k + ': ' + v);
const tq = ['How many issues did testing catch?', 'How many were critical or game breaking?', 'Most helpful test?', 'Least helpful test?'];
const eq = ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'];
const pq = ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'];
const qa = (qs, as) => qs.map((q, i) => q + ' ' + as[i]);
const data = { src: sline(src), testing: qa(tq, testing), engine: qa(eq, engine), prompt: qa(pq, prompt) };
writeFileSync(path.join(root, 'src/80-about.js'), `// The About / Credits text (generated by tools/exit.mjs: the same Source Information and feedback as the chat reply and exit-interview.json).
(() => {
const WP = globalThis.WP;
WP.ABOUT_DATA = ${JSON.stringify(data, null, 1)};
WP.ABOUT_LINES = () => { const o = []; const A = WP.ABOUT_DATA;
  o.push(['h', 'OPERATION WOLFPACK']); o.push(['p', WP.TEXT.about.p1]); o.push(['p', WP.TEXT.about.p2]);
  o.push(['h', 'SOURCE INFORMATION']); for (const l of A.src) o.push(['p', l]);
  o.push(['h', 'TESTING FEEDBACK']); for (const l of A.testing) o.push(['p', l]);
  o.push(['h', 'ENGINE FEEDBACK']); for (const l of A.engine) o.push(['p', l]);
  o.push(['h', 'PROMPT FEEDBACK']); for (const l of A.prompt) o.push(['p', l]);
  return o; };
})();
`);
const jpath = path.resolve(root, '../exit-interview.json');
writeFileSync(jpath, JSON.stringify(out, null, 2) + '\n');
const back = JSON.parse(readFileSync(jpath, 'utf8'));
const empty = []; const walk = (o, p) => { if (typeof o === 'string') { if (!o.trim()) empty.push(p); } else if (Array.isArray(o)) { if (!o.length && p !== 'aiHub.series') empty.push(p); o.forEach((v, i) => walk(v, p + '[' + i + ']')); } else for (const k in o) walk(o[k], p ? p + '.' + k : k); };
walk(back, '');
console.log('exit-interview.json parses;', empty.filter(e => e !== 'aiHub.series').length ? 'EMPTY: ' + empty.join(',') : 'every field answered (series left empty on purpose)');
writeFileSync(path.join(root, 'tools/chat-reply.txt'), ['## Source Information', ...data.src.map(l => '- ' + l), '', '## Testing Feedback', ...data.testing.map(l => '- ' + l), '', '## Engine Feedback', ...data.engine.map(l => '- ' + l), '', '## Prompt Feedback', ...data.prompt.map(l => '- ' + l)].join('\n') + '\n');
