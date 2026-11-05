/* ---- every word the player reads: the Gaunt's lines, the story, the cards. {CLASS} is the hero's class ---- */
const LINES = {
  start: 'THE GAUNTLET IS DOWN. COME AND GET IT.',
  fading: '{CLASS}, YOUR LIFE FORCE IS FADING.',
  starving: '{CLASS} IS STARVING!',
  dying: '{CLASS} IS ABOUT TO PERISH!',
  eaten: '{CLASS} HAS BEEN EATEN.',
  rise: '{CLASS} RISES AGAIN. HOW TIRESOME.',
  tip_food: 'LIFE FORCE DRAINS WITH EVERY BREATH. EAT.',
  tip_dontshoot: 'NEVER SHOOT THE SUPPER.',
  shot_cider: '{CLASS} SHOT THE CIDER!',
  shot_feast: '{CLASS} SHOT THE SUPPER!',
  ate_stew: '{CLASS} ATE THE STEW. A POOR CHOICE.',
  shot_stew: '{CLASS} SPILLED THE STEW. GOOD.',
  glutton: '{CLASS} EATS FOR FOUR.',
  tip_stairs: 'THE STAIRS GO DOWN. THEY ALWAYS GO DOWN.',
  tip_ghost: 'HUNGERGHOSTS. THEY HAVE NOT EATEN IN NINE CENTURIES.',
  tip_generator: 'THAT {THING} BREEDS THEM. BREAK IT.',
  tip_gnasher: 'GNASHERS. ALL TEETH, NO MANNERS.',
  tip_melee: 'TOO CLOSE TO THROW? THEN HIT IT.',
  tip_lobber: 'POT-LOBBERS THROW OVER WALLS. WATCH THE SHADOWS.',
  tip_imp: 'CINDER IMPS. THEY COOK WHAT THEY SPIT ON.',
  tip_fryar: 'THE FRYARS FADE. STRIKE WHEN THEY SHOW THEMSELVES.',
  tip_snatcher: 'A SNATCHER! MIND YOUR POCKETS.',
  stolen: '{CLASS} HAS BEEN ROBBED!',
  recovered: '{CLASS} TOOK IT BACK.',
  tithe_comes: 'THE TITHE HAS COME TO COLLECT.',
  tithe_paid: 'THE TITHE IS PAID.',
  tithe_slain: '{CLASS} CHEATED THE TITHE!',
  bell: '{CLASS} IS ON THE MENU!',
  bell_pass: 'NOW {CLASS} IS ON THE MENU.',
  tip_magic: 'MAGIC STRIKES ALL YOU CAN SEE. USE IT WISELY.',
  shot_flask: '{CLASS} SHOT THE MAGIC. MOSTLY WASTED.',
  key_first: 'A KEY. HOW THOUGHTFUL.',
  tip_door: 'A KEY OPENS A DOOR. ANY DOOR. ONCE.',
  treasure_first: 'TREASURE! THE GAUNT KEEPS COUNT.',
  special_ironbrew: 'IRON BREW. {CLASS} FEELS STURDIER.',
  special_ogreale: 'OGRE ALE. {CLASS} HITS HARDER.',
  special_quickshot: 'QUICKSHOT TONIC. {CLASS} THROWS FASTER.',
  special_hardshot: 'HARDSHOT DRAUGHT. {CLASS} THROWS HARDER.',
  special_witchwater: 'WITCHWATER. {CLASS} CRACKLES WITH MAGIC.',
  special_featherfoot: 'FEATHERFOOT CORDIAL. {CLASS} STEPS LIGHTER.',
  special_deeppockets: 'DEEP POCKETS. {CLASS} CARRIES MORE.',
  amulet_veil: 'THE VEIL. NOW YOU SEE {CLASS}. NOW YOU DON\'T.',
  amulet_ironskin: 'IRONSKIN. NOTHING BITES {CLASS}. FOR NOW.',
  amulet_stench: 'STENCH. EVEN GHOSTS GAG.',
  amulet_ricochet: 'RICOCHET. MIND YOUR HEADS.',
  amulet_rending: 'RENDING. NOTHING STOPS THOSE SHOTS.',
  tip_trap: 'THAT PLATE WAS A TRAP. ENJOY.',
  tip_tele: 'STEP ON THE RUNE. ARRIVE ELSEWHERE.',
  tip_stun: 'STUN RUNES. DO NOT DAWDLE ON THEM.',
  tip_field: 'THE FIELD HUMS. WAIT FOR THE QUIET.',
  tip_spikes: 'THE FLOOR HAS TEETH TOO.',
  tip_secret: 'THAT WALL WAS LYING.',
  tip_cracked: 'CRACKED STONE. IT WILL NOT HOLD.',
  tip_chest: 'A LOCKED CHEST. KEYS OPEN MORE THAN DOORS.',
  ally_stun_on: 'FROM HERE ON, YOUR SHOTS STUN YOUR FRIENDS.',
  ally_shot: '{CLASS}, THAT WAS A FRIEND.',
  impatient: 'THE GAUNT GROWS IMPATIENT.',
  doors_open: 'ALL DOORS ARE NOW OPEN.',
  walls_stairs: 'EVERY WALL IS NOW A STAIR.',
  stairs: '{CLASS} FOUND THE STAIRS.',
  skip: '{CLASS} TOOK THE SHORT WAY DOWN.',
  hoard: 'A HOARD! THIRTY SECONDS. GRAB.',
  hoard_shut: 'THE HOARD SLAMS SHUT.',
  hoard_clear: '{CLASS} EMPTIED THE HOARD!',
  king_near: 'THE KING SMELLS YOU.',
  king_intro: 'KING FAMISH WILL SEE YOU NOW.',
  king_eating: 'HE IS EATING. SHOOT THE FOOD!',
  king_dead: 'THE GAUNTLET IS DOWN. SO IS THE KING.',
  gauntlet: '{CLASS} HOLDS THE IRON GAUNTLET!',
  game_over: 'THE GAUNT IS FED.',
  continue: 'RISE, OR BE SUPPER.',
  high_score: 'NAME THYSELF, MORSEL.',
  joined: '{CLASS} JOINS THE FEAST.',
  floor_1: 'WELCOME TO THE GAUNT, MORSELS.', floor_2: 'MIND THE ROOTS. THEY BITE.', floor_3: 'SMOKED, SALTED, SERVED.',
  floor_4: 'THE BONES HERE ARE WELL PICKED.', floor_5: 'THE CHOIR SINGS WITH ITS TEETH.', floor_6: 'HERE LIE KINGS, IN BRINE.',
  floor_7: 'THE OVEN IS ALWAYS ON.', floor_8: 'THE GATE OF GRISTLE. NO ONE CHEWS THROUGH.', floor_9: 'DINNER IS SERVED.',
  floor_t1: 'A HOARD! THIRTY SECONDS. GRAB.', floor_t2: 'THE RELICS OF THE WELL-FED. TAKE THEM.',
  welcome_berserker: 'WELCOME, BERSERKER.', welcome_shieldmaiden: 'WELCOME, SHIELDMAIDEN.', welcome_ranger: 'WELCOME, RANGER.', welcome_hexer: 'WELCOME, HEXER.'
};
/** a line with the hero's class put in */
const line = (key, cls, vars) => (LINES[key] || key).replace(/\{CLASS\}/g, cls ? cls.toUpperCase() : 'MORSEL').replace(/\{THING\}/g, vars && vars.thing ? vars.thing : 'IT');

