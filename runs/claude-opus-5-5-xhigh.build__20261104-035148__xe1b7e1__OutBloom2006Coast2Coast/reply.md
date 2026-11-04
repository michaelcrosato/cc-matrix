I've built **OutBloom 2006: Coast 2 Coast**, the title PLAN.md gives. It is an arcade road racer across the island of Bellafiore: you start on the east coast at sunrise and race west, picking a fork after each stage, to one of five goals before sunset.

The full test command passes: **670 passed, 0 failed**. That covers the headless suites, the bundle opened from file:// (no errors, no network, the synth audibly playing in a race), the official AI Hub harness (2 players; 4 players with latency, jitter and loss; the host leaving), touch emulation and 17 screenshots.

**Files** (in this folder's root):
- `OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-xhigh-20261104-035148.html`: the single-file game (1.8 MB, needs no network).
- `exit-interview.json`: parses, every value filled.
- The dev folder of the same name holds the source (`src/`), the changed engine and its change log (`engine/CHANGES.md`), and the tests (`node tests/run.mjs`).

**What's in it:**
- **Modes:** Arcade Run (15 stages, 16 routes, 5 goals); Love in Bloom (3 passengers, 14 request types, grade AAA to E, each ending in three moods); the Coast 2 Coast Tour (14 missions on a map, briefs, debriefs, the Garage Garden for unlocks, a finale with credits); Time Trial with ghosts, splits and medals; two-player split-screen Versus with a CPU option; AI Hub sessions for 1–4 players.
- **Road:** I rewrote the engine's road module so forks visibly split into two branches and the switch to the next stage has no jump.
- **Look:** cars are rendered from small 3D models into pixel sprites, with the driver and passenger seated in them; all scenery and skies are drawn in code.
- **Sound:** all in code: 7 radio songs, 4 themes, 11 jingles, an engine note per car, ambience, and babble voices.
- **Platform features:** attract mode after 10 s idle (any key or button exits back to where you were); Dev Mode in the pause menu with live sliders and reset; PlayStation button symbols by default with an Xbox option; prompts follow the device used last; a "Controller or keyboard required" notice on touch-only devices.

**Where I departed from the plan:**
- **Clock:** the plan's start time and checkpoint bonuses made a full run impossible. They are now 84 s at the start and 66/65/65/64 s per checkpoint, and the AI driver now finishes the all-left route with about 20 s spare and the all-right one with 6 s.
- **Mission B1:** its 52-second clock was unwinnable, so it starts at 72.
- **Traffic:** it now scales with stage difficulty, because the "gentle" left routes were slower than the right ones.
- **Tour map:** it has 14 postcards on one screen, which breaks the plan's seven-items-per-screen rule.
- **Audio check:** the plan's offline audio analysis isn't built; a browser check confirms the synth outputs sound instead.

**Not verified:** the music and sound by ear (I can't listen), and a physical gamepad (pad input was tested through the engine's simulated input only).

## Source Information
- **Date:** 2026-11-04 03:51:48
- **Source:** OutRun 2006: Coast 2 Coast (SEGA / Sumo Digital, 2006)
- **Plan:** PLAN.md
- **Genre and Perspective:**
  - Genre: arcade road racing (an OutRun-style checkpoint racer with branching routes), plus the Love in Bloom passenger-request layer and the Coast 2 Coast Tour career.
  - Perspective: a third-person chase camera on a pseudo-3D road, with high and bumper cameras; side-view scenes for the endings, the garage and the Tour story; an overhead map for the career.
- **Tech:** HTML5 canvas and plain JavaScript on my-3D2dge v0.85.2 (handoff package, commit 4390a98). Engine changes: the road module extended for forks, analog triggers, a hub button guard, PlayStation symbols by default, synth extensions and TV-sized menus. AI Hub session client 1.4.0. Playwright 1.63.0 and Node 24 for tests. No other libraries.
- **Art Direction:** the engine's native pixel art at 480×270, expanding to fill the screen. Cars and traffic are rendered from low-poly models into shaded, outlined sprites; all props, landmarks and skies are painted in code; a dithered bloom, lens flare and time-of-day colouring from dawn to night.
- **Animation:** the engine's Humanoid rigs (poses, expressions, pointing, breathing, hair) for the driver, passengers, Bruno and locals; 33 steering and 32 spin frames per car; suspension, jumps and drift angle; animated props; particles; animated request objects.
- **Audio:** all in code on the extended engine synth, with instrument presets and a delay and reverb bus. 7 radio songs and 4 themes composed as chord progressions and patterns, 11 jingles, an engine note per car, tyres, wind, ambience per biome. Animalese/Simlish-style babble voices with moods.
- **Online:** AI Hub Session Protocol v1 in ghost mode (1–4 players: own card, synced start, ghost cars, progress, results); local split-screen Versus for two; no other network.
- **Testing:** one command, `node tests/run.mjs`:
  - 12 headless suites (about 640 checks), including an AI playthrough of all 16 routes, all 14 request types, all 14 missions and a fake AI Hub.
  - 4 browser suites: the bundle with an audio check, the official AI Hub harness, touch emulation, 17 screenshots.
  - No subagents or workflows.
- **Research:** the engine handoff docs, the road module and road kit; the AI Hub README, client and ghost example; the source facts from the plan's research notes. No other web research.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** cost and tokens unknown (no estimate available); session time about 1 h 55 min.

## Testing Feedback
1. **How many issues did testing catch?** About 33. Scripted tests and AI playthroughs found 21:
   - checkpoints never firing on the last row of stages;
   - the first car home stopping everyone else from finishing;
   - unwinnable clocks;
   - routes balanced the wrong way round;
   - ribbon gaps narrower than a car;
   - partial throttle never limiting speed;
   - screens that only set up their buttons while drawing.

   Screenshots found 12, for example outlines turning car sprites into black boxes, hidden or oversized occupants, mirrored billboard text, and an endless cliff wall on one fork branch.
2. **How many were critical / game-breaking?** About 6:
   - the last-row checkpoint (no run could reach a goal in time);
   - the first finisher freezing the others (Versus and rival missions unwinnable);
   - the B1 clock;
   - the opening clock balance;
   - the black-box car sprites;
   - the attract demo never reaching a fork.
3. **Most helpful test:** the all-16-routes AI playthrough. It found the checkpoint bug, the balance problems and several traffic and AI issues at once.
4. **Least helpful test:** ad-hoc single-stage time traces printed to the console; the route playthrough and screenshots covered the same ground better.

## Engine Feedback
1. **Liked most:** the headless loop (exact fixed steps, scripted input) made a deterministic racer testable in seconds, and the Humanoid rigs gave the cast real poses and faces almost for free.
2. **Stuck or guessed wrong:** yes.
   - The road module stretched the picture sideways (separate horizontal and vertical scales), so I wrote a square-pixel projection.
   - Character rigs drew bigger than I expected.
   - The font lacks some symbols (triangle arrows, the middle dot, the PlayStation shapes), so text needed substitutes.
3. **Most important thing built myself:** the fork renderer (a road that splits into two branches, and a seamless switch to the next stage), then the car sprite renderer.
4. **Hardest part:** reading internals the docs only summarise (the audio scheduler, the menu CSS, gamepad polling) to extend them safely inside one 1.2 MB file.
5. **What I changed, and why:**
   - Replaced the road module so it can draw forks, different ground on each side, rails, cliffs, walls and building fronts beside the road, arches over it, and a square-pixel camera.
   - Added progressive (analog) trigger input.
   - In AI Hub sessions, Options is ignored while Create is held, as the protocol requires.
   - Made PlayStation the default button symbols, with Xbox as the option.
   - Added synth instruments, chords, accents and slides, more drums, effects sends, a separate voice bus, continuous sound loops and reverb.
   - Sized the standard menus for a TV.

   All are logged in `engine/CHANGES.md`.
6. **One change I'd make:** build in a road module with junctions, and a documented audio extension API (instruments and continuous loops).

## Prompt Feedback
1. **Liked most:** it is specific about the experience (10-foot controller-first UI, attract mode, dev sliders, hub integration) while leaving the creative choices open; the plan made the scope concrete.
2. **Confusing:** the plan and TASK.md disagree in small ways (the dev-folder name, numbers that don't balance as written), and the seven-focusable-items rule sits awkwardly with a 14-postcard map.
3. **Hardest thing:** fitting everything the plan asks for (15 stages, 14 request types, 14 missions, 11 songs, 15 endings, a hub card, Versus) into one coherent, polished demo in a single session.
4. **What I'd change:** have the plan mark priorities (must, should, nice) so a builder can order the polish, and state balance targets as goals to tune toward rather than fixed numbers.