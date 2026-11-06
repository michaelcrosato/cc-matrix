# Advanced Dungeons & Near Misses

Open the delivered HTML beside this folder. Everything needed for solo and couch play is inside that one file; there are no downloaded art, font or audio assets. Music starts at 10% after a real input gesture.

WASD moves, mouse aims, click fires one arrow, right click listens, Space quicksteps, E interacts, Tab opens the discovered chart and Escape pauses. A standard controller uses left/right sticks, R2/L2, Circle, Cross and Triangle. Touch uses invisible left movement/right aim zones, intentional right taps, hold-to-listen, and a contextual ladder/revive action.

Use Two Rangers for couch or direct WebRTC pairing. Direct online play exchanges a complete invitation and reply manually; some networks require a relay. In AI Hub, the coordinator supplies the roster, clock and round lifecycle. Developer Tools are inside pause; changing a shared rule marks the local expedition assisted and leaves its normal save intact. Hub diagnostics are read-only.

`npm run build` produces the root HTML and the development index from modular sources and the root exit-interview.json. `npm test` is the single quiet test entry point. It needs Node and the workstation's installed Python Playwright environment; it installs nothing. Optional focused runs use `npm test -- package browser` or a listed suite name. Verbose output and evidence stay under docs.

See docs/authoring.md for the level schema, real optional-room example and validator; docs/architecture.md for the authority/save/render contracts; docs/verification.md for actual evidence and limitations. The pinned full engine and unchanged Hub client retain their notices under vendor.
