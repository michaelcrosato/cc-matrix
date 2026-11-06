# Issues caught during development

Counts reflect defects actually observed, not numbers of tests.

1. Oversized first-person weapon geometry obstructed view: noncritical; reduced overlay scale/placement.
2. Skeletal silhouette lacked skull/rib anatomy: noncritical; authored native parts.
3. Minotaur silhouette insufficiently bulky: noncritical; widened torso, muzzle, horns and weapon.
4. Requested wall palette not honored by native legend material defaults: noncritical; explicit tile color/material fields.
5. Enemy strike source/victim event fields reversed in view feedback: noncritical; aligned event mapping with core.
6. Pause screen dismissed itself on the next native shell step: major UI defect; use native pause state with live render lifecycle and separate solo authority pause.
7. Native shell grid made title column half intended width, wrapping/clipping menu: noncritical visual defect; explicit flex layout and title widths.

Current known critical/game-breaking issues: 0. Additional integration findings appended below.
8. Gate interaction was hidden from the second adventurer after the first used it: major co-op UI defect; eligibility now checks each adventurer's usedBy entry and explains personal transfer.
9. Combat revive existed in rules but had no reachable UI action: major co-op UI defect; contextual Revive and pack action added for nearby fallen allies.
10. An opened coffer intercepted contextual interactions before its loot, making coffer contents unreachable through F: major UI defect; opened coffers are excluded from contextual targets.
11. Combat/traversal copy could obscure the applied arithmetic: noncritical rules communication defect; boss inspection now explains cumulative seals, gates show exact capped before/after strengths, and trap warnings distinguish raw War from defense-reduced loss.
12. Victory Continue hid the ending but commands stayed locked: major completion-flow defect; explicit production continuation preserves the claimed treasure and permits exploration.
13. Brief keyboard movement taps could fall between frames because movement checked only held state: major input defect; movement now checks both fresh presses and held repeat. Browser assertions now wait for production state instead of assuming a software-rendered frame arrives within 150 ms.
14. Scorpion framing hid a low adjacent creature behind the lower HUD: noncritical art defect; downward encounter framing bias added.
15. Wraith retained a bright belt and straight legs that weakened its spectral silhouette: noncritical art defect; tucked native joints and a tapered cloak corrected it.
16. The engine's automatic Pause → Help opened a sparse default screen instead of the authored handbook: noncritical UI integration defect; native Help now routes to the complete controls/strategy screen.
17. Firefox without WebGL 2 waited indefinitely inside native renderer initialization: noncritical unsupported-browser handling defect; explicit capability detection now shows the actionable loading/retry message immediately.
18. Long credits/help initially focused the bottom Back button, and a controller could not scroll the prose: noncritical accessibility defect; text panels now focus at the top and directional navigation scrolls before reaching actions.
19. Map default used an extended Touchpad button unavailable on some standard controllers: noncritical input defect; standard L3 now opens the same automap, with Touchpad retained as an alternate.
20. Initial expedition toast could overlap a newly opened pack header: noncritical UI defect; opening a game modal now clears older transient notices while new in-modal errors can still appear.
21. Native entrance animation could leave newly opened map/pause/dev panels at opacity zero during rendering stalls: noncritical presentation defect; game modal panels now appear immediately with explicit opacity one.
22. Custom action map omitted native up/down/left/right menu actions, so keyboard arrows and D-pad could not navigate menus or scroll credits (left-stick navigation still worked): major input defect; explicit shared menu directions added and tested.
23. Native phone toast bottom positioning combined with game top positioning to stretch a dark overlay across the display: noncritical responsive layout defect; toast bottom is explicitly automatic.
24. Touch Guard selection could remain selected with no visible attack selector to switch back: major touch input defect; a committed touch guard now returns to automatic attack selection.
25. Controller could not directly select permanent weak fallback attacks: major input access defect; D-pad left/right now cycles held attack, basic War, unlocked Spirit and Guard, with R2/Cross committing separately.
26. Bootstrap forced PlayStation prompts even when an Xbox preference had been saved: noncritical preference defect; saved native glyph settings now remain authoritative.
27. Native mobile START overlapped the custom menu: noncritical touch layout defect; input now knows the game supplies its own menu.
28. Touch combat-strip CSS overrode the hidden exploration state and retained keyboard hints: noncritical touch HUD defect; hidden state is explicit and touch uses gesture guidance.
29. The custom synth mix overwrote the native Sound-off toggle on its next update: noncritical audio preference defect; native Sound-off now mutes the complete generated mix.
30. Settings exposed duplicate comfort rows and inherited touch-button controls that did not drive the assisted gesture scheme: noncritical settings wiring defect; one canonical comfort setting remains, native motion is respected, and unrelated touch-button rows are internal.

The long-menu focus fix in issue18 also rechecks focus after inserted developer/workshop content. The touch-HUD cleanup in issue28 now puts gesture instructions in the dismissible opening card and removes the overlapping persistent hint.

31. Planning-window tuning could not affect a playable co-op setup, while standalone online developer controls appeared editable: noncritical configuration-access defect; validated host invitations now disclose/negotiate2–30-second planning (8 stock), custom durations mark the expedition modified, and all online developer panels are read-only.
32. Meaningful mouse motion did not exit attract mode: noncritical input consistency defect; moving the mouse now exits and consumes the demo without starting a run.
