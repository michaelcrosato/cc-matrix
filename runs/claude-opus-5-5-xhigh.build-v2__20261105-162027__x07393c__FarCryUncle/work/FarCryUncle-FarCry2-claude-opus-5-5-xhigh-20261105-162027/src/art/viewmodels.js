// First person, in camera space: +X right, +Y up, barrel along -Z. One hands model with every gun and prop under named pivots.
// Parts may be thin here: they sit half a metre from your eye.
import { model } from '../../pixel-engine.js';
const P = { sleeve: 'night', cuff: 'slate', skin: 'plum', steel: 'ink', steel2: 'night', metal: 'slate', wood: 'red', wood2: 'plum', rust: 'orange', tape: 'mist', flare: 'orange', flare2: 'sand', tank: 'teal', hose: 'ink', olive: 'green', glow: 'sand', blood: 'red', paper: 'sand', white: 'white', brass: 'sand', led: 'lime', leg: 'slate', bone: 'white', pill: 'white', glass: 'teal', flame: 'orange', fuel: 'orange', cloth: 'white' };
const b = (w, h, d, x, y, z, c, rot) => ({ box: [w, h, d], at: [x, y, z], c, ...(rot ? { rot } : {}) });
const cy = (w, h, x, y, z, c, rot) => ({ cyl: [w, h, w], at: [x, y, z], c, seg: 6, ...(rot ? { rot } : {}) });
const piv = (name, group, at = [0, 0, 0], rot) => ({ group, at, pivot: true, name, ...(rot ? { rot } : {}) });

