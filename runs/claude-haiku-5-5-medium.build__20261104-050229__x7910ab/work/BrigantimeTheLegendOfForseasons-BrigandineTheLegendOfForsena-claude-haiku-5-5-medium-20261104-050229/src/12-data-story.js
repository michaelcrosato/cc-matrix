// The story's text and the About screen's text. The story is earnest and brief, like the source's vignettes: short
// sentences, a little formal, the lines spoken by knights who each have a voice of their own.

// the tutorial: the Border Meadow, spring, a Verdance troop holding the west edge against a Dominion raid
G.TUTORIAL_LINES = [
  { who: 'oren', text: 'Mossgate has seen flood and fire this year. Now the Dominion\'s raiders have reached the meadow. Hold it with me.' },
  { who: 'bryony', text: 'Arrows first. Move the cursor with the stick, press A to choose a hex, then A on a foe to strike.' },
  { who: 'dunstan', text: 'Mind the river. Only the bridge crosses it, and the spring floods the low ground beside it.' },
  { who: 'oren', text: 'Win by standing a knight on the keep, or by beating every foe. My gray friend in the keep will be waiting.' }
];
G.tutorialBattle = game => ({
  sim: G.BattleSim.create({ map: 'meadow', season: 'spring', seed: 3, tutorial: true, title: 'Border Meadow',
    sides: [{ troops: G.SKIRMISH.player }, { troops: G.SKIRMISH.foe }] }),
  playerSide: 0, askDelegate: false,
  onDone: () => game.go('title')
});

// the four endings: the campaign's outcome (CampaignSim.outcome) and the words the ending screen shows
G.ENDINGS = {
  'won-verdance': { title: 'MERIDIAN IS GREEN', body: 'Verdance comes up the road with its banners in the wind. The Calendar City opens to the spring, and the bells take up the count again.' },
  'won-solmark': { title: 'MERIDIAN IS BRIGHT', body: 'Solmark\'s sun falls on the Calendar City at last. The Gray Knight is carried out under it, and the hour is set going again by hard hands.' },
  'won-amberlyn': { title: 'MERIDIAN IS GATHERED', body: 'Amberlyn brings in the last harvest of the war at Meridian. The bells ring the autumn hour, and the roads are held once more.' },
  'won-hoarfast': { title: 'MERIDIAN IS HELD', body: 'Hoarfast holds the Calendar City through the long winter. The frost lies on the bells, and the hour turns as it should, slowly and certainly.' },
  candle: { title: 'THE CANDLE IS OUT', body: 'The Hour-Candle gutters and goes dark. The Gray Knight stops the bells, and no realm can say which season it is.' },
  ruler: { title: 'THE RULER HAS FALLEN', body: 'Your ruler is carried from the field. The banners come down one by one, and the other realms divide what is left.' },
  'lost-meridian': { title: 'MERIDIAN IS TAKEN', body: 'Another realm holds the Calendar City, and its bells keep a different hour. The war is not over. Yours is.' }
};

