# Authoring a Near Miss

The expedition is data in `src/content/campaign.js`. The renderer and collision compiler read the same room rectangles, corridor links, and bank segments. No editor, image pack, or authoring service is needed at runtime. Add a chamber by editing that file and running `npm test` followed by `npm run build`.

## Units, identities, and structure

Authored coordinates are tiles. A tile is 16 world units; only `NM.Geometry.compile()` and the simulation's spawn loader convert coordinates. Rooms use integer tile bounds. Spawn points, tools, and creatures normally use tile centers such as `[5.5, 8.5]`. A room `{x:2,y:3,w:12,h:10}` covers tile columns 2–13 and rows 3–12. Leave a one-tile uncarved boundary around the map.

Every room, creature, tool, supply, track, bank, cue, and checkpoint has a stable unique ID. A save stores those IDs, not array positions. Changing an ID or changing required progression warrants a content-version change in both `NM.Content.version` and `NM.VERSION`.

A cave has `id`, `name`, `subtitle`, `palette`, `width`, `height`, `spawn`, `exit`, `safeAnchors`, `reward`, `rooms`, `passages`, `enemies`, `supplies`, `tools`, `banks`, `tracks`, `triggers`, `guardIds`, `criticalPath`, and `checkpoints`. `story` and `exitText` explain the objective and one-way entrance. The five shipped sections are the Chalk Burrows, Rootbell Hollow, Sunken Ledger, Amber Eyrie, and Blue Hour Vault. The final two sections share the summit delve.

Room `kind` describes a meaningful decision: arrival, lesson, navigation, encounter, reward, optional, guardian, checkpoint, or resolution. `clue` is short readable content. A room counts toward the campaign only because it presents a decision, encounter, reveal, or reward.

A passage names its `from` and `to` rooms. The compiler connects room centers with a three-tile-wide orthogonal floor corridor, moving horizontally then vertically for each segment. Add `via:[[x,y],...]` to take a deliberate bend. Multiple connections may form a loop. A second link between the same rooms can provide a route around an obstacle; its via points should avoid accidentally carving through an intended wall.

## Real optional chamber: The Unclaimed Lunch

The shipped first cave contains this complete side-chamber edit:

```js
// Room: a clue-led reward, outside the required route.
room('chalk-cache', 'The Unclaimed Lunch', 21, 39, 10, 8,
  'Follow the chalk bootprints. The forester left more than lunch.', 'optional')

// One short branch from Three-Candle Fork.
link('chalk-fork', 'chalk-cache')

// Supplies remain distinct identities and overflow stays on the floor.
supply('chalk-cache-coins', 25.5, 43.5, 3, 'treasure')
supply('chalk-cache-arrows', 27.5, 42.5, 3)

// A clue before the branch, not a through-wall marker on the reward.
track('chalk-cache-trace', 25.5, 36.5, 'ranger', Math.PI / 2)
cue('chalk-cache-cue', 25.5, 34.5,
  'Chalk bootprints turn away from the ladder. A small detour may pay.')
```

Those records already exist in the appropriate arrays; do not paste a second copy of their IDs. To extend this example, enlarge `height`, add a second room south of it, add a passage from `chalk-cache`, and place a supply at the new room center. Keep every existing exit and safe anchor reachable. A successful content test proves the production floor graph reaches the addition.

The Honey Vault and Toll Cup demonstrate guarded optional treasure instead. Required damage budgets do not depend on visiting any of these optional alcoves.

## Encounters and cues

A creature is `{id,type,x,y,room}` with optional `name`, `stash`, `landmark`, or `signature`. Move a guard by changing only `x`, `y`, and, if appropriate, `room`. `guardIds` lists the creatures that must be defeated before using the cave's ladder. It does not require every optional enemy to die. A guardian's relic tool is present as a record but remains tied to the encounter's defeat logic.

Archetypes are `rat`, `snake`, `bat`, `spider`, `ooze`, `drake`, `guardian1`, `guardian2`, and harmless `target`. `enemyDefs` supplies `hp`, world-unit `speed`, tile-range `hearing`/`vision`, `windup`, `attackTime`, `recovery`, `damage`, `cue`, and world-unit hit `radius`. The ooze has `indestructible:true`. The bell has `bankOnly:true`, zero speed, and zero damage. Front armor and breathing armor are separate guardian behaviors.

