import { U, HOME, OPERATION, STATIONS } from "../../content/operation.js";
import { PALETTE as C, CREW } from "../../content/art.js";
import { clamp, wrap, dist } from "../core/math.js";
const E = globalThis.My3D2dge,
	px = E.px;
const TEXT = { outline: false, shadow: "#102c2e" };
export const text = (
	g,
	str,
	x,
	y,
	color = C.cream,
	scale = 1,
	align = "left",
) => E.font.text(g, str, x, y, color, { ...TEXT, scale, align });
export function panel(g, x, y, w, h, alpha = 0.85) {
	E.ui.box(g, x, y, w, h, {
		bg: "#173a3c",
		border: "#728b78",
		gradient: false,
		alpha,
	});
}
export function mapPick(vp, sx, sy, brief = false) {
	const { x, y, w, h } = vp,
		portrait = w < h,
		mw = brief ? (portrait ? w - 32 : w * 0.52) : Math.min(w - 32, 450),
		mh = brief ? (portrait ? h * 0.32 : h * 0.56) : Math.min(h - 95, 230),
		mx = x + 16,
		my = brief ? y + 48 : y + 62,
		k = Math.min((mw - 34) / (28000 * U), (mh - 24) / (20000 * U));
	return {
		inside: sx >= mx && sx <= mx + mw && sy >= my && sy <= my + mh,
		point: [(sx - mx - 10) / k, (sy - my - 8) / k + 2000 * U],
		project: (xx, yy) => [mx + 10 + xx * k, my + 8 + (yy - 2000 * U) * k],
	};
}
export class HUD {
	constructor(game, view) {
		this.game = game;
		this.view = view;
	}
	draw(r, sim, context) {
		const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H, i: 0 },
			{ x, y, w, h } = vp,
			p = context.player || sim.players[0];
		if (!p) return;
		const a = sim.aircraft,
			station = STATIONS.find((s) => s.id === p.station),
			input = context.input || this.game.input,
			split = !!r.viewport;
		r.overlay((g) => {
			if (context.touch) {
				const cx = x + w / 2,
					cy = y + h / 2;
				px.line(g, cx - 12, cy, cx + 12, cy, C.cream);
				px.line(g, cx, cy - 12, cx, cy + 12, C.cream);
				if (p.station === "bombs" && a.sight > 0.4) {
					const q = sim.predict(),
						pt = this.view.world.project(q.x, q.y, 0);
					if (pt) {
						const [qx, qy] = pt;
						px.line(g, qx - 7, qy, qx, qy - 7, "#f5c26e");
						px.line(g, qx, qy - 7, qx + 7, qy, "#f5c26e");
						px.line(g, qx + 7, qy, qx, qy + 7, "#f5c26e");
						px.line(g, qx, qy + 7, qx - 7, qy, "#f5c26e");
					}
				}
				return;
			}
			const narrow = w < 480,
				margin = narrow ? 10 : 16;
			panel(
				g,
				x + margin,
				y + 12,
				Math.min(w - 70, 360),
				split ? 29 : 33,
				0.83,
			);
			text(g, sim.objective(), x + margin + 8, y + 19, C.cream, 1);
			text(
				g,
				`OP. TIDEMARK   ${Math.floor(sim.time / 60)
					.toString()
					.padStart(2, "0")}:${Math.floor(sim.time % 60)
					.toString()
					.padStart(
						2,
						"0",
					)}   ${sim.aircraft.hold ? (sim.aircraft.nav ? "NAV HOLD" : "COURSE HOLD") : "MANUAL"}`,
				x + margin + 8,
				y + 31,
				"#aac2ae",
			);
			const topRight = `${Math.ceil(a.fuel)}% FUEL  ${Math.ceil(a.hull)}% HULL`;
			if (!narrow) {
				panel(g, x + w - 180, y + 12, 165, 30);
				text(
					g,
					topRight,
					x + w - 172,
					y + 20,
					a.fuel < 24 || a.hull < 35 ? "#f2aa75" : C.cream,
				);
			}
			if (!narrow)
				text(
					g,
					(context.name || "CREW").slice(0, 22) + " / " + station.short,
					x + w - 172,
					y + 48,
					"#d1cda3",
				);
			if (sim.cheated)
				text(
					g,
					sim.attract
						? "DEMO • ANY INPUT TO RETURN"
						: "PRACTICE / DEV • UNRANKED",
					x + w / 2,
					y + 54,
					"#edc775",
					1,
					"center",
				);
			if (context.exterior || sim.phase === "recovery") {
				this.drawExterior(g, vp, sim);
				return;
			}
			if (context.map) {
				this.map(g, vp, sim, context.mapIndex || 0, false, context.mapPoint);
				return;
			}
			if (p.station === "pilot") this.pilot(g, vp, sim, p, input);
			else if (p.station === "bombs") this.sight(g, vp, sim, p, input);
			else this.gun(g, vp, sim, p, input);
			if (!split || h > 220) this.radio(g, vp, sim);
			if (context.wheel) this.wheel(g, vp, p, context.wheelIndex || 0, sim);
			if (a.jettisonHold > 0 && a.bombs > 0) {
				panel(g, x + w / 2 - 100, y + h - 82, 200, 24, 0.96);
				text(
					g,
					"JETTISON · KEEP HOLDING",
					x + w / 2,
					y + h - 77,
					"#f1be7c",
					1,
					"center",
				);
				E.ui.bar(
					g,
					x + w / 2 - 90,
					y + h - 65,
					180,
					3,
					a.jettisonHold / 1.6,
					"#df9b65",
				);
			}
			if (p.transition > 0) {
				panel(g, x + w / 2 - 88, y + h / 2 - 8, 176, 22);
				text(
					g,
					"MOVING TO " + (p.pending || "").toUpperCase(),
					x + w / 2,
					y + h / 2,
					C.cream,
					1,
					"center",
				);
			}
			if (this.game.paused && !this.game.shell?.screen)
				text(g, "PAUSED", x + w / 2, y + h / 2, C.cream, 2, "center");
		});
	}
	pilot(g, vp, sim, p, input) {
		const { x, y, w, h } = vp,
			a = sim.aircraft,
			compact = h < 230;
		const centerY = y + h * 0.47,
			cx = x + w / 2;
		px.line(g, cx - 15, centerY, cx - 4, centerY, "#d8d7a3");
		px.line(g, cx + 4, centerY, cx + 15, centerY, "#d8d7a3");
		px.line(g, cx, centerY - 3, cx, centerY + 3, "#d8d7a3");
		const gy = y + h - (compact ? 38 : 54),
			gw = Math.min(95, w / 5.3);
		for (const [i, label, value, unit, fill] of [
			[
				0,
				"AIRSPEED",
				Math.round((a.speed / U) * 1.944),
				"KTS",
				a.speed / (100 * U),
			],
			[1, "ALTITUDE", Math.round(a.z / U), "M", a.z / (1400 * U)],
			[2, "POWER", Math.round(a.throttle * 100), "%", a.throttle],
			[3, "FUEL", Math.round(a.fuel), "%", a.fuel / 100],
		]) {
			const bx = cx + (i - 2) * (gw + 6) + 3;
			panel(g, bx, gy, gw, compact ? 28 : 40, 0.94);
			text(g, label, bx + 5, gy + 4, "#aabea4");
			text(g, value + " " + unit, bx + 5, gy + 15, C.cream, compact ? 1 : 2);
			E.ui.bar(
				g,
				bx + 5,
				gy + (compact ? 26 : 36),
				gw - 10,
				2,
				clamp(fill, 0, 1),
				label === "AIRSPEED" && a.stall ? "#e88756" : "#d1b879",
			);
		}
		if (a.stall)
			text(
				g,
				"STALL • LOWER NOSE / ADD POWER",
				cx,
				centerY + 25,
				"#ffb181",
				1,
				"center",
			);
		const heading = Math.round(((a.heading * 180) / Math.PI + 450) % 360)
			.toString()
			.padStart(3, "0");
		text(g, heading + "°", cx, y + 68, "#e4d6a4", 2, "center");
		for (let i = -3; i <= 3; i++) {
			px.line(g, cx + i * 22, y + 61, cx + i * 22, y + 64, "#b7bea1");
		}
		const prompt = `${input.label("left")}/${input.label("right")} bank  ${input.label("throttleUp")} power  ${input.label("hold")} hold  ${input.label("map")} map`;
		text(g, prompt, cx, y + h - 10, "#c3c7a3", 1, "center");
		if (sim.phase === "launch" && !a.airborne) {
			panel(g, cx - 125, centerY + 30, 250, 25);
			text(
				g,
				`POWER ABOVE 65% TO TAKE OFF   ${input.label("throttleUp")}`,
				cx,
				centerY + 39,
				"#f0ce88",
				1,
				"center",
			);
		}
		this.threats(g, vp, sim);
	}
	gun(g, vp, sim, p, input) {
		const { x, y, w, h } = vp,
			a = sim.aircraft,
			cx = x + w / 2,
			cy = y + h / 2,
			gun = sim.guns[p.station];
		const white = gun.jammed ? "#df9b74" : "#f0e2b4";
		for (let i = 0; i < 24; i++) {
			const v = (i * Math.PI) / 12,
				v2 = v + 0.17;
			px.line(
				g,
				cx + Math.cos(v) * 18,
				cy + Math.sin(v) * 18,
				cx + Math.cos(v2) * 18,
				cy + Math.sin(v2) * 18,
				white,
			);
		}
		px.line(g, cx - 28, cy, cx - 10, cy, white);
		px.line(g, cx + 10, cy, cx + 28, cy, white);
		px.line(g, cx, cy - 28, cx, cy - 10, white);
		px.line(g, cx, cy + 10, cx, cy + 28, white);
		px.dot(g, cx, cy, "#f8ddb0");
		text(
			g,
			STATIONS.find((s) => s.id === p.station).short,
			x + 16,
			y + h - 43,
			"#e2c789",
		);
		text(
			g,
			gun.jammed ? "JAMMED" : String(gun.ammo).padStart(3, "0") + " ROUNDS",
			x + 16,
			y + h - 29,
			white,
			2,
		);
		for (const e of sim.enemies) {
			if (!e.alive || e.age < 0) continue;
			const lead = Math.hypot(e.x - a.x, e.y - a.y, e.z - a.z) / (860 * U),
				pt = this.view.world.project(
					e.x + e.vx * lead,
					e.y + e.vy * lead,
					e.z + e.vz * lead,
				);
			if (
				!pt ||
				pt[0] < x ||
				pt[0] > x + w ||
				pt[1] < y + 60 ||
				pt[1] > y + h - 48
			)
				continue;
			const qx = pt[0],
				qy = pt[1];
			px.line(g, qx - 4, qy, qx, qy - 4, "#d4bc85");
			px.line(g, qx, qy - 4, qx + 4, qy, "#d4bc85");
			px.line(g, qx + 4, qy, qx, qy + 4, "#d4bc85");
			px.line(g, qx, qy + 4, qx - 4, qy, "#d4bc85");
			text(
				g,
				`${Math.round(Math.hypot(e.x - a.x, e.y - a.y) / U)}m`,
				qx,
				qy + 9,
				"#cfdbbf",
				1,
				"center",
			);
		}
		text(
			g,
			`${input.label("fire")} burst   ${input.label("fine")} fine aim   ${input.lastDevice === "gamepad" ? "D-pad bearings" : "4/5/6/7 bearings"}`,
			cx,
			y + h - 10,
			"#bdcbb3",
			1,
			"center",
		);
		this.threats(g, vp, sim);
	}
	sight(g, vp, sim, p, input) {
		const { x, y, w, h } = vp,
			a = sim.aircraft,
			cx = x + w / 2,
			cy = y + h / 2;
		px.line(g, cx - 45, cy, cx + 45, cy, "#e9ddad");
		px.line(g, cx, cy - 45, cx, cy + 45, "#e9ddad");
		for (let i = -4; i <= 4; i++) {
			px.line(g, cx + i * 10, cy - 3, cx + i * 10, cy + 3, "#d5d1a1");
			px.line(g, cx - 3, cy + i * 10, cx + 3, cy + i * 10, "#d5d1a1");
		}
		const pred = sim.predict(),
			pt = this.view.world.project(pred.x, pred.y, 0);
		if (pt && a.sight > 0.4) {
			const [qx, qy] = pt;
			px.line(g, qx - 8, qy, qx, qy - 8, "#f1cc76");
			px.line(g, qx, qy - 8, qx + 8, qy, "#f1cc76");
			px.line(g, qx + 8, qy, qx, qy + 8, "#f1cc76");
			px.line(g, qx, qy + 8, qx - 8, qy, "#f1cc76");
			text(
				g,
				`${pred.age.toFixed(1)}s FALL`,
				qx,
				qy + 13,
				"#f3d48b",
				1,
				"center",
			);
		}
		for (const t of sim.targets)
			for (const part of t.parts) {
				if (part.dead) continue;
				const pt = this.view.world.project(part.x, part.y, part.z + 10 * U);
				if (
					!pt ||
					pt[0] < x + 20 ||
					pt[0] > x + w - 20 ||
					pt[1] < y + 60 ||
					pt[1] > y + h - 65
				)
					continue;
				text(
					g,
					part.id.toUpperCase(),
					pt[0],
					pt[1] - 13,
					"#ecdbad",
					1,
					"center",
				);
			}
		const ready = a.doors > 0.9;
		panel(g, x + 16, y + h - 53, Math.min(270, w - 32), 38, 0.94);
		text(
			g,
			`${a.bombs} BOMBS   SALVO ${Math.min(a.salvo, a.bombs)}   ${ready ? "DOORS OPEN" : a.doorsOpen ? "DOORS OPENING…" : "DOORS CLOSED"}`,
			x + 24,
			y + h - 45,
			ready ? "#c4d9a5" : "#e8c48a",
		);
		text(
			g,
			`${input.label("doors")} doors  ${input.label("salvo")} salvo  ${input.label("fire")} RELEASE`,
			x + 24,
			y + h - 30,
			C.cream,
		);
		text(
			g,
			`WIND ↘ 2.6 m/s   ${a.sight < 0.5 ? "COARSE SIGHT ONLY" : "DIAMOND = PREDICTED IMPACT"}`,
			cx,
			y + h - 10,
			"#d4d4ad",
			1,
			"center",
		);
	}
	radio(g, vp, sim) {
		if (sim.radio.until < sim.time || !this.game.settings.subtitles) return;
		const { x, y, w, h } = vp,
			radio = sim.radio,
			split = h < 250,
			k = this.game.settings.subtitleSize || 1;
		const width = Math.min(w - 32, 400),
			px0 = x + (w - width) / 2,
			py = y + (split ? 64 : 89);
		panel(g, px0, py, width, split ? 34 : 43, 0.85);
		const idx = Math.max(
			0,
			CREW.findIndex((c) => c.role === radio.role),
		);
		this.view.rigs[idx].drawPortrait(g, px0 + 4, py + 3, split ? 28 : 36, {
			zoom: 3,
			turn: 0.3,
			weapon: false,
			bg: "#35534a",
			frame: false,
		});
		text(
			g,
			`${radio.role} / ${CREW[idx].name.toUpperCase()}`,
			px0 + 46,
			py + 5,
			"#dabb79",
		);
		const lines = E.font.wrap(radio.text, width - 58, { scale: k });
		for (let i = 0; i < Math.min(split ? 2 : 2, lines.length); i++)
			text(
				g,
				lines[i],
				px0 + 46,
				py + 17 + i * 10 * k,
				radio.priority > 1 ? "#f5d99c" : "#d8dfbf",
				k,
			);
	}
	threats(g, vp, sim) {
		const { x, y, w, h } = vp;
		const a = sim.aircraft;
		for (const e of sim.enemies)
			if (e.alive && e.age >= 0) {
				const angle = wrap(Math.atan2(e.y - a.y, e.x - a.x) - a.heading),
					tx = x + w / 2 + Math.sin(angle) * Math.min(w * 0.38, 170),
					ty = y + h * 0.5 - Math.cos(angle) * Math.min(h * 0.29, 75);
				px.poly(
					g,
					[
						[tx, ty - 4],
						[tx - 4, ty + 3],
						[tx + 4, ty + 3],
					],
					"#e8a46d",
				);
				text(g, [12, 3, 6, 9][e.bearing] + "", tx + 7, ty - 3, "#e8bd83");
			}
		if (a.fire >= 0) {
			panel(g, x + w / 2 - 112, y + h - 85, 224, 24);
			text(
				g,
				`ENGINE ${a.fire + 1} FIRE • F EXTINGUISH`,
				x + w / 2,
				y + h - 77,
				"#ffb07a",
				1,
				"center",
			);
		}
	}
	drawExterior(g, vp, sim) {
		const { x, y, w, h } = vp;
		text(
			g,
			sim.phase === "recovery"
				? "LARKSPUR FIELD • WELCOME HOME"
				: "FOUR ENGINES. ONE CREW.",
			x + w / 2,
			y + h - 54,
			C.cream,
			2,
			"center",
		);
		text(
			g,
			sim.phase === "recovery"
				? "Assisted recovery in progress"
				: "Enter / ✕  skip exterior",
			x + w / 2,
			y + h - 31,
			"#c9cfac",
			1,
			"center",
		);
		this.radio(g, vp, sim);
	}
	wheel(g, vp, p, index, sim) {
		const { x, y, w, h } = vp,
			cx = x + w / 2,
			cy = y + h / 2;
		panel(g, cx - 120, cy - 85, 240, 170, 0.97);
		text(g, "CREW STATIONS", cx, cy - 74, "#e9ca89", 1, "center");
		for (let i = 0; i < 6; i++) {
			const a = (i * Math.PI) / 3 - Math.PI / 2,
				s = STATIONS[i],
				tx = cx + Math.cos(a) * 74,
				ty = cy + Math.sin(a) * 50;
			const busy = sim.owners[s.id] != null && sim.owners[s.id] !== p.id;
			text(
				g,
				(i === index ? "▸ " : "") + s.name,
				tx,
				ty,
				busy ? "#8da08d" : i === index ? "#ffda8e" : C.cream,
				1,
				"center",
			);
		}
		text(
			g,
			"Choose · release Tab / △ to move",
			cx,
			cy + 70,
			"#b3c6a7",
			1,
			"center",
		);
	}
	map(g, vp, sim, index = 0, brief = false, pending = null) {
		const { x, y, w, h } = vp,
			portrait = w < h,
			mapW = brief ? (portrait ? w - 32 : w * 0.52) : Math.min(w - 32, 450),
			mapH = brief ? (portrait ? h * 0.32 : h * 0.56) : Math.min(h - 95, 230),
			mx = x + 16,
			my = brief ? y + 48 : y + 62;
		panel(g, mx, my, mapW, mapH, 0.96);
		const scale = Math.min(
				(mapW - 34) / (28000 * U),
				(mapH - 24) / (20000 * U),
			),
			ox = mx + 10,
			oy = my + 8;
		const point = (xx, yy) => [
			clamp(ox + xx * scale, mx + 1, mx + mapW - 1),
			clamp(oy + (yy - 2000 * U) * scale, my + 1, my + mapH - 1),
		];
		for (let i = 0; i < 6; i++) {
			const gx = mx + (i * mapW) / 5;
			px.line(g, gx, my, gx, my + mapH, "#305354");
			const gy = my + (i * mapH) / 5;
			px.line(g, mx, gy, mx + mapW, gy, "#305354");
		}
		const west = [
			[0, 0],
			[0, 24000 * U],
			[6000 * U, 24000 * U],
			[5400 * U, 17000 * U],
			[6100 * U, 12000 * U],
			[4900 * U, 8000 * U],
			[5500 * U, 0],
		].map((p) => point(...p));
		const east = [
			[28000 * U, 0],
			[28000 * U, 24000 * U],
			[15500 * U, 24000 * U],
			[15000 * U, 18000 * U],
			[15800 * U, 14000 * U],
			[15100 * U, 10000 * U],
			[15800 * U, 5000 * U],
			[15000 * U, 0],
		].map((p) => point(...p));
		px.poly(g, west, "#657959");
		px.poly(g, east, "#768162");
		px.poly(
			g,
			[
				[15000, 11150],
				[23520, 11600],
				[23520, 12400],
				[15000, 12850],
			].map(([xx, yy]) => point(xx * U, yy * U)),
			"#173a3c",
		);
		const route = brief
			? OPERATION.routes[
					sim.routeName in OPERATION.routes ? sim.routeName : "direct"
				].points
			: sim.route.map((q) => [q.x, q.y]);
		let prev = brief
			? point(HOME.x, HOME.y)
			: point(sim.aircraft.x, sim.aircraft.y);
		for (const q of route) {
			const p = point(...q);
			px.line(g, ...prev, ...p, "#d6bd7c", 1);
			prev = p;
		}
		const choices = [HOME, ...sim.targets];
		choices.forEach((t, i) => {
			const q = point(t.x, t.y),
				selected = i === index;
			px.disc(
				g,
				...q,
				selected ? 5 : 3,
				selected
					? "#f1cc80"
					: t.parts?.every((p) => p.dead)
						? "#96bc9c"
						: "#dfddad",
			);
			const right = q[0] > mx + mapW * 0.7;
			text(
				g,
				t.id === "home"
					? "LARKSPUR"
					: t.id === "harbor"
						? "KESTREL"
						: t.id === "battery"
							? "NEEDLE POINT"
							: "CINDER",
				q[0] + (right ? -7 : 7),
				q[1] + (t.id === "battery" ? 10 : -11),
				selected ? "#ffe2a2" : "#d3d8b2",
				1,
				right ? "right" : "left",
			);
		});
		if (pending) {
			const p = point(...pending);
			px.line(g, p[0] - 6, p[1], p[0] + 6, p[1], "#fff0bc");
			px.line(g, p[0], p[1] - 6, p[0], p[1] + 6, "#fff0bc");
		}
		const ap = point(sim.aircraft.x, sim.aircraft.y),
			angle = sim.aircraft.heading;
		px.poly(
			g,
			[
				[ap[0] + Math.cos(angle) * 7, ap[1] + Math.sin(angle) * 7],
				[ap[0] + Math.cos(angle + 2.5) * 5, ap[1] + Math.sin(angle + 2.5) * 5],
				[ap[0] + Math.cos(angle - 2.5) * 5, ap[1] + Math.sin(angle - 2.5) * 5],
			],
			"#fff0c7",
		);
		text(g, "CHANNEL / SECTOR 17", mx + 9, my + mapH - 14, "#ced3ac");
		if (!brief) {
			const selected = choices[index];
			panel(g, mx, my + mapH + 6, mapW, 34);
			text(
				g,
				pending
					? "CUSTOM WAYPOINT · CONFIRM TO APPLY"
					: selected.name.toUpperCase(),
				mx + 8,
				my + mapH + 12,
				C.cream,
			);
			const reserve = sim.reserve(selected.id);
			text(
				g,
				`RETURN ESTIMATE ${Math.floor(reserve)}%   ↑↓ select · Enter / ✕ commit · M close`,
				mx + 8,
				my + mapH + 25,
				reserve < 15 ? "#ecaa77" : "#bfcfae",
			);
		} else if (!portrait) {
			const selected = choices[index];
			panel(g, mx, my + mapH + 8, mapW, 65, 0.94);
			text(
				g,
				"TARGET PREVIEW / " + selected.name.toUpperCase(),
				mx + 8,
				my + mapH + 15,
				"#e6ca8b",
			);
			const description =
				selected.description ||
				"Home airfield. Reach the approach ring for assisted recovery, repair and rearm.";
			const lines = E.font.wrap(description, mapW - 18, { scale: 1 });
			lines
				.slice(0, 3)
				.forEach((line, i) =>
					text(g, line, mx + 8, my + mapH + 30 + i * 10, "#cbd5b5"),
				);
		}
	}
}
