I built the three pieces I had cut, so nothing from the plan is left out now. The full test command passes: 1,073 checks, 0 failures, including the scripted playthrough of the whole Tour and all four AI Hub harness scenarios.

**What was added**
- **Shoot-around bench:** a dev tool reachable from Dev Mode → Scenes or the `#shootaround` link. A shooter fires seeded shots from all over the half court. The table compares what the shot model decided with what the ball actually did. You can adjust the rim and backboard bounce live with the stick or arrow keys. In the screenshot run, every shot so far landed the way it was decided.
- **Custom court set pieces, drawn in code:**
  - Skybox: chain-link fence, water tower, boombox, AC units.
  - Pier: beach umbrellas, lifeguard tower, surfboards, a turning Ferris wheel.
  - Scrapyard: junk cars, tire stacks, a crane with a swinging magnet.
  - Caldera: tiki totems and a glowing crater throwing embers.
  - Blam Dome: pyro cannons that fire on big plays, TV cameras, the Golden Blamboozle trophy.
- **The Dome's upper deck:** a second ring of fans that react to plays, with sweeping light beams.

Most set pieces sit on the court edges and behind the stands, so they come into view as the camera pans toward each basket. The upper deck sits behind the score bar at the default framing.

The game is `Basketblam-Basketball-claude-opus-5-5-medium-20261104-061027.html` in this folder's root. `exit-interview.json` was regenerated and parses; its only empty value is `aiHub.series`, which TASK.md allows. A search of the source for TODO, FIXME, "placeholder" and "stub" finds nothing.

## Source Information
- **Date:** 2026-11-04 06:10:27
- **Source:** Basketball, in the over-the-top arcade style (genre inspiration; an original game with original teams, courts and characters)
- **Plan:** PLAN.md
- **Genre and Perspective:** Arcade sports, 2-on-2 basketball with a short story ladder (the Blam Tour). Side-on broadcast camera: orthographic, pitch 30°, panning with the ball, with a dunk cam; optional High (three-quarter) camera.
- **Tech:** my-3D2dge v0.85.2 (modified), AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio. Tests run on Node 24 (headless, in `node:vm`) and Playwright 1.63 with Chromium; Python http.server serves the hub harness.
- **Art Direction:** The engine's native HD pixel style (PS1-era 320×240, expanded to fill the screen), pushed toward a 90s arcade broadcast: players in jerseys, shorts and socks, hand-painted court floors, a backboard turned toward the camera, a spring net, crowds and an upper deck, the court set pieces, backdrops, lighting, comic banners.
- **Animation:** The engine's procedural Humanoid rigs, plus a new pose layer over `solvePose`. It drives the hands with IK for the dribble (synced to the ball), jump shots, 12 dunk routines, blocks, steals, shoves, spin moves, hanging on the rim, celebrations and taunts.
- **Audio:** 12 songs and 7 stings with dynamic layers, about 50 sound effects made in code, an Animalese/Simlish-style gibberish voice synth with 20+ voice profiles, and a pink-noise crowd. No audio files.
- **Online:** AI Hub Session Protocol v1, shared world, 1–4 players. The game shows its own card; the host runs the simulation; clients send input 15 times a second and draw the host's snapshots, smoothed, with their own player predicted. Players who leave turn into CPU players; time-up and server mode are handled.
- **Testing:** Headless scripts using `game.advance` and `game.debug`, behind one command that prints only failures and a one-line count, including a scripted playthrough of the whole Tour. Also Playwright screenshots and the AI Hub harness scenarios.
- **Research:** None beyond the engine handoff docs, the sports kit and the AI Hub protocol README.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown (no usage figures are available inside the session)

## Testing Feedback
1. **Issues caught:** about 18 in the game itself, plus about 10 mistakes in the tests, fixed along the way. Game examples:
   - A shot released at the arena wall started outside the wall and lost half its speed.
   - A pass receiver wandered off instead of meeting the ball.
   - Rebounds after a rim touch weren't counted.
   - Scene changes stalled while time was frozen in dev mode.
   - Camp handed the ball to the practice opponents after a basket.
   - Dunks made up 77% of baskets until I rebalanced them.
   - Several layout overlaps on screens.
2. **Critical:** 3.
   - The canvas never filled the window.
   - The custom broadcast camera wasn't registered, so the game fell back to another view.
   - Freezing time in dev mode would have stalled every scene change.
3. **Most helpful:** the scripted playthrough of the whole Tour. A bot plays the human's seat through the real buttons and menus, loses a game on purpose and replays it, and reaches the ending, credits, unlocks and the Hall of Blam. The first CPU-vs-CPU smoke match found almost as many bugs.
4. **Least helpful:** re-taking screenshots after small layout tweaks. Each cost far more time than a script and found nothing a single image wouldn't.

## Engine Feedback
1. **Liked most:** headless determinism (`game.advance` plus `game.debug`), and HD Humanoid rigs that look good with no art files.
2. **Stuck or guessed wrong:** a custom camera view (`E.View`) has to be added to `E.VIEWS` before `setView` can find it, and the page has to size the canvas with CSS.
3. **Built myself:** the basketball pose layer (IK hands, a dribble synced to the ball, dunk keyframes) on top of `solvePose`.
4. **Hardest part:** getting the hoop's layers (glass, rim halves, net halves, ball) to draw in the right order in a side-on view.
5. **Changed in the engine:**
   - Basketball shorts and socks on the Humanoid.
   - Afro, flattop and mohawk hairstyles.
   - The dialog's voice can be a function called for each letter (for the gibberish voices).
   - Public audio buses, so my voices and crowd follow the volume settings.
6. **One change I'd make:** built-in support for posing a rig's hands with IK, so games don't have to wrap `solvePose`.

## Prompt Feedback
1. **Liked most:** the complete, testable definition of done (dev mode, attract mode, hub, 10-foot UI, the report) and the freedom over genre, camera and stack. The plan made every decision concrete.
2. **Confusing:** the plan was written for another model and timestamp, so its file names had to be remapped to this TASK.md. The plan is also far larger than one medium-effort session, so it was unclear how much of it was expected.
3. **Hardest:** fitting the full feature set (story ladder, ten tutorial lessons, a five-segment attract-mode script, a dev panel, shared-world netcode) into one session while keeping it tested.
4. **Would change:** say how much of a large plan is in scope at a given effort level, and give the plan file names that match the TASK.md it's used with.