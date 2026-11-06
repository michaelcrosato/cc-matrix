# Teeter Fit

A balance-and-wellness game inspired by Wii Fit. You are a guest at the Little Fulcrum Wellness Retreat, a spotless
island run by a retired bathroom scale who stopped weighing people and now measures only how much you wobble. Every
activity (poses, reps, step class, paddling, a slackline, a tilting sand garden, sitting perfectly still while a frog
judges you) is played through one verb: keep your centre of balance where it should be. Over five days the deadpan gets
stranger, the plaques move, and on the last night the island tips and your thumb's balance is the island's.

## How it plays

**Lean** (left stick, WASD, or the mouse), **Left Foot** and **Right Foot** (L2 R2, Q E, or the mouse buttons), **Both
Feet** to breathe (L2 + R2, Space, or both buttons). A first play takes about 45 minutes: five days, each a Morning Check
and three activities, then the Great Tilt, a last check, credits, and Free Play for as long as you like.

- Island: walk (left stick, WASD), look (right stick, mouse), use (Cross, E, or click the thing in view), hop (Square,
  Space), the Programme (Triangle, Tab), wave (Circle, C). Every Programme item has Go, so nobody has to cross the island.
- Pause: Options or Esc. Dev Mode is in the pause menu.
- Group Class: up to four on one screen, CPU guests in the empty seats. In AI Hub: the same round as a ghost session.

## Files

| Where                          | What                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `scenes/island.ts`, `round.ts` | The two scenes: the whole game on one world, and the small session scene               |
| `scenes/wobble.ts`             | The Wobble Model, the one verb                                                         |
| `scenes/flow.ts`, `ending.ts`  | Starting, stepping and finishing activities; the story's one-way doors                 |
| `scenes/events/*.ts`           | One module per activity, all the same shape, each with its own bot                     |
| `scenes/bot/players.ts`        | The four players that stand in for a human: perfect, human, sloppy, idle               |
| `scenes/data/*.ts`             | The tables: days, poses, charts, trays, courses, lures, stations, plaques. Add rows    |
| `scenes/director.ts`           | The attract loop and `game.auto`'s scripted playthrough                                |
| `cast/`                        | The clip set (strips scrubbed by your thumb), builds, the roster                       |
| `props/`, `materials/`, `looks/`, `bodies/`, `emitters/`, `sounds/` | The art and the sound, all as data                            |
| `cameras/shot.ts`, `ui/shots.ts` | One data-driven camera and the table of purpose-built shots                          |
| `main.ts`, `ui/`               | The page: screens, HUD, input, Dev Mode, the Balance Disc                              |
| `audio/`                       | The bus levels, the song choice, the gibberish voices                                  |
| `hub/`                         | AI Hub Session Protocol v1, ghost mode; the client kept byte-identical as text         |
| `tools/`                       | `onefile.mjs` (the single HTML), `verify.mjs` (the one test command) and what it runs  |

## See it, check it

```sh
node labs/game/tools/onefile.mjs out/game.html        # the single HTML, runs from file://
node labs/game/tools/verify.mjs                       # everything; prints only failures and one count line
node labs/game/tools/verify.mjs --quick               # stops after the Node stages
```

Set `CHROMIUM_PATH` to the headless shell for the browser stages. On a software renderer, `?gfx.warmUp=asked` boots
sooner.

## The calls I made

- **One camera mode, a table of shots.** The plan suggests a camera mode per activity. One data-driven `cam3=shot` that
  the page aims each frame, easing towards the table in `ui/shots.ts`, makes every transition smooth and every activity's
  camera one row. `cam3=chase` is kept for walking.
- **A session spawns no props at all.** The engine makes a batch for every registered prop the moment the first prop
  arrives, and on a slow GPU warming those takes 40 to 90 seconds, past the hub's 20. So `game:round` draws its floor and
  mats as telegraphs, its pillars as stacks of plain blocks, and its ground as a small terrain; `main.ts` imports only the
  scene it needs, so the island's props are not even registered in a session. A session boots in about 10 s on SwiftShader.
- **Body-less props, posed directly.** The plan has things that move on kinematic bodies. Writing `sceneProp` x, y, z and
  q works for a prop with no body, and needs no physics at all: the tray, marbles, board, boat and carts do this.
- **Finale guests walk on the terrain by their own sums**, not as crowd agents in Rapier: deterministic, simple and no
  stray bodies. They are still crowd bodies when drawn. The three named ones are the actors.
- **One panel widget** instead of `createMenu`: Settings needs value rows, bars and paging as well as lists. It reads the
  same system layer, has hover focus and click to pick, and never shows more than six rows on a page.
- **A seat-only bot.** `game.auto` runs the director too; `game.botSeat` (Dev Mode's "Bot plays for me") only plays your
  seat, so the screens stay yours.
- **The sky has no dome and the horizon has a haze ring.** A flat brochure background, a soft low-contrast sea, and a ring
  past the fog so the world has no edge. The sea is unlit, so it does not catch the toon bands at grazing angles.
- **Lines may run to five very short sentences**, as the plan's own seed lines do. The test holds them to that.
- **Dev Mode's sliders and all settings** apply live and replays hold them. The plan's sway numbers stand as written;
  the bots meet every target at defaults.
- **The Gull and the Frog are small actors in bodies of their own,** not the plan's blob rigs: a blob's colours are fixed in
  the engine, and a pink frog is a different joke. They still work in a session, as they spawn no prop.
- **A pose's breath score is the share of the hold in time with the guide,** not the running `sync`, which starts each hold
  near 0 and takes seconds to climb: it held even a perfect player under the target in the Polite Bridge.
- **Only CC0 clips were borrowed** (Mesh2Motion, Quaternius): no CMU or 100STYLE, so no extra licence terms to carry.
- **The press that closes a screen stays out of play** until it is let go: "Carry on" with Cross would otherwise also count as
  "use" on whatever you stand beside, and drop you straight back into the activity.
- **Hoops and lit tiles are telegraphs,** not the props the plan lists: a telegraph draws at any height, so a hoop rings your waist, and
  the same code serves the session, which spawns no props.
- **The finale's loungers are posed** by the sim as they slide, not pushed with `knock`, like the other body-less props.
- **The throwaway save is a flag that stops writes,** not `createStore`'s `sandbox`: it can be switched on mid-game with what you already have.
- **The look's outline has a far larger `depth` threshold than the engine's default, and fades sooner.** The plan's look left it at 0.02,
  a share of the distance, which a flat sea crosses at a grazing angle of about 2.3 degrees: a dark band along the horizon from any low camera.
- **Group Class's small discs stand in a row,** in the order their mats stand across the screen, rather than each following its mat:
  a row stays clear of the prompts and the big numbers from any camera. They replace the big disc, which can only belong to one seat.
- **Group Class has its own wide shot,** all four mats from the front, not the plan's orbit round your mat: on one screen everybody has to see
  themselves. The plan's orbit stays for Pose Class.
- **Outward or costly things:** none were needed: no new dependency, no binary, nothing published. The engine is
  unchanged. Git was left alone in this folder, as the plan says.
