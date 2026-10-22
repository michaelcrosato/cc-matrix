// ===== 13_ui.js — 10-foot UI: screens, focus navigation, HUD, radar, markers, title backdrop =====
const OBJECTIVES = {
  corvanis: 'Break the siege of the capital and destroy the Granite Strider.',
  zeta: 'Hunt down Emperor Croak\'s flagship in the asteroid belt and destroy its reactor.',
};

const UI = {
  stack: [], screens: {}, portraitCache: {}, hudOn: false, fadeCb: null,
  init() {
    this.el = { hud: $('#hud'), screens: $('#screens') };
    this.buildScreens();
    Bus.on('padchange', () => this.refreshGlyphs());
    window.addEventListener('pointerdown', (e) => {
      const t = e.target.closest('[data-idx]');
      if (!t) return;
      const top = this.top();
      if (!top || top.el !== t.closest('.screen')) return;
      top.focus = +t.dataset.idx;
      top.activate(0, true);
      top.render();
    });
    window.addEventListener('pointermove', (e) => {
      const t = e.target.closest('[data-idx]');
      const top = this.top();
      if (t && top && top.el === t.closest('.screen') && top.focus !== +t.dataset.idx) { top.focus = +t.dataset.idx; top.render(); }
    });
    window.addEventListener('wheel', (e) => { const top = this.top(); if (top && top.scroll) top.scroll(e.deltaY > 0 ? 1 : -1); });
  },
  portrait(id) { return this.portraitCache[id] || (this.portraitCache[id] = Models.portrait(id)); },
  glyphText(t) { return t.replace(/\{(\w+)\}/g, (_, a) => Glyph.html(a)); },
  top() { return this.stack[this.stack.length - 1]; },
  open(id, arg) {
    const s = this.screens[id];
    if (!s) return;
    if (this.top()) this.top().el.classList.remove('active');
    this.stack.push(s);
    s.onOpen && s.onOpen(arg);
    s.render();
    s.el.classList.add('active');
    AudioSys.play('menuConfirm', { volume: 0.5 });
  },
  close() {
    const s = this.stack.pop();
    if (s) { s.el.classList.remove('active'); s.onClose && s.onClose(); }
    const t = this.top();
    if (t) { t.render(); t.el.classList.add('active'); }
    AudioSys.play('menuBack', { volume: 0.5 });
  },
  closeAll() { while (this.stack.length) { const s = this.stack.pop(); s.el.classList.remove('active'); } document.body.classList.remove('paused'); },
  update(dt) {
    const t = this.top();
    if (t) t.input(dt);
    if (this.hudOn) this.updateHud(dt);
  },
  refreshGlyphs() { const t = this.top(); if (t) t.render(); this.footer(); },
  footer() { document.querySelectorAll('[data-glyph]').forEach((n) => (n.innerHTML = Glyph.html(n.dataset.glyph))); },

  // ---------------------------------------------------------------- screen factory
  buildScreens() {
    const S = this.screens;
    S.press = new PressScreen();
    S.menu = new MenuScreen('menu', {
      title: '', cls: 'main-menu', logo: true,
      items: () => [
        { label: 'Start Mission', desc: 'Begin the campaign at Corvanis. Two missions, one boss each.', action: () => { this.closeAll(); Game.loadStage('corvanis'); } },
        { label: 'Mission Select', desc: 'Jump straight into any mission.', action: () => this.open('stages') },
        { label: 'How to Play', desc: 'Controls, maneuvers, items and scoring.', action: () => this.open('howto') },
        { label: 'Settings', desc: 'Controller axis fixes, audio, difficulty and more.', action: () => this.open('settings') },
        { label: 'About & Credits', desc: 'Credits, source information and development notes.', action: () => this.open('about') },
      ],
      onBack: () => { this.close(); this.open('press'); },
      footer: [['confirm', 'Select'], ['back', 'Back']],
    });
    S.stages = new StageSelect();
    S.settings = new MenuScreen('settings', {
      title: 'Settings', cls: 'settings',
      items: () => [
        { label: 'Invert Controller Horizontal', type: 'toggle', key: 'invertPadX', desc: 'Fixes controllers that report left/right reversed (affects all gamepad stick & d-pad input).' },
        { label: 'Invert Controller Vertical', type: 'toggle', key: 'invertPadY', desc: 'Fixes controllers that report up/down reversed (affects all gamepad stick & d-pad input).' },
        { label: 'Flight Controls', type: 'choice', key: 'flightInvert', options: [[false, 'Normal'], [true, 'Pilot (Inverted)']], desc: 'Pilot style: push up to dive, pull back to climb.' },
        { label: 'Difficulty', type: 'choice', key: 'difficulty', options: [[0, 'Easy'], [1, 'Normal'], [2, 'Hard']], desc: 'Changes incoming damage and enemy fire rate.' },
        { label: 'Music Volume', type: 'slider', key: 'musicVol', desc: 'Volume of the soundtrack.' },
        { label: 'Effects Volume', type: 'slider', key: 'sfxVol', desc: 'Volume of lasers, explosions and UI sounds.' },
        { label: 'Radio Voice Volume', type: 'slider', key: 'voiceVol', desc: 'Volume of radio chatter.' },
        { label: 'Screen Shake', type: 'choice', key: 'shake', options: [[0, 'Off'], [0.5, 'Low'], [1, 'Full']], desc: 'Camera shake from explosions and hits.' },
        { label: 'Controller Vibration', type: 'toggle', key: 'rumble', desc: 'Rumble feedback on supported controllers.' },
        { label: 'Tutorial Tips', type: 'toggle', key: 'hints', desc: 'Show contextual tips the first time a mechanic appears.' },
        { label: 'Large Radio Text', type: 'toggle', key: 'subtitlesLarge', desc: 'Bigger radio subtitles for couch distance.' },
        { label: 'Restore Defaults', desc: 'Reset every setting to its default value.', action: () => { Object.assign(Settings, DEFAULT_SETTINGS); this.applySettings(); S.settings.render(); } },
        { label: 'Back', desc: '', action: () => this.close() },
      ],
      onChange: () => this.applySettings(),
      onBack: () => this.close(),
      footer: [['nav', 'Change'], ['back', 'Back']],
    });
    S.howto = new TabScreen('howto', 'How to Play', HOWTO_TABS);
    S.about = new TabScreen('about', 'About & Credits', ABOUT_TABS);
    S.pause = new MenuScreen('pause', {
      title: 'Paused', cls: 'pause', side: () => this.pauseSide(),
      items: () => [
        { label: 'Resume', desc: 'Back to the action.', action: () => this.pause(false) },
        { label: 'Restart Mission', desc: 'Start this mission over from the beginning.', action: () => { this.closeAll(); AudioSys.duck(false); Game.loadStage(G.stageId, { keepRun: false }); } },
        { label: 'How to Play', desc: 'Controls and maneuvers.', action: () => this.open('howto') },
        { label: 'Settings', desc: 'Axis fixes, audio and more.', action: () => this.open('settings') },
        { label: 'Quit to Title', desc: 'Progress in this mission will be lost.', action: () => { this.closeAll(); AudioSys.duck(false); G.paused = false; Game.quitToTitle(); } },
      ],
      onBack: () => this.pause(false),
      footer: [['confirm', 'Select'], ['back', 'Resume']],
    });
    S.results = new ResultsScreen();
    S.gameover = new MenuScreen('gameover', {
      title: 'Game Over', cls: 'gameover', side: () => `<div class="big-stat"><span>HITS</span><b>${String(G.hits).padStart(3, '0')}</b></div><p class="muted">The Corvanis system still needs you, Vix.</p>`,
      items: () => [
        { label: 'Continue', desc: 'Retry this mission with 3 lives (hits reset).', action: () => { this.closeAll(); Game.loadStage(G.stageId); } },
        { label: 'Quit to Title', desc: '', action: () => { this.closeAll(); Game.quitToTitle(); } },
      ],
      onBack: () => {},
      footer: [['confirm', 'Select']],
    });
    S.complete = new MenuScreen('complete', {
      title: 'Demo Complete', cls: 'complete', side: () => `<div class="big-stat"><span>TOTAL HITS</span><b>${String(G.totalHits).padStart(3, '0')}</b></div><div class="big-stat"><span>BEST</span><b>${String(Save.data.high).padStart(3, '0')}</b></div><p class="muted">Croak's flagship is space dust — for now. Thanks for flying with Stark Fox!</p>`,
      items: () => [
        { label: 'Play Again', desc: 'Restart the campaign at Corvanis.', action: () => { this.closeAll(); Game.loadStage('corvanis'); } },
        { label: 'Title Screen', desc: '', action: () => { this.closeAll(); Game.quitToTitle(); } },
      ],
      onBack: () => {},
      footer: [['confirm', 'Select']],
    });
    S.touch = new MenuScreen('touch', {
      title: 'Controller or keyboard required', cls: 'touch',
      side: () => '<p class="lead">Stark Fox is built for a gamepad (PlayStation, Xbox or similar) or a keyboard. Connect one to play — touch controls are not supported.</p>',
      items: () => [{ label: 'Settings', desc: 'Adjust settings before connecting a controller.', action: () => this.open('settings') }],
      onBack: () => {},
      footer: [],
    });
  },
  applySettings() {
    AudioSys.setVolumes({ music: Settings.musicVol, sfx: Settings.sfxVol, voice: Settings.voiceVol });
    document.body.classList.toggle('big-subs', !!Settings.subtitlesLarge);
    Save.store();
  },
  pause(on) {
    if (on) {
      if (G.state !== 'play') return;
      G.paused = true; G.state = 'paused'; this.pauseFrame = G.frame;
      document.body.classList.add('paused');
      AudioSys.duck(true); AudioSys.play('pause');
      if (G.player.chargeSnd) { G.player.chargeSnd.stop(); G.player.chargeSnd = null; G.player.chargeT = 0; }
      this.open('pause');
    } else {
      this.closeAll();
      document.body.classList.remove('paused');
      G.paused = false; G.state = 'play';
      AudioSys.duck(false);
      Input.poll(0); // swallow the button that closed the menu
    }
  },
  pauseSide() {
    const st = G.stage;
    const wm = G.wingmen.map((w) => `<div class="wm-chip ${w.active ? '' : 'out'}">${this.portrait(w.id)}<span>${WINGMEN[w.id].name}</span><i style="width:${w.hp}%"></i></div>`).join('');
    return `<div class="mission-tag">MISSION ${st.number}</div><h2>${st.name}</h2><p class="lead">${OBJECTIVES[st.id]}</p>
      <div class="pause-stats"><div class="big-stat"><span>HITS</span><b>${String(G.hits).padStart(3, '0')}</b></div><div class="big-stat"><span>LIVES</span><b>${G.lives}</b></div><div class="big-stat"><span>BOMBS</span><b>${G.bombs}</b></div></div>
      <div class="wm-row">${wm}</div>`;
  },

  // ---------------------------------------------------------------- overlays
  showLoading(on) { $('#loading').classList.toggle('show', on); },
  hud(on) { this.hudOn = on; this.el.hud.classList.toggle('show', on); if (!on) { this.bossBar(null); $('#markers').innerHTML = ''; } },
  fade(dur, cb) {
    const f = $('#fade');
    f.style.transition = `opacity ${dur}s`;
    f.classList.add('show');
    setTimeout(async () => { await cb(); f.classList.remove('show'); }, dur * 1000);
  },
  banner(text, dur = 2.5, cls = '') {
    const b = $('#banner');
    b.className = 'show ' + cls; b.textContent = text;
    clearTimeout(this._bt); this._bt = setTimeout(() => (b.className = ''), dur * 1000);
  },
  stageCard(st, attract) {
    const c = $('#stagecard');
    c.innerHTML = `<div class="mission-tag">MISSION ${st.number}</div><h1>${st.name}</h1><h3>${st.subtitle}</h3>${attract ? '' : `<p>${OBJECTIVES[st.id]}</p>`}`;
    c.classList.add('show');
    clearTimeout(this._sc); this._sc = setTimeout(() => c.classList.remove('show'), attract ? 1800 : 4200);
  },
  attractOverlay(on) { $('#attract').classList.toggle('show', on); this.footer(); },
  bossBar(boss) {
    this.boss = boss;
    $('#bossbar').classList.toggle('show', !!boss);
    if (boss) $('#bossname').textContent = boss.name;
  },
  popup(pos, text, cls = '') {
    const p = this.project(pos);
    if (!p.on) return;
    const d = document.createElement('div');
    d.className = 'popup ' + cls; d.textContent = text;
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    $('#popups').appendChild(d);
    setTimeout(() => d.remove(), 1100);
  },
  project(pos) {
    const v = _v4.copy(pos).project(R.camera);
    const on = v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05;
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, on, behind: v.z > 1, nx: v.x, ny: v.y };
  },
  results(r) { this.open('results', r); },

  // ---------------------------------------------------------------- HUD
  updateHud(dt) {
    const P = G.player; if (!P) return;
    const shieldPct = clamp(P.shield / G.shieldMax, 0, 1);
    const sb = $('#shield-fill');
    sb.style.width = shieldPct * 100 + '%';
    sb.className = shieldPct < 0.25 ? 'low' : shieldPct < 0.5 ? 'mid' : '';
    $('#shield-bar').style.width = (G.shieldMax / 140) * 100 + '%';
    $('#gold-pips').innerHTML = [0, 1, 2].map((i) => `<i class="${i < G.gold ? 'on' : ''}"></i>`).join('');
    $('#hits').textContent = String(G.hits).padStart(3, '0');
    $('#bombs').innerHTML = G.attract ? '' : Array.from({ length: Math.min(G.bombs, 9) }, () => '<i class="bomb"></i>').join('');
    $('#lives').innerHTML = `<i class="life"></i>×${G.lives}`;
    const lvl = P.laserLevel;
    $('#laser').textContent = ['SINGLE', 'TWIN', 'HYPER'][lvl] + ' LASER';
    $('#laser').className = 'laser-l' + lvl;
    const wings = $('#wings');
    wings.innerHTML = P.wingHP.map((h, i) => `<i class="w${i} h${h}"></i>`).join('');
    const bf = $('#boost-fill');
    bf.style.width = P.boost * 100 + '%';
    bf.className = P.boostLock ? 'lock' : P.boosting ? 'boost' : P.braking ? 'brake' : '';
    // wingmen chips
    const wm = $('#wingmen');
    if (!wm.dataset.built) { wm.innerHTML = G.wingmen.map((w) => `<div class="wm" id="wm-${w.id}">${this.portrait(w.id)}<b><i></i></b></div>`).join(''); wm.dataset.built = 1; }
    for (const w of G.wingmen) { const el = $('#wm-' + w.id); if (!el) { wm.dataset.built = ''; break; } el.classList.toggle('out', !w.active); el.classList.toggle('trouble', !!w.trouble); el.querySelector('i').style.width = w.hp + '%'; }
    // boss bar
    if (this.boss) $('#bossfill').style.width = clamp(this.boss.hpFrac(), 0, 1) * 100 + '%';
    // markers: lock-on + off-screen important targets
    let html = '';
    if (P.lock && P.lock.alive) { const p = this.project(P.lock.worldPos()); if (p.on) html += `<div class="lock" style="left:${p.x}px;top:${p.y}px"></div>`; }
    if (G.mode === 'allrange') {
      const imp = G.ents.filter((e) => e.alive && e.hostile && e instanceof Ace);
      if (G.boss && G.boss.alive) imp.push({ worldPos: () => G.boss.pos, isBoss: true });
      for (const e of imp.slice(0, 8)) {
        const p = this.project(e.worldPos());
        if (p.on) { if (!e.isBoss) html += `<div class="tag" style="left:${p.x}px;top:${p.y}px">${e.name}</div>`; continue; }
        let nx = p.nx, ny = p.ny; if (p.behind) { nx = -nx; ny = -ny; }
        const a = Math.atan2(ny, nx);
        const ex = (Math.cos(a) * 0.44 + 0.5) * innerWidth, ey = (-Math.sin(a) * 0.42 + 0.5) * innerHeight;
        html += `<div class="offarrow ${e.isBoss ? '' : 'ace'}" style="left:${ex}px;top:${ey}px;transform:translate(-50%,-50%) rotate(${-a}rad)"></div>`;
      }
      for (const w of G.wingmen) if (w.trouble) { const p = this.project(w.pos); if (p.on) html += `<div class="tag help" style="left:${p.x}px;top:${p.y}px">HELP!</div>`; }
    } else {
      for (const w of G.wingmen) if (w.trouble) { const p = this.project(w.pos); if (p.on) html += `<div class="tag help" style="left:${p.x}px;top:${p.y}px">HELP!</div>`; }
    }
    $('#markers').innerHTML = html;
    $('#radar').style.display = G.mode === 'allrange' ? 'block' : 'none';
    if (G.mode === 'allrange') this.drawRadar();
  },
  drawRadar() {
    const c = $('#radar'), ctx = c.getContext('2d');
    const W = c.width, H = c.height, cx = W / 2, cy = H / 2, scale = (W / 2 - 8) / 900;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(8,16,40,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, W / 2 - 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, (W / 2 - 2) * 0.5, 0, TAU); ctx.strokeStyle = 'rgba(120,200,255,0.2)'; ctx.stroke();
    const P = G.player;
    const yaw = P.yaw;
    const dot = (pos, col, r) => {
      const dx = pos.x - P.pos.x, dz = pos.z - P.pos.z;
      const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw), rz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      let x = rx * scale, y = rz * scale;
      const m = Math.hypot(x, y), lim = W / 2 - 6;
      if (m > lim) { x *= lim / m; y *= lim / m; }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + x, cy + y, r, 0, TAU); ctx.fill();
    };
    if (G.boss && G.boss.alive) dot(G.boss.pos, '#ff4ab0', 7);
    for (const e of G.ents) { if (!e.alive || e.isBossPart) continue; if (e instanceof Ace) dot(e.pos, '#ffcc40', 4.5); else if (e.hostile) dot(e.pos, '#ff5a4a', 3); else if (e instanceof Pickup || e instanceof Crate) dot(e.pos, '#9fffa0', 3); }
    for (const w of G.wingmen) if (w.active) dot(w.pos, '#5ab8ff', 4);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx - 5, cy + 5); ctx.lineTo(cx + 5, cy + 5); ctx.fill();
  },
};

