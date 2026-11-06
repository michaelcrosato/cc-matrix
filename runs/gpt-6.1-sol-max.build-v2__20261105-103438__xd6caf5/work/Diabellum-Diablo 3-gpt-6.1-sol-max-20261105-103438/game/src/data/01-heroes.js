def('hero', 'ringer', { name: 'Bram Tolliver', title: 'The Ringer', blurb: 'An iron clapper. A kind heart. A very loud answer.', resource: 'Peal', color: '#e2a568', regen: 0,
  build: 'bulky', size: 1.32, outfit: 'tunic', weapon: 'clapper', hair: 'bald', sleeves: 'none', cloth: '#7d373d', cape: '#422837', skills: ['clap', 'knell', 'rope', 'leap', 'charge', 'peal', 'hide', 'hour'],
  vows: [['Rope Burns', 'Spending Peal restores life.'], ['Thick Skull', 'Forty percent less stun and slow.'], ['Ring Out', 'More force. Collisions hurt.'], ['Stubborn as a Mule', 'Survive one lethal blow every two minutes.']],
  barks: ['Ring out!', 'Mind your ears.', 'That one rang hollow.', 'Stay behind me.', 'One more for the parish.', 'The rope remembers.', 'Not today.', 'A good clear note.', 'Up you get.', 'Let them hear us.'] });
def('hero', 'cantor', { name: 'Brother Iven', title: 'The Cantor', blurb: 'Blind to the world. Able to hear it breaking.', resource: 'Breath', color: '#81bddb', regen: 12,
  build: 'heroic', size: 1.3, outfit: 'robe', weapon: 'psalter', hair: 'short', sleeves: 'long', cloth: '#435e94', cape: '#c7c4ae', hood: true, skills: ['psalm', 'cinders', 'frost', 'thunder', 'candle', 'rest', 'ward', 'note'],
  vows: [['Perfect Pitch', 'Chords deal forty percent more damage.'], ['Deep Lungs', 'Thirty more Breath.'], ['Blind Faith', 'Standing still increases critical chance.'], ['Last Breath', 'A lethal blow restores Breath instead. Once per two minutes.']],
  barks: ['Sing with me.', 'I can hear you stop.', 'A note out of place.', 'Breathe.', 'The stones remember.', 'No voice is lost.', 'Listen below.', 'The third note.', 'Together now.', 'The last verse.'] });
def('hero', 'lamplighter', { name: 'Wren Ashby', title: 'The Lamplighter', blurb: 'Keep the watch. Feed the flame. Fear the dark.', resource: 'Oil', color: '#f4bc57', regen: 18,
  build: 'heroic', size: 1.25, outfit: 'coat', weapon: 'crossbow', hair: 'ponytail', sleeves: 'long', cloth: '#33483f', cape: '#74402d', hat: 'watch', skills: ['bolt', 'lantern', 'volley', 'trap', 'vault', 'smoke', 'fuse', 'dawn'],
  vows: [['Steady Hand', 'Full Nerve grants critical chance.'], ['Deep Pockets', 'Twenty more Oil. Potions refill it.'], ['Night Watch', 'A wider circle of lantern light.'], ['Close Shave', 'A lethal blow leaves smoke and one life.']],
  barks: ['Lights up.', 'Stay out of the dark.', 'Mind the wick.', 'Night watch.', 'The flame holds.', 'Caught you.', 'Keep moving.', 'Oil well spent.', 'That will leave a mark.', 'Dawn is late.'] });
def('hero', 'sexton', { name: 'Maud Harrow', title: 'The Sexton', blurb: 'On first-name terms with everyone in the ground.', resource: 'Soil', color: '#a4c97d', regen: 1,
  build: 'heroic', size: 1.2, outfit: 'coat', weapon: 'spade', hair: 'long', sleeves: 'long', cloth: '#665b3d', cape: '#4b6042', hood: true, hunch: .28, skills: ['spade', 'raise', 'burst', 'grave', 'shallow', 'rites', 'bone', 'field'],
  vows: [['Old Bones', 'Armor for every Buried at your side.'], ['Good Soil', 'Nearby corpses yield more Soil.'], ['Plot Holder', 'One more Buried may follow you.'], ['Not Yet', 'A lethal blow leaves one life. Once per two minutes.']],
  barks: ['Back in the ground with you.', 'I dug that one myself. Shallow work.', 'Room for one more.', 'Good soil.', 'Rest is earned.', 'Mind the spade.', 'Come along, Tom.', 'Not your plot.', 'Fine weather for it.', 'I know your mother.'] });
