// Who speaks, how they sound, and what they say. Lines fit two rows of about 60 characters.
export const NPC_LABELS = { crier: 'CRIER MAUDLIN', brasse: 'DAME BRASSE', ogive: 'MOTHER OGIVE', pennywhistle: 'PENNYWHISTLE', pyx: 'SISTER PYX', ambrose: 'BISHOP AMBROSE' };
export const SPEAKERS = {
  narrator: { name: '', color: 'mist', voice: 'narrator' },
  crier: { name: 'CRIER MAUDLIN', color: 'sand', voice: 'crier' },
  brasse: { name: 'DAME BRASSE', color: 'orange', voice: 'brasse' },
  ogive: { name: 'MOTHER OGIVE', color: 'lime', voice: 'ogive' },
  pennywhistle: { name: 'PENNYWHISTLE', color: 'sky', voice: 'pennywhistle' },
  pyx: { name: 'SISTER PYX', color: 'white', voice: 'pyx' },
  ambrose: { name: 'BISHOP AMBROSE', color: 'mist', voice: 'ambrose' },
  bursar: { name: 'THE BURSAR', color: 'red', voice: 'bursar' },
  malison: { name: 'MALISON', color: 'red', voice: 'malison' },
  cellarer: { name: 'THE CELLARER', color: 'teal', voice: 'brasse' },
};

export const BARKS = {
  crier: ['Hear ye, hear ye! The dead are up, the roads are closed, and the fish is off.', 'I lost the body at harvest and kept the job. No one told me to stop.', 'The parish asks that you wipe your feet. You have been in the ground.', 'Hear ye! The Vestry has resolved to do nothing, with vigour.'],
  brasse: ['WHAT? SPEAK UP! I MELT BELLS FOR A LIVING!', 'THAT SWORD WAS A CHURCH BELL ON TUESDAY. HIT SOMETHING WITH IT AND IT STILL SAYS AMEN.', 'DO NOT TOUCH THAT. IT IS HOT. EVERYTHING IS HOT.'],
  ogive: ['Bring me the holy bones, child. I will know them by the taste.', "A saint's knuckle. Very old. A little salty. She died angry.", 'Come closer. I do not bite the living. As a rule.'],
  pennywhistle: ['Everything is half price, dear friend. The other half is your soul, but we can discuss terms.', 'No refunds. No returns. No survivors, so far.', 'Modest markups, considering the apocalypse.'],
  pyx: ['I have killed four hundred things today and confessed to none of them.', 'You smell like a grave. It is an improvement on the last one.'],
  ambrose: ['They have buried me three times, my child. One learns to keep a spade in the coffin.'],
};

