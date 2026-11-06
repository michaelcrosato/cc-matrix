# Requirement / evidence ledger

The finished game is the root single HTML. The complete check command is `npm test`; it rebuilds that artifact, captures detailed logs under `reports/test-logs`, then prints failures and one count. `reports/test-results.json` records the checked artifact SHA and actual suite counts. Final result: 310 distinct checks pass with zero failures across 15 suites. The full run passed 309; a final storage-denial notice added one assertion, and all affected browser/product checks plus the actual final-file Hub matrix were rerun (156 checks). Both run reports and their artifact hashes are retained.

| Requirement | Implementation and actual evidence |
| --- | --- |
| Coherent substrate and packaging | Full unmodified my-3D2dge0.89.1,8ecc2f62353761187bdfe226f327b7ea5d2eb691. Unchanged Hub client1.4.0,35a1047f2067b2af3de3943f0fe452f39105d869, firstscript aftercharset. All game art/audio/code/content inlined. Product checks parse all scripts and inspect metadata/imports/license. File-based Chromium/WebKit startup tested. |
| Complete authored expedition | 27 meaningful chambers,5 sections,10 wilderness landmarks. Axe→forest→boat→river→key→wall→summit, guarded ladders, optional caches, both3-wound guardians,2crown halves and real ending. Content graph, stableIDs, supply budgets and safeanchors validate. Authoring guide demonstrates the actual Cairn chamber. |
| Legitimate full clear | Simulation52-check suite includes production-command director through actual E.Game.advance fixedclock. Perfect-knowledge solo sprint141.267s,48shots,30hits,13banks,4treasures,0deaths/restarts/damage,unassisted. It does not warp/grant/kill/load/skip phases. Human first-play duration is unknown. |
| Bow, survival and information | Swept segment/diagonal collisions, bounded reflections, self-hit afterbank, no ordinary partner damage, recoverable misses/ooze sheds, atomic pickups/overflow, supply yield/reset, wall-clipped fog and temporary arrowlight, corridor acoustic hearing/investigation. Explicit attackstates, damage immunity, solo/co-op down/revive/reserve spending, atomic checkpoint restart and assisted defeat continuation have state tests. |
| Native world and animation | Native shaded pixel assets/rigs, exact bow hand/projectile alignment in8directions, articulated species/guardians, simulation-driven nock/release/recoil/walk/listen/dash/hurt/down/revive/pickup/climb/boat/celebrate. Hiddenenemy test forbids body,shadow,label,telegraph. Separate diagnostic overlays use actual geometry/path/hearing/visibility. Native headless draw checks exercise all branches. |
| Input and front end | Same engine shell/screens for devices. Mouse hover/click/aim, WASD, held-fire single shot, PS/Xbox glyphs/rebinding, standard-pad movement/loss, solo pause, shared couch pause and2device assignments tested. Touch realtap/move/cancel and physical bank-assist progression tested with phoneprofile; optional dodge assists verified. |
| Save and developer tools | Two alternating checksummed envelopes retain full current/restart snapshots. Corrupt/unsupported/interrupted saves and storage denial and its visible, non-blocking memory-only notice tested; low-ammo resume is separate from fullrestart. Attract/Hub/guest/dev do not overwrite ordinary saves. Live sliders/reset and zero-speed single-step tested. Seed changes only decoration; authored progression stays fixed. |
| Attract | 10second threshold, dismissal/consumedinput, identical savedbytes, no connection, caveexploration, corridor cue, actual banked gongshot, forest/ferry tool-map transitions and bothguardian stages tested. Isolated cheating director is not full-clear proof. |
| Code audio | 26distinct original cues rendered through OfflineAudioContext: finite,nonzero,bounded and clean tails. Live buses verify10%default,3.5%listen duck,unlock,cues/voice,cleanstop. Original score, ambient cues and gibberish; no media files. Human listening unknown. |
| Direct co-op | Real RTC two contexts play the actual artifact. Sub-send-interval press spends1arrow,contested7shaft pile creditsonce,bothplayers wound sameguardian,tools/relics/enemy/quiver agree,sharedvictory once. Real guestdeparture afteraxe→hostlegitimate solo finish. Existing solo expedition→invitation,protectedguestspawn,freshepochreconnect and hostloss tested. Default actualHost/Join/Connect UI exercises boundedSTUN→LAN fallback. |
| AI Hub | Actual unchanged harness matrix:2players;150ms latency±50/5%loss;hostleave;dedicated no-player authority;1player;explicit2player guestremove.79harness checks plus14actual-game checks=93. No title/attract,commonclock gate,rosterlocalIdnull,dedicatedtickadvance,avatar removal,endcleanup,≤16sends/s and≤16KB tested. Harness protocol compliance is separate from real-peer combat agreement. |
| Credits and metadata | Source Information and all4/6/4feedback answers in game and root exit-interview.json; required schema/catalogue/tags/title/usage validated. Research links and actual inspected scopes in docs/research.md and docs/network.md. |

