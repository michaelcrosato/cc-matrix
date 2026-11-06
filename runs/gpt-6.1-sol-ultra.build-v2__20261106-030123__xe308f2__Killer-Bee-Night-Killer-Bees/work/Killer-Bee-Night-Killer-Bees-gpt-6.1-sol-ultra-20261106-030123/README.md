# Killer Bee Night

Twelve little bees. One big night.

Open the sibling `Killer-Bee-Night-Killer-Bees-gpt-6.1-sol-ultra-20261106-030123.html` directly in a browser. It is the complete, dependency-free game; no server or installation is needed for standalone play. `index.html` here is the identical export.

Steer over a clockwork gardener and maintain contact to finish it. Hold Focus to compress your bees and sting faster. The horizontal ray destroys rival swarms on your row. Finishing a gardener recharges one ray; its shell becomes an obstacle. Six garden beds end with the Bellkeeper and an ending. A normal clean campaign takes about ten minutes, including result screens.

| Action | Keyboard/mouse | Standard controller | Touch |
| --- | --- | --- | --- |
| Steer | WASD/arrows; hold right mouse toward pointer | Left stick or D-pad | Invisible left thumb stick |
| Ray | Space or left click | Cross / A | Contextual RAY button |
| Focus | Hold Shift | Hold R2 / RT | Hold right side |
| Menu | Esc / P | Options / Start | Corner menu |

Couch co-op supports two pads, keyboard plus one pad, or two keyboard halves. With one pad, P1 uses the keyboard and P2 uses the pad. With two keyboard players, P1 uses WASD/Space/Shift and P2 uses arrows/period/slash. The second player can join at the next encounter boundary. Both swarms share a score, have independent rays, and replenish between beds. Fallen players observe until the next checkpoint.

From **Play together → Direct co-op**, the host creates an invitation, the guest accepts it and sends a reply, and the host pastes the reply to connect. Copy/Paste have selectable text fallbacks. The exchange uses a real ordered WebRTC data channel with no broker or credentials. Local connectivity is verified; arbitrary internet/NAT reachability is unknown without TURN.

AI Hub is detected automatically and uses only its supplied transport during an active round. Its pristine session client is first in the HTML. A dedicated authority needs no canvas, local player, gamepad, or audio. Local menus keep the shared world running. Final team results use one tied standing and an acknowledged complete final state, with bounded fallback.

Pause → **Developer tools** exposes live tuning, encounter changes, seed entry/regeneration, collision/state labels, invulnerability, ray refill, rival spawning, single stepping and a selectable/exportable state snapshot. Slow motion previews behind the tools; leaving them restores normal time. Gameplay edits permanently mark the current run assisted. Hub exposes read-only diagnostics instead of cheats. Retry also marks the run assisted; clean and assisted best scores use separate storage. Settings and scores tolerate blocked storage.

Native Settings and Controls provide volume/mute, 10% default music, voice level, reduced motion, restrained flashes, PlayStation/Xbox glyphs and rebinding. Title and co-op menu start an isolated real-simulation demonstration after ten idle seconds. Meaningful keyboard, pointer, pad or touch input exits it.

## Rebuild and verification

```sh
npm run build
npm test
```

No npm dependencies are required. The test command uses Node and the preinstalled Python Playwright environment recorded in TASK.md; it prints only failures and one final count. Final result: **338/338 checks passed**. Test reports are in `evidence/test-results.json`; source evidence is in `research.md`. The original engine source is unchanged; its MIT notice is retained in both the vendor folder and the HTML.

| Group | Checks |
| --- | ---: |
| Deterministic combat/content and ordinary-command campaign | 97 |
| Native engine headless campaign/drawing | 5 |
| Network packet/lifecycle units | 11 |
| Export, SDK identity and interview schema | 14 |
| Chromium/WebKit offline audio | 12 |
| Chromium/WebKit/Firefox input, storage, menus, touch and framing | 157 |
| Official Hub harness and real two-context WebRTC | 42 |

The solo seed 42 ordinary-command proof cleared six encounters in 578.28 simulated seconds; two-player seed 7 cleared them in 549.73 seconds. No invulnerability, health edits, teleportation or direct-clear triggers were used. Native exact stepping repeats the solo campaign with drawing enabled at checkpoints. The real Hub natural-victory check independently earned the cooperative ending and delivered the same won result and score to both clients. Traffic was also checked with 150 ms latency, 50 ms jitter and 5% loss, host departure, guest departure, time-up, dedicated authority, and a reliable snapshot over 1,200 bytes.

Physical pads, real iOS hardware, television hardware, subjective listening and arbitrary internet connections were unavailable. Their stand-ins and the remaining uncertainty are recorded in the credits and interview. No performance targets were claimed.

## Files for future authors

- `content/stages.js`, `content/README.md`: six authored encounters and validation contract.
- `src/sim.js`: deterministic authoritative rules, snapshots, tuning and ordinary-command bot.
- `src/render.js`: native pixel anatomy, dioramas, cues and HUD.
- `src/main.js`: native game, menu/input lifecycle, developer tools and orchestration.
- `src/audio.js`: procedural instruments, sound motifs, reactive music and gibberish.
- `src/net.js`, `docs/NETWORK.md`: Hub/direct authority, packet contract and lifecycle.
- `evidence/art-sheet.png`: palette and custom anatomy sheet.
- `evidence/title-final.png`, `coop-final.png`, `bellkeeper-final.png`, `ray-final.png`, `ending-final.png`: inspected final composition; setup notes are in `evidence/VISUAL-NOTES.md`.
- `evidence/portrait-chromium.png`, `portrait-webkit.png`, `about-browser.png`: inspected access/overflow evidence.
- `../exit-interview.json`: exact machine-readable delivery interview, identical to in-game feedback.
