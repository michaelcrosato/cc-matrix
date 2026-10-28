// src/config.js
// Game constants, 8 Drivers, 4 Courses/Arenas, Item tables, Engine classes, and Feedback metadata

export const GAME_TITLE = 'Flash-O-Kart 64';
export const GAME_SUBTITLE = 'SUPER CEL-SHADED GRAND PRIX';

export const ENGINE_CLASSES = [
  { id: '50cc', name: '50cc Novice', speedMult: 0.85, aiSkill: 0.78, mirror: false, desc: 'Relaxed cruiser pace for learning the ropes!' },
  { id: '100cc', name: '100cc Standard', speedMult: 1.0, aiSkill: 0.92, mirror: false, desc: 'Classic N64 championship speed and fierce rivals!' },
  { id: '150cc', name: '150cc Pro Turbo', speedMult: 1.16, aiSkill: 1.04, mirror: false, desc: 'Blistering top speed! Master the power-slide mini-turbo!' },
  { id: 'mirror', name: 'Mirror Extra 64', speedMult: 1.16, aiSkill: 1.06, mirror: true, desc: 'Left is right and right is left at 150cc velocity!' }
];

export const DRIVERS = [
  {
    id: 'flash',
    name: 'Captain Flash',
    weightClass: 'Medium',
    tagline: '"Let\'s-a zoom to the finish!"',
    bodyColor: 0xff2222,
    trimColor: 0x2255ff,
    skinColor: 0xffcc99,
    hatType: 'cap',
    hatColor: 0xff2222,
    stats: { speed: 7, accel: 7, weight: 6, handling: 7 },
    topSpeed: 46.0,
    accelRate: 28.0,
    handlingRate: 2.55,
    mass: 1.0
  },
  {
    id: 'dash',
    name: 'Doctor Dash',
    weightClass: 'Medium',
    tagline: '"Green thunder coming through!"',
    bodyColor: 0x11bb44,
    trimColor: 0x1e3a8a,
    skinColor: 0xffcc99,
    hatType: 'cap',
    hatColor: 0x11bb44,
    stats: { speed: 7, accel: 8, weight: 6, handling: 7 },
    topSpeed: 45.8,
    accelRate: 29.5,
    handlingRate: 2.6,
    mass: 0.98
  },
  {
    id: 'nova',
    name: 'Princess Nova',
    weightClass: 'Light',
    tagline: '"Sweet drifts & royal victory!"',
    bodyColor: 0xff66b2,
    trimColor: 0xffdd33,
    skinColor: 0xffd6b0,
    hatType: 'crown',
    hatColor: 0xffdd00,
    stats: { speed: 6, accel: 9, weight: 4, handling: 9 },
    topSpeed: 44.5,
    accelRate: 34.0,
    handlingRate: 2.85,
    mass: 0.82
  },
  {
    id: 'fungi',
    name: 'Fungi Fizz',
    weightClass: 'Light',
    tagline: '"Yahoo! I\'m the fastest spore in town!"',
    bodyColor: 0xffffff,
    trimColor: 0x2266ff,
    skinColor: 0xffcca8,
    hatType: 'mushroom',
    hatColor: 0xff3333,
    stats: { speed: 6, accel: 10, weight: 3, handling: 9 },
    topSpeed: 44.2,
    accelRate: 36.0,
    handlingRate: 2.95,
    mass: 0.78
  },
  {
    id: 'yoshiro',
    name: 'Yoshiro',
    weightClass: 'Light',
    tagline: '"Turbo tongue & nimble tires!"',
    bodyColor: 0x66dd22,
    trimColor: 0xff5522,
    skinColor: 0x66dd22,
    hatType: 'crest',
    hatColor: 0xff3311,
    stats: { speed: 7, accel: 9, weight: 5, handling: 8 },
    topSpeed: 45.2,
    accelRate: 33.5,
    handlingRate: 2.8,
    mass: 0.86
  },
  {
    id: 'bongo',
    name: 'Bongo Kong',
    weightClass: 'Heavy',
    tagline: '"Banana-powered jungle torque!"',
    bodyColor: 0x8b4513,
    trimColor: 0xffcc00,
    skinColor: 0xd2996c,
    hatType: 'crest',
    hatColor: 0x5c2c06,
    stats: { speed: 9, accel: 5, weight: 9, handling: 5 },
    topSpeed: 47.8,
    accelRate: 23.5,
    handlingRate: 2.25,
    mass: 1.25
  },
  {
    id: 'blitz',
    name: 'Baron Blitz',
    weightClass: 'Heavy',
    tagline: '"Wah-ha-ha! Outta my lane, losers!"',
    bodyColor: 0xffcc00,
    trimColor: 0x7722cc,
    skinColor: 0xffc499,
    hatType: 'cap',
    hatColor: 0xffcc00,
    stats: { speed: 9, accel: 6, weight: 9, handling: 5 },
    topSpeed: 47.6,
    accelRate: 24.5,
    handlingRate: 2.3,
    mass: 1.22
  },
  {
    id: 'krakatoa',
    name: 'King Krakatoa',
    weightClass: 'Heavy',
    tagline: '"Bwahaha! Unstoppable magma momentum!"',
    bodyColor: 0xcc2200,
    trimColor: 0xffaa00,
    skinColor: 0xdd8833,
    hatType: 'horns',
    hatColor: 0xffeeaa,
    stats: { speed: 10, accel: 4, weight: 10, handling: 4 },
    topSpeed: 48.8,
    accelRate: 21.5,
    handlingRate: 2.15,
    mass: 1.38
  }
];

