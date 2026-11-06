# Dodge Riot

Four lanes. A full tank of trouble.

Open the single HTML file in the parent folder in a current browser. Three.js r180 and
Rapier 0.19.3 are pinned CDN dependencies; an internet connection is needed to load them.
All models, textures, animation, music, sound effects and gibberish voices are made in code.

- Solo: arrows / A D change one lane at a crossing; Space / W zip; Down / S brake.
- Couch co-op: P1 arrows + Space; P2 A D + W to zip / S to brake. Two standard pads also work.
- Pad: D-pad or left stick steer, R2 / RT zip, L2 / LT brake, Options pause, Cross / A confirm, Circle / B back.
- Touch: drag a left thumb vertically to steer, hold the left side to brake, use ZIP on the right. Steering assist is on by default.
- Pause > Dev Garage: live balance sliders, invulnerability, auto drive, refill, round clear and round select.
- Online: automatic sessions through AI Hub, or invite/reply codes for direct WebRTC co-op.

Clear all fares on all four lanes, across three escalating rounds. Bumpers and score are shared in co-op.
A mint diamond gives five seconds of protection. A ZIP begins with a brief collision shield and requires
at least 12% charge. Release after draining the battery to begin another ZIP.

The title starts an AI demonstration after ten seconds; any input returns to the title.
Source information and the complete exit interview are included in Credits.

Build:

```sh
node Dodge-Riot-Dodge-Em-1980-gpt-6.1-sol-ultra-20261105-212610/build.mjs
```

All regression checks, from the workspace root:

```sh
/home/micha/.local/share/pipx/venvs/playwright/bin/python Dodge-Riot-Dodge-Em-1980-gpt-6.1-sol-ultra-20261105-212610/test_game.py
```

The runner prints failures and a one-line count, starts its own loopback server on an OS-chosen
port and closes its browser/server. It checks actual Rapier simulation, full runs, keyboard,
controller, touch, Web Audio output, file loading, WebGPU draw submission, direct-peer results,
and the official AI Hub harness including dedicated hosts and host departure.
Artifacts and machine-readable results are in `test-artifacts/`.

Headless Chromium on this workstation needs an explicit ANGLE backend in addition to the
provided WebGPU flags. The test runner uses `--use-angle=vulkan`; the raw canary also verified
`--use-angle=swiftshader`. The game uses WebGPU by default, automatically falls back to Three's
WebGL 2 backend when unavailable, and recovers on a fresh WebGL canvas after device loss.
