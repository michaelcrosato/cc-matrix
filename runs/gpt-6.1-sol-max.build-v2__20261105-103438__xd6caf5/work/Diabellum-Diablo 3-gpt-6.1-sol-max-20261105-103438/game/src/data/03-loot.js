const SLOTS = ['Weapon','Head','Chest','Hands','Feet','Neck','Ring','Ring'];
const RARITY = [
 {name:'Worn',color:'#899396',mark:'-',affixes:0}, {name:'Plain',color:'#e6dfce',mark:'•',affixes:1},
 {name:'Blessed',color:'#7eaee7',mark:'○',affixes:2}, {name:'Saintly',color:'#e5c476',mark:'□',affixes:3},
 {name:'Relic',color:'#ffb66c',mark:'★',affixes:4}, {name:'Vestment',color:'#a8d68c',mark:'×',affixes:4}
];
// Powers use the same event pipeline as skills. Parameters are consumed at the moment of use.
const RELICS = [
 ['ossian','Tongue of Saint Ossian','ringer',0,'knellWave','Knell sends a ring through the crowd.','His last word was a city falling.'],
 ['vergerRope','The Verger\'s Rope','ringer',3,'ropeRing','Swing the Rope adds Ringing.','Every knot is a name.'],
 ['bellSkin','Skin of Old Patience','ringer',2,'hideThorns','Iron Hide reflects blocked blows.','Even iron grows tired.'],
 ['landing','The Fallen Steeple','ringer',4,'leapBell','Leaps bring down a smaller bell.','The ground rose to meet it.'],
 ['ropePalm','A Ringer\'s Promise','ringer',1,'ringMax','Ringing may stack six times.','I shall hold until the last note.'],
 ['drowned','Psalter of the Drowned','cantor',0,'chordBolts','A Chord adds two extra Psalm notes.','The river sang it back.'],
 ['blindfold','Blindfold of the Seventh Choir','cantor',1,'twoNotes','Two different notes make a Chord.','He saw enough.'],
 ['candleRain','The Last Candle','cantor',3,'candleTriple','Falling Candle brings three offerings.','Wax for a world without dawn.'],
 ['longBreath','A Breath Unspent','cantor',6,'noteWide','The Long Note is twice as wide.','He sang beyond the final page.'],
 ['winter','A Cold Benediction','cantor',2,'frostEcho','Frost spells echo a second time.','Blessed are those who keep still.'],
 ['lastWick','The Last Wick','lamplighter',2,'lastingLight','Lit pools remain until you leave.','The watch ends when I say.'],
 ['neverDark','Never-Dark','lamplighter',6,'lanternRadius','Your lantern reaches twice as far.','One small flame against everything.'],
 ['watchBolt','The Watchman\'s Teeth','lamplighter',0,'boltSplit','Bolts split into three.','Bite the dark.'],
 ['falseMorning','Morning Deferred','lamplighter',1,'dawnShort','False Dawn returns twice as soon.','It was nearly morning for a year.'],
 ['oilboots','Boots of the Night Watch','lamplighter',4,'vaultFire','Vault leaves a permanent Lit pool.','The road remembered her steps.'],
 ['firstSoil','Spade of First Soil','sexton',0,'freeRaise','Raise the Buried is free near corpses.','The first grave was a garden.'],
 ['motherRing','Mother\'s Ring of Bones','sexton',6,'keepCorpse','Corpse Burst leaves half its corpses.','Nothing need go to waste.'],
 ['tom','Big Tom\'s Sunday Coat','sexton',2,'bigBuried','Your Buried are twice as strong.','He always dressed for work.'],
 ['rake','The Parish Rake','sexton',3,'gravePull','Open Grave reaches twice as far.','A tidy plot is a happy plot.'],
 ['lastRites','The Sixth Pallbearer','sexton',1,'ritesParty','Last Rites always heals the party.','There was room for one more.'],
 ['ninth','Ninth Bell\'s Shard','any',5,'ninthHit','Every ninth hit tolls for fivefold damage.','Eight notes of mercy. One of iron.'],
 ['ledger','A Page of the Beadle\'s Ledger','any',6,'streakPower','Each Requiem grants damage this zone.','Your absence has been noted.'],
 ['ferryman','A Penny for the Ferryman','any',6,'resurrect','Pay a thousand pennies to refuse death.','He keeps exact change.'],
 ['echo','Echo in an Empty Cup','any',5,'echoNova','Evading sends a ring of force.','It was never empty.']
];
for (const [id,name,hero,slot,power,text,flavor] of RELICS) def('relic',id,{name,hero,slot,power,text,flavor});
const SETS = [
 ['greatRope','Vestments of the Great Rope','ringer','Ringing may stack six times.'],
 ['silentChoir','Habit of the Silent Choir','cantor','A Chord needs one fewer note.'],
 ['longNight','Watch of the Long Night','lamplighter','Lit light slows your enemies.'],
 ['pottersField','Weeds of the Potter\'s Field','sexton','The Buried leave usable corpses.']
];
for(const [id,name,hero,text] of SETS) def('set',id,{name,hero,text,slots:[1,2,3,4]});
const AFFIX_POOL = [
 ['devotion','Devotion',1.4],['vigor','Vigor',3],['armor','Armor',2],['resist','All Resist',1],['crit','Critical chance',.4],
 ['critDamage','Critical damage',2],['haste','Attack speed',.5],['lifeHit','Life on hit',.4],['regen','Life per second',.3],
 ['votive','Votive bonus',1],['speed','Move speed',.5],['pickup','Pickup radius',.6],['pennies','Penny find',1],['fortune','Relic find',.7],
 ['cooldown','Cooldown reduction',.4],['economy','Resource cost reduction',.5],['area','Area damage',.7],['element','Elemental damage',1],['skill','Skill damage',1],['socket','Socket',1]
];
const GEM_NAMES = ['Amber','Jet','Garnet'];
const DIFFICULTIES = [
 {name:'Mortal',life:1,damage:1,reward:1}, {name:'Penitent',life:2.5,damage:1.7,reward:1.25},
 {name:'Damned',life:6,damage:3,reward:1.6}, {name:'Anathema',life:14,damage:5,reward:2.2}
];
