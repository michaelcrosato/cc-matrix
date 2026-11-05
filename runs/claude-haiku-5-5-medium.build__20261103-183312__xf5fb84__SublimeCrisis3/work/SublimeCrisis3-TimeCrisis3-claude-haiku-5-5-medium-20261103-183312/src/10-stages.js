// 10-stages.js: the content of the three stages and the training range (plan 5.4 to 5.8, reduced). Scenes are written in
// relative coordinates (see 07-world.js). A wave: { when: 'start' | 'clear' | { t: seconds }, spawn: [[type, nestId, extra]] }.
// Routes and starts in extra are relative too: route: [[dx, y], ...], from: [dx, y], at: [dx, y].

// Set dressing for an area: stalls, lanterns, a tower, cranes. Deterministic (its own stream), so every copy of a stage
// looks the same.
function dress(kind) {
  return function ({ add, base, n, world, scene }) {
    const r = TC.stream(TC.hash(scene.id), 'dress');
    const count = kind === 'storm' ? 6 : 7;
    for (let i = 0; i < count; i++) {
      const x = base + 20 + r() * 330, y = (r() < 0.5 ? -1 : 1) * (80 + r() * 90);
      const w = 14 + r() * 18, h = 20 + r() * 40;
      add([x - w / 2, y - w / 2, 0, x + w / 2, y + w / 2, h], kind === 'festival' ? 'festival' : kind === 'storm' ? 'hut' : 'container', { cover: false, deco: 'set' });
    }
    if (kind === 'festival') {
      for (let i = 0; i < 4; i++) {
        const x = base + 50 + i * 80, y = -110;
        add([x - 1, y - 1, 0, x + 1, y + 1, 56], 'steel', { cover: false, deco: 'lamppost' });
        add([x - 6, y - 6, 52, x + 6, y + 6, 60], 'lantern', { solid: false, deco: 'lantern' });
      }
    }
  };
}

