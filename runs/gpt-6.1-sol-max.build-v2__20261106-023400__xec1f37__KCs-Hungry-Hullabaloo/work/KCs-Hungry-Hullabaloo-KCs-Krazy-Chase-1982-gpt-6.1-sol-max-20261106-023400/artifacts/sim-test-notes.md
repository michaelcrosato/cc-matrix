# Simulation verification

Current result: 40 passed / 0 failed.

## Reusable API

- tests/sim-tests.mjs exports runSimTests(), returning passed, failed, failures, and evidence. It prints nothing when imported. Direct invocation prints only failures and one count.
- tests/bot.mjs exports botCommands(world, options) and runCampaign(players=1, seed=297728, options). Commands are ordinary cardinal direction intents and never plant or issue stop commands. The bot only reads the actual world. Near threats, it tries a small flat set of directions in detached 0.55-second snapshots, cached for 0.075 seconds. It has no game-state tree search and never mutates the live simulation. options.simple=true disables that lookahead.
- runCampaign returns a world reference as well as report data; strip world before serializing. It calls nextGarden only from legitimate clear states.

## Campaign evidence

```json
{
  "solo": {
    "won": true,
    "players": 1,
    "seed": 297728,
    "seconds": 209.12,
    "score": 2014,
    "lives": 3,
    "stats": {
      "bites": 154,
      "catches": 25,
      "trees": 87,
      "wraps": 15,
      "plants": 0,
      "hits": 0
    },
    "gardens": [
      {
        "level": 0,
        "wave": 0,
        "seconds": 4.78,
        "score": 64,
        "lives": 3,
        "bites": 6
      },
      {
        "level": 0,
        "wave": 1,
        "seconds": 5.85,
        "score": 135,
        "lives": 3,
        "bites": 12
      },
      {
        "level": 0,
        "wave": 2,
        "seconds": 4.6,
        "score": 185,
        "lives": 3,
        "bites": 18
      },
      {
        "level": 1,
        "wave": 0,
        "seconds": 6.46,
        "score": 293,
        "lives": 3,
        "bites": 8
      },
      {
        "level": 1,
        "wave": 1,
        "seconds": 9.72,
        "score": 417,
        "lives": 3,
        "bites": 17
      },
      {
        "level": 1,
        "wave": 2,
        "seconds": 8.1,
        "score": 525,
        "lives": 3,
        "bites": 26
      },
      {
        "level": 2,
        "wave": 0,
        "seconds": 12.54,
        "score": 663,
        "lives": 3,
        "bites": 9
      },
      {
        "level": 2,
        "wave": 1,
        "seconds": 15.13,
        "score": 785,
        "lives": 3,
        "bites": 19
      },
      {
        "level": 2,
        "wave": 2,
        "seconds": 9.2,
        "score": 880,
        "lives": 3,
        "bites": 30
      },
      {
        "level": 3,
        "wave": 0,
        "seconds": 15.13,
        "score": 992,
        "lives": 3,
        "bites": 10
      },
      {
        "level": 3,
        "wave": 1,
        "seconds": 32.53,
        "score": 1211,
        "lives": 3,
        "bites": 22
      },
      {
        "level": 3,
        "wave": 2,
        "seconds": 18.79,
        "score": 1370,
        "lives": 3,
        "bites": 34
      },
      {
        "level": 4,
        "wave": 0,
        "seconds": 20.9,
        "score": 1583,
        "lives": 3,
        "bites": 14
      },
      {
        "level": 4,
        "wave": 1,
        "seconds": 24.73,
        "score": 1813,
        "lives": 3,
        "bites": 30
      },
      {
        "level": 4,
        "wave": 2,
        "seconds": 20.64,
        "score": 2014,
        "lives": 3,
        "bites": 46
      }
    ],
    "modified": false,
    "demo": false
  },
  "coop": {
    "won": true,
    "players": 2,
    "seed": 297728,
    "seconds": 154.06,
    "score": 1970,
    "lives": 3,
    "stats": {
      "bites": 154,
      "catches": 26,
      "trees": 98,
      "wraps": 21,
      "plants": 0,
      "hits": 0
    },
    "gardens": [
      {
        "level": 0,
        "wave": 0,
        "seconds": 4.05,
        "score": 95,
        "lives": 3,
        "bites": 6
      },
      {
        "level": 0,
        "wave": 1,
        "seconds": 5.43,
        "score": 162,
        "lives": 3,
        "bites": 12
      },
      {
        "level": 0,
        "wave": 2,
        "seconds": 4.77,
        "score": 212,
        "lives": 3,
        "bites": 18
      },
      {
        "level": 1,
        "wave": 0,
        "seconds": 6.62,
        "score": 320,
        "lives": 3,
        "bites": 8
      },
      {
        "level": 1,
        "wave": 1,
        "seconds": 8.53,
        "score": 444,
        "lives": 3,
        "bites": 17
      },
      {
        "level": 1,
        "wave": 2,
        "seconds": 8.73,
        "score": 546,
        "lives": 3,
        "bites": 26
      },
      {
        "level": 2,
        "wave": 0,
        "seconds": 7.54,
        "score": 667,
        "lives": 3,
        "bites": 9
      },
      {
        "level": 2,
        "wave": 1,
        "seconds": 11.45,
        "score": 829,
        "lives": 3,
        "bites": 19
      },
      {
        "level": 2,
        "wave": 2,
        "seconds": 9.52,
        "score": 959,
        "lives": 3,
        "bites": 30
      },
      {
        "level": 3,
        "wave": 0,
        "seconds": 16.12,
        "score": 1029,
        "lives": 3,
        "bites": 10
      },
      {
        "level": 3,
        "wave": 1,
        "seconds": 14.71,
        "score": 1248,
        "lives": 3,
        "bites": 22
      },
      {
        "level": 3,
        "wave": 2,
        "seconds": 13.57,
        "score": 1370,
        "lives": 3,
        "bites": 34
      },
      {
        "level": 4,
        "wave": 0,
        "seconds": 11.17,
        "score": 1522,
        "lives": 3,
        "bites": 14
      },
      {
        "level": 4,
        "wave": 1,
        "seconds": 17,
        "score": 1783,
        "lives": 3,
        "bites": 30
      },
      {
        "level": 4,
        "wave": 2,
        "seconds": 14.85,
        "score": 1970,
        "lives": 3,
        "bites": 46
      }
    ],
    "modified": false,
    "demo": false
  }
}
```

