/* Open Table Second Opinion — title, tuning, and the strings the page and the Hub share. */
(() => {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const GAME = (G.GAME ||= {});
  const GAME_TITLE = 'Open Table Second Opinion';
  const RUN = 'grok-4.7-xhigh-20261104-223916';

  const TUNING = {
    patient: { drain: 1, slip: 1, healing: 1, syringe: 18, clock: 1 },
    hands: { cursor: 330, fine: 0.35, curve: 1.7, assist: 0.6, magnet: 22, grade: 1 },
    strains: { speed: 1, health: 1, spawn: 1, damage: 1, beat: 0.5 },
    gift: { charge: 1, breathDrain: 16, breathFactor: 0.25, lookSeconds: 6 },
    fluids: { bleed: 1, suction: 60, cauteryHeat: 0.5 },
  };

  const TOOLS = ['forceps', 'scalpel', 'suture', 'salve', 'syringe', 'cautery', 'suction', 'sonar'];
  /* Stick y is negative toward the top of the field. Clockwise from north. */
  const WHEEL = [
    { tool: 'forceps', x: 0, y: -1 },
    { tool: 'scalpel', x: 1, y: -1 },
    { tool: 'suture', x: 1, y: 0 },
    { tool: 'salve', x: 1, y: 1 },
    { tool: 'syringe', x: 0, y: 1 },
    { tool: 'cautery', x: -1, y: 1 },
    { tool: 'suction', x: -1, y: 0 },
    { tool: 'sonar', x: -1, y: -1 },
  ];

  function cloneTune(t) {
    return {
      patient: Object.assign({}, t.patient),
      hands: Object.assign({}, t.hands),
      strains: Object.assign({}, t.strains),
      gift: Object.assign({}, t.gift),
      fluids: Object.assign({}, t.fluids),
    };
  }

  GAME.CFG = {
    GAME_TITLE, RUN,
    FILE: 'Open-Table-Second-Opinion-Trauma-Center-Second-Opinion-' + RUN,
    TUNING, TOOLS, WHEEL, cloneTune,
    FIELD_W: 426, FIELD_H: 240, CX: 213, CY: 116, RX: 171, RY: 91,
    SEAT: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'],
  };
  GAME.TUNE = cloneTune(TUNING);
  const DEV_KEYS = [
    ['patient.drain', 0, 3], ['patient.slip', 0, 3], ['patient.healing', 0, 3], ['patient.syringe', 0, 40], ['patient.clock', 0.2, 2],
    ['hands.cursor', 80, 500], ['hands.fine', 0.15, 1], ['hands.curve', 1, 3], ['hands.assist', 0, 1.4], ['hands.magnet', 0, 48], ['hands.grade', 0.5, 2],
    ['strains.speed', 0.2, 2], ['strains.health', 0.25, 2], ['strains.spawn', 0.2, 2], ['strains.damage', 0.2, 2], ['strains.beat', 0.2, 1.2],
    ['gift.charge', 0.2, 2], ['gift.breathDrain', 4, 40], ['gift.breathFactor', 0.1, 1], ['gift.lookSeconds', 1, 8],
    ['fluids.bleed', 0.2, 2], ['fluids.suction', 10, 120], ['fluids.cauteryHeat', 0.15, 1.2],
  ];
  function devSet(path, value) {
    const [g, k] = path.split('.');
    if (!GAME.TUNE[g] || !(k in GAME.TUNE[g])) return false;
    GAME.TUNE[g][k] = value;
    GAME.TUNE.dirty = true;
    return true;
  }
  function devReset() {
    const next = cloneTune(TUNING);
    for (const g of Object.keys(next)) Object.assign(GAME.TUNE[g], next[g]);
    GAME.TUNE.dirty = false;
  }
  function devCheat(S, key, on) {
    S.cheat = S.cheat || {};
    S.cheat[key] = !!on;
    return S.cheat;
  }
  GAME.Dev = { KEYS: DEV_KEYS, set: devSet, reset: devReset, cheat: devCheat, defaults: TUNING };
})();
