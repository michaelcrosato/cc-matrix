/* DATA: teams, players, story characters, courts, dunks, power-ups, cheat codes. Content never edits systems: systems
 * read these registries. Ratings: ZOOM SPLASH DEEP SLAM DIME SWIPE SWAT BUMP, 1..10. */
const RATINGS = ['zoom', 'splash', 'deep', 'slam', 'dime', 'swipe', 'swat', 'bump'];
const RATING_NAMES = { zoom: 'ZOOM', splash: 'SPLASH', deep: 'DEEP', slam: 'SLAM', dime: 'DIME', swipe: 'SWIPE', swat: 'SWAT', bump: 'BUMP' };
const RATING_HELP = { zoom: 'speed', splash: 'jumpers and layups', deep: 'three-pointers', slam: 'dunking', dime: 'passing and handles', swipe: 'steals', swat: 'blocks and rebounds', bump: 'power and shoves' };

def('team', 'hightops', { name: 'NEON HEIGHTS HIGHTOPS', short: 'HIGHTOPS', city: 'NEON HEIGHTS', jersey: '#ff3ca6', trim: '#2de2ff', shorts: '#1a1420', sneaker: '#f4f4f4', sock: '#2de2ff', court: 'skybox', players: ['volt', 'bigrumble', 'pixel'], style: 'Flashy, fast and high-flying', logo: 'wing' });
def('team', 'breakers', { name: 'BOARDWALK BREAKERS', short: 'BREAKERS', city: 'THE BOARDWALK', jersey: '#18c8b8', trim: '#ff7a5c', shorts: '#f2d8a0', sneaker: '#ffffff', sock: '#ff7a5c', court: 'pier', players: ['riptide', 'shellshock', 'longboard'], style: 'Passing and threes', logo: 'wave' });
def('team', 'crushers', { name: 'SCRAPYARD CRUSHERS', short: 'CRUSHERS', city: 'THE SCRAPYARD', jersey: '#d8641e', trim: '#ffd23a', shorts: '#1c1a18', sneaker: '#2a2a2a', sock: '#ffd23a', court: 'scrapyard', players: ['torque', 'sparkplug', 'hubcap'], style: 'Power and steals', logo: 'wrench' });
def('team', 'magma', { name: 'KABOOM MAGMA', short: 'MAGMA', city: 'KABOOM ISLAND', jersey: '#ff3a1a', trim: '#ffb020', shorts: '#22181e', sneaker: '#1a1a1a', sock: '#ffb020', court: 'caldera', players: ['obsidian', 'ember', 'pumice'], style: 'Defense and clutch shooting', logo: 'volcano' });
def('team', 'blambots', { name: 'THE BLAMBOTS', short: 'BLAMBOTS', city: 'GLOBO-BLAM LABS', jersey: '#c8d0dc', trim: '#e8c040', shorts: '#3a4250', sneaker: '#3a4250', sock: '#e8c040', court: 'dome', players: ['dunkatron', 'swatbot', 'spareparts'], style: 'Everything, loudly', logo: 'fist', locked: true, robots: true });
def('team', 'allstars', { name: 'CHANNEL BLAM ALL-STARS', short: 'ALL-STARS', city: 'CHANNEL BLAM', jersey: '#f4f0ea', trim: '#ffc83a', shorts: '#4a2a8a', sneaker: '#ffc83a', sock: '#4a2a8a', court: 'dome', players: ['vinniep', 'deedeep', 'blammo'], style: 'Showbiz', logo: 'mic', locked: true });
const STREET_TEAMS = ['hightops', 'breakers', 'crushers', 'magma'];

