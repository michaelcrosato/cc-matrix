// ABOUT & CREDITS: the Source Information and the three feedback lists (the same text as exit-interview.json and the
// final reply), and the credits. "unknown" stands for anything that can't be confirmed.

G.ABOUT = {
  title: 'Brigantime: The Legend of Forseasons',
  tagline: 'Four seasons. Four crowns. One stopped clock.',
  source: [
    ['Date', '2026-11-04 05:02:20'],
    ['Source', 'Brigandine: The Legend of Forsena (Hearty Robin / Atlus, PlayStation, 1998)'],
    ['Plan', 'PLAN.md'],
    ['Genre', 'Turn-based grand strategy with a tactical RPG hex-battle layer'],
    ['Perspective', 'Three-quarter overhead continent map; tilted overhead hex board for battles (isometric alternate); side-on stages for story scenes'],
    ['Tech', 'my-3D2dge engine v0.85.2 (full edition, patched), a new BEASTS engine module, AI Hub Session Protocol v1 client 1.4.0; plain JavaScript in one HTML file; Node 24 and Playwright 1.63 for tests'],
    ['Art Direction', "The engine's native PS1-era pixel style: shaded HD Humanoids, procedural beast rigs, textured hex floors baked per season, code-drawn shapes and props, canvas lighting and weather"],
    ['Animation', "The engine's procedural Humanoid rigs and named moves (each class line its own), Blobs, and new procedural beast rigs (quadrupeds, drakes, birds, serpents) with gait, IK legs, tail springs and actions"],
    ['Audio', 'All in code: chip-synth music in the step format built on one Wheel motif changed by season, stings, about 45 synthesized effects, and Animalese-style babble voices per character'],
    ['Online', 'AI Hub shared-world sessions for 2-4 players (Banners of the Wheel); local hot-seat for 1-4'],
    ['Testing', 'Headless Node suites driving game.advance and game.debug (rules, determinism, AI, campaign, saves, story, UI flow, attract, touch, dev, hub protocol, scripted playthroughs), plus Playwright tests (the bundle from file://, a real mouse, a touch-only phone), screenshots and the AI Hub harness'],
    ['Research', 'Read the engine handoff docs (README, API, guide sections, asset card) and the AI Hub README; no web research during the build (the plan cites Wikipedia and an RPGFan review read while planning)'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort xhigh'],
    ['Usage', "API cost and token counts: unknown (not visible from inside the session). Session time: about 2 hours 15 minutes of wall-clock time by the system clock (05:02 to about 07:17)."]
  ],
  testing: [
    "About 33 game issues, plus about 10 bugs in my own tests and tools. Examples: a boot crash (scene registry not defined yet), a story-talk reference read before it existed, menus that took no input before their first draw, unreadable keycaps (the font's dark outline), missing glyphs, campaign AIs that never attacked, attackers that ran out the clock, an unwinnable Sanctum, battle AI turns of up to 750 ms, confirm dialogs that defaulted to No, a mouse that could not hover-focus menu items and clicks that picked the focused item instead of the one clicked, a case-sensitive Xbox setting, heal EXP paid per target, and text that overlapped on the results, realm and event screens.",
    "5 critical: the boot crash, the story-talk crash, the campaign AI that never attacked (no campaign could end), the unwinnable Sanctum (no campaign could be won), and battle AI stalls of up to 750 ms per move.",
    "The scripted playthroughs: a full four-year campaign for each realm, driven through the real scenes by input and autoplay until the ending and credits. They found the stalled campaign AI, the unwinnable Sanctum, the input-order bugs in the tutorial and the confirm defaults. No unit test could have caught those.",
    "The banned-word and comment greps over the build. They mostly found false positives, such as 'xxx' inside pixel-sprite strings, and never caught a real problem."
  ],
  engine: [
    "game.advance and game.debug: the game runs headless in Node with no special mode, so every scene, menu and battle could be tested by input. The Humanoid rigs with their named moves also give each class a distinct fighter for free.",
    "Yes. E.font.text draws a dark outline by default, which made the light keycaps unreadable until I passed outline:false. The pixel font has no middle dot, no PlayStation shapes (cross, circle, square, triangle) and no up or down triangles, so they rendered as ? and I drew the button glyphs myself. Menu lists compute their geometry only when drawn, so headless input before the first draw went nowhere.",
    "The deterministic battle and campaign simulations and their AIs, which also carry the AI Hub sync and the tests. After those, a creature-rig module (BEASTS) for the 30 monster species, since the engine animates only Humanoids and Blobs.",
    "Building a 10-foot, controller-first UI from the engine's pieces. The text, outline, glyph coverage and layout timing all had to be learned by screenshot, and the API is one large file with long docs, so finding the right call took time.",
    "Two small core patches in my-3d2dge.js: Dialog accepts a function voice called once per typed letter (needed for Animalese babble that follows the text), and Audio exposes sfxBus so custom Web Audio voices follow the volume and mute settings. A new engine-ext/beasts.js module adds E.Beast and E.Wings (quadruped, drake, bird and serpent rigs). Game code registers a 'board' camera view and a 'petals' weather. Details are in ENGINE-CHANGES.md.",
    "Ship non-humanoid creature rigs (four-legged, winged, serpentine) in the core, with the same named-move system as Humanoid. A monster-heavy game currently has to build its whole bestiary animation itself."
  ],
  prompt: [
    "How concrete the plan is. It has exact tunables, ASCII battle maps, full rosters, a story script and AI rules, so nearly every design question already had an answer. The done criteria and the one-command test rule were also clear.",
    "Some targets read as hard requirements but are hard to verify or reach, such as the AI-only campaign win rates. How AI Hub seats map onto realms alongside local hot-seat play was left to me. I also wasn't sure whether Usage needs numbers when no estimates are visible.",
    "Balance across the whole content load (36 knights, 30 species, 90 skills, 13 maps, about 50 story events). Getting every realm's four-year campaign to a winnable, fair Sanctum took the most iteration. I tuned away from the plan (EXP scale 1.5, a weaker Gray Knight and minions, more aggressive AI), and AI-only campaigns still rarely win the Sanctum.",
    "Mark which content is core and which is stretch, and give balance targets as ranges with a stated priority. Say up front which plan numbers may be retuned."
  ],
  credits: [
    ['Game', ['Brigantime: The Legend of Forseasons', 'Designed from PLAN.md; built by Claude (claude-opus-5-5)']],
    ['Engine', ['my-3D2dge (MIT) by Michael Crosato', 'BEASTS module written for this game']],
    ['Online', ['AI Hub Session Protocol v1, client 1.4.0']],
    ['Assets', ['Core shape library of my-3D2dge (CC0 sources: Kenney, KayKit, ambientCG catalogs)', 'Every character, beast, castle and sound drawn or composed in code']],
    ['Inspiration', ['Inspired by Brigandine: The Legend of Forsena.', 'The world, characters, music and art are original.']]
  ]
};
