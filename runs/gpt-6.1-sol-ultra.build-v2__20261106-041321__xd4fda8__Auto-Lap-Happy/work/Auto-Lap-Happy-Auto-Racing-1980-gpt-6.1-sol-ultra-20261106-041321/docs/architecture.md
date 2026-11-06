# Architecture and invariants

The full pinned engine is unchanged. Game code adapts E.Car with reverse0, continuous analog intents and one authoritative update per1/120step. E.Race.update is not called; its path look-ahead/corner-braking recipe informs the new route-aware driver.

`world.js` owns original authored road data, Catmull paths, dense samples,12 directed gates/course, restart poses, surfaces, landmarks, collision footprints, discoveries and a free-drive navigation graph. `docs/world.md` explains content authoring. `render.js` owns native static shape definitions and continuous cosmetic motion; it cannot advance rules. `sim.js` owns car motion, local segment projection, directed gates/laps, recovery, incidents, scores and all mode state. Cosmetics have a separate seeded RNG.

A circuit lap needs every expected gate in order and a forward start crossing. Projection only searches neighbouring segments and rejects discontinuous travel. A reset cannot award a gate/lap. Wrong-way/invalid route cannot qualify for lead. The same legal unwrapped distance drives the twelve-body-length lead threshold. Free drive bypasses race gates entirely and remembers the last safe road pose for recovery.

All incidents for a tick resolve together: simultaneous crashes give no points; one crash gives rival2; crash supersedes lead; clean lead gives1; one incident stages exactly one exchange. Win checks happen before restaging. Both cars restart in separated safe slots at the leader’s latest gate, preserving profiles. A held recovery counts as crash in competition and adds3s in time trial. Long brake holds settle at zero; releasing resumes automatic acceleration.

`app.js` owns input/screen routing, persistent state, audio calls and camera. One visible interface serves every device. Gamepad/touch/keyboard input is normalized before simulation. Two local bindings remain assigned to their seat; loss brakes or pauses rather than moving controls to another seat. Screen steering targets a bounded heading. Touch uses invisible zones, automatic throttle and recorded assist.

Local pause freezes sim. Network overlays brake the local seat while common authority continues. `network.js` handles sequencing/validation/packing and transport, independent of player identity. A30Hz interval and render updates call the same guarded authority pump. One monotonic cursor advances exact120Hz ticks from the shared clock; hidden/actorless hosts continue and no step can run twice. Hub clock/deadline outrank local state. Guests only apply validated snapshots and send intents; authority alone scores/finishes. Network configuration, rule events and results are reliable; continuous state is bounded and unreliable.

Persistence uses `happy:v1:*` envelopes. Records include physics/course version, car, laps, acceleration, steering and touch assist in their key. Valid best runs retain timed poses for noncolliding ghosts. Dev and attract cannot overwrite ordinary records; browser test contexts isolate test storage. Hub uses its transient storage and cannot write standalone records. Missing, obsolete and corrupt storage fails safely.

Attract uses separate simulation state/settings and no record callbacks. It begins after10seconds of meaningful title/menu inactivity, loops actual road/course/trial/exploration/duel systems and consumes the input that returns to the prior menu. Network sessions and paused active rounds cannot enter it.

Build inlines the unchanged released session client first after charset, full engine, procedural art/game/audio/network/UI and reporting JSON into one file. Closing-script sequences are escaped. There are no ordinary runtime imports or audio files.
