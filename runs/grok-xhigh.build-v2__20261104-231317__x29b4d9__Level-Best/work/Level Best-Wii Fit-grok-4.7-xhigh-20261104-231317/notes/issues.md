# Issues caught while building Level Best

1. Log Reps counted a phantom first rep because `lastRep` was undefined. Critical: no. The score started a rep early.
2. Plank & Perch could spawn a second ragdoll for one fall. Critical: yes. A second removal in the same step panics Rapier for the whole page.
3. Island Loop scored cadence from `t % period` and wrote tilted gravity into the world. Critical: yes. A sharp jog scored 26, and the gravity write produced NaN.
4. Plate Spinners' bot left the band it was supposed to hold. Critical: yes. A sharp bot scored about 47 instead of a full spin.
5. Room Service built the tray with full extents and lost glasses that were still on it. Critical: yes. The order could not be delivered.
6. Tippy Raft ignored the lane's skill and the grip that keeps a sharp player near the middle. Critical: no. Rounds still ended, but skill did not matter.
7. Check-in leaned the doll toward the wrong side of the target. Critical: yes. The Wobble Age came out of the wrong mean.
8. Check-in applied the calm margin twice. Critical: no. The stand test was stricter than the written one, but the day still finished.
9. The Cairn latched its stone count on the first score read, while the pile was still empty. Critical: yes. The result was always zero stones.
10. Plate Spinners counted key taps inside a 0.5 s window, so the slow band was unreachable. Critical: yes. Keys could not play the large plate.
11. The clumsy plate bot wandered inside every band, so a plate could not fall. Critical: yes. The event could not be lost.
12. Still Water's delayed correction resonated, and a clumsy guest stayed outside the calm. Critical: no. The day still finished.
13. Log Reps treated a depth miss as zero instead of a near miss. Critical: no. A clumsy score fell below Adequate.
14. Mouse edges were stored before the click was read, so confirm and flail never fired. Critical: yes.
15. A parked stick marked the pad as the last device on every poll. Critical: no. The doll still moved. The prompt set stayed on the pad.
16. Attract mode left the bot stick down, so the demo woke itself. Critical: yes. The idle demo could not stay on screen.
17. Tippy Raft walked from the stick but never copied that wish onto the balance state. Critical: yes. Lane lean stayed at rest.
18. Fruit and stamp effects were silent because the noise had no low frequency for the lowpass. Critical: no. The rest of the mix was audible.
19. About and the journal ignored next, previous, and left and right, so the page stayed on the title. Critical: yes. The credits could not be read.
20. Hovering a choice rebuilt the button, so the click never landed. Critical: yes. Touch Settings did not open.
21. The bundled shader comments still contained web URLs. Critical: no. The page ran, and the unit check rejected the strings.
22. The toon ramp was three bytes in an RGBA texture, so WebGL rejected the upload. Critical: no. The title still drew. The stops are now four-byte pixels.
23. A hub slot scored a finished class and then started it again while the minute was still open. Critical: yes. The same class was scored more than once, and the last tenth of a second built a new world every step.
24. A hub slot scored only inside a tenth of a second at the end of play. Critical: yes. At 6fps the clock steps over that window, so Plate Spinners, Fruit Hat, and Step Class finished with no score.
