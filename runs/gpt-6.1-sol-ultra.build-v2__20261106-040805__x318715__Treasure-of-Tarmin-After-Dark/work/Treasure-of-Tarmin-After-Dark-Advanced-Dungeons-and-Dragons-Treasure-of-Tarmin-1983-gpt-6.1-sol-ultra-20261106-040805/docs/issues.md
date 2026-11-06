# Actual issue ledger

36 distinct production issues found and fixed through targeted tests and integration review. Test-fixture mistakes (incorrect counter expectations, premature fixed-time UI assertions, duplicate-selector ambiguity, and screenshot-triggered attract mode) are excluded. One critical issue was found and fixed (35). No known critical issue remains.

## Simulation/content (12)
1. Gate landing overlapped an enemy: authored landing moved to a free reachable tile.
2. Gate traversal could farm resources: transfer now spends the gate once.
3. Downed allies revived automatically during descent: down state and empty pool persist.
4. Minimum damage contradicted defense arithmetic: actual absorbed defense/guard and zero final loss now agree in preview, events and logs.
5. Malformed content could throw or corrupt import flow: validate shapes and references before applying.
6. Corrupt save counters and positions were accepted: reject nonfinite/illegal values and damaged state.
7. Reset tuning cleared modified provenance: modified status is sticky.
8. Departed allies could receive handoffs/revival: reject disconnected identities and hide revive context.
9. Trap had no harmful operation: explicit armed opening now springs the ward once; safe inspection/disarm remain available.
10. Exploration attack created a combat round then rejected its own stale round number: forward the authoritative new round.
11. Departure recomputed a locked enemy intention: preserve the announced intention until resolution.

## Network (8)
12. End handler was shadowed by the scored close override: retain an internal lifecycle close.
13. Time-up still allowed commands: stop input acceptance before finishing.
14. Immediate finish could cancel the final snapshot: bounded acknowledgement/grace delivery precedes finish.
15. Guest confirmation/full-pack feedback arrived too late for synchronous UI: validate a throwaway preview, then retain host authority and race feedback.
16. Discarded lobby reference left the WebRTC peer open: controller close owns transport cleanup.
17. Solo idle did not advance limited-duration wall-sight: independent pause-aware logical clock without strength attrition.
18. Guest countdown mixed distinct performance time origins: extrapolate host snapshot time.
19. Cancel during ICE gathering left a pending timer/listener: owned waiter cleanup and timeout regression.

## UI/input (13)
20. Full-pack slot selection bubbled into normal pack mode: stop propagation and preserve the pending transaction.
21. Controller could not select combat alternatives: R3/C cycles logical actions before commit.
22. Combat revival had no reachable control: contextual revive choice and exact ration/recovery preview.
23. Trap button labels could advance a different operation: explicit inspect/disarm/open operations and armed-opening confirmation.
24. Developer step claimed to resolve a round while only advancing time: accurately label simulation stepping in seconds.
25. Reveal-map toggle only changed presentation: also apply the model's reveal tool.
26. Attract interrupted live offer/answer exchange: exclude co-op setup and live lobbies.
27. Quick direction/shoulder taps could vanish between frames: include native pressed actions as well as held input.
28. Continue after victory entered a state that rejected all exploration: permit solo aftermath exploration while preserving treasure-claimed.
29. Network menus allowed gameplay input beneath them: gate local action application while native menus are open.
30. Network pause menu suspended local audio without a matching resume: only solo pause suspends the local audio device.

## Presentation/audio/compatibility (3)
31. Oversized weapon tips clipped the top of the view: lower and scale native overlays.
32. User input could revive stopped end-session audio: terminal stop, explicit legitimate reset, silent master and canceled tails.
33. Firefox without WebGPU failed at Three.js module evaluation before the fallback message: packaging supplies the missing numeric shader-stage constants and checks actual graphics support before rendering. Unmodified engine/dependency sources are retained.

Final evidence lives in evidence/verification.json, evidence/browser-report.json, evidence/cross-browser-report.json, tools/network-evidence/release-peer-report.json and tools/network-evidence/hub-report.json. Probe counts are not defect counts. Scenario seeding and absence of physical devices/listening are stated explicitly in those reports.

34. Custom developer sliders and long reports lacked complete pad-only adjustment/scroll controls: horizontal pad input now adjusts focused ranges/selects, directional navigation repeats, and right stick / Page Up / Page Down scroll long panels.

35. Critical: keyboard/controller Commit during a boss preparation beat recursively reissued attack and overflowed the stack. The UI now maps primary commit to continueBoss during preparation; the model independently rejects attacks during that beat without cost or state mutation. Regression covers held, basic and packed attacks plus real Enter/R2 transitions in the full normal-rules browser route.

36. The Hub-reserved Create + Options chord could also open game UI. Map now has a verified standard L3 binding (plus PS touchpad); the input hook consumes the game pause/map actions for the Hub chord while leaving the physical buttons available to Hub. Regression covers this policy branch with the standard gamepad stub.
