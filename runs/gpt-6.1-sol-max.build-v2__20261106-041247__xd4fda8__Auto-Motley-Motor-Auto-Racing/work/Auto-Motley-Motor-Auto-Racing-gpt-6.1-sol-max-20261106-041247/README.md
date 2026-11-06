# Auto Motley Motor

Open the named HTML in the parent folder directly in a browser. Solo and couch play work without a server, assets, account or network request. Start Road Tour is the recommended first outing; every road, motor and mode is available immediately through Quick Play.

- Steer: A/D or arrows; brake: S/Down/Space; hold R to recover; Enter confirms and Escape pauses. Automatic acceleration is the default. Manual throttle and screen-direction steering are in Settings.
- Controller: left stick steers, L2 brakes, R2 is manual throttle, hold Triangle to recover, Cross confirms, Circle goes back and Options opens the pit menu. PlayStation symbols default; Xbox symbols are available.
- Touch: drag in the left zone to steer, hold the right zone to brake. Both touches work together. The contextual recovery action appears when needed.
- Couch: choose shared keyboard, pad plus keyboard, or two pads. The seat screen shows both drivers’ controls before starting.
- Online: import the HTML into AI Hub, or choose Multiplayer → Direct connection and exchange the complete invitation and reply. Both drivers ready before the host starts. No microphone or camera is used. Internet NAT/TURN coverage is unconfirmed.

Time trial offers two laps or the classic five. Pursuit scores +2 for the opponent’s crash and +1 for twelve clean car lengths; sprint is first to 10 with a three-minute cap, classic is 50 without a cap. Free drive connects all five circuits and the hidden timed airfield straight. The tour has eleven stops and an ending.

Pause → Dev mode opens live tuning, AI driving, gate/collision overlays, free camera, invulnerability, gate restart and tour tools. Using balance tools marks records unranked. Online diagnostics are read-only. After ten idle seconds, the standalone menus show an AI demo; any meaningful input returns to the same menu and is consumed.

Build: node tools/build.mjs

Verify: node tools/test.mjs all

The test command prints failures and one count. It uses installed Python Playwright and starts any required server only on 127.0.0.1 with an OS-assigned port; it closes its own browsers and servers. Narrow filters are available for changed subsystems. See docs/architecture.md, docs/authoring.md, docs/research.md and docs/issues.md. Screenshots, playthrough records and official conformance reports are in docs/evidence.

The root exit-interview.json is embedded into the in-game paged About/Credits on every build. Upstream notices and the full engine MIT license are retained. The game, county, vehicles, score and procedural art are original; Auto Racing is credited as inspiration.