// voice: { pitch Hz, wave, rate syllables/s, formant shift, robot, growl }
const PL = (id, name, team, number, role, r, rig, voice, taunt, barks) => def('player', id, { name, team, number, role, ratings: Object.fromEntries(RATINGS.map((k, i) => [k, r[i]])), rig, voice, taunt, barks });
PL('volt', 'VOLT', 'hightops', 7, 'HIGH-FLYER', [9, 5, 4, 9, 6, 6, 4, 3], { build: 'heroic', size: 1.65, hair: 'ponytail', hairColor: '#3ab0ff', skin: '#8a5a3c', hat: { style: 'band', color: '#ff3ca6' } }, { pitch: 220, wave: 'square', rate: 15 }, 'raiseRoof', ['Too slow!', 'Catch me!', 'Zap!', 'Up here!']);
PL('bigrumble', 'BIG RUMBLE', 'hightops', 44, 'ENFORCER', [3, 3, 1, 7, 4, 4, 9, 10], { build: 'bulky', size: 1.9, hair: 'flattop', hairColor: '#141014', skin: '#4a2c1e' }, { pitch: 85, wave: 'saw', rate: 9 }, 'flex', ['Move.', 'Rumble!', 'Sit down.']);
PL('pixel', 'PIXEL', 'hightops', 3, 'SHARPSHOOTER', [6, 9, 9, 3, 7, 5, 3, 3], { build: 'heroic', size: 1.55, hair: 'spiky', hairColor: '#4ae05a', skin: '#f0c8a0', shades: true }, { pitch: 270, wave: 'square', rate: 16 }, 'fingerGuns', ['Pew pew!', 'Net.', 'Too easy!']);
PL('riptide', 'RIPTIDE', 'breakers', 1, 'POINT GUARD', [10, 6, 6, 5, 10, 7, 2, 3], { build: 'heroic', size: 1.6, hair: 'long', hairColor: '#f0d890', skin: '#d8a070' }, { pitch: 170, wave: 'triangle', rate: 11 }, 'surf', ['Gnarly!', 'Cowabunga!', 'Ride it!']);
PL('shellshock', 'SHELLSHOCK', 'breakers', 33, 'BOMBER', [6, 8, 10, 3, 6, 5, 3, 4], { build: 'heroic', size: 1.65, hair: 'afro', hairColor: '#ff7a6a', skin: '#6a4028' }, { pitch: 200, wave: 'square', rate: 13 }, 'goggles', ['Splash!', 'From downtown!', 'Ka-boom!']);
PL('longboard', 'LONGBOARD', 'breakers', 21, 'SHOT BLOCKER', [4, 5, 2, 7, 4, 3, 9, 7], { build: 'heroic', size: 1.85, hair: 'bald', hairColor: '#c89070', skin: '#c89070', hat: { style: 'band', color: '#18c8b8' }, legs: 1.12 }, { pitch: 120, wave: 'triangle', rate: 9 }, 'fingerWag', ['Nope.', 'Not today.', 'Denied.']);
PL('torque', 'TORQUE', 'crushers', 99, 'POWER DUNKER', [6, 4, 2, 10, 4, 4, 6, 9], { build: 'bulky', size: 1.85, hair: 'mohawk', hairColor: '#1a1a1a', skin: '#c8a080' }, { pitch: 95, wave: 'saw', rate: 10, growl: .3 }, 'chestPound', ['CRUSHED!', 'Scrap metal!', 'Yeah!']);
PL('sparkplug', 'SPARKPLUG', 'crushers', 8, 'PICKPOCKET', [9, 6, 6, 4, 7, 10, 2, 2], { build: 'chibi', size: 1.65, hair: 'short', hairColor: '#2a1a10', skin: '#3a2418', hat: { style: 'cap', color: '#ffd23a' } }, { pitch: 300, wave: 'square', rate: 18 }, 'shimmy', ['Mine now!', 'Yoink!', 'Zip zip!']);
PL('hubcap', 'HUBCAP', 'crushers', 52, 'VETERAN', [5, 7, 6, 6, 6, 6, 6, 6], { build: 'heroic', size: 1.7, hair: 'short', hairColor: '#a8a8a8', skin: '#e0b090' }, { pitch: 130, wave: 'saw', rate: 10 }, 'watch', ['Old school.', 'Seen it all.', 'Back in my day!']);
PL('obsidian', 'OBSIDIAN', 'magma', 0, 'RIM PROTECTOR', [4, 4, 1, 8, 3, 4, 10, 8], { build: 'bulky', size: 1.95, hair: 'bald', hairColor: '#3a2216', skin: '#3a2216' }, { pitch: 78, wave: 'saw', rate: 8 }, 'stoneFace', ['Hm.', 'The mountain stands.', 'Rock solid.']);
PL('ember', 'EMBER', 'magma', 11, 'CLUTCH SHOOTER', [7, 9, 8, 5, 6, 6, 3, 3], { build: 'heroic', size: 1.6, hair: 'long', hairColor: '#e0401a', skin: '#f0c090' }, { pitch: 230, wave: 'square', rate: 14 }, 'blowFingers', ['Too hot!', 'Burned!', 'Ice cold.']);
PL('pumice', 'PUMICE', 'magma', 24, 'LEAPER', [8, 5, 3, 9, 5, 5, 7, 3], { build: 'heroic', size: 1.65, hair: 'afro', hairColor: '#1a1210', skin: '#8a5030' }, { pitch: 190, wave: 'square', rate: 14 }, 'pogo', ['Boing!', 'Sky high!', 'Up up up!']);
PL('dunkatron', 'DUNKATRON', 'blambots', 1001, 'DESTROYER', [8, 6, 4, 10, 6, 8, 8, 8], { build: 'bulky', size: 1.95, hair: 'bald', skin: '#c8d0dc', hat: { style: 'helmet', color: '#e0e6f0' }, eyeGlow: '#ff3a2a', robot: true }, { pitch: 95, wave: 'square', rate: 9, robot: true }, 'robot', ['BALL. ACQUIRED.', 'YOU. ARE. OBSOLETE.', 'BLAM. PROTOCOL.']);
PL('swatbot', 'SWATBOT', 'blambots', 1010, 'WALL', [6, 7, 7, 7, 7, 9, 10, 9], { build: 'bulky', size: 1.95, hair: 'bald', skin: '#b8c0cc', hat: { style: 'helmet', color: '#d0d6e0' }, eyeGlow: '#ff3a2a', robot: true }, { pitch: 120, wave: 'square', rate: 9, robot: true }, 'tilt', ['REJECTION. COMPLETE.', 'ACCESS. DENIED.', 'BEEP.']);
PL('spareparts', 'SPARE PARTS', 'blambots', 404, 'BENCH UNIT', [6, 6, 6, 6, 6, 6, 6, 6], { build: 'bulky', size: 1.8, hair: 'bald', skin: '#a8a090', hat: { style: 'helmet', color: '#c8a050' }, eyeGlow: '#3aff6a', robot: true }, { pitch: 150, wave: 'square', rate: 11, robot: true }, 'glitchWave', ['ERR. ERR. HI.', 'SPARE. ME.', 'BZZT.']);
PL('vinniep', 'VINNIE VOX', 'allstars', 10, 'PLAY-BY-PLAY', [5, 7, 7, 5, 8, 5, 4, 5], { build: 'heroic', size: 1.7, hair: 'short', hairColor: '#3a2a20', skin: '#e8b890', hat: { style: 'band', color: '#2a2a2a' } }, { pitch: 110, wave: 'saw', rate: 14 }, 'micDrop', ['BLAMMO!', 'CALL IT!', 'ON THE AIR!']);
PL('deedeep', 'DEE DEE DECIBEL', 'allstars', 22, 'COLOR COMMENTATOR', [7, 8, 6, 6, 7, 6, 5, 4], { build: 'heroic', size: 1.6, hair: 'ponytail', hairColor: '#a040e0', skin: '#6a4030' }, { pitch: 230, wave: 'square', rate: 15 }, 'pointCam', ['SAY CHEESE!', 'LOUDER!', 'WOO!']);
PL('blammo', 'BLAMMO', 'allstars', 0, 'MASCOT', [7, 3, 1, 10, 3, 6, 9, 10], { build: 'bulky', size: 2.0, hair: 'short', hairColor: '#3a2e2a', skin: '#3a2e2a', hunch: .2, gorilla: true }, { pitch: 70, wave: 'saw', rate: 8, growl: .6 }, 'gorilla', ['OOH OOH!', 'BLAM BLAM!', 'HRRAAH!']);

