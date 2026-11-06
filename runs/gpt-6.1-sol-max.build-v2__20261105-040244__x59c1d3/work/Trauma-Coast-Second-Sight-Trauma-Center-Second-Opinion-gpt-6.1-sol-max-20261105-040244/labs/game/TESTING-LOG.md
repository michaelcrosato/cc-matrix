# Testing log

Issues are added when a check demonstrates a defect. Critical means a game cannot start or complete.

## Issues
1. CRITICAL — full bot playthrough: projected zigzags could place the last stitch too close to its predecessor and stall a case. Bot now follows wound normals and explicit spacing.
2. CRITICAL — full bot playthrough: stabilizer triage considered only the current table, allowing an offscreen patient to die. Bot now stabilizes the lowest patient.
3. CRITICAL — full bot playthrough: optional strain wounds could monopolize the surgeon while parasites multiplied. Required threats now precede optional cleanup.

4. CRITICAL — full bot playthrough: overlapping wound and Solace targets could steal an active stroke. Scalpel and Suture now keep their target until completion or tool change.

5. CRITICAL — headless startup: registered developer action names used hyphens; the engine requires camelCase. Renamed them to surgeryControl and surgerySpawn.
6. Non-critical — typecheck caught nullable inspector/input handles and geometry/API signature mismatches before browser execution.

7. CRITICAL — browser boot: the custom action map tried to rebind reserved pause controls and inherited forward/back movement names. It now uses the system pause action and an explicit movement tuple.

8. CRITICAL — limited-colleague playthrough: old incision wounds incorrectly became deep lacerations and laser off-target time accumulated across valid hits. Only lance wounds now deepen; valid hits and tool changes reset the laser timer.
9. Non-critical — Code test: a shock could release a partly filled stabilizer as the Code ended. Shocks now clear the held instrument charge.

10. CRITICAL — integrated browser boot: an unnecessary readiness-property override threw after startup. Removed the override; the native inspector already exposes readiness.

11. CRITICAL — WebGPU visual boot: live mesh capacity was initially filled with repeated large triangles, causing extreme overdraw during first-frame warm-up. Buffers now begin as degenerate triangles with bounds preserved, so only authored geometry draws.

12. CRITICAL — visual field check: the geometry-kit attribute subclass copied the supplied arrays, so CPU buffers changed while the rendered field stayed degenerate. The live mesh now writes the retained geometry attributes themselves, as the public API recipe requires.

13. CRITICAL — case-four bot sweep: Gel coverage at the angular seam could quantize to the opposite sector and never finish. Coverage now wraps its circle and the bot aims at sector centres.
14. Non-critical — TV field screenshot: sphere triangles faced inward and specular light washed blood pools white. Corrected sphere winding and reduced surgical-light highlights.

15. CRITICAL — browser startup after adding tissue relief: a material referenced its procedural texture before registration. Registered the texture first and added a fast visual-asset registration check.

16. Non-critical — typecheck caught an accidental overwrite of the visual asset module during an edit. Restored the full definitions; the registration check covers them.

17. CRITICAL — cooperative finale playthrough: Gel on a closed incision could project its duplicate endpoint to the start and stall the bot. Loop coverage now wraps, and the bot aims just before the endpoint.

18. Non-critical — Free Surgery screen check found that the two Gifts were not selectable in score attack. Added an explicit choice backed by a scene setting.

## Prompt friction
- The supplied testing toolkit document is absent; built-in Playwright and the supplied instructions cover the required checks.
