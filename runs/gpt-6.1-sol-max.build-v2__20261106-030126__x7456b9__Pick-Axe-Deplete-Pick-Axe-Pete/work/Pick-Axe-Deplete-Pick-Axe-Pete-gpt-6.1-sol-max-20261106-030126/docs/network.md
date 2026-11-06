# Shared-world transport

`src/net/hub.js` installs `PD.HubLink` on top of the unchanged AI Hub 1.4.0 Session Protocol v1 client. The engine and Mine load first. All game messages use `AIHub.send`; there are no sockets, brokers, external requests, chat, emotes or custom names.

## Ownership and integration

Construct `new PD.HubLink(hub, hostMineOrNull, {onView, onEvents, onEpoch})` after `AIHub.connect`. The host supplies its canonical `PD.Mine`; peers pass null and receive a native Mine used solely as a read-only presentation model. Its bodies and attacks are real `E.Platformer`/`E.Attack` objects, preserving rendering hooks and contextual prompts. `link.view` always exposes the corresponding host world/client view. A hidden `hub.server === true` host owns no miner, input, renderer or audio. Gameplay and presentation Hub RNG generators are each requested once and retained; canonical Mine retains its own serializable seeded RNG.

The application owns connect, ready, start/countdown, time-up and end. It should call this sequence on every allowed native fixed tick:

```js
if (hub.isHost) {
  world.step(link.intents(localIntent));
  const events = world.takeEvents();
  present(events);
  link.publish(events);
}
link.update(dt, localIntent);
```

Client-only copies call `link.update`; they never step the Mine. Their owning body uses isolated native traversal prediction; other miners and hazards remain interpolated. `onEvents(batch)` is invoked on receiving peers only, since the host already presents the events it publishes. `onView(view)` receives the current read-only presentation model. `onEpoch(epoch)` lets the application consume input and reset presentation across chamber boundaries.

`link.update` checks `hub.time() >= 0` before advancing its clock or sending, even when called during countdown. Keep calling it under local online menus and send a neutral local intent. The world and Hub's wall-clock deadline continue. The adapter does not use timers, DOM, audio or a renderer. In the integrated online runtime, every copy uses `E.Game({loop:false, autoPause:false})` with one application-owned 8 ms interval advancing fixed native steps; visible requestAnimationFrame callbacks draw via `advance(0)` only. Hidden renderer scheduling cannot freeze an authority, and there is no second simulation owner. End clears that owned interval and render callback; the independent Hub wall clock still decides the deadline.

Use `link.leave(id)` once from the lifecycle handler. The host removes the miner with `Mine.leave`, which deterministically recovers a carried key. `link.finish(won)` is host-only and idempotent; all remaining player IDs receive one tied standing and the same canonical team score, with separate contribution stats. Wipe/time-up/victory decisions remain canonical application rules. On Hub end call `link.end()` and separately stop the game/audio. It unsubscribes messages and clears queues, inputs and interpolation targets. Every subsequent update/publish/receive is inert.

## Wire protocol and reliability

Messages use `{v:1,k,e,s,...}`: version, kind (`i` input, `m` motion, `f` full frame), chamber epoch and monotonic sequence. Actual Hub callback `from` authenticates sender ownership; IDs in payloads cannot grant a seat. Only a host's frames are accepted by peers. Stale epochs/sequences and invalid input ranges are rejected.

Input packets carry quantized canonical x/aim, discrete face (-1/0/1), up/down/jump/chop/interact holds, cumulative jump/redirect/interact edge counters and a local input-frame index. A bounded ring of per-edge context preserves the direction held for a jump and the aim/facing selected for a redirect, even when a brief press falls between send slots. Held Chop also carries the selected local facing so a sampled turn cannot leave the authority swinging in the opposite direction. Each edge repeats in subsequent packets until the host's acknowledgement appears. Acknowledgements carry the accepted input sequence and counters. The host queues each new edge once, caps unusual bursts at eight, and supplies one pulse per native tick. Reordered or duplicated packets cannot replay an edge. Six tenths of a second without an input packet neutralizes held controls. Epoch changes reset queues/counters and fence old input.

One 10 Hz scheduler owns every outgoing game message. Host slot zero and every fourth slot send a reliable compact full frame; critical events can bring the next full frame forward. Other slots send unreliable motion at no more than 1,200 UTF-8 bytes. A larger motion frame is promoted to a reliable full frame in that same slot. Combined traffic is guarded at ten messages per rolling second, below the Hub limit of twenty. All packets are checked against 16,384 UTF-8 bytes. Reliable event batches are packed below 15,000 bytes and spill into later full frames. Presentation queues are bounded; expendable footsteps/rungs/swing noise are discarded before critical events under an abnormal sustained stall. Canonical state always carries the current outcome independently of event history.

Full frames contain compact arrays for world objective/status, roster poses/actions, rocks, key/picks, warning lanes, ladder topology/timers, door state, finale, stats, tutorial flags and tuning. They omit unbounded reward/contact sets and native body internals. Templates rebuild static geometry from chamber/route data. Actual Hub roster names/colors are rendered as text by the view.

