/* ---- ABOUT / CREDITS: Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, exactly as the
 * builder reports them in the chat reply and exit-interview.json, plus the credits. Paged (left / right), one topic
 * per page. ---- */
const ABOUT_INFO = {
  date: '2026-11-04 06:21:25',
  source: 'Cricket (over-the-top arcade style)',
  plan: 'PLAN.md',
  genre: 'Arcade sports (cricket) with a comedy story campaign',
  perspective: '2.5D projected 3D: a telephoto TV broadcast camera behind the bowler for every delivery, a high wide camera following the ball, a side-on review camera and a close-up camera; three-quarter view for the story scenes',
  tech: 'my-3D2dge v0.85.2 (full engine, modified: see engine/CHANGES-KERFUFFLE.md), AI Hub Session Protocol v1 client 1.4.0, plain JavaScript, Web Audio; tests on Node 24 and Playwright 1.63.0',
  artDirection: "The engine's HD Humanoid pixel style at 320x240 expanded, canvas lighting, with new cricket assets (a KERFUFFLE shape set of 40 objects and 42 materials: stumps, pavilion, pub, greenhouse, church, Ferris wheel, jumbotron, the Thrumptonator, Doris the cow and more), five grounds painted from recipes and far-end panoramas",
  animation: "The engine's procedural Humanoid rigs driven by cricket attack specs (vertical-plane strokes, a windmill bowling arm), poses, a solvePose wrapper for umpire signals, and a two-handed bat grip added to the engine",
  audio: 'All code: chip-synth music (10 original songs with Hype and ON FIRE layers, 11 stings), synthesized SFX, a crowd engine (murmur, applause, formant roars and a KER-FUF-FLE chant) and Animalese-style gibberish formant voices',
  online: 'AI Hub Session Protocol v1, parallel mode: a Super Over Showdown for 1-4 players with the game\'s own card; local multiplayer for 1-4 on one screen',
  testing: 'Headless engine (game.advance, game.debug) in Node vm contexts, scripted playthroughs and bot matches, Playwright checks and screenshots in Chromium, WebKit and Firefox (a controller on the Gamepad API, an emulated iPhone), the AI Hub harness',
  research: 'None beyond the provided materials: the plan, the engine handoff docs and kits, and the AI Hub README and harness',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'Session time about 4 h 25 min by the system clock (06:21 to about 10:45); tokens and cost unknown'
};
const FEEDBACK = {
  "testing": [
    "About 47 issues across 24 suites (600 checks), the screenshot reviews and the engine's check tool: a delivery solver off by up to 3 units, a catch ring judged 20 ms before the catch, a run counted when both batters were sent back, a keeper also picked to bowl, a held advert or tea-tray pause that never counted down, Doris the cow shooing fielders off a ball resting by her, a result that ignored the Kerfuffle Method's revised target, throws from behind the stumps scored as missed shies, the toss screen crashing, a jumbotron covering tall screens, forced sixes hit twice the rope's distance, callouts drawn over each other, dev mode's Space switching tab and then running the new tab's first row, Escape opening the pause menu over dev mode, a dev-panel row that did nothing, the nets and attract songs missing their Hype and ON FIRE music layers (the engine warned, but the test contexts had silenced warnings; now any warning fails a suite), the hub-round and story-scene links crashing when opened without their data, an About answer taller than its screen, Quick Match's team rows doing nothing with two teams unlocked, a Highlights button with nothing to replay, the touch-only gate missing on iPhones whose WebKit reports no touch points, and more.",
    "About 8 were game-breaking: the two stalls (the pause that never ended and the cow), the keeper bowling to himself, runs counted for a batter sent back, the rain-rule result, the uncatchable catch ring, the toss crash, and the ball leaving the bowler's hand mid run-up.",
    "The bot-campaign suite: the whole story played by the autopilot, chapter by chapter with retries. It found the Kerfuffle Method result bug, the difficulty multipliers handicapping the player's own autopilot, non-deterministic match seeds, and a chapter too steep to win.",
    "The resolver-table rows in unit-shots: they restate the data table back to itself and never failed. Close behind, my first deep-link sweep: headless, the game boots its first scene before it reads the link, so every link stayed on the title and the sweep passed while testing nothing; it now goes through the router and fails when a guard is removed."
  ],
  "engine": [
    "The Humanoid rig and its attack specs: vertical-plane swings gave straight-bat strokes and the bowling windmill without hand-made animation. Close behind: shapes as data with asset-sheet's contact sheets, and exact headless runs with game.advance.",
    "Yes, a few times: game.go clears timers, so a deep link scheduled before the first scene never fired; palm and cactus are props, not shapes; the pixel font lacks the middle dot and ellipsis; and since draw doesn't run headless, mouse layouts computed only while drawing were missing in tests.",
    "The cricket simulation itself: ball physics with an exact predictor, the shot resolver and timing model, fielders' interception, catches and throws, running between wickets, LBW truth with Owl-Eye and the review system, plus the TV camera director and the painted far-end panorama.",
    "Reading depth in the low orthographic broadcast camera: a ball coming at the viewer has no perspective, so the shadow, pitch marker and trail have to carry it. A telephoto lens's far stands had to be faked with a painted panorama, and objects behind the camera culled by hand.",
    "Six changes, logged in engine/CHANGES-KERFUFFLE.md: (1) a cricket bat weapon with a two-handed grip, because the rig only had swords, guns and staffs; (2) pads, brim hats, helmet grilles, keeper gloves, moustaches and spectacles, for cricket kit and characters; (3) a voice bus and Voices volume, so the gibberish voices and crowd follow the player's volumes; (4) PlayStation button symbols by default, Xbox the option, as TASK.md asks; (5) Create + Options left to the AI Hub; (6) ten floor bakes kept instead of six, so the match cameras never re-bake.",
    "A perspective (telephoto) ground camera, or near-plane culling for the orthographic views: every sports or racing game wants the camera behind the action looking down a long axis."
  ],
  "prompt": [
    "The definition of done: a feature-complete vertical slice, a scripted full playthrough, an attract mode and dev mode. Those requirements forced the game to be robust, not just a demo of one match.",
    "How far the plan binds: its folder names carried another model's suffix, and some of its numbers (a 30-run chase, fielders at 15 m) needed retuning once played. TASK.md winning settled the names, not the numbers. And Online links only the hub, while multiplayer must also work for the game on its own.",
    "Scope: five grounds, six teams, a five-chapter story, eleven lessons, AI Hub sessions, local multiplayer, an attract showreel and dev mode, all complete with no stubs, plus making cricket's depth readable in an orthographic camera.",
    "Give a priority order for when the plan's content outruns the time, say the plan's numbers are starting values to tune, and supply token and cost figures so the Usage field can be filled."
  ]
};
const ABOUT = [];
function buildAbout() {
  const A = ABOUT_INFO; ABOUT.length = 0;
  ABOUT.push({ title: 'SOURCE INFORMATION', lines: [['Date', A.date], ['Source', A.source], ['Plan', A.plan], ['Genre and Perspective', A.genre + '. ' + A.perspective], ['Model', A.model], ['Environment', A.environment], ['Usage', A.usage]] });
  ABOUT.push({ title: 'TECH AND ENGINE', lines: [['Tech', A.tech], ['Engine changes', 'A cricket bat weapon with a two-handed grip; pads, brim hats, helmet grilles, keeper gloves, moustaches and spectacles; a voice bus and Voices volume; PlayStation button symbols by default with Xbox as the option; Create + Options left to the AI Hub; ten floor bakes kept instead of six.'], ['Research', A.research]] });
  ABOUT.push({ title: 'ART, ANIMATION, AUDIO', lines: [['Art Direction', A.artDirection], ['Animation', A.animation], ['Audio', A.audio]] });
  ABOUT.push({ title: 'ONLINE AND TESTING', lines: [['Online', A.online], ['Testing', A.testing]] });
  const q = (title, qs, ans) => ABOUT.push({ title, lines: qs.map((qq, i) => [qq, ans[i] || 'unknown']) });
  q('TESTING FEEDBACK', ['How many issues did testing catch?', 'How many were critical / game breaking?', 'The most helpful test', 'The least helpful test'], FEEDBACK.testing);
  q('ENGINE FEEDBACK', ['What I liked most', 'Did I get stuck or guess wrong?', 'The most important thing I built myself', 'The hardest part', 'What I changed in the engine, and why', 'One thing I would change'], FEEDBACK.engine);
  q('PROMPT FEEDBACK', ['What I liked most', 'What was confusing', 'The hardest thing to do', 'What I would change'], FEEDBACK.prompt);
  ABOUT.push({ title: 'CREDITS', lines: [['CRICKET KERFUFFLE', 'Design, code, art, music, sound and words: Claude (Anthropic claude-opus-5-5), from PLAN.md.'], ['Engine', 'my-3D2dge v0.85.2 by Michael Crosato (MIT), with the changes listed on page 2.'], ['Online', 'AI Hub session client 1.4.0 by Michael Crosato.'], ['Assets', 'Everything original and drawn or synthesized in code. Engine core shapes (tree, pine, palm, bench, cactus, rock) from the engine\'s own library; no store sets were needed.'], ['Thanks', 'To Doris, who has seen it all, and to the Reverend Hollis, who has seen very little of it.']] });
}
buildAbout();
K.ABOUT_INFO = ABOUT_INFO; K.FEEDBACK = FEEDBACK; K.buildAbout = buildAbout; K.ABOUT = ABOUT;
