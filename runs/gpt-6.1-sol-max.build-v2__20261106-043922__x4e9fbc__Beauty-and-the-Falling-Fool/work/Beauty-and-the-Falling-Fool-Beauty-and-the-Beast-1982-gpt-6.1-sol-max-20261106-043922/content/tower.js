/* Authored world data. No simulation or rendering decisions live here. */
(() => {
  const F = (globalThis.FF = globalThis.FF || {});
  F.TITLE = 'Beauty and the Falling Fool';
  F.BUILD =
    'Beauty-and-the-Falling-Fool-Beauty-and-the-Beast-1982-gpt-6.1-sol-max-20261106-043922';
  F.DEFAULTS = Object.freeze({
    run: 95,
    jump: 200,
    climbTime: 0.7,
    open: 5.4,
    warning: 1.4,
    cadence: 1,
    hazardSpeed: 1,
    heart: 6,
  });
  F.TUNING = [
    ['run', 'Run speed', 65, 130, 5],
    ['jump', 'Jump impulse', 155, 220, 5],
    ['climbTime', 'Window climb time', 0.4, 1.2, 0.05],
    ['open', 'Open interval', 2.4, 8, 0.2],
    ['warning', 'Shutter warning', 0.8, 2.4, 0.1],
    ['cadence', 'Hazard cadence', 0.5, 1.6, 0.1],
    ['hazardSpeed', 'Hazard speed', 0.6, 1.6, 0.1],
    ['heart', 'Heart rush seconds', 3, 10, 0.5],
  ];
  const definitions = [
    {
      id: 'brick',
      name: 'The Butterbrick Block',
      color: '#b96353',
      shadow: '#713f4b',
      trim: '#ffdb9c',
      sky: ['#293e68', '#d17c79', '#ffd5a0'],
      x0: 40,
      x1: 360,
      spawn: 68,
      goal: 320,
      windows: [
        [104, 296],
        [280, 120],
        [120, 280],
        [288, 112],
      ],
      offsets: [0, 4, 8, 12],
      lessons: [
        'A big bully. A tall building. Up you go!',
        'Mabel sends her heart. Catch it, then bowl THEM over!',
        'Rats have right of way. Unless you jump.',
        'One more window. Hank is getting nervous.',
      ],
      lanes: [
        [{ kind: 'rolling', delay: 4, dir: -1, speed: 47 }],
        [
          { kind: 'rat', delay: 1, dir: -1, speed: 35 },
          { kind: 'rolling', delay: 7, dir: 1, speed: 50 },
        ],
        [{ kind: 'rat', delay: 1, dir: 1, speed: 40 }],
        [
          { kind: 'rolling', delay: 1, dir: -1, speed: 60 },
          { kind: 'rat', delay: 6, dir: 1, speed: 36 },
        ],
      ],
      hearts: [1, 3],
      banner: 'SMALL FELLA. BIG PLANS.',
    },
    {
      id: 'awning',
      name: 'The Awning Argument',
      color: '#9a6866',
      shadow: '#4d536d',
      trim: '#f4cf9a',
      sky: ['#283d67', '#a07187', '#edb39a'],
      x0: 56,
      x1: 344,
      spawn: 82,
      goal: 308,
      windows: [
        [128, 280],
        [272, 136],
        [136, 272],
        [280, 128],
      ],
      offsets: [3, 7, 11, 15],
      lessons: [
        'Those striped bumpers mean trouble. Watch the bounce.',
        'Cracked rocks have twice the bad manners.',
        'Birds dip in the middle. Hug a window pocket.',
        'Mind the awnings. They are not umbrellas.',
      ],
      lanes: [
        [
          {
            kind: 'bumper',
            delay: 1,
            dir: -1,
            speed: 63,
            bumper: 'middle-reverse',
          },
        ],
        [{ kind: 'split', delay: 1, dir: 1, speed: 58, breakX: 220 }],
        [{ kind: 'bird', delay: 1, dir: -1, speed: 62 }],
        [
          {
            kind: 'bumper',
            delay: 1,
            dir: 1,
            speed: 62,
            bumper: 'middle-drop',
          },
          { kind: 'bird', delay: 7, dir: -1, speed: 65 },
        ],
      ],
      hearts: [1, 3],
      banner: 'HANK SKIPPED LEG DAY.',
    },
    {
      id: 'dusk',
      name: 'The Moonlight Misstep',
      color: '#626b87',
      shadow: '#333a5c',
      trim: '#c7e5df',
      sky: ['#182c50', '#535879', '#b2829b'],
      x0: 72,
      x1: 328,
      spawn: 96,
      goal: 296,
      windows: [
        [144, 264],
        [256, 144],
        [152, 256],
        [264, 144],
      ],
      offsets: [2, 8, 13, 18],
      lessons: [
        'Bats wind up, then swoop. Let them finish their fuss.',
        'An open window is a way out, not a promise of safety.',
        'Little feet. Big heart. Keep climbing.',
        "Top of the town. Bottom of Hank's patience.",
      ],
      lanes: [
        [{ kind: 'bat', delay: 1, dir: -1, speed: 43 }],
        [
          { kind: 'split', delay: 1, dir: -1, speed: 60, breakX: 190 },
          { kind: 'rat', delay: 7, dir: 1, speed: 38 },
        ],
        [
          { kind: 'bat', delay: 1, dir: 1, speed: 45 },
          { kind: 'bird', delay: 8, dir: -1, speed: 62 },
        ],
        [
          { kind: 'rolling', delay: 1, dir: -1, speed: 64 },
          { kind: 'bat', delay: 7, dir: 1, speed: 44 },
        ],
      ],
      hearts: [0, 2, 3],
      banner: 'THE SKY IS NOT THE LIMIT.',
    },
    {
      id: 'roof',
      finale: { beats: 3, heartFloor: 2, rescueFloor: 3 },
      name: 'The Rooftop Ruckus',
      color: '#566780',
      shadow: '#263653',
      trim: '#f4d59c',
      sky: ['#14284a', '#41476b', '#b47a91'],
      x0: 88,
      x1: 312,
      spawn: 112,
      goal: 278,
      windows: [
        [152, 256],
        [248, 160],
        [160, 248],
      ],
      offsets: [0, 5, 11],
      lessons: [
        'Hank retreats! Follow the open window.',
        'A bird crossing, or a window pocket. Your choice.',
        'Mabel has one last heart. Give Hank a proper hello!',
      ],
      lanes: [
        [{ kind: 'rolling', delay: 1, dir: -1, speed: 64 }],
        [
          { kind: 'bird', delay: 1, dir: -1, speed: 60 },
          { kind: 'bumper', delay: 6, dir: 1, speed: 60, bumper: 'roof-drop' },
        ],
        [
          { kind: 'split', delay: 1, dir: -1, speed: 58, breakX: 206 },
          { kind: 'bat', delay: 6, dir: 1, speed: 42 },
        ],
      ],
      hearts: [2],
      banner: 'LOVE HAS THE LAST LAUGH.',
    },
  ];
  F.SECTIONS = definitions.map((s, section) => ({
    ...s,
    section,
    spacing: 48,
    base: 16,
    floors: Array.from({ length: s.windows.length + 1 }, (_, i) => ({
      id: `${s.id}-ledge-${i}`,
      z: 16 + 48 * i,
    })),
    windows: s.windows.flatMap((xs, floor) =>
      xs.map((x, slot) => ({
        id: `${s.id}-w${floor}-${slot}`,
        floor,
        slot,
        x,
        z0: 16 + 48 * floor,
        z1: 64 + 48 * floor,
        offset: s.offsets[floor],
        opening: 0.65,
        closing: 0.45,
        gap: 1.3,
      })),
    ),
    encounters: s.lanes.flatMap((lane, floor) =>
      lane.map((h, i) => ({ ...h, id: `${s.id}-h${floor}-${i}`, floor })),
    ),
    hearts: s.hearts.map((floor, i) => ({
      id: `${s.id}-heart-${i}`,
      floor,
      x: s.windows[floor][0],
      delay: 2,
      pathTime: 2.2,
    })),
    bumpers: [
      {
        id: section === 1 ? 'middle-reverse' : `${s.id}-reverse`,
        x: s.x0 + 28,
        behavior: 'reverse',
      },
      {
        id:
          section === 1
            ? 'middle-drop'
            : section === 3
              ? 'roof-drop'
              : `${s.id}-drop`,
        x: s.x1 - 28,
        behavior: 'drop',
      },
    ],
    checkpoint: `checkpoint-${s.id}`,
    finale: s.finale || null,
    hard: { order: [1, 0], offset: 3, extra: section > 0 ? 'bat' : 'rat' },
  }));
  F.validate = (sections = F.SECTIONS) => {
    const ids = new Set(),
      errors = [];
    const id = (value) => {
      if (!value || ids.has(value))
        errors.push(`Missing/duplicate ID: ${value}`);
      ids.add(value);
    };
    for (const s of sections) {
      id(s.id);
      id(s.checkpoint);
      if (!(s.x1 > s.x0 + 100)) errors.push(`${s.id}: invalid facade`);
      for (const fl of s.floors) id(fl.id);
      for (const w of s.windows) {
        id(w.id);
        if (
          w.floor < 0 ||
          w.floor >= s.floors.length - 1 ||
          w.z1 - w.z0 !== s.spacing ||
          w.x < s.x0 + 12 ||
          w.x > s.x1 - 12
        )
          errors.push(`${w.id}: unreachable endpoint`);
        if (w.opening < 0.3 || w.closing < 0.2 || w.gap < 0.1)
          errors.push(`${w.id}: invalid timing`);
      }
      for (let f = 0; f < s.floors.length - 1; f++)
        if (s.windows.filter((w) => w.floor === f).length !== 2)
          errors.push(
            `${s.id}: floor ${f} needs exactly two sequenced windows`,
          );
      for (const b of s.bumpers) id(b.id);
      for (const h of s.encounters) {
        id(h.id);
        if (
          !['rolling', 'bumper', 'split', 'rat', 'bird', 'bat'].includes(
            h.kind,
          ) ||
          h.floor >= s.floors.length - 1 ||
          !(h.speed > 0) ||
          h.delay < 0.7
        )
          errors.push(`${h.id}: invalid hazard`);
        if (h.bumper && !s.bumpers.some((b) => b.id === h.bumper))
          errors.push(`${h.id}: broken bumper link`);
      }
      for (const h of s.hearts) {
        id(h.id);
        if (h.floor < 0 || h.floor >= s.floors.length - 1 || h.pathTime < 1)
          errors.push(`${h.id}: invalid heart route`);
      }
      if (!s.hard || new Set(s.hard.order).size !== 2)
        errors.push(`${s.id}: invalid replay order`);
      if (s.finale && s.finale.rescueFloor !== s.floors.length - 1)
        errors.push(`${s.id}: unreachable finale`);
    }
    return errors;
  };
})();
