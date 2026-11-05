# Issues caught by testing (this build session)

Every issue a test, a bot run or a screenshot caught, in the order found, with the fix. "Critical" means an area, a
boss or a mode could not be finished. Mistakes in the test code itself (wrong paths, back-facing test quads, a helper
scene that cleared itself) are not counted. The Testing Feedback in `src/99-about.js` (the About screen and
`exit-interview.json`) quotes the totals at the end.

## Game bugs caught by the bot playthroughs and boss runs (headless, `game.advance`; 66 by the whole game played through its screens)
| # | Issue | Critical | Fix |
|---|---|---|---|
| 1 | The Bulldog's fuel tank sat inside the truck's collider: 1-3 could never be cleared | yes | tank on the front bumper, an oriented collider |
| 2 | Bridge enemies in the canals were left behind the boat: 1-4 could never be cleared | yes | the boat holds before each bridge; enemies left behind are removed |
| 3 | Barracuda boarded outside the players' field of view: 1-B could not be finished | yes | the view swings to the bow when she boards |
| 4 | The shield trooper had no handler for the hide state: 3-1 stuck | yes | hide becomes brace |
| 5 | The shield trooper kept his crouch when he rose to fire: unkillable | yes | the duck offset returns to zero |
| 6 | Funicular terrace cover points at the wrong heights and out of view: 2-3 stuck | yes | covers moved to the terraces, holds before each |
| 7 | Funicular terrace parapets blocked every line of sight from the car | yes | parapets removed; enemies drop flat on the ledge to hide |
| 8 | Riders rappelling onto the lift stayed 70 units up their ropes: 3-4 stuck | yes | the descent finishes before the AI takes over |
| 9 | The lighthouse's box collider hid an enemy on the stairs: 2-4 stuck | yes | cylinders collide as an inscribed box |
| 10 | Hammerhead's shield also covered his shins: no handgun damage possible | yes | the shield is an oriented box from knee height |
| 11 | Hammerhead's rig became NaN (a velocity with x but no y): unhittable | yes | every pose sets both |
| 12 | The Seawolf hovered outside the field of view in 3-2: unshootable | yes | it hovers over the gate |
| 13 | Training: time-ups cost lives and could reach CONTINUE | yes | Training's clock runs only in the timed drill; no lives lost |
| 14 | Grenade-launcher rounds passed through rig-based bosses and their blasts ignored them | no | rounds test the boss; blasts hurt rig parts |
| 15 | The infinite-ammo cheat never filled the special weapons (the attract demo) | no | the cheat keeps every weapon full |
| 16 | Rushers slashed every 0.7 s with three on screen (pinned the player) | no | a real stagger opening, a longer retreat, a wait when the threat cap is full |
| 17 | Two Red Tides and a grenadier at once pinned the player in 2-2 and 3-2 | no | one Red Tide per wave there |
| 18 | Area times too short for the fair bot in 1-2, 1-3 and 1-4 | no | 70, 90 and 70 s |
| 19 | Stage 3 areas could not be cleared in time even by the expert bot (3-1 to 3-4) | no | times from measurements; fewer simultaneous enemies |
| 20 | The returning Seawolf (3-4) drifted beside the view and soaked too many hits | no | in front of the lift, slower drift, pods 6 HP, rotor 10 HP |
| 21 | Scylla and Krake too tanky for 90 s; the Krake phase had no time of its own | no | lower HP; +90 s when Krake ejects |
| 22 | Area times too short for the fair bot in 2-1, 2-2, 2-4, 3-1 and 3-4 | no | 70, 75, 80, 90 and 95 s; one drone fewer in 3-1 |
| 66 | Every grenade-launcher shot threw an error in the shot effects (its event carries one point, not a list of ray ends), skipping the recoil; caught by the whole game played through its screens | no | the launcher's round draws as itself, no tracer |

## Bugs in the Autopilot bot itself, caught by the playthroughs
| # | Issue | Fix |
|---|---|---|
| 23 | Its target lock reset every step, so its aim never moved | lock by a stable key |
| 24 | It shot at enemies hidden behind cover | a line-of-sight check |
| 25 | It fired into riot shields | heads when he rises, the shotgun to knock the shield |
| 26 | It ignored launcher-only targets (the Training crate stack) | targets objects its weapons can break |
| 27 | It did not lead grenade-launcher shots | aims above for the drop |
| 28 | Locks on moving bosses reset (keys from positions) | keys from the part |
| 29 | It thrashed between targets, resetting its reaction each time | stickier locks |
| 30 | It dropped enemies whose torso was hidden instead of aiming at the head | falls back to the head |

