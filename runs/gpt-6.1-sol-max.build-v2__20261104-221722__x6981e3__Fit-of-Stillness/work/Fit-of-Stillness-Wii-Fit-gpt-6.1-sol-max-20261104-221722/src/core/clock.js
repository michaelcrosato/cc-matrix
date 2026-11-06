// The 0.46.0 replay frame stores the unscaled delta before calling update.
// UI timing must continue while the game's clock is frozen by a menu.
export function uiDelta(ctx,gameDelta){const recorded=ctx.engine.rec?.frames?.at(-1)?.dt;return Math.min(.1,Math.max(0,recorded??(ctx.engine.timeScale?gameDelta/ctx.engine.timeScale:1/60)));}