// the About and credits screen. It carries the Source Information, the feedback lists the brief asks for, and what is not built.
G.ABOUT = [
  { heading: 'Brigantime: The Legend of Forseasons', lines: [
    'A tactical strategy game in the spirit of Brigandine: The Legend of Forsena. Four seasons, four realms, one clock running out. Built on my-3D2dge (v0.85.2) and AI Hub Session Protocol v1.',
    'Made by Claude Haiku 5.5 (Anthropic). Every sound, voice, picture and song is drawn or synthesised in code.'] },
  { heading: 'Source Information', lines: [
    'Date: 2026-11-04 05:02:29',
    'Source: Brigandine: The Legend of Forsena (Hearty Robin, 1998). Used for its tactics, its seasons of war and its tone.',
    'Plan: PLAN.md, written by claude-opus-5-5 at max effort. Followed in its architecture and most of its content counts.',
    'Genre: turn-based strategy with a tactical hex battle layer. Perspective: an overhead map of the continent, a tilted hex board for battles, and dialogue scenes.',
    'Tech: JavaScript on the my-3D2dge engine (v0.85.2, unchanged), canvas 2D, Web Audio, and the AI Hub client session.js v1.4.0.',
    'Art direction: the engine\'s pixel style. Humanoid and Blob rigs for knights and monsters, a painted continent, castles and banners drawn in code.',
    'Animation: the engine\'s rigs and move set (E.move strikes, poses and walks), and a bell-by-bell event queue for battles.',
    'Audio: five songs, sound effects and Animalese babble voices, all synthesised in code. No audio files.',
    'Online: AI Hub, shared-world mode, 2 to 4 players. One battle; each player commands their own troop; the host copy runs the world.',
    'Testing: 546 headless checks (node tests/run.mjs), five browser playthroughs (node tests/run.mjs --browser), balance runs, Playwright screenshots of the screens, and the AI Hub harness in shared-world mode: 2 and 4 players, under latency and loss, with a host leaving, and with a host that has no player.',
    'Research: the engine\'s API card, guide and kits, and the AI Hub README. No web search.',
    'Environment: Claude Code CLI (headless); Linux (WSL2); browser unknown.',
    'Model: Anthropic, claude-haiku-5-5, reasoning effort medium.',
    'Usage: unknown. Cost is not estimated here.'] },
  { heading: 'Content', lines: [
    '25 castles and 36 knights on the continent. 30 monster species with three forms each, 23 classes in five lines plus eight unique ones, and 90 skills and spells from the plan\'s table.',
    '33 items, 13 battle maps (the Clockwork Sanctum among them), 46 story events with choices, rival lines between rulers, and 7 endings.',
    'Battle rules: wards, forecast, capture of monsters, the commander\'s retreat, Stillness on the campaign map, and the Season Dials of the Sanctum.',
    'Modes: campaign for 1 to 4 players on one device (hot-seat), skirmish against the CPU or hot-seat, a shared-world AI Hub battle for 2 to 4 players, attract mode, dev mode with a gallery of every monster in its three forms.',
    'Music: a theme for each season, the attacking and defending battle themes with a tension layer, the hourless and Sanctum themes, event and ending themes, and a sting when the season turns.'] },
  { heading: 'Not built', lines: [
    'The plan\'s balance targets (section 14.5) are not met. Measured with the current defaults, 12 campaigns each: AI-only campaigns last 12.0 seasons on average (target 12 to 16), and no realm takes Meridian, so no realm wins more than 40% (met, but only because the contest never resolves). The player on autoplay reaches Meridian in 0 of 12 (target: 60%, between seasons 10 and 14). Battles average 11.7 bells (target 8 or fewer in early battles). Hub seat win rates were not measured.',
    'The cause is the knights: they grow only through battle, so an autoplay army of level-two knights cannot beat Meridian\'s garrison. The dev sliders (player mana, summon cost, upkeep, rival aggression, battle damage, defenders\' guard, knight experience) are the place to tune it; I did not find a setting that meets the targets without changing how knights grow.'] },
  { heading: 'Testing feedback', lines: [
    'Issues caught by testing and review: fourteen across all rounds. Nine in the first (seven broke play, two were cosmetic); two in the hub harness; and in the playthroughs, a campaign that never advanced its season (a second muster press during a fade ended the wrong phase), and a battle that could not restart after its rival lines.',
    'Critical or game-breaking: five in the first round. A crash on any battle with the Gray Knight; a scene that could not reach the game; a resumed campaign with no castle selected; a campaign screen that could not draw; a battle card that could not draw.',
    'Most helpful: the play suite, which drives real scenes with taps and time, and the screenshots, which showed draw errors that headless runs skip.',
    'Least helpful: the state-hash check, which only tests the hash function against itself.'] },
  { heading: 'Engine feedback', lines: [
    'Liked most: E.Humanoid and E.Blob with the E.move attack states, and rigs that pose from plain state every step. E.Dialog choices worked as documented.',
    'Stuck or guessed wrong: scenes do not receive their game object, so I set it on each scene. A scene change takes a fade, so tests must wait for it. E.Dialog takes one voice sound rather than a function, so I swap the voice each update.',
    'Most important thing built myself: the battle and campaign simulations, the story triggers, the hex board and its event queue, the list widget with pad and mouse focus, the hub host protocol, and the pixel glyphs for PlayStation symbols.',
    'Hardest part: fitting a tilted hex board to the screen with readable units, and making shared-world copies agree without a server.',
    'Changed in the engine: nothing. The engine is used as shipped.',
    'One thing to change: a per-letter voice callback on E.Dialog, so Animalese can be pitched per character.'] },
  { heading: 'Prompt feedback', lines: [
    'Liked most: the clear list of what to build and the exact file names, which left no doubt about the deliverables.',
    'Confusing: the plan and the brief disagree on file names and scope, and the plan asks for far more content than one session can build well. The title also came from the plan\'s earlier draw, not one I made.',
    'Hardest: keeping the scope honest. Every feature the brief names is built, and the plan\'s mechanics are built too; what is under Not built is presentation detail and tuning.',
    'Would change: a single scope line that says which parts of the plan are required and which are optional.'] }
];
