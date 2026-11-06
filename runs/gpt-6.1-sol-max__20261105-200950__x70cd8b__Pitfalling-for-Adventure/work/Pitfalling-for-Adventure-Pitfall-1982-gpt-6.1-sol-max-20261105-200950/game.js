const DEFAULTS = {
	speed: 6.2,
	jump: 10.2,
	gravity: 25,
	hazard: 1,
	daylight: 480,
	timeScale: 1,
	music: 10,
	sfx: 65,
	glyphs: "ps",
	vineAssist: true,
	shake: true,
};
const settings = { ...DEFAULTS };
const dev = { god: false, fly: false, wire: false, reveal: false };
const SAVE_KEY = "pitfalling-expedition-v1";
let saved = null;
try {
	saved = JSON.parse(localStorage.getItem(SAVE_KEY));
	const opts = JSON.parse(localStorage.getItem(SAVE_KEY + "-options"));
	if (opts)
		for (const k of ["music", "sfx", "glyphs", "vineAssist", "shake"])
			if (k in opts) settings[k] = opts[k];
} catch {}
const input = {
	keys: new Set(),
	last: navigator.maxTouchPoints > 0 ? "touch" : "keyboard",
	jump: false,
	map: false,
	pause: false,
	up: false,
	down: false,
	touchX: 0,
	touchY: 0,
	touchId: null,
	touchStart: null,
	padsPrev: new Map(),
	lastActivity: performance.now(),
	navAt: 0,
	menuRepeat: 0,
};
const game = {
	mode: "loading",
	players: [],
	elapsed: 0,
	worldTime: 0,
	lives: 3,
	score: 2000,
	collected: [],
	coinIds: [],
	camp: 0,
	zone: 0,
	coop: false,
	won: false,
	toast: 0,
	banner: 0,
	saveAt: 0,
	attractTime: 0,
	manual: new URLSearchParams(location.search).has("test"),
	steps: 0,
	deaths: 0,
	metrics: { jumps: 0, swings: 0, climbs: 0, treasures: 0, damage: 0 },
	hudStamp: 0,
};
let hubInfo = null,
	hubStarted = false,
	hubEnded = false,
	hubReported = false,
	hubNetAt = 0;
