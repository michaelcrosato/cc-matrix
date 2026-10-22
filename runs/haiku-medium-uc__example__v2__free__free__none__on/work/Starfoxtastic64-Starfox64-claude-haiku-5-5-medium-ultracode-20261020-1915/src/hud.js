// In-flight HUD: DOM overlay. Large, high-contrast readouts for a 10-foot viewing distance.
// Lock reticles and the ship's aim marker are projected from 3D each frame.
import * as THREE from 'three/webgpu';
import { pad } from './util.js';

const SPEAKERS = {
  marlow: { name: 'CMDR MARLOW', color: '#7fd4ff' },
  rook: { name: 'ROOK', color: '#8fd0ff' },
  tully: { name: 'TULLY', color: '#9fffb2' },
};

const _p = new THREE.Vector3();
const FORK_RANGE = 1400;

export class HUD {
  constructor(root) {
    this.root = root;
    this.el = (id) => root.querySelector(`#${id}`);
    this.shieldFill = this.el('hud-shield-fill');
    this.shieldText = this.el('hud-shield-text');
    this.bombs = this.el('hud-bombs');
    this.laserMode = this.el('hud-laser');
    this.score = this.el('hud-score');
    this.kills = this.el('hud-kills');
    this.stageCard = this.el('hud-stage');
    this.stageName = this.el('hud-stage-name');
    this.stageSub = this.el('hud-stage-sub');
    this.radioBox = this.el('hud-radio');
    this.radioWho = this.el('hud-radio-who');
    this.radioText = this.el('hud-radio-text');
    this.toastEl = this.el('hud-toast');
    this.bossBar = this.el('hud-boss');
    this.bossFill = this.el('hud-boss-fill');
    this.bossName = this.el('hud-boss-name');
    this.locksEl = this.el('hud-locks');
    this.aimEl = this.el('hud-aim');
    this.routeEl = this.el('hud-route');
    this.damageEl = this.el('hud-damage');
    this.flashEl = this.el('hud-flash');
    this.lockStatus = this.el('hud-lock-status');
    this.attractEl = this.el('hud-attract');
    this.popEl = this.el('hud-pops');
    this.timeEl = this.el('hud-time');

    this.radioQueue = [];
    this.radioTimer = 0;
    this.toastTimer = 0;
    this.stageTimer = 0;
    this.damageTimer = 0;
    this.flashTimer = 0;
    this.shieldPulse = 0;
    this.lockEls = [];
    this.lastBombs = -1;
    this.lastScore = -1;
    this.lastKills = -1;
    this.lastShield = -1;
    this.lastLaser = -1;
    this.bossSeen = false;
    this.fork = null;
  }

  setVisible(on) {
    this.root.classList.toggle('hidden', !on);
  }

  setAttract(on) {
    this.attractEl.classList.toggle('hidden', !on);
  }

  beginStage(stage) {
    this.stageName.textContent = stage.name;
    this.stageSub.textContent = stage.sub;
    this.stageCard.classList.remove('hidden');
    this.stageTimer = 3.2;
    this.bossBar.classList.add('hidden');
    this.bossSeen = false;
    this.fork = stage.fork;
    this.radioQueue.length = 0;
    this.radioBox.classList.add('hidden');
    this.toastEl.classList.add('hidden');
    this.routeEl.classList.add('hidden');
    this.lastScore = -1;
    this.lastKills = -1;
    this.lastShield = -1;
    this.lastLaser = -1;
    this.popEl.textContent = '';
  }

  radio(who, text) {
    this.radioQueue.push({ who, text });
  }

  toast(text, hex = 0xffffff) {
    this.toastEl.textContent = text;
    this.toastEl.style.color = `#${hex.toString(16).padStart(6, '0')}`;
    this.toastEl.classList.remove('hidden');
    this.toastTimer = 2.2;
  }

  flash(hex) {
    this.flashEl.style.background = `#${hex.toString(16).padStart(6, '0')}`;
    this.flashEl.classList.remove('hidden');
    this.flashTimer = 0.35;
  }

  damageFlash(amount) {
    this.damageTimer = Math.min(0.5, 0.2 + amount / 40);
    this.damageEl.classList.remove('hidden');
  }

  setShieldPulse() {
    this.shieldPulse = 0.3;
  }

