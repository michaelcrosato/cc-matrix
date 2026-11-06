# Requirement → implementation → evidence map

| Requirement | Implementation | Verification |
|---|---|---|
| Source-specific rescue, purple captives, dual drives, mine-layers, 20/5/1 | config.js, sim.js, assets.js | original manual/screenshots; deterministic rescue/combat tests |
| Real random title draw from 50 | project.json | node:crypto.randomInt draw recorded in PROGRESS.md; all output/report/title strings agree |
| Full engine native pixel style and animation | full vendor engine; assets.js, render.js | native headless draw; inspected title, opening, minefield, carrier screenshots |
| Beginning → escalating sectors → organs/prisoners/core → extraction → results | mission definitions and Simulation director | ordinary-action whole-operation pilot; boss phase/event coverage; data-driven carrier quota regression |
| Cannon-free three-minute Evasion with survival/rescue score | mode modifiers in the same Simulation | idle-threat regression, full no-cheat pilot, timeout extraction and cannon tests |
| Immediate flight, independent aim, normalized directions | input.js, Simulation.step | device/browser tests; direction/aim unit checks |
| Windup → committed burst → recovery, no immunity, release gate | ship drive state machine | energy/denial/release/commit/swept mine and rescue tests |
| Fragile crystals, contact precedence, exactly-once scoring | slot/ID ledgers and collision order | three-hit warning/loss, same-tick collision, duplicate rescue checks |
| Deploy/arm/active/disarm, linked ownership, three formations | formation data + mine state machine | field ownership, harmless arming, safe spawn/collar tests |
| Guard windows, interceptor telegraphs, carrier hull solidity | enemy states, swept box test | full pilot enemy coverage; native rendered scenario; core/hull death race |
| Quotas never become unwinnable | replacement director and fallback layer | reachable replacement / rank-penalty fixture, checkpoint flow |
| Checkpoints, retry, explicit resume, safe new run | App storage + checkpoint reconstruction | baseline restore unit tests; browser reload/resume/failure/retry; malformed/denied storage |
| Solo standard pad, keyboard/mouse and couch shared ship | E.Input + resolve + native allowJoin/addPlayer | standard-pad stubs, mouse aim/click, live two-seat authority, swaps and both disconnect paths |
| Native shell hierarchy, focus, rebind, prompts, Xbox | E.Shell TV theme and action labels | pad-only menu paths; pointer hover/click; binding and glyph tests; 1080p review |
| Assisted invisible touch with simultaneous steering/burst | pointer-ID Touch adapter and safeAim | phone/tablet in portrait/landscape; multi-contact, cancel, pop button, menu/help; WebKit smoke |
| Attract at 10s, real demo, any-input consumed, isolated persistence | E.Arcade idle plus separate demo Simulation | threshold, settings idle exclusion, loop/carrier, all wake families, record comparison |
| Developer tools, validated sliders/reset and read-only online | native Shell rows + same balance/commands | unit and browser slider/reset/step/selector/overlay checks; repeat-scenario and Evasion-exit checks; online rejection checks |
| Original music/effects/three radio voices; music 10% | E.Audio instruments + Web Audio formants | OfflineAudioContext finite/RMS/peak test; actual three-profile voice scheduler; music bus defaults, mute/pause/end cleanup |
| Unmodified Hub client first head script, actual metadata | bundler | exact byte comparison / one banner / tag assertions; file:// boot |
| Authority, authenticated intents, roster/clock/lifecycle, server host | Network adapter | protocol/clock/forged/stale/duplicate/recovery/finish/leave tests |
| Hub rate/size and terminal tied standings | compact reliable snapshots + 12Hz intents | actual maxBytes/maxRate; official standard/impaired/host-leave/server/solo harness cases |
| Actual shared co-op rescue/completion | one Sim authority across two independently running copies | separate browser cooperative pilot evidence, ledger and terminal comparison |
| Canonical reports and catalogue | src/report.json → HTML and exit-interview.json | schema/enums/key-order/array-order/title validation; four in-game group pages |

The expert automated operation duration is evidence of reachability, not a claim to have measured a human first-run duration. Physical controllers, real touch hardware, iOS Safari, human listening and a real television cannot be tested here; emulated stand-ins and screenshot review are reported as such.
