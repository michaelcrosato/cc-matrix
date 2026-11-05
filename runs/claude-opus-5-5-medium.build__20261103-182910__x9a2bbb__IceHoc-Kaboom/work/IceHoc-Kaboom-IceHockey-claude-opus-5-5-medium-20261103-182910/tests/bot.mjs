// The human bot: what the CPU would do in the human's place, given as the stick and buttons through game.input.
/** the human bot: what the CPU would do in the human's place, given as stick and buttons through game.input */
let fedT = 0; const setTimeout0 = fn => { fedT = 30; bot.release = fn; };
export function bot(G, game, I = game.input) {
  if (fedT > 0 && --fedT === 0 && bot.release) bot.release();
  const M = G.M, h = M && M.humans.find(x => x.input === I), s = h && h.s, held = bot.held || (bot.held = new Set());
  const hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
  if (!s || !['play', 'shootout'].includes(M.phase) || s.state === 'fight') { for (const a of ['left', 'right', 'up', 'down', 'shoot', 'turbo']) hold(a, false); if (M && M.phase === 'faceoff' && M.phaseT > M.foDrop) I.tap('pass'); if (M && M.phase === 'fight' && M.fight && M.fight.who.includes(s)) { if (Math.random() < .3) I.tap('pass'); if (Math.random() < .05) I.tap('shoot'); } return; }
  if (M.challenge && M.challenge.to === s) { hold('lob', true); return; } else hold('lob', false);
  // a player chasing the one-timer star: a pass coming in near the net gets hit first time; with the puck in the zone and a
  // teammate open across the crease, pass instead of shooting
  const P = M.puck, g = G.Skater.attackGoal(s.team);
  if (P.passTo === s && !P.owner && Math.hypot(P.x - s.x, P.y - s.y) < 90 && Math.hypot(g.x - s.x, g.y - s.y) < 200) { I.tap('shoot'); }
  if (P.owner === s && Math.hypot(g.x - s.x, g.y - s.y) < 200 && !bot.fed) { const mate = M.skaters.find(o => o.team === s.team && o !== s && Math.hypot(g.x - o.x, g.y - o.y) < 110 && Math.sign(o.y - 400) !== Math.sign(s.y - 400)); if (mate && G.AI.laneBlock(s, mate.x, mate.y, 12) === 0) { const a = Math.atan2(mate.y - s.y, mate.x - s.x); bot.fed = true; setTimeout0(() => { bot.fed = false; }); hold('right', Math.cos(a) > .35); hold('left', Math.cos(a) < -.35); hold('down', Math.sin(a) > .35); hold('up', Math.sin(a) < -.35); I.tap('pass'); return; } }
  if (!s.ai) s.ai = G.AI.fresh(s);
  const c = G.AI.intent(s, 1 / 120);
  hold('right', c.mx > .35); hold('left', c.mx < -.35); hold('down', c.my > .35); hold('up', c.my < -.35); hold('turbo', c.turbo); hold('shoot', c.shoot);
  for (const a of ['pass', 'deke', 'lob']) if (c.press[a]) I.tap(a);
  if (c.press.shoot) I.tap('shoot');
}
export const botStep = (G, game) => bot(G, game);
