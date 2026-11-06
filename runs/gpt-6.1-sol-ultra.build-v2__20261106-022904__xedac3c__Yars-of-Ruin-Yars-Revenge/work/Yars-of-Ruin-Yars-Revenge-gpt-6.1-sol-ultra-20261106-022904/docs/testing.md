# Verification and evidence

Run `npm test` from the development folder. It reports only failures plus one pass/fail count. Targeted groups are documented in README. The exact packaged root HTML is exercised from file URLs and by the official Hub harness over an ephemeral loopback server. Verbose state and reports remain under `tests/artifacts/`.

## Final release result

The final packaged HTML passed **177 checks, 0 failures** through `npm test`: 35 simulation, 14 online mocks, 5 presentation, 6 sampled-controller, 16 artifact/interview, 58 standalone browser, and 43 actual Hub checks. Root HTML and development index.html are byte-identical. Exact final hash and online campaign state are recorded in `tests/artifacts/delivery.json`.

## Release checks

- Deterministic fixed-step rules: ordinary-action Normal campaigns with seeds 1, 1982, 1106, and 4294967295; simultaneous co-op; Assist; attract mechanics; shared reserves and exactly-once hits/rewards; shield motion and persistent holes; cannon radius and reflection; vertical-wrap targeting/collision; static’s protection/weapon matrix; final empty-shell respawn/refill/interception; missed final pass recovery; authoring export/import actually played; validated live tuning; safe idempotent local join.
- Native drawn-headless presentation: every station and core state; insect/wing/bite/respawn poses; reflection/launch warnings; FX event idempotence; equal seeded simulation hashes with drawing enabled/disabled; headless audio disposal.
- Actual standalone browser: first-run and saved music levels; master/music/effects/voice buses and mute; actual keyboard/mouse input; gamepad stub menu completion, flight and fire; rebinding; Xbox/PlayStation glyphs; disconnect; local simultaneous separate inputs; letterboxed mouse mapping; all attract cancellation families and ten-second threshold; native pause/dev/freeze-step/reset; editor invalid/valid imports and preview; actual packaged ordinary-action campaign through both transition menus and victory; normal record category; replay FX cleanup; credits; Chromium/WebKit file boot.
- Phone: Chromium mobile profile with actual concurrent CDP touch points, invisible left move/right aim regions, pointer ownership release, rotation, touch attract cancellation, and full-arena framing. `Screen.resize` is patched to permit fractional fitting below1x. Portrait preserves the entire fixed arena in a compact horizontal band; landscape gives a larger combat area.
- Audio: OfflineAudioContext rendered 96,000 finite samples; peak 0.116842, RMS 0.008605, ending tail RMS 0. Separate actual engine bus values and mute are asserted. There are no recorded audio files. Music begins at 10% and saved choices persist.
- Hub: official solo, two-player latency150ms/jitter50ms/loss5%, host-leave, dedicated-server, explicit non-host leave, short visibility loss, over20s hidden-host void, time-up, exact final-state/outcome ordering and no activity after end. Host authority/vector/membership/timing checks, action-edge retries/deduplication, keyframe recovery, packet size budgets and one host finish have unit and/or actual-browser assertions. Full campaign evidence and actual network conditions are recorded in the campaign reports.
- Packaging: pristine first session-client block, required metadata, safe complete script parsing, no fetched development scripts/assets, exact embedded report and validated exit-interview schema.

## Defects found and fixed

Fifteen distinct defects were identified through checks and review. Test-fixture mistakes (wrong control label, ambiguous Back selector, insufficient wait for the transport’s end notification, and an unstable10Hz test pilot) are excluded from this count.

| # | Fixed defect | Evidence / regression |
| --- | --- | --- |
|1|TV scaling clipped title/results actions.|Actual screenshots and title-action visibility assertion; native modal height constrained to logical viewport.|
|2|Immediate result overlays hid the collapse.|Packaged campaign verifies a 2.2 s collapse before results; campaign-collapse/victory images.|
|3|A host finish could overtake the final snapshot under latency.|Acknowledged final-state handoff and guarded finish; online unit and full shared-world round assertions. Critical.|
|4|A cosmetic title-world attract flag shadowed the actual debug mode.|Semantic mode fields now override world fields; exact ten-second and exit assertions.|
|5|New campaigns reused presentation event IDs, suppressing later effects/audio.|Presentation objects are disposed/recreated on each new world; campaign replay cleanup assertion.|
|6|The final safe refill heart retained the danger palette.|Dock/refill heart now uses mint/cyan while airborne form remains dangerous; state-specific rendered coverage.|
|7|A returning airborne Swirl was excluded from the final valid hit state.|Both flight and return count as airborne; simulation recovery/interception coverage.|
|8|The native minimum 1x scale cropped the fortress offscreen on phones.|Local engine fit patch plus nonnegative-offset/full-buffer-fit phone assertion and portrait image. Critical.|
|9|WASD could override independent held mouse aim.|Mouse aiming now follows explicit aim ownership; combined WASD/held-mouse regression.|
|10|One-pad co-op could strand title/menu control on P2.|Title restores single-player device ownership; either scout’s controller can navigate pause. Actual stub regression covers P2 pause/resume and title activation after quit. Critical.|
|11|Sector-clear Pause/settings action opened no menu.|Transition now opens the real native Settings screen and returns to the transition; packaged campaign assertion.|
|12|Custom touch pointers survived visibility loss.|Visibility and menu transitions clear ownership; actual concurrent-touch visibility regression.|
|13|Co-op ready prompts used the first scout’s device for both scouts.|Each scout now gets its own device label; remote teammates show readiness without a misleading local action. Standard-pad/P2 prompt regression.|
|14|Editor grid selected cell corners rather than authored cell centers, so Remove could leave the shield unchanged.|Controller and pointer painting now use 20 px cell centers; browser test asserts the actual authored cell count decreases before export/reload/preview.|
|15|Shared-keyboard Enter could be forwarded from both local inputs, skipping two menu pages.|Menu forwarding now respects a primary input action already pressed; browser test verifies exactly one credits-page advance per Enter.|

## Actual online full-play conditions

The two-player host campaign completed under 150 ms latency, 50 ms jitter and 5% loss, with matching victory/score on both copies. The dedicated-server campaign completed with its engine/render loop stopped and canvas hidden, with one remote scout sending ordinary controls for the final server qualification; added transport impairment was 0 for this full-play run. Its stateful test controller used read-only host awareness for planning, with no life, charge, damage or outcome mutations. Separate official dedicated-server stress checks used150/50/5, so progression proof and transport stress are not conflated. The sampled-controller suite also proves quantized 100–150 ms action holds and up to 100 ms input delay in the actual simulation.

## Evidence interpretation

`campaign-replays.json` records full Normal runs driven only by ordinary action frames. The packaged browser campaign also traverses actual scene updates, native transition actions, records and results. Corner-case fixtures jump to explicit states to test recovery; they do not replace full-play proof. Attract is invulnerable and is never used as balance evidence. The server test pilot is test infrastructure, separate from playable controls.

Physical controllers, a TV, touchscreen hardware, real iOS Safari and human listening were unavailable. Standard-mapping stubs, 1920×1080 screenshots, browser touch emulation, WebKit and offline audio are accurately labeled substitutes. No FPS target or optimization budget was imposed. Longplay failure/progression and airborne-kill footage of the original were not independently watched; source instructions verify those relationships, and the research ledger records that limit.
