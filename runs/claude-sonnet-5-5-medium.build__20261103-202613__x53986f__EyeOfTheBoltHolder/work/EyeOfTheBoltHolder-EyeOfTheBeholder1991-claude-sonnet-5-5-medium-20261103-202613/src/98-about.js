/* ABOUT & CREDITS: one source of truth (the build writes exit-interview.json from the same facts). */
B.ABOUT = (() => {
  const SI = {
    Date: '2026-11-03 20:26:13', Source: 'Eye of the Beholder (Westwood Associates / SSI, 1991; MS-DOS and Amiga)', Plan: 'PLAN.md',
    'Genre and Perspective': 'Real-time, first-person, grid-based party RPG dungeon crawler. A first-person party view with tweened steps and quarter turns, plus a top-down automap.',
    Tech: 'my-3D2dge v0.85.2 (2D engine from dist/handoff) and my-3D2dge 3D v0.85.2 (three.js r182 WebGPU / WebGL 2, Rapier 0.19.3, via jsDelivr); AI Hub session client 1.4.0; Node 24 and Playwright 1.63.0 for the tests; plain JavaScript in one HTML file.',
    'Art Direction': 'The engine\'s native retro-modern look: code-drawn low-res 3D (pixel resolution, toon light, outlines, fog), rigs as pixel-art cards, procedural textures, pen-drawn mechanisms and boss, a brass "lockwork" UI.',
    Animation: 'The engine\'s procedural rigs and moves (E.Humanoid, E.Blob), a tweened first-person camera, pen-animated mechanisms and the Bolt-Holder, telegraphed monster wind-ups and first-person weapon swings.',
    Audio: 'The engine\'s chip synth (step-sequencer songs with a combat layer, stings, synthesized sfx). Voices from a custom WebAudio formant babble synth (Animalese/Simlish style). No audio files.',
    Online: 'AI Hub Session Protocol v1, ghost mode, 1 to 4 players (the Rat Run race); a solo time trial against your own best-run ghost.',
    Testing: 'Headless: Node vm tests of the sim, content lint, a scripted playthrough bot, and Playwright (Chromium, WebGL 2) browser checks plus the AI Hub harness. Screenshots only for what scripts cannot judge. No subagents.',
    Research: 'Planning research from PLAN.md (Giant Bomb, MobyGames, oldgames.sk and knowledge of the source); engine docs and the crawler kit read in the build.',
    Environment: 'Claude Code CLI (headless); Linux; browser unknown (tested in headless Chromium).', Model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium', Usage: 'unknown'
  };
  const TF = [
    ['How many issues did testing catch?', 'About 15. The main ones: the engine header\'s "</script>" text broke the inlined bundle; the 5x7 font lacks several symbols (dashes, blocks, check marks); a world only has a fixed number of lights, so making them on every floor entry ran out; top-level names clashing in the single module; the bot treated monsters behind a gate as threats and froze; picking up or stowing while facing a door opened the door instead; a non-modal dialogue froze game time in the attract mode; a spinner cell blocked the bot\'s pathing; an item dropped in a doorway was never collected; hub progress reports were tied to game time (slow in a software renderer); and three balance problems (a level 1 party wiped by the first den, XP too slow, a boss the scripted party could not beat).'],
    ['How many would be considered critical issues / game breaking?', 'Six: the broken bundle, the light exhaustion on re-entering a floor, the module-order boot crash, the attract mode freezing in its second scene, the first-den wipe and the unwinnable boss.'],
    ['What was the most helpful test you ran?', 'The scripted full playthrough: a bot that plays by the real rules through the same commands as a player, from New Game to the ending. It found the pacing, soft-lock and balance faults that unit checks could not, and it doubles as the attract mode and Dev Mode auto-play. Running the browser checks with game.advance() (no rendering) was a close second.'],
    ['What was the least helpful test you ran?', 'Wall-clock screenshot and attract-mode waits in headless Chromium. The software renderer runs at about 4 fps (0.2x game speed), so the waits were slow and told me little until I switched to game.advance().']
  ];
  const EF = [
    ['What did you like most about the engine?', 'That one small API gives a whole game: fixed 1/120 s steps with game.advance for tests, scenes, input with glyph labels and rebinding, settings, saves, a pause menu, Dialog, a chip synth, and a 3D world with pen-drawn things and rigs shown as pixel-art cards. Everything drawn by code made one HTML file with no assets easy.'],
    ['Did you get stuck or guess wrong?', 'Yes, a few times. The 3D engine header contains </script> text, which breaks an inline script. A world\'s lights must all be made at build time. The 5x7 font has a small character set. I guessed the Esc key would reach my cancel action, but the engine takes it for pause. World3D.init prints a deprecation note for its parameters.'],
    ['What was the most important thing you had to build yourself?', 'The whole party-RPG layer: a pure deterministic sim (grid movement, wiring language, plates, locks, pits, teleporters, secrets, real-time cooldown combat with telegraphed monsters, magic slots, camp, hunger, XP, boss), a presenter that mirrors it into the 3D world, a focus-based 10-foot UI kit, the babble voice synth, and the walkthrough bot.'],
    ['What was the hardest part about using the engine?', 'Making the first-person grid crawler fit it: the engine thinks in free-moving bodies, so movement, doors and collision are in my sim and the 3D hero is only a camera anchor. Making secret and illusory walls look like the baked walls was also fiddly. A software renderer made visual checks slow.'],
    ['What did you change in the engine, and why?', 'Two small patches: the Button symbols setting now defaults to PlayStation and offers only PlayStation and Xbox; and audio gained bus(name) with a voice bus and sfx(name, { pan }) through a stereo panner. Dwarf beards are drawn by the game over portraits, not patched into E.Humanoid.'],
    ['If you could change one thing about the engine, what would it be?', 'Ship a grid-crawler helper in the 3D engine: cell-based movement and tween, wall features on a wall face, and doors and secret walls that reuse the level\'s wall material. I would also widen the pixel font\'s character set.']
  ];
  const PF = [
    ['What did you like most about this prompt?', 'It gave a clear target (a first-person party crawler), a complete order of work, the exact tests and the hub rules. The plan\'s data tables made it quick to build the content.'],
    ['What was confusing?', 'The plan asks for more than a medium-effort session can build: four floors plus a race, 18 spells, 16 monsters, pen-drawn creatures, a Veil branch and several engine patches. It was not always clear which parts could be cut, and the "cut quantity, never a system" rule conflicts with that scale.'],
    ['What was the hardest thing to do?', 'Scoping the plan down to a vertical slice that still has every system (attract mode, Dev Mode, 10-foot UI, hub ghost race, a bot full playthrough) and keeping it balanced, while the only renderer available is slow.'],
    ['What would you change in this prompt?', 'Add a ranked list of must-haves and cuts for each effort level, and give one full reference floor with its walkthrough data. State what a pass looks like for the hub harness on a slow machine. Allow engine features such as a voice bus to be optional.']
  ];
  const pages = [
    { tab: 'THE GAME', title: B.TITLE, rows: [[B.TAGLINE, null], ['Version', B.VERSION + ' (' + B.BUILD + ')'], ['Premise', 'Hasp, the City of a Thousand Locks, is being locked in from below. Four heroes descend to find what is holding every bolt.'], ['How to play', B.HOWTO]] },
    { tab: 'SOURCE', rows: Object.entries(SI) }, { tab: 'TESTING', rows: TF }, { tab: 'ENGINE', rows: EF }, { tab: 'PROMPT', rows: PF },
    { tab: 'CREDITS', rows: [['The game', 'claude-sonnet-5-5 (Anthropic), medium effort'], ['Engine', 'my-3D2dge 0.85.2 (MIT)'], ['Libraries', 'three.js r182 (MIT), Rapier 0.19.3 (Apache-2.0), the AI Hub session client 1.4.0'], ['Assets', 'None. Every texture, model, sound and voice is drawn or synthesized by code.'], ['Inspired by', 'Eye of the Beholder (Westwood Associates / SSI, 1991). No names, text or assets from it are used.']] }
  ];
  return { SI, TF, EF, PF, pages };
})();
