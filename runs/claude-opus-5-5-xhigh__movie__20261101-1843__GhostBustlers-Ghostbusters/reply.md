I built **Ghost Bustlers**, an original spiritual successor to *Ghostbusters* (1984), as a single 451 KB HTML file. It plays from title to credits with no console errors on both WebGPU and WebGL 2. The AI Hub test harness passes in every scenario the hub requires (1–4 players, a lossy network, the host leaving, and a server-hosted round).

**Deliverable:** `GhostBustlers-Ghostbusters-claude-opus-5-5-xhigh-20261101-1843.html` in the folder root. three.js and Rapier load from the jsDelivr CDN, so the first launch needs internet. Source modules, build script and test tools are in the `GhostBustlers-…-1843/` subfolder.

**What's in it**
- **Story ("Night One"):** an intro, a tutorial in the firehouse practice pen, then three jobs (a hotel ballroom, a library, a rooftop finale). There are cutscenes, a business layer (bounties, an itemised collateral-damage bill, upgrades) and credits, then free play.
- **Core loop:** you lock a stream onto a ghost and pull against the direction it bolts. You can slam it into the furniture, which costs you money. Once it's weak you drag it over a trap. Other tools: explosive darts, PKE goggles that reveal and scan hidden ghosts, and a "perfect vent" timing mechanic for heat. Crossing two streams causes a big explosion, except in the finale, where it is how you win.
- **Finale:** the villain makes you choose the form of a 30-metre giant (rubber duck, gingerbread man or parade hot dog). You stagger it, then cross the streams at the portal.
- **Views:** over-the-shoulder is the main one; first person and a top-down view are one button away.
- **Attract mode:** starts after 10 seconds idle and cycles AI-played demos of all three levels; any input exits.
- **Co-op ("Ghost Rush"):** works through AI Hub sessions, and also plays standalone with three AI partners.
- **Controller-first UI:** PS5 button prompts that switch automatically between controller and keyboard. Settings include separate horizontal and vertical stick-invert toggles. Touch-only devices see "Controller or keyboard required" with a Settings button while the demo plays behind it.
- **Audio:** five synthesized music tracks, all sound effects and gibberish voices are generated in code.

**What I could not verify**
- I couldn't hear the audio. It runs without errors, but music and voice quality are untested by ear.
- The controller was an emulated pad, not a real DualSense, so rumble and real-pad axis behaviour are unconfirmed.
- Headless software rendering runs at about one frame a second, so frame rate on real hardware is unmeasured. Before the first save, a session tops out at roughly 2 fps.
- Balance comes from AI autopilot runs only. The autopilot breaks a lot of furniture, so I added a flat $600 call-out fee so every finished job pays enough for at least one upgrade.

---

## Source Information
- **Date:** 2026-11-01 18:43
- **Source:** Ghostbusters (1984). Ghost Bustlers is an original spiritual successor with its own characters, locations, ghosts, music and writing in the movie's deadpan tone.
- **Genre and Perspective:** co-op third-person ghost-wrangling action with a light business layer. Main view is over-the-shoulder (perspective camera), switchable to first person (perspective) or top-down tactical (orthographic).
- **Tech:** Three.js r180 WebGPURenderer (WebGPU, automatic WebGL 2 fallback) with TSL node materials and bloom post-processing; Rapier 0.19.3 (character controller, joints, contact-force events, queries); Web Audio; Gamepad API with vibration; Pointer Lock; AI Hub session client 1.3.0; bundled with Bun 1.3.
- **Art Direction:** the engine's native look: PBR materials on primitive shapes, canvas-drawn textures, real-time lights and soft shadows, TSL shaders for ghosts, streams, trap cones, portal and sky, plus bloom.
- **Animation:** the engine's native AnimationMixer with keyframe clips on jointed rigs, in two layers (upper and lower body) with cross-fades.
- **Audio:** code-written music sequencer (five tracks with intensity layers), synthesized sound effects, and Animalese-style gibberish voices.
- **Online:** AI Hub co-op sessions for 1–4 players. The host runs the shared world and sends snapshots at 15 Hz with reliable events; the game handles players leaving, server-hosted rounds, and reports standings, stats and awards. No other network features.
- **Testing:** headless Chromium (Playwright) on a software GPU with WebGPU and WebGL 2; autopilot runs of every level with state checks and screenshots; controller-only and touch-device tests; the AI Hub harness in every scenario its README requires.
- **Research:** none beyond the AI Hub README, harness and example, and the three r180 and Rapier 0.19.3 package APIs.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** unknown (no reliable cost or token estimate is available inside the session)

**Testing Feedback**
- **Issues caught:** 26.
- **Critical:** 9:
  - PKE scans reset every frame, so hidden ghosts could never be revealed.
  - The job board showed every job as locked.
  - Story progression broke when a job started.
  - Lights added at runtime forced every material to recompile, causing multi-second stalls.
  - The finale's portal check could never fire.
  - The top-down view was blocked by ceilings.
  - Three AI Hub conformance failures, all in co-op sessions: ready() waited on a timer, the shared world stalled behind slow rendering, and the first copy to load starved the others.
- **Most helpful test:** letting the AI autopilot play the player through every level with a fast-forward hook, checking game state at each step, plus the hub harness.
- **Least helpful test:** fixed-length gamepad taps and fixed sleeps, which gave false failures at about one frame a second.

## Engine Feedback
- **What I liked most:** WebGPURenderer with TSL. One shader graph produced the ghosts, streams, portal and sky, and the same code runs on WebGPU or WebGL 2. Rapier's character controller (stepping up, snapping to ground, pushing props) did a lot for free.
- **Got stuck or guessed wrong?** Reversed-edge `smoothstep` is undefined in WebGPU's shader language, so I rewrote those calls. I also wrongly assumed adding and removing lights at runtime was cheap; it recompiles every lit material.
- **Most important thing I built myself:** the wrangling loop (tether, pull against the bolt, slam, trap capture) and a CPU-built stream tube with a TSL material.
- **Hardest part:** there's no animation authoring path for code-built rigs, so every clip is hand-typed keyframes. Layering upper and lower body needed a split rig because AnimationMixer blends by weight, not by body-part mask.
- **Remove or overhaul one thing:** the post-processing setup. Swapping a pass's camera is undocumented, and toggling shadows forces recompiles.
- **Change one thing:** add built-in, GPU-updated billboard particles and trail/tube primitives for WebGPU.

## Prompt Feedback
- **What I liked most:** the free choice of movie and genre, paired with testable constraints (engine versions, controller-first UI, attract mode, the hub protocol).
- **What was confusing:** "pick a famous movie" is pasted literally wherever SOURCE appears. "Follow lib/hub… as well as for the game on its own" can mean "hub only" or "also add standalone multiplayer"; I did hub co-op plus standalone co-op with AI partners.
- **Hardest thing:** fitting a full campaign, co-op networking and attract mode into one vertical slice with every feature finished.
- **One test I wish I could have run:** a real DualSense on real hardware in Chrome and Firefox, to verify the standard button mapping, the inverted-axis fix and rumble.