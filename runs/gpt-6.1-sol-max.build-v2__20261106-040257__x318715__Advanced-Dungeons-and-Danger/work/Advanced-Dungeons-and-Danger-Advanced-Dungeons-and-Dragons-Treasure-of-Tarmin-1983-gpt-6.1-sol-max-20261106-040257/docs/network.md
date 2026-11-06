# Shared expedition transport

The production `Network` adapter in `src/net/network.js` uses the deterministic `Model` as its only authority. The view and menus submit ordinary commands; they never simulate a second combat game.

## Standalone

Host creates a reliable, ordered WebRTC DataChannel before creating an offer. `host()` sets its local description and waits for ICE gathering to finish. It exports the current localDescription in a bounded `DD1.O.` code. Join validates that complete offer before replacing any existing connection, imports it, creates/sets its answer, gathers ICE, and exports the current localDescription in a `DD1.A.` code. Host's `accept()` checks both role and expedition ID before importing the answer.

The channel exchanges a schema/protocol/role/declared-rules handshake. A fresh two-player expedition starts only after channel-open and that handshake; its default planning window is the stock eight seconds. The guest starts after receiving the initial authoritative snapshot. No camera or microphone is requested. Ordinary selectable text fields remain the fallback for clipboard restrictions.

There is no public lobby, broker, signaling fetch, or supplied TURN relay. Default offers contain direct/local-network candidates only. `host({stun:'stun:example.com:3478'})` and `join(code,{stun:'stun:example.com:3478'})` optionally gather a user-supplied STUN endpoint. Restrictive NATs/firewalls can fail to connect. Same-machine success does not establish cross-network reachability. Connection interruption is displayed; an 8-second disconnected state becomes a clear failure, and an unanswered invitation expires after 120 seconds. Cancel closes channel/peer/timers and invalidates pending asynchronous work. A retry creates a new run ID.

A departing guest invokes the production model's leave handler. The host continues solo and the guest's transferable gear remains recoverable. Host loss ends the guest's expedition. There is no host migration.

## Standalone planning-window accessibility

`host({planningSeconds: N})` accepts an integer from 2 through 30; omitted values mean eight seconds. Validation happens before the existing peer or expedition is closed. `net.planningSeconds` and frozen `net.rules` expose the current invitation's value to the setup UI. `encodeInvite(description,run,rules?)` includes the bounded rules object; `decodeInvite` returns normalized `.rules`. Legacy version-1 offers and answers without rules remain compatible at eight seconds.

The offer declares the duration. Join sets that value and emits a readable “Host chose a N-second planning window” status before gathering ICE or returning the answer. The answer echoes it, and Host rejects any mismatch before importing SDP. The reliable DataChannel handshake checks the same rule again. A guest cannot substitute a different planning window silently. The host's fresh model uses `Model.setTuning` only when the declared duration differs from eight; the resulting expedition and its floor-entry checkpoint are marked modified. The default eight-second model is byte-for-byte equal to the previous stock start. Both players receive the shared tuning through the ordinary authoritative snapshot. This preference never changes a live encounter mid-round.

Hub initialization clears former standalone invitation rules and always starts with canonical eight-second planning. No duration preference enters a scored Hub expedition.

The expanded pure tests verify bounds and malformed values, legacy codes, wrong-answer rejection without SDP mutation, invalid Host options preserving an existing expedition, handshake mismatch rejection, the actual customized model deadline, stock-start equivalence, and canonical Hub initialization. A real two-context Chromium DataChannel probe additionally passes **9/9** checks: twelve-second offers/answers are disclosed and negotiated before play, mismatched answers preserve the pending offer, both peers receive modified twelve-second state, a real committed round gets the twelve-second deadline and resolves immediately when both plans arrive, and actual legacy offer/answer codes still start an unmodified eight-second run. This probe uses source modules; the root final-artifact suite covers the packaged UI and default full campaign.

## AI Hub

