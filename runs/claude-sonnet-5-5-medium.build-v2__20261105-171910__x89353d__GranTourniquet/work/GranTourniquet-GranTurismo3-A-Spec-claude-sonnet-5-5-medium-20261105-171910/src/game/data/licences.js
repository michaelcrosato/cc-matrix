// Licence tests as data (section 6). `a`/`b` are track sections: ['C', cornerIndex, metres] or ['S', metres]. Medal times are frozen in medals.js (tools/medals.mjs).
export const LICENCES = {
  C: { id: 'C', name: 'PROVISIONAL', reward: 2000, prize: 'pico', carId: 'kite', about: 'The first licence. Four short lessons on an old airfield.' },
  B: { id: 'B', name: 'CLUB', reward: 5000, prize: 'moth', carId: 'ginga', needs: 'C', about: 'Threshold braking, exits, and three ways to drive a corner.' },
  A: { id: 'A', name: 'NATIONAL', reward: 10000, prizeCredits: 25000, prizeNote: 'GOLD HELMET', needs: 'B', about: 'Blind crests, switchbacks, loose dirt and a harbour by lamplight.' },
};
export const TESTS = [
  { id: 'C-1', lic: 'C', title: 'START AND STOP', carId: 'kite', track: 'proving', start: 'standing', a: ['S', 0], box: [385, 415], tyre: 'street', limits: { off: true },
    brief: 'Accelerate to the marker, then bring the car to rest inside the white box. Please remember: the brake is also a steering wheel.', tip: 'THE BRAKE IS A PEDAL WITH A FAR END. PRESS EARLY, THEN EASE.', demo: 'stop' },
  { id: 'C-2', lic: 'C', title: 'FIRST CORNER', carId: 'kite', track: 'proving', start: 'rolling', startKmh: 60, a: ['C', 0, -100], b: ['C', 1, 100], limits: { off: true },
    brief: 'Turn in, find the apex, unwind. The kerb is not a part of the road, but it forgives.', tip: 'BRAKE BEFORE THE TURN, NOT DURING IT. THEN LOOK AT THE EXIT.', demo: 'line' },
  { id: 'C-3', lic: 'C', title: 'CONE WEAVE', carId: 'kite', track: 'proving', start: 'rolling', startKmh: 50, a: ['S', 80], b: ['S', 360], cones: { s0: 120, n: 6, gap: 40 }, penalty: 1, limits: { off: true },
    brief: 'Six cones, forty metres apart. Pass each on alternate sides. A cone struck adds one second. The cone is not offended.', tip: 'WEIGHT MOVES WHEN YOU STEER. LEAN INTO IT EARLY AND SMOOTHLY.', demo: 'weave' },
  { id: 'C-4', lic: 'C', title: 'THE SHORT LOOP', carId: 'kite', track: 'proving', start: 'rolling', startKmh: 70, a: ['C', 2, -50], b: ['C', 6, 50], limits: { off: true },
    brief: 'Five corners in a row. Please link them, and keep your head up. The next corner is already visible.', tip: 'THE EXIT OF ONE CORNER IS THE ENTRY OF THE NEXT.', demo: 'line' },
  { id: 'B-1', lic: 'B', title: 'THRESHOLD', carId: 'ginga', track: 'proving', start: 'rolling', startKmh: 160, a: ['S', 200], box: [350, 380], assists: { abs: false }, limits: { off: true }, tyre: 'sport',
    brief: 'From 160 km/h, with the anti-lock brakes switched off, stop inside the box. Locking a wheel is allowed. It is also slow.', tip: 'SQUEEZE, DO NOT STAMP. A LOCKED TYRE HAS GIVEN UP.', demo: 'stop' },
  { id: 'B-2', lic: 'B', title: 'HAIRPIN EXIT', carId: 'ginga', track: 'kestrel', start: 'rolling', startKmh: 70, a: ['C', 5, -150], b: ['C', 7, 60], assists: { tcs: 0 }, limits: { off: true },
    brief: 'The hairpin, then the corner after it, with traction control off. The rear axle has opinions. Feed it the throttle.', tip: 'FEED THE THROTTLE. THE REAR TYRES CANNOT PUSH AND TURN AT ONCE.', demo: 'line' },
  { id: 'B-3', lic: 'B', title: 'THREE LAYOUTS', carId: 'kite', cars: ['kite', 'ginga', 'ryu'], track: 'proving', start: 'rolling', startKmh: 70, a: ['C', 7, -60], b: ['C', 10, 60], limits: { off: true },
    brief: 'The same corners in three cars: front-drive, rear-drive and four-wheel drive. Your three times are added together.', tip: 'FRONT-DRIVE PULLS. REAR-DRIVE PUSHES. FOUR-WHEEL DRIVE DIGS.', demo: 'line' },
  { id: 'B-4', lic: 'B', title: 'ONE LAP OF KESTREL', carId: 'ginga', track: 'kestrel', start: 'flying', startKmh: 100, a: ['S', 0], lap: true, limits: { off: true },
    brief: 'One lap of Kestrel Park, from a flying start. Rhythm matters more than courage. We will be watching the windmill.', tip: 'RHYTHM: SLOW IN, FAST OUT, AND NO SURPRISES.', demo: 'line' },
  { id: 'A-1', lic: 'A', title: 'BLIND CREST', carId: 'brandt32', track: 'cedar', start: 'rolling', startKmh: 100, a: ['C', 3, -100], b: ['C', 5, 100], limits: { off: true },
    brief: 'You cannot see the road beyond the crest. It is there. Please trust the road you remember.', tip: 'TRUST THE ROAD YOU REMEMBER. LIFT ON THE CREST, NOT AFTER IT.', demo: 'line' },
  { id: 'A-2', lic: 'A', title: 'SWITCHBACKS', carId: 'moth', track: 'cedar', start: 'rolling', startKmh: 70, a: ['C', 7, -40], b: ['C', 10, 40], limits: { off: true },
    brief: 'Four tight corners, uphill, in a car of 135 PS. Momentum is not given back. Please do not waste it.', tip: 'MOMENTUM: IN A LIGHT CAR, A LATE BRAKE IS A SLOW EXIT.', demo: 'line' },
  { id: 'A-3', lic: 'A', title: 'RED CLAY', carId: 'ryuRally', track: 'redclay', start: 'rolling', startKmh: 70, a: ['C', 7, -40], b: ['C', 10, 40], limits: { off: false }, tyre: 'dirt',
    brief: 'Loose surface, four corners. The handbrake locks the rear wheels and the car rotates. It is allowed. It is even encouraged.', tip: 'ROTATE WITH THE HANDBRAKE, THEN GET BACK ON THE POWER.', demo: 'line' },
  { id: 'A-4', lic: 'A', title: 'HARBOUR AT NIGHT', carId: 'libeccio', track: 'harbour', start: 'flying', startKmh: 100, a: ['S', 0], lap: true, hour: 21, limits: { off: true, wall: true },
    brief: 'One lap of Harbour Lights, by lamplight. The walls are close and have not moved. Touching one ends the attempt.', tip: 'EVERYTHING, BY LAMPLIGHT. THE WALL IS ALWAYS FURTHER IN THAN IT LOOKS.', demo: 'line' },
];
export const testById = (id) => TESTS.find((t) => t.id === id);
export const testsOf = (lic) => TESTS.filter((t) => t.lic === lic);
