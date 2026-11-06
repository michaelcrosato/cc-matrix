// Single source of truth for the About & Credits screen and exit-interview.json.
import { TITLE, TAGLINE } from './title.js';

export const SOURCE_INFO = {
  date: '2026-11-05 01:21:38',
  source: 'Wii Fit',
  plan: 'PLAN.md',
  genre: 'Fitness and balance minigame collection inside a light life-sim week (catalogue genre: Sports)',
  perspective: 'Isometric on the island; fixed front-on for class activities; side-on, top-down and behind-the-back fixed views for the games',
  tech: 'Pixel Engine 0.46.0 (three.js r186 and Rapier as bundled in it), plain JavaScript modules, esbuild for single-file packaging, AI Hub session client 1.4.0',
  artDirection: "The engine's native pixel look: toon materials, 16-colour palette, outlines; new models, avatars and textures written as engine data",
  animation: 'Engine ClipDef data compiled with compileClips and played through THREE.AnimationMixer, plus procedural lean layers and Squash',
  audio: 'Engine Song and SoundDef data for all music and sound effects, plus a Web Audio formant voice (Animalese-style gibberish). No audio files. Music defaults to 10% volume',
  online: 'AI Hub Session Protocol v1, ghost mode, own card, 1-4 players. Family Hour is local on one screen',
  testing: 'Headless scripts only (no subagents): one command, node tools/test.mjs, about 1,100 assertions. Node tests cover the Dot, clips, data, every activity with bots, a full scripted playthrough, saves, pause, dev tools, attract, determinism, the Medley and the voice. Playwright tests on the built file:// page cover WebGPU boot, gamepad stub, touch profile, two pads plus keyboard, audio, layout at 3 sizes, WebKit/Firefox failure, and the AI Hub harness (4 runs). Screenshots were used for composition only',
  research: 'Read the plan, the engine GUIDE.md and ASSETS.md and the hub README, and searched API.md. Did no outside research of my own; the director\'s plan included engine and hub research and spikes',
  environment: 'Claude Code CLI (headless); Linux',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
  usage: 'added on import',
};
export const TESTING_QA = [
  ['How many issues did testing catch?', 'About 14. Bot sweeps caught hoops being caught by accident while circling, a too-easy tray and header, and idle bots earning stars. The playthrough and unit tests caught attract mode ignoring input (a -1.7e-16 truthy grace timer), app state leaking between tests, and Settings blocking attract. The hub harness caught a missing Net object. Screenshots caught avatars slowly tipping over, backdrops never added to the scene, and HUD overlaps.'],
  ['How many would be considered critical issues / game breaking?', 'Three: avatars drifting horizontal after a few hundred frames (clips without a Torso track let the lean accumulate), any input not exiting attract mode, and the AI Hub card never answering Ready or sending progress (no Net object was created).'],
  ['What was the most helpful test you ran?', 'The scripted playthrough: it drives the real menus from a fresh save through all seven days, every station menu, goals, Drips, the Long Stand, the confession subtracting exactly 7 and Week 2. It found integration bugs no unit test would. The hub harness came second.'],
  ['What was the least helpful test you ran?', 'The layout-rectangle check. It only sees widgets that register a rect, so it stayed green while screenshots showed overlapping HUD (the jog meter, the results menu, the podium list).'],
];
export const ENGINE_QA = [
  ['What did you like most about the engine?', 'Toon materials, outlines and the 16-colour palette make almost anything look good with no art pipeline. Engine.headless runs the real game in Node, so a full scripted playthrough costs seconds. Models, clips and textures as plain data with checkers (check.mjs --sheets, validateClip, analyzeClip) kept the art loop honest.'],
  ['Did you get stuck or guess wrong?', 'Yes, several times. hitstop() freezes game steps in headless runs, so tests must wait for a state, not a time. With timeScale 0, update() still runs but dt is 0, so menu repeat timers need their own clock. A clip that omits Torso writes no track, so a procedural lean applied after the mixer accumulated every frame until the body lay flat. tools/clip-sheet.mjs could not run in Node for me (a settings-panel DOM error from renderSheet), so I judged poses in-engine instead.'],
  ['What was the most important thing you had to build yourself?', 'The pixel HUD UI kit: mixed-case text on a capitals-only font, navigation for pad, keyboard and mouse, menus and sliders, dialogue with voice sync, glyph prompts that follow the last device. Close behind: the Dot with its drivers (local, pad, bot, ghost) and the lane staging every activity shares.'],
  ['What was the hardest part about using the engine?', 'Layout and legibility at 10 feet in a bitmap HUD with no alpha, clipping or lowercase, across 480x270, 427x240 and 640x360 art sizes. Second hardest: placing cameras per scene on the fixed preset, which needed manual per-frame positioning.'],
  ['What did you change in the engine, and why? (none if nothing)', 'None. pixel-engine.js is byte-identical to the kit (a test compares its sha256).'],
  ['If you could change one thing about the engine, what would it be?', 'A retained UI layer with lowercase text, alpha, clipping and rounded panels, so a controller-first game does not have to draw its own font and widgets. Failing that, a working Node clip-sheet and a headless hitstop that does not eat steps.'],
];
export const PROMPT_QA = [
  ['What did you like most about this prompt?', 'The plan was unusually concrete: a Dot model with a measured table of bot results, verified recipes for the build, harness and screenshots, a build order, and a cut list. It let me start building the fun part immediately.'],
  ['What was confusing?', 'Some rules collide: Space and E are both Confirm and the tab keys (Q/E); the hammock "ends the day once you have done an activity" but also "never a block"; Hoop stars and Pier numbers have no measured bot data, only the Dot does. The scope of 17 activities plus Medley, hub, ghosts, attract and dev tools is larger than one run can polish.'],
  ['What was the hardest thing to do?', 'Delivering breadth with enough feel in each activity without seeing the game move. Every activity needed its own bots, HUD and staging, and the only way to judge feel was numbers and still screenshots.'],
  ['What would you change in this prompt?', 'Give measured bot tables for every activity (not just the Dot), state which key wins when two actions share one, say what happens at the hammock with zero activities, and mark the nice-to-haves (sunbeams, decals, ripples, camera push-in) as optional so they do not read as missing.'],
];
export const AIHUB = {
  name: TITLE, tagline: TAGLINE,
  description: 'A week at a spotless wellness island run by a small, polite, deeply judgmental bathroom scale. Your whole body is one dot. Keep it in the circle.',
  type: 'Game', genre: 'Sports', source: 'Wii Fit', series: 'Wii Fit', players: '1–4',
  controls: 'Left stick, WASD or mouse: lean. R2, Space or click: breathe. L1/R1, F/J or mouse buttons: step.',
  tags: ['pixel art', 'comedy', 'versus', 'arcade', '3d', 'story'],
};
export function exitInterview() {
  return {
    sourceInformation: { ...SOURCE_INFO },
    testingFeedback: TESTING_QA.map((q) => q[1]), engineFeedback: ENGINE_QA.map((q) => q[1]), promptFeedback: PROMPT_QA.map((q) => q[1]),
    aiHub: { ...AIHUB },
  };
}
const FIELD_LABELS = [['date', 'Date'], ['source', 'Source'], ['plan', 'Plan'], ['genre', 'Genre'], ['perspective', 'Perspective'], ['tech', 'Tech'], ['artDirection', 'Art direction'], ['animation', 'Animation'], ['audio', 'Audio'], ['online', 'Online'], ['testing', 'Testing'], ['research', 'Research'], ['environment', 'Environment'], ['model', 'Model'], ['usage', 'Usage']];
/** Pages: { title, blocks: [{h?, t}] } short enough to page rather than scroll. */
export function aboutPages(creditsText = '') {
  const pages = [];
  pages.push({ title: 'Credits', blocks: [{ h: TITLE, t: 'An original game inspired by Wii Fit. Written, drawn, animated and voiced in code. Built by Claude (claude-sonnet-5-5) on Pixel Engine 0.46.0.' }, { h: 'Cast', t: 'Ounce, a scale. Coach Plumb, 81. Marguerite. Dennis. June. Kevin, a seagull, staff.' }, { t: 'This is not medical advice. Ounce is a scale.' }] });
  pages.push({ title: 'Source Information (1/2)', blocks: FIELD_LABELS.slice(0, 7).map(([k, l]) => ({ h: l, t: SOURCE_INFO[k] })) });
  pages.push({ title: 'Source Information (2/2)', blocks: FIELD_LABELS.slice(7).map(([k, l]) => ({ h: l, t: SOURCE_INFO[k] })) });
  const qa = (title, list) => { list.forEach(([q, a], i) => pages.push({ title: `${title} (${i + 1}/${list.length})`, blocks: [{ h: q, t: a }] })); };
  qa('Testing Feedback', TESTING_QA); qa('Engine Feedback', ENGINE_QA); qa('Prompt Feedback', PROMPT_QA);
  pages.push({ title: 'Engine kit credits', blocks: [{ t: 'Pixel Engine, three.js and Rapier ship under their own licences. The kit\'s model library and packs come from their authors, listed in CREDITS.md.' }, { h: 'Full text', t: 'Next page: the whole CREDITS.md, scrollable.' }] });
  pages.push({ title: 'CREDITS.md', scroll: true, text: creditsText || 'CREDITS.md was not bundled.' });
  return pages;
}
