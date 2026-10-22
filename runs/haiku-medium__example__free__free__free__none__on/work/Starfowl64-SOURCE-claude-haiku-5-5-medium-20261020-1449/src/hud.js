import * as THREE from 'three';
import { world } from './world.js';
import { player, MAX_SHIELD } from './player.js';
import { enemies } from './entities.js';
import { settings } from './input.js';
import { wingmen } from './wingmen.js';

// In-game HUD drawn on a 2D canvas above the WebGL view. Kept sparse: shield, bombs, lock count,
// score, rings, boss bar, subtitles. Everything else is shown only when it matters.

let canvas = null;
let hctx = null;
let w = 0;
let h = 0;
const subs = [];
const toasts = [];
const hudState = { score: 0, rings: 0, stageName: '', bossActive: false, flash: 0, wingman: null };

const projV = new THREE.Vector3();

export function initHud() {
  canvas = document.createElement('canvas');
  canvas.id = 'hud';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  document.getElementById('app').appendChild(canvas);
  hctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio, 2);
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function setHudState(patch) {
  Object.assign(hudState, patch);
}

export function addSubtitle(speaker, text) {
  if (!settings.subtitles) return;
  subs.push({ speaker, text, t: 0, life: 4.5 });
  if (subs.length > 2) subs.shift();
}

export function addToast(text, color = '#ffd34d') {
  toasts.push({ text, color, t: 0, life: 1.6 });
}

export function flashDamage() {
  hudState.flash = 1;
}

export function clearSubtitles() {
  subs.length = 0;
}

export function updateHud(dt) {
  for (const s of subs) s.t += dt;
  for (let i = subs.length - 1; i >= 0; i--) if (subs[i].t > subs[i].life) subs.splice(i, 1);
  for (const t of toasts) t.t += dt;
  for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].t > toasts[i].life) toasts.splice(i, 1);
  hudState.flash = Math.max(0, hudState.flash - dt * 2.5);
}

function project(x, y, z) {
  projV.set(x, y, z).project(world.camera);
  return { x: (projV.x * 0.5 + 0.5) * w, y: (-projV.y * 0.5 + 0.5) * h, behind: projV.z > 1 };
}

export function drawHud(time) {
  if (!hctx) return;
  hctx.clearRect(0, 0, w, h);

  // Damage vignette
  if (hudState.flash > 0) {
    const g = hctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(255,40,80,0)');
    g.addColorStop(1, `rgba(255,40,80,${0.55 * hudState.flash})`);
    hctx.fillStyle = g;
    hctx.fillRect(0, 0, w, h);
  }

  drawReticle();
  drawLocks(time);
  drawRadar();
  drawShield();
  drawBombs();
  drawScore();
  drawBoss();
  drawToasts();
  drawSubtitles();
}

function drawReticle() {
  const cx = w / 2;
  const cy = h / 2;
  hctx.strokeStyle = 'rgba(180,255,230,0.85)';
  hctx.lineWidth = 2;
  hctx.beginPath();
  hctx.arc(cx, cy, 12, 0, Math.PI * 2);
  hctx.moveTo(cx - 20, cy); hctx.lineTo(cx - 14, cy);
  hctx.moveTo(cx + 14, cy); hctx.lineTo(cx + 20, cy);
  hctx.moveTo(cx, cy - 20); hctx.lineTo(cx, cy - 14);
  hctx.moveTo(cx, cy + 14); hctx.lineTo(cx, cy + 20);
  hctx.stroke();
}

