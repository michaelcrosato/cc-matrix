// Data: "Chapter One: A Stitch in Time". Quests (main M1-M14, side S1-S3): giver, when it is offered, steps (each a
// condition the director checks on events), objective targets, rewards, and the lines (warm, punny, earnest; the Builder
// never speaks, only chooses). Conditions: have, crafted, placed, room, level, talk, killed, at, pattern, flag,
// siegeDone, boss, placedInTown.
(() => {
const DQ = globalThis.DQ;
DQ.PROLOGUE = [
  'Long ago, Granny Gossamer stitched the Patchwork Realm from a thousand scraps of light.',
  'Its people had the Knack: whatever they dreamed, their hands could make.',
  'Then came Frayvern, the Unraveller. He pulled the Golden Thread from the heart of the world, and swallowed every last bit of Knack.',
  'Now the realm frays at its edges... and nobody remembers how to make a bed.'
];
const Q = DQ.QUESTS = {};
const q = (id, o) => { Q[id] = Object.assign({ id, main: id[0] === 'M', reward: {} }, o); };
q('M1', { title: 'Come Undone', giver: 'granny', auto: true,
  steps: [
    { text: 'Look around the Hollow (try a jump onto the ledge)', done: { at: 'hollowLedge', radius: 1.6, level: 8 }, target: { poi: 'hollowLedge' }, tutorial: 'move' },
    { text: 'Break 3 Corduroy Earth blocks', done: { have: { earth: 3 } }, target: { block: 'earth' }, tutorial: 'break', hint: ['See those brown blocks, dearie? Give them a whack with your Darning Stick!'] },
    { text: 'Defeat the Lintling', done: { killed: { lintling: 1 } }, target: { monster: 'lintling' }, start: 'hollowLintling', tutorial: 'fight', hint: ['Oh! A Lintling! Bop it before it fluffs you!'] },
    { text: 'Craft a Wick Torch from your Bag (Pocket Notions)', done: { crafted: 'torch' }, tutorial: 'craft', hint: ['Lint and a branch make a lovely torch. Open your Bag and look in Pocket Notions!', 'Branches grow on those dead bushes, dearie.'] },
    { text: 'Light the dark tunnel: place the torch at the mark', done: { flag: 'tunnelLit' }, target: { poi: 'tunnelMark' }, tutorial: 'place', hint: ['That tunnel is darker than a pocket. Pop your torch on the glowing mark!'] },
    { text: 'Climb out of the Hollow', done: { at: 'hollowExit', radius: 2.5 }, target: { poi: 'hollowExit' } }
  ],
  reward: { items: { banner: 1 } }, doneScene: 'reveal' });
q('M2', { title: 'Plant the Banner', giver: 'granny', auto: true, after: 'M1',
  steps: [
    { text: 'Reach the ruins of Thimbleton', done: { at: 'bannerSpot', radius: 4 }, target: { poi: 'bannerSpot' }, hint: ['Head down to the old ruins, dearie. Follow the marker!'] },
    { text: 'Plant the Banner of Mending on the plaza (select it and use it)', done: { flag: 'bannerPlanted' }, target: { poi: 'bannerSpot' }, tutorial: 'banner', hint: ['Hold up the Banner and plant it right in the middle of the old plaza!'] }
  ], reward: {} });
q('M3', { title: 'Wren\'s Bed', giver: 'wren', after: 'M2',
  offer: ['Builder! Builder! Granny says you know how to make a BED.', 'I\'ve never seen one. Is it like a big flat sheep? Will you make me one? Please please please?'],
  steps: [
    { text: 'Gather 4 Straw from grass tufts', done: { have: { straw: 4 } }, target: { plant: 'tuft' } },
    { text: 'Gather 1 Cotton Puff', done: { have: { cotton: 1 } }, target: { plant: 'cottonPuff' } },
    { text: 'Make and place a Mending Bench (Pocket Notions)', done: { placed: 'bench' }, hint: ['A Builder needs a bench, dearie. Branches and earth will do. Look in your Pocket Notions!'] },
    { text: 'Craft a Straw Bed and a Lattice Door at the Bench', done: { crafted: ['strawBed', 'latticeDoor'] } },
    { text: 'Build a Bedroom: walls 2 high, a door, the bed and a light inside', done: { room: 'bedroom' }, tutorial: 'room', hint: ['A room needs walls two blocks high all round, a door, and a light. Pop the bed inside and it\'s a Bedroom!', 'The old cobble outlines make a fine start. Stack one more layer on top!'] }
  ],
  done: ['It\'s... a BED. I\'m going to sleep in it for a hundred years!', 'Thank you, Builder! You\'re the best Builder in the whole world. You\'re the ONLY one, but still!'],
  reward: { cheer: 10, notions: ['chest'] } });
q('M4', { title: 'A Place to Make Things', giver: 'wren', after: 'M3',
  offer: ['Builder, where do you keep all your bildering stuff? In your pockets?', 'Granny says Builders need a WORKSHOP. A room with a bench and a chest in it! Can you make one?'],
  steps: [
    { text: 'Craft a Storage Chest at the Bench (logs come from trees)', done: { crafted: 'chest' }, target: { block: 'log' } },
    { text: 'Build a Workshop: a room with a Mending Bench and a chest', done: { room: 'workshop' } }
  ],
  done: ['A WORKSHOP! It even smells like making things. Like sawdust and ideas!'], reward: { cheer: 10 } });
q('M5', { title: 'Club Med', giver: 'mortimer', after: 'M4', needNpc: 'mortimer',
  offer: ['Hmph. You call that a weapon? It\'s a sewing needle.', 'Fetch me 3 Pebbles from the Corduroy Crags and I\'ll show you what a real club is for.', 'Gravel heaps are full of them. Off you go.'],
  steps: [
    { text: 'Gather 3 Pebbles from gravel in the Crags', done: { have: { pebble: 3 } }, target: { block: 'gravel' } },
    { text: 'Craft a Cobble Club at the Bench', done: { crafted: 'cobbleClub' } },
    { text: 'Show the club to Mortimer', done: { talk: 'mortimer' }, target: { npc: 'mortimer' } }
  ],
  done: ['...That is a club. A fine club. A club with AMBITION.', 'Now watch. Hold your swing, let it build... and SPIN. We called it the Spin Stitch, back in my day.'],
  reward: { cheer: 10, items: { heartpatch: 1 }, flags: { spinStitch: true } }, doneScene: 'spinDemo' });
q('M6', { title: 'Guard Duty', giver: 'mortimer', after: 'M5',
  offer: ['A town needs a guard. A guard needs a post. A post needs a weapon rack, and two good lights.', 'I\'ll not stand at a tree all night like some kind of owl.'],
  start: { notions: ['weaponRack'] },
  steps: [ { text: 'Build a Guard Post: a room with a Weapon Rack and 2 lights', done: { room: 'guardPost' } } ],
  done: ['Hmph. A proper Guard Post. I\'ll stand watch at night now. You can sleep, Builder.', 'Well. Sleep a bit.'], reward: { cheer: 15 } });
q('M7', { title: 'Supper Time', giver: 'mortimer', after: 'M6',
  offer: ['Wren keeps eating her supper off my helmet. We need a table, Builder.', 'A Mess Hall: a table and two stools, in a proper room.'],
  steps: [ { text: 'Build a Mess Hall: a room with a Plank Table and 2 Stools', done: { room: 'messHall' } } ],
  done: ['A table. With legs! In my day tables were just the floor, but higher.'], reward: { cheer: 10 } });
q('M8', { title: 'Hearth and Home', giver: 'marigold', after: 'M7', needNpc: 'marigold',
  offer: ['Builder! I need a pot. A hearth! A KITCHEN!', 'Get me some Tweed Stone and a lump of Charcloth from the Crags and we\'ll make a Hearth Pot. Your club can crack stone now!'],
  start: { notions: ['hearthPot'] },
  steps: [
    { text: 'Mine 4 Tweed Stone and 1 Charcloth (needs the Cobble Club)', done: { have: { stone: 4, coal: 1 } }, target: { block: 'coal' } },
    { text: 'Craft a Hearth Pot at the Bench', done: { crafted: 'hearthPot' } },
    { text: 'Build a Kitchen: a room with the Hearth Pot and a chest', done: { room: 'kitchen' } },
    { text: 'Bring Marigold 2 Puffballs from Tweedwood', done: { have: { puffball: 2 }, talk: 'marigold' }, target: { plant: 'puffball' }, take: { puffball: 2 } }
  ],
  done: ['Puffballs! Oh, they\'re perfect. Like little clouds that want to be soup.', 'Here, I\'ll teach you my Glen Stew. And take this, I found it in the old pantry!'],
  reward: { cheer: 15, items: { heartpatch: 1 }, notions: ['stew'], flags: { marigoldCooks: true } } });
q('M9', { title: 'Copper Bottomed', giver: 'mortimer', after: 'M8',
  offer: ['That Knot army won\'t be stopped by sticks and stones, Builder.', 'We need copper. A forge! There\'s copper sequins in the Crags, and Charcloth to melt it.'],
  start: { notions: ['forge'] },
  steps: [
    { text: 'Craft a Thimble Forge at the Bench', done: { crafted: 'forge' } },
    { text: 'Build a Smithy: a room with the Forge and a chest', done: { room: 'smithy' } },
    { text: 'Smelt 2 Copper Ingots at the Forge', done: { crafted: { copperIngot: 2 } }, target: { block: 'copperOre' } },
    { text: 'Forge a Copper Bodkin', done: { crafted: 'copperBodkin' } }
  ],
  done: ['Now THAT\'S a blade. Sharp enough to split a hair. Not mine, I haven\'t any.'], reward: { cheer: 20 } });
q('M10', { title: 'The Quilters\' Hall', giver: 'professor', after: 'M9', needNpc: 'professor',
  offer: ['This Pattern, Builder, is the Quilters\' Hall. Long ago, the whole town met beneath its roof.', 'Lay it out inside the town, NE of the Banner, I would suggest. Mark a chest as the Town Chest and we residents can help you fill it in!'],
  start: { items: { hallPattern: 1 } },
  steps: [
    { text: 'Lay out the Hall Pattern inside the town (use the Pattern scroll)', done: { flag: 'hallPlaced' }, target: { poi: 'hallSite' } },
    { text: 'Make a chest the Town Chest, so residents can help', done: { flag: 'townChest' }, hint: ['Open any chest inside the town and choose "Make this the Town Chest". Then put building blocks in it!'] },
    { text: 'Complete the Quilters\' Hall Pattern', done: { pattern: 'hall' } }
  ],
  done: ['Fascinating! It\'s even grander than the margins promised.', 'And look here, in the margins... "The Golden Thread fragment lies atop the Knotted Spire, past the Knot Wall."', '"Only a Seam Ripper can cut a Black Knot. And the only Golden Needle left is fastened to Sir Buttonsworth\'s chest." Oh dear.'],
  reward: { cheer: 40, items: { heartpatch: 1 }, notions: ['ballista'] }, doneScene: 'hallReveal' });
q('M11', { title: 'Needle in a Haystack', giver: 'professor', after: 'M10',
  offer: ['Sir Buttonsworth guards the Button Quarry, up in the Crags. He is a golem of buttons. Very proud. Very... fastened.', 'Take his Golden Needle and forge a Seam Ripper. You will need Steel Thread too: he has some, and the Frayed Knights carry it.'],
  steps: [
    { text: 'Go to the Button Quarry in the Crags', done: { at: 'quarryFloor', radius: 6 }, target: { poi: 'quarryFloor' } },
    { text: 'Defeat Sir Buttonsworth', done: { boss: 'buttonGolem' }, start: 'buttonsworth' },
    { text: 'Forge the Seam Ripper (Golden Needle, 2 Copper Ingots, 2 Steel Thread)', done: { crafted: 'seamRipper' } }
  ],
  done: ['A Seam Ripper! Now no knot in the realm can hold against you.'], reward: { cheer: 20 } });
q('M12', { title: 'Rip It Up', giver: 'professor', after: 'M11',
  offer: ['The Knot Wall lies south-east, past the Frayed Verge. There is a Gate in it, a tangle of Black Knots.', 'Rip it open, climb the Knotted Spire, and bring back the Golden Thread. Do be careful. It is very... frayed out there.'],
  steps: [
    { text: 'Cut through the Knot Gate with the Seam Ripper', done: { flag: 'gateCut' }, target: { poi: 'knotGate' } },
    { text: 'Climb the Knotted Spire', done: { at: 'spireTop', radius: 3, level: 22 }, target: { poi: 'spireTop' } },
    { text: 'Take the Golden Thread fragment', done: { have: { goldenThread: 1 } }, target: { poi: 'spireTop' } }
  ],
  reward: {}, doneScene: 'threadTaken', autoDone: true });
q('M13', { title: 'Hold the Line', giver: 'mortimer', after: 'M12', auto: true,
  steps: [
    { text: 'Hurry back to Thimbleton (Bobbin Portals help!)', done: { at: 'bannerSpot', radius: 12 }, target: { poi: 'bannerSpot' } },
    { text: 'Talk to Mortimer when you\'re ready for the siege', done: { flag: 'siegeStarted' }, target: { npc: 'mortimer' }, hint: ['Build Ballistas at the Forge and set Pin Traps, dearie. Then talk to Mortimer.'] },
    { text: 'Survive the three waves of the Knotted army', done: { siegeDone: true } }
  ], reward: { cheer: 30 }, autoDone: true });
q('M14', { title: 'Gnarlgrim the Knotted', giver: 'granny', after: 'M13', auto: true,
  steps: [ { text: 'Defeat Gnarlgrim! Tangle him with manned Ballistas, then strike!', done: { boss: 'gnarlgrim' } } ],
  reward: {}, doneScene: 'finale', autoDone: true });
q('S1', { title: 'Lintwick\'s Lament', giver: 'lintwick', side: true, minLevel: 2, place: 'lintCamp',
  offer: ['Builder! Builder! Lintwick stuck in knotty cage!', 'Other Lintlings say Lintwick too soft to be monster. Lintwick agree! Please break cage? Cage is tough. Need club!'],
  steps: [
    { text: 'Break the Knot Cage at the Lint Camp (needs the Cobble Club)', done: { flag: 'lintwickFreed' }, target: { poi: 'lintCamp' } },
    { text: 'Lead Lintwick home to Thimbleton', done: { at: 'bannerSpot', radius: 8 }, target: { poi: 'bannerSpot' } },
    { text: 'Build Lintwick a Bedroom with a Felt block in its walls', done: { room: 'bedroom', felt: true } }
  ],
  done: ['Felt! Lintwick bed has FELT. Lintwick never leaving. Lintwick will make fluff for Town Chest every day!'], reward: { cheer: 20 } });
q('S2', { title: 'Bluebell Blues', giver: 'wren', side: true, minLevel: 3, after: 'M4',
  offer: ['Builder, everything here is brown and green. Can we have something BLUE?', 'Bluebells grow at the edge of Tweedwood. Make blue felt and put it all over town!'],
  steps: [
    { text: 'Craft 4 Blue Felt Patches (Bluebell Dye and cotton)', done: { crafted: { feltBlue: 4 } }, target: { plant: 'bluebell' } },
    { text: 'Place 8 Blue Felt blocks inside the town', done: { placedInTown: { feltBlue: 8 } } }
  ],
  done: ['It\'s like the sky came down to visit!'], reward: { cheer: 15 } });
q('S3', { title: 'Buttons of Old', giver: 'professor', side: true, minLevel: 4, needNpc: 'professor',
  offer: ['Three Ancient Buttons, Builder! From before the Fraying. One on the Calico Coast, one high in the Crags, one in Tweedwood.', 'Bring them to me and I\'ll show you something golden.'],
  steps: [ { text: 'Find the 3 Ancient Buttons (Coast, Crags, Tweedwood)', done: { have: { ancientButton: 3 } } } ],
  done: ['Magnificent! And for you: the Golden Thimble. Its Knack lets you gild felt!'], reward: { cheer: 30, items: { goldenThimble: 1 }, notions: ['gildedFelt'], take: { ancientButton: 3 } } });
DQ.QUEST_ORDER = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'S1', 'S2', 'S3'];

// lines for cutscenes and moments
DQ.LINES = {
  wake: ['Wakey wakey, dearie! Oh good, you\'re not a pincushion. I\'d hate to have stitched you together for nothing.', 'I\'m Granny Gossamer. I stitched this whole world, you know. Well. Most of it.', 'Frayvern pulled the Golden Thread right out of the world, and everything came apart at the seams.', 'Worse, he swallowed everyone\'s Knack! Not a soul can make so much as a potholder.', 'But you still have the Knack. You\'re a Builder, dearie! Now, let\'s get you out of this Hollow.'],
  reveal: ['Look at it, dearie. The Gingham Glen. All frayed at the edges, poor thing.', 'Plant this where Thimbleton used to be, dearie. Folks will come. They always come for a light.'],
  plant: ['Thimbleton has been founded!', 'Oh, well done! The Banner of Mending marks your town. Inside its stitches, rooms you build will cheer folk up.', 'Here, two notions to start you off: a Mending Bench, and a Lattice Door.'],
  firstNight: ['Monsters get bolder after dark, dearie. A lit room is a safe room!'],
  levelUp: ['Your town is growing, dearie! More folk will come now.'],
  spinDemo: ['Watch the dummy, Builder. Hold... hold... and SPIN!'],
  buttonsworth: ['HALT! None shall pass without a proper fastening!', 'I am Sir Buttonsworth, Keeper of the Quarry! The Golden Needle is MINE. It holds my waistcoat together!'],
  buttonsworthDown: ['My... buttons... are... coming... undone...!'],
  gate: ['The Seam Ripper bites! The knots... they\'re unpicking themselves!'],
  frayvern: ['Mend all the patches you like, Builder. I hold the Golden Thread, and the whole quilt is mine to pull.'],
  threadHome: ['That roar came from the Rift! Hurry home, dearie, they\'re going after Thimbleton!'],
  siegeRally: ['Here they come, Builder. The whole Knotted army.', 'Ninety seconds to get ready. Ballistas, traps, walls. Whatever you\'ve got. Then we hold the line!'],
  gnarlgrim: ['YOU! The needle in my side! I\'ll tie you in knots, little Builder!'],
  gnarlHint: ['He\'s wound too tight to hurt, Builder! Use the Ballistas! Tangle him up, then strike!'],
  tangled: ['He\'s Tangled! Strike his Heart Knot, NOW!'],
  gnarlDown: ['I\'m... unravelling...!'],
  finale: ['You did it, my little stitch. One patch mended... and a great many to go.'],
  ko: ['Oh, dearie, you\'ve come undone!'],
  bannerDown: ['The Banner has fallen...'],
  siegeFail: ['You\'ve come undone...']
};
})();
