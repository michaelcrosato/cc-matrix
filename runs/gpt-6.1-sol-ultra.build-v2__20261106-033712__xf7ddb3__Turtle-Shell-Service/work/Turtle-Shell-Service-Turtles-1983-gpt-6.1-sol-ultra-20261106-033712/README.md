# Turtle Shell Service

Open the final HTML in the containing delivery folder. It is self-contained: no server, runtime downloads, art files or audio recordings are needed for standalone play.

Check in alone or together, investigate question-mark rooms, carry each hatchling to its matching edge home, and rescue all 26 guests across five floors. Blue beetles wander, yellow beetles see along corridors, and red beetles follow around corners. Plant a bug bomb to stun them and ring the central supply bell for more. The third team hit ends the shift.

Controls:

- Keyboard: WASD or arrows, Space bomb, Escape menu. Mouse: click a corridor to walk, right-click bomb.
- Controller: stick/D-pad, Cross bomb, Options menu, Circle back. PlayStation glyphs default; Xbox symbols are in Controls.
- Shared keyboard: P1 WASD/Space, P2 arrows/Right Shift. Keyboard plus controller and two-controller assignments are also available.
- Touch: drag anywhere for an invisible four-way stick; contextual POP and optional imminent-contact auto-defence. Touch-only play is solo; assisted records are separate.

Remote 1–2 player co-op is available when launched through AI Hub. Standalone multiplayer is simultaneous local co-op. Hub owns remote seats, countdown, results and the next round; there is no independent remote lobby.

Pause offers native settings/rebinding, About, and developer tools. Developer tools include five-floor selection, live balance sliders, invulnerability, inventory/encounter tools, stepping, time scale, graph/LOS/contact/outcome views and state inspection. Changed runs are practice. Normal restart restores production balance.

Development commands (from this directory):

```
npm run build --silent
npm run verify --silent
```

Verification prints failures and one count line. Suites can be selected through the same command: `npm run verify --silent -- --suite sim,net,art,input,campaign,export,browser,hub`. The installed Python Playwright environment and browsers are used. Tests do not install dependencies or use fixed ports. The Hub harness serves on an OS-selected loopback port and closes its own server.

Source modules, content validation and authoring instructions are in `src/` and `docs/`. Research and local engine extension provenance are recorded separately. The required delivery interview is in the containing folder and embedded verbatim into the game's paged About screen.
