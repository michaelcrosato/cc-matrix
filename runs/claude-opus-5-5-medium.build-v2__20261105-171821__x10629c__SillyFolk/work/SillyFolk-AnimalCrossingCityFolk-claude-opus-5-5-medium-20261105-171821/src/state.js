// The one running game: shared handles every system reaches for. createGame() fills it in.
export const G = { ctx: null, world: null, mode: 'boot', places: {}, rooms: {}, place: null, view: null, ctrl: null, hud: null, fish: [], bugs: [], balloons: [], time: 0, frozenBy: 0, firstTalkDone: false, active: true, devFly: false };
const handlers = new Map();
export const bus = { on(e, f) { (handlers.get(e) ?? handlers.set(e, []).get(e)).push(f); }, emit(e, ...a) { for (const f of handlers.get(e) ?? []) f(...a); }, clear() { handlers.clear(); } };