Retune one creature class by changing its definition, then test a fresh expedition and a restarted checkpoint. The pause-menu sliders are the better place to try temporary tuning: those changes mark assistance and stay out of the ordinary campaign save. Keep telegraphs longer than a plausible input reaction; never substitute hidden unavoidable contact damage for a readable attack.

Tracks are `{id,x,y,type,angle}` with angles in radians. They precede the danger rather than painting its exact unseen location. Triggers are `{id,x,y,radius,text,objective?}` in tiles; a short radius allows a player to read each cue at the intended bend. `objective` replaces the small HUD goal when present. Do not rely on sound alone to explain an encounter.

Spider `stash:[x,y]` is an accessible floor location. Its starting supplies and any loose shafts it carries must be recoverable by walking and interacting; killing the spider is never an ammunition prerequisite.

## Bank-shot geometry

Banks use `{id,ax,ay,bx,by}` with tile endpoints. They are actual line-segment colliders and use the same coordinates for drawing. Put them in a room with floor on both sides, keep enough space to go around them, and avoid blocking the entire width of a narrow corridor.

The Crooked Bell is the reference arrangement:

```js
spawn: [5.5, 8.5]
// A shot due east hits at (13.5, 8.5) and reflects south.
{ id:'root-lesson-bank', ax:11, ay:6, bx:14, by:9 }
// This harmless target only answers a reflected shaft.
{ id:'root-bank-bell', type:'target', x:13.5, y:12.5, room:'root-bell', lesson:'bank' }
```

`tests/content.mjs` fires a geometric segment through the production compiler/sweep routine and verifies the reflection intersects the bell. Any future change to the spawn, bank angle, or target must preserve that proof or deliberately update the lesson and its test together. A useful later bank should shorten a dangerous angle or create a distraction, rather than merely repeat the safe lesson.

## Supplies, exits, and checkpoints

Supplies use `kind:'arrows'|'heart'|'treasure'` and an integer `amount`. Surplus arrows remain at the supply instead of disappearing when the shared quiver is full. Put safe reserves before mandatory fights, with enough ammo to complete the remaining required damage even when the incoming quiver is empty.

Each checkpoint record identifies a safe position, `remainingDamage`, and `reachableSupplyIds`. The validator requires at least three arrows more than the stated remaining damage. This is a conservative data budget, separate from simulation tests that check atomic restart snapshots and actual recoverability. The between-wing Blue Rest has 23 local arrows for five enemy wounds. Optional caches do not repair an underfunded required checkpoint.

Each cave's `reward` must have a matching tool record. `axe`, `boat`, and `key` permanently open their wilderness routes. `dawn` and `dusk` are the two relic halves. The ladder checks required guards and the reward together, preventing an exit that abandons the progression item. Set `exit` inside a final navigable chamber, clear of walls and guardians. The one-way entrance must be explained by `exitText` or an arrival cue.

## Wilderness graph

Nine `landmarks` form a miniature route graph. Coordinates `x,y` range from zero to one. `kind` selects camp, cave, forest, river, wall, or summit art. A `cave` index identifies the section. `requires` supplies the visible missing-tool lock. `clue` previews the destination; `toolAction` describes the permanent contextual opening.

Routes are `{from,to,requires?,shortcut?}`. The core sequence is camp → Chalk Burrows → Bramble Door → Rootbell Hollow → Murmur Ferry → Sunken Ledger → Long-Shut Gate → Amber Eyrie → Blue Hour Vault. The boat opens a return from Rootbell Hollow to camp. The key opens a return from the cistern to the forest. Cleared delves are routes, not repeated clearing taxes.

## Validation

`NM.Content.validate()` returns `{valid,errors,chambers,damageBudget}` and accepts an alternate candidate for editor/build use. It checks stable IDs, bounds, room connectivity, safe floor locations, bank segments, enemy definitions, guards, rewards, checkpoint ammo margins, whole-cave damage budgets, valid landmarks, and the full tool-chain fixed point. Errors identify the relevant stable ID.

The content suite additionally compiles the real floor grids, flood-fills every spawn, checks all safe anchors and authored entities, verifies every archetype on the required route, tests the honest bank trajectory, and injects malformed content to ensure rejection. Run all tests with the project's one quiet command, `npm test`. No engine-source change is necessary to move a guard, retune a cue, add an optional chamber, or author another encounter using these records.
