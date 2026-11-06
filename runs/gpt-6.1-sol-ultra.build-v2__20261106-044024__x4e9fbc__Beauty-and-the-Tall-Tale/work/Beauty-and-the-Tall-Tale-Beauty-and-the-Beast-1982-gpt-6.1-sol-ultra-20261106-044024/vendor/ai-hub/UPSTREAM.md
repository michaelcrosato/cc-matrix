# AI Hub dependency record

- Repository: https://github.com/michaelcrosato/ai-hub
- Revision: `35a1047f2067b2af3de3943f0fe452f39105d869` (main when obtained, 2026-11-06)
- Protocol: 1. Session client: 1.4.0.
- Files copied unmodified: `session.js`, `README.md`, `bridge.js`, `round.js`, `harness.html`, `examples/arena.html`.
- The shipping document embeds the exact `session.js` bytes as the first head script after charset. Its existing attribution banner is retained.
- The matching harness uses `./bridge.js` and `./round.js` without changed imports. No catalogue import or write command is used by our runner.
- Repository root LICENSE lookup at this revision returned 404; additional license terms: unknown.

The adapter in `src/network.js` is game code, separate from the pristine dependency. It uses a single 12 Hz outgoing scheduler, authoritative normal intentions, reliable repeated edge requests until acknowledged, sender/range/sequence/tick validation, and monotonic snapshots. A non-playing host owns the same simulation with no local pawn.
