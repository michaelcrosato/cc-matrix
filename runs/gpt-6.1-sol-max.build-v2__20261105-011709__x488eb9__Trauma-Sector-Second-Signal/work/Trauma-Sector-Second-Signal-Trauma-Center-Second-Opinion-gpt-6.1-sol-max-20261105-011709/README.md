# Trauma Sector: Second Signal

Open the single `.html` file in the parent folder in a browser. It works offline and needs no server. The game includes eleven campaign cases, eight surgical tools, both time abilities, a walkable recovery ward, case replay, an unlocked-strain Skills Lab, local co-op and AI Hub shared-world multiplayer.

Use the mouse or right stick to aim; click, Space or R2 to work. Pick tools with 1–8, the mouse wheel, Q/E, L1/R1 or a left-stick flick. Shift/L2 steadies the hand and shows the loupe. F/Triangle calls The Steady. C/Square consults in the final cases. Code Blue shocks use a click or Space, or L2 and R2 together. Prompts follow the current device and the controller glyph setting.

Enter or Cross advances dialogue; hold Ctrl or Square to skip, and B or Triangle opens the backlog. In the ward, walk with WASD or a stick, or click to walk; E/Cross talks or starts the next case. Recovery is saved on arrival. Manual save slots are available in the ward.

Grand Rounds supports one to four surgeons. Start joins another controller in its lobby, and AI colleagues can fill seats. The same case runs through AI Hub Session Protocol v1 when embedded in a session. Touch-only devices show the controller/keyboard notice and Settings; the attract reel still plays after ten idle seconds.

The standard pause menu opens with Esc, P or Options. Dev Mode exposes live tuning, cheats, case/phase and story jumps, object spawning and state information. Altered tuning and cheats mark the result DEV and prevent rank saves. Normal menu screens use Esc/Circle to go back. Music defaults to ten percent.

Run `npm run build` to rebuild the parent HTML and exit interview. Run `npm test` for the quiet test command: simulation and gesture checks, the complete campaign, two attract loops, controllers, browsers, fourteen viewport sizes, mobile WebKit, synthesized audio, all four Hub conformance scenarios, actual network gestures and packaging checks. `npm run test:fast` skips browsers and networking. Playwright 1.63 and its browser engines must be available; this machine already supplies them.

Read [CONTENT.md](CONTENT.md) for the content workshop, [notes/feedback.md](notes/feedback.md) for fixes and engine notes, and [tests/results/summary.json](tests/results/summary.json) for the latest test report. Source modules load in `src/manifest.json` order. The self-contained build embeds `src/about-data.json`, which also produces the root exit interview.

The native engine is my-3D2dge 0.89.1 (MIT). Its surgical art, portraits, instruments, effects and score are written in code. Generic furniture is from the Kenney Furniture Kit (CC0 1.0). The unmodified AI Hub client is version 1.4.0. Local engine changes cover the touch notice, adaptive sizing and mixed keyboard/mouse input.
