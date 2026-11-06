# Browser input, menus, attract and audio verification

Run from this development folder:

```
/home/micha/.local/share/pipx/venvs/playwright/bin/python tests/input-browser.py
```

An optional first argument selects a bundled HTML artifact. The default is the bundled development `index.html`. The runner prints one JSON object containing `count` and `failures`; it closes its owned browser in `finally`. The aggregate Node verifier can parse that object and include the count without exposing successful per-case logs. It opens only one browser process at a time, uses the installed Playwright 1.63.0 and existing Chromium/WebKit, and launches the game through `file://` with no test server or external services.

## Passing result

The rebuilt bundled development artifact passed the initial 40 checks with output `{"count":40,"failures":[]}` on 2026-11-06. The run includes the 1.8-second victory celebration and the corrected context/wake input handling. `ruff check tests/input-browser.py` and `ruff format` also passed. The same script accepts the final root HTML path for release proof. A subsequent mouse-hold regression brings the suite to 41 cases; the final aggregate owns release evidence after rebuilding.

## Evidence methods

- Actual keyboard events exercise native movement, jump/early release, duck, held chop and high redirect. Actual mouse events exercise hover focus, menu clicks, pointer low-arc aiming, one-shot in-range door interaction and a held rescue through the real 1.4-second timer. The rescue test holds for 1.5 seconds, drifts the pointer while retaining its captured target, checks one rescue with two restored helmet marks and no durability/contact cost, releases cleanly, and verifies an ordinary solo click outside contextual targets still swings.
- Standard-mapping gamepads are installed before game bootstrap using `navigator.getGamepads`. The native engine polls their axes and buttons through deterministic `game.advance` calls. Menu focus is moved by D-pad input; tests do not call DOM focus to navigate. Paths cover title, all practice choices by representative chamber launch, pause, options, paged settings, sliders, glyph selection, native rebinding, storage persistence, all Developer panels, paged About, help, results and replay. Two pads test joining, separate ownership, disconnect recovery, precreated co-op roster startup, the ownership panel and key-carrier drop-out.
- A browser expedition uses the same canonical Pilot input stream and native stepping as the playable simulation, including real hazard/director progression, contact wear, resource acquisition and doorway transitions. It asserts ordered feature presence alongside victory/results and replay. No completion flag is set by the test.
- The title's 10-second idle boundary uses the native clock. The demonstration's real simulation must traverse three chambers, show traversal, break/replacement/redirect/crash/key/door/finale events, loop, preserve saved records and consume wake events. Keyboard, pad and touch wakes are covered.
- Chromium phone contexts at 390×844 and 844×390 use real CDP multi-touch events with distinct touch IDs. Simultaneous left movement plus right jump, independent release, down-to-duck, a held contextual door target, short context presses, deliberate redirect priority, touch menus and attract wake are asserted. Partial CDP `touchEnd` identifies fingers being released; it does not describe fingers remaining down.
- Coded audio is verified with the module's actual OfflineAudioContext proof: nonzero independent music/SFX/voice samples, music default 0.1, combined peak below one, mute silence, independent voice-off and silent post-envelope tail. A live gesture wakes audio; mute and `stop` must leave no scheduled or active source/effect.
- WebKit uses a phone context for a fresh file launch, actual touch title activation and native renderer/state errors. This is a browser stand-in, not actual iPhone hardware.

Small world setups isolate input contracts (positioning a miner near a test rock/door, disabling unrelated spawns, or setting up a departing carrier). They do not bypass an expedition objective or substitute for the full normal-input playthrough. The tests stop native RAF and retain exactly one stepping owner. Screenshots inspect legibility and composition only.

## Confirmed input defects caught

1. Attract wake touch could generate a compatibility click on the newly visible menu, opening Options from the wake tap. Reproduced with a 390×844 phone, native title clock at 10.01 seconds, and actual touch at (312,590). Root added capture consumption for the matching wake pointer. Portrait and landscape regression passed on the subsequent run.
2. A contextual touch press released before the next simulation tick was discarded: the edge remained true, but its target was cleared and `Controls.read` only processed it while held. A real quick tap with RAF stopped reproduces the input contract deterministically. Root retained a pending contextual action independently of its held pointer. The final portrait and landscape regressions proved the press survives release and acts exactly once.
3. Assisted chopping immediately started a chop near a rock and swallowed the deliberate Redirect bubble's press while that anticipation was busy. A real held bubble touch during the windup produced chop=1, redirect=0. Root delayed assistance briefly, suppressed it for explicit action, and buffered deliberate redirect through recovery while allowing assisted windup replacement. The final portrait and landscape regressions proved a real redirected contact, zero chop contacts and exactly one durability cost.

4. Final requirement review found that a world mouse click on a downed marker supplied only a one-tick release edge, so holding Mouse0 chopped instead of completing a rescue. The controls now capture a stable in-range mouse target on pointerdown (rescue before door), retain one short press after release, validate the same target each tick and hold canonical Interact while suppressing Chop. The focused nine-case browser source-overlay proof passed without changing the bundled artifact during root's running verification; The subsequent rebuilt-artifact focused run passed all 17 mouse/keyboard and portrait checks with zero failures, including the complete mouse rescue and all touch regressions. The final aggregate owns whole-suite release proof.

Each touch case now tracks active custom CDP IDs and ends those touches in `finally`, so a failed assertion cannot strand fingers and cause failures in subsequent cases. Cleanup skips an empty inactive session: CDP rejects touchEnd when no touchStart has occurred. That initial cleanup mistake was a test defect, corrected without changing gameplay. The relocated first-touch hint must allow pointer events through to the canvas; root's final visual/input review caught and corrected that separate game issue.

Initial failures from exact accessible-name matching, native glyph-cycle order, wrong CDP partial-release semantics, a test disabling expedition spawns, and immediate legal collection of a recovered key were corrected in the tests. These are test defects and are excluded from game-defect counts.

## Visual evidence and limits

`docs/evidence/pause-tv.png`, `developer-tv.png` and `about-tv.png` use 1920×1080. `touch-portrait.png`, `touch-landscape.png` and `webkit-phone.png` record the phone composition. These supplement the opening/title/results evidence maintained by root.

Physical DualSense feel, actual iOS Safari, TV viewing distance and listening quality remain unconfirmed. Software event and audio-buffer evidence cannot establish those qualities.

A later evidence-only recapture finishes finite CSS opening animations with `screenshot(animations="disabled")`; stopping the native clock does not advance CSS wall time. The earlier faint menu screenshots were captured mid-fade and did not represent their static appearance. Inspected the replacement 1920×1080 pause, Developer and About views: panels are opaque, focused actions prominent, and text readable against the dim cave. Phone title buttons are all visible and at least 44 CSS pixels tall in both orientations (portrait primary 46px; all others 44px). The revised hint ends at y=659 before the portrait context bubble begins at y=693, and ends at y=285 before the landscape bubble begins at y=303. Their bounds do not overlap. Added `title-portrait.png` and `title-landscape.png`; recaptured the touch and WebKit images with no page errors. This recapture intentionally did not repeat the broad suite.

## Final release confirmation

The final exact root artifact passed the complete 270-check aggregate, including all 41 input/audio cases. The cases now include root/nested/results Options navigation, a complete second replay, held mouse rescue, quick clicks and pointer-transparent portrait hints. docs/evidence/verification.json records the final bundle hash; no source changed after that passing run.
