// ---- About / Credits (5.21): the same Source Information and feedback as the builder's reply, paged, one topic each.
// The text lives in ABOUT (filled from the exit interview's answers) so the screen and exit-interview.json agree.
const ABOUT = {
  date: '2026-11-04 06:27:57', source: 'Cricket (over-the-top arcade style)', plan: 'PLAN.md',
  genre: 'Arcade sports (cricket), over the top, with a comedy story campaign',
  perspective: '2.5D in projected-3D views: a TV broadcast camera behind the bowler for every delivery, a high wide camera following the ball, close-ups and a side-on review camera; story scenes in a three-quarter view',
  tech: 'my-3D2dge v0.85.2 (the full engine, modified), AI Hub session client 1.4.0, plain JavaScript, Web Audio; tests on Node and Playwright 1.63.0',
  art: "The engine's HD Humanoid pixel style at 320x240 expanded, canvas lighting, engine shapes and materials, with new cricket assets (stumps, sight screens, the pub, the Thrumptonator, Doris the cow and more)",
  animation: "The engine's procedural Humanoid rigs, with a cricket layer of IK post-poses: two-handed bat swings by shot family, the bowler's overarm windmill, umpire signals; E.move throws, poses and dives",
  audio: 'Chip-synth music in layers (base, drums, fire), synthesized effects, a crowd engine (bed, applause, roars) and Animalese-style gibberish formant voices, all in code',
  online: 'AI Hub Session Protocol v1: a parallel Super Over at the Megadome for 1 to 4 players, with the game\'s own card',
  testing: 'Headless engine (game.advance, game.debug), scripted playthroughs and bot matches behind one command, Playwright browser checks, the AI Hub harness',
  research: 'None beyond the plan, the engine handoff docs and kits, and the AI Hub protocol README and example',
  environment: 'Claude Code CLI (headless); Linux; browser unknown', model: 'Anthropic, claude-opus-5-5, reasoning effort medium', usage: 'unknown',
  testingFeedback: [], engineFeedback: [], promptFeedback: []
};
let ABOUT_PAGES = [];
function aboutPages() {
  const A = ABOUT, q = (l, a) => a.map((x, k) => '• ' + l[k] + ' ' + x);
  ABOUT_PAGES = [
    ['SOURCE INFORMATION', ['Date: ' + A.date, 'Source: ' + A.source, 'Plan: ' + A.plan, 'Genre: ' + A.genre, 'Perspective: ' + A.perspective, 'Environment: ' + A.environment, 'Model: ' + A.model, 'Usage: ' + A.usage]],
    ['TECH AND ENGINE', ['Tech: ' + A.tech, 'Engine changes (engine/CHANGES-KERFUFFLE.md): a cricket bat weapon with a two-handed grip; batting pads; moustaches, beards and glasses; PlayStation button symbols by default with Xbox in Settings; Create + Options left to the AI Hub; ten cached floor bakes.']],
    ['ART, ANIMATION, AUDIO', ['Art direction: ' + A.art, 'Animation: ' + A.animation, 'Audio: ' + A.audio]],
    ['ONLINE AND TESTING', ['Online: ' + A.online, 'Testing: ' + A.testing, 'Research: ' + A.research]],
    ['TESTING FEEDBACK', q(['How many issues did testing catch?', 'How many were critical?', 'Most helpful test:', 'Least helpful test:'], A.testingFeedback)],
    ['ENGINE FEEDBACK', q(['Liked most:', 'Stuck or guessed wrong:', 'Built myself:', 'Hardest part:', 'Changed:', 'One change:'], A.engineFeedback)],
    ['PROMPT FEEDBACK', q(['Liked most:', 'Confusing:', 'Hardest:', 'Would change:'], A.promptFeedback)],
    ['CREDITS', ['CRICKET KERFUFFLE. Design, code, art, animation, music, sound and words: made with Claude (Anthropic) from TASK.md and PLAN.md.', 'Engine: my-3D2dge v0.85.2 by Michael Crosato (MIT), modified for this game.', 'AI Hub Session Protocol v1, client 1.4.0, by Michael Crosato.', 'No asset files: every object, sprite, song, sound and voice is drawn or synthesized in code. Engine core shapes (trees, pines, rocks) and props (palms, cacti).', 'Thank you for playing. Lord Thrumpton-Vane is adequate at fine leg.']]
  ];
}
aboutPages();