// Every skill is a combination of shared simulation verbs. Tone modifications are data.
function skill(hero, id, name, verb, dmg, range, radius, cost, cd, move, tones, extra = {}) {
  const index = DB.hero[hero].skills.indexOf(id), unlock = [1, 1, 2, 3, 5, 7, 9, 12][index];
  def('skill', id, { hero, name, verb, dmg, range, radius, cost, cd, move, unlock, wind: index === 0 ? .09 : .18, duration: .4,
    text: { cone: 'Strike every foe before you.', wave: 'Send a wave through the dead.', spin: 'Turn through the crowd.', leap: 'Cross the ground and crash down.', charge: 'Rush through foes in a line.', buff: 'Strengthen the whole parish.', guard: 'Weather the blows.', bell: 'Bring down a great toll.', bolt: 'A swift shot seeks your mark.', nova: 'A ring bursts from your feet.', chain: 'A note leaps between foes.', lob: 'An offering falls from above.', blink: 'Leave danger behind.', beam: 'Hold a note until the world bends.', summon: 'Call a friend from the soil.', corpse: 'The dead have one more duty.', area: 'The ground remembers.', heal: 'Turn the dead to living strength.' }[verb],
    tones: tones.map(([name, text, mod]) => ({ name, text, ...mod })), ...extra });
}
skill('ringer','clap','Clap','cone',1.1,34,26,0,.38,'slash',[
 ['Tenor','Every strike adds Ringing.',{ring:1}],['Cracked','The third hit sends a ground wave.',{wave:1}],['Quick Time','Faster hands, lighter blows.',{speed:1.25,mul:.8}]],{gain:8,combo:true});
skill('ringer','knell','Knell','cone',3.2,48,40,30,.8,'overhead',[
 ['Deep','Draw the crowd into the toll.',{pull:75}],['Funeral','The slain burst into their neighbors.',{explode:1}],['Fissure','Leave a burning scar.',{pool:3,element:'fire'}]],{toll:true});
skill('ringer','rope','Swing the Rope','spin',1.2,0,47,8,.35,'spin',[
 ['Gale','Drag nearby foes around you.',{pull:65}],['Ember','Leave fire in your wake.',{pool:3,element:'fire'}],['Long Pull','Half the cost. A slower turning.',{costMul:.5,mul:1.3}]]);
skill('ringer','leap','Leap of Faith','leap',3,100,45,0,10,'plunge',[
 ['Hard Landing','Stagger lasts three seconds.',{stun:3}],['Wide Arc','Leap fifty percent farther.',{rangeMul:1.5}],['Rapture','Pull foes to your landing.',{pull:75}]],{stun:1.5});
skill('ringer','charge','Bell Charge','charge',2.4,100,22,0,12,'bash',[
 ['Ram','A harder strike at the end.',{mul:1.5}],['Penance','Each foe struck restores life.',{leech:.03}],['Second Wind','Five hits halve the cooldown.',{refund:5}]]);
skill('ringer','peal','Great Peal','buff',0,0,100,0,30,'cast',[
 ['Alarm','The dead flee for three seconds.',{fear:3}],['Vespers','The parish regenerates life.',{regen:1}],['Reveille','The parish moves faster.',{haste:1}]],{duration:12});
skill('ringer','hide','Iron Hide','guard',0,0,0,0,25,'bash',[
 ['Bronzed','Reflect a share of blocked blows.',{reflect:1}],['Stubborn','Stand against every stun.',{immune:1}],['Ring True','Blows pulse Ringing.',{ring:1}]],{duration:6});
