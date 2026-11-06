import { SECTORS, BOSS_PHASES } from "./data/content.js";
import {
	registerArt,
	drawSaucer,
	drawEnemy,
	drawBoss,
	drawBackdrop,
} from "./art.js";
const E = globalThis.My3D2dge,
	P = E.px,
	TAU = Math.PI * 2;
const colors = ["#67f1c4", "#ffcf7b"];
export function fitArena(game) {
	const W = game.W,
		H = game.H,
		portrait = H > W,
		top = portrait ? 105 : 54,
		bottom = portrait ? Math.max(130, H * 0.2) : 30;
	const k = Math.min((W - 42) / 960, (H - top - bottom) / 540),
		y = top + (H - top - bottom - 540 * k) / 2;
	game.setView(new E.View("overhead", "Overhead", 0, 90, k));
	game.cam.smooth = 0;
	game.cam.offset = [0, y + 270 * k - H / 2];
	game.focus(480, 270, 0);
	game.cam.snap = true;
	return { k, x: (W - 960 * k) / 2, y, w: 960 * k, h: 540 * k, top, bottom };
}
export function createPresentation(game) {
	registerArt(E);
	let fx = [],
		last = 0;
	let radio = { text: "", left: 0 };
	const anim = { card: 0 };
	const event = (e) => {
		if (e.id && e.id <= last) return;
		if (e.id) last = e.id;
		const subtitles = {
			sector: SECTORS[e.sector]?.subtitle,
			bossPhase: [
				"OPEN EMITTERS. SHOOT OR RAM.",
				"THEY SENT HUNTERS. HOW RUDE.",
				"ONE MORE PHASE. REMAIN CONFIDENT.",
			][e.phase],
			rescue: "BACK IN BUSINESS. TRY TO LOOK BUSY.",
			victory: "EARTH SAYS THANKS. WE KNEW YOU HAD IT. MOSTLY.",
			defeat: "SAUCER DOWN. CONFIDENCE IS RENEWABLE.",
		};
		if (subtitles[e.type])
			radio = { text: `RADIO / ${subtitles[e.type]}`, left: 3.3 };
		if (
			[
				"kill",
				"fusion",
				"rescue",
				"hurt",
				"shield",
				"bossHit",
				"bossDown",
				"ready",
			].includes(e.type)
		)
			fx.push({
				...e,
				age: 0,
				life:
					e.type === "bossDown"
						? 2.8
						: e.type === "fusion"
							? 1.1
							: e.type === "ready"
								? 0.7
								: 0.65,
			});
		if (e.type === "hurt" || e.type === "bossDown") {
			if (!game.settings.motion)
				game.shake((e.type === "bossDown" ? 1.6 : 1) * game.settings.shake);
			if (game.settings.flashes > 0)
				game.flash("#eab598", 0.1, 0.1 * game.settings.flashes);
		}
		if (["wave", "sector", "bossPhase"].includes(e.type)) {
			anim.card = 0;
			game.tween(anim, { card: 1 }, 0.85, { ease: "outCubic" });
		}
	};
	function update(dt) {
		radio.left = Math.max(0, radio.left - dt);
		fx.forEach((f) => {
			f.age += dt;
		});
		fx = fx.filter((f) => f.age < f.life);
	}
	function ring(g, x, y, p, k, t, balance, settings) {
		const ready = p.shield <= 0,
			R = 30 * k,
			fill = ready ? 1 : Math.max(0, 1 - p.shield / balance.recharge),
			c = colors[p.index % 2];
		if (!p.down) {
			for (let i = 0; i < 24; i++) {
				const a = (i / 24) * TAU,
					xx = x + Math.cos(a) * R,
					yy = y + Math.sin(a) * R;
				P.disc(g, xx, yy, Math.max(1.4, k * 3.7), "#04121e");
				const lit = i < Math.floor(fill * 24);
				P.disc(
					g,
					xx,
					yy,
					Math.max(1, k * (ready ? 2.4 : 1.25)),
					ready ? c : lit ? "#748d9f" : "#223647",
				);
				if (ready && i % 4 === 0) P.dot(g, xx - 1, yy - 1, "#ecfff2");
			}
			if (!ready) {
				P.line(g, x - R * 0.4, y + R + 5, x + R * 0.4, y + R + 5, "#edaf6d", 2);
			}
			const bx = x + Math.cos(p.bearing) * R,
				by = y + Math.sin(p.bearing) * R;
			P.disc(g, bx, by, Math.max(3, k * 5), "#07131d");
			P.disc(g, bx, by, Math.max(2, k * 3.3), "#ffffff");
			P.dot(g, bx - 1, by - 1, "#d0fffc");
			const d = Math.atan2(
				Math.sin(p.requested - p.bearing),
				Math.cos(p.requested - p.bearing),
			);
			if (Math.abs(d) > 0.065) {
				const tx = x + Math.cos(p.requested) * (R + 5),
					ty = y + Math.sin(p.requested) * (R + 5);
				P.line(g, tx - 2, ty, tx + 2, ty, c);
				P.line(g, tx, ty - 2, tx, ty + 2, c);
			}
			if (p.invuln > 0) {
				const a =
					settings.motion || settings.flashes === 0
						? 1
						: 0.55 + 0.3 * Math.sin(t * 17);
				P.blend(g, a, "normal", () => {
					for (let i = 0; i < 8; i++) {
						const a = (i * TAU) / 8;
						P.rect(
							g,
							x + Math.cos(a) * (R + 4) - 1,
							y + Math.sin(a) * (R + 4) - 1,
							2,
							2,
							"#ffffff",
						);
					}
				});
			}
		}
	}
	function drawWorld(
		r,
		s,
		{
			demo = false,
			overlay = false,
			collisions = false,
			aimOverlay = false,
		} = {},
	) {
		const t = s.t || 0,
			k = r.view.scale || 1,
			comfort = game.settings;
		drawBackdrop(r, s.sector, comfort.motion ? 0 : t);
		const point = (x, y) => r.w(x, y, 0),
			[x0, y0] = point(0, 0),
			[x1, y1] = point(960, 540),
			accent = SECTORS[s.sector]?.color || "#67f1c4";
		r.decal((g) => {
			// Segmented rail and warning space. The fixed rectangle is identical on all devices.
			P.rect(g, x0 - 4, y0 - 4, x1 - x0 + 8, 2, "#263c4f");
			P.rect(g, x0 - 4, y1 + 3, x1 - x0 + 8, 2, "#263c4f");
			P.rect(g, x0 - 4, y0, 2, y1 - y0, "#263c4f");
			P.rect(g, x1 + 3, y0, 2, y1 - y0, "#263c4f");
			for (let x = 0; x <= 960; x += 64) {
				const [sx] = point(x, 0);
				P.rect(
					g,
					sx,
					y0 - 4,
					Math.max(2, k * 12),
					2,
					x % 192 === 0 ? accent : "#3f5665",
				);
				P.rect(
					g,
					sx,
					y1 + 3,
					Math.max(2, k * 12),
					2,
					x % 192 === 0 ? accent : "#3f5665",
				);
			}
			for (let y = 0; y <= 540; y += 60) {
				const [, sy] = point(0, y);
				P.rect(g, x0 - 4, sy, 2, Math.max(2, k * 8), accent);
				P.rect(g, x1 + 3, sy, 2, Math.max(2, k * 8), accent);
			}
			// Sparse navigational grid lives below the combat layer.
			for (let x = 80; x < 960; x += 80)
				for (let y = 60; y < 540; y += 60) {
					const [sx, sy] = point(x, y);
					P.dot(g, sx, sy, "#1d3040");
				}
			for (const gate of s.gates || []) {
				const [gx, gy] = point(gate.x, gate.y);
				P.line(g, gx - 7, gy, gx, gy + (gate.y === 0 ? 8 : -8), accent, 2);
				P.line(g, gx + 7, gy, gx, gy + (gate.y === 0 ? 8 : -8), accent, 2);
			}
			for (const e of s.enemies) {
				if (e.merging && e.partner > e.id) {
					const p = s.enemies.find((o) => o.id === e.partner);
					if (p) {
						const [a, b] = point(e.x, e.y),
							[c, d] = point(p.x, p.y);
						P.line(g, a, b, c, d, "#f0a7ff", 2);
					}
				}
				if (e.warning > 0) {
					const [a, b] = point(e.x, e.y),
						angle = Math.atan2(e.lockY - e.y, e.lockX - e.x);
					for (const offset of [-0.13, 0, 0.13]) {
						const [c, d] = point(
							e.x + Math.cos(angle + offset) * 620,
							e.y + Math.sin(angle + offset) * 620,
						);
						dashed(g, a, b, c, d, "#ba8865", 5);
					}
					P.disc(g, a, b, 3, "#ffca82");
				}
			}
			const boss = s.boss;
			if (
				boss &&
				!boss.dead &&
				boss.transition <= 0 &&
				boss.cycle <
					Math.min(
						s.balance?.gunWarning || 1.7,
						(s.balance?.bossInterval || 7.4) * 0.35,
					)
			) {
				const [a, b] = point(boss.x, boss.y + 45),
					angle = Math.atan2(boss.lockY - (boss.y + 45), boss.lockX - boss.x),
					n = BOSS_PHASES[boss.phase].missiles;
				for (let i = 0; i < n; i++) {
					const offset = (i - (n - 1) / 2) * 0.19,
						[c, d] = point(
							boss.x + Math.cos(angle + offset) * 800,
							boss.y + 45 + Math.sin(angle + offset) * 800,
						);
					dashed(g, a, b, c, d, "#a06063", 6);
				}
				if (boss.phase === 2)
					for (const x of [40, 920]) {
						const [c, d] = point(x, 40),
							[a, b] = point(boss.lockX, boss.lockY);
						dashed(g, c, d, a, b, "#a06063", 6);
					}
			}
		});
		for (const e of s.enemies) {
			const [_x, _y] = point(e.x, e.y);
			r.actor(
				e.x,
				e.y,
				0,
				(g, ox, oy) => drawEnemy(g, ox, oy, e, k, t, comfort),
				{ outline: false, emissive: e.arm > 0 },
			);
			if (e.arm > 0 && !e.entry)
				r.textAt(e.x, e.y - 30, 0, "!", "#ffc694", { scale: 1 });
		}
		if (s.boss) {
			const b = s.boss;
			r.actor(b.x, b.y, 0, (g, x, y) => drawBoss(g, x, y, b, k, t, comfort), {
				outline: false,
			});
		}
		for (const p of s.players.filter((p) => p.active)) {
			r.actor(
				p.x,
				p.y,
				0,
				(g, x, y) => {
					drawSaucer(g, x, y, p, k, t, comfort);
					ring(g, x, y, p, k, t, s.balance || { recharge: 1.6 }, comfort);
					if (p.down && p.wreck > 0.65) {
						P.line(g, x - 4, y - 4, x + 4, y + 4, "#f7c175", 2);
						P.line(g, x + 4, y - 4, x - 4, y + 4, "#f7c175", 2);
					}
				},
				{ outline: false },
			);
			if (p.down && s.players.some((q) => q.active && !q.down && q.shield <= 0))
				r.textAt(p.x, p.y - 50, 0, "READY RING TO RESCUE", "#ffdc91", {
					align: "center",
				});
		}
		for (const b of s.shots) {
			r.queue(
				b.x,
				b.y,
				0,
				(g) => {
					const [x, y] = point(b.x, b.y),
						c = b.foe ? "#ff9b8a" : "#91fff2",
						dx = b.vx / Math.hypot(b.vx, b.vy),
						dy = b.vy / Math.hypot(b.vx, b.vy);
					P.line(g, x - dx * 7, y - dy * 7, x, y, c, b.foe ? 3 : 2);
					P.rect(g, x - 1, y - 1, 2, 2, "#fff7df");
				},
				{ emissive: true },
			);
		}
		r.overlay((g) => {
			for (const f of fx) {
				const [x, y] = point(f.x || 0, f.y || 0),
					u = f.age / f.life,
					rad =
						E.ease.outCubic(u) *
						(f.type === "bossDown" ? 140 : f.type === "fusion" ? 46 : 65) *
						k;
				const c =
					f.type === "hurt"
						? "#ff917e"
						: f.type === "rescue" || f.type === "ready"
							? "#92ffcc"
							: f.type === "fusion"
								? "#daabff"
								: "#ffc78a";
				const n = f.type === "bossDown" ? 32 : 12;
				for (let i = 0; i < n; i++) {
					const a = (i * TAU) / n + (f.id || 0) * 0.73,
						v = 0.65 + (i % 4) * 0.12,
						xx = x + Math.cos(a) * rad * v,
						yy = y + Math.sin(a) * rad * v;
					P.line(
						g,
						xx,
						yy,
						xx + Math.cos(a) * (1 - u) * 9,
						yy + Math.sin(a) * (1 - u) * 9,
						u < 0.3 ? "#fff2ca" : c,
						Math.max(1, (1 - u) * 3),
					);
				}
				if (u < 0.3 && f.type === "kill")
					P.disc(g, x, y, Math.max(1, (1 - u / 0.3) * 12 * k), "#fff1ca");
			}
			// The shield instrument and real firing bead stay above the busiest cascade.
			if (fx.length)
				for (const p of s.players.filter((p) => p.active && !p.down)) {
					const [x, y] = point(p.x, p.y);
					ring(g, x, y, p, k, t, s.balance || { recharge: 1.6 }, comfort);
				}
			for (const c of s.chains)
				if (c.count >= 3 && c.expires - s.t > 0) {
					const [x, y] = point(c.x, c.y);
					E.font.text(
						g,
						`CHAIN ${c.count} / x${Math.min(8, c.depth + 1)}`,
						x,
						y - 25,
						"#ffe4a0",
						{ align: "center", outline: true, scale: 1 },
					);
				}
			if (collisions) {
				for (const a of [
					...s.players,
					...s.enemies,
					...(s.boss?.components || []),
				]) {
					const [x, y] = point(a.x, a.y);
					circle(g, x, y, (a.r || 19) * k, "#b7f7ff", 16);
				}
			}
			if (aimOverlay) {
				for (const p of s.players) {
					const [x, y] = point(p.x, p.y),
						[a, b] = point(
							p.x + Math.cos(p.bearing) * 220,
							p.y + Math.sin(p.bearing) * 220,
						);
					dashed(g, x, y, a, b, "#56bebe", 5);
				}
			}
			hud(g, r, s, { demo, overlay });
		});
	}
	function hud(g, r, s, { demo, overlay }) {
		const W = r.W,
			H = r.H,
			_t = s.t,
			portrait = H > W,
			T = (str, x, y, c = "#d7e4e4", scale = 1, align = "left") =>
				E.font.text(g, str, x, y, c, {
					scale: portrait ? scale * 2 : scale,
					align,
					outline: false,
					shadow: "#040914",
				});
		P.rect(g, 0, 0, W, portrait ? 92 : 43, "#07111d");
		P.rect(g, 12, portrait ? 88 : 41, W - 24, 1, "#263c4a");
		T(
			demo
				? "FLIGHT RECORDER / DEMO"
				: s.debug
					? "FLIGHT LAB / UNRANKED"
					: s.mode === "score"
						? "SCORE ATTACK"
						: "EARTH DEFENCE / MISSION",
			16,
			10,
			"#8dabb7",
		);
		T(String(s.score).padStart(6, "0"), 16, 23, "#fff1cd", 2);
		const pilots = s.players.filter((p) => p.active);
		for (let i = 0; i < pilots.length; i++) {
			const p = pilots[i],
				x = portrait ? 16 + i * 186 : W - 260 + i * 126,
				y = portrait ? 55 : 10,
				name = s.session
					? p.name.slice(0, 10).toUpperCase()
					: `P${p.index + 1}`;
			T(
				`${name} ${p.down ? "WRECK" : p.shield <= 0 ? "READY" : "EXPOSED"}`,
				x,
				y,
				p.down ? "#ffb285" : p.shield <= 0 ? colors[p.index % 2] : "#e8b37a",
			);
			for (let h = 0; h < 3; h++)
				P.rect(
					g,
					x + h * 15,
					y + 14,
					11,
					4,
					h < p.hull ? colors[p.index % 2] : "#283540",
				);
		}
		const objective =
			s.mode === "score"
				? `WAVE ${s.wave}`
				: SECTORS[s.sector]?.short || "Mission";
		T(
			objective.toUpperCase(),
			W / 2,
			H - (portrait ? 25 : 17),
			"#8babb5",
			1,
			"center",
		);
		if (s.boss && !s.boss.dead) {
			const b = s.boss,
				bw = Math.min(240, W - 50),
				x = (W - bw) / 2,
				y = portrait ? 106 : 49,
				offset = portrait ? 19 : 11;
			T(
				`THE GRAND UNIDENTIFIED / ${b.phase + 1}`,
				W / 2,
				y,
				"#eeabb6",
				1,
				"center",
			);
			P.rect(g, x, y + offset, bw, 5, "#342936");
			P.rect(g, x, y + offset, bw * (b.hp / b.maxHp), 5, "#e8879f");
		}
		if (s.transition > 0) {
			const centerY =
					H / 2 - 24 - (game.settings.motion ? 0 : (1 - anim.card) * 12),
				title = SECTORS[s.sector]?.name || "";
			E.ui.box(
				g,
				W / 2 - Math.min(275, W / 2 - 12),
				centerY - 18,
				Math.min(550, W - 24),
				76,
				{ bg: "#091725", border: SECTORS[s.sector]?.color },
			);
			T(title, W / 2, centerY - 7, "#f3e6ca", W < 500 ? 1 : 2, "center");
			T(
				s.notice.toUpperCase().slice(0, 65),
				W / 2,
				centerY + 19,
				"#9dc5cb",
				1,
				"center",
			);
		} else if (
			s.noticeTime > 0 &&
			!s.boss &&
			game.settings.hints &&
			s.wave !== 0
		) {
			const scale = portrait ? 2 : 1,
				lines = E.font.wrap(s.notice, Math.min(W - 60, 520), { scale });
			const y = H - (portrait ? 64 : 40) - lines.length * 9 * scale;
			P.rect(g, 22, y - 5, W - 44, lines.length * 10 * scale + 8, "#091725");
			lines.forEach((l, i) => {
				T(l, W / 2, y + i * 10 * scale, "#e6d6b0", 1, "center");
			});
		}
		if (
			s.wave === 0 &&
			s.mode === "mission" &&
			!demo &&
			s.transition <= 0 &&
			game.settings.hints
		) {
			const q = s.tutorial,
				msg =
					q.distance < 35
						? "MOVE / The saucer goes where you steer."
						: q.shots === 0
							? "FIRE / Follow the white bead. Firing spends your ring."
							: q.readies === 0
								? "RELEASE FIRE / Wait for the whole ring."
								: q.rams === 0
									? "RAM / Full ring? Touch a satellite."
									: "THATS THE SPIRIT. CLEAR THE CHANNEL.";
			const scale = portrait ? 2 : 1,
				lines = E.font.wrap(msg, W - 48, { scale });
			const y = portrait ? Math.min(H - 115, r.w(0, 540, 0)[1] + 32) : H - 42;
			lines.forEach((line, i) => {
				T(line, W / 2, y + i * 10 * scale, "#ffe0a0", 1, "center");
			});
		}
		if (s.status === "extracting")
			T(
				"EARTH IS STILL HERE. TAKE THE CREDIT.",
				W / 2,
				H / 2,
				"#d3ffe6",
				W < 500 ? 1 : 2,
				"center",
			);
		if (overlay)
			T("SHARED WORLD CONTINUES", W / 2, H - 31, "#ffce8c", 1, "center");
		if (radio.left > 0) {
			const scale = portrait ? 2 : 1;
			const lines = E.font.wrap(radio.text, Math.min(W - 50, 510), { scale });
			const y = s.boss ? (portrait ? 150 : 75) : portrait ? 100 : 46;
			lines.forEach((line, i) => {
				T(line, W / 2, y + i * scale * 10, "#c3ded3", 1, "center");
			});
		}
	}
	return {
		event,
		update,
		drawWorld,
		reset() {
			fx = [];
			last = 0;
			radio = { text: "", left: 0 };
		},
		get effects() {
			return fx.length;
		},
		get subtitle() {
			return radio.left > 0 ? radio.text : "";
		},
		drawSaucer,
		drawEnemy,
		drawBackdrop,
		anim,
	};
}
function circle(g, x, y, r, c, n = 24) {
	for (let i = 0; i < n; i++) {
		const a = (i / n) * TAU,
			b = ((i + 1) / n) * TAU;
		P.line(
			g,
			x + Math.cos(a) * r,
			y + Math.sin(a) * r,
			x + Math.cos(b) * r,
			y + Math.sin(b) * r,
			c,
		);
	}
}
function dashed(g, x, y, a, b, c, step = 6) {
	const d = Math.hypot(a - x, b - y),
		n = Math.ceil(d / step);
	for (let i = 0; i < n; i += 2)
		P.line(
			g,
			x + ((a - x) * i) / n,
			y + ((b - y) * i) / n,
			x + ((a - x) * Math.min(i + 1, n)) / n,
			y + ((b - y) * Math.min(i + 1, n)) / n,
			c,
		);
}
export { circle, dashed };
