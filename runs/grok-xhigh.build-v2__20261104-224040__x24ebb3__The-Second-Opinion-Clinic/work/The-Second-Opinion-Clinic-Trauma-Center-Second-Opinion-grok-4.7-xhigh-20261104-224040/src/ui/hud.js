/** HUD drawing. The engine font uppercases; keep every glyph in its set. */

import { ABOUT_FIELDS, ENGINE_FEEDBACK, PROMPT_FEEDBACK, SOURCE_INFORMATION, TESTING_FEEDBACK } from '../content/about.js';
import { CAST } from '../content/story.js';
import { TOOLS } from '../input/devices.js';
import { DEFAULTS } from '../core/config.js';

export const ROW = 26;

const INK = {
  x: 'white',
  o: 'sand',
};

const GLYPH = {
  CROSS: ['..x..', '..x..', 'xxxxx', '..x..', '..x..'],
  A: ['.xxx.', 'x...x', 'xxxxx', 'x...x', 'x...x'],
  ENTER: ['xxxxx', 'x...x', 'xxxxx', 'x....', 'x....'],
};

export function clean(value) {
  return String(value ?? '')
    .replaceAll('\u2014', '-')
    .replaceAll('\u2013', '-')
    .replaceAll('\u2026', '...')
    .replace(/[^A-Za-z0-9 .,;:!?\-+%/()[\]'"#&*=<>]/g, '');
}

export function rowTop(index) {
  return 74 + index * ROW;
}

function glyphBox(hud, x, y, name) {
  const rows = GLYPH[name] || GLYPH.ENTER;
  hud.sprite(x, y, rows, INK, { scale: 2 });
}

export function drawHud(ctx, app) {
  const hud = ctx.hud;
  hud.clear();
  const w = hud.width;
  const h = hud.height;
  if (app.mode === 'title') drawTitle(hud, app, w);
  else if (app.mode === 'menu' || app.mode === 'call' || app.mode === 'log' || app.mode === 'consult' || app.mode === 'picks') drawList(hud, app, w);
  else if (app.mode === 'settings') drawSettings(hud, app, w);
  else if (app.mode === 'about') drawAbout(hud, app, w, h);
  else if (app.mode === 'story' || app.mode === 'brief' || app.mode === 'credits') drawStory(hud, app, w, h);
  else if (app.mode === 'card') drawCard(hud, app, w, h);
  else if (app.mode === 'results') drawResults(hud, app, w, h);
  else if (app.mode === 'pause' || app.mode === 'dev') drawPause(hud, app, w, h);
  if (app.mode === 'op' || app.mode === 'attract' || app.mode === 'session' || app.mode === 'pause' || app.mode === 'dev') drawOp(hud, app, w, h);
  if (app.mode === 'attract') {
    hud.rect(0, 0, w, 18, 'ink');
    hud.text(8, 4, 'DEMO - PRESS ANY BUTTON', { color: 'sand', scale: 1 });
  }
}

function drawTitle(hud, app, w) {
  const title = 'THE SECOND OPINION CLINIC';
  const tw = hud.measure(title, 2).width;
  hud.text((w - tw) / 2, 36, title, { scale: 2, color: 'sand' });
  const tag = clean(app.tagline || 'The truth, stat.');
  const tagW = hud.measure(tag, 1).width;
  hud.text((w - tagW) / 2, 68, tag, { scale: 1 });
  const press = 'PRESS';
  const pressW = hud.measure(press, 2).width;
  const gx = (w - (20 + pressW)) / 2;
  glyphBox(hud, gx, 100, app.promptName());
  hud.text(gx + 20, 102, press, { scale: 2 });
  ek(hud, w, 156, app.pulse || 0);
}

function ek(hud, w, y, pulse) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const beat = Math.sin(pulse * 3 + i * 0.45);
    const spike = i % 7 === 3 ? 10 : 0;
    const bar = 2 + Math.abs(beat) * 4 + spike;
    hud.rect(w / 2 - n * 4 + i * 8, y - bar, 3, bar, 'lime');
  }
}

function drawList(hud, app, w) {
  const title = app.listTitle();
  hud.text(24, 28, clean(title), { scale: 2, color: 'sand' });
  app.listItems().forEach((label, i) => {
    const y = rowTop(i);
    if (i === app.focus) hud.rect(16, y - 4, Math.min(w - 32, 420), 22, 'slate');
    hud.text(28, y, clean(label), { scale: 2, color: i === app.focus ? 'sand' : 'white' });
  });
  glyphBox(hud, 24, hud.height - 28, app.promptName());
}