// ---------------------------------------------------------------- screen classes
class BaseScreen {
  constructor(id) {
    this.id = id;
    this.el = document.createElement('div');
    this.el.className = 'screen scr-' + id;
    $('#screens').appendChild(this.el);
    this.focus = 0;
  }
  footerHtml(list) { return `<div class="footer">${(list || []).map(([g, t]) => `<span>${Glyph.html(g)} ${t}</span>`).join('')}</div>`; }
  input() {}
  render() {}
}

class MenuScreen extends BaseScreen {
  constructor(id, o) { super(id); this.o = o; this.el.classList.add(o.cls || ''); }
  onOpen() { this.focus = 0; }
  list() { return this.o.items(); }
  render() {
    const items = this.list();
    this.focus = clamp(this.focus, 0, items.length - 1);
    const rows = items.map((it, i) => {
      let val = '';
      if (it.type === 'toggle') val = `<span class="val ${Settings[it.key] ? 'on' : ''}">${Settings[it.key] ? 'ON' : 'OFF'}</span>`;
      else if (it.type === 'choice') { const o = it.options.find((x) => x[0] === Settings[it.key]) || it.options[0]; val = `<span class="val choice">‹ ${o[1]} ›</span>`; }
      else if (it.type === 'slider') val = `<span class="val slider"><b style="width:${Math.round(Settings[it.key] * 100)}%"></b><em>${Math.round(Settings[it.key] * 10)}</em></span>`;
      return `<div class="item ${i === this.focus ? 'focus' : ''} ${it.disabled ? 'disabled' : ''}" data-idx="${i}"><span class="lbl">${it.label}</span>${val}</div>`;
    }).join('');
    const desc = items[this.focus] ? items[this.focus].desc || '' : '';
    const logo = this.o.logo ? `<div class="logo small">${LOGO_HTML}</div>` : '';
    const title = this.o.title ? `<h1 class="scr-title">${this.o.title}</h1>` : '';
    const side = this.o.side ? `<div class="side">${this.o.side()}</div>` : '';
    const prevScroll = this.el.querySelector('.items') ? this.el.querySelector('.items').scrollTop : 0;
    this.el.innerHTML = `<div class="panel">${logo}${title}<div class="items">${rows}</div><div class="desc">${desc}</div></div>${side}${this.footerHtml(this.o.footer)}`;
    const list = this.el.querySelector('.items');
    list.scrollTop = prevScroll;
    const f = list.querySelector('.focus');
    if (f) f.scrollIntoView({ block: 'nearest' });
  }
  input() {
    const items = this.list();
    const n = Input.nav;
    if (n === 'up' || n === 'down') {
      let f = this.focus;
      do { f = (f + (n === 'down' ? 1 : -1) + items.length) % items.length; } while (items[f].disabled && f !== this.focus);
      this.focus = f; AudioSys.play('menuMove'); this.render();
    } else if (n === 'left' || n === 'right') this.activate(n === 'left' ? -1 : 1);
    if (Input.pressed('confirm')) this.activate(0, true);
    else if (Input.pressed('back')) { this.o.onBack && this.o.onBack(); }
  }
  activate(dir, press) {
    const it = this.list()[this.focus];
    if (!it || it.disabled) return;
    if (it.type === 'toggle') { if (press || dir) { Settings[it.key] = !Settings[it.key]; AudioSys.play('menuMove'); this.o.onChange && this.o.onChange(); this.render(); } }
    else if (it.type === 'choice') {
      const idx = it.options.findIndex((x) => x[0] === Settings[it.key]);
      const ni = (idx + (dir || 1) + it.options.length) % it.options.length;
      Settings[it.key] = it.options[ni][0]; AudioSys.play('menuMove'); this.o.onChange && this.o.onChange(); this.render();
    } else if (it.type === 'slider') {
      if (dir) { Settings[it.key] = clamp(Math.round((Settings[it.key] + dir * 0.1) * 10) / 10, 0, 1); AudioSys.play('menuMove'); this.o.onChange && this.o.onChange(); this.render(); }
      else if (press) { const v = Math.round(Settings[it.key] * 10) / 10; Settings[it.key] = v >= 1 ? 0 : Math.round((v + 0.1) * 10) / 10; AudioSys.play('menuMove'); this.o.onChange && this.o.onChange(); this.render(); }
    } else if (press && it.action) { AudioSys.play('menuConfirm'); it.action(); }
  }
}

