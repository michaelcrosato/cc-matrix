# Native mine assets

`src/view/assets.js` registers 17 original objects, two helmet hooks, a held pickaxe hook and 11 native held poses. It uses the full my-3d2dge 0.89.1 registries; no bitmap or audio requests are involved. Read against the vendored `docs/ASSETS.md` and Humanoid APIs.

## Interface

- `PD.installAssets()` is idempotent and returns `PD.ASSETS`. Registration also occurs on script load so native asset tools can discover entries.
- `PD.ASSETS` contains `doorAmber`, `doorCyan`, `doorRose`, `ore`, `hopper`, `heavy`, `key`, `pick`, `extractor`, `lamp`, `timber`, `brokenPick`, `helmet`, `rescue`, `ladderTop`, `oreCart`, `wheel`. All IDs have `PD:` prefixes.
- `PD.makeMinerRig(index)` returns a native Humanoid. Even indices use a gold helmet, blue overalls and broad shoulders. Odd indices use a turquoise helmet with a fin and bandanna tail, rose shirt and teal overalls. Cosmetic seeds are explicit and do not advance gameplay randomness.
- `PD.updateMinerRig(rig,miner,dt)` reads `miner.body` (native Platformer), numeric `tool` (also supports `{durability}`), `down`, `invuln`, `pose`, `action` (Attack or its `.state`), `aim`, `collectT`, `jamT`, `rescueT`. It returns the rig. It never changes the miner, world, score or action timers. Native rig state supplies run/jump/landing/climb/duck/hurt, while native Attack state supplies anticipation/contact/recovery.
- Pose IDs can be supplied plain or with the `PD:` prefix: `boast`, `break`, `unarmed`, `jam`, `unlock`, `rescue`, `collect`, `celebrate`, `redirectHigh`, `redirectLow`, `wear`. Downed miners use native `die`; custom poses ease through the native pose registry.

The rig's drawn height is approximately 24 world units including its helmet, and its footprint is about 10 wide. Use a body 24–25 units high. Its held pickaxe extends 13.5 units beyond the right hand; contact geometry stays a simulation concern.

## Placement

Shapes are written facing south (`Math.PI/2`, the native default) with x across, y depth and z height. This presents broad door fronts in side view. Doors are 26 wide and 33 tall; ore 16 wide, hopper 15 wide with distinctive ears, heavy 20 wide with two broad bands. The key is an oversized winged gold bow, falling pick a full tool, and rescue marker a helmet below a large cross. Shapes use native hue-shifted materials, glow and shape lighting hooks.

`r.shape(PD.ASSETS.lamp,x,y,z,{light:true})` provides both the protected lantern and its authored warm light. The extractor is a large brass and steel machinery head; animate its pistons, wheel placement, warning lamps and shaft separately in the scene. Static object footprints do not define gameplay rock collision.

## Authoring and preview

Add a namespaced entry with an identifying outline in `PD.installAssets()`, then add its key to `PD.ASSETS`. Use the native shape primitives and material registry described by `vendor/engine-repo/dist/handoff/docs/ASSETS.md`. Keep movable mechanisms in scene code or native hooks. Native equipment belongs in `Humanoid.hat`, `Humanoid.weapon` and `Humanoid.pose` rather than painted over a snapshot.

The engine's installed Playwright Node tooling can generate native sheets when Node Playwright is available:

```
node vendor/engine-repo/dist/handoff/tools/asset-sheet.mjs src/view/assets.js --out docs/asset-sheets
node vendor/engine-repo/dist/handoff/tools/asset-sheet.mjs src/view/assets.js#PD:heavy --out docs/asset-sheets
```

The Python Playwright environment supplied in TASK.md can also load the native engine and this script with `page.add_script_tag(path=...)`, then invoke `E.shapeSprite`/`E.shapeInfo` for each ID and `rig.draw` for pose sheets. `docs/assets-preview.png` and `docs/animation-preview.png` record that native raster study. The 17 shapes rendered in both side and iso views with no empty silhouettes, no native warning/error, and at least four tones per object. Inspected the resulting sheets; moved the ordinary gold seam to the front face and centered the extractor wheel spokes to improve side-view readability.

These are original procedural adaptations. They do not claim a pixel-perfect reconstruction of the 1982 sprites.
