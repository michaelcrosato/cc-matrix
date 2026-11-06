# Killer Bee-yond Midnight — build progress

## Identity and delivery

- Selected **Killer Bee-yond Midnight** once using `node:crypto.randomInt(50)` over 50 distinct candidates. No reroll. Record: dev `identity.json`.
- Development folder: `Killer-Bee-yond-Midnight-Killer-Bees-1983-gpt-6.1-sol-max-20261106-025717/`.
- Root artifact: `Killer-Bee-yond-Midnight-Killer-Bees-1983-gpt-6.1-sol-max-20261106-025717.html`.
- Root structured hand-in: `exit-interview.json`. Build now generates both root files reproducibly from dev sources.
- Actual task attribution: OpenAI gpt-6.1-sol, max; run 2026-11-06 02:57:17. Usage: `added on import`.

## Implemented and verified

- Read PLAN.md/TASK.md, global AGENTS and game-toolchain skill. No sibling-run files read or edited. No sub-agents used.
- Vendored engine v0.89.1 at `8ecc2f62353761187bdfe226f327b7ea5d2eb691`, full handoff and MIT license.
- Vendored pristine Hub protocol 1/client 1.4.0 at `35a1047f2067b2af3de3943f0fe452f39105d869`, official harness/bridge/round. SDK remains byte-identical, first head script.
- Research: manual's full extracted text and both creator interviews. Evidence ledger `research.md`; original videos/audio not viewed/heard, exact source timing/sound honestly unknown.
- Pure seeded 120 Hz swarm simulation; Roam/Focus; count-dependent footprint; sustained sting and recovery; opposite-turn gardeners; warning cells; scout/guard/hunter; cadence-limited individual bee loss; horizontal ray; deterministic contributor refill; sorted simultaneous deaths; solid shells with topology validation and escape.
- Six authored encounters / three garden palettes; Bellwether move/expose/pulse; full team score/survival streak; checkpoint retry; observer/replenish; clean/assisted best separation; ending/replay.
- Native overhead renderer, E.Blob-derived bee/gardener anatomy and springs, E.SHAPES/material scenery, native E.Menu/E.Shell menus/settings/rebinding, keyboard/mouse/pad/touch, safe resize while paused, comfort controls.
- Code-only original music, effects and nonverbal chatter. Persistent default music .1; mute/music/SFX/voice buses. Offline and live bus checks pass; no listening claim.
- Solo, two-pad/shared-keyboard/keyboard+pad couch, real manual ordered WebRTC, Hub shared world and dedicated headless host. Input ownership/counters/stale neutralization; interpolation/prediction; measured rates; unreliable <=1,200 B / larger reliable full snapshots under 16 KiB.
- Hub harness passed solo, duo, 150 ms + 50 ms jitter + 5% loss, host departure, dedicated no-local-seat server, guest departure, time-up and once-only normal ending resumed from the unmodified normal-action replay checkpoint.
- Native developer tools: live flight/sting/recovery/damage/pressure sliders and reset, stage/seed restart, single step, time scale/live preview, invulnerability, charge refill, rival and both gardener spawns, collision/contact overlays, labels, snapshot export. Hub and peer guests read-only. Exit restores speed/input.
- Ten-second real-simulation attract; co-op and finale glimpses, all input-family cancellation, save isolation.
- In-game About includes all required source and feedback fields, with actual run metadata.

## Tests / evidence

From the development folder:

```
node tools/build.mjs
node tools/test.mjs
```

One quiet test entry point; groups: `--group=sim`, `browser`, `audio`, `hub`, `peer`. Run sim before standalone Hub group to generate the final replay checkpoint.

- Simulation/content/native drawing: previous group 79/79 passed (normal full campaigns, all three rival states, geometry, charge, score, wipe/retry, packet validation and larger reliable snapshot fixture).
- Browser/input/storage/visual group: previous 96/96 passed in installed Chromium/WebKit/Firefox, synthetic standard pads and real CDP touch events.
- Audio: previous 14/14 including packaging; WebRTC previous 18/18; extended Hub previous 38/38 including packaging. Group counts include package checks; the integrated runner counts them once.
- Normal solo pilot: 610.15 s, all six, no invulnerability/teleport/health edits/clear triggers.
- Full-feature normal co-op pilot: about 600.87 s, all six, scout/guard/hunter, real losses/observer, Focus/recovery/ray/shell/boss exposure and pulse. Holds first charge to demonstrate maturation; no rule bypass.
- Machine-readable replay evidence: `evidence/campaign.json`, `solo-campaign.json`, `final-checkpoint.json`. The last file is the actual final live state of the ordinary-command run, not a win trigger.
- Inspected images: title, gameplay, finale, ray/contact/recovery/Focus cues, portrait title/gameplay, ending, credits, asset and palette sheets. Native assets retain sharp pixel edges and quiet collision lanes.
- `ruff check`, `ruff format`, `ty check` pass for browser tests. Biome formatting and error-level checks applied to authored JS/CSS/JSON (stylistic suggestions remain, no errors).

## Verified defects and fixes

Six distinct test-caught defects; one critical (startup). Full details in `evidence/issues.md`:

1. Pilot navigation cell/centroid clearance disagreement: route anchoring/recovery.
2. Critical engine `boot:false` left `_booting` true, blocking Play: one-line vendor fix.
3. Co-op simultaneous collapse changed later contact: batch all stings before deaths/shells/refills.
4. Paused orientation change retained old camera fit: native screen resize refit/public camera coordinates.
5. Direct terminal result overwritten by stale snapshot/disconnect UI: terminal ownership and transport stop.
6. Disconnected peer loop used a null transport: gate the stopped round behind reconnect UI.

Engineering review separately improved retry best-save routing, local counter reads, cloned geometry validation, smaller-swarm drawing extents and replay-mode retention. Fixture corrections (unbound pointer event, screenshot CSS fade timing, float bus tolerance) are not counted as game defects.

## Final status — complete

- Final integrated test command completed: **224 checks, 224 passed, 0 failed** against the final exported HTML and root interview.
- Solo normal-command completion: 610.15 s; full-feature co-op: 600.87 s. Neither run assisted.
- Final artifact: 1429788 bytes. SHA-256: `3542d89a9bf6313e9c85affde6d2f0a2c07d52cc2830a5a8b866d1a138bf2b29`.
- Root interview parsed and matches the in-game metadata source. Pristine SDK and exact artifact filenames verified.
- Native JS/CSS/JSON formatted; error-level Biome check, Ruff and ty checks pass.
- Final required Source Information / Testing Feedback / Engine Feedback / Prompt Feedback populated in About and delivery JSON.
- Evidence/acceptance ledger and delivery manifest saved. No remaining required implementation, testing, or packaging work.
- Only final user handoff remains; no further test rerun needed unless code changes.

## Limits to state honestly

No physical controller, touch hardware, TV, real iOS, subjective sound listening or public-Internet/NAT connection was tested. Browser stand-ins and same-machine real WebRTC were used. No matchmaking/STUN/TURN service is shipped; arbitrary Internet peer reachability is not guaranteed. Do not estimate cost/tokens/time; usage is `added on import`.