// Gun parts, in the Weapon frame: right-hand grip near (0, -0.07, 0.10), fore-grip near (0, -0.03, -0.30).
export const GUN_PARTS = {
  tractor: {
    body: [b(0.046, 0.07, 0.28, 0, 0, 0, 'metal'), b(0.04, 0.02, 0.26, 0, 0.045, 0, 'steel'), cy(0.02, 0.36, 0, 0.012, -0.32, 'steel', [90, 0, 0]), cy(0.018, 0.2, 0, 0.038, -0.24, 'steel2', [90, 0, 0]), b(0.052, 0.05, 0.2, 0, 0.002, -0.24, 'wood'), b(0.012, 0.045, 0.012, 0, 0.044, -0.46, 'steel'), cy(0.028, 0.05, 0, 0.012, -0.51, 'steel2', [90, 0, 0]), b(0.042, 0.066, 0.22, 0, -0.006, 0.25, 'wood'), b(0.036, 0.1, 0.04, 0, -0.072, 0.1, 'wood', [-16, 0, 0]), b(0.05, 0.022, 0.05, 0, 0.056, 0.1, 'steel')],
    mag: [b(0.034, 0.15, 0.062, 0, -0.1, -0.05, 'steel2', [12, 0, 0])], bolt: [b(0.05, 0.016, 0.03, 0.026, 0.024, 0.02, 'metal')],
    rust: [b(0.05, 0.03, 0.12, 0, 0.02, -0.03, 'rust'), cy(0.024, 0.12, 0, 0.012, -0.34, 'rust', [90, 0, 0]), b(0.046, 0.012, 0.09, 0, 0.056, 0.06, 'rust')],
    tape: [b(0.06, 0.06, 0.05, 0, 0.002, -0.2, 'tape'), b(0.05, 0.075, 0.03, 0, -0.004, 0.2, 'tape')], muzzle: [0, 0.012, -0.54],
  },
  mule: {
    body: [b(0.05, 0.08, 0.2, 0, 0, 0.02, 'metal'), cy(0.032, 0.46, 0, 0.02, -0.28, 'steel', [90, 0, 0]), cy(0.026, 0.34, 0, -0.016, -0.22, 'steel2', [90, 0, 0]), b(0.046, 0.08, 0.24, 0, -0.01, 0.24, 'wood2'), b(0.036, 0.1, 0.04, 0, -0.07, 0.1, 'wood2', [-16, 0, 0]), b(0.01, 0.02, 0.01, 0, 0.044, -0.5, 'brass')],
    mag: [b(0.03, 0.03, 0.05, 0.03, -0.02, 0.04, 'flare')], bolt: [b(0.05, 0.05, 0.13, 0, -0.018, -0.28, 'wood2')],
    rust: [cy(0.036, 0.16, 0, 0.02, -0.36, 'rust', [90, 0, 0]), b(0.054, 0.04, 0.1, 0, 0.018, 0.02, 'rust')], tape: [b(0.054, 0.09, 0.04, 0, -0.01, 0.2, 'tape')], muzzle: [0, 0.02, -0.52],
  },
  empire: {
    body: [b(0.04, 0.05, 0.42, 0, 0, -0.02, 'wood'), cy(0.018, 0.44, 0, 0.018, -0.42, 'steel', [90, 0, 0]), b(0.044, 0.08, 0.24, 0, -0.012, 0.3, 'wood'), cy(0.05, 0.28, 0, 0.082, -0.03, 'steel', [90, 0, 0]), cy(0.058, 0.03, 0, 0.082, -0.18, 'steel2', [90, 0, 0]), cy(0.056, 0.03, 0, 0.082, 0.11, 'steel2', [90, 0, 0]), b(0.02, 0.04, 0.02, 0, 0.05, -0.06, 'steel'), b(0.02, 0.04, 0.02, 0, 0.05, 0.06, 'steel'), b(0.036, 0.08, 0.04, 0, -0.06, 0.12, 'wood', [-20, 0, 0])],
    mag: [b(0.03, 0.04, 0.09, 0, -0.04, -0.02, 'steel')], bolt: [b(0.06, 0.016, 0.016, 0.034, 0.03, 0.06, 'metal'), b(0.02, 0.02, 0.02, 0.066, 0.02, 0.06, 'metal')],
    rust: [cy(0.022, 0.14, 0, 0.018, -0.46, 'rust', [90, 0, 0]), b(0.044, 0.02, 0.1, 0, 0.022, 0, 'rust')], tape: [b(0.05, 0.06, 0.04, 0, -0.002, -0.14, 'tape')], muzzle: [0, 0.018, -0.65],
  },
  weed: {
    body: [cy(0.05, 0.3, 0, 0.01, -0.18, 'metal', [90, 0, 0]), cy(0.028, 0.26, 0, 0.012, -0.44, 'steel', [90, 0, 0]), cy(0.04, 0.03, 0, 0.012, -0.57, 'brass', [90, 0, 0]), b(0.05, 0.05, 0.1, 0, 0.02, 0.02, 'steel2'), b(0.036, 0.09, 0.04, 0, -0.06, 0.1, 'wood2', [-16, 0, 0]), b(0.09, 0.2, 0.09, 0.09, -0.12, 0.12, 'tank'), b(0.1, 0.03, 0.1, 0.09, -0.04, 0.12, 'flare'), cy(0.02, 0.22, 0.05, -0.02, 0.06, 'hose', [50, 0, 60]), b(0.006, 0.02, 0.05, 0, 0.04, -0.58, 'glow')],
    mag: [b(0.06, 0.1, 0.05, 0, -0.06, -0.16, 'tank')], bolt: [b(0.05, 0.02, 0.02, 0.03, 0.03, 0, 'metal')],
    rust: [cy(0.054, 0.12, 0, 0.01, -0.2, 'rust', [90, 0, 0]), b(0.09, 0.08, 0.092, 0.09, -0.16, 0.12, 'rust')], tape: [cy(0.056, 0.05, 0, 0.01, -0.08, 'tape', [90, 0, 0])], muzzle: [0, 0.012, -0.6],
  },
  tube: {
    body: [cy(0.1, 0.92, 0, 0.05, -0.1, 'olive', [90, 0, 0]), cy(0.12, 0.05, 0, 0.05, -0.56, 'steel', [90, 0, 0]), cy(0.13, 0.08, 0, 0.05, 0.34, 'steel', [90, 0, 0]), b(0.03, 0.09, 0.03, 0, -0.04, 0.08, 'steel2', [-14, 0, 0]), b(0.03, 0.08, 0.03, 0, -0.04, -0.24, 'steel2'), b(0.02, 0.06, 0.02, -0.06, 0.1, -0.1, 'steel')],
    mag: [cy(0.07, 0.14, 0, 0.05, -0.62, 'flare', [90, 0, 0]), { cone: [0.07, 0.1, 0.07], at: [0, 0.05, -0.73], rot: [-90, 0, 0], c: 'flare', seg: 6 }], bolt: [b(0.02, 0.02, 0.05, 0.04, 0.0, 0.08, 'metal')],
    rust: [cy(0.104, 0.3, 0, 0.05, 0.12, 'rust', [90, 0, 0])], tape: [cy(0.11, 0.05, 0, 0.05, -0.3, 'tape', [90, 0, 0])], muzzle: [0, 0.05, -0.6],
  },
  m38: {
    body: [b(0.03, 0.05, 0.1, 0, 0.012, -0.02, 'metal'), cy(0.024, 0.14, 0, 0.022, -0.14, 'steel', [90, 0, 0]), b(0.008, 0.02, 0.008, 0, 0.044, -0.2, 'steel'), b(0.03, 0.09, 0.044, 0, -0.056, 0.05, 'wood', [-20, 0, 0]), b(0.012, 0.03, 0.02, 0, 0.042, 0.03, 'steel')],
    mag: [cy(0.052, 0.06, 0, 0.012, -0.04, 'steel', [90, 0, 0])], bolt: [b(0.012, 0.012, 0.024, 0, 0.04, 0.04, 'metal')],
    rust: [cy(0.028, 0.08, 0, 0.022, -0.16, 'rust', [90, 0, 0])], tape: [b(0.034, 0.05, 0.05, 0, -0.056, 0.05, 'tape', [-20, 0, 0])], muzzle: [0, 0.022, -0.22],
  },
  flare: {
    body: [b(0.036, 0.05, 0.1, 0, 0.0, -0.01, 'flare'), b(0.03, 0.09, 0.044, 0, -0.056, 0.05, 'wood2', [-20, 0, 0]), b(0.02, 0.02, 0.02, 0, 0.034, 0.03, 'steel')],
    mag: [cy(0.03, 0.05, 0, 0.012, -0.11, 'flare2', [90, 0, 0])], bolt: [cy(0.05, 0.14, 0, 0.012, -0.11, 'flare', [90, 0, 0])],
    rust: [b(0.038, 0.02, 0.06, 0, 0.018, 0, 'rust')], tape: [b(0.034, 0.05, 0.05, 0, -0.056, 0.05, 'tape', [-20, 0, 0])], muzzle: [0, 0.012, -0.19],
  },
  cane: {
    body: [b(0.022, 0.1, 0.03, 0, -0.03, 0.05, 'wood2'), b(0.014, 0.06, 0.34, 0, 0.012, -0.14, 'metal'), b(0.014, 0.02, 0.32, 0, 0.042, -0.15, 'mist' === 0 ? 'metal' : 'tape'), { box: [0.014, 0.05, 0.08], at: [0, 0.03, -0.32], rot: [30, 0, 0], c: 'metal' }],
    mag: [], bolt: [], rust: [b(0.016, 0.03, 0.12, 0, 0.0, -0.1, 'rust')], tape: [], muzzle: [0, 0.01, -0.34],
  },
};
const HAND_R = [b(0.07, 0.08, 0.09, 0, 0, 0, 'skin'), b(0.082, 0.024, 0.07, 0, -0.04, -0.02, 'skin'), b(0.022, 0.05, 0.03, -0.03, 0.03, -0.05, 'skin')];
const HAND_L = [b(0.09, 0.05, 0.1, 0, -0.03, 0, 'skin'), b(0.022, 0.03, 0.09, -0.04, 0.0, -0.02, 'skin')];

