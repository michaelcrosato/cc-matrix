**Star Locks 64** is finished and bundled as `StarLocks64-Starfox64-claude-opus-5-5-medium-20261026-1350.html` in the folder root (235 KB). The title was picked with Python's `secrets.choice` from 50 brainstormed riffs. Dev modules, the bundler (`build.mjs`) and the test scripts are in the `StarLocks64-Starfox64-claude-opus-5-5-medium-20261026-1350/` subfolder.

A scripted headless run went through every mode with zero JavaScript runtime errors. Nobody has looked at it yet, though: screenshots weren't allowed, so the cel-shading, layout and split-screen positioning are unchecked. Game feel and difficulty haven't been tuned on a real GPU or controller either.

**What's in it**
- **Mission Mode (1–4 player co-op, split-screen):**
  - **Mission 1, Verdalis (on-rails):** sea, plains, city, then a branching route. Fly through 5 of the 6 golden arches to open the secret canyon; otherwise you go through the ground base. It has a walker mid-boss, a checkpoint and the Bastion Crab boss.
  - **Mission 2, Orbital Ring (all-range):** you fly freely with a radar, fight Jackal Squadron (three rivals who chase your wingmen), then destroy the Dreadnought's shield generators and its reactor. An ending and credits follow.
- **Versus Battle:** 2–4 players split-screen, with optional CPU pilots and a kill target.
- **Starfox-style systems:**
  - Lasers upgrade single → twin → hyper; hold fire to charge a homing lock-on shot.
  - Smart bombs, boost and brake on one shared gauge, a barrel roll that deflects shots, banking, somersault and U-turn.
  - Wings can break off; laser items repair them.
  - Silver and gold rings (3 gold extends your shield), lives and continues.
  - Hit counter with bonus hits for multi-kills, and medals per mission.
  - Wingmen call for rescue and can be sent back for repairs.
  - Radio comms with drawn portraits and gibberish voices, written in a Starfox-like style with original characters.
- **Attract mode:** after 10 seconds idle on the menus, an AI pilot loops 5 demo segments; any input exits.
- **UI:** built for a PS5 controller first, with keyboard mirroring it. Settings include **Invert Horizontal / Invert Vertical** for gamepads, plus flight-stick Y, difficulty, volumes, shake, rumble, camera and HUD size. Touch-only devices get "Controller or keyboard required" with a Settings button.

## Source Information
- **Date:** 2026-10-26 13:50
- **Source:** Starfox 64 for N64
- **Tech:**
  - Three.js r180 (0.180.0): WebGPURenderer, WebGPU only with no fallback, TSL node materials
  - Rapier 0.19.3 (`@dimforge/rapier3d-compat`): world colliders, hit volumes, ray and shape queries, wreckage and broken-wing physics
  - Web Audio: tracker-style music, synthesized sound effects, radio voices
  - Gamepad API: PS5 mapping and rumble
  - Plain JS modules and an HTML/CSS overlay, loaded from the jsDelivr and Google Fonts CDNs
- **Art Direction:** stylized cel-shading: toon materials with a hard 3-step light ramp, ink outlines of constant thickness, two-band cel explosions, a gradient sky, procedural ground patterns
- **Animation:** all procedural and code-driven: damped flight dynamics and maneuvers, walker leg cycles, boss armor plates, path-based enemy formations, cinematic cameras, physics-simulated debris
- **Testing:** lightweight only: `node --check` plus a headless Chromium smoke test driven by script, reading console errors. No screenshots, visual review, judge reviews or subagents.
- **Environment:** Claude Code CLI (headless); Linux (WSL2); browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost and tokens unknown; session time about 47 minutes (13:50–14:37 by file timestamps)

## Testing Feedback
- **Issues caught:** 1 real bug. The idle timer wasn't reset when new screens opened, so the credits after the ending dropped straight into attract mode. A session started from there stayed flagged as a demo, flown by the AI and invulnerable. It's fixed. Two other failures were bugs in my test script, not the game.
- **Critical / game-breaking:** 0. The attract bug was the most serious, but any input still got you out.
- **Most helpful test:** the full scripted walk through every state (mission, both bosses, results, all-range, ending, versus with 1+3 CPU and 4 humans, 3-player co-op, game over, continue, all attract segments). A trap on the invulnerability flag is what pinpointed the bug.
- **Least helpful test:** measuring menu FPS under the software renderer, which says nothing about real GPU performance.

## Engine Feedback
- **Liked most:** TSL node materials. The toon ramp, outlines, sky, explosions and ground patterns are each a few lines of JS with no shader strings. Rapier's raycasts with group filters made fast projectiles reliable.
- **Stuck / guessed wrong:** `setViewport` is documented as starting at the bottom-left, but the WebGPU backend passes coordinates straight through (top-left), so I checked the split-screen layout against the source. Rapier 0.19 renamed `toi` to `timeOfImpact`.
- **Most important thing I built:** the rail framework (curved corridor, rail-relative enemy paths, streamed scenery, data-driven event timelines with branching routes). Also one shared controller model, so the AI, attract mode and 1–4 humans all fly the same ship code.
- **Hardest part:** outlines without gaps on hard-edged, unevenly scaled shapes, and split-screen with shadows following each player.
- **Remove / overhaul:** the confusing import aliases (`three` vs `three/webgpu` vs `three/tsl`) for addons.
- **Change one thing:** built-in per-object outlines, or an outline pass that works with scissored split-screen viewports.

## Prompt Feedback
- **Liked most:** the deliverable spec is precise, and permission to ignore performance let the effort go into content.
- **Confusing:** "4-player multiplayer" could mean co-op or versus, so I built both. Usage estimates are requested, but "write unknown" applies since I have no telemetry.
- **Hardest:** fitting a complete vertical slice into one coherent codebase without being able to look at it.
- **The one test I'd run:** a real-GPU playthrough with a physical DualSense in Chrome and Safari to tune feel, readability and difficulty, plus frame timing for 4-player split-screen. Real iOS Safari isn't available here.