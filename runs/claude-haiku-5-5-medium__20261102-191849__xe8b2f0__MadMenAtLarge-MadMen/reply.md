The game is built and checked. It is a single HTML file with the 0.85.1 engine inlined. The title is "Mad Men at Large" (drawn at random from 50 candidates; the candidate list was in a scratch file, not shown). The bundle, `exit-interview.json`, and the dev folder are in the work folder.

**What it is:** a workweek on Madison Avenue, 1963. Three days, one client pitch each (Starbrite, Kestrel, Cobalt). You walk the office, talk to colleagues with choices, pour bourbon, smoke, call home, and pitch in a boardroom via a timing minigame. Standing, Composure, Whiskey and Home pull against each other, and the ending depends on accounts won and Home.

**Requirements:**
- **Attract mode:** after 10 s idle on the title the demo plays a day on its own, and any button returns to the title.
- **Controls:** keyboard, mouse and pad, with prompts following the last device used. Settings add PlayStation or Xbox symbols, and separate left/right and up/down inversion.
- **Touch-only devices:** the title shows "Controller or keyboard required" and keeps Settings and the attract demo.
- **About/Credits:** an in-game screen with the four required sections.
- **AI Hub:** parallel mode, 1–4 players, using the unmodified `session.js`.

**Verification:**
- **Rules:** 21 unit tests pass.
- **Engine:** 65 headless checks pass, including a bot playthrough of the whole week to an ending.
- **Hub harness:** passes with 2 players and with 4 players under 150 ms latency and 5% loss.
- **Browser:** no console errors in Chromium. Viewport matrix, 24 sizes in Chromium, WebKit and Firefox, is clean.

**Issues found and fixed (7 in the game):** the attract demo never reached the boardroom; the pitch prompt sat on the box border; the summary log overlapped its prompt; credits ran past the right edge; the middle dot rendered as "?"; the scroll hint showed raw letters; the touch-only message could never show (the engine defaults to keyboard). None were game-breaking.

**Two things to know:**
- A first viewport run and hub-harness run hit another agent's server on port 8765 and tested the wrong game. I reran both on my own port (8831) and the results above are from that rerun.
- I could not test a real DualSense or a real iPhone. The touch-only check used an injected touch count in WebKit emulation.

**Choices I made:** the characters are original; the source is referenced by name only. No research was done beyond my own knowledge of the show.

**Usage:** cost unknown. About 0.29M tokens by the session budget counter, breakdown unknown. About 14 minutes.

**Source Information**
- Date: 2026-11-02 19:18
- Source: Mad Men (2007-2015)
- Genre and Perspective: Life Sim with a timing-based pitch minigame. Third-person 3/4 view.
- Tech: my-3D2dge 0.85.1 (inlined, MIT), JavaScript, Canvas 2D. Hub client session.js 1.3.0.
- Art Direction: pixel art in the engine's SNES-style 3/4 view, a 1963 office palette.
- Animation: my-3D2dge procedural rig animation (Humanoid).
- Audio: chip-synth music and sound effects from the engine. No voice work.
- Online: AI Hub parallel session, 1 to 4 players. Progress and result only.
- Testing: 21 rules tests, 65 engine checks (a three-day bot playthrough), the AI Hub harness, Chromium, WebKit and Firefox screenshots at 24 sizes.
- Research: none (author knowledge of the source).
- Environment: Claude Code CLI (headless); Linux (WSL2); Chromium for checks.
- Model: Anthropic, claude-haiku-5-5, reasoning effort medium.
- Usage: cost unknown; about 0.29M tokens by the session budget counter, breakdown unknown; about 14 minutes.

**Testing Feedback**
- Issues caught: 7 in the game. The attract demo never reached the boardroom; the pitch prompt sat on the box border; the summary log ran into its prompt; the credits ran past the right edge; the middle dot showed as "?"; the scroll hint showed raw letters; the touch-only message could never show.
- Critical / game-breaking: 0. The demo issue stopped attract mode from showing a pitch, but did not break play.
- Most helpful test: the headless three-day bot playthrough, driven by the same inputs a player sends, through to an ending.
- Least helpful test: the first viewport-matrix run, which tested another agent's page on the same port.

**Engine Feedback**
- Liked most: E.Dialog with portraits and choices, E.Shell's HTML HUD, settings.define for game options, and TileMap rows with floorTex.
- Got stuck: the default font has no middle dot, so it drew as "?". The engine starts with lastDevice set to keyboard, so a touch-only phone does not look touch-only until touched.
- Most important thing I built myself: the office floor plan, the day and encounter rules, the pitch minigame, the endings, the attract AI, and the hub session flow.
- Hardest part: at expand the internal screen is about 225 pixels tall, so small text needs care.
- Overhaul: the default font's glyph set, with a glyph test in the engine.
- One change: lastDevice starting as unknown rather than keyboard.

**Prompt Feedback**
- Liked most: the concrete deliverable list, the hub and engine links, and the done rule.
- Confusing: "silently brainstorm" sits awkwardly with the RNG step, which needed a visible list in a tool call. "Source" and "Source Information" overlap.
- Hardest: fitting attract mode, the hub round, glyphs, inversion, touch rules and tests into one session.
- One test I could not run: a real DualSense on a real iPhone.