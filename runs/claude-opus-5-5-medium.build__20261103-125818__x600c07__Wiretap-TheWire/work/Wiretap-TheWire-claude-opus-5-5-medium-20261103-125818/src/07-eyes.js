// WIRETAP: eyes, both ways. Perception (every watcher x every cop: one E.Suspicion each, scaled by what the cop is doing),
// getting "made" and its price, and the camera: Watch mode, the reticle, reading roles, photos scored by stars, polaroids.
const ACTS = ['sale-money', 'sale-product', 'reup-handoff', 'payphone', 'stash-access', 'count-handoff', 'robbery'];
const ROLE_TAG = { lookout: 'LOOKOUT', runner: 'RUNNER', stash: 'STASH', money: 'MONEY', muscle: 'MUSCLE', lieutenant: 'LIEUTENANT' };
const Perception = {
  /** observers: agents with eyes; cops: the watched ({ id, x, y, z, still, watching, aimAt, sprinting, crouching, cover, blending, inCar }) */
  update(dt, observers, cops, ctx = {}) {
    let worst = 0, worstState = 'calm';
    for (const o of observers) {
      if (!o.watcher || o.gone) continue;
      for (const p of cops) {
        if (p.hidden) continue;
        const mind = o.minds[p.id] = o.minds[p.id] || new E.Suspicion({ rise: .13, decay: .1, notice: .3, search: .65, alert: 1, forget: 6 });
        const eye = { x: o.x, y: o.y, z: o.z, facing: o.facing }, seen = E.sees(eye, p, { map: World.map, range: o.range, fov: o.fov });
        let b = p.moving ? .4 : 1;
        if (p.watching && p.aimAt && Math.abs(angDiff(angTo(p, p.aimAt), angTo(p, o))) < .17 && dist(p.aimAt, o) < 60) b = 2.2;
        else if (p.still > 2 && !p.cover) b = 1.6;
        if (p.sprinting) b = Math.max(b, 1.4); if (p.crouching) b = Math.max(b, 1.3);
        if (p.tooClose) b = Math.max(b, 1.8);
        if (p.cover) b *= .6; if (p.blending) b *= .2; if (p.inCar) b *= .3;
        if (o.knows.has(p.id)) b *= 1.5;
        const light = ctx.lit ? (ctx.lit(p) ? 1.1 : (ctx.night ? .7 : 1)) : 1;
        let e = seen.seen ? seen.exposure * b * light * DIFF().rise * (ctx.mul || 1) : 0;
        if (e < .5) e = 0;
        const st = mind.update(dt, Object.assign({}, seen, { exposure: e }), p);
        if (mind.changed && st === 'notice') { o.lookT = 2; }
        if (mind.changed && st === 'search' && ctx.onSearch) ctx.onSearch(o, p);
        if (mind.changed && st === 'alert') { mind._made = true; if (ctx.onMade) ctx.onMade(o, p); }
        if (st !== 'calm' && mind.last) o.facing = E.approachAng(o.facing, angTo(o, p), dt * 4);
        if (mind.level > worst) { worst = mind.level; worstState = st; }
      }
    }
    return { level: worst, state: worstState };
  },
  /** after being made: everyone near that watcher learns the face */
  learn(observers, o, p) { for (const a of observers) if (dist(a, o) < 120) a.knows.add(p.id); o.knows.add(p.id); },
  reset(observers, pid) { for (const o of observers) if (o.minds[pid]) o.minds[pid].reset(); }
};

