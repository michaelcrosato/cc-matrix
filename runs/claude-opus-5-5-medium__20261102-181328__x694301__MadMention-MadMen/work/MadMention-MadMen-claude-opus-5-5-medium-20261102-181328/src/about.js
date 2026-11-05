// MAD MENTION: the About & Credits screen's text (source information and the build's feedback).
(() => {
const MM = window.MM = window.MM || {};
MM.ABOUT = [
  ['MAD MENTION', ['A playful riff on Mad Men: an original spiritual successor, not a recreation. Every person, agency, client and line of dialogue here is original.']],
  ['HOW TO PLAY', ['Walk the fortieth floor before two o\'clock. Talk to people and look at things to collect idea cards; every conversation costs time on the clock. Lorraine, Dot, Fran and Teddy know what the client will object to.',
    'At two, pick up to four ideas, then write a tagline from two of them. In the pitch, answer each objection with the idea whose appeal matches it, and press on the gold of the delivery meter. For the closer, hold the button through the silence and let go on the gold.',
    'Get the room to 80 to win the account. A drink steadies your nerve (a wider gold zone) but three make the needle drift. The evening choice moves your nerve and your home life.',
    'Controller: left stick walk, Cross talk/use, Triangle folio, Square change view, R2 hurry, Options pause. Keyboard: WASD walk, E or Space talk/use, Tab folio, V view, Shift hurry, Esc pause. Mouse: point at people and things, click to walk there and use them; the wheel zooms.']],
  ['MODES', ['Campaign: three accounts over one week, with an epilogue. Pitch-Off: two to four players draft ideas from one table and pitch the same client in turns (hot seat, pass the controller). Attract mode: leave the title alone for ten seconds. AI Hub sessions: one to four players each pitch the same Monday; you see the other creatives walk the floor as ghosts in their seat colors.']],
  ['SOURCE INFORMATION', [
    'Date: 2026-11-02 18:13',
    'Source: Mad Men (2007-2015), the AMC television drama created by Matthew Weiner',
    'Genre and Perspective: narrative adventure / office life sim with a card-and-timing pitch battle; three-quarter top-down view (the engine\'s threequarter), switchable to isometric and top-down in the office',
    'Tech: my-3D2dge v0.85.1 (full engine, handoff package), plain JavaScript, AI Hub session client 1.3.0 (protocol 1); no other libraries',
    'Art Direction: the engine\'s native retro-modern pixel style (PS1-era resolution, shaded HD Humanoid rigs, shapes as data, canvas lighting) in a mid-century palette of walnut, teal, mustard and orange',
    'Animation: the engine\'s procedural Humanoid rigs (walk cycles, idle breathing, poses, expressions, live dialog portraits) and engine tweens and scripts',
    'Audio: code-written jazz loops on the engine\'s chip synth (title, office bossa, pitch, closer, evening ballad, win and lose stings), synthesized sound effects (typewriter, phone, ice, projector, applause) and Simlish gibberish voices pitched per character',
    'Online: AI Hub Session Protocol v1, ghost mode (1-4 players; seeded deal, position sharing, progress and results); no other network use',
    'Testing: headless Chromium via Playwright (engine check tool, scripted play-throughs), the AI Hub harness in automatic mode; WebKit and Firefox screenshots via viewport-matrix; no real phones or real iOS Safari',
    'Research: none online beyond the engine and hub documentation; the source was drawn from general knowledge of the series',
    'Environment: Claude Code CLI (headless); Linux; browser unknown',
    'Model: Anthropic, claude-opus-5-5, reasoning effort medium',
    'Usage: unknown']],
  ['TESTING FEEDBACK', [
    'Issues caught: 13 (a mouse hint overflowing its box, hub ready() lost to a scene-change timer, touch-only gate never showing, the demo stuck on the pitch screen when left mid-pitch, keys outside the bindings not ending the demo, Enter both choosing a card and skipping the creative meeting, a pitch you could win with one card, the projector screen out of frame, overlapping prompts, an overflowing objection box, a name label left over dialog, a bad material name, a busy floor).',
    'Critical / game breaking: 3 (the AI Hub round never starting; touch-only devices getting a menu they could not use; the demo stuck on the pitch screen).',
    'Most helpful: the AI Hub harness in automatic mode, and a scripted headless play-through of a whole day with screenshots.',
    'Least helpful: the 24-device viewport matrix of the title screen: every one came back clean.']],
  ['ENGINE FEEDBACK', [
    'Liked most: shapes as data (the whole mid-century office is a few lines per desk), the Dialog box with live portraits, and coroutine scripts on game time for the pitch.',
    'Stuck or guessed wrong: game.after() timers are cleared by game.go(), so a ready() call scheduled with it never fired; input.lastDevice starts as keyboard, so it cannot tell a touch-only device.',
    'Built myself: the pitch card battle with its delivery and closer meters, the PlayStation and Xbox button glyphs, the attract-mode bot, the AI Hub ghost layer.',
    'Hardest: the pixel font has no PlayStation shape glyphs, so every prompt needed hand-drawn buttons.',
    'Overhaul: the single-step pressed() for keys bound to two actions (Enter is both start and confirm).',
    'Change: a built-in prompt widget that draws the right glyph for the last device.']],
  ['PROMPT FEEDBACK', [
    'Liked: the freedom to pick the genre, so Mad Men could be a game about talking and pitching instead of a shooter.',
    'Confusing: the multiplayer line asks for AI Hub integration and multiplayer for the game on its own; local hot seat was my reading of the second.',
    'Hardest: fitting attract mode, local versus, AI Hub and a three-day story into one vertical slice.',
    'One more test: a real DualSense on a real TV at ten feet, to judge text size and glyphs.']],
  ['CREDITS', ['Design, writing, code, music and sound: Claude (Anthropic, claude-opus-5-5) for the cc-matrix run.', 'Engine: my-3D2dge by Michael Crosato. Session client: AI Hub.', 'Thanks to the Sterling Cooper of our imaginations. No accounts were harmed.']]
];
})();
