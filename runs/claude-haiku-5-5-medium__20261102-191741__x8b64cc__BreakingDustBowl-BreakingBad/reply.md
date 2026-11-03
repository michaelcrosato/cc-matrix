The game is built as one file, `BreakingDustBowl-BreakingBad-claude-haiku-5-5-medium-20261102-191741.html`, with `exit-interview.json` beside it in the work folder. Dev files are in the `BreakingDustBowl-…-191741/` subfolder. Headless tests pass, and the built page runs in Chromium through the attract sequence with no errors.

**What it is:** a top-down action adventure (three-quarter view, switchable to top-down and isometric with V) in a desert. It has three chapters: a garage cook where you press in a timed band three times per batch, a desert run past Vail's men with sight cones, and a telegraphed showdown with Vail. The title is "Breaking Dust Bowl." I drew it with `random.SystemRandom` from a 50-title list. The first printed draw was the pick, and I used that one.

**Covered from TASK.md:** attract mode after 10 s idle (any button exits); parallel AI Hub round with the hub meta tags and `connect/ready/progress/result`; gamepad left/right and up/down inversion settings; PlayStation/Xbox symbol setting; mouse aim and click; a touch-only "Controller or keyboard required" message with attract still running; an About screen that holds the source and feedback sections; saves through the engine's pause menu.

**Not verified:** a real gamepad, the real AI Hub harness (the round test uses my own stub), real iOS Safari (WebKit emulation only), and Android. The cook is an abstract minigame, not real chemistry. This is a vertical slice, not a full game.

**Choices I made:** Adventure as the genre; the engine's ADVENTURE kit as the base; the hub's parallel mode with cash as the score; the `Dialog` voice as a synthesized blip per letter, since no recorded speech is used.

**Usage:** unknown. I have no reliable cost or token figures.

---

## Source Information
- Date: 2026-11-02 19:35
- Source: Breaking Bad (2008-2013)
- Genre and Perspective: Adventure; three-quarter top-down (default), top-down and isometric via V
- Tech: my-3D2dge v0.85.1 (2D retro engine, single file, no libraries); HTML canvas; AI Hub session.js 1.3.0
- Art Direction: engine-native HD pixel look, 320x240 base, drawn characters, props, lights, desert and garage palettes
- Animation: engine rigs (Humanoid) with E.MOVES attacks and telegraphed wind-ups; procedural
- Audio: chip-synth music and sound effects from the engine; dialogue voice is a synthesized gibberish blip per letter, no recorded speech
- Online: AI Hub session, parallel mode, 1–4 players, one desert round reporting a cash score
- Testing: headless Node tests (the game, a stubbed hub round); Playwright screenshots of the built file in Chromium; WebKit phone check on iPhone SE and four more devices
- Research: read the my-3D2dge handoff (API card, adventure kit, template) and the AI Hub session protocol on GitHub
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-haiku-5-5, reasoning effort medium
- Usage: unknown

## Testing Feedback
- **Issues caught:** six game issues. The desert never spawned its batches; the desert AI walked into rocks; the showdown crashed for lack of a flow field; the title menu covered the lineup; the lineup ran off-screen after that fix; the touch-only message never showed. Three test-harness mistakes were mine and aren't counted.
- **Critical:** two. The batches never spawning (the desert couldn't be played) and the showdown crash (it stopped the attract run).
- **Most helpful test:** the headless attract run through the lab, desert and showdown with the error log open. It caught the spawn bug, the stuck AI and the crash.
- **Least helpful test:** the hub stub test. It checks calls I wrote against my own stub, not the real hub.

## Engine Feedback
- **Liked most:** the rigs and attack system. Characters wind up, strike and settle on their own, and the title looked right on the first render.
- **Stuck or guessed wrong:** `TileMap.center()` returns `[x, y]` while `find()` and `findAll()` return objects. I assumed `E.angleDiff` exists; it doesn't. `input.tap()` drops a second press within two frames.
- **Built myself:** the desert map generator, the cook minigame, the patrol and sight-cone AI, the boss telegraph and phases, and the hub round glue.
- **Hardest part:** holding the many small API shapes in mind. The API card is about 67 KB and I could only read it in pieces.
- **Overhaul:** make the spatial helpers return one shape everywhere, `{x, y}`.
- **Change one thing:** ship a smaller engine bundle for simple games. The 1.2 MB engine makes the page about 1.3 MB.

## Prompt Feedback
- **Liked most:** the explicit done-conditions, the list of required screens, and the exit-interview shape. They made the finish line clear.
- **Confusing:** "subfolder here" and "bundle into root" use "here" and "root" for different places. "Usage only if estimates are available" sits next to "answer every field." Silently brainstorming 50 titles while also needing a real RNG pick was hard to square.
- **Hardest:** fitting every listed feature (attract, hub round, gamepad inversion, Xbox symbols, touch-only, about and credits) into one session on a large engine.
- **Test I'd want:** the real hub harness with two browser tabs in parallel mode, plus a simulated Gamepad API to check the inversion settings.