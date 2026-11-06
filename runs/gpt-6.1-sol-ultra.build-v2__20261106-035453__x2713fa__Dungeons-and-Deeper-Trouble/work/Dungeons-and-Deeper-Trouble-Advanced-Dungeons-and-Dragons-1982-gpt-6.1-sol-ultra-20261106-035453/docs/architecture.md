# Architecture

The single final HTML in the workspace root is built from task-local sources. The unmodified AI Hub client is first in the head after charset. The full my-3D2dge 0.89.1 engine (8ecc2f62353761187bdfe226f327b7ea5d2eb691) supplies the fixed clock, input abstraction, native pixel rendering, humanoid rigs, audio synth/buses and standard HTML shell.

`DTSim.Simulation` owns all gameplay, commands, checkpoint state and unique entity IDs. It steps only through the engine's fixed update. Rendering reads its JSON state without changing it. Input projects screen directions to ground, then sends the same command shape to local or network authority. Transport hooks translate device-independent held inputs and acknowledged discrete commands. Hub dedicated authority creates only roster avatars and runs without focus or a local player.

Root owns main lifecycle, product UI, saves, bundler and artifact tests. Bounded parallel ownership: simulation agent owns config/content/sim and content/simulation tests; render/audio agent owns native rendering/animation/audio; network agent owns Hub/WebRTC and transport tests. Contracts are in docs/sim-interface.md and docs/network.md.

Solo/couch and standalone hosts save atomically with checksummed alternating envelopes. Hub, attract and developer experiments are excluded. Restart snapshot lives separately from low-ammo resume state. All transient states are independent.

No runtime imports, fonts, image files or sound files are needed. All world art is code, all sound uses Web Audio. Large build output stays in the development folder, never /tmp. Browser tests use installed Playwright and ephemeral loopback servers owned by the test process.