const LOGO_HTML = '<div class="logo-main"><span>STARK</span><span class="fox">FOX</span></div><div class="logo-sub">SQUADRON STARFIGHTER ACTION</div>';

class PressScreen extends BaseScreen {
  constructor() { super('press'); }
  render() {
    this.el.innerHTML = `<div class="logo big">${LOGO_HTML}</div><div class="press-start">PRESS ${Glyph.html('confirm')} TO START</div>
      <div class="press-foot">${Input.st.padConnected ? 'Controller connected' : 'Keyboard ready · connect a controller for the best experience'} · High score ${String(Save.data.high).padStart(3, '0')}</div>`;
  }
  input() { if (Input.pressed('confirm') || Input.pressed('pause')) { AudioSys.init(); UI.close(); UI.open('menu'); } }
}

class StageSelect extends BaseScreen {
  constructor() { super('stages'); this.el.classList.add('stages'); }
  onOpen() { this.focus = 0; }
  render() {
    const cards = ['corvanis', 'zeta'].map((id, i) => {
      const st = STAGES[id]; const rec = Save.data.medals[id];
      return `<div class="card ${i === this.focus ? 'focus' : ''} st-${id}" data-idx="${i}"><div class="mission-tag">MISSION ${st.number} · ${st.mode === 'rails' ? 'ON-RAILS' : 'ALL-RANGE'}</div><h2>${st.name}</h2><h3>${st.subtitle}</h3><p>${OBJECTIVES[id]}</p>
        <div class="rec">${rec ? `Best ${String(rec.best).padStart(3, '0')} hits ${rec.medal ? '<span class="medal">★ MEDAL</span>' : ''}` : 'Not yet flown'}</div><div class="rec muted">Medal: ${st.medalHits}+ hits with all wingmen</div></div>`;
    }).join('');
    this.el.innerHTML = `<h1 class="scr-title">Mission Select</h1><div class="cards">${cards}</div>${this.footerHtml([['nav', 'Choose'], ['confirm', 'Launch'], ['back', 'Back']])}`;
  }
  input() {
    const n = Input.nav;
    if (n === 'left' || n === 'right' || n === 'up' || n === 'down') { this.focus = 1 - this.focus; AudioSys.play('menuMove'); this.render(); }
    if (Input.pressed('confirm')) this.activate();
    else if (Input.pressed('back')) UI.close();
  }
  activate() { const id = ['corvanis', 'zeta'][this.focus]; UI.closeAll(); Game.loadStage(id); }
}

