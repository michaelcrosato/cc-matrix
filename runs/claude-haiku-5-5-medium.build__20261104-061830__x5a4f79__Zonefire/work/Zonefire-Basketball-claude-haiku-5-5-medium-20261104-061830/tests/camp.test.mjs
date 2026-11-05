// The camp (plan §19.2 "camp"): every lesson completes with its goal counted from the match's events, and saves its
// completion; the lessons can be picked and skipped.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
T('camp.every lesson completes from its own events and saves', () => {
  const g = loadGame({ seed: 31 });
  const b = g.bb;
  g.S.progress.camp = [];
  const feed = {
    move: () => { for (let i = 0; i < 3; i++) { g.S.camp && (g.S.camp.cones = i + 1); } }, pass: () => { for (let i = 0; i < 2; i++) b.emit('pass', { slot: 0 }); },
    jump: () => { b.emit('basket', { slot: 0, side: 0, points: 2, perfect: true, streak: 1 }); b.emit('basket', { slot: 0, side: 0, points: 2, perfect: false, streak: 2 }); },
    three: () => b.emit('basket', { slot: 0, side: 0, points: 3, three: true, streak: 1 }),
    dunk: () => { b.emit('basket', { slot: 0, side: 0, points: 2, dunk: 'hammer', streak: 1 }); b.emit('basket', { slot: 0, side: 0, points: 2, dunk: 'hammer', streak: 2 }); },
    oop: () => b.emit('alleyoop', { slot: 0, to: 1, side: 0 }),
    steal: () => { b.emit('steal', { slot: 0, victim: 2 }); b.emit('spin', { slot: 0 }); },
    block: () => { b.emit('block', { slot: 0, side: 0 }); b.emit('knockdown', { slot: 2, by: 0 }); },
    rebound: () => { b.emit('rebound', { slot: 0 }); b.S.camp.afterRebound = true; b.emit('rebound', { slot: 0 }); },
    nova: () => { b.emit('basket', { slot: 0, side: 0, points: 2, streak: 1 }); b.emit('basket', { slot: 0, side: 0, points: 2, streak: 2 }); b.emit('basket', { slot: 0, side: 0, points: 2, streak: 3 }); }
  };
  const ids = b.CAMP_LESSONS.map(l => l.id);
  b.CAMP_LESSONS.forEach((l, i) => {
    g.game.go('menu', null, { fade: 0 }); g.game.advance(.05);
    b.startCampLesson(i); g.game.advance(.5);
    expect(g.game.sceneName === 'court' && g.S.camp && g.S.camp.lesson.id === l.id, `lesson ${l.id} started`);
    const key = { move: 'move', pass: 'pass', jump: 'jump', three: 'three', dunk: 'dunk', oop: 'oop', steal: 'steal', block: 'block', rebound: 'rebound', nova: 'nova' };
    const f = feed[ids[i] === 'move' ? 'move' : l.count === 'cones' ? 'move' : l.count === 'jumpMake' ? 'jump' : l.count === 'streak' ? 'nova' : l.count === 'stealSpin' ? 'steal' : l.count === 'blockShove' ? 'block' : l.count === 'rebound' ? 'rebound' : l.count === 'three' ? 'three' : l.count === 'dunk' ? 'dunk' : l.count === 'oop' ? 'oop' : 'pass'];
    if (l.id === 'move') { g.S.camp.cones = 3; }
    if (f) f();
    g.game.advance(.2);
    if (l.id === 'nova') { g.game.input.tap('confirm'); g.game.advance(.3); }   // the rules card: confirm
    expect(g.S.progress.camp.includes(l.id), `lesson ${l.id} is saved as done (goal ${l.goal})`);
  });
  expect(g.S.progress.camp.length === 10, `${g.S.progress.camp.length} lessons done`);
});