skill('ringer','hour','Toll the Hour','bell',12,120,82,0,60,'twohand',[
 ['Noon','Three smaller bells fall in a line.',{triple:1,mul:.65}],['Midnight','A patient toll. A greater ruin.',{delay:2,mul:1.8}],['Evensong','The bell pulses for six seconds.',{pool:6}]],{delay:1,toll:true});
skill('cantor','psalm','Psalm','bolt',1.3,145,10,0,.4,'cast',[
 ['Candle','A note that burns.',{element:'fire',burn:1}],['Shroud','A note that chills.',{element:'frost',slow:1}],['Thunder','A note shared with two more.',{element:'lightning',chain:3}]],{gain:3});
skill('cantor','cinders','Hymn of Cinders','wave',2.4,130,20,25,.8,'cast',[
 ['Psalter','A far wider wave.',{radiusMul:1.8}],['Rekindle','Burning deaths return Breath.',{refund:5,burn:1}],['Ash Verse','A Shroud note that chills.',{element:'frost',slow:1}]],{element:'fire'});
skill('cantor','frost','Hoarfrost Verse','nova',1.8,0,65,30,8,'cast',[
 ['Shatter','Frozen foes burst when struck.',{shatter:1}],['Long Winter','Hold them for longer.',{stun:3.5}],['Thaw','Three foes restore a little life.',{leech:.04}]],{element:'frost',stun:2});
skill('cantor','thunder','Thunder Canticle','chain',1.5,145,65,20,.9,'cast',[
 ['Antiphon','The note returns along its path.',{mul:1.8}],['Storm Cell','Leave a small storm behind.',{pool:4}],['Forked','Two chains, softly sung.',{chain:10,mul:.7}]],{element:'lightning',chain:5});
skill('cantor','candle','Falling Candle','lob',6.5,135,53,50,4,'throw',[
 ['Chandelier','Three candles in the dark.',{triple:1,mul:.6}],['Tallow','Wax slows those who stand in it.',{slow:1}],['Shroud Wick','A cold wick holds them still.',{element:'frost',stun:2}]],{delay:.7,pool:4,element:'fire'});
skill('cantor','rest','Rest Note','blink',0,95,32,0,9,'cast',[
 ['Grace Note','The rest comes twice as often.',{cdMul:.5}],['Fermata','Nearby foes pause a moment.',{stun:.6}],['Da Capo','Return to the note you left.',{return:1}]]);
skill('cantor','ward','Shroud Ward','guard',0,0,0,0,20,'cast',[
 ['Mirror','The next projectile turns back.',{reflect:1}],['Cold Comfort','Breath returns more quickly.',{regen:1}],['Cantus Firmus','The note cannot be interrupted.',{immune:1}]],{duration:8,shield:.4,element:'frost'});
skill('cantor','note','The Long Note','beam',3.5,175,15,0,45,'cast',[
 ['Candle','The note leaves a burning path.',{element:'fire',pool:4}],['Shroud','The note freezes what it holds.',{element:'frost',stun:2}],['Thunder','The note forks to its neighbors.',{element:'lightning',chain:4}]],{duration:5});
skill('lamplighter','bolt','Bolt','bolt',1.2,155,8,0,.35,'thrust',[
 ['Piercing','The bolt passes through three.',{pierce:3}],['Scatter','Three bolts cover the watch.',{triple:1,mul:.6}],['Pitch-Soaked','The mark burns and is Lit.',{burn:1,lit:1}]],{gain:6});
skill('lamplighter','lantern','Lantern Toss','lob',2,125,45,25,1.2,'throw',[
 ['Cluster','Three small lanterns.',{triple:1,mul:.6}],['Oil Slick','Oil slows the dead.',{slow:1}],['Beacon','The dead gather at the flame.',{pull:65}]],{pool:5,lit:1,element:'fire',delay:.5});
skill('lamplighter','volley','Volley','area',6,145,50,40,5,'cast',[
 ['Driven Rain','The rain follows your steps.',{follow:1}],['Saint\'s Arrows','Strike harder against Lit foes.',{litBonus:1.5}],['Wide','A wider patch of rain.',{radiusMul:1.6}]],{pool:1.5});
