# Independent integration review

Reviewed `src/main.js`, `src/input.js`, `src/online.js`, the native input / shell / clock implementation, and the procedural audio unlock entry point. This is a code review supplement to the actual Hub/browser suites; it is not a hardware-controller or listening test.

## Findings sent to integration owner

1. **Moderate — controller-only custom audio stays locked.** The custom adapter's `unlock()` was invoked only by DOM pointerdown/keydown. Native pad menus may produce native confirm sounds, but never set `SF.Audio.unlocked`. Add an unlock attempt on meaningful pad activity, respecting the browser's activation gate. Root reported this fixed.
2. **Moderate — join hooks survive native back and attract.** The Co-op action Back disables `allowJoin`, but native Circle/Escape/back swipe invokes `shell.back()` directly. Title and attract also did not disable joining. Consequently a join callback can reopen the join panel after leaving it, including over attract. Disable joining in title and attract entry, and route the join screen's back through the cleanup.
3. **Moderate — dev slider values can disagree with fresh-world balance.** A fresh World resets actual balance, but only `devSpeed`/`devGod` were reset in Settings. Saved `dev_<parameter>` values therefore show old values while physics runs defaults. Reset all balance rows in the same suppressed reset block used for starting a run.
4. **Moderate — post-end first gesture can restart audio.** End hides HUD/shell but left floating flight/touch buttons present; global gesture listeners still called `audio.unlock()`. For a never-unlocked round, a later gesture can clear the adapter's stopped flag and start music after end. Ignore activity/unlock after `app.ended`, and hide floating controls in onEnd.
5. **Minor — uneven stick activity threshold.** Attract activity used a magnitude threshold for the left stick but any non-null right-stick aim. Apply the same meaningful magnitude threshold to each to avoid very small right-stick movement immediately beyond the deadzone cancelling attract.

Root also reported and fixed two independently found issues: normal-start `devGod` reset inadvertently invoked `World.dev`, removing spawn invulnerability and flagging every normal run modified; and key/value-only Settings redefinitions discarded native metadata/apply handlers (including glyph choices and screen scaling).

## Integration paths checked and found coherent

- Exactly one authoritative world step path. `E.Game({loop:false})` is advanced by elapsed wall time; RAF advances zero seconds only to draw. Native `advance()` retains full elapsed time rather than the ordinary RAF path's 50ms cap. Hub local overlays leave host simulation running. Existing browser evidence explicitly verified a 400ms blocked event loop catches up.
- Hub countdown gating uses both the `start` event and `AIHub.time() >= 0`. Dedicated hosting has the same simulation path with no local pilot input or render surface.
- Active Hub menus omit standalone title/retry/quit navigation. Non-host dev mode is read-only inspection. Host simulation changes are transmitted in authoritative state.
- Online local input is sampled every fixed update and one-tick abilities are latched for the slower transport cadence. Overlay inputs are neutral while retaining the allowed upgrade choice. Remote action edges execute once per received sequence.
- End stops online update/sends, simulation scheduling, and current audio nodes. Departure deactivates pilots and excludes them from final standings. The post-end first-gesture edge above is additional to those already passing immediate end checks.
- Retry and attract create a clean World, reset renderer/event tracking, and clear held input. Attract results do not save scores. The two remaining join cleanup paths are identified above.
- Mouse/touch world coordinates use the native fixed-resolution transform. The app's small-screen resize adapter adjusts its scale and offsets together, preserving arena coordinates.

## Evidence already produced by this reviewer

- `tests/online.mjs`: 18 unit checks passed.
- `tests/hub_browser.py`: six official Hub scenarios passed at 1/2/3/4 players, poor network, host departure and dedicated host.
- `tests/hub_gameplay.py`: 13 real-browser checks passed for remote movement/fire/abilities, countdown, local overlay, clock catch-up, snapshot convergence, upgrade delivery and end cleanup.
- Detailed reports: `docs/hub-evidence.json` and `docs/hub-gameplay-evidence.json`.
