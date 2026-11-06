export default async function ({ check, load }) {
  const ctx = load(); const G = ctx.GAME;
  const S = G.Op.create(G.CASES.c1, { seed: 5 });
  check('case 1 creates', S.objs.filter(o => o.type === 'shard').length === 4);
  const inp = { x: 213, y: 116, trig: 0, tool: 'forceps' };
  // forceps: grab and pull a shard along its axis at moderate speed
  const sh = S.objs.find(o => o.type === 'shard');
  const go = (x, y, trig, tool = 'forceps') => { inp.x = x; inp.y = y; inp.trig = trig; inp.tool = tool; G.Op.step(S, [inp], 1 / 60); };
  go(sh.x, sh.y, 0); go(sh.x, sh.y, 1);
  for (let i = 0; i < 60; i++) go(sh.x0 + sh.ax[0] * i * 1.2, sh.y0 + sh.ax[1] * i * 1.2, 1);
  check('shard comes free', sh.free, JSON.stringify(sh));
  go(sh.x0 + sh.ax[0] * 70, sh.y0 + sh.ax[1] * 70, 0);
  check('shard caught', sh.done || !S.objs.includes(sh));
  check('vitals ok', S.vitals > 70);
}
