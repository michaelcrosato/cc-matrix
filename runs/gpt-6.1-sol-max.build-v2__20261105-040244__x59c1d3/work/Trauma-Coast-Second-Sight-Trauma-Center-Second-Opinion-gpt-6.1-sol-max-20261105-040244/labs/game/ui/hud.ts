/** @file The operating HUD: only physiology, time, score, tools, a nurse and actionable body feedback. */
import { botHand } from '../bot';
import { getCase } from '../data/cases';
import { TOOLS, HELP } from '../data/tools';
import { heartRate, shockLevel, beatPeriod } from '../scenes/op/gift';
import type { Operation } from '../data/types';
import type { UIContext } from './context';
import { esc, toolIcon } from './icons';
export class Hud {
  root: HTMLElement;
  lastEvent = 0;
  hintUntil = 0;
  hintTool = -1;
  lastWorld: object | null = null;
  line = '';
  popTime = 0;
  dramaTime = 0;
  time = 0;
  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `<div class="hud-low" id="hud-low"></div><div class="gift-overlay" data-game="gift-overlay"></div><div class="hud-top"><div class="vitals-block"><div class="hud-label">VITAL SIGNS / <span data-game="patient-label"></span></div><div class="vitals-number"><span data-game="vitals">70</span><small data-game="bpm">78 BPM</small></div><svg class="ecg" data-game="ecg" viewBox="0 0 400 48" preserveAspectRatio="none"><path data-game="ecg-path"/></svg><div class="vitals-bar"><i data-game="vitals-fill"></i></div></div><div class="clock-block"><div class="hud-label" data-game="case-label"></div><div class="clock-value" data-game="clock"></div><div class="phase-name" data-game="phase"></div><div class="small" data-game="phase-index"></div></div><div class="score-block"><div class="hud-label">PROCEDURE SCORE</div><div class="score-value" data-game="score"></div><div class="chain" data-game="chain"></div><div class="small" data-game="slips"></div></div></div><div class="gift-banner" data-game="gift"></div><div class="site-tabs" data-game="sites"></div><div class="odie-box"><svg class="odie-avatar" viewBox="0 0 60 70"><path d="M12 68V45c0-10 36-10 36 0v23" fill="#1f4650"/><ellipse cx="30" cy="24" rx="17" ry="21" fill="#a47d62"/><path d="M12 22c-4-28 39-27 36 1L38 12 19 14Z" fill="#b9b9a8"/><path d="M18 42h24l-3 13H22Z" fill="#6c9292"/><path d="M22 26h4m8 0h4" stroke="#182b35" stroke-width="3"/></svg><div><div class="speaker">ODIE / CHARGE NURSE</div><p data-game="hint"></p></div></div><div class="rating-pop" data-game="rating"></div><div class="tool-bar" aria-label="Surgical instruments">${TOOLS.map((t, i) => `<button data-tool="${i}" class="tool-button" aria-label="${t}"><span class="tool-key">${i + 1}</span>${toolIcon(i)}<span class="tool-name">${t}</span></button>`).join('')}</div><div class="selected-tool"><strong data-game="tool-name"></strong><p data-game="tool-help"></p></div><div class="charge-panel" data-game="syringe-panel"><div class="hud-label">STABILIZER / RELEASE IN GREEN</div><div class="charge-bar"><span class="green"></span><i data-game="syringe-fill"></i></div></div><div data-game="context"></div><footer class="op-footer"><span data-game="prompts"></span><button data-action="pause" aria-label="Pause operation">Ⅱ <span data-game="pause-prompt">ESC</span> · Pause</button></footer>`;
  }
  el(name: string): HTMLElement {
    return this.root.querySelector(`[data-game="${name}"]`)!;
  }
  showHint(s: Operation): void {
    this.line = s.hint;
    this.hintTool = botHand(s, 0)[2];
    this.hintUntil = this.time + 4;
  }
  frame(c: UIContext, s: Operation, dt: number, world: object): void {
    this.time += dt;
    if (this.lastWorld !== world) {
      this.lastWorld = world;
      this.lastEvent = 0;
      this.line = s.hint;
    }
    const cs = getCase(s.caseId),
      p = s.seats[0],
      v = s.patients.length > 1 ? s.patients[p.site] : s.patients[0],
      pad = c.hands.lastDevice === 'gamepad',
      xbox = c.prefs.glyphs === 'Xbox';
    this.el('vitals').textContent = String(Math.max(0, Math.round(v)));
    this.el('vitals-fill').style.width = `${Math.max(0, v)}%`;
    this.el('bpm').textContent = s.code ? 'ASYSTOLE' : `${heartRate(s)} BPM`;
    this.el('patient-label').textContent = cs.patient.toUpperCase();
    this.el('case-label').textContent =
      `CASE ${cs.id === 'gala-shift' ? 'TEAM' : String(c.d.caseIndex + 1).padStart(2, '0')} / ${cs.title.toUpperCase()}`;
    this.el('clock').textContent =
      `${Math.floor(s.left / 360000)}:${String(Math.ceil(s.left / 6000) % 60).padStart(2, '0')}`;
    this.el('phase').textContent = cs.phases[s.phase].title;
    this.el('phase-index').textContent = `PHASE ${s.phase + 1} OF ${cs.phases.length}`;
    this.el('score').textContent = s.score.toLocaleString('en');
    this.el('chain').textContent = `×${s.chain.toFixed(1)} CHAIN`;
    this.el('slips').textContent = `${s.slips} SLIPS`;
    this.el('tool-name').textContent = TOOLS[p.tool];
    this.el('tool-help').textContent = HELP[TOOLS[p.tool]][0];
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
      b.classList.toggle('active', Number(b.dataset.tool) === p.tool);
      b.classList.toggle('hinted', this.hintUntil > this.time && Number(b.dataset.tool) === this.hintTool);
    }
    const events = s.events.filter((e) => e.n > this.lastEvent);
    for (const e of events) {
      this.lastEvent = e.n;
      if (e.type === 'hint') this.showHint(s);
      if (['say', 'hint', 'phase', 'refusal'].includes(e.type)) {
        this.line = e.type === 'phase' ? s.hint : e.text;
        if (e.type !== 'refusal') c.sound.say('odie', this.line, c.prefs);
      }
      if (e.type === 'rating') {
        this.el('rating').textContent = e.text;
        this.popTime = this.time + 1;
      }
      if (e.type === 'drama' && c.prefs.flashes) {
        const d = document.getElementById('drama')!;
        d.querySelector('b')!.textContent = e.text;
        d.classList.add('show');
        this.dramaTime = this.time + 0.8;
      }
    }
    this.el('hint').textContent = this.line;
    this.el('rating').classList.toggle('show', this.popTime > this.time);
    if (this.dramaTime < this.time) document.getElementById('drama')?.classList.remove('show');
    const active = s.seats.find((q) => q.giftUntil > s.tick),
      overlay = this.el('gift-overlay');
    overlay.className = `gift-overlay ${active ? (active.giftKind === 'still' ? 'still' : 'pulse') : ''}`;
    this.el('gift').textContent = active
      ? `${active.giftKind === 'still' ? 'STILLPOINT' : 'SECOND PULSE'} · ${Math.ceil((active.giftUntil - s.tick) / 60)}s`
      : p.gift > 0
        ? `${pad ? (xbox ? 'Y' : '△') : 'SPACE'} · ${p.giftKind === 'pulse' ? 'SECOND PULSE' : 'STILLPOINT'} READY`
        : '';
    this.el('syringe-panel').style.display = p.tool === 5 ? 'block' : 'none';
    this.el('syringe-fill').style.width = `${Math.min(100, p.charge * 100)}%`;
    const sites = this.el('sites'),
      siteHTML =
        cs.sites.length > 1
          ? cs.sites
              .map(
                (name, i) =>
                  `<button data-site="${i}" class="${i === p.site ? 'active' : ''} ${s.targets.some((t) => !t.done && t.site === i && t.kind === 'wound') ? 'danger' : ''}">${esc(name)}<small>${s.patients.length > 1 ? `${Math.round(s.patients[i])} VITALS` : s.targets.filter((t) => !t.done && t.site === i && t.required).length + ' TARGETS'}</small></button>`,
              )
              .join('')
          : '';
    if (sites.innerHTML !== siteHTML) sites.innerHTML = siteHTML;
    this.el('prompts').innerHTML = pad
      ? `<span class="glyph">${xbox ? 'RT' : 'R2'}</span> Use <span class="glyph">RS</span> Tools <span class="glyph">${xbox ? 'X' : '□'}</span> Syringe <span class="glyph">↑</span> Hint`
      : '<kbd>LMB</kbd> Use <kbd>RMB</kbd> Tool radial <kbd>F</kbd> Syringe <kbd>H</kbd> Hint';
    this.el('pause-prompt').textContent = pad ? 'OPTIONS' : 'ESC';
    let context = '';
    if (s.code)
      context = `<section class="code-panel"><div class="eyebrow">CODE BLUE / TWO CHANCES</div><h2>Bring them back.</h2><div class="charge-bar"><span class="green"></span><i style="width:${shockLevel(s) * 100}%"></i></div><p>${pad ? 'L2 + R2' : 'LMB + RMB'} together when the charge is in green.</p><p class="gold">${Math.max(0, Math.ceil((s.code.until - s.fieldTicks) / 6000))} seconds · ${2 - s.code.tries} shocks</p></section>`;
    else if (p.pulseAt) {
      const beat = (s.tick % beatPeriod(s)) / beatPeriod(s);
      context = `<section class="pulse-panel"><div class="eyebrow">PULSE-LOCK</div><h3>Match the next three beats.</h3><div class="pulse-beats">${'●'.repeat(p.beats)}${'○'.repeat(3 - p.beats)}</div><div class="charge-bar"><i style="width:${beat * 100}%"></i></div><p class="small">${pad ? (xbox ? 'Y' : '△') : 'SPACE'} on the ECG peak</p></section>`;
    }
    this.el('context').innerHTML = context;
    const lull = s.targets.some((t) => !t.done && t.kind === 'lull');
    this.el('ecg').classList.toggle('dim', lull);
    const path: string[] = [];
    for (let x = 0; x <= 400; x += 3) {
      const cycle = ((x / 400) * 3 + (((p.pulseAt ? s.tick * 100 : s.fieldTicks) / 6000) * heartRate(s)) / 60) % 1;
      const y = s.code
        ? 25
        : 25 -
          (cycle < 0.025 || cycle > 0.975
            ? 30
            : cycle > 0.025 && cycle < 0.065
              ? -15
              : cycle > 0.08 && cycle < 0.12
                ? 5
                : 0);
      path.push(`${x === 0 ? 'M' : 'L'}${x} ${y}`);
    }
    this.el('ecg-path').setAttribute('d', path.join(' '));
    document.body.classList.toggle('low', v < 25);
  }
}
