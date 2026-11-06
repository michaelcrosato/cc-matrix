# Testing issue ledger

Every discovered defect receives an ID, severity, source check and resolution here. Hardware listening, real TV, physical touch/controller and cross-network NAT traversal remain unknown; emulation does not establish them.

## Issues

## Runs
Machine-readable results live in evidence/verification.json and browser evidence files.

### Simulation and integration audit

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| SIM-001 | Minor | State-machine branch review followed by focused stock regression | Securing a board while holding an extra spare cleared the held ID without returning that spare. Completion now safely returns it to available stock. | `Held stock remains safe at board completion` |
| SIM-002 | Medium, developer flow only | Fault-injection branch review followed by focused recovery regression | Developer-injected fire on an already secure board could not receive an extinguisher command because completion blocked all tools. Completed-board fire now permits begin/end extinguisher actions and never republishes evidence. | `Developer fire cannot strand an already secured board` |
| SIM-003 | Medium, cooperative UI | Main/simulation contract audit | Vote UI tracks proposal IDs, but proposals initially lacked stable IDs, suppressing later vote panels. Every proposal now has a stable unique ID; the app must also reset its local seen-ID on case start. | `Voting rules, veto, majority and departure` checks repeated proposal IDs |

| UI-001 | Critical, terminal flow | `tests/campaign-browser.py` ordinary-input training acceptance | After a successful deliberately confirmed code, the fallback screen guard returned to title and discarded the resolved state before showing results. The root app now routes any terminal state to results before the title fallback. | Ordinary campaign training-to-results smoke and full campaign acceptance |

Simulation test evidence: `tests/simulation.mjs` exports `runSimulationTests()` for the single verification command. It presently reports 1,742 passing assertions, including full ordinary-command campaign completion, all party sizes, truthful dark evidence, wrong cuts/spares, heat/fire, stock, ownership, duplicates, stale revisions, bounded holds, voting, simultaneous expiry, editor import/export, live tuning, and deterministic seed fidelity. These are headless model checks; they do not establish browser input, rendered visibility, or listening quality.


### Presentation integration audit

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| AUDIO-001 | Minor, persisted bus mismatch | Native settings/constructor integration review | Presentation construction reset existing effects and voice levels to 1 after settings had applied saved choices and the authored 0.75 voice default. Constructor now preserves settings-applied levels, including zero, so reloads agree with the real graph. | `Audio construction preserves persisted effects and voice mute`; `Reload preserves saved independent voice mute and effects` in `tests/art-headless.mjs` |
| ART-001 | Medium, phone usability | Visual review of emulated iPhone portrait screenshot | Fixed 1.45-pixel native scale left the PCB only about 37% of phone width on a high-density portrait buffer. Portrait framing now sizes the native board to 90% of buffer width, centers it above the instruction strip, and scales focus hit regions with the projected artwork. | `Phone portrait PCB occupies ninety percent of buffer width`; `Phone portrait workspace stays between fuse and order strip`; `Enlarged portrait terminals remain reachable and inside workspace` |

Campaign browser acceptance completed with 508 checks and 273 player-facing UI actions, zero failures. A fresh desktop page navigated title, training, all three authored cases, inferred code confirmation, final ending/results, and acknowledgments. It repaired every board using ordinary pointer/keyboard controls, performed a deliberate wrong-cut recovery and wrong replacement recovery, tested actual spare diagnostics, and extinguished the controlled relay fire. No developer state writes, invulnerability, hidden-code reads, or direct gameplay method calls were used. Work, evidence and result screenshots from all four beats are in `evidence/campaign-*.png`; counts/actions are in `evidence/campaign-browser.json`. First-time human pacing remains unknown.

### Root UI integration review

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| UI-002 | Medium, cooperative touch | Network/main contract review | Guest observation state was captured before the asynchronous board claim acknowledgment. It is now derived from current authority state every HUD update. | Exported two-player UI disposal and touch ownership checks |
| UI-003 | Minor, failure caption | Simulation/main contract review | Timeout cause was checked as `expired` instead of `time-expired`, showing the wrong failure title. Corrected the exact cause check. | Browser expiry/result cause check |
| UI-004 | Minor, comfort setting | Native settings integration review | Custom view read a nonexistent reduceMotion setting instead of native game.reduceMotion. Custom camera/tool movement now uses the applied native property. | Art/audio reduced-motion checks |
| UI-005 | Medium, urgent instruction | Simulation event/caption review | Wrong-cut fault and diagnosis events could be suppressed by a recent ordinary work-order caption. Fault, penalty and test events now receive urgent caption/voice priority. | Browser recovery and diagnostic playthrough |
| UI-006 | Medium, live timer visibility | Overlay presentation review | Evidence and code menus hid the fuse while simulation continued. A single display-resolution fuse now remains visible over every active decision/menu screen and labels paused/live policy. | Browser overlay fuse visibility check |
| UI-007 | Medium, held-tool lifecycle | Native pause source review | Escape/Options toggles native pause without calling game.pause(). A native input hook now observes pause transitions, cancels tool holds and synchronizes solo sound. | Browser pause-during-solder and resume check |

Root browser suite currently passes 43 checks, including actual mouse target actions, solder holds, native pause/settings, pad polling/focus and glyph change, code confirmation, developer tuning/reset, editor import/export/playtest, expiry, credits, real ten-second attract/wake, isolated saves, blocked/corrupted storage and phone/tablet touch emulation. Additional regression checks accompany final integration changes.