skill('lamplighter','trap','Wickspike Trap','area',3.5,65,35,10,4,'throw',[
 ['Chain','The trap strikes its neighbors.',{chain:4}],['Longfuse','A patient, larger trap.',{radiusMul:1.5,delay:1}],['Snare','Pull them into the teeth.',{pull:65}]],{stun:2,delay:.5});
skill('lamplighter','vault','Vault','leap',1.8,85,32,8,5,'flyingkick',[
 ['Tumble','A shorter wait between vaults.',{cdMul:.5}],['Trail of Sparks','Leave a burning trail.',{pool:3,element:'fire'}],['Light Feet','A kill refunds Oil.',{refund:10}]]);
skill('lamplighter','smoke','Smoke Hood','guard',0,0,45,18,15,'cast',[
 ['Snuff','Blind the nearest foes.',{stun:2}],['Second Shadow','The dead turn toward your smoke.',{fear:3}],['Mugger','Your next shot strikes harder.',{ambush:3}]],{duration:3,stealth:true});
skill('lamplighter','fuse','Long Wick','wave',6,150,24,30,10,'throw',[
 ['Ring Fuse','A ring of fire surrounds you.',{nova:1}],['Slow Burn','Wait for a doubled burst.',{delay:1,mul:2}],['Quickmatch','Fire runs faster.',{speed:1.5}]],{pool:3,element:'fire'});
skill('lamplighter','dawn','False Dawn','nova',4,0,180,0,60,'cast',[
 ['Sunrise','The Lit light stays longer.',{pool:8}],['Noonlight','A harder, brighter dawn.',{mul:1.5}],['Bonfire','Every foe leaves burning ground.',{pool:5,burn:1}]],{stun:2,lit:1,element:'fire'});
skill('sexton','spade','Spade Strike','cone',1.3,34,28,0,.42,'overhead',[
 ['Clod','Throw a clod across the yard.',{bolt:1,rangeMul:4}],['Bury Alive','Leave the dead slow-footed.',{slow:1}],['Edge','A wider blade.',{radiusMul:1.5}]],{gain:10});
skill('sexton','raise','Raise the Buried','summon',1,85,20,30,4,'cast',[
 ['Bowmen','The Buried strike at range.',{ranged:1}],['Big Tom','One very large friend.',{giant:1}],['Restless','They burst when they fall.',{explode:1}]]);
skill('sexton','burst','Corpse Burst','corpse',3,115,45,10,1,'cast',[
 ['Gas','Leave a cloud of grave breath.',{pool:4,element:'poison'}],['Bone Shards','Shards strike nearby foes.',{chain:5}],['Hungry','The dead return a little life.',{leech:.06}]]);
skill('sexton','grave','Open Grave','area',3.2,115,55,25,4,'cast',[
 ['Deep Plot','A greater patch of earth.',{radiusMul:1.4}],['Dirt Nap','The soil bears more friends.',{summon:1}],['Mass Grave','Stronger hands pull them down.',{pull:80}]],{pool:4,pull:55});
skill('sexton','shallow','Shallow Grave','blink',1.5,90,40,0,12,'plunge',[
 ['Undertow','Drag them to your arrival.',{pull:70}],['Cold Earth','The earth chills their feet.',{pool:3,slow:1}],['Wake','Rise safely for two seconds.',{immune:2}]]);
skill('sexton','rites','Last Rites','heal',0,0,95,0,14,'cast',[
 ['Shroud','The dead give a shield.',{shield:.3}],['Communion','Share the rites with allies.',{party:1}],['Viaticum','The rites replenish Soil.',{resource:35}]]);
skill('sexton','bone','Tithe of Bone','nova',2.2,0,75,30,6,'cast',[
 ['Spiral','The ring reaches farther.',{radiusMul:1.5}],['Caltrops','The bones stay in the ground.',{pool:4}],['Piercing','The spears strike harder.',{mul:1.5}]]);
skill('sexton','field','Potter\'s Field','summon',1.2,120,100,0,60,'cast',[
 ['Reaping','The Buried burst at the end.',{explode:1}],['Hold Fast','The dead defend your steps.',{taunt:1}],['Sermon','The Buried run to their duty.',{haste:1}]],{count:6,duration:12});
