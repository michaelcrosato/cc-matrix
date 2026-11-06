# Unique issues found and fixed

All issues below have been fixed. Repeated failures from the same cause count once. Test pilot timing/modality mistakes are not game defects and are excluded. Contract and manual visual reviews are included alongside automated checks.

1. **Moderate / fixed** — Repair rebuilt adjacent cover into the missile radius at a cell boundary. Caught by: Simulation boundary regression.
2. **Critical / fixed** — ES-module export syntax was embedded in a classic script and prevented boot. Caught by: Native actual-bundle VM boot.
3. **Moderate / fixed** — Hub diagnostics were called as a function instead of read as an object. Caught by: Hub integration code review.
4. **Moderate / fixed** — A repair edge was repeated on both simulation substeps at 2× dev time. Caught by: Native 2× repair regression.
5. **Minor / fixed** — March pose changed every four steps instead of every step. Caught by: Native animation contract review.
6. **Moderate / fixed** — Breach defeat was labelled as exhausted deployments. Caught by: Simulation/UI cause review.
7. **Moderate / fixed** — Flagship art extent did not connect to the authoritative emitter positions. Caught by: Geometry contract and screenshot review.
8. **Moderate / fixed** — Flagship safe-lane preview was narrower than its actual safe width. Caught by: Telegraph contract review.
9. **Moderate / fixed** — Audio/accessibility controls used undefined engine setting names. Caught by: Browser settings checks and engine API review.
10. **Critical / fixed** — Solo/title pad=null disabled native gamepad discovery. Caught by: Native standardized gamepad regression.
11. **Moderate / fixed** — Native touch START overlapped the custom pause control. Caught by: Portrait phone screenshot inspection.
12. **Moderate / fixed** — Enemy-hit and respawn flashes ignored reduced-flash preference. Caught by: Native rendering contract review.
13. **Moderate / fixed** — Controller focus could leave controls clipped in scrollable panels. Caught by: Small-screen focus layout review.
14. **Moderate / fixed** — P2 movement cancelled the P1 mouse movement target. Caught by: Local seat input-routing review.
15. **Moderate / fixed** — Assisted and ordinary records initially shared the same view. Caught by: Records requirement review.
16. **Moderate / fixed** — Touch clicks changed the active modality to pointer and showed the wrong controls. Caught by: Browser touch controls assertion.
17. **Moderate / fixed** — Hyphenated boss/saucer events lacked their intended sound and effect routing. Caught by: Hub presentation audit and native event regression.
18. **Moderate / fixed** — Victory retained an intact flagship and skipped the planetary celebration. Caught by: Terminal presentation audit.
19. **Minor / fixed** — Missed salvage disappeared without a visible expiry warning or event. Caught by: Pickup lifecycle presentation audit.
20. **Minor / fixed** — Dedicated server application sampled local controls even though authority ignored them. Caught by: Hub server ownership audit.
21. **Moderate / fixed** — Adjusting a range control by gamepad changed the prompt family to keyboard. Caught by: Menu input provenance audit.
22. **Moderate / fixed** — Back/cancel was ignored while the developer seed text field had focus. Caught by: Controller menu navigation audit.
23. **Moderate / fixed** — Spent emitter boxes stayed behind when the phase-two flagship moved. Caught by: Flagship phase-two screenshot inspection.

24. **Moderate / fixed** — A void or interrupted Hub round used a depleted-deployments result caption after its temporary end notice expired. Caught by: Hub lifecycle UI audit; fixed persistent round-void/closed captions using the actual end reason.

25. **Moderate / fixed** — The bonus saucer traveled through the score panel and lost the upper half of its silhouette behind the HUD. Caught by final coordinate/layer review; moved its authoritative lane below the panel and added a clearance regression.

Total: 25 unique issues, including 2 critical boot/control defects. Physical controller feel, human listening, actual TV distance and real iOS behavior remain unknown.