const STORY = {
  prologue: 'BENEATH THE TOWN OF HOLLOWMERE, A DUNGEON DIGS DOWN, AND DOWN, AND DOWN. THEY CALL IT THE GAUNT. AT ITS BOTTOM SITS KING FAMISH, WHO HAS EATEN FOR NINE HUNDRED YEARS AND IS STILL HUNGRY. EACH WINTER HE THROWS HIS IRON GAUNTLET DOWN THE PIT AND DARES THE HUNGRY TO FETCH IT. NO ONE HAS CLIMBED BACK UP. TONIGHT, FOUR FOOLS ANSWER. THE GAUNTLET IS DOWN.',
  realm_larder: 'THE TOP OF THE GAUNT, WHERE THE KING KEEPS HIS SNACKS. YOU ARE THE SNACKS.',
  realm_ossuary: 'BELOW THE LARDER LIE THE BONES OF THOSE WHO CAME BACK FOR SECONDS.',
  realm_furnace: 'THE GAUNT\'S OWN BELLY. IT IS VERY HOT, AND IT IS DIGESTING.',
  realm_banquet: 'THE TABLE IS SET. GUESS WHO IS DINNER.',
  king_intro: 'AH. DESSERT.', king_p2: 'SECOND HELPINGS!', king_p3: 'MORE! MORE! MORE!', king_defeat: '...still... hungry...',
  ending: 'THE KING FALLS. THE IRON GAUNTLET IS YOURS. YOU CLIMB FOR SEVEN DAYS, EATING EVERYTHING ON THE WAY UP. HOLLOWMERE THROWS A FEAST IN YOUR HONOUR. YOU ARE, OF COURSE, STILL HUNGRY.',
  credits_tag: 'THE GAUNT IS NOT DEAD. IT IS ONLY DIGESTING. DESCENT II AWAITS.',
  descent2: 'THE GAUNT DIGS DEEPER. SO MUST YOU.'
};
const REALMS = {
  larder: { name: 'THE LARDER', story: 'realm_larder', numeral: 'I' },
  ossuary: { name: 'THE OSSUARY', story: 'realm_ossuary', numeral: 'II' },
  furnace: { name: 'THE FURNACE GUT', story: 'realm_furnace', numeral: 'III' },
  banquet: { name: 'THE BANQUET', story: 'realm_banquet', numeral: 'IV' }
};

