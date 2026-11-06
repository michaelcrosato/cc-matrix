# Freedom Moonriders

Open the single HTML file in the parent directory. It includes the full engine, unchanged Hub client, original art and all synthesized audio; it needs no adjacent files or network connection in standalone play.

- Operation: a playable rescue opening, the open reach, prison orbit and a three-phase prison carrier followed by a playable hyperspace extraction.
- Evasion: three minutes of approaching minefields, rescues and interceptor passes with the cannon offline. Missed opportunities are recorded when a sector or extraction closes.
- One standard controller is a complete solo setup. Two pads, or keyboard/mouse plus one pad, share one ship. With one pad and keyboard/mouse, select Couch co-op → Join controller. A free second pad can press Options to join directly.
- Pilot: steer and fire. Navigator: aim, fire and hyperspace. The navigator's left stick previews the drive without moving the ship; a fresh L2 press commits the vector. Either seat fires the same cannon.
- Keyboard: WASD or arrows fly, mouse aims, click or Space fires, Shift commits hyperspace, Escape opens the console. Rebind through native Controls. Controller prompts default to PlayStation; Xbox is available in Controls.
- Touch: invisible floating left stick; right drag aims and a quick right tap commits hyperspace. Assisted auto-fire avoids crystals. A temporary hyperspace button appears near a right contact. The corner menu is always available.

Break confinement crystals by contact. Lasers damage them: the first crack is a warning, the third hit loses the captive. Destroying a mine-layer dissolves its linked field. Hyperspace is a physical burst and gives no immunity. Rescue contacts take precedence over shots; a simultaneous lethal hull hit takes precedence over carrier-core destruction. Extraction victory is latched.

Checkpoints restore full hull/energy and the sector's score/rescue baseline. Required lost crystals get reachable replacements; each deployment lowers rank. Debug and attract runs never overwrite ordinary saves or records. Settings, per-mode best scores and one versioned resumable operation checkpoint are kept where storage is available.

Pause → Developer tools exposes validated live flight/combat balance, authored reset, scenario selection, seed restart, invulnerability, refill, controlled spawns, ownership/collision overlay and a fixed-step button. Hub participants have read-only diagnostics.

AI Hub supplies the remote session's roster, transport, introduction and round lifecycle. It runs the same operation with one authority and one shared ship. There is no standalone Internet signaling service or pretend room code.

## Build and verification

```sh
node tools/build.mjs
node tools/test.mjs
```

No package installation is needed. Verification uses Node and the workstation's installed Python Playwright at `/home/micha/.local/share/pipx/venvs/playwright/bin/python`. The test command prints failures and one count line. A completed co-op proof is reused only when its game, engine, client and test sources are unchanged; `node tools/test.mjs --full` forces another complete network run. Evidence is kept in `artifacts/`. Browser harness servers bind loopback on an OS-assigned port and close only their own server.

`project.json` owns output names. `src/report.json` is the canonical reporting object used by both the in-game About pages and the root `exit-interview.json`.

See `docs/research.md`, `docs/decisions.md`, `docs/requirements.md` and `docs/issues.md` for provenance, lifecycle contracts and verification coverage. Engine and Hub source licenses remain in `vendor/` and their original banners are preserved in the bundled HTML.
