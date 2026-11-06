/**
 * @file The in-play HUD (HTML/SVG over the canvas): the Balance Disc at the lower centre (target ring, your dot with a trail,
 * a breath guide ring, a foot pill either side with analog fill), subtitles (always on, with the voice), the prompt near
 * things, toasts, the lure overlay and the activity strip. It reads the sim's `wobble` each frame and never writes it.
 * Page-side.
 * @example
 * const hud = createHud(root); hud.disc({ x: 0.1, y: 0, r: 0.1, ring: [0, 0, 0.22] }); hud.say('Tare', 'Hello.');
 */
export interface DiscState {
  x: number;
  y: number;
  calm: number;
  lungs: number;
  guide: number;
  fl: number;
  fr: number;
  breath: boolean;
  ring?: [number, number, number];
  target?: [number, number];
  guideDot?: [number, number];
  show: boolean;
}
const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  parent?: HTMLElement,
  html = '',
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  parent?.appendChild(e);
  return e;
};
export interface Hud {
  root: HTMLElement;
  disc(s: DiscState): void;
  say(who: string, text: string, seconds: number): void;
  prompt(html: string): void;
  toast(text: string, seconds?: number): void;
  lure(text: string): void;
  strip(left: string, right: string): void;
  update(dt: number): void;
  clear(): void;
}
export function createHud(parent: HTMLElement): Hud {
  const root = el('div', 'safe', parent);
  root.id = 'hud';
  const discWrap = el('div', 'disc', root);
  discWrap.innerHTML = `<svg viewBox="-1.25 -1.25 2.5 2.5" width="100%" height="100%"><circle r="1.15" fill="rgba(247,250,252,.8)" stroke="#3A4A55" stroke-width=".05"/><circle class="ring" r=".22" fill="rgba(191,234,214,.55)" stroke="#3A4A55" stroke-width=".03"/><circle class="breath" r=".3" fill="none" stroke="#6FD0E8" stroke-width=".05"/><circle class="lungs" r=".1" fill="none" stroke="#3A4A55" stroke-width=".03" stroke-dasharray=".05 .05"/><circle class="tgt" r=".07" fill="#FF8A70"/><circle class="gd" r=".06" fill="none" stroke="#FF8A70" stroke-width=".03"/><polyline class="trail" fill="none" stroke="#FF8A70" stroke-opacity=".5" stroke-width=".035"/><circle class="dot" r=".09" fill="#FF8A70" stroke="#fff" stroke-width=".03"/></svg>`;
  const fl = el('div', 'feet', discWrap);
  fl.style.left = '-7vh';
  const fr = el('div', 'feet', discWrap);
  fr.style.right = '-7vh';
  const fli = el('i', '', fl);
  const fri = el('i', '', fr);
  const q = <T extends Element>(s: string): T => discWrap.querySelector(s) as unknown as T;
  const ringE = q<SVGCircleElement>('.ring'),
    breathE = q<SVGCircleElement>('.breath'),
    lungsE = q<SVGCircleElement>('.lungs'),
    tgtE = q<SVGCircleElement>('.tgt'),
    gdE = q<SVGCircleElement>('.gd'),
    dotE = q<SVGCircleElement>('.dot'),
    trailE = q<SVGPolylineElement>('.trail');
  const trail: string[] = [];
  const sub = el('div', 'sub panel', root);
  sub.style.display = 'none';
  const pr = el('div', 'prompt panel', root);
  pr.style.display = 'none';
  const toastE = el('div', 'toast panel', root);
  toastE.style.display = 'none';
  const lureE = el('div', 'lure', root);
  lureE.style.display = 'none';
  const top = el('div', 'hudtop', root);
  const left = el('div', 'panel', top);
  const right = el('div', 'panel', top);
  left.style.display = right.style.display = 'none';
  let subT = 0,
    toastT = 0;
  return {
    root,
    disc(s) {
      discWrap.style.display = s.show ? '' : 'none';
      if (!s.show) return;
      dotE.setAttribute('cx', String(s.x));
      dotE.setAttribute('cy', String(-s.y));
      trail.push(`${s.x.toFixed(3)},${(-s.y).toFixed(3)}`);
      if (trail.length > 24) trail.shift();
      trailE.setAttribute('points', trail.join(' '));
      const r = s.ring;
      ringE.style.display = r ? '' : 'none';
      if (r) {
        ringE.setAttribute('cx', String(r[0]));
        ringE.setAttribute('cy', String(-r[1]));
        ringE.setAttribute('r', String(r[2]));
      }
      tgtE.style.display = s.target ? '' : 'none';
      if (s.target) {
        tgtE.setAttribute('cx', String(s.target[0]));
        tgtE.setAttribute('cy', String(-s.target[1]));
      }
      gdE.style.display = s.guideDot ? '' : 'none';
      if (s.guideDot) {
        gdE.setAttribute('cx', String(s.guideDot[0]));
        gdE.setAttribute('cy', String(-s.guideDot[1]));
      }
      breathE.style.display = lungsE.style.display = s.breath ? '' : 'none';
      breathE.setAttribute('r', String(0.2 + 0.7 * s.guide));
      lungsE.setAttribute('r', String(0.2 + 0.7 * s.lungs));
      fli.style.height = `${s.fl * 100}%`;
      fri.style.height = `${s.fr * 100}%`;
      discWrap.style.filter = `saturate(${0.9 + 0.2 * s.calm})`;
    },
    say(who, text, seconds) {
      sub.innerHTML = `<span class="who">${who}</span>${text}`;
      sub.style.display = '';
      subT = Math.max(2.5, seconds + 1.2);
    },
    prompt(html) {
      pr.innerHTML = html;
      pr.style.display = html ? '' : 'none';
    },
    toast(text, seconds = 2.5) {
      toastE.textContent = text;
      toastE.style.display = '';
      toastT = seconds;
    },
    lure(text) {
      lureE.textContent = text;
      lureE.style.display = text ? '' : 'none';
    },
    strip(l, r) {
      left.innerHTML = l;
      right.innerHTML = r;
      left.style.display = l ? '' : 'none';
      right.style.display = r ? '' : 'none';
    },
    update(dt) {
      if (subT > 0 && (subT -= dt) <= 0) sub.style.display = 'none';
      if (toastT > 0 && (toastT -= dt) <= 0) toastE.style.display = 'none';
    },
    clear() {
      sub.style.display = 'none';
      pr.style.display = 'none';
      toastE.style.display = 'none';
      lureE.style.display = 'none';
      left.style.display = right.style.display = 'none';
      trail.length = 0;
    },
  };
}
