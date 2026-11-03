**REWIRED** is finished and every test passes. It's an original surveillance game in the spirit of The Wire, and the title came from a random draw out of 50 brainstormed names.

- **The game:** `Rewired-TheWire-claude-opus-5-5-medium-20261102-181307.html` (1.4 MB, one file, no network needed) in this folder.
- **Exit interview:** `exit-interview.json` sits next to it and parses as JSON.
- **Dev files:** sources, build script and tests are in the `Rewired-TheWire-…/` subfolder.

**What's in it:** five "tapes" plus a cold open.
- **Cold open:** a body in the Courts.
- **Tape one, The Corner:** pay or lean on your informant, blend in at a bus stop, stoop or the parked car, photograph hand-to-hand sales and the stash, then tail the runner while the lookouts watch. Getting spotted adds heat, and three burns blows the case.
- **Tape two, the board:** pin each piece of evidence to the right name on an org chart until you have enough probable cause, then pick which phone line to tap.
- **Tape three, the wire room:** listen to calls, cut off personal and lawyer calls in time, spot-check, tag the lines that matter, and decode pager codes on a mirrored keypad. Three rule violations and the judge pulls the wire.
- **Tape four, the re-up:** a stakeout in the rain, the raid, a foot chase ending in a tackle, and a flashlight search of the stash house.
- **Tape five, the brass:** choose "dope on the table" or "follow the money", followed by an epilogue montage and a final case file.

**Also included:**
- A 1–2 player local Surveillance Shift mode.
- An AI Hub ghost-mode round for 1–4 players.
- An attract mode after 10 seconds idle on the title; any input ends it.
- Three switchable views.
- PlayStation symbols by default, with Xbox in Settings.
- Settings toggles to invert the stick left/right and up/down.
- The "Controller or keyboard required" notice plus a Settings button on touch-only devices; the attract mode still runs there.
- Chapter select, autosaves and Continue.
- An in-game About & Credits screen.

## Source Information
- Date: 2026-11-02 18:13
- Source: The Wire (HBO, 2002–2008), created by David Simon
- Genre and Perspective: surveillance and stealth investigation, with a case-board puzzle, a wiretap listening game and a foot chase. The main view is the engine's three-quarter view; isometric and top-down can be switched in at any time.
- Tech: my-3D2dge v0.85.1 (full engine), AI Hub session client 1.3.0 (Session Protocol v1), plain JavaScript bundled by a Node script
- Art Direction: the engine's native pixel style. Rowhouse walls are painted pixel by pixel (brick, formstone, boarded vacants with graffiti), with code-drawn props, street lamps and rain.
- Animation: the engine's procedural character rigs driven by speed and poses, and its Mover for the player (sprint, sneak, vault)
- Audio: code-written chip music (7 tracks) and sound effects, plus gibberish Simlish-style voices with a pitch and timbre per speaker
- Online: AI Hub ghost mode (a seeded 3-minute shift, other players shown as ghosts, score results). Local drop-in for a second player outside the hub.
- Testing:
  - headless: a full playthrough of all five tapes (49 checks), 52 system checks, a 16-scene smoke test
  - Playwright in Chromium, Firefox and WebKit
  - viewport-matrix on 24 phone, tablet and desktop configurations
  - the AI Hub harness with 1, 2 and 4 players, including latency, jitter, packet loss and host-leave
- Research: none beyond the engine and hub docs
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-opus-5-5, reasoning effort medium
- Usage: unknown

## Testing Feedback
- **How many issues did testing catch?** 28. The AI Hub harness passed on its first run.
- **How many were critical?** 5:
  - a boot step crashed the start
  - the runner's stash spot was inside a wall, so the corner's sale cycle stalled
  - a dialog left open carried into the next scene and froze it
  - Shift mode triggered story events
  - a timer left over from the tail meant no more sales in later street sessions
- **Most helpful test:** the scripted headless playthrough of all five tapes, which found every point where the story could get stuck.
- **Least helpful test:** the viewport matrix. It was 24 of 24 clean on the first run and only caught a notification overlapping the objective box on narrow screens.

## Engine Feedback
- **Liked most:** the standard features are already built: pause menu, rebinding, glyphs per device, saved settings, deterministic timing, and the same game running headless in Node for tests.
- **Stuck or guessed wrong?**
  - I had to guess whether Mover.update takes ground or screen directions (ground) and what a wall painter returns for the base colour (null).
  - Objects defined as data face south, so my cars came out sideways at first.
  - TileMap.bounds needs a view object, not a view name.
- **Most important thing I built myself:** the surveillance layer:
  - a world-space viewfinder that works with mouse, stick and keys
  - the sale cycle that photos are judged against
  - lookout suspicion with blending
- **Hardest part:** working through a 1.2 MB engine via its index, and learning the wall painter's long signature.
- **Remove or overhaul:** the loosely checked option objects on draw calls, where a typo in an option key is silently ignored.
- **Change one thing:** ship PlayStation and Xbox button symbols as font glyphs, so prompts don't need custom drawing.

## Prompt Feedback
- **Liked most:** it is specific about the player's experience (10-foot UI, glyphs, attract mode, touch-only notice) and leaves the design open.
- **Confusing:** "multiplayer… as well as for the game on its own" could mean hub-only or hub plus local play. I did both.
- **Hardest:** making the show's slow, procedural texture (paperwork, waiting, minimization) fun in a short demo.
- **One test I wish I could run:** a real DualSense on a real TV at ten feet. Real iOS Safari wasn't available either; WebKit with iPhone profiles was the closest automated check.