const MONSTERS = [
 ['wight','Bell-Wight','shamble',32,1,1,'humanoid','fling','#657b75','claw'],
 ['digger','Bone Digger','rusher',66,.85,1.1,'skeleton','bones','#b9b7a4','overhead'],
 ['tallow','Tallow Man','exploder',26,2,1.8,'bulky','wax','#d2c2a1','twohand'],
 ['bearers','Pall-Bearers','charger',34,2.3,1.7,'skeleton','bones','#6b6371','bash'],
 ['hushling','Hushling','kiter',42,.9,.9,'ghost','fade','#7e9cbb','cast'],
 ['rook','Carrion Rook','flier',76,.4,.7,'blob','feathers','#514953','claw'],
 ['verger','The Verger','summoner',35,2.5,1.2,'robe','fade','#805e94','cast'],
 ['husk','Salt Husk','shamble',36,1.3,1.2,'humanoid','salt','#c5bda3','claw'],
 ['crawler','Brine Crawler','rusher',63,1.1,1.2,'crawler','bones','#878f80','claw'],
 ['flenser','Flenser','rusher',78,.8,1.5,'humanoid','fling','#935e64','slash'],
 ['lamprey','Lamprey','burrower',52,1.4,1.4,'serpent','salt','#a2a078','thrust'],
 ['effigy','Slag Effigy','shamble',25,3,1.9,'bulky','metal','#a46b43','twohand'],
 ['priest','Moth-Priest','support',39,1.5,1.2,'robe','moths','#b6ae8c','cast'],
 ['moths','Moth Swarm','flier',79,.35,.6,'blob','moths','#cbbda5','claw'],
 ['campanar','Campanar','charger',58,2,1.6,'winged','metal','#bda26b','thrust'],
 ['mute','Mute','kiter',37,1.7,1.1,'ghost','fade','#919da7','cast'],
 ['hound','Clapper Hound','rusher',85,1.3,1.4,'hound','metal','#928568','claw'],
 ['unvoiced','The Unvoiced','burrower',64,1.1,1.5,'ghost','fade','#393f52','cast'],
 ['crab','Reliquary Crab','thief',92,7,0,'crawler','treasure','#cfac58','claw'],
 ['lamb','Sunday Lamb','rusher',49,.8,.6,'blob','wool','#e3dcc4','bash']
];
for (const [id,name,ai,speed,life,dmg,body,death,color,move] of MONSTERS) def('monster',id,{name,ai,speed,life,dmg,body,death,color,move,wind: ai==='charger'?.7:ai==='exploder'?1:.4,range:ai==='kiter'?115:20});
const AFFIXES = [
 ['tolling','Tolling','ring'],['waxen','Waxen','wax'],['smoldering','Smoldering','fire'],['hushed','Hushed','silence'],
 ['chained','Chained','tether'],['mourning','Mourning','ghost'],['cordoned','Cordoned','stones'],['shrouded','Shrouded','frost'],
 ['reverent','Reverent','shield'],['penitent','Penitent','reflect'],['haunting','Haunting','blink'],['beckoning','Beckoning','pull']
];
for (const [id,name,pattern] of AFFIXES) def('affix',id,{name,pattern,interval:6});
def('boss','beadle',{name:'Beadle Crake',subtitle:'KEEPER OF THE ABSENT',body:'bulky',color:'#624555',life:180,
 phases:[{at:1,patterns:['slam','hook','summon']},{at:.5,patterns:['charge','ring','summon']}],
 taunts:['ATTENDANCE SHALL BE TAKEN.','Tam Oakes? Absent. Widow Sparrow? Absent.','You are marked LATE.','The parish has risen. You may thank me.','Present yourself.','No one leaves before the roll is read.','I have a place for you.','Ink does not lie.','Death is an administrative matter.','Your absence is an offense.']});