class TabScreen extends BaseScreen {
  constructor(id, title, tabs) { super(id); this.title = title; this.tabs = tabs; this.tab = 0; this.el.classList.add('tabs-screen'); }
  onOpen() { this.tab = 0; }
  render() {
    const t = this.tabs[this.tab];
    const tabs = this.tabs.map((x, i) => `<span class="tab ${i === this.tab ? 'on' : ''}" data-tab="${i}">${x.name}</span>`).join('');
    this.el.innerHTML = `<h1 class="scr-title">${this.title}</h1><div class="tabbar">${Glyph.html('tabL')}${tabs}${Glyph.html('tabR')}</div><div class="tab-body">${UI.glyphText(typeof t.html === 'function' ? t.html() : t.html)}</div>${this.footerHtml([['tabs', 'Switch Page'], ['nav', 'Scroll'], ['back', 'Back']])}`;
    this.el.querySelectorAll('[data-tab]').forEach((n) => n.addEventListener('click', () => { this.tab = +n.dataset.tab; this.render(); }));
  }
  scroll(d) { const b = this.el.querySelector('.tab-body'); if (b) b.scrollTop += d * 90; }
  input() {
    const n = Input.nav;
    if (Input.pressed('tabL') || n === 'left') { this.tab = (this.tab + this.tabs.length - 1) % this.tabs.length; AudioSys.play('menuMove'); this.render(); }
    if (Input.pressed('tabR') || n === 'right') { this.tab = (this.tab + 1) % this.tabs.length; AudioSys.play('menuMove'); this.render(); }
    if (n === 'up') this.scroll(-1);
    if (n === 'down') this.scroll(1);
    if (Input.pressed('back') || Input.pressed('confirm')) UI.close();
  }
}

