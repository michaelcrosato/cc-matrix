/* Authored encounter definitions. Positions are in the x/y flight plane. */
(() => {
  "use strict";
  const F = globalThis.FWR;
  const crystal = (x, y, extra = {}) => ({ type: "crystal", x, y, ...extra });
  const foe = (type, x, y, extra = {}) => ({ type, x, y, ...extra });
  F.CONTENT = [
    {
      id: "opening",
      name: "FIRST LIGHT",
      length: 2800,
      quota: 2,
      kills: 1,
      briefing: "A signal in the dark. Touch the violet collar. Bring them home.",
      spawns: [
        crystal(620, 338, { tutorial: true }),
        foe("layer", 1350, 190, { hp: 4, pattern: "curtain", key: true }),
        crystal(2070, 450, { intercept: true }),
      ],
    },
    {
      id: "outreach",
      name: "THE OPEN REACH",
      length: 21000,
      quota: 3,
      kills: 2,
      briefing: "Three signals beyond the minefields. Destroy a Pulsar to collapse its field.",
      spawns: [
        foe("layer", 2100, 180, { pattern: "curtain", key: true }),
        crystal(3400, 445),
        foe("interceptor", 4450, 500),
        foe("interceptor", 5100, 180),
        foe("layer", 6550, 500, { pattern: "ring" }),
        foe("interceptor", 8100, 260),
        foe("layer", 10100, 180, { pattern: "arc", key: true }),
        crystal(11200, 205),
        foe("interceptor", 12300, 490),
        foe("layer", 13900, 490, { pattern: "curtain" }),
        foe("interceptor", 15300, 220),
        foe("layer", 17300, 170, { pattern: "ring" }),
        crystal(18100, 470),
        foe("interceptor", 19400, 310),
      ],
    },
    {
      id: "prison-orbit",
      name: "THE SHATTER BELT",
      length: 28000,
      quota: 4,
      kills: 2,
      briefing:
        "Four captives in prison orbit. Guard shields open between volleys. Watch for ion shrouds.",
      shroud: [10900, 14500],
      spawns: [
        foe("layer", 2000, 490, { pattern: "arc", key: true }),
        foe("guard", 3250, 235),
        crystal(4100, 220),
        foe("interceptor", 5600, 420),
        foe("layer", 6900, 180, { pattern: "curtain" }),
        crystal(8200, 470),
        foe("interceptor", 9600, 490),
        foe("layer", 11200, 230, { pattern: "ring" }),
        crystal(12600, 190),
        foe("layer", 14300, 490, { pattern: "arc" }),
        foe("interceptor", 16000, 200),
        foe("guard", 17800, 460),
        crystal(18800, 450),
        foe("layer", 20200, 170, { pattern: "curtain", key: true }),
        foe("guard", 21400, 220),
        crystal(21900, 190, { optional: true }),
        foe("interceptor", 23200, 450),
        foe("layer", 24800, 490, { pattern: "ring" }),
        foe("interceptor", 26400, 240),
      ],
    },
    {
      id: "carrier",
      name: "THE PRISON STAR",
      length: 6500,
      quota: 3,
      kills: 0,
      briefing:
        "The carrier holds three prisoners. Break its field organs. Leave a route for the survivors.",
      spawns: [
        foe("interceptor", 1400, 200),
        foe("guard", 2350, 470),
        foe("carrier", 5560, 337.5, { w: 260, h: 310, hp: 999 }),
        foe("organ", 5325, 175, { hp: 20, key: true, pattern: "curtain" }),
        foe("organ", 5325, 500, { hp: 20, key: true, pattern: "arc" }),
        foe("core", 5414, 337.5, { hp: 65 }),
      ],
    },
    {
      id: "extraction",
      name: "HOMEWARD",
      length: 3400,
      quota: 0,
      kills: 0,
      briefing: "All hands aboard. Drive charged. Follow the clear lane to the evacuation gate.",
      spawns: [
        foe("layer", 1200, 145, { pattern: "curtain" }),
        foe("layer", 2100, 535, { pattern: "arc" }),
      ],
    },
  ];
  F.FORMATIONS = ["curtain", "ring", "arc"];
  F.validateContent = (defs = F.CONTENT) => {
    const errors = [];
    const types = new Set([
      "crystal",
      "layer",
      "interceptor",
      "guard",
      "carrier",
      "organ",
      "core",
      "hazard",
    ]);
    const names = new Set();
    for (const [i, s] of defs.entries()) {
      if (!s.id || names.has(s.id)) errors.push("Duplicate/missing sector id " + i);
      names.add(s.id);
      if (!(s.length >= 1200) || !(s.quota >= 0) || !s.briefing)
        errors.push("Invalid sector " + s.id);
      for (const e of s.spawns || []) {
        if (
          !types.has(e.type) ||
          !Number.isFinite(e.x) ||
          !Number.isFinite(e.y) ||
          e.x < 50 ||
          e.x > s.length ||
          e.y < 70 ||
          e.y > 610
        )
          errors.push("Invalid spawn in " + s.id);
        if (e.pattern && !F.FORMATIONS.includes(e.pattern))
          errors.push("Unknown pattern " + e.pattern);
      }
      if (i !== 3 && s.spawns.filter((e) => e.type === "crystal" && !e.optional).length < s.quota)
        errors.push("Impossible quota " + s.id);
    }
    return errors;
  };
})();