def('boss','regent',{name:'Regent Sallow',subtitle:'OUR MOST LOVING LADY',body:'moth',color:'#d1c4b1',life:240,
 phases:[{at:1,patterns:['copies','dust','rain']},{at:.6,patterns:['charge','cone','summon']},{at:.2,patterns:['dark','ring','rain']}],
 taunts:['Rest here. There is always room near the fire.','Hush now. No, truly. Hush.','You have walked so far, little lamps.','Let me tend the flame.','Everything that burns comes to me in the end.','There is warmth enough for everyone.','Do not look at the wings.','The dark is only another room.','Stay. You must be so tired.','Ask the head whose names she tore out.']});
def('boss','angelus',{name:'The Angelus',subtitle:'THE FIRST NOTE',body:'angel',color:'#c6a96c',life:310,
 phases:[{at:1,patterns:['cone','ring','summon']},{at:.6,patterns:['chains','rain','ring']},{at:.25,patterns:['hush','ring','cone']}],
 taunts:['I WAS THE FIRST NOTE. YOU ARE THE REST.','UNWRITTEN. UNOWED.','WHAT ARE YOU, THAT I CANNOT TOLL YOU?','THE CHOIR HUNGERS.','THE WORLD SHALL COME UP.','I HUNG THE BELLS.','COUNT THE LIVING. COUNT THE DEAD.','YOUR SILENCE IS OVERDUE.','THERE WILL BE NO LAST VERSE.','THE BOOK MUST BE CLOSED.']});