class ResultsScreen extends BaseScreen {
  constructor() { super('results'); this.el.classList.add('results'); }
  onOpen(r) { this.r = r; this.t = 0; this.focus = 0; }
  items() {
    const r = this.r;
    const list = [];
    if (r.stage.next) list.push({ label: 'Next Mission', action: () => { UI.closeAll(); Game.loadStage(r.stage.next, { keepRun: true, wingmenOut: [] }); } });
    else list.push({ label: 'Continue', action: () => { UI.close(); UI.open('complete'); } });
    list.push({ label: 'Retry Mission', action: () => { UI.closeAll(); Game.loadStage(r.stage.id); } });
    list.push({ label: 'Title Screen', action: () => { UI.closeAll(); Game.quitToTitle(); } });
    return list;
  }
  render() {
    const r = this.r; if (!r) return;
    const k = clamp(this.t / 1.6, 0, 1);
    const acc = r.stats.shots ? Math.round((r.stats.landed / r.stats.shots) * 100) : 0;
    const wm = r.wingmen.map((w) => `<div class="wm-chip ${w.active ? '' : 'out'}">${UI.portrait(w.id)}<span>${WINGMEN[w.id].name}</span><em>${w.active ? 'OK' : 'REPAIRS'}</em></div>`).join('');
    const items = this.items().map((it, i) => `<div class="item ${i === this.focus ? 'focus' : ''}" data-idx="${i}"><span class="lbl">${it.label}</span></div>`).join('');
    this.el.innerHTML = `<div class="res-head"><div class="mission-tag">MISSION ${r.stage.number} COMPLETE</div><h1>${r.stage.name}</h1></div>
      <div class="res-body"><div class="big-stat huge"><span>ENEMIES DOWN</span><b>${String(Math.round(r.hits * k)).padStart(3, '0')}</b></div>
      <div class="res-stats"><div><span>Bonus hits</span><b>${r.stats.bonus}</b></div><div><span>Accuracy</span><b>${acc}%</b></div><div><span>Wingmen rescued</span><b>${r.stats.rescues}</b></div><div><span>Shots deflected</span><b>${r.stats.deflects}</b></div></div>
      <div class="wm-row">${wm}</div>
      <div class="medal-line ${r.medal ? 'got' : ''}">${r.medal ? '★ MEDAL EARNED' : `Medal needs ${r.stage.medalHits}+ hits with every wingman flying`}</div>
      <div class="muted">Best: ${String(r.best).padStart(3, '0')} · Campaign total: ${String(r.total).padStart(3, '0')}</div></div>
      <div class="panel small"><div class="items">${items}</div></div>${this.footerHtml([['confirm', 'Select']])}`;
  }
  input(dt) {
    if (this.t < 1.7) { this.t += dt; this.render(); if (Math.floor(this.t * 20) !== Math.floor((this.t - dt) * 20) && this.t < 1.6) AudioSys.play('menuMove', { volume: 0.3, pitch: 1.5 }); }
    const n = Input.nav;
    const items = this.items();
    if (n === 'up' || n === 'down') { this.focus = (this.focus + (n === 'down' ? 1 : items.length - 1)) % items.length; AudioSys.play('menuMove'); this.render(); }
    if (Input.pressed('confirm') && this.t > 0.4) this.activate(0, true);
  }
  activate() { const it = this.items()[this.focus]; AudioSys.play('menuConfirm'); it.action(); }
}