// Stage 1: HARBOR LIGHTS. Port Lumen Docks, 23:40, the Lantern Festival.
TC.def('stage', 1, {
  name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor', ground: 'dock', env: { water: -24, sky: 'night' },
  scenes: [
    {
      id: '1-1', title: 'LANTERN PIER', time: 45,
      nests: [
        { id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 0 }, { id: 'n3', dx: 150, y: 40 },
        { id: 'n4', dx: 230, y: -22 }, { id: 'n5', dx: 240, y: 30 }, { id: 'n6', dx: 300, y: 0 },
      ],
      props: [{ kind: 'crate', dx: 120, y: -30 }, { kind: 'barrel', dx: 200, y: 20 }, { kind: 'crate', dx: 220, y: 40 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n3'], ['deckhand', 'n2']] },
        { when: 'clear', spawn: [['deckhand', 'n4'], ['quartermaster', null, { route: [[260, -80], [380, -80]] }]] },
        { when: 'clear', spawn: [['redtide', 'n5'], ['civilian', null, { route: [[200, -60], [200, 60]] }], ['deckhand', 'n6']] },
      ],
      bonus: [{ kind: 'ring', at: [270, -60, 30] }],
      decorate: dress('festival'),
    },
    {
      id: '1-2', title: 'CRANE ROW', time: 50,
      nests: [
        { id: 'n1', dx: 160, y: -50 }, { id: 'n2', dx: 180, y: -10 }, { id: 'n3', dx: 170, y: 30 },
        { id: 'n4', dx: 260, y: 0, post: true }, { id: 'n5', dx: 280, y: -40 }, { id: 'n6', dx: 300, y: 40, mat: 'steel' },
      ],
      props: [{ kind: 'barrel', dx: 150, y: 0 }, { kind: 'crate', dx: 240, y: -60 }, { kind: 'crate', dx: 250, y: 60, hp: 2 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['shield', 'n2'], ['deckhand', 'n3']] },
        { when: 'clear', spawn: [['grenadier', 'n4'], ['deckhand', 'n5']] },
        { when: 'clear', spawn: [['redtide', 'n6'], ['redtide', 'n1'], ['quartermaster', null, { route: [[250, 90], [390, 90]] }]] },
      ],
      bonus: [{ kind: 'bottle', intel: 'A ferry timetable with the 2am run circled. Somebody knew about the tide.', at: [300, -90, 12] }],
      decorate: dress('harbor'),
    },
    {
      id: '1-3', title: 'CANAL GATE', time: 50,
      nests: [
        { id: 'n1', dx: 150, y: -30 }, { id: 'n2', dx: 160, y: 30 }, { id: 'n3', dx: 230, y: 0 },
        { id: 'n4', dx: 280, y: -50 }, { id: 'n5', dx: 300, y: 50 },
      ],
      props: [{ kind: 'crate', dx: 130, y: 0, hp: 3 }, { kind: 'barrel', dx: 260, y: 26 }, { kind: 'barrel', dx: 270, y: 34 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2']] },
        { when: 'clear', spawn: [['shield', 'n3'], ['grenadier', 'n4'], ['deckhand', 'n5']] },
        { when: 'clear', spawn: [['redtide', 'n1'], ['civilian', null, { route: [[220, -70], [240, 70]] }], ['quartermaster', null, { route: [[280, -90], [400, -90]] }]] },
      ],
      bonus: [{ kind: 'ring', at: [240, 80, 36] }],
      decorate: dress('harbor'),
    },
    {
      id: '1-B', title: 'BARRACUDA', time: 40, boss: 'tidewhip',
      nests: [{ id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 40 }],
      props: [],
      waves: [{ when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2']] }],
      decorate: dress('harbor'),
    },
  ],
});

// Stage 2: STORM SIGNAL. Gull's Rest and Lighthouse Point, 02:10, a thunderstorm.
TC.def('stage', 2, {
  name: 'STORM SIGNAL', place: "Gull's Rest and Lighthouse Point", clock: '02:10', music: 'storm', ground: 'stone', env: { water: -30, sky: 'storm' },
  scenes: [
    {
      id: '2-1', title: "GULL'S REST", time: 50,
      nests: [
        { id: 'n1', dx: 150, y: -50 }, { id: 'n2', dx: 170, y: 0 }, { id: 'n3', dx: 160, y: 50 },
        { id: 'n4', dx: 240, y: -30 }, { id: 'n5', dx: 260, y: 30 },
      ],
      props: [{ kind: 'crate', dx: 130, y: -20 }, { kind: 'crate', dx: 230, y: 0, hp: 2 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2'], ['deckhand', 'n3']] },
        { when: 'clear', spawn: [['shield', 'n4'], ['quartermaster', null, { route: [[220, -90], [360, -90]] }], ['deckhand', 'n5']] },
      ],
      bonus: [{ kind: 'ring', at: [240, 70, 34] }],
      decorate: dress('storm'),
    },
    {
      id: '2-2', title: 'LIGHTHOUSE STAIRS', time: 55,
      nests: [
        { id: 'n1', dx: 170, y: -40 }, { id: 'n2', dx: 240, y: 10 }, { id: 'n3', dx: 300, y: -20, post: true },
        { id: 'n4', dx: 180, y: 50 },
      ],
      props: [{ kind: 'barrel', dx: 200, y: -10 }, { kind: 'crate', dx: 260, y: 60, hp: 3 }],
      waves: [
        { when: 'start', spawn: [['sniper', 'n3'], ['deckhand', 'n1']] },
        { when: 'clear', spawn: [['redtide', 'n2'], ['deckhand', 'n4'], ['shield', 'n1']] },
      ],
      bonus: [{ kind: 'bottle', intel: 'Lighthouse log, 02:04: lamp shuttered, no reason given. Ink smudged.', at: [330, -70, 40] }],
      decorate: dress('storm'),
    },
    {
      id: '2-3', title: 'WATER TOWER', time: 55,
      nests: [
        { id: 'n1', dx: 160, y: -30 }, { id: 'n2', dx: 180, y: 40 }, { id: 'n3', dx: 260, y: 0, mat: 'steel' },
        { id: 'n4', dx: 300, y: -50 },
      ],
      props: [{ kind: 'barrel', dx: 280, y: 40 }, { kind: 'crate', dx: 140, y: 30 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['civilian', null, { route: [[200, -70], [220, 70]] }], ['deckhand', 'n2']] },
        { when: 'clear', spawn: [['grenadier', 'n3'], ['redtide', 'n4']] },
        { when: 'clear', spawn: [['quartermaster', null, { route: [[220, 90], [380, 90]] }], ['sniper', 'n4']] },
      ],
      bonus: [{ kind: 'ring', at: [290, 60, 30] }],
      decorate: dress('storm'),
    },
    {
      id: '2-B', title: 'THE WARDEN', time: 60, boss: 'warden',
      nests: [{ id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 40 }],
      props: [],
      waves: [{ when: 'start', spawn: [['shield', 'n1'], ['deckhand', 'n2']] }],
      decorate: dress('storm'),
    },
  ],
});

// Stage 3: THE TIDEWALL. The sluice gate, 05:20 to dawn: the last push before the king tide.
TC.def('stage', 3, {
  name: 'THE TIDEWALL', place: 'Sluice Locks, Tidewall', clock: '05:20', music: 'dawn', ground: 'concrete', env: { water: -36, sky: 'dawn' },
  scenes: [
    {
      id: '3-1', title: 'SLUICE GATE', time: 55,
      nests: [
        { id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 20 }, { id: 'n3', dx: 220, y: -50 },
        { id: 'n4', dx: 250, y: 40, mat: 'steel' }, { id: 'n5', dx: 300, y: 0 },
      ],
      props: [{ kind: 'barrel', dx: 190, y: 50 }, { kind: 'crate', dx: 150, y: 0, hp: 3 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2'], ['deckhand', 'n3']] },
        { when: 'clear', spawn: [['shield', 'n4'], ['quartermaster', null, { route: [[240, -90], [380, -90]] }], ['deckhand', 'n5']] },
      ],
      bonus: [{ kind: 'ring', at: [260, -70, 36] }],
      decorate: dress('harbor'),
    },
    {
      id: '3-2', title: 'TURBINE HALL', time: 60,
      nests: [
        { id: 'n1', dx: 170, y: -50 }, { id: 'n2', dx: 190, y: 0 }, { id: 'n3', dx: 230, y: 50 },
        { id: 'n4', dx: 280, y: -20, post: true }, { id: 'n5', dx: 320, y: 30 },
      ],
      props: [{ kind: 'barrel', dx: 160, y: -20 }, { kind: 'barrel', dx: 260, y: 20 }, { kind: 'barrel', dx: 275, y: 26 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['redtide', 'n2'], ['deckhand', 'n3']] },
        { when: 'clear', spawn: [['grenadier', 'n4'], ['shield', 'n5'], ['civilian', null, { route: [[230, -80], [230, 80]] }]] },
      ],
      bonus: [{ kind: 'bottle', intel: 'Tidewall roster: the Current paid in crates, not in names.', at: [300, 80, 22] }],
      decorate: dress('harbor'),
    },
    {
      id: '3-3', title: 'CAUSEWAY', time: 60,
      nests: [
        { id: 'n1', dx: 160, y: -40 }, { id: 'n2', dx: 200, y: 30 }, { id: 'n3', dx: 300, y: -10, post: true },
        { id: 'n4', dx: 260, y: 60 },
      ],
      props: [{ kind: 'crate', dx: 230, y: -60, hp: 2 }],
      waves: [
        { when: 'start', spawn: [['sniper', 'n3'], ['deckhand', 'n1'], ['deckhand', 'n2']] },
        { when: 'clear', spawn: [['redtide', 'n4'], ['shield', 'n1'], ['quartermaster', null, { route: [[220, 90], [380, 90]] }]] },
      ],
      bonus: [{ kind: 'ring', at: [280, 80, 30] }],
      decorate: dress('harbor'),
    },
    {
      id: '3-B', title: 'LEVIATHAN', time: 80, boss: 'krake',
      nests: [{ id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 40 }],
      props: [],
      waves: [{ when: 'start', spawn: [['deckhand', 'n1'], ['shield', 'n2']] }],
      decorate: dress('harbor'),
    },
  ],
});

// The training range (plan 5.8): three drills that teach every mechanic. A drill ends when its field is clear; the
// whole range's time is kept as the record.
TC.def('stage', 'range', {
  name: 'CREST RANGE', place: 'CREST training range', clock: '10:00', music: 'range', ground: 'concrete', env: { water: null, sky: 'day' },
  scenes: [
    {
      id: 'R1', title: 'DRILL 1: STATIC TARGETS', time: 90, nests: [
        { id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 0 }, { id: 'n3', dx: 150, y: 40 }, { id: 'n4', dx: 230, y: -20 },
      ],
      props: [{ kind: 'crate', dx: 130, y: 30, hp: 3 }],
      waves: [{ when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2'], ['deckhand', 'n3']] }, { when: 'clear', spawn: [['deckhand', 'n4']] }],
      bonus: [],
    },
    {
      id: 'R2', title: 'DRILL 2: COVER AND RELOAD', time: 90, nests: [
        { id: 'n1', dx: 170, y: -30 }, { id: 'n2', dx: 200, y: 30 }, { id: 'n3', dx: 230, y: 0 },
      ],
      props: [],
      waves: [{ when: 'start', spawn: [['redtide', 'n1'], ['deckhand', 'n2']] }, { when: 'clear', spawn: [['deckhand', 'n3'], ['redtide', 'n1']] }],
      bonus: [],
    },
    {
      id: 'R3', title: 'DRILL 3: THE SPECIALS', time: 100, nests: [
        { id: 'n1', dx: 160, y: -40 }, { id: 'n2', dx: 200, y: 10 }, { id: 'n3', dx: 220, y: 50, mat: 'steel' },
      ],
      props: [{ kind: 'barrel', dx: 180, y: 30 }],
      waves: [{ when: 'start', spawn: [['shield', 'n3'], ['deckhand', 'n1']] }, { when: 'clear', spawn: [['grenadier', 'n2'], ['deckhand', 'n1']] }],
      bonus: [{ kind: 'bottle', intel: 'A CREST field note: "Hold your fire" applies to the festival, not the pier.', at: [240, 60, 18] }],
    },
  ],
});
