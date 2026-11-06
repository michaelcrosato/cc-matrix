/* GAME START: Diabellum */
(()=>{
"use strict";
const E = My3D2dge, { px, clamp, lerp } = E;
const ROOT = typeof window === 'undefined' ? globalThis : window;
const HAS_DOM = typeof document !== 'undefined';
const TITLE = 'Diabellum', VERSION = '1.0.0';
const SESSION = !!(ROOT.AIHub && ROOT.AIHub.active);
const DB = Object.create(null);
function def(kind, id, spec) { (DB[kind] ||= {})[id] = { id, ...spec }; }
const BUS = { listeners: {}, on(k, f) { (this.listeners[k] ||= []).push(f); }, emit(k, v) { for (const f of this.listeners[k] || []) f(v); } };
const hash = s => { let n = 2166136261; for (const c of String(s)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const adiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const norm = (x, y) => { const m = Math.hypot(x, y); return m > .001 ? [x / m, y / m] : [0, 0]; };
const choose = (r, a) => a[Math.floor(r() * a.length)];
const clone = x => JSON.parse(JSON.stringify(x));
const COLORS = ['#e8a96d', '#79b6df', '#87c9a1', '#d8b0db'];
const INK = '#090e16', PANEL = '#111c25', GOLD = '#d9b77c', IVORY = '#f0e4cb', MUTED = '#8fa3a4', TEAL = '#77c9bd';
const PLAY = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'Pad9'], confirm: ['Enter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  s0: ['Mouse0', 'KeyF', 'Pad0'], s1: ['Mouse2', 'KeyG', 'Pad2'], s2: ['Digit1', 'Pad3'], s3: ['Digit2', 'Pad1'], s4: ['Digit3', 'Pad5'], s5: ['Digit4', 'Pad7'],
  evade: ['Space', 'Pad11'], potion: ['KeyQ', 'Pad4'], interact: ['KeyE', 'Pad6'], portal: ['KeyT', 'Pad12'],
  map: ['KeyM', 'Tab', 'Pad13'], inventory: ['KeyI', 'KeyC', 'Pad14'], skills: ['KeyK', 'Pad15'], journal: ['KeyJ', ...(SESSION ? [] : ['Pad8'])],
  pagePrev:['PageUp','WheelUp'],pageNext:['PageDown','WheelDown'],stand: ['ShiftLeft', 'ShiftRight'], labels: ['AltLeft'], prev: ['BracketLeft', 'Pad4'], next: ['BracketRight', 'Pad5'],
  aimU: ['PadRAxisUp'], aimD: ['PadRAxisDown'], aimL: ['PadRAxisLeft'], aimR: ['PadRAxisRight']
};
const MENU = { ...PLAY, up: [...PLAY.up, 'Pad12'], down: [...PLAY.down, 'Pad13'], left: [...PLAY.left, 'Pad14'], right: [...PLAY.right, 'Pad15'] };
const TUNING = [
 ['Hero', 'damage', 'Damage', 1, .25, 4, .05], ['Hero', 'life', 'Life', 1, .25, 4, .05], ['Hero', 'speed', 'Move speed', 1, .5, 2, .05],
 ['Hero', 'attackSpeed', 'Attack speed', 1, .5, 2, .05], ['Hero', 'cooldowns', 'Cooldowns', 1, 0, 2, .05], ['Hero', 'resource', 'Resource gain', 1, .25, 4, .05],
 ['Hero', 'evadeRecharge', 'Evade recharge', 5, 1, 12, .5], ['Hero', 'potionCD', 'Potion cooldown', 20, 2, 60, 1], ['Hero', 'votiveChance', 'Votive chance', .14, 0, 1, .02],
 ['Monsters', 'foeLife', 'Monster life', 1, .25, 6, .05], ['Monsters', 'foeDamage', 'Monster damage', 1, .25, 6, .05], ['Monsters', 'foeSpeed', 'Monster speed', 1, .5, 2, .05],
 ['Monsters', 'density', 'Crowd density', 1, .25, 4, .25], ['Monsters', 'elites', 'Elite frequency', 1, 0, 4, .25], ['Monsters', 'telegraph', 'Telegraph time', 1, .5, 2, .05], ['Monsters', 'coopLife', 'Co-op life per hero', .75, 0, 2, .05],
 ['Rewards', 'xp', 'Experience', 1, 0, 10, .25], ['Rewards', 'pennies', 'Pennies', 1, 0, 10, .25], ['Rewards', 'drops', 'Item drops', 1, 0, 10, .25],
 ['Rewards', 'relicChance', 'Relic chance', 1, 0, 50, 1], ['Rewards', 'vigilFill', 'Reckoning fill', 1, .25, 4, .25],
 ['Feel', 'hitstop', 'Hit-stop', 1, 0, 3, .1], ['Feel', 'launch', 'Knockback and launch', 1, 0, 3, .1], ['Feel', 'shake', 'Screen shake', 1, 0, 3, .1],
 ['Feel', 'assist', 'Aim assist', 1, 0, 2, .1], ['Feel', 'requiem', 'Requiem window', 1.6, .5, 4, .1]
];
const DEFAULTS = Object.fromEntries(TUNING.map(s => [s[1], s[3]]));
const TUNE = { ...DEFAULTS, ...(!SESSION ? E.store.get('diabellum-tuning', {}) : {}) };
const CHEATS = { god: false, oneHit: false, infinite: false, noCD: false, noClip: false, freezeAI: false, reveal: false, bot: false, overlays: false, step: false, stop: false };
let W = null, PANEL_STATE = null, net = null, titleIdle = 0, lastActivity = 0, attract = false, attractClock = 0, attractIndex = 0;
let game, shell, talk, viewRigs = new Map(), currentHover = null, lastHitStop = -1, frontFocus = 0, selectedHero = 0, prologuePage = 0;
let externalInput = false;
const RESUME_GUARDS=new Map();
function saveTune() { if (!SESSION) E.store.set('diabellum-tuning', TUNE); }
function isTuned() { return Object.keys(DEFAULTS).some(k => Math.abs(TUNE[k] - DEFAULTS[k]) > .0001); }
function resetTune(group) { for (const s of TUNING) if (!group || s[0] === group) TUNE[s[1]] = s[3]; saveTune(); }
function event(w, kind, data = {}) { const e = { ...data, ...(data.kind ? {kindName:data.kind} : {}), kind, t: w.time }; w.events.push(e); if (w === W) onWorldEvent(e); BUS.emit(kind, { w, ...data }); return e; }
function toast(text, color = GOLD) { if (W) { W.toasts.push({ text, color, t: 3.6 }); if (W.toasts.length > 4) W.toasts.shift(); } }
function say(text, speaker = 'Mother Quillon', duration = 5) {
  if (!W) return; W.dialogue = { text, speaker, t: duration }; if (audio) audio.speak(speaker, text);
  if(talk&&game&&game.sceneName==='play'&&!attract&&!PANEL_STATE)talk.say(text,{name:speaker,portrait:speaker==='Mother Quillon'?(g,x,y,size)=>lanternArt(g,x+size/2,y+size*.73,size/25,Math.sin(game.real*17)*.5+.5):null,auto:duration,modal:false,y:Math.max(57,game.H-156),voice:false});
}
function prompt(action, input = game.input) { return input.label(action); }
function getMain(w = W) { return w && (w.heroes.find(h => h.id === w.me) || w.heroes[0]); }


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


const ABOUT = {
  sourceInformation:{
    date:'2026-11-05 10:34:38',source:'Diablo 3',plan:'PLAN.md',genre:'Action RPG with loot and co-op',perspective:'Fixed isometric',
    tech:'JavaScript; my-3D2dge v0.89.1; AI Hub session client 1.4.0; one offline HTML file.',
    artDirection:'Native pixel-art puppets; original gothic bronze, wax, bone and stained glass. All assets drawn in code.',
    animation:'Native Humanoid, Blob and E.MOVES; custom weapons, beasts, moth wings, bells, evades and launched corpses.',
    audio:'Original Web Audio synthesis: bells, choir, organ, strings, drums, lute, weather and gibberish voices. No audio files. Music defaults to 10%.',
    online:'AI Hub Session Protocol v1 shared world, 1-4 online players; standalone 1-4 couch co-op.',
    testing:'Headless state tests, full scripted campaign and Vigil, emulated pads, offline audio, touch profiles, Chromium, Firefox, WebKit and the Hub harness. Screenshots used for visual checks.',
    research:'Read the provided plan, engine API and asset guide, engine source, Emberdeep algorithms and the official Hub protocol and example.',
    environment:'Codex CLI (headless); Linux, Ubuntu 26.04 on WSL2. No physical controller, TV or real iOS device.',
    model:'OpenAI, gpt-6.1-sol, reasoning effort max',usage:'added on import'
  },
  testingFeedback:['Testing caught 10 tracked game defects; all were fixed.','Four could block gameplay: the town exit, input-hook signature, summoned archer source and portal glow call.','The complete campaign bot for all four heroes, including the final held interaction and a Vigil clear.','Static title screenshots exposed fewer consequential defects than the state-driven playthrough.'],
  engineFeedback:[
    'The native rigs, custom weapon hooks and pixel lighting make a coherent scene from code.',
    'Yes. Hook callbacks receive dt, and glow helpers require a canvas argument. Runtime and render tests corrected those guesses.',
    'The deterministic multiplayer world, skill verbs, progression and quest director.',
    'Coordinating input, hit-stop and paused panels across native menus and the canvas interface.',
    'None. Added game-specific materials, shapes, weapons, hats and draw hooks through public registries.',
    'Provide a small shared-world action-RPG starter with authoritative snapshots and a tested panel kit.'
  ],
  promptFeedback:[
    'The original bell-world, concrete combat feel and explicit acceptance tests gave the game a strong direction.',
    'The 45-75 minute campaign and extensive endgame exceed the usual scope of a vertical slice.',
    'Making the complete campaign, multiplayer, controller UI and procedural presentation work together.',
    'Separate essential demo acceptance criteria from optional full-production content counts.'
  ],
  aiHub:{name:TITLE,tagline:'Every soul counted. Except yours.',description:'Four uncounted parishioners carry a talking abbess into a world of hungry bells. Break the dead, gather Relics and ring through three chapters or an endless co-op Vigil.',type:'Game',genre:'RPG',source:'Diablo 3',series:'Diablo',players:'1–4',controls:'WASD/stick move; click/F or Cross attack; RMB/G, 1-4 or Square/Triangle/Circle/R1/R2 skills; Space/RS evade; Q/L1 potion; E/L2 interact; Esc/Options pause.',tags:['co-op','fantasy','pixel art','boss fights','story','isometric']}
};
const CREDITS=[
 'Narrative and game design: the provided PLAN.md. Implementation, additional writing, original procedural art and score: this build.',
 'my-3D2dge engine: Michael Crosato, MIT. Native Humanoid and Blob rigs, shapes and pixel renderer.',
 'Emberdeep: Michael Crosato, MIT. Consulted for combat architecture, corpse motion and the data registry pattern; no game fork.',
 'AI Hub session client and harness: Michael Crosato. Client included unmodified.',
 'No external image, font, music, audio, motion-capture or CC0 asset packs are required.',
 'WebKit phone profiles stand in for iOS Safari. Controller tests use standard-mapping emulation.'
];
function aboutPages(){
  const pages=[{title:'The parish',rows:[['The game',ABOUT.aiHub.tagline+' '+ABOUT.aiHub.description],['Scope','Three complete chapters, four heroes, three bosses and the Long Vigil. Campaign spaces are condensed for this demo.'],['Omissions','No motion-capture clips or optional WebGPU lighting. Canvas lighting works offline in all three browser engines.']]}];
  const entries=Object.entries(ABOUT.sourceInformation);for(let i=0;i<entries.length;i+=2)pages.push({title:'Source information',rows:entries.slice(i,i+2)});
  for(const [title,answers,labels] of [['Testing feedback',ABOUT.testingFeedback,['Issues caught','Game-breaking issues','Most helpful test','Least helpful test']],['Engine feedback',ABOUT.engineFeedback,['Liked most','Stuck or guessed wrong','Built ourselves','Hardest part','Engine changes','Suggested improvement']],['Prompt feedback',ABOUT.promptFeedback,['Liked most','Confusing','Hardest work','Suggested change']]])for(let i=0;i<answers.length;i+=2)pages.push({title,rows:answers.slice(i,i+2).map((a,j)=>[labels[i+j],a])});
  for(let i=0;i<CREDITS.length;i+=2)pages.push({title:'Credits',rows:CREDITS.slice(i,i+2)});
  return pages;
}


function newHero(kind = 'ringer', id = 0, level = 1, color = COLORS[id % 4]) {
  const spec = DB.hero[kind], h = new E.Body({x:0,y:0,r:6,friction:0,bounce:.1});
  Object.assign(h,{id,kind,name:spec.name,team:'hero',color,level,xp:0,hp:80+12*level,maxHp:80+12*level,resource:kind==='ringer'?30:100,resourceMax:100,nerve:30,alive:true,
    facing:-Math.PI/4,slots:spec.skills.slice(0,6),tones:{},vows:[0,1,3],cooldowns:{},potion:0,evades:2,evadeRegen:0,dodge:0,inv:0,stun:0,guard:0,shield:0,
    hits:0,combo:0,attack:null,queued:null,combat:0,notes:[],chord:false,gear:Array(8).fill(null),bag:[],pennies:0,mats:{scrap:0,salt:0,ash:0},gems:[],lantern:[null,null,null],
    buffs:{},stats:{kills:0,damage:0,deaths:0,revives:0,broken:0,reckoning:0,warden:0},deathTimer:0,revive:0,walkTarget:null,bot:false,local:true,dieSave:0,verses:[0,0,0,0],verseXP:0});
  for(const sid of spec.skills) h.tones[sid] = 0;
  return h;
}
function newWorld(seed=1711, options={}) {
  const w = {seed,authority:options.authority!==false,session:!!options.session,me:options.me??0,heroes:[],foes:[],allies:[],corpses:[],drops:[],props:[],objects:[],hazards:[],shots:[],fx:[],numbers:[],decals:[],events:[],toasts:[],
    rng:E.rng(hash(seed+':ai')),lootRng:E.rng(hash(seed+':loot')),time:0,zoneTime:0,uid:10,zone:'prologue',progress:0,flags:[],visited:[],lore:[],recipe:[],stash:[[],[],[]],
    kills:0,killsZone:0,broken:0,requiem:0,requiemT:0,bestRequiem:0,sacrilege:0,sacrilegeT:0,reckoning:0,tier:1,greater:false,vigilClock:300,records:{},difficulty:0,
    ended:false,results:null,dialogue:null,zoneCard:0,chapterCard:0,respawn:{x:0,y:0},returnTo:null,returnPos:null,endingPage:0,endingT:0,cheats:{},screen:'play',stats:{elapsed:0},need:0};
  return w;
}
function heroMax(h) { return (80+12*h.level+stat(h,'vigor')+10*h.verses[1])*TUNE.life; }
function stat(h,key){let n=0;for(const item of h.gear)if(item){for(const a of item.affixes)if(a.key===key)n+=a.value;if(item.gem){const [g,grade]=item.gem,keys=item.slot===0?['weaponGem','critDamage','lifeHit']:item.slot<5?['vigor','armor','resist']:['pennies','fortune','speed'],values=item.slot===0?[2,12,2]:item.slot<5?[12,8,6]:[20,15,3];if(key===keys[g])n+=values[g]*grade;}}return n;}
function hasVow(h,n){return h.vows.slice(0,h.level>=24?3:h.level>=16?2:h.level>=8?1:0).includes(n);}
function powers(h) { const p=h.gear.filter(i=>i&&i.identified&&i.relic).map(i=>DB.relic[i.relic].power);for(const id of h.lantern)if(id)p.push(DB.relic[id].power);return new Set(p); }
function setCount(h) { const n={};for(const i of h.gear)if(i?.set)n[i.set]=(n[i.set]||0)+1;return Math.max(0,...Object.values(n)); }
function damageBase(h) { const weapon=h.gear[0], base=(weapon?weapon.damage:8*Math.pow(1.15,h.level-1))+stat(h,'weaponGem');return base*(1+stat(h,'devotion')*.01+stat(h,'element')*.01+stat(h,'skill')*.01+.012*h.verses[0]+(setCount(h)>=2?.12:0)+(h.zoneDevotion||0)); }
function xpNext(h) { return 60*Math.pow(1.35,h.level-1); }
function gainXP(w,h,amount) {
  if(h.level>=30){h.verseXP+=amount;while(h.verseXP>4000){h.verseXP-=4000;h.versePoints=(h.versePoints||0)+1;}return;}
  h.xp+=amount*TUNE.xp;
  while(h.level<30 && h.xp>=xpNext(h)){h.xp-=xpNext(h);h.level++;h.maxHp=heroMax(h);h.hp=h.maxHp;event(w,'level',{id:h.id,level:h.level,x:h.x,y:h.y});}
}
function makeRows(w,z) {
  const layoutRng=E.rng(hash(w.seed+':'+z.id+':layout'));
  const layout=z.id==='vigil'?choose(layoutRng,['halls','yard','islands']):z.layout;
  const [width,height]=z.size, rows=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>x===0||y===0||x===width-1||y===height-1?'#':'.'));
  if(layout==='halls'||layout==='hall') {
    const offset=5+Math.floor(layoutRng()*4),stride=11+Math.floor(layoutRng()*4);
    for(let y=offset;y<height-6;y+=stride)for(let x=offset;x<width-6;x+=stride)if(Math.abs(x+y-width)>14&&layoutRng()>.15){for(let v=0;v<3;v++)for(let u=0;u<3;u++)rows[y+v][x+u]='#';}
    for(let y=3;y<height-3;y++)if(y%12>3&&y%12<9){rows[y][3]='#';rows[y][width-4]='#';}
  }
  if(layout==='islands') {
    for(let y=3;y<height-3;y++)for(let x=3;x<width-3;x++)if((x%20>14&&y%20>8)||(y%20>14&&x%20>8))rows[y][x]='~';
    // A broad diagonal causeway always connects the landings.
    for(let y=3;y<height-3;y++)for(let x=3;x<width-3;x++)if(Math.abs(x+y-width)<13)rows[y][x]='.';
  }
  if(z.layout==='town') {
    for(const [x0,y0,bw,bh] of [[7,5,10,7],[33,7,11,8],[5,30,9,10],[34,33,11,9]])for(let y=y0;y<y0+bh;y++)for(let x=x0;x<x0+bw;x++)rows[y][x]='H';
  }
  return rows.map(r=>r.join(''));
}
function enterZone(w,id,options={}) {
  const z=DB.zone[id], theme=THEMES[z.theme]; w.zone=id;w.explored=new Set();w.screen='play';w.zoneTime=0;w.killsZone=0;w.need=z.need||0;w.foes=[];w.corpses=[];w.drops=[];w.objects=[];w.props=[];w.fx=[];w.hazards=[];w.shots=[];w.numbers=[];w.decals=[];w.allies=[];w.bossId=null;w.bossDefeated=false;w.zoneCard=4.2;w.results=null;w.ended=false;w.angelusKneeling=false;w.finishStrike=false;w.activeEvent=null;w._vigilSpawn=0;
  if(!w.visited.includes(id))w.visited.push(id);
  const rows=makeRows(w,z), C=E.tones(theme.floor);
  const stoneOpts={stones:[E.hex(theme.floor),E.hex(E.shade(theme.floor,.025))],mortar:E.hex(E.shade(theme.floor,-.12)),hi:E.hex(E.shade(theme.floor,.08)),lo:E.hex(E.shade(theme.floor,-.05)),speck:E.hex(E.shade(theme.floor,-.07))};
  w.map=new E.TileMap({rows,legend:{'#':1,'H':2,'.':{floor:'stone'},'~':{floor:'pit',block:true}},types:{
    1:{h:z.layout==='yard'?16:52,top:E.shade(theme.wall,.15),side:theme.wall,face:'stone',roof:'slab',cut:true,cutH:12},
    2:{h:68,top:'#725052',side:'#a99e83',face:'timber',roof:'tiles',beam:'#3e3533',cut:true}},
    floorTex:(x,y,tag)=>tag==='pit'?E.hex('#171e2c'):z.theme==='fields'?E.tex.grass(x,y,{base:'#71865a',dark:'#5b744d',light:'#82955f',flower:'#e0ce97'}):z.theme==='salt'?E.tex.dirt(x,y,{base:theme.floor,dark:C.sh,light:C.lt}):E.tex.flagstone(x,y,stoneOpts),outside:E.shade(theme.floor,-.12),ao:5});
  w.flow=new E.FlowField(w.map);w.botFlow=new E.FlowField(w.map);w.width=z.size[0]*16;w.height=z.size[1]*16;
  w.spawn={x:w.width*.22,y:w.height*.75};w.exit={x:w.width*.75,y:w.height*(z.layout==='town'?.32:.22)};w.respawn={...w.spawn};
  if(z.layout==='boss'){w.spawn={x:w.width*.36,y:w.height*.67};w.exit={x:w.width*.64,y:w.height*.26};w.respawn={...w.spawn};}
  for(let i=0;i<w.heroes.length;i++){const h=w.heroes[i];Object.assign(h,{x:w.spawn.x+i*12,y:w.spawn.y,z:0,vx:0,vy:0,vz:0,alive:true,deathTimer:0,walkTarget:null,attack:null,combat:0,zoneDevotion:0});if(h.follower){h.gear[0]=rollItem(w,h,{slot:0,rarity:2});h.gear[2]=rollItem(w,h,{slot:2,rarity:2});}h.maxHp=heroMax(h);h.hp=h.maxHp;h.shield=0;h.inv=2;}
  const r=E.rng(hash(w.seed+':'+id+':dress'));
  // Set dressing follows the same stream on every copy, independent of combat and loot.
  for(let i=0;i<(z.layout==='boss'?40:140);i++){
    let x=(3+r()*(z.size[0]-6))*16,y=(3+r()*(z.size[1]-6))*16;
    if(!w.map.walkable(Math.floor(x/16),Math.floor(y/16)))continue;
    const route=Math.abs(x+y-w.width), props=z.theme==='grave'?['headstone','headstone','deadTree','candle','urn']:z.theme==='town'?['lamp','crate','barrel','candle','headstone']:z.theme==='salt'?['bones','rock','headstone','banner']:z.theme==='works'?['anvil','chain','urn','brazier']:z.theme==='heaven'||z.theme==='chamber'?['pillar','hangingBell','chain','candle']:z.theme==='fields'?['flowers','bush','headstone']:['pew','pew','candelabra','urn','pillar','bones'];
    const type=choose(r,props),breakable=['pew','urn','crate','barrel','headstone','candelabra'].includes(type);
    w.props.push({id:w.uid++,type,x,y,z:0,facing:Math.floor(r()*4)*Math.PI/2,hp:breakable?12:Infinity,broken:false,seed:i,breakable});
  }
  const objects=z.objects||[];
  for(let i=0;i<objects.length;i++) {
    const type=objects[i],t=(i+1)/(objects.length+1),x=lerp(w.spawn.x,w.exit.x,t),y=lerp(w.spawn.y,w.exit.y,t);
    let ox=x+(i%2?-45:45),oy=y+(i%2?-45:45);
    if(z.layout==='town'){const spots=[[.38,.43],[.60,.35],[.65,.55],[.42,.65],[.52,.50],[.3,.57],[.46,.55],[.69,.67]];[ox,oy]=spots[i].map((v,j)=>v*(j?w.height:w.width));}
    if(z.layout==='boss'){const a=i/objects.length*Math.PI*2;ox=w.width*.53+Math.cos(a)*120;oy=w.height*.48+Math.sin(a)*120;}
    if(!w.map.standable(ox,oy,0,6)){for(let radius=16;radius<120;radius+=16){let found=false;for(let a=0;a<8;a++){const xx=ox+Math.cos(a*Math.PI/4)*radius,yy=oy+Math.sin(a*Math.PI/4)*radius;if(w.map.standable(xx,yy,0,6)){ox=xx;oy=yy;found=true;break;}}if(found)break;}}
    w.objects.push({id:w.uid++,type,x:ox,y:oy,z:0,used:false,active:true,progress:0,label:objectLabel(type),index:i,...(type==='lore'?{loreId:(ZONE_LORE[id]||[0])[objects.slice(0,i).filter(t=>t==='lore').length%(ZONE_LORE[id]||[0]).length]}:{})});
  }
  w.objects.push({id:w.uid++,type:'exit',x:w.exit.x,y:w.exit.y,z:0,used:false,label:'Lychgate'});
  if(id==='town')w.objects.push({id:w.uid++,type:'returnPortal',x:w.spawn.x+35,y:w.spawn.y-30,z:0,label:'Return through the Passing Bell',used:!w.returnTo});
  for(const o of w.objects)if(o.type==='crab'){spawnFoe(w,'crab',o.x,o.y);o.used=true;}
  const population=Math.floor((z.count||0)*TUNE.density);
  for(let i=0;i<population;i++){
    const pack=Math.floor(i/9),packs=Math.ceil(population/9),t=.1+.8*(pack+.5)/packs;
    const x=lerp(w.spawn.x,w.exit.x,t)+(r()-.5)*100,y=lerp(w.spawn.y,w.exit.y,t)+(r()-.5)*100;
    const elite=i>16&&i%35===0&&r()<TUNE.elites;
    spawnFoe(w,choose(r,z.pool),x,y,{elite:elite?(i%2?'champion':'rare'):null});
  }
  if(id==='sidecrypt')spawnFoe(w,'verger',w.width*.6,w.height*.4,{elite:'rare'});
  if(z.boss){const f=spawnFoe(w,z.boss,w.width*.55,w.height*.45,{boss:true});w.bossId=f.id;}
  if(id==='vigil'){w.reckoning=0;w.vigilClock=300;for(let i=0;i<42;i++){const a=r()*Math.PI*2,dd=80+r()*180;spawnFoe(w,choose(r,z.pool),w.spawn.x+Math.cos(a)*dd,w.spawn.y+Math.sin(a)*dd,{elite:i===15?'champion':null});}}
  event(w,'zone',{id});return w;
}
function objectLabel(t){return ({forge:'Ysolde • Forge',pawn:'Old Penny • Pawn',agnes:'Sister Agnes • Chandlery',stash:'Shared stash',quillonTown:'Mother Quillon',campfire:'Hire a parishioner',dog:'Pet the dog',vigilDoor:'The Vigil Door',quillon:'Pick up the lantern',lychgate:'Light the Lychgate',unquiet:'The Unquiet Row',lore:'Read a loose page',epitaph:'Read the headstone',chest:'Open the reliquary',chapel:'Light the side chapel',trap:'Cut the chandelier rope',cursed:'The Cursed Reliquary',shrine:'Receive a blessing',oldBell:'Old Patience',regentTalk:'Speak to Regent Sallow',caravan:'Escort the pilgrims',sluice:'Open the bronze sluice',brazier:'Relight the brazier',hangingBell:'Shelter beneath the bell',tongue:'Strike with the Tongue',pylon:'Claim a Vigil blessing',bigEwe:'The Big Ewe',sideCrypt:'Enter the buried chapel',sermon:'Interrupt the Sermon'})[t]||t;}
function spawnFoe(w,kind,x,y,options={}) {
  const b=options.boss?DB.boss[kind]:DB.monster[kind];if(!b)throw Error('Unknown foe '+kind);
  const level=Math.max(DB.zone[w.zone].level,...w.heroes.map(h=>h.level)),diff=DIFFICULTIES[w.difficulty],extra=w.heroes.filter(h=>!h.follower).length-1;
  const hp=18*Math.pow(1.16,level-1)*(b.life||1)*(options.elite==='rare'?7:options.elite?4:1)*(1+Math.max(0,extra)*TUNE.coopLife)*diff.life*TUNE.foeLife*(w.zone==='vigil'?Math.pow(1.17,w.tier-1):1);
  const f=new E.Body({x,y,r:options.boss?14:b.body==='bulky'?8:5,friction:0,bounce:.35});
  Object.assign(f,{id:w.uid++,kind,team:'foe',level,hp,maxHp:hp,lifeTune:TUNE.foeLife,alive:true,boss:!!options.boss,elite:options.elite||null,affixes:options.elite?[choose(w.rng,Object.keys(DB.affix)),...(options.elite==='rare'?[choose(w.rng,Object.keys(DB.affix))]:[])]:[],
    name:options.elite==='rare'?choose(w.rng,['Brother Ash','Tam the Unburied','Sallow Penitent']):b.name,facing:Math.PI/2,atk:1+w.rng(),affixT:3+w.rng()*3,stun:0,slow:0,burn:0,burnTick:0,ringing:0,lit:0,flash:0,think:0,phase:0,pattern:0,spawn:options.boss?0:.5,anim:0,attack:null,reflect:0,shieldT:0});
  const cx=clamp(Math.floor(x/16),2,DB.zone[w.zone].size[0]-3),cy=clamp(Math.floor(y/16),2,DB.zone[w.zone].size[1]-3);
  if(!w.map.walkable(cx,cy)){f.x=clamp(x,50,w.width-50);f.y=w.width-f.x;}
  w.foes.push(f);event(w,'spawn',{id:f.id,kind,x:f.x,y:f.y,boss:f.boss,elite:f.elite,hp:f.hp});return f;
}
function closest(list,from,range=Infinity,predicate=()=>true){let out=null,best=range;for(const u of list)if(predicate(u)){const d=dist(u,from);if(d<best){out=u;best=d;}}return out;}
function objectiveReady(w) {
  if(w.zone==='vigil')return w.bossDefeated;
  const z=DB.zone[w.zone];if(z.boss)return w.bossDefeated;
  if(w.killsZone<w.need)return false;
  const mandatory={prologue:['quillon'],nave:['chapel'],audience:['regentTalk'],march:['caravan'],works:['sluice']};
  return !(mandatory[w.zone]||[]).some(t=>w.objects.some(o=>o.type===t&&!o.used));
}
function questTarget(w,h) {
  const required={prologue:['quillon'],nave:['chapel'],audience:['regentTalk'],march:['caravan'],works:['sluice']};
  const object=w.objects.find(o=>(required[w.zone]||[]).includes(o.type)&&!o.used);
  if(object)return object;
  if(w.zone==='chamber'&&w.angelusKneeling)return w.objects.find(o=>o.type==='tongue');
  if(w.zone==='vigil'){const f=closest(w.foes,h,Infinity,u=>u.alive);return f||w.spawn;}
  if(w.killsZone<w.need){const f=closest(w.foes,h,Infinity,u=>u.alive);if(f)return f;}
  if(DB.zone[w.zone].boss&&!w.bossDefeated)return w.foes.find(f=>f.boss&&f.alive)||w.objects.find(o=>o.type==='tongue');
  return w.objects.find(o=>o.type==='exit');
}


const ELEMENT = {physical:'#eed6ad',fire:'#ffad61',frost:'#9bdff0',lightning:'#bbb0ff',poison:'#b8d17e',void:'#a1a1ca'};
function fx(w,verb,p={}) { const f={id:w.uid++,verb,t:0,life:p.life||.5,...p};w.fx.push(f);event(w,'fx',{verb,p});return f; }
function addHazard(w,a){w.hazards.push(a);const p={...a,src:a.src?.id};event(w,'hazard',{p});return a;}
function addNumber(w,u,n,color=IVORY){
  const old=w.numbers.find(f=>f.owner===u.id&&f.t<.12&&f.color===color);
  if(old){old.n+=n;old.t=0;return;}w.numbers.push({owner:u.id,x:u.x,y:u.y,z:u.z+32,n,t:0,color});
}
function heal(w,h,amount){if(!h.alive)return;h.hp=Math.min(h.maxHp,h.hp+amount);event(w,'heal',{id:h.id,amount});}
function dealDamage(w,u,hit) {
  if(!w.authority||!u.alive||u.spawn>.1)return 0;
  const src=hit.src, isHero=u.team==='hero';
  if(isHero&&(u.inv>0||u.dodge>.06||w.cheats.god||CHEATS.god&&w===W||attract&&w===W))return 0;
  let amount=hit.amount||0,crit=false;
  if(src?.team==='hero') {
    crit=w.rng()<(.06+stat(src,'crit')*.01+(src.kind==='cantor'&&hasVow(src,2)&&src.still>.5?.25:0)+(src.kind==='lamplighter'&&hasVow(src,0)&&src.nerve>=29?.15:0));
    if(crit)amount*=1.5+stat(src,'critDamage')*.01;
    const p=powers(src);src.hits++;
    if(p.has('ninthHit')&&src.hits%9===0){amount*=5;fx(w,'ring',{x:u.x,y:u.y,r:50,color:GOLD,life:.7});}
    if(u.lit>0||w.heroes.some(h=>h.kind==='lamplighter'&&h.alive&&dist(h,u)<lanternRadius(h)))amount*=1.15;
    if(hit.toll&&u.ringing){amount*=1+.4*u.ringing;u.ringing=0;fx(w,'ring',{x:u.x,y:u.y,r:38,color:GOLD});}
    if(w.cheats.oneHit||CHEATS.oneHit&&w===W)amount=u.maxHp*2;
    if(src.buffs.power>0||src.greatPeal>0)amount*=src.buffs.power>0?2:1.3;
    if(src.ambush){amount*=src.ambush;src.ambush=0;}
    if(u.reflect>0&&!hit.reflected)dealDamage(w,src,{amount:amount*.1,src:u,reflected:true});
    src.stats.damage+=Math.min(amount,u.hp);if(u.boss&&DB.boss[u.kind].warden)src.stats.warden+=Math.min(amount,u.hp);
    if(stat(src,'lifeHit'))heal(w,src,stat(src,'lifeHit'));
  }
  if(isHero) {
    amount*=1/(1+stat(u,'armor')/90+stat(u,'resist')/140+(u.kind==='sexton'&&hasVow(u,0)?w.allies.filter(a=>a.owner===u.id).length*.05:0));
    if(hit.stun&&!(u.guard>0&&u.guardImmune))u.stun=Math.max(u.stun,hit.stun*(u.kind==='ringer'&&hasVow(u,1)?.6:1));
    if(u.guard>0)amount*=.5;if(u.buffs.shield>0)amount=0;
    if(u.shield>0){const take=Math.min(u.shield,amount);u.shield-=take;amount-=take;}
    if(u.guard>0&&u.guardReflect&&src?.alive&&!hit.reflected)dealDamage(w,src,{src:u,amount:amount*.5,reflected:true});
    if(u.guard>0&&u.guardRing&&src)src.ringing=Math.min(3,(src.ringing||0)+1);
    u.combat=5;
  }
  if(u.shieldT>0)amount*=.4;
  amount=Math.max(0,Math.round(amount));u.hp-=amount;u.flash=.16;u.hurt=.2;
  if(isHero){u.inv=.12;u.resource=Math.min(u.resourceMax,u.resource+(u.kind==='ringer'?3:0));}
  else {
    if(hit.ring)u.ringing=Math.min((src&&powers(src).has('ringMax')||src&&setCount(src)>=4)?6:3,u.ringing+hit.ring);
    if(hit.slow)u.slow=Math.max(u.slow,2.5);
    if(hit.burn){u.burn=3;u.burnPower=amount*.16;u.burnSrc=src;}
    if(hit.lit)u.lit=5;
    if(hit.stun)u.stun=Math.max(u.stun,hit.stun*(u.boss?.17:1));
    const force=(hit.kb??45)*TUNE.launch/(u.boss?6:u.elite?2:1),a=hit.ang??(src?angle(src,u):0);
    u.vx+=Math.cos(a)*force;u.vy+=Math.sin(a)*force;u.knock=.16;
  }
  if(amount)addNumber(w,u,amount,isHero?'#ff9c91':crit?'#ffe2a1':IVORY);
  event(w,'hit',{id:u.id,x:u.x,y:u.y,z:u.z,amount,crit,hero:isHero,angle:hit.ang||0,element:hit.element||'physical',source:src?.id});
  if(u.boss&&u.kind==='angelus'&&w.zone==='chamber'&&u.hp<=1&&!w.finishStrike){u.hp=1;u.stun=999;w.angelusKneeling=true;const o=w.objects.find(o=>o.type==='tongue');if(o){o.x=u.x;o.y=u.y+20;}event(w,'notice',{text:'HOLD INTERACT • STRIKE WITH THE TONGUE'});return amount;}
  if(amount>0&&src?.team==='hero'&&!hit.noProc&&stat(src,'area')>0&&w.rng()<.2)radialHit(w,src,u.x,u.y,30,amount*stat(src,'area')*.01,{noProc:true,skipId:u.id,kb:0,element:hit.element});
  if(u.hp<=0) {
    if(isHero){
      const p=powers(u),save=p.has('resurrect')&&u.pennies>=1000;
      const vow=u.level>=8&&hasVow(u,3)&&u.dieSave<=0;
      if(save||vow){if(save)u.pennies-=1000;u.hp=1;u.inv=3;u.dieSave=120;event(w,'refuseDeath',{id:u.id});return amount;}
      u.hp=0;u.alive=false;u.stats.deaths++;u.deathTimer=w.session?6:3+Math.min(15,u.stats.deaths*3);u.attack=null;
      if(w.greater)w.vigilClock=Math.max(0,w.vigilClock-10);event(w,'heroDeath',{id:u.id});
    } else if(u.team==='ally'){u.alive=false;u.life=0;}else killFoe(w,u,hit);
  }
  return amount;
}
function killFoe(w,u,hit={}) {
  if(!u.alive)return;u.alive=false;u.hp=0;w.kills++;w.killsZone++;w.requiem=w.requiemT>0?w.requiem+1:1;w.requiemT=TUNE.requiem;w.bestRequiem=Math.max(w.bestRequiem,w.requiem);
  const src=hit.src||w.heroes[0];if(src?.stats){src.stats.kills++;src.stats.reckoning+=u.elite?5:1;}
  const body=new E.Body({x:u.x,y:u.y,z:3,r:u.r,friction:2.3,bounce:.4});const a=hit.ang??(src?angle(src,u):0),force=(u.boss?110:100+Math.min(120,(hit.amount||15)*2))*TUNE.launch;
  Object.assign(body,{id:u.id,kind:u.kind,boss:u.boss,team:'foe',facing:u.facing,death:DB.monster[u.kind]?.death||'fling',age:0,roll:0,used:false,color:u.color});body.push(Math.cos(a)*force,Math.sin(a)*force,140*TUNE.launch);w.corpses.push(body);
  w.decals.push({x:u.x,y:u.y,r:5+w.rng()*7,kind:'blood',seed:u.id});
  if(u.elite||u.boss||w.lootRng()<TUNE.votiveChance)w.drops.push({id:w.uid++,type:'votive',x:u.x+6,y:u.y,z:6,owner:null});
  w.drops.push({id:w.uid++,type:'penny',x:u.x,y:u.y,z:2,amount:Math.round((3+w.lootRng()*8)*(u.elite?8:1)*TUNE.pennies*(1+(src?stat(src,'pennies'):0)*.01)),owner:null});
  const xp=6*Math.pow(1.18,u.level-1)*(u.boss?32:u.elite==='rare'?8:u.elite?4:1)*DIFFICULTIES[w.difficulty].reward;
  for(const h of w.heroes){gainXP(w,h,xp);if(u.boss||u.elite||w.lootRng()<.07*TUNE.drops)dropItem(w,h,u.x+(h.id%4)*5,u.y,{rarity:u.boss?4:u.elite?2:undefined});}
  if(w.zone==='prologue'&&w.killsZone===2)for(const h of w.heroes)dropItem(w,h,u.x,u.y,{rarity:2,slot:0});
  if(w.zone==='acre'&&w.killsZone===15)for(const h of w.heroes)dropItem(w,h,u.x,u.y,{rarity:3,slot:1});
  if(u.kind==='crab'){for(let i=0;i<12;i++)w.drops.push({id:w.uid++,type:'penny',x:u.x+(w.lootRng()-.5)*60,y:u.y+(w.lootRng()-.5)*60,amount:40,owner:null});for(const h of w.heroes)dropItem(w,h,u.x,u.y,{rarity:4});}
  if(hit.explode)radialHit(w,src,u.x,u.y,35,(hit.amount||10)*.6,{element:'fire',noProc:true});
  if(w.zone==='vigil'&&!u.boss){w.reckoning=Math.min(100,w.reckoning+(u.elite==='rare'?8:u.elite?5:1)*TUNE.vigilFill);if(w.reckoning>=100&&!w.bossId){const main=getMain(w);const b=spawnFoe(w,choose(w.rng,['pall','coldverger','tithe']),main.x+90,main.y-45,{boss:true});w.bossId=b.id;event(w,'warden',{id:b.id});}}
  if(u.boss) {
    w.bossDefeated=true;for(const h of w.heroes)if(!h.follower)h.gems.push([Math.floor(w.lootRng()*3),Math.min(3,1+Math.floor(h.level/10))]);
    if(DB.boss[u.kind].warden){w.ended=true;w.results={time:w.zoneTime,kills:w.killsZone,deaths:w.heroes.reduce((s,h)=>s+h.stats.deaths,0),tier:w.tier,won:!w.greater||w.vigilClock>0};for(const h of w.heroes){w.records[h.kind]=Math.max(w.records[h.kind]||0,w.results.won?w.tier:0);}}
    if(u.kind==='beadle')w.flags.push('tongueTaken');if(u.kind==='regent')w.flags.push('quillonConfessed');
    event(w,'bossDeath',{id:u.id,kind:u.kind});
  }
  event(w,'kill',{id:u.id,source:src?.id,x:u.x,y:u.y,angle:a,force,kind:u.kind,elite:u.elite,boss:u.boss});
}
function radialHit(w,h,x,y,r,amount,extra={}) {let n=0;for(const u of [...w.foes])if(u.alive&&(!extra.skipBoss||!u.boss)&&u.id!==extra.skipId&&Math.hypot(u.x-x,u.y-y)<r+u.r){n++;dealDamage(w,u,{src:h,amount,ang:Math.atan2(u.y-y,u.x-x),...extra});}for(const p of w.props)if(p.breakable&&!p.broken&&Math.hypot(p.x-x,p.y-y)<r)breakProp(w,p,h);return n;}
function breakProp(w,p,h) {if(p.broken)return;p.broken=true;w.broken++;if(h?.stats)h.stats.broken++;w.sacrilege=w.sacrilegeT>0?w.sacrilege+1:1;w.sacrilegeT=3;w.drops.push({id:w.uid++,type:'penny',x:p.x,y:p.y,amount:Math.round(2*TUNE.pennies*(1+(h?stat(h,'pennies'):0)*.01)),owner:null});event(w,'break',{x:p.x,y:p.y,type:p.type});}
function lanternRadius(h){return 60*(powers(h).has('lanternRadius')?2:1)*(h.level>=8&&hasVow(h,2)?1.3:1);}
function tunedSkill(h,id) {
  const base=DB.skill[id];if(!base)return null;
  const tone=(h.level>=base.unlock+2||h.unlockedAll)?base.tones[h.tones[id]||0]:{};
  const s={...base,...tone,toneName:tone.name||'Untoned',name:base.name};
  s.dmg=base.dmg*(tone.mul||1);s.range=base.range*(tone.rangeMul||1);s.radius=base.radius*(tone.radiusMul||1);s.cost=base.cost*(tone.costMul||1)*(1-Math.min(.6,stat(h,'economy')*.01));s.cd=base.cd*(tone.cdMul||1);s.speed=tone.speed||1;
  const p=powers(h);
  if(id==='knell'&&p.has('knellWave'))s.wave=1;
  if(id==='rope'&&p.has('ropeRing'))s.ring=1;
  if(id==='leap'&&p.has('leapBell'))s.extraBell=1;
  if(id==='hide'&&p.has('hideThorns'))s.reflect=1;
  if(id==='psalm'&&p.has('chordBolts')&&h.chord)s.triple=1;
  if(id==='candle'&&p.has('candleTriple'))s.triple=1;
  if(id==='note'&&p.has('noteWide'))s.radius*=2;
  if(s.element==='frost'&&p.has('frostEcho'))s.mulEcho=1;
  if(id==='bolt'&&p.has('boltSplit'))s.triple=1;
  if(id==='dawn'&&p.has('dawnShort'))s.cd*=.5;
  if(id==='grave'&&p.has('gravePull'))s.radius*=2;
  if(id==='rites'&&p.has('ritesParty'))s.party=1;
  return s;
}
function castSkill(w,h,slot,aim,force=false) {
  if(!h.alive||h.stun>0||h.dodge>0)return false;
  const sid=typeof slot==='string'?slot:h.slots[slot],s=tunedSkill(h,sid);if(!s)return false;
  if(!force&&s.unlock>h.level&&!h.unlockedAll)return false;
  const returning=s.return&&h.returnNote&&h.returnNote.until>w.time;
  if(!force&&((h.cooldowns[sid]>0&&!returning)||h.attack)) {if(h.attack&&h.attack.elapsed>.04)h.queued={slot,aim};return false;}
  if(h.silenced&&sid!==h.slots[0])return false;
  const corpses=w.corpses.filter(c=>!c.used&&dist(c,h)<80);
  if(s.verb==='corpse'&&!corpses.length&&!force)return false;
  let cost=s.cost;if(s.verb==='summon'&&corpses.length&&(sid==='raise'||powers(h).has('freeRaise')))cost=0;
  if(h.chord)cost=0;
  const nerve=h.kind==='lamplighter'&&['trap','vault','smoke'].includes(sid);
  if(!force&&(nerve?h.nerve:h.resource)<cost&&!w.cheats.infinite&&!(CHEATS.infinite&&w===W)&&!attract)return false;
  if(!w.cheats.infinite&&!(CHEATS.infinite&&w===W)){if(nerve)h.nerve=Math.max(0,h.nerve-cost);else h.resource=Math.max(0,h.resource-cost);}
  if(h.level>=8&&hasVow(h,0)&&h.kind==='ringer')heal(w,h,cost*.12);
  const point=aim||{x:h.x+Math.cos(h.facing)*s.range*.7,y:h.y+Math.sin(h.facing)*s.range*.7};
  const a=angle(h,point);h.facing=a;h.combat=5;
  const attackRate=TUNE.attackSpeed*s.speed*(1+stat(h,'haste')*.01)*(h.buffs.haste>0?1.5:1);
  h.cooldowns[sid]=(w.cheats.noCD||CHEATS.noCD&&w===W||attract)?0:s.cd*TUNE.cooldowns*(1-Math.min(.6,stat(h,'cooldown')*.01))/(sid===DB.hero[h.kind].skills[0]?attackRate:1);
  if(sid==='clap')h.combo=(h.combo+1)%3;
  const wind=s.wind/attackRate;
  h.attack={sid,s,aim:{x:point.x,y:point.y},a,elapsed:0,wind,total:wind+(s.verb==='beam'?s.duration:Math.max(.16,(sid===h.slots[0]?.28:.4)/attackRate)),struck:false,tick:0,combo:(h.combo+2)%3};
  if(h.kind==='cantor'){
    const note=s.element||(['psalm','frost','ward'].includes(sid)?'frost':'lightning');
    if(h.chord){h.attack.s={...s,dmg:s.dmg*(hasVow(h,0)&&h.level>=8?2:1.6)};h.chord=false;h.notes=[];}
    if(!h.notes.includes(note))h.notes.push(note);else h.notes=[note];
    if(h.notes.length>=(powers(h).has('twoNotes')||setCount(h)>=4?2:3)){h.chord=true;event(w,'chord',{id:h.id});}
  }
  event(w,'cast',{id:h.id,sid,x:h.x,y:h.y,aim:point,element:s.element});return true;
}
function executeSkill(w,h,a) {
  const s=a.s,point=a.aim,ang=a.a,color=ELEMENT[s.element||'physical'],damage=damageBase(h)*s.dmg*TUNE.damage*(h.combo===0&&s.combo?1.45:1);
  const extra={chain:s.chain,ring:s.ring||(h.kind==='ringer'&&s.id!=='clap'&&s.verb!=='guard'?1:0),burn:s.burn,slow:s.slow,stun:s.stun,lit:s.lit,toll:s.toll,explode:s.explode,element:s.element||'physical',kb:s.verb==='bell'?180:70};
  h.resource=Math.min(h.resourceMax,h.resource+(s.gain||0)*TUNE.resource);
  if(s.pull)for(const f of w.foes)if(f.alive&&Math.hypot(f.x-point.x,f.y-point.y)<s.pull){const an=angle(f,s.verb==='spin'?h:point);f.vx=Math.cos(an)*140;f.vy=Math.sin(an)*140;f.knock=.25;}
  let n=0;
  if(s.verb==='cone'&&!s.bolt){
    for(const u of [...w.foes])if(u.alive&&dist(h,u)<s.range+u.r&&Math.abs(adiff(angle(h,u),ang))<1.1*(s.radius/28)){n++;dealDamage(w,u,{src:h,amount:damage,ang,...extra});}
    for(const o of w.objects)if(o.type==='trap'&&!o.used&&dist(h,o)<s.range+8&&Math.abs(adiff(angle(h,o),ang))<1.3)interactNearest(w,h,o);
    for(const p of w.props)if(p.breakable&&!p.broken&&dist(h,p)<s.range+7&&Math.abs(adiff(angle(h,p),ang))<1.3)breakProp(w,p,h);
    fx(w,'cone',{x:h.x,y:h.y,a:ang,r:s.range,color,life:.25});
    if(s.wave&&(!s.combo||h.combo===0))makeShot(w,h,ang,damage*.65,{range:100,r:16,color,...extra,pierce:30});
  }else if(s.verb==='bolt'||s.bolt||s.verb==='wave') {
    if(s.nova)n=radialHit(w,h,h.x,h.y,s.range,damage,extra);
    else for(let i=0;i<(s.triple?3:1);i++)makeShot(w,h,ang+(s.triple?(i-1)*.19:0),damage,{range:s.range,r:s.verb==='wave'?s.radius:5,color,pierce:s.verb==='wave'?99:s.pierce||0,chain:s.chain,...extra});
    fx(w,'cast',{x:h.x,y:h.y,z:18,color,life:.3});
  }else if(['nova','spin'].includes(s.verb)) {
    n=radialHit(w,h,h.x,h.y,s.radius,damage,extra);fx(w,'ring',{x:h.x,y:h.y,r:s.radius,color,life:.55});
  }else if(['leap','charge','blink'].includes(s.verb)) {
    let d=Math.min(s.range,dist(h,point)),x=h.x+Math.cos(ang)*d,y=h.y+Math.sin(ang)*d;
    if(!w.map.standable(x,y,0,6)){for(;d>0;d-=8){x=h.x+Math.cos(ang)*d;y=h.y+Math.sin(ang)*d;if(w.map.standable(x,y,0,6))break;}}
    const old={x:h.x,y:h.y};h.inv=Math.max(.6,typeof s.immune==='number'?s.immune:0);h.travelAnim=.4;h.travelFrom=old;
    if(s.return&&h.returnNote&&h.returnNote.until>w.time){[x,y]=[h.returnNote.x,h.returnNote.y];h.returnNote=null;}else if(s.return)h.returnNote={...old,until:w.time+3};
    if(s.verb==='charge'){for(let i=1;i<=5;i++)n+=radialHit(w,h,lerp(old.x,x,i/5),lerp(old.y,y,i/5),s.radius,damage*.4,extra);}
    h.x=x;h.y=y;if(damage||s.stun)n+=radialHit(w,h,x,y,s.radius,damage,extra);
    fx(w,s.verb==='blink'?'blink':'leap',{x,y,from:old,r:s.radius,color,life:.6});
    if(s.extraBell)radialHit(w,h,x,y,55,damage*.7,extra);
    if(sidIs(s,'vault')&&powers(h).has('vaultFire'))makePool(w,h,x,y,45,damage*.2,60,{...extra,lit:1,color:'#e9af59'});
  }else if(s.verb==='chain') {
    let from=h,used=new Set();for(let i=0;i<(s.chain||5);i++){const t=closest(w.foes,from,i===0?s.range:90,u=>u.alive&&!used.has(u.id));if(!t)break;used.add(t.id);fx(w,'chain',{x:from.x,y:from.y,z:20,to:{x:t.x,y:t.y,z:17},color,life:.25});dealDamage(w,t,{src:h,amount:damage,...extra});from=t;n++;}
  }else if(['bell','lob','area'].includes(s.verb)) {
    const d=Math.min(s.range||s.radius,dist(h,point)),p={x:h.x+Math.cos(ang)*d,y:h.y+Math.sin(ang)*d};
    const count=s.triple?3:1;for(let i=0;i<count;i++){
      const tx=p.x+(i-((count-1)/2))*s.radius*.9,ty=p.y;
      addHazard(w,{id:w.uid++,shape:s.verb==='bell'?'bell':s.verb==='lob'?'candle':'disc',x:tx,y:ty,r:s.radius,delay:s.delay||.4,t:0,life:s.delay||.4,team:'hero',src:h,damage,extra,color,pool:s.pool||0,lit:s.lit,follow:s.follow});
    }
  }else if(s.verb==='buff'){
    for(const u of w.heroes){u.greatPeal=s.duration;u.buffRegen=s.regen?3:0;u.buffHaste=!!s.haste;}
    if(s.fear)for(const f of w.foes)if(dist(h,f)<110)f.fear=s.fear;
    fx(w,'ring',{x:h.x,y:h.y,r:100,color:GOLD,life:1});
  }else if(s.verb==='guard') {
    h.guard=s.duration;h.guardReflect=s.reflect;h.guardRing=s.ring;h.guardImmune=s.immune;h.guardRegen=s.regen;h.shield=h.maxHp*(s.shield||0);h.ambush=s.ambush||0;h.stealth=s.stealth?s.duration:0;
    if(s.stun)for(const f of w.foes)if(dist(h,f)<s.radius)f.stun=s.stun;
    if(s.fear)for(const f of w.foes)if(dist(h,f)<90)f.fear=s.fear;
    fx(w,'guard',{x:h.x,y:h.y,r:25,color,life:s.duration,owner:h.id});
  }else if(s.verb==='summon') {
    const nearby=w.corpses.filter(c=>!c.used&&dist(h,c)<s.range+30),count=s.count||1;
    const max=s.count?10:s.giant?1:(hasVow(h,2)&&h.level>=8?5:4);
    for(let i=0;i<count;i++){
      const mine=w.allies.filter(a=>a.owner===h.id);if(mine.length>=max)w.allies.splice(w.allies.indexOf(mine[0]),1);
      const c=nearby[i];if(c)c.used=true;const p=c||{x:point.x+(w.rng()-.5)*35,y:point.y+(w.rng()-.5)*35};
      addAlly(w,{id:w.uid++,owner:h.id,x:p.x,y:p.y,z:0,facing:0,vx:0,vy:0,r:5,life:s.duration||30,atk:0,alive:true,giant:!!s.giant,ranged:!!s.ranged,taunt:!!s.taunt,explode:s.explode,haste:s.haste,damage:damage*(s.giant?3:1)*(powers(h).has('bigBuried')?2:1)});
      fx(w,'rise',{x:p.x,y:p.y,r:15,color:'#a2b982',life:1});
    }
  }else if(s.verb==='corpse') {
    const bodies=w.corpses.filter(c=>!c.used&&Math.hypot(c.x-point.x,c.y-point.y)<80).slice(0,5);
    for(const c of bodies){if(!powers(h).has('keepCorpse')||w.rng()>.5)c.used=true;n+=radialHit(w,h,c.x,c.y,s.radius,damage,extra);fx(w,'nova',{x:c.x,y:c.y,r:s.radius,color:'#becd92'});if(s.chain)radialHit(w,h,c.x,c.y,s.radius+45,damage*.4,extra);if(s.pool)makePool(w,h,c.x,c.y,s.radius,damage,s.pool,{...extra,color});}
  }else if(s.verb==='heal') {
    const bodies=w.corpses.filter(c=>!c.used&&dist(c,h)<s.radius);for(const c of bodies)c.used=true;
    for(const u of s.party?w.heroes:[h]){heal(w,u,u.maxHp*Math.max(.12,bodies.length*.06));u.shield+=u.maxHp*(s.shield||0);u.guard=3;}
    if(s.resource)h.resource=Math.min(h.resourceMax,h.resource+s.resource);
    fx(w,'ring',{x:h.x,y:h.y,r:s.radius,color:'#afd79f',life:1});
  }
  if(s.pool&&!['bell','lob','area','corpse'].includes(s.verb))makePool(w,h,s.verb==='spin'?h.x:point.x,s.verb==='spin'?h.y:point.y,s.radius||30,damage*.3,s.pool,{...extra,color});
  if(s.leech&&n)heal(w,h,h.maxHp*s.leech*n);
  if(s.refund&&n>=5){h.cooldowns[s.id]*=.5;h.resource=Math.min(h.resourceMax,h.resource+s.refund);}
  if(s.summon)addAlly(w,{id:w.uid++,owner:h.id,x:point.x,y:point.y,z:0,facing:0,r:5,life:12,atk:0,alive:true,damage:damage*.4});
  if(s.mulEcho)radialHit(w,h,point.x,point.y,s.radius||25,damage*.5,extra);
  if(n>=5)event(w,'rung',{count:n,x:h.x,y:h.y});
  return n;
}
function addAlly(w,spec){const h=w.heroes.find(h=>h.id===spec.owner);const a={team:'ally',hp:(h?.maxHp||200)*.4,maxHp:(h?.maxHp||200)*.4,stun:0,ringing:0,slow:0,...spec};w.allies.push(a);const {id,owner,x,y,z,r,life,giant,ranged,taunt}=a;event(w,'allySpawn',{p:{id,owner,x,y,z,r,life,giant,ranged,taunt}});return a;}
function sidIs(s,id){return s.id===id;}
function makePool(w,h,x,y,r,damage,duration,extra={}){const perm=h&&h.kind==='lamplighter'&&powers(h).has('lastingLight')&&extra.lit;addHazard(w,{id:w.uid++,shape:'pool',x,y,r,delay:0,t:0,life:perm?600:duration,tick:0,team:h?.team||'foe',src:h,damage:damage/Math.max(1,duration*2),extra,color:extra.color||ELEMENT[extra.element||'fire'],lit:extra.lit,follow:extra.follow});}
function makeShot(w,h,a,damage,o={}){w.shots.push({id:w.uid++,x:h.x,y:h.y,z:17,vx:Math.cos(a)*(o.speed||300),vy:Math.sin(a)*(o.speed||300),a,team:h.team,src:h.source||h,damage,life:(o.range||140)/(o.speed||300),r:o.r||4,pierce:o.pierce||0,hit:[],color:o.color||GOLD,extra:o});}
function evade(w,h,dir){if(h.evades<1||h.dodge>0||!h.alive)return false;const n=dir&&Math.hypot(...dir)>.1?norm(...dir):[Math.cos(h.facing),Math.sin(h.facing)];h.evades--;h.dodge=.28;h.inv=.22;h.dodgeDir=n;h.attack=null;event(w,'evade',{id:h.id,x:h.x,y:h.y});if(powers(h).has('echoNova'))radialHit(w,h,h.x,h.y,55,damageBase(h)*2,{element:'physical'});return true;}
function usePotion(w,h){if(h.potion>0||!h.alive)return false;h.potion=TUNE.potionCD;h.healOver=.5;h.healRate=h.maxHp*1.2;if(h.kind==='lamplighter'&&hasVow(h,1)&&h.level>=8)h.resource=h.resourceMax;event(w,'potion',{id:h.id});return true;}


function enemyDamage(w,f){return 4*Math.pow(1.13,f.level-1)*(DB.monster[f.kind]?.dmg||2)*TUNE.foeDamage*DIFFICULTIES[w.difficulty].damage*(1+.15*Math.max(0,w.heroes.filter(h=>!h.follower).length-1))*(w.zone==='vigil'?Math.pow(1.17,w.tier-1):1);}
function hazard(w,f,shape,x,y,r,delay,extra={}) {
  const a={id:w.uid++,shape,x,y,r,delay:delay*TUNE.telegraph,t:0,life:delay*TUNE.telegraph,team:'foe',src:f,damage:enemyDamage(w,f),color:'#e77c65',extra:{},...extra};addHazard(w,a);return a;
}
function bossPattern(w,f,target) {
  const b=DB.boss[f.kind],phase=b.phases[f.phase],pat=phase.patterns[f.pattern++%phase.patterns.length],a=angle(f,target),d=enemyDamage(w,f);
  event(w,'pattern',{id:f.id,pattern:pat,phase:f.phase});
  if(pat==='ring'){hazard(w,f,'ring',f.x,f.y,240,1.1,{damage:d*1.4,life:3,expand:true,hit:[]});}
  else if(pat==='slam'||pat==='blink'){
    if(pat==='blink'){f.x=target.x+35;f.y=target.y-20;}
    hazard(w,f,'disc',target.x,target.y,55,.9,{damage:d*1.7});
  }else if(pat==='hook'||pat==='chains'){
    hazard(w,f,'line',f.x,f.y,210,.95,{a,width:pat==='hook'?13:25,pull:true,damage:d*1.1});
    if(pat==='chains')for(let i=0;i<3;i++)hazard(w,f,'disc',target.x+(w.rng()-.5)*100,target.y+(w.rng()-.5)*100,27,1.4);
  }else if(pat==='charge'){
    hazard(w,f,'line',f.x,f.y,190,.9,{a,width:24,damage:d*1.5,charge:true});
  }else if(pat==='cone'||pat==='dust'){
    hazard(w,f,'cone',f.x,f.y,165,1,{a,half:pat==='dust'?.7:1.4,damage:d*1.2});
  }else if(pat==='rain'){
    for(let i=0;i<7;i++)hazard(w,f,'candle',target.x+(w.rng()-.5)*160,target.y+(w.rng()-.5)*160,25,.9+i*.15,{damage:d*.8,pool:3});
  }else if(pat==='summon'||pat==='copies'){
    const pool=f.kind==='beadle'?['wight','digger']:f.kind==='regent'?['moths','priest']:['campanar','hushling'];
    for(let i=0;i<(pat==='copies'?2:4);i++)if(w.foes.filter(u=>u.alive).length<70)spawnFoe(w,choose(w.rng,pool),f.x+(w.rng()-.5)*120,f.y+(w.rng()-.5)*120);
  }else if(pat==='dark'){
    for(const o of w.objects)if(o.type==='brazier')o.active=false;
    w.darkness=8;hazard(w,f,'disc',target.x,target.y,70,1.2,{damage:d});
  }else if(pat==='hush'){
    w.hush=5;for(let i=0;i<3;i++)makePool(w,f,f.x+(w.rng()-.5)*200,f.y+(w.rng()-.5)*200,48,d,5,{element:'void',color:'#787997'});
  }
  f.attack={move:f.kind==='angelus'?'twohand':pat==='charge'?'bash':'cast',elapsed:0,wind:.9,total:1.4};
  if(f.pattern%3===1)event(w,'taunt',{speaker:b.name,text:b.taunts[Math.floor(w.rng()*b.taunts.length)]});
}
function updateFoe(w,f,dt) {
  if(!f.alive)return;const b=f.boss?DB.boss[f.kind]:DB.monster[f.kind];
  if(f.lifeTune!==TUNE.foeLife){const ratio=TUNE.foeLife/(f.lifeTune||TUNE.foeLife);f.hp*=ratio;f.maxHp*=ratio;f.lifeTune=TUNE.foeLife;}
  f.spawn=Math.max(0,f.spawn-dt);f.flash=Math.max(0,f.flash-dt);f.hurt=Math.max(0,(f.hurt||0)-dt);f.stun=Math.max(0,f.stun-dt);f.slow=Math.max(0,f.slow-dt);f.lit=Math.max(0,f.lit-dt);if(w.heroes.some(h=>h.kind==='lamplighter'&&setCount(h)>=4&&dist(h,f)<lanternRadius(h)))f.slow=.2;f.reflect=Math.max(0,f.reflect-dt);f.shieldT=Math.max(0,f.shieldT-dt);
  if(f.burn>0){f.burn-=dt;f.burnTick-=dt;if(f.burnTick<=0){f.burnTick=.5;dealDamage(w,f,{src:f.burnSrc,amount:f.burnPower,element:'fire',kb:0});}}
  if(f.attack){f.attack.elapsed+=dt;if(f.attack.elapsed>f.attack.total)f.attack=null;}
  if(!f.alive||f.spawn>.1)return;
  if(w.cheats.freezeAI||CHEATS.freezeAI&&w===W||f.stun>0){f.vx*=.92;f.vy*=.92;f.update(dt,w.map);return;}
  const target=closest([...w.heroes,...w.allies.filter(a=>a.taunt)],f,Infinity,h=>h.alive&&!(h.stealth>0));if(!target)return;
  const dd=dist(f,target);f.facing=angle(f,target);
  if(f.boss){
    const ph=b.phases.reduce((p,s,i)=>f.hp/f.maxHp<=s.at?i:p,0);
    if(ph!==f.phase){f.phase=ph;f.atk=1.1;event(w,'phase',{id:f.id,phase:ph});if(f.kind==='regent'&&ph===2){w.darkness=20;for(const o of w.objects)if(o.type==='brazier')o.active=false;}if(f.kind==='angelus'&&ph===2)w.hush=40;}
    if(w.angelusKneeling&&f.kind==='angelus'){f.vx=f.vy=0;return;}
    f.atk-=dt;if(f.atk<=0){bossPattern(w,f,target);f.atk=Math.max(1.6,3.6-f.phase*.55);}
    const speed=f.kind==='angelus'?5:18;
    if(dd>110&&!f.attack){f.vx=Math.cos(f.facing)*speed;f.vy=Math.sin(f.facing)*speed;}else f.vx=f.vy=0;
    f.update(dt,w.map);return;
  }
  if(dd>260){f.vx=f.vy=0;return;}
  f.atk-=dt;f.affixT-=dt;
  if(f.affixes.includes('hushed')||f.kind==='mute')for(const h of w.heroes)if(dist(f,h)<60)h.silenced=true;
  if(f.affixes.includes('chained')){const other=closest(w.foes,f,80,u=>u.alive&&u!==f);if(other)for(const h of w.heroes)if(dist(h,f)<30&&f.affixT<1)dealDamage(w,h,{src:f,amount:enemyDamage(w,f)*dt});}
  if(f.affixT<=0){f.affixT=6;for(const aff of f.affixes)applyAffix(w,f,aff,target);}
  let dir=w.flow.dir(f.x,f.y,target.x,target.y);if(!dir||!Number.isFinite(dir[0]))dir=norm(target.x-f.x,target.y-f.y);
  const speed=b.speed*TUNE.foeSpeed*(f.slow>0?.45:1);
  if(b.ai==='thief'){
    dir=norm(f.x-target.x,f.y-target.y);f.escape=(f.escape||0)+dt;
    if(f.escape>15){f.alive=false;event(w,'escape',{id:f.id});return;}
    if(f.atk<0){f.atk=.7;w.drops.push({id:w.uid++,type:'penny',x:f.x,y:f.y,amount:7,owner:null});}
  }else if(f.fear>0){f.fear-=dt;dir=norm(f.x-target.x,f.y-target.y);}
  else if(b.ai==='kiter'||b.ai==='support'||b.ai==='summoner'){
    if(dd<75)dir=norm(f.x-target.x,f.y-target.y);else if(dd<125)dir=[0,0];
    if(f.atk<=0){
      f.atk=b.ai==='summoner'?5:2.3;
      if(b.ai==='summoner'&&w.foes.filter(u=>u.alive).length<100)for(let i=0;i<2;i++)spawnFoe(w,'wight',f.x+12*i,f.y+10);
      else if(b.ai==='support'){for(const u of w.foes)if(u.alive&&dist(f,u)<100)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.04);hazard(w,f,'cone',f.x,f.y,100,.7,{a:f.facing,half:.55});}
      else hazard(w,f,'line',f.x,f.y,dd+20,.7,{a:f.facing,width:9,shot:true});
      f.attack={move:'cast',elapsed:0,wind:.7,total:1};
    }
  }else if(b.ai==='burrower'&&f.atk<=0&&dd<180){
    f.atk=4;f.x=target.x+(w.rng()-.5)*50;f.y=target.y+(w.rng()-.5)*50;hazard(w,f,'disc',f.x,f.y,32,.9);f.attack={move:'rising',elapsed:0,wind:.9,total:1.3};
  }else if(b.ai==='charger'&&f.atk<=0&&dd<150){f.atk=3.5;hazard(w,f,'line',f.x,f.y,150,.75,{a:f.facing,width:16,charge:true});f.attack={move:b.move,elapsed:0,wind:.75,total:1};}
  else if(b.ai==='exploder'&&dd<36&&f.atk<=0){f.atk=10;hazard(w,f,'disc',f.x,f.y,48,1.1,{selfDestruct:true,damage:enemyDamage(w,f)*1.8,pool:3,color:'#d0ba89',extra:{slow:true}});f.attack={move:'twohand',elapsed:0,wind:1.1,total:1.5};}
  else if(dd<23&&f.atk<=0){f.atk=1.3;hazard(w,f,'cone',f.x,f.y,27,b.wind,{a:f.facing,half:1});f.attack={move:b.move,elapsed:0,wind:b.wind,total:b.wind+.25};}
  if(f.knock>0){f.knock-=dt;f.vx*=.97;f.vy*=.97;}else if(f.attack){f.vx=f.vy=0;}else{f.vx=dir[0]*speed;f.vy=dir[1]*speed;}
  // A small separation impulse keeps bodies readable without preventing a crowded slam.
  f.update(dt,w.map);f.x=clamp(f.x,24,w.width-24);f.y=clamp(f.y,24,w.height-24);
}
function applyAffix(w,f,id,target){
  const p=DB.affix[id]?.pattern;event(w,'affix',{id:f.id,affix:id});
  if(p==='ring')hazard(w,f,'ring',f.x,f.y,110,.65,{life:2,expand:true,hit:[]});
  if(p==='wax'||p==='fire'||p==='frost')hazard(w,f,'disc',target.x,target.y,31,1.1,{pool:4,color:p==='frost'?'#9bc8df':'#d7a47c',extra:{slow:true}});
  if(p==='silence')makePool(w,f,f.x,f.y,65,0,5,{color:'#9290a9',element:'void'});
  if(p==='ghost')hazard(w,f,'disc',target.x,target.y,25,1.3,{damage:enemyDamage(w,f)*1.6});
  if(p==='stones')for(let i=0;i<8;i++){const a=i*Math.PI/4;w.props.push({id:w.uid++,type:'headstone',x:target.x+Math.cos(a)*36,y:target.y+Math.sin(a)*36,z:0,hp:12,breakable:true,broken:false,seed:i});}
  if(p==='shield')for(const u of w.foes)if(dist(f,u)<80)u.shieldT=3;
  if(p==='reflect')f.reflect=2;
  if(p==='blink'){fx(w,'blink',{x:f.x,y:f.y,r:25,color:'#c0acd5'});f.x=target.x+40;f.y=target.y;}
  if(p==='pull')hazard(w,f,'disc',f.x,f.y,100,1.2,{pull:true,damage:0});
  if(p==='tether')hazard(w,f,'line',f.x,f.y,120,.8,{a:angle(f,target),width:9});
}
function inHazard(h,u,rad){
  const d=dist(h,u),a=Math.abs(adiff(angle(h,u),h.a||0));
  if(h.shape==='line')return d<(h.r||120)&&a<Math.atan2((h.width||15)+u.r,Math.max(5,d));
  if(h.shape==='cone')return d<h.r+u.r&&a<(h.half||1);
  if(h.shape==='ring'&&h.expand)return Math.abs(d-rad)<12+u.r;
  return d<h.r+u.r;
}
function stepHazards(w,dt) {
  for(const a of [...w.hazards]){
    a.t+=dt;const targets=a.team==='hero'?w.foes:[...w.heroes,...w.allies];
    if(a.shape==='pool'){
      a.life-=dt;a.tick-=dt;if(a.follow&&a.src){a.x=a.src.x;a.y=a.src.y;}
      if(a.tick<=0){a.tick=.5;for(const u of targets)if(u.alive&&inHazard(a,u,0)){
        if(a.damage)dealDamage(w,u,{src:a.src,amount:a.damage,kb:0,...a.extra});if(a.lit)u.lit=1;
        if(a.extra.slow)u.slow=1;
        if(a.extra.element==='void'&&u.team==='hero')u.resource=Math.max(0,u.resource-8);
      }}
    }else if(a.expand&&a.t>=a.delay){
      const rad=(a.t-a.delay)/(a.life-a.delay)*a.r;
      for(const u of targets)if(u.alive&&!a.hit.includes(u.id)&&inHazard(a,u,rad)){a.hit.push(u.id);dealDamage(w,u,{src:a.src,amount:a.damage,kb:100,stun:.5});}
    }else if(a.t>=a.delay&&!a.done){
      a.done=true;let hits=0;
      for(const u of [...targets])if(u.alive&&inHazard(a,u,0)){
        hits++;dealDamage(w,u,{src:a.src,amount:a.damage,ang:angle(a,u),...a.extra});
        if(a.pull){u.x=lerp(u.x,a.x,.6);u.y=lerp(u.y,a.y,.6);}
      }
      if(a.extra.chain&&a.src){let from=a,used=new Set();for(let i=0;i<a.extra.chain;i++){const u=closest(w.foes,from,80,f=>f.alive&&!used.has(f.id));if(!u)break;used.add(u.id);fx(w,'chain',{x:from.x,y:from.y,z:18,to:{x:u.x,y:u.y,z:18},color:a.color,life:.3});dealDamage(w,u,{src:a.src,amount:a.damage*.5,...a.extra});from=u;}}
      if(a.team==='hero')for(const p of w.props)if(p.breakable&&!p.broken&&dist(a,p)<a.r)breakProp(w,p,a.src);
      fx(w,a.shape==='bell'?'bell':'nova',{x:a.x,y:a.y,r:a.r,color:a.color,life:a.shape==='bell'?1:.6});
      if(hits>=5&&a.team==='hero')event(w,'rung',{count:hits,x:a.x,y:a.y});
      if(a.pool)makePool(w,a.src,a.x,a.y,a.r,a.damage,a.pool,{...a.extra,color:a.color,lit:a.lit,follow:a.follow});
      if(a.charge&&a.src?.alive){a.src.x+=Math.cos(a.a)*a.r*.7;a.src.y+=Math.sin(a.a)*a.r*.7;a.src.inv=.15;}
      if(a.selfDestruct&&a.src?.alive)killFoe(w,a.src,{src:w.heroes[0],amount:0});
    }
    if(a.shape==='pool'?a.life<=0:a.t>=(a.expand?a.life:a.delay+.15))w.hazards.splice(w.hazards.indexOf(a),1);
  }
}
function stepShots(w,dt) {
  for(const b of [...w.shots]){
    b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.team==='hero')for(const p of w.props)if(p.breakable&&!p.broken&&Math.hypot(p.x-b.x,p.y-b.y)<(b.r||4)+8){breakProp(w,p,b.src);if(b.pierce--<=0){b.life=0;break;}}
    const targets=b.team==='hero'?w.foes:w.heroes;
    for(const u of targets)if(u.alive&&!b.hit.includes(u.id)&&Math.hypot(u.x-b.x,u.y-b.y)<u.r+b.r){
      dealDamage(w,u,{src:b.src,amount:b.damage,ang:b.a,...b.extra});b.hit.push(u.id);
      if(b.extra.chain){let p=u;for(let i=1;i<b.extra.chain;i++){const t=closest(targets,p,65,f=>f.alive&&!b.hit.includes(f.id));if(!t)break;fx(w,'chain',{x:p.x,y:p.y,z:18,to:{x:t.x,y:t.y,z:18},color:b.color,life:.25});dealDamage(w,t,{src:b.src,amount:b.damage*.7,...b.extra});b.hit.push(t.id);p=t;}}
      if(b.pierce--<=0){b.life=0;break;}
    }
    const cell=w.map.toCell(b.x,b.y);if(!w.map.walkable(cell[0]??cell.cx,cell[1]??cell.cy))b.life=0;
    if(b.life<=0)w.shots.splice(w.shots.indexOf(b),1);
  }
}
function updateHero(w,h,dt,input={}) {
  h.maxHp=heroMax(h);h.hp=Math.min(h.hp,h.maxHp);h.silenced=w.foes.some(f=>f.alive&&(f.kind==='mute'||f.affixes.includes('hushed'))&&dist(h,f)<60);
  h.resourceMax=100+(h.level>=8&&hasVow(h,1)&&h.kind==='cantor'?30:0)+(h.level>=8&&hasVow(h,1)&&h.kind==='lamplighter'?20:0)+2*h.verses[2];
  for(const k of ['potion','inv','hurt','flash','stun','slow','guard','combat','dieSave','stealth','greatPeal','travelAnim'])h[k]=Math.max(0,(h[k]||0)-dt);
  for(const k of Object.keys(h.cooldowns))h.cooldowns[k]=Math.max(0,h.cooldowns[k]-dt);
  for(const k of Object.keys(h.buffs))h.buffs[k]=Math.max(0,h.buffs[k]-dt);
  if(h.evades>=2)h.evadeRegen=0;else h.evadeRegen+=dt;if(h.evades<2&&h.evadeRegen>=TUNE.evadeRecharge){h.evades++;h.evadeRegen=0;}
  if(!h.alive){h.deathTimer-=dt;if(h.deathTimer<=0&&(w.session||input.rise||input.riseAtGate)){if(input.riseAtGate){h.x=w.respawn.x;h.y=w.respawn.y;}reviveHero(w,h);}return;}
  if(h.healOver>0){heal(w,h,h.healRate*dt);h.healOver-=dt;}
  const spec=DB.hero[h.kind],regen=spec.regen+(h.guard>0&&h.guardRegen?12:0)+(h.greatPeal>0?5:0);
  h.resource=Math.min(h.resourceMax,h.resource+regen*dt*TUNE.resource);h.nerve=Math.min(30,h.nerve+dt);
  if(h.kind==='ringer'&&h.combat===0)h.resource=Math.max(0,h.resource-4*dt);
  if(h.kind==='sexton')h.resource=Math.min(h.resourceMax,h.resource+w.corpses.filter(c=>!c.used&&dist(h,c)<70).length*dt*(hasVow(h,1)?2:1));
  if(stat(h,'regen')||h.buffRegen&&h.greatPeal>0)heal(w,h,(stat(h,'regen')+(h.greatPeal>0?h.buffRegen||0:0))*dt);
  const move=input.moveDir||[0,0];if(Math.hypot(...move)>.1)h.still=0;else h.still=(h.still||0)+dt;
  if(input.potion)usePotion(w,h);if(input.evade)evade(w,h,input.evadeDir||move);
  if(input.interact)interactNearest(w,h,input.target,dt);
  if(input.portal&&!w.session)passingBell(w,h);
  if(h.attack){
    const a=h.attack;a.elapsed+=dt;
    if(!a.struck&&a.elapsed>=a.wind){a.struck=true;executeSkill(w,h,a);}
    if(a.s.verb==='beam'&&a.struck){a.tick-=dt;if(input.aim){a.aim=input.aim;a.a=angle(h,input.aim);h.facing=a.a;}if(a.tick<=0){a.tick=.25;for(const u of w.foes)if(u.alive&&dist(h,u)<a.s.range&&Math.abs(adiff(angle(h,u),a.a))<Math.atan2(a.s.radius,Math.max(8,dist(h,u))))dealDamage(w,u,{src:h,amount:damageBase(h)*a.s.dmg*.25*TUNE.damage,...a.s,kb:15});fx(w,'beam',{x:h.x,y:h.y,z:18,a:a.a,r:a.s.range,color:ELEMENT[a.s.element||'lightning'],life:.27});}}
    if(a.elapsed>=a.total||(a.struck&&Math.hypot(...move)>.1&&a.s.verb!=='beam'&&a.elapsed>a.wind+.1)){h.attack=null;if(h.queued){const q=h.queued;h.queued=null;castSkill(w,h,q.slot,q.aim);}}
  }
  if(input.slots)for(const i of [5,4,3,2,1,0])if(input.slots[i]){const sid=h.slots[i],s=tunedSkill(h,sid),nerve=h.kind==='lamplighter'&&['trap','vault','smoke'].includes(sid);if(!s||h.cooldowns[sid]>0||s.unlock>h.level&&!h.unlockedAll||!h.chord&&(nerve?h.nerve:h.resource)<s.cost&&!w.cheats.infinite&&!(CHEATS.infinite&&w===W))continue;if(castSkill(w,h,i,input.aim)||h.queued)break;}
  if(h.dodge>0){h.dodge-=dt;h.vx=h.dodgeDir[0]*250;h.vy=h.dodgeDir[1]*250;}
  else if(h.stun>0){h.vx=h.vy=0;}
  else {
    const speed=92*TUNE.speed*(h.slow>0&&!(h.guard>0&&h.guardImmune)?h.kind==='ringer'&&hasVow(h,1)?.7:.5:1)*(h.stealth>0?1.4:1)*(1+stat(h,'speed')*.01+.007*h.verses[3])*(h.buffHaste&&h.greatPeal>0?1.25:1)*(h.buffs.haste>0?1.5:1)*(h.attack&&!h.attack.struck?.35:1);
    h.vx=E.approach(h.vx,move[0]*speed,1000*dt);h.vy=E.approach(h.vy,move[1]*speed,1000*dt);
    if(Math.hypot(...move)>.1&&!h.attack)h.facing=Math.atan2(move[1],move[0]);
  }
  if(h.remote&&!input.moveDir){h.vx=h.vy=0;return;}
  if(w.heroes.filter(u=>!u.follower).length>1&&!h.follower){const peers=w.heroes.filter(u=>!u.follower&&u.id!==h.id);const mid={x:peers.reduce((n,u)=>n+u.x,0)/peers.length,y:peers.reduce((n,u)=>n+u.y,0)/peers.length};if(dist(h,mid)>340&&(h.x-mid.x)*h.vx+(h.y-mid.y)*h.vy>0){h.vx=h.vy=0;}}
  h.update(dt,w.cheats.noClip||CHEATS.noClip&&w===W?null:w.map);
  h.x=clamp(h.x,24,w.width-24);h.y=clamp(h.y,24,w.height-24);
}
function reviveHero(w,h,by){h.alive=true;h.hp=h.maxHp*.65;h.inv=3;h.deathTimer=0;h.revive=0;if(by){by.stats.revives++;event(w,'revive',{id:h.id,by:by.id});}else event(w,'rise',{id:h.id});}
function botInput(w,h,follow=null) {
  const nearest=closest(w.foes,h,190,u=>u.alive&&u.spawn<.2&&!(u.kind==='angelus'&&w.angelusKneeling)),aim=nearest||questTarget(w,h)||h;
  let goal=aim,range=nearest?(h.kind==='ringer'||h.kind==='sexton'?25:80):23;
  if(follow&&dist(h,follow)>150){goal=follow;range=60;}
  const d=dist(h,goal);let move=d>range?norm(goal.x-h.x,goal.y-h.y):[0,0];
  if(d>range&&!w.map.los(h.x,h.y,goal.x,goal.y)){
    if(!h.navFlow||h.navMap!==w.map){h.navFlow=new E.FlowField(w.map);h.navMap=w.map;h.navAt=-1;}
    if(w.time>(h.navAt||0)||!h.navGoal||dist(h.navGoal,goal)>20){h.navFlow.update(goal.x,goal.y);h.navGoal={x:goal.x,y:goal.y};h.navAt=w.time+.25;}
    const dir=h.navFlow.dir(h.x,h.y,goal.x,goal.y);if(dir&&Math.hypot(...dir)>.1)move=dir;
  }
  const danger=w.hazards.find(a=>a.team==='foe'&&a.shape!=='pool'&&a.t>a.delay*.45&&inHazard(a,h,(a.t-a.delay)/(a.life-a.delay)*a.r));
  const out={moveDir:move,aim,slots:Array(6).fill(false),potion:h.hp<h.maxHp*.55,evade:!!danger&&h.evades>0,evadeDir:danger?norm(h.x-danger.x,h.y-danger.y):move};
  if(nearest){
    const order=[5,2,3,1,4,0];for(const i of order){const s=tunedSkill(h,h.slots[i]);if(!s||s.unlock>h.level&&!h.unlockedAll||h.cooldowns[s.id]>0||(h.kind==='lamplighter'&&['trap','vault','smoke'].includes(s.id)?h.nerve:h.resource)<s.cost)continue;
      if(s.verb==='heal'&&h.hp>h.maxHp*.8)continue;if(s.verb==='guard'&&h.guard>0)continue;
      if(s.verb==='buff'&&h.greatPeal>1)continue;
      if(s.verb==='blink'&&!danger&&h.hp>h.maxHp*.45)continue;
      if(s.verb==='corpse'&&!w.corpses.some(c=>!c.used&&dist(c,nearest)<80))continue;
      if(s.verb==='summon'&&w.allies.filter(a=>a.owner===h.id).length>3)continue;
      if((s.verb==='cone'&&!s.bolt||s.verb==='spin'||s.verb==='nova')&&dist(h,nearest)>(s.range||s.radius)+8)continue;
      out.slots[i]=true;break;
    }
  }
  if(!nearest&&!follow){
    const drop=closest(w.drops,h,70,d=>d.type==='item'&&d.owner===h.id);if(drop&&h.bag.length<30){out.moveDir=dist(h,drop)>23?norm(drop.x-h.x,drop.y-h.y):[0,0];if(dist(h,drop)<26){out.interact=true;out.target=drop;}}
    else if(goal&&goal.type&&dist(h,goal)<32){out.interact=true;out.target=goal;}
  }
  if(!nearest&&follow&&dist(h,follow)>70)out.moveDir=norm(follow.x-h.x,follow.y-h.y);
  if(!h.alive&&h.deathTimer<=0)reviveHero(w,h);
  return out;
}
function stepWorld(w,dt,inputs={}) {
  if(w.ended||w.screen==='ending')return;
  w.time+=dt;w.zoneTime+=dt;w.stats.elapsed+=dt;w.zoneCard=Math.max(0,w.zoneCard-dt);w.hush=Math.max(0,(w.hush||0)-dt);w.darkness=Math.max(0,(w.darkness||0)-dt);
  if(w.dialogue){w.dialogue.t-=dt;if(w.dialogue.t<=0)w.dialogue=null;}
  for(const o of w.objects)if(o.falling>0)o.falling=Math.max(0,o.falling-dt);
  for(const t of w.toasts)t.t-=dt;w.toasts=w.toasts.filter(t=>t.t>0);
  for(const f of w.fx)f.t+=dt;w.fx=w.fx.filter(f=>f.t<f.life);
  for(const n of w.numbers)n.t+=dt;w.numbers=w.numbers.filter(n=>n.t<.85);
  w.requiemT-=dt;w.sacrilegeT-=dt;
  if(w.requiemT<=0&&w.requiem>0){if(w.requiem>=10){for(const h of w.heroes){gainXP(w,h,w.requiem*1.8);if(powers(h).has('streakPower'))h.zoneDevotion=(h.zoneDevotion||0)+.02;}event(w,'requiem',{count:w.requiem});}w.requiem=0;}
  if(w.sacrilegeT<=0)w.sacrilege=0;
  if(Math.floor(w.time*5)!==Math.floor((w.time-dt)*5)){
    w.explored||=new Set();for(const h of w.heroes)for(let iy=-8;iy<=8;iy++)for(let ix=-8;ix<=8;ix++)if(ix*ix+iy*iy<65)w.explored.add(Math.floor(h.x/16)+ix+','+(Math.floor(h.y/16)+iy));
    w.flow.update(w.heroes.filter(h=>h.alive).map(h=>[h.x,h.y]));const main=getMain(w),g=main&&questTarget(w,main);if(g)w.botFlow.update(g.x,g.y);
  }
  w.spatial ||= new E.SpatialHash(32);w.spatial.build(w.foes.filter(f=>f.alive));
  for(const h of [...w.heroes]){
    if(h.remote&&!w.authority)continue;
    const input=h.bot||h.follower||w.cheats.bot?botInput(w,h,h.follower?getMain(w):null):(inputs[h.id]||{});
    updateHero(w,h,dt,input);
  }
  if(w.authority){
    for(const o of w.objects)if(o.type==='sermon'&&!o.used){
      if(!o.started&&w.heroes.some(h=>h.alive&&dist(h,o)<130))o.started=true;
      if(o.started){
        if(!o.priestId){const f=spawnFoe(w,'priest',o.x,o.y,{elite:'champion'});o.priestId=f.id;o.convert=5;o.converted=0;event(w,'notice',{text:'THE SERMON • Silence the Moth-Priest before the pilgrims turn.'});}
        const priest=w.foes.find(f=>f.id===o.priestId&&f.alive);o.convert-=dt;
        if(!priest){o.used=true;for(const h of w.heroes)dropItem(w,h,o.x,o.y,{rarity:3});event(w,'notice',{text:'THE SERMON IS OVER. '+Math.max(0,6-o.converted)+' pilgrims spared.'});}
        else if(o.convert<=0&&o.converted<6){o.convert=5;o.converted+=2;for(let i=0;i<2;i++)spawnFoe(w,'husk',o.x+20+(i%2)*12,o.y+20);}
      }
    }
    for(const f of [...w.foes])updateFoe(w,f,dt);
    stepShots(w,dt);stepHazards(w,dt);
    for(const a of [...w.allies]){
      a.life-=dt;a.atk-=dt;const owner=w.heroes.find(h=>h.id===a.owner),target=closest(w.foes,a,220,u=>u.alive);
      let goal=target||owner;if(goal){const d=dist(a,goal);a.facing=angle(a,goal);a.vx=a.vy=0;if(d>(target?(a.ranged?95:22):40)){const speed=a.haste?95:62;a.vx=Math.cos(a.facing)*speed;a.vy=Math.sin(a.facing)*speed;a.x+=a.vx*dt;a.y+=a.vy*dt;}
        if(target&&a.atk<=0&&d<(a.ranged?140:30)){a.atk=.7;if(a.ranged)makeShot(w,{...a,team:'hero',source:owner},a.facing,a.damage,{range:160,color:'#a6cf89'});else dealDamage(w,target,{src:owner,amount:a.damage,ang:a.facing});a.anim=.4;}}
      a.anim=Math.max(0,(a.anim||0)-dt);
      if(a.life<=0){if(a.explode)radialHit(w,owner,a.x,a.y,40,a.damage*3,{element:'poison'});if(owner&&setCount(owner)>=4){const c=new E.Body({x:a.x,y:a.y,r:4});Object.assign(c,{id:a.id,kind:'digger',age:0,used:false,death:'bones'});w.corpses.push(c);}event(w,'allyEnd',{id:a.id});w.allies.splice(w.allies.indexOf(a),1);}
    }
    const allDown=w.heroes.every(h=>!h.alive);if(allDown&&!w.partyWiped){for(const f of w.foes)if(f.boss){f.hp=f.maxHp;f.phase=0;f.atk=3;}w.hazards=[];w.partyWiped=true;}if(!allDown)w.partyWiped=false;
    collectDrops(w,dt);
    for(const o of w.objects){if(o.type==='caravan'&&o.started&&!o.used){const near=w.heroes.some(h=>h.alive&&dist(h,o)<100),enemies=w.foes.some(f=>f.alive&&dist(f,o)<100);if(near&&!enemies){o.progress+=dt;o.x+=dt*6;o.y-=dt*6;if(o.progress>=24){o.used=true;event(w,'objective',{type:'caravan'});}}}}
    if(w.zone==='vigil'&&w.reckoning<100){w._vigilSpawn-=dt;if(w._vigilSpawn<=0&&w.foes.filter(f=>f.alive).length<65){w._vigilSpawn=4;const h=getMain(w);for(let i=0;i<Math.max(1,Math.floor(12*TUNE.density));i++){const a=w.rng()*Math.PI*2,d=110+w.rng()*70;spawnFoe(w,choose(w.rng,DB.zone.vigil.pool),clamp(h.x+Math.cos(a)*d,50,w.width-50),clamp(h.y+Math.sin(a)*d,50,w.height-50),{elite:i===0&&w.rng()<.4*TUNE.elites?'champion':null});}}}
    if(w.zone==='scaffold'&&Math.floor(w.zoneTime/25)>Math.floor((w.zoneTime-dt)/25)){const h=getMain(w);hazard(w,{team:'foe',level:h.level},'ring',w.width/2,w.height/2,800,1,{life:5,expand:true,hit:[],damage:h.maxHp*.35});event(w,'greatToll');}
    if(w.zone==='mothcourt'&&w.darkness>0){w.darkTick=(w.darkTick||0)-dt;if(w.darkTick<=0){w.darkTick=.5;for(const h of w.heroes)if(h.alive&&!w.objects.some(o=>o.type==='brazier'&&o.active&&dist(o,h)<85))dealDamage(w,h,{amount:h.maxHp*.0075,src:null});}}
    if(w.greater&&w.zone==='vigil'){w.vigilClock-=dt;if(w.vigilClock<=0){w.ended=true;w.results={time:w.zoneTime,kills:w.killsZone,deaths:w.heroes.reduce((s,h)=>s+h.stats.deaths,0),tier:w.tier,won:false};}}
  }
  if(!w.authority){stepShots(w,dt);for(const a of w.hazards){a.t+=dt;if(a.shape==='pool')a.life-=dt;}w.hazards=w.hazards.filter(a=>a.shape==='pool'?a.life>0:a.t<(a.expand?a.life:a.delay+.15));}
  for(const c of w.corpses){c.age+=dt;if(c.age<7){c.update(dt,w.map);c.roll=(c.roll||0)+Math.hypot(c.vx,c.vy)*dt*.025;}}
  w.corpses=w.corpses.filter(c=>c.age<45);w.foes=w.foes.filter(f=>f.alive);
  if(w.events.length>300)w.events.splice(0,w.events.length-300);
}


