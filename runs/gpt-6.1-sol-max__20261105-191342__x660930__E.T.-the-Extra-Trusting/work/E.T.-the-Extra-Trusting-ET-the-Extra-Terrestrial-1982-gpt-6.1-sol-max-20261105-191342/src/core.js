export const DEFAULTS = {
  speed: 7.8,
  boost: 1.65,
  search: 1,
  agentSpeed: 2.1,
  glowRange: 9,
  bondDrain: 0.12,
  gravity: 16,
};
export const PARTS = [
  {
    id: 0,
    x: 17,
    z: 32,
    name: 'Toy keyboard',
    short: 'KEYS',
    icon: '▤',
    line: 'It only knows three notes. Maybe that’s enough.',
  },
  {
    id: 1,
    x: -30,
    z: -30,
    name: 'Satellite dish',
    short: 'DISH',
    icon: '◒',
    line: 'A salad bowl, if anybody asks.',
  },
  {
    id: 2,
    x: 28,
    z: -1,
    name: 'Copper wire',
    short: 'WIRE',
    icon: '⌁',
    line: 'Careful. Someone left the porch lights walking around.',
  },
];
export const FLOWERS = [
  { x: -8, z: 14 },
  { x: 36, z: -29 },
  { x: -7, z: -37 },
];
export const BRIDGE = { x: -18, z: -13 };
export const TRANSMITTER = { x: 1, z: -44 };
export const RINGS = [
  { x: 0, z: -52, y: 7 },
  { x: -14, z: -62, y: 11 },
  { x: -25, z: -74, y: 16 },
  { x: -12, z: -87, y: 21 },
  { x: 8, z: -96, y: 24 },
  { x: 24, z: -104, y: 20 },
];
export const SHIP = { x: 24, z: -117, y: 14 };
export const NAMES = ['June', 'Mara', 'Kit', 'Sam'];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const angleLerp = (a, b, t) => a + wrapAngle(b - a) * t;
export class Journey {
  constructor(R, { cheat = false } = {}) {
    this.R = R;
    this.world = new R.World({ x: 0, y: -16, z: 0 });
    this.settings = { ...DEFAULTS };
    this.players = new Map();
    this.controllers = new Map();
    this.inputs = new Map();
    this.static = [];
    this.events = [];
    this.eventId = 0;
    this.clock = 0;
    this.tick = 0;
    this.phase = 'gather';
    this.parts = [false, false, false];
    this.flowers = [false, false, false];
    this.bridge = false;
    this.bond = 100;
    this.ring = 0;
    this.tune = 0;
    this.tuneClock = 0;
    this.tuneMisses = 0;
    this.rescues = 0;
    this.candies = [];
    this.cheat = cheat;
    this.stats = { glows: 0, candy: 0, hushed: 0 };
    this.started = false;
    this.checkpoint = { x: -22, z: 27 };
    this.finished = false;
    this.farewell = 0;
    this.makeGround();
    this.agents = [
      {
        x: 20,
        z: 23,
        yaw: 0,
        points: [
          { x: 11, z: 23 },
          { x: 33, z: 23 },
          { x: 33, z: 5 },
          { x: 20, z: 5 },
        ],
        way: 0,
        distract: 0,
      },
      {
        x: 27,
        z: -5,
        yaw: 0,
        points: [
          { x: 25, z: -7 },
          { x: 38, z: -7 },
          { x: 38, z: 3 },
          { x: 25, z: 3 },
        ],
        way: 0,
        distract: 0,
      },
      {
        x: -32,
        z: -28,
        yaw: 0,
        points: [
          { x: -40, z: -24 },
          { x: -23, z: -24 },
          { x: -23, z: -36 },
          { x: -40, z: -36 },
        ],
        way: 0,
        distract: 0,
      },
    ];
  }
  makeGround() {
    this.floor(-0.7, 19.5, 102, 57);
    this.floor(-0.7, -70, 102, 106);
    this.grownCollider = null;
    this.addBox(0, -6, -13, 52, 1, 3.5, 'creek bottom');
    this.addBox(-51, 4, -35, 1, 5, 90, 'edge');
    this.addBox(51, 4, -35, 1, 5, 90, 'edge');
    this.addBox(0, 4, 48, 52, 5, 1, 'edge');
    this.addBox(0, 4, -124, 52, 5, 1, 'edge');
  }
  floor(y, z, w, d) {
    this.addBox(0, y, z, w / 2, 0.7, d / 2, 'ground');
  }
  addBox(x, y, z, hx, hy, hz, label = 'prop') {
    const c = this.world.createCollider(
      this.R.ColliderDesc.cuboid(hx, hy, hz)
        .setTranslation(x, y, z)
        .setFriction(0.8),
    );
    if (label !== 'ground' && label !== 'edge' && label !== 'creek bottom')
      this.static.push({ x, z, hx, hz, hy, label, collider: c });
    return c;
  }
  addObstacle(o) {
    if (o.kind === 'round') {
      const c = this.world.createCollider(
        this.R.ColliderDesc.cylinder(o.hy, o.r).setTranslation(o.x, o.hy, o.z),
      );
      this.static.push({ ...o, hx: o.r, hz: o.r, collider: c });
      return c;
    }
    return this.addBox(o.x, o.hy, o.z, o.hx, o.hy, o.hz, o.label);
  }
  addPlayer(
    id,
    name = NAMES[id % 4],
    color = ['#ff9b72', '#9ed4e0', '#c6d77c', '#d6b1e6'][id % 4],
  ) {
    if (this.players.has(id)) return this.players.get(id);
    const pos = {
      x: this.checkpoint.x + (this.players.size % 2) * 2,
      z: this.checkpoint.z + Math.floor(this.players.size / 2) * 2,
    };
    const body = this.world.createRigidBody(
      this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        pos.x,
        0.84,
        pos.z,
      ),
    );
    const collider = this.world.createCollider(
      this.R.ColliderDesc.capsule(0.3, 0.45).setFriction(0),
      body,
    );
    const controller = this.world.createCharacterController(0.025);
    controller.enableAutostep(0.65, 0.3, true);
    controller.enableSnapToGround(0.5);
    const p = {
      id,
      name,
      color,
      x: pos.x,
      y: 0,
      z: pos.z,
      yaw: 1.05,
      vy: 0,
      speed: 0,
      alert: 0,
      candy: 3,
      candyCharge: 0,
      glow: 0,
      cooldown: 0,
      boost: false,
      hush: false,
      body,
      collider,
      lastActions: {},
      pending: {},
      checkpoint: { ...this.checkpoint },
    };
    this.players.set(id, p);
    this.controllers.set(id, controller);
    this.inputs.set(id, {});
    if (this.phase === 'flight') {
      p.y = RINGS[this.ring]?.y || SHIP.y;
      p.x = TRANSMITTER.x;
      p.z = TRANSMITTER.z;
      body.setTranslation({ x: p.x, y: p.y + 0.84, z: p.z }, true);
    }
    return p;
  }
  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.world.removeRigidBody(p.body);
    this.world.removeCharacterController(this.controllers.get(id));
    this.players.delete(id);
    this.controllers.delete(id);
    this.inputs.delete(id);
  }
  event(kind, data = {}) {
    this.events.push({ id: ++this.eventId, kind, ...data });
    if (this.events.length > 80) this.events.shift();
  }
  say(speaker, text) {
    this.event('say', { speaker, text });
  }
  start() {
    this.started = true;
    this.say(
      'JUNE',
      'You’re a long way from your bedroom, huh? Let’s find you a way home.',
    );
    this.event('chapter', { text: 'I. A very small visitor' });
  }
  setInput(id, input) {
    input = input || {};
    const old = this.inputs.get(id) || {};
    const p = this.players.get(id);
    if (p)
      for (const key of ['action', 'glow', 'candy'])
        if (input[key] && !old[key]) p.pending[key] = true;
    this.inputs.set(id, input);
  }
  readInput(p) {
    const input = { ...(this.inputs.get(p.id) || {}), ...p.pending };
    p.pending = {};
    return input;
  }
  grow() {
    if (this.bridge) return;
    this.bridge = true;
    this.grownCollider = this.addBox(
      BRIDGE.x,
      -0.1,
      BRIDGE.z,
      3.3,
      0.3,
      4.3,
      'bridge',
    );
    this.event('bridge');
    this.say(
      'JUNE',
      'You can make things grow? Okay. That is definitely better than homework.',
    );
  }
  pulse(p) {
    if (p.cooldown > 0 || this.bond < 12) return false;
    p.glow = 1.4;
    p.cooldown = 2.2;
    this.bond = Math.max(0, this.bond - 12);
    this.stats.glows++;
    this.event('pulse', { x: p.x, y: p.y, z: p.z });
    if (!this.bridge && dist(p, BRIDGE) < this.settings.glowRange + 3)
      this.grow();
    FLOWERS.forEach((f, i) => {
      if (!this.flowers[i] && dist(p, f) < this.settings.glowRange) {
        this.flowers[i] = true;
        this.bond = Math.min(100, this.bond + 23);
        this.event('flower', { i });
        this.say('PIP', 'A flower remembers the sun. Even in the dark.');
      }
    });
    for (const a of this.agents)
      if (dist(p, a) < this.settings.glowRange) {
        a.distract = 5;
        a.target = { x: a.x, z: a.z };
      }
    return true;
  }
  toss(p) {
    if (p.candy < 1) return false;
    p.candy--;
    this.stats.candy++;
    const dx = Math.sin(p.yaw),
      dz = Math.cos(p.yaw);
    const body = this.world.createRigidBody(
      this.R.RigidBodyDesc.dynamic()
        .setTranslation(p.x + dx, p.y + 1, p.z + dz)
        .setLinvel(dx * 8, 5, dz * 8),
    );
    const collider = this.world.createCollider(
      this.R.ColliderDesc.ball(0.2).setRestitution(0.5).setMass(0.1),
      body,
    );
    this.candies.push({ body, collider, ttl: 10 });
    this.event('candy', { x: p.x, z: p.z });
    return true;
  }
  nearest(p) {
    if (!p) return null;
    if (this.phase === 'gather') {
      const available = PARTS.filter((q) => !this.parts[q.id]);
      const part = available.find((q) => dist(p, q) < 3.6);
      if (part)
        return {
          kind: 'part',
          target: part,
          label: 'Borrow the ' + part.name.toLowerCase(),
        };
      if (!this.bridge && dist(p, BRIDGE) < 11)
        return {
          kind: 'grow',
          target: BRIDGE,
          label: 'Wake the sleeping roots',
        };
      if (this.parts.every(Boolean) && dist(p, TRANSMITTER) < 5)
        return {
          kind: 'transmitter',
          target: TRANSMITTER,
          label: 'Call the stars',
        };
      const f = FLOWERS.find((q, i) => !this.flowers[i] && dist(p, q) < 6);
      if (f)
        return {
          kind: 'flower',
          target: f,
          label: 'Give the flowers a little light',
        };
      if (dist(p, { x: -23, z: 23 }) < 4)
        return {
          kind: 'rest',
          target: { x: -23, z: 23 },
          label: 'Share a quiet moment',
        };
    }
    if (
      this.phase === 'flight' &&
      this.ring >= RINGS.length &&
      dist(p, SHIP) < 6
    )
      return {
        kind: 'farewell',
        target: SHIP,
        label: 'It’s time to say see you',
      };
    return null;
  }
  interact(p) {
    const n = this.nearest(p);
    if (!n) return false;
    if (n.kind === 'part') {
      this.parts[n.target.id] = true;
      this.bond = Math.min(100, this.bond + 14);
      this.event('collect', { part: n.target.id });
      this.say('JUNE', n.target.line);
      if (this.parts.every(Boolean)) {
        this.checkpoint = { x: 1, z: -38 };
        this.say(
          'MARA, OVER THE WALKIE',
          'The clearing, June. I can see the whole sky from there.',
        );
        this.event('chapter', { text: 'II. A homemade hello' });
      }
      return true;
    }
    if (n.kind === 'grow' || n.kind === 'flower') return this.pulse(p);
    if (n.kind === 'transmitter') {
      this.phase = 'tune';
      this.tuneClock = 0;
      this.tune = 0;
      this.say('JUNE', 'Three little notes. A very long distance.');
      this.event('tune-start');
      return true;
    }
    if (n.kind === 'rest') {
      this.bond = 100;
      p.candy = 3;
      this.say(
        'JUNE',
        'Just a minute. Mom always says the world can wait a minute.',
      );
      return true;
    }
    if (n.kind === 'farewell') {
      this.phase = 'farewell';
      this.farewell = 0;
      this.event('chapter', { text: 'IV. The way home' });
      this.say('JUNE', 'You can keep the blanket. It’s cold up there.');
      return true;
    }
    return false;
  }
  tunePress(assist = false) {
    if (this.phase !== 'tune') return false;
    const pos = (this.tuneClock * 0.26) % 1;
    const error = Math.abs(((((pos - 0.25 + 0.5) % 1) + 1) % 1) - 0.5);
    if (error < (assist ? 0.19 : 0.105)) {
      this.tune++;
      this.event('note', { note: this.tune });
      if (this.tune >= 3) this.launch();
      else this.tuneClock = 0;
      return true;
    }
    this.tuneMisses++;
    this.event('miss');
    return false;
  }
  launch() {
    this.phase = 'flight';
    this.ring = 0;
    this.bond = 100;
    for (const p of this.players.values()) {
      p.x = TRANSMITTER.x + (p.id % 2) * 1.5;
      p.z = TRANSMITTER.z;
      p.y = 3;
      p.vy = 0;
      p.body.setTranslation({ x: p.x, y: p.y + 0.84, z: p.z }, true);
    }
    this.event('launch');
    this.event('chapter', { text: 'III. Pedal past impossible' });
    this.say('JUNE', 'I don’t think we need the road anymore.');
  }
  rescue(p, reason = 'search') {
    this.rescues++;
    this.bond = Math.max(45, this.bond - 25);
    p.x = p.checkpoint.x;
    p.z = p.checkpoint.z;
    p.y = 0;
    p.vy = 0;
    p.alert = 0;
    p.candy = Math.max(p.candy, 1);
    p.body.setTranslation({ x: p.x, y: 0.84, z: p.z }, true);
    p.body.setNextKinematicTranslation({ x: p.x, y: 0.84, z: p.z });
    this.event('rescue', { reason });
    this.say(
      'MARA, OVER THE WALKIE',
      reason === 'water'
        ? 'The creek’s too deep. Try that tangle of roots.'
        : 'Back porch. Quick. I’ll leave the light on.',
    );
  }
  step(dt) {
    if (!this.started || this.finished) return;
    dt = Math.min(dt, 0.05);
    this.clock += dt;
    this.tick++;
    this.world.timestep = dt;
    if (this.phase === 'tune') {
      this.tuneClock += dt;
      for (const p of this.players.values()) {
        const input = this.readInput(p);
        if (input.action && !p.lastActions.action)
          this.tunePress(!!input.assist);
        p.lastActions = { ...input };
      }
    }
    if (this.phase === 'farewell') {
      this.farewell += dt;
      if (this.farewell > 10) {
        this.phase = 'won';
        this.finished = true;
        this.event('won');
      }
    }
    let regen = 0;
    for (const p of this.players.values()) {
      const input = this.readInput(p);
      p.glow = Math.max(0, p.glow - dt);
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.candyCharge += dt;
      if (p.candyCharge > 15) {
        p.candyCharge = 0;
        p.candy = Math.min(3, p.candy + 1);
      }
      if (!['gather', 'flight', 'freeride'].includes(this.phase)) continue;
      if (input.glow && !p.lastActions.glow) this.pulse(p);
      if (input.candy && !p.lastActions.candy) this.toss(p);
      if (input.action && !p.lastActions.action) this.interact(p);
      p.lastActions = { ...input };
      let mx = Number(input.mx) || 0,
        mz = Number(input.mz) || 0;
      const mag = Math.hypot(mx, mz);
      if (mag > 1) {
        mx /= mag;
        mz /= mag;
      }
      p.boost = !!input.boost;
      p.hush = !!input.hush;
      p.speed =
        mag > 0
          ? this.settings.speed *
            (p.hush ? 0.48 : 1) *
            (p.boost ? this.settings.boost : 1) *
            (this.phase === 'flight' ? 1.65 : 1)
          : 0;
      if (mag > 0.05)
        p.yaw = angleLerp(p.yaw, Math.atan2(mx, mz), Math.min(1, dt * 10));
      if (this.phase === 'flight') {
        const goal = RINGS[this.ring] || SHIP;
        p.y += (goal.y - p.y) * Math.min(1, dt * 2);
        p.x = clamp(p.x + mx * p.speed * dt, -49, 49);
        p.z = clamp(p.z + mz * p.speed * dt, -122, 46);
        p.body.setNextKinematicTranslation({ x: p.x, y: p.y + 0.84, z: p.z });
        if (this.ring < RINGS.length && dist(p, goal) < 4.7) {
          this.ring++;
          this.event('ring', { ring: this.ring });
          this.bond = Math.min(100, this.bond + 15);
          if (this.ring === RINGS.length)
            this.say('PIP', 'Home. But… here, too.');
        }
      } else {
        p.vy = Math.max(-24, p.vy - this.settings.gravity * dt);
        const controller = this.controllers.get(p.id);
        controller.computeColliderMovement(
          p.collider,
          { x: mx * p.speed * dt, y: p.vy * dt, z: mz * p.speed * dt },
          undefined,
          undefined,
          (c) =>
            c.parent() !== p.body &&
            !Array.from(this.players.values()).some((q) => q.collider === c),
        );
        const move = controller.computedMovement();
        const at = p.body.translation();
        p.body.setNextKinematicTranslation({
          x: at.x + move.x,
          y: at.y + move.y,
          z: at.z + move.z,
        });
        if (controller.computedGrounded()) p.vy = 0;
        p.x = at.x + move.x;
        p.y = at.y + move.y - 0.84;
        p.z = at.z + move.z;
        if (p.y < -2.2) this.rescue(p, 'water');
        const safe = dist(p, { x: -23, z: 23 }) < 8;
        const fern =
          (p.x > -12 && p.x < 3 && p.z > -6 && p.z < 7) ||
          (p.x > 20 && p.x < 38 && p.z > 7 && p.z < 16);
        if (safe) {
          regen = Math.max(regen, 4);
          p.checkpoint = { x: -22, z: 27 };
        }
        if (p.hush) {
          regen = Math.max(regen, 1.8);
          this.stats.hushed += dt;
        }
        let spotted = false;
        for (const a of this.agents) {
          const d = dist(p, a);
          const dx = p.x - a.x,
            dz = p.z - a.z;
          const facing =
            (dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw)) / (d || 1);
          if (
            d < 13 * this.settings.search &&
            facing > 0.93 &&
            a.distract < 0.1 &&
            !safe
          ) {
            const dir = { x: dx / (d || 1), y: 0, z: dz / (d || 1) };
            const ray = new this.R.Ray({ x: a.x, y: 1.5, z: a.z }, dir);
            const hit = this.world.castRay(
              ray,
              d,
              true,
              this.R.QueryFilterFlags.EXCLUDE_KINEMATIC |
                this.R.QueryFilterFlags.EXCLUDE_DYNAMIC,
            );
            if (!hit || hit.timeOfImpact > d - 0.8) {
              spotted = true;
              p.alert +=
                dt *
                33 *
                this.settings.search *
                (p.hush ? 0.27 : 1) *
                (fern ? 0.2 : 1) *
                (input.assist ? 0.5 : 1);
            }
          }
        }
        if (!spotted) p.alert = Math.max(0, p.alert - dt * 24);
        if (p.alert >= 100) {
          if (this.cheat) {
            p.alert = 0;
          } else this.rescue(p);
        }
      }
    }
    if (this.phase === 'gather' || this.phase === 'freeride') {
      this.bond = clamp(
        this.bond + dt * (regen - this.settings.bondDrain),
        this.cheat ? 80 : 5,
        100,
      );
    }
    for (const a of this.agents) {
      a.distract = Math.max(0, a.distract - dt);
      let target = a.points[a.way];
      for (const c of this.candies) {
        const pos = c.body.translation();
        if (dist(a, pos) < 11) {
          a.distract = 2;
          a.target = { x: pos.x, z: pos.z };
        }
      }
      if (a.distract > 0 && a.target) target = a.target;
      const d = dist(a, target);
      if (d > 0.5) {
        const dx = (target.x - a.x) / d,
          dz = (target.z - a.z) / d;
        const speed = this.settings.agentSpeed * (a.distract > 0 ? 0.7 : 1);
        a.x += dx * speed * dt;
        a.z += dz * speed * dt;
        a.yaw = angleLerp(a.yaw, Math.atan2(dx, dz), Math.min(1, dt * 5));
      } else if (a.distract <= 0) a.way = (a.way + 1) % a.points.length;
    }
    this.world.step();
    for (let i = this.candies.length - 1; i >= 0; i--) {
      const c = this.candies[i];
      c.ttl -= dt;
      if (c.ttl <= 0) {
        this.world.removeRigidBody(c.body);
        this.candies.splice(i, 1);
      }
    }
  }
  objective(p) {
    if (this.phase === 'freeride') return null;
    if (this.phase === 'flight')
      return {
        ...(RINGS[this.ring] || SHIP),
        name:
          this.ring < RINGS.length
            ? 'A thread of starlight'
            : 'The last little goodbye',
      };
    if (this.phase === 'tune')
      return { ...TRANSMITTER, name: 'The homemade transmitter' };
    if (!this.bridge && this.parts[0] && this.parts[2])
      return { ...BRIDGE, name: 'Sleeping roots · lend your light' };
    if (this.parts.every(Boolean))
      return { ...TRANSMITTER, name: 'The clearing' };
    const options = PARTS.filter((q) => !this.parts[q.id]);
    const q = options.reduce(
      (a, b) => (!a || dist(p, b) < dist(p, a) ? b : a),
      null,
    );
    if (q?.id === 1 && !this.bridge && p.z > -9)
      return { ...BRIDGE, name: 'A way across the creek' };
    return q ? { ...q, name: q.name } : null;
  }
  score() {
    return (
      this.parts.filter(Boolean).length * 100 +
      this.flowers.filter(Boolean).length * 50 +
      this.ring * 100 +
      (this.finished ? 1000 : 0) +
      Math.round(this.bond)
    );
  }
  snapshot() {
    return {
      clock: this.clock,
      phase: this.phase,
      parts: this.parts,
      flowers: this.flowers,
      bridge: this.bridge,
      bond: this.bond,
      ring: this.ring,
      tune: this.tune,
      tuneClock: this.tuneClock,
      tuneMisses: this.tuneMisses,
      rescues: this.rescues,
      stats: this.stats,
      finished: this.finished,
      farewell: this.farewell,
      started: this.started,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: p.yaw,
        speed: p.speed,
        alert: p.alert,
        candy: p.candy,
        glow: p.glow,
        cooldown: p.cooldown,
        boost: p.boost,
        hush: p.hush,
      })),
      agents: this.agents.map((a) => ({
        x: a.x,
        z: a.z,
        yaw: a.yaw,
        distract: a.distract,
      })),
      candies: this.candies.map((c) => {
        const p = c.body.translation();
        return { x: p.x, y: p.y, z: p.z };
      }),
      events: this.events.slice(-8),
    };
  }
  loadSave(data) {
    if (!data || data.version !== 1) return false;
    this.parts = data.parts?.map(Boolean) || this.parts;
    this.flowers = data.flowers?.map(Boolean) || this.flowers;
    if (data.bridge) this.grow();
    this.bond = clamp(data.bond || 100, 30, 100);
    this.checkpoint = data.checkpoint || this.checkpoint;
    for (const p of this.players.values()) {
      p.x = this.checkpoint.x;
      p.z = this.checkpoint.z;
      p.y = 0;
      p.body.setTranslation({ x: p.x, y: 0.84, z: p.z }, true);
    }
    if (
      data.phase === 'flight' ||
      data.phase === 'farewell' ||
      data.phase === 'won'
    )
      this.launch();
    return true;
  }
  save() {
    return {
      version: 1,
      parts: this.parts,
      flowers: this.flowers,
      bridge: this.bridge,
      bond: this.bond,
      phase: this.phase,
      checkpoint: this.parts.every(Boolean)
        ? { x: 1, z: -38 }
        : { x: -22, z: 27 },
    };
  }
  isBlocked(x, z) {
    if (x < -48 || x > 48 || z > 45 || z < -122) return true;
    if (z > -17 && z < -9 && (!this.bridge || Math.abs(x - BRIDGE.x) > 2.3))
      return true;
    return this.static.some(
      (o) =>
        o.label !== 'bridge' &&
        o.hy > 0.7 &&
        Math.abs(x - o.x) < o.hx + 0.85 &&
        Math.abs(z - o.z) < o.hz + 0.85,
    );
  }
  pathTo(from, to) {
    const cell = 2;
    const key = (x, z) => x + ',' + z;
    const sx = Math.round(from.x / cell),
      sz = Math.round(from.z / cell),
      tx = Math.round(to.x / cell),
      tz = Math.round(to.z / cell);
    const open = [{ x: sx, z: sz, g: 0, f: 0 }],
      seen = new Map([[key(sx, sz), { g: 0, parent: null }]]);
    let last = null;
    let loops = 0;
    while (open.length && loops++ < 8500) {
      open.sort((a, b) => b.f - a.f);
      const n = open.pop();
      if (Math.hypot(n.x - tx, n.z - tz) < 1.5) {
        last = n;
        break;
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const x = n.x + dx,
          z = n.z + dz;
        if (this.isBlocked(x * cell, z * cell)) continue;
        if (
          dx &&
          dz &&
          (this.isBlocked(n.x * cell, z * cell) ||
            this.isBlocked(x * cell, n.z * cell))
        )
          continue;
        const g = n.g + Math.hypot(dx, dz);
        const k = key(x, z);
        if (seen.has(k) && seen.get(k).g <= g) continue;
        seen.set(k, { g, parent: key(n.x, n.z) });
        open.push({ x, z, g, f: g + Math.hypot(x - tx, z - tz) });
      }
    }
    if (!last) return [to];
    let k = key(last.x, last.z),
      path = [];
    while (k) {
      const [x, z] = k.split(',').map(Number);
      path.unshift({ x: x * cell, z: z * cell });
      k = seen.get(k)?.parent;
    }
    path.shift();
    path.push(to);
    return path;
  }
  dispose() {
    this.world.free();
  }
}
