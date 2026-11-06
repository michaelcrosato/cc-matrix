# Multiplayer research and implementation

Research date: 2026-11-06. Primary protocol documentation:
https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md

The protocol is AI Hub Session Protocol v1; current downloaded client is 1.4.0. The original, unmodified session.js is in hub/session.js and must be pasted as the first script after the HTML charset meta. The Hub can replace an unmodified client later. Harness, bridge, round and README were downloaded from the same source into hub/.

This game declares shared-world mode and one to two players. One host copy simulates all authoritative gameplay. Guests transmit their own controls to that host. Snapshots return from the host. The Hub may make the authority a dedicated server with no local player, indicated by net.server; net.me then is not in net.players. Dedicated authority must not synthesize local player input. Net sends at most 15 input or world messages each second, below the Hub's 20/s cap. World JSON must stay below 16 KiB. Player names remain text, never inserted as HTML.

Hub startup: createNetwork(callbacks), await net.connect(), initialize assets, net.ready(). Connect happens without player input, and the Hub supplies its own instructional card. onStart happens at AIHub.time() >= 0, following the Hub's three-second countdown. The network adapter handles time-up reporting if the caller does not do so. Main game ends and stops audio on onEnd. No standalone transport is opened inside a Hub round. Pausing must not stop Hub network simulation, quitting must not navigate away, and Create+Options belongs to the Hub.

Standalone local room: net.host(code), net.join(code), net.start() on the host. This transport is BroadcastChannel and requires two tabs in the same browser and origin; it does not provide an internet broker. Any fixed short room string works.

Standalone remote peer: host uses await net.createOffer(), shares the resulting text; guest uses await net.answerOffer(offer), shares their answer; host uses await net.acceptAnswer(answer). All gameplay flows directly through the WebRTC data channel. The adapter uses public STUN and no TURN relay: direct connectivity on restrictive NAT/firewalls is unknown and can fail. This does not affect local-tab or AI Hub play. The signaling text is a connection description only, not a room account or secret.

Callback signatures:
- onInput(input, playerId)
- onSnapshot(authoritativeState)
- onRole({isHost,role,me,server,players,transport})
- onStart({hub,me,server})
- onStatus(text)
- onTimeUp({graceMs})
- onEnd({reason,standings?,won?,score?})
- onLeave({id,reason})

Methods: connect(), ready(), start(), restart(), host(room), join(room), solo(), createOffer(), answerOffer(offer), acceptAnswer(answer), sendInput(input), sendSnapshot(state), finish(won,score), fail(message), close(), inspect().

Getters: isHost, connected, role, hub, server, me, players, room, started, ended, transport.

Initial verification: 4 Node tests passed (actual BroadcastChannel transport; mocked Hub host, guest, dedicated-server protocol lifecycle). Two actual Chromium tests passed (two-page BroadcastChannel round trip; complete WebRTC offer-answer/data channel/input/world/team-result exchange). Reports distinguish mocked and real browser evidence. Full bundled-game AI Hub harness still to be run when the main game is built.

Final review fixes: network pauses continue world authority while the paused pilot sends neutral controls; Hub end freezes input/simulation and mutes audio; standalone restart synchronizes both copies including after results; one-frame resonance presses buffer through input-rate throttling and use reliable delivery; camera/control ownership follows player IDs including a dedicated-server round. Final forced world snapshots include visual shield state and reinforcement timing. Node tests cover restart, force buffering and reordered ability delivery.
