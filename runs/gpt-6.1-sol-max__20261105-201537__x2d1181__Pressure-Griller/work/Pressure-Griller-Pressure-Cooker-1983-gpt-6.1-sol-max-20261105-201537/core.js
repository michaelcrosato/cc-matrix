export const TOPPINGS = [
	{ id: "C", name: "Cheese", color: "#ffc447", lane: -2.5 },
	{ id: "L", name: "Lettuce", color: "#81b971", lane: -0.45 },
	{ id: "T", name: "Tomato", color: "#ec684c", lane: 1.6 },
];
export const BAYS = [
	{ x: -4.3, name: "SUNNY", color: "#f2b949" },
	{ x: 0, name: "ROSIE", color: "#e78079" },
	{ x: 4.3, name: "MINTY", color: "#65aba5" },
];
export const DEFAULTS = {
	moveSpeed: 5.5,
	beltSpeed: 1.35,
	patience: 65,
	pressureGain: 1,
	catchReach: 1.25,
	timeScale: 1,
};
export const SHIFTS = [
	{
		name: "A little lunch rush",
		goal: 3,
		seconds: 85,
		hint: "Two toppings. Three hungry regulars. You’ve got this.",
	},
	{
		name: "Here comes the lunch bunch",
		goal: 4,
		seconds: 95,
		hint: "Taller orders! Ring the dinner bell to slow the belts.",
	},
	{
		name: "Too hot to handle",
		goal: 5,
		seconds: 110,
		hint: "Watch the glowing griddle. Dash out before the steam!",
	},
];
const RECIPES = [
	[
		["C", "L"],
		["L", "T"],
		["C", "T"],
	],
	[
		["C", "L", "T"],
		["L", "T"],
		["C", "C", "T"],
		["C", "L"],
	],
	[
		["C", "L", "T"],
		["L", "L", "T"],
		["C", "C", "L", "T"],
		["C", "L", "T", "T"],
	],
];
const counts = (a) => a.reduce((o, v) => ((o[v] = (o[v] || 0) + 1), o), {});
export function fits(plate, recipe, exact = false) {
	const p = counts(plate),
		r = counts(recipe);
	return (
		(!exact || plate.length === recipe.length) &&
		Object.keys(p).every((k) => p[k] <= (r[k] || 0))
	);
}
export function missing(plate, recipe) {
	const p = [...plate];
	return recipe.filter((t) => {
		const i = p.indexOf(t);
		if (i < 0) return true;
		p.splice(i, 1);
		return false;
	});
}