function drawLocks(time) {
  hctx.lineWidth = 2;
  for (const e of enemies) {
    if (!e.alive || !e.lockable) continue;
    const locked = player.locks.find((l) => l.enemy === e);
    const progress = player.lockProgress.get(e);
    if (!locked && progress === undefined) continue;
    const p = project(e.x, e.y, e.z);
    if (p.behind) continue;
    const size = e.boss ? 90 : 46;
    if (locked) {
      hctx.strokeStyle = '#ff4d6d';
      drawBrackets(p.x, p.y, size);
    } else {
      const f = Math.min(1, progress / 0.42);
      hctx.strokeStyle = 'rgba(255,220,120,0.9)';
      drawBrackets(p.x, p.y, size * (1.2 - f * 0.2));
      hctx.fillStyle = 'rgba(255,220,120,0.9)';
      hctx.fillRect(p.x - 20, p.y + size * 0.7, 40 * f, 3);
    }
  }
  if (player.locks.length > 0) {
    hctx.fillStyle = '#ff9aa9';
    hctx.font = '600 22px "Trebuchet MS", system-ui, sans-serif';
    hctx.textAlign = 'center';
    hctx.fillText(`LOCK ${player.locks.length}/6`, w / 2, h / 2 + 60);
  }
}

// Top-left radar: the ship sits at the bottom centre and "ahead" points up. Enemies within 200 units show.
const RADAR_R = 78;
const RADAR_RANGE = 200;
function drawRadar() {
  const cx = 110;
  const cy = 110;
  hctx.fillStyle = 'rgba(5,12,28,0.6)';
  hctx.beginPath();
  hctx.arc(cx, cy, RADAR_R, 0, Math.PI * 2);
  hctx.fill();
  hctx.strokeStyle = 'rgba(120,190,255,0.5)';
  hctx.lineWidth = 2;
  hctx.stroke();

  const scale = (RADAR_R - 8) / RADAR_RANGE;
  const plot = (wx, wy, ahead) => ({ x: cx + wx * scale * 0.6, y: cy - ahead * scale });
  const inside = (p) => Math.hypot(p.x - cx, p.y - cy) < RADAR_R - 4;

  hctx.fillStyle = '#ff4d6d';
  for (const e of enemies) {
    if (!e.alive) continue;
    const ahead = -e.z * player.facing;
    if (ahead < -20 || ahead > RADAR_RANGE) continue;
    const p = plot(e.x - player.x, 0, ahead);
    if (!inside(p)) continue;
    hctx.fillRect(p.x - (e.boss ? 4 : 2.5), p.y - (e.boss ? 4 : 2.5), e.boss ? 8 : 5, e.boss ? 8 : 5);
  }

  for (const w of wingmen) {
    if (w.down) continue;
    const p = plot(w.x - player.x, 0, 0);
    hctx.fillStyle = w.name === 'Rex' ? '#3fbf6a' : '#c84fd9';
    hctx.beginPath();
    hctx.arc(p.x, p.y + 6, 3, 0, Math.PI * 2);
    hctx.fill();
  }

  hctx.fillStyle = '#e8f4ff';
  hctx.beginPath();
  hctx.moveTo(cx, cy + 8);
  hctx.lineTo(cx - 5, cy + 2);
  hctx.lineTo(cx + 5, cy + 2);
  hctx.fill();
}

function drawBrackets(x, y, s) {
  const k = s / 2;
  const c = s * 0.28;
  hctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    hctx.moveTo(x + sx * k, y + sy * (k - c));
    hctx.lineTo(x + sx * k, y + sy * k);
    hctx.lineTo(x + sx * (k - c), y + sy * k);
  }
  hctx.stroke();
}

function drawShield() {
  const x = 40;
  const y = h - 60;
  const bw = Math.min(260, w * 0.22);
  const frac = Math.max(0, player.shield / MAX_SHIELD);
  hctx.fillStyle = 'rgba(5,12,28,0.7)';
  hctx.fillRect(x - 2, y - 2, bw + 4, 22);
  hctx.fillStyle = frac > 0.3 ? '#5cf2a6' : '#ff4d6d';
  hctx.fillRect(x, y, bw * frac, 18);
  hctx.fillStyle = '#e8f4ff';
  hctx.font = '600 16px "Trebuchet MS", system-ui, sans-serif';
  hctx.textAlign = 'left';
  hctx.fillText('SHIELD', x, y - 8);
}

