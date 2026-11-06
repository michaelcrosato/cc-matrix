const EXIT_RECORD = __EXIT_RECORD__;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const $ = (s) => document.querySelector(s);
const settingsDefaults = {
  music: 0.1,
  effects: 0.7,
  glyphs: 'ps',
  aimGuide: true,
  shake: true,
  assist: true,
};

class FieldInput {
  constructor(app) {
    this.app = app;
    this.keys = new Set();
    this.last = 'keyboard';
    this.lastAt = performance.now();
    this.pointer = { x: innerWidth * 0.65, y: innerHeight * 0.5, active: false, down: false };
    this.touches = new Map();
    this.pads = [];
    this.prev = [];
    this.navAt = 0;
    this.trickPulse = 0;
    addEventListener('keydown', (e) => this.key(e, true));
    addEventListener('keyup', (e) => this.key(e, false));
    addEventListener('blur', () => {
      this.keys.clear();
      this.pointer.down = false;
      this.touches.clear();
    });
    addEventListener('pointermove', (e) => this.move(e));
    addEventListener('pointerdown', (e) => this.down(e));
    addEventListener('pointerup', (e) => this.up(e));
    addEventListener('pointercancel', (e) => this.up(e));
    addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest('button,input,select,textarea');
      if (el && el.closest('#ui')) app.focus(el);
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || b.disabled || app.state === 'ended') return;
      app.action(b.dataset.action, b.dataset);
    });
    document.addEventListener('input', (e) => app.onSlider(e.target));
    document.addEventListener('change', (e) => app.onSetting(e.target));
  }
  note(device) {
    const was = this.last;
    this.last = device;
    this.lastAt = performance.now();
    this.app.idleSince = this.lastAt;
    if (this.app.state === 'attract') {
      this.app.toTitle();
      return true;
    }
    if (was !== device) {
      document.body.classList.toggle('touch-only', device === 'touch');
      this.app.refreshPrompts();
    }
    return false;
  }
  key(e, down) {
    if (down && this.note('keyboard')) {
      e.preventDefault();
      return;
    }
    const editing = e.target.matches('textarea,input:not([type=range]),select');
    if (editing) {
      if (down && e.code === 'Escape') {
        e.target.blur();
        this.app.back();
      }
      return;
    }
    if (down) {
      this.keys.add(e.code);
      this.app.sound.unlock().catch(() => {});
    } else this.keys.delete(e.code);
    if (
      [
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Escape',
        'Tab',
      ].includes(e.code)
    )
      e.preventDefault();
    if (!down || e.repeat) return;
    if (e.code === 'Escape') {
      this.app.back();
      return;
    }
    if (this.app.isMenu()) {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.app.navigate(1);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.app.navigate(-1);
      if (e.code === 'Tab') this.app.navigate(e.shiftKey ? -1 : 1);
      if (e.code === 'ArrowLeft') this.app.adjust(-1);
      if (e.code === 'ArrowRight') this.app.adjust(1);
      if (e.code === 'Enter' || e.code === 'Space') this.app.activate();
    }
  }
  move(e) {
    if (e.pointerType === 'touch') {
      const t = this.touches.get(e.pointerId);
      if (t) {
        t.x = e.clientX;
        t.y = e.clientY;
      }
      return;
    }
    if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) < 1) return;
    this.note('keyboard');
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.active = true;
  }
  down(e) {
    const device = e.pointerType === 'touch' ? 'touch' : 'keyboard';
    if (this.note(device)) {
      e.preventDefault();
      return;
    }
    this.app.sound.unlock().catch(() => {});
    if (e.target.closest('button,input,select,textarea,a')) return;
    if (this.app.isMenu()) return;
    if (e.pointerType === 'touch') {
      e.preventDefault();
      const left = e.clientX < innerWidth * 0.48;
      this.touches.set(e.pointerId, {
        left,
        x: e.clientX,
        y: e.clientY,
        ox: e.clientX,
        oy: e.clientY,
      });
    } else {
      if (e.button === 0) this.pointer.down = true;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.active = true;
    }
  }
  up(e) {
    this.touches.delete(e.pointerId);
    if (e.pointerType !== 'touch' && e.button === 0) this.pointer.down = false;
  }
  rumble(strength = 0.3, duration = 90) {
    const pad = this.pads[0];
    try {
      pad?.vibrationActuator
        ?.playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          weakMagnitude: strength,
          strongMagnitude: strength * 0.65,
        })
        ?.catch(() => {});
    } catch {}
  }
  poll() {
    this.pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
    const pad = this.pads[0];
    if (!pad) {
      this.prev = [];
      return;
    }
    const values = pad.buttons.map((b) => b.pressed || b.value > 0.4),
      active = values.some(Boolean) || pad.axes.some((a) => Math.abs(a) > 0.24);
    if (active) {
      if (this.note('pad')) {
        this.prev = values;
        return;
      }
      this.app.sound.unlock().catch(() => {});
    }
    const rise = (i) => values[i] && !this.prev[i];
    if (rise(9) && !values[8]) this.app.back();
    if (this.app.isMenu()) {
      if (rise(0)) this.app.activate();
      if (rise(1)) this.app.back();
      const v = values[12]
        ? -1
        : values[13]
          ? 1
          : Math.abs(pad.axes[1]) > 0.6
            ? Math.sign(pad.axes[1])
            : 0;
      const h = values[14]
        ? -1
        : values[15]
          ? 1
          : Math.abs(pad.axes[0]) > 0.6
            ? Math.sign(pad.axes[0])
            : 0;
      if ((v || h) && performance.now() > this.navAt) {
        if (v) this.app.navigate(v);
        else this.app.adjust(h);
        this.navAt = performance.now() + 210;
      }
    }
    this.prev = values;
  }
  command(id = 0) {
    const app = this.app,
      e = app.game.entities[id],
      local = app.mode === 'local';
    if (!e) return { mx: 0, mz: 0, aim: null, fire: false, trick: false };
    let mx = 0,
      mz = 0,
      aim = null,
      fire = false,
      trick = false;
    const right = local && id === 1;
    if (!right) {
      mx = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
      mz = Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW'));
      fire = this.pointer.down || this.keys.has('KeyF');
      trick = this.keys.has('Space') || this.trickPulse > 0;
      if (this.pointer.active && this.last === 'keyboard') {
        const p = app.view.pointer(this.pointer.x, this.pointer.y);
        aim = Math.atan2(p.z - e.z, p.x - e.x);
        if (app.game.stage.air && Math.hypot(mx, mz) < 0.1) {
          mx = Math.cos(aim);
          mz = Math.sin(aim);
        }
      }
    } else {
      mx = Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
      mz = Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'));
      const ax = Number(this.keys.has('KeyL')) - Number(this.keys.has('KeyJ')),
        az = Number(this.keys.has('KeyK')) - Number(this.keys.has('KeyI'));
      if (ax || az) aim = Math.atan2(az, ax);
      fire = this.keys.has('Enter') || this.keys.has('ControlRight');
      trick = this.keys.has('ShiftRight');
    }
    let pad = null;
    if (local) {
      if (this.pads.length >= 2) pad = this.pads[id];
      else if (id === 1) pad = this.pads[0];
    } else pad = this.pads[0];
    if (pad && (local || this.last === 'pad')) {
      const dead = (v) => (Math.abs(v) > 0.18 ? ((Math.abs(v) - 0.18) / 0.82) * Math.sign(v) : 0);
      const px = dead(pad.axes[0] || 0),
        pz = dead(pad.axes[1] || 0),
        ax = dead(pad.axes[2] || 0),
        az = dead(pad.axes[3] || 0);
      if (Math.hypot(px, pz) > 0.01) {
        mx = px;
        mz = pz;
      }
      if (Math.hypot(ax, az) > 0.15) aim = Math.atan2(az, ax);
      fire =
        fire ||
        !!(pad.buttons[7]?.pressed || pad.buttons[7]?.value > 0.35 || pad.buttons[5]?.pressed);
      trick = trick || !!(pad.buttons[4]?.pressed || pad.buttons[0]?.pressed);
    }
    if (this.last === 'touch' && !right) {
      let touchAim = false;
      for (const t of this.touches.values()) {
        if (t.left) {
          mx = clamp((t.x - t.ox) / 55, -1, 1);
          mz = clamp((t.y - t.oy) / 55, -1, 1);
        } else {
          const p = app.view.pointer(t.x, t.y);
          aim = Math.atan2(p.z - e.z, p.x - e.x);
          fire = true;
          touchAim = true;
          if (app.game.stage.air && !Array.from(this.touches.values()).some((t) => t.left)) {
            mx = Math.cos(aim);
            mz = Math.sin(aim);
          }
        }
      }
      if (app.settings.assist && !app.game.isHidden(app.game.entities[1 - id])) {
        const target = app.game.entities[1 - id],
          autoAim = Math.atan2(target.z - e.z, target.x - e.x);
        if (!touchAim) aim = autoAim;
        const wall = app.game.cast(
          e.x,
          e.z,
          Math.cos(autoAim),
          Math.sin(autoAim),
          Math.sqrt(sqDist(e, target)),
          (c) => app.game.colliderTags.get(c.handle)?.kind === 'wall',
        );
        if (!wall && (!app.game.stage.air || Math.abs(angleDelta(e.theta, autoAim)) < 0.4))
          fire = true;
        if (app.game.stage.bank && !touchAim) {
          const bank = app.game.bankAim(e, target);
          if (bank) {
            aim = bank.aim;
            fire = true;
          }
        }
      }
    }
    return { mx, mz, aim, fire: !!fire, trick: !!trick };
  }
}

