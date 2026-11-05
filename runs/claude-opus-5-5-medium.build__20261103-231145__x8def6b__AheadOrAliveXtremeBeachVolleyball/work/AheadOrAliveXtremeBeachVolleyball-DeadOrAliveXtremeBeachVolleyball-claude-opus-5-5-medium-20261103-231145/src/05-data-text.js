/* 05-data-text: letters, and the About & Credits pages (the Source Information and the three feedback sections, the
 * same text as the build's final report and exit-interview.json). */
G.LETTERS = {
  pepper_welcome: { from: 'pepper', text: ['Welcome. The rules again, since nobody listens:', 'Morning, afternoon, night. Each visit uses one. Matches pay. The casino does not, usually.', 'The Fortuna Cup is on Day 5. — P.'] },
  sonny_flyer: { from: 'sonny', text: ['FREE CHIPS FOR CHAMPIONS!', 'Casino Fortuna, every NIGHT! Bring friends! Bring MONEY! — Your pal, Sonny'] },
  friend_note: { from: 'auto', text: [] },
  pepper_warning: { from: 'pepper', text: ['The Final is tomorrow. Mr. Fortuna\'s serve is... dazzling. Eyewear is advised.', 'His partner will be me. I do not miss lines. — P.'], after: () => { const S = G.state; if (S.flags.pinstripe && !S.flags.pinstripeSeen) { S.flags.pinstripeSeen = true; G.toast('Pepper\'s Pinstripe', 'A swimsuit came with the letter: it is in your wardrobe.'); } } },
  sonny_hype: { from: 'sonny', text: ['FINAL HYPE!!! THE FORTUNA CUP!!!', 'THIS AFTERNOON! THE HOUSE VERSUS YOU! Bring sunglasses, I\'m TOO BRIGHT!'] },
  rumor: { from: 'pepper', text: ['A rumor is going around that Mr. Fortuna bet something large on the Cup.', 'I could not possibly comment. — P.'] }
};
// the friend's note is written by whoever likes you most
Object.defineProperty(G.LETTERS.friend_note, 'from', { get() { const S = G.state; return S ? G.npcs().sort((a, b) => G.aff(b) - G.aff(a))[0] : 'rin'; } });
Object.defineProperty(G.LETTERS.friend_note, 'text', { get() { const id = this.from; return [G.LINES[id] ? G.LINES[id].chat[3] : 'See you on the sand.', 'See you on the sand. — ' + (G.CAST[id] ? G.CAST[id].short : '')]; } });
G.ABOUT_INFO = {
  date: '2026-11-03 23:11:45',
  source: 'Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, Xbox, 2003)',
  plan: 'PLAN.md',
  genre: 'Sports (arcade 2-on-2 beach volleyball) with a light life-sim vacation (calendar, friendships, gifts, swimsuit collecting) and minigames (rhythm Pool Hop; casino slots, blackjack, roulette)',
  perspective: 'Matches: a side-on TV Broadcast camera (yaw 8, pitch 32) with an alternate Serve Cam behind your team; walkable places: three-quarter; island map: isometric; shops, casino tables and menus: full-screen canvas UI over the world',
  tech: 'my-3D2dge v0.85.2 (the full engine, my-3d2dge.js, patched: see Engine Feedback), plain JavaScript in one IIFE, AI Hub session client 1.4.0 (unmodified); tests on Node 24 and Playwright 1.63.0 with Chromium; one self-contained HTML file, no runtime libraries or network',
  art: 'The engine\'s native PS1-era pixel art (res ps1, expand): HD Humanoid rigs on a custom athletic build with code-drawn swimsuit cuts and 14 patterns, extra hair styles and accessories; resort objects written as E.SHAPES data; custom backdrops by time of day; a tropical palette',
  animation: 'The engine\'s native rig animation as the base (procedural walk, run, idle, jump and held poses), an arm-IK layer (E.ik3) around solvePose for every volleyball move and photo pose, timed from the match\'s contact plan, and 20 motion-capture clips played through the engine\'s Mocap.drive (cut with tools/anim-set.mjs from its Quaternius, Mesh2Motion and CMU sets) for celebrations, gestures, gift reactions, party dances, idles and Sonny\'s pratfall',
  audio: 'All synthesized in code: 9 songs in the engine\'s step sequencer with added instruments (steel drum, marimba, pluck, bell, organ, pad), 10 jingles, about 50 sound effects, noise ambience loops, and Animalese-style letter-by-letter voices with a profile per character',
  online: 'AI Hub Session Protocol v1 in shared-world mode: 1-4 players, the game\'s own card, host-authoritative match with deterministic ball launches on the hub clock, client-judged touches the host validates, CPUs in empty seats, finish() standings with stats and an MVP award',
  testing: '19 suites behind one command (node test/run.mjs prints only failures and a count; 355 checks): headless game.advance / game.debug suites for core, data, ball, rules, match, vacation, casino, Pool Hop, UI, attract, dev mode, postcards, motion clips, a clause-by-clause TASK.md audit, real-browser checks with real key and touch events (two players on one keyboard, a touch-only phone), a by-hand review\'s checks of the remaining paths (New Vacation+, letters, the save screen, the title postcard, the hub\'s time-up), and a scripted whole-vacation playthrough to both endings; a Playwright browser tour with a touch-only device; the AI Hub harness in four scenarios; screenshots and the engine checker for looks; no subagents',
  research: 'Read the engine handoff (API card, index, guide sections, asset card, the sports kit, the Humanoid, Dialog and audio source) and the AI Hub protocol README and harness. The source game was described from general knowledge; no web research.',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
  usage: 'unknown'
};
G.FEEDBACK = {
  testing: [
    'About 31 game issues: a line opened inside a dialog\'s callback firing its own ending at once (it could skip story lines and a time slot), New Vacation+ missing its Skip the Welcome Match option, a leftover empty loop in the casino props, Sonny lines missing his ALL-CAPS bursts, saves that were never wired into the game (only the tests set them up), the clip player replacing the rigs\' own move code, crashes from a name clash and a scoping slip, scenes drawn before they were entered, a sound table the browser rejected, an attract mode you could not leave during its photo beat, 50-touch rallies, AI skill that barely mattered, a slot machine paying 132%, a split-keyboard key clash on the join screen, missing font glyphs, and framing and overlap problems on several screens.',
    'About 9: dialog follow-ups skipping story lines and a time slot, saving, autosave and Continue doing nothing in the real game, rigs losing every volleyball move after their first motion clip, the title crash (two systems both named G.dev), a crash on every attack, the scene registry missing at load, the menu crashing when drawn before entry, the music instrument error, and the attract mode trapping the player.',
    'The scripted whole-vacation playthrough (both endings, every story event, the casino, Pool Hop and saves) together with the AI-vs-AI match statistics (rallies average 6.2 touches, inside the 3-8 target), and the clause-by-clause TASK.md audit; and, for online play, the AI Hub harness run in four scenarios.',
    'The single-frame title screenshots and the engine checker\'s view cycling: useful once each, but they could not show timing or motion, which only the scripted runs caught.'
  ],
  engine: [
    'The Humanoid rig: one constructor gives a shaded, dressed, animated character that also draws its own portrait, and its pose can be post-processed, so swimsuits, new hair and every volleyball move were additions, not rewrites. The fixed-step clock made every test deterministic.',
    'A little: I passed 0 as the alpha of groundRing, used a material pattern name that does not exist (plaster), and had to read the source to learn that joined players take the scene\'s keys through halfKeys. The index answered most other questions.',
    'The volleyball itself: a closed-form ball, contact planning, the timing judge, blocks, faults, the AI and its error model; and the swimsuit cuts and patterns drawn inside the torso.',
    'Hooking into the Humanoid\'s draw, which is one large function: swimsuits needed an engine patch for a callback.',
    'Six patches, each marked AOA: in the source: PlayStation symbols and arrows in the 5x7 font; the Button symbols setting (PlayStation by default, Xbox option, in the Game group); a per-letter function voice in Dialog; a voice bus and bus() accessor; named instrument waves, pluck decay, lowpass and detune for music; swim shorts and a swimDraw hook in the Humanoid; reserveCombo so Options is ignored while Create is held (an AI Hub rule).',
    'A documented per-part draw hook for outfits, so new clothing needs no engine edit.'
  ],
  prompt: [
    'It is concrete about the player\'s experience (a 10-foot controller-first UI, glyph rules, the touch-only gate, the attract mode, dev sliders) and about the deliverables, so done is clear.',
    'The plan asks for far more content than one medium-effort session can build in full; how to trade breadth for depth was left to judgement.',
    'Fitting a five-day vacation sim, three minigames and online play around a timing-based sports core, with every screen controller-first.',
    'Say which parts of a plan are musts and which are stretches, so the builder can scope deliberately.'
  ]
};
G.ABOUT = [
  ['Credits', [
    ['', 'Ahead or Alive: Xtreme Beach Volleyball is an original parody-tribute inspired by Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, Xbox, 2003). No assets from it are used; every character, line, song and picture here is new.'],
    ['Design, code, art, music and writing', 'Claude (claude-opus-5-5, Anthropic), built from PLAN.md'],
    ['Engine', 'my-3D2dge v0.85.2 (MIT, github.com/michaelcrosato/my-3d2dge), modified: see Engine Feedback'],
    ['Online', 'AI Hub session client 1.4.0 (github.com/michaelcrosato/ai-hub), unmodified'],
    ['Motion clips', 'Via the engine\'s mocap sets: the Quaternius Universal Animation Library (CC0), Mesh2Motion (CC0) and the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu, free for all uses)'],
    ['Thanks', 'To everyone who ever spent a whole vacation buying swimsuits instead of practicing their serve.']]],
  ['Source Information', () => [['Date', G.ABOUT_INFO.date], ['Source', G.ABOUT_INFO.source], ['Plan', G.ABOUT_INFO.plan], ['Genre and Perspective', G.ABOUT_INFO.genre + '. ' + G.ABOUT_INFO.perspective], ['Tech', G.ABOUT_INFO.tech], ['Art Direction', G.ABOUT_INFO.art], ['Animation', G.ABOUT_INFO.animation], ['Audio', G.ABOUT_INFO.audio], ['Online', G.ABOUT_INFO.online], ['Testing', G.ABOUT_INFO.testing], ['Research', G.ABOUT_INFO.research], ['Environment', G.ABOUT_INFO.environment], ['Model', G.ABOUT_INFO.model], ['Usage', G.ABOUT_INFO.usage]]],
  ['Testing Feedback', () => ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'].map((q, k) => [q, G.FEEDBACK.testing[k]])],
  ['Engine Feedback', () => ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'].map((q, k) => [q, G.FEEDBACK.engine[k]])],
  ['Prompt Feedback', () => ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'].map((q, k) => [q, G.FEEDBACK.prompt[k]])]
].map(([t, rows]) => [t, rows]);
// pages whose rows are built when shown
G.ABOUT = G.ABOUT.map(([t, rows]) => [t, typeof rows === 'function' ? rows : () => rows]);
