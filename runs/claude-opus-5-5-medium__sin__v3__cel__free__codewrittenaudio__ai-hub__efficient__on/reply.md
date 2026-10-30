I added the missing standalone multiplayer. **SiNtax Error** now has an **Online Versus** mode on the title screen, alongside the AI Hub side-by-side mode. The rebuilt file is `SiNtaxError-SiN-claude-opus-5-5-medium-20261029-0327.html` (273 KB) in the folder root. A live test between two browser windows worked, and the AI Hub harness still passes.

**How Online Versus works.** The hub protocol's section on games that keep their own multiplayer says to write the netcode against a small interface (`me, isHost, players, send, onMessage, onLeave`) with an adapter for your own connection. I did that with a PeerJS 1.5.4 adapter (`peerNet()`), which goes through the public PeerJS broker.
- **Joining:** the host opens a room and shares a 4-letter code. The rival types the code or picks each letter with the D-pad.
- **Playing:** both players start the same mission at the same difficulty. Each sees the other as a blue "RIVAL" ghost, and the HUD shows the rival's live score and current area.
- **Ending:** the debrief says who won. If the other player disconnects, a heartbeat notices within about 6 seconds.
- **Hub rules:** there's no chat and no custom names, and PeerJS is never loaded inside a hub session.

**Testing of the new mode:** two Chromium pages ran against each other through the live broker. The room code connected, both started together, positions and scores arrived in both directions, and closing one tab was detected. That run caught two problems, now fixed: nothing was sent during the intro, and closed tabs weren't noticed.

The rest of the game hasn't changed since my last reply. As before, everything ran in software WebGPU at about 2 fps, with no real GPU and no physical controller.

---

## Source Information
- **Date:** 2026-10-29 03:27
- **Source:** SiN (Ritual Entertainment / Activision, 1998). This is an original spiritual successor; no SiN assets, names or code are used.
- **Tech:** Three.js r180 with the WebGPU renderer only (no fallback), its node materials, toon outline pass and bloom. Rapier 3D 0.19.3 (`rapier3d-compat`) for character controllers, rigid bodies and ray casts. Web Audio, Gamepad and Pointer Lock APIs. AI Hub session client 1.3.0. PeerJS 1.5.4, loaded only for Online Versus. All libraries come from the jsDelivr CDN.
- **Art Direction:** Cel shading with a hard four-step light ramp, ink outlines, bloom on neon signs and code-drawn textures, in a rainy neon-noir city.
- **Animation:** All done in code: block-built characters with walk, aim, flinch, cower and death-tumble motions; a scripted camera path for the intro; first-person gun bob, sway, recoil, reload and weapon-switch motions.
- **Audio:** All generated in code: five music tracks that get more intense in combat, synthesized sound effects, and Animalese-style gibberish voices for every speaking character.
- **Online:**
  - **AI Hub sessions:** side-by-side mode with a seeded start, a progress report every second, a final result with stats and awards, the probe, and time-up and end handling.
  - **On its own:** Online Versus through PeerJS, built on the protocol's netcode interface as described above.
- **Testing:**
  - Static checks: `node --check` and oxlint for undefined names.
  - Browser: Chromium under Xvfb with software WebGPU at about 2 fps. A debug-only hook speeds up the simulation for long runs.
  - Scripted runs: screenshots of each area, the full mission played by the attract-mode bot, the hack, ATV, death and menu paths, the official AI Hub harness with 1 and 2 players, and the two-browser Online Versus test.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost unknown; tokens unknown; session time about 1 h 10 min.

## Testing Feedback
- **How many issues did testing catch?** 13:
  1. Rapier crashed when rescued hostages were removed from the level.
  2. The ATV entered and exited on the same button press.
  3. The ATV stalled against a barrel parked at the gate.
  4. Hub progress was only sent when the score changed.
  5. The hub probe missed short key presses between slow frames.
  6. The pause menu popped up after respawning.
  7. The HUD showed through the menus.
  8. The About page was too dense.
  9. The settings list overflowed the screen.
  10. The radio box overlapped the HUD.
  11. The skyline sat too close to the roof.
  12. Online Versus sent nothing during the intro.
  13. Online Versus didn't notice when the other tab closed.
- **How many were critical / game breaking?** 2: the Rapier crash froze all physics for the rest of the run, and the ATV bug made the ram-the-gate objective impossible.
- **Most helpful test:** letting the attract-mode bot play the whole mission at sped-up time. It found the physics crash in one run.
- **Least helpful test:** plain headless Chromium screenshots, which came back black for WebGPU.

## Engine Feedback
- **What did you like most about the engine?** Rapier's character controller: one shared controller moves the player, every enemy, the boss and the ATV. Three's toon outline pass gives cel outlines in one line.
- **Did you get stuck or guess wrong?** I wasn't sure of some r180 export names and Rapier 0.19 field names (`timeOfImpact`), so I checked them against locally installed copies of the exact versions. I also didn't expect headless WebGPU screenshots to come back black.
- **What was the most important thing you had to build yourself?** The bullet-hit routing on top of Rapier ray casts, which sends each hit to the right target and body zone: enemies, turrets, the boss's weak point, glass, props, the gate and the gas tanks.
- **What was the hardest part about using the engine?** Keeping WebGPU from recompiling shaders. Every temporary light is pooled and switched by intensity, and the scene is precompiled at startup.
- **If you had to remove or overhaul one thing, what would it be?** The split `three/webgpu` / `three/tsl` imports and the outline pass that only works on toon materials. One built-in toon pipeline would be simpler.
- **If you could change one thing, what would it be?** Add a navigation mesh / pathfinding helper alongside the character controller.

## Prompt Feedback
- **What did you like most about this prompt?** Hard constraints on versions, WebGPU and single-file delivery, freedom on everything else, and a concrete multiplayer protocol to follow.
- **What was confusing?** "Multiplayer … for the game on its own" can be read two ways. I've now built both: side-by-side for hub sessions and PeerJS Online Versus for standalone play.
- **What was the hardest thing to do?** Fitting every feature into one finished mission.
- **If there was one test you could have run, what would it be?** A full playthrough on a real GPU with a DualSense, inside a two-player AI Hub session.