class DuelWire {
  constructor(app) {
    this.app = app;
    this.mode = 'none';
    this.isHost = true;
    this.me = 0;
    this.ready = false;
    this.stopped = false;
    this.inputs = new Map();
    this.lastSeq = 0;
    this.lastReceive = 0;
    this.sendClock = 0;
    this.players = [
      { id: 0, name: 'RED' },
      { id: 1, name: 'GREEN' },
    ];
    this.activePlayers = new Set([0, 1]);
  }
  async initHub() {
    if (!window.AIHub?.active) return false;
    const info = await AIHub.connect({ mode: 'shared-world', seats: [2, 2] });
    if (!info) return false;
    this.mode = 'hub';
    this.isHost = info.isHost;
    this.me = info.me;
    this.server = info.server;
    this.players = info.players;
    this.host = info.host;
    this.ready = true;
    this.activePlayers = new Set(info.players.map((p) => p.id));
    this.app.mode = 'hub';
    this.app.game.start('hub');
    this.app.state = 'waiting';
    this.app.overlay = null;
    this.app.render();
    AIHub.on('start', () => {
      if (this.stopped) return;
      this.app.countdownEnd = performance.now() + Math.max(0, -AIHub.time());
      this.app.state = 'countdown';
      this.app.render();
    });
    AIHub.on('message', (data, from) => this.receive(data, from));
    AIHub.on('leave', ({ id }) => {
      this.activePlayers.delete(id);
      this.inputs.delete(id);
      this.app.toast('Rival left the field. Autopilot takes over.');
    });
    AIHub.on('time-up', () => {
      if (this.isHost) this.finishHub();
    });
    AIHub.on('end', (data) => {
      this.stopped = true;
      this.app.state = 'ended';
      this.app.overlay = null;
      this.app.sound.stop();
      this.app.input.keys.clear();
      this.app.input.pointer.down = false;
      this.app.render();
      this.endReason = data.reason;
    });
    AIHub.ready();
    return true;
  }
  receive(data, from) {
    if (this.stopped || !data || typeof data !== 'object') return;
    if (this.isHost && data.type === 'input' && this.activePlayers.has(from)) {
      const c = data.command || {};
      this.inputs.set(from, {
        mx: clamp(Number(c.mx) || 0, -1, 1),
        mz: clamp(Number(c.mz) || 0, -1, 1),
        aim: Number.isFinite(c.aim) ? c.aim : null,
        fire: !!c.fire,
        trick: !!c.trick,
        at: performance.now(),
      });
    } else if (
      !this.isHost &&
      data.type === 'world' &&
      (this.mode !== 'hub' || from === this.host)
    ) {
      if (!Number.isFinite(data.seq) || data.seq <= this.lastSeq) return;
      this.lastSeq = data.seq;
      this.lastReceive = performance.now();
      this.app.game.applySnapshot(data);
      this.app.acceptRemoteState(data);
    }
  }
  send(data) {
    if (!this.ready || this.stopped) return;
    if (this.mode === 'hub') AIHub.send(data, { reliable: false });
    else if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(data));
  }
  update(dt) {
    if (this.mode === 'none' || !this.ready || this.stopped) return;
    this.sendClock -= dt;
    if (this.sendClock > 0) return;
    this.sendClock = 1 / 12;
    if (this.isHost) {
      const s = this.app.game.snapshot(this.app.state);
      s.wait = Math.max(0, (this.app.countdownEnd - performance.now()) / 1000);
      this.send(s);
    } else if (this.app.state !== 'ended')
      this.send({
        type: 'input',
        command: this.app.isMenu()
          ? { mx: 0, mz: 0, aim: null, fire: false, trick: false }
          : this.app.input.command(this.me),
      });
  }
  commands() {
    const out = {};
    for (const e of this.app.game.entities) {
      if (e.id === this.me && !this.server)
        out[e.id] = this.app.isMenu()
          ? { mx: 0, mz: 0, aim: e.aim, fire: false, trick: false }
          : this.app.input.command(e.id);
      else {
        const c = this.inputs.get(e.id);
        if (c && performance.now() - c.at < 900) out[e.id] = c;
        else if (this.activePlayers.has(e.id))
          out[e.id] = { mx: 0, mz: 0, aim: e.aim, fire: false, trick: false };
      }
    }
    return out;
  }
  finishHub() {
    if (this.mode !== 'hub' || !this.isHost || this.finished || this.stopped) return;
    this.finished = true;
    const game = this.app.game;
    const scores = {};
    for (const id of this.activePlayers)
      scores[id] = game.totals[id] + (game.phase === 'playing' ? game.entities[id].score : 0);
    const sorted = Array.from(this.activePlayers).sort((a, b) => scores[b] - scores[a]);
    const standings = [];
    for (const id of sorted) {
      const group = standings.at(-1);
      if (group && scores[group[0]] === scores[id]) group.push(id);
      else standings.push([id]);
    }
    AIHub.finish({
      standings,
      scores,
      stats: Object.fromEntries(
        sorted.map((id) => [
          id,
          { Hits: scores[id], 'Rounds won': game.rounds.filter((r) => r.winner === id).length },
        ]),
      ),
    });
  }
  encode(desc) {
    return 'CB1.' + btoa(JSON.stringify({ type: desc.type, sdp: desc.sdp }));
  }
  decode(code) {
    const value = code.trim();
    if (!value.startsWith('CB1.')) throw new Error('That is not a Combaton invite or reply.');
    const d = JSON.parse(atob(value.slice(4)));
    if (!['offer', 'answer'].includes(d.type) || typeof d.sdp !== 'string' || d.sdp.length > 80000)
      throw new Error('The connection code is incomplete.');
    return d;
  }
  async makePeer(host) {
    this.close(false);
    if (!window.RTCPeerConnection)
      throw new Error('This browser does not support direct link play.');
    this.mode = 'rtc';
    this.isHost = host;
    this.me = host ? 0 : 1;
    this.host = 0;
    this.stopped = false;
    this.lastSeq = 0;
    this.activePlayers = new Set([0, 1]);
    this.peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.peer.onconnectionstatechange = () => {
      if (['failed', 'disconnected'].includes(this.peer?.connectionState)) {
        this.app.linkStatus = 'Connection interrupted. Return here to make a new invite.';
        this.app.toast('Link interrupted. Reconnect from Versus → Link play.');
        if (this.app.state === 'playing') {
          this.app.overlay = 'link';
          this.app.render();
        }
      }
    };
    if (host)
      this.bindChannel(
        this.peer.createDataChannel('combaton', { ordered: false, maxRetransmits: 0 }),
      );
    else this.peer.ondatachannel = (e) => this.bindChannel(e.channel);
  }
  bindChannel(channel) {
    this.channel = channel;
    channel.onmessage = (e) => {
      try {
        this.receive(JSON.parse(e.data), this.isHost ? 1 : 0);
      } catch {}
    };
    channel.onopen = () => {
      this.ready = true;
      this.app.overlay = null;
      this.app.mode = 'rtc';
      if (this.isHost) this.app.start('rtc', this.app.selectedStage);
      else {
        this.app.state = 'waiting';
        this.app.render();
      }
      this.app.toast('Direct link established. Good luck, hotshot.');
    };
    channel.onclose = () => {
      this.ready = false;
    };
  }
  async iceDone() {
    if (this.peer.iceGatheringState === 'complete') return;
    await new Promise((resolve) => {
      const timer = setTimeout(done, 6500),
        peer = this.peer;
      function done() {
        clearTimeout(timer);
        peer.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
      function check() {
        if (peer.iceGatheringState === 'complete') done();
      }
      peer.addEventListener('icegatheringstatechange', check);
    });
  }
  async createOffer() {
    await this.makePeer(true);
    await this.peer.setLocalDescription(await this.peer.createOffer());
    await this.iceDone();
    return this.encode(this.peer.localDescription);
  }
  async acceptOffer(code) {
    const d = this.decode(code);
    if (d.type !== 'offer') throw new Error('Paste the host’s invite first.');
    await this.makePeer(false);
    await this.peer.setRemoteDescription(d);
    await this.peer.setLocalDescription(await this.peer.createAnswer());
    await this.iceDone();
    return this.encode(this.peer.localDescription);
  }
  async acceptAnswer(code) {
    const d = this.decode(code);
    if (!this.peer || !this.isHost || d.type !== 'answer')
      throw new Error('Create an invite, then paste your rival’s reply.');
    await this.peer.setRemoteDescription(d);
  }
  close(reset = true) {
    this.ready = false;
    this.channel?.close();
    this.peer?.close();
    this.channel = null;
    this.peer = null;
    this.inputs.clear();
    if (reset) {
      this.mode = 'none';
      this.me = 0;
      this.isHost = true;
      this.stopped = false;
    }
  }
}

