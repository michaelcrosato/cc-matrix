# Closed implementation issue ledger

40 distinct issues were found by automated checks, code audits and screenshots, and corrected. Four are critical because they prevented startup, removed the central 3D picture, prevented promised two-view co-op, or stranded a standalone top-level menu. Acceptance-audit integration gaps count as issues. This is a construction ledger, not defects remaining in the release.

| # | Issue found | Evidence and correction | Severity |
| --- | --- | --- | --- |
| 1 | Flak exceeded available evasive displacement | Geometry/evasion regression; narrower real volume, longer warning | Major |
| 2 | Warning cache survived replay | Reset regression clears once-only cache | Major |
| 3 | Urgent radio left stale chatter queued | Audio audit; clear interrupted queue | Minor |
| 4 | Cockpit gauges cropped at viewport edge | Screenshot; repositioned gauges | Minor |
| 5 | Outlined cloud clusters cluttered sky | Screenshot; unoutlined native low-poly meshes | Minor |
| 6 | False engine-fire animation initially | State audit; require truthy fire state | Minor |
| 7 | Gun pitch disagreed with round direction | Transform audit; match authoritative aim | Major |
| 8 | UI arrow helper failed parsing | Package build; corrected declaration | Critical |
| 9 | Settings Back recursed | Shell audit; use native back stack | Major |
| 10 | Live map cleared by stale pause stack | Browser/audit; clear pause before navigation | Major |
| 11 | Normal/Hub settings exposed dev tuning | Settings audit; filtered preferences and Hub write guard | Major |
| 12 | HUD replacement lost pointer clicks | Input audit; immediate pointer actions | Major |
| 13 | Portrait origin cropped crew faces | Screenshot/API; correct top-left coordinates | Minor |
| 14 | P2 could not own native menu focus | Pad stub; scope menu input to owner | Major |
| 15 | Pilot aim did not update look | State audit; authoritative look forwarding | Minor |
| 16 | Damaged sight kept precise reference | Acceptance audit; quantized coarse reference | Major |
| 17 | Voice gain overwritten by native apply | Settings/audio audit; native voiceVolume | Minor |
| 18 | Free-camera controls not wired | Tool audit and public movement regression | Minor |
| 19 | Touch gunnery lacked firing action | Touch audit; held contextual burst | Major |
| 20 | Touch lacked held jettison path | Emergency screen and deliberate hold | Major |
| 21 | P2 map committed as P1 | Authority audit; preserve initiator identity | Major |
| 22 | Dogleg risk promise was cosmetic | Comparison regression; actual coastal barrage interval | Minor |
| 23 | Exchanged pilot did not receive command | Simulation/co-op regression; atomic transfer | Major |
| 24 | Same-station claims reset aim/flooded radio | Attract/state audit; idempotent claim | Minor |
| 25 | Outside jettison release could leave timer active | Capture/cancel on pointer release and back | Major |
| 26 | Guest gunfire lacked sound after event trimming | Audio/network regression; shot-counter fallback | Minor |
| 27 | Debug omitted attack paths/collision/encounter gates | Acceptance audit; native geometry visualization | Minor |
| 28 | Scene entry erased co-op split | Lifecycle/browser; apply split in play enter | Critical |
| 29 | Hold overwrote manual power changes | Input audit; manual throttle override | Major |
| 30 | Debrief preceded runway touchdown | Full-input review; actual stopped runway endpoint | Major |
| 31 | Editor Back lost injected dev toolbar | Browser; rebuild tools after native back | Minor |
| 32 | Touch opening release clicked new Close | Touch event trace; consume opening pointer click | Major |
| 33 | Duplicate native START on phone | Screenshot; declare custom menu to native touch | Minor |
| 34 | Practice leaked into normal sortie | Public replay audit; clear normal-brief practice state | Major |
| 35 | Native buttons stayed at 13 px on TV | Screenshot; inherit accessible button sizing | Minor |
| 36 | Cleanup briefly used undefined draw argument | Source review before release; restore call, undeclared-variable lint | Critical |
| 37 | Firefox Three import crashed before fallback | Early-error trace; standard missing GPU constants enable native capability explanation | Minor |

| 38 | P1 first-person frame/barrels intermittently vanished in split view | Repeated Chrome/WebKit pixel checks; independent native camera-space overlays and per-viewport pass | Major |

| 39 | Native Back/Options could hide the only title/results menu and strand an inactive scene | Explicit retained top-level menus; title Escape/Circle/Options and result menu regression | Critical |

| 40 | Review briefing was replaced by queued title scene entry | Pass briefing intent through the native scene transition, then build briefing on entry | Major |

Excluded: test-server path error, wrong working directory, a bot retaining its bank command, an input bot ignoring flak, test inputs inside the intentional 0.22-second transition debounce, ambiguous Back selectors and an invalid linter flag. These are fixtures/commands, not game issues. Software WebGPU device loss and absent physical hardware/listener are environment limits.
