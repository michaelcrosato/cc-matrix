**Seinfence** is finished. It's a single 1.4 MB HTML file with no external dependencies: `Seinfence-Seinfeld-claude-opus-5-5-medium-20261101-1409.html` in this folder. I picked the title at random from 50 brainstormed ones. Dev files are in `Seinfence-Seinfeld-claude-opus-5-5-medium-20261101-1409/` (`src/*.js`, `tools/build.mjs`, the tests).

**What it is:** a social-stealth sitcom adventure on one Upper West Side block. It's 9 AM, and Gil goes on stage at Club Nada at 8 PM with no material. You switch between four original friends (L1/R1), each with a petty plot and an ability:
- **Gil – Observe:** hold the ability near someone while their quirk shows, and it becomes a bit for tonight.
- **Marv – Bluff:** stop a needle in the green to lie your way out.
- **Delia – Shove:** pushes people away and stuns awkward people for a moment.
- **Roscoe – Entrance:** a burst forward that startles everyone nearby and knocks over bins.

The day includes:
- **Awkward people:** the super, the mailman, an ex, a close-talker and a man saving a parking space with a lawn chair. Their sight lines show on the ground. If one catches you it's a run-in: it costs time, fills the awkward meter, and also becomes material. A full meter ends in a "CANCELLED" game over.
- **Minigames:** the soup-line etiquette gauntlet, the bluff needle, hammering a fence on the beat, and Lorraine's quiz.
- **The finale:** a stand-up set where you time "THE PAUSE" for each bit and answer a heckler, then an epilogue where the four plots collide, then a results screen.
- **Around it:** a day-to-dusk light cycle with an afternoon rain shower, traffic, pigeons, autosave and Continue, and four camera views (R3 / V).

The task's other requirements:
- **Attract mode:** starts after 10 idle seconds on the title. A cheating director plays every system, and any input exits.
- **Multiplayer:**
  - **AI Hub:** side-by-side sessions, where everyone plays the same seeded day compressed to about four minutes.
  - **Local:** up to 4 players can drop in on one screen.
- **Settings:** invert horizontal and invert vertical toggles, alongside the engine's standard pause, settings and rebinding.
- **Touch-only devices:** show "Controller or keyboard required" with a Settings button.

**Testing:** all passing at the end.
- A headless smoke test: 20 checks.
- A whole-day playthrough test of every plot step, the finale, co-op join and the cancelled ending.
- The AI Hub harness: 1, 2, 3 and 4 players, a player leaving, and no splash card.
- Browser screenshots, and an emulated phone for the touch-only notice.

Nobody has played it with a real controller, so the pacing and timing windows haven't been judged by hand.

## Source Information
- Date: 2026-11-01 14:09 (MST)
- Seinfeld (TV Show)
- Genre and Perspective: social-stealth sitcom adventure; main camera three-quarter top-down ("Sitcom cam"), switchable to isometric, top-down and the low brawler angle ("Studio floor", also used for the finale)
- Tech: my-3D2dge v0.85.1 (full engine, canvas 2D, E.Shell HTML interface); AI Hub Session Protocol v1 client 1.3.0; plain JavaScript in one HTML file
- Art Direction: engine-native pixel art at PS1 resolution, HD Humanoid characters, cutaway "sitcom set" walls, a CC0 asset cut (KayKit, Kenney), canvas lighting with day-to-dusk and rain
- Animation: engine-native procedural rigs (Humanoid poses and expressions, Mover rig states, E.Attack moves, Blob pigeons)
- Audio: all written in code: chip-synth music (slap-bass title, a walking street shuffle with chase and nerves layers, an evening theme, a jazz club), synthesized effects, Animalese-style gibberish voices for every speaker
- Online: AI Hub side-by-side sessions (progress, result, stats, awards); local drop-in co-op for up to 4
- Testing: headless Node suites, headless Chromium screenshots, the AI Hub harness, phone emulation
- Research: none beyond the engine handoff docs and the hub protocol
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-opus-5-5, reasoning effort medium
- Usage: cost unknown; tokens unknown; session time about 50 minutes

**Testing Feedback**
- **Issues caught:** 14.
- **Critical / game-breaking:** 4:
  - after the title, the game ignored all input;
  - the camera didn't follow the player;
  - the soup line could deadlock;
  - hub sessions never reported progress.
- **Most helpful test:** the headless whole-day playthrough.
- **Least helpful test:** the long attract-mode screenshot run. The headless trace showed the same thing faster.

## Engine Feedback
- **Liked most:** how much comes free and works: pause, settings, rebinding, controller glyphs, E.Shell screens, sight cones and E.Suspicion, dialog with live portraits, and `game.advance()` for headless tests.
- **Stuck / guessed wrong:**
  - An open E.Shell title screen survives `game.go()` and silently blocks all input.
  - The pixel font lacks `·` and `✓`.
  - E.Mover bodies don't collide with each other.
- **Most important thing built myself:** the episode layer: the clock, four plot state machines, the minigames, the gibberish babble and the attract director.
- **Hardest part:** finding the few facts that matter in a very large API.
- **Remove or overhaul:** E.Shell screens should close (or warn) on a scene change.
- **Change one thing:** a per-letter voice hook on E.Dialog, so gibberish voices need no wrapper.

## Prompt Feedback
- **Liked most:** the clear deliverable list and the freedom to pick the genre.
- **Confusing:**
  - "the games native perspectives": the game's or the engine's? I used the engine's camera views.
  - "multiplayer … as well as for the game on its own": I read it as hub sessions plus local co-op.
- **Hardest:** fitting a full vertical slice (four plots, four minigames, attract mode, hub mode, co-op) into one pass while keeping it all tested.
- **One test I'd run:** a real person with a DualSense playing the whole day, to judge the clock pace, the sight cones and the timing windows.