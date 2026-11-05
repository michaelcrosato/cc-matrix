/* About / credits, and the exit interview (the same answers, one source: tests/exit-interview.mjs writes the JSON file). */
(() => {
'use strict';
const OB = window.OB;
const I = OB.INTERVIEW = {
  sourceInformation: {
    date: '2026-11-04 04:21:40', source: 'OutRun 2006: Coast 2 Coast', plan: 'PLAN.md (written by claude-opus-5-5 at max effort)',
    genre: 'Arcade road racing: an OutRun-style checkpoint racer, with a passenger-request layer (Love in Bloom, 14 request types), a 14-postcard mission career, local two-player Versus and a seed garden for unlocks',
    perspective: 'Third-person chase camera behind the car on a sprite-scaled pseudo-3D road (chase, high and bumper cameras); 2D screens with character portraits for menus and endings',
    tech: 'my-3D2dge v0.85.2 (handoff package, commit 4390a98) with its E.Road pseudo-3D module, vanilla JavaScript on canvas 2D, AI Hub session client 1.4.0, Playwright 1.63.0 for browser checks only',
    artDirection: 'Engine-native pixel art at 480x270 (expand): sunny pastel palette, scenery and Fioretti cars drawn by code, per-biome and per-time-of-day skies, Humanoid rig portraits for the cast',
    animation: "The engine's native animation system: Humanoid rigs with poses and expressions (wave, cheer, hips, smile, shout, wince) for portraits; procedural car lean, bank and slide angle; code-driven particles (smoke, sparks, petals)",
    audio: 'All in code, no audio files: seven original songs generated from chord progressions on the engine chip synth (latin, disco, shuffle, euro, city pop), synthesised engine note, horn, tyre squeal and chimes, and Animalese-style babble voices for the cast',
    online: 'AI Hub ghost session (protocol 1, client 1.4.0, 1 to 4 players): each copy races the Flower Sprint route alone, sends its own car 10 times a second, reports progress once a second and a finish time; no other network use',
    testing: 'Headless tools only: a node suite that plays the game with game.advance and scripted input (a full playthrough), a real-browser keyboard run, screenshots for what scripts cannot check, and the AI Hub conformance harness; no subagents or workflows used to review or judge',
    research: 'none beyond reading the engine docs, the ROAD kit, the plan and the AI Hub client; the engine and hub files were fetched from GitHub',
    environment: 'Claude Code CLI (headless); Linux; browser unknown (checked in headless Chromium through Playwright 1.63.0)',
    model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
    usage: 'unknown'
  },
  testingFeedback: [
    'Testing caught about 12 issues: an undefined clamp that stopped the game booting, a truncated about file, a first stage that could not be finished inside the starting clock, drift scores too small to matter, missions with no verdict at the gate, a stale finished flag that stopped a second race from ending, a crash when drawing the time-out ending, a request card that wrote its lines over each other, score points lost to rounding, and pixel-font symbols missing for PlayStation prompts.',
    '4 were game breaking: the boot failure, the stale finished flag (a soft lock after any second race), missions that could never end, and the time-out ending crash.',
    'The scripted playthrough that drives the real scenes with held keys: it found the soft lock, the mission verdicts and the clock balance. The real AI Hub harness run was a close second, because it confirmed the whole session flow in one pass.',
    'The two-run determinism check: it never failed. The per-scene draw check was cheap and caught one bug, but screenshots found far more of the visual problems.'
  ],
  engineFeedback: [
    "The road module and the backdrop presets gave a sunny pseudo-3D racer on day one, and the standard pause, settings, controls, glyph and boot shell meant none of that had to be written. The headless advance and input.tap made real playthrough tests easy.",
    "Yes. I assumed the pixel font could draw the PlayStation button symbols that input.label returns, and it drew question marks. I also first assumed the road could fork; it is one strip, so each fork is two arches and a new stage. And I wrongly read game.scene right after game.go, when the old scene is still current.",
    'The race simulation (handling, power slide, slipstream and slingshot, traffic, the passenger requests, forks and the clock), a list menu that works with pad, keyboard and mouse, the generated radio songs, the babble voices, and the dev panel.',
    'Continuous sound: audio.sfx is fire-and-forget, so the engine note is a stream of very short voices, and a live pitch needed workarounds. The road module also has no branching and no per-segment colour beyond the strip, so forks and stage changes had to be built around it.',
    'The pixel font gained the controller face-button symbols, the arrows and a middle dot, because prompts need PlayStation glyphs. One engine comment was reworded. Both are logged in engine/CHANGES.md.',
    'A continuous audio voice whose pitch and volume the game sets every frame (an engine note, wind, a siren), instead of only one-shot sounds.'
  ],
  promptFeedback: [
    'The deliverables list is exact (file name, exit interview shape, the four feedback sections), the working-environment rules are concrete, and a plan to build from gave the game a clear spine and a strong title.',
    'The plan was very large (local versus, manual gears, 14 request types, 14 missions, a rendered road fork, side-view vignettes), and it was not clear which parts were required; I built it all, with the fork as a growing median island plus two arches because the road module is a single strip. The file name pattern with the plan slug rule was also a little tangled.',
    'Fitting a very large plan into one session while still delivering a complete, polished vertical slice with every system present.',
    'Mark each plan item as required, nice to have or optional, and give the target size of the demo, so the build can be complete instead of guessing what completeness means.'
  ],
  aiHub: {
    name: 'OutBloom 2006: Coast 2 Coast', tagline: 'One day. One road. Every flower in bloom.',
    description: 'A sunny arcade road racer across the island of Bellafiore: pick a road at every fork, power slide through traffic, and keep your passenger smiling before the daylight runs out. Race the Flower Sprint with friends online.',
    type: 'Game', genre: 'Racing', source: 'OutRun 2006: Coast 2 Coast', series: 'OutRun', players: '1–4',
    controls: 'Steer stick or arrows, gas R2 or W, brake L2 or S, power slide circle or Space, horn triangle or H, next song R1 or R, camera L1 or C',
    tags: ['arcade', 'third-person', 'pixel art', 'retro', 'vehicles', 'comedy']
  }
};
const S = I.sourceInformation, N = (arr, q) => arr.map((a, i) => '• ' + q[i] + '\n' + a);
const TQ = ['How many issues did testing catch?', 'How many were critical?', 'Most helpful test', 'Least helpful test'];
const EQ = ['Liked most', 'Stuck or guessed wrong?', 'Most important thing built', 'Hardest part', 'Changed in the engine', 'One change'];
const PQ = ['Liked most', 'Confusing', 'Hardest thing to do', 'What to change'];
const flat = (arr, q) => { const out = []; arr.forEach((a, i) => { out.push('• ' + q[i]); out.push(a); }); return out; };
OB.ABOUT = { pages: [
  { title: 'Credits', lines: [
    'OutBloom 2006: Coast 2 Coast. One day. One road. Every flower in bloom.',
    'An original homage to the arcade road racers of the 2000s. Not affiliated with or endorsed by SEGA or Sumo Digital. Every place, car, character, song and voice here is new.',
    'Built on the my-3D2dge engine (v0.85.2) and its pseudo-3D road module. Online play uses the AI Hub session client 1.4.0. All music, sound effects and voices are generated in code.',
    'Modes: Drive (Love in Bloom), Time Trial with a ghost, Versus for two players on one screen (player 2 uses I, J, K, L and U, or a second pad), the Coast 2 Coast Tour of 14 postcards, and online Flower Sprint races. Settings can switch to a manual gearbox (next song shifts up, camera shifts down).',
    'Cast: Marisol, Dante and Wren ride beside you. Bruno Brezza waves the flag, Nonna Pia tends the Garage Garden, Gianna Ruota sets the postcard jobs and Cosimo races you for the city.',
    'Controls: steer with the left stick or the arrow keys or A and D. Gas on R2, W or Up. Brake on L2, S or Down. Power slide on the circle button or Space (or tap the brake while turning). Horn on triangle or H. Next song on R1 or R. Camera on L1 or C. At the fork, drive under the arch of the road you want.'
  ] },
  { title: 'Source Information', lines: [
    'Date: ' + S.date, 'Source: ' + S.source, 'Plan: ' + S.plan, 'Genre: ' + S.genre, 'Perspective: ' + S.perspective, 'Tech: ' + S.tech, 'Art Direction: ' + S.artDirection, 'Animation: ' + S.animation, 'Audio: ' + S.audio, 'Online: ' + S.online, 'Testing: ' + S.testing, 'Research: ' + S.research, 'Environment: ' + S.environment, 'Model: ' + S.model, 'Usage: ' + S.usage
  ] },
  { title: 'Testing Feedback', lines: flat(I.testingFeedback, TQ) },
  { title: 'Engine Feedback', lines: flat(I.engineFeedback, EQ) },
  { title: 'Prompt Feedback', lines: flat(I.promptFeedback, PQ) }
] };
})();
