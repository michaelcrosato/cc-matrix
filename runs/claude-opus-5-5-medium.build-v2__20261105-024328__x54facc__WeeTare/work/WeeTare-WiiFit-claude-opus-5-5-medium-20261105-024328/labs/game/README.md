# Wee Tare

A deadpan wellness retreat on an island balanced on one rock, where a retired bathroom scale measures only how much you wobble.
Eleven balance activities round a small walkable island, five days, a storm, and at the end your thumb's balance is the island's.

**One verb:** the left stick is your weight. The two feet are triggers (Q and E, mouse buttons). Both together is a breath.

Run it: open the single HTML from `file://`, or `npm run dev`. Verify it: `node labs/game/tools/verify.mjs` (`--quick` stops
after the Node stages). Build it: `node labs/game/tools/onefile.mjs <output.html>`.

## Layout

- `scenes/`: the sim. `island.ts` is the whole game on one world, `round.ts` a session's small pavilion, `flow.ts` the state
  machine and every menu pick as a scene action, `wobble.ts` the one verb, `pilot.ts` the walk, `director.ts` attract and the
  whole-game driver, `events/` one module per activity, `data/` the tables that grow the game: days, poses, charts, trays,
  courses, lures, places.
- `cast/`: the clip set (`clips.ts`), scrubbing (`body.ts`), who is who (`people.ts`). `props/`, `bodies/`, `builds/`, `materials/`,
  `looks/`, `emitters/`, `cameras/`, `sounds/`: content as data.
- `ui/`: the page. `page.ts` per frame, `screens/`, `hud/`, `dev/`, `lines/`, `about-data.ts` (the reports, one place).
- `hub/`: AI Hub Session Protocol v1, ghost mode. `audio/`: runtime sound, voices. `tools/`: build, tests, interview.

## Goldens

`labs/game/replays/` holds one short replay per activity, a whole day and a round. When play changes on purpose:
`WT_RECORD=1 npx vitest run labs/game/replays`, then `node x replay labs/game/replays --browser sim --update`.

## Calls made where the plan left room

- **Moving props have no physics body.** The plan said kinematic. A prop with no body keeps the pose written in `sceneProp` and
  the view draws it, and nothing collides with a hoop round your hips. Loungers, carts, marbles, the tray and the board all do this.
- **The map is answered, not switched.** The engine re-applies `createEngine({ actionMap })` at every sample, so `input.use()` is
  overwritten; the page passes a function.
- **Menus read devices directly (`ui/nav.ts`), as do pause and the Programme.** `input.pressed` holds a press only for the last
  sample; a frame with several sim steps loses it.
- **Own menu widget (`ui/menu.ts`)**, not `createMenu`: value rows for Left and Right.
- **Menus stop at six rows**, so the pause menu has a "More" page and Settings has four pages. The plan's list of eight pause items
  and its six-row rule pull apart; the rule won.
- **`AIHub.ready()` is called right after `connect()`, before the engine starts,** and the card is HTML. On software rendering a
  copy's warm-up holds the main thread past the 20 s deadline. A slow copy starts its classes late rather than missing the round.
- **Sessions use `look:session` and `quality=low`:** the full look's filters and toon style tripled boot time on SwiftShader.
- **Ink on people only.** `outline` at `characters+objects` draws a dark band above the horizon, because of the very large sea prop, so
  props go without; the toon light separates them well enough.
- **The far sea is plain colour** and unlit, with a textured patch following you: cheaper to read at the horizon.
- **Terrain heights, not rays, for placing things:** physics queries see nothing during a scene's setup.
- **Plumb's open eyes are a twin actor** with its own body for two seconds, since a puppet's body is set when it is made. Same for
  tracksuits: the guest is respawned on `game.begin`. Plumb's closed eyes are tiny dots rather than arcs.
- **Great Tilt guests** are 9 crowd humanoids plus Gerald, Bex and Nan as actors; all are carried, not simulated, so none can stick.
- **Attract runs on an action,** not a restart; the save is only written by the page, and never while attract runs.
- **`AGENTS.md`'s "ask the owner":** nobody was there to ask; no binaries or dependencies were added. No git commits in the dev
  folder, as the plan says.
- Everything in the plan's cut line was built; nothing was cut.
