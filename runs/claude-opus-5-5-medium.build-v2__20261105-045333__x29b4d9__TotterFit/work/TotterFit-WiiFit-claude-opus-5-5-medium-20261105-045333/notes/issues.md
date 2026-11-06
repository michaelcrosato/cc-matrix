# Issues testing caught (one line each, as they happen)
1. Cairn: method `count` shadowed base field `count` (countdown), crash in every run. Caught by events sweep. CRITICAL
2. Room Service: tray collider behind the doll because the course runs -z; glasses spilled on every step. Caught by events sweep. CRITICAL (sharp bot delivered 0-3)
3. Tug of Peace: over-lean threshold .72 sat every bot down at the stick the plan calls safe (7 falls, lost pulls). Caught by events sweep.
4. Room Service: tumblers spawned overlapping the doll's own capsule and were kicked off the tray. Caught by balance test (T1 delivered 2 of 5). CRITICAL
5. Bots: delayed correction resonated with its own noise frequency (average bot in Still Water wandered, 25 form). Caught by balance test. Bot bug, not a game bug.
6. Fruit Hat: urchins stayed in the hat as dead weight and took 2 points each, sharp bot lost most of its score. Caught by balance test.
7. Plates: bot flipped between plates and sharp scored below clumsy; bot now commits to a plate. Caught by balance test.
8. Grand Hold: gain 1.4 oscillates on the stiffer body, sharp bot was in the ring 30% of the time. Caught by events sweep.
9. Forced/pending gusts survived a fall and knocked the doll over again on recovery. Caught by events soak. 
10. Island: at 9 degrees the low rim dipped 3.4 m under the sea plane, sand and walker drowned. Caught by screenshot. CRITICAL
11. Hub camera sat among tree tops, foreground palm filled the frame. Caught by screenshot.
12. Marbles and other instanced colours came out white because the instance colour buffer didn't exist when the material compiled. Caught by screenshot.
13. Plate gauges' labels were paper-on-paper, unreadable. Caught by screenshot.
14. Plank & Perch: doll pointed at the camera, the pose couldn't be read. Caught by screenshot.
15. Grand Hold: camera looked away from the island it is meant to tip. Caught by screenshot.
16. Esc opened Pause and closed it again in the same tick, so keyboard players could never pause. Caught by flow test. CRITICAL
17. Triangle/T did nothing on the island: Ask Trudy and Today's Plan weren't wired. Caught by flow test.
18. Opening the plan while the morning script was running let a class race the Check-In, skipping Wobble Age. Caught by flow test. CRITICAL
19. Age Reveal: a line under a non-menu layer couldn't be advanced, game stuck after the first Check-In for pad and keys. Caught by flow test. CRITICAL
20. Standing still on the island slid you slowly to the fence, out of reach of everything, because the slope push never stopped. Caught by flow test.
21. Mirror and new-guest screens had more than six choices. Caught by UI audit.
22. HUD and old barks showed through Results, Age Reveal and Pause and covered the score. Caught by screenshot.
23. Group Class podium slid sideways instead of tipping over: the impulse went through the block's centre. Caught by coverage test.
24. A key pressed in attract's very first frame was lost, because the script cleared the input flag when it started. Intermittent, caught by the wall-clock attract test.
25. CRITICAL Foot keys and mouse buttons only counted after a 60 ms ramp, so quick taps never stepped and every rhythm hit was late: Room Service and Step Class were almost unplayable on a keyboard. Caught by the new keyboard bot in the balance test.
26. CRITICAL Input was polled and thrown away during hit-stop, so pressing Bank the moment a fruit landed did nothing, on every device. Caught by the keyboard bot in the balance test.
27. Session card: the pose line talked over the card and the card hid the class's heads. Caught by screenshot.
28. Plate Spinners didn't separate skill with the plan's bot table: bands too wide (1.00 / 1.00 / .89). Narrowed to 65% rather than handicapping the bot. Caught by balance test.
29. Poses: parking the stick and breathing in time scored 100 on two tiers, so holding still took no correcting. Added a slow drift during holds. Caught by a measurement after the balance test.
30. Instructor lines kept coming after a class ended: on Results an empty speech box covered the medal and the score. Caught by the final art pass.
31. CRITICAL Tug of Peace: leaning too far carried no risk (no falls at full stick), so the event's one decision was gone. My retune of the over-lean threshold had hidden a bot bug. Caught by measuring outcomes against the plan's table.
32. Tug bot never pressed when its timing error came out late, skipping about half the calls. Caught by the same measurement.
