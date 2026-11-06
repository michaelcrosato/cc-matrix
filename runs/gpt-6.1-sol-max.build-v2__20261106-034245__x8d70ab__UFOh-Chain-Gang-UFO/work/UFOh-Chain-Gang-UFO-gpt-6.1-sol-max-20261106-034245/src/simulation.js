import {
	ARENA,
	DEFAULT_BALANCE,
	ENEMIES,
	BOSS_PHASES,
	defaultContent,
	validateContent,
} from "./data/content.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const length = (x, y) => Math.hypot(x, y);
const dist = (a, b) => length(a.x - b.x, a.y - b.y);
const wrap = (a) => ((a % TAU) + TAU) % TAU;
export function clockwise(a, target, step) {
	const d = wrap(target - a);
	return wrap(a + Math.min(d < 1e-9 || TAU - d < 1e-9 ? 0 : d, step));
}
export function sanitizeIntent(i = {}) {
	const n = (v) => (Number.isFinite(v) ? clamp(v, -1, 1) : 0);
	let mx = n(i.mx),
		my = n(i.my),
		d = length(mx, my);
	if (d > 1) {
		mx /= d;
		my /= d;
	}
	return {
		mx,
		my,
		aim: Number.isFinite(i.aim) ? wrap(i.aim) : null,
		fire: i.fire === true,
		seq: Number.isSafeInteger(i.seq) && i.seq >= 0 ? i.seq : 0,
	};
}
// Segment-circle hit time in [0,1]. Relative segment endpoints prevent fast moving targets tunnelling too.
export function sweptCircle(x0, y0, x1, y1, cx, cy, r) {
	const dx = x1 - x0,
		dy = y1 - y0,
		fx = x0 - cx,
		fy = y0 - cy,
		a = dx * dx + dy * dy,
		c = fx * fx + fy * fy - r * r;
	if (c <= 0) return 0;
	if (a < 1e-12) return null;
	const b = 2 * (fx * dx + fy * dy),
		det = b * b - 4 * a * c;
	if (det < 0) return null;
	const t = (-b - Math.sqrt(det)) / (2 * a);
	return t >= 0 && t <= 1 ? t : null;
}
export class World {
	constructor({
		seed = 1981,
		mode = "mission",
		players = [{ id: 0, name: "PILOT" }],
		attract = false,
		balance = {},
		content,
	} = {}) {
		this.balance = { ...DEFAULT_BALANCE, ...balance };
		this.content = content ? validateContent(content) : defaultContent();
		this.random = globalThis.My3D2dge.rng(seed);
		this.events = [];
		this.history = [];
		this.replay = [];
		this.state = {
			v: 1,
			seed,
			mode,
			attract,
			debug: false,
			t: 0,
			tick: 0,
			status: "running",
			score: 0,
			bestChain: 0,
			sector: 0,
			wave: 0,
			waveTime: 0,
			waveSpawned: [],
			transition: 3.5,
			extraction: 0,
			nextId: 1,
			eventId: 0,
			players: players.map((p, index) => ({
				id: p.id,
				index,
				name: String(p.name || "PILOT").slice(0, 24),
				x: 480 + (index ? 60 : -players.length * 15),
				y: 355,
				vx: 0,
				vy: 0,
				r: 13,
				hull: 3,
				shield: 0,
				invuln: 2,
				grace: 0,
				down: false,
				active: true,
				bearing: Math.PI * 1.5,
				requested: Math.PI * 1.5,
				cool: 0,
				recoil: 0,
				score: 0,
				ack: 0,
				wreck: 0,
			})),
			enemies: [],
			shots: [],
			blasts: [],
			chains: [],
			gates: [],
			boss: null,
			deadTime: 0,
			tutorial: { distance: 0, shots: 0, rams: 0, readies: 0, hits: 0 },
			metrics: {
				shots: 0,
				rams: 0,
				kills: 0,
				fusions: 0,
				gunships: 0,
				cascades: 0,
				rescues: 0,
				phases: 0,
			},
			notice: "GOOD MORNING, EARTH. WE HAVE THIS.",
			noticeTime: 4,
		};
		this.emit("sector", { sector: 0 });
		this.emit("wave", { wave: 0 });
	}
	get events() {
		return this._events;
	}
	set events(v) {
		this._events = v;
	}
	emit(type, data = {}) {
		const e = { id: ++this.state.eventId, type, t: this.state.t, ...data };
		this.events.push(e);
		if (this.events.length > 256) this.events.shift();
		if (
			[
				"sector",
				"wave",
				"fusion",
				"rescue",
				"bossPhase",
				"victory",
				"defeat",
			].includes(type)
		)
			this.history.push(e);
		return e;
	}
	notice(text, seconds = 3) {
		this.state.notice = text;
		this.state.noticeTime = seconds;
	}
	snapshot() {
		return {
			...structuredClone(this.state),
			balance: { ...this.balance },
			events: structuredClone(this.events),
		};
	}
	applySnapshot(s) {
		const copy = structuredClone(s);
		if (copy.balance) {
			this.balance = copy.balance;
			delete copy.balance;
		}
		this.events = copy.events || [];
		delete copy.events;
		this.state = copy;
	}
	exportContent() {
		return JSON.stringify(this.content, null, 2);
	}
	importContent(json) {
		const checked = validateContent(
			typeof json === "string" ? JSON.parse(json) : json,
		);
		this.content = checked;
		this.state.debug = true;
		this.jump(Math.min(this.state.wave, checked.mission.length - 1));
		return true;
	}
	id() {
		return this.state.nextId++;
	}
	setBalance(key, value) {
		if (
			!(key in DEFAULT_BALANCE) ||
			typeof DEFAULT_BALANCE[key] !== "number" ||
			!Number.isFinite(value)
		)
			return false;
		this.balance[key] = value;
		this.state.debug = true;
		if (key === "bossHealth" && this.state.boss) {
			const max = Math.ceil(value * (this.livingParticipants() > 1 ? 1.3 : 1));
			for (const c of this.state.boss.components) {
				c.maxHp = max;
				c.hp = Math.min(c.hp, max);
			}
			this.updateBossTotals();
		}
		return true;
	}
	livingParticipants() {
		return this.state.players.filter((p) => p.active).length;
	}
	removePlayer(id) {
		const p = this.state.players.find((p) => p.id === id);
		if (!p) return;
		p.active = false;
		p.down = true;
		p.hull = 0;
		p.vx = p.vy = 0;
		this.state.shots = this.state.shots.filter((b) => b.owner !== id);
		const boss = this.state.boss;
		if (boss) {
			for (const c of boss.components) {
				c.hp = Math.ceil(c.hp / 1.3);
				c.maxHp = Math.ceil(this.balance.bossHealth);
			}
			this.updateBossTotals();
		}
		this.notice("WINGMATE SIGNAL LOST. YOU CAN STILL DO THIS.");
	}
	spawn(kind, x, y, options = {}) {
		const def = ENEMIES[kind];
		if (!def) throw new Error(`Unknown threat ${kind}`);
		const s = this.state;
		const e = {
			id: this.id(),
			kind,
			x: clamp(x, 30, 930),
			y: clamp(y, 30, 510),
			px: x,
			py: y,
			r: def.r,
			hp: def.hp,
			rot: this.random() * TAU,
			age: 0,
			arm: options.instant ? 0 : 1.1,
			dead: false,
			merge: options.merge !== false && def.merge,
			merging: 0,
			partner: 0,
			forcedMerge: !!options.forcedMerge,
			vx: 0,
			vy: 0,
			speed:
				options.speed ?? (options.forcedMerge ? 0 : this.balance.drifterSpeed),
			practice: options.practice || "",
			entry: !options.instant && !options.practice,
			tx: clamp(x, 32, 928),
			ty: clamp(y, 32, 508),
			lane: options.lane || 0,
			warning: 0,
			cool: this.balance.gunVolley,
			lockX: 480,
			lockY: 350,
			pass: 0,
		};
		const a = this.random() * TAU;
		e.vx = Math.cos(a) * e.speed;
		e.vy = Math.sin(a) * e.speed;
		if (e.entry) {
			const top = y < 270;
			e.y = top ? -45 : 585;
			e.x = clamp(x, 34, 926);
			const gate = {
				id: e.id,
				x: e.x,
				y: top ? 0 : 540,
				tx: e.tx,
				ty: e.ty,
				life: 2.6,
				kind,
			};
			s.gates.push(gate);
		}
		if (kind === "hunter") {
			e.arm = options.instant ? 0 : this.balance.hunterArm;
			e.rot = Math.atan2(355 - e.y, 480 - e.x);
		}
		if (kind === "gunship") {
			e.entry = false;
			e.x = e.lane ? 910 : 50;
			e.y = 55;
			e.rot = e.lane ? Math.PI - 0.46 : 0.46;
			e.warning = this.balance.gunWarning;
			e.cool = 0;
			this.emit("warning", { x: e.x, y: e.y, kind });
		}
		s.enemies.push(e);
		return e;
	}
	formation(spec) {
		const points = this.content.formations[spec.formation];
		if (!points) throw new Error("Unknown formation");
		return points.map(([x, y]) =>
			this.spawn(spec.kind || "drifter", spec.x + x, spec.y + y, spec),
		);
	}
	fire(p) {
		if (p.down || !p.active || p.cool > 1e-8) return false;
		const b = this.balance,
			a = p.bearing;
		this.state.shots.push({
			id: this.id(),
			x: p.x + Math.cos(a) * 32,
			y: p.y + Math.sin(a) * 32,
			px: p.x + Math.cos(a) * 32,
			py: p.y + Math.sin(a) * 32,
			vx: Math.cos(a) * b.shotSpeed,
			vy: Math.sin(a) * b.shotSpeed,
			r: 3,
			life: 1.6,
			foe: false,
			owner: p.id,
		});
		p.cool = b.shotInterval;
		p.recoil = 1;
		p.shield = b.recharge;
		this.state.metrics.shots++;
		this.state.tutorial.shots++;
		this.emit("shot", { x: p.x, y: p.y, player: p.id });
		return true;
	}
	consumeShield(p, cause) {
		p.shield = this.balance.recharge;
		p.grace = this.balance.contactGrace;
		this.emit("shield", { x: p.x, y: p.y, player: p.id, cause });
	}
	hurt(p, source) {
		if (
			p.down ||
			!p.active ||
			p.invuln > 0 ||
			p.grace > 0 ||
			this.invulnerable ||
			this.state.attract
		)
			return false;
		p.hull--;
		p.invuln = this.balance.immunity;
		p.grace = this.balance.contactGrace;
		this.state.tutorial.hits++;
		let dx = p.x - source.x,
			dy = p.y - source.y,
			d = length(dx, dy);
		if (d < 0.01) {
			dx = Math.cos(p.id + 1);
			dy = Math.sin(p.id + 1);
			d = 1;
		}
		p.x = clamp(
			source.x + (dx / d) * ((source.r || 12) + p.r + 12),
			p.r,
			ARENA.x1 - p.r,
		);
		p.y = clamp(
			source.y + (dy / d) * ((source.r || 12) + p.r + 12),
			p.r,
			ARENA.y1 - p.r,
		);
		p.vx = (dx / d) * 100;
		p.vy = (dy / d) * 100;
		this.emit("hurt", {
			x: p.x,
			y: p.y,
			player: p.id,
			hull: p.hull,
			cause: source.foe ? "missile" : source.kind || "body",
		});
		if (p.hull <= 0) {
			p.down = true;
			p.wreck = 0;
			p.shield = this.balance.recharge;
			p.vx = p.vy = 0;
			this.notice(
				this.livingParticipants() > 1
					? "WINGMATE DOWN. READY RING TO RESCUE."
					: "SAUCER CONFIDENCE EXCEEDED.",
				4,
			);
		}
		return true;
	}
	chain(owner, x, y) {
		const c = {
			id: this.id(),
			owner,
			count: 0,
			depth: 0,
			victims: [],
			bossVictims: [],
			x,
			y,
			sumX: 0,
			sumY: 0,
			expires: this.state.t + 2.2,
		};
		this.state.chains.push(c);
		return c;
	}
	kill(e, owner, chain = null, depth = 0, cause = "cannon") {
		if (!e || e.dead) return false;
		e.dead = true;
		const c = chain || this.chain(owner, e.x, e.y);
		if (c.victims.includes(e.id)) return false;
		c.victims.push(e.id);
		c.count++;
		c.depth = Math.max(c.depth, depth);
		c.sumX += e.x;
		c.sumY += e.y;
		c.x = c.sumX / c.count;
		c.y = c.sumY / c.count;
		c.expires = this.state.t + 2.2;
		const score =
			ENEMIES[e.kind].score * Math.min(this.balance.chainCap, 1 + depth);
		this.state.score += score;
		const p = this.state.players.find((p) => p.id === c.owner);
		if (p) p.score += score;
		this.state.metrics.kills++;
		if (e.kind === "gunship") this.state.metrics.gunships++;
		this.state.bestChain = Math.max(this.state.bestChain, c.count);
		if (c.count === 3) this.state.metrics.cascades++;
		this.state.blasts.push({
			id: this.id(),
			x: e.x,
			y: e.y,
			r: this.balance.chainRadius * ENEMIES[e.kind].blast,
			age: 0,
			chain: c.id,
			depth: depth + 1,
			owner: c.owner,
			resolved: false,
		});
		this.emit("kill", {
			x: e.x,
			y: e.y,
			player: c.owner,
			kind: e.kind,
			depth,
			chain: c.id,
			cause,
		});
		if (c.count >= 2)
			this.emit("chain", {
				x: c.x,
				y: c.y,
				player: c.owner,
				depth: c.depth,
				count: c.count,
				chain: c.id,
			});
		return true;
	}
	missile(x, y, a, owner = "environment") {
		const v = this.balance.missileSpeed;
		this.state.shots.push({
			id: this.id(),
			x,
			y,
			px: x,
			py: y,
			vx: Math.cos(a) * v,
			vy: Math.sin(a) * v,
			r: 5,
			life: 5,
			foe: true,
			owner,
		});
		this.emit("missile", { x, y });
	}
	target(e) {
		const ps = this.state.players.filter((p) => p.active && !p.down);
		return (
			ps.sort((a, b) => dist(a, e) - dist(b, e) || a.index - b.index)[0] || null
		);
	}
	step(dt, rawIntents = {}) {
		const s = this.state;
		if (s.status === "victory" || s.status === "defeat") return;
		s.t += dt;
		s.tick++;
		s.noticeTime = Math.max(0, s.noticeTime - dt);
		for (const g of s.gates) g.life -= dt;
		s.gates = s.gates.filter((g) => g.life > 0);
		if (s.status === "extracting") {
			if (!s.players.some((p) => p.active && !p.down)) {
				s.deadTime += dt;
				if (s.deadTime >= 1.5) {
					s.status = "defeat";
					this.emit("defeat", { score: s.score });
				}
				return;
			}
			s.extraction += dt;
			for (const p of s.players)
				if (p.active && !p.down) {
					p.vx = 0;
					p.vy = -90;
					p.y -= 90 * dt;
				}
			if (s.extraction >= 4) {
				s.status = "victory";
				this.emit("victory", { score: s.score });
			}
			return;
		}
		if (s.transition > 0) {
			s.transition = Math.max(0, s.transition - dt);
			for (const p of s.players) {
				p.cool = 0;
				p.invuln = Math.max(p.invuln, 1.3);
			}
			if (s.transition === 0) this.notice(this.currentWave().learning, 4.5);
			return;
		}
		for (const p of s.players) {
			p.px = p.x;
			p.py = p.y;
			if (!p.active) continue;
			p.invuln = Math.max(0, p.invuln - dt);
			p.grace = Math.max(0, p.grace - dt);
			p.cool = Math.max(0, p.cool - dt);
			p.recoil = Math.max(0, p.recoil - dt * 7);
			const beforeCharge = p.shield,
				was = p.shield > 0;
			p.shield = Math.max(0, p.shield - dt);
			if (
				!p.down &&
				beforeCharge > this.balance.recharge / 2 &&
				p.shield <= this.balance.recharge / 2 &&
				p.shield > 0
			)
				this.emit("recharge", { x: p.x, y: p.y, player: p.id });
			if (was && p.shield === 0 && !p.down) {
				s.tutorial.readies++;
				this.emit("ready", { x: p.x, y: p.y, player: p.id });
			}
			if (p.down) {
				p.wreck += dt;
				continue;
			}
			const i = sanitizeIntent(rawIntents[p.id]);
			p.ack = i.seq;
			if (i.aim !== null) p.requested = i.aim;
			else if (length(i.mx, i.my) > 0.12)
				p.requested = wrap(Math.atan2(i.my, i.mx));
			p.bearing = clockwise(p.bearing, p.requested, this.balance.slew * dt);
			if (i.fire) this.fire(p);
			const speed =
					this.balance.speed * (p.shield > 0 ? this.balance.recoverySpeed : 1),
				f = 1 - Math.exp(-this.balance.response * dt);
			p.vx += (i.mx * speed - p.vx) * f;
			p.vy += (i.my * speed - p.vy) * f;
			p.x = clamp(p.x + p.vx * dt, p.r, ARENA.x1 - p.r);
			p.y = clamp(p.y + p.vy * dt, p.r, ARENA.y1 - p.r);
			if ((p.x === p.r && p.vx < 0) || (p.x === ARENA.x1 - p.r && p.vx > 0))
				p.vx = 0;
			if ((p.y === p.r && p.vy < 0) || (p.y === ARENA.y1 - p.r && p.vy > 0))
				p.vy = 0;
			s.tutorial.distance += length(p.x - p.px, p.y - p.py);
		}
		this.encounters(dt);
		this.moveEnemies(dt);
		this.moveBoss(dt);
		this.projectiles(dt);
		this.blasts(dt);
		this.contacts();
		this.merges(dt);
		s.enemies = s.enemies.filter((e) => !e.dead);
		s.shots = s.shots.filter(
			(b) =>
				b.life > 0 &&
				b.x > -ARENA.cleanup &&
				b.x < ARENA.x1 + ARENA.cleanup &&
				b.y > -ARENA.cleanup &&
				b.y < ARENA.y1 + ARENA.cleanup,
		);
		s.blasts = s.blasts.filter((b) => b.age < 0.7);
		s.chains = s.chains.filter((c) => c.expires > s.t);
		const alive = s.players.some((p) => p.active && !p.down);
		if (!alive) {
			s.deadTime += dt;
			if (s.deadTime >= 1.5) {
				s.status = "defeat";
				this.emit("defeat", { score: s.score });
			}
		} else s.deadTime = 0;
	}
	moveEnemies(dt) {
		const s = this.state,
			b = this.balance;
		for (const e of s.enemies) {
			e.px = e.x;
			e.py = e.y;
			e.age += dt;
			e.rot += e.kind === "drifter" ? dt * 0.8 : 0;
			const beforeArm = e.arm;
			e.arm = Math.max(0, e.arm - dt);
			if (
				!e.dead &&
				!e.entry &&
				e.kind === "hunter" &&
				beforeArm > 0 &&
				e.arm === 0
			)
				this.emit("hunter", { x: e.x, y: e.y, kind: e.kind });
			if (e.dead || e.merging) continue;
			if (e.entry) {
				const d = length(e.tx - e.x, e.ty - e.y),
					step = 150 * dt;
				if (d < step) {
					e.x = e.tx;
					e.y = e.ty;
					e.entry = false;
					e.arm = 0.5;
				} else {
					e.x += ((e.tx - e.x) / d) * step;
					e.y += ((e.ty - e.y) / d) * step;
				}
				continue;
			}
			if (e.kind === "drifter") {
				// Old stragglers gravitate toward the fight, without hidden despawning.
				const p = this.target(e);
				const toward =
					e.age > 25 && p ? Math.atan2(p.y - e.y, p.x - e.x) : null;
				if (toward !== null) {
					e.vx += (Math.cos(toward) * Math.max(24, b.drifterSpeed) - e.vx) * dt;
					e.vy += (Math.sin(toward) * Math.max(24, b.drifterSpeed) - e.vy) * dt;
				}
				e.x += e.vx * dt;
				e.y += e.vy * dt;
				if (e.x < e.r || e.x > 960 - e.r) {
					e.vx *= -1;
					e.x = clamp(e.x, e.r, 960 - e.r);
				}
				if (e.y < e.r || e.y > 540 - e.r) {
					e.vy *= -1;
					e.y = clamp(e.y, e.r, 540 - e.r);
				}
			} else if (e.kind === "hunter") {
				const p = this.target(e);
				if (p && e.arm <= 0) {
					const target = Math.atan2(p.y - e.y, p.x - e.x),
						d = Math.atan2(Math.sin(target - e.rot), Math.cos(target - e.rot));
					e.rot += clamp(d, -b.hunterTurn * dt, b.hunterTurn * dt);
					e.vx = Math.cos(e.rot) * b.hunterSpeed;
					e.vy = Math.sin(e.rot) * b.hunterSpeed;
					e.x = clamp(e.x + e.vx * dt, e.r, 960 - e.r);
					e.y = clamp(e.y + e.vy * dt, e.r, 540 - e.r);
				}
			} else {
				const p = this.target(e);
				e.cool -= dt;
				if (e.warning > 0) {
					e.warning = Math.max(0, e.warning - dt);
					if (e.warning === 0) {
						const a = Math.atan2(e.lockY - e.y, e.lockX - e.x);
						for (const a2 of [-0.13, 0, 0.13]) this.missile(e.x, e.y, a + a2);
						e.cool = b.gunVolley;
					}
				} else if (e.cool <= 0 && p) {
					e.warning = b.gunWarning;
					e.lockX = p.x + p.vx * 0.4;
					e.lockY = p.y + p.vy * 0.4;
					this.emit("warning", { x: e.x, y: e.y, kind: "gunship" });
				}
				const sign = e.pass % 2 ? -1 : 1,
					dir = e.lane ? -1 : 1,
					sp = e.warning > 0 ? 44 : 98;
				e.vx = dir * sp * sign;
				e.vy = sp * 0.47 * sign;
				e.rot = Math.atan2(e.vy, e.vx);
				e.x += e.vx * dt;
				e.y += e.vy * dt;
				if (e.x < 42 || e.x > 918 || e.y < 42 || e.y > 498) {
					e.x = clamp(e.x, 42, 918);
					e.y = clamp(e.y, 42, 498);
					e.pass++;
				}
			}
		}
	}
	projectiles(dt) {
		const s = this.state,
			batch = s.shots;
		for (const b of batch) {
			if (s.shots !== batch) break; // A phase/extraction clear ends this contact batch immediately.
			if (b.life <= 0) continue;
			b.px = b.x;
			b.py = b.y;
			b.x += b.vx * dt;
			b.y += b.vy * dt;
			b.life -= dt;
			const hits = [];
			for (const e of s.enemies)
				if (
					!e.dead &&
					!e.entry &&
					e.arm <= 0 &&
					(!b.foe || e.kind === "drifter")
				) {
					const t = sweptCircle(
						b.px - (e.px ?? e.x) + e.x,
						b.py - (e.py ?? e.y) + e.y,
						b.x,
						b.y,
						e.x,
						e.y,
						e.r + b.r,
					);
					if (t !== null) hits.push({ t, type: "enemy", e, id: e.id });
				}
			if (!b.foe && s.boss && !s.boss.dead) {
				for (const c of s.boss.components)
					if (c.hp > 0) {
						const t = sweptCircle(b.px, b.py, b.x, b.y, c.x, c.y, 19 + b.r);
						if (t !== null) hits.push({ t, type: "component", c, id: c.id });
					}
				const t = sweptCircle(
					b.px,
					b.py,
					b.x,
					b.y,
					s.boss.x,
					s.boss.y,
					57 + b.r,
				);
				if (t !== null) hits.push({ t, type: "boss", id: s.boss.id });
			}
			if (b.foe)
				for (const p of s.players)
					if (p.active && !p.down && p.grace <= 0) {
						const radius = p.shield <= 0 ? 30 : p.r,
							t = sweptCircle(
								b.px - (p.px ?? p.x) + p.x,
								b.py - (p.py ?? p.y) + p.y,
								b.x,
								b.y,
								p.x,
								p.y,
								radius + b.r,
							);
						if (t !== null)
							hits.push({ t, type: "player", p, id: 100000 + p.index });
					}
			hits.sort((a, b) => a.t - b.t || a.id - b.id);
			const h = hits[0];
			if (!h) continue;
			b.life = 0;
			if (h.type === "enemy") {
				h.e.hp--;
				if (h.e.hp <= 0 || b.foe)
					this.kill(
						h.e,
						b.foe ? "team" : b.owner,
						null,
						0,
						b.foe ? "enemy-fire" : "cannon",
					);
				else this.emit("armor", { x: h.e.x, y: h.e.y });
			} else if (h.type === "component")
				this.hitComponent(h.c, 1, b.owner, "cannon");
			else if (h.type === "player") {
				if (h.p.shield <= 0) this.consumeShield(h.p, "missile");
				else this.hurt(h.p, b);
			} else this.emit("armor", { x: b.x, y: b.y });
		}
	}
	blasts(dt) {
		const s = this.state;
		// Iterate a captured list. Descendants wait at least chainDelay; no recursive same-tick crowd kill.
		for (const b of [...s.blasts]) {
			b.age += dt;
			if (b.resolved || b.age < this.balance.chainDelay) continue;
			b.resolved = true;
			const c = s.chains.find((c) => c.id === b.chain);
			if (!c) continue;
			for (const e of s.enemies)
				if (!e.dead && !e.entry && e.arm <= 0 && dist(e, b) <= b.r + e.r)
					this.kill(e, c.owner, c, b.depth, "chain");
			if (s.boss)
				for (const part of s.boss.components)
					if (
						part.hp > 0 &&
						part.open &&
						dist(part, b) < b.r + 19 &&
						!c.bossVictims.includes(part.id)
					) {
						c.bossVictims.push(part.id);
						this.hitComponent(part, 2, c.owner, "chain");
					}
		}
	}
	contacts() {
		const s = this.state;
		for (const p of s.players) {
			if (!p.active || p.down || p.grace > 0) continue;
			const hit = s.enemies
				.filter(
					(e) =>
						!e.dead &&
						!e.entry &&
						e.arm <= 0 &&
						dist(e, p) <= e.r + (p.shield <= 0 ? 30 : p.r),
				)
				.sort((a, b) => a.id - b.id)[0];
			if (hit) {
				if (p.shield <= 0) {
					this.consumeShield(p, "ram");
					this.kill(hit, p.id, null, 0, "ram");
					s.metrics.rams++;
					s.tutorial.rams++;
				} else this.hurt(p, hit);
				continue;
			}
			const boss = s.boss;
			if (boss && !boss.dead) {
				const part = boss.components.find(
					(c) => c.hp > 0 && dist(p, c) < (p.shield <= 0 ? 30 : p.r) + 19,
				);
				const body = dist(p, boss) < 57 + (p.shield <= 0 ? 30 : p.r);
				if (part || body) {
					if (p.shield <= 0) {
						this.consumeShield(p, "boss");
						if (part) this.hitComponent(part, 3, p.id, "ram");
					} else this.hurt(p, part || boss);
				}
			}
		}
		// Rescue comes after hostile contacts: a shield already spent this batch cannot also revive.
		for (const wreck of s.players.filter(
			(p) => p.active && p.down && p.wreck > 0.65,
		))
			for (const p of s.players)
				if (
					p.active &&
					!p.down &&
					p.shield <= 0 &&
					p.grace <= 0 &&
					dist(p, wreck) < 45
				) {
					this.consumeShield(p, "rescue");
					wreck.down = false;
					wreck.hull = 1;
					wreck.invuln = this.balance.immunity;
					wreck.grace = this.balance.contactGrace;
					wreck.shield = this.balance.recharge;
					wreck.wreck = 0;
					wreck.x = clamp(wreck.x + 42, 13, 947);
					s.metrics.rescues++;
					this.emit("rescue", {
						x: wreck.x,
						y: wreck.y,
						player: p.id,
						target: wreck.id,
					});
					this.notice("BACK IN BUSINESS. TRY TO LOOK BUSY.");
					break;
				}
	}
	merges(dt) {
		const s = this.state,
			b = this.balance;
		for (const a of s.enemies) {
			if (a.dead || a.kind !== "drifter" || a.entry || a.arm > 0) continue;
			if (a.merging) {
				const p = s.enemies.find((e) => e.id === a.partner && !e.dead);
				if (!p) {
					a.merging = 0;
					a.partner = 0;
					continue;
				}
				a.merging = Math.max(0, a.merging - dt);
				if (a.id < p.id) {
					const mx = (a.x + p.x) / 2,
						my = (a.y + p.y) / 2;
					a.x += (mx - a.x) * dt * 1.3;
					a.y += (my - a.y) * dt * 1.3;
					p.x += (mx - p.x) * dt * 1.3;
					p.y += (my - p.y) * dt * 1.3;
					if (a.merging === 0) {
						a.dead = p.dead = true;
						const h = this.spawn("hunter", mx, my, { instant: true });
						h.arm = b.hunterArm;
						s.metrics.fusions++;
						this.emit("fusion", {
							x: mx,
							y: my,
							id1: a.id,
							id2: p.id,
							hunter: h.id,
						});
					}
				}
				continue;
			}
			if (!a.merge || a.age < 3) continue;
			const p = s.enemies.find(
				(e) =>
					e.id > a.id &&
					!e.dead &&
					!e.entry &&
					e.arm <= 0 &&
					e.kind === "drifter" &&
					e.merge &&
					!e.merging &&
					dist(e, a) <= b.fusionRadius * (a.forcedMerge ? 1.8 : 1),
			);
			if (p) {
				a.merging = p.merging = b.fusionWindup;
				a.partner = p.id;
				p.partner = a.id;
				this.emit("tether", { x: a.x, y: a.y, target: p.id });
			}
		}
	}
	currentWave() {
		return this.content.mission[this.state.wave] || this.content.mission.at(-1);
	}
	encounters(dt) {
		const s = this.state;
		const w = this.currentWave();
		s.waveTime += dt;
		if (s.mode === "score") {
			this.scoreDeck(dt);
			return;
		}
		if (w.boss) {
			if (!s.boss) this.createBoss();
			return;
		}
		w.spawns.forEach((spec, i) => {
			if (spec.at <= s.waveTime && !s.waveSpawned.includes(i)) {
				s.waveSpawned.push(i);
				this.formation(spec);
				if (this.livingParticipants() > 1 && !w.tutorial && i === 0)
					this.spawn("hunter", 800, 155);
			}
		});
		const all = s.waveSpawned.length === w.spawns.length;
		if (w.tutorial && all && s.enemies.length === 0 && s.tutorial.rams === 0) {
			this.spawn(
				"drifter",
				clamp(s.players[0].x + 125, 160, 800),
				clamp(s.players[0].y, 100, 440),
				{ instant: true, merge: false, speed: 0, practice: "ram" },
			);
			this.notice("LET GO OF FIRE. FULL RING? RAM THE SATELLITE.", 5);
		}
		const taught =
			!w.tutorial ||
			(s.tutorial.shots > 0 &&
				s.tutorial.rams > 0 &&
				s.tutorial.readies > 0 &&
				s.tutorial.distance > 35);
		if (
			all &&
			s.enemies.length === 0 &&
			s.blasts.length === 0 &&
			s.waveTime > 3 &&
			taught
		) {
			this.nextWave();
		}
	}
	nextWave() {
		const s = this.state;
		s.wave++;
		if (s.wave >= this.content.mission.length) {
			this.extract();
			return;
		}
		const w = this.currentWave(),
			old = s.sector;
		s.sector = w.sector;
		s.waveTime = 0;
		s.waveSpawned = [];
		s.transition = old !== s.sector ? 4.2 : 2.4;
		s.shots = [];
		s.gates = [];
		s.notice = w.name.toUpperCase();
		s.noticeTime = s.transition;
		if (old !== s.sector) {
			for (const p of s.players)
				if (p.active && !p.down) {
					p.hull = Math.min(3, p.hull + 1);
					p.shield = 0;
					p.x = 480 + (p.index ? 60 : -30);
					p.y = 375;
					p.vx = p.vy = 0;
				}
			this.emit("sector", { sector: s.sector });
		}
		this.emit("wave", { wave: s.wave, encounter: w.id });
	}
	scoreDeck() {
		const s = this.state;
		if (s.boss) return;
		if (s.enemies.length === 0 && s.blasts.length === 0 && s.waveTime > 3) {
			if (s.wave > 0 && s.wave % 5 === 0) {
				s.sector = 3;
				this.createBoss(true);
				return;
			}
			const types = ["chain", "fork", "diamonds", "ladder", "crown"],
				formation = types[Math.floor(this.random() * types.length)],
				x = 340 + this.random() * 280,
				y = 155 + this.random() * 220;
			this.formation({
				formation,
				x,
				y,
				kind: "drifter",
				instant: false,
				forcedMerge: s.wave % 3 === 1,
			});
			if (s.wave > 0) this.spawn("hunter", 120, 100);
			if (s.wave >= 2) this.spawn("gunship", 70, 70, { lane: s.wave % 2 });
			s.sector = Math.min(2, Math.floor(s.wave / 2));
			s.wave++;
			s.waveTime = 0;
			this.emit("wave", { wave: s.wave });
			this.notice(`SCORE ATTACK / WAVE ${String(s.wave).padStart(2, "0")}`, 2);
			this.balance.hunterSpeed = Math.min(
				145,
				DEFAULT_BALANCE.hunterSpeed + s.wave * 2.5,
			);
		}
	}
	createBoss(scoreBoss = false) {
		const s = this.state;
		s.boss = {
			id: this.id(),
			x: 480,
			y: 150,
			px: 480,
			py: 150,
			r: 64,
			phase: 0,
			clock: 0,
			cycle: 0,
			cycles: 0,
			transition: 2.5,
			components: [],
			hp: 0,
			maxHp: 0,
			dead: false,
			scoreBoss,
			lockX: 480,
			lockY: 420,
		};
		this.bossParts();
		this.notice("THE GRAND UNIDENTIFIED. OPEN EMITTERS ONLY.", 5);
		this.emit("bossPhase", { phase: 0 });
		s.metrics.phases++;
	}
	bossParts() {
		const b = this.state.boss,
			max = Math.ceil(
				this.balance.bossHealth * (this.livingParticipants() > 1 ? 1.3 : 1),
			);
		b.components = BOSS_PHASES[b.phase].offsets.map(([ox, oy]) => ({
			id: this.id(),
			ox,
			oy,
			x: b.x + ox,
			y: b.y + oy,
			hp: max,
			maxHp: max,
			open: false,
			angle: 0,
		}));
		b.cycle = 0;
		b.cycles = 0;
		const p = this.target(b);
		if (p) {
			b.lockX = p.x;
			b.lockY = p.y;
		}
		this.updateBossTotals();
	}
	updateBossTotals() {
		const b = this.state.boss;
		if (b) {
			b.hp = b.components.reduce((n, c) => n + c.hp, 0);
			b.maxHp = b.components.reduce((n, c) => n + c.maxHp, 0);
		}
	}
	moveBoss(dt) {
		const s = this.state,
			b = s.boss;
		if (!b || b.dead) return;
		b.clock += dt;
		b.px = b.x;
		b.py = b.y;
		b.x = 480 + Math.sin(b.clock * 0.28) * 100;
		b.y = 142 + Math.sin(b.clock * 0.43) * 18;
		for (const c of b.components) {
			c.x = b.x + c.ox + Math.sin(b.clock * 1.2 + c.ox) * 3;
			c.y = b.y + c.oy;
			c.angle = b.clock;
		}
		if (b.transition > 0) {
			b.transition = Math.max(0, b.transition - dt);
			for (const c of b.components) c.open = false;
			return;
		}
		const before = b.cycle;
		b.cycle += dt;
		const interval = this.balance.bossInterval,
			warning = Math.min(this.balance.gunWarning, interval * 0.35);
		for (const c of b.components)
			c.open = c.hp > 0 && b.cycle > warning + 0.45 && b.cycle < interval - 0.6;
		if (before <= warning && b.cycle > warning) {
			const a = Math.atan2(b.lockY - (b.y + 45), b.lockX - b.x),
				n = BOSS_PHASES[b.phase].missiles;
			for (let i = 0; i < n; i++)
				this.missile(b.x, b.y + 45, a + (i - (n - 1) / 2) * 0.19);
			if (b.phase === 2) {
				this.missile(40, 40, Math.atan2(b.lockY - 40, b.lockX - 40));
				this.missile(920, 40, Math.atan2(b.lockY - 40, b.lockX - 920));
			}
		}
		if (b.cycle >= interval) {
			b.cycle = 0;
			b.cycles++;
			const target = this.target(b);
			if (target) {
				b.lockX = target.x;
				b.lockY = target.y;
			}
			this.emit("warning", { x: b.x, y: b.y, kind: "boss" });
			if (s.enemies.length < 12) {
				const f = BOSS_PHASES[b.phase].adds;
				this.formation({
					formation: f,
					x: 480,
					y: 330,
					kind: f === "hunters" ? "hunter" : "drifter",
					merge: false,
				});
			}
		}
	}
	hitComponent(c, damage, owner, cause) {
		const b = this.state.boss;
		if (!b || b.dead || c.hp <= 0 || !c.open) {
			this.emit("armor", { x: c.x, y: c.y });
			return false;
		}
		c.hp = Math.max(0, c.hp - damage);
		this.updateBossTotals();
		this.emit("bossHit", { x: c.x, y: c.y, player: owner, cause, hp: c.hp });
		if (c.hp === 0) {
			this.state.score += 30;
			const p = this.state.players.find((p) => p.id === owner);
			if (p) p.score += 30;
			this.emit("kill", {
				x: c.x,
				y: c.y,
				kind: "emitter",
				player: owner,
				depth: 0,
			});
		}
		if (b.hp <= 0) {
			if (b.phase < 2) {
				b.phase++;
				b.transition = 3.2;
				this.state.shots = [];
				for (const e of this.state.enemies) this.kill(e, "team");
				for (const p of this.state.players)
					if (p.active && !p.down) {
						p.hull = Math.min(3, p.hull + this.balance.bossRepair);
						p.shield = 0;
					}
				this.bossParts();
				this.state.metrics.phases++;
				this.emit("bossPhase", { phase: b.phase, x: b.x, y: b.y });
				this.notice(`${BOSS_PHASES[b.phase].name} / ONE HULL REPAIRED`, 4);
			} else {
				b.dead = true;
				this.state.score += 500;
				const alive = this.state.players.filter((p) => p.active);
				for (const p of alive) p.score += Math.floor(500 / alive.length);
				this.emit("bossDown", { x: b.x, y: b.y });
				for (const e of this.state.enemies) this.kill(e, "team");
				this.state.shots = [];
				if (this.state.mode === "score") {
					this.state.boss = null;
					this.state.wave++;
					this.state.waveTime = -3;
					this.notice("MANAGEMENT REPLACED. BUSINESS CONTINUES.", 4);
				} else this.extract();
			}
		}
		return true;
	}
	extract() {
		if (this.state.status !== "running") return;
		this.state.status = "extracting";
		this.state.extraction = 0;
		this.state.shots = [];
		this.notice("EARTH IS STILL HERE. TAKE THE CREDIT.", 4);
		this.emit("extraction");
	}
	jump(wave) {
		const s = this.state;
		s.debug = true;
		s.wave = clamp(Math.floor(wave), 0, this.content.mission.length - 1);
		s.sector = this.currentWave().sector;
		s.waveTime = 0;
		s.waveSpawned = [];
		s.enemies = [];
		s.shots = [];
		s.blasts = [];
		s.chains = [];
		s.gates = [];
		s.boss = null;
		s.transition = 1;
		s.status = "running";
		s.deadTime = 0;
		for (const p of s.players) {
			p.down = false;
			p.hull = 3;
			p.shield = 0;
			p.invuln = 2;
			p.x = 480 + (p.index ? 60 : -30);
			p.y = 375;
			p.vx = p.vy = 0;
		}
		this.emit("wave", { wave: s.wave });
	}
	command(name, data = {}) {
		const s = this.state;
		s.debug = true;
		switch (name) {
			case "invulnerable":
				this.invulnerable = !!data.value;
				return this.invulnerable;
			case "refill":
				for (const p of s.players) {
					p.hull = 3;
					p.down = false;
					p.shield = 0;
					p.invuln = 1.1;
				}
				return true;
			case "spawn":
				return this.formation({
					formation: data.formation || "chain",
					kind: data.kind || "drifter",
					x: data.x ?? 480,
					y: data.y ?? 220,
					instant: true,
					merge: data.merge !== false,
				});
			case "clear":
				s.enemies = [];
				s.shots = [];
				s.blasts = [];
				s.chains = [];
				return true;
			case "jump":
				this.jump(data.wave ?? 0);
				return true;
			case "phase":
				this.jump(this.content.mission.length - 1);
				s.transition = 0;
				this.createBoss();
				s.boss.phase = clamp(data.phase ?? 0, 0, 2);
				this.bossParts();
				return true;
			case "restart":
				this.jump(s.wave);
				return true;
			case "balance":
				return this.setBalance(data.key, data.value);
			case "resetBalance":
				this.balance = { ...DEFAULT_BALANCE };
				if (s.boss) {
					for (const c of s.boss.components) {
						c.maxHp = Math.ceil(
							this.balance.bossHealth *
								(this.livingParticipants() > 1 ? 1.3 : 1),
						);
						c.hp = Math.min(c.hp, c.maxHp);
					}
					this.updateBossTotals();
				}
				return true;
			default:
				throw new Error(`Unknown dev command: ${name}`);
		}
	}
}

