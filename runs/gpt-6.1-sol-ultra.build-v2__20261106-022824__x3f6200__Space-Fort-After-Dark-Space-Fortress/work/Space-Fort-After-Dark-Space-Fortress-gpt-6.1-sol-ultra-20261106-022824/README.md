# Space Fort After Dark

Open the single HTML file in the parent folder in a modern browser. It contains the engine, released Hub client, art, audio, encounter data and application code; standalone play needs no server or download.

- Solo: Play siege.
- Couch: Co-op, then Options on additional controllers, or 2 for a second keyboard pilot.
- Online: import/open the HTML through AI Hub. Online rooms are provided by Hub.
- Keyboard/mouse: WASD/arrows move, mouse aims, click or J fires, Space boosts, E/right click pulses, Escape pauses.
- Controller: left stick moves, right stick aims, R2 fires, L2 boosts, Square pulses, Cross confirms, Circle backs out, Options pauses.
- Shared keyboard: P1 WASD and F/G/H; P2 arrows and period/slash/comma.
- Touch: floating invisible left drag moves, right drag aims and fires. Aim/fire assist covers the right thumb's absence. Pulse/boost appear contextually.
- Pause → Dev mode exposes live tuning, threat/encounter previews, boss phases, refill, invulnerability, collision display, speed and single-step. Modified runs never replace normal best scores.

The complete successful siege lasts about 10½ minutes. Three acts, eight authored beats, two independent refits, eight threats and three boss phases share one deterministic simulation. Early wipes consume a defense line; a final wipe or destroyed base loses. When teammates survive, destroyed pilots redeploy after four seconds. Loss takes priority over success on a simultaneous tick.

Run from this folder:

```sh
npm run build
npm run verify
```

No package install is needed on the supplied workstation. The verifier uses Node and the installed Python Playwright environment. It captures child chatter and prints only failures and one total line. It runs simulation, rendering, networking, packaging, input/browser, audio signal, official Hub scenarios, and replicated gameplay checks. Individual suites can be selected: `npm run verify -- simulation online`.

Build writes the final HTML in the parent folder. Its factual About/Credits pages and the parent exit-interview.json share the same data. See docs/research.md for historical evidence and pinned source revisions; docs/issues.md for unique fixed issues; docs/*report.json and docs/hub*evidence.json for machine evidence; docs/evidence for inspected visuals.

Physical controllers, a real TV, touch hardware, actual iOS and human listening were unavailable. Standard pads, multi-touch, WebKit's iPhone profile and finite audio signals were tested with the documented stand-ins.
