/* About and credits pages (shown from the title). Plain text only: this file is inlined as a classic script. */
var BENTOU_ABOUT = [
  { title: 'Bentou 2: Birth of the Lunchbox Assassins', text: [
    'An original isometric ninja stealth game, a playful riff on Tenchu 2: Birth of the Stealth Assassins.',
    'Kokaku street, the night of the trial. Stay unseen, take guards down with Silent Cuts, steal the ledger and get out by the east gate.',
    'Keys: WASD move, Shift sprint, Space jump and climb, C crouch, J strike or Silent Cut, K block, L roll, V camera view.',
    'Pad: left stick move, X jump, Square strike, Circle crouch, Triangle block, R1 roll. Esc or Options pauses.'] },
  { title: 'Source Information', text: [
    'Date: 2026-11-03 18:36:06',
    'Source: Tenchu 2: Birth of the Stealth Assassins (Acquire, PlayStation, 2000)',
    'Plan: PLAN.md, used as the design reference; this build is a cut-down vertical slice of it',
    'Genre: stealth action. Perspective: isometric third person (engine iso view), rotatable 45 degrees',
    'Tech: my-3D2dge v0.85.2 engine (handoff build, unpatched), vanilla JavaScript in one HTML file; Node build script; Python Playwright tests',
    'Art direction: the engine\'s pixel-art style with procedural shapes and materials; no image files',
    'Animation: the engine\'s procedural Humanoid rig, E.Attack and the takedown action',
    'Audio: the engine\'s chip synth; layered music in code. Voices: not in this build',
    'Online: none (AI Hub ghost mode was planned and is not in this build)',
    'Testing: scripted browser checks in headless Chromium, run from file://',
    'Research: the source\'s public description and the engine\'s stealth kit',
    'Environment: Claude Code CLI (headless); Linux (WSL2); headless Chromium via Playwright',
    'Model: Anthropic, claude-haiku-5-5, reasoning effort medium',
    'Usage: unknown' ] },
  { title: 'Not in this build', text: [
    'Planned in PLAN.md but not built: the grappling hook, the Bento packing screen and tools, alarm bells and reinforcements, the three story missions, bosses, the escort, the Workshop editor, AI Hub ghost mode and the Shadow Trial, Animalese voices, and the full story script.',
    'Built: the title (New Mission, Character, Settings, About, Dev Mode), one mission with two playable apprentices, Silent Cuts from behind and above, Shadow Sight with the Ki gauge, the rank screen, the game-over screen, Dev Mode sliders, attract mode after 10 seconds, and this About screen.'] },
  { title: 'Testing Feedback', text: [
    'Issues caught: the checks found 0 game bugs. They caught 3 problems in the test setup: a page crash with default browser flags, a wrong scene probe, and a loose Silent Cut check.',
    'Critical or game-breaking: 0 found by the checks. The checks cover boot, attract, the mission start, a Silent Cut, the Ki readout, the objective, the Dev Mode values and the touch-only notice. They do not cover a full playthrough.',
    'Most helpful test: a real Silent Cut from behind, which checks the kill count and the guard\'s state.',
    'Least helpful test: the attract timing check, which waits real seconds and gives little signal about the game.'] },
  { title: 'Engine Feedback', text: [
    'Liked most: the stealth kit. E.sees, E.Suspicion, E.FlowField, takedown actions and the Shell HUD made the core loop cheap to build.',
    'Stuck or guessed wrong: the scene name lives on game.sceneName, not game.scene; I was unsure of the Shell\'s back and current-screen calls, so I avoided them.',
    'Most important thing built myself: Shadow Sight, the Ki gauge, the Dev Mode sliders, the attract autopilot, the title and the About screens. The engine has none of these.',
    'Hardest part: the size of the API. It is about 1.2 MB, and the card is long; finding the right call took many searches.',
    'Engine changes: none. engine.js is the handoff build, unpatched.',
    'One change I would make: name the current scene consistently across game and tests, and add a current-screen query on the Shell.'] },
  { title: 'Prompt Feedback', text: [
    'Liked most: the stage file was clear about where the deliverables go, and the testing rules (one command, failures only) were concrete.',
    'Confusing: the plan is about 1,900 lines and assumes a team and weeks, while the goal asks for every feature. The plan also uses other model names and a different timestamp in its file names; TASK.md wins, as the stage file says.',
    'Hardest thing to do: fit the plan\'s scope into one session. I cut it to a vertical slice and say so here.',
    'Would change: mark which features are required for a demo and which are stretch, and state the scope the goal expects.'] }
];