function rollItem(w,h,options={}) {
  const r=w.lootRng,slot=options.slot??Math.floor(r()*8),level=options.level||h.level;
  let rarity=options.rarity;
  if(rarity===undefined){const n=r();rarity=n<.004*TUNE.relicChance*(1+stat(h,'fortune')*.01+(h.buffs.fortune>0?1:0))?4:n<.012?5:n<.11?3:n<.45?2:n<.8?1:0;}
  const pool=Object.values(DB.relic).filter(x=>(x.hero===h.kind||x.hero==='any')&&(options.relic?x.id===options.relic:true));
  const relic=rarity===4?(options.relic?DB.relic[options.relic]:choose(r,pool)):null;
  const set=rarity===5?Object.values(DB.set).find(s=>s.hero===h.kind):null;
  const item={id:w.uid++,slot:relic?relic.slot:set?choose(r,set.slots):slot,level,rarity,identified:rarity<3,relic:relic?.id||null,set:set?.id||null,
    name:relic?relic.name:set?set.name+' '+SLOTS[slot]:choose(r,['Ashen','Rainworn','Candlebound','Graven','Tollkeeper\'s','Parish'])+' '+(slot===0?({ringer:'Clapper',cantor:'Psalter',lamplighter:'Crossbow',sexton:'Spade'})[h.kind]:SLOTS[slot]),
    damage:8*Math.pow(1.15,level-1)*(1+rarity*.15)*(.95+r()*.1),affixes:[],gem:null,socket:false,redips:0,hero:h.kind,flavor:relic?.flavor||'The parish has seen worse.'};
  const used=new Set();for(let i=0;i<RARITY[rarity].affixes;i++){
    const af=choose(r,AFFIX_POOL.filter(a=>!used.has(a[0])));used.add(af[0]);
    if(af[0]==='socket'){item.socket=true;continue;}
    item.affixes.push({key:af[0],name:af[1],value:Math.round((1+level*.5)*af[2]*(.7+r()*.6)*10)/10});
  }
  return item;
}
function itemName(i){return i.identified?(i.rarity===4?i.name.toUpperCase():i.name):'Unconsecrated '+SLOTS[i.slot];}
function dropItem(w,h,x,y,o={}){if(h.follower)return null;const item=rollItem(w,h,o);const d={id:w.uid++,type:'item',x,y,z:3,owner:h.id,item};w.drops.push(d);event(w,'drop',{id:d.id,x,y,owner:h.id,item});return item;}
function consecrate(w,h,item){if(item.identified)return false;item.identified=true;event(w,'consecrate',{id:h.id,item:item.id,rarity:item.rarity});return true;}
function equipItem(w,h,item) {
  if(!item.identified){event(w,'notice',{text:'Consecrate this item first.'});return false;}
  const bi=h.bag.indexOf(item);if(bi>=0)h.bag.splice(bi,1);const old=h.gear[item.slot];h.gear[item.slot]=item;if(old)h.bag.push(old);h.maxHp=heroMax(h);event(w,'equip',{id:h.id,item:item.id});return true;
}
function itemScore(i){if(!i)return 0;return (i.slot===0?i.damage*6:10+i.level*3)+i.rarity*7+i.affixes.reduce((n,a)=>n+a.value*.25,0)+(i.relic?25:0);}
function collectDrops(w,dt) {
  for(const d of [...w.drops]){
    const h=closest(w.heroes,d,Infinity,u=>u.alive&&dist(u,d)<45+stat(u,'pickup')+2*u.verses[3]&&(d.owner===null||d.owner===undefined||d.owner===u.id));if(!h)continue;
    if(d.type==='penny'||d.type==='votive'){
      if(dist(d,h)>14){const n=norm(h.x-d.x,h.y-d.y);d.x+=n[0]*150*dt;d.y+=n[1]*150*dt;continue;}
      if(d.type==='penny'){for(const p of w.heroes)p.pennies+=d.amount;}else for(const p of w.heroes)if(p.alive&&dist(p,h)<130)heal(w,p,p.maxHp*.2*(1+stat(p,'votive')*.01));
      event(w,'pickup',{type:d.type,id:h.id,amount:d.amount||0});w.drops.splice(w.drops.indexOf(d),1);
    }else if(w.session&&d.type==='item'&&dist(d,h)<40){d.item.identified=true;if(itemScore(d.item)>itemScore(h.gear[d.item.slot])){equipItem(w,h,d.item);event(w,'notice',{text:h.name+': '+d.item.name});}else if(h.bag.length<30)h.bag.push(d.item);w.drops.splice(w.drops.indexOf(d),1);}
  }
}
function takeDrop(w,h,d){if(d.owner!==h.id||d.type!=='item')return false;if(h.bag.length>=30){event(w,'notice',{text:'Your bag is full. The Forge can lighten it.'});return false;}h.bag.push(d.item);w.drops.splice(w.drops.indexOf(d),1);event(w,'pickup',{type:'item',id:h.id,item:d.item});if(h.bot||w.cheats.bot){consecrate(w,h,d.item);if(itemScore(d.item)>itemScore(h.gear[d.item.slot]))equipItem(w,h,d.item);}return true;}
function salvage(w,h,item){const i=h.bag.indexOf(item);if(i<0)return false;h.bag.splice(i,1);h.mats.scrap+=1+item.rarity;if(item.rarity>=2)h.mats.salt+=1;if(item.rarity>=4)h.mats.ash+=1;event(w,'service',{type:'salvage',id:h.id});return true;}
function craft(w,h,slot){const cost=6;if(h.mats.scrap<cost||h.bag.length>=30)return false;h.mats.scrap-=cost;const item=rollItem(w,h,{slot,rarity:w.lootRng()<.3?3:2});h.bag.push(item);event(w,'service',{type:'craft',id:h.id});return item;}
function buy(w,h,slot=0,gamble=false){const cost=gamble?150:80+20*h.level;if(h.pennies<cost||h.bag.length>=30)return false;h.pennies-=cost;const item=rollItem(w,h,{slot,rarity:gamble?(w.lootRng()<.12?4:w.lootRng()<.5?3:2):2});if(gamble)item.identified=false;h.bag.push(item);event(w,'service',{type:gamble?'gamble':'buy',id:h.id});return item;}
function sell(w,h,item){const index=h.bag.indexOf(item);if(index<0)return false;h.bag.splice(index,1);h.pennies+=Math.round((item.level*5+10)*(item.rarity+1));event(w,'service',{type:'sell',id:h.id});return true;}
function redip(w,h,item,index){const cost=70*(item.redips+1);if(h.pennies<cost||!item.affixes[index])return false;h.pennies-=cost;const af=choose(w.lootRng,AFFIX_POOL.filter(a=>a[0]!=='socket'));item.affixes[index]={key:af[0],name:af[1],value:Math.round((1+item.level*.5)*af[2]*(.9+w.lootRng()*.5)*10)/10};item.redips++;event(w,'service',{type:'redip',id:h.id});return true;}
function socketGem(w,h,item,gem){if(!item.socket){if(h.mats.salt<3)return false;h.mats.salt-=3;item.socket=true;}if(!gem||!h.gems.includes(gem))return false;if(item.gem)h.gems.push(item.gem);h.gems.splice(h.gems.indexOf(gem),1);item.gem=gem;event(w,'service',{type:'socket',id:h.id});return true;}
function extractRelic(w,h,item){if(!item.relic||!item.identified||h.mats.ash<1)return false;h.mats.ash--;const cat=item.slot===0?0:item.slot<5?1:2;h.lantern[cat]=item.relic;const idx=h.bag.indexOf(item);if(idx>=0)h.bag.splice(idx,1);else if(h.gear[item.slot]===item)h.gear[item.slot]=null;event(w,'service',{type:'extract',id:h.id});return true;}
function nearestUsable(w,h) {
  const list=[...w.objects.filter(o=>!o.used||['forge','pawn','agnes','stash','quillonTown','campfire','dog','vigilDoor','brazier','lychgate','exit','hangingBell'].includes(o.type)),...w.drops.filter(d=>d.type==='item'&&d.owner===h.id),...w.heroes.filter(u=>!u.alive&&u.id!==h.id)];
  return closest(list,h,44);
}
function interactNearest(w,h,target=null,dt=1/120) {
  const o=target||nearestUsable(w,h);if(!o||dist(h,o)>48)return false;
  if(o.team==='hero'&&!o.alive){o.revive+=dt;if(o.revive>=2)reviveHero(w,o,h);return true;}
  if(o.type==='item')return takeDrop(w,h,o);
  if(o.type==='exit'){
    if(w.attract)return false;
    if(w.zone==='sidecrypt'&&w.sideReturn){const back=w.sideReturn;w.sideReturn=null;enterZone(w,back);return true;}
    if(!objectiveReady(w)){event(w,'notice',{text:w.killsZone<w.need?'The road is not yet clear. '+(w.need-w.killsZone)+' dead remain.':'Finish your errand before you go.'});return false;}
    if(w.zone==='fields'){enterZone(w,'town');return true;}
    if(w.zone!==CAMPAIGN[w.progress]?.zone){if(w.zone==='town'&&w.returnTo)returnFromTown(w,h);else enterZone(w,CAMPAIGN[w.progress].zone);return true;}
    if(w.progress>=CAMPAIGN.length-1){if(!w.angelusKneeling&&!w.bossDefeated)return false;beginEnding(w);return true;}
    const last=w.progress;w.flags.push('quest'+last);w.progress++;enterZone(w,CAMPAIGN[w.progress].zone);event(w,'quest',{step:last});return true;
  }
  if(['forge','pawn','agnes','stash','quillonTown','campfire','vigilDoor'].includes(o.type)){
    if(w===W&&!w.session)openPanel(o.type,h.id);event(w,'serviceOpen',{type:o.type,id:h.id});return true;
  }
  if(o.type==='returnPortal')return returnFromTown(w,h);
  if(o.type==='brazier'){o.active=true;event(w,'light',{id:o.id});return true;}
  if(o.type==='trap'){
    if(o.used)return false;o.used=true;o.falling=.55;const boss=closest(w.foes,o,110,f=>f.alive&&f.boss);if(boss){dealDamage(w,boss,{src:null,amount:boss.maxHp*.12,kb:30});boss.stun=3;}
    const n=radialHit(w,h,o.x,o.y,65,10000,{element:'physical',stun:3,skipBoss:true});for(const u of w.heroes)if(u.alive&&dist(u,o)<50)dealDamage(w,u,{src:null,amount:u.maxHp*.35});fx(w,'chandelier',{x:o.x,y:o.y,r:65,color:GOLD,life:1.2});event(w,'notice',{text:n?'THE PARISH THANKS YOU.':'The chandelier falls. Mind your head.'});return true;
  }
  if(o.used&&o.type!=='dog'&&o.type!=='lychgate'&&o.type!=='hangingBell')return false;
  if(o.type==='sideCrypt'){w.sideReturn=w.zone;enterZone(w,'sidecrypt');return true;}
  if(o.type==='sermon'){o.started=true;return true;}
  if(o.type==='quillon'){if(w.killsZone<6){event(w,'notice',{text:'Clear the dead from the rubble first.'});return false;}o.used=true;w.flags.push('quillonRescued');event(w,'dialogue',{speaker:'Mother Quillon',text:'By the handle. I am not a turnip.'});}
  if(o.type==='chapel'||o.type==='sluice'){
    o.used=true;const count=w.objects.filter(t=>t.type===o.type&&t.used).length;
    event(w,'objective',{type:o.type,count});fx(w,'ring',{x:o.x,y:o.y,r:55,color:'#f1b86a',life:1.4});
    if(o.type==='sluice'&&count===3){w.flags.push('bellRecast');event(w,'pour');}
    else for(let i=0;i<6;i++)spawnFoe(w,choose(w.rng,DB.zone[w.zone].pool),o.x+(w.rng()-.5)*110,o.y+(w.rng()-.5)*110);
  }
  if(o.type==='lychgate'){w.respawn={x:o.x,y:o.y};o.used=true;event(w,'notice',{text:'The Lychgate remembers you. Open the map to travel.'});}
  if(o.type==='lore'){o.used=true;const idx=o.loreId??0;if(!w.lore.includes(idx))w.lore.push(idx);event(w,'dialogue',{speaker:LORE[idx][0],text:LORE[idx][1]});}
  if(o.type==='epitaph'){event(w,'dialogue',{speaker:'An old headstone',text:EPITAPHS[Math.floor(w.rng()*EPITAPHS.length)]});o.used=true;}
  if(o.type==='oldBell'){o.used=true;event(w,'dialogue',{speaker:'Mother Quillon',text:'Old Patience. Her tongue is gone. The Beadle has it.'});}
  if(o.type==='regentTalk'){o.used=true;event(w,'dialogue',{speaker:'Regent Sallow',text:'You have walked so far, little lamps. The foundry is yours.'});}
  if(o.type==='caravan'){o.started=true;event(w,'notice',{text:'Stay with the wagon. Clear the ambushes.'});if(!o.ambush){o.ambush=true;for(let i=0;i<18;i++)spawnFoe(w,choose(w.rng,DB.zone.march.pool),o.x+(w.rng()-.5)*140,o.y+(w.rng()-.5)*140);}}
  if(o.type==='chest'){o.used=true;for(const p of w.heroes)dropItem(w,p,o.x+(p.id%4)*8,o.y,{rarity:w.lootRng()<.08?4:3});h.gems.push([Math.floor(w.lootRng()*3),Math.min(3,1+Math.floor(h.level/10))]);event(w,'chest',{x:o.x,y:o.y});if(['acre','nave','march'].includes(w.zone)&&!w.recipe.includes(w.zone)){w.recipe.push(w.zone);event(w,'notice',{text:'A page of the Shepherd\'s Bell recipe.'});}}
  if(o.type==='unquiet'||o.type==='cursed'){
    o.used=true;o.eventLeft=o.type==='unquiet'?40:30;o.eventKills=w.kills;w.activeEvent=o;
    for(let i=0;i<25;i++)spawnFoe(w,choose(w.rng,DB.zone[w.zone].pool),o.x+(w.rng()-.5)*160,o.y+(w.rng()-.5)*160);
    event(w,'notice',{text:o.type==='unquiet'?'THE UNQUIET ROW • Survive forty seconds.':'CURSED RELIQUARY • Twenty dead in thirty seconds.'});
  }
  if(o.type==='shrine'||o.type==='pylon'){o.used=true;const buff=o.type==='pylon'?choose(w.rng,['power','haste','shield','conduit','channel']):choose(w.rng,['power','haste','shield','fortune']);for(const p of w.heroes)p.buffs[buff]=o.type==='pylon'?20:120;event(w,'notice',{text:buff.toUpperCase()+' • The parish is blessed.'});event(w,'blessing',{x:o.x,y:o.y});}
  if(o.type==='dog'){event(w,'dialogue',{speaker:'Mother Quillon',text:'A creature of impeccable judgment. It has not tried to eat me.'});fx(w,'heart',{x:o.x,y:o.y,z:18,color:GOLD,life:1.5});}
  if(o.type==='hangingBell'){h.inv=1;event(w,'notice',{text:'The bell\'s shadow shelters you from the Toll.'});}
  if(o.type==='tongue'&&w.angelusKneeling){o.progress+=dt;if(o.progress>=1.5){const boss=w.foes.find(f=>f.kind==='angelus');if(boss){w.finishStrike=true;killFoe(w,boss,{src:h,amount:1});}beginEnding(w);}return true;}
  if(o.type==='bigEwe'){o.used=true;const b=spawnFoe(w,'tithe',o.x,o.y,{boss:true});b.name='The Big Ewe';w.bossId=b.id;}
  return true;
}
const ZONE_CACHE_KEYS=['zone','zoneTime','killsZone','need','foes','allies','corpses','drops','props','objects','hazards','shots','fx','numbers','decals','bossId','bossDefeated','angelusKneeling','finishStrike','activeEvent','map','flow','botFlow','width','height','spawn','exit','respawn','explored','_vigilSpawn','reckoning','vigilClock','darkness','hush'];
function passingBell(w,h){if(w.zone==='town'){returnFromTown(w,h);return;}w.returnTo=w.zone;w.returnPos={x:h.x,y:h.y};w.passageCache=Object.fromEntries(ZONE_CACHE_KEYS.map(k=>[k,w[k]]));enterZone(w,'town');event(w,'portal');}
function returnFromTown(w,h){if(!w.returnTo)return false;const back=w.returnTo,pos=w.returnPos,cache=w.passageCache;w.returnTo=null;w.passageCache=null;if(cache&&cache.zone===back){Object.assign(w,cache);w.screen='play';w.ended=false;w.zoneCard=1;event(w,'zone',{id:back});}else enterZone(w,back);for(let i=0;i<w.heroes.length;i++){const u=w.heroes[i];u.x=(pos?.x||w.spawn.x)+i*10;u.y=pos?.y||w.spawn.y;u.vx=u.vy=u.vz=0;u.attack=null;u.inv=1.5;}event(w,'portal');return true;}
function beginEnding(w){if(w.attract)return;w.screen='ending';w.endingPage=0;w.endingT=0;w.flags.push('bookBurned');event(w,'ending');}
function startVigil(w,tier=1,greater=false){w.tier=tier;w.greater=greater;w.returnTo=null;enterZone(w,'vigil');event(w,'vigilStart',{tier});}
function serializeWorld(w){return {version:2,uid:w.uid,seed:w.seed,progress:w.progress,zone:w.zone,heroes:[...w.heroes.filter(h=>!h.follower),...(w.couchReserve||[])].map(h=>{
  const keys=['id','kind','name','color','level','xp','resource','gear','bag','pennies','mats','gems','slots','tones','vows','lantern','stats','verses','verseXP','versePoints','unlockedAll'];return Object.fromEntries(keys.map(k=>[k,h[k]]));}),flags:w.flags,visited:w.visited,lore:w.lore,recipe:w.recipe,stash:w.stash,records:w.records,difficulty:w.difficulty,tier:w.tier};}