function drawSettings(hud, app) {
  hud.text(24, 28, 'SETTINGS', { scale: 2, color: 'sand' });
  app.settingsRows().forEach((row, i) => {
    const y = rowTop(i);
    if (i === app.focus) hud.rect(16, y - 4, 440, 22, 'slate');
    hud.text(28, y, clean(row), { scale: 1, color: 'white' });
  });
}

function wrapHud(text, max = 54) {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > max) {
      if (cur) lines.push(cur);
      cur = word.slice(0, max);
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

function drawAbout(hud, app, w, h) {
  const pages = ['SOURCE', 'TESTING', 'ENGINE', 'PROMPT', 'CREDITS'];
  hud.text(12, 6, `ABOUT  ${pages[app.aboutPage] || ''}`, { scale: 2, color: 'sand' });
  const lines = app.aboutLines().flatMap((line) => wrapHud(line));
  const step = lines.length > 16 ? 8 : 11;
  const top = 28;
  lines.forEach((line, i) => {
    const y = top + i * step;
    if (y > h - 20) return;
    hud.text(12, y, line, { scale: 1 });
  });
  hud.text(12, h - 12, 'L1 R1 PAGE', { scale: 1 });
  void w;
}

function drawStory(hud, app, w, h) {
  const scene = app.scene();
  if (!scene) return;
  hud.text(20, 16, clean(scene.title || scene.set || ''), { scale: 2, color: 'sand' });
  if (app.mode === 'brief') {
    const op = app.opDef;
    if (!op) return;
    hud.text(20, 56, clean(op.patient || ''), { scale: 2 });
    hud.text(20, 86, clean(`${op.age || ''}  ${op.job || ''}`), { scale: 1 });
    hud.text(20, 112, clean(op.hook || '').slice(0, 57), { scale: 1 });
    hud.text(20, 140, clean(op.objective || '').slice(0, 57), { scale: 1, color: 'sand' });
    return;
  }
  if (app.mode === 'credits') {
    hud.text(20, 60, 'NIGHT SHIFT OVER', { scale: 2, color: 'sand' });
    hud.text(20, 96, 'ALL ART AND AUDIO WRITTEN IN CODE', { scale: 1 });
    hud.text(20, 120, 'PIXEL ENGINE. THREE.JS. RAPIER. KENNEY CC0.', { scale: 1 });
    return;
  }
  const line = scene.lines[app.line];
  if (!line) return;
  const who = CAST[line.who]?.name || line.who;
  hud.rect(12, h - 58, w - 24, 46, 'ink');
  hud.text(20, h - 50, clean(who), { scale: 1, color: 'sand' });
  hud.text(20, h - 32, clean(line.say).slice(0, 57), { scale: 1 });
}

function drawCard(hud, app, w, h) {
  const title = 'THE SECOND OPINION CLINIC';
  const tw = hud.measure(title, 2).width;
  hud.text((w - tw) / 2, 12, title, { scale: 2, color: 'sand' });
  hud.text(20, 58, 'KEEP THE PATIENT ALIVE AND TOP THE TEAM SCORE', { scale: 1 });
  hud.text(20, 78, 'STICK OR MOUSE MOVES. R2 OR CLICK USES.', { scale: 1 });
  const players = app.session?.infoPlayers?.() || app.cardPlayers || [];
  players.forEach((p, i) => {
    const ready = app.session?.card?.ready || [];
    const mark = ready.includes(p.id) ? 'READY' : 'WAIT';
    hud.text(24, 110 + i * 18, clean(`${p.name || 'SEAT'}  ${mark}`), { scale: 1, color: 'white' });
  });
  const left = app.session?.card?.left;
  if (left != null) hud.text(24, h - 36, clean(`TIME ${Math.ceil(left / 1000)}`), { scale: 1 });
  glyphBox(hud, 24, h - 24, 'CROSS');
  hud.text(56, h - 20, 'READY    M MORE TIME', { scale: 1 });
}

function drawResults(hud, app, w, h) {
  const sim = app.sim;
  if (!sim) return;
  hud.rect(24, 20, w - 48, h - 40, 'ink');
  hud.text(40, 36, clean(sim.title || 'CHART'), { scale: 2, color: 'sand' });
  const rows = [
    `TIME ${Math.floor(sim.timeLeft)}`,
    `VITALS ${Math.floor(sim.tables?.[0]?.vitals || 0)}`,
    `SCORE ${Math.floor(sim.finalScore || sim.score || 0)}`,
    `MISTAKES ${sim.mistakes}`,
  ];
  rows.forEach((row, i) => hud.text(40, 72 + i * 18, row, { scale: 1 }));
  hud.text(w - 70, 90, clean(sim.rank || 'C'), { scale: 6, color: 'sand' });
  const note = app.followLine();
  hud.text(40, h - 70, clean(note).slice(0, 57), { scale: 1 });
}

function drawPause(hud, app, w, h) {
  hud.rect(16, 16, Math.min(360, w - 32), h - 32, 'ink');
  if (app.mode === 'pause') {
    hud.text(28, 28, 'PAUSED', { scale: 2, color: 'sand' });
    app.pauseItems().forEach((label, i) => {
      const y = 64 + i * 22;
      if (i === app.focus) hud.rect(24, y - 3, 220, 18, 'slate');
      hud.text(32, y, clean(label), { scale: 1 });
    });
    return;
  }
  const tabs = ['BALANCE', 'CHEATS', 'JUMP', 'ACTIONS', 'VIEW'];
  hud.text(28, 24, `DEV  ${tabs[app.devTab] || ''}`, { scale: 2, color: 'sand' });
  const rows = app.devRows();
  const fit = 12;
  let start = 0;
  if (rows.length > fit) start = Math.min(rows.length - fit, Math.max(0, app.focus - 5));
  for (let i = start; i < Math.min(rows.length, start + fit); i++) {
    const y = 58 + (i - start) * 16;
    if (y > h - 16) return;
    if (i === app.focus) hud.rect(24, y - 2, 300, 14, 'slate');
    hud.text(30, y, clean(rows[i]).slice(0, 48), { scale: 1 });
  }
}

function drawOp(hud, app, w, h) {
  const sim = app.sim;
  if (!sim) return;
  hud.rect(0, 0, w, 22, 'ink');
  const shown = sim.shown != null ? sim.shown : Math.round(sim.tables?.[0]?.vitals || 0);
  hud.text(8, 4, `VITALS ${shown}`, { scale: 2, color: shown < 30 ? 'red' : 'white' });
  const clock = clockText(sim.timeLeft);
  const cw = hud.measure(clock, 2).width;
  hud.text((w - cw) / 2, 4, clock, { scale: 2 });
  hud.text(8, 4, `COMP ${Math.floor(sim.composure)}`, { anchor: 'top-right', scale: 1, color: 'sand' });
  const say = sim.say || app.lineText || '';
  if (say) {
    hud.rect(0, h - 36, w, 36, 'ink');
    hud.text(8, h - 28, clean(say).slice(0, 57), { scale: 1 });
  }
  drawWheel(hud, w, h, sim);
  if (app.hitbox) {
    sim.entities.filter((e) => !e.done && !e.hidden).slice(0, 8).forEach((e, i) => {
      hud.text(8, 28 + i * 12, clean(`${e.id} ${e.kind}`), { scale: 1 });
    });
  }
}

function clockText(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

function drawWheel(hud, w, h, sim) {
  const labels = ['SCL', 'FRC', 'SUT', 'DRN', 'SYR', 'GEL', 'LSR', 'SCN'];
  const tool = sim.seats?.[0]?.tool || 'drain';
  const idx = Math.max(0, TOOLS.indexOf(tool));
  const top = h - 172;
  hud.rect(w - 56, top - 16, 52, 148, 'ink');
  hud.text(w - 52, top - 14, `DOSE ${sim.doses}`, { scale: 1 });
  labels.forEach((label, i) => {
    hud.text(w - 50, top + 4 + i * 16, label, { scale: 1, color: i === idx ? 'sand' : 'white' });
  });
}

export function aboutPageLines(page) {
  if (page === 0) return ABOUT_FIELDS.map(([k, v]) => `${k}: ${v}`);
  if (page === 1) return TESTING_FEEDBACK;
  if (page === 2) return ENGINE_FEEDBACK;
  if (page === 3) return PROMPT_FEEDBACK;
  return [
    'Pixel Engine MIT',
    'three.js and Rapier',
    'Kenney furniture CC0',
    'All art and audio written in code',
    SOURCE_INFORMATION.source,
  ];
}

void SOURCE_INFORMATION;
