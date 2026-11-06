export const sourceInformation = {
  date: "2026-11-05 21:26:16",
  source: "E.T. the Extra-Terrestrial (1982)",
  plan: "none",
  genre: "Adventure, stealth and flight",
  perspective: "Third-person follow camera",
  tech: "Three.js 0.180.0 WebGPURenderer (WebGPU with native WebGL 2 compatibility), Rapier 0.19.3, Web Audio API, Gamepad API, AI Hub Session Protocol v1 client 1.4.0, WebRTC and BroadcastChannel",
  artDirection:
    "Stylized cel shading and ink outlines; procedurally built miniature suburb under a moonlit sky",
  animation:
    "Native Three.js AnimationMixer keyframe clips, with procedural vehicle and environment animation",
  audio:
    "Original music, synthesized sound effects and Animalese-style gibberish voices written in code; music defaults to 10% volume; no audio files",
  online:
    "1–2 player cooperative adventure via AI Hub sessions; standalone direct WebRTC with invitation/answer codes and same-device BroadcastChannel rooms",
  testing:
    "Headless scripted full-story playthrough; keyboard, emulated standard gamepad and multitouch; offline/live Web Audio analysis; two-page co-op and direct WebRTC; upstream AI Hub standard, dedicated-server and host-departure harnesses with latency/loss; file:// launch; 1920×1080 WebGL compatibility screenshots for visual inspection. Physical-controller, real-phone and TV behavior: unknown.",
  research:
    "No internet research. Native model knowledge for the film and game design; only the explicitly requested AI Hub integration source was retrieved",
  environment: "Codex CLI (headless); Linux",
  model: "OpenAI, gpt-6.1-sol, reasoning effort ultra",
  usage: "added on import",
};

export const testingFeedback = [
  "17 distinct root-cause issues were caught by automated tests, visual checks and code review; all were corrected.",
  "3 were game-breaking in their affected mode: duplicate bundled imports prevented startup, dedicated-server seat mapping prevented correct player control, and guest menu/restart authority could block or fork co-op. All were corrected.",
  "The complete scripted story playthrough combined with the actual upstream AI Hub harness: these checked the ending, shared puzzle input, authoritative co-op, dedicated-server control and round lifecycle.",
  "The initial WebGPU screenshot was least helpful because this headless environment returned a blank GPU canvas; engine/state checks and the renderer’s WebGL compatibility screenshots supplied useful evidence instead.",
];

export const engineFeedback = [
  "Three.js made the miniature world easy to compose, and native AnimationMixer clips and WebGPURenderer worked together with the procedural art.",
  "Yes. MeshToonMaterial rejected a flatShading option, so faceted geometry supplies that shape. Headless WebGPU screenshots were blank, so visual inspection used the same renderer’s WebGL compatibility backend while gameplay tests verified actual WebGPU.",
  "The adventure state machine, controller-first UI, procedural characters and audio, and host-authoritative shared-world co-op with standalone connection exchange.",
  "Keeping physics, animation, menus, shared puzzle input and the Hub dedicated-server lifecycle consistent in a portable single HTML file.",
  "none",
  "Provide a compact built-in example that combines WebGPU, a Rapier character, native animation, controller menus and shared-world networking.",
];

export const promptFeedback = [
  "The source, controller-first goal and code-only audio requirement gave the adventure a clear personality while leaving room for original mechanics.",
  "The no-internet-research instruction appeared alongside a required online integration link. Only the explicitly requested integration code and dependencies were downloaded; film and design research remained native model knowledge.",
  "Delivering the full three-act adventure, procedural art and music, accessible input, two networking paths and a reviewed single-file package together.",
  "Clarify that dependency and required-integration downloads are allowed, and specify the preferred player count and approximate demo length.",
];

export const aiHub = {
  name: "E.T. Moonward Bound",
  tagline: "A little friend. A very big sky.",
  description:
    "Make a friend, gather a homemade signal machine, and slip through a moonlit suburb. Then take a bicycle beyond the searchlights in a warm, cel-shaded cooperative adventure.",
  type: "Game",
  genre: "Adventure",
  source: "E.T. the Extra-Terrestrial (1982)",
  series: "E.T. the Extra-Terrestrial",
  players: "1–2",
  controls:
    "Move: WASD/arrows or left stick; click to ride; interact: E/Cross; glow or lift: Space/Square; sneak or boost: Shift/L2; camera: drag/right stick; pause: Esc/Options; signal: 1/2/3 or Square/Cross/Circle; touch: invisible stick, context action and assisted flight.",
  tags: ["3d", "adventure", "co-op", "stealth", "flight", "sci-fi"],
};

const questions = {
  sourceInformation: {
    date: "Date",
    source: "Source",
    plan: "Plan",
    genre: "Genre",
    perspective: "Perspective",
    tech: "Tech",
    artDirection: "Art Direction",
    animation: "Animation",
    audio: "Audio",
    online: "Online",
    testing: "Testing",
    research: "Research",
    environment: "Environment",
    model: "Model",
    usage: "Usage",
  },
  testingFeedback: [
    "How many issues did testing catch?",
    "How many would be considered critical issues / game breaking?",
    "What was the most helpful test you ran?",
    "What was the least helpful test you ran?",
  ],
  engineFeedback: [
    "What did you like most about the engine?",
    "Did you get stuck or guess wrong?",
    "What was the most important thing you had to build yourself?",
    "What was the hardest part about using the engine?",
    "What did you change in the engine, and why?",
    "If you could change one thing about the engine, what would it be?",
  ],
  promptFeedback: [
    "What did you like most about this prompt?",
    "What was confusing?",
    "What was the hardest thing to do?",
    "What would you change in this prompt?",
  ],
};

/** Safe, dependency-free credits rendering; all narrative and data use textContent. */
export function renderCredits(container) {
  container.replaceChildren();
  const add = (tag, text, parent = container, className = "") => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    parent.append(node);
    return node;
  };
  add("h2", "About & Credits");
  add("p", aiHub.name, container, "credits-game-title");
  add("p", aiHub.tagline);
  add(
    "p",
    "An original fan-made game inspired by E.T. the Extra-Terrestrial (1982). Unaffiliated with the film’s creators or rights holders. Game code, procedural visual assets, animation and synthesized audio were generated for this demo.",
  );
  add("h3", "Play");
  add(
    "p",
    "Explore a moonlit neighborhood, befriend a small visitor, find signal-machine parts, avoid searchlights and fly a bicycle toward home. Play solo or invite a second friend.",
  );
  add("p", aiHub.controls);
  add(
    "p",
    "Pause to change settings, choose controller glyphs, review controls or open Developer mode. The title screen starts an automated adventure after ten seconds without input; any input returns to the menu.",
  );
  add("h3", "Source Information");
  const source = add("dl", "", container, "credits-source-grid");
  for (const [key, value] of Object.entries(sourceInformation)) {
    add("dt", questions.sourceInformation[key] || key, source);
    add("dd", value, source);
  }
  for (const [title, key, answers] of [
    ["Testing Feedback", "testingFeedback", testingFeedback],
    ["Engine Feedback", "engineFeedback", engineFeedback],
    ["Prompt Feedback", "promptFeedback", promptFeedback],
  ]) {
    add("h3", title);
    const list = add("dl", "", container, "credits-feedback");
    questions[key].forEach((question, index) => {
      add("dt", question, list);
      add("dd", answers[index] || "unknown", list);
    });
  }
}
