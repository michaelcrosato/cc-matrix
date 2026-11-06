# Advanced Dungeons and Danger

Open the delivered HTML in a current Chromium or Safari/WebKit browser. Everything needed to render and play is embedded; no neighboring source files or CDN access are required. The native renderer prefers WebGPU and falls back to WebGL2. A browser lacking both gets an actionable message.

The expedition has three authored floors, two survival strengths, a real six-slot pack, five ordinary enemy roles, a three-seal Minotaur and an explicit treasure claim. Solo progression and settings persist when storage permits. Export/import saves are in the pause menu. Co-op uses manual WebRTC invitations or AIHub's shared-world session lifecycle. No TURN relay is supplied, so restrictive NAT/firewalls may prevent a direct peer connection. No host migration is claimed.

Build: `npm run build`. Verification: `npm run verify` prints failures and one count. Pure rules/protocol/package only: `npm run verify -- --rules`. Browser groups can be selected (`file touch rtc hub fallbacks`). Python Playwright uses the workstation's installed environment and browsers. Rebuild validates and imports a designer campaign with `npm run build -- --content path/to/export.json`.

Developer mode: Pause → Expedition tools. Live sliders, reset, floor/encounter jumps, invulnerability, supplies, item spawns, checkpoint retry, geometry reveal, state/intent diagnostics, deterministic step and content workshop all use the production model. Edits mark runs modified. In scored Hub play developer tools are read-only and title/restart/signaling are unavailable. The workshop previews tile/entity data, validates, imports/exports and applies edits to a new modified run.

See docs/CONTROLS.md, docs/RESEARCH.md, docs/rules.md, docs/network.md and docs/presentation.md. Canonical source/feedback/catalogue data is src/report.json; build embeds it and writes root exit-interview.json. PROGRESS.md in the workspace root records milestones. The declared10-minute Hub duration is a pacing target; automated route timings are machine-driven commands, not a human playtime measurement.
