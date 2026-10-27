// ---------------------------------------------------------------- AI pilots (attract mode / demo kiosk). They cheat freely: invulnerable, no-clip.
const AIPilot = {
  think(p, dt) {
    const c = p.ctl = Object.assign(p.ctl || blankCtl(), { fire: false, firePress: false, charge: false, chargeRel: false, boost: false, brake: false, rollL: false, rollR: false, bomb: false, advice: false, pause: false, mx: 0, my: 0, ax: 0, ay: 0 });
    p.aiS = p.aiS || { t: rr(0, 5), chargeT: 0, chargeCd: rr(3, 6), rollCd: 0, bombCd: rr(8, 14), uturn: 0 };
    if (!p.alive || Game.state === 'clear' || Game.paused) return; const S = p.aiS; S.t += dt; S.chargeCd -= dt; S.rollCd -= dt; S.bombCd -= dt;
    if (Game.kind === 'rail') this.rail(p, c, S, dt); else this.ar(p, c, S, dt);
    if (S.chargeT > 0) { S.chargeT -= dt; c.charge = true; c.fire = false; }
    if (S.bombCd <= 0 && p.bombs > 0 && Game.state !== 'intro') { const boss = Game.boss && !Game.boss.dead && Game.boss.coreOpen; const crowd = Game.enemies.filter((e) => e.pos.distanceToSquared(p.pos) < 60 * 60).length; if (boss || crowd >= 7) { c.bomb = true; S.bombCd = rr(12, 18); } else S.bombCd = 2; }
  },
  rail(p, c, S, dt) {
    const a = Game.a, sPos = a.s + p.pz, r = Game.rail, fwd = r.fwd(sPos), right = r.right(sPos); let tgt = null, bd = 1e9;
    for (const e of Game.enemies) { if (!Game.lockable(e) && !(e.part && e.active && !e.armor)) continue; const rd = (e.es !== undefined && e.rail !== false ? e.es : sPos + e.pos.clone().sub(p.pos).dot(fwd)) - sPos; if (e.type === 'bossPart' && !(e.active && !e.armor)) continue; if (rd < 12 || rd > 175) continue; const score = rd + Math.abs(e.pos.clone().sub(p.pos).dot(right)) * 0.6 + (e.type === 'missile' ? -60 : 0); if (score < bd) { bd = score; tgt = e; } }
    let pk = null, pd = 1e9; for (const k of Game.pickups) { const rd = k.es - sPos; if (rd > 4 && rd < 70 && rd < pd) { pd = rd; pk = k; } }
    let tx = p.x * 0.97, ty = 8;
    if (tgt) { const to = tgt.pos.clone().sub(p.pos); tx = to.dot(right) * 0.5 + p.x * 0.5; ty = clamp(tgt.pos.y * 0.6 + 5, 3, 14); }
    if (pk) { tx = pk.ex ?? p.x; ty = pk.ey ?? 8; } if (Game.boss && !Game.boss.dead) { tx = Game.boss.ex * 0.6 + (p.slot - 0.5) * 6; ty = 9 + Math.sin(S.t) * 2; }
    // dodge obstacles by plan (cheating no-clip, but look natural)
    for (const o of Game.obstacles) { const rd = o.es - sPos; if (rd > 0 && rd < 45 && o.beam) ty = o.beamHigh ? 4.5 : 12; }
    c.mx = clamp((tx - p.x) * 0.35, -1, 1); c.my = clamp((ty - p.y) * 0.35, -1, 1);
    if (tgt) { const to = tgt.pos.clone().sub(p.pos), df = to.dot(fwd) || 1, sc = 75 / Math.max(df, 8); c.ax = clamp(to.dot(right) * sc / 32, -1, 1); c.ay = clamp(to.y * sc / 22, -1, 1); c.fire = Math.abs(c.ax) < 0.95; }
    else { c.ax = 0; c.ay = 0; c.boost = Game.state === 'play' && !Game.boss && (p.slot % 2 === 0 || true); }
    const near = Game.enemies.filter((e) => e.type !== 'missile' && e.pos.distanceToSquared(p.pos) < 160 * 160 && Game.lockable(e)).length;
    if (S.chargeCd <= 0 && near >= 3 && S.chargeT <= 0) { S.chargeT = 1.0 + Math.random() * 0.4; S.chargeCd = rr(5, 8); }
    for (const s of Game.shots) if (s.owner === 'e' && S.rollCd <= 0 && s.pos.distanceToSquared(p.pos) < 26 * 26 && s.vel.clone().normalize().dot(p.pos.clone().sub(s.pos).normalize()) > 0.9) { if (Math.random() < 0.6) { if (p.slot % 2) c.rollL = true; else c.rollR = true; } S.rollCd = 1.4; break; }
    if (S.chargeT > 0 || p.charging) c.fire = false;
  },
  ar(p, c, S, dt) {
    let tgt = null, bd = 1e9; for (const e of Game.enemies) { if (e.dead || e.type === 'missile') continue; const d = e.pos.distanceTo(p.pos) - (e.type === 'rival' ? 80 : 0); if (d < bd) { bd = d; tgt = e; } }
    const fwd = V3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ')); let des = tgt ? tgt.pos.clone().addScaledVector(tgt.dir || ZERO, bd / 170 * 40).sub(p.pos) : p.pos.clone().negate().add(V3(Math.cos(S.t * 0.2) * 80, 0, Math.sin(S.t * 0.2) * 80));
    const dist = des.length(); des.normalize(); const dyaw = wrapPi(Math.atan2(-des.x, -des.z) - p.yaw), dpitch = Math.asin(clamp(des.y, -1, 1)) - p.pitch;
    c.mx = clamp(-dyaw * 2.4, -1, 1); c.my = clamp(dpitch * 2.4, -1, 1); const ang = Math.acos(clamp(fwd.dot(des), -1, 1));
    if (tgt && ang < 0.12 && dist < 420) { c.fire = true; } if (tgt && ang < 0.2 && dist > 60 && S.chargeCd <= 0 && S.chargeT <= 0) { S.chargeT = 1.1; S.chargeCd = rr(4, 7); }
    if (S.chargeT > 0) { c.ax = clamp(-dyaw * 3, -1, 1) * 0.5; }
    S.uturn -= dt; if ((p.tailed || (tgt && ang > 2.4 && dist < 300)) && S.uturn <= 0 && !p.man) { c.boost = true; c.my = -1; S.uturn = 5; }
    else if (tgt && dist > 260 && !p.man && ang < 0.8) c.boost = true;
    if (p.man) c.boost = true;
    for (const s of Game.shots) if (s.owner === 'e' && S.rollCd <= 0 && s.pos.distanceToSquared(p.pos) < 30 * 30) { c.rollL = Math.random() < 0.5; c.rollR = !c.rollL; S.rollCd = 1.5; break; }
  },
};
