// Residents, quests, objectives. Writing style: short, warm, punny, earnest (Dragon Quest-ish).
(() => {
const { E, T } = DQ;
const ev = DQ.events;

DQ.GRANNY = { id: 'granny', name: 'Granny Gossamer', voice: { pitch: 150, speed: 1, color: '#ffd36a' } };
DQ.NPCS = {
  wren: { id: 'wren', name: 'Wren', job: 'gatherer', fav: 'Bedroom', home: 'glen', blob: false,
    look: { size: 1, build: 'chibi', hair: 'ponytail', outfit: 'tunic', weapon: null, colors: { hair: '#c0602a', cloth: '#5aa08a', pants: '#3a5a6a', skin: '#f2cfa6' } }, voice: { pitch: 210, speed: 1.15, color: '#8affd0' },
    chat: ['I gather bits and bobs! Mostly bits. Occasionally bobs.', 'Ever tried a Thimbleberry? Sour! Wonderful!', 'You *made* a wall? On purpose?! Oh my buttons.', 'A bed is just a floor that loves you back.'],
    arrive: ["Hello?! Is that a Banner? Is that a BUILDER?!", "I'm Wren. I gather things. I can't build though... nobody can since the Thread went missing."] },
  mortimer: { id: 'mortimer', name: 'Mortimer', job: 'guard', fav: 'Guard Post', home: 'glen',
    look: { size: 1.1, build: 'bulky', hair: 'bald', outfit: 'coat', weapon: 'sword', hat: 'helmet', colors: { cloth: '#8a3a32', metal: '#b0b0c0', skin: '#e0b890' } }, voice: { pitch: 90, speed: .85, color: '#ffb0a0' },
    chat: ['Halt! ...Oh, it is you. Carry on.', 'A guard must stand watch. A Guard Post helps. So does soup.', 'Monsters get bolder at night. Keep a torch lit!', 'The Knotted army is coming. I can feel it in my knees.'],
    arrive: ['Hup! Mortimer, town guard. Well... guard of a town that is mostly a banner.', 'Where there is a bed, there is a roof. Where there is a roof, there is a reason to defend it!'] },
  marigold: { id: 'marigold', name: 'Marigold', job: 'cook', fav: 'Kitchen', home: 'glen',
    look: { size: 1, build: 'chibi', hair: 'short', outfit: 'robe', weapon: null, colors: { hair: '#e8c040', cloth: '#e07a5a', skin: '#f2cfa6' } }, voice: { pitch: 240, speed: 1.3, color: '#ffd0e0' },
    chat: ['Everything is better with butter! Even butter.', 'A Kitchen! Give me a Hearth Pot and the pantry is mine.', 'Supper is at six. Do not be late. I mean it.', 'Button Stew: it has no buttons. Nobody asks why.'],
    arrive: ['Ooh! A town! With a banner! And NO kitchen! Dreadful. Delightful. Dreadfully delightful!', 'I am Marigold. I cook. Bring me a Hearth Pot and stand back.'] },
  selvage: { id: 'selvage', name: 'Professor Selvage', job: 'helper', fav: 'Workshop', home: 'glen',
    look: { size: 1, build: 'heroic', hair: 'long', outfit: 'robe', weapon: null, hat: 'pointed', colors: { hair: '#d8d8e8', cloth: '#5a4aa0', skin: '#f2cfa6' } }, voice: { pitch: 120, speed: .95, color: '#c8b8ff' },
    chat: ['Fascinating! The Knack is not gone. It is merely... misplaced.', 'Smelting is simply cooking for rocks.', 'I once catalogued 12,000 buttons. I am not a happy man.', 'Hmm. A Seam Ripper would solve the Knot problem. Knots are my nemesis.'],
    arrive: ['Behold! A functioning settlement! I shall take notes.', 'Selvage, professor of Applied Threadology. Bring me a Workshop and perhaps some tea.'] },
  lintwick: { id: 'lintwick', name: 'Lintwick', job: 'farmer', fav: 'Snug', blob: true, home: 'glen',
    look: { R: 6, ears: 'rabbit', feet: true, colors: { base: '#f0e8f8', dk: '#b0a0c8', lt: '#ffffff', eye: '#222' } }, voice: { pitch: 300, speed: 1.5, color: '#fff0a0' },
    chat: ['Fluff! Fluff! Fluff, fluff, fluff!', 'I collect Lint. It collects me back.', 'Is it nap time? It is always nap time.', 'You made a room! I made fluff! Teamwork!'],
    arrive: ['Pip! Pippip! A builder-person! Is there a nap room?', 'I am Lintwick! I am fluffy! This is my whole personality!'] }
};
DQ.NPC_ORDER = ['wren', 'mortimer', 'marigold', 'selvage', 'lintwick'];

// resident arrival rules (checked on events)
DQ.ARRIVALS = [
  { id: 'wren', when: () => DQ.S.town.planted },
  { id: 'mortimer', when: () => DQ.S.stats.rooms.Bedroom > 0 },
  { id: 'marigold', when: () => DQ.S.town.level >= 2 },
  { id: 'selvage', when: () => DQ.S.stats.rooms.Kitchen > 0 || DQ.S.town.level >= 3 },
  { id: 'lintwick', when: () => DQ.S.town.level >= 3 }
];

// ---------- quests ----------
// cond: broken|placed|have|crafted|placedObj|room|level|talk|at|boss|flag|siege
const Q = (id, title, giver, o) => ({ id, title, giver, ...o });
DQ.QUESTS = [
  Q('stitch', 'First Stitches', 'granny', {
    start: () => true, hint: 'Hit blocks with ' + '{attack}' + ' and set them down with {place}.',
    offer: ["Oh, dearie! You've woken up! I'm Granny Gossamer, the Great Quilter. I stitched this whole world, you know.", "Frayvern the dragon pulled my Golden Thread and swallowed everyone's Knack, the gift of making things. All but yours!", "Let's start small. Break a few blocks, then put some back. A builder is a builder, even a tiny one!"],
    steps: [{ text: 'Break 4 blocks', c: { broken: 4 } }, { text: 'Place 3 blocks', c: { placed: 3 } }],
    done: ["Wonderful, wonderful! You've got the Knack in your fingers, dearie!"], reward: { items: { branch: 0 } } }),
  Q('gather', 'A Notion of Shelter', 'granny', {
    start: () => DQ.questDone('stitch'),
    offer: ["Now for the important part: NOTIONS! Touch a new material and you'll get an idea for something to craft.", "Pick Branches from the Tuft Trees, Cotton from the puffs, and Straw from the tufts. Open your Satchel and make torches and a Wool Block!"],
    steps: [{ text: 'Gather 4 Branches, 3 Cotton and 2 Straw', c: { have: { branch: 4, cotton: 3, straw: 2 } } }, { text: 'Craft 2 Torches', c: { crafted: 'torch' } }, { text: 'Craft a Wool Block', c: { crafted: 'woolblock' } }],
    done: ["Ooh, a torch AND a wool block. You're a natural! Now, the real adventure: Thimbleton."], cheer: 0 }),
  Q('thimbleton', 'To Thimbleton', 'granny', {
    start: () => DQ.questDone('gather'),
    offer: ["Take the Banner of Mending to the plaza of Thimbleton, southeast of here. Follow the dirt road, dearie. There is a golden mark in the middle."],
    steps: [{ text: 'Walk to the plaza of Thimbleton', c: { at: 'plaza', r: 5 } }, { text: 'Plant the Banner of Mending on the golden mark', c: { flag: 'planted' } }],
    done: ["The Banner is up! Oh, look at it glow. Thimbleton remembers being a town!"], cheer: 10 }),
  Q('wrenbed', "Wren's Bed", 'wren', {
    start: () => DQ.S.town.planted && DQ.S.flags.arrived_wren,
    offer: ["Could you build me a bedroom? Walls two blocks high, a door, a light, and a bed. I'll sleep like a stone. A soft stone!", "Craft Planks, Doors and a Mending Bench (Plank + Cobble). The bench makes beds!"],
    steps: [{ text: 'Build a Bedroom in the town border', c: { room: 'Bedroom' } }], done: ["A BED! Made by hand! I'm going to cry into the pillow. Thank you! Here, a Cottage Pattern: place it and I'll help build!"], cheer: 10, turnIn: true, reward: { items: { pattern: 1 } } }),
  Q('guard', "Mortimer's Watch", 'mortimer', {
    start: () => DQ.S.flags.arrived_mortimer,
    offer: ["A guard needs a post. Build a Guard Post: a closed room with a Weapon Rack, a door and a light.", "Racks are made at the Mending Bench. Stand tall, Builder!"],
    steps: [{ text: 'Build a Guard Post', c: { room: 'Guard Post' } }], done: ["Ha! My own post! I shall guard it with my life. Or at least my afternoon."], cheer: 12, turnIn: true }),
  Q('kitchen', "Marigold's Kitchen", 'marigold', {
    start: () => DQ.S.flags.arrived_marigold,
    offer: ["I need a Kitchen! Walls, a door, a light and a Hearth Pot. Cobble and branches make the pot. Chop chop!"],
    steps: [{ text: 'Build a Kitchen', c: { room: 'Kitchen' } }], done: ["My Kitchen! Take a crumpet. No, take two. Take them ALL."], cheer: 14, turnIn: true, reward: { items: { crumpet: 3 } } }),
  Q('supper', 'Supper Is Served', 'marigold', {
    start: () => DQ.questDone('kitchen'),
    offer: ["A kitchen without a dining hall is a sad kitchen. Build a Mess Hall with a Table and two Benches."],
    steps: [{ text: 'Build a Mess Hall', c: { room: 'Mess Hall' } }], done: ["Supper at six, everybody! Elbows off the table!"], cheer: 14, turnIn: true }),
  Q('forge', "The Professor's Forge", 'selvage', {
    start: () => DQ.S.flags.arrived_selvage,
    offer: ["To progress we need metal! Build a Smithy: a room with a Thimble Forge, a door and a light. Cobble and planks, mostly cobble."],
    steps: [{ text: 'Build a Smithy', c: { room: 'Smithy' } }], done: ["Marvellous! Now: copper. The Corduroy Crags to the east are lousy with it."], cheer: 14, turnIn: true }),
  Q('copper', 'Copper for the Cause', 'selvage', {
    start: () => DQ.questDone('forge'),
    offer: ["Take the east road to the Crags. Mine Copper Ore with a Cobble Club (craft it at the Forge) and smelt Copper Thread. Then forge a Copper Bodkin!", "Orange blocks with sparkles are copper. The Bobbin Portal at the crags will let you fast-travel."],
    steps: [{ text: 'Forge a Cobble Club', c: { crafted: 'club' } }, { text: 'Gather 5 Copper Ore', c: { have: { copperore: 5 } } }, { text: 'Forge a Copper Bodkin', c: { crafted: 'bodkin' } }],
    done: ["A Copper Bodkin! Gleaming! Terribly pointy! You're ready for the quarry."], turnIn: true, reward: { items: { heartpatch: 1 } }, cheer: 20 }),
  Q('buttons', 'Sir Buttonsworth', 'mortimer', {
    start: () => DQ.questDone('copper'),
    offer: ["A big button of a knight guards the Button Quarry to the north. He has the Golden Needle, and we need it for a Seam Ripper.", "He slams, he spits buttons, he charges. Jump his shockwaves. Dizzy knights take double damage!"],
    steps: [{ text: 'Defeat Sir Buttonsworth in Button Quarry', c: { boss: 'buttons' } }], done: ["You beat Sir Buttonsworth?! I'm so proud I could spit a button."], cheer: 25, turnIn: true }),
  Q('ripper', 'The Seam Ripper', 'selvage', {
    start: () => DQ.questDone('buttons'),
    offer: ["Black Knots can only be cut with a Seam Ripper. Forge one: the Golden Needle, 4 Steel Thread, 2 Copper Thread.", "Steel Thread comes from smelting Steel Ore (silvery-blue, high up in the Crags). Sir Buttonsworth's loot helps too."],
    steps: [{ text: 'Forge the Seam Ripper', c: { crafted: 'ripper' } }], done: ["SNIP! The Knots tremble! There's a sealed chamber west of the road, in the Fraying..."], cheer: 25, turnIn: true, reward: { items: { heartpatch: 1 } } }),
  Q('lintwick', "Lintwick's Fluff", 'lintwick', {
    start: () => DQ.S.flags.arrived_lintwick,
    offer: ["Pip! Lint! I need ten Lint for a nap pile! Lintlings drop it, if you are brave enough to ask politely with a stick."],
    steps: [{ text: 'Collect 10 Lint', c: { have: { lint: 10 } } }], done: ["Fluff! The best day! Have a Heartpatch. It's mostly lint, but it works."], cheer: 15, turnIn: true, reward: { items: { heartpatch: 1 } } }),
  Q('siegeprep', 'The Knotted Army', 'granny', {
    start: () => DQ.questDone('ripper') && DQ.S.town.level >= 3,
    offer: ["Oh dear. Oh DEAR. Frayvern's Knotted army is marching on Thimbleton! Gnarlgrim himself leads it, a lumpy great tangle of a thing.", "His skin is too tight for ordinary blows. Build Bobbin Ballistas at the Forge, set them near the Banner, and man them yourself. Then tell Mortimer you're ready!"],
    steps: [{ text: 'Place 2 Bobbin Ballistas inside the town', c: { placedObj: { ballista: 2 } } }, { text: 'Tell Mortimer when you are ready', c: { flag: 'siegeStarted' } }, { text: 'Survive the siege of Thimbleton', c: { siege: 'done' } }],
    done: ["You held the line! But the ground is trembling..."], cheer: 30 }),
  Q('gnarlgrim', 'Unpick the Knot', 'granny', {
    start: () => DQ.S.siege.phase === 'boss' || DQ.questDone('siegeprep'),
    offer: [],
    steps: [{ text: 'Tangle and defeat Gnarlgrim the Knotted', c: { boss: 'gnarlgrim' } }], done: [], cheer: 100 })
];
DQ.questById = id => DQ.QUESTS.find(q => q.id === id);
DQ.questDone = id => DQ.S && DQ.S.quests[id] === 'done';
DQ.questActive = () => DQ.QUESTS.filter(q => typeof DQ.S.quests[q.id] === 'number');

// ---------- condition checks ----------
DQ.cond = function (c) {
  const S = DQ.S, st = S.stats, h = S.hero;
  if (c.broken) return st.broken >= c.broken;
  if (c.placed) return st.placed >= c.placed;
  if (c.have) return DQ.inv.has(c.have);
  if (c.crafted) return (st.crafted[c.crafted] || 0) > 0;
  if (c.placedObj) return Object.entries(c.placedObj).every(([k, n]) => (st.placedObj[k] || 0) >= n);
  if (c.room) return DQ.roomCount(c.room) > 0 || (st.rooms[c.room] || 0) > 0;
  if (c.level) return S.town.level >= c.level;
  if (c.talk) return st.talked[c.talk];
  if (c.at) { const p = DQ.POI[c.at]; return h && Math.hypot(h.x - (p[0] * T + 8), h.y - (p[1] * T + 8)) < (c.r || 4) * T; }
  if (c.boss) return S.flags['boss_' + c.boss];
  if (c.flag) return !!S.flags[c.flag];
  if (c.siege) return S.siege.phase === 'done' || S.flags.siegeDone;
  return false;
};
// quest director
DQ.questTick = function (force) {
  const S = DQ.S; if (S.mode !== 'story') return;
  for (const q of DQ.QUESTS) {
    const cur = S.quests[q.id];
    if (cur === undefined) {
      if (q.start && q.start()) {
        if (q.giver === 'granny') { S.quests[q.id] = 0; ev.emit('questStart', { q }); }
        else { S.offered = S.offered || {}; if (!S.offered[q.id]) { S.offered[q.id] = true; ev.emit('questOffered', { q }); } }
      }
      continue;
    }
    if (cur === 'done') continue;
    while (typeof S.quests[q.id] === 'number' && S.quests[q.id] < q.steps.length && DQ.cond(q.steps[S.quests[q.id]].c)) {
      S.quests[q.id]++; ev.emit('questStep', { q, step: S.quests[q.id] });
      if (S.quests[q.id] >= q.steps.length) {
        if (q.turnIn) { S.quests[q.id] = q.steps.length; S.ready = S.ready || {}; S.ready[q.id] = true; ev.emit('questReady', { q }); break; }
        DQ.finishQuest(q);
      }
    }
    if (S.quests[q.id] === q.steps.length && !q.turnIn) DQ.finishQuest(q);
  }
};
DQ.finishQuest = function (q) {
  const S = DQ.S; if (S.quests[q.id] === 'done') return; S.quests[q.id] = 'done'; if (S.ready) delete S.ready[q.id];
  const rw = q.reward || {};
  if (rw.items) for (const [k, n] of Object.entries(rw.items)) if (n > 0) DQ.inv.add(k, n);
  if (q.cheer) DQ.addCheer(q.cheer, 'quest');
  DQ.notionCheck('quest', q.id);
  ev.emit('questDone', { q });
};
// an available quest offered by npc (not granny)
DQ.offerFor = id => { const S = DQ.S; return DQ.QUESTS.find(q => q.giver === id && S.quests[q.id] === undefined && q.start && q.start()); };
DQ.readyFor = id => DQ.QUESTS.find(q => q.giver === id && DQ.S.ready && DQ.S.ready[q.id]);
DQ.currentObjective = function () {
  const S = DQ.S; for (const q of DQ.QUESTS) { const cur = S.quests[q.id]; if (typeof cur === 'number') { if (cur >= q.steps.length) return { q, text: 'Return to ' + (DQ.NPCS[q.giver] ? DQ.NPCS[q.giver].name : 'Granny'), turnIn: true, giver: q.giver }; return { q, text: q.steps[cur].text, step: cur }; } }
  return null;
};
// where the objective tracker points
DQ.objectiveTarget = function (obj) {
  if (!obj) return null; const S = DQ.S, h = S.hero;
  if (obj.turnIn) { const r = S.residents.find(x => x.id === obj.giver); if (r) return { x: r.x, y: r.y, label: r.def.name }; return null; }
  const c = obj.q.steps[obj.step].c;
  const P = k => ({ x: DQ.POI[k][0] * T + 8, y: DQ.POI[k][1] * T + 8 });
  if (c.at) return { ...P(c.at), label: 'Plaza' };
  if (c.flag === 'planted') return { ...P('banner'), label: 'Golden mark' };
  if (c.flag === 'siegeStarted') { const r = S.residents.find(x => x.id === 'mortimer'); return r ? { x: r.x, y: r.y, label: 'Mortimer' } : null; }
  if (c.boss === 'buttons') return { ...P('arena'), label: 'Sir Buttonsworth' };
  if (c.boss === 'gnarlgrim' && S.boss) return { x: S.boss.x, y: S.boss.y, label: 'Gnarlgrim' };
  if (c.have) {
    const want = Object.keys(c.have).find(k => DQ.inv.count(k) < c.have[k]); const dropper = { branch: ['tree', 'pine'], cotton: ['cottonbush'], straw: ['tuft'], copperore: null, lint: null }[want];
    if (want === 'copperore') return { ...P('portalCrags'), label: 'Crags' };
    if (dropper) { let best = null, bd = 1e9; for (const o of S.world.list) { if (!dropper.includes(o.type)) continue; const d = Math.hypot(o.x * T - h.x, o.y * T - h.y); if (d < bd) { bd = d; best = o; } } if (best) return { x: best.x * T + 8, y: best.y * T + 8, label: DQ.OBJECTS[best.type].name }; }
  }
  return null;
};

// ---------- Granny and event-driven lines ----------
DQ.grannyLines = {
  firstNight: ["Monsters get bolder after dark, dearie. A lit room is a safe room!"],
  lowBelly: ["Your tummy's rumbling! Eat a berry, a crumpet, anything."],
  ko: ["Oh, dearie, you've come undone! Pull yourself together. Literally."],
  banner: ["There it is! Plant the Banner on the golden mark."]
};
})();