// story characters (not playable): portraits and voices for the cutscenes and captions
def('npc', 'vinnie', { name: 'VINNIE VOX', rig: { build: 'heroic', size: 1.7, hair: 'short', hairColor: '#3a2a20', skin: '#e8b890', outfit: 'coat', coat: '#2a3a7a', cloth: '#f4f0ea', hat: { style: 'band', color: '#2a2a2a' } }, voice: { pitch: 110, wave: 'saw', rate: 14 } });
def('npc', 'deedee', { name: 'DEE DEE DECIBEL', rig: { build: 'heroic', size: 1.6, hair: 'ponytail', hairColor: '#a040e0', skin: '#6a4030', outfit: 'coat', coat: '#c8306a', cloth: '#ffe0f0' }, voice: { pitch: 230, wave: 'square', rate: 15 } });
def('npc', 'gigawatt', { name: 'COMMISSIONER GIGAWATT', rig: { build: 'heroic', size: 1.6, hair: 'short', hairColor: '#f0f0f0', skin: '#f0d0b0', outfit: 'coat', coat: '#6a2a9a', cloth: '#2a1a3a', belt: '#e8c040' }, voice: { pitch: 140, wave: 'pulse', rate: 9, nasal: true } });
def('npc', 'roscoe', { name: 'REF ROSCOE', rig: { build: 'heroic', size: 1.7, hair: 'short', hairColor: '#2a2a2a', skin: '#c89070', cloth: '#f4f4f4', trim: '#1a1a1a', hat: { style: 'cap', color: '#1a1a1a' } }, voice: { pitch: 125, wave: 'saw', rate: 12 } });
def('npc', 'intern1', { name: 'INTERN 1', rig: { build: 'chibi', size: 1.6, hair: 'short', hairColor: '#5a3a1a', skin: '#e0b090', cloth: '#8a8a94' }, voice: { pitch: 180, wave: 'triangle', rate: 12 } });
def('npc', 'intern2', { name: 'INTERN 2', rig: { build: 'chibi', size: 1.6, hair: 'ponytail', hairColor: '#1a1a1a', skin: '#8a5a3c', cloth: '#8a8a94' }, voice: { pitch: 210, wave: 'triangle', rate: 12 } });

