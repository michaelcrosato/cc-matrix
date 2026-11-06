/* data/activities.js: one row an activity. family: which code runs it (game/activities/). tiers: its numbers.
 * Add a tier or an activity from an existing family here, with no code. Rows become G.activity entries in runtime.js. */
(() => {
const G = window.G;
G.DATA.activities = [
  /* ---- Stillness ---- */
  { id: 'stork', family: 'hold', discipline: 'Stillness', name: 'Stork Stand', view: 'brawler', room: 'deck', music: 'yoga', class: true, hub: true, dur: 45, stars: [.35, .65, .90],
    say: G.DATA.lines.cards['stork'], controls: ['lean'],
    tiers: [
      { name: 'Stork Stand', set: { k: 12, c: 5, s: 13, A: 3, nf: 1.5, R: .24, pushV: .6, pushEvery: 7 }, ringEvery: 12, ringReach: .22, gull: { at: [15, 31], force: 2.5, stay: 6 }, poses: ['stork'] },
      { name: 'Eyes Closed', blind: true, set: { k: 11, c: 4.5, s: 15, A: 3.6, nf: 1.7, R: .22, pushV: .7, pushEvery: 6 }, ringEvery: 99, ringReach: 0, gull: { at: [20], force: 2, stay: 6 }, poses: ['stork'], say: G.DATA.lines.cards['Eyes Closed'] }
    ] },
  { id: 'flow', family: 'hold', discipline: 'Stillness', name: 'Sun Flow', view: 'brawler', room: 'deck', music: 'yoga', dur: 80, stars: [.5, .75, .92], breath: true, mirror: true,
    say: G.DATA.lines.cards['flow'], controls: ['lean', 'breath'],
    tiers: [
      { name: 'Sun Flow', set: { k: 12, c: 6, s: 6, A: 3.2, nf: 1.3, R: .28, pushV: .5, pushEvery: 9 }, ringEvery: 16, ringReach: .12, poses: ['lunge', 'dog', 'triangle', 'warrior', 'stork'], breaths: [4, 4] },
      { name: 'Long Exhale', set: { k: 11, c: 5, s: 10, A: 3.6, nf: 1.5, R: .22, pushV: .6, pushEvery: 7 }, ringEvery: 16, ringReach: .16, poses: ['fold', 'plank', 'dog', 'knee', 'warrior'], breaths: [3, 5], say: G.DATA.lines.cards['Long Exhale'] }
    ] },
  { id: 'candle', family: 'candle', discipline: 'Stillness', name: 'Quiet Candle', view: 'brawler', room: 'deck', music: 'yoga', class: true, hub: true, dur: 60, stars: [.35, .65, .90],
    say: G.DATA.lines.cards['candle'], controls: ['lean'],
    tiers: [
      { name: 'Quiet Candle', set: { k: 10, c: 5, s: 11, A: 1.4, nf: .8, R: .20, pushV: .55, pushEvery: 5 }, thoughtEvery: 9, thoughtForce: [3, 5] },
      { name: 'Noisy Candle', set: { k: 10, c: 5, s: 12, A: 1.6, nf: .9, R: .2, pushV: .55, pushEvery: 5 }, thoughtEvery: 8, thoughtForce: [3, 5], extras: ['blender', 'goose'], say: G.DATA.lines.cards['Noisy Candle'] }
    ] },
  /* ---- Strength: one code path, three rows ---- */
  { id: 'squat', family: 'rep', discipline: 'Strength', name: 'Squat Rail', view: 'brawler', room: 'iron', music: 'iron', class: true, hub: true, stars: [.35, .65, .90], axis: 'y', facing: 1.2,
    clip: '22_14', top: 1.1, bottom: 1.72,
    say: G.DATA.lines.cards['squat'], controls: ['lean'],
    tiers: [ { name: 'Squat Rail', reps: 8, down: 2, up: 2, hold: 0 }, { name: 'Slow Squat', reps: 12, down: 3, up: 1, hold: .8, say: G.DATA.lines.cards['Slow Squat'] } ] },
  { id: 'pushup', family: 'rep', discipline: 'Strength', name: 'Push-Up', view: 'brawler', room: 'iron', music: 'iron', hub: true, stars: [.35, .65, .90], axis: 'y', facing: .1,
    clip: 'Pushup', top: 0, bottomShare: .5,
    say: G.DATA.lines.cards['pushup'], controls: ['lean'],
    tiers: [ { name: 'Push-Up', reps: 6, down: 2, up: 2, hold: 0 }, { name: 'Slow Push-Up', reps: 10, down: 3, up: 1, hold: .8, say: G.DATA.lines.cards['Slow Push-Up'] } ] },
  { id: 'lunge', family: 'rep', discipline: 'Strength', name: 'Side Lunge', view: 'brawler', room: 'iron', music: 'iron', stars: [.35, .65, .90], axis: 'x', facing: 1.57, bodyMove: 'sideLunge',
    say: G.DATA.lines.cards['lunge'], controls: ['lean'],
    tiers: [ { name: 'Side Lunge', reps: 8, down: 2, up: 2, hold: 0 }, { name: 'Long Lunge', reps: 12, down: 2.6, up: 1.4, hold: .6, say: G.DATA.lines.cards['Long Lunge'] } ] },
  /* ---- Cardio ---- */
  { id: 'step', family: 'step', discipline: 'Cardio', name: 'Step Class', view: 'brawler', room: 'pier', music: null, class: true, hub: true, dur: 60, stars: [.5, .75, .92],
    say: G.DATA.lines.cards['step'], controls: ['steps'],
    tiers: [ { name: 'Step Class', chart: 'stepA', lanes: 2 }, { name: 'Step Class Two', chart: 'stepB', lanes: 4, say: G.DATA.lines.cards['Step Class Two'] } ] },
  { id: 'hoop', family: 'hoop', discipline: 'Cardio', name: 'Hoop Hips', view: 'brawler', room: 'pier', music: 'festival', class: true, hub: true, dur: 60, stars: [.35, .65, .90],
    say: G.DATA.lines.cards['hoop'], controls: ['circle', 'catch'],
    tiers: [ { name: 'Hoop Hips', tossEvery: 8, needMore: .3 }, { name: 'Hoop Hips Deluxe', tossEvery: 5.5, needMore: .6, swap: 2, say: G.DATA.lines.cards['Hoop Hips Deluxe'] } ] },
  { id: 'jog', leanAxis: 'x', family: 'jog', discipline: 'Cardio', name: 'Coastal Jog', view: 'side', room: null, music: 'jog', hub: true, dur: 95, stars: [.35, .65, .90],
    say: G.DATA.lines.cards['jog'], controls: ['pace', 'steer'],
    tiers: [ { name: 'Coastal Jog', length: 1, pigeons: 1, band: 1 }, { name: 'The Long Way', length: 1.25, pigeons: 1.8, band: .75, say: G.DATA.lines.cards['The Long Way'] } ] },
  /* ---- Balance games ---- */
  { id: 'slalom', family: 'slalom', discipline: 'Balance', name: 'Mount Posture Slalom', short: 'Slalom', rigSize: 1, view: 'side', room: null, music: 'ski', hub: true, dur: 120, stars: [.35, .65, .90],
    say: G.DATA.lines.cards['slalom'], controls: ['ski'],
    tiers: [ { name: 'Mount Posture Slalom', course: 0 }, { name: 'North Face', course: 1, say: G.DATA.lines.cards['North Face'] } ] },
  { id: 'tray', family: 'tray', discipline: 'Balance', name: 'Tray Service', view: 'tray', room: null, music: 'tray', dur: 60, stars: [.35, .65, .90],
    say: G.DATA.lines.cards['tray'], controls: ['tilt'],
    tiers: [ { name: 'Tray Service', trays: 'trays', dur: 70, set: { k: 14, c: 7, s: 0, A: .25, nf: 1, R: .3 } }, { name: 'Evening Service', trays: 'traysHard', dur: 90, set: { k: 14, c: 6, s: 2, A: .6, nf: 1.3, R: .3 }, friction: .35, say: G.DATA.lines.cards['Evening Service'] } ] },
  { id: 'laundry', leanAxis: 'x', keyRate: 2.5, keyHome: 4, keyEase: { s: .74, A: .82 }, family: 'laundry', discipline: 'Balance', name: 'Laundry Line', rigSize: 1.35, view: 'side', room: null, music: 'laundry', dur: 165, stars: [.35, .65, .90],
    say: G.DATA.lines.cards['laundry'], controls: ['walk', 'leanx', 'jump'],
    tiers: [ { name: 'Laundry Line', set: { k: 10, c: 3.5, s: 16, A: 3.5, nf: 1.2, R: .40, pushV: .9, pushEvery: 5 }, gust: 9, course: 0 }, { name: 'Windy Washday', set: { k: 10, c: 3.5, s: 16.5, A: 3.6, nf: 1.2, R: .36, pushV: .95, pushEvery: 5 }, gust: 9, course: 0, say: G.DATA.lines.cards['Windy Washday'] } ] }
];
// (the Body Check's set, and the Gentle Games' short versions, live with their scenes' data)
G.DATA.bodyCheck = { set: { k: 14, c: 7, s: 4, A: 3, nf: 1.1, R: .20 } };
})();
