# Boiler Buddies

Open `../Boiler-Buddies-Mario-Bros-1983-gpt-6.1-sol-ultra-20261105-221150.html` in a current browser. The game, physics, fonts, art, music and effects are inside that one file. No server is needed for solo or local co-op. Standalone online rooms download PeerJS 1.5.5 and use its public signaling service; game data is peer-to-peer. AI Hub sessions use the bundled, unmodified session client instead.

Six complete shifts teach bumping from below, climbing through the gaps, kicking flipped pests, combinations, wraparound, finite pressure pulses, coin collection, hopping pests, ice, roaming embers and the three-cycle Kettle King finale. The unattended title starts an AI showcase after ten seconds.

Use the left stick or A/D/arrows to move, Cross/Space to jump, Square/X to kick, Triangle/Shift to pulse, Circle/Down to drop, and Options/Esc to pause. Keyboard P2 uses F/H, T, R, Y and G. Touch uses a left drag and right taps/swipes, with a contextual POP! action. Settings can change PlayStation prompts to Xbox prompts. Room codes have a controller-operated six-dial picker.

Pause → Workshop opens the developer tools. It includes seven live tuning sliders, reset, run/pause, frame stepping, enemy spawning, invulnerability, lives, pulse refill and phase navigation.

Build: `npm run -s build`.

All verification: `npm run -s test`. The command prints only failures and a final count. It covers physics, full campaign, live controls and menus, audio waveforms, controller stubs, touch, actual two-page game co-op and rematches, real cross-context WebRTC, and the upstream Hub harness under latency/loss and server/host departure scenarios. Test servers bind 127.0.0.1 on OS-picked ports and stop their own processes.

The default renderer is Three.js r180 WebGPU. If the browser loses its GPU device, the game rebuilds its canvas using Three.js's WebGL2 backend and preserves gameplay. Raw WebGPU also failed in this workstation's software Chromium; `render-probe.html?mode=raw` is the independent reproducer. `?capture=webgl` forces the recovery backend for visual diagnostics. Hardware WebGPU, a physical controller, real iOS and listening tests remain unknown.

Research is in `research.md` and `hub-research.md`. The in-game Credits has Source Information, Testing Feedback, Engine Feedback and Prompt Feedback. The same data and catalogue entry are in `../exit-interview.json`. Third-party licenses are embedded in the HTML and retained in `THIRD-PARTY-NOTICES.txt`.
