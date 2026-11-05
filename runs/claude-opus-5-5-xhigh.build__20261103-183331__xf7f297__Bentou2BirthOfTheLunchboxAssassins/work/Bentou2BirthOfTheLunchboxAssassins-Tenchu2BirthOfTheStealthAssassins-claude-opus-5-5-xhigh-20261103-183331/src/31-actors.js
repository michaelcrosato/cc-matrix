/* ---- ACTORS: every body in a mission is an E.Mover with a rig, health and status. Guards, the hero, bosses, civilians,
 * Tobei and the hub's ghosts share this base, so sight (E.sees), actions (E.ACTIONS) and damage treat them alike ---- */
const Actor = {};
let ACTOR_ID = 0;
Actor.make = (o) => {
  const b = new E.Mover(Object.assign({ r: 5, climbMax: 30, hopMax: 48, vault: 14 }, o.body || {}, { x: o.x, y: o.y, z: o.z || 0 }));
  b.facing = o.facing || 0;
  return Object.assign(b, { uid: ++ACTOR_ID, id: o.id || ('a' + ACTOR_ID), kind: o.kind || 'guard', rig: o.rig || null, hp: o.hp || 10, maxHp: o.hp || 10, alive: true, asleep: false,
    hurtT: 0, iframes: 0, flash: 0, status: {}, team: o.team || 'enemy', hidden: false, sunk: false, vis: 'visible', visA: 1, seen: false });
};
/** a body that can be dragged: dead, asleep or knocked out (not a boss, not sunk) */
Actor.isBody = a => a && !a.sunk && (!a.alive || a.asleep || (a.status && a.status.sleep > 0)) && a.kind !== 'boss' && a.kind !== 'escort';
/** draw an actor with its shadow; o: r.actor options */
Actor.draw = (r, a, o = {}) => {
  if (a.sunk || !a.rig) return;
  const z = a.drawZ !== undefined ? a.drawZ : a.z, M = B.M, ground = M ? M.world.map.groundAt(a.x, a.y, a.r, a.z) : 0;
  if (!a.noShadow) r.shadow(a.x, a.y, a.kind === 'boss' ? 10 : 6, .35, undefined, ground);
  const rig = a.rig;
  r.actor(a.x, a.y, z, (g, ox, oy) => rig.draw(g, ox, oy, r.view), o);
};
B.Actor = Actor;