## Cover points caught by the content validator (the exposed head seen from the players' slots)
| # | Issue |
|---|---|
| 31-32 | 1-2 m4, m5: too far to the side to be on screen |
| 33-34 | 2-1 w3, w4: the balconies were built inside the houses |
| 35 | 2-2 n1: an "up" peek behind a stack taller than the head |
| 36-38 | 2-4 hw1, hw2, s2: off screen, or behind the lighthouse |
| 39-40 | 3-1 h1, b3: peeking on the blocked side; behind a machinery house |

## Caught by the lighthouse and tower-roof checks (`lighthouse`: bot runs of 2-4, 2-B and 3-B, measured)
| # | Issue | Fix |
|---|---|---|
| 59 | The gallery floor's square collider stuck out past the round floor into the stair, hiding a deckhand from the landing | a cross of two boxes inside the circle |
| 60 | In the Krake fight player 1 ducked in the gap between two consoles, and player 4 stood outside the control room's glass | a front row of four consoles, one in front of each player |

## Caught by the browser end-to-end suite (`e2e`: real key presses, mouse, touch, a stubbed DualSense)
| # | Issue | Fix |
|---|---|---|
| 61 | Mouse hover moved the focus in menus and the dev panel only after a click, not after a key press | hover follows the pointer whenever it moves |
| 62 | Escape with the dev panel open opened the pause menu over it instead of closing the panel | play is not pausable while the panel is open |
| 63 | The fix for 62 left the pause screen up over the panel, holding every key | Dev mode closes the pause screen |
| 65 | Scenes guarded their input with game.menuOpen, a property the engine does not have (harmless: a menu pauses the game) | game.paused |

## Caught by the UI suite
| # | Issue |
|---|---|
| 41 | The touch-only check ignored its forced flag headless (the order of two checks) |

## Caught by screenshots
| # | Issue |
|---|---|
| 42 | The pixel font has no ✕ ○ □ △ · ◂ ● … ∞ ⚙: PlayStation prompts showed "?" (icons are now drawn) |
| 43 | The lift's opaque glass wall filled the view (glass is now see-through streaks) |
| 44 | The lift faced the turbine hall's wall (it now faces north over the sea) |
| 45 | The fish market's floor was blown out by its lights |
| 46 | The speedboat's windscreen blocked the canal view |
| 47 | Cutscene actors faced away from the camera |
| 48 | Main-menu descriptions overlapped the next item |
| 49 | The title's flyover started inside a warehouse wall |
| 50 | The Scylla fight was flooded by oversized blast and smoke particles; a parapet block sat in front of the camera |
| 51 | Hammerhead's door mesh hid his exposed shins |
| 52 | The radio box covered the top centre of the play area |
| 53 | Split screen: the score overlapped the TIME plate |
| 54 | The water's sparkle was too dense |
| 55 | The engine's version label showed "?" on the title |
| 56 | Long About pages were cut off at the bottom of the screen (pages now flow) |
| 57 | Every ride between areas started at its destination: the camera jumped ahead, back to the start of the path, and rode again (the previous slots were read after the scene changed) |
| 58 | The lighthouse climb did not match the plan: steps under the gallery floor, a ride beside the tower wall and through the gallery floor, the stair deckhands shot from the courtyard (now an outside stair of nearly two turns to a gate in the railing; the players climb to a landing mid-fight, the clock stopped, and shoot up at two deckhands on the turn above; the ride into 2-B climbs the rest) |
| 64 | The attract mode's DEMO PLAY bar hid the HUD's score and TIME labels; the touch-only notice was drawn over the TIME plate |
| 67 | Riding the funicular (2-3), the car's own roof, roof lamp and side glass filled the view and hid the terrace enemies (the car they ride is now open above the waist; the car coming down keeps its body) |
| 68 | Riding the glass lift (3-4), the near pane's streaks filled a third of the view (the lift they ride drops its panes; frame, roof and console stay) |

## Totals
- **68 issues caught by testing**: 60 in the game (23 from the bot runs, 10 from the content validator, 2 from the
  lighthouse and tower-roof checks, 1 from the UI suite, 4 from the browser end-to-end suite, 20 from screenshots) and 8
  in the bot used for testing.
- **13 critical** (1 to 13).
- Found by reviewing the build against the plan rather than by a test (tests added since): only 4 of the 6 intel
  bottles were placed; the first ARCADE start did not offer Training.
- Caught nothing: the 3D math and rasterizer unit tests (`math3d`, `raster`).
