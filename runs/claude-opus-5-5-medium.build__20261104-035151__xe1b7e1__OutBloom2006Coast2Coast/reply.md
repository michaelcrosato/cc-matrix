I've built **OutBloom 2006: Coast 2 Coast**, an OutRun-style road racer. The single-file game is in this folder's root as `OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-medium-20261104-035151.html`, with `exit-interview.json` beside it. The JSON parses and every field is filled; Usage is "unknown". The final test run passed: 575 checks, 0 failures. That includes a bot driving all 16 routes to all 5 goals, and the official AI Hub harness passing in all three scenarios (2 players; 4 players with latency and packet loss; host leaving). In the browser the bundle runs from `file://` with no errors and makes no network requests.

**What's in the game:**
- **Driving:** you choose left or right at every fork. There are 15 stages and 5 goals, each goal with 3 endings depending on how the run went. Daylight counts down and checkpoints give time back. You can drift (brake tap, a quick down-up shift, or the drift button), slipstream for a slingshot, and score near misses.
- **Modes:**
  - Arcade.
  - Love in Bloom, where your passenger makes 14 kinds of requests and grades you from E to AAA.
  - The Coast 2 Coast Tour: 14 missions with rivals and a finale.
  - The Garage Garden, where you spend seeds to unlock cars, songs, paints, outfits and mirrored roads.
  - Time Trial against your own ghost.
  - Two-player split-screen Versus, or one player against the CPU.
  - AI Hub online races for 1–4 players, where the others show as ghost cars.
- **Dev Mode:** opened from the pause menu. It has live sliders for 32 gameplay values, each with its own reset plus a reset-all. It also has cheats, warps, a jukebox and save tools.
- **Attract mode** starts after 10 seconds idle; any key, pad or mouse input ends it.
- **Phones** see "Controller or keyboard required" and a Settings button, and the attract mode still runs.
- **Controls:** prompts follow the last device used. The default is PlayStation glyphs, with an Xbox option in Settings; keyboard and mouse get their own key and mouse-button prompts.
- **Audio:** all music, sound effects and the Animalese-style voices are generated in code.

**Where I departed from the plan** (the game still covers everything TASK.md asks for):
- The plan wanted forked roads built into the engine. I wrote my own forking road renderer in the game instead.
- Cars are drawn as shaded 3D box models, not pre-rendered shapes.
- How to Play is text with button prompts, not live mini-demos.
- The "Memory Lane" mission became "Bouquet Toss".
- Time Trial par times come from a formula on stage length, not from a reference bot run.
- The time left at the end varies widely by route: the bot finishes with 1–47 seconds to spare. The all-left route is more generous than the plan intended; the clock is adjustable in Dev Mode.

I made six changes to the engine; they're listed in `engine/CHANGES.md` and under Engine Feedback below.

## Source Information
- **Date:** 2026-11-04 03:51:51
- **Source:** OutRun 2006: Coast 2 Coast (SEGA / Sumo Digital, 2006)
- **Plan:** PLAN.md
- **Genre and Perspective:**
  - Genre: arcade road racing (a checkpoint racer with branching routes), plus the passenger-request layer and a mission career.
  - Perspective: third-person chase camera on a pseudo-3D road that forks (chase, high and bumper cameras), side-view scenes for endings, and an overhead island map for the career.
- **Tech:** the my-3D2dge v0.85.2 handoff engine with six changes of mine; plain JavaScript with Canvas 2D and Web Audio; the AI Hub session client 1.4.0, unmodified; a Node build script that makes the single file; Playwright 1.63.0 for browser checks.
- **Art Direction:** the engine's own pixel-art style at 480×270, expanding to fill any screen shape.
  - The world: 13 biome kits and about 60 roadside pieces and landmarks drawn in code.
  - Lighting: bloom on bright pixels, a lens flare, and night lighting with glowing lamps and neon.
- **Animation:** the engine's character rigs for the cast (poses, expressions, portraits). Everything else is animated in code:
  - cars (steering, drifts, full spins, suspension, lights), with hair and scarves streaming at speed;
  - traffic (blinkers, lane changes);
  - request objects, moving scenery and particles.
