const dead = (x) => (Math.abs(x || 0) > 0.2 ? x : 0);
export class Input {
	constructor(onActivity, onMenu, onPause) {
		this.onActivity = onActivity;
		this.onMenu = onMenu;
		this.onPause = onPause;
		this.kind = "keyboard";
		this.keys = new Set();
		this.pressed = new Set();
		this.prevPads = [];
		this.padEdges = [];
		this.touch = new Map();
		this.touchJump = false;
		this.touchWhistle = false;
		this.touchUp = false;
		this.menu = true;
		this.lastPadNav = 0;
		this.lastTouch = 0;
		this.hasPad = false;
		addEventListener("keydown", (e) => {
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			this.activity("keyboard");
			if (
				["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
				![
					"Escape",
					"Enter",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
				].includes(e.code)
			)
				return;
			const isNew = !this.keys.has(e.code);
			this.keys.add(e.code);
			if (isNew) this.pressed.add(e.code);
			if (
				[
					"Space",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight",
					"Tab",
				].includes(e.code)
			)
				e.preventDefault();
			if (isNew && (e.code === "Escape" || e.code === "KeyP")) {
				e.preventDefault();
				this.onPause();
			} else if (this.menu && (isNew || e.repeat)) {
				const dir = {
					ArrowUp: "up",
					KeyW: "up",
					ArrowDown: "down",
					KeyS: "down",
					ArrowLeft: "left",
					KeyA: "left",
					ArrowRight: "right",
					KeyD: "right",
				}[e.code];
				if (dir) this.onMenu(dir);
				else if (isNew && ["Enter", "Space"].includes(e.code)) {
					e.preventDefault();
					this.onMenu("accept");
				} else if (e.code === "Tab") this.onMenu("next");
			}
		});
		addEventListener("keyup", (e) => this.keys.delete(e.code));
		addEventListener("blur", () => {
			this.keys.clear();
			this.pressed.clear();
			this.touch.clear();
		});
		addEventListener(
			"pointerdown",
			(e) => {
				this.activity(e.pointerType === "touch" ? "touch" : "mouse");
				if (
					e.pointerType !== "touch" ||
					this.menu ||
					e.target.closest("button,input,[data-ui]")
				)
					return;
				e.preventDefault();
				this.touch.set(e.pointerId, {
					x: e.clientX,
					y: e.clientY,
					dx: 0,
					dy: 0,
					side: e.clientX < innerWidth * 0.55 ? "left" : "right",
					time: performance.now(),
				});
				if (e.clientX >= innerWidth * 0.55) this.touchJump = true;
			},
			{ passive: false },
		);
		addEventListener("pointermove", (e) => {
			if (e.pointerType !== "touch") {
				if (
					performance.now() - (this.mouseAt || 0) > 300 &&
					(e.movementX || e.movementY)
				) {
					this.activity("mouse");
					this.mouseAt = performance.now();
				}
				return;
			}
			const t = this.touch.get(e.pointerId);
			if (t) {
				t.dx = e.clientX - t.x;
				t.dy = e.clientY - t.y;
			}
		});
		const release = (e) => {
			this.touch.delete(e.pointerId);
		};
		addEventListener("pointerup", release);
		addEventListener("pointercancel", release);
		addEventListener("gamepadconnected", () => {
			this.hasPad = true;
			this.activity("pad");
		});
	}
	activity(kind) {
		this.kind = kind;
		if (kind === "touch") this.lastTouch = performance.now();
		this.onActivity(kind);
	}
	poll() {
		const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
		this.hasPad = pads.length > 0;
		this.pads = pads;
		this.padEdges = [];
		pads.forEach((p, i) => {
			const btns = p.buttons.map((b) => b.pressed || b.value > 0.5),
				prev = this.prevPads[i] || [];
			const edges = btns.map((b, j) => b && !prev[j]);
			this.padEdges[i] = edges;
			const axisX = dead(p.axes[0]),
				axisY = dead(p.axes[1]);
			if (btns.some(Boolean) || axisX || axisY) {
				this.activity("pad");
				if (edges[9] && !btns[8]) this.onPause();
				if (this.menu) {
					const now = performance.now();
					if (now - this.lastPadNav > 190) {
						const dir =
							btns[12] || axisY < -0.5
								? "up"
								: btns[13] || axisY > 0.5
									? "down"
									: btns[14] || axisX < -0.5
										? "left"
										: btns[15] || axisX > 0.5
											? "right"
											: null;
						if (dir) {
							this.onMenu(dir);
							this.lastPadNav = now;
						}
					}
					if (edges[0]) this.onMenu("accept");
					if (edges[1]) this.onMenu("back");
				}
			}
			this.prevPads[i] = btns;
		});
	}
	sample(index = 0) {
		const k = this.keys,
			edge = this.pressed;
		const p = this.pads?.[index],
			b = p?.buttons || [],
			e = this.padEdges[index] || [],
			is = (n) => !!b[n]?.pressed;
		const left = index === 0 ? ["KeyA", "ArrowLeft"] : ["KeyJ"],
			right = index === 0 ? ["KeyD", "ArrowRight"] : ["KeyL"];
		let axis =
			(right.some((x) => k.has(x)) ? 1 : 0) -
			(left.some((x) => k.has(x)) ? 1 : 0);
		if (p)
			axis = dead(p.axes[0]) || (is(15) ? 1 : 0) - (is(14) ? 1 : 0) || axis;
		const downKeys = index === 0 ? ["KeyS", "ArrowDown"] : ["KeyK"];
		let duck =
			downKeys.some((x) => k.has(x)) ||
			is(1) ||
			is(13) ||
			dead(p?.axes[1]) > 0.55;
		let up =
			(index === 0 ? ["KeyW", "ArrowUp", "KeyE"] : ["KeyU"]).some((x) =>
				k.has(x),
			) ||
			is(3) ||
			is(12) ||
			dead(p?.axes[1]) < -0.55;
		let jump = edge.has(index === 0 ? "Space" : "KeyI") || e[0];
		let whistle = edge.has(index === 0 ? "KeyF" : "KeyO") || e[2];
		if (index === 0) {
			for (const t of this.touch.values()) {
				if (t.side === "left") {
					axis = Math.max(-1, Math.min(1, t.dx / 42));
					up ||= t.dy < -32;
					duck ||= t.dy > 28;
				} else duck ||= t.dy > 30;
			}
			jump ||= this.touchJump;
			whistle ||= this.touchWhistle;
			up ||= this.touchUp;
		}
		return {
			axis,
			duck,
			down: duck,
			up,
			jump: !!jump,
			whistle: !!whistle,
			overview: (index === 0 && k.has("Tab")) || is(4),
			touch: this.kind === "touch",
		};
	}
	finishFrame() {
		this.pressed.clear();
		this.touchJump = false;
		this.touchWhistle = false;
		this.touchUp = false;
	}
	clear() {
		this.keys.clear();
		this.pressed.clear();
		this.touch.clear();
		this.touchJump = false;
		this.prevPads = [];
	}
}