The evidence above uses normal lives, speeds, collisions and seeded AI, with no developer tuning, teleport, invulnerability, force-clear, or demo flag. Neither campaign plants bait: all objectives remain clearable without spending a seed. Bot runtimes are simulated seconds, not claims about a new human player's first run.

## Covered policies

All five content validators and connected spawn routes; ordinary wall collision; buffered turns; immediate reversal; every paired wrap in navigation/motion; no cross-board wrap interpolation; cell/world conversion; mover serialization; corner and wrap chain history; tail-only bites/cooldown; soft middle bodies; dangerous segmentless head; duplicate/two-head contacts; fright expiry, catch deduplication and spin recovery; shared final seed and duplicate planting; bait chew; team life grace and nursery protection; killed-player suppression; surviving teammate final bite; defeat precedence; final-course life cap; checkpoint rollback; departing player cleanup; serializable tuning/reset; malformed workshop rejection; unsupported snapshots; deterministic snapshot replay; complete ordinary solo and co-op campaigns.

## Test findings

No production simulation defect was exposed by the first focused run. Two initial assertion failures were test-fixture issues, not game bugs: life restoration correctly occurs at the end of a garden's final course after root's pacing change; the original supposed isolated floor fixture was still connected. Both assertions were corrected. The first simple navigation bot won the first three gardens but died in the two-crawler garden; the small lookahead planner solved that without changing game rules.

Earlier five-course version before root's three-course pacing change: solo 67.71 seconds, co-op 45.09 seconds, both 47 bites and no hits. Current fifteen-course evidence is recorded above.

## Limits

These are deterministic rules and bot checks, not subjective balance evaluation or human playtesting. Device/menu/storage/browser/Hub checks belong to the app-level verifier.

## Additional focused regressions and source fixes

The runner now has 40 checks. The original 35 passed, then three additional focused checks exposed production issues and were reported to root (who owns the simulation source):

1. Developer invulnerability survives `retry()` while `s.modified` returns to false. This compromises record separation: a normal-looking run can retain a cheat. Recommended fix: clear the nonserialized capability in `restore()` (or retain modified while any cheat remains).
2. `MazeGraph.edge(cell,[0,0])` returns a self-edge. Idle `MazeMover.update(.1,graph,null)` reports motion and travel, potentially delaying initial movement until a fake edge ends. Recommended fix: reject noncardinal directions in `edge()`.
3. `validateLevel` builds its graph before checking wrap fields. Importing `{wraps:[{a:[0,4]}]}` throws while reading undefined `.join()` rather than returning a useful validation result. Recommended fix: validate the complete topology shape before graph construction.

The focused command confirmed 0 passed / 3 failed before fixes. These are three unique simulation issues; the invulnerability leak affects record integrity. Neither the first simple bot's losses nor the two corrected test fixtures are counted as production issues.


## Final root-fix verification

Root rejected noncardinal graph directions, validated malformed topology/entity schemas before graph construction, cleared nonserialized invulnerability on restore, and kept the modified flag sticky across retry. All 40 simulation checks now pass. Native click-to-move stopping was separately repaired by root; the final bot proof uses direction intents only and does not depend on stopping.

Final ordinary campaign totals: solo 209.12s / score 2014; co-op 154.06s / score 1970. Both complete all 15 courses with 154 bites, zero damage hits, no plants, normal three lives, modified=false and demo=false.
