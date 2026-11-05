// The bot: plays any screen through game.input as a player would. In play it asks the game's own AI what it would do
// with the player's skater and gives that as the stick and the buttons (holds and taps).
export function makeBot(G, game) {
  const I = game.input, held = new Set();
  const hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
  const releaseAll = () => { for (const a of [...held]) hold(a, false); };
  let t = 0, lastTap = 0;
  const tapEvery = (a, gap) => { if (t - lastTap >= gap) { lastTap = t; I.tap(a); } };
  const stick = (mx, my) => { hold('right', mx > .35); hold('left', mx < -.35); hold('down', my > .35); hold('up', my < -.35); };
  const bot = {
    drill: null, wantFlood: true, choice: 0,
    step(dt = 1 / 120) {
      t += dt; const sc = game.sceneName, m = G.Match.m;
      if (sc === 'cutscene' || sc === 'pregame' || sc === 'storymap' || sc === 'warmup') { releaseAll(); tapEvery('confirm', .3); return; }
      if (sc === 'results') { releaseAll(); tapEvery('confirm', .5); return; }
      if (sc === 'credits') { releaseAll(); if (t % 4 < dt) I.tap('confirm'); return; }
      if (sc === 'flood') { const F = G.Flood, st = F.st; if (game.scene && game.scene.phase === 'card') { releaseAll(); tapEvery(bot.wantFlood ? 'pass' : 'deke', .5); return; } if (!st) { releaseAll(); return; } if (st.done) { releaseAll(); return; } const c = F.car; if (!c) return; const tgt = bot.floodTarget(); const dx = tgt[0] - c.x, dy = tgt[1] - c.y, d = Math.hypot(dx, dy) || 1; stick(dx / d, dy / d); hold('turbo', true); return; }
      if (sc !== 'match' || !m) { releaseAll(); return; }
      const hu = m.humans.find(h => h.input === I); if (!hu) { releaseAll(); return; }
      const s = hu.skater;
      if (m.phase === 'intro') { releaseAll(); tapEvery('confirm', .4); return; }
      if (m.phase === 'faceoff') { releaseAll(); if (m.faceoff && m.faceoff.dropped && m.faceoff.t - m.faceoff.drop > .05) I.tap('pass'); return; }
      if (m.phase === 'replay') { releaseAll(); tapEvery('confirm', .3); return; }
      if (m.phase === 'fight') { releaseAll(); const f = s.fight; if (f && !f.act) { const r = (t * 7) % 1; I.tap(r < .7 ? 'pass' : r < .85 ? 'shoot' : 'lob'); } return; }
      if (m.phase === 'shootout') { releaseAll(); const A = m.so && m.so.att; if (A && A.shooter === s.id) { G.AI.shooter(m, s, dt); const it = s.intent; stick(it.mx, it.my); for (const p of ['pass', 'shoot', 'deke']) if (it.press[p]) I.tap(p); hold('shoot', !!it.held.shoot); } return; }
      if (m.phase !== 'play') { releaseAll(); return; }
      if (bot.drill && bot.drill(m, s, { hold, stick, tap: a => I.tap(a), t })) return;
      G.AI.step(m, s, dt);
      const it = s.intent; stick(it.mx, it.my);
      for (const p of ['pass', 'shoot', 'deke', 'lob']) if (it.press[p]) I.tap(p);
      hold('shoot', !!it.held.shoot); hold('turbo', !!it.held.turbo);
    },
    floodTarget() { const W = G.Flood.WP, c = G.Flood.car; bot.wpI = bot.wpI || 0; if (Math.hypot(W[bot.wpI % W.length][0] - c.x, W[bot.wpI % W.length][1] - c.y) < 34) bot.wpI++; if (bot.mower !== false) return W[bot.wpI % W.length]; const R = G.Rink; let best = null, bv = 0; for (let i = 0; i < R.scuff.length; i++) { const v = R.scuff[i] + R.melt[i]; if (v < .05) continue; const x = R.X0 + (i % R.SW) * 16 + 8, y = R.Y0 + Math.floor(i / R.SW) * 16 + 8, d = Math.hypot(x - c.x, y - c.y), score = v / (20 + d); if (score > bv) { bv = score; best = [x, y]; } } return best || [R.C.x, R.C.y]; },
    releaseAll
  };
  return bot;
}
export function run(game, bot, seconds, until) { const n = Math.round(seconds * 120); for (let i = 0; i < n; i++) { bot.step(); game.advance(1 / 120); if (until && until()) return true; } return false; }
