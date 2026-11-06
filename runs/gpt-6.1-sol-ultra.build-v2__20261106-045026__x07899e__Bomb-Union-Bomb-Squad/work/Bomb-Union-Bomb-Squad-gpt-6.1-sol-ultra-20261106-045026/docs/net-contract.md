# Cooperative adapter contract

`BU.Network(options)` owns networking only. Options callbacks: `onState(state)`, `onStatus(text)`, `onStart(state)`, `onEnd(reason)`, `onRoster(roster)` (all optional).

- `await detectHub()` connects once, attaches handlers, automatically ready; returns true inside active Hub, false outside. Root calls only after all game modules/presentation loaded. No title gate in active Hub. Callback onStart happens after actual zero countdown. Root MUST continue `tick(dt)` regardless local pause when `online`.
- `await host()` creates PeerJS Cloud room, returns displayed short `code`; remains lobby until `start(caseId, seed)`. `await join(code)` resolves after host acceptance/full snapshot; room errors reject with actionable message.
- `start(caseId, seed)` host only, locks party workload, emits onStart everywhere. Root may invoke solo start separately; network not required for solo.
- `command(cmd)` sends ordinary Sim command with local authoritative identity. Returns local result for authority, queued marker for clients. Adapter supplies id/revision/case; UI supplies op + board/target/spare/tool/etc per sim contract.
- `tick(dt)` run every native update. Host advances by wall elapsed online, clients never simulate. Snapshots 1/s plus coalesced board patches (8/s max), reliable. `requestSync()` requests latest state. `leave()` closes peers/handlers and clears holds/claims. Hub leave UI disabled.
- Public fields: `mode` ('solo','hub','host','guest'), `online`, `authority`, `seat` (null on Hub server), `state`, `status`, `code`, `roster` [{id,name,color,connected}], `running`, `ended`.
- Hub gameplay cheats must be disabled (`mode==='hub'`). Standalone tuning host only through command or broadcast method `tune(patch)`.
- `canPlay` is true only for a connected seated local participant while round running and not ended. Root must block gameplay for null seat.
- `dispose()` calls leave; destroys only Peer created by this instance. PeerJS dependency vendored and loaded dynamically only in standalone host/join flow (or bundled source available as BU.loadPeer).

Hub scripts: vendor/hub/session.js must be first inline script, byte-for-byte unmodified. Tags: protocol 1 / shared-world / 1-4 / session-minutes 4. Standard Hub card handles readiness. Main should show brief standby text until onStart.
