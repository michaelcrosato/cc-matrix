import { load, until } from '../lib.mjs';
export async function run(check) {
  const env = load({ seed: 3 }), { game, I, D, K } = env; game.advance(.4);
  const P2 = game.addPlayer({ keys: 'right' }); check('a second player joins on the right half of the keyboard', !!P2 && game.players.length === 2);
  D.startMatch({ humans: { 0: [I], 1: [P2] }, seed: 3 }); game.advance(.2); const m = D.match();
  until(game, () => m.phase === 'setup' || m.phase === 'pickBowler', 8);
  check('in a 1v1, player 2 bowls while player 1 bats', m.strikerInput() === I && m.bowlerInput() === P2, [m.strikerInput() && m.strikerInput().player, m.bowlerInput() && m.bowlerInput().player]);
  check('player 2 fields too', m.fielderInput() === P2);
  // co-op: two humans batting: each runs his own batter; one calling alone is a mix-up
  const e2 = load({ seed: 4 }); e2.game.advance(.4); const Q2 = e2.game.addPlayer({ keys: 'right' });
  e2.D.startMatch({ humans: { 0: [e2.I, Q2] }, seed: 4, forceBowler: 'terry' }); e2.game.advance(.2); const mm = e2.D.match();
  until(e2.game, () => mm.phase === 'setup', 8);
  check('co-op: each batter has his own input', mm.batterInput(mm.striker) !== mm.batterInput(mm.nonStriker), [mm.striker.slot, mm.nonStriker.slot]);
  let mix = 0; e2.K.bus.on('run:mixup', () => mix++);
  e2.D.forceOutcome('1'); until(e2.game, () => mm.phase === 'inPlay', 8);
  const si = mm.batterInput(mm.striker); si.tap('run'); until(e2.game, () => mm.phase === 'between', 14);
  const l = mm.inn.recs[mm.inn.recs.length - 1];
  check('co-op: only one batter calls YES: a mix-up', mix === 1, mix);
  check('co-op: the mix-up costs a run-out (or no run)', l && (l.wicket && l.wicket.how === 'run out' || l.ran === 0), l && { ran: l.ran, w: l.wicket && l.wicket.how });
  // both call: a run
  const e3 = load({ seed: 5 }); e3.game.advance(.4); const R2 = e3.game.addPlayer({ keys: 'right' });
  e3.D.startMatch({ humans: { 0: [e3.I, R2] }, seed: 5, forceBowler: 'terry' }); e3.game.advance(.2); const m3 = e3.D.match();
  until(e3.game, () => m3.phase === 'setup', 8); m3.fieldPreset = 'defensive'; m3.placeField(true); e3.D.forceOutcome('1'); until(e3.game, () => m3.phase === 'inPlay', 8);
  m3.batterInput(m3.striker).tap('run'); m3.batterInput(m3.nonStriker).tap('run'); until(e3.game, () => m3.phase === 'between', 14);
  const l3 = m3.inn.recs[m3.inn.recs.length - 1]; check('co-op: both call YES: they run one', l3 && l3.ran === 1, l3 && { ran: l3.ran, w: l3.wicket && l3.wicket.how });
  // per-player prompts follow each player's own device
  P2.press('Pad0'); game.advance(1 / 60); P2.release('Pad0'); check('player 2\'s prompts follow player 2\'s device', K.Glyphs.info(P2, 'shot').kind === 'ps' && K.Glyphs.info(I, 'shot').kind !== 'ps', [K.Glyphs.info(P2, 'shot'), K.Glyphs.info(I, 'shot')]);
  check('no errors', !game.errors.length && !e2.game.errors.length && !e3.game.errors.length, game.errors.concat(e2.game.errors, e3.game.errors).map(e => e.message));
}
