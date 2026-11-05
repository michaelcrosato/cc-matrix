/* 15-anim: animation, in layers: the rig's own walk, run, idle and jump; held poses (engine patch 5: vready, bump, set,
 * blockup, toss, spikearm, highfive, clap, facepalm, peace, lookback, stretch, sit, sunbathe) weighted by each move's
 * timeline (wind 0 to 1, hold, release); an arm-IK overlay (rig.arms) for strikes; body offsets (crouch, lean, air,
 * land, down); motion-capture clips through Mocap.drive (celebrations, idles, dances); faces through expr. Animation is
 * driven from the simulation's plan: a spike's jump starts at t* minus its rise and the hand meets the ball at t*. */
G.Anim = {
  /** a weight over a move: rises over `wind`, holds, falls over `rel` (u: seconds into it) */
  w(u, wind, hold, rel) { if (u < 0) return 0; if (u < wind) return E.ease.outQuad(u / wind); if (u < wind + hold) return 1; if (u < wind + hold + rel) return 1 - E.ease.inOutQuad((u - wind - hold) / rel); return 0; },
  lib: null,
  init() {
    const MC = typeof Mocap !== 'undefined' ? Mocap : null, set = typeof MOCAP !== 'undefined' ? MOCAP.AOA : window.MOCAP && window.MOCAP.AOA;   // (the mocap scripts' top-level names)
    if (G.Anim.lib || !MC || !set) return;
    G.Anim.M = MC; try { G.Anim.lib = MC.load(set); } catch (e) { G.Anim.lib = null; G.game && G.game.fail('mocap', e); }
  },
  has(name) { const L = G.Anim.lib; try { return !!(L && L.clip(name)); } catch (e) { return false; } },
  /** play a clip on a rig (upper body only with mask 'upper'); t: seconds into it; w: its weight */
  clip(rig, name, t, w = 1, mask = null) {
    const L = G.Anim.lib; if (!L) return false;
    let c; try { c = L.clip(name); } catch (e) { c = null; } if (!c) return false;
    if (!rig._mocapOn) { try { G.Anim.M.drive(rig, L); rig._mocapOn = true; } catch (e) { return false; } }
    try { rig.mocap = L.sample(c, t); } catch (e) { return false; }
    rig.mocapW = w; rig.mocapMask = mask;
    return true;
  },
  stop(rig) { if (rig._mocapOn) { rig.mocap = null; rig.mocapW = 0; } },
  /** the rig's state for a volleyball player this step */
  player(M, p, dt) {
    const rig = p.rig, t = M.now, u = t - p.actT0, s = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing, poseW: {}, air: p.z > 2 };
    const PW = s.poseW; rig.arms = null; let clipName = null, clipT = 0, mask = null;
    const ready = (M.phase === 'rally' || M.phase === 'serveSetup' || M.phase === 'toss') && p.act === 'ready' && Math.hypot(p.vx, p.vy) < 30;
    PW.vready = ready ? .85 : 0;
    switch (p.act) {
      case 'bump': PW.bump = G.Anim.w(u, .12, .1, .3); PW.vready = 0; s.expr = p.q === 'PERFECT' ? 'smile' : null; break;
      case 'dig': PW.bump = G.Anim.w(u, .08, .15, .35); s.land = .4; break;
      case 'set': PW.set = G.Anim.w(u, .1, .08, .25); break;
      case 'spike': case 'shot': case 'serveHit': {
        // the arm cocks back over the rise, then whips over through the contact; the free arm points at the ball
        const tc = p.contactT || t, before = tc - t;
        if (before > 0) PW.spikearm = clamp(1 - (before - .06) / .32, 0, 1);
        else { const k = clamp(-before / (p.act === 'shot' ? .16 : .09), 0, 1), w = 1 - clamp((-before - .2) / .25, 0, 1); PW.spikearm = Math.max(0, 1 - k) * w; rig.arms = { w, R: [3 + 3 * k, 1.2, 25 - 12 * k], wL: .6, L: [5, -1.5, 10] }; }
        s.expr = 'shout'; break;
      }
      case 'block': PW.blockup = p.block ? 1 : G.Anim.w(u, .08, .4, .25); s.expr = 'angry'; break;
      case 'toss': PW.toss = G.Anim.w(u, .1, .5, .2); break;
      case 'dive': { const d = p.dive; if (d) { const du = t - d.t0; s.dash = du < .22; PW.bump = du < .52 ? .9 : 0; s.down = du < .22 ? clamp(du / .22, 0, 1) * .55 : du < .52 ? .55 : clamp(.55 - (du - .52) / .45 * .55, 0, .55); } break; }
      case 'call': PW.highfive = G.Anim.w(u, .08, .25, .2); s.expr = 'shout'; break;
      case 'whiff': s.hurt = u < .25; break;
      case 'highfive': PW.highfive = G.Anim.w(u, .15, .3, .25); s.expr = 'smile'; break;
      case 'celebrate': {
        s.expr = 'smile'; const name = p.celebrate || G.CAST[p.cast].celebrate || 'Victory';
        if (G.Anim.has(name)) { clipName = name; clipT = u; } else s.pose = 'cheer';
        break;
      }
      case 'cheer': s.pose = 'cheer'; s.expr = 'smile'; break;
      case 'fistpump': PW.highfive = .5 + .5 * Math.abs(Math.sin(u * 8)); s.expr = 'shout'; break;
      case 'sad': { const k = p.sadKind || 0; if (k === 0) PW.facepalm = G.Anim.w(u, .2, .6, .3); else if (k === 1 && G.Anim.has('Shrug')) { clipName = 'Shrug'; clipT = u; mask = 'upper'; } else s.pose = 'hips'; s.expr = 'wince'; break; }
      case 'kneel': s.pose = 'kneel'; s.expr = 'wince'; break;
      case 'pose': if (p.posePW) Object.assign(PW, p.posePW); else s.pose = p.pose; s.expr = p.expr; break;
      case 'clip': clipName = p.clip; clipT = u; mask = p.clipMask || null; s.expr = p.expr; break;
    }
    if (p.lean) rig.arms = Object.assign(rig.arms || { w: 1 }, { lean: p.lean });
    if (clipName && G.Anim.clip(rig, clipName, clipT, 1, mask)) { /* a clip plays */ } else G.Anim.stop(rig);
    rig.update(dt, s);
    p.rs = s;
    return s;
  },
  /** an idle or held pose for a character in a place (NPCs, the title lineup, photo poses) */
  idle(rig, dt, st, o = {}) {
    const s = Object.assign({ vx: 0, vy: 0 }, st);
    if (o.clip && G.Anim.clip(rig, o.clip, o.t || 0, o.w === undefined ? 1 : o.w, o.mask || null)) { /* a clip plays */ } else G.Anim.stop(rig);
    rig.update(dt, s);
  }
};
