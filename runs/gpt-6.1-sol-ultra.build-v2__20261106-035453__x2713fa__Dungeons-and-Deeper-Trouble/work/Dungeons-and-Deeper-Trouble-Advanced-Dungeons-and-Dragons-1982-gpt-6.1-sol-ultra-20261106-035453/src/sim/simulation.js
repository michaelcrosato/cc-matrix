((G) => {
	const C = G.DTContent,
		K = G.DTConfig,
		M = G.DTGeometry,
		{ clamp } = M,
		T = 16,
		_TAU = Math.PI * 2;
	const copy = (v) => JSON.parse(JSON.stringify(v)),
		dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
		norm = (x, y) => {
			const n = Math.hypot(x, y);
			return n > 0.001 ? [x / n, y / n] : [1, 0];
		};
	const createPlayer = (id, x = 0, y = 0) => ({
		id,
		x,
		y,
		z: 0,
		vx: 0,
		vy: 0,
		aim: 0,
		hp: 3,
		maxHp: 3,
		down: 0,
		invuln: 2,
		bow: "idle",
		draw: 0,
		recover: 0,
		dash: 0,
		dashCooldown: 0,
		focus: false,
		stepClock: 0,
		revive: 0,
		anim: "idle",
		animTime: 0,
		lastAction: 0,
	});
	class Simulation {
		constructor(o = {}) {
			this.tunables = { ...K.defaults };
			this.cheats = {
				infiniteHealth: false,
				infiniteAmmo: false,
				noclip: false,
				reveal: false,
			};
			this.commands = new Map();
			this.ids = 0;
			this.visClock = 0;
			this.pathCache = new Map();
			this.readOnly = false;
			this.state = {
				version: C.version,
				tick: 0,
				time: 0,
				seed: o.seed || 7,
				mode: o.mode || "solo",
				phase: "map",
				node: "camp",
				cave: null,
				players: (o.players || [1]).slice(0, 2).map((id) => createPlayer(id)),
				enemies: [],
				arrows: [],
				pickups: [],
				noise: [],
				events: [],
				explored: [],
				visible: [],
				tools: { axe: false, boat: false, key: false },
				relics: [],
				quiver: 3,
				reserves: 3,
				flags: {},
				cleared: [],
				stats: {
					shots: 0,
					hits: 0,
					banks: 0,
					recovered: 0,
					treasures: 0,
					deaths: 0,
					restarts: 0,
					revives: 0,
					assisted: false,
					elapsed: 0,
					damage: 0,
				},
				objective: "Find the axe in The Pale Below.",
				notice:
					"Reunite the Wayfarer’s Crown. Three arrows. Three reserves. One road home.",
				noticeTime: 8,
				transition: null,
				checkpoint: "Morrow Camp",
				outcome: null,
			};
			this.checkpoint = copy(this.state);
			this.resumeRevision = 0;
			if (o.state) this.restore(o.state);
			else this.event("voice", { text: this.state.notice, cue: "guide" });
		}
		getCave() {
			return C.caves[this.state.cave] || null;
		}
		get stateVersion() {
			return this.state.version;
		}
		event(type, data = {}) {
			const e = { id: ++this.ids, type, time: this.state.time, ...data };
			this.state.events.push(e);
			if (this.state.events.length > 16) this.state.events.shift();
			return e;
		}
		say(text, duration = 5) {
			this.state.notice = text;
			this.state.noticeTime = duration;
			this.event("voice", { text, cue: "guide" });
		}
		notice(text, duration = 4) {
			this.state.notice = text;
			this.state.noticeTime = duration;
		}
		objective() {
			const s = this.state;
			if (s.phase === "victory")
				return "The Crown is whole. Morning has found its way home.";
			if (s.phase === "defeat")
				return "The expedition is lost. A new road still waits.";
			if (s.phase === "cave") {
				const cave = this.getCave();
				if (cave.id === "root" && !s.flags.bankLesson)
					return "Ring the brass gong with a banked arrow.";
				if (cave.exit.requires && !this.has(cave.exit.requires))
					return cave.id === "ember"
						? "Claim the first Crown half."
						: cave.id === "rime"
							? "Claim the second Crown half."
							: `Find the ${cave.exit.requires}. Then find the ladder.`;
				return cave.next
					? "Take the Crown half to the far ladder."
					: "Reach the marked ladder.";
			}
			return !s.tools.axe
				? "Find the axe in The Pale Below."
				: !s.tools.boat
					? "Use the axe. Find the boat in Briarwake."
					: !s.tools.key
						? "Cross Foldwater. Recover the Index Key."
						: s.relics.length < 2
							? "Open the Kingless Wall. Reunite the Crown."
							: "Return the light to Morrow Camp.";
		}
		has(kind) {
			return !!this.state.tools[kind] || this.state.relics.includes(kind);
		}
		submit(id, cmd = {}) {
			const p = this.state.players.find((p) => String(p.id) === String(id));
			if (!p) return false;
			let prev = this.commands.get(String(id));
			if (!prev)
				prev = {
					mx: 0,
					my: 0,
					ax: Math.cos(p.aim),
					ay: Math.sin(p.aim),
					focus: false,
					sprint: false,
					heldInteract: false,
					actions: [],
					age: 0,
				};
			const h = { ...prev, age: 0 };
			for (const k of ["mx", "my", "ax", "ay"])
				if (Number.isFinite(cmd[k])) h[k] = clamp(cmd[k], -1, 1);
			h.focus = !!cmd.focus;
			h.sprint = !!(cmd.sprint || cmd.run);
			h.heldInteract = !!(cmd.heldInteract || cmd.revive);
			for (const action of cmd.actions || []) {
				if (!action || typeof action.type !== "string") continue;
				const n = Number(action.id);
				if (!Number.isSafeInteger(n) || n <= p.lastAction) continue;
				p.lastAction = n;
				h.actions.push({
					...action,
					id: n,
					type: action.type === "dodge" ? "dash" : action.type,
				});
			}
			this.commands.set(String(id), h);
			return true;
		}
		clearInput(id = null) {
			for (const [k, c] of this.commands)
				if (id === null || String(id) === k) {
					c.mx = c.my = 0;
					c.focus = c.sprint = c.heldInteract = false;
					c.actions = [];
				}
		}
		join(id) {
			if (
				this.state.players.some((p) => String(p.id) === String(id)) ||
				this.state.players.length >= 2
			)
				return false;
			const c = this.getCave(),
				anchor = this.safePoint(
					this.state.players[0] || { x: c?.spawn[0] || 0, y: c?.spawn[1] || 0 },
				);
			const p = createPlayer(id, anchor.x, anchor.y);
			p.invuln = 3;
			this.state.players.push(p);
			this.event("join", { player: id, x: p.x, y: p.y });
			return true;
		}
		leave(id) {
			const n = this.state.players.length;
			this.state.players = this.state.players.filter(
				(p) => String(p.id) !== String(id),
			);
			this.commands.delete(String(id));
			if (n !== this.state.players.length) {
				this.event("leave", { player: id });
				return true;
			}
			return false;
		}
		enterCave(id) {
			const cave = C.caves[id];
			if (!cave) return false;
			const s = this.state;
			s.phase = "cave";
			s.cave = id;
			s.enemies = cave.enemies.map((e) => ({
				...copy(e),
				z: 0,
				aim: Math.PI,
				state: "dormant",
				timer: 0,
				phase: 0,
				hp: e.hp || C.creatures[e.kind].hp,
				maxHp: e.hp || C.creatures[e.kind].hp,
				home: [e.x, e.y],
				cueClock: 1,
				heard: 0,
				target: null,
				hitPlayers: [],
				attackDir: Math.PI,
				path: [],
			}));
			s.pickups = copy(cave.pickups);
			this.rescaleSupplies();
			s.arrows = [];
			s.noise = [];
			s.explored = [];
			s.visible = [];
			s.transition = null;
			s.flags[`room:${id}`] = null;
			s.players.forEach((p, i) => {
				Object.assign(p, {
					x: cave.spawn[0] + i * 12,
					y: cave.spawn[1],
					z: 0,
					vx: 0,
					vy: 0,
					hp: 3,
					down: 0,
					invuln: 3,
					bow: "idle",
					draw: 0,
					recover: 0,
					dash: 0,
					revive: 0,
					anim: "climb",
					animTime: 0.7,
				});
			});
			this.clearInput();
			this.pathCache.clear();
			s.checkpoint = cave.name;
			this.say(cave.entrance, 5);
			this.updateVisibility();
			s.objective = this.objective();
			this.commitCheckpoint();
			this.event("cave-enter", {
				cave: id,
				x: cave.spawn[0],
				y: cave.spawn[1],
			});
			return true;
		}
		commitCheckpoint() {
			this.checkpoint = copy(this.state);
			this.resumeRevision++;
			this.event("checkpoint", { name: this.state.checkpoint });
		}
		save() {
			return {
				schema: 1,
				version: C.version,
				state: this.snapshot(),
				checkpoint: copy(this.checkpoint),
				idCounter: this.ids,
			};
		}
		load(payload) {
			if (
				payload?.schema !== 1 ||
				payload.version !== C.version ||
				!payload.state ||
				!payload.checkpoint
			)
				throw Error("Unsupported expedition save");
			this.restore(payload.state);
			this.checkpoint = copy(payload.checkpoint);
			this.ids = Math.max(this.ids, payload.idCounter || 0);
			return true;
		}
		snapshot() {
			return copy(this.state);
		}
		restore(snapshot) {
			if (
				!snapshot ||
				snapshot.version !== C.version ||
				!Array.isArray(snapshot.players) ||
				snapshot.players.length > 2 ||
				!Number.isFinite(snapshot.tick) ||
				!["map", "cave", "victory", "defeat"].includes(snapshot.phase)
			)
				throw Error("Invalid expedition state");
			if (snapshot.cave && !C.caves[snapshot.cave]) throw Error("Unknown cave");
			this.state = copy(snapshot);
			this.ids = Math.max(
				this.ids,
				...this.state.events.map((e) => e.id || 0),
				...this.state.arrows.map(
					(e) => Number(String(e.id).split("-").pop()) || 0,
				),
			);
			this.commands.clear();
			this.pathCache.clear();
			this.visClock = 0;
			return true;
		}
		restart(assisted = false) {
			if (this.state.mode === "hub" && !assisted) return false;
			const reserves = this.state.reserves,
				stats = copy(this.state.stats),
				players = this.state.players.map((p) => p.id);
			this.state = copy(this.checkpoint);
			this.rescaleSupplies();
			this.state.reserves = reserves;
			this.state.stats = {
				...this.state.stats,
				...stats,
				restarts: stats.restarts + 1,
				assisted: stats.assisted || assisted,
			};
			this.state.players = this.state.players.filter((p) =>
				players.includes(p.id),
			);
			for (const id of players)
				if (!this.state.players.some((p) => p.id === id)) this.join(id);
			this.clearInput();
			this.pathCache.clear();
			this.resumeRevision++;
			this.notice(
				"Section restored. Creatures, arrows and supplies begin together.",
			);
			this.event("restart");
			return true;
		}
		assistedContinue() {
			if (this.state.phase !== "defeat") return false;
			this.state.reserves = 3;
			this.restart(true);
			this.state.reserves = 3;
			this.state.outcome = null;
			return true;
		}
		travel(_id, target) {
			const s = this.state;
			if (s.phase !== "map" || s.transition) return false;
			const n = C.nodes.find((n) => n.id === target),
				edge = C.edges.find(
					(e) =>
						(e.from === s.node && e.to === target) ||
						(e.to === s.node && e.from === target),
				);
			if (!n || !edge) return false;
			const required = edge.requires || n.requires;
			if (required && !s.tools[required]) {
				this.notice(`You need the ${required} to open that route.`);
				this.event("locked", { tool: required });
				return false;
			}
			s.transition = {
				kind: "travel",
				from: s.node,
				to: target,
				time: 0,
				duration: 1.3,
			};
			this.event("travel", { from: s.node, to: target, tool: required });
			return true;
		}
		arrive(target) {
			const s = this.state,
				n = C.nodes.find((n) => n.id === target);
			s.node = target;
			s.transition = null;
			this.clearInput();
			if (n.cave && !s.cleared.includes(n.cave)) {
				this.enterCave(n.cave);
				return;
			}
			if (
				n.kind === "summit" &&
				s.cleared.includes("ember") &&
				!s.cleared.includes("rime")
			) {
				this.enterCave("rime");
				return;
			}
			if (n.kind === "camp" || n.kind === "spring") {
				s.players.forEach((p) => {
					p.hp = 3;
					p.down = 0;
				});
				if (!s.flags["spring-cache"] && n.kind === "spring") {
					s.quiver = Math.min(this.tunables.quiverCapacity, s.quiver + 3);
					s.flags["spring-cache"] = true;
					this.event("pickup", { kind: "arrows", count: 3 });
				}
				this.say(
					n.kind === "camp"
						? "Old Tern: “A road is a promise. Keep enough arrows to keep yours.”"
						: "Clear water, three dry shafts, and a moment without teeth.",
				);
			} else if (n.kind === "lookout") {
				if (!s.flags["lookout-cache"]) {
					s.quiver = Math.min(this.tunables.quiverCapacity, s.quiver + 4);
					s.flags["lookout-cache"] = true;
					this.event("pickup", { kind: "arrows", count: 4 });
				}
				this.say(
					"The two summit bells answer each other. “A crown in pieces is still a crown,” someone carved here.",
				);
			} else this.notice(n.clue, 5);
			s.objective = this.objective();
			s.checkpoint = n.name;
			this.commitCheckpoint();
		}
		exitCave() {
			const s = this.state,
				cave = this.getCave();
			if (!cave || s.transition) return false;
			const p = s.players.find((p) => !p.down && dist(p, cave.exit) < 35);
			if (!p) return false;
			if (cave.exit.requires && !this.has(cave.exit.requires)) {
				this.notice(
					"Take the " +
						cave.exit.requires.replace("half-", "Crown half of ") +
						" before leaving.",
				);
				return false;
			}
			if (
				cave.exit.guard &&
				s.enemies.some((e) => e.id === cave.exit.guard && e.hp > 0)
			) {
				this.notice("The ladder’s guardian still watches.");
				return false;
			}
			const standing = s.players.filter((p) => !p.down);
			if (standing.some((q) => dist(q, cave.exit) > 95)) {
				this.notice("Gather the rangers near the ladder.");
				return false;
			}
			s.transition = { kind: "exit", time: 0, duration: 1.3 };
			s.players.forEach((p) => {
				p.anim = "climb";
				p.animTime = 1.3;
			});
			this.event("ladder", { x: cave.exit.x, y: cave.exit.y });
			return true;
		}
		completeCave() {
			const s = this.state,
				cave = this.getCave();
			if (!s.cleared.includes(cave.id)) s.cleared.push(cave.id);
			s.transition = null;
			if (cave.next) {
				this.enterCave(cave.next);
				return;
			}
			if (s.relics.length === 2) {
				this.win();
				return;
			}
			s.phase = "map";
			s.cave = null;
			s.node =
				cave.id === "chalk" ? "chalk" : cave.id === "root" ? "root" : "tide";
			s.enemies = [];
			s.arrows = [];
			s.pickups = [];
			s.noise = [];
			s.visible = [];
			s.explored = [];
			s.players.forEach((p) => {
				p.hp = 3;
				p.down = 0;
				p.anim = "celebrate";
				p.animTime = 1.3;
			});
			s.checkpoint = C.nodes.find((n) => n.id === s.node).name;
			this.say(
				"Daylight. The " +
					cave.exit.requires +
					" opens a new road. This mountain is now a safe shortcut.",
				5,
			);
			s.objective = this.objective();
			this.commitCheckpoint();
		}
		win() {
			const s = this.state;
			if (s.phase === "victory") return;
			s.phase = "victory";
			s.cave = null;
			s.transition = null;
			s.outcome = "win";
			s.checkpoint = "The Morning Road";
			s.players.forEach((p) => {
				p.hp = 3;
				p.anim = "celebrate";
				p.animTime = 999;
			});
			s.objective = this.objective();
			this.say(
				"The Wayfarer’s Crown is whole. The storm unthreads. Far below, the camp bells greet the morning.",
				12,
			);
			this.event("victory", { stats: copy(s.stats) });
			this.resumeRevision++;
		}
		defeat() {
			const s = this.state;
			if (s.phase === "defeat") return;
			s.phase = "defeat";
			s.outcome = "loss";
			s.transition = null;
			this.clearInput();
			this.say(
				"The mountain has the last word today. The road will wait for another expedition.",
				10,
			);
			this.event("defeat");
			this.resumeRevision++;
		}
		wall(cx, cy) {
			const cave = this.getCave();
			if (!cave) return false;
			if (cave.rows[cy]?.[cx] !== ".") return true;
			for (const gate of cave.gates || [])
				if (
					!this.state.flags[gate.requires] &&
					cx >= gate.cx - Math.floor(gate.w / 2) &&
					cx < gate.cx - Math.floor(gate.w / 2) + gate.w &&
					cy >= gate.cy &&
					cy < gate.cy + gate.h
				)
					return true;
			return false;
		}
		clearAt(x, y, r = 0) {
			const x0 = Math.floor((x - r) / T),
				x1 = Math.floor((x + r) / T),
				y0 = Math.floor((y - r) / T),
				y1 = Math.floor((y + r) / T);
			for (let cy = y0; cy <= y1; cy++)
				for (let cx = x0; cx <= x1; cx++)
					if (this.wall(cx, cy)) {
						const qx = clamp(x, cx * T, (cx + 1) * T),
							qy = clamp(y, cy * T, (cy + 1) * T);
						if (Math.hypot(x - qx, y - qy) < r + 0.01) return false;
					}
			for (const bank of this.getCave()?.banks || []) {
				const [ax, ay] = bank.a,
					[bx, by] = bank.b,
					dx = bx - ax,
					dy = by - ay,
					u = clamp(
						((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy),
						0,
						1,
					);
				if (Math.hypot(x - ax - u * dx, y - ay - u * dy) < r + 1.5)
					return false;
			}
			return true;
		}
		lineClear(x0, y0, x1, y1) {
			const dx = x1 - x0,
				dy = y1 - y0,
				steps = Math.ceil(Math.hypot(dx, dy) / 5);
			for (let i = 0; i <= steps; i++) {
				const u = i / (steps || 1);
				if (
					this.wall(
						Math.floor((x0 + dx * u) / T),
						Math.floor((y0 + dy * u) / T),
					)
				)
					return false;
			}
			return true;
		}
		moveClear(a, b, r = 5) {
			const n = Math.ceil(dist(a, b) / 3);
			for (let i = 1; i <= n; i++)
				if (
					!this.clearAt(
						a.x + ((b.x - a.x) * i) / n,
						a.y + ((b.y - a.y) * i) / n,
						r,
					)
				)
					return false;
			return true;
		}
		safePoint(p, radius = 5) {
			if (!this.getCave()) return { x: p.x || 0, y: p.y || 0 };
			if (this.clearAt(p.x, p.y, radius)) return { x: p.x, y: p.y };
			const cave = this.getCave();
			const q = [[Math.floor(p.x / T), Math.floor(p.y / T)]],
				seen = new Set();
			while (q.length && seen.size < 5000) {
				const [x, y] = q.shift(),
					key = `${x},${y}`;
				if (
					seen.has(key) ||
					x < 0 ||
					y < 0 ||
					x >= cave.width ||
					y >= cave.height
				)
					continue;
				seen.add(key);
				if (
					!this.wall(x, y) &&
					this.clearAt((x + 0.5) * T, (y + 0.5) * T, radius)
				)
					return { x: (x + 0.5) * T, y: (y + 0.5) * T };
				q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
			}
			return { x: cave.spawn[0], y: cave.spawn[1] };
		}
		moveActor(p, vx, vy, dt, r = 5) {
			const dx = vx * dt,
				dy = vy * dt,
				steps = Math.max(
					1,
					Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2),
				);
			for (let n = 0; n < steps; n++) {
				if (
					this.clearAt(p.x + dx / steps, p.y, r) ||
					(this.cheats.noclip && p.maxHp === 3)
				)
					p.x += dx / steps;
				if (
					this.clearAt(p.x, p.y + dy / steps, r) ||
					(this.cheats.noclip && p.maxHp === 3)
				)
					p.y += dy / steps;
			}
		}
		path(from, to, radius = 5) {
			const cave = this.getCave();
			if (!cave) return [];
			// Actors can stand safely off-center in a cell cut by a thin diagonal bank.
			// Both ends are virtual anchors; every actual edge must fit the actor radius.
			const goal = this.clearAt(to.x, to.y, radius)
					? { x: to.x, y: to.y }
					: this.safePoint(to, radius),
				sx = Math.floor(from.x / T),
				sy = Math.floor(from.y / T),
				tx = Math.floor(goal.x / T),
				ty = Math.floor(goal.y / T),
				key = `${sx},${sy}>${tx},${ty}|${!!this.state.flags.bankLesson}|${radius}`;
			const cached = this.pathCache.get(key);
			if (cached?.length) {
				const prefix = cached.slice(0, -1),
					first = prefix[0] || goal,
					last = prefix.at(-1) || from;
				// A different fractional position in the same cell may be on the bank's other side.
				if (
					this.moveClear(from, first, radius) &&
					this.moveClear(last, goal, radius)
				)
					return [...prefix, goal];
			}
			const q = [[sx, sy]],
				came = new Map([[`${sx},${sy}`, null]]);
			let found = null;
			for (let head = 0; head < q.length && head < 7000; head++) {
				const [x, y] = q[head],
					point = head === 0 ? from : { x: (x + 0.5) * T, y: (y + 0.5) * T };
				if (
					Math.abs(x - tx) + Math.abs(y - ty) <= 1 &&
					this.moveClear(point, goal, radius)
				) {
					found = [x, y];
					break;
				}
				for (const [xx, yy] of [
					[x + 1, y],
					[x - 1, y],
					[x, y + 1],
					[x, y - 1],
				]) {
					const k = `${xx},${yy}`,
						next = { x: (xx + 0.5) * T, y: (yy + 0.5) * T };
					if (
						!came.has(k) &&
						!this.wall(xx, yy) &&
						this.clearAt(next.x, next.y, radius) &&
						this.moveClear(point, next, radius)
					) {
						came.set(k, [x, y]);
						q.push([xx, yy]);
					}
				}
			}
			const result = [];
			if (found) {
				let at = found;
				while (at && !(at[0] === sx && at[1] === sy)) {
					result.push({ x: (at[0] + 0.5) * T, y: (at[1] + 0.5) * T });
					at = came.get(`${at[0]},${at[1]}`);
				}
				result.reverse();
				if (!result.length || dist(result.at(-1), goal) > 0.001)
					result.push(goal);
			}
			if (this.pathCache.size > 500) this.pathCache.clear();
			this.pathCache.set(key, result);
			return result;
		}

		acoustic(from, to, maxDistance = 400) {
			const path = this.path(from, to);
			if (!path.length) return dist(from, to) < T ? dist(from, to) : Infinity;
			const d =
				(path.length - 1) * T +
				dist(from, path[0]) +
				dist(to, path[path.length - 1]);
			return d <= maxDistance ? d : Infinity;
		}
		noise(kind, x, y, loudness, owner = null) {
			const e = {
				id: ++this.ids,
				x,
				y,
				kind,
				loudness,
				time: this.state.time,
				life: 1.6,
				owner,
			};
			this.state.noise.push(e);
			if (this.state.noise.length > 10) this.state.noise.shift();
			this.event("sound", { cue: kind, x, y, loudness });
			return e;
		}
		updateVisibility() {
			const s = this.state,
				cave = this.getCave();
			if (!cave) return;
			const visible = new Set(),
				explored = new Set(s.explored),
				paint = (p, r, remember) => {
					const r2 = r * r,
						cx = Math.floor(p.x / T),
						cy = Math.floor(p.y / T),
						rn = Math.ceil(r / T);
					for (let y = cy - rn; y <= cy + rn; y++)
						for (let x = cx - rn; x <= cx + rn; x++) {
							if (x < 0 || y < 0 || x >= cave.width || y >= cave.height)
								continue;
							const xx = (x + 0.5) * T,
								yy = (y + 0.5) * T;
							if (
								(xx - p.x) ** 2 + (yy - p.y) ** 2 > r2 ||
								!this.lineClear(p.x, p.y, xx, yy)
							)
								continue;
							const k = y * cave.width + x;
							visible.add(k);
							if (remember) explored.add(k);
						}
				};
			for (const p of s.players)
				if (!p.down) paint(p, this.tunables.vision, true);
			for (const a of s.arrows) paint(a, this.tunables.arrowVision, false);
			if (this.cheats.reveal)
				for (let y = 0; y < cave.height; y++)
					for (let x = 0; x < cave.width; x++) visible.add(y * cave.width + x);
			s.visible = [...visible];
			s.explored = [...explored];
			this.visibleSet = visible;
		}
		isVisible(x, y) {
			const cave = this.getCave();
			return (
				!cave ||
				this.cheats.reveal ||
				new Set(this.state.visible).has(
					Math.floor(y / T) * cave.width + Math.floor(x / T),
				)
			);
		}
		visibleEnemy(e) {
			return e.hp > 0 && this.isVisible(e.x, e.y);
		}
		context(id) {
			const s = this.state,
				p = s.players.find((p) => String(p.id) === String(id));
			if (!p) return null;
			if (s.phase === "map")
				return {
					label: "Choose a nearby landmark",
					type: "travel",
					enabled: true,
				};
			if (s.phase !== "cave" || p.down) return null;
			const down = s.players.find(
				(q) => q.id !== p.id && q.down > 0 && dist(p, q) < 31,
			);
			if (down)
				return {
					label: "Hold to revive ranger",
					type: "revive",
					target: down.id,
					enabled: true,
				};
			const pick = s.pickups.find((q) => q.count > 0 && dist(p, q) < 30);
			if (pick) {
				const guard =
					pick.guard && s.enemies.find((e) => e.id === pick.guard && e.hp > 0);
				return {
					label: guard
						? "Defeat the guardian first"
						: pick.kind === "arrows"
							? `Recover ${pick.count} arrows`
							: pick.kind === "treasure"
								? "Read the old cache"
								: pick.kind === "heart"
									? "Drink clear water"
									: `Claim ${pick.kind.replace("half-", "Crown half: ")}`,
					type: "pickup",
					target: pick.id,
					enabled: !guard,
				};
			}
			if (dist(p, this.getCave().exit) < 38)
				return { label: "Climb the ladder", type: "exit", enabled: true };
			return null;
		}
		interact(p) {
			if (p.down) return;
			const s = this.state;
			let got = false;
			for (const pick of s.pickups) {
				if (pick.count <= 0 || dist(p, pick) > 30) continue;
				if (
					pick.guard &&
					s.enemies.some((e) => e.id === pick.guard && e.hp > 0)
				) {
					this.notice("Its guardian still watches.");
					continue;
				}
				const kind = pick.kind;
				if (kind === "arrows") {
					const capacity = Math.round(this.tunables.quiverCapacity),
						take = Math.min(pick.count, Math.max(0, capacity - s.quiver));
					if (!take) {
						this.notice("Quiver full. The spare shafts will wait.");
						continue;
					}
					s.quiver += take;
					const recoveredTake = pick.recovered
						? take
						: Math.min(take, pick._recoveredUnits || 0);
					if (this.authoredSupply(pick)) {
						if (!Number.isFinite(pick._supplyBase))
							pick._supplyBase = pick.count - (pick._recoveredUnits || 0);
						const authoredTake = take - recoveredTake,
							authoredAvailable = pick.count - (pick._recoveredUnits || 0);
						pick._recoveredUnits = Math.max(
							0,
							(pick._recoveredUnits || 0) - recoveredTake,
						);
						pick._supplyBase =
							authoredTake >= authoredAvailable
								? 0
								: Math.max(
										0,
										pick._supplyBase - authoredTake / this.tunables.supplyYield,
									);
						pick.count =
							this.scaledSupply(pick._supplyBase) + pick._recoveredUnits;
					} else pick.count -= take;
					s.stats.recovered += recoveredTake;
					if (recoveredTake) s.flags.recovered = true;
					this.event("pickup", {
						kind,
						x: pick.x,
						y: pick.y,
						count: take,
						idPickup: pick.id,
					});
				} else if (kind === "heart") {
					if (p.hp >= 3) {
						this.notice("The water will wait until you need it.");
						continue;
					}
					p.hp = 3;
					pick.count = 0;
					this.event("pickup", { kind, x: pick.x, y: pick.y });
				} else if (kind === "treasure") {
					pick.count = 0;
					s.stats.treasures++;
					this.say(
						"A pilgrim’s silver feather. The journal reads: “The road remembers the careful.”",
					);
					this.event("pickup", { kind, x: pick.x, y: pick.y });
				} else {
					pick.count = 0;
					if (["axe", "boat", "key"].includes(kind)) s.tools[kind] = true;
					else if (!s.relics.includes(kind)) s.relics.push(kind);
					this.say(
						kind.startsWith("half-")
							? "A half of the Wayfarer’s Crown. Its quiet note answers the other wing."
							: `The ${kind} is yours. A new road awaits above.`,
						5,
					);
					this.event("tool", { kind, x: pick.x, y: pick.y });
				}
				p.anim = "pickup";
				p.animTime = 0.5;
				got = true;
			}
			s.pickups = s.pickups.filter((p) => p.count > 0);
			if (!got) this.exitCave();
			s.objective = this.objective();
		}
		fire(p) {
			const s = this.state;
			if (p.down || p.bow !== "idle" || s.phase !== "cave") return false;
			if (s.quiver <= 0 && !this.cheats.infiniteAmmo) {
				this.event("dry-fire", { x: p.x, y: p.y });
				this.notice(
					"Empty quiver. Recover a missed shaft, find a cache, or restart this section.",
				);
				return false;
			}
			p.bow = "draw";
			p.draw = this.tunables.arrowDraw;
			p.anim = "bow";
			p.animTime = this.tunables.arrowDraw + this.tunables.arrowRecovery;
			return true;
		}
		release(p) {
			const s = this.state;
			if (s.quiver <= 0 && !this.cheats.infiniteAmmo) {
				p.bow = "idle";
				return;
			}
			if (!this.cheats.infiniteAmmo) s.quiver--;
			const cos = Math.cos(p.aim),
				sin = Math.sin(p.aim),
				x = p.x + cos * 9.15 - sin * 0.488,
				y = p.y + sin * 9.15 + cos * 0.488;
			const a = {
				id: `arrow-${++this.ids}`,
				owner: p.id,
				x,
				y,
				z: 21.96,
				vx: cos * this.tunables.arrowSpeed,
				vy: sin * this.tunables.arrowSpeed,
				life: this.tunables.arrowLife,
				bounces: 0,
				energy: 1,
				hit: [],
				origin: { x: p.x, y: p.y },
				lastSafe: { x: p.x, y: p.y },
			};
			s.arrows.push(a);
			s.stats.shots++;
			s.flags.firstShot = true;
			this.noise("bow", x, y, 0.8, p.id);
			this.event("fire", { x, y, player: p.id, arrow: a.id });
			p.bow = "recover";
			p.recover = this.tunables.arrowRecovery;
		}
		settle(a, why = "land") {
			if (a.spent) return;
			a.spent = true;
			const s = this.state,
				p = this.safePoint(a.lastSafe || a.origin || a);
			let at = p;
			// Recovery sites must be in the same connected floor component as the living party.
			const alive = s.players.find((p) => !p.down);
			if (alive && !this.path(alive, p).length && dist(alive, p) > 20)
				at = this.safePoint(a.origin);
			s.pickups.push({
				id: `recover-${a.id}`,
				kind: "arrows",
				x: at.x,
				y: at.y,
				count: 1,
				recovered: true,
			});
			this.event("arrow-land", { x: at.x, y: at.y, why });
			this.noise("landing", at.x, at.y, 0.35, a.owner);
		}
		hitEnemy(a, e) {
			const _spec = C.creatures[e.kind],
				s = this.state;
			if (e.hp <= 0 || a.hit.includes(e.id)) return false;
			a.hit.push(e.id);
			if (e.kind === "target" && e.requiresBank && a.bounces === 0) {
				this.event("armor", { x: e.x, y: e.y, cue: "gong" });
				this.notice(
					"The gong only answers a reflected shot. Aim at the bevel.",
				);
				this.settle(a, "gong");
				return true;
			}
			if (e.kind === "ooze") {
				this.event("ooze-shed", { x: e.x, y: e.y });
				this.notice(
					"The ooze sheds the shaft. Lure it; use the other passage.",
				);
				a.lastSafe = { x: a.x, y: a.y };
				this.settle(a, "ooze");
				return true;
			}
			const [vx, vy] = norm(a.vx, a.vy),
				front = vx * Math.cos(e.aim) + vy * Math.sin(e.aim) < -0.35;
			if (e.kind === "guardian1" && front && a.bounces === 0) {
				this.event("armor", { x: e.x, y: e.y });
				this.notice("Bronze armor turns the shot. Flank it, or bank a shaft.");
				this.settle(a, "armor");
				return true;
			}
			if (e.kind === "guardian2" && (e.state !== "recover" || e.woundedCycle)) {
				this.event("armor", { x: e.x, y: e.y });
				this.notice(
					"Galeglass is shielded while it breathes. Shoot as its light dims.",
				);
				this.settle(a, "armor");
				return true;
			}
			a.spent = true;
			e.hp--;
			if (e.kind === "guardian2") e.woundedCycle = true;
			s.stats.hits++;
			this.event("enemy-hit", {
				x: e.x,
				y: e.y,
				kind: e.kind,
				hp: e.hp,
				arrow: a.id,
			});
			this.noise("hit", e.x, e.y, 0.95, a.owner);
			if (e.kind === "target") {
				s.flags.bankLesson = true;
				this.pathCache.clear();
				this.say(
					"The banked shaft rings true. Roots unfold into a bridge. The useful shot is not always the straight one.",
				);
				this.event("bank-lesson", { x: e.x, y: e.y });
			}
			if (e.hp <= 0) {
				e.state = "defeated";
				e.timer = 1.4;
				e.defeatedAt = s.time;
				this.event("enemy-defeat", { kind: e.kind, x: e.x, y: e.y });
			} else {
				e.state = "stunned";
				e.timer = e.kind.startsWith("guardian") ? 0.7 : 0.45;
				e.target = { x: a.origin.x, y: a.origin.y };
				if (e.kind === "guardian1") e.mustSwoop = true;
			}
			return true;
		}
		arrowCollision(a, dx, dy) {
			let best = null;
			const cave = this.getCave(),
				r = 1.2,
				x0 = Math.floor((Math.min(a.x, a.x + dx) - r) / T),
				x1 = Math.floor((Math.max(a.x, a.x + dx) + r) / T),
				y0 = Math.floor((Math.min(a.y, a.y + dy) - r) / T),
				y1 = Math.floor((Math.max(a.y, a.y + dy) + r) / T);
			for (let cy = y0; cy <= y1; cy++)
				for (let cx = x0; cx <= x1; cx++)
					if (this.wall(cx, cy)) {
						const hit = M.segmentBox(
							a.x,
							a.y,
							dx,
							dy,
							cx * T - r,
							cy * T - r,
							(cx + 1) * T + r,
							(cy + 1) * T + r,
						);
						if (hit && (!best || hit.t < best.t))
							best = { ...hit, kind: "wall" };
					}
			for (const bank of cave.banks || []) {
				const hit = M.segmentBank(a.x, a.y, dx, dy, bank, 1.5);
				if (hit && (!best || hit.t < best.t)) best = { ...hit, kind: "wall" };
			}
			for (const e of this.state.enemies)
				if (e.hp > 0 && !a.hit.includes(e.id)) {
					const t = M.segmentCircle(
						a.x,
						a.y,
						dx,
						dy,
						e.x,
						e.y,
						C.creatures[e.kind].r + 1,
					);
					if (t !== null && (!best || t < best.t))
						best = { t, kind: "enemy", target: e };
				}
			if (a.bounces > 0)
				for (const p of this.state.players)
					if (
						p.id === a.owner &&
						!p.down &&
						!a.hit.includes(`player-${p.id}`)
					) {
						const t = M.segmentCircle(a.x, a.y, dx, dy, p.x, p.y, 6);
						if (t !== null && (!best || t < best.t))
							best = { t, kind: "player", target: p };
					}
			return best;
		}
		stepArrows(dt) {
			for (const a of this.state.arrows) {
				if (a.spent) continue;
				a.life -= dt;
				let left = dt;
				for (
					let contacts = 0;
					contacts < 8 && left > 1e-5 && !a.spent;
					contacts++
				) {
					const dx = a.vx * left,
						dy = a.vy * left,
						hit = this.arrowCollision(a, dx, dy);
					if (!hit) {
						a.x += dx;
						a.y += dy;
						left = 0;
						break;
					}
					a.x += dx * hit.t;
					a.y += dy * hit.t;
					left *= 1 - hit.t;
					if (hit.kind === "enemy") {
						this.hitEnemy(a, hit.target);
						break;
					}
					if (hit.kind === "player") {
						a.hit.push(`player-${hit.target.id}`);
						this.damage(hit.target, 1, "ricochet");
						a.spent = true;
						this.event("self-hit", { x: a.x, y: a.y });
						break;
					}
					a.bounces++;
					this.state.stats.banks++;
					this.noise("bank", a.x, a.y, 1.35, a.owner);
					this.event("bank", {
						x: a.x,
						y: a.y,
						arrow: a.id,
						bank: hit.bank || null,
					});
					const [vx, vy] = M.reflect(a.vx, a.vy, hit.nx, hit.ny);
					a.vx = vx * 0.83;
					a.vy = vy * 0.83;
					a.energy *= 0.83;
					a.x += hit.nx * 0.08;
					a.y += hit.ny * 0.08;
					if (a.bounces >= Math.round(this.tunables.reflections)) {
						this.settle(a, "reflections");
						break;
					}
				}
				if (this.clearAt(a.x, a.y, 4)) a.lastSafe = { x: a.x, y: a.y };
				if (a.life <= 0 && !a.spent) this.settle(a, "spent-flight");
			}
			this.state.arrows = this.state.arrows.filter((a) => !a.spent);
		}
		damage(p, n = 1, cause = "creature") {
			if (p.down || p.invuln > 0 || p.dash > 0 || this.cheats.infiniteHealth)
				return false;
			p.hp = Math.max(0, p.hp - n);
			p.invuln = this.tunables.immunity;
			p.bow = "idle";
			p.draw = 0;
			p.anim = "hurt";
			p.animTime = 0.4;
			this.state.stats.damage += n;
			this.event("hurt", { player: p.id, x: p.x, y: p.y, cause, hp: p.hp });
			if (p.hp <= 0) {
				p.down = 10;
				p.anim = "down";
				p.animTime = 10;
				p.vx = p.vy = 0;
				this.state.stats.deaths++;
				this.event("down", { player: p.id, x: p.x, y: p.y });
			}
			return true;
		}
		deathRecovery() {
			const s = this.state,
				down = s.players.filter((p) => p.down > 0);
			if (!down.length) return;
			if (down.length === s.players.length) {
				this.spendReserve(true);
				return;
			}
			for (const p of down) if (p.down <= 0.001) this.spendReserve(false, p);
		}
		spendReserve(wipe, p = null) {
			const s = this.state;
			s.reserves = Math.max(0, s.reserves - 1);
			this.resumeRevision++;
			this.event("reserve-spent", { reserves: s.reserves, wipe });
			if (s.reserves <= 0) {
				this.defeat();
				return;
			}
			if (wipe) {
				const reserves = s.reserves,
					stats = copy(s.stats),
					ids = s.players.map((p) => p.id);
				this.state = copy(this.checkpoint);
				this.rescaleSupplies();
				this.state.reserves = reserves;
				this.state.stats = stats;
				this.state.players = this.state.players.filter((p) =>
					ids.includes(p.id),
				);
				for (const id of ids)
					if (!this.state.players.some((p) => p.id === id)) this.join(id);
				this.state.players.forEach((p) => {
					p.hp = 3;
					p.down = 0;
					p.invuln = 3;
				});
				this.clearInput();
				this.notice(
					"A reserve ranger takes up the trail. The section begins again.",
					5,
				);
				this.event("respawn");
			} else if (p) {
				const at = this.safePoint(
					this.state.players.find((q) => !q.down) || {
						x: this.getCave().spawn[0],
						y: this.getCave().spawn[1],
					},
				);
				Object.assign(p, {
					x: at.x,
					y: at.y,
					hp: 3,
					down: 0,
					invuln: 3,
					revive: 0,
					anim: "revive",
					animTime: 1,
				});
				this.event("respawn", { player: p.id });
			}
		}
		updatePlayers(dt) {
			const s = this.state;
			for (const p of s.players) {
				const cmd = this.commands.get(String(p.id)) || {
					mx: 0,
					my: 0,
					ax: Math.cos(p.aim),
					ay: Math.sin(p.aim),
					actions: [],
					age: 0,
				};
				cmd.age += dt;
				if (cmd.age > 0.45) {
					cmd.mx = cmd.my = 0;
					cmd.focus = cmd.sprint = cmd.heldInteract = false;
				}
				p.invuln = Math.max(0, p.invuln - dt);
				p.dashCooldown = Math.max(0, p.dashCooldown - dt);
				p.animTime = Math.max(0, p.animTime - dt);
				if (p.down > 0) {
					p.down = Math.max(0.0001, p.down - dt);
					if (p.down <= 0.0001 && s.players.some((q) => !q.down))
						this.spendReserve(false, p);
					cmd.actions = [];
					continue;
				}
				const l = Math.hypot(cmd.ax, cmd.ay);
				if (l > 0.18) p.aim = Math.atan2(cmd.ay, cmd.ax);
				p.focus = !!cmd.focus;
				for (const a of cmd.actions.splice(0)) {
					if (a.type === "fire") this.fire(p);
					else if (a.type === "interact") this.interact(p);
					else if (a.type === "dash" && p.dashCooldown <= 0) {
						p.dash = 0.18;
						p.dashCooldown = this.tunables.dashCooldown;
						p.dashDir =
							Math.hypot(cmd.mx, cmd.my) > 0.1
								? Math.atan2(cmd.my, cmd.mx)
								: p.aim;
						p.anim = "dash";
						p.animTime = 0.22;
						this.noise("dash", p.x, p.y, 1.05, p.id);
					} else if (a.type === "quiver")
						this.event("quiver", { count: s.quiver, x: p.x, y: p.y });
					else if (a.type === "travel") this.travel(p.id, a.target);
				}
				if (s.phase !== "cave") continue;
				if (p.bow === "draw") {
					p.draw -= dt;
					if (p.draw <= 0) this.release(p);
				} else if (p.bow === "recover") {
					p.recover -= dt;
					if (p.recover <= 0) p.bow = "idle";
				}
				let mx = cmd.mx,
					my = cmd.my,
					ml = Math.hypot(mx, my);
				if (ml > 1) {
					mx /= ml;
					my /= ml;
				}
				const speed = p.focus
					? this.tunables.focusSpeed
					: cmd.sprint
						? this.tunables.runSpeed
						: this.tunables.moveSpeed;
				p.vx = mx * speed;
				p.vy = my * speed;
				if (p.dash > 0) {
					p.dash = Math.max(0, p.dash - dt);
					p.vx = Math.cos(p.dashDir) * this.tunables.dashSpeed;
					p.vy = Math.sin(p.dashDir) * this.tunables.dashSpeed;
				}
				// Party separation is a visible soft tether before the hard, generous boundary.
				const other = s.players.find((q) => q.id !== p.id && !q.down);
				p.tether = other ? dist(p, other) : 0;
				if (other && p.tether > 250) {
					const dot = (p.x - other.x) * p.vx + (p.y - other.y) * p.vy;
					if (dot > 0) {
						p.vx = 0;
						p.vy = 0;
						this.notice(
							"The other ranger is near the end of your lantern rope.",
							2,
						);
					}
				}
				this.moveActor(p, p.vx, p.vy, dt, 5);
				if (Math.hypot(p.vx, p.vy) > 4) {
					p.stepClock -= dt;
					if (p.stepClock <= 0) {
						p.stepClock = p.focus ? 0.6 : cmd.sprint ? 0.22 : 0.4;
						this.noise(
							p.focus ? "quiet-step" : cmd.sprint ? "run" : "step",
							p.x,
							p.y,
							(p.focus ? 0.12 : cmd.sprint ? 0.8 : 0.35) *
								this.tunables.footNoise,
							p.id,
						);
					}
				}
				if (cmd.heldInteract) {
					const q = s.players.find(
						(q) => q.id !== p.id && q.down > 0 && dist(p, q) < 31,
					);
					if (q) {
						q.revive += dt;
						if (q.revive >= 1.5) {
							q.hp = 2;
							q.down = 0;
							q.invuln = 2;
							q.revive = 0;
							q.anim = "revive";
							q.animTime = 0.8;
							s.stats.revives++;
							this.event("revive", { player: q.id, x: q.x, y: q.y });
						}
					}
				}
				if (p.animTime <= 0)
					p.anim = p.focus
						? "listen"
						: Math.hypot(p.vx, p.vy) > 1
							? cmd.sprint
								? "run"
								: "walk"
							: "idle";
			}
		}
		enemyMove(e, target, speed, dt) {
			const radius = Math.min(C.creatures[e.kind].r, 8);
			let v;
			if (this.moveClear(e, target, radius))
				v = norm(target.x - e.x, target.y - e.y);
			else {
				const point = this.path(e, target, radius)[0];
				if (!point) {
					e.vx = e.vy = 0;
					return;
				}
				v = norm(point.x - e.x, point.y - e.y);
			}
			e.vx = v[0] * speed;
			e.vy = v[1] * speed;
			this.moveActor(e, e.vx, e.vy, dt, radius);
			if (Math.hypot(e.vx, e.vy) > 0.1) e.aim = Math.atan2(e.vy, e.vx);
		}

		chooseTarget(e) {
			const players = this.state.players.filter(
				(p) => !p.down && this.lineClear(e.x, e.y, p.x, p.y),
			);
			return players.sort((a, b) => dist(e, a) - dist(e, b))[0] || null;
		}
		startAttack(e, p) {
			const spec = C.creatures[e.kind];
			e.state = "windup";
			e.timer = e.kind.startsWith("guardian")
				? this.tunables.guardianWindup
				: spec.windup;
			e.attackDir = p ? Math.atan2(p.y - e.y, p.x - e.x) : e.aim;
			e.aim = e.attackDir;
			e.hitPlayers = [];
			e.woundedCycle = false;
			e.attackOrigin = { x: e.x, y: e.y };
			e.phase = (e.phase || 0) + 1;
			this.event("telegraph", {
				kind: e.kind,
				x: e.x,
				y: e.y,
				angle: e.attackDir,
				duration: e.timer,
				phase: e.phase,
			});
			this.noise(spec.cue, e.x, e.y, 1.1, null);
		}
		updateEnemies(dt) {
			const s = this.state;
			for (const e of s.enemies) {
				const spec = C.creatures[e.kind];
				e.timer = Math.max(0, e.timer - dt);
				e.cueClock -= dt;
				e.vx = e.vy = 0;
				if (e.hp <= 0) continue;
				if (e.kind === "target") continue;
				if (e.tutorial && !(s.flags.firstShot && s.flags.recovered)) continue;
				if (e.cueClock <= 0) {
					e.cueClock = 4.5 + (e.kind === "bat" ? 0 : ((e.x + e.y) % 7) * 0.13);
					this.noise(
						spec.cue,
						e.x,
						e.y,
						e.kind.startsWith("guardian") ? 1.8 : 0.65,
						null,
					);
				}
				let strongest = null,
					strength = 0;
				if (["dormant", "investigate", "alert"].includes(e.state))
					for (const n of s.noise) {
						if (n.owner === null || n.id <= e.heard || s.time - n.time > 1.6)
							continue;
						const d = this.acoustic(e, n, 360);
						const value = (n.loudness * this.tunables.hearing) / (1 + d / 70);
						if (value > spec.hearing && value > strength) {
							strongest = n;
							strength = value;
						}
					}
				if (strongest) {
					e.heard = strongest.id;
					e.target = { x: strongest.x, y: strongest.y };
					e.state = "investigate";
					e.timer = 5;
					this.event("investigate", {
						enemy: e.id,
						x: e.x,
						y: e.y,
						origin: copy(e.target),
					});
				}
				const p = this.chooseTarget(e),
					pd = p ? dist(e, p) : Infinity,
					detect = spec.range + 35;
				if (
					["dormant", "alert", "investigate"].includes(e.state) &&
					p &&
					pd < detect &&
					e.kind !== "ooze"
				) {
					// An approach always earns a visible/audible windup, including from sleep.
					if (pd <= spec.range) this.startAttack(e, p);
					else {
						e.state = "investigate";
						e.target = { x: p.x, y: p.y };
						e.timer = 3;
					}
				}
				if (
					e.kind === "spider" &&
					["dormant", "investigate"].includes(e.state)
				) {
					const shaft = s.pickups.find(
						(q) => q.recovered && q.count > 0 && dist(e, q) < 95,
					);
					if (shaft) {
						e.target = { x: shaft.x, y: shaft.y };
						e.state = "investigate";
						if (dist(e, shaft) < 15) {
							const stash = s.pickups.find((q) => q.stash);
							if (stash) {
								stash.count += shaft.count;
								if (!stash.recovered)
									stash._recoveredUnits =
										(stash._recoveredUnits || 0) + shaft.count;
							} else {
								s.pickups.push({
									id: `stash-${e.id}`,
									kind: "arrows",
									x: e.stash?.[0] || e.home[0],
									y: e.stash?.[1] || e.home[1],
									count: shaft.count,
									stash: true,
									recovered: true,
								});
							}
							shaft.count = 0;
							this.event("theft", { x: e.x, y: e.y });
							this.notice("A spider drags the shaft toward its silver stash.");
						}
					}
				}
				if (e.state === "investigate") {
					if (e.target && dist(e, e.target) > 10) {
						this.enemyMove(
							e,
							e.target,
							spec.speed * this.tunables.enemySpeed,
							dt,
						);
					} else if (e.timer <= 0) e.state = "dormant";
					if (e.kind === "ooze" && p && pd < spec.range) this.startAttack(e, p);
				} else if (e.state === "stunned") {
					if (e.timer <= 0) {
						if (e.mustSwoop) {
							e.mustSwoop = false;
							this.startAttack(e, p);
						} else if (e.kind === "guardian2") {
							e.state = "dormant";
							e.timer = 0;
						} else {
							e.state = "recover";
							e.timer = e.kind.startsWith("guardian")
								? this.tunables.guardianRecovery
								: spec.recovery;
						}
					}
				} else if (e.state === "windup") {
					if (e.timer <= 0) {
						e.state = "attack";
						e.timer = spec.attackTime;
						this.event("attack", {
							kind: e.kind,
							x: e.x,
							y: e.y,
							angle: e.attackDir,
							phase: e.phase,
						});
					}
				} else if (e.state === "attack") {
					const breath = e.kind === "guardian2",
						speed = breath
							? 0
							: e.kind === "ooze"
								? 20
								: e.kind === "guardian1"
									? 185
									: e.kind === "snake"
										? 137
										: e.kind === "drake"
											? 160
											: 125;
					if (speed) {
						e.vx = Math.cos(e.attackDir) * speed * this.tunables.enemySpeed;
						e.vy = Math.sin(e.attackDir) * speed * this.tunables.enemySpeed;
						this.moveActor(e, e.vx, e.vy, dt, Math.min(spec.r, 8));
					}
					for (const q of s.players) {
						if (q.down || e.hitPlayers.includes(q.id)) continue;
						let hit = false;
						if (breath) {
							const dx = q.x - e.x,
								dy = q.y - e.y,
								along = dx * Math.cos(e.attackDir) + dy * Math.sin(e.attackDir),
								across = Math.abs(
									-dx * Math.sin(e.attackDir) + dy * Math.cos(e.attackDir),
								);
							hit =
								along > 0 &&
								along < 195 &&
								across < 19 &&
								this.lineClear(e.x, e.y, q.x, q.y);
						} else hit = dist(e, q) < spec.r + 7;
						if (hit) {
							e.hitPlayers.push(q.id);
							this.damage(q, this.tunables.enemyDamage, e.kind);
						}
					}
					if (e.timer <= 0) {
						e.state = "recover";
						e.timer = e.kind.startsWith("guardian")
							? this.tunables.guardianRecovery
							: spec.recovery;
						this.event("recovery", {
							kind: e.kind,
							x: e.x,
							y: e.y,
							duration: e.timer,
						});
					}
				} else if (e.state === "recover" && e.timer <= 0) {
					e.state = "dormant";
					e.target = null;
				}
			}
			s.pickups = s.pickups.filter((q) => q.count > 0);
		}
		clues() {
			const s = this.state,
				cave = this.getCave();
			for (const p of s.players) {
				if (p.down) continue;
				const room = cave.rooms.find(
					(r) =>
						p.x >= r.x * T &&
						p.x < (r.x + r.w) * T &&
						p.y >= r.y * T &&
						p.y < (r.y + r.h) * T,
				);
				if (room && !s.flags[`seen:${room.id}`]) {
					s.flags[`seen:${room.id}`] = true;
					s.room = room.name;
					this.say(room.tip, 6);
					this.event("room", { idRoom: room.id, name: room.name });
				}
			}
			// Captions use the first navigable step, never a through-wall silhouette.
			const hearer = s.players.find((p) => !p.down);
			s.cues = [];
			if (hearer)
				for (const n of s.noise) {
					if (n.owner !== null || s.time - n.time > 0.9) continue;
					const d = this.acoustic(hearer, n, 230);
					if (!Number.isFinite(d) || d > 190) continue;
					const path = this.path(hearer, n),
						first = path[0] || n,
						dx = first.x - hearer.x,
						dy = first.y - hearer.y,
						dir =
							Math.abs(dx) > Math.abs(dy)
								? dx > 0
									? "east"
									: "west"
								: dy > 0
									? "south"
									: "north";
					const spec = Object.values(C.creatures).find((c) => c.cue === n.kind);
					if (spec)
						s.cues.push({
							id: n.id,
							kind: n.kind,
							direction: dir,
							text: spec.caption,
							masked: s.noise.some(
								(q) => q.kind === "wings" && s.time - q.time < 0.6,
							),
						});
					if (s.cues.length >= 2) break;
				}
		}
		step(dt) {
			if (!Number.isFinite(dt) || dt <= 0) return;
			dt = Math.min(dt, 0.05) * this.tunables.timeScale;
			if (dt <= 0) return;
			const s = this.state;
			s.tick++;
			s.time += dt;
			if (s.phase === "cave" || s.phase === "map") {
				s.stats.elapsed += dt;
			}
			s.noticeTime = Math.max(0, s.noticeTime - dt);
			if (s.phase === "victory" || s.phase === "defeat") return;
			if (s.transition) {
				s.transition.time += dt;
				if (s.transition.time >= s.transition.duration) {
					const tr = s.transition;
					if (tr.kind === "travel") this.arrive(tr.to);
					else this.completeCave();
				}
				return;
			}
			this.updatePlayers(dt);
			if (this.state !== s) return;
			if (s.phase === "cave") {
				this.stepArrows(dt);
				this.updateEnemies(dt);
				this.deathRecovery();
				if (this.state !== s || s.phase !== "cave") return;
				s.noise = s.noise.filter((n) => s.time - n.time < n.life);
				this.visClock -= dt;
				if (this.visClock <= 0) {
					this.visClock = 0.08;
					this.updateVisibility();
					this.clues();
				}
			}
			s.objective = this.objective();
		}
		authoredSupply(pick) {
			return (
				pick.kind === "arrows" &&
				!pick.recovered &&
				!!this.getCave()?.pickups.some(
					(p) => p.id === pick.id && p.kind === "arrows",
				)
			);
		}
		scaledSupply(base) {
			return base > 0
				? Math.max(1, Math.round(base * this.tunables.supplyYield))
				: 0;
		}
		rescaleSupplies() {
			for (const pick of this.state.pickups)
				if (this.authoredSupply(pick)) {
					if (!Number.isFinite(pick._supplyBase))
						pick._supplyBase = Math.max(
							0,
							pick.count - (pick._recoveredUnits || 0),
						);
					pick.count =
						this.scaledSupply(pick._supplyBase) + (pick._recoveredUnits || 0);
				}
		}
		setTunable(key, value) {
			if (this.readOnly || this.state.mode === "hub") return false;
			const slider = K.sliders.find((s) => s.key === key);
			if (!slider || !Number.isFinite(value)) return false;
			this.tunables[key] = clamp(value, slider.min, slider.max);
			if (key === "supplyYield") this.rescaleSupplies();
			this.state.stats.assisted = true;
			return true;
		}
		resetTunables() {
			if (this.readOnly || this.state.mode === "hub") return false;
			this.tunables = { ...K.defaults };
			this.rescaleSupplies();
			return true;
		}
		dev(action, value) {
			if (this.readOnly || this.state.mode === "hub") return false;
			this.state.stats.assisted = true;
			if (action === "continue") {
				this.assistedContinue();
				return true;
			}
			if (action === "health") action = "heal";
			if (action === "heal") {
				this.state.players.forEach((p) => {
					p.hp = 3;
					p.down = 0;
					p.invuln = 3;
				});
				this.state.reserves = 3;
			} else if (action in this.cheats)
				this.cheats[action] =
					value === undefined ? !this.cheats[action] : !!value;
			else if (action === "warp" && C.caves[value]) {
				this.enterCave(value);
				this.state.stats.assisted = true;
			} else if (action === "spawn" && C.creatures[value] && this.getCave()) {
				const p = this.state.players[0],
					at = this.safePoint({ x: p.x + 48, y: p.y }, C.creatures[value].r);
				this.state.enemies.push({
					id: `dev-${++this.ids}`,
					kind: value,
					...at,
					z: 0,
					aim: Math.PI,
					state: "dormant",
					timer: 0,
					phase: 0,
					hp: C.creatures[value].hp,
					maxHp: C.creatures[value].hp,
					home: [at.x, at.y],
					cueClock: 1,
					heard: 0,
					target: null,
					hitPlayers: [],
					attackDir: 0,
				});
			} else if (action === "seed" && Number.isSafeInteger(Number(value)))
				this.state.seed = Number(value);
			else if (action === "restart") this.restart();
			else return false;
			return true;
		}
	}
	G.DTSim = { Simulation, geometry: M, createPlayer };
})(globalThis);
