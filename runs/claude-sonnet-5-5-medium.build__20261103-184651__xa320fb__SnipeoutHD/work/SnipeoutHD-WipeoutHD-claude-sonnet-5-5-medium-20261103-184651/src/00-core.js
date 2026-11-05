(() => {
const E = My3D2dge;
const SN = globalThis.SN = globalThis.SN || {};
const U16 = 16;                       // engine units per metre
SN.U = U16;
SN.kmh = v => v * 0.225;              // u/s -> km/h
SN.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
SN.lerp = (a, b, t) => a + (b - a) * t;
SN.wrapAngle = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
SN.mod = (a, n) => ((a % n) + n) % n;
SN.fmtTime = ms => { if (!isFinite(ms) || ms == null) return '--:--.--'; const t = Math.max(0, Math.round(ms)); const m = Math.floor(t / 60000), s = Math.floor(t / 1000) % 60, c = Math.floor((t % 1000) / 10); return m + ':' + String(s).padStart(2, '0') + '.' + String(c).padStart(2, '0'); };
SN.ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th');
// seeded RNG (mulberry32); one stream per purpose
SN.rng = seed => { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
SN.hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// vectors (plain arrays [x, y, z], engine axes: x east, y south, z up)
SN.v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };
// right = cross(up, forward): heading east with z up gives south (the right-hand side)
SN.frame = (F, hint = [0, 0, 1]) => { const R = SN.v3.norm(SN.v3.cross(hint, F)); const U = SN.v3.cross(F, R); return { F, R, U }; };

// ---- Tune: live gameplay variables (dev mode sliders) ---------------------------------------------------------
SN.TUNE_DEFS = [
  { k: 'topSpeed', label: 'Top speed', def: 1, min: .5, max: 1.6, step: .05, unit: '×' },
  { k: 'accel', label: 'Acceleration', def: 1, min: .4, max: 2.5, step: .05, unit: '×' },
  { k: 'steer', label: 'Steering rate', def: 1, min: .5, max: 2, step: .05, unit: '×' },
  { k: 'airbrake', label: 'Airbrake bite', def: 1, min: .3, max: 2.5, step: .05, unit: '×' },
  { k: 'grip', label: 'Grip (auto-align)', def: 1, min: .2, max: 3, step: .05, unit: '×' },
  { k: 'gravity', label: 'Gravity', def: 1, min: .3, max: 2.5, step: .05, unit: '×' },
  { k: 'wallDmg', label: 'Wall damage', def: 1, min: 0, max: 3, step: .05, unit: '×' },
  { k: 'weaponDmg', label: 'Weapon damage', def: 1, min: 0, max: 3, step: .05, unit: '×' },
  { k: 'boost', label: 'Boost power', def: 1, min: .3, max: 2.5, step: .05, unit: '×' },
  { k: 'aiSkill', label: 'AI skill', def: 1, min: .5, max: 1.3, step: .02, unit: '×' },
  { k: 'aiAggro', label: 'AI weapon use', def: 1, min: 0, max: 3, step: .1, unit: '×' },
  { k: 'rubber', label: 'Rubber band', def: 1, min: 0, max: 2, step: .05, unit: '×' },
  { k: 'pitRate', label: 'Pit recharge', def: 1, min: 0, max: 4, step: .1, unit: '×' },
  { k: 'zoneRamp', label: 'Overclock ramp', def: 1, min: .3, max: 3, step: .1, unit: '×' }
];
SN.Tune = { T: {}, reset() { for (const d of SN.TUNE_DEFS) this.T[d.k] = d.def; }, snapshot() { return Object.assign({}, this.T); }, load(o) { for (const d of SN.TUNE_DEFS) this.T[d.k] = o && o[d.k] != null ? o[d.k] : d.def; } };
SN.Tune.reset();
SN.CHEATS = { god: false, infAmmo: false, allUnlocked: false, noAI: false, hitboxes: false, showHud: true };

// ---- speed classes -------------------------------------------------------------------------------------------
SN.CLASSES = {
  spark:  { id: 'spark',  name: 'SPARK',       kmh: 330, accel: 1.0, color: '#4cd6ff', blurb: 'Gentle. The Authority calls this "recreational". We call it a warm-up.' },
  flare:  { id: 'flare',  name: 'FLARE',       kmh: 440, accel: 1.1, color: '#ffd23c', blurb: 'The league standard. Walls start to mean it.' },
  storm:  { id: 'storm',  name: 'STORM',       kmh: 560, accel: 1.2, color: '#ff7a2b', blurb: 'Fast enough that corners are a rumour.' },
  singularity: { id: 'singularity', name: 'SINGULARITY', kmh: 700, accel: 1.3, color: '#ff3ca8', blurb: 'The scenery files a complaint. You are the complaint.' }
};
SN.CLASS_ORDER = ['spark', 'flare', 'storm', 'singularity'];

// ---- teams and pilots -----------------------------------------------------------------------------------------
SN.TEAMS = {
  kestrel: { id: 'kestrel', name: 'KESTREL', tag: 'Kestrel Aerodynamics', main: '#2ec4ff', alt: '#ffffff', glow: '#7fe8ff', handling: 1.0, speed: 1.0, shield: 1.0, shape: 0, slogan: 'Lift is a lifestyle.' },
  soratek: { id: 'soratek', name: 'SORATEK', tag: 'Soratek Heavy Industries', main: '#e8283c', alt: '#1b1b22', glow: '#ff8a96', handling: .9, speed: 1.04, shield: 1.1, shape: 1, slogan: 'Bigger is a feature.' },
  volta: { id: 'volta', name: 'VOLTA', tag: 'Volta Kinetics', main: '#ffd21f', alt: '#222', glow: '#fff3a0', handling: 1.05, speed: .98, shield: .95, shape: 2, slogan: 'Charged for life.' },
  caldera: { id: 'caldera', name: 'CALDERA', tag: 'Caldera Dynamics', main: '#ff7a1a', alt: '#2a1a14', glow: '#ffc080', handling: .95, speed: 1.02, shield: 1.15, shape: 3, slogan: 'Hot take. Hotter exhaust.' },
  mirelle: { id: 'mirelle', name: 'MIRELLE', tag: 'Mirelle Atelier', main: '#d93cff', alt: '#f4e9ff', glow: '#f0a0ff', handling: 1.12, speed: .96, shield: .9, shape: 4, slogan: 'Fast, but make it fashion.' },
  halcyon: { id: 'halcyon', name: 'HALCYON', tag: 'Halcyon Mutual', main: '#35e08a', alt: '#0f2a1e', glow: '#a8ffd0', handling: 1.0, speed: 1.0, shield: 1.05, shape: 5, slogan: 'Terms and conditions apply to velocity.' }
};
SN.TEAM_ORDER = ['kestrel', 'soratek', 'volta', 'caldera', 'mirelle', 'halcyon'];
SN.PILOTS = [
  { id: 'okafor', name: 'T. OKAFOR', team: 'kestrel', skill: .98, aggr: .6, voice: 3, note: 'Never once looked at the wall. The wall looks at him.' },
  { id: 'lindqvist', name: 'E. LINDQVIST', team: 'kestrel', skill: .9, aggr: .4, voice: 7, note: 'Writes poetry about braking points. Never brakes.' },
  { id: 'brandt', name: 'H. BRANDT', team: 'soratek', skill: 1.0, aggr: 1.0, voice: 1, note: 'Sponsored by a hammer. The hammer is winning.' },
  { id: 'tanaka', name: 'M. TANAKA', team: 'soratek', skill: .92, aggr: .7, voice: 5, note: 'Has a tattoo of the Authority logo. Ironic, he says.' },
  { id: 'vega', name: 'R. VEGA', team: 'volta', skill: .96, aggr: .8, voice: 2, note: 'Charged for life; billed for liability.' },
  { id: 'osei', name: 'K. OSEI', team: 'volta', skill: .88, aggr: .5, voice: 6, note: 'Reads the manual. Disagrees with it.' },
  { id: 'duarte', name: 'L. DUARTE', team: 'caldera', skill: .97, aggr: .9, voice: 4, note: 'Hot lap, hot take, hot tea.' },
  { id: 'novak', name: 'P. NOVAK', team: 'caldera', skill: .86, aggr: .6, voice: 8, note: 'Eliminated seven times. Counts it as seven opportunities.' },
  { id: 'sorel', name: 'A. SOREL', team: 'mirelle', skill: .99, aggr: .5, voice: 9, note: 'The livery was chosen before the driver.' },
  { id: 'park', name: 'J. PARK', team: 'mirelle', skill: .91, aggr: .65, voice: 0, note: 'Races to be photographed.' },
  { id: 'adeyemi', name: 'N. ADEYEMI', team: 'halcyon', skill: .94, aggr: .55, voice: 10, note: 'Reads the fine print aloud mid-corner.' },
  { id: 'rossi', name: 'C. ROSSI', team: 'halcyon', skill: .84, aggr: .75, voice: 11, note: 'The terms say she may not be reasoned with.' }
];
SN.PLAYER_NAMES = ['PILOT', 'ACE', 'ROOKIE', 'GHOST'];

// ---- weapons --------------------------------------------------------------------------------------------------
SN.WEAPONS = {
  swarm:   { id: 'swarm',   name: 'SWARM',     color: '#ffb02e', desc: 'Three small seekers. Good manners not included.', call: 'swarm' },
  seeker:  { id: 'seeker',  name: 'SEEKER',    color: '#ff3b3b', desc: 'One missile, one grudge. Locks the craft ahead.', call: 'seeker' },
  mine:    { id: 'mine',    name: 'MINEFIELD', color: '#b6ff3a', desc: 'Drops three mines. Someone will find them.', call: 'minefield' },
  cannon:  { id: 'cannon',  name: 'CANNON',    color: '#ffe14a', desc: 'A fast straight shot. Aim is a personality.', call: 'cannon' },
  rail:    { id: 'rail',    name: 'RAILSHOT',  color: '#7affff', desc: 'An instant beam down your lane. Charged by hope.', call: 'railshot' },
  tremor:  { id: 'tremor',  name: 'TREMOR',    color: '#c07aff', desc: 'A ground shockwave. Everyone nearby trips on it.', call: 'tremor' },
  bulwark: { id: 'bulwark', name: 'BULWARK',   color: '#4aa8ff', desc: 'Six seconds of shield. Terms apply.', call: 'bulwark' },
  auto:    { id: 'auto',    name: 'AUTOPILOT', color: '#ff9bd8', desc: 'The craft drives. You supervise, emotionally.', call: 'autopilot' },
  nitro:   { id: 'nitro',   name: 'NITRO',     color: '#ff6a1a', desc: 'A long burn. The speedometer files a complaint.', call: 'nitro' },
  siphon:  { id: 'siphon',  name: 'SIPHON',    color: '#5dff9a', desc: 'Drains energy from the nearest craft ahead.', call: 'siphon' }
};
SN.WEAPON_ORDER = ['swarm', 'seeker', 'mine', 'cannon', 'rail', 'tremor', 'bulwark', 'auto', 'nitro', 'siphon'];
// pickup odds: leaders get defence, the back gets attack and boosts
SN.weaponRoll = (rnd, place, n) => {
  const back = n > 1 ? (place - 1) / (n - 1) : 0;
  const w = { swarm: 1 + back, seeker: 1 + back * 1.5, mine: 1.2 - back * .6, cannon: 1.2, rail: .6 + back, tremor: .8 + back * .6, bulwark: 1.4 - back, auto: .7, nitro: .6 + back * 1.4, siphon: .8 };
  let sum = 0; for (const k in w) sum += w[k];
  let r = rnd() * sum; for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'cannon';
};

// ---- tracks (metres; built in 20-track.js) --------------------------------------------------------------------
// shape(t): t in 0..1 -> [x, y, z, halfWidth] metres. All tracks are closed. Checked by tools/trackcheck.mjs
const TAU = Math.PI * 2;
const harm = (t, list) => list.reduce((a, [k, amp, ph]) => a + amp * Math.sin(TAU * k * t + ph), 0);
SN.TRACKS = {
  solenne: { id: 'solenne', name: 'PORT SOLENNE', tier: 1, desc: 'A seaside harbour circuit. A lighthouse hairpin and a gentle drop.', theme: 'coast', laps: 3, sky: ['#3b86d8', '#ffcf9a'], ground: '#134a6a', fog: '#c9a2a0', music: 'solenne', weatherKind: null,
    shape(t) { const th = TAU * t, r = 640 * (1 + .20 * Math.cos(2 * th + .6) + .10 * Math.cos(3 * th + 1.2) + .09 * Math.cos(5 * th + .4) + .035 * Math.cos(9 * th)); return [r * Math.cos(th) * 1.15, r * Math.sin(th), 30 + harm(t, [[2, 14, 0], [3, 7, 1.3]]) + 22 * Math.exp(-Math.pow((t - .62) * 24, 2)) - 14 * Math.exp(-Math.pow((t - .85) * 22, 2)), 14]; } },
  karakum: { id: 'karakum', gaps: [[.3095, 0, 24]], name: 'KARAKUM SPIRE', tier: 1, desc: 'A desert gorge run with a spire climb and a jump you will be told about.', theme: 'desert', laps: 3, sky: ['#d9742c', '#ffe0a0'], ground: '#9c6a3a', fog: '#e9b988', music: 'karakum',
    shape(t) { const th = TAU * t, r = 760 * (1 + .18 * Math.cos(3 * th) + .12 * Math.cos(2 * th + 2) + .07 * Math.cos(7 * th) + .03 * Math.cos(11 * th)); return [r * Math.cos(th), r * Math.sin(th) * 1.1, 60 + harm(t, [[1, 40, 0], [2, 20, 2], [4, 6, 1]]) + 26 * Math.exp(-Math.pow((t - .30) * 40, 2)), 14]; } },
  meridian: { id: 'meridian', name: 'MERIDIAN STACK', tier: 2, desc: 'Night city, a figure-eight crossover and a tower drop.', theme: 'city', laps: 3, sky: ['#05021a', '#3a1668'], ground: '#0c0818', fog: '#2a1050', music: 'meridian',
    shape(t) { const th = TAU * t, a = 640; return [a * Math.sin(th) * (1 + .12 * Math.cos(4 * th)), a * .8 * Math.sin(th) * Math.cos(th) * 1.25 * (1 + .1 * Math.sin(5 * th)), 20 + 70 * (1 - Math.cos(th)) / 2 + harm(t, [[3, 5, .4]]), 13]; } },
  borealis: { id: 'borealis', name: 'BOREALIS VAULT', tier: 3, desc: 'Ice switchbacks under an aurora. Long climbs, a longer drop.', theme: 'ice', laps: 3, sky: ['#02122a', '#2ad6a0'], ground: '#cfe8f4', fog: '#a8d8e8', music: 'borealis',
    shape(t) { const th = TAU * t, r = 880 * (1 + .12 * Math.cos(3 * th) + .09 * Math.cos(5 * th + 1) + .075 * Math.cos(8 * th) + .03 * Math.cos(13 * th)); return [r * Math.cos(th), r * Math.sin(th), 50 + harm(t, [[1, 55, 0], [2, 18, 1.1], [3, 9, 2]]) - 30 * Math.exp(-Math.pow((t - .18) * 20, 2)), 14]; } }
};
SN.TRACK_ORDER = ['solenne', 'karakum', 'meridian', 'borealis'];

// ---- story and announcer lines ---------------------------------------------------------------------------------
SN.STORY = {
  authority: 'RACE CONTROL',
  intro: ['Welcome to the Anti-Gravity Racing League, a wholly owned subsidiary of everyone who has ever sponsored anything.', 'You have been assigned a craft, a number and a waiver. Please read none of them.'],
  radio: {
    start: ['Lights are green. Liability is amber.', 'Engines hot. Ethics on standby.', 'Go. This is not advice, it is a countdown.'],
    lead: ['You are in first. Please do not get used to it.', 'First place. The sponsors have been notified.'],
    lastLap: ['Final lap. Statistically, this is the one that counts.', 'Last lap. The Authority reminds you walls are not sponsors.'],
    wall: ['Contact with the wall detected. The wall is fine.', 'Impact logged. Please apologise to the architecture.'],
    low: ['Shield critical. Find the pit strip or find peace.', 'Energy low. Consider an apology to your craft.'],
    elim: ['Craft lost. Your waiver has been activated.', 'Eliminated. The Authority thanks you for your content.'],
    win: ['A win. The Authority will pretend it was planned.', 'Victory confirmed. Please hold your champagne at a safe distance.'],
    sniped: ['Sniped out. Thank you for your participation.', 'That one was targeted. Congratulations to the target.']
  },
  events: [
    { id: 'e1', name: 'OPEN DAY', track: 'solenne', cls: 'spark', mode: 'race', laps: 2, goal: 4, brief: ['Welcome to Port Solenne. The Authority calls this "open day". The lighthouse calls it "Tuesday".', 'Finish 4th or better. The coffee is complimentary. The walls are not.'], win: 'You were told to survive. You did, with style. Style was not required.' },
    { id: 'e2', name: 'HARBOUR LIGHTS', track: 'solenne', cls: 'spark', mode: 'time', laps: 3, goal: 1, medal: 'bronze', brief: ['Time Trial. The clock is the only rival that has never cheated.', 'Set a medal time. The ghost will be you, but better rested.'], win: 'Time confirmed. The clock has no comment.' },
    { id: 'e3', name: 'SPIRE CLIMB', track: 'karakum', cls: 'flare', mode: 'race', laps: 3, goal: 3, brief: ['Karakum Spire. A desert, a gorge and a ramp placed by someone who has never been to a hospital.', 'Take the pads. Use the weapons. Finish on the podium.'], win: 'Podium. Please do not step on the sponsors.' },
    { id: 'e4', name: 'SNIPEOUT: OPEN FIRE', track: 'karakum', cls: 'flare', mode: 'snipeout', laps: 0, goal: 8, brief: ['Snipeout. Points for hits, double points for eliminations, no points for apologies.', 'Score 8 points before the clock runs out.'], win: 'Combat concluded. The Authority has filed your damage report as art.' },
    { id: 'e5', name: 'OVERCLOCK 01', track: 'meridian', cls: 'flare', mode: 'overclock', laps: 0, goal: 5, brief: ['Overclock. The Stack goes neon and the speed does not stop. Survive five zones.', 'There is no finish line. There is only a faster one.'], win: 'Five zones. Your craft is warm. Your nerves are warmer.' },
    { id: 'e6', name: 'STACK CUP', track: 'meridian', cls: 'storm', mode: 'race', laps: 3, goal: 3, brief: ['Meridian Stack. Night, neon and the crossover where the Authority sells the tickets.', 'Podium or the Authority sends flowers.'], win: 'The crossover remembers you.' },
    { id: 'e7', name: 'VAULT RUN', track: 'borealis', cls: 'storm', mode: 'race', laps: 3, goal: 2, brief: ['Borealis Vault. Ice, aurora and a drop that has a name: "Regret".', 'Second or better. The aurora is not a sponsor. Yet.'], win: 'Silence, aurora, second place. A fine trio.' },
    { id: 'e8', name: 'GRAND PRIX: FINAL', track: 'borealis', cls: 'singularity', mode: 'race', laps: 3, goal: 1, brief: ['Singularity class. The scenery files a complaint. You are the complaint.', 'Win. The Authority has already printed the trophies, and the apology.'], win: 'Champion. Snipeout HD closes the season. The wall sends its regards.' }
  ],
  ending: ['The Authority thanks you for your content.', 'The walls thank you for your patience.', 'See you next season. Please read the waiver.']
};

// ---- Academy drills --------------------------------------------------------------------------------------------
SN.DRILLS = [
  { id: 'thrust', text: 'THRUST. Hold {thrust} to accelerate. Reach 200 km/h.', check: (r, h) => SN.kmh(h.v) >= 200 },
  { id: 'steer', text: 'STEER. Weave left and right with {left} and {right}.', check: (r, h) => h.d.steerL > .8 && h.d.steerR > .8 },
  { id: 'airL', text: 'AIRBRAKES. Hold the left airbrake ({airL}) through a corner.', check: (r, h) => h.d.airL > 1.2 },
  { id: 'airR', text: 'The right airbrake ({airR}) bites the other way. Use it.', check: (r, h) => h.d.airR > 1.2 },
  { id: 'boost', text: 'BOOST PADS. Drive over a blue chevron pad.', check: (r, h) => h.d.pad > 0 },
  { id: 'weapon', text: 'WEAPONS. Fly through an amber pad to pick one up.', check: (r, h) => h.d.pickup > 0 },
  { id: 'fire', text: 'FIRE. Press {fire} to use your weapon.', check: (r, h) => h.d.fire > 0 },
  { id: 'absorb', text: 'ABSORB. Get another weapon, then press {absorb} to turn it into shield.', check: (r, h) => h.d.absorb > 0 },
  { id: 'shift', text: 'SIDE-SHIFT. Tap {shiftL} or {shiftR} to hop sideways.', check: (r, h) => h.d.shift > 0 },
  { id: 'pit', text: 'PIT STRIP. Drive over the green pit strip to recharge.', check: (r, h) => h.d.pit > 0 },
  { id: 'lap', text: 'LAP. Finish one lap to graduate. The Authority will be disappointed to see you leave.', check: (r, h) => h.lap >= 2 }
];

// ---- misc ------------------------------------------------------------------------------------------------------
SN.MEDALS = { // fractions of a reference lap (set from the bot's pace in tools/medals.mjs, then rounded here)
  gold: 1.04, silver: 1.10, bronze: 1.20 };
SN.ABOUT = { engineChanges: [
  'Default button symbols are PlayStation (the engine default was Auto), under Display in Settings with an Xbox option, so controller prompts match the DualSense out of the box. Marked SNIPEOUT EDIT in engine/my-3d2dge.js.', 'Not changed: the 3D add-on. The plan also asked for analog buttons, font glyphs and synth extensions in the engine; this build instead reads trigger values straight from the gamepad, draws its own glyph chips and uses the stock chip synth.' ] };
})();
