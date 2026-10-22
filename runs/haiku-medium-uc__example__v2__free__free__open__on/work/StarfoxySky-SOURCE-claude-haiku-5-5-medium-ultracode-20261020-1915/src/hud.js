// In-flight HUD: kept deliberately sparse for a 10-foot screen. Gauges in the
// corners, the reticle and lock markers on the targets, messages at the bottom.

import { el, formatTime } from './ui.js';
import { settings } from './settings.js';

const LOCK_POOL = 8;

export class HUD {
  constructor(root) {
    this.root = el('div', 'hud hidden');
    root.append(this.root);
    this.vignette = el('div', 'vignette');
    this.flash = el('div', 'bomb-flash');
    this.root.append(this.vignette, this.flash);

    const tl = el('div', 'hud-tl');
    this.missionName = el('div', 'mission-name');
    this.hullBar = this.gauge(tl, 'HULL');
    this.boostBar = this.gauge(tl, 'BOOST');
    this.bombRow = el('div', 'bombs');
    tl.append(this.missionName, this.bombRow);
    this.root.append(tl);

    const tr = el('div', 'hud-tr');
    this.score = el('div', 'score', '0');
    this.stats = el('div', 'stats-line', '');
    tr.append(this.score, this.stats);
    this.root.append(tr);

    this.reticle = el('div', 'reticle');
    this.root.append(this.reticle);

    this.locks = Array.from({ length: LOCK_POOL }, () => {
      const d = el('div', 'lockbox hidden');
      d.append(el('span', 'lock-tag', 'LOCK'));
      this.root.append(d);
      return d;
    });

    this.bossBar = el('div', 'bossbar hidden');
    this.bossName = el('div', 'boss-name', 'VENOM CORE');
    this.bossFill = el('div', 'boss-fill');
    const bossTrack = el('div', 'boss-track');
    bossTrack.append(this.bossFill);
    this.bossBar.append(this.bossName, bossTrack);
    this.root.append(this.bossBar);

    this.hintEl = el('div', 'hint-banner hidden');
    this.warnEl = el('div', 'warn-banner hidden');
    this.subEl = el('div', 'subtitle hidden');
    this.root.append(this.hintEl, this.warnEl, this.subEl);

    this.attractEl = el('div', 'attract-tag hidden', 'DEMO  ·  PRESS ANY BUTTON');
    root.append(this.attractEl);

    this.lastBombs = -1;
    this.lastHint = null;
    this.lastWarn = null;
    this.lastSub = null;
  }

  gauge(parent, label) {
    const row = el('div', 'gauge');
    row.append(el('div', 'gauge-label', label));
    const track = el('div', 'gauge-track');
    const fill = el('div', 'gauge-fill');
    track.append(fill);
    row.append(track);
    parent.append(row);
    return fill;
  }

  show(on, missionName = '') {
    this.root.classList.toggle('hidden', !on);
    this.attractEl.classList.add('hidden');
    if (missionName) this.missionName.textContent = missionName;
    if (!on) {
      this.lastSub = null;
      this.lastHint = null;
      this.lastWarn = null;
      this.subEl.classList.add('hidden');
      this.hintEl.classList.add('hidden');
      this.warnEl.classList.add('hidden');
    }
  }

  setAttract(on) {
    this.attractEl.classList.toggle('hidden', !on);
  }

  update(g) {
    const ship = g.ship;
    this.hullBar.style.width = `${Math.max(0, (ship.hull / ship.maxHull) * 100)}%`;
    this.hullBar.classList.toggle('low', ship.hull < 30);
    this.boostBar.style.width = `${ship.boost * 100}%`;
    this.vignette.style.opacity = String(Math.min(1, g.hudHit * 2.2) * 0.8 + (ship.hull < 30 ? 0.12 : 0));
    this.flash.style.opacity = String(Math.min(1, g.hudBomb * 2.5));
    this.score.textContent = g.score.toLocaleString('en-US');
    this.stats.textContent = `KILLS ${g.kills}/${g.spawned}   RINGS ${g.rings}   ${formatTime(g.time)}`;

    if (ship.bombs !== this.lastBombs) {
      this.lastBombs = ship.bombs;
      this.bombRow.replaceChildren();
      for (let i = 0; i < 5; i++) {
        this.bombRow.append(el('span', 'bomb' + (i < ship.bombs ? ' on' : '')));
      }
    }

    // Reticle sits where the lasers converge: 70 units ahead of the ship.
    const conv = this.reticleWorld || (this.reticleWorld = { x: 0, y: 0, z: 0 });
    conv.x = ship.pos.x;
    conv.y = ship.pos.y;
    conv.z = ship.pos.z - 70;
    const rp = g.project(conv);
    if (rp) this.place(this.reticle, rp);

    // Lock markers on locked targets and partial progress on targets being locked.
    let i = 0;
    for (const e of g.locks) {
      if (i >= LOCK_POOL) break;
      const p = g.project(e.pos);
      const box = this.locks[i++];
      if (p) {
        box.classList.remove('hidden', 'partial');
        this.place(box, p);
      } else {
        box.classList.add('hidden');
      }
    }
    for (const [e, t] of g.lockProgress) {
      if (i >= LOCK_POOL) break;
      const p = g.project(e.pos);
      const box = this.locks[i++];
      if (p) {
        box.classList.remove('hidden');
        box.classList.add('partial');
        box.style.setProperty('--p', String(Math.min(1, t / 0.32)));
        this.place(box, p);
      } else {
        box.classList.add('hidden');
      }
    }
    for (; i < LOCK_POOL; i++) this.locks[i].classList.add('hidden');

    if (g.boss && g.boss.group.visible) {
      this.bossBar.classList.remove('hidden');
      const b = g.boss;
      const shields = b.shields.filter((s) => s.alive).length / b.shields.length;
      const turrets = b.turrets.filter((t) => t.alive).length / b.turrets.length;
      const core = b.core.alive ? b.core.hp / b.core.maxHp : 0;
      this.bossFill.style.width = `${Math.round((core * 0.6 + shields * 0.2 + turrets * 0.2) * 100)}%`;
      this.bossName.textContent = b.phase === 2 ? 'VENOM CORE  ·  EXPOSED' : 'VENOM CORE';
    } else {
      this.bossBar.classList.add('hidden');
    }

    this.setText(this.hintEl, g.hintMsg && g.hintMsg.text, 'lastHint');
    this.setText(this.warnEl, g.warning && g.warning.text, 'lastWarn');
    const sub = settings.subtitles && g.subtitle ? `${g.subtitle.speaker}:  ${g.subtitle.text}` : null;
    this.setText(this.subEl, sub, 'lastSub');
  }

  setText(node, text, key) {
    if (text !== this[key]) {
      this[key] = text;
      node.textContent = text || '';
      node.classList.toggle('hidden', !text);
    }
  }

  place(node, p) {
    node.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  }
}
