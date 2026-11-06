(() => {
	globalThis.NM = globalThis.NM || {};
	const N = globalThis.NM;
	N.TITLE = "Advanced Dungeons & Near Misses";
	N.VERSION = "near-misses-1";
	N.TILE = 16;
	N.DEFAULTS = Object.freeze({
		moveSpeed: 43,
		sprintMultiplier: 1.65,
		focusMultiplier: 0.45,
		dodgeCooldown: 0.9,
		arrowSpeed: 240,
		drawTime: 0.18,
		recoveryTime: 0.22,
		reflections: 3,
		capacity: 12,
		supplyMultiplier: 1,
		vision: 6.5,
		hearing: 1,
		noise: 1,
		enemySpeed: 1,
		damage: 1,
		guardianWindup: 1.35,
		guardianRecovery: 2.6,
		timeScale: 1,
	});
	N.TUNABLES = [
		["Movement", "moveSpeed", "Walking speed", 25, 80, 1],
		["Movement", "focusMultiplier", "Listening pace", 0.2, 0.8, 0.05],
		["Movement", "dodgeCooldown", "Quickstep cooldown", 0.4, 2, 0.1],
		["Arrows", "arrowSpeed", "Arrow speed", 120, 400, 10],
		["Arrows", "recoveryTime", "Bow recovery", 0.1, 0.6, 0.02],
		["Arrows", "reflections", "Maximum reflections", 1, 6, 1],
		["Supplies", "capacity", "Shared quiver capacity", 6, 24, 1],
		["Supplies", "supplyMultiplier", "Supply yield", 0.5, 2, 0.1],
		["Senses", "vision", "Ranger sight radius", 4, 10, 0.5],
		["Senses", "hearing", "Creature hearing", 0.3, 2, 0.1],
		["Senses", "noise", "Ranger noise", 0.3, 2, 0.1],
		["Threats", "enemySpeed", "Creature speed", 0.4, 2, 0.1],
		["Threats", "damage", "Incoming damage", 1, 3, 1],
		["Threats", "guardianWindup", "Guardian anticipation", 0.7, 2.5, 0.1],
		["Threats", "guardianRecovery", "Guardian recovery", 1.5, 5, 0.1],
		["Clock", "timeScale", "Simulation time", 0.1, 3, 0.1],
	];
	N.clone = (value) => JSON.parse(JSON.stringify(value));
	N.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
})();
