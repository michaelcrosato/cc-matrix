/** @file A map held in the hands: contour ink, roads, river, scars, wind, pencil waypoint and a ticking locator. */
import type { Label } from '../../../engine';
import { PLACES, ROADS, ground } from '../scenes/map';
import { CONTRACTS, ALTS } from '../scenes/content';
import type { Context } from './context';
import { escape } from './context';
let contour = '';
for (let level = 0; level <= 80; level += 5) {
  let d = '';
  for (let z = 0; z < 1536; z += 24)
    for (let x = 0; x < 1536; x += 24) {
      const a = ground(x, z),
        b = ground(x + 24, z),
        c = ground(x, z + 24);
      if (a < level !== b < level) d += `M${x + 12} ${z}v24 `;
      if (a < level !== c < level) d += `M${x} ${z + 12}h24 `;
    }
  contour += `<path d="${d}"/>`;
}
const roads = ROADS.map((r) => `<polyline points="${r.map((p) => p.join(',')).join(' ')}"/>`).join('');
const hand =
  '<svg class="hand" viewBox="0 0 100 200" aria-hidden="true"><path fill="currentColor" d="M8 200L8 110Q0 85 12 65L30 22Q34 9 43 17L39 59L50 7Q57-3 64 10L60 59L70 14Q79 9 82 22L76 70L85 39Q96 34 95 50L88 105Q92 123 85 139L79 200Z"/><path stroke="#443821" opacity=".5" fill="none" d="M21 94Q50 80 74 96M27 111Q47 100 73 112"/></svg>';
