/** @file Writes the required plain-text exit interview and catalogue record, also embedded by the bundler. */
import { writeFileSync, readFileSync } from 'node:fs';
const issues = JSON.parse(readFileSync('out/issues.json', 'utf8'));
const data = {
  sourceInformation: {
    date: '2026-11-05 07:25:16',
    source: 'Far Cry 2',
    plan: 'PLAN.md',
    genre: 'Open-world shooter with systemic fire and survival pressure',
    perspective: 'First person, with shoulder, driving chase and eye-level body cameras',
    tech: 'my-3dge at ea717c7; TypeScript 5.9.3; three.js 0.182.0 on WebGPU; Rapier 0.21.0; HTML/CSS; Vite 7.3.7; Vitest 4.1.12; Playwright 1.64.1 with installed Chromium 153 and WebKit 26.6',
    artDirection:
      'Native low-poly style, sun-bleached earth, procedural savanna, original props, weapons and articulated characters',
    animation:
      'Native procedural humanoid and action layers, authored medical and field actions, visible gun reload poses, suspension and buoyancy',
    audio: 'Code-only tracker music, synthesized effects and formant gibberish voices; music defaults to 10%',
    online:
      'AI Hub Session Protocol v1, client 1.4.0; host-sequenced shared-world co-op for 1–4; standalone BroadcastChannel rooms and WebRTC invite codes',
    testing:
      'Headless simulation, scripted campaign playthrough, replay/capture, multiplayer determinism, browser UI and protocol checks. Real GPUs, physical controllers, speakers, cross-machine networking and iOS Safari are unverified.',
    research:
      'Read PLAN.md, the my-3dge guide, public API and engine examples, and the AI Hub session protocol and harness source.',
    environment: 'Codex CLI (headless); Linux',
    model: 'OpenAI, gpt-6.1-sol, reasoning effort max',
    usage: 'added on import',
  },
  testingFeedback: [
    `${issues.length} distinct issues were tracked across game integration, UI and test tooling; details are in out/issues.json.`,
    `${issues.filter((issue) => issue.critical).length} tracked issues prevented startup or normal gameplay. The pinned engine was not changed.`,
    'The scripted campaign and capture/restore tests were most helpful: they exposed state ownership, tutorial hazards and interaction ordering.',
    'The first long high-quality GPU startup wait was least helpful. Geometry assembly and smaller targeted probes made the cause clear. Real hardware and speakers remain unverified.',
  ],
  engineFeedback: [
    'The deterministic CPU simulation and native procedural animation made systemic fire and shared-world play practical.',
    'Yes. Setup queues spawns, schemas reject reserved fields, and captures reject shared or undefined component data. Integration probes identified those mistakes.',
    'The shared input path and game systems: all-seat firearms, fire, survival, contracts, vehicles, saves and lockstep networking.',
    'First-person arms are a closed rig, and eagerly warming a batch for each gun part and variant made startup expensive. Assembled gun meshes and visible pose variants work around both.',
    'None. The pinned engine remains unchanged.',
    'Expose first-person hand/action poses and an asset warm-up API that can request only the models a game needs.',
  ],
  promptFeedback: [
    'The source-mechanics brief and explicit delivery, controller, audio and test requirements gave the game a clear identity.',
    'PLAN.md mixed firm feature requirements with starting values and verified implementation recipes. Some recipes needed adjustment for the pinned engine.',
    'Making survival, story, vehicles, fire, UI and co-op behave consistently in one deterministic world was the hardest part.',
    'Separate feature acceptance from suggested implementation recipes, and provide a compact machine-readable feature checklist alongside the narrative plan.',
  ],
  aiHub: {
    name: 'Bar Cry',
    tagline: 'Everything here has a price.',
    description:
      'Carry a warrant into a dry-season war, with a rusting rifle, a fever and a ledger of debts. Wind-driven fire, fragile weapons, drivable pickups and boats, and a cooperative depot raid share one open world.',
    type: 'Game',
    genre: 'Shooter',
    source: 'Far Cry 2',
    series: 'Far Cry',
    players: '1–4',
    controls:
      'WASD / left stick moves; mouse / right stick looks; click / R2 fires; E / Square uses; R / hold Square reloads; H / L1 heals; M / D-pad up maps; Esc / Options pauses.',
    tags: ['3d', 'first-person', 'co-op', 'vehicles', 'exploration', 'low-poly'],
  },
};
writeFileSync('../exit-interview.json', JSON.stringify(data, null, 2) + '\n');
JSON.parse(readFileSync('../exit-interview.json', 'utf8'));