  // Score popup near the top centre. Fades and removes itself.
  popScore(n) {
    if (!n) return;
    const d = document.createElement('div');
    d.className = 'hud-pop';
    d.textContent = `+${n}`;
    this.popEl.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  // Per-frame update. game supplies state; dt drives the timers.
  frame(game, dt) {
    const p = game.player;

    this.stageTimer -= dt;
    if (this.stageTimer <= 0) this.stageCard.classList.add('hidden');

    this.radioTimer -= dt;
    if (this.radioTimer <= 0) {
      const next = this.radioQueue.shift();
      if (next) {
        const sp = SPEAKERS[next.who] || { name: next.who.toUpperCase(), color: '#ffffff' };
        this.radioWho.textContent = sp.name;
        this.radioWho.style.color = sp.color;
        this.radioText.textContent = next.text;
        this.radioBox.classList.remove('hidden');
        this.radioTimer = Math.max(3.6, next.text.length * 0.06);
      } else {
        this.radioBox.classList.add('hidden');
      }
    }

    this.toastTimer -= dt;
    if (this.toastTimer <= 0) this.toastEl.classList.add('hidden');

    this.damageTimer -= dt;
    if (this.damageTimer <= 0) this.damageEl.classList.add('hidden');
    this.flashTimer -= dt;
    if (this.flashTimer <= 0) this.flashEl.classList.add('hidden');
    this.shieldPulse -= dt;

    const shield = Math.ceil(p.shield);
    if (shield !== this.lastShield) {
      this.lastShield = shield;
      this.shieldFill.style.width = `${(p.shield / p.maxShield) * 100}%`;
      this.shieldFill.dataset.state = shield <= 25 ? 'low' : 'ok';
      this.shieldText.textContent = pad(shield, 3);
    }
    this.shieldFill.classList.toggle('pulse', this.shieldPulse > 0);

    if (p.bombs !== this.lastBombs) {
      this.lastBombs = p.bombs;
      this.bombs.innerHTML = '';
      for (let i = 0; i < p.maxBombs; i++) {
        const b = document.createElement('span');
        b.className = i < p.bombs ? 'bomb on' : 'bomb';
        this.bombs.appendChild(b);
      }
    }

    if (p.laser !== this.lastLaser) {
      this.lastLaser = p.laser;
      this.laserMode.textContent = p.laser >= 2 ? 'TWIN' : 'SINGLE';
    }

    if (game.score !== this.lastScore) {
      this.lastScore = game.score;
      this.score.textContent = pad(game.score, 7);
    }
    if (game.kills !== this.lastKills) {
      this.lastKills = game.kills;
      this.kills.textContent = `${pad(game.kills, 2)} / ${pad(game.tallyTotal, 2)}`;
    }
    this.timeEl.textContent = formatClock(game.time);

    this.updateLocks(game);
    this.updateBoss(game);
    this.updateRoute(game);
    this.updateLockStatus(game);
  }

  // Projects the ship's aim marker and lock reticles onto the screen.
  updateLocks(game) {
    const cam = game.camera;
    const w = game.playerWorld();
    _p.set(w.x, w.y, w.z).project(cam);
    this.setScreenPos(this.aimEl, _p, _p.z < 1);

    const locks = game.player.locks;
    while (this.lockEls.length < locks.length) {
      const el = document.createElement('div');
      el.className = 'hud-lock';
      this.locksEl.appendChild(el);
      this.lockEls.push(el);
    }
    for (let i = 0; i < this.lockEls.length; i++) {
      const el = this.lockEls[i];
      if (i < locks.length) {
        const t = locks[i].target;
        const tp = t.worldPos(game);
        _p.set(tp.x, tp.y, tp.z).project(cam);
        this.setScreenPos(el, _p, _p.z < 1);
        el.classList.add('on');
      } else {
        el.classList.remove('on');
      }
    }
  }

  setScreenPos(el, ndc, visible) {
    if (!visible) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.style.left = `${(ndc.x * 0.5 + 0.5) * 100}%`;
    el.style.top = `${(-ndc.y * 0.5 + 0.5) * 100}%`;
  }

  updateLockStatus(game) {
    const n = game.player.locks.length;
    const charging = game.ctl && game.ctl.fire && game.player.holdT >= 0.22;
    this.lockStatus.textContent = charging ? (n ? `LOCKED ${n}` : 'SEARCHING') : '';
    this.lockStatus.classList.toggle('hidden', !charging);
  }

  updateBoss(game) {
    const b = game.boss;
    if (!b) return;
    if (!this.bossSeen) {
      this.bossSeen = true;
      this.bossBar.classList.remove('hidden');
      this.bossName.textContent = game.stage.boss.name.toUpperCase();
    }
    // Health bar tracks the summed HP of every boss part still standing.
    const parts = [...b.pods, b.top, b.core];
    const total = parts.reduce((sum, part) => sum + part.maxHp, 0);
    const left = parts.reduce((sum, part) => sum + Math.max(0, part.hp), 0);
    this.bossFill.style.width = `${Math.max(0, Math.min(1, left / total)) * 100}%`;
    this.bossBar.dataset.phase = String(b.phase);
  }

  updateRoute(game) {
    if (!this.fork || game.phase !== 'play') {
      this.routeEl.classList.add('hidden');
      return;
    }
    const d = this.fork.s - game.player.s;
    if (d > 0 && d < FORK_RANGE) {
      this.routeEl.classList.remove('hidden');
      this.routeEl.dataset.side = game.player.px < 0 ? 'left' : 'right';
    } else {
      this.routeEl.classList.add('hidden');
    }
  }
}

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
