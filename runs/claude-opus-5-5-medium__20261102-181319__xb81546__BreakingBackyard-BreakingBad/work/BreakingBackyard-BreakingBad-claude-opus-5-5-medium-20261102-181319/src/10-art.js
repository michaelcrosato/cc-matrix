/* ---------------- art: shapes as data (drawn in every view and facing), the cast's rigs ---------------- */
E.MATERIALS.rvbody = { color: '#e8dcc0', pattern: 'metal' };
E.MATERIALS.rvstripe = { color: '#8a5a2a', pattern: 'none' };
E.MATERIALS.glassdark = { color: '#28343c', pattern: 'glaze' };
E.MATERIALS.rubber = { color: '#1c1a1a', pattern: 'none' };
E.MATERIALS.chrome = { color: '#b8c0c8', pattern: 'metal' };
E.MATERIALS.carred = { color: '#9a2a24', pattern: 'glaze' };
E.MATERIALS.carblue = { color: '#2a4a7a', pattern: 'glaze' };
E.MATERIALS.cargreen = { color: '#4a6a3a', pattern: 'glaze' };
E.MATERIALS.carwhite = { color: '#d8d4cc', pattern: 'glaze' };
E.MATERIALS.caryellow = { color: '#c8a030', pattern: 'glaze' };
E.MATERIALS.blueglow = { color: '#58c8f0', pattern: 'glaze', glow: 1 };
E.MATERIALS.labsteel = { color: '#a8b0b4', pattern: 'metal', rivet: true };
E.MATERIALS.hazmat = { color: '#e0c020', pattern: 'cloth' };
E.MATERIALS.neonred = { color: '#ff5040', pattern: 'none', glow: 1 };

E.SHAPES.rv = { about: 'old tan RV with a brown stripe', tags: 'vehicle', mats: { b: 'rvbody', s: 'rvstripe', g: 'glassdark', t: 'rubber', c: 'chrome' },
  parts: [['box','b',[0,0,5],[22,52,22]], ['box','s',[0,0,13],[22.4,52.4,3]], ['box','b',[0,24,5],[21,8,14]],
    ['box','g',[0,28.2,12],[18,1,6]], ['mirror','x',['box','g',[11.2,-6,17],[.5,10,5]]], ['mirror','x',['box','g',[11.2,14,17],[.5,6,5]]],
    ['mirror','xy',['cyl','t',[11,17,0],4.5,3,{rot:[0,90,0]}]], ['box','c',[0,29,5],[22,1.5,2.5]], ['box','b',[0,-6,27],[10,10,3]]] };
E.SHAPES.sedan = { about: 'boxy sedan', tags: 'vehicle', mats: { b: 'carblue', g: 'glassdark', t: 'rubber', c: 'chrome' },
  parts: [['box','b',[0,0,3],[16,34,8]], ['box','g',[0,-1,11],[14,16,6]], ['box','b',[0,-1,16.5],[14,13,1.5]],
    ['mirror','xy',['cyl','t',[8,10,0],3.5,2.5,{rot:[0,90,0]}]], ['box','c',[0,17.2,4],[16,.8,2]], ['box','c',[0,-17.2,4],[16,.8,2]]] };
E.SHAPES.pickup = { about: 'beat-up pickup truck', tags: 'vehicle', mats: { b: 'cargreen', g: 'glassdark', t: 'rubber', r: 'rusted' },
  parts: [['box','b',[0,6,3],[17,22,9]], ['box','g',[0,2,12],[15,9,7]], ['box','b',[0,2,19],[15,9,1]], ['box','r',[0,-10,3],[17,14,6]],
    ['mirror','xy',['cyl','t',[8.5,11,0],3.8,2.5,{rot:[0,90,0]}]]] };
E.SHAPES.labtable = { about: 'steel lab table with flasks', tags: 'lab', mats: { s: 'labsteel', g: 'blueglow', c: 'glazed' },
  parts: [['box','s',[0,0,11],[28,12,2]], ['mirror','xy',['box','s',[12,4.5,0],[1.5,1.5,11]]],
    ['lathe','c',[-7,0,13],[[0,0],[4,0],[4,2],[1.2,7],[1.2,9],[0,9]]], ['lathe','g',[4,1,13],[[0,0],[3,0],[3,4],[1,6],[0,6]]], ['cyl','c',[10,-2,13],1.5,8]] };
E.SHAPES.tank = { about: 'steel reactor tank', tags: 'lab industrial', mats: { s: 'labsteel', g: 'blueglow', p: 'steel' },
  parts: [['cyl','s',[0,0,0],9,34,{seg:12}], ['cyl','s',[0,0,34],9,5,{r2:3,seg:12}], ['cyl','p',[0,0,39],1.5,10], ['box','g',[0,9.2,12],[4,1,10]], ['ring',4,8,['box','p',[0,0,0],[2,2,6]]]] };
