/* ---- ESCORT: Tobei the courier follows within 20-40 on the ground nav map (he cannot grapple or climb), crouches and
 * swims with the hero, waits or follows on Interact, runs to the hero when a guard is alert on him, and is teleported
 * along when left far behind out of sight. If he falls, the mission fails ---- */
const Escort = {};
Escort.spawn = (spec, M) => {
  const W = M.world, x = cellC(spec.at[0]), y = cellC(spec.at[1]);
  const e = Actor.make({ kind: 'escort', id: spec.id || 'tobei', x, y, z: W.map.groundAt(x, y), hp: spec.hp || 60, rig: Rigs.make('tobei'), team: 'hero', body: { walk: 40, run: 82, climbMax: 14, hopMax: 34 } });
  Object.assign(e, { caged: spec.caged !== false, follow: false, wait: false, barkT: 4, voice: 'tobei', exposure: 1, A: { label: 'Tobei' }, crouch: false, swim: false, hpMax: spec.hp || 60 });
  e.onDeath = () => { B.emit('escortDeath', { escort: e }); return true; };
  return e;
};
Escort.update = (e, dt, M) => {
  const W = M.world, h = M.hero;
  e.hurtT = Math.max(0, e.hurtT - dt); e.barkT -= dt; if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
  if (!e.alive) { e.rig.update(dt, { x: e.x, y: e.y, z: e.z, facing: e.facing, down: 1 }); return; }
  if (e.caged) { e.update(dt, W.map, { move: [0, 0] }); e.rig._post = Rigs.cower(game.time); e.rig.update(dt, e.rigState({ crouch: true })); return; }
  // exposure: as the hero's (light, cover, crouch)
  const L = W.lightAt(e.x, e.y, e.z); e.exposure = lerp(1 - T('darkness'), 1, L) * (W.isHide(e.x, e.y, e.z) ? (e.crouch ? .15 : .6) : 1) * (e.crouch ? T('crouchVis') / .6 : 1) * (e.dive ? 0 : 1);
  const hunted = M.guards.some(g => g.alive && g.mind && g.mind.state === 'alert' && g.target === e);
  let move = [0, 0];
  const d = Math.hypot(h.x - e.x, h.y - e.y);
  if (e.follow && !e.wait) {
    // a far teleport when left behind and out of the hero's sight (never into a wall or the deep)
    if (d > 160 && !W.map.sight(h, e) && h.onGround && !W.isDeep(h.x, h.y, h.z) && Math.abs(h.z - W.map.groundAt(h.x, h.y)) < 2) { const a = h.facing + Math.PI; const nx = h.x + Math.cos(a) * 18, ny = h.y + Math.sin(a) * 18; if (W.map.standable(nx, ny, h.z, 4)) { e.x = nx; e.y = ny; e.z = h.z; } }
    const keep = hunted ? 10 : 26;
    if (d > keep + 8 || hunted) { const s = W.steer(e, h, 'walk', d > 60 || hunted ? 1 : .5); move = s.move; }
    e.crouch = h.crouch || h.dive || h.hug; e.swim = W.isDeep(e.x, e.y, e.z); e.dive = e.swim && h.dive;
    if (e.barkT <= 0 && rand() < dt * .1) { e.barkT = 18; Brain.bark(e, 'tobei'); }
  }
  // the escort swims where the hero swims: the nav map has no water, so he follows the hero's own line through it
  if (e.follow && !e.wait && (W.isDeep(h.x, h.y, h.z) || W.isDeep(e.x, e.y, e.z)) && d > 22) { const a = ANG(e, h); move = [Math.cos(a), Math.sin(a)]; }
  e.walk = e.swim ? 26 : 40;
  e.update(dt, W.map, { move, crouch: e.crouch && !e.swim });
  if (e.inHazard) { e.inHazard = false; e.respawn(); }
  e.drawZ = e.swim ? e.z - (e.dive ? 15 : 9) : undefined;
  e.rig._post = e.swim ? Rigs.swim(game.time) : null;
  e.rig.update(dt, e.rigState({ hurt: e.hurtT > .1, down: e.swim ? (e.dive ? .55 : .35) : undefined, expr: hunted ? 'shout' : undefined }));
};
/** Interact near Tobei: Wait here / Follow me */
Escort.toggle = (e, M) => {
  if (e.caged || !e.alive) return false;
  e.wait = !e.wait; Brain.bark(e, e.wait ? 'tobeiWait' : 'tobeiFollow', true);
  B.Hud.toast(e.wait ? 'Tobei waits' : 'Tobei follows', e.wait ? 'He hides where he stands.' : 'Keep him out of the light.');
  return true;
};
B.Escort = Escort;
