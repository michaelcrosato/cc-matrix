// The one source of truth for About & Credits and for exit-interview.json.
import { TITLE, TAGLINE } from './title.js';
export const DELIVERABLE = 'WibbleFit-WiiFit-claude-opus-5-5-medium-20261105-001833';
export const SOURCE_INFO = {
  date: '2026-11-05 00:18:33',
  source: 'Wii Fit',
  plan: 'PLAN.md',
  genre: 'Fitness and balance minigame collection inside a light life-sim week',
  perspective: 'Isometric on the island; fixed front-on for class activities; other fixed views per activity',
  tech: 'Pixel Engine 0.46.0 (riftlight kit) with three.js r186 and Rapier as bundled in it; esbuild 0.28.2 for packaging; no other libraries',
  artDirection: 'The engine\'s native pixel look: toon materials, 16-colour palette, low-poly models written as data',
  animation: 'Engine ClipDefs with AnimationMixer, plus scrubbed reps and procedural layers (Squash, SpringChain, Dot lean)',
  audio: 'Engine Song and SoundDef data plus a Web Audio formant voice in gibberish; no audio files; music 10% by default',
  online: 'AI Hub Session Protocol v1, ghost mode, own card, 1-4 players; Family Hour is local on one screen',
  testing: 'Allowed: headless scripts, a scripted playthrough, browser checks and screenshots. Used: Node scripts with bots, Playwright on file://, the hub harness at 1, 2 and 4 players, screenshots for composition. No human playtest.',
  research: 'Read the kit guide, assets guide, API reference and hub README; no web research. The director\'s plan included engine and hub research and spikes.',
  environment: 'Claude Code CLI (headless); Linux',
  model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
  usage: 'added on import',
};
export const TESTING_FEEDBACK = [
  'About 14 real issues: 6 found by scripts and 8 by looking at screenshots. A few more failures were bugs in the tests themselves and are not counted.',
  '3 would have been game breaking: the lean added to the body piled up frame after frame until everyone fell over; the hoop hip motion did the same and carried avatars off screen; and vitamins fell asleep in the physics world, so the tray could not be played.',
  'The scripted playthrough through the real menus. It found that the press closing a dialogue also acted on the scene, which opened the wrong screen. The bot score table was a close second, for balance.',
  'The per-character glyph check. It adds thousands of passes to the count and never failed. The clip checks also never failed, though the plan\'s poses were already verified.',
];
export const ENGINE_FEEDBACK = [
  'Running the same game headless in Node. Whole playthroughs took minutes, replays matched exactly, and models as plain data were quick to write and check.',
  'Yes. Screen transitions never finish under step() in a browser, though they do headless. The mixer leaves unkeyed joints alone, so additive pose layers pile up. Dynamic bodies sleep through a gravity change. I first guessed pixelSize took a number, and that the audio had a master bus to listen on.',
  'The Dot with its driver seam, so one lane code serves the player, bots, pads, ghosts, attract and tests. Next, the HUD kit: mixed-case text, menus, prompts and glyphs.',
  'All UI through a retained pixel HUD with no widgets or layout, at art sizes that change with the window. Text legibility over a bright 3D world took several passes.',
  'none',
  'A public beat clock and audio buses, since Step Class relies on undocumented fields (song.start, buses.sfx), and a small built-in menu and text layer for the HUD.',
];
export const PROMPT_FEEDBACK = [
  'The plan\'s verified recipes and numbers. The Dot table, the single-file build, the browser flags and the hub boot order all worked as written, which saved a lot of time.',
  'Whether GameTitle and SOURCE in the file name keep their spaces. I chose WibbleFit-WiiFit. The file name also has to contain a source name the game itself may not use on screen, apart from credits.',
  'The breadth: 17 activities, a week, attract, dev tools, one-screen and online multiplayer, in one run with only software rendering and no way to feel the controls by hand. Balance rests on bots, not on a person.',
  'Fix the hoop flick: as written, circling catches every hoop by accident, so I require a held flick of 0.26 s. Say the file name format exactly. Allow a line for what could not be judged without a human player.',
];
export const AI_HUB = {
  name: TITLE, tagline: TAGLINE,
  description: 'A week at a spotless wellness island run by a small, polite, deeply judgmental bathroom scale. Your whole body is one dot. Keep it in the circle.',
  type: 'Game', genre: 'Sports', source: 'Wii Fit', series: 'Wii Fit', players: '1–4',
  controls: 'Left stick, WASD or mouse: lean. R2, Space or click: breathe. L1/R1, F/J or mouse buttons: step.',
  tags: ['pixel art', 'comedy', 'versus', 'arcade', '3d', 'story'],
};
export const QUESTIONS_T = ['How many issues did testing catch?', 'How many were critical or game breaking?', 'Most helpful test', 'Least helpful test'];
export const QUESTIONS_E = ['What did you like most?', 'Did you get stuck or guess wrong?', 'Most important thing you built', 'Hardest part', 'What did you change in the engine?', 'One thing you would change'];
export const QUESTIONS_P = ['What did you like most?', 'What was confusing?', 'Hardest thing to do', 'What would you change?'];
