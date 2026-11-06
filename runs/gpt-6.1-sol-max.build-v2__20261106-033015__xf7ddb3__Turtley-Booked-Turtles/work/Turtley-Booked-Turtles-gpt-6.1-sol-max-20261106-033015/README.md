# Turtley Booked

**Small shells. Big room service.** An original rescue-maze arcade game: five floors, 26 hatchlings, one shared defensive bomb and a rooftop family evacuation.

Open the containing folder's `Turtley-Booked-Turtles-gpt-6.1-sol-max-20261106-033015.html` directly in a browser. No server, install, CDN, images or audio files are needed for standalone play. AI Hub supplies remote shared-world sessions; the file itself supplies solo and simultaneous local co-op.

- Solo: WASD or arrows; Space bombs. Mouse click routes; right click bombs.
- Standard pad: stick/D-pad; Cross bombs; Options pauses. PlayStation glyphs default, Xbox optional.
- Shared keyboard: WASD/Space and arrows/Right Shift. Mixed keyboard/pad and two-pad seats are explicit menu choices.
- Touch: invisible four-way drag stick, contextual POP and optional assisted auto-defence. Single-device touch is solo.

Native pause has Settings, Controls, Developer tools and About/Credits. Developer balance/cheats mark practice; solo, co-op, assisted and practice records are separate. In Hub, pause is local and production tools are read-only. An explicit `dev=1` query allows authoritative tools on a test host.

Build: `npm run --silent build`. Verify: `npm run --silent verify`. Optional suite names follow `--` (rules, browser, devices, audio, network, lifecycle, visuals, hub, hub-campaign, export). Tests reuse installed Python Playwright; no browser installation is required. The Hub tests bind temporary loopback OS-assigned ports and stop only their own servers.

See `docs/research.md`, `docs/authoring.md`, `docs/validation.md` and `docs/provenance.md`. Root `exit-interview.json` is the source for the embedded About feedback/catalogue information. The pinned full engine and unmodified Hub client are in vendor.
