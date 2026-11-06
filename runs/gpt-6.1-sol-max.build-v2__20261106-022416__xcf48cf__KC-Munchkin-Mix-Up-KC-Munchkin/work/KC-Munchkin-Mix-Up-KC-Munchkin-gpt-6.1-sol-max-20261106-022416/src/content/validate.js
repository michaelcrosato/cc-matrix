(function (M) {
  "use strict";
  M.validate = (data) => {
    const errors = [];
    const fail = (message, cells = []) => errors.push({ message, cells });
    if (!data || typeof data !== "object" || data.version !== 1)
      return { ok: false, errors: [{ message: "Use a Mix-Up version 1 maze.", cells: [] }] };
    if (
      typeof data.id !== "string" ||
      !/^[-a-z0-9]{1,40}$/.test(data.id) ||
      typeof data.name !== "string" ||
      data.name.length < 1 ||
      data.name.length > 64 ||
      typeof data.subtitle !== "string" ||
      data.subtitle.length > 120 ||
      typeof data.hint !== "string" ||
      !data.hint.length ||
      data.hint.length > 240 ||
      typeof data.clear !== "string" ||
      !data.clear.length ||
      data.clear.length > 120 ||
      !Number.isInteger(data.seed) ||
      data.seed < 0 ||
      data.seed > 4294967295
    )
      return {
        ok: false,
        errors: [
          {
            message: "Use a valid maze ID, name, hint, clear message and numeric seed.",
            cells: [],
          },
        ],
      };
    if (
      data.w !== 21 ||
      data.h !== 17 ||
      !Array.isArray(data.rows) ||
      data.rows.length !== 17 ||
      data.rows.some((r) => typeof r !== "string" || r.length !== 21 || /[^.#]/.test(r))
    )
      return {
        ok: false,
        errors: [
          { message: "The maze must be 21 × 17 cells, using only walls and floor.", cells: [] },
        ],
      };
    if (
      !data.gate ||
      data.gate.x !== 10 ||
      data.gate.y !== 8 ||
      typeof data.gate.turning !== "boolean"
    )
      return {
        ok: false,
        errors: [{ message: "Keep the permanent pen centred at 10, 8.", cells: [[10, 8]] }],
      };
    if (!Array.isArray(data.tunnels) || data.tunnels.length > 3)
      return {
        ok: false,
        errors: [{ message: "Use up to three paired side tunnels.", cells: [] }],
      };
    for (const t of data.tunnels)
      if (
        !t ||
        !Array.isArray(t.a) ||
        !Array.isArray(t.b) ||
        t.a[0] !== 0 ||
        t.b[0] !== 20 ||
        t.a[1] !== t.b[1] ||
        !Number.isInteger(t.a[1]) ||
        t.a[1] < 1 ||
        t.a[1] > 15 ||
        t.ad !== 3 ||
        t.bd !== 1
      )
        return {
          ok: false,
          errors: [
            { message: "Pair the left and right tunnel mouths on the same row.", cells: [] },
          ],
        };
    if (new Set(data.tunnels.map((t) => t.a[1])).size !== data.tunnels.length)
      fail("Tunnel pairs need different rows.");
    const b = new M.Board(data),
      expected = M.penTemplate(Array.from({ length: 17 }, () => Array(21).fill("#")));
    for (let y = 6; y <= 10; y++)
      for (let x = 8; x <= 12; x++)
        if (data.rows[y][x] !== expected[y][x]) fail("Keep the pen template intact.", [[x, y]]);
    const tunnelRows = new Set(data.tunnels.map((t) => t.a[1]));
    for (let y = 0; y < 17; y++)
      for (let x = 0; x < 21; x++)
        if (
          (y === 0 || y === 16 || x === 0 || x === 20) &&
          data.rows[y][x] === "." &&
          !(x === 0 || x === 20 ? tunnelRows.has(y) : false)
        )
          fail("An open edge needs a paired tunnel.", [[x, y]]);
    if (
      !Array.isArray(data.spawns) ||
      data.spawns.length !== 2 ||
      data.spawns.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isInteger))
    )
      return { ok: false, errors: [{ message: "Place two safe hero starts.", cells: [] }] };
    if (
      !Array.isArray(data.food) ||
      data.food.length !== 12 ||
      new Set(data.food.map((f) => f?.id)).size !== 12 ||
      data.food.some(
        (f, i) =>
          !f ||
          f.id !== `f${i}` ||
          f.power !== i >= 8 ||
          !Number.isInteger(f.dir) ||
          f.dir < 0 ||
          f.dir > 3 ||
          !/^f(?:[0-9]|1[01])$/.test(f.id) ||
          !Number.isInteger(f.x) ||
          !Number.isInteger(f.y) ||
          typeof f.power !== "boolean",
      ) ||
      data.food.filter((f) => f.power).length !== 4
    )
      return {
        ok: false,
        errors: [
          {
            message: "Place twelve different snacks, including exactly four star snacks.",
            cells: [],
          },
        ],
      };
    const used = new Set();
    for (const p of data.spawns.concat(data.food.map((f) => [f.x, f.y]))) {
      if (!b.walk(...p) || b.inPen(...p) || b.gateIndex(...p) >= 0)
        fail("Move this start or snack onto an open lane outside the pen.", [p]);
      if (used.has(M.key(...p))) fail("Give each start and snack its own cell.", [p]);
      used.add(M.key(...p));
    }
    if (
      !Array.isArray(data.predators) ||
      data.predators.length !== 3 ||
      new Set(data.predators.map((p) => p?.role)).size !== 3 ||
      data.predators.some(
        (p) =>
          !p ||
          p.id !== { follower: "needle", interceptor: "peek", keeper: "chonk" }[p.role] ||
          !Number.isInteger(p.x) ||
          !Number.isInteger(p.y) ||
          !["follower", "interceptor", "keeper"].includes(p.role) ||
          !b.inPen(p.x, p.y) ||
          !b.baseWalk(p.x, p.y) ||
          !Number.isFinite(p.release) ||
          p.release < 2 ||
          p.release > 30 ||
          !Number.isFinite(p.speed) ||
          p.speed < 0.2 ||
          p.speed > 2,
      )
    )
      fail("Keep three different predators safely in the pen.");
    if (
      !data.reveal ||
      !["none", "all", "bands"].includes(data.reveal.kind) ||
      !Number.isFinite(data.reveal.period) ||
      data.reveal.period < 3 ||
      data.reveal.period > 30 ||
      !Number.isFinite(data.reveal.duration) ||
      data.reveal.duration < 0.5 ||
      data.reveal.duration > 5
    )
      fail("Choose a visible or disappearing-wall reveal preset.");
    if (errors.length) return { ok: false, errors };
    for (let i = 0; i < 4; i++) {
      b.setOrientation(i);
      const cells = b.floorCells(),
        D = b.distances(...data.spawns[0]);
      if (cells.some((p) => !D.has(M.key(...p)))) {
        fail(
          "Join every open lane to the rest of the maze in every gate position.",
          cells.filter((p) => !D.has(M.key(...p))).slice(0, 8),
        );
        break;
      }
      const edges = cells.reduce((sum, p) => sum + b.edges(...p).length, 0) / 2;
      if (edges - cells.length + 1 < 6)
        fail("Add cross-links: the snacks need at least six interception loops.");
    }
    for (const p of data.spawns)
      if (b.edges(...p).length < 2 || b.distance(p, [10, 8]) < 5)
        fail("Move the hero start to a safe pocket with two exits.", [p]);
    for (const f of data.food)
      if (data.spawns.some((p) => p[0] === f.x && p[1] === f.y))
        fail("Move the snack away from a hero start.", [[f.x, f.y]]);
    return { ok: !errors.length, errors };
  };
})(globalThis.Mix);
