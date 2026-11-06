# Verification evidence

`npm test` is the single quiet coordinator. It runs deterministic simulation tests, adapter tests, foundation/storage/native headless draw tests, offline native-audio checks, browser input/UI checks and the official AI Hub harness with custom shared gameplay checks. `artifacts/test-report.json` retains the consolidated count and individual evidence.

The solo full-mission proof uses actual movement/aim/fire inputs from a deterministic pilot, canonical hull and shield balance, no invulnerability or dev commands. Milestones require shots, a shield ram, fusion, propagated chains, gunship destruction, all three boss phases, extraction and victory. An exported full input replay reconstructs its exact final simulation snapshot. A separate two-player proof performs a real rescue, then finishes with one survivor. Additional seeds, defeat/retry, extended score attack, content validation and actor cleanup have scenario checks.

The native engine headless renderer draws every enemy, shields, boss components and cosmetic effects on its stand-in context, asserts no drawing errors, and checks that repeated drawing never changes a simulation snapshot. Browser screenshots answer visual questions only: 1920×1080 title, first-contact readability and crowded command encounter.

UI tests use a standard-mapped synthetic pad, desktop keyboard and mouse, phone/tablet touch emulation and Firefox/WebKit smoke checks. Touch contacts retain independent left/right owners. These are stand-ins; no physical controller, TV, phone, tablet or iPhone was available.

Audio tests render the actual original native synth definitions in OfflineAudioContext and check nonzero, finite, bounded output, different cues, bus gain, 10% first-run music, mute and cleanup. No human listening evaluation occurred. Historical source sound remains unknown.

Hub tests run the original pinned conformance harness against the generated HTML, on an owned 127.0.0.1 server with an OS-selected port. Cases cover one/two players, latency150/jitter50/loss5, host departure and a dedicated server host with no pilot. Custom two-page play checks authority dimensions during resize, remote aim and movement, shared score/cascades, rescue, fusion, boss phases, extraction/results, no simulation freeze beneath a local overlay, and post-end traffic/audio cleanup. Network evidence is local transport emulation, not a real internet session.

No frame-rate target or performance benchmark is part of acceptance. Detailed traces, screenshots and protocol snapshots remain within this development folder.

Final exact artifact result: **420 passed, 0 failed**. Coverage61simulation +22Hub unit +10foundation/storage/native draw +35audio +162UI/browser +99Hub browser +31isolated export. See artifacts/delivery-manifest.json for the verified HTML hash.
