# Running log for the feedback TASK.md asks for

## Testing: issues caught (running count, * = would have been game breaking)
1. Bot: `press` field and `press()` method clashed (bot could not play at all).
2. * Syringe tutorial never cleared on an IV dose: Case 1's last phase soft-locked (tutorial froze it for good).
3. * Case 3: the IV out-healed the crash, so the guaranteed Code Blue never fired; the case ran out the clock.
4. * Case 4: counted nests still present rather than nests found: killing one early soft-locked the phase.
5. * Case 6: Tremolo's jitter read as pull speed and tore every pull in stage 3: boss could not be finished.
6. Case 9: screws had no bot plan (crash in bot).
7. Stinger's script kept running into the next scene and flipped the camera view on the op (field drawn offset).
8. Title's skyline sat behind the logo; menu box ran past the bottom at 720p; floor lines drew bright white (engine shade sign).
9. Ward's front wall hid the lower beds; patients stood beside beds.

10. * Story: an event that resumed the story while the engine was still inside the event handler was lost; a skipped cinematic hung the campaign (found by the playthrough test).
11. Grand Rounds: every bot grabbed the retractor at once and nobody cut (found by the 2-bot test).
12. Grand Rounds: Da Capo lobes under pools could not be reached; strains now ride above blood (found by the 3-bot test).
13. Case 9: jumping past the board reading crashed the wire job (found by the draw test).
14. Attract: the reel locked vitals, so Code Blue never showed (found by looking at a screenshot).
15. * Cantor's Recapitulation: the forced rewind restored its own timer, an endless loop with no clock pressure (found by a balance run).
16. * Ward: the hero spawned inside a bed's footprint and could not walk (found by the couch test).
17. Second Look test targeted the wrong snapshot by one step (test bug, not the game).
18. Case 5 and others: Dev Jump to a later phase lost what earlier phases spawned (found by a screenshot).

19. Hover focus never engaged from a fresh start (engine's lastDevice rule; found by the ward's browser test).
20. The difficulty screen had a thin palette (the engine's check tool look note).
21. The forearm was a box bigger than the instrument (screenshot).
22. The Hub card's Ready label overlapped its key cap (screenshot).

## Engine surprises
- input.lastDevice does not turn to 'mouse' from 'keyboard' on a mouse move (the plan's fact 7 only holds after a pad): hover focus never engaged from a fresh start. Patched.
- `E.shade(c, amt)` takes -1..1, negative darkens.
- Ward walls need `cut: true` or the front wall hides the room in threequarter.
- `input.pressed('x')` on an action a keyboard half lacks needs a guard.
- menu.items may be a function (undocumented in the card, found in Shell source).

## Prompt confusion
- TASK.md and PLAN.md name folder/file with "GameTitle" but the title has a colon and spaces: had to decide on a compact form.
