((G) => {
	"use strict";
	const SF = G.SF;
	SF.inputMap = (E) => ({
		...E.Input.DEFAULT,
		attack: ["Mouse0", "KeyJ", "Pad7"],
		dash: ["Space", "ShiftLeft", "Pad6"],
		skill: ["Mouse2", "KeyE", "Pad2"],
		jump: [],
		halves: {
			left: {
				attack: ["KeyF", "Mouse0"],
				dash: ["KeyG", "Space"],
				skill: ["KeyH", "KeyE"],
			},
			right: {
				attack: ["Period", "Numpad1"],
				dash: ["Slash", "Numpad2"],
				skill: ["Comma", "Numpad3"],
			},
		},
	});
	class Controls {
		constructor(app) {
			this.app = app;
			this.touch = new Map();
			this.seq = 0;
			this.touchPulse = false;
			this.touchBoost = false;
			const canvas = app.game.screen.canvas;
			if (!canvas) return;
			app.game.input.touchFilter = () => false;
			const activity = (e) => {
				if (
					e.type === "pointermove" &&
					e.pointerType === "mouse" &&
					e.movementX === 0 &&
					e.movementY === 0
				)
					return;
				if (e.pointerType && e.pointerType !== "mouse")
					app.game.input.lastDevice = "touch";
				app.activity();
			};
			for (const type of ["keydown", "pointerdown", "pointermove", "wheel"])
				addEventListener(type, activity, { passive: true });
			addEventListener("pointerdown", () => !app.ended && app.audio?.unlock(), {
				passive: true,
			});
			addEventListener("keydown", () => !app.ended && app.audio?.unlock(), {
				passive: true,
			});
			canvas.addEventListener("contextmenu", (e) => e.preventDefault());
			canvas.addEventListener("pointerdown", (e) => {
				if (
					e.pointerType === "mouse" ||
					app.overlay ||
					app.attract ||
					app.mode === "title"
				)
					return;
				e.preventDefault();
				canvas.setPointerCapture(e.pointerId);
				const a = {
					x: e.clientX,
					y: e.clientY,
					ox: e.clientX,
					oy: e.clientY,
					left: e.clientX < innerWidth * 0.5,
				};
				this.touch.set(e.pointerId, a);
				app.game.input.lastDevice = "touch";
			});
			canvas.addEventListener("pointermove", (e) => {
				const a = this.touch.get(e.pointerId);
				if (a) {
					a.x = e.clientX;
					a.y = e.clientY;
				}
			});
			const up = (e) => this.touch.delete(e.pointerId);
			canvas.addEventListener("pointerup", up);
			canvas.addEventListener("pointercancel", up);
			canvas.addEventListener("lostpointercapture", up);
			addEventListener("blur", () => this.clear());
			document.addEventListener("visibilitychange", () => {
				if (document.hidden) this.clear();
			});
		}
		clear() {
			this.touch.clear();
			this.touchPulse = false;
			this.touchBoost = false;
			this.app.game.players.forEach((i) => i.clear());
		}
		intent(id) {
			const app = this.app,
				w = app.world,
				s = w.s,
				p = s.players.find((p) => p.id === id);
			if (!p) return {};
			const i = app.hubInfo
				? app.game.input
				: app.game.players[p.seat] || app.game.input;
			if (app.overlay || app.ended)
				return {
					id,
					seq: ++this.seq,
					mx: 0,
					my: 0,
					ax: 0,
					ay: -1,
					fire: false,
					boost: false,
					pulse: false,
					...(app.upgradeChoices.has(id)
						? { choice: app.upgradeChoices.get(id) }
						: {}),
				};
			let [mx, my] = i.move(),
				ax = Math.cos(p.angle),
				ay = Math.sin(p.angle),
				fire = i.down("attack"),
				boost = i.pressed("dash"),
				pulse = i.pressed("skill");
			const device = i.lastDevice;
			if (i.padAim) {
				[ax, ay] = i.padAim;
			} else if (device === "mouse" && i.pointer() && !i.half) {
				const q = i.pointer();
				ax = q[0] - p.x;
				ay = q[1] - p.y;
			} else if (
				(i.half || device === "touch") &&
				app.game.settings.aimAssist
			) {
				const bot = w.bot(p);
				ax = bot.ax;
				ay = bot.ay;
			}
			if (device === "touch") {
				for (const a of this.touch.values())
					if (a.left) {
						mx = Math.max(-1, Math.min(1, (a.x - a.ox) / 55));
						my = Math.max(-1, Math.min(1, (a.y - a.oy) / 55));
					} else {
						const q = app.game.input.screenPoint(a.x, a.y);
						ax = q[0] - p.x;
						ay = q[1] - p.y;
						fire = true;
					}
				if (
					![...this.touch.values()].some((a) => !a.left) &&
					app.game.settings.aimAssist
				) {
					const bot = w.bot(p);
					ax = bot.ax;
					ay = bot.ay;
					fire = bot.fire;
				}
				pulse ||= this.touchPulse;
				boost ||= this.touchBoost;
				this.touchPulse = false;
				this.touchBoost = false;
			}
			if (
				app.game.settings.moveAssist &&
				s.act < 2 &&
				Math.hypot(mx, my) < 0.08
			) {
				mx = Math.max(-0.75, Math.min(0.75, -p.vx / 100));
				my = Math.max(-0.75, Math.min(0.75, -p.vy / 100));
			}
			const length = Math.hypot(ax, ay) || 1;
			return {
				id,
				seq: ++this.seq,
				mx,
				my,
				ax: ax / length,
				ay: ay / length,
				fire,
				boost,
				pulse,
				...(app.upgradeChoices.has(id)
					? { choice: app.upgradeChoices.get(id) }
					: {}),
			};
		}
		labels() {
			const i = this.app.game.input;
			return i.lastDevice === "touch"
				? "LEFT DRAG  move   RIGHT DRAG  aim + fire"
				: i.label("attack") +
						"  FIRE    " +
						i.label("dash") +
						"  BOOST    " +
						i.label("skill") +
						"  PULSE";
		}
	}
	SF.Controls = Controls;
})(globalThis);
