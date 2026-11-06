/** @file Canonical report data for the in-game About screen and root exit interview. */
export const REPORT = {
  sourceInformation: {
    date: '2026-11-04 22:40:22',
    source: 'Wii Fit',
    plan: 'PLAN.md',
    genre: '3D sports and wellness anthology with exploration and a comedy story',
    perspective: 'Third person, with an activity-specific camera',
    tech: 'my-3dge e7a124394afe087a40c36e2662a5c4ca2b39a663; TypeScript 5.9.3; three.js r182 WebGPU; Rapier 0.21.0; Vite 7.3.7; Vitest 4.1.12',
    artDirection:
      'Native toon puppets and procedural geometry, original retreat architecture, tracksuits and props in warm paper, sea glass and coral',
    animation:
      'Native humanoid and clip layers; original readable pose strips scrubbed directly by lean and breath; Mesh2Motion reference rest skeleton',
    audio:
      'Eight original code-written tracker songs, synthesized effects and five gibberish formant voices; no audio files; music defaults to 10%',
    online:
      'AI Hub Session Protocol v1, unmodified client 1.4.0, ghost rounds for 1–4 players; same-screen Group Class with CPU guests',
    testing:
      'Headless simulation, deterministic replay and restore, scripted five-day playthrough, synthetic controls, browser and viewport checks; no physical controller, real iOS or human audio listening available',
    research:
      'Provided PLAN.md; pinned engine public APIs and guide; official engine repository and AI Hub protocol documentation',
    environment: 'Codex CLI (headless); Linux, Ubuntu 26.04 on WSL2',
    model: 'OpenAI, gpt-6.1-sol, reasoning effort max',
    usage: 'added on import',
  },
  testingFeedback: [
    '34 distinct issues were logged and corrected through automated, static and visual checks. The detailed tally is in PROGRESS.md.',
    '14 could block startup, controls, exploration/progression, saving or Hub integration.',
    'The Hub harness augmented with real engine-readiness and ghost-entity assertions; protocol traffic alone could hide a game still loading.',
    'Fixed-delay browser checks were least useful on software WebGPU. Waiting for live state produced reliable checks.',
  ],
  engineFeedback: [
    'The deterministic headless world, recorded scene actions, restoration and procedural puppet/prop APIs.',
    'Yes: fixed action maps were reapplied every sample, list action arguments needed object envelopes, and newly spawned actors needed their extra components at spawn.',
    'The shared wobble/breath model, distinct activities, original scrubbed poses, retreat art, independent local seats and the large-screen interface.',
    'Preparing four real WebGPU copies before the Hub deadline while keeping the engine read-only.',
    'None. All 2,135 engine-owned files remain byte-identical to the pinned commit.',
    'Expose scene-scoped prop warm-up so unplaced island assets do not load in a small session scene.',
  ],
  promptFeedback: [
    'The one balance verb, daily ritual, deadpan cast and island-scale finale make a coherent original game.',
    'A few tested API examples still needed adjustments in the generated workspace, particularly composite JSON imports and persistent action-map switching.',
    'Combining a complete five-day game, offline single-file deployment and real four-player session startup.',
    'Provide the generated pinned workspace and a machine-readable acceptance checklist alongside the design.',
  ],
  aiHub: {
    name: 'Wobble Fit',
    tagline: 'Stand still. It is harder than it looks.',
    description:
      'A five-day balance retreat on an island that is slightly out of true. Find your centre in poses, water sports and a very suspicious pond, then hold everything together in the storm.',
    type: 'Game',
    genre: 'Sports',
    source: 'Wii Fit',
    series: '',
    players: '1–4',
    controls: 'Lean: left stick, WASD or mouse · Feet: L2 / R2, Q / E or mouse buttons · Breathe: both',
    tags: ['3d', 'third-person', 'comedy', 'arcade', 'sports', 'story'],
  },
};
export const CREDITS = [
  'Original game, world, writing, procedural assets, pose strips and synthesized score created for this build.',
  'my-3dge — MIT. three.js — MIT. Rapier — Apache-2.0. @stdlib — Apache-2.0.',
  'AI Hub Session Protocol v1; session client 1.4.0, copied unmodified.',
  'Mesh2Motion — reference rest skeleton, CC0. All playable pose strips are original hand-authored data.',
  'No STYLE100 or CMU animation clips are used.',
];
