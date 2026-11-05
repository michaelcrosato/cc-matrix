// Operation Wolfpack: core constants, live tuning values, difficulty presets and every visible string.
(() => {
const E = My3D2dge;
const WP = globalThis.WP = { STAGES: [], TYPES: {}, BOSSES: {} };
WP.W = 480; WP.H = 270;
WP.TITLE = 'Operation Wolfpack';
WP.SEAT = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
WP.SEATN = ['RED', 'BLUE', 'GREEN', 'GOLD'];
WP.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
WP.lerp = (a, b, t) => a + (b - a) * t;
WP.mulberry = a => () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// live tuning: [key, label, default, min, max, step, group]. The dev screen draws one slider for each.
WP.TUNING = [
  ['railSpeed', 'Rail speed', 1, .2, 2.5, .05, 'WORLD'],
  ['enemyRate', 'Enemy count', 1, .3, 3, .05, 'WORLD'],
  ['enemyHp', 'Enemy health', 1, .3, 4, .05, 'WORLD'],
  ['enemyAcc', 'Enemy accuracy', 1, 0, 2, .05, 'WORLD'],
  ['enemyDmg', 'Enemy damage', 1, 0, 3, .05, 'WORLD'],
  ['teleTime', 'Telegraph time', 1, .4, 2.5, .05, 'WORLD'],
  ['bossHp', 'Boss health', 1, .2, 3, .05, 'WORLD'],
  ['dropRate', 'Pickup drops', 1, 0, 3, .05, 'WORLD'],
  ['civPenalty', 'Civilian penalty', 1, 0, 3, .05, 'WORLD'],
  ['healClear', 'Heal on clear', 1, 0, 3, .05, 'WORLD'],
  ['fireRate', 'Fire rate', 1, .4, 2.5, .05, 'GUN'],
  ['playerDmg', 'Bullet damage', 1, .3, 5, .05, 'GUN'],
  ['magSize', 'Magazine size', 30, 5, 100, 1, 'GUN'],
  ['reloadTime', 'Reload seconds', 1.1, .2, 3, .05, 'GUN'],
  ['spare', 'Spare magazines', 4, 0, 12, 1, 'GUN'],
  ['grenades', 'Grenades', 3, 0, 9, 1, 'GUN'],
  ['grenRadius', 'Grenade radius', 1, .4, 3, .05, 'GUN'],
  ['furyTime', 'FURY seconds', 10, 2, 40, 1, 'GUN'],
  ['bloom', 'Bullet spread', 1, 0, 3, .05, 'AIM'],
  ['aimSpeed', 'Stick aim speed', 1, .3, 2.5, .05, 'AIM'],
  ['assist', 'Aim assist', .5, 0, 1, .05, 'AIM']
];
WP.opts = { autoReload: true };
WP.T = {};
WP.resetTuning = () => { for (const t of WP.TUNING) WP.T[t[0]] = t[2]; };
WP.resetTuning();
// difficulty presets multiply on top of the tuning values
WP.DIFFS = {
  RECRUIT: { acc: .65, dmg: .7, hp: .8, supply: 1.5, emergency: true, heal: 1.4 },
  VETERAN: { acc: 1, dmg: 1, hp: 1, supply: 1, emergency: true, heal: 1 },
  ARCADE: { acc: 1.3, dmg: 1.25, hp: 1.2, supply: .7, emergency: false, heal: .7 }
};

WP.TEXT = {
  tagline: 'THE PACK IS GOING IN',
  briefing: [
    'GENERAL HUGO KRAGG AND HIS HYENA LEGION',
    'HAVE TAKEN THE BRIMSTONE COAST.',
    'FIVE RELIEF WORKERS ARE HOSTAGES.',
    'NO ARMY WILL GO IN.',
    'SO THEY SENT THE PACK.'
  ],
  help: [
    ['AIM', 'Steer the crosshair. The camera rides the rail for you.'],
    ['FIRE', 'Hold to spray. Magazines run dry: reload by hand or let it auto-reload.'],
    ['GRENADE', 'Lobbed at the crosshair. Big blast, few of them.'],
    ['RINGS', 'A closing ring means that enemy is about to shoot. Kill it before it closes.'],
    ['SHOOT THE AIR', 'Knives, grenades, rockets and shells can be shot down.'],
    ['SUPPLIES', 'Shoot crates and spook the goats to make supplies drop. Shoot pickups to take them.'],
    ['INNOCENTS', 'Civilians and hostages cost you damage and points. Hold your fire.'],
    ['QUOTA', 'Fill the soldier, vehicle and aircraft counters, reach the end, then beat the boss.']
  ],
  ops: [
    { name: 'RADIO HILL', card: 'DESTROY THE ENEMY RADIO MASTS' },
    { name: 'MANGROVE RUN', card: 'SINK THE RIVER PATROL' },
    { name: 'PALM VILLAGE', card: 'CLEAR THE VILLAGE. SPARE THE VILLAGERS' },
    { name: 'THE KENNEL', card: 'BREAK THE HOSTAGES OUT' }
  ],
  radio: {
    'op1.go': ['DEN', 'OPERATION WOLFPACK IS GO. KNOCK DOWN THOSE MASTS.'],
    'op1.mast': ['DEN', 'ONE MAST DOWN. TWO TO GO.'],
    'op1.air': ['DEN', 'CHOPPER INBOUND. SHOOT THE ROCKETS OUT OF THE SKY.'],
    'op1.boss': ['DEN', 'THAT IS BIG EAR. HIT THE DISH ON THE ROOF.'],
    'op2.go': ['DEN', 'RIVER IS HOT. BOATS AHEAD. LOOK FOR THE GREEN CROSS CRATES.'],
    'op2.canoe': ['DEN', 'FISHERMEN ON THE WATER. DO NOT SHOOT THE FISHERMEN.'],
    'op2.boss': ['DEN', 'RIVER HOG. HIT THE BRIDGE. DUCK THE SHELLS. WELL, SHOOT THE SHELLS.'],
    'op3.go': ['DEN', 'VILLAGE AHEAD. VILLAGERS ARE STILL IN THEIR HOMES.'],
    'op3.civ': ['DEN', 'CIVILIANS CROSSING. SHOOT THE GUNMEN, NOT THE GROCERS.'],
    'op3.boss': ['DEN', 'THE BUTCHER. THAT TANK HAS A SOFT HATCH.'],
    'op4.go': ['DEN', 'THE KENNEL. FIVE HOSTAGES. PROTECT THEM WHEN THEY RUN.'],
    'op4.run': ['DEN', 'THEY ARE RUNNING. COVER THEM.'],
    'op4.boss': ['DEN', 'KRAGG HIMSELF. TAKE HIM DOWN.'],
    'low.ammo': ['DEN', 'YOU ARE LOW ON AMMO. SHOOT A SUPPLY CRATE.'],
    'drop': ['DEN', 'EMERGENCY DROP. GRAB IT.'],
    'fury': ['DEN', 'FURY. SPRAY AND PRAY.'],
    'civ': ['DEN', 'THAT WAS A CIVILIAN. EYES OPEN.']
  },
  interrogation: [
    ['PRISONER', 'OK OK. DO NOT SHOOT. I TALK.'],
    ['WOLF', 'WHERE ARE THE HOSTAGES.'],
    ['PRISONER', 'THE KENNEL. BEHIND THE POWDER SHEDS. KRAGG KEEPS THEM THERE.'],
    ['WOLF', 'THANKS.'],
    ['PRISONER', 'DO NOT TELL KRAGG I TALKED. HE IS PETTY.']
  ],
  endings: [
    ['NO ONE HOME', 'THE KENNEL WAS EMPTY. THE PACK WENT HOME QUIET.'],
    ['ONE FOR THE ROAD', 'ONE HOSTAGE HOME. THE PACK WILL TAKE IT.'],
    ['A SMALL HOWL', 'TWO HOSTAGES HOME. THE PACK HOWLS ONCE.'],
    ['GOOD HUNTING', 'THREE HOSTAGES HOME. DEN BUYS THE ROUND.'],
    ['A LOUD HOWL', 'FOUR HOSTAGES HOME. THE WHOLE COAST HEARS IT.'],
    ['THE WHOLE PACK', 'ALL FIVE HOME. KRAGG IS LEFT WITH HIS HYENAS.']
  ],
  about: {
    p1: 'A first-person rail shooter. Aim, spray, reload, and read the rings.',
    p2: 'Original characters: Wolfpack commandos against the Hyena Legion. Inspired by the 1987 arcade classic Operation Wolf.'
  }
};
})();
