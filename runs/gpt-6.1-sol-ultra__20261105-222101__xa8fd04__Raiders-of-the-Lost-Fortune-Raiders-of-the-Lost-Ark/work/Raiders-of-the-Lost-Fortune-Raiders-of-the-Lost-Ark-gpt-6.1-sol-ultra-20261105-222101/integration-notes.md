AI Hub Session Protocol v1, exact session.js client 1.4.0 downloaded from the user-specified repository. No general internet research was performed.

Bundle session.js unchanged as the first script in head immediately after meta charset. Include hub:session=1, hub:session-players=1-2, hub:session-mode=shared-world and goal/howto/minutes metadata. WebGPU requires hub:webgpu=required if there is no fallback.

createOnline(callbacks) exposes init() → info/null; ready() after renderer/world load; finish({won,score,stats}); sendState(state) at host; sendInput(input) at guest; createRoom() → six-character code; joinRoom(code); leave(); destroy(). Getters: hub, role (solo/host/guest), room, connected, me, players, server, ended, canPlay.

Callbacks: onState(state,from), onInput(input,from), onStatus(message,details), onStart({role,room,me,players,server,hub}), onEnd(reason), onLeave(id), optional onTimeUp() or getResult() returning {won,score,stats}. Host authoritative: only the host advances physics, AI and mission state. Guest sends local input and renders snapshots. Server host has no player of its own: enumerate players and never bind a local input to a player when server=true. AI Hub readiness takes no user gesture. Gate play on canPlay (synchronized start countdown), skip title/attract in hub, and stop audio/input in onEnd. Ignore controller Options while Create is held in hub. Restart/quit must have no effect in hub.

State/input are throttled independently to 12.5 Hz, comfortably within the hub's 20 messages/s limit; messages under 15 KB only. Reliable packets preserve button edge inputs if input code latches them until sent. Root should consume action inputs once per sequence or send held action state with game cooldowns.

Standalone rooms use BroadcastChannel when both pages share an origin and PeerJS 1.5.5 WebRTC across devices; PeerJS is loaded only on standalone room creation/join, never in AI Hub. Public PeerJS signaling needs internet. Leaving a host voids an AI Hub round through the hub; standalone host can continue solo after guest departure. Guest returns to title on host departure.

Harness files are in this development folder. Serve this folder or copy harness.html/bridge.js/round.js next to bundled HTML. Test harness.html?game=GAME.html&players=2&auto=1, plus players=2&scenario=server, players=2&scenario=host-leave and players=2&latency=150&jitter=50&loss=5&auto=1. Success: window.__hubCheck.pass === true and body.dataset.complete === 'true'. Read __hubCheck for failures.
