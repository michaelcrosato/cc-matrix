The game is built and bundled, but I did not test the controller path, which is the main way this game is meant to be played.

**Deliverables** (in this folder's root):
- `MadMasters-MadMen-claude-haiku-5-5-medium-20261102-192041.html` (1.28 MB, engine and hub client inlined)
- `exit-interview.json` (parses; every field filled)
- Dev files: `MadMasters-MadMen-claude-haiku-5-5-medium-20261102-192041/` (`src/game.js`, `vendor/`, `build.mjs`)

**Choices I made:**
- Title: "Mad Masters", picked from 50 candidates with `crypto.randomInt`.
- Genre: Life Sim with dialogue and a timing pitch, in the engine's threequarter view. Topdown and iso can be cycled with M or Tab.
- Loop: see Hollis for the brief, get insights from Ruth, Teddy and Maren, drink or smoke at the bar, then pitch the Wren in the conference room with a timed reel.
- Multiplayer: AI Hub parallel mode through `session.js`. It runs standalone when no hub is present.
- Settings: invert horizontal, invert vertical, Xbox symbols, and idle demo on or off.
- Touch-only devices get "Controller or keyboard required" and can still run attract mode.

**What I verified:**
- Browser flow: brief, insights, pitch, end screen, and return to title.
- Attract: after 10 idle seconds the AI plays the whole day and loops; any input exits.
- Inversion: with it on, right moves left, and it is correct with it off.
- Touch-only: Play is blocked and the message shows.
- Credits: wrapped and scrollable.
- Layout: WebKit viewport check on 8 phone and tablet sizes, clean with no overflow.
- AI Hub conformance harness with 2 players: all checks pass.

**Not verified:** a real gamepad (so the PlayStation and Xbox symbol switch is unseen), mouse, real iOS Safari, and the 4-player hub run.

Two bugs I hit during testing, both fixed: an earlier hub run was pointed at another agent's server on port 8765, so I discarded it and used a private port. I did not touch that server.

## Source Information
- Date: 2026-11-02 19:20
- Source: Mad Men (2007-2015)
- Genre and Perspective: Life Sim with dialogue and a timing pitch; threequarter, with topdown and iso selectable
- Tech: my-3D2dge v0.85.1 (inlined, MIT), AI Hub session.js 1.3.0, vanilla JavaScript, WebAudio
- Art Direction: engine-native pixel art, 3D rigs drawn in 2D, 1960s palette
- Animation: engine rig poses, moves and the Mover controller
- Audio: code-written lounge and tension music, synth sound effects, Animalese-style chirps for voices
- Online: AI Hub parallel mode, 1–4 players
- Testing: headless browser checks (Playwright Chromium), AI Hub conformance harness with 2 players, WebKit viewport matrix on phone and tablet sizes
- Research: none
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-haiku-5-5, reasoning effort medium
- Usage: cost unknown, tokens unknown, session time about 16 min

## Testing Feedback
- Issues caught: 10.
- Critical or game-breaking: 2. The attract demo stalled at the desks and at the pitch, and the game did not report hub progress, so the hub harness failed. Both are fixed.
- Most helpful test: the browser run that reads game state after each step, plus the AI Hub harness.
- Least helpful test: the random reel presses, which only confirmed the scoring path, not the timing.

## Engine Feedback
- Liked most: the standard pause, settings, controls, button labels and full screen, plus live portraits in dialogue.
- Stuck or guessed wrong: prop arguments were in the wrong order, scenes needed their input preset, FlowField ignores `map.solid` furniture, and the font lacks the middle dot.
- Most important thing I built myself: the pitch reel, dialogue state, the attract AI, and the hub progress and result.
- Hardest part: matching movement input to the view, routing AI around furniture, and carrying flags across scene changes.
- Remove or overhaul: FlowField should share the solids grid with the map, so AI routes around furniture without a manual block call.
- Change one thing: explicit scene-entry data, and unknown props or actions should fail the build rather than only warn.

## Prompt Feedback
- Liked most: the exact exit-interview shape and the hub tags.
- Confusing: the folder name pattern and the template name differ slightly, and the usage line asks for estimates I did not have.
- Hardest: fitting attract, hub, button symbols, inversion and touch-only into one file under a 1.2 MB engine, and verifying the attract loop.
- One test I would add: a headless run with a fake gamepad, to check the controller path and the symbol switch, which I could not test here.