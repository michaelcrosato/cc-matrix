// Deterministic controller bot. Uses the shipped movement controller, Rapier,
// vine attachment/release, both ladders, all six pickups and the final gate.
// Invulnerability removes damage variance; it does not bypass collision or travel.
function scriptedExpedition() {
	resetRun();
	const a = __game,
		p = a.primary();
	a.dev.god = true;
	const priorMute = a.audio.muted;
	a.audio.muted = true;
	const log = [];
	let frames = 0,
		jumpHold = 0;
	const frame = (f) => {
		if (++frames > 22000)
			throw Error(
				"playthrough exceeded frame limit at " +
					JSON.stringify({ x: p.x, y: p.y, state: a.state }),
			);
		a.testInput = { 0: { x: 0, y: 0, jump: false, action: false, ...f } };
		a.step(1 / 60);
	};
	const dangerAhead = () => {
		if (p.layer)
			return a.world.scorpions.some((s) => s.x - p.x > 0 && s.x - p.x < 1.9);
		return (
			a.world.logs.some((s) => s.x - p.x > 0 && s.x - p.x < 2) ||
			a.world.snakes.some((s) => s.x - p.x > 0 && s.x - p.x < 1.9) ||
			a.world.fires.some((s) => !s.decor && s.x - p.x > 0 && s.x - p.x < 1.9)
		);
	};
	const groundWalk = (target) => {
		for (let i = 0; i < 1800 && Math.abs(p.x - target) > 0.22; i++) {
			if (p.grounded && dangerAhead() && jumpHold === 0) jumpHold = 24;
			frame({ x: Math.sign(target - p.x), jump: jumpHold > 0 });
			jumpHold = Math.max(0, jumpHold - 1);
		}
		if (Math.abs(p.x - target) > 0.5)
			throw Error(
				"walk blocked at " + JSON.stringify({ x: p.x, y: p.y, target }),
			);
	};

	const hopTo = (target) => {
		frame({});
		for (let i = 0; i < 100 && !p.grounded; i++)
			frame({ x: Math.max(-1, Math.min(1, (target - p.x) * 2)) });
		for (let i = 0; i < 100; i++) {
			if (p.swing !== null) {
				const dir = Math.sign(target - p.x) || 1;
				frame({ x: dir, jump: false });
				frame({ x: dir, jump: true });
			}
			frame({
				x: Math.max(-1, Math.min(1, (target - p.x) * 2.5)),
				jump: i < 22,
			});
			if (i > 24 && p.grounded && Math.abs(p.x - target) < 0.65) break;
		}
		if (Math.abs(p.x - target) > 0.8 || p.y < -0.7)
			throw Error("hop failed " + JSON.stringify({ target, x: p.x, y: p.y }));
	};
	const cross = (pit) => {
		groundWalk(pit.a - 2);
		if (pit.a === 101) {
			for (const target of [103, 106.5, 110, 114]) hopTo(target);
			log.push("ember stepping stones");
			return;
		}
		if (pit.a === 196) {
			for (const target of [198, 201, 204, 208]) hopTo(target);
			log.push("crocodile backs");
			return;
		}
		for (let i = 0; i < 120 && !p.grounded; i++) frame({});
		const v = a.world.vines.find(
			(v) => Math.abs(v.x - (pit.a + pit.b) / 2) < 0.1,
		);
		let ready = false;
		for (let i = 0; i < 700; i++) {
			const derivative = Math.cos(
				a.simTime * a.tuning.hazardSpeed * 0.82 + v.phase,
			);
			if (
				v.end.x < pit.a + 1.2 &&
				derivative > 0 &&
				p.grounded &&
				Math.abs(p.x - (pit.a - 2)) < 0.45
			) {
				ready = true;
				break;
			}
			if (p.grounded && dangerAhead() && jumpHold === 0) jumpHold = 24;
			frame({
				x: Math.max(-1, Math.min(1, (pit.a - 2 - p.x) * 3)),
				jump: jumpHold > 0,
			});
			jumpHold = Math.max(0, jumpHold - 1);
		}
		if (!ready) throw Error("vine never reached bank " + pit.a);
		jumpHold = 0;
		frame({});
		const launch = {
			x: p.x,
			y: p.y,
			t: a.simTime,
			ground: p.grounded,
			coyote: p.coyote,
			prev: p.jumpPrev,
			jumps: a.stats.jumps,
		};
		let maxY = p.y;
		for (let i = 0; i < 65 && p.swing === null; i++) {
			frame({ x: 1, jump: true });
			maxY = Math.max(maxY, p.y);
		}
		if (p.swing === null)
			throw Error(
				"missed vine " +
					JSON.stringify({
						pit: pit.a,
						x: p.x,
						y: p.y,
						end: v.end.toArray(),
						launch,
						maxY,
						jumps: a.stats.jumps,
						ground: p.grounded,
						coyote: p.coyote,
						vy: p.vy,
					}),
			);
		frame({ x: 1, jump: false });
		for (let i = 0; i < 600; i++) {
			if (v.end.x > pit.b - 1.7 && Math.cos(a.simTime * 0.82 + v.phase) > 0)
				break;
			frame({ x: 1 });
		}
		frame({ x: 1, jump: true });
		for (let i = 0; i < 100; i++) {
			frame({ x: 1, jump: i < 18 });
			if (p.x > pit.b + 0.7 && p.grounded) break;
		}
		if (p.x < pit.b || p.layer !== 0)
			throw Error(
				"crossing failed " + JSON.stringify({ pit: pit.a, x: p.x, y: p.y }),
			);
		log.push("vine " + pit.a + "–" + pit.b);
	};
	const travel = (target) => {
		const pits = a.world.vines.map((v) => ({
			a: v.x - (v.x === 62.5 ? 5.5 : v.x === 106.5 ? 5.5 : v.x === 152 ? 6 : 5),
			b: v.x + (v.x === 62.5 ? 5.5 : v.x === 106.5 ? 5.5 : v.x === 152 ? 6 : 5),
		}));
		if (!p.layer)
			for (const pit of pits)
				if (pit.a > p.x + 0.5 && pit.b < target) {
					groundWalk(pit.a - 3);
					cross(pit);
				}
		groundWalk(target);
	};
	const ladder = (down) => {
		frame({ action: true });
		for (let i = 0; i < 240; i++) {
			frame({});
			if (p.climb === null && p.layer === (down ? 1 : 0) && i > 30) break;
		}
		if (p.layer !== (down ? 1 : 0) || p.climb !== null)
			throw Error(
				"ladder failed " +
					JSON.stringify({ down, x: p.x, y: p.y, climb: p.climb }),
			);
		log.push(down ? "ladder down" : "ladder up");
	};
	travel(13);
	travel(38);
	travel(48);
	ladder(true);
	travel(65);
	travel(90);
	ladder(false);
	travel(120);
	travel(132);
	ladder(true);
	travel(149);
	travel(176);
	ladder(false);
	travel(219);
	for (let i = 0; i < 900 && a.state === "playing"; i++) {
		if (p.grounded && dangerAhead() && jumpHold === 0) jumpHold = 24;
		frame({ x: 1, jump: jumpHold > 0 });
		jumpHold = Math.max(0, jumpHold - 1);
	}
	a.audio.muted = priorMute;
	if (a.state !== "won" || !a.found.every(Boolean))
		throw Error(
			"full run did not finish " +
				JSON.stringify({ state: a.state, x: p.x, found: a.found }),
		);
	return {
		state: a.state,
		frames,
		seconds: a.simTime,
		score: a.score,
		stats: a.stats,
		log,
	};
}
void 0;
