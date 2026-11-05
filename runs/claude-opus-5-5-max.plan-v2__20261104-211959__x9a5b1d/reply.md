`PLAN.md` is written and covers everything `TASK.md` asks for; §17 maps each requirement to its section. `planner-exit-interview.json` is saved beside it and parses as JSON. The plan names no game title and uses none of `TASK.md`'s file or folder names; paths are relative to the dev folder.

## The game in the plan
It's an original over-the-shoulder action-horror game that borrows the source's mechanics, not its content:
- **Story:** in 1979, kidnap-and-ransom insurance adjuster Max Ransom goes to a storm-beaten island to recover a rude 74-year-old shipping magnate. The islanders have limpet parasites on their necks.
- **Core play:** you stand still to aim a laser sight, shots to the head or legs stagger enemies, and a stagger opens a kick that hits the crowd. You also get a grid inventory case and an escort.
- **Characters:** the merchant wears a brass diving helmet. The villain is only a voice on the island's loudspeakers until the final boss.
- **Multiplayer:** a 4-minute co-op hold-out on the village map, for 1–4 players.

The plan also gives builders 8 level maps plus the Net Loft's upper floor, starting balance numbers, the network messages for co-op, script lines, the test plan, a build order and a list of what to cut first if time runs out.

## Tested on this computer
I built small test scenes and marked what they confirmed as `[verified]` in the plan:
- **Single file:** the single-HTML build runs from `file://`, including an asset pack.
- **Rendering and characters:** the shoulder camera and laser work, custom characters run on the engine's rig, and I looked at the dusk, rain and abbey lighting in rendered frames.
- **Headless:** a test scene with these characters plays in Node with no browser and replays identically.
- **Hub harness:** a minimal game on this engine passes the 2-player, 4-player with lag, host-leave and server runs. It only sends test messages and has no real gameplay yet.
- **Without the hub:** two pages connect over `BroadcastChannel` and WebRTC, tested with bare test pages rather than the game.
- **Maps:** a script confirmed every open cell is reachable, run on the map text in `PLAN.md` itself.

Testing also turned up traps that the plan warns about, such as:
- `npm init` breaks Node imports of the engine.
- The engine's conveyor doesn't carry the character controller.
- Menus must freeze with `timeScale = 0`, because `paused` stops `update` from running.

## Worth checking
- **Multiplayer outside the hub:** `TASK.md`'s wording is ambiguous, so I planned for it fully, with same-computer parties and WebRTC invite codes. If you only meant "still runs outside a session", builders can skip `LocalSession` (§7) and the party options on the Night Shift menu.
- **Closeness to the source:** my first villain and a knife-duel henchman came out too close to specific characters, so I redesigned both. The plan also lists source names and content that must not appear.
- **Not tested:** the dawn lighting is a first guess and the plan says so. Balance numbers are starting values for builders to tune with the test bot.
- **Size:** the plan is about 90 KB and ambitious, so a lower-effort builder may need the cut list in §16.

I removed my scratch files and stopped the local servers I'd started; nothing is committed.