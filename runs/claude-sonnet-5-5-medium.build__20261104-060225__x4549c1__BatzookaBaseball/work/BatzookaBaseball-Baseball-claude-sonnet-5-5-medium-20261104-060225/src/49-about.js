/* BATZOOKA BASEBALL: About / Credits text: Source Information and the feedback sections (also saved in exit-interview.json). */
BZ.SOURCE_INFO = {
  date: '2026-11-04 06:02:25',
  source: 'baseball (over the top arcade style)',
  plan: 'PLAN.md (written by claude-opus-5-5 at max effort; followed where it fits, TASK.md won where they differ)',
  genre: 'Arcade sports (baseball) with a slapstick brawl mini-game (the Rhubarb) and a short story Tour with light upgrades',
  perspective: 'A three-quarter broadcast camera over a textured ballpark, framed behind the plate for the pitch duel with a strike-zone inset, pulling out to follow the ball in play',
  tech: 'my-3D2dge v0.85.2 handoff engine (one file, small modified copy), pixel canvas at ps1 resolution with expand, plain JavaScript concatenated into one IIFE, AI Hub client 1.4.0 pasted unmodified, Playwright 1.63.0 for the tests',
  artDirection: 'The engine\'s native HD Humanoid pixel-art rigs dressed per team, on ballparks generated from geometry (mown stripes, infield dirt, chalk, fence, stands with a crowd) in four themed parks: a cornfield, the moon, a volcano and a corporate megadome; lights, ash, leaves, fire trails and dust clouds',
  animation: 'The engine\'s Humanoid rig and E.MOVES (overhead, throw, haymaker, cross, hook, jab), custom swing and bunt specs, poses (cheer, kneel, down, crouch) and a Blob mascot; all baseball motion is composed in code, no motion-capture files',
  audio: 'All in code with the engine\'s chip synth: six original songs with a drum layer that comes in with the tension, sound effects, a stadium-organ charge call, and Animalese-style babble voices for the radio duo and the story scenes. No audio files',
  online: 'AI Hub session protocol v1, mode parallel: in a hub session the game opens straight into a Batzooka Derby round where every player faces the same pitches and reports a derby score. Outside the hub it plays on its own, 1 to 4 players on one machine',
  testing: 'Headless only: node scripts that play whole seeded games and a bot that plays through the same input intents as a person, one command (node tests/run.mjs --browser) that prints only failures and a count, a Chromium smoke test of every scene and a scripted playthrough, the AI Hub harness; no subagents',
  research: 'Read TASK.md, PLAN.md, the engine card, the sports kit and the AI Hub protocol; no other research',
  environment: 'Claude Code CLI (headless); Linux; browser unknown (tested in headless Chromium 153)',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
  usage: 'unknown (no estimate available in this session)'
};
BZ.FEEDBACK = {
  testing: [
    'About nine real issues: a derby soft-lock when a pitcher fielded the ball, more than three outs after a double play, a pitch model that put 40 balls a game outside the zone, exit speeds that made 58 runs a game, wild throws caused by aiming at the base instead of the baseman, a deep link that the first scene change cancelled, a mascot update call that threw, camera framing that hid the batter, and a test harness that forgot to feed the bot its inputs.',
    'Three: the derby soft-lock, the unplayable balance (walk-fests and 58-run games) and the deep link that dropped the scene.',
    'Thirty seeded CPU-versus-CPU games across all four parks with a per-game event count. It showed in seconds that strikeouts never happened, that walks and wild throws were far too common and that scores were off by a factor of ten.',
    'Screenshots of timing-dependent moments. The headless browser ran at about 12 frames a second, so the game state drifted from the wall clock; they only became useful once I stepped the game with game.advance and polled for a condition.'
  ],
  engine: [
    'The Humanoid rigs with E.MOVES (a readable swing, throw and punch from a name), the TileMap floorTex hook that let me paint a whole ballpark from geometry, the fixed-step game.advance for headless play, and that pause, settings, rebinding and full screen are simply there.',
    'Yes. The three-quarter view is not one pixel per unit, so my first framing hid the plate; the Backdrop does not show in a ground view; game.after timers die with a scene change (it ate my deep link); and the staff weapon draws a glowing gem, so my bat looked like a wand until I found the orb color.',
    'The whole baseball: rules, the pitch and contact model, ball physics with fence and foul geometry, fielding AI, force and tag logic, baserunning, the Batzooka meter, the CPU players and a bot. Also the ballpark generator and the button-glyph renderer for PlayStation, Xbox, keyboard and mouse.',
    'Keeping a 240-pixel-tall buffer legible: framing a pitch duel and a fielding scramble with one camera, and fitting HUD, zone inset and prompts without hiding the players.',
    'One small change: the Button symbols setting now defaults to PlayStation and offers PlayStation or Xbox only, as the prompt asks. Everything else (bat, mitts, hats) was done in game code with colors and overdraw, so the engine stayed untouched.',
    'A first-class perspective "plate cam": a ground view with a lower camera and depth scaling for rigs that works with the TileMap, so a behind-the-batter view does not need Mode 7 billboards. A bat and a glove as Humanoid weapon types would be next.'
  ],
  prompt: [
    'The shape of the ask: a real vertical slice with attract mode, dev mode with sliders, hub integration and a one-command headless test, and the exit-interview JSON that makes the result machine readable. The plan was thorough about rules.',
    'The plan is about 150 KB, far more than fits in working memory, and it asks for things that conflict with medium effort (Mode 7 plate cam, motion-capture clips, engine edits). Its file names use an older stamp than TASK.md. Hub mode was ghost in the plan and parallel in my build; it was not clear which mattered.',
    'Scope. A baseball sim with fielding, running, a CPU, four modes, a tour and a hub round has a lot of rules that all interact, and every one needs a play-feel pass without a human at the controller.',
    'Add a short ranked list of must-have versus nice-to-have to the plan, say exactly which of the plan and the task wins for each conflict in one place, and say how much of the plan is expected at each effort level.'
  ]
};
BZ.ABOUT = [
  ['ABOUT', 'BATZOOKA BASEBALL is an over-the-top arcade baseball game. Pitch fireballs, swing a rocket-powered bat, rob homers by leaping the wall, and empty the benches in a slapstick dust cloud.\n\nPLAY BALL is a full game against the CPU or a friend. THE TOUR is a short story across four ballparks (a cornfield, the moon, a volcano and a corporate megadome) with Fan Bucks to spend. HOME RUN DERBY is for sluggers (1 to 4 players, one screen). SPRING TRAINING teaches batting, pitching, fielding, running and the Batzooka in five short lessons.\n\nThe Batzooka meter fills with big plays. Full, it fires a rocket-powered swing, a fireball pitch or the rocket glove.\n\nAfter 10 seconds idle on the title screen a CPU game plays as a demo; any button ends it. Open the pause menu for the Playbook, Dev Mode (live balance sliders, with a reset) and Settings. Button symbols can be PlayStation or Xbox in Settings.'],
  ['SOURCE INFORMATION', Object.entries({ Date: BZ.SOURCE_INFO.date, Source: BZ.SOURCE_INFO.source, Plan: BZ.SOURCE_INFO.plan, 'Genre and perspective': BZ.SOURCE_INFO.genre + '. ' + BZ.SOURCE_INFO.perspective, Tech: BZ.SOURCE_INFO.tech, 'Art direction': BZ.SOURCE_INFO.artDirection, Animation: BZ.SOURCE_INFO.animation, Audio: BZ.SOURCE_INFO.audio, Online: BZ.SOURCE_INFO.online, Testing: BZ.SOURCE_INFO.testing, Research: BZ.SOURCE_INFO.research, Environment: BZ.SOURCE_INFO.environment, Model: BZ.SOURCE_INFO.model, Usage: BZ.SOURCE_INFO.usage }).map(([k, v]) => k.toUpperCase() + ': ' + v).join('\n\n')],
  ['TESTING FEEDBACK', ['How many issues did testing catch?', 'How many were critical?', 'Most helpful test?', 'Least helpful test?'].map((q, i) => q + '\n' + BZ.FEEDBACK.testing[i]).join('\n\n')],
  ['ENGINE FEEDBACK', ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'].map((q, i) => q + '\n' + BZ.FEEDBACK.engine[i]).join('\n\n')],
  ['PROMPT FEEDBACK', ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'].map((q, i) => q + '\n' + BZ.FEEDBACK.prompt[i]).join('\n\n')],
  ['CREDITS', 'GAME: Batzooka Baseball, built by Claude (claude-sonnet-5-5) from a plan by claude-opus-5-5.\n\nENGINE: my-3D2dge by Michael Crosato.\n\nONLINE: AI Hub session client 1.4.0.\n\nPLAY-BY-PLAY: Tex and Dusty, who are not real people and are not responsible for what they said.\n\nSPECIAL THANKS: the Haymakers, the Lunar Lemurs, the Cinder Sluggers and Mortimer Megamax, who owns the ball, the bat and the word "fun".\n\nEverything you saw and heard was drawn and played by code: no image files, no audio files.']
];
