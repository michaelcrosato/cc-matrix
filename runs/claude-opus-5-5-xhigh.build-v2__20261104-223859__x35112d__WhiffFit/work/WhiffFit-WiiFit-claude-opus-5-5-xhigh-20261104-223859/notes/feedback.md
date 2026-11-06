# Running count of issues found by testing (plan section 16)

Critical (game breaking):
1. Under 2 ticks a second in the browser: one water zone per tile, merged every frame, each with its own wave grid. Fixed with one zone per set and drawing only the current set.
2. Figures fell through decks, posts and rafts that had no colliders (Studio, Bay, Pier): the captures showed heads at floor level.
3. After the Morning Check the player stayed in the Studio while the island drew around nothing: an empty sky.
4. Touch-only attract: the bot pressed Back on the touch card every few ticks, closing Settings at once and playing no event.

Serious:
5. First pointer move had delta 0, so hover did not move focus until the second move.
6. Keys with no binding did not count as "any input", so they did not leave attract.
7. A finger's release lost the pointer's position, so taps missed.
8. `pav load` dropped a scene's first camera cue (tool session bug), so captures showed the wrong camera.
9. Click on Pip never arrived: Pip sits behind a desk. Now within reach is close enough.
10. Walking off the land's edge dropped you in the sea: the walk limit matched the tile edge exactly.
11. Paddle Slalom's gusts were strong enough to tip the bot (350 to 520). Gust 40 to 16.
12. Idle play earned a star on Breath Bloom and Tempo Squats until the rules counted only real effort.
13. Eight prop schema errors, caught by room_check (sphere arc, lathe needed, categories, ref fields).
14. Big Stand's brace scored out of 60 s, not its 20 s, and used the gazebo's lines and a plank on a post.
15. Character landings and water entries made sound and spray every tick events placed the figure in water.

Minor:
16. Prompt rows clipped their labels; widths are now measured where the fonts are.
17. Calendar and Pass cards double-dimmed by the menu's fade.
18. The base screen's prompt row showed through overlays.
19. Morning camera sat behind the cabana; look screen stood in front of the smoothie stall.
20. Morning Lap's ghost score text overlapped the score.
21. Six events saturated at 1000 for a shaky human-like player until difficulty was tuned from the balance table.
22. Tests sampled the title too late; first-frame card press was refused by the 0.2 s guard. At load 56 the stay test's pad taps could also end before any frame saw them; its waits now follow ticks.
23. Reading the code found Step Party's song starting at the card, so its beat missed the notes. A test now pins it to the first tick of play. (Found by reading, then tested.)
24. The harness intermittently failed "ready without a key press" with 3 to 4 copies under machine load: copies waited on pipeline compilation in the GPU process. Now ready falls back at 12 s. Found only by repeating the suite and printing the failing check instead of a truncated blob.
25. A line-by-line audit of the plan after I first called this done found gaps no test had caught: three named library clips and five library props unused, three hand-keyed clips never played, four script lines over the two-line rule, the intro not skippable, no channel on the island, no cast in the Tide set, and no Headless test. All fixed, each with a test. Lesson: "the tests pass" only covers what the tests look at.
26. Seen on the result screen while driving the native window: "1 minutes for the Clam". Reading the code then found Pip's wave line shown unfilled ("{n}th wave"), plus "1 shells" and "1 days. There were 1." Fixed, with a test that lists which lines may hold fill-ins and one that scans every screen for unfilled words.

Found by rereading the plan line by line after I had called the game done a second time (so tests had not caught them):
27. The Schedule was a column of rows; the plan says a carousel. I had recorded it as a decision, but it had not failed in play. Serious.
28. Plank stars came at 24, 39 and 51 s from the common thresholds; the plan says 25, 40 and 55. Minor.
29. On the island a comment said the thing under the pointer gets a ring. The click worked; the ring had never been drawn. Serious.
30. The Commodore was one wingless prop on two of his five sets; the plan says three entities with wings rotated in code. Serious.
31. Two sounds were never played (the small splash, the heartbeat), though the exit interview counted them among 43. Minor. A test now requires every sound to have a caller.
32. No bubbles anywhere, and nobody in the background of the tower. Minor.
33. Missing tests: only one song was checked for silence, ghosts were not checked by area, rules sections were not linted. Added.
34. Seen when I looked at the new carousel: the keyboard prompt said W S on a menu that moves with A D. Minor.

Total: 34 issues, 4 critical.
Most helpful: the bot playing New Stay to credits on three seeds, plus the human-ish balance table.
Least helpful: native capture timing on a machine shared with other agents (load 39 on 32 cores) told me nothing about rendering cost.
