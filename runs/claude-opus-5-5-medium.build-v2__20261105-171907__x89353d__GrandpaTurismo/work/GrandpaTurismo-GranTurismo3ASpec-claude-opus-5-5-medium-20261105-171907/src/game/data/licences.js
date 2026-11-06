// Licence tests as data. from/to resolve against a track (corner index c plus metres off, or a raw s from the start line).
import { MEDALS } from './medals.gen.js';
const t = (id, title, carId, track, o) => ({ id, title, carId, track, medals: MEDALS[id], ...o });
export const LICENCES = [
  { id: 'C', name: 'PROVISIONAL', reward: 2000, goldLine: 'A PICO, AS A PRIZE. PLEASE LOOK AFTER IT.', goldCar: 'pico', blurb: 'THE FIRST CLIPBOARD. THE KITE, THE PROVING GROUND.', tests: ['C-1', 'C-2', 'C-3', 'C-4'] },
  { id: 'B', name: 'CLUB', reward: 5000, goldLine: 'A CASTELLAN MOTH, AS A PRIZE. IT WAS IN THE WAY.', goldCar: 'moth', blurb: 'REAR-WHEEL DRIVE. KESTREL PARK.', tests: ['B-1', 'B-2', 'B-3', 'B-4'] },
  { id: 'A', name: 'NATIONAL', reward: 10000, goldLine: '25,000 CREDITS AND A GOLD HELMET FOR THE SHELF.', goldCredits: 25000, goldHelmet: true, blurb: 'CEDAR, RED CLAY AND THE HARBOUR AT NIGHT.', tests: ['A-1', 'A-2', 'A-3', 'A-4'] },
];
export const LICENCE = Object.fromEntries(LICENCES.map((l) => [l.id, l]));
export const TESTS = [
  t('C-1', 'START AND STOP', 'kite', 'proving', { standing: true, from: { s: -300 }, box: { at: 100, len: 30 }, limits: { offroad: true }, assists: {}, lesson: 'THE BRAKE IS A PEDAL WITH A FAR END.',
    brief: 'Accelerate to the marker, then bring the car to rest inside the white box. Please remember: the brake is also a steering wheel.', tip: 'BRAKE EARLY. THE BOX WILL WAIT.' }),
  t('C-2', 'FIRST CORNER', 'kite', 'proving', { startSpeed: 60, from: { c: 0, off: -100 }, to: { c: 1, off: 100 }, limits: { offroad: true }, assists: {}, lesson: 'TURN IN, APEX, UNWIND.',
    brief: 'One corner, driven properly. Turn in, touch the apex, and let the car run wide on the way out.', tip: 'SLOW IN, FAST OUT. THIS HAS BEEN TRUE FOR SOME TIME.' }),
  t('C-3', 'CONE WEAVE', 'kite', 'proving', { startSpeed: 50, from: { s: -200 }, to: { s: 200 }, cones: { at: -120, n: 6, gap: 40 }, limits: { offroad: true }, assists: {}, lesson: 'WEIGHT MOVES.',
    brief: 'Pass the cones on alternate sides, starting on the left. Each cone hit or missed adds one second. The cones are not angry. They are only cones.', tip: 'STEER EARLY. THE CAR ARRIVES LATER THAN YOU DO.' }),
  t('C-4', 'THE SHORT LOOP', 'kite', 'proving', { startSpeed: 60, from: { c: 2, off: -50 }, to: { c: 6, off: 50 }, limits: { offroad: true }, assists: {}, lesson: 'LINK CORNERS. KEEP YOUR HEAD UP.',
    brief: 'Five corners in a row. Each one begins where the last one ended. Please look ahead of the car.', tip: 'THE EXIT OF ONE CORNER IS THE ENTRY OF THE NEXT.' }),
  t('B-1', 'THRESHOLD', 'ginga', 'proving', { startSpeed: 160, from: { s: -60 }, box: { at: 105, len: 30 }, limits: { offroad: true }, assists: { abs: false }, lesson: "SQUEEZE, DON'T STAMP.",
    brief: 'The ABS is off for this test. Stop inside the box. Locking the wheels is allowed. It is not admired.', tip: 'A TYRE THAT IS LOCKED IS ONLY A SLED.' }),
  t('B-2', 'HAIRPIN EXIT', 'ginga', 'kestrel', { startSpeed: 90, from: { c: 5, off: -150 }, to: { c: 7, off: 60 }, limits: { offroad: true }, assists: { tcs: 0 }, lesson: 'FEED THE THROTTLE.',
    brief: 'Traction control is off. The rear tyres will do as they are told, if they are told slowly.', tip: 'OPEN THE THROTTLE AS YOU OPEN THE STEERING.' }),
  t('B-3', 'THREE LAYOUTS', 'kite', 'proving', { runs: ['kite', 'ginga', 'ryu'], startSpeed: 60, from: { c: 7 }, to: { c: 10 }, limits: { offroad: true }, assists: {}, lesson: 'FF, FR, 4WD IN THE SAME CORNERS.',
    brief: 'The same four corners, in three cars. Front drive, rear drive, all four. The times are added. You will have a favourite. Please keep it to yourself.', tip: 'EACH CAR WANTS A DIFFERENT THROTTLE.' }),
  t('B-4', 'ONE LAP OF KESTREL', 'ginga', 'kestrel', { flying: true, startSpeed: 110, from: { s: -220 }, limits: { offroad: true }, assists: {}, lesson: 'RHYTHM.',
    brief: 'One flying lap of Kestrel Park. The windmill is not part of the course. Many have asked.', tip: 'DO NOT HURRY. BE EARLY.' }),
  t('A-1', 'BLIND CREST', 'brandt32', 'cedar', { startSpeed: 90, from: { c: 3, off: -100 }, to: { c: 5, off: 100 }, limits: { offroad: true }, assists: {}, lesson: 'TRUST THE ROAD YOU REMEMBER.',
    brief: 'The road goes over the crest and turns. You cannot see this. You must remember it.', tip: 'A CREST TAKES WEIGHT FROM ALL FOUR TYRES AT ONCE.' }),
  t('A-2', 'SWITCHBACKS', 'moth', 'cedar', { startSpeed: 60, from: { c: 7 }, to: { c: 10 }, limits: { offroad: true }, assists: {}, lesson: 'MOMENTUM.',
    brief: 'The Moth has 135 PS and the road goes uphill. What you have when you arrive is what you keep.', tip: 'A SMOOTH LINE IS A CHEAP SOURCE OF POWER.' }),
  t('A-3', 'RED CLAY', 'ryuRally', 'redclay', { startSpeed: 60, from: { c: 7 }, to: { c: 10 }, limits: { offroad: false }, assists: {}, lesson: 'ROTATE WITH THE HANDBRAKE.',
    brief: 'Dirt. Use the handbrake to turn the car in the slow corners. It is not rude here.', tip: 'LOOK WHERE YOU WISH TO GO. THE CAR IS GOING SOMEWHERE ELSE.' }),
  t('A-4', 'HARBOUR AT NIGHT', 'libeccio', 'harbour', { flying: true, startSpeed: 90, hour: 21, from: { s: -200 }, limits: { offroad: true }, assists: {}, lesson: 'EVERYTHING, BY LAMPLIGHT.',
    brief: 'One flying lap of the Harbour. The walls are close and it is dark. There is no margin. I will be here.', tip: 'THE LAMPS MARK THE CORNERS. COUNT THEM.' }),
];
export const TEST = Object.fromEntries(TESTS.map((x) => [x.id, x]));
