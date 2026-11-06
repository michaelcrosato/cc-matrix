# Feedback log

Engine v0.89.1; AI Hub client 1.4.0. Read current README, API, assets guide and Hub protocol.

## Issues caught
1. Full-case bot found extraction could stall after a tear reduced progress. Fixed bot to pull the remaining depth; human players can already keep pulling. Not a game blocker.
2. Fermata bot approached only during the short eye opening and missed it repeatedly. Fixed anticipatory positioning and sonar. Not a player game blocker.

## Environment
The supplied ~/dev/TESTING-TOOLKIT.md is absent; use the provided command documentation. Browser engine emulation stands in for physical devices.

3. Bot dropped short fragments before reaching the 24-unit discard distance. Fixed its release gesture; no player defect.

4. Screenshot inspection found oversized caps in the ward: the projected point included depth, and spreading it into a 2D line shifted the arguments. Fixed to take x/y. Visual, not game breaking.
5. Title prompt exceeded its panel; shortened the prompt.
6. Story footer overlapped the native dialog box; raised the dialog.
7. Long tutorial barks ran outside their boxes; wrapped and shortened the visible line.

8. Full scene playthrough found Story.skip only affects newly opened engine lines. Applied skip/auto timing to the current Dialog each update; fixes Ctrl skip and attract autoplay. No campaign completion blocker for manual play.

9. Multi-bot Grand Rounds had no assigned retractor holder. Assigned the last AI seat to hold while the others cut; solo Quill now provides a half-time window.
10. Coverage inspection found Dev Mode only updated on the operation scene, although the pause item appears elsewhere. Added the same live panel to every pausable standalone scene.

11. Human-like bot aim error exceeded its own two-unit arrival threshold, stalling most cases. Widened arrival recognition to its actual aim-error envelope and kept pulls/strokes controlled. Test-bot defect, not a player blocker.

12. Small Hub frames and low-DPR narrow windows exposed the engine's hard minimum 1x scale, cropping the logical field. Allowed fractional downscaling only when the frame is smaller than 426x240. Also corrected the gesture test's CSS coordinate conversion to include engine scale and offsets. UI clipping, not a simulation failure.
13. Perfect bot kept the blade held during Cantor's inactive repeat interval and on Last Note beats. Fixed release timing; perfect finale now clears without slips.
14. Balance found the Intern double-time Da Capo window too short for the intended human-like reaction and aim error. Widened Intern lobe windows; the human-like bot now clears all Intern cases and 10/11 Resident cases.
15. Live network gesture testing prompted real sample recovery: keep six sequenced input packets and replay missed cursor/trigger transitions on the host. This protects continuous gestures under packet loss.

16. The live client stroke isolated a real mixed-input bug: engine pointer movement deliberately kept lastDevice=keyboard, so using a tool hotkey could stop mouse aiming until another click. Changed genuine pointer movement to restore mouse input immediately. This could break mixed keyboard/mouse gestures; counted as one critical control defect.

## Current verification
- 604 headless assertions passed after chapter cards, cinematic routing, practice menus and score-par calibration.
- Previous full browser run: 678 assertions passed, including 30 real seconds in Chromium/Firefox/WebKit, pad prompts, Web Audio rendering, 14 viewport sizes, phone/tablet touch notices, and official Hub conformance.
- Extended Hub checks now pass: 17 checks, including real mouse-driven client Scalpel strokes with normal networking and with four seats / 150 ms latency / 50 ms jitter / 5% loss.
- Balance: perfect bot 11/11 on both Intern and Resident, human-like bot (.25 s reaction, 3 u aim error, 260 u/s) 11/11 Intern, 10/11 Resident. Every perfect Resident result retains at least 40 pulse and 30% of the original clock.
- Visual checker dithering note was addressed by lowering the tissue shader's Bayer strength from 1.15 to .65. This is an art choice; no performance optimization work was done.
- Screenshots inspected directly: title, menu, surgery, story, ward, site/dev/settings contact sheet, WebKit phone notice. Native ward movement recorded with the engine filmstrip tool.

17. Result persistence compared score without requiring equal rank; a high-scoring checkpoint retry capped at B could overwrite an S. Fixed comparison to prefer rank first, then score within the same rank. Not a completion blocker.
18. Persisted dev tuning was applied on later launches without tagging new cases DEV. Added a tuning/defaults check at case creation, honoring normal assist/speed settings. Not a completion blocker.
19. Clinical blood ramps could be cached as the original red ramp across cases, preventing a later return to red. Cached the original ramps at module initialization. Visual only.

20. Case Files used a string entry for Replay while updating its disabled property. Converted it to a menu-item object and moved focus to Skills Lab for locked files. UI only.
21. Escape could open Pause on a reading/menu screen whose footer promised Back. Routed Cancel to the displayed parent action before native Pause; Options and P retain standard Pause access. UI only.

22. Attract idleness tracked only the first local input. Extended it to every joined input so a second controller prevents the reel and can exit it. Added an explicit second-player attract assertion. UI/co-op input issue.

The final repeat found a race in the browser assertion for locked Case Files: it read the menu before the key event reached a game update. The test now waits for the state change. This is test synchronization, not another game defect. Added direct pad checks for the required L2+R2 Code Blue chord; the input adapter now enforces it while keeping keyboard and mouse shocks on one button.

23. Network snapshots omitted the Code Blue clock/attempt state and dressing timer. A remote copy entering Code Blue could fail its HUD draw. Added those fields with a Hub-time origin for timing under latency, plus the retractor-open flag. Added remote Code Blue rendering checks. Critical multiplayer state defect, fixed.

## Final result

The final complete run passed 702 checks with 0 failures, including all four Hub runs, live network strokes and remote Code Blue. The standalone package and embedded About/exit-interview equality passed. All 23 logged fixes are complete; 2 were critical.
