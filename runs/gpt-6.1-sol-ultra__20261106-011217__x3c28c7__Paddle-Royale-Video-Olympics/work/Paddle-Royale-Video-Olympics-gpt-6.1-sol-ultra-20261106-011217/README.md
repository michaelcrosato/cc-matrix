# Paddle Royale

An original Video Olympics (1977) tribute: three paddle-sports courts, charged power returns, directional aim, dash saves, a medal cup, solo AI, local versus, online rooms and AI Hub sessions.

Open the single HTML file in the parent folder in a modern browser. No build or server is needed for solo/local play. CDN dependencies need internet access on first load. WebGPU is preferred; the same Three.js renderer falls back to WebGL2 when unavailable.

- Keyboard: W/S or arrows move; A/D aim; hold Space to charge; Shift dashes; Esc pauses. Menus use arrows and Enter.
- Mouse: move to position/aim, hold left click to charge, right click to dash.
- Controller: left stick moves/aims, Cross/A charges and confirms, R1/RB dashes, Options/Menu pauses, Circle/B returns. Settings switch PlayStation/Xbox symbols.
- Local: two pads, or Coral W/S + Space + Left Shift and Mint arrows + Enter + Right Shift. With one pad, Coral uses it and Mint uses the keyboard.
- Touch: drag an invisible stick to move, automatic power assistance, second finger dashes, contextual POP indicator, menu button.

The Royale Cup visits all three events. Classic Rally has open scoring ends, Bankshot adds two elastic bumpers, Goal Rush has narrow scoring mouths and bouncing back walls. First to five wins a match. Finish all three events for a medal; win all three for gold. The title screen begins an AI exhibition after ten seconds without input. Any input returns to the title.

Pause → Dev mode exposes live ball/paddle speed, paddle reach, opponent skill, charge rate, winning score, AI pilot, physics guides, point awards, rally reset and court advance. Reset defaults restores the normal balance.

For standalone online rooms, host the HTML over localhost or HTTPS and choose Play together. The six-character code connects players through PeerJS's public broker and a direct WebRTC data channel. BroadcastChannel connects same-origin tabs on one device. Direct internet connections depend on network/NAT policy. AI Hub uses the bundled, unmodified Session Protocol v1 client and host-authoritative shared-world snapshots; it supports a player host or a separate server host. The Hub controls round start, time limit, and standings.

All geometry, animation, sound effects, music and gibberish voices are generated in code. No images, fonts, audio files or paid services are needed. Music defaults to 10%.

## Develop and verify

From the parent folder:

```sh
python3 Paddle-Royale-Video-Olympics-gpt-6.1-sol-ultra-20261106-011217/build.py
python3 Paddle-Royale-Video-Olympics-gpt-6.1-sol-ultra-20261106-011217/test.py
```

The second command prints only failures plus one aggregate count. It checks the single HTML and metadata, runs network protocol checks, drives WebGPU in Chromium with emulated controller/touch input, checks physics and every event/cup flow, analyzes offline synthesized audio, plays two browser clients and runs the official AI Hub harness with latency/jitter/loss. It manages and closes its own browser and ephemeral localhost server. It uses the workstation's existing Python Playwright venv and Chromium. Visual fallback screenshots are in this folder because headless WebGPU screenshot capture can be blank even while frames render correctly.

`exit-interview.json` in the parent folder supplies all four in-game About tabs and catalogue fields. Rebuild after modifying it. Usage is intentionally “added on import.”
