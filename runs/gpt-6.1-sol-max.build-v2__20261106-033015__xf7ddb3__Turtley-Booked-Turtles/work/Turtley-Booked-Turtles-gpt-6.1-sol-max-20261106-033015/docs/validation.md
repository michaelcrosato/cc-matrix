# Validation record

Use `npm run --silent verify` for the complete set, or append suite names: `rules`, `browser`, `devices`, `audio`, `network`, `hub`, `hub-campaign`, `export`. The orchestrator emits only failure details and a final check count. `tuning` and `network-search` are optional exploratory legal-input pilot traces, not acceptance tests. Run covered checks again only after relevant changes.

## Unique product issues found

| ID | Severity | Observation | Fix and covering evidence |
| --- | --- | --- | --- |
| G01 | Critical / game breaking | A missing object brace prevented the initial bundled application from booting. | Corrected preset declaration; exact-HTML startup, native draw and syntax checks. |
| G02 | Major UX | TV screen inspection exposed undersized menu text because `theme.tv` is not the Shell's scaling option. | Explicit responsive native theme scale and a three-row title menu; TV screenshots and pad focus/slider tests. |
| G03 | Major touch | Contextual POP changed its label but the configured touch action list was empty. | Create the native bomb button, hide it until relevant; actual Chromium touch pointer tests and contextual screenshot. |
| G04 | Moderate network | Initial guest prediction omitted snapshot age, leaving motion behind under delay. | Timestamped host snapshots and bounded replay of recent local intentions against the same graph; latency/reorder/reconciliation checks and campaigns. |
| G05 | Moderate lifecycle | A Hub-hinted page resolving connect to null retained live-world behavior and disabled standalone attract. | Clear actual `game.live`, restore auto-pause and use active network state for title eligibility; null-connect fallback fixture. |

| G06 | Critical / game breaking | Full browser Hub campaign caught a local constant shadowing the presentation state; the authority stepped but rendering did not. | Rename the touch snapshot variable; actual Hub harness now also asserts zero native game errors, plus synchronized full-campaign playback. |

| G07 | Critical / game breaking | A cleanup edit dropped namespace initialization and broke a staged build. | Restore explicit initialization before content; native boot, exact-file browser and full unified verification. |

| G08 | Moderate online UX | Opening a local online pause did not cancel a clicked route. | Authenticated stop intent freezes that player and cancels route/buffer, including prediction replay; other players and host keep acting. |
| G09 | Moderate records | Disabling touch assistance could clear an assisted run flag. | Make the run flag monotonic and cover it through real settings/step flow. |

| G10 | Moderate lifecycle | Presentation caches and stale demo-loop events could outlive a run. | Reset rigs, effects, state and sound at run start; return immediately after a demo restart; test event id isolation. |
| G11 | Moderate controls | Intentional controller reassignment retained pad-loss tracking and reset accepted bomb edge numbering. | Clear assignment tracking and preserve per-run action sequence during control replacement; mixed/two-pad and mid-run replacement tests. |

| G12 | Moderate authoring | A missing or fractional rescue quota could pass content validation. | Require an integer quota within room count; missing-quota regression. |

Twelve unique product issues; three critical. Failed pilot games are legitimate losses rather than product defects. Two automation errors (synthetic pointers without real capture, and ending the wrong CDP touch id) and WebKit frame-timing assumptions were corrected in the test driver; they are excluded from product issue counts.

## Evidence and scope

