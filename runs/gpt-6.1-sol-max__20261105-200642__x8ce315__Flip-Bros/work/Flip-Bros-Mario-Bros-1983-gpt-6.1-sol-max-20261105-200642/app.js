const keys = new Set();
let pads = [],
	oldPadButtons = [],
	padRepeat = 0,
	testFrozen = false,
	accumulator = 0,
	previous = performance.now();
let touchMove = 0,
	touchJump = false,
	touchJumpBuffer = 0,
	touchDashBuffer = 0,
	lastRightTap = -1000,
	touchBell = false,
	touchLeft = null,
	touchRight = null,
	touchOrigin = null,
	touchAssistCD = 0;
const held = (...k) => k.some((v) => keys.has(v));
addEventListener("keydown", (e) => {
	if (net.ended) return;
	const typing =
		e.target instanceof HTMLInputElement && e.target.type === "text";
	if (typing && e.key !== "Escape" && e.key !== "Enter") {
		lastInteraction = performance.now();
		return;
	}
	const consumed = inputActivity("keyboard");
	if (consumed) {
		e.preventDefault();
		keys.clear();
		return;
	}
	audio.unlock();
	if (typing && e.key === "Enter") {
		e.preventDefault();
		joinRoom(e.target.value);
		return;
	}
	if (
		[
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			" ",
			"Escape",
			"Tab",
		].includes(e.key)
	)
		e.preventDefault();
	if (
		e.key === "Escape" ||
		(e.key.toLowerCase() === "p" && ["playing", "pause"].includes(screenMode))
	) {
		if (!e.repeat) back();
		return;
	}
	if (screenMode === "code-entry") {
		e.preventDefault();
		if (e.key === "ArrowLeft") moveDial(-1);
		else if (e.key === "ArrowRight") moveDial(1);
		else if (e.key === "ArrowUp") editDial(1);
		else if (e.key === "ArrowDown") editDial(-1);
		else if (e.key === "Enter") joinRoom(roomLetters.join(""));
		else if (/^[a-z]$/i.test(e.key)) {
			roomLetters[roomCursor] = e.key.toUpperCase();
			roomCursor = (roomCursor + 1) % 6;
			updateDials();
		} else if (e.key === "Backspace") moveDial(-1);
		return;
	}
	if (
		["info", "how"].includes(screenMode) &&
		["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)
	) {
		scrollBook(["ArrowUp", "w"].includes(e.key) ? -1 : 1);
		return;
	}
	if (screenMode !== "playing") {
		if (["ArrowDown", "s", "S", "Tab"].includes(e.key)) moveMenu(1);
		else if (["ArrowUp", "w", "W"].includes(e.key)) moveMenu(-1);
		else if (e.key === "ArrowLeft") adjustMenu(-1);
		else if (e.key === "ArrowRight") adjustMenu(1);
		else if ((e.key === "Enter" || e.key === " ") && !e.repeat) activateMenu();
		return;
	}
	keys.add(e.code);
	keys.add(e.key.toLowerCase());
});
addEventListener("keyup", (e) => {
	keys.delete(e.code);
	keys.delete(e.key.toLowerCase());
});
addEventListener("blur", () => {
	keys.clear();
	touchMove = 0;
	touchJump = false;
	if (screenMode === "playing" && !game.attract && !isNetworked()) showPause();
});
addEventListener("pointermove", (e) => {
	if (
		e.pointerType !== "touch" &&
		e.movementX + e.movementY !== 0 &&
		screenMode === "title"
	)
		inputActivity("keyboard");
});
addEventListener("pointerdown", (e) => {
	if (net.ended) return;
	if (e.pointerType !== "touch") {
		if (game.attract) inputActivity("keyboard");
		return;
	}
	touchDetected = true;
	if (inputActivity("touch")) return;
	audio.unlock();
	if (screenMode !== "playing" || e.target.closest("button,.panel")) return;
	e.preventDefault();
	if (e.clientX < innerWidth * 0.52) {
		touchLeft = e.pointerId;
		touchOrigin = { x: e.clientX, y: e.clientY };
		touchMove = 0;
		$("touch-stick").style.cssText =
			`display:block;left:${e.clientX - 50}px;top:${e.clientY - 50}px`;
	} else {
		touchRight = e.pointerId;
		touchJump = true;
		touchJumpBuffer = 0.18;
		if (performance.now() - lastRightTap < 280) touchDashBuffer = 0.2;
		lastRightTap = performance.now();
	}
});
addEventListener("pointermove", (e) => {
	if (e.pointerId === touchLeft && touchOrigin) {
		touchMove = clamp((e.clientX - touchOrigin.x) / 48, -1, 1);
		touchJump = touchJump || e.clientY < touchOrigin.y - 38;
		$("touch-stick").firstElementChild.style.transform =
			`translate(${touchMove * 27}px,${clamp((e.clientY - touchOrigin.y) * 0.4, -27, 27)}px)`;
	}
});
function releaseTouch(e) {
	if (e.pointerId === touchLeft) {
		touchLeft = null;
		touchOrigin = null;
		touchMove = 0;
		touchJump = false;
		$("touch-stick").style.display = "none";
	}
	if (e.pointerId === touchRight) {
		touchRight = null;
		touchJump = false;
	}
}
addEventListener("pointerup", releaseTouch);
addEventListener("pointercancel", releaseTouch);
$("touch-action").addEventListener("pointerdown", (e) => {
	e.stopPropagation();
	inputActivity("touch");
	touchBell = true;
	audio.unlock();
});
$("touch-action").addEventListener("pointerup", () => (touchBell = false));
$("touch-action").addEventListener("pointercancel", () => (touchBell = false));
function pollPads(dt) {
	pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	padRepeat = Math.max(0, padRepeat - dt);
	for (const [index, p] of pads.entries()) {
		const now = p.buttons.map((b) => b.pressed),
			old = oldPadButtons[index] || [],
			edge = (b) => now[b] && !old[b];
		const axis = p.axes[0] || 0,
			ay = p.axes[1] || 0;
		const activity =
			Math.abs(axis) > 0.25 ||
			Math.abs(ay) > 0.35 ||
			now.some((v, i) => v && i !== 8);
		if (activity && inputActivity("gamepad")) {
			oldPadButtons[index] = now;
			continue;
		}
		if (activity) audio.unlock();
		if (net.ended) continue;
		if (edge(9) && !now[8]) {
			if (
				screenMode === "playing" &&
				!isNetworked() &&
				index >= game.players.length &&
				game.players.length < 4
			) {
				game.addPlayer(
					index,
					["Axle", "Rivet", "Socket", "Pip"][index],
					-4 + index * 2,
				);
				localCount = game.players.length;
				notify("CREW MEMBER " + (index + 1) + " CLOCKED IN!");
			} else if (screenMode === "playing") showPause();
			else if (screenMode === "pause") {
				paused = false;
				hideScreen();
			}
		}
		if (screenMode === "code-entry") {
			if (padRepeat <= 0) {
				if (now[14] || axis < -0.55) {
					moveDial(-1);
					padRepeat = 0.18;
				} else if (now[15] || axis > 0.55) {
					moveDial(1);
					padRepeat = 0.18;
				} else if (now[12] || ay < -0.55) {
					editDial(1);
					padRepeat = 0.13;
				} else if (now[13] || ay > 0.55) {
					editDial(-1);
					padRepeat = 0.13;
				}
			}
			if (edge(0)) joinRoom(roomLetters.join(""));
			if (edge(1)) showOnline();
			oldPadButtons[index] = now;
			continue;
		}
		if (["info", "how"].includes(screenMode)) {
			if (padRepeat <= 0) {
				if (now[13] || ay > 0.55) {
					scrollBook(1);
					padRepeat = 0.15;
				} else if (now[12] || ay < -0.55) {
					scrollBook(-1);
					padRepeat = 0.15;
				}
			}
			if (edge(0)) activateMenu();
			if (edge(1)) back();
			oldPadButtons[index] = now;
			continue;
		}
		if (screenMode !== "playing") {
			if ((now[13] || ay > 0.55) && padRepeat <= 0) {
				moveMenu(1);
				padRepeat = 0.18;
			}
			if ((now[12] || ay < -0.55) && padRepeat <= 0) {
				moveMenu(-1);
				padRepeat = 0.18;
			}
			if ((now[14] || axis < -0.55) && padRepeat <= 0) {
				adjustMenu(-1);
				padRepeat = 0.16;
			}
			if ((now[15] || axis > 0.55) && padRepeat <= 0) {
				adjustMenu(1);
				padRepeat = 0.16;
			}
			if (edge(0)) activateMenu();
			if (edge(1)) back();
		}
		oldPadButtons[index] = now;
	}
}
function keyboardInput(index) {
	if (index === 0)
		return {
			x:
				(held("KeyD", "d") || (localCount === 1 && held("ArrowRight"))
					? 1
					: 0) -
				(held("KeyA", "a") || (localCount === 1 && held("ArrowLeft")) ? 1 : 0),
			jump:
				held("Space", " ", "KeyW", "w") ||
				(localCount === 1 && held("ArrowUp")),
			dash: held("KeyX", "x", "ShiftLeft"),
			bell: held("KeyE", "e"),
		};
	return {
		x: (held("ArrowRight") ? 1 : 0) - (held("ArrowLeft") ? 1 : 0),
		jump: held("ArrowUp"),
		dash: held("Slash", "/"),
		bell: held("Enter", "ShiftRight"),
	};
}
function padInput(index) {
	const p = pads[index];
	if (!p) return EMPTY_INPUT();
	let x = p.axes[0] || 0;
	if (Math.abs(x) < 0.18) x = 0;
	if (p.buttons[14]?.pressed) x = -1;
	if (p.buttons[15]?.pressed) x = 1;
	return {
		x,
		jump: !!p.buttons[0]?.pressed,
		dash: !!p.buttons[2]?.pressed,
		bell: !!p.buttons[3]?.pressed,
	};
}
function localInput(index = 0) {
	const k = index < 2 ? keyboardInput(index) : EMPTY_INPUT(),
		p = padInput(index);
	let out = {
		x: Math.abs(p.x) > 0.1 ? p.x : k.x,
		jump: k.jump || p.jump,
		dash: k.dash || p.dash,
		bell: k.bell || p.bell,
	};
	if (
		index === 0 &&
		touchDetected &&
		(touchLeft !== null ||
			touchRight !== null ||
			touchJumpBuffer > 0 ||
			touchDashBuffer > 0 ||
			touchBell)
	) {
		out.x = touchMove;
		out.jump = touchJump || touchJumpBuffer > 0;
		out.dash = touchDashBuffer > 0;
		out.bell = touchBell;
	}
	if (
		index === 0 &&
		touchDetected &&
		preferences.assist &&
		touchAssistCD <= 0 &&
		game.charges > 0 &&
		screenMode === "playing"
	) {
		const player = game.players.find(
			(p) => p.id === (isNetworked() ? net.me : 0),
		);
		if (
			player &&
			game.enemies.some(
				(e) =>
					!e.stun &&
					Math.abs(e.x - player.x) < 1.6 &&
					Math.abs(e.y - player.y) < 1.4,
			)
		) {
			out.bell = true;
			touchAssistCD = 1.7;
		}
	}
	return out;
}
function titlePreview() {
	game.reset([
		{ id: 0, name: "Axle" },
		{ id: 1, name: "Rivet" },
	]);
	game.players[0].body.setTranslation({ x: 7.5, y: 1.1 }, true);
	game.players[1].body.setTranslation({ x: 10.5, y: 4.7 }, true);
	game.spawnEnemy("crab", 8, 8.23);
	game.spawnEnemy("hopper", 6.4, 11.84);
	game.spawnEnemy("armored", 12, 1.04);
	game.status = "idle";
}
function frame(now) {
	const dt = Math.min((now - previous) / 1000, 0.08);
	previous = now;
	pollPads(dt);
	touchAssistCD = Math.max(0, touchAssistCD - dt);
	touchJumpBuffer = Math.max(0, touchJumpBuffer - dt);
	touchDashBuffer = Math.max(0, touchDashBuffer - dt);
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("toast").classList.add("hidden");
	}
	audio.tick(
		!paused && !net.ended && ["playing", "title"].includes(screenMode),
		game.phase,
	);
	const own = screenMode === "playing" ? localInput(0) : EMPTY_INPUT();
	networkTick(dt, own);
	if (!testFrozen) {
		if (
			screenMode === "title" &&
			!isNetworked() &&
			now - lastInteraction >= 10000
		) {
			startGame(2, true);
		}
		if (game.attract && now - attractStart > 95000) {
			startGame(2, true);
			game.startShift(2 + Math.floor(Math.random() * 3), false);
		}
		if (game.attract && ["won", "lost"].includes(game.status)) {
			startGame(2, true);
		}
		let run =
			(screenMode === "playing" || isNetworked()) &&
			!paused &&
			isAuthority() &&
			(!isNetworked() || net.started) &&
			!net.ended;
		if (run) {
			accumulator += dt * balance.timeScale;
			let steps = 0;
			const inputs = isNetworked()
				? onlineInputs(own)
				: Object.fromEntries(game.players.map((p) => [p.id, localInput(p.id)]));
			while (accumulator >= 1 / 60 && steps++ < 10) {
				game.step(1 / 60, inputs);
				accumulator -= 1 / 60;
			}
		} else accumulator = 0;
	}
	game.draw(dt);
	updateEffects(dt);
	shake = Math.max(0, shake - dt * 1.4);
	const sway = shake * preferences.shake;
	camera.position.x = (Math.random() - 0.5) * sway;
	camera.position.y = 12.5 + (Math.random() - 0.5) * sway;
	camera.lookAt(0, 7, 0);
	renderer.render(scene, camera);
}
window.FlipBros = {
	initialBackend: initialGraphicsBackend,
	title: "Flip Bros",
	backend: graphicsBackend,
	version: "1.0.0",
	state: () => game.snapshot(),
};
if (new URLSearchParams(location.search).has("test"))
	window.__test = {
		THREE,
		game,
		balance,
		audio,
		preferences,
		scene,
		renderer,
		camera,
		net,
		freeze: (v = true) => (testFrozen = v),
		start: (n = 1) => startGame(n),
		advance: (frames = 1, inputs = {}) => {
			for (let i = 0; i < frames; i++) game.step(1 / 60, inputs);
			game.draw(1 / 60);
			return game.snapshot();
		},
		attract: () => {
			lastInteraction = performance.now() - 10001;
		},
		input: localInput,
		ui: () => ({ screenMode, lastInput, menuFocus, paused }),
		showPause,
		showTitle,
		showDev,
		startRoom,
		hostRoom,
		joinRoom,
		AudioEngine,
	};
try {
	titlePreview();
	const hub = await setupHub();
	if (!hub) showTitle();
	await renderer.renderAsync(scene, camera);
	if (graphicsRecovery) await graphicsRecovery;
	$("loading").classList.add("hidden");
	renderer.setAnimationLoop(frame);
	document.body.dataset.ready = "true";
} catch (e) {
	$("load-msg").textContent = "A pipe burst during startup: " + e.message;
	if (AIHub.active) AIHub.fail(e.message);
	throw e;
}
