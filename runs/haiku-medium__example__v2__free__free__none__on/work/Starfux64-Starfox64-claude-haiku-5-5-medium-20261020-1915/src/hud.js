// 10-foot HUD: a few big readouts, comms as subtitles, banners and lock markers. Writes only on change.
import { Vector3 } from 'three/webgpu';
import { settings } from './settings.js';

const $ = (id) => document.getElementById(id);
const _v = new Vector3();

export class Hud {
  constructor() {
    this.root = $('hud');
    this.bl = $('hud-bl');
    this.score = $('hud-score');
    this.stage = $('hud-stage');
    this.shieldFill = $('shield-fill');
    this.wing = $('hud-wing');
    this.bossBox = $('hud-boss');
    this.bossLabel = $('boss-label');
    this.bossFill = $('boss-fill');
    this.hint = $('hud-hint');
    this.comms = $('comms');
    this.banners = $('banner');
    this.damage = $('hud-damage');
    this.flashEl = $('flash');
    this.reticle = $('reticle');
    this.lockPool = [];
    this.lockEls = [];
    this.last = {};
    this.bannerT = 0;
    this.dmgTimer = 0;
    this.commTimers = new Set();
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
  }

  setStage(text) {
    this.stage.textContent = text;
  }

  setHint(text) {
    this.hint.textContent = settings.hudHints ? text : '';
  }

  update(s) {
    if (this.last.score !== s.score) {
      this.last.score = s.score;
      this.score.innerHTML = `<div class="big">${String(s.score).padStart(7, '0')}</div><div class="small">SCORE</div>`;
    }
    const shieldPct = Math.max(0, Math.min(100, s.shield));
    const shieldKey = Math.round(shieldPct);
    if (this.last.shield !== shieldKey) {
      this.last.shield = shieldKey;
      this.shieldFill.style.width = `${shieldKey}%`;
      this.shieldFill.style.background = shieldKey < 30 ? 'linear-gradient(90deg,#ff5a6e,#ffb35a)' : '';
    }
    const blKey = `${s.bombs}|${s.lives}`;
    if (this.last.bl !== blKey) {
      this.last.bl = blKey;
      const bombs = Array.from({ length: 6 }, (_, i) => `<span class="bomb ${i < s.bombs ? '' : 'off'}"></span>`).join('');
      const lives = Array.from({ length: 3 }, (_, i) => `<span class="pip ${i <= s.lives ? '' : 'off'}"></span>`).join('');
      this.bl.innerHTML = `<div class="row">${lives}<span style="color:#8fb3cc;font-size:0.7em">SHIPS</span></div><div class="row">${bombs}<span style="color:#8fb3cc;font-size:0.7em">BOMBS</span></div>`;
    }
    const wingKey = s.wingmen.map((w) => `${w.name}${w.alive ? '1' : '0'}`).join(',');
    if (this.last.wing !== wingKey) {
      this.last.wing = wingKey;
      this.wing.innerHTML = s.wingmen.map((w) => `<div class="wingrow ${w.alive ? '' : 'down'}"><span>${w.name}</span><span>${w.alive ? 'ON STATION' : 'DOWN'}</span></div>`).join('');
    }
    if (s.boss) this.updateBoss(s.boss);
    else if (!this.bossBox.classList.contains('hidden')) this.hideBoss();
  }

  setBoss(label) {
    this.bossBox.classList.remove('hidden');
    this.bossLabel.textContent = label;
  }

  hideBoss() {
    this.bossBox.classList.add('hidden');
  }

  // Boss bar: total health of the batteries and core that are still standing.
  updateBoss(boss) {
    if (!boss) return;
    const parts = [boss.batteries[0].target, boss.batteries[1].target, boss.core];
    const max = 10 + 10 + 22;
    const left = parts.reduce((sum, p) => sum + (p.alive ? Math.max(0, p.hp) : 0), 0);
    this.bossFill.style.width = `${Math.round((left / max) * 100)}%`;
  }

  // Comms subtitles stack at the bottom and fade after a few seconds.
  comm(who, text) {
    const el = document.createElement('div');
    el.className = 'comm';
    el.innerHTML = `<b>${who}</b>${text}`;
    this.comms.appendChild(el);
    while (this.comms.children.length > 3) this.comms.removeChild(this.comms.firstChild);
    const timer = setTimeout(() => {
      el.remove();
      this.commTimers.delete(timer);
    }, 4800);
    this.commTimers.add(timer);
  }

  banner(title, sub, dur) {
    this.banners.innerHTML = `${title}<small>${sub}</small>`;
    this.banners.classList.remove('hidden');
    this.bannerT = dur;
  }

  damageFlash() {
    this.damage.classList.add('on');
    clearTimeout(this.dmgTimer);
    this.dmgTimer = setTimeout(() => this.damage.classList.remove('on'), 220);
  }

  flash() {
    this.flashEl.classList.add('on');
    setTimeout(() => this.flashEl.classList.remove('on'), 60);
  }

  // Lock markers sit over each locked target. Pooled so no DOM is created per frame.
  setLocks(locks, camera) {
    while (this.lockEls.length < locks.length) {
      const el = document.createElement('div');
      el.className = 'lock';
      el.style.left = '0';
      el.style.top = '0';
      this.root.appendChild(el);
      this.lockEls.push(el);
    }
    for (let i = 0; i < this.lockEls.length; i++) {
      const el = this.lockEls[i];
      if (i >= locks.length) {
        el.style.display = 'none';
        continue;
      }
      _v.copy(locks[i].target.pos).project(camera);
      const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
      el.style.display = _v.z < 1 ? 'block' : 'none';
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.classList.toggle('pending', locks[i].target.kind === 'carrierPart');
    }
  }

  tick(dt) {
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.banners.classList.add('hidden');
    }
  }

  clearComms() {
    for (const t of this.commTimers) clearTimeout(t);
    this.commTimers.clear();
    this.comms.innerHTML = '';
  }
}
