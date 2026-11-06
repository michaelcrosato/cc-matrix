# Release verification

Final artifact: `Yars-on-the-Edge-Yars-Revenge-gpt-6.1-sol-max-20261106-022838.html`

**npm test: 218 passed, 0 failed.** Tested the final packaged HTML, including file:// play.

SHA-256: `2547e3ed59ddde3c206e4c2bc5266db2529a056aa3c003b509788755a9c6de00`. The build is dependency-free and reproducible with `npm run build`. The source HTML copy is byte-identical to the root hand-in. The exact pristine Hub 1.4.0 client is the first script after charset. Pinned upstream engine and client were re-fetched and compared; the engine differs only by the documented boot:false fix.

## Evidence

- `test-summary.json`: complete unified suite results, all five groups.
- `campaign-41739.json`, `campaign-11.json`, `campaign-925.json`: ordinary-action full campaigns; Assist and simultaneous co-op are also asserted.
- `final-recovery.json`: a newly respawned scout, zero charge and zero live shield cells still refills and wins in flight. A separate miss-and-retry assertion passes.
- `browser-results.json`: 86 checks of native menus, replay/defeat/practice/records, keyboard/mouse, controller stubs, rebinding, per-device co-op, CDP multitouch, rotation, attract isolation, authoring, audio and WebKit.
- `network-reports.json` / `network-results.json`: 81 assertions including official solo, two-player, host-leave and server scenarios; all assert body complete and official checker pass. Stress parameters: 150 ms latency, 50 ms jitter, 5% loss. Additional authority, recovered siege presses, non-host leave, time-up, hidden-host cancellation and post-end silence/input/tick/send checks pass.
- `network-campaign.json`: one remote player plus a server-only host completes all three sectors and the airborne final phase at baseline latency using ordinary actions and no combat cheats. The client drawing loop is stopped for this simulation proof. Result victory, shared score 62077, exactly 1 host finish.
- `audio-analysis.json`: finite non-silent synthesized output, controlled peaks and zero tail; live bus levels/mute/resume/disposal checked separately.
- `title.png`, `bite-charge.png`, `refuge-swirl.png`, `reflected-shot.png`, `co-op.png`, `final-heart.png`, `final-explosion.png`, `credits.png`, phone/tablet images: inspected for presentation. Final battle/explosion views follow an ordinary full campaign.
- `release.json`: artifact hash and concise final evidence manifest.

## Scope and stand-ins

The deterministic solo pilot finishes in 83.44 simulated seconds, without deaths. This is a skilled automation route; newcomer completion time is unknown. Native controllers, touchscreen hardware, a TV, actual iOS Safari and a human audio review were unavailable. Standard mapping stubs, CDP multitouch, device profiles, 1920×1080 captures, WebKit and offline/live Web Audio checks are the explicit substitutes. Stochastic combat pilots may lose valid stress rounds; the release separates full campaign completion from transport/lifecycle conformance.

Issue ledger: 16 fixed verification issues, 10 product and 6 test/pilot; one originally blocked all browser gameplay. See `docs/issues.md`.