/* ---- courts: each a home, a look and a twist ---- */
def('court', 'skybox', { name: 'THE SKYBOX', place: 'a Neon Heights rooftop at night', home: 'hightops', floor: 'asphalt', base: [38, 34, 48], line: '#2de2ff', paint: '#ff3ca6', paintFill: [70, 30, 70], logo: 'BLAM',
  sky: { sky: ['#07061a', '#1d1240', '#3a1a5a'], moon: { x: .82, y: .18, r: 10 }, stars: 60, layers: [{ kind: 'city', color: '#2a1a48', y: .5, height: .38, parallax: .06, windows: '#ff7ad8' }, { kind: 'city', color: '#160e2c', y: .62, height: .3, parallax: .16, windows: '#5ae8ff', seed: 4 }] },
  stands: ['#2a2238', '#3a2e4c'], crowd: ['#ff3ca6', '#2de2ff', '#1a1a1a', '#ffd23a', '#8a4aff'], ambient: .5, dribble: 'asphalt', music: 'skybox', twist: 'jackpot',
  props: [['streetlamp', 40, 104], ['streetlamp', 728, 104], ['trashcan', 30, 420], ['trashcan', 740, 150], ['firedrum', 40, 250], ['hydrant', 736, 410]], glow: ['#ff3ca6', '#2de2ff'], weather: null });
def('court', 'pier', { name: 'THE PIER', place: 'a boardwalk at sunset', home: 'breakers', floor: 'planks', base: [150, 108, 72], line: '#f8f0e0', paint: '#18c8b8', paintFill: [60, 140, 130], logo: 'WAVE',
  sky: { sky: ['#2a1a4a', '#ff7a5c', '#ffd27a'], sun: { x: .3, y: .5, r: 18, color: '#ffe0a0' }, layers: [{ kind: 'clouds', color: '#ffb090', y: .25, height: .12, parallax: .04, drift: 4 }, { kind: 'sea', color: '#3a6aa0', y: .56, height: .44, parallax: .1 }] },
  stands: ['#8a6a4a', '#a07a52'], crowd: ['#ff7a5c', '#18c8b8', '#ffe05a', '#ffffff', '#ff5aa0'], ambient: .85, dribble: 'planks', music: 'pier', twist: 'wind',
  props: [['palm', 30, 120], ['palm', 740, 120], ['awning', 30, 420, { color: '#ff7a5c' }], ['lantern', 384, 96, { anchor: 'top' }], ['palm', 740, 430], ['barrel', 30, 260]], glow: ['#ffb060'], weather: null });
