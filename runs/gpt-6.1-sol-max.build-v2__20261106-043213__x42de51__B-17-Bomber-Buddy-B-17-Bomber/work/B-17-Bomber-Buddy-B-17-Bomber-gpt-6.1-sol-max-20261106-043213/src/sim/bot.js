import { U, STATIONS } from "../../content/operation.js";
import { wrap, dist } from "../core/math.js";
// A controller that uses the same commands as a human. No authority bypass or automatic damage.
export function sortieBot(sim, id = sim.players[0]?.id) {
	const p = sim.player(id);
	if (!p || sim.ended) return;
	const a = sim.aircraft,
		harbor = sim.targets[0],
		near = dist(a, harbor) < 2300 * U;
	if (sim.primaryComplete() && !sim.returning)
		sim.command(id, "route", { route: "home" });
	const foe = sim.enemies.find((e) => e.alive && e.age >= 0 && e.age < 24);
	const barrage = sim.flak.find((f) => !f.burst && f.time > 0);
	let station = "pilot";
	if (!sim.primaryComplete() && near) station = "bombs";
	else if (foe) station = ["nose", "starboard", "tail", "port"][foe.bearing];
	if (barrage) station = "pilot";
	const solution = near ? sim.predict() : null;
	if (
		near &&
		!sim.primaryComplete() &&
		harbor.parts.some((q) => !q.dead && dist(solution, q) < 700 * U)
	)
		station = "bombs";
	if (p.station !== station && p.pending !== station)
		sim.command(id, "station", { station });
	let aimYaw = 0,
		aimPitch = 0,
		fire = false;
	if (foe && sim.guns[p.station]) {
		const st = STATIONS.find((s) => s.id === p.station),
			lead = Math.hypot(foe.x - a.x, foe.y - a.y, foe.z - a.z) / (860 * U);
		const dx = foe.x + (foe.vx - a.vx) * lead - a.x,
			dy = foe.y + (foe.vy - a.vy) * lead - a.y,
			dz = foe.z + (foe.vz - a.vz) * lead - a.z;
		aimYaw = wrap(Math.atan2(dy, dx) - a.heading - st.angle);
		aimPitch = Math.atan2(dz, Math.hypot(dx, dy)) - a.pitch;
		fire = true;
	}
	sim.command(id, "input", {
		throttle: a.throttle < 0.87 ? 1 : 0,
		aimYaw,
		aimPitch,
		fire,
		bank: 0,
		pitch: barrage ? -1 : 0,
	});
	if (!barrage && !a.nav)
		sim.command(id, "route", { route: sim.returning ? "home" : "harbor" });
	if (p.station === "bombs" && !p.transition) {
		if (!a.doorsOpen) sim.command(id, "doors");
		const pred = sim.predict();
		if (harbor.parts.some((q) => !q.dead && dist(pred, q) < 110 * U))
			sim.command(id, "release");
	}
	if (a.fire >= 0 && a.extinguisher) sim.command(id, "extinguish");
}
