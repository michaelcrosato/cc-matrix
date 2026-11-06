# Well Wobbled

A 3D comedy anthology of balance activities, inspired by a home fitness game, on the my-3dge engine. You are a guest at the Little Fulcrum
Wellness Retreat, a spotless island run by a retired bathroom scale (Tare) who no longer weighs anyone: it only measures how much you
wobble. Over five days the deadpan gets stranger, the plaques creep downhill, marbles roll by themselves, and on the last night the island
tips and your thumb's balance is the island's. Nothing is ever a game over, and nobody ever talks about weight or bodies: all judgement is
of wobble.

## How it plays

One verb: keep your centre of balance where it should be (the Wobble Model, `scenes/wobble.ts`). Lean with the left stick, WASD or the
mouse; the two feet are L2 / R2, Q / E or the mouse buttons; both together breathe (or jump). Prompts follow the device you used last
(PlayStation glyphs, Xbox glyphs in Settings, key caps, a mouse icon). Activities: Morning Check, Pose Class A/B/C, Still Pond, Reps Hall, Step
Class, The Line, Paddle Glide, Sand Garden, Cliff Plunge, Hoop Patrol, Island Jog, Group Class and the finale, The Great Tilt. The
Programme (Triangle / Tab) lists each day's cards with a "Go" that fades to the station; the Noticeboard replays any activity.

## Run it

- The single file `WellWobbled-WiiFit-claude-sonnet-5-5-medium-20261105-031600.html` (next to this dev folder) opens from `file://` and fetches nothing.
  It needs a browser with WebGPU. Dev Mode's "Throwaway save" keeps the save in memory (a flag in `sessionStorage`).
- Build it: `node labs/game/tools/onefile.mjs ../<name>.html`. Test everything: `node labs/game/tools/verify.mjs` (add `--quick` for Node stages only).
- Dev Mode: pause, More, Dev Mode (not present in a hub session): live sliders for every `game.*` number with Reset, jumps, cheats, tools.
- Attract mode starts after 10 s without input on a front-end screen and loops the whole game; any input leaves it.

## Layout

| Path | What it is |
| --- | --- |
| `scenes/` | Sim-side rules: `wobble.ts` (the model), `island.ts` (the one world), `roundscene.ts` (the hub's small scene), `round.ts`, `director.ts` (attract), `worldfx.ts`, `data/*` (days, poses, charts, trays, courses, lures, world), `events/*` (one module per activity) and `bot/players.ts` (the four stand-in players) |
| `cast/` | Props, builds and the RETREAT clip set (`clips.ts`, written by hand, scrubbed from the sim) |
| `art/` | Page-side materials, bodies and looks (palette from the plan) |
| `ui/` | Page-side screens, HUD, glyphs, settings, dev panel, lines (the writing), `about-data.ts` (the one data file for About, the reply and the interview) |
| `audio/` | Effects, songs and Animalese-style voices, all code |
| `hub/` | The AI Hub session client (text, unmodified), tags, the session wiring |
| `cameras/stage.ts` | One camera mode with a preset per activity |
| `tools/` | `onefile.mjs`, `verify.mjs`, browser drivers, `interview.mjs` |

## Calls made where the plan was silent or wrong

- Every activity module runs per seat (the guest, CPU guests, class seats) with its own `act` component, so the same code plays the island, Group Class and the hub Round.
- Activities that move the guest (Jog, Paddle, Line, Tilt) integrate position in their registers and place the actor each step; the pilot rule still holds (the actor is `player: false`).
- Some seed lines in the plan run past "two short sentences" (the Tare intro, the "Did you sleep on your left side?" question); I kept them verbatim and let content tests allow five.
- The AI Hub client the hub serves now is 1.4.0 with a different SHA-256 than the plan's; I kept the fetched copy byte-identical.
- Sand Garden's pointer tilt sends the pointer's place as `game:pointer`; the Wobble noise is off there.
- `rest.json` is `cast/rest.ts` because the type-check project does not list JSON files.
- Performance is out of scope: software-rendered Chromium draws a frame near the pavilion in about three seconds.