// Legal intent pilot used in attract and whole-mission verification. It reads only visible authority state.
export function pilotIntent(world, index = 0, { showcase = false } = {}) {
	const s = world.state,
		p = s.players[index];
	if (!p || p.down || !p.active) return sanitizeIntent();
	const targets = s.enemies.filter((e) => !e.dead && !e.entry && e.arm <= 0),
		boss = s.boss;
	let target = targets.sort((a, b) => dist(a, p) - dist(b, p))[0],
		mx = 0,
		my = 0,
		fire = false;
	const ramNeeded =
		s.mode === "mission" &&
		s.wave === 0 &&
		s.tutorial.rams === 0 &&
		s.tutorial.shots > 0;
	if (boss && !boss.dead) {
		const parts = boss.components.filter((c) => c.hp > 0),
			open = parts.filter((c) => c.open);
		const urgent = targets.find((e) => dist(e, p) < 240);
		target =
			urgent ||
			(open.length ? open : parts).sort((a, b) => dist(a, p) - dist(b, p))[0];
	}
	if (target) {
		const dx = target.x - p.x,
			dy = target.y - p.y,
			d = length(dx, dy) || 1;
		if (ramNeeded) {
			if (p.shield <= 0) {
				mx = dx / d;
				my = dy / d;
			}
		} else {
			const desired = boss ? 230 : 200;
			if (d > desired + 40) {
				mx = (dx / d) * 0.6;
				my = (dy / d) * 0.6;
			} else if (d < desired - 50) {
				mx = -dx / d;
				my = -dy / d;
			} else {
				mx = (-dy / d) * 0.32;
				my = (dx / d) * 0.32;
			}
			if (boss) {
				const goalX = clamp(480 + Math.sin(boss.clock * 0.8) * 210, 130, 830),
					goalY = clamp(boss.y + 275, 350, 475),
					gx = goalX - p.x,
					gy = goalY - p.y,
					gd = length(gx, gy);
				mx = gd > 20 ? (gx / gd) * 0.9 : 0;
				my = gd > 20 ? (gy / gd) * 0.9 : 0;
			}
			const aim = Math.atan2(
					dy + ((target.vy || 0) * d) / world.balance.shotSpeed,
					dx + ((target.vx || 0) * d) / world.balance.shotSpeed,
				),
				delta = Math.abs(
					Math.atan2(Math.sin(aim - p.bearing), Math.cos(aim - p.bearing)),
				);
			const danger =
				targets.some((e) => dist(e, p) < 95) ||
				s.shots.some((b) => b.foe && dist(b, p) < 100);
			fire =
				delta < 0.09 &&
				!danger &&
				(!boss || target.kind || target.open) &&
				(!p.shield || p.shield > world.balance.recharge * 0.75 || d > 160);
			if (
				s.wave === 3 &&
				s.mode === "mission" &&
				s.metrics.fusions === 0 &&
				s.waveTime < 8
			)
				fire = false;
			if (showcase && s.t % 5 > 1 && s.t % 5 < 3.3) fire = false;
		}
	}
	// Predictive missile avoidance, then edge steering. Avoidance cannot author kills or scores.
	if (!ramNeeded) {
		for (const b of s.shots.filter((b) => b.foe)) {
			const dx = p.x - b.x,
				dy = p.y - b.y,
				v2 = b.vx * b.vx + b.vy * b.vy,
				t = (dx * b.vx + dy * b.vy) / (v2 || 1);
			if (t > 0 && t < 1 && length(dx - b.vx * t, dy - b.vy * t) < 55) {
				mx +=
					(-b.vy / Math.sqrt(v2)) * (dx * b.vy - dy * b.vx > 0 ? -1 : 1) * 1.6;
				my +=
					(b.vx / Math.sqrt(v2)) * (dx * b.vy - dy * b.vx > 0 ? -1 : 1) * 1.6;
			}
		}
		for (const e of targets)
			if (dist(e, p) < 100) {
				mx += ((p.x - e.x) / (dist(e, p) || 1)) * 1.4;
				my += ((p.y - e.y) / (dist(e, p) || 1)) * 1.4;
			}
	}
	if (p.x < 90) mx += 1;
	if (p.x > 870) mx -= 1;
	if (p.y < 90) my += 1;
	if (p.y > 450) my -= 1;
	const aim = target
		? Math.round(
				Math.atan2(
					target.y -
						p.y +
						((target.vy || 0) * dist(target, p)) / world.balance.shotSpeed,
					target.x -
						p.x +
						((target.vx || 0) * dist(target, p)) / world.balance.shotSpeed,
				) / 0.07,
			) * 0.07
		: null;
	return sanitizeIntent({ mx, my, aim, fire, seq: s.tick });
}
