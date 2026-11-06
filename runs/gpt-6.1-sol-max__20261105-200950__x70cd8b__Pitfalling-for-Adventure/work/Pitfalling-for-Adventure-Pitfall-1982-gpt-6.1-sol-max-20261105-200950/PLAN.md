# Pitfalling for Adventure

Original 2.5D jungle platform adventure inspired by Pitfall! (1982).

Research: Activision's six-page original manual at https://www.ataricompendium.com/archives/manuals/vcs/pitfall.pdf (mechanics, route, hazards, illustrations); contemporary instructions at https://atarionline.org/wp-content/uploads/2024/03/Pitfall-atari-2600-manual_compressed.pdf; David Crane interview quoted at https://gameinformer.com/b/features/archive/2013/08/02/the-pitfalls-of-atari-development-a-retrospective-on-the-industry-s-first-platformer (vine sound and crocodile inspiration); https://vgmpf.com/Wiki/index.php?title=Pitfall%21_%28A26%29 (sound palette). Original uses 255 circular scenes, 32 treasures, three lives and a 20-minute limit; tunnels cover three surface scenes per screen. Preserve readable hazards and treasure-driven exploration, with original art, music, names and level layouts.

Demo: eight treasures, eight-minute clock, checkpoints, six hazard types, two caves, ending and score. Native Three.js animation clips, procedural ink/toon meshes, Rapier capsule controller and dynamic rolling logs, code-only Web Audio. Controller-first menus, local two-player adventure, AI Hub protocol 1 ghost racing. Attract replay after ten idle seconds. Pause includes map, options, credits and live developer tools.

Package: template + scene, audio, game, interface modules assembled by build.py into one HTML in workspace root. CDN dependencies pinned to Three.js 0.180.0 and Rapier 0.19.3. Unmodified AI Hub session client in head.

Validation: one test.py entry point, deterministic physics and collection checks, scripted complete route, controls/menu/touch/gamepad, audio analysis, save/resume, attract mode, AI Hub harness scenarios. Screenshots for visual composition only.
