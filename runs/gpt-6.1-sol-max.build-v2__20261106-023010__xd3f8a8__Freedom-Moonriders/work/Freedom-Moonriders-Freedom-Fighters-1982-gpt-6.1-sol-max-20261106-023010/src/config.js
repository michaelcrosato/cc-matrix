/* Freedom Moonriders — authored rules and mission data. */
(function (root) {
	"use strict";
	const F = (root.Moonriders = root.Moonriders || {});
	F.VERSION = "1.0.0";
	F.BUILD = "moonriders-20261106";
	F.TITLE = "Freedom Moonriders";
	F.clone = (x) => JSON.parse(JSON.stringify(x));
	F.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	F.unit = (x, y, fallback = [1, 0]) => {
		const d = Math.hypot(x, y);
		return d > 0.001
			? [x / Math.max(1, d), y / Math.max(1, d)]
			: fallback.slice();
	};
	F.direction = (x, y, fallback = [1, 0]) => {
		const d = Math.hypot(x, y);
		return d > 0.001 ? [x / d, y / d] : fallback.slice();
	};
	F.rng = (seed) => {
		let n = seed >>> 0;
		return {
			next() {
				n += 0x6d2b79f5;
				let t = n;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			},
			get state() {
				return n >>> 0;
			},
			set state(v) {
				n = v >>> 0;
			},
		};
	};
	F.BALANCE = Object.freeze({
		speed: 96,
		acceleration: 720,
		brake: 12,
		burstSpeed: 300,
		burstDuration: 0.45,
		burstCost: 60,
		regeneration: 24,
		hull: 3,
		grace: 1.25,
		cannonRate: 8,
		damage: 1,
		collar: 22,
		integrity: 3,
		arming: 0.8,
		warning: 1.35,
		enemyHealth: 1,
		pressure: 1,
		bossHealth: 1,
		assistCone: 0.16,
	});
	F.TUNING = [
		["speed", "Flight speed", 55, 160, 1],
		["acceleration", "Acceleration", 200, 1600, 20],
		["brake", "Release brake", 4, 24, 1],
		["burstSpeed", "Hyperspace speed", 180, 540, 10],
		["burstDuration", "Burst duration", 0.25, 0.8, 0.05],
		["burstCost", "Energy cost", 25, 90, 5],
		["regeneration", "Energy regeneration", 8, 60, 2],
		["hull", "Maximum hull", 1, 9, 1],
		["grace", "Damage grace", 0.5, 3, 0.05],
		["cannonRate", "Shots per second", 3, 14, 1],
		["damage", "Cannon damage", 1, 4, 1],
		["collar", "Rescue collar", 14, 34, 1],
		["integrity", "Crystal integrity", 3, 8, 1],
		["arming", "Mine arming time", 0.4, 2, 0.1],
		["warning", "Enemy warning time", 1, 3, 0.05],
		["enemyHealth", "Enemy health multiplier", 0.5, 3, 0.1],
		["pressure", "Threat pressure", 0.5, 2, 0.1],
		["bossHealth", "Carrier health multiplier", 0.5, 3, 0.1],
		["assistCone", "Aim assist cone", 0, 0.4, 0.02],
	];
	F.validateBalance = (raw) => {
		const out = { ...F.BALANCE };
		for (const [key, , min, max, step] of F.TUNING) {
			if (Number.isFinite(raw?.[key]))
				out[key] = +F.clamp(
					Math.round(raw[key] / step) * step,
					min,
					max,
				).toFixed(3);
		}
		return out;
	};
	F.NEUTRAL = Object.freeze({
		mx: 0,
		my: 0,
		ax: 0,
		ay: 0,
		fire: false,
		warp: false,
	});
	F.intent = (raw) => {
		if (
			!raw ||
			["mx", "my", "ax", "ay"].some(
				(k) => !Number.isFinite(raw[k]) || Math.abs(raw[k]) > 1.001,
			) ||
			typeof raw.fire !== "boolean" ||
			typeof raw.warp !== "boolean"
		)
			return { ...F.NEUTRAL };
		const m = F.unit(raw.mx, raw.my, [0, 0]),
			a = F.unit(raw.ax, raw.ay, [0, 0]);
		return {
			mx: m[0],
			my: m[1],
			ax: a[0],
			ay: a[1],
			fire: raw.fire,
			warp: raw.warp,
		};
	};
	F.resolve = (roster, inputs, swap = false) => {
		const seats = swap && roster.length > 1 ? [...roster].reverse() : roster;
		const pilot = seats[0],
			navigator = seats[1] ?? pilot,
			p = F.intent(inputs[pilot]),
			n = F.intent(inputs[navigator]);
		return {
			mx: p.mx,
			my: p.my,
			ax: n.ax,
			ay: n.ay,
			wx: n.mx,
			wy: n.my,
			warp: n.warp,
			fire: p.fire || n.fire,
			pilot,
			navigator,
			shared: seats.length > 1,
		};
	};
	// All x/y coordinates are in the engine's overhead flight plane. Art is side-on.
	const c = (id, x, y, extra = {}) => ({ id, kind: "crystal", x, y, ...extra });
	const e = (id, kind, x, y, pattern = "arc", extra = {}) => ({
		id,
		kind,
		x,
		y,
		pattern,
		...extra,
	});
	F.MISSIONS = [
		{
			id: "opening",
			title: "A light in the dark",
			place: "The outer reach",
			quota: 1,
			length: 1100,
			palette: "open",
			briefing: "A captive is ahead. Touch the violet collar. Bring them home.",
			entries: [
				c("first", 225, 135, { safe: true }),
				e("drill", "drone", 570, 112),
			],
			objective: "Rescue, test the cannon, then commit hyperspace.",
		},
		{
			id: "reach",
			title: "Break the constellation",
			place: "01 · The open reach",
			quota: 3,
			length: 9200,
			palette: "open",
			briefing:
				"Three signals in open space. Break the mine-layers to clear their fields.",
			entries: [
				e("reach-layer", "layer", 850, 85, "curtain", { timer: 0.15 }),
				c("reach-a", 1220, 155),
				e("reach-pass-a", "interceptor", 1750, 180),
				e("reach-pass-b", "interceptor", 2750, 85),
				e("reach-ring", "layer", 3450, 145, "ring"),
				c("reach-b", 4260, 92),
				e("reach-arc", "layer", 5100, 185, "arc"),
				e("reach-pass-c", "interceptor", 6100, 115),
				c("reach-c", 7160, 180),
				e("reach-exit", "layer", 8200, 75, "curtain"),
			],
			objective:
				"Secure 3 captives. Destroy a mine-layer. Reach the green beacon.",
		},
		{
			id: "belt",
			title: "The silent belt",
			place: "02 · Prison orbit",
			quota: 4,
			length: 11900,
			palette: "belt",
			briefing:
				"Four prison signals in the belt. Guards cover the approaches. Watch for the ion shroud.",
			shroud: [5100, 6200],
			entries: [
				e("belt-guard", "guard", 900, 116),
				c("belt-a", 1180, 116),
				e("belt-curtain", "layer", 1850, 65, "curtain"),
				e("belt-ring", "layer", 2520, 190, "ring"),
				c("belt-b", 3460, 200),
				e("belt-arc", "layer", 4180, 95, "arc"),
				e("belt-pass-a", "interceptor", 4800, 185),
				c("belt-c", 5860, 90),
				e("belt-pass-b", "interceptor", 6650, 76),
				e("belt-guard-b", "guard", 7480, 190),
				c("belt-d", 7780, 173),
				e("belt-bonus-layer", "layer", 8570, 80, "ring"),
				c("belt-bonus", 9060, 58, { optional: true }),
				e("belt-exit", "layer", 10480, 170, "arc"),
			],
			objective: "Secure 4 captives. Cross the ion shroud. Reach the beacon.",
		},
		{
			id: "carrier",
			title: "No one left behind",
			place: "03 · The prison carrier",
			quota: 3,
			length: 8200,
			palette: "carrier",
			bossX: 6980,
			release: { x: -110, dx: -90, minY: 70, maxY: 200 },
			briefing:
				"The carrier holds the final prisoners. Silence its field organs. Then free the crew.",
			entries: [
				e("final-curtain", "layer", 800, 75, "curtain"),
				e("final-pass-a", "interceptor", 1580, 170),
				e("final-ring", "layer", 2350, 140, "ring"),
				e("final-guard", "guard", 3300, 95),
				e("final-arc", "layer", 4200, 175, "arc"),
				e("final-pass-b", "interceptor", 5200, 85),
			],
			objective: "Disable both organs. Rescue the prisoners. Destroy the core.",
		},
	];
	F.validateMissions = (missions) => {
		const seen = new Set();
		for (const m of missions) {
			if (
				!m.id ||
				seen.has(m.id) ||
				!(m.length > 500) ||
				!(m.quota > 0) ||
				!m.briefing
			)
				throw Error("Invalid mission: " + m.id);
			seen.add(m.id);
			if (
				m.bossX &&
				(!m.release ||
					![
						m.bossX,
						m.release.x,
						m.release.dx,
						m.release.minY,
						m.release.maxY,
					].every(Number.isFinite) ||
					m.bossX >= m.length ||
					m.release.minY < 28 ||
					m.release.maxY > 242 ||
					m.release.minY > m.release.maxY)
			)
				throw Error("Invalid boss release: " + m.id);
			const ids = new Set();
			for (const x of m.entries) {
				if (
					!["crystal", "layer", "interceptor", "guard", "drone"].includes(
						x.kind,
					) ||
					ids.has(x.id) ||
					!Number.isFinite(x.x) ||
					x.x < 0 ||
					x.x > m.length ||
					x.y < 28 ||
					x.y > 242 ||
					(x.kind === "layer" &&
						!["curtain", "ring", "arc"].includes(x.pattern))
				)
					throw Error("Invalid mission entry: " + x.id);
				ids.add(x.id);
			}
			if (
				!m.bossX &&
				m.entries.filter((x) => x.kind === "crystal" && !x.optional).length <
					m.quota
			)
				throw Error("Missing rescue slots: " + m.id);
		}
		return true;
	};
	F.validateMissions(F.MISSIONS);
})(typeof globalThis === "object" ? globalThis : window);
