// Attract-mode autopilot. It only has to look good: it tracks the nearest threat,
// dodges shots with barrel rolls, locks and fires missiles, and bombs in crowds.
// The game gives it infinite health and bombs, so it never needs to play well.

export function createPilot() {
  return { rollCD: 0, mHold: 0, mCool: 0, bombCD: 0, t: 0 };
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function pilotCommands(g, dt, st) {
  st.t += dt;
  st.rollCD -= dt;
  st.mCool -= dt;
  st.bombCD -= dt;
  const ship = g.ship;

  let target = null;
  let best = Infinity;
  let inFront = 0;
  for (const e of g.enemies) {
    if (e.dead || e.z > -4 || e.z < -110) continue;
    const d = Math.abs(e.x - ship.x) + Math.abs(e.y - ship.y);
    if (d < 16) inFront++;
    if (d < best) {
      best = d;
      target = e;
    }
  }

  let danger = null;
  for (const b of g.bullets) {
    if (!b.active) continue;
    if (b.z > -7 && b.z < 1.5 && Math.abs(b.x - ship.x) < 2.6 && Math.abs(b.y - ship.y) < 2.6) {
      danger = b;
      break;
    }
  }

  // With nothing to shoot, fly through the next ring gate to show the mechanic.
  let ring = null;
  if (!target) {
    for (const r of g.rings) {
      if (!r.got && r.z < -2 && r.z > -90 && (!ring || r.z > ring.z)) ring = r;
    }
  }

  let x = Math.sin(st.t * 0.5) * 0.5;
  let y = Math.sin(st.t * 0.37) * 0.3;
  // Bosses are shot through their side pods, so aim at the pod, not the shielded centre.
  const aim = target ? g.aimPoint(target) : null;
  if (target) {
    x = clamp((aim.x - ship.x) * 0.9, -1, 1);
    y = clamp((clamp(aim.y, -2.6, 4.5) - ship.y) * 0.9, -1, 1);
  } else if (ring) {
    x = clamp((ring.x - ship.x) * 0.9, -1, 1);
    y = clamp((clamp(ring.y, -2.6, 4.5) - ship.y) * 0.9, -1, 1);
  }
  let rollTap = false;
  if (danger) {
    x = danger.x > ship.x ? -1 : 1;
    if (st.rollCD <= 0) {
      rollTap = true;
      st.rollCD = 1.2;
    }
  }

  // Missiles: hold to lock, release after a second, then cool down.
  let missile = false;
  if (inFront >= 3 && st.mCool <= 0) {
    st.mHold += dt;
    missile = st.mHold < 1.0;
    if (!missile) {
      st.mCool = 2;
      st.mHold = 0;
    }
  } else {
    st.mHold = 0;
  }

  let bombTap = false;
  if ((inFront >= 6 || ship.shield < 30) && g.bombs > 0 && st.bombCD <= 0) {
    bombTap = true;
    st.bombCD = 4;
  }

  return {
    x,
    y,
    fire: !!target && Math.abs(aim.x - ship.x) < 8,
    missile,
    boost: !!target && target.z < -55 && !danger,
    brake: !!danger,
    rollTap,
    bombTap,
  };
}
