// AI Hub glue: connect first (before Engine.start); the game opens straight into the round.
export async function hubConnect() {
  const H = typeof window !== 'undefined' ? window.AIHub : null; if (!H || !H.active) return null;
  try { const info = await H.connect({ mode: 'shared-world', seats: [1, 4], card: true }); return info ?? null; } catch (e) { return null; }
}
