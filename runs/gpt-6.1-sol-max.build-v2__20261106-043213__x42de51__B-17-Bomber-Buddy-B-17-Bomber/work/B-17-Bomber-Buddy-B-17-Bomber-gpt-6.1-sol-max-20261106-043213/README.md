# B-17 Bomber Buddy

Open the root release HTML directly in a browser with WebGL 2 or WebGPU. Everything is embedded; standalone needs no network. A full sortie takes about 10–12 active minutes.

Choose Play, review route/load/difficulty, and launch. E/Q raises/lowers power. WASD flies; course hold flies the committed route until you move the stick. 1 is pilot, 2 selects a threatened gun, 3 is bombsight, 4–7 selects 12/3/6/9 o'clock. Mouse aims; click/Space fires or releases. B opens bomb doors, X chooses salvo size, M selects a route, H toggles hold, F extinguishes one fire, hold J to jettison. Escape pauses. V toggles an exterior look.

Standard controller: left stick flies, right stick aims, R2 fire/release, L2 fine aim, L1/R1 power, hold Triangle for stations, d-pad gun bearing, Square map, Cross confirm/doors, Circle back/salvo, Options pause. The reserved Create+Options chord belongs to AI Hub. Controller symbols and remapping are in Settings/Controls. Touch uses two invisible thumb regions and contextual actions.

Co-op supports keyboard/mouse plus one pad, or two pads, with native horizontal split screen. Take a busy station to request handover; the occupant uses T/Cross to accept. AI Hub supplies remote shared-world 1–2 player play, including a dedicated host without a player. Standalone internet rooms are not implemented or claimed.

`npm run build` writes the single HTML to the workspace root. `npm run verify` is the single quiet verification command for state/audio, browser inputs, Hub, renderer backends and the final package. Test artifacts and actual issue records live in `docs/`. Dependencies are pinned by package-lock.json. `vendor/` contains pinned upstream handoff documentation and notices. `content/operation.js` is the mission definition; the pause menu's Dev Mode can move targets/waypoints and export or import an operation.
