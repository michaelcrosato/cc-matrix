The game is built as one HTML file, with the exit interview beside it. The headless suite passes 10 of 10 runs, the AI Hub harness passes with 2 and with 4 players, and the title screen renders on the phone, tablet and desktop sizes in WebKit.

**Title:** WireOnTheCorner, picked by an RNG from 57 candidates.

**Files** (in this folder's root):
- `WireOnTheCorner-TheWire-claude-haiku-5-5-medium-20261102-185845.html` (1.3 MB, one file, no external dependencies)
- `exit-interview.json` (parses; every field filled)
- `WireOnTheCorner-TheWire-claude-haiku-5-5-medium-20261102-185845/` (dev files: `src/`, `build/`, `test/`, the engine and hub copies)

**What I built:** a stealth and investigation game. You have one eight-minute shift on Fayette & Monroe. You pick up evidence, tune the pole for a wire tap with a timing mini-game, talk to the people on the corner (choices change heat and time), and avoid the lookouts' sight cones. Bank four of the five pieces at the Lieutenant's office to win. Three burns or running out the clock ends the shift. Threequarter view, with topdown and iso switchable.

Also included:
- **Attract mode:** 10 idle seconds on the title starts an AI demo that cheats, cannot burn, and plays a shift through. Any input exits it.
- **Controls and settings:** invert left-right and invert up-down toggles, PlayStation or Xbox prompts, mouse click-to-walk, and no touch controls. Touch-only devices show "Controller or keyboard required" and the START item is disabled.
- **AI Hub:** parallel mode, 1–4 players, with `session.js` included unmodified as the first script. Each copy reports its score.
- **About screen:** the Source Information and the three feedback sections.

**Choices I made:** the genre (the brief left it open); the parallel hub mode, since each player's copy is independent; and a shift that runs one game minute per real second.

**Not verified:**
- No real gamepad was available, so PlayStation and Xbox prompts and the axis inversion are only checked through the settings flags and the keyboard path.
- No real iOS Safari; WebKit with iPhone profiles is the closest check.
- The viewport check captured the title screen only, not the play screen, at each size.

**Test history:** a headless lookout-sight test failed 1 run in 8 because it was reading a leftover demo run during a scene fade. I fixed the test to wait for the new shift's state; 10 of 10 runs pass after that.

**Source Information**
- Date: 2026-11-02 18:58
- Source: The Wire (2002-2008)
- Genre and Perspective: stealth and investigation with a shift clock; threequarter, switchable to topdown and iso
- Tech: my-3D2dge engine v0.85.1 (full build, bundled); AI Hub Session Protocol v1 client 1.3.0 (session.js, unmodified)
- Art Direction: the engine's pixel style with night lighting
- Animation: the engine's Humanoid rigs and poses
- Audio: music, sound effects and a gruff synth-blip voice, all written in code
- Online: AI Hub parallel round, 1–4 players, score reported
- Testing: a 36-check headless suite including a full scripted playthrough; a Chromium run of the built file; the AI Hub harness with 2 and 4 players; a WebKit viewport matrix
- Research: none
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-haiku-5-5, reasoning effort medium
- Usage: unknown

**Testing Feedback**
- Issues caught: eight. Two were critical: the hero's rig was never created, so every shift crashed on its first step; and the hub `ready()` call was missing, so no round could start. The other six were layout and flow problems: a title overlap, tagline overflow, an unsupported glyph, misaligned results values, an About footer overlap, and a scene-switch race in attract.
- Critical or game-breaking: two (the two above).
- Most helpful test: the scripted full playthrough, which walks the real systems in order and reads the outcome back.
- Least helpful test: the 10-second attract idle check, which mostly confirmed a timer. The viewport screenshots only capture the title, so they were weaker than per-scene captures would have been.

**Engine Feedback**
- Liked most: the threequarter TileMap, the Humanoid rigs, and the Dialog, Menu and Shell screens gave a readable game quickly. The standard pause, settings and controls came for free.
- Got stuck or guessed wrong: a scene switch changes `sceneName` before the new scene's `enter()` runs, so old state can briefly be live. The font has no middle dot. A Dialog choice can only be answered through input, so I added a handle to answer it from code.
- Most important thing I built myself: the shift state machine (clock, heat and burns, the pole mini-game, conversation outcomes, the attract AI, and hub reporting).
- Hardest part: working out the return shapes of calls (`mouseGround`, `FlowField.dir`) without reading the 1.2 MB source, and the scene transition timing.
- One thing to remove or overhaul: the scene switch. The name should change only once the new scene is entered.
- One thing to change: let a Dialog's choice be answered by code, so scripts and tools can drive conversations.

**Prompt Feedback**
- Liked most: the explicit checklists (controls, invert toggles, touch-only notice, hub tags, About content). They made the scope concrete.
- Confusing: the About requirement asks for feedback sections that can only be written after testing, and the brief doesn't say whether the chat reply or the exit interview holds them. The genre was also left open, so the choice of stealth was mine.
- Hardest: keeping every listed feature complete at once (attract, hub, glyphs, touch notice, About) in one session.
- One test I wish I could run: a real gamepad check, from the title through a full round, since I had no controller.