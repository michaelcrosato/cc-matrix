/**
 * @file The 10-foot menus. Every one has at most six rows. The same rows serve a pad, keys, and a mouse.
 */
import type { Engine, Inspector, MenuItem, Store } from '../../../engine';
import { DAYS } from '../scenes/data/days';
import { TUNABLES } from '../scenes/settings';
import { AI_HUB, CREDITS, ENGINE, PROMPT, SOURCE, TESTING } from './about-data';
import { NAMES } from './snap';
import { freshPrefs, freshSave, readSave, type Prefs, type Save } from './save';

/** The live retreat, apart from the save. */
export interface Live {
  event: string;
  mode: string;
  result: number;
  calm: number;
  rank: string;
  age: number;
  pebbles: number;
}

/** What the menus may change. The frame loop owns the rest. */
export interface Host {
  hub: boolean;
  attract: boolean;
  screen: string;
  icons: Prefs['icons'];
  prefs: Prefs;
  save: Save;
  live: Live;
  note: HTMLElement;
  about: HTMLElement;
  sliders: HTMLElement;
  devPage: number;
  jumpPage: number;
  bindPage: number;
  pausePage: number;
  aboutFrom: string;
  lastDevice: string;
  store: Store;
  engine(): Engine | null;
  inspector(): Inspector | null;
  run(name: string, args?: Record<string, unknown>): void;
  open(items: MenuItem[], title: string, id: string, onPick: (id: string) => void, onCancel?: () => void): void;
  close(): void;
  applyPrefs(): void;
  persist(): void;
  resume(): void;
  publish(): void;
  setting(path: string): number;
  settingDefault(path: string): number;
}

/** The menus the frame loop opens. */
export interface Menus {
  showTitle(): void;
  showSettings(page: number): void;
  showPause(page: number): void;
  showHubPause(): void;
  showResults(event: string, rank: string): void;
  showEvening(): void;
  showCredits(): void;
}

const RANKS = ['Present', 'Adequate', 'Composed', 'Serene', 'Unsettling'];
const JUMPS = ['morning', 'pose-a', 'pose-b', 'pose-c', 'pond', 'garden', 'paddle', 'line', 'group', 'tilt'];
const REBINDS = ['forward', 'back', 'left', 'right', 'footl', 'footr', 'breathe', 'act', 'gentle'];

