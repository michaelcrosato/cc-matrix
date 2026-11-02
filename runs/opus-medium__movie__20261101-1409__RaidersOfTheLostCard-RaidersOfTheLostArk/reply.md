**Raiders of the Lost Card** is built. It's a pulp side-scrolling action game and an original spiritual successor to *Raiders of the Lost Ark*, with its own characters, story, levels and music.

Deliverable: `RaidersOfTheLostCard-RaidersOfTheLostArk-claude-opus-5-5-medium-20261101-1409.html` (1.4 MB, everything inlined, no network). Dev files are in the matching subfolder: modules in `src/`, plus `tools/build.py`, a headless test, a screenshot tool and the AI Hub harness runner.

**What's in it:**
- **Three chapters:**
  - **The temple:** dart plates, spikes, a ledge climb, a crawl tunnel, a crumbling bridge and whip swings, then a timed idol swap and the boulder chase.
  - **Cairo:** bazaar thugs, a showboating swordsman (shooting him ends it at once), rooftops, then the dark Well of snakes. A torch scares the snakes off, and lighting three braziers opens the vault.
  - **The airstrip and altar:** a brute boss you can knock into a propeller, cliffs in the rain, and a finale where you hold ↓ to shut your eyes through five flares.
- **Moves:** run, jump, crouch and crawl, ledge grab, invincible roll, whip (hits things, breaks pots, swings from hooks), and a six-shot revolver with reloads.
- **Around the levels:** cut scenes with portraits, lives and checkpoints, three hidden cards, saved progress, chapter select, a 4-minute score attack, and a 2.5D view toggle.
- **Attract mode:** after 10 seconds idle on the title, a cheating bot plays six moments from across the game. Any input returns to the title.
- **Controls:** controller first (Cross jump, Square whip, R1/R2 shoot, Circle roll, Triangle use, L1 view, Options menu). The keyboard maps onto the same actions. Settings include invert-stick horizontal and vertical toggles.
- **Touch-only devices** get a "Controller or keyboard required" screen with a Settings button.

**Verification:**
- The headless Node test plays every chapter with no errors, and the bot finishes every set piece.
- Scripted human input clears both hook swings and outruns the boulder.
- Browser screenshots showed no errors.
- The AI Hub harness passes at 1 and 2 players, with a player leaving, and without the hub's card.
- An emulated gamepad confirms both invert toggles work.
- Not tested: real hardware. Nobody has played it with a real DualSense, so difficulty and feel are unverified.

## Source Information
- **Date:** 2026-11-01 14:09
- **Source:** Raiders of the Lost Ark (1981 film). The title was picked by a random number from 50 riffs on its name.
- **Genre and Perspective:** pulp action-adventure platformer. The main view is side-on; a 2.5D brawler view can be switched in (V / L1 / L3).
- **Tech:** my-3D2dge v0.85.1 (full engine, inlined, canvas 2D) and the aihub-session 1.3.0 client (AI Hub Session Protocol v1, inlined unmodified). No other libraries.
- **Art Direction:** the engine's native style: code-drawn HD pixel art at 320×240 that expands to fill the screen, shaded Humanoid rigs, engine props, textured tiles, parallax backdrops, lighting and weather.
- **Animation:** the engine's native system: procedural Humanoid skeletons with E.MOVES attacks and poses. Snakes, bats, the boulder, the planes and the spirits are drawn in code.
- **Audio:** 9 original sequencer songs written in code, synthesized sound effects, and gibberish voices (each speaker has its own waveform, register and scale, with one syllable per letter typed).
- **Online:** AI Hub side-by-side sessions for 1–4 players: seeded start, progress updates, a scored result with stats and awards, the probe, and the ready flow. No other network features.
- **Testing:** headless Node runs of every chapter (bot plus scripted input), Playwright screenshots, the AI Hub harness, an emulated gamepad, and an emulated touch-only phone.
- **Research:** the engine's handoff docs and the AI Hub README. Nothing on the film beyond memory.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost and tokens unknown. Session time was about 45 minutes.

## Testing Feedback
- **How many issues did testing catch?** 14. Among them: chatter lines freezing play, a softlock when starting past the boss arena, spawns landing on the temple roof, a chase pit too wide to clear, a tight release window on the cliff swing, a missing "é" in the font, and several framing problems.
- **How many were critical / game breaking?** 3:
  - Chatter lines opened as modal boxes, which froze play for seconds at a time and made the idol swap unreachable.
  - Starting past the arena trapped the hero inside it.
  - The boulder could not be outrun past one pit.
- **Most helpful test:** the headless bot run that logs where it gets stuck or falls, combined with scripted human input for the swings and the chase.
- **Least helpful test:** a screenshot pass taken while modal dialogs were open; most frames showed the same dialog box.

## Engine Feedback
- **What I liked most:** the menus, settings, rebinding, dialog with portraits, Platformer moves (ledges, crouch, `swingFrom`), rigs, lighting and weather all come built in, so the code could focus on the game.
- **Did I get stuck or guess wrong?** Twice:
  - `Dialog.say` treats `modal: undefined` as modal (only an exact `false` turns it off), which froze play.
  - Scene switches go through a fade, so tests need `{ fade: 0 }` before the next step.
- **Most important thing I built myself:** the whip (reach, hits, hook catching), the idol swap meter and boulder chase, the eyes-shut finale, and the attract bot.
- **Hardest part:** placing things by cell counted from the bottom, and finding a floor under a ceiling (`groundBelow` from the top of the level returns the roof).
- **Remove or overhaul:** shipping the single 1.2 MB file as the only full edition, since every game carries every module.
- **One change:** make `modal` follow truthiness, or warn on `undefined`, and add a `floorUp(x)` helper next to `groundBelow`.

## Prompt Feedback
- **What I liked most:** a clear definition of done, with the creative choices left open.
- **What was confusing:**
  - The template filled "pick a famous movie" in literally ("a spiritual successor to pick a famous movie").
  - The hub link reads as if the game also needs multiplayer when played on its own, but it only describes sessions.
- **Hardest thing:** fitting a film's worth of set pieces into one demo, each working for a player, the bot and the hub.
- **The one test I'd want:** a real person playing start to finish with a DualSense.