// Fixed story talks. key: `${npc}:${quest}.${step}`. Each line is [speaker, text].
export const TALKS = {
  'crier:wipe_feet.crier': [
    ['crier', 'Hear ye, hear ye! The dead are up, the roads are closed, and the fish is off. Also you. You are dead. Welcome back.'],
    ['crier', 'I lost the body at harvest and kept the job. No one told me to stop.'],
    ['crier', 'You are one of the Late. Formally, the Tollborn. The parish asks that you wipe your feet.'],
    ['crier', 'The Great Bell cracked and the Bishop sends no word. A bellfounder might know why. Dame Brasse is out on the Causeway.'],
    ['crier', 'Take the road gate. Fetch her back, wagon and all. And if you find an overdue book in a cellar, it is mine.'],
  ],
  'brasse:weeping_causeway.find_brasse': [
    ['brasse', 'WHAT? SPEAK UP! I MELT BELLS FOR A LIVING!'],
    ['brasse', 'A CORPSE, IS IT? GOOD. YOU CAN PUSH. THAT WAGON IS EVERY BELL ON THE MOOR AND I AM NOT LEAVING IT.'],
    ['brasse', 'STAY NEAR IT AND KEEP THE ROAD CLEAR. IT ROLLS WHEN NOTHING IS CHEWING ON IT.'],
  ],
  'brasse:weeping_causeway.brasse_home': [
    ['brasse', 'HOME! MORE OR LESS! THE FORGE IS LIT. BRING ME WHAT YOU DO NOT WANT.'],
    ['brasse', 'SALVAGE IT, CRAFT WITH IT, REFORGE WHAT YOU KEEP. THAT SWORD WAS A CHURCH BELL ON TUESDAY.'],
    ['pyx', 'The Lychgates are waking. You may use them. I will walk with you. Someone ought to.'],
    ['crier', 'Hear ye! Writs are posted on the board. Also, Mother Ogive of the Reliquary wishes to taste you.'],
  ],
  'ogive:saint_gloam.see_ogive': [
    ['ogive', 'Bring me the holy bones, child. I will know them by the taste.'],
    ['ogive', 'Three bones of Saint Gloam, under the Ossuary. Something in the deep cellars has been keeping accounts.'],
    ['ogive', 'Bring them to me, and I shall teach you what a dead saint still has to give.'],
  ],
  'ogive:saint_gloam.ogive_home': [
    ['ogive', 'Ah. Knuckle. Rib. A bit of jaw. Very old. A little salty.'],
    ['ogive', 'A ledger too. Let me taste the ink. Oh, child. That is the Bishop. His own hand.'],
    ['ogive', 'The Reliquary is yours. Give me a legendary and I will draw its power out, and you may keep three such.'],
    ['ogive', 'And gems, for anything with a socket. The Crier will want to hear about that ledger.'],
  ],
  'crier:cinder_cloister.see_crier': [
    ['crier', 'Hear ye. The Bishop signed WHAT? Well. That is out of my remit. He is at the Cinder Cloister.'],
    ['crier', 'The abbey has been burning for a week. There are novices still singing in it, if you hurry. Be firm with him.'],
  ],
  'crier:cinder_cloister.crier_truth': [
    ['crier', 'You have his account of it, then. I shall read it, as I must. Hear ye, hear ye.'],
    ['crier', 'Saint Malison, who gave herself to the bell. She did not give. The first bishops walled her up alive beneath the tower, singing.'],
    ['crier', 'She has heard that bell every dusk for a thousand years. Ambrose cracked it for her. Now she means to ring the last toll: Eventide.'],
    ['crier', 'And everything ever buried gets up. There is one thing she fears. Old Clemency, rung true. By hand. By somebody already dead.'],
    ['crier', 'The Belfry gate is open. I am told it is a long climb. I would not know. I lack the legs.'],
  ],
  'crier:overdue': [
    ['crier', 'My book! Forty years overdue! The fine is a disgrace. You may keep the fine. I mean: here. Take this.'],
  ],
};

