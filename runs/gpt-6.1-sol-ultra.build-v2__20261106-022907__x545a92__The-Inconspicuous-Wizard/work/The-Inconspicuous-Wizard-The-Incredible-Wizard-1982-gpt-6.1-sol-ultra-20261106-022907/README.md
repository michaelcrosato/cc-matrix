# The Inconspicuous Wizard

An original six-chamber arcade maze shooter inspired by The Incredible Wizard(1982). Open the root distributable HTML directly in a browser. No server or runtime downloads are needed for solo/couch play. For online1–2-player co-op, import that same file into an AI Hub shared-world session.

Move with WASD/left stick, aim with mouse/arrows/right stick, fire with left click/Space/R2/Cross, and pause with Escape/Options. Hold fire to shoot as soon as your sole bolt returns. Read the radar before rounding corners. Shoot bell posts to reveal and lure hidden hunters. In two-keyboard mode, seat1 uses WASD, Space and IJKL aim; seat2 uses arrows, rightShift and numpad8/4/5/6 aim.

`npm run build` bundles all scripts/assets/styles and the official byte-unmodified Hub client. `node tools/build.mjs --release` writes the exact required root HTML and exit interview. `npm test` is the one verification command; normal output contains only failures and one count line. It uses the installed Python Playwright environment without installing browsers. Its Hub tests open an OS-selected loopback port and close their own server.

The native ARCADE kit supplied the fixed-step scene/shell/maze patterns; simultaneous play uses a game-owned simulation. Engine0.89.1 is pinned, full/readable and unchanged in `vendor/my-3d2dge.js`. Game scripts extend its asset/rig/weapon APIs. The official Hub client1.4.0 is preserved verbatim. Source research and asset provenance live in `evidence/`.

Content is authored in `content/rooms.js`: wall rectangles, explicitly opened cells, posts, entrance/portal pairs, finite spawn obligations, familiar routes, Wizard manifestation count and palette. All walkable floor cells and scheduled spawns must connect to an entrance. A spawn’s `after` kill count is an obligation; clearing an empty screen does not advance while any obligation remains. Add a room by declaring the geometry/encounter data and updating the six-room campaign limit; no actor AI or rendering changes are needed for another room of the same type.

`src/sim.js` owns all damage, collision, visibility, scores, lives, seeded RNG and progression. Cell centers are integers; world units are `(cell+.5)*16`. Inputs are `{move,aim,fire}` with0right,1down,2left,3up,-1neutral. `save()` includes the complete room-entry checkpoint, and `snapshot()` is a serializable current world. Presentation never decides gameplay. `window.__wizard` exposes a read-only snapshot plus explicit test/developer hooks.

Developer is in the native pause menu. Live balance rows affect living actors; world mutation marks Practice. Reset restores tuning, invulnerability, debug drawing and simulation speed. Practice/attract/online states are excluded from normal campaign saves and ranked records. Settings/checkpoints/records use versioned storage and survive blocked/corrupt storage with playable defaults.

The evidence distinguishes automated play from human testing. A perfect informed command bot finishes Normal in about4minutes; the requested10–15minute first-human-run target is unverified. No physical pad/touch/TV/iOS or human audio listening was available. Device emulation, actual sample rendering, screenshots and two-page online checks provide the documented stand-ins.
