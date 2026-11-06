/**
 * @file The Balance Disc, the HUD's heart: target ring, your dot with a short trail, a guide ring swelling with the breath, a
 * foot pill either side with analog fill. It reads the sim's `wobble` each frame. Rings and targets come from what the
 * running activity asks.
 */
export interface DiscView {
  el: HTMLElement;
  draw(data: DiscData): void;
}

export interface DiscData {
  x: number;
  y: number;
  lungs: number;
  guide: number;
  calm: number;
  l: number;
  r: number;
  rings: { x: number; y: number; r: number; color?: string }[];
  breath: boolean;
}

const R = 100;
const SVG = 'http://www.w3.org/2000/svg';

export function createDisc(root: HTMLElement): DiscView {
  const el = document.createElement('div');
  el.innerHTML = `<div class="wt-disc" data-ui="disc"><svg viewBox="-120 -120 240 240">
    <circle r="${R}" fill="rgb(251 248 241 / 88%)" stroke="#3a4a55" stroke-width="4"/>
    <circle class="guide" r="50" fill="none" stroke="#bfe9ff" stroke-width="10"/>
    <circle class="lungs" r="50" fill="none" stroke="#6aa8e8" stroke-width="3"/>
    <g class="rings"></g><polyline class="trail" fill="none" stroke="#ff8a70" stroke-opacity=".45" stroke-width="6"/>
    <circle class="dot" r="11" fill="#ff5a4a" stroke="#fff" stroke-width="3"/></svg></div>
    <div class="wt-foot" style="left:calc(50% - 26vh)"><i></i><span>L</span></div>
    <div class="wt-foot" style="left:calc(50% + 20vh)"><i></i><span>R</span></div>`;
  root.append(el);
  const q = <T extends Element>(s: string) => el.querySelector<T>(s) as T;
  const dot = q<SVGCircleElement>('.dot');
  const trail = q<SVGPolylineElement>('.trail');
  const guide = q<SVGCircleElement>('.guide');
  const lungs = q<SVGCircleElement>('.lungs');
  const rings = q<SVGGElement>('.rings');
  const feet = el.querySelectorAll<HTMLElement>('.wt-foot i');
  const history: string[] = [];
  return {
    el,
    draw(data) {
      const [dx, dy] = [data.x * R, -data.y * R];
      dot.setAttribute('cx', dx.toFixed(1));
      dot.setAttribute('cy', dy.toFixed(1));
      history.push(`${dx.toFixed(0)},${dy.toFixed(0)}`);
      if (history.length > 14) history.shift();
      trail.setAttribute('points', history.join(' '));
      guide.style.display = data.breath ? '' : 'none';
      lungs.style.display = data.breath ? '' : 'none';
      guide.setAttribute('r', (20 + data.guide * 70).toFixed(1));
      lungs.setAttribute('r', (20 + data.lungs * 70).toFixed(1));
      while (rings.childNodes.length < data.rings.length) rings.append(document.createElementNS(SVG, 'circle'));
      while (rings.childNodes.length > data.rings.length) rings.lastChild?.remove();
      data.rings.forEach((ring, i) => {
        const node = rings.childNodes[i] as SVGCircleElement;
        node.setAttribute('cx', (ring.x * R).toFixed(1));
        node.setAttribute('cy', (-ring.y * R).toFixed(1));
        node.setAttribute('r', (ring.r * R).toFixed(1));
        node.setAttribute('fill', 'none');
        node.setAttribute('stroke', ring.color ?? '#22a06b');
        node.setAttribute('stroke-width', '6');
      });
      feet[0].style.height = `${Math.round(data.l * 100)}%`;
      feet[1].style.height = `${Math.round(data.r * 100)}%`;
    },
  };
}
