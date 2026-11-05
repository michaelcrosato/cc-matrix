// The build's feedback, one source for three places: exit-interview.json (beside the game's HTML), the About screen's
// pages (src/08-interview.js, generated) and the final reply. Run: node tools/interview.mjs (checks the JSON parses).
import { writeFileSync, readFileSync } from 'node:fs';
const here = new URL('../', import.meta.url);
const I = {
  sourceInformation: {
    date: '2026-11-03 18:26:47',
    source: 'Ice hockey (over-the-top arcade style)',
    plan: 'PLAN.md',
    genre: 'Arcade sports: 3-on-3 ice hockey with goalies, with a fight minigame, a Flood Wagon minigame and a five-chapter story campaign (the Cup Run)',
    perspective: '2.5D TV broadcast camera (the engine\'s threequarter view, pitch 55) that tracks the puck, an Overhead (topdown) option, and ice-level (brawler) cuts for fights, replays, intros, celebrations and cutscenes',
    tech: 'my-3D2dge v0.85.2 (the handoff package, 2D canvas engine, patched; see Engine changes), AI Hub session client 1.4.0, plain JavaScript in 40 source modules bundled by a Node build script into one self-contained HTML file; Node 24 and Playwright 1.63 (Chromium) for the tests',
    artDirection: 'The engine\'s native PS1-era pixel art (res ps1, expand) with HD Humanoid rigs; new hockey gear (sticks, skates, helmets, goalie masks, pads, blockers, catchers, numbers), rinks with curved boards, breakable glass and nets, team logos, five dressed arenas with crowds, the Flood Wagon and the Kaboom Cup, all drawn in code',
    animation: 'The engine\'s procedural Humanoid rigs with a wrapped solvePose: skating strides, glides, crossovers, hockey stops, backward C-cuts, stick-handling, passes, saucers, wrist shots, slapshot wind-ups and follow-throughs, one-timers, checks, pokes, dekes and spin-o-ramas, faceoffs, goalie stances and saves, celebrations; the engine\'s E.MOVES for fights; an animation lab',
    audio: 'All in code: 11 chip-synth songs with layers plus 6 goal stings (new organ and brass waves), about 45 synthesized sound effects, a three-oscillator goal horn, arena organ stings, a crowd bed that follows the game with reactions and a KA-BOOM chant, and Animalese-style babble voices through formant filters for every speaker',
    online: 'AI Hub shared-world sessions for 1-4 players (host-authoritative simulation, 15 Hz snapshots under 1,200 bytes, press counters, client prediction and interpolation, events replayed for effects), plus 1-4 local players on one screen',
    testing: 'One command (node tests/run.mjs): headless Node suites (systems and units, features (the boss rules, unlocks, the Flood Wagon), extras (records, practice, every setting, the lab, audio), text, dev mode, attract mode, a bot-driven playthrough of the whole Cup Run and all 7 drills, balance) and Chromium suites (the engine\'s checker on 7 pages, menus with keyboard, mouse and touch-only, the AI Hub harness in 4 configurations); screenshots reviewed for looks',
    research: 'The engine handoff docs (README, API card, guide sections, the sports kit, the asset card) and the AI Hub protocol README and shared-world example; no web research on hockey (general knowledge)',
    environment: 'Claude Code CLI (headless); Linux; browser unknown',
    model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
    usage: 'Cost: unknown. Tokens: unknown (this environment shows no cost or token figures). Session time: about 4 h (18:26 to about 22:20)'
  },
  testingFeedback: [
    'About 25 real issues, found by the suites, the engine checker and screenshot review (plus a handful of bugs in the tests themselves). The final full run: 302 checks passing, 0 failing, and a line-by-line TASK.md audit (TASK-AUDIT.md) with every requirement met by passing checks.',
    'Seven would have been game-breaking: the CPU never challenged a carrier standing by his own net (an AI target bug), drills without a puck looped stoppages forever, drills completed by a goal never exited, a drill switched control to the pass receiver so it could not be won, AI Hub client copies hit a draw error every frame, mouse hover in menus read the wrong coordinate space, and the Flood Wagon\'s perfect flood could not be reached after a real period (the wagon orbited its target; now it brakes into turns, lays a wider sheet and 85% is perfect).',
    'The bot-driven playthrough of the whole Cup Run and all 7 drills (the game\'s own AI turned into stick and button input): it found the drill loops, the stuck exits and the flow bugs between scenes that no single system test reached.',
    'The engine checker\'s "flat color" look note: on a hockey rink half the screen is meant to be ice, so it kept firing after the ice was textured; it did push the ice texture and lighting to look better.'
  ],
  engineFeedback: [
    'The exact fixed step with game.advance, input.tap and input.hold in Node: the same game runs headless, so a bot could play the entire story through the real input path in two minutes. The procedural Humanoid with a replaceable solvePose came second: hockey motion layered on top of it cleanly.',
    'Yes: the threequarter view draws at 1.5x scale at zoom 1 (zoom 1 was far too close; .72 is about 1:1); input.mouseScreen() is in buffer space with the camera, not HUD pixels (screenPoint and pointer are); a moving mouse does not set lastDevice; every zoom level re-bakes the whole floor, so smooth camera zooms are not practical; in the brawler view y grows toward the camera.',
    'The hockey simulation: skating with momentum, the puck in substeps against curved boards, glass, posts, crossbar and nets, and a physical goalie save solver with reaction, tracking lag, save shapes, rebounds and freezes. Next to it, the hockey gear and motion on the rig, and the online snapshot and prediction layer.',
    'Curved boards, glass panels and nets in a tilted view: TileMap walls are axis-aligned boxes, so the rink was drawn by hand as depth-queued panels, with the near side cut low so it never hides play.',
    'Six changes: PlayStation symbols (and a few marks) in the 5x7 font; Options ignored while Create is held (AI Hub); hockey sticks as weapons and a gear hook that draws a game\'s parts inside the rig\'s depth-sorted ops; organ and brass waves, an oscillator lowpass, a voice bus and audio.bus(name); a per-letter voice function for E.Dialog; 12 cached floor bakes instead of 6.',
    'Make zoom cheap: bake the floor once at a high scale and resample, or cache per view only, so a broadcast camera can punch in and pull out smoothly without re-baking a 70 x 44 tile floor.'
  ],
  promptFeedback: [
    'It is concrete where it matters: exact deliverables, a pass/fail harness for online play, a strict testing method (one command, scripts over screenshots) and a detailed plan to build from.',
    'The plan\'s file and folder names (claude-opus-5-5-max-20261103-174816) differ from TASK.md\'s (xhigh-20261103-182647); TASK.md wins, as STAGE.md says, but it needed a moment. "Follow lib/hub for multiplayer integration into ai-hub as well as for the game on its own" reads two ways; I built hub sessions plus local 1-4 player play.',
    'The scope: a complete vertical slice (a five-chapter story with cutscenes, 7 drills, exhibition for 4, a Flood Wagon minigame, fights, a shootout, online netcode, attract and dev modes) in one session, and judging game feel without being able to play it by hand.',
    'Rank the features (must-have versus nice-to-have) so a build under time pressure knows what to cut, and keep the plan\'s names in step with TASK.md.'
  ],
  aiHub: {
    name: 'Ice Hoc-Kaboom',
    tagline: 'Over-the-top 3-on-3 arcade hockey',
    description: 'Glass-shattering hits, dropped gloves and explosive KABOOM slapshots as the Mukluk Falls Muskrats fight to save their rink. Story, exhibition and up to four players.',
    type: 'Game',
    genre: 'Sports',
    source: 'Ice hockey',
    series: '',
    players: '1–4',
    controls: 'Stick/WASD skate · ✕/J pass · □/K shoot · ○/L deke · △/I saucer & gloves · R2/Shift turbo',
    tags: ['arcade', 'sports', 'versus', 'comedy', 'pixel art', 'story']
  }
};
const json = JSON.stringify(I, null, 2);
JSON.parse(json);
writeFileSync(new URL('../exit-interview.json', here), json + '\n');
const SI = I.sourceInformation, lines = [['Date', SI.date], ['Source', SI.source], ['Plan', SI.plan], ['Genre', SI.genre], ['Perspective', SI.perspective], ['Tech', SI.tech], ['Art direction', SI.artDirection], ['Animation', SI.animation], ['Audio', SI.audio], ['Online', SI.online], ['Testing', SI.testing], ['Research', SI.research], ['Environment', SI.environment], ['Model', SI.model], ['Usage', SI.usage]].map(([k, v]) => k + ': ' + v);
const md = readFileSync(new URL('ENGINE-CHANGES.md', here), 'utf8'), engineChanges = md.split(/\n(?=\d+\. )/).filter(b => /^\d+\. /.test(b)).map(b => b.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim());
if (engineChanges.length < 6) throw new Error('ENGINE-CHANGES.md: expected 6 numbered changes, found ' + engineChanges.length);
writeFileSync(new URL('src/08-interview.js', here), '/* ---- INTERVIEW: the build\'s Source Information and feedback (generated by tools/interview.mjs from one source: the\n * About pages, exit-interview.json and the final reply say the same) ---- */\nconst INTERVIEW = ' + JSON.stringify(Object.assign({}, I, { sourceLines: lines, engineChanges })) + ';\n');
const back = JSON.parse(readFileSync(new URL('../exit-interview.json', here), 'utf8'));
const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
const ok = keys.every(k => typeof back.sourceInformation[k] === 'string' && back.sourceInformation[k]) && back.testingFeedback.length === 4 && back.engineFeedback.length === 6 && back.promptFeedback.length === 4 && ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'].every(k => k in back.aiHub);
console.log(ok ? 'exit-interview.json written and parses (every field answered)' : 'exit-interview.json: a field is missing');
