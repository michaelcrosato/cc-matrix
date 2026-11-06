# Authoritative rules and integration contract

Turtle Shell Service is original rescue-maze action inspired by the 1983 US Odyssey² release of Turtles. Its life count is explicit: **three shared team lives, and the third loss ends the run**. There is no extra-life award. Delivered guests remain safe after damage.

## Core objects

`new TSS.Simulation({seed:47,seats:[1],floor:0,demo:false,runId:'…'})` owns the entire world. It uses the pinned engine's `E.TileMap`, one authoritative `E.Grid.from(map)` and native continuous `E.GridMover` travel. `sim.step(1/120,intents)` accepts `{1:{dir,bomb,confirm},2:{…}}`. Directions are `0 up, 1 right, 2 down, 3 left, -1 released`. Bomb is a held boolean with a rising-edge latch per seat; requests are accepted in seat order. All actor coordinates are world units, 16 per tile. No render, audio, DOM or transport callbacks control rules.

`sim.state` is the live data model; `sim.snapshot()` returns plain JSON including all RNG/mover state, balance, metrics and the last 48 identified events. `sim.loadSnapshot(snapshot)` replaces the world, rebuilds map/grid when the floor changes and restores native mover methods. `sim.events` contains only the current tick's events; IDs are `runId:eventSequence`, stable across network replay. Rendering may consume `recentEvents` with ID de-duplication after packet loss.

`sim.path(from,to)` accepts cells `[cx,cy]` or actors `{x,y}` and returns a native grid path of cells, including both ends. `sim.directionTo(actor,nextCell)` accounts for the actor's current edge. `sim.predictPlayer(playerCopy,intent,dt)` applies the exact movement rules to a presentation copy, with no pickups/damage/stock changes.

## Movement and interaction

Travel follows cardinal graph edges. Mid-edge reversal reverses the native mover's edge and interpolation fraction immediately. Perpendicular turn intentions remain buffered for 0.22 seconds; release stops straight travel at the next cell centre. Native maze collision prevents diagonal corner cutting. Carrying speed is 90% of the ordinary 3.5 tiles/second.

The first authored room on every floor is always a baby. Remaining room outcomes are shuffled once per floor with a named deterministic `rooms` RNG stream; the number of babies exactly matches the quota. An empty rescuer entering within 5.5 world units reveals a room. Blue beetles, mystery beetles and required babies are separate entities. A decoy's beetle emerges harmlessly for 1.15 seconds before movement/contact begins.

A pickup chooses the farthest reachable unreserved edge home, with a stable home-ID tiebreaker. Two simultaneous passengers reserve different homes. No free home means no pickup, no consumed baby and a content-warning event. A passenger receives its home's symbol and color. A carrying rescuer cannot reveal another room or replace the passenger. Delivery within 5.5 units resolves once, releases the reservation and produces a 1.2-second welcoming animation timer.

Discovering a baby awards 100 once per floor. Delivery awards 400. The first stun of each beetle awards 50; subsequent stuns award zero. A cleared floor awards 250 plus 50 per zero-based floor index.

## Pursuers and defence

Blue beetles choose seeded legal turns, avoiding reversal where possible, without tracking players. Yellow beetles acquire a turtle only along an unobstructed row/column. They route to the last observed cell, then return to wandering/search. Red beetles route around corners. Target selection uses shortest reachable path, seat-order ties and three-cell distance hysteresis for an existing target. Enemies choose again at each cell centre. They never read future input. Base speeds are blue 2.2, yellow 2.6 and red 2.9 tiles/second, below a carrying rescuer's 3.15. Escalation thresholds are 18 and 42 seconds with a visual warning before each threshold. Later floors introduce older initial beetles and more complex routes rather than unfairly winning a straight race.

The team starts with three bombs, capped at five. Exactly one team bomb can be active. Planting at a valid corridor position spends one only when accepted. An untriggered trap lasts six seconds. A live beetle passing within eight units triggers it; other emerged beetles within 25 units and an unobstructed map line of sight are stunned. The trigger is resolved before damaging contact, so a trap at the turtle's feet can protect it. Bombs never hurt rescuers or passengers. Stunned beetles are harmless for three seconds, recover blue and reset age/target. A team hit clears the active trap slot.

The central supply bell grants two bombs up to the cap and recharges in six seconds. An accepted pickup requires entering within seven units from outside. Recharging while someone camps inside never grants more stock or repeats pickup sounds. A zero-stock request produces a distinct `empty` event and leaves stock at zero.

## Damage and transitions

Swept relative-segment contact catches actors crossing within a tick. A damaging contact drops the passenger back at its revealed origin, releases its home, subtracts one shared life, retracts the struck turtle for 0.7 seconds, and starts 1.25 seconds of team damage grace. Respawn chooses the safest authored spawn/home with over 32 units of threat separation. If all authored candidates are obstructed by threats, it selects the safest reachable corridor cell. Respawn grants 2.5 seconds of invulnerability. Other cooperative rescuers keep acting.

Tick order is: bomb button edges in stable seat order; player movement; enemy movement/escalation; supply cooldown and accepted entries; bomb trigger/stun/expiry; damaging contacts; room reveals/pickups; deliveries; floor-clear commitment. The terminal loss aborts further encounter resolution. A floor clears only when the quota has been delivered and nobody still carries a passenger. All gameplay stops during floor transition and celebration. The next floor is initialized synchronously at the transition boundary with fresh movers, homes and passenger references. Confirm skips introductions/transitions. The rooftop ends in a five-second family evacuation and a conclusive `won` terminal result.

`sim.removeSeat(seat)` returns a carried baby to its revealed room, releases its home, deactivates the seat and carries the same campaign forward with the remaining rescuer. No simultaneous switches or seats are structurally required.

## Practice and accessibility

`setBalance(key,value)` applies a bounded live rule and marks practice. Yellow/red thresholds retain at least a two-second gap. `resetBalance()` restores immutable default rules without changing accessibility flags or erasing the practice flag. Developer actions include floor selection/restart, invulnerability, refill, room inspection, graph overlay, spawn/clear encounters and bounded time scale. The application's native loop applies `state.dev.timeScale`; a single step is one `sim.step(1/120,…)`. Assisted/demo/practice are explicit independent run flags for record separation. New ordinary runs create all-clean defaults.
