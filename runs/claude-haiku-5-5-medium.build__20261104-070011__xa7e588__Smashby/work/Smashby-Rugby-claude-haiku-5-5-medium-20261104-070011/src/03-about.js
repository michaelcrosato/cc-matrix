// THE ABOUT & CREDITS PAGES: what the game is, the source information, and the feedback on this build (written from the
// real build and its test run)
SM.ABOUT = [
  { title: 'SMASHBY', lines: [
    "Made with the my-3D2dge engine v0.85.2 (the handoff package), by the model that built it: claude-haiku-5-5.",
    "The title was drawn with a secure random number generator from fifty riffs on RUGBY: entry 30 was SMASHBY.",
    "An original game inspired by rugby sevens. Every team, person and place is made up.",
    "Controls: left stick or WASD runs. R2 or Shift turbo. Cross or Space steps, or tackles on a tap and a big hit on a hold. Square or F fends, or dives without the ball. Circle or C kicks, and holds for a punt. Triangle or R super. L1 and R1 or Q and E pass up and down the line."] },
  { title: 'SOURCE INFORMATION', lines: [
    "Date: 2026-11-04 07:00:11. Source: rugby (over the top arcade style).",
    "Plan: PLAN.md (a THUGBY TURBO plan by another model), used as reference; the title was re-drawn here, as TASK.md asks.",
    "Genre: sports, arcade rugby sevens. Perspective: a three-quarter broadcast camera, the pitch left to right.",
    "Tech: my-3D2dge v0.85.2 (handoff package), Canvas 2D and Web Audio; no other libraries; one file.",
    "Art direction: the engine's pixel look, 320 by 240 scaled to the screen, 3D skeleton figures, lit night venues.",
    "Animation: the engine's Humanoid rig and its standard poses. No new paired moves were made.",
    "Audio: all written in code (the engine's chip synth). Music, effects and babble commentary; no files.",
    "Online: none. Testing: a headless suite of 158 checks. Research: the plan, the handoff API card and the sports kit.",
    "Environment: Claude Code CLI (headless); Linux under WSL2; headless Chromium for screenshots.",
    "Model: Anthropic, claude-haiku-5-5, reasoning effort medium. Usage: unknown."] },
  { title: 'TESTING FEEDBACK', lines: [
    "Issues caught: about 12 real bugs and about a dozen harness problems. Game-breaking: 3.",
    "Game-breaking: the results screen did not open after the first match of a session (the cup could not advance); the dev panel's freeze stayed on after it closed (later matches never moved); a penalty kicked to touch froze the ball.",
    "Most helpful: the whole Mega Cup played through by a scripted autopilot in the human's seat. It caught the results and cup bugs.",
    "Least helpful: the tackle success test over 400 tries, which checked a formula against itself and passed on the first run."] },
  { title: 'ENGINE & PROMPT FEEDBACK', lines: [
    "Engine: the scene, input, TileMap, Humanoid and Dialog APIs did what the card said. No engine patches were made.",
    "Stuck or guessed: the store and localStorage only exist in browsers, which broke headless saves until a stand-in was added.",
    "Built by hand: the rugby simulation, the set pieces, the AI, the HUD, the commentary, the babble and the dev panel.",
    "Hardest: the TileMap's wall heights and camera framing; the rig draw order over the stands.",
    "Prompt: the plan is very thorough but its scope is far beyond one session; a smaller first milestone would help."] }
];