function loadWorld(data){const w=newWorld(data.seed);for(const k of ['progress','flags','visited','lore','recipe','stash','records','difficulty','tier'])if(data[k]!==undefined)w[k]=clone(data[k]);const heroes=data.heroes.map(d=>Object.assign(newHero(d.kind,d.id,d.level,d.color),d));w.uid=Math.max(data.uid||10,...heroes.flatMap(h=>[...h.bag,...h.gear.filter(Boolean)].map(i=>i.id)),...w.stash.flat().map(i=>i.id))+1;w.heroes=heroes.slice(0,1);w.couchReserve=heroes.slice(1);enterZone(w,DB.zone[data.zone]?data.zone:CAMPAIGN[w.progress].zone);return w;}
function migrateSave(d,version){if(version<2){for(const h of d.heroes||[]){h.verses||=[0,0,0,0];h.lantern||=[null,null,null];h.gems||=[];}d.version=2;}return d;}


E.MATERIALS.bellBronze={color:'#a78c55',pattern:'metal',rivet:6,over:[['rust','#5c8b81',{amount:.22}]]};
E.MATERIALS.bellWax={color:'#d3c6a0',pattern:'noise',amount:.04};
E.MATERIALS.abbeyOak={color:'#5d4542',pattern:'planks',bw:3,len:18};
E.MATERIALS.vesperStone={color:'#697472',pattern:'stones',size:6,over:[['cracks']]};
E.MATERIALS.holyIron={color:'#535c62',pattern:'metal',rivet:4};
E.SHAPES.parishBell={about:'Verdigris bronze church bell with a broad lip, crown and iron tongue',tags:'bell gothic bronze',mats:{b:'bellBronze',i:'holyIron'},
  parts:[['lathe','b',[0,0,0],[[0,0],[15,0],[15,2],[12,4],[10,8],[9,18],[7,23],[2,25],[0,25]],{seg:16}],['cyl','i',[0,0,2],1.7,17],['ball','i',[0,0,2],3],['cyl','b',[0,0,25],3.5,3],['box','b',[0,0,27],[3,3,5]]]};
