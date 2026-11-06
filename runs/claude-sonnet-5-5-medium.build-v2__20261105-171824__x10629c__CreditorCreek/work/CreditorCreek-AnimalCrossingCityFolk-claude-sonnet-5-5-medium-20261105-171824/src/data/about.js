// About / Credits content. Mirrors the final chat reply and exit-interview.json.
import { FEEDBACK } from './feedback.js';
export const ABOUT = {
  source: [
    ['Date', '2026-11-05 17:18:24'], ['Source', 'Animal Crossing: City Folk'], ['Plan', 'PLAN.md (a village life sim, one bus ride from the Big City)'], ['Genre and Perspective', 'Life sim / social sim; isometric 3/4 orthographic diorama camera (iso preset, 90-degree turns)'],
    ['Tech', 'Riftlight Pixel Engine 0.46.0 (three.js r186 WebGPU, Rapier idle), esbuild 0.28 bundle, AI Hub session client 1.4.0'], ['Art Direction', "The engine's native 3D-as-pixel-art in the 16-colour palette; own critter generator (27 species, each built as a ModelDef with pivot joints), tree and building ModelDefs, per-tier houses and store, parametric fish, bug, tool and skeleton models, eight pixel paintings, and quiet ground textures"],
    ['Animation', 'Engine clip format (ClipDef, 30 fps) compiled with compileClips onto a 7-joint rig, played with THREE.AnimationMixer; 44 clips'], ['Audio', 'All code: engine Song sequencer music (hourly tunes, venues, festivals), SoundDef effects, Animalese-style formant voices. Music defaults to 10%'],
    ['Online', 'AI Hub Session Protocol v1 shared-world round ("The Bean Bazaar") with its own card, passing the hub harness; Visit between two windows on one computer (BroadcastChannel) or two computers (WebRTC with Gate Pass and Reply Slip invite codes)'], ['Testing', 'Headless scripts only: simulation, a scripted whole-game playthrough on Engine.headless, Chromium on file:// with software WebGPU (boot, input, attract, audio, phone and tablet profiles), a WebKit failure-message check, the AI Hub harness (4 scenarios), a two-page Visit test covering BroadcastChannel and WebRTC codes, and the sheets check from the kit; no subagents'],
    ['Research', 'Read the plan, the engine guide and the AI Hub README; no web research beyond them'], ['Environment', 'Claude Code CLI (headless); Linux'], ['Model', 'Anthropic, claude-sonnet-5-5, reasoning effort medium'], ['Usage', 'added on import'],
  ],
  feedback: FEEDBACK,
};
