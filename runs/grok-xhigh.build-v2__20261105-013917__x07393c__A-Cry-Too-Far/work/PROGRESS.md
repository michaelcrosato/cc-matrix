# A Cry Too Far

Original first-person war-zone survival shooter in the Kettle, country of the Sorrel. Factions are Concord and the Harvest Front. Title picked by `crypto.randomInt` from 50 riffs (index 1).

## Hand-in

- HTML, beside this file: `A Cry Too Far-Far Cry 2-grok-4.7-xhigh-20261105-013917.html`
- Dev folder: `A Cry Too Far-Far Cry 2-grok-4.7-xhigh-20261105-013917/`
- `exit-interview.json` beside the HTML. Usage is `added on import`.
- `pixel-engine.js` is the kit file and is not edited.

## Cut

Fauna is cut (gazelles and vultures), the first item in PLAN.md §26. No menu entries, map marks, or lines remain for it. This is a cut, not a goal-plan deviation.

Same-computer link is not cut. Cash Run can be hosted or joined from the cash menu over a BroadcastChannel.

## What plays

One 1280 m basin. Walk, run, sprint, crouch, jump, and wade, on foot and in the truck, first person. Guns wear, jam, and break. Locker guns start at condition 100. The 5 m fire grid spreads with wind, burnt ground stays burnt, and scars stay on the map. A tablet clears blackwater fever. Ignoring it collapses you and costs stones. Field surgery, buddy rescue, and finish-it are in. The map can be raised while walking and driving, and the world does not pause. Music starts at 0.1 on clean storage. Voices and effects are code, with no audio files.

The story runs from the opening ride through the firebreak reveal, the choice of who gets the minefield sheet, and both ending cards. On the long-field down, a syrette picks the buddy up. Finish-it is the prompt only when no syrette is left, or the buddy is burning. The Ledger tracks hectares, people moved, men paid to kill, friends lost, and stones earned. Player bullets do not kill civilians.

The held map is a sheet in the scene, textured from the painted map, with a GPS square on it. It stays in the hands while walking and driving, and the world does not pause. Soldiers, mercs, buddies, and civilians use the soldier rig and move with the actor. Dev mode draws nine rows and hit-tests those same rows, including Reset.

Cash Run is about 6 minutes, solo against hired guns or 1–4 players. Dev mode sliders live under pause, with reset. Attract starts after 10 seconds on the title and main menu only. A touch-only device shows `Controller or keyboard required` and Settings.

## Checks on this computer

- `node tests/run.mjs --all`: passed 10, failed 0. The map, syrette, rig, and dev-click checks drive the shipped game.
- Two `file://` Chromium boots at 1920×1080: title `A Cry Too Far`, `AIHub.active` false, no page or console errors. The two runs agree. SHA-256 of that HTML is `253c66ea48fed19415b5989cdded0b140bdfe888299bf4eb2da0c6f7083c04fe`, same as `tests/.site/game.html`.
- iPhone 14 profile under Chromium: the notice is exact, the menu is only Settings, attract starts once idle passes 10, and a tap opens Settings.
- WebKit on that phone profile has no WebGPU. The page reports that and stops. That failure is evidence only.
- Four hub scenarios on the shipped file: all passed (14, 14, 14, and 15 checks).
- Two `file://` pages shared one round: both carried case r1 to the same standings, and both saw the same grass fire.
- Screenshots after the page had been rendering show the basin and the title, the map sheet in the hands with the GPS mark, a soldier in the field, night, dialogue, surgery, the dev sliders, the hub card, and an ending.

## Issues

Testing caught 13 defects. All 13 were game-breaking. They are listed in `tests/ISSUES.md`.