const ghosts = new Map();
function saveOptions() {
	try {
		localStorage.setItem(SAVE_KEY + "-options", JSON.stringify(settings));
	} catch {}
	setAudioVolumes();
}
function createPlayer(id, color) {
	const avatar = createExplorer(color);
	const rb = physics.createRigidBody(
		RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
			4 + id,
			0.8,
			0,
		),
	);
	const collider = physics.createCollider(
		RAPIER.ColliderDesc.capsule(0.42, 0.3)
			.setFriction(0)
			.setCollisionGroups(0x00020001),
		rb,
	);
	return {
		id,
		avatar,
		rb,
		collider,
		x: 4 + id,
		y: 0.8,
		vx: 0,
		vy: 0,
		dir: 1,
		grounded: false,
		coyote: 0,
		jumpBuffer: 0,
		invuln: 0,
		grabCooldown: 0,
		vine: null,
		vineTime: 0,
		climbing: null,
		jumpHeld: false,
		jumpPrev: false,
		stepAt: 0,
		gateWarn: 0,
		seenCamps: new Set([0]),
	};
}
function positionPlayer(p, x, y, reset = true) {
	p.x = x;
	p.y = y;
	p.rb.setTranslation({ x, y, z: 0 }, false);
	p.rb.setNextKinematicTranslation({ x, y, z: 0 });
	if (reset) {
		p.vx = 0;
		p.vy = 0;
		p.vine = null;
		p.climbing = null;
		p.grounded = false;
		p.coyote = 0;
		p.jumpBuffer = 0;
	}
	p.avatar.root.position.set(x, y, 0);
}
function resetExpedition(coop = false, restore = null) {
	game.elapsed = restore?.elapsed ?? 0;
	game.worldTime = 0;
	game.lives = restore?.lives ?? 3;
	game.score = restore?.score ?? 2000;
	game.collected =
		restore?.collected?.filter((i) => Number.isInteger(i) && i >= 0 && i < 8) ??
		[];
	game.coinIds = restore?.coinIds ?? [];
	game.camp = clamp(restore?.camp ?? 0, 0, camps.length - 1);
	game.coop = coop;
	game.zone = 0;
	game.won = false;
	game.deaths = 0;
	game.metrics = { jumps: 0, swings: 0, climbs: 0, treasures: 0, damage: 0 };
	game.saveAt = 0;
	game.attractTime = 0;
	for (const t of treasures) t.collected = game.collected.includes(t.index);
	for (let i = 0; i < coins.length; i++)
		coins[i].taken = game.coinIds.includes(i);
	for (const p of game.players) {
		p.avatar.root.visible = p.id === 0 || coop;
		p.avatar.shadow.visible = p.id === 0 || coop;
		p.rb.setEnabled(p.id === 0 || coop);
		p.collider.setEnabled(p.id === 0 || coop);
		p.invuln = 0;
		p.seenCamps = new Set([game.camp]);
		const c = camps[game.camp];
		positionPlayer(p, c.x + p.id, c.y);
	}
	for (const l of logs) {
		l.rb.setTranslation({ x: (l.a + l.b) / 2, y: 0.55, z: 0 }, true);
		l.dir = -1;
	}
	game.players[0].x = camps[game.camp].x;
	game.metrics.treasures = game.collected.length;
}
function startGame(coop = false, restore = false) {
	if (AIHub.active) return;
	unlockAudio();
	closeModal();
	resetExpedition(coop, restore ? saved : null);
	game.mode = "play";
	$("title").classList.add("hidden");
	$("attract").classList.add("hidden");
	$("hud").classList.remove("hidden");
	updateTouch();
	moveCamera(game.players[0].x, 0.8, 0, true);
	toast(
		coop
			? "Two explorers. One glorious bad idea."
			: "Good boots. Deep breath. Into the jungle!",
		3.2,
	);
	if (coop)
		toast(
			"P1: A / D + Space   ·   P2: ← / → + Right Shift   ·   or two controllers",
			5,
		);
	updateHud(true);
}
function returnTitle() {
	if (AIHub.active) return;
	closeModal();
	game.mode = "title";
	$("title").classList.remove("hidden");
	$("hud").classList.add("hidden");
	$("attract").classList.add("hidden");
	$("toast").classList.add("hidden");
	$("banner").classList.add("hidden");
	$("touchJump").classList.add("hidden");
	$("touchRing").classList.add("hidden");
	input.lastActivity = performance.now();
	resetExpedition(false);
	positionPlayer(game.players[0], 36, 0.77);
	game.players[0].dir = -1;
	game.players[1].avatar.root.visible = false;
	game.players[1].avatar.shadow.visible = false;
	moveCamera(28, 0.8, 0, true);
	$("continueButton").classList.toggle("hidden", !saved);
	setMenuFocus(0);
}
function startAttract() {
	closeModal();
	resetExpedition(false);
	game.mode = "attract";
	game.attractTime = 0;
	$("title").classList.add("hidden");
	$("hud").classList.remove("hidden");
	$("attract").classList.remove("hidden");
	$("toast").classList.add("hidden");
	$("touchJump").classList.add("hidden");
}
function activity(type) {
	input.lastActivity = performance.now();
	if (input.last !== type) {
		input.last = type;
		updatePrompts();
		updateTouch();
	}
	if (game.mode === "attract") {
		returnTitle();
		return true;
	}
	return false;
}
function saveGame() {
	if (AIHub.active || game.mode !== "play" || game.won || dev.god || dev.fly)
		return;
	const data = {
		elapsed: game.elapsed,
		lives: game.lives,
		score: game.score,
		collected: game.collected,
		coinIds: game.coinIds,
		camp: game.camp,
	};
	try {
		localStorage.setItem(SAVE_KEY, JSON.stringify(data));
		saved = data;
	} catch {}
}
function jumpPlayer(p) {
	p.vy = settings.jump;
	p.grounded = false;
	p.coyote = 0;
	p.jumpBuffer = 0;
	game.metrics.jumps++;
	sound("jump");
	burst(p.x, p.y - 0.65, 0xb2b481, 5);
}
function releaseVine(p, control) {
	const v = p.vine;
	const dx = Math.cos(v.angle) * v.length * v.vel,
		dy = Math.sin(v.angle) * v.length * v.vel;
	p.vx = clamp(dx + (control.x || p.dir) * 1.8, -11, 11);
	p.vy = Math.max(3, dy + 3);
	p.vine = null;
	p.grabCooldown = 0.6;
	sound("jump");
}
function damage(p, reason) {
	if (p.invuln > 0 || dev.god || game.mode !== "play") return;
	game.metrics.damage++;
	game.deaths++;
	game.lives--;
	game.score = Math.max(0, game.score - 250);
	sound("hurt");
	burst(p.x, p.y, C.red, 26);
	if (settings.shake) camera.userData.shake = 0.22;
	if (game.lives <= 0) {
		endGame(false, reason);
		return;
	}
	const c = camps[game.camp];
	positionPlayer(p, c.x + p.id * 0.7, c.y);
	p.invuln = 2.3;
	toast(reason + " · Back to camp!", 2.5);
	saveGame();
}
function tryLadder(p, control) {
	if (p.climbing || p.vine) return;
	const near = ladders.find((l) => Math.abs(l.x - p.x) < 1.0);
	if (!near) return;
	const wantDown = control.y > 0.45 && p.y > -0.5,
		wantUp = control.y < -0.45 && p.y < -2;
	if (wantDown || wantUp) {
		p.climbing = { x: near.x, from: p.y, to: wantDown ? -4.23 : 0.78, t: 0 };
		p.vx = 0;
		p.vy = 0;
		p.grabCooldown = 1;
		game.metrics.climbs++;
		sound("ui");
	}
}
function collectNear(p) {
	for (const t of treasures) {
		if (t.collected || Math.abs(p.x - t.x) > 1.0 || Math.abs(p.y - t.y) > 1.5)
			continue;
		t.collected = true;
		game.collected.push(t.index);
		game.metrics.treasures++;
		game.score += 2000 + t.index * 250;
		burst(t.x, t.y, C.gold, 30);
		sound("treasure");
		toast("◇ " + t.name + "   ·   " + game.collected.length + " / 8", 3.3);
		saveGame();
	}
	coins.forEach((c, i) => {
		if (!c.taken && Math.abs(c.x - p.x) < 0.55 && Math.abs(c.y - p.y) < 1.15) {
			c.taken = true;
			game.coinIds.push(i);
			game.score += 100;
			burst(c.x, c.y, C.gold, 4);
			sound("coin");
		}
	});
}
function movePlayer(p, control, dt) {
	p.invuln = Math.max(0, p.invuln - dt);
	p.grabCooldown = Math.max(0, p.grabCooldown - dt);
	p.gateWarn = Math.max(0, p.gateWarn - dt);
	const jumpPressed = control.jump && !p.jumpPrev;
	p.jumpPrev = control.jump;
	const pos = p.rb.translation();
	p.x = pos.x;
	p.y = pos.y;
	if (control.x > 0.1) p.dir = 1;
	else if (control.x < -0.1) p.dir = -1;
	if (dev.fly) {
		p.vx = control.x * settings.speed * 1.8;
		p.vy = -control.y * settings.speed;
		positionPlayer(
			p,
			clamp(p.x + p.vx * dt, 1, 224),
			clamp(p.y + p.vy * dt, -4.2, 12),
			false,
		);
		return;
	}
	if (p.climbing) {
		const c = p.climbing;
		c.t += dt / 1.05;
		const f = clamp(c.t, 0, 1);
		p.x = c.x;
		p.y = lerp(c.from, c.to, f);
		p.rb.setNextKinematicTranslation({ x: p.x, y: p.y, z: 0 });
		if (f >= 1) {
			p.climbing = null;
			p.invuln = Math.max(p.invuln, 0.6);
			p.vy = 0;
			p.grounded = false;
		}
		return;
	}
	tryLadder(p, control);
	if (p.climbing) return;
	if (p.vine) {
		const v = p.vine;
		p.vineTime += dt;
		p.x = v.end.x;
		p.y = v.end.y - 0.68;
		p.rb.setNextKinematicTranslation({ x: p.x, y: p.y, z: 0 });
		const g = gaps.find((g) => v.x > g.a && v.x < g.b);
		const assist =
			settings.vineAssist && (input.last === "touch" || control.assist);
		if (
			(jumpPressed && p.vineTime > 0.16) ||
			(assist &&
				g &&
				p.dir * (p.x - (p.dir > 0 ? g.b : g.a)) > -0.15 &&
				p.dir * v.vel > 0)
		) {
			releaseVine(p, control);
		} else return;
	}
	if (jumpPressed) p.jumpBuffer = 0.13;
	else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
	if (p.grounded) p.coyote = 0.11;
	else p.coyote = Math.max(0, p.coyote - dt);
	if (
		input.last === "touch" &&
		settings.vineAssist &&
		Math.abs(control.x) > 0.2 &&
		p.grounded
	) {
		const ahead = p.x + Math.sign(control.x) * 1.1;
		const pit = gaps.find(
			(g) => ahead > g.a && ahead < g.b && (g.type !== "sand" || g.open),
		);
		const h = hazards.find(
			(h) => Math.abs(h.x - ahead) < 1.1 && Math.abs(p.y - h.y) < 1.4,
		);
		const log = logs.find(
			(l) => Math.abs(l.rb.translation().x - ahead) < 1.1 && p.y > 0,
		);
		if (pit || h || log) p.jumpBuffer = 0.1;
	}
	if (p.jumpBuffer > 0 && p.coyote > 0) jumpPlayer(p);
	if (!control.jump && p.jumpHeld && p.vy > 4) p.vy *= 0.55;
	p.jumpHeld = control.jump;
	const target = control.x * settings.speed;
	const accel = p.grounded ? 35 : 21;
	p.vx += clamp(target - p.vx, -accel * dt, accel * dt);
	p.vy = Math.max(-20, p.vy - settings.gravity * dt);
	const move = { x: p.vx * dt, y: p.vy * dt, z: 0 };
	controller.computeColliderMovement(
		p.collider,
		move,
		RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
		0x00020001,
	);
	const corrected = controller.computedMovement();
	p.rb.setNextKinematicTranslation({
		x: clamp(p.x + corrected.x, 1, 224),
		y: p.y + corrected.y,
		z: 0,
	});
	p.grounded = controller.computedGrounded();
	if (p.grounded && p.vy < 0) p.vy = 0;
	if (corrected.y < move.y - 0.01 && p.vy > 0) p.vy = 0;
	p.x = clamp(p.x + corrected.x, 1, 224);
	p.y += corrected.y;
	if (!p.grounded && p.grabCooldown <= 0 && p.y > 0 && p.y < 7) {
		for (const v of vines) {
			const dx = p.x - v.end.x,
				dy = p.y + 0.68 - v.end.y;
			if (dx * dx + dy * dy < 1.35 * 1.35) {
				p.vine = v;
				p.vineTime = 0;
				p.jumpBuffer = 0;
				game.metrics.swings++;
				sound("swing");
				break;
			}
		}
	}
	if (p.grounded && Math.abs(p.vx) > 2) {
		p.stepAt += dt;
		if (p.stepAt > 0.28) {
			p.stepAt = 0;
			sound("step");
			if (game.steps++ % 2 === 0) burst(p.x, p.y - 0.7, 0xb6b784, 2);
		}
	}
}
function checkPlayer(p) {
	collectNear(p);
	if (
		dev.god &&
		p.y < -1.4 &&
		!caveRanges.some(([a, b]) => p.x > a - 1 && p.x < b + 1)
	) {
		const gap = gaps.find((g) => p.x > g.a - 1 && p.x < g.b + 1);
		positionPlayer(
			p,
			gap ? (p.dir > 0 ? gap.b + 0.8 : gap.a - 0.8) : camps[game.camp].x,
			0.8,
		);
	}
	if (
		p.y < -1.4 &&
		!caveRanges.some(([a, b]) => p.x > a - 1 && p.x < b + 1) &&
		!p.climbing
	)
		damage(p, "That pit had other plans");
	if (p.y < -6) damage(p, "A rather long way down");
	if (p.invuln <= 0 && !p.vine && !p.climbing) {
		for (const h of hazards) {
			if (Math.abs(p.x - h.x) < h.radius && p.y > h.y - 0.3 && p.y < h.y + 1.25)
				damage(
					p,
					h.type === "cobra"
						? "Never argue with a cobra"
						: h.type === "fire"
							? "A little too toasty"
							: "A sting in the tale",
				);
		}
		for (const c of crocs)
			if (!c.closed && Math.abs(p.x - c.x) < 1.15 && p.y < 1.1 && p.y > -0.8)
				damage(p, "Mind the teeth");
		for (const l of logs) {
			const pos = l.rb.translation();
			if (Math.abs(p.x - pos.x) < 0.73 && Math.abs(p.y - pos.y) < 0.95)
				damage(p, "The log won that round");
		}
	}
	for (let i = 0; i < camps.length; i++) {
		if (
			Math.abs(p.x - camps[i].x) < 1.0 &&
			p.y > 0 &&
			p.y < 1.2 &&
			!p.seenCamps.has(i)
		) {
			p.seenCamps.add(i);
			if (i > game.camp) {
				game.camp = i;
				camps[i].flag.material = mat(C.gold);
				sound("camp");
				toast("Camp reached · Your trail is safe", 2.5);
				saveGame();
			}
		}
	}
	if (p.x > 216 && p.y > 0) {
		if (game.collected.length === 8) endGame(true);
		else if (p.gateWarn <= 0) {
			p.gateWarn = 6;
			toast("The Sun Gate needs all eight treasures. Check your field map.", 4);
		}
	}
}
function endGame(
	won,
	reason = "Daylight’s gone. The jungle keeps its secrets.",
) {
	if (game.mode === "result" || hubReported) return;
	game.won = won;
	if (won) {
		game.score +=
			Math.floor(Math.max(0, settings.daylight - game.elapsed) * 10) +
			game.lives * 1000;
		sound("win");
		for (let n = 0; n < 5; n++)
			burst(219 + rand(-3, 3), rand(2, 7), C.gold, 20);
		if (!AIHub.active) {
			saved = null;
			try {
				localStorage.removeItem(SAVE_KEY);
			} catch {}
		}
	}
	if (AIHub.active) {
		hubReported = true;
		if (won)
			AIHub.result({
				time: Math.max(0, AIHub.time()),
				stats: { Treasures: game.collected.length, "Trail score": game.score },
			});
		else
			AIHub.result({
				score: game.score,
				stats: { Treasures: game.collected.length },
			});
	}
	game.mode = "result";
	showResults(won, reason);
}
function tickAttract(dt) {
	game.attractTime += dt;
	let x = Math.min(219, 4 + game.attractTime * 4.2);
	const p = game.players[0];
	let y = 0.77;
	let anim = "run";
	for (const [a, b] of [
		[73, 109],
		[165, 179],
	]) {
		if (x > a && x < b) y = -4.23;
		if (x > a - 1 && x < a + 1) {
			y = lerp(0.77, -4.23, clamp((x - a + 1) / 2, 0, 1));
			anim = "climb";
		}
		if (x > b - 1 && x < b + 1) {
			y = lerp(-4.23, 0.77, clamp((x - b + 1) / 2, 0, 1));
			anim = "climb";
		}
	}
	for (const g of gaps)
		if (x > g.a - 2 && x < g.b + 2 && y > 0) {
			const f = (x - g.a + 2) / (g.b - g.a + 4);
			y = 0.77 + Math.sin(f * Math.PI) * 3.8;
			anim = g.type === "bridge" || g.type === "crocs" ? "jump" : "swing";
		}
	for (const h of hazards)
		if (Math.abs(x - h.x) < 2 && Math.abs(y - h.y) < 1.5) {
			y += Math.sin(((x - h.x + 2) / 4) * Math.PI) * 2.1;
			anim = "jump";
		}
	positionPlayer(p, x, y, false);
	p.vx = 4.2;
	p.dir = 1;
	animateExplorer(p.avatar, anim, 4.2, dt);
	collectAttract(p);
	moveCamera(x, y, dt);
	if (game.attractTime > 57) {
		game.attractTime = 0;
		for (const t of treasures) t.collected = false;
		game.collected = [];
	}
}
function collectAttract(p) {
	for (const t of treasures)
		if (!t.collected && Math.abs(p.x - t.x) < 1.1 && Math.abs(p.y - t.y) < 2) {
			t.collected = true;
			game.collected.push(t.index);
			burst(t.x, t.y, C.gold, 12);
		}
}
function sampleControl(p) {
	let x = 0,
		y = 0,
		jump = false;
	const k = input.keys;
	if (p.id === 0) {
		x = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
		y = (k.has("KeyS") ? 1 : 0) - (k.has("KeyW") ? 1 : 0);
		jump = k.has("Space");
		if (!game.coop) {
			x += (k.has("ArrowRight") ? 1 : 0) - (k.has("ArrowLeft") ? 1 : 0);
			y += (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
			jump =
				jump ||
				(k.has("ArrowUp") &&
					Math.abs(
						p.x - (ladders.find((l) => Math.abs(l.x - p.x) < 1)?.x ?? 999),
					) > 1);
		}
		x += input.touchX;
		y += input.touchY;
		jump = jump || input.jump;
	} else {
		x = (k.has("ArrowRight") ? 1 : 0) - (k.has("ArrowLeft") ? 1 : 0);
		y = (k.has("ArrowDown") ? 1 : 0) - (k.has("ArrowUp") ? 1 : 0);
		jump = k.has("ShiftRight") || k.has("Numpad0");
	}
	const pads = Array.from(navigator.getGamepads?.() ?? []).filter(Boolean);
	const pad = pads[p.id];
	if (pad) {
		const axis = pad.axes[0] ?? 0,
			vertical = pad.axes[1] ?? 0;
		if (Math.abs(axis) > 0.18) x += axis;
		if (Math.abs(vertical) > 0.35) y += vertical;
		if (pad.buttons[14]?.pressed) x--;
		if (pad.buttons[15]?.pressed) x++;
		if (pad.buttons[12]?.pressed) y--;
		if (pad.buttons[13]?.pressed) y++;
		jump = jump || !!pad.buttons[0]?.pressed;
	}
	return { x: clamp(x, -1, 1), y: clamp(y, -1, 1), jump };
}
function updatePlayerVisual(p, dt) {
	const pos = p.rb.translation();
	if (game.mode === "play") p.avatar.root.position.set(pos.x, pos.y, 0);
	p.avatar.model.rotation.y = lerp(
		p.avatar.model.rotation.y,
		p.dir * 0.75,
		Math.min(1, dt * 13),
	);
	p.avatar.root.visible = p.id === 0 || game.coop;
	p.avatar.shadow.visible = p.avatar.root.visible;
	p.avatar.shadow.position.set(p.x, p.y < -1 ? -4.975 : 0.035, 0.1);
	const height = Math.max(0, p.y - (p.y < -1 ? -4.23 : 0.77));
	p.avatar.shadow.scale.setScalar(Math.max(0.3, 1 - height * 0.12));
	if (p.invuln > 0) p.avatar.model.visible = Math.sin(p.invuln * 30) > -0.2;
	else p.avatar.model.visible = true;
	if (game.mode === "play")
		animateExplorer(
			p.avatar,
			p.climbing
				? "climb"
				: p.vine
					? "swing"
					: !p.grounded
						? "jump"
						: Math.abs(p.vx) > 0.3
							? "run"
							: "idle",
			p.vx,
			dt,
		);
}
function fixedTick(dt, controls = null) {
	if (hubEnded) return;
	const canPlay = game.mode === "play" && (!modalName || AIHub.active);
	if (
		game.mode === "title" ||
		game.mode === "loading" ||
		game.mode === "hubWaiting"
	) {
		game.worldTime += dt;
		updateScene(game.worldTime, dt, settings.hazard);
		physics.timestep = dt;
		physics.step();
		animateExplorer(game.players[0].avatar, "idle", 0, dt);
		return;
	}
	if (game.mode === "attract") {
		game.worldTime += dt;
		updateScene(game.worldTime, dt, settings.hazard);
		tickAttract(dt);
		physics.timestep = dt;
		physics.step();
		updateHud();
		return;
	}
	if (!canPlay) return;
	if (AIHub.active && AIHub.time() < 0) {
		$("banner").classList.remove("hidden");
		$("banner").textContent = Math.ceil(-AIHub.time() / 1000);
		return;
	}
	if (AIHub.active && game.banner === 0) $("banner").classList.add("hidden");
	game.elapsed += dt;
	game.worldTime += dt;
	updateScene(game.worldTime, dt, settings.hazard);
	const active = game.coop ? game.players : [game.players[0]];
	for (const p of active)
		movePlayer(p, controls?.[p.id] ?? sampleControl(p), dt);
	physics.timestep = dt;
	physics.step();
	for (const p of active) {
		const pos = p.rb.translation();
		p.x = pos.x;
		p.y = pos.y;
		checkPlayer(p);
		updatePlayerVisual(p, dt);
	}
	if (game.coop) {
		const [a, b] = active;
		if (Math.abs(a.x - b.x) > 22) {
			const behind = a.x < b.x ? a : b,
				ahead = behind === a ? b : a;
			positionPlayer(behind, ahead.x - ahead.dir * 2, ahead.y);
			behind.invuln = 1.5;
			toast("Stick together, explorers!", 2);
		}
	}
	const center = game.coop ? (active[0].x + active[1].x) / 2 : active[0].x;
	const cy = game.coop ? Math.min(active[0].y, active[1].y) : active[0].y;
	moveCamera(center, cy, dt);
	if (game.elapsed >= settings.daylight) endGame(false);
	game.saveAt += dt;
	if (game.saveAt > 2) {
		saveGame();
		game.saveAt = 0;
	}
	game.toast -= dt;
	if (game.toast <= 0) $("toast").classList.add("hidden");
	updateHud();
}
function sendHub() {
	if (
		!AIHub.active ||
		!hubInfo ||
		!hubStarted ||
		hubEnded ||
		game.mode === "hubWaiting"
	)
		return;
	const now = performance.now();
	if (now - hubNetAt < 100) return;
	hubNetAt = now;
	const p = game.players[0];
	AIHub.send(
		{
			x: +p.x.toFixed(3),
			y: +p.y.toFixed(3),
			dir: p.dir,
			anim: p.avatar.anim,
			score: game.score,
			n: game.collected.length,
		},
		{ reliable: false },
	);
	if (Math.floor(now / 1000) !== game.lastProgress) {
		game.lastProgress = Math.floor(now / 1000);
		AIHub.progress({
			score: game.score,
			label: game.collected.length + "/8 treasures",
		});
	}
}
function updateGhosts(dt) {
	for (const [id, g] of ghosts) {
		g.avatar.root.position.lerp(
			new THREE.Vector3(g.x, g.y, 0),
			Math.min(1, dt * 12),
		);
		g.avatar.model.rotation.y = g.dir * 0.75;
		const local = game.players[0];
		const visible =
			Math.abs(g.x - local.x) < 35 && Math.abs(g.y - local.y) < 4.5;
		g.avatar.root.visible = visible;
		g.avatar.shadow.visible = false;
		animateExplorer(g.avatar, g.anim ?? "run", 4, dt);
		const v = new THREE.Vector3(
			g.avatar.root.position.x,
			g.avatar.root.position.y + 1.5,
			0,
		).project(camera);
		g.tag.style.left = ((v.x + 1) * innerWidth) / 2 + "px";
		g.tag.style.top = ((-v.y + 1) * innerHeight) / 2 + "px";
		g.tag.style.display = visible ? "block" : "none";
	}
}
async function initHub() {
	if (!AIHub.active) return;
	game.mode = "hubWaiting";
	$("title").classList.add("hidden");
	$("hud").classList.remove("hidden");
	hubInfo = await AIHub.connect({ mode: "ghost", seats: [1, 4] });
	if (!hubInfo) {
		returnTitle();
		return;
	}
	for (const peer of hubInfo.players) {
		if (peer.id === hubInfo.me) continue;
		const avatar = createExplorer(new THREE.Color(peer.color).getHex(), true);
		avatar.root.visible = false;
		avatar.shadow.visible = false;
		const tag = document.createElement("span");
		tag.className = "name-tag";
		tag.textContent = peer.name;
		tag.style.color = peer.color;
		$("peerNames").append(tag);
		ghosts.set(peer.id, { avatar, tag, x: 4, y: 0.8, dir: 1, anim: "idle" });
	}
	AIHub.on("message", (data, from) => {
		if (
			hubEnded ||
			!data ||
			!Number.isFinite(data.x) ||
			!Number.isFinite(data.y)
		)
			return;
		const g = ghosts.get(from);
		if (g) {
			g.x = clamp(data.x, -10, 240);
			g.y = clamp(data.y, -10, 20);
			g.dir = data.dir === -1 ? -1 : 1;
			g.anim = ["idle", "run", "jump", "swing", "climb"].includes(data.anim)
				? data.anim
				: "idle";
		}
	});
	AIHub.on("start", () => {
		hubStarted = true;
		resetExpedition(false);
		game.mode = "play";
		moveCamera(4, 0.8, 0, true);
		updateHud(true);
	});
	AIHub.on("leave", ({ id }) => {
		const g = ghosts.get(id);
		if (g) {
			scene.remove(g.avatar.root, g.avatar.shadow);
			g.tag.remove();
			ghosts.delete(id);
		}
	});
	AIHub.on("time-up", () => {
		if (!hubReported) endGame(false, "The expedition clock has run out.");
	});
	AIHub.on("end", () => {
		hubEnded = true;
		game.mode = "hubEnded";
		input.keys.clear();
		closeModal();
		if (audio.ctx) audio.ctx.suspend();
		$("banner").textContent = "EXPEDITION COMPLETE";
		$("banner").classList.remove("hidden");
	});
	AIHub.ready();
}
