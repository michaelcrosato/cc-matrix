# Canonical pilot expedition evidence

Validated 2026-11-06 against `src/sim/mine.js`, native `E.Platformer`/`E.Attack`, and authored rooms, with default tuning (`spawnInterval=6.8`, rock life 17s, collection grace 2s), seed 73082 and fixed 1/120s steps.

`P.Pilot` is a deterministic intent producer. It reads visible world and authored geometry, outputs `P.neutral()` canonical controls, and does not write miner positions, health, inventory, RNG, score, collision outcomes, completion flags or any other simulation state. Normal evidence uses `new P.Mine()` with `god=false`, `attract=false`, `developer=false`; no test-only completion route exists.

## Default solo results

| Route chosen in each chamber | Finish (simulation seconds) | Score | Total hits taken | Tool breaks | Replacement catches | Redirects high / low | Deliberate redirected collisions | Key expiries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Forge | 185.967 | 484 | 2 | 2 | 6 | 4 / 4 | 2 | 0 |
| Spring | 250.933 | 632 | 2 | 2 | 8 | 4 / 5 | 3 | 1 |
| Crusher | 207.275 | 585 | 3 | 4 | 6 | 5 / 5 | 2 | 0 |

Every route:

- Completes all three chambers through explicit Interact presses, with exactly three caught keys and three doorway entries.
- Exercises move, jump, duck, climb, keyless jam, ore chops, high/low redirects, genuine rock collisions, tool break, unarmed traversal and replacement collection.
- Has ordered events `break → pick → key → door`, followed by all three extraction wave clears and victory.
- Takes genuine damage where applicable, with ordinary three-mark health restored only at chamber transitions.
- Finishes with over ten minutes of margin against Hub's 900-second wall-clock limit at normal simulation speed.

The Spring run deliberately declines an unsafe high key, survives its expiry, and catches the guaranteed replacement from a bottom-lane mine event. The pilot also pursues reachable picks while waiting; it does not wait unarmed indefinitely just because a high key remains active.

Additional robustness: all 15 combinations of routes 0/1/2 and seeds 73082, 73083, 73084, 1 and 12345 completed without god or attract immunity.

Two independently controlled simultaneous miners also completed all default-seed routes through the same canonical path: Forge 194.692s, Spring 202.625s, Crusher 207.317s. These successful runs required no rescue; separate simulation cases must exercise rescue and player departure.

## Fixes from investigation

1. Navigation formerly rounded the current feet position to a tier while airborne. A gap jump could therefore be mistaken for arrival on the higher tier; the pilot repeatedly reversed toward the wrong ladder, exhausted tools and eventually died. Tier navigation now uses the floor containing the feet. Actual engine traversal rules did not need changing for this defect.
2. The former pilot chased every available rock through the center of supply collision lanes. The revised pilot defends the clear intake lane, pursues supplies when needed, then navigates the chosen door.
3. Fixed-distance unarmed jumping began too early for slow incoming ore. The pilot now estimates contact time and forecasts bounces, jumping shortly before low contact and ducking high hopper passes. It retains variable-height jump holds.
4. Goal priority formerly ignored picks after work quota, or while a high key existed. Supply recovery remains a priority when a safe key is not immediately catchable.
5. Facing changes on ladders and native crouch/descent overlap were simulation issues reported to the root agent and fixed there. This pilot uses those public canonical controls and has no engine modifications.

## Reproduction

From development folder, a pure native route run is:

```js
import { load } from './tools/load.mjs';
const P = load();
for (let route = 0; route < 3; route++) {
  const mine = new P.Mine();
  const pilot = new P.Pilot(route);
  while (mine.time < 900 && ['playing', 'transition'].includes(mine.status)) {
    mine.step({ 0: pilot.intent(mine) });
    mine.takeEvents();
  }
  if (mine.status !== 'victory' || mine.god || mine.attract) throw Error(`Route ${route}`);
  for (const type of ['jump', 'duck', 'climb', 'jam', 'redirect', 'collision', 'waveClear', 'victory']) {
    if (!mine.features[type]) throw Error(`Route ${route} missed ${type}`);
  }
  const types = mine.history.map(event => event.type);
  let at = -1;
  for (const type of ['break', 'pick', 'key', 'door']) {
    at = types.indexOf(type, at + 1);
    if (at < 0) throw Error(`Route ${route} missed ordered ${type}`);
  }
  if (mine.stats.keys !== 3 || mine.stats.doors !== 3 || mine.features.waveClear !== 3 ||
      !mine.stats.high || !mine.stats.low) throw Error(`Route ${route} incomplete features`);
}
```

Root's aggregate verification runner should contain equivalent route checks so final packaging reruns this evidence. This investigation used native headless state; it does not establish physical controller feel, touch usability or audiovisual presentation.
