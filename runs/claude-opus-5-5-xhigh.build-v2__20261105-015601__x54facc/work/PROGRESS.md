# PROGRESS (read this first after a compaction)

Goal: build PLAN.md's game, deliver per TASK.md. STAGE.md says keep progress here.

## Fixed facts
- Title (picked by secrets.randbelow from 50): **Teeter Fit**. Source: Wii Fit.
- Dev folder: `TeeterFit-WiiFit-claude-opus-5-5-xhigh-20261105-015601/` (engine workspace, name `teeter`, engine my-3dge@2dbd829, plan was tested on e7a1243).
- Deliverables in work/ root: `TeeterFit-WiiFit-claude-opus-5-5-xhigh-20261105-015601.html`, `exit-interview.json`. Chat reply also has Source Info + feedback.
- Hub client 1.4.0 fetched: sha256 6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a (plan's sha is older; hub moved on).
- Don't git commit/init in dev folder (plan section 15). Don't run scripts/setup.sh.
- Browser cmd: `export CHROMIUM_PATH=$HOME/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`

## Decisions so far (also put them in labs/game/README.md at the end)
- One data-driven camera `cam3=shot` (cameras/shot.ts) aimed by the page each frame (ui/shots.ts), instead of one mode per activity.
- Session scene game:round spawns NO props at all (engine warms a pipeline per registered prop part when first prop arrives: 40-90 s on SwiftShader, past the hub deadline). Floor/mats/hoops = telegraphs; pillars = stand-in block stacks; ground = terrain:round. main.ts dynamically imports scenes/round OR scenes/island so props register only for the island. Session uses gfx.warmUp=asked. Boot ~10 s.
- Island boot on SwiftShader ~34 s with ?gfx.warmUp=asked. Tests use that.
- Direct writes to sceneProp x/y/z/q work for body-less props.
- Engine trap: inside an action or step, spawn/despawn are queued to the boundary. Activity entity is permanent (id '' = none).

## Tools
- `node labs/game/tools/onefile.mjs out/game.html` builds; `python3 labs/game/tools/peek.py out/game.html "?query" out/a.png 9000 "js"`; `python3 labs/game/tools/boottime.py`; `python3 labs/game/tools/hubcheck.py out/game.html 2 3 4 3:host-leave`.
- Balance: `TEETER_SEEDS=2 TEETER_SHOW=1 TEETER_ONLY=pond npx vitest run labs/game/scenes/balance.test.ts`
- Debug run: labs/game/scenes/debug.test.ts (EV=x SKILL=y) - DELETE at end.

## Status (done)
- A section-by-section re-read of PLAN.md (the stop hook asked for it) found real gaps, so the earlier "done" was wrong. All fixed in source:
  1. Same-screen Group Class: only seat 0 had a disc. New ui/hud/seatDiscs.ts, one small disc per seat (section 8).
  2. Group Class framed 2 of 4 players. New `class` shot in ui/shots.ts.
  3. Great Tilt stone: a topple did not lurch the island 3 degrees (section 7). stepLurch in scenes/tilt.ts, test in whole.test.ts.
  4. Calm did not warm the picture or soften sound (section 3). updateCalm in ui/frame.ts, Sound.setCalm.
  5. SideStepL/R, Jump (Step Class) and Twist (Cliff Plunge) clips written, never played (sections 6, 11).
  6. Gerald had lines longer than "Nice weather for it." (section 6).
  7. Dark horizon band: the OUTLINE's depth 0.02, crossed by a flat plane at 2.3 degrees grazing. NOT texture mips, NOT sea size. look depth 0.1, fade 50-200 m; removed prop:seaFar.
  8. HUD overlaps: plunge tip over prompts; Step lane over R pill; prompts over L pill.
  9. About page 1 foot off the screen: paging now counts lines. Test checks the foot.
  10. shots.py never reached Dev Mode or About (menus got paged). hubview.py read no results.
  11. Dead data removed: rankUp, 7 props, 3 materials. New scenes/wired.test.ts stops it coming back. About test now compares every answer.
- STILL TO DO, in order: view out/shots/group.png, about*.png; replay goldens re-recorded (out/replay-update.log; reason: the sim changed, sea prop removed, lurch, step and dive poses); run `node labs/game/tools/verify.mjs` and `npm test` on the final code; rebuild root HTML (`node labs/game/tools/onefile.mjs ../TeeterFit-WiiFit-claude-opus-5-5-xhigh-20261105-015601.html`) and `node labs/game/tools/exit-interview.mjs ../exit-interview.json`; compare sha256 with out/verify-game.html; run hubview.py on it; rm -rf out; final chat reply with all reports.

## Test tally (for the exit interview)
- more caught by verify: hint table edit silently failed -> frame crash in Pose Class (critical, found by screenshot, now asserted); removing judge gulls mid-step crashed playthrough (critical, found by whole.test); Rapier world per run exhausting memory in balance runs; ambBirds silent start (QA); slow frame counted as key repeat; Plumb placement edit silently missed (lint); boot crashes from bad tile tones and bad gull build (2).
- issues caught so far (~24): duplicate prop id; duplicate sfx id; action-map move names; prop placement shape; boot past hub deadline; Enter listener too late; auto director leaving results early; seats' actors -1 (setup spawns queued: all class poses broken); Gerald pulled home during jog (stale intents, walked off map); finale followers too short; Programme focus on first card (restart loop); same-frame press opening+closing screens; panel page kept in dev; describe() shape in dev (NaN setting); device tracking for mouse; horizon band (sea texture mip + no skirt); erasableSyntaxOnly param props; JSON imports not in tsconfig; about/pause rows over six; pier not closing on begin; attract banner glyph wrap; Morning forced no age. Critical: seats' actors (poses never played), boot deadline, placement crash, Programme restart loop = 4.
- Most helpful: scripted playthrough + 'every activity' balance bots (found softlock/stale intent) and the hub harness w/ engine-ready assertion. Least helpful: LOOK_BLOWN metric / x shot text thumbnail for colour band.
- Engine feedback notes: prop batches registered for all props -> warm-up cost past hub deadline; ActionMap requires move actions; spawn queue inside setup/actions not obvious; describe() returns field list; no way to hide/tint actor other than body per colour; horizon: no sea primitive; outline 'objects' on a huge plane; tsconfig blocks JSON imports though plan says OK; erasableSyntaxOnly; `createRepeat` not public; x new docs noise not hit (did not use x new). Plan's client sha outdated, engine commit newer than plan's.
