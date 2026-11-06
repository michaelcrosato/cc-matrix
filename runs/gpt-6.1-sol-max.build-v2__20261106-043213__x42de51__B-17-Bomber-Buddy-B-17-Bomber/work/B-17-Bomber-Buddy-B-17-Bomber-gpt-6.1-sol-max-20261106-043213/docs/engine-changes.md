# Engine adaptations

Full my-3D2dge v0.89.1 is embedded unchanged. One change in the World3D extension: `_render` permits the camera foreground in split view, preserving the viewport and restoring autoClear. Native code originally explicitly skipped the overlay under `this._vp`, which prevented cockpit and gun geometry in couch co-op. Each pane rebuilds the overlay through native `world.onDraw`.

Bloom is disabled because the inspected WebGL postprocess path omitted procedural pen objects. No replacement renderer or incompatible shaders are introduced. All 3D objects use the native pen, terrain and node-material renderer.

The flight model replaces the reference rail-shooter rules. Native scenes, fixed stepping, input, player inputs, menus, settings, audio buses, rigs, and camera/pen rendering remain in use. Hub's playerless authority uses native `game.advance` from a timer independent of requestAnimationFrame.

Bundle dependencies are pinned and embedded with esbuild. No CDN or development server is required for standalone play. Upstream licenses and source revisions remain in vendor/ and the bundled script notices.
