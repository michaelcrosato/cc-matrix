# Research and interpretation

Inspected 2026-11-06. Space Fortnight interprets **Space Fortress, Century Electronics / CVS, 1981**. The Bally Astrocade four-direction shooter, Zaccaria Star Castle derivative, and cognitive-training benchmark are separate works and were not combined here.

## Source evidence actually inspected

- Century sales flyer: https://flyers.arcade-museum.com/videogames/show/3233 and https://flyers.arcade-museum.com/videogame-flyers/3/space-fortress-03229-01.jpg . Original image saved as century-flyer.jpg and visually inspected. Fortress 13, Viper interceptor, Dronian Empire, radiators discharging accumulating energy, scouts' gravity bombs and promotion inform the game. No flyer artwork is embedded in the shipped game.
- Museum of the Game: https://www.arcade-museum.com/Videogame/space-fortress . Inspected the Century entry to disambiguate the title and scenario structure.
- Representative gameplay: hirudov, “Arcade Longplay - Space Fortress (1981) Century Electronics,” https://www.youtube.com/watch?v=Z43SQdcM7Nk . Downloaded the 640×360 video-only stream and extracted source-filmstrip.jpg at 0, 70, 140, 210, 280 and 350 seconds. Visually observed a sparse colored starfield, free-moving interceptor, central green fortress, fuel/damage readouts, and the final horizontal ground defense. This is visual inspection of sampled footage, not listening or a frame-perfect reconstruction. The older link https://www.youtube.com/watch?v=2DvSKx76r50 was unavailable. A format-selection failure on the newer video was resolved by explicitly requesting the 360p video stream.
- Additional footage listing: https://gamefaqs.gamespot.com/arcade/216544-space-fortress/videos/1155945 . Correct Century gameplay listed under Old Classic Retro Gaming; unrelated VIC-20 clips were excluded.
- MAME CVS driver: https://raw.githubusercontent.com/mamedev/mame/master/src/mame/misc/cvs.cpp . Inspected the current driver header/hardware descriptions. It identifies Century CVS raster/speech hardware; the header acknowledges imperfect emulated discrete sound. Exact original score tables, musical composition and transition timing remain **unknown**.
- MobyGames link in PLAN.md returned HTTP 403. Fuel replenishment details from that source are therefore treated as secondary evidence from the plan, not claimed as independently confirmed.

## Engine and integration evidence

- Engine https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff , release **0.89.1**, revision **8ecc2f62353761187bdfe226f327b7ea5d2eb691**. Read README, API.md, relevant API-INDEX sections, docs/ASSETS.md and the ROCKS slice of kits/arcade.js. Inspected actual Game clock, Input multiplayer/rebinding, Shell menus/settings and ChipAudio bus implementations. Full engine is bundled once, unchanged; no separately duplicated arcade module.
- Hub https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub , revision **35a1047f2067b2af3de3943f0fe452f39105d869**. Read README, released session.js (**1.4.0**, protocol **v1**), arena example, harness and scripts/hub-check.mjs. The exact released client is first in head, immediately after charset. All online transport uses AIHub.

## Deliberate departures

This is an original complete siege, with a finite win and loss, simultaneous 1–4 pilot co-op, eight readable threat silhouettes, a recurring three-phase antagonist, authored encounters and two upgrade selections. The original loss-driven scenario change becomes a forced retreat with a defense cost; successful objective completion can also advance. Drift has forgiving drag. Fuel becomes a boost reserve that cannot disable movement or fire. A local pulse clears space. Scoring and military ranks use this game's documented thresholds. All assets, animations, music, effects and gibberish are authored in code, with a shaded native-engine pixel style rather than copied original pixels or speech.

The title was selected by secrets.randbelow(50), with the immutable draw recorded in title-draw.json. Selected index is the recorded index; no redraw or substitution was made.
