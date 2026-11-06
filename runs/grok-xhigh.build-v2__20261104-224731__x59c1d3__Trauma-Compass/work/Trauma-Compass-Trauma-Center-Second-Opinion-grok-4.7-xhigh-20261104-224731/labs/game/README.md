# Trauma Compass

A lamp-lit night at Harbor Light General. Eight operations, up to four surgeons at one table, and a patient who has to last until the last stitch. The camera sits close overhead on the field. It is a surgical simulation, original to this project, for one player or a couch of four, and for an AI Hub room of up to four.

## Play

Stick or mouse aims. R2 or the left click uses the tool. The right stick, or the keys 1–8, picks a tool. Shoulder buttons cycle tools. Space or Triangle is the Gift. F or Square is the syringe. R or Circle drops or cancels. Q and E, or the d-pad left and right, change site. H asks for a hint. Tab swaps a tool with the other seat.

Enter or Cross accepts a menu row. Hover moves the highlight. Esc or Options pauses. On a touch-only device the page says "Controller or keyboard required" and offers Settings. Attract mode starts after ten seconds idle on a menu and saves nothing.

Music starts at 10%. Songs, effects, and the syllable voices are written in code. There are no audio files.

## With a friend

Scrub In, on the title, gives each pad a seat. Cross claims the seat. Start begins the next operation with that many hands. The same screen is the couch game: one camera, no network. An AI Hub room uses the shared-world session client pasted in the page. The host steps the operation. Everyone else plays the host's hands. The session case is the gala shift.

## Files

| File | What it is |
| --- | --- |
| labs/game/op/ | The operation, with no engine import: tools, vitals, strains, the bot, the lockstep |
| labs/game/scenes/main.ts | The scene `game:main`. The starter `game:play` stays |
| labs/game/app/boot.ts | The page: screens, hub, audio, the sheet |
| labs/game/index.html | Source page. The hub client is the first script, byte for byte |
| labs/game/tools/verify.mjs | `npm run verify` |
| labs/game/tools/e2e.mjs | The browser checks against the one-file page |
| labs/game/tools/hub.mjs | The four AI Hub harness runs |
| labs/game/TESTING-LOG.md | Issues the tests caught |
| ENGINE-FEEDBACK.md | What the engine did not provide. Local patches: none |

## See it

Open the one-file page in the work folder beside this project, from `file://`, in a browser with WebGPU. Firefox and WebKit show the plain WebGPU message.

```sh
npm test
npm run check
npm run verify          # check, tests, replays, e2e, hub. --fast skips the browsers
node x replay labs/game/replays --browser sim
```

`?game.autoplay=1` walks the shift: the bot plays each operation at eight times speed.

## Decisions

- 2026-11-04: The title is Trauma Compass. The operation stays a pure module. The engine is read-only. The sheet is 96 by 60 so four software-rendered copies fit in memory. Radial time is a fixed 0.6 while the menu is open, because that slider cannot enter the sim.
