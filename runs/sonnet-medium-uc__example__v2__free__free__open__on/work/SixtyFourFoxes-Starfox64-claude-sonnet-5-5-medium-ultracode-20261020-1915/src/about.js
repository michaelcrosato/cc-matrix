// Source Information / Engine Feedback / Prompt Feedback (also embedded as an HTML comment and in the chat reply).
export const INFO = {
  date: '2026-10-20 19:15',
  source: 'Starfox 64 for N64',
  title: 'Sixty-Four Foxes',
  tech: 'Three.js r180 (WebGPURenderer + TSL node materials, no fallback) · Rapier 3D 0.19.3 (rapier3d-compat, WASM inlined) · Web Audio API (procedural synth + sequencer) · Gamepad API · esbuild bundle (single HTML)',
  art: 'Stylised cel-shading: 4-band MeshToonMaterial ramp, inverted-hull ink outlines, flat-shaded low-poly terrain with stepped vertex colours, bloom post-process, PCF soft shadows',
  anim: 'Custom keyframe clip Animator over procedural part hierarchies (barrel roll, somersault, U-turn, wing flutter, walker gait, turret scan) + spring/damped procedural motion and Rapier rigid-body debris',
  testing: 'Prompt placed no restrictions on testing ("No restriction on testing"). Tested with headless Chromium + Playwright (software WebGPU, offscreen readback screenshots); real controller and real GPU not available in the test environment.',
  env: 'Claude Code CLI (headless); Linux (WSL2); browser unknown (tested in Chromium via Playwright)',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium-ultracode',
  usage: 'Estimated ~0.3M tokens total (context-counter based; no input/output or cost breakdown exposed), estimated API cost unknown, session time ~1h 15m (estimate)',
};
export const ENGINE = [
  ['What did you like most about the engine?', 'Three.js WebGPURenderer with TSL: toon materials, node-based outlines/sky/water and the PostProcessing + bloom nodes worked with very little code, and Rapier\'s kinematic-body + collision-event model fit an arcade shooter well.'],
  ['Did you get stuck or guess wrong?', 'Yes: headless WebGPU could not present to the canvas (screenshots were blank), so I had to add an offscreen render-target readback hook for testing. I also first assumed sensor–sensor pairs raise events in Rapier (they do not), so all hit volumes are solid kinematic colliders with ActiveCollisionTypes.ALL.'],
  ['What was the most important thing you had to build yourself?', 'The game framework: rail/all-range flight models, the data-driven stage timeline director, entity/AI system, lock-on weapons, boss logic, comms/HUD, controller-first menu system, procedural audio/music, and the attract-mode AI.'],
  ['What was the hardest part about using the engine?', 'Verifying visuals without a real GPU presentation path, and the lack of a built-in game-object/scene/animation layer — outlines, toon ramps, particles and clips all had to be assembled by hand.'],
  ['If you had to remove or overhaul one thing from engine, what would that be?', 'The split between three, three/webgpu and three/tsl entry points (plus addons paths) — one consistent import surface would remove a lot of bundling guesswork.'],
  ['If you could change one thing about the engine, what would it be?', 'A first-class, documented headless/test path for WebGPU (deterministic screenshot/readback API) and built-in outline/cel-shading node material.'],
];
export const PROMPT = [
  ['What did you like most about this prompt?', 'The clear "feature-complete vertical slice" bar with concrete reference demos, and the controller-first 10-foot UX requirements (including the inverted-axis toggles and attract mode) — they define a testable, polished target.'],
  ['What was confusing?', 'Whether the filename\'s "GameTitle-SOURCE" should keep spaces/punctuation, how to estimate Usage when no counters are exposed, and "silently brainstorm 50 titles" vs. the need to prove an RNG pick.'],
  ['What was the hardest thing to do?', 'Scope: delivering two distinct modes (rail + all-range), bosses, wingmen, full menus, procedural audio and attract mode in one pass while verifying WebGPU rendering in a headless environment.'],
  ['If there was one test you could of run, what would that test be?', 'A real-hardware run on a PS5/DualSense pad with a WebGPU-capable GPU, playing both stages end-to-end (including the inverted-axis toggles and attract-mode exit) while profiling frame time.'],
];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function aboutText() {
  const I = INFO;
  return `SOURCE INFORMATION
- Date: ${I.date}
- Source: ${I.source}
- Game: ${I.title}
- Tech: ${I.tech}
- Art Direction: ${I.art}
- Animation: ${I.anim}
- Testing: ${I.testing}
- Environment: ${I.env}
- Model: ${I.model}
- Usage: ${I.usage}

ENGINE FEEDBACK
${ENGINE.map(([q, a]) => `- ${q}\n  ${a}`).join('\n')}

PROMPT FEEDBACK
${PROMPT.map(([q, a]) => `- ${q}\n  ${a}`).join('\n')}
`;
}
export const ABOUT_HTML = (() => {
  const I = INFO;
  const li = (k, v) => `<div><b>${k}:</b> ${esc(v)}</div>`;
  return `<div style="font-size:1.1em;color:#fff"><b>${esc(I.title)}</b> — an original spiritual successor to <b>${esc(I.source)}</b>. Fox pilot Kit Vulpine and the Sixty-Four Foxes squadron (Rook, Hazel &amp; Dot) fight the Ratchet Armada across the Vulpara system.</div>
  <h3>Source Information</h3>${li('Date', I.date)}${li('Source', I.source)}${li('Tech', I.tech)}${li('Art Direction', I.art)}${li('Animation', I.anim)}${li('Testing', I.testing)}${li('Environment', I.env)}${li('Model', I.model)}${li('Usage', I.usage)}
  <h3>Engine Feedback</h3>${ENGINE.map(([q, a]) => `<div><b>${esc(q)}</b><br>${esc(a)}</div><br>`).join('')}
  <h3>Prompt Feedback</h3>${PROMPT.map(([q, a]) => `<div><b>${esc(q)}</b><br>${esc(a)}</div><br>`).join('')}
  <h3>Credits</h3><div>Design, code, procedural art &amp; audio: Claude (Anthropic). Libraries: three.js (MIT), Rapier (Apache-2.0).</div>`;
})();
