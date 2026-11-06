# Engine feedback: Trauma Coast: Second Sight

Built against my-3dge 6a1501f. The engine files remain as pinned.

## Requests

- A public dynamic geometry handle with writable position/normal/colour buffers, index updates and explicit bounds.
  The operating field needs breath, heartbeats, incision lips, fluid, thread and hands to change each frame. The
  workable public-API route retains a defineGeometry builder's geometry and attribute arrays. The kit's attribute
  subclass copies supplied arrays, so writing the original buffers has no effect. A documented handle would make
  this intent clearer and safer, including an empty initial draw range that preserves bounds.
- Multiple local input seats on the same action map. The built-in active gamepad is appropriate for a solo game;
  four surgeons require polling each standard pad separately and resolving its saved bindings ourselves.
- A voice gain bus. Code-generated formant voices use a custom GainNode because the native buses offer effects,
  music, UI and ambience. The native music/effect definitions and offline DSP remain useful throughout.

## Friction

- Developer action names require camelCase, and pause/Escape/PadStart are system-reserved. These restrictions gave
  useful CORE_BAD_SPEC diagnostics once exercised. The custom map also needs an explicit movement tuple if its
  action names differ from forward/back.
- A scene restart is supported in place but a running page does not change scene definitions. One registered scene
  with a game.run setting cleanly handles story sets and operations, preserving the hub page.
- The headless rendering environment needs short socket paths and the existing Chromium executable. The task's
  private /tmp/g.* TMPDIR workaround avoids long workspace socket names. No engine setup downloads were needed.
- The graphics-only material/texture registry has eager reference validation: define a procedural texture before
  a material that names it. A fast asset-registration test now covers this separately from the sim.
- WebGPU absence can fail at engine evaluation in unsupported browsers. A classic preflight and guarded bundled
  module provide the clear game-specific fallback before any engine import executes.

## What worked well

The fixed-step native CPU world, capture/restore, replay hashes and headless inspector made the surgical simulation
and network sequencing verifiable. The public geometry kit, procedural body grammar, multi-beat actions, camera
modes, PBR looks, audio DSP and persistent store were enough to keep every asset and sound in readable code/data.

## Local engine patches

None.
