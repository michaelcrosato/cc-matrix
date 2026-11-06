/** @file The balance disc and activity-specific instruments, all read from sim state. */
import { diveMeter } from './dive-meter';
import { glyph, safe, type Device } from './glyphs';
import { activity, DAYS, rank } from '../scenes/data/days';
import { LURES } from '../scenes/data/lures';
import { TRAYS } from '../scenes/data/trays';
import { BPMS } from '../scenes/data/charts';
import { rhythmNote } from '../scenes/events/motion';
import { guideFor } from '../scenes/events/registry';
import type { EventConfig } from '../scenes/events/types';
import type { Flow } from '../scenes/state';
import type { Wobble } from '../scenes/wobble';
export function disc(
  w: Wobble,
  targetX: number,
  targetY: number,
  ring: number,
  mini = false,
  label = 'BALANCE',
): string {
  const x = 50 + w.x * 39,
    y = 50 - w.y * 39;
  return `<svg class="balance-disc" viewBox="0 0 100 100" aria-label="Balance disc"><circle class="disc-paper" cx="50" cy="50" r="48"/><path class="disc-grid" d="M8 50h84M50 8v84"/><circle class="disc-grid" cx="50" cy="50" r="35"/><circle class="disc-guide" cx="50" cy="50" r="${17 + w.guide * 25}"/><circle class="disc-target" cx="${50 + targetX * 39}" cy="${50 - targetY * 39}" r="${ring * 39}"/><path class="disc-trail" d="M${x - w.vx * 10},${y + w.vy * 10}L${x},${y}"/><circle class="disc-dot" cx="${x}" cy="${y}" r="3.4"/>${mini ? '' : `<text class="disc-label" x="50" y="14" text-anchor="middle">${safe(label)}</text>`}</svg>`;
}
function garden(f: Flow): string {
  const r = f.event,
    tray = TRAYS[r.tray];
  return `<div class="garden-board" style="transform:perspective(800px) rotateX(${f.wobble.y * 5}deg) rotateY(${f.wobble.x * 5}deg)"><svg viewBox="-100 -100 200 200" aria-label="Sand tray">${tray.ridges.map(([a, b, c, d]) => `<line class="garden-ridge" x1="${a * 95}" y1="${b * 95}" x2="${c * 95}" y2="${d * 95}"/>`).join('')}${tray.holes.map(([x, y]) => `<circle class="garden-cup" cx="${x * 95}" cy="${y * 95}" r="12"/>`).join('')}${r.marbles
    .filter((m) => !m.sunk)
    .map((m) => `<circle class="garden-marble" cx="${m.x * 95}" cy="${m.y * 95}" r="6"/>`)
    .join('')}</svg></div>`;
}
function rhythm(f: Flow, c: EventConfig, device: Device, xbox: boolean): string {
  const r = f.event;
  return `<div class="rhythm-lane"><div class="hit-line"></div>${Array.from({ length: 9 }, (_, i) => {
    const part = Math.min(2, Math.floor(r.tick / 2004)),
      interval = 3600 / (BPMS[part] * c.get('step.bpm'));
    const tick = (Math.floor(r.tick / interval) + i) * interval,
      n = rhythmNote(r, c, tick);
    if (n.note === '.') return '';
    const left = 20 + ((tick - r.tick) / interval) * 16;
    return `<span class="rhythm-note" style="left:${left}%">${n.note === 'L' ? glyph('left', device, xbox) : n.note === 'R' ? glyph('right', device, xbox) : '↥'}</span>`;
  }).join('')}</div>`;
}
export function renderHud(
  f: Flow,
  c: EventConfig,
  device: Device,
  xbox: boolean,
  stateOverlay: string,
  names: string[] = [],
): string {
  if (f.mode === 'front' || f.mode === 'credits' || f.mode === 'results') return '';
  if (f.mode === 'sit')
    return '<div class="roam-message">A little time to do nothing. Use the bench again to stand.</div>';
  if (f.mode === 'roam')
    return `<div class="roam-badge"><span>DAY ${Math.min(5, f.day)}<b>${safe(DAYS[Math.min(4, f.day - 1)].title)}</b></span><span>${f.pebbles} pebbles<br>${f.finds.length} / 20 found</span></div><div class="roam-message">${safe(f.message)}</div>${f.focus ? `<div class="roam-use">${glyph('accept', device, xbox)} ${f.focus === 'sleep' ? 'Your hut' : f.focus === 'board' ? 'Noticeboard' : f.focus.startsWith('plaque') ? 'Read plaque' : f.focus.startsWith('cast:') ? `Talk to ${safe(f.focus.slice(5))}` : f.focus === 'bench' ? 'Sit a moment' : safe(activity(f.focus).title)}</div>` : ''}<div class="roam-controls"><span>${glyph('lean', device, xbox)} Walk · ${glyph('hop', device, xbox)} Hop</span><span>${glyph('plan', device, xbox)} Programme · ${glyph('pause', device, xbox)} Pause</span></div>${stateOverlay}`;
  const r = f.event,
    g = guideFor(r, c),
    w = r.id === 'group' ? r.seats[0] : f.wobble;
  const input = r.id === 'group' ? r.inputs[0] : null;
  const l = input?.l ?? r.inputs[0]?.l ?? 0,
    rr = input?.r ?? r.inputs[0]?.r ?? 0;
  const time = Math.max(0, Math.ceil((r.length - r.tick) / 60));
  let extra = '';
  if (r.id === 'pond' && r.tick > 180) {
    const lure = LURES[Math.floor(r.tick / 480) % LURES.length];
    extra = `<div class="lure"><div class="lure-badge">A SLIGHT DISTRACTION</div><div class="lure-title">${safe(lure[0])}</div><p>${safe(lure[1])}</p></div>`;
  }
  if (r.id === 'garden') extra = garden(f);
  if (r.id === 'step') extra = rhythm(f, c, device, xbox);
  if (r.id === 'dive') extra = diveMeter(r);
  if (r.id === 'reps')
    extra = `<div class="rep-gauge"><div class="rep-band" style="bottom:${(Math.abs(g.y || g.x) / (r.phase === 2 ? 0.75 : 0.8)) * 90}%"></div><div class="rep-marker" style="bottom:${Math.abs(f.wobble.ty || f.wobble.tx) * 90}%"></div></div>`;
  if (r.id === 'group')
    extra = `<div class="group-scores">${(names.length ? names : ['You', 'Gerald', 'Bex', 'Old Nan']).map((name, i) => `<div class="group-seat">${safe(name)}<b>${Math.round(names.length && i > 0 ? (f.remoteScores[i] ?? 0) : r.scores[i] + r.children[i].score)}</b></div>`).join('')}</div>`;
  if (r.id === 'group')
    extra += `<div class="group-discs">${(names.length ? names : ['You', 'Gerald', 'Bex', 'Old Nan'])
      .map((name, i) => {
        const w = r.seats[i];
        const dot = names.length && i > 0 ? { ...w, x: f.remoteDots[i]?.[0] ?? 0, y: f.remoteDots[i]?.[1] ?? 0 } : w;
        return `<div class="group-disc"><span>${safe(name)}</span>${disc(dot, 0, 0, 0.22, true)}</div>`;
      })
      .join('')}</div>`;
  const storm = r.id === 'tilt' && r.phase < 4;
  return `${storm ? '<div class="storm-vignette"></div>' : ''}<div class="hud-top"><div class="activity-heading"><div class="activity-eyebrow">LITTLE FULCRUM · ${f.demo ? 'DEMONSTRATION' : `DAY ${Math.min(5, f.day)}`}</div><h2>${safe(activity(r.id).title)}</h2></div><div class="activity-clock"><svg class="clock-track" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/><circle class="clock-fill" cx="20" cy="20" r="17" stroke-dasharray="107" stroke-dashoffset="${(r.tick / r.length) * 107}"/></svg><span>${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}</span></div></div><div class="hud-instruction"><b>${safe(g.title)}</b>${safe(g.instruction)}</div>${extra}<div class="balance-area"><div class="foot-pill${l > 0.5 ? ' held' : ''}">${glyph('left', device, xbox)}<span class="foot-name">LEFT</span></div>${disc(w, g.x, g.y, g.ring, false, r.id === 'garden' ? 'TRAY TILT' : 'BALANCE')}<div class="foot-pill${rr > 0.5 ? ' held' : ''}">${glyph('right', device, xbox)}<span class="foot-name">RIGHT</span></div><div class="breath-label">${w.guide > w.lungs ? 'Breathe in · Hold both feet' : 'Breathe out · Let go'}</div></div><div class="hud-bottom-left">${glyph('pause', device, xbox)} Pause${device === 'mouse' ? ' · Click to lean' : ''}</div><div class="hud-score">${r.id === 'pond' ? 'COMPOSURE' : r.id === 'tilt' ? `${r.guests} GUESTS SAFE` : rank(r.id === 'group' ? r.score / 3 : r.score).toUpperCase()}<strong>${r.id === 'pond' ? r.composure : Math.round(r.score)}<span class="result-unit">${r.id === 'tilt' ? `${r.tilt.toFixed(1)}°` : ''}</span></strong></div>${stateOverlay}`;
}
