/* About & Credits: the Source Information and the feedback sections (also saved in exit-interview.json). */
(() => {
const BB = globalThis.BB;
const R = BB.REPORT = {
  source: {
    date: '2026-11-04 05:38:03', source: 'Big Buck Hunter Pro (Play Mechanix / Raw Thrills arcade shooter, 2006)', plan: 'PLAN.md (written by claude-opus-5-5 at max effort)',
    genre: 'Arcade light-gun hunting shooter with party versus and bonus mini-games', perspective: 'First person, on rails: fixed vantage per site with scripted camera pans over a pseudo-3D column landscape; side-on x-ray shot-chart cards; 2D menu and lodge screens',
    tech: 'JavaScript in one HTML file; my-3D2dge engine v0.85.2 (handoff package, full engine, game loop, input, audio synth, UI helpers, dialog); own pseudo-3D strip renderer; AI Hub session client 1.4.0 (lib/hub); headless Node vm tests',
    artDirection: "The engine's retro-modern outlined pixel style (480x270, shaded tones, 5x7 font); all animals, antlers, props, scopes and HUD drawn procedurally in code",
    animation: "Engine pixel drawing plus a procedural four-legged rig (two-bone leg IK, walk/trot/run gaits, graze/alert/drink poses, death fold) and engine Humanoid portraits for the cast",
    audio: 'All music, sound effects and voices synthesised in code with the engine chip synth: bluegrass-flavoured chiptune songs, layered gunshots with valley echoes, animal calls, Animalese-style gibberish voices; no audio files',
    online: 'AI Hub session protocol v1, ghost mode: own card, 3-minute timed Hunt-Off with seeded sites, other hunters shown as ghost reticles, progress and result reporting; plays normally when no hub answers',
    testing: 'Headless scripted tests with game.advance and game.debug (no subagents or workflows); a browser smoke check of the built file; screenshots only for what scripts cannot check',
    research: 'None for this build. The plan\'s research (Wikipedia, Highway Games listing, Macworld review) was used as given; nothing was re-verified',
    environment: 'Claude Code CLI (headless); Linux; browser unknown',
    model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
    usage: 'unknown'
  },
  testing: [], engine: [], prompt: []
};
BB.REPORT_PAGES = [{ tab: 'SOURCE', kind: 'source' }, { tab: 'TESTING', kind: 'testing' }, { tab: 'ENGINE', kind: 'engine' }, { tab: 'PROMPT', kind: 'prompt' }, { tab: 'CREDITS', kind: 'credits' }];
const SRC_LABELS = [['date', 'Date'], ['source', 'Source'], ['plan', 'Plan'], ['genre', 'Genre'], ['perspective', 'Perspective'], ['tech', 'Tech'], ['artDirection', 'Art Direction'], ['animation', 'Animation'], ['audio', 'Audio'], ['online', 'Online'], ['testing', 'Testing'], ['research', 'Research'], ['environment', 'Environment'], ['model', 'Model'], ['usage', 'Usage']];
BB.reportLines = (pg, width) => {
  const E = BB.E, out = [];
  const para = (label, text) => { out.push({ t: label, c: '#ffd36a' }); for (const l of E.font.wrap(text, width - 8)) out.push({ t: l, ind: 8 }); };
  if (pg.kind === 'source') { out.push({ t: 'SOURCE INFORMATION', c: '#ffe27a' }); for (const [k, l] of SRC_LABELS) para(l, R.source[k]); }
  else if (pg.kind === 'credits') {
    out.push({ t: 'BIG BUCK HUNT-OFF', c: '#ffe27a' }); out.push({ t: 'A playful riff on a cabinet shooter. Original art, music, sound, voices and writing.' });
    out.push({ t: '' }); para('Built with', 'my-3D2dge engine v0.85.2 (Michael Crosato). AI Hub Session Protocol client 1.4.0.');
    para('Cast', 'The Emcee, Uncle Dub, Granny Mae, Cousin Dwayne, Loretta Pruitt and Big Earl. All gibberish, no real words spoken.');
    para('Made by', 'claude-sonnet-5-5 (Anthropic), reasoning effort medium, from a plan by claude-opus-5-5.');
    para('No animals were harmed', 'Hits throw puffs of fur and dust. Animals fold up and lie down. Does are protected by law, by Dub and by the Emcee.');
  } else { const titles = { testing: 'TESTING FEEDBACK', engine: 'ENGINE FEEDBACK', prompt: 'PROMPT FEEDBACK' }; out.push({ t: titles[pg.kind], c: '#ffe27a' }); const qs = BB.REPORT_Q[pg.kind]; R[pg.kind].forEach((a, i) => para(qs[i] || ('Q' + (i + 1)), a)); }
  return out;
};
BB.REPORT_Q = {
  testing: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engine: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why? (none if nothing)', 'If you could change one thing about the engine, what would it be?'],
  prompt: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?']
};
R.testing = [
  'About 13 real issues across the tests and a browser smoke run: a Big Mo crash every frame, a hub-mode crash on start, flat magenta ground and trees from rgb() colour strings, a Trophy Cam that fired on every dev-spawned kill, a bot that fired 74 shots for 1 hit, a trophy the bot could never trigger, flying critters that climbed off screen, banner spam after a lost trophy, unknown input actions in dev mode, and font glyphs that printed as ?.',
  '3 would be game breaking: the Big Mo update crash, the AI Hub round crash on start, and the magenta rendering. The rest were wrong behaviour or polish.',
  'The scripted playthrough of the whole Hunt-Off (a cheating expert bot, confirm taps through every dialog, tally and result screen, all 15 sites and a ceremony) plus the same run in the built file with drawing on: it exercised every scene and the draw paths that headless runs skip.',
  'The determinism hash and the 160 second attract survival check never failed and told me little; the multiplier unit checks mostly caught mistakes in my own test helpers.'
];
R.engine = [
  'The fixed-step game loop with game.advance and a headless mode, so the whole game could be played and checked in Node in seconds; the chip synth with custom voices and songs; E.Dialog with live Humanoid portraits; the standard pause, settings and controls screens that cost nothing.',
  'Yes. px colours and E.tones want #rrggbb: an rgb() string made E.tones and E.hex return NaN and the ground drew magenta with no error. Input actions must be declared up front, and the pad glyph and device helpers took some reading. The overlay draw is not run headless, so draw bugs only showed in the browser.',
  'The first-person view: a column terrain renderer with depth strips, billboards, fog, scope lens passes and occlusion-correct shot picking, plus the four-legged animal rig with gaits, hit zones and antlers, the animal AI and the bot.',
  'Fitting a pseudo-3D first-person shooter into a 2D engine built for ground, side and iso views: the engine has no camera model for it, so the world, hit testing and depth sorting are all the game\'s own.',
  'Nothing. The engine file is the handoff copy unmodified; everything new lives in the game sources.',
  'A first-person pseudo-3D view type (heightfield, billboards, fog, mouse picking) with the Mode 7 style view cache, so shooters like this need less custom rendering. Accepting CSS colour strings in px and E.tones would also have saved me an hour.'
];
R.prompt = [
  'The clear deliverable list (one file, exit interview JSON, named sections), the freedom to cut the plan, and the strong steer to test headless with game.advance and game.debug.',
  'The plan names a different output file and dev folder (opus, 2026-11-03) than TASK.md and STAGE.md ask for; I followed TASK.md. The plan is far larger than a medium-effort session can build, and it does not say which parts are essential.',
  'Scope: 27 systems, three hunts, trophies, bonus games, a range, dev mode, attract mode, local four-player and an AI Hub round with the one 10-foot controller-first UI, all in one session without an art pipeline.',
  'Mark the essential systems of a plan against optional ones, state how much work a build stage should expect, and name one output file in all the documents. Say how to count usage so the Usage line is not always unknown.'
];
})();
