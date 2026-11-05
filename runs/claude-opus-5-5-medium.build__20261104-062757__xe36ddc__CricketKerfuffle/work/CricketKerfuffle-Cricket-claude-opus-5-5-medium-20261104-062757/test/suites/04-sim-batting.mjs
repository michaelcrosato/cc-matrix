// 5.3: batting by real input at idealPress() ± offsets; leaving, ducking, charging
export default ({ boot, suite, until }) => {
  const s = suite();
  const setup = (o = {}) => {
    const B = boot(); const { D, game } = B; D.setTuning('seam', 0); D.setTuning('swing', 0);
    D.startMatch(Object.assign({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', overs: 2, wickets: 5, seed: 5, humans: [[game.input], []], kerfuffle: false, batFirst: 'ker' }, o.cfg || {}));
    until(game, () => D.match() && D.snapshot().scene === 'match', 3, 1 / 60); const m = D.match(); m.cfg.noReplays = true;
    return Object.assign(B, { m, s });
  };
  const ball = (B, del, target, press, btn = 'shot', aim) => {
    const { D, game, I, m } = B;
    until(game, () => m.state === 'setup', 30, 1 / 120);
    m.dev.forceDelivery = { del, target, grade: 'green' };
    until(game, () => m.state === 'flight', 10, 1 / 120);
    if (aim !== undefined) { m.vpad('bat'); }
    if (press === null) { until(game, () => m.state !== 'flight', 8, 1 / 120); return; }
    const t = D.idealPress(); game.advance(Math.max(0, t + press));
    I.tap(btn); game.advance(1 / 120); game.advance(1 / 120);
    return m.swing;
  };
  let B = setup();
  let sw = ball(B, 'dobber', [-3, 60], 0);
  s.ok('a press at the ideal moment is PERFECT', sw && sw.grade === 'PERFECT', sw && sw.grade);
  until(B.game, () => B.m.state !== 'flight', 3, 1 / 120);
  s.ok('a PERFECT press makes contact', !!B.m.contact && B.m.contact.kind === 'clean', B.m.contact);
  s.ok('the bat sends it with real pace', B.m.contact && B.m.contact.speed > 250, B.m.contact && B.m.contact.speed);
  until(B.game, () => B.m.state === 'between' || B.m.state === 'break', 25, 1 / 60);
  sw = ball(B, 'dobber', [-3, 60], .06); s.ok('60 ms late is GOOD', sw && sw.grade === 'GOOD', sw && [sw.grade, sw.dlt]);
  until(B.game, () => B.m.state === 'between', 25, 1 / 60);
  sw = ball(B, 'dobber', [-3, 60], -.2); s.ok('200 ms early misses', sw && sw.grade === 'MISS', sw && sw.grade);
  B.s.noErrors(B.game);
  // leaving: a ball on the stumps bowls him; one well outside off is safe
  B = setup({ cfg: { seed: 9 } });
  ball(B, 'dobber', [0, 50], null);
  until(B.game, () => B.m.state === 'dead', 5, 1 / 120);
  s.ok('leaving a straight full ball gets the batter bowled', B.m.ballRec && B.m.ballRec.wicket && B.m.ballRec.wicket.how === 'bowled', B.m.ballRec && B.m.ballRec.wicket);
  until(B.game, () => B.m.state === 'between', 25, 1 / 60);
  ball(B, 'dobber', [-20, 70], null); until(B.game, () => B.m.state === 'dead', 5, 1 / 120);
  s.ok('leaving a ball 20 outside off is safe (and not a wide)', B.m.ballRec && !B.m.ballRec.wicket && !B.m.ballRec.wide, B.m.ballRec);
  until(B.game, () => B.m.state === 'between', 25, 1 / 60);
  ball(B, 'bouncer', [-2, 175], null); until(B.game, () => B.m.state === 'dead', 5, 1 / 120);
  s.ok('a bouncer left alone: not out, not a wide', B.m.ballRec && !B.m.ballRec.wicket && !B.m.ballRec.wide, B.m.ballRec);
  // the aim: the stick straight down the screen sends a PERFECT drive back past the bowler
  B = setup({ cfg: { seed: 12 } });
  until(B.game, () => B.m.state === 'setup', 30, 1 / 120); B.m.dev.forceDelivery = { del: 'dobber', target: [-2, 55], grade: 'green' };
  until(B.game, () => B.m.state === 'flight', 10, 1 / 120);
  B.I.hold('down'); B.game.advance(Math.max(0, B.D.idealPress())); B.I.tap('shot'); B.game.advance(.02); B.I.hold('down', false);
  until(B.game, () => B.m.contact, 2, 1 / 120);
  const th = B.m.contact ? B.m.contact.th * 180 / Math.PI : 999;
  s.ok('the stick straight down plus PERFECT drives it within 10 degrees of straight', Math.abs(th) < 10 && B.m.contact.grade === 'PERFECT', th);
  // charging a spinner and missing, with the keeper up: stumped
  B = setup({ cfg: { seed: 4, teams: ['ker', 'mag'] } });
  until(B.game, () => B.m.state === 'between' && B.m.I.bowler, 30, 1 / 120);
  B.m.I.bowler = 'spinaldo'; B.m.keeperUp = true;
  until(B.game, () => B.m.state === 'setup', 30, 1 / 120); B.m.keeperUp = true; B.m._placeAll(); B.m.dev.forceDelivery = { del: 'legbreak', target: [-4, 90], grade: 'green' };
  until(B.game, () => B.m.state === 'runup', 10, 1 / 120); B.game.advance(.4); B.I.tap('charge');
  until(B.game, () => B.m.state === 'dead', 8, 1 / 120);
  s.ok('a charge and a miss against spin, keeper up: stumped', B.m.ballRec && B.m.ballRec.wicket && B.m.ballRec.wicket.how === 'stumped', B.m.ballRec && [B.m.deadWhy, B.m.ballRec.wicket]);
  B.s.noErrors(B.game);
};
