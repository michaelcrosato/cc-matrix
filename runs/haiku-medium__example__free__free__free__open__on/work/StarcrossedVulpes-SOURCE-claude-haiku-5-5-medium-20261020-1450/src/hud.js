// In-flight HUD (DOM overlay). Text and styles are written only when they change.
import { input } from './input.js';
import { settings } from './settings.js';

const cache = new Map();
const el = (id) => document.getElementById(id);

function setText(id, text) {
  if (cache.get(id) === text) return;
  cache.set(id, text);
  el(id).textContent = text;
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const HINTS = {
  kb: 'SPACE FIRE (HOLD: LOCK-ON)   B BOMB   Q / E ROLL   SHIFT BOOST   C BRAKE   V CAMERA',
  pad: 'A FIRE (HOLD: LOCK-ON)   X BOMB   LB / RB ROLL   RT BOOST   LT BRAKE   Y CAMERA',
  ground: { kb: 'SPACE CANNON   B BOMB   SHIFT BOOST   C BRAKE   V CAMERA   NO ROLL', pad: 'A CANNON   X BOMB   RT BOOST   LT BRAKE   Y CAMERA   NO ROLL' },
};

let hintsLeft = 0;
let hintsMode = 'air';
let pool = [];
let dialogT = null;
let bannerT = null;
let toastT = null;

export const hud = {
  show(def, kind) {
    el('hud').classList.remove('hidden');
    el('hud').dataset.env = kind;
    el('hudDialog').classList.add('hidden');
    el('hudBanner').classList.add('hidden');
    this.setMode('air');
    hintsLeft = 26;
    this.refreshHints();
    cache.clear();
  },
  hide() {
    el('hud').classList.add('hidden');
    this.setTargets([]);
    this.setReticle(null);
    el('hudDialog').classList.add('hidden');
  },
  setStage(name, code) {
    setText('hStage', `${code}  ·  ${name}`);
  },
  setMode(mode) {
    hintsMode = mode;
    setText('hMode', mode === 'ground' ? 'LANDMASTER' : 'ARWING');
    this.refreshHints();
  },
  refreshHints() {
    const dev = input.device === 'pad' ? 'pad' : 'kb';
    const text = hintsMode === 'ground' ? HINTS.ground[dev] : HINTS[dev];
    el('hHints').textContent = text;
    el('hHints').classList.toggle('show', settings.hints && hintsLeft > 0);
  },
  update(s) {
    setText('hTimer', s.durationLeft == null ? fmtTime(s.time) : fmtTime(s.durationLeft));
    el('hShield').style.width = `${Math.max(0, Math.min(100, s.shield))}%`;
    el('hShield').parentElement.classList.toggle('crit', !!s.shieldCritical);
    setText('hShieldNum', String(Math.max(0, Math.ceil(s.shield))));
    setText('hSpares', s.spares > 0 ? '▲'.repeat(s.spares) : 'NONE');
    setText('hBombs', `× ${s.bombs}`);
    setText('hLaser', `LV ${s.laser} / 3`);
    setText('hRings', `${s.rings} / ${s.ringsTotal}`);
    el('hRingsWrap').classList.toggle('hidden', s.ringsTotal === 0);
    setText('hKills', s.total ? `${s.kills} / ${s.total}` : `${s.kills}`);
    el('hLockWrap').classList.toggle('charging', !!s.charging);
    if (s.boss) {
      el('hBoss').classList.remove('hidden');
      setText('hBossName', s.boss.name);
      el('hBossBar').style.width = `${Math.max(0, Math.min(1, s.boss.frac)) * 100}%`;
    } else {
      el('hBoss').classList.add('hidden');
    }
    if (hintsLeft > 0) {
      hintsLeft -= 1 / 60;
      if (hintsLeft <= 0) this.refreshHints();
    }
  },
  setReticle(pt) {
    const r = el('hReticle');
    if (!pt) { r.classList.add('hidden'); return; }
    r.classList.remove('hidden');
    r.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`;
  },
  setTargets(list) {
    const host = el('hTargets');
    while (pool.length < list.length) {
      const d = document.createElement('div');
      d.className = 'tgt';
      host.appendChild(d);
      pool.push(d);
    }
    pool.forEach((d, i) => {
      const t = list[i];
      if (!t) { d.style.display = 'none'; return; }
      d.style.display = 'block';
      d.className = `tgt ${t.state}`;
      d.style.transform = `translate(${t.x}px, ${t.y}px) translate(-50%, -50%)`;
    });
  },
  showDialog(speaker, text) {
    const d = el('hudDialog');
    d.classList.remove('hidden');
    d.style.setProperty('--speaker', speaker.color);
    el('hdWho').textContent = speaker.name;
    el('hdText').textContent = text;
    d.classList.remove('pop');
    void d.offsetWidth;
    d.classList.add('pop');
  },
  hideDialog() {
    el('hudDialog').classList.add('hidden');
  },
  toast(text) {
    const t = el('hToast');
    t.textContent = text;
    t.classList.remove('on');
    void t.offsetWidth;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 1600);
  },
  banner(text, tone) {
    const b = el('hudBanner');
    b.textContent = text;
    b.className = `banner ${tone || ''}`;
    clearTimeout(bannerT);
    bannerT = setTimeout(() => b.classList.add('hidden'), 3200);
  },
  hurt() {
    const h = el('hHurt');
    h.classList.remove('on');
    void h.offsetWidth;
    h.classList.add('on');
  },
};
