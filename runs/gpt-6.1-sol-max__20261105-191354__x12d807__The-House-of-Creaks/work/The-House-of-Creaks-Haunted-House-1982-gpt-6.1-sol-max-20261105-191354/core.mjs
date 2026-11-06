import RAPIER from "@dimforge/rapier3d-compat";
export const DEFAULTS = Object.freeze({
	speed: 4.4,
	enemySpeed: 1,
	matchDuration: 12,
	windInterval: 42,
	damage: 1,
	timeScale: 1,
});
export const FLOOR_NAMES = [
	"The Foyer",
	"The Long Gallery",
	"The Forgotten Rooms",
	"The Attic",
];
export const ROOM_NAMES = [
	[
		"The Study",
		"The Music Room",
		"The Dining Room",
		"The Conservatory",
		"The Foyer",
		"The Servants’ Stair",
	],
	[
		"The Upper Library",
		"The Portrait Gallery",
		"The Nursery",
		"The Blue Parlour",
		"The Landing",
		"The East Stair",
	],
	[
		"The West Stair",
		"The Clock Room",
		"The Seamstress’ Room",
		"The Locked Bedroom",
		"The Linen Room",
		"The East Stair",
	],
	[
		"The Observatory",
		"The Dust Room",
		"The Widow’s Room",
		"The Toy Room",
		"The Attic Hall",
		"The Last Stair",
	],
];
export const ROOM_CENTERS = [
	[-10, -5],
	[0, -5],
	[10, -5],
	[-10, 5],
	[0, 5],
	[10, 5],
];
export const ITEM_NAMES = {
	key: "The brass key",
	ward: "The watchman’s scepter",
	shard0: "Urn · the lip",
	shard1: "Urn · the body",
	shard2: "Urn · the crown",
};
export const STAIRS = [
	{ f: 0, r: 5, x: 12, z: 7, to: 1 },
	{ f: 1, r: 5, x: 12, z: 7, to: 0 },
	{ f: 1, r: 0, x: -12, z: -7, to: 2, locked: true },
	{ f: 2, r: 0, x: -12, z: -7, to: 1 },
	{ f: 2, r: 5, x: 12, z: 7, to: 3 },
	{ f: 3, r: 5, x: 12, z: 7, to: 2 },
];
export const SAFE = [
	{ f: 0, x: 0, z: 5 },
	{ f: 1, x: 0, z: 5 },
	{ f: 2, x: 0, z: 5 },
	{ f: 3, x: 0, z: 5 },
];
export const NOTES = [
	{
		f: 0,
		x: -11.7,
		z: -6.9,
		text: "THREE PIECES. ONE URN.\nThe lip waits among the portraits. The body sleeps in a locked bedroom. The crown watches the moon. Bring each to the plinth in the foyer. Carry only what you can bear.",
	},
	{
		f: 1,
		x: 9,
		z: -7,
		text: "THE WATCHMAN’S RULE\nHis scepter keeps the dead at a distance. It rests in the blue parlour. A match unnerves spiders, but invites the ghost. Hush when the wind begins to whisper.",
	},
	{
		f: 2,
		x: 11.8,
		z: -6.9,
		text: "A NOTE LEFT IN HASTE\nThe key is on the dining table downstairs. Leave it in the upper library lock. It has been waiting rather longer than you have.",
	},
	{
		f: 3,
		x: -11.8,
		z: 6.8,
		text: "DO NOT LOOK BACK\nWhen the urn is whole, the front door will remember how to open. The house will remember you. Do not linger.",
	},
];
export const PROP_BOXES = [
	{ r: 0, x: -12.6, z: -5.4, w: 1.2, d: 3.8, k: "bookcase" },
	{ r: 0, x: -10, z: -8.1, w: 3.1, d: 1.1, k: "desk" },
	{ r: 1, x: 1.6, z: -7.5, w: 3, d: 1.5, k: "piano" },
	{ r: 1, x: -2.5, z: -4, w: 1.1, d: 1.1, k: "clock" },
	{ r: 2, x: 10, z: -5, w: 3.1, d: 1.7, k: "table" },
	{ r: 3, x: -12.6, z: 4, w: 1.3, d: 2.8, k: "sofa" },
	{ r: 3, x: -8.3, z: 7.7, w: 1.4, d: 1.4, k: "plant" },
	{ r: 4, x: 0, z: 7.5, w: 2, d: 1, k: "altar" },
	{ r: 4, x: 2.8, z: 2, w: 1, d: 1, k: "clock" },
	{ r: 5, x: 12.8, z: 3, w: 1, d: 2.2, k: "bookcase" },
];
export function roomAt(x, z) {
	return Math.max(0, Math.min(2, Math.floor((x + 15) / 10))) + (z >= 0 ? 3 : 0);
}
export function dist(a, b) {
	return Math.hypot(a.x - b.x, a.z - b.z);
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function route(x, z, tx, tz) {
	const start = roomAt(x, z),
		goal = roomAt(tx, tz);
	if (start === goal) return [{ x: tx, z: tz }];
	const q = [[start]],
		seen = new Set([start]);
	let found;
	while (q.length) {
		const p = q.shift(),
			n = p.at(-1);
		if (n === goal) {
			found = p;
			break;
		}
		const c = n % 3,
			r = Math.floor(n / 3);
		for (const m of [c > 0 ? n - 1 : -1, c < 2 ? n + 1 : -1, r ? n - 3 : n + 3])
			if (m >= 0 && !seen.has(m)) {
				seen.add(m);
				q.push([...p, m]);
			}
	}
	const points = [];
	let prev = start;
	for (const n of found.slice(1)) {
		const [ax, az] = ROOM_CENTERS[prev],
			[bx, bz] = ROOM_CENTERS[n];
		points.push(
			{ x: ax, z: az },
			{ x: (ax + bx) / 2, z: (az + bz) / 2 },
			{ x: bx, z: bz },
		);
		prev = n;
	}
	points.push({ x: tx, z: tz });
	return points;
}
export class HouseGame {
	static async init() {
		await RAPIER.init();
	}
	constructor(options = {}) {
		this.tuning = { ...DEFAULTS, ...options };
		this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
		this.controller = this.world.createCharacterController(0.04);
		this.controller.setSlideEnabled(true);
		this.controller.setMaxSlopeClimbAngle(0.2);
		this.bodies = new Map();
		this.events = [];
		this.god = false;
		this.reveal = false;
		this.status = "title";
		this.seed = 1;
		this.buildPhysics();
		this.reset([]);
	}
	buildPhysics() {
		this.boxes = [];
		const box = (x, z, w, d) => {
			this.boxes.push({ x, z, w, d });
			this.world.createCollider(
				RAPIER.ColliderDesc.cuboid(w / 2, 2, d / 2).setTranslation(x, 1, z),
			);
		};
		box(-15, 0, 0.35, 20);
		box(15, 0, 0.35, 20);
		box(0, -10, 30, 0.35);
		box(0, 10, 30, 0.35);
		for (const x of [-5, 5])
			for (const z of [-5, 5]) {
				box(x, z - 3.15, 0.26, 3.7);
				box(x, z + 3.15, 0.26, 3.7);
			}
		for (const x of [-10, 0, 10]) {
			box(x - 3.15, 0, 3.7, 0.26);
			box(x + 3.15, 0, 3.7, 0.26);
		}
		for (const p of PROP_BOXES) box(p.x, p.z, p.w, p.d);
		this.world.step();
	}
	reset(seats = [{ id: 0, name: "You", color: "#f4c66a" }]) {
		for (const b of this.bodies.values()) this.world.removeRigidBody(b.body);
		this.bodies.clear();
		this.time = 0;
		this.wind = 0;
		this.windCount = 0;
		this.unlocked = false;
		this.banked = [];
		this.notes = [];
		this.visited = Array.from({ length: 4 }, () => []);
		this.status = "playing";
		this.players = [];
		this.hits = 0;
		this.matchesUsed = 0;
		this.pulses = 0;
		this.stairsUsed = 0;
		this.recovered = 0;
		this.revision = 0;
		this.events = [];
		this.finished = false;
		this.attract = false;
		this.items = [
			{ id: "key", f: 0, x: 10, z: -6.6 },
			{ id: "ward", f: 1, x: -10, z: 5.5 },
			{ id: "shard0", f: 1, x: 0, z: -5.8 },
			{ id: "shard1", f: 2, x: -10, z: 5.8 },
			{ id: "shard2", f: 3, x: 10, z: -6.2 },
		].map((i) => ({ ...i, holder: null, banked: false }));
		this.enemies = [];
		for (let f = 0; f < 4; f++) {
			const types =
				f === 0
					? ["bat", "spider"]
					: f === 3
						? ["ghost", "ghost", "bat", "spider"]
						: ["ghost", "bat", "spider"];
			types.forEach((type, i) => {
				const r = [2, 0, 3, 1][i],
					c = ROOM_CENTERS[r];
				this.enemies.push({
					id: f * 10 + i,
					type,
					f,
					x: c[0] + (i % 2) * 1.4,
					z: c[1],
					homeX: c[0],
					homeZ: c[1],
					stun: 0,
					mode: "wander",
					angle: i * 1.6,
					hitCD: 0,
				});
			});
		}
		for (const seat of seats) this.addPlayer(seat);
		this.world.step();
		this.emit("start", "A small flame. A very bad address.");
	}
	addPlayer(seat) {
		if (this.players.some((p) => p.id === seat.id)) return;
		const i = this.players.length,
			p = {
				id: seat.id,
				name: seat.name || "Guest",
				color: seat.color || "#79ddc8",
				f: 0,
				x: (i - 0.5) * 1.1,
				z: 5.2,
				angle: Math.PI,
				health: 5,
				match: 0,
				matches: 16,
				carry: null,
				invuln: 2,
				cooldown: 0,
				stairCD: 0,
				hush: false,
				moving: false,
				rested: [],
				connected: true,
				actions: {},
				seen: [],
				score: 0,
			};
		this.players.push(p);
		const body = this.world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased()
				.setTranslation(p.x, 0.7, p.z)
				.lockRotations(),
		);
		const collider = this.world.createCollider(
			RAPIER.ColliderDesc.capsule(0.32, 0.28),
			body,
		);
		this.bodies.set(p.id, { body, collider });
		this.world.step();
		this.revision++;
		return p;
	}
	removePlayer(id) {
		const p = this.player(id);
		if (p?.carry) this.drop(p);
		this.players = this.players.filter((p) => p.id !== id);
		const b = this.bodies.get(id);
		if (b) {
			this.world.removeRigidBody(b.body);
			this.bodies.delete(id);
		}
		this.revision++;
	}
	player(id = 0) {
		return this.players.find((p) => p.id === id) || this.players[0];
	}
	pathTo(p, tx, tz) {
		const step = 0.5,
			w = 59,
			h = 39,
			at = (x, z) => [
				clamp(Math.round((x + 14.5) / step), 0, w - 1),
				clamp(Math.round((z + 9.5) / step), 0, h - 1),
			],
			point = (x, z) => ({ x: x * step - 14.5, z: z * step - 9.5 }),
			blocked = (x, z) => {
				const v = point(x, z);
				return this.boxes.some(
					(b) =>
						Math.abs(v.x - b.x) < b.w / 2 + 0.38 &&
						Math.abs(v.z - b.z) < b.d / 2 + 0.38,
				);
			};
		const [sx, sz] = at(p.x, p.z),
			[gx, gz] = at(tx, tz),
			start = sz * w + sx;
		const goals = [];
		for (let dz = -3; dz <= 3; dz++)
			for (let dx = -3; dx <= 3; dx++) {
				const x = gx + dx,
					z = gz + dz;
				if (x >= 0 && x < w && z >= 0 && z < h && !blocked(x, z))
					goals.push({
						x,
						z,
						d: Math.hypot(point(x, z).x - tx, point(x, z).z - tz),
					});
			}
		goals.sort((a, b) => a.d - b.d);
		if (!goals.length) return [];
		const goal = goals[0].z * w + goals[0].x,
			open = [start],
			prev = new Map(),
			cost = new Map([[start, 0]]),
			closed = new Set();
		while (open.length) {
			open.sort(
				(a, b) =>
					cost.get(a) +
					Math.abs((a % w) - (goal % w)) +
					Math.abs(Math.floor(a / w) - Math.floor(goal / w)) -
					(cost.get(b) +
						Math.abs((b % w) - (goal % w)) +
						Math.abs(Math.floor(b / w) - Math.floor(goal / w))),
			);
			const n = open.shift();
			if (n === goal) {
				const list = [];
				let v = n;
				while (v !== start) {
					list.push(point(v % w, Math.floor(v / w)));
					v = prev.get(v);
				}
				return list.reverse();
			}
			closed.add(n);
			const x = n % w,
				z = Math.floor(n / w);
			for (const [dx, dz] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			]) {
				const xx = x + dx,
					zz = z + dz,
					m = zz * w + xx;
				if (
					xx < 0 ||
					xx >= w ||
					zz < 0 ||
					zz >= h ||
					closed.has(m) ||
					blocked(xx, zz)
				)
					continue;
				const c = cost.get(n) + 1;
				if (c < (cost.get(m) ?? Infinity)) {
					cost.set(m, c);
					prev.set(m, n);
					if (!open.includes(m)) open.push(m);
				}
			}
		}
		return [];
	}
	emit(type, text = "", extra = {}) {
		this.events.push({ type, text, time: this.time, ...extra });
		if (this.events.length > 60) this.events.shift();
	}
	move(p, dx, dz) {
		const b = this.bodies.get(p.id);
		if (!b) return;
		const at = b.body.translation();
		if (Math.hypot(at.x - p.x, at.z - p.z) > 0.3)
			b.body.setTranslation({ x: p.x, y: 0.7, z: p.z }, true);
		this.controller.computeColliderMovement(
			b.collider,
			{ x: dx, y: 0, z: dz },
			RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,
		);
		const m = this.controller.computedMovement();
		b.body.setNextKinematicTranslation({ x: p.x + m.x, y: 0.7, z: p.z + m.z });
		p.x += m.x;
		p.z += m.z;
	}
	teleport(p, x, z, f = p.f) {
		p.x = x;
		p.z = z;
		p.f = clamp(f, 0, 3);
		this.bodies.get(p.id)?.body.setTranslation({ x, y: 0.7, z }, true);
		p.stairCD = 1;
		this.revision++;
	}
	nearest(p) {
		const choices = [];
		for (const s of STAIRS)
			if (s.f === p.f)
				choices.push({
					...s,
					type: "stair",
					distance: dist(p, s),
					label:
						s.locked && !this.unlocked
							? "Unlock the upper stair"
							: s.to > s.f
								? `Climb to ${FLOOR_NAMES[s.to]}`
								: `Descend to ${FLOOR_NAMES[s.to]}`,
				});
		for (const i of this.items)
			if (i.f === p.f && i.holder === null && !i.banked)
				choices.push({
					...i,
					type: "item",
					distance: dist(p, i),
					label: (p.carry ? "Swap for " : "Take ") + ITEM_NAMES[i.id],
				});
		const safe = SAFE[p.f];
		choices.push({
			...safe,
			type: "safe",
			distance: dist(p, safe),
			label: "Rest at the candle · refill matches",
		});
		if (p.f === 0) {
			choices.push({
				type: "altar",
				x: 0,
				z: 7.2,
				distance: Math.hypot(p.x, p.z - 7.2),
				label: p.carry?.startsWith("shard")
					? "Return the urn fragment"
					: `The urn · ${this.banked.length}/3 pieces`,
			});
			choices.push({
				type: "exit",
				x: 0,
				z: 9,
				distance: Math.hypot(p.x, p.z - 9),
				label:
					this.banked.length === 3
						? "Leave the house"
						: "The front door is sealed",
			});
		}
		NOTES.forEach((n, i) => {
			if (n.f === p.f)
				choices.push({
					...n,
					id: i,
					type: "note",
					distance: dist(p, n),
					label: "Read the forgotten note",
				});
		});
		if (p.carry?.startsWith("shard")) {
			const altar = choices.find((c) => c.type === "altar" && c.distance < 1.9);
			if (altar) return altar;
		}
		choices.sort((a, b) => a.distance - b.distance);
		return choices[0]?.distance < 1.9 ? choices[0] : null;
	}
	interact(p) {
		const n = this.nearest(p);
		if (!n) return false;
		if (n.type === "item") {
			if (p.carry) this.drop(p);
			const i = this.items.find((i) => i.id === n.id);
			i.holder = p.id;
			p.carry = i.id;
			p.score += 10;
			this.emit("pickup", ITEM_NAMES[i.id], { id: p.id, item: i.id });
			if (i.id === "ward")
				this.emit(
					"hint",
					"The scepter holds ghosts at bay. Pulse to scatter every creature.",
				);
			this.revision++;
			return true;
		}
		if (n.type === "altar") {
			if (p.carry?.startsWith("shard")) {
				const id = p.carry;
				this.banked.push(id);
				const i = this.items.find((i) => i.id === id);
				i.banked = true;
				i.holder = null;
				p.carry = null;
				p.score += 300;
				this.recovered++;
				this.emit(
					"bank",
					this.banked.length === 3
						? "The urn is whole. The front door opens. LEAVE."
						: `${this.banked.length} of 3 memories returned.`,
					{ id: p.id },
				);
				this.revision++;
				if (this.banked.length === 3)
					this.emit("finale", "The house has noticed.");
				return true;
			}
			this.emit(
				"hint",
				"Bring all three fragments here. One object at a time.",
			);
			return false;
		}
		if (n.type === "stair") {
			if (p.stairCD > 0) return false;
			if (n.locked && !this.unlocked) {
				if (p.carry !== "key") {
					this.emit(
						"hint",
						"A brass lock. The dining room downstairs may hold its key.",
					);
					return false;
				}
				this.unlocked = true;
				this.items.find((i) => i.id === "key").banked = true;
				p.carry = null;
				p.score += 100;
				this.emit("unlock", "The key turns. The upper house is open.");
				this.revision++;
			}
			this.teleport(p, n.x, n.z, n.to);
			this.stairsUsed++;
			this.emit("stair", FLOOR_NAMES[p.f], { id: p.id });
			return true;
		}
		if (n.type === "safe") {
			p.matches = 18;
			p.match = 0;
			if (!p.rested.includes(p.f)) {
				p.health = Math.min(5, p.health + 1);
				p.rested.push(p.f);
			}
			this.emit("rest", "Warmth enough for another room.", { id: p.id });
			return true;
		}
		if (n.type === "note") {
			if (!this.notes.includes(n.id)) {
				this.notes.push(n.id);
				p.score += 50;
			}
			this.emit("note", NOTES[n.id].text, { id: p.id });
			return true;
		}
		if (n.type === "exit") {
			if (this.banked.length === 3) {
				if (this.players.some((o) => o.f !== 0 || roomAt(o.x, o.z) !== 4)) {
					this.emit(
						"hint",
						"Gather everyone in the foyer. No guest left behind.",
					);
					return false;
				}
				this.status = "won";
				this.finished = true;
				this.emit(
					"win",
					"You leave with the urn. The house keeps its secrets.",
				);
				return true;
			}
			this.emit(
				"hint",
				"The dead will not let you leave with their memories scattered.",
			);
			return false;
		}
	}
	ignite(p) {
		if (p.matches <= 0) {
			this.emit("hint", "No matches. Find a candle in the central landing.");
			return false;
		}
		p.matches--;
		p.match = this.tuning.matchDuration;
		this.matchesUsed++;
		this.emit("match", "", { id: p.id });
		return true;
	}
	drop(p) {
		if (!p.carry) return false;
		const i = this.items.find((i) => i.id === p.carry);
		i.f = p.f;
		i.x = p.x + Math.sin(p.angle) * 0.65;
		i.z = p.z + Math.cos(p.angle) * 0.65;
		i.holder = null;
		p.carry = null;
		this.emit("drop", "", { id: p.id });
		this.revision++;
		return true;
	}
	pulse(p) {
		if (p.carry !== "ward") {
			this.emit("hint", "Find the watchman’s scepter in the Blue Parlour.");
			return false;
		}
		if (p.cooldown > 0) return false;
		p.cooldown = 5;
		this.pulses++;
		for (const e of this.enemies)
			if (e.f === p.f && dist(p, e) < 6.5) {
				e.stun = 6;
				e.x = clamp(e.x + (e.x - p.x) * 0.4, -14.3, 14.3);
				e.z = clamp(e.z + (e.z - p.z) * 0.4, -9.3, 9.3);
			}
		this.emit("pulse", "", { id: p.id, x: p.x, z: p.z, f: p.f });
		return true;
	}
	hit(p, e) {
		if (p.invuln > 0 || this.god || this.attract) return false;
		if (e.type === "bat" && p.match > 0) {
			p.match = 0;
			p.invuln = 0.9;
			this.emit("snuff", "A bat stole your light.", { id: p.id });
			return true;
		}
		p.health = Math.max(0, p.health - this.tuning.damage);
		p.invuln = 3;
		p.match = 0;
		this.hits++;
		this.drop(p);
		this.emit(
			"hit",
			p.health > 0 ? "Steady your nerves." : "The house keeps you, too.",
			{ id: p.id },
		);
		if (p.health <= 0) {
			const alive = this.players.filter((p) => p.health > 0);
			if (!alive.length) {
				this.status = "lost";
				this.finished = true;
				this.emit("lose", "Your courage gives out. The house does not.");
			} else {
				this.teleport(p, 0, 5, 0);
				p.health = 3;
				this.emit("hint", `${p.name} finds their way back to the foyer.`);
			}
		}
		return true;
	}
	update(dt, inputs = {}) {
		if (this.status !== "playing") return;
		dt = Math.min(dt, 0.1) * this.tuning.timeScale;
		this.time += dt;
		for (const p of this.players) p.hush = !!inputs[p.id]?.hush;
		const phase = this.time % this.tuning.windInterval,
			was = this.wind;
		this.wind = phase > this.tuning.windInterval - 4 ? 1 : 0;
		if (this.wind && !was) {
			this.windCount++;
			for (const p of this.players)
				if (!p.hush && dist(p, SAFE[p.f]) > 2.2) p.match = 0;
			this.emit(
				"wind",
				"The house takes a breath. Hush to shelter your flame.",
			);
		}
		for (const p of this.players) {
			const input = inputs[p.id] || {};
			p.hush = !!input.hush;
			p.invuln = Math.max(0, p.invuln - dt);
			p.cooldown = Math.max(0, p.cooldown - dt);
			p.stairCD = Math.max(0, p.stairCD - dt);
			p.match = Math.max(0, p.match - dt);
			let dx = clamp(Number(input.x) || 0, -1, 1),
				dz = clamp(Number(input.z) || 0, -1, 1);
			const m = Math.hypot(dx, dz);
			if (m > 1) {
				dx /= m;
				dz /= m;
			}
			p.moving = m > 0.1;
			if (m > 0.1) p.angle = Math.atan2(dx, dz);
			if (Number.isFinite(input.angle)) p.angle = input.angle;
			this.move(
				p,
				dx * dt * this.tuning.speed * (p.hush ? 0.47 : 1),
				dz * dt * this.tuning.speed * (p.hush ? 0.47 : 1),
			);
			for (const action of ["interact", "match", "drop", "pulse"]) {
				if (input[action] && !p.actions[action]) {
					if (action === "interact") this.interact(p);
					if (action === "match") this.ignite(p);
					if (action === "drop") this.drop(p);
					if (action === "pulse") this.pulse(p);
				}
				p.actions[action] = !!input[action];
			}
			const r = roomAt(p.x, p.z);
			if (!this.visited[p.f].includes(r)) {
				this.visited[p.f].push(r);
				p.score += 5;
				this.emit("discover", ROOM_NAMES[p.f][r], { id: p.id });
			}
			if (p.carry) {
				const i = this.items.find((i) => i.id === p.carry);
				i.x = p.x;
				i.z = p.z;
				i.f = p.f;
			}
		}
		this.world.timestep = Math.max(0.001, dt);
		this.world.step();
		for (const e of this.enemies) {
			e.stun = Math.max(0, e.stun - dt);
			e.hitCD = Math.max(0, e.hitCD - dt);
			if (e.stun > 0) {
				e.mode = "stunned";
				continue;
			}
			const local = this.players.filter((p) => p.f === e.f && p.health > 0);
			if (!local.length) continue;
			local.sort((a, b) => dist(e, a) - dist(e, b));
			const p = local[0],
				d = dist(p, e),
				safe = dist(p, SAFE[p.f]) < 2.2 && this.banked.length < 3;
			const radius = p.hush ? 2.3 : p.match > 0 ? 13 : 5.5;
			let tx, tz;
			if (safe) {
				e.mode = "wander";
			} else if (e.type === "spider" && p.match > 0 && d < 4.4) {
				e.mode = "flee";
				tx = e.x + (e.x - p.x);
				tz = e.z + (e.z - p.z);
			} else if (e.type === "ghost" && p.carry === "ward" && d < 4.8) {
				e.mode = "flee";
				tx = e.x + (e.x - p.x);
				tz = e.z + (e.z - p.z);
			} else if (d < radius) {
				e.mode = "chase";
				tx = p.x;
				tz = p.z;
			} else e.mode = "wander";
			if (e.mode === "wander") {
				e.angle += dt * 0.24;
				tx = e.homeX + Math.sin(this.time * 0.23 + e.id) * 2.2;
				tz = e.homeZ + Math.cos(this.time * 0.19 + e.id) * 1.9;
			}
			if (e.type !== "ghost" && roomAt(e.x, e.z) !== roomAt(tx, tz)) {
				const path = route(e.x, e.z, tx, tz),
					target = path.find((v) => Math.hypot(v.x - e.x, v.z - e.z) > 0.65);
				if (target) {
					tx = target.x;
					tz = target.z;
				}
			}
			const vx = tx - e.x,
				vz = tz - e.z,
				n = Math.hypot(vx, vz) || 1,
				speed =
					(e.type === "ghost" ? 1.12 : e.type === "bat" ? 2.1 : 1.4) *
					this.tuning.enemySpeed *
					(e.mode === "chase" ? 1.3 : 0.65) *
					(this.wind ? 1.35 : 1);
			e.x = clamp(e.x + (vx / n) * speed * dt, -14.25, 14.25);
			e.z = clamp(e.z + (vz / n) * speed * dt, -9.25, 9.25);
			if (!safe && d < 0.9 && e.hitCD === 0) {
				this.hit(p, e);
				e.hitCD = 2;
			}
		}
	}
	snapshot() {
		return {
			version: 1,
			time: this.time,
			wind: this.wind,
			windCount: this.windCount,
			unlocked: this.unlocked,
			banked: [...this.banked],
			notes: [...this.notes],
			visited: this.visited.map((v) => [...v]),
			players: this.players.map((p) => ({ ...p, actions: { ...p.actions } })),
			items: this.items.map((i) => ({ ...i })),
			enemies: this.enemies.map((e) => ({ ...e })),
			status: this.status,
			hits: this.hits,
			matchesUsed: this.matchesUsed,
			pulses: this.pulses,
			stairsUsed: this.stairsUsed,
			recovered: this.recovered,
			revision: this.revision,
			finished: this.finished,
		};
	}
	apply(s) {
		if (s?.version !== 1) return false;
		const keys = [
			"time",
			"wind",
			"windCount",
			"unlocked",
			"banked",
			"notes",
			"visited",
			"items",
			"enemies",
			"status",
			"hits",
			"matchesUsed",
			"pulses",
			"stairsUsed",
			"recovered",
			"revision",
			"finished",
		];
		for (const k of keys) this[k] = s[k];
		for (const p of s.players) {
			if (!this.bodies.has(p.id)) this.addPlayer(p);
		}
		for (const id of [...this.bodies.keys()])
			if (!s.players.some((p) => p.id === id)) {
				const b = this.bodies.get(id);
				this.world.removeRigidBody(b.body);
				this.bodies.delete(id);
			}
		this.players = s.players.map((p) => ({ ...p, actions: { ...p.actions } }));
		for (const p of this.players)
			this.bodies
				.get(p.id)
				?.body.setTranslation({ x: p.x, y: 0.7, z: p.z }, true);
		return true;
	}
	dispose() {
		this.world.free();
	}
}
