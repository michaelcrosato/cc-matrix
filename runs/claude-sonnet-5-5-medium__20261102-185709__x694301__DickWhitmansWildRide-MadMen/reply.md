**Dick Whitman's Wild Ride** is built and bundled as one HTML file. It's a spiritual successor to Mad Men: one Thursday in 1963 at a Madison Avenue ad agency. It runs in headless Chromium with no console errors, and no TODOs or stubs are left. I never tried a real gamepad.

**Files:**
- Game: `DickWhitmansWildRide-MadMen-claude-sonnet-5-5-medium-20260102-185709.html` (1.3 MB; engine, AI Hub client and game inlined)
- Exit interview: `exit-interview.json` (parses; all five sections filled)
- Dev folder: `DickWhitmansWildRide-MadMen-claude-sonnet-5-5-medium-20261102-185709/`

**How it plays:**
- **Day:** Walk the office and the Gilded Fig lunch bar. Talk to people and make dialogue choices.
- **Meters:** Composure, Haze (drinks and cigarettes), Heat (your secret) and Reputation all change what happens.
- **Pitches:** A slide-card pitch to a lunch client and a harder one to the cigarette client.
- **Minigame:** A typing sprint for the headline.
- **Endings:** Five endings plus a score.
- **Controller-first UI:** Controller glyphs follow the last device used, with PlayStation or Xbox as a setting. Stick-invert toggles for both axes are in Settings.
- **Touch-only devices:** They show "Controller or keyboard required" with a Settings button.
- **Camera:** The view cycles between three-quarter, top-down and isometric.
- **Attract mode:** After 10 idle seconds on the title, an AI plays the whole day on a loop, and any input exits it.
- **Online:** It runs in ghost mode on the AI Hub protocol.

**What I tested:**
- The attract AI played the whole day and looped back to the start, with no errors. It found both critical bugs.
- The hub's own harness passed at 2 players, at 4 players with latency, jitter and loss, and in the host-leave scenario.
- I checked the title screen in WebKit at desktop sizes.
- I also checked touch emulation, save and load, the meltdown and blackout events, and view switching.

**Not tested:**
- A real DualSense, so stick inversion and glyphs are unproven on hardware.
- Real iOS Safari and Firefox.
- A live hub session with real players.

## Source Information
- **Date:** 2026-11-02 18:57
- **Source:** Mad Men (2007-2015)
- **Genre and Perspective:** Narrative adventure / office life sim with a card-pitch mini-game and a typing mini-game. Three-quarter top-down view, with top-down and isometric available on the camera button.
- **Tech:** my-3D2dge 0.85.1 with plain JavaScript modules bundled into one HTML file. AI Hub session client 1.3.0 (Protocol v1) pasted in unmodified. No other libraries or CDN.
- **Art Direction:** Engine-native HD pixel style. Custom 1963 furniture shapes, a marble-checker lobby, green linoleum bullpen, canvas lighting, and a warm haze overlay for the drink meter.
- **Animation:** Engine-native procedural Humanoid rigs, with live dialogue portraits and tweened transitions.
- **Audio:** Everything is made in code. A small jazz-lounge composer plays music for each place, and effects include a lighter, ice clink, typewriter and elevator bell. Animalese-style gibberish voices blip a pitch per letter, with a register per character.
- **Online:** AI Hub Session Protocol v1, ghost mode, 1–4 players. Each copy plays its own seeded day, the others show as translucent ghosts, and progress and score go to the hub. Standalone it is one player.
- **Testing:**
  - Headless Chromium with my own Playwright scripts, plus the hub harness (above).
  - WebKit desktop sizes through viewport-matrix (title screen only).
  - Not tested: real gamepad, real iOS Safari, Firefox, a live hub.
- **Research:** None beyond reading the engine handoff and the AI Hub protocol README in full. The show details are from memory and invented.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium
- **Usage:** unknown, since no usage meter is visible in the session. Session time is about 40 minutes of wall clock, started 18:57.

## Testing Feedback
- **How many issues did testing catch?** Eleven:
  - The boot crash from NPC rig options overwriting the rig.
  - The attract mode quitting itself because the AI's own taps counted as player input.
  - The attract AI looping on the elevator.
  - A scene's input preset replacing my key layout, which gave wrong prompts.
  - Prompts falling back to action names for a touch device.
  - Two glyphs the pixel font cannot draw.
  - Blotchy lighting.
  - A gothic window prop that didn't belong in 1963.
  - Three overlapping UI bits.
- **How many would be considered critical issues / game breaking?** Two: the boot crash, and the elevator loop that stalled the demo.
- **What was the most helpful test you ran?** Letting the attract AI play the whole day at triple speed while logging flags, room and clock. It covered every route, every pitch and the ending, and found both critical bugs.
- **What was the least helpful test you ran?** The first hub harness run. It was served from a port another agent was already using, so it checked someone else's game. Single title-screen screenshots were also low value.

## Engine Feedback
- **What did you like most about the engine?** The view system gives three camera angles for free, and the lit scene looks right in each. I also liked the Humanoid portraits in dialogue, the built-in pause, settings and saves, and a deterministic fixed step that made headless testing meaningful.
- **Did you get stuck or guess wrong?** Yes. A scene's `input` option re-applies a named preset on entry, which undid my custom layout. `input.label()` returns the action name for a touch device. I guessed Dialog's `voice` could take a function, but it only takes one sound name.
- **What was the most important thing you had to build yourself?** The game layer:
  - a branching dialogue runner;
  - the clock and stats;
  - the pitch and typing games;
  - the attract AI;
  - the hub ghost layer;
  - a `getGamepads` shim for the invert-stick settings.
- **What was the hardest part about using the engine?** Dressing a 1963 office from a medieval-leaning prop and shape library. I wrote a dozen furniture shapes myself, and the lighting took several passes.
- **If you had to remove or overhaul one thing from engine, what woudl that be?** The silently applied scene options (`input`, `view`, `res`). They overwrite what the game set up without saying so.
- **If you could change one thing about the engine, what would it be?** A per-letter voice callback on Dialog, and axis-invert settings built into Input.

## Prompt Feedback
- **What did you like most about this prompt?** The done-criteria are concrete and checkable. The 10-foot controller-first rules are specific enough to design against, and the stick-inversion toggle is a good real-world detail. The attract-mode and AI Hub requirements push toward a finished game.
- **What was confusing?** Little. The shared machine is a hazard, since another agent's server on a common port answered my first hub test. "Usage if estimates are available" leaves a model with no meter guessing. The file-name pattern needed a judgement call for a title with an apostrophe.
- **What was the hardest thing to do?** Scope: narrative, two mini-games, endings, saves, settings, attract mode, ghost multiplayer and a 10-foot UI in one sitting, all in the show's voice.
- **If there was one test you could of run, what would that test be?** A real DualSense on a real TV: inversion, both glyph sets, rumble and pad-only navigation through a whole day. Second choice is a live four-player AI Hub session.