# K.C. Munchkin Mix-Up

Open the matching `.html` beside this development directory directly in a modern browser. The single file contains the full engine, all game code, original procedural art and audio, six campaign stages, remix and workshop. It needs no server, account, CDN or companion assets.

Your lunch has other plans: hunt twelve moving snacks while three rivals hunt you. Star snacks reverse the chase. Meet the last little runaway at a junction, take a striped side door, or time a ride through the turning pen.

- Solo: WASD or arrows to steer, Space to reveal shy walls, Escape to pause.
- Controller: left stick / D-pad, Cross to reveal, Options for the menu. Settings can switch to Xbox glyphs and rebind controls. Create + Options is reserved for Hub.
- Couch co-op: choose two controllers, keyboard plus controller, or a keyboard duo (P1 WASD + F; P2 arrows + period). The team shares score, food, power and five lives.
- Touch: drag anywhere to steer; use the small contextual Chirp button on vanishing boards. Auto-chirp is enabled by default. A persistent Menu button opens the same screens.
- Online: launch in AI Hub for one or two participating devices. The host owns simulation and scoring; a dedicated host is supported. Local settings do not freeze the shared world.
- Workshop: use arrows/stick to focus a cell, confirm to edit, Q/E or L1/R1 to change tools, Z/Y or Square/Triangle for undo/redo. Touch and mouse have a tool palette. Validate, save/reload three slots, rename, exchange text codes and playtest/return.
- Developer tools: Pause → Developer tools. Live tuning, stage/seed restart, invulnerability, reveals, hitboxes/paths, single step and state/events inspection. Assisted runs never enter normal records. Session tools are read-only.

Music starts at 10%; effects and gibberish voice have separate controls. Settings, best score, unlock progress and workshop slots use versioned local storage and fall back safely if it is unavailable. Leaving the title alone for ten seconds starts an isolated arcade demonstration; any meaningful input returns to the title.

## Development

`npm run build` deterministically rebuilds the root single HTML and `exit-interview.json` from modular sources. The build inlines Hub client 1.4.0 byte-for-byte as the first script after charset, then the complete my-3D2dge 0.89.1 distribution and game. Neither vendored dependency is modified.

`npm test` is the one quiet verification entry. It reports only failures and one passed/failed/skipped line. Targeted iterations use `node tools/test.mjs --unit`, `--browser`, `--hub`, `--touch`, or `--hub-live`. Browser tooling uses the installed Playwright Python environment; no browsers or npm packages need installing on this workstation. Hub tests serve only this workspace on 127.0.0.1 at an OS-selected port and close their own server/browser.

See `docs/rules.md`, `docs/research.md`, `docs/coverage.md`, `docs/authoring.md`, `docs/balance.md`, `docs/testing.md` and `docs/issues.md` for implementation rules and evidence. Original source commercial material in `docs/` is research-only and is never bundled into the game. Engine attribution and the full mandated release information/feedback are paginated in About & Credits and in the root exit interview.