export const COURSES = [
  {
    id: 'sunny_circuit',
    name: 'Flash Raceway 64',
    cup: 'Mushroom-Flash Cup - Race 1',
    mode: 'race',
    laps: 3,
    theme: 'sunny',
    skyTop: 0x1a75ff,
    skyBottom: 0x99ddff,
    groundColor: 0x33aa44,
    roadColor: 0x444854,
    kerbColorA: 0xff2222,
    kerbColorB: 0xffffff,
    desc: 'Sweeping hairpins, grandstands, sand shortcuts & a high-speed tunnel straightaway!'
  },
  {
    id: 'koopa_cove',
    name: 'Krakatoa Castle & Cove',
    cup: 'Mushroom-Flash Cup - Race 2',
    mode: 'race',
    laps: 3,
    theme: 'castle',
    skyTop: 0x3a1c54,
    skyBottom: 0xff6a33,
    groundColor: 0x4a3b32,
    roadColor: 0x554940,
    kerbColorA: 0xffaa00,
    kerbColorB: 0x332211,
    desc: 'Sunset boardwalks, magma fortress bridges, crushing stone Thwomps & over-water ramps!'
  },
  {
    id: 'rainbow_road',
    name: 'Neon Rainbow Road 64',
    cup: 'Mushroom-Flash Cup - Race 3',
    mode: 'race',
    laps: 3,
    theme: 'rainbow',
    skyTop: 0x050214,
    skyBottom: 0x190a38,
    groundColor: 0x050214,
    roadColor: 0xff55ff,
    kerbColorA: 0x00ffff,
    kerbColorB: 0xffff00,
    desc: 'A cosmic prism highway suspended in deep space! High speed, neon star rails & zero fear!'
  },
  {
    id: 'block_fort',
    name: 'Block Fort Donut 64',
    cup: 'Battle Arena',
    mode: 'battle',
    laps: 0,
    theme: 'battle',
    skyTop: 0x1d4ed8,
    skyBottom: 0x93c5fd,
    groundColor: 0x475569,
    roadColor: 0x64748b,
    kerbColorA: 0xfacc15,
    kerbColorB: 0x1e293b,
    desc: 'Four colored fortresses linked by upper sky-bridges! Pop all opponents\' 3 balloons to win!'
  }
];

