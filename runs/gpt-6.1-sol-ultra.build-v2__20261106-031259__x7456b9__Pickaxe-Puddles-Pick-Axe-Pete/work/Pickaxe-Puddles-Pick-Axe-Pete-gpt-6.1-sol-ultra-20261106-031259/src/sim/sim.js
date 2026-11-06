(() => {
	const PP = globalThis.PP,
		E = globalThis.My3D2dge,
		clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
	const empty = () => ({
		mx: 0,
		my: 0,
		jump: false,
		jumpHeld: false,
		chop: false,
		redirect: false,
		interact: false,
		interactHeld: false,
		aim: 0,
	});
	class Sim {
		constructor({
			seed = 1982,
			seats = [{ id: 1, name: "Puddles", color: "#ffc46b" }],
			online = false,
			chamber = 0,
			tuning = {},
		} = {}) {
			this.seed = seed;
			this.rngState = this.hashSeed(seed);
			this.online = online;
			this.tuning = PP.validTuning(tuning);
			this.tick = 0;
			this.time = 0;
			this.epoch = 1;
			this.nextId = 1;
			this.nextEvent = 1;
			this.events = [];
			this.eventLog = [];
			this.score = 0;
			this.banked = 0;
			this.bestChain = 0;
			this.chamber = chamber;
			this.route = 0;
			this.keyOwner = null;
			this.completed = null;
			this.developer = false;
			this.invincible = false;
			this.attract = false;
			this.miners = seats.map((s) => this.makeMiner(s));
			this.enter(chamber);
		}
		hashSeed(seed) {
			let n = 2166136261;
			for (const c of String(seed))
				n = Math.imul(n ^ c.charCodeAt(0), 16777619);
			return n >>> 0;
		}
		random() {
			this.rngState += 0x6d2b79f5;
			let t = this.rngState;
			this.rngState >>>= 0;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		}
		id(prefix) {
			return `${this.epoch}:${prefix}:${this.nextId++}`;
		}
		emit(type, data = {}) {
			if (this._restoring) return null;
			const evt = {
				id: `${this.epoch}:e:${this.nextEvent++}`,
				type,
				tick: this.tick,
				...data,
			};
			this.events.push(evt);
			if (this.events.length > 48) this.events.shift();
			this.eventLog.push(evt);
			if (this.eventLog.length > 4000) this.eventLog.shift();
			return evt;
		}
		makeMiner(s) {
			return {
				id: s.id,
				name: s.name || "Puddles",
				color: s.color || "#ffc46b",
				hero: new E.Platformer({ x: 104, z: 16, w: 10, h: 25, crouch: true }),
				health: 3,
				tool: this.tuning.durability,
				downed: false,
				facing: 1,
				action: null,
				actionT: 0,
				invuln: 3,
				jam: 0,
				rescue: 0,
				jumpBuffer: 0,
				stats: {
					ore: 0,
					redirects: 0,
					dodges: 0,
					rescues: 0,
					keys: 0,
					tools: 0,
				},
				attack: new E.Attack("overhead", {
					wind: 0.07,
					active: 0.1,
					recover: 0.15,
					reach: 28,
					a0: 1.7,
					a1: -1.4,
					z0: 23,
					z1: 8,
					hitAt: 0,
				}),
			};
		}
		enter(index, route = this.route) {
			this.chamber = clamp(index, 0, PP.CHAMBERS.length - 1);
			this.route = route;
			this.epoch++;
			this.room = PP.makeRoom(this.chamber, route);
			this.level = PP.makeLevel(this.room);
			this.rocks = [];
			this.pickups = [];
			this.pending = [];
			this.contacts = [];
			this.keyOwner = null;
			this.chamberTime = 0;
			this.transition = 1.7;
			this.director = {
				spawnIn: 5,
				pairIn: 10,
				emptyTool: 0,
				noKey: 0,
				deckAt: 0,
				kills: 0,
				collisions: 0,
				redirects: 0,
				wave: this.room.finale ? 1 : 0,
				waveProgress: 0,
				waveAt: 0,
				keyReady: false,
				supplyCount: 0,
				pressure: 0,
			};
			this.tutorial = {
				move: false,
				jump: false,
				duck: false,
				chop: false,
				redirect: false,
				break: false,
				pick: false,
				key: false,
				ladder: false,
				jam: false,
			};
			this.roomSolids = [];
			this._ladderVersion = "";
			this.miners.forEach((m, i) => {
				m.hero = new E.Platformer({
					x: 104 + i * 32,
					z: 16,
					w: 10,
					h: 25,
					crouch: true,
				});
				m.health = 3;
				m.tool = this.tuning.durability;
				m.downed = false;
				m.invuln = 3;
				m.jam = 0;
				m.rescue = 0;
				m.action = null;
				m.actionT = 0;
				m.jumpBuffer = 0;
				m.attack.cancel();
			});
			this.updateLadders(true);
			this.emit("chamber", { chamber: this.chamber, text: this.room.name });
			this.checkpoint = {
				chamber: this.chamber,
				score: this.banked,
				route: this.route,
			};
		}
		setTuning(key, value) {
			if (!(key in PP.TUNING)) return false;
			this.tuning = PP.validTuning({ ...this.tuning, [key]: Number(value) });
			return true;
		}
		updateLadders(force = false) {
			for (const l of this.room.ladders) {
				if (!l.temporary) continue;
				const t = (this.chamberTime + l.offset) % this.tuning.ladderPeriod,
					p = this.tuning.ladderPeriod;
				let state =
					t < 2
						? "forming"
						: t < p * 0.65
							? "usable"
							: t < p * 0.78
								? "warning"
								: "expired";
				const occupied = this.miners.some(
					(m) =>
						!m.downed &&
						m.hero.climbing &&
						Math.abs(m.hero.x - l.x) < 12 &&
						m.hero.z > l.z0 - 4 &&
						m.hero.z < l.z1,
				);
				if (occupied && (state === "expired" || state === "forming"))
					state = "warning";
				if (l.state !== state && state === "warning")
					this.emit("ladderWarning", {
						x: l.x,
						z: l.z0,
						text: "SHORTCUT FADING · main ladders stay",
					});
				l.state = state;
			}
			const version = this.room.ladders.map((l) => l.state).join(",");
			if (!force && version === this._ladderVersion) return;
			this._ladderVersion = version;
			this.level = PP.makeLevel(this.room);
			this.roomSolids = [];
			for (const l of this.room.ladders)
				if (l.state === "usable" || l.state === "warning") {
					for (let cz = l.z0 / 16; cz < l.z1 / 16; cz++)
						this.level.set(Math.floor(l.x / 16), cz, 2);
					// Ladder tiles may cross a one-way floor; independent native one-way ledges preserve it.
					for (const f of this.room.floors)
						if (
							f.z > l.z0 &&
							f.z <= l.z1 &&
							!f.gaps.some(([a, b]) => l.x >= a && l.x < b)
						)
							this.roomSolids.push({
								x: l.x,
								z: f.z - 2,
								w: 16,
								h: 2,
								oneway: true,
								vx: 0,
								vz: 0,
							});
				}
		}
		floorBelow(x, z) {
			let result = null;
			for (const f of this.room.floors)
				if (f.z <= z + 0.1 && !f.gaps.some(([a, b]) => x >= a && x < b))
					result = f.z;
			return result;
		}
		spawnRock({
			x,
			z,
			vx,
			vz = 0,
			kind = "normal",
			source = null,
			scripted = false,
		} = {}) {
			if (this.rocks.length >= 18) return null;
			const r = {
				id: this.id("r"),
				x: x ?? 24,
				z: z ?? 27,
				vx: vx ?? this.tuning.rockSpeed,
				vz,
				r: kind === "heavy" ? 12 : kind === "bounce" ? 8 : 9,
				kind,
				hp: kind === "heavy" ? 3 : 1,
				redirected: null,
				grace: 0,
				age: 0,
				spin: 0,
				dead: false,
				evasions: [],
				near: [],
				source,
				scripted,
			};
			this.rocks.push(r);
			this.emit("rock", { x: r.x, z: r.z, kind, rock: r.id });
			return r;
		}
		spawnPickup(kind, x, z) {
			if (
				kind === "key" &&
				(this.keyOwner !== null || this.pickups.some((p) => p.kind === "key"))
			)
				return null;
			const p = {
				id: this.id(kind),
				kind,
				x: clamp(x, 36, 540),
				z,
				baseX: clamp(x, 36, 540),
				ttl:
					kind === "key"
						? this.tuning.keyLifetime
						: kind === "pick"
							? this.tuning.pickLifetime
							: 15,
				age: 0,
			};
			this.pickups.push(p);
			this.emit(
				kind === "key" ? "keyRise" : kind === "pick" ? "pickFall" : "goldDrop",
				{
					x: p.x,
					z,
					text:
						kind === "key"
							? "KEY RISING · catch it, then choose a door"
							: kind === "pick"
								? "FRESH PICK ↓ lower landing"
								: "+ GOLD",
				},
			);
			return p;
		}
		schedulePair(reason = "seam") {
			const z =
				reason === "tool"
					? 16
					: this.room.floors[Math.min(this.chamber + 1, this.room.tiers - 1)].z;
			const x = [296, 280, 264][this.room.route] || 296;
			this.spawnRock({ x: x - 68, z: z + 10, vx: 48, scripted: true });
			this.spawnRock({ x: x + 68, z: z + 10, vx: -48, scripted: true });
			this.director.supplyCount++;
			this.emit("supplyWarning", {
				x,
				z,
				text:
					reason === "tool"
						? "SUPPLY SEAM · two rocks, one fresh pick"
						: "COLLISION SEAM · make the mine work for you",
			});
			this.pending.push({
				kind: "pairReward",
				at: this.chamberTime + 2.1,
				reason,
				x,
				z,
			});
		}
		scoreEvent(points, m = null, kind = "score") {
			this.score += points;
			if (m)
				this.emit(kind, {
					miner: m.id,
					x: m.hero.x,
					z: m.hero.z + 28,
					points,
					text: `+${points}`,
				});
		}
		spend(m) {
			m.tool = Math.max(0, m.tool - 1);
			if (m.tool === 1)
				this.emit("wear", {
					miner: m.id,
					x: m.hero.x,
					z: m.hero.z + 25,
					text: "LAST CONTACT!",
				});
			if (m.tool === 0) {
				this.tutorial.break = true;
				this.emit("toolBreak", {
					miner: m.id,
					x: m.hero.x,
					z: m.hero.z + 20,
					text: "PICK BROKE! · jump, duck, find a falling pick",
				});
			}
		}
		destroy(r, m = null, collision = false) {
			if (r.dead) return;
			r.dead = true;
			this.director.kills++;
			this.director.waveProgress++;
			this.director.pressure = Math.min(
				1,
				this.director.pressure + this.tuning.pressure,
			);
			if (m) {
				m.stats.ore++;
				this.scoreEvent(3, m, "oreScore");
			}
			this.emit("shatter", {
				x: r.x,
				z: r.z,
				kind: r.kind,
				miner: m?.id,
				collision,
			});
		}
		actionContacts(m) {
			if (!m.attack.active || m.tool <= 0) return;
			for (const r of this.rocks) {
				if (r.dead || m.attack.hit.has(r.id)) continue;
				const dx = (r.x - m.hero.x) * m.facing,
					dz = r.z - (m.hero.z + 13);
				if (dx < -9 || dx > 37 + r.r || Math.abs(dz) > 23 + r.r) continue;
				m.attack.hit.add(r.id);
				this.spend(m);
				if (m.action === "redirect") {
					r.vx = m.facing * this.tuning.rockSpeed * 1.8;
					r.vz = m.aim < -0.25 ? 200 : m.aim > 0.25 ? -30 : 105;
					r.redirected = m.id;
					r.grace = 0.38;
					r.hp = Math.max(1, r.hp - 1);
					this.director.redirects++;
					m.stats.redirects++;
					this.tutorial.redirect = true;
					this.emit("redirect", {
						x: r.x,
						z: r.z,
						miner: m.id,
						aim: m.aim,
						text:
							m.aim < -0.25
								? "HIGH RICOCHET ↗"
								: m.aim > 0.25
									? "LOW RICOCHET →"
									: "RICOCHET!",
					});
				} else {
					this.tutorial.chop = true;
					r.hp--;
					this.emit("chopHit", { x: r.x, z: r.z, miner: m.id });
					if (r.hp <= 0) this.destroy(r, m);
					else {
						r.vx *= -0.6;
						r.vz = 45;
						r.grace = 0.2;
						this.emit("heavyCrack", {
							x: r.x,
							z: r.z,
							text: `${r.hp} CONTACTS LEFT`,
						});
					}
				}
				if (!m.tool) break;
			}
		}
		rockPairs() {
			const active = new Set();
			for (let i = 0; i < this.rocks.length; i++)
				for (let j = i + 1; j < this.rocks.length; j++) {
					const a = this.rocks[i],
						b = this.rocks[j];
					if (a.dead || b.dead) continue;
					if (Math.hypot(a.x - b.x, a.z - b.z) > a.r + b.r) continue;
					const pair = `${a.id}|${b.id}`;
					active.add(pair);
					if (this.contacts.includes(pair)) continue;
					const x = (a.x + b.x) / 2,
						z = (a.z + b.z) / 2,
						redirected = a.redirected !== null || b.redirected !== null;
					if (!redirected && (a.kind === "heavy" || b.kind === "heavy")) {
						// Bands mean reinforced ore: a drifting collision is not a trick shot.
						// Heavy ore survives until three chops or a deliberately redirected collision.
						for (const [rock, other] of [
							[a, b],
							[b, a],
						]) {
							if (rock.kind !== "heavy") this.destroy(rock, null, true);
							else {
								rock.vx =
									(rock.x <= other.x ? -1 : 1) *
									Math.max(30, Math.abs(rock.vx));
								rock.vz = 60;
								rock.grace = 0.2;
							}
						}
						this.emit("heavyClang", {
							x,
							z,
							text: "REINFORCED · redirect into ore or chop three times",
						});
						continue;
					}
					this.destroy(a, null, true);
					this.destroy(b, null, true);
					this.director.collisions++;
					const chain =
						this.lastCollision && this.time - this.lastCollision < 3.5
							? Math.min(4, this.chain + 1)
							: 1;
					this.chain = chain;
					this.lastCollision = this.time;
					this.bestChain = Math.max(this.bestChain, chain);
					this.scoreEvent(
						((redirected ? 9 : 6) + (this.route === 2 ? 3 : 0)) * chain,
					);
					this.emit("collision", {
						x,
						z,
						chain,
						text: `${redirected ? "TRICK SHOT" : "ROCK COLLISION"} ×${chain}`,
					});
					const deck = this.room.deck,
						reward = deck[this.director.deckAt++ % deck.length];
					if (
						reward === "pick" ||
						this.miners.filter((m) => !m.downed).every((m) => m.tool <= 0)
					)
						this.spawnPickup("pick", x, z + 24);
					else if (reward === "key" && this.canKey())
						this.spawnPickup("key", x, Math.max(28, z - 20));
					else this.spawnPickup("gold", x, z + 4);
				}
			this.contacts = [...active];
		}
		canKey() {
			return !this.room.finale
				? this.director.kills >= 4 || this.chamberTime > 26
				: this.director.wave >= this.room.finale.waves &&
						(this.director.waveProgress >= this.room.finale.keyClears ||
							this.director.collisions >= this.room.finale.collisions);
		}
		hurt(m, r) {
			if (
				m.invuln > 0 ||
				this.invincible ||
				this.attract ||
				m.downed ||
				this.transition > 0
			)
				return;
			m.health--;
			m.invuln = 2.4;
			m.hero.knock(r.x < m.hero.x ? 1 : -1, 90, 140, 0.22);
			m.attack.cancel();
			this.emit("hurt", {
				miner: m.id,
				x: m.hero.x,
				z: m.hero.z + 12,
				text: m.health
					? "HELMET DENT! · keep moving"
					: "DOWN! · partner can rescue",
			});
			if (m.health <= 0) {
				m.downed = true;
				m.hero.vx = m.hero.vz = 0;
				this.recoverKey(m.id);
				this.emit("knockout", { miner: m.id, x: m.hero.x, z: m.hero.z });
			}
		}
		recoverKey(id) {
			if (this.keyOwner !== id) return;
			this.keyOwner = null;
			this.spawnPickup("key", 136, 26);
			this.emit("keyRecovered", {
				x: 136,
				z: 26,
				text: "KEY RECOVERED · intake landing",
			});
		}
		removeMiner(id) {
			this.recoverKey(id);
			this.miners = this.miners.filter((m) => m.id !== id);
			this.emit("leave", { miner: id });
			if (!this.miners.length) this.finish(false, "No miners remain");
		}
		addMiner(seat) {
			if (this.online || this.miners.length >= 2 || this.chamberTime > 8)
				return false;
			this.miners.push(this.makeMiner(seat));
			this.emit("join", { miner: seat.id, text: "PARTNER CLOCKED IN!" });
			return true;
		}
		nearDoor(m) {
			return (
				this.room.doors.find(
					(d) => Math.abs(d.x - m.hero.x) < 38 && Math.abs(d.z - m.hero.z) < 23,
				) || null
			);
		}
		interact(m, held) {
			const fallen = this.miners.find(
				(n) =>
					n.id !== m.id &&
					n.downed &&
					Math.abs(n.hero.x - m.hero.x) < 36 &&
					Math.abs(n.hero.z - m.hero.z) < 28,
			);
			if (fallen && held) {
				fallen.rescue += this._dt;
				if (fallen.rescue >= this.tuning.rescueTime) {
					fallen.downed = false;
					fallen.health = 2;
					fallen.invuln = 3;
					fallen.rescue = 0;
					m.stats.rescues++;
					this.emit("rescue", {
						x: fallen.hero.x,
						z: fallen.hero.z,
						miner: fallen.id,
						text: "BACK IN BUSINESS!",
					});
				}
				return true;
			}
			return false;
		}
		unlock(m, door) {
			if (this.keyOwner === null) {
				m.jam = 0.65;
				m.invuln = Math.max(m.invuln, 0.8);
				this.tutorial.jam = true;
				this.emit("jam", {
					x: door.x,
					z: door.z,
					text: "NO KEY! · wiggle free, catch the rising key",
				});
				return;
			}
			if (this.transition > 0) return;
			this.scoreEvent(20, m, "doorScore");
			this.emit("unlock", {
				x: door.x,
				z: door.z,
				miner: m.id,
				door: door.id,
				text: "PAYDIRT! · a moment to breathe",
			});
			this.keyOwner = null;
			this.route = PP.ROUTES.findIndex((d) => d.id === door.id);
			this.transition = 2.2;
			this.nextChamber = this.chamber + 1;
			for (const n of this.miners)
				if (n.downed) {
					this.score = Math.max(0, this.score - 10);
					n.health = 2;
					n.downed = false;
					this.emit("doorRescue", {
						miner: n.id,
						text: "PARTNER RECOVERED · 10 gold rescue fee",
					});
				}
			this.banked = this.score;
		}
		finish(won, reason = won ? "Extraction complete" : "Crew wiped out") {
			if (this.completed) return;
			this.completed = {
				won,
				reason,
				score: this.score,
				time: this.time,
				chamber: this.chamber,
			};
			if (won) this.banked = this.score;
			this.emit(won ? "victory" : "defeat", { text: reason });
		}
		retry() {
			if (this.online) return false;
			this.score = this.checkpoint.score;
			this.completed = null;
			this.enter(this.checkpoint.chamber, this.checkpoint.route);
			return true;
		}
		directorStep(dt) {
			const d = this.director,
				active = this.miners.filter((m) => !m.downed);
			d.spawnIn -= dt;
			d.pairIn -= dt;
			d.emptyTool =
				active.length && active.every((m) => m.tool === 0)
					? d.emptyTool + dt
					: 0;
			d.noKey =
				this.keyOwner === null && !this.pickups.some((p) => p.kind === "key")
					? d.noKey + dt
					: 0;
			if (
				d.emptyTool >= this.tuning.recoveryWait &&
				!this.pickups.some((p) => p.kind === "pick")
			) {
				this.schedulePair("tool");
				d.emptyTool = 0;
			}
			if (d.pairIn <= 0) {
				this.schedulePair("seam");
				d.pairIn = 18 + this.random() * 5;
			}
			if (d.spawnIn < 1.3 && d.spawnIn > 0) {
				const door = this.room.doors[(d.supplyCount + d.deckAt) % 3];
				if (!door.warning) {
					door.warning = 1.3;
					this.emit("doorWarning", {
						x: door.x,
						z: door.z,
						door: door.id,
						text: `${door.name} GATE · incoming ore`,
					});
				}
			}
			if (d.spawnIn <= 0) {
				const door = this.room.doors[(d.supplyCount + d.deckAt) % 3],
					dir = door.x > 300 ? -1 : 1;
				const kind =
					this.chamberTime < 18 && this.chamber === 0
						? "normal"
						: this.room.patterns[
								Math.floor(this.random() * this.room.patterns.length)
							];
				this.spawnRock({
					x: door.x + dir * 18,
					z: door.z + (kind === "bounce" ? 34 : 12),
					vx:
						dir *
						this.tuning.rockSpeed *
						PP.ROUTES[this.route].speed *
						(1 + d.pressure * 0.3),
					kind,
					source: door.id,
				});
				door.warning = 0;
				d.supplyCount++;
				d.spawnIn = Math.max(
					2.5,
					this.tuning.spawnInterval - this.chamber * 0.55 - d.pressure * 1.5,
				);
			}
			for (const door of this.room.doors)
				if (door.warning > 0) door.warning = Math.max(0.001, door.warning - dt);
			if (
				this.room.finale &&
				d.wave < this.room.finale.waves &&
				(d.waveProgress >= this.room.finale.clearsPerWave ||
					this.chamberTime - d.waveAt > this.room.finale.timeout)
			) {
				d.wave++;
				d.waveAt = this.chamberTime;
				d.waveProgress = 0;
				this.schedulePair("finale");
				this.emit("wave", {
					wave: d.wave,
					text: `EXTRACTION BELL ${d.wave} / ${this.room.finale.waves}`,
				});
			}
			if (
				this.canKey() &&
				d.noKey >= 18 &&
				!this.pickups.some((p) => p.kind === "key") &&
				this.keyOwner === null
			) {
				// Visible collision opportunity is guaranteed; the reward is tied to that mine event.
				this.schedulePair("key");
				d.noKey = 0;
			}
			for (const event of this.pending)
				if (event.at <= this.chamberTime && !event.done) {
					event.done = true;
					// Authored pairs collide in the lane; if a player chopped one, the opened seam still drops its supply.
					if (
						event.reason === "tool" &&
						!this.pickups.some((p) => p.kind === "pick")
					)
						this.spawnPickup("pick", event.x, event.z + 36);
					if (event.reason === "key" && this.canKey())
						this.spawnPickup("key", event.x, event.z + 4);
				}
			this.pending = this.pending.filter((p) => !p.done);
		}
		step(dt = 1 / 120, intents = {}) {
			if (this.completed) return;
			this._dt = dt;
			this.tick++;
			this.time += dt;
			this.chamberTime += dt;
			if (this.transition > 0) {
				this.transition -= dt;
				if (this.transition <= 0 && this.nextChamber !== undefined) {
					const next = this.nextChamber;
					delete this.nextChamber;
					if (next >= PP.CHAMBERS.length) this.finish(true);
					else this.enter(next, this.route);
				}
				return;
			}
			this.updateLadders();
			// Resolution order: traversal/world, action contacts, rock pairs, exposed damage, pickups, transitions.
			for (const m of this.miners) {
				if (m.downed) continue;
				const ctl = { ...empty(), ...(intents[m.id] || {}) },
					h = m.hero;
				m.invuln = Math.max(0, m.invuln - dt);
				m.jam = Math.max(0, m.jam - dt * (Math.abs(ctl.mx) > 0.2 ? 3 : 1));
				h.run = this.tuning.moveSpeed;
				h.climb = this.tuning.climbSpeed;
				h.jump = this.tuning.jumpSpeed;
				h.gravity = this.tuning.gravity;
				h.fallGravity = this.tuning.gravity * 1.4;
				if (ctl.jump) m.jumpBuffer = 0.13;
				else m.jumpBuffer = Math.max(0, m.jumpBuffer - dt);
				if (h.climbing && ctl.my > 0.25) h.drop = 0.1;
				h.update(
					dt,
					this.level,
					{
						x: m.jam > 0 ? ctl.mx * 0.25 : ctl.mx,
						up: ctl.my < -0.25,
						down: ctl.my > 0.25,
						jump: ctl.jumpHeld || ctl.jump,
						jumpPressed: m.jumpBuffer > 0,
					},
					this.roomSolids,
				);
				if (h.jumped || h.drop > 0.15) m.jumpBuffer = 0;
				h.x = clamp(h.x, 14, 562);
				m.facing = h.facing;
				if (h.z < -28) {
					h.x = 104;
					h.z = 16;
					h.vx = h.vz = 0;
					m.invuln = 2;
					this.emit("recovery", {
						miner: m.id,
						x: h.x,
						z: 16,
						text: "SAFETY NET · back to intake",
					});
				}
				if (Math.abs(ctl.mx) > 0.1) this.tutorial.move = true;
				if (h.jumped) {
					this.tutorial.jump = true;
					this.emit("jump", { miner: m.id, x: h.x, z: h.z });
				}
				if (h.crouching) this.tutorial.duck = true;
				if (h.climbing) this.tutorial.ladder = true;
				if (h.landed && this.tick % 4 === 0)
					this.emit("land", { miner: m.id, x: h.x, z: h.z });
				if (
					!m.attack.busy &&
					m.tool > 0 &&
					!h.climbing &&
					(ctl.redirect || ctl.chop)
				) {
					m.action = ctl.redirect ? "redirect" : "chop";
					m.actionT = 0;
					m.aim = ctl.aim ?? ctl.my;
					const cycle = this.tuning.chopCycle;
					m.attack.spec = {
						...m.attack.spec,
						wind: m.action === "redirect" ? 0.045 : cycle * 0.22,
						active:
							m.action === "redirect"
								? this.tuning.redirectWindow
								: cycle * 0.31,
						recover: cycle * 0.47,
					};
					m.attack.start();
					this.emit(m.action === "redirect" ? "redirectSwing" : "swing", {
						miner: m.id,
						x: h.x,
						z: h.z + 14,
					});
				}
				if (m.attack.busy) m.actionT += dt;
				m.attack.update(dt);
				if (!m.attack.busy) m.action = null;
			}
			for (const r of this.rocks) {
				if (r.dead) continue;
				r.age += dt;
				r.grace = Math.max(0, r.grace - dt);
				r.spin += (r.vx * dt) / r.r;
				const prev = r.z;
				r.x += r.vx * dt;
				r.vz -= 300 * dt;
				r.z += r.vz * dt;
				const ground = this.floorBelow(r.x, prev - r.r + 0.2);
				if (
					ground !== null &&
					r.z - r.r <= ground &&
					prev - r.r >= ground - 2 &&
					r.vz < 0
				) {
					r.z = ground + r.r;
					r.vz = r.kind === "bounce" ? 143 : r.kind === "heavy" ? 36 : 65;
				}
				if (r.x < 14 || r.x > 562) {
					r.x = clamp(r.x, 14, 562);
					r.vx *= -1;
				}
				if (r.z < -40 || r.age > 23) r.dead = true;
			}
			for (const m of this.miners) if (!m.downed) this.actionContacts(m);
			this.rockPairs();
			for (const m of this.miners)
				if (!m.downed)
					for (const r of this.rocks) {
						if (r.dead) continue;
						const h = m.hero,
							dx = r.x - h.x,
							dz = r.z - (h.z + h.h * 0.5);
						const exposed =
							Math.abs(dx) < r.r + h.w * 0.5 - 2 &&
							Math.abs(dz) < r.r + h.h * 0.5 - 2;
						if (exposed && !r.grace) this.hurt(m, r);
						if (
							!r.evasions.includes(m.id) &&
							Math.abs(dx) < 26 &&
							Math.abs(dz) < 65 &&
							!exposed &&
							(h.air || h.crouching) &&
							!h.climbing
						) {
							r.evasions.push(m.id);
							m.stats.dodges++;
							this.scoreEvent(1, m, "evade");
						}
					}
			for (const p of this.pickups) {
				p.ttl -= dt;
				p.age += dt;
				if (p.kind === "key") {
					p.z += 5 * dt;
					p.x = p.baseX + Math.sin(p.age * 1.1) * 15;
					if (p.z > this.room.floors.at(-1).z + 40) p.ttl = 0;
				} else {
					const landing =
						p.kind === "pick" ? 16 : (this.floorBelow(p.x, p.z - 2) ?? 16);
					p.z = Math.max(landing + 9, p.z - (p.kind === "pick" ? 42 : 60) * dt);
				}
				for (const m of this.miners) {
					if (
						m.downed ||
						p.dead ||
						p.ttl <= 0 ||
						Math.abs(m.hero.x - p.x) > 21 ||
						Math.abs(m.hero.z + 14 - p.z) > 26
					)
						continue;
					if (p.kind === "pick") {
						if (m.tool >= this.tuning.durability) continue;
						m.tool = this.tuning.durability;
						m.stats.tools++;
						this.tutorial.pick = true;
						this.scoreEvent(5, m, "pickCollect");
					} else if (p.kind === "key") {
						if (this.keyOwner !== null) continue;
						this.keyOwner = m.id;
						m.stats.keys++;
						this.tutorial.key = true;
						this.scoreEvent(10, m, "keyCollect");
					} else this.scoreEvent(this.route === 1 ? 5 : 3, m, "goldCollect");
					p.dead = true;
					this.emit("pickup", {
						miner: m.id,
						kind: p.kind,
						x: p.x,
						z: p.z,
						text:
							p.kind === "key"
								? "KEY CAUGHT! · E at any gate"
								: p.kind === "pick"
									? "FRESH PICK! · six bold decisions"
									: "GOLD!",
					});
				}
				if (p.ttl <= 0 && p.kind === "key") {
					this.director.noKey = Math.max(this.director.noKey, 11);
					this.emit("keyExpired", {
						x: p.x,
						z: p.z,
						text: "KEY ESCAPED · another seam will open",
					});
				}
			}
			this.pickups = this.pickups.filter((p) => !p.dead && p.ttl > 0);
			this.rocks = this.rocks.filter((r) => !r.dead);
			for (const m of this.miners)
				if (!m.downed) {
					const ctl = intents[m.id] || empty(),
						rescuing = this.interact(m, ctl.interactHeld || ctl.interact);
					if (!rescuing && ctl.interact) {
						const d = this.nearDoor(m);
						if (d) this.unlock(m, d);
					}
				}
			if (this.miners.length && this.miners.every((m) => m.downed))
				this.finish(false);
			if (!this.completed && this.transition <= 0) this.directorStep(dt);
		}
		get objective() {
			if (this.keyOwner !== null)
				return "KEY SECURED · take it to any gate and interact";
			if (this.pickups.some((p) => p.kind === "key"))
				return "CATCH THE RISING KEY · it will not wait forever";
			if (this.miners.filter((m) => !m.downed).every((m) => m.tool === 0))
				return "PICK BROKE · evade ore and chase a falling replacement";
			if (this.room.finale)
				return `EXTRACTION · bell ${this.director.wave} / ${this.room.finale.waves} · collide ore to open the final key seam`;
			return "CHOP FOR GOLD · redirect ore into ore · catch the rising key";
		}
		get hint() {
			if (this.chamber > 0) return this.room.subtitle;
			const t = this.tutorial;
			if (!t.move || !t.jump)
				return "Move A/D · jump Space · hold to leap higher";
			if (!t.chop)
				return "Hold J to chop ore · only successful contacts wear your pick";
			if (!t.redirect)
				return "Q redirects ore · hold Up for a high arc, Down for a low arc";
			if (!t.ladder)
				return "W climbs the permanent ladders · jump sideways to dismount";
			if (!t.key)
				return "Collisions uncover supplies · picks fall and keys rise";
			return "Choose SUN for steady lanes, MOON for bounce, STAR for heavy ore";
		}
		snapshot() {
			return {
				v: 1,
				seed: this.seed,
				rngState: this.rngState,
				online: this.online,
				tuning: { ...this.tuning },
				tick: this.tick,
				time: this.time,
				epoch: this.epoch,
				nextId: this.nextId,
				nextEvent: this.nextEvent,
				score: this.score,
				banked: this.banked,
				bestChain: this.bestChain,
				chain: this.chain || 0,
				lastCollision: this.lastCollision || 0,
				chamber: this.chamber,
				route: this.route,
				keyOwner: this.keyOwner,
				completed: this.completed,
				developer: this.developer,
				invincible: this.invincible,
				attract: this.attract,
				chamberTime: this.chamberTime,
				transition: this.transition,
				nextChamber: this.nextChamber,
				director: { ...this.director },
				tutorial: { ...this.tutorial },
				checkpoint: { ...this.checkpoint },
				rocks: JSON.parse(JSON.stringify(this.rocks)),
				pickups: JSON.parse(JSON.stringify(this.pickups)),
				pending: JSON.parse(JSON.stringify(this.pending)),
				contacts: [...this.contacts],
				events: this.events.slice(-24).map((e) => ({ ...e })),
				miners: this.miners.map((m) => ({
					...m,
					hero: { ...m.hero },
					attack: {
						spec: { ...m.attack.spec },
						phase: m.attack.phase,
						t: m.attack.t,
						hit: [...m.attack.hit],
					},
					stats: { ...m.stats },
				})),
			};
		}
		restore(s) {
			if (!s || s.v !== 1) throw new Error("Unsupported mine snapshot");
			const copy = JSON.parse(JSON.stringify(s));
			Object.assign(this, copy);
			this.eventLog ||= [];
			this.tuning = PP.validTuning(copy.tuning);
			this.room = PP.makeRoom(this.chamber, this.route);
			this.miners = copy.miners.map((m) => {
				const h = Object.assign(new E.Platformer(m.hero), m.hero),
					a = new E.Attack(m.attack.spec);
				a.phase = m.attack.phase;
				a.t = m.attack.t;
				a.hit = new Set(m.attack.hit);
				return { ...m, hero: h, attack: a };
			});
			this._ladderVersion = "";
			this.level = PP.makeLevel(this.room);
			const oldEvents = [...this.events],
				nextEvent = this.nextEvent;
			this._restoring = true;
			this.updateLadders(true);
			this._restoring = false;
			this.events = oldEvents;
			this.nextEvent = nextEvent;
			return this;
		}
	}
	PP.Sim = Sim;
})();
