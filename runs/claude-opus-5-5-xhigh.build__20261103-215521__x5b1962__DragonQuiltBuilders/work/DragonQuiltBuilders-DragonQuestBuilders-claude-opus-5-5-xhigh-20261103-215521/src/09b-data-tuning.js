// Data: the gameplay variables exposed as live sliders in Dev Tools (key, label, min, max, step, default). Gameplay code
// reads DQ.tune(key) every time, so a slider takes effect at once.
(() => {
const DQ = globalThis.DQ;
DQ.TUNING_DEFS = [
  { key: 'walk', label: 'Walk speed', min: 40, max: 140, step: 2, def: 78 },
  { key: 'sprintMul', label: 'Sprint multiplier', min: 1, max: 2.5, step: .05, def: 1.45 },
  { key: 'jump', label: 'Jump velocity', min: 150, max: 320, step: 5, def: 215 },
  { key: 'gravity', label: 'Gravity', min: 400, max: 1400, step: 20, def: 800 },
  { key: 'reach', label: 'Reach (blocks)', min: 2, max: 8, step: .25, def: 4.5 },
  { key: 'builderAtk', label: 'Builder attack x', min: .25, max: 4, step: .05, def: 1 },
  { key: 'blockDmg', label: 'Block damage x', min: .25, max: 5, step: .05, def: 1 },
  { key: 'maxHpBase', label: 'Max HP base', min: 10, max: 200, step: 5, def: 40 },
  { key: 'bellyDrain', label: 'Belly drain x', min: 0, max: 4, step: .05, def: 1 },
  { key: 'monsterHp', label: 'Monster HP x', min: .25, max: 4, step: .05, def: 1 },
  { key: 'monsterDmg', label: 'Monster damage x', min: 0, max: 4, step: .05, def: 1 },
  { key: 'monsterSpeed', label: 'Monster speed x', min: .5, max: 2, step: .05, def: 1 },
  { key: 'aggro', label: 'Aggro radius (blocks)', min: 2, max: 20, step: .5, def: 8 },
  { key: 'maxMonsters', label: 'Max monsters', min: 0, max: 40, step: 1, def: 10 },
  { key: 'spawnNight', label: 'Spawn interval night (s)', min: 1, max: 30, step: .5, def: 5 },
  { key: 'spawnDay', label: 'Spawn interval day (s)', min: 1, max: 60, step: .5, def: 8 },
  { key: 'dayMinutes', label: 'Day length (min)', min: 2, max: 60, step: 1, def: 12 },
  { key: 'cheerMul', label: 'Cheer x', min: .25, max: 5, step: .05, def: 1 },
  { key: 'dropRate', label: 'Drop rate x', min: 0, max: 5, step: .05, def: 1 },
  { key: 'siegeSize', label: 'Siege wave size x', min: .25, max: 3, step: .05, def: 1 },
  { key: 'helperRate', label: 'Helper build rate (blocks/min)', min: 0, max: 60, step: 1, def: 6 },
  { key: 'ballistaReload', label: 'Ballista reload (s)', min: .5, max: 6, step: .1, def: 2.5 },
  { key: 'tangleWindow', label: 'Tangle window (s)', min: 2, max: 20, step: .5, def: 8 }
];
})();
