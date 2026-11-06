# Engine feedback: teeter

What this game needed from the my-3dge engine (at 2dbd829) and did not get. The owner collects this file
from every game to improve the engine, so write each item for an engine agent who has never seen this repository:
what you tried, what happened (the command, the error code), what you expected, and what you did instead.

## Requests

1. **Warm only the props a scene can spawn.** `createPropMeshes` makes a batch for every registered prop
   (`engine/gfx/props.ts`: `options.props ?? registry.list('prop')`), and they all warm when the first prop arrives. On
   SwiftShader a page with one prop spawned took 38 s with `gfx.warmUp=asked` and 89 s without; with none, 9 s. The AI Hub
   allows 20 s. I expected a scene to warm what it uses. Instead the session scene spawns no prop at all, and imports only
   its own scene's modules so the island's props are not registered. A `props: [...]` list on a scene, or warming a
   prop's batches when its first instance arrives, would fix it.
2. **Tint or colour an actor per instance.** A body's `slots` are a palette, but an actor can only name a whole body. Four
   seat colours, six tracksuits and three looks became 48 `defineBody` calls in a loop. `spawnActor({ palette })`, read by
   the view, would be one line.
3. **A way to hide an actor or a prop without moving it.** "Shown only while in the same area" (hub ghosts) and "hidden
   until Day 4" both became writing y = -30, with `placeActor`'s ceiling check to keep in mind.
4. **A public `createRepeat`.** `engine/ui/widgets.ts` has the held-direction repeat every menu wants, but it is not in the
   public API, so I wrote it again for a value-row panel.
5. **Outlines on a big flat prop.** The `outline` filter's `depth` test is a jump as a share of the distance, so any flat prop crosses
   its default of 0.02 at a grazing angle of about 2.3 degrees, from any camera height: a huge sea gets a thick dark band along the
   horizon. Props are always the `object` part (`engine/gfx/props.ts`), so a sea cannot opt out. I raised `depth` and faded lines sooner,
   which also thins ink on far objects, and misdiagnosed it twice first (dark mips, the sea's edge). A slope-aware depth test, or a
   prop field for the `environment` part, would fix it. A `water` primitive that fades to the fog and has no edge would save every island.

## Friction

1. **Spawns inside `setup` and inside actions are queued to the boundary, and the failure is silent.** `w.spawn` returns an
   id but `w.query` and `w.get` do not see it until the entry point ends. I looked people up by name in `setup`; every seat
   got actor -1, and all poses silently did nothing. Tests passed, because scores do not need a body. It took a screenshot
   to see. `w.get(id)` on a queued spawn could warn in a dev mode.
2. **`inspector.describe('setting', path)` returns a list of `{ key, value, differs }`,** not the field's object. The plan
   and the name suggest the object. My sliders wrote NaN (`CORE_BAD_SETTING`). A `field(path)` member would be clearer.
3. **`defineActionMap` requires the four move actions** even for a menu map with nothing to move: `CORE_BAD_SPEC ... move
   names "forward", which actions lacks`. Fine, but the message reads as if I named them.
4. **`spawnProp` takes `{ prop, at, yaw }`.** The first guess `{ prop, position }` crashes in `propPose` with `Cannot read
   properties of undefined (reading '0')`, far from the call. A checked placement would name the field.
5. **`input.lastDevice` stayed on the keyboard while the mouse hovered over a menu,** so I tracked the device from the
   page's own events. A note in its doc on when it changes would help.
6. **Library ids clash without warning until load:** `prop:bench`, `sfx:whoosh`, `sfx:kick`. `CORE_DUPLICATE_ID` is clear,
   but only at page load; `npm run check` passes. Reserving a game prefix, or checking in `x check`, would catch it sooner.
7. **JSON imports fail the type check (TS6307)** though lint and Node accept them, and `tsconfig.*` is locked. I keep the
   borrowed clips as a string constant parsed at load. A level-of-effort note in the guide would have saved the detour.
8. **The guide's `labs/playground/...` paths are not in a game's workspace,** as the plan warned.
9. **`erasableSyntaxOnly` refuses TypeScript parameter properties.** Fine, but it surfaces only at `tsc -b`, not in Vite's
   build, so the page ran happily with code the check later refused.
10. **`x shot`'s `LOOK_BLOWN` flags a pale sky** at 26%, for a look that means to be high-key. It is only advice, but there
    is no way to accept it per look.

11. **`removeActor` inside a step leaves the entity live with no body.** The system `actors` then throws
    `PHYSICS_BAD_ARGUMENT: stepCharacter(body) got 25` later in the same step. Only the scripted playthrough found it,
    because a page's action runs between steps. I keep those actors for good now, waiting off stage. Removal at the step's
    boundary, or a skip in `actors`, would fix it.
12. **A blob's colours are fixed** (`engine/gfx/puppets/bodies/blob.ts`: `base: '#c95f9a'`), and `crowdBody` has no palette, so
    a blob can only be pink. My Gull and Frog became small actors in bodies of their own.

13. **An actor placed every step reads as falling.** `placeActor` resets the controller's state, so the animator shows the
    airborne stance: arms out, knees bent, for anyone held on a mat. It looked like an odd idle until I saw it in a session.
    I give held people a neutral two-key strip. A `placeActor(..., { grounded: true })` would be the honest fix.

## What worked well

Determinism across Node and Chromium held without any effort: replays agree first time. Headless `createHeadless` with
scene actions made every activity testable by bot at step speed. The clip layer with hand-written strips scrubbed from
the sim was exactly as good as the plan said: a pose is one line of numbers, and it reads on screen.

## Local engine patches

<!--
`npm run check` accepts an edited engine file only when it is listed here, one line each, its path in backticks:
- `engine/path/to/file.ts`: why no workaround in the game would do, and what the engine should change instead.
-->
