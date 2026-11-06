# Unique issue ledger

Counts include distinct defects caught by scripts or focused code audit, not repeated failing assertions.

| ID | Severity | Found by | Defect | Fix / verification |
|---|---|---|---|---|
| S-001 | medium | normal seeded legal bot playthrough | PLUM bot lost its last-target route; normal rules stayed valid | committed-route interception forecast; all tested seeds clear |
| S-002 | low | authoring audit | campaign count was hardcoded in simulation | derive count from content; expanded content remains possible |
| S-003 | low | reveal-rule test/audit | stage reveal period was hardcoded | use authored reveal period |
| V-001 | medium | presentation code audit | workshop snack animation received a string ID as numeric phase, producing NaN | numeric index for animation; browser editor/render checks pass |
| V-002 | medium | presentation code audit | string wall palette read only first character | accept complete palette string; browser editor/render checks pass |
| V-003 | low | presentation code audit | gate light used elapsed modulo after safe closure deferral | warning light uses authoritative remaining/warning |
| N-001 | medium | network code audit | a one-tick reveal press could be lost before rate-limited input send | action latch retained until successful send; network unit pass |
| S-004 | low | terminal-state review | terminal calls continued advancing the simulation clock | freeze after won/lost; immutable-snapshot test passes |
| S-005 | low | movement review | blocked buffered turns lacked a wall echo | collision echo added and tested |
| V-004 | low | integration review | predator reward pop used points while sim supplies reward | show actual 5/10/20 reward |
| V-005 | low | results review | custom and remix victories claimed72bites | use actual food statistics |
| V-006 | medium | animation integration review | event and turn timers were not consumed in presentation | authoritative anticipation, bites, chirps, hits, rig kicks and gate pointer wired |
| W-001 | medium | workshop browser-flow audit | playtest could return to editor only after completion | Return to workshop added to playtest pause |
| A-001 | medium | retry audio review | restarted event IDs collided with retained audio deduplication | clear audio event identity set on every newrun/attractinstance |
| N-002 | medium | client presentation review | remote clients drew10Hz position steps directly | cosmetic65ms smoothing; resets for discontinuity/revision; authoritative snapshots unchanged |
| N-003 | low | departing-seat review | remaining hero's numbered ring could change on departure | keep stable display index by actor ID |
| D-001 | low | live-tools review | persisted slider values could disagree with fresh run rules | initialise developer slider values from active simulation on entry |
| C-001 | critical | TV screenshot and phone input test | canvas retained default300×150CSS size, cropping board and mis-scaling pointer input | full-viewport fixed canvas CSS; desktop/phone viewport and input checks pass |
| I-001 | medium | actual mouse hover browser test | native Shell buttons did not focus on hover | delegated non-touch pointerover focuses actionable native buttons |
| I-002 | medium | emulated pad reassignment test | intentional solo→couch device handoff looked like disconnection; solo aftercouch retained pad:null | reset primary input identity during explicit seat assignment; real disconnect handling retained |
| V-007 | medium | phone/TV screenshot inspection | stage hints covered playable board rows | native contextual cards moved into desktopsidebar/phoneupper safe area |
| V-008 | low | phone screenshot inspection | native START appeared beneath custom menu button | native touch system uses custom corner ownership |
| V-009 | low | stopped-step screenshot inspection | camera target set during draw left first playframe at title offset | frame camera fitted during fixed update before renderer begins |
| U-001 | medium | actual TV About click and title screenshot | seven-action title column pushed About offscreen without scrolling | compact two-column title actions and bounded scrolling keep every action reachable |
| V-010 | medium | six-frame tunnel/gate motion strip | blanket native actor wrapping duplicated creatures into decorative sidebars | wrap only the projected centre at paired board mouths; remove renderer-wide copies |
