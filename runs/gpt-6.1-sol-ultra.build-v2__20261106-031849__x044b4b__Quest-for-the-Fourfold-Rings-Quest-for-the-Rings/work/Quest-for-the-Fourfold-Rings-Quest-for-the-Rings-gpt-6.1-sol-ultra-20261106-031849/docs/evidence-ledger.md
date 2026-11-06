# Acceptance and evidence

The playable artifact is the single HTML at the workspace root. `exit-interview.json` is its catalogue/interview record. `tools/build.mjs` inlines the interview and runtime modules, escapes internal script-closing strings, places the exact unmodified Hub client first, and excludes all development harnesses and evidence.

All checks run behind `node tools/test.mjs`. Optional suite names select affected coverage. A successful check proves its stated assertion, not an unobserved human playtest. JSON browser/Hub/integration records include the actual emitted artifact hash. `evidence/test-last.json` stores the most recent invocation; the final complete invocation supersedes intermediate results in module notes.

| Requirement | Evidence |
|---|---|
| Complete ordinary expedition, eight rooms, two caches, four rings, four final seals, ending/replay | `evidence/playthrough.json`; independent objective event assertions and recorded ordinary inputs |
| All ten unordered hero pairs, distinct native timelines and nondamaging kits | `evidence/simulation.json`; ten complete ordinary campaigns and targeted kit tests |
| Both partition states, safe spawns/fallbacks, no class gate, timed hazards, crystal/phase/lava constraints | Simulation schema/path and actual-action checks |
| Companion rescue/stuck recovery in each family, ring pass/drop/recovery, revive priority, wipe/retry, Continue, cache idempotency | Simulation rules and checkpoint regressions |
| Native game loop, no renderer/camera dependency on authority, valid inline packaging/interview | `evidence/integration.json` |
| Final-file launch, menus, keyboard/mouse, emulated pads, local join/reconnect, native rebind/dev/credits | `evidence/browser.json` |
| True simultaneous touch pointer ids, powers/context, cancellation, phone/tablet extraction and resizing | Browser CDP touch tests; phone/tablet profiles are hardware stand-ins |
| Ten-second attract boundary, all device exits, full showcase loop, save isolation | Browser controllable native stepping assertions |
| Procedural score, effects, gibberish, independent routing/mute, exact 10% music default, pause/teardown | `evidence/audio.json`; real OfflineAudioContext samples and native ChipAudio lifecycle |
| Hub adapter authority/sender/vector/sequence/epoch/rate/edges/terminal state | 23 adapter assertions from `src/net/hub.test.mjs` |
| Real protocol conformance: ordinary, bad network, host leave, server-only, solo, nonhost leave | `evidence/hub-conformance.json`; six actual vendored harness cases, each `__hubCheck.pass === true` |
| Real shared damage, ring pickup/pass, down/drop, safe revive, extraction/room progression | `evidence/hub-gameplay.json`; server plus two browser-controlled clients, ordinary commands |
| Entire server-only campaign, unique ring/seal commits, shared escape, one correct won/standings result, peer convergence | `evidence/hub-campaign.json`; actual AI Hub transport throughout |
| TV legibility, distinctive heroes/enemies, crystal/shift/flame feedback, map composition, finale and ending | Inspected `evidence/browser-*.png`; assisted visual setups are labeled and do not count as a normal campaign |
| Actual defects and severity, without duplicate counts | `docs/issues.md`: 30 resolved issues, one initial boot blocker |

The engine is the full my-3D2dge v0.89.1 at `8ecc2f62353761187bdfe226f327b7ea5d2eb691`, with no engine-source changes. The unmodified AI Hub session client is 1.4.0 at `35a1047f2067b2af3de3943f0fe452f39105d869`. Historical source research, engine research and protocol evidence are separately recorded in `research.md`, `engine.md` and `network.md`.

The normal script-driven solo campaign and online campaign are knowledgeable expert input stand-ins. Their short simulation durations do not establish the 20–30-minute first-play target. Subjective difficulty, a listener’s judgment of the mix, physical controller/touch behavior, real iOS, a physical television and remote-human internet behavior remain unknown. All runtime music, effects and voices are code; no audio or image files are required at launch.

## Frozen delivery result

`node tools/test.mjs` completed **343 passed, 0 failed** on the final bundled file. Suite counts: syntax/interview8, simulation96, ordinary playthrough2, network23, native/headless/packaging integration7, browser84, audio22, Hub conformance79, shared interaction10, full server-only campaign12. Browser, integration and all three Hub evidence records match this artifact’s SHA-256: `211dac9a529ce12f96d4535141ce06fb7577061d91b65aa2b209ae673535f1e1`. The final file is 1,475,607 bytes. `../evidence/final.json` is the compact acceptance record. No runtime source changes followed this pass.