export const ITEMS = {
  mushroom: {
    id: 'mushroom',
    name: 'Dash Mushroom',
    icon: '🍄',
    color: 0xff3333,
    desc: 'High-powered turbo burst that ignores off-road slowdown!'
  },
  triple_mushroom: {
    id: 'triple_mushroom',
    name: 'Triple Mushrooms',
    icon: '🍄×3',
    color: 0xff5533,
    desc: 'Three consecutive turbo bursts!'
  },
  golden_mushroom: {
    id: 'golden_mushroom',
    name: 'Golden Mushroom',
    icon: '👑🍄',
    color: 0xffdd00,
    desc: 'Spam unlimited turbo boosts for 6 seconds!'
  },
  green_shell: {
    id: 'green_shell',
    name: 'Green Shell',
    icon: '🟢',
    color: 0x22cc44,
    desc: 'Shoots straight ahead and ricochets off track walls!'
  },
  triple_green: {
    id: 'triple_green',
    name: 'Triple Green Shells',
    icon: '🟢×3',
    color: 0x22cc44,
    desc: 'Three orbiting shells that shield your kart and fire ahead!'
  },
  red_shell: {
    id: 'red_shell',
    name: 'Red Homing Shell',
    icon: '🔴',
    color: 0xff2222,
    desc: 'Locks onto and chases down the racer ahead of you!'
  },
  blue_shell: {
    id: 'blue_shell',
    name: 'Spiny Blue Shell',
    icon: '💠',
    color: 0x1188ff,
    desc: 'Hunts the 1st-place leader along the track and detonates!'
  },
  banana: {
    id: 'banana',
    name: 'Banana Peel',
    icon: '🍌',
    color: 0xffee22,
    desc: 'Drop behind you to send tailgaters into a 360° spin-out!'
  },
  fake_box: {
    id: 'fake_box',
    name: 'Fake Item Box',
    icon: '❓',
    color: 0xff4466,
    desc: 'Disguised trap box that flips any kart that touches it!'
  },
  star: {
    id: 'star',
    name: 'Super Starman',
    icon: '⭐',
    color: 0xffff44,
    desc: 'Rainbow invincibility, boosted top speed & sends rivals flying!'
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning Bolt',
    icon: '⚡',
    color: 0xffee00,
    desc: 'Zaps and shrinks all rival karts, slowing them down!'
  },
  boo: {
    id: 'boo',
    name: 'Ghost Boo',
    icon: '👻',
    color: 0xeeeeff,
    desc: 'Turns you ghostly translucent and steals an item from a rival!'
  }
};

