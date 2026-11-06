# Testing log

One line each. Critical means the operation, the save, or the page would be wrong for a player.

1. Critical. `labs/game/scenes/main.test.ts` (restore): a capture put back the world and the next step still used the operation from before the rewind, until the chart snapshot was adopted.
2. Critical. `labs/game/op/bot.test.ts` (gala-shift): the flap never reached its closed pose, so the case could not finish.
3. Critical. `labs/game/op/op.test.ts` (Reverie): the strain left the surface before the laser time the case allows.
4. Critical. `labs/game/op/op.test.ts` (Solace): a split stacked the children on one point, so one stroke hit both.
5. Critical. `labs/game/op/op.test.ts` (syringe): the dose bound the wrong target on a Balm cell.
6. Critical. `labs/game/op/bot.test.ts` (suture): stitches landed off the wound unless the hand was within a short distance of the next stitch.
7. Critical. `labs/game/op/bot.test.ts` (two and four seats): co-op copies were born on the same point, so one tool cleared both.
8. Critical. Import of `labs/game/view/looks.ts`: `outline.width` of 1.5 is rejected (`CORE_BAD_SPEC`). The engine wants a whole number. It is 2.
9. Critical. Import of `labs/game/audio/library.ts`: `sfx:laser` is already an engine preset (`CORE_DUPLICATE_ID`). Game cues are `sfx:compass-*` and songs are `song:compass-*`.
10. Not critical. `labs/game/op/content.test.ts` (story walk): a drama caption ended with a period and the text check rejected the scene. The line still played.
11. Not critical. `labs/game/app/campaign.test.ts`: a fixed run of accepts walked past the first briefing, because that scene has fourteen boxes. The test now stops when the briefing is up.
12. Not critical. Dev Mode reset wrote the setting back and left the on-screen slider on the dragged number, because the shell caches the value. Reset now writes the fallback into that cache.
13. Not critical. Scrub In treated a new pad's Cross as Start as well as claim, so the seat list closed on the joining press. A seat that was not claimed yet claims and stays on the screen.
14. Critical. `labs/game/view/looks.ts` and `labs/game/audio/library.ts`: speed lines took `strength` where the engine wants `density`, and a song carried `description`, which `SongSpec` does not have. Both threw while the module loaded.
15. Not critical. Attract wrote `trauma-compass:gfx.governor` because the page store was also passed to `createEngine`. The night is still saved by the page. The engine is given no store, so a demo changes nothing.
16. Not critical. The use prompt kept the previous device, because the shell redrew only when the menu changed. The stamp now includes the prompt.
17. Not critical. The WebGPU sentence ran before `#msg` existed, so a browser that did not throw stayed on "Loading…". It is shown again on `DOMContentLoaded`, when the line is in the page.
18. Not critical. Balance reset sat past the bottom of a 720p screen and the page did not scroll, so a click could not reach it. The dev screen scrolls, and Reset is the first row.
19. Not critical. A tap on Settings in the touch gate also counted as a pointerdown, which hid the gate and left the kiosk. The shell then replaced the button before the click arrived, so Settings never opened. A pointerdown that starts on a control is left for that control.
20. Critical. A hub round called ready only after the engine inspector existed. Two software WebGPU copies were still warming when the card gave up, so the round stayed in loading. Ready is sent when the session is connected, and Enter on the card answers before the first frame. Time-up is answered the same way: if the sequencer is not up yet, the host still finishes before grace runs out.

Twenty issues. Eleven were game-breaking: 1–9, 14, and 20. Nine were not: 10–13 and 15–19.
