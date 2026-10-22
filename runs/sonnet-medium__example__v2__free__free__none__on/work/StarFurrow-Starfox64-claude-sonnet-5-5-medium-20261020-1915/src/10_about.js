// ===== 10_about: credits & required Source / Engine / Prompt information (also embedded as an HTML comment at the top of the file) =====
const SRC_INFO = {
  date: '2026-10-20 19:15',
  source: 'Starfox 64 for N64',
  tech: 'Three.js r180 (three/webgpu WebGPURenderer, TSL node materials, PostProcessing + BloomNode) · Rapier 0.19.3 (@dimforge/rapier3d-compat, WASM) · Web Audio API (fully procedural SFX, engine, voice babble and sequenced music) · Gamepad API (DualSense-first, with rumble) · vanilla ES-module JavaScript + DOM/CSS UI · single HTML file, dependencies from the jsDelivr CDN via an import map',
  art: 'Stylized cel-shading: 4-band toon gradient ramp on MeshToonNodeMaterial, inverted-hull ink outlines (smooth-normal hull geometry), flat gradient skies, additive particle bursts, soft bloom, chunky ink-outlined UI.',
  anim: 'Procedural, code-driven animation: damped-spring steering and banking, sinusoidal rigs on named model parts (wings, flames, legs, turrets, boss plates), per-enemy state machines, Rapier rigid-body debris, CSS keyframes for HUD/UI.',
  testing: 'The prompt said: "Write no tests, do no tests, testing will be done separately." No tests or play-throughs were written or run; the only check was a syntax-only parse (node --check) of the bundled script as a build step, and CDN file paths were confirmed to exist. The game has never been executed by its author. Performance and FPS were declared out of scope.',
  env: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
  usage: 'unknown (no token or cost counters were exposed to the session)',
};

const ENGINE_FEEDBACK = [
  ['What did you like most about the engine?', 'Three.js TSL and the ready-made node materials: MeshToonNodeMaterial gave real cel-shading in a few lines, and TSL let me write the sky gradient and the ink-outline vertex push without hand-written shaders. Rapier\'s query pipeline (intersectionsWithShape) was a perfect fit for swept shot tests, pickups and ramming.'],
  ['Did you get stuck or guess wrong?', 'Yes — because testing was forbidden, every API detail was recalled from memory or checked against the CDN type files: the Rapier package has no rapier.es.js (it is rapier.mjs), PostProcessing/BloomNode import paths, per-instance colour on InstancedMesh with node materials, and whether mutating the Rapier world inside a query callback is safe (it is not, so hits are gathered first).'],
  ['What was the most important thing you had to build yourself?', 'The whole game framework on top of the renderer: the rail runtime and distance-keyed event timeline, entity/AI/boss systems, lock-on charge shots, controller-first menu navigation with glyph switching, and the entire procedural audio + music engine.'],
  ['What was the hardest part about using the engine?', 'Cel-shaded outlines. The WebGPU renderer has no drop-in OutlineEffect, so I built inverted-hull outlines with merged-vertex smooth normals, and had to manage unique-geometry disposal for streamed scenery.'],
  ['If you had to remove or overhaul one thing from engine, what would that be?', 'The split between three, three/webgpu and three/tsl entry points plus the addons that only work with one of them — it is easy to import the wrong build, and the naming (PostProcessing, later renamed) is unstable.'],
  ['If you could change one thing about the engine, what would it be?', 'A first-class, documented TSL toon/outline pipeline (cel ramp, edge detection or hull outlines) for WebGPURenderer.'],
];

const PROMPT_FEEDBACK = [
  ['What did you like most about this prompt?', 'The "feature-complete vertical slice" framing with concrete reference demos, the 10-foot controller-first philosophy, and the very specific quirks (attract mode after 10 s, invert-axis toggles, touch-only message) that turn into checkable features.'],
  ['What was confusing?', 'The [PROMPT] placeholder under Prompt Feedback is empty; "SOURCE" is used as a variable in several places; "Dependencies that can be downloaded do not have to be included" sits next to "single html file"; and "Usage" cost/tokens cannot be known from inside the session.'],
  ['What was the hardest thing to do?', 'Delivering a very large game with no testing allowed: balance, camera feel and API correctness all had to be reasoned out blind.'],
  ['If there was one test you could have run, what would that test be?', 'A headless Chromium WebGPU smoke test: load the file, let attract mode run for 60 seconds across both stages, fail on any console error, and screenshot the title, a mid-stage frame and a boss frame.'],
];

function aboutHTML() {
  const f = (list) => list.map(([q, a]) => `<p><span class="q">${q}</span><br>${a}</p>`).join('');
  return `
  <h3>${GAME_TITLE}</h3>
  <p>An original spiritual successor to Starfox 64: cel-shaded space-farming rail shooter. Furrow Squadron defends the harvest worlds from the Blight Armada.</p>
  <h3>Cast</h3>
  <ul><li><b>Hazel Tillman</b> — Furrow Lead (you)</li><li><b>Buckle, Clover, Marrow</b> — your wingmen</li><li><b>Granny Mulch</b> — Orchard Command</li><li><b>Baron Blight</b> — the Blight Armada</li></ul>
  <h3>Source Information</h3>
  <ul>
  <li><b>Date:</b> ${SRC_INFO.date}</li>
  <li><b>Source:</b> ${SRC_INFO.source}</li>
  <li><b>Tech:</b> ${SRC_INFO.tech}</li>
  <li><b>Art Direction:</b> ${SRC_INFO.art}</li>
  <li><b>Animation:</b> ${SRC_INFO.anim}</li>
  <li><b>Testing:</b> ${SRC_INFO.testing}</li>
  <li><b>Environment:</b> ${SRC_INFO.env}</li>
  <li><b>Model:</b> ${SRC_INFO.model}</li>
  <li><b>Usage:</b> ${SRC_INFO.usage}</li>
  </ul>
  <h3>Engine Feedback</h3>${f(ENGINE_FEEDBACK)}
  <h3>Prompt Feedback</h3>${f(PROMPT_FEEDBACK)}
  <h3>Thanks</h3><p>Three.js, Rapier, and the original Starfox 64 team for the inspiration. All art, music and sound in this demo are generated procedurally in code.</p>`;
}
