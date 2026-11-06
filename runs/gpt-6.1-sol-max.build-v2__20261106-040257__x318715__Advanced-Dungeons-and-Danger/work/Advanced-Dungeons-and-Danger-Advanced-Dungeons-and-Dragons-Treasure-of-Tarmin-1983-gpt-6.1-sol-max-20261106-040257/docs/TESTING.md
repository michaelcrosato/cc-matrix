# Release verification

`npm run verify` → **249/249 checks passed; 0 failures.**

Artifact: `Advanced-Dungeons-and-Danger-Advanced-Dungeons-and-Dragons-Treasure-of-Tarmin-1983-gpt-6.1-sol-max-20261106-040257.html`  
Size: 4,992,095 bytes.  
SHA-256: `46db1dc73ee0096ff069a87c033b1efe29b9e61996c1f678e501964f86710f0c`

| Check group | Count | Evidence |
| --- | ---: | --- |
| Deterministic rules, content, saves and full routes | 51 | tools/rules-test.mjs |
| Protocol authority, codecs, timing and negotiated windows | 22 | tools/net-test.mjs |
| Package and canonical report | 5 | tools/verify.mjs |
| Exact HTML browsers/input/audio/RTC UI/official Hub/renderers | 140 | evidence/release-file-touch-rtc-hub-fallbacks.json |
| Exact HTML full real co-op and Hub edge scenarios | 31 | evidence/network-release-rtc-hub.json |

Both browser reports identify this exact final SHA. The runner refuses stale evidence or a different artifact hash.

## Complete stock expeditions

Solo: 175 accepted production commands, 92 steps, 38 rounds, all three floors, eight defeated enemies, eight rests, one secret, one gate, both damage channels, permanent War/Spirit training, trap disarm, upgrades, all three guardian seals and deliberate treasure claim. Ends with 38 War and 26 Spirit. Modified balance and invulnerability remain false. Boss-defeated and treasure-not-yet-claimed are separately asserted before the final interaction.

Real cooperative route: 372 interleaved events (370 accepted commands and two intended full-pack comparison refusals), 198 steps, 66 rounds, eight enemies, two personal gate crossings, all three guardian phases and deliberate claim. Every event travels through production handlers and the actual ordered WebRTC channel; both peers' semantic gameplay state is compared after each acknowledgement. The route remains unmodified. Automated replay took 57.56 seconds; this is a machine replay, not measured human playtime. Cosmetic RAF is stopped during dense replay while the independent authority/network clock remains live. Rendering/UI boot is verified before, and ending UI after. Neither full route mutates health, ammo, positions, enemies or balance.

Transaction/revive/timeout scenarios use explicitly controlled setup states. They are separate from the normal-rules full-route proof.

## Session and transport coverage

The pinned official harness passes two-player normal, 150 ms latency/50 ms jitter/5% loss, host-leave, server-only authority with two players, and one-player scenarios. Every scenario requires dataset.complete=true and window.__hubCheck.pass=true.

Extra exact-HTML cases cover nonhost departure, active boss-phase timeout, downed-state timeout, one honest authority result, current-player standings, clean end and a full stock Hub victory before the actual session cap. Server-only copies create no Game, renderer, audio device or local avatar. Settings stay live online, and controller loss does not freeze the shared world.

Actual Host/Join UI codes connect two isolated browser contexts. Malformed invitations remain recoverable. A twelve-second setting is disclosed before the guest returns an answer, negotiated, and applied to both shared views with the modified flag. Stock and Hub remain eight seconds. Pure checks reject invalid durations, mismatched answers, stale/duplicate/foreign input and unsafe delta paths.

Largest measured final release packet: 11,057 bytes. Largest observed outbound rate: 12/second. Reliable ordered traffic stays within Hub's 16 KB/20-message limits. These are protocol checks, not graphics benchmarks.

## Browsers, input, saves and audio

The final HTML opens through file:// with the engine, three module graph and embedded Rapier WASM. Request inspection sees only the document and its reload; no source, CDN, JSON, image, audio or separate WASM requests. WebGPU state, WebGL 2 fallback and WebKit WebGL 2 pass. This Firefox installation lacks WebGL and receives a clear unsupported-renderer/retry screen.

Input checks cover a standard-mapping pad stub (D-pad menus, PS/Xbox prompts, L3 map, action selection, reconnect), keyboard menus/movement, real mouse look, rebinding, phone/tablet touch, multitouch, contextual actions and guard recovery. Native long-menu focus, credits scrolling, live developer sliders/reset, content validation, ten-second attract boundary, consumed input exit and save isolation pass. A real reload preserves glyph preferences and solo checkpoints. Corrupt/blocked storage remains playable.

Music defaults to 0.10. OfflineAudioContext renders the same original instrument/voice functions: 44,100 finite samples, 36,400 nonzero, peak 0.0560, RMS 0.00526, no clipping, muted output exactly zero. Native Sound-off also mutes the custom procedural mix. No human listening was available.

## Visual evidence and limitations

Inspected TV title, first room, pack, map, pause/developer, credits, enemy silhouettes, Spirit chamber, boss and stock victory. Final phone review at 390×844 confirms visible menus, one menu button, visible initial developer focus and no observed HUD/context/counter overlap. Screenshots/reports record their own hashes. Final post-review edits clarify license wording and exact gate/trap numerical previews; core art, layout, input and transport are unchanged. The complete final 249-check run follows those edits.

No physical controller, touch hardware, real iOS device, TV, second human, human audio listener or cross-network NAT test was available. Emulation and same-machine peer success do not establish universal hardware/internet reachability. No TURN relay is supplied. The declared ten-minute Hub duration is intended human pacing, not a measured human run.

32 actual implementation defects were caught and fixed; zero were classified critical/game-breaking. docs/ISSUES.md records them. Test-harness mistakes are kept separate from game defect counts.
