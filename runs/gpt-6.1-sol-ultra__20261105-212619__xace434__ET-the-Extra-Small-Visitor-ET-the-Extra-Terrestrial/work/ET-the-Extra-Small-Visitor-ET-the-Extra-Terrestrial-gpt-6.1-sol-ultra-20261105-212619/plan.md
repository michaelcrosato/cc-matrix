# E.T. the Extra-Small Visitor

Original 1–2 player third-person / elevated-camera stealth adventure inspired by E.T. the Extra-Terrestrial (1982).

The slice follows a full evening: befriend a stranded visitor, explore an autumn suburb for three homemade transmitter parts, use candy distractions and shared heartlight to evade searching agents and heal flowers, assemble and tune the transmitter in a redwood clearing, then ride a bicycle through a moonlit aerial escape to a complete goodbye ending. Failure supports checkpoint retry. A co-op friend helps with collection and distractions.

Art: procedural cel-shaded 3D miniatures, ink outlines, warm windows against indigo dusk, angular redwoods, cream moon and amber heartlight. Native Three.js animation mixers animate characters, pedaling and world props. Original code-generated Web Audio score, effects and gibberish voices; music 10% default.

Stack: Three.js 0.180.0 WebGPURenderer (automatic WebGL2 compatibility), Rapier 0.19.3 rigid bodies and character collisions, Gamepad API, Web Audio, AI Hub session protocol and standalone co-op.

Delivery: single bundled HTML in workspace root, all development files in this folder. Controller-first menus, adaptive prompts, keyboard and mouse, invisible touch movement and contextual action, 10-second attract replay, pause/settings/about/live development sliders, full scripted playthrough and input/network/audio validation.

Research: Amblin official film page https://amblin.com/movie/e-t/ ; Universal synopsis https://www.universalpicturesathome.com/movies/et-the-extra-terrestrial ; UCLA Film & Television Archive https://cinema.ucla.edu/events/e-t-the-extra-terrestrial-1982-2013-10-27/ ; screenplay https://assets.scriptslug.com/live/pdf/scripts/e-t-the-extra-terrestrial-1982.pdf . The original Atari manual was also checked: https://atariage.com/manual_html_page.php?SoftwareLabelID=157 . Its three-part communicator, candy/energy, human pursuit, flower revival and forest rescue inform the loop. Original mechanics expand these and the film: friendship, hiding, candy trail, household communication device, government searches, healing plants, bicycle flight and farewell. Film soundtrack credited John Williams; game uses its own procedural composition, no audio files or copied melody.

Technical research: official Three.js WebGPURenderer, MeshToonNodeMaterial and AnimationMixer documentation; Rapier character controller documentation; AI Hub lib/hub README/session/retrofit/harness from GitHub.
