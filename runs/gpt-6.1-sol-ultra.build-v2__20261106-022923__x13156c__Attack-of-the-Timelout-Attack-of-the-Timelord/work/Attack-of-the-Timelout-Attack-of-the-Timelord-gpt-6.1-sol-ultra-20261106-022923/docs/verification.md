# Verification and finding ledger

Run `node tools/test.mjs` from the development directory. Its final total, failures and per-suite records are saved in `test-artifacts/verification.json`; verbose subprocess output stays in separate logs. The artifact path in that record is the actual standalone HTML, not a development page.

Coverage includes23 pure state assertions,8 native engine checks,18 protocol/clock checks,27 audio signal checks,122 browser checks,4 official Hub scenarios,13 independent public WebRTC adapter checks,17 packaged-game online checks, and2 package/metadata checks. The unified output is authoritative if a later check is added. Legitimate full solo and four-player campaign tests use ordinary action frames and no invulnerability, developer flags, direct outcomes or phase skips. Developer/browser and network collision fixtures are explicitly separate modified runs.

The browser matrix uses Chromium for full play, real emulated standard-mapping pad input, CDP multitouch, and native menu/settings/initial entry; WebKit and Firefox both boot and accept input. Canvas2D needs no WebGL on this workstation. Storage failure/corruption, ten-second attract timing, all wake modalities, consumed wake gestures, focus/disconnect pause, held-input cleanup, developer tools, assist labels, controls, retry and readable screens are covered. The12-frame contact sheet contains original screenshots, including development victory and ordinary failure; it does not claim a screenshot proves normal campaign completion.

Audio checks render original music, effects and gibberish voice through OfflineAudioContext, including native engine buses. They check finite/nonzero signals, peaks, mute/volume,0.1 music default, suspension/termination and retry. No human listening claim is made.

Official Hub tests use the unmodified revision35a1047f2067b2af3de3943f0fe452f39105d869 harness and require both DOM completion and its pass flag: two-player automatic flow; four players with150ms latency,50ms jitter and5% loss; that stressed case with host departure; and two players with a dedicated server host. Actual seats enter the same campaign; no phantom server machine exists. Hosted play never initializes PeerJS. Reports include packet sizes and message rates.

Standalone tests use actual public PeerServer signaling and WebRTC links in separate browser contexts. Packaged-game checks cover ready/start, remote movement and owned shots, authoritative interception/score/charge, one-event damage, shared brake, stale input expiry while input/rendering stop, natural all-disabled defeat, agreed results, replay, host leave and solo fallback. Collision fixtures are marked modified and never assign victory. Production networking uses an independent monotonic fixed-step clock, rather than relying on rendering or a foreground tab. Public signaling transiently timed out during testing, then succeeded on retry; universal NAT traversal is unknown and some networks need TURN.

## Distinct resolved findings

Automated or visual checks found10 game issues. Focused source/integration review found16 additional issues. Test setup mistakes (selectors, invalid synthetic pointer IDs and range input formatting) are excluded. Five findings could block a core flow, noted below.

| # | Finding | Found by | Severity / resolution |
|---|---|---|---|
|1|Roller allocator rejected its own safe gap at arena edges|State test|Choose a reachable endpoint exit and protect its corridor.|
|2|Renderer used nonexistent `r.g`|Native draw + browser|Critical: use native `r.ctx`.|
|3|Canvas remained at default300×150 CSS size|TV screenshot|Critical: explicit viewport canvas sizing.|
|4|Native minimum1 scale cropped narrow devices|Visual + native sizing checks|Critical: fractional downscale with common world geometry.|
|5|Floating point fit could produce OX=-1|Narrow native sizing regression|Add epsilon before margin floor.|
|6|Retry retained old audio event IDs|Integration review|Reset audio event cursor with a new world.|
|7|Comfort rows used incorrect native keys|Source review|Use motion/flashes and native reduce-motion field.|
|8|Inherited developer flags could submit normal records|Source review|Flag inherited overrides and AI/god/speed each run.|
|9|Room results stopped pumping queued ready messages|Network review|Continue room lifecycle updates through results.|
|10|Old snapshots could leak into room replay|Network review + regression|Run generation validation and queue/tick resets.|
|11|Valid JSON containing malformed record rows could throw|Source review|Validate record shapes before rendering/sorting.|
|12|Invite did not prefill and pasted URL was truncated|Integration review|Parse room query and paste before length restriction.|
|13|Guest display state lacked assists used in results|Integration review|Critical: encode assists and tolerate missing values.|
|14|Hub goal/how-to metadata names were incomplete|Protocol review|Use exact session-goal/session-howto names.|
|15|Input hook could resume music after Hub end|Lifecycle review|Terminal guard keeps input and sound disabled.|
|16|Native shell buttons did not focus on hover|Browser check|Delegate deliberate mouse hover/move focus.|
|17|Touch target lost unconsumed drag after one tick|Input review + regression|Accumulate relative target until release.|
|18|Pointer capture read previous event's position|Input review|Map current client coordinates through native Screen.|
|19|Repeated audio unlock could restart music|Audio integration review|Unlock only when needed.|
|20|Native button font shorthand made TV labels tiny|TV screenshot|Explicit responsive action font sizing.|
|21|Same-screen redraw reset controller picker focus|Controller entry check|Preserve native Shell focus on same-name refresh.|
|22|Attract wake tap synthesized a click onto Play|Touch browser check|Consume matching pointer up/click as one wake gesture.|
|23|Background animation frames stalled shared simulation|Packaged WebRTC test|Critical: independent monotonic authoritative clock.|
|24|Co-op record category had no save action|UI review|Host can save a local team record from room results.|
|25|Assists on then off could submit as standard|Rules review + regressions|Sticky assisted classification in state and snapshots.|
|26|Independent clock could resend cached local input|Clock review + packaged regression|Clear on blur/disconnect; expire unsampled action after350ms.|

## Environmental limits

No physical controller, phone, TV or human listener was available. Emulated inputs and screenshots are the available stand-ins. A precise scripted pilot completes the campaign in roughly five to six simulation minutes; ten to fifteen minutes for a first successful human run is a design target, not a measured human timing. External signaling and NAT/TURN availability remain outside the artifact. No FPS/performance gates were added.

## Final delivered artifact

All **234 checks pass**, with zero failures. SHA256: 768c0e328e99f789367f7a65e63bc05a7cd656205fc6bff2c69dc5bf78bd190b. The final report links the same artifact to the23 state,8 native engine,18 protocol/clock,27 audio,122 browser,4 Hub,13 adapter,17 packaged-online, and2 packaging checks. A test-runner CLI argument was corrected, then only the affected browser group was rerun; the aggregate report retains results for this identical artifact hash. No game source changed after that artifact was built.
