/* DENSHA DE HALO! · the About & Credits pages: credits, Source Information, Testing, Engine and Prompt Feedback (the
 * same text as the final chat reply and exit-interview.json). */
(() => {
'use strict';
const DH = window.DH;
DH.ABOUT = {
  source: {
    date: '2026-11-04 05:02:35',
    source: 'Densha de Go! (Taito, 1996 arcade and its sequels): the train driving game',
    plan: 'PLAN.md',
    genre: 'Train driving simulation with arcade scoring',
    perspective: 'First-person cab view (pseudo-3D), with chase, platform and trackside cameras, a side-view Stop Cam and a top-down ring map',
    tech: 'my-3D2dge v0.85.2 (full engine, handoff package, 7 small patches) + a new rail.js pseudo-3D railway renderer; AI Hub session client 1.4.0 (unmodified); vanilla JavaScript in one HTML file; Node 24 + Playwright 1.63.0 headless Chromium for tests',
    artDirection: "The engine's PS1-era pixel style: new code-drawn trains, cab and dashboard, signals and boards, stations, a parametric Japanese townscape, landmarks; engine Humanoid and Blob rigs for people and Haro-kun",
    animation: "The engine's Humanoid and Blob rigs with three new poses (bow, point, flag); code-tweened lever, gloved hand, needles, wipers, doors, crossing gates, the Ferris wheel, the stamp slam",
    audio: 'All procedural Web Audio: a VVVF inverter and a resistor-motor synth, rolling, wind, tunnel echo, rain, brake squeal, horn, crossing bells, ATS bell, rail joints, 12 original departure melodies, 9 chip-music songs, Babble gibberish voices for 11 characters plus the PA',
    online: 'AI Hub Session Protocol v1, ghost mode, 2-4 players (the Parallel Run with its own card); plus a local 2-player split-screen Duel',
    testing: 'Headless Node tests through game.advance and game.debug behind one command (node test/run.mjs) that prints only failures and a count, including a scripted full playthrough; Playwright checks of the bundle; the AI Hub harness; a few screenshots for the look',
    research: 'Read the engine handoff docs (README, API card, road module and kit, test patterns) and the AI Hub protocol README and ghost example; no web research (the source from general knowledge, as the plan says)',
    environment: 'Claude Code CLI (headless); Linux; browser unknown',
    model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
    usage: 'unknown (no cost or token figures are visible inside the session; wall time about 1 h 45 min)'
  },
  testing: ['About 14 real issues across headless suites, the autopilot calibration runs, the browser checks and screenshots (plus 5 bugs in the tests themselves).', "6 were game-breaking: a run's stop index started one ahead (the train never left the first station), a field name that shadowed a method (a crash every step), a setting applied before game.settings existed (a crash at boot), deep links racing the async boot (a crash in the browser), the tutorial never ending, and the S2 freight joining into an occupied block so the player passed a red signal.", 'The autopilot playthrough: the skill-1 autopilot driving every stage and asserting PERFECT stops, every event fired and rank S. It found the stop-index bug, the freight bug, the tutorial bug and the timetable calibration problems, and it is how the timetables were fitted.', 'The gallery test that draws all 13 rail shots into a stub canvas: it only proves nothing throws; the screenshots of the same shots were what actually judged the look.'],
  engine: ['Headless determinism: game.advance with exact 1/120 s steps made a full scripted career (and timetable calibration) run in Node, and the standard Shell gave pause, settings, rebinding and full screen for free.', 'Yes: game.start with boot steps starts the first scene asynchronously, so deep-link game.go() calls right after start failed in the browser; and in a custom E.View a Humanoid facing +PI/2 faces the camera, which I guessed backwards at first.', 'The rail renderer (rail.js): a fork of road.js with several diverging tracks, strips (extrusions) for platforms, trains, buildings and tunnels, a rear-facing camera and square pixels. The train physics, signalling and the predictive autopilot came next.', 'Fitting a full dashboard (timetable, speedometer, notch strip, lamps, buttons, the master controller) into 320 to 427 pixels of width while keeping the 5x7 font as the minimum for a TV at 10 feet.', 'Seven patches: the new rail.js module; a Dialog voice function hook (per-letter Babble syllables); a group filter for the Shell settings screen (live Dev sliders, hidden from normal Settings); the PlayStation glyph default and the four PlayStation symbols in the 5x7 font; audio.bus() and noiseBuffer() so custom synth nodes follow the volume settings; bow, point and flag poses; ignoring Options while Create is held in a hub session.', 'Generalise road.js into a pseudo-3D extrusion renderer (several lanes or tracks, side objects as extruded strips, a reverse camera, square pixels), so first-person vehicle games on rails, roads or rivers start from more than a single road.'],
  prompt: ["The concrete deliverables and checks: a named file, an exact exit-interview shape, a 10-foot controller-first UX brief, and an AI Hub harness that gives a hard pass or fail. The plan's numbers (physics check values, judgment windows) made tuning testable.", "Usage asks for API cost, tokens and session time, which an agent inside the session cannot see; and the plan was written for another run's timestamp and model tag, so the file names had to be translated.", 'Scope: a full career of six stages, the duel, the hub round, attract, Dev Mode and all-procedural audio in one session; and calibrating timetables so the AI driver arrives on the second.', "Say which features matter most if time runs short (the plan's cut order helped), and give the agent its usage numbers or drop that field."]
};
DH.ABOUT_PAGES = () => {
  const A = DH.ABOUT, S = A.source;
  return [
    ['CREDITS', ['DENSHA DE HALO! v' + DH.VERSION, 'An original homage to Densha de Go! (Taito). Not affiliated with or endorsed by Taito. All characters, places, music and art are original.',
      'Engine: my-3D2dge v' + My3D2dge.version + ' by Michael Crosato (MIT License), with a new rail renderer.', 'Online: the AI Hub session client 1.4.0 (Session Protocol 1).',
      'Asset sets: none used; every object, sound and voice is made in code.', 'Made by: Anthropic claude-opus-5-5 (reasoning effort medium) in Claude Code, from PLAN.md.',
      'Thank you for riding the Halo Line.']],
    ['SOURCE INFORMATION', ['Date: ' + S.date, 'Source: ' + S.source, 'Plan: ' + S.plan, 'Genre: ' + S.genre, 'Perspective: ' + S.perspective, 'Tech: ' + S.tech, 'Art Direction: ' + S.artDirection, 'Animation: ' + S.animation, 'Audio: ' + S.audio, 'Online: ' + S.online, 'Testing: ' + S.testing, 'Research: ' + S.research, 'Environment: ' + S.environment, 'Model: ' + S.model, 'Usage: ' + S.usage]],
    ['TESTING FEEDBACK', ['How many issues did testing catch? ' + A.testing[0], 'How many were critical / game breaking? ' + A.testing[1], 'Most helpful test: ' + A.testing[2], 'Least helpful test: ' + A.testing[3]]],
    ['ENGINE FEEDBACK', ['Liked most: ' + A.engine[0], 'Stuck or guessed wrong: ' + A.engine[1], 'Most important thing built: ' + A.engine[2], 'Hardest part: ' + A.engine[3], 'Changed in the engine: ' + A.engine[4], 'One change: ' + A.engine[5]]],
    ['PROMPT FEEDBACK', ['Liked most: ' + A.prompt[0], 'Confusing: ' + A.prompt[1], 'Hardest: ' + A.prompt[2], 'Would change: ' + A.prompt[3]]]
  ];
};
})();
