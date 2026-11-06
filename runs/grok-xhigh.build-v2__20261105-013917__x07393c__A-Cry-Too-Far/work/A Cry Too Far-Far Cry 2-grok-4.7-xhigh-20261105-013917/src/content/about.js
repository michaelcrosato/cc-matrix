/** About pages. The HUD draws these uppercase. The usage line stays exact. */

export const USAGE = 'added on import';

export const SOURCE_PAGES = [
  ['SOURCE INFORMATION', 'Date: 2026-11-05 01:39:17', 'Source: Far Cry 2', 'Plan: PLAN.md'],
  ['GENRE AND PERSPECTIVE', 'Genre: first-person shooter', 'Perspective: first person on foot,', 'at the wheel, and in story scenes'],
  ['TECH', 'Pixel Engine 0.46.0', 'three.js r186', 'Rapier 0.20', 'esbuild 0.28.2', 'Original sim, fire grid, weapons, missions'],
  ['ART DIRECTION', 'Engine pixel-art toon, 480x270', 'Sand, orange and red land', 'Slate Concord, orange Harvest', 'Green only for water and regrowth'],
  ['ANIMATION', 'Engine clips on the soldier rig', 'First-person hands on a small rig', 'Mixer poses for reload, map, surgery'],
  ['AUDIO', 'Code songs, code effects, no files', 'Animalese voices', 'Music starts at 10 percent'],
  ['ONLINE', 'AI Hub shared-world, 1-4 players', 'Cash Run, 6 minutes', 'Same-computer link on a BroadcastChannel'],
  ['TESTING', 'node tests/run.mjs --all', 'Headless Engine.step playthrough', 'Playwright Chromium, WebGPU flags', 'Hub harness, four scenarios'],
  ['RESEARCH', 'Mechanics from the plan, not a port', 'No source maps, names, or plot'],
  ['ENVIRONMENT', 'Grok CLI, headless', 'Linux'],
  ['MODEL', 'xAI, grok-4.7, reasoning effort xhigh'],
  ['USAGE', USAGE],
];

export const TESTING_FEEDBACK = [
  ['TESTING FEEDBACK', 'How many issues did testing catch?', '13. Listed in tests/ISSUES.md.'],
  ['CRITICAL ISSUES', 'How many would be game breaking?', '13. Each one stopped a required path.'],
  ['MOST HELPFUL TEST', 'node tests/run.mjs --all.', 'One shared engine showed the leaks.'],
  ['LEAST HELPFUL TEST', 'A blank WebGPU screenshot.', 'The state read is the proof.'],
];

export const ENGINE_FEEDBACK = [
  ['ENGINE FEEDBACK', 'What did you like most?', 'Headless step, seeded RNG, HUD pixels,', 'and a vehicle that stays upright.'],
  ['STUCK OR GUESSED', 'Did you get stuck or guess wrong?', 'First-person yaw 0 looks down -Z.', 'The car yaw 0 drives toward +Z.', 'Speed is a writable field, as the plan said.'],
  ['BUILT YOURSELF', 'What did you build yourself?', 'The fire grid, jams, fever, map,', 'mission runner, and the hub round.'],
  ['HARDEST ENGINE PART', 'Pointer lock, timeScale pause,', 'and keeping Pad codes off the keyboard.'],
  ['CHANGED IN THE ENGINE', 'What did you change in the engine, and why?', 'None. pixel-engine.js is the kit file.'],
  ['ONE CHANGE', 'If you could change one thing?', 'A first-person rig that does not', 'steal the use key or the pointer.'],
];

export const PROMPT_FEEDBACK = [
  ['PROMPT FEEDBACK', 'What did you like most?', 'The plan names the traps and the', 'order to cut whole features.'],
  ['CONFUSING', 'What was confusing?', 'File stem spaces, and which card', 'the harness presses Enter on.'],
  ['HARDEST', 'What was the hardest thing?', 'One world that is a campaign,', 'a 6 minute round, and a hub server.'],
  ['CHANGE THE PROMPT', 'What would you change?', 'Ship the hub check before asking', 'for every prop in the art list.'],
];

export const CREDIT_PAGES = [
  ['CREDITS', 'Pixel Engine, MIT', 'three.js, MIT', 'Rapier, Apache-2.0', 'AI Hub session client'],
  ['CREDITS', 'Inspired by Far Cry 2; not affiliated'],
];

export function aboutPages() {
  return [...SOURCE_PAGES, ...TESTING_FEEDBACK, ...ENGINE_FEEDBACK, ...PROMPT_FEEDBACK, ...CREDIT_PAGES];
}
