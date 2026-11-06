// Testing, Engine and Prompt Feedback: the brief's questions with honest answers. Shown on About pages, in the exit interview and the chat reply.
export const FEEDBACK = {
  testing: [
    ['How many issues did testing catch?', '15 logged in tests/ISSUES.md, plus a few small ones fixed on the spot.'],
    ['How many would be considered critical issues / game breaking?', '9 of the 15.'],
    ['What was the most helpful test you ran?', 'The scripted playthrough: a bot plays M0 to both endings through the real key, mouse and hold-to-use input, with different choices in two runs. It exposed the frozen AI positions, the Rapier panic and the broken mission wiring that no unit test saw.'],
    ['What was the least helpful test you ran?', 'The attract-mode run: it proves the tour loops without errors but cannot say whether any beat looks right; only screenshots can, and software rendering shows about one frame a second.'],
  ],
  engine: [
    ['What did you like most about the engine?', 'Engine.headless with step(): fast, repeatable play in Node, and models, textures and sounds as plain data that a sheets tool and renderSound can check without a display. The pixel pipeline makes everything look like one game at once.'],
    ['Did you get stuck or guess wrong?', 'Yes: Node read pixel-engine.js as CommonJS until package.json said type module; CharacterController.feet returns a fresh vector, not a live one, so my AI froze; removing a controller body with physics.remove panics Rapier; the headless camera is not first person unless asked.'],
    ['What was the most important thing you had to build yourself?', 'Everything that makes it a game: the 5 m fire grid and its look, first-person hands and wear and jams, soldier AI, the mission and dialogue runner, the screen and prompt system, and the Cash Run netcode.'],
    ['What was the hardest part about using the engine?', 'First person and menus: replacing the rig step, owning pointer lock, a HUD with only a 5x7 font, and judging a 3D scene at one frame a second without being able to watch it move.'],
    ['What did you change in the engine, and why? (none if nothing)', 'none'],
    ['If you could change one thing about the engine, what would it be?', 'Give CharacterController a documented dispose and a live feet vector, so characters can be retired and read safely.'],
  ],
  prompt: [
    ['What did you like most about this prompt?', 'The plan decided what to build and listed verified engine traps, so effort went into building; the cut order and the done list kept scope honest.'],
    ['What was confusing?', 'How much a single run can finish: the plan is a whole game plus multiplayer, attract mode and dev mode, and some rules pull against each other, such as six items a screen against twenty balance sliders.'],
    ['What was the hardest thing to do?', 'Breadth: keeping nine systems consistent while every check ran headless, and proving the story could be finished by a bot.'],
    ['What would you change in this prompt?', 'Name a minimum bar and a budget, and say which cuts are acceptable up front; split the plan into milestones with their own done lists.'],
  ],
};