E.SHAPES.headstone={about:'Gothic headstone with a little grave bell on a string',tags:'grave stone bell',mats:{s:'vesperStone',b:'bellBronze',i:'holyIron'},
  parts:[['box','s',[0,0,0],[12,5,15]],['prism','s',[0,0,15],[[-6,0],[0,6],[6,0]],5,{axis:'y'}],['box','s',[0,-3,8],[1,1,8]],['box','s',[0,-3,12],[6,1,1]],['cyl','i',[8,0,0],.5,25],['lathe','b',[8,0,21],[[2,0],[1,3],[0,3]],{seg:6}],['box','i',[8,0,2],[.3,.3,19]]]};
E.SHAPES.pew={about:'Breakable oak abbey pew, high back and carved bronze ends',tags:'church pew wood',mats:{w:'abbeyOak',b:'bellBronze'},parts:[['box','w',[0,0,8],[31,8,2]],['box','w',[0,3,10],[31,2,12]],['mirror','x',['box','w',[13,0,0],[3,8,8]]],['mirror','x',['box','b',[15,0,9],[2,9,4]]]]};
E.SHAPES.urn={about:'Wax-sealed funerary urn',tags:'pot grave',mats:{s:'vesperStone',w:'bellWax'},parts:[['lathe','s',[0,0,0],[[0,0],[4,0],[5,3],[5,9],[3,12],[4,13],[0,13]],{seg:8}],['cyl','w',[0,0,13],4,2,{r2:1}]]};
E.SHAPES.lychgate={about:'Roofed gothic graveyard gate with bronze bell and pointed lintel',tags:'gate grave bell',mats:{s:'vesperStone',w:'abbeyOak',b:'bellBronze'},parts:[['mirror','x',['box','s',[21,0,0],[6,8,43]]],['box','w',[0,0,36],[45,5,6]],['prism','w',[0,0,42],[[-28,0],[0,18],[28,0]],18,{axis:'y'}],['use','parishBell',[0,0,25],{scale:.3}],['mirror','x',['cyl','b',[21,0,43],2,5]] ]};
E.SHAPES.chain={about:'Heavy bronze chain link post',tags:'chain heaven',mats:{b:'bellBronze'},parts:[['row',9,[0,0,7],['cyl','b',[0,0,32],2,4,{seg:6}]]]};
E.SHAPES.sluice={about:'Foundry sluice wheel and bronze spillway',tags:'foundry wheel',mats:{b:'bellBronze',i:'holyIron'},parts:[['box','i',[0,0,0],[30,12,8]],['cyl','i',[0,0,8],3,19],['cyl','b',[0,0,27],12,2,{seg:10}],['box','i',[0,0,29],[23,2,2]],['box','i',[0,0,29],[2,23,2]]]};
E.SHAPES.spire={about:'Pointed abbey pier with bronze pinnacles',tags:'gothic pillar',mats:{s:'vesperStone',b:'bellBronze'},parts:[['box','s',[0,0,0],[17,17,6]],['box','s',[0,0,6],[10,10,48]],['box','s',[0,0,54],[17,17,4]],['cyl','b',[0,0,58],7,18,{r2:0,seg:4}]]};
function weaponLine(w,from,to,c,width=1){px.line(w.g,from[0],from[1],to[0],to[1],c,Math.max(1,Math.round(width*w.u)));}
E.Humanoid.weapon('clapper',{length:24,rest:[.55,.28,-.78],blade:true,draw(w){const a=w.at(-2),b=w.at(17),c=w.at(22);w.push((a[2]+b[2])/2,()=>{weaponLine(w,a,b,'#493b32',2);weaponLine(w,w.at(0,-.5),w.at(17,-.5),'#c3a174');for(let i=2;i<10;i+=2)weaponLine(w,w.at(i,-1),w.at(i,1),'#d8bc85');const t=E.tones(w.C.metal);px.disc(w.g,c[0],c[1],4*w.u,t.deep);px.disc(w.g,c[0]-.4,c[1]-.5,3.2*w.u,t.base);px.disc(w.g,c[0]-w.u,c[1]-w.u,1.5*w.u,t.lt);});}});
E.Humanoid.weapon('spade',{length:24,rest:[.25,.25,-.95],blade:true,draw(w){const a=w.at(-3),b=w.at(20);w.push(b[2],()=>{weaponLine(w,a,b,'#6c553c',1.3);weaponLine(w,w.at(16,-2),w.at(22,-3),'#c9c7ad',2);weaponLine(w,w.at(16,2),w.at(22,3),'#7b8d87',2);const pts=[w.at(17,-3),w.at(24),w.at(17,3)];px.poly(w.g,pts.map(p=>p.slice(0,2)),'#aab5a6');weaponLine(w,w.at(17,-3),w.at(24),'#e0dfc6');});}});
E.Humanoid.weapon('crossbow',{length:14,rest:[.85,.12,-.25],blade:false,draw(w){const a=w.at(0),b=w.at(12),l=w.at(10,-7),r=w.at(10,7);w.push(b[2],()=>{weaponLine(w,a,b,'#946b45',3);weaponLine(w,l,b,'#b0b8a9',1.5);weaponLine(w,b,r,'#c0c6b5',1.5);weaponLine(w,l,w.at(4),'#d5c49e');weaponLine(w,w.at(4),r,'#d5c49e');weaponLine(w,w.at(4),w.at(15),'#e7c680');});}});
E.Humanoid.weapon('psalter',{length:4,rest:[.1,0,.3],blade:false,draw(w){const p=w.at(3);w.push(p[2],()=>{px.rect(w.g,p[0]-3*w.u,p[1]-3*w.u,6*w.u,6*w.u,'#bfa77c');px.line(w.g,p[0],p[1]-3*w.u,p[0],p[1]+3*w.u,'#4b5367');});}});
E.Humanoid.hat('watch',h=>{const a=h.at(0,0,2);px.ell(h.g,a[0],a[1],h.r*2.1,h.r*.48,h.dk);px.poly(h.g,[[a[0]-h.r,a[1]],[a[0]-h.r*.7,a[1]-h.r],[a[0]+h.r*.7,a[1]-h.r],[a[0]+h.r,a[1]]],h.c);px.line(h.g,a[0]-h.r*.8,a[1]-1,a[0]+h.r*.8,a[1]-1,'#b69a6b');});
E.Humanoid.hat('beadle',h=>{const a=h.at(0,0,3),rr=h.r;px.poly(h.g,[[a[0]-rr*2.1,a[1]-rr*.6],[a[0],a[1]+rr*.3],[a[0]+rr*2.1,a[1]-rr*.6],[a[0],a[1]-rr*1.5]],'#292a37');px.line(h.g,a[0]-rr*2,a[1]-rr*.6,a[0],a[1]-rr*1.5,GOLD);px.line(h.g,a[0],a[1]-rr*1.5,a[0]+rr*2,a[1]-rr*.6,GOLD);});
function lanternArt(g,x,y,s=1,mouth=0){
  const t=E.tones('#b49b61');px.line(g,x,y-14*s,x,y-10*s,t.lt);px.ell(g,x,y-16*s,3*s,3*s,t.sh);
  px.poly(g,[[x-5*s,y-10*s],[x,y-14*s],[x+5*s,y-10*s]],t.base);px.rect(g,x-5*s,y-10*s,10*s,13*s,'#283c38');
  px.ell(g,x,y-4*s,3.4*s,4.1*s,'#c7c2a4');px.line(g,x-2*s,y-6*s,x-s,y-6*s,'#27322e');px.line(g,x+s,y-6*s,x+2*s,y-6*s,'#27322e');
  px.rect(g,x-s,y-2*s,2*s,Math.max(s,mouth*2*s),'#4b3433');px.line(g,x-5*s,y-10*s,x-5*s,y+3*s,t.sh);px.line(g,x+5*s,y-10*s,x+5*s,y+3*s,t.lt);px.rect(g,x-6*s,y+3*s,12*s,2*s,t.base);px.line(g,x,y-10*s,x,y+3*s,t.deep);
}
function headHook(kind){return (g,Q,rig)=>{
  const p=Q.head;if(!p)return;
  if(kind==='cantor'){px.line(g,p[0]-3*rig.o.size,p[1]-1,p[0]+3*rig.o.size,p[1]-1,'#243043',Math.max(1,rig.o.size));}
  if(kind==='ringer'){for(const key of ['handL','handR']){const a=Q[key];if(a)for(let i=0;i<3;i++)px.line(g,a[0]-2,a[1]-i*2,a[0]+2,a[1]-i*2,'#c7ad7c');}}
};}
function makeHeroRig(h){
  const b=DB.hero[h.kind],gear=h.gear,rare=gear.filter(Boolean).reduce((n,i)=>Math.max(n,i.rarity),0),trim=rare>=4?'#e9c587':rare>=3?'#d0b986':'#ab9771';
  return new E.Humanoid({size:b.size,build:b.build,outfit:b.outfit,weapon:b.weapon,hair:b.hair,hat:gear[1]?(gear[1].rarity>=4?'crown':'helmet'):b.hat||null,hood:gear[1]?false:b.hood,hunch:b.hunch||0,sleeves:b.sleeves,armor:!!gear[2],cape:{len:7,width:5,seg:2.5},seed:hash(h.kind+h.id),colors:{skin:h.kind==='sexton'?'#b5b3a0':'#b9aa8e',hair:h.kind==='sexton'?'#b6b7a8':'#4a4140',cloth:b.cloth,coat:b.cloth,pants:'#333741',boot:gear[4]?'#797a68':'#393b3c',belt:'#6d543a',glove:gear[3]?'#c5a375':'#b1a183',trim,metal:rare>=4?'#bbd0ba':'#8b9692',plate:gear[2]?.rarity>=4?'#aa8a57':'#697779',cape:b.cape,capeIn:'#26252d'},draw:{over:headHook(h.kind)}});
}
class ReachBeast {
  constructor(kind,color){this.kind=kind;this.color=color;this.t=0;this.state={};}
  update(dt,s){this.t+=dt;this.state=s;}
  kick(){}
  draw(g,ox,oy,v){
    const s=this.state,t=this.t,C=E.tones(this.color),f=s.facing||0,cs=Math.cos(f),sn=Math.sin(f),size=this.kind==='moth'?1.8:1;
    const P=(x,y,z)=>{const p=v.p((x*cs-y*sn)*size,(x*sn+y*cs)*size,z*size);return [ox+p[0],oy+p[1]];};
    const line=(a,b,c,w=1)=>px.line(g,a[0],a[1],b[0],b[1],c,w),poly=(a,c)=>px.poly(g,a,c),body=P(0,0,8);
    if(this.kind==='crawler'||this.kind==='hound'){
      const count=this.kind==='hound'?4:8;
      for(let i=0;i<count;i++){const side=i%2?1:-1,fore=Math.floor(i/2)*5-(count===4?2:7),step=Math.sin(t*9+i*1.7)*(s.vx||s.vy?3:.3),hip=P(fore,side*4,9),knee=P(fore+step,side*13,7),foot=P(fore+step*1.6,side*17,Math.max(0,-step));line(hip,knee,C.sh,3);line(knee,foot,C.base,2);line(knee,foot,C.lt,1);}
      px.ell(g,body[0],body[1],11,7,C.deep);px.ell(g,body[0]-1,body[1]-2,10,6,C.base);px.ell(g,body[0]-3,body[1]-3,6,3,C.lt);
      for(const sy of [-1,1]){const e=P(9,sy*4,11);px.rect(g,e[0],e[1],2,2,'#f5d68a');}
    }else if(this.kind==='serpent'){
      for(let i=9;i>=0;i--){const p=P(-i*4,Math.sin(t*7-i*.7)*4,5+Math.sin(i*.5)*3);px.disc(g,p[0],p[1],Math.max(2,6-i*.4),C.sh);px.disc(g,p[0]-1,p[1]-1,Math.max(1,4-i*.3),C.base);}
      const e=P(3,-3,8);px.rect(g,e[0],e[1],2,2,'#f6dc8a');
    }else if(this.kind==='moth'){
      const flutter=.7+Math.sin(t*12)*.2;
      for(const sign of [-1,1]){
        const wing=[P(0,sign*3,12),P(-15,sign*24*flutter,27),P(14,sign*30*flutter,18),P(11,sign*12,2)];poly(wing,C.sh);poly([wing[0],wing[1],wing[2]],C.base);line(wing[1],wing[2],C.lt,2);const eye=P(1,sign*18*flutter,18);px.disc(g,eye[0],eye[1],5,'#8a685a');px.disc(g,eye[0],eye[1],3,'#e0c99d');px.disc(g,eye[0],eye[1],1,'#2a303a');
      }
      line(P(-8,0,12),P(8,0,15),C.deep,5);const h=P(9,0,17);px.disc(g,h[0],h[1],4,C.lt);
    }
  }
}
function makeFoeRig(f){
  const b=f.boss?DB.boss[f.kind]:DB.monster[f.kind],body=b.body;
  if(['crawler','hound','serpent'].includes(body)||f.kind==='regent'&&f.phase>0)return new ReachBeast(f.kind==='regent'?'moth':body,b.color);
  if(body==='blob')return new E.Blob({R:f.kind==='lamb'?8:4,colors:{dk:'#282e38',base:b.color,lt:E.shade(b.color,.3),spec:'#d9d4b7',eye:'#f2dfac',pupil:'#2b2633'},wings:f.kind!=='lamb',feet:true,mouth:true});
  const angel=f.kind==='angelus',size=angel?2.5:f.boss?2:body==='bulky'?1.4:body==='winged'?1.5:1.12;
  return new E.Humanoid({size,build:body==='skeleton'?'skeleton':body==='bulky'||angel?'bulky':'heroic',weapon:f.kind==='digger'?'spade':f.boss||body==='winged'?'clapper':null,hat:f.kind==='beadle'?'beadle':null,outfit:body==='robe'||body==='ghost'||f.kind==='regent'?'robe':'tunic',hood:['robe','ghost'].includes(body),hair:'bald',sleeves:body==='skeleton'?'none':'long',armor:body==='winged'||angel,eyeGlow:true,hunch:body==='ghost'?0:.25,seed:f.id,colors:{skin:b.color,bone:'#c2c0a2',hair:E.shade(b.color,-.3),cloth:E.shade(b.color,-.25),coat:E.shade(b.color,-.25),pants:'#383b3c',boot:'#393a3c',belt:'#665e4c',trim:'#bba16b',metal:'#aaa077',plate:'#9c956f',eye:'#f3d68e'},draw:{over(g,Q,rig){
    if(body==='winged'||angel){const p=Q.neck||Q.head;for(const sign of [-1,1])for(let i=0;i<5;i++){const ax=p[0]+sign*(5+i*3),ay=p[1]+i*1.8;px.poly(g,[[p[0]+sign*4,p[1]+2],[ax+sign*11,ay-12+i],[ax+sign*6,ay+7]],i%2?'#907e57':'#c1ac77');px.line(g,ax,ay,ax+sign*11,ay-12+i,'#e2ca8c');}}
    if(angel){const p=Q.head,rr=10;bellArt(g,p[0],p[1]-4,rr/12,0);if(f.phase===2)px.line(g,p[0],p[1]-12,p[0]+4,p[1]+5,'#19252a',2);}
    if(f.kind==='wight'){const p=Q.handL;if(p)bellArt(g,p[0],p[1]+2,.17,0);}
  }}});
}
function bellArt(g,x,y,s=1,rock=0){
  const C=E.tones('#b49a5b'),pts=[[-12,8],[-9,3],[-7,-9],[-4,-14],[4,-14],[7,-9],[9,3],[12,8],[12,11],[-12,11]].map(([a,b])=>[x+(a+b*rock)*s,y+b*s]);
  px.poly(g,pts,C.deep);px.poly(g,[[-10,7],[-7,1],[-5,-8],[-3,-12],[2,-12],[5,-8],[7,5],[9,7]].map(([a,b])=>[x+(a+b*rock)*s,y+b*s]),C.base);
  px.line(g,x-10*s,y+8*s,x+10*s,y+8*s,C.lt,Math.max(1,s));px.line(g,x-4*s,y-10*s,x-6*s,y+4*s,C.hi,Math.max(1,s));px.ell(g,x,y+11*s,10*s,2*s,C.deep);px.line(g,x,y+7*s,x+rock*8*s,y+14*s,'#5b615d',Math.max(1,2*s));px.disc(g,x+rock*8*s,y+15*s,2*s,C.sh);px.rect(g,x-2*s,y-16*s,4*s,3*s,C.lt);
}
function ensureRig(u,hero=false){
  const signature=hero?u.gear.map(i=>i?.id||0).join(','):u.kind+':'+(u.kind==='regent'?u.phase:0);
  let entry=viewRigs.get(u.id);if(!entry||entry.signature!==signature){entry={rig:hero?makeHeroRig(u):makeFoeRig(u),signature};viewRigs.set(u.id,entry);}return entry.rig;
}
function npcRig(type){
  const id='npc:'+type;if(viewRigs.has(id))return viewRigs.get(id).rig;
  const palettes={forge:['#7d5348','#86877b','short','tunic'],pawn:['#60583f','#c1b58b','bald','coat'],agnes:['#9ba99c','#bcbeb0','long','robe']},p=palettes[type];if(!p)return null;
  const rig=new E.Humanoid({size:type==='pawn'?1.05:1.18,build:'heroic',outfit:p[3],hair:p[2],hood:type==='agnes',hat:type==='pawn'?'cap':null,weapon:null,sleeves:'long',colors:{skin:'#b8ac91',hair:p[1],cloth:p[0],coat:p[0],pants:'#44483f',boot:'#49483c',trim:GOLD},seed:hash(type)});viewRigs.set(id,{rig,signature:'npc'});return rig;
}
function attackState(a){if(!a)return null;const t=a.elapsed,wind=a.wind||.35,total=a.total||1,move=a.s?(a.s.combo?['slash','backslash','overhead'][a.combo]:a.s.move):a.move||'claw';const phase=t<wind?'wind':t<wind+.12?'active':'recover';const u=phase==='wind'?t/wind:phase==='active'?(t-wind)/.12:(t-wind-.12)/Math.max(.1,total-wind-.12);return {spec:E.MOVES[move]||E.MOVES.cast,phase,u:clamp(u,0,1)};}
function updateVisuals(dt,w=W){
  if(!w)return;
  for(const o of w.objects)if(['forge','pawn','agnes'].includes(o.type))npcRig(o.type).update(dt,{x:o.x-19,y:o.y-6,z:0,vx:0,vy:0,facing:.4,pose:o.type==='forge'&&w.time%4<1?'cast':null});
  for(const h of w.heroes){const rig=ensureRig(h,true);rig.update(dt,{x:h.x,y:h.y,z:h.z,vx:h.vx,vy:h.vy,facing:h.facing,attack:attackState(h.attack),dash:h.dodge>0,air:h.dodge>0,hurt:h.hurt,pose:!h.alive?'down':w.angelusKneeling?'guard':null,point:h.kind==='lamplighter',roll:h.dodge>0?(h.kind==='cantor'?0:(.28-h.dodge)/.28*Math.PI*2):0});}
  for(const f of w.foes){const rig=ensureRig(f);const b=DB.monster[f.kind];rig.update(dt,{x:f.x,y:f.y,z:f.z+(b?.body==='ghost'?10+Math.sin(w.time*3+f.id)*2:0),vx:f.vx,vy:f.vy,facing:f.facing,attack:attackState(f.attack),hurt:f.hurt,pose:f.stun>.5?'kneel':w.angelusKneeling&&f.kind==='angelus'?'kneel':null,flap:1,walk:Math.hypot(f.vx,f.vy)>5?1:0});}
  for(const c of w.corpses){const entry=viewRigs.get(c.id);if(entry)entry.rig.update(dt,{x:c.x,y:c.y,z:c.z,facing:c.facing||0,vx:c.vx,vy:c.vy,pose:'down',roll:c.roll||0});}
  for(const a of w.allies){if(!viewRigs.has(a.id))viewRigs.set(a.id,{rig:new E.Humanoid({size:a.giant?1.8:1,build:'skeleton',weapon:'spade',colors:{bone:'#b5c2a0',cloth:'#627459'},seed:a.id}),signature:'ally'});viewRigs.get(a.id).rig.update(dt,{x:a.x,y:a.y,z:0,vx:a.vx||0,vy:a.vy||0,facing:a.facing,attack:a.anim>0?E.move('overhead',1-a.anim/.4):null});}
}


function synthVoice(ctx,destination,kind,freq,at,dur=.3,vol=.2,seed=19) {
  const gain=ctx.createGain();gain.connect(destination);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(vol,at+Math.min(.08,dur*.15));gain.gain.exponentialRampToValueAtTime(.0001,at+dur);
  const nodes=[],rng=E.rng(seed);
  const osc=(f,type='sine',amount=1,detune=0)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,at);o.detune.value=detune;g.gain.value=amount;o.connect(g);g.connect(gain);o.start(at);o.stop(at+dur+.05);nodes.push(o);return o;};
  if(kind==='bell')for(const [ratio,amp] of [[1,1],[2.76,.45],[4.07,.25],[5.43,.13],[8.21,.06]])osc(freq*ratio,'sine',amp);
  else if(kind==='organ'){for(const [mul,amp] of [[1,.7],[2,.35],[3,.15],[4,.1]])osc(freq*mul,'sine',amp);}
  else if(kind==='choir'||kind==='voice'){
    for(const detune of [-6,6]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=freq;o.detune.value=detune;
      for(const [ff,amp] of [[kind==='voice'?650:480,.38],[kind==='voice'?1550:1120,.2],[2450,.08]]){const filter=ctx.createBiquadFilter(),g=ctx.createGain();filter.type='bandpass';filter.frequency.value=ff*(.88+rng()*.2);filter.Q.value=4;g.gain.value=amp;o.connect(filter);filter.connect(g);g.connect(gain);}o.start(at);o.stop(at+dur+.05);nodes.push(o);}
  }else if(kind==='strings'){const o=osc(freq,'sawtooth',.28,-5);osc(freq,'sawtooth',.25,5);const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;gain.disconnect();gain.connect(filter);filter.connect(destination);}
  else if(kind==='drum'){const o=osc(freq,'sine',1);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.28),at+dur);}
  else if(kind==='lute'){
    const rate=ctx.sampleRate,period=Math.max(4,Math.floor(rate/freq)),len=Math.floor(rate*dur),buf=ctx.createBuffer(1,len,rate),data=buf.getChannelData(0);
    for(let i=0;i<period&&i<len;i++)data[i]=(rng()*2-1)*.6;
    for(let i=period;i<len;i++)data[i]=(data[i-period]+data[Math.max(0,i-period+1)])*.497;
    const s=ctx.createBufferSource();s.buffer=buf;s.connect(gain);s.start(at);nodes.push(s);
  }else if(kind==='noise'||kind==='wind'){
    const buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*dur),ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(rng()*2-1);
    const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter();s.buffer=buf;filter.type=kind==='wind'?'lowpass':'bandpass';filter.frequency.value=freq;filter.Q.value=.7;s.connect(filter);filter.connect(gain);s.start(at);nodes.push(s);
  }else osc(freq,'triangle',.5);
  return {gain,nodes,stop(){for(const n of nodes)try{n.stop();}catch{}try{gain.disconnect();}catch{}}};
}
const VOICES={
 'Mother Quillon':{pitch:104,pace:.058},'Beadle Crake':{pitch:76,pace:.105},'Regent Sallow':{pitch:214,pace:.083},'The Angelus':{pitch:47,pace:.13},
 'Bram Tolliver':{pitch:112,pace:.06},'Brother Iven':{pitch:180,pace:.075},'Wren Ashby':{pitch:226,pace:.047},'Maud Harrow':{pitch:143,pace:.07},
 'Ysolde Tarrow':{pitch:174,pace:.065},'Old Penny':{pitch:169,pace:.047},'Sister Agnes':{pitch:195,pace:.08},'Narrator':{pitch:91,pace:.09}
};
const SCORES={
 title:[0,3,7,2,0,-5,3,2],town:[0,7,3,10,7,5,3,2],acre:[0,0,3,-2,0,7,3,-5],nave:[0,-5,3,2,0,-2,-5,-7],crypt:[0,1,-5,0,3,2,-5,-2],
 salt:[0,2,7,5,2,-2,0,-5],works:[0,0,-2,3,0,-5,-2,2],regent:[0,3,7,8,7,3,1,-2],heaven:[0,7,10,12,7,5,3,2],angelus:[0,-5,1,7,0,3,-2,-7],
 vigil:[0,3,0,7,-2,3,5,2],ending:[0,4,7,12,11,7,4,2],fields:[0,4,7,9,7,4,2,4]
};
const audio={
 ctx:null,buses:{},voices:[],cue:'title',stepN:0,next:0,hush:false,stopped:false,
 setup(){
   if(this.ctx||!game?.audio.ready)return !!this.ctx;this.ctx=game.audio.ctx;const c=this.ctx;
   const impulse=c.createBuffer(2,Math.floor(c.sampleRate*3.5),c.sampleRate),r=E.rng(1441);
   for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(r()*2-1)*Math.pow(1-i/d.length,3)*.32;}
   for(const name of ['music','sfx','voice']){const input=c.createGain(),filter=c.createBiquadFilter(),gain=c.createGain(),rev=c.createConvolver(),wet=c.createGain();filter.type='lowpass';filter.frequency.value=18000;gain.gain.value=1;rev.buffer=impulse;wet.gain.value=name==='voice'?.16:.1;input.connect(filter);filter.connect(gain);gain.connect(game.audio.bus(name));filter.connect(rev);rev.connect(wet);wet.connect(game.audio.bus(name));this.buses[name]={input,filter,gain,wet};}
   this.next=c.currentTime+.1;return true;
 },
 tone(kind,freq,dur=.3,vol=.2,bus='sfx',at=null,seed=19){if(this.stopped||!this.setup())return;const v=synthVoice(this.ctx,this.buses[bus].input,kind,freq,at??this.ctx.currentTime,dur,vol,seed);this.voices.push({v,end:(at??this.ctx.currentTime)+dur+.2});return v;},
 bell(freq=180,vol=.16){this.tone('bell',freq,1.3,vol);},
 sound(kind,power=1){
   if(kind==='hit'){this.tone('noise',1100,.07,.12*power);this.tone('drum',100,.1,.18*power);this.tone('bell',310+power*30,.25,.055);}
   else if(kind==='swing'){this.tone('noise',800,.11,.05);}
   else if(kind==='break'){this.tone('noise',2200,.2,.13);this.tone('drum',75,.17,.1);}
   else if(kind==='penny')this.tone('bell',700,.15,.025);
   else if(kind==='relic'){this.tone('bell',130,3,.3);this.tone('choir',220,2,.15);this.tone('bell',330,2,.13);}
   else if(kind==='level'){[0,4,7,12].forEach((n,i)=>this.tone('bell',220*Math.pow(2,n/12),1,.12,'sfx',this.ctx?this.ctx.currentTime+i*.11:null));}
   else if(kind==='heal'){this.tone('choir',330,.6,.08);this.tone('bell',660,.6,.08);}
   else if(kind==='evade')this.tone('wind',1700,.16,.08);
   else if(kind==='portal'){this.tone('bell',145,2,.18);this.tone('choir',147,1.5,.09);}
   else if(kind==='death'){this.tone('bell',73,3,.16);}
   else if(kind==='select')this.tone('bell',440,.09,.03);
 },
 speak(name,text){
   if(!this.setup()||this.stopped)return;
   const p=VOICES[name]||{pitch:120+hash(name)%130,pace:.067},r=E.rng(hash(name+text));let at=this.ctx.currentTime+.03;
   for(let i=0;i<Math.min(110,text.length);i+=2){const ch=text[i];if(/[.,!?]/.test(ch)){at+=.13;continue;}if(ch===' '){at+=.02;continue;}const vowel=(text.charCodeAt(i)%5),pitch=p.pitch*Math.pow(2,(vowel-2)/12)*(1+(r()-.5)*.08);this.tone('voice',pitch,p.pace*1.25,.07,'voice',at,hash(ch));if(name==='The Angelus')this.tone('bell',pitch*.5,.4,.035,'voice',at);at+=p.pace;}
 },
 setCue(cue){if(cue!==this.cue){this.cue=cue;this.stepN=0;this.next=this.ctx?this.ctx.currentTime+.1:0;}},
 update(){
   if(this.stopped||!this.setup())return;const c=this.ctx,hush=!!(W&&(W.hush>0||getMain()?.silenced||!getMain()?.alive));
   for(const b of Object.values(this.buses)){b.filter.frequency.setTargetAtTime(hush?650:18000,c.currentTime,.12);b.gain.gain.setTargetAtTime(hush?.17:1,c.currentTime,.1);b.wet.gain.setTargetAtTime(W&&['nave','crypt','chamber'].includes(W.zone)?.23:.1,c.currentTime,.3);}
   if(hush&&!this.hush)this.tone('bell',2250,.6,.018);this.hush=hush;
   const cue=this.cue,notes=SCORES[cue]||SCORES.acre,combat=W&&W.heroes.some(h=>h.combat>0),bpm=['works','vigil'].includes(cue)?80:cue==='town'?72:64,step=60/bpm;
   if(this.next<c.currentTime-.3)this.next=c.currentTime+.03;
   while(this.next<c.currentTime+.18){const n=this.stepN++,f=110*Math.pow(2,notes[n%notes.length]/12),at=this.next;
     this.tone(cue==='town'?'lute':cue==='salt'?'organ':'strings',f,step*2,.12,'music',at,n+8);
     if(n%4===0){this.tone('bell',f*2,step*3,.15,'music',at);this.tone('choir',f*2,step*3.7,.1,'music',at);this.tone('organ',55,step*4,.09,'music',at);}
     if(combat||['works','vigil','regent','angelus'].includes(cue))this.tone('drum',n%2?90:60,.35,.14,'music',at);
     if(W&&['salt','acre','title'].includes(cue)&&n%4===0)this.tone('wind',cue==='salt'?280:950,step*4,.035,'music',at,n);
     this.next+=step;
   }
   this.voices=this.voices.filter(e=>e.end>c.currentTime);
 },
 stop(){this.stopped=true;for(const e of this.voices)e.v.stop();this.voices=[];for(const b of Object.values(this.buses))b.gain.gain.value=0;},
 resume(){this.stopped=false;for(const b of Object.values(this.buses))b.gain.gain.value=1;this.next=this.ctx?this.ctx.currentTime+.05:0;}
};


