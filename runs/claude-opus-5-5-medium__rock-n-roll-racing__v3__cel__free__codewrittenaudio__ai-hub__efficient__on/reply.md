I've built **Rock n Roll Racketeers** (the title the random number generator picked from 50 candidates). It's a single file, `RockNRollRacketeers-RockNRollRacing-claude-opus-5-5-medium-20261029-0327.html` (253 KB), in this folder's root. Three.js and Rapier load from a CDN; the AI Hub `session.js` is pasted in unmodified as the first script in `<head>`. The dev modules, build script and tests are in the matching subfolder, and `node build.mjs` there rebuilds the file.

All testing was in headless Chromium with software-emulated WebGPU (SwiftShader), not a real GPU or a physical controller. Every feature below was exercised there, and no TODOs or stubs remain. One harness run failed: with 4 players on a bad network, the Esc-menu and "world keeps moving" checks failed. All four copies were rendering at under 1 frame per second on this machine. The same checks pass with 2 and 3 players.

**What's in it**
- **Championship:** 4 races across 3 planets, then a promotion finale that opens a harder Warlord Division. In between there's prize money, kill bounties and cash pickups, a shop with 3 cars, 4 upgrade lines and extra weapon charges, and an auto-save.
- **Racing:** 4 racers, rockets that lock on, mines or oil depending on the car, nitro and a jump. Weapons recharge every lap, as in the original. Each car has armor; you explode and respawn, and a car that gets stuck is towed back onto the road.
- **Tracks:** lava-gap jumps, a figure-eight with a bridge, an ice planet with half the grip, plus boost pads, oil, mines, ice spikes and cash/armor/ammo pickups.
- **Characters:** 7 drivers with perks, drawn portraits and taunts, plus an announcer, Barry "Bigmouth" Blastmeyer, who calls the race in the original's over-the-top tone.
- **Audio:** all generated in code: 5 original rock songs, engine and effects sounds, and gibberish voices.
- **Other modes:** Quick Race and 2-player split screen (any mix of pads and two keyboard halves). After 10 seconds idle on the title or main menu, an AI demo race with cycling cameras starts; any input exits it.
- **Controls and screens:** built for a controller first, with matching keyboard controls and on-screen button hints. Settings include invert-horizontal and invert-vertical toggles and a controller test screen. Touch-only devices get a "Controller or keyboard required" screen with a Settings button. There are How to Play and About & Credits screens.
- **AI Hub:** race mode for 2–4 players on a track chosen from the shared seed. Rival cars are solid, hits are decided by the car that gets hit, and mines and pickups are shared. It reports progress and results and handles time-up, end and players leaving, and the Esc/Options menu never pauses a session.

**Harness results:** passes at 2 players, at 3 players with the host leaving and a bad network, and without the hub's start card.

## Source Information
- **Date:** 2026-10-29 03:28
- **Source:** Rock n' Roll Racing (Silicon & Synapse / Interplay, 1993)
- **Tech:** Three.js r180 (WebGPU renderer, no fallback), Rapier 3D 0.19.3, Gamepad API, Web Audio API, DOM/CSS UI, Canvas 2D, esbuild 0.28, AI Hub Session Protocol v1 (client 1.3.0)
- **Art Direction:** stylized cel shading with a hard 3-band toon ramp, black ink outlines, flat saturated colours per planet, toon particle effects
- **Animation:** procedural, in code: wheel spin, suspension bob, body pitch and roll, hover-pad bob, particles, camera shake, CSS menu transitions, talking-mouth portraits
- **Audio:** code-written rock band (5 original songs), synthesized sound effects, and gibberish voices for the announcer and drivers
- **Online:** AI Hub race mode, 2–4 players; local 2-player split screen outside sessions
- **Testing:** headless Chromium (Playwright) with software-emulated WebGPU; keyboard and emulated-gamepad runs with screenshots and error capture; a headless AI-only race on all 4 tracks; a touch-device emulation; the AI Hub harness
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost and tokens unknown; session time about 50 minutes

## Testing Feedback
- **How many issues did testing catch?** About 13. The main ones:
  - the road surface faced downward, so cars fell through it
  - quick key taps were lost in menus
  - portrait images were blown up to full screen
  - the pre-race intro crashed
  - the Crossbones jump sat on a bend (34 falls per test run)
  - the pause menu opened and closed in the same frame
  - the hub's ready key was missed while the track loaded
  - the race HUD showed through the results screen
  - small layout and lighting problems
- **How many were critical / game breaking?** 3: falling through the road, the broken pause menu, and the intro crash. The Crossbones jump was close.
- **Most helpful test:** the headless AI-only race. It runs 4 cars for 150 race-seconds on every track in under 10 real seconds, and logged where each fall happened.
- **Least helpful test:** the 4-player harness run, which measured this machine's software rendering speed, not the game.

## Engine Feedback
- **What did you like most about the engine?** The Three.js WebGPU renderer works like the classic one: toon materials, shadows, instancing and split-screen viewports all worked. Rapier's ball collider on a road mesh made a stable base for arcade handling.
- **Did you get stuck or guess wrong?** I guessed wrong once: the road was built with downward-facing triangles, and Rapier's edge smoothing then let cars fall through. I also had to check the WebGPU split-screen clearing and Rapier 0.19's ray-cast names by running them.
- **What was the most important thing you had to build yourself?** The arcade driving model on top of Rapier, and a track builder that turns designer data into road, rails, collision, gaps and pickups.
- **What was the hardest part about using the engine?** Rapier gives physics, not driving feel, so grip, sliding, slopes and jump launches needed tuning. There's also no stock toon outline.
- **If you had to remove or overhaul one thing, what would that be?** The juggling of clear, viewport and scissor settings needed for split screen.
- **If you could change one thing, what would it be?** Ship an official toon outline pass and an arcade vehicle example for Rapier JS.

## Prompt Feedback
- **What did you liked most?** It spells out what usually gets skipped: attract mode, controller-first UI, the axis-invert fix, the touch-only message, and a real network protocol to follow.
- **What was confusing?** "Follow the hub for the game on its own" was ambiguous, so I added local split screen too. The hub asks for a WebGL 2 fallback while the prompt says WebGPU with no fallback; the file declares `hub:webgpu required`.
- **What was the hardest thing to do?** Fitting the full Rock n' Roll Racing loop into one coherent single file with nothing stubbed.
- **If there was one test you could have run, what would it be?** A real multi-device hub session with physical DualSense controllers on a lossy network.