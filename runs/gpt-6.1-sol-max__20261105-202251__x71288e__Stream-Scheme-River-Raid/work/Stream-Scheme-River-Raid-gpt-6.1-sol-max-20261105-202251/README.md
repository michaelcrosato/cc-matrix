# Stream Scheme

Open `../Stream-Scheme-River-Raid-gpt-6.1-sol-max-20261105-202251.html` in a modern browser. It works from `file://`; an internet connection loads the pinned Three.js r180 and Rapier 0.19.3 modules from jsDelivr. The game requests WebGPU first and uses Three.js's WebGL2 compatibility backend when needed. `?webgl` explicitly selects that backend.

Fly through three river sectors, refuel by overflying yellow docks, breach two bridge checkpoints, and sink the Tax Collector. A complete sortie is about three minutes. Destroying fuel docks awards points but removes their fuel. Slowing down over a dock lets you collect more. Your gun automatically holds fire while refueling.

| Action | Keyboard / mouse | Standard controller |
|---|---|---|
| Fly / throttle | WASD or arrows | Left stick / D-pad |
| Fire / aim | Space or click / mouse | Cross or RT / right stick |
| Barrel roll | Left Shift or right-click | Circle or RB |
| River burst | E | Square or LT |
| Pause | Esc or P | Options |
| Menu | Arrows / Enter / Esc, or mouse | Stick / Cross / Circle |

Options includes Xbox glyphs, aim assistance, auto fire, reduced flashes, music and effects levels. Music defaults to 10%. All audio is synthesized in code and starts after input. On touch, drag the left side to steer; aim and fire are assisted. Tap right to roll; double-tap right or tap the contextual BURST action to burst.

Choose **Wing together → Launch couch wing** for up to four gamepads. Two pilots can share a keyboard: P1 WASD / Space / Left Shift / E; P2 arrows / Enter / Right Shift / slash. All pilots share fuel, score and rescue airframes.

For standalone online co-op, choose **Wing together → Direct radio link**. The leader makes an invitation and sends the outgoing code to a wingmate. The wingmate pastes it into the incoming box, makes a reply, and sends their outgoing code back. The leader pastes the reply into the incoming box and accepts it. Once linked, the leader selects **Take flight**. Repeat with a fresh invitation for each additional wingmate, up to four total pilots. This uses WebRTC with a public STUN service and no signaling server; restrictive networks that require a TURN relay cannot connect. Public-internet connectivity is unverified.

AI Hub uses the embedded, unmodified Session Protocol v1 client and shared-world mode for one to four players. It owns invitations, names, the countdown, transport and results. Only the host runs physics; other seats send inputs and receive authoritative snapshots. A host with no player seat is supported.

**Pause → Flight test / dev mode** exposes river speed, steering speed, fuel burn, enemy fire and shot damage as live sliders, plus invincibility, AI pilot, sector selection, supply refill and reset to defaults. Flight-test scores are unranked. Title attract mode begins after ten seconds and loops the AI-piloted full mission; any input returns to the title.

## Development

`npm install` installs the pinned development dependencies. `npm run build` bundles the local modules and embeds the supplied Hub client, CSS and feedback into the root HTML. Engine dependencies remain external. It also writes `../exit-interview.json` and checks its JSON syntax.

Run **`npm run --silent test`** for the complete regression suite. It prints failures and one final count, serves this run only on an OS-assigned loopback port, uses one headless Chromium process, and closes its own server/browser. Dependencies are fulfilled from the exact installed packages for repeatable tests. Reports and screenshots stay in this folder.

Coverage includes WebGPU and WebGL2 startup, file deployment, physics combat and fuel, a full scripted mission, simulated standard gamepad actions, controller menus, keyboard/mouse, developer sliders, audio signal measurement, touch emulation, attract timing, two-page direct WebRTC play and disconnect recovery. The official Hub harness runs two players, four players with latency/jitter/loss, host departure and a host without a player. Screenshots inspect TV, phone and flagship framing. Physical hardware, real mobile browsers, listening quality and public-internet connectivity are unknown.

`PLAN.md` records the design. `issues.json` records defects found by testing. The complete required source information and exit interview appear in About / Credits and `../exit-interview.json`.
