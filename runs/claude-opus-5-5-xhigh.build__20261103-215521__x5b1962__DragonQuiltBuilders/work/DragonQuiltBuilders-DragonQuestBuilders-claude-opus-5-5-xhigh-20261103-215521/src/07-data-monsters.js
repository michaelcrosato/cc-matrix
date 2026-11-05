// Data: monsters and bosses (speeds in units/s, aggro in blocks), their moves with wind-up telegraphs, drops, siege waves.
(() => {
const DQ = globalThis.DQ;
DQ.MONSTERS = {
  lintling: { name: 'Lintling', body: 'blob', R: 6, colors: { base: '#b8b4c0', dk: '#8a8698', lt: '#e4e0ea', eye: '#2a2438' }, hp: 8, atk: 4, def: 1, speed: 34, aggro: 7,
    moves: { lunge: { wind: .35, range: 26, leap: 60, dmg: 1 } }, flee: .2, drops: { lint: 1, cotton: .15 }, voice: 'squeakHi', blockDmg: 3 },
  dyedLintling: { name: 'Dyed Lintling', body: 'blob', R: 6, colors: { base: '#e88ab8', dk: '#b85a88', lt: '#ffc8e0', eye: '#2a2438' }, hp: 16, atk: 7, def: 2, speed: 38, aggro: 8,
    moves: { lunge: { wind: .3, range: 26, leap: 70, dmg: 1, double: true } }, drops: { lint: 1, dyeRed: .25 }, voice: 'squeakHi', blockDmg: 3 },
  mothlet: { name: 'Mothlet', body: 'blob', R: 5, wings: true, fangs: true, colors: { base: '#9a8ac8', dk: '#6a5a98', lt: '#d0c8f0', eye: '#ffe0a0' }, hp: 10, atk: 6, def: 1, speed: 48, aggro: 10, fly: [18, 28], night: true,
    moves: { swoop: { wind: .4, range: 60, dive: 140, dmg: 1 } }, drops: { mothDust: 1 }, voice: 'flutter', blockDmg: 0 },
  pinhog: { name: 'Pinhog', body: 'blob', R: 7, pins: true, colors: { base: '#a87a5a', dk: '#7a5a3a', lt: '#d8a87a', eye: '#2a1a1a' }, hp: 22, atk: 9, def: 5, speed: 30, aggro: 8,
    moves: { roll: { wind: .6, range: 70, speed: 110, time: 1.2, dmg: 1, dizzy: 1.2 } }, drops: { pins: .8, pebble: .3 }, voice: 'snort', blockDmg: 6 },
  frayedKnight: { name: 'Frayed Knight', body: 'humanoid', rig: { size: 1.1, build: 'heroic', weapon: 'sword', bladeLen: 15, eyeGlow: '#b070ff', outfit: 'robe', hair: 'bald', face: { eyes: 'big' }, colors: { skin: '#e8dcc0', cloth: '#e8dcc0', trim: '#b8a888', pants: '#c8b898', metal: '#d8d8e8', hilt: '#6a5a4a', hair: '#e8dcc0' } },
    hp: 40, atk: 12, def: 8, speed: 40, aggro: 9, moves: { thrust: { wind: .3, range: 26, dmg: 1, move: 'thrust' }, spin: { wind: .35, range: 24, dmg: 1, move: 'spin', crowd: 2 } }, drops: { steelThread: .7, frayedScrap: .5 }, voice: 'hiss', blockDmg: 8, tall: 6 },
  knotbrute: { name: 'Knotbrute', body: 'humanoid', rig: { size: 1.4, build: 'bulky', weapon: null, hunch: .3, eyeGlow: '#ff4040', outfit: 'coat', hair: 'bald', face: { eyes: 'big' }, colors: { skin: '#2a2a48', cloth: '#2a2a48', coat: '#1e1e38', pants: '#1a1a30', hair: '#2a2a48', boot: '#141428' } },
    hp: 60, atk: 14, def: 6, speed: 26, aggro: 10, moves: { haymaker: { wind: .45, range: 26, dmg: 1, move: 'haymaker' }, charge: { wind: .5, range: 90, speed: 120, time: .9, dmg: 1.2 } }, drops: { blackYarn: 1 }, voice: 'grunt', blockDmg: 25, tall: 10, breaker: true },
  buttonGolem: { name: 'Sir Buttonsworth', body: 'humanoid', boss: true, rig: { size: 2, build: 'bulky', weapon: null, face: { eyes: 'big' }, outfit: 'coat', hair: 'bald', colors: { skin: '#c8a878', cloth: '#c8a878', coat: '#b89868', pants: '#a88858', hair: '#c8a878', boot: '#7a5a3a' } },
    hp: 220, atk: 14, def: 8, speed: 30, aggro: 30, drops: null, voice: 'buttonsworth', blockDmg: 30, tall: 24 },
  gnarlgrim: { name: 'Gnarlgrim the Knotted', body: 'humanoid', boss: true, rig: { size: 2.6, build: 'bulky', weapon: null, eyeGlow: '#ff40c0', cape: { len: 10, width: 8, seg: 3 }, hat: { style: 'crown', color: '#5a2a6a' }, outfit: 'coat', hair: 'bald', face: { eyes: 'big' }, colors: { skin: '#3a2a50', cloth: '#2a1a3a', coat: '#3a2a50', pants: '#1e1430', cape: '#2a1a3a', capeIn: '#5a2a6a', hair: '#2a1a3a', boot: '#140c20' } },
    hp: 600, atk: 18, def: 25, speed: 34, aggro: 40, drops: null, voice: 'gnarlgrim', blockDmg: 60, tall: 34 }
};
DQ.SIEGE_WAVES = [
  { name: 'Wave 1', from: ['east'], list: [['lintling', 8], ['dyedLintling', 3]] },
  { name: 'Wave 2', from: ['east', 'north'], list: [['lintling', 6], ['pinhog', 4], ['mothlet', 3]] },
  { name: 'Wave 3', from: ['east', 'rift'], list: [['lintling', 4], ['frayedKnight', 4], ['knotbrute', 3]] }
];
DQ.SIEGE_SPAWNS = { east: [96, 76], rift: [96, 80], north: [72, 52] };
})();
