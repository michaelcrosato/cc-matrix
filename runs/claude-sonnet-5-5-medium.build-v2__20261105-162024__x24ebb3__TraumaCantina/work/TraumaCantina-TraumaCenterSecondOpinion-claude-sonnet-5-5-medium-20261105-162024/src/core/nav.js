// Stage navigation registry (filled in by game.js) so stages don't import each other circularly.
export const go = {};
export async function swap(ctx, stage, cover = 'iris') {
  try { await ctx.engine.screen.cover(cover, {}); } catch {}
  await ctx.engine.loadGame(stage);
  try { await ctx.engine.screen.reveal(cover); } catch {}
}
