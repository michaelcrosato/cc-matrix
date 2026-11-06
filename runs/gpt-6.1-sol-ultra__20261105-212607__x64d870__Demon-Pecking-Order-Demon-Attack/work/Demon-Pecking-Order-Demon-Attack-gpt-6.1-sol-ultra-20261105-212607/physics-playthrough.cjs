const fs = require("node:fs"),
	RAPIER = require("@dimforge/rapier3d-compat"),
	THREE = require("three");
const elements = new Map();
const el = () => ({
	style: {},
	classList: { add() {}, remove() {}, toggle() {} },
	querySelectorAll() {
		return [];
	},
	firstChild: {},
	addEventListener() {},
	focus() {},
	scrollIntoView() {},
});
const document = {
	querySelector(q) {
		if (!elements.has(q)) elements.set(q, el());
		return elements.get(q);
	},
	querySelectorAll() {
		return [];
	},
};
const window = {},
	localStorage = {
		getItem() {
			return null;
		},
		setItem() {},
	};
class SynthAudio {
	setMusic() {}
	setSfx() {}
	setPaused() {}
	unlock() {}
	sfx() {}
	setIntensity() {}
}
class GameVisuals {
	resetEffects() {}
	remove(g) {}
	burst() {}
	createShip() {
		return new THREE.Group();
	}
	createEnemy() {
		return new THREE.Group();
	}
	createShot() {
		return new THREE.Group();
	}
	createBoss() {
		return new THREE.Group();
	}
}
(async () => {
	const warn = console.warn;
	console.warn = (...args) => {
		if (!String(args[0]).startsWith("using deprecated parameters"))
			warn(...args);
	};
	await RAPIER.init();
	console.warn = warn;
	let src = fs
		.readFileSync(__dirname + "/main.js", "utf8")
		.split("function pollGamepads")[0];
	const test = new Function(
		"RAPIER",
		"THREE",
		"SynthAudio",
		"GameVisuals",
		"document",
		"window",
		"localStorage",
		src +
			`;scene=new THREE.Scene();visuals=new GameVisuals();ready=true;link={connected:false,isHost:true,updateScore(){},finish(){}};return {start(){startRun(false);autoplay=god=true;},step(){simulation(1/60)},state(){return{screen,wave,runTime,stats,kills,entities:entities.length}}};`,
	)(RAPIER, THREE, SynthAudio, GameVisuals, document, window, localStorage);
	let frames = 0,
		passed = 0,
		totalCollisions = 0;
	try {
		for (let run = 0; run < Number(process.argv[2] || 20); run++) {
			test.start();
			for (let i = 0; i < 90000; i++, frames++) {
				test.step();
				if (test.state().screen === "result") break;
			}
			const state = test.state();
			if (
				state.screen !== "result" ||
				state.wave !== 6 ||
				state.stats.wavesCleared !== 6
			)
				throw Error("Incomplete patrol " + JSON.stringify(state));
			passed++;
			totalCollisions += state.stats.collisions;
		}
	} catch (e) {
		console.error(
			JSON.stringify({
				frames,
				...test.state(),
				error: String(e),
				stack: e.stack.split("\n").slice(0, 16),
			}),
		);
		process.exit(1);
	}
	console.log(
		`${passed} physics playthroughs passed; ${frames} simulation steps; ${totalCollisions} collision events`,
	);
})();
