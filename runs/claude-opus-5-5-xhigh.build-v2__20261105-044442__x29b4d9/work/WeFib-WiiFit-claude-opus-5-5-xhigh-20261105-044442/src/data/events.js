// Every event's words, tiers and scoring pars. Plain data: add a tier here and it exists.
export const EVENTS = {
  poses: {
    id: 'poses', title: 'Poses', discipline: 'Stillness', instructor: 'stillwater', place: 'The Sun Deck', landmark: 'sunDeck', music: 'stillness', couch: true, session: true,
    line: 'Follow the ring to each pose, then hold it while the ring shrinks.', can: 'You can breathe with the ring. It helps more than you would think.', cant: "You can't lose this one. You can only do it badly.",
    verbs: [['lean', 'Lean'], ['breathe', 'Breathe'], ['flail', 'Flail']], diagram: 'ring',
    tiers: [
      { poses: 3, hold: 8, ringStart: 0.3, ringEnd: 0.16, sway: [0.08, 0.22], tremor: [0.08, 0.2] },
      { poses: 4, hold: 10, ringStart: 0.3, ringEnd: 0.13, sway: [0.12, 0.3], tremor: [0.1, 0.3] },
      { poses: 5, hold: 12, ringStart: 0.3, ringEnd: 0.1, sway: [0.15, 0.38], tremor: [0.15, 0.4] },
    ],
    sessionConfig: { poses: 4, hold: 9.4, ringStart: 0.3, ringEnd: 0.16, sway: [0.08, 0.22], tremor: [0.08, 0.2] },
  },
  cairn: {
    id: 'cairn', title: 'The Cairn', discipline: 'Stillness', instructor: 'stillwater', place: 'The Quarry Terrace', landmark: 'quarry', music: 'stillness', couch: true, session: true,
    line: 'Hold the slab level while Ms. Stillwater lowers stones onto it.', can: 'You can breathe with the ring. Tall stacks like calm people.', cant: "You can't catch a stone once it has gone.",
    verbs: [['lean', 'Lean'], ['breathe', 'Breathe'], ['flail', 'Flail']], diagram: 'stack',
    tiers: [
      { stones: 6, every: 5.5, hold: 8, sway: [0.1, 0.3], tremor: [0.05, 0.15], offset: 0.015, par: 770 },
      { stones: 8, every: 5, hold: 10, sway: [0.15, 0.4], tremor: [0.08, 0.2], offset: 0.02, par: 990 },
      { stones: 10, every: 4.5, hold: 10, sway: [0.15, 0.4], tremor: [0.08, 0.2], offset: 0.02, wide: true, par: 1120 },
    ],
    sessionConfig: { stones: 7, every: 5.5, hold: 11, sway: [0.1, 0.3], tremor: [0.05, 0.15], offset: 0.015, par: 890 },
  },
  stillWater: {
    id: 'stillWater', title: 'Still Water', discipline: 'Stillness', instructor: 'stillwater', place: 'The Lily Pond', landmark: 'pond', music: 'stillness', couch: false, session: false,
    line: 'Sit on a lily pad for one minute. Stay in the calm zone and things will come to you.', can: 'You can stifle a sneeze with Flail, if you are quick.', cant: "You can't fall in. Ms. Stillwater has asked the pond not to allow it.",
    verbs: [['lean', 'Lean'], ['breathe', 'Breathe'], ['flail', 'Stifle sneeze']], diagram: 'calm',
    tiers: [
      { time: 60, zone: 0.15, sway: [0.07, 0.18], tremor: 0.05, sneezes: 2 },
      { time: 60, zone: 0.12, sway: [0.1, 0.22], tremor: 0.05, sneezes: 3 },
      { time: 60, zone: 0.1, sway: [0.12, 0.26], tremor: 0.05, sneezes: 4 },
    ],
  },
  logReps: {
    id: 'logReps', title: 'Log Reps', discipline: 'Strength', instructor: 'bolster', place: 'The Yard', landmark: 'yard', music: 'strength', couch: true, session: true,
    line: 'Squeeze both feet to sink with the ribbon, let go to rise. Keep the dot in the zone.', can: 'You can drop the log. Coach will catch it. He likes that.', cant: "You can't trust Coach's counting.",
    verbs: [['lean', 'Lean'], ['feet', 'Sink'], ['flail', 'Flail']], diagram: 'squat',
    tiers: [
      { reps: 6, band: [0.16, 0.1], zone: 0.3, sway: [0.08, 0.22], tremor: [0.04, 0.12] },
      { reps: 9, band: [0.14, 0.08], zone: 0.3, sway: [0.12, 0.3], tremor: [0.06, 0.16] },
      { reps: 12, band: [0.12, 0.06], zone: 0.3, sway: [0.15, 0.38], tremor: [0.08, 0.2] },
    ],
    sessionConfig: { reps: 10, noBonus: true, band: [0.16, 0.1], zone: 0.3, sway: [0.08, 0.22], tremor: [0.04, 0.12] },
  },
  plank: {
    id: 'plank', title: 'Plank & Perch', discipline: 'Strength', instructor: 'bolster', place: 'The Beam', landmark: 'pier', music: 'strength', couch: false, session: false,
    line: 'Hold your plank. Gulls will land on you. Lean against the push and keep the dot in the zone.', can: 'You can flail them all off, but Coach will look at you.', cant: "You can't ask the gulls to leave politely. It has been tried.",
    verbs: [['lean', 'Lean'], ['flail', 'Shake off gulls']], diagram: 'plank',
    tiers: [
      { time: 30, every: 5, push: [0.2, 0.4], zone: 0.28, sway: 0.1, par: 100 },
      { time: 45, every: 4.5, push: [0.2, 0.4], zone: 0.28, sway: 0.1, par: 85 },
      { time: 60, every: 4, push: [0.25, 0.45], zone: 0.28, sway: 0.1, par: 82 },
    ],
  },
  tug: {
    id: 'tug', title: 'Tug of Peace', discipline: 'Strength', instructor: 'bolster', place: 'The Beach', landmark: 'beach', music: 'strength', couch: true, session: false,
    line: 'On every Heave, squeeze both feet and lean back. Best of three pulls.', can: 'You can lean back as far as you dare. That is the whole game.', cant: "You can't lean back safely when the other side eases off.",
    verbs: [['lean', 'Lean back'], ['feet', 'Heave'], ['flail', 'Flail']], diagram: 'tug',
    tiers: [
      { power: 0.35, ease: 0 },
      { power: 0.5, ease: 12 },
      { power: 0.54, ease: 9 },
    ],
  },
  stepClass: {
    id: 'stepClass', title: 'Step Class', discipline: 'Cardio', instructor: 'bolster', place: 'The Bandstand', landmark: 'bandstand', music: 'cardio', palette: 'dusk', couch: true, session: true,
    line: 'Press each foot as its footprint reaches you. Lean into the ribbons. The class follows you.', can: 'You can hear the beat in the foot clicks, even with the music low.', cant: "You can't fall in this one. You can only make someone behind you trip.",
    verbs: [['footL', 'Left'], ['footR', 'Right'], ['hop', 'Both'], ['lean', 'Ribbons']], diagram: 'steps',
    tiers: [
      { bpm: 104, chart: 'tier1' },
      { bpm: 116, chart: 'tier2' },
      { bpm: 124, chart: 'tier3' },
    ],
    sessionConfig: { bpm: 116, chart: 'session' },
  },
  plates: {
    id: 'plates', title: 'Plate Spinners', discipline: 'Cardio', instructor: 'bolster', place: 'The Circus Green', landmark: 'green', music: 'cardio', couch: true, session: true,
    line: 'Circle your weight to drive the hoop. Each plate needs its own speed. Keep them all spinning.', can: 'You can change speed. You will need to. On keys, tap A and D in turn.', cant: "You can't fall in this one. Your plates can.",
    verbs: [['circle', 'Drive the hoop']], diagram: 'plates',
    tiers: [
      { time: 60, plates: 'LMS', decay: 0.11 },
      { time: 60, plates: 'LMMS', decay: 0.13 },
      { time: 60, plates: 'LLMMSS', decay: 0.16 },
    ],
    sessionConfig: { time: 50, plates: 'LMS', decay: 0.11 },
  },
  islandLoop: {
    id: 'islandLoop', title: 'Island Loop', discipline: 'Cardio', instructor: 'bolster', place: 'The Ring Road', landmark: 'ringRoad', music: 'cardio', couch: false, session: false,
    line: 'Alternate your feet to jog two laps behind Retired Kevin. Not too fast, not too slow.', can: 'You can pick up shells. The island tilts as you go, so uphill is real.', cant: "You can't overtake Kevin. He will not discuss it.",
    verbs: [['footL', 'Left'], ['footR', 'Right'], ['steer', 'Steer']], diagram: 'loop',
    tiers: [
      { laps: 2, band: 0.15, par: 115 },
      { laps: 3, band: 0.12, par: 119 },
      { laps: 4, band: 0.1, par: 124 },
    ],
  },
  fruitHat: {
    id: 'fruitHat', title: 'Fruit Hat', discipline: 'Balance Play', instructor: 'trudy', place: 'The Pier End', landmark: 'pier', music: 'balance', couch: true, session: true,
    line: 'Catch fruit in your hat. Hop to toss it in the crate. Bigger banks pay more, and tip you over more.', can: 'You can get greedy. It is encouraged.', cant: "You can't keep what you spill.",
    verbs: [['lean', 'Lean'], ['hop', 'Bank it'], ['flail', 'Flail']], diagram: 'hat',
    tiers: [
      { time: 60, radius: 0.45, every: 1.6, mass: 0.015, ankleMax: 4.6, margin: 0.45, par: 50 },
      { time: 60, radius: 0.55, every: 1.3, mass: 0.012, ankleMax: 5, margin: 0.6, par: 59 },
      { time: 60, radius: 0.65, every: 1, mass: 0.012, ankleMax: 5, margin: 0.6, par: 64 },
    ],
    sessionConfig: { time: 50, radius: 0.45, every: 1.6, mass: 0.015, ankleMax: 4.6, margin: 0.45, par: 37 },
  },
  roomService: {
    id: 'roomService', title: 'Room Service', discipline: 'Balance Play', instructor: 'trudy', place: 'The Boardwalk', landmark: 'boardwalk', music: 'balance', couch: true, session: false,
    line: 'Alternate your feet to walk the tray to the far table. Lean into the green before each gust.', can: 'You can brace early. Small early leans keep the glasses.', cant: "You can't hurry a sudden big lean past a tumbler.",
    verbs: [['footL', 'Left'], ['footR', 'Right'], ['lean', 'Lean'], ['flail', 'Flail']], diagram: 'tray',
    tiers: [
      { length: 30, gust: 1.2, every: 7, gary: false, wobbly: false, par: 580 },
      { length: 45, gust: 2, every: 6, gary: true, wobbly: true, par: 470 },
      { length: 60, gust: 2.3, every: 5, gary: true, wobbly: true, par: 365 },
    ],
  },
  springboard: {
    id: 'springboard', title: 'Springboard', discipline: 'Balance Play', instructor: 'trudy', place: 'The Tower', landmark: 'pier', music: 'balance', couch: true, session: true,
    line: 'Squeeze both feet as the board goes down. Hop near the top. Then spin and hit the water well, or badly.', can: 'You can win with a clean dive or a perfect belly flop. Hold Hop to tuck and spin faster.', cant: "You can't stop spinning at once. Let go early.",
    verbs: [['feet', 'Pump'], ['launch', 'Launch'], ['hop', 'Tuck'], ['lean', 'Spin']], diagram: 'dive',
    tiers: [
      { tower: 5, dives: 3, par: 95 },
      { tower: 7, dives: 3, par: 117 },
      { tower: 9, dives: 3, par: 135 },
    ],
    sessionConfig: { tower: 5, dives: 3, par: 95, session: true },
  },
  raft: {
    id: 'raft', title: 'Tippy Raft', discipline: 'Balance Play', instructor: 'trudy', place: 'The Raft', landmark: 'gazebo', music: 'balance', couch: true, session: false,
    line: 'Everyone is on the same raft. Walk, hop and shove. Last doll standing wins the round. Best of three.', can: 'You can shove. It is not very wellness, but you can.', cant: "You can't get back on once you are in the water.",
    verbs: [['move', 'Walk'], ['flail', 'Shove'], ['hop', 'Hop']], diagram: 'raft',
    tiers: [
      { radius: 6, shrink: 12, swell: 6 },
      { radius: 6, shrink: 10, swell: 5 },
      { radius: 5.5, shrink: 8, swell: 4 },
    ],
  },
  grandHold: {
    id: 'grandHold', title: 'The Grand Hold', discipline: 'Everything', instructor: 'trudy', place: 'The Lighthouse', landmark: 'lighthouse', music: 'level', palette: 'golden', couch: false, session: false,
    line: 'Your balance is tied to the island now. Four short phases, then one last hold.', can: 'You can fall. The class has brought a bedsheet.', cant: "You can't fail this. Everyone has seen to it.",
    verbs: [['lean', 'Lean'], ['breathe', 'Breathe'], ['flail', 'Flail']], diagram: 'hold',
    tiers: [{ par: 100 }, { par: 100 }, { par: 100 }],
  },
};
export const DISCIPLINE_ORDER = ['Stillness', 'Strength', 'Cardio', 'Balance Play'];
export const TIER_NAMES = ['Gentle', 'Honest', 'Unreasonable'];
export const SESSION_SET = ['poses', 'cairn', 'logReps', 'stepClass', 'plates', 'fruitHat', 'springboard'];
