# Flip Bros

Open the release HTML in the parent folder. Its pinned Three.js, Rapier, and optional PeerJS dependencies load from jsDelivr, so the first launch needs internet access. The game works directly from `file://` and on a static HTTP host. No build step or game server is required to play.

An original, fixed-screen arcade action platformer inspired by **Mario Bros. (1983)**. Clear four shifts, collect the Payday bonus, and defeat King Clog. A shared score and life pool support solo play, couch co-op, standalone online rooms, and AI Hub sessions.

## Controls

- Standard gamepad: left stick / D-pad to move, Cross / A to jump, Square / X to dash, Triangle / Y to ring the bell, Options to pause. A second, third, or fourth pad can press Options to join couch play. Settings offers PlayStation and Xbox prompts.
- Keyboard: A/D or arrows, Space/W/Up to jump, X/left Shift to dash, E to ring the bell, Esc/P to pause. Couch P2 uses arrows, Up, slash, and Enter/right Shift.
- Touch: drag on the left to move, tap the right to jump, double-tap to dash. A contextual Bell button and automatic defensive bell assistance help on phones. Menu panels support ordinary touch scrolling.
- Controller menus: D-pad / stick, Cross to confirm, Circle to return. Room codes have a six-letter controller editor. D-pad / stick scrolls the handbook and credits.

Jump into a platform from below to flip a pest. Jump through a gap to reach its platform; touching the flipped pest kicks it out. Hard hats need two bumps. Flipped pests recover, and bumping one again turns it upright. The bell flips active pests across the whole stage, with three charges per shift. Chained kicks within four seconds build an eight-step combo. Side exits wrap; pests that reach a drain return through a top pipe a little faster.

## Development

Source is divided into `audio.js`, `world.js`, `game.js`, `ui.js`, `network.js`, and `app.js`. `index.template.html` owns the UI shell and CSS. `build.mjs` assembles the single HTML, pastes the unmodified AI Hub session client first in the head, and embeds `../exit-interview.json` in About. `SHIFTS`, `planks`, and `DEFAULTS` hold the main content and balance data. The pause menu's Developer Tools offers live balance sliders, invincibility, autoplay, spawning, refills, round selection, and reset.

Run `node build.mjs` from this folder to rebuild. `index.html` is a development copy of the identical release. `title-draw.json` records the cryptographically random choice from 50 title candidates.

## Verification

Run **`./test.sh`**. It builds the release, starts its own quiet HTTP server on an OS-selected loopback port, opens one Chromium browser, and closes all resources it creates. It prints failures and one final count. Test details are saved in `test-report.json`. The command uses the workstation's installed Python Playwright environment and local copies of pinned CDN packages in `node_modules`. Restore them with `npm ci --ignore-scripts` if necessary; do not install browsers.

The suite checks real Rapier head bumps, jumping through gaps, kicks, armor, recovery, bell limits, damage, dashing, pipe recycling, ice, sparks, combo scoring, boss hits, a complete solo autoplay run, and a complete two-bot attract replay. It also checks input-driven menus, controller code entry, native WebGPU pixel readback, deliberate device-loss recovery to WebGL2, procedural audio via OfflineAudioContext, emulated phone multitouch, file protocol launch, standalone room lifecycle, real PeerJS/WebRTC across isolated contexts, and the AI Hub harness in four scenarios. No physical controller, phone, TV, or audio listener was available.

Chromium's working software WebGPU flags here are `--enable-unsafe-webgpu --use-angle=vulkan --use-vulkan=swiftshader --enable-features=Vulkan --disable-vulkan-surface --disable-gpu-watchdog`. The originally supplied adapter flag combination destroyed the GPU device even in a one-cube probe. A hardware browser should select its normal WebGPU adapter. The game also supports WebGL2 and retries context creation when recovering from live device loss.

The test-only `?test=1` API exposes state and controlled stepping. Ordinary gameplay does not expose those mutation hooks. Optional test sections can be selected with `./test.sh --section core`, `touch`, `rooms`, `webrtc`, `hub`, `gpu`, `file`, or `recovery`.

## Network

AI Hub uses protocol v1, client 1.4.0, shared-world mode, 1–4 seats. The host owns physics; clients send bounded inputs, and the host sends snapshots at 14 Hz. Dedicated servers have no local player. Time-up, departures, team results, and end-of-round sound/input shutdown are handled.

Standalone room codes use PeerJS 1.5.5's public signaling service and direct WebRTC data connections. Same-origin tabs can use BroadcastChannel. The host remains authoritative; its departure closes the room. Public signaling and NAT reachability depend on the users' networks. No external game service is contacted during AI Hub sessions.
