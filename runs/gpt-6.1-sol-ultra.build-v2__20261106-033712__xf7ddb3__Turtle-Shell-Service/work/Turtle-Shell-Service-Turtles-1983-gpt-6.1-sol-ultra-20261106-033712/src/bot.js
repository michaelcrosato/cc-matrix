/* Legal-input caretaker: attract play and deterministic campaign verification. No simulation edits. */
(() => {
	"use strict";
	const T = (globalThis.TSS = globalThis.TSS || {}),
		E = globalThis.My3D2dge;
	class Bot {
		constructor(sim, o = {}) {
			this.sim = sim;
			this.seats = o.seats || null;
			this.memory = {};
			this.trace = [];
			this.visited = new Set();
			this.confirm = o.confirm !== false;
			this.reactionLead = Math.max(0, Math.min(0.6, +o.reactionLead || 0));
		}
		intents() {
			const sim = this.sim,
				s = sim.state,
				out = {},
				used = new Set();
			for (const p of s.players) {
				if ((this.seats && !this.seats.includes(p.seat)) || !p.active) continue;
				const m =
					this.memory[p.seat] ||
					(this.memory[p.seat] = {
						floor: -1,
						target: null,
						lastBomb: -100,
						waiting: 0,
					});
				if (s.floor !== m.floor) {
					m.floor = s.floor;
					m.target = null;
					m.waiting = 0;
				}
				const i = {
					dir: -1,
					bomb: false,
					confirm: this.confirm && s.phase !== "play",
				};
				out[p.seat] = i;
				if (s.phase !== "play" || p.hurt > 0) continue;
				const cur = p.mover.moving ? p.mover._to : [p.mover.cx, p.mover.cy];
				const live = s.enemies.filter((e) => e.stun <= 0.1 && e.emerge <= 0.2);
				const near = live
					.map((e) => ({ e, d: Math.hypot(e.x - p.x, e.y - p.y) }))
					.sort((a, b) => a.d - b.d);
				const threat = near.find(
					(a) =>
						a.d < 31 + this.reactionLead * 96 &&
						sim.map.los(p.x, p.y, a.e.x, a.e.y),
				);
				const bombNearby =
					s.bomb && Math.hypot(s.bomb.x - p.x, s.bomb.y - p.y) < 8;
				if (threat && !s.bomb && s.stock > 0 && s.tick - m.lastBomb > 2) {
					i.bomb = true;
					m.lastBomb = s.tick;
					m.retreatUntil = s.time + 0.65 + this.reactionLead * 2;
				}
				// The bomb is a defensive trap. Let an approaching beetle reach it, rather than walking into the beetle.
				if (threat && (i.bomb || s.time < (m.retreatUntil || 0))) {
					if (p.mover.moving) {
						const d = T.DIRS[p.dir],
							ahead = (threat.e.x - p.x) * d[0] + (threat.e.y - p.y) * d[1];
						i.dir = ahead > 0 ? (p.dir + 2) % 4 : p.dir;
					} else {
						const ways = sim.grid
							.neighbours(cur)
							.filter((c) => sim.grid.walk(c));
						ways.sort(
							(a, b) =>
								Math.hypot(
									(b[0] + 0.5) * 16 - threat.e.x,
									(b[1] + 0.5) * 16 - threat.e.y,
								) -
								Math.hypot(
									(a[0] + 0.5) * 16 - threat.e.x,
									(a[1] + 0.5) * 16 - threat.e.y,
								),
						);
						if (ways.length) i.dir = sim.directionTo(p, ways[0]);
					}
					continue;
				}
				let target;
				if (p.carry) target = s.homes.find((h) => h.id === p.home);
				else {
					const rooms = s.rooms.filter(
						(r) =>
							!r.delivered &&
							!r.carrier &&
							(!r.revealed || r.outcome === "baby") &&
							!used.has(r.id),
					);
					const prev = rooms.find((r) => r.id === m.target);
					rooms.sort(
						(a, b) =>
							sim.path(cur, a.cell).length - sim.path(cur, b.cell).length ||
							a.id.localeCompare(b.id),
					);
					target = prev || rooms[0];
				}
				if (s.stock <= (this.reactionLead ? 2 : 1) && s.supply.ready) {
					const homeD = target ? sim.path(cur, target.cell).length : 1000,
						supplyD = sim.path(cur, s.supply.cell).length;
					if (!p.carry || s.stock === 0 || supplyD < homeD * 0.75)
						target = { ...s.supply, id: "supply" };
				}
				if (target?.id === "supply" && p.insideSupply) {
					const alternatives = sim.grid
						.neighbours(cur)
						.filter((c) => sim.grid.walk(c));
					if (alternatives.length)
						target = { cell: alternatives[0], id: "supply-exit" };
				}
				if (!target) continue;
				m.target = target.id;
				used.add(target.id);
				const danger = (x, y) => {
					let cost = 1;
					for (const e of live) {
						const d =
							Math.abs((x + 0.5) * 16 - e.x) + Math.abs((y + 0.5) * 16 - e.y);
						if (d < 18) cost += 24;
						else if (d < 34) cost += 9;
						else if (d < 50) cost += 2;
					}
					return cost;
				};
				const nav = new E.Grid(sim.grid.w, sim.grid.h, {
					walkable: (x, y) => sim.grid.walk([x, y]),
					cost: danger,
				});
				let path = nav.path(cur, target.cell);
				if (path.length > 1) {
					i.dir = sim.directionTo(p, path[1]);
				} else if (path.length === 1) {
					// At the goal cell but still in flight: finish the edge. Stops on its centre next step.
					i.dir = -1;
					m.target = null;
				}
				// If a threat blocks the next corridor and our one team trap is elsewhere, take an open escape edge.
				if (
					threat &&
					!i.bomb &&
					!bombNearby &&
					threat.d < 22 &&
					(!s.stock || s.bomb)
				) {
					const ways = sim.grid.neighbours(cur).filter((c) => sim.grid.walk(c));
					ways.sort(
						(a, b) =>
							danger(a[0], a[1]) - danger(b[0], b[1]) ||
							sim.path(a, target.cell).length - sim.path(b, target.cell).length,
					);
					if (ways.length) i.dir = sim.directionTo(p, ways[0]);
				}
			}
			return out;
		}
	}
	Object.assign(T, { Bot });
})();
