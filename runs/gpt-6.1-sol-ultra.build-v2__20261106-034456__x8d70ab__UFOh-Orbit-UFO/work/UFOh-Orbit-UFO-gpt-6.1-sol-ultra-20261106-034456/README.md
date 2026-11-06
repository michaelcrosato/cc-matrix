# UFOh Orbit

Open the delivered HTML directly in a browser. It is self-contained and needs no server, downloads or account for solo or couch co-op.

Pilot an overconfident saucer through a complete four-sector mission. A complete blue ring protects one ram or missile. Shooting spends it; continuous fire keeps it empty. While recharging you move at half speed. The white cannon bead rotates clockwise toward your request. Break a cluster to make a chain. Gold command emitters are open targets.

- Controller: left stick move, right stick aim, R2 or Cross fire, Options pause. PlayStation labels default; Xbox labels are in Controls.
- Keyboard/mouse: WASD or arrows move, mouse aim, click or Space fire, Escape pause. All screens support mouse, keyboard and controller.
- Touch: invisible left movement stick and right aim stick. Automatic aim and deliberate firing bursts preserve recharge opportunities. A rescue action appears beside an available wreck.
- Local Co-op: choose keyboard+pad, two pads, or a split keyboard (P1 WASD/F; P2 arrows/period). A ready shield touching a wreck revives your partner. Both down ends the flight.
- AI Hub: an embedded session launches automatically. Authority owns combat; guests send intent. Menus are local and shared time continues. World-changing dev tools are unavailable. Independent HTML does not supply a separate room service.

Mission and Score Attack have separate local records and six-character name entry. Storage denial leaves the game playable for the current visit. The title starts a 76-second real-simulation showcase after ten seconds idle; any intentional input returns to the menu.

Pause → Dev Mode provides tuning, invulnerability, actor/formation spawning, sector/wave/boss jumps, single stepping, playback speed, collision/aim overlays, input replay/snapshot export and validated content import/export. Dev and attract flights never enter score records. See `docs/content.md` for content authoring, `docs/network.md` for authority and protocol details, and `docs/research.md` for historical evidence and unknowns.

Build from this folder with `npm run build`. The packaged root HTML and `build/game.html` are identical. `npm test` runs the complete suite, printing failures and one count line. Detailed reports and purposeful screenshots are under `artifacts/`. The installed Python Playwright environment is used without installing browsers. Read `docs/verification.md` for scope and limitations.

The native my-3D2dge engine is unmodified. Custom code uses its fixed-step timing, native scene/shell/input/settings/synth systems, pixel primitives, palette ramps, depth-sorted actors, material/shape registries, Path and tween/easing facilities. Full engine MIT notice and unchanged released Hub client are embedded in the HTML.
