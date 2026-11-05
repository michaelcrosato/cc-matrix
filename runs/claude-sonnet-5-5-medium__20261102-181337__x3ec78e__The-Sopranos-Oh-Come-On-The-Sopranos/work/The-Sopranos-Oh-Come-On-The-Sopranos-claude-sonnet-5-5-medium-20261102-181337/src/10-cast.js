/* ---- 10-cast: HD Humanoids sized like Final Fight sprites, their moves and what each blow does ---- */
const BASE = { speedRef: 40, footSpread: 4 };
const CAST = {
  vic: { weapon: null, size: 2.3, build: 'bulky', hair: 'short', outfit: 'coat', sleeves: 'long', hunch: .1, colors: { skin: '#e2ac84', hair: '#2a1a14', cloth: '#2a3f6a', coat: '#2a3f6a', pants: '#1e1e28', boot: '#2a2018', belt: '#c8a040', trim: '#c8a040', glove: '#e2ac84' } },
  vicBat: { weapon: 'staff', size: 2.3, build: 'bulky', hair: 'short', outfit: 'coat', sleeves: 'long', hunch: .1, colors: { skin: '#e2ac84', hair: '#2a1a14', cloth: '#2a3f6a', coat: '#2a3f6a', pants: '#1e1e28', boot: '#2a2018', belt: '#c8a040', trim: '#c8a040', metal: '#b07a3a', glove: '#e2ac84' } },
  connie: { weapon: null, size: 2.0, build: 'heroic', hair: 'long', outfit: 'robe', sleeves: 'long', colors: { skin: '#e8b898', hair: '#4a2a1a', cloth: '#a83a5a', pants: '#a83a5a', boot: '#5a3a3a', trim: '#f0d8a0' } },
  doc: { weapon: null, size: 2.0, build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#e8c0a0', hair: '#7a5a3a', cloth: '#d8d0c0', coat: '#5a6a7a', pants: '#3a4252', boot: '#2a2630', trim: '#e8e0d0' } },
  sal: { weapon: null, size: 2.2, build: 'bulky', hair: 'bald', outfit: 'shirt', sleeves: 'short', colors: { skin: '#d8a078', hair: '#2a1a14', cloth: '#d8c040', pants: '#2a2a30', boot: '#201814', belt: '#201814' } },
  chris: { weapon: null, size: 2.1, build: 'heroic', hair: 'spiky', outfit: 'coat', sleeves: 'long', colors: { skin: '#e0b08a', hair: '#1a1a1e', cloth: '#7a2a2a', coat: '#1c1c24', pants: '#1c1c24', boot: '#101014', trim: '#c0c0c8' } },
  shopA: { weapon: null, size: 2.0, build: 'bulky', hair: 'bald', outfit: 'shirt', sleeves: 'short', colors: { skin: '#d8a078', hair: '#704a2a', cloth: '#f0eee4', pants: '#8a3a3a', boot: '#2a2420', belt: '#d8d0c0' } },
  shopB: { weapon: null, size: 2.0, build: 'chibi', hair: 'short', outfit: 'tunic', sleeves: 'short', hat: { style: 'cap', color: '#3a6a8a' }, colors: { skin: '#c89070', hair: '#2a2a2a', cloth: '#3a6a8a', pants: '#2a3040', boot: '#20202a' } },
  shopC: { weapon: null, size: 2.0, build: 'heroic', hair: 'long', outfit: 'shirt', sleeves: 'none', colors: { skin: '#e8b898', hair: '#c83a8a', cloth: '#1a1a22', pants: '#1a1a22', boot: '#a02a5a', trim: '#f0c850' } },
  shopD: { weapon: null, size: 2.0, build: 'bulky', hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#d0987a', hair: '#3a3a3e', cloth: '#6a6a4a', coat: '#4a4a3a', pants: '#2a2a30', boot: '#201c18' } },
  // the cast of bad ideas
  associate: { weapon: null, size: 2.15, build: 'heroic', hair: 'spiky', outfit: 'coat', sleeves: 'long', hunch: .2, colors: { skin: '#d8a078', hair: '#1a1a1e', cloth: '#7a3a3a', coat: '#3a3a4a', pants: '#2c2c3a', boot: '#1a1418', belt: '#b8b8c8' } },
  tracksuit: { weapon: null, size: 2.3, build: 'heroic', hair: 'short', outfit: 'shirt', sleeves: 'long', hat: { style: 'band', color: '#d83a2a' }, colors: { skin: '#e0ae88', hair: '#3a2a1a', cloth: '#d83a2a', pants: '#d83a2a', boot: '#f0f0f0', trim: '#f0f0f0' } },
  heavy: { weapon: null, size: 2.55, build: 'bulky', hair: 'bald', outfit: 'shirt', sleeves: 'none', hunch: .3, colors: { skin: '#b07850', cloth: '#2a2a30', pants: '#4a4a3a', boot: '#2a1a1a', belt: '#d8b040' } },
  shooter: { weapon: 'gun', size: 2.15, build: 'heroic', hair: 'short', outfit: 'coat', sleeves: 'long', hat: { style: 'cap', color: '#2a2a30' }, colors: { skin: '#d8a888', hair: '#4a3a2a', cloth: '#3a3a44', coat: '#26262e', pants: '#26262e', boot: '#14141a', metal: '#707078' } },
  dino: { weapon: null, size: 2.7, build: 'bulky', hair: 'bald', outfit: 'shirt', sleeves: 'short', colors: { skin: '#d49a78', hair: '#2a1a14', cloth: '#e8e4d8', pants: '#3a3a52', boot: '#241a18', belt: '#6a4a2a' } },
  johnny: { weapon: null, size: 2.65, build: 'bulky', outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#4a4a52' }, colors: { skin: '#dca880', hair: '#9a9aa2', cloth: '#6a2e3e', coat: '#8a8a94', trim: '#d8c070', pants: '#3a3a4a', boot: '#241a1a', belt: '#d8c070', glove: '#dca880' } }
};
// each foe fights its own way: strings of E.MOVES it picks from. The first blow winds up slowly (the telegraph); follow-ups come faster
const FOES = {
  associate: { name: 'ASSOCIATE', hp: 9, r: 6, speed: 50, wind: .26, moves: [['jab', 'cross'], ['jab', 'jab', 'cross']], cash: [5, 25], rig: 'associate' },
  tracksuit: { name: 'TRACKSUIT', hp: 13, r: 6, speed: 42, wind: .3, moves: [['roundhouse'], ['kick', 'roundhouse']], cash: [10, 40], rig: 'tracksuit' },
  heavy: { name: 'COLLECTOR', hp: 22, r: 8, speed: 30, wind: .38, moves: [['haymaker'], ['bash'], ['bash', 'haymaker']], cash: [20, 60], rig: 'heavy' },
  shooter: { name: 'SHOOTER', hp: 8, r: 6, speed: 34, wind: .5, moves: [['jab']], ranged: true, cash: [15, 45], rig: 'shooter' },
  dino: { name: 'FAT DINO', hp: 52, r: 9, speed: 38, wind: .3, moves: [['cross', 'hook', 'haymaker'], ['elbow', 'uppercut'], ['bash']], boss: true, cash: [200, 200], rig: 'dino', say: ["You know what your problem is? You count other people's envelopes.", "My mother, God rest her, she made a gravy. This? This is NOT gravy."] },
  johnny: { name: 'JOHNNY SALT', hp: 95, r: 9, speed: 44, wind: .26, moves: [['cross', 'hook', 'haymaker'], ['elbow', 'uppercut'], ['axekick'], ['roundhouse', 'sweep']], boss: true, phase2: true, cash: [500, 500], rig: 'johnny',
    say: ['Vic. Look at you. The big man. Standing in my yard, in the rain, like a lawn ornament.', "Business is business. Sunday is Sunday. Tonight? Tonight it's just you and me and the barrels."] }
};
const TUNE = { kick: { reach: .1, r0: 0, r1: 6.5, z0: .9, z1: 1.1 }, roundhouse: { reach: .1, r0: 0, r1: 8.5, a0: 2.6, z0: .15, hold: .12, twist: 2.2, hitAt: .5 },
  sweep: { reach: .1, r0: 0, r1: 7.5, a0: 1.1, a1: -.45, active: .22, hold: .6, lean: 0 }, axekick: { reach: .1, r0: 2, r1: 5, z1: .15, hitAt: .06, lean: -.5 },
  hook: { reach: 5.4, a0: 1.9 }, bash: { plane: 'side', a0: 2, a1: -.4 }, haymaker: { a0: 2.7, z0: -2 } };
const GRAB = { name: 'grab', rel: true, hand: 'L', a0: .3, a1: .05, z0: -1, z1: .4, r0: 3, r1: 6, wind: .06, active: .08, recover: .3, hold: .9, lunge: .8, blade: 0, hitAt: .4 };
const move = (m, o) => new E.Attack(m, Object.assign({}, TUNE[m], o));
// [damage, knockback, lift]: a lift takes the target off its feet. A foe string's early blows only rock the hero
const BLOW = { jab: [2, 10, 0], cross: [2, 15, 0], hook: [3, 25, 0], uppercut: [4, 110, 220], knee: [3, 0, 0], elbow: [3, 110, 0], kick: [3, 35, 0], roundhouse: [4, 130, 160],
  flyingkick: [4, 130, 170], sweep: [3, 50, 120], haymaker: [6, 120, 180], bash: [5, 160, 0], axekick: [6, 15, 70], slash: [5, 70, 0], backslash: [5, 90, 60], overhead: [9, 70, 170], grab: [0, 0, 0], rage: [10, 200, 220] };
const rig = (id, extra) => new E.Humanoid(Object.assign({}, BASE, CAST[id], extra || {}));
const heroMoves = () => ({ punch: new E.Combo(['jab', 'cross', move('hook'), 'uppercut'], { window: .35 }), clinch: new E.Combo([GRAB, 'knee', 'knee', 'elbow'], { window: .35 }),
  kick: new E.Combo([move('kick'), move('roundhouse')], { window: .35 }), fly: new E.Attack('flyingkick'), bat: new E.Combo(['backslash', 'slash', 'overhead'], { window: .4 }), rage: move('haymaker', { wind: .05, recover: .2 }) });
// the little sprites: cash envelope, capicola sandwich (heals), bat, duck, shell casing
const ENVELOPE = E.sprite(['wwwwwwwwww', 'wWwwwwwwWw', 'wwWwwwwWww', 'wwwWwwWwww', 'wwwwWWwwww', 'wwwwwwwwww', 'gggggggggg'], { w: '#f2ead0', W: '#b8a878', g: '#3a8a3a' }, 2);
const SANDWICH = E.sprite(['..bbbbbb..', '.bBBBBBBb.', 'bBBBBBBBBb', 'rrrrrrrrrr', 'wwwwwwwwww', 'rrrrrrrrrr', 'bbbbbbbbbb', '.bBBBBBBb.'], { b: '#8a5a2a', B: '#c8924a', r: '#b83a3a', w: '#f4ecd8' }, 2);
const BATSPR = E.sprite(['......bb', '.....bBb', '....bBb.', '...bBb..', '..bBb...', '.bBb....', 'bBb.....', 'dd......'], { b: '#6a4220', B: '#c8924a', d: '#2a1a0a' }, 2);
const DUCK = E.sprite(['....gggg....', '...gGGGGg...', '...gGgGGg.oo', '....gGGGgoo.', '.wwwwwwwg...', 'wwwwwwwwww..', 'wwWWwwwwww..', '.wwwwwwww...'], { g: '#2a6a3a', G: '#3a9a50', o: '#e89a2a', w: '#f4f0e0', W: '#c8c0a8' }, 2);
const BOXSPR = {};
