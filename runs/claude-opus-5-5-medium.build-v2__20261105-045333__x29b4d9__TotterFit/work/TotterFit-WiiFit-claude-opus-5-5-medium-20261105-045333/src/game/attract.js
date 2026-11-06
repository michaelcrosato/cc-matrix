// Attract mode: bot-played vignettes of the real events, god mode on.
import { EVENTS } from '../data/events.js';
import { CheckIn } from './checkin.js';
import { Hub } from './hub.js';
import { newProfile } from './programme.js';
import { setPalette } from '../render/palette.js';
import { el, txt } from '../ui/ui.js';
import { openTitle } from '../ui/screens/menus.js';
const VIGNETTES = [
  { id: 'island' }, { id: 'fruitHat', god: false, bankAt: 99, skill: 'average' }, { id: 'cairn', god: true }, { id: 'stepClass', god: true, tier: 1 }, { id: 'plates', god: true }, { id: 'springboard', god: true, pumpMax: 3.5, palette: 'noon' }, { id: 'raft', four: true }, { id: 'roomService', god: true }, { id: 'poses', god: true },
];
export function overlay(g) {
  let o = document.getElementById('attractOv'); if (o) return o;
  o = el('div'); o.id = 'attractOv'; o.className = 'bottomprompts'; const bar = el('div', 'promptbar'); const pp = el('span', 'prompt'); const gl = el('span', 'pg'); gl.dataset.verb = 'use'; pp.append(txt('span', '', 'Totter Fit  ·  DEMO  ·  Press any button')); pp.append(gl); bar.appendChild(pp); o.appendChild(bar); o.style.position = 'fixed'; o.style.zIndex = 5; document.body.appendChild(o); g.ui.refreshGlyphs(o); return o;
}
export function* attractScript(g) {
  const anyInput = () => g.input.anyInput;
  g.ui.closeAll(); document.getElementById('attractOv')?.remove();
  const hud = overlay(g); g.attractVisited = g.attractVisited || [];
  const exit = () => { hud.remove(); g.stopAttract(); };
  for (;;) {
    for (const v of VIGNETTES) {
      g.clearMode(); hud.style.display = '';
      if (v.id === 'island') {
        const p = newProfile('Demo', '#E8443A'); p.tutorial = true; p.checkinDone = true; const hub = new Hub(g, p); g.mode = hub; g.audio.playTrack('island'); setPalette('golden', true); hub.locked = true; hub.teleport(-10, 2); g.attractVisited.push('island');
        let t = 0, ph = 0; while (t < 18) { t += 1 / 120; ph += 1 / 120; const ang = ph * .4; hub.walkTarget = null; const vx = Math.cos(ang) * 4, vz = Math.sin(ang) * 4; hub.face = Math.atan2(vx, vz); hub.walking = true; const b = hub.body, c = b.linvel(); b.setLinvel({ x: vx + hub.tiltM.tx * 3, y: c.y, z: vz + hub.tiltM.tz * 3 }, true); if (anyInput()) { exit(); return; } yield; }
      } else {
        const Cls = EVENTS[v.id]; const specs = [{ kind: 'bot', skill: v.skill || 'sharp', colour: '#E8443A', name: 'Demo' }]; if (v.four) { specs.push({ kind: 'bot', skill: 'average', colour: '#3B82F6', name: 'Kevin' }, { kind: 'bot', skill: 'average', colour: '#22C55E', name: 'Paul' }, { kind: 'bot', skill: 'sharp', colour: '#F5B700', name: 'Gerald' }); }
        const ev = g.startEventMode(Cls, { tier: v.tier || 0, god: v.god ?? false, attract: true, bankAt: v.bankAt, pumpMax: v.pumpMax, noReplay: false, palette: v.palette || 'noon' }, specs); g.attractVisited.push(v.id); ev.count = .5; document.body.classList.remove('hidecursor');
        let t = 0; while (t < 18 && ev.phase !== 'done') { t += 1 / 120; if (anyInput()) { exit(); return; } yield; }
      }
    }
    // Back to the title for 5 s between passes.
    g.clearMode(); hud.style.display = 'none'; g.titleMode = null;
    { let t = 0; g.island.setStage('hub'); g.island.setRest(9); g.rig.set(10, 19, 58, 0, 8, 0, true); setPalette('dawn'); g.audio.playTrack('levelBest'); const mode = { screen: 'title', frame: (dt) => g.island.tick(dt) }; g.mode = mode; g.titleMode = null; openTitle(g); g.ui.focus.setLayer(null); while (t < 5) { t += 1 / 120; if (anyInput()) { exit(); return; } yield; } g.ui.closeAll(); }
  }
}