export class Kitchen {
	constructor(onEvent = () => {}) {
		this.emit = onEvent;
		this.config = { ...DEFAULTS };
		this.move = null;
		this.mode = "solo";
		this.phase = "title";
		this.clock = 0;
		this.players = [];
		this.food = [];
		this.tickets = [];
		this.seed = 1;
		this.uid = 0;
		this.god = false;
		this.auto = false;
		this.stats = {};
		this.score = 0;
		this.pressure = 0;
		this.bell = 100;
	}
	random() {
		this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}
	start(mode = "solo", seed = 1983) {
		this.seed = seed >>> 0;
		this.uid = 0;
		this.mode = mode;
		this.phase = "playing";
		this.score = 0;
		this.pressure = 0;
		this.bell = 100;
		this.slow = 0;
		this.combo = 0;
		this.bestCombo = 0;
		this.clock = 0;
		this.stage = 0;
		this.interlude = 0;
		this.lastServe = -999;
		this.stats = {
			served: 0,
			caught: 0,
			wrong: 0,
			wasted: 0,
			dashes: 0,
			bells: 0,
			hits: 0,
		};
		this.players = Array.from({ length: mode === "coop" ? 2 : 1 }, (_, i) => ({
			id: i,
			x: i ? 1 : -1,
			z: 2.7,
			plate: [],
			target: i,
			face: 0,
			dash: 0,
			dashTime: 0,
			stun: 0,
			actionCd: 0,
			moving: false,
			invincible: 0,
		}));
		this.setupShift();
		this.emit("start", { mode });
	}
	setupShift() {
		this.remaining = SHIFTS[this.stage].seconds;
		this.servedThisShift = 0;
		this.serial = 0;
		this.food = [];
		this.spawnTimers = [0.9, 1.6, 2.3];
		this.tickets = Array.from({ length: 3 }, (_, i) => this.makeTicket(i));
		for (const p of this.players) {
			p.plate = [];
			p.target = p.id;
		}
		for (let l = 0; l < 3; l++)
			for (let i = 0; i < 3; i++) this.spawn(l, -4.5 + i * 4);
		this.emit("shift", { stage: this.stage });
	}
	makeTicket(bay) {
		const list = RECIPES[this.stage];
		const recipe = [...list[this.serial++ % list.length]];
		return {
			id: ++this.uid,
			bay,
			recipe,
			patience: this.config.patience,
			maxPatience: this.config.patience,
			cooldown: 0,
		};
	}
	spawn(lane, x = -6.3) {
		const f = {
			id: ++this.uid,
			type: TOPPINGS[lane].id,
			lane,
			x,
			z: TOPPINGS[lane].lane,
		};
		this.food.push(f);
		return f;
	}
	addPressure(value) {
		this.pressure = Math.max(
			0,
			Math.min(
				this.god || this.mode === "attract" || this.mode === "practice"
					? 85
					: 100,
				this.pressure + value * (value > 0 ? this.config.pressureGain : 1),
			),
		);
	}
	goal() {
		return this.mode === "attract" ? 2 : SHIFTS[this.stage].goal;
	}
	cycle(p, direction = 1) {
		p.target = (p.target + direction + 3) % 3;
		this.emit("target", { player: p.id });
	}
	discard(p) {
		if (!p.plate.length) return;
		this.emit("discard", { player: p.id, x: p.x, z: p.z, types: [...p.plate] });
		p.plate = [];
		this.combo = 0;
		this.addPressure(4);
	}
	ring() {
		if (this.bell < 99.9 || this.phase !== "playing") return false;
		this.bell = 0;
		this.slow = 7;
		this.stats.bells++;
		this.addPressure(-8);
		this.emit("bell", {});
		return true;
	}
	dash(p) {
		if (p.dash > 0 || p.stun > 0) return false;
		p.dash = 2.7;
		p.dashTime = 0.23;
		p.invincible = 0.4;
		this.stats.dashes++;
		this.emit("dash", { player: p.id, x: p.x, z: p.z });
		return true;
	}
	action(p, assisted = false) {
		if (this.phase !== "playing" || p.actionCd > 0 || p.stun > 0) return false;
		const bay = BAYS.findIndex(
			(b) => Math.hypot(p.x - b.x, (p.z - 3.8) * 0.9) < 1.4,
		);
		if (bay >= 0 && p.plate.length) {
			const t = this.tickets[bay];
			if (t.cooldown > 0) return false;
			p.actionCd = 0.32;
			if (fits(p.plate, t.recipe, true)) {
				this.combo = this.clock - this.lastServe < 20 ? this.combo + 1 : 1;
				this.bestCombo = Math.max(this.bestCombo, this.combo);
				this.lastServe = this.clock;
				const points =
					200 + Math.round(t.patience * 2) + Math.min(this.combo, 5) * 40;
				this.score += points;
				this.stats.served++;
				this.servedThisShift++;
				this.addPressure(-17);
				this.bell = Math.min(100, this.bell + 34);
				this.emit("serve", {
					player: p.id,
					bay,
					points,
					combo: this.combo,
					types: [...p.plate],
				});
				p.plate = [];
				t.cooldown = 1.15;
				if (this.servedThisShift >= this.goal() && this.mode !== "practice")
					this.finishShift();
				return true;
			}
			if (!assisted) {
				this.stats.wrong++;
				this.addPressure(8);
				this.combo = 0;
				this.emit("wrongServe", { player: p.id, bay });
			}
			return false;
		}
		let best = null,
			distance = this.config.catchReach;
		for (const f of this.food) {
			const d = Math.hypot(f.x - p.x, (f.z - p.z) * 1.15);
			if (d < distance) {
				distance = d;
				best = f;
			}
		}
		if (!best) {
			if (!assisted) this.emit("empty", { player: p.id });
			return false;
		}
		const valid = this.tickets.some(
			(t) => t.cooldown <= 0 && fits([...p.plate, best.type], t.recipe),
		);
		if (!valid && assisted) return false;
		p.actionCd = 0.23;
		this.food.splice(this.food.indexOf(best), 1);
		if (valid) {
			p.plate.push(best.type);
			this.stats.caught++;
			this.score += 20;
			this.bell = Math.min(100, this.bell + 2);
			this.addPressure(-1);
			if (!fits(p.plate, this.tickets[p.target].recipe))
				p.target = this.tickets.findIndex((t) => fits(p.plate, t.recipe));
			this.emit("catch", {
				player: p.id,
				type: best.type,
				x: best.x,
				z: best.z,
			});
			return true;
		}
		this.stats.wrong++;
		this.addPressure(6);
		this.combo = 0;
		this.emit("wrongCatch", {
			player: p.id,
			type: best.type,
			x: best.x,
			z: best.z,
		});
		return false;
	}
	finishShift() {
		if (this.stage === 2) {
			this.finish(true);
			return;
		}
		this.phase = "interlude";
		this.interlude = 4.5;
		this.score += 250;
		this.addPressure(-20);
		this.emit("interlude", { next: this.stage + 1 });
	}
	nextShift() {
		this.stage = Math.min(2, this.stage + 1);
		this.phase = "playing";
		this.setupShift();
	}
	finish(won) {
		if (this.phase === "result") return;
		this.phase = "result";
		this.won = won;
		this.emit(won ? "win" : "lose", {});
	}
	heat() {
		if (this.stage < 2)
			return { lane: -1, active: false, warning: false, t: 0 };
		const t = this.clock % 13;
		return {
			lane: Math.floor(this.clock / 13) % 3,
			active: t >= 9 && t < 11.5,
			warning: t >= 6.5 && t < 9,
			t,
		};
	}
	update(dt, inputs = []) {
		if (this.phase === "interlude") {
			this.interlude -= dt;
			if (this.interlude <= 0) this.nextShift();
			return;
		}
		if (this.phase !== "playing") return;
		this.clock += dt;
		if (this.mode !== "practice") this.remaining -= dt;
		this.slow = Math.max(0, this.slow - dt);
		for (const p of this.players) {
			const input = inputs[p.id] || {};
			for (const key of ["dash", "dashTime", "stun", "actionCd", "invincible"])
				p[key] = Math.max(0, p[key] - dt);
			if (input.dash) this.dash(p);
			if (input.cycle) this.cycle(p, input.cycle);
			if (input.discard) this.discard(p);
			if (input.bell) this.ring();
			let x = input.x || 0,
				z = input.z || 0;
			const len = Math.hypot(x, z);
			if (len > 1) {
				x /= len;
				z /= len;
			}
			p.moving = len > 0.1 && p.stun <= 0;
			if (p.moving) {
				p.face = Math.atan2(x, z);
				const speed =
					this.config.moveSpeed *
					(p.dashTime > 0 ? 2.9 : 1) *
					(p.stun > 0 ? 0 : 1);
				let next = {
					x: Math.max(-6, Math.min(6, p.x + x * speed * dt)),
					z: Math.max(-3.4, Math.min(3.7, p.z + z * speed * dt)),
				};
				if (this.move) next = this.move(p, next, dt);
				p.x = next.x;
				p.z = next.z;
			}
			if (input.action) this.action(p);
			if (input.assist) this.action(p, true);
		}
		const heat = this.heat();
		if (heat.active)
			for (const p of this.players) {
				if (
					Math.abs(p.z - TOPPINGS[heat.lane].lane) < 0.55 &&
					Math.abs(p.x) < 3.9 &&
					p.invincible <= 0
				) {
					p.stun = 0.55;
					p.invincible = 2;
					this.addPressure(8);
					this.stats.hits++;
					this.emit("heat", { player: p.id, x: p.x, z: p.z });
				}
			}
		const factor = this.slow > 0 ? 0.32 : 1;
		for (const f of [...this.food]) {
			f.x += this.config.beltSpeed * factor * dt;
			if (f.x > 6.5) {
				this.food.splice(this.food.indexOf(f), 1);
				this.stats.wasted++;
				this.addPressure(0.55);
				this.emit("waste", f);
			}
		}
		for (let i = 0; i < 3; i++) {
			this.spawnTimers[i] -= dt * factor;
			if (this.spawnTimers[i] <= 0) {
				this.spawn(i);
				this.spawnTimers[i] += Math.max(1.5, 2.7 - this.stage * 0.25);
			}
		}
		for (let i = 0; i < 3; i++) {
			const t = this.tickets[i];
			if (t.cooldown > 0) {
				t.cooldown -= dt;
				if (t.cooldown <= 0) this.tickets[i] = this.makeTicket(i);
			} else {
				t.patience -= dt * (this.slow > 0 ? 0.3 : 1);
				if (t.patience <= 0) {
					this.addPressure(13);
					this.combo = 0;
					this.emit("expired", { bay: i });
					this.tickets[i] = this.makeTicket(i);
				}
			}
		}
		if (this.pressure >= 100 || this.remaining <= 0) this.finish(false);
	}
	snapshot() {
		return JSON.parse(
			JSON.stringify({
				phase: this.phase,
				mode: this.mode,
				stage: this.stage,
				remaining: this.remaining,
				clock: this.clock,
				score: this.score,
				pressure: this.pressure,
				bell: this.bell,
				slow: this.slow,
				combo: this.combo,
				bestCombo: this.bestCombo,
				goal: this.goal(),
				servedThisShift: this.servedThisShift,
				players: this.players,
				tickets: this.tickets,
				food: this.food,
				stats: this.stats,
				won: this.won,
				config: this.config,
				heat: this.heat(),
			}),
		);
	}
}

