# Dodge Alley

A complete arcade maze racer inspired by Dodge 'Em (1980). Three increasingly busy shifts, four looping lanes, token streaks, narrow crossovers, turbo, braking, power-cell shields, close-shave bonuses, and three shared bumpers. Procedural ink-shaded city, native Three.js keyframe animation, Rapier sensors and crash debris, and entirely synthesized music, effects, engines and gibberish voices.

Open the HTML file in the parent directory directly in a recent browser. The rendering and physics libraries are embedded; no server or download is needed for solo or couch play. WebGPU is preferred, with a WebGL 2 fallback. Internet rooms use public PeerJS signalling and WebRTC; local browser tabs can also communicate over BroadcastChannel when served from the same origin.

## Controls

- Left stick / D-pad left, A or Left: queue an inward turn at the next crossover.
- Right stick direction / D-pad right, D or Right: queue an outward turn.
- Cross, R2 or Space: hold to boost.
- L2, S or Down: brake.
- Options or Esc: pause. In AI Hub, Create + Options stays reserved for the hub.
- Mouse: click a lane to queue a turn, hold the right button to boost.
- Touch: swipe left/right anywhere to queue a turn; hold the right side to boost. Collision-aware auto-braking assists touch play.

Couch crew shares four bumpers and all tokens. Driver 1 uses A/D, Space and S; driver 2 uses Left/Right, Enter and Down. Two standard-mapped controllers are supported. Controller prompts can switch between PlayStation and Xbox in Settings.

The title automatically enters a looping, invincible AI demonstration after 10 seconds without input. Any input returns to the title.

## Multiplayer

Play Together → Night Rivals hosts or joins a four-digit room. A host needs a second driver to start. Every driver has the same track and 150 seconds to score; friends appear as non-colliding ghosts. Room codes can be entered entirely with a controller. Public signalling availability and device networks affect cross-device WebRTC connectivity.

AI Hub uses Session Protocol v1 in ghost mode for 1–4 seats. The unmodified 1.4.0 client is the first script in the head. Rounds connect and ready automatically, follow the hub clock, report scores, exchange position ghosts, handle departures and time-up, and stop input and sound on end. There are no standalone network connections during hub sessions.

## Developer garage

Pause → Developer Garage. Live sliders change cruise speed, rival speed, turbo multiplier, recharge rate, and usable crossover window. Invincibility and autopilot, repair/refill, clear shift, load next shift, and reset defaults are included. Developer tools and restarts are disabled in network races.

## Build and verification

From this directory:

```
npm run build
npm --silent test
```

Tests rebuild automatically before checking the deliverable. Build requires the installed Bun and Node, with the pinned dependencies in package.json. It writes the single HTML to the parent directory, a matching development index.html here, and exit-interview.json beside the final HTML. All application dependencies are embedded in the final file.

The one-command test runner prints failures and a single count. Its full regression suite contains 58 checks. It uses the installed Python Playwright environment and existing browser binaries; it does not download browsers or choose a fixed port. Browser tests serve only this directory on an OS-selected loopback port for multiplayer and the official Hub harness. Unit tests simulate complete runs and test actual Rapier contacts. Screenshots are retained in tests for visual review.

Implementation files: core.js (simulation), view.js (WebGPU city and animation), audio.js (synthesis), net.js (standalone rooms), main.js (UI, input and Hub adapter), shell.html (screens/styles), and credits.json (in-game About and machine-readable exit interview).

The game title was selected from 50 silent candidates with node:crypto.randomInt. The selection record is title-selection.json. No internet research was performed; only the requested Hub contract/client/harness and dependency packages were downloaded.
