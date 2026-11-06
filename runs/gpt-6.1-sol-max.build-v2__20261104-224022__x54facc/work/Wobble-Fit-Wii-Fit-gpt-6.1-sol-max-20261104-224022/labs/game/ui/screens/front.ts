/** @file Title, arrival, pause and controls, with one native focus path. */
import { rebindFeet, resetFeet } from '../bindings';
import type { ScreenApp } from '../context';
import { glyph } from '../glyphs';
export function title(a: ScreenApp): void {
  const saved = a.save.day > 1 || a.save.done.length > 0;
  const items = a.touchOnly
    ? [{ id: 'settings', label: 'Settings', action: () => a.show('settings') }]
    : [
        {
          id: 'begin',
          label: saved ? 'Continue your stay' : 'Begin your stay',
          detail: saved ? `Day ${Math.min(5, a.save.day)} · A little more composed.` : 'Your mat is ready.',
          action: () => (saved ? a.begin() : a.show('arrival')),
        },
        ...(saved ? [{ id: 'practice', label: 'A little free practice', action: () => a.show('board') }] : []),
        { id: 'group', label: 'Group Class', action: () => a.show('group') },
        { id: 'settings', label: 'Settings', action: () => a.show('settings') },
        { id: 'about', label: 'About the retreat', action: () => a.show('about') },
      ];
  a.ui.menu(
    'title',
    'A balance & wellness game',
    '<span class="title-word">Wobble</span><span class="title-word">Fit<span class="title-dot"></span></span>',
    'Stand still. It is harder than it looks.',
    items,
    {
      hero: true,
      extra: a.touchOnly ? '<p class="touch-required">Controller or keyboard required</p>' : '',
      footer: a.touchOnly
        ? 'Make yourself comfortable. The demonstration begins shortly.'
        : `${glyph('accept', a.ui.device, a.options.xbox)} Make yourself comfortable`,
    },
  );
  a.ui.root.insertAdjacentHTML(
    'beforeend',
    '<div class="title-stamp">FIND<br>YOUR<br>CENTRE</div><div class="title-caption"><span class="caption-mark">“</span><span class="caption-text"><b>Please keep to the centre.</b>No reason.<br>— Tare, your retreat guide</span></div>',
  );
  a.ui.back = () => {};
}
export function arrival(a: ScreenApp): void {
  const looks = ['Sunrise', 'Sea Glass', 'Driftwood'],
    colours = ['Terracotta', 'Eucalyptus', 'Periwinkle', 'Honey', 'Tide'];
  const set = (what: 'look' | 'colour', step: number) => {
    a.save[what] =
      (a.save[what] + step + (what === 'look' ? 3 : a.save.pebbles < 20 ? 3 : a.save.pebbles < 30 ? 4 : 5)) %
      (what === 'look' ? 3 : a.save.pebbles < 20 ? 3 : a.save.pebbles < 30 ? 4 : 5);
    a.run('game.look', { [what]: a.save[what] });
    a.show('arrival');
  };
  a.ui.menu(
    'arrival',
    'Welcome, Guest',
    'A little like you.',
    'Pick a look. Tare has no further questions. Tare has several further questions.',
    [
      {
        id: 'look',
        label: 'Guest look',
        value: looks[a.save.look],
        action: () => set('look', 1),
        adjust: (n) => set('look', n),
      },
      {
        id: 'colour',
        label: 'Tracksuit',
        value: colours[a.save.colour],
        action: () => set('colour', 1),
        adjust: (n) => set('colour', n),
      },
      {
        id: 'begin',
        label: a.flow?.mode === 'front' ? 'Step onto the island' : 'Return to your mat',
        detail: 'A five-day residency. At your own pace.',
        action: a.flow?.mode === 'front' ? a.begin : a.resume,
      },
      ...(a.save.pebbles >= 30
        ? [
            {
              id: 'headband',
              label: 'Earned headband',
              value: a.save.headband ? 'On' : 'Off',
              action: () => {
                a.save.headband = !a.save.headband;
                a.run('game.look', { headband: a.save.headband });
                if (!a.sandbox) a.store.set('progress', a.save);
                a.show('arrival');
              },
            },
          ]
        : []),
      { id: 'controls', label: 'A moment for the controls', action: () => a.show('controls') },
      { id: 'back', label: 'Back', action: () => a.show('title') },
    ],
    { hero: true },
  );
  a.ui.back = () => a.show('title');
}
export function pause(a: ScreenApp): void {
  a.ui.menu(
    'pause',
    'Take your time',
    'A little pause.',
    'Nothing is getting away. The island might be. We are looking into it.',
    a.hubActive
      ? [
          { id: 'resume', label: 'Resume', action: a.resume },
          {
            id: 'volume',
            label: 'Music',
            value: `${Math.round(a.options.music * 100)}%`,
            action: () => {},
            adjust: (n) => {
              a.options.music = Math.max(0, Math.min(1, a.options.music + n * 0.05));
              a.applyOptions();
              a.show('pause');
            },
          },
          {
            id: 'icons',
            label: 'Button icons',
            value: a.options.xbox ? 'Xbox' : 'PlayStation',
            action: () => {
              a.options.xbox = !a.options.xbox;
              a.applyOptions();
              a.show('pause');
            },
          },
        ]
      : [
          { id: 'resume', label: 'Resume', action: a.resume },
          {
            id: 'restart',
            label: 'Restart activity',
            action: () => {
              a.resume();
              a.start(a.flow?.event.id ?? 'check');
            },
          },
          { id: 'programme', label: 'Today’s Programme', action: () => a.show('programme') },
          { id: 'settings', label: 'Settings', action: () => a.show('settings') },
          { id: 'tools', label: 'More at the retreat', action: () => a.show('tools') },
          {
            id: 'quit',
            label: 'Return to title',
            action: () => {
              a.run('game.front');
              a.show('title');
              a.engine?.inspector?.resume();
            },
          },
        ],
  );
  a.ui.back = a.resume;
}
export function tools(a: ScreenApp): void {
  a.ui.menu('tools', 'A little behind the scenes', 'Make yourself at home.', '', [
    { id: 'controls', label: 'Controls', action: () => a.show('controls') },
    { id: 'dev', label: 'Dev Mode', action: () => a.show('dev') },
    { id: 'about', label: 'About / Credits', action: () => a.show('about') },
    {
      id: 'island',
      label: 'Back to the island',
      action: () => {
        a.run('game.leave');
        a.resume();
      },
    },
    { id: 'back', label: 'Back', action: () => a.show('pause') },
  ]);
  a.ui.back = () => a.show('pause');
}
export function controls(a: ScreenApp): void {
  a.syncBindings();
  const d = a.ui.device,
    x = a.options.xbox;
  const scheme = d === 'pad' ? 'Controller' : d === 'mouse' ? 'Mouse & keyboard' : 'Keyboard';
  a.ui.menu(
    'about',
    'One verb. Many small challenges.',
    `${scheme} controls`,
    '',
    [
      {
        id: 'scheme',
        label: 'Show another scheme',
        action: () => {
          a.ui.device = d === 'keyboard' ? 'pad' : d === 'pad' ? 'mouse' : 'keyboard';
          a.show('controls');
        },
      },
      {
        id: 'rebind',
        label: 'Rebind left / right foot',
        detail: 'Select, then press two keys. Escape cancels.',
        action: () => {
          void rebindFeet(a);
        },
      },
      { id: 'reset-bindings', label: 'Restore default feet', action: () => resetFeet(a) },
      { id: 'back', label: 'Back', action: () => a.show(a.flow?.mode === 'front' ? 'title' : 'pause') },
    ],
    {
      extra: `<div class="about-copy"><p>${glyph('lean', d, x)} Lean in every activity. Walk on the island.</p><p>${glyph('left', d, x)} Left foot &nbsp; ${glyph('right', d, x)} Right foot. Hold both to breathe in; release to breathe out.</p><p>${glyph('accept', d, x)} Talk, enter, select &nbsp; ${glyph('plan', d, x)} Programme</p><p>${glyph('pause', d, x)} Pause. ${d === 'mouse' ? 'Click the world to capture the pointer; move to lean. Right click is your right foot.' : 'The same controls work on every mat.'}</p></div>`,
    },
  );
  a.ui.back = () => a.show(a.flow?.mode === 'front' ? 'title' : 'pause');
}
export function group(a: ScreenApp): void {
  a.ui.menu(
    'group',
    'A class, not a match',
    'Room for four.',
    'Connect up to four controllers. Every connected pad gets a mat. Keyboard and mouse join with Space. Other guests will gladly fill in.',
    [
      {
        id: 'begin',
        label: 'Begin Group Class',
        detail: 'Still Ring · a moving class · Still Pond',
        action: () => a.start('group'),
      },
      {
        id: 'cpu',
        label: 'Invite CPU guests',
        value: a.options.cpu ? 'Yes, please' : 'Quiet mats',
        action: () => {
          a.options.cpu = !a.options.cpu;
          a.applyOptions();
          a.show('group');
        },
      },
      { id: 'back', label: 'Back', action: () => a.show('title') },
    ],
    { hero: true },
  );
  a.ui.back = () => a.show('title');
}

export function unsupported(a: ScreenApp): void {
  a.ui.menu(
    'unsupported',
    'A SMALL TECHNICAL MATTER',
    'A different browser.<br>The same little island.',
    'This game needs a browser with WebGPU, such as current Chrome or Edge.',
    [
      { id: 'settings', label: 'Settings', action: () => a.show('settings') },
      { id: 'about', label: 'About the retreat', action: () => a.show('about') },
    ],
    { extra: a.touchOnly ? '<p class="touch-required">Controller or keyboard required</p>' : '' },
  );
  a.ui.root.classList.add('no-gpu');
  a.ui.back = () => {};
}
