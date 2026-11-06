# Shared-world campaign

AI Hub Session Protocol **1**, unmodified client **1.4.0**, pinned repository
commit `35a1047f2067b2af3de3943f0fe452f39105d869`. The six protocol, client,
bridge, round and harness files and shared-world `examples/arena.html` were
downloaded from that exact commit. `session.js` is inlined unchanged as the
first script after charset. The host world uses a named
`turtle-shell-service/world/v1` RNG stream; gameplay then owns independent,
serialized room and enemy RNG streams.

Standalone `AIHub.connect({mode:'shared-world',seats:[1,2]}) === null` runs the
ordinary title, solo, simultaneous local co-op and attract application. There
is no standalone remote rendezvous, broker, lobby, socket or invented service.

## Application boundary

`TSS.Network({hub,info,createSimulation,onEvent,onStatus,onEnd})` constructs one
simulation, registers lifecycle handlers and exposes `localSeat`, `isHost`,
`server`, `sim`, `started`, `playing`, `finished` and `ended`. Main initializes
the scene then calls `network.ready()` once. Repeated calls are harmless.
`network.update(dt,{dir,bomb,confirm})` runs from the native fixed-step loop,
including while a local menu is open; main supplies neutral intentions to
that seat while its menu is open. Shared games use native `live:true` and
`autoPause:false`. Dedicated hosting has no local input seat.

The host does not advance until the start event has arrived and
`Number.isFinite(AIHub.time()) && AIHub.time() >= 0`. The Hub time is
milliseconds; the engine simulation `dt` remains seconds. A single authority
owns every objective, passenger reservation, enemy, resource, damage event,
score, floor transition and terminal result. Remote copies never step rules.

## Packets

Every packet carries application version `v:1` and run ID `r`, derived from
Hub round and named seed. Stable player seats come from the welcome's player
order. The authenticated transport `from` determines the input seat; no
packet can nominate a seat, position, pickup or score.

- `i`: cardinal intention `d` in -1..3, monotonic packet `q`, floor `f`,
  cumulative bomb-edge `b` and confirm-edge `c`, and diagnostic Hub time `a`.
  Changes coalesce to at most 15 sends/second and a 200 ms heartbeat. The host
  rejects malformed, stale, wrong-floor, wrong-run, departed-sender or
  out-of-phase intentions. Additional per-sender limits reject more than
  24 received intentions/second. A counter recovers a dropped edge; duplicates
  and reordering cannot spend a bomb twice. Lost controls expire after 650 ms.
- `s`: host sequence `q`, floor `f`, tick `k`, Hub timestamp `a`, and full
  serialized simulation `s`. Regular snapshots leave at 10/second,
  unreliable. Initial state, phase/floor changes, leave and outcome snapshots
  are reliable. A full snapshot allows recovery without a baseline or delta
  chain. It includes recent uniquely identified events. There is an explicit
  16 KB packet guard. Clients accept only the authenticated host, increasing
  sequence, nondecreasing tick and nondecreasing floor of the same run.

`snapshot()` returns a presentation copy. Only local turtle movement is
predicted, bounded to a quarter-second lead, through the simulation's same
`predictPlayer` collision/turn code. Receiving authoritative state rebuilds
graph references on floor change and replays a bounded input history.
Remote turtles interpolate with a teleport threshold. Reveals, bombs,
hits, deliveries, counters and phases always come from accepted host state.
`authoritativeSnapshot()` returns the unmodified authority for assertions.

## Lifecycle and outcomes

Leave calls `sim.removeSeat`, returning a passenger to its revealed origin
and releasing its home before a reliable snapshot. Remaining players can
finish every objective. Host loss is the Hub's void; no migration is
attempted. Time-up permanently stops input and the host immediately calls
`finish` within the grace. Only the host calls `finish` and only once, using
one tied group of remaining Hub player IDs, shared score and `won:boolean`.
The completed five-floor family rescue is the common victory objective.

End stops all input, rule updates, prediction, sends and presentation event
processing; main stops generated audio. Hub owns quitting, outer results and
the next round. No local rematch or title action is offered inside a round.

## Verification

`tests/net.test.mjs` exports `runNetworkTests()` for the quiet verification
runner. It covers ready/countdown, simultaneous authority, loss/reordering,
edge actions, authenticated validation, old/forged snapshots, dedicated host,
leave, cooperative finish, time-up, long counter-gap recovery, obsolete floor
event suppression and end silence (14 checks).

`tests/hub-campaign.test.mjs` runs the actual unchanged client in separate VM
copies, through the supplied bridge, round coordinator and simulated network.
The injected clocks preserve the native rate/size/time limits while allowing
all five floors to run without waiting for wall time. A coordinated test bot
reads the present authoritative debug snapshot and submits legal individual
seat intentions; no life, balance, position, room or objective is edited.

Recorded campaign evidence at Hub seed 47:

- Player host: all 26 rescued, three lives remaining, 15,450 points, 179.65
  simulation seconds; both copies agreed on the cooperative win.
- Dedicated host: all 26 rescued, two lives remaining, 15,400 points, 176.47
  simulation seconds; both clients agreed on the cooperative win.
- Dedicated stress run, 150 ms latency, ±50 ms jitter and 5% unreliable loss:
  the bot reached the roof, then lost its final life with 20 guests safe,
  12,100 points and 175.88 simulation seconds. Every copy agreed on the team
  loss. This stress outcome is not represented as an uncheated victory.

Largest observed gameplay packet was 11,625 bytes, below the native 16 KB
limit. No bridge/coordinator issues or client rate warnings occurred.
`build/hub-campaign-results.json` retains exact outcomes and counters.

`tests/hub.py` opens the exact packaged root HTML through the unchanged
browser harness on an OS-selected loopback port. Standard two-player,
latency/jitter/loss, dedicated-server and host-leave scenarios all completed
with their real `window.__hubCheck.pass` markers true (53 native checks).
It also tests that a host's local pause overlay leaves world ticks running
and supplies neutral local movement. `build/hub-browser-results.json` retains
the reports. This is browser/transport automation, not a remote-human test.

## Three unique networking issues found and fixed

1. **Time-up could resume client input on the next frame.** The first handler
   cleared `playing`, but the next update recomputed it from the still-running
   Hub clock. A persistent `timedOut` latch now suppresses input permanently
   while the host reports the team outcome. Covered by the time-up unit case
   and actual supplied-client/round time-up integration. This was a lifecycle
   issue during the results grace period, not a completed-campaign blocker.
2. **A recovery snapshot could replay obsolete floor events.** The serialized
   recent-event ring deliberately spans floor changes. A client receiving its
   first snapshot on the next floor could otherwise show old pickup guidance
   or play an old sound on the new map. Event IDs are still remembered, but
   callbacks are suppressed when their floor differs from the applied
   authoritative floor. Covered by the explicit recovery/deduplication unit
   case. This was a presentation issue.
3. **A large action-counter gap could permanently reject a valid seat.** An
   initial upper bound on counter jumps assumed fewer than nine button edges
   could be lost. A longer packet gap plus repeated presses could then reject
   every later intention, movement included. Counters now accept any bounded,
   monotonic value and coalesce the gap into at most one pending action;
   sequence, sender, phase, direction and receive-rate validation remain.
   The long-gap unit case proves movement recovers and stock is spent once.
   This was a potential input softlock for one seat; the other seat could
   continue the campaign. It did not occur in the supplied stress run.