// ---------------------------------------------------------------- title backdrop
const Title = {
  ready: false, orbit: 0,
  async enter() {
    G.state = 'title';
    UI.closeAll();
    UI.showLoading(true);
    if (G.stageId !== 'corvanis' || !G.player || G.attract === undefined) {
      await Game.loadStage('corvanis', { attract: false });
    }
    // calm flyover: no enemies, no HUD
    for (const e of G.ents) if (e.dispose) e.dispose();
    G.ents = []; G.shots.forEach((s) => s.kill()); G.shots = []; GameTimers.length = 0;
    if (G.boss) { G.boss.dispose(); G.boss = null; }
    Rail.restore(['approach'], 'approach', 150);
    G.state = 'title'; G.cinematic = true; G.attract = false;
    UI.hud(false); UI.attractOverlay(false);
    $('#stagecard').classList.remove('show');
    Game.radioQ = []; Game.radioCur = null; Game.hideRadio();
    G.player.reset(); G.player.mesh.visible = true;
    G.wingmen.forEach((w) => { w.active = true; w.hp = 100; w.trouble = null; w.retreating = 0; });
    UI.showLoading(false);
    AudioSys.music('title');
    if (!TouchGate.active) UI.open('press');
    Input.resetIdle();
  },
  update(dt) {
    if (G.state !== 'title') return;
    this.orbit += dt * 0.12;
    Rail.s += 38 * dt;
    if (Rail.s > Rail.segs.approach.length - 300) Rail.s = 150;
    const P = G.player;
    P.controls(dt, { sx: Math.sin(G.time * 0.5) * 0.5, sy: Math.sin(G.time * 0.37) * 0.4 });
    P.updateRails(dt, Rail.s);
    P.retA.visible = P.retB.visible = false;
    for (const w of G.wingmen) w.update(dt);
    FX.update(dt);
    // slow cinematic orbit around the formation
    const a = this.orbit;
    const cp = P.pos.clone().add(V3(Math.sin(a) * 34, 9 + Math.sin(a * 0.7) * 5, Math.cos(a) * 34));
    R.camera.position.lerp(cp, 1 - Math.exp(-dt * 2));
    R.camera.up.set(0, 1, 0);
    R.camera.lookAt(P.pos.clone().add(V3(0, 2, 0)));
    R.camera.fov = 55; R.camera.updateProjectionMatrix();
    followSun(P.pos, R.sunDir);
    // idle → attract mode (10 s without input on title/menu screens)
    const top = UI.top();
    if (top && ['press', 'menu', 'stages'].includes(top.id) && Input.idleSeconds() > 10 && !TouchGate.active) {
      UI.closeAll();
      Attract.start();
    }
  },
};