class CombatonApp {
  constructor(view, sound) {
    this.view = view;
    this.sound = sound;
    this.game = new FieldGame(view, sound);
    this.state = 'title';
    this.overlay = null;
    this.returnOverlay = null;
    this.mode = 'solo';
    this.selectedStage = 0;
    this.idleSince = performance.now();
    this.countdownEnd = 0;
    this.roundEndAt = 0;
    this.attractAt = 0;
    this.accumulator = 0;
    this.manual = false;
    this.lastHud = 0;
    this.focused = null;
    this.linkStatus = 'Create an invite or paste one from a friend.';
    this.linkOutput = '';
    try {
      this.settings = {
        ...settingsDefaults,
        ...JSON.parse(localStorage.getItem('combaton-settings') || '{}'),
      };
      this.best = Number(localStorage.getItem('combaton-best')) || 0;
    } catch {
      this.settings = { ...settingsDefaults };
      this.best = 0;
    }
    this.sound.musicVolume = clamp(this.settings.music, 0, 1);
    this.sound.effectsVolume = clamp(this.settings.effects, 0, 1);
    this.game.aimGuide = this.settings.aimGuide;
    this.view.reducedMotion =
      !this.settings.shake || matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.input = new FieldInput(this);
    this.net = new DuelWire(this);
    this.game.onEvent = (e) => this.event(e);
    this.game.initStage(0, { title: true });
  }
  isNetwork() {
    return this.net.mode !== 'none' && this.net.ready;
  }
  isMenu() {
    return (
      !!this.overlay ||
      ['title', 'briefing', 'roundEnd', 'results', 'waiting', 'ended'].includes(this.state)
    );
  }
  glyph(action) {
    if (this.input.last === 'touch') {
      const touch = {
        confirm: 'Tap',
        back: '←',
        fire: 'Hold',
        trick: '↻',
        pause: 'Ⅱ',
        move: 'Drag',
        aim: 'Touch',
      };
      return `<span class="glyph">${touch[action] || action}</span>`;
    }
    const p = this.input.last === 'pad',
      x = this.settings.glyphs === 'xbox';
    const map = p
      ? {
          confirm: x ? 'A' : '×',
          back: x ? 'B' : '○',
          fire: 'RT',
          trick: x ? 'LB' : 'L1',
          pause: '☰',
          move: 'LS',
          aim: 'RS',
        }
      : {
          confirm: 'Enter',
          back: 'Esc',
          fire: 'LMB',
          trick: 'Space',
          pause: 'Esc',
          move: 'WASD',
          aim: 'Mouse',
        };
    if (p && !x && action === 'fire') map.fire = 'R2';
    return `<span class="glyph ${p && ['confirm', 'back'].includes(action) ? 'pad' : ''}">${map[action] || action}</span>`;
  }
  prompt(action, text) {
    return `<span class="prompt"><span data-prompt="${action}">${this.glyph(action)}</span><span>${text}</span></span>`;
  }
  refreshPrompts() {
    document
      .querySelectorAll('[data-prompt]')
      .forEach((el) => (el.innerHTML = this.glyph(el.dataset.prompt)));
    this.updateHud(true);
  }
  saveSettings() {
    try {
      localStorage.setItem('combaton-settings', JSON.stringify(this.settings));
    } catch {}
  }
  focus(el) {
    if (!el || el.disabled) return;
    this.focused?.classList.remove('focused');
    this.focused = el;
    el.classList.add('focused');
  }
  focusables() {
    return Array.from(
      $('#ui').querySelectorAll('button:not(:disabled),input,select,textarea'),
    ).filter((e) => e.offsetParent !== null);
  }
  navigate(direction) {
    const els = this.focusables();
    if (!els.length) return;
    let i = els.indexOf(this.focused);
    i = (i + direction + els.length) % els.length;
    this.focus(els[i]);
    els[i].scrollIntoView({ block: 'nearest' });
    this.sound.effect('ui');
  }
  adjust(dir) {
    const f = this.focused;
    if (f?.matches('input[type=range]')) {
      const step = Number(f.step) || 1;
      f.value = clamp(Number(f.value) + dir * step, Number(f.min), Number(f.max));
      this.onSlider(f);
      return;
    }
    if (f?.matches('select')) {
      f.selectedIndex = clamp(f.selectedIndex + dir, 0, f.options.length - 1);
      this.onSetting(f);
      return;
    }
    this.navigate(dir);
  }
  activate() {
    const f = this.focused || this.focusables()[0];
    if (f?.matches('button')) f.click();
    else if (f) f.focus();
  }
  toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('visible'), 3300);
  }
  event(e) {
    if (e.type === 'fire' || e.type === 'remoteFire') this.sound.effect(e.air ? 'gun' : 'fire');
    if (e.type === 'bounce') this.sound.effect('bounce');
    if (e.type === 'deny') this.sound.effect('deny');
    if (e.type === 'trick') this.sound.effect('trick');
    if (e.type === 'hit' || e.type === 'remoteHit') this.sound.effect('hit');
    if (e.type === 'hit' || e.type === 'remoteHit') this.input.rumble(0.75, 180);
    else if (
      (e.type === 'fire' || e.type === 'remoteFire') &&
      e.id === (this.net.mode === 'none' ? 0 : this.net.me)
    )
      this.input.rumble(0.14, 45);
    else if (e.type === 'trick') this.input.rumble(0.35, 120);
    if (e.type === 'roundEnd') {
      this.state = 'roundEnd';
      this.roundEndAt = performance.now();
      this.sound.effect(e.winner === 0 ? 'win' : 'lose');
      this.render();
    }
  }
  start(mode = 'solo', stage = 0) {
    this.mode = mode;
    this.overlay = null;
    this.input.pointer.down = false;
    this.input.keys.clear();
    this.game.start(mode, stage);
    this.game.sameScreen = mode === 'local';
    this.countdownEnd = performance.now() + 3000;
    this.state = 'briefing';
    if (mode === 'hub' || mode === 'rtc') this.state = 'countdown';
    this.sound.resume();
    this.render();
  }
  begin() {
    this.overlay = null;
    this.state = 'countdown';
    this.countdownEnd = performance.now() + 3000;
    this.sound.effect('start');
    this.render();
  }
  toTitle() {
    if (this.net.mode === 'hub') return;
    if (this.net.mode === 'rtc') this.net.close();
    this.state = 'title';
    this.mode = 'solo';
    this.overlay = null;
    this.game.attract = false;
    this.game.practice = false;
    this.game.initStage(0, { title: true });
    this.idleSince = performance.now();
    this.input.pointer.down = false;
    this.input.keys.clear();
    this.render();
  }
  show(panel) {
    this.returnOverlay = this.overlay;
    this.overlay = panel;
    this.input.pointer.down = false;
    this.render();
  }
  back() {
    if (this.state === 'ended') return;
    if (this.state === 'attract') {
      this.toTitle();
      return;
    }
    if (this.overlay) {
      const current = this.overlay;
      if (current === 'pause' || current === 'versus' || current === 'link') this.overlay = null;
      else
        this.overlay =
          this.returnOverlay === 'pause' ? 'pause' : this.state === 'title' ? null : 'pause';
      this.returnOverlay = null;
      if (current === 'link' && !this.net.ready) this.net.close();
      this.render();
      return;
    }
    if (this.state === 'playing' || this.state === 'countdown') {
      this.overlay = 'pause';
      this.input.pointer.down = false;
      this.render();
    } else if (this.state === 'briefing') this.toTitle();
    else if (this.state === 'title') this.show('settings');
  }
  next() {
    if (this.isNetwork() && !this.net.isHost) return;
    if (this.mode === 'solo' || this.mode === 'hub') {
      if (this.game.rounds.length >= 5) {
        this.finishExercise();
        return;
      }
      this.game.advance();
      this.state = this.mode === 'hub' ? 'countdown' : 'briefing';
      this.countdownEnd = performance.now() + 3000;
      this.overlay = null;
      this.render();
    } else {
      this.game.initStage(this.selectedStage);
      this.begin();
    }
  }
  finishExercise() {
    this.state = 'results';
    this.overlay = null;
    if (this.mode === 'hub') {
      this.net.finishHub();
      return;
    }
    const score = this.game.totals[0];
    if (score > this.best) {
      this.best = score;
      try {
        localStorage.setItem('combaton-best', String(score));
      } catch {}
    }
    this.render();
  }
  acceptRemoteState(data) {
    if (this.state === 'ended') return;
    const old = this.state;
    if (data.state === 'countdown')
      this.countdownEnd = performance.now() + Math.max(0, data.wait || 0) * 1000;
    this.state = data.state;
    if (old !== this.state) this.render();
  }
  async action(action, data = {}) {
    this.sound.effect('ui');
    if (this.state === 'attract') {
      this.toTitle();
      return;
    }
    if (action === 'solo') {
      this.net.close();
      this.start('solo');
    } else if (action === 'versus') this.show('versus');
    else if (action === 'local') {
      this.net.close();
      this.start('local', this.selectedStage);
    } else if (action === 'link') this.show('link');
    else if (action === 'howto' || action === 'settings' || action === 'about' || action === 'dev')
      this.show(action);
    else if (action === 'back' || action === 'pause') this.back();
    else if (action === 'resume') {
      this.overlay = null;
      this.render();
    } else if (action === 'begin') this.begin();
    else if (action === 'next') this.next();
    else if (action === 'retry') {
      this.game.rounds.pop();
      const r = this.game.entities.map((e) => e.score);
      this.game.totals = this.game.totals.map((v, i) => v - r[i]);
      this.game.initStage(this.game.stageIndex);
      this.state = 'briefing';
      this.overlay = null;
      this.render();
    } else if (action === 'restart') {
      if (this.net.mode === 'hub') return;
      this.game.initStage(this.game.stageIndex);
      this.begin();
    } else if (action === 'title') {
      if (this.net.mode !== 'hub') this.toTitle();
    } else if (action === 'stage') {
      this.selectedStage = Number(data.index);
      if (this.overlay === 'dev') {
        this.game.initStage(this.selectedStage);
        this.state = 'playing';
      }
      this.render();
    } else if (action === 'practice') {
      this.net.close();
      this.start('practice', this.selectedStage);
    } else if (action === 'toggle') {
      this.settings[data.key] = !this.settings[data.key];
      this.applySettings();
      this.render();
    } else if (action === 'dev-toggle') {
      this.game[data.key] = !this.game[data.key];
      this.render();
    } else if (action === 'reset-tuning') {
      this.game.resetTuning();
      this.render();
    } else if (action === 'skip') {
      this.overlay = null;
      this.game.finish();
    } else if (action === 'trick') {
      this.input.trickPulse = 3;
    } else if (action === 'fullscreen') {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        this.toast('Fullscreen is unavailable in this browser.');
      }
    } else if (action === 'offer' || action === 'join' || action === 'answer') {
      const code = $('#link-input')?.value || '';
      this.linkStatus = 'Gathering a direct connection…';
      this.render();
      try {
        if (action === 'offer') {
          this.linkOutput = await this.net.createOffer();
          this.linkStatus = 'Invite ready. Send it to your rival; paste their reply below.';
        }
        if (action === 'join') {
          this.linkOutput = await this.net.acceptOffer(code);
          this.linkStatus = 'Reply ready. Send it back to the host, then leave this page open.';
        }
        if (action === 'answer') {
          await this.net.acceptAnswer(code);
          this.linkStatus = 'Connecting. The duel starts automatically.';
        }
        if (this.overlay === 'link') this.render();
      } catch (e) {
        this.linkStatus = e.message;
        this.render();
      }
    } else if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(this.linkOutput);
        this.toast('Connection code copied.');
      } catch {
        const el = $('#link-output');
        el?.select();
        this.toast('Select and copy the highlighted connection code.');
      }
    }
  }
  applySettings() {
    this.sound.musicVolume = Number(this.settings.music);
    this.sound.effectsVolume = Number(this.settings.effects);
    this.sound.applyVolumes();
    this.game.aimGuide = !!this.settings.aimGuide;
    this.view.reducedMotion =
      !this.settings.shake || matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.saveSettings();
  }
  onSlider(el) {
    if (el.dataset.setting) {
      this.settings[el.dataset.setting] = Number(el.value);
      this.applySettings();
    } else if (el.dataset.tuning) this.game.tune(el.dataset.tuning, el.value);
    else return;
    const output = el.closest('.settings-row')?.querySelector('output');
    if (output)
      output.textContent = el.dataset.setting
        ? Math.round(el.value * 100) + '%'
        : Number(el.value).toFixed(Number(el.step) < 1 ? 2 : 0);
  }
  onSetting(el) {
    if (!el.dataset.setting) return;
    this.settings[el.dataset.setting] = el.value;
    this.applySettings();
    this.refreshPrompts();
  }
  shell(content, { wide = false, title = '', eyebrow = 'FIELD MANUAL' } = {}) {
    return `<div class="overlay"><section class="panel ${wide ? 'wide' : ''}"><div class="panel-header"><div><div class="eyebrow">${eyebrow}</div>${title ? `<h2>${title}</h2>` : ''}</div><button class="back" data-action="back" aria-label="Back">←</button></div>${content}</section></div>`;
  }
  stagePicker() {
    return `<div class="stage-picker">${STAGES.map((s, i) => `<button class="stage-card ${i === this.selectedStage ? 'active' : ''}" data-action="stage" data-index="${i}"><b>0${i + 1}</b><span>${s.short}</span></button>`).join('')}</div>`;
  }
  titleHTML() {
    return `<section class="title-screen"><div class="topbar"><div class="brandmark"><b>c→</b><span>FIELD EQUIPMENT / NO. 077</span></div><div class="edition">1977 SPIRIT. NEW TRICKS.</div></div><div class="title-copy"><span class="tag">ARCADE VEHICLE DUELS</span><h1>COMBATON</h1><p class="strap">GOOD AIM.<br>BAD INTENTIONS.</p><p class="intro">Tanks. Planes. Questionable tactics.<br>Five ways to out-fox your rival.</p><div class="title-buttons"><button class="primary" data-action="solo"><span>FIELD EXERCISE <small style="display:block;font-size:12px;font-weight:500;opacity:.65;margin-top:4px;letter-spacing:.1em">SOLO · FIVE ROUNDS</small></span><span class="arrow">↗</span></button><button class="secondary" data-action="versus"><span>VERSUS <em>BRING A RIVAL</em></span><span>2P</span></button></div><div class="title-links"><button data-action="howto">How to play</button><button data-action="settings">Settings</button><button data-action="about">About</button></div></div><div class="title-callout">BANK ON IT.</div><div class="title-caption"><span>FIG. 01</span> &nbsp; THE ART OF THE REBOUND</div><div class="title-footer">${this.prompt('confirm', 'Select')}<span>${this.best ? `PERSONAL BEST: ${this.best} HITS` : 'ONE HIT. ONE POINT. NO EXCUSES.'} &nbsp; / &nbsp; INSPIRED BY COMBAT (1977)</span></div></section>`;
  }
  pauseHTML() {
    const hub = this.net.mode === 'hub';
    return this.shell(
      `<div class="menu-list"><button class="primary" data-action="resume">RESUME <span>↗</span></button>${hub ? '' : `<button class="secondary" data-action="restart" ${this.net.mode === 'rtc' && !this.net.isHost ? 'disabled' : ''}>Restart round</button>`}<button class="secondary" data-action="settings">Settings</button><button class="secondary" data-action="howto">How to play</button>${hub ? '' : `<button class="secondary" data-action="dev" ${this.net.mode === 'rtc' ? 'disabled' : ''}>Developer tools</button>`}<button class="secondary" data-action="about">About & credits</button>${hub ? '' : `<button class="small" data-action="title">End exercise → Title</button>`}</div>${this.isNetwork() ? '<p class="key-note" style="margin-top:22px">The shared field keeps moving while this menu is open.</p>' : ''}`,
      { title: 'HOLD YOUR FIRE.', eyebrow: 'PAUSED / ' + STAGES[this.game.stageIndex].short },
    );
  }
  howtoHTML() {
    return this.shell(
      `<div class="controls-grid"><div class="control-card"><span class="number">01 / GET MOVING</span><h3>THINK SMALL.<br>SHOOT SMART.</h3><p>One hit scores one point. First to ${this.game.tuning.target} hits wins the round, or lead when the clock runs out. Your own shells are harmless to you.</p></div><div class="control-card"><span class="number">02 / MIX IT UP</span><h3>FIVE FIELDS.<br>FIVE DIRTY TRICKS.</h3><p>Guided shells bend while fire is held. Bank rounds need a rebound. Cloaked tanks reveal when firing or bumping. Aircraft keep flying and wrap at the edges.</p></div></div><div class="howto-prompts">${this.prompt('move', 'Move / steer')}${this.prompt('aim', 'Aim')}${this.prompt('fire', 'Fire / guide')}${this.prompt('trick', 'Smoke / scan / roll')}${this.prompt('pause', 'Pause')}</div><p class="key-note" style="margin-top:25px">On touch: drag the left side to move. Touch the right side to aim and fire. Aim and firing assistance are on by default. A trick button appears when useful.</p><p class="key-note">Same-screen P2: arrows move · IJKL aim · Enter fire · Right Shift trick. One connected pad controls P2; two pads control P1 and P2.</p><div class="panel-footer"><button class="primary" data-action="back">GOT IT <span>↗</span></button></div>`,
      { wide: true, title: 'AIM. FIRE. OUT-FOX.' },
    );
  }
  settingsHTML() {
    return this.shell(
      `<div class="settings-row"><label>Music<small>Procedural field-band groove</small></label><input aria-label="Music volume" type="range" data-setting="music" min="0" max="1" step=".05" value="${this.settings.music}"><output>${Math.round(this.settings.music * 100)}%</output></div><div class="settings-row"><label>Effects & voices</label><input aria-label="Effects volume" type="range" data-setting="effects" min="0" max="1" step=".05" value="${this.settings.effects}"><output>${Math.round(this.settings.effects * 100)}%</output></div><div class="settings-row"><label for="glyphs">Controller symbols</label><select id="glyphs" data-setting="glyphs"><option value="ps" ${this.settings.glyphs === 'ps' ? 'selected' : ''}>PlayStation · × ○ □ △</option><option value="xbox" ${this.settings.glyphs === 'xbox' ? 'selected' : ''}>Xbox · A B X Y</option></select></div>${[
        ['aimGuide', 'Dotted aim guide'],
        ['shake', 'Camera punch'],
        ['assist', 'Touch aim & fire assist'],
      ]
        .map(
          ([key, label]) =>
            `<div class="settings-row"><label>${label}</label><button class="toggle ${this.settings[key] ? 'on' : ''}" data-action="toggle" data-key="${key}">${this.settings[key] ? 'ON' : 'OFF'}</button></div>`,
        )
        .join(
          '',
        )}<div class="panel-footer"><button class="secondary" data-action="fullscreen">Fullscreen ↗</button><button class="primary" data-action="back">DONE <span>↗</span></button></div>`,
      { title: 'YOUR FIELD KIT.' },
    );
  }
  devHTML() {
    const sliders = [
      ['speed', 'Vehicle speed', 3, 13, 0.5],
      ['shellSpeed', 'Shell speed', 12, 48, 1],
      ['reload', 'Tank reload / seconds', 0.2, 1.4, 0.05],
      ['ai', 'Rival skill', 0.1, 1, 0.05],
      ['roundSeconds', 'Round length / seconds', 20, 150, 5],
      ['target', 'Hits to win', 1, 12, 1],
      ['timeScale', 'Simulation speed', 0.25, 3, 0.25],
    ];
    return this.shell(
      `<p class="key-note">All tuning applies live. Round length sets the current clock. Practice has no time limit.</p>${sliders.map(([key, label, min, max, step]) => `<div class="settings-row"><label>${label}</label><input aria-label="${label}" type="range" data-tuning="${key}" min="${min}" max="${max}" step="${step}" value="${this.game.tuning[key]}"><output>${this.game.tuning[key].toFixed(step < 1 ? 2 : 0)}</output></div>`).join('')}<div class="settings-row"><label>Invincible P1</label><button class="toggle ${this.game.invincible ? 'on' : ''}" data-action="dev-toggle" data-key="invincible">${this.game.invincible ? 'ON' : 'OFF'}</button><label>Autopilot P1</label><button class="toggle ${this.game.autoPilot ? 'on' : ''}" data-action="dev-toggle" data-key="autoPilot">${this.game.autoPilot ? 'ON' : 'OFF'}</button></div><div class="settings-row"><label>Physics overlay</label><button class="toggle ${this.game.debug ? 'on' : ''}" data-action="dev-toggle" data-key="debug">${this.game.debug ? 'ON' : 'OFF'}</button></div>${this.stagePicker()}<div class="panel-footer"><button class="secondary" data-action="reset-tuning">Reset defaults</button><button class="secondary" data-action="skip">Finish round</button><button class="primary" data-action="resume">BACK TO THE FIELD <span>↗</span></button></div>`,
      { wide: true, title: 'UNDER THE HOOD.', eyebrow: 'DEVELOPER TOOLS / LIVE TUNING' },
    );
  }
  versusHTML() {
    return this.shell(
      `<p>Pick your patch of trouble. Five hits settles it.</p>${this.stagePicker()}<div class="menu-list"><button class="primary" data-action="local">SAME SCREEN <span>2P ↗</span></button><button class="secondary" data-action="link">LINK PLAY <span>↗</span></button><button class="secondary" data-action="practice">PRACTICE RANGE <span>1P ↗</span></button></div><p class="key-note" style="margin-top:24px">Two pads, or keyboard + one pad. Link play connects two devices using an invite and reply. AI Hub sessions connect automatically.</p>`,
      { wide: true, title: 'PICK A RIVAL.', eyebrow: 'VERSUS / LOCAL & ONLINE' },
    );
  }
  linkHTML() {
    return this.shell(
      `<div class="network-steps"><span><b>01 / INVITE</b>Host creates and sends a code.</span><span><b>02 / REPLY</b>Rival pastes it and sends the reply.</span><span><b>03 / DUEL</b>Host pastes the reply. Engines on.</span></div><div class="network-status" role="status">${esc(this.linkStatus)}</div><div class="panel-footer" style="margin-top:15px"><button class="primary" data-action="offer">CREATE INVITE <span>↗</span></button></div>${this.linkOutput ? `<label class="eyebrow" style="display:block;margin-top:24px">YOUR ${this.net.isHost ? 'INVITE' : 'REPLY'}</label><textarea id="link-output" class="codebox" readonly aria-label="Your connection code">${esc(this.linkOutput)}</textarea><button class="small" data-action="copy">Copy code</button>` : ''}<label class="eyebrow" style="display:block;margin-top:24px">PASTE INVITE OR REPLY</label><textarea id="link-input" class="codebox" placeholder="CB1.…" aria-label="Paste connection code"></textarea><div class="panel-footer"><button class="secondary" data-action="join">JOIN INVITE</button><button class="secondary" data-action="answer" ${this.net.mode === 'rtc' && this.net.isHost ? '' : 'disabled'}>CONNECT REPLY</button></div><p class="key-note" style="margin-top:20px">Direct WebRTC. Keep both pages open. Public STUN helps peers find each other; restrictive networks may require a different connection. Same-screen and AI Hub play are also available.</p>`,
      {
        wide: true,
        title: 'PASS THE INVITE.',
        eyebrow: 'LINK PLAY / ' + STAGES[this.selectedStage].short,
      },
    );
  }
  briefingHTML() {
    const s = this.game.stage;
    return this.shell(
      `<div class="briefing"><div class="diagram">${s.vehicle === 'tank' ? '↗' : s.vehicle === 'jet' ? '➤' : '✈'}</div><div><div class="eyebrow">${s.label}</div><h2>${s.name}</h2><p>${s.tip}</p><p style="margin-top:15px;font-weight:700">${s.rule}</p></div></div><div class="howto-prompts">${this.prompt('move', 'Move')}${this.prompt('fire', 'Fire / guide')}${this.prompt('trick', s.trick)}</div><div class="panel-footer"><button class="primary" data-action="begin">LET’S MAKE SOME NOISE <span>↗</span></button></div>`,
      {
        wide: true,
        eyebrow:
          this.mode === 'practice'
            ? 'PRACTICE RANGE'
            : `FIELD EXERCISE / 0${this.game.stageIndex + 1} OF 05`,
      },
    );
  }
  roundHTML() {
    const g = this.game,
      a = g.entities[0],
      b = g.entities[1],
      w = g.winner,
      network = this.isNetwork(),
      host = this.net.isHost;
    return this.shell(
      `<div class="round-stamp">${w === -1 ? 'DEAD HEAT.' : w === 0 ? 'RED TAKES IT.' : 'GREEN TAKES IT.'}</div><div class="round-score"><div><small>${esc(this.name(0))}</small>${a.score}</div><span class="sep">:</span><div><small>${esc(this.name(1))}</small>${b.score}</div></div><p class="round-notes">${g.stage.name} · ${a.stats.hits} hits · ${a.stats.banks} bank shots · ${a.stats.tricks} tricks</p><div class="panel-footer">${!network || host ? `<button class="primary" data-action="next">${this.mode === 'solo' ? (g.rounds.length >= 5 ? 'FIELD REPORT' : 'NEXT EXERCISE') : 'REMATCH'} <span>↗</span></button>` : '<p>Waiting for the host…</p>'}${!network && this.mode === 'solo' ? '<button class="secondary" data-action="retry">Try this round again</button>' : ''}${!network && this.mode !== 'solo' ? '<button class="secondary" data-action="title">Back to title</button>' : ''}</div>${this.net.mode === 'hub' ? '<p class="key-note" style="margin-top:18px">Next exercise starts automatically.</p>' : ''}`,
      { title: 'ROUND COMPLETE.', eyebrow: `FIELD 0${g.stageIndex + 1} / ${g.stage.short}` },
    );
  }
  resultsHTML() {
    const g = this.game,
      wins = g.rounds.filter((r) => r.winner === 0).length,
      grade = wins >= 4 ? 'FIELD ACE.' : wins >= 2 ? 'SHARP SHOOTER.' : 'DANGEROUS COMPANY.';
    return this.shell(
      `<div class="round-stamp">${grade}</div><div class="scoreboard"><div><strong>${g.totals[0]}</strong><span> YOUR HITS</span></div><div><strong>${wins} / 5</strong><span> ROUNDS WON</span></div></div><div class="results-ribbons">${g.rounds.map((r, i) => `<div class="ribbon ${r.winner === 0 ? 'won' : ''}">${r.winner === 0 ? '★' : r.winner === -1 ? '=' : '·'}<small>${STAGES[i].short}</small></div>`).join('')}</div><p class="round-notes">Five fields. Every trick in the book. ${wins >= 3 ? 'The training grounds are yours.' : 'A rematch ought to settle it.'}<br>Personal best: ${this.best} hits.</p><div class="panel-footer"><button class="primary" data-action="solo">ANOTHER EXERCISE <span>↗</span></button><button class="secondary" data-action="title">Back to title</button></div>`,
      { wide: true, title: 'YOUR FIELD REPORT.', eyebrow: 'EXERCISE COMPLETE / 05 OF 05' },
    );
  }
  aboutHTML() {
    const r = EXIT_RECORD;
    return this.shell(
      `<p>An original arcade duel inspired by Atari’s <em>Combat</em> (1977). Procedural models, textures, animation and audio. Built by OpenAI’s coding agent.</p><div class="credits-sections"><section><h3>Source Information</h3><dl>${Object.entries(
        r.sourceInformation,
      )
        .map(([k, v]) => `<dt>${esc(k.replace(/([A-Z])/g, ' $1'))}</dt><dd>${esc(v)}</dd>`)
        .join(
          '',
        )}</dl><p style="margin-top:22px"><a href="https://atari.com/pages/combat" ${this.net.mode === 'hub' ? 'onclick="return false"' : ''}>Atari source & manual</a><a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" ${this.net.mode === 'hub' ? 'onclick="return false"' : ''}>AI Hub protocol</a></p></section><section>${[
        ['Testing Feedback', r.testingFeedback],
        ['Engine Feedback', r.engineFeedback],
        ['Prompt Feedback', r.promptFeedback],
      ]
        .map(
          ([title, answers]) =>
            `<h3 style="margin-top:15px">${title}</h3><ol>${answers.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>`,
        )
        .join(
          '',
        )}<h3>Software credits</h3><p style="margin-top:12px">Three.js — MIT · Rapier — Apache-2.0 · AI Hub session client — upstream project. Barlow Condensed & DM Sans — SIL Open Font License. All game artwork is generated in code.</p></section></div><div class="panel-footer"><button class="primary" data-action="back">BACK <span>↗</span></button></div>`,
      { wide: true, title: 'BEHIND THE BLAST.', eyebrow: 'ABOUT / CREDITS / FIELD NOTES' },
    );
  }
  name(id) {
    if (this.net.mode !== 'none' && this.net.ready)
      return this.net.players.find((p) => p.id === id)?.name || ['RED', 'GREEN'][id];
    return id === 0 ? 'RED / YOU' : this.mode === 'local' ? 'GREEN / P2' : 'GREEN / RIVAL';
  }
  render() {
    document.body.dataset.state = this.state;
    let html = '';
    if (this.state === 'title') html = this.titleHTML();
    else if (this.state === 'briefing') html = this.briefingHTML();
    else if (this.state === 'roundEnd') html = this.roundHTML();
    else if (this.state === 'results') html = this.resultsHTML();
    else if (this.state === 'attract')
      html =
        '<div class="attract-top">COMBATON / LIVE FIELD TEST</div><div class="attract-banner">DEMONSTRATION <span>Any input returns to the title</span></div>';
    else if (this.state === 'waiting')
      html =
        '<div class="attract-banner">ENGINES READY <span>Waiting for the shared field…</span></div>';
    else if (this.state === 'ended')
      html =
        '<div class="attract-banner">FIELD TEST COMPLETE <span>Results are with the Hub.</span></div>';
    if (this.overlay) {
      const panels = {
        pause: () => this.pauseHTML(),
        settings: () => this.settingsHTML(),
        howto: () => this.howtoHTML(),
        dev: () => this.devHTML(),
        versus: () => this.versusHTML(),
        link: () => this.linkHTML(),
        about: () => this.aboutHTML(),
      };
      html += panels[this.overlay]?.() || '';
    }
    $('#ui').innerHTML = html;
    this.focused = null;
    const list = this.focusables();
    this.focus(list.find((e) => e.classList.contains('primary')) || list[0]);
    const playing = ['playing', 'countdown', 'attract'].includes(this.state);
    $('#hud').hidden = !playing;
    $('#pause-button').hidden =
      !['playing', 'countdown'].includes(this.state) || this.state === 'ended';
    $('#announcements').textContent = '';
    this.updateHud(true);
  }
  updateHud(force = false) {
    if (!this.game.entities.length) return;
    if (!force && performance.now() - this.lastHud < 80) return;
    this.lastHud = performance.now();
    const g = this.game,
      a = g.entities[0],
      b = g.entities[1],
      t = Math.ceil(g.timeLeft),
      time = g.practice ? '∞' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const score = (e, id) =>
      `<div class="player-score ${id ? 'p2' : ''}"><div class="num" style="color:${id ? 'var(--green)' : 'var(--orange)'}">${e.score}</div><div><div class="name">${esc(this.name(id))}</div><div class="bars">${[0, 1, 2].map((i) => `<i class="${!g.stage.air && e.ammo < i + 0.85 ? 'empty' : ''}"></i>`).join('')}</div></div></div>`;
    const local = g.entities[this.net.mode === 'none' ? 0 : this.net.me] || a;
    $('#hud').innerHTML =
      `<div class="hud-top">${score(a, 0)}<div class="hud-center"><div class="time">${time}</div><div class="stage">0${g.stageIndex + 1} / ${g.stage.short}</div></div>${score(b, 1)}</div><div class="hud-bottom"><div class="hud-rule"><b>${g.stage.label}</b>${g.stage.rule}</div><div class="hud-actions">${this.prompt('fire', 'FIRE')}${this.prompt('trick', local.trickCooldown > 0 ? `${g.stage.trick} ${Math.ceil(local.trickCooldown)}s` : g.stage.trick + ' READY')}${this.prompt('pause', 'MENU')}</div></div>`;
    const useful =
      g.stage.ghost ||
      g.shots.some((s) => s.owner !== local.id && sqDist(local, s) < 45) ||
      g.stage.air;
    $('#touch-trick').hidden = !(
      this.input.last === 'touch' &&
      this.state === 'playing' &&
      !this.overlay &&
      local.trickCooldown <= 0 &&
      useful
    );
  }
  frame(dt) {
    this.input.poll();
    const g = this.game,
      now = performance.now();
    if (this.state === 'title' && !this.overlay && now - this.idleSince >= 10000) {
      this.state = 'attract';
      g.start('attract', 0);
      this.attractAt = now;
      this.render();
    }
    if (this.state === 'attract' && now - this.attractAt > 14000) {
      g.initStage((g.stageIndex + 1) % 5);
      g.attract = true;
      this.attractAt = now;
      this.render();
    }
    if (this.state === 'countdown') {
      const left =
        this.net.mode === 'hub' ? -AIHub.time() / 1000 : (this.countdownEnd - now) / 1000;
      $('#announcements').innerHTML =
        left > 0 ? `${Math.ceil(Math.min(left, 3))}<small>${g.stage.label}</small>` : '';
      if (left <= 0 && (this.net.mode === 'none' || this.net.isHost)) {
        this.state = 'playing';
        $('#announcements').innerHTML = '';
        this.render();
      }
    }
    if (
      this.state === 'roundEnd' &&
      this.net.mode === 'hub' &&
      this.net.isHost &&
      now - this.roundEndAt > 3500
    )
      this.next();
    const sim =
      (this.state === 'playing' || this.state === 'attract') && (!this.overlay || this.isNetwork());
    if (sim && (this.net.mode === 'none' || this.net.isHost)) {
      let inputs = {};
      if (this.state === 'attract') inputs = {};
      else if (this.isNetwork()) inputs = this.net.commands();
      else {
        if (!g.autoPilot) inputs[0] = this.input.command(0);
        if (this.mode === 'local') inputs[1] = this.input.command(1);
      }
      this.accumulator += dt * g.tuning.timeScale;
      let loops = 0;
      while (this.accumulator >= STEP && loops++ < 20) {
        g.tick(STEP, inputs);
        this.accumulator -= STEP;
        if (g.phase !== 'playing') break;
      }
      if (loops >= 20) this.accumulator = 0;
    } else this.accumulator = 0;
    this.input.trickPulse = Math.max(0, this.input.trickPulse - 1);
    this.net.update(dt);
    this.view.update(dt, g, this.net.mode === 'none' ? 0 : this.net.me);
    this.drawPhysics();
    if (!this.net.server) this.view.render();
    this.updateHud();
    if (this.state !== 'ended') {
      const e = g.entities[this.net.mode === 'none' ? 0 : this.net.me];
      this.sound.update(
        sim && e ? Math.min(1, Math.hypot(e.vx, e.vz) / g.tuning.speed) : 0,
        g.stage.air,
      );
    }
  }
  drawPhysics() {
    if (!this.game.debug) {
      if (this.debugLines) {
        this.view.scene.remove(this.debugLines);
        this.debugLines.geometry.dispose();
        this.debugLines = null;
      }
      return;
    }
    const data = this.game.world.debugRender();
    if (!this.debugLines) {
      this.debugLines = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
      );
      this.debugLines.renderOrder = 10;
      this.view.scene.add(this.debugLines);
    }
    this.debugLines.geometry.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3));
    this.debugLines.geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 4));
  }
}