export function makeMap(ctx: Context): { update: () => void; root: HTMLElement } {
  const root = document.createElement('div');
  root.className = 'map-in-hands';
  root.dataset.screen = 'map';
  root.hidden = true;
  root.innerHTML = `<div class="paper"><div class="map-heading"><span>REPUBLIC OF THE BASIN</span><b>SURVEY No. 06</b></div><svg class="map-svg" viewBox="0 0 1536 1536"><rect width="1536" height="1536" fill="#d7c89f"/><g class="contours">${contour}</g><path d="M0 900C300 885 450 928 700 902S1200 900 1536 906" stroke="#809c9a" stroke-width="44" fill="none"/><g class="map-roads">${roads}</g><g class="map-burns"></g><g class="map-places"></g><g class="map-goal"></g><g class="map-player"><path d="M0 -17L10 13L0 7L-10 13Z" fill="#a3432f"/></g><g class="map-waypoint"></g><g class="map-cursor"><circle r="12" fill="none" stroke="#8c3f2d" stroke-width="3"/><path d="M-20 0H20M0 -20V20" stroke="#8c3f2d" stroke-width="2"/></g><text x="92" y="100" font-size="50" fill="#625b40">N ↑</text></svg><div class="map-caption">Right stick / pointer · Mark with ✕ / click · R3 / wheel zoom</div>${hand}${hand}<div class="tick-box"><small>LOCATOR</small><i></i><span>◴</span></div></div>`;
  document.body.append(root);
  let waypoint: [number, number] | null = null,
    lastTick = -999,
    label: Label | null = null;
  const svg = root.querySelector('svg.map-svg') as SVGSVGElement;
  let cursor: [number, number] = [768, 768],
    zoom = 1,
    wasOpen = false;
  const point = (event: MouseEvent): [number, number] => {
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    const at = p.matrixTransform(svg.getScreenCTM()!.inverse());
    return [at.x, at.y];
  };
  const drop = () => {
    waypoint = [...cursor];
    root.querySelector('.map-waypoint')!.innerHTML =
      `<path d="M${cursor[0] - 10} ${cursor[1]}h20m-10 -10v20" stroke="#a3432f" stroke-width="4"/>`;
  };
  svg.addEventListener('pointermove', (event) => {
    cursor = point(event);
  });
  svg.addEventListener('click', (event) => {
    cursor = point(event);
    drop();
  });
  svg.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      zoom = Math.max(1, Math.min(3, zoom - Math.sign(event.deltaY) * 0.25));
    },
    { passive: false },
  );
  addEventListener('field-map-zoom', () => {
    if (!root.hidden) zoom = zoom >= 2.9 ? 1 : zoom + 1;
  });
  addEventListener('field-map-mark', () => {
    if (!root.hidden) drop();
  });
  return {
    root,
    update() {
      const c = ctx.c,
        p = ctx.p,
        s = p?.seat?.data;
      root.hidden = !s?.map || !['play', 'attract'].includes(ctx.screen);
      if (!c || !p || !s) return;
      root.classList.toggle('driving', s.vehicle >= 0);
      if (root.hidden) {
        wasOpen = false;
        return;
      }
      if (!wasOpen) {
        cursor = [p.actor.x, p.actor.z];
        wasOpen = true;
      }
      if (ctx.device === 'gamepad') {
        const pad = [...navigator.getGamepads()].find(Boolean);
        if (pad) {
          cursor[0] = Math.max(0, Math.min(1536, cursor[0] + ((pad.axes[2] ?? 0) * ctx.frame!.dt * 430) / zoom));
          cursor[1] = Math.max(0, Math.min(1536, cursor[1] + ((pad.axes[3] ?? 0) * ctx.frame!.dt * 430) / zoom));
        }
      }
      const extent = 1536 / zoom,
        x0 = Math.max(0, Math.min(1536 - extent, cursor[0] - extent / 2)),
        z0 = Math.max(0, Math.min(1536 - extent, cursor[1] - extent / 2));
      svg.setAttribute('viewBox', `${x0} ${z0} ${extent} ${extent}`);
      root.querySelector('.map-cursor')!.setAttribute('transform', `translate(${cursor[0]} ${cursor[1]})`);

      (root.querySelector('.map-player') as SVGElement).setAttribute(
        'transform',
        `translate(${p.actor.x} ${p.actor.z}) rotate(${(-p.actor.yaw * 180) / Math.PI + 180})`,
      );
      if (waypoint && ctx.engine?.ui) {
        if (!label) label = ctx.engine.ui.label('', { id: 'waypoint', at: [0, 0, 0] });
        label.text = `Waypoint · ${Math.round(Math.hypot(p.actor.x - waypoint[0], p.actor.z - waypoint[1]))} m`;
        label.at = [waypoint[0], ground(...waypoint) + 2, waypoint[1]];
      }
      if (ctx.frame!.world.tick - lastTick < 30) return;
      lastTick = ctx.frame!.world.tick;
      root.querySelector('.map-places')!.innerHTML = PLACES.filter((site) => c.discovered.includes(site.id))
        .map(
          (site) =>
            `<circle cx="${site.x}" cy="${site.z}" r="10" fill="#514c37"/><text x="${site.x + 16}" y="${site.z + 7}" font-size="23" fill="#3e493c">${escape(site.name)}</text>`,
        )
        .join('');
      const step = CONTRACTS[c.contract]?.steps[c.step];
      let at = step?.at;
      if (step?.kind === 'talk' || step?.kind === 'use' || step?.kind === 'choice') {
        const key = step.kind === 'choice' ? 'Auctioneer' : step.key;
        const target = [...ctx.frame!.world.query('usable')]
          .map((e) => (e.usable as { data: { key: string; x: number; z: number } }).data)
          .find((u) => u.key === key);
        if (target) at = [target.x, target.z];
      }
      if (step?.kind === 'delivery' && !s.carrying) {
        const crates = [...ctx.frame!.world.query('usable')]
          .map((e) => (e.usable as { data: { key: string; done: boolean; x: number; z: number } }).data)
          .filter((u) => u.key.startsWith('quinine-') && !u.done)
          .sort((a, b) => Math.hypot(a.x - p.actor.x, a.z - p.actor.z) - Math.hypot(b.x - p.actor.x, b.z - p.actor.z));
        if (crates[0]) at = [crates[0].x, crates[0].z];
      }
      if (step?.kind === 'vehicle') {
        const ride = [...ctx.frame!.world.query('ride', 'sceneProp')].find(
          (e) => (e.ride as { data: { kind: string } }).data.kind === step.key,
        );
        if (ride) {
          const pos = ride.sceneProp as { x: number; z: number };
          at = [pos.x, pos.z];
        }
      }
      if (c.goal === ALTS[c.contract]?.goal)
        at = ALTS[c.contract].kind === 'delivery' && s.carrying ? [330, 1147] : ALTS[c.contract].at;
      root.querySelector('.map-goal')!.innerHTML = at
        ? `<circle cx="${at[0]}" cy="${at[1]}" r="24" stroke="#a3432f" stroke-width="5" fill="none"/>`
        : '';
      root.querySelector('.map-burns')!.innerHTML = c.fire
        .map((f, i) =>
          f >= 2
            ? `<rect x="${(i % 192) * 8}" y="${Math.floor(i / 192) * 8}" width="8" height="8" fill="${f === 2 ? '#b5582f' : '#554a37'}" opacity=".65"/>`
            : '',
        )
        .join('');
      root.querySelector('.tick-box i')!.classList.toggle('lit', s.locator);
    },
  };
}
