# Adding a floor

Edit `T.FLOORS` in `src/content.js`. The current campaign consists of five original 21 × 13 maps at the engine's 16-unit tile scale. Four distinct route arrangements plus a transformed rooftop arrangement are present. All map positions are cell coordinates; simulation positions are smooth coordinates between cell centers.

A floor has an id, name, concise tutorial subtitle, `rows` (`#` solid, `.` walkable), rescue quota, room cells, four outer-edge home cells, two safe spawn cells, a central supply cell, enemy starts and starting age, wall/floor/carpet/trim/accent colors, wall treatment, props and a staging identity. Native TileMap collision and `E.Grid.from(map)` derive from these same rows. Avoid one-way cul-de-sacs at rescue rooms. Place large scenery on solid blocks or outside the maze.

`quota` specifies babies. Other rooms are beetle decoys. A named seeded room-deck stream deals outcomes once per floor, preserving the first room as a baby. Reveals, deaths, pickups, reconnecting snapshots and movement never reroll this deck. Markers need not all be opened. Homes are selected deterministically by farthest reachable unreserved distance, with stable id ties; two simultaneous passengers receive distinct slots. No slot means a rejected pickup, not a lost baby.

Enemy age presets: 0 is a blue wanderer; 18 is yellow line-of-sight behavior; 42 is red corner-routing behavior. Age 38 in the glasshouse foreshadows red pursuit. Tier speeds are 1.8 / 2.1 / 2.4 cells per second, defined in immutable T.ENEMY_SPEEDS and multiplied by the live speed slider. Every beetle has its own named RNG stream. See `T.DEFAULTS` and `T.SLIDERS` for live balance ranges. Defaults are immutable; edited runs become practice. Red age must remain at least three seconds after yellow age.

Run `npm run --silent verify -- rules` to validate connected floor cells, sizes, legal objective/spawn cells, overlaps, quota feasibility and at least two homes reachable from every room. Run the full `npm run --silent verify` after changing rules or the campaign. Rebuild with `npm run --silent build` after any source or metadata change. To expand beyond five floors, also change the campaign termination/index count in Run and the title/HUD/catalogue quota text; the current product intentionally ends on its fifth floor.

# Rules and ordering

The fixed engine loop feeds cardinal intentions, optional graph destinations, edge-triggered bomb sequences and transition confirmations into `Run.step`. Simulation owns discovery, reservations, team score, lives, stock and all terminal outcomes. Presentation and audio consume identified events and cannot award points or change objectives.

Each playing tick resolves recharge and timers, seat movement, bomb requests in stable seat order, enemy movement, localized bomb triggers, swept damage contacts, seat reveals/deliveries, then a single floor/terminal commit. A triggered bomb makes an enemy harmless before damage; a final-life hit precedes a possible final delivery. Terminal encounter resolution freezes. Players never collide with each other.

Bomb trigger contact radius: 0.48 cells; stun area: Euclidean radius 1.65 cells. Player/enemy swept contact radius: 0.53 cells. A hit drops a passenger to its revealed origin and frees its home, clears the team bomb slot, then retracts the turtle before a safe respawn. Three team lives means exactly three damaging hits. Team grace and invulnerability prevent a pile-up from consuming the whole run. A spawn too close to a threat is deferred until safe. Delivered guests never return.

Discovery: 100 once per baby. Delivery: 400. First stun of each beetle per floor: 50, never farmable. Floor clear: 250. Supply gives two units up to five, recharges after six seconds and requires a fresh entry. Being at full stock never consumes a ready supply.

# Controls and online boundary

Solo uses WASD/arrows, Space, mouse click routes/right click bombs, or a standard pad. Shared keyboard is WASD/Space and arrows/Right Shift; mixed and two-pad assignments are explicit. Native Shell owns menu focus, rebinding, sliders, full screen and device recovery. Touch uses the native hidden drag stick and a contextual POP button, with optional imminent-contact assistance and separate records.

Hub protocol 1/client 1.4.0 is embedded unchanged. Application protocol v1 identifies run, floor, tick, snapshot/input sequence, entity ids and event ids. Only the host simulates. Authenticated senders submit cardinal intentions; clients cannot award rescues, scores or positions. Snapshots run at roughly 10 Hz and input changes/heartbeats remain below 20 messages per second. Guests replay at most 200 ms of local input against the same graph, cap prediction displacement and interpolate the remote turtle. Bombs, hits, reveals and score always await host acceptance.

Production sessions expose a read-only inspector. An explicit `dev=1` query permits authoritative tools only on the host; dedicated hosts need no UI. Standalone pauses the shared world; Hub overlays suppress only local intentions. A departed seat returns its passenger and reservations, leaving a completable floor. Host loss follows Hub's void lifecycle; no migration or independent remote lobby is provided.