/** How to Play: one idea a page; {fire} and the like become the player's own keys or buttons */
const HOWTO = [
  { title: 'THE GAUNTLET IS DOWN', art: 'king', text: 'KING FAMISH THREW HIS IRON GAUNTLET DOWN THE PIT. GO DOWN, FLOOR BY FLOOR, AND TAKE IT BACK. EVERY FLOOR ENDS AT A STAIR. THE STAIRS ONLY GO DOWN.' },
  { title: 'MOVE AND AIM', art: 'move', text: 'MOVE WITH {move}. AIM WITH {aim}. WITH NO AIM, YOU THROW THE WAY YOU WALK.' },
  { title: 'THROW AND STRIKE', art: 'fire', text: 'HOLD {fire} TO THROW. AT ARM\'S LENGTH YOUR HERO STRIKES INSTEAD. HOLD {plant} TO STAND YOUR GROUND AND TURN.' },
  { title: 'LIFE FORCE DRAINS', art: 'food', text: 'YOUR LIFE FORCE FALLS EVERY SECOND. EAT ROASTS, LOAVES AND CIDER. NEVER SHOOT THE SUPPER. THE GREEN STEW IS SPOILED: SHOOT THAT ONE.' },
  { title: 'MAGIC', art: 'magic', text: 'A BLAST FLASK ({magic}) STRIKES EVERY MONSTER YOU CAN SEE. SHOOTING A FLASK WASTES MOST OF IT. THE TITHE DIES ONLY TO MAGIC.' },
  { title: 'KEYS, DOORS AND STAIRS', art: 'door', text: 'A KEY OPENS ONE RUN OF DOORS. STAND ON THE STAIRS TO GO DOWN. NUMBERED STAIRS SKIP FLOORS. WAIT TOO LONG AND THE DOORS OPEN THEMSELVES.' },
  { title: 'GENERATORS', art: 'gen', text: 'URNS, DENS AND SHRINES BREED MONSTERS UNTIL YOU BREAK THEM. WOUNDED MONSTERS SHRINK: THE SMALLER, THE WEAKER.' },
  { title: 'FRIENDS', art: 'friends', text: 'UP TO FOUR ON ONE SCREEN: {join} JOINS. WHOEVER TAKES THE STAIRS GETS THE BONUS. ONLINE, PLAY IN AI HUB SESSIONS.' }
];

const QUIPS = {
  berserker: 'HITS FIRST. EATS SECOND. THINKS RARELY.',
  shieldmaiden: 'THE SHIELD IS FOR YOU. THE SPEAR IS FOR THEM.',
  ranger: 'FASTEST LEGS IN HOLLOWMERE. FASTEST TO RUN OUT OF ARROWS? NEVER.',
  hexer: 'SHE HAS CURSED BETTER DUNGEONS THAN THIS.'
};

/* ---- About and Credits (the chat reply and exit-interview.json carry the same words) ---- */
const ABOUT = {
  credits: [
    'GAUNTLETDOWN, VERSION ' + VERSION + '.',
    'Built by Anthropic claude-opus-5-5 (reasoning effort xhigh) in Claude Code, from PLAN.md.',
    'Engine: my-3D2dge v0.85.2 by Michael Crosato (MIT), patched for this game (ENGINE-CHANGES.md).',
    'Online: AI Hub Session Protocol v1, client 1.4.0 (shared world, 1-4 players).',
    'Inspired by Gauntlet (Atari Games, 1985). An original homage: no names, art, music, levels or lines from it.',
    'All music, sound effects and voices are generated in code. No audio files, no images.'
  ],
  source: [],
  testing: [],
  engine: [],
  prompt: []
};
