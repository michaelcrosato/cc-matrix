# Issues caught by testing (one line each, as they happen)
1. Hit-stop on a catch swallowed pad edges: a Hop pressed in those 12 ms never banked (bot held full hats until it fell). Fixed: hit-stop holds input polling too.
2. Fruit flight had linear damping, so fruit landed 15 cm short of its shadow ring. Fixed: no damping, aim at basket height.
3. Tug of Peace: moving the kinematic foot 3.4 m in one frame threw the core over; every bot "sat down" at once and fell again after recovering. Fixed: the invisible core's foot stays put, only the visible doll moves.
4. Springboard: base class recovered the ragdoll before the event's water timer did, crashing every dive ("Cannot read properties of null"). Fixed: a separate water state.
5. Balance torque kept acting on the core in Springboard's air. Fixed: no ankle torque when released.
6. Tippy Raft rounds too long: slope push was an acceleration rather than a direct push as the plan measured. Fixed.
7. Room Service: sideways step jolted the foot in one tick and spilled glasses. Fixed: foot low-passes to its side offset.
8. Rapier panic ('unreachable') on Springboard's second dive: a joint re-created on a disabled body. Fixed: enable the body first, then rejoin. Found only by running every dive.
9. God mode's quiet stand-up also fired in Springboard's air, teleporting the diver back to the board mid-flight whenever they spun past 45 degrees. Fixed: no fall checks in the air.
10. Second Rapier panic in Springboard: disabling a free core (setEnabled(false) after its joint was removed) panicked world.step on a later dive, depending on timing. Fixed: the core is parked out of the way instead.
11. Test harness leak: a bot's useMove flag stayed set after Island Loop, zeroing the stick for every later event in the run and making three events look identical across skills. Fixed in blankInput.
12. Could not pause while any remark was on screen: the pause check treated auto-clearing barks as blocking speech. Fixed.
13. Speech couldn't be advanced on the reveal and jar screens (the screen swallowed Use). Whole-game run got stuck at the first Wobble Age. Critical. Fixed: those screens are passive.
14. Swallowing an attract-exit press blocked pads that weren't connected yet, so a new pad's first press did nothing. Fixed.
15. Pressing Use to advance Trudy's line, or to pick a menu item, also activated whatever the island had focused in the same tick, opening a chooser over the plot. Fixed: the hub ignores a press the UI or speech already used.
16. Music tracks clipped (peak up to 2.27) with the music slider at 100. Fixed with a trim before the music bus.
17. UI audit: pager, HUD tags, prompt rows and title beam sat outside the 5% safe area. Fixed.
18. Art pass: props on the doll (hat, slab, tray, log) stayed hanging in the air while the doll ragdolled. Fixed.
19. Art pass: Grand Hold's doll stood inside the lighthouse lamp, invisible. Critical for the finale. Fixed: stands on the gallery.
20. Art pass: Island Loop's ring road ran through the Sun Deck, Bandstand, Gazebo and Quarry. Fixed: landmarks moved inside the road.
21. Art pass: Tippy Raft's low side sank under the sea at big tilts, hiding half the raft and the dolls on it. Fixed: visual tilt eased and sea lowered.
22. Art pass: Step Class floor in solid shadow under the roof, footprints unreadable. Fixed.
23. Art pass: Plate Spinners' front pole and gauge covered the doll. Fixed: plates stand behind.
24. Art pass: Step Class footprints came from behind the doll and were hidden by the body. Unplayable by eye. Fixed: they slide in from the camera side, on every lane.
25. Attract's DEMO overlay was removed by each vignette's own setup. Fixed.
26. The Grand Hold could be played before Day 5's other classes, ending the game with work left. Fixed: it waits until last.
27. The press-ownership fix for bug 15 blocked the stick during Trudy's lean tutorial, so the very first thing the game asks was impossible. Critical, caught by the whole-game run. Fixed.
28. Screenshot: lower menus and their focused item bled through upper screens (the focus z-index won). Fixed: only the top menu shows.
29. Screenshot: island prompts overlapped the Plan's and the Mirror's. Fixed.
30. Group Class could not be paused at all. Fixed.
31. Attract could start on Who's Here or Free Play; the plan allows only Title and Menu. Fixed, and idle resets on arriving at either.
32. By reading the verbs, not a test: with a mouse, pumping Springboard (both buttons) also launched instantly, because both buttons is Hop. Fixed: launch is Space or the middle button on keyboard and mouse, with its own prompt.
33. Screenshot: HUD prompts showed through the Pause and Dev screens, and toasts collided with the pager. Fixed.
34. By reading the code path after flow passed: Esc in Pause closed and instantly reopened it, Options could not close it, and Esc on a menu also paused. Fixed, with tests.
35. By reading: every session event ran begin() twice, so Poses skipped its first pose. Fixed.
36. By reading: attract's Step Class fast-forward was reset by begin(), showing 9 s of empty deck. Fixed.
37. Hub harness, only under load: Enter on the game's own card was read in the sim tick, so with four software-rendered copies a slow frame missed the harness's 3 s limit. It passed in earlier runs, and would have kept the game out of sessions. Fixed: Ready and More time answer from the keydown event itself.
38. Test-only: a bot translating analog depth to held keys scored 9 in Log Reps; a person holds through the whole way down. Fixed in the test, and Log Reps measured as playable on keys and mouse.
39. Keys and mouse in Log Reps: depth ramped at exactly the ribbon's speed, so one late press left you behind for the whole rep (82/33/18 against the stick's 96/81/58). Found by the new keys-and-mouse bots. Fixed: when your hold agrees with the ribbon's direction, depth closes on it.
40. Plan audit: voices' nonsense exclamations existed but were never spoken. Fixed.
41. Plan audit: The Cairn and Still Water had no form penalty for flailing. Fixed.
42. Plan audit: Grand Hold's bedsheet had no collider, so a falling doll dropped straight through it. Fixed.
43. Plan audit: Tippy Raft's swells had no visible rising wave, and Plate Spinners' band colour wasn't on the hoop. Fixed.
44. Plan audit: the ending's marbles didn't flare, and the sleep and peck clips were never played. Fixed.
45. Plan audit: balance thresholds in the tests were softer than the plan's (sharp 80 not 85, clumsy 35 not 40, Room Service 4 glasses not 5), and seven tests the plan lists were missing. Restored and written.
46. Plan audit: the balance test's three seeds were one seed for any event without random draws, because the bots ignored the seed, so skill separation in Springboard rested on one sample. Fixed.
47. Long headless runs: sound nodes piled up because the sim runs about 170x real time, reaching 981 MB and making my browser earlyoom's target. Not a leak in play: it drains to 192 MB in about a minute of real time, and stays flat at 290 MB over 156 classes with audio off. Fixed in the tests: silent except the audio group, with a static check that every named sound and clip exists.
48. Screenshot: the finale's bedsheet catch and the ending's marble flare both happened off camera. Fixed: the camera follows the fall to a sheet held by the class, and cuts wide for the flare.
49. Screenshot: marbles were white in normal play. The jar's mesh first drew with no colour attribute, on the title, and stayed white for good, so medal colours never showed. Fixed, with a pixel test. Particle colours get the same protection.
50. By reading the test, while checking the plan line by line: the Dev Mode slider test could never fail. It compared a value with itself times a ratio, not what the game did, so "a slider changes the running event" proved nothing. Replaced with tools/test-sliders.mjs: every slider moved while the game runs and judged by what the game then does, the d-pad, mouse and reset through the real screen, and the ink sliders read back from the picture.
51. The new slider test: Island rest tilt did nothing until something else happened to sync the island. Fixed: the slider and Reset tuning both sync it.
52. Measurement, dive by dive: every skill reached the same board speed and height, because the board's simulated position was clamped at .7 m, which holds a spring of this period near 4.9 m/s. The plan's 6.5 and 7.6 m/s after 5 and 7 s of pumping were out of reach and pumping longer earned nothing. Fixed: the spring runs free and only what you see stops at .7 m. Now 4.8 / 6.5 / 7.5 at .07 s late, 3.4 / 4.6 / 5.2 at .14 s late, 1.5 a quarter period late, against the plan's 4.7 / 6.5 / 7.6, 3.6 / 4.6 / 5.2 and 1.5.
53. Same measurement: the Springboard bot's reaction lag was only a small speed threshold, not a delay, so all skills pumped alike. Fixed: real lateness, and a shorter pump. Launch 5.7 / 3.6 / 3.0 m/s and height 6.7 / 5.7 / 5.4 m, against the plan's 5.4 / 3.8 / 3 and 6.5 / 5.7 / 5.5.
54. Same measurement: the Springboard bot sometimes tried head first at half stick from the 5 m tower, which the plan measured at 0% for everyone, and scored 8 for it. Fixed: a bot only tries what it can reach in its air time.
55. The new framing test: once a long pump paid off again, the diver left the top of the fixed camera's picture. Fixed: the camera rises with the highest diver and is back down for the splash.
56. Playing the plan's gameplay figures against the build: the island walker fell through the ground from the moment it arrived, and kept falling, because the ground's filter leaves out doll bits and the walker is a doll. It never touched the fence or a prop, and you could walk straight off the island and out over the sea, to radius 50 and beyond. Every earlier check read x and z only. Critical. Fixed: the disc and fence stop everything on the island.
57. Same pass: Tug of Peace was close to unwinnable above Tier 1, 0% for everyone on Tier 3. The ease-off's hit fired again on every step of its .8 s, and the lean grows during it, so the plan's safe .85 fell 14-19 times. Critical. Fixed: one hit, at the moment they ease off.
58. Same pass: a fall in Tug also let the rope run against you while you lay there, on top of its leap, so full stick could never win. Fixed: the leap is the cost, and nobody hauls while one side is on the floor.
59. Same pass: Room Service had lost its lesson. My fix for issue 7 softened the side step so far that not bracing cost nothing. Fixed: a named rate, 70 /s, swept against the plan's glass counts.
60. Same pass: Gary swooping every 13 s was my own number, and with spills back it emptied Tier 3 for everyone. Fixed: once at 14 s, then every 26 s.
61. The playthrough, after the Raft bots changed: two bots on one spot could not shove each other, and the raft stops shrinking at radius 1, so a round could run for ever with a player already in the water. It only ever ended by luck. Critical. Fixed: a point blank shove has full strength, and every round ends within 90 s.
62. Same pass: Quick Lean's next prompt did not wait for the dot to come back, so a repeated direction scored as an instant reaction and the slowest bot beat the fastest. Fixed, and reaction now reads the first .15 of lean, which is what the score's .35 s stands for.
63. Same pass: Step Class charts were too dense. Tier 2 had 112 notes for the plan's 108, Tier 3 had 153 for 126, the session 53 foot and 11 lean for 54 and 10. Fixed by swapping bars.
64. Same pass: pars were not putting the sharp bot at 88 to 95. Set again for The Cairn, Plank, Island Loop, Fruit Hat, Room Service and Springboard, once the bots below were right.
65. Same pass: the bots' timing error had .575 of the spread in the plan's table, so every timed skill read too good. Fixed.
66. Same pass: the stick's dead zone swallowed the pad bots' noise and small corrections. Fixed in the test hook: they aim past it, as a person does.
67. Same pass: the bots' hand noise sat on the doll's resonance and collapsed the clumsy bot. The plan does not say its frequency. Swept against Still Water and Poses, and set to 2 and 1.65 rad/s.
68. Same pass: in the Grand Hold the sharp bot's gain oscillated at that stiffness, as the plan warned, scoring 0% in the last ring while the clumsy bot scored 94%. Fixed: the under-load gain.
69. Same pass: the Fruit Hat bot's feedback whipped it past every fruit, the plan's other warning. Fixed: a plain push .95 s before landing, and an earlier flail. Banked 26 and 30, against the plan's 28 and 25-30.
70. Same pass: the Tug bot pushed past its stick setting and its late presses were clamped to on time, so clumsy won what it should lose. Fixed.
71. Same pass: the Raft bots played too carefully, with rounds averaging 50 s and clumsy never winning. Retuned to the plan's measured rounds and wins.
72. Measuring again: the bots reacted too quickly for the plan's table, so feedback helped them more than it helped the plan's. Fixed: .04 s to read the dot on top of the table's delay, none under load where the plan measured its own, and a tremble rate for each skill, since the resonance moves with the delay. Poses Tier 3 went to 55 / 56 / 44 against 55 / 41 / 33, Still Water Tier 1 form to 100 / 89 / 50 against 100 / 89 / 48.
73. Same pass: the Raft bots felt the tilt instantly, so swells never caught them and rounds ran to the 90 s limit. Fixed: they feel it late by their reaction lag, and the middle starts to go at 55 s, not my 85. Rounds 10-61 s, mean 27, wins per 16 of 5.9 / 8.3 / 1.8, against 10-55, 29, and 6 / 8 / 2.
74. Same pass: Room Service Tier 1 still kept all five glasses without a brace, because my tight cluster of glasses never spilled, and the plan gives no layout. Fixed: spread across the tray, the side step at 70 /s. Unbraced 4 / 4 / 4 against 3.5 / 2.5 / 4, with the telegraph brace still fitting Tiers 2 and 3.
75. Same pass: the Grand Hold's stiff balance was my own carry-over, and it let every bot sit in the last ring. Fixed: the defaults. 97 / 90 / 60 against 98-100 / 47-93 / 30-44, with no restarts.
76. Same pass: the Check-In's bots read Lean Match's bar exactly, so the slowest scored best. Fixed: a misreading that grows with reaction lag.
77. Testing the plan's rules of play directly: in Tug of Peace no flail could save you from the ease-off hit, at any timing, though the plan says it sits you down "unless you flail". A flail only raises the ankle's limit, and from a lean that far back the spring cannot arrest 3.2 N·m. Fixed: a flail shrugs the jolt off while it lasts, so one within about .28 s saves you and a later one does not. With a working flail the plan's Tug figures came back: Tier 2 at full stick wins with 2.3 falls, Tier 3 at .95 wins 100 / 100 / 0, and at full stick the sharp bot still wins with 7 falls.
78. Measuring once more: reading delay scales with skill rather than being one constant, which brought the average and clumsy bots near the plan's Poses and Check-In figures. Also a base error in reading Lean Match's bar, gentle correction on one foot, rhythm changing at once on keys, and a wider stop error on Springboard. Lean Match .63 / .40 / .29 against .58 / .45 / .27, One-Foot .53 / .45 / .35 against .55 / .48 / .40.
