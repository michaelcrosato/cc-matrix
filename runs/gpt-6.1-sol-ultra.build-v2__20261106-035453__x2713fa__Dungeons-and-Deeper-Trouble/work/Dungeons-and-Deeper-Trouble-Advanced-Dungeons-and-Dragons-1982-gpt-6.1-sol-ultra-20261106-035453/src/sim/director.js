((G) => {
	const _C = G.DTContent,
		T = 16,
		d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
		at = (x, y) => ({ x: (x + 0.5) * T, y: (y + 0.5) * T });
	// A read-only action director for acceptance/replay. It only calls the public submit API.
	// It never edits state, grants supplies, changes tunables, warps, or bypasses a guardian phase.
	class ExpeditionDirector {
		constructor(sim, id = 1) {
			this.sim = sim;
			this.id = id;
			this.seq = sim.state.players.find((p) => p.id === id)?.lastAction || 0;
			this.cave = null;
			this.tasks = [];
			this.done = false;
			this.errors = [];
			this.beat = 0;
			this.elapsed = 0;
			this.stage = 0;
			this.pending = null;
			this.lastTick = -1;
			this.progress = [];
		}
		command(type, target) {
			return { id: ++this.seq, type, ...(target ? { target } : {}) };
		}
		input(overrides = {}) {
			const p = this.sim.state.players.find(
				(p) => String(p.id) === String(this.id),
			);
			return {
				mx: 0,
				my: 0,
				ax: Math.cos(p?.aim || 0),
				ay: Math.sin(p?.aim || 0),
				focus: false,
				sprint: false,
				heldInteract: false,
				actions: [],
				...overrides,
			};
		}
		go(point, cmd, stop = 8) {
			const p = this.sim.state.players.find(
				(p) => String(p.id) === String(this.id),
			);
			if (d(p, point) <= stop) return true;
			const route = this.sim.path(p, point),
				next = this.sim.moveClear(p, point, 5)
					? point
					: route.find((q) => d(p, q) > 7) || point;
			const dx = next.x - p.x,
				dy = next.y - p.y,
				l = Math.hypot(dx, dy) || 1;
			cmd.mx = dx / l;
			cmd.my = dy / l;
			cmd.sprint = true;
			return false;
		}
		plan(id) {
			const pickup = (id) => ({ kind: "pickup", id }),
				go = (x, y) => ({ kind: "goto", point: at(x, y) });
			if (id === "chalk")
				return [
					pickup("chalk-rest-quiver"),
					{ kind: "tutorial" },
					pickup("chalk-fork-quiver"),
					pickup("chalk-cairn-treasure"),
					pickup("chalk-axe"),
					{ kind: "exit" },
				];
			if (id === "root")
				return [
					pickup("root-bank-quiver"),
					{ kind: "bank" },
					pickup("root-web-stash"),
					pickup("root-ferry-quiver"),
					pickup("root-risk-cache"),
					pickup("root-boat"),
					{ kind: "exit" },
				];
			if (id === "tide")
				return [
					pickup("tide-landing-quiver"),
					{ kind: "ooze" },
					pickup("tide-ink-quiver"),
					go(46, 10),
					pickup("tide-vault-quiver"),
					pickup("tide-drowned-treasure"),
					pickup("tide-key"),
					{ kind: "exit" },
				];
			if (id === "ember")
				return [
					pickup("ember-entry-quiver"),
					pickup("ember-niche-quiver"),
					pickup("ember-niche-heart"),
					pickup("ember-arena-quiver"),
					pickup("ember-half"),
					{ kind: "exit" },
				];
			return [
				pickup("rime-entry-quiver"),
				pickup("rime-web-stash"),
				pickup("rime-niche-treasure"),
				pickup("rime-arena-quiver"),
				pickup("rime-half"),
				{ kind: "exit" },
			];
		}
		combat(e, cmd) {
			const s = this.sim.state,
				p = s.players.find((p) => String(p.id) === String(this.id)),
				kind = e.kind,
				dx = e.x - p.x,
				dy = e.y - p.y,
				l = Math.hypot(dx, dy) || 1;
			cmd.ax = dx / l;
			cmd.ay = dy / l;
			if (!this.sim.moveClear(p, e, 5)) {
				this.go(e, cmd, 8);
				return;
			}
			if (s.quiver <= 0) {
				const supply = s.pickups
					.filter((q) => q.kind === "arrows" && q.count > 0)
					.sort((a, b) => d(p, a) - d(p, b))[0];
				if (supply) {
					if (this.go(supply, cmd, 23))
						cmd.actions.push(this.command("interact"));
				}
				return;
			}
			const attacking = e.state === "windup" || e.state === "attack";
			if (kind === "guardian1") {
				if (attacking) {
					const across =
						(p.x - e.attackOrigin.x) * -Math.sin(e.attackDir) +
						(p.y - e.attackOrigin.y) * Math.cos(e.attackDir);
					const sign = across >= 0 ? 1 : -1;
					const goal = {
						x: p.x - Math.sin(e.attackDir) * sign * 70,
						y: p.y + Math.cos(e.attackDir) * sign * 70,
					};
					if (Math.abs(across) < 57) this.go(this.sim.safePoint(goal), cmd, 6);
				} else {
					const angle = e.aim + Math.PI / 2,
						goal = this.sim.safePoint({
							x: e.x + Math.cos(angle) * 75,
							y: e.y + Math.sin(angle) * 75,
						});
					const incoming = -cmd.ax * Math.cos(e.aim) - cmd.ay * Math.sin(e.aim);
					if (incoming > 0.35 || l < 48) this.go(goal, cmd, 10);
					else if (p.bow === "idle") cmd.actions.push(this.command("fire"));
				}
				return;
			}
			if (kind === "guardian2") {
				if (attacking) {
					const across =
							(p.x - e.x) * -Math.sin(e.attackDir) +
							(p.y - e.y) * Math.cos(e.attackDir),
						sign = across >= 0 ? 1 : -1;
					if (Math.abs(across) < 55) {
						const goal = this.sim.safePoint({
							x: p.x - Math.sin(e.attackDir) * sign * 80,
							y: p.y + Math.cos(e.attackDir) * sign * 80,
						});
						this.go(goal, cmd, 7);
					}
				} else if (e.state === "recover" && !e.woundedCycle && p.bow === "idle")
					cmd.actions.push(this.command("fire"));
				else if (l > 140) this.go(e, cmd, 115);
				return;
			}
			if (attacking) {
				const dir = e.attackDir,
					origin = e.attackOrigin || e,
					across =
						(p.x - origin.x) * -Math.sin(dir) +
						(p.y - origin.y) * Math.cos(dir),
					sign = across >= 0 ? 1 : -1;
				if (Math.abs(across) < 30 && l < 145) {
					const goal = this.sim.safePoint({
						x: p.x - Math.sin(dir) * sign * 70,
						y: p.y + Math.cos(dir) * sign * 70,
					});
					this.go(goal, cmd, 5);
					if (e.state === "attack" && l < 55 && p.dashCooldown <= 0)
						cmd.actions.push(this.command("dash"));
				}
			}
			if (l > 145) this.go(e, cmd, 110);
			if (p.bow === "idle") cmd.actions.push(this.command("fire"));
		}
		update(dt = 1 / 120) {
			if (this.done) return;
			this.elapsed += dt;
			const sim = this.sim,
				s = sim.state,
				p = s.players.find((p) => String(p.id) === String(this.id));
			if (!p) {
				this.done = true;
				this.errors.push("Director seat removed");
				return;
			}
			this.seq = Math.max(this.seq, p.lastAction || 0);
			const cmd = this.input();
			if (s.phase === "victory") {
				this.done = true;
				this.progress.push("victory");
				return;
			}
			if (s.phase === "defeat") {
				this.done = true;
				this.errors.push("Expedition defeated");
				return;
			}
			if (s.transition) {
				sim.submit(this.id, cmd);
				return;
			}
			if (s.phase === "map") {
				const target = !s.tools.axe
					? "chalk"
					: !s.tools.boat
						? s.node === "chalk"
							? "forest"
							: "root"
						: !s.tools.key
							? s.node === "root"
								? "river"
								: "tide"
							: s.node === "tide"
								? "wall"
								: "summit";
				cmd.actions.push(this.command("travel", target));
				sim.submit(this.id, cmd);
				return;
			}
			if (this.cave !== s.cave) {
				this.cave = s.cave;
				this.tasks = this.plan(s.cave);
				this.stage = 0;
				this.beat = 0;
				this.progress.push(s.cave);
			}
			const task = this.tasks[0];
			if (!task) {
				sim.submit(this.id, cmd);
				return;
			}
			const threat = s.enemies
				.filter(
					(e) =>
						e.hp > 0 &&
						e.kind !== "ooze" &&
						e.kind !== "target" &&
						sim.isVisible(e.x, e.y) &&
						d(p, e) < 180,
				)
				.sort((a, b) => d(p, a) - d(p, b))[0];
			if (
				threat &&
				!(task.kind === "tutorial" && !(s.flags.firstShot && s.flags.recovered))
			) {
				this.combat(threat, cmd);
				sim.submit(this.id, cmd);
				return;
			}
			let finished = false;
			if (task.kind === "pickup") {
				const item = s.pickups.find((q) => q.id === task.id);
				if (!item || item.count <= 0) finished = true;
				else if (item.kind === "heart" && p.hp === 3) finished = true;
				else if (
					item.kind === "arrows" &&
					s.quiver === sim.tunables.quiverCapacity
				)
					finished = true;
				else if (
					sim.getCave().enemies.find((e) => e.id === item.guard) &&
					s.enemies.find((e) => e.id === item.guard)?.hp > 0
				) {
					const guard = s.enemies.find((e) => e.id === item.guard);
					if (d(p, guard) < 170) this.combat(guard, cmd);
					else this.go(item, cmd, 110);
				} else if (this.go(item, cmd, 22))
					cmd.actions.push(this.command("interact"));
			} else if (task.kind === "goto") finished = this.go(task.point, cmd, 10);
			else if (task.kind === "exit") {
				const cave = sim.getCave(),
					guard = s.enemies.find((e) => e.id === cave.exit.guard && e.hp > 0);
				if (guard && d(p, guard) < 180) this.combat(guard, cmd);
				else if (this.go(cave.exit, cmd, 24))
					cmd.actions.push(this.command("interact"));
			} else if (task.kind === "tutorial") {
				if (this.stage === 0) {
					if (this.go(at(23, 26), cmd, 5)) {
						cmd.ax = 0;
						cmd.ay = -1;
						cmd.actions.push(this.command("fire"));
						this.stage = 1;
						this.beat = 0;
					}
				} else if (this.stage === 1) {
					cmd.mx = -1;
					cmd.sprint = true;
					this.beat += dt;
					if (this.beat > 1.4) {
						this.stage = 2;
					}
				} else {
					const shaft = s.pickups.find((q) => q.recovered);
					if (shaft) {
						if (this.go(shaft, cmd, 22))
							cmd.actions.push(this.command("interact"));
					}
					if (s.flags.recovered) finished = true;
				}
			} else if (task.kind === "bank") {
				if (s.flags.bankLesson) finished = true;
				else if (this.stage === 0) {
					if (this.go(at(24, 24), cmd, 3)) {
						cmd.ax = 3 / Math.sqrt(34);
						cmd.ay = 5 / Math.sqrt(34);
						cmd.actions.push(this.command("fire"));
						this.stage = 1;
						this.beat = 0;
					}
				} else {
					this.beat += dt;
					if (this.beat > 1.5) {
						this.stage = 0;
					}
				}
			} else if (task.kind === "ooze") {
				const ooze = s.enemies.find((e) => e.kind === "ooze");
				if (this.stage === 0) {
					if (this.go(at(21, 29), cmd, 5)) {
						const dx = ooze.x - p.x,
							dy = ooze.y - p.y,
							l = Math.hypot(dx, dy);
						cmd.ax = dx / l;
						cmd.ay = dy / l;
						cmd.actions.push(this.command("fire"));
						this.stage = 1;
						this.beat = 0;
					}
				} else if (this.stage === 1) {
					this.beat += dt;
					if (this.beat > 0.8) {
						const goal = at(25, 25);
						this.go(goal, cmd, 6);
						if (d(p, goal) < 8) finished = true;
					}
				}
			}
			if (finished) {
				this.tasks.shift();
				this.stage = 0;
				this.beat = 0;
				this.progress.push(`${task.kind}:${task.id || ""}`);
			}
			sim.submit(this.id, cmd);
		}
	}
	G.DTDirector = { ExpeditionDirector };
})(globalThis);
