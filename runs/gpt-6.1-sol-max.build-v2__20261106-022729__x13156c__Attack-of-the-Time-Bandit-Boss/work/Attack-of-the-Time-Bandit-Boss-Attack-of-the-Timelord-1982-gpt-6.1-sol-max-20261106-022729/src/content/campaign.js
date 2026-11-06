export const TITLE = "Attack of the Time Bandit Boss";
export const ARENA = Object.freeze({
  w: 640,
  h: 360,
  left: 38,
  right: 602,
  lane: 304,
});
export const DEFAULTS = Object.freeze({
  playerSpeed: 220,
  fireInterval: 0.13,
  missileSpeed: 76,
  mineTurn: 1.05,
  rollerSpeed: 64,
  prediction: 0.72,
  enemyInterval: 2.5,
  brakeDuration: 1.6,
  slowFactor: 0.35,
  chargeGain: 1,
  shotSpeed: 760,
});
export const TUNING = [
  ["playerSpeed", "Machine speed", 120, 360, 10, " u/s"],
  ["fireInterval", "Cannon rearm", 0.07, 0.4, 0.01, " s"],
  ["missileSpeed", "Dart speed", 35, 150, 5, " u/s"],
  ["mineTurn", "Seeker turn", 0.25, 2.5, 0.05, " rad/s"],
  ["rollerSpeed", "Ground sweep speed", 25, 110, 5, " u/s"],
  ["prediction", "Hunter prediction", 0.2, 1.4, 0.05, " s"],
  ["enemyInterval", "Attack interval", 1, 5, 0.1, " s"],
  ["brakeDuration", "Brake duration", 0.8, 3, 0.1, " s"],
  ["slowFactor", "Hostile time factor", 0.2, 0.7, 0.05, " ×"],
  ["chargeGain", "Charge multiplier", 0.5, 2, 0.1, " ×"],
];
export const WEAPONS = Object.freeze({
  dart: { score: 2, charge: 10, r: 5, color: "#e9f5ff", name: "Falling dart" },
  mine: {
    score: 4,
    charge: 15,
    r: 8,
    color: "#ff647e",
    name: "Antimatter seeker",
  },
  roller: { score: 8, charge: 20, r: 8, color: "#b6ff72", name: "Annihilator" },
  hunter: {
    score: 16,
    charge: 24,
    r: 8,
    color: "#ffd674",
    name: "Time Killer",
  },
});
export const ROUTES = [
  [
    [320, 65],
    [455, 98],
    [532, 151],
    [405, 202],
    [212, 176],
    [118, 112],
    [242, 109],
  ],
  [
    [320, 65],
    [182, 97],
    [103, 151],
    [229, 203],
    [420, 177],
    [520, 112],
    [400, 109],
  ],
  [
    [320, 62],
    [470, 90],
    [495, 180],
    [325, 216],
    [149, 161],
    [177, 91],
    [300, 131],
  ],
];
// Declarative authored waves. Spawn times, routes, composition, tells and narration live here.
export const WAVES = [
  {
    name: "Borrowed seconds",
    ships: 18,
    hp: 2,
    routes: [0],
    speed: 29,
    interval: 1.5,
    mix: ["dart"],
    cue: "SLIDE. HOLD FIRE. SHOOT THE DARTS.",
    line: "Your century is overdue. I have come to collect!",
    color: "#66e5f2",
    hints: [[12, "Intercept weapons to charge the time brake."]],
  },
  {
    name: "Interest in red",
    ships: 20,
    hp: 2,
    routes: [1, 0],
    speed: 32,
    interval: 1.38,
    mix: ["dart", "mine", "dart"],
    cue: "SEEKERS TURN SLOWLY. BAIT THE CURVE.",
    line: "I ordered obedient mines. Apparently they take suggestions.",
    color: "#ff7c99",
    hints: [[16, "A full meter buys a moment. Press BRAKE when ready."]],
  },
  {
    name: "Cross purposes",
    ships: 22,
    hp: 2,
    routes: [2, 1],
    speed: 34,
    interval: 1.28,
    mix: ["dart", "mine", "roller", "dart"],
    cue: "BREAK THE CROSS BEFORE IT LANDS.",
    line: "Mind the floor. It is now aggressively rented.",
    color: "#b6ff72",
    hints: [
      [8, "Grounded crosses cannot be shot. Escape their marked sweep."],
      [24, "Time brake slows weapons. Your cannon stays quick."],
    ],
  },
  {
    name: "Bad predictions",
    ships: 24,
    hp: 2,
    routes: [0, 1],
    speed: 36,
    interval: 1.2,
    mix: ["dart", "hunter", "mine", "roller", "dart"],
    cue: "DIAMOND MARKS YOUR FUTURE. CHANGE IT.",
    line: "My diamonds predict everything. Except insubordination.",
    color: "#ffd674",
    hints: [[12, "The diamond commits after its aim mark. Change direction."]],
  },
  {
    name: "Compound chaos",
    ships: 26,
    hp: 3,
    routes: [1, 0, 2],
    speed: 38,
    interval: 1.14,
    mix: ["mine", "dart", "hunter", "dart", "roller", "mine"],
    cue: "MAKE A GAP. THEN TAKE THE SHOT.",
    line: "You are a very expensive rounding error.",
    color: "#ac99ff",
    hints: [],
  },
  {
    name: "The floor is late",
    ships: 28,
    hp: 3,
    routes: [2, 1, 0],
    speed: 39,
    interval: 1.08,
    mix: ["roller", "dart", "dart", "mine", "hunter", "dart"],
    cue: "READ THE SWEEP. KEEP AN EXIT.",
    line: "Stop moving! My accountant cannot aim.",
    color: "#b6ff72",
    hints: [],
  },
  {
    name: "Split second",
    ships: 30,
    hp: 3,
    routes: [0, 1, 2],
    speed: 41,
    interval: 1.03,
    mix: ["hunter", "mine", "dart", "roller", "dart", "mine"],
    cue: "COVER THE SKY. SHARE THE BRAKE.",
    line: "One timeline. Several pests. Entirely unfair.",
    color: "#ffb47b",
    hints: [],
  },
  {
    name: "The final invoice",
    ships: 32,
    hp: 3,
    routes: [2, 0, 1],
    speed: 43,
    interval: 1,
    mix: ["dart", "mine", "hunter", "roller", "mine", "dart", "hunter"],
    cue: "EVERY SECOND YOU STOLE IS YOURS.",
    line: "Fine! I shall handle this disgrace personally!",
    color: "#69e7f5",
    hints: [],
  },
].map((w, i) =>
  Object.freeze({
    ...w,
    index: i,
    firstAttack: 4.8,
    spacing: 0.18,
    warning: 0.72,
    groupSize: 8,
  }),
);
export const BOSS_PHASES = [
  {
    name: "The collector",
    hp: 34,
    open: 5,
    closed: 2.6,
    interval: 1.35,
    mix: ["dart", "mine", "dart"],
    color: "#69e7f5",
    line: "Behold my flawless face! Kindly miss it.",
  },
  {
    name: "Hostile takeover",
    hp: 42,
    open: 4.5,
    closed: 2.8,
    interval: 1.15,
    mix: ["roller", "mine", "hunter", "dart"],
    color: "#ff7b9a",
    line: "That was my good side. Both sides are my good side!",
  },
  {
    name: "Overtime",
    hp: 48,
    open: 4,
    closed: 2.5,
    interval: 1,
    mix: ["hunter", "dart", "mine", "roller", "dart"],
    color: "#ffd674",
    line: "I demand a second opinion! And all your seconds!",
  },
];
export const QUIPS = {
  intercept: [
    "That missile was nonrefundable!",
    "Stop editing my perfectly good future.",
    "A lucky shot. Repeatedly.",
  ],
  brake: [
    "You cannot put a tyrant on hold!",
    "Why is everything taking so loooong?",
  ],
  hurt: ["A small deduction from your existence!", "Ah! A punctual explosion."],
  clear: [
    "My fleet was on a break. Clearly.",
    "An unacceptable display of competence.",
    "You have my reluctant, temporary respect.",
  ],
  victory: "You win this time. I shall appeal yesterday!",
  defeat: "Your time is up. Mine is billable.",
};
export function validateContent() {
  const errors = [];
  if (WAVES.length !== 8 || BOSS_PHASES.length !== 3)
    errors.push("Campaign requires eight waves and three finale phases");
  for (const [i, w] of WAVES.entries()) {
    if (
      w.index !== i ||
      w.ships < 1 ||
      !w.mix.length ||
      !w.routes.every((r) => ROUTES[r])
    )
      errors.push("Invalid wave " + i);
    if (!w.mix.every((k) => WEAPONS[k])) errors.push("Unknown weapon " + i);
  }
  for (const path of ROUTES)
    if (
      path.length < 4 ||
      !path.every((p) => p.length === 2 && p.every(Number.isFinite))
    )
      errors.push("Invalid route");
  for (const [k, v] of Object.entries(DEFAULTS))
    if (!Number.isFinite(v) || v <= 0) errors.push("Invalid default " + k);
  return errors;
}
