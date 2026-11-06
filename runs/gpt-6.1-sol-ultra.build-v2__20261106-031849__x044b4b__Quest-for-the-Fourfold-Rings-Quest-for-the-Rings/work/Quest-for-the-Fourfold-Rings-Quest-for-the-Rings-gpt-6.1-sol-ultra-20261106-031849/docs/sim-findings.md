# Simulation findings

Only actual game findings count below. Two initial test fixture mistakes (a fixture missing its site context, and a test comparing different positions in an RNG sequence) were corrected in tests and are not counted as game defects.

| ID | Severity | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| SIM-001 | Medium | Continue restores historical events but restarts event IDs, allowing collisions with prior events and suppressing consumers that deduplicate IDs. | `Continue keeps event identities monotonic after checkpoint` fails: a post-restore pickup ID is below the maximum pre-save historical ID. | Fixed and regression test passes. |
| SIM-002 | Medium | A Ringmaster shift event spends its finite budget but its warning is erased on the next hazard update and no partition shift is scheduled. | Deterministic `rule-fixture-shifting1` seed selects shift at 14s; warning is false at 14.02s, before its telegraph can complete. Test `Ringmaster shift event telegraphs then moves an authored partition`. | Fixed and regression test passes. |

Additional resolved findings:

- SIM-003 (low, caught while adding the timeline regression test): a partial aim input containing `ax` but no `ay` passed the magnitude check and then called `atan2(undefined, ax)`, making authoritative facing and projectiles non-finite. Missing aim axes now normalize to zero; the finite-facing regression passes.
- SIM-004 (medium, root integration-review finding): cloaked contact damage applied only to flying Nightmares and occurred after target selection, so other families and the both-hidden/no-target branch could silently grant contact immunity. Contact now applies to every awake family (including the stationary dragon) before target selection, while existing stun/dodge/guard/hurt rules remain in force. A five-family both-hidden contact regression passes.

- SIM-005 (high, root objective-review finding): a noncarrier waiting at the exit could trigger delivery while the actual ring carrier remained elsewhere. Exit context now belongs to the carrier and completion independently verifies a living carrier at the gate. Final escape also requires every living hero to regroup; a downed partner remains recoverable. Four regression checks prove rejection, real carrier delivery, shared final regroup and survivor rescue.
- SIM-006 (medium, integration-review finding): Continue discarded the assisted-run label and live tuning, potentially presenting a previously assisted expedition as normal. Checkpoints now retain both; malformed tuning/statistics are rejected and older optional fields remain compatible. Three regression checks cover this.

No critical/game-breaking blocker has been found by these simulation tests so far; SIM-005 was a high-severity objective bypass. A normal full expedition and all ten unordered class pairs reach victory without debug mutations. Those outcomes do not prove subjective balance or a 20–30-minute human playtime.

## Current automated coverage

`tests/simulation.mjs` exports `runSimulationTests()` returning result objects; `tests/playthrough.mjs` exports `runPlaythroughTests()` and a reusable `ordinaryExpedition()` input driver. Integrate these behind `node tools/test.mjs`; test files are not bundled. Evidence is in `evidence/simulation.json` and `evidence/playthrough.json`.

The current suite has 96 passing checks: all authored geometry/partition states, route ownership/Dread, native attack timing, all four kits, ward/dodge/guard, status constraints, treasure pickup/pass/drop/recovery, revive priority and interruption, extraction of a downed partner, shifting safety, companion rescue in four families and visible safe stuck recovery, Continue/retry, corrupted saves, caches, final wipe/reset, labeled RNG, snapshots and director budgets, plus ten complete ordinary class-pair expeditions.

The separate normal expedition includes both optional caches. It records the actual action sequence, health samples, room transitions, seed, and an independent event history proving eight core room completions, four unique secured rings, four distinct seal stations and one victory. It uses default health/resources, no debug commands, no room jumps, no direct ring/objective state mutations, and no invulnerability.


## Integration corrections

Every hero now uses a distinct existing native Attack move: Warrior `slash`, Wizard `cast`, Phantom `rising`, Changeling `throw`. Explicit `.15s` wind-up, `.18s` active phase, `.35` active hit fraction and live recovery tuning are shared by animation, effect release and action sound. The three non-damaging actions release once at the active threshold; clients reconstruct the same native spec. Four class-specific timing tests verify that wind-up produces no spell/lure/reveal or attack sound, and that active releases exactly one.

A Ringmaster partition action schedules a real shift after its full warning rather than setting a transient visual flag. A phase offset integrates this authored event with regular partition timing without snapping the wall back on the following tick. Warning state is replicated to clients.

Checkpoints retain event IDs, ticks, epochs and labeled RNG state; older version-3 checkpoints safely recover their event counters from validated history. New events stay monotonic. Snapshot tuning transmits deviations from defaults and clients combine defaults with those deviations, reducing repeated packet data while making Reset to Defaults propagate correctly.


Latest relevant command: `node tools/test.mjs simulation playthrough audio` → **108 passed, 0 failed** (84 simulation, 2 playthrough, 22 audio). This rerun uses the corrected extraction/shared-escape and checkpoint rules. All ten ordinary class-pair expeditions and the full two-cache expedition still reach victory without a debug mutation or objective teleport. The normal bot required no regroup workaround.


## Final integration audit corrections

- SIM-007 (medium, integration-review finding): possession projections stored a copied `classId` but every class used a generic melee attack. Echoes now reuse the copied kit's action family: a Warrior's melee, Wizard's warned fixed-aim hostile rune, Phantom's warned reveal/repulsion pulse, or Changeling's one finite decoy. Wind-ups are intentionally longer for hostile readability. Projections never take input ownership or create recursive enemies. Four regression checks cover fixed aim and timing, pulse safety/single release, finite decoy/team replication, and visible-hero contact danger.
- SIM-008 (high, root network-review finding): host-created development hazard lanes damaged players, but snapshots sent only their phase list and clients reconstructed only the authored static lanes. Compact extra hazard definitions now accompany phase state. One regression checks equal host/client geometry, period, phase and warning progress.

Latest affected-suite command: `node tools/test.mjs simulation playthrough` → **91 passed, 0 failed** (89 simulation + 2 playthrough). All ten ordinary class pairs and the full two-cache expedition still finish under the current echo rules. Audio code was unchanged by these fixes, so its prior 22 passing assertions were not repeated for reassurance.


## Cache health correction

SIM-009 (medium, root balance-review finding): automatic full healing at every board return and castle entry made the optional mercy cache's healing reward redundant. Safe board transitions now retain surviving health and recover an extracted downed partner at three pips. Castle/chamber entry retains its existing minimum of three rather than healing to five; retries explicitly restore five as before. The mercy cache alone supplies its promised full-team healing (including a fallen partner); the other cache supplies its authored one-hit wards. Optional validated checkpoint health prevents Continue from becoming a free full heal; older saves without health remain compatible.

Seven focused health checks cover wounded board preservation, downed recovery, entry wounds and its safety minimum, meaningful single-use cache healing and persistence, fallen-partner mercy, wounded Continue, and malformed health. Latest command: `node tools/test.mjs simulation playthrough` → **98 passed, 0 failed** (96 simulation + 2 playthrough). All ten normal class pairs and the full two-cache expedition still reach victory.
