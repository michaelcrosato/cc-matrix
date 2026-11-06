/* Original content for Yars on the Edge. World coordinates are x/y; z is decorative. */
(() => {
  const G = (globalThis.Edge = globalThis.Edge || {});
  G.W = 640;
  G.H = 280;
  G.DT = 1 / 120;
  G.DEFAULTS = Object.freeze({
    speed: 116,
    bite: 0.15,
    charge: 5,
    fire: 0.115,
    cannonSpeed: 460,
    cannonWind: 0.28,
    pursuerSpeed: 38,
    pursuerTurn: 1.65,
    swirlSpeed: 155,
    swirlWind: 1.25,
    outage: 3.2,
    reserve: 3,
  });
  G.TUNING = [
    ["speed", "Scout speed", 60, 220, 2, " u/s"],
    ["bite", "Bite cadence", 0.06, 0.5, 0.01, " s"],
    ["charge", "Bites to charge", 1, 12, 1, " bites"],
    ["fire", "Primary cadence", 0.05, 0.35, 0.005, " s"],
    ["cannonSpeed", "Cannon speed", 200, 800, 10, " u/s"],
    ["cannonWind", "Cannon warning", 0.18, 0.8, 0.01, " s"],
    ["pursuerSpeed", "Pursuer speed", 12, 95, 1, " u/s"],
    ["pursuerTurn", "Pursuer turn", 0.3, 4, 0.05, " rad/s"],
    ["swirlSpeed", "Swirl speed", 75, 240, 5, " u/s"],
    ["swirlWind", "Swirl warning", 1, 3, 0.05, " s"],
    ["outage", "Refuge outage", 1, 6, 0.1, " s"],
    ["reserve", "Replacement scouts", 0, 8, 1, " scouts"],
  ];
  const cells = (cols, rows, x, y, plate, condition, reflective) => {
    const out = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (condition(c, r))
          out.push({
            id: `${plate}:${c}:${r}`,
            x: x + c * 12,
            y: y + r * 12,
            material: reflective?.(c, r) ? 1 : 0,
            plate,
          });
    return out;
  };
  G.SECTORS = [
    {
      name: "MORROW ARCH",
      subtitle: "The shell remembers the sky.",
      story: "Ilex is gone. Its song still hides us. Bite the wall. Give the silence teeth.",
      color: "#ff7659",
      dark: "#4b2435",
      light: "#ffd795",
      core: "#ffb569",
      static: "#6ce9d4",
      hits: 1,
      refuge: { x: 238, w: 58 },
      plates: [{ amplitude: 0, period: 10, phase: 0 }],
      cells: cells(8, 17, 420, 44, 0, (c, r) => c < 4 || r < 3 || r > 13),
      firstSwirl: 15,
      swirlEvery: 14,
      pursuers: 1,
    },
    {
      name: "THE MIRROR CHOIR",
      subtitle: "It has learned to return our anger.",
      story:
        "The Choir wears stolen light. Diamond cells return one siege shot. Step out of the returning lane.",
      color: "#8b8dff",
      dark: "#2b2854",
      light: "#dbcdff",
      core: "#e3baff",
      static: "#78e6f0",
      hits: 2,
      refuge: { x: 234, w: 60 },
      plates: [
        { amplitude: 34, period: 9, phase: 0 },
        { amplitude: 42, period: 11, phase: 2.2 },
      ],
      cells: [
        ...cells(
          3,
          15,
          414,
          42,
          0,
          () => true,
          (c, r) => c === 0 && r % 4 === 2,
        ),
        ...cells(
          3,
          15,
          480,
          62,
          1,
          () => true,
          (c, r) => c === 1 && r % 5 === 1,
        ),
      ],
      firstSwirl: 11,
      swirlEvery: 12,
      pursuers: 2,
    },
    {
      name: "THE LAST LISTENER",
      subtitle: "A heart at the end of the signal.",
      story: "Bellkeeper, we heard you through the ashes. Now hear us.",
      color: "#ddaf62",
      dark: "#433047",
      light: "#fff0ad",
      core: "#ff7188",
      static: "#b6f7bb",
      hits: 3,
      refuge: { x: 238, w: 58 },
      plates: [
        { amplitude: 18, period: 12, phase: 0 },
        { amplitude: 26, period: 8, phase: 1 },
      ],
      cells: [
        ...cells(
          4,
          17,
          414,
          44,
          0,
          (c, r) => true,
          (c, r) => c === 1 && (r === 3 || r === 13),
        ),
        ...cells(3, 13, 480, 68, 1, (c, r) => c < 2 || r < 2 || r > 10),
      ],
      firstSwirl: 10,
      swirlEvery: 10,
      pursuers: 2,
    },
  ];
  G.blankAction = () => ({ mx: 0, my: 0, ax: 1, ay: 0, fire: false, cannon: 0 });
  G.validateTuning = (input) => {
    const v = { ...G.DEFAULTS };
    for (const [k, , lo, hi] of G.TUNING)
      if (Number.isFinite(input?.[k])) v[k] = Math.max(lo, Math.min(hi, input[k]));
    v.charge = Math.round(v.charge);
    v.reserve = Math.round(v.reserve);
    return v;
  };
  G.validateEncounter = (data) => {
    if (!data || data.schema !== 1 || !Array.isArray(data.cells) || data.cells.length > 400)
      throw Error("Schema 1 and at most 400 cells required.");
    const out = {
      schema: 1,
      name: String(data.name || "Custom encounter").slice(0, 40),
      sector: Math.max(0, Math.min(2, Math.trunc(data.sector) || 0)),
      refuge: { x: 238, w: 58 },
      plates: [],
      cells: [],
    };
    if (
      !Number.isFinite(data.refuge?.x) ||
      !Number.isFinite(data.refuge?.w) ||
      data.refuge.x < 90 ||
      data.refuge.x > 350 ||
      data.refuge.w < 24 ||
      data.refuge.w > 100
    )
      throw Error("Refuge must fit x 90–350, width 24–100.");
    out.refuge = { x: data.refuge.x, w: data.refuge.w };
    if (!Array.isArray(data.plates) || data.plates.length < 1 || data.plates.length > 2)
      throw Error("One or two plate paths required.");
    out.plates = data.plates.map((p) => {
      if (
        ![p.amplitude, p.period, p.phase].every(Number.isFinite) ||
        Math.abs(p.amplitude) > 48 ||
        p.period < 3 ||
        p.period > 30
      )
        throw Error("Invalid plate path.");
      return { amplitude: p.amplitude, period: p.period, phase: p.phase };
    });
    const used = new Set();
    for (const c of data.cells) {
      if (
        ![c.x, c.y, c.plate, c.material].every(Number.isFinite) ||
        c.x < 330 ||
        c.x > 522 ||
        c.y < 20 ||
        c.y > 260 ||
        ![0, 1].includes(c.material) ||
        !Number.isInteger(c.plate) ||
        c.plate < 0 ||
        c.plate >= out.plates.length
      )
        throw Error("Invalid cell: use x 330–522, y 20–260 and material 0/1.");
      const key = `${c.x}:${c.y}:${c.plate}`;
      if (used.has(key)) throw Error("Duplicate cell.");
      used.add(key);
      out.cells.push({
        id: `edit:${out.cells.length}`,
        x: c.x,
        y: c.y,
        plate: c.plate,
        material: c.material,
      });
    }
    return out;
  };
  G.encounterOf = (i) => ({
    schema: 1,
    name: G.SECTORS[i].name,
    sector: i,
    refuge: { ...G.SECTORS[i].refuge },
    plates: G.SECTORS[i].plates.map((p) => ({ ...p })),
    cells: G.SECTORS[i].cells.map((c) => ({ ...c })),
  });
})();
