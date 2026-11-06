# Encounter authoring

`src/content/campaign.js` contains all eight authored waves, three boss phases, formation routes, score values, immutable balance defaults, and live-slider bounds. `src/game/simulation.js` is the common simulation for solo, hosted and standalone rooms. It does not access the DOM, audio or renderer.

The logical arena is fixed at x = −480…480 and y = −300…300, with cannon centers restricted to −450…450 at y = 240. Resize and camera changes never alter these bounds. Positive y travels down the screen. Health is three pips; a cleared encounter repairs one pip, and a disabled connected co-op machine returns with one pip.

An encounter uses this structure:

```js
{
  id: 'red-letter',
  name: 'RED LETTER DAY',
  cue: 'RED ORBS CURVE TOWARD YOU. BAIT, THEN INTERCEPT.',
  nominal: 50,
  formation: {
    count: 20,
    paths: ['curlRight', 'loopLeft'],
    rows: 3,
    spread: 680,
    stagger: 0.2,
    arrivalSpeed: 0.17,
    sway: 35
  },
  mix: ['mine', 'missile', 'missile', 'mine'],
  interval: 0.98,
  firstLaunch: 2.8,
  warning: 0.75,
  line: 'These little orbs adore you. Do not encourage them.',
  clear: 'Stop charging that vulgar time brake!',
  emotion: 'gloat'
}
```

`nominal` is authoring guidance, never a wait gate. Destroying the last ship immediately dissolves all active ordnance and starts the recovery card. Every launch advances through `mix` cyclically. Launch separation in hostile seconds is `interval * tuning.enemyFireInterval`. The shared brake multiplies hostile movement, warning clocks and launch clocks; cannons and normal shots retain real-time speed. There is no catch-up launch burst.

Paths contain at least four `[x,y]` points. Like the engine FORMATION kit, groups start at a rift, curl through an arc-length Catmull-smoothed `E.Path`, and interpolate into their formation slots. Groups of six stagger their arrivals. Surviving ships remain reachable and continue swaying rather than flying permanently away. Hull rows have distinct presentation variants. The later waves include some two-hit armored hulls.

To insert another wave, add an entry to `WAVES`, select known route names or add a route to `PATHS`, and choose a weapon mix. The simulation advances through the data; `validateCampaign()` deliberately enforces this delivery's eight-wave acceptance contract, so change that expected count along with a future campaign expansion. No renderer change is needed. Threat families enter cumulatively in the authored campaign.

Boss entries use `hp`, `mix`, `interval`, `cycle`, `openAt`, `openFor`, `warning`, `xAmplitude`, `xSpeed`, and dialogue. A boss is visibly shielded outside its open window. All phases use the four established threat rules. Boss warning and vulnerability clocks slow together with the associated attacks.

Threats are `missile`, `mine`, `roller`, and `hunter`. Mines have bounded acceleration and a fixed host-selected target. Hunters warn a single predicted intercept position, commit their velocity, and never revise that committed aim. A roller fixes a bounded 210-unit ground segment, points toward its chosen sweep direction, reserves a marked escape lane, and expires after 2.4 grounded seconds or at its endpoint. Only one roller can exist at a time. The scheduler rejects blocked exits and conflicting approach routes, suppresses seeking orbs during a reserved sweep, and redirects later launches away from the reserved lane. Grounded rollers cannot be intercepted.

`DEFAULT_TUNING` is frozen; each run gets its own copy. `TUNING_SPEC` supplies labels, units, bounds and step sizes. A run started with any nondefault tuning is marked modified before play. The developer jump/refill helpers also mark it. Resetting tuning restores a copy of the baseline, without erasing a run's modified status.

## Automation and canonical state

`createWorld`, `stepWorld`, `autoPilot`, `getSnapshot`, and `applySnapshot` are stable module exports. `stepWorld` defaults to exactly 1/120 second. Input is a dictionary keyed by the host-owned player ID, with `{ move, targetX, fire, brake }`. Keyboard/stick `move` takes precedence over `targetX` for that action frame. The input adapter owns pointer recapture and stale-packet expiry. A held brake only activates on its rising edge and a shared meter supports one activation per tick.

Each step replaces `world.events`; consumers handle them once after that step. Events carry monotonic IDs and never alter gameplay when replayed for presentation. Shot collision uses relative swept tests. Interceptions and enemy removals happen before surviving threats can damage machines, and encounter completion happens last. Serializing the world preserves deterministic gameplay RNG, counters, target ownership and phase state. Decorative RNG stays outside this module.

Run state coverage directly with `node tests/state.test.mjs`, or use the project's single quiet test command. The legitimate campaign pilot sends ordinary movement, fire and brake input; it never writes integrity, enemy health, score or phase state and does not enable assists or invulnerability.
