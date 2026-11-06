# Keystone Kapers: Lift, Laugh, Loot

Open the HTML file in the parent directory. The release embeds Three.js, Rapier's
WASM, PeerJS, both fonts, all procedural art, and all sound code. Solo and couch
play need no server or downloads.

Catch Bertie Baggs in three cases at HalFwick's. Carts and radios cost nine seconds;
planes cost a badge. Recover bags and suitcases for 150 points. An arrest pays
100 points per remaining second and restores one badge. The third arrest completes
the shift. The crook can escape through the roof exit after picking its lock.

## Controls

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Run | A / D or left / right | Left stick or D-pad |
| Leap | Space | Cross / A |
| Duck; leave open lift | S or down | Circle / B or down |
| Enter open lift | W, up, or E | Up or Triangle / Y |
| Whistle | F | Square / X |
| Hold full mall view | Tab | L1 / LB |
| Pause | Esc or P | Options / Menu |

Keyboard partner: J / L run, I leap, K duck, U lift, O whistle. A second pad
controls the second officer in couch co-op. The camera shows the whole mall.

Touch uses an invisible left thumbstick; tap the right side to leap and swipe
down to duck. Touch assistance times nearby leaps and ducks. A contextual action
appears at the lift and when a whistle can stop the crook.

The lift runs automatically between the ground, first and second floors. Wait for
open doors before entering or leaving. Escalators only go up. The roof has no
lift. Hold Mall View and use the security feed to plan a route.

## Multiplayer

Partner Up opens couch co-op or a five-digit room. Internet rooms use the bundled
PeerJS client and its public signalling service, then WebRTC data channels.
Same-origin browser tabs connect through BroadcastChannel. The host runs the
shared physics world; clients send input and receive authoritative snapshots.
There is no chat or voice chat.

AI Hub sessions use the unmodified v1.4.0 session client, shared-world mode, and
one to four seats. All session traffic travels through AIHub.send. A dedicated
host without a player is supported. Hub rounds start and end on Hub events.
Outside Hub sessions, the host starts cases and advances between them.

## Workshop

Pause → Workshop opens the dev tools: seven live balance sliders, invincibility,
frozen timer, Rapier collider visualization, full mall view, quick travel to every
floor, arrest/restart/refill actions, and a spawner for each hazard. Reset Defaults
restores the shipped balance. In network games the host controls the world.

Ten seconds idle at the title screen starts a looping AI demonstration. Any input
returns to the title. Settings include PlayStation/Xbox glyphs, music and effects
levels, touch assistance, reduced motion, mute and fullscreen.

## Development and verification

With the pinned dependencies installed, build with **npm run build**. All source
files stay in this directory; the bundled release is written one directory up.
The build script uses the installed Bun bundler.

Run **npm test** for all release checks. It prints only failures and a final
count, and writes test-results.json plus the four Hub conformance reports.
The tests own their ephemeral 127.0.0.1 HTTP server and close it automatically.
They cover a full three-case playthrough with ordinary rules, Rapier mechanics,
menus and dev controls, a synthetic standard gamepad, phone touch input, offline
audio signal generation, standalone co-op, and Hub's four network scenarios.

Headless WebGPU can omit its canvas in screenshots. Game-state, draw-call and GPU
validation checks cover WebGPU. The query **?renderer=webgl** selects the engine's
compatibility backend for visual inspection. Game rules and content are shared.
Screenshots are solely for composition and readability checks.

Research and implementation choices are recorded in RESEARCH.md. The title draw
uses node:crypto.randomInt over 50 candidates, recorded in title-draw.json.
Credits, feedback and catalogue data are embedded from ../exit-interview.json.
