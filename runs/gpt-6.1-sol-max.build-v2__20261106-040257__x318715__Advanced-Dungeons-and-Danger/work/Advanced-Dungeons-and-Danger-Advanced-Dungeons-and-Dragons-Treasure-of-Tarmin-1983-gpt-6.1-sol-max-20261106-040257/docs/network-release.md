# Network release verification

Run the complete added suite with the installed Playwright environment:

```sh
/home/micha/.local/share/pipx/venvs/playwright/bin/python tools/network-release.py
```

Optional `rtc` or `hub` arguments run only that group. The command prints failures and one summary count, returns a failing exit status on any failure, binds an OS-assigned loopback port, confirms the served game's title, and closes every browser and server it creates. `ruff check`, `ruff format`, Python compilation, and `ty check --python /home/micha/.local/share/pipx/venvs/playwright/bin/python` pass for the runner.

## Complete normal cooperative expedition

The runner first generates `evidence/network-route-fixture.json` from `scriptedCoopRoute` and the production deterministic model. It records each player's commands, expected result, and authoritative gameplay state. The fixture is test input; it is never imported into the game during the complete route.

Two isolated Chromium contexts open the exact root delivery HTML. The shipped Host/Join UI creates the offer, imports it, creates the answer, and imports that answer. The test checks actual open/connected RTC DataChannels. It then submits each adventurer's actions through production `__app.send`, observes the real authority acknowledgement, and waits until both actual peers agree with the expected model state before proceeding. The comparison covers the entire serialized gameplay state except the independently advancing clock, historical event/log arrays, and the deadline's absolute time. Object key order is canonicalized; no gameplay values are altered.

The software renderer is initialized and the real menus are exercised before the cosmetic engine RAF loops are stopped. The Network authority's independent 25 ms timer keeps running. Rendering resumes briefly for the final victory state. This separates rendering cost from the deterministic/network check and keeps all real planning deadlines active. No health, position, resources, item ownership, enemy state, combat state, tuning, or RNG is edited during the full route.

The successful recorded run passes **18/18 checks** and performs **372 interleaved commands**: 370 accepted actions and two expected full-pack comparison refusals. Both peers agree after every event. It resolves 66 rounds, takes 198 steps, defeats all eight encounters, exercises both damage channels, ten rests, secret discovery, and both adventurers' one-way gate choices. All three boss phases and both boss pools agree across the real peers. Boss defeat is witnessed before a separate deliberate treasure claim. Both adventurers survive, the run remains unmodified, duplicate treasure collection is refused, and network state never overwrites solo continuation.

Recorded elapsed time is **57.73 seconds** for the automated pilot, comfortably below the 15-minute cap. This is a scripted verification time, not a claim about a human playthrough. Largest observed packet is **11,069 bytes**; maximum observed outbound messages per second is **13**. There are zero browser or native engine exceptions.

Evidence: `evidence/network-release-rtc.json`. Tested artifact SHA-256: `a4663cc26bc0df900001d4c096fa914ac73bf44ff2d019cbc28394391ce851e2`.

## Additional final-artifact Hub scenarios

The **13/13** passing edge checks use the pinned official harness and the exact delivery HTML. Two additional setup snapshots are generated solely through ordinary model commands: an active second boss phase, and a combat with one downed adventurer and one living companion. Loading these snapshots is explicitly scenario setup, separate from the mutation-free full cooperative route.

The official Time up button is exercised in both states. Each authority submits exactly one honest incomplete team result, with `won:false` and tied current participants. Every copy stops simulation and outgoing traffic on end; later actions cannot change authoritative state. The test observes the actual outgoing `finish` postMessage from the host and the official harness's public round result display.

The nonhost-departure scenario uses the official Remove player UI at two seats. The remaining host continues, departed stable gear and supplies remain recoverable, and the eventual result includes the current participant exactly once. It submits `standings:[[0]]`, `won:false`, exactly once.

Evidence: `evidence/network-release-hub.json`. Tested artifact SHA-256: `0c95b7f7c0d8ba7f5dc185512c2a145ff686cacbe7ebbf3227aecb7b2de03f7e`.

The root builder's separate browser suite covers the five standard final-artifact official harness scenarios, solo Hub victory, ordinary UI input, and additional contested pickup/handoff/revive checks. These network release tests supplement those checks. They establish same-machine peer connectivity and protocol behavior; cross-network NAT traversal and real external devices remain unconfirmed.
