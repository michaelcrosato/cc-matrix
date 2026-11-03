Wire Tap Dance is finished: the bundled game is one `.html` file in this folder's root, and nothing in it is a stub or placeholder. The tests I ran passed: 63 system checks, a 23-check full playthrough, and the AI Hub harness (`pass: true` with 2 players). `exit-interview.json` parses as JSON with every field filled.

I did not test with a real gamepad or real iOS Safari. Controllers were mocked, and WebKit was only used for the viewport matrix.

**What it is.** You are Detective Brannock on a fictional East Side block. The case runs in eight stages:
1. A briefing with Sgt. Kowalczyk.
2. Photographing three crew members while kid lookouts sweep sight cones.
3. Paying, squeezing or skipping the informant Tooley.
4. Tapping the payphone with a three-step timing game.
5. Listening to the calls in the van.
6. A foot chase with vaulting and a tackle.
7. A five-round interview with Dray, where leaning on him goes on the record.
8. Reporting to Lt. Pruitt, who gives a verdict and score.

**Required features in place.**
- **Attract mode:** after 10 seconds idle on the title screen, a pilot plays the whole case with cheats, and any input exits it. I watched it run in a real browser from the title through the box.
- **Controls:** PlayStation glyphs by default, with an Xbox option in Settings. Mouse hover and click work on menus and in the world. Settings has invert-horizontal and invert-vertical toggles for the stick. The engine had no such option, so I patched its gamepad input to add them.
- **Touch-only devices:** the title shows "Controller or keyboard required".
- **Hub:** parallel mode, 1–4 players. The game opens straight into the round in a session.
- **Audio:** all synthesized, including gibberish voices with a different pitch and wave per speaker.

**Not checked.** The attract demo's final results screen was never viewed in a real browser. The headless pilot reaches the end of the case, but the real run was cut off after the box.

# Source Information
- **Date:** 2026-11-02 18:13
- **Source:** The Wire (2002-2008), kept gritty and real: an original spiritual successor with original characters and a fictional East Side district
- **Genre and Perspective:** investigative stealth-adventure with mini-games; three-quarter top-down (engine native), switchable to isometric and top-down with V / R3
- **Tech:** my-3D2dge v0.85.1 handoff engine (patched only for stick inversion), plain JavaScript, AI Hub session client 1.3.0, bundled to a single html file
- **Art Direction:** engine-native HD puppet characters in pixel-art 3/4 view, procedural brick rowhouses and low-rises, rain, night lighting, muted gold-on-charcoal HTML HUD
- **Animation:** engine-native procedural Humanoid rigs (IK gait, poses, expressions, tackle move), no sprite sheets
- **Audio:** code-synthesized chip songs and effects, with Animalese-style gibberish voices per speaker
- **Online:** AI Hub Session Protocol v1, parallel mode, 1–4 players; single player outside a hub
- **Testing:** headless engine tests (63 system checks, 23-check playthrough), Playwright browser runs, the AI Hub harness, a WebKit viewport matrix; controllers mocked
- **Research:** the engine API card and AI Hub protocol only; no web research
- **Environment:** Claude Code CLI (headless); Linux; browser unknown (Chromium and WebKit via Playwright for testing)
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium
- **Usage:** unknown (cost and token counts are not exposed to the session); session time about 30 minutes

# Testing Feedback
- **Issues caught:** about 12.
  - Dropped arrest script.
  - Confirm sharing Space and J with interact and tackle.
  - Interact retriggering in the same frame an overlay closed.
  - Overlay left open.
  - Attract pilot stalling behind a screen.
  - Blocked alley.
  - Stale screen on restart.
  - Invalid colour.
  - Missing glyph.
  - Overflowing panel.
  - Photo line-of-sight ignoring crouch.
  - Unreachable photo range.
- **Game breaking:** four.
  - The dropped arrest script left the case stuck mid-chase.
  - The attract pilot stalled at the interview.
  - The van restarted the listening post forever.
  - A dumpster and fence fully blocked the chase alley.
- **Most helpful test:** the headless full playthrough with real input actions; it found the logic bugs in seconds and proved every stage connects.
- **Least helpful test:** the mobile viewport matrix. The game is controller and keyboard only, so phone layouts say little.

# Engine Feedback
- **Liked most:** characters that animate and look finished from rigs alone, plus the free HUD, menus, settings and rebinding.
- **Stuck or guessed wrong:** I assumed dialog and actions were independent, but confirm and interact share Space. I also assumed any character works in a TileMap legend; a dot is treated as empty.
- **Had to build myself:** stick-axis inversion, the attract pilot, and the interview, wire and listening mini-games.
- **Hardest part:** knowing which `game.input` and settings fields are exposed without reading the engine source.
- **Overhaul:** the fixed standard menu. I wanted my own group names and glyph options and had to edit spec objects.
- **Change one thing:** make custom settings first-class with apply hooks that cover gamepad axes, so inversion needs no patch.

# Prompt Feedback
- **Liked most:** clear, testable requirements: attract mode, glyphs, inversion, touch message, hub.
- **Confusing:** the Source Information block and the exit-interview schema are asked for in two forms, and the feedback questions sit apart from the final-reply rules.
- **Hardest:** building one coherent, fun game from a TV drama in a single sitting, with 10-foot UI, hub rules and polish at once.
- **One test I'd run:** a real DualSense run, to confirm the stick inversion and PlayStation glyphs on hardware.

Files are in `/home/micha/dev/cc-matrix/runs/claude-sonnet-5-5-medium__20261102-181331__x22cc1b/work`:
- `WireTapDance-TheWire-claude-sonnet-5-5-medium-20261102-181331.html`
- `exit-interview.json`
- `WireTapDance-TheWire-claude-sonnet-5-5-medium-20261102-181331/` (sources and tests)