for (const [id,name,body,patterns] of [
 ['pall','The Pall','ghost',['ring','charge','rain','summon','hush']],
 ['coldverger','The Cold Verger','robe',['slam','blink','cone','rain','summon']],
 ['tithe','The Tithe Colossus','bulky',['slam','charge','ring','chains','summon']]
]) def('boss',id,{name,subtitle:'WARDEN OF THE LONG VIGIL',body,color:'#8bbab1',life:200,warden:true,phases:[{at:1,patterns},{at:.5,patterns:[...patterns,'ring']}],taunts:['YOUR WATCH IS NOT YET ENDED.','ANOTHER NAME FOR THE DARK.','THE BELL REMEMBERS YOU.']});
const THEMES = {
 town:{floor:'#313b37',wall:'#555960',light:'#f2b06e',ambient:.48,weather:'rain',music:'town'},
 grave:{floor:'#354746',wall:'#565e5b',light:'#87aeca',ambient:.49,weather:'rain',music:'acre'},
 nave:{floor:'#444550',wall:'#555461',light:'#dca875',ambient:.48,music:'nave'},
 crypt:{floor:'#394249',wall:'#555b65',light:'#7bb4b3',ambient:.45,music:'crypt'},
 salt:{floor:'#a99d83',wall:'#b7ab97',light:'#f4b58a',ambient:.78,weather:'sand',music:'salt'},
 works:{floor:'#454146',wall:'#625a59',light:'#ff9752',ambient:.52,weather:'ash',music:'works'},
 court:{floor:'#6c6672',wall:'#968c94',light:'#d9b7cc',ambient:.56,music:'regent'},
 heaven:{floor:'#77755e',wall:'#b2a181',light:'#ffe1a1',ambient:.67,music:'heaven'},
 chamber:{floor:'#444b50',wall:'#827b62',light:'#f3ce7a',ambient:.5,music:'angelus'},
 fields:{floor:'#718d59',wall:'#908c6a',light:'#f1ddae',ambient:1,music:'fields'}
};
function zone(id,name,chapter,level,theme,layout,pool,extra={}) { def('zone',id,{name,chapter,level,theme,layout,pool,size:layout==='boss'?[44,44]:layout==='town'?[54,54]:[64,64],...extra}); }
zone('prologue','The Night Old Patience Fell',0,1,'town','yard',['wight','digger'],{count:16,need:8,objects:['quillon'],tip:'WASD move • F or click attacks • Space evades • Q heals'});
zone('town','Knellwick',1,1,'town','town',[],{count:0,need:0,objects:['forge','pawn','agnes','stash','quillonTown','campfire','dog','vigilDoor']});
zone('acre',"Potter's Acre",1,2,'grave','yard',['wight','wight','digger','rook','tallow'],{count:100,need:40,objects:['lychgate','unquiet','lore','epitaph','chest'],tip:'Saintly items must be Consecrated. Open your Inventory.'});
zone('nave',"Saint Ossian's: the Nave",1,4,'nave','halls',['wight','hushling','bearers','verger'],{count:100,need:35,objects:['chapel','chapel','trap','lore','chest'],tip:'Smash the pews. Strike a rope post to bring down its chandelier.'});
zone('crypt','The Undercroft',1,6,'crypt','halls',['digger','tallow','hushling','verger'],{count:120,need:45,objects:['cursed','shrine','crab','oldBell','lore','chest'],tip:'Rare foes carry affixes. Read their names and watch the floor.'});
zone('chapterhouse','The Chapter House',1,8,'nave','boss',[],{boss:'beadle',need:0,objects:['trap','trap','trap','trap']});
zone('audience',"Saltgrave: the Audience Hall",2,8,'court','hall',[],{count:0,need:0,objects:['regentTalk','lore']});
zone('march','The Salt March',2,9,'salt','yard',['husk','crawler','flenser','lamprey','rook'],{count:120,need:40,objects:['caravan','shrine','lore','chest'],tip:'Stay beside the pilgrims. The wagon moves when the road is clear.'});
zone('works','The Bellworks',2,12,'works','halls',['effigy','flenser','priest','moths'],{count:135,need:45,objects:['sluice','sluice','sluice','lore','chest'],tip:'Open the three sluices. Bronze must flow before the bell can rise.'});
zone('mothcourt','The Moth Court',2,15,'court','boss',[],{boss:'regent',need:0,objects:['brazier','brazier','brazier','brazier','brazier','brazier']});
zone('stair','The Long Stair',3,16,'heaven','islands',['campanar','hound','hushling'],{count:115,need:45,objects:['lore','shrine','chest'],tip:'The dead are being summoned. The bells were never bringing them to rest.'});
zone('scaffold','The Scaffold of Heaven',3,18,'heaven','islands',['campanar','mute','unvoiced','hound'],{count:125,need:50,objects:['hangingBell','hangingBell','lore','chest'],tip:'The Great Toll sweeps the scaffold. Evade through the ring.'});
zone('chamber','The Ringing Chamber',3,21,'chamber','boss',[],{boss:'angelus',need:0,objects:['tongue']});
zone('vigil','The Long Vigil',4,14,'crypt','halls',['wight','digger','husk','crawler','campanar','priest','tallow','unvoiced'],{count:0,need:0,objects:['pylon','pylon','pylon']});
zone('fields','The Lambing Fields',4,10,'fields','yard',['lamb'],{count:90,need:35,objects:['bigEwe','chest','chest'],secret:true});
zone('sidecrypt','A Chapel Beneath the Roots',1,5,'crypt','halls',['digger','wight','tallow'],{size:[34,34],count:27,need:0,objects:['chest','lore','shrine']});
DB.zone.acre.objects.push('sideCrypt');DB.zone.march.objects.push('sideCrypt');DB.zone.works.objects.push('sermon');
DB.zone.acre.objects.push('lore');for(const id of ['chapterhouse','mothcourt','chamber'])DB.zone[id].objects.push('lore');
const ZONE_LORE={acre:[1,2],nave:[0],crypt:[5],chapterhouse:[3],audience:[4],march:[6],works:[7],mothcourt:[8],stair:[9],scaffold:[10],chamber:[11],sidecrypt:[2]};
const CAMPAIGN = [
 {zone:'prologue',title:'The bell has fallen',objective:'Find the voice in the rubble.',line:'You there. Pick me up. By the handle. I am not a turnip.',speaker:'Mother Quillon'},
 {zone:'town',title:'A lantern for a head',objective:"Go to Potter's Acre. Find the abbey.",line:'Without its tongue a bell is only a bucket.'},
 {zone:'acre',title:'Attendance',objective:'Cross the graves to Saint Ossian\'s.',line:'Every grave in the parish has begun to ring.'},
 {zone:'nave',title:'Light in the house of names',objective:'Light both side chapels.',line:'ATTENDANCE SHALL BE TAKEN.',speaker:'Beadle Crake'},
 {zone:'crypt',title:'The iron tongue',objective:'Descend through the ossuary.',line:'Old Patience. A terrible fall for an old lady.'},
 {zone:'chapterhouse',title:'Marked late',objective:'Take the Tongue from Beadle Crake.',line:'Your names are not in his ledger. How careless.'},
 {zone:'town',title:'East of the Lychgate',objective:'The salt road leads to the Founders\' foundry.',line:'The Vigil Door has opened. But our errand lies east.'},
 {zone:'audience',title:'The Salt Regent',objective:'Speak to Regent Sallow.',line:'You have walked so far, little lamps.',speaker:'Regent Sallow'},
 {zone:'march',title:'A road of salt',objective:'Escort the pilgrim caravan.',line:'Rest here. There is always room near the fire.',speaker:'Regent Sallow'},
 {zone:'works',title:'The recasting',objective:'Open three sluices. Pour the great mold.',line:'Thank you. I could not light it myself.',speaker:'Regent Sallow'},
 {zone:'mothcourt',title:'Lady of Moths',objective:'Defeat Regent Sallow. Keep the braziers lit.',line:'Everything that burns comes to me in the end.',speaker:'Regent Sallow'},
 {zone:'stair',title:'The Belfry of the World',objective:'Climb beside the rising bell.',line:'Five names on that page. Yours. And mine. I tore them out.'},
 {zone:'scaffold',title:'The Choir Above',objective:'Cross the scaffold. Shelter from the Toll.',line:'I have been waiting to be finished for three hundred years.'},
 {zone:'chamber',title:'The last Founder',objective:'Silence the Angelus. Strike the recast bell.',line:'I WAS THE FIRST NOTE. YOU ARE THE REST.',speaker:'The Angelus'}
];
const PROLOGUE = [
 ['THE FIRST NOTE','In the beginning the Founders rang the world out of nothing, and hung nine bells to keep it ringing.'],
 ['THE BOOK OF TOLLS','Every soul was written. Every death was counted. Four names were missing.'],
 ['BENEATH THE BELLS','Beneath the last note lies the Hush. It is older than the bells. It is patient. It is hungry.'],
 ['OLD PATIENCE','On the last night of the old year, Old Patience rang nine times with no hand upon her rope. Then she fell.']
];
const ENDING = [
 ['FIVE NAMES','They struck the recast bell with its iron tongue. Five names rang out that were in no book.'],
 ['THE LAST PAGE','The Book of Tolls burned. The Choir went hungry. The dead were their own at last.'],
 ['MOTHER QUILLON','Now. Now you may hold still.'],
 ['THE WEDDING BELLS','In Knellwick they still ring the bells, but only for weddings.'],
 ['FAR BELOW','Far below, something that had been quiet for a very long time cleared its throat.']
];
const QUILLON = [
 'I was beheaded with more ceremony than this.','That was a chest. You might have opened it. You have hands. I envy them.',
 'Do try not to die. It is so much paperwork, and you are not even on the form.','Hold still. I have not finished.',
 'A fine Relic. The saint was shorter than you.','They never put the important things in the hymnal.','A little less reverence. A little more force.',
 'No, I cannot carry it. Consider my circumstances.','I knew him when he had a pulse. He was tiresome then too.','That bell is not ringing for you.',
 'A corpse is a person who has stopped objecting.','You have made a theological point with the furniture.','The parish will bill you for that.',
 'Three hundred years in a lantern. No, I am not bored. I am furious.','The Founders liked gold. That should have warned us.',
 'An empty grave is an invitation.','Read the small print. Especially on a tomb.','The dark has good hearing.',
 'That is not a hymn. That is a warning.','A spare tongue. Every abbess should have one.','I do not miss my knees.',
 'We had a word for this in the abbey. I shall spare you.','Do not polish it. The tarnish is structural.',
 'They are called grave pennies because no one tips the living.','He is not bowing. His spine has gone.',
 'If you find my body, do check its pockets.','All this solemnity. Someone ought to sneeze.',
 'The silence is listening.','A miracle is a debt no one can explain.','I preferred the old roof.',
 'Do not lick the salt. It used to be someone.','She sounds kind. I distrust that.',
 'Wax remembers heat. Stone remembers names.','No one ever asks the bell whether it wishes to ring.',
 'We are making excellent time for the damned.','Another locked door. Religion is mostly hinges.',
 'I am a head. You are a heading. Neither is in the Book.','The trouble with eternity is the company.',
 'A pleasing noise. Make it again.','The dead rise. The living stoop. Very untidy.'
];
const EPITAPHS = [
 'Here lies Tam Oakes. He said the ice would hold.','Agnes Thorne. Beloved wife. Owed eleven pennies.','Gone Up. Back shortly.',
 'Nell Pike. Kept the watch. Missed the step.','Here rests a man of few words. At last.','No flowers. They know what they did.',
 'Mara Bell. A clear voice in a mean choir.','He left everything to his creditors.','Under this stone: mostly regret.',
 'A good husband. A poor swimmer.','Fell asleep in the front pew. Stayed.','Bury me with the key.',
 'Ellen Reed. Mended every coat but her own.','The bell tolled twice. We asked no questions.','Not lost. Misfiled.',
 'Here lies an optimist. The ground is wet.','No toll recorded. Please enquire within.','She held the rope until it broke.',
 'Ossian Vale. The soup was not a test of faith.','At peace, pending appeal.','His last words were: nearer, please.',
 'A quiet neighbor. Continue so.','Grave reserved. Occupant running late.','He wanted a view. We gave him east.'
];
const LORE = [
 ['The Beadle\'s Ledger','Tam Oakes: present. Widow Sparrow: present. Four names crossed out before birth.'],
 ['Hymnal Margin','Do not sing the ninth verse. It is not meant for throats.'],
 ['Founders\' Inscription','WE RANG THE WORLD. THE WORLD SHALL FEED THE CHOIR.'],
 ['A Pawn Ticket','One silver tooth. One wedding bell. Redeem before the last toll.'],
 ['The Chandler\'s Prayer','May the wax be clean. May the wick be long. May the flame forget the moth.'],
 ['Quillon\'s Sentence','Her head shall be carried until the names she stole are counted.'],
 ['The Salt Road','The pilgrims come in silence. Their bells are stopped with salt.'],
 ['A Foundry Order','Cast the mold about the tongue. No living hand shall light the furnace.'],
 ['The Regent\'s Letter','I have kept a place near the fire. You will come to me in the end.'],
 ['The Long Stair','Each link bears a name. Some are not yet born.'],
 ['The Last Founder','We mistook hunger for heaven. We rang the dinner bell.'],
 ['A Page Unwritten','Five names. Four unborn. One abbess who would not let them be taken.']
];
const ATTRACT = [
 {zone:'town',hero:'ringer',seconds:18,title:'FOUR NAMES THE BOOK FORGOT'},
 {zone:'acre',hero:'ringer',seconds:23,title:'EVERY PRESS A BELL STRIKE'},
 {zone:'nave',hero:'ringer',seconds:22,title:'LET THE FURNITURE PRAY'},
 {zone:'crypt',hero:'sexton',seconds:22,title:'THE DEAD HAVE ONE MORE DUTY'},
 {zone:'chapterhouse',hero:'ringer',seconds:24,title:'ATTENDANCE SHALL BE TAKEN'},
 {zone:'march',hero:'lamplighter',seconds:20,title:'KEEP THE WATCH. FEED THE FLAME.'},
 {zone:'works',hero:'cantor',seconds:22,title:'SING UNTIL THE WORLD BENDS'},
 {zone:'mothcourt',hero:'lamplighter',seconds:24,title:'THERE IS ROOM NEAR THE FIRE'},
 {zone:'scaffold',hero:'cantor',seconds:20,title:'THE CHOIR IS HUNGRY'},
 {zone:'chamber',hero:'ringer',seconds:25,title:'FIVE NAMES. ONE LAST TOLL.'},
 {zone:'vigil',hero:'sexton',seconds:24,title:'THE LONG VIGIL NEVER ENDS'}
];
