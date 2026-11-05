/* =====================================================================================
 * 14-data-text: every player-facing string. Messages are short, present tense, second person. Inscriptions are in
 * capitals. [act:name] in a hint becomes the player's own button or key for that action.
 * ===================================================================================== */
B.TXT = {
  // movement and the world
  m_wall: "You can't go that way.", m_gate: 'The gate will not budge.', m_blocked: 'Something blocks the way!', m_locked: 'It is locked.',
  m_sealed: 'The grate above is bolted fast. There is no way back.', m_nothing: 'Nothing happens.', m_illusion: 'The wall is an illusion!',
  m_hidden: 'A hidden door grinds open!', m_click: 'You hear a click in the distance.', m_fall: 'The floor gives way!', m_pitfall: 'You fall into the dark!',
  m_twist: 'You feel a twisting underfoot.', m_darts: 'Darts fly from the walls!', m_disarm: '{name} disarms the trap.', m_disarmFail: '{name} fumbles the trap!',
  m_glint: '{name} spots a glint in the stones ahead.', m_keyTurn: 'The {key} turns. The door opens.', m_noKey: 'This key does not fit.', m_wardedLock: 'The lock is warded. It wants its own key.',
  m_picked: '{name} picks the lock.', m_pickSnap: "{name}'s pick snaps in the lock.", m_noPicks: '{name} has no picks left.', m_seal: 'A door of runes. Steel will not open it.',
  m_runes: 'The runes unravel like smoke.', m_door: 'The door swings open.', m_doorShut: 'The door swings shut.', m_doorBlocked: 'Something is in the way.',
  m_lever: 'The lever moves with a clank.', m_button: 'The button clicks in.', m_stone: 'The stone shifts under your hand.', m_rivet: 'The rivet sinks with a soft click.',
  m_plaque: 'Words are carved here.', m_alcoveEmpty: 'The niche is empty.', m_alcoveFull: 'There is no room in the niche.', m_alcoveNo: 'It will not go in.',
  m_takeAlcove: 'You take {item} from the niche.', m_place: 'You place {item} in the niche.', m_candle: 'The candle catches.', m_candleLit: 'The candle already burns.',
  m_gutter: 'The candles gutter and die.', m_candles: 'Pale light fills the chapel. Something rests on the altar.', m_moss: 'Stone grinds on stone, where the moss does not grow.',
  m_riddle: 'The alcove takes the key, turns it, and gives it back. Far off, a gate rises.', m_clack: 'With a loud CLACK, the gate locks open.',
  m_bridge: 'A stone bridge grinds up out of the pit.', m_longer: 'The corridor seems longer than it should.', m_stills: 'Something clicks deep in the wall. The air in the corridor stills.',
  m_tumbler: 'The tumblers fall into place. A gate rises.', m_tumblers: 'The tumblers clatter and fall back.', m_clock: 'The Great Clock shudders, and its hands begin to move. It chimes.',
  m_shrine: 'The stone rats seem to bow. Something glints in the empty seat.', m_raiseShrine: "The shrine's key turns. {name} draws breath.", m_shrineSpent: 'The shrine is cold now.',
  m_shrineNone: 'A ring of keys around a threshold. It waits for the dead.', m_post: 'This old wardens\' post has a sturdy door. A good place to rest.',
  m_lair: 'The stench of rats is overwhelming.', m_vaultdoor: 'The Vault Door grinds open.', m_ladder: 'You climb the ladder.', m_float: 'You float over the pit.',
  m_wardIn: 'The {item} slides into the Undergate. {n} great bolts draw back.', m_undergate: 'The Undergate opens.', m_wardNeed: 'Three keyholes, shaped like toothed discs. {n} still wait.',
  m_lockTurn: 'You heave the Great Lock round.', m_lockDone: 'The Great Lock is already turned.', m_shriek: 'The Bolt-Holder shrieks!', m_relock: 'It wrenches a bolt home!',
  m_drinks: 'The Bolt-Holder drinks the lightning!', m_stairLight: 'Light pours down the Stair to the Light.', m_jointsLock: 'Your joints lock!',
  m_secret: 'You found a secret!', m_deed: 'A hidden deed is done!', m_level: '{name} has reached level {lvl}!', m_join: '{name} joins the party.', m_leave: '{name} leaves the party.',
  m_noRoom: 'There is no room in the party.', m_hand: 'You hold {item}.', m_stow: '{name} stows {item}.', m_packFull: 'No one has room for that.', m_putDown: 'You set {item} down.',
  m_throw: 'You throw {item}.', m_take: 'You take {item}.', m_nothingHere: 'There is nothing here to take.', m_lie: '{items} lie here.', m_lies: '{items} lies here.',
  // fighting
  m_air: '{name} swings at the air.', m_reach: '{name} cannot reach from the back.', m_miss: '{name} misses.', m_noAmmo: '{name} has nothing to shoot.',
  m_kill: 'The {mon} dies.', m_killNamed: '{mon} is slain!', m_snap: "The {mon}'s {atk} snaps on air.", m_hits: 'The {mon} hits {name}.', m_down: '{name} falls!',
  m_dead: '{name} is dead.', m_poison: '{name} is poisoned!', m_held: '{name} is held fast!', m_rust: "{name}'s {item} rusts!", m_corrode: "{name}'s armour corrodes!",
  m_steal: 'The Latchkin snatches {item} and runs!', m_crumble: 'The {mon} crumbles to dust.', m_flee: 'The {mon} flees!', m_wake: 'The {mon} wakes!',
  m_sleep: 'The {mon} falls asleep.', m_holdFast: 'Golden chains hold the {mon}.', m_slowed: 'The {mon} slows.', m_bolt: 'A Locking Bolt streaks toward you!',
  m_brace: '{name} braces behind the shield.', m_cantCast: '{name} cannot cast now.', m_noSlots: '{name} has no spells ready.', m_cast: '{name} casts {spell}.',
  m_pray: '{name} prays: {spell}.', m_noTarget: 'There is nothing there.', m_wand: '{name} zaps {item}.', m_wandEmpty: 'The {item} is spent.', m_noUnlatch: 'There is nothing here to unlatch.',
  m_heal: '{name} looks better.', m_wakeUp: '{name} wakes.', m_raised: '{name} draws breath!', m_cured: '{name} is cured.', m_layHands: '{name} lays on hands.',
  m_fed: 'Everyone is fed.', m_ward: 'A brass shimmer surrounds {name}.', m_seams: 'The seams of the world show plainly.', m_feather: 'Your feet leave the floor.',
  m_steady: 'Every hand is steady.', m_free: 'Your joints are free.', m_turned: 'The dead flee!', m_bread: 'Warm bread, for everyone!', m_seeExpire: 'The seams fade from sight.',
  m_floatEnd: 'Your feet touch the floor again.',
  // camp, food
  m_noRest: 'You may not rest with enemies near.', m_awakened: 'You are awakened by something moving!', m_rested: 'The party is rested.', m_hungry: '{name} is hungry.',
  m_starving: '{name} is starving!', m_eat: '{name} eats {item}.', m_drink: '{name} drinks {item}.', m_full: '{name} is not hungry.', m_scribe: '{name} scribes {spell} into the spellbook.',
  m_knows: '{name} already knows {spell}.', m_read: '{name} reads {item}.', m_noUse: 'Nothing happens.', m_saved: 'Game saved.', m_noSave: 'You cannot save now.',
  // examine
  x_wall: 'A wall of slick stone.', x_wall2: 'A wall of dressed guild block.', x_wall3: 'Black stone, warm to the touch.', x_floor: 'The way ahead is open.',
  x_proud: ' One stone sits proud of the rest.', x_rivet: ' A brass rivet sits a little proud.', x_door: 'A heavy wooden door.', x_gate: 'An iron gate.', x_lockedDoor: 'A locked door.',
  x_seal: 'A door written over with runes.', x_lever: 'A lever. It is {state}.', x_button: 'A stone button.', x_plaque: 'A carved plaque.', x_candle: 'A candle sconce. It is {state}.',
  x_alcove: 'A niche in the wall.', x_alcoveHolds: 'A niche in the wall. {items} rests inside.', x_shrine: 'A ring of tiny stone rats surrounds an empty seat.', x_riddle: 'A keyhole-shaped niche, too big for any key.',
  x_altar: 'An altar niche of the guild.', x_reliquary: 'The Reliquary of the Lidless.', x_mon: 'The {mon} {how}.', x_greatLock: 'A Great Lock, its wheel as tall as a man.',
  x_undergate: 'The Undergate: a door of a hundred bolts, with three toothed keyholes.', x_clock: 'A Great Clock with four empty sockets.', x_clockOk: 'The Great Clock ticks contentedly.',
  x_raise: 'The Shrine of the Threshold. A key waits in a stone lock.', x_pit: 'A pit. The bottom is a long way down.', x_stairs: 'Stairs lead down.', x_stairsUp: 'Stairs lead up.',
  x_eye: 'The Bolt-Holder: an amber Eye in a cage of iron bolts.', x_npc: '{name} watches you.',
  how_0: 'looks unhurt', how_1: 'looks wounded', how_2: 'looks badly hurt', how_3: 'is nearly dead', how_sleep: 'is asleep',
  // inscriptions
  n1: 'THE WARDENS KEEP TO THE LEFT CHANNEL. THE BITERS KEEP TO THE RIGHT.', n2: 'NOT EVERY STONE IS STONE.', n3: "WARDENS' POST. BAR THE DOOR AND REST. SLEEP LIGHTLY.",
  n4: 'BY ORDER OF THE DRAINWARDEN, THIS DOOR OPENS FOR HIS KEY ALONE.', n5: "THE TUMBLERWRIGHT'S CREED: THE FIRST FALLS. THE SECOND RISES. THE THIRD FALLS.",
  n6: 'I HAVE TEETH, YET NEVER BITE. I TURN, YET HAVE NO FEET. GIVE ME WHAT OPENS, AND I OPEN.', n7: 'THE GUILD VAULT. WHAT IS SEALED BY ART, ART UNSEALS.',
  n8: 'HERE LIE THE EYELESS, WHO SAW TRUE.', n9: 'HERE THE GUILD SET ITS WATCHER. COPPER, BRASS AND IRON: THREE WARDS FOR ONE GATE.',
  n10: 'BEYOND WAKES THE WATCHER. TURN ITS LOCKS, AND IT IS BLIND.',
  // notes
  tornPage: "...they take the bolts, all the iron, every nail and hinge, down the right channel to HIM. Snick says HE pays in shiny. Snick says HE sees everything...",
  guildLedger: 'Tumbler Lock, cell 4: the creed governs it. Undergate wards: copper to the Drainwarden, brass to the Vault, iron to the Lidless, who swore to keep it. Watcher: bolts tested, seven of seven. God help us if it learns to like it.',
  seersPsalm: 'One for the Lid, in the north-west. Two for the Lash, in the south-west. Three for the Iris, north and centre. Four for the Pupil, south and centre. Five for the Lens, in the north-east. Six for the Light, in the south-east.',
  // hints (Settings: Hints)
  h_move: 'Move with [act:move]; turn with [act:turn]. [act:use] uses what is ahead.', h_strike: 'Rats! Press [act:strike] to strike with everyone who is ready.',
  h_items: 'Things on the floor: [act:use] takes one into the Hand. [act:party] opens the party.', h_camp: 'Press [act:camp] to make camp: rest, memorize spells and eat.',
  h_plate: 'A plate in the floor. Put something heavy on it: hold [act:putDown] to set the Hand down ahead.', h_p1: 'Something heavy might hold it down.',
  h_buttons: 'Two buttons, one gate. Perhaps they must be pressed together.', h_sw1: 'Look closely at the walls. One stone sits proud.', h_i1: 'NOT EVERY STONE IS STONE. Try walking into the wall beside the plaque.',
  h_seal: 'A magic seal: cast Unlatch facing it, read the scroll, or use the wand.', h_throw: '[act:throw] throws the Hand ahead. A thrown thing flies over pits and lands on plates.',
  h_p2: 'The plate lies beyond the pit. Something thrown would fly over it.', h_riddle: 'Teeth, turning, opening. It wants a key, any key.', h_weight: 'Two plates. Stand on one, weigh down the other.',
  h_levers: 'The creed in the workshop: the first falls, the second rises, the third falls.', h_gauntlet: 'The Seers shoot down the long hall. Duck into the niches between their bolts.',
  h_candles: 'Six candles. The Seer\'s Psalm gives their order.', h_psalm: 'Read the Seer\'s Psalm: one, the north-west; two, the south-west; and on, west to east.', h_golems: 'Lightning and blunt weapons hurt constructs most.',
  h_eye: 'Turn the Great Locks with [act:use] between its attacks. Pillars block its lightning and its gaze.', h_cast: 'A caster: press their hand with the book or symbol to open the spells.',
  h_hunger: 'Food is low. Eat at camp, or from the party screen.',
  // floor cards and quests
  q_main: 'Find what holds the city\'s bolts, and break its grip.', q_wards: 'Gather the Three Wards: copper, brass and iron. Open the Undergate.', q_eye: 'Close the Eye.',
  q_tamsin: 'Tamsin Pell, a lockwright, caged by Latchkins.', q_durgan: 'Durgan Copperhand, locked in his own Tumbler Lock.', q_veil: 'Sister Veil, chained by the Lidless.',
  q_clock: 'Ysolde asks that the Great Clock tell the hour once more.',
  sq1: 'The Rat King\'s crown returned to the Rat Shrine.', sq2: 'The Great Clock tells the hour once more.', sq3: 'The six candles of the Lidless Chapel lit in order.',
  sec_closet: 'The loose stone in the Junction.', sec_I1: 'The illusory wall beside the plaque.', sec_catch: 'The brass catch in the Endless Hall.'
};
B.T_ = (id, v) => B.fill(B.TXT[id] !== undefined ? B.TXT[id] : id, v);