### Touch playthrough review

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| TOUCH-001 | Medium, touch target reachability | Real touchscreen-tap training driver in phone emulation | A contextual action beside the left lead covered the next right lead, so a direct tap could recut the old target. The single context button now occupies a safe blank area below the portrait board or beside the landscape workspace. | `tests/touch-play.py` direct-tap complete training |
| TOUCH-002 | Medium, contextual solder assistance | Real touchscreen-tap contextual hold probe | Global pointer-up ended an assisted solder hold before its safe threshold. Assisted holds now survive the lifting finger, complete at their visible threshold, and still cancel on pause or pointer cancellation. | `tests/touch-play.py` contextual assisted solder joint |

### Cooperative transport audit

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| NET-001 | Medium, seeded cooperative replay | Adapter lifecycle review followed by a focused network replay regression | Guest start detection used only case ID and seed, so retrying the identical device did not invoke the guest start flow. Each dispatch now carries a distinct identity in authoritative snapshots. | `same-seed network replay starts a new dispatch` in `tests/network.mjs` |
| NET-002 | Critical, Hub terminal lifecycle | Exact final-state comparison against the exported HTML after official harness time-up | After the fuse expired, the short final-snapshot delivery interval set running false. The next native update treated that as permission to start a second bomb before Hub end, replacing the terminal state on peers. A separate play-started latch now permits exactly one round start and retains the final snapshot until end. | `Hub terminal state never starts another bomb before end`; exact canonical state agreement in normal, four-seat delayed/lossy, and authority-only server harness scenarios |

Cooperative verification passed 11 deterministic adapter checks; 19 checks over real secure PeerJS Cloud signaling/WebRTC in two Chromium pages; 10 checks through the exported host/join, native tool repair, inferred-code confirmation, guest-vote and result UI; and 56 official Hub plus exact authoritative-state checks. The four Hub scenarios include standard two seats, four seats with latency150/jitter50/loss5, host leave, and a host with no local player. Cross-network connectivity remains unknown. The standalone fixture also tests full-room refusal, version mismatch, unavailable room, disconnect cleanup and token/snapshot rejoin. Evidence lives in `evidence/net-*.json`.

### Final style regression

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| STYLE-001 | Medium, readable focus/portrait layout | Final screenshots after formatter cleanup | Removing important declarations exposed native inline theme defaults and more-specific touch selectors; portrait instructions overlapped the enlarged board and primary focus contrast weakened. Authored colors now use native Shell theme fields, the custom stylesheet follows native CSS, and explicit portrait/focused-primary selectors restore the intended layout and contrast. | Final phone/title visual checks and touch/controller acceptance |

### Final feedback wiring review

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| AUDIO-002 | Minor, diagnostic feedback | Simulation/audio event contract review | Diagnostic events use type `test` plus a pass boolean, while the sound layer expects test-pass/test-fail. Main now translates both diagnostic truth and wrong replacement continuity failures to their distinct synthesized tones. | Browser semantic-action sound wiring probe |
| NET-003 | Minor, remote rejection feedback | Transport/main callback review | A remote rejected command updated adapter status but the workspace did not show that status. Active crew status/rejection messages now produce a concise visible native toast. | Exported network UI and adapter rejection checks |

### Credits readability

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| CREDITS-001 | Minor, controller-readable metadata | Final 1080p credits screenshot and native panel geometry review | A long metadata page had scrollHeight589 versus clientHeight470 and initially scrolled63 pixels to focus its first button, hiding introductory fields from a pad-only reader. Source/feedback pages now show at most two entries, keeping every page inside the readable viewport. | Browser check visits all17 credits pages and verifies they fit |

### Developer session boundary

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| DEV-001 | Medium, optional online developer flow | Final scratch/authority lifecycle review | Standalone hosts could launch a solo scratch copy while their live adapter still owned a shared round, leaving scratch commands without an authoritative world. Authoring, checkpoints and single-step are now explicitly solo-only; host-authoritative balance, fuse and hazard commands remain available and broadcast. | Exported real co-op UI checks assert solo-only editor/checkpoint/step and retained host tuning |

### Native back lifecycle

| ID | Severity | Found by | Defect and resolution | Regression |
| --- | --- | --- | --- | --- |
| UI-008 | Critical, menu navigation | Exported cooperative developer-menu Return test | Custom Back handlers recursively invoked native ui.back(), causing a stack overflow; native restoration also recreated only declared Shell content, omitting injected evidence/dial panels. Removed recursive callbacks and added a game-owned public Back wrapper that restores custom panels and the title/attract screen state after native navigation. | Browser alphabet-to-evidence, developer-to-pause, credits-to-title checks and real co-op Return/Resume path |

The co-op runner also had a cleanup exception that masked its original assertion after Playwright stopped. Its cleanup now tolerates an already-closed loop and preserves the original acceptance result; this is test-harness hardening, not an additional game defect.

## Final acceptance

The final exported artifact passed **2,498 checks, zero failures**, through the single verification command. Final SHA-256: `1c63cf9cb5c7da41349fe69f0340e853c52519016e6b479c60c7f36a205aa301`. The fresh ordinary-input campaign recorded508checks/273actions against these exact bytes. There are22unique fixed game issue IDs, including3critical defects; harness/locator precision corrections are not counted as game defects. All17metadata/feedback pages fit the controller-readable viewport. Full summary: `evidence/final-summary.json`.
