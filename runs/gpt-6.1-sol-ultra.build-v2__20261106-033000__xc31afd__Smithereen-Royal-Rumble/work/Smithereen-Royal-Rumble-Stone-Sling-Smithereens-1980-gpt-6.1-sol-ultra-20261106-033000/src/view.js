import { predict, health, STONES } from "./sim.js";

const COURT_LOOKS = [
	{
		name: "VILLAGE EXHIBITION",
		sky: ["#325984", "#8fbed0", "#f3dbc1"],
		hills: "#789d8a",
		far: "#a2b6a2",
		earth: "#654c3d",
		stone: "#c5ae89",
		sun: "#ffe7a3",
		mood: "day",
	},
	{
		name: "THE QUARRY MEET",
		sky: ["#697c96", "#c3c6b3", "#f4dec1"],
		hills: "#a79a87",
		far: "#c7bba0",
		earth: "#79604b",
		stone: "#ddd0a6",
		sun: "#fff1bf",
		mood: "quarry",
	},
	{
		name: "THE HIGH KEEP",
		sky: ["#424b78", "#ae9ab0", "#eed1ad"],
		hills: "#686f83",
		far: "#9696a1",
		earth: "#4b4656",
		stone: "#aaa5b6",
		sun: "#f8d5a0",
		mood: "keep",
	},
	{
		name: "LAKESIDE NIGHT COURT",
		sky: ["#121a3a", "#28385c", "#706479"],
		hills: "#303c54",
		far: "#444f6a",
		earth: "#333044",
		stone: "#aaa3a5",
		sun: "#e2e6c8",
		mood: "night",
	},
	{
		name: "THE ROYAL FINAL",
		sky: ["#3e3e71", "#af7895", "#edb88c"],
		hills: "#686279",
		far: "#9b8c9b",
		earth: "#4c3b4b",
		stone: "#dac4a0",
		sun: "#ffdfa0",
		mood: "royal",
	},
];
const TEAMS = [
	{
		color: "#ef9396",
		dark: "#823c55",
		bright: "#ffe0bd",
		name: "THE ROSE STAGS",
		sign: "I",
	},
	{
		color: "#55c7df",
		dark: "#245477",
		bright: "#c7f4ec",
		name: "THE AZURE BOARS",
		sign: "II",
	},
];
const STONE_NAMES = ["ROUNDSTONE", "MASONRY", "SPLIT STONE"];
const STONE_COLORS = STONES.map((stone) => stone.color);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const keyName = (code) =>
	String(code || "")
		.replace(/^Key/, "")
		.replace("ShiftRight", "RShift")
		.replace("ShiftLeft", "LShift")
		.replace("ControlRight", "RCtrl")
		.replace("ControlLeft", "LCtrl")
		.replace("AltRight", "RAlt")
		.replace("AltLeft", "LAlt");
