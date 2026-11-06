# ComBop verification plan

Run the browser checks through one command. The runner prints failure details and one final count, saves its structured results in this project folder, binds any required HTTP server to `127.0.0.1` on an OS-selected port, and closes only its own browsers and server.

From this folder:

```bash
./run-tests.py
```

Use `--only 'check name fragment'` for a targeted rerun after changing the code that check covers. Use `--hub-only` or `--skip-hub` to select the integration or standalone group. The runner's shebang uses this workstation's installed Playwright Python environment; browsers are already installed.

## Automated checks

- Load the packaged root HTML through `file://` and HTTP; verify the canvas, title, engine readiness, WebGPU renderer, Rapier world, valid finite state, and no uncaught exceptions.
- Start the solo circuit from the real menu. Move, aim, shoot, bank a shot, dash, take damage, respawn, collect a pickup, finish each arena, and reach the final results. Advance long timers or assign test positions through the developer interface, but execute damage and scoring through the actual gameplay systems.
- Verify the three arena variants expose their intended mechanics and that the final map is reached. Retry a lost match and replay after the final results.
- Pause during live combat; compare physics state and match timers before and after the pause. Resume, open settings, adjust music and glyph preference, return to play, and quit to title.
- Open developer mode from pause, alter every live balance setting, verify settings affect game state, reset defaults, restart the current arena, and use quick win/lose tools. Verify developer tools cannot break an AI Hub session.
- Inspect About/Credits for all required Source Information fields and all feedback questions. Parse `exit-interview.json` and verify its exact top-level shape and catalogue fields.
- Leave the title untouched for ten seconds: require an AI-played attract match, observable motion/fire, cycling arenas, and any-input return to title. Ensure the dismissing action does not also start a match or leave a key stuck.
- Supply a standard Gamepad API stub: use d-pad/sticks for menu focus, Cross/A for selection, Options for pause, both sticks for movement/aim, triggers for fire and dash. Check the selected PlayStation/Xbox glyph set, keyboard/mouse prompt switching, dead zones, and held-button repeat suppression.
- Start local versus and independently move/fire both players using keyboard controls and a second gamepad. Verify score attribution, winner/results, and rematch.
- In an emulated touch context, use two concurrent touch contacts for invisible move/aim sticks, verify assisted shooting/aiming, open the touch pause menu, and dismiss any visible contextual action.
- Check synthesized sound structurally through Web Audio: default music gain is 0.10, audio unlock occurs on a gesture, sound effects produce nonzero energy, mute silences output, and paused/ended sessions stop ongoing sound as designed.
- Run the supplied AI Hub automatic harness for shared-world traffic, time-up, player departure, host departure, no-player server host, and impaired transport. Require `window.__hubCheck.pass` and no protocol errors. Run standalone multiplayer with two pages and verify host snapshots and guest inputs affect the same tank state.

## Screenshot-only checks

- Inspect one 1920×1080 title image and one active arena image for the ten-foot hierarchy, visible tanks/projectiles, ink style, title composition, text overlap, score readability, and restrained prompt density.
- Inspect one narrow touch layout for clipping and reachable menu controls. A blank headless WebGPU canvas is not evidence of a rendering failure; use render/scene state in that case and clearly record the visual limitation.

## Edge cases to watch

- A key that exits attract mode must not immediately launch solo or remain held in the next match.
- The first manual input must unlock audio without consuming movement/fire for an entire round.
- Shots that overlap their owner at spawn must not destroy the firing tank; banked self-hits must follow the documented rule.
- Dash cannot cross solid walls, spawn outside the arena, or collect the same pickup twice.
- Respawning tanks need a safe entry interval; the other tank cannot farm a respawn point indefinitely.
- A paused local game freezes gameplay; a paused online client must keep network synchronization running without holding the authoritative world.
- Late or duplicate snapshots cannot reduce a score, revive an ended match, or leave a guest in a menu while the host plays.
- Hosting with no local player still simulates every occupied seat and sends world state.
- Network packets stay below protocol size/rate limits; disconnect callbacks clear stuck remote inputs.
- `Options` while `Create` is held belongs to the Hub; the game must ignore it.
- Menus remain navigable after mouse hover, controller reconnection, touch input, resize, and visibility changes.
- Circuit advancement resets transient projectiles, pickups, cloak, dash, shields, and stale input consistently.

## Results bookkeeping

Count distinct defects found, not failed assertions or reruns. Record which are game breaking, how each was fixed, the most useful test, and the least useful test. Keep failures honest: no physical pad, real phone, real television, second human, or human listening is available here.
