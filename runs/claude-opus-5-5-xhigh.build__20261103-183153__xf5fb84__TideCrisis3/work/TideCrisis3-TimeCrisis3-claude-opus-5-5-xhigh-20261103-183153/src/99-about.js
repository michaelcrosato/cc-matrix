/* 99-about: the About and credits data. The in-game About pages, the ending's credits, the AI Hub tags and
 * exit-interview.json (written by tools/build.mjs) all come from here, so they agree. */
const SOURCE = {
  date: '2026-11-03 18:31:53',
  source: 'Time Crisis 3 (Namco and Nextech; arcade 2003 on Namco System 246, PlayStation 2 2003)',
  plan: 'PLAN.md',
  genre: 'On-rails arcade light-gun shooter with a cover system',
  perspective: 'First-person rail camera (duck behind cover, pop out to shoot); third-person cutscene cameras',
  tech: 'my-3D2dge handoff v0.85.2 full engine (patched: long guns, PlayStation glyphs, wheel codes, audio buses), our own perspective software renderer module (Rail3D) drawing into the engine\'s pixel buffer, AI Hub session client 1.4.0 (protocol 1); plain JavaScript, no other libraries; Node 24 and Playwright 1.63.0 for testing',
  artDirection: 'The engine\'s native PS1-era pixel style in perspective 3D: its banded light and material patterns as textures, Bayer dithering, fog, its Humanoid rigs as billboards, plus new materials and models (containers, stalls, boats, a lighthouse, a tidal barrier, a crab walker)',
  animation: 'The engine\'s procedural Humanoid rigs (poses, moves, rolls, climbing, deaths) with new long guns and a cutlass, plus code-driven machines (turrets, rotors, a six-legged gait, swinging, sinking)',
  audio: 'All in code: tracker songs on the engine\'s chip synth (title theme, three stage themes in layers, boss, final boss, briefing, range, results, ending), synthesized SFX panned by position, per-stage ambience graphs, and an Animalese-style gibberish voice synth with formant vowels for every speaker',
  online: 'AI Hub Session Protocol v1, shared-world co-op for 1-4 players: the host runs the world; each client sends its player\'s input; the host streams every step\'s commands so every copy runs the same deterministic world from the same seed, with a score and lives check each second; threats on remote players resolve against the cover they reported. Local split-screen co-op for 2',
  testing: 'Allowed: headless tools as much as liked (game.advance and game.debug), screenshots only for what a script cannot check, one command that prints only failures and a count, no subagents or workflows to review. Used: node tests/run.mjs, 28 suites: 24 headless (core, gameplay, content, the lighthouse climb and the tower roof, UI, dev, attract, co-op and a FakeHub net suite with latency, jitter and loss) plus --playthrough (the expert bot clears every stage, the fair bot clears every stage on Normal without a continue, the showoff bot plays the whole ARCADE with its cutscenes, Training completes, and the whole game is played through its screens from the title to the high-score table), --browser (the bundle at four window sizes, then an end-to-end run with real key presses, mouse, touch and a stubbed DualSense: the attract mode, every About page, prompts following the device, dev mode from the pause menu, detail per stage, a touch-only phone) and --hub (the four AI Hub harness scenarios in headless Chromium); tests/ISSUES.md logs what they caught',
  research: 'The engine handoff docs (API.md, AI_GUIDE.md, docs/ASSETS.md, API-INDEX.md), the AI Hub README; the source facts come from the plan, which cites Wikipedia\'s Time Crisis 3 article (fetched 2026-11-03); no new web research during the build',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'Measured from the session\'s own record of per-request usage, up to the final build at 22:38: 414 requests to claude-opus-5-5, 204.7 M tokens (846 uncached input, 867.4 K output, 1.46 M cache writes at the 1-hour TTL, 202.4 M cache reads), API cost about $69.50 at Claude Opus 5.5 list prices per million tokens ($4 input, $20 output, $8 cache writes at the 1-hour TTL, $0.20 cache reads); session time 4 h 6 min, from 18:31:53 to 22:38:34. The final test run and the closing reply come after this file is written: estimated from the same steps last time (4 requests, 1.7 M tokens, $0.52, 11 min), the whole session comes to about 418 requests, 206.5 M tokens, $70.02 and 4 h 17 min'
};
const FEEDBACK = {
  testing: [
    '68, itemised in tests/ISSUES.md: 60 in the game (23 caught by the bot playthroughs and boss runs, 10 cover points caught by the content validator, 2 caught by the lighthouse and tower-roof checks, 1 caught by the UI suite, 4 caught by the browser end-to-end suite, 20 caught by screenshots) and 8 in the bot used for testing.',
    '13 were critical: an area, a boss or a mode could not be finished. The Bulldog fuel tank inside its collider (1-3); canal enemies left behind the boat (1-4); Barracuda boarding outside the view (1-B); a shield trooper with no hide state (3-1) and one stuck in his crouch; funicular terraces misplaced and hidden by parapets (2-3); rappellers stuck on the lift ropes (3-4); a lighthouse collider hiding an enemy (2-4); Hammerhead shielded down to his shins and his rig turned to NaN (2-B); the Seawolf hovering out of view (3-2); Training able to reach CONTINUE.',
    'The bot playthroughs: the Autopilot playing every stage headless through game.advance (expert in god mode for completion, fair on Normal for balance, showoff for the whole ARCADE with its cutscenes). They caught every critical issue and gave the clear times the area timers are set from.',
    'The 3D math and rasterizer unit tests (math3d, raster): they guard projection, rays and depth but caught nothing; every renderer problem was caught by screenshots instead.'
  ],
  engine: [
    'The deterministic fixed-step loop with headless game.advance, and the Humanoid rigs: they update the same in Node and in the browser, so hit volumes from real joints, the bots and the AI Hub replicas all agree, and the same rigs draw from any bearing as billboards.',
    'Yes. The handoff has no 3D engine, so a first-person light-gun game needed its own renderer. E.View cannot look up (pitch is clamped), so billboards fake the angle. A rig update with vx but no vy put NaN into the rig\'s walk phase for good, which made a boss unhittable until a test found it. The Humanoid constructor draws from Math.random, so the game reseeds each rig\'s clock for determinism. And I guessed wrong about the menus twice: the scenes checked a game.menuOpen property the engine does not have (a menu pauses the game instead), and the engine toggles pause on Escape before the scene runs, so the dev panel opened the pause menu over itself; the browser end-to-end test found both.',
    'Rail3D: a z-buffered, perspective-correct software rasterizer that samples E.materialTile textures in the engine\'s five light bands with Bayer dithering and fog, draws E.shapeMesh objects, and composites engine rigs as depth-tested billboards drawn by the engine from the bearing they are seen at.',
    'Fitting a first-person 3D shooter into a 2D engine built around ground views: the camera, culling, lighting, fog, rays and colliders had to be built beside it, while the menus, settings, rebinding, input, audio, boot screen and tables came for free and worked first time.',
    'Four patches, logged in engine/PATCHES.md: long guns (rifle, SMG, shotgun, launcher, sniper rifle, minigun, harpoon, flare pistol) and a cutlass on Humanoid with a fore-grip hand; PlayStation button glyphs by default with an Xbox option; mouse-wheel codes that can be bound; access to the sfx and music buses for the voice synth.',
    'A small perspective camera module beside Mode 7: E.shapeMesh and E.materialTile already exist for a 3D renderer, so a reference rasterizer using them would make light-gun, rail and FPS games first-class in the 2D package (and rig.update could reject NaN input).'
  ],
  prompt: [
    'It defines done completely: the controller-first 10-foot UI, prompts that follow the device, the attract mode, live dev sliders, couch and online play, the About screen and the exit interview, so the scope never had to be guessed.',
    'The plan was written for another run, so its file names and timestamps differ from TASK.md\'s (TASK.md wins), and the handoff it names has no 3D engine for a source that is first-person 3D.',
    'The volume: three stages, eight bosses and mini-bosses, a software renderer, split screen and AI Hub co-op, all art and sound in code, and then balancing it with bots so every area can be finished in its time.',
    'Say whether the repository\'s 3D engine may be used, and give a time or token budget so scope can be planned against it; ask for the feedback numbers to come from a log the tests keep.'
  ]
};
const HUBINFO = { goal: 'Clear the stage together; most points wins', howto: 'Aim mouse/stick - Fire click/R2 - Hold right-click/L2: cover+reload', minutes: 7 };
TC.ABOUT = {
  source: SOURCE, feedback: FEEDBACK, hub: HUBINFO,
  pages: [
    { title: 'TIDE CRISIS 3', rows: [['', 'An original arcade light-gun shooter on rails. Two agents of C.R.E.S.T. take Port Lumen\'s tidal barrier back from Admiral Silas Krake before the dawn king tide drowns the city.'], ['HOW IT PLAYS', 'Hold cover to dodge and reload; let go to pop out and shoot. Red rings mark the shots that will hit you. Orange vests carry ammo for the machine gun, shotgun and grenade launcher. Beat the clock in every area.'], ['MODES', 'Arcade (stages 1-3), Co-op (split screen), Stage select, Training, and AI Hub co-op for 1-4.'], ['MADE WITH', 'my-3D2dge (engine), Rail3D (our renderer), and code for every sound.']] },
    { title: 'SOURCE INFORMATION', rows: [['DATE', SOURCE.date], ['SOURCE', SOURCE.source], ['PLAN', SOURCE.plan], ['GENRE AND PERSPECTIVE', SOURCE.genre + '. ' + SOURCE.perspective], ['TECH', SOURCE.tech]] },
    { title: 'SOURCE INFORMATION (2)', rows: [['ART DIRECTION', SOURCE.artDirection], ['ANIMATION', SOURCE.animation], ['AUDIO', SOURCE.audio]] },
    { title: 'SOURCE INFORMATION (3)', rows: [['ONLINE', SOURCE.online], ['TESTING', SOURCE.testing], ['RESEARCH', SOURCE.research], ['ENVIRONMENT', SOURCE.environment], ['MODEL', SOURCE.model], ['USAGE', SOURCE.usage]] },
    { title: 'TESTING FEEDBACK', rows: [['ISSUES CAUGHT', FEEDBACK.testing[0]], ['CRITICAL', FEEDBACK.testing[1]], ['MOST HELPFUL TEST', FEEDBACK.testing[2]], ['LEAST HELPFUL TEST', FEEDBACK.testing[3]]] },
    { title: 'ENGINE FEEDBACK', rows: [['LIKED MOST', FEEDBACK.engine[0]], ['STUCK OR WRONG', FEEDBACK.engine[1]], ['BUILT OURSELVES', FEEDBACK.engine[2]]] },
    { title: 'ENGINE FEEDBACK (2)', rows: [['HARDEST PART', FEEDBACK.engine[3]], ['CHANGED IN THE ENGINE', FEEDBACK.engine[4]], ['ONE CHANGE', FEEDBACK.engine[5]]] },
    { title: 'PROMPT FEEDBACK', rows: [['LIKED MOST', FEEDBACK.prompt[0]], ['CONFUSING', FEEDBACK.prompt[1]], ['HARDEST', FEEDBACK.prompt[2]], ['WOULD CHANGE', FEEDBACK.prompt[3]]] },
    { title: 'THANKS AND LICENSES', rows: [['', 'Inspired by the Time Crisis series (Namco). Tide Crisis 3 is an original work: its world, cast, stages, music and art are new; the title is a pun.'], ['ENGINE', 'my-3D2dge, MIT license. AI Hub session client, its own license terms.'], ['THANKS', 'To every arcade that kept a pedal cabinet running.']] }
  ],
  credits: [['h', 'TIDE CRISIS 3'], ['s', 'A CREST ARCADE production'], ['n', ''], ['h', 'DIRECTED, WRITTEN AND BUILT BY'], ['n', 'Claude (Anthropic, claude-opus-5-5)'], ['n', 'from a plan by claude-opus-5-5'], ['h', 'ENGINE'], ['n', 'my-3D2dge v0.85.2 (patched)'], ['n', 'Rail3D perspective renderer'], ['h', 'MUSIC AND SOUND'], ['n', 'Chip tracker, synth SFX, gibberish voices'], ['n', 'all written in code'], ['h', 'CAST'], ['n', 'Kai Navarro - Rook Halvorsen'], ['n', 'Mari Tejada - Juno Achterberg'], ['n', 'Director Ines Hale - Dr. Tomas Tejada'], ['n', 'Admiral Silas Krake'], ['n', 'Barracuda - Hammerhead - The Gull'], ['h', 'SPECIAL THANKS'], ['n', 'Port Lumen, for its lanterns'], ['n', ''], ['s', 'Made with my-3D2dge']],
  exitInterview: {
    sourceInformation: SOURCE,
    testingFeedback: FEEDBACK.testing,
    engineFeedback: FEEDBACK.engine,
    promptFeedback: FEEDBACK.prompt,
    aiHub: {
      name: 'Tide Crisis 3', tagline: 'Duck. Pop. Shoot. Beat the tide.',
      description: 'An original arcade light-gun rail shooter in PS1-style pixel 3D: duck behind cover, switch between four weapons and race each area\'s clock to retake an island\'s tidal barrier before the dawn king tide. Play solo, couch co-op or AI Hub co-op for up to four.',
      type: 'Game', genre: 'Shooter', source: 'Time Crisis 3', series: 'Time Crisis', players: '1–4',
      controls: 'Mouse or stick aims - left click/R2 fires - hold right click/L2 for cover and reload - wheel/R1 switches weapons',
      tags: ['first-person', 'arcade', 'co-op', 'boss fights', 'pixel art', 'retro']
    }
  }
};
