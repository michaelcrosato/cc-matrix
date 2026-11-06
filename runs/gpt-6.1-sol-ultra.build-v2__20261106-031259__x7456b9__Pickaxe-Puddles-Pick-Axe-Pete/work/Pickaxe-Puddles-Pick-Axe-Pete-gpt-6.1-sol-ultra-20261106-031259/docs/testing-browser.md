# Packaged browser verification

Command, from the development folder:

    /home/micha/.local/share/pipx/venvs/playwright/bin/python tests/browser.py

The aggregate tools/verify.mjs command runs this suite with the simulation, protocol, audio and packaging checks. Successful browser output is one count line; failures include the failed behavior and relevant state.

The suite loads the actual root HTML through file:// in Chromium. It waits for the packaged app's ready flag, stops the native RAF loop, then advances the native fixed-step owner. Rendering is exercised on launch and in explicit world-pointer checks. This avoids relying on software-rendered frame timing. One browser is open, with sequential contexts. No browser dependencies or media assets are downloaded.

Final result: 111/111 integrated browser checks passed against the packaged HTML. The focused co-op/controller/mouse subset also passed 33/33 after the final input fixes. No console, page or native game errors were recorded.

## Coverage

Keyboard and mouse:
- Fresh title and consistent branding; default music 10%.
- Actual Enter starts the expedition; movement reaches the native actor; jump release cuts the rise.
- Escape pauses the authoritative standalone world.
- Actual pause navigation opens Developer; invulnerability marks records as excluded.
- Live sliders change simulation values; Reset restores the full schema.
- Chamber and route launchers; exactly one simulation tick from the Step tool.
- Native action rebinding, labels and reset; player settings, independent mute, reduced motion/flashes, Xbox glyphs and complete settings reset.
- Every About category and credits.
- Actual authoritative knockout contacts open failure results; retry restores the checkpoint, health and controls without creating a score record.
- Mousedown held on an in-range downed marker rescues, suppresses chopping and releases cleanly.
- An out-of-range door click cannot spend the key; a deliberate in-range click unlocks.

Controller:
- Standard-mapping pads are injected before bootstrap.
- Pad navigation reaches local co-op, practice, pause, Settings, Controls, Developer, About and results/retry.
- Circle produces native crouch in gameplay and remains Back in menus.
- Controller sliders, Create+Options reservation, disconnect pause and keyboard recovery.
- The isolated audio/input suite additionally checks two pad ownership and native joining directly.

Local co-op:
- Keyboard plus one pad joins a second simultaneous miner during the entry window.
- Transferring that pad to player two leaves gameplay running.
- Independent movement, partner key collection, dropout of both input and simulation seats, deterministic carried-key recovery, viable solo continuation, and rejection of a late join.

Attract:
- The ten-second boundary is measured from the actual native idle counter after bootstrap.
- Visible demonstration label; keyboard, gamepad, pointer and touch wake.
- Wake input does not start a game; a second deliberate input does.
- Clean score/chamber/developer state, unchanged saved best score and no native errors.

Touch:
- Actual Playwright touch events at 390×844 portrait and 844×390 landscape.
- Touch-only menu entry, jump, simultaneous movement/jump, pointer release, persistent pause and Settings.
- Reachable key collection through ordinary pickup rules, a short contextual door tap and resulting chamber transition.
- Context priority and held touch rescue of a downed partner.
- Layout stays within the viewport.
- The isolated suite additionally checks an upward multi-pointer stick vector and target priority.

Persistence:
- A fresh page reload restores native player rebinding and selected pad glyphs.
- Run state starts clean while preferences persist.

State fixtures place a miner/resource or produce damage to isolate range, rescue and results behavior. They do not set a completion flag to claim a full expedition. Full expedition, alternate routes, resource starvation, extraction and network completion are tested by the separate native and Hub suites.

## Defects and corrections

Confirmed by tests:
- Short context-button taps were lost if pointer-up occurred before the next fixed tick. The touch adapter now buffers the action target until the next canonical edge.
- Native pad ownership transfer set player one's padLost flag. The adapter incorrectly opened a disconnect pause immediately after a successful co-op join. It now recognizes a pad explicitly transferred to another local seat; real disconnects still pause.
- A native actor-state audio test found grounded was not the native field for footsteps. It now reads onGround (see input-audio.md).

Confirmed by review and verified afterward:
- Circle was only a menu-back mapping and did not duck in gameplay. Its gameplay-only canonical down intent now drives native crouch.
- A mouse click on a rescue marker produced only one Interact edge. It now retains a stable rescue target and Interact hold until release, while suppressing chop.
- Early review prevented duplicate victory stings and a world interaction click also chopping.
- The root fixed caption expiry/reset clearing and attract result-dwell idle reset after integration review.

Test-oracle corrections:
- Bootstrap can consume native idle time before the test stops RAF. The attract boundary test now subtracts the observed idle value.
- The first co-op assertions were symptoms of the ownership-transfer pause above; they were not counted as separate defects.
- The isolated audio suite separates its voice measurement from a preceding key sound's tail and uses tolerance for Float32 gains.

Physical controller feel, real iOS Safari, ten-foot TV comfort and subjective listening quality remain unconfirmed. Emulated inputs and measurable Web Audio samples do not establish those qualities.
