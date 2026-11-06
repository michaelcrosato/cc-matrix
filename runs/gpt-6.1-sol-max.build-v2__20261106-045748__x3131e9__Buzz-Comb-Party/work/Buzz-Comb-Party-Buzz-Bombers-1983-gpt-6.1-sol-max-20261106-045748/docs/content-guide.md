# Authoring the garden

Content is ordinary JavaScript data in `src/content.js`. The runtime accepts the same data as JSON via Pause → Developer Tools → Export / import. `BCP.validateContent(array)` validates before replacing a known-good world. Import takes `{version:1,tuning:{...},content:[...]}`; omit content for tuning only. A successful content import restarts the current garden and marks the run assisted. Invalid types, non-finite numbers, duplicate identities, out-of-arena positions, bad palettes and out-of-range phase conditions are rejected without applying a partial import.

Each encounter defines a stable `id`, `name`, short `sub`, `lesson` and success `gag`; three hex palette colors; a worker speed multiplier; `clearBonus`; initial ground `flowers` as blocked intervals; `combs` as `{id,x,tier,red}`; and timeline `entries` as `{id,at,kind,x,dir,tier}`. `kind` is `worker` or `fast`, tier is 0–6, x is 28–612, direction ±1 and `at` is seconds after the opening card. An optional `growth` array has `{at,x0,x1}`. Optional `boss` defines phases, hp, exposure seconds and repeat supply seconds. The pageant has one or three phases; maximum three.

The can has radius 10 plus two pixels clearance. Keep at least one wide legal ground interval. Flowers may split the rail, but one garden must never begin fully enclosed. The native fill/expand setting may change decoration, never coordinates. Palette changes are rendering data only. Score bands are defined by `feedValue` in simulation: 1,000 / 800 / 500 amber from high to low, plus 1,000 for red. Hit rewards are 100 worker and 1,000 express; hive/clear rewards are claimed once per stable identity.

## Example: add a normal wave

Export a diagnostic JSON, keep its `content`, and append these entries to encounter 2's `entries`:

```json
[
  {"id":"after-tea-a","at":90,"kind":"worker","x":40,"dir":1,"tier":1},
  {"id":"after-tea-b","at":93,"kind":"fast","x":600,"dir":-1,"tier":0}
]
```

Import the JSON. The pending-entry completion predicate naturally waits for them. A new arrangement requires no simulation changes; the simulation suite exercises adding an entry using this path. Reuse the encounter's palette/flower layout, or edit those fields in the same profile. Every entry ID must be unique inside its encounter so retries retain reward identity.

## Example: alter a finale phase

Change the final encounter's `boss` data to:

```json
{"phases":3,"hp":7,"exposure":18,"supply":9}
```

This gives each of the three buds seven spray hits and an 18-second window after every red harvest, with recurring express opportunities every nine seconds. Phase entry resets HP and exposure, and shortens the next supply delay. All three phases use the same fields by design; palette/animation varies by phase. The final phase schedules four mixed curtain-call entries after the last bud. Rescue escorts keep supplying combs after eight finite reward identities per phase; later repeats cannot manufacture points or reserve stock.

Run `npm test -- sim` after a data edit. It must still finish the full campaign with ordinary ammo/stock/cooldowns and balance its ledger. The bot's precision is not evidence of fair human difficulty; preserve first-window generosity and visible warnings.

## Tuning and debugging policy

Important values and documented units are in `src/tuning.js` and in the native slider panels. A tuning import merges into safe defaults and validates all values. Existing bee/can movement uses current values immediately. Existing entry times remain fixed until encounter restart, because changing deadlines while a wave is underway is hard to interpret. Capacity changes clamp current fill. Reset all tuning resets both widgets and actual values. Settings/profiles are separate from normal run defaults.

A hive pocket needs a same-tier open corridor narrower than 35 pixels for the full construction delay. The overlay shows the exact corridor reason. A comb on another tier cannot falsely trap the bee. Friendly bird fire, cleared targets and removal of pocket boundaries all recover automatically.
