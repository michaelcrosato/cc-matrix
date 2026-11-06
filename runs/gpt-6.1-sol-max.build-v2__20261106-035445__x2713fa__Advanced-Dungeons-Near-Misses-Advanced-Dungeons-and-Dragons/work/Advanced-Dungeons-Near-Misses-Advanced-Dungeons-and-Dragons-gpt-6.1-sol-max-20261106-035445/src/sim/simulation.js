(() => {
	const N = globalThis.NM,
		G = N.Geometry,
		T = N.TILE,
		C = N.clamp,
		clone = N.clone;
	const BASE = {
		rat: { hp: 1, speed: 25, wind: 0.65, range: 22, hearing: 7 },
		snake: { hp: 2, speed: 13, wind: 1, range: 49, hearing: 6 },
		bat: { hp: 1, speed: 30, wind: 0.65, range: 28, hearing: 5 },
		spider: { hp: 1, speed: 22, wind: 0.8, range: 25, hearing: 7 },
		ooze: { hp: 99, speed: 10, wind: 1.2, range: 21, hearing: 16 },
		drake: { hp: 2, speed: 16, wind: 1.5, range: 85, hearing: 9 },
		guardian1: { hp: 3, speed: 18, wind: 1.35, range: 110, hearing: 14 },
		guardian2: { hp: 3, speed: 12, wind: 1.6, range: 125, hearing: 12 },
		target: { hp: 1, speed: 0, wind: 99, range: 0, hearing: 0 },
	};
	for (const [type, authored] of Object.entries(N.Content.enemyDefs)) {
		Object.assign(BASE[type], authored, { wind: authored.windup });
	}
	class Sim {
		constructor({
			seed = 182,
			players = [1],
			mode = "solo",
			save = null,
		} = {}) {
			this.config = { ...N.DEFAULTS };
			this.dev = {};
			this.inputs = {};
			this.pending = {};
			this.seenActions = {};
			this.noiseFields = new Map();
			this.restartSnapshot = null;
			this.saveCallback = save;
			this.networkMode = mode;
			this.state = {
				version: N.VERSION,
				tick: 0,
				time: 0,
				seed: seed >>> 0,
				rng: seed >>> 0,
				epoch: 1,
				serial: 0,
				mode: "map",
				mapNode: "camp",
				caveIndex: 0,
				players: [],
				enemies: [],
				arrows: [],
				pickups: [],
				noise: [],
				events: [],
				explored: [],
				visible: [],
				arrowLit: [],
				triggered: [],
				objective:
					"Seek the split Crown of Clear Skies. Begin at the pale cave.",
				notice: "Two wings. One crown. Bring the daylight home.",
				noticeUntil: 8,
				checkpointId: "camp",
				party: {
					ammo: 3,
					capacity: 12,
					reserves: 3,
					tools: [],
					halves: [],
					cleared: [],
					treasure: 0,
				},
				stats: {
					shots: 0,
					banks: 0,
					wounds: 0,
					kills: 0,
					recovered: 0,
					steps: 0,
					deaths: 0,
					restarts: 0,
					assisted: false,
					revives: 0,
					tools: 0,
				},
				transition: null,
			};
			this.level = G.compile(N.Content.caves[0]);
			for (const seat of players) this.addPlayer(seat);
		}
		random() {
			let x = this.state.rng;
			x ^= x << 13;
			x ^= x >>> 17;
			x ^= x << 5;
			this.state.rng = x >>> 0;
			return (x >>> 0) / 4294967296;
		}
		id(prefix) {
			return `${prefix}-${this.state.epoch}-${++this.state.serial}`;
		}
		event(kind, x = 0, y = 0, extra = {}) {
			const s = this.state,
				e = { id: this.id("ev"), kind, x, y, time: s.time, ...extra };
			s.events.push(e);
			if (s.events.length > 24) s.events.shift();
			return e;
		}
		say(text, seconds = 6) {
			this.state.notice = text;
			this.state.noticeUntil = this.state.time + seconds;
			this.event("voice", 0, 0, { text });
		}
		noise(kind, x, y, loudness, source = "player") {
			const s = this.state,
				n = {
					id: this.id("noise"),
					kind,
					x,
					y,
					loudness: loudness * this.config.noise,
					time: s.time,
					until: s.time + 4,
					source,
				};
			s.noise.push(n);
			if (s.noise.length > 20) s.noise.shift();
			this.noiseFields.set(
				n.id,
				G.field(this.level, x, y, Math.ceil(loudness * 2)),
			);
			this.event(kind, x, y, { loudness, source });
			return n;
		}
		addPlayer(seat) {
			if (
				!Number.isInteger(seat) ||
				seat < 1 ||
				seat > 2 ||
				this.state.players.some((p) => p.seat === seat) ||
				this.state.players.length >= 2
			)
				return false;
			const other = this.state.players.find((p) => !p.downed),
				spawn = other
					? [other.x + 12, other.y]
					: this.level.data.spawn.map((v) => v * T),
				[x, y] = G.nearest(this.level, ...spawn);
			this.state.players.push({
				id: `ranger-${seat}`,
				seat,
				x,
				y,
				z: 0,
				r: 4.5,
				angle: 0,
				hp: 3,
				maxHp: 3,
				state: "idle",
				stateTime: 0,
				invuln: 3,
				draw: 0,
				recovery: 0,
				focus: false,
				downed: false,
				downTime: 0,
				revive: 0,
				dodge: 0,
				dodgeLeft: 0,
				walk: 0,
				stepTimer: 0,
				vx: 0,
				vy: 0,
			});
			this.inputs[seat] = { mx: 0, my: 0, ax: 1, ay: 0 };
			this.pending[seat] = [];
			this.seenActions[seat] = {};
			return true;
		}
		removePlayer(seat) {
			this.state.players = this.state.players.filter((p) => p.seat !== seat);
			delete this.inputs[seat];
			delete this.pending[seat];
			delete this.seenActions[seat];
		}
		command(seat, cmd = {}) {
			const p = this.state.players.find((a) => a.seat === seat);
			if (!p) return;
			const prev = this.inputs[seat] || {},
				epoch = Number.isFinite(cmd.epoch) ? cmd.epoch : 0;
			if (prev.epoch !== undefined && epoch < prev.epoch) return;
			if (prev.epoch !== epoch) this.seenActions[seat] = {};
			const mx = C(Number(cmd.mx) || 0, -1, 1),
				my = C(Number(cmd.my) || 0, -1, 1),
				ax = C(Number(cmd.ax) || 0, -1, 1),
				ay = C(Number(cmd.ay) || 0, -1, 1);
			this.inputs[seat] = {
				mx,
				my,
				ax,
				ay,
				focus: !!cmd.focus,
				sprint: !!cmd.sprint,
				interactHeld: !!cmd.interactHeld,
				epoch,
				seq: cmd.seq || 0,
				at: this.state.time,
			};
			this.seenActions[seat] ||= {};
			const ids = this.seenActions[seat];
			this.pending[seat] ||= [];
			for (const name of ["fire", "interact", "dodge", "quiver"]) {
				const id = cmd[`${name}Id`];
				if (Number.isInteger(id) && id > 0 && id > (ids[name] || 0)) {
					ids[name] = id;
					this.pending[seat].push(name);
				}
			}
			if (typeof cmd.travel === "string" && cmd.travel !== ids.travel) {
				ids.travel = cmd.travel;
				this.pending[seat].push({ travel: cmd.travel });
			}
		}
		loadCave(index, { checkpoint = true } = {}) {
			const data = N.Content.caves[index];
			if (!data) throw Error("Unknown cave");
			const s = this.state;
			this.level = G.compile(data);
			s.caveIndex = index;
			s.mode = "cave";
			s.arrows = [];
			s.noise = [];
			s.explored = [];
			s.visible = [];
			s.arrowLit = [];
			s.triggered = [];
			s.transition = null;
			s.epoch++;
			this.noiseFields.clear();
			s.enemies = data.enemies.map((e) => {
				const def = BASE[e.type];
				if (!def) throw Error(`Unknown enemy ${e.type}`);
				return {
					...e,
					x: e.x * T,
					y: e.y * T,
					z: 0,
					r: def.radius || 5,
					hp: def.hp,
					maxHp: def.hp,
					state: "dormant",
					stateTime: 0,
					angle: Math.PI,
					homeX: e.x * T,
					homeY: e.y * T,
					targetX: e.x * T,
					targetY: e.y * T,
					invuln: 0,
					walk: 0,
					cueTimer: 2,
					attackSerial: 0,
					heard: null,
					aware: 0,
					phase: 0,
					mask: 0,
				};
			});
			s.pickups = [
				...data.supplies.map((a) => ({
					...a,
					x: a.x * T,
					y: a.y * T,
					amount:
						a.kind === "arrows"
							? Math.max(1, Math.round(a.amount * this.config.supplyMultiplier))
							: a.amount,
				})),
				...data.tools.map((a) => ({
					...a,
					x: a.x * T,
					y: a.y * T,
					amount: 1,
					tool: true,
				})),
			];
			s.players.forEach((p, i) => {
				const [x, y] = G.nearest(
					this.level,
					(data.spawn[0] + i * 0.6) * T,
					data.spawn[1] * T,
				);
				Object.assign(p, {
					x,
					y,
					hp: 3,
					downed: false,
					downTime: 0,
					draw: 0,
					recovery: 0,
					invuln: 2,
					revive: 0,
					state: "idle",
					dodgeLeft: 0,
				});
			});
			this.clearInputs();
			s.objective =
				data.reward === "dawn"
					? "Outwit the copper guardian. Claim the Dawn half."
					: data.reward === "dusk"
						? "Read the breath lanes. Claim the Dusk half."
						: `Find the ${data.reward}, then the guarded ladder.`;
			this.say(data.subtitle);
			this.updateVisibility();
			if (checkpoint) this.checkpoint(`${data.id}-entry`);
		}
		clearInputs() {
			for (const p of this.state.players) {
				this.inputs[p.seat] = {
					mx: 0,
					my: 0,
					ax: Math.cos(p.angle),
					ay: Math.sin(p.angle),
				};
				this.pending[p.seat] = [];
			}
		}
		checkpoint(id) {
			this.state.checkpointId = id;
			this.restartSnapshot = this.snapshot();
			this.persist();
		}
		persist() {
			if (this.saveCallback && !this.dev.isolated)
				this.saveCallback({
					state: this.snapshot(),
					restart: clone(this.restartSnapshot),
				});
		}
		restart({ death = false, assisted = false } = {}) {
			if (!this.restartSnapshot) return false;
			const s = this.state,
				reserves = s.party.reserves,
				stats = clone(s.stats),
				tick = s.tick,
				time = s.time,
				seats = s.players.map((p) => p.seat);
			this.applySnapshot(this.restartSnapshot);
			for (const p of [...this.state.players])
				if (!seats.includes(p.seat)) this.removePlayer(p.seat);
			for (const seat of seats)
				if (!this.state.players.some((p) => p.seat === seat))
					this.addPlayer(seat);
			this.state.party.reserves = reserves;
			this.state.stats = stats;
			this.state.tick = tick;
			this.state.time = time;
			this.state.epoch++;
			if (!death) this.state.stats.restarts++;
			if (assisted) this.state.stats.assisted = true;
			this.say(
				death
					? "A fresh ranger takes the trail. The reserve is spent."
					: "Section restored. Creatures, arrows and supplies return together.",
			);
			this.persist();
			return true;
		}
		snapshot() {
			return clone(this.state);
		}
		applySnapshot(snapshot) {
			if (
				!snapshot ||
				snapshot.version !== N.VERSION ||
				!Array.isArray(snapshot.players) ||
				snapshot.players.length > 2
			)
				throw Error("Incompatible expedition state");
			this.state = clone(snapshot);
			this.level = G.compile(N.Content.caves[this.state.caveIndex]);
			this.noiseFields.clear();
			this.clearInputs();
			this._visionAt = 0;
		}
		travel(id) {
			const s = this.state;
			if (s.mode !== "map") return false;
			const c = N.Content,
				node = c.landmarks.find((n) => n.id === id);
			if (!node) return false;
			const route = c.routes.find(
				(r) =>
					(r.from === s.mapNode && r.to === id) ||
					(r.to === s.mapNode && r.from === id),
			);
			if (id !== s.mapNode && !route) {
				this.say("Choose an adjoining landmark.");
				return false;
			}
			const require = node.requires || route?.requires;
			if (
				require &&
				!s.party.tools.includes(require) &&
				!s.party.halves.includes(require)
			) {
				this.say(
					`The ${require} opens this route. Find it below the mountain.`,
				);
				return false;
			}
			const from = s.mapNode;
			s.mapNode = id;
			this.event("travel", node.x, node.y, { tool: require, from, to: id });
			const index =
				typeof node.cave === "number"
					? node.cave
					: c.caves.findIndex((a) => a.id === node.cave);
			if (index >= 0 && !s.party.cleared.includes(c.caves[index].id)) {
				this.loadCave(index);
				return true;
			}
			if (node.kind === "ending" && s.party.halves.length === 2) {
				this.win();
				return true;
			}
			if (node.kind === "camp" || node.kind === "supply") {
				s.players.forEach((p) => {
					p.hp = 3;
				});
				if (!s.triggered.includes(`camp-${id}`) && node.kind === "supply") {
					s.party.ammo = Math.min(s.party.capacity, s.party.ammo + 4);
					s.triggered.push(`camp-${id}`);
				}
			}
			this.say(node.clue || node.name);
			this.checkpoint(`trail-${id}`);
			return true;
		}
		step(dt) {
			const s = this.state;
			if (!Number.isFinite(dt) || dt <= 0) return;
			dt = Math.min(dt, 0.05) * this.config.timeScale;
			s.time += dt;
			s.tick++;
			s.party.capacity = Math.round(this.config.capacity);
			if (s.mode === "victory" || s.mode === "defeat") return;
			if (s.mode === "map") {
				for (const p of s.players) {
					for (const action of this.pending[p.seat] || [])
						if (action.travel) this.travel(action.travel);
					this.pending[p.seat] = [];
				}
				return;
			}
			s.noise = s.noise.filter((n) => n.until > s.time);
			s.arrowLit = s.arrowLit.filter((a) => a.until > s.time);
			for (const p of s.players) this.updatePlayer(p, dt);
			if (s.mode !== "cave") return;
			this.updateArrows(dt);
			for (const e of s.enemies) this.updateEnemy(e, dt);
			this.updatePickups();
			this.updateRevives(dt);
			if (s.mode !== "cave") return;
			for (const tr of this.level.data.triggers || [])
				if (
					!s.triggered.includes(tr.id) &&
					s.players.some(
						(p) =>
							!p.downed &&
							Math.hypot(p.x - tr.x * T, p.y - tr.y * T) < (tr.radius || 2) * T,
					)
				) {
					s.triggered.push(tr.id);
					this.say(tr.text, 8);
					if (tr.objective) s.objective = tr.objective;
				}
			if (!this._visionAt || s.time >= this._visionAt) {
				this.updateVisibility();
				this._visionAt = s.time + 0.09;
			}
			if (s.transition) {
				s.transition.left -= dt;
				if (s.transition.left <= 0) this.exitCave();
			}
		}
		updatePlayer(p, dt) {
			const s = this.state;
			let input = this.inputs[p.seat] || {};
			if (input.at !== undefined && s.time - input.at > 0.65) input = {};
			const actions = this.pending[p.seat] || [];
			this.pending[p.seat] = [];
			p.invuln = Math.max(0, p.invuln - dt);
			p.hurt = Math.max(0, (p.hurt || 0) - dt);
			p.recovery = Math.max(0, p.recovery - dt);
			p.dodge = Math.max(0, p.dodge - dt);
			p.stateTime += dt;
			if (p.downed) {
				p.downTime -= dt;
				p.state = "downed";
				return;
			}
			if (Math.hypot(input.ax || 0, input.ay || 0) > 0.18)
				p.angle = Math.atan2(input.ay, input.ax);
			p.focus = !!input.focus;
			for (const action of actions) {
				if (action === "fire" && !p.draw && !p.recovery) {
					if (s.party.ammo > 0 || this.dev.infiniteAmmo) {
						p.draw = this.config.drawTime;
						p.state = "draw";
						this.noise("draw", p.x, p.y, 2);
					} else {
						p.recovery = 0.3;
						this.event("dry", p.x, p.y);
						this.say(
							"Empty quiver. Reclaim glowing shafts, or restart this section.",
							4,
						);
					}
				}
				if (action === "dodge" && p.dodge <= 0) {
					p.dodge = this.config.dodgeCooldown;
					p.dodgeLeft = 0.2;
					p.invuln = Math.max(p.invuln, 0.18);
					p.dodgeAngle =
						Math.hypot(input.mx || 0, input.my || 0) > 0.2
							? Math.atan2(input.my, input.mx)
							: p.angle;
					this.noise("quickstep", p.x, p.y, 10);
				}
				if (action === "interact") this.interact(p);
				if (action === "quiver")
					this.event("quiver", p.x, p.y, { count: s.party.ammo });
			}
			if (p.draw > 0) {
				p.draw -= dt;
				if (p.draw <= 0) {
					this.fire(p);
					p.draw = 0;
					p.recovery = this.config.recoveryTime;
				}
			}
			let mx = input.mx || 0,
				my = input.my || 0,
				len = Math.hypot(mx, my);
			if (len > 1) {
				mx /= len;
				my /= len;
				len = 1;
			}
			let speed =
				this.config.moveSpeed *
				(input.sprint ? this.config.sprintMultiplier : 1) *
				(p.focus ? this.config.focusMultiplier : 1);
			if (p.draw) speed *= 0.72;
			if (p.dodgeLeft > 0) {
				p.dodgeLeft -= dt;
				mx = Math.cos(p.dodgeAngle);
				my = Math.sin(p.dodgeAngle);
				speed = this.config.moveSpeed * 3.3;
				p.state = "quickstep";
			} else
				p.state = p.draw
					? "draw"
					: p.recovery
						? "release"
						: p.focus
							? "listen"
							: len > 0.1
								? input.sprint
									? "run"
									: "walk"
								: "idle";
			p.vx = mx * speed;
			p.vy = my * speed;
			const ox = p.x,
				oy = p.y;
			const others = s.players.filter((a) => a !== p && !a.downed),
				ex = p.x + p.vx * dt,
				ey = p.y + p.vy * dt;
			if (
				!others.some(
					(a) =>
						Math.hypot(ex - a.x, ey - a.y) > T * 14 &&
						Math.hypot(ex - a.x, ey - a.y) > Math.hypot(p.x - a.x, p.y - a.y),
				)
			)
				G.move(this.level, p, p.vx * dt, p.vy * dt, this.dev.noclip);
			const moved = Math.hypot(p.x - ox, p.y - oy);
			p.walk += moved * 0.14;
			s.stats.steps += moved / T;
			if (moved > 0.02) {
				p.stepTimer -= dt;
				if (p.stepTimer <= 0) {
					p.stepTimer = p.focus ? 0.8 : input.sprint ? 0.25 : 0.48;
					this.noise(
						input.sprint ? "run" : "step",
						p.x,
						p.y,
						p.focus ? 1.1 : input.sprint ? 9 : 3.5,
					);
				}
			}
		}
		fire(p) {
			const s = this.state;
			if (s.party.ammo <= 0 && !this.dev.infiniteAmmo) {
				this.event("dry", p.x, p.y);
				return;
			}
			if (!this.dev.infiniteAmmo) s.party.ammo--;
			s.stats.shots++;
			const origin = N.Art?.bowOrigin
				? N.Art.bowOrigin(p)
				: {
						x: p.x + Math.cos(p.angle) * 7.5,
						y: p.y + Math.sin(p.angle) * 7.5,
						z: 15,
					};
			let x = origin.x,
				y = origin.y;
			if (!this.level.walk(x, y)) {
				x = p.x;
				y = p.y;
			}
			s.arrows.push({
				id: this.id("arrow"),
				x,
				y,
				z: origin.z,
				vx: Math.cos(p.angle) * this.config.arrowSpeed,
				vy: Math.sin(p.angle) * this.config.arrowSpeed,
				bounces: 0,
				owner: p.seat,
				life: 2.8,
				age: 0,
				lastX: p.x,
				lastY: p.y,
			});
			this.noise("bow", p.x, p.y, 7);
		}
		settle(a, kind = "landing") {
			const s = this.state;
			if (a.spent) return;
			a.spent = true;
			const [x, y] = G.nearest(this.level, a.x, a.y);
			s.pickups.push({
				id: `shaft-${a.id}`,
				kind: "shaft",
				amount: 1,
				x,
				y,
				created: s.time,
			});
			this.noise(kind, x, y, kind === "armor" ? 10 : 5, "arrow");
		}
		updateArrows(dt) {
			const s = this.state;
			for (const a of s.arrows) {
				a.life -= dt;
				a.age += dt;
				let remaining = dt,
					contacts = 0;
				while (remaining > 1e-6 && !a.spent && contacts < 6) {
					const dx = a.vx * remaining,
						dy = a.vy * remaining,
						wall = G.sweep(this.level, a.x, a.y, dx, dy);
					let hit = wall ? { ...wall, kind: "wall" } : null;
					for (const e of s.enemies)
						if (e.hp > 0 && e.invuln <= 0) {
							const t = G.segmentCircle(a.x, a.y, dx, dy, e.x, e.y, e.r + 1);
							if (t !== null && (!hit || t < hit.t))
								hit = { t, kind: "enemy", e };
						}
					if (a.bounces > 0 && a.age > 0.1) {
						const p = s.players.find((p) => p.seat === a.owner && !p.downed);
						if (p) {
							const t = G.segmentCircle(a.x, a.y, dx, dy, p.x, p.y, p.r + 1);
							if (t !== null && (!hit || t < hit.t))
								hit = { t, kind: "self", p };
						}
					}
					if (!hit) {
						a.x += dx;
						a.y += dy;
						remaining = 0;
						break;
					}
					a.x += dx * hit.t;
					a.y += dy * hit.t;
					remaining *= 1 - hit.t;
					contacts++;
					if (hit.kind === "self") {
						this.damage(hit.p, 1, "your own bank shot");
						a.spent = true;
						this.event("hit", a.x, a.y);
						break;
					}
					if (hit.kind === "enemy") {
						const e = hit.e;
						let valid = true;
						if (e.type === "ooze") valid = false;
						if (e.type === "target" && a.bounces === 0) valid = false;
						const dot =
							(a.vx * Math.cos(e.angle) + a.vy * Math.sin(e.angle)) /
							Math.hypot(a.vx, a.vy);
						if (
							e.type === "guardian1" &&
							e.state !== "recovering" &&
							dot < -0.4
						)
							valid = false;
						if (e.type === "guardian2" && e.state !== "recovering")
							valid = false;
						if (!valid) {
							a.x -= a.vx * 0.035;
							a.y -= a.vy * 0.035;
							this.settle(a, e.type === "ooze" ? "ooze" : "armor");
							e.targetX = a.lastX;
							e.targetY = a.lastY;
							if (e.type !== "target") {
								e.state = "investigating";
								e.stateTime = 0;
							}
							continue;
						}
						a.spent = true;
						e.hp--;
						e.invuln = 0.3;
						e.state = e.hp <= 0 ? "defeated" : "stunned";
						e.stateTime = 0;
						e.hurt = 0.35;
						e.targetX = a.lastX;
						e.targetY = a.lastY;
						s.stats.wounds++;
						this.noise("hit", e.x, e.y, 9, "arrow");
						if (e.hp <= 0) this.defeated(e);
						continue;
					}
					if (a.bounces >= this.config.reflections) {
						a.x += hit.nx * 0.4;
						a.y += hit.ny * 0.4;
						this.settle(a);
						break;
					}
					const dot = a.vx * hit.nx + a.vy * hit.ny;
					a.vx = (a.vx - 2 * dot * hit.nx) * 0.76;
					a.vy = (a.vy - 2 * dot * hit.ny) * 0.76;
					a.bounces++;
					s.stats.banks++;
					a.x += hit.nx * 0.12;
					a.y += hit.ny * 0.12;
					this.noise("bank", a.x, a.y, 13, "arrow");
				}
				if (!a.spent) {
					a.lastX = a.x;
					a.lastY = a.y;
					this.illuminate(a.x, a.y);
					if (a.life <= 0 || Math.hypot(a.vx, a.vy) < 30 || contacts >= 6)
						this.settle(a);
				}
			}
			s.arrows = s.arrows.filter((a) => !a.spent);
		}
		illuminate(x, y) {
			const s = this.state,
				[cx, cy] = G.cell(x, y);
			for (let oy = -2; oy <= 2; oy++)
				for (let ox = -2; ox <= 2; ox++) {
					const a = cx + ox,
						b = cy + oy;
					if (
						!this.level.walkCell(a, b) ||
						ox * ox + oy * oy > 5 ||
						!G.los(this.level, x, y, (a + 0.5) * T, (b + 0.5) * T)
					)
						continue;
					const index = b * this.level.w + a,
						existing = s.arrowLit.find((v) => v.cell === index);
					if (existing) existing.until = s.time + 0.28;
					else s.arrowLit.push({ cell: index, until: s.time + 0.28 });
				}
		}
		defeated(e) {
			const s = this.state;
			s.stats.kills++;
			this.event("defeat", e.x, e.y, { type: e.type });
			if (e.type === "target") {
				this.say(
					"A true bank! Stone turns the shaft; the corner hides the archer.",
				);
				s.objective = "Follow the wingbeats. Find the folding boat.";
			}
			if (e.type.startsWith("guardian")) {
				const half = e.type === "guardian1" ? "dawn" : "dusk";
				if (!s.party.halves.includes(half))
					s.pickups.push({
						id: `relic-${half}`,
						kind: half,
						tool: true,
						x: e.x,
						y: e.y,
						amount: 1,
					});
				this.say(
					half === "dawn"
						? "The copper wing yields. Take the Dawn half."
						: "The breath falls silent. Take the Dusk half.",
				);
			}
			if (e.stolen) {
				s.pickups.push({
					id: this.id("stash"),
					kind: "shaft",
					x: e.homeX,
					y: e.homeY,
					amount: e.stolen,
					stash: true,
				});
				e.stolen = 0;
			}
		}
		updateEnemy(e, dt) {
			const s = this.state,
				def = BASE[e.type];
			e.stateTime += dt;
			e.invuln = Math.max(0, e.invuln - dt);
			e.hurt = Math.max(0, (e.hurt || 0) - dt);
			if (e.hp <= 0 || e.type === "target") return;
			const players = s.players.filter((p) => !p.downed);
			if (!players.length) return;
			const p = players.reduce((a, b) =>
					Math.hypot(a.x - e.x, a.y - e.y) < Math.hypot(b.x - e.x, b.y - e.y)
						? a
						: b,
				),
				dist = Math.hypot(p.x - e.x, p.y - e.y),
				sees =
					dist < T * (def.vision || 5) && G.los(this.level, e.x, e.y, p.x, p.y);
			if (sees) e.aware += dt;
			else e.aware = 0;
			e.cueTimer -= dt;
			if (e.cueTimer <= 0) {
				e.cueTimer = e.type === "bat" ? 3 : 4.5;
				this.noise(
					`creature-${e.type}`,
					e.x,
					e.y,
					e.type.startsWith("guardian") ? 16 : 8,
					"creature",
				);
				if (e.type === "bat") e.mask = 1.2;
			}
			e.mask = Math.max(0, (e.mask || 0) - dt);
			if (e.state === "stunned") {
				if (e.stateTime > 0.38) {
					e.state = e.type.startsWith("guardian") ? "windup" : "investigating";
					e.stateTime = 0;
				}
				return;
			}
			if (e.state === "windup") {
				const wind = e.type.startsWith("guardian")
					? this.config.guardianWindup
					: def.wind;
				if (e.stateTime >= wind) {
					e.state = "attacking";
					e.stateTime = 0;
					e.attackSerial++;
					e.attackHits = [];
					this.noise(
						e.type === "guardian2" || e.type === "drake" ? "breath" : "rush",
						e.x,
						e.y,
						13,
						"creature",
					);
				}
				return;
			}
			if (e.state === "attacking") {
				if (e.type === "guardian2" || e.type === "drake") {
					for (const hero of players) {
						const dx = hero.x - e.x,
							dy = hero.y - e.y,
							along = dx * Math.cos(e.angle) + dy * Math.sin(e.angle),
							across = Math.abs(
								-dx * Math.sin(e.angle) + dy * Math.cos(e.angle),
							);
						if (
							along > -6 &&
							along < def.range &&
							across < (e.type === "guardian2" ? 15 : 11) &&
							G.los(this.level, e.x, e.y, hero.x, hero.y) &&
							!e.attackHits.includes(hero.seat)
						) {
							this.damage(hero, this.config.damage, e.type);
							e.attackHits.push(hero.seat);
						}
					}
				} else {
					G.move(
						this.level,
						e,
						Math.cos(e.angle) * def.speed * 3.3 * dt,
						Math.sin(e.angle) * def.speed * 3.3 * dt,
					);
					for (const hero of players)
						if (
							Math.hypot(hero.x - e.x, hero.y - e.y) < e.r + hero.r + 4 &&
							!e.attackHits.includes(hero.seat)
						) {
							this.damage(hero, this.config.damage, e.type);
							e.attackHits.push(hero.seat);
						}
				}
				if (e.stateTime > (def.attackTime || 0.36)) {
					e.state = "recovering";
					e.stateTime = 0;
					e.phase++;
				}
				return;
			}
			if (e.state === "recovering") {
				const recovery = e.type.startsWith("guardian")
					? this.config.guardianRecovery
					: def.recovery || 0.9;
				if (e.stateTime > recovery) {
					e.state = "investigating";
					e.stateTime = 0;
				}
				return;
			}
			let heard = null;
			for (let i = s.noise.length - 1; i >= 0; i--) {
				const n = s.noise[i];
				if (
					n.source === "creature" ||
					n.id === e.heard ||
					s.time - n.time > 1.4
				)
					continue;
				let field = this.noiseFields.get(n.id);
				if (!field) {
					field = G.field(this.level, n.x, n.y);
					this.noiseFields.set(n.id, field);
				}
				const [cx, cy] = G.cell(e.x, e.y),
					d = field[cy * this.level.w + cx];
				if (
					d >= 0 &&
					d <= Math.min(def.hearing, n.loudness) * this.config.hearing
				) {
					heard = n;
					break;
				}
			}
			if (heard) {
				e.heard = heard.id;
				e.targetX = heard.x;
				e.targetY = heard.y;
				if (e.state === "dormant") {
					this.noise(`alert-${e.type}`, e.x, e.y, 8, "creature");
					e.stateTime = 0;
				}
				e.state = "investigating";
			}
			if (sees && e.type !== "ooze") {
				e.targetX = p.x;
				e.targetY = p.y;
				if (e.state === "dormant") {
					e.state = "alert";
					e.stateTime = 0;
					this.noise(`alert-${e.type}`, e.x, e.y, 8, "creature");
				}
			}
			if (e.type === "spider" && !e.stolen) {
				const shaft = s.pickups.find(
					(a) =>
						a.kind === "shaft" &&
						!a.stash &&
						Math.hypot(a.x - e.x, a.y - e.y) < T * 5,
				);
				if (shaft) {
					e.targetX = shaft.x;
					e.targetY = shaft.y;
					e.state = "investigating";
					if (Math.hypot(shaft.x - e.x, shaft.y - e.y) < 10) {
						e.stolen = shaft.amount;
						shaft.amount = 0;
						e.targetX = e.homeX;
						e.targetY = e.homeY;
						this.event("theft", e.x, e.y);
						this.say(
							"The spider took a shaft. Its silver trail leads to the web stash.",
							4,
						);
					}
				}
			}
			if (e.stolen && Math.hypot(e.x - e.homeX, e.y - e.homeY) < 14) {
				s.pickups.push({
					id: this.id("web-shaft"),
					kind: "shaft",
					x: e.homeX + 12,
					y: e.homeY + 6,
					amount: e.stolen,
					stash: true,
				});
				e.stolen = 0;
			}
			if (e.type === "ooze" && dist < 22 && e.aware > 0.6) {
				this.damage(p, this.config.damage, "ooze");
			}
			if (
				sees &&
				e.aware > 0.7 &&
				dist < def.range &&
				e.type !== "ooze" &&
				(e.state !== "alert" || e.stateTime > 0.7)
			) {
				e.angle = Math.atan2(p.y - e.y, p.x - e.x);
				if (e.type === "guardian2" && e.phase % 2) e.angle += 0.3;
				e.state = "windup";
				e.stateTime = 0;
				this.event("tell", e.x, e.y, { type: e.type });
				return;
			}
			if (e.state === "dormant" || e.state === "alert") return;
			const dx = e.targetX - e.x,
				dy = e.targetY - e.y;
			if (Math.hypot(dx, dy) < 8) {
				e.state = "dormant";
				return;
			}
			if (!e.pathAt || e.pathAt <= s.time) {
				e.path = G.path(this.level, e.x, e.y, e.targetX, e.targetY);
				e.pathAt = s.time + 0.5;
			}
			let target = [e.targetX, e.targetY];
			if (!G.los(this.level, e.x, e.y, ...target))
				target = e.path?.[0] || target;
			if (
				e.path?.length &&
				Math.hypot(e.path[0][0] - e.x, e.path[0][1] - e.y) < 5
			)
				e.path.shift();
			const angle = Math.atan2(target[1] - e.y, target[0] - e.x),
				turn = e.type.startsWith("guardian") ? dt * 0.9 : dt * 8,
				diff = Math.atan2(Math.sin(angle - e.angle), Math.cos(angle - e.angle));
			e.angle += C(diff, -turn, turn);
			const speed = def.speed * this.config.enemySpeed;
			G.move(
				this.level,
				e,
				Math.cos(angle) * speed * dt,
				Math.sin(angle) * speed * dt,
			);
			e.walk += dt * speed * 0.14;
		}
		damage(p, amount, source) {
			if (p.downed || p.invuln > 0 || this.dev.infiniteHealth) return false;
			p.hp = Math.max(0, p.hp - amount);
			p.invuln = 1.4;
			p.hurt = 0.28;
			p.draw = 0;
			p.state = "hurt";
			p.stateTime = 0;
			this.event("hurt", p.x, p.y, { source, seat: p.seat });
			if (p.hp === 0) {
				p.downed = true;
				p.downTime = 12;
				p.state = "downed";
				this.event("down", p.x, p.y, { seat: p.seat });
			}
			return true;
		}
		updateRevives(dt) {
			const s = this.state,
				down = s.players.filter((p) => p.downed);
			if (down.length && down.length === s.players.length) {
				this.spendReserve(true);
				return;
			}
			for (const p of down) {
				const helper = s.players.find(
					(a) =>
						!a.downed &&
						Math.hypot(a.x - p.x, a.y - p.y) < 25 &&
						this.inputs[a.seat]?.interactHeld &&
						s.time - (this.inputs[a.seat].at ?? -999) < 0.65,
				);
				p.revive = helper ? p.revive + dt : Math.max(0, p.revive - dt * 0.5);
				if (p.revive >= 1.8) {
					p.downed = false;
					p.hp = 2;
					p.invuln = 3;
					p.revive = 0;
					s.stats.revives++;
					this.event("revive", p.x, p.y);
				} else if (p.downTime <= 0) {
					if (!this.spendReserve(false)) return;
					const anchor = s.players.find((a) => !a.downed) || {
						x: this.level.data.spawn[0] * T,
						y: this.level.data.spawn[1] * T,
					};
					const [x, y] = G.nearest(this.level, anchor.x + 12, anchor.y);
					Object.assign(p, {
						x,
						y,
						downed: false,
						hp: 3,
						invuln: 3,
						revive: 0,
					});
				}
			}
		}
		spendReserve(wipe) {
			const s = this.state;
			s.party.reserves = Math.max(0, s.party.reserves - 1);
			s.stats.deaths++;
			if (s.party.reserves <= 0) {
				s.mode = "defeat";
				this.clearInputs();
				this.event("loss");
				this.persist();
				return false;
			}
			if (wipe) this.restart({ death: true });
			else this.persist();
			return true;
		}
		updatePickups() {
			const s = this.state;
			for (const a of s.pickups) {
				if (a.amount <= 0) continue;
				const p = s.players.find(
					(p) => !p.downed && Math.hypot(p.x - a.x, p.y - a.y) < 14,
				);
				if (!p) continue;
				if (a.kind === "arrows" || a.kind === "shaft") {
					const amount = Math.min(
						a.amount,
						Math.max(0, s.party.capacity - s.party.ammo),
					);
					if (amount <= 0) continue;
					s.party.ammo += amount;
					a.amount -= amount;
					if (a.kind === "shaft") s.stats.recovered += amount;
					this.noise("pickup", a.x, a.y, 2);
					p.state = "pickup";
				} else if (a.kind === "heart") {
					if (p.hp < 3) {
						p.hp = 3;
						a.amount = 0;
						this.event("heal", a.x, a.y);
					}
				} else if (a.kind === "treasure") {
					s.party.treasure += a.amount;
					a.amount = 0;
					this.event("treasure", a.x, a.y);
				} else if (a.tool) {
					if (
						(a.kind === "dawn" || a.kind === "dusk") &&
						s.enemies.some((e) => e.type.startsWith("guardian") && e.hp > 0)
					)
						continue;
					const half = a.kind === "dawn" || a.kind === "dusk",
						inventory = half ? s.party.halves : s.party.tools;
					if (!inventory.includes(a.kind)) {
						inventory.push(a.kind);
						s.stats.tools++;
						this.event("tool", a.x, a.y, { tool: a.kind });
						this.say(
							half
								? `${a.kind === "dawn" ? "Dawn" : "Dusk"} half claimed. The crown remembers the light.`
								: `The ${a.kind} is yours. Its wilderness route is open.`,
						);
					}
					a.amount = 0;
				}
			}
			s.pickups = s.pickups.filter((a) => a.amount > 0);
		}
		interaction(p) {
			const s = this.state;
			if (s.mode !== "cave") return null;
			const down = s.players.find(
				(a) => a.downed && a !== p && Math.hypot(a.x - p.x, a.y - p.y) < 25,
			);
			if (down)
				return {
					kind: "revive",
					label: "Hold to revive",
					progress: down.revive / 1.8,
				};
			if (
				Math.hypot(
					p.x - this.level.data.exit[0] * T,
					p.y - this.level.data.exit[1] * T,
				) < 30
			) {
				const reward = this.level.data.reward,
					have =
						s.party.tools.includes(reward) || s.party.halves.includes(reward),
					guards = this.level.data.guardIds.some((id) =>
						s.enemies.some((e) => e.id === id && e.hp > 0),
					);
				return {
					kind: "exit",
					label: !have
						? `Find the ${reward} before leaving`
						: guards
							? "The ladder is still guarded"
							: "Climb to daylight",
					disabled: !have || guards,
				};
			}
			return null;
		}
		interact(p) {
			const s = this.state,
				context = this.interaction(p);
			if (!context) return;
			if (context.disabled) {
				this.say(context.label);
				return;
			}
			if (context.kind === "exit") {
				const far = s.players.filter(
					(a) => !a.downed && Math.hypot(a.x - p.x, a.y - p.y) > T * 6,
				);
				if (far.length) {
					this.say("Gather by the ladder. Your companion is still exploring.");
					return;
				}
				if (!s.transition) {
					s.transition = { left: 1.1 };
					p.state = "climb";
					this.event("ladder", p.x, p.y);
				}
			}
		}
		exitCave() {
			const s = this.state,
				data = this.level.data;
			s.transition = null;
			if (!s.party.cleared.includes(data.id)) s.party.cleared.push(data.id);
			if (s.caveIndex === 3) {
				this.loadCave(4);
				return;
			}
			if (s.caveIndex === 4) {
				this.win();
				return;
			}
			s.mode = "map";
			s.arrows = [];
			s.noise = [];
			s.mapNode =
				N.Content.landmarks.find(
					(n) => n.cave === s.caveIndex || n.cave === data.id,
				)?.id || s.mapNode;
			this.say(
				`Daylight! The ${data.reward} opens the next trail. Cleared caves are now shortcuts.`,
				8,
			);
			this.checkpoint(`trail-${data.reward}`);
			this.event("emerge", 0, 0, { tool: data.reward });
		}
		win() {
			const s = this.state;
			if (s.mode === "victory") return;
			s.mode = "victory";
			s.objective =
				"The Crown of Clear Skies is whole. Daylight has found its way home.";
			this.event("victory");
			this.clearInputs();
			this.persist();
		}
		updateVisibility() {
			const s = this.state,
				l = this.level,
				explored = new Set(s.explored),
				visible = new Set();
			for (const p of s.players)
				if (!p.downed) {
					const [cx, cy] = G.cell(p.x, p.y),
						r = this.config.vision;
					for (let y = Math.floor(cy - r); y <= cy + r; y++)
						for (let x = Math.floor(cx - r); x <= cx + r; x++)
							if (
								x >= 0 &&
								y >= 0 &&
								x < l.w &&
								y < l.h &&
								Math.hypot(x - cx, y - cy) <= r
							) {
								const wx = (x + 0.5) * T,
									wy = (y + 0.5) * T;
								if (
									G.los(l, p.x, p.y, wx, wy) ||
									(!l.walkCell(x, y) &&
										G.los(
											l,
											p.x,
											p.y,
											wx + (p.x - wx) * 0.08,
											wy + (p.y - wy) * 0.08,
										))
								) {
									visible.add(y * l.w + x);
									explored.add(y * l.w + x);
								}
							}
				}
			for (const index of [...visible]) {
				const x = index % l.w,
					y = Math.floor(index / l.w);
				if (!l.walkCell(x, y)) continue;
				for (const [a, b] of [
					[x + 1, y],
					[x - 1, y],
					[x, y + 1],
					[x, y - 1],
				])
					if (a >= 0 && b >= 0 && a < l.w && b < l.h && !l.walkCell(a, b)) {
						visible.add(b * l.w + a);
						explored.add(b * l.w + a);
					}
			}
			for (const a of s.arrowLit) if (a.until > s.time) visible.add(a.cell);
			s.visible = [...visible];
			s.explored = [...explored];
		}
		visible(a) {
			const [x, y] = G.cell(a.x, a.y);
			return (
				this.dev.reveal || this.state.visible.includes(y * this.level.w + x)
			);
		}
		soundClues(p) {
			if (!p) return [];
			const s = this.state,
				[cx, cy] = G.cell(p.x, p.y),
				result = [];
			for (let i = s.noise.length - 1; i >= 0; i--) {
				const n = s.noise[i];
				if (n.source !== "creature" || s.time - n.time > 2.5) continue;
				let f = this.noiseFields.get(n.id);
				if (!f) {
					f = G.field(this.level, n.x, n.y);
					this.noiseFields.set(n.id, f);
				}
				const d = f[cy * this.level.w + cx];
				if (d < 0 || d > (p.focus ? 18 : 12)) continue;
				let best = null;
				for (const [x, y] of [
					[cx + 1, cy],
					[cx - 1, cy],
					[cx, cy + 1],
					[cx, cy - 1],
				])
					if (
						this.level.walkCell(x, y) &&
						f[y * this.level.w + x] >= 0 &&
						f[y * this.level.w + x] < d
					) {
						best = [x - cx, y - cy];
						break;
					}
				if (best) {
					result.push({ kind: n.kind, dx: best[0], dy: best[1], near: d < 5 });
					if (result.length >= 2) break;
				}
			}
			return result;
		}
		assist() {
			this.state.stats.assisted = true;
		}
		tune(key, value) {
			if (!(key in N.DEFAULTS) || !Number.isFinite(value)) return;
			const spec = N.TUNABLES.find((a) => a[1] === key);
			const previous = this.config[key];
			this.config[key] = spec ? C(value, spec[3], spec[4]) : value;
			if (key === "supplyMultiplier" && previous !== this.config[key])
				for (const pile of this.state.pickups)
					if (pile.kind === "arrows" && pile.amount > 0)
						pile.amount = Math.max(
							1,
							Math.round((pile.amount * this.config[key]) / previous),
						);
			this.assist();
		}
		resetTuning() {
			if (this.config.supplyMultiplier !== N.DEFAULTS.supplyMultiplier)
				this.tune("supplyMultiplier", N.DEFAULTS.supplyMultiplier);
			Object.assign(this.config, N.DEFAULTS);
		}
		spawn(type) {
			if (!BASE[type]) return;
			const p = this.state.players[0];
			if (!p) return;
			const [x, y] = G.nearest(this.level, p.x + T * 3, p.y);
			const d = BASE[type];
			this.state.enemies.push({
				id: this.id("spawn"),
				type,
				x,
				y,
				z: 0,
				r: 6,
				hp: d.hp,
				maxHp: d.hp,
				state: "dormant",
				stateTime: 0,
				angle: Math.PI,
				homeX: x,
				homeY: y,
				targetX: x,
				targetY: y,
				invuln: 0,
				walk: 0,
				cueTimer: 2,
				aware: 0,
				phase: 0,
			});
			this.assist();
		}
	}
	N.Sim = Sim;
	N.EnemyDefaults = BASE;
})();
