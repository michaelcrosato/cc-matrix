// About / Credits content (also mirrored in the HTML header comment).
export const ABOUT_SECTIONS = [
  {
    title: 'Stuffox 64',
    items: [
      'An original spiritual successor to Star Fox 64. A squadron of plush pilots defends the patchwork planet Quiltara from Baron Ratchet\'s wind-up tin-toy armada.',
      'Pilots: Tod Patchwell (fox), Bramble (badger), Pippa (bunny), Gizmo (owl). Command: Gen. Woolsey. Villains: Baron Ratchet and the Tin Jackals (Vex, Snarl, Quill).',
      'All characters, levels, models, music, sound and voices are original and procedurally generated in code. No assets from the source game are used.',
    ],
  },
  {
    title: 'Source Information',
    items: [
      '<b>Date:</b> 2026-10-20 19:15',
      '<b>Source:</b> Starfox 64 for N64',
      '<b>Tech:</b> Three.js r180 (three@0.180.0: WebGPURenderer, TSL node materials, ToonOutlinePassNode, BloomNode), WebGPU only with no WebGL fallback, Rapier 0.19.3 (@dimforge/rapier3d-compat) physics, Web Audio API (synthesized music, SFX and voice chatter), Gamepad API (standard mapping, dual-rumble). Vanilla JavaScript ES modules bundled with esbuild 0.25 into a single HTML file. Three.js and Rapier load from the jsDelivr CDN.',
      '<b>Art Direction:</b> Stylized cel-shading: MeshToonNodeMaterial with a 4-step hard light ramp, screen-space ink outlines (toonOutlinePass), HDR emissive glows with bloom, quilt-patchwork vertex-colored terrain. Plush-toy heroes with button eyes and stitches against glossy tin wind-up enemies.',
      '<b>Animation:</b> Procedural, code-driven animation (hierarchical transforms, sine-phase walk cycles for the boss legs, exponential damping for flight feel, barrel-roll/somersault/U-turn maneuver curves). Physics-driven debris, toppling towers and asteroids via Rapier. Scripted camera cutscenes. No skeletal or keyframe assets.',
      '<b>Testing:</b> The prompt said "Write no tests, do no tests, testing will be done separately." No tests were written or run. The only check was building the bundle with esbuild.',
      '<b>Environment:</b> Claude Code CLI (headless); Linux; browser unknown',
      '<b>Model:</b> Anthropic, claude-opus-5-5, reasoning effort medium-ultracode',
      '<b>Usage:</b> unknown (no cost, token or session-time estimates were available to the model)',
    ],
  },
  {
    title: 'Engine Feedback',
    items: [
      '<b>What did you like most about the engine?</b> Three.js r180\'s TSL node system and built-in toonOutlinePass. Cel-shading plus ink outlines plus bloom took a few lines, and per-material node graphs (animated water, sky gradient, waterfalls) needed no GLSL/WGSL.',
      '<b>Did you get stuck or guess wrong?</b> Mostly I had to check things against the package source: which post-processing nodes ship in r180, the toonOutlinePass signature, and Rapier 0.19\'s interaction-group rules for scene queries. Queries need their own membership bit, or sensor hitboxes that collide with nothing also become invisible to raycasts.',
      '<b>What was the most important thing you had to build yourself?</b> The game layer: a rail/all-range flight model, a data-driven level-event system, actor patterns and boss state machines, and a sensor-collider hitbox layer over Rapier for laser raycasts, lock-on and splash damage.',
      '<b>What was the hardest part about using the engine?</b> WebGPU-only rendering means no way to inspect the result here, and node materials fail at shader-build time rather than at the call site. Errors surface late and far from the cause.',
      '<b>If you had to remove or overhaul one thing from the engine, what would that be?</b> The silent automatic WebGL2 fallback in WebGPURenderer. For a "WebGPU, no fallback" target, it has to be detected and blocked by hand.',
      '<b>If you could change one thing about the engine, what would it be?</b> Ship a small, documented "game kit" layer: pooled particles, instanced outline-friendly props and a physics-sync helper for Rapier bodies. Every action game rebuilds these.',
    ],
  },
  {
    title: 'Prompt Feedback',
    items: [
      '<b>What did you like most about this prompt?</b> It sets a clear bar ("feature-complete vertical slice", with concrete reference demos) plus specific, testable UX rules: attract mode after 10 seconds, inverted-axis toggles, the touch-only message.',
      '<b>What was confusing?</b> The tension between "performance unlimited / out of scope" and a playable real-time game, and between the global instruction to visually test UI and this prompt\'s "do no tests". The usage/cost line asks for figures the model cannot observe.',
      '<b>What was the hardest thing to do?</b> Fitting the full Star Fox 64 move set (rails and all-range, barrel roll deflects, charged lock-on, bombs, somersault/U-turn, wingmate rescues, branching route, bosses with weak points, medals) into one coherent, self-contained build without being able to run it.',
      '<b>If there was one test you could have run, what would that test be?</b> A scripted Playwright run in a WebGPU-enabled Chromium. Boot the file, let attract mode start, and assert no console errors while it cycles through all three demo segments (rail stage, boss, all-range). That covers shader compilation, physics and most game systems in one pass.',
    ],
  },
  {
    title: 'Controls (quick reference)',
    items: [
      'Controller: L-Stick steer · ✕ fire/charge · □ bomb · R2 boost · L2 brake · L1/R1 bank, double-tap to barrel roll · △ somersault (L2+△ U-turn) · OPTIONS pause.',
      'Keyboard: WASD/Arrows · Space/J fire · K bomb · Shift boost · Ctrl brake · Q/E bank · R somersault · Esc pause.',
    ],
  },
];