export function autopilot(game, p) {
	if (game.phase !== "playing") return {};
	let t = game.tickets[p.target];
	if (t.cooldown > 0 || !fits(p.plate, t.recipe)) {
		const candidates = game.tickets.filter(
			(q) => q.cooldown <= 0 && fits(p.plate, q.recipe),
		);
		if (!candidates.length) return { discard: p.plate.length > 0 };
		t = candidates.reduce((a, b) => (a.patience < b.patience ? a : b));
		p.target = t.bay;
	}
	let tx, tz;
	if (fits(p.plate, t.recipe, true)) {
		tx = BAYS[t.bay].x;
		tz = 3.6;
	} else {
		const need = missing(p.plate, t.recipe);
		const available = game.food.filter((f) => need.includes(f.type));
		let f = available.sort(
			(a, b) =>
				Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
		)[0];
		if (f) {
			tz = f.z;
			tx = Math.min(
				5.8,
				f.x +
					((game.config.beltSpeed *
						(game.slow > 0 ? 0.32 : 1) *
						Math.abs(f.z - p.z)) /
						game.config.moveSpeed) *
						0.7,
			);
		} else {
			tx = -3;
			tz = TOPPINGS.find((a) => a.id === need[0]).lane;
		}
	}
	const dx = tx - p.x,
		dz = tz - p.z,
		d = Math.hypot(dx, dz);
	return {
		x: d > 0.25 ? dx / Math.max(d, 1) : 0,
		z: d > 0.25 ? dz / Math.max(d, 1) : 0,
		action: d < 0.7,
		dash: d > 4 && p.dash <= 0,
		bell: game.stage > 0 && game.bell >= 100 && game.slow <= 0,
	};
}
