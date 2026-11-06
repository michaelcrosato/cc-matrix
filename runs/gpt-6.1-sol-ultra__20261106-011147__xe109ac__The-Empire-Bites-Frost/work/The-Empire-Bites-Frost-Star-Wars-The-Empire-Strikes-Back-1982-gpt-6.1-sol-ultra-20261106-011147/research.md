# Research — The Empire Bites Frost

Researched 2026-11-06, before implementation. The source is the **1982 Parker Brothers Atari 2600 game**, not the later Atari arcade game.

## Primary source

[Parker Brothers' original illustrated instruction booklet, scanned PDF](https://www.ataricompendium.com/archives/manuals/vcs/star_wars_empire.pdf), especially printed pages 3–6. A local copy is `source-manual.pdf`. [AtariAge's HTML transcription](https://atariage.com/manual_html_page.php?SoftwareLabelID=501) independently supplies the premise and controller instructions; its transcription is incomplete after the joystick section.

The manual establishes these details:

- Protect Hoth's generator across a horizontally scrolling battlefield, monitored by radar. Fly in four directions and fire missiles.
- Up to five walkers march toward the generator; replacements become faster and more dangerous. Five speeders form the player's fleet.
- Walker armor needs 48 body hits and changes color through damage stages. Head armor is stronger; a flashing bomb hatch offers an instant kill.
- Landing in a valley repairs damage, with two repairs per speeder. Walker missiles track the craft; some variants add pursuing smart bombs and solid walker collisions.
- Two minutes of survival awards twenty seconds of invulnerability, accompanied by special music. Original two-player play alternates turns.
- Illustrations use block silhouettes, a salmon sky, blue mountain bands, a cyan battlefield, colored damage states, and a compact yellow radar strip.

## Translation into this game

These are design choices and interpretations, rather than claims about the original: the demo turns endless defense into an evacuation with three authored waves; simultaneous cooperative play replaces alternating turns; boost and a chargeable defensive ability add immediate choices. Flashing weak points, repairs, radar pressure, towering quadrupeds, and free patrol preserve the source's tactical identity. Cold faceted mountains, orange accents, three-band cel shading, and ink contours reinterpret the simple color bands in 3D. Small agile aircraft and ponderous walker gait communicate the original size contrast.

The soundtrack is an original procedural sci-fi composition. Blaster, impact, repair, and radio sounds are synthesized. Gibberish radio voices are a new expressive layer. The original manual confirms special music during the Force effect, but an exact timbral analysis of the original recording was not performed: **unknown**.

## Implementation references

- [Three.js Shading Language specification](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language): node expressions for quantized lighting and gradient sky.
- [Three.js documentation](https://threejs.org/docs/): `MeshBasicNodeMaterial`, `AnimationMixer`, keyframe tracks, procedural geometry, and WebGPU renderer.
- [AI Hub multiplayer contract](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub): source for bridge and multiplayer behavior; integration details live in the network module and its source copy.

No source audio, artwork, textures, character models, or animation data are copied into the game.