/** Builds every menu. They call each other, and the host for the sim. */
export function createMenus(host: Host): Menus {
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const showTitle = () => {
    const kept = readSave(host.store);
    host.open(
      [
        { label: 'Begin', id: 'begin' },
        { label: 'Continue', id: 'continue', disabled: !kept },
        { label: 'Free Play', id: 'free', disabled: !kept || (kept.day <= 1 && !kept.credits) },
        { label: 'Group Class', id: 'group' },
        { label: 'Settings', id: 'settings' },
        { label: 'About', id: 'about' },
      ],
      'Thumb Yoga',
      'title',
      (id) => pickTitle(id),
    );
  };

  function pickTitle(id: string): void {
    if (id === 'begin') {
      host.prefs = freshPrefs();
      host.icons = 'playstation';
      host.applyPrefs();
      host.save = freshSave();
      host.persist();
      host.run('game.begin', {});
      host.close();
      host.screen = 'play';
      host.publish();
    } else if (id === 'continue' || id === 'free') {
      const kept = readSave(host.store);
      if (!kept) return;
      host.save = kept;
      host.prefs = kept.settings;
      host.icons = host.prefs.icons;
      host.applyPrefs();
      host.run('game.begin', { ...kept });
      if (id === 'free' && !kept.credits) host.run('game.leave');
      host.close();
      host.screen = 'play';
      host.publish();
    } else if (id === 'group') {
      host.run('game.start', { event: 'group' });
      host.close();
      host.screen = 'play';
      host.publish();
    } else if (id === 'settings') showSettings(0);
    else {
      host.aboutFrom = 'title';
      showAbout();
    }
  }

  const showSettings = (page: number) => {
    const items: MenuItem[] =
      page === 0
        ? [
            { label: `Music ${pct(host.prefs.music)}`, id: 'music' },
            { label: `Effects ${pct(host.prefs.effects)}`, id: 'effects' },
            { label: `Voices ${pct(host.prefs.voices)}`, id: 'voices' },
            { label: host.icons === 'xbox' ? 'Icons Xbox' : 'Icons PlayStation', id: 'icons' },
            { label: host.prefs.assist > 0.5 ? 'Steadier hands' : 'Hands as they are', id: 'assist' },
            { label: 'More', id: 'more' },
          ]
        : [
            { label: host.prefs.cpu > 0.5 ? 'Empty mats borrow staff' : 'Empty mats stay empty', id: 'cpu' },
            { label: 'Erase the save', id: 'erase' },
            { label: 'Controls', id: 'controls' },
            { label: 'Back', id: 'back' },
          ];
    host.open(
      items,
      'Settings',
      'settings',
      (id) => {
        const cycle = (key: 'music' | 'effects' | 'voices') => {
          const steps = [0, 0.1, 0.3, 0.6, 1];
          const at = steps.findIndex((step) => step >= host.prefs[key] - 0.001);
          host.prefs = { ...host.prefs, [key]: steps[(at + 1) % steps.length] ?? 0.1 };
        };
        if (id === 'music' || id === 'effects' || id === 'voices') cycle(id);
        if (id === 'icons') host.icons = host.icons === 'xbox' ? 'playstation' : 'xbox';
        if (id === 'assist') host.prefs = { ...host.prefs, assist: host.prefs.assist > 0.5 ? 0 : 1 };
        if (id === 'cpu') host.prefs = { ...host.prefs, cpu: host.prefs.cpu > 0.5 ? 0 : 1 };
        host.prefs = { ...host.prefs, icons: host.icons };
        host.applyPrefs();
        if (!host.attract && !host.hub) host.persist();
        if (id === 'more') showSettings(1);
        else if (id === 'erase') showErase();
        else if (id === 'controls') showControls();
        else if (id === 'back') backFromSettings();
        else showSettings(page);
      },
      backFromSettings,
    );
  };

  const backFromSettings = () => {
    if (host.hub) showHubPause();
    else if (host.live.mode === 'event' || host.live.mode === 'roam' || host.live.mode === 'results')
      showPause(host.pausePage);
    else showTitle();
  };

  const showErase = () => {
    host.open(
      [
        { label: 'Yes, erase it', id: 'yes' },
        { label: 'No, keep it', id: 'no' },
      ],
      'Erase the save',
      'erase',
      (id) => {
        if (id === 'yes') {
          host.store.remove('save');
          host.save = freshSave();
          host.prefs = freshPrefs();
          host.icons = 'playstation';
          host.applyPrefs();
          host.inspector()?.seed(1);
        }
        showTitle();
      },
      () => showSettings(1),
    );
  };

  const showControls = () => {
    const input = host.engine()?.input;
    const slice = REBINDS.slice(host.bindPage * 4, host.bindPage * 4 + 4);
    const items: MenuItem[] = slice.map((action) => ({
      label: `${action} ${input?.bindings.codes(action).slice(0, 2).join(' ') ?? ''}`,
      id: action,
    }));
    items.push({ label: 'More', id: 'more' }, { label: 'Back', id: 'back' });
    host.open(
      items.slice(0, 6),
      'Controls',
      'controls',
      (id) => {
        if (id === 'back') showSettings(1);
        else if (id === 'more') {
          host.bindPage = host.bindPage >= 2 ? 0 : host.bindPage + 1;
          showControls();
        } else void rebind(id);
      },
      () => showSettings(1),
    );
  };

  const rebind = async (action: string) => {
    const input = host.engine()?.input;
    if (!input) return;
    host.note.textContent = 'Press the new control. Escape cancels.';
    const device = host.lastDevice === 'gamepad' ? 'gamepad' : 'keyboard';
    const code = await input.listen(device);
    if (code) {
      const result = input.bindings.rebind(action, code);
      if (!result.ok) host.note.textContent = 'That control is already taken.';
    }
    showControls();
  };

  const showAbout = () => {
    host.about.hidden = false;
    host.about.replaceChildren();
    const blocks: [string, readonly string[]][] = [
      ['Source', Object.entries(SOURCE).map(([key, value]) => `${key}: ${value}`)],
      ['Testing', TESTING],
      ['Engine', ENGINE],
      ['Prompt', PROMPT],
      [
        'Catalogue',
        Object.entries(AI_HUB).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`),
      ],
      ['Credits', CREDITS],
    ];
    for (const [title, lines] of blocks) {
      const head = document.createElement('p');
      head.dataset.ui = 'about-h';
      head.textContent = title;
      host.about.append(head);
      for (const line of lines) {
        const row = document.createElement('p');
        row.dataset.ui = 'about-p';
        row.textContent = line;
        host.about.append(row);
      }
    }
    host.open([{ label: 'Back', id: 'back' }], 'About', 'about', () => leaveAbout(), leaveAbout);
  };

  const leaveAbout = () => {
    host.about.hidden = true;
    host.about.replaceChildren();
    if (host.aboutFrom === 'hub') showHubPause();
    else if (host.aboutFrom === 'pause') showPause(1);
    else showTitle();
  };

  const showPause = (page: number) => {
    host.pausePage = page;
    const items: MenuItem[] =
      page === 0
        ? [
            { label: 'Resume', id: 'resume' },
            { label: 'Restart', id: 'restart' },
            { label: 'Back to the island', id: 'island' },
            { label: 'Settings', id: 'settings' },
            { label: 'Controls', id: 'controls' },
            { label: 'More', id: 'more' },
          ]
        : [
            { label: 'Dev Mode', id: 'dev' },
            { label: 'Programme', id: 'programme' },
            { label: 'About', id: 'about' },
            { label: 'Quit', id: 'quit' },
            { label: 'Back', id: 'back' },
          ];
    host.open(
      items,
      'Paused',
      'pause',
      (id) => pickPause(id),
      () => host.resume(),
    );
  };

  function pickPause(id: string): void {
    if (id === 'resume' || (id === 'back' && host.pausePage === 0)) host.resume();
    else if (id === 'more') showPause(1);
    else if (id === 'back') showPause(0);
    else if (id === 'restart') {
      host.run('game.start', { event: host.live.event || 'morning' });
      host.resume();
    } else if (id === 'island') {
      host.run('game.leave');
      host.resume();
    } else if (id === 'settings') showSettings(0);
    else if (id === 'controls') showControls();
    else if (id === 'dev') {
      host.inspector()?.resume();
      showDev();
    } else if (id === 'programme') showProgramme();
    else if (id === 'about') {
      host.aboutFrom = 'pause';
      showAbout();
    } else if (id === 'quit') {
      const live = host.inspector();
      live?.resume();
      live?.seed(live.seed());
      showTitle();
    }
  }

  const showProgramme = () => {
    const day = DAYS.find((row) => row.day === host.save.day) ?? DAYS[0];
    const items: MenuItem[] = (day?.events ?? [])
      .slice(0, 4)
      .map((event) => ({ label: NAMES[event] ?? event, id: event }));
    items.push({ label: 'Back', id: 'back' });
    host.open(
      items,
      'Today',
      'programme',
      (id) => {
        if (id === 'back') showPause(1);
        else {
          host.run('game.start', { event: id });
          host.resume();
        }
      },
      () => showPause(1),
    );
  };

  const showHubPause = () => {
    host.open(
      [
        { label: 'Resume', id: 'resume' },
        { label: `Music ${pct(host.prefs.music)}`, id: 'music' },
        { label: `Voices ${pct(host.prefs.voices)}`, id: 'voices' },
        { label: host.icons === 'xbox' ? 'Icons Xbox' : 'Icons PlayStation', id: 'icons' },
        { label: 'About', id: 'about' },
      ],
      'Paused',
      'pause',
      (id) => {
        if (id === 'music')
          host.prefs = {
            ...host.prefs,
            music: host.prefs.music >= 1 ? 0 : Math.round((host.prefs.music + 0.1) * 10) / 10,
          };
        if (id === 'voices')
          host.prefs = {
            ...host.prefs,
            voices: host.prefs.voices >= 1 ? 0 : Math.round((host.prefs.voices + 0.1) * 10) / 10,
          };
        if (id === 'icons') host.icons = host.icons === 'xbox' ? 'playstation' : 'xbox';
        host.prefs = { ...host.prefs, icons: host.icons };
        host.applyPrefs();
        if (id === 'about') {
          host.aboutFrom = 'hub';
          showAbout();
        } else if (id === 'resume') host.resume();
        else showHubPause();
      },
      () => host.resume(),
    );
  };

  const showResults = (event: string, rank: string) => {
    host.open(
      [
        { label: 'Again', id: 'again' },
        { label: 'Carry on', id: 'on' },
      ],
      rank || 'Done',
      'results',
      (id) => {
        if (id === 'again') host.run('game.start', { event });
        else host.run('game.carry');
        host.close();
        host.screen = 'play';
        host.publish();
      },
    );
  };

  const showEvening = () => {
    host.open([{ label: 'Sleep', id: 'sleep' }], 'Evening', 'evening', () => {
      host.run('game.sleep');
      host.close();
      host.screen = 'play';
      host.publish();
    });
  };

  const showCredits = () => {
    host.open(
      [
        { label: 'Walk the lawn', id: 'walk' },
        { label: 'A new morning', id: 'morning' },
      ],
      'Credits',
      'credits',
      (id) => {
        if (id === 'walk') host.run('game.leave');
        else host.run('game.start', { event: 'morning' });
        host.close();
        host.screen = 'play';
        host.publish();
      },
    );
  };

  const showDev = () => {
    const slice = TUNABLES.slice(host.devPage * 4, host.devPage * 4 + 4);
    host.sliders.hidden = false;
    host.sliders.replaceChildren();
    for (const tunable of slice) {
      const label = document.createElement('label');
      label.dataset.ui = 'slider';
      const name = tunable.path.replace('game.', '');
      const current = host.setting(tunable.path);
      label.textContent = `${name} ${current}`;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = String(tunable.min);
      range.max = String(tunable.max);
      range.step = String(tunable.step);
      range.value = String(current);
      range.dataset.ui = 'slider-range';
      range.addEventListener('input', () => {
        host.inspector()?.set(tunable.path, Number(range.value));
        label.textContent = `${name} ${range.value}`;
      });
      label.append(range);
      host.sliders.append(label);
    }
    host.open(
      [
        { label: 'Next sliders', id: 'next' },
        { label: 'Reset', id: 'reset' },
        { label: 'Jumps', id: 'jumps' },
        { label: 'Time', id: 'time' },
        { label: 'New seed', id: 'seed' },
        { label: 'Back', id: 'back' },
      ],
      'Dev Mode',
      'dev',
      (id) => {
        const live = host.inspector();
        if (id === 'next') host.devPage = (host.devPage + 1) % Math.ceil(TUNABLES.length / 4);
        if (id === 'reset') {
          for (const tunable of TUNABLES) live?.set(tunable.path, host.settingDefault(tunable.path));
          live?.timeScale(1);
        }
        if (id === 'jumps') {
          showJumps();
          return;
        }
        if (id === 'time') {
          const scale = live?.timeScale() ?? 1;
          const next = scale < 0.5 ? 1 : scale < 2 ? 4 : 0.25;
          live?.timeScale(next);
        }
        if (id === 'seed') live?.seed((live.seed() ?? 1) + 1);
        if (id === 'back') {
          host.sliders.hidden = true;
          showPause(1);
          return;
        }
        showDev();
      },
      () => {
        host.sliders.hidden = true;
        showPause(1);
      },
    );
  };

  const showJumps = () => {
    const dayItem = (day: number) => ({ label: `Day ${day}`, id: `day:${day}` });
    const events = JUMPS.map((event) => ({ label: NAMES[event] ?? event, id: `event:${event}` }));
    const steps = [
      { label: 'Storm', id: 'step:storm' },
      { label: 'Everyone east', id: 'step:east' },
      { label: 'Centre stone', id: 'step:stone' },
      { label: 'Dawn', id: 'step:dawn' },
    ];
    const ranks = RANKS.map((rank) => ({ label: `Finish ${rank}`, id: `rank:${rank}` }));
    const pages = [
      [1, 2, 3, 4].map(dayItem),
      [5].map(dayItem),
      events.slice(0, 4),
      events.slice(4, 8),
      events.slice(8),
      steps,
      ranks.slice(0, 4),
      ranks.slice(4),
    ];
    const page = (pages[host.jumpPage] ?? []).slice(0, 4);
    const items = [...page, { label: 'More', id: 'more' }, { label: 'Back', id: 'back' }];
    host.open(
      items,
      'Jump',
      'dev',
      (id) => {
        if (id === 'more') host.jumpPage = (host.jumpPage + 1) % pages.length;
        else if (id === 'back') {
          host.jumpPage = 0;
          showDev();
          return;
        } else if (id.startsWith('day:')) host.run('game.jump', { day: Number(id.slice(4)) });
        else if (id.startsWith('event:')) host.run('game.jump', { event: id.slice(6) });
        else if (id.startsWith('step:')) host.run('game.jump', { step: id.slice(5) });
        else if (id.startsWith('rank:')) host.run('game.finish', { rank: id.slice(5) });
        const jumped =
          id.startsWith('day:') || id.startsWith('event:') || id.startsWith('step:') || id.startsWith('rank:');
        if (!jumped) showJumps();
        else {
          host.sliders.hidden = true;
          host.close();
          host.screen = 'play';
          host.publish();
        }
      },
      () => showDev(),
    );
  };

  return { showTitle, showSettings, showPause, showHubPause, showResults, showEvening, showCredits };
}
