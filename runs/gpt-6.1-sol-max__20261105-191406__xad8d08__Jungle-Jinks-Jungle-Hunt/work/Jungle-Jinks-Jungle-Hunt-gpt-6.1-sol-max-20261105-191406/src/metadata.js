export const sourceInformation = {
  date: "2026-11-05 19:14:06",
  source: "Jungle Hunt — 1983 (source specified by the prompt)",
  plan: "none",
  genre: "Arcade action-adventure / platformer",
  perspective: "Side-scrolling 2.5D; orthographic 3D dioramas",
  tech: "Three.js r180 (0.180.0), WebGPU with WebGL 2 fallback; Rapier 3D 0.19.3; Web Audio API; Gamepad API; WebRTC; AI Hub Session Protocol v1, client 1.4.0",
  artDirection: "Procedural cel shading, ink silhouettes, botanical shapes, warm paper typography",
  animation:
    "Three.js AnimationMixer, AnimationClip and keyframe tracks; procedural pendulum, water, wildlife and particles",
  audio:
    "All music, effects and Animalese-style gibberish synthesized in code using Web Audio; no audio files; music defaults to 10%",
  online:
    "1–4 AI Hub ghost races; 1–2 direct WebRTC ghost races; 1–2 local split-screen races. Direct WebRTC uses manual invitation/reply and Google STUN; restrictive NATs may require AI Hub.",
  testing:
    "Headless Chromium software WebGPU and WebGL 2; scripted full expeditions, physics, menu, audio, touch and emulated standard controller checks; AI Hub automatic harness and two-page WebRTC test. No physical pad, touch hardware or listener.",
  research:
    "No internet research. Native model knowledge for the source. Only the supplied AI Hub integration files and exact-version package dependencies were downloaded.",
  environment: "Codex CLI (headless); Linux / WSL2",
  model: "OpenAI, gpt-6.1-sol, reasoning effort max",
  usage: "added on import",
};
export const testingFeedback = [
  "8 confirmed product issues were found and fixed: attract input suppression, HUD overlap, canopy relic placement, rescue visibility, graphics-device loss handling, the zero-health Escape soft lock, a stale attract restart timer, and portrait camera framing. Test-only corrections covered acceleration thresholds, floating-point tolerance, controller polling, asynchronous network arrival and locator scope.",
  "4 critical cases: a lost graphics device could leave a blank game, Escape on the zero-health screen could hide its recovery menu, a leftover attract restart timer could interrupt a new expedition, and the original camera lead could place the explorer outside a portrait screen. All are fixed.",
  "The complete scripted four-act expedition through the actual movement and interaction code, complemented by the official AI Hub harness under latency, packet loss and host departure.",
  "Initial WebGPU canvas screenshots were least helpful because this headless compositor captured a blank canvas. GPU pixel readback and WebGL 2 art captures provided useful verification instead.",
];
export const engineFeedback = [
  "Three.js r180’s WebGPU renderer, native toon materials and animation mixer made a detailed procedural diorama practical in one portable HTML file.",
  "Yes. Headless WebGPU required explicit ANGLE SwiftShader flags; relying on compositor screenshots and simulation state alone was insufficient. A native GPU render-target readback now verifies rendering.",
  "The complete game layer: character control, pendulum handling, act progression, UI navigation, checkpoints, procedural audio and multiplayer state.",
  "Keeping physical movement, readable silhouettes and native animation coherent through swings, water and stage transitions.",
  "none; the engine and physics packages are bundled without source modifications.",
  "A small official controller-first game framework with character, pause, input-glyph and accessibility primitives would reduce repeated infrastructure work.",
];
export const promptFeedback = [
  "The four-act source, controller-first direction and explicit testing tools gave the vertical slice a clear shape.",
  "Standalone online play has no signaling service specified. Direct invitation/reply, local split-screen and the supplied AI Hub transport resolve that ambiguity.",
  "Making all four arcade mechanics, original procedural art, sound and three multiplayer paths feel like one complete expedition.",
  "Specify whether standalone online play should use a supplied signaling service, direct invitations, or only the AI Hub transport.",
];
export const aiHub = {
  name: "Jungle Jinks",
  tagline: "Four acts. One very bad shortcut.",
  description:
    "Swing through canopies, swim past crocodiles, dodge boulders and rescue Pip in a hand-inked jungle expedition. Play solo or race friends through all four connected acts.",
  type: "Game",
  genre: "Platformer",
  source: "Jungle Hunt (1983)",
  series: "",
  players: "1–4",
  controls:
    "Left stick / WASD: move and swim; Cross / Space: jump, grab, release; Square / J / click: swish; hold Triangle / E: interact; Circle / Shift: duck; Options / Esc: pause.",
  tags: ["3d", "arcade", "side-scrolling", "adventure", "racing", "retro"],
};
export const feedbackQuestions = {
  testing: [
    "How many issues did testing catch?",
    "How many were critical or game breaking?",
    "Most helpful test?",
    "Least helpful test?",
  ],
  engine: [
    "What did you like most about the engine?",
    "Did you get stuck or guess wrong?",
    "Most important thing built yourself?",
    "Hardest part of using the engine?",
    "What did you change in the engine, and why?",
    "One engine change you would like?",
  ],
  prompt: [
    "What did you like most about this prompt?",
    "What was confusing?",
    "What was the hardest thing to do?",
    "What would you change?",
  ],
};