function drawBombs() {
  const x = 40;
  const y = h - 100;
  hctx.fillStyle = '#e8f4ff';
  hctx.font = '600 16px "Trebuchet MS", system-ui, sans-serif';
  hctx.textAlign = 'left';
  hctx.fillText('BOMBS', x, y - 8);
  for (let i = 0; i < player.maxBombs; i++) {
    hctx.beginPath();
    hctx.arc(x + 12 + i * 26, y + 8, 9, 0, Math.PI * 2);
    hctx.fillStyle = i < player.bombs ? '#44ffaa' : 'rgba(60,80,100,0.5)';
    hctx.fill();
  }
}

function drawScore() {
  const x = w - 40;
  hctx.textAlign = 'right';
  hctx.fillStyle = '#e8f4ff';
  hctx.font = '700 26px "Trebuchet MS", system-ui, sans-serif';
  hctx.fillText(String(hudState.score).padStart(7, '0'), x, 46);
  hctx.font = '600 16px "Trebuchet MS", system-ui, sans-serif';
  hctx.fillStyle = '#ffd34d';
  hctx.fillText(`RINGS ${hudState.rings}`, x, 72);
  if (hudState.stageName) {
    hctx.fillStyle = '#7fa6c9';
    hctx.fillText(hudState.stageName, x, 96);
  }
}

function drawBoss() {
  const boss = enemies.find((e) => e.boss && e.alive);
  if (!boss) return;
  const bw = Math.min(520, w * 0.5);
  const x = (w - bw) / 2;
  const y = 28;
  const frac = Math.max(0, boss.hp / boss.maxHp);
  hctx.fillStyle = 'rgba(5,12,28,0.7)';
  hctx.fillRect(x - 2, y - 2, bw + 4, 18);
  hctx.fillStyle = '#ff6fa3';
  hctx.fillRect(x, y, bw * frac, 14);
  hctx.fillStyle = '#e8f4ff';
  hctx.font = '600 15px "Trebuchet MS", system-ui, sans-serif';
  hctx.textAlign = 'center';
  hctx.fillText('WARDEN', w / 2, y + 34);
}

function drawToasts() {
  hctx.textAlign = 'center';
  hctx.font = '700 28px "Trebuchet MS", system-ui, sans-serif';
  toasts.forEach((t, i) => {
    const a = 1 - Math.max(0, (t.t - t.life + 0.4) / 0.4);
    hctx.fillStyle = t.color;
    hctx.globalAlpha = Math.max(0, Math.min(1, a));
    hctx.fillText(t.text, w / 2, h * 0.3 - i * 36);
    hctx.globalAlpha = 1;
  });
}

function drawSubtitles() {
  if (subs.length === 0) return;
  hctx.textAlign = 'center';
  const boxW = Math.min(880, w * 0.8);
  let y = h - 150;
  for (let i = subs.length - 1; i >= 0; i--) {
    const s = subs[i];
    const a = Math.min(1, s.t / 0.2, (s.life - s.t) / 0.5);
    hctx.globalAlpha = Math.max(0, a);
    hctx.fillStyle = 'rgba(4,10,24,0.72)';
    hctx.fillRect(w / 2 - boxW / 2, y - 30, boxW, 50);
    hctx.fillStyle = '#ffb020';
    hctx.font = '700 17px "Trebuchet MS", system-ui, sans-serif';
    hctx.textAlign = 'left';
    hctx.fillText(s.speaker.toUpperCase(), w / 2 - boxW / 2 + 14, y - 8);
    hctx.fillStyle = '#e8f4ff';
    hctx.font = '500 20px "Trebuchet MS", system-ui, sans-serif';
    hctx.fillText(s.text, w / 2 - boxW / 2 + 14, y + 14);
    hctx.globalAlpha = 1;
    y -= 62;
  }
  hctx.textAlign = 'center';
}

export function clearHud() {
  subs.length = 0;
  toasts.length = 0;
  hudState.flash = 0;
  if (hctx) hctx.clearRect(0, 0, w, h);
}
