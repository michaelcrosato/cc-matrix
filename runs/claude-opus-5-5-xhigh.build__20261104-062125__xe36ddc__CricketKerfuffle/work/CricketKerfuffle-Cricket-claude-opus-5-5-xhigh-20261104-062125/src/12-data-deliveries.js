/* ---- DELIVERIES (speeds nominal km/h; swing + = away from a right-hander; turn degrees, + = away from a
 * right-hander). Swing base acceleration: 60 u/s² x swing x T('swing') x ground factor. A bowler lists 3 deliveries
 * of a family plus a special. Field presets in the batter's frame (theta degrees from straight, + off side; distance
 * in units, 'b' = the boundary minus 30). ---- */
const DELIVERIES = {
  express: { name: 'Express', fam: 'pace', kmh: [138, 148], swing: .1, seam: 1, turn: 0, bounce: 1, len: [60, 110] },
  bouncer: { name: 'Bouncer', fam: 'pace', kmh: [135, 145], swing: 0, seam: 1, turn: 0, bounce: 1.25, len: [140, 200] },
  yorker: { name: 'Yorker', fam: 'pace', kmh: [136, 146], swing: .15, seam: .5, turn: 0, bounce: .9, len: [2, 18] },
  slower: { name: 'Slower ball', fam: 'pace', kmh: [105, 115], swing: 0, seam: 1.2, turn: 0, bounce: .95, len: [50, 90], hideSpeed: true },
  outswing: { name: 'Outswinger', fam: 'swing', kmh: [125, 135], swing: 1, seam: 1, turn: 0, bounce: 1, len: [40, 90] },
  inswing: { name: 'Inswinger', fam: 'swing', kmh: [125, 135], swing: -1, seam: 1, turn: 0, bounce: 1, len: [40, 90] },
  wobble: { name: 'Wobble seam', fam: 'swing', kmh: [120, 130], swing: 0, wobble: .3, seam: 3, turn: 0, bounce: 1, len: [60, 110] },
  dobber: { name: 'Dobber', fam: 'medium', kmh: [100, 110], swing: .1, seam: 1.5, turn: 0, bounce: .95, len: [60, 110] },
  cutter: { name: 'Cutter', fam: 'medium', kmh: [105, 115], swing: 0, seam: 1, turn: 3, bounce: .95, len: [60, 110] },
  knuckle: { name: 'Knuckle ball', fam: 'medium', kmh: [95, 105], swing: 0, wobble: .4, seam: .5, turn: 0, bounce: .9, len: [40, 90] },
  legbreak: { name: 'Leg break', fam: 'spin', kmh: [78, 88], swing: -.3, seam: .3, turn: 9, bounce: 1.05, len: [50, 100] },
  googly: { name: 'Googly', fam: 'spin', kmh: [76, 86], swing: .2, seam: .3, turn: -8, bounce: 1.05, len: [50, 100] },
  topspin: { name: 'Top-spinner', fam: 'spin', kmh: [80, 90], swing: 0, seam: .3, turn: 0, bounce: 1.2, len: [50, 100] },
  offbreak: { name: 'Off break', fam: 'spin', kmh: [80, 90], swing: .3, seam: .3, turn: -8, bounce: 1, len: [50, 100] },
  armball: { name: 'Arm ball', fam: 'spin', kmh: [88, 96], swing: .3, seam: .3, turn: 0, bounce: .95, len: [50, 100] },
  doosra: { name: 'Doosra', fam: 'spin', kmh: [78, 88], swing: 0, seam: .3, turn: 8, bounce: 1.05, len: [50, 100] },
  piston: { name: 'Piston Express', fam: 'machine', kmh: [160, 170], swing: 0, seam: .8, turn: 0, bounce: 1.05, len: [60, 110] },
  steamBouncer: { name: 'Steam Bouncer', fam: 'machine', kmh: [150, 150], swing: 0, seam: 1, turn: 0, bounce: 1.35, len: [140, 190], fx: 'steam' },
  spinCycle: { name: 'Spin Cycle', fam: 'machine', kmh: [95, 95], swing: 0, seam: 0, turn: 14, randTurn: true, bounce: 1.1, len: [50, 100] }
};
const FAMILY = { pace: { runup: 2.0, runLen: 150, label: 'PACE' }, swing: { runup: 1.7, runLen: 120, label: 'SWING' }, medium: { runup: 1.5, runLen: 95, label: 'MEDIUM' }, spin: { runup: .9, runLen: 40, label: 'SPIN' }, machine: { runup: 1.4, runLen: 0, label: 'MACHINE' } };
const B = 'b';
const FIELDS = {
  attacking: { name: 'Attacking', spots: [['slip1', 165, 150], ['slip2', 158, 150], ['slip3', 151, 152], ['gully', 132, 150], ['point', 95, 230], ['cover', 58, 260], ['midoff', 14, 300], ['midon', -14, 300], ['fineleg', -162, B]] },
  balanced: { name: 'Balanced', spots: [['slip1', 165, 150], ['point', 95, 240], ['cover', 55, 270], ['midoff', 12, 320], ['midon', -12, 320], ['midwicket', -60, 270], ['squareleg', -95, 250], ['fineleg', -160, B], ['thirdman', 155, B]] },
  defensive: { name: 'Defensive', spots: [['point', 95, 250], ['deepcover', 55, B], ['longoff', 12, B], ['longon', -12, B], ['deepmid', -60, B], ['deepsquare', -95, B], ['fineleg', -160, B], ['thirdman', 155, B], ['cover', 40, 260]] },
  spin: { name: 'Spin attack', spots: [['slip1', 160, 40], ['shortleg', -100, 50], ['sillypoint', 100, 50], ['cover', 55, 240], ['midoff', 12, 280], ['midon', -12, 280], ['midwicket', -60, 240], ['deepsquare', -95, B], ['longon', -15, B]] }
};
const FIELD_ORDER = ['attacking', 'balanced', 'defensive', 'spin'];
const POS_NAMES = { slip1: 'first slip', slip2: 'second slip', slip3: 'third slip', gully: 'gully', point: 'point', cover: 'cover', midoff: 'mid-off', midon: 'mid-on', fineleg: 'fine leg', midwicket: 'midwicket', squareleg: 'square leg', thirdman: 'third man', deepcover: 'deep cover', longoff: 'long-off', longon: 'long-on', deepmid: 'deep midwicket', deepsquare: 'deep square leg', shortleg: 'short leg', sillypoint: 'silly point', keeper: 'wicketkeeper', bowler: 'the bowler' };
K.DELIVERIES = DELIVERIES; K.FAMILY = FAMILY; K.FIELDS = FIELDS; K.FIELD_ORDER = FIELD_ORDER; K.POS_NAMES = POS_NAMES;
