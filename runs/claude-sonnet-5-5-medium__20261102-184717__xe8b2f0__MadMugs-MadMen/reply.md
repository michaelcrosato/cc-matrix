The bundled game is `MadMugs-MadMen-claude-sonnet-5-5-medium-20261102-184717.html` in this folder's root. `exit-interview.json` sits beside it and parses. The four required sections are repeated in full below, since my last reply only pointed back to them.

I didn't re-run the attract-mode and AI Hub test files after the last About-screen change. The phone-width title fix is also not re-screenshotted. The systems tests still pass, 73 of 73.

## Source Information
- Date: 2026-11-02 18:47
- Source: Mad Men (2007-2015)
- Genre and Perspective: narrative adventure with pitch card-play (Adventure / Life Sim); three-quarter view, switchable to isometric and top-down
- Tech: my-3D2dge v0.85.1 (2D canvas engine), one HTML file, AI Hub session client 1.3.0
- Art Direction: engine-native HD pixel look, 3D skeleton Humanoids drawn as pixel art, a lit 1963 office with warm lamps
- Animation: engine Humanoid rigs (poses, expressions, live portraits), tweens and scripts
- Audio: all code-written; cool-jazz music, typewriter and office sound effects, Animalese-style gibberish voices
- Online: AI Hub Session Protocol v1, parallel mode, 1 to 4 players, each with their own copy of the day
- Testing: headless systems, attract-mode and AI Hub tests; AI Hub harness; real-browser playthrough with keyboard, mouse, fake gamepad and touch; WebKit viewport matrix
- Research: read the engine handoff and AI Hub docs; none online about the show, tone from memory
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: unknown

## Testing Feedback
- **How many issues did testing catch?** About 12. Examples: the office door sealed by filing cabinets, no TRUTH card from the files, Escape pausing instead of closing the notebook, and mouse hover never activating. Stick inversion didn't apply when the browser's gamepad property was read-only, HUD and pitch cards overlapped, and card text overflowed.
- **How many were critical?** Two. The sealed Hollis door (NPCs could never leave the office) and the missing TRUTH card (one pitch theme was unobtainable).
- **Most helpful test:** the headless systems test that drove every interaction, together with the browser playthrough with screenshots.
- **Least helpful test:** the viewport matrix, which came back clean and showed nothing the playthrough hadn't.

## Engine Feedback
- **Liked most:** headless fixed-step testing, plus ready-made rigs, live dialog portraits, lighting, settings, saves and the pause menu.
- **Stuck or guessed wrong?** Yes. Dialog fires `onChoice` and then `onDone` on the same object. `FlowField` treats tall walls as separate islands. `input.lastDevice` doesn't switch to mouse on movement alone. The engine's own button-symbols setting had to be overridden to default to PlayStation.
- **Most important thing built myself:** the conversation runner (nodes as data), the typewriter and pitch games, the attract-mode bot, and the stick-inversion wrapper.
- **Hardest part:** knowing which behaviours the engine owns (Escape pausing, click handling, dialog callbacks), since the manual lists names but not the order things happen in.
- **Remove or overhaul:** nothing to remove; Escape always pausing could be a per-mode setting.
- **Change one thing:** add first-class inverted stick axes and a mouse-hover input flag.

## Prompt Feedback
- **Liked most:** the clear deliverable list and the exact exit-interview JSON shape.
- **Confusing:** "native perspectives" versus the point-and-click row of the playbook, and whether "no title screen in a session" also covers the ending screen.
- **Hardest thing:** making one game cover narrative, exploration and two mini-games as a complete slice, with no art assets.
- **One test I'd add:** a real DualSense on a TV at 10 feet, checking glyphs, stick feel and dead zones.