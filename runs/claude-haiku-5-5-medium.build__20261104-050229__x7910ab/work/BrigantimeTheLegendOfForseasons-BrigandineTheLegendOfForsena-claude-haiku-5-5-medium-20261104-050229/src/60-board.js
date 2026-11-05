// The board: one battle as the player sees it. It owns the tilted view, the rigs of every unit, the walks and strikes, the
// damage and bell banners, and a queue that plays the sim's events in order (the state is already final when an event is
// played; the queue only decides what is shown when). The battle, attract and hub scenes all draw through it.
(() => {
  const H = G, px = E.px;

  H.Board = class Board {
    constructor(game, sim, o = {}) {
      this.game = game; this.sim = sim; this.o = o;
      this.view = new E.View('board', 'Board', 0, H.BOARD_TILT, 1, 1);
      this.rigs = new Map(); this.vis = new Map(); this.anim = new Map();
      this.queue = []; this.busy = 0; this.t = 0; this.timers = []; this.walk = null;
      this.banner = null; this.active = null; this.over = null; this.lastBell = 0;
      this.centre = H.boardCentre(sim);
      for (const u of sim.s.units) {
        const w = H.hexWorld(u.q, u.r, H.HEX);
        this.vis.set(u.uid, { x: w.x, y: w.y, facing: u.side === 0 ? 0 : Math.PI });
      }
      this.layout();
    }
    // the board's scale: as large as the screen allows, with room for the panels at the top and bottom
    layout() {
      const W = this.game.W || 427, Hh = this.game.H || 240;
      const s = Math.min(W * .9 / this.centre.w, Hh * .8 / (this.centre.h * Math.sin(H.BOARD_TILT * Math.PI / 180)));
      this.view.set(0, H.BOARD_TILT, Math.max(.4, s));
      return this.view.scale || s;
    }
    enter() { this.game.setView(this.view); this.game.focus(this.centre.x, this.centre.y, 0); }

    unit(uid) { return this.sim.byId(uid); }
    rigOf(uid) {
      if (!this.rigs.has(uid)) this.rigs.set(uid, H.rigFor(this.unit(uid)));
      return this.rigs.get(uid);
    }
    // where a unit stands on the board right now (its walk, when it has one)
    at(uid) { return this.vis.get(uid) || { x: 0, y: 0, facing: 0 }; }

    // ---- the event queue ----
    push(events) { for (const e of events) if (e.type !== 'refused') this.queue.push(e); }
    later(s, fn) { this.timers.push({ at: this.t + s, fn }); }
    say(text, s = 1.1, color = '#fff4c8', sub = '') { this.banner = { text, sub, color, t: 0, dur: s }; }

    start(e) {
      const g = this.game, u = e.uid ? this.unit(e.uid) : null;
      switch (e.type) {
        case 'move': {
          const pts = e.path.map(k => { const p = H.parseKey(k), w = H.hexWorld(p.q, p.r, H.HEX); return { x: w.x, y: w.y }; });
          const seg = .14;
          this.walk = { uid: e.uid, pts, t: 0, seg };
          this.busy = seg * (pts.length - 1) + .05;
          H.sfx(g, 'move');
          return;
        }
        case 'attack': {
          H.sfx(g, this.swingSound(u, e));
          this.anim.set(e.from, { kind: 'strike', t: 0, dur: .62, n: u ? u.side * 7 + (this.t | 0) : 0 });
          this.later(.3, () => this.impact(e));
          this.busy = .7 + (e.counter ? .55 : 0);
          if (e.counter) this.later(.62 + .05, () => this.anim.set(e.to, { kind: 'strike', t: 0, dur: .5, n: 3 }));
          if (e.counter) this.later(.62 + .3, () => this.counterImpact(e));
          return;
        }
        case 'skill': {
          H.sfx(g, H.skillSound(e.skill));
          const sk = H.get('skill', e.skill);
          this.say(sk.name, .7, '#ffe9a8', u ? u.name : '');
          this.anim.set(e.uid, { kind: 'cast', t: 0, dur: .6 });
          H.sfx(g, 'skill');
          const tgt = e.target && e.target !== e.uid ? this.unit(e.target) : null;
          if (tgt) { const p = this.at(tgt.uid); g.particles.sparks(p.x, p.y, 16, 8, 0); }
          this.busy = .55; return;
        }
        case 'heal': {
          H.sfx(g, 'heal');
          const p = this.at(e.uid);
          g.particles.text(p.x, p.y, 26, '+' + e.amount, '#9af0a0', { scale: 2, bounce: true });
          this.busy = .4; return;
        }
        case 'down': {
          H.sfx(g, this.unit(e.uid) && this.unit(e.uid).knight ? 'ko_knight' : 'ko_monster');
          const p = this.at(e.uid);
          this.anim.set(e.uid, { kind: 'die', t: 0, dur: .7 });
          g.particles.explosion(p.x, p.y, 8, 1);
          H.sfx(g, 'hit');
          this.busy = .6; return;
        }
        case 'wait': this.busy = .08; return;
        case 'status': H.sfx(g, H.statusSound(e.status)); this.busy = .12; return;
        case 'captured': H.sfx(g, 'capture'); this.busy = .3; return;
        case 'stunned': H.sfx(g, 'stop'); this.busy = .2; return;
        case 'poison': H.sfx(g, 'poison'); this.busy = .3; return;
        case 'dial': H.sfx(g, 'timer_tick'); this.busy = .2; return;
        case 'gate': H.sfx(g, 'castle_taken'); this.busy = .5; return;
        case 'retreat': H.sfx(g, 'debuff'); this.busy = .5; return;
        case 'rebirth': H.sfx(g, 'heal'); this.busy = .5; return;
        case 'bell': {
          g.audio.sfx('bell_toll', { pitch: 1 + e.n * .02 });
          this.lastBell = e.n;
          this.say('BELL ' + e.n, 1.1, '#ffe9a8', H.get('season', e.season).name);
          H.sfx(g, 'bell');
          this.busy = 1.0; return;
        }
        case 'terrain': {
          const { q, r } = H.parseKey(e.key), w = H.hexWorld(q, r, H.HEX);
          g.particles.dust(w.x, w.y, 2, 6);
          this.busy = .2; return;
        }
        case 'burn': {
          H.sfx(g, 'burn');
          const p = this.at(e.uid);
          g.particles.text(p.x, p.y, 26, '-' + e.dmg, '#ff9a5a', { scale: 2, bounce: true });
          H.sfx(g, 'burn');
          this.busy = .35; return;
        }
        case 'turn': this.active = e.uid; this.busy = .04; return;
        case 'over': this.over = e; this.busy = .3; return;
        default: this.busy = .02;
      }
    }
    // the sound of a swing: a monster's kind decides its call; a knight's weapon, or a bow at range
    swingSound(u, e) {
      if (!u) return 'slash_whoosh';
      const t = this.unit(e.to);
      if (u.kind === 'monster') return H.get('species', u.species).look.kind === 'beast' ? 'roar_small' : H.get('species', u.species).look.wings ? 'flap' : 'growl';
      if (t && H.hexDist(u, t) > 1) return 'bow_twang';
      return 'slash_whoosh';
    }
    impact(e) {
      const t = this.unit(e.to), p = this.at(e.to), g = this.game;
      if (!t) return;
      H.sfx(g, !e.hit ? 'miss' : e.dmg >= 12 ? 'crit' : (this.unit(e.from) && H.hexDist(this.unit(e.from), t) > 1 ? 'arrow_hit' : 'sword_clang'));
      if (e.hit) {
        g.hitFx(p.x, p.y, 18, { power: e.killed ? 1.4 : 1, damage: e.dmg, textScale: 2, textZ: 30 });
        if (e.skill) g.particles.sparks(p.x, p.y, 18, 10, 0);
      } else {
        g.particles.text(p.x, p.y, 30, 'miss', '#dcd6ec', { scale: 1, bounce: false });
      }
      this.anim.set(e.to, { kind: e.killed ? 'die' : 'hurt', t: 0, dur: .5 });
    }
    counterImpact(e) {
      const c = e.counter, a = this.at(e.from), g = this.game;
      if (!c) return;
      if (c.hit) g.hitFx(a.x, a.y, 18, { power: 1, damage: c.dmg, textScale: 2, textZ: 30 });
      else g.particles.text(a.x, a.y, 30, 'miss', '#dcd6ec', { scale: 1, bounce: false });
      this.anim.set(e.from, { kind: c.killed ? 'die' : 'hurt', t: 0, dur: .4 });
    }

    update(dt) {
      this.t += dt;
      for (const tm of this.timers) if (!tm.dead && this.t >= tm.at) { tm.dead = true; tm.fn(); }
      this.timers = this.timers.filter(tm => !tm.dead);
      if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
      // walks: one unit at a time, a hex per segment
      let moving = null;
      if (this.walk) {
        const w = this.walk, v = this.vis.get(w.uid);
        w.t += dt;
        const i = Math.min(w.pts.length - 2, Math.floor(w.t / w.seg)), f = Math.min(1, (w.t - i * w.seg) / w.seg);
        const a = w.pts[i], b = w.pts[i + 1];
        if (a && b) {
          v.x = a.x + (b.x - a.x) * f; v.y = a.y + (b.y - a.y) * f;
          v.vx = (b.x - a.x) / w.seg; v.vy = (b.y - a.y) / w.seg; v.facing = Math.atan2(v.vy, v.vx);
          moving = w.uid;
        }
        if (w.t >= w.seg * (w.pts.length - 1)) {
          const last = w.pts[w.pts.length - 1]; Object.assign(v, { x: last.x, y: last.y, vx: 0, vy: 0 });
          this.walk = null;
        }
      }
      // strikes, hurts, deaths, casts
      for (const [uid, a] of this.anim) {
        a.t += dt;
        if (a.t >= a.dur && a.kind !== 'die') this.anim.delete(uid);
      }
      // the queue: the next event starts when the last one's time is up
      if (this.busy > 0) this.busy -= dt;
      else if (this.queue.length) this.start(this.queue.shift());
      // every rig is posed from its unit and its animation, every step
      for (const u of this.sim.s.units) {
        const v = this.vis.get(u.uid), R = this.rigOf(u.uid), a = this.anim.get(u.uid);
        const enemy = this.nearestEnemy(u);
        if (enemy && (!this.walk || this.walk.uid !== u.uid)) v.facing = Math.atan2(enemy.y - v.y, enemy.x - v.x);
        const dying = a && a.kind === 'die';
        if (R.kind === 'humanoid') {
          const st = { x: v.x, y: v.y, z: 0, vx: v.vx || 0, vy: v.vy || 0, facing: v.facing, stance: 'ready' };
          if (a && a.kind === 'strike') st.attack = E.move(H.strikeMove(u, a.n || 0), Math.min(1, a.t / a.dur));
          if (a && a.kind === 'cast') st.pose = 'cast';
          if (a && a.kind === 'hurt') st.hurt = true;
          if (u.dead || dying) { st.pose = 'down'; st.stance = undefined; }
          R.rig.update(dt, st);
        } else {
          const strike = a && a.kind === 'strike' ? Math.sin(Math.min(1, a.t / a.dur) * Math.PI) : 0;
          R.rig.update(dt, { squash: -strike * .3, look: [Math.cos(v.facing) * .4, Math.sin(v.facing) * .4], facing: v.facing, walk: moving === u.uid ? 1 : 0, flap: u.dead ? 0 : 1 });
        }
      }
    }
    nearestEnemy(u) {
      let best = null, bd = Infinity;
      for (const t of this.sim.s.units) {
        if (t.dead || t.side === u.side) continue;
        const v = this.vis.get(t.uid), d = Math.hypot(v.x - this.vis.get(u.uid).x, v.y - this.vis.get(u.uid).y);
        if (d < bd) { bd = d; best = v; }
      }
      return best;
    }

    // draws the board, its units, their names and bars, and the banner. o: { reach, strike, cursor, plan, focus }
    draw(r, o = {}) {
      H.drawBoard(r, this.sim, { reach: o.reach, strike: o.strike, cursor: o.cursor, plan: o.plan });
      if (this.sim.s.dials) H.drawDials(r, this.sim);
      const order = this.sim.s.units.filter(u => !u.dead || this.anim.has(u.uid)).sort((a, b) => this.at(a.uid).y - this.at(b.uid).y);
      for (const u of order) {
        const v = this.at(u.uid), R = this.rigOf(u.uid);
        const shown = !u.dead || (this.anim.get(u.uid) && this.anim.get(u.uid).kind === 'die');
        if (!shown) continue;
        r.shadow(v.x, v.y, 6, .32, undefined, 0);
        r.actor(v.x, v.y, 0, (g, ox, oy) => R.rig.draw(g, ox, oy, r.view), { flash: u.side === 1 ? '#ff7a6a' : undefined, flashMix: u.side === 1 ? .12 : .0 });
      }
      if (this.active && this.unit(this.active) && !this.unit(this.active).dead) {
        const v = this.at(this.active);
        r.decal(g => r.groundRing(v.x, v.y, 11, '#ffe9a8', .85, 0));
      }
      // bars above the units: hit points, and the names of the units in focus
      const focus = o.focus || [];
      r.overlay(g => {
        for (const u of this.sim.s.units) {
          if (u.dead) continue;
          const p = r.w(this.at(u.uid).x, this.at(u.uid).y, 34);
          const bw = u.knight ? 18 : 12, frac = u.hp / u.maxHp;
          px.rect(g, Math.round(p[0] - bw / 2) - 1, Math.round(p[1]) - 1, bw + 2, 4, '#0c0a14');
          px.rect(g, Math.round(p[0] - bw / 2), Math.round(p[1]), Math.max(1, Math.round(bw * frac)), 2, frac > .5 ? '#7ad06a' : frac > .25 ? '#e8b050' : '#e84a3a');
          if (focus.includes(u.uid)) E.font.text(g, u.name, Math.round(p[0]), Math.round(p[1]) - 9, '#fff4c8', { align: 'center', shadow: '#000' });
        }
      });
      if (this.banner) {
        const b = this.banner, k = Math.min(1, b.t * 4) * Math.min(1, (b.dur - b.t) * 4);
        r.overlay(g => {
          const y = Math.round(r.H * .3);
          E.font.title(g, b.text, r.W / 2, y, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center', alpha: k });
          if (b.sub) E.font.text(g, b.sub, r.W / 2, y + 18, '#e8e0ff', { align: 'center', shadow: '#000' });
        });
      }
    }
  };
})();
