# Bomb Squad All Wired Up

Open the root HTML file in a modern browser. Solo play needs no server, downloads, audio files, or development tree. Begin dispatch for training and the three-case campaign, or choose Case files to jump to a case.

Keyboard/mouse: WASD/arrows focus, mouse hover/click targets, Space/Enter applies or holds; 1–4 select tools, Q/F or wheel cycles, E tests a held spare, R repeats, Tab opens evidence, Escape pauses. Standard gamepad: D-pad/left stick, Cross apply/hold, L1/R1 tools, Square test, Triangle repeat, R2 evidence, Options menu. PlayStation glyphs are default; Xbox and rebinding are in native settings. Touch taps choose legal tools and assist solder; the menu remains available.

Repair: both cuts → pliers lift → choose spare → place → solder both joints, releasing in green. Wrong lead: restore its highlighted joint. Wrong spare: lift and replace. Fire: hold extinguisher. Evidence includes confirmed dark cells; compare the exact glyph reference before the separate transmission confirmation.

Co-op: Host a room, share its six-character code, and have up to three others Join. All seats share one fuse/evidence ledger, claim separate sectors and vote on code proposals. Standalone uses secure PeerJS Cloud signaling and actual WebRTC data. Tests demonstrated two pages on this machine over cloud signaling and a local fixture; arbitrary NAT/firewall paths and TURN service are unknown. Retry/Back are available for connection errors. Hub uses its official client exclusively, automatic readiness, host authority and a short live shared-world dispatch, including a host with no seated player.

Build: `node tools/build.mjs`. Verify: `node tools/verify.mjs` (prints only failures and one count line). Focused groups: sim, engine, browser, campaign, controller, touch, audio, peer, hub, authoring, recovery, package. Installed Python Playwright 1.63.0 is used; all HTTP fixtures bind 127.0.0.1 on OS-selected ports and close themselves. PeerServer 1.0.2 is a development-only fixture dependency (`npm ci --ignore-scripts` if needed).

See `docs/research.md`, `docs/authoring.md`, `docs/engine-changes.md`, `docs/testing.md`, and machine-readable results in `evidence/`. `run.json` records the title draw and exact filename contract. The root `exit-interview.json` drives the same information shown in About & credits.
