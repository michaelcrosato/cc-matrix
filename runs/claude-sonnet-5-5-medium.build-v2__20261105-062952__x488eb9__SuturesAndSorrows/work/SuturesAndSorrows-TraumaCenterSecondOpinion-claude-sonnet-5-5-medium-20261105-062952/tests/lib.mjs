// Shared by tests and tools/balance.mjs: run a case with the bot through the real Cursor path.
export function playCase(G, id, { dtt = 1 / 60, diff = 'Resident', seed = 3, bot = {}, maxT = 700, cheat = false, hook, players = 1, def } = {}) {
  const d = def || G.CASES[id], S = G.Op.create(d, { seed, difficulty: diff, players });
  const cs = [], bots = [], dt = dtt;
  for (let i = 0; i < players; i++) { cs.push(G.Cursor.make()); bots.push(new G.Bot({ cheat, ...bot, onError: e => { S.botError = e.stack; } })); }
  if (cheat) { S.cheatLock = true; }
  let t = 0, steps = 0; const log = [];
  while (!S.over && t < maxT) {
    const inputs = [];
    for (let i = 0; i < players; i++) { const p = S.pl[i], r = bots[i].read(S, p, cs[i], dt); G.Cursor.update(cs[i], { ax: r.dev.ax, ay: r.dev.ay, fine: r.fine }, S, p, dt); inputs.push({ x: cs[i].ex, y: cs[i].ey, trig: r.trig, tool: r.tool, fine: r.fine, gift: r.gift }); }
    G.Op.step(S, inputs, dt); t += dt; steps++; if (hook) hook(S, bots, t);
    if (S.ev.length) { for (const e of S.ev) if (e[0] === 'phase' || e[0] === 'lost') log.push(t.toFixed(0) + ':' + e[0] + ':' + e[1]); S.ev.length = 0; }
    if (S.over === 'lost' && S.retries == null) break;
  }
  return { S, t, log, bots };
}