// Position-based item roulette weights (MK64 rubber-banding!)
export function rollItemForRank(rank, totalRacers = 8, isBattle = false, isTimeTrial = false) {
  if (isTimeTrial) return 'mushroom';
  if (isBattle) {
    const pool = ['green_shell', 'triple_green', 'red_shell', 'banana', 'fake_box', 'mushroom', 'star', 'boo'];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const r = Math.random();
  if (rank === 1) {
    // Leader gets defensive items
    if (r < 0.40) return 'banana';
    if (r < 0.72) return 'green_shell';
    if (r < 0.92) return 'fake_box';
    return 'mushroom';
  } else if (rank <= 3) {
    // Front pack
    if (r < 0.25) return 'red_shell';
    if (r < 0.45) return 'green_shell';
    if (r < 0.62) return 'banana';
    if (r < 0.78) return 'mushroom';
    if (r < 0.90) return 'triple_green';
    return 'boo';
  } else if (rank <= 5) {
    // Mid pack
    if (r < 0.25) return 'red_shell';
    if (r < 0.45) return 'triple_mushroom';
    if (r < 0.62) return 'triple_green';
    if (r < 0.75) return 'mushroom';
    if (r < 0.86) return 'star';
    if (r < 0.94) return 'boo';
    return 'blue_shell';
  } else {
    // Back pack comeback items!
    if (r < 0.24) return 'star';
    if (r < 0.46) return 'golden_mushroom';
    if (r < 0.66) return 'triple_mushroom';
    if (r < 0.82) return 'blue_shell';
    return 'lightning';
  }
}

export const SOURCE_AND_FEEDBACK_INFO = {
  sourceInfo: [
    'Date: 2026-10-27 16:37',
    'Source: Mario Kart 64 for N64',
    'Game Title: Flash-O-Kart 64 (FlashOKart64)',
    'Tech: Three.js R180 (0.180.0) WebGPU Renderer + TSL (Three Shading Language), no WebGL fallback, @dimforge/rapier3d-compat 0.19.3, Web Audio API procedural N64 synth, Gamepad API',
    'Art Direction: Stylized Cel-Shaded Toon Look (TSL stepped diffuse/specular/rim lighting + TSL BackSide inverted-hull ink outlines)',
    'Animation: Procedural hierarchical joint & transform animation (kart suspension pitch/roll/hop squash-and-stretch, wheel spin & steering, driver leaning/steering/cheering, spin-out/flip/shrink hit reactions, floating item boxes, Lakitu rescue rig)',
    'Testing: Lightweight headless Playwright WebGPU verification (console/pageerror assertions, RenderTarget pixel readback for split-screen viewports, state machine transitions, input/settings checks; no screenshots, visual review, or subagents)',
    'Environment: Antigravity CLI (headless); Linux; Chromium WebGPU headless',
    'Model: Google, gemini-4-argon, reasoning effort high',
    'Usage: unknown (estimated API cost in USD, token count, and session time not exposed to runtime environment)'
  ],
  testingFeedback: [
    'How many issues did testing catch?: 5 issues caught during lightweight automated checks.',
    'How many would be considered critical issues / game breaking?: 3 critical issues (1: WebGPURenderer split-screen color clearing behavior where scene.background triggers a full-attachment WebGPU loadOp clear that wipes previous viewports unless scene.background is null and a per-camera skybox mesh is used with autoClear = false; 2: WebGPURenderer top-left Y=0 viewport/scissor origin vs WebGL bottom-left origin; 3: Headless Linux/WSL2 WebGPU canvas swapchain interop requiring Vulkan ANGLE flags and TSL node material caching across course reloads). The other 2 were minor (navigator.gpu requiring a localhost secure context rather than about:blank, and Rapier 0.19.3 init({}) expecting an options object to avoid deprecation logging).',
    'What was the most helpful test you ran?: Reading back split-screen RenderTarget pixels via renderer.readRenderTargetPixelsAsync() and running a full state-machine transition test across all 4 courses, 4-player split-screen, 12 items, ghost replay, and attract mode in headless WebGPU.',
    'What was the least helpful test you ran?: Checking navigator.gpu on about:blank before routing through http://localhost, since Chromium hides navigator.gpu on non-secure about:blank pages.'
  ],
  engineFeedback: [
    'What did you like most about the engine?: Three.js r180 TSL (Three Shading Language) makes authoring custom WebGPU node shaders—like stepped cel-shading, view-space rim highlights, animated rainbow road bands, and vertex-extruded BackSide ink outlines—clean, composable, and free of raw WGSL boilerplate.',
    'Did you get stuck or guess wrong?: Initially guessed that scene.background with renderer.setScissorTest(true) and renderer.setViewport() would only clear inside the active scissor rect as in WebGL. In WebGPU, render pass loadOp clear affects the entire attachment, so switching to a camera-following skybox dome and renderer.autoClear = false solved it immediately.',
    'What was the most important thing you had to build yourself?: The arcade kart physics & power-slide drift controller bridging Rapier 3D rigid bodies with spline-relative track progress, 3-tier mini-turbo spark charging, rubber-banded AI navigation, and position-based item homing.',
    'What was the hardest part about using the engine?: Coordinating multi-viewport split-screen rendering (1P–4P) in WebGPURenderer with per-viewport depth clearing and top-left Y viewport coordinates.',
    'If you had to remove or overhaul one thing from engine, what would that be?: Overhaul WebGPURenderer multi-viewport clearing so that scene.background or clearColor automatically uses a scissor-aware quad pass when scissorTest is enabled and viewport is smaller than the target.',
    'If you could change one thing about the engine, what would it be?: Built-in documentation and helper utilities for split-screen ArrayCamera / multi-viewport depth-only clears in WebGPURenderer.'
  ],
  promptFeedback: [
    'What did you like most about this prompt?: Clear technical constraints (Three.js r180, WebGPU no fallback, Rapier 0.19.3, cel-shaded art direction, 10-foot controller UX, 4-player multiplayer, 10s attract mode) paired with creative freedom to build a true spiritual successor to Mario Kart 64.',
    'What was confusing?: Nothing major; the testing instruction ("Keep testing efficient and lightweight. No screenshots, visual review, judge/adversarial reviews, or subagents") clearly defined the boundaries for verification.',
    'What was the hardest thing to do?: Balancing authentic N64-style power-slide drifting, 12 distinct item behaviors, 4 distinct courses/arenas, 4-player split-screen HUDs, procedural Web Audio music/SFX, and 10-foot controller navigation inside a single self-contained deliverable.',
    'If there was one test you could have run, what would that test be?: A 4-player simultaneous physical DualSense gamepad playtest on a living-room 4K TV to fine-tune drift counter-steer feel and split-screen camera FOV.'
  ]
};