def('court', 'scrapyard', { name: 'THE SCRAPYARD', place: 'a junkyard at dusk in light rain', home: 'crushers', floor: 'concrete', base: [92, 88, 84], line: '#ffd23a', paint: '#d8641e', paintFill: [110, 70, 50], logo: 'CRUSH',
  sky: { sky: ['#120e1a', '#4a2e36', '#b0603a'], layers: [{ kind: 'clouds', color: '#3a2a34', y: .2, height: .2, parallax: .03, drift: 6 }, { kind: 'mountains', color: '#3a2a2a', y: .52, height: .26, parallax: .06, seed: 3 }, { kind: 'mountains', color: '#2a1e1e', y: .62, height: .2, parallax: .14, seed: 8 }] },
  stands: ['#4a4038', '#5a4e44'], crowd: ['#d8641e', '#ffd23a', '#3a5a8a', '#8a8a8a', '#e0e0e0'], ambient: .6, dribble: 'concrete', music: 'scrapyard', twist: 'oil',
  props: [['firedrum', 36, 140, { light: true }], ['firedrum', 732, 140, { light: true }], ['barrel', 30, 420], ['barrel', 744, 418], ['sandbags', 40, 300], ['crate', 728, 280]], glow: ['#ff8a3a'], weather: { kind: 'rain', amount: .4, wind: .2 } });
def('court', 'caldera', { name: 'THE CALDERA', place: 'Kaboom Island volcano at night', home: 'magma', floor: 'basalt', base: [44, 36, 38], line: '#ffc040', paint: '#ff3a1a', paintFill: [90, 30, 20], logo: 'KABOOM',
  sky: { sky: ['#0c0408', '#3a0c10', '#7a1e10'], stars: 30, layers: [{ kind: 'mountains', color: '#2a0c0c', y: .46, height: .42, parallax: .04, seed: 11 }, { kind: 'sea', color: '#2a1020', y: .66, height: .34, parallax: .1 }] },
  stands: ['#3a2a22', '#4a3428'], crowd: ['#ff3a1a', '#ffb020', '#2ad8a0', '#ffffff', '#ff7ab0'], ambient: .42, dribble: 'stone', music: 'caldera', twist: 'eruption',
  props: [['torch', 40, 110, { light: true }], ['torch', 728, 110, { light: true }], ['torch', 40, 410, { light: true }], ['torch', 728, 410, { light: true }], ['palm', 24, 260], ['palm', 744, 260]], glow: ['#ff5a2a'], weather: { kind: 'ash', amount: .3, wind: .1 } });
def('court', 'dome', { name: 'THE BLAM DOME', place: 'the championship arena', home: 'blambots', floor: 'maple', base: [196, 140, 84], line: '#ffffff', paint: '#c8202a', paintFill: [160, 40, 40], logo: 'GLOBO',
  sky: { sky: ['#06050c', '#120c20', '#1e1430'], stars: 0, layers: [{ kind: 'city', color: '#140e1e', y: .4, height: .5, parallax: .03, windows: '#ffe08a', seed: 2 }] },
  stands: ['#2a2032', '#3a2c44'], crowd: ['#c8202a', '#ffd23a', '#ffffff', '#3a6aff', '#ff3ca6', '#2de2ff'], ambient: .72, dribble: 'maple', music: 'dome', twist: 'boss',
  props: [['banner', 120, 96, { color: '#c8202a' }], ['banner', 648, 96, { color: '#ffd23a' }], ['banner', 384, 96, { color: '#3a6aff' }], ['lamp', 30, 420, { light: true }], ['lamp', 740, 420, { light: true }]], glow: ['#ffe08a'], weather: null, upperDeck: true });
