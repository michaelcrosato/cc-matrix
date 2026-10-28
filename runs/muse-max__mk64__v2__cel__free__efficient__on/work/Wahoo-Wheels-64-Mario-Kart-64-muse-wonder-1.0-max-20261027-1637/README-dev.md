# Wahoo Wheels 64 — dev notes

Title picked by RNG from 50 brainstormed titles: index 49 → "Wahoo Wheels 64" (`Math.random()` in Node).

Single-file deliverable lives one level up:
`Wahoo-Wheels-64-Mario-Kart-64-muse-wonder-1.0-max-20261027-1637.html`

Stack: Three.js 0.180.0 WebGPURenderer (WebGPU only), Rapier 0.19.3 compat, Web Audio, Gamepad API.
Art: cel-shaded `MeshToonMaterial` + gradient map + inverted-hull outlines. Animation: procedural.

Open the .html in a WebGPU browser (Chrome/Edge). No build step; CDN import map loads libraries.
Controls: P1 WASD + Space/E/Shift/R, gamepad D-Pad/left stick + Cross/R2. Settings include Invert H/V axes.
