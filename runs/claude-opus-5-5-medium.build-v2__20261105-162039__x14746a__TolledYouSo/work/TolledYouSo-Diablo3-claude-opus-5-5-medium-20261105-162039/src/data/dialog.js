// Dialogue, in three registers: high gothic, gallows humour, boss taunts. Each line fits two rows of about 60 characters.
export const SPEAKERS = {
  narrator: { name: 'THE NARRATOR', color: 'mist', register: 'low', pitch: -4, rate: 0.13, variance: 1 },
  crier: { name: 'CRIER MAUDLIN', color: 'sand', register: 'high', pitch: 3, rate: 0.055, variance: 3 },
  brasse: { name: 'DAME BRASSE', color: 'orange', register: 'low', pitch: 0, rate: 0.07, variance: 2, loud: 1.3 },
  ogive: { name: 'MOTHER OGIVE', color: 'plum', register: 'mid', pitch: -1, rate: 0.13, variance: 1, soft: 0.6 },
  pennywhistle: { name: 'PENNYWHISTLE', color: 'lime', register: 'high', pitch: 0, rate: 0.07, variance: 4 },
  pyx: { name: 'SISTER PYX', color: 'sky', register: 'mid', pitch: 0, rate: 0.09, variance: 0.5 },
  ambrose: { name: 'BISHOP AMBROSE', color: 'white', register: 'mid', pitch: -2, rate: 0.1, variance: 1 },
  bursar: { name: 'THE BURSAR', color: 'red', register: 'demon', pitch: -3, rate: 0.08, variance: 2, crush: 6 },
  malison: { name: 'MALISON', color: 'cyan', register: 'demon', pitch: -6, rate: 0.12, variance: 2, double: true },
  warden: { name: 'THE WARDEN', color: 'red', register: 'demon', pitch: -2, rate: 0.1, variance: 2 },
  hero: { name: 'THE LATE', color: 'white', register: 'mid', pitch: 0, rate: 0.08, variance: 1 },
};
const L = (who, text) => ({ who, text });
export const DIALOG = {
  crier_intro: [L('crier', 'Hear ye, hear ye! The dead are up, the roads are closed, and the fish is off. Also you. You are dead. Welcome back.'), L('crier', 'I lost the body at harvest and kept the job. No one told me to stop.'), L('crier', 'The parish asks that you wipe your feet. You have been in the ground.'), L('crier', 'A wagon of church bells stands stranded on the Weeping Causeway. Dame Brasse is with it, shouting. Fetch her. We have need of bronze.')],
  crier_idle: [{ who: 'crier', text: 'Hear ye. Nothing has improved. Details at dusk.', choices: [{ label: 'WHAT OF THE BELL?', next: 'crier_bell' }, { label: 'WHAT OF YOUR BODY?', next: 'crier_body' }, { label: 'GOOD DAY.', next: null }] }],
  crier_bell: [L('crier', 'Cast from ten thousand burial rings, they say. It told the dead to stay down, in two words, every dusk. Now it uses other words.')],
  crier_body: [L('crier', 'Somewhere on the Causeway, I expect, still walking. It always had the better legs. I send it a note at Michaelmas.')],
  crier_causeway_done: [L('crier', 'The bells are home! Dame Brasse has opened her forge, and a nun has been asking for you. Do not owe her money.'), L('crier', 'Mother Ogive of the Reliquary wants a word. She has lost a saint, or a saint has lost her.')],
  crier_after_bursar: [L('crier', 'The Bursar slain! The ledger found! And a name in it I had hoped not to read aloud. I shall read it aloud.'), L('crier', 'Hear ye, hear ye: Ambrose, Bishop of this parish, borrowed one soul at interest and paid with one bell. He has gone to the Cinder Cloister. Go after him.')],
  crier_truth: [L('crier', 'I have the Bishop\'s papers. I will read them. I have read worse. I have not read much worse.'), L('crier', 'Saint Malison did not give herself to the bell. The first bishops walled her up in its foundation, alive, singing. She has heard it toll every dusk for a thousand years.'), L('crier', 'Ambrose cracked it for her. She means to ring the Last Toll, Eventide, and wake everything ever buried.'), L('crier', 'There is one sound she fears. Old Clemency rung true, by hand. The tower is open. Ring it or die trying.')],
  crier_book: [L('crier', 'A book! Three hundred years overdue. The fine would buy this parish. I shall waive it. I have no hands to take it with.')],
  crier_post: [L('crier', 'Hear ye, hear ye! The bell rings true. The dead lie down. Those who have not lain down yet are being asked politely.'), L('crier', 'There is a deeper note under the moor, though. I do not cry that one. Try the Knell Font, if you enjoy that sort of thing.')],
  ambrose_early: [L('ambrose', 'They have buried me three times, my child. One learns to keep a spade in the coffin.'), { who: 'ambrose', text: 'Do not trouble yourself about the bell. These things are all in hand. Whose hand, is a matter of paperwork.', choices: [{ label: 'WHOSE HAND?', next: 'ambrose_hand' }, { label: 'BLESS YOU, BISHOP.', next: null }] }],
  ambrose_hand: [L('ambrose', 'A kindly one, my child. Do wipe your feet on the way out.')],
  brasse_camp: [L('brasse', 'WHAT? SPEAK UP! I MELT BELLS FOR A LIVING!'), L('brasse', 'THAT WAGON HOLDS NINE GOOD BELLS AND THE PEAT WANTS THEM. WALK IT HOME OR I MELT YOUR TEETH.')],
  brasse_shop: [L('brasse', 'THAT SWORD WAS A CHURCH BELL ON TUESDAY. HIT SOMETHING WITH IT AND IT STILL SAYS AMEN.')],
  ogive_bones: [L('ogive', 'Bring me the holy bones, child. I will know them by the taste.'), L('ogive', 'Saint Gloam lies in pieces under his Ossuary. A finger, a rib and a jaw, one on each floor. The jaw will argue.'), L('ogive', 'Beneath the third floor is a Counting House, and a demon who keeps the parish accounts. Mind your soul. It is on his books.')],
  ogive_done: [L('ogive', 'A saint\'s knuckle. Very old. A little salty. She died angry. No. That is not Gloam. Where did you find this?'), L('ogive', 'Bring me your relics, and I will draw the power out of them and keep it here. Three at a time. Bring me stones too; I will set them.')],
  ogive_shop: [L('ogive', 'Let me taste it, child.')],
  penny_intro: [L('pennywhistle', 'Everything is half price, dear friend. The other half is your soul, but we can discuss terms.')],
  penny_shop: [L('pennywhistle', 'No refunds. No returns. No survivors, so far.')],
  pyx_join: [L('pyx', 'I have killed four hundred things today and confessed to none of them.'), L('pyx', 'You smell like a grave. It is an improvement on the last one. I will walk with you. Do not make it a story.')],
  book_found: [L('hero', '')],
  opening: [L('narrator', 'For a thousand years Old Clemency tolled at dusk, and the dead of Vespermoor stayed down.'), L('narrator', 'Forty days ago the Great Bell cracked. It still tolls. It now says something else.'), L('narrator', 'You were buried on the thirty-ninth day. It did not take.')],
  ending: [L('narrator', 'And the hand of the Late closed upon the rope, and Old Clemency spoke, and the word it spoke was true.'), L('malison', 'EVERY VERSE. I KNOW EVERY VERSE. I ONLY WANTED SOMEONE TO HEAR THE LAST ONE.'), L('narrator', 'The Unrung Saint came apart like old mortar. The dead of Vespermoor lay down, grumbling, and dawn came up over the moor.'), L('crier', 'Hear ye, hear ye! The fish is still off.'), L('narrator', 'And far below, under the foundation, under the peat, a much deeper bell answered.')],
  novices: [L('pyx', 'Bless you. Duck.')],
  belfry_taunt: [L('malison', 'A THOUSAND YEARS I HAVE BEEN YOUR FOUNDATION STONE. NOW I SHALL BE YOUR CEILING.')],
  bursar_entrance: [L('bursar', 'AH. THE LATE. I HAVE YOU DOWN FOR ONE DEATH. I SEE IT WAS NOT COLLECTED. DO SIT. THIS WILL NOT TAKE A MOMENT.')],
  ambrose_entrance: [L('ambrose', 'My child. You have come so far, and you have tracked in so much mud. Let us pray. Then let us bury you. I have the spade.')],
  malison_entrance: [L('malison', 'RING IT, THEN. I HAVE HEARD IT EVERY DUSK FOR A THOUSAND YEARS. COME AND RING IT UNDER MY HANDS.')],
  cellarer: [L('crier', 'That cellar has an overdue book in it. I was not going to mention it. I mention it.')],
};
// Sister Pyx's banter, fired by events. Forty lines, because she has seen everything and thinks little of it.
export const BANTER = {
  idle: ['I have seen worse. I have buried worse.', 'Say your prayers. Say them quietly. Something is listening.', 'The Abbess told me to find my calling. It was this.', 'Do you ever stay dead? I ask as a matter of bookkeeping.', 'Keep walking. Sin catches up with the slow.', 'My vows forbid me to say what I think of this place.', 'I took a vow of poverty. It has been very easy to keep.', 'Peat in my boots. Peat in my bolts. Peat in my psalter.', 'I would pray for you, but I am told you are past it.', 'A quiet road. I distrust it. I distrust most things.'],
  kill: ['Bless you. Duck.', 'That one had a family. They are behind it.', 'Rest in pieces.', 'Absolved. In a manner of speaking.', 'One more for the tally I am not keeping.', 'It was going to die eventually. It had, in fact, already.'],
  elite: ['That one is proud of itself. Correct it.', 'Mark the big one. Pride goes before a fall, and so do I.', 'Something is wrong with that one. Beyond the usual.', 'Its affliction is showing. Do not touch it.'],
  loot: ['Is that a relic or a rash? Keep it either way.', 'Rob them. It is not stealing if they are dead. I checked.', 'That rings like money.', 'Bright thing. Mind it does not bite.'],
  volley: ['Bless this bolt.', 'Hold still. Not you.', 'Bless you. Duck.', 'Five bolts. Five sins. It evens out.'],
  bless: ['Stand still and be healed. No, I will not discuss it.', 'A small blessing. Do not spend it all at once.', 'You are leaking. Allow me.', 'There. Try to keep the rest of it in.'],
  down: ['Do not wait up.', 'Ah. Here is the floor.', 'Tell the Abbess I said nothing.'],
  revive: ['I am told this is unusual. Carry on.', 'I am back. Nobody say anything.', 'Well. That did not take.'],
  herodown: ['You have died. Again. It is becoming a habit.', 'I will wait. I have a book.', 'Up. You have done this before.', 'Stop lying down. It gives them ideas.'],
  boss: ['Large. Loud. Doomed. Let us begin.', 'I have confessed bigger than that.', 'Aim for the bit that shouts.'],
};
export const SYSTEM = {
  death: 'YOU HAVE DIED. AGAIN. IT IS BECOMING A HABIT.',
  level: 'YOU FEEL MORE ALIVE. THIS IS NOT MEDICALLY POSSIBLE.',
};
export const HERO_NAMES = ['ALDOUS THE LATE', 'BRAM THE LATE', 'CECILY THE LATE', 'DUNSTAN THE LATE', 'EDITH THE LATE', 'FENWICK THE LATE', 'GWENDOLINE THE LATE', 'HOBB THE LATE', 'ISOLDE THE LATE', 'JOSS THE LATE', 'KESTER THE LATE', 'LETTICE THE LATE', 'MABEL THE LATE', 'NED THE LATE', 'OSWIN THE LATE', 'PRUDENCE THE LATE', 'QUILL THE LATE', 'ROSAMUND THE LATE', 'SILAS THE LATE', 'TAMSIN THE LATE'];
export const HOW_TO_PLAY = [
  { title: 'MOVING AND FIGHTING', lines: ['MOVE WITH THE STICK, WASD OR A CLICK.', 'SKILLS SIT ON THE FACE BUTTONS, THE MOUSE AND 1 TO 4. HOLD TO REPEAT.', 'DODGE MAKES YOU UNTOUCHABLE. ROLL THROUGH ANY RED MARK ON THE FLOOR.', 'DRINK YOUR POTION OFTEN. IT REFILLS. TALLOW ON THE FLOOR RE-MELTS YOUR CANDLE.', 'WHEN THE CANDLE GOES OUT YOU GET UP AGAIN. IT IS ONLY A WALK.'] },
  { title: 'SKILLS AND TONES', lines: ['SIX SLOTS. ANY SKILL IN ANY SLOT. SWAPPING IS FREE.', 'GENERATORS BUILD YOUR RESOURCE. THE REST SPEND IT.', 'EACH SKILL HAS THREE TONES THAT CHANGE HOW IT WORKS.', 'VOWS ARE PASSIVE PROMISES. YOU MAY SWEAR TWO. THEY CHANGE FREELY TOO.', 'YOU CANNOT BREAK A BUILD. TRY THINGS.'] },
  { title: 'LOOT', lines: ['WHITE IS COMMON. BLUE IS BLESSED. YELLOW IS RELIQUARY.', 'ORANGE IS LEGENDARY AND GREEN IS A SET PIECE. BOTH RING LIKE BELLS.', 'WALK OVER THINGS TO TAKE THEM. PRESS EQUIP WHEN A TOAST SAYS UPGRADE.', 'LEGENDARY POWERS CHANGE HOW SKILLS WORK. SETS REWARD 2 AND 4 PIECES.', 'YOUR LOOT IS YOURS ALONE, EVEN IN CO-OP.'] },
  { title: 'TOWN', lines: ['PENNYWHISTLE BUYS AND SELLS, AND SELLS MYSTERY CASKETS.', 'DAME BRASSE SALVAGES, CRAFTS AND REFORGES.', 'MOTHER OGIVE EXTRACTS LEGENDARY POWERS AND SETS GEMS.', 'THE COLLECTION BOX IS A STASH SHARED BY ALL YOUR HEROES.', 'THE PASSING BELL TAKES YOU TO TOWN AND BACK FROM ALMOST ANYWHERE.'] },
  { title: 'KNELL RUNS', lines: ['THE KNELL FONT OPENS A RANDOM DUNGEON WITH MODIFIERS.', 'KILLS FILL THE BELL-SHAPED METER AT THE TOP.', 'WHEN IT TOLLS, A WARDEN COMES FOR YOU. KILL IT FOR A LEGENDARY.', 'A GRAND KEY OPENS A TIMED GRAND KNELL AT A TIER OF YOUR CHOOSING.', 'AFTER LEVEL 30 XP BECOMES DEVOTION, SHARED BY ALL YOUR HEROES.'] },
  { title: 'CO-OP', lines: ['ANY SPARE PAD: PRESS OPTIONS TO JOIN, UP TO FOUR ON ONE SCREEN.', 'THE PAUSE MENU HAS A PARTY PAGE TO JOIN OR LEAVE.', 'HOLD INTERACT OVER A FALLEN ALLY FOR 2 SECONDS TO REVIVE THEM.', 'ONLINE, THE AI HUB RUNS 8-MINUTE KNELL ROUNDS FOR 1 TO 4.', 'YOU CANNOT TRADE, CHAT OR HURT EACH OTHER. THE DEAD HAVE RULES TOO.'] },
];
