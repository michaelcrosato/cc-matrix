# Smithereen Royal Rumble

Open the HTML in the parent folder directly. It is self-contained and works offline. Hosted online play is entered by AI Hub; standalone supports solo and simultaneous same-device versus.

Hold **Space / left mouse / Cross** to wind. Release to throw. Watch the landing marker: full tension overshoots. **Q/E / L1/R1** changes stone; **C / right mouse / Circle** cancels. **Escape / Options** opens pause. Keyboard player two uses **Right Shift** and **U/O**. Touch holds in the friendly half and releases to throw; contextual arrows select stones. Controls can be rebound, glyphs changed to Xbox, and timing assistance enabled in Settings.

A castle is the objective. Crew and launcher hits interrupt briefly, then return with visible protection. Unsupported sections collapse. A ten-bout tour advances after defeat and banks the winning direct score times the bout number. The last bouts carry more weight.

`npm ci` installs pinned build/test dependencies (no browser download needed on this workstation). `npm run build` deterministically publishes the exact single HTML and exit-interview.json to the parent folder, using metadata.json as the source for both credits and interview. `npm run verify` runs simulation, complete-tour, devices, artifact, production audio and official Hub harness checks, printing only failures and one count. Python Playwright uses the installed workstation venv; Node Playwright is pinned1.63.0 and uses the already installed browsers.

Developer tools are available in Pause. They include live tuning with units/reset, scenario tools, exact stepping, AI seats, debug overlays and validated version1 court editing/import/export. Developer-assisted runs are marked. Hub players have read-only diagnostics.

See REQUIREMENTS.md for implementation/evidence mapping, ../PROGRESS.md for checkpoints and issue history, and artifacts/verification.json and the suite JSON files for observed tests. Deliberate screenshots cover title focus, charged combat, collapse, repair/protection, phone framing, results and credits. Audio tests establish finite signals and bus isolation; sound quality is unknown without a listener.
