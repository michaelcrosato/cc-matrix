() => {
	const g = window.__game;
	g.start();
	g.setManual(true);
	g.setDev({ invulnerable: true });
	const log = [];
	const step = (n, x = 0, y = 0, jump = false) => g.advance(n, { x, y, jump });
	const at = () => g.state.player;
	const until = (name, condition, inp, max = 1200) => {
		let i = 0;
		for (; i < max && !condition(at()); i++) g.advance(1, inp);
		log.push({ name, frames: i, p: at(), stats: g.state.stats });
		if (i >= max) throw new Error(name + " timed out " + JSON.stringify(at()));
	};
	step(10);
	until("gap approach", (p) => p.x >= 10.7, { x: 1, y: 0, jump: false });
	step(61, 1, 0, true);
	step(10);
	log.push({ name: "first gap", p: at() });
	until("first ladder", (p) => p.x >= 23.2, { x: 1, y: 0, jump: false });
	until("first descent", (p) => p.y < -11.8 && p.mode === "walk", {
		x: 0,
		y: -1,
		jump: false,
	});
	until("gallery gap", (p) => p.x >= 31.1, { x: 1, y: 0, jump: false });
	step(60, 1, 0, true);
	step(12);
	log.push({ name: "second gap", p: at() });
	until("Mina", (p) => g.state.stats.found.mina, { x: 1, y: 0, jump: false });
	until("archive ladder", (p) => p.x >= 48, { x: 1, y: 0, jump: false });
	until("archive descent", (p) => p.y < -23.8 && p.mode === "walk", {
		x: 0,
		y: -1,
		jump: false,
	});
	until("water", (p) => p.mode === "swim", { x: 1, y: 0, jump: false });
	until("across archive", (p) => p.x >= 77.6, { x: 1, y: 0, jump: false });
	log.push({ name: "cat", p: at(), stats: g.state.stats });
	until("updraft ladder", (p) => p.x >= 79.2, { x: 1, y: 0, jump: false });
	until("updraft descent", (p) => p.y < -33.8 && p.mode === "walk", {
		x: 0,
		y: -1,
		jump: false,
	});
	until("balloon", (p) => p.mode === "float", { x: 1, y: 0, jump: true });
	until("balloon ascent", (p) => p.y >= -2, { x: 0, y: 1, jump: false }, 1200);
	until("balloon bank", (p) => p.x >= 93, { x: 1, y: 0, jump: false });
	step(1, 0, 0, true);
	step(90);
	log.push({ name: "balloon landing", p: at(), stats: g.state.stats });
	until("sunstone", (p) => g.state.stats.found.sunstone, {
		x: 1,
		y: 0,
		jump: false,
	});
	until("exit", (p) => g.state.stats.finished, { x: 1, y: 0, jump: false });
	return { log, state: g.state };
};
