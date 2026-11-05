// SN.ABOUT: the single source for the About / Credits screen and for tools/exit-interview.mjs (exit-interview.json)
(() => {
const SN = globalThis.SN;
SN.ABOUT = {
  sourceInformation: {
    date: '2026-11-03 18:46:48',
    source: 'Wipeout HD (Studio Liverpool / Sony Computer Entertainment, 2008)',
    plan: 'PLAN.md',
    genre: 'Anti-gravity combat racing (arcade), with a survival mode (Overclock) and a combat-points mode (Snipeout)',
    perspective: 'Third-person chase camera (near and far) with a cockpit view and a look-back camera; trackside TV cameras for intros, spectating, replays and the attract mode',
    tech: 'my-3D2dge v0.85.2 handoff engine (with marked edits) + my-3D2dge 3D add-on v0.85.2 (World3D); three.js r182 (WebGPU, falling back to WebGL 2) and Rapier 0.19.3 from the jsDelivr CDN; AI Hub session client 1.4.0; plain JavaScript; Node and Playwright 1.63.0 for tests',
    artDirection: 'The engine\'s native style: pixel-resolution 3D with toon and lambert light, bloom, the engine\'s pixel fonts and HUD; new procedural assets: six craft designs with team liveries, banked neon-walled tracks, tunnels, pads, gantries, sponsor boards, four themed worlds (Riviera coast, red-rock desert, night megacity, arctic basin) and a neon-grid Overclock skin',
    animation: 'The engine\'s rigs (pilot cards and live portraits, podium poses cheer, wave and hips) and tweens; new procedural craft animation (bank and yaw roll, barrel rolls, hinged airbrake flaps, engine glow, exhaust and boost trails, shield flashes, explosions, the rescue drone), animated pads, turbines, Ferris wheel, lighthouse beam, aurora, traffic, weather',
    audio: 'All synthesized in code: six original electronic songs built from chord progressions and patterns for the engine tracker (extended with filter envelopes, unison, pan, accents, claps, sub booms and sidechain), layered by race events; about 60 synthesized sound effects; engine hums with Doppler and pan; Animalese/Simlish-style gibberish voices for the announcer, pilots and principals',
    online: 'AI Hub ghost-mode sessions (1 to 4 players race the same seeded event and see each other as ghosts); local 2-player split-screen Versus for the game on its own',
    testing: 'Headless Node suites driving game.advance and game.debug (unit, physics, race, weapons, modes, flow, season, audio, hub mock) including a scripted playthrough of the whole game, plus Playwright browser checks of the bundle and screenshots; one command, failures only and a one-line count',
    research: 'None beyond the plan: PLAN.md, the engine\'s API card and the World3D header, and the AI Hub README',
    environment: 'Claude Code CLI (headless); Linux; browser: headless Chromium build 1243 (Playwright 1.63.0, WebGL 2 backend) for every browser test and screenshot',
    model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
    usage: 'Estimate: about 0.48 MB of code and tests written (roughly 140K output tokens for code, about 200K output tokens in all). Input tokens and API cost in USD were not visible to the agent, so they are not estimated. Session time: about 2 h of wall clock (18:47 to 20:45 MST)'
  },
  testingFeedback: [
    'About 33 real issues, caught by the headless suites, the bot-driven scripts, a real-input browser playthrough (keyboard, mouse and touch events only), the screenshot reviews and the requirement audit (plus a few bugs in the tests themselves). The real-input play found that Esc in the Dev mode panel was also taken by the engine\'s pause key. Earlier finds, the headless suites, the bot-driven scripts and the screenshot reviews (plus a few bugs in the tests themselves). Examples: two scene fields named view and res that the engine silently treats as scene options, a crash entering the menu, replays drifting out of sync (quantised controls, the intro skip, a test bot sharing the autopilot\'s AI state), the AI Hub round never calling ready() after a rename, craft popping up onto the far side of the gorge instead of crashing into it, the railshot missing at range, mouse hover not moving the focus, menu buttons losing their hit boxes, mirrored sign boards, and weapons eliminating five of eight craft a race.',
    'About 8 were critical: Esc in the Dev mode panel leaving the game paused under it, the menu crash, the Academy crash on entry, the hub session never starting (ready() never called), replays desyncing (two separate causes), the team screen\'s CONFIRM button not drawn or clickable, and unbound keys not leaving the attract mode.',
    'The scripted playthrough of the whole game (attract, academy, all ten season events with briefings and promotions, the four-race Grand Prix, the ending, then every other mode, a replay and dev mode): it caught balance problems, drill limits and state leaking between modes that no unit test would. The AI Hub mock was a close second: it found the round that never started.',
    'The pixel-brightness check of screenshots: it mostly flagged the deliberately black Overclock skin. Real visual problems (mirrored boards, the cluttered hangar, missing glyphs) were found by looking at the screenshots.'
  ],
  engineFeedback: [
    'Everything around the game came for free and worked: fixed 1/120 s steps, headless game.advance for tests, the boot screen, pause menu, settings, key rebinding, saves, per-player input with half keyboards and split screen. World3D let me add my own three.js meshes and cameras under the same pixel HUD, fonts, dialog boxes and character portraits.',
    'Yes. Scene objects\' own fields named view and res are read as scene options (a warning, then wrong behaviour); game.go takes the fade as a third argument; mouse movement does not change input.lastDevice; the wheel is only reported where a scene allows zoom; text planes came out mirrored through the engine-to-three axis swap; and headless WebGPU (SwiftShader) loses its device, so browser tests run on ?backend=webgl.',
    'Track-space hover physics on a banked spline ribbon (hover spring, grip cap, airbrakes, walls, gaps, drops, tunnels, overpasses), with the track mesh builder and the terrain carving around it. World3D\'s own track and Rapier-ball vehicles cannot model Wipeout speeds, tunnels, drops, gaps or overpasses.',
    'Coordinate conventions: the engine\'s axes (x east, y south, z up) mapped to three.js by a reflection, which flips triangle winding, the camera roll sign and texture direction; I had to verify each by screenshot.',
    'Five marked edits: PlayStation button symbols by default and the option moved to Display; PlayStation symbols in both pixel fonts; analog button values (input.value) for L2/R2 airbrakes; synth extensions (lowpass envelopes, unison, pan, accents, claps, sub booms, sidechain) for an electronic soundtrack; and a game-supplied particle ground in World3D so sparks land on the track deck.',
    'A first-class ribbon track in World3D with track-space queries (s, u, h), arbitrary banking, tunnels, gaps and overpasses. Or, smaller: keep scene options in their own object so a scene\'s game state can never collide with them.'
  ],
  promptFeedback: [
    'The done criteria are concrete and testable: one file, nothing left unfinished, a dev mode with sliders, attract after 10 s, touch-only behaviour, controller-first prompts with an Xbox option, hub integration with a harness to prove it. The testing rules (one command, failures only, a one-line count) kept the feedback loop fast.',
    'Where the 3D add-on stands: the brief says to build on dist/handoff, whose 2D views cannot show a banked, looping 3D track, while the add-on that can lives outside that folder. Also the plan was written for another run\'s folder and file names, so TASK.md\'s names had to override it.',
    'The breadth in one pass: eleven modes, a season with a Grand Prix and an ending, the academy, attract, dev mode, split screen and AI Hub sessions, each tested, while judging a 3D picture only from screenshots.',
    'Say how to weigh scope against polish when time is short, and name a reference screen size and refresh rate for the 10-foot UI. State plainly whether add-ons from the engine repository count as part of the engine.'
  ],
  engineChanges: [
    'Button symbols default to PlayStation and the option moved to Settings > Display (PlayStation or Xbox), so prompts follow the brief',
    'PlayStation symbols added to both pixel fonts, so input.label() results print in running text',
    'Analog button values: input.value(action) reads pad button values, so L2/R2 airbrakes are analog',
    'Synth extensions: lowpass filter envelopes, unison detune, pan and accents on tracker notes, clap and sub-boom drums, kick sidechain ducking, for the electronic soundtrack',
    'World3D particle ground can be the game\'s own function, so sparks and debris land on the track deck, not the terrain below'
  ],
  aiHub: {
    name: 'Snipeout HD', tagline: 'Anti-gravity. Anti-everyone.',
    description: 'An anti-gravity combat racer: thread banked neon tracks at 600 km/h, snipe rivals with ten weapons and survive Overclock. Season, time trials, split screen and AI Hub ghost races.',
    type: 'Game', genre: 'Racing', source: 'Wipeout HD', series: 'Wipeout', players: '1–4',
    controls: 'Stick or A/D steer · ✕ or W thrust · L2/R2 or Q/E airbrakes · □ or Space fire · ○ or Shift absorb',
    tags: ['3d', 'racing', 'sci-fi', 'vehicles', 'arcade', 'versus']
  },
  credits: [
    'SNIPEOUT HD. An original game inspired by Wipeout HD. Not affiliated with Sony Interactive Entertainment.',
    'Engine: my-3D2dge v0.85.2 and my-3D2dge 3D (MIT). three.js r182 (MIT). Rapier 0.19.3 (Apache-2.0). AI Hub session client 1.4.0.',
    'All music, sound and voices synthesized in code. No image or sound files.',
    'Built by Anthropic claude-opus-5-5 from PLAN.md.',
    'The Hoverline Championship, its teams, pilots, principals, sponsors and recording artists are fictional.'
  ]
};
})();
