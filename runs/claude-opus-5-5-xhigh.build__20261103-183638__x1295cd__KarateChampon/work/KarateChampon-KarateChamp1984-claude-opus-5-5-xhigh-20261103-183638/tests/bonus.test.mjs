// bonus stages and drills: boards (power to boards, PERFECT, too much), pots (a fixed sequence; the right height breaks;
// a boulder must be dodged; a bowl caught; PERFECT), the bull (each valid technique stops it; others trample); drills
import { fresh, steps } from './lib/util.mjs';
export default async t => {
  // BOARDS
  { const { KC, game } = fresh(); game.go('bonus', { id: 'boards', variant: { n: 5 } }); steps(game, 300); const sc = game.scene;
    t.check('boards: play after the banner', sc.state === 'play', sc.state);
    const I = game.input; I.hold('tDown'); let peak = 0; for (let i = 0; i < 400 && sc.ki < 99; i++) { steps(game, 1); peak = Math.max(peak, sc.ki); } let tm = false; for (let i = 0; i < 90 && !tm; i++) { steps(game, 1); tm = sc.msg === KC.TEXT.tooMuch; } t.check('boards: holding past 100 is TOO MUCH (back to 60)', tm && sc.ki < 70, sc.ki.toFixed(0) + ' ' + sc.msg);
    for (let i = 0; i < 400 && sc.gauge() < 96; i++) steps(game, 1); I.hold('tDown', false); steps(game, 200);
    t.check('boards: a full breath is PERFECT (all 5 and 2000)', sc.broken === 5 && sc.points === 5 * 200 + 2000, sc.broken + ' ' + sc.points + ' power ' + sc.power); }
  { const { KC, game } = fresh(); game.go('bonus', { id: 'boards', variant: { n: 10, mat: 'ice' } }); steps(game, 300); const sc = game.scene, I = game.input; I.hold('tDown'); for (let i = 0; i < 400 && sc.gauge() < 40; i++) steps(game, 1); I.hold('tDown', false); steps(game, 200);
    t.check('boards: a weak breath breaks a few (power 40 of 10 ice: 4 boards, x2)', sc.broken === Math.floor(sc.power / 100 * 10.99) && sc.points === sc.broken * 400, sc.broken + ' ' + sc.points + ' ' + sc.power.toFixed(1)); void KC; }
  // POTS: the same sequence twice; the autopilot answers every object (PERFECT); a pot let in ends the stage
  { const { KC, game } = fresh(); game.go('bonus', { id: 'pots', variant: { seed: 1 } }, { fade: 0 }); steps(game, 2); const s1 = JSON.stringify(game.scene.seq); game.go('title', null, { fade: 0 }); steps(game, 2); game.go('bonus', { id: 'pots', variant: { seed: 1 } }, { fade: 0 }); steps(game, 2); t.check('pots: the sequence is fixed per visit', s1 === JSON.stringify(game.scene.seq));
    const sc = game.scene; t.check('pots: 16 objects of every kind', sc.seq.length === 16 && ['pot', 'bonsai', 'boulder', 'bowl'].every(k => sc.seq.some(o => o.kind === k))); void KC; }
  { const { KC, game } = fresh(); game.go('bonus', { id: 'pots', auto: true, variant: { seed: 2 }, done: p => { game.__done = p; } }); steps(game, 120 * 40); const sc = game.scene;
    t.check('pots: perfect reads handle all 16 (PERFECT +3000)', sc.handled === 16 && sc.perfect && sc.points >= 3000 + 1000, sc.handled + ' ' + sc.points + ' ' + sc.state); void KC; }
  { const { KC, game } = fresh(); game.go('bonus', { id: 'pots', variant: { seed: 3 } }); steps(game, 2); const sc = game.scene; for (let i = 0; i < 120 * 20 && sc.state !== 'end'; i++) steps(game, 1); t.check('pots: standing still, the first hit ends the stage', sc.state === 'end' && sc.hero.st === 'down' && sc.handled < 16, sc.state + ' ' + sc.hero.st); steps(game, 120 * 4); t.check('pots: then back to the bonus menu', game.sceneName === 'bonusMenu', game.sceneName); void KC; }
  // BULL: a valid technique in the window stops it (3000); an invalid one tramples
  { const { KC, game } = fresh(); game.go('bonus', { id: 'bull', auto: true, done: p => { game.__done = p; } }); steps(game, 120 * 30); const sc = game.scene;
    t.check('bull: three charges stopped (9000 or more)', sc.thuds === 3 && sc.points >= 9000, sc.thuds + ' ' + sc.points + ' ' + sc.state); void KC; }
  { const { KC, game } = fresh(); game.go('bonus', { id: 'bull' }); steps(game, 240); const sc = game.scene; let tramp = false;
    for (let i = 0; i < 120 * 8 && !tramp; i++) { const b = sc.bull, d = b.nose - (sc.hero.x + sc.hero.w / 2); if (b.st === 'charge' && d < 50 && sc.hero.free) { sc.hero.control({ posture: 'n', press: 'u' }); sc.hero.update(1 / 120, sc._foe()); } steps(game, 1); tramp = b.st === 'trample'; }
    t.check('bull: a round kick does not stop it (trampled)', tramp); void KC; }
  for (const id of ['upperPunch', 'upLunge', 'squatPunch', 'frontKick', 'backKick']) { const { KC } = fresh(); t.check('bull: ' + id + ' is a bull technique', KC.TECH[id].bull === true); }
  // DRILLS
  { const { KC } = fresh(); const D = new KC.Drill('lessonI'); D.state = 'now'; D.t = .4; t.check('drill: the right technique within 50 frames is SHARP (+400)', D.attempt('frontKick', .4) === 'sharp' && D.points === 400); D.next(); D.state = 'now'; D.t = 2; t.check('drill: later is GOOD (+200)', D.attempt('roundKick', 2) === 'good' && D.points === 600); D.next(); D.state = 'now'; t.check('drill: a wrong one is a miss', D.attempt('roundKick', 1) === 'miss' && D.misses === 1); D.skip(); t.check('drill: skip moves on without points', D.i === 3 && D.points === 600); }
  { const { KC, game } = fresh(); game.go('practice', { lesson: 'lessonI' }); steps(game, 60); const sc = game.scene, D = sc.drill; let guard = 0;
    while (!D.done && guard++ < 120 * 90) { if (D.state === 'now' && sc.hero.free) { const id = D.tech, c = KC.cellOf(id) || ['d', null]; sc.hero.ctlOn = true; if (id === 'crouch') { game.input.hold('down'); steps(game, 50); game.input.hold('down', false); } else if (id === 'jump') { game.input.hold('up'); steps(game, 4); game.input.hold('up', false); } else { const dirs = { u: 'up', d: 'down', f: 'right', b: 'left' }; if (c[0] !== 'n') game.input.hold(dirs[c[0]]); game.input.tap({ u: 'tUp', d: 'tDown', f: 'tRight', b: 'tLeft' }[c[1]]); steps(game, 2); if (c[0] !== 'n') game.input.hold(dirs[c[0]], false); } } steps(game, 1); }
    t.check('drill: lesson I played with real keys passes all 7', D.done && D.passed === 7, D.passed + '/7 at ' + D.i + ' ' + D.state + ' ' + JSON.stringify(D.log)); }
  { const { KC } = fresh(); t.check('lessons: I 7, II 6, III 8, all 21', ['lessonI', 'lessonII', 'lessonIII', 'lessonAll'].map(l => KC.LESSON[l].drills.length).join() === '7,6,8,21'); }
};