const COURTS = ['skybox', 'pier', 'scrapyard', 'caldera', 'dome'];

/* ---- dunks: hand keys over the flight's progress u ([forward, right, up] at size 1), spins, flips ---- */
// R/L: hand targets; ball: 'R' | 'both'; slam at u = .9
const DK = (id, banner, need, dist, o) => def('dunk', id, Object.assign({ banner, need, dist, apexAbove: 26, spin: 0, flip: 0, ball: 'both', bonus: 0, family: 'power' }, o));
DK('hammer', 'TWO-HAND HAMMER!', { slam: 1 }, [0, 70], { keys: [[0, { B: [5, 0, 22] }], [.5, { B: [3, 0, 40] }], [.85, { B: [2, 0, 44] }], [.92, { B: [9, 0, 30] }]] });
DK('tomahawk', 'TOMAHAWK!', { slam: 5 }, [30, 130], { ball: 'R', bonus: 50, keys: [[0, { R: [5, 2, 22], L: [4, -3, 22] }], [.35, { R: [-4, 2, 40], L: [5, -4, 32] }], [.8, { R: [-5, 1, 44], L: [5, -4, 34] }], [.92, { R: [10, 1, 30], L: [4, -4, 26] }]] });
DK('doublepump', 'DOUBLE PUMP!', { slam: 6 }, [30, 120], { bonus: 80, family: 'hang', keys: [[0, { B: [5, 0, 22] }], [.25, { B: [4, 0, 38] }], [.38, { B: [5, 0, 16] }], [.55, { B: [4, 0, 40] }], [.66, { B: [5, 0, 16] }], [.84, { B: [3, 0, 44] }], [.92, { B: [9, 0, 30] }]] });
DK('reverse', 'REVERSE ROCKET!', { slam: 6 }, [20, 100], { bonus: 100, spin: Math.PI, family: 'spin', keys: [[0, { B: [5, 0, 22] }], [.5, { B: [-2, 0, 42] }], [.85, { B: [-4, 0, 46] }], [.92, { B: [-8, 0, 34] }]] });
DK('windmill', 'WINDMILL!', { slam: 7 }, [50, 150], { ball: 'R', bonus: 100, family: 'spin', keys: [[0, { R: [5, 2, 20], L: [4, -3, 24] }], [.25, { R: [4, 7, 12], L: [3, -6, 28] }], [.45, { R: [-5, 6, 22], L: [3, -6, 30] }], [.65, { R: [-3, 4, 42], L: [4, -6, 32] }], [.82, { R: [4, 2, 46], L: [4, -6, 30] }], [.92, { R: [10, 1, 30], L: [3, -5, 26] }]] });
DK('threesixty', 'THREE-SIXTY!', { slam: 7 }, [40, 140], { bonus: 120, spin: TAU, family: 'spin', keys: [[0, { B: [5, 0, 22] }], [.4, { B: [3, 0, 30] }], [.85, { B: [3, 0, 44] }], [.92, { B: [9, 0, 30] }]] });
DK('ftflyer', 'FREE-THROW FLYER!', { slam: 8 }, [110, 999], { ball: 'R', bonus: 150, apexAbove: 50, family: 'long', split: true, keys: [[0, { R: [5, 2, 22], L: [4, -3, 24] }], [.4, { R: [6, 2, 36], L: [0, -9, 26] }], [.85, { R: [6, 1, 46], L: [0, -9, 26] }], [.92, { R: [11, 1, 32], L: [0, -8, 24] }]] });
DK('flip', 'FRONT-FLIP FREAK!', { slam: 8 }, [60, 150], { bonus: 180, flip: 1, apexAbove: 44, family: 'flip', keys: [[0, { B: [5, 0, 22] }], [.25, { B: [4, 0, 24] }], [.75, { B: [4, 0, 26] }], [.85, { B: [3, 0, 44] }], [.92, { B: [9, 0, 30] }]] });
DK('rattler', 'RIM RATTLER!', { slam: 4 }, [0, 60], { bonus: 60, hang: 1.2, family: 'hang', keys: [[0, { B: [5, 0, 22] }], [.6, { B: [3, 0, 42] }], [.92, { B: [8, 0, 32] }]] });
DK('nova720', 'SEVEN-TWENTY SUPERNOVA!', { nova: true }, [60, 999], { bonus: 250, spin: TAU * 2, apexAbove: 50, family: 'nova', keys: [[0, { B: [5, 0, 22] }], [.4, { B: [3, 0, 32] }], [.85, { B: [3, 0, 46] }], [.92, { B: [9, 0, 30] }]] });
DK('volcano', 'VOLCANO LAUNCH!', { vent: true }, [0, 999], { bonus: 300, spin: TAU, apexAbove: 110, family: 'volcano', shatter: .2, keys: [[0, { B: [5, 0, 22] }], [.5, { B: [2, 0, 44] }], [.85, { B: [3, 0, 46] }], [.92, { B: [10, 0, 28] }]] });
DK('quake', 'BLAM-QUAKE!!!', { quake: true }, [80, 999], { bonus: 400, apexAbove: 80, family: 'quake', shatter: 1, keys: [[0, { B: [5, 0, 22] }], [.5, { B: [1, 0, 46] }], [.85, { B: [0, 0, 48] }], [.92, { B: [11, 0, 26] }]] });

