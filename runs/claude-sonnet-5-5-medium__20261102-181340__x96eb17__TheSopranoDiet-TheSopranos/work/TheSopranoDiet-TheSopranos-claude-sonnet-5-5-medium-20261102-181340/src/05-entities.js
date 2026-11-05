/* characters, enemy kinds, pickup sprites */
(() => {
const G = SD, E = G.E;

const RIGDEFS = {
  tommy: { size: 1.3, build: 'bulky', outfit: 'shirt', hair: 'short', sleeves: 'short', weapon: null, colors: { skin: '#e3b693', hair: '#2a2420', cloth: '#2c7a8e', pants: '#2b2b36', boot: '#16161c', belt: '#1c1c22', trim: '#e8d8a0' } },
  carm: { size: 1.2, outfit: 'robe', hair: 'long', weapon: null, colors: { skin: '#efc6a6', hair: '#3a2418', cloth: '#c46a8a', pants: '#7a3a5a', trim: '#f4d8e0' } },
  melfee: { size: 1.2, outfit: 'coat', hair: 'ponytail', weapon: null, colors: { skin: '#efc6a6', hair: '#6a3a20', coat: '#58607a', cloth: '#d8d0c0', pants: '#2a2a36' } },
  gino: { size: 1.25, build: 'bulky', outfit: 'shirt', hair: 'bald', hat: { style: 'cap', color: '#f4f4f4' }, sleeves: 'short', weapon: null, colors: { skin: '#e0ae8a', cloth: '#f2eee6', pants: '#3a4a6a', trim: '#c23a3a' } },
  stella: { size: 1.2, outfit: 'shirt', hair: 'ponytail', weapon: null, colors: { skin: '#e8b898', hair: '#a85a2a', cloth: '#7aa0d0', pants: '#4a4a6a' } },
  maria: { size: 1.2, outfit: 'tunic', hair: 'long', weapon: null, colors: { skin: '#ddab86', hair: '#1c1612', cloth: '#e8b050', pants: '#8a3a2a', trim: '#fff0d0' } },
  pauly: { size: 1.25, outfit: 'coat', hair: 'spiky', weapon: null, colors: { skin: '#e3b693', hair: '#d4d4d4', coat: '#1c1c28', cloth: '#a82a3a', pants: '#1c1c28' } },
  vinny: { size: 1.2, build: 'bulky', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#d8a030' }, weapon: null, colors: { skin: '#d9a47e', cloth: '#d8c8a8', pants: '#5a4a3a' } },
  anthony: { size: 1.0, outfit: 'shirt', hair: 'spiky', weapon: null, colors: { skin: '#e8b898', hair: '#2a2018', cloth: '#6a8a5a', pants: '#3a3a52' } },
  meadow: { size: 1.1, outfit: 'shirt', hair: 'long', weapon: null, colors: { skin: '#efc6a6', hair: '#5a3a24', cloth: '#9a6ac8', pants: '#3a3a52' } },
  waiter: { size: 1.2, outfit: 'shirt', hair: 'short', weapon: null, colors: { skin: '#dba886', hair: '#201a18', cloth: '#f2f2f2', pants: '#1c1c28' } },
  thug: { size: 1.25, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#2a2a32' }, sleeves: 'long', weapon: null, stance: 'guard', colors: { skin: '#e0b090', hair: '#201a18', cloth: '#7a2a4a', pants: '#2a2a3a', boot: '#111', trim: '#f0e0b0' } },
  bruiser: { size: 1.6, build: 'bulky', outfit: 'shirt', hair: 'bald', sleeves: 'short', weapon: null, stance: 'guard', colors: { skin: '#d9a47e', cloth: '#2a5aa8', pants: '#22222a', boot: '#111', belt: '#d8b050' } },
  gunman: { size: 1.25, outfit: 'coat', hair: 'short', hat: { style: 'band', color: '#e8e8e8' }, weapon: 'gun', colors: { skin: '#e3b693', hair: '#1c1a18', coat: '#1c2a3c', cloth: '#d8d8e0', pants: '#1c2a3c', metal: '#9aa0a8' } },
  slavko: { size: 1.95, build: 'bulky', outfit: 'coat', hair: 'bald', hat: { style: 'helmet', color: '#6a7a60' }, weapon: 'gun', colors: { skin: '#e8c8b0', coat: '#5a6a58', cloth: '#d84a2a', pants: '#3a463a', boot: '#1a1a1a', metal: '#b0b6bc' } }
};
G.RIGDEFS = RIGDEFS;
G.makeRig = (key, over) => new E.Humanoid(Object.assign({}, RIGDEFS[key], over || {}));
G.makeDuck = () => new E.Blob({ R: 5, colors: { dk: '#c19620', base: '#f2d24a', lt: '#fff0a0', spec: '#ffffff', eye: '#ffffff', pupil: '#111111' }, feet: true, mouth: true, tail: true });

/* enemy kinds */
G.EN = {
  thug: { hp: 36, spd: 46, dmg: 8, reach: 14, move: 'jab', wind: .42, rig: 'thug', cash: [8, 22], resp: 3, aggro: 110 },
  bruiser: { hp: 100, spd: 30, dmg: 16, reach: 19, move: 'haymaker', wind: .8, rig: 'bruiser', cash: [30, 60], resp: 9, aggro: 120, heavy: true },
  gunman: { hp: 28, spd: 42, dmg: 8, ranged: true, rig: 'gunman', cash: [12, 30], resp: 5, aggro: 150 },
  boss: { hp: 300, spd: 52, dmg: 14, reach: 24, move: 'haymaker', wind: .5, rig: 'slavko', cash: [150, 150], resp: 40, aggro: 400, boss: true, heavy: true }
};

/* pickup & item sprites */
const SP = (rows, pal, s) => E.sprite(rows, pal, s || 1);
G.SPR = {
  capicola: SP(['..bbbbbb..', '.bBBBBBBb.', 'rrrrrrrrrr', 'rRrRrRrRrr', 'wwwwwwwwww', '.bbbbbbbb.'], { b: '#c98e4a', B: '#f0c27a', r: '#b83030', R: '#e86a6a', w: '#f6f0e0' }),
  salad: SP(['..g.G.g...', '.gGgGgGg..', 'gGgrGgGgg.', '.dddddddd.', '..dddddd..'], { g: '#4aa24a', G: '#8ad06a', r: '#e04a3a', d: '#e8e0d0' }),
  cannoli: SP(['.ccccccc.', 'cYyYyYyYc', 'cYyYyYyYc', '.ccccccc.'], { c: '#d8a458', Y: '#fff6e0', y: '#f0e2c0' }),
  cash: SP(['.gggggg.', 'gGGgGGgg', 'gG$GG$gg', 'gGGgGGgg', '.gggggg.'], { g: '#2f8a3a', G: '#6ad06a', '$': '#e8ffe0' }),
  bread: SP(['.bbbbbb.', 'bBBbBBbb', 'bBBBBBBb', '.bbbbbb.'], { b: '#b9843c', B: '#e8b868' }),
  ring: SP(['..oooo..', '.oOOOOo.', 'oOo..oOo', 'oO....Oo', 'oOo..oOo', '.oOOOOo.', '..oooo..'], { o: '#b8782c', O: '#f0b858' }),
  envelope: SP(['eeeeeeee', 'eEeeeeEe', 'eeEeeEee', 'eeeEEeee', 'eeeeeeee'], { e: '#f4eede', E: '#c8bda0' })
};
G.FOOD = {
  capicola: { name: 'Capicola Sandwich', hp: 38, gut: 9, stress: -16, price: 15, spr: 'capicola', verb: 'Mmm. Forbidden.' },
  salad: { name: 'Garden Salad', hp: 16, gut: -7, stress: 4, price: 8, spr: 'salad', verb: 'It tastes like a lawn.' },
  cannoli: { name: 'Cannoli', hp: 22, gut: 11, stress: -26, price: 12, spr: 'cannoli', verb: 'The cannoli never saw it coming.' }
};
})();
