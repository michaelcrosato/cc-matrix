// round screens.
export function cashRunScreen(g) {
  return { id: 'cash-run', title: 'CASH RUN', cover: 'ink', top: 84, sub: 'SIX MINUTES. CARRY THE MOST CASES TO THE TRUCK. FRIENDS ONLINE PLAY THROUGH AI HUB.', items: [
    { label: 'SOLO WITH HIRED GUNS', action: () => g.startCashRun('solo') },
    { label: 'HOST ON THIS COMPUTER', action: () => g.startCashRun('host') },
    { label: 'JOIN ON THIS COMPUTER', action: () => g.startCashRun('join') },
  ] };
}
export function resultsScreen(g, rows) {
  return { id: 'results', cover: 'ink', title: 'THE COUNT', top: 210, back: null, footer: [['confirm', 'OK']], items: [{ label: 'TO THE TITLE', action: () => g.toTitle() }], draw() { const h = g.ctx.hud; rows.forEach((r, i) => { h.text(60, 70 + i * 22, `${i + 1}. ${r.name}`, { scale: 2, color: r.color ?? 'white' }); h.text(h.width - 60 - String(r.score).length * 12, 70 + i * 22, String(r.score), { scale: 2, color: 'sand' }); }); } };
}
