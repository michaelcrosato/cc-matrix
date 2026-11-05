// 21-critters: the twelve critter designs: their rig, how they move, what they're worth, and who's protected.
// behavior: hop (rabbits, hares), scurry (squirrels), strut (turkeys), peek (a raccoon in a log), waddle (the skunk),
// graze (Bessie), flock (crows, ravens), flush (grouse, ducks), popup (marmots), trot (coyotes), pack (wolves),
// soar (the eagle), swim (loons, the beaver).
const Q = (species, o) => () => new E.Quadruped(Object.assign({ species }, o));
const BIRD = (kind, o) => () => new E.Bird(Object.assign({ kind }, o));
def('critter', 'squirrel', { label: 'Squirrel', rig: Q('squirrel'), points: 50, behavior: 'scurry', speed: 3.2, bark: 'squirrel', size: [.6, .55], voice: 'chatter' });
def('critter', 'rabbit', { label: 'Cottontail', rig: Q('rabbit'), points: 75, behavior: 'hop', speed: 4.5, bark: 'critter', size: [.6, .6] });
def('critter', 'hare', { label: 'Snowshoe hare', rig: Q('hare'), points: 125, behavior: 'hop', speed: 6, bark: 'critter', size: [.7, .7] });
def('critter', 'turkey', { label: 'Wild turkey', rig: BIRD('turkey'), points: 150, behavior: 'strut', speed: 1.2, bark: 'turkey', size: [.9, 1.1], bird: true, voice: 'gobble' });
def('critter', 'raccoon', { label: 'Raccoon', rig: Q('raccoon'), points: 100, behavior: 'peek', speed: 2, bark: 'critter', size: [.7, .6] });
def('critter', 'skunk', { label: 'Skunk', rig: Q('skunk'), points: -100, protected: true, effect: 'stink', behavior: 'waddle', speed: 1.1, bark: 'stink', size: [.7, .6] });
def('critter', 'bessie', { label: 'Bessie the cow', rig: Q('cow'), points: -500, protected: true, behavior: 'graze', speed: .6, bark: 'bessie', size: [1.6, 1.6], voice: 'moo' });
def('critter', 'crow', { label: 'Crow', rig: BIRD('crow'), points: 100, behavior: 'flock', speed: 9, bark: 'critter', size: [.35, .35], bird: true, voice: 'caw' });
def('critter', 'raven', { label: 'Raven', rig: BIRD('raven'), points: 100, behavior: 'flock', speed: 8, bark: 'critter', size: [.45, .45], bird: true, voice: 'caw' });
def('critter', 'grouse', { label: 'Ruffed grouse', rig: BIRD('grouse'), points: 150, behavior: 'flush', speed: 11, bark: 'critter', size: [.45, .45], bird: true, voice: 'whirr' });
def('critter', 'marmot', { label: 'Marmot', rig: Q('marmot'), points: 75, behavior: 'popup', speed: 2, bark: 'critter', size: [.7, .6], voice: 'whistle' });
def('critter', 'coyote', { label: 'Coyote', rig: Q('coyote'), points: 250, behavior: 'trot', speed: 4, bark: 'critter', size: [1.1, 1], voice: 'howl' });
def('critter', 'wolf', { label: 'Gray wolf', rig: Q('wolf'), points: 300, behavior: 'pack', speed: 9, bark: 'critter', size: [1.3, 1.2], voice: 'howl' });
def('critter', 'eagle', { label: 'Bald eagle', rig: BIRD('eagle'), points: -400, protected: true, behavior: 'soar', speed: 10, bark: 'eagle', size: [1, .8], bird: true });
def('critter', 'duck', { label: 'Mallard', rig: BIRD('duck'), points: 150, behavior: 'flush', speed: 12, bark: 'critter', size: [.45, .45], bird: true, water: true, voice: 'quack' });
def('critter', 'loon', { label: 'Common loon', rig: BIRD('loon'), points: -400, protected: true, behavior: 'swim', speed: .8, bark: 'loon', size: [.7, .6], bird: true, water: true, voice: 'loon' });
def('critter', 'beaver', { label: 'Beaver', rig: Q('beaver'), points: 100, behavior: 'swim', speed: 1, bark: 'critter', size: [.9, .5], water: true, voice: 'slap' });
