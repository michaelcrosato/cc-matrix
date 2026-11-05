// LOCAL PLAY: hot-seat seats (each human realm or side reads its own controller, or every input when shared), the
// optional hot-seat turn timer (Settings: Off, 60 s, 30 s), which hands a troop to the AI when its time runs out, and
// the privacy cards between humans (in the campaign scene).

const LM = G.LocalMP = { clock: 0, troop: null };
/** seconds a human troop may take, or 0 (Off) */
LM.limit = () => ({ '60 s': 60, '30 s': 30 }[(G.game.settings && G.game.settings.hotseatTimer) || 'Off'] || 0);
/** call each step of a human troop's turn in battle; returns seconds left, or null without a timer */
LM.tick = (dt, B) => {
  const lim = LM.limit(), humans = B.ctx.sides.filter(s => s === 'human').length;
  if (!lim || humans < 2 || B.ctx.kind === 'hub') return null;
  const tr = B.sim.activeTroop(); if (!tr) return null;
  if (LM.troop !== tr.id + ':' + B.sim.s.bell) { LM.troop = tr.id + ':' + B.sim.s.bell; LM.clock = 0; }
  LM.clock += dt; const left = lim - LM.clock;
  if (left <= 0) { B.delegated[tr.id] = 'turn'; G.UI.toast('Time! The AI finishes this troop\'s turn.', '#ffd060'); LM.clock = -1e9; }
  else if (left < 5 && Math.floor(left) !== Math.floor(left + dt)) G.sfx('timer_tick');
  return Math.max(0, left);
};
/** a troop delegated by the timer plays only that turn */
LM.turnEnded = (B, troop) => { if (B.delegated[troop] === 'turn') delete B.delegated[troop]; };