- Native fixed-step rules cover map validation, seeded deck/first pickup, continuous cardinal movement, reversal/buffering/walls/diagonal rejection, carry speed, legal route cancellation, swept contact, exclusive passengers and home reservations, exactly-once score, dropped-baby recovery, one shared bomb, invalid/duplicate/empty actions, expiry, localized stun/recovery/no farming, beetle LOS and corner tracking, hysteresis, emergence, warnings, recharge/fresh entry/cap, damage grace, safe respawn, loss, terminal freeze and floor reset.
- Production finite-life pilots enter only through intentions. Solo seed 5 and local co-op seed 2 rescue all 26 across five floors; detailed counts and elapsed simulation time are in `build/campaign-evidence.json`. The exact bundled HTML is separately played through the native Game loop to victory/results. Fixtures for rare states and screenshots are separate from these runs.
- Application-network tests serialize real snapshots and authenticated intentions through the same Network adapter, including a dedicated host, stale/invalid/duplicate input, sender authority, leave, time-up, message cadence/payload, end silence and snapshot recovery with loss/latency. A complete dedicated-host campaign seed 3 is recorded in `build/network-campaign-evidence.json`; impaired-network legitimate team failure also converges across copies.
- The supplied, unchanged Hub harness runs on a temporary loopback OS-selected port, verifies the actual game title and polls both the completion marker and `__hubCheck.pass`. Two-player normal, 150 ms latency/50 ms jitter/5% loss, dedicated-server and host-leave scenarios are covered in `build/hub-evidence.json`. A full 26-rescue campaign with a dedicated host and two player copies passed through the real browser harness (seed 8; final playing time, remaining lives and matching scores are recorded in the evidence file). Native browser-clock stepping is paused between controlled increments; drawing is suppressed only in this long state test, with render checks separate. AI pilots read authoritative debug state to choose legal intentions, which still travel through the unmodified Hub client and bridge; no health, resource or objective edits are made; evidence is in `build/full-hub-campaign.json`.
- Standard controller input is emulated through navigator.getGamepads. Touch uses Chromium's real CDP touch dispatch with two contacts; WebKit uses a mobile/touch profile. These are stand-ins, not physical DualSense/iPhone/iPad tests. UI checks include pad navigation/back/options/sliders, independent shared keyboard seats, click-to-route, native pause/recovery, whole-floor portrait/landscape and exact 10-second attract/consumed exits.
- OfflineAudioContext runs the actual engine voice function and original formant synthesis, checking finite/non-silent/limited samples, each separate bus at zero, master mute, the 0.10 music ratio, actual live gain, duplicate-start identity and stop cleanup. This establishes generated signal behavior, not human listening quality.
- Screenshots serve visual inspection only: title/menu hierarchy at 1920×1080, carry/home matching, whole-maze composition, developer UI and representative portrait/landscape touch framing. No FPS targets or performance claims are made.
- Export checks validate the root filename, exact unmodified first Hub script, shared-world metadata, inline full engine, license, no external runtime imports/assets, matching staged/final bytes and exact interview schema/content. The self-contained file works from file://; Hub tests alone use HTTP.

## Boundaries

No physical controller, touch hardware, TV, real iOS Safari, remote human session or listening test was available. CPU stand-ins and generated audio are explicitly identified above. Source video/audio was not watched/heard. No frame-rate/profiling acceptance target was requested or claimed.

## Balance tuning

Ordinary finite-life co-op playtests motivated additional escape margin for a scarce shared bomb and replicated input. Final tier speeds are blue 1.8, yellow 2.1, red 2.4 cells/second; player 3.5 and carrying 3.15. Escalation 18/42 seconds, three lives, one active bomb, stock/supply rules and authored quotas stay intact. Every tier remains behaviorally distinct, and pressure comes from routes and encounter composition. Final regression traces are solo seed 5 and local co-op seed 2; earlier balance traces remain exploratory evidence only.

WebKit startup is verified after the real tap using native fixed-step advancement and a draw. This avoids treating headless frame pacing as elapsed simulation time; Chromium retains real touch movement/action checks.

## Final release acceptance

The full unified command passed 273 checks with zero failures. After the final missing-quota guard and matching interview text were packaged, 92 relevant rules/browser/visual/export checks passed again with zero failures. The last change affects validation of invalid future content only; ordinary campaign data and rules are unchanged.

Final HTML: 1,396,458 bytes, SHA-256 b72ceaeab689e8cd27a199acf6f8f1fc367dc64a8abb94ae116eef9e4f21baf7. Latest actual dedicated-host/two-client Hub campaign: seed 8, five floors, 26 rescued, 14,750 shared score on every copy, one life left, 222.04 playing seconds, all copies ended, zero native errors. All owned test processes and temporary servers are closed.