export const STORY_LINES = {
  opening: [
    ['narrator', 'For a thousand years Old Clemency tolled at dusk, and the dead of Vespermoor stayed down.'],
    ['narrator', 'Forty days ago the Great Bell cracked. It still tolls. It now says something else.'],
    ['narrator', 'You were buried on the thirty-ninth day. It did not take.'],
  ],
  ending: [
    ['narrator', 'Old Clemency rang true, once, by the hand of the dead. Every grave on the moor heard it, and stayed down.'],
    ['narrator', 'Malison came apart in the sound. A thousand years of singing went out of the stone, and dawn came up over Vespermoor.'],
    ['crier', 'Hear ye, hear ye. The dead are down. The roads are open. The fish is still off.'],
    ['narrator', 'And far below, under the foundation, under the saint, a much deeper bell answered.'],
  ],
  bursar_intro: [['bursar', 'YOUR SOUL IS OVERDUE!']],
  bursar_lines: ['INTEREST COMPOUNDS, LITTLE CORPSE!', 'I HAVE YOU DOWN FOR ONE DEATH. I SEE IT WAS NOT COLLECTED.', 'YOUR SOUL IS OVERDUE!', 'A SMALL ADMINISTRATIVE FEE!', 'AUDIT!'],
  ambrose_intro: [['ambrose', 'They have buried me three times, my child. One learns to keep a spade in the coffin.']],
  ambrose_lines: ['ONE LEARNS TO KEEP A SPADE IN THE COFFIN.', 'I SIGNED IT FOR THE PARISH. EVERYTHING WAS FOR THE PARISH.', 'BLESS YOU, MY CHILD. HOLD STILL.', 'TWICE MORE. I HAVE PRACTISED.'],
  malison_intro: [['malison', 'A THOUSAND YEARS I HAVE BEEN YOUR FOUNDATION STONE. NOW I SHALL BE YOUR CEILING.']],
  malison_lines: ['THEY WALLED ME UP SINGING. DO YOU KNOW WHAT I LEARNED IN THE DARK? EVERY VERSE.', 'RUN, LITTLE RINGER. THE HOUR IS UNRUNG, AND IT IS YOURS.', 'LISTEN. THAT IS EVERY GRAVE YOU EVER WALKED ON, OPENING.'],
  malison_kill: 'DOWN YOU GO. GIVE MY REGARDS TO THE WORMS.',
  malison_cloister: ['I CAN HEAR YOU CLIMBING, LITTLE RINGER.', 'THAT BISHOP WAS THE FIRST HONEST MAN IN A THOUSAND YEARS. HE ASKED MY PRICE.', 'SING, NOVICES. SING LOUDER. I KNOW THE TUNE.'],
  cellarer_intro: [['cellarer', 'I said I would only be a moment. WHAT YEAR IS IT?']],
};

// Sister Pyx's banter: 40 lines, by what just happened.
export const PYX_BANTER = {
  join: ['Bless you. Duck.', 'I will walk with you. Someone ought to.', 'They sent me to pray for you. I brought a crossbow instead.'],
  kill: ['I have killed four hundred things today and confessed to none of them.', 'That one was somebody. It is not now.', 'Four hundred and one.', 'Requiescat. Next.', 'Hold still. There. Sorry. Not sorry.', 'I shall add it to the list. The list is long.', 'One does not enjoy this. One merely does it very well.'],
  elite: ['That one has opinions. Kill it first.', 'Something is wrong with that one. Beyond the obvious.', 'Mind the glowing one. They are always worse.', 'Pride goes before a fall. Help it along.'],
  loot: ['You are going to wear that? On a dead man?', 'Take it. He has no further use for it. I checked.', 'Vanity. Though I like the colour.', 'Finders keepers. It is not in the catechism but it should be.'],
  hurt: ['You are bleeding. I would mention it, but it seems to be your hobby.', 'Try the rolling. People speak highly of it.', 'You smell like a grave. It is an improvement on the last one.', 'Do try to stay up.'],
  down: ['I am lying down for a moment. Do not take this as a precedent.', "Oh, for pity's sake.", 'Carry on. I shall catch up. Probably.'],
  up: ['Where was I? Ah. Killing.', 'Heaven sent me back. Heaven was very short about it.', 'I am back. Do not fuss.'],
  town: ['I shall be in the chapel. There is no chapel. I shall stand where it was.', 'Do your shopping. I will watch the road. The road is watching back.', 'Pennywhistle overcharged a dead man. I admire the principle.'],
  boss: ['That one is overdue for burial.', 'Big, is it not. Aim for the middle.', 'Bless you. Duck. I mean it this time.'],
  idle: ['In the old days there were bells. In the new days there is me.', 'Sister Agnes died of a chill. It was considered a very good death.', 'Do you still dream? I would not bother.', 'I took a vow of silence once. I have regretted almost every word since.', 'The rain does not stop. Neither do we. I find I resent the comparison.', 'If you see a Bishop, I would like a word with him.'],
};

export const SYSTEM_LINES = {
  death: 'YOU HAVE DIED. AGAIN. IT IS BECOMING A HABIT.',
  level: 'YOU FEEL MORE ALIVE. THIS IS NOT MEDICALLY POSSIBLE.',
};
