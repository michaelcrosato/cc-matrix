# Architecture and decisions

The engine owns fixed120Hz timing, view projection, pixel renderer, textured TileMap, depth queues, native Humanoid/Blob/shape shading, input abstraction, pad assignment, menu/settings/rebinding/fullscreen, Fog presentation and Web Audio mixer/synth. No engine behavior was patched. The adventure kit lifecycle and roguelike grid/fog pipeline are the integration reference; all starter gameplay was replaced.

Game-owned pure Sim separates state/commands from graphics/audio/input/storage. All authored coordinates are tiles; Geometry.compile alone maps them to16-world-unit tiles. Shared compiled floor produces renderer walls, movement/LOS, acoustic BFS, navigation and arrow collision edges. Swept earliest-contact arrows consume remaining step after reflection, bound contacts and retain unique identity through recovery. Actor/body movement uses radius-aware game collision because restart/network snapshots remain pure data. No draw modifies authoritative state.

Campaign has29 chambers across four delves (summit has two separate restart wings), nine map landmarks and optional loops/caches. Original names, rigs, guardian tells and music accompany tutorial triggers. Shared quiver and tools support solo and two-player play. Safe restart snapshot is separate from resume state; reserve spending survives atomic restore. Checksum/version/schema saves use pending and committed keys, then memory fallback.

Controls route expected keyboard/mouse actions and standard pad mappings through engine inputs. Contextual touch adds invisible owned thumb zones, intentional-tap arrows, drag aim and hold focus. UI uses engine Shell for all menus, controls and live sliders; pairing textarea is the clipboard fallback. Developer changes mark assistance and are not written to ordinary campaign saves.

Offline/local use the same in-process authority. Direct WebRTC and Hub use Network with sequenced held state, acknowledged action IDs, bounded traffic and compressed atomic snapshots. Dedicated Hub server has no local seat; real roster heroes exist only for actual participants. Host owns save; guest and Hub do not touch solo campaign. Local multiplayer menu remains live and clears held actions. Hub starts only at nonnegative common time and owns finish/end flow.

Attract begins after10s of real-input idleness. A separate no-save Sim and cheating staged director demonstrate the actual bow, sound cues, bank target, tool routes and guardians. Input dismisses and is consumed. Attract never connects or writes campaign progress.

Build script inlines unmodified session client, full engine, source modules, content, styles and interview data in one HTML. No asset files, font/CDN, audio files, local modules or runtime development server are required. Native audio is code-generated only; music default10% is applied at one bus.

See contracts.md, authoring.md, animation.md, audio.md and network.md for module details. Rendering performance is deliberately outside this task's acceptance scope.
