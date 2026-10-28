export const CHARACTERS = [
  {
    id: "pip",
    name: "Pip",
    klass: "feather",
    blurb: "Tiny, twitchy, and first into the corner.",
    accel: 22,
    brake: 36,
    top: 23,
    reverse: 8,
    handle: 2.75,
    weight: 0.72,
    color: 0xff4d6d,
    accent: 0xffe08a,
    cloth: 0xfff4ea,
    body: [0.72, 0.28, 1.12],
  },
  {
    id: "quill",
    name: "Quill",
    klass: "light",
    blurb: "Quick off the line and fond of a long hop.",
    accel: 18,
    brake: 32,
    top: 25.5,
    reverse: 7.6,
    handle: 2.4,
    weight: 0.86,
    color: 0xffd23f,
    accent: 0xfff6d0,
    cloth: 0xf7f1ff,
    body: [0.82, 0.32, 1.28],
  },
  {
    id: "bramble",
    name: "Bramble",
    klass: "middle",
    blurb: "A square deal in a square kart.",
    accel: 14.5,
    brake: 28,
    top: 27.5,
    reverse: 7,
    handle: 2.05,
    weight: 1,
    color: 0x2fbf71,
    accent: 0xd8ffe4,
    cloth: 0xf3fff6,
    body: [0.96, 0.38, 1.46],
  },
  {
    id: "holt",
    name: "Holt",
    klass: "heavy",
    blurb: "Slow to wake. Awful to bump.",
    accel: 10.5,
    brake: 24,
    top: 30.5,
    reverse: 6.4,
    handle: 1.65,
    weight: 1.48,
    color: 0x3d5afe,
    accent: 0xd6dcff,
    cloth: 0xeef1ff,
    body: [1.16, 0.46, 1.68],
  },
];

export function characterById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function fieldEntrants(humanIds, mode) {
  const humans = humanIds.map((id, index) => {
    const character = characterById(id);
    return {
      characterId: character.id,
      name: character.name,
      isPlayer: true,
      playerIndex: index,
    };
  });
  if (mode === "battle" || mode === "trial") return humans;
  const entrants = humans.slice();
  let cursor = 0;
  while (entrants.length < 8) {
    const character = CHARACTERS[cursor % CHARACTERS.length];
    cursor += 1;
    const taken = entrants.some((e) => e.name === character.name);
    entrants.push({
      characterId: character.id,
      name: taken ? `${character.name} ${cursor}` : character.name,
      isPlayer: false,
      playerIndex: null,
    });
  }
  return entrants;
}
