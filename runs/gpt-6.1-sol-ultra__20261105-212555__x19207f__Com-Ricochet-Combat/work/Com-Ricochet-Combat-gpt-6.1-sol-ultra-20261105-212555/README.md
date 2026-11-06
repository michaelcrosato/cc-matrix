# Com-Ricochet

Small tanks. Big bank shots. An original five-field arcade vehicle duel inspired by Combat (Atari, 1977).

Open the single HTML file in the parent folder in a browser with WebGPU. `file://` works; internet is needed for the pinned Three.js r180 and Rapier 0.19.3 CDN dependencies. All game code, CSS, procedural assets, synthesized audio and the unmodified AI Hub client are embedded.

- **Circuit:** five complete rounds: straight shots, bounce-to-arm billiard shots, guided shells, invisible tanks with radar, and wraparound jets with cloud cover. Four hits or 55 seconds per field. Every hit counts toward the final medal.
- **Quick duel:** select any field. Solo AI or couch player 2.
- **Pad:** left stick move, right stick aim, R2 / Cross fire, L2 / Circle burst or radar, Options pause. Standard mapping, PlayStation or Xbox prompts.
- **Keyboard:** WASD move, mouse aim, click / Space fire, Shift burst or radar, Esc pause. Couch player 2 uses arrows, Enter, Right Shift.
- **Touch:** left drag movement, right drag aim, assisted firing, context burst / radar button. Touch cancellation and multitouch supported.
- **Online:** AI Hub protocol v1 shared-world supports 1–4 seats. Outside Hub, Play Together offers 2-player direct/LAN WebRTC codes and same-browser room pairing. Manual links require a direct route; no public broker or relay is used.
- **Developer tools:** Pause → Developer tools. Live vehicle/shell speed, reload, AI accuracy, round length and score limit; invulnerability, autopilot, collision wireframes, field jump and reset.
- **Attract:** the title begins an AI-played loop after ten seconds without input. Any input returns to the title.
- **About:** Credits contains Source Information and all requested feedback. The root exit-interview.json is the same metadata used by the build. Usage is added on import.

Build:

```bash
node Com-Ricochet-Combat-gpt-6.1-sol-ultra-20261105-212555/build.mjs
```

All automated checks (failure details and a single total):

```bash
bash Com-Ricochet-Combat-gpt-6.1-sol-ultra-20261105-212555/test.sh
```

The runner starts its own OS-assigned loopback server, confirms the game, runs game/audio checks, transport tests, two full standalone copies, and the four official Hub scenarios. It closes every browser/server it starts. Reports remain in this directory. Only test URLs with `?test=1` enable test control hooks.

Visual checks use `visual_check.py` under xvfb and GPU readback, because software WebGPU can be absent from normal browser screenshots. Original Atari research references and the manual diagrams are in research.md and research-assets. Exact original sound timbre, physical controller feel, real-device touch and TV viewing are unknown.
