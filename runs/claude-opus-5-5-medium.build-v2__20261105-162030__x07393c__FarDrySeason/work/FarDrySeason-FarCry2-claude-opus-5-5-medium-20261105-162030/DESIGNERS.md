# Building out Far Dry Season, without touching code

Everything a designer adds is plain data in `src/content/` and `src/art/`. After any change: `node tools/build.mjs`, then `node tests/run.mjs`.

| To add | Edit | Notes |
| --- | --- | --- |
| A weapon | `src/content/weapons.js` (table), `src/art/viewmodels.js` (`gunModel(...)`), `src/art/clips.js` (`GUN_CLIPS`) | Reload kinds: `mag revolver break pump bolt fuel`. List it in `SHOP_ORDER` to sell it. |
| A site or post | `src/content/sites.js` | `props: [modelId, dx, dz, yawDeg, { tag, palette }]`, `soldiers: [role, dx, dz, duty]`, `usables`, `npcs`. Stand in the game with dev mode's Debug > Crosshair Coords to read positions. |
| A road | `src/content/roads.js` | Polylines; the ground flattens and paints itself. |
| A mission | `src/content/missions.js` | Steps: `goto leave talk report use deliver destroy kill collect steal hold escort ride timer choice script`. Anything truly bespoke is one named entry in `src/missions/scripts.js`. |
| A line of dialogue | `src/content/dialogue.js` | Keep to the HUD font's characters, under 60 characters; split long sentences. `static` checks every string. |
| A model | `src/art/models.js`, add to `WORLD_MODELS` | `node check.mjs --sheets src/art/models.js`, open the PNGs. |
| An animation | `src/art/clips.js` | People: the hero rig. Hands: `GUN_RIG` or `TOOL_RIG`. |
| A sound or song | `src/audio/sfx.js`, `src/audio/music.js` | Data only. No audio files. |
| A balance number | `src/content/tuning-defaults.js` | Each entry becomes a live slider in dev mode's Balance tab. |

**Dev mode** is in the pause menu: cheats, teleports, spawns, hour and wind, start any mission, sliders with reset, overlays, quick save.
