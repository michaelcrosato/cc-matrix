Wands of Lore now supports AI Hub multiplayer in race mode, the hub's "playing together" option, instead of only side by side. Up to four friends explore the same dungeon at once and compete for Glory. On the final build, the official hub harness passes, the attract mode works, and the full solo playthrough passes. The file is `WandsOfLore-LandsOfLoreTheThroneOfChaos-claude-opus-5-5-medium-20261029-0603.html` in the folder root.

**How race mode plays**
- **Rivals:** other players appear as solid champions with a ring in their seat colour and a name tag, drawn about 150 ms behind. Walking into each other pushes both apart.
- **Claims:** kills and chests are first come, first served. If two players claim the same one, the earlier one keeps the Glory and the later one's Glory and loot are quietly taken back.
- **Personal fights:** Grubnak and the three-form boss stay separate for each player, so nobody can be blocked from their own quest.
- **Shared world keeps running:** menus and dialogue only stop your own input. Champions are dealt from the shared seed, one per seat.
- **Leaving:** the round carries on when any player leaves, including the host.

The protocol only allows one mode per game, so the hub no longer offers side by side for this game.

**Results on the final build**
- **Hub harness, race mode:** passes at 2 and 4 players on a laggy, lossy test network (150 ms latency, 5% loss), and at 3 players with the host leaving. That covers traffic both ways, the world moving under an open menu, progress and results, and no errors or pop-ups.
- **Attract mode:** starts after 10 s idle on the title, tours the keep and the forest with a three-champion party, and returns to the title on a key press.
- **Solo playthrough:** the scripted run goes from the title through all three areas, both companions, every puzzle and all three boss forms to the Lorewand and victory screen. Save/load and game over → Load Last Save both work.
- **Stub audit:** no TODO, FIXME, placeholder or stub markers. I removed one leftover helper that did nothing.

All of this ran on software WebGPU in a virtual display. I had no real GPU, controller or TV, so frame rate and how it looks on real hardware are unconfirmed.

## Source Information
- **Date:** 2026-10-29 06:03
- **Source:** Lands of Lore: The Throne of Chaos
- **Tech:**
  - Three.js r180: WebGPURenderer, WebGPU only, no fallback; TSL, MeshToonNodeMaterial, toonOutlinePass.
  - Rapier 0.19.3: character controller for the party and monsters; rays for line of sight and hits; physics for loot, the plate rock and debris.
  - Gamepad API, Web Audio API and Canvas 2D; ES modules loaded from the jsDelivr CDN.
- **Art Direction:** cel shading with a four-band toon ramp, ink outlines and edge lines, painterly textures drawn in code.
- **Animation:** procedural rigs built from simple shapes, animated doors and props, a first-person weapon, animated 2D portraits.
- **Audio:** all code-written: a six-theme score with a combat layer, synthesized sound effects, Animalese-style gibberish voices.
- **Online:** AI Hub Session Protocol v1 (session.js 1.3.0), race mode: shared dungeon, rival avatars that bump, claims for kills and chests, a world that never pauses, survives players or the host leaving.
- **Testing:**
  - A map checker that confirms every area can be reached.
  - Playwright Chromium in a virtual display with software WebGPU.
  - Scripted playthroughs from title to victory, plus save/load.
  - An emulated DualSense and a touch-only device profile.
  - The AI Hub harness in race mode at 2–4 players, including the host leaving.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost and tokens unknown; session time about 1 h 11 min (06:03–07:14)

**Testing Feedback**
- **Issues caught:** 15.
- **Critical / game-breaking:** 3. Too many shadow-casting lights broke rendering; a CSS rule stretched every canvas over the screen; the hub's keyboard check failed.
- **Most helpful:** the scripted playthrough from title to victory, plus the hub harness.
- **Least helpful:** plain headless screenshots, where WebGPU always captured black.

## Engine Feedback
- **What did you like most?** One-line toon outlines in TSL, and Rapier's single character controller shared by the party and all monsters.
- **Did you get stuck or guess wrong?**
  - Outlines don't appear on flat wall faces, so I drew ink lines on architecture instead.
  - Rapier 0.19 names the ray-hit distance `timeOfImpact`, not `toi`.
  - WebGPU allows only 16 textures per material, which forced a cap on shadow-casting lights per area.
- **Most important thing built yourself?** The level builder that turns ASCII maps into geometry, physics and live objects.
- **Hardest part?** Seeing WebGPU output in tests, and stopping the renderer from silently switching to WebGL.
- **Remove or overhaul one thing?** The automatic WebGL fallback in WebGPURenderer; it should be opt-in.
- **Change one thing?** A built-in outline pass that works from depth and normals.

## Prompt Feedback
- **What did you like most?** It is precise about the UX requirements and leaves the design open.
- **What was confusing?**
  - "As well as for the game on its own" is ambiguous; I built hub race mode and left single-player intact.
  - The hub asks for a WebGL 2 fallback but the prompt says no fallback. I followed the prompt and marked the game as WebGPU-only for the hub.
- **What was the hardest thing to do?** Fitting a full vertical slice plus networked race mode, with lightweight testing, into one session.
- **One test you'd have run?** Four friends on real PS5 controllers and TVs racing from the keep to the boss.