/* ---- UNITS AND GEOMETRY (16 world units = 1 m; x east = screen right, y south = down the screen, z up) ----
 * The pitch runs along x = 0. The striker's stumps are at y = 0 (the far end, top of the broadcast screen), the
 * bowler's at y = 320 (the near end). The camera is always behind the current bowler; at a change of ends the batters
 * swap logical places, so the striker always faces the +y end. Batter's frame: angles from "straight" (toward the
 * bowler, +y), positive toward the off side. A right-hander (hand = +1) has the off side at -x. */
const G = {
  STUMPS_Y: 0, BOWL_Y: 320, CREASE_S: 20, CREASE_B: 300, RETURN_X: 21, PITCH_HALF: 24, MID_Y: 160,
  STUMP_HALF: 3, STUMP_H: 12, BALL_R: .6, PAD_FRONT: 24, CONTACT_FRONT: 36, CONTACT_BACK: 14,
  RELEASE_Z: 34, RELEASE_X: 8, KEEPER_BACK: 160, KEEPER_UP: 24, STEP: 1 / 120
};
const TYPES = { pace: 'pace', swing: 'swing', medium: 'medium', spin: 'spin', machine: 'machine' };
/** world direction of a batter-frame angle (degrees) for hand (+1 RHB, -1 LHB) */
const dirOf = (thetaDeg, hand) => { const t = thetaDeg * DEG; return [-hand * Math.sin(t), Math.cos(t)]; };
/** batter-frame angle (degrees) of a world direction */
const thetaOf = (dx, dy, hand) => Math.atan2(-hand * dx, dy) / DEG;
const kmhToUps = (kmh, scale) => kmh / 3.6 * 16 * scale;
const upsToKmh = (ups, scale) => ups / (16 * scale) * 3.6;
/** where a ball pitched, as a length from the striker's popping crease: yorker <= 24, full 24-70, good 70-130, short */
const lengthOf = py => { const L = py - G.CREASE_S; return L <= 24 ? 'yorker' : L <= 70 ? 'full' : L <= 130 ? 'good' : 'short'; };
K.G = G; K.dirOf = dirOf; K.thetaOf = thetaOf; K.lengthOf = lengthOf;
