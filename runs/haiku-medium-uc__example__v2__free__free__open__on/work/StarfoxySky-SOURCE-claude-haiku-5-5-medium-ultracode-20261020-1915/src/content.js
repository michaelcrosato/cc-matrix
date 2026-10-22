// Static copy: controls, rules, and the About/Credits text (which carries the Source Information,
// Engine Feedback and Prompt Feedback required by the task).

export const CONTROL_ROWS = [
  ['Fly (lane)', 'Left stick', 'Left stick', 'Arrows / WASD'],
  ['Fire lasers (hold: rapid)', 'Cross / R2', 'A / RT', 'Space / J'],
  ['Lock on (hold), release to launch missiles', 'Square', 'X', 'X (hold)'],
  ['Smart bomb (3 per sortie)', 'Circle', 'B', 'B'],
  ['Barrel roll (deflects fire, dodges)', 'L1 / R1', 'LB / RB', 'Q / E'],
  ['Boost (drains the meter)', 'Triangle', 'Y', 'Shift'],
  ['Brake', 'L2', 'LT', 'Ctrl'],
  ['Pause', 'Options', 'Menu', 'Esc / P'],
  ['Menus: move / select / back', 'D-pad, Cross, Circle', 'D-pad, A, B', 'Arrows, Enter, Esc'],
];

export const RULES_CAN = [
  'Fly across the lane with full freedom of the screen, including climbing and diving.',
  'Lock onto up to eight targets at once and fire homing missiles at all of them.',
  'Barrel roll through enemy fire to deflect it. Rolling also lets you slip past gaps.',
  'Boost to outrun a bad position, brake to tighten a turn, and drop bombs to clear the sky.',
  'Pick up gate rings for score, heal pods to restore hull, and bomb pods for extra bombs.',
];

export const RULES_CANNOT = [
  'You cannot reverse, stop, or leave the lane: the stage keeps scrolling.',
  'You cannot fly through terrain, pillars or rocks without taking hull damage.',
  'You cannot damage the Venom Core while either shield generator is standing.',
  'You cannot carry hull over: each sortie starts at full hull.',
  'You cannot skip a boss fight. The route closes after the core falls.',
];

// Sections of the About/Credits screen. Each entry: [heading, [lines...]].
export const CREDITS = [
  ['Starfoxy Sky', [
    'An original spiritual successor to Starfox 64 for N64. A feature-complete vertical slice:',
    'training, a plains sortie, a route fork (Canyon Run or Asteroid Belt), and the Venom Core boss.',
    'Everything is procedural: models, cel-shading, music and sound effects are generated in code.',
  ]],
  ['Credits', [
    'Design, code and art direction: Claude (Anthropic), built inside Claude Code.',
    'Wingmen call-signs: Rook and Kira. Mission control (Command) speaks through the subtitles.',
  ]],
  ['Built with', [
    'Three.js r180 (WebGPU renderer and TSL node materials, no WebGL fallback).',
    'Rapier 0.19.3 (rapier3d-compat) for rigid bodies, raycasts and overlap queries.',
    'Web Audio API for synthesized effects and the step sequencer music.',
    'Gamepad API (Standard mapping) with dual-rumble where the controller supports it.',
    'esbuild 0.28.2 bundles the game into one HTML file.',
  ]],
  ['Source Information', [
    'Date: 2026-10-20 19:15',
    'Source: Starfox 64 for N64',
    'Tech: Three.js r180 (WebGPU), Rapier 0.19.3, Web Audio, Gamepad API, esbuild 0.28.2',
    'Art Direction: stylized cel-shading (4-band toon ramp, inverted-hull ink outlines, bloom)',
    'Animation: procedural per-frame transforms, eased barrel rolls, damped turret tracking, sine-based idle motion',
    'Testing: the task placed no restriction on testing. Headless Chromium with WebGPU (SwiftShader software adapter) was used.',
    'Environment: Claude Code CLI (headless); Linux; browser unknown',
    'Model: Anthropic, claude-haiku-5-5, reasoning effort medium-ultracode',
    'Usage: unknown',
  ]],
  ['Engine Feedback', [
    'Liked most: MeshToonNodeMaterial with a gradientMap gives cel-shaded bands with no custom shader code.',
    'Got stuck: navigator.gpu only exists in secure contexts (localhost or https). Headless Chromium lost its device under default flags and needed SwiftShader flags for a stable test run.',
    'Guessed wrong: Rapier kinematic bodies need a new translation every frame, and ray casts only see changes after world.step().',
    'Built myself: the flight model, lock-on and missiles, the mission script runner, the boss, the menu system and the attract autopilot.',
    'Hardest part: keeping meshes, Rapier bodies and gameplay entities in sync, and reading correct world matrices after moving a parent (boss parts).',
    'Overhaul: outlines need one ink child mesh per outlined mesh, which doubles the scene graph. A built-in outline pass would be cleaner.',
    'Change one thing: a documented headless WebGPU test configuration, so CI can render without a GPU.',
  ]],
  ['Prompt Feedback', [
    'Liked most: the controller-first, 10-foot framing and the explicit deliverable paths and naming rules made the output easy to check.',
    'Confusing: "feature-complete" next to several AAA reference demos leaves the scope open. The Usage field asks for cost estimates this session cannot confirm.',
    'Hardest: fitting a full campaign, a boss and an attract loop into one HTML file while verifying everything without a real GPU or controller.',
    'One test: play a full campaign on a real PlayStation controller in a hardware WebGPU browser, and measure frame times and input latency.',
  ]],
];
