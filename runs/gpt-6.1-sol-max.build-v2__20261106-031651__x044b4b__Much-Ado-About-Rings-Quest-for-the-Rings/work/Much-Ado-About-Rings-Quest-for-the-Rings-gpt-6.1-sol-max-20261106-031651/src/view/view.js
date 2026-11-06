(function (G) {
  'use strict';
  const M = G.MA,
    E = G.My3D2dge,
    P = E.px;
  class View {
    constructor(game) {
      this.game = game;
      this.rigs = new Map();
      this.positions = new Map();
      this.passUntil = new Map();
      this.remote = false;
      this.master = M.masterRig();
      this.keeper = M.heroRig('wizard', 1.1);
      this.titleHeroes = [M.heroRig('warrior', 1.55), M.heroRig('wizard', 1.55)];
      this.dragon = new M.DragonRig();
      this.room = '';
      this.epoch = -1;
      this.lastEvent = null;
      this.fx = [];
      this.overlay = false;
    }
    rig(id, make) {
      if (!this.rigs.has(id)) this.rigs.set(id, make());
      return this.rigs.get(id);
    }
    visual(entity, key) {
      const position = this.remote && this.positions.get(key);
      return position ? { ...entity, x: position.x, y: position.y } : entity;
    }
    interpolate(entity, key, dt) {
      const old = this.positions.get(key);
      if (!old || !this.remote || Math.hypot(old.x - entity.x, old.y - entity.y) > 100)
        this.positions.set(key, { x: entity.x, y: entity.y });
      else {
        const k = 1 - Math.exp(-dt * 19);
        old.x += (entity.x - old.x) * k;
        old.y += (entity.y - old.y) * k;
      }
      return this.visual(entity, key);
    }
    update(w, dt, title = false) {
      if (!title && this.partyName !== w.classes.join('|')) {
        this.partyName = w.classes.join('|');
        this.titleHeroes = w.classes.map((id) => M.heroRig(id, 1.55));
      }
      this.master.update(dt, { x: 0, y: 0, z: 0, facing: 1.4, pose: 'cast', expr: 'angry' });
      if (w.room.rescue)
        this.keeper.update(dt, {
          x: w.room.cache.x,
          y: w.room.cache.y,
          z: 0,
          down: w.cacheClaimed ? 0 : 1,
          pose: w.cacheClaimed ? 'cheer' : 'down',
          facing: 1.4,
        });
      for (const [i, rig] of this.titleHeroes.entries())
        rig.update(dt, {
          x: i * 30,
          y: 0,
          z: 0,
          facing: i === 0 ? 0.4 : 2.7,
          pose: title ? (Math.sin(this.game.time * 0.4) > 0.7 ? 'guard' : null) : 'cheer',
        });
      if (this.epoch !== w.epoch) {
        this.epoch = w.epoch;
        this.rigs.clear();
        this.positions.clear();
        this.passUntil.clear();
        this.fx = [];
        this.lastEvent = null;
      }
      for (const source of w.heroes) {
        const h = this.interpolate(source, `h${source.id}`, dt);
        const rig = this.rig(`h${h.id}:${h.classId}`, () => M.heroRig(h.classId));
        const pose = h.down
          ? 'down'
          : (this.passUntil.get(h.id) || 0) > w.tick
            ? 'ringPass'
            : h.context && h.cmd.interact && ['revive', 'bind', 'cache'].includes(h.context.type)
              ? 'binding'
              : h.powerTime > 0
                ? { warrior: 'guard', wizard: 'cast', phantom: 'stonewalk', changeling: 'mirrorcloak' }[
                    h.classId
                  ]
                : w.ring && w.ring.carrier === h.id
                  ? 'ringCarry'
                  : null;
        rig.update(dt, {
          x: h.x,
          y: h.y,
          z: h.z || 0,
          vx: h.vx,
          vy: h.vy,
          facing: h.facing,
          hurt: h.hurt < 0.4 && h.hurt > 0,
          dash: h.dodgeTime > 0,
          down: h.down ? 1 : 0,
          pose,
          attack: h.attack && h.attack.state,
          expr: h.down ? 'wince' : null,
        });
      }
      for (const source of w.enemies) {
        const e = this.interpolate(source, source.id, dt);
        if (e.dead) continue;
        if (e.kind === 'dragon') this.dragon.update(dt, e);
        else {
          const rig = this.rig(e.id, () =>
            e.kind === 'echo'
              ? M.heroRig(e.copy || 'warrior')
              : M.enemyRig(e.kind) || new M.NightmareRig(e.kind),
          );
          rig.update(dt, {
            x: e.x,
            y: e.y,
            z: e.z,
            vx: e.vx,
            vy: e.vy,
            facing: e.facing,
            phase: e.phase,
            pose: e.stun > 0 ? 'kneel' : e.phase === 'wind' ? 'cast' : null,
            hurt: e.hurt > 0,
            attack: e.attack && e.attack.state,
          });
        }
      }
      const events = w.events;
      const index = this.lastEvent ? events.findIndex((e) => e.id === this.lastEvent) : events.length - 1;
      for (const ev of events.slice(Math.max(0, index + 1)))
        if (
          [
            'hit',
            'stun',
            'hurt',
            'pickup',
            'pass',
            'ring-return',
            'safe-shift',
            'bind',
            'revive',
            'primary',
            'power',
            'companion-return',
          ].includes(ev.type)
        ) {
          if (ev.type === 'pass') {
            this.passUntil.set(ev.from, ev.tick + 48);
            this.passUntil.set(ev.to, ev.tick + 48);
          }
          const h = w.heroes[ev.hero || 0];
          this.fx.push({
            ...ev,
            x: ev.x ?? h.x,
            y: ev.y ?? h.y,
            life: ev.type === 'pickup' || ev.type === 'bind' ? 1.8 : 0.6,
            max: ev.type === 'pickup' || ev.type === 'bind' ? 1.8 : 0.6,
          });
        }
      this.lastEvent = events.length ? events[events.length - 1].id : null;
      this.fx.forEach((f) => {
        f.life -= dt;
      });
      this.fx = this.fx.filter((f) => f.life > 0);
    }
    camera(w) {
      const game = this.game,
        active = w.heroes.filter((h) => !h.down),
        heroes = active.length ? active : w.heroes;
      const x = heroes.reduce((n, h) => n + h.x, 0) / heroes.length,
        y = heroes.reduce((n, h) => n + h.y, 0) / heroes.length;
      game.cam.bounds = (v) => w.map.bounds(v);
      game.cam.smooth = 0.12;
      if (w.roomId === 'final') {
        const dragon = w.enemies.find((e) => e.kind === 'dragon');
        if (Math.abs(game.zoom - 0.5) > 0.015) game.setZoom(0.5);
        game.cam.offset = [0, -10];
        game.focus(x, (y + (dragon?.y || 88)) / 2 - 20, 10);
        return;
      }
      game.cam.offset = [0, 15];
      const distance = M.distance(w.heroes[0], w.heroes[1]);
      const span = Math.max(240, distance * 1.8 + 95);
      const zoom = Math.max(0.58, Math.min(1, game.W / span));
      if (Math.abs(game.zoom - zoom) > 0.015) game.setZoom(zoom);
      game.focus(x, y, 10);
    }
    draw(w, r, settings) {
      const game = this.game,
        time = w.roomTime;
      r.sky(['#121825', '#1c2635', '#263246']);
      game.lights.enabled = true;
      game.lights.ambient = 0.65;
      game.lights.darkness = 0.45;
      game.lights.tint = '#182038';
      w.map.drawFloor(r);
      // Concealed ribs always have proximity and contact outlines; the collision map is never changed by drawing.
      if (w.room.family === 'crystal' || w.room.hiddenWalls?.length) {
        const reveal = settings.wallOutlines || w.reveal > 0 || time % w.room.revealPeriod < 1.8;
        for (let y = 1; y < w.room.h - 1; y++)
          for (let x = 1; x < w.room.w - 1; x++)
            if (w.room.rows[y][x] === 'C') {
              const wx = x * 16 + 8,
                wy = y * 16 + 8,
                near = w.heroes.some((h) => Math.hypot(h.x - wx, h.y - wy) < 52);
              if (reveal || near) {
                r.groundRing(wx, wy, 7, '#8bcbd2', reveal ? 0.55 : 0.2);
                if (reveal) r.shape('crystalRib', wx, wy, 0, { scale: 0.7, shadow: false });
              } else r.groundDisc(wx, wy, 1.4, '#7aafb9', 0.5);
            }
        // Only exterior walls are drawn normally, with the original collision grid left intact.
        this.crystalExterior(w).queueWalls(r);
      } else w.map.queueWalls(r);
      for (const lane of w.room.hazards) {
        const state = w.hazardState(lane);
        if (state === 'safe' && !this.overlay) continue;
        for (const [x, y] of lane.cells) {
          const wx = x * 16 + 8,
            wy = y * 16 + 8,
            color = w.wardAt(wx, wy) ? '#9fe7f2' : state === 'active' ? '#ffc18a' : '#e9a277';
          r.groundDisc(wx, wy, 10, color, state === 'active' ? 0.7 : 0.22);
          r.queue(
            wx,
            wy,
            0,
            (g) => {
              const a = r.w(wx - 6, wy - 6, 1),
                b = r.w(wx + 6, wy + 6, 1);
              P.line(g, a[0], a[1], b[0], b[1], color);
              if (state === 'active') {
                const p = r.w(wx, wy, 3);
                const h = 9 + Math.sin(time * 16 + x * 2) * 4;
                P.poly(
                  g,
                  [
                    [p[0] - 4, p[1]],
                    [p[0] - 2, p[1] - h],
                    [p[0] + 1, p[1] - h * 0.6],
                    [p[0] + 4, p[1] - h - 5],
                    [p[0] + 5, p[1]],
                  ],
                  '#ed9962',
                );
                P.line(g, p[0], p[1], p[0] + 1, p[1] - h * 0.7, '#ffe5a9', 2);
              }
            },
            { emissive: true },
          );
        }
      }
      if (w.room.shifts.length && w.shiftTimer > 6)
        for (const s of w.room.shifts)
          for (const [x, y] of w.shiftState ? s.a : s.b) {
            r.groundRing(x * 16 + 8, y * 16 + 8, 7, '#d4c8ff', 0.8);
            r.textAt(x * 16 + 8, y * 16 + 8, 2, '>', '#e8d7ff');
          }
      for (const p of w.room.props) {
        if (['furnace', 'clock'].includes(p.kind)) r.shape(p.kind, p.x, p.y, p.z, { light: true, scale: 1 });
        else if (p.kind === 'crystal') {
          r.shape('crystalRib', p.x, p.y, p.z);
          game.lights.add(p.x, p.y, 20, 55, 0.65, { color: '#7fd5db' });
        } else
          r.prop(p.kind, p.x, p.y, p.z, {
            size: 1.1,
            light: p.kind === 'brazier',
            color: p.kind === 'banner' ? '#93566b' : undefined,
          });
      }
      // Engraved approach stones make the exit legible without relying only on its gold color.
      const exit = w.room.exit;
      r.groundRing(exit.x, exit.y, 20, '#e5bf76', 0.45);
      r.shape('escapeArch', exit.x, exit.y - 6, 0);
      game.lights.add(exit.x, exit.y, 25, 65, 0.8, { color: '#f3d390' });
      if (w.room.cache) {
        r.groundRing(w.room.cache.x, w.room.cache.y, 17, '#b1e2c7', 0.55);
        if (!w.cacheClaimed)
          r.marker(w.room.cache.x, w.room.cache.y, 15, {
            label: w.room.rescue ? 'KEEPER' : 'MOONWELL',
            color: '#b8e6c9',
          });
      }
      if (w.room.rescue)
        r.actor(w.room.cache.x, w.room.cache.y, 0, (g, x, y) => this.keeper.draw(g, x, y, r.view), {
          xray: true,
        });
      if (w.roomId === 'final')
        w.room.stations.forEach((s, i) => {
          r.shape('sealStation', s.x, s.y, 0, { mats: { r: w.bound[i] ? 'runeLight' : 'moonGlass' } });
          r.groundRing(s.x, s.y, 20, w.bound[i] ? '#f1d28a' : M.SITES[i].color, 0.6);
          r.textAt(
            s.x,
            s.y,
            22,
            w.bound[i] ? 'BOUND' : M.SITES[i].rune.toUpperCase(),
            w.bound[i] ? '#f5d995' : '#d9d6de',
          );
          if (w.bound[i]) {
            const dragon = w.enemies.find((e) => e.kind === 'dragon');
            r.queue(
              s.x,
              s.y,
              4,
              (g) => {
                const a = r.w(s.x, s.y, 8),
                  b = r.w(dragon.x, dragon.y, 22);
                P.line(g, ...a, ...b, '#dab870');
              },
              { emissive: true },
            );
          }
        });
      for (const ward of w.wards) {
        r.groundDisc(ward.x, ward.y, ward.r, '#97cfe4', 0.13);
        r.groundRing(ward.x, ward.y, ward.r, '#c3eff5', 0.8);
        game.lights.add(ward.x, ward.y, 15, 65, 0.7, { color: '#93dae8' });
      }
      for (const lure of w.lures) {
        const rig = this.rigs.get(`h${lure.owner}:${w.heroes[lure.owner].classId}`);
        if (rig)
          r.actor(lure.x, lure.y, 0, (g, x, y) => rig.draw(g, x, y, r.view), {
            alpha: 0.4,
            flash: '#d9b5fa',
            flashMix: 0.6,
          });
        r.groundRing(lure.x, lure.y, 9, '#cba4ea', 0.7);
      }
      for (const source of w.enemies) {
        const e = this.visual(source, source.id);
        if (e.dead) continue;
        r.shadow(e.x, e.y, e.kind === 'dragon' ? 34 : 8, 0.38, '#151226');
        if (e.target && ['wind', 'active'].includes(e.phase)) {
          const rad = e.kind === 'dragon' ? 34 : e.kind === 'spider' || e.kind === 'nightmare' ? 17 : 15;
          r.groundDisc(e.target.x, e.target.y, rad, '#e69a78', 0.18);
          r.groundRing(e.target.x, e.target.y, rad, e.phase === 'wind' ? '#edb48e' : '#ffe1ac', 0.9);
          r.textAt(e.target.x, e.target.y, 2, e.phase === 'wind' ? '!' : 'X', '#ffe0ac');
          if (e.kind === 'dragon' && e.phase === 'wind') {
            const base = Math.atan2(e.target.y - e.y, e.target.x - e.x);
            for (const da of [-0.45, 0, 0.45]) {
              const end = { x: e.x + Math.cos(base + da) * 400, y: e.y + Math.sin(base + da) * 400 };
              r.queue(e.x, e.y, 0, (g) => {
                const a = r.w(e.x, e.y, 1),
                  b = r.w(end.x, end.y, 1);
                P.line(g, ...a, ...b, '#b78e73');
              });
            }
          }
        }
        const rig = e.kind === 'dragon' ? this.dragon : this.rigs.get(e.id);
        if (!rig) continue;
        r.actor(e.x, e.y, 0, (g, x, y) => rig.draw(g, x, y, r.view), {
          flash: e.kind === 'echo' ? '#ae81c6' : e.stun > 0 ? '#9bcdea' : e.hurt > 0 ? '#fff0cb' : undefined,
          flashMix: e.kind === 'echo' ? 0.65 : 0.45,
          alpha: e.kind === 'echo' ? 0.72 : 1,
          outline: settings.outlines ? '#ddb6a3' : undefined,
        });
        if (e.stun > 0) {
          r.textAt(e.x, e.y, 40, '* * *', '#bdebf3');
          r.groundRing(e.x, e.y, 10, '#add9ec', 0.7);
        }
        if (e.kind === 'echo') {
          r.textAt(e.x, e.y, 40, 'ECHO', '#e5b9f4');
          if (e.copy === 'phantom' && e.phase === 'active') r.groundRing(e.x, e.y, 35, '#cba4ea', 0.8);
          if (e.copy === 'changeling' && e.phase === 'active')
            r.actor(e.x + 18, e.y, 0, (g, x, y) => rig.draw(g, x, y, r.view), {
              alpha: 0.4,
              flash: '#bc95e2',
            });
        }
        if (e.kind === 'dragon' && e.phase === 'active' && e.target)
          r.queue(
            e.target.x,
            e.target.y,
            0,
            (g) => {
              const a = r.w(e.x, e.y, 35),
                b = r.w((e.breath || e.target).x, (e.breath || e.target).y, 2);
              P.line(g, ...a, ...b, '#e89669', 9);
              P.line(g, ...a, ...b, '#ffe0a1', 4);
            },
            { emissive: true },
          );
      }
      for (const source of w.heroes) {
        const h = this.visual(source, `h${source.id}`);
        const rig = this.rigs.get(`h${h.id}:${h.classId}`);
        if (!rig) continue;
        const color = h.id === 0 ? '#e9c683' : '#9ed7e3';
        r.shadow(h.x, h.y, 7, 0.35, '#191a2e');
        r.groundRing(h.x, h.y, 7, color, 0.6);
        const spectral = h.powerTime > 0 && ['phantom', 'changeling'].includes(h.classId);
        r.actor(h.x, h.y, h.z || 0, (g, x, y) => rig.draw(g, x, y, r.view), {
          xray: { color, outline: true },
          outline: settings.outlines ? color : undefined,
          alpha: spectral ? (h.powerTime < 0.65 ? 0.65 : 0.45) : 1,
          flash:
            h.hurt > 0.8 && h.hurt < 1.35
              ? '#fff0de'
              : spectral
                ? M.HEROES.find((v) => v.id === h.classId).color
                : undefined,
          flashMix: 0.25,
        });
        if (h.powerTime > 0)
          r.groundRing(
            h.x,
            h.y,
            h.classId === 'warrior' ? 12 : 9,
            M.HEROES.find((v) => v.id === h.classId).color,
            0.7,
          );
        if (h.classId === 'phantom' && h.powerTime > 0) {
          r.groundRing(h.safe.x, h.safe.y, 5, '#d5f6eb', 0.75);
          r.textAt(h.safe.x, h.safe.y, 2, '+', '#ddfff0');
        }
        if (h.down)
          r.textAt(h.x, h.y, 15, `REVIVE ${Math.round((h.revive / w.tuning.revive) * 100)}%`, '#f7c594');
        if (w.ring && w.ring.carrier === h.id) {
          r.shape('oathRing', h.x, h.y, 30 + Math.sin(time * 3) * 1.5, { scale: 0.7, facing: time * 0.25 });
          game.lights.add(h.x, h.y, 32, 65, 0.65, { color: '#f5cf7f' });
        }
      }
      if (w.ring && w.ring.carrier == null) {
        const ring = w.ring;
        r.groundRing(ring.x, ring.y, 13, '#e9c374', 0.5);
        r.shape('oathRing', ring.x, ring.y, 5 + Math.sin(time * 2) * 2, { facing: time * 0.4 });
        game.lights.add(ring.x, ring.y, 16, 75, 0.9, { color: '#f0c878' });
      }
      for (const b of w.projectiles)
        r.actor(
          b.x,
          b.y,
          b.z,
          (g, x, y) => {
            P.disc(g, x, y, 3, b.color);
            P.disc(g, x - 1, y - 1, 1, '#fff6d8');
          },
          { emissive: true },
        );
      for (const fx of this.fx) {
        const k = fx.life / fx.max,
          gold = ['pickup', 'bind', 'revive'].includes(fx.type),
          color = gold ? '#f8d796' : fx.type === 'hurt' ? '#eaa28c' : '#a5e0eb';
        r.groundRing(fx.x, fx.y, (1 - k) * (gold ? 60 : 28) + 5, color, k);
        for (let i = 0; i < (gold ? 12 : 5); i++) {
          const a = i * 2.4,
            rad = (1 - k) * 28;
          const pos = r.w(fx.x + Math.cos(a) * rad, fx.y + Math.sin(a) * rad, (1 - k) * 32);
          r.overlay((g) => P.disc(g, pos[0], pos[1], k * 1.5 + 0.3, color));
        }
      }
      if (this.overlay) this.drawDebug(w, r);
      const owned = w.heroes.find((h) => !h.ai) || w.heroes[0],
        goal = w.objectivePoint(owned);
      if (goal)
        r.marker(goal.x, goal.y, 6, {
          label:
            w.ring && w.ring.carrier == null
              ? 'RING'
              : w.roomId === 'final' && w.finalBeat !== 'escape'
                ? 'SEAL'
                : 'ARCH',
          color: '#e8d090',
        });
    }
    crystalExterior(w) {
      if (this.exteriorEpoch !== w.epoch) {
        const def = { ...w.room, rows: w.room.rows.map((row) => row.replace(/C/g, '.')) };
        this.exterior = M.mapFor(def);
        this.exteriorEpoch = w.epoch;
      }
      return this.exterior;
    }
    drawDebug(w, r) {
      for (let y = 0; y < w.room.h; y++)
        for (let x = 0; x < w.room.w; x++)
          if (!w.map.walkable(x, y)) r.groundRing(x * 16 + 8, y * 16 + 8, 5, '#f387a6', 0.6);
      for (const h of w.heroes) for (const n of h.nav || []) r.groundDisc(n.x, n.y, 2, '#9edcdf', 0.8);
    }
    title(r, time) {
      const game = this.game;
      game.cam.bounds = null;
      game.cam.offset = [0, 0];
      game.setZoom(1);
      game.focus(0, 0, 0);
      game.lights.enabled = false;
      r.sky(['#111725', '#1d2838', '#334251']);
      r.overlay((g) => {
        const cx = r.W * 0.73,
          cy = r.H * 0.48;
        for (let i = 0; i < 65; i++) {
          const x = ((M.hash(`starx${i}`) % 1000) / 1000) * r.W,
            y = ((M.hash(`stary${i}`) % 1000) / 1000) * r.H * 0.7;
          P.dot(g, x, y, i % 3 ? '#687482' : '#d1bd93');
        }
        // A broken horizon, distant castles and the unseen watcher's towering silhouette.
        for (let i = 0; i < 15; i++) {
          const x = (i * r.W) / 14,
            h = 20 + (M.hash(i) % 20);
          P.rect(g, x, r.H * 0.58 - h, 16, h + r.H * 0.42, '#273140');
          P.poly(
            g,
            [
              [x - 2, r.H * 0.58 - h],
              [x + 8, r.H * 0.58 - h - 13],
              [x + 18, r.H * 0.58 - h],
            ],
            '#283240',
          );
        }
        P.ell(g, cx, cy + 48, 90, 48, '#1b2332');
        for (let i = 0; i < 3; i++)
          P.ell(g, cx, cy + 55 + i * 9, 65 + i * 6, 18, ['#596171', '#424d61', '#333e53'][i]);
        this.master.draw(g, cx + 4, cy + 7, game.view);
        const rad = 33 + Math.sin(time * 0.7),
          yy = cy - 39;
        for (let i = 0; i < 64; i++) {
          const a = (i * Math.PI) / 32,
            x = cx + Math.cos(a) * rad,
            y = yy + Math.sin(a) * rad * 0.7;
          P.disc(g, x, y, i % 7 === 0 ? 2 : 1, i % 3 ? '#9b7b50' : '#f4d18a');
        }
        this.titleHeroes[0].draw(g, cx - 30, cy + 68, game.view);
        this.titleHeroes[1].draw(g, cx + 34, cy + 68, game.view);
        for (let i = 0; i < 30; i++) {
          const a = i * 2.4 + time * 0.09;
          const x = cx + Math.cos(a) * (25 + (i % 4) * 12),
            y = cy + 25 - ((time * 5 + i * 9) % 70);
          P.dot(g, x, y, '#c0a471');
        }
        E.SHAPES.oathRing && this.drawTitleRing(g, cx, cy + 16, time);
      });
    }
    drawTitleRing(g, x, y, time) {
      const rx = 10 + Math.cos(time * 0.65) * 3;
      for (let i = 0; i < 40; i++) {
        const a = (i * Math.PI) / 20;
        P.disc(g, x + Math.cos(a) * rx, y + Math.sin(a) * 14, 2, i < 20 ? '#f5d48c' : '#b28449');
      }
      P.disc(g, x - 6, y - 11, 2, '#fff6d4');
      P.line(g, x - 11, y - 11, x - 1, y - 11, '#fff0b8');
      P.line(g, x - 6, y - 16, x - 6, y - 6, '#fff0b8');
    }
    victory(r) {
      const game = this.game;
      game.lights.enabled = false;
      game.cam.bounds = null;
      game.setZoom(1);
      game.focus(0, 0, 0);
      r.sky(['#3c435b', '#927a85', '#d2ab8a']);
      r.overlay((g) => {
        const x = r.W * 0.8,
          y = r.H * 0.7;
        P.disc(g, r.W * 0.84, r.H * 0.31, 21, '#dfc098');
        P.poly(
          g,
          [
            [0, r.H],
            [0, r.H * 0.74],
            [r.W * 0.25, r.H * 0.6],
            [r.W * 0.6, r.H * 0.78],
            [r.W * 0.84, r.H * 0.54],
            [r.W, r.H * 0.66],
            [r.W, r.H],
          ],
          '#434858',
        );
        for (let i = 0; i < 4; i++) {
          const xx = x - 34 + i * 22;
          P.rect(g, xx - 3, y - 17 - (i % 2) * 11, 6, 28 + (i % 2) * 11, '#4d5266');
          this.drawTitleRing(g, xx, y - 25 - (i % 2) * 11, game.time + i);
        }
        P.ell(g, x, y + 24, 56, 15, '#596477');
        this.titleHeroes[0].draw(g, x - 24, y + 27, game.view);
        this.titleHeroes[1].draw(g, x + 20, y + 27, game.view);
        for (let i = 0; i < 16; i++)
          P.dot(g, x + Math.sin(i * 2.4) * 50, y - 10 - ((i * 7 + game.time * 2) % 65), '#f3dca5');
        E.font.text(g, 'THE ROAD IS YOURS AGAIN', x, y + 47, '#f2ddba', { align: 'center', outline: false });
      });
    }
    board(w, r) {
      const game = this.game;
      game.lights.enabled = false;
      game.cam.bounds = null;
      game.setZoom(1);
      game.focus(0, 0, 0);
      r.sky(['#172333', '#253345', '#283746']);
      r.overlay((g) => {
        const left = r.W * 0.055,
          top = r.H * 0.18,
          width = r.W * 0.57,
          height = r.H * 0.68;
        P.poly(
          g,
          [
            [left - 5, top + 5],
            [left + width, top - 6],
            [left + width + 5, top + height],
            [left, top + height + 7],
          ],
          '#393e43',
        );
        P.poly(
          g,
          [
            [left, top + 3],
            [left + width - 2, top],
            [left + width, top + height - 2],
            [left + 2, top + height + 2],
          ],
          '#354449',
        );
        const pos = (s) => [left + s.map[0] * width, top + s.map[1] * height];
        for (let i = 0; i < 4; i++) {
          const x = left + width * (0.14 + i * 0.21),
            y = top - 18,
            filled = w.rings.includes(M.SITES[i].id);
          P.ell(g, x, y, 9, 6, '#81745d');
          P.ell(g, x, y, 7, 4, '#1d2c38');
          if (filled) {
            P.ell(g, x, y, 6, 4, '#edcb86');
            P.ell(g, x, y, 3, 2, '#273540');
          }
          E.font.text(g, ['O', 'M', 'E', 'T'][i], x, y + 9, filled ? '#f0cf8b' : '#909c9e', {
            align: 'center',
            outline: false,
          });
        }
        const routes = [
          [0, 1],
          [0, 2],
          [0, 3],
          [1, 2],
          [2, 3],
          [1, 4],
          [3, 5],
          [1, 6],
          [2, 6],
        ];
        for (const [a, b] of routes) {
          const p = pos(M.SITES[a]),
            q = pos(M.SITES[b]);
          P.line(g, ...p, ...q, '#69706a');
        }
        for (let i = 0; i < 4; i++)
          if (w.rings.includes(M.SITES[i].id)) {
            const p = pos(M.SITES[i]),
              q = pos(M.SITES.find((site) => site.id === M.SITES[i].shortcutTo));
            P.line(g, ...p, ...q, '#dcb77a', 2);
          }
        const handX = left + width * 0.82,
          handY = top + height * 0.04;
        P.poly(
          g,
          [
            [handX + 15, handY - 38],
            [handX + 36, handY - 27],
            [handX + 22, handY - 6],
            [handX + 12, handY + 14],
            [handX + 5, handY + 13],
            [handX + 8, handY + 1],
            [handX - 2, handY + 18],
            [handX - 8, handY + 15],
            [handX + 1, handY - 5],
            [handX - 12, handY + 7],
            [handX - 17, handY + 2],
            [handX, handY - 22],
          ],
          '#1d2936',
        );
        P.line(g, handX + 12, handY - 30, handX + 31, handY - 20, '#b1915f', 2);
        P.disc(g, handX + 7, handY + 1, 3, '#b09060');
        for (let i = 0; i < 20; i++) {
          const x = left + ((M.hash(`mapx${i}`) % 100) / 100) * width,
            y = top + ((M.hash(`mapy${i}`) % 100) / 100) * height;
          P.poly(
            g,
            [
              [x - 4, y + 6],
              [x, y - 5],
              [x + 5, y + 6],
            ],
            '#465657',
          );
        }
        for (const s of M.SITES) {
          const [x, y] = pos(s),
            done = w.rings.includes(s.id) || w.caches.includes(s.id),
            open = w.reachable(s.id),
            color = done ? '#e9c687' : open ? s.color : '#677078';
          P.ell(g, x, y + 3, 12, 5, '#212f3a');
          P.ell(g, x, y, 11, 5, color);
          P.rect(g, x - 7, y - 13, 14, 13, '#343849');
          P.rect(g, x - 11, y - 19, 6, 17, color);
          P.rect(g, x + 5, y - 19, 6, 17, color);
          P.poly(
            g,
            [
              [x - 12, y - 19],
              [x - 8, y - 27],
              [x - 4, y - 19],
            ],
            '#d9be8a',
          );
          P.poly(
            g,
            [
              [x + 4, y - 19],
              [x + 8, y - 27],
              [x + 12, y - 19],
            ],
            '#d9be8a',
          );
          P.rect(g, x - 2, y - 7, 4, 7, '#dfba70');
          E.font.text(
            g,
            done
              ? 'SEALED'
              : s.id === 'cache1'
                ? 'WELL'
                : s.id === 'cache2'
                  ? 'BELL'
                  : s.family === 'Dragon sanctum'
                    ? 'DRAGON'
                    : s.family.toUpperCase().replace(' CAVERNS', '').replace(' HALLS', ''),
            x,
            y + 9,
            color,
            { align: 'center', outline: true },
          );
        }
        // The watching hand and hourglass are part of the enchanted tabletop, not the HUD.
        const hx = left + width * 0.18,
          hy = top + height * 0.84;
        P.poly(
          g,
          [
            [hx - 13, hy - 8],
            [hx + 13, hy - 8],
            [hx + 5, hy],
            [hx + 13, hy + 8],
            [hx - 13, hy + 8],
            [hx - 5, hy],
          ],
          '#9c8056',
        );
        for (let i = 0; i < w.dread; i++) P.rect(g, hx - 7 + i * 2.5, hy + 4 - i * 0.5, 2, 3, '#f4cb7e');
        E.font.text(g, `DREAD ${w.dread}/6`, hx, hy + 15, '#e8d0a1', { align: 'center', outline: false });
        E.font.text(g, 'THE ROADS REMEMBER', left + width * 0.52, top + height + 16, '#b6b5aa', {
          align: 'center',
          outline: false,
        });
      });
    }
  }
  M.View = View;
})(globalThis);
