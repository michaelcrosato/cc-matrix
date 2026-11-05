/* ---- THE FULL TABLES: items (33), classes (23) and skills (100: tiers, season variants, monster traits) ---- */
/* items: id, name, slot, text, stats */
const MORE_IT = [
  ['dagger', 'Rook\'s Dagger', 'w', '+2 attack, +1 move.', { atk: 2, mov: 1 }], ['longsword', 'Longsword of Noon', 'w', '+5 attack.', { atk: 5 }], ['warhammer', 'Thresher\'s Hammer', 'w', '+6 attack, -1 move.', { atk: 6, mov: -1 }],
  ['yewbow', 'Yew Bow', 'w', '+4 attack.', { atk: 4 }], ['runestaff', 'Runestaff', 'w', '+5 intellect.', { int: 5 }], ['lilywand', 'Lily Wand', 'w', '+3 intellect, +10 HP.', { int: 3, hp: 10 }], ['whip', 'Gilded Whip', 'w', '+3 attack, +1 bond.', { atk: 3, bond: 1 }],
  ['buckler', 'Dewdrop Buckler', 'a', '+2 defence.', { def: 2 }], ['plate', 'Plate of Hours', 'a', '+6 defence, -1 move.', { def: 6, mov: -1 }], ['cloak', 'Thistle Cloak', 'a', '+3 defence, +1 move.', { def: 3, mov: 1 }],
  ['mail', 'Ringmail', 'a', '+4 defence, +8 HP.', { def: 4, hp: 8 }], ['robe', 'Frostwool Robe', 'a', '+3 defence, +3 intellect.', { def: 3, int: 3 }], ['aegis', 'Aegis of the Wheel', 'a', '+5 defence.', { def: 5 }], ['gambeson', 'Gambeson', 'a', '+15 HP.', { hp: 15 }],
  ['ring', 'Ring of Tarry', 'c', '+2 bond.', { bond: 2 }], ['amulet', 'Amulet of Spring', 'c', '+4 intellect.', { int: 4 }], ['horseshoe', 'Lucky Horseshoe', 'c', '+1 move, +1 bond.', { mov: 1, bond: 1 }], ['talisman', 'Sun Talisman', 'c', '+3 attack.', { atk: 3 }],
  ['brooch', 'Hourglass Brooch', 'c', '+10 HP, +2 defence.', { hp: 10, def: 2 }], ['bell', 'Silver Bell', 'c', '+2 intellect, +1 bond.', { int: 2, bond: 1 }], ['feather', 'Roc Feather', 'c', '+2 move.', { mov: 2 }],
  ['hipotion', 'Great Draught', 'use', 'Heals 60 HP.', { heal: 60 }], ['tonic', 'Field Tonic', 'use', 'Heals 15 HP.', { heal: 15 }], ['elixir', 'Moonwell Elixir', 'use', 'Restores 24 MP to a knight.', { mp: 24 }], ['bandage', 'Clean Bandage', 'use', 'Heals 22 HP.', { heal: 22 }]
];
for (const i of MORE_IT) { G.def('item', i[0], Object.assign({ id: i[0], name: i[1], slot: i[2], text: i[3] }, i[4])); G.ITEM_IDS.push(i[0]); }
G.EQUIP_IDS = G.ITEM_IDS.filter(i => ['w', 'a', 'c'].includes(G.get('item', i).slot));
/* classes: 5 lines x 3 tiers, plus eight unique ruler and wanderer classes */
G.UNIQUE_CLASS = { elaine: 'Queen of Lilies', gawain: 'Noon Warden', ragnell: 'Harvest Mother', nimue: 'Mere Witch', vesper: 'Warden of the Hour', maelgwn: 'Brigand King', gray: 'Stillness Incarnate', galahad: 'Wandering Saint' };
G.CLASSES = G.LINES.flatMap(l => l.names).concat(Object.values(G.UNIQUE_CLASS));
G.className = k => (G.UNIQUE_CLASS[k.id] && (k.tier >= 1 || k.id === 'gray')) ? G.UNIQUE_CLASS[k.id] : G.LINES[k.line].names[k.tier];
/* skills: tier upgrades and season variants of the ten base skills */
const BASE = G.all('skill').slice(), PRE = ['Verdant', 'Blazing', 'Harvest', 'Frozen'];
for (const b of BASE) {
  b.base = b.id;
  [['_2', 'Greater ', 1.25, 2], ['_3', 'Grand ', 1.5, 4]].forEach(([suf, pre, pm, mp]) => G.def('skill', b.id + suf, Object.assign({}, b, { id: b.id + suf, name: pre + b.name, power: b.power * pm, mp: b.mp + mp, base: b.id })));
  for (let e = 0; e < 4; e++) G.def('skill', b.id + '_s' + e, Object.assign({}, b, { id: b.id + '_s' + e, name: PRE[e] + ' ' + b.name, power: b.power * 1.1, mp: b.mp + 1, base: b.id, el: e }));
}
/* monster traits: each species carries one passive */
const TRAITS = ['regen', 'swift', 'guard'], TRAIT_TEXT = { regen: 'Recovers 3 HP at the start of its phase.', swift: 'Moves one hex further.', guard: 'Takes 10% less damage.' };
G.all('monster').forEach((m, i) => { m.passive = TRAITS[i % 3]; G.def('skill', 'p_' + m.id, { id: 'p_' + m.id, name: m.names[0] + ' trait', kind: 'passive', range: [0, 0], mp: 0, power: 0, text: TRAIT_TEXT[m.passive], base: 'p_' + m.id, target: 'self', radius: 0, mobile: true }); });
G.TRAIT_TEXT = TRAIT_TEXT;