export const handsDef = (() => {
  const guns = Object.entries(GUN_PARTS);
  return model({
    id: 'fp-hands', about: 'First-person arms and hands with every gun and tool on named pivots; camera space', tags: ['first-person'], floats: true, collider: 'none', palette: P,
    parts: [piv('Root', [
      piv('Weapon', [
        ...guns.map(([id, g]) => piv(`g-${id}`, g.body)),
        ...guns.map(([id, g]) => piv(`rust-${id}`, g.rust)),
        ...guns.map(([id, g]) => piv(`tape-${id}`, g.tape)),
        piv('Mag', guns.map(([id, g]) => piv(`m-${id}`, g.mag))),
        piv('Bolt', guns.map(([id, g]) => piv(`b-${id}`, g.bolt))),
        piv('ArmR', [b(0.1, 0.1, 0.46, 0, 0, -0.23, 'sleeve'), b(0.11, 0.11, 0.05, 0, 0, -0.42, 'cuff'),
          piv('HandR', [...HAND_R.map((p) => ({ ...p }))], [0, 0, -0.5]),
        ], [0.235, -0.354, 0.438], [40, 28, 0]),
        // Things held in the right hand.
        piv('p-syrette', [cy(0.022, 0.13, 0, -0.03, -0.05, 'white', [90, 0, 0]), cy(0.008, 0.06, 0, -0.03, -0.14, 'metal', [90, 0, 0]), b(0.03, 0.012, 0.012, 0, -0.03, 0.02, 'steel'), cy(0.024, 0.03, 0, -0.03, -0.03, 'blood', [90, 0, 0])]),
        piv('p-pliers', [b(0.012, 0.012, 0.14, -0.012, -0.03, -0.1, 'metal'), b(0.012, 0.012, 0.14, 0.012, -0.03, -0.1, 'metal'), b(0.01, 0.01, 0.04, -0.008, -0.03, -0.19, 'steel'), b(0.01, 0.01, 0.04, 0.008, -0.03, -0.19, 'steel')]),
        piv('p-bullet', [cy(0.014, 0.024, 0, -0.03, -0.215, 'brass', [90, 0, 0]), b(0.018, 0.018, 0.008, 0, -0.03, -0.2, 'blood')]),
        piv('p-knife', [b(0.014, 0.02, 0.08, 0, -0.03, -0.02, 'wood2'), b(0.008, 0.03, 0.14, 0, -0.024, -0.13, 'tape'), b(0.006, 0.018, 0.05, 0, -0.018, -0.22, 'tape'), b(0.01, 0.03, 0.05, 0, -0.024, -0.18, 'blood')]),
        piv('p-lighter', [b(0.03, 0.05, 0.02, 0, 0.0, -0.05, 'metal'), b(0.03, 0.012, 0.022, 0, 0.03, -0.05, 'brass')]),
        piv('p-flame', [b(0.018, 0.05, 0.018, 0, 0.065, -0.05, 'flame'), b(0.008, 0.03, 0.008, 0, 0.06, -0.05, 'glow')]),
        piv('p-wrench', [b(0.016, 0.02, 0.24, 0, -0.03, -0.11, 'metal'), b(0.05, 0.02, 0.03, 0, -0.03, -0.24, 'metal')]),
        piv('p-bottle', [cy(0.05, 0.13, 0, 0.03, -0.04, 'glass'), cy(0.024, 0.06, 0, 0.12, -0.04, 'glass'), b(0.02, 0.05, 0.02, 0, 0.16, -0.04, 'cloth'), b(0.014, 0.03, 0.014, 0, 0.2, -0.04, 'flame')]),
        piv('p-charge', [b(0.13, 0.05, 0.09, 0, 0, -0.08, 'olive'), b(0.05, 0.03, 0.03, 0.02, 0.035, -0.08, 'steel'), b(0.012, 0.012, 0.012, -0.03, 0.03, -0.1, 'blood')]),
        piv('p-det', [b(0.04, 0.09, 0.03, 0, 0.02, -0.04, 'steel2'), b(0.012, 0.03, 0.012, 0, 0.08, -0.04, 'blood'), b(0.006, 0.06, 0.006, 0.014, 0.08, -0.05, 'metal')]),
        piv('p-tablet', [b(0.012, 0.012, 0.012, 0, 0.01, -0.06, 'pill')]),
        piv('p-finish', [b(0.03, 0.05, 0.1, 0, 0.012, -0.02, 'metal'), cy(0.024, 0.14, 0, 0.022, -0.14, 'steel', [90, 0, 0]), b(0.03, 0.09, 0.044, 0, -0.056, 0.05, 'wood', [-20, 0, 0]), cy(0.052, 0.06, 0, 0.012, -0.04, 'steel', [90, 0, 0])]),
      ], [0.16, -0.15, -0.4]),
      piv('Off', [
        piv('ArmL', [b(0.1, 0.1, 0.62, 0, 0, -0.31, 'sleeve'), b(0.11, 0.11, 0.05, 0, 0, -0.58, 'cuff'),
          piv('w-arm', [b(0.106, 0.106, 0.3, 0, 0, -0.44, 'skin'), b(0.05, 0.012, 0.1, 0, 0.056, -0.38, 'blood'), b(0.016, 0.014, 0.05, 0.014, 0.06, -0.4, 'steel')]),
          piv('w-burn', [b(0.106, 0.106, 0.3, 0, 0, -0.44, 'skin'), b(0.08, 0.012, 0.15, 0, 0.056, -0.4, 'blood'), b(0.04, 0.014, 0.08, 0.01, 0.06, -0.38, 'flare')]),
          piv('HandL', [...HAND_L, piv('FingerL', [b(0.018, 0.018, 0.05, 0, 0, -0.025, 'skin')], [0.03, -0.01, -0.05])], [0, 0, -0.64]),
        ], [-0.358, -0.281, 0.45], [32, -34, 0]),
        piv('p-trk', [b(0.07, 0.11, 0.024, 0, 0.05, -0.02, 'steel2'), b(0.05, 0.05, 0.004, 0, 0.06, -0.033, 'olive'), b(0.008, 0.08, 0.008, 0.028, 0.14, -0.02, 'steel')]),
        piv('led-off', [b(0.024, 0.024, 0.006, 0, 0.03, -0.034, 'blood')]),
        piv('led-on', [b(0.024, 0.024, 0.006, 0, 0.03, -0.034, 'led')]),
        piv('p-mono', [cy(0.05, 0.14, 0, 0.04, -0.06, 'steel', [90, 0, 0]), cy(0.058, 0.03, 0, 0.04, -0.13, 'steel2', [90, 0, 0])]),
        piv('p-pill', [cy(0.04, 0.07, 0, 0.04, -0.04, 'wood'), cy(0.042, 0.02, 0, 0.082, -0.04, 'white')]),
      ], [0.16, -0.18, -0.7]),
      piv('MapJ', [], [0, -0.02, -0.42]),
      piv('Leg', [b(0.2, 0.17, 0.5, 0, 0, 0, 'leg'), b(0.2, 0.17, 0.2, 0, -0.02, 0.32, 'leg'), piv('w-thigh', [b(0.05, 0.01, 0.1, 0.02, 0.09, -0.05, 'blood'), b(0.02, 0.012, 0.03, 0.01, 0.094, -0.06, 'bone')])], [0.0, -0.4, -0.42]),
    ])],
  });
})();
// A gun alone, side on, for Tibor's table: same parts, one model per gun.
const rackDef = (id, g) => model({ id: `rack-${id}`, about: `${id} on Tibor's table`, tags: ['first-person', 'shop'], floats: true, collider: 'none', palette: P, parts: [...g.body, ...g.mag, ...g.bolt] });
export const rackDefs = Object.fromEntries(Object.entries(GUN_PARTS).map(([id, g]) => [id, rackDef(id, g)]));
/** Shoulders, bone lengths and which way the elbows point, in the cab's eye space. */
export const CAB_ARM = { upper: 0.3, fore: 0.28, shoulderL: [0.2, -0.3, -0.06], shoulderR: [-0.2, -0.3, -0.06], poleL: [0.7, -0.95, 0.1], poleR: [-0.7, -0.95, 0.1] };
const cabDef = (kind, about, { dash = 'slate', dial = 'sand', rim = 1, tilt = -24, wheelAt = [0, -0.25, 0.42], dialUp = 0, extras = [] } = {}) => model({
  id: `cab-${kind}`, about: `${about}; a wheel, a lever and two forearms from the driver seat, origin at the eye`, tags: ['first-person', 'vehicle'], floats: true, collider: 'none',
  palette: { wheel: 'ink', hub: 'night', sleeve: 'night', skin: 'plum', dash, dial, arrow: 'lime' },
  parts: [
    b(1.7, 0.1, 0.34, -0.36, -0.36, 0.72, 'dash'), b(0.2, 0.05 + dialUp, 0.14, 0, -0.285 + dialUp / 2, 0.6, 'dial'),
    piv('DashArrow', [b(0.024, 0.012, 0.08, 0, 0, 0, 'arrow'), b(0.07, 0.012, 0.024, 0, 0, 0.04, 'arrow')], [0, -0.254 + dialUp, 0.6]),
    piv('Wheel', [
      { torus: [0.36 * rim, 0.03, 0.36 * rim], at: [0, 0, 0], rot: [90, 0, 0], c: 'wheel' }, b(0.34 * rim, 0.03, 0.03, 0, 0, 0, 'hub'), b(0.03, 0.17 * rim, 0.03, 0, -0.08 * rim, 0, 'hub'),
      piv('GripL', [b(0.045, 0.06, 0.05, 0, 0, 0, 'skin')], [0.117 * rim, 0.117 * rim, 0]),
      piv('GripR', [b(0.045, 0.06, 0.05, 0, 0, 0, 'skin')], [-0.117 * rim, 0.117 * rim, 0]),
    ], wheelAt, [tilt, 0, 0]),
    piv('Shifter', [b(0.02, 0.29, 0.02, 0, 0.145, 0, 'hub'), b(0.035, 0.035, 0.035, 0, 0.3, 0, 'dial')], [-0.3, -0.48, 0.42]),
    // The right hand between the wheel and the lever; twoBoneIK finds each elbow in Driving.update.
    piv('HandR', [b(0.045, 0.06, 0.05, 0, 0, 0, 'skin')], [-0.3, -0.18, 0.42]),
    piv('UpperL', [b(0.08, 0.08, 1, 0, 0, 0.5, 'sleeve')], CAB_ARM.shoulderL),
    piv('UpperR', [b(0.08, 0.08, 1, 0, 0, 0.5, 'sleeve')], CAB_ARM.shoulderR),
    piv('ArmL', [b(0.07, 0.07, 1, 0, 0, 0.5, 'sleeve')], [0.3, -0.56, 0.1]),
    piv('ArmR', [b(0.07, 0.07, 1, 0, 0, 0.5, 'sleeve')], [-0.3, -0.56, 0.1]),
    ...extras,
  ] });
