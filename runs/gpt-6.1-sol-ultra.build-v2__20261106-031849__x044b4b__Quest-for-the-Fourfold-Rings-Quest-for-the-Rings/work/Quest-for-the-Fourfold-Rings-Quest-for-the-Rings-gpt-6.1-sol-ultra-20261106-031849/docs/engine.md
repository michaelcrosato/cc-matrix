# Native engine research and presentation

## Revision actually used

- Full `my-3d2dge.js`: my-3D2dge 0.89.1, upstream commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`.
- Retrieved README, API card, API index, asset manual, adventure kit, AI guide, and official asset-sheet tooling from that exact revision.
- The 1,266,871-byte full engine is loaded once; no external renderer, no modules loaded twice, and no runtime dependency downloads.
- Engine code changes: **none**. Registries and native API extensions carry game-specific content.

## Research findings

The handoff’s action-adventure kit demonstrates TileMap floors and queueWalls, Body ground movement, continuous Humanoid poses, native Attack timelines, prop and shape depth sorting, lighting, and shared frame cameras. This game adapts that rendering idiom. Root owns one E.Game and the deterministic authoritative simulation; RingView owns only presentation state. Ground coordinates are x/y, z is height, and a tile is 16 world units.

Native registries extend E.SHAPES, E.MATERIALS, E.PATTERNS and Humanoid.hat/weapon/pose. Four hero rigs differ in outfit, palette, cape, weapon and silhouette. The Warrior carries a crest helm, sword and kite shield; Wizard has a crescent hat and runestaff; Phantom has a pale hood and luminous eyes; Changeling has antler-like crown branches and a green mirrorcloak. Native Attack.state feeds the rig’s anticipation, active and recovery poses.

The custom dragon uses the native actor update/render idiom, E.charView projection, E.tones, E.px primitives and depth sorting. Its continuous spine, tail, wings, jaw and breath anticipation are original code. Spider legs and drop pose also use native projection and snapped pixels. Nightmares use a dressed native Blob with wings, horns, tail and fangs.

## Original native assets

- qRing: beaded gold ring with three crown jewels.
- qSeal: radial binding seal, activated once by simulation.
- qPedestal: octagonal ring altar.
- qArch: extraction waystone.
- qCrystalRib: faceted asymmetrical luminous ribs.
- qFurnace: molten vent and pressure mechanism.
- qPartition: rune-faced clockwork wall.
- qThrone: crown-backed Ringmaster throne.
- qCastle: parameterized castle route tokens.
- qTable: gold-rimmed ritual map table.
- qHourglass: gold-framed crystal Dread hourglass.

Native core props supply generic masonry dressing, trees, braziers, banners, bones, lamps and rubble. No copied packaging illustration or external bitmap is used.

## Evidence

`tests/view-smoke.py` launches a 1920×1080 headless Chromium browser using the installed Playwright 1.63.0 environment. It covers title, Dungeon, Crystal, Inferno, Shifting, final and board scenes, records page/console/engine errors and saves the view screenshots under evidence. The current run reported no errors. This is a visual integration smoke test, not a playthrough.

The exact supplied `vendor/engine/tools/asset-sheet.mjs` inspected all eleven native shapes. The initial ten are recorded in `evidence/assets-report.json`, the animated partition’s updated form in `evidence/partition-report.json`, and the hourglass in `evidence/hourglass-report.json`. They record no runtime problems; all eleven sheets are in `evidence/assets/`. Generic-floor contrast lints are handled through composition: dark assets are placed on lighter stone or parchment; seals use a surrounding luminous rune; waystones use a gold portal. Occluded back beads, arch trim, and table legs intentionally remain in the three-dimensional asset so other facings stay valid.

Visual findings fixed during integration: shape facing was initially edge-on; table sorting initially covered route lines and north tokens; the shared camera initially cropped the dragon; the view initially hid a dropped ring by confusing first-pickup history with current ownership. These are deduplicated with the root issue log.

## Integration contract

Load view.js after the native engine and RingContent. Call RingView.init(game), RingView.update(world,dt,uiState) in update, and RingView.draw(r,world,uiState) in draw. Optional uiState.screen title/select/board chooses the diorama. Native map/camera/rig state is observational and never appears in authoritative snapshots. `screenToWorld(clientX,clientY)` uses native Screen.clientToScreen (which already includes camera ix/iy) then native View.toGround.

High contrast reads game.settings.outlines. Debug overlays read uiState.debug.collision/nav/telegraphs. Navigation overlays call the pure simulation path query without mutating world state. Settings and HUD remain root-owned native Shell extensions.

## Final integration evidence

`node tools/test.mjs browser` now owns all final-file browser checks in one quiet wrapper. The current candidate passed **84 checks, zero failures** across Chromium, WebKit and Firefox. It includes real keyboard/mouse actions, emulated standard pads, controller-only Dev Mode/sliders/credits, second-controller hero ownership and route rejection, primary pad ownership across mouse menus, reconnect/AI fallback, actual CDP simultaneous touch contacts and pointer cancellation, touch ring pickup/extraction, touch pause/lift/resume recovery, storage recovery, ten-second disposable attract loops and exits, and a pure remote interpolation regression. The normal browser extraction is unassisted; screenshots using development setup are explicitly labeled assisted in evidence/browser.json. Final frozen-bundle verification is root-owned.

Remote presentation clones authoritative state, smooths only view positions, and derives native rig walking velocity from snapshot target changes. The authoritative world remains untouched. Spider warning shadows now mark the exact authored landing target, string entity IDs are hashed to finite cosmetic seeds, and possession echoes copy their actual class rig and wind-up.
