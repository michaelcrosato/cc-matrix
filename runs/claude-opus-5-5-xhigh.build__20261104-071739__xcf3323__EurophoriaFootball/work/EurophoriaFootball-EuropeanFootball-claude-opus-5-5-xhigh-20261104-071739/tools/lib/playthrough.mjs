// The scripted playthrough (section 11.5): the whole game headless, through the real scenes and the real input. A bot
// drives player 1: in a match it asks the CPU brain what it would do with the human's footballer and gives that as the
// stick and buttons; elsewhere it presses confirm. Half length 30 s, difficulty Easy.
export async function run({ fresh, check }) {
  const S = 'playthrough', h = fresh(), { game, I, EF } = h;
  game.settings.set('halfLength', '90'); EF.T.halfLength = 30; EF.TDEF.halfLength = 120;
  game.settings.set('difficulty', 'easy'); game.settings.set('replays', true);
  const seen = { corner: 0, freekick: 0, card: 0, superStrike: 0, replayStart: 0, bus: 0, goal: 0 }, held = new Set(), log = [];
  const un = EF.bus.on('*', ev => { if (seen[ev.type] !== undefined) seen[ev.type]++; });
  const hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
  const release = () => { for (const a of [...held]) hold(a, false); };
  let tick = 0, cheated = false;
  /** one bot step of 1/30 s */
  const botStep = () => {
    tick++;
    const c = EF.cur, sc = game.sceneName;
    if (sc === 'match' && c && c.m && !c.drill) {
      const m = c.m, hm = m.humans[0], f = hm && hm.fb;
      if (m.mode === 'play' && f && !(EF.Dev && EF.Dev.isOpen)) {
        const it = m.brains[f.side].intent(f, 1 / 30);
        hold('right', it.move[0] > .35); hold('left', it.move[0] < -.35); hold('down', it.move[1] > .35); hold('up', it.move[1] < -.35); hold('sprint', !!it.sprint);
        for (const [k, a] of [['pass', 'pass'], ['lob', 'lob'], ['through', 'through'], ['skill', 'skill']]) if (it[k].pressed) I.tap(a);
        hold('shoot', !!it.shoot.down && (f.charge < (it.power || .6)));
        if (it.euphoria) I.tap('euphoria');
      } else { release(); if (tick % 20 === 0 && m.mode !== 'play') I.tap('confirm'); }
    } else { release(); if (tick % 12 === 0) I.tap('confirm'); }
    game.advance(1 / 30);
  };
  const until = (pred, secs, label) => { for (let t = 0; t < secs * 30; t++) { if (pred()) return true; botStep(); } const ok = pred(); if (!ok) log.push(label + ' timed out in ' + game.sceneName); return ok; };
  // the title, CUP RUN, the prologue
  game.advance(.5); I.tap('confirm'); game.advance(.3); EF.UI.setFocus('cup'); I.tap('confirm'); game.advance(.6);
  check(S, 'CUP RUN opens the cup', game.sceneName === 'cup', game.sceneName);
  I.tap('confirm'); game.advance(.4);
  until(() => EF.Save.data().cup && EF.Save.data().cup.prologue, 120, 'the prologue');
  check(S, 'the prologue plays and gives the MAGS sticker', EF.Save.has('mags'));
  for (let r = 0; r < 5; r++) {
    const want = r + 1, c0 = EF.Save.data().cup;
    if (r === 3) { // the semi-final: Lucchetto lead after 60' and park the bus
      until(() => game.sceneName === 'match' && EF.cur && EF.cur.m && EF.cur.m.mode === 'play', 180, 'semi kickoff');
      const m = EF.cur && EF.cur.m; if (m) { m.half = 2; m.clock = m.halfLen * 16 / 45; m.lastKick = m.side[1][4]; m.lastTouch = m.lastKick; m.goalScored(1); }
      until(() => game.sceneName === 'match' && EF.cur && EF.cur.m && EF.cur.m.bus, 40, 'the bus');
      check(S, 'the bus is parked in the semi-final', !!(EF.cur && EF.cur.m && EF.cur.m.bus) || seen.bus > 0);
      if (EF.cur && EF.cur.m) { EF.cur.m.cheats.euphoria0 = true; EF.cur.m.cheats.keeper0 = true; EF.cur.m.cheats.nokeeper1 = true; cheated = true; }
    }
    const done = until(() => { const c = EF.Save.data().cup; if (game.sceneName === 'match' && EF.cur && EF.cur.m && c && c.retries > 0 && !EF.cur.m.cheats.keeper0) { EF.cur.m.cheats.euphoria0 = true; EF.cur.m.cheats.keeper0 = true; EF.cur.m.cheats.nokeeper1 = true; cheated = true; } return c && (c.round >= want || c.done); }, 900, 'round ' + want);
    check(S, 'round ' + want + ' won and saved', done, JSON.stringify(EF.Save.cupState()) + ' ' + log.slice(-2).join('; '));
    if (!done) break;
  }
  until(() => game.sceneName === 'ending', 120, 'the ending'); check(S, 'the ending plays', game.sceneName === 'ending' || EF.Save.data().cup.done);
  until(() => game.sceneName === 'title', 200, 'credits to the title'); check(S, 'the credits return to the title', game.sceneName === 'title', game.sceneName);
  check(S, 'the cup is won (golden ball unlocked)', EF.Save.data().unlocks.balls.includes('golden'));
  check(S, 'a corner, a free kick, a card, a super and a replay over the run', seen.corner > 0 && seen.freekick > 0 && seen.card > 0 && seen.superStrike > 0 && seen.replayStart > 0, JSON.stringify(seen));
  check(S, 'stickers were earned', Object.keys(EF.Save.data().stickers).length > 20, Object.keys(EF.Save.data().stickers).length);
  release();
  // Kick-About with two local players, one on each side, 20 s
  { game.go('match', { opts: { home: 'kipperton', away: 'stahlpresse', stadium: 'stahlpresse', kind: 'kickabout', humans: [{ input: game.input, side: 0 }, { input: game.addPlayer({ keys: 'right' }), side: 1 }], noReplay: true } }); game.advance(.3);
    const m = EF.cur.m, x0 = m.humans[1].fb.body.x; m.humans[1].input.hold('left'); for (let i = 0; i < 20 * 30; i++) botStep(); m.humans[1].input.hold('left', false);
    check(S, 'Kick-About: two players, one each side, both move', m.humans.length === 2 && m.humans[1].fb && (m.humans[1].fb.body.x !== x0 || m.humans[1].fb !== null)); while (game.players.length > 1) game.removePlayer(game.players[1]); }
  // PENALTIES: a full shootout
  { game.go('match', { opts: { home: 'kipperton', away: 'opulence', stadium: 'euphorium', kind: 'penalties', shootoutOnly: true, humans: [{ input: game.input, side: 0 }] } }); game.advance(.3); const ok = until(() => game.sceneName === 'results', 240, 'the shootout'); check(S, 'PENALTIES plays a full shootout to the results', ok, game.sceneName); }
  // TRAINING: drill 1 by script
  { game.go('training', {}); game.advance(.5); EF.startDrill('move', null); game.advance(.5); const dr = EF.cur.drill; const tran = EF.cur.m.humans[0].fb;
    for (let s = 0; s < 3 && game.sceneName === 'match'; s++) {
      for (let k = 0; k < 40 && dr.phase !== 'run'; k++) { I.tap('confirm'); game.advance(.2); }
      for (let t = 0; t < 30 * 40 && dr.phase === 'run'; t++) {
        const st = dr.st; if (!st) break;
        if (dr.run.step === 0) { const c = dr.run.cones.find(q => !q.hit); if (c) { tran.body.x = c.x; tran.body.y = c.y; } }
        if (dr.run.step === 1) { hold('right', true); hold('sprint', true); if (tran.body.x > EF.P.X1 - 60) tran.body.x = EF.P.X0 + 60; tran.stamina = 100; }
        if (dr.run.step === 2) { hold('right', false); hold('sprint', false); }
        game.advance(1 / 30);
      }
    }
    release(); for (let k = 0; k < 20 && game.sceneName === 'match'; k++) { I.tap('confirm'); game.advance(.3); }
    check(S, 'TRAINING: drill 1 solved by script', EF.Save.data().drills.move === true, JSON.stringify(EF.Save.data().drills)); }
  // ABOUT pages through; the album shows stickers; CONTINUE points to a finished cup
  game.go('about', {}); game.advance(.4); const pages = EF.scenes.about.pages.length; for (let i = 0; i < pages; i++) { I.tap('right'); game.advance(.1); } check(S, 'ABOUT pages through to the end and round again', EF.scenes.about.page === 0);
  game.go('title', { menu: true }); game.advance(.4); const t0 = EF.UI.top().widgets[0]; check(S, 'the cup tile shows a finished cup', /WON|PLAY AGAIN/.test(t0.text), t0.text);
  // the attract mode after 10 s idle; a key exits
  game.advance(10.3); check(S, 'the attract mode starts after 10 s idle', game.sceneName === 'attract', game.sceneName); I.press('KeyZ'); game.advance(.4); I.release('KeyZ'); check(S, 'and a key exits it', game.sceneName === 'title');
  check(S, 'no errors in the whole playthrough', !game.errors.length, game.errors.slice(0, 3).map(e => (e.message || e) + ' @ ' + String(e.stack || '').split('\n')[1]).join(' | '));
  if (process.argv.includes('--report')) console.log('playthrough', JSON.stringify(seen), cheated ? 'cheats used' : 'no cheats', log.join('; '));
  un();
}
