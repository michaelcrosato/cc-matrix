const keys = new Set(),
	touches = new Map();
let stick = null,
	padPrev = [],
	padNavTimer = 0,
	padDetected = false,
	lastMouse = { x: 0, y: 0 };
const mouseNDC = new THREE.Vector2();
function activity(type) {
	if (hubEnded) return false;
	lastActivity = performance.now();
	if (type !== inputType) {
		inputType = type;
		document.body.classList.toggle("touch", type === "touch");
		$("aim").style.display =
			type === "mouse" && menu === null ? "block" : "none";
		if (menu && menu !== "title")
			$("modal-hint").innerHTML =
				type === "controller"
					? "D-PAD SELECT · " +
						glyph("dodge") +
						"CONFIRM · " +
						glyph("tool") +
						"BACK · R SCROLL"
					: "↑ ↓ SELECT · ENTER CONFIRM · ESC BACK · PGDN SCROLL";
		$("title-input").textContent =
			type === "controller"
				? "D-PAD SELECT · " +
					(settings.glyphs === "Xbox" ? "A" : "✕") +
					" CONFIRM"
				: type === "touch"
					? "TAP TO BEGIN · LEFT THUMB TO MOVE"
					: "WASD + MOUSE · OR CONTROLLER";
	}
	if (S.attract) {
		stopAttract();
		return false;
	}
	return true;
}
document.addEventListener(
	"pointerdown",
	(e) => {
		if (!activity(e.pointerType === "touch" ? "touch" : "mouse")) {
			e.stopImmediatePropagation();
			e.preventDefault();
		}
	},
	true,
);
window.addEventListener("keydown", (e) => {
	const typing = e.target.tagName === "INPUT" && e.target.type !== "range";
	if (!activity("keyboard")) {
		e.preventDefault();
		return;
	}
	audio.unlock();
	if (typing && e.code !== "Escape" && e.code !== "Enter") return;
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
	if (menu) {
		if (e.code === "Escape") {
			if (menu !== "title") closeMenu();
			return;
		}
		if (e.code === "PageDown" || e.code === "PageUp") {
			e.preventDefault();
			$("modal-body").scrollTop +=
				(e.code === "PageDown" ? 1 : -1) * $("modal-body").clientHeight * 0.75;
			return;
		}
		if (["ArrowDown", "KeyS", "Tab"].includes(e.code))
			menuMove(e.shiftKey ? -1 : 1);
		if (["ArrowUp", "KeyW"].includes(e.code)) menuMove(-1);
		if (["ArrowLeft", "KeyA"].includes(e.code)) menuAdjust(-1);
		if (["ArrowRight", "KeyD"].includes(e.code)) menuAdjust(1);
		if (e.code === "Enter" || e.code === "Space") {
			e.preventDefault();
			focusList()[menuFocus]?.click();
		}
		return;
	}
	keys.add(e.code);
	if (e.repeat) return;
	if (e.code === "Escape") {
		openMenu("pause");
		keys.clear();
	}
	if (e.code === "KeyQ") openMenu("notes");
	if (e.code === "KeyE") latestInput.interact = true;
	if (e.code === "Space") latestInput.dodge = true;
	if (e.code === "KeyF") latestInput.tool = true;
	if (e.code === "KeyJ") latestInput.attack = true;
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
	keys.clear();
	stick = null;
});
document.addEventListener("visibilitychange", () => {
	if (
		document.hidden &&
		!netActive &&
		S.mode === "playing" &&
		!S.attract &&
		menu === null
	)
		openMenu("pause");
});
$("world").addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") {
		if (stick && e.pointerId === stick.id) {
			stick.x = clamp((e.clientX - stick.sx) / 55, -1, 1);
			stick.z = clamp((e.clientY - stick.sy) / 55, -1, 1);
		}
		return;
	}
	if (Math.hypot(e.clientX - lastMouse.x, e.clientY - lastMouse.y) > 3) {
		activity("mouse");
		lastMouse = { x: e.clientX, y: e.clientY };
		mouseMoved = true;
	}
	mouseNDC.set(
		(e.clientX / innerWidth) * 2 - 1,
		(-e.clientY / innerHeight) * 2 + 1,
	);
	$("aim").style.left = e.clientX + "px";
	$("aim").style.top = e.clientY + "px";
});
$("world").addEventListener("pointerdown", (e) => {
	if (!activity(e.pointerType === "touch" ? "touch" : "mouse")) return;
	audio.unlock();
	if (menu) return;
	if (e.pointerType === "touch") {
		$("world").setPointerCapture(e.pointerId);
		touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			t: performance.now(),
		});
		if (e.clientX < innerWidth * 0.52 && !stick) {
			stick = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: 0, z: 0 };
			$("touch-stick").classList.remove("hidden");
			$("touch-stick").style.left = e.clientX - 50 + "px";
			$("touch-stick").style.top = e.clientY - 50 + "px";
		}
		return;
	}
	if (e.button === 0) {
		if (
			hovered &&
			localPlayer() &&
			dist(hovered, localPlayer().pos) < hovered.radius
		)
			latestInput.interact = true;
		else latestInput.attack = true;
	}
	if (e.button === 2) latestInput.tool = true;
});
window.addEventListener("pointerup", (e) => {
	if (e.pointerType !== "touch") return;
	if (stick && stick.id === e.pointerId) {
		stick = null;
		$("touch-stick").classList.add("hidden");
	} else if (touches.has(e.pointerId) && menu === null)
		latestInput.dodge = true;
	touches.delete(e.pointerId);
});
window.addEventListener("pointercancel", (e) => {
	touches.delete(e.pointerId);
	if (stick?.id === e.pointerId) {
		stick = null;
		$("touch-stick").classList.add("hidden");
	}
});
window.addEventListener("gamepadconnected", () => {
	padDetected = true;
	activity("controller");
});
function pollInput(dt) {
	if (hubEnded) return;
	const pads = Array.from(navigator.getGamepads?.() || []),
		pad = pads.find((p) => p && p.connected !== false);
	let mx = 0,
		mz = 0;
	if (keys.has("KeyW") || keys.has("ArrowUp")) mz--;
	if (keys.has("KeyS") || keys.has("ArrowDown")) mz++;
	if (keys.has("KeyA") || keys.has("ArrowLeft")) mx--;
	if (keys.has("KeyD") || keys.has("ArrowRight")) mx++;
	if (stick) {
		mx = stick.x;
		mz = stick.z;
	}
	let aim = null;
	if (inputType === "mouse" && mouseMoved && camera && localPlayer()) {
		raycaster.setFromCamera(mouseNDC, camera);
		plane.constant = -(S.stage === 4 ? localPlayer().pos.y : 0);
		const hit = vec();
		if (raycaster.ray.intersectPlane(plane, hit)) aim = { x: hit.x, z: hit.z };
		hovered = null;
		let best = 1e9;
		for (const i of S.interacts) {
			if (i.can && !i.can()) continue;
			const projected = vec(i.x, 1.2, i.z).project(camera),
				sx = (projected.x * 0.5 + 0.5) * innerWidth,
				sy = (-projected.y * 0.5 + 0.5) * innerHeight;
			const px = (mouseNDC.x * 0.5 + 0.5) * innerWidth,
				py = (-mouseNDC.y * 0.5 + 0.5) * innerHeight,
				d = Math.hypot(sx - px, sy - py);
			if (d < 42 && d < best) {
				hovered = i;
				best = d;
			}
		}
		$("world").style.cursor = hovered ? "pointer" : "crosshair";
	}
	if (pad) {
		const b = pad.buttons.map((b) =>
				typeof b === "number" ? b > 0.5 : b.pressed || b.value > 0.5,
			),
			edge = (i) => b[i] && !padPrev[i];
		const ax = pad.axes[0] || 0,
			ay = pad.axes[1] || 0,
			rx = pad.axes[2] || 0,
			ry = pad.axes[3] || 0;
		const active =
			Math.hypot(ax, ay) > 0.2 ||
			Math.hypot(rx, ry) > 0.25 ||
			b.some((v, i) => v && !padPrev[i]);
		if (active && !activity("controller")) {
			padPrev = b;
			return;
		}
		if (active) audio.unlock();
		if (menu) {
			if (menu !== "title" && Math.abs(ry) > 0.15)
				$("modal-body").scrollTop += ry * dt * 540;
			padNavTimer -= dt;
			const down = b[13] || ay > 0.55,
				up = b[12] || ay < -0.55,
				left = b[14] || ax < -0.55,
				right = b[15] || ax > 0.55;
			if (padNavTimer <= 0 && (down || up || left || right)) {
				if (down) menuMove(1);
				else if (up) menuMove(-1);
				else menuAdjust(right ? 1 : -1);
				padNavTimer = 0.19;
			}
			if (edge(0)) focusList()[menuFocus]?.click();
			if (edge(1) && menu !== "title") closeMenu();
			if (edge(9) && !(AIHub.active && b[8]) && menu === "pause") closeMenu();
		} else {
			if (Math.abs(ax) > 0.15) mx = ax;
			if (Math.abs(ay) > 0.15) mz = ay;
			if (Math.hypot(rx, ry) > 0.2 && localPlayer()) {
				const v = inputWorld({ x: rx, z: ry });
				aim = {
					x: localPlayer().pos.x + v.x * 10,
					z: localPlayer().pos.z + v.z * 10,
				};
			}
			if (edge(0)) latestInput.dodge = true;
			if (edge(1)) latestInput.tool = true;
			if (edge(2)) latestInput.attack = true;
			if (edge(3)) latestInput.interact = true;
			if (edge(4)) openMenu("notes");
			if (edge(9) && !(AIHub.active && b[8])) openMenu("pause");
		}
		padPrev = b;
		padDetected = true;
	} else padPrev = [];
	if (menu || hubInfo?.server) {
		latestInput.x = 0;
		latestInput.z = 0;
		latestInput.aim = null;
		latestInput.attack = false;
		latestInput.interact = false;
		latestInput.dodge = false;
		latestInput.tool = false;
	} else {
		latestInput.x = mx;
		latestInput.z = mz;
		latestInput.aim = aim;
	}
}