function text(g,str,x,y,c=IVORY,o={}){E.font.text(g,String(str),Math.round(x),Math.round(y),c,{outline:false,shadow:'#070c12',...o});}
function smallBox(g,x,y,w,h,accent=GOLD,alpha=.94){E.ui.box(g,x,y,w,h,{bg:[PANEL,INK],border:accent,alpha});px.line(g,x+2,y+2,x+w-3,y+2,'#344247');}
function ornate(g,x,y,w,h,c=GOLD){smallBox(g,x,y,w,h,c);for(const [xx,yy,dx,dy] of [[x,y,1,1],[x+w-1,y,-1,1],[x,y+h-1,1,-1],[x+w-1,y+h-1,-1,-1]]){px.line(g,xx,yy,xx+dx*9,yy,c);px.line(g,xx,yy,xx,yy+dy*9,c);px.dot(g,xx+dx*3,yy+dy*3,c);}}
function icon(g,id,x,y,size,color=GOLD){
  const sc=size/24,cx=x+size/2,cy=y+size/2,ln=(a,b,c,d,w=1)=>px.line(g,cx+a*sc,cy+b*sc,cx+c*sc,cy+d*sc,color,Math.max(1,w*sc));
  const verb=DB.skill[id]?.verb||id;
  if(['bell','clap','knell'].includes(verb)||id==='clap'||id==='knell'||id==='hour')bellArt(g,cx,cy,sc*.53);
  else if(['cone','charge','spade'].includes(verb)){ln(-6,7,6,-7,2);ln(2,-7,8,-1,2);ln(-7,2,-2,7);}
  else if(verb==='bolt'||verb==='wave'){ln(-8,6,8,-6,2);ln(1,-6,8,-6);ln(8,-6,8,1);ln(-7,-3,-2,-7);}
  else if(verb==='chain'){for(let i=-1;i<2;i++){ln(i*6-3,-4,i*6+3,4,2);ln(i*6-2,3,i*6+3,-3);}}
  else if(verb==='beam'){ln(-8,5,8,-5,2);ln(-8,1,7,-8);ln(-5,8,8,-1);}
  else if(verb==='guard'||verb==='heal'){px.poly(g,[[cx-7*sc,cy-7*sc],[cx+7*sc,cy-7*sc],[cx+6*sc,cy+3*sc],[cx,cy+9*sc],[cx-6*sc,cy+3*sc]],E.shade(color,-.5));ln(-6,-6,6,-6);ln(0,-4,0,5,2);ln(-4,0,4,0,2);}
  else if(verb==='summon'||verb==='corpse'){px.disc(g,cx,cy-2*sc,6*sc,color);px.rect(g,cx-4*sc,cy-2*sc,2*sc,2*sc,INK);px.rect(g,cx+2*sc,cy-2*sc,2*sc,2*sc,INK);ln(-3,4,3,4,2);ln(-6,8,6,8);}
  else if(verb==='lob'||verb==='area'){ln(-7,7,-5,-1);ln(-5,-1,0,-6);ln(0,-6,5,-1);ln(5,-1,7,7);px.disc(g,cx,cy-7*sc,2*sc,color);ln(-4,7,4,7,2);}
  else if(verb==='leap'||verb==='blink'){ln(-8,6,-1,-7,2);ln(-1,-7,7,0,2);ln(-1,-7,-5,-5);ln(7,0,7,6);ln(4,6,9,6);}
  else {for(let i=0;i<8;i++){const a=i*Math.PI/4;ln(Math.cos(a)*4,Math.sin(a)*4,Math.cos(a)*9,Math.sin(a)*9);}px.disc(g,cx,cy,3*sc,color);}
}
function drawGlass(r,x,y,z=0,size=78){
  const cols=['#5a83af','#ab6979','#d9b975','#688e8d','#8c79a5','#b77863'];
  r.decal(g=>px.blend(g,.26,'add',()=>{
    const center=r.w(x,y,z),rotation=Math.sin((W?.time||0)*.07)*.04;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6+rotation,points=[center,...[a,a+Math.PI/6].map(v=>r.w(x+Math.cos(v)*size,y+Math.sin(v)*size,z))];px.poly(g,points,cols[i%cols.length]);
      const p=r.w(x+Math.cos(a)*size,y+Math.sin(a)*size,z);px.line(g,center[0],center[1],p[0],p[1],'#17212b');
    }
    const pts=r.groundPts(x,y,size*.63,12,z);for(let i=0;i<12;i++)px.line(g,...pts[i],...pts[(i+1)%12],'#273e48',2);
  }),{emissive:.2});
  game.lights.add(x,y,z+3,size*1.3,.4,{color:'#87bfc1'});
}
function drawProp(r,p,w){
  if(p.broken){r.decal(g=>{const q=r.w(p.x,p.y,0);for(let i=0;i<4;i++)px.line(g,q[0]-7+i*4,q[1]+(i%2)*3,q[0]-3+i*4,q[1]-1,'#65544a',2);});return;}
  const x=p.x,y=p.y;
  if(p.type==='deadTree')r.shape('tree',x,y,0,{params:{h:45,seed:p.seed},mats:{bark:'#4c5651',leaves:'#414b46'},facing:p.facing,hides:true});
  else if(p.type==='hangingBell'){r.shape('parishBell',x,y,25,{scale:1.3,facing:0});r.shape('chain',x,y,54,{scale:.7});}
  else if(['headstone','pew','urn','chain','anvil','crate','barrel','rock','bush'].includes(p.type))r.shape(p.type,x,y,0,{facing:p.facing||0,scale:p.type==='headstone'?1.05:1,pick:p.breakable?p:null});
  else if(p.type==='pillar')r.shape('spire',x,y,0,{scale:.9});
  else r.prop(p.type,x,y,0,{size:1.2,light:true,pick:p.breakable?p:null});
}
function drawObject(r,o,w){
  const x=o.x,y=o.y,t=w.time;
  if(['forge','pawn','agnes'].includes(o.type)){const rig=npcRig(o.type);r.actor(x-19,y-6,0,(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{pick:o});}
  if(o.type==='exit'||o.type==='lychgate'||o.type==='vigilDoor'||o.type==='returnPortal'||o.type==='sideCrypt'){
    r.shape('lychgate',x,y,0,{scale:o.type==='exit'?1.4:1,pick:o});const active=o.type!=='exit'||objectiveReady(w);
    r.decal(()=>{r.groundRing(x,y,22,active?TEAL:'#716856',.7);if(active)r.groundRing(x,y,18+Math.sin(t*2)*3,TEAL,.3);});
    if(active){game.lights.add(x,y,22,70,.7,{color:TEAL});}
    if(o.type==='exit')r.textAt(x,y,65,active?'ONWARD':'SEALED',active?TEAL:GOLD);
  }else if(o.type==='quillon'||o.type==='quillonTown'){
    if(o.used&&o.type==='quillon')return;r.queue(x,y,15,g=>{const p=r.w(x,y,16+Math.sin(t*2));lanternArt(g,p[0],p[1],1.3,w.dialogue?Math.sin(t*20)*.5+.5:0);},{pick:o});game.lights.add(x,y,18,60,.6,{color:'#bad9a3'});
  }else if(o.type==='forge'){r.shape('anvil',x,y,0,{scale:1.6,pick:o});r.prop('brazier',x-20,y-15,0,{size:1.5,light:true});}
  else if(o.type==='pawn'){r.shape('table',x,y,0,{scale:1.4,pick:o});r.prop('chest',x+14,y,0);r.prop('lantern',x,y,19,{light:true});}
  else if(o.type==='agnes'){for(let i=0;i<6;i++)r.prop('candle',x+i*4-12,y+(i%2)*4,0,{size:1.7,light:true,pick:o});}
  else if(o.type==='stash'||o.type==='chest'||o.type==='cursed')r.prop('chest',x,y,0,{size:1.5,open:o.used,pick:o});
  else if(o.type==='campfire'){r.prop('brazier',x,y,0,{size:1.2,light:true,pick:o});for(let i=0;i<3;i++)r.shape('stool',x+Math.cos(i*2)*25,y+Math.sin(i*2)*25,0);}
  else if(o.type==='dog')r.actor(x,y,0,(g,ox,oy)=>{px.ell(g,ox,oy-5,7,4,'#b8a17e');px.disc(g,ox+6,oy-9,4,'#b8a17e');px.line(g,ox-4,oy-3,ox-4,oy+2,'#8d7961',2);px.line(g,ox+3,oy-3,ox+3,oy+2,'#8d7961',2);px.line(g,ox-5,oy-7,ox-10,oy-12+Math.sin(t*9)*2,'#b8a17e',2);px.dot(g,ox+7,oy-10,INK);},{pick:o});
  else if(o.type==='chapel'){r.shape('spire',x-15,y,0,{scale:.6});r.prop('brazier',x,y,0,{size:1.5,light:!!o.used,pick:o});if(o.used)game.lights.add(x,y,16,90,.8,{color:'#f0c982'});}
  else if(o.type==='trap'){r.prop('chandelier',x,y,o.used?2+(o.falling||0)/.55*60:62,{size:1.8,light:!o.used});r.shape('headstone',x+12,y,0,{pick:o});if(!o.used)r.queue(x,y,60,g=>{const a=r.w(x,y,85),b=r.w(x,y,62);px.line(g,a[0],a[1],b[0],b[1],'#8b8873');});}
  else if(o.type==='lore'){if(!o.used)r.queue(x,y,2,g=>{const p=r.w(x,y,4+Math.sin(t*2));px.poly(g,[[p[0]-5,p[1]-2],[p[0]+3,p[1]-4],[p[0]+5,p[1]+2],[p[0]-3,p[1]+4]],'#d4c49e');px.line(g,p[0]-2,p[1],p[0]+2,p[1]-1,'#887f68');},{pick:o});}
  else if(o.type==='epitaph'||o.type==='unquiet')r.shape('headstone',x,y,0,{pick:o,scale:1.4});
  else if(o.type==='oldBell')r.shape('parishBell',x,y,-10,{scale:4.5,facing:1,pick:o});
  else if(o.type==='regentTalk'){
    let rig=viewRigs.get('regentTalk');if(!rig){rig={rig:new E.Humanoid({size:1.4,build:'heroic',outfit:'robe',weapon:null,hair:'long',colors:{skin:'#d4c7ad',hair:'#d1d0b9',cloth:'#b4ac9d',trim:GOLD}})};viewRigs.set('regentTalk',rig);}
    r.actor(x,y,0,(g,ox,oy)=>rig.rig.draw(g,ox,oy,r.view),{pick:o});
  }else if(o.type==='caravan')r.shape('cart',x,y,0,{scale:1.8,facing:-Math.PI/4,pick:o});
  else if(o.type==='sluice'){r.shape('sluice',x,y,0,{pick:o});if(o.used)r.decal(()=>r.groundDisc(x,y,35,'#d8944c',.4));}
  else if(o.type==='brazier')r.prop('brazier',x,y,0,{light:o.active,size:1.8,pick:o});
  else if(o.type==='hangingBell'){r.shape('parishBell',x,y,55,{scale:2.2,pick:o});r.shape('chain',x,y,112,{scale:1});r.decal(()=>r.groundDisc(x,y,38,'#16232b',.65));}
  else if(o.type==='tongue'){if(w.angelusKneeling){r.shape('parishBell',x,y,0,{scale:1.8,pick:o});r.decal(()=>r.groundRing(x,y,25,TEAL,.7));}}
  else if(o.type==='pylon'||o.type==='shrine'){r.shape('spire',x,y,0,{scale:.6,pick:o});if(!o.used){r.prop('crystal',x,y,37,{size:1.2,color:TEAL,light:true});game.lights.add(x,y,35,60,.7,{color:TEAL});}}
  else if(o.type==='sermon'){r.prop('banner',x,y,0,{size:1.6,pick:o});for(let i=0;i<Math.max(0,6-(o.converted||0));i++)r.prop('statue',x+20+(i%3)*14,y+15+Math.floor(i/3)*15,0,{size:.55});}
  else if(o.type==='bigEwe')r.prop('statue',x,y,0,{size:1.8,pick:o});
  if(currentHover===o)r.decal(()=>r.groundRing(x,y,12,IVORY));
}
function drawWorld(r,w=W,options={}) {
  if(!w?.map)return;const z=DB.zone[w.zone],theme=THEMES[z.theme];
  w.map.drawFloor(r);
  if(z.theme==='works'){
    r.decal(g=>{for(let i=0;i<3;i++){const x=w.width*(.25+i*.22),y0=w.height*.1,y1=w.height*.9;px.poly(g,[[x-10,y0],[x+10,y0],[x+10,y1],[x-10,y1]].map(([xx,yy])=>r.w(xx,yy,0)),'#382d2a');px.poly(g,[[x-6,y0],[x+6,y0],[x+6,y1],[x-6,y1]].map(([xx,yy])=>r.w(xx,yy,0)),'#be7845');for(let y=y0;y<y1;y+=15){const a=r.w(x-10,y,1),b=r.w(x+10,y,1);px.line(g,...a,...b,'#6a6254',2);}}});
    r.shape('parishBell',w.width*.7,w.height*.37,-8,{scale:3,mats:{b:w.flags.includes('bellRecast')?'bellBronze':'holyIron'}});
  }
  for(const d of w.decals.slice(-100))if(r.visible(d.x,d.y,0))r.decal(()=>r.groundDisc(d.x,d.y,d.r,game.settings.blood==='wax'?'#b7a984':game.settings.blood==='none'?'#303c3b':'#693a45',.45));
  if(['nave','chapterhouse','audience','mothcourt','chamber'].includes(w.zone))for(let i=0;i<4;i++){
    const x=w.width*(.3+i*.13),y=w.height*(.68-i*.13);drawGlass(r,x,y,0,65);r.prop('window',x-35,y-40,54,{size:2.3,colors:['#6e9ab2','#b88a73','#c5ab71'],light:true});
  }
  if(w.zone==='town'||w.zone==='prologue'){
    r.shape('parishBell',w.width*.5,w.height*.5,-12,{scale:3.1,facing:Math.sin(w.time*.3)*.03});r.decal(()=>r.groundRing(w.width*.5,w.height*.5,65,'#282e31',.8));
    for(let i=0;i<12;i++){const a=i*Math.PI/6;r.prop('candle',w.width*.5+Math.cos(a)*68,w.height*.5+Math.sin(a)*68,0,{size:1.4,light:true});}
  }
  if(z.layout==='halls'||z.layout==='boss'||z.theme==='heaven')for(let i=0;i<5;i++){
    const t=.12+i*.18,x=lerp(w.spawn.x,w.exit.x,t),y=lerp(w.spawn.y,w.exit.y,t);
    for(const side of [-1,1]){r.shape('spire',x+side*83,y+side*83,0,{scale:z.layout==='boss'?1.3:1});r.prop('candelabra',x+side*65,y+side*65,0,{size:1.4,light:true});}
  }
  w.map.queueWalls(r);
  for(const p of w.props)if(r.visible(p.x,p.y,0))drawProp(r,p,w);
  for(const o of w.objects)if(r.visible(o.x,o.y,0,100))drawObject(r,o,w);
  for(const c of w.corpses)if(!c.used&&r.visible(c.x,c.y,c.z)){
    const rig=viewRigs.get(c.id)?.rig;if(rig)r.actor(c.x,c.y,c.z-(c.age>40?(c.age-40)*3:0),(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{outline:false,alpha:c.age>40?(45-c.age)/5:.75});
  }
  for(const h of w.hazards){
    const ratio=clamp(h.t/h.delay,0,1),radius=h.expand&&h.t>=h.delay?(h.t-h.delay)/(h.life-h.delay)*h.r:h.r;
    r.decal(()=>{
      if(h.shape==='pool'){r.groundDisc(h.x,h.y,h.r,h.color,.23);r.groundRing(h.x,h.y,h.r*(.8+Math.sin(w.time*4)*.1),h.color,.4);}
      else if(h.shape==='ring'){r.groundRing(h.x,h.y,radius,h.color,.9);if(h.expand&&h.t>=h.delay)r.groundRing(h.x,h.y,Math.max(0,radius-5),h.color,.5);}
      else if(h.shape==='line'||h.shape==='cone')r.groundArc(h.x,h.y,0,h.r*ratio,(h.a||0)-(h.shape==='line'?.08:h.half||1),(h.a||0)+(h.shape==='line'?.08:h.half||1),h.color,.35);
      else{r.groundDisc(h.x,h.y,h.r*ratio,h.color,.22);r.groundRing(h.x,h.y,h.r,h.color,.85);}
    },{emissive:.5});
    if(['bell','candle'].includes(h.shape))r.queue(h.x,h.y,75,g=>{const p=r.w(h.x,h.y,90*(1-ratio)+8);if(h.shape==='bell')bellArt(g,p[0],p[1],1.8);else{px.rect(g,p[0]-3,p[1]-16,6,17,'#e2c29b');px.disc(g,p[0],p[1]-19,3,'#f4c77f');}},{emissive:true});
  }
  for(const d of w.drops)if(r.visible(d.x,d.y,d.z)){
    if(d.type==='item'){
      const c=RARITY[d.item.rarity].color,rare=d.item.rarity>=4;const locals=w.heroes.filter(h=>!h.follower),owner=locals.find(h=>h.id===d.owner);if(locals.length>1&&owner){r.decal(()=>r.groundRing(d.x,d.y,7,owner.color,.9));r.textAt(d.x,d.y,10,'P'+(locals.indexOf(owner)+1),owner.color);}
      if(rare){r.queue(d.x,d.y,0,g=>{const p=r.w(d.x,d.y,0),top=r.w(d.x,d.y,95);px.blend(g,.2,'add',()=>{px.poly(g,[[p[0]-4,p[1]],[top[0]-1,top[1]],[top[0]+1,top[1]],[p[0]+4,p[1]]],c);});px.line(g,p[0],p[1],top[0],top[1],c);},{emissive:true});game.lights.add(d.x,d.y,15,60,.9,{color:c});r.decal(()=>r.groundRing(d.x,d.y,9+Math.sin(w.time*2)*2,c,.6));}
      r.queue(d.x,d.y,4,g=>{const p=r.w(d.x,d.y,5+Math.sin(w.time*3+d.id)*2);px.poly(g,[[p[0]-4,p[1]],[p[0],p[1]-4],[p[0]+4,p[1]],[p[0],p[1]+4]],c);px.dot(g,p[0]-1,p[1]-2,IVORY);},{pick:d,emissive:true});
      const main=getMain(w),visible=rare||game.settings.lootLabels==='all'||game.input.down('labels')||main&&dist(main,d)<38;
      if(visible&&d.owner===main?.id)r.textAt(d.x,d.y,15,(rare?'★ ':'')+itemName(d.item),c);
    }else r.queue(d.x,d.y,6,g=>{const p=r.w(d.x,d.y,d.type==='votive'?9+Math.sin(w.time*4+d.id)*2:2);if(d.type==='votive'){px.disc(g,p[0],p[1],3,'#f3d694');px.disc(g,p[0],p[1]-2,2,'#fff1c1');}else{px.ell(g,p[0],p[1],2,1,'#cdb072');px.dot(g,p[0],p[1]-1,'#f0dba0');}},{emissive:true});
  }
  for(const f of w.foes){
    const rig=ensureRig(f),body=DB.monster[f.kind]?.body,fz=f.z+(body==='ghost'?10+Math.sin(w.time*3+f.id)*2:0);
    r.shadow(f.x,f.y,f.r+2,.25);r.actor(f.x,f.y,fz,(g,ox,oy)=>rig.draw(g,ox,oy+(f.spawn>0?f.spawn*15:0),r.view),{outline:!!(f.boss||f.elite||currentHover===f),flash:f.flash>0?'#f9e8c5':null,flashMix:.7,alpha:f.kind==='unvoiced'&&Math.hypot(f.vx,f.vy)<10?.35:1,pick:f});
    if(f.ringing)r.decal(()=>{for(let i=0;i<f.ringing;i++)r.groundRing(f.x,f.y,9+i*4+Math.sin(w.time*5)*1.2,GOLD,.7);});
    if(f.elite||f.hp<f.maxHp&&currentHover===f){const [x,y]=r.w(f.x,f.y,f.boss?70:45);r.overlay(g=>{const cc=f.elite==='rare'?GOLD:'#9ab9e5';px.rect(g,x-13,y,26,3,INK);px.rect(g,x-12,y+1,24*f.hp/f.maxHp,1,cc);if(f.elite)text(g,f.name,x,y-10,cc,{align:'center'});});}
    if(f.reflect>0)r.decal(()=>r.groundRing(f.x,f.y,19,'#f2d9a5'));
  }
  for(const a of w.allies){const rig=viewRigs.get(a.id)?.rig;if(rig){r.shadow(a.x,a.y,5,.3);r.actor(a.x,a.y,0,(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{outline:false});}}
  for(const h of w.heroes){const rig=ensureRig(h,true),z=h.z+(h.travelAnim>0?Math.sin(h.travelAnim/.4*Math.PI)*22:0);
    r.decal(()=>r.groundRing(h.x,h.y,9,h.color,.8));r.shadow(h.x,h.y,7,.35);
    r.actor(h.x,h.y,z,(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{xray:{color:h.color},flash:h.hurt>0?'#fff0da':null,flashMix:.6,alpha:h.stealth>0?.45:1,pick:h});rig.drawSmear?.(r,[IVORY,GOLD,'#a78355','#6d584b']);
    if(!w.flags.includes('bookBurned')&&h.id===w.heroes[0].id&&(w.flags.includes('quillonRescued')||w.zone!=='prologue'))r.queue(h.x,h.y,z+8,g=>{const p=r.w(h.x-8,h.y+4,z+10);lanternArt(g,p[0],p[1],.5,w.dialogue?.5:0);});
    game.lights.add(h.x,h.y,22,h.kind==='lamplighter'?lanternRadius(h):72,.8,{color:h.kind==='lamplighter'?'#f2bc6b':'#c3bc97'});
    if(w.heroes.length>1)r.textAt(h.x,h.y,z+49,h.name,h.color);
  }
  for(const b of w.shots)r.queue(b.x,b.y,b.z,g=>{const p=r.w(b.x,b.y,b.z),q=r.w(b.x-b.vx*.035,b.y-b.vy*.035,b.z);px.line(g,p[0],p[1],q[0],q[1],b.color,2);px.disc(g,p[0],p[1],2,IVORY);},{emissive:true});
  drawEffects(r,w);
  if(CHEATS.overlays)r.decal(g=>{for(const u of [...w.heroes,...w.foes]){r.groundRing(u.x,u.y,u.r,u.team==='hero'?TEAL:'#e4977f');const a=r.w(u.x,u.y,0),b=r.w(u.x+Math.cos(u.facing)*18,u.y+Math.sin(u.facing)*18,0);px.line(g,...a,...b,GOLD);}const h=getMain(w);if(h)for(let iy=-5;iy<=5;iy++)for(let ix=-5;ix<=5;ix++){const x=Math.floor(h.x/16)*16+ix*16+8,y=Math.floor(h.y/16)*16+iy*16+8,d=w.flow.dir(x,y,h.x,h.y),a=r.w(x,y,0),b=r.w(x+d[0]*6,y+d[1]*6,0);px.line(g,...a,...b,'#72948b');}});
  if(options.hud!==false)drawHUD(r,w);
}
function drawEffects(r,w){
  for(const f of w.fx){const u=f.t/f.life,alpha=1-u;
    if(['ring','nova','rise','blink','leap'].includes(f.verb))r.decal(()=>{r.groundRing(f.x,f.y,(f.r||40)*u,f.color||GOLD,alpha);r.groundRing(f.x,f.y,(f.r||40)*u*.7,f.color||GOLD,alpha*.6);});
    else if(f.verb==='cone')r.decal(()=>r.groundArc(f.x,f.y,f.r*(.3+u*.5),f.r,(f.a||0)-1.1+u,(f.a||0)+.6+u,f.color,.65*alpha));
    else if(f.verb==='beam')r.queue(f.x,f.y,18,g=>{const a=r.w(f.x,f.y,18),b=r.w(f.x+Math.cos(f.a)*f.r,f.y+Math.sin(f.a)*f.r,18);px.line(g,...a,...b,f.color,7);px.line(g,...a,...b,IVORY,2);},{emissive:true});
    else if(f.verb==='chain')r.queue(f.x,f.y,f.z||18,g=>{const a=r.w(f.x,f.y,f.z||18),b=r.w(f.to.x,f.to.y,f.to.z||18);const rng=E.rng(f.id);let p=a;for(let i=1;i<=6;i++){const q=i===6?b:[lerp(a[0],b[0],i/6)+(rng()-.5)*8,lerp(a[1],b[1],i/6)+(rng()-.5)*8];px.line(g,...p,...q,IVORY);p=q;}},{emissive:true});
    else if(f.verb==='guard'){const h=w.heroes.find(h=>h.id===f.owner);if(h)r.decal(()=>{r.groundRing(h.x,h.y,18+Math.sin(w.time*4)*2,f.color,.8);r.groundRing(h.x,h.y,23,f.color,.35);});}
    else if(f.verb==='bell')r.queue(f.x,f.y,5,g=>{const p=r.w(f.x,f.y,5);bellArt(g,p[0],p[1],2*(1-u*.15),Math.sin(u*14)*.1);},{alpha,emissive:true});
    else if(f.verb==='cast')r.queue(f.x,f.y,f.z||18,g=>{const p=r.w(f.x,f.y,f.z||18);px.disc(g,p[0],p[1],5*(1-u),f.color);},{emissive:true});
    else if(f.verb==='heart')r.textAt(f.x,f.y,20+u*12,'♥',f.color);
  }
  if(game.settings.numbers)for(const n of w.numbers){const [x,y]=r.w(n.x,n.y,n.z+n.t*14);r.overlay(g=>text(g,Math.round(n.n),x,y,n.color,{align:'center',scale:n.n>999?2:1}));}
}
function bellVessel(g,x,y,value,color,label,amount){
  const s=.9,points=[[-15,12],[-11,6],[-8,-12],[-5,-17],[5,-17],[8,-12],[11,6],[15,12],[15,16],[-15,16]].map(([a,b])=>[x+a,y+b]);
  px.poly(g,points,'#82724f');px.poly(g,points.map(([a,b])=>[x+(a-x)*.86,y+(b-y)*.86]),'#151c23');
  const top=y+12-28*clamp(value,0,1);for(let yy=Math.ceil(top);yy<y+12;yy++){const half=yy<y-7?6:yy<y+4?8:11;px.line(g,x-half,yy,x+half,yy,yy<top+2?E.shade(color,.25):color);}
  px.line(g,x-11,y+13,x+11,y+13,'#c2aa72');px.rect(g,x-2,y-21,4,3,GOLD);text(g,amount,x,y+4,IVORY,{align:'center'});text(g,label,x,y+23,MUTED,{align:'center'});
}
function drawMiniMap(g,w,x,y,width=72,height=43){
  smallBox(g,x,y,width,height,'#405459',.85);const sx=(width-8)/w.width,sy=(height-8)/w.height;
  for(const o of w.objects)if(['exit','lychgate','chapel','sluice','caravan'].includes(o.type)){const col=o.type==='exit'?GOLD:o.used?'#56716e':TEAL;px.rect(g,x+4+o.x*sx-1,y+4+o.y*sy-1,3,3,col);}
  for(const h of w.heroes)px.rect(g,x+4+h.x*sx-1,y+4+h.y*sy-1,3,3,h.color);
  for(const d of w.drops)if(d.type==='item'&&d.item.rarity>=4&&d.owner===w.me)text(g,'★',x+4+d.x*sx,y+4+d.y*sy,RARITY[d.item.rarity].color,{align:'center'});
  const h=getMain(w),target=h&&questTarget(w,h);if(target){const a=[x+4+h.x*sx,y+4+h.y*sy],b=[x+4+target.x*sx,y+4+target.y*sy];px.line(g,...a,...b,'#597a78');px.rect(g,b[0]-1,b[1]-1,3,3,TEAL);}
}
function drawHUD(r,w){
  r.overlay(g=>{
    const h=getMain(w);if(!h)return;const playerCount=w.heroes.filter(u=>!u.follower).length,center=r.W/2,y=r.H-48,pad=game.input.lastDevice==='gamepad';
    if(playerCount===1&&pad){
      const points=[[r.W-110,r.H-38],[r.W-144,r.H-70],[r.W-110,r.H-102],[r.W-76,r.H-70],[r.W-42,r.H-102],[r.W-42,r.H-38]];
      for(let i=0;i<6;i++){const [x,yy]=points[i],s=tunedSkill(h,h.slots[i]),unlocked=s&&(s.unlock<=h.level||h.unlockedAll),cd=h.cooldowns[h.slots[i]]||0;smallBox(g,x,yy,29,28,unlocked?GOLD:'#34424a');if(s)icon(g,s.id,x+6,yy+1,18,unlocked?ELEMENT[s.element||'physical']:'#4b555b');if(cd>0){px.blend(g,.7,'normal',()=>px.rect(g,x+1,yy+1,27,26,INK));text(g,Math.ceil(cd),x+14,yy+7,IVORY,{align:'center'});}text(g,prompt('s'+i),x+14,yy+20,['#8eadd8','#d5a0c4','#8bc3a9','#dc9e91',GOLD,GOLD][i],{align:'center'});}
      bellVessel(g,38,y+4,h.hp/h.maxHp,'#8d4549','LIFE',Math.round(h.hp));bellVessel(g,88,y+4,h.resource/h.resourceMax,DB.hero[h.kind].color,DB.hero[h.kind].resource.toUpperCase(),Math.floor(h.resource));
      text(g,prompt('potion')+' '+(h.potion>0?Math.ceil(h.potion)+'s':'POTION'),38,y-36,IVORY,{align:'center'});text(g,'EVADE '+h.evades+'/2',88,y-36,MUTED,{align:'center'});
    }else if(playerCount===1){
      smallBox(g,center-103,y-10,206,43,'#75664a',.92);
      for(let i=0;i<6;i++){
        const xx=center-96+i*33,s=tunedSkill(h,h.slots[i]),unlocked=s&&s.unlock<=h.level,cd=h.cooldowns[h.slots[i]]||0;
        smallBox(g,xx,y-5,28,28,unlocked?(i===0?GOLD:'#4d6568'):'#34424a');
        if(s)icon(g,s.id,xx+2,y-3,24,unlocked?ELEMENT[s.element||'physical']:'#4b555b');
        if(cd>0){px.blend(g,.65,'normal',()=>px.rect(g,xx+1,y-4,26,26*clamp(cd/Math.max(1,s.cd),0,1),INK));text(g,Math.ceil(cd),xx+14,y+5,IVORY,{align:'center'});}
        if(!unlocked)text(g,'L'+s.unlock,xx+14,y+5,MUTED,{align:'center'});
        text(g,prompt('s'+i).replace('Left click','LMB').replace('Right click','RMB'),xx+14,y+28,i===0?GOLD:IVORY,{align:'center'});
      }
      bellVessel(g,center-127,y+4,h.hp/h.maxHp,'#8d4549','LIFE',Math.round(h.hp));
      bellVessel(g,center+127,y+4,h.resource/h.resourceMax,DB.hero[h.kind].color,DB.hero[h.kind].resource.toUpperCase(),Math.floor(h.resource));
      text(g,prompt('potion')+' '+(h.potion>0?Math.ceil(h.potion)+'s':'POTION'),center-127,y-36,h.potion>0?MUTED:IVORY,{align:'center'});
      text(g,'EVADE '+h.evades+'/2',center+127,y-36,MUTED,{align:'center'});
    }else{
      const bw=Math.min(112,(r.W-28)/playerCount);for(let i=0;i<playerCount;i++){const p=w.heroes.filter(u=>!u.follower)[i],xx=center-playerCount*bw/2+i*bw;
        smallBox(g,xx,y-9,bw-3,43,p.color);text(g,p.name.split(' ')[0]+' • '+p.level,xx+5,y-3,p.color);E.ui.bar(g,xx+5,y+8,bw-13,4,p.hp/p.maxHp,'#9b4e50');E.ui.bar(g,xx+5,y+13,bw-13,2,p.resource/p.resourceMax,DB.hero[p.kind].color);if(!p.alive)text(g,p.deathTimer>0?'RISE IN '+Math.ceil(p.deathTimer):'✕ / ENTER: RISE',xx+5,y+21,GOLD);else for(let j=0;j<6;j++)icon(g,p.slots[j],xx+5+j*15,y+17,12,(p.cooldowns[p.slots[j]]||0)>0?'#526362':GOLD);
      }
    }
    const bh=14;smallBox(g,14,14,120,27,'#475c5c',.86);text(g,h.name.toUpperCase(),20,19,h.color);text(g,DB.hero[h.kind].title+'  •  LEVEL '+h.level,20,30,MUTED);
    if(h.kind==='lamplighter')text(g,'NERVE '+Math.floor(h.nerve)+'/30',20,49,GOLD);
    if(h.kind==='cantor'){for(let i=0;i<3;i++)px.disc(g,22+i*7,51,2,h.chord?GOLD:i<h.notes.length?DB.hero.cantor.color:'#344348');}
    if(h.kind==='sexton')text(g,'BURIED '+w.allies.filter(a=>a.owner===h.id).length,20,49,'#b9cf9d');
    const mx=r.W-92,my=16;drawMiniMap(g,w,mx,my,76,44);
    const quest=CAMPAIGN[w.progress],objective=w.zone==='vigil'?'Fill the Reckoning. Slay the Warden.':quest?.objective||'The world is yours.';
    const ow=Math.min(188,r.W-190);if(w.zoneCard<=0)text(g,w.zone==='vigil'?'THE LONG VIGIL • '+w.tier:quest?.title||DB.zone[w.zone].name,r.W-16,68,GOLD,{align:'right'});
    const lines=E.font.wrap(objective,ow);for(let i=0;w.zoneCard<=0&&i<Math.min(3,lines.length);i++)text(g,lines[i],r.W-16,80+i*10,IVORY,{align:'right'});
    if(w.zoneCard<=0&&w.need&&w.killsZone<w.need)text(g,'Road cleared '+Math.min(w.need,w.killsZone)+'/'+w.need,r.W-16,113,MUTED,{align:'right'});
    if(net?.started)text(g,Math.max(0,Math.ceil((net.info.limitMs-ROOT.AIHub.time())/1000))+'s REMAIN',center,40,GOLD,{align:'center'});
    if(w.zone==='vigil'){smallBox(g,center-100,14,200,22,'#647770');E.ui.bar(g,center-93,29,186,3,w.reckoning/100,TEAL);text(g,'RECKONING '+Math.floor(w.reckoning)+'%',center,19,IVORY,{align:'center'});if(w.greater)text(g,Math.max(0,Math.ceil(w.vigilClock))+'s',center,40,GOLD,{align:'center'});}
    const boss=w.foes.find(f=>f.boss&&f.alive),target=boss||(currentHover?.team==='foe'?currentHover:null);
    if(target){const yy=w.zone==='vigil'?43:15,ww=Math.min(198,r.W*.42);smallBox(g,center-ww/2,yy,ww,25,boss?'#b29766':'#6e8280');text(g,target.name.toUpperCase(),center,yy+5,boss?GOLD:IVORY,{align:'center'});E.ui.bar(g,center-ww/2+7,yy+17,ww-14,4,target.hp/target.maxHp,'#9c4b50');if(target.affixes?.length)text(g,target.affixes.map(a=>DB.affix[a].name).join(' • '),center,yy+29,MUTED,{align:'center'});}
    if(w.requiem>=10){text(g,'REQUIEM',18,r.H*.43,GOLD);text(g,'× '+w.requiem,18,r.H*.43+13,IVORY,{scale:2});E.ui.bar(g,18,r.H*.43+35,60,2,w.requiemT/TUNE.requiem,GOLD);}
    if(w.sacrilege>=6)text(g,'SACRILEGE × '+w.sacrilege,18,r.H*.43+45,GOLD);
    const usable=nearestUsable(w,h);
    if(usable&&!PANEL_STATE&&!attract){const label=usable.type==='item'?'Take '+itemName(usable.item):usable.team==='hero'?'Hold to revive':usable.label||objectLabel(usable.type),str=prompt('interact')+'  '+label;const ww=Math.min(r.W-28,E.font.width(str)+18);smallBox(g,center-ww/2,r.H-90,ww,20,TEAL);text(g,str,center,r.H-83,IVORY,{align:'center'});}
    const toast=w.toasts.at(-1);if(toast&&!w.dialogue){const lines=E.font.wrap(toast.text,r.W-60);for(let i=0;i<lines.length;i++)text(g,lines[i],center,r.H-108-(lines.length-i-1)*10,toast.color,{align:'center'});}
    if(w.dialogue&&!PANEL_STATE&&!talk?.open){const bw=Math.min(330,r.W-32),lines=E.font.wrap(w.dialogue.text,bw-24),yy=r.H-152-lines.length*10;smallBox(g,center-bw/2,yy,bw,24+lines.length*10,'#4e6868',.9);text(g,w.dialogue.speaker.toUpperCase(),center-bw/2+10,yy+7,TEAL);for(let i=0;i<lines.length;i++)text(g,lines[i],center-bw/2+10,yy+20+i*10,IVORY);}
    if(w.zoneCard>0&&!attract){const u=Math.min(1,w.zoneCard);px.blend(g,u,'normal',()=>{const name=DB.zone[w.zone].name.toUpperCase(),scale=E.font.width(name,{scale:2})<r.W-32?2:1;smallBox(g,center-Math.min(r.W-28,E.font.width(name,{scale})+24)/2,58,Math.min(r.W-28,E.font.width(name,{scale})+24),scale===2?30:23,'#596c64',.9);text(g,name,center,67,GOLD,{align:'center',scale});const s=DB.boss[DB.zone[w.zone].boss];if(s)text(g,s.subtitle,center,99,IVORY,{align:'center'});});}
    if(h.level<30){px.rect(g,14,r.H-6,r.W-28,2,'#293e43');px.rect(g,14,r.H-6,(r.W-28)*h.xp/xpNext(h),2,'#92b9a8');}
    if(h.hp<h.maxHp*.25){px.blend(g,.2+Math.sin(w.time*6)*.08,'normal',()=>{px.rect(g,0,0,r.W,5,'#ad3c49');px.rect(g,0,r.H-5,r.W,5,'#ad3c49');px.rect(g,0,0,5,r.H,'#ad3c49');px.rect(g,r.W-5,0,5,r.H,'#ad3c49');});}
    if(CHEATS.god||CHEATS.bot||CHEATS.oneHit||CHEATS.freezeAI||CHEATS.noClip)text(g,'DEV',14,r.H-17,TEAL);
    if(isTuned())text(g,'TUNED',40,r.H-17,GOLD);
    if(!attract&&playerCount===1)text(g,prompt('inventory')+' BAG  '+prompt('skills')+' SKILLS  '+prompt('map')+' MAP',r.W-16,128,MUTED,{align:'right'});
    if(net&&!net.started&&!net.ended)drawHubCard(g,r);
    if(CHEATS.overlays)drawDebugOverlay(g,r,w);
  });
}
function drawDebugOverlay(g,r,w){text(g,'SIM '+w.time.toFixed(1)+'  FOES '+w.foes.length+'  FX '+w.fx.length,14,48,TEAL);if(net)text(g,'NET TX '+net.sent+' RX '+net.received+'  HOST '+net.info.host,14,60,TEAL);for(const f of w.foes){const p=r.w(f.x,f.y,40);text(g,(f.boss?'BOSS':DB.monster[f.kind].ai)+' '+f.atk.toFixed(1),p[0],p[1],TEAL,{align:'center'});}}


function openPanel(kind,owner=getMain()?.id||0){
  if(SESSION)return;game.resume();PANEL_STATE={kind,owner,focus:0,tab:0,page:0,slot:0,skill:0,itemId:null,buttons:[],text:[],art:null,title:'',sub:'',consecrate:0,group:0,spawnKind:0,count:kind==='vigilDoor'?1:6,elite:0,rarity:4,itemLevel:getMain()?.level||1,zoneIndex:0,bossIndex:0,phase:0,affix:0};
  if(kind==='inventory'){const h=W.heroes.find(h=>h.id===owner);PANEL_STATE.itemId=h.bag[0]?.id||h.gear.find(Boolean)?.id;}
  game.input.consumeAll();buildPanel();titleIdle=0;audio.sound('select');
}
function closePanel(){PANEL_STATE=null;for(const I of game.players){const guard=new Set(['s0','s3'].filter(a=>I.down(a)));for(const a of guard)I.suppress(a);if(guard.size)RESUME_GUARDS.set(I,guard);I.consumeAll();}titleIdle=0;}
function panelHero(p=PANEL_STATE){return W?.heroes.find(h=>h.id===p.owner)||getMain();}
function selectedItem(p=PANEL_STATE){const h=panelHero(p);return [...h.bag,...h.gear.filter(Boolean)].find(i=>i.id===p.itemId)||h.bag[0]||h.gear.find(Boolean);}
function uiButton(p,label,x,y,w,h,fn,o={}){p.buttons.push({label,x,y,w,h,fn,...o});return p.buttons.at(-1);}
function uiText(p,str,x,y,c=IVORY,o={}){p.text.push({str,x,y,c,o});}
function wrapText(p,str,x,y,width,c=IVORY,o={}){const lines=E.font.wrap(str,width,o);for(let i=0;i<lines.length;i++)uiText(p,lines[i],x,y+i*(E.font.lineHeight(o)+3),c,o);return lines.length*10;}
function panelTabs(p,labels){const b=p.box,width=(b.w-28)/labels.length;for(let i=0;i<labels.length;i++)uiButton(p,labels[i],b.x+14+i*width,b.y+33,width-3,18,()=>{p.tab=i;p.page=0;p.focus=i;buildPanel();},{selected:p.tab===i,tab:true});}
function panelPager(p,total,pageSize=6,y=null){const b=p.box,pages=Math.ceil(total/pageSize);p.totalPages=pages;if(pages<2)return;const yy=y??b.y+b.h-39;uiButton(p,'←',b.x+14,yy,25,18,()=>{p.page=(p.page+pages-1)%pages;p.focus=0;buildPanel();});uiText(p,(p.page+1)+' / '+pages,b.x+48,yy+5,MUTED);uiButton(p,'→',b.x+80,yy,25,18,()=>{p.page=(p.page+1)%pages;p.focus=0;buildPanel();});}
function buildPanel(){
  const p=PANEL_STATE;if(!p)return;const width=Math.min(456,game.W-24),height=Math.min(248,game.H-24);p.box={x:(game.W-width)/2,y:(game.H-height)/2,w:width,h:height};p.buttons=[];p.text=[];p.totalPages=1;p.art=null;p.detail=null;p.status='';
  const h=panelHero(p),b=p.box;
  if(p.kind==='inventory')inventoryPanel(p,h);
  else if(p.kind==='skills')skillsPanel(p,h);
  else if(p.kind==='journal')journalPanel(p,h);
  else if(p.kind==='map')mapPanel(p,h);
  else if(p.kind==='dev')devPanel(p,h);
  else if(p.kind==='about')aboutPanel(p);
  else if(p.kind==='join')joinPanel(p,h);
  else servicePanel(p,h);
  uiButton(p,'BACK',b.x+b.w-57,b.y+b.h-23,43,15,()=>closePanel(),{back:true});
  p.focus=clamp(p.focus,0,Math.max(0,p.buttons.length-1));
}
function inventoryPanel(p,h){
  p.title='YOUR RELIQUARY';p.sub=h.pennies+' pennies  •  '+h.mats.scrap+' scrap  •  '+h.mats.salt+' salt  •  '+h.mats.ash+' ash';panelTabs(p,['Bag','Stats']);const b=p.box;
  if(p.tab===1){
    const stats=[['DAMAGE',Math.round(damageBase(h)*TUNE.damage)],['TOUGHNESS',Math.round(h.maxHp*(1+stat(h,'armor')/90))],['HEALING',Math.round(stat(h,'regen')+stat(h,'lifeHit')*2.5)]];
    stats.forEach(([label,value],i)=>{const x=b.x+26+i*(b.w-52)/3;uiText(p,label,x,b.y+67,GOLD);uiText(p,value,x,b.y+83,IVORY,{scale:3});});
    const lines=['Critical chance: '+(6+stat(h,'crit')).toFixed(1)+'%','Attack speed: '+(2.5*TUNE.attackSpeed*(1+stat(h,'haste')*.01)).toFixed(1)+'/s','Armor: '+stat(h,'armor').toFixed(1),'Move speed: '+Math.round(92*TUNE.speed*(1+stat(h,'speed')*.01)), 'Lantern powers: '+h.lantern.filter(Boolean).length+'/3'];
    lines.forEach((s,i)=>uiText(p,s,b.x+26,b.y+122+i*13,MUTED));
    if(h.level>=30){uiText(p,'VERSES: '+(h.versePoints||0)+' unspent',b.x+225,b.y+125,GOLD);for(let i=0;i<4;i++)uiButton(p,['Might','Flesh','Will','Grace'][i]+' '+h.verses[i],b.x+225,b.y+140+i*17,140,15,()=>{if(h.versePoints>0){h.versePoints--;h.verses[i]++;buildPanel();}});}
    return;
  }
  const left=b.x+15,top=b.y+58,bagX=b.x+148;
  p.art=g=>{const rig=ensureRig(h,true);rig.drawPortrait(g,left+33,top+28,58,{zoom:1.2,bg:'#19252b',frame:false});};
  for(let i=0;i<8;i++){
    const spots=[[48,104],[48,0],[48,78],[2,54],[95,54],[2,24],[95,24],[95,88]],x=left+spots[i][0],y=top+spots[i][1],item=h.gear[i];
    uiButton(p,item?SLOTS[i].slice(0,1):'+',x,y,22,22,()=>{if(item)p.itemId=item.id;buildPanel();},{item,slot:i,gear:true,onFocus:()=>{if(item)p.itemId=item.id;}});
  }
  uiText(p,'EQUIPPED',left+23,top+133,MUTED);uiText(p,'BAG  '+h.bag.length+'/30',bagX,top-3,GOLD);
  for(let i=0;i<30;i++){
    const item=h.bag[i],x=bagX+(i%6)*24,y=top+10+Math.floor(i/6)*24;
    uiButton(p,item?'':'',x,y,22,22,()=>{if(item){p.itemId=item.id;if(item.identified)equipItem(W,h,item);else{p.identifying=true;p.consecrate=0;}buildPanel();}},{item,empty:!item,onFocus:()=>{if(item)p.itemId=item.id;}});
  }
  p.detail={x:b.x+301,y:top,w:b.w-316,item:selectedItem(p)};
  const item=selectedItem(p);if(item){
    uiButton(p,item.identified?'Equip':'Consecrate',b.x+303,b.y+b.h-72,b.w-318,18,()=>{if(item.identified)equipItem(W,h,item);else{p.identifying=true;p.consecrate=0;}buildPanel();});
    uiButton(p,'Drop',b.x+303,b.y+b.h-50,49,17,()=>{dropBagItem(h,item);buildPanel();});
    uiButton(p,'Salvage',b.x+356,b.y+b.h-50,65,17,()=>{if(W.zone==='town'){salvage(W,h,item);buildPanel();}else toast('Salvage at Ysolde\'s Forge.');});
  }
  p.status=prompt('confirm')+' Equip   '+prompt('s2')+' Hold: consecrate';
}
function dropBagItem(h,item){const idx=h.bag.indexOf(item);if(idx<0)return;h.bag.splice(idx,1);W.drops.push({id:W.uid++,type:'item',owner:h.id,x:h.x+8,y:h.y,z:2,item});}
function skillsPanel(p,h){
  p.title='SIX NOTES. MANY REQUIEMS.';p.sub='Change a skill or Tone freely outside combat.';panelTabs(p,['Skills and Tones','Vows']);const b=p.box,hero=DB.hero[h.kind];
  if(p.tab===1){const slots=h.level>=24?3:h.level>=16?2:h.level>=8?1:0;uiText(p,slots+' vow slots • unlock at 8, 16, 24',b.x+20,b.y+62,GOLD);
    hero.vows.forEach(([name,desc],i)=>{const y=b.y+80+i*32;uiButton(p,(h.vows.slice(0,slots).includes(i)?'★ ':'')+name,b.x+20,y,166,27,()=>{if(!slots){toast('Vows awaken at level 8.');return;}const active=h.vows.slice(0,slots);if(active.includes(i))active.splice(active.indexOf(i),1);else{if(active.length>=slots)active.shift();active.push(i);}h.vows=active;buildPanel();});wrapText(p,desc,b.x+201,y+3,b.w-218,MUTED);});return;
  }
  for(let i=0;i<6;i++){const x=b.x+16+(i%2)*62,y=b.y+62+Math.floor(i/2)*43;uiButton(p,prompt('s'+i),x,y,56,37,()=>{p.slot=i;p.skill=hero.skills.indexOf(h.slots[i]);buildPanel();},{skillIcon:h.slots[i],selected:p.slot===i});}
  uiText(p,'SLOT '+(p.slot+1),b.x+17,b.y+196,TEAL);
  for(let i=0;i<8;i++){
    const sid=hero.skills[i],s=DB.skill[sid],x=b.x+147+(i%2)*142,y=b.y+61+Math.floor(i/2)*24,unlocked=h.level>=s.unlock||h.unlockedAll;
    uiButton(p,unlocked?s.name:'L'+s.unlock+'  '+s.name,x,y,136,21,()=>{p.skill=i;if(!unlocked){toast('This skill awakens at level '+s.unlock+'.');return;}if(h.combat>0&&W.foes.some(f=>dist(f,h)<170)){toast('Wait until you are out of combat.');return;}h.slots[p.slot]=sid;buildPanel();},{selected:h.slots[p.slot]===sid,dim:!unlocked});
  }
  const sid=hero.skills[p.skill],s=DB.skill[sid];wrapText(p,s.text,b.x+147,b.y+162,b.w-163,MUTED);
  const tuned=tunedSkill(h,sid),resName=h.kind==='lamplighter'&&['trap','vault','smoke'].includes(sid)?'Nerve':hero.resource;uiText(p,(tuned.cost?'Cost '+Math.round(tuned.cost)+' '+resName:'Free')+' • Base CD '+tuned.cd+'s',b.x+147,b.y+173,MUTED);
  for(let i=0;i<3;i++){
    const unlocked=h.level>=s.unlock+[2,4,8][i]||h.unlockedAll,x=b.x+147+i*94;
    uiButton(p,s.tones[i].name,x,b.y+185,90,21,()=>{if(!unlocked){toast('This Tone awakens at level '+(s.unlock+[2,4,8][i])+'.');return;}if(h.combat>0&&W.foes.some(f=>dist(f,h)<170)){toast('Wait until you are out of combat.');return;}h.tones[sid]=i;buildPanel();},{selected:h.tones[sid]===i&&unlocked,dim:!unlocked,tip:s.tones[i].text});
  }
  p.status=DB.skill[hero.skills[p.skill]].tones[h.tones[sid]||0].text;
}
function journalPanel(p,h){
  p.title='THE BOOK THAT FORGOT YOU';p.sub='A record kept by the uncounted.';panelTabs(p,['Quest','Lore','How It Plays']);const b=p.box;
  if(p.tab===0){const q=CAMPAIGN[W.progress];uiText(p,'CHAPTER '+DB.zone[W.zone].chapter+' • '+(q?.title||'The Long Vigil'),b.x+20,b.y+65,GOLD,{scale:2});wrapText(p,q?.objective||'Fill the Reckoning. Slay the Warden.',b.x+20,b.y+94,b.w-40);wrapText(p,q?.line||'Your watch is never ended.',b.x+20,b.y+120,b.w-40,MUTED);uiText(p,'Road cleared: '+W.killsZone+' / '+W.need,b.x+20,b.y+166,TEAL);uiText(p,'Quests completed: '+W.flags.filter(s=>/^quest/.test(s)).length,b.x+20,b.y+183,MUTED);}
  if(p.tab===1){if(!W.lore.length)wrapText(p,'Loose pages lie along the road. Read one and it will remain here.',b.x+20,b.y+70,b.w-40,MUTED);W.lore.slice(p.page*6,p.page*6+6).forEach((id,i)=>uiButton(p,LORE[id][0],b.x+20,b.y+61+i*23,b.w-40,20,()=>{p.loreId=id;buildPanel();}));if(p.loreId!==undefined){p.buttons=p.buttons.filter(k=>k.tab);wrapText(p,LORE[p.loreId][1],b.x+22,b.y+77,b.w-44);uiButton(p,'Read aloud',b.x+22,b.y+163,100,22,()=>audio.speak(LORE[p.loreId][0],LORE[p.loreId][1]));uiButton(p,'All pages',b.x+136,b.y+163,100,22,()=>{delete p.loreId;buildPanel();});}else panelPager(p,W.lore.length);}
  if(p.tab===2){const rows=['Roll through any attack. Two charges return in time.','Swap six skills and their Tones outside combat.','Break the furniture. Read the dead. Take their pennies.','Death takes nothing. Your name is not in the Book.','Your loot is yours. Allies share pennies and experience.','The camera stays fixed. Nothing needs repairing.','Touch is a window. Bring a controller or keyboard.','A second controller joins with Options. Four may walk.'];rows.forEach((s,i)=>wrapText(p,s,b.x+20,b.y+63+i*18,b.w-40,i%2?MUTED:IVORY));}
}
function mapPanel(p,h){
  p.title='THE LYCHGATES';p.sub='The road remembers every place you have rung.';const b=p.box;
  const zones=W.visited.filter(z=>z!=='prologue');zones.slice(p.page*7,p.page*7+7).forEach((id,i)=>uiButton(p,DB.zone[id].name,b.x+20,b.y+45+i*23,205,20,()=>{if(h.combat>0&&W.foes.some(f=>dist(f,h)<170)){toast('The Lychgate cannot hear you in combat.');return;}enterZone(W,id);closePanel();},{selected:W.zone===id}));
  p.art=g=>{const x=b.x+245,y=b.y+50,ww=b.w-265,hh=139;smallBox(g,x,y,ww,hh,'#4c6765');const sx=(ww-10)/W.width,sy=(hh-10)/W.height;for(let cy=0;cy<W.map.h;cy++)for(let cx=0;cx<W.map.w;cx++){if((CHEATS.reveal||W.explored?.has(cx+','+cy))&&!W.map.walkable(cx,cy))px.rect(g,x+5+cx*16*sx,y+5+cy*16*sy,Math.max(1,sx*16),Math.max(1,sy*16),'#5c6a65');}for(const o of W.objects)if(!o.used)px.rect(g,x+5+o.x*sx,y+5+o.y*sy,2,2,GOLD);for(const u of W.heroes)px.rect(g,x+5+u.x*sx,y+5+u.y*sy,3,3,u.color);};
  panelPager(p,zones.length,7);
}
function servicePanel(p,h){
  const b=p.box;const titles={forge:'YSOLDE\'S FORGE',pawn:'OLD PENNY\'S PAWN',agnes:'THE CHANDLERY',stash:'THE SHARED STASH',quillonTown:'MOTHER QUILLON\'S LANTERN',campfire:'YOUR FELLOW PARISHIONERS',vigilDoor:'THE LONG VIGIL'};p.title=titles[p.kind]||p.kind;p.sub=h.pennies+' pennies • '+h.mats.scrap+' scrap • '+h.mats.salt+' salt • '+h.mats.ash+' ash';
  const add=(label,fn,i,o={})=>uiButton(p,label,b.x+22,b.y+48+i*28,237,24,()=>{const result=fn();if(result===false)toast('You lack the offering, or your bag is full.');buildPanel();},o);
  const selectSlot=()=>{p.slot=(p.slot+1)%8;};
  if(p.kind==='forge'){
    add('Craft slot: '+SLOTS[p.slot]+' →',selectSlot,0);
    add('Craft • 6 Scrap',()=>craft(W,h,p.slot),1);
    add('Salvage '+h.bag.filter(i=>i.rarity<4).length+' common items',()=>{for(const i of [...h.bag])if(i.rarity<4)salvage(W,h,i);},2);
    add('Socket equipped '+SLOTS[p.slot],()=>h.gear[p.slot]&&socketGem(W,h,h.gear[p.slot],h.gems[0]),3);
    if(W.recipe.length===3&&!W.flags.includes('shepherdBell'))add('Cast the Shepherd\'s Bell • 20 Scrap',()=>{if(h.mats.scrap<20)return false;h.mats.scrap-=20;W.flags.push('shepherdBell');toast('Ring your new bell at the crater.');},4);
    if(W.flags.includes('shepherdBell'))add('Ring the Shepherd\'s Bell',()=>{enterZone(W,'fields');closePanel();},4);
    wrapText(p,'Iron can be taught to sing. But first it must be broken.',b.x+280,b.y+59,b.w-300,MUTED);wrapText(p,'First gem: '+(h.gems[0]?GEM_NAMES[h.gems[0][0]]+' '+h.gems[0][1]:'none')+'\nEmpty sockets cost 3 Holy Salt.',b.x+280,b.y+112,b.w-300,GOLD);
  }
  if(p.kind==='pawn'){
    add('Offerings: '+SLOTS[p.slot]+' →',selectSlot,0);add('Buy Blessed • '+(80+20*h.level)+' pennies',()=>buy(W,h,p.slot),1);add('Blind Reliquary • 150 pennies',()=>buy(W,h,p.slot,true),2);add('Sell the first bag item',()=>h.bag[0]&&sell(W,h,h.bag[0]),3);wrapText(p,'Every penny was someone\'s last. Spend it well.',b.x+280,b.y+60,b.w-300,MUTED);
  }
  if(p.kind==='agnes'){
    const items=[...h.gear.filter(Boolean),...h.bag],item=items[p.slot%Math.max(1,items.length)];
    add(item?itemName(item)+' →':'No offering',()=>{p.slot++;},0);add('Affix: '+(item?.affixes[p.affix%Math.max(1,item.affixes.length)]?.name||'none')+' →',()=>{p.affix++;},1);
    add('Re-dip • '+(70*((item?.redips||0)+1))+' pennies',()=>item&&redip(W,h,item,p.affix%item.affixes.length),2);wrapText(p,'Wax remembers what it was. I persuade it otherwise.',b.x+280,b.y+58,b.w-300,MUTED);
  }
  if(p.kind==='stash'){
    panelTabs(p,['Chest I','Chest II','Chest III']);const stash=W.stash[p.tab];
    add('Deposit first bag item',()=>{if(!h.bag.length||stash.length>=30)return false;stash.push(h.bag.shift());},.7);
    stash.slice(p.page*5,p.page*5+5).forEach((item,i)=>uiButton(p,'Take '+itemName(item),b.x+22,b.y+95+i*21,b.w-44,18,()=>{if(h.bag.length>=30)return;stash.splice(stash.indexOf(item),1);h.bag.push(item);buildPanel();}));panelPager(p,stash.length,5);
  }
  if(p.kind==='quillonTown'){
    const relics=[...h.bag,...h.gear.filter(Boolean)].filter(i=>i.relic&&i.identified),item=relics[p.slot%Math.max(1,relics.length)];
    add('Consecrate every offering • free',()=>{for(const i of h.bag)consecrate(W,h,i);},0);add('Power: '+(item?.name||'No consecrated Relic')+' →',()=>p.slot++,1);add('Burn selected Relic • 1 Ash',()=>item&&extractRelic(W,h,item),2);
    wrapText(p,'A Relic burns once. Its power need not.',b.x+280,b.y+59,b.w-300,MUTED);h.lantern.forEach((id,i)=>wrapText(p,['Weapon: ','Armor: ','Trinket: '][i]+(id?DB.relic[id].name:'empty'),b.x+22,b.y+145+i*20,b.w-44,id?GOLD:MUTED));
  }
  if(p.kind==='campfire'){
    const hired=W.heroes.filter(u=>u.follower).map(u=>u.kind);Object.values(DB.hero).filter(b=>b.id!==h.kind).forEach((hero,i)=>add((hired.includes(hero.id)?'Dismiss ':'Hire ')+hero.name,()=>{const old=W.heroes.find(u=>u.follower&&u.kind===hero.id);if(old)W.heroes.splice(W.heroes.indexOf(old),1);else{if(W.heroes.length>=4)return false;const f=newHero(hero.id,100+i,h.level,COLORS[(i+1)%4]);f.follower=true;f.bot=true;f.x=h.x+20;f.y=h.y;f.unlockedAll=true;W.heroes.push(f);say(hero.barks[0],hero.name);}return true;},i));wrapText(p,'The parish never travels alone.',b.x+280,b.y+60,b.w-300,MUTED);
  }
  if(p.kind==='vigilDoor'){
    if(!W.flags.includes('tongueTaken')){wrapText(p,'The Vigil Door is sealed. Take the Tongue from Beadle Crake and it will hear you.',b.x+24,b.y+65,b.w-48,IVORY);return;}
    add('Tier '+(p.count||1)+' →',()=>{p.count=(p.count||1)%40+1;},0);add('Greater Vigil: '+(p.greater?'On':'Off'),()=>{if(!Object.values(W.records).some(n=>n>0)){toast('Complete a Vigil first.');return;}p.greater=!p.greater;},1);add('Begin the watch',()=>{const tier=p.count||1;startVigil(W,tier,!!p.greater);closePanel();},2);
    add('Difficulty: '+DIFFICULTIES[W.difficulty].name+' →',()=>{if(!W.flags.includes('tongueTaken')){toast('The Beadle must fall first.');return;}W.difficulty=(W.difficulty+1)%4;},3);wrapText(p,'Fill the Reckoning. Slay its Warden. Ring again.',b.x+280,b.y+60,b.w-300,MUTED);uiText(p,'Best tier: '+(W.records[h.kind]||0),b.x+22,b.y+174,TEAL);
  }
}
function joinPanel(p){p.title='ONE MORE UNCOUNTED';p.sub='Choose your place in the parish.';const b=p.box;Object.values(DB.hero).forEach((hero,i)=>uiButton(p,hero.name+' • '+hero.title,b.x+24,b.y+50+i*34,b.w-48,29,()=>{const h=panelHero(p),level=h.level,id=h.id;const other=Object.assign(newHero(hero.id,id,level,h.color),{x:h.x,y:h.y});W.heroes[W.heroes.indexOf(h)]=other;closePanel();}));}
function devPanel(p,h){
  p.title='THE BELLFOUNDER\'S BENCH';p.sub='Live tools • '+(isTuned()?'TUNED':'Default balance');panelTabs(p,['Cheats','Spawn','Travel','Balance','View','Gallery']);const b=p.box;
  if(p.tab===0){const opts=[['god','Death refuses you'],['oneHit','One-hit kills'],['infinite','Infinite resource'],['noCD','No cooldowns'],['noClip','Walk through walls'],['freezeAI','Freeze the dead'],['reveal','Reveal the map'],['bot','Autopilot'],['stop','Pause simulation']];opts.forEach(([key,label],i)=>uiButton(p,(CHEATS[key]?'★ ':'○ ')+label,b.x+17+(i%2)*211,b.y+60+Math.floor(i/2)*27,205,23,()=>{CHEATS[key]=!CHEATS[key];buildPanel();}));
    uiButton(p,'Restore life',b.x+17,b.y+199,100,20,()=>{h.hp=h.maxHp;h.resource=h.resourceMax;h.evades=2;});uiButton(p,'Step one frame',b.x+124,b.y+199,112,20,()=>{stepWorld(W,1/120);updateVisuals(1/120);});uiButton(p,'Time × '+game.timeScale.toFixed(1),b.x+244,b.y+199,120,20,()=>{game.timeScale=game.timeScale>=3?.1:Math.round((game.timeScale+.1)*10)/10;buildPanel();});
  }
  if(p.tab===1){
    const mode=p.spawnTab||0;['Monsters','Items','Bosses'].forEach((s,i)=>uiButton(p,s,b.x+18+i*140,b.y+59,135,20,()=>{p.spawnTab=i;buildPanel();},{selected:mode===i}));
    const add=(label,fn,i)=>uiButton(p,label,b.x+22,b.y+87+i*25,b.w-44,21,()=>{fn();buildPanel();});
    if(mode===0){const kinds=Object.keys(DB.monster),kind=kinds[p.spawnKind%kinds.length];add('Monster: '+DB.monster[kind].name+' →',()=>p.spawnKind++,0);add('Count: '+p.count+' →',()=>p.count=p.count>=60?1:p.count+1,1);add('Elite: '+['None','Champion','Rare'][p.elite]+' →',()=>p.elite=(p.elite+1)%3,2);add('Affix: '+Object.values(DB.affix)[p.affix%12].name+' →',()=>p.affix++,3);add('Spawn the dead',()=>{for(let i=0;i<p.count;i++){const f=spawnFoe(W,kind,h.x+60+(i%6)*13,h.y-40+Math.floor(i/6)*13,{elite:[null,'champion','rare'][p.elite]});if(p.elite)f.affixes=[Object.keys(DB.affix)[p.affix%12]];}closePanel();},4);}
    if(mode===1){add('Slot: '+SLOTS[p.slot]+' →',()=>p.slot=(p.slot+1)%8,0);add('Rarity: '+RARITY[p.rarity].name+' →',()=>p.rarity=(p.rarity+1)%6,1);add('Level: '+p.itemLevel+' →',()=>p.itemLevel=p.itemLevel%30+1,2);add('Create offering',()=>{dropItem(W,h,h.x+15,h.y,{slot:p.slot,rarity:p.rarity,level:p.itemLevel});closePanel();},3);add('Give 1000 pennies, materials and a level',()=>{h.pennies+=1000;h.mats.scrap+=50;h.mats.salt+=20;h.mats.ash+=5;h.gems.push([0,2],[1,2],[2,2]);gainXP(W,h,xpNext(h));},4);}
    if(mode===2){const bosses=Object.keys(DB.boss),id=bosses[p.bossIndex%bosses.length];add('Boss: '+DB.boss[id].name+' →',()=>p.bossIndex++,0);add('Phase: '+(p.phase+1)+' →',()=>p.phase=(p.phase+1)%DB.boss[id].phases.length,1);add('Summon the Warden',()=>{const f=spawnFoe(W,id,h.x+100,h.y-40,{boss:true});f.hp=f.maxHp*DB.boss[id].phases[p.phase].at;f.phase=p.phase;closePanel();},2);add('Clear every foe',()=>{W.foes=[];W.hazards=[];},3);add('Unlock all skills and Tones',()=>{h.unlockedAll=true;toast('Every note is yours.');},4);}
  }
  if(p.tab===2){const zones=Object.values(DB.zone);zones.slice(p.page*5,p.page*5+5).forEach((z,i)=>uiButton(p,z.name,b.x+18,b.y+60+i*26,242,23,()=>{const index=CAMPAIGN.findIndex(q=>q.zone===z.id);if(index>=0){W.progress=index;W.flags=Array.from(new Set([...W.flags,...Array.from({length:index},(_,n)=>'quest'+n)]));}enterZone(W,z.id);closePanel();}));panelPager(p,zones.length,5);
    uiButton(p,'The ending',b.x+280,b.y+61,145,24,()=>{beginEnding(W);closePanel();});uiButton(p,'Attract tour',b.x+280,b.y+92,145,24,()=>{closePanel();startAttract();});uiButton(p,'Vigil tier '+p.count,b.x+280,b.y+123,145,24,()=>{startVigil(W,p.count);closePanel();});uiButton(p,'Quest step '+W.progress+' →',b.x+280,b.y+154,145,24,()=>{W.progress=(W.progress+1)%CAMPAIGN.length;buildPanel();});
  }
  if(p.tab===3){
    const groups=['Hero','Monsters','Rewards','Feel'];groups.forEach((s,i)=>uiButton(p,s,b.x+17+i*106,b.y+58,101,19,()=>{p.group=i;p.page=0;buildPanel();},{selected:p.group===i}));
    const rows=TUNING.filter(s=>s[0]===groups[p.group]);rows.slice(p.page*5,p.page*5+5).forEach((s,i)=>{
      const yy=b.y+85+i*23,x=b.x+17;uiText(p,s[2],x,yy+5,IVORY);
      uiButton(p,TUNE[s[1]].toFixed(s[6]<1?2:0),b.x+173,yy,208,19,()=>{}, {slider:s,selected:false});uiButton(p,'R',b.x+389,yy,28,19,()=>{TUNE[s[1]]=s[3];saveTune();buildPanel();});
    });
    panelPager(p,rows.length,5,b.y+b.h-25);uiButton(p,'Reset group',b.x+130,b.y+b.h-25,87,18,()=>{resetTune(groups[p.group]);buildPanel();});uiButton(p,'Reset all',b.x+222,b.y+b.h-25,74,18,()=>{resetTune();buildPanel();});uiButton(p,'Copy',b.x+301,b.y+b.h-25,49,18,()=>{const value=JSON.stringify(Object.fromEntries(Object.entries(TUNE).filter(([k,v])=>v!==DEFAULTS[k])),null,2);if(HAS_DOM&&navigator.clipboard)navigator.clipboard.writeText(value).catch(()=>{});if(HAS_DOM)console.info(value);toast('Tuning copied to clipboard and console.');});
  }
  if(p.tab===4){uiButton(p,(CHEATS.overlays?'★ ':'○ ')+'Hitboxes, AI and network state',b.x+22,b.y+65,b.w-44,26,()=>{CHEATS.overlays=!CHEATS.overlays;buildPanel();});uiText(p,'Seed: '+W.seed,b.x+22,b.y+107,MUTED);uiText(p,'Authority: '+W.authority,b.x+22,b.y+124,MUTED);uiText(p,'Simulation never reads a visual rig.',b.x+22,b.y+145,TEAL);}
  if(p.tab===5){wrapText(p,'A living catalogue. Every skill and Tone, every monster and affix, every boss phase. The reel advances by itself.',b.x+25,b.y+67,b.w-50);uiButton(p,'Enter the Gallery',b.x+25,b.y+135,b.w-50,29,()=>{closePanel();startGallery();});}
}
function aboutPanel(p){
  const pages=aboutPages();p.totalPages=pages.length;p.page=((p.page%pages.length)+pages.length)%pages.length;p.title=TITLE.toUpperCase()+' • ABOUT';p.sub=(p.page+1)+' / '+pages.length+'  •  '+pages[p.page].title;
  const b=p.box;let y=b.y+43;for(const row of pages[p.page].rows){const [label,value]=Array.isArray(row)?row:['',row];if(label){uiText(p,label.toUpperCase(),b.x+20,y,TEAL);y+=12;}y+=wrapText(p,value,b.x+20,y,b.w-40,IVORY)+8;}
  uiButton(p,'← Previous',b.x+20,b.y+b.h-25,102,18,()=>{p.page--;buildPanel();});uiButton(p,'Next →',b.x+130,b.y+b.h-25,102,18,()=>{p.page++;buildPanel();});
}
function updatePanel(dt){
  const p=PANEL_STATE;if(!p)return;const I=game.players[Math.max(0,W?.heroes.findIndex(h=>h.id===p.owner)||0)]||game.input;
  buildPanel();let focused=p.buttons[p.focus];const pointer=I.pointer(),click=I.clicked();
  if(pointer&&(I.lastDevice==='mouse'||I.lastDevice==='touch'))for(let i=0;i<p.buttons.length;i++){const b=p.buttons[i];if(pointer[0]>=b.x&&pointer[0]<b.x+b.w&&pointer[1]>=b.y&&pointer[1]<b.y+b.h){p.focus=i;focused=b;b.onFocus?.();break;}}
  for(const [act,dx,dy] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]])if(I.repeat(act)){
    if(focused?.slider&&dx){const s=focused.slider;TUNE[s[1]]=clamp(Math.round((TUNE[s[1]]+dx*s[6])*1000)/1000,s[4],s[5]);saveTune();buildPanel();}
    else{const a=focused||p.buttons[0];let next=-1,score=Infinity;for(let i=0;i<p.buttons.length;i++){const bb=p.buttons[i],vx=bb.x+bb.w/2-a.x-a.w/2,vy=bb.y+bb.h/2-a.y-a.h/2,dot=vx*dx+vy*dy;if(dot<=2)continue;const side=Math.abs(vx*dy-vy*dx),s=dot+side*3;if(s<score){score=s;next=i;}}if(next>=0){p.focus=next;p.buttons[next].onFocus?.();audio.sound('select');}}
  }
  if(I.pressed('prev')||I.pressed('next')){if(p.kind==='about'){p.page+=I.pressed('next')?1:-1;}else{const tabs=p.buttons.filter(b=>b.tab);if(tabs.length){p.tab=(p.tab+(I.pressed('next')?1:tabs.length-1))%tabs.length;p.page=0;p.focus=0;}}buildPanel();}
  if(I.repeat('pagePrev')||I.repeat('pageNext')){p.page=(p.page+(I.repeat('pageNext')?1:(p.totalPages||1)-1))%(p.totalPages||1);buildPanel();}
  if(click){const b=p.buttons.find(b=>click[0]>=b.x&&click[0]<b.x+b.w&&click[1]>=b.y&&click[1]<b.y+b.h);if(b){if(b.slider){const s=b.slider,T=(click[0]-b.x)/b.w;TUNE[s[1]]=clamp(Math.round((s[4]+(s[5]-s[4])*T)/s[6])*s[6],s[4],s[5]);saveTune();}else b.fn();audio.sound('select');}}
  else if(I.pressed('confirm')){focused?.fn();audio.sound('select');}
  if(PANEL_STATE===p&&p.kind==='inventory'){
    const item=selectedItem(p),hold=I.down('s2')||(I.lastDevice==='mouse'&&I.down('s1'));
    if(item&&!item.identified&&(hold||p.identifying)){p.consecrate+=dt;if(p.consecrate>=1){consecrate(W,panelHero(p),item);p.consecrate=0;p.identifying=false;buildPanel();}}else p.consecrate=0;
    if(I.pressed('s1')&&I.lastDevice==='gamepad'&&item){dropBagItem(panelHero(p),item);buildPanel();}
  }
  if(I.pressed('cancel'))closePanel();
}
function drawPanel(g,r){
  const p=PANEL_STATE;if(!p)return;const b=p.box;px.blend(g,.8,'normal',()=>px.rect(g,0,0,r.W,r.H,'#050b11'));ornate(g,b.x,b.y,b.w,b.h,TEAL);text(g,p.title,b.x+15,b.y+11,GOLD);text(g,p.sub,b.x+15,b.y+23,MUTED);
  p.art?.(g);
  for(const t of p.text)text(g,t.str,t.x,t.y,t.c,t.o);
  for(let i=0;i<p.buttons.length;i++){
    const bt=p.buttons[i],focused=i===p.focus,col=focused?IVORY:bt.selected?TEAL:bt.dim?'#3d4d54':'#52686b';
    smallBox(g,bt.x,bt.y,bt.w,bt.h,col,1);if(focused){px.rect(g,bt.x+2,bt.y+2,2,bt.h-4,GOLD);}
    if(bt.item){const c=RARITY[bt.item.rarity].color;icon(g,bt.item.slot===0?DB.hero[bt.item.hero].skills[0]:bt.item.slot<5?'guard':'bell',bt.x+2,bt.y+2,bt.w-4,c);if(!bt.item.identified)text(g,'?',bt.x+bt.w/2,bt.y+7,IVORY,{align:'center'});if(bt.item.rarity>=4){px.dot(g,bt.x+3,bt.y+3,c);px.dot(g,bt.x+bt.w-4,bt.y+bt.h-4,c);}}
    else if(bt.skillIcon){icon(g,bt.skillIcon,bt.x+2,bt.y+3,25,bt.selected?GOLD:IVORY);text(g,bt.label.replace('Left click','LMB').replace('Right click','RMB'),bt.x+bt.w-8,bt.y+bt.h/2-3,MUTED,{align:'right'});}
    else if(bt.slider){const s=bt.slider,fill=(TUNE[s[1]]-s[4])/(s[5]-s[4]);px.rect(g,bt.x+8,bt.y+8,bt.w-52,3,'#34494a');px.rect(g,bt.x+8,bt.y+8,(bt.w-52)*fill,3,TEAL);px.rect(g,bt.x+6+(bt.w-52)*fill,bt.y+5,4,9,GOLD);text(g,TUNE[s[1]].toFixed(s[6]<1?2:0),bt.x+bt.w-5,bt.y+6,IVORY,{align:'right'});}
    else if(bt.label){const lines=E.font.wrap(bt.label,bt.w-12);for(let j=0;j<Math.min(2,lines.length);j++)text(g,lines[j],bt.x+bt.w/2,bt.y+Math.max(4,(bt.h-lines.length*9)/2)+j*9,bt.dim?MUTED:focused?IVORY:bt.selected?TEAL:IVORY,{align:'center'});}
  }
  if(p.detail)drawItemDetail(g,p);
  const tip=p.buttons[p.focus]?.tip||p.status;if(tip)text(g,tip.slice(0,77),b.x+15,b.y+b.h-13,MUTED);
}
function drawItemDetail(g,p){const d=p.detail,item=selectedItem(p);if(!item)return;const h=panelHero(p),c=RARITY[item.rarity].color;let y=d.y;const name=E.font.wrap(itemName(item),d.w);for(const line of name){text(g,line,d.x,y,c);y+=10;}text(g,RARITY[item.rarity].name.toUpperCase()+' • L'+item.level,d.x,y+3,MUTED);y+=17;
  if(!item.identified){for(const line of E.font.wrap('Hold to Consecrate. Let the bell reveal it.',d.w)){text(g,line,d.x,y,IVORY);y+=10;}if(p.consecrate>0)E.ui.bar(g,d.x,y+8,d.w,4,p.consecrate,GOLD);return;}
  const old=h.gear[item.slot],delta=old?Math.round((itemScore(item)/Math.max(1,itemScore(old))-1)*100):100;text(g,(delta>=0?'↑ ':'↓ ')+Math.abs(delta)+'% '+(item.slot===0?'Damage':'Toughness'),d.x,y,delta>=0?TEAL:'#df9b8e');y+=13;
  for(const a of item.affixes.slice(0,4)){text(g,'+'+a.value+' '+a.name.slice(0,14),d.x,y,IVORY);y+=11;}
  if(item.relic){for(const line of E.font.wrap(DB.relic[item.relic].text,d.w)){text(g,line,d.x,y,GOLD);y+=10;}}
  if(item.set){text(g,'Set '+setCount(h)+'/4',d.x,y,TEAL);y+=10;}
  if(item.gem)text(g,GEM_NAMES[item.gem[0]]+' '+item.gem[1],d.x,y,TEAL);
}


async function connectHub(){
  if(!SESSION)return false;
  const info=await ROOT.AIHub.connect({mode:'shared-world',seats:[1,4],card:true});if(!info)return false;
  net={info,started:false,starting:false,ended:false,finished:false,card:{left:10000,ready:[],asking:0},sent:0,received:0,lastP:0,lastS:0,lastE:0,lastM:0,lastC:0,personalSeat:0,rotation:0,events:[],commands:[],seq:0};
  const seed=Math.floor(ROOT.AIHub.rng('vigil')()*4294967295);W=newWorld(seed,{authority:info.isHost,session:true,me:info.server?null:info.me});
  for(const [i,p] of info.players.entries()){
    const h=newHero(Object.keys(DB.hero)[i%4],p.id,14,p.color);h.name=p.name;h.local=!info.server&&p.id===info.me;h.remote=!h.local;h.unlockedAll=true;h.slots=DB.hero[h.kind].skills.slice(0,6);h.resource=100;
    for(let s=0;s<8;s++){const item=rollItem(W,h,{slot:s,rarity:3});item.identified=true;h.gear[s]=item;}
    const relic=rollItem(W,h,{rarity:4,relic:Object.values(DB.relic).find(r=>r.hero===h.kind).id});relic.identified=true;h.gear[relic.slot]=relic;
    W.heroes.push(h);
  }
  startVigil(W,1,false);viewRigs.clear();game.go('play',null,{fade:0});
  ROOT.AIHub.on('card',card=>{net.card=card;});
  ROOT.AIHub.on('start',()=>{net.starting=true;audio.bell(140,.22);});
  ROOT.AIHub.on('message',(message,from)=>receiveMessage(message,from));
  ROOT.AIHub.on('time-up',()=>finishRound(false));
  ROOT.AIHub.on('leave',({id})=>{
    if(!W||net.ended)return;const before=W.heroes.length;W.heroes=W.heroes.filter(h=>h.id!==id);
    if(W.authority){const mul=(1+Math.max(0,before-2)*TUNE.coopLife)/(1+Math.max(0,before-1)*TUNE.coopLife);for(const f of W.foes){f.maxHp*=mul;f.hp*=mul;}}
    net.info.players=net.info.players.filter(p=>p.id!==id);if(!W.heroes.length)finishRound(false);
  });
  ROOT.AIHub.on('end',()=>{net.ended=true;net.started=false;audio.stop();game.audio.mute(true);for(const I of game.players)I.clear();});
  // A direct listener is essential when a software frame cannot consume a short Enter press.
  if(HAS_DOM)window.addEventListener('keydown',e=>{if(!net||net.ended||net.started||net.starting)return;if(e.code==='Enter'){ROOT.AIHub.answer('ready');e.preventDefault();}if(e.code==='KeyM'){ROOT.AIHub.answer('more');e.preventDefault();}});
  ROOT.AIHub.ready();return true;
}
function sendNet(data,o={}){if(!net||net.ended)return false;const ok=ROOT.AIHub.send(data,o);if(ok)net.sent++;return ok;}
function queueCommand(command){if(net&&!W.authority&&net.started&&!net.ended){net.commands.push({...command,q:++net.seq});if(net.commands.length>24)net.commands.splice(0,net.commands.length-24);}}
function networkStep(){
  if(!net||net.ended)return;
  const now=HAS_DOM?performance.now():game.real*1000;
  if(net.starting&&ROOT.AIHub.time()>=0){net.started=true;net.starting=false;audio.setCue('vigil');}
  if(!net.started){const I=game.input;if(I.pressed('confirm')||I.pressed('start'))ROOT.AIHub.answer('ready');if(I.pressed('s2')||I.pressed('map'))ROOT.AIHub.answer('more');const click=I.clicked();if(click){const cy=game.H/2+65;if(click[1]>=cy&&click[1]<cy+30)ROOT.AIHub.answer(click[0]<game.W/2?'ready':'more');}return;}
  if(W.authority){
    if(now-net.lastS>=125){net.lastS=now;
      const heroes=W.heroes.map(h=>[h.id,Math.round(h.x*10),Math.round(h.y*10),Math.round(h.hp),Math.round(h.resource),Math.round(h.maxHp),h.alive?1:0,h.evades,Math.round(h.facing*100)]);
      const list=W.foes.filter(f=>f.alive),foes=[];
      for(let i=0;i<Math.min(20,list.length);i++){const f=list[(net.rotation+i)%list.length];foes.push([f.id,Math.round(f.x*10),Math.round(f.y*10),Math.ceil(f.hp/f.maxHp*1000),f.phase,f.attack?1:0]);}
      net.rotation+=20;const payload=['s',ROOT.AIHub.time()|0,heroes,foes,Math.round(W.reckoning*100),W.kills,W.allies.map(a=>[a.id,Math.round(a.x*10),Math.round(a.y*10),Math.round(a.facing*100),Math.round(a.life*10)])];while(JSON.stringify(payload).length>1090&&foes.length)foes.pop();sendNet(payload,{reliable:false});
    }
    if(now-net.lastE>=200){net.lastE=now;const batch=net.events.splice(0,60);if(batch.length)sendNet(['e',batch]);}
    if(now-net.lastM>=300&&W.heroes.length){net.lastM=now;const h=W.heroes[net.personalSeat++%W.heroes.length];if(h.id!==net.info.me)sendNet(['m',{id:h.id,level:h.level,xp:h.xp,gear:h.gear,bag:h.bag,pennies:h.pennies,mats:h.mats,stats:h.stats,deathTimer:h.deathTimer}],{to:h.id});}
    if(W.ended&&W.results)finishRound(W.results.won);
  }else{
    const h=W.heroes.find(h=>h.id===net.info.me);if(!h)return;
    if(now-net.lastP>=84){net.lastP=now;sendNet(['p',ROOT.AIHub.time()|0,[Math.round(h.x*10),Math.round(h.y*10),Math.round(h.facing*100),h.dodge>0?1:0]],{to:net.info.host,reliable:false});}
    if(now-net.lastC>=170&&net.commands.length){net.lastC=now;sendNet(['c',net.commands.splice(0,12)],{to:net.info.host});}
    for(const f of W.foes)if(f.netTarget){const oldx=f.x,oldy=f.y;f.x=lerp(f.x,f.netTarget[0],.25);f.y=lerp(f.y,f.netTarget[1],.25);f.vx=(f.x-oldx)*15;f.vy=(f.y-oldy)*15;if(Math.hypot(f.vx,f.vy)>2)f.facing=Math.atan2(f.vy,f.vx);}
    for(const p of W.heroes)if(p.id!==net.info.me&&p.netTarget){p.vx=(p.netTarget[0]-p.x)*8;p.vy=(p.netTarget[1]-p.y)*8;p.x=lerp(p.x,p.netTarget[0],.3);p.y=lerp(p.y,p.netTarget[1],.3);}
  }
}
function receiveMessage(data,from){
  if(!net||net.ended||!Array.isArray(data))return;net.received++;
  if(W.authority){const h=W.heroes.find(h=>h.id===from);if(!h)return;
    if(data[0]==='p'){if(data[1]<(h.lastPacket??-Infinity))return;h.lastPacket=data[1];const p=data[2],ox=h.x,oy=h.y;h.x=clamp(p[0]/10,24,W.width-24);h.y=clamp(p[1]/10,24,W.height-24);h.facing=p[2]/100;h.dodge=p[3]?.15:0;h.vx=(h.x-ox)*12;h.vy=(h.y-oy)*12;}
    if(data[0]==='c')for(const c of data[1]){if(c.q<=(h.lastCommand||0))continue;h.lastCommand=c.q;if(c.action==='skill')castSkill(W,h,c.slot,c.aim);if(c.action==='evade')evade(W,h,c.dir);if(c.action==='potion')usePotion(W,h);if(c.action==='interact')interactNearest(W,h,null,.17);}
    return;
  }
  if(from!==net.info.host)return;
  if(data[0]==='s'){
    if(data[1]<(net.lastState??-Infinity))return;net.lastState=data[1];W.reckoning=data[4]/100;W.kills=data[5];
    for(const p of data[2]){const h=W.heroes.find(h=>h.id===p[0]);if(!h)continue;h.hp=p[3];h.resource=p[4];h.maxHp=p[5];h.alive=!!p[6];h.evades=p[7];if(h.id!==net.info.me){h.netTarget=[p[1]/10,p[2]/10];h.facing=p[8]/100;}}
    const allyIds=new Set((data[6]||[]).map(p=>p[0]));W.allies=W.allies.filter(a=>allyIds.has(a.id));for(const p of data[6]||[]){const a=W.allies.find(a=>a.id===p[0]);if(a){a.x=p[1]/10;a.y=p[2]/10;a.facing=p[3]/100;a.life=p[4]/10;}}
    for(const p of data[3]){const f=W.foes.find(f=>f.id===p[0]);if(!f)continue;f.netTarget=[p[1]/10,p[2]/10];f.hp=f.maxHp*p[3]/1000;f.phase=p[4];}
  }
  if(data[0]==='e')for(const e of data[1])applyNetEvent(e);
  if(data[0]==='m'){const d=data[1],h=W.heroes.find(h=>h.id===d.id);if(h)Object.assign(h,d);}
}
function applyNetEvent(e){
  if(e.kind==='spawn'&&!W.foes.some(f=>f.id===e.id)){const f=spawnFoe(W,e.kindName||e.foeKind,e.x,e.y,{boss:e.boss,elite:e.elite});f.id=e.id;f.hp=f.maxHp=e.hp;}
  else if(e.kind==='allySpawn'){if(!W.allies.some(a=>a.id===e.p.id))W.allies.push({...e.p,alive:true});}
  else if(e.kind==='allyEnd'){W.allies=W.allies.filter(a=>a.id!==e.id);}
  else if(e.kind==='hazard'){W.hazards.push({...e.p,src:[...W.foes,...W.heroes].find(u=>u.id===e.p.src)});}
  else if(e.kind==='kill'){
    const f=W.foes.find(f=>f.id===e.id);if(f){f.alive=false;const body=new E.Body({x:e.x,y:e.y,z:3,r:f.r,friction:2.3,bounce:.4});Object.assign(body,{id:f.id,kind:f.kind,boss:f.boss,facing:f.facing,age:0,roll:0,used:false});body.push(Math.cos(e.angle)*e.force,Math.sin(e.angle)*e.force,140);W.corpses.push(body);W.foes=W.foes.filter(u=>u.id!==f.id);}
  }else if(e.kind==='hit'){const f=[...W.foes,...W.heroes,...W.allies].find(u=>u.id===e.id);if(f){f.flash=.15;addNumber(W,f,e.amount,e.crit?GOLD:IVORY);}onWorldEvent(e);}
  else if(e.kind==='fx'){W.fx.push({id:W.uid++,verb:e.verb,t:0,life:e.p.life||.5,...e.p});}
  else if(e.kind==='cast'&&e.id!==net.info.me){const h=W.heroes.find(h=>h.id===e.id);if(h){const s=tunedSkill(h,e.sid);h.facing=angle(h,e.aim);h.attack={sid:e.sid,s,aim:e.aim,a:h.facing,elapsed:0,wind:s.wind,total:.6,struck:true,tick:0};}}
  else if(e.kind==='drop'&&!W.drops.some(d=>d.id===e.id))W.drops.push({id:e.id,type:'item',x:e.x,y:e.y,z:3,owner:e.owner,item:e.item});
  else if(e.kind==='phase'){const f=W.foes.find(f=>f.id===e.id);if(f)f.phase=e.phase;onWorldEvent(e);}
  else if(['taunt','notice','level','chord','bossDeath','warden','blessing'].includes(e.kind))onWorldEvent(e);
}
function finishRound(won){
  if(!net||net.ended||net.finished||!W.authority)return;net.finished=true;
  const heroes=W.heroes.filter(h=>net.info.players.some(p=>p.id===h.id)),total=heroes.reduce((n,h)=>n+h.stats.warden,0)||1,scores={},stats={};
  for(const h of heroes){scores[h.id]=Math.max(0,Math.floor(10*h.stats.reckoning+300*h.stats.warden/total+50*h.stats.revives-25*h.stats.deaths));stats[h.id]={kills:h.stats.kills,deaths:h.stats.deaths,revives:h.stats.revives,'objects broken':h.stats.broken};}
  const sorted=heroes.map(h=>h.id).sort((a,b)=>scores[b]-scores[a]),standings=[];for(const id of sorted){const last=standings.at(-1);if(last&&scores[last[0]]===scores[id])last.push(id);else standings.push([id]);}
  const awards=[];for(const [key,title] of [['damage','Bell of the Ball'],['broken','Sacrilegious'],['revives','Good Samaritan'],['deaths','Frequent Flyer']]){const h=[...heroes].sort((a,b)=>b.stats[key]-a.stats[key])[0];if(h)awards.push({id:h.id,title,detail:String(Math.round(h.stats[key]))});}
  ROOT.AIHub.finish({standings,scores,won:!!won,stats,awards});
}
function drawHubCard(g,r){
  if(!net)return;px.blend(g,.88,'normal',()=>px.rect(g,0,0,r.W,r.H,INK));const ww=Math.min(404,r.W-32),x=(r.W-ww)/2,y=r.H/2-109;ornate(g,x,y,ww,218,TEAL);
  E.font.title(g,TITLE.toUpperCase(),r.W/2,y+13,{align:'center',scale:3,colors:[IVORY,GOLD,'#917649'],depth:1});text(g,'FILL THE RECKONING. SLAY THE WARDEN.',r.W/2,y+49,TEAL,{align:'center'});
  net.info.players.forEach((p,i)=>text(g,(net.card.ready?.includes(p.id)?'★ ':'○ ')+p.name,x+26,y+68+i*14,p.color));
  text(g,'WASD / stick move • '+prompt('s0')+' attack',r.W/2,y+133,IVORY,{align:'center'});text(g,prompt('evade')+' evade • '+prompt('potion')+' potion • six skills',r.W/2,y+146,MUTED,{align:'center'});
  const cy=r.H/2+65;smallBox(g,x+22,cy,ww/2-28,27,GOLD);text(g,'ENTER / ✕  READY',x+ww/4+8,cy+10,IVORY,{align:'center'});smallBox(g,r.W/2+6,cy,ww/2-28,27,TEAL);text(g,'M / △  MORE TIME',r.W/2+ww/4-8,cy+10,IVORY,{align:'center'});
  const left=net.starting?Math.ceil(-ROOT.AIHub.time()/1000):net.card.left===null?'WAIT':Math.ceil(net.card.left/1000);text(g,net.starting?'THE WATCH BEGINS IN '+left:net.card.paused?'THE PARISH ASKS FOR MORE TIME':'THE WATCH BEGINS • '+left,r.W/2,y+202,GOLD,{align:'center'});
}


let frontButtons=[],previewHeroes=[],titleClock=0,galleryReturn=null,galleryClock=0,galleryStep=0;
const nowInput=()=>HAS_DOM?performance.now()/1000:game.real;
let lastTouchAt=-10;
function activity(e){
  if(e&&(e.pointerType==='touch'||e.sourceCapabilities?.firesTouchEvents||nowInput()-lastTouchAt<.8&&e.type?.startsWith('mouse')))return;
  lastActivity=nowInput();titleIdle=0;externalInput=true;
  if(attract&&!net){attract=false;attractClock=0;PANEL_STATE=null;W=null;viewRigs.clear();game.go('title',null,{fade:.15});}
}
function setupTitle(){
  titleClock=0;lastActivity=nowInput();frontFocus=game.saves.latest()?0:1;PANEL_STATE=null;audio.resume();audio.setCue('title');game.cam.frame(null);game.cam.bounds=null;game.focus(380,380,25);game.cam.snap=true;game.setZoom(1);
  game.lights.enabled=true;game.lights.ambient=.5;game.weather={kind:'rain',amount:.5,wind:.15,lightning:.09};
  previewHeroes=Object.keys(DB.hero).map((kind,i)=>{const h=newHero(kind,800+i,18);h.x=350+(i-1.5)*36;h.y=420+(i-1.5)*14;return h;});
}
function frontButton(label,x,y,w,h,fn,o={}){frontButtons.push({label,x,y,w,h,fn,...o});}
function frontStep(I=game.input){
  let acted=false;const pointer=I.pointer(),click=I.clicked();
  if(pointer&&['mouse','touch'].includes(I.lastDevice))for(let i=0;i<frontButtons.length;i++){const b=frontButtons[i];if(pointer[0]>=b.x&&pointer[0]<=b.x+b.w&&pointer[1]>=b.y&&pointer[1]<=b.y+b.h)frontFocus=i;}
  if(I.repeat('down')||I.repeat('right')){frontFocus=(frontFocus+1)%frontButtons.length;audio.sound('select');}
  if(I.repeat('up')||I.repeat('left')){frontFocus=(frontFocus+frontButtons.length-1)%frontButtons.length;audio.sound('select');}
  if(click){const b=frontButtons.find(b=>click[0]>=b.x&&click[0]<=b.x+b.w&&click[1]>=b.y&&click[1]<=b.y+b.h);if(b&&!b.disabled){b.fn();acted=true;}}
  else if(I.pressed('confirm')||I.pressed('start')){const b=frontButtons[frontFocus];if(b&&!b.disabled){b.fn();acted=true;}}
  if(acted)I.consumeAll();return acted;
}
function drawFrontButtons(g){for(let i=0;i<frontButtons.length;i++){const b=frontButtons[i],sel=i===frontFocus;smallBox(g,b.x,b.y,b.w,b.h,b.disabled?'#344247':sel?GOLD:'#536d6a',.96);if(sel&&!b.disabled)px.rect(g,b.x+3,b.y+3,2,b.h-6,TEAL);text(g,b.label,b.x+b.w/2,b.y+(b.h-7)/2,b.disabled?'#617071':sel?IVORY:MUTED,{align:'center'});}}
function updateTitle(dt){
  titleClock+=dt;for(let i=0;i<previewHeroes.length;i++){const h=previewHeroes[i];ensureRig(h,true).update(dt,{x:h.x,y:h.y,z:0,vx:0,vy:0,facing:-.6+i*.23,pose:Math.sin(titleClock*.3+i)>.9?'guard':null});}
  buildTitleButtons();if(PANEL_STATE){updatePanel(dt);return;}frontStep();
}
function buildTitleButtons(){const Wd=game.W,H=game.H,tall=H>Wd*.82;frontButtons=[];const x=tall?Wd/2-84:27,y=tall?H*.61:Math.max(119,H*.48),bw=168,bh=22;const latest=game.saves.latest();
  [['CONTINUE',()=>{loadSaved();},!latest],['NEW HERO',()=>{selectedHero=0;frontFocus=0;game.go('muster');}],['LOAD A HERO',()=>game.saves.show('load',()=>game.go('play')),!latest],['SETTINGS',()=>game.menu('settings')],['ABOUT AND CREDITS',()=>openPanel('about')]].forEach(([label,fn,disabled],i)=>frontButton(label,x,y+i*26,bw,bh,fn,{disabled}));
}
function drawTitleBackdrop(r){
  r.sky(['#09121c','#1c3034','#343c3d']);
  r.decal(g=>{const p=[r.w(215,200,0),r.w(545,200,0),r.w(545,550,0),r.w(215,550,0)];px.poly(g,p,'#273b3e');for(let i=0;i<16;i++){const a=r.w(210+i*22,200,0),b=r.w(210+i*22,550,0);px.line(g,...a,...b,i%3?'#31484a':'#435453');}for(let i=0;i<16;i++){const a=r.w(215,200+i*22,0),b=r.w(545,200+i*22,0);px.line(g,...a,...b,'#1c3035');}});
  drawGlass(r,380,365,0,115);
  for(const x of [250,510])for(const y of [265,410]){r.shape('spire',x,y,0,{scale:1.8});r.prop('candelabra',x-13,y+13,0,{size:1.8,light:true});}
  for(let i=0;i<3;i++)r.prop('window',330+i*50,270-i*16,62,{size:3.2,colors:['#7ca6b2','#b2787a','#d1b573'],light:true});
  r.shape('parishBell',397,372,10,{scale:3.7,facing:Math.sin(titleClock*.4)*.06});r.shape('chain',397,372,125,{scale:1.1});
  for(let i=0;i<12;i++){const a=i*Math.PI/6;r.prop('candle',397+Math.cos(a)*74,372+Math.sin(a)*74,0,{size:1.6,light:true});}
  for(const h of previewHeroes){const rig=ensureRig(h,true);r.shadow(h.x,h.y,7,.35);r.actor(h.x,h.y,0,(g,ox,oy)=>rig.draw(g,ox,oy,r.view),{xray:true});game.lights.add(h.x,h.y,20,65,.65,{color:DB.hero[h.kind].color});}
  game.lights.add(397,372,35,160,.7,{color:'#cfb37e'});
}
function drawTitle(r){
  drawTitleBackdrop(r);r.overlay(g=>{
    const tall=r.H>r.W*.82,lx=tall?r.W/2:27,ly=tall?65:31;
    px.blend(g,.68,'normal',()=>{if(tall)px.rect(g,0,20,r.W,117,INK);else px.poly(g,[[0,0],[245,0],[213,r.H],[0,r.H]],INK);});
    text(g,'THE VESPER REACH',lx,ly,TEAL,{align:tall?'center':'left'});
    E.font.title(g,TITLE.toUpperCase(),lx,ly+18,{align:tall?'center':'left',scale:tall?5:4,colors:['#f3e5c0','#d2b173','#8f7448'],depth:2,depthColor:'#33392f',outline:'#121c22'});
    text(g,'EVERY SOUL COUNTED. EXCEPT YOURS.',lx,ly+(tall?65:55),IVORY,{align:tall?'center':'left'});
    if(tall){text(g,'FOUR UNRUNG. NINE BELLS. ONE HUNGRY SILENCE.',r.W/2,r.H*.57,MUTED,{align:'center'});}
    drawFrontButtons(g);
    text(g,'1-4 PLAYERS  •  A GOTHIC ACTION RPG',r.W-17,r.H-31,GOLD,{align:'right'});
    text(g,'OPTIONS ON A SECOND CONTROLLER TO JOIN',r.W-17,r.H-18,MUTED,{align:'right'});
    px.line(g,14,13,r.W-15,13,'#53635c');px.line(g,14,r.H-9,r.W-15,r.H-9,'#53635c');
    if(PANEL_STATE)drawPanel(g,r);
  });
}
function updateMuster(dt){
  titleClock+=dt;const kinds=Object.keys(DB.hero),h=previewHeroes[selectedHero];
  if(game.input.pressed('left')){selectedHero=(selectedHero+3)%4;activity();}
  if(game.input.pressed('right')){selectedHero=(selectedHero+1)%4;activity();}
  for(let i=0;i<previewHeroes.length;i++){const hero=previewHeroes[i],rig=ensureRig(hero,true);rig.update(dt,{x:hero.x,y:hero.y,z:0,vx:0,vy:0,facing:-Math.PI/4,attack:i===selectedHero?E.move(DB.hero[hero.kind].skills[0]==='clap'?'twohand':hero.kind==='sexton'?'overhead':'cast',(titleClock%3)/3):null,pose:i===selectedHero?'ready':null});}
  frontButtons=[];for(const action of ['left','right','up','down'])game.input.suppress(action);if(game.input.lastDevice!=='mouse')frontFocus=1;const x=game.W/2,y=game.H-50;
  frontButton('←',x-166,y,28,23,()=>selectedHero=(selectedHero+3)%4);frontButton('BEGIN THE WATCH',x-130,y,260,23,()=>{newCampaign(kinds[selectedHero]);prologuePage=0;game.go('prologue');});frontButton('→',x+138,y,28,23,()=>selectedHero=(selectedHero+1)%4);
  const I=game.input;if(I.pressed('up')||I.pressed('down'))frontFocus=1;frontStep(I);if(I.pressed('cancel'))game.go('title');
}
function drawMuster(r){drawTitleBackdrop(r);r.overlay(g=>{px.blend(g,.86,'normal',()=>px.rect(g,0,0,r.W,76,INK));const h=DB.hero[Object.keys(DB.hero)[selectedHero]];text(g,'CHOOSE AN UNCOUNTED SOUL',r.W/2,22,TEAL,{align:'center'});E.font.title(g,h.name.toUpperCase(),r.W/2,40,{align:'center',scale:2,colors:[IVORY,GOLD],depth:1});smallBox(g,26,r.H-108,r.W-52,51,TEAL);text(g,h.title.toUpperCase()+' • '+h.resource,r.W/2,r.H-98,GOLD,{align:'center'});text(g,h.blurb,r.W/2,r.H-82,IVORY,{align:'center'});drawFrontButtons(g);text(g,'← → CHOOSE   '+prompt('confirm')+' BEGIN   '+prompt('cancel')+' BACK',r.W/2,r.H-16,MUTED,{align:'center'});});}
function drawStory(r,ending=false){
  drawTitleBackdrop(r);r.overlay(g=>{px.blend(g,.9,'normal',()=>px.rect(g,0,0,r.W,r.H,INK));const data=ending?ENDING:PROLOGUE,index=ending?W.endingPage:prologuePage,[heading,line]=data[Math.min(index,data.length-1)],cx=r.W/2,yy=r.H/2-40;
    for(let i=0;i<data.length;i++){const x=cx-(data.length-1)*24+i*48,c=i<=index?GOLD:'#364e52';px.poly(g,[[x-14,yy-26],[x,yy-48],[x+14,yy-26],[x+14,yy-8],[x-14,yy-8]],'#253d44');bellArt(g,x,yy-26,.65,Math.sin(titleClock*.4)*.1);px.line(g,x-14,yy-8,x+14,yy-8,c);}
    E.font.title(g,heading,cx,yy+9,{align:'center',scale:2,colors:[IVORY,GOLD],depth:1});const lines=E.font.wrap(line,Math.min(344,r.W-50));for(let i=0;i<lines.length;i++)text(g,lines[i],cx,yy+43+i*13,IVORY,{align:'center'});
    drawFrontButtons(g);
  });
}
function buildStoryButtons(ending){const data=ending?ENDING:PROLOGUE,index=ending?W.endingPage:prologuePage,cx=game.W/2;frontButtons=[];frontButton(index<data.length-1?'NEXT VERSE':'RING OUT',cx-84,game.H-50,168,24,()=>advanceStory(ending));frontButton(ending?'FINISH THE VERSE':'SKIP THE VERSE',cx-84,game.H-20,168,14,()=>{if(ending){W.endingPage=ENDING.length;finishEnding();}else game.go('play');});}
function advanceStory(ending){if(ending){W.endingPage++;W.endingT=0;if(W.endingPage>=ENDING.length){finishEnding();return;}audio.speak(W.endingPage===2?'Mother Quillon':'Narrator',ENDING[W.endingPage][1]);}else{prologuePage++;if(prologuePage>=PROLOGUE.length){game.go('play');return;}audio.speak('Narrator',PROLOGUE[prologuePage][1]);}audio.bell(130+prologuePage*12,.12);}
function finishEnding(){W.flags.push('endingSeen');W.ended=false;saveGame();game.go('epilogue');}
function updateStory(dt,ending){buildStoryButtons(ending);titleClock+=dt;if(ending)W.endingT+=dt;frontStep();if(game.input.pressed('cancel')){if(ending)finishEnding();else game.go('play');}}
function updateEpilogue(){frontButtons=[];const x=game.W/2,y=game.H/2+12;frontButton('THE LONG VIGIL',x-100,y,200,25,()=>{startVigil(W,1);game.go('play');});frontButton('RETURN TO KNELLWICK',x-100,y+32,200,25,()=>{enterZone(W,'town');game.go('play');});frontButton('ABOUT AND CREDITS',x-100,y+64,200,23,()=>openPanel('about'));if(PANEL_STATE)updatePanel(1/120);else frontStep();}
function drawEpilogue(r){drawTitleBackdrop(r);r.overlay(g=>{px.blend(g,.84,'normal',()=>px.rect(g,0,0,r.W,r.H,INK));E.font.title(g,'THE BOOK IS ASH',r.W/2,r.H/2-58,{align:'center',scale:3,colors:[IVORY,GOLD],depth:2});text(g,'The watch is yours to keep.',r.W/2,r.H/2-21,TEAL,{align:'center'});drawFrontButtons(g);if(PANEL_STATE)drawPanel(g,r);});}
function startAttract(){
  if(net)return;attract=true;PANEL_STATE=null;attractClock=0;attractIndex=0;loadVignette();game.go('play',null,{fade:.2});
}
function loadVignette(){
  const vignette=ATTRACT[attractIndex%ATTRACT.length];viewRigs.clear();W=newWorld(7129+attractIndex);W.attract=true;W.progress=Math.max(0,CAMPAIGN.findIndex(q=>q.zone===vignette.zone));W.flags=['quillonRescued'];W.heroes=Object.keys(DB.hero).map((kind,i)=>{const h=newHero(kind,i,24);h.bot=true;h.unlockedAll=true;h.slots=[...DB.hero[kind].skills.slice(0,5),DB.hero[kind].skills[7]];const relic=rollItem(W,h,{rarity:4,relic:Object.values(DB.relic).find(r=>r.hero===kind).id});relic.identified=true;h.gear[relic.slot]=relic;return h;});W.me=Object.keys(DB.hero).indexOf(vignette.hero);W.cheats={god:true,infinite:true,noCD:true,bot:true};enterZone(W,vignette.zone);
  if(!['town','chapterhouse','mothcourt','chamber'].includes(vignette.zone)){const h=getMain();for(let i=0;i<30;i++){const a=i/30*Math.PI*2;spawnFoe(W,DB.zone[vignette.zone].pool[0],h.x+Math.cos(a)*(45+i%3*9),h.y+Math.sin(a)*(45+i%3*9));}dropItem(W,h,h.x+35,h.y,{rarity:4});}
  attractClock=0;game.cam.snap=true;
}
function updateAttract(dt){
  attractClock+=dt;const vignette=ATTRACT[attractIndex%ATTRACT.length];if(attractClock>vignette.seconds){attractIndex=(attractIndex+1)%ATTRACT.length;loadVignette();}
  if(attractClock>7&&attractClock<7+dt*2){const f=W.foes.find(f=>f.boss);if(f){f.hp=f.maxHp*.45;f.phase=1;}}
  if((attractIndex===3||attractIndex===6)&&attractClock>=8&&attractClock<11&&!W.uiShown){
    W.uiShown=true;const h=getMain();if(attractIndex===3){const item=rollItem(W,h,{rarity:4,relic:'firstSoil'});item.identified=true;h.bag.push(item);openPanel('inventory',h.id);}else{h.tones[h.slots[5]]=1;openPanel('skills',h.id);PANEL_STATE.slot=5;PANEL_STATE.skill=7;buildPanel();}
  }
  if(W.uiShown&&PANEL_STATE&&attractClock>=11){const h=getMain();if(h.bag.length)equipItem(W,h,h.bag.at(-1));PANEL_STATE=null;}
  if(vignette.zone==='town')for(let i=0;i<W.heroes.length;i++){const h=W.heroes[i];h.x+=Math.sin(W.time*.4+i)*dt*15;h.y+=Math.cos(W.time*.4+i)*dt*15;}
  stepWorld(W,dt);updateVisuals(dt);focusParty();
}
function drawAttractOverlay(g,r){const v=ATTRACT[attractIndex%ATTRACT.length];smallBox(g,14,14,128,20,GOLD);text(g,TITLE.toUpperCase()+' • DEMONSTRATION',20,21,GOLD);const yy=r.H-75;smallBox(g,r.W/2-148,yy,296,24,TEAL);text(g,'PRESS ANY BUTTON TO TAKE THE WATCH',r.W/2,yy+9,IVORY,{align:'center'});text(g,v.title,r.W/2,50,IVORY,{align:'center'});}
function startGallery(mode=null,id=null,phase=0){
  galleryReturn=W;W=newWorld(721);W.gallery=true;W.progress=3;W.heroes=[newHero('ringer',0,30)];W.heroes[0].unlockedAll=true;W.flags=['quillonRescued'];W.cheats={god:true,infinite:true,noCD:true,freezeAI:true};enterZone(W,'nave');W.foes=[];W.heroes[0].x=W.width*.5;W.heroes[0].y=W.height*.5;galleryClock=0;galleryStep=0;viewRigs.clear();game.go('gallery',null,{fade:.1});if(mode==='skill'&&DB.skill[id])galleryStep=Object.keys(DB.skill).indexOf(id)*3+phase%3;galleryNext();if(mode==='monster'&&DB.monster[id]){W.foes=[];const h=getMain();spawnFoe(W,id,h.x+45,h.y);W.galleryLabel=DB.monster[id].name;}if(mode==='boss'&&DB.boss[id]){W.foes=[];const h=getMain(),f=spawnFoe(W,id,h.x+80,h.y,{boss:true});f.phase=phase%DB.boss[id].phases.length;f.hp=f.maxHp*DB.boss[id].phases[f.phase].at;W.galleryLabel=DB.boss[id].name+' • phase '+(f.phase+1);bossPattern(W,f,h);}
}
function galleryNext(){
  const skills=Object.values(DB.skill),index=Math.floor(galleryStep/3)%skills.length,s=skills[index],tone=galleryStep%3,old=getMain(),h=newHero(s.hero,0,30);h.unlockedAll=true;h.x=old.x;h.y=old.y;h.tones[s.id]=tone;h.resource=100;W.heroes=[h];W.foes=[];W.corpses=[];W.hazards=[];W.shots=[];
  const kinds=Object.keys(DB.monster);for(let i=0;i<10;i++){const f=spawnFoe(W,kinds[(galleryStep+i)%kinds.length],h.x+45+(i%3)*20,h.y-25+Math.floor(i/3)*20,{elite:i===0?'rare':null});if(i===0)f.affixes=[Object.keys(DB.affix)[galleryStep%12]];}
  if(s.verb==='corpse')for(let i=0;i<3;i++){const b=new E.Body({x:h.x+55+i*9,y:h.y});Object.assign(b,{age:0,id:W.uid++,used:false,kind:'digger'});W.corpses.push(b);}
  castSkill(W,h,s.id,{x:h.x+70,y:h.y},true);W.galleryLabel=DB.hero[s.hero].title+' • '+s.name+' / '+s.tones[tone].name;
  if(galleryStep%9===8){const boss=Object.keys(DB.boss)[Math.floor(galleryStep/9)%6],f=spawnFoe(W,boss,h.x+100,h.y-40,{boss:true});f.phase=Math.floor(galleryStep/(9*6))%DB.boss[boss].phases.length;f.hp=f.maxHp*DB.boss[boss].phases[f.phase].at;bossPattern(W,f,h);W.galleryLabel=DB.boss[boss].name+' • phase '+(f.phase+1);}
}
function updateGallery(dt){const before=galleryClock;galleryClock+=dt;stepWorld(W,dt);if(Math.floor(galleryClock/.85)!==Math.floor(before/.85)){const boss=W.foes.find(f=>f.boss);if(boss)bossPattern(W,boss,getMain());}updateVisuals(dt);focusParty();if(galleryClock>5||game.input.pressed('next')){galleryClock=0;galleryStep++;galleryNext();}if(game.input.pressed('prev')){galleryClock=0;galleryStep=Math.max(0,galleryStep-1);galleryNext();}if(game.input.pressed('cancel')){W=galleryReturn||W;viewRigs.clear();game.go('play');}}


const CONTROL_NAMES={s0:'Primary skill / click to move',s1:'Skill 2',s2:'Skill 3',s3:'Skill 4',s4:'Skill 5',s5:'Skill 6',evade:'Evade',potion:'Potion',interact:'Interact / hold to revive',portal:'Passing Bell',inventory:'Inventory',skills:'Skills and Tones',journal:'Journal',map:'Map',stand:'Stand and attack',labels:'Show loot',aimU:false,aimD:false,aimL:false,aimR:false,prev:'Previous tab',next:'Next tab',attack:false,jump:false,dash:false,skill:false};
function pausePanel(id){game.resume();openPanel(id,getMain()?.id||0);}
game=new E.Game({canvas:'screen',res:[480,270],expand:true,view:'iso',views:['iso'],bg:INK,touch:'never',input:PLAY,live:SESSION,autoPause:!SESSION,draw:true,
  menu:{quit:SESSION?false:'title',controls:CONTROL_NAMES,saves:SESSION?false:{slots:3,version:2,migrate:migrateSave},items:SESSION?[]:[['Inventory',()=>pausePanel('inventory')],['Skills',()=>pausePanel('skills')],['Journal',()=>pausePanel('journal')],['Dev Mode',()=>pausePanel('dev')],['About and Credits',()=>pausePanel('about')],['Leave couch co-op',()=>leaveCouch()]],
    settings:[{key:'music',value:.1},{key:'glyphs',value:'playstation',options:[['playstation','PlayStation'],['xbox','Xbox (A B X Y)']]},
      {key:'voices',label:'Voices',type:'slider',value:.75,min:0,max:1,step:.05,group:'Sound',apply:(g,v)=>{g.audio.voiceVolume=v;g.audio.applyVolume();}},
      {key:'blood',label:'Blood',value:'red',options:[['red','Red'],['wax','Wax'],['none','None']]},
      {key:'aimAssist',label:'Aim assist',value:'high',options:[['off','Off'],['low','Low'],['high','High']]},
      {key:'numbers',label:'Damage numbers',value:true},{key:'lootLabels',label:'Loot labels',value:'near',options:[['near','Nearby and Relics'],['all','All']]},
      {key:'holdAttack',label:'Hold to attack',value:true}]
  }});
shell=new E.Shell(game,{theme:{ink:IVORY,paper:INK,accent:TEAL,muted:MUTED,danger:'#d9857a',line:'#53676a',font:'Georgia, serif',titleFont:'Georgia, serif'}});
talk=new E.Dialog(game,{width:330,lines:2,speed:45,bg:PANEL,border:'#54716c',nameColor:TEAL,voice:false});
game.particles.max=3000;
const nativeFreeze=game.freeze.bind(game),nativeShake=game.shake.bind(game);
game.freeze=s=>{if(game.real-lastHitStop>=.1){lastHitStop=game.real;nativeFreeze(s*TUNE.hitstop);}};
game.shake=s=>nativeShake(s*TUNE.shake);
function fitShell(){if(!HAS_DOM)return;document.querySelectorAll('.esh').forEach(el=>{el.style.zoom=Math.max(1,Math.min(innerHeight/540,innerWidth/880));});}
function focusParty(){if(!W?.heroes.length)return;const local=W.heroes.filter(h=>!h.follower);if(local.length>1){game.cam.frame(local,{margin:65,zoom:[.7,1]});}else{game.cam.frame(null);const h=getMain();game.focus(h.x,h.y,18);const crowded=W.foes.filter(f=>dist(f,h)<150).length>=12||W.foes.some(f=>f.boss);game.setZoom(E.approach(game.zoom,crowded?.88:1,.01));}}
function configureZone(){
  if(!W)return;const z=DB.zone[W.zone],t=THEMES[z.theme];viewRigs.clear();talk.close();game.cam.bounds=v=>W.map.bounds(v);game.cam.snap=true;game.cam.offset=[0,-10];game.lights.enabled=true;game.lights.ambient=t.ambient;
  game.weather=t.weather?{kind:t.weather,amount:t.weather==='rain'?.45:.65,wind:.2,lightning:W.zone==='town'?.06:0}:null;audio.setCue(W.zone==='vigil'?'vigil':t.music);focusParty();
  if(W!==null&&!attract&&!net){const q=CAMPAIGN[W.progress];if(q&&q.zone===W.zone)say(q.line,q.speaker||'Mother Quillon');if(z.tip)toast(z.tip);}
}
function newCampaign(kind='ringer',seed=null){
  const chosen=seed??(HAS_DOM?(new URLSearchParams(location.search).get('seed')||Date.now()%1000000):1711);W=newWorld(chosen);W.heroes=[newHero(kind)];W.me=0;const h=getMain();h.gear[0]=rollItem(W,h,{slot:0,rarity:1});h.gear[2]=rollItem(W,h,{slot:2,rarity:1});h.pennies=40;attract=false;viewRigs.clear();enterZone(W,'prologue');return W;
}
function saveGame(slot='auto'){if(!W||attract||SESSION||W.gallery)return false;return game.saves.save(slot,{data:serializeWorld(W),place:DB.zone[W.zone].name,level:getMain().level});}
function loadSaved(){const latest=game.saves.latest();if(latest){game.saves.load(latest.slot);game.go('play');}}
game.saves.version=2;game.saves.migrate=migrateSave;game.saves.write=()=>W&&!attract&&!SESSION?{data:serializeWorld(W),place:DB.zone[W.zone].name,level:getMain()?.level||1}:null;
game.saves.read=save=>{W=loadWorld(save.data);viewRigs.clear();attract=false;configureZone();};
let lastSoundHit=0,lastBark=0,lastSaveTime=0;
function onWorldEvent(e){
  if(!game)return;
  if(net&&W?.authority&&!net.ended&&['spawn','kill','hit','fx','cast','drop','phase','taunt','notice','level','chord','bossDeath','warden','blessing','hazard','allySpawn','allyEnd'].includes(e.kind))net.events.push(e);
  if(net?.info.server)return;
  if(e.kind==='zone'){configureZone();if(!SESSION&&!attract&&game.scenes)saveGame();}
  if(e.kind==='hit'){
    game.hitFx(e.x,e.y,(e.z||0)+14,{power:e.crit?1.3:.35,angle:e.angle,color:ELEMENT[e.element]||GOLD,sound:false,rumble:false});
    if(game.real-lastSoundHit>.04){audio.sound('hit',e.crit?1.4:.8);lastSoundHit=game.real;}
    const id=e.source??e.id,hero=W?.heroes.find(h=>h.id===id),ii=hero&&game.players[W.heroes.filter(h=>!h.follower).indexOf(hero)];if(ii?.lastDevice==='gamepad')ii.rumble(e.crit?.5:.25,.09);
    viewRigs.get(e.id)?.rig.kick?.(.3);
  }
  if(e.kind==='cast'){
    audio.sound('swing');if(net&&!W.authority&&e.id===net.info.me)queueCommand({action:'skill',slot:e.sid,aim:e.aim});
    if(game.real-lastBark>12){const h=W.heroes.find(h=>h.id===e.id);if(h){lastBark=game.real;say(choose(W.rng,DB.hero[h.kind].barks),DB.hero[h.kind].name,2.6);}}
  }
  if(e.kind==='kill'){game.particles.bits(e.x,e.y,12,e.kindName==='digger'?10:5,e.kindName==='husk'?['#c4c7b5','#d9ddcb']:['#968c74','#6f6d58']);game.particles.dust(e.x,e.y,0,3);}
  if(e.kind==='break'){game.particles.bits(e.x,e.y,6,14,['#817058','#ae9874','#4a4842']);audio.sound('break');}
  if(e.kind==='drop'&&e.item.rarity>=4){audio.sound('relic');toast('★  '+RARITY[e.item.rarity].name.toUpperCase()+' FOUND',RARITY[e.item.rarity].color);if(!attract&&!W.flags.includes('bookBurned'))say('A fine Relic. The saint was shorter than you.');}
  if(e.kind==='pickup'){if(e.type==='penny')audio.sound('penny');if(e.type==='votive')audio.sound('heal');if(e.type==='item'){toast(itemName(e.item)+' • '+prompt('inventory')+' to inspect',RARITY[e.item.rarity].color);audio.bell(e.item.rarity>=3?330:460,.08);}}
  if(e.kind==='equip')viewRigs.delete(e.id);
  if(e.kind==='consecrate'){audio.sound(e.rarity>=4?'relic':'level');toast('The offering is Consecrated.');}
  if(e.kind==='level'){audio.sound('level');game.particles.ring(e.x,e.y,8,70,GOLD,1);toast('LEVEL '+e.level+' • '+(e.level===3?'Tones awaken. '+prompt('skills')+' to tune your build.':'A new verse in an unwritten life.'));}
  if(e.kind==='notice')toast(e.text);
  if(e.kind==='dialogue'||e.kind==='taunt')say(e.text,e.speaker);
  if(e.kind==='rung'){toast('RUNG × '+e.count,GOLD);audio.bell(110,.2);game.shake(4);}
  if(e.kind==='phase'){game.shake(5);audio.bell(78,.25);const f=W.foes.find(f=>f.id===e.id);if(f)say(DB.boss[f.kind].taunts[Math.min(DB.boss[f.kind].taunts.length-1,e.phase*3)],DB.boss[f.kind].name);}
  if(e.kind==='bossDeath'){
    audio.sound('relic');game.particles.explosion(getMain().x,getMain().y,20,3,{freeze:false,shake:4});toast('THE PARISH IS FREE TO PASS',GOLD);
    if(e.kindName==='regent')say('Five names on that page. Yours. And mine. I tore them out.');
    if(!SESSION&&!attract)saveGame();
  }
  if(e.kind==='evade'){audio.sound('evade');if(net&&!W.authority&&e.id===net.info.me)queueCommand({action:'evade',dir:getMain().dodgeDir});}
  if(e.kind==='potion'){audio.sound('heal');if(net&&!W.authority&&e.id===net.info.me)queueCommand({action:'potion'});}
  if(e.kind==='portal'||e.kind==='vigilStart')audio.sound('portal');
  if(e.kind==='heroDeath'){audio.sound('death');nativeFreeze(.12);}
  if(e.kind==='chord')audio.tone('choir',330,.5,.09);
  if(e.kind==='objective'){audio.bell(190,.17);toast(e.type==='chapel'?'SIDE CHAPEL LIT • '+e.count+'/2':e.type==='sluice'?'BRONZE SLUICE OPEN • '+e.count+'/3':'The pilgrims are safe.');}
  if(e.kind==='pour'){game.shake(6);say('The Bell is recast. The moths are coming.');audio.tone('noise',190,.9,.2);}
  if(e.kind==='ending'){audio.setCue('ending');audio.speak('Narrator',ENDING[0][1]);game.go('ending',null,{fade:.5});}
  if(e.kind==='warden'){toast('THE WARDEN HAS COME',GOLD);audio.sound('relic');}
}
function assistedAim(w,h,dir){
  const facing=Math.hypot(...dir)>.15?Math.atan2(dir[1],dir[0]):h.facing;
  if(game.settings.aimAssist==='off')return {x:h.x+Math.cos(facing)*100,y:h.y+Math.sin(facing)*100};
  let best=null,score=Infinity;for(const f of w.foes)if(f.alive){const d=dist(h,f),a=Math.abs(adiff(angle(h,f),facing)),cone=game.settings.aimAssist==='low'?.65:.9*TUNE.assist;if(d<180&&a<cone){const s=d+a*80-(f.elite?12:0);if(s<score){score=s;best=f;}}}
  return best||{x:h.x+Math.cos(facing)*100,y:h.y+Math.sin(facing)*100};
}
function localInput(w,h,I){
  const screenMove=I.move(),move=game.view.screenDirToGround(screenMove[0],screenMove[1]);let dir=move,aim=assistedAim(w,h,dir);
  const pointer=I.pointer(),mouse=I.lastDevice!=='gamepad'&&I.aimSource==='mouse',ground=game.mouseGround();
  let hover=null;if(pointer&&game.r)hover=game.r.pick(pointer[0],pointer[1]).find(o=>o?.team==='foe'||o?.type||o?.breakable)||null;
  if(h.id===w.me)currentHover=hover;
  const out={moveDir:dir,aim,slots:Array(6).fill(false),potion:I.pressed('potion'),portal:I.pressed('portal'),interact:I.pressed('interact'),rise:I.down('confirm')||I.down('interact'),riseAtGate:I.down('portal')};
  const usable=nearestUsable(w,h);if(usable&&(usable.team==='hero'||usable.type==='tongue'))out.interact=I.down('interact');
  if(net&&!w.authority&&out.interact&&w.time>(h.netInteractAt||0)){h.netInteractAt=w.time+.17;queueCommand({action:'interact'});}
  if(!w.session){for(const [a,panel]of [['inventory','inventory'],['skills','skills'],['journal','journal'],['map','map']])if(I.pressed(a)){openPanel(panel,h.id);return {};}}
  const right=[I.value('aimR')-I.value('aimL'),I.value('aimD')-I.value('aimU')],rm=Math.hypot(...right);
  out.evade=I.pressed('evade')||(rm>.7&&!(h.rightHeld));h.rightHeld=rm>.4;
  if(rm>.4)out.evadeDir=game.view.screenDirToGround(...right);
  for(let i=0;i<6;i++){out.slots[i]=(game.settings.holdAttack&&I.down('s'+i))||I.buffered('s'+i,.2);if(out.slots[i])I.consume('s'+i);}
  if(mouse&&ground){
    out.aim=hover?.team==='foe'?hover:{x:ground[0],y:ground[1]};
    if(I.down('s0')){
      if(hover?.team==='foe'||hover?.breakable){
        out.aim=hover;const s=tunedSkill(h,h.slots[0]),range=s?.range||s?.radius||30;
        if(dist(h,hover)>range&&!I.down('stand')){h.walkTarget={x:hover.x,y:hover.y,...(hover.breakable?{propId:hover.id}:{targetId:hover.id})};out.slots[0]=false;}else{h.walkTarget=null;out.slots[0]=true;}
      }else if(hover?.type&&!I.down('stand')){h.walkTarget={x:hover.x,y:hover.y,objectId:hover.id};out.slots[0]=false;}
      else if(!I.down('stand')){h.walkTarget={x:ground[0],y:ground[1]};out.slots[0]=false;}
    }
  }
  if(Math.hypot(...move)>.1)h.walkTarget=null;
  if(h.walkTarget){const target=h.walkTarget.targetId?w.foes.find(f=>f.id===h.walkTarget.targetId):h.walkTarget.propId?w.props.find(p=>p.id===h.walkTarget.propId&&!p.broken):h.walkTarget;if(!target||dist(h,target)<9)h.walkTarget=null;else{
    dir=norm(target.x-h.x,target.y-h.y);out.moveDir=dir;if((h.walkTarget.targetId||h.walkTarget.propId)&&dist(h,target)<(tunedSkill(h,h.slots[0])?.range||35)){out.slots[0]=true;out.moveDir=[0,0];out.aim=target;}
    if(h.walkTarget?.objectId&&dist(h,target)<33){out.interact=true;out.target=w.objects.find(o=>o.id===h.walkTarget.objectId)||w.drops.find(o=>o.id===h.walkTarget.objectId);h.walkTarget=null;out.moveDir=[0,0];}
  }}
  return out;
}
function updatePlay(dt){
  if(!W)return;if(net?.ended)return;if(net&&!net.started){updateVisuals(dt);return;}
  if(attract){updateAttract(dt);return;}
  if(PANEL_STATE){updatePanel(dt);updateVisuals(dt);return;}
  const inputs={};for(let i=0;i<W.heroes.length;i++){const h=W.heroes[i];if(h.follower||h.bot||h.remote)continue;const ii=W.session?game.input:game.players[W.heroes.filter(u=>!u.follower).indexOf(h)]||game.input;inputs[h.id]=localInput(W,h,ii);}
  if(PANEL_STATE)return;
  W.cheats.bot=CHEATS.bot;
  if(!CHEATS.stop)stepWorld(W,dt,inputs);
  if(W.activeEvent){const o=W.activeEvent;o.eventLeft-=dt;if(o.eventLeft<=0){const success=o.type==='unquiet'||W.kills-o.eventKills>=20;if(success){for(const h of W.heroes)for(let i=0;i<(o.type==='cursed'?2:1);i++)dropItem(W,h,o.x+i*8,o.y,{rarity:3});toast('THE PARISH HAS KEPT ITS WORD.');}else toast('The reliquary closes its eye.');W.activeEvent=null;}}
  const h=getMain();if(h?.alive&&h.buffs.conduit>0){h.conduitT=(h.conduitT||0)-dt;if(h.conduitT<0){h.conduitT=.4;const f=closest(W.foes,h,120,u=>u.alive);if(f){dealDamage(W,f,{src:h,amount:damageBase(h)*5,element:'lightning'});fx(W,'chain',{x:h.x,y:h.y,z:17,to:{x:f.x,y:f.y,z:17},color:'#c6bafb'});}}}
  if(h?.buffs.channel>0){h.resource=h.resourceMax;for(const k of Object.keys(h.cooldowns))h.cooldowns[k]=Math.max(0,h.cooldowns[k]-dt*3);}
  if(h&&!h.alive&&h.deathTimer<=0&&(game.input.pressed('confirm')||game.input.pressed('interact'))){reviveHero(W,h);}
  if(h&&!h.alive&&game.input.pressed('portal')){h.x=W.respawn.x;h.y=W.respawn.y;reviveHero(W,h);}
  if(!SESSION&&W.time-lastSaveTime>30){lastSaveTime=W.time;saveGame();}
  if(!W.flags.includes('bookBurned')&&W.zoneTime>20&&Math.floor(W.zoneTime/70)>Math.floor((W.zoneTime-dt)/70)&&!W.dialogue)say(QUILLON[Math.floor(W.rng()*QUILLON.length)]);
  if(W.ended&&W.results&&!SESSION){saveGame();game.go('results');}
  if(!net?.info.server){updateVisuals(dt);talk.update(dt);focusParty();}
}
function drawPlay(r){
  if(net?.info.server){r.sky(['#0d1c24','#172d32']);r.text(TITLE.toUpperCase()+' • WORLD HOST',r.W/2,r.H/2-20,GOLD,{align:'center'});r.text((W?.foes.length||0)+' foes • '+Math.floor(W?.reckoning||0)+'% Reckoning',r.W/2,r.H/2,TEAL,{align:'center'});return;}
  drawWorld(r);if(talk.open&&!PANEL_STATE&&!attract)talk.draw(r);if(PANEL_STATE)r.overlay(g=>drawPanel(g,r));
  if(attract)r.overlay(g=>drawAttractOverlay(g,r));
  const h=getMain();if(h&&!h.alive&&!PANEL_STATE&&!net)r.overlay(g=>{const cx=r.W/2,cy=r.H/2;ornate(g,cx-151,cy-40,302,91,TEAL);text(g,'YOUR NAME IS NOT IN THE BOOK.',cx,cy-24,GOLD,{align:'center'});text(g,'Get up.',cx,cy-10,IVORY,{align:'center',scale:2});text(g,h.deathTimer>0?'RISE IN '+Math.ceil(h.deathTimer)+' SECONDS':prompt('confirm')+' RISE HERE',cx,cy+13,IVORY,{align:'center'});text(g,prompt('portal')+' RISE AT THE LYCHGATE',cx,cy+31,MUTED,{align:'center'});});
}
function updateResults(){const h=getMain(),res=W.results;frontButtons=[];const x=game.W/2,y=game.H/2+22;frontButton('RING AGAIN • TIER '+(W.tier+1),x-110,y,220,25,()=>{startVigil(W,W.tier+1,W.greater);game.go('play');});frontButton('RETURN TO KNELLWICK',x-110,y+33,220,25,()=>{enterZone(W,'town');game.go('play');});frontStep();}
function drawResults(r){drawWorld(r,W,{hud:false});r.overlay(g=>{px.blend(g,.85,'normal',()=>px.rect(g,0,0,r.W,r.H,INK));const res=W.results,cx=r.W/2;E.font.title(g,res?.won?'THE WATCH IS KEPT':'THE BELL FALLS SILENT',cx,r.H/2-82,{align:'center',scale:2,colors:[IVORY,GOLD],depth:1});text(g,'TIER '+W.tier+'  •  '+Math.floor((res?.time||0)/60)+'m '+Math.floor((res?.time||0)%60)+'s',cx,r.H/2-49,TEAL,{align:'center'});text(g,(res?.kills||0)+' DEAD  •  '+(res?.deaths||0)+' DEATHS  •  '+W.bestRequiem+' BEST REQUIEM',cx,r.H/2-27,IVORY,{align:'center'});drawFrontButtons(g);});}
function rescaleParty(before,after){const ratio=(1+Math.max(0,after-1)*TUNE.coopLife)/(1+Math.max(0,before-1)*TUNE.coopLife);for(const f of W.foes){f.maxHp*=ratio;f.hp*=ratio;}}
function leaveCouch(){if(!W||SESSION)return;const local=W.heroes.filter(h=>!h.follower);if(local.length<=1){toast('Only one controller is in the parish.');return;}const seat=game.pausedBy>1?game.pausedBy-1:local.length-1,last=local[seat],input=game.players[seat];W.heroes=W.heroes.filter(h=>h.id!==last.id);(W.couchReserve||=[]).push(last);game.removePlayer(input);rescaleParty(local.length,local.length-1);game.resume();saveGame();toast(last.name+' left the watch.');}
game.allowJoin({max:4,keys:false,onJoin:(I,n)=>{
  if(SESSION||!W||attract){if(game.sceneName==='title'||game.sceneName==='muster'){newCampaign();game.go('play');}else return;}
  const index=game.players.indexOf(I),id=[1,2,3].find(id=>!W.heroes.some(h=>h.id===id)),main=getMain();if(W.heroes.length>=4){const f=W.heroes.find(h=>h.follower);if(f)W.heroes.splice(W.heroes.indexOf(f),1);}
  if(id===undefined)return;const stored=(W.couchReserve||[]).find(h=>h.id===id);if(stored)W.couchReserve.splice(W.couchReserve.indexOf(stored),1);const h=stored||newHero(Object.keys(DB.hero)[id%4],id,main.level,COLORS[index]);h.color=COLORS[index];h.x=main.x+15;h.y=main.y;if(!h.gear[0])h.gear[0]=rollItem(W,h,{slot:0,rarity:2});const before=W.heroes.filter(u=>!u.follower).length;W.heroes.push(h);rescaleParty(before,before+1);I.use(PLAY);if(stored)toast(h.name+' returned to the watch.');else openPanel('join',h.id);
}});
const scenes={
 sessionLoading:{pausable:false,update(){},draw(r){r.sky(['#09121c','#172d32']);r.text('THE PARISH IS GATHERING',r.W/2,r.H/2,GOLD,{align:'center'});}},
 title:{enter:setupTitle,update:updateTitle,draw:drawTitle,input:MENU,pausable:false},
 muster:{enter(){frontFocus=1;titleIdle=0;},update:updateMuster,draw:drawMuster,input:MENU,pausable:false},
 prologue:{enter(){prologuePage=0;frontFocus=0;audio.speak('Narrator',PROLOGUE[0][1]);},update:dt=>updateStory(dt,false),draw:r=>drawStory(r,false),input:MENU,pausable:false},
 play:{pausable:true,view:'iso',input:PLAY,propSize:1.3,camera:{zoom:[.7,1.5],start:1,rotate:false,wheel:false},enter:configureZone,update:updatePlay,draw:drawPlay,back(){if(PANEL_STATE){closePanel();return true;}return false;}},
 ending:{pausable:false,enter(){game.cam.frame(null);audio.setCue('ending');frontFocus=0;},update:dt=>updateStory(dt,true),draw:r=>drawStory(r,true),input:MENU},
 epilogue:{pausable:false,update:updateEpilogue,draw:drawEpilogue,input:MENU},
 results:{pausable:true,enter(){frontFocus=0;audio.setCue('ending');},update:updateResults,draw:drawResults,input:MENU},
 gallery:{pausable:true,enter:configureZone,update:updateGallery,draw(r){drawWorld(r);r.overlay(g=>{smallBox(g,r.W/2-190,48,380,29,TEAL);text(g,W.galleryLabel,r.W/2,54,GOLD,{align:'center'});text(g,prompt('prev')+' / '+prompt('next')+' PREVIEW   '+prompt('cancel')+' RETURN',r.W/2,66,IVORY,{align:'center'});});},input:MENU}
};
game.hook('input',dt=>{
  const g=game;if(net?.ended){for(const I of g.players)I.clear();return;}
  for(const [I,guard]of RESUME_GUARDS){for(const action of [...guard])if(I.down(action))I.suppress(action);else guard.delete(action);if(!guard.size)RESUME_GUARDS.delete(I);}
  const inMenu=!!PANEL_STATE||['title','muster','prologue','ending','epilogue','results','gallery'].includes(g.sceneName)||g.paused||!!g.shell?.screen;
  for(const I of g.players)if(I.preset!==(inMenu?MENU:PLAY))I.use(inMenu?MENU:PLAY);
  if(!net&&!attract&&!PANEL_STATE&&g.sceneName==='play'&&!g.paused&&!g.shell?.screen){
    for(const h of W?.heroes||[]){if(h.remote||h.follower)continue;const I=g.players[W.heroes.filter(u=>!u.follower).indexOf(h)]||g.input;
      for(const [action,panel] of [['inventory','inventory'],['skills','skills'],['journal','journal'],['map','map']])if(I.pressed(action)){openPanel(panel,h.id);break;}
      if(PANEL_STATE)break;
    }
  }
  if(PANEL_STATE){const I=g.players.find(i=>i.player===(W?.heroes.findIndex(h=>h.id===PANEL_STATE.owner)+1))||g.input;if(I.pressed('cancel')||I.pressed('pause')){closePanel();I.suppress('pause');I.suppress('cancel');I.consumeAll();}}
  if(HAS_DOM&&!net){for(const p of navigator.getGamepads?.()||[])if(p&&(p.buttons.some(b=>b.pressed)||p.axes.some(a=>Math.abs(a)>.28))){activity();break;}}
  if(!HAS_DOM&&g.input.anyPressed())lastActivity=g.real;
  if(!net&&!attract&&!PANEL_STATE&&!g.paused&&!g.shell?.screen&&['title','muster'].includes(g.sceneName)&&nowInput()-lastActivity>=10)startAttract();
  networkStep();audio.update();fitShell();
});
if(HAS_DOM){for(const name of ['keydown','mousemove','mousedown','wheel'])window.addEventListener(name,activity,{passive:true});window.addEventListener('touchstart',()=>{lastTouchAt=nowInput();},{passive:true});window.addEventListener('resize',()=>{fitShell();if(PANEL_STATE)buildPanel();});}
game.debug={
  snapshot:()=>({title:TITLE,scene:game.sceneName,zone:W?.zone||null,quest:W?.progress??null,flags:W?.flags||[],heroes:W?.heroes.map(h=>({id:h.id,kind:h.kind,x:Math.round(h.x*10)/10,y:Math.round(h.y*10)/10,hp:Math.round(h.hp),level:h.level,resource:Math.round(h.resource),bag:h.bag.length,alive:h.alive}))||[],foes:W?.foes.length||0,kills:W?.kills||0,reckoning:W?.reckoning||0,attract,attractIndex,session:!!net,authority:W?.authority,device:game.input.lastDevice,tuned:isTuned(),panel:PANEL_STATE?.kind||null,errors:game.errors.length}),
  teleport(x,y){const h=getMain();if(h){h.x=x;h.y=y;h.vx=h.vy=0;game.cam.snap=true;}},
  travel(id){if(!W)newCampaign();enterZone(W,id);game.go('play',null,{fade:0});},
  bot(on=true){CHEATS.bot=on;},newHero:newCampaign,openPanel,closePanel,
};
ROOT.__diabellum={game,talk,stat,DB,TUNE,DEFAULTS,TUNING,CHEATS,ABOUT,VERSION,newWorld,newHero,enterZone,stepWorld,spawnFoe,castSkill,tunedSkill,dealDamage,killFoe,rollItem,dropItem,equipItem,consecrate,salvage,craft,buy,sell,redip,socketGem,extractRelic,gainXP,xpNext,damageBase,serializeWorld,loadWorld,migrateSave,interactNearest,questTarget,objectiveReady,botInput,evade,usePotion,reviveHero,startVigil,passingBell,beginEnding,applyAffix,bossPattern,fx,synthVoice,VOICES,audio,openPanel,closePanel,startAttract,startGallery,updateAttract,ATTRACT,CAMPAIGN,PROLOGUE,ENDING,
  get world(){return W;},set world(v){W=v;},get panel(){return PANEL_STATE;},get net(){return net;},get attract(){return attract;},get frontButtons(){return frontButtons;},render:drawWorld,updateVisuals};
ROOT.__game={game,scenes};
game.start({scenes,scene:SESSION?'sessionLoading':'title'});fitShell();
if(SESSION)connectHub().catch(err=>{ROOT.AIHub.fail(String(err));game.fail('hub',err);});
else if(HAS_DOM){const bits=location.hash.slice(1).split('/'),[mode,id,phase]=bits;
  if(mode==='about')openPanel('about');
  if(mode==='attract')startAttract();
  if(mode==='gallery')startGallery(id,phase,Number(bits[3])||0);
  if(mode==='zone'||mode==='boss'||mode==='vigil'){
    const kind='ringer';newCampaign(kind);getMain().level=mode==='zone'?(DB.zone[id]?.level||1):22;getMain().unlockedAll=true;
    const zoneId=mode==='vigil'?'vigil':mode==='boss'?({beadle:'chapterhouse',regent:'mothcourt',angelus:'chamber'})[id]||'vigil':id;
    if(DB.zone[zoneId]){W.progress=Math.max(0,CAMPAIGN.findIndex(q=>q.zone===zoneId));enterZone(W,zoneId);if(mode==='vigil')W.tier=Number(id)||1;if(mode==='boss'){const f=W.foes.find(f=>f.boss);if(f){f.phase=clamp(Number(phase)||0,0,DB.boss[f.kind].phases.length-1);f.hp=f.maxHp*DB.boss[f.kind].phases[f.phase].at;}}game.go('play',null,{fade:0});}
  }
}

})();
/* GAME END */
