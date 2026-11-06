(() => {
	const PP = globalThis.PP;
	// The pilot uses the same canonical actions as every human input adapter.
	PP.pilot = (sim, id = sim.miners[0]?.id, route = 0) => {
		const m = sim.miners.find((p) => p.id === id),
			out = {
				mx: 0,
				my: 0,
				jump: false,
				jumpHeld: false,
				chop: false,
				redirect: false,
				interact: false,
				interactHeld: false,
				aim: 0,
			};
		if (!m || m.downed || sim.completed || sim.transition > 0) return out;
		const h = m.hero;
		// Keep a deliberate jump held while rising; releasing one tick after takeoff
		// would turn both gap leaps and defensive jumps into ineffective short hops.
		out.jumpHeld = h.vz > 0 && !h.climbing;
		const key = sim.pickups.find((p) => p.kind === "key"),
			pick = sim.pickups.find((p) => p.kind === "pick");
		const fallen = sim.miners.find((p) => p.id !== id && p.downed);
		const pickup =
			m.tool <= 0 && pick ? pick : key || (m.tool < 2 ? pick : null);
		let target =
			pickup?.kind === "pick" && m.tool <= 0
				? pickup
				: sim.keyOwner !== null
					? sim.room.doors[route % 3]
					: pickup || (fallen ? { x: fallen.hero.x, z: fallen.hero.z } : null);
		if (
			fallen &&
			Math.abs(fallen.hero.x - h.x) < 55 &&
			Math.abs(fallen.hero.z - h.z) < 28
		)
			target = { x: fallen.hero.x, z: fallen.hero.z };
		if (!target) {
			const near = sim.rocks
				.filter((r) => Math.abs(r.z - h.z - 14) < 35)
				.sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
			if (m.tool > 0)
				target = near
					? { x: near.x - Math.sign(near.x - h.x || 1) * 32, z: h.z }
					: { x: 296, z: 16 };
			else {
				// The visible supply seam opens below. Wait on a safe upper landing,
				// then descend for the falling replacement instead of chasing live ore.
				const ladder = Math.abs(h.x - 104) < Math.abs(h.x - 456) ? 104 : 456;
				target = {
					x: ladder,
					z:
						h.z < 60
							? 80
							: sim.room.floors.reduce(
									(best, f) => (f.z <= h.z + 2 ? f.z : best),
									16,
								),
				};
			}
		}
		let targetZ = target.z;
		if (target === pickup) {
			if (pickup.kind === "pick") targetZ = 16;
			else
				targetZ = sim.room.floors.reduce(
					(best, f) =>
						Math.abs(f.z + 14 - pickup.z) < Math.abs(best + 14 - pickup.z)
							? f.z
							: best,
					16,
				);
		}
		const dx = target.x - h.x;
		if (targetZ > h.z + (h.climbing ? 1 : 25)) {
			const ladder = [104, 456].sort(
				(a, b) => Math.abs(a - h.x) - Math.abs(b - h.x),
			)[0];
			if (Math.abs(ladder - h.x) > 6 && !h.climbing)
				out.mx = Math.sign(ladder - h.x);
			else out.my = -1;
		} else if (targetZ < h.z - 26) {
			out.my = 1;
			if (!h.climbing && h.onGround) {
				out.jump = true;
				out.jumpHeld = true;
			}
		} else if (h.climbing) {
			out.mx = Math.sign(dx || 1);
			out.jump = true;
			out.jumpHeld = true;
		} else {
			out.mx =
				Math.abs(dx) > (sim.keyOwner !== null && target !== pickup ? 24 : 11)
					? Math.sign(dx)
					: 0;
			const f = sim.room.floors.find((f) => Math.abs(f.z - h.z) < 2);
			if (
				f &&
				h.onGround &&
				out.mx &&
				f.gaps.some(([a, b]) => h.x + out.mx * 20 > a && h.x + out.mx * 20 < b)
			) {
				out.jump = true;
				out.jumpHeld = true;
			}
		}
		const danger = sim.rocks
			.filter((r) => Math.abs(r.x - h.x) < 70 && Math.abs(r.z - h.z - 15) < 36)
			.sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
		if (danger) {
			const dir = Math.sign(danger.x - h.x || 1),
				distance = Math.abs(danger.x - h.x);
			if (h.climbing && distance < 25 && danger.grace <= 0) {
				out.mx = -dir;
				out.my = 0;
				out.jump = true;
				out.jumpHeld = true;
			} else if (!h.climbing && m.tool > 0) {
				if (dir !== m.facing && distance > 14) out.mx = dir;
				out.chop = true;
				const collisionTarget = sim.rocks.some(
					(r) =>
						r !== danger &&
						(r.x - danger.x) * dir > 0 &&
						Math.abs(r.z - danger.z) < 28 &&
						Math.abs(r.x - danger.x) < 150,
				);
				if (
					!m.attack.busy &&
					distance < 53 &&
					((danger.kind === "heavy" && danger.hp > 1) || collisionTarget)
				) {
					out.redirect = true;
					out.chop = false;
					out.aim = collisionTarget ? 1 : -1;
				}
			} else if (!h.climbing && distance < 53 && h.onGround) {
				if (danger.kind === "bounce" && danger.z > h.z + 32) {
					out.my = 1;
					out.jump = false;
					out.jumpHeld = false;
				} else {
					out.jump = true;
					out.jumpHeld = true;
				}
			}
		}
		if (
			sim.keyOwner !== null &&
			target !== pickup &&
			sim.nearDoor(m)?.id === sim.room.doors[route % 3].id
		)
			out.interact = true;
		if (
			fallen &&
			Math.abs(fallen.hero.x - h.x) < 35 &&
			Math.abs(fallen.hero.z - h.z) < 26
		)
			out.interactHeld = true;
		return out;
	};
	// Kiosk-only staging may cheat; contacts still use the real action path.
	PP.attractIntent = (sim, id, route = 1) => {
		const intent = PP.pilot(sim, id, route),
			m = sim.miners.find((m) => m.id === id);
		if (!sim.attract || !m) return intent;
		if (
			!sim.demoRicochet &&
			sim.chamber === 0 &&
			sim.chamberTime >= 8 &&
			sim.transition <= 0
		) {
			sim.demoRicochet = true;
			sim.demoRicochetTick = sim.tick;
			m.hero.x = 200;
			m.hero.z = 16;
			m.hero.vx = m.hero.vz = 0;
			m.hero.facing = m.facing = 1;
			m.tool = 1;
			m.attack.cancel();
			sim.rocks = [];
			sim.spawnRock({ x: 232, z: 30, vx: -20 });
			sim.spawnRock({ x: 310, z: 30, vx: -48 });
			return {
				...intent,
				mx: 0,
				my: 0,
				chop: false,
				jump: false,
				jumpHeld: false,
				redirect: true,
				aim: 1,
			};
		}
		if (sim.demoRicochetTick && sim.tick - sim.demoRicochetTick < 155)
			return {
				...intent,
				mx: 0,
				my: 0,
				jump: false,
				jumpHeld: false,
				chop: false,
				redirect: false,
			};
		return intent;
	};
})();