Pinned client 1.4.0 (protocol 1) is copied unmodified into the delivery by the root builder. The adapter calls `AIHub.connect({mode:'shared-world',seats:[1,2]})`, installs lifecycle handlers, and defers `ready()` until rendering can begin. A `server:true` authority readies immediately and has no local adventurer. It needs neither renderer nor audio nor controller flow.

The Hub's synchronized clock is the only start gate: a start message alone cannot advance rules before `AIHub.time() >= 0`. Authority advances on a 25 ms timer independent of render frames or page visibility. Solo's `paused` flag is ignored online. Commands and all shared state travel through `AIHub.send` and message events; no WebRTC connection is created inside Hub sessions. Hub owns departures and host-loss policy.

Only authority calls finish, once. A team success requires a legitimately claimed treasure and an unmodified run. Timeout reports the actual incomplete state. End clears the simulation timer, outgoing messages, pending inputs, and resync buffers and calls the application end callback to stop audio. Current participant IDs form one tied team; result statistics report actual depth, treasure, boss defeat, and rounds.

## Authority and traffic

Every packet includes protocol version, game ID, run ID, sender sequence, tick, floor, encounter ID, and round. The sender identity comes from the Hub's `from` or the established RTC peer role. Claimed player fields in actions never select the authoritative actor. Duplicates, unknown identities, old expeditions, wrong floors, and stale encounter/round commands are rejected. In particular, exploration movement queued before a combat trigger cannot silently become a tactical move.

Authority calls the production command handler in one serial JavaScript task. Clients receive explicit result acknowledgements and must await authority for loot, damage, doors, and progression. On each eight-Hz publication, the adapter sends a structural delta against its last published snapshot. Arrays replace atomically. Every three seconds it sends a versioned full JSON snapshot as bounded base64 chunks. Reliable ordering preserves the baseline before later deltas; a mismatch requests resynchronization. Snapshot graph size is capped at 320 KB; paths prohibit prototype modification. Packets remain below 15,200 UTF-8 bytes. A 65 ms send scheduler permits at most 16 packets/second without stalled-tab bursts, leaving headroom below Hub's 20/second limit. Client actions are coalesced into a bounded queue, sent at most eight per second; one heartbeat per second establishes return traffic during idle play.

`diagnostics()` exposes mode, authority/server flags, run, clock state, connection/channel state, revision, queued traffic, rejected packets, largest actual packet, and maximum observed outbound messages/second. The release report and evidence are produced by the root's verification suite; implementation does not claim unrun browser or cross-network tests.

## Verification completed during development

`node tools/net-test.mjs` currently passes 22/22 pure protocol checks against the production model. The checks cover invite integrity/roles/run IDs, delta paths and schema, transport-derived identity, duplicate and old-run rejection, stale combat/floor commands, monotonic deadline synchronization on late receipt, production snapshot/delta agreement, departed gear recovery, and frozen authority after end.

`/home/micha/.local/share/pipx/venvs/playwright/bin/python src/net/rtc-test.py` passes 14/14 real-DataChannel checks in two isolated Chromium contexts, exchanging actual gathered SDP codes through the production API. It covers both players' authoritative input, guest departure, cancel, fresh invitation retry, and host loss. It does not claim an inspected production invitation UI or internet NAT reachability.

`/home/micha/.local/share/pipx/venvs/playwright/bin/python src/net/hub-test.py` runs the pinned official harness against a rendering-free source-module probe and passes five scenarios: two-player normal, two-player impaired (150 ms latency, 50 ms jitter, 5% loss), host-leave, impaired server-only authority with two players, and one-player Hub. Reports assert both `dataset.complete` and `__hubCheck.pass`. Largest observed packet: 10,156 bytes; maximum observed outbound messages in a second: 14. These are transport probes; the root integration suite must separately verify the final bundled game, game-specific interactions, and its full rendering/UI lifecycle.

Network state never overwrites solo progression. The adapter's `allowSoloSave` is true only for a run started through `startSolo`; RTC/Hub set it false, and it remains false when a host continues alone after their guest leaves. The application's autosave must honor this flag.