## Distinct defects discovered by testing and fixed

Count:12. Four were game-breaking for the affected path. Repeated assertions and test-driver mistakes do not increase this count.

| ID | Severity | Finding and fix |
| --- | --- | --- |
| SIM-001 | Critical | Root corridor stopped before its junction; reachability validator caught a mandatory progression blocker. Extended authored link. |
| SIM-002 | Moderate | Conflicting stable entity/room IDs; validator caught collisions. Namespaced and renamed IDs. |
| SIM-003 | Moderate | Navigation steering stalled against a diagonal low bank; complete replay caught it. Added radius-aware passage steering. |
| SIM-005 | Moderate | A fractional actor position beside a bank had a blocked cell center, and navigation accepted an edge crossing the bank. The full real-peer campaign caught it. Pathfinding now checks physical clearance along every edge, validates fractional anchors and rechecks cached connectors. |
| R-001 | Critical | A renderer refactor renamed call arguments incorrectly, causing ReferenceErrors. Actual native draw tests caught it; corrected arguments. |
| R-002 | Moderate | Gameplay FOV excludes wall centers, so direct fog masking hid bordering walls. Screenshot review caught floating-floor presentation. Render facing wall edges next to known floor without revealing hidden enemies. |
| P-001 | Moderate | Later engine CSS overrode title font, pushing choices beyond the TV view. Screenshot review caught it; stronger gameCSS specificity and3line title. |
| P-002 | Critical | Retained title option kept cave camera/map setup in title mode. Artifact cave check caught an invisible gameplay world. Explicit title:false on gameplay updates. |
| P-003 | Moderate | Boot-to-title stopped procedural audio and play never resumed its lifecycle. Actual audio signal/lifecycle test caught it. Rebind/resume on new simulation; acoustic adapter follows current world. |
| N-002 | Moderate | Cancelling during offer creation could leave pending signaling and contaminate retries. Realbrowser regression caught it. Generation/abort/timeout isolation. |
| N-003 | Critical | After guest departure, orphaned ICE later failed and halted the remaining authority. Long real departure/full-clear test caught it. Close/detach departed transport while retaining host authority. |
| N-004 | Moderate | PublicSTUN did not answer in this environment and defaultUI could not produce a usable local invitation. ActualUI test caught it. Bounded fresh-peer fallback exports fully gathered LAN candidates and explicitly labels scope. |

Inspection/review also fixed retained aim, optional touch dodge state, duplicate clock scaling, revive progress, couch menu behavior, dev display consistency, zero-clock stepping, physical touchbank targeting, attract beats, unused supply yield, and truthful diagnostics. These are recorded separately rather than relabeled as test-discovered defects.

## Practical limits

No physical controller/touchscreen/TV, real iOS device, human listener or independent WAN peer exists here. Standard mappingpad stubs,touchprofile,WebKit,1920×1080screenshots and actual locally paired browsers are the stand-ins. WAN/NAT compatibility and18–25minute human first-play duration remain unknown. No performance or FPS target was imposed or claimed. STUN discovery is public; no TURN credentials/backend are bundled. Local/couch play does not require network access.