- **Audio:** 11 original songs and 11 jingles. About 45 sound effects, plus a continuous engine note for each car, tyre squeal, wind and ambience. Voices are Animalese-style babble that changes with mood.
- **Online:** AI Hub Session Protocol v1 in ghost mode for 1–4 players, with the game's own ready screen and start sync. It sends your car 10 times a second, reports progress once a second, and reports a time at the finish (or a score if the hub calls time). Local two-player split-screen Versus as well.
- **Testing:** headless test suites behind one command, `node tests/run.mjs`, which prints only failures and a one-line count. They include bot playthroughs of all 16 routes. Browser checks: the bundle from `file://`, a phone emulation, the AI Hub harness served on 127.0.0.1, and screenshots.
- **Research:** none beyond the provided material (the engine docs, the AI Hub README and harness, and the plan's research notes).
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback
1. **How many issues did testing catch?** About 25 real ones, plus a few mistakes in my own test setups.
   - Scripts caught:
     - the bot's drift steering, traffic rear-ending and clock balance;
     - a drift that counter-steering couldn't end;
     - two crashes in rival missions;
     - request objects too close together to reach;
     - a slider off by floating-point rounding;
     - a missing check on incoming hub messages.
   - Screenshots caught:
     - letters the pixel font doesn't have;
     - the windscreen drawn over the people;
     - night lighting far too bright;
     - banners too wide;
     - cars filling the split screen;
     - ending scenery hiding the characters;
     - crash cushions in the middle of the road.
2. **How many were critical?** Three. Every rival mission crashed with an error at the first fork or the finish, and every song lost its melody because the bar markers in my melodies were read as invalid notes.
3. **Most helpful test:** the bot driving all 16 routes to all 5 goals; the official AI Hub harness was a close second.
4. **Least helpful test:** the engine checker's sweep through camera views that don't apply to a road racer, and its look notes taken from a screen mid-transition.

## Engine Feedback
1. **What I liked most:** headless play in exact fixed steps (`game.advance` with scripted input) ran the whole game in Node: menus, races, attract mode and hub sessions. The free pause menu, settings, key rebinding and character rigs saved a great deal of work.
2. **Did I get stuck or guess wrong?** Yes.
   - The road module draws only one road, so forks needed my own renderer.
   - Keyboard drop-in for player 2 needs a real canvas, so it can't be tested headless.
   - The pixel font has no ◀ ▶ · … ✓; I only found out from question marks in screenshots.
3. **Most important thing I built myself:** the forking road renderer, which switches seamlessly from one stage to the next, then the car renderer.
4. **Hardest part:** fitting a custom road into the engine's drawing model (overlays, split-screen viewports, backgrounds) while keeping it pixel-crisp, and tuning the driving feel and audio from numbers and screenshots alone.
5. **What I changed and why:**
   - analog trigger values, so gas and brake on R2/L2 are progressive;
   - Options ignored while Create is held in a hub session, as the hub requires;
   - PlayStation glyphs by default, with Xbox as the setting;
   - chords, accents, plucked notes, detune, filtering and Latin percussion in the music synth;
   - continuous sounds, so a car can have an engine note;
   - a theme, larger text and a Help page for the engine's standard menus, so they read on a TV.
6. **One change I'd make:** built-in forks in the road module (junctions with two continuations, and different ground and roadside on each side).

## Prompt Feedback
1. **What I liked most:** the definition of done is concrete and checkable, and the plan detailed.
2. **What was confusing:** the plan's scope (15 stages, 14 missions, 45 ending lines, 11 songs) against a medium-effort run. Its file names carried another run's settings. "The mouse clicks things in the world" is hard to apply to a racer.
3. **Hardest thing to do:** producing that much content and tuning the feel without hearing the sound or holding a controller.
4. **What I'd change:** give a priority order for when time runs short, name the browser and hardware the game is judged on, and allow some way to check audio, even an automated loudness check.