/* Densha de Halo! · 22-stages: the stages as data (section 5.3). A stage names its route, train, weather, time of day,
 * the stops with their timetable, the other trains and the events. The sim reads it; nothing here runs code. */
(() => {
'use strict';
const DH = window.DH;

const TRAIN_FREIGHT = (s0, clockAt, legs, extra) => Object.assign({ id: 'freight', kind: 'freight', train: 'freight', lane: 'A', dir: 1, s: s0, cars: 13, clockAt, legs }, extra || {});

DH.STAGES = [
  { id: 'S0', code: 'S0', name: 'DAWN DEPOT', title: 'Dawn Depot', route: 'depot', train: 'h8000', cars: 6, weather: 'clear', hour: 5.5, tutorial: true,
    startClock: '05:30:00', startS: 0, frozenHalo: 25, noDwell: true, endOnLastStop: true, lineSpeed: 40,
    stops: [{ id: 'mark1', target: 300, label: '1' }, { id: 'mark2', target: 620, label: '2' }, { id: 'mark3', target: 900, label: '3' }],
    events: [], trains: [], blurb: 'Learn the lever, the stop and the brake.', time: '05:30', weather_name: 'Clear',
    briefing: [['hoshino', 'So. You are the new one.'], ['hoshino', 'Thirty-eight years I drove this ring. Not one second late. Today is my last day.'], ['hoshino', 'Your paperwork says you can drive. The rails do not read paperwork.']] },
  { id: 'S1', code: 'S1', name: 'FIRST LIGHT LOCAL', title: 'First Light Local', route: 'halo', train: 'h8000', cars: 6, weather: 'clear', hour: 6.7,
    startClock: '06:39:30', startS: 0, startStopped: true, endOnLastStop: true,
    stops: [{ id: 'akari', dep: '06:40:00' }, { id: 'hanabatake', arr: '06:42:31', dep: '06:42:56' }, { id: 'kujira', arr: '06:44:51' }],
    trains: [], passes: [],
    events: [
      { id: 'radio-mika', type: 'radio', who: 'Mika', text: 'Good morning, Driver! Conductor Aoba, at the back. Call me Mika!', at: 40 },
      { id: 'radio-hoshino', type: 'radio', who: 'Hoshino', text: 'Arrive on the second. Early is not on time. Late is not on time.', at: 240 },
      { id: 'oncoming1', type: 'oncoming', at: 2000, lane: 'B' },
      { id: 'horn-tip', type: 'tip', tip: 'horn', at: 1000 },
      { id: 'hoshino-horn', type: 'radio', who: 'Hoshino', text: 'The fishermen under the bridge like to know we are coming.', at: 2250 }
    ],
    briefing: [['mika', 'Good morning, Driver! Conductor Aoba, at the back. Call me Mika!'], ['hoshino', 'Arrive on the second. Early is not on time. Late is not on time.'], ['mika', 'Melody, doors, my buzzer, then she is all yours!']] },
  { id: 'S2', code: 'S2', name: 'HARBOR RAIN RAPID', title: 'Harbor Rain Rapid', route: 'halo', train: 'h3000', cars: 6, weather: 'rain', hour: 10.25,
    startClock: '10:14:30', startS: 3450, startStopped: true, endOnLastStop: true, lineSpeed: 95,
    stops: [{ id: 'kujira', dep: '10:15:00' }, { id: 'minato', arr: '10:17:52', dep: '10:18:17' }, { id: 'okiku', arr: '10:22:08' }],
    passes: [{ id: 'todai', at: 6900 }],
    trains: [TRAIN_FREIGHT(5250, DH.parseClock('10:16:20'), [
      { v: 45, acc: 4, stopAt: 6300, dwell: 40 }, { v: 45, acc: 4, until: 6780, lane: 'A' }, { v: 25, acc: 3, stopAt: 6900, lane: 'C' }
    ])],
    events: [
      { id: 'tip-rain', type: 'tip', tip: 'rain', at: 3500 },
      { id: 'tip-ats', type: 'tip', tip: 'ats', at: 5300 },
      { id: 'radio-dispatch', type: 'radio', who: 'Dispatch', text: 'Halo 1015, freight ahead of you through the cliff tunnel. Expect restrictive signals.', at: 4600 },
      { id: 'radio-yellow', type: 'radio', who: 'Hoshino', text: 'Yellow. Forty-five. Do not argue with yellow.', at: 5700 },
      { id: 'radio-pass', type: 'radio', who: 'Hoshino', text: 'Tsuka. Good. Eyes forward.', at: 6900 }
    ],
    briefing: [['hoshino', 'Today, the old 3000. She is older than you. Her brakes think slowly. Ask early.'], ['mika', 'Umbrellas everywhere! The rails will be slippery!']] },
  { id: 'S3', code: 'S3', name: 'TEMPLE HILL LOCAL', title: 'Temple Hill Local', route: 'halo', train: 'h8000', cars: 6, weather: 'clear', hour: 14,
    startClock: '13:59:30', startS: 8700, startStopped: true, endOnLastStop: true,
    stops: [{ id: 'okiku', dep: '14:00:00' }, { id: 'yuhi', arr: '14:03:53', dep: '14:04:13' }, { id: 'shotengai', arr: '14:08:38' }],
    obstruction: { id: 'X3' }, passes: [],
    trains: [],
    events: [
      { id: 'festival', type: 'festival', at: 8800 },
      { id: 'fuji-bows', type: 'radio', who: 'Fuji', text: 'Thank you, driver-san!', stop: 'yuhi' },
      { id: 'workers', type: 'workers', at: 9550, v: 25 },
      { id: 'oncoming3', type: 'oncoming', at: 11200, lane: 'B' },
      { id: 'radio-workers', type: 'radio', who: 'Hoshino', text: 'Up the hill it is easy to be slow. Down it, easy to be fast.', at: 9000 },
      { id: 'radio-horn', type: 'radio', who: 'Hoshino', text: 'Horn. Now.', at: 9500 },
      { id: 'radio-crossing', type: 'radio', who: 'Mika', text: 'The crossing alarm! Something is on the tracks!', at: 11300 }
    ],
    briefing: [['mika', 'It is the Chrysanthemum Festival!'], ['hoshino', 'Up the hill it is easy to be slow. Down it, easy to be fast.']] },
  { id: 'S4', code: 'S4', name: 'SUNSET RUSH', title: 'Sunset Rush', route: 'halo', train: 'h8000', cars: 10, weather: 'clear', hour: 17.5,
    startClock: '17:29:30', startS: 12108, startStopped: true, endOnLastStop: true, lineSpeed: 80,
    stops: [{ id: 'shotengai', dep: '17:30:00' }, { id: 'daigaku', arr: '17:32:03', dep: '17:32:23' }, { id: 'koen', arr: '17:34:12' }],
    trains: [{ id: 'sky', kind: 'rival', train: 'skyliner', lane: 'D', dir: 1, s: 12100, cars: 6, clockAt: DH.parseClock('17:30:05'),
      legs: [{ v: 80, acc: 4, until: 12800 }, { v: 95, acc: 3, until: 13700 }, { v: 70, acc: 3, stopAt: 15300, dwell: 20 }] }],
    events: [
      { id: 'radio-ren', type: 'radio', who: 'Ren', text: 'Evening, Halo Line! See you at Koen... if you can keep up!', at: 12150 },
      { id: 'radio-ignore', type: 'radio', who: 'Hoshino', text: 'Ignore him. He has his timetable. We have ours.', at: 12500 },
      { id: 'rush', type: 'doorRush', stop: 'daigaku' },
      { id: 'radio-kenji', type: 'radio', who: 'Kenji', text: 'Wait! Wait for me!', stop: 'daigaku' },
      { id: 'glare', type: 'glare', at: 13750 },
      { id: 'radio-glare', type: 'radio', who: 'Hoshino', text: 'West sun. Squint if you must. Do not guess.', at: 13800 },
      { id: 'oncoming4', type: 'oncoming', at: 14800, lane: 'B' }
    ],
    briefing: [['hoshino', 'Ten cars. Your marker is the 10, not the 6.'], ['ren', 'Evening, Halo Line! See you at Koen... if you can keep up!']] },
  { id: 'S5', code: 'S5', name: 'THE LAST HALO', title: 'The Last Halo', route: 'halo', train: 'h8000', cars: 6, weather: 'fog', hour: 23.1,
    startClock: '23:09:30', startS: 15300, startStopped: true, endOnLastStop: true, fogPatches: [[16200, 16800]],
    stops: [{ id: 'koen', dep: '23:10:00' }, { id: 'hoshimi', arr: '23:12:10', dep: '23:12:30' }, { id: 'kawasemi', arr: '23:14:33', dep: '23:14:53' }, { id: 'akari-end', arr: '23:17:46' }],
    trains: [],
    events: [
      { id: 'radio-mika', type: 'radio', who: 'Mika', text: 'Last train of the night... and Hoshino-san\'s last run.', at: 15350 },
      { id: 'radio-ceremony', type: 'radio', who: 'Hoshino', text: 'Do not make it a ceremony. Drive it like any other train.', at: 15400 },
      { id: 'radio-fog', type: 'radio', who: 'Hoshino', text: 'When you can not see, the signals see for you.', at: 16150 },
      { id: 'sato-oncoming', type: 'oncoming', at: 18600, lane: 'B', ahead: 1400 },
      { id: 'sato-flash', type: 'flash', at: 18600 },
      { id: 'radio-sato', type: 'radio', who: 'Hoshino', text: 'That is Sato. Thirty years. He is flashing for me... Answer him.', at: 18620 },
      { id: 'finale', type: 'festival', stop: 'akari-end' }
    ],
    briefing: [['mika', 'Last train of the night... and Hoshino-san\'s last run.'], ['hoshino', 'Do not make it a ceremony. Drive it like any other train.']] },
  { id: 'PR', code: 'PR', name: 'PARALLEL RUN', title: 'Parallel Run', route: 'halo', train: 'h8000', cars: 6, weather: 'clear', hour: 12,
    startClock: '11:59:30', startS: 12100, startStopped: true, endOnLastStop: true,
    stops: [{ id: 'shotengai', dep: '12:00:00' }, { id: 'daigaku', arr: '12:01:55', dep: '12:02:15' }, { id: 'koen', arr: '12:04:05' }],
    trains: [], events: [], briefing: [['hoshino', 'Four drivers, four tracks, one timetable.']] }
];
DH.stageById = id => DH.STAGES.find(s => s.id === id);
DH.routeFor = (stage) => DH.compiled[stage.route];
})();
