# PLAN.md, section by section, against the final build
T = a check in tests/run.mjs, B = tests/browser.py, H = tests/hub.py, S = looked at in a screenshot or filmstrip (TASK.md: for what a script can't check). "Differs" items are listed at the end.

**0 Use.** Title by real RNG, one constant G.GAME_TITLE (T, H). notes/feedback.md kept (T).
**1 Pitch and originality.** Forbidden names grepped (T). Pillars: phase checkpoints and offered Intern (T).
**2 Direction.** overhead op, portraits, threequarter ward, side title (S). res [426,240] expand (B sizes). One self-contained file, no CDN, file:// (B).
**3 Facts.** Input map keeps base moves; music .1 (T, B); glyph labels (T, B); pad reading (B); Shell tv (B pause rows); touch notice patch (B); session options (H).
**4 Flow.** Every scene reached: title, menu, difficulty, story, chart, op, lost, results, ward, casefiles, lobby, about, credits, attract, hubround (T playthrough and draw pass, H). First launch to Case 1 with real keys (B).
**5.1 Table, HUD.** Monitor, clock, objective, speaker, bark, gauge, flow, cursor prompt (S); inside the screen at four sizes (B, S).
**5.2 Vitals, clock, slips.** Drains, clock loss, slips (T). Beep, racing heart, double thump, readouts (T); number and CRITICAL text (S).
**5.3 Cursor.** Speed, fine, magnet, guide-follow (T). Mouse 1:1 (B). Keyboard (T). Glove, pointer hidden (B, S). Loupe (B).
**5.4 Wheel.** Eight directions, keys, flick (T). L1/R1, wheel, Q/E (B). Swap .12 s (T). Hints, and the Hints setting (T).
**5.5 Eight tools.** Each right gesture and each wrong one (T).
**5.6 Grades, Flow, ranks.** (T). Four tiles, stamp (S).
**5.7 Gifts.** Long Breath, Second Look exact restore and ghosts, Consult (T). Cold palette, tracking lines (S).
**5.8 Code Blue.** Timing, revive, loss, none on Attending (T). Paddles, marker on the peak (S).
**5.9 Closing.** Ring, stamp, chord (T via playthrough, S).
**5.10 Failing.** Checkpoint, cap at B, Intern after two failures, tutorial freeze (T). Targets (T, tools/slow.mjs).
**5.11 Feel table.** Sound, picture and rumble by row, with spies (T). Blood color setting (T).
**6 Controls.** Bindings as listed (T). Prompts by device (T, B); stick icon (S). Swap sticks, Toggle (T).
**7 Objects.** Every type in the story (T). Hidden, under pool (T). Phase scripts as data (T validator).
**8 Strains.** Staccato, Legato including snap, Tremolo, Da Capo including repeat, Fermata domes, Cantor's four movements and forced rewind (T).
**9 Cases.** All eleven play in order (T). Lightbox rewards and penalties (T), film art (S). Skills Lab by unlocks (T). Grand Rounds (T).
**10 Story.** All beats written in src/data/story; 215 lines; line length, speakers, expressions, reachable nodes (T). Barks: shared pool, per case (T).
**11 Ward.** Two maps, talk, Morale, door within 8 tiles, autosave (T). Hover and click (B).
**12 Grand Rounds.** Scales by N, 1 to 4 bots, retractor solo and two (T). Couch join (T). Hub: four runs, client stroke, standalone (H). Awards, standings, a player leaving (T), on the results screen (S).
**13 Attract.** 10 s on title, menu, casefiles, lobby (T); exits by key, mouse, click, stick, pad (T, B); loops twice; never saves (T); on phones (B).
**14 Dev.** Four tabs (T). Every slider has a behavior test, Reset (T). Cheats (T). Jump, spawn (T). Info, Copy (T). No rank saved with changed tuning (T). Hidden in sessions (H).
**15 UI.** Focus and hover (B). Settings list (T). Case Files one folder at a time (S). About sections (B).
**16 Art.** Seven sites, ten stages, cast of sixteen busts, instruments, tiles, title, lightbox (S). Counts and hospital shapes as data (T).
**17 Animation.** Poses and cinematics (S filmstrips). Field and strains procedural (S).
**18 Audio.** Effects, voices, choir not silent; music below effects (B). No audio files (T). Mix defaults (T).
**19 Architecture.** Sim plain data, deterministic (T). Content as data, CONTENT.md (T).
**20 Testing.** One command; all listed groups present (T, B, H). check.mjs and filmstrip.mjs run (S).
**21 Build order.** Reached M9.
**22 Done checklist.** notes/checklist.md.

## Differs from the plan, on purpose
- Section 9's clocks and counts are raised in most cases (extra.js). Section 9 says they are defaults to balance. Every case now takes a first-timer 3 to 5 minutes on the winning try, tested.
- Case 11's batons rest 2.8 s, not a number the plan sets; it takes a first-timer 3.3 minutes on the winning try, after 5 tries (plan: 3 to 6).
- Staccato bite damage, Tremolo miss damage and Da Capo's growing window are tuned from bot runs (section 5.10: "tune its numbers").
- Section 19's file list is partly merged; the dithering is softer than Appendix A.

## Not possible on this computer (TASK.md: "never required")
A person's hands, a physical controller, someone listening, a real iPhone or iPad, a TV. Stand-ins used as TASK.md directs.
