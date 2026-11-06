/** @file Read-only browser inspection handle and persistent touch-only demo guard. */
import type { GameApp } from '../app';
import { glyph } from './glyphs';
export function publishState(app: GameApp): void {
  Object.defineProperty(window, '__game', {
    get: () =>
      Object.freeze({
        title: 'Wobble Fit',
        ready: app.engine?.ready ?? false,
        uiTicks: app.uiTicks,
        screen: app.ui.screen,
        attract: app.attract,
        lastDevice: app.ui.device,
        glyphSet: app.options.xbox ? 'Xbox' : 'PlayStation',
        volumes: { music: app.audio.volume('music'), effects: app.options.effects, voices: app.options.voices },
        day: app.flow?.day ?? app.save.day,
        event: app.flow?.event.id ?? null,
        focus: app.ui.focus,
        mode: app.flow?.mode,
        tick: app.flow?.event.tick,
        phase: app.flow?.event.phase,
        score: app.flow?.event.score,
        balance: app.flow ? { x: app.flow.wobble.x, y: app.flow.wobble.y, calm: app.flow.wobble.calm } : null,
        progress: structuredClone(app.save),
        touchOnly: app.touchOnly,
        hubActive: app.hubActive,
      }),
  });
}
export function updateBanner(app: GameApp): void {
  const banner = app.attract
    ? `<div class="demo-pill">Wobble Fit <b>DEMO</b> ${glyph('accept', app.ui.device, app.options.xbox)} Press any button</div>${app.touchOnly ? '<div class="touch-guard">Controller or keyboard required<button type="button" data-touch-settings>Settings</button></div>' : ''}`
    : '';
  if (app.ui.banner.dataset.content === banner) return;
  app.ui.banner.dataset.content = banner;
  app.ui.banner.innerHTML = banner;
  app.ui.banner.querySelector('[data-touch-settings]')?.addEventListener('click', () => {
    app.exitAttract();
    app.show('settings');
  });
}

export function mapFor(app: GameApp): string {
  if (app.ui.choices.length || app.ui.screen === 'hub') return 'actionMap:menuRetreat';
  return ['roam', 'sit'].includes(app.flow?.mode ?? '')
    ? 'actionMap:roamRetreat'
    : app.flow?.event.id === 'garden'
      ? 'actionMap:gardenRetreat'
      : 'actionMap:balance';
}
