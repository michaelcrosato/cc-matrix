/* OutBloom — About & Credits, and the exit interview. One object: the in-game pages read it and build.mjs writes
 * exit-interview.json from it, so the two always match. */
(() => {
'use strict';
const OB = window.OB = window.OB || {};
const SI = {
  date: '2026-11-04 03:51:48',
  source: 'OutRun 2006: Coast 2 Coast (SEGA / Sumo Digital, 2006)',
  plan: 'PLAN.md',
  genre: 'Arcade road racing (OutRun-style checkpoint racer with branching routes), with a passenger-request layer (Love in Bloom) and a mission career (Coast 2 Coast Tour)',
  perspective: 'Third-person chase camera on a sprite-scaled pseudo-3D road (plus high and bumper cameras); side-view vignettes for endings, the garage and the Tour story; a stylised overhead map for the career',
  tech: 'HTML5 canvas, plain JavaScript, my-3D2dge engine v0.85.2 (handoff package, commit 4390a98) with its road module extended for forks and strands, analog triggers, a hub combo guard, PlayStation glyph default, synth instruments/loops/voice bus and a TV-sized shell; AI Hub session client 1.4.0; Playwright 1.63.0 and Node 24 for tests; no other libraries',
  artDirection: 'Engine-native pixel art at 480x270 (expand to fill): cars and traffic pre-rendered from low-poly models by a small rasterizer into five-tone banded sprites with outlines; every roadside prop, landmark and sky painted in code with E.tones shading; a pixel-safe dithered bloom, lens flare, time-of-day grades from dawn to night',
  animation: 'The engine\'s Humanoid rigs (poses, expressions, point/aim, breathing, hair) for the driver, passengers, Bruno and locals; 33 yaw and 32 spin frames per car; suspension bounce, air, drift yaw; procedural props (turbines, waterfalls, Ferris wheel, flags), particles, request objects (balloons, gnomes, bees, cones, arches, bouquets)',
  audio: 'All in code on the engine synth, extended with instrument presets (e-piano, slap bass, brass, steel drum, sax, organ, pads, plucks), a delay and reverb bus; 7 radio songs and 4 themes composed as chord progressions and patterns, 11 jingles, a looping engine note per car, tyres, wind, ambience per biome; Animalese/Simlish-style babble voices with formants and moods',
  online: 'AI Hub Session Protocol v1 in ghost mode (1-4 players: own card, synced start, ghost cars, progress, results); local split-screen Versus for two; no other network',
  testing: 'One command, node tests/run.mjs: 12 headless suites (about 640 checks: core, content, road and junctions, physics, traffic and race rules, a whole-game bot playthrough of all 16 routes with balance windows, all 14 request types, all 14 missions and the economy, Time Trial ghosts, Versus, a fake AI Hub, UI navigation, glyphs, attract, touch-only, Dev Mode, saves, voice, audio data, determinism) and 4 Playwright suites (the file:// bundle with an audio check, the official AI Hub harness at 2 and 4 players with latency, loss and host-leave, touch emulation, 17 screenshots); no subagents or workflows',
  research: 'The engine handoff docs (README, API.md, AI_GUIDE.md, API-INDEX.md, the road module and road kit), the AI Hub README, session client and ghost example; the source game from the plan\'s research notes (Wikipedia-level facts); no other web research',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'Cost and tokens unknown (no estimate available); session time about 1 h 55 min (03:51 to about 05:46)'
};
const TF = [
  'About 33: 21 found by the headless suites and bot playthroughs (checkpoints not firing on the last row of stages, the first car home stopping everyone else from finishing, finished cars driving off the road, an unwinnable mission clock, route balance inverted by traffic, ribbon gaps narrower than a car, cones too close to slalom, part throttle never limiting speed, screens that laid out only while drawing, the attract demo running out of time, unmapped keys not waking it, a name clash in the hub handle, the economy short of buying everything, a load-order bug, harness and runner bugs) and 12 by screenshots (outlines flooding car sprites, occupants hidden or oversized, mirrored billboard text, an endless cliff wall on a fork branch, clouds spilling out of menu cards, missing font glyphs, an oversized garage car, no night headlights, crude bus sprites, HUD overlaps).',
  'About 6: the last-row checkpoint (no run could reach a goal on time), the first finisher freezing the others (Versus and rival missions unwinnable), the unwinnable B1 clock, the opening clock balance, outlines turning every car into a black box, and the attract demo never showing a fork.',
  'The all-16-routes bot playthrough: one script drives every route through the forks and the seamless stage switches to all five goals, checking checkpoints and the balance windows; it found the last-row checkpoint bug, the balance problems and several traffic and AI issues at once.',
  'Ad-hoc single-stage time traces printed to the console: useful once to spot slow traffic, then the route playthrough and the screenshots covered the same ground better.'
];
const EF = [
  'The headless loop (game.advance with exact fixed steps, scripted input, vm loading) made a deterministic racer testable in seconds, and the Humanoid rigs gave the cast real poses and faces almost for free.',
  'Yes: the road module projects x and y with different scales (half width vs half height), so I wrote a square-pixel projection; rig sizes in pixels were larger than I guessed; the font lacks some glyphs (triangle arrows, the middle dot, the PlayStation shapes), so text needed substitutions.',
  'The fork renderer: strands of other roads bending on from the main road, a junction that splits into two surfaces with a gore, and the seamless switch to the next stage; then the car rasterizer.',
  'Reading internals that the docs only summarise (the audio scheduler, the Shell CSS, the pad polling) to extend them safely inside a 1.2 MB single file.',
  'Replaced the road module (forks, strands, per-side grounds, edge strips, spans, crest clipping, a focal-length camera), added input.analog/setAnalog (triggers), ignored Options while Create is held in hub sessions, made PlayStation the default glyphs (Xbox the option), added instruments, chords, accents, slides, a bigger drum kit, sends, a voice bus, audio.loop and reverb, and a TV-sized theme for the standard screens. Each is logged in engine/CHANGES.md.',
  'A road module with junctions and a public, documented audio extension API (instruments and continuous loops) built in, since every racing game needs both.'
];
const PF = [
  'It is specific about the experience (10-foot controller-first UI, attract mode, dev sliders, hub integration) and leaves the creative choices open, and the plan made the scope concrete.',
  'The plan and TASK.md disagree in small ways (the plan\'s dev-folder name and some numbers that do not balance as written); the hard rule of at most seven focusable items sits awkwardly with a 14-postcard map.',
  'Fitting everything the plan asks for (15 stages, 14 request types, 14 missions, 11 songs, five endings in three moods, a hub card, Versus) into one coherent, polished demo in a single session.',
  'Let the plan list priorities (must, should, nice) so a builder can order the polish, and state the balance targets as tunable goals rather than fixed numbers.'
];
const credits = ['OutBloom 2006: Coast 2 Coast', '', 'An original homage, built by Claude (Anthropic, claude-opus-5-5)', 'from a plan by claude-opus-5-5', '', 'Engine: my-3D2dge v0.85.2 (MIT)', 'Online: AI Hub Session Protocol v1', '', 'Starring', 'Marisol Fontaine  -  Vivi Montclair  -  Juni Park', 'Bruno Brezza  -  Kiki Rapido', 'The Bramble Brothers  -  The Lustres  -  Old Ottavio', '', 'Music (all in code)', 'Sunburst Samba  -  Coastline Crush  -  Shuffle on the Shore', 'Vespa Vendetta  -  Pastel Highway  -  Lemon Drop Rush', 'Moonflower  -  OutBloom!  -  Garden Party', 'Petal Count  -  Last Light Lullaby', '', 'Inspired by OutRun 2006: Coast 2 Coast', '(SEGA / Sumo Digital, 2006)', 'Not affiliated with or endorsed by SEGA or Sumo Digital.', '', 'Thanks for driving coast to coast!'];
const lab = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
const kv = keys => keys.map(k => lab[k] + ': ' + SI[k]);
OB.ABOUT = {
  credits,
  pages: [
    { title: 'CREDITS', lines: ['OutBloom 2006: Coast 2 Coast  -  v1.0', 'Built on the my-3D2dge engine v0.85.2 (MIT License).', 'Online sessions: the AI Hub Session Protocol v1, client 1.4.0.', 'Every car, prop, sky, song, sound and voice is made in code.', 'Inspired by OutRun 2006: Coast 2 Coast (SEGA / Sumo Digital, 2006).', 'An original homage. Not affiliated with or endorsed by SEGA or Sumo Digital.'] },
    { title: 'SOURCE INFORMATION (1/4)', lines: kv(['date', 'source', 'plan', 'genre', 'perspective']) },
    { title: 'SOURCE INFORMATION (2/4)', lines: kv(['tech', 'artDirection']) },
    { title: 'SOURCE INFORMATION (3/4)', lines: kv(['animation', 'audio']) },
    { title: 'SOURCE INFORMATION (4/4)', lines: kv(['online', 'testing', 'research', 'environment', 'model', 'usage']) },
    { title: 'TESTING FEEDBACK (1/2)', lines: ['Q: How many issues did testing catch?  ' + TF[0], 'Q: How many were critical?  ' + TF[1]] },
    { title: 'TESTING FEEDBACK (2/2)', lines: ['Q: Most helpful test?  ' + TF[2], 'Q: Least helpful test?  ' + TF[3]] },
    { title: 'ENGINE FEEDBACK (1/3)', lines: ['Q: What did you like most?  ' + EF[0], 'Q: Did you get stuck or guess wrong?  ' + EF[1]] },
    { title: 'ENGINE FEEDBACK (2/3)', lines: ['Q: The most important thing you built?  ' + EF[2], 'Q: The hardest part?  ' + EF[3]] },
    { title: 'ENGINE FEEDBACK (3/3)', lines: ['Q: What did you change, and why?  ' + EF[4], 'Q: One thing to change?  ' + EF[5]] },
    { title: 'PROMPT FEEDBACK (1/2)', lines: ['Q: What did you like most?  ' + PF[0], 'Q: What was confusing?  ' + PF[1]] },
    { title: 'PROMPT FEEDBACK (2/2)', lines: ['Q: The hardest thing to do?  ' + PF[2], 'Q: What would you change?  ' + PF[3]] }
  ],
  interview: {
    sourceInformation: SI,
    testingFeedback: TF,
    engineFeedback: EF,
    promptFeedback: PF,
    aiHub: { name: 'OutBloom 2006: Coast 2 Coast', tagline: 'One day. One road. Every flower in bloom.', description: 'An arcade road racer across the island of Bellafiore: drift, slipstream and pick your forks coast to coast before sunset, while your passenger asks for balloons, photos and danger.', type: 'Game', genre: 'Racing', source: 'OutRun 2006: Coast 2 Coast', series: 'OutRun', players: '1–4',
      controls: 'Steer: stick/←→/A D · Gas: R2/✕/W · Brake: L2/□/S · Drift: ○/Space · Pause: Options/Esc', tags: ['arcade', 'vehicles', 'pixel art', 'retro', 'comedy', 'versus'] }
  }
};
})();