E.SHAPES.washer = { about: 'industrial washing machine', tags: 'laundry industrial', mats: { s: 'porcelain', d: 'chrome', g: 'glassdark' },
  parts: [['box','s',[0,0,0],[16,16,20]], ['cyl','d',[0,8.4,10],6,1,{rot:[90,0,0]}], ['cyl','g',[0,8.9,10],4.5,1,{rot:[90,0,0]}], ['box','d',[0,0,20],[16,16,1.5]]] };
E.SHAPES.drum = { about: 'blue chemical drum', tags: 'lab container', mats: { b: 'carblue', r: 'steel' },
  parts: [['cyl','b',[0,0,0],6,17,{seg:12}], ['row',2,[0,0,10],['cyl','r',[0,0,3],6.3,1,{seg:12}]]] };
E.SHAPES.vending = { about: 'soda vending machine', tags: 'town', mats: { b: 'carred', g: 'blueglow', w: 'carwhite' },
  parts: [['box','b',[0,0,0],[14,10,28]], ['box','g',[-2,5.2,10],[7,.5,14]], ['box','w',[4.5,5.2,14],[3,.5,8]]] };
E.SHAPES.dumpster = { about: 'green dumpster', tags: 'town', mats: { b: 'cargreen', l: 'rubber' },
  parts: [['box','b',[0,0,2],[28,14,14]], ['wedge','l',[0,0,16],[28,14,3]], ['mirror','xy',['cyl','l',[12,5,0],1.8,2]]] };
E.SHAPES.mailbox = { about: 'curbside mailbox', tags: 'town', mats: { p: 'walnut', b: 'steel' },
  parts: [['box','p',[0,0,0],[2,2,12]], ['box','b',[0,0,12],[4,8,4]], ['cyl','b',[0,0,16],2,8,{rot:[90,0,0],sq:1}]] };
E.SHAPES.grill = { about: 'backyard kettle grill', tags: 'backyard', mats: { k: 'iron', l: 'steel' },
  parts: [['ring',3,3,['box','l',[0,0,0],[1,1,10]]], ['lathe','k',[0,0,9],[[0,0],[5,1],[6.5,4],[6.5,6],[0,6]]], ['lathe','k',[0,0,15],[[6.5,0],[5,3],[0,4]]]] };
E.SHAPES.pool = { about: 'small backyard pool', tags: 'backyard', mats: { w: 'water', c: 'marble' },
  parts: [['box','c',[0,0,0],[44,28,2]], ['box','w',[0,0,1.6],[40,24,.8]]] };
E.SHAPES.desk = { about: 'office desk', tags: 'office', mats: { t: 'walnut', m: 'steel' },
  parts: [['box','t',[0,0,10],[28,14,2]], ['mirror','x',['box','t',[12,0,0],[3,13,10]]], ['box','m',[6,0,12],[6,4,4]]] };

