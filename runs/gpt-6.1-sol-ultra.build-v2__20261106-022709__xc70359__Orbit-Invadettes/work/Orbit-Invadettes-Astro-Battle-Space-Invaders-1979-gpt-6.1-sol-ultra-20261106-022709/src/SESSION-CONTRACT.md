# Session adapter

Pinned upstream AI Hub Session Protocol v1 / session.js 1.4.0, commit 35a1047f2067b2af3de3943f0fe452f39105d869. Vendor session.js is pristine; do not bundle-transform it.

Import connectSession from session.js and await connectSession({createWorld,stepWorld,leaveSeat,onWorld,onEvents,onStart,onEnd}). Standalone returns null. A session returns controller:
- active=true throughout this iframe's session lifecycle; ended becomes true after end/cancel. Never fall back to standalone after a round.
- isHost,server,seat (-1 on server),info (roster ids/names),world,phase (waiting/countdown/playing/finished/ended),diagnostics.
- update(command,overlay=false) accepts ONE local-seat command {move:-1..1,fire,repair,targetX?}. repair is a boolean edge; repeated held true is debounced. Do not call a local input sampler at all on server=true.
- pump() is automatic on independent 16ms interval, so it survives local menus and ordinary RAF stalls. App must NEVER step a Hub world. A host catches up to floor(AIHub.time()*120/1000); start before clock0 is countdown only.
- interpolatedWorld() returns a draw-only view for guests; authoritative world remains unchanged. Remote entities interpolate, while the local cannon alone predicts bounded horizontal movement from recent ordinary inputs. Snapshot input-packet acknowledgments expose reconciliation progress; no combat results are predicted.
- stop() is cancellation for disposal only. The Hub owns navigation/results.

onWorld(world) runs initially and on host pump/guest receipt; root may hold its reference. onEvents(events) receives each host step's events, and guest-deduplicated presentation event batches. Use event IDs to avoid repeated effects. onStart fires at actual shared clock >=0. onEnd({reason,world}) must silence audio immediately and reject app input. UI overlays call update(neutral,true) while simulation/network keep running. Suppress engine pause/focus-loss globally in active Hub sessions; ignore Options when Create held.

Protocol:
- Host uses the world RNG exactly once to derive the simulation seed.
- Complete lossless state uses compact field keys and hexadecimal bit masks. Reliable full snapshots at 10Hz; 16000-byte preflight below client's16384-byte cap. No world truncation. Cosmetic event queue bounded64 during prolonged catch-up.
- Guest held commands heartbeat10Hz unreliable, with packet sequence, Hub time, bounded move/target, fire0/1, repair edge sequence. Host derives identity from callback from; any packet-supplied mismatch is rejected. Old sequences/timestamps rejected. 650ms stale-input timeout neutralizes seat and stale repair edges; next heartbeat restores it.
- Every snapshot carries consumed repair acknowledgments. Guests never simulate authoritative collisions, damage, pickups, repairs, progression or scores.
- A leave marks that seat inactive,gone,dead and cancels respawn without reserve or score gifts. Roster slots stay stable.
- Terminal full state is sent reliably; guest reliable acknowledgments precede host finish where possible (1200ms bounded grace). Finish is called once, active co-op IDs tied, personal contributions keyed by roster ID, won only on victory. Time-up is defeat/time-expired unless already victorious.
- Every Hub end stops timer, handlers, input and networking and calls onEnd for immediate audio silence.
