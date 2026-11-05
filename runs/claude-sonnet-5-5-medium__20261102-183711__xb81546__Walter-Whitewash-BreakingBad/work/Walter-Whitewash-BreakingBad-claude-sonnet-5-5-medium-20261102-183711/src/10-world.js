// WALTER WHITEWASH: the places. Two maps built from code: Albuquerky (the town, the desert, the car wash, the RV) and the
// Superlab (the last room). Also the people's looks and every line anyone says. Pure data, plus builders that need the engine.
(() => {
const WW = (globalThis.WW = globalThis.WW || {});
const W = {};

// ---- the town -------------------------------------------------------------------------------------------------------------
// 48 x 34 cells of 16 units. '.' sand, 'r' road, 'p' sidewalk, 'w' wet concrete (car wash), '#' rim rocks. Buildings are
// wall types: 1 house, 2 school, 3 rim rock, 4 RV, 5 car wash, 6 supply store, 7 Los Polluelos, 8 fence
W.COLS = 48; W.ROWS = 34;
W.townRows = () => {
  const g = Array.from({ length: W.ROWS }, () => Array(W.COLS).fill('.'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
  const put = (x, y, ch) => { g[y][x] = ch; };
  // roads and sidewalks
  fill(1, 13, 46, 17, 'p'); fill(1, 14, 46, 16, 'r'); fill(21, 1, 25, 32, 'p'); fill(22, 1, 24, 32, 'r'); fill(21, 13, 25, 17, 'p'); fill(22, 13, 24, 17, 'r');
  fill(1, 14, 46, 16, 'r');
  // sidewalks in front of the buildings
  fill(2, 10, 15, 10, 'p'); fill(28, 10, 36, 10, 'p'); fill(38, 10, 46, 10, 'p'); fill(28, 27, 38, 27, 'p');
  // buildings
  fill(2, 2, 15, 9, '2'); fill(28, 2, 36, 8, '1'); fill(37, 2, 46, 9, '7'); fill(28, 19, 38, 26, '6');
  fill(41, 21, 46, 24, '4');
  // car wash: three walls, open to the south, wet floor, a counter spot
  fill(2, 19, 14, 27, 'w'); fill(2, 19, 14, 19, '5'); fill(2, 19, 2, 27, '5'); fill(14, 19, 14, 27, '5');
  fill(5, 19, 6, 20, '5');
  // two bays divided by short walls, cars sit between them
  fill(7, 24, 7, 26, '5'); fill(10, 24, 10, 26, '5');
  // the rim
  for (let x = 0; x < W.COLS; x++) { put(x, 0, '#'); put(x, W.ROWS - 1, '#'); }
  for (let y = 0; y < W.ROWS; y++) { put(0, y, '#'); put(W.COLS - 1, y, '#'); }
  // gaps for the roads through the rim stay closed: it is a closed town (the demo's whole world)
  // fences
  for (let x = 17; x <= 19; x++) put(x, 22, '8');
  for (let x = 40; x <= 44; x++) put(x, 28, '8');
  // spawns and stations (each overwrites one cell: the cell keeps its floor)
  const S = { '@': [32, 11], H: [32, 11], T: [9, 11], P: [42, 11], M: [33, 28], C: [43, 26], J: [42, 27], W: [8, 22], L: [43, 31], n: [19, 3], o: [45, 12], u: [12, 31],
    D: [8, 28] };
  for (const [ch, [x, y]] of Object.entries(S)) if (ch !== 'H') put(x, y, ch);
  const X = [[5, 12], [17, 12], [27, 12], [20, 29], [36, 12], [44, 18], [6, 31], [30, 31], [18, 18], [26, 18]];
  for (const [x, y] of X) put(x, y, 'x');
  const E = [[30, 31], [44, 30], [36, 30], [12, 30], [5, 17], [18, 25], [34, 17], [45, 19], [27, 29]];
  for (const [x, y] of E) put(x, y, 'e');
  for (const [x, y] of [[22, 2], [22, 31], [2, 15]]) put(x, y, 'c');
  return g.map(r => r.join(''));
};
W.townLegend = {
  '.': { floor: 'sand' }, r: { floor: 'road' }, p: { floor: 'walk' }, w: { floor: 'wet' },
  '#': 3, 1: 1, 2: 2, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8,
  '@': { floor: 'walk', spawn: 'hero' }, T: { floor: 'walk', spawn: 'teacher' }, P: { floor: 'walk', spawn: 'gus' }, M: { floor: 'walk', spawn: 'shop' },
  C: { floor: 'sand', spawn: 'cook' }, J: { floor: 'sand', spawn: 'jimmy' }, W: { floor: 'wet', spawn: 'counter' }, L: { floor: 'sand', spawn: 'hatch' },
  n: { floor: 'walk', spawn: 'drop-north' }, o: { floor: 'walk', spawn: 'drop-east' }, u: { floor: 'sand', spawn: 'drop-south' }, D: { floor: 'wet', spawn: 'sol' },
  x: { floor: 'walk', spawn: 'customer' }, e: { floor: 'sand', spawn: 'thug' }, c: { floor: 'road', spawn: 'cop' }
};
W.townTypes = {
  1: { h: 34, top: '#a86a4a', side: '#d9b48a', face: 'plaster', roof: 'tiles' },
  2: { h: 38, top: '#8a5a4a', side: '#a2573d', face: 'brick', roof: 'slab' },
  3: { h: 26, top: '#8a6a4a', side: '#a07a52', face: 'rock', roof: 'plain' },
  4: { h: 28, top: '#e8ecee', side: '#d4dadc', face: 'plain', roof: 'plain', line: '#4a9aa8' },
  5: { h: 26, top: '#5fa0c8', side: '#c8dce8', face: 'plaster', roof: 'plain' },
  6: { h: 32, top: '#6a6a72', side: '#c4a45a', face: 'plank', roof: 'slab' },
  7: { h: 36, top: '#b8362a', side: '#f0c030', face: 'plaster', roof: 'tiles' },
  8: { h: 9, top: '#8a6a4a', side: '#7a5a3a', face: 'plank', roof: 'plain' }
};
W.townFloor = (x, y, tag) => {
  const E = My3D2dge, n = E.noise2(x * .1, y * .1), n2 = E.noise2(x * .33 + 7, y * .33 + 3);
  if (tag === 'road') {
    const c = 36 + Math.round(n * 12) + (n2 > .78 ? 8 : 0), line = Math.abs(y % 16 - 8) < .8 && Math.floor(x / 6) % 2 === 0 && y > 224 && y < 270;
    const vline = Math.abs(x % 16 - 8) < .8 && Math.floor(y / 6) % 2 === 0 && x > 352 && x < 400;
    return line || vline ? [226, 190, 60] : [c, c + 2, c + 8];
  }
  if (tag === 'walk') { const t = (Math.floor(x / 8) + Math.floor(y / 8)) & 1, e = x % 8 < 1 || y % 8 < 1; return e ? [118, 112, 104] : t ? [168, 160, 148] : [160, 152, 140]; }
  if (tag === 'wet') { const e = x % 16 < 1 || y % 16 < 1; const s = n2 > .8 ? 26 : 0; return e ? [70, 96, 110] : [92 + s, 138 + s, 158 + s]; }
  if (tag === 'lab') { const e = x % 16 < 1 || y % 16 < 1; return e ? [32, 38, 44] : ((Math.floor(x / 16) + Math.floor(y / 16)) & 1) ? [72, 84, 92] : [64, 76, 84]; }
  // sand
  const E2 = E.tex.dirt(x, y, { base: '#c79a5e', dark: '#b3874f', light: '#d8b074' });
  return E2;
};

// dressing: [shape, x, y, options]. Solid ones block the way. Rocks and cactus are scenery in the desert.
W.townDress = () => {
  const out = [];
  const s = (id, cx, cy, o = {}) => out.push([id, cx * 16 + 8, cy * 16 + 8, o]);
  [[30, 29], [40, 30], [8, 31], [15, 29], [34, 31], [46, 28], [3, 30], [27, 25], [39, 18], [10, 17], [4, 17]].forEach(([x, y], i) => s('rock', x, y, { params: { r: 6 + (i % 3) * 2, seed: i + 1 } }));
  [[17, 30], [41, 29], [2, 24], [18, 19], [26, 31], [45, 28]].forEach(([x, y], i) => s('bush', x, y, { params: { r: 6 + (i % 2) * 2 } }));
  s('barrel', 29, 30, { solid: true }); s('barrel', 30, 30, { solid: true, facing: .6 }); s('crate', 37, 30, { solid: true }); s('crate', 36, 30, { solid: true, facing: .4 });   // off the walkways: the flow field does not see props
  s('barrel', 17, 11); s('sign', 20, 12, { solid: false }); s('sack', 47 - 3, 11);
  s('crate', 17, 24, { solid: true }); s('barrel', 41, 30, { solid: true });
  s('cart', 4, 20, { solid: true, facing: 0 }); s('barrel', 13, 20, { solid: true }); s('barrel', 3, 22, { solid: true });
  return out;
};

// ---- the Superlab ---------------------------------------------------------------------------------------------------------
W.labRows = () => {
  const C = 24, Rr = 15, g = Array.from({ length: Rr }, () => Array(C).fill('.'));
  for (let x = 0; x < C; x++) { g[0][x] = '#'; g[Rr - 1][x] = '#'; }
  for (let y = 0; y < Rr; y++) { g[y][0] = '#'; g[y][C - 1] = '#'; }
  for (const [x, y] of [[3, 2], [3, 3], [3, 11], [3, 12], [5, 5], [5, 9], [16, 5], [16, 9], [20, 2], [20, 11]]) g[y][x] = '#';   // pillars
  for (const [x, y] of [[8, 7], [9, 7], [8, 8], [9, 8]]) g[y][x] = 't';                                                        // the cooking tank
  g[3][8] = 'G'; g[11][10] = '@';
  return g.map(r => r.join(''));
};
W.labLegend = { '.': { floor: 'lab' }, '#': 1, t: { floor: 'lab', tile: 2 }, G: { floor: 'lab', spawn: 'boss' }, '@': { floor: 'lab', spawn: 'hero' } };
W.labTypes = {
  1: { h: 40, top: '#4a5560', side: '#6a7884', face: 'plain', roof: 'plain', line: '#2a3238' },
  2: { h: 20, top: '#8ab8d8', side: '#5a8aa8', face: 'plain', roof: 'plain' }
};

// ---- people --------------------------------------------------------------------------------------------------------------
// each is a Humanoid spec. Walt wears the green shirt and the khaki; in the cook he is in the yellow suit.
W.looks = {
  walt:   { size: 1.2, build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'bald', hat: { style: 'cap', color: '#2a2a2a' }, colors: { skin: '#e8c8b0', cloth: '#8a9a5a', pants: '#b8a070', boot: '#4a3a2a', hair: '#3a2a20' } },
  waltgun:{ size: 1.2, build: 'chibi', weapon: 'gun', outfit: 'shirt', sleeves: 'long', hair: 'bald', hat: { style: 'cap', color: '#2a2a2a' }, colors: { skin: '#e8c8b0', cloth: '#8a9a5a', pants: '#b8a070', boot: '#4a3a2a', metal: '#3a3a42' } },
  hazmat: { size: 1.2, build: 'chibi', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', hat: { style: 'helmet', color: '#d8c020' }, colors: { skin: '#e8c8b0', cloth: '#e0c828', coat: '#e0c828', pants: '#d8c020', boot: '#2a2a2a', glove: '#2a2a2a' } },
  jimmy:  { size: 1.15, build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'short', hat: { style: 'cap', color: '#d8d8d8' }, colors: { skin: '#e0b898', cloth: '#6a6ae0', pants: '#3a4a6a', hair: '#8a6a3a', boot: '#d8d8d8' } },
  gus:    { size: 1.35, build: 'heroic', weapon: 'gun', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#d8b090', cloth: '#d8c8a8', coat: '#a8b4b8', pants: '#5a5a62', hair: '#6a5a4a', boot: '#2a2a2a', metal: '#2a2a32' } },
  cop:    { size: 1.2, build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'short', hat: { style: 'cap', color: '#1a2a5a' }, colors: { skin: '#e0b898', cloth: '#3a5a98', pants: '#1a2a4a', boot: '#1a1a1a', hair: '#2a2a2a' } },
  hank:   { size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'short', colors: { skin: '#d8b090', cloth: '#d8d4c8', pants: '#3a3a3a', boot: '#1a1a1a', hair: '#2a2018' } },
  thug:   { size: 1.2, build: 'chibi', weapon: null, outfit: 'shirt', sleeves: 'none', hair: 'spiky', colors: { skin: '#b88a68', cloth: '#a8281c', pants: '#2a2a3a', boot: '#1a1a1a', hair: '#1a1a1a' } },
  shooter:{ size: 1.2, build: 'chibi', weapon: 'gun', outfit: 'shirt', sleeves: 'long', hair: 'ponytail', hat: { style: 'band', color: '#d8d8d8' }, colors: { skin: '#a87a58', cloth: '#6a1a8a', pants: '#2a2a3a', boot: '#1a1a1a', hair: '#1a1a1a' } },
  enforcer:{ size: 1.45, build: 'bulky', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', colors: { skin: '#a87a58', cloth: '#d8b020', coat: '#2a2a32', pants: '#1a1a1a', boot: '#0a0a0a' } },
  teacher:{ size: 1.15, build: 'chibi', weapon: null, outfit: 'robe', sleeves: 'long', hair: 'long', colors: { skin: '#d8a888', cloth: '#9a4a7a', hair: '#4a2a2a' } },
  sol:    { size: 1.15, build: 'chibi', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#d8b090', cloth: '#d86a98', coat: '#e8e0c8', pants: '#3a2a4a', hair: '#3a2a20' } }
};
W.customerLook = i => {
  const hairs = ['short', 'long', 'spiky', 'ponytail', 'bald'], cl = ['#c85a5a', '#5a8ac8', '#7ab85a', '#c8a85a', '#8a5ac8', '#5ac8b8', '#a0a0a8'], sk = ['#f0d0b8', '#d8a888', '#a87a58', '#7a5238', '#e8c8a8'];
  return { size: 1.1, build: 'chibi', weapon: null, outfit: i % 3 === 0 ? 'robe' : 'shirt', sleeves: i % 2 ? 'long' : 'short', hair: hairs[i % hairs.length],
    colors: { skin: sk[i % sk.length], cloth: cl[(i * 3) % cl.length], pants: '#4a4a5a', boot: '#2a2a2a', hair: ['#2a1a10', '#6a4a20', '#1a1a1a', '#a08a50'][i % 4] } };
};

// ---- the words ------------------------------------------------------------------------------------------------------------
// Voices are gibberish (the game babbles each speaker at their own pitch), so the text carries it: dry, short, mean to itself.
W.pitch = { walt: 150, jimmy: 260, gus: 120, cop: 200, hank: 135, thug: 170, teacher: 300, sol: 230, customer: 240, narrator: 190, enforcer: 95 };
W.names = { walt: 'WALT', jimmy: 'JIMMY', gus: 'GUS FRYING', cop: 'OFFICER', hank: 'HANK SCHRODINGER', thug: 'THUG', teacher: 'MS. CHALKWELL', sol: 'SOL GOODGIRL', customer: 'CUSTOMER', narrator: '', enforcer: 'ENFORCER' };

W.script = {
  intro: [
    ['narrator', 'Albuquerky, New Mexico. A Tuesday that looked like all the others.'],
    ['walt', 'Fifty-two years old. Sixteen years teaching chemistry to kids who would rather be asleep. A second job at a car wash, wiping down other people\'s Hondas.'],
    ['walt', 'And now the doctor says I have a cough that is not a cough. The bills are $600 a day, and they do not care that I am a nice man.'],
    ['walt', 'I know chemistry. Better than anyone in this state. It is time to put it to work.'],
    ['walt', 'Twelve thousand dollars, clean, in five days. That is the number. Cook, sell, launder. And be home for dinner.']
  ],
  teacher: [
    ['teacher', 'Walter! You are in early. The students will be so excited to see you. Okay, no, that was a lie. But I am glad you are here.'],
    ['walt', 'I am only passing by, Ms. Chalkwell. I forgot my pens.'],
    ['teacher', 'You look tired. Have you been to see anyone?'],
    ['walt', 'I have been to see everyone.']
  ],
  jimmyFirst: [
    ['jimmy', 'Yo, Mr. White-wash! You came! I knew it, I told everyone, I said Mr. Whitewash is gonna cook. Bro, this RV is so sick.'],
    ['walt', 'Jimmy. Never say my name out loud. And it is not "sick." It is a mobile laboratory with a leak in the roof.'],
    ['jimmy', 'Okay, okay. So, you buy the stuff at the supply store, bring it here, and we cook. I handle the, uh, vibes.'],
    ['walt', 'You handle the vibes. Fine. Measure, heat, filter. We do this the right way, or we do not do this.']
  ],
  jimmyNoStuff: [
    ['jimmy', 'Yo. Uh. We need ingredients first. Supply store, down the road. Eight hundred a batch. Bring it and I will be here, being supportive.']
  ],
  jimmyTips: [
    [['jimmy', 'Sell it to the corner guys. Anybody with a dollar sign over their head. Do not do it in front of a cop. Pretty sure that is in the rules.']],
    [['jimmy', 'The car wash takes a quarter. A quarter! Sol says it is a "very reasonable laundering coefficient." Whatever that means.']],
    [['jimmy', 'Better purity, better price. Ninety-nine percent is blue. Blue is, like, a brand. You are a brand, Mr. White-wash.']],
    [['jimmy', 'Rivals hang out in the desert. If they come at you, hit them with your wrench. Or the pistol. I would pick the pistol.']]
  ],
  solFirst: [
    ['sol', 'Walter Whitewash! The man, the myth, the cough. Sol Goodgirl, attorney at car wash. Do you have a minute? Or, more importantly, do you have a minimum?'],
    ['walt', 'I have a lot of money that is not exactly mine, and a need for it to become mine.'],
    ['sol', 'Beautiful. Hand it to me in the bay, I will say it was a very busy week for hot wax. I keep a quarter. The government keeps the rest of its questions.'],
    ['sol', 'Three grand a day through the front bays. We add bays, we add grand. It is a growth industry.']
  ],
  solWelcome: [['sol', 'Welcome back to the Whitewash Auto Spa. Where everything comes out clean. Everything.']],
  gus: [
    [['gus', 'Mr. Whitewash. Sit. Eat. The chicken is excellent. Everything I do is excellent.'],
     ['gus', 'I have heard of your product. They say it is blue. I do not believe it. Prove it. Three bricks at seventy percent, by the east gate.'],
     ['walt', 'And if I do?'], ['gus', 'Then we will talk about what it is you want. Everyone wants something.']],
    [['gus', 'Mr. Whitewash. Good. You are punctual. I respect that.'],
     ['gus', 'My organization has a problem. A rival crew from the desert is cutting into my corners. They are loud. I do not like loud.'],
     ['walt', 'And you want me to handle it?'], ['gus', 'I want you to cook. The crew will handle itself, in time.']],
    [['gus', 'You have a visitor. A DEA agent named Schrodinger has been parked outside the restaurant. He is on the phone with his wife. It is... touching.'],
     ['walt', 'Hank is my brother-in-law.'], ['gus', 'Then be careful at the dinner table. His coffee is better than his instincts.']],
    [['gus', 'Four days. You have the numbers, I have mine. Between us we could own this city.'],
     ['walt', 'I am not interested in owning a city. I am interested in paying for a hospital.'], ['gus', 'Of course. That is what everyone says. Then the money starts to taste good.']],
    [['gus', 'It is the last day. I think you know what comes next. I have a laboratory under the desert. A hundred and fifty thousand dollars a day. It is yours, if you come to work for me.'],
     ['walt', 'And if I say no?'], ['gus', 'You will not say no. Come down. See it.']]
  ],
  gusReturn: [['gus', 'I am a patient man. But even I have a calendar.'], ['gus', 'Bring me the product, Mr. Whitewash. Not excuses.']],
  gusPaid: [['gus', 'Impeccable. As promised. The rest is in the envelope. Please, take some chicken.']],
  gusNoStuff: [['gus', 'You do not have what I asked for. We will not discuss anything else.']],
  hank: [['hank', 'Walter! Hey! Haha. You look like a guy who has not slept. Are you okay? Skyler says you have been cooking late. At the car wash? Seriously?'],
         ['walt', 'I have a lot on my plate, Hank.'], ['hank', 'We should have the boys over. Barbecue. I will bring the Schrader. I mean the, uh, Schrodinger. Still working on the name.']],
  hatch: [['gus', '(Through the intercom) Come down, Mr. Whitewash. The door is open.'], ['walt', 'This is it. Down the ladder, into the hole in the ground.']],
  hatchShut: [['walt', 'The hatch is welded shut. Whatever is down there, I am not ready for it. Not yet. Not until the money is in the bank, or the calendar runs out.']],
  bossIntro: [
    ['gus', 'You cook very well, Mr. Whitewash. But this is a business. And a business does not tolerate a man who thinks he is the owner.'],
    ['walt', 'I am not the owner. I am the one who knocks.'],
    ['gus', 'Then knock.']],
  bossHalf: [['gus', 'You are making this unnecessarily untidy.'], ['walt', 'Say my name.']],
  bossDown: [['gus', 'Do you know what it costs, to be a man like me?'], ['walt', 'I am not in danger, Gus. I am the danger.']],
  endWin: [
    ['narrator', 'The Superlab went quiet. Somewhere above, in the desert, a rattlesnake crossed the road and nobody stopped to watch.'],
    ['walt', 'I did it. I did all of it. And I did it for the family.'],
    ['narrator', 'That is what he told himself.']],
  endLate: [['narrator', 'Day Five ended. The clock ran out before the Superlab did. Albuquerky does not wait for a cough.']],
  bust: [['cop', 'Sir, step away from the RV. We have received a number of calls about a smell.'], ['walt', 'It is a chemistry experiment.'], ['cop', 'That is what they all say.']],
  customerBuy: [['customer', 'Yo. You the guy? The blue guy? I heard about you. I need one.']],
  customerNo: [['customer', 'You got nothin\'? Come on, man. Do not waste my time.']],
  customerHappy: [['customer', 'Oh man. Oh MAN. That is beautiful.']],
  noMoney: [['walt', 'I cannot afford that.']],
  needBricks: [['walt', 'I have nothing to sell. The bricks are the product. The product is the bricks.']],
  noIngredients: [['walt', 'No ingredients. I need a batch from the supply store before Jimmy and I can cook.']],
  tooLate: [['walt', 'It is too dark to cook. Even I need sleep. Home. Bed.']],
  tutorial: [
    ['Move', 'Left stick or WASD. Walk to the glowing markers. Press the interact button on any marker to use it.'],
    ['The loop', 'Buy ingredients at the supply store, cook at the RV, sell to the corner customers, launder at the car wash.'],
    ['Heat', 'Cops notice you when the heat is high or you do anything loud. Break their line of sight to cool off.'],
    ['Fight', 'Square / J / click hits. Hold aim and shoot with the pistol. Triangle / Q switches weapon.']
  ]
};

// the day summary and the one-liners at day's end
W.dayLines = ['A day like any other, which is the problem.', 'The numbers are moving. So is the cough.', 'Everybody has a limit. Yours has not arrived yet.', 'Four days in. You do not recognise the man in the mirror.', 'Tomorrow is the last day.'];

WW.world = W;
if (typeof module !== 'undefined') module.exports = W;
})();
