/**
 * @file What the page does with each sim event: speech, screens opening, sounds with something more to them, rumble.
 *
 * Game code, a page's.
 *
 * @example
 * // onEvent(app, 'say', { who: 'tare', line: 'after.stay' }, flow, running);
 */
import type { Flow } from '../scenes/components';
import type { App } from './app';
import { rumble } from './appInput';
import { PLAQUE_TEXT } from './lines/plaques';
import { BoardScreen, ProgrammeScreen } from './screens/programme';
import { CreditsScreen, EveningScreen, ResultsScreen } from './screens/results';

/** A sim event. */
export function onEvent(app: App, type: string, p: Record<string, unknown>, flow: Flow): void {
  switch (type) {
    case 'say':
      if (!app.attract || app.session) app.sound.speak(String(p.who), String(p.line), Number(p.n) || 0);
      break;
    case 'results':
      if (!app.attract && !app.session) app.open(new ResultsScreen(app));
      if (!app.attract && !app.session) app.saveNow(flow);
      break;
    case 'evening': {
      const finished = Number(p.day) || 1;
      app.saveNow(flow);
      app.open(
        new EveningScreen(app, finished, () =>
          app.sound.speak('tare', `day.${Math.min(app.lastFlow?.day ?? 1, 6)}.intro`, 0),
        ),
      );
      break;
    }
    case 'open':
      if (p.what === 'programme') app.open(new ProgrammeScreen(app));
      else app.open(new BoardScreen(app, false));
      break;
    case 'plaqueRead': {
      const text = PLAQUE_TEXT[Number(p.plaque) || 0];
      if (text) app.speech.show('Plaque', text, Math.min(6, text.length * 0.05));
      app.sound.play('sfx:squeak');
      break;
    }
    case 'pebbleFound':
      app.speech.show('tare', `A pebble. That is ${p.total} of 20. I did not see you take it.`, 2.4);
      break;
    case 'credits':
      app.open(new CreditsScreen(app, () => app.act('game.credits', { on: false })));
      break;
    case 'beat':
      app.sound.play(Number(p.n) % 2 === 0 ? 'sfx:stepKick' : 'sfx:clap');
      if (Number(p.n) % 2 === 1) app.sound.play('sfx:hat', 0.6);
      rumble(app, 0.12, 40);
      break;
    case 'stepHit':
      app.sound.play(p.grade === 'perfect' ? 'sfx:perfect' : 'sfx:good');
      break;
    case 'topple':
      rumble(app, 0.8, 260);
      break;
    case 'lure':
      if (p.id === 'frog') app.sound.play('sfx:frog');
      if (p.id === 'gull') app.sound.play('sfx:gull');
      if (p.id === 'stone') app.sound.play('sfx:stamp', 0.35);
      break;
    case 'moved':
      rumble(app, 0.3, 90);
      break;
    case 'fade':
      app.fadeEl.style.opacity = '1';
      setTimeout(() => {
        app.fadeEl.style.opacity = '0';
      }, 500);
      break;
    case 'wave':
      app.sound.speak('gerald', 'talk.gerald.1', 0);
      break;
    default:
      break;
  }
}
