# Killer Bee-yond Midnight

Twelve tiny bees. One very late garden emergency.

Open the HTML in the parent folder directly in a browser. Everything needed to play is inline; no server, installation, CDN or audio file is needed. The six-encounter campaign takes about ten to twelve minutes. Local clean and assisted best scores are separate.

- Move: WASD/arrows, left stick/D-pad, or hold right mouse toward the garden cursor.
- Hold Focus: Shift or R2. A tight swarm fits gaps and stings faster at reduced speed.
- Horizontal ray: Space, left click or Cross. It destroys rival swarms across your current row. Every gardener kill recharges one empty charge.
- Pause: Escape/Options. Settings, controls/rebinding, About and developer tools use the native engine menu.
- Touch: invisible left thumb stick, right-side Focus hold, contextual Ray button. Multiple fingers work independently.
- Couch: choose Co-op → Couch. Two connected pads are assigned one each; one pad gives keyboard + pad; no pads uses WASD/F/G and arrows/period/slash. A second pad can also join on the Co-op screen.

The copper Leftenant turns left; jade Righto turns right. Stay in contact until a gardener collapses. Break away and it recovers. Its shell becomes solid for the rest of the encounter. Rival insects mature from scouts to guards to hunters. Watch the entrance warnings and your escape route. The Bellwether exposes its core between moves and telegraphs a non-damaging dispersal pulse.

For standalone direct co-op choose Co-op → Direct peer. The host makes and copies an offer. The guest pastes it and returns an answer. The host pastes that answer and connects. Copy/Paste failures leave selectable code fields and browser copy/paste. Actual ordered-channel play is verified between two contexts on this machine. LAN and Internet reachability depend on the network; no public matchmaking, STUN service, TURN relay or universal NAT connectivity is supplied.

AI Hub uses only the pristine bundled SDK and Hub transport in `shared-world` mode. The host owns combat; each guest supplies validated input. A dedicated host has no player seat, canvas or audio device. Menus do not stop network authority. The start clock gates all gameplay, departed inputs are neutralized, time-up produces an honest incomplete result, and end stops traffic/input/audio. Hub gameplay modification is disabled. Duration metadata is 12 minutes under the runtime's 15-minute cap.

## Build and verification

Run from this development directory:

```
node tools/build.mjs
node tools/test.mjs
```

The build uses the installed Bun bundler and writes the prescribed single HTML into the parent workspace plus identical bytes in `build/index.html`. The pristine Hub client is the first head script, byte for byte. Other scripts escape closing-script sequences. No source map or local runtime import is needed.

The quiet test runner prints failures and one count. Affected groups can be selected with `--group=sim`, `browser`, `audio`, `hub`, or `peer`. Run `sim` before a standalone `hub` test to generate the normal-action final checkpoint. Browser automation uses the preinstalled Python Playwright environment and downloaded Chromium/WebKit/Firefox. It launches only one browser at a time, or two peer contexts. The official Hub harness binds a Python server to 127.0.0.1 on an OS-selected port and shuts that server down itself. No shared processes or ports are killed.

`evidence/campaign.json` and `solo-campaign.json` record ordinary-command full campaign runs. Neither uses invulnerability, teleports, health edits or direct stage-clear actions. `final-checkpoint.json` is the last live state from that ordinary co-op replay; the separate Hub finish test resumes it to verify the actual once-only team victory path independently of time-up. Fast fixtures isolate other edge cases. Screenshots are used only for visual legibility and composition.

No physical controller, touch hardware, TV, real iOS device, subjective audio listening or public-Internet connectivity was tested. Standard pads are emulated. WebKit's phone profile is a browser stand-in. Offline synthesis and live bus analysis verify sound output.

## Architecture and provenance

`src/sim/world.js` is the seeded fixed 120 Hz state machine. It has no DOM, rendering, sound or transport dependency. One world serves solo, simultaneous couch, attract, tests, peer and Hub. `src/net/protocol.js` owns validation, stale input, action counters and compact full snapshots. `src/presentation` owns native pixel art, E.Blob-derived rigs, shapes, effects and original code-only sound. `content/stages.js` is the content pipeline; see `content/README.md`.

Fixed update order: validated input counters → ray spend → movement → all sting contacts → sorted target deaths/refills/shells → rival bee loss → entrance/spawn schedule → wipe/clear. Contributors since full recovery determine refill priority. Shell displacements cannot change another target's same-tick sting. A target's event/score ID is unique.

Inputs send at 15 Hz; snapshots send at 12 Hz. Full snapshots under 1,180 encoded bytes are unreliable; larger full snapshots use reliable delivery under the official 16,384-byte cap. This avoids fragile deltas. Cumulative ray counters survive dropped/reordered packets; stale inputs neutralize after 0.45 seconds. Guests interpolate presentation and gently reconcile local movement prediction. Host collision decides contact.

Engine: my-3D2dge v0.89.1, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`, MIT notice retained. One engine fix: `_boot({boot:false})` now clears `_booting` before returning to `start`; otherwise all later scene changes remain queued as boot requests. The game adds no duplicate engine modules. All other systems extend native APIs.

Hub: protocol 1, pristine client 1.4.0, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Original SDK header and official harness/bridge/round retained. The upstream Hub repository has no root LICENSE file; no license was invented. `research.md` records inspected source evidence and unknowns. No source game sprites, branding, speech, recorded sound or music are copied.

The randomized title selection is recorded in `identity.json`. Run-specific source/model metadata and all required feedback are in `interview.json`, the root delivery interview, and in-game About/Credits. Usage is `added on import`.
