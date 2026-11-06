# Native art and animation

`src/view.js` creates all geometry using the unmodified my-3D2dge v0.89.1 World3D extension. No raster/model assets or copied source-game artwork. Shape/material registries provide static hangars, shipyard cranes, warehouses and coastal cottages; the native pen draws animated vehicles, target states and effects, while two native camera-space overlay scenes draw the station foreground independently for each viewport.

## Palette and units

Simulation and art use x east, y south, z up; 16 units = one metre. Render-only offset (+131072,+262144) keeps native terrain's positive coordinates while the simulation and projection API retain geographical coordinates. Terrain is flat and colored into pasture, water, coast and an inlet.

Olive `#65765a`, highlight `#82916b`, shadow `#3e5149`; instrument ink `#182d32`; sea `#23536a`; glass `#a0c6c6`; amber `#ecc276`; cloud `#d7dfd8`; danger orange `#e2774e`. Dawn light contrasts warm interior fittings with cool Channel water. Native pixel-resolution rendering and faceted shapes establish the PS1/N64 family; split screen preserves silhouette and geometry without relying on native postprocessing.

## Aircraft and attachments

Bomber length 368 units, span 512. Local +x points forward, +y starboard, +z up. Main wings: x +28 to -6, y ±252. Engines: y -176,-88,+88,+176. Pilot eye (+75,0,+20); nose (+186,0,+2); starboard (-26,+28,+10); tail (-197,0,+8); port (-26,-28,+10); sight (+105,0,-24). Gun mounts have separate actual camera yaw offsets (0,+π/2,π,-π/2). Foreground framing differs at every station; world-visible wings/nacelles remain aircraft-attached.

Exterior animation reads aircraft pitch/bank, independent engine health and throttle, gear and doors. Three-blade props spin at each engine's health-scaled speed; smoke and fire mark a failed engine. Bomb doors swing outward/down, gear extends, guns recoil from authoritative `mounts[station].recoil`. Gun camera aim is bounded by simulation. Sight looks downward at the shared prediction and presents target brackets and a world-space impact reference; it never changes projectile origin or collision.

The first-person fuselage is omitted to prevent camera clipping. Native World3D currently skips its overlay scene in split screen. The game creates two overlays through the native `_makeOverlay` helper and uses their native pens/materials/cameras. After each world draw, an explicit scissored overlay pass clears depth inside that viewport and draws its camera-space station housing. Keeping foreground at the local camera origin prevents the intermittent disappearing first pane observed when close geometry moved through large world coordinates. Each eye has independent instance buffers; overlay resources are disposed explicitly. Engine source files remain unchanged.

## World and effects

Home (0,0): east-west strip, thresholds, lamps, hardstands, three hangars and control hut. Enemy coast starts near x250000 with a long navigable-looking inlet to the x340000 shipyard. Harbor cranes and warehouses surround a 200 m military transport, escort, breakwaters, rail lines, cargo and lighthouse. Target positions come from mission data. Fuel tanks, works, refinery and coastal battery switch to authored ruin/smoke states when destroyed.

Fighters share one custom compact silhouette with head-on, side and tail appearances driven by authoritative transforms. Swept shots are presented as luminous tracer segments. Falling bombs rotate with velocity. Flak warnings occupy predicted world volumes, then become faceted dark bursts. Explosions have short hot cores, solid debris-colored lobes and climbing smoke. These are presentation effects only and cannot score or damage anything.

## View interface

`new BomberView(E,game); await view.init({render:true}); view.update(dt,state); view.draw(r,state,players,opts)`.

`opts`: `exterior`, `title` (exterior framing puts bomber to screen right), `freeCamera`, `debug`.

`view.freeControl({forward,right,up,yaw,pitch,fast},dt)` moves the persistent developer camera; positive forward/right/up and normalized turn inputs are accepted. This is independent of aircraft control and retains native fixed-camera rendering.

`view.projectFor(playerIndex,x,y,z)` returns game-pixel coordinates after that pane draws. `view.world` exposes the native world for inspection. `view.dispose()` frees the world. Headless physics uses `init({render:false})`. The default is the native WebGL 2 backend for reliable boot in this headless WSL environment; `?backend=webgpu` explicitly exercises the native WebGPU backend. SwiftShader WebGPU selected correctly but lost its device during the isolated scene proof; the underlying cause is unknown, and WebGL 2 stayed clean.

## Visual verification

Public-input captures cover all four gun stations and a tablet portrait bombsight in `tests/browser-evidence/`. The browser suite includes rendered-pixel retention checks for nose canopy and pilot instruments before pause, over twelve sequential frames after pause, and after departure returns to solo. Both Chromium and WebKit exercise those checks; `tests/split-verify.py` runs the focused viewport regression. Current pass totals are recorded in the result JSON files rather than hardcoded here. Native WebGPU failure evidence is retained separately and does not establish hardware support.
