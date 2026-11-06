import { cell, same } from "../sim/maze.js";
export const GAME_INPUT = {
	start: ["Enter", "NumpadEnter", "Pad9"],
	pause: ["Escape", "KeyP", "Pad9"],
	confirm: ["Enter", "NumpadEnter", "Space", "Pad0"],
	cancel: ["Escape", "Backspace", "Pad1"],
	up: ["KeyW", "ArrowUp", "Pad12"],
	down: ["KeyS", "ArrowDown", "Pad13"],
	left: ["KeyA", "ArrowLeft", "Pad14"],
	right: ["KeyD", "ArrowRight", "Pad15"],
	plant: ["Space", "Pad0"],
	paint: ["Enter", "Space", "Pad0"],
	tools: ["Tab", "Pad3"],
	previous: ["KeyQ", "Pad4"],
	next: ["KeyE", "Pad5"],
	undo: ["KeyZ", "Pad2"],
	redo: ["KeyY", "Pad7"],
};
export class NativeControls {
	constructor(game, onActivity, onWake) {
		this.game = game;
		this.goals = new Map();
		this.axes = new Map();
		this.modality = "keyboard";
		this.onActivity = onActivity;
		this.onWake = onWake;
		this.padStates = new Map();
		this.consumed = 0;
		this.lastPointer = null;
		this.keyboardDir = [1, 0];
		this.abort = new AbortController();
		if (!game.headless) {
			const activity = (e) => {
				if (e.type === "pointermove") {
					if (
						this.lastPointer &&
						Math.hypot(
							e.clientX - this.lastPointer[0],
							e.clientY - this.lastPointer[1],
						) < 3
					)
						return;
					this.lastPointer = [e.clientX, e.clientY];
				}
				if (e.type === "keydown") {
					if (e.repeat) return;
					this.modality = "keyboard";
					const d = {
						ArrowUp: [0, -1],
						KeyW: [0, -1],
						ArrowDown: [0, 1],
						KeyS: [0, 1],
						ArrowLeft: [-1, 0],
						KeyA: [-1, 0],
						ArrowRight: [1, 0],
						KeyD: [1, 0],
					}[e.code];
					if (d) this.keyboardDir = d;
				} else if (e.type.startsWith("pointer"))
					this.modality = e.pointerType === "mouse" ? "mouse" : "touch";
				if (this.onWake?.()) {
					e.preventDefault();
					e.stopImmediatePropagation();
					this.consume();
				}
				this.onActivity?.();
			};
			for (const type of [
				"keydown",
				"keyup",
				"pointerdown",
				"pointerup",
				"pointermove",
				"wheel",
			])
				window.addEventListener(type, activity, {
					capture: true,
					passive: false,
					signal: this.abort.signal,
				});
		}
		game.input.steer = "drag";
		game.input.stickRadius = 38;
		game.input.stickDeadzone = 0.08;
	}
	consume() {
		this.game.players.forEach((I) => {
			I.clear();
		});
		this.consumed = 0.18;
		this.goals.clear();
	}
	poll(dt) {
		this.consumed = Math.max(0, this.consumed - dt);
		let pads = [];
		try {
			pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
		} catch {}
		let active = false;
		for (const p of pads) {
			const state = p.buttons.map((b) => (b.pressed ? "1" : "0")).join(""),
				analog = Math.hypot(p.axes[0] || 0, p.axes[1] || 0),
				old = this.padStates.get(p.index),
				changed = state !== old?.state && state.includes("1"),
				moved =
					analog > 0.4 &&
					(!old ||
						old.analog <= 0.4 ||
						Math.abs(analog - old.analog) > 0.18 ||
						Math.abs((p.axes[0] || 0) - old.x) > 0.28 ||
						Math.abs((p.axes[1] || 0) - old.y) > 0.28);
			if (changed || moved) {
				active = true;
				this.modality = "gamepad";
			}
			this.padStates.set(p.index, {
				state,
				analog,
				x: p.axes[0] || 0,
				y: p.axes[1] || 0,
			});
		}
		if (active) {
			if (this.onWake?.()) this.consume();
			this.onActivity?.();
		}
		this.game.input.lastDevice = this.modality;
		return pads;
	}
	direction(I, id) {
		const [x, y] = I.move();
		if (Math.hypot(x, y) < 0.28) return null;
		let axis = this.axes.get(id) ?? 0;
		if (Math.abs(y) > Math.abs(x) + 0.15) axis = 1;
		else if (Math.abs(x) > Math.abs(y) + 0.15) axis = 0;
		else if (
			I.lastDevice === "keyboard" &&
			Math.abs(x) > 0.1 &&
			Math.abs(y) > 0.1
		)
			axis = this.keyboardDir[0] ? 0 : 1;
		this.axes.set(id, axis);
		return axis === 0 && Math.abs(x) > 0.1
			? [Math.sign(x), 0]
			: [0, Math.sign(y)];
	}
	command(I, p, world, view, canMouse = true) {
		if (this.consumed > 0) return { stop: true };
		let dir = this.direction(I, p.id),
			plant = I.pressed("plant");
		if (dir) this.goals.delete(p.id);
		const click = canMouse && I.clicked();
		if (click && I.lastDevice !== "touch") {
			const at = view.cellAt(...click),
				preview = world.placement?.(p);
			if (at && preview && same(at, [preview.x, preview.y])) plant = true;
			else if (at && world.graph.walk(at)) this.goals.set(p.id, at);
		}
		const goal = this.goals.get(p.id);
		if (!dir && goal) {
			const from = p.m.moving ? p.m._to : cell(p.m);
			if (same(from, goal)) {
				if (!p.m.moving) this.goals.delete(p.id);
				return { dir: null, plant, stop: true };
			} else {
				const path = world.graph.path(from, goal);
				if (path.length > 1) dir = world.graph.direction(from, path[1]);
				else this.goals.delete(p.id);
			}
		}
		return { dir, plant };
	}
	setSeats(assignments) {
		const g = this.game;
		while (g.players.length > 1) g.removePlayer(g.players.at(-1));
		g.input.use(GAME_INPUT);
		g.input.pad = assignments[0] === "keyboard" ? null : assignments[0];
		if (assignments.length > 1) g.addPlayer({ pad: assignments[1] });
		g.players.forEach((I) => {
			I.use(GAME_INPUT);
			I.clear();
		});
	}
	solo() {
		const g = this.game;
		while (g.players.length > 1) g.removePlayer(g.players.at(-1));
		g.input.pad = "any";
		g.input.use(GAME_INPUT);
		g.input.clear();
	}
	dispose() {
		this.abort.abort();
	}
}
