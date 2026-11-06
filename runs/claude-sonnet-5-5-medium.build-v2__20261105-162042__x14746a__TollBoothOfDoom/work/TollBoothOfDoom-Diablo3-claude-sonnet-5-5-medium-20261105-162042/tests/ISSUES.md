# Issues caught by tests (C = critical / game breaking)

1. C  Tutorial yard spawned trash and elite packs from room markers (the scripted start was unwinnable at level 1). Playthrough.
2. C  Scripted tutorial monsters could spawn inside walls and never reach the hero. Playthrough.
3. C  Scripted upgrade drop landed in a wall; drops are now snapped to floor. Playthrough.
4.    Bot stopped 1.2 m from loot, outside the 1.0 m pick-up radius. Playthrough.
5. C  "Reach" quest steps advanced when an exit was used while it was still locked. Playthrough.
6.    Unquiet Coffin sat 2.5 m from the yard exit and triggered it. Playthrough.
7. C  Relic Bone interaction did nothing (spot kind missing from useSpot). Playthrough.
8.    Relic Bone next to the exit: the exit won the interaction. Playthrough.
9. C  Lychgates were placed inside walls. Playthrough.
10.   Exit lock was stale on the frame the step changed. Playthrough.
11. C  Coins stolen by the Bursar crashed the loot view (no item). Playthrough.
12. C  Foreclosure bone walls stayed forever after the boss died. Playthrough.
13. C  Authored boss arenas had no exit spot. Playthrough.
14. C  Monsters deadlocked in crowds at one-cell doorways. Playthrough.
15.   Monsters oscillated between direct and flow-field steering. Playthrough.
16. C  A body overlapping a wall by a hair could never slide out of a doorway. Playthrough.
17. C  Choosing a class on the New Hero screen always picked the last card (focus reset inside the draw loop). Playthrough through real menus.
18. C  Pause and Hero screens closed on the very frame they opened (same key toggled them). Shell test.
19. C  Pressing Options on a second pad paused the first player's game instead of joining. Couch test.
20.   49 text blocks overflowed or overlapped at the 427 x 240 art size. Layout test.
21.   Requiem bonus paid on every fifth kill and compounded: levels 30 by the second zone. Balance report.
22.   Bot cast skills out of range for ever and never moved. Playthrough.
23.   Bot walked into walls toward loot or foes it could not reach. Playthrough.
24.   Texture and model ids used by data did not exist (ruined-wall, rock-large-a). Lint.
25.   Half-built Drowned Pantry and Sister Pyx traces after cutting them. Lint.
26.   Comment words ("stub", "Math.random") tripped the lint. Lint.
27.   Music/sfx test unlocked audio by a fake key instead of a real event. Browser test.
28.   Fixed 480 x 270 layout assumption: art size is 427 x 240 at 720p. Screenshot.
29.   Hero was hard to see against dark floors (no light on the hero). Screenshot.
30.   Town spawn was at the map edge with nothing in view. Screenshot.

Engine notes: NavGrid centres its origin by default (pass `origin: [0, 0, 0]` to match grid coordinates); the headless HUD is 480 wide while a 720p page is 427.
31. C  Hub sessions never started the simulation: the sim stayed paused after the countdown (the harness checks passed, only the game-level two-frame check saw it). Hub game test.
32. C  Boss attack timers counted down by the distance to the target instead of by time (a shadowed variable): bosses fired every frame and flooded the arena with adds. Playthrough (sexton at the Belfry).
33.   Balance: level at the credits and boss lengths were outside the plan's ranges (bosses too short, XP too high or low). Balance report in the playthrough.
34. C  Fell-off-the-map placement: the boss crumble helper used a nav check that accepts positions outside the grid, so a hero could land outside the arena. Playthrough.
35. C  Malison's Belfry ropes never counted as used, so the last phase could not end; the quest also asked for the same three ropes again afterwards. Playthrough.
36.   Malison's crumbled floor never came back, and the view never drew it. Playthrough.
37.   Bot chased out-of-range targets and flipped between fighting and rushing a goal at a distance threshold. Playthrough.
38. C  Knell Runs (and the hub session round) had no monsters at all: the Knell zone listed none. Last Bell test.
39.   The Last Bell start put set pieces over two of its three legendaries. Last Bell test.
