# Issues testing caught

Bugs in the game that a test or a capture found, in the order they were found. Bugs in the bot or the tests themselves are not listed. C marks critical (game breaking).

## Whole-game bot playthrough (21)
1. C Reloading a checkpoint lost nested story scripts: the game stayed stuck. Fixed with named stages.
2. C Opening a gate named by letter crashed.
3. Perched bottlers were not implemented: they stood inside cover.
4. Ammo could run dry in the siege. The Loot Director now rescues low ammo.
5. C A checkpoint taken mid-vault put the player inside a wall.
6. C The Salt Road had no door actions: no way forward.
7. C Set pieces changed shared level data, which broke every retry.
8. Dame's health carried over too low between areas and herbs ignored her.
9. Harpooners out-damaged the causeway (first pass: Drowned grabs).
10. Harpooners on the causeway always hit (second pass: spread and cooldown).
11. The abbey's first fight spawned everything at once.
12. Crypt knights hit with no warning.
13. Crypt patrols overlapped and camped the lever.
14. The Dame's control mode had no speed, cane or weapon lock.
15. Solid props were missing from nav: paths ran through the telegraph.
16. C Bathysphere valves and hatch locks sat inside the body hit sphere: the boss could not be hurt, and they had no meshes.
17. Bathysphere rivets all hit, for too much damage.
18. Corpses raised during the Mother, and she gave no ammo: a dead end.
19. C Launch mines sat under the ground collider: they could not be shot.
20. Launch boats failed line of sight off the map, so nothing could target them.
21. The launch could run out of ammo with no way to get more.

## Node suites (9)
22. The Foghorn: enemies could not step into the water and never sank.
23. C Night Shift crashed on its first frame (look input through a bad proxy).
24. C Attract: the Case clip never ended, so the demo stopped looping.
25. A model id clashed with the library: the catalogue would not build.
26. Seven model definitions failed checkModel.
27. Reachability: heartbeat, fire loop, Tannoy off-crackle and safe-room music never played.
28. Reachability: five animation clips were never played.
29. Reachability: Mate Ansgar was listed as an enemy that nothing could spawn.
30. Restart from Checkpoint or Continue after a dev-mode teleport crashed, or with an older save loaded the wrong area.

## Browser and harness (11)
31. Hover took the focus on a menu's first frame.
32. C Opening the Case with Triangle also dropped the gun.
33. C Esc opened Pause and closed it in the same frame.
34. C I and Tab opened the Case and closed it in the same frame.
35. C Menu taps shorter than a frame were lost.
36. Attract could start during a level load.
37. Esc in Night Shift opened Settings and closed it in the same frame.
38. C Hub traffic starved when rendering was slow: "traffic flows both ways" failed on 3 of 4 scenarios.
39. Cannery crashed on load: looking up a texture that was not there yet throws.
40. Pointer lock was never requested at the start of play (found reading the mouse test).
41. C A host leaving just after the start could fail the hub's traffic check: clients had received nothing yet. Copies now say hello when ready and send from the start event.

## Captures (10)
42. Max's hair was the brightest thing on screen at night. Fill light and colour changed.
43. The final boss was not on screen during its own introduction.
44. The Commodore could not be seen in the porthole.
45. The launch deck overhung the hull.
46. Launch lanterns floated in the air.
47. Nils, the net-mender and the cannery sign were missing from the game.
48. The ending jump never applied the dawn sky (normal play reached it).
49. Letterbox bars cut off dialogue and subtitles.
50. ARROWLEFT prompts were too long, and CLAIM DENIED was hard to read over brick.
51. The last shot's limpet was buried inside the hull: the game's closing image could not be seen.

## Code check against the plan (1)
52. Client copies did not show thrown bottles, nets and harpoons.

Total: 52. Critical: 15.
