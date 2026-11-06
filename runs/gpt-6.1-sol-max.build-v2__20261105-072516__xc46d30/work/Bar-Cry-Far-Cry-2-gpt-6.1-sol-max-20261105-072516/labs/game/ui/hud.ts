/** @file A restrained field HUD: segmented wounds, chamber condition, diegetic prompts and a forecast ribbon. */
import type { Label } from '../../../engine';
import { gun } from '../weapons/guns';
import { CONTRACTS } from '../scenes/content';
import { PLACES } from '../scenes/map';
import type { Context } from './context';
import { glyph } from './controls';
export function createHud(ctx: Context): { update: () => void; root: HTMLElement } {
  const root = document.createElement('div');
  root.className = 'field-hud';
  root.hidden = true;
  root.innerHTML =
    '<div class="location"></div><div class="objective"><small></small><p></p></div><div class="wind"><i>➤</i><span></span></div><div class="crosshair">·</div><div class="wounds"><div class="health-segments"></div><div class="medicine"></div></div><div class="weapon-readout"><b></b><span></span><div class="rust-track"><i></i></div><small></small></div><div class="interact-prompt"></div><div class="subtitles"><strong></strong><span></span></div><div class="critical"></div><div class="crew-hud"></div><div class="locator-device"><small>TICK-BOX</small><i></i><span>◴</span></div>';
  document.body.append(root);
  let useLabel: Label | null = null;
  return {
    root,
    update() {
      const p = ctx.p,
        c = ctx.c;
      if (!p || !c) {
        root.hidden = true;
        return;
      }
      root.hidden = !['play', 'attract'].includes(ctx.screen);
      if (root.hidden) return;
      const s = p.seat!.data,
        tick = ctx.frame!.world.tick;
      const nearest = PLACES.reduce((a, b) =>
        Math.hypot(a.x - p.actor.x, a.z - p.actor.z) < Math.hypot(b.x - p.actor.x, b.z - p.actor.z) ? a : b,
      );
      root.querySelector('.location')!.textContent =
        `${nearest.name.toUpperCase()}  /  ${Math.floor(c.hour).toString().padStart(2, '0')}:${Math.floor(
          (c.hour % 1) * 60,
        )
          .toString()
          .padStart(2, '0')}`;
      root.querySelector('.objective small')!.textContent =
        c.mode === 'contract'
          ? 'CONTRACT RUN'
          : `${String(c.contract).padStart(2, '0')} / ${CONTRACTS[c.contract]?.name.toUpperCase() ?? 'FIELDWORK'}`;
      root.querySelector('.objective p')!.textContent = c.goal;
      const W = p.weapons,
        g = W.slot >= 0 ? p.gunState.data.guns[W.slot] : null;
      root.querySelector('.weapon-readout b')!.textContent = g ? String(W.mags[W.slot]).padStart(2, '0') : '—';
      root.querySelector('.weapon-readout span')!.textContent = g ? ` / ${g.reserve}` : 'HOLSTERED';
      root.querySelector('.weapon-readout small')!.textContent = g ? gun(g.key).name : '';
      (root.querySelector('.rust-track i') as HTMLElement).style.width = `${(g?.condition ?? 0) * 100}%`;
      root.querySelector('.health-segments')!.innerHTML = Array.from(
        { length: 5 },
        (_, i) => `<i><b style="height:${Math.max(0, Math.min(1, (p.health.hp - i * 20) / 20)) * 100}%"></b></i>`,
      ).join('');
      root.querySelector('.medicine')!.textContent =
        `${glyph(ctx, 'heal')}  ${s.syr} syrettes    /    ${glyph(ctx, 'pill')}  ${s.pills} quinine`;
      (root.querySelector('.wind i') as HTMLElement).style.transform = `rotate(${(c.wind * 180) / Math.PI - 90}deg)`;
      root.querySelector('.wind span')!.textContent =
        `${Math.max(0, c.windSpeed).toFixed(0)} m/s${c.windNext - tick < 1800 ? ' · SHIFT APPROACHING' : ''}${c.rain ? ' · RAIN' : ''}`;
      const message =
        s.down < 0
          ? 'BLEED-OUT · You are out of this contract.'
          : s.down
            ? 'HOLD ON · A debt may still be worth something.'
            : s.action
              ? `${s.action.replaceAll('-', ' ').toUpperCase()} · ${Math.max(0, (s.until - tick) / 60).toFixed(1)} s`
              : g?.jam
                ? `${glyph(ctx, 'reload')} · CLEAR THE CHAMBER`
                : s.carrying
                  ? `${glyph(ctx, 'interact')} · Put down quinine crate`
                  : s.vehicle >= 0
                    ? `${glyph(ctx, 'interact')} · Exit     Q / △ · Mounted gun`
                    : s.prompt
                      ? `${glyph(ctx, 'interact')} · ${s.prompt}`
                      : s.fever
                        ? `${glyph(ctx, 'pill')} · Take quinine`
                        : '';
      root.querySelector('.interact-prompt')!.textContent = message;
      const locator = root.querySelector('.locator-device') as HTMLElement;
      locator.hidden = !s.locator;
      if (s.locator) {
        const nearest = [...ctx.frame!.world.query('usable')].reduce((d, e) => {
          const u = (e.usable as { data: { kind: string; done: boolean; x: number; z: number } }).data;
          return u.kind === 'cache' && !u.done ? Math.min(d, Math.hypot(p.actor.x - u.x, p.actor.z - u.z)) : d;
        }, Infinity);
        locator.classList.toggle('lit', nearest < 15);
        locator.style.setProperty('--tick', `${Math.max(0.1, nearest / 120)}s`);
      }
      const subtitle = root.querySelector('.subtitles') as HTMLElement,
        seconds = Math.min(16, 3 + c.message.length / 15);
      subtitle.hidden = tick - c.saidAt > seconds * 60 || !c.message;
      subtitle.querySelector('strong')!.textContent = c.speaker;
      subtitle.querySelector('span')!.textContent = c.message;
      root.classList.toggle('is-critical', p.health.hp <= 20 || s.down > 0);
      root.classList.toggle('has-fever', s.fever > 0);
      (root.querySelector('.crosshair') as HTMLElement).hidden = W.aim > 0.9 || s.vehicle >= 0;
      if (p.health.hitAt >= tick - 15) root.classList.add('hit');
      else root.classList.remove('hit');
      if (ctx.me >= 0 && ctx.inHub)
        root.querySelector('.crew-hud')!.textContent = 'COOPERATIVE CONTRACT · FRIENDLY FIRE ON';
      if (!useLabel && ctx.engine?.ui) useLabel = ctx.engine.ui.label('', { id: 'use-target', at: [0, 0, 0] });
      if (useLabel) {
        useLabel.text = s.prompt;
        useLabel.visible = s.target >= 0 && !!s.prompt;
        useLabel.at = [p.actor.x + Math.sin(p.actor.yaw) * 2, p.actor.y + 1.7, p.actor.z + Math.cos(p.actor.yaw) * 2];
      }
    },
  };
}