async function boot() {
  try {
    $('#load-status').textContent = 'Loading the field kit…';
    await RAPIER.init();
    const view = new FieldView($('#world'));
    $('#load-status').textContent = 'Inking the arena…';
    await view.init();
    await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);
    const sound = new SoundDesk(),
      app = new CombatonApp(view, sound);
    window.Combaton = {
      app,
      game: app.game,
      view,
      sound,
      net: app.net,
      stages: STAGES,
      defaults: DEFAULTS,
      ready: true,
      versions: { three: THREE.REVISION, rapier: RAPIER.version(), backend: view.backend },
      offlineAudio: SoundDesk.offlineCheck,
    };
    const hub = await app.net.initHub();
    if (!hub) app.render();
    let before = performance.now();
    function loop(now) {
      const dt = Math.min(0.12, Math.max(0.001, (now - before) / 1000));
      before = now;
      if (!app.manual) app.frame(dt);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    if (window.AIHub?.active) AIHub.fail('Combaton could not initialize: ' + e.message);
    $('#ui').innerHTML =
      `<div class="loading"><div class="eyebrow">FIELD EQUIPMENT / INITIALIZATION</div><h2>ENGINE TROUBLE.</h2><p style="max-width:650px;text-align:center;padding:24px">${esc(e.message)}<br>Check the connection to the pinned engine dependencies, then reload.</p><button class="primary" onclick="location.reload()">TRY AGAIN ↗</button></div>`;
    window.CombatonError = e.message;
  }
}
boot();
