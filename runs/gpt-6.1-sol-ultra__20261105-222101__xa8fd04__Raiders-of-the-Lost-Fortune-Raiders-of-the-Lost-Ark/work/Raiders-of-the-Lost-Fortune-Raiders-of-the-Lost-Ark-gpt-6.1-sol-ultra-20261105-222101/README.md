# Raiders of the Lost Fortune

Open the single HTML in the parent directory in a current browser. Runtime libraries and fonts load from public CDNs, so an internet connection is needed on first load. WebGPU is preferred; Three.js provides its native WebGL fallback when necessary.

The expedition includes courtyard whip combat, three hidden relic caches, timed spike traps, a leap and whip grapple, the three-sign puzzle, relic recovery, and a boulder escape. The title starts an AI-played looping expedition after ten seconds of inactivity. Any input returns to the title.

Keyboard: WASD move, mouse aim, LMB whip, Space leap/grapple, Ctrl or C roll, E interact, Shift sprint, Escape pause. A standard controller uses left stick, right stick, Square, Cross, Circle, Triangle, L3 and Options respectively. Settings can display Xbox glyphs. Touch uses an invisible left stick, automatic whipping, two-finger dodge and a contextual action button.

Bring an accomplice creates a six-character standalone co-op room. The partner enters the code on the same game. Same-origin tabs connect with BroadcastChannel; other machines use PeerJS WebRTC signaling. AI Hub sessions connect and start automatically through the bundled unmodified session client. Host controls shared retries. Fallen explorers can be revived by a nearby partner.

Pause → Field laboratory exposes live balance sliders, invulnerability, healing, enemy clearing, puzzle solving, checkpoints, escape triggering and reset defaults. Gameplay is authored in main.js; procedural world and native animation clips in scene.js; synthesis in audio.js; networking in online.js.

Build from this directory:

    node build.mjs

Run the complete checks from this directory:

    bash tests/check.sh

The checks print only failures and one count. They use file URLs for the single-player game and self-owned ephemeral localhost servers for co-op and the exact AI Hub harness. All browsers and servers are closed by their owners. WebGPU is tested directly; the engine's WebGL backend is used only for visual review screenshots (`?renderer=webgl`).

The source, feedback and catalogue metadata are in exit-interview.json beside the final HTML and also in the in-game About/Credits screen. Usage is added on import.
