/**
 * @file Makes the context every screen shares, with the two things it draws itself: the line being spoken, and the fade.
 */
import type { Engine, Inspector, Input, Store } from '../../../engine';
import type { Sound } from '../audio/sound';
import { flowOf, type W } from '../scenes/types';
import type { Ctx, Screen, Settings } from './ctx';
import { lineText, WHO } from './lines';
import type { Nav } from './nav';

export function createCtx(args: {
  engine: Engine;
  inspector: Inspector;
  input: Input;
  nav: Nav;
  store: Store;
  sound: Sound;
  root: HTMLElement;
  settings: Settings;
  stack: Screen[];
  inHub: boolean;
  world: () => W;
}): { ctx: Ctx; tickSpeech(dt: number): void } {
  const { engine, inspector, input, nav, store, sound, root, settings, stack, inHub, world } = args;
  const speech = document.createElement('div');
  speech.className = 'wt-speech';
  speech.dataset.ui = 'speech';
  speech.style.display = 'none';
  const fadeEl = document.createElement('div');
  fadeEl.className = 'wt-fade';
  root.append(speech, fadeEl);
  let speechLeft = 0;
  const ctx: Ctx = {
    engine, inspector, input, nav, store, sound, root, settings, stack, hubActive: inHub,
    run: (name, a) => void (inspector.actions as { run(n: string, a?: unknown): void }).run(name, a),
    flow: () => flowOf(world()),
    push(screen) { stack.push(screen); },
    pop() { stack.pop()?.close?.(); },
    clear() { while (stack.length) stack.pop()?.close?.(); },
    say(line, who, values) {
      const text = lineText(line, values);
      speech.style.display = '';
      speech.textContent = '';
      const name = WHO[who];
      if (name) {
        const b = document.createElement('b');
        b.textContent = name;
        speech.append(b);
      }
      speech.append(document.createTextNode(text));
      speechLeft = Math.max(2.4, sound.say(who, text) + 1.2);
    },
    saveSettings() { store.set('settings', settings); },
    saveGame() {
      const f = ctx.flow();
      if (f.auto || (window as unknown as { __wtSandbox?: boolean }).__wtSandbox || inHub) return;
      const { day, done, ages, pebbles, found, plaques, bests, free, last, tiltScore } = f;
      store.set('game', { day, done, ages, pebbles, found, plaques, bests, free, last, tiltScore, look: settings.look, colour: settings.colour, headband: settings.headband });
    },
    fade(then) {
      fadeEl.dataset.on = '1';
      setTimeout(() => {
        then();
        fadeEl.dataset.on = '0';
      }, 360);
    },
  }; // prettier-ignore

  return {
    ctx,
    tickSpeech(dt) {
      if (speechLeft <= 0) return;
      speechLeft -= dt;
      if (speechLeft <= 0) speech.style.display = 'none';
    },
  };
}
