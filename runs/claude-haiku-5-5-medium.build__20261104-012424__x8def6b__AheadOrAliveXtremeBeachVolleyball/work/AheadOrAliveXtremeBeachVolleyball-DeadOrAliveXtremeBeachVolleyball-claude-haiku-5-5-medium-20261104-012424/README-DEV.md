# Ahead or Alive: Xtreme Beach Volleyball: dev notes (built by claude-haiku-5-5, medium effort)

This folder is the dev folder. The deliverable is one level up:
`../AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-haiku-5-5-medium-20261104-012424.html`.
The exit interview is `../exit-interview.json` (written by `tools/exit.mjs` from `src/55-about.js`).

## Commands
- `node tools/build.mjs`: builds `build/game.js`, `build/dev.html` and the deliverable.
- `node test/run.mjs`: the whole test command; prints only failures and one count line.
  Flags: `--only=a,b` (core, data, ball, match, vacation, casino, story, ui, game, poolhop, playthrough, browser, hub),
  `--skip-browser`, `--skip-hub`.
- `node tools/browser-check.mjs`: the deliverable from file://, through the title, Beach Match and the pause menu.
- `node tools/hub-check.mjs [players] [scenario] [latency jitter loss]`: one AI Hub harness run (standard, server, host-leave).
- `node tools/shots.mjs`, `node tools/rigsheet.mjs`: review screenshots in test-output/.
- `node tools/exit.mjs`: writes `exit-interview.json`.

## Layout (src, concatenated in name order inside one IIFE)
00 core, 01 tuning, 02 cast, 03 items, 04 world, 05 dialogue, 06 songs, 10 input and prompts, 11 UI kit, 11b text box,
12 sound and Animalese, 13 rigs, 14 beach court, 15 motion capture and arm IK, 16 swimsuits and extra hair, 20 ball,
21 match and referee, 22 players and judge, 23 AI, 24 match loop, 25 AI Hub session (claims and snapshots), 26 match scene,
27 commentary, hints and the final's specials, 28 highlight replays, 30 vacation, 31 island map, 32 walkable places,
33 shops, wardrobe, journal, mail, 34 story, 40 Pool Hop, 41 casino, 42 photo, album and postcards, 50 title and menu,
50b How to Play and About, 51 attract (a loop of match, seven montage beats and a title card), 52 Beach Match setup,
53 dev panel (tools, vacation, presentation, tuning), 54 day end, endings, credits, results, 55 About data, 99 main.

Vendor: `vendor/mocap/readable.js`, `mocap.js` (the engine's motion runtime, unmodified) and `aoa-clips.js` (20 clips cut with
the engine's `tools/anim-set.mjs` from its Quaternius, Mesh2Motion and CMU sets). `vendor/aihub-session.js` and `hub/` are the
AI Hub client and harness, unmodified.

## Known simplifications
- Swimsuits: the top, brief and pattern are the engine's own `swim` outfit (engine patch 5). Sleeves of rash guards, hair
  styles (braids, bobs, curls, buns, puffs) and sun hats or visors are drawn by the game over the rig (src/16-dress.js).
- Motion: 20 cut clips (celebrations, the lost-point shrug, dives, blocks, idles, the title) and three hand-keyed clips in
  vendor/mocap/aoa-volley.js (Bump, Set, Spike), played on those touches. Arm IK puts the hands on the ball for serves, over
  the net for blocks, and together for high fives.
- Replays: three seconds at 0.4 speed with the serve camera; no separate camera cuts.
- Attract: an AI match, then the seven montage beats, each a real scene of the game (the island map, a talk and chat on the
  beach, the coral shop's try-on, a Pool Hop run where the bot taps each pad on the beat, the casino slots with real spins and
  reel stops, the photo mode, and the final against The House), then a title card. A bot presses only the scene's own buttons;
  a real key, click or gamepad button leaves for the title. The demo runs on a throwaway vacation and restores the player's save.
- Album: postcards hold the photographer and up to two others (group photos); the thumbnails are small live renders; opening
  one re-renders it. The party photo is taken automatically. R1 saves the screen as a PNG.
- Dev panel: F1 or L3+R3 reopens it after the first opening. The Voice Lab speaks every line of each speaker.
- Online: a client moves its own fighter at once on its own copy and sends its position (12 Hz); the host places that fighter
  (clamped to the court). A client judges its own press on the hub clock and sends a claim; the host validates the window,
  the reach and that the touch is still open. The host runs the rules and the AI, as the plan says.
- Final specials: Golden Glare (half of Sonny's serves; the receiver's ring hides unless she wears sunglasses); House Edge
  (one deep line shot per set, covered by a partner at good-friend affinity or more); Lucky Seven (Sonny's first attack at
  game point clips the tape).
- Barks: each touch and each point won is voiced (Animalese); calls and cheers are voiced too.
