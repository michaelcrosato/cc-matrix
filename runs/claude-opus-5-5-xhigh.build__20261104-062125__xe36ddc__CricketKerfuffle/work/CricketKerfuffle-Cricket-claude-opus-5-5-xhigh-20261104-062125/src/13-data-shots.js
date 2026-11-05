/* ---- SHOTS: the resolver table. Button (shot | loft | block), the ball's length (yorker | full | good | short), the
 * stick's sector in the batter's frame (degrees: + off side, 0 straight, +-180 behind) -> a shot: contactAt (seconds
 * from the press to the bat meeting the ball), launch angle, speed (u/s), the contact zone (line: units off the middle
 * stump, + off side; z: height) and the natural direction (theta) used when the stick is neutral. ---- */
const SHOTS = {
  straightDrive: { name: 'Straight drive', btn: 'shot', len: ['full', 'yorker'], sec: [-25, 25], at: .13, launch: 3, speed: 440, line: [-6, 8], z: [0, 14], nat: 0, fam: 'drive' },
  coverDrive: { name: 'Cover drive', btn: 'shot', len: ['full', 'yorker'], sec: [25, 75], at: .13, launch: 4, speed: 450, line: [-4, 14], z: [0, 14], nat: 50, fam: 'drive' },
  onDrive: { name: 'On drive', btn: 'shot', len: ['full', 'yorker'], sec: [-75, -25], at: .13, launch: 4, speed: 430, line: [-8, 6], z: [0, 14], nat: -40, fam: 'drive' },
  flick: { name: 'Flick off the pads', btn: 'shot', len: ['full', 'good', 'yorker'], sec: [-130, -75], at: .12, launch: 6, speed: 400, line: [-12, 3], z: [0, 18], nat: -100, fam: 'flick' },
  glance: { name: 'Leg glance', btn: 'shot', len: ['full', 'good', 'yorker'], sec: [-180, -130], at: .11, launch: 3, speed: 330, line: [-12, 1], z: [0, 20], nat: -155, fam: 'flick' },
  punch: { name: 'Back-foot punch', btn: 'shot', len: ['good'], sec: [25, 75], at: .12, launch: 5, speed: 410, line: [-4, 14], z: [4, 24], nat: 45, fam: 'drive', back: true },
  pull: { name: 'Pull', btn: 'shot', len: ['short'], sec: [-130, -60], at: .12, launch: 8, speed: 460, line: [-8, 12], z: [12, 34], nat: -95, fam: 'pull', back: true },
  cut: { name: 'Square cut', btn: 'shot', len: ['short', 'good'], sec: [75, 125], at: .11, launch: 5, speed: 460, line: [4, 22], z: [4, 28], nat: 100, fam: 'cut', back: true },
  lateCut: { name: 'Late cut', btn: 'shot', len: ['yorker', 'full', 'good', 'short'], sec: [125, 180], at: .1, launch: 2, speed: 300, line: [3, 20], z: [2, 24], nat: 150, fam: 'cut', back: true },
  push: { name: 'Push', btn: 'shot', len: ['yorker', 'full', 'good', 'short'], sec: [-180, 180], at: .12, launch: 3, speed: 320, line: [-9, 13], z: [0, 26], nat: 20, fam: 'drive' },
  loftStraight: { name: 'Lofted straight hit', btn: 'loft', len: ['full', 'yorker', 'good'], sec: [-30, 30], at: .14, launch: 38, speed: 330, line: [-7, 9], z: [0, 18], nat: 0, fam: 'loft' },
  loftCover: { name: 'Inside-out over cover', btn: 'loft', len: ['full', 'good'], sec: [30, 80], at: .14, launch: 34, speed: 320, line: [-3, 16], z: [0, 18], nat: 50, fam: 'loft' },
  slog: { name: 'Slog sweep', btn: 'loft', len: ['full', 'good'], sec: [-110, -30], at: .15, launch: 36, speed: 335, line: [-11, 9], z: [0, 22], nat: -65, fam: 'loft' },
  hook: { name: 'Hook', btn: 'loft', len: ['short'], sec: [-140, -60], at: .12, launch: 30, speed: 340, line: [-8, 11], z: [16, 40], nat: -95, fam: 'pull', back: true },
  upperCut: { name: 'Upper cut', btn: 'loft', len: ['short'], sec: [60, 120], at: .11, launch: 34, speed: 310, line: [4, 22], z: [16, 38], nat: 110, fam: 'cut', back: true },
  scoop: { name: 'Scoop over the keeper', btn: 'loft', len: ['yorker', 'full', 'good', 'short'], sec: [150, 180], at: .12, launch: 42, speed: 260, line: [-5, 7], z: [0, 22], nat: 178, fam: 'scoop', both: true },
  helicopter: { name: 'Helicopter', btn: 'loft', len: ['yorker'], sec: [-30, 30], at: .12, launch: 40, speed: 350, line: [-5, 7], z: [0, 8], nat: -5, fam: 'loft' },
  loftAny: { name: 'Slog', btn: 'loft', len: ['yorker', 'full', 'good', 'short'], sec: [-180, 180], at: .14, launch: 32, speed: 320, line: [-8, 12], z: [0, 28], nat: -30, fam: 'loft' },
  forwardDefence: { name: 'Forward defence', btn: 'block', len: ['yorker', 'full', 'good'], sec: [-180, 180], at: .08, launch: 0, speed: 60, line: [-9, 13], z: [0, 22], nat: 5, fam: 'block' },
  backDefence: { name: 'Back defence', btn: 'block', len: ['short'], sec: [-180, 180], at: .08, launch: 0, speed: 50, line: [-9, 13], z: [6, 30], nat: 5, fam: 'block', back: true }
};
const SHOT_ORDER = { shot: ['straightDrive', 'coverDrive', 'onDrive', 'flick', 'glance', 'punch', 'pull', 'cut', 'lateCut', 'push'], loft: ['helicopter', 'loftStraight', 'loftCover', 'slog', 'hook', 'upperCut', 'scoop', 'loftAny'], block: ['forwardDefence', 'backDefence'] };
/** the natural shot for a ball (no stick): by the button, the length and the line (off-positive units at the crease) */
function naturalShot(btn, len, line) {
  if (btn === 'block') return len === 'short' ? 'backDefence' : 'forwardDefence';
  if (btn === 'loft') return len === 'short' ? (line > 8 ? 'upperCut' : 'hook') : len === 'yorker' ? 'helicopter' : line > 6 ? 'loftCover' : line < -3 ? 'slog' : 'loftStraight';
  if (len === 'short') return line > 6 ? 'cut' : 'pull';
  if (len === 'good') return line > 6 ? 'punch' : line < -4 ? 'flick' : 'push';
  return line > 5 ? 'coverDrive' : line < -5 ? 'flick' : line < -2 ? 'onDrive' : 'straightDrive';
}
/** the resolver: the shot for a button, a sector (or null: neutral) and the ball's length and line */
function resolveShot(btn, sector, len, line) {
  if (sector === null || sector === undefined) return naturalShot(btn, len, line);
  for (const id of SHOT_ORDER[btn]) {
    const s = SHOTS[id]; if (!s.len.includes(len)) continue;
    if (sector >= s.sec[0] && sector <= s.sec[1]) return id;
    if (s.both && (sector >= s.sec[0] || sector <= -s.sec[0])) return id;
  }
  return btn === 'loft' ? 'loftAny' : btn === 'block' ? naturalShot(btn, len, line) : 'push';
}
K.SHOTS = SHOTS; K.resolveShot = resolveShot; K.naturalShot = naturalShot;