// ---------------------------------------------------------------- how-to-play & about pages
const HOWTO_TABS = [
  { name: 'Controls', html: () => `
    <div class="ctrl-grid">
      <div class="ctrl"><b>{steer}</b><span>Steer / fly</span></div>
      <div class="ctrl"><b>{fire}</b><span>Fire laser · hold to charge lock-on blast</span></div>
      <div class="ctrl"><b>{rapid}</b><span>Rapid fire (hold)</span></div>
      <div class="ctrl"><b>{bomb}</b><span>Smart bomb</span></div>
      <div class="ctrl"><b>{boost}</b><span>Boost</span></div>
      <div class="ctrl"><b>{brake}</b><span>Brake</span></div>
      <div class="ctrl"><b>{rollL} {rollR}</b><span>Hold: bank hard · double-tap: barrel roll</span></div>
      <div class="ctrl"><b>{flip}</b><span>Somersault ({brake} + {flip}: U-turn in all-range)</span></div>
      <div class="ctrl"><b>{camera}</b><span>Toggle camera distance</span></div>
      <div class="ctrl"><b>{pause}</b><span>Pause menu</span></div>
    </div>
    <p class="muted center" style="display:${Input.st.lastDevice === 'pad' ? 'block' : 'none'}">Keyboard: WASD/arrows steer · Space fire · J rapid · B bomb · Shift boost · C brake · Q/E bank & roll · F somersault · V camera · Esc pause</p>` },
  { name: 'Maneuvers', html: `
    <div class="cards3">
      <div class="tipcard"><h3>Barrel Roll</h3><p>Double-tap {rollL} or {rollR}. Spinning deflects enemy lasers back at them.</p></div>
      <div class="tipcard"><h3>Somersault</h3><p>Press {flip} to loop. Enemies chasing you overshoot and end up in your sights.</p></div>
      <div class="tipcard"><h3>U-Turn</h3><p>All-range only: hold {brake} and press {flip} to reverse direction in a heartbeat.</p></div>
      <div class="tipcard"><h3>Charge Shot</h3><p>Hold {fire}. When the reticle turns yellow, sweep it over an enemy to lock on (red), then release for a homing blast. Multi-kills give BONUS hits.</p></div>
      <div class="tipcard"><h3>Boost & Brake</h3><p>{boost} / {brake} share one meter. Brake to let enemies pass, boost to outrun missiles.</p></div>
      <div class="tipcard"><h3>Route Choice</h3><p>Corvanis forks after the city — steer left for Cascade Canyon, right for Skyway Bay.</p></div>
    </div>` },
  { name: 'Items & Scoring', html: `
    <div class="cards3">
      <div class="tipcard"><h3 class="silver">Silver Ring</h3><p>Restores shield.</p></div>
      <div class="tipcard"><h3 class="gold">Gold Ring</h3><p>Restores shield. Collect 3 to expand your shield, 3 more for an extra life.</p></div>
      <div class="tipcard"><h3 class="green">Laser Upgrade</h3><p>Single → Twin → Hyper. Lost if a wing breaks off.</p></div>
      <div class="tipcard"><h3 class="blue">Wing Repair</h3><p>Reattaches broken wings so upgrades work again. Checkpoints also repair.</p></div>
      <div class="tipcard"><h3 class="red">Smart Bomb</h3><p>+1 bomb (max 9). Supply crates hide items — shoot them open.</p></div>
      <div class="tipcard"><h3>Hits & Medals</h3><p>Every kill is a hit. Earn a mission medal by beating its hit target with all three wingmen still flying. Save them when they call for HELP!</p></div>
    </div>` },
];

const ABOUT_TABS = [
  { name: 'Credits', html: `
    <div class="about"><h2>STARK FOX</h2><p class="lead">An original spiritual successor to Star Fox 64 (Nintendo, 1997). All characters, names, art, music and code here are original and procedurally generated.</p>
    <p><b>Design, code, models, music & sound:</b> generated by Claude (Anthropic, claude-opus-5-5) in Claude Code.</p>
    <p><b>Engine:</b> Three.js r180 (WebGPU renderer, TSL node materials) · Rapier 0.19.3 physics · Web Audio API · Gamepad API.</p>
    <p><b>Cast:</b> Vix Stark (lead) · Marlow (veteran) · Kestrel (ace) · Tobi (mechanic) · General Bruno · Emperor Croak · the Jackal Pack.</p></div>` },
  { name: 'Source Info', html: () => `<div class="about">${SOURCE_INFO_HTML}</div>` },
  { name: 'Engine Feedback', html: () => `<div class="about">${ENGINE_FEEDBACK_HTML}</div>` },
  { name: 'Prompt Feedback', html: () => `<div class="about">${PROMPT_FEEDBACK_HTML}</div>` },
];
