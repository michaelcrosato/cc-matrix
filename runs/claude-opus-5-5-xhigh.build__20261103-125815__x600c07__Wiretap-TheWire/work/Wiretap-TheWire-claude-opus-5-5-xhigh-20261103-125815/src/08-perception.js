/* 08-perception: getting "made". One E.Suspicion per (observer, police) pair. What raises it is behaviour, not presence:
   E.Suspicion's level rises with exposure x nearness, so the exposure handed to it is (seen x behaviour - BASE): a body
   simply walking by (behaviour 1) barely registers, a stare through a long lens (2.2) makes you in about four seconds.
   Tuning (Detective, 60 units): stare 3.4 s · walk past never · stand uncovered at 100: noticed 3.8 s, made 12 s ·
   blending: never · watching someone else from 120 while a lookout sees you: about 14 s. */
const PERC = { rise: .25, decay: .3, notice: .3, search: .65, alert: 1, forget: 6, BASE: .8 };
const Perception = {
  observers: [], police: [], on: true, lit: [],
  setup(observers, police) { this.observers = observers; this.police = police; this.on = true; },
  mind(o, p) { return o.minds[p.id] || (o.minds[p.id] = new E.Suspicion({ rise: PERC.rise, decay: PERC.decay, notice: PERC.notice, search: PERC.search, alert: PERC.alert, forget: PERC.forget })); },
  /** how a policeman is behaving in an observer's eyes (§5.2) */
  behaviour(o, p) {
    let b = 1;
    if (p.watching && p.aimAt && Math.abs(angDiff(angTo(p, o), Math.atan2(p.aimAt.y - p.y, p.aimAt.x - p.x))) < .17 && dist2(p.aimAt, o) < 60) b = 2.2;
    else if (p.watching) b = 1.5;
    else if (p.still > 2 && !p.inCover) b = 1.6;
    if (p.loiter) b = Math.max(b, p.loiter);
    if (p.sprinting) b = Math.max(b, 1.4); if (p.crouch) b = Math.max(b, 1.3);
    if (p.inCover) b *= .6; if (p.blending) b *= .35; if (p.inCar) b *= .3;
    if (o.knows.has(p.id)) b *= 1.5;
    if (p.tooClose && p.tooClose(o)) b *= 1.8;
    return b;
  },
  isLit(p) { return World.dark && World.lamps.some(([x, y]) => Math.abs(x - p.x) < 40 && Math.abs(y - p.y) < 40 && Math.hypot(x - p.x, y - p.y) < 40); },
  tick(dt) {
    if (!this.on) return;
    const night = World.dark;
    for (const p of this.police) {
      if (p.hidden && !p.inCar) continue;
      const light = this.isLit(p) ? 1.1 : night ? .7 : 1, base = PERC.BASE;
      for (const o of this.observers) {
        if (o.hidden || o.down > .5 || o.blind) continue;
        const m = this.mind(o, p);
        let seen = E.sees(o, p, { map: World.cur || World.map, range: o.range, fov: o.fov, facing: o.facing });
        let e = 0;
        if (seen.seen && seen.exposure > 0) e = Math.max(0, seen.exposure * this.behaviour(o, p) - base) * light * DIFF.rise * (p.burnedUntil > game.time ? 1.4 : 1) * (o.sharp || 1);
        if (o.reflect && !seen.seen) { const back = E.sees(o, p, { map: World.cur || World.map, range: 90, fov: 1.2, facing: o.facing + Math.PI }); if (back.seen) { seen = back; e = Math.max(0, back.exposure * this.behaviour(o, p) * .6 - base * .6); } }   // a shop window's reflection
        if (p.immune) e = 0;
        const st = m.update(dt, e > 0 ? Object.assign({}, seen, { exposure: e }) : { seen: false, exposure: 0 }, p);
        if (!m.changed) continue;
        if (st === 'notice') { o.faceGoal = angTo(o, p); o.quietT = 2; bus.emit('notice', { o, p }); game.after(2.5, () => { o.faceGoal = null; }); }
        else if (st === 'search') {
          Snd.whistle(); o.faceGoal = angTo(o, p); bus.emit('search', { o, p });
          const n = this.observers.filter(x => x !== o && !x.hidden && dist2(x, o) < 110).sort((a, b) => dist2(a, o) - dist2(b, o))[0];
          if (n) { const nm = this.mind(n, p); nm.level = Math.max(nm.level, PERC.notice + .02); n.faceGoal = angTo(n, p); game.after(3, () => { n.faceGoal = null; }); }
        } else if (st === 'alert') this.made(o, p);
        else if (st === 'calm') o.faceGoal = null;
      }
    }
  },
  made(o, p) {
    for (const x of this.observers) if (dist2(x, o) < 120) x.knows.add(p.id);
    o.knows.add(p.id); p.burnedUntil = game.time + 60; p.madeAt = game.time;
    bus.emit('made', { o, p });
  },
  /** 0..1: the most suspicious anyone is of p */
  heat(p) { let h = 0; for (const o of this.observers) { const m = o.minds[p.id]; if (m && !o.hidden) h = Math.max(h, m.level); } return Math.min(1, h); },
  worst(p) { const order = ['calm', 'notice', 'search', 'alert']; let w = 0; for (const o of this.observers) { const m = o.minds[p.id]; if (m && !o.hidden) w = Math.max(w, order.indexOf(m.state)); } return order[w]; },
  calm(p) { for (const o of this.observers) { const m = o.minds[p.id]; if (m) m.reset(); } },
  /** cones for the watchers near p, and ? / ! over their heads */
  draw(r, p) {
    if (!p) return; const MOOD = { calm: '#ffe080', notice: '#ffc040', search: '#ff9a40', alert: '#ff4a3a' };
    for (const o of this.observers) {
      if (o.hidden || o.down > .5 || dist2(o, p) > 230) continue;
      const m = o.minds[p.id], st = m ? m.state : 'calm';
      if (game.settings.cones && o.watcher) r.sightCone(o, { map: World.cur || World.map, range: o.range, fov: o.fov, facing: o.facing, color: MOOD[st], alpha: st === 'calm' ? .16 : .3 });
    }
    r.overlay(g => {
      for (const o of this.observers) {
        if (o.hidden || o.down > .5 || dist2(o, p) > 260) continue;
        const m = o.minds[p.id]; if (!m) continue; const st = m.state; if (st === 'calm' && !(game.settings.difficulty === 'rookie' && o.watcher)) continue;
        const [sx, sy] = r.w(o.x, o.y, o.z + 48), lab = st === 'alert' ? '!' : st === 'search' ? '??' : st === 'notice' ? '?' : '·';
        E.font.text(g, lab, Math.round(sx), Math.round(sy) - 10, MOOD[st], { align: 'center', shadow: '#000' });
        E.ui.bar(g, Math.round(sx) - 6, Math.round(sy), 12, 2, Math.min(1, m.level), MOOD[st]);
      }
    });
  }
};
