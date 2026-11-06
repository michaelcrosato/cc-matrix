# H.E.R.O. After Hours

An original, four-descent cave-rescue action platformer inspired by H.E.R.O. (Activision, John Van Ryzin, 1984). Side-on 2.5D, cel-shaded geometry with ink silhouettes. Rescue eight stranded night-shift miners with a prop-pack, helmet laser and six dynamite sticks per descent. Power is time; surviving equipment is score. A warm, self-important rescue contractor narrates the operation.

Research: the original Activision manual (AtariAge transcription and digitpress scan), Atarimania screenshot and metadata, original Activisions newsletter search extract describing propeller sound. The manual confirms flight/gravity, continuous laser and slower wall melting, dynamite self-damage, destructible lights/darkness, lava and hot walls, rafts, pursuing invulnerable tentacles, bats/moths/spiders/snakes, 20 increasing levels, and rescue/power/ammunition scoring. The original sound recording was not auditioned; exact original sound fidelity is unknown. All new sound is original synthesis.

https://static.atariage.com/manual_html_page.php?SoftwareLabelID=228
https://www.digitpress.com/library/manuals/atari2600/hero_guide.pdf
https://www.atarimania.com/games/atari-2600-games-h-e-r-o-19482
https://www.ataricompendium.com/archives/newsletters/activisions/activisions_hero.pdf

Title selection: 50 internally brainstormed riffs, Node crypto.randomInt(1,51) selected entry 7: H.E.R.O. After Hours.

Three.js 0.180.0 WebGPURenderer (WebGPU primary; WebGL2 fallback), MeshToonMaterial, native AnimationMixer / AnimationClip / NumberKeyframeTrack; Rapier 3D compat 0.19.3 kinematic capsule, character controller, colliders, moving platforms and debris. Web Audio synthesis. Gamepad standard mapping. No asset downloads at runtime. Hub client 1.4.0 is embedded verbatim as the first script.

Four data-authored levels demonstrate every mechanic. Standalone 1–2 shared-screen co-op; AI Hub 1–4 shared-world co-op with a host or a host with no seat. No external multiplayer server is used. All session input and state pass through AIHub.send. Pausing does not stop other Hub pilots. The dev bench exposes flight, speed, gravity, power drain, fuse, blast radius and enemy speed, plus invulnerability, no-clip, refills, mission selection and advance.
