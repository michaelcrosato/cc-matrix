/** @file Four preference pages with large live controls, controller glyph choices and persistent rebinding. */
import type { Preferences } from '../app/settings';
import type { UIContext } from './context';
import { page } from './pages';
import { button, esc } from './icons';
export const settingTabs = ['Audio', 'Controls', 'Gameplay', 'Display', 'Rebind'];
export function settingPage(c: UIContext, tab: number, rebindPage = 0): string {
  const p = c.prefs;
  const slider = (key: keyof Preferences, label: string, min = 0, max = 1, step = 0.01): string =>
    `<div class="setting-row"><label for="pref-${key}">${label}</label><input data-focus id="pref-${key}" data-pref="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${p[key]}"/><output>${max === 1 ? Math.round(Number(p[key]) * 100) + '%' : Number(p[key]).toFixed(1)}</output></div>`;
  const choice = (key: keyof Preferences, label: string): string =>
    `<div class="setting-row"><label>${label}</label>${button(`pref:${key}`, typeof p[key] === 'boolean' ? (p[key] ? 'On' : 'Off') : esc(p[key]))}</div>`;
  let body = '';
  if (tab === 0)
    body =
      slider('master', 'Master') +
      slider('music', 'Music') +
      slider('effects', 'Effects') +
      slider('voice', 'Gibberish voices');
  if (tab === 1)
    body =
      choice('glyphs', 'Controller glyphs') +
      slider('cursorSpeed', 'Cursor speed', 3, 25, 0.5) +
      choice('assist', 'Aim assistance') +
      choice('toggleUse', 'Toggle tool use');
  if (tab === 2)
    body =
      choice('difficulty', 'Difficulty') +
      choice('simpleGift', 'Simple Gift') +
      choice('hints', 'Hints') +
      choice('auto', 'Auto-advance story') +
      slider('textSpeed', 'Story pace', 0.5, 2, 0.1);
  if (tab === 3)
    body =
      choice('blood', 'Blood colour') +
      choice('flashes', 'Drama flashes') +
      slider('textSize', 'Text size', 0.85, 1.3, 0.05);
  if (tab === 4) {
    const bindings = c.engine()?.input?.bindingsFor('actionMap:surgeon'),
      actions = bindings?.actions() ?? [];
    body = actions
      .slice(rebindPage * 4, rebindPage * 4 + 4)
      .map(
        (action) =>
          `<div class="setting-row"><label>${esc(action)}</label>${button(`bind:${action}`, esc(bindings?.label(action, c.hands.lastDevice) ?? ''))}</div>`,
      )
      .join('');
    body += `<div class="page-footer">${button('bind-prev', '← Previous controls')}${button('bind-reset', 'Reset bindings')}${button('bind-next', 'Next controls →')}</div>`;
  }
  return page(
    'Settings',
    settingTabs[tab].toUpperCase(),
    `<div class="settings-rows"><nav class="tabs">${settingTabs.map((name, i) => button(`settings-tab:${i}`, name, `class="${i === tab ? 'selected' : ''}" ${c.session && i === 2 ? 'disabled' : ''}`)).join('')}</nav>${body}</div>`,
    `${button('back', 'Back')}<span class="small">${tab === 0 ? 'Music defaults to 10%. All sound is synthesized.' : tab === 4 ? 'Select a binding, then press the new key or button.' : 'Preferences save on this device.'}</span>`,
  );
}
export function cyclePreference(c: UIContext, key: keyof Preferences): void {
  const p = c.prefs,
    v = p[key];
  if (typeof v === 'boolean') Object.assign(p, { [key]: !v });
  else {
    const options: Record<string, string[]> = {
      glyphs: ['PlayStation', 'Xbox'],
      blood: ['red', 'teal', 'off'],
      difficulty: c.d.progress.ended ? ['Intern', 'Resident', 'Attending'] : ['Intern', 'Resident'],
    };
    const choices = options[key];
    if (choices) Object.assign(p, { [key]: choices[(choices.indexOf(String(v)) + 1) % choices.length] });
  }
  c.set('game.simpleGift', p.simpleGift);
  c.save();
}
