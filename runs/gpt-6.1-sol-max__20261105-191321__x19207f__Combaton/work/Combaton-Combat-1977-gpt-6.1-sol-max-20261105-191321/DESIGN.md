# Combaton

An original arcade vehicle duel inspired by Atari's Combat (1977).

Five exercises teach guided shells, bank shots, cloaking, biplane cloud cover,
and jet formations. One hit scores one point; vehicles return to the field.
Win the most rounds. Each exercise ends at five points or the clock. All five
are playable immediately in versus and the practice range.

The visual language is a printed 1970s field manual: warm paper, orange,
sunflower yellow, sage, hard ink contours, cel shading, diagram annotations,
and physical toy-like scenery. Top-down orthographic tanks/jets; side-view
orthographic biplanes. All meshes, textures, animations, music, voices and
effects are created in code.

Controller: left stick move/steer, right stick aim, R2 fire/guide, L1 or Cross
trick, Options pause. Keyboard: WASD, mouse, left click, Space, Esc. Local P2:
arrows, IJKL aim, Enter fire, Right Shift trick. Touch: invisible left stick,
right-side aim/fire, assisted targeting and context trick button.

Online: AI Hub Session Protocol v1 shared world; two seats, host-authoritative
Rapier world, input packets and snapshots. Standalone: same-screen play and
manual WebRTC invite/reply signalling. No signalling server account required.

Native Three.js AnimationMixer clips underlie recoil, idle suspension,
propellers, barrel rolls and jet afterburners. Rapier handles vehicle contacts,
compound formation hulls, shell scene queries and debris.

Deliverable is a single HTML built by `node tools/build.mjs`, with pinned CDN
engine dependencies. The unmodified AI Hub session client is embedded first.
`./test` runs the browser, simulation, audio, controller, touch and Hub checks.