/* ---- the camera: watch, read, shoot ---- */
const PHOTO_IMG = {};
const Camera = {
  /** a fresh camera state for a cop: film, range (the van's long lens: 360) */
  make(o = {}) { return { film: o.film || 30, range: o.range || 220, pan: o.pan || 10 * T, aim: null, ret: null, target: null, focusT: 0, readT: 0, readOf: null, lastRet: null, flash: 0, watching: false }; },
  /** each step while watching: move the aim, find the target, fill the focus and read meters */
  update(dt, cam, cop, ctl, agents, opts = {}) {
    if (!cam.aim) cam.aim = { x: cop.x + Math.cos(cop.facing) * 40, y: cop.y + Math.sin(cop.facing) * 40 };
    const ptr = ctl.pointer && ctl.pointer();
    if (ptr && ctl.human) {
      // the mouse aims where it points; held at the screen's edge it keeps panning that way (to reach past the screen)
      const W = game.W, H = game.H, ex = ptr[0] < 10 ? -1 : ptr[0] > W - 10 ? 1 : 0, ey = ptr[1] < 10 ? -1 : ptr[1] > H - 10 ? 1 : 0;
      if (ex || ey) { const d = game.view.screenDirToGround(ex, ey); cam.aim.x += d[0] * 160 * dt; cam.aim.y += d[1] * 160 * dt; cam.retScr = null; }
      else { const g = game.mouseGround(); if (g) { cam.aim.x = g[0] !== undefined ? g[0] : g.x; cam.aim.y = g[1] !== undefined ? g[1] : g.y; } cam.retScr = ptr; }
    }
    else {
      const s = ctl.aimStick ? ctl.aimStick() : [0, 0], m = ctl.human ? ctl.screenMove() : [0, 0], v = Math.hypot(s[0], s[1]) > .2 ? s : (ctl.human && Prompt.dev === 'pad' ? [0, 0] : m);
      if (Math.hypot(v[0], v[1]) > .1) { const d = game.view.screenDirToGround(v[0], v[1]), k = Math.min(1, Math.hypot(v[0], v[1])) * 150 * dt; cam.aim.x += d[0] * k; cam.aim.y += d[1] * k; }
      if (opts.botAim) { cam.aim.x = lerp(cam.aim.x, opts.botAim.x, Math.min(1, dt * 6)); cam.aim.y = lerp(cam.aim.y, opts.botAim.y, Math.min(1, dt * 6)); }
      cam.retScr = null;
    }
    const dx = cam.aim.x - cop.x, dy = cam.aim.y - cop.y, l = Math.hypot(dx, dy); if (l > cam.pan) { cam.aim.x = cop.x + dx / l * cam.pan; cam.aim.y = cop.y + dy / l * cam.pan; }
    cop.facing = Math.atan2(dy, dx);
    // the target: whoever's chest sits under the reticle (last frame's screen points)
    const rs = cam.retScr || cam.retDrawn; let best = null, bd = 13;
    if (rs) for (const a of agents) { if (!a.scr || !a.visible || a === cop) continue; const d = Math.hypot(a.scr[0] - rs[0], a.scr[1] - rs[1]); if (d < bd) { bd = d; best = a; } }
    if (!rs) for (const a of agents) { const d = Math.hypot(a.x - cam.aim.x, a.y - cam.aim.y); if (d < 14 && d < bd) { bd = d; best = a; } }
    const moved = cam.lastRet && rs ? Math.hypot(rs[0] - cam.lastRet[0], rs[1] - cam.lastRet[1]) / dt : 0; cam.lastRet = rs ? rs.slice() : null;
    if (best !== cam.target) { cam.target = best; cam.focusT = 0; cam.readT = 0; }
    if (best && moved < 30 * (game.view.scale || 1) + 40) cam.focusT = Math.min(.4, cam.focusT + dt); else cam.focusT = Math.max(0, cam.focusT - dt * 2);
    // reading a role: 3 s on someone doing their job
    if (best && best.role && !opts.noRead && (best.act || ['lookout', 'muscle', 'lieutenant', 'runner', 'money', 'stash'].includes(best.role))) {
      cam.readT += dt; if (cam.readT >= 3) { cam.readT = -99; if (opts.onRead) opts.onRead(best); }
    }
    if (cam.flash > 0) cam.flash -= dt;
  },
  /** score a photo of whoever is under the reticle (App: Face, Focus, Act; blurry past range; burned = 0) */
  score(cam, cop, t, o = {}) {
    if (!t) return { stars: 0, why: 'Nobody in frame', tags: [] };
    const d = dist(cop, t), tags = [];
    if (d > cam.range) return { stars: 0, why: 'Blurry: too far', tags, d };
    if (cop.burned) return { stars: 0, why: 'Burned: they all know your face', tags, d };
    const clear = World.map.sight ? World.map.sight({ x: cop.x, y: cop.y, z: cop.z || 0 }, { x: t.x, y: t.y, z: t.z }) : true;
    let s = 0;
    const faceAng = Math.abs(angDiff(t.facing, angTo(t, cop)));
    if (clear && faceAng <= 1.6) { s++; tags.push('face'); }
    if (cam.focusT >= .38) { s++; tags.push('focus'); }
    if (t.act && ACTS.includes(t.act)) { s++; tags.push('act'); tags.push('act:' + t.act); }
    return { stars: s, tags, d, turn: clamp(angDiff(angTo(t, cop), t.facing) / Math.PI, -1, 1), why: s ? '' : 'No face, no focus' };
  },
  /** take it: film, sound, the photo object (and its polaroid) */
  shoot(cam, cop, t, o = {}) {
    if (cam.film <= 0) { sfx('cancel'); return null; }
    cam.film--; shutterSound(); cam.flash = .08;
    const sc = this.score(cam, cop, t, o), id = 'ph' + (STATE.photos.length + 1) + '_' + Math.floor(game.time * 10);
    const ph = { id, subject: t ? (t.person || t.tag || t.id) : null, stars: sc.stars, tags: sc.tags, turn: sc.turn || 0, place: o.place || 'Gaither & Ridley', clock: o.clock || '', ep: STATE.ep, mood: World.mood, role: t && t.role };
    if (!o.noSave) { STATE.photos.push(ph); STATE.stats.photos++; }
    this.render(ph, t);
    return ph;
  },
  /** the polaroid: the subject from your angle (the back of a head if they faced away), grain, a date stamp */
  render(ph, t) {
    if (!HAS_DOM || PHOTO_IMG[ph.id]) return PHOTO_IMG[ph.id];
    try {
      const cv = document.createElement('canvas'); cv.width = 72; cv.height = 72; const g = cv.getContext('2d');
      const bg = { day: '#8a8e90', dusk: '#7a5a4a', night: '#2a2a3a', dawn: '#4a5260' }[ph.mood] || '#6a6a6a';
      px.rect(g, 0, 0, 72, 72, bg);
      const rig = t && t.rig ? t.rig : (ph.subject && CAST[ph.subject] ? rigOf(ph.subject) : null);
      if (rig && ph.stars >= 0 && ph.subject) rig.drawPortrait(g, 4, 4, 64, { zoom: .95, turn: Math.abs(ph.turn) > .6 ? Math.sign(ph.turn) : ph.turn, bg });
      if (!ph.tags.includes('focus')) { const im = g.getImageData(0, 0, 72, 72), d = im.data, c = new Uint8ClampedArray(d); for (let y = 1; y < 71; y++) for (let x = 1; x < 71; x++) for (let k = 0; k < 3; k++) { const i = (y * 72 + x) * 4 + k; d[i] = (c[i] * 2 + c[i - 4] + c[i + 4] + c[i - 288] + c[i + 288]) / 6; } g.putImageData(im, 0, 0); }
      const r = E.rng(hashStr(ph.id) * 1e6); for (let i = 0; i < 300; i++) px.dot(g, Math.floor(r() * 72), Math.floor(r() * 72), r() < .5 ? '#000000' : '#ffffff');
      E.font.text(g, '10 14 \'04 ' + (ph.clock || ''), 70, 62, '#ff9a2a', { align: 'right', font: 'tiny', outline: false });
      return (PHOTO_IMG[ph.id] = cv.toDataURL());
    } catch (e) { return null; }
  },
  /** draw the reticle, focus ring, read meter and target name (overlay) */
  draw(r, cam, cop, opts = {}) {
    if (!cam.watching || !cam.aim) return;
    const rs = cam.retScr || r.w(cam.aim.x, cam.aim.y, 22); cam.retDrawn = rs;
    r.overlay(g => {
      const [x, y] = [Math.round(rs[0]), Math.round(rs[1])], t = cam.target, rad = Math.round(14 - cam.focusT / .4 * 8), col = t ? (cam.focusT >= .38 ? '#7aff8a' : '#ffd84a') : '#e8e4dc';
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { px.line(g, x + a * rad, y + b * rad, x + a * (rad - 4), y + b * rad, col); px.line(g, x + a * rad, y + b * rad, x + a * rad, y + b * (rad - 4), col); }
      px.dot(g, x, y, col);
      // letterbox and the film count make it feel like a viewfinder
      px.blend(g, .35, 'normal', () => { px.rect(g, 0, 0, r.W, 14, '#000'); px.rect(g, 0, r.H - 14, r.W, 14, '#000'); });
      if (cam.flash > 0) { px.rect(g, 0, 0, r.W, 2, '#fff'); px.rect(g, 0, r.H - 2, r.W, 2, '#fff'); px.rect(g, 0, 0, 2, r.H, '#fff'); px.rect(g, r.W - 2, 0, 2, r.H, '#fff'); }
      if (t) {
        const known = t.person && (hasFact('face:' + t.person) || hasFact('name:' + t.person)), nm = known ? nameOf(t.person) : t.person || t.role ? 'UNKNOWN' : 'CIVILIAN', role = t.person && STATE.facts.find(f => f.startsWith('obs:' + t.person + ':'));
        E.font.text(g, nm + (role ? ' · ' + ROLE_TAG[role.split(':')[2]] : ''), x + 18, y - 10, '#ffffff', { shadow: '#000', outline: false });
        if (t.act && ACTS.includes(t.act)) E.font.text(g, 'IN THE ACT', x + 18, y, '#ff7a5a', { shadow: '#000', outline: false });
        if (cam.readT > 0 && cam.readT < 3) { E.ui.bar(g, x + 18, y + 10, 40, 3, cam.readT / 3, '#ffb347'); E.font.text(g, 'READING', x + 62, y + 8, '#ffb347', { font: 'tiny', outline: false }); }
        const d = dist(cop, t); if (d > cam.range) E.font.text(g, 'OUT OF RANGE', x + 18, y + 16, '#ff5a4a', { shadow: '#000', outline: false });
      }
      E.font.text(g, 'FILM ' + cam.film, 8, r.H - 11, '#ffd84a', { outline: false });
      if (cop.burned) E.font.text(g, 'MADE: walk it off', r.W / 2, 3, '#ff5a4a', { align: 'center', outline: false });
    });
  }
};
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
