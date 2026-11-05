/* MAD MEN OUT — the About / Credits pages: source information and the build's feedback, as shown in the game. */
const ABOUT = [
  ['ABOUT', [
    'Mad Men Out is an original spiritual successor to the television series Mad Men (2007-2015). Its characters, agency, clients and lines are new; the period, the tone and the business of persuasion are the inspiration.',
    ['How it plays', 'Three working days at Bellweather & Crane, 1962. Walk the eleventh floor, talk to the staff and look around to gather INSIGHTS, each with an angle (desire, status, nostalgia, safety, freedom). Learn what the client really wants. Write a campaign of up to three cards at your typewriter, then pitch it: read the client, time each slide on the delivery meter, pivot out of a bad one, and land the close on the beat.'],
    ['What carries over', 'Composure and haze (drinks steady you but make delivery harder), rapport with five colleagues, a secret named Walter Penn, and the accounts you win. Three endings.'],
    ['Modes', 'Campaign (3 days), Pitch Gauntlet (solo, three random clients), Pitch-Off (2 players on one machine), and the AI Hub parallel round (1-4 players online, the same deal for everyone).']
  ]],
  ['CONTROLS', [
    ['Controller (DualSense or any standard pad)', 'Left stick or d-pad: walk, move the focus.  ✕ talk / use / confirm.  ○ back.  △ the deck.  □ pivot in a pitch.  R1 camera view.  R2 or L3 hurry.  Options: pause menu.'],
    ['Keyboard and mouse', 'WASD or arrows: walk.  E, Space or Enter: talk / use / confirm.  Esc or Q: back.  Tab: the deck.  R: pivot.  V: camera view.  Shift: hurry.  Mouse: hover to focus, click to walk to people and things or to pick menu items and cards; the wheel zooms.'],
    ['Settings', 'Button symbols (PlayStation by default, or Xbox A B X Y), Invert horizontal and Invert vertical for controllers that report their axes the wrong way, text speed, client tells, a wider delivery window, voices.']
  ]],
  ['SOURCE INFORMATION', [
    ['Date', '2026-11-02 18:13'],
    ['Source', 'Mad Men (2007-2015), the AMC television drama created by Matthew Weiner'],
    ['Genre and Perspective', 'Narrative adventure with a persuasion (pitch) minigame and light management; three-quarter top-down view in the office (switchable to isometric or top-down), a side view for the evenings'],
    ['Tech', 'my-3D2dge v0.85.1 (full edition, one file, no dependencies), plain JavaScript, Web Audio and Canvas 2D through the engine; AI Hub session client 1.3.0; Node 22 and Playwright 1.63 for tests'],
    ['Art Direction', 'The engine\'s native style: code-drawn pixel art at 320x240 (expanded to the screen), HD Humanoid rigs dressed in 1962 suits and dresses, mid-century furniture written as engine shape data (walnut, chrome, teal and orange), canvas lighting'],
    ['Animation', 'The engine\'s procedural rigs: walking, poses (hips, wave, cast, cheer), expressions, live dialog portraits with moving mouths, camera fades and transitions'],
    ['Audio', 'Code-written cool-jazz music in the engine\'s step notation (lounge, pitch, evening, win, lose), chip sound effects (typewriter, ice, telephone, applause), and Simlish-style gibberish voices synthesized per speaker'],
    ['Online', 'AI Hub Session Protocol v1, parallel mode (1-4 players): seeded deal, progress, result, time-up and end handling; no other network use'],
    ['Testing', 'Headless Node tests of every system and a full three-day playthrough; Playwright in Chromium, Firefox and WebKit; the AI Hub harness; viewport matrix of phones, tablets and desktops'],
    ['Research', 'None beyond the engine\'s and the hub\'s documentation; the source is described from general knowledge'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort medium'],
    ['Usage', 'unknown']
  ]],
  ['TESTING FEEDBACK', TESTING_FEEDBACK],
  ['ENGINE FEEDBACK', ENGINE_FEEDBACK],
  ['PROMPT FEEDBACK', PROMPT_FEEDBACK],
  ['CREDITS', [
    ['Made by', 'Claude (Anthropic, claude-opus-5-5) in Claude Code, for Michael Crosato\'s game matrix'],
    ['Engine', 'my-3D2dge by Michael Crosato: rigs, lighting, sound, menus and settings'],
    ['Online', 'AI Hub Session Protocol by Michael Crosato'],
    ['Inspired by', 'Mad Men, created by Matthew Weiner (AMC, 2007-2015). This is a fan-made, original work and is not affiliated with or endorsed by its makers.'],
    ['Thanks', 'To every copywriter who ever stared at a blank page at four in the afternoon.']
  ]]
];
