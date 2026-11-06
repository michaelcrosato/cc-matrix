// About and Credits pages. Source Information first, then the three feedback sections, then credits.
import { GAME_TITLE } from './title.js';
import { FEEDBACK } from './feedback.js';
export const SOURCE_INFO = {
  date: '2026-11-05 16:20:33', source: 'Far Cry 2', plan: 'PLAN.md',
  genre: 'Open-world first-person shooter with survival pressure and systemic fire', perspective: 'First person on foot, at the wheel and in story scenes, with an optional chase camera in vehicles',
  tech: 'Pixel Engine (riftlight) 0.46.0, three.js r186, Rapier 0.20, esbuild 0.28.2, Playwright 1.63.0 for tests; game code in plain JavaScript modules',
  artDirection: 'The engine native 3D-as-pixel-art look at 480x270, toon materials, 16-colour palette; new models written as data for people, guns, vehicles and buildings; sand, orange and red land with plum shadows',
  animation: 'Engine ClipDef data compiled to AnimationMixer clips on the hero rig, lower/upper body layering, Ragdoll on death; first-person hands and guns keyed by data clips',
  audio: 'All sound written in code: SoundDef effects, Song music (default volume 10 percent), and Animalese-style gibberish voices; no audio files',
  online: 'AI Hub Session Protocol v1, shared-world mode, 1 to 4 players (Cash Run); also solo with hired guns and a same-computer link',
  testing: 'Headless Node suites (static, systems, playthrough, replay) plus Playwright Chromium on file:// and the AI Hub harness scenarios; no review subagents',
  research: 'The plan supplied with the brief, the engine kit GUIDE/ASSETS/API docs and the AI Hub protocol README; no other research',
  environment: 'Claude Code CLI (headless); Linux', model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium', usage: 'added on import',
};
const rows = (o) => Object.entries(o).map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), v]);
const fb = (list) => list.map(([q, a]) => ['', `${q} ${a}`]);
export const ABOUT_PAGES = [
  { title: GAME_TITLE + ': Source Information', rows: rows(SOURCE_INFO).slice(0, 7) },
  { title: 'Source Information (2)', rows: rows(SOURCE_INFO).slice(7) },
  { title: 'Testing Feedback', rows: fb(FEEDBACK.testing) },
  { title: 'Engine Feedback', rows: fb(FEEDBACK.engine) },
  { title: 'Prompt Feedback', rows: fb(FEEDBACK.prompt) },
  { title: 'Known limits', rows: [['Seen by eye', 'software rendering draws about one frame a second, so motion and feel were judged from state, not from watching it']] },
  { title: 'Credits', rows: [['Pixel Engine', 'MIT, the riftlight engine kit 0.46.0'], ['three.js', 'MIT, r186'], ['Rapier', 'Apache-2.0, 0.20'], ['AI Hub session client', 'aihub-session 1.4.0'], ['Design, code and sound', 'written for this game'], ['', 'Inspired by Far Cry 2; not affiliated.']] },
];
