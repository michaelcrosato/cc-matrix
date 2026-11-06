/* Activities, poses, charts, courses, trays, days, unlocks. Designers edit this file. */
var G = G || {};
(function () {
  'use strict';
  G.POSES = {
    stork: { clip: '111_39_part1', a: 3.6, b: 7.0, tgt: 1.57 },
    knee: { clip: '111_39_part2', a: .5, b: 2.4, tgt: 1.57 },
    triangle: { clip: '111_39_part3', a: 2.2, b: 5.2, tgt: 1.2 },
    warrior: { clip: '111_39_part3', a: 6.6, b: 7.6, tgt: 1.57 },
    lunge: { clip: '111_38_part1', a: 2.9, b: 5.0, tgt: .25 },
    dog: { clip: '111_38_part2', a: 2.8, b: 5.2, tgt: .25 },
    fold: { clip: '111_38_part2', a: 8.0, b: 8.8, tgt: .25 },
    plank: { clip: '111_41_part3', a: 3.4, b: 6.4, tgt: .25 },
    meditate: { clip: 'Meditate', a: 0.2, b: 2.4, tgt: 1.57 },
    push: { clip: 'Pushup', a: 0, b: 0.771, tgt: .1 },
    squat: { clip: '22_14', a: 1.1, b: 1.72, tgt: 1.2 },
    idle: { clip: 'Idle_Subtle', a: 0, b: 2, tgt: 1.57 },
    wait: { clip: 'Waiting_Loop', a: 0, b: 2, tgt: 1.57 },
    run: { clip: 'Run_Loop', a: 0, b: 1, tgt: 0 },
    walk: { clip: 'Walk_Loop', a: 0, b: 1, tgt: 1.57 },
    sleep: { clip: 'Sleeping', a: 0.4, b: 2, tgt: 1.2 },
    victory: { clip: 'Victory', a: 0.2, b: 1.4, tgt: 1.57 },
    cheer: { clip: 'Cheering_Two_Hands', a: 0.2, b: 1.6, tgt: 1.57 },
    dizzy: { clip: 'Dizzy', a: 0.2, b: 1.5, tgt: 1.57 },
    greet: { clip: 'Greeting', a: 0.2, b: 1.6, tgt: 1.57 },
    wave: { clip: 'Wave_Hello', a: 0.2, b: 1.4, tgt: 1.57 },
    yawn: { clip: 'Stretch_Yawn', a: 0.3, b: 2, tgt: 1.57 },
    hop: { clip: 'Hop_One_Foot_Loop', a: 0.1, b: 1, tgt: 1.57 },
    getup: { clip: 'Get_Up_From_Back', a: 0.4, b: 2.4, tgt: 1.2 },
    jacks: { clip: 'Jumping Jacks', a: 0.2, b: 1.2, tgt: 1.57 }
  };
  G.SUN_POSES = ['lunge', 'dog', 'triangle', 'warrior', 'stork'];
  const star = [.35, .65, .90];
  const flow = [.5, .75, .92];
  G.ACTS = {};
  function add(a) { a.stars = a.stars || star; a.classOk = !!a.classOk; a.hub = a.hub !== false; G.ACTS[a.id] = a; }
  add({ id: 'stork', name: 'Stork Stand', family: 'hold', discipline: 'Stillness', view: 'brawler', dur: [45, 45], set: ['stork1', 'stork2'], pose: 'stork', classOk: true, blurb: 'One leg. One ring. A gull with opinions.' });
  add({ id: 'sun', name: 'Sun Flow', family: 'sun', discipline: 'Stillness', view: 'brawler', dur: [80, 80], set: ['sun', 'sun'], stars: flow, pose: 'lunge', blurb: 'Five poses. The ring breathes. You breathe back.' });
  add({ id: 'candle', name: 'Quiet Candle', family: 'candle', discipline: 'Stillness', view: 'brawler', dur: [60, 60], set: ['candle', 'candle'], pose: 'meditate', classOk: true, blurb: 'Sit. The flame dislikes hurry.' });
  add({ id: 'squat', name: 'Squat Rail', family: 'rep', discipline: 'Strength', view: 'brawler', dur: [32, 60], reps: [8, 12], axis: 'y', pose: 'squat', classOk: true, blurb: 'The bead goes down. You go with it.' });
  add({ id: 'push', name: 'Push-Up', family: 'rep', discipline: 'Strength', view: 'brawler', dur: [24, 50], reps: [6, 10], axis: 'y', pose: 'push', hub: true, blurb: 'Low is the point. The rail agrees.' });
  add({ id: 'lunge', name: 'Side Lunge', family: 'rep', discipline: 'Strength', view: 'brawler', dur: [32, 60], reps: [8, 12], axis: 'x', pose: 'warrior', blurb: 'The bead swings. Your hips answer.' });
  add({ id: 'step', name: 'Step Class', family: 'step', discipline: 'Cardio', view: 'brawler', dur: [60, 60], stars: flow, pose: 'idle', classOk: true, bpm: [100, 120], blurb: 'Four lanes. A click you can trust.' });
  add({ id: 'hoop', name: 'Hoop Hips', family: 'hoop', discipline: 'Cardio', view: 'brawler', dur: [60, 60], pose: 'idle', classOk: true, blurb: 'Circle the lean. Catch what is tossed.' });
  add({ id: 'jog', name: 'Coastal Jog', family: 'jog', discipline: 'Cardio', view: 'brawler', dur: [70, 70], pose: 'run', blurb: 'Stay in the zone. The pier is long.' });
  add({ id: 'slalom', name: 'Mount Posture Slalom', family: 'slalom', discipline: 'Balance', view: 'brawler', dur: [70, 70], pose: 'idle', blurb: 'Lean steers. Poles keep the time.' });
  add({ id: 'tray', name: 'Tray Service', family: 'tray', discipline: 'Balance', view: 'brawler', dur: [60, 60], pose: 'idle', blurb: 'Olives in glasses. Dennis will not explain.' });
  add({ id: 'laundry', name: 'Laundry Line', family: 'laundry', discipline: 'Balance', view: 'side', dur: [70, 70], set: ['laundry', 'laundry'], pose: 'walk', blurb: 'The sign says not to. 10:30 daily.' });
  G.ACT_IDS = Object.keys(G.ACTS);
  G.DISC = {
    Stillness: ['stork', 'sun', 'candle'],
    Strength: ['squat', 'push', 'lunge'],
    Cardio: ['step', 'hoop', 'jog'],
    Balance: ['slalom', 'tray', 'laundry']
  };
  G.GUIDE = {
    1: ['stork', 'squat', 'step'],
    2: ['tray', 'sun', 'push'],
    3: ['hoop', 'laundry', 'candle'],
    4: ['lunge', 'jog', 'slalom']
  };
  G.UNLOCK_DAY = {
    1: ['stork', 'squat', 'step', 'tray'],
    2: ['stork', 'squat', 'step', 'tray', 'sun', 'push', 'hoop', 'laundry'],
    3: ['stork', 'squat', 'step', 'tray', 'sun', 'push', 'hoop', 'laundry', 'candle', 'lunge', 'jog', 'slalom']
  };
  G.UNLOCKS = [
    { at: 5, id: 'towel', name: 'Towel' },
    { at: 10, id: 'headband', name: 'Headband' },
    { at: 15, id: 'sunhat', name: 'Sunhat' },
    { at: 20, id: 'bowtie', name: 'Tare wears a tiny bow tie' },
    { at: 25, id: 'sparehat', name: "Gertrude's Spare Hat" },
    { at: 30, id: 'friend', name: "Gerald's friend" }
  ];
  G.NICKS = ['Gentle Doug', 'Sir Slouch', 'Ms. Almost', 'The Other Pat', 'Soft Colin', 'Nearly Fern', 'Captain Ease', 'Auntie Balance', 'Posture Pete', 'Mildred the Mild', 'Knees McGee', 'The Previous Jan', 'Calm Kevin', 'Not Lou', 'Small Applause', 'Breadstick', 'Officer Gentle', 'Mrs. Wednesday', 'Uncle Still', 'Pat Again'];
  G.LOOKS = {
    hair: ['short', 'spiky', 'long', 'ponytail', 'bald'],
    skin: ['#f3e2cf', '#f6d3bd', '#e0ac7a', '#c68642', '#8d5524', '#5c3317'],
    top: ['#ff7a59', '#2cc6e6', '#7dce82', '#f2d16b', '#b9a0e8', '#f09ab0', '#8fd3f4', '#ece7df'],
    bottom: ['#355f86', '#5f7f8a', '#c9865a', '#3d4a3e']
  };
  G.CHARTS = {
    t1: {
      parts: {
        A: ['x.......x.......', '.', '.', '....x.......x...'],
        B: ['x...x...x.......', '.', '.', '..x...x.....x...']
      },
      order: 'A A B A A A B A A A B A A B A A'
    },
    t2: {
      parts: {
        A: ['x.......x.......', '....x.......x...', 'x.......x.......', '....x.......x...'],
        B: ['x...x...x.......', '..x...x.....x...', '.x...x...x......', 'x.....x...x...x.']
      },
      order: 'A A B A A B A A B A A A B A'
    }
  };
  /* 18 gates, all off the centre line so a straight run misses every one. */
  G.GATES = [];
  for (let i = 0; i < 18; i++) G.GATES.push({ z: 400 + i * 700, x: (i % 2 ? 1 : -1) * (72 + (i % 3) * 18) });
  G.OBSTACLES = [{ z: 1600, x: 0 }, { z: 4200, x: 10 }, { z: 8000, x: -8 }, { z: 11000, x: 6 }];
  function olive(x, y) { return { x: x, y: y }; }
  function glass(x, y) { return { x: x, y: y, r: 16 }; }
  G.TRAYS = [
    { name: 'Three olives', olives: [olive(40, 70), olive(40, 100), olive(40, 130)], glasses: [glass(200, 100)], bumps: [] },
    { name: 'Five, with a gap', olives: [olive(36, 50), olive(36, 80), olive(36, 120), olive(36, 150), olive(70, 100)], glasses: [glass(210, 100)], bumps: [{ x: 120, y: 60, r: 10 }, { x: 120, y: 150, r: 10 }] },
    { name: 'Seven and a gecko', olives: [olive(30, 40), olive(30, 70), olive(30, 100), olive(30, 130), olive(30, 160), olive(60, 80), olive(60, 120)], glasses: [glass(214, 100)], bumps: [{ x: 130, y: 46, r: 8 }, { x: 130, y: 160, r: 8 }], gecko: true }
  ];
  G.REFS = {
    lines: () => G.LINES.count(),
    poses: G.POSES,
    acts: G.ACT_IDS,
    unlocks: G.UNLOCKS,
    clips: Object.keys(G.POSES).map(k => G.POSES[k].clip)
  };
})();
