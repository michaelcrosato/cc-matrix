export const ACTIONS = {
	up: ["KeyW", "ArrowUp", "Pad12"],
	down: ["KeyS", "ArrowDown", "Pad13"],
	left: ["KeyA", "ArrowLeft", "Pad14"],
	right: ["KeyD", "ArrowRight", "Pad15"],
	ray: ["Space", "Mouse0", "Pad0"],
	focus: ["ShiftLeft", "ShiftRight", "Pad7"],
	steer: ["Mouse2"],
	start: ["Enter", "Pad9"],
	pause: ["Escape", "KeyP", "Pad9"],
	confirm: ["Enter", "Space", "Pad0"],
	cancel: ["Escape", "Backspace", "Pad1"],
	halves: {
		left: {
			steer: ["Mouse2"],
			ray: ["KeyF", "Space", "Mouse0"],
			focus: ["KeyG", "ShiftLeft", "ShiftRight"],
		},
		right: {
			steer: [],
			ray: ["Period", "Numpad1"],
			focus: ["Slash", "Numpad2"],
		},
	},
};
export function readAction(game, input, p, rayCounter) {
	let [x, y] = input.move();
	if (input.down("steer")) {
		const q = game.mouseGround();
		if (q) {
			const dx = q[0] - p.x,
				dy = q[1] - p.y,
				d = Math.hypot(dx, dy);
			x = d > 3 ? dx / Math.max(12, d) : 0;
			y = d > 3 ? dy / Math.max(12, d) : 0;
		}
	}
	return {
		x,
		y,
		focus: input.down("focus"),
		ray: Math.max(rayCounter, p.lastRay) + (input.pressed("ray") ? 1 : 0),
	};
}
export function prompt(game) {
	const I = game.input;
	if (I.lastDevice === "touch")
		return "LEFT THUMB flies   •   RIGHT HOLD focuses   •   TAP RAY zaps";
	return `${I.label("ray")} RAY   •   Hold ${I.label("focus")} FOCUS   •   ${I.label("pause")} MENU`;
}