const hash = (n) => {
	n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
	n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

export function createView(E, game) {
	const { px } = E;
	const rigs = [],
		helpers = [],
		crowds = [];
	let lastWorld = null,
		lastEvent = 0,
		clock = 0,
		fitKey = "",
		predictions = [null, null],
		predictionKeys = ["", ""];
	let debris = [],
		splashes = [],
		rings = [],
		trails = new Map(),
		blockState = new Map(),
		releases = [0, 0],
		wounds = [0, 0],
		repairNoise = [0, 0];
	let lastR = null,
		touchLayouts = [],
		compactMode = null,
		inset = null;
	const compactView = new E.View(
		"rumble-side",
		"Tournament side",
		0,
		0,
		0.9,
		1,
	);
	const insetSprites = new Map();
	const materialCache = new Set();
	E.Humanoid.pose("rumble-haul", (J, w, rig) => {
		const k = Math.sin(rig.phase * 2 + clock * 12),
			target = {
				handL: [8, -3, 13 + k * 1.4],
				handR: [9, 3, 14 - k * 1.4],
				elbowL: [3, -4, 15],
				elbowR: [4, 4, 17],
			};
		for (const id in target)
			if (J[id])
				for (let a = 0; a < 3; a++) J[id][a] += (target[id][a] - J[id][a]) * w;
	});
	E.Humanoid.pose("rumble-tool", (J, w) => {
		for (const [id, target] of Object.entries({
			handL: [6, -3, 12],
			handR: [9, 3, 18 + Math.sin(clock * 15) * 5],
			elbowR: [5, 4, 19],
		}))
			if (J[id])
				for (let a = 0; a < 3; a++) J[id][a] += (target[a] - J[id][a]) * w;
	});
	E.Humanoid.pose("rumble-flag", (J, w) => {
		for (const [id, target] of Object.entries({
			handL: [5, -3, 15],
			handR: [6, 3, 24],
			elbowR: [3, 4, 18],
		}))
			if (J[id])
				for (let a = 0; a < 3; a++) J[id][a] += (target[a] - J[id][a]) * w;
	});
	E.SHAPES["rumble-block"] = {
		about: "A destructible tournament wall section",
		mats: { s: "sandstone" },
		params: { w: 18, h: 18 },
		make: (p) => [["box", "s", [0, 0, 0], [p.w, 6, p.h]]],
	};
	E.SHAPES["rumble-buttress"] = {
		about: "Court boundary marker",
		mats: { s: "slate", g: "gold" },
		parts: [
			["box", "s", [0, 0, 0], [8, 7, 12]],
			["box", "g", [0, 0, 12], [10, 9, 2]],
		],
	};
	for (let seat = 0; seat < 2; seat++) {
		const T = TEAMS[seat];
		rigs.push(
			new E.Humanoid({
				size: 0.92,
				weapon: null,
				outfit: "tunic",
				hair: seat ? "short" : "ponytail",
				hat: { style: "helmet", color: "#c2bba5" },
				armor: true,
				cape: { len: 5, width: 4 },
				sleeves: "long",
				colors: {
					skin: seat ? "#cc956d" : "#e5ba91",
					hair: seat ? "#593c37" : "#4d3333",
					cloth: T.color,
					coat: T.dark,
					pants: "#443b48",
					boot: "#322e38",
					belt: "#b08a51",
					trim: T.bright,
					glove: "#c7a474",
					cape: T.color,
					capeIn: T.dark,
					metal: "#b4bac0",
					plate: "#9399a1",
				},
			}),
		);
		helpers.push(
			new E.Humanoid({
				size: 0.73,
				weapon: null,
				outfit: "shirt",
				hair: "short",
				hat: { style: "cap", color: T.color },
				sleeves: "short",
				colors: {
					skin: "#d7a17c",
					cloth: T.dark,
					pants: "#6d5b54",
					boot: "#40383d",
					trim: T.bright,
					hair: "#4b3530",
				},
			}),
		);
	}
	for (let i = 0; i < 14; i++)
		crowds.push(
			new E.Humanoid({
				size: 0.44,
				style: "hd",
				weapon: null,
				outfit: i % 3 ? "tunic" : "robe",
				hair: "short",
				hat: i % 4 === 0 ? "pointed" : i % 4 === 1 ? "cap" : null,
				colors: {
					skin: ["#dbb48c", "#b97b60", "#e0ba9c"][i % 3],
					cloth: ["#c68b5b", "#6e9a8b", "#b06c78", "#7674a1", "#c3aa69"][i % 5],
					pants: "#554a4e",
					boot: "#3c3541",
					hair: "#614b3e",
				},
			}),
		);
	game.cam.smooth = 0;
	game.lights.enabled = true;
	game.particles.ground = (x, y, z) => (x < 245 || x > 395 ? 40 : 19);
	function fit() {
		const rect = game.screen.canvas?.getBoundingClientRect(),
			compact = !!rect && (rect.width < 620 || rect.height > rect.width * 1.2);
		if (compact !== compactMode) {
			compactMode = compact;
			game.screen.setOptions({ res: compact ? [320, 180] : [640, 360] });
			game.setView(compact ? compactView : E.VIEWS.side);
			fitKey = "";
		}
		const W = game.W,
			H = game.H,
			key = `${W}:${H}`;
		if (key !== fitKey) {
			fitKey = key;
			game.setZoom(clamp((W - 30) / (640 * (compact ? 0.9 : 1.5)), 0.5, 1.4));
			game.cam.bounds = null;
			game.cam.offset = [0, 0];
			game.cam.snap = true;
		}
		game.focus(320, 0, 175);
	}
	function clear() {
		lastWorld = null;
		lastEvent = 0;
		debris = [];
		splashes = [];
		rings = [];
		trails.clear();
		blockState.clear();
		insetSprites.clear();
		inset = null;
		releases = [0, 0];
		wounds = [0, 0];
		predictions = [null, null];
		predictionKeys = ["", ""];
		game.particles.clear?.();
	}
	function process(e, app) {
		const x = Number.isFinite(e.x)
				? e.x
				: app.world.players[e.seat || 0]?.x || 320,
			z = Number.isFinite(e.z) ? e.z : 55;
		if (e.type === "launch") {
			releases[e.seat || 0] = 0.38;
			game.particles.dust(x, 0, 40, 4);
		}
		if (e.type === "impact" || e.type === "hit") {
			const water = e.target === "water";
			rings.push({
				x,
				z,
				t: 0,
				life: 0.48,
				color: water ? "#a4e3ec" : "#ffe6aa",
				size: water ? 18 : 12,
			});
			if (water) splashes.push({ x, z, t: 0 });
			else {
				game.particles.bits(x, 0, z, app.settings.reducedMotion ? 3 : 9, [
					"#c9b08c",
					"#edd5a2",
					"#827568",
				]);
				game.particles.dust(x, 0, z, app.settings.reducedMotion ? 2 : 7);
			}
			if (!app.settings.reducedMotion && e.target !== "water")
				game.shake(e.stone === 1 || e.projectileType === 1 ? 2.3 : 1.1);
		}
		if (e.type === "crew" || e.type === "launcher" || e.type === "interrupt") {
			wounds[e.targetSeat ?? e.seat ?? 0] = 0.5;
			game.particles.impact(x, 0, z, 9, "#ffe8a1");
		}
		if (e.type === "recover") {
			game.particles.glints(x, 0, z, 8, "#ffe59b");
			rings.push({ x, z, t: 0, life: 0.8, color: "#ffe7a6", size: 25 });
		}
		if (e.type === "split") {
			game.particles.glints(x, 0, z, 7, "#ffe29b");
			rings.push({ x, z, t: 0, life: 0.5, color: "#ffda78", size: 14 });
		}
		if (e.type === "outcome") {
			for (let i = 0; i < 2; i++)
				game.particles.glints(
					app.world.players[i].x,
					0,
					90,
					9,
					TEAMS[i].bright,
				);
		}
	}
	function update(dt, app) {
		clock += dt;
		fit();
		const w = app.world;
		if (!w) return;
		touchLayouts = [];
		app.touchChips = [];
		if (
			app.device === "touch" &&
			app.screen === "play" &&
			app.mode !== "attract" &&
			w.available?.length > 1
		) {
			const W = game.W,
				H = game.H,
				phone = H > W * 1.2,
				seats =
					app.mode === "local"
						? [0, 1]
						: [app.online?.seat ?? app.hubSeat ?? 0];
			for (const seat of seats) {
				const p = w.players[seat];
				if (!p || p.charge) continue;
				const center =
						app.mode === "local" ? (seat ? W * 0.77 : W * 0.23) : W * 0.5,
					y = H - (phone ? 39 : 90),
					width = 48,
					height = 30;
				for (const delta of [-1, 1])
					touchLayouts.push({
						x: center + delta * 89 - width / 2,
						y,
						w: width,
						h: height,
						seat,
						delta,
					});
			}
			const canvas = game.screen.canvas,
				rect = canvas?.getBoundingClientRect();
			if (rect)
				for (const chip of touchLayouts) {
					const s = game.screen;
					app.touchChips.push({
						...chip,
						x: rect.left + ((chip.x * s.S + s.OX) * rect.width) / canvas.width,
						y: rect.top + ((chip.y * s.S + s.OY) * rect.height) / canvas.height,
						w: (chip.w * s.S * rect.width) / canvas.width,
						h: (chip.h * s.S * rect.height) / canvas.height,
					});
				}
		}
		if (
			lastWorld !== w &&
			(!lastWorld ||
				w.tick < lastWorld.tick ||
				w.seed !== lastWorld.seed ||
				w.court !== lastWorld.court)
		) {
			clear();
			lastWorld = w;
			for (const b of w.blocks) blockState.set(b.id, b.alive);
		}
		lastWorld = w;
		for (const e of w.events || [])
			if (e.id > lastEvent) {
				process(e, app);
				lastEvent = Math.max(lastEvent, e.id);
			}
		for (const b of w.blocks) {
			if (blockState.get(b.id) && !b.alive && !b.foundation) {
				const n = app.settings.reducedMotion ? 2 : 5;
				for (let i = 0; i < n; i++)
					debris.push({
						x: b.x + (b.w * (i + 0.5)) / n,
						z: b.z + b.h * (0.35 + hash(b.id * 23 + i) * 0.5),
						vx: (hash(b.id * 53 + i) - 0.5) * 55,
						vz: 10 + hash(b.id * 73 + i) * 35,
						w: Math.max(3, b.w / n),
						h: Math.min(9, b.h / 2),
						t: 0,
						life: 2.4,
						color:
							b.material === "wood"
								? "#a1764c"
								: COURT_LOOKS[w.court]?.stone || "#b4a58c",
						spin: hash(b.id + i) * 4,
					});
			}
			blockState.set(b.id, b.alive);
		}
		for (const d of debris) {
			d.t += dt;
			d.x += d.vx * dt;
			d.z += d.vz * dt;
			d.vz -= 120 * dt;
			const ground = d.x < 245 || d.x > 395 ? 40 : 19;
			if (d.z < ground) {
				d.z = ground;
				d.vx *= 0.55;
				d.vz = Math.abs(d.vz) * 0.22;
				if (d.vz < 2) d.vz = 0;
			}
		}
		debris = debris.filter((d) => d.t < d.life);
		rings.forEach((o) => (o.t += dt));
		rings = rings.filter((o) => o.t < o.life);
		splashes.forEach((o) => (o.t += dt));
		splashes = splashes.filter((o) => o.t < 1.1);
		for (let i = 0; i < 2; i++) {
			releases[i] = Math.max(0, releases[i] - dt);
			wounds[i] = Math.max(0, wounds[i] - dt);
			const p = w.players[i];
			if (!p) continue;
			const away = Math.max(p.crewUntil, p.launcherUntil) - w.time,
				repair = p.launcherUntil > w.time,
				charging = !!p.charge;
			const f = i ? -1 : 1,
				exit = away > 0 ? clamp(away / 0.45, 0, 1) : 0,
				walk = away > 0 ? (p.crewUntil > w.time ? 32 : 15) : 0;
			const cx = p.crewX - f * walk * exit,
				pose =
					w.phase === "over"
						? w.outcome?.winner === i
							? "cheer"
							: "rumble-flag"
						: repair
							? "rumble-tool"
							: away > 0
								? "guard"
								: charging
									? "rumble-haul"
									: releases[i] > 0.14
										? "cheer"
										: "hips";
			rigs[i].update(dt, {
				x: cx,
				y: 0,
				z: 40,
				vx: away > 0 ? -f * 30 : 0,
				vy: 0,
				facing: i ? Math.PI : 0,
				pose,
				expr: charging
					? "angry"
					: away > 0
						? "wince"
						: w.phase === "over"
							? "shout"
							: "smile",
				hurt: wounds[i] > 0,
				attack:
					releases[i] > 0.2
						? E.move("throw", clamp((0.38 - releases[i]) / 0.18, 0, 1))
						: null,
			});
			helpers[i].update(dt, {
				x: p.x - f * 24,
				y: 1,
				z: 40,
				facing: i ? Math.PI : 0,
				pose: repair
					? "rumble-tool"
					: charging
						? "rumble-haul"
						: w.phase === "over"
							? "wave"
							: "kneel",
				expr: charging ? "wince" : "smile",
			});
		}
		for (let i = 0; i < crowds.length; i++)
			crowds[i].update(dt, {
				x: 20 + i * 16,
				y: -12,
				z: 49,
				facing: i % 2 ? 0 : Math.PI,
				pose:
					w.phase === "over" || Math.sin(clock * 1.4 + i) > 0.6
						? "cheer"
						: i % 3
							? "hips"
							: "wave",
				expr: "smile",
			});
		const present = new Set();
		for (const p of w.projectiles) {
			present.add(p.id);
			let line = trails.get(p.id);
			if (!line) {
				line = [];
				trails.set(p.id, line);
			}
			line.push({ x: p.x, z: p.z, t: clock });
			while (line.length > 14) line.shift();
		}
		for (const [id, line] of trails) {
			while (line.length && clock - line[0].t > 0.3) line.shift();
			if (!present.has(id) && !line.length) trails.delete(id);
		}
		for (let seat = 0; seat < 2; seat++) {
			const p = w.players[seat],
				eligible =
					!p.ai &&
					(app.mode !== "hub" || seat === (app.online?.seat ?? app.hubSeat));
			if (p.charge && eligible) {
				const key = `${w.revision}:${seat}:${p.stone}:${Math.round(p.charge.power * 240)}:${w.config.gravity}:${w.config.maxSpeed}`;
				if (key !== predictionKeys[seat]) {
					predictionKeys[seat] = key;
					predictions[seat] = predict(w, seat, p.charge.power, p.stone);
				}
			} else {
				predictions[seat] = null;
				predictionKeys[seat] = "";
			}
		}
		inset = null;
		if (
			game.H > game.W * 1.2 &&
			app.screen === "play" &&
			app.mode !== "attract"
		) {
			const local =
					app.online?.seat ?? app.hubSeat ?? app.touchPoint?.seat ?? 0,
				seat = 1 - local,
				blocks = w.blocks.filter(
					(b) => b.alive && b.seat === seat && !b.foundation,
				);
			if (blocks.length) {
				const minX = Math.min(...blocks.map((b) => b.x)),
					maxX = Math.max(...blocks.map((b) => b.x + b.w)),
					minZ = Math.min(...blocks.map((b) => b.z)),
					maxZ = Math.max(...blocks.map((b) => b.z + b.h)),
					width = Math.min(game.W - 42, 244),
					height = clamp(game.H * 0.22, 150, 192),
					scale =
						Math.round(
							clamp(
								Math.min(
									(width - 34) / (maxX - minX),
									(height - 38) / (maxZ - minZ),
								),
								0.8,
								3,
							) * 100,
						) / 100;
				inset = {
					x: (game.W - width) / 2,
					y: 123,
					w: width,
					h: height,
					seat,
					local,
					scale,
					minX,
					maxX,
					minZ,
					maxZ,
					centerX: (minX + maxX) / 2,
					centerZ: (minZ + maxZ) / 2,
					remaining: blocks.length,
					predictedId:
						predictions[local]?.impacts.find(
							(h) => h.target === "block" && h.seat === seat,
						)?.id ?? null,
					last: w.players[local]?.last?.[w.players[local].stone] || null,
				};
				const canvas = game.screen.canvas,
					rect = canvas?.getBoundingClientRect();
				if (rect) {
					const s = game.screen;
					inset.clientRect = {
						x: rect.left + ((inset.x * s.S + s.OX) * rect.width) / canvas.width,
						y:
							rect.top + ((inset.y * s.S + s.OY) * rect.height) / canvas.height,
						w: (inset.w * s.S * rect.width) / canvas.width,
						h: (inset.h * s.S * rect.height) / canvas.height,
					};
				}
			}
		}
	}
	function material(court, mat) {
		const id = `rumble-${court}-${mat}`;
		if (!materialCache.has(id)) {
			const look = COURT_LOOKS[court] || COURT_LOOKS[0];
			E.MATERIALS[id] = {
				color:
					mat === "wood"
						? "#a98053"
						: mat === "reinforced"
							? E.shade(look.stone, -0.2)
							: look.stone,
				pattern: mat === "wood" ? "planks" : "bricks",
				bw: mat === "wood" ? 4 : 9,
				bh: 7,
				mortar: 1,
				over: mat === "wood" ? [] : [["cracks"]],
			};
			materialCache.add(id);
		}
		return id;
	}
	function worldRect(g, r, x, z, w, h, c) {
		const [sx, sy] = r.w(x, 0, z + h);
		px.rect(g, sx, sy, w * r.ppu, h * r.ppu, c);
	}
	function lineWorld(g, r, x, z, x1, z1, c, width = 1) {
		const a = r.w(x, 0, z),
			b = r.w(x1, 0, z1);
		px.line(g, a[0], a[1], b[0], b[1], c, width);
	}
	function flag(g, r, x, z, seat, surrender = false, small = false) {
		const T = TEAMS[seat],
			S = r.ppu,
			f = seat ? -1 : 1,
			[sx, sy] = r.w(x, 0, z),
			h = (small ? 22 : 34) * S,
			fw = (small ? 16 : 24) * S;
		px.line(g, sx, sy, sx, sy - h, "#523f39", Math.max(1, Math.round(S * 2)));
		px.line(g, sx - S, sy - h, sx - S, sy, "#d8c098");
		px.disc(g, sx, sy - h - 2 * S, 2 * S, "#edca78");
		const points = [];
		for (let i = 0; i <= 6; i++)
			points.push([
				sx + (f * fw * i) / 6,
				sy - h + Math.sin(clock * 5 + i * 0.8) * 2 * S + i * 0.4 * S,
			]);
		for (let i = 6; i >= 0; i--)
			points.push([
				sx + (f * fw * i) / 6,
				sy -
					h +
					(small ? 12 : 17) * S +
					Math.sin(clock * 5 + i * 0.8) * 2 * S +
					i * 0.4 * S,
			]);
		px.poly(g, points, surrender ? "#f7ecd0" : T.color);
		lineWorld(
			g,
			r,
			x,
			z + 30,
			x + f * 18,
			z + 30,
			surrender ? "#b5aca0" : T.bright,
		);
		if (!surrender) {
			const mx = sx + f * fw * 0.44,
				my = sy - h + 8 * S;
			if (seat === 0) {
				px.line(g, mx - 4 * S, my, mx + 4 * S, my, T.bright, 2);
				px.line(g, mx, my - 4 * S, mx, my + 4 * S, T.bright, 2);
			} else {
				px.poly(
					g,
					[
						[mx, my - 5 * S],
						[mx + 5 * S, my],
						[mx, my + 5 * S],
						[mx - 5 * S, my],
					],
					T.bright,
				);
			}
		}
	}
	function background(r, app, look) {
		const W = r.W,
			H = r.H,
			t = clock;
		r.sky(look.sky);
		r.decal((g) => {
			const S = r.ppu,
				ground = r.w(0, 0, 40)[1],
				horizon = ground - 50 * S;
			const sunX = W * 0.63,
				sunY = Math.max(50, ground - 240 * S);
			px.ddisc(g, sunX, sunY, 44 * S, look.sun, 0.2);
			px.disc(g, sunX, sunY, 18 * S, look.sun);
			if (look.mood === "night")
				px.disc(g, sunX + 8 * S, sunY - 5 * S, 17 * S, look.sky[0]);
			if (look.mood === "night")
				for (let i = 0; i < 50; i++) {
					const x = hash(i * 31) * W,
						y = hash(i * 43 + 19) * Math.max(1, horizon - 20);
					if (Math.sin(t * 0.9 + i) > 0.1)
						px.dot(g, x, y, i % 3 ? "#b5b1ba" : "#fff1ce");
				}
			for (const [layer, color, base, amp] of [
				[0, look.far, 42, 45],
				[1, look.hills, 20, 30],
			]) {
				for (let x = 0; x < W; x += 3) {
					const wave =
						Math.sin(x / (57 + layer * 22) + layer * 4) * 0.45 +
						Math.sin(x / (23 + layer * 11)) * 0.15;
					const y = horizon - (base + wave * amp) * S;
					px.rect(g, x, y, 3, H - y, color);
				}
			}
			for (let i = 0; i < 8; i++) {
				const cx =
						((hash(i * 25 + 10) * W * 1.8 + t * (1 + (i % 3))) % (W + 160)) -
						80,
					cy = horizon - (98 + hash(i + 2) * 120) * S;
				px.blend(g, look.mood === "night" ? 0.15 : 0.55, "normal", () => {
					for (let j = 0; j < 4; j++)
						px.ell(
							g,
							cx + j * 12 * S,
							cy + Math.sin(j) * 3 * S,
							(19 - j) * S,
							6 * S,
							"#f7e9d5",
						);
				});
			}
			// A distant court, its arches and pennants; entirely decorative.
			const yy = horizon + 11 * S;
			for (const bank of [0, 1]) {
				const bx = bank ? W * 0.72 : W * 0.03,
					bw = W * 0.25;
				px.rect(
					g,
					bx,
					yy - 19 * S,
					bw,
					21 * S,
					look.mood === "night" ? "#303447" : "#8e8d82",
				);
				for (let x = bx + 4 * S; x < bx + bw; x += 17 * S) {
					px.rect(g, x, yy - 13 * S, 10 * S, 14 * S, look.hills);
					px.ell(g, x + 5 * S, yy - 13 * S, 5 * S, 5 * S, look.hills);
				}
				for (let x = bx; x < bx + bw; x += 14 * S)
					px.rect(
						g,
						x,
						yy - 24 * S,
						8 * S,
						7 * S,
						look.mood === "night" ? "#4e4b5b" : "#afa28b",
					);
			}
			if (look.mood === "quarry")
				for (let i = 0; i < 9; i++) {
					const x = hash(i * 71) * W,
						y = horizon + 8 * S;
					px.poly(
						g,
						[
							[x - 15 * S, y],
							[x - 3 * S, y - 22 * S],
							[x + 11 * S, y - 7 * S],
							[x + 20 * S, y],
						],
						"#b8ab91",
					);
					lineWorld(g, r, 45 + i * 63, 107, 55 + i * 63, 117, "#d1c3a3");
				}
			if (look.mood === "royal" || look.mood === "keep") {
				const bx = W * 0.5,
					by = horizon - 8 * S;
				for (const [dx, hh] of [
					[-38, 47],
					[-19, 68],
					[0, 88],
					[19, 68],
					[38, 47],
				]) {
					px.rect(
						g,
						bx + (dx - 7) * S,
						by - hh * S,
						14 * S,
						hh * S,
						look.hills,
					);
					px.poly(
						g,
						[
							[bx + (dx - 11) * S, by - hh * S],
							[bx + dx * S, by - (hh + 18) * S],
							[bx + (dx + 11) * S, by - hh * S],
						],
						look.mood === "royal" ? "#906976" : "#656780",
					);
					for (let q = 15; q < hh; q += 17)
						px.rect(g, bx + (dx - 1) * S, by - q * S, 2 * S, 6 * S, look.far);
				}
			}
		});
	}
	function ground(r, app, look) {
		const S = r.ppu;
		r.decal((g) => {
			const gy = r.w(0, 0, 40)[1],
				waterY = r.w(0, 0, 19)[1],
				left = r.w(245, 0, 0)[0],
				right = r.w(395, 0, 0)[0];
			// Calm water reaches the foreground; its highlights follow each court's light.
			px.rect(
				g,
				0,
				waterY,
				r.W,
				r.H - waterY,
				look.mood === "night" ? "#1a304d" : "#2a667b",
			);
			for (let row = 0; row < 17; row++) {
				const yy = waterY + row * 6 * S;
				for (let i = 0; i < 11; i++) {
					const x =
						(hash(i + row * 31) * r.W +
							Math.sin(clock * 1.3 + row) * 7 * S +
							r.W) %
						r.W;
					px.rect(
						g,
						x,
						yy + Math.sin(i + clock * 1.7) * S,
						(5 + hash(i * 7 + row) * 18) * S,
						1,
						look.mood === "night" ? "#435576" : "#6398a0",
					);
				}
			}
			const mx = r.W * 0.63;
			for (let i = 0; i < 14; i++)
				px.blend(g, 0.2, "normal", () =>
					px.rect(
						g,
						mx - (10 + i * 0.7) * S + Math.sin(i + clock) * 3 * S,
						waterY + i * 4 * S,
						(20 + i * 1.4) * S,
						2 * S,
						look.sun,
					),
				);
			// Cutaway stone banks, turf lip, layered soil and embedded river rock.
			for (const [x0, x1] of [
				[-60, 245],
				[395, 700],
			]) {
				const [sx] = r.w(x0, 0, 0),
					[ex] = r.w(x1, 0, 0);
				px.rect(g, sx, gy, ex - sx, r.H - gy, look.earth);
				px.rect(
					g,
					sx,
					gy,
					ex - sx,
					5 * S,
					look.mood === "quarry" ? "#c2ad83" : "#819260",
				);
				px.rect(g, sx, gy + 5 * S, ex - sx, 3 * S, "#a28b64");
				px.rect(g, sx, gy + 9 * S, ex - sx, 2 * S, "#493e41");
				for (let i = Math.floor(x0 / 8); i < x1 / 8; i++) {
					const x = i * 8,
						[xx] = r.w(x, 0, 0);
					px.rect(
						g,
						xx,
						gy + 2 * S,
						5 * S,
						(hash(i + 74) * 4 + 1) * S,
						look.mood === "quarry" ? "#d3c299" : "#a0b579",
					);
					for (let j = 0; j < 5; j++) {
						const yy = gy + (20 + j * 17 + hash(i * 17 + j) * 9) * S;
						if (yy > r.H) continue;
						px.ell(
							g,
							xx + hash(i * 31 + j) * 5 * S,
							yy,
							(2 + hash(i * 13 + j) * 5) * S,
							2 * S,
							j % 2 ? "#8c7358" : "#4e4140",
						);
					}
				}
			}
			// Near edges are a visibly deep cliff, a clean opening over the river.
			for (const [x, f] of [
				[245, -1],
				[395, 1],
			]) {
				const [sx] = r.w(x, 0, 0);
				px.poly(
					g,
					[
						[sx, gy],
						[sx + f * 8 * S, gy + 4 * S],
						[sx + f * 5 * S, waterY + 12 * S],
						[sx + f * 17 * S, waterY + 34 * S],
						[sx + f * 25 * S, r.H],
						[sx + f * 70 * S, r.H],
						[sx + f * 70 * S, gy],
					],
					"#493e40",
				);
				px.line(g, sx, gy, sx + f * 6 * S, waterY + 10 * S, "#c1a875", 2);
			}
		});
		// Native props keep the world at home in the engine's house style.
		const night = look.mood === "night" || look.mood === "royal";
		for (const [id, x, z, size] of [
			["barrel", 207, 40, 0.65],
			["crate", 221, 40, 0.6],
			["barrel", 433, 40, 0.65],
			["sign", 21, 40, 0.7],
			["rock", 238, 40, 0.8],
			["rock", 402, 40, 0.8],
			["grass", 15, 40, 1],
			["grass", 624, 40, 1],
		])
			r.prop(id, x, 1, z, { size });
		for (const x of [27, 230, 410, 613])
			r.prop(night ? "brazier" : "torch", x, 1, 40, {
				size: night ? 0.8 : 0.65,
				light: night,
				lightRadius: 38,
				lightIntensity: look.mood === "night" ? 0.38 : 0.18,
				haloR: 6,
			});
		for (const x of [12, 628])
			r.shape("rumble-buttress", x, 1, 40, { scale: 0.9, shadow: false });
		for (let i = 0; i < crowds.length; i++) {
			const seat = i < 7 ? 0 : 1,
				j = i % 7,
				x = seat ? 620 - j * 14 : 20 + j * 14;
			const rig = crowds[i];
			r.actor(x, -12, 49, (g, ox, oy) => rig.draw(g, ox, oy, r.view), {
				alpha: 0.8,
				rim: false,
			});
		}
		r.decal((g) => {
			for (const [x0, x1] of [
				[10, 123],
				[517, 630],
			]) {
				lineWorld(g, r, x0, 42, x1, 42, "#654b45", 3);
				lineWorld(g, r, x0, 50, x1, 50, "#a38b68", 2);
				for (let x = x0; x < x1; x += 13)
					lineWorld(g, r, x, 40, x, 53, "#765e4d", 2);
			}
		});
	}
	function castles(r, app) {
		const w = app.world;
		if (!w) return;
		const look = COURT_LOOKS[w.court] || COURT_LOOKS[0],
			S = r.ppu;
		for (const b of w.blocks) {
			if (!b.alive) continue;
			const mat = material(w.court, b.material),
				tint = b.foundation ? "#948572" : null;
			r.shape("rumble-block", b.x + b.w / 2, 0, b.z, {
				params: { w: b.w, h: b.h },
				mats: { s: mat },
				shadow: false,
				facing: Math.PI / 2,
				pick: b,
			});
			r.queue(
				b.x + b.w / 2,
				1,
				b.z,
				(g) => {
					const [x, y] = r.w(b.x, 0, b.z + b.h),
						bw = b.w * S,
						bh = b.h * S,
						frac = b.hp / b.maxHp;
					if (b.foundation) {
						px.rect(g, x, y, bw, 2 * S, "#ddc8a2");
						return;
					}
					if (b.material === "reinforced") {
						px.rect(g, x + 2 * S, y + bh * 0.25, bw - 4 * S, 2 * S, "#6e7180");
						px.rect(g, x + 2 * S, y + bh * 0.75, bw - 4 * S, 2 * S, "#777a86");
						px.dot(g, x + 3 * S, y + bh * 0.25, "#e0d3ae");
						px.dot(g, x + bw - 4 * S, y + bh * 0.75, "#ded4b9");
					}
					if (b.material === "wood") {
						px.line(
							g,
							x + 2 * S,
							y + bh - 3 * S,
							x + bw - 2 * S,
							y + 2 * S,
							"#d6ac6f",
							Math.max(1, Math.round(S * 2)),
						);
						px.dot(g, x + 3 * S, y + 3 * S, "#4b4146");
						px.dot(g, x + bw - 4 * S, y + bh - 4 * S, "#4b4146");
					}
					if (frac < 0.75) {
						px.line(
							g,
							x + bw * 0.53,
							y + 1,
							x + bw * 0.42,
							y + bh * 0.42,
							"#554a4e",
						);
						px.line(
							g,
							x + bw * 0.42,
							y + bh * 0.42,
							x + bw * 0.65,
							y + bh * 0.7,
							"#554a4e",
						);
						if (frac < 0.4) {
							px.line(
								g,
								x + bw * 0.42,
								y + bh * 0.42,
								x + bw * 0.2,
								y + bh * 0.6,
								"#4d444b",
								2,
							);
							px.line(
								g,
								x + bw * 0.65,
								y + bh * 0.7,
								x + bw * 0.51,
								y + bh,
								"#4d444b",
								2,
							);
						}
					}
					if (b.z <= 60 && b.id % 3 === 0) {
						const T = TEAMS[b.seat];
						px.rect(
							g,
							x + bw * 0.35,
							y + 2 * S,
							Math.max(2, bw * 0.3),
							Math.max(3, bh - 4 * S),
							T.dark,
						);
						px.rect(
							g,
							x + bw * 0.43,
							y + 2 * S,
							Math.max(1, bw * 0.12),
							Math.max(2, bh - 5 * S),
							T.color,
						);
					}
				},
				{ bias: 0.01 },
			);
		}
		for (let seat = 0; seat < 2; seat++) {
			const blocks = w.blocks.filter(
					(b) => b.alive && b.seat === seat && !b.foundation,
				),
				top = blocks.reduce((n, b) => Math.max(n, b.z + b.h), 70),
				x = seat ? 596 : 44;
			r.queue(
				x,
				-1,
				40,
				(g) =>
					flag(
						g,
						r,
						x,
						Math.max(85, top - 4),
						seat,
						w.phase === "over" && w.outcome?.winner !== seat,
					),
				{ bias: -0.02 },
			);
		}
		if (
			app.debugCollision ||
			app.showCollision ||
			app.dev?.collision ||
			app.dev?.support
		)
			r.overlay((g) => {
				for (const b of w.blocks)
					if (b.alive) {
						const [x, y] = r.w(b.x, 0, b.z + b.h),
							W = b.w * S,
							H = b.h * S,
							c = b.foundation ? "#e6cb7b" : "#86e7bc";
						px.line(g, x, y, x + W, y, c);
						px.line(g, x, y, x, y + H, c);
						px.line(g, x + W, y, x + W, y + H, c);
						px.line(g, x, y + H, x + W, y + H, c);
						for (const id of b.supports || []) {
							const q = w.blocks.find((s) => s.id === id);
							if (q?.alive)
								lineWorld(
									g,
									r,
									b.x + b.w / 2,
									b.z + b.h / 2,
									q.x + q.w / 2,
									q.z + q.h / 2,
									"#efb1ef",
								);
						}
					}
			});
		const editorBlocks = app.editorBlocks,
			editorSelection = app.editorSelection;
		if (Array.isArray(editorBlocks))
			r.overlay((g) => {
				for (const b of editorBlocks) {
					if (!b.alive) continue;
					const [x, y] = r.w(b.x, 0, b.z + b.h),
						bw = b.w * S,
						bh = b.h * S,
						selected = b.id === editorSelection,
						C = selected ? "#fff1a2" : "#91b2bd";
					px.blend(g, selected ? 0.35 : 0.12, "normal", () =>
						px.rect(g, x, y, bw, bh, C),
					);
					px.line(g, x, y, x + bw, y, C, selected ? 2 : 1);
					px.line(g, x, y, x, y + bh, C, selected ? 2 : 1);
					px.line(g, x + bw, y, x + bw, y + bh, C, selected ? 2 : 1);
					px.line(g, x, y + bh, x + bw, y + bh, C, selected ? 2 : 1);
					if (selected) {
						E.font.text(g, "#" + b.id, x + bw / 2, y - 11, C, {
							align: "center",
							outline: false,
							shadow: "#26313d",
						});
						for (const id of b.supports || []) {
							const q = editorBlocks.find((s) => s.id === id);
							if (q)
								lineWorld(
									g,
									r,
									b.x + b.w / 2,
									b.z + b.h / 2,
									q.x + q.w / 2,
									q.z + q.h / 2,
									"#efb1ef",
									2,
								);
						}
					}
				}
			});
	}
	function catapult(r, p, w, seat, app) {
		const S = r.ppu,
			f = seat ? -1 : 1,
			T = TEAMS[seat],
			repair = p.launcherUntil > w.time,
			absence = Math.max(p.launcherUntil, p.crewUntil) > w.time,
			protectedNow = p.protectUntil > w.time;
		const recoil =
				releases[seat] > 0
					? Math.sin(clamp((0.38 - releases[seat]) / 0.38, 0, 1) * Math.PI)
					: 0,
			q = p.charge?.power || 0;
		r.actor(
			p.x,
			2,
			40,
			(g, ox, oy) => {
				const X = (v) => ox + v * S * f,
					Y = (v) => oy - v * S,
					wood = E.tones(repair ? "#7e6854" : "#aa7848"),
					iron = E.tones("#8d98a0"),
					lift = repair ? Math.sin(clock * 3) * 0.8 : 0;
				// Wheels: spoke angles turn under the weight and recoil of the sling.
				for (const wx of [-19, 19]) {
					const cx = X(wx - recoil),
						cy = Y(7);
					px.disc(g, cx, cy, 8 * S, wood.deep);
					px.disc(g, cx, cy, 6.5 * S, wood.base);
					px.disc(g, cx, cy, 4.5 * S, wood.sh);
					for (let j = 0; j < 6; j++) {
						const a = (j * Math.PI) / 3 + q * 0.5 + recoil * 0.15;
						px.line(
							g,
							cx,
							cy,
							cx + Math.cos(a) * 5 * S,
							cy + Math.sin(a) * 5 * S,
							wood.lt,
							Math.max(1, Math.round(S)),
						);
					}
					px.disc(g, cx, cy, 2 * S, iron.lt);
					px.dot(g, cx - S, cy - S, iron.hi);
				}
				px.line(
					g,
					X(-28 - recoil),
					Y(12),
					X(28 - recoil),
					Y(12),
					wood.deep,
					7 * S,
				);
				px.line(
					g,
					X(-27 - recoil),
					Y(14),
					X(27 - recoil),
					Y(14),
					wood.base,
					4 * S,
				);
				px.line(g, X(-27 - recoil), Y(16), X(27 - recoil), Y(16), wood.lt, S);
				// A-braced frame and the winch axle.
				for (const ax of [-14, 14]) {
					px.line(g, X(ax), Y(15), X(-3), Y(36 + lift), wood.deep, 6 * S);
					px.line(g, X(ax), Y(16), X(-3), Y(36 + lift), wood.base, 3 * S);
					px.line(g, X(ax - 1), Y(18), X(-4), Y(36 + lift), wood.lt, S);
				}
				px.line(g, X(-14), Y(23), X(14), Y(23), iron.sh, 3 * S);
				px.disc(g, X(-3), Y(35 + lift), 4 * S, iron.sh);
				px.disc(g, X(-3), Y(35 + lift), 2.5 * S, iron.lt);
				let a = -0.45 - q * 1.08;
				if (releases[seat] > 0)
					a =
						-1.55 +
						Math.sin(
							clamp((0.38 - releases[seat]) / 0.13, 0, 1) * Math.PI * 0.5,
						) *
							2.45;
				if (repair) a = -0.83;
				const ax = -3 - recoil,
					az = 35 + lift,
					tx = ax + Math.cos(a) * 38,
					tz = az + Math.sin(a) * 38,
					bx = ax - Math.cos(a) * 12,
					bz = az - Math.sin(a) * 12;
				// Flexible sling and taut rope are separate visible mechanisms.
				px.line(
					g,
					X(-24),
					Y(20),
					X(tx),
					Y(tz),
					q > 0.15 ? "#eee1bb" : "#a79472",
					S,
				);
				px.line(g, X(-24), Y(20), X(-3), Y(35), wood.deep, S);
				px.line(g, X(bx), Y(bz), X(tx), Y(tz), wood.deep, 7 * S);
				px.line(g, X(bx), Y(bz + 1), X(tx), Y(tz + 1), wood.base, 4 * S);
				px.line(g, X(bx), Y(bz + 2), X(tx), Y(tz + 2), wood.lt, S);
				px.ell(g, X(tx), Y(tz), 7 * S, 3 * S, "#4f3d38");
				px.ell(g, X(tx), Y(tz + 1), 5 * S, 2 * S, "#9b7952");
				if (!repair && releases[seat] <= 0) {
					px.disc(g, X(tx), Y(tz + 4), 4 * S, STONE_COLORS[p.stone]);
					px.dot(g, X(tx - 1), Y(tz + 6), "#f7e9c8");
				}
				const wind = clock * (p.charge ? 18 : repair ? 9 : 0),
					cx = X(-22),
					cy = Y(20);
				px.disc(g, cx, cy, 5 * S, wood.deep);
				px.disc(g, cx, cy, 3.5 * S, wood.lt);
				px.line(
					g,
					cx - Math.cos(wind) * 6 * S,
					cy - Math.sin(wind) * 6 * S,
					cx + Math.cos(wind) * 6 * S,
					cy + Math.sin(wind) * 6 * S,
					iron.sh,
					2 * S,
				);
				px.disc(
					g,
					cx + Math.cos(wind) * 6 * S,
					cy + Math.sin(wind) * 6 * S,
					2 * S,
					wood.sh,
				);
				px.poly(
					g,
					[
						[X(-7), Y(20)],
						[X(7), Y(20)],
						[X(7), Y(8)],
						[X(0), Y(3)],
						[X(-7), Y(8)],
					],
					T.dark,
				);
				px.line(g, X(0), Y(7), X(0), Y(18), T.color, 2 * S);
				if (seat) px.line(g, X(-4), Y(13), X(4), Y(13), T.bright, S);
				else px.disc(g, X(0), Y(13), 2 * S, T.bright);
				if (repair) {
					px.line(g, X(17), Y(20), X(25), Y(29), "#e7cd9c", 2 * S);
					px.line(g, X(19), Y(31), X(27), Y(25), iron.lt, 4 * S);
					for (let i = 0; i < 3; i++) {
						const t = (clock * 2 + i * 0.3) % 1;
						px.dot(g, X(-8 + i * 8 + t * 4), Y(25 + t * 18), "#ffe09a");
					}
				}
				if (protectedNow) {
					if (!app.settings.reducedMotion) {
						px.ddisc(g, ox, Y(20), 33 * S, "#ffe59b", 0.2);
						for (let i = 0; i < 8; i++) {
							const aa = clock * 1.4 + (i * Math.PI) / 4;
							px.disc(
								g,
								ox + Math.cos(aa) * 31 * S,
								Y(23) + Math.sin(aa) * 26 * S,
								1.2 * S,
								"#ffedac",
							);
						}
					}
					px.poly(
						g,
						[
							[X(30), Y(30)],
							[X(39), Y(30)],
							[X(39), Y(22)],
							[X(34.5), Y(18)],
							[X(30), Y(22)],
						],
						"#f7d477",
					);
					px.line(g, X(34.5), Y(22), X(34.5), Y(28), "#685444", S);
				}
			},
			{
				flash: wounds[seat] > 0 ? "#fff1c5" : null,
				flashMix: 0.3,
				rim: true,
				pick: { target: "launcher", seat },
			},
		);
		// Crew return/repair stays visible; their protection is marked above the rig.
		const rig = rigs[seat],
			helper = helpers[seat];
		r.actor(helper.x, 1, 40, (g, ox, oy) => helper.draw(g, ox, oy, r.view), {
			alpha: absence ? 0.7 : 1,
		});
		r.actor(rig.x, 3, 40, (g, ox, oy) => rig.draw(g, ox, oy, r.view), {
			flash: wounds[seat] > 0 ? "#fff5d7" : null,
			pick: { target: "crew", seat },
		});
		if (w.phase === "over" && w.outcome?.winner !== seat)
			r.queue(rig.x, 4, 40, (g) =>
				flag(g, r, rig.x + f * 6, 74, seat, true, true),
			);
		r.overlay((g) => {
			const [sx, sy] = r.w(p.x, 0, 93);
			let text = "",
				color = T.bright;
			if (repair) {
				text =
					"REPAIR " + Math.max(0, p.launcherUntil - w.time).toFixed(1) + "s";
				color = "#ffca8a";
			} else if (p.crewUntil > w.time) {
				text = "CREW AWAY " + (p.crewUntil - w.time).toFixed(1) + "s";
				color = "#ffca8a";
			} else if (protectedNow) {
				text = "PROTECTED";
				color = "#ffe1a0";
			} else if (p.reloadUntil > w.time) {
				text = "RELOAD";
				color = "#c7b9ad";
			} else if (p.charge) {
				text = q >= 0.999 ? "FULL TENSION" : "WINDING";
				color = "#ffe199";
			} else text = "READY";
			E.font.text(g, text, sx, sy, color, {
				align: "center",
				outline: false,
				shadow: "#252431",
				font: "tiny",
			});
		});
	}
	function shots(r, app) {
		const w = app.world;
		if (!w) return;
		const S = r.ppu;
		r.decal((g) => {
			for (const line of trails.values())
				for (let i = 0; i < line.length; i++) {
					const q = line[i],
						[x, y] = r.w(q.x, 0, q.z),
						a = clamp(((i + 1) / line.length) * 0.5, 0, 1);
					px.blend(g, a, "normal", () =>
						px.disc(g, x, y, (1 + (i / line.length) * 1.8) * S, "#e5dfc4"),
					);
				}
		});
		for (const p of w.projectiles)
			r.actor(
				p.x,
				2,
				p.z,
				(g, ox, oy) => {
					const radius = (p.fragment ? 2.2 : p.type === 1 ? 5 : 4) * S,
						C = E.tones(STONE_COLORS[p.type] || STONE_COLORS[0]);
					if (p.type === 1 && !p.fragment) {
						px.poly(
							g,
							[
								[ox - radius, oy - radius * 0.5],
								[ox - radius * 0.35, oy - radius],
								[ox + radius * 0.7, oy - radius * 0.8],
								[ox + radius, oy + radius * 0.5],
								[ox, oy + radius],
								[ox - radius, oy + radius * 0.5],
							],
							C.sh,
						);
						px.poly(
							g,
							[
								[ox - radius, oy - radius * 0.5],
								[ox - radius * 0.35, oy - radius],
								[ox + radius * 0.7, oy - radius * 0.8],
								[ox, oy],
							],
							C.lt,
						);
						px.line(
							g,
							ox - radius * 0.5,
							oy,
							ox + radius * 0.5,
							oy + radius * 0.5,
							C.deep,
						);
					} else {
						px.disc(g, ox, oy, radius, C.deep);
						px.disc(g, ox - S, oy - S, radius * 0.76, C.base);
						px.disc(g, ox - S, oy - S, radius * 0.4, C.lt);
					}
					if (p.type === 2 && !p.fragment) {
						px.line(g, ox, oy - radius, ox - S, oy + radius, C.deep);
						px.line(g, ox - S, oy, ox + radius, oy + S, C.deep);
						px.dot(g, ox - radius * 0.5, oy - radius * 0.5, "#fff2b9");
					}
				},
				{ outline: true, rim: true, emissive: p.type === 2 ? 0.15 : false },
			);
		r.decal((g) => {
			for (const d of debris) {
				const [x, y] = r.w(d.x, 0, d.z),
					v = Math.sin(d.spin + d.t * 3);
				px.blend(g, Math.min(1, (d.life - d.t) * 2), "normal", () => {
					px.poly(
						g,
						[
							[x - d.w * S * 0.5, y],
							[x - d.w * S * 0.4, y - d.h * S],
							[x + d.w * S * 0.5, y - d.h * S * (0.6 + v * 0.2)],
							[x + d.w * S * 0.4, y],
						],
						d.color,
					);
					px.line(
						g,
						x - d.w * S * 0.4,
						y - d.h * S,
						x + d.w * S * 0.5,
						y - d.h * S * (0.6 + v * 0.2),
						"#ebcda1",
					);
				});
			}
			for (const o of rings) {
				const [x, y] = r.w(o.x, 0, o.z),
					q = o.t / o.life,
					rr = (2 + q * o.size) * S;
				px.blend(g, (1 - q) * 0.7, "normal", () => {
					for (let j = 0; j < 14; j++) {
						const a = (j * Math.PI) / 7;
						px.rect(
							g,
							x + Math.cos(a) * rr,
							y + Math.sin(a) * rr,
							Math.max(1, 2 * S),
							Math.max(1, 2 * S),
							o.color,
						);
					}
				});
			}
			for (const o of splashes) {
				const [x, y] = r.w(o.x, 0, 19),
					q = o.t;
				for (let i = 0; i < 9; i++) {
					const vx = (i - 4) * 13,
						vz = 28 + hash(i + 7) * 28,
						zz = vz * q - 70 * q * q;
					px.disc(
						g,
						x + vx * q * S,
						y - zz * S,
						Math.max(0.5, (2 - q) * S),
						"#c7eeeb",
					);
				}
				px.ell(g, x, y, (6 + q * 25) * S, 1.5 * S, "#9cced4");
			}
		});
	}
	function aiming(r, app) {
		const w = app.world;
		if (!w) return;
		const S = r.ppu;
		r.overlay((g) => {
			for (let seat = 0; seat < 2; seat++) {
				const p = w.players[seat],
					T = TEAMS[seat],
					last = p.last?.[p.stone];
				if (last) {
					const [x, y] = r.w(last.x, 0, last.z);
					px.line(g, x - 4, y - 4, x + 4, y + 4, T.color);
					px.line(g, x + 4, y - 4, x - 4, y + 4, T.color);
					E.font.text(g, "LAST", x, y + 7, T.bright, {
						align: "center",
						font: "tiny",
						outline: false,
						shadow: "#242632",
					});
				}
			}
			for (let seat = 0; seat < 2; seat++) {
				const prediction = predictions[seat];
				if (!prediction) continue;
				const T = TEAMS[seat],
					points = prediction.points || [];
				if (
					app.settings.prediction ||
					app.showPrediction ||
					app.dev?.prediction
				) {
					for (let i = 0; i < points.length; i += 5) {
						const p = points[i],
							[x, y] = r.w(p[0], 0, p[1]);
						px.disc(g, x, y, 1, T.bright);
					}
				}
				for (const [index, hit] of (prediction.impacts || []).entries()) {
					const [sx, sy] = r.w(hit.x, 0, hit.z),
						outside = sx < 14 || sx > r.W - 14,
						x = clamp(sx, 14, r.W - 14),
						y = clamp(sy, 78, r.H - 76),
						radius = 6 + Math.sin(clock * 7);
					px.line(g, x - radius, y, x - 3, y, T.bright);
					px.line(g, x + 3, y, x + radius, y, T.bright);
					px.line(g, x, y - radius, x, y - 3, T.bright);
					px.line(g, x, y + 3, x, y + radius, T.bright);
					px.dot(g, x, y, "#fff2ce");
					if (index === 0) {
						const label = outside
							? "TOO FAR"
							: hit.target === "block"
								? "WALL 3"
								: hit.target === "crew"
									? "CREW 7"
									: hit.target === "launcher"
										? "LAUNCHER 13"
										: hit.target === "water"
											? "WATER"
											: "GROUND";
						E.font.text(g, label, clamp(x, 35, r.W - 35), y - 16, T.bright, {
							align: "center",
							outline: false,
							font: "tiny",
							shadow: "#222333",
						});
					}
				}
			}
			const q = app.pointerWorld;
			if (q && app.screen === "play" && app.mode !== "attract") {
				const [x, y] = r.w(q.x, 0, q.z);
				px.line(g, x - 5, y, x + 5, y, "#e6daba");
				px.line(g, x, y - 5, x, y + 5, "#e6daba");
				const b = w.blocks.find(
					(b) =>
						b.alive &&
						q.x >= b.x &&
						q.x <= b.x + b.w &&
						q.z >= b.z &&
						q.z <= b.z + b.h,
				);
				if (b) {
					const [bx, by] = r.w(b.x, 0, b.z + b.h),
						bw = b.w * S,
						bh = b.h * S;
					px.line(g, bx, by, bx + bw, by, "#fff0aa", 2);
					px.line(g, bx, by, bx, by + bh, "#fff0aa", 2);
					px.line(g, bx + bw, by, bx + bw, by + bh, "#fff0aa", 2);
					px.line(g, bx, by + bh, bx + bw, by + bh, "#fff0aa", 2);
					E.font.text(g, b.material.toUpperCase(), x, y - 15, "#fff1bf", {
						align: "center",
						outline: false,
						shadow: "#242632",
						font: "tiny",
					});
				}
			}
		});
	}
	function hud(r, app) {
		if (
			!["play", "pause", "developer", "author"].includes(app.screen) &&
			app.mode !== "attract"
		)
			return;
		const w = app.world;
		if (!w) return;
		const W = r.W,
			H = r.H,
			touch = app.device === "touch",
			phone = H > W * 1.2,
			twoKeys =
				app.mode === "local" &&
				app.settings.seat1 === "keyboard" &&
				app.settings.seat2 === "keyboard";
		r.overlay((g) => {
			const boxW = Math.min(201, (W - 116) / 2),
				margin = 14,
				y = 14;
			for (let seat = 0; seat < 2; seat++) {
				const p = w.players[seat],
					T = TEAMS[seat],
					x = seat ? W - margin - boxW : margin;
				E.ui.box(g, x, y, boxW, 42, {
					bg: ["#1f273b", "#151c2c"],
					border: T.dark,
					alpha: 0.9,
				});
				px.rect(g, x, y, 4, 42, T.color);
				E.font.text(
					g,
					(seat ? "II  " : "I  ") +
						(app.mode === "hub"
							? app.online?.names?.[seat] || "PLAYER " + (seat + 1)
							: seat
								? p.ai
									? "THE CHALLENGER"
									: "PLAYER TWO"
								: "YOUR COURT"),
					x + 10,
					y + 6,
					T.bright,
					{ outline: false, font: phone ? undefined : "tiny" },
				);
				const frac = health(w, seat);
				E.ui.bar(g, x + 10, y + 18, boxW - 49, 6, frac, T.color);
				E.font.text(
					g,
					Math.round(frac * 100) + "%",
					x + boxW - 8,
					y + 18,
					"#f3e5cc",
					{ align: "right", font: phone ? undefined : "tiny", outline: false },
				);
				E.font.text(
					g,
					"HITS " +
						p.score +
						(app.mode === "solo" || app.war
							? "   BANK " + (app.tour?.totals?.[seat] || 0)
							: ""),
					x + 10,
					y + 30,
					"#b9c6ca",
					{ outline: false, font: phone ? undefined : "tiny" },
				);
			}
			const remaining = Math.max(0, Math.ceil(w.limit - w.time)),
				timeText =
					Math.floor(remaining / 60) +
					":" +
					String(remaining % 60).padStart(2, "0");
			E.font.text(
				g,
				timeText,
				W / 2,
				y + 3,
				remaining <= 15 ? "#ffad88" : "#f6e3bd",
				{ align: "center", scale: 2, outline: false, shadow: "#222333" },
			);
			E.font.text(
				g,
				app.mode === "solo" || app.war
					? "BOUT " + w.bout + "/10"
					: app.mode === "hub"
						? "HUB DUEL"
						: "DUEL",
				W / 2,
				y + 25,
				"#c7c5b8",
				{ align: "center", font: "tiny", outline: false },
			);
			// Both human tensions remain independent; a single meter per seat reads from one command state.
			const meterY = H - (phone ? 118 : twoKeys ? 60 : 48),
				meterW = Math.min(228, (W - 68) / 2);
			for (let seat = 0; seat < 2; seat++) {
				const p = w.players[seat],
					T = TEAMS[seat],
					x = seat ? W - 18 - meterW : 18,
					q = p.charge?.power || 0;
				E.ui.box(g, x, meterY, meterW, 31, {
					bg: "#1b2332",
					border: q > 0.98 ? "#ffd16f" : T.dark,
					alpha: 0.9,
				});
				px.rect(g, x + 5, meterY + 18, meterW - 10, 7, "#3c3e48");
				if (q > 0)
					px.rect(
						g,
						x + 6,
						meterY + 19,
						(meterW - 12) * q,
						5,
						q > 0.98 ? "#f7b574" : T.color,
					);
				for (const tick of [0.25, 0.5, 0.75])
					px.rect(
						g,
						x + 6 + (meterW - 12) * tick,
						meterY + 18,
						1,
						7,
						"#6f6d69",
					);
				const text = p.charge
					? Math.round(q * 100) + "% TENSION"
					: p.reloadUntil > w.time
						? "RELOADING"
						: Math.max(p.crewUntil, p.launcherUntil) > w.time
							? "INTERRUPTED"
							: p.buffer
								? "BUFFERED"
								: "HOLD TO WIND";
				E.font.text(g, STONE_NAMES[p.stone], x + 7, meterY + 5, T.bright, {
					outline: false,
					font: phone ? undefined : "tiny",
				});
				E.font.text(
					g,
					text,
					x + meterW - 7,
					meterY + 5,
					q > 0.98 ? "#ffd49b" : "#cdd2cc",
					{ align: "right", outline: false, font: phone ? undefined : "tiny" },
				);
			}
			if (app.mode === "attract") {
				E.ui.box(g, W / 2 - 122, H - 88, 244, 26, {
					bg: "#172033",
					border: "#c8a66d",
					alpha: 0.9,
				});
				E.font.text(g, "THE ROYAL EXHIBITION", W / 2, H - 81, "#ffe0a1", {
					align: "center",
					outline: false,
				});
				E.font.text(g, "ANY INPUT RETURNS TO COURT", W / 2, H - 70, "#c4d6d5", {
					align: "center",
					outline: false,
					font: "tiny",
				});
			} else if (!touch) {
				const pad = app.device === "pad",
					xb = app.settings.glyphs === "Xbox",
					fire = pad
						? xb
							? "A"
							: "Cross"
						: keyName(app.settings.fire1 || "Space"),
					switcher = pad
						? xb
							? "LB / RB"
							: "L1 / R1"
						: `${keyName(app.settings.prev1 || "KeyQ")} / ${keyName(app.settings.next1 || "KeyE")}`;
				const msg = `HOLD ${fire} · RELEASE TO THROW    ${switcher} STONE    ${pad ? "Options" : "Esc"} MENU`;
				E.font.text(g, msg, W / 2, H - (twoKeys ? 23 : 12), "#c8cec9", {
					align: "center",
					font: "tiny",
					outline: false,
					shadow: "#222432",
				});
				if (twoKeys)
					E.font.text(
						g,
						`P2 HOLD ${keyName(app.settings.fire2 || "ShiftRight")} · RELEASE TO THROW    ${keyName(app.settings.prev2 || "KeyU")} / ${keyName(app.settings.next2 || "KeyO")} STONE`,
						W / 2,
						H - 11,
						TEAMS[1].bright,
						{
							align: "center",
							font: "tiny",
							outline: false,
							shadow: "#222432",
						},
					);
			} else if (phone) {
				E.font.text(
					g,
					"HOLD YOUR HALF · RELEASE TO THROW",
					W / 2,
					H - 66,
					"#e6d6ba",
					{ align: "center", outline: false },
				);
				E.font.text(
					g,
					"Tap a stone chip to change your throw",
					W / 2,
					H - 49,
					"#b7c6ca",
					{ align: "center", outline: false, font: "tiny" },
				);
			}
			if (app.caption) {
				const text = String(app.caption);
				E.font.text(g, text, W / 2, phone ? 85 : 69, "#ffe1ac", {
					align: "center",
					outline: false,
					shadow: "#272636",
					wrap: W - 44,
				});
			}
			if (app.cheated || app.tour?.cheated)
				E.font.text(
					g,
					"PRACTICE · DEV TUNING",
					W / 2,
					phone ? 110 : 84,
					"#d8b6c9",
					{ align: "center", font: "tiny", outline: false },
				);
			if (phone) {
				E.font.text(
					g,
					COURT_LOOKS[w.court]?.name || "",
					W / 2,
					107,
					"#d7d7c4",
					{ align: "center", outline: false },
				);
			}
			if (inset) {
				const I = inset,
					T = TEAMS[I.seat],
					view = new E.View("rumble-inset", "Target inset", 0, 0, I.scale, 1),
					cx = I.x + I.w / 2,
					cy = I.y + (I.h + 5) / 2,
					toX = (x) => cx + (x - I.centerX) * I.scale,
					toY = (z) => cy - (z - I.centerZ) * I.scale;
				E.ui.box(g, I.x, I.y, I.w, I.h, {
					bg: ["#202b3b", "#172230"],
					border: T.dark,
					alpha: 0.95,
				});
				px.rect(g, I.x, I.y, 3, I.h, T.color);
				E.font.text(g, "OPPONENT CASTLE", I.x + 11, I.y + 9, T.bright, {
					outline: false,
				});
				E.font.text(
					g,
					Math.round(health(w, I.seat) * 100) + "%",
					I.x + I.w - 9,
					I.y + 9,
					"#d6d8ce",
					{ align: "right", outline: false, font: "tiny" },
				);
				const base = toY(I.minZ) + 2;
				px.rect(
					g,
					toX(I.minX) - 4,
					base,
					(I.maxX - I.minX) * I.scale + 8,
					3,
					"#7a7566",
				);
				for (const b of w.blocks)
					if (b.alive && b.seat === I.seat && !b.foundation) {
						const key = `${w.court}:${b.material}:${b.w}:${b.h}:${I.scale}`;
						let sprite = insetSprites.get(key);
						if (!sprite) {
							sprite = E.shapeSprite("rumble-block", {
								view,
								facing: Math.PI / 2,
								params: { w: b.w, h: b.h },
								mats: { s: material(w.court, b.material) },
							});
							insetSprites.set(key, sprite);
						}
						const x = toX(b.x + b.w / 2),
							y = toY(b.z);
						if (sprite) px.sprite(g, sprite, x - sprite.ox, y - sprite.oy);
						if (b.id === I.predictedId) {
							const left = toX(b.x),
								top = toY(b.z + b.h),
								ww = b.w * I.scale,
								hh = b.h * I.scale;
							px.line(g, left, top, left + ww, top, "#fff0a8", 2);
							px.line(g, left, top, left, top + hh, "#fff0a8", 2);
							px.line(g, left + ww, top, left + ww, top + hh, "#fff0a8", 2);
							px.line(g, left, top + hh, left + ww, top + hh, "#fff0a8", 2);
						}
					}
				if (I.last?.target === "block") {
					const x = clamp(toX(I.last.x), I.x + 8, I.x + I.w - 8),
						y = clamp(toY(I.last.z), I.y + 25, I.y + I.h - 15);
					px.line(g, x - 4, y - 4, x + 4, y + 4, TEAMS[I.local].color);
					px.line(g, x + 4, y - 4, x - 4, y + 4, TEAMS[I.local].color);
				}
				E.font.text(
					g,
					"MAGNIFIED · SAME LIVING WALL",
					I.x + I.w / 2,
					I.y + I.h - 9,
					"#aab7b9",
					{ align: "center", outline: false, font: "tiny" },
				);
			}
			if (touch && app.screen === "play") {
				for (const chip of touchLayouts) {
					const T = TEAMS[chip.seat];
					E.ui.box(g, chip.x, chip.y, chip.w, chip.h, {
						bg: "#1d293a",
						border: T.color,
						alpha: 0.9,
					});
					E.font.text(
						g,
						chip.delta < 0 ? "←" : "→",
						chip.x + chip.w / 2,
						chip.y + 9,
						T.bright,
						{ align: "center", scale: 2, outline: false },
					);
				}
				if (touchLayouts.length) {
					const seats = [...new Set(touchLayouts.map((c) => c.seat))];
					for (const seat of seats) {
						const center =
							app.mode === "local" ? (seat ? W * 0.77 : W * 0.23) : W * 0.5;
						E.font.text(
							g,
							STONE_NAMES[w.players[seat].stone],
							center,
							touchLayouts.find((c) => c.seat === seat).y + 11,
							TEAMS[seat].bright,
							{ align: "center", outline: false, font: "tiny" },
						);
					}
				}
				if (app.touchPoint) {
					const canvas = game.screen.canvas,
						rect = canvas?.getBoundingClientRect();
					if (rect) {
						const s = game.screen,
							x =
								(((app.touchPoint.x - rect.left) * canvas.width) / rect.width -
									s.OX) /
								s.S,
							y =
								(((app.touchPoint.y - rect.top) * canvas.height) / rect.height -
									s.OY) /
								s.S,
							p = w.players[app.touchPoint.seat],
							q = p?.charge?.power || 0;
						px.ddisc(g, x, y, 24, "#b6efdd", 0.15);
						for (let i = 0; i < 24 * q; i++) {
							const a = -Math.PI / 2 + (i * Math.PI) / 12;
							px.disc(
								g,
								x + Math.cos(a) * 22,
								y + Math.sin(a) * 22,
								2,
								"#f8d788",
							);
						}
						E.font.text(g, Math.round(q * 100) + "%", x, y - 4, "#fff1c8", {
							align: "center",
							outline: false,
							shadow: "#23313e",
						});
					}
				}
			}
		});
	}
	function draw(r, app) {
		lastR = r;
		const w = app.world,
			look = COURT_LOOKS[w?.court || 0];
		game.lights.ambient =
			look.mood === "night" ? 0.56 : look.mood === "royal" ? 0.74 : 0.88;
		background(r, app, look);
		ground(r, app, look);
		castles(r, app);
		if (w) {
			for (let seat = 0; seat < 2; seat++)
				catapult(r, w.players[seat], w, seat, app);
			shots(r, app);
			aiming(r, app);
		}
		hud(r, app);
	}
	function worldPoint(clientX, clientY) {
		const canvas = game.screen.canvas;
		if (!canvas || !lastR) return { x: 320, z: 40 };
		const rect = canvas.getBoundingClientRect(),
			s = game.screen;
		const x =
				(((clientX - rect.left) * canvas.width) / rect.width - s.OX) / s.S,
			y = (((clientY - rect.top) * canvas.height) / rect.height - s.OY) / s.S,
			v = game.view;
		return {
			x: clamp((x + lastR.ix) / (v.ax || 1), 0, 640),
			z: clamp((y + lastR.iy) / (v.bz || -1), 0, 350),
		};
	}
	return {
		draw,
		update,
		clear,
		worldPoint,
		diagnostics: () => ({
			debris: debris.length,
			rigs: rigs.length + helpers.length + crowds.length,
			events: lastEvent,
			prediction: predictions.some(Boolean),
			predictionSeats: predictions
				.map((p, seat) => (p ? seat : null))
				.filter((seat) => seat !== null),
			inset: inset ? { ...inset } : null,
		}),
	};
}
