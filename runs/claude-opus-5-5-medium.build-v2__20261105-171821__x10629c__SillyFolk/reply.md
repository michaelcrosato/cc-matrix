**Silly Folk is finished:** everything in PLAN.md that can be done on this computer is done, and all the hand-ins TASK.md asks for are in `work/`. It's an original life sim inspired by Animal Crossing: City Folk, built on the unmodified riftlight engine.

## Test results
These come from the delivered build, logged in `tests/final_run.log`. Section-by-section evidence is in `tests/PLAN_AUDIT.md`.
- **Full suite:** `node tests/run.mjs` passed 8/8 suites twice, with exit code 0.
- **Multiplayer:** Visit mode passed 42/42, the public STUN connection passed 20/20, and AI Hub passed 3/3. The Hub's `game.html` is byte-identical to the delivered HTML.
- **Hand-ins:** `exit-interview.json` parses.
- **Checked by eye:** all the model sheets, animation clips, seasons, night, the City, festivals, all 17 attract beats, the Mirror, credits and spring chains.
- **Roof fix:** the last code change fixed two-wedge roofs that formed a V instead of a ridge. I re-checked them on the sheets and in five in-game village views, with no page errors. No game code has changed since the final test run, so those results still stand.

## What's still open
- **Can't be done on this computer:** playing on a real controller, listening to the audio and music by ear (it was only measured with an analyser), and a Visit between two separate networks.
- **Unexplained early failure:** one early Visit test failed with `Cannot read properties of null (reading 'session')`, and I didn't keep that run's log. The same error appears on demand when a guest idles into attract mode, and I fixed two other ways the guest's first message could get lost. I can't prove which one caused that failure, though it hasn't appeared in the final runs.
- **Museum roof:** one village view shows a dark shape on the roof. It looks like a shadow, but I didn't investigate it.

## Source Information
| | |
|---|---|
| Date | 2026-11-05 17:18:21 |
| Source | Animal Crossing: City Folk |
| Plan | PLAN.md |
| Genre and Perspective | Life sim / social sim; isometric 3/4 orthographic diorama with 90-degree camera turns, dollhouse cutaway indoors |
| Tech | Riftlight Pixel Engine 0.46.0 (three.js r186 on WebGPU), plain JavaScript modules bundled with esbuild 0.28.2 into one HTML file; Kenney Furniture Kit 2.0 pack; AI Hub session client 1.4.0 |
| Art Direction | The engine's native 3D-as-pixel-art (default look, Sweetie 16 palette). New critters, buildings, nature and items written as model data; Kenney furniture recoloured; own bitmap font and icons |
| Animation | The engine's clip format: 45 clips on one shared 7-joint rig, compiled with compileClips and cross-faded on THREE.AnimationMixer, plus Squash and code-driven faces |
| Audio | All code, no audio files. Song sequencer music at 10% by default (24 hourly arrangements with rain and snow variants, venue, festival and record tunes), SoundDef effects and ambience, Animalese-style gibberish voices from formant syllables |
| Online | AI Hub shared-world round, The Bean Bazaar, 1-4 players. On its own: Visit mode over BroadcastChannel and serverless WebRTC invite codes, with a public STUN server for the internet |
| Testing | Headless only: node tests/run.mjs prints failures and a count. Node rule checks, a scripted playthrough, replay and input regression on Engine.headless, Playwright browser suite with stub pad, touch profiles and Web Audio analyser, AI Hub harness in all four scenarios, two-page Visit tests including invite codes and the public STUN server, model sheets. Screenshots for what a script cannot check |
| Research | Read the engine kit docs and the AI Hub session README. No other research |
| Environment | Claude Code CLI (headless); Linux |
| Model | Anthropic, claude-opus-5-5, reasoning effort medium |
| Usage | added on import |

## Testing Feedback
**How many issues did testing catch?**
About 40 real ones: 18 from the suites and rule checks (neighbours unable to path, neighbours walking on the pond, lost sub-frame key taps, a menu input lock that dropped presses on slow frames, bloom cleared before planting, home rooms not wired, touch notice and tap handling, replay start state, attract starting during a Visit, a Reply Slip with no public address, a guest hello never sent when the data channel opened early, model problems), the rest from looking at screenshots.

**How many would be considered critical issues / game breaking?**
4: an invalid wave name put NaN on the audio master and silenced everything; home interiors crashed when first entered; a ground plane hid all the water in the village; a wrong NavGrid origin left most neighbours unable to find a path, so they barely walked.

**What was the most helpful test you ran?**
The Web Audio analyser on the master bus. It reported NaN and exposed total silence that no logic test and no screenshot could show. The scripted playthrough came a close second: a late check that a neighbour actually walks to a concert exposed the broken pathfinding.

**What was the least helpful test you ran?**
The sheet warnings on sign lettering: over a hundred "rods under 0.06 m" notes about letters that read fine in the game.

## Engine Feedback
**What did you like most about the engine?**
Engine.headless: the whole game, UI included, runs in Node at thousands of frames a second, so a playthrough of the year takes seconds. Close behind: models as plain data with checkModel naming the exact part at fault.

**Did you get stuck or guess wrong?**
Yes. I guessed 'sawtooth' as a wave name when the engine calls it 'saw'; renderSound returned NaN without complaint. Also MODEL_LIBRARY.get throws rather than returning nothing, some of my ids clashed with the library's, and I missed that NavGrid.fromRows centres the grid on the world origin unless given an origin, so paths quietly came back null.

**What was the most important thing you had to build yourself?**
The UI layer: a bitmap font with lowercase, a screen stack, focus and hit areas, and prompts that follow the last device. After that, the generator-based script runner that all dialogue and set pieces run on.

**What was the hardest part about using the engine?**
Keeping one scene for town, City and thirty interiors: lights, the Mirror, RenderView, looks and music all had to be switched by hand when the player changes place, since loadGame would have split replays.

**What did you change in the engine, and why? (none if nothing)**
none

**If you could change one thing about the engine, what would it be?**
Make an unknown wave name a thrown error, or at least a checkable problem, in renderSound and audio.register. One typo silenced the whole game through the master bus.

## Prompt Feedback
**What did you like most about this prompt?**
The verified recipes: the correct browser flags, packaging the engine byte-for-byte in one HTML, the pause rule and the warning about noisy surfaces each saved real time.

**What was confusing?**
TASK.md lists browser flags that PLAN.md says do not work with this engine. The plan flags the correction, so it cost nothing, but one source would be better. How to write SOURCE in the file name (the colon, the spaces) is also left open.

**What was the hardest thing to do?**
Breadth. Every system had to ship and work together with the same voice: nine neighbours, eight venues, four festivals, three contests, a full year, two multiplayer modes, and about 850 lines of writing to keep funny.

**What would you change in this prompt?**
Reduce the floor counts for hand-authored content a little, or state which systems could be simplest. Add a one-line note that the engine has no sawtooth by that name, and a sample of the exit interview filled in.

## Files
Everything is in `work/`, and nothing has been committed:
- `SillyFolk-AnimalCrossingCityFolk-claude-opus-5-5-medium-20261105-171821.html` (the game)
- `SillyFolk-AnimalCrossingCityFolk-claude-opus-5-5-medium-20261105-171821/` (dev folder)
- `exit-interview.json`
- `PROGRESS.md`