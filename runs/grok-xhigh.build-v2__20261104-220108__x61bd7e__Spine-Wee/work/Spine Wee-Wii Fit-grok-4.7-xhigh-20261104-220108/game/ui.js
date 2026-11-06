/* Pills, prompts, the Plate, cards, results, and the dev panel. */
var G = G || {};
(function () {
  'use strict';
  const E = My3D2dge;
  /* v0.89 dropped px.round. A chamfered fill keeps the pills, the scale, and the shrubs. */
  if (typeof E.px.round !== 'function') {
    E.px.round = function (g, x, y, w, h, rad, c) {
      const x0 = Math.round(x), y0 = Math.round(y), ww = Math.round(w), hh = Math.round(h);
      const r = Math.max(0, Math.min(Math.round(rad || 0), Math.floor(Math.min(ww, hh) / 2)));
      E.px.col(g, c);
      if (r <= 0) { g.fillRect(x0, y0, ww, hh); return; }
      g.fillRect(x0 + r, y0, Math.max(0, ww - r * 2), hh);
      g.fillRect(x0, y0 + r, ww, Math.max(0, hh - r * 2));
    };
  }
  function text(g, s, x, y, col, scale, align) {
    E.font.text(g, String(s), x, y, col || '#20404c', { scale: scale || 1, align: align || 'left', outline: false, shadow: false });
  }
  G.text = text;
  G.lean = G.lean || { ux: 0, uy: 0, breath: 0, effort: 0, source: 'keys' };
  G.busy = G.busy || function () { return !!(G.talk && G.talk.open) || G.phase === 'talk'; };
  G.prompt = function (g, r, action, verb) {
    if (!r || !G.game) return;
    const I = G.game.input;
    let chip;
    if (action === 'lean') {
      const src = (G.lean && G.lean.source) || 'keys';
      chip = src === 'pad' ? 'Left stick' : src === 'mouse' ? 'Move the mouse' : 'WASD';
      if (verb) chip += '  ' + verb;
    } else if (I.lastDevice === 'gamepad') chip = I.label(action) + (verb ? '  ' + verb : '');
    else if (I.lastDevice === 'mouse') {
      const mouse = I.label(action, 'mouse');
      const key = I.label(action, 'keyboard');
      chip = (mouse && mouse !== key ? mouse : 'Click') + (verb ? '  ' + verb : '');
    } else {
      const key = I.label(action, 'keyboard');
      const mouse = I.label(action, 'mouse');
      chip = key + ' / ' + (mouse && mouse !== key ? mouse : 'Click') + (verb ? '  ' + verb : '');
    }
    const w = Math.max(70, E.font.width(chip, { scale: 1 }) + 16);
    const x = r.W - w - 8, y = r.H - 16;
    r.overlay(function (gg) {
      E.px.round(gg, x, y, w, 14, 4, '#ffffff');
      E.px.line(gg, x, y, x + w, y, '#2cc6e6');
      text(gg, chip, x + 6, y + 3, '#20404c', 1);
    });
  };
  function Pills(items, o) {
    o = o || {};
    this.items = items || [];
    this.i = o.i || 0;
    this.rects = [];
    this.cols = o.cols || 1;
    this.x = o.x; this.y = o.y;
  }
  Pills.prototype.update = function (input) {
    const n = this.items.length;
    if (!n) return null;
    if (this.i >= n) this.i = 0;
    const horiz = this.cols > 1 || n <= 4;
    if (input.repeat(horiz ? 'left' : 'up') || input.repeat(horiz ? 'up' : 'left')) this.i = (this.i + n - 1) % n;
    if (input.repeat(horiz ? 'right' : 'down') || input.repeat(horiz ? 'down' : 'right')) this.i = (this.i + 1) % n;
    const p = input.pointer();
    if (p && this.rects.length === n) {
      for (let k = 0; k < n; k++) {
        const rc = this.rects[k];
        if (p[0] >= rc.x && p[0] <= rc.x + rc.w && p[1] >= rc.y && p[1] <= rc.y + rc.h && k !== this.i) this.i = k;
      }
    }
    const click = input.clicked();
    let picked = -1;
    if (click && this.rects.length === n) {
      for (let k = 0; k < n; k++) {
        const rc = this.rects[k];
        if (click[0] >= rc.x && click[0] <= rc.x + rc.w && click[1] >= rc.y && click[1] <= rc.y + rc.h) picked = k;
      }
    }
    if (picked < 0 && input.pressed('confirm') && !G.busy()) picked = this.i;
    if (picked >= 0) {
      const it = this.items[picked];
      if (it && it.disabled) return null;
      this.i = picked;
      try { G.game.audio.sfx('confirm'); } catch (e) { /* quiet */ }
      return it;
    }
    return null;
  };
  Pills.prototype.draw = function (r) {
    const self = this;
    if (!r) return;
    r.overlay(function (g) {
      const n = self.items.length;
      const horiz = self.cols > 1 || n <= 4;
      self.rects = [];
      const gap = 6;
      let widths = [];
      for (let k = 0; k < n; k++) widths.push(Math.max(54, E.font.width(self.items[k].label, { scale: 1 }) + 18));
      let x0 = self.x == null ? 12 : self.x;
      let y0 = self.y == null ? r.H - 36 : self.y;
      if (self.x == null && horiz) {
        const sum = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, n - 1);
        x0 = Math.max(12, Math.round((r.W - sum) / 2));
      }
      let x = x0, y = y0;
      for (let k = 0; k < n; k++) {
        const it = self.items[k], w = horiz ? widths[k] : Math.max(120, widths[k]), h = 16;
        const on = k === self.i && !it.disabled;
        const grow = on ? 1 : 0;
        E.px.round(g, x - grow, y - grow, w + grow * 2, h + grow * 2, 6, it.disabled ? '#e7eef0' : '#ffffff');
        if (on) E.px.line(g, x - grow, y - grow, x + w + grow, y - grow, '#2cc6e6');
        text(g, it.label, x + 8, y + 4, it.disabled ? '#5f7f8a' : on ? '#14a8c8' : '#20404c', 1);
        self.rects.push({ x: x - grow, y: y - grow, w: w + grow * 2, h: h + grow * 2 });
        if (horiz) x += w + gap; else y += h + 4;
      }
    });
  };
  G.Pills = Pills;
  G.drawPlate = function (r, bal, o) {
    if (!r || !bal) return;
    o = o || {};
    r.overlay(function (g) {
      const cx = o.x == null ? r.W / 2 : o.x, cy = o.y == null ? r.H - 34 : o.y, rad = o.r || 26;
      if (o.hide) {
        E.px.disc(g, cx, cy, rad, 'rgba(32,64,76,.25)');
        text(g, 'eyes closed', cx, cy - 3, '#f7fbfb', 1, 'center');
        return;
      }
      E.px.disc(g, cx, cy, rad, '#ffffff');
      E.px.disc(g, cx, cy, rad - 2, '#f4fbfb');
      const R = (bal.set.R || .24) * (G.dev && G.dev.on ? G.dev.v.ring : 1);
      const ring = Math.max(6, R * rad);
      const c = o.c || { x: 0, y: 0 };
      const rx = cx + c.x * rad, ry = cy - c.y * rad;
      E.px.disc(g, rx, ry, ring, 'rgba(191,238,224,.0)');
      E.px.line(g, rx - ring, ry, rx + ring, ry, '#bfeee0');
      E.px.line(g, rx, ry - ring, rx, ry + ring, '#bfeee0');
      const trail = bal.trail || [];
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i];
        E.px.disc(g, cx + t.x * rad, cy - t.y * rad, 1, 'rgba(44,198,230,' + (i / trail.length) + ')');
      }
      const px = cx + bal.px * rad, py = cy - bal.py * rad;
      E.px.disc(g, px, py, 3, '#ff7a59');
      E.px.disc(g, px, py, 1.4, '#ffffff');
      if (o.trace && G.dev && G.dev.panel) text(g, bal.px.toFixed(2) + ',' + bal.py.toFixed(2), cx - 20, cy + rad + 2, '#20404c', 1);
    });
  };
  G.drawStars = function (g, x, y, n) {
    for (let i = 0; i < 3; i++) text(g, i < n ? '★' : '·', x + i * 12, y, i < n ? '#14a8c8' : '#5f7f8a', 2);
  };
  G.DEV_DEFAULTS = {
    k: 1, c: 1, s: 1, A: 1, nf: 1, ring: 1, push: 1, stumble: 1, reach: .33, nudge: 2.2,
    star1: .35, star2: .65, star3: .90, repTol: .08, rhythm: 1, fatigue: 1.5,
    hoopLo: 7, hoopHi: 11, jogLo: 2.6, jogHi: 3.4, jogSpeed: 1,
    skiSpeed: 220, skiTurn: 1.6, trayG: 420, trayFric: 3, ropeS: 16, gust: 9,
    timeScale: 1, minutesMul: 1
  };
  const DEV_HELP = {
    k: 'spring', c: 'damping', s: 'instability', A: 'noise', nf: 'noise rate', ring: 'ring scale', push: 'push', stumble: 'stumble at',
    reach: 'mouse reach', nudge: 'nudge rate', star1: '1 star', star2: '2 stars', star3: '3 stars', repTol: 'rep tolerance',
    rhythm: 'window scale', fatigue: 'fatigue', hoopLo: 'hoop low', hoopHi: 'hoop high', jogLo: 'jog low', jogHi: 'jog high',
    jogSpeed: 'jog speed', skiSpeed: 'ski speed', skiTurn: 'ski turn', trayG: 'tray gravity', trayFric: 'tray friction',
    ropeS: 'rope instability', gust: 'gust', timeScale: 'time scale', minutesMul: 'minutes'
  };
  function copyDev(src) { const o = {}; for (const k in src) o[k] = src[k]; return o; }
  G.dev = {
    on: false, panel: false, v: copyDev(G.DEV_DEFAULTS), i: 0, keys: Object.keys(G.DEV_DEFAULTS),
    tool: 0, pose: 'stork', poseI: 0, poseT: 0, poseMode: false, printed: '', frame: false, bot: null, trace: false, noStumble: false,
    open() {
      this.panel = true; this.on = true;
      if (G.game) { G.game.live = true; if (G.game.paused) G.game.resume(); }
    },
    close() { this.panel = false; this.on = false; if (G.game && !G.inSession) G.game.live = false; },
    adjust(key, delta) {
      if (!(key in this.v)) return;
      const d = G.DEV_DEFAULTS[key];
      const step = Math.abs(d) > 20 ? Math.abs(d) * 0.05 : Math.abs(d) > 2 ? 0.1 : d > 0.2 ? 0.05 : 0.01;
      this.v[key] = Math.round((this.v[key] + delta * (step || 0.05)) * 1000) / 1000;
      if (key === 'timeScale' && G.game) G.game.timeScale = this.v.timeScale;
    },
    reset() {
      this.v = copyDev(G.DEV_DEFAULTS);
      if (G.game) G.game.timeScale = 1;
    },
    jump(o) {
      o = o || {};
      if (!G.game) return;
      if (o.day) { G.profile.day = o.day; G.profile.sessions = 0; }
      if (o.activity) G.game.go('play', { id: o.activity, tier: o.tier || 1, trial: true, driver: o.driver || null, skipToPlay: true }, { fade: 0 });
      else if (o.scene) G.game.go(o.scene, o.data || {}, { fade: 0 });
    },
    jumpMode: false, jumpRow: 0, jumpDay: 1, jumpSceneI: 0, jumpActI: 0, jumpTier: 1,
    jumpScenes: ['bungalow', 'island', 'title', 'plate', 'bed', 'ending'],
    jumpActs: ['', 'stork', 'candle', 'squat', 'step', 'hoop', 'sun', 'push', 'lunge', 'jog', 'slalom', 'tray', 'laundry']
  };
  const TOOLS = ['Finish 3 stars', 'Finish 1 star', 'Unlock all', '+10 minutes', 'Spine Age 40', 'Reset member', 'Bot: good', 'Bot: off', 'Trace', 'Frame step', 'Force attract', 'Pose viewer', 'Log snapshot', 'Jump'];
  G.dev.tools = TOOLS;
  G.dev.clipNames = function () {
    const lib = G.lib && G.lib();
    if (lib && lib.names && lib.names.length) return lib.names;
    return Object.keys(G.POSES || {});
  };
  G.dev.currentClip = function () {
    const names = this.clipNames();
    if (!names.length) return null;
    if (this.poseI < 0 || this.poseI >= names.length) this.poseI = 0;
    const lib = G.lib && G.lib();
    const clip = lib && lib.clip(names[this.poseI]);
    return clip || { name: names[this.poseI], dur: 2 };
  };
  G.dev.printPose = function () {
    const names = this.clipNames();
    const clip = this.currentClip();
    if (!clip || !names.length) return '';
    const name = names[this.poseI] || clip.name || 'pose';
    const t = Math.round((this.poseT || 0) * 100) / 100;
    const dur = clip.dur || t;
    const b = Math.round(Math.min(dur, t + 0.8) * 100) / 100;
    const key = String(name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'pose';
    const row = key + ": { clip: '" + name + "', a: " + t.toFixed(2) + ", b: " + Math.max(b, t).toFixed(2) + ", tgt: 1.57 },";
    this.printed = row;
    try { console.log(row); } catch (e) { /* the row is also on the panel */ }
    return row;
  };
  function eat(input, action) { try { input.suppress(action); } catch (e) { /* already used */ } }
  G.dev.update = function (input, dt) {
    if (!this.panel) return;
    const keys = this.keys;
    if (input.pressed('cancel')) {
      eat(input, 'cancel');
      if (this.poseMode) { this.poseMode = false; return; }
      if (this.jumpMode) { this.jumpMode = false; return; }
      this.close();
      return;
    }
    if (this.poseMode) {
      const names = this.clipNames();
      const n = names.length || 1;
      if (input.pressed('up')) { this.poseI = (this.poseI + n - 1) % n; this.poseT = 0; eat(input, 'up'); }
      if (input.pressed('down')) { this.poseI = (this.poseI + 1) % n; this.poseT = 0; eat(input, 'down'); }
      const dur = (this.currentClip() && this.currentClip().dur) || 2;
      if (input.pressed('left') || input.repeat('left')) { this.poseT = Math.max(0, this.poseT - 0.05); eat(input, 'left'); }
      if (input.pressed('right') || input.repeat('right')) { this.poseT = Math.min(dur, this.poseT + 0.05); eat(input, 'right'); }
      if (input.pressed('confirm')) { this.printPose(); eat(input, 'confirm'); }
      void dt;
      return;
    }
    if (this.jumpMode) {
      const row = this.jumpRow;
      if (input.pressed('up')) { this.jumpRow = (row + 3) % 4; eat(input, 'up'); }
      if (input.pressed('down')) { this.jumpRow = (row + 1) % 4; eat(input, 'down'); }
      const dir = (input.pressed('right') || input.repeat('right')) ? 1 : (input.pressed('left') || input.repeat('left')) ? -1 : 0;
      if (dir) {
        eat(input, dir > 0 ? 'right' : 'left');
        if (this.jumpRow === 0) this.jumpDay = Math.max(1, Math.min(5, this.jumpDay + dir));
        else if (this.jumpRow === 1) this.jumpSceneI = (this.jumpSceneI + dir + this.jumpScenes.length) % this.jumpScenes.length;
        else if (this.jumpRow === 2) this.jumpActI = (this.jumpActI + dir + this.jumpActs.length) % this.jumpActs.length;
        else this.jumpTier = this.jumpTier === 1 ? 2 : 1;
      }
      if (input.pressed('confirm')) {
        eat(input, 'confirm');
        const act = this.jumpActs[this.jumpActI];
        const o = { day: this.jumpDay, tier: this.jumpTier };
        if (act) o.activity = act;
        else o.scene = this.jumpScenes[this.jumpSceneI];
        this.jumpMode = false;
        this.jump(o);
      }
      void dt;
      return;
    }
    const up = input.held.has('ArrowUp') || input.held.has('Pad12');
    const down = input.held.has('ArrowDown') || input.held.has('Pad13');
    const left = input.held.has('ArrowLeft') || input.held.has('Pad14');
    const right = input.held.has('ArrowRight') || input.held.has('Pad15');
    if (up && input.pressed('up')) { this.i = (this.i + keys.length - 1) % keys.length; eat(input, 'up'); }
    if (down && input.pressed('down')) { this.i = (this.i + 1) % keys.length; eat(input, 'down'); }
    const k = keys[this.i];
    if ((left && (input.pressed('left') || input.repeat('left'))) ) { this.adjust(k, -1); eat(input, 'left'); }
    if ((right && (input.pressed('right') || input.repeat('right')))) { this.adjust(k, 1); eat(input, 'right'); }
    if (input.pressed('retry')) this.reset();
    if (input.pressed('confirm')) { eat(input, 'confirm'); this.toolAct(this.tool); }
    void dt;
  };
  G.dev.toolAct = function (i) {
    const p = G.profile;
    if (i === 0 && G.finishNow) G.finishNow(3);
    else if (i === 1 && G.finishNow) G.finishNow(1);
    else if (i === 2 && G.grantAll) G.grantAll();
    else if (i === 3 && p) { p.minutes += 10; if (G.refreshUnlocks) G.refreshUnlocks(); }
    else if (i === 4 && p) { p.spine = 40; p.forceAge = 40; }
    else if (i === 5 && G.freshProfile) { G.profile = G.freshProfile(); }
    else if (i === 6) this.bot = 'good';
    else if (i === 7) this.bot = null;
    else if (i === 8) this.trace = !this.trace;
    else if (i === 9) { this.frame = !this.frame; if (G.game) G.game.timeScale = this.frame ? 0 : this.v.timeScale; }
    else if (i === 10 && G.startAttract) G.startAttract();
    else if (i === 11) { this.poseMode = !this.poseMode; if (this.poseMode) { this.poseT = 0; this.printed = ''; } }
    else if (i === 12 && G.game && G.game.debug) { try { console.log(JSON.stringify(G.game.debug.snapshot())); } catch (e) { /* keep playing */ } }
    else if (TOOLS[i] === 'Jump') { this.jumpMode = !this.jumpMode; if (this.jumpMode) this.jumpRow = 0; }
  };
  G.dev.drawPose = function (r) {
    const lib = G.lib && G.lib();
    const clip = this.currentClip();
    if (!lib || !clip || !G.makeRig || !r.actor) return;
    if (!this._rig) this._rig = G.makeRig(G.playerOpts(null, 2.1));
    const rig = this._rig;
    try {
      rig.mocap = lib.sample(clip, this.poseT || 0);
      rig.wob = [0, 0];
      rig.body = null;
      rig._tgt = 1.57;
      G.stepRig(rig, 1 / 60, 0, 0);
      r.actor(8, 6, 0, function (g, ox, oy) { rig.draw(g, ox, oy, r.view); });
    } catch (e) { /* the name and the row still show */ }
  };
  G.dev.draw = function (r) {
    if (!this.panel || !r) return;
    if (this.poseMode) this.drawPose(r);
    const self = this;
    r.overlay(function (g) {
      const w = Math.round(r.W * .33);
      E.px.rect(g, 0, 0, w, r.H, 'rgba(247,251,251,.92)');
      text(g, 'DEV', 8, 6, '#14a8c8', 1);
      const start = Math.max(0, self.i - 8);
      for (let n = 0; n < 12 && start + n < self.keys.length; n++) {
        const k = self.keys[start + n];
        const on = start + n === self.i;
        const y = 18 + n * 12;
        if (on) E.px.rect(g, 4, y - 1, w - 8, 11, '#bfeee0');
        const def = G.DEV_DEFAULTS[k];
        text(g, (DEV_HELP[k] || k) + ' ' + self.v[k], 8, y, '#20404c', 1);
        if (self.v[k] !== def) text(g, 'd' + def, w - 36, y, '#5f7f8a', 1);
      }
      if (self.poseMode) {
        const names = self.clipNames();
        const clip = self.currentClip();
        text(g, (names[self.poseI] || '') + '  ' + (self.poseT || 0).toFixed(2), 8, r.H - 52, '#20404c', 1);
        if (self.printed) text(g, self.printed.slice(0, 42), 8, r.H - 40, '#5f7f8a', 1);
        text(g, clip ? 'up clip   side scrub   confirm prints' : '', 8, r.H - 28, '#5f7f8a', 1);
      } else if (self.jumpMode) {
        const rows = [
          'Day ' + self.jumpDay,
          'Scene ' + self.jumpScenes[self.jumpSceneI],
          'Activity ' + (self.jumpActs[self.jumpActI] || '(scene)'),
          'Tier ' + self.jumpTier
        ];
        rows.forEach(function (line, n) {
          text(g, (n === self.jumpRow ? '> ' : '  ') + line, 8, r.H - 78 + n * 11, n === self.jumpRow ? '#14a8c8' : '#20404c', 1);
        });
      } else text(g, 'reset: retry', 8, r.H - 28, '#5f7f8a', 1);
      text(g, TOOLS[self.tool] || '', 8, r.H - 16, '#14a8c8', 1);
    });
  };
  G.starsOf = function (pct, gates) {
    gates = gates || [.35, .65, .90];
    const g0 = G.dev && G.dev.on ? G.dev.v.star1 : gates[0];
    const g1 = G.dev && G.dev.on ? G.dev.v.star2 : gates[1];
    const g2 = G.dev && G.dev.on ? G.dev.v.star3 : gates[2];
    const use = G.dev && G.dev.on ? [g0, g1, g2] : gates;
    let n = 0;
    if (pct >= use[0]) n = 1;
    if (pct >= use[1]) n = 2;
    if (pct >= use[2]) n = 3;
    return n;
  };
})();
