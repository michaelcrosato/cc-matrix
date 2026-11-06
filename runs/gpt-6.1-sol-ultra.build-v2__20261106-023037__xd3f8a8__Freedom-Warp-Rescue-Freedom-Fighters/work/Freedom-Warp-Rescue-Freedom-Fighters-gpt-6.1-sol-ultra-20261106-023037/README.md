# Freedom Warp Rescue

Two drives. One ship. Bring them home.

Open the root delivery HTML directly in a modern browser. There are no runtime downloads or adjacent file requirements. The development copy is index.html. The complete operation includes the playable opening, two rescue sectors, the prison carrier, hyperspace extraction, ending, and checkpoint failure/retry. Evasion is a separate three-minute challenge available immediately.

Controls: WASD/arrows move, mouse aims, click/Space fires, Shift commits hyperspace, Escape pauses. Standard pad: left stick steers, right stick aims, R2/□ fires, L2 commits hyperspace, Options pauses. A second pad, or keyboard + pad, can share the one ship: pilot steers; navigator aims and commits hyperspace. Join and swap help is in the flight deck. Touch uses invisible left steering, assisted targeting, right-thumb aim, a contextual Warp button or double right tap, and a persistent Menu button.

Purple crystals are fragile: release fire before contacting their collars. Mine-layer destruction collapses only its linked field. Hyperspace is a committed burst through physical space; it provides no collision immunity.

Build: node tools/build.mjs

Verify everything: node tools/verify.mjs (or npm test). Prints failures and one count. Unchanged successful suites reuse their fingerprinted evidence; changed dependencies rerun the affected suites. All test logs, screenshots, native/browser playthrough evidence and protocol results are under artifacts/. The verification runner uses the installed Python Playwright environment and closes every browser/server it starts.

Developer tools are reachable from pause. Live balance, seed/sector selection, controlled spawns, invulnerability, overlays, single step and time scale all operate on the ordinary World. Modified flights cannot overwrite normal checkpoints or bests. AI Hub participants get read-only diagnostics; Hub owns the round lifecycle.

Source notes: docs/research.md. State/lifetime rules: docs/contracts.md. Requirement map: docs/requirements.md. Testing issue ledger: docs/issues.md. Public game-owned test interface: FWR.debug (snapshot/world observations, semantic inject/release/advance and narrowly scoped fixtures). FWR.debug.externalClock selects deterministic test stepping; it does not change balance or objectives.

The full engine and unmodified Hub client are vendored at the revisions recorded in the in-game About/Credits and root exit-interview.json. Vendor engines and licenses remain intact. No vendor engine code was modified.