const BIG_WHEEL = { rim: 1.3, tilt: -52, wheelAt: [0, -0.24, 0.46], dialUp: 0.12 };
/** A wheel and dash for each thing you can drive. */
export const CABS = {
  pickup: cabDef('pickup', 'A farm pickup'),
  technical: cabDef('technical', 'A pickup gone to war, an ammunition tin wired to the dash', { dash: 'navy', extras: [b(0.18, 0.1, 0.1, 0.36, -0.265, 0.62, 'hub'), b(0.19, 0.012, 0.03, 0.36, -0.212, 0.62, 'dial')] }),
  truck: cabDef('truck', 'A cargo truck, its big wheel lying nearly flat', { dash: 'plum', ...BIG_WHEEL }),
  tanker: cabDef('tanker', 'A fuel tanker with a pressure gauge you learn to watch', { dash: 'red', ...BIG_WHEEL, extras: [b(0.1, 0.1, 0.03, 0.36, -0.26, 0.6, 'dial'), b(0.012, 0.07, 0.012, 0.36, -0.25, 0.58, 'hub', [0, 0, 40])] }),
};

const R = [0, 0, 0];
// Clips on the hands rig. Rotations are degrees relative to rest; p offsets are metres.
const away = { Off: { p: [-0.1, -0.5, 0.25], r: R } };
const hold = {
  rifle: { Weapon: { r: R, p: R }, Off: { r: R, p: R }, Mag: { p: R }, Bolt: { p: R } },
  pistol: { Weapon: { r: R, p: [-0.02, 0.0, 0.1] }, Off: { p: [-0.12, -0.5, 0.28], r: R } },
  tube: { Weapon: { r: R, p: [0.02, 0.12, 0.16] }, Off: { r: [0, 0, 0], p: [-0.14, 0.02, 0.12] } },
  melee: { Weapon: { r: [24, -14, 12], p: [0.03, -0.03, 0.12] }, Off: { p: [-0.12, -0.5, 0.28], r: R } },
  none: { Weapon: { r: R, p: [0.1, -0.5, 0.3] }, Off: { p: [-0.12, -0.5, 0.28], r: R } },
};
const K = (f, pose, e) => (e ? [f, pose, e] : [f, pose]);
// The left forearm laid across the view, top face up: where the wounds are.
const ARM_UP = { p: [-0.02, 0.08, 0.28], r: [0, -30.7, -28.6] };
export const HANDS_CLIPS = [
  { name: 'HoldRifle', frames: 30, loop: true, keys: [K(0, hold.rifle), K(30, hold.rifle)] },
  { name: 'HoldPistol', frames: 30, loop: true, keys: [K(0, hold.pistol), K(30, hold.pistol)] },
  { name: 'HoldTube', frames: 30, loop: true, keys: [K(0, hold.tube), K(30, hold.tube)] },
  { name: 'HoldMelee', frames: 30, loop: true, keys: [K(0, hold.melee), K(30, hold.melee)] },
  { name: 'HoldNone', frames: 30, loop: true, keys: [K(0, hold.none), K(30, hold.none)] },
  // Reloads: magazine out and in on Mag, bolt on Bolt.
  { name: 'ReloadRifle', frames: 72, keys: [K(0, hold.rifle),
    K(10, { Weapon: { r: [14, 0, 24], p: [-0.04, 0.04, 0.05] }, Off: { p: [0.0, -0.04, 0.34], r: [0, 0, 0] } }, 'out'),
    K(22, { Mag: { p: [0, -0.28, 0.02] }, Off: { p: [0.02, -0.34, 0.34], r: [0, 0, 0] } }),
    K(42, { Mag: { p: [0, -0.2, 0.02] }, Off: { p: [0.02, -0.2, 0.34], r: [0, 0, 0] } }),
    K(50, { Mag: { p: R }, Off: { p: [0, -0.06, 0.32], r: R }, Weapon: { r: [10, 0, 18], p: [-0.03, 0.03, 0.04] } }, 'in'),
    K(58, { Bolt: { p: [0, 0, 0.1] }, Off: { p: [0.0, 0.08, 0.44], r: R }, Weapon: { r: [6, 0, 12], p: [-0.02, 0.02, 0.03] } }),
    K(64, { Bolt: { p: R } }), K(72, hold.rifle)] },
  { name: 'ReloadPump', frames: 96, keys: [K(0, hold.rifle),
    K(10, { Weapon: { r: [18, 0, 26], p: [-0.04, 0.05, 0.04] } }),
    ...[20, 36, 52, 68].flatMap((f) => [K(f, { Off: { p: [0.0, -0.12, 0.42], r: R }, Mag: { p: [0, -0.06, 0] } }), K(f + 8, { Off: { p: [0.0, -0.02, 0.36], r: R }, Mag: { p: R } })]),
    K(84, { Bolt: { p: [0, 0, 0.1] }, Off: { p: [0, 0, 0.1], r: R }, Weapon: { r: [4, 0, 4], p: R } }), K(90, { Bolt: { p: R }, Off: { p: R, r: R } }), K(96, hold.rifle)] },
  { name: 'ReloadBolt', frames: 80, keys: [K(0, hold.rifle),
    K(8, { Weapon: { r: [8, 0, 26], p: [-0.04, 0.03, 0.04] }, Bolt: { p: R } }), K(16, { Bolt: { p: [0, 0, 0.08] }, Off: { p: [0.0, -0.1, 0.42], r: R } }),
    K(50, { Bolt: { p: [0, 0, 0.08] }, Off: { p: [0.0, -0.02, 0.5], r: R }, Mag: { p: [0, -0.02, 0] } }), K(58, { Bolt: { p: R }, Mag: { p: R } }), K(70, { Off: { p: [0, 0, 0.1], r: R } }), K(80, hold.rifle)] },
  { name: 'ReloadRevolver', frames: 68, keys: [K(0, hold.pistol),
    K(10, { Weapon: { r: [42, 0, 20], p: [-0.04, 0.04, 0.1] }, Mag: { p: [0.03, 0, 0] } }), K(20, { Off: { p: [-0.02, -0.14, 0.42], r: R } }),
    K(46, { Off: { p: [-0.03, -0.06, 0.42], r: R } }), K(54, { Mag: { p: R }, Off: { p: [-0.1, -0.3, 0.3], r: R } }), K(68, hold.pistol)] },
  { name: 'ReloadFlare', frames: 48, keys: [K(0, hold.pistol),
    K(8, { Bolt: { r: [40, 0, 0] }, Weapon: { r: [14, 0, 10], p: [-0.02, 0.02, 0.1] } }), K(20, { Off: { p: [-0.04, -0.12, 0.42], r: R }, Mag: { p: [0, -0.1, 0.05] } }), K(32, { Mag: { p: R }, Off: { p: [-0.04, -0.08, 0.42], r: R } }), K(40, { Bolt: { r: R }, Off: { p: [-0.1, -0.3, 0.3], r: R } }), K(48, hold.pistol)] },
  { name: 'ReloadTube', frames: 84, keys: [K(0, hold.tube), K(14, { Weapon: { r: [-16, 0, 0], p: [0.02, 0.0, 0.2] } }), K(30, { Mag: { p: [0, -0.2, 0] }, Off: { p: [-0.14, -0.3, 0.1], r: R } }), K(62, { Mag: { p: R }, Off: { p: [-0.14, 0.0, 0.1], r: R } }), K(84, hold.tube)] },
  // Unjam: slap the side, rack the bolt.
  { name: 'UnjamRifle', frames: 22, fast: true, keys: [K(0, hold.rifle), K(5, { Weapon: { r: [6, -10, 20], p: [-0.03, 0.02, 0.05] }, Off: { p: [0.1, 0.02, 0.36], r: [0, 0, 40] } }, 'out'), K(8, { Weapon: { r: [12, -6, 26], p: [-0.05, 0.03, 0.05] }, Off: { p: [0.06, 0.03, 0.36], r: [0, 0, 40] } }), K(14, { Bolt: { p: [0, 0, 0.1] }, Off: { p: [0.04, 0.09, 0.42], r: R } }, 'in'), K(17, { Bolt: { p: R } }), K(22, hold.rifle)] },
  { name: 'UnjamPistol', frames: 22, fast: true, keys: [K(0, hold.pistol), K(5, { Weapon: { r: [32, 0, 28], p: [-0.04, 0.03, 0.1] }, Off: { p: [-0.04, -0.1, 0.44], r: R } }, 'out'), K(9, { Weapon: { r: [44, 0, 34], p: [-0.06, 0.04, 0.1] }, Off: { p: [-0.05, -0.04, 0.42], r: R } }), K(15, { Mag: { p: [0.03, 0, 0] } }), K(18, { Mag: { p: R } }), K(22, hold.pistol)] },
  { name: 'FallApart', frames: 42, keys: [K(0, hold.rifle), K(8, { Weapon: { r: [10, 0, 10], p: [0, 0.02, 0.04] } }, 'out'), K(14, { Mag: { p: [0, -0.6, 0.1] }, Bolt: { p: [0.2, -0.3, 0.2] }, Weapon: { r: [-26, 0, 16], p: [0, -0.04, 0.05] } }, 'in'), K(28, { Mag: { p: [0, -1, 0.1] }, Bolt: { p: [0.3, -0.8, 0.2] }, Weapon: { r: [-46, 8, 22], p: [0.04, -0.3, 0.08] } }), K(42, { Weapon: { r: [-46, 8, 22], p: [0.1, -0.6, 0.3] }, Off: { p: [-0.12, -0.5, 0.28], r: R } })] },
  { name: 'Equip', frames: 12, keys: [K(0, { Weapon: { r: [-34, 0, 0], p: [0, -0.26, 0.1] }, Off: { p: [-0.1, -0.3, 0.15], r: R } }, 'out')] },
  { name: 'Holster', frames: 8, keys: [K(0, hold.rifle), K(8, { Weapon: { r: [-34, 0, 0], p: [0, -0.26, 0.1] }, Off: { p: [-0.1, -0.3, 0.15], r: R } }, 'in')] },
  // Cane knife.
  { name: 'Swing', frames: 16, fast: true, keys: [K(0, hold.melee), K(4, { Weapon: { r: [50, 30, 30], p: [0.1, 0.09, 0.06] } }, 'out'), K(8, { Weapon: { r: [-42, -40, -38], p: [-0.2, -0.14, -0.05] } }, 'in'), K(16, hold.melee)] },
  // Throw and plant.
  { name: 'Throw', frames: 22, fast: true, keys: [K(0, { Weapon: { r: R, p: [0.02, -0.1, 0.05] } }), K(6, { Weapon: { r: [50, 0, 10], p: [0.08, 0.22, 0.2] } }, 'out'), K(12, { Weapon: { r: [-50, 0, 0], p: [-0.02, 0.1, -0.2] } }, 'in'), K(22, { Weapon: { r: [-30, 0, 0], p: [0.1, -0.5, 0.2] } })] },
  { name: 'Plant', frames: 42, keys: [K(0, { Weapon: { r: R, p: [0, -0.1, 0.05] } }), K(12, { Weapon: { r: [-40, 0, 0], p: [-0.12, -0.2, -0.02] }, Off: { p: [-0.22, -0.2, 0.24], r: R } }, 'out'), K(34, { Weapon: { r: [-44, 0, 0], p: [-0.12, -0.26, -0.02] }, Off: { p: [-0.22, -0.24, 0.24], r: R } }), K(42, { Weapon: { r: [-30, 0, 0], p: [0.1, -0.5, 0.2] } })] },
  { name: 'Detonate', frames: 20, fast: true, keys: [K(0, { Weapon: { r: [-6, 0, 0], p: [-0.1, -0.02, 0.16] } }), K(5, { Weapon: { r: [-14, 0, 0], p: [-0.1, -0.05, 0.14] } }, 'in'), K(12, { Weapon: { r: [-6, 0, 0], p: [-0.1, -0.02, 0.16] } }), K(20, { Weapon: { r: [-30, 0, 0], p: [0.1, -0.5, 0.2] } })] },
  // The body.
  { name: 'Tablet', frames: 56, keys: [K(0, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R } }),
    K(10, { Off: { p: [-0.26, -0.04, 0.36], r: R } }, 'out'), K(18, { Weapon: { p: [-0.16, -0.02, 0.18], r: [0, 0, 0] }, Off: { p: [-0.26, -0.02, 0.36], r: R } }),
    K(26, { Weapon: { p: [-0.2, -0.0, 0.24], r: [20, 0, 0] } }), K(38, { Weapon: { p: [-0.16, 0.14, 0.34], r: [50, 0, 0] }, Off: { p: [-0.12, -0.3, 0.28], r: R } }, 'out'), K(46, { Weapon: { p: [-0.16, 0.12, 0.34], r: [40, 0, 0] } }), K(56, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R } })] },
  { name: 'Syrette', frames: 48, keys: [K(0, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R }, Leg: { p: [0, -0.3, 0], r: R } }),
    K(10, { Weapon: { p: [-0.1, 0.26, 0.1], r: [-30, 0, 0] }, Leg: { p: [0, 0.2, 0.05], r: R } }, 'out'), K(18, { Weapon: { p: [-0.12, 0.28, 0.07], r: [-40, 0, 0] } }), K(24, { Weapon: { p: [-0.14, 0.195, 0.07], r: [-58, 0, 0] } }, 'in'), K(36, { Weapon: { p: [-0.14, 0.19, 0.07], r: [-58, 0, 0] } }), K(48, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Leg: { p: [0, -0.3, 0], r: R } })] },
  // Four field surgeries. Each takes about 4 s (120 frames); the arm comes up to your eyes and you work on it.
  { name: 'Surgery1', frames: 124, keys: [K(0, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R } }),
    K(14, { Off: ARM_UP }, 'out'), K(24, { Weapon: { p: [-0.06, 0.1, 0.15], r: [0, 30, 0] }, Off: ARM_UP }),
    K(38, { Weapon: { p: [-0.065, 0.06, 0.222], r: [-8, 30, 0] } }, 'in'), K(52, { Weapon: { p: [-0.07, 0.05, 0.222], r: [-14, 36, 6] }, Off: { ...ARM_UP, r: [4, -32, -29] } }), K(62, { Weapon: { p: [-0.06, 0.07, 0.222], r: [-6, 24, -6] }, Off: ARM_UP }), K(76, { Weapon: { p: [-0.07, 0.05, 0.222], r: [-14, 36, 6] }, Off: { ...ARM_UP, r: [6, -33, -28], p: [-0.02, 0.07, 0.28] } }),
    K(90, { Weapon: { p: [-0.02, 0.18, 0.18], r: [20, 20, 0] }, Off: { ...ARM_UP, r: [10, -30, -32], p: [-0.03, 0.05, 0.28] } }, 'out'), K(104, { Weapon: { p: [0.1, 0.1, 0.16], r: [10, -10, 16] } }), K(124, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R } })] },
  { name: 'Surgery2', frames: 124, keys: [K(0, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R }, Leg: { p: [0, -0.3, 0], r: R } }),
    K(14, { Leg: { p: [0, 0.2, 0.05], r: [6, 0, 0] }, Off: { p: [-0.4, 0.02, 0.32], r: [0, 40, 0] } }, 'out'), K(26, { Weapon: { p: [-0.1, 0.3, 0.13], r: [-30, 0, 0] } }),
    K(40, { Weapon: { p: [-0.14, 0.23, 0.137], r: [-50, 4, 0] } }, 'in'), K(56, { Weapon: { p: [-0.13, 0.2, 0.137], r: [-56, -12, 6] } }), K(68, { Weapon: { p: [-0.15, 0.21, 0.137], r: [-52, 12, -6] }, Leg: { p: [0, 0.18, 0.05], r: [8, 0, 0] } }), K(80, { Weapon: { p: [-0.13, 0.2, 0.137], r: [-58, -12, 6] } }),
    K(94, { Weapon: { p: [-0.05, 0.3, 0.13], r: [-16, 0, 0] } }, 'out'), K(108, { Weapon: { p: [0.14, 0.05, 0.16], r: [0, -14, 22] } }), K(124, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R }, Leg: { p: [0, -0.3, 0], r: R } })] },
  { name: 'Surgery3', frames: 112, keys: [K(0, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R }, FingerL: { r: R } }),
    K(14, { Off: { p: [-0.24, 0.16, 0.34], r: [40, 30, 0] }, FingerL: { r: [0, 58, 30] } }, 'out'), K(40, { Off: { p: [-0.23, 0.17, 0.34], r: [44, 34, 0] }, FingerL: { r: [0, 58, 30] }, Weapon: { p: [-0.22, 0.2, 0.22], r: [20, 30, 0] } }),
    K(62, { Weapon: { p: [-0.21, 0.19, 0.22], r: [24, 34, 0] }, FingerL: { r: [0, 58, 30] } }), K(68, { Weapon: { p: [-0.2, 0.24, 0.22], r: [40, 36, 6] }, FingerL: { r: R }, Off: { p: [-0.23, 0.13, 0.34], r: [30, 30, 8] } }, 'in'),
    K(80, { Off: { p: [-0.25, 0.1, 0.34], r: [26, 26, 0] }, FingerL: { r: R } }), K(112, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R } })] },
  { name: 'Surgery4', frames: 124, keys: [K(0, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R } }),
    K(14, { Off: ARM_UP }, 'out'), K(28, { Weapon: { p: [-0.12, -0.14, 0.12], r: R }, Off: ARM_UP }),
    K(42, { Weapon: { p: [-0.17, -0.09, 0.09], r: R } }, 'in'), K(62, { Weapon: { p: [-0.2, -0.09, 0.09], r: [0, 0, 6] }, Off: { ...ARM_UP, r: [4, -32, -29] } }), K(84, { Weapon: { p: [-0.14, -0.09, 0.09], r: [0, 0, -6] }, Off: { ...ARM_UP, r: [6, -29, -28] } }),
    K(100, { Weapon: { p: [0.1, -0.1, 0.14], r: R } }, 'out'), K(124, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R } })] },
  // Hands on things.
  { name: 'MapRaise', frames: 12, keys: [K(0, { MapJ: { p: [0, -0.5, 0.12], r: [-40, 0, 0] }, Weapon: { p: [0.1, -0.4, 0.3], r: R }, Off: { p: [-0.12, -0.4, 0.28], r: R } }), K(12, { MapJ: { p: R, r: R }, Weapon: { p: [0.09, 0.03, -0.04], r: R }, Off: { p: [-0.41, -0.01, 0.36], r: R } }, 'out')] },
  { name: 'MapHold', frames: 30, loop: true, keys: [K(0, { MapJ: { p: R, r: R }, Weapon: { p: [0.09, 0.03, -0.04], r: R }, Off: { p: [-0.41, -0.01, 0.36], r: R } }), K(30, { MapJ: { p: R, r: R }, Weapon: { p: [0.09, 0.03, -0.04], r: R }, Off: { p: [-0.41, -0.01, 0.36], r: R } })] },
  { name: 'TrackerUp', frames: 30, loop: true, keys: [K(0, { Off: { p: [-0.32, 0.03, 0.36], r: [10, 12, 0] } }), K(30, { Off: { p: [-0.32, 0.03, 0.36], r: [10, 12, 0] } })] },
  { name: 'MonoUp', frames: 12, keys: [K(0, { Off: { p: [-0.14, -0.3, 0.3], r: R } }), K(12, { Off: { p: [-0.16, 0.18, 0.42], r: R } }, 'out')] },
  { name: 'Wrench', frames: 32, loop: true, keys: [K(0, { Weapon: { p: [-0.1, -0.08, 0.02], r: [-36, 0, 0] }, Off: { p: [-0.2, -0.12, 0.1], r: [-20, 0, 0] } }), K(10, { Weapon: { p: [-0.13, -0.12, 0.02], r: [-46, 18, 8] } }), K(20, { Weapon: { p: [-0.07, -0.12, 0.02], r: [-46, -18, -8] } }), K(32, { Weapon: { p: [-0.1, -0.08, 0.02], r: [-36, 0, 0] }, Off: { p: [-0.2, -0.12, 0.1], r: [-20, 0, 0] } })] },
  { name: 'FinishIt', frames: 40, keys: [K(0, { Weapon: { p: [0.1, -0.5, 0.3], r: R }, Off: { p: [-0.12, -0.5, 0.28], r: R } }), K(12, { Weapon: { p: [-0.12, 0.02, 0.1], r: [-8, 0, 0] } }, 'out'), K(26, { Weapon: { p: [-0.13, 0.015, 0.1], r: [-8, 0, 0] } }), K(28, { Weapon: { p: [-0.13, 0.03, 0.14], r: [12, 0, 0] } }, 'in'), K(40, { Weapon: { p: [0.1, -0.5, 0.3], r: R } })] },
  { name: 'Open', frames: 30, loop: true, keys: [K(0, { Weapon: { p: [-0.1, -0.1, 0.0], r: [-20, 0, 0] }, Off: { p: [-0.2, -0.1, 0.1], r: [0, 0, 0] } }), K(15, { Weapon: { p: [-0.12, -0.07, -0.02], r: [-30, 8, 0] } }), K(30, { Weapon: { p: [-0.1, -0.1, 0.0], r: [-20, 0, 0] } })] },
];
export const HANDS_RIG = { joints: ['Root', 'Weapon', 'Mag', 'Bolt', 'ArmR', 'HandR', 'Off', 'ArmL', 'HandL', 'FingerL', 'MapJ', 'Leg'], root: 'Root', mirror: {}, soles: [], trace: [], limits: {}, fps: 30 };
