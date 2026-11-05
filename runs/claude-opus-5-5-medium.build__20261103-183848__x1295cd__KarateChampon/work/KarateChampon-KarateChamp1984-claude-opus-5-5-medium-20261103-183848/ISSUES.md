# Issues found by testing (this build), and their fixes
Game-breaking (5):
1. Load crash: Object.assign in the scene helper read the practice scene's `drill` getter at boot (smoke run). Fixed: a plain lookup.
2. Bout deadlock: fighters who crossed over walked back into each other while push resolution shoved them apart (CPU-vs-CPU stall). Fixed: no pushing while walking to the marks, plus phase timeouts.
3. Story blocked: the cutscene scene's `done` flag survived from the prologue, so every later cutscene never ended (story playthrough). Fixed: reset on enter (practice's `fin` too).
4. Story blocked: the reverse-punch drill was impossible (the drill holds you on your mark; the phantom target had no width). Fixed: drills check the stick cell.
5. Crash: Pots Ahoy! read the reach of a block, which has none (story playthrough). Fixed.
Others (22):
6. Font lacks · — … (drawn as ?). 7. Referee faced away and covered the fight. 8. Stadium scoreboard overlapped the clock.
9. FULL POINT call used game.after, which never fired when the bout runs alone. 10. Lunge punches reached from the marks (40% of points).
11. Jumping side kick dominated (always full). 12. CPU reacted too late and blocked into counters. 13. CPU block expired before slow attacks landed.
14. CPU presses in long recovery overwrote each other. 15. Buffered presses lost their posture. 16. Unlocks lost where storage is blocked (no memory fallback).
17. Attract aiuchi never synced. 18. Attract's title step was set in draw (skipped headless). 19. Main menu overflowed the screen.
20. Road NEXT line touched the belt row. 21. Pasture fence drawn over the fighters. 22. About pages mixed text scales and overflowed.
23. Attract HUD drew 9 point slots. 24. Free-spar dummy label collided with its prompt. 25. Records rows overlapped.
26. In a real browser, keys bound to no action (e.g. X) did not exit the attract mode (found by tests/inspect.mjs). Fixed: raw key, pointer and touch events count as input.
27. On a touch phone the engine re-enabled touch controls (found by tests/inspect.mjs). Fixed: touch controls forced off every step.
(Test-tool bugs, not counted: same-URL deep-link screenshots, EC1 needing a fake pad, the Lab's gap search for air moves, python's buffered port line.)