/* ---------------- the cast (original characters, each in their own colors) ---------------- */
const RIGS = {
  hollis: (alias = false, gun = false) => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: gun ? 'gun' : null, outfit: alias ? 'coat' : 'shirt', hair: alias ? 'bald' : 'short', sleeves: alias ? 'long' : 'short',
    hat: alias ? { style: 'cap', color: '#161616' } : null, face: { bangs: 0 },
    colors: { skin: '#e2b08c', hair: '#8a7a68', cloth: alias ? '#3a3a3a' : '#b8b07a', coat: '#2a2a2a', pants: alias ? '#3a3632' : '#5a5244', boot: '#3a2c22', belt: '#2a2018', eye: '#2a2a2a', metal: '#3a3a3a' } }),
  dusty: () => new E.Humanoid({ size: 1.25, build: 'heroic', weapon: 'gun', outfit: 'coat', hair: 'short', hat: { style: 'band', color: '#3a3a42' }, sleeves: 'long',
    colors: { skin: '#eac0a0', hair: '#5a4028', cloth: '#d8c040', coat: '#c8452e', pants: '#344466', boot: '#e8e8e8', trim: '#f0f0f0', eye: '#3a5a8a' } }),
  lenny: () => new E.Humanoid({ size: 1.25, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long',
    colors: { skin: '#e8b898', hair: '#4a3020', cloth: '#f0e0a0', coat: '#5a78b8', pants: '#5a78b8', trim: '#e8c040', boot: '#4a2a1a' } }),
  vela: () => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', sleeves: 'long',
    colors: { skin: '#9a6a4a', hair: '#1a1410', cloth: '#f2f0e8', pants: '#3a3a40', trim: '#c8a040', boot: '#1a1a1a', eye: '#1a1a1a' } }),
  dale: () => new E.Humanoid({ size: 1.35, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'short',
    colors: { skin: '#e0a888', cloth: '#7a8a5a', pants: '#3a3a3a', boot: '#2a1a12', belt: '#5a3a1a' } }),
  skyler: () => new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'long', sleeves: 'long',
    colors: { skin: '#f0c8a8', hair: '#d8b060', cloth: '#5a7a9a', pants: '#3a3040', boot: '#3a2a20' } }),
  rafa: () => new E.Humanoid({ size: 1.3, build: 'bulky', weapon: 'gun', outfit: 'shirt', hair: 'bald', sleeves: 'none',
    colors: { skin: '#b07a52', cloth: '#e8e8e0', pants: '#2a3a5a', trim: '#e8c040', boot: '#1a1a1a', metal: '#c0c0c8' } }),
  mack: () => new E.Humanoid({ size: 1.35, build: 'heroic', weapon: 'gun', outfit: 'coat', hair: 'bald', sleeves: 'long',
    colors: { skin: '#d8a888', coat: '#6a604e', cloth: '#9a9080', pants: '#4a4438', boot: '#2a2018', metal: '#3a3a3a' } }),
  thug: (i = 0) => new E.Humanoid({ size: 1.25, build: i % 3 === 2 ? 'bulky' : 'heroic', weapon: i % 2 ? 'gun' : null, outfit: 'shirt', hair: i % 3 === 1 ? 'bald' : 'short',
    hat: i % 3 === 0 ? { style: 'band', color: '#e8e8e8' } : null, sleeves: 'none',
    colors: { skin: ['#b07a52', '#8a5a3a', '#c89070'][i % 3], cloth: ['#e8e8e0', '#2a2a2a', '#7a2a2a'][i % 3], pants: ['#3a4a6a', '#5a5040', '#2a2a2a'][i % 3], boot: '#1a1a1a', metal: '#2a2a2a', hair: '#1a1410' } }),
  cousin: (i = 0) => new E.Humanoid({ size: 1.55, build: 'bulky', weapon: 'sword', outfit: 'coat', hair: 'bald', sleeves: 'long', eyeGlow: false,
    colors: { skin: i ? '#a87452' : '#9a6a48', coat: '#8a9098', cloth: '#1a1a1a', pants: '#8a9098', boot: '#3a2a1a', trim: '#e8e0d0', metal: '#d0d4d8', hilt: '#3a2a1a' } }),
  agent: (i = 0) => new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#1a2a4a' }, sleeves: 'long',
    colors: { skin: ['#e0b090', '#9a6a4a', '#d8a080'][i % 3], coat: '#24345a', cloth: '#d8d8d0', pants: '#2a2a30', trim: '#e8d040', boot: '#1a1a1a' } }),
  buyer: (i = 0) => new E.Humanoid({ size: 1.2, build: 'chibi', weapon: null, outfit: ['shirt', 'coat', 'tunic'][i % 3], hair: ['spiky', 'long', 'short', 'ponytail'][i % 4], sleeves: 'short',
    colors: { skin: ['#e8c0a0', '#a87452', '#d8a080', '#7a4a32'][i % 4], cloth: ['#6a8a4a', '#8a4a8a', '#c8783a', '#4a6a8a'][i % 4], coat: ['#4a4a4a', '#6a3a2a', '#3a4a3a'][i % 3], pants: '#3a3a4a', hair: ['#2a1a10', '#d8a050', '#5a3a20', '#1a1a1a'][i % 4] } })
};
const PORTRAIT_BG = '#2a1e14';
const SPEAKERS = {};   // name -> { rig, voice }, made once
const speaker = (id) => {
  if (!SPEAKERS[id]) SPEAKERS[id] = { rig: (RIGS[id] || RIGS.thug)(), voice: 'vox_' + (VOICES[id] ? id : 'thug') };
  return SPEAKERS[id];
};

/* small sprites: cash, product, flasks, the heat badge */
const SPR = {
  cash: E.sprite(['.gggggg.', 'gGGGGGGg', 'gGg$$gGg', 'gGGGGGGg', '.gggggg.'], { g: '#2a6a2a', G: '#5ab04a', $: '#e8f0c0' }, 1),
  baggie: E.sprite(['.www.', 'wbbbw', 'wbBbw', 'wbbbw', '.www.'], { w: '#e8f0f8', b: '#58c8f0', B: '#c8f4ff' }, 1),
  flaskF: E.sprite(['..g..', '..g..', '.ggg.', 'gYYYg', 'gYyYg', '.ggg.'], { g: '#c8e0e8', Y: '#f0d040', y: '#fff8b0' }, 1),
  flaskS: E.sprite(['..g..', '..g..', '.ggg.', 'gPPPg', 'gPpPg', '.ggg.'], { g: '#c8e0e8', P: '#a070d0', p: '#e0c8ff' }, 1),
  badge: E.sprite(['.yyy.', 'yYYYy', 'yYrYy', 'yYYYy', '.yyy.'], { y: '#b08a20', Y: '#f0c840', r: '#c83020' }, 1),
  badgeOff: E.sprite(['.ddd.', 'dDDDd', 'dDDDd', 'dDDDd', '.ddd.'], { d: '#3a3430', D: '#5a524a' }, 1),
  heart: E.sprite(['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'], { r: '#a02020', R: '#e84a3a' }, 1)
};
