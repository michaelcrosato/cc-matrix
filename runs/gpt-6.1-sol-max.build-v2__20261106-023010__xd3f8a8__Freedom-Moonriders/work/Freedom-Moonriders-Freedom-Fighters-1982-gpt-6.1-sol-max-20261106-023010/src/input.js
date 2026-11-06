(function (root) {
	"use strict";
	const F = root.Moonriders;
	F.INPUT = {
		up: ["KeyW", "ArrowUp", "Pad12", "PadAxisUp"],
		down: ["KeyS", "ArrowDown", "Pad13", "PadAxisDown"],
		left: ["KeyA", "ArrowLeft", "Pad14", "PadAxisLeft"],
		right: ["KeyD", "ArrowRight", "Pad15", "PadAxisRight"],
		fire: ["Mouse0", "Space", "Pad7", "Pad0"],
		warp: ["ShiftLeft", "ShiftRight", "Pad6"],
		start: ["Enter", "Pad9"],
		pause: ["Escape", "KeyP", "Pad9"],
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Backspace", "Pad1"],
	};
	const blocksCrystal = (s, from, target) =>
		s.entities.some(
			(q) =>
				q.kind === "crystal" &&
				!q.dead &&
				F.segmentDistance(from, target, q) < q.r + 8 &&
				Math.hypot(q.x - from.x, q.y - from.y) <
					Math.hypot(target.x - from.x, target.y - from.y),
		);
	F.safeAim = (s, vector, cone = 0.16, auto = false) => {
		const p = s.ship;
		let best = null,
			score = Infinity;
		for (const q of s.entities) {
			if (
				["crystal", "mine"].includes(q.kind) ||
				q.dead ||
				q.warning > 0 ||
				(q.kind === "guard" && !q.open)
			)
				continue;
			const d = Math.hypot(q.x - p.x, q.y - p.y);
			if (d > 350 || blocksCrystal(s, p, q)) continue;
			const a = F.direction(q.x - p.x, q.y - p.y);
			const delta = Math.acos(
				F.clamp(a[0] * vector[0] + a[1] * vector[1], -1, 1),
			);
			if (!auto && delta > cone) continue;
			const z = auto ? d : delta * 200 + d * 0.1;
			if (z < score) {
				score = z;
				best = a;
			}
		}
		return { aim: best || vector, fire: !!best };
	};
	class Touch {
		constructor(app) {
			this.app = app;
			this.contacts = new Map();
			this.left = null;
			this.right = null;
			this.move = [0, 0];
			this.aim = [0, 0];
			this.warp = false;
			this.pulse = 0;
			this.active = false;
			if (app.game.headless) return;
			const cv = app.game.screen.canvas,
				signal = app.game._abort.signal;
			app.game.input.touchEnabled = false;
			app.game.input.touchFilter = () => false;
			const button = (this.button = document.createElement("button"));
			button.className = "burst-pop";
			button.textContent = "HYPERSPACE";
			button.hidden = true;
			button.setAttribute("aria-label", "Commit hyperspace");
			document.body.appendChild(button);
			button.addEventListener(
				"pointerdown",
				(e) => {
					if (e.pointerType === "mouse") return;
					e.preventDefault();
					e.stopPropagation();
					button.setPointerCapture(e.pointerId);
					this.warp = true;
					app.activity("touch");
				},
				{ signal },
			);
			for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
				button.addEventListener(
					name,
					() => {
						this.warp = false;
					},
					{ signal },
				);
			cv.addEventListener(
				"pointerdown",
				(e) => {
					if (
						e.pointerType === "mouse" ||
						app.ui.screen ||
						app.ended ||
						app.attract
					)
						return;
					e.preventDefault();
					cv.setPointerCapture(e.pointerId);
					this.active = true;
					app.game.input.lastDevice = "touch";
					app.activity("touch");
					const c = {
						id: e.pointerId,
						x: e.clientX,
						y: e.clientY,
						ox: e.clientX,
						oy: e.clientY,
						at: app.game.real,
						role:
							e.clientX < innerWidth * 0.54 && this.left === null
								? "left"
								: this.right === null
									? "right"
									: "extra",
					};
					this.contacts.set(e.pointerId, c);
					if (c.role === "left") this.left = e.pointerId;
					if (c.role === "right") this.right = e.pointerId;
				},
				{ passive: false, signal },
			);
			cv.addEventListener(
				"pointermove",
				(e) => {
					const c = this.contacts.get(e.pointerId);
					if (!c) return;
					e.preventDefault();
					c.x = e.clientX;
					c.y = e.clientY;
					if (c.role === "left")
						this.move = F.unit((c.x - c.ox) / 55, (c.y - c.oy) / 55, [0, 0]);
					else if (c.role === "right")
						this.aim = F.direction(c.x - c.ox, c.y - c.oy, [0, 0]);
				},
				{ passive: false, signal },
			);
			const up = (e) => {
				const c = this.contacts.get(e.pointerId);
				if (!c) return;
				if (
					c.role === "right" &&
					e.type === "pointerup" &&
					app.game.real - c.at < 0.32 &&
					Math.hypot(c.x - c.ox, c.y - c.oy) < 18
				)
					this.pulse = 0.14;
				if (c.role === "left") {
					this.left = null;
					this.move = [0, 0];
				}
				if (c.role === "right") {
					this.right = null;
					this.aim = [0, 0];
				}
				if (e.type !== "pointerup") this.pulse = 0;
				this.contacts.delete(e.pointerId);
				if (!this.contacts.size) {
					this.move = [0, 0];
					this.aim = [0, 0];
					this.warp = false;
				}
			};
			for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
				cv.addEventListener(name, up, { signal });
			addEventListener("blur", () => this.clear(), { signal });
		}
		clear() {
			this.contacts.clear();
			this.left = this.right = null;
			this.move = this.aim = [0, 0];
			this.warp = false;
			this.pulse = 0;
			if (this.button) this.button.hidden = true;
		}
		read(dt, s) {
			this.pulse = Math.max(0, this.pulse - dt);
			const p = s.ship,
				assist = this.app.game.settings.touchAssist;
			const base = Math.hypot(...this.aim) > 0.1 ? this.aim : [p.aimX, p.aimY],
				safe = F.safeAim(s, base, 0.45, this.right === null && assist);
			const firing =
				this.contacts.size > 0 && (assist ? safe.fire : this.right !== null);
			const aim = assist ? safe.aim : base;
			if (this.button) {
				const c = this.contacts.get(this.right),
					show =
						!!c &&
						p.energy >= this.app.sim.balance.burstCost &&
						!this.app.ui.screen;
				this.button.hidden = !show;
				if (show) {
					this.button.style.left =
						F.clamp(c.x - 65, 12, innerWidth - 145) + "px";
					this.button.style.top =
						F.clamp(c.y - 90, 80, innerHeight - 65) + "px";
				}
			}
			return F.intent({
				mx: this.move[0],
				my: this.move[1],
				ax: aim[0],
				ay: aim[1],
				fire:
					firing &&
					!blocksCrystal(s, p, {
						x: p.x + aim[0] * 350,
						y: p.y + aim[1] * 350,
					}),
				warp: this.warp || this.pulse > 0,
			});
		}
	}
	F.Touch = Touch;
	F.readSeat = (app, input, dt, index = 0) => {
		if (app.ui.screen || app.ended) return { ...F.NEUTRAL };
		if (app.injected[index]) return F.intent(app.injected[index]);
		const s = app.sim.s;
		if (index === 0 && app.touch.active && input.lastDevice === "touch")
			return app.touch.read(dt, s);
		const [mx, my] = input.move();
		let aim = input.padAim || [s.ship.aimX, s.ship.aimY];
		if (
			index === 0 &&
			["keyboard", "mouse"].includes(input.lastDevice) &&
			input.mouse.active
		) {
			const at = app.game.mouseGround();
			if (at) aim = F.direction(at[0] - s.ship.x, at[1] - s.ship.y, aim);
		}
		if (app.game.settings.aimAssist && input.lastDevice === "gamepad")
			aim = F.safeAim(s, F.direction(...aim), app.sim.balance.assistCone).aim;
		return F.intent({
			mx,
			my,
			ax: aim[0],
			ay: aim[1],
			fire: input.down("fire"),
			warp: input.down("warp"),
		});
	};
})(typeof globalThis === "object" ? globalThis : window);
