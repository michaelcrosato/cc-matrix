// Credits and the three required reports. Shown on the in-game About screen and repeated in the file header.
// Anything that could not be confirmed is written as "unknown".

export const SOURCE_INFO = [
  ['Date', '2026-10-20 19:15'],
  ['Source', 'Starfox 64 for N64'],
  ['Tech', 'Three.js r180 (three@0.180.0), WebGPU renderer with TSL nodes, no WebGL fallback. Rapier 0.19.3 (@dimforge/rapier3d-compat 0.19.3, WASM embedded). Web Audio API. Gamepad API. Vanilla JS modules bundled with esbuild 0.28.2 into one HTML file.'],
  ['Art Direction', 'Stylized cel-shading: three-band toon ramp (MeshToonNodeMaterial), ink outlines from the Three.js toon outline pass, additive bloom on lasers and engines.'],
  ['Animation', 'Procedural. Scripted track timeline, per-entity behaviour code, damped camera, instanced particle pools, Rapier-driven debris. No keyframed clips.'],
  ['Testing', 'Prompt constraint: write no tests, do no tests, testing is done separately. No tests were written or run for this build.'],
  ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
  ['Model', 'Anthropic, claude-haiku-5-5, reasoning effort medium-ultracode'],
  ['Usage', 'unknown'],
];

export const ENGINE_FEEDBACK = [
  ['What did you like most about the engine?', 'Three.js r180 gives cel-shading and ink outlines almost for free: MeshToonNodeMaterial with a gradientMap, plus toonOutlinePass in the post chain. TSL made the sky gradient a few lines of node code.'],
  ['Did you get stuck or guess wrong?', 'I worked out the PostProcessing chain (outputNode, getTextureNode("output"), bloom input) from the source, not from a complete example. The toon outline pass re-renders each toon object a second time, which I had to infer from the code.'],
  ['What was the most important thing you had to build yourself?', 'The game layer: the track curve model, lock-on projection into the reticle cone, the route fork, the multi-part boss, medal rules, the menu focus system, and the gamepad mapping with the invert toggles.'],
  ['What was the hardest part about using the engine?', 'Rapier ties a query result back to the game object only through the collider handle, so I keep a handle-to-owner map by hand. Raycasts and overlaps also need a fresh shape or ray object per query.'],
  ['If you had to remove or overhaul one thing from the engine, what would that be?', 'The toon outline pass cost: every toon object is drawn twice. A per-object outline flag would let decorative meshes skip it.'],
  ['If you could change one thing about the engine, what would it be?', 'Ship a short, versioned reference example that combines WebGPU, toon materials, the outline pass, and bloom in one post chain.'],
];

export const PROMPT_FEEDBACK = [
  ['What did you like most about this prompt?', 'The explicit done criteria, the controller-first and touch-only rules, and the definition of attract mode. Together they made the scope concrete.'],
  ['What was confusing?', 'Whether SOURCE in the file name means the source title or the folder name. Whether "root" means the work folder or the subfolder. How to show a silent brainstorm while still making the RNG pick auditable. The Usage line asks for cost estimates that this session cannot provide. The shared CLAUDE.md asks for viewport checks while the prompt says do no tests.'],
  ['What was the hardest thing to do?', 'Covering a feature-complete demo in one pass without runtime testing: input, audio, rendering, physics, four stages with a route fork, a multi-phase boss, menus, and attract mode.'],
  ['If there was one test you could have run, what would that test be?', 'A headless WebGPU run that loads the file, starts the campaign, flies Aurelia to the fork, checks that both routes load, and kills the Titan. Add a scripted gamepad check that flips the invert toggles and confirms the stick direction changes.'],
];

function section(title, rows) {
  const items = rows.map(([k, v]) => `<div class="src-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  return `<h3>${title}</h3><dl class="src">${items}</dl>`;
}

export const ABOUT_HTML = `
<div class="about">
  <p>Starfoxtastic 64 is an original spiritual successor to Starfox 64. It is a playable vertical slice with four stages, a route fork, a multi-phase boss, lock-on, barrel roll, medals, and attract mode.</p>
  ${section('Source Information', SOURCE_INFO)}
  ${section('Engine Feedback', ENGINE_FEEDBACK)}
  ${section('Prompt Feedback', PROMPT_FEEDBACK)}
</div>`;
