// Dipout HD: source information and the feedback sections. Feeds the About screen AND exit-interview.json.
// Values are plain text. "unknown" marks anything that could not be confirmed.
(() => {
  const SN = globalThis.SN;
  SN.ABOUT = {
    sourceInformation: {
      date: '2026-11-03 18:49:47',
      source: 'Wipeout HD',
      plan: 'PLAN.md (a design plan written for another game, SNIPEOUT HD, by claude-opus-5-5 at max effort). Used as the reference for systems and numbers; TASK.md wins where they disagree. Title and file names follow TASK.md.',
      genre: 'Anti-gravity combat racing (arcade), with a Quick Race and a Time Trial',
      perspective: 'Third-person chase camera behind the craft, with a far chase and a cockpit view',
      tech: 'my-3D2dge engine v0.85.2 (handoff package plus the 3D add-on, commit 4390a98), three.js r182 (WebGPU, WebGL 2 fallback). Rapier not used.',
      artDirection: 'Pixel-resolution 3D with the engine\'s pixel HUD and fonts. Neon road, pillars under the road, team-coloured craft built in code.',
      animation: 'Procedural craft motion: roll with steering and bank, landing and hover spring. Engine tweens for menus. Engine particles for sparks.',
      audio: 'Music, sound effects synthesized in code by the engine\'s chip synth (no files). No voices yet.',
      online: 'none',
      testing: 'Headless simulation tests (Node) and browser tests (Playwright), run by one command, tests/run.mjs',
      research: 'none',
      environment: 'Claude Code CLI (headless); Linux (WSL2); browser unknown',
      model: 'Anthropic, claude-haiku-5-5, reasoning effort medium',
      usage: 'unknown',
    },
    testingFeedback: [
      'How many issues did testing catch? Six real bugs in the first runs: the 3D module was not waited for at boot, a </script> in the engine header broke the inlined bundle, the sky colour parameter was a string where a number was needed (NaN shader), the camera stayed in view mode so the chase pose was ignored, the race never ended if the human did not finish, and the attract exit missed some inputs.',
      'How many would be considered critical or game-breaking? Three: the bundle would not boot, the 3D world drew black, and a race could not end without the human finishing.',
      'Most helpful test: the trace probes that printed the scene name, craft progress and camera pose per second. They turned a silent black screen and a stuck race into a specific cause.',
      'Least helpful test: the randomised three-minute physics run passes even when the craft is barely moving on the road, so it checks for crashes and NaNs, not for feel. The feel was judged by reading numbers, not by play.',
    ],
    engineFeedback: [
      'What did you like most about the engine? World3D with a fixed camera, custom three.js meshes in world.scene, the onDraw hook, the deferred-module boot step, and game.debug. It was possible to reach a racing view in one session.',
      'Did you get stuck or guess wrong? Yes. The chase pose was ignored because the camera stays in view mode until camera.set("fixed") is called; the sky dome takes haze as a number, not a colour; and the engine header contains literal script-closing tags that break inlining. I found each by reading source and one console error.',
      'What was the most important thing you had to build yourself? The track-space hover physics, the banked road and its meshes, the race rules, and the AI pilot. The engine has no racing physics for this.',
      'What was the hardest part about using the engine? Working out camera and coordinate conventions (engine units, yaw, pitch sign) from the docs and a screenshot, and the lack of a PlayStation symbol in the pixel font.',
      'What did you change in the engine, and why? Nothing. Every fix was in the game code or the bundler.',
      'If you could change one thing about the engine, what would it be? Make the camera mode set by its own pose, and document that the bundle must escape closing script tags.',
    ],
    promptFeedback: [
      'What did you like most about this prompt? The exact file names, the rule to run one test command, the request for a truly random title, and the requirement that the About screen and reply carry the same sections.',
      'What was confusing? The plan (PLAN.md) names a different title, dev folder and file name from the ones TASK.md asks for, and the goal asks for every feature while the plan describes twelve milestones of work.',
      'What was the hardest thing to do? Fitting the plan\'s full scope (eleven modes, four tracks, season, hub, audio voices) into one session. This build covers a subset, listed in the final reply.',
      'What would you change in this prompt? Name the must-have features for the demo, and say which plan sections are optional, so the done condition can be met or honestly reduced.',
    ],
    aiHub: {},
    engineChanges: [],
  };
})();
