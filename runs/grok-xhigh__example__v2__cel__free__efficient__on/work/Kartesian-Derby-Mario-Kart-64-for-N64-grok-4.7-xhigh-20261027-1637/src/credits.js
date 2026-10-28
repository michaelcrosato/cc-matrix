export const ABOUT_TEXT = `Source Information
Date: 2026-10-27 17:26
Source: Mario Kart 64 for N64
Tech: Three.js r180 (three@0.180.0) WebGPURenderer and MeshToonNodeMaterial, Rapier 0.19.3 (@dimforge/rapier3d-compat), Web Audio API, Gamepad API. No WebGL renderer.
Art Direction: quantized cel shading, four-stop nearest gradient, inverse-hull outlines, warm daylight and a lantern night course. Original karts, drivers, and courses.
Animation: the render loop spins wheels, bobs and leans drivers, tumbles item crates, flickers boost flames and drift sparks, and floats held items and balloons.
Testing: node:test on the same modules the page bundles, run twice; localhost HTTP load in a headless browser twice. DOM text, console, and canvas buffer size. No pixel grading. Parameters: fixed 1/60 race substeps, dt cap 8s per call, attract idle 10s.
Environment: Grok CLI (headless); Linux; Chromium headless via Playwright, WebGPU adapter present
Model: xAI, grok-4.7, reasoning effort xhigh
Usage: unknown

Testing Feedback
How many issues did testing catch? The first suite run failed 2 tests. One was a product timer: a single step longer than 3 seconds never finished a 5 second item-box return, because the race clamped each call to 3 seconds. The cap is now 8 seconds. The other failure was the test itself: the stick sample never crossed the menu threshold, so it compared 0 with -0. A frame check of the road strip found the triangles wound downward, which would hide the track from above. That winding is reversed and the suite now asserts an upward normal. The pause Start edge was stored before it was read, so it could not resume; the Resume row still could. Wall hits also fired on every step while a kart stayed against a wall; they now wait 0.4 seconds. The headless load lost the WebGPU device under the default GPU flags. Launching Chromium with Vulkan kept the device. The canvas then matched the window, and a cup race showed lap, place, and speed. The buffer is resized only when the window size changes.
How many would be considered critical issues / game breaking? 3. The downward road would leave the course invisible. Outline shells were front-facing, so they covered the kart body; they now use the back side and only the silhouette shows. Pause also closed itself on the same press: the held pause key is also back, and the menu read that as a new press. Entering pause now latches that hold until the key comes up. The timer cap does not bite at frame rate. The wall-hit repeat does not stop a race.
What was the most helpful test you ran? The item-class test. It starts a fresh race and checks that every shipped item changes speed, control, balloons, or a held item.
What was the least helpful test you ran? The touch-gate predicate. It only checks three booleans and never opens the page.

Engine Feedback
What did you like most about the engine? MeshToonNodeMaterial takes a gradient map, so the cel look is a material. Rapier 0.19.3 loads from one ESM module in both node and the browser, and the race tests step that same world.
Did you get stuck or guess wrong? Yes. WebGPURenderer.render warns and does nothing useful if you call it before init, so the page waits for init and then renders. The published Rapier init types only show init(), while the runtime prints that those parameters are deprecated. Headless Chromium may have no WebGPU adapter; the page then shows the server message instead of starting another renderer.
What was the most important thing you had to build yourself? The whole derby: handling, drift stages, rocket start, the item set, CPU driving, cups, splits, and the attract loop. Three draws and Rapier steps a dynamic body. Neither one knows what a race is.
What was the hardest part about using the engine? One heading for the course tangent, the kart step, and the mesh yaw, plus a road ribbon whose normal points up. Split view uses one camera per port so the chase blend is not shared.
If you had to remove or overhaul one thing from engine, what would that be? The render-before-init path. A missed await blanks the canvas and only leaves a console warning.
If you could change one thing about the engine, what would it be? Ship a short WebGPU toon example that shows the gradient map color space and the init-then-render order next to the Rapier step.

Prompt Feedback
What did you like most about this prompt? It asks for a playable slice with cups, items, and a controller, and it names the source without asking for Nintendo's text or cast.
What was confusing? The filename still contains spaces in the source title while the file has to be one path. Screenshots are forbidden, but the product is a picture. WebGPU is required in a place that may not have an adapter. The touch sentence has to match exactly, and the attract mode is allowed to cheat.
What was the hardest thing to do? Fitting every item class and every mode into one HTML file, with the node tests importing those same modules and with no unfinished feature left in the source.
If there was one test you could of run, what would that test be? A headed WebGPU frame that checks the kart nose points along its velocity and that the road is on screen. This run was not allowed to grade pixels, and the headless browser may not expose an adapter.
`;
