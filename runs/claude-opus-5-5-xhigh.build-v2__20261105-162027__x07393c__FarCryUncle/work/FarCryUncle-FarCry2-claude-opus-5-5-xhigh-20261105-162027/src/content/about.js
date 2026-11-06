// The About and Credits text, paged by src/ui/about.js. The brief's questions and honest answers, in order.
// tools/exit.mjs writes exit-interview.json from this same data, so the two cannot disagree.
export const SOURCE_INFO = [
  ['DATE', '2026-11-05 16:20:27'],
  ['SOURCE', 'Far Cry 2'],
  ['PLAN', 'PLAN.md'],
  ['GENRE AND PERSPECTIVE', 'Open-world first-person shooter with survival pressure and systemic fire. First person on foot, at the wheel and in story scenes, with an optional chase camera in vehicles only.'],
  ['TECH', 'Pixel Engine 0.46.0 (riftlight kit, unedited), three.js r186 on WebGPU, Rapier 0.20, esbuild 0.28 to bundle one HTML file, Playwright 1.63 for tests, and our own JavaScript game systems on top.'],
  ['ART DIRECTION', 'The engine\'s native 3D-as-pixel-art pipeline at 480x270 with toon materials and its 16-colour palette. New people, guns, hands, vehicles, buildings and trees written as model data; library props for the generic things.'],
  ['ANIMATION', 'The engine\'s ClipDef system at 30 fps with compileClips and AnimationMixer. Hero clips for people, new keyed clips on the people rig and on a first-person hands rig (reloads, jams, four field surgeries), ragdolls, plus procedural sway and recoil, a generated limp (gaitClip), two-bone arms at the wheel (twoBoneIK), flags on a spring chain and a spring landing dip.'],
  ['AUDIO', 'All written in code: SoundDef synthesis for every effect, seven original Song tracks, generated Animalese-style gibberish voices per character. No audio files. Music defaults to 10%.'],
  ['ONLINE', 'AI Hub Session Protocol v1, shared world, 1 to 4 players, with its own card. On its own: solo with AI mercs, and two windows on one computer over BroadcastChannel.'],
  ['TESTING', 'Headless Node and Playwright Chromium with software WebGPU. One command prints failures and a one-line count. The engine\'s own check tool and model sheets. A stand-in pad, phone and tablet profiles, a WebKit iPhone check, two pages for a second player, all four hub scenarios. Screenshots only for what a script cannot check. No review subagents.'],
  ['RESEARCH', 'None beyond the plan, the engine kit\'s docs and the AI Hub protocol.'],
  ['ENVIRONMENT', 'Claude Code CLI (headless); Linux'],
  ['MODEL', 'Anthropic, claude-opus-5-5, reasoning effort xhigh'],
  ['USAGE', 'added on import'],
];
export const TESTING_FEEDBACK = [
  ['HOW MANY ISSUES DID TESTING CATCH?', '%ISSUES% logged in tests/ISSUES.md, not counting my own mistakes in the test scripts.'],
  ['HOW MANY WOULD BE CONSIDERED CRITICAL ISSUES / GAME BREAKING?', '%CRITICAL% of them: things like trucks that could never be repaired, a pause menu that closed itself, contract givers who shot you, and an ending that could strand you.'],
  ['WHAT WAS THE MOST HELPFUL TEST YOU RAN?', 'The playthrough bot: it plays M0 through both endings with real actions. It found most of the critical bugs. Second was a random-input soak with views on, which found a chase camera crash no script reached. The engine\'s clip checker earned its place too: run late, it found nine of my clips through the floor. So did walking every screen in all three glyph sets, which found a Game Over with no prompt.'],
  ['WHAT WAS THE LEAST HELPFUL TEST YOU RAN?', 'The static scans for forbidden words and font coverage. They never found a real bug, though they would have been embarrassing to skip.'],
];
export const ENGINE_FEEDBACK = [
  ['WHAT DID YOU LIKE MOST ABOUT THE ENGINE?', 'The same game runs headless in Node far faster than real time, with real physics, so a bot could finish the whole campaign. Close second: 3D as pixel art gave the look at once, and models as data meant no art tools.'],
  ['DID YOU GET STUCK OR GUESS WRONG?', 'Yes. Fog with a negative top washed every surface toward the sky, because the mist term is a smoothstep from -top/2 to top. I found it by turning fog off. I also guessed wrong that one body part of the hands could stay a sibling of the gun, and rebuilt that rig. A torus size is a diameter, so a whole steering wheel and the hands on it sat out of frame. And collide: false on a nested model does not reach its parts, so one wall made over 4,000 physics boxes.'],
  ['WHAT WAS THE MOST IMPORTANT THING YOU HAD TO BUILD YOURSELF?', 'The fire grid and everything hanging off it: painted scars, burned grass blades, swapped trees, flames, light and sound. After that, the first-person hands rig and the mission runner.'],
  ['WHAT WAS THE HARDEST PART ABOUT USING THE ENGINE?', 'Posing first-person hands as numbers with a screenshot costing 25 seconds. Software rendering runs at about one frame a second, and several copies compiling shaders at once can take minutes.'],
  ['WHAT DID YOU CHANGE IN THE ENGINE, AND WHY? (NONE IF NOTHING)', 'None. pixel-engine.js is byte-identical to the kit, and a test checks it.'],
  ['IF YOU COULD CHANGE ONE THING ABOUT THE ENGINE, WHAT WOULD IT BE?', 'Make first person a real mode: free use of Q and E, a look step you can extend, a pointer lock the game owns, and pad buttons kept apart from keyboard codes. Today each needs a workaround.'],
];
export const PROMPT_FEEDBACK = [
  ['WHAT DID YOU LIKE MOST ABOUT THIS PROMPT?', 'The plan made the decisions and verified the traps, so effort went into the game. The list of engine facts saved hours, and the definition of done was concrete enough to test.'],
  ['WHAT WAS CONFUSING?', 'Givers sit inside headquarters while the inner yard is hostile even with a pass, so I had to narrow the yard. The fog numbers were marked verified, but a top of -60 washed the picture; the other three stood. M3\'s sketched wind could not reach the tanks where I first put them, so I moved the tanks. And the source name in the file name has a space the template does not address; I dropped it.'],
  ['WHAT WAS THE HARDEST THING TO DO?', 'Judging feel. I can prove a jam clears on the third press, but not that it feels good, because nothing here runs at real speed and nobody can listen.'],
  ['WHAT WOULD YOU CHANGE IN THIS PROMPT?', 'Say which numbers are starting points to tune rather than facts, and add a short list of moments to check by eye, so the screenshots budget goes to what matters most.'],
];
export const CREDITS_LINES = [
  'Pixel Engine (MIT)', 'three.js (MIT)', 'Rapier (Apache-2.0)', 'The AI Hub session client',
  'Inspired by Far Cry 2; not affiliated',
];
export const AI_HUB = {
  name: 'Far Cry Uncle',
  tagline: 'Your gun rusts. The grass remembers.',
  description: 'Come to a dying country to kill the man who drew its maps. Fire spreads by the wind, guns jam, fever keeps a timetable, and the friends you hire die for real. Four can fight over the stones in Cash Run.',
  type: 'Game',
  genre: 'Shooter',
  source: 'Far Cry 2',
  series: 'Far Cry',
  players: '1–4',
  controls: 'Stick or WASD move, R2 or left mouse fire, L2 or right mouse aim, Square or E use, D-pad Up or M raises the map',
  tags: ['first-person', 'pixel art', 'co-op', 'versus', 'vehicles', 'story'],
};
