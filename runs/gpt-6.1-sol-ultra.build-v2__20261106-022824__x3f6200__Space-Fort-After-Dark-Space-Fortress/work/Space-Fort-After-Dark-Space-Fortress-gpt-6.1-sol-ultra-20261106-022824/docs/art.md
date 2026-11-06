# Procedural art and animation

`src/render.js` is the game's native my-3D2dge pixel renderer. It uses no downloaded art and no canvas drawing primitives outside `E.px`, engine sprites, and the engine pixel font. Sprite palettes use `E.tones` for hue-shifted metal ramps.

The custom asset set includes four numbered, differently striped interceptors; three-frame native `E.anim` exhaust states; hunter, broad bomber, scout, rammer, forked tractor, dive, and relay silhouettes; a mechanical gravity anchor; individually drawn station radiators; a layered dreadnought with independent opening/destructible components; ground carriages; shared charge pickups; and the fortress title composition. Station panels carry rivets, vents, illuminated hangars, antenna lights, traffic, and a segmented perimeter ring. The same moon, palette, and fortress architecture connect orbit and ground.

Simulation fields drive thrust/boost, recoil, shield blink, tractor acquisition/lock, gravity charging/pull, radiator cooling/overload, boss batteries, destroyed components, retreat streaks, and victory flecks. The renderer keeps its own transient event history; epoch changes, backward simulation time, and `reset()` clear the history. No draw consumes the world RNG or alters simulation state.

Logical dimensions are 960 by 540. Ships and enemy visual centers use native center anchoring. Environment art is queued behind the active plane; readable warnings and weapon traces are placed above it. Large structures use native pixel drawing rather than the engine's small actor scratch surface. Screen positions come through `r.w`, while background details are screen anchored. Player markings and individual enemy shapes supplement hue.

API: `new SF.Renderer(game)`, `draw(r, state, {title,attract,debug,reducedFlashes,shake})`, `event(eventObject)`, and `reset()`. `attract`/`shake` are accepted; the HUD and shake choice are owned by the application. The renderer intentionally derives effect ages from simulation time.

Verification performed: syntax check and native engine headless drawing with all eight enemy kinds, four radiator states, each act, all boss phases, components, projectiles, pickups, ship boost/shield states, debug circles, title art, and a kill effect. No engine errors occurred. Visual review is performed against the final application by the integration owner.

## Packaged browser visual evidence

The actual bundled HTML was opened with installed Python Playwright Chromium. `docs/evidence/` contains purposeful 1920×1080 title, free-flight, fortress, ground, each boss phase, a coordinated fortress threat preview, victory result, developer menu, and credits captures. Additional captures cover iPhone-profile portrait framing, a 390×844 DPR1 touch page, and iPad-profile framing. These are emulations, not physical-device checks. No browser or engine errors occurred in these captures. A real-intent bot reached a victory result at 635 seconds of simulation with score 35,177 in the inspected bundle.

Visual inspection caught and fixed the application canvas using the HTML default 300×150 CSS size, title content exceeding the desktop viewport, scaled modal `vh` limits overflowing the visible area, and initial HUD/touch controls appearing over a menu before the first HUD refresh. The canvas now owns the full viewport; the native Screen owns arena letterboxing and pointer transforms. The integration owner supplied the fractional fit adapter for low-DPI devices; its inspected DPR1 result was `S=.40625`, `OX=0`, `OY=312`, with the full 960×540 arena visible. Compact pilot badge labels were enlarged for desktop readability. Credits have a wider reading measure, and all four interceptor accent palettes agree with standalone seat colors.

`tests/render.mjs` exports `runRenderTests()` for the single verification command. Its nine checks cover all three act draw states, simulation/RNG preservation, all three boss phases, title drawing, transient reset, and title state isolation.
