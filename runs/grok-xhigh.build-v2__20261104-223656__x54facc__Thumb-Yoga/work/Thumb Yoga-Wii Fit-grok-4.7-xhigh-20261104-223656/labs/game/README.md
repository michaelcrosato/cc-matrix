# Thumb Yoga

A five-day balance retreat at Little Fulcrum, for one player or a couch of four. The only verb is where your weight sits inside a unit disc. Lean with the left stick, WASD, or a pointer-locked mouse. L2 and R2, or Q and E, are the feet. Both feet, or Space, breathe. Toppling recentres you. It is not a game over. Nothing here scores weight, size, or calories.

The days are a morning check, pose class, a pond, a sand garden, a paddle, a slackline, a group class, and a storm that tilts the island. Pebbles stack on a cairn. They are never spent. After the credits the ferry does not come back. Free play and a new morning remain.

## See it

From this workspace:

```sh
npm run dev
node labs/game/tools/verify.mjs
npm test
npm run check
```

`verify.mjs` runs the balance bands, the three-seed walk to the credits, the song and syllable renders, and the golden replay. Without `--quick` it also builds `../Thumb Yoga-Wii Fit-grok-4.7-xhigh-20261104-223656.html` and drives that file. The HTML opens from `file://` and fetches nothing.

A hub session is the same file, served beside `labs/game/hub/harness.html`. The mode is ghost. Empty mats on a local Group Class are staff unless Settings turns them off.

## Calls

- The title was drawn from `titles.json` (50 names). The pick is Thumb Yoga, index 16.
- Great Tilt's counterweights, expert variants, outfits, Hoop Patrol, Reps Hall, Island Jog's race, Cliff Plunge, and Step Class are cut. The walk around the island stays. The day list is the five days in `scenes/data/days.ts`.
- Group Class is a still hold, Heron, and the pond. Its score is the mean of those three, from 0 to 1000, so the same ranks apply. The plan also described a sum to 3000. The mean is the one that fits a rank.
- The island grid is 60 by 60 with cell size 4 (240 m). A finer cell made the SwiftShader boot too slow for a hub `ready()`.
- The session client is pasted unmodified. Its hash does not match the older pin. The fetched bytes are the ones in the page. See `ENGINE-FEEDBACK.md`.
- Music on a fresh save is a tenth. The engine's bus default is a half, so the page sets the volume before the save is applied.
- The engine tree was not modified.