/* ---- barks: short lines that do not stop play ---- */
B.BARKS = {
  snick1: ['snick', 'MINE! All the shiny bolts are MINE!'], snick2: ['snick', 'Latchkins! To your king!'], snick3: ['snick', '...not... fair...'],
  eye1: ['eye', 'Little keys. You have come so far, only to be turned.'], eye2: ['eye', 'Every lock is a promise. I KEEP THEM ALL.'], eye3: ['eye', 'You... unbolt... ME?'],
  eye4: ['eye', 'Then be locked in the dark FOREVER!'], eye5: ['eye', 'Who... will keep... the promises...?'], eyeHurt: ['eye', 'You DARE?'], eyeRelock: ['eye', 'BACK in your place!'],
  ysoldeHint: ['ysolde', 'The guild hid its catches in plain sight. Look to the walls.']
};
/* ---- the conversations (E.Dialog over the dimmed view; the world waits). A step is [who, text], { choices: [[label,
 * node]] }, { do: [actions] }, { goto: node, if: condition } ---- */
B.STORY = {
  tamsin: [['tamsin', 'Took you long enough! Three days in a birdcage, and the little latch-thieves poking me with forks.'],
    ['tamsin', 'Tamsin Pell, journeywoman of the Lockwrights. Or I was, before the locks went mad.'],
    ['tamsin', "You're going down, aren't you? Toward the thing that's doing this. Take me along. I open what your keys can't."],
    { choices: [['Join us', 'tamsinJoin'], ['Go home, Tamsin', 'tamsinHome']] }],
  tamsinJoin: [{ goto: 'tamsinFull', if: 'full' }, ['tamsin', "Then let's go and annoy something big."], { do: [['join', 'tamsin']] }],
  tamsinFull: [['tamsin', 'No room? Then take these. You will need them more than me.'], { do: [['npcGive', 'tamsin', 'lockpicks'], ['npcLeave', 'tamsin']] }],
  tamsinHome: [['tamsin', "Suit yourself. Take these. You'll need them more than me."], { do: [['npcGive', 'tamsin', 'lockpicks'], ['npcLeave', 'tamsin']] }, ['tamsin', "Mind the right channel. That's where they nest."]],
  durgan1: [['durgan', "Don't stand there gawping. Those levers on the wall behind you are the Tumbler Lock. My own design, and I'm locked on the wrong side of it."],
    ['durgan', "The creed is carved in the workshop. First falls, second rises, third falls. Can't reach the blasted things from in here."], { do: [['quest', 'durgan']] }],
  durgan2: [['durgan', "Ha! Durgan Copperhand thanks you. The guild's dead and gone, but its halls aren't done with me yet."],
    ['durgan', "Whatever's below took my brothers' work and twisted it. I'd like a word with it. A hammer-shaped word."],
    ['durgan', 'And take this gear. Found it in my cell. Looks like it belongs to the big clock.'], { do: [['npcGive', 'durgan', 'tumblerGear']] },
    { choices: [['Come with us', 'durganJoin'], ['Find your own way out', 'durganHome']] }],
  durganJoin: [{ goto: 'durganFull', if: 'full' }, ['durgan', 'Lead on, then. Mind your heads; I never do.'], { do: [['join', 'durgan']] }],
  durganFull: [['durgan', 'No room in your little band? Hmph. Then luck to you.'], { do: [['npcLeave', 'durgan']] }],
  durganHome: [['durgan', 'Hmph. Then luck to you.'], { do: [['npcLeave', 'durgan']] }],
  ysolde1: [{ do: [['npcShow', 'ysolde']] }, ['ysolde', 'Living feet, in the Tumbler Halls. It has been a long time.'],
    ['ysolde', 'I was Guildmistress Ysolde Vane. We forged the Watcher for the Undergate: an eye that would never close, for a lock that must never open.'],
    ['ysolde', 'We gave it seven Great Bolts to hold. And it learned to love holding. Now it holds the whole city, one lock at a time.'],
    ['ysolde', 'Three Wards open the Undergate: copper, brass and iron. Ours, the brass, sleeps in the Guild Vault. What is sealed by art, art unseals.'],
    ['ysolde', 'And if you would do an old woman a kindness, the Great Clock has lost its four gears. Let it tell the hour once more.'], { do: [['quest', 'clock'], ['quest', 'wards'], ['npcHide', 'ysolde']] }],
  ysolde2: [{ do: [['npcShow', 'ysolde']] }, ['ysolde', 'Close its eye, little keys. Close it for all of us.'], { do: [['npcGone', 'ysolde']] }],
  veil: [['veil', 'Do not look at me so. Your eyes are loud, surface-folk.'],
    ['veil', 'I am Veil, once a Seer of the Lidless. I shut my eyes to the Watcher\'s voice, and for that they chained me here to be... corrected.'],
    ['veil', 'You seek the Iron Ward. The Wardens keep it in the Reliquary, past their barracks. There is another way. I know the stones that move.'],
    ['veil', 'Take me from this place and I will show you. Leave me, and pray the Wardens are asleep.'],
    { choices: [['We will help you', 'veilHelp'], ['Stay here, seer', 'veilRefuse']] }],
  veilHelp: [{ goto: 'veilGive', if: 'full' }, ['veil', 'Then I walk with you.'], { do: [['join', 'veil']] }, ['veil', 'Push where the moss does not grow.'], { do: [['flag', 'veilHelped']] }],
  veilGive: [['veil', 'Then take this. It kept me sane.'], { do: [['npcGive', 'veil', 'lidlessWard'], ['npcLeave', 'veil']] }, ['veil', 'Push where the moss does not grow.'], { do: [['flag', 'veilHelped']] }],
  veilRefuse: [['veil', 'Then go with your eyes open. It will find you.'], { do: [['flag', 'veilRefused'], ['quest', 'veil', 'done']] }]
};
/* ---- the cutscenes' narration ---- */
B.INTRO = [
  ['narrator', 'Hasp. The city of a thousand locks.', 'A'],
  ['narrator', 'For three hundred years its Tumblerwrights forged the finest locks in the world, and its people slept soundly behind them.', 'A'],
  ['narrator', 'Then the locks began to turn by themselves.', 'A'],
  ['strake', 'Doors bolt themselves in empty houses. Wells cap shut. Last night the east granary locked forty men inside and would not open for axes.', 'A'],
  ['lintel', 'It comes from below. Past the Drains, past the old guild halls... from the Undergate itself.', 'A'],
  ['strake', 'You were recommended to me as people who open things. Go down. Find what holds our bolts, and break its grip.', 'A'],
  ['narrator', 'The Drain-gate groans open. You step down into the dark.', 'B'],
  ['narrator', 'Behind you, the grate crashes shut. A great bolt slides home with a sound like a closing tomb.', 'B', 'bolt'],
  ['narrator', 'Somewhere far below, something blinks.', 'X', 'blink']
];
B.ENDING = [
  ['narrator', 'The Eye cracks from lid to lid, and its light goes out.', 'C'],
  ['narrator', 'One by one, the seven Great Bolts fall silent.', 'C'],
  ['narrator', 'Above, in the city of a thousand locks, every door swings open at once.', 'D', 'doors'],
  ['strake', "Hasp is in your debt. The guild's last forge will cast your names into the Undergate itself.", 'D'],
  ['lintel', 'Yet the Undergate was built to keep something in. With its Watcher gone...', 'D'],
  ['narrator', 'Far beneath the city, in a darkness older than locks, something tries the door.', 'X', 'knock']
];
