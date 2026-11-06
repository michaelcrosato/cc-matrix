RAIDERS OF THE GOLDEN GOOSE
Fortune favours the slightly reckless.

The distributable is the named .html in the parent workspace. Open it in a
current Chromium-family browser, or serve it from localhost. The game prefers
WebGPU and uses Three.js's WebGL2 compatibility backend when needed. Internet
access is required for the pinned Three.js r180 and Rapier 0.19.3 CDN modules.
No art, font, music, sound or voice asset downloads are used.

PLAY
Left stick / WASD       Move
Right stick / mouse    Aim
Square / left click    Whip
R2 / right click       Shoot
Cross / Space          Jump
Circle / Ctrl (or C)   Roll
Triangle / E           Interact, grapple, turn a lens, exchange the idol, revive
L2 / Shift             Sprint
Options / Escape       Pause
J                      Field journal (keyboard)

Couch co-op starts with two explorers. Player two may use arrows, Enter to
jump, Right Shift to roll, / to whip, . to shoot, ' to interact, and 0 to sprint.
Standard gamepads control matching seats. Additional pads join with Cross,
up to four explorers. Xbox prompts are available in Settings.

Touch: drag on the left to move; tap/drag on the right to aim and whip, hold
to fire. Use the contextual action button for grapples, lenses and revives.
Close combat, escape sprinting and gap jumping receive touch assistance.

The pause menu contains the field journal, settings, credits and Developer
toolkit. The toolkit includes live movement, jump, reach, aggression, trap,
boulder and damage sliders; invulnerability, no clip, supplies, scene warps,
a lens solve action and defaults. Checkpoint saves stay on the device.

Online co-op is hosted by AI Hub, using its unmodified Session Protocol v1
client 1.4.0. All networking passes through AI Hub. The game supports 1-4
seats, host authority, unreliable state snapshots, client input, revives,
player departure, team scoring, time-up, and hosts with no local player.
Standalone multiplayer is couch co-op; it does not require a network service.

BUILD
node build.mjs

This joins src/*.js, src/style.css, src/shell.html, src/report.json and the
unmodified session client into one HTML. It also writes exit-interview.json
to the parent workspace. Runtime libraries remain external pinned CDN modules.

TEST -- one command, only failures and a final count
./tests/run.sh

Optional focused suites: ./tests/run.sh --suite core|hub|visual|delivery
The runner starts its own 127.0.0.1 server on an OS-selected port, closes it,
and launches one browser at a time. Browser temp files stay in this folder.
It uses installed Python Playwright 1.63 and exact local copies of the pinned
runtime dependencies for deterministic gameplay checks. The delivery check
loads the exported file directly with the actual CDN dependencies.
JSON reports and visual captures are saved under artifacts/.

Core tests include an ordinary-input, default-balance complete expedition
with all curios and a clean swap; failure/retry, saves, revives, live tuning,
controller and touch emulation, the attract replay, and offline sound render.
The AI Hub tests use the supplied, unmodified harness in two- and four-seat
sessions with latency, jitter and packet loss, host departure and server mode.
Visual captures use the engine's WebGL2 diagnostic backend because headless
WebGPU presentation can return a blank canvas even with correct game state.

Developer instrumentation is available only with ?test=1. It exposes __GG
for fixed-step, ordinary-action play scripts and state snapshots, and disables
automatic simulation advancement so tests control time. Normal play always
uses a 60 Hz fixed simulation. ?webgl=1 selects the compatibility backend.

The supplied source label is Raiders of the Lost Ark (1982); the particular
edition is unknown. No internet research about the source was performed.
