I built **Bata Bata 7**, a spiritual successor to Waku Waku 7, as a single file: `BataBata7-WakuWaku7-claude-opus-5-5-medium-20261029-0505.html` in the work folder. The title was picked at random from 50 brainstormed names. Dev files (sources, build script, tests) are in the subfolder of the same name.

All testing ran in software WebGPU at about 3 FPS, with no real GPU, no real controller and no listening to the audio. So how it feels at 60 FPS, the frame data and the sound mix are untested. That includes the code-written music, effects and gibberish voices: they were never heard.

On checks:
- **AI Hub:** the hub's own test page passes every check at 1 and 2 players.
- **Gamepad:** the emulated-controller checks (menu navigation, Options pause, Create+Options passthrough, invert-X) passed.
- **Matches:** CPU-vs-CPU matches for all 9 fighters ran to a KO with no errors and used every move type.

**What's in it**
- **Roster:** 7 fighters, each with 4 specials, a super, and the Harahara Attack (a slow, armored, guard-crushing blow you can feint, with a last-instant Perfect Guard counter). There's also a boss, Emperor Gigadoom, and a secret sandbag mascot, Punchy-kun.
- **Systems:** light chains, launchers and juggles, overheads and lows, throws with throw-tech, dashes and air dashes, guard cancel, quick rise, a 3-bar super gauge, damage scaling, and a damage bonus for stick-motion inputs.
- **Modes:**
  - Arcade Story collects 7 stars over 3 rivals, a bonus episode and the boss, with narrator "Next time on…" previews, continue, game over and an ending.
  - Versus works with two controllers or a split keyboard, or against the CPU.
  - Training has dummy settings, a hitbox view and combo info.
  - Bonus Challenge is a 30-second round against Punchy-kun for points.
  - Attract mode starts after 10 seconds idle on the title screen; any input exits it.
- **Menus:** How to Play, Move Lists, Settings (with invert horizontal/vertical gamepad toggles), and About & Credits. Touch-only devices get a "Controller or keyboard required" screen with a Settings button.
- **Online:** in an AI Hub session it plays as a side-by-side "Bata Bata Gauntlet". Everyone gets the same seeded fighter and rival order and competes on score. I chose side-by-side over a live head-to-head mode because a fighting game played over 30–250 ms of latency would need rollback netcode.

One leftover: the game exposes a `window.__bb7` debug handle that my tests use. It's harmless, but you can remove it.

## Source Information
- **Date:** 2026-10-29 05:05
- **Source:** Waku Waku 7 (Sunsoft, 1996). Original successor; no assets reused.
- **Tech:** Three.js r180 (WebGPURenderer, WebGPU only with no fallback, TSL node materials, PostProcessing with bloom); Rapier 0.19.3 (`@dimforge/rapier3d-compat`) for props, debris and star shards; Gamepad API with rumble; Web Audio; AI Hub `session.js` 1.3.0, unmodified; a Node bundling script.
- **Art Direction:** stylized cel shading: toon materials with a 3-step ramp, outlines drawn by extruding a back-face hull in the shader, bloom, comic sound-effect text pop-ups, anime cut-ins.
- **Animation:** characters built from primitive shapes on a 12-joint rig, driven by a hand-keyed pose library with smooth blending. Walk, breathing, squash-and-stretch and secondary motion (ears, capes, scarves, tails) are added procedurally, plus hit-stop, slow-motion and camera cut-ins.
- **Audio:** all written in code: a step sequencer playing 11 songs, about 40 synthesized sound effects, and Animalese-style gibberish voices for every character and the narrator.
- **Online:** AI Hub Session Protocol v1, side-by-side mode (seeded deal, progress, result and awards, time-up and end handling, state reporting, Esc/Options settings menu). Local 2-player versus. No other networking.
- **Testing:** Playwright driving headed Chrome under Xvfb, with software WebGPU (SwiftShader) at about 3 FPS. The runs are listed in Testing Feedback below.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost and token counts unknown (no usage meter is available to me). Session time was about 55 minutes.

## Testing Feedback
- **How many issues did testing catch?** 11:
  - a crash when a human player fired a super
  - combo counters only resetting during rendering
  - overexposed lighting and bloom
  - hit flashes turning characters fully white
  - attract-mode healing that made demo matches drag on
  - six layout problems: title menu overflow, select cards hidden behind the info panel, stage cards overflowing, settings showing only 3 rows, HUD text overlapping, and no close button on overlays for touch and mouse
- **How many were critical or game-breaking?** 1, the super crash. It threw an error every frame and stalled the match.
- **Most helpful test:** stepping CPU-vs-CPU matches for all 9 fighters directly in the page. It covered every move path in seconds and found both logic bugs.
- **Least helpful test:** timed key-press scripts at 3 FPS. Game time ran slower than wall-clock time, so they produced false alarms.

## Engine Feedback
- **What did you like most?** TSL. The outline is a one-line vertex offset, and the toon material plus post-processing bloom gave the cel look with almost no shader code.
- **Did you get stuck or guess wrong?** Briefly:
  - I confirmed in the r180 build that `PostProcessing` and the bloom node exist.
  - `WebGPURenderer` quietly falls back to WebGL2, so I had to check the backend myself to enforce "no fallback".
  - Rapier-compat warns about deprecated init parameters.
  - Headless Chrome screenshots the WebGPU canvas as black, so I needed headed Chrome under Xvfb.
- **Most important thing you built yourself:** the fixed 60 Hz fighting simulation: frame data, hit and hurt boxes, input buffer and stick-motion detection, cancels, juggles and scaling, guard levels, armor, throws, hit-stop, and the super and Harahara systems. Next was the pose-blending rig.
- **Hardest part:** verification. Software WebGPU at about 3 FPS, and multi-second stalls the first time a stage or material is shown.
- **Remove or overhaul one thing:** the silent WebGL2 fallback. A WebGPU-only project should fail loudly by default.
- **Change one thing:** a built-in, documented way to precompile every material during loading, so the first use of a stage or effect doesn't hitch.

## Prompt Feedback
- **What I liked most:** the deliverable is concrete, while animation, audio and how to adapt the genre are left open. The attract mode and the axis-invert fix are specific, testable asks.
- **What was confusing:**
  - The hub protocol recommends a WebGL2 fallback, but the tech stack says WebGPU with no fallback. I resolved it with `hub:webgpu=required`.
  - Which hub mode suits a 1v1 fighter was left to judgement.
  - "Testing Feedback" sits under Source Information but isn't in the CRITICAL list of sections; I included it everywhere.
- **Hardest thing to do:** the scope. Seven distinct fighters, a boss, a secret fighter, every mode and the hub integration, all in one pass.
- **The one test I'd run:** a 60 FPS playtest on a real GPU with a real DualSense, to tune frame data, hit-stop, movement arcs, camera framing and the audio mix.