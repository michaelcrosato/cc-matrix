# Authoring the tower

`tower.js` is the game’s authored content. It declares a 320-unit-wide facade,
48-unit floor spacing and feet at z=16. All play happens in x/z, with y=0.
The renderer, rule simulation, bot and network replicas consume these same IDs
and coordinates. Change this data, then run `npm run --silent verify` from the
development directory; do not edit collision or transport code to move a window.

Each entry in `CONTENT.sections` has an ID, display copy, inset, start X, exit X,
floor count, facade palette, windows, bumper fixtures, hazard encounters and
heart throws. Sections 0–2 each have four climbs; section 3 is the three-beat
roof. A section’s collision map is built from the floor count and inset using
the native `PlatformMap`. The four floors fit the game’s fixed composition.

Each window has a unique ID, zero-based lower floor, X, lower feet Z, upper feet
Z, order and opening delay in section seconds. Multiple windows on a floor take
turns; exactly one can be open or warning at a time. `DEFAULTS.windowOpen` is the
fully usable period, `windowWarning` is the last risky interval, and the opening,
closing and inter-window beats are 0.5, 0.45 and 0.8 seconds respectively. A
normal ascent lasts `DEFAULTS.climbTime` (0.72 s); it is a native `E.Action` on
the native `Platformer` body. Hold/reverse owns the body until one endpoint or
shutter closure. Never put a window outside its ledge or leave a lower floor
without an upward window. Initial delays leave active floor space for learning
the hazard and heart before the next ascent; alternate windows keep recurring
opportunities available after mistakes.

An encounter has a stable ID, one of `boulder`, `bumper`, `split`, `rat`, `bird`
or `bat`, floor, delay after that floor is first reached, incoming side, wind-up,
speed and repeat cadence. Every incoming hazard starts in `telegraph`; its
collision is inactive until the wind-up finishes. Recurrences keep the same
award key, so waiting cannot farm a score. Actual instances append a cycle to
their ID. A hazard bounces out of play after damaging a climber, so the same
physical collision cannot spend another shared chance on a teammate. A powered
collision breaks it and awards 50 once.

Bumper fixtures have an ID, X, floor and mode. A `reverse` fixture points through
`next` to its linked `drop`. Cracked stones use a `split` fixture: the two new
small stones have opposite horizontal velocities and their own swept collision.
Ground creatures scurry along their lane. Birds have a high approach, low
central crossing and high exit, leaving safe facade edge pockets. Bats have a
separate dive/glide/recovery rhythm. These paths are state machines, never
arbitrary damaging sine waves.

Heart entries have an ID, floor, target X, delay, repeat and lifetime. They begin
at Mabel’s animated hand position, drift visibly to chest height, and bob there.
They grant the whole team six seconds by default. Repeated throws can restore
protection but the base heart awards its 50 points once; delivery of an identical
instance ID cannot refresh or award twice. Every upper-floor route has a
recoverable throw, including the final roof ledge, so missing the final heart
does not require replaying the tower.

The rooftop `finale` declares the three climbed heights, rescue X and tolerance,
heart requirement, and nine-second departure. Reaching Hank while powered
commits the rescue and its stable reward before the plane scene. Results and
the Hub finish happen after departure. The harder replay reverses the authored
window order, offsets its phase, adds deliberate rat/bat combinations, and
changes encounter cadence; character physics and hazard speed stay unchanged.

Checkpoints save section, clean score baseline, awarded IDs, seed, difficulty,
configured spare chances and elapsed time. A retry restores that baseline,
returns all climbers to the section’s entry and marks the run continued. A dev
warp, cheat or changed balance marks the run unranked. An invalid save returns
false without changing the fresh simulation. No storage is read from the rule
layer.

`validateContent()` rejects missing or duplicate IDs, broken fixture links,
windows outside ledges, invalid endpoint/timing data, unknown hazards and
floors without a reachable upward route. `tests/rules.mjs` adds boundary cases,
native physics checks and actual solo/co-op intention-driven playthroughs.
Their route reports record which hazards, jumps, window climbs, hearts,
pursuits, collisions and rescue events actually occurred.