/* ---- power-ups ---- */
def('powerup', 'rocket', { name: 'ROCKET KICKS', color: '#ff7a2a', seconds: 15, help: 'Speed +40%, turbo refills twice as fast' });
def('powerup', 'glue', { name: 'GLUE GLOVES', color: '#5ae05a', seconds: 15, help: 'Steals always work, and nobody strips you' });
def('powerup', 'laser', { name: 'LASER SIGHT', color: '#ff3a3a', seconds: 15, shots: 2, help: 'Next 2 shots: +30% and a wider PERFECT window' });
def('powerup', 'moon', { name: 'MOON SHOES', color: '#c8b0ff', seconds: 15, help: 'Dunk from the arc, jump x1.5, dunks may shatter' });
def('powerup', 'bomb', { name: 'BLAM BOMB', color: '#3a3a3a', seconds: 20, help: 'Your next shove is a shockwave' });
def('powerup', 'gold', { name: 'GOLD BALL', color: '#ffd23a', seconds: 30, help: "Your team's next basket counts double" });
const POWERUPS = ['rocket', 'glue', 'laser', 'moon', 'bomb', 'gold'];

/* ---- cheat codes (entered on the matchup card) ---- */
def('code', 'bigheads', { name: 'BIG HEADS', steps: ['up', 'up', 'turbo', 'pass'] });
def('code', 'powerups', { name: 'POWER-UPS ON', steps: ['shoot', 'shoot', 'pass', 'turbo'] });
def('code', 'turbo', { name: 'INFINITE TURBO', steps: ['turbo', 'turbo', 'turbo', 'up', 'up'] });
def('code', 'notwists', { name: 'NO TWISTS', steps: ['down', 'down', 'shove'] });
def('code', 'skydunks', { name: 'SKY DUNKS', steps: ['oop', 'oop', 'up', 'shoot'] });
def('code', 'moongrav', { name: 'MOON GRAVITY', steps: ['up', 'oop', 'up', 'oop'] });
def('code', 'tournament', { name: 'TOURNAMENT MODE', steps: ['down', 'left', 'right', 'down'] });

/* ---- difficulty ---- */
const DIFF = {
  rookie: { q: .35, react: .35, rel: .12, blk: .18, steal: .6, shove: .2, turbo: .5 },
  pro: { q: .6, react: .22, rel: .08, blk: .12, steal: 1, shove: .45, turbo: .75 },
  allstar: { q: .8, react: .14, rel: .05, blk: .07, steal: 1.4, shove: .65, turbo: .9 },
  blam: { q: .95, react: .08, rel: .03, blk: .04, steal: 1.8, shove: .8, turbo: 1 }
};
const DIFF_ORDER = ['rookie', 'pro', 'allstar', 'blam'];
