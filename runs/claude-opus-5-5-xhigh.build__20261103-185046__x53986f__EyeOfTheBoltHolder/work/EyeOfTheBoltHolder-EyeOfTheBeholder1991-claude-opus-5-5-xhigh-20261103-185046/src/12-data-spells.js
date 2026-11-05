/* =====================================================================================
 * 12-data-spells: arcane spells (the spellbook, scrolls) and prayers (to the Warder of Thresholds). target: front (the
 * cell ahead), line (down the facing), member (picked on the cards), dead (a dead member), party, door (the one ahead).
 * ===================================================================================== */
B.SPELLS = {
  sparkDart: { name: 'Spark Dart', arc: true, lvl: 1, target: 'line', color: '#c8b8ff', desc: 'Darts of violet light that never miss the first foe ahead.' },
  wardOfBrass: { name: 'Ward of Brass', arc: true, lvl: 1, target: 'member', color: '#ffd36a', desc: 'A shimmer of brass turns blows aside until it breaks.' },
  findSeams: { name: 'Find Seams', arc: true, lvl: 1, target: 'party', color: '#ffe08a', desc: 'For a while, hidden things show their seams.' },
  slumber: { name: 'Slumber', arc: true, lvl: 1, target: 'front', color: '#a8c8ff', desc: 'The living ahead fall asleep. Sleepers take double harm.' },
  unlatch: { name: 'Unlatch', arc: true, lvl: 2, target: 'door', color: '#ffe8a0', desc: 'A ghostly key turns a magic seal or a simple lock.' },
  frostbite: { name: 'Frostbite', arc: true, lvl: 2, target: 'front', color: '#8ae0ff', desc: 'Cold bites all ahead, and slows them.' },
  featherStep: { name: 'Feather Step', arc: true, lvl: 2, target: 'party', color: '#d8f0ff', desc: 'The party walks on air, over pits, for two minutes.' },
  forkedLightning: { name: 'Forked Lightning', arc: true, lvl: 3, target: 'line', color: '#7af0ff', desc: 'Lightning down the corridor, through every foe in its path.' },
  blazingOrb: { name: 'Blazing Orb', arc: true, lvl: 3, target: 'line', color: '#ff9a3a', desc: 'An orb of fire bursts at the first foe, scorching those beside it.' },
  mend: { name: 'Mend', arc: false, lvl: 1, target: 'member', color: '#7ae08a', desc: 'Heals a wound, and wakes the fallen.' },
  steadyHand: { name: 'Steady Hand', arc: false, lvl: 1, target: 'party', color: '#ffd36a', desc: 'Every hand is surer for a minute.' },
  turnDead: { name: 'Turn the Dead', arc: false, lvl: 1, target: 'front', color: '#ffffff', desc: 'The restless dead flee the Warder\'s light; the weak crumble.' },
  purge: { name: 'Purge Venom', arc: false, lvl: 2, target: 'member', color: '#9ae06a', desc: 'Draws out poison, and eases the hurt.' },
  holdFast: { name: 'Hold Fast', arc: false, lvl: 2, target: 'front', color: '#ffd36a', desc: 'Golden chains hold the people ahead still.' },
  loaves: { name: 'Loaves of the Hearth', arc: false, lvl: 2, target: 'party', color: '#e8b870', desc: 'Warm bread for everyone. Hunger is forgotten.' },
  greaterMend: { name: 'Greater Mend', arc: false, lvl: 3, target: 'member', color: '#9affb0', desc: 'Heals a grievous wound, and wakes the fallen.' },
  raise: { name: 'Raise from Rest', arc: false, lvl: 3, target: 'dead', color: '#fff6d8', desc: 'Calls a fallen friend back across the threshold.' },
  freeHinge: { name: 'Free Hinge', arc: false, lvl: 3, target: 'party', color: '#ffe8a0', desc: 'Frees locked joints, and keeps them free for two minutes.' }
};
B.SP = id => B.SPELLS[id];
B.ARCANE = Object.keys(B.SPELLS).filter(k => B.SPELLS[k].arc);
B.PRAYERS = Object.keys(B.SPELLS).filter(k => !B.SPELLS[k].arc);
// a scroll item for every arcane spell
for (const id of B.ARCANE) B.ITEMS[B.scrollId(id)] = { name: 'Scroll of ' + B.SPELLS[id].name, kind: 'scroll', spell: id, icon: 'scroll', color: B.SPELLS[id].color, model: 'scroll', desc: 'A spell written out in a careful hand. A mage may cast it once, or scribe it into a spellbook at camp.' };
/** spell slots by caster level 1-8: [level-1, level-2, level-3] */
B.SLOTS = {
  mage: [[1, 0, 0], [2, 0, 0], [2, 1, 0], [3, 2, 0], [3, 2, 1], [4, 2, 2], [4, 3, 2], [4, 3, 3]],
  cleric: [[1, 0, 0], [2, 0, 0], [2, 1, 0], [3, 2, 0], [3, 2, 1], [3, 3, 1], [4, 3, 2], [4, 3, 2]]
};
