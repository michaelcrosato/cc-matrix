# Issue ledger

| ID | Severity | Exposing check | Fix | Confirmation |
| --- | --- | --- | --- | --- |
| I01 | Critical (boot) | Build syntax validation | Closed nested input-preset object. | Build passes. |
| I02 | Medium (accessible navigation) | Browser title → quick play → trial | Set explicit labels so decorative arrows do not enter button names; put theme after native Shell CSS. | Title → quick → trial → two-lap finish passes. |
| I03 | Medium (setup preview) | Browser course/car preview and error capture | Supplied a proper driver identity in minimap preview state. | Browser preview and complete two-lap flow pass. |
| I04 | Critical (grand course progress) | Clean AI lap matrix after replacing overlapping grand-road curves | Reused exact base-road edge samples; allowed a car-width projection transition at corners while retaining local edge continuity and directed physical gates. | All five grand-course car profiles finish cleanly; no illegal projection transitions. |
| I05 | Medium (tour passport) | Complete input-driven 11-stop tour | Require the discovery radius before ending the exploration stage. | Full tour completes with the forest stamp. |
| I06 | Critical (online completion) | Same-tick authoritative finish regression | Order same-tick rule updates by authoritative event ID; reject duplicate/stale events. | Core regression and complete direct match/rematch pass. |
| I07 | Medium (touch layout) | Phone landscape setup button interaction | Bounded setup minimum height to viewport so native panel scrolling can reach Start. | Phone Chromium and tablet WebKit multitouch, pause/resume and rendering pass. |
| I08 | Medium (online menu) | Real two-context WebRTC match and Escape | Consume the opening Escape so native Shell does not also interpret it as Back on that tick. | Real-channel menu, diagnostics, complete scored match and rematch pass. |
| I09 | Critical (online disconnect) | Real host page closure after rematch | Added explicit pagehide channel close and an 8-second application liveness deadline; finished peers continue compact heartbeats until rematch/leave. | Real host closure ends guest cleanly within the deadline; 14 direct checks pass. |
| I10 | Critical (couch seats) | Shared-keyboard steering/braking separation | Reapplied native per-seat half-keyboard maps after setup instead of the solo aliases; preserved Enter for menus. | Shared-keyboard independent steering, braking and pause pass. |
| I11 | Medium (AI traffic) | Complete scored couch duels with two emulated drivers | Gave two-car AI route-aware opposing lanes so a faster motor can pass instead of following a center-line queue into a scoreless draw. | Core AI passing regression and both controller-seat scored-duel checks pass. |
| I12 | Medium (gate contact) | Contact-push gate regression | Retained the prior authoritative motion point so a physical push across a gate is observed on the next tick; reset anchors clear that history. | 32 core checks and the full 171-check integration suite pass. |
| I13 | Low (TV preview) | Final 1920×1080 setup still | Added vertical room to keep the third car-comparison bar visible while preserving phone viewport bounds. | Final 1920×1080 still shows speed, pickup and cornering bars together. |
