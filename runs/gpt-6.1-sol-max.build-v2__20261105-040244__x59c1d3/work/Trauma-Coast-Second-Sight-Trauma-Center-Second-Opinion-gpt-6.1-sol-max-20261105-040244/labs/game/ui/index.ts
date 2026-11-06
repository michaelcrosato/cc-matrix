/** @file UI flow and common controller/mouse focus; every screen shares the same large interactive elements. */
import type { UIContext } from './context';
import type { Screen } from '../app/director';
import type { Preferences } from '../app/settings';
import { TOOLS } from '../data/tools';
import { toolIcon } from './icons';
import { about, aboutCards, handbook, postcards } from './reference';
import { settingPage, cyclePreference } from './settings';
import { devPage, newDevView } from './dev';
import { developerAction } from './devActions';
import { Hud } from './hud';
import * as pages from './pages';
export class GameUI {
  c: UIContext;
  root: HTMLElement;
  hud: Hud;
  revision = -1;
  ref = 0;
  settingsTab = 0;
  rebindPage = 0;
  dev = newDevView();
  rebinding = false;
  returnTo: Screen = 'title';
  constructor(c: UIContext) {
    this.c = c;
    this.root = document.getElementById('panels')!;
    this.hud = new Hud(document.getElementById('hud')!);
    document.getElementById('app')!.addEventListener('click', (e) => {
      const target = e.target as Element,
        tool = target.closest<HTMLElement>('[data-tool]'),
        site = target.closest<HTMLElement>('[data-site]'),
        action = target.closest<HTMLElement>('[data-action]');
      if (tool) {
        c.hands.seats[0][2] = Number(tool.dataset.tool);
        return;
      }
      if (site) {
        c.hands.seats[0][6] = Number(site.dataset.site);
        return;
      }
      if (action && !action.hasAttribute('disabled')) this.action(action.dataset.action!);
    });
    this.root.addEventListener('pointerover', (e) => {
      const button = (e.target as Element).closest<HTMLElement>('[data-focus]');
      if (button) button.focus({ preventScroll: true });
    });
    this.root.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.dataset.pref) {
        const key = el.dataset.pref as keyof Preferences;
        Object.assign(c.prefs, { [key]: Number(el.value) });
        if (key === 'cursorSpeed') c.set('game.cursorSpeed', Number(el.value));
        c.save();
      }
      if (el.dataset.balance) c.set('game.' + el.dataset.balance, Number(el.value));
      if (el.hasAttribute('data-timescale')) c.engine()?.inspector?.timeScale(Number(el.value));
      const out = el.parentElement?.querySelector('output');
      if (out)
        out.textContent = Number(el.max) === 1 ? Math.round(Number(el.value) * 100) + '%' : Number(el.value).toFixed(2);
    });
  }
  open(screen: Screen): void {
    if (screen === 'scrub') {
      this.c.hands.devices = [];
      this.c.hands.seats = [];
    }
    this.returnTo = this.c.d.screen;
    this.ref = 0;
    this.c.d.go(screen);
  }
  render(force = false): void {
    const c = this.c,
      d = c.d;
    if (!force && this.revision === d.revision) return;
    this.revision = d.revision;
    this.root.dataset.game = d.screen;
    document.body.dataset.screen = d.screen;
    const renderers: Partial<Record<Screen, () => string>> = {
      title: () => pages.title(c),
      board: () => pages.board(c),
      story: () => pages.story(c),
      briefing: () => pages.briefing(c),
      debrief: () => pages.result(c),
      failed: () => pages.result(c),
      postcard: () => pages.postcard(c),
      pause: () => pages.pause(c),
      scrub: () => pages.scrub(c),
      credits: pages.credits,
      about: () => about(this.ref),
      handbook: () => handbook(c, this.ref),
      postcards: () => postcards(c, this.ref),
      settings: () => settingPage(c, this.settingsTab, this.rebindPage),
      dev: () => devPage(c, this.dev),
    };
    this.root.innerHTML = renderers[d.screen]?.() ?? '';
    const first = this.root.querySelector<HTMLElement>('[data-focus]:not(:disabled)');
    first?.focus({ preventScroll: true });
  }
  menu(code: string): void {
    if (this.rebinding) return;
    const d = this.c.d;
    if (code === 'Escape') {
      if (d.screen === 'story') return;
      this.action('back');
      return;
    }
    if (code === 'KeyT') {
      if (d.screen === 'story') {
        this.action('skip');
        return;
      }
    }
    if (d.screen === 'story' && (code === 'Enter' || code === 'Space')) {
      this.action('advance');
      return;
    }
    const elements = [...this.root.querySelectorAll<HTMLElement>('[data-focus]:not(:disabled)')],
      focused = document.activeElement as HTMLElement,
      index = elements.indexOf(focused);
    if (code === 'Enter') {
      if (index < 0) {
        elements[0]?.focus({ preventScroll: true });
        elements[0]?.click();
        return;
      }
      focused?.click();
      return;
    }
    if (code === 'ArrowUp' || code === 'ArrowDown') {
      const next = (index + (code === 'ArrowDown' ? 1 : elements.length - 1)) % elements.length;
      elements[next]?.focus({ preventScroll: true });
    }
    if (code === 'ArrowLeft' || code === 'ArrowRight') {
      if (focused instanceof HTMLInputElement && focused.type === 'range') {
        focused.value = String(Number(focused.value) + (code === 'ArrowRight' ? 1 : -1) * Number(focused.step || 0.1));
        focused.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (d.screen === 'board') this.action(code === 'ArrowRight' ? 'case-next' : 'case-prev');
      else if (['about', 'handbook', 'postcards'].includes(d.screen))
        this.action(code === 'ArrowRight' ? 'ref-next' : 'ref-prev');
    }
  }
  action(id: string): void {
    const c = this.c,
      d = c.d;
    c.sound.audio.play('sfx:hl-clack', { vol: 0.18 });
    if (developerAction(c, this.dev, id)) {
      this.render(true);
      return;
    }
    if (id === 'new') {
      d.newShift();
    } else if (id === 'continue') {
      const cp = d.progress.checkpoint;
      d.caseIndex = cp?.caseIndex ?? Math.min(7, d.progress.unlocked - 1);
      d.free = false;
      if (cp) d.start(cp.phase);
      else d.story('before');
    } else if (id === 'board') {
      this.dev.author = false;
      d.go('board', 'title');
    } else if (['settings', 'about', 'handbook', 'scrub', 'dev', 'postcards'].includes(id)) {
      if (id === 'dev') {
        c.act('surgeryControl', { command: 'mark' });
        this.dev.caseIndex = d.caseIndex;
        this.dev.phase = c.state()?.phase ?? 0;
      }
      this.open(id as Screen);
    } else if (id === 'case-next' || id === 'case-prev') {
      d.caseIndex = (d.caseIndex + (id === 'case-next' ? 1 : 8)) % 9;
      this.render(true);
    } else if (id === 'case-play') {
      d.free = true;
      d.go('briefing');
    } else if (id.startsWith('free-gift:')) {
      c.prefs.freeGift = id.split(':')[1] as 'still' | 'pulse';
      c.save();
      this.render(true);
    } else if (id.startsWith('difficulty:')) {
      c.prefs.difficulty = id.split(':')[1] as Preferences['difficulty'];
      c.save();
      this.render(true);
    } else if (id === 'operate') {
      c.set('game.retry', false);
      d.start();
    } else if (id === 'advance') {
      d.advanceStory();
    } else if (id === 'skip') {
      d.skipStory();
    } else if (id === 'next-result') {
      d.continueResult();
    } else if (id === 'pause') {
      this.pause();
    } else if (id === 'resume') {
      this.dev.author = false;
      if (!c.session) c.engine()?.inspector?.resume();
      d.go('op');
    } else if (id === 'retry') {
      c.set('game.retry', false);
      d.start();
    } else if (id === 'retry-phase') {
      c.set('game.retry', true);
      d.start(c.state()?.phase ?? d.last?.phase ?? 0);
    } else if (id === 'scrub-start') {
      if (!c.hands.devices.length) c.hands.claim('keyboard');
      d.go('board', 'title');
    } else if (id === 'back') {
      if (d.screen === 'op') {
        this.pause();
        return;
      }
      if (d.screen === 'pause') {
        this.action('resume');
        return;
      }
      if (d.screen === 'board' || d.screen === 'credits') d.go('title', 'title');
      else if (d.screen === 'briefing') d.go('board', 'title');
      else {
        d.go(this.returnTo);
        if (this.returnTo === 'op' && !c.session) c.engine()?.inspector?.resume();
      }
    } else if (id === 'ref-prev' || id === 'ref-next') {
      const count =
        d.screen === 'about'
          ? aboutCards.length
          : d.screen === 'postcards'
            ? Math.max(1, Object.keys(d.progress.postcards).length)
            : 12 + Math.max(0, Math.min(5, d.progress.unlocked - 3));
      this.ref = (this.ref + (id === 'ref-next' ? 1 : count - 1)) % count;
      this.render(true);
    } else if (id.startsWith('settings-tab:')) {
      this.settingsTab = Number(id.split(':')[1]);
      this.render(true);
    } else if (id.startsWith('pref:')) {
      cyclePreference(c, id.split(':')[1] as keyof Preferences);
      this.render(true);
    } else if (id.startsWith('bind:')) {
      this.rebinding = true;
      const action = id.split(':')[1],
        input = c.engine()?.input;
      this.root.querySelector('h2')!.textContent = 'Press a new key or button…';
      if (input)
        void input.listen(c.hands.lastDevice === 'gamepad' ? 'gamepad' : 'keyboard').then((code) => {
          if (code) input.bindingsFor('actionMap:surgeon').rebind(action, code);
          this.rebinding = false;
          this.render(true);
        });
    } else if (id === 'bind-reset') {
      c.engine()?.input?.bindingsFor('actionMap:surgeon').reset();
      this.render(true);
    } else if (id === 'bind-prev' || id === 'bind-next') {
      this.rebindPage = (this.rebindPage + (id === 'bind-next' ? 1 : 4)) % 5;
      this.render(true);
    }
    c.save();
    this.render();
  }
  pause(): void {
    if (this.dev.author) {
      this.dev.author = false;
      this.c.d.go('dev');
      return;
    }
    if (this.c.d.screen === 'pause') {
      this.action('resume');
      return;
    }
    this.c.engine()?.inspector?.pause();
    this.c.d.go('pause');
    this.render();
  }
  radial(): void {
    const r = this.c.hands.radial,
      el = document.getElementById('radial')!;
    if (!r) {
      el.classList.remove('open');
      return;
    }
    el.classList.add('open');
    el.style.left = `${Math.min(innerWidth * 0.8, Math.max(innerWidth * 0.2, r.x))}px`;
    el.style.top = `${Math.min(innerHeight * 0.75, Math.max(innerHeight * 0.25, r.y))}px`;
    el.innerHTML = `<div class="center">${TOOLS[r.selected]}</div>${TOOLS.map((_, i) => {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      return `<button data-tool="${i}" class="${i === r.selected ? 'active' : ''}" style="transform:translate(-50%,-50%) translate(${Math.cos(a) * 175}%,${Math.sin(a) * 175}%)" aria-label="${TOOLS[i]}">${toolIcon(i)}</button>`;
    }).join('')}`;
  }
}
