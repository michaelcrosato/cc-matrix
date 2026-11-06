/* Native engine rendering: every collidable pixel comes from the simulation's bunker mask. */
(function (root) {
  const A = root.ABJ, E = root.My3D2dge, px = E.px;
  const ink = '#111d32', pale = '#fff3dc', gold = '#ffcb70';
  function text(g, s, x, y, color = pale, scale = 1, align = 'left', wrap) { E.font.text(g, s, Math.round(x), Math.round(y), color, { scale, align, outline: false, shadow: '#091526', wrap }); }
  function frame(g, x, y, w, h, col = '#68dccc', fill = '#112938') {
    px.rect(g, x + 3, y + 3, w, h, '#070e20'); px.rect(g, x, y, w, h, fill); px.rect(g, x, y, w, 1, col); px.rect(g, x, y, 1, h, col); px.rect(g, x + w - 1, y, 1, h, '#2a4654'); px.rect(g, x, y + h - 1, w, 1, '#2a4654');
  }
  function stars(g, w, h, t, reduced) {
    for (let i = 0; i < 100; i++) {
      const x = (i * 137 + i * i * 3) % w, y = (i * 89 + i * i * 7) % Math.max(1, h - 35);
      const on = reduced || Math.sin(t * .6 + i * 2) > -.5;
      px.rect(g, x, y, i % 17 === 0 ? 2 : 1, 1, on ? (i % 7 ? '#5f8799' : '#e6e7d3') : '#355268');
      if (i % 17 === 0) px.rect(g, x, y - 1, 1, 3, '#b8cbca');
    }
  }
  function planet(g, x, y, radius, base, t, celebrated = false) {
    const ramp = E.ramp(base, 8);
    for (let dy = -radius; dy <= radius; dy += 2) {
      const span = Math.sqrt(Math.max(0, radius * radius - dy * dy));
      const i = Math.max(0, Math.min(7, Math.floor((dy / radius + 1) * 3.5)));
      px.rect(g, x - span, y + dy, span * 2, 2, ramp[7 - i]);
      const cap = Math.max(0, span * 1.5 - radius * .3);
      if ((Math.floor((dy + radius) / 7) % 4) < 2 && cap > 0) {
        const dx = Math.sin(dy * .09 + 1) * radius * .18;
        px.rect(g, x - span + 5 + dx, y + dy, cap, 1, celebrated ? '#95deb2' : '#afc8c6');
      }
      // The shaded hemisphere is stepped and follows the disc's own silhouette.
      if (span > 5) px.blend(g, .3, 'multiply', () => px.rect(g, x + span * .28, y + dy, span * .72, 2, '#32234d'));
    }
    px.blend(g, .22, 'add', () => px.ell(g, x - radius * .2, y, radius * 1.55, radius * .16, '#6eafcd'));
  }
  function landscape(g, W, H, t, location, off, reduced, victory) {
    const loc = A.LOCATIONS[location], y0 = off.y, x0 = off.x;
    stars(g, W, H, t, reduced);
    const pr = H > 400 ? 100 : 71;
    planet(g, W * .82, H > 400 ? off.y - 50 : 76, pr, loc.planet, t, victory);
    // Ragged ridgelines and the old defense apron; the field never gains playable width.
    const groundY = y0 + 253;
    for (let layer = 0; layer < 3; layer++) {
      const pts = [[0, groundY + layer * 12]];
      for (let x = 0; x <= W + 20; x += 18) pts.push([x, groundY - 32 - Math.sin(x * .031 + layer) * (17 - layer * 4) - ((x * 71) % 29) + layer * 15]);
      pts.push([W, H], [0, H]); px.poly(g, pts, [loc.rock, '#1c2e40', '#152337'][layer]);
    }
    px.rect(g, x0 + 13, y0 + 252, 454, 18, '#1c3540'); px.rect(g, x0 + 13, y0 + 252, 454, 1, loc.trim);
    for (let x = 18; x < W; x += 21) { px.line(g, x, groundY + 13, x + 12, H, '#22374a'); px.rect(g, x, groundY + 4, 6, 1, '#3e6068'); }
    for (const x of [x0 + 12, x0 + 466]) {
      px.rect(g, x - 5, groundY - 16, 10, 23, '#182a3b'); px.rect(g, x - 3, groundY - 18, 6, 3, '#759590'); px.rect(g, x - 2, groundY - 14, 4, 5, loc.trim);
      px.blend(g, .2, 'add', () => px.disc(g, x, groundY - 12, 10, loc.trim));
    }
    if (H > 400) {
      text(g, 'PLANETARY DEFENSE NETWORK', W / 2, 65, '#8aacb9', 2, 'center');
      text(g, 'SECTOR ' + (location + 1) + ' / ' + loc.name, W / 2, 88, loc.trim, 2, 'center');
      for (let i = 0; i < 4; i++) { const y = groundY + 100 + i * 32; px.line(g, 60, y, W - 60, y, '#22374a'); }
    }
  }
  function boss(g, x, y, b, time, reduced) {
    const hull = E.tones('#8b82c9'), cyan = E.tones('#62cbe9'), orange = E.tones('#ff9479');
    const open = A.bossWindow({ boss: b });
    // Broad, expressive original flagship: head fins, little angry bridge, hinged emitters.
    px.poly(g, [[x - 76, y - 7], [x - 60, y - 17], [x - 31, y - 18], [x - 21, y - 26], [x + 21, y - 26], [x + 31, y - 18], [x + 60, y - 17], [x + 76, y - 7], [x + 68, y + 10], [x + 25, y + 14], [x + 13, y + 20], [x - 13, y + 20], [x - 25, y + 14], [x - 68, y + 10]], hull.deep);
    px.poly(g, [[x - 72, y - 8], [x - 57, y - 14], [x - 25, y - 14], [x - 18, y - 22], [x + 18, y - 22], [x + 25, y - 14], [x + 57, y - 14], [x + 72, y - 8], [x + 65, y + 4], [x + 20, y + 8], [x - 20, y + 8], [x - 65, y + 4]], hull.base);
    px.rect(g, x - 17, y - 22, 34, 3, hull.hi); px.rect(g, x - 55, y - 13, 26, 2, hull.lt); px.rect(g, x + 29, y - 13, 26, 2, hull.lt);
    for (let i = 0; i < 7; i++) px.rect(g, x - 28 + i * 9, y - 7, 5, 3, i === 3 ? gold : hull.sh);
    px.rect(g, x - 12, y - 17, 9, 4, orange.lt); px.rect(g, x + 3, y - 17, 9, 4, orange.lt); px.rect(g, x - 10, y - 16, 3, 2, ink); px.rect(g, x + 7, y - 16, 3, 2, ink);
    for (const [key, dx] of [['left', -48], ['right', 48]]) {
      const live = b[key] > 0, col = live ? cyan : orange;
      px.rect(g, x + dx - 15, y + 1, 30, 17, hull.deep); px.rect(g, x + dx - 13, y + 1, 26, 14, live ? col.sh : '#352f4a');
      if (live) {
        px.rect(g, x + dx - 10, y + 5, 20, 8, open ? cyan.hi : cyan.deep);
        if (open) for (let j = 0; j < 3; j++) px.rect(g, x + dx - 7 + j * 6, y + 5, 3, 6, cyan.base);
        else px.rect(g, x + dx - 11, y + 1, 22, 10, cyan.base);
        px.rect(g, x + dx - 12, y, 24, 2, cyan.lt);
        for (let i = 0; i < b[key]; i++) px.rect(g, x + dx - 11 + i * 3, y + 20, 2, 2, cyan.hi);
      } else for (let i = 0; i < 4; i++) px.rect(g, x + dx - 10 + i * 6, y + 5 + i % 2 * 3, 4, 2, orange.sh);
    }
    if (b.phase === 2) {
      px.disc(g, x, y + 8, 19, hull.deep); px.disc(g, x, y + 8, 15, open ? orange.base : hull.sh);
      if (open) { px.disc(g, x, y + 8, 10, orange.lt); px.disc(g, x, y + 8, 5, orange.hi); px.rect(g, x - 12, y + 5, 24, 3, '#fff4d3'); }
      else { px.rect(g, x - 14, y - 1, 28, 6, hull.lt); px.rect(g, x - 14, y + 12, 28, 7, hull.base); }
    }
    if (b.hurt > 0 && !reduced) px.blend(g, .3, 'add', () => px.rect(g, x - 68, y - 13, 136, 22, '#c2ebff'));
  }
  class View {
    constructor(game) { this.game = game; this.lastEvent = 0; this.effects = []; this.toast = null; this.onEvent = null; this.shipX = {}; }
    reset() { this.effects = []; this.lastEvent = 0; this.toast = null; this.shipX = {}; }
    offset() { return { x: Math.floor((this.game.W - 480) / 2), y: Math.floor((this.game.H - 270) / 2) }; }
    events(s, audible) {
      for (const e of s.events) if (e.id > this.lastEvent) {
        this.lastEvent = e.id;
        if (['kill', 'armor', 'erosion', 'repair', 'saucer-hit', 'loss', 'emitter-break', 'core-hit', 'victory', 'respawn', 'pickup'].includes(e.type)) this.effects.push({ ...e, age: 0 });
        if (e.text) this.toast = { text: e.text, time: 3.1, type: e.type };
        if (audible && this.onEvent) this.onEvent(e);
      }
    }
    update(dt, s, audible) {
      this.events(s, audible);
      for (const fx of this.effects) fx.age += dt;
      this.effects = this.effects.filter(f => f.age < (f.type === 'repair' ? 1.1 : f.type === 'loss' ? 1.2 : .7));
      if (this.toast) { this.toast.time -= dt; if (this.toast.time <= 0) this.toast = null; }
      for (const p of s.ships) { const old = this.shipX[p.id] ?? p.x; this.shipX[p.id] = old + (p.x - old) * Math.min(1, dt * 24); }
    }
    draw(r, s, { title = false, demo = false, overlay = false, touch = false, diagnostics = false } = {}) {
      const game = this.game, t = game.time, off = this.offset(), loc = A.LOCATIONS[s.location], reduce = game.reduceMotion;
      r.sky(loc.sky);
      r.queue(240, -10000, 0, g => landscape(g, r.W, r.H, t, s.location, off, reduce, s.won));
      if (title) return;
      const tr = (g, x, y, w, h, col) => px.rect(g, off.x + x, off.y + y, w, h, col);
      // Telegraph outlines extend to the defense line and are intentionally clear above the scenery.
      r.queue(240, 175, 0, g => {
        for (const a of s.attacks) {
          const x = off.x + a.x, y = off.y + a.y, broad = a.kind !== 'bomb', col = broad ? '#ffc07b' : '#ef8c9c';
          const progress = 1 - a.ticks / a.total;
          if (broad) {
            px.line(g, x - (a.kind === 'lane' ? 10 : 4), y, x - (a.kind === 'lane' ? 10 : 4), off.y + 246, '#74515a');
            px.line(g, x + (a.kind === 'lane' ? 10 : 4), y, x + (a.kind === 'lane' ? 10 : 4), off.y + 246, '#74515a');
          }
          px.rect(g, x - 6, y + 2, 12, 1, '#5c465c'); px.rect(g, x - 6, y + 2, 12 * progress, 2, col);
          px.poly(g, [[x - 3, y + 7], [x + 3, y + 7], [x, y + 11]], col);
        }
      });
      for (const e of s.enemies) {
        const [x, y] = A.enemyPos(s, e), pose = s.formation.beat;
        r.sprite(x, y, 0, A.art.enemies[e.row], { anchor: 'center', t: pose, flash: e.hit && game.settings.flashes > 0 ? '#fff1d7' : undefined });
        if (e.type === 'A' && e.hp > 1) r.sprite(x, y - 1, .1, A.art.shell, { anchor: 'center' });
        if (e.type === 'B') r.actor(x, y, 1, (g, ox, oy) => { px.rect(g, ox - 4, oy + 2, 8, 5, '#71394b'); px.rect(g, ox - 3, oy + 2, 6, 3, e.attack > 0 ? '#fff1b7' : '#ff9a65'); px.rect(g, ox - 1, oy + 3, 2, 1, '#fff5dc'); });
      }
      if (s.saucer) r.sprite(s.saucer.x, s.saucer.y + (reduce ? 0 : Math.sin(t * 6) * 1.2), 0, A.art.saucer, { anchor: 'center', t });
      if (s.boss) r.actor(s.boss.x, s.boss.y, 0, (g, x, y) => boss(g, x, y, s.boss, t, game.settings.flashes === 0));
      for (const b of s.bunkers) r.actor(b.x + 24, b.y + 12, 0, (g, x, y) => {
        const tone = E.tones(loc.brick);
        for (let row = 0; row < 8; row++) for (let col = 0; col < 16; col++) {
          if (!(b.rows[row] & (1 << col))) continue;
          const bx = x - 24 + col * 3, by = y - 12 + row * 3;
          px.rect(g, bx, by, 3, 3, tone.base); px.rect(g, bx, by, 3, 1, (row + col) % 5 ? tone.lt : tone.hi); px.rect(g, bx + 2, by + 1, 1, 2, tone.sh);
        }
        // Scaffolding bases remain after total destruction, revealing the repair footprint.
        px.rect(g, x - 25, y + 13, 50, 2, '#1d3342'); px.rect(g, x - 24, y + 13, 5, 1, loc.trim); px.rect(g, x + 19, y + 13, 5, 1, loc.trim);
      });
      for (const p of s.ships) {
        if (!p.active || p.gone) continue;
        const col = p.seat ? '#ffb397' : '#8af2db';
        const x = this.shipX[p.id] ?? p.x;
        if (p.charges > 0) {
          // Preview comes from the same target resolver as the authoritative repair.
          const proxy = Object.create(A.Sim.prototype); proxy.s = s; const target = proxy.repairTarget(p), b = s.bunkers[target.bunker];
          if (target.usable) r.actor(b.x + 24, b.y + 12, 1, (g, ox, oy) => {
            px.line(g, ox - 26, oy - 14, ox - 17, oy - 14, col); px.line(g, ox - 26, oy - 14, ox - 26, oy - 7, col); px.line(g, ox + 17, oy - 14, ox + 26, oy - 14, col); px.line(g, ox + 26, oy - 14, ox + 26, oy - 7, col);
          });
        }
        r.sprite(x, p.y + Math.round(p.recoil / 6), 0, A.art.cannons[p.seat], { anchor: 'center', flash: game.settings.flashes > 0 && p.shield > 0 && Math.floor(p.shield / 12) % 2 ? col : undefined });
        r.actor(x, p.y, 1, (g, ox, oy) => {
          if (p.shield > 0) { px.line(g, ox - 13, oy - 11, ox + 13, oy - 11, col); px.line(g, ox - 14, oy - 10, ox - 14, oy + 7, col); px.line(g, ox + 14, oy - 10, ox + 14, oy + 7, col); }
          px.rect(g, ox - 1, oy - 7, 2, 3, p.cool <= 0 && s.shots.filter(q => q.owner === p.id && q.team === 0).length < 2 ? '#fff4bf' : '#407f84');
          for (let i = 0; i < 3; i++) px.rect(g, ox - 6 + i * 5, oy + 9, 3, 2, i < p.charges ? gold : '#344c57');
        });
        game.lights.add(x, p.y, 4, 28, .15, { color: col });
      }
      for (const shot of s.shots) {
        if (shot.team === 0) r.actor(shot.x, shot.y, 1, (g, x, y) => { px.rect(g, x - 1, y - 4, 2, 7, '#d6ffef'); px.rect(g, x, y - 5, 1, 4, '#fff6d7'); px.rect(g, x - 1, y + 4, 2, 3, '#64bda9'); }, { emissive: true });
        else if (shot.kind === 'bomb') r.sprite(shot.x, shot.y, 1, A.art.bomb, { t, anchor: 'center', emissive: true });
        else r.actor(shot.x, shot.y, 1, (g, x, y) => {
          const rad = shot.kind === 'lane' ? 9 : 4;
          px.poly(g, [[x, y - 7], [x + rad, y - 2], [x + rad - 1, y + 4], [x, y + 8], [x - rad + 1, y + 4], [x - rad, y - 2]], '#f3856f'); px.rect(g, x - 1, y - 3, 3, 7, '#fff2b0'); px.rect(g, x - rad, y - 9, 2 * rad, 1, '#e1a8aa');
        }, { emissive: true });
      }
      for (const item of s.pickups) r.sprite(item.x, item.y, 2, A.art.salvage, { anchor: 'center', t, alpha: item.life < 120 && Math.floor(item.life / 12) % 2 ? .4 : 1, emissive: true });
      r.overlay(g => {
        for (const fx of this.effects) {
          const x = off.x + fx.x, y = off.y + fx.y, age = fx.age, u = age / .7;
          if (fx.type === 'repair') {
            const b = s.bunkers[fx.bunker]; if (b) for (const n of fx.cells || []) { if (n / 128 > age * 3) continue; const bx = off.x + b.x + n % 16 * 3, by = off.y + b.y + Math.floor(n / 16) * 3; px.blend(g, Math.max(0, .7 - age), 'add', () => px.rect(g, bx, by, 3, 3, '#bbffe6')); }
          } else {
            const color = ['erosion', 'loss'].includes(fx.type) ? loc.brick : fx.type === 'armor' ? '#99d8ff' : fx.type === 'pickup' ? gold : A.colorRows[fx.row || 0];
            const n = fx.type === 'erosion' ? 5 : fx.type === 'loss' ? 26 : 14;
            for (let i = 0; i < n; i++) {
              const angle = (i * 2.39996 + fx.id), vel = 13 + i % 5 * 8, dx = Math.cos(angle) * vel * age, dy = Math.sin(angle) * vel * age + age * age * 24;
              if (u < 1 || fx.type === 'loss') px.rect(g, x + dx, y + dy, i % 3 ? 1 : 2, i % 3 ? 1 : 2, color);
            }
            if (age < .12 && game.settings.flashes > 0) { px.line(g, x - 9, y, x + 9, y, '#fff6d9'); px.line(g, x, y - 7, x, y + 7, '#fff6d9'); }
            if (fx.points) text(g, '+' + fx.points, x, y - age * 18 - 4, gold, 1, 'center');
          }
        }
        // Explicit breach boundary, intentionally apart from the base row.
        for (let x = 22; x < 458; x += 9) if (!s.bunkers.some(b => x + 4 > b.x && x < b.x + 48)) tr(g, x, A.FIELD.breach, 4, 1, '#8b6070');
        text(g, 'BREACH', off.x + 24, off.y + 211, '#cf9297', 1);
        px.rect(g, off.x + 18, off.y + 6, 444, 24, '#0b1c2c'); px.rect(g, off.x + 18, off.y + 30, 444, 1, '#466270');
        text(g, 'TEAM', off.x + 26, off.y + 9, '#90aab5'); text(g, String(s.score).padStart(6, '0'), off.x + 26, off.y + 18, pale, 1);
        text(g, s.boss ? 'THE BIG RUDE' : 'FORMATION ' + (s.encounter + 1) + ' / 6', off.x + 240, off.y + 12, loc.trim, 1, 'center');
        text(g, s.boss ? (s.boss.phase === 1 ? 'BREAK THE EMITTERS' : 'CORE ' + s.boss.core + ' / ' + s.boss.maxCore) : loc.name, off.x + 240, off.y + 22, '#a2b8c2', 1, 'center');
        text(g, 'RESERVE ' + s.reserve, off.x + (touch && r.H <= 400 ? 400 : 450), off.y + 11, pale, 1, 'right');
        if (s.assisted) text(g, 'ASSISTED', off.x + (touch && r.H <= 400 ? 400 : 450), off.y + 22, gold, 1, 'right');
        else text(g, A.DIFFICULTIES[s.difficulty].name, off.x + (touch && r.H <= 400 ? 400 : 450), off.y + 22, '#9badbc', 1, 'right');
        for (const p of s.ships) {
          const col = p.seat ? '#ffb397' : '#8af2db', label = p.gone ? 'LEFT' : p.wait ? 'DEPLOYING' : p.active ? 'P' + (p.seat + 1) + '  ' + p.charges + '/3 REPAIR' : 'SPECTATING';
          text(g, label, off.x + (p.seat ? 450 : 26), off.y + 260, col, 1, p.seat ? 'right' : 'left');
        }
        if (s.phase === 'intro' || s.phase === 'restoration') {
          const title = s.phase === 'restoration' ? 'CLEAR!' : s.boss ? 'FLAGSHIP INBOUND' : A.WAVES[s.encounter].name;
          px.blend(g, .8, 'normal', () => px.rect(g, off.x + 45, off.y + 144, 390, 37, '#112337'));
          text(g, title, off.x + 240, off.y + 149, pale, 2, 'center');
          text(g, s.phase === 'restoration' ? 'QUIET WINDOW. REPAIR YOUR NEAREST BUNKER.' : s.boss ? (s.boss.phase === 1 ? 'BLUE EMITTERS OPEN BEFORE EACH VOLLEY.' : 'EXPOSED CORE. READ THE TELEGRAPHED LANES.') : 'CUT A LANE. CATCH SALVAGE. REBUILD.', off.x + 240, off.y + 169, loc.trim, 1, 'center');
        }
        if (this.toast && !overlay && s.phase === 'active') {
          const message = this.toast.text;
          px.blend(g, .85, 'normal', () => px.rect(g, off.x + 42, off.y + 177, 396, 15, '#102537'));
          text(g, message, off.x + 240, off.y + 181, this.toast.type === 'no-repair' ? gold : pale, 1, 'center');
        }
        if (s.encounter === 0 && s.phase === 'active' && s.encounterTick < 6000 && !overlay && !demo) {
          const hint = !s.tutorial.moved ? 'MOVE TO PICK YOUR FIRING LANE' : !s.tutorial.fired ? 'HOLD FIRE. YOUR SHOTS ALSO CUT COVER.' : !s.tutorial.collected ? 'CATCH THE GOLD DIAMONDS TO GAIN REPAIRS.' : !s.tutorial.repaired ? 'REPAIR REBUILDS THE BUNKER NEAREST YOU.' : null;
          if (hint) text(g, hint, off.x + 240, off.y + 193, gold, 1, 'center');
        }
        if (demo) { frame(g, r.W / 2 - 152, 15, 304, 29, gold, '#241d35'); text(g, 'ATTRACT / AI DEMONSTRATION', r.W / 2, 20, gold, 1, 'center'); text(g, 'ANY INPUT RETURNS TO TITLE', r.W / 2, 33, pale, 1, 'center'); }
        if (touch && r.H > 400 && !overlay) { text(g, 'DRAG BELOW TO MOVE', r.W / 2, off.y + 310, '#97b1ba', 2, 'center'); text(g, 'SECOND FINGER CUTS A FIRING LANE', r.W / 2, off.y + 333, '#7f99a6', 1, 'center'); }
        if (diagnostics) {
          for (const e of s.enemies) { const [x, y] = A.enemyPos(s, e); px.line(g, off.x + x - 8, off.y + y - 7, off.x + x + 8, off.y + y - 7, '#f982b7'); }
          text(g, 'TICK ' + s.tick + ' RNG ' + s.rng + ' EPOCH ' + s.epoch, off.x + 32, off.y + 35, '#ffe7a4');
        }
      });
    }
  }
  A.View = View; A.paint = { text, frame, planet, stars, landscape, boss, ink, pale, gold };
})(globalThis);