Motion contains quarter-unit targets, canonical health/tools/action pose, hazard motion and supplies. It updates exact authoritative target records separately from presentation positions. A 55 ms exponential blend smooths remote miners and hazards. Only the owning miner’s traversal runs promptly in a separate native Platformer: movement, variable jump, crouch and ladders use the same map and tuning. Host acknowledgements identify the input frame already applied; each new authoritative body is restored and at most 240 retained native input frames are replayed to reconcile the local view. Jump buffer/coyote/cut/knockback traversal state accompanies the pose. No attack contacts, health, tool wear, pickups, scores, director, RNG or authoritative cooldowns are predicted. Epoch changes and end clear prediction history. Reliable topology/events may arrive after a newer unreliable motion: the topology/events are applied, then newer poses are retained to avoid rewinding. `link.authoritative` and diagnostics expose the latest exact targets/tick for tests.

## Evidence

`node tests/network-unit.mjs` is a quiet native fake-Hub suite; it exports `networkTests()` returning `{count, failures}` for the aggregate verifier. Twenty-nine checks passed on 2026-11-06:

- Countdown clock/input/traffic gate; native remote movement; face/aim/hold encoding.
- Sender authentication; duplicate/stale sequences; repeated/lost action edges and acknowledgements; input silence.
- Epoch fencing; reliable event deduplication; native action/topology/stat/supply reconstruction.
- Newer motion overtaking a keyframe; interpolation without client simulation.
- Ten-message rolling-second guard, 1,200-byte unreliable limit and 16 KB hard limit, including twelve rocks and large bounded event batches.
- Carrier departure/key recovery; one tied host finish; nonplayer server authority.
- A 150 ms delayed, 5% lossy transport; complete post-end listener/traffic cleanup.
- Immediate local movement before a packet round trip; bounded replay history; inability to collect keys/tools, award gold or apply damage from prediction.
- Press-time jump direction and high/low redirect aim surviving between-slot input changes.
- Six complete, ordinary-input expeditions through every door route with player-host or hidden-server authority at 150 ms one-way latency, 50 ms jitter and 5% unreliable loss.

These deterministic tests establish adapter rules and full canonical expedition completion, not official browser harness conformance. The game's aggregate verification must separately run the unchanged official harness for one/two seats, 150 ms latency + 50 ms jitter + 5% loss, host leave and hidden server, and assert gameplay progression through the actual canonical simulation. Physical online devices, real controller feel and a public internet connection remain unconfirmed by local stand-ins.


## Full gameplay and defect evidence

The native fake-Hub driver instantiates a production `PD.Pilot` for each actual player and reads that player's visible client Mine, including its own predicted body. It sends only canonical controls; it never grants health/tools/keys, changes balance, teleports, steps a client Mine or sets completion. Baseline seed 73082 completed every route with both authority roles:

| Authority | Forge | Spring | Crusher |
| --- | --- | --- | --- |
| Player host + remote partner | 249.14 s | 265.39 s | 214.97 s |
| Hidden nonplayer host + two remote players | 240.06 s | 283.48 s | 235.22 s |

All six runs recorded three keys, three doors, three extraction wave clears, both high/low redirects, a broken tool, replacements and collisions. The longest result leaves more than ten minutes before the 15-minute Hub deadline. The separate native simulation suite still passes all 67 checks, including fifteen seed/route solo expeditions and all three simultaneous couch routes.

The longer investigation exposed real feedback issues that short straight-line transport tests missed: local traversal initially waited for snapshots, and a brief local turn/directional action could vanish between 10 Hz sends. Isolated native movement prediction and retained press context resolve those issues. It also exposed a limitation in the original reactive pilot: the intake emits a warned rock close enough to the home position that waiting to see the rock before sending an attack is too late remotely. The production pilot now reads nearby warnings, guards lanes with the ordinary held Chop input, keeps simultaneous miners in separate defensible lanes, retries deliberate door/redirect presses, and leads dodge forecasts by the observed input round trip. Heavy routes use more cautious low-health evasion. These are controller decisions, not simulation privileges. The native standalone proof keeps its established contact rhythm; attract and network scenarios use the warning-aware behavior.


### Protecting a deliberate redirect from assisted chopping

A full official-browser expedition initially extracted successfully while acknowledged Q presses made no redirect contacts. The continuous guard could shatter the selected soft ore before its delayed redirect reached authority. The Forge pilot now reserves a visible door warning while a high/low arc is still missing: it releases Chop early, the nearest armed miner holds still and times Q using the observed input lead and the native active window, and any nearby partner leaves that rock available. The reservation ends on an observed ownership cue, authoritative contact count, or a short timeout. The other miner can continue guarding farther along the lane. Spring and Crusher keep their existing policies for moving/heavy targets. This changes ordinary AI decisions only; no packet, collision, tool, health, reward or completion rule changes, and a redirected rock retains its hazard grace and subsequent danger.

Final native fake-transport Forge evidence records high/low contacts in both authority roles (player-host high4/low4; hidden-server high2/low3). Browser conformance and full contact evidence remain the aggregate harness's responsibility; an acknowledged input by itself is not counted as a hit.
