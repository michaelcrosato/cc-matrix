# B-17 Cross Channel Chaos — complete

The requested game and handoff are complete. No required implementation work remains.

## Deliverables

- `B-17-Cross-Channel-Chaos-B-17-Bomber-gpt-6.1-sol-ultra-20261106-043517.html` — finished self-contained game in this folder’s root; 4,904,338 bytes. Opens with file://, no adjacent assets, install, CDN or server required for standalone play.
- `exit-interview.json` — exact TASK schema, parsed and matched to the game’s embedded `content/credits.json`.
- `B-17-Cross-Channel-Chaos-B-17-Bomber-gpt-6.1-sol-ultra-20261106-043517/` — complete source, pinned native engine/dependencies, content, build/test tools, research, handbook and evidence. See its README.md.
- Artifact SHA256: `fdb98be625f8249b3667ba6ceaad98f1a4bda925a54aa0ddc9647cbbf55f3728`.

## What shipped

Operation Copper Tide is a complete roughly 10–12-minute sortie: route/payload/skill briefing, controllable assisted takeoff, shared heavy-aircraft flight/resources, four directional guns, fighters, evasive flak, finite ballistic bombing, target components/optional objectives, consequential subsystems/emergencies, return, physical assisted landing, debrief and fresh-seed replay. Includes keyboard/mouse, standard pad support, touch assistance, two local native views, AI Hub shared-world 1–2 crew/playerless host, three practice scenarios, pause/settings/handbook, dev tools/live tuning/mission JSON authoring, procedural audio and isolated ten-second attract demonstration.

The title was chosen with Node crypto.randomInt from 50 silently authored riffs (draw 42). Research follows the original instructions/developer history and directly inspected source screenshots; no original pixels or recordings are included in handoff assets.

## Final verification

From the dev folder: `npm run verify`. It rebuilds quietly and runs all suites, printing only failures and one count line.

Final exact-artifact result: **579 checks, 0 failures**, exit 0; all 14 aggregate suite entries passed. Evidence is in `docs/verify/last-run.json` and `docs/verification-summary.json`.

- Simulation: 141 checks, all nine payload/difficulty whole sorties and physical runway endpoints.
- Audio: 37 OfflineAudioContext checks.
- Browser/UI: 223 assertions across nine scenarios, including Chrome/WebKit native WebGL, pad/mixed co-op, glyphs, pause/menu ownership, dev/editor, replay/navigation, touch holds/multitouch, attract exits, copied-file offline startup and Firefox support screen.
- Focused native split rendering: 102 checks in Chrome and WebKit, repeated frames, pause, handover and solo recovery after departure.
- Public native keyboard/mouse whole sortie: 8 checks; mission complete at 619 active seconds, 32% fuel, 86% hull, four fighters, two bombs, sixteen actual keyboard evasion moves, no cheats.
- Hub: all five scenarios, 66 admission checks, zero warnings; normal, 150 ms latency/50 ms jitter/5% loss, guest leave, host leave, playerless server. All nine terminal copies remained stopped, muted, silent and send-free after actual Escape input; hosts report once.
- Native engine source has no edits. Independent native camera-space overlays and per-viewport passes keep both first-person views stable. Standard missing GPU constants allow native WebGL capability checks before unsupported-browser messaging.
- 40 implementation issues were corrected, four critical. Closed ledger: `docs/issues.md`; test-fixture mistakes excluded.

## Confirmed limits and cleanup

Native WebGL2 is the default. Software WebGPU lost its device in this environment; the cause is unknown. Installed Firefox has no usable WebGL2 and shows a useful support screen. No physical controller, real phone/tablet/TV, second human or listening validation is claimed; prescribed stand-ins were used.

All owned browser processes and ephemeral loopback test servers were closed. No neighboring runs were changed, no fixed ports were used, and no external publishing or messaging was performed. Usage is `added on import`.
