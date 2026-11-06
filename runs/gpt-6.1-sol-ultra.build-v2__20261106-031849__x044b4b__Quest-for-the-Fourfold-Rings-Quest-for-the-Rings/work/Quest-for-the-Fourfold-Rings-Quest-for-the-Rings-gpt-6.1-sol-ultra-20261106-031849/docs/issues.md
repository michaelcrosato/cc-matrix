# Deduplicated findings

30 distinct game defects were found and resolved through automated tests, visual checks and integration review. One was critical (the first emitted file could not boot). Test-driver mistakes, fixture corrections and screenshots taken during a normal menu fade are excluded. Regression tests confirm review findings where applicable. All rows describe actual code defects or observed presentation problems, not hypothetical risks.

| ID | Severity | Detection | Finding | Resolution |
|---|---|---|---|---|
| UI001 | Critical | Emitted-file browser launch | Destination-menu delimiter blocked UI parsing and boot. | Corrected closure; final-file launch and playable paths pass. |
| UI002 | Low | Courtyard screenshot | Subtitle overlapped teaching card. | Raised caption while a tutorial is visible. |
| UI003 | Medium | Real mouse input test | A quick primary click could release before the next fixed step and disappear. | Read both the native held state and pressed edge; context taps receive the same treatment. |
| UI004 | Medium | Phone screenshot | Large permanent status, health and tutorial panels crowded the touch playfield. | Compact objective and two health strips; hide redundant labels/prompts, reduce teaching card and use touch-specific instruction. |
| UI005 | Medium | Map/ending screenshots | A live tutorial card and caption could remain over full-screen menus. | Modal screens hide those HUD pieces and transient toasts. |
| SIM001 | Medium | Continue identity test | Restoring progress reused old event ids. | Preserve validated event ids, ticks, epochs and RNG state. |
| SIM002 | Medium | Deterministic director test | A shift event spent budget without actually moving a partition. | Schedule a full warned shift and replicate its phase offset. |
| SIM003 | Low | Finite-facing regression | A partial aim axis produced NaN facing. | Normalize each missing axis independently. |
| SIM004 | Medium | Integration review + regression | Cloak inadvertently prevented contact damage from several families. | Check contact before target filtering for all five awake families. |
| SIM005 | High | Objective review + regressions | An exit camper could extract a distant teammate’s ring. | Require the living carrier at the exit; final escape also regroups living heroes. |
| SIM006 | Medium | Checkpoint review + regressions | Continue lost assisted status and tuning. | Persist both and validate malformed tuning/statistics. |
| SIM007 | Medium | Echo audit + regressions | Every copied kit attacked as generic melee. | Copy the kit’s warned melee, rune, pulse or finite decoy; no controller theft. |
| SIM008 | High | Network review + regression | Host-created dev hazards damaged heroes but their geometry was absent on clients. | Replicate extra lane definitions with phase state. |
| SIM009 | Medium | Cache/recovery review + regressions | Automatic full healing on every board and site entry made the optional healing detour meaningless. | Preserve surviving health, revive extracted partners safely, retain the room-entry safety floor, and persist/validate checkpoint health; the cache now restores a real team benefit. |
| VIEW001 | Medium | Native screenshots | Authored shapes faced edge-on. | Use the correct native south-facing orientation. |
| VIEW002 | Medium | Board screenshot | The table hid paths and northern tokens. | Correct depth bias and placement. |
| VIEW003 | Medium | Finale screenshot | Initial camera cropped dragon/stations. | Use explicit final encounter framing. |
| VIEW004 | High | Ring-drop presentation review | A dropped ring was hidden by a historical pickup check. | Render every uncarried, unsecured ring. |
| VIEW005 | Medium | Render code audit + finite-coordinate check | String enemy ids made spider motion/rig seeds non-finite. | Hash ids to deterministic numeric seeds. |
| VIEW006 | High | Hazard audit | Spider warning appeared at the source, while its strike landed at a distant target. | Mark the actual target’s shadow throughout wind-up. |
| VIEW007 | Low | Snapshot review + regression | Online Phantom had no safe re-entry preview coordinate. | Replicate the return point independently of authoritative movement. |
| AUDIO001 | Low | Event review + acoustic mapping spy | Numeric hero ids hid class identity from effect selection. | Route kit sounds using classId. |
| LIFE001 | Medium | Lifecycle review | Standalone inherited session focus-loss behavior. | Enable native auto-pause only for standalone. |
| LIFE002 | Medium | Ownership/reconnect review | Reconnected controllers lacked a resume route, and primary AI takeover could leave no human. | Consume reconnect input, restore ownership; primary fallback uses keyboard plus companion. |
| LIFE003 | Medium | End-state audio review | A later Options press could resume music after Hub end. | Ended audio remains paused and the ended scene stops accepting native pause toggles. |
| LOCAL001 | Medium | Native Shell audit | Controller two could pause but not navigate its own waystone hero choice. | Feed the active local device into native Shell navigation; validate route chooser separately. |
| LOCAL002 | High | Two-pad reconnect/AI takeover browser regression | An already-used primary pad could be reclassified as an unclaimed second pad after a mouse menu click. | Pin the primary’s native numeric pad ownership across prompt changes; explicit keyboard fallback releases that claim. |
| TOUCH001 | High | Real CDP multitouch reproduction | Lifting a movement finger over pause left a ghost stick after resume. | Process releases before the menu guard and clear touch state on menu/lifecycle transitions. |
| NET001 | High | Input packing review + regressions | A remote primary/context tap could disappear between 10 Hz bundles. | Acknowledge and retransmit rising edges alongside held states. |
| NET002 | Medium | Failing terminal replication regression | Host could finish between snapshot slots before peers received victory. | Send one reliable terminal snapshot before the sole authoritative finish. |

Detailed fixtures, historical intermediate results and current evidence are in `sim-findings.md`, `browser-findings.md`, `audio.md`, `network.md`, and `../evidence/`.
