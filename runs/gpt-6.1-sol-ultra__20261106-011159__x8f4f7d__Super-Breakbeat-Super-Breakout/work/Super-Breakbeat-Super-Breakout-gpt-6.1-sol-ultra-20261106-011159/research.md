# Super Breakbeat research

## Source

Atari's *Super Breakout*, 1981 Atari Video Computer System edition. Research used Atari's original instructions, preserved as an [HTML transcription](https://atariage.com/2600/manuals_old/super_breakout.html) and a [scanned manual](https://atarionline.org/wp-content/uploads/2021/11/Super-Breakout-1978-Atari-2600-manual.pdf). The scan explicitly bears ©1981 despite its archive filename.

## Confirmed source characteristics

- Horizontal paddle movement returns a ball into colored brick rows. Contact position controls rebound angle. Upper bricks and accumulated paddle contacts accelerate play; reaching the roof halves paddle width until the next serve.
- Breakout renews cleared walls. Double adds vertically stacked paddles and a second ball. Cavity hides two bouncing balls inside the wall; freeing them increases simultaneous balls and scoring. Progressive sends successive brick bands downward.
- Five serves are supplied. Losing the final active ball ends a turn. Two players alternate separate walls and scores. Beginner variants slow play and retain full paddle width.
- There are no character enemies. The threats are ball loss, speed, narrow paddles, and descending bricks.
- The presentation is a fixed, front-facing rectangular playfield with sparse scoring, bright horizontal color bands, a small white ball, and dark surroundings. The manual frames the wall as a mysterious layered force field encountered by a lone spacecraft.
- Eight game sounds are available; starting a game randomly selects one. Exact waveforms and pitches are unknown from the manual.

## Original adaptation decisions

These are design proposals rather than claims about Atari's game: make the colored layers into a dimensional ink-outlined orbital barrier; turn Double, Cavity, and Progressive into successive sectors of a short complete expedition; preserve contact-angle aiming and roof shrink. A quiet synthesized groove, captive-ball rescue cues, and a rechargeable emergency pulse can give the new game its own identity while keeping the paddle-and-ball loop central. Use brief imperative copy and leave the ball path unobscured.

## Three.js r180 implementation evidence

- [`MeshToonNodeMaterial`](https://github.com/mrdoob/three.js/blob/r180/src/materials/nodes/MeshToonNodeMaterial.js) is an official node-native cel material exported by `three/webgpu`. It accepts ordinary material properties, including `color` and `gradientMap`. Its lighting model reduces irradiance to discrete shades; the default already provides two shading bands. A tiny nearest-filter `DataTexture` gradient permits stronger custom bands.
- [`Three.WebGPU.js`](https://github.com/mrdoob/three.js/blob/r180/src/Three.WebGPU.js) exports the core animation APIs and node materials together. `AnimationMixer`, `AnimationClip`, and `NumberKeyframeTrack` can animate object transforms, including pulses and captive-ball motion, without separate animation libraries.
- [`WebGPURenderer`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/WebGPURenderer.js) tries WebGPU and supplies a WebGL 2 fallback. Call `await renderer.init()` before rendering. Record `renderer.backend.isWebGPUBackend` for test evidence instead of assuming that the renderer class proves an active WebGPU backend.
- Ink can use slightly enlarged black back-face meshes or explicit edge geometry. This is an implementation recommendation, independent of the source game's original raster style.
