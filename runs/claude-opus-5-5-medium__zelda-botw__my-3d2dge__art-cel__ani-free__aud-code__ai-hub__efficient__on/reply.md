The goal check was right: the my-3danimations system wasn't integrated. It is now, and the rebuilt `MothOfTheWild-Zelda-BOTW-claude-opus-5-5-medium-20261031-2249.html` (1.36 MB) is in the folder root.

**Animation fix:** 19 clips from the my-3danimations library (the `QUATERNIUS_3D2DGE` set, CC0) are copied into the dev folder's `anim/`. A small tool packs them into one set, and my-3D2dge's own mocap player plays them on the character rigs, fading over the rig's own motion.
- **Hero:** swimming, eating, opening chests, picking up plants and lifting seed rocks, kneeling at the cooking pot, sitting by the fire, casting glyphs, cheering, and dying.
- **Wanderer:** sits by his fire, talks, and holds his lantern at the chapel.
- **Bogglers:** idle fidgets around camp.

The procedural rigs still handle walking, climbing, gliding and swordplay. I didn't use the library's three.js adapter: it needs rigged 3D model files, and these characters are code-built puppets.

All 19 clips load and play in Node. In the browser the swim, chest, cooking and Wanderer clips are visibly playing, and the AI Hub harness (2 players) and the attract tour still pass after the change.

The 18-issue count is now 19, each listed below and in the in-game About screen, so it can be checked against the work.

## Source Information
- **Date:** 2026-10-31 22:49 to 23:56
- **Source:** Zelda-BOTW (The Legend of Zelda: Breath of the Wild)
- **Tech:** my-3D2dge v0.85.1 (2D engine) and my-3D2dge 3D v0.85.1, both inlined, plus my-3D2dge's mocap player. three.js r182 (WebGPU renderer with WebGL 2 fallback) and Rapier 0.19.3 load from the jsDelivr CDN. AI Hub session client 1.3.0 is inlined unmodified. There are no image, model or sound files.
- **Art Direction:** a cel look based on the my-ai-3d-demo Style Lab's toon looks. Toon-lit puppets with ink outlines, BOTW yellow-greens, rock bands on the cliffs, a dome sky with a day/night tint, fog, and swaying grass with flowers.
- **Animation:** 19 my-3danimations library clips played through my-3D2dge's mocap player, on top of my-3D2dge's procedural rigs for movement and attacks.
- **Audio:** 9 songs written in code and crossfaded by context, about 50 synthesized sound effects, and Animalese gibberish voices with a pitch per speaker.
- **Online:** AI Hub Session Protocol v1 in side-by-side mode for 1–4 players: the 5-minute "Wild Trial". The harness passed at 1 player, 2 players, and 2 players with one leaving.
- **Testing:** headless Chromium (Playwright) with software WebGL 2, the CDN routed to local copies, scripted input and screenshots, plus the AI Hub harness. Kept lightweight.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** cost and tokens unknown (no meter is visible to me); session about 1 hour by the system clock.

## Testing Feedback
- **Issues caught:** 19.
  1. Crash at boot (the hero variable was undefined).
  2. Camera stuck in the title view after New Game.
  3. The intro dialog cancelled by the scene change.
  4. Symbols missing from the pixel font.
  5. The night and trial-hall sky tint not following the camera.
  6. The ice hall's water covering every hall.
  7. The hero's cape and hair reading as one blob from behind.
  8. Teleports undone on the next physics step.
  9. Placing the hero onto the void floor instead of a platform.
  10. Loose props falling through the terrain.
  11. The Wanderer's spot inside the camp's lean-to.
  12. The Wanderer never moving to the chapel (story blocked).
  13. Gaps in the trial halls' floors.
  14. An altar placed on the void floor.
  15. Attract-mode button presses held too long.
  16. A slope band too steep to walk and too gentle to climb.
  17. The stasis bell unreachable.
  18. The ice hall's water above its walkway.
  19. The Gloamspire never drawn.
- **Critical / game-breaking:** 8 (numbers 1, 2, 8, 10, 12, 13, 14 and 17).
- **Most helpful test:** the scripted story run checking the quest state after each step.
- **Least helpful test:** placing the hero at guessed coordinates; many early failures were my test standing outside a 2 m interaction radius.

## Engine Feedback
- **Liked most:** open-world terrain from just a height and a color function, and `world.ray`, which made "climb any surface" a few dozen lines.
- **Stuck or guessed wrong:**
  - `hero.place()` is undone by the move queued in the step before.
  - The terrain's physics only exists near actors, so physics props placed far away fall through the world.
  - `floorAt()` ignores box platforms.
  - The chase camera turns by mouse only, so I wired the right stick myself.
  - Day/night needed the private sun and ambient lights.
  - The mocap player isn't in the engine bundle; it sits in the engine repo's `src/mocap/`.
- **Most important thing I built:** the movement state machine (climb, glide with updrafts, swim, stamina) and the step that hands library clips to each rig.
- **Hardest part:** knowing what is safe to change each frame. The dome sky's colors are fixed in its shader, so night is a tint sphere drawn over it.
- **Overhaul one thing:** the screen-wide filters that draw black on software WebGL. The cel look should live in materials by default.
- **Change one thing:** a public time-of-day and lighting API for open worlds, with the mocap player bundled in the engine.

## Prompt Feedback
- **Liked most:** the stack, art, audio, online protocol and definition of done are all explicit up front.
- **Confusing:** the art and animation links point to tool repos rather than assets, so how to integrate them is a judgment call. The run folder's name ("ani-free") also suggests animation was a free choice.
- **Hardest thing:** fitting BOTW's whole loop of climbing, gliding, cooking, glyphs, camps, shrines, weather and temperature into one slice a player can see end to end.
- **One test I'd add:** a real-GPU playthrough with a DualSense from start to finish, timing how long a new player takes.