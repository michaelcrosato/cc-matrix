// Characters, monsters, quests and their words. "Chapter One: A Stitch in Time".
(() => {
const DQ = globalThis.DQ;

// ---------------- RESIDENTS AND VOICES ----------------
// voice: base Hz, range, wave, formant factor, speed (letters/s), vibrato
DQ.NPCS = {
  granny: { name: 'Granny Gossamer', voice: { f: 165, range: .25, wave: 'triangle', formant: .9, speed: 34, vib: [5, .03] }, gold: true },
  wren: { name: 'Wren Tuck', job: 'gatherer', favourite: 'bedroom', size: .85, rig: { hair: 'ponytail', outfit: 'shirt', colors: { hair: '#e07a2a', cloth: '#5aa04a', pants: '#5a4a3a', skin: '#f6cba4' } }, voice: { f: 330, range: .35, wave: 'pulse', formant: 1.25, speed: 52 }, style: 'bouncy', fight: { kind: 'sling', dmg: 4, range: 6, cool: 1.2 } },
  mortimer: { name: 'Mortimer Bodkin', job: 'guard', favourite: 'guardPost', size: 1.05, build: 'bulky', rig: { hair: 'bald', hat: 'helmet', outfit: 'coat', armor: true, colors: { cloth: '#6a6a78', coat: '#6a6a78', plate: '#9a9aaa', skin: '#e8b890', hair: '#e8e8e8' } }, weapon: 'club', voice: { f: 110, range: .15, wave: 'sawtooth', formant: .8, speed: 30 }, style: 'ready', fight: { kind: 'club', dmg: 8, range: 1.5, cool: 1 } },
  marigold: { name: 'Marigold Purl', job: 'cook', favourite: 'kitchen', size: 1, rig: { hair: 'long', hat: { style: 'cap', color: '#ffffff' }, outfit: 'robe', colors: { hair: '#f0d070', cloth: '#e8a0a0', trim: '#ffffff', skin: '#f6cba4' } }, voice: { f: 240, range: .3, wave: 'triangle', formant: 1.1, speed: 44 }, style: 'hips', fight: { kind: 'pie', dmg: 5, range: 6, cool: 1.6 } },
  professor: { name: 'Prof. Selvage', job: 'helper', favourite: 'workshop', size: 1.05, build: 'heroic', rig: { hair: 'short', hat: 'pointed', outfit: 'robe', colors: { hair: '#a8a8b0', cloth: '#3a6a5a', hat: '#2a4a3a', skin: '#ecc4a0' } }, voice: { f: 200, range: .2, wave: 'pulse12', formant: 1.15, speed: 50 }, style: 'lean', fight: { kind: 'hide' } },
  lintwick: { name: 'Lintwick', job: 'fluff', favourite: 'bedroomFelt', blob: true, voice: { f: 520, range: .4, wave: 'sine', formant: 1.4, speed: 48, chirp: true }, style: 'hop', fight: { kind: 'roll', dmg: 3, range: 1.2, cool: 1.4 } },
  gnarlgrim: { name: 'Gnarlgrim', voice: { f: 70, range: .1, wave: 'sawtooth', formant: .7, speed: 26, drive: true } },
  buttonsworth: { name: 'Sir Buttonsworth', voice: { f: 90, range: .12, wave: 'square', formant: .75, speed: 30 } },
  frayvern: { name: 'Frayvern', voice: { f: 55, range: .08, wave: 'sawtooth', formant: .6, speed: 22, echo: true } },
  sign: { name: 'Signpost', voice: null }
};

// idle lines by resident: each entry [condition key or null, text]
DQ.IDLE = {
  wren: [
    [null, 'Granny says people used to sleep on things called "beds". Do they bite?'],
    [null, "I'm gonna learn bildering too! Watch! ...Nope. Nothing. Hmph."],
    ['night', 'Lock the doors! Lintlings get bouncy at night.'],
    ['morning', "Good morning! I put stuff in the chest! Stuff! You're welcome!"],
    ['hungry', 'You look peckish, Builder. Eat a berry! Eat TWO!'],
    ['lv3', 'The town is getting SO big. Bigger than my whole imagination!'],
    ['bedroom', "My bed is the best bed. I've checked. Twice. Every night."],
    ['nobed', "Sleeping on the ground again... It's lumpy. Lumpy and sad."]
  ],
  mortimer: [
    [null, 'In my day we slept on rocks, and we were GRATEFUL for the rocks.'],
    [null, 'A club is just a stick with ambition.'],
    ['night', "Hmph. Night watch. Somebody's got to do it, and it's always me."],
    ['hungry', "You're looking thin, Builder. Can't fight on an empty belly."],
    ['lv3', "...Not bad, Builder. Not bad at all. Don't let it go to your head."],
    ['guardPost', 'A proper Guard Post. I could almost smile. Almost.'],
    ['morning', 'Up with the sun. As a guard should be. Hmph.']
  ],
  marigold: [
    [null, "If you can stitch it, I can stew it. That's my motto. Well, one of them."],
    [null, "Lintwick keeps eating the dough. I've told him. He just blinks at me."],
    ['kitchen', 'A KITCHEN! A real one! Oh, I could weep into the soup. I might!'],
    ['night', "Supper's done and the pots are scrubbed. Off to bed with you!"],
    ['hungry', "Oh, you poor thing, you're starving! Find a Hearth Pot and cook something!"],
    ['evening', 'Supper is on! Wash your paws, Lintwick.']
  ],
  professor: [
    [null, 'A functioning door! Do you realise nobody has hinged anything in forty years?'],
    [null, 'The Knack, you see, is not stolen. It is merely... misplaced. In a dragon.'],
    ['night', 'The stars are stitched on, did you know? One can see the knots.'],
    ['hall', "Our Hall! I shall write a monograph. It will be very long. Nobody will read it."],
    ['lv4', 'Fascinating. Each room you build, the Banner glows a little brighter.']
  ],
  lintwick: [
    [null, 'Lintwick not bad monster! Lintwick just fuzzy!'],
    [null, 'Lintwick want bed. Soft bed. Lintwick will not shed on it. ...Much.'],
    ['night', 'Dark! Lintwick sleep in cosy felt room. Fluff fluff.'],
    ['happy', 'Lintwick happy! Lintwick do dance! Wiggle wiggle!']
  ]
};

// ---------------- MONSTERS ----------------
DQ.MONSTERS = {
  lintling: { name: 'Lintling', body: 'blob', R: 6, col: '#b8b4c0', hp: 8, atk: 4, def: 1, speed: 34, aggro: 7, move: 'lunge', wind: .35, drops: [['lint', 1, 1], ['cotton', 1, .15]], fuzz: true, flee: .2 },
  dyedLintling: { name: 'Dyed Lintling', body: 'blob', R: 6, col: '#e88ab8', hp: 16, atk: 7, def: 2, speed: 38, aggro: 8, move: 'double', wind: .3, drops: [['lint', 1, 1], ['dyeRed', 1, .25]], fuzz: true },
  mothlet: { name: 'Mothlet', body: 'blob', R: 5, col: '#9a88b8', hp: 10, atk: 6, def: 1, speed: 48, aggro: 10, move: 'swoop', wind: .4, drops: [['mothDust', 1, 1]], wings: true, fly: true, night: true },
  pinhog: { name: 'Pinhog', body: 'blob', R: 7, col: '#a87a5a', hp: 22, atk: 9, def: 5, speed: 30, aggro: 8, move: 'roll', wind: .6, drops: [['pins', 1, .8], ['pebble', 1, .3]], pins: true },
  frayedKnight: { name: 'Frayed Knight', body: 'humanoid', size: 1.1, build: 'heroic', col: '#e8dcc0', hp: 40, atk: 12, def: 8, speed: 40, aggro: 9, move: 'thrust', wind: .3, drops: [['steelThread', 1, .7], ['frayedScrap', 1, .5]] },
  knotbrute: { name: 'Knotbrute', body: 'humanoid', size: 1.4, build: 'bulky', col: '#2a2a48', hp: 60, atk: 14, def: 6, speed: 26, aggro: 10, move: 'haymaker', wind: .45, drops: [['blackYarn', 1, 1]], blockDmg: 25 },
  buttonGolem: { name: 'Sir Buttonsworth', body: 'humanoid', size: 2, build: 'bulky', col: '#c8a878', hp: 220, atk: 14, def: 8, speed: 30, aggro: 30, boss: true, drops: [['goldenNeedle', 1, 1], ['steelThread', 3, 1]], blockDmg: 40 },
  gnarlgrim: { name: 'Gnarlgrim the Knotted', body: 'humanoid', size: 2.6, build: 'bulky', col: '#2a1a3a', hp: 600, atk: 18, def: 25, speed: 34, aggro: 60, boss: true, drops: [], blockDmg: 60 }
};
DQ.SIEGE_WAVES = [
  [['lintling', 8, 'east'], ['dyedLintling', 3, 'east']],
  [['lintling', 6, 'east'], ['pinhog', 4, 'north'], ['mothlet', 3, 'north']],
  [['lintling', 4, 'east'], ['frayedKnight', 4, 'rift'], ['knotbrute', 3, 'rift']]
];

// ---------------- QUESTS ----------------
// steps: { text, done: condition, mark: a marker target }. start: when it becomes available (a giver gets "!")
DQ.QUESTS = [
  { id: 'm1', title: 'Come Undone', giver: 'granny', auto: true, steps: [
    { text: 'Look around: walk with {btn:move}, turn the camera with {btn:camera}, and hop onto the ledge with {btn:jump}', done: { at: 'hollowLedge', radius: 1.2 }, mark: 'hollowLedge' },
    { text: 'Break 3 Corduroy Earth with {btn:swing}', done: { have: { earth: 3 } }, mark: 'nearestEarth' },
    { text: 'Defeat the Lintling', done: { killed: { lintling: 1 } }, mark: 'lintling' },
    { text: 'Craft a Wick Torch from your Satchel ({btn:satchel}, Pocket Notions)', done: { crafted: 'torch' } },
    { text: 'Light the dark tunnel: place the torch at the marked spot with {btn:place}', done: { placed: 'torch', at: 'tunnelMark', radius: 1.5 }, mark: 'tunnelMark' },
    { text: 'Climb out of the Hollow', done: { at: 'hollowExit', radius: 2.5 }, mark: 'hollowExit' }
  ], reward: { items: { banner: 1 }, flags: { hasBanner: true } }, next: 'm2' },
  { id: 'm2', title: 'Plant the Banner', giver: 'granny', auto: true, steps: [
    { text: 'Reach the ruins of Thimbleton (follow the marker)', done: { at: 'bannerSpot', radius: 4 }, mark: 'bannerSpot' },
    { text: 'Plant the Banner of Mending: select it and press {btn:place}', done: { flag: 'bannerPlanted' }, mark: 'bannerSpot' }
  ], reward: { cheer: 0 }, next: 'm3' },
  { id: 'm3', title: "Wren's Bed", giver: 'wren', steps: [
    { text: 'Gather 4 Straw from straw tufts', done: { have: { straw: 4 } }, mark: 'plant:tuft' },
    { text: 'Gather 1 Cotton Puff', done: { have: { cotton: 1 } }, mark: 'plant:cottonPuff' },
    { text: 'Make a Mending Bench (Pocket Notions) and place it in town', done: { placed: 'bench' } },
    { text: 'Craft a Straw Bed and a Lattice Door at the Mending Bench', done: { crafted: ['strawBed', 'latticeDoor'] }, mark: 'obj:bench' },
    { text: 'Build a Bedroom: walls 2 blocks high, a door, the bed and a torch inside', done: { room: 'bedroom' } }
  ], reward: { cheer: 10, notions: ['chest'] }, next: 'm4',
    intro: ['Whoa! Are you a monster? You don\'t LOOK like a monster. Monsters don\'t usually wave.', "I'm Wren! I followed the light! Granny says you can make... things?", 'Could you make me a BED? I have never slept in one. Not even once!'],
    outro: ["It's... a BED. I'm going to sleep in it for a hundred years!", 'You MADE that? With your hands? On PURPOSE?!'] },
  { id: 'm4', title: 'A Place to Make Things', giver: 'wren', steps: [
    { text: 'Craft a Storage Chest at the Mending Bench', done: { crafted: 'chest' } },
    { text: 'Build a Workshop: a room with the Mending Bench and a chest', done: { room: 'workshop' } }
  ], reward: { cheer: 10 }, next: 'm5',
    intro: ['Ooh, what if you had a special room just for making things?', 'With a chest for all your stuff! A bildering room!'],
    outro: ['A Workshop! It smells like sawdust and big ideas!'] },
  { id: 'm5', title: 'Club Med', giver: 'mortimer', start: { level: 2 }, steps: [
    { text: 'Gather 3 Pebbles from Button Gravel in the Crags', done: { have: { pebble: 3 } }, mark: 'block:gravel' },
    { text: 'Craft a Cobble Club at the Mending Bench', done: { crafted: 'cobbleClub' } },
    { text: 'Show the club to Mortimer', done: { talk: 'mortimer' }, mark: 'npc:mortimer' }
  ], reward: { cheer: 10, items: { heartpatch: 1 }, flags: { spin: true } }, next: 'm6',
    intro: ['Hmph. Another dreamer. Name\'s Mortimer. I guard things.', 'That twig you swing is a disgrace. Stone laughs at it.', 'Fetch some pebbles from the Crags and make yourself a proper club.'],
    outro: ['...Not bad. Now watch closely. Hold your swing, let it build, then LET IT GO.', 'That\'s the Spin Stitch. Use it when they crowd you. Here, take this Heartpatch too.'] },
  { id: 'm6', title: 'Guard Duty', giver: 'mortimer', steps: [
    { text: 'Build a Guard Post: a room with a Weapon Rack and 2 lights', done: { room: 'guardPost' } }
  ], reward: { cheer: 15 }, next: 'm7', notionsStart: ['weaponRack'],
    intro: ['A town needs a Guard Post. Somewhere to stand and frown at the dark.', 'Build me a room with a Weapon Rack and two lights. Bright ones.'],
    outro: ['Hmph. A proper Guard Post. I\'ll take the night watch from here.'] },
  { id: 'm7', title: 'Supper Time', giver: 'wren', steps: [
    { text: 'Build a Mess Hall: a room with a Plank Table and 2 Stools', done: { room: 'messHall' } }
  ], reward: { cheer: 10 }, next: 'm8',
    intro: ['Mortimer says we should eat together. At a TABLE. Like fancy people!', 'Can you build a Mess Hall? A table and two stools! Maybe more stools!'],
    outro: ['We have a TABLE! Now we just need... food. Hmm.'] },
  { id: 'm8', title: 'Hearth and Home', giver: 'marigold', start: { level: 3 }, notionsStart: ['hearthPot'], steps: [
    { text: 'Mine 4 Tweed Stone and 1 Charcloth with the club', done: { have: { stone: 4, coal: 1 } }, mark: 'block:coal' },
    { text: 'Craft a Hearth Pot at the Mending Bench', done: { crafted: 'hearthPot' } },
    { text: 'Build a Kitchen: a room with the Hearth Pot and a chest', done: { room: 'kitchen' } },
    { text: 'Bring Marigold 2 Puffballs from Tweedwood', done: { have: { puffball: 2 }, talk: 'marigold' }, mark: 'plant:puffballPlant' }
  ], reward: { cheer: 15, items: { heartpatch: 1 }, notions: ['stew'] }, next: 'm9', take: { puffball: 2 },
    intro: ['Is that a TABLE? I could weep! I\'m Marigold. I cook. Or I would, if...', "I've got Glen Stew in my head and not a single pot to stew it in! It's a crock, I tell you. A CROCK!", 'Build me a Hearth Pot and a Kitchen, and bring me two Puffballs from Tweedwood!'],
    outro: ['Puffballs! Perfect! Now, a pinch of this, a dash of that...', 'Glen Stew, as I live and breathe! Here, learn the recipe. And take this Heartpatch, dear.'] },
  { id: 'm9', title: 'Copper Bottomed', giver: 'mortimer', notionsStart: ['forge'], steps: [
    { text: 'Craft a Thimble Forge at the Mending Bench', done: { crafted: 'forge' } },
    { text: 'Build a Smithy: a room with the Forge and a chest', done: { room: 'smithy' } },
    { text: 'Smelt 2 Copper Ingots at the Forge', done: { crafted: { copperIngot: 2 } }, mark: 'block:copperOre' },
    { text: 'Forge a Copper Bodkin', done: { crafted: 'copperBodkin' } }
  ], reward: { cheer: 20 }, next: 'm10',
    intro: ['Clubs are fine for lintballs. For knights you want METAL.', 'Build a Thimble Forge and a Smithy. Then smelt some copper.'],
    outro: ['Now THAT is a weapon. My knees feel safer already.'] },
  { id: 'm10', title: "The Quilters' Hall", giver: 'professor', start: { level: 4 }, steps: [
    { text: "Place the Hall Pattern inside the town (use it from the hotbar)", done: { flag: 'hallPlaced' }, mark: 'hallSite' },
    { text: 'Make a chest the Town Chest so residents can help (talk to a chest in town)', done: { flag: 'townChest' } },
    { text: 'Complete the Pattern (fill the Town Chest with Cobble, Planks and Felt)', done: { pattern: 'hall' }, mark: 'pattern' }
  ], reward: { cheer: 100, items: { heartpatch: 1 }, notions: ['ballista'] }, next: 'm11', give: { hallPattern: 1 },
    intro: ['Fascinating! A functioning door! I am Professor Hemsley Selvage, scholar of the Knack.', 'I bring a Pattern: the old Quilters\' Hall. A schematic of considerable grandeur.', '...And considerable lumber. Lay it out in town. We shall all help!'],
    outro: ['Our Hall! Look, the old margins of the Pattern have writing on them...', '"The Golden Thread fragment lies atop the Knotted Spire, past the Knot Wall."', '"Only a Seam Ripper can cut a Black Knot. And the only Golden Needle left is fastened to Sir Buttonsworth\'s chest."'] },
  { id: 'm11', title: 'Needle in a Haystack', giver: 'professor', steps: [
    { text: 'Go to the Button Quarry in the Crags', done: { at: 'quarryFloor', radius: 6 }, mark: 'quarryFloor' },
    { text: 'Defeat Sir Buttonsworth', done: { boss: 'buttonGolem' }, mark: 'quarryFloor' },
    { text: 'Forge the Seam Ripper (Steel Thread from Frayed Knights or the Golem)', done: { crafted: 'seamRipper' } }
  ], reward: { cheer: 20 }, next: 'm12',
    intro: ['Sir Buttonsworth guards the Button Quarry, north-west in the Crags.', 'He is pompous, enormous and buttoned up tight. Do be careful.'],
    outro: ['The Seam Ripper! It hums when it is near a knot. Splendid!'] },
  { id: 'm12', title: 'Rip It Up', giver: 'professor', auto: true, steps: [
    { text: 'Cut through the Knot Gate with the Seam Ripper (south-east, past the Frayed Verge)', done: { flag: 'gateCut' }, mark: 'gate' },
    { text: 'Climb the Knotted Spire', done: { at: 'spireTop', radius: 2.5 }, mark: 'spireTop' },
    { text: 'Take the Golden Thread fragment', done: { have: { goldenThread: 1 } }, mark: 'spireTop' }
  ], reward: { cheer: 0 }, next: 'm13',
    intro: ['The Knot Wall stands south-east, beyond the Frayed Verge. Use the Bobbin Portals!', 'Cut the gate, climb the Spire, and bring back the Golden Thread.'] },
  { id: 'm13', title: 'Hold the Line', giver: 'mortimer', auto: true, steps: [
    { text: 'Hurry back to Thimbleton (use a Bobbin Portal)', done: { at: 'bannerSpot', radius: 12 }, mark: 'bannerSpot' },
    { text: 'Talk to Mortimer when you are ready for the siege', done: { flag: 'siegeStarted' }, mark: 'npc:mortimer' },
    { text: 'Survive 3 waves and protect the Banner', done: { flag: 'siegeDone' } }
  ], reward: { cheer: 0 }, next: 'm14' },
  { id: 'm14', title: 'Gnarlgrim the Knotted', giver: 'mortimer', auto: true, steps: [
    { text: 'Defeat Gnarlgrim: man a Ballista ({btn:interact}) to Tangle him, then strike his Heart Knot', done: { boss: 'gnarlgrim' } }
  ], reward: { cheer: 150 }, next: null },
  // side quests
  { id: 's1', title: "Lintwick's Lament", giver: 'lintwickSign', side: true, start: { level: 2 }, steps: [
    { text: 'Break the Knot Cage at the Lint Camp in Tweedwood (needs a Cobble Club)', done: { flag: 'lintwickFreed' }, mark: 'lintCamp' },
    { text: 'Bring Lintwick home to Thimbleton', done: { at: 'bannerSpot', radius: 10, flag: 'lintwickHome' }, mark: 'bannerSpot' },
    { text: 'Build Lintwick a Bedroom with a Felt block in its walls', done: { room: 'bedroom', felt: true } }
  ], reward: { cheer: 20, flags: { lintGifts: true } },
    outro: ['Lintwick have bed! Felt bed! Lintwick so happy Lintwick could pop!'] },
  { id: 's2', title: 'Bluebell Blues', giver: 'wren', side: true, start: { level: 3 }, steps: [
    { text: 'Craft 4 Blue Felt Patches (Bluebell Dye from bluebells in Tweedwood)', done: { crafted: { feltBlue: 4 } }, mark: 'plant:bluebell' },
    { text: 'Place 8 Blue Felt blocks inside the town border', done: { placedInTown: { feltBlue: 8 } } }
  ], reward: { cheer: 15 },
    intro: ['Everything is green and brown and grey. I want something BLUE!', 'Can you make blue felt and put it all over town? Eight blocks! Please?'],
    outro: ["It's like the sky came down to visit!"] },
  { id: 's3', title: 'Buttons of Old', giver: 'professor', side: true, start: { level: 4 }, steps: [
    { text: 'Find 3 Ancient Buttons: the Coast shipwreck, a Crags ledge, a hollow tree in Tweedwood', done: { have: { ancientButton: 3 } }, mark: 'buttons' }
  ], reward: { cheer: 30, items: { goldenThimble: 1 }, notions: ['gildedFelt'] },
    intro: ['Legend speaks of three Ancient Buttons, from when the realm was first fastened.', 'One in a shipwreck on the Coast, one on a ledge in the Crags, one in a hollow tree in Tweedwood.'],
    outro: ['Remarkable! Take this Golden Thimble. It teaches the secret of Gilded Felt!'] }
];
DQ.quest = id => DQ.QUESTS.find(q => q.id === id);

// story lines for cutscenes and system moments
DQ.LINES = {
  intro: ['Long ago, Granny Gossamer stitched the Patchwork Realm from a thousand scraps of light.', 'Its people had the Knack: whatever they dreamed, their hands could make.', 'Then came Frayvern, the Unraveller. He pulled the Golden Thread from the heart of the world, and swallowed every last bit of Knack.', 'Now the realm frays at its edges... and nobody remembers how to make a bed.'],
  wake: ['Wakey wakey, dearie! Oh good, you\'re not a pincushion. I\'d hate to have stitched you together for nothing.', 'Frayvern pulled the Golden Thread right out of the world, and everything came apart at the seams. Worse, he swallowed everyone\'s Knack! Not a soul can make so much as a potholder.', "But you still have the Knack. You're a Builder, dearie! Have a little look around, would you?"],
  ledge: ['Ooh, nimble! Now, give that brown cord a good whack. Earth makes everything!'],
  lintling: ['A Lintling bounces into view! Shoo it off, dearie!'],
  lint: ["Lint! Fluffy, flammable... Wait, I feel a notion coming on! Check your Satchel's Pocket Notions."],
  torch: ['Place it right there by that dark tunnel. A little light goes a long way.'],
  lit: ['See? Darkness is only the absence of a good torch.'],
  exit: ['Look at it all, dearie. The Gingham Glen... and the poor frayed edges.', 'Plant this where Thimbleton used to be, dearie. Folks will come. They always come for a light.'],
  planted: ['Thimbleton has been founded! Oh, I could knit a scarf of joy!', 'Inside the stitched border, folks will feel safe. Build them rooms, dearie: walls two blocks high, a door and a light.', "And here's a notion: a Mending Bench. Make it from your Pocket Notions. And a Lattice Door, while I think of it!"],
  night: ['Monsters get bolder after dark, dearie. A lit room is a safe room!'],
  ko: ["Oh, dearie, you've come undone! Let me stitch you back together..."],
  notbedtime: ["It's not bedtime yet!"],
  monstersNear: ["You can't sleep with monsters about!"],
  buttonsIntro: ['HALT! None shall pass without a proper fastening!', 'I am Sir Buttonsworth, Keeper of the Quarry, Fastener of Fates!'],
  buttonsDefeat: ['Unbuttoned... by a commoner... how... casual...'],
  gate: ['The Seam Ripper sings! The knots are coming undone!'],
  thread: ['The Golden Thread! It\'s warm, dearie. Like a cup of tea in your hand.'],
  frayvern: ['Mend all the patches you like, Builder. I hold the Golden Thread, and the whole quilt is mine to pull.'],
  roar: ["Hurry home, dearie, they're going after Thimbleton!"],
  siegeAsk: ['There you are, Builder! The Knotted army is massing at the Rift.', 'Build Ballistas and Pin Traps. When you are ready, say the word.'],
  siegeGo: ['Then let them come! Everyone, to your posts!'],
  siegeWait: ['Hmph. Prepare, then. But do not dawdle.'],
  gnarlIntro: ['YOU! The needle in my side! I\'ll tie you in knots, little Builder!'],
  gnarlHint: ['Normal hits barely scratch him! Use the Ballistas, Builder! Tangle him up!'],
  gnarlDefeat: ["I'm... unravelling...!"],
  finale: ['You did it, my little stitch. One patch mended... and a great many to go.'],
  lintwickCage: ['Help! Lintwick stuck! Lintwick not bad monster! Lintwick just fuzzy!'],
  lintwickFree: ['Free! Lintwick free! Lintwick follow you home! Lintwick good helper!']
};
})();
