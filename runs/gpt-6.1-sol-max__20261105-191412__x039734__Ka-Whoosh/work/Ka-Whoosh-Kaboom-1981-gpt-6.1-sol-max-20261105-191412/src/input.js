export class Input {
	constructor(app) {
		this.app = app;
		this.keys = new Set();
		this.last = "keyboard";
		this.mouseTarget = null;
		this.touchTarget = null;
		this.touches = new Map();
		this.pads = [];
		this.previous = [];
		this.repeatAt = 0;
		addEventListener("keydown", (e) => this.key(e, true));
		addEventListener("keyup", (e) => this.key(e, false));
		addEventListener("blur", () => {
			this.keys.clear();
			this.mouseTarget = null;
			this.touches.clear();
			this.touchTarget = null;
		});
		addEventListener("pointerdown", (e) => this.down(e));
		addEventListener("pointermove", (e) => this.move(e));
		addEventListener("pointerup", (e) => this.up(e));
		addEventListener("pointercancel", (e) => this.up(e));
		addEventListener("gamepadconnected", () => {
			this.device("pad");
			this.app.toast("Controller connected. Rooftop ready.");
		});
		document.addEventListener("pointerover", (e) => {
			const b = e.target.closest("button,input");
			if (b && this.app.screen && !this.app.attract) {
				b.focus({ preventScroll: true });
			}
		});
		document.addEventListener("contextmenu", (e) => e.preventDefault());
	}
	device(type) {
		if (this.last !== type) {
			this.last = type;
			document.body.classList.toggle("touch-mode", type === "touch");
			this.app.prompts();
		}
		if (type === "touch" && this.app.game) this.app.game.assist = true;
	}
	activity(type) {
		this.device(type);
		return this.app.activity();
	}
	key(e, down) {
		const typing =
			["TEXTAREA", "INPUT"].includes(e.target.tagName) &&
			e.target.type !== "range";
		if (!down) {
			this.keys.delete(e.code);
			return;
		}
		if (this.app.net?.ended) return;
		if (this.activity("keyboard")) {
			e.preventDefault();
			return;
		}
		if (typing && e.code !== "Escape") return;
		if (
			[
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Space",
				"Enter",
				"Escape",
				"KeyA",
				"KeyD",
				"KeyW",
				"KeyS",
				"KeyP",
			].includes(e.code)
		)
			e.preventDefault();
		if (e.repeat) return;
		this.keys.add(e.code);
		if (this.app.screen) {
			if (e.code === "Escape") this.app.back();
			else if (e.code === "ArrowUp" || e.code === "KeyW") this.navigate(-1);
			else if (e.code === "ArrowDown" || e.code === "KeyS") this.navigate(1);
			else if (e.code === "ArrowLeft") this.adjust(-1);
			else if (e.code === "ArrowRight") this.adjust(1);
			else if (e.code === "Enter" || e.code === "Space") this.activate();
			return;
		}
		if (e.code === "Escape" || e.code === "KeyP") this.app.pause();
		else if (
			e.code === "Space" ||
			e.code === "KeyE" ||
			(e.code === "Enter" && this.app.game.mode === "coop")
		)
			this.app.douse();
		else if (e.code === "KeyF") this.app.fullscreen();
	}
	isUI(e) {
		return !!e.target.closest("button,input,textarea,a,.panel");
	}
	down(e) {
		if (this.app.net?.ended) return;
		const touch = e.pointerType === "touch";
		if (this.activity(touch ? "touch" : "mouse")) {
			e.preventDefault();
			return;
		}
		if (this.isUI(e) || this.app.screen) return;
		if (touch) {
			this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
			if (this.touches.size > 1) this.app.douse();
			else this.touchTarget = this.app.stage.screenX(e.clientX, e.clientY);
		} else if (e.button === 0) this.app.douse();
	}
	move(e) {
		if (this.app.net?.ended) return;
		const touch = e.pointerType === "touch";
		if (!touch && Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
		if (this.activity(touch ? "touch" : "mouse")) return;
		if (this.app.screen) return;
		if (touch) {
			if (this.touches.has(e.pointerId)) {
				this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
				if (e.pointerId === this.touches.keys().next().value)
					this.touchTarget = this.app.stage.screenX(e.clientX, e.clientY);
			}
		} else this.mouseTarget = this.app.stage.screenX(e.clientX, e.clientY);
	}
	up(e) {
		this.touches.delete(e.pointerId);
		if (!this.touches.size) this.touchTarget = null;
	}
	controls() {
		const coop = this.app.game?.mode === "coop";
		let axis = 0,
			axis2 = 0;
		if (this.keys.has("KeyA") || (!coop && this.keys.has("ArrowLeft"))) axis--;
		if (this.keys.has("KeyD") || (!coop && this.keys.has("ArrowRight"))) axis++;
		if (coop) {
			if (this.keys.has("ArrowLeft")) axis2--;
			if (this.keys.has("ArrowRight")) axis2++;
		}
		if (axis) this.mouseTarget = null;
		const p0 = this.pads[0],
			p1 = this.pads[1];
		if (p0 && Math.abs(p0.axis) > 0.1) {
			axis = p0.axis;
			this.mouseTarget = null;
		}
		if (p1 && Math.abs(p1.axis) > 0.1) axis2 = p1.axis;
		const target =
			this.last === "touch"
				? this.touchTarget
				: this.last === "mouse"
					? this.mouseTarget
					: null;
		return [
			{ axis, target },
			{ axis: axis2, target: null },
		];
	}
	poll(now) {
		const pads = Array.from(navigator.getGamepads?.() || [])
			.filter(Boolean)
			.slice(0, 2);
		this.pads = [];
		for (let i = 0; i < pads.length; i++) {
			const p = pads[i],
				b = p.buttons.map((b) => (typeof b === "number" ? b > 0.5 : b.pressed)),
				prev = this.previous[i] || [],
				press = (n) => b[n] && !prev[n];
			let axis = Math.abs(p.axes[0] || 0) > 0.17 ? p.axes[0] : 0;
			if (b[14]) axis = -1;
			if (b[15]) axis = 1;
			this.pads.push({ axis });
			const active =
				b.some((v, n) => v && !prev[n]) ||
				Math.abs(axis) > 0.2 ||
				Math.abs(p.axes[1] || 0) > 0.3 ||
				Math.abs(p.axes[3] || 0) > 0.25;
			let consumed = false;
			if (active) consumed = this.activity("pad");
			if (!consumed && !this.app.net?.ended) {
				if (this.app.screen) {
					if (Math.abs(p.axes[3] || 0) > 0.25) {
						const area =
							document.querySelector(".about-body") ||
							document.querySelector(".panel");
						if (area) area.scrollTop += p.axes[3] * 12;
					}
					const vertical =
						b[12] || p.axes[1] < -0.55 ? -1 : b[13] || p.axes[1] > 0.55 ? 1 : 0;
					if (vertical && now > this.repeatAt) {
						this.navigate(vertical);
						this.repeatAt = now + 210;
					}
					if (
						(press(14) || press(15) || Math.abs(axis) > 0.55) &&
						now > this.repeatAt
					) {
						this.adjust(axis > 0 ? 1 : -1);
						this.repeatAt = now + 170;
					}
					if (press(0)) this.activate();
					if (press(1) || (press(9) && !b[8])) this.app.back();
				} else {
					if (press(9) && !b[8]) this.app.pause();
					if (press(0) || press(5)) this.app.douse();
				}
			}
			this.previous[i] = b;
		}
	}
	elements() {
		return Array.from(
			document.querySelectorAll(
				"#screen button:not(:disabled),#screen input:not(:disabled),#screen textarea:not(:disabled),#screen a,#screen [tabindex='0']",
			),
		).filter((el) => el.offsetParent !== null);
	}
	navigate(dir) {
		const focused = document.activeElement;
		if (focused?.classList.contains("about-body")) {
			const room =
				dir > 0
					? focused.scrollTop + focused.clientHeight < focused.scrollHeight - 3
					: focused.scrollTop > 3;
			if (room) {
				focused.scrollTop += dir * 130;
				return;
			}
		}
		const els = this.elements();
		if (!els.length) return;
		const idx = els.indexOf(document.activeElement);
		els[(idx + dir + els.length) % els.length].focus({ preventScroll: true });
		document.activeElement.scrollIntoView({ block: "nearest" });
		this.app.sound.play("click");
	}
	adjust(dir) {
		const el = document.activeElement;
		if (el?.type === "range") {
			el.value = Number(el.value) + dir * Number(el.step || 1);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		} else if (el?.dataset.cycle) el.click();
	}
	activate() {
		let el = document.activeElement;
		if (!this.elements().includes(el)) {
			el = this.elements()[0];
			el?.focus();
		}
		if (el?.tagName === "BUTTON" || el?.tagName === "A") el.click();
	}
	clear() {
		this.keys.clear();
		this.mouseTarget = null;
		this.touchTarget = null;
		this.touches.clear();
	}
}
