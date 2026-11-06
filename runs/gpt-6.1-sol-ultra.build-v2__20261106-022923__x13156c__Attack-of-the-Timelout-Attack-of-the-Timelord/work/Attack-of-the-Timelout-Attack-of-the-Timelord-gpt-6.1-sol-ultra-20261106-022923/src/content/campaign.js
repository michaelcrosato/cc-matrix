// Original adaptation encounter data. Coordinates stay independent of viewport.
export const DEFAULT_TUNING = Object.freeze({
	playerSpeed: 340,
	fireInterval: 0.09,
	shotSpeed: 1120,
	missileSpeed: 118,
	mineTurnRate: 78,
	mineSpeed: 94,
	rollerSpeed: 116,
	hunterPrediction: 0.68,
	hunterSpeed: 205,
	enemyFireInterval: 2.5,
	brakeDuration: 1.6,
	slowdownFactor: 0.35,
	chargeGain: 16,
});
export const TUNING_SPEC = Object.freeze([
	{
		key: "playerSpeed",
		label: "Machine speed",
		unit: "units/s",
		min: 180,
		max: 650,
		step: 10,
	},
	{
		key: "fireInterval",
		label: "Rearm interval",
		unit: "s",
		min: 0.04,
		max: 0.5,
		step: 0.01,
	},
	{
		key: "missileSpeed",
		label: "Missile speed",
		unit: "units/s",
		min: 50,
		max: 260,
		step: 5,
	},
	{
		key: "mineTurnRate",
		label: "Mine steering",
		unit: "units/s²",
		min: 15,
		max: 180,
		step: 5,
	},
	{
		key: "rollerSpeed",
		label: "Ground sweep speed",
		unit: "units/s",
		min: 45,
		max: 240,
		step: 5,
	},
	{
		key: "hunterPrediction",
		label: "Hunter prediction",
		unit: "s ahead",
		min: 0.1,
		max: 1.5,
		step: 0.05,
	},
	{
		key: "enemyFireInterval",
		label: "Enemy launch interval",
		unit: "s",
		min: 1.1,
		max: 6,
		step: 0.1,
	},
	{
		key: "brakeDuration",
		label: "Brake duration",
		unit: "s",
		min: 0.6,
		max: 4,
		step: 0.1,
	},
	{
		key: "slowdownFactor",
		label: "Braked hostile speed",
		unit: "×",
		min: 0.15,
		max: 0.8,
		step: 0.05,
	},
	{
		key: "chargeGain",
		label: "Charge per intercept",
		unit: "%",
		min: 5,
		max: 40,
		step: 1,
	},
]);

export const PATHS = Object.freeze({
	curlLeft: [
		[-40, -322],
		[-240, -245],
		[-350, -140],
		[-165, -58],
		[35, -160],
		[-35, -210],
	],
	curlRight: [
		[40, -322],
		[240, -245],
		[350, -140],
		[165, -58],
		[-35, -160],
		[35, -210],
	],
	braidLeft: [
		[-85, -322],
		[320, -260],
		[280, -95],
		[-240, -75],
		[-300, -195],
		[-60, -205],
	],
	braidRight: [
		[85, -322],
		[-320, -260],
		[-280, -95],
		[240, -75],
		[300, -195],
		[60, -205],
	],
	loopLeft: [
		[-100, -322],
		[-340, -200],
		[-170, -75],
		[75, -125],
		[300, -200],
		[-80, -200],
	],
	loopRight: [
		[100, -322],
		[340, -200],
		[170, -75],
		[-75, -125],
		[-300, -200],
		[80, -200],
	],
});
const formation = (count, paths, rows = 3, spread = 700, stagger = 0.15) => ({
	count,
	paths,
	rows,
	spread,
	stagger,
	arrivalSpeed: 0.17,
	sway: 35,
});
export const WAVES = Object.freeze([
	{
		id: "first-minute",
		name: "A MINOR INCONVENIENCE",
		cue: "SLIDE • HOLD FIRE • SHOOT THE WHITE DARTS",
		nominal: 45,
		formation: formation(16, ["curlLeft", "curlRight"], 2, 650, 0.23),
		mix: ["missile"],
		interval: 1.05,
		firstLaunch: 3.8,
		warning: 0.65,
		line: "One tiny machine? I have socks older than your century.",
		clear: "You have scratched my punctuality.",
		emotion: "gloat",
	},
	{
		id: "red-letter",
		name: "RED LETTER DAY",
		cue: "RED ORBS CURVE TOWARD YOU. BAIT, THEN INTERCEPT.",
		nominal: 50,
		formation: formation(20, ["curlRight", "loopLeft"], 3, 680, 0.2),
		mix: ["mine", "missile", "missile", "mine"],
		interval: 0.98,
		firstLaunch: 2.8,
		warning: 0.75,
		line: "These little orbs adore you. Do not encourage them.",
		clear: "Stop charging that vulgar time brake!",
		emotion: "gloat",
	},
	{
		id: "ground-rules",
		name: "GROUND RULES",
		cue: "GREEN CROSSES LAND AND SWEEP. ESCAPE THE MARKED SEGMENT.",
		nominal: 60,
		formation: formation(22, ["loopLeft", "loopRight"], 3, 700, 0.18),
		mix: ["roller", "missile", "mine", "missile", "missile"],
		interval: 0.95,
		firstLaunch: 2.5,
		warning: 0.85,
		line: "I have brought a very unreasonable lawn mower.",
		clear: "That was a VERY expensive lawn mower.",
		emotion: "annoyed",
	},
	{
		id: "future-tense",
		name: "FUTURE TENSE",
		cue: "DIAMONDS MARK YOUR FUTURE. CHANGE DIRECTION AFTER THE TELL.",
		nominal: 60,
		formation: formation(24, ["braidLeft", "curlRight"], 3, 710, 0.19),
		mix: ["hunter", "missile", "mine", "roller", "missile"],
		interval: 0.96,
		firstLaunch: 2.4,
		warning: 1.05,
		line: "I know your next move. Approximately. In theory.",
		clear: "Your refusal to be predictable is rude.",
		emotion: "annoyed",
	},
	{
		id: "double-booked",
		name: "DOUBLE BOOKED",
		cue: "BRAIDED FLEETS • CHOOSE YOUR INTERCEPTIONS",
		nominal: 75,
		formation: formation(28, ["braidLeft", "braidRight"], 4, 720, 0.17),
		mix: ["mine", "missile", "hunter", "missile", "mine", "roller"],
		interval: 0.92,
		firstLaunch: 2.2,
		warning: 0.8,
		line: "I have scheduled your doom twice. For convenience.",
		clear: "Your persistence is becoming statistically impressive.",
		emotion: "praise",
	},
	{
		id: "rush-hour",
		name: "RUSH HOUR",
		cue: "WATCH THE LANDING MARKS. EVERY SWEEP LEAVES AN EXIT.",
		nominal: 75,
		formation: formation(30, ["loopRight", "braidLeft"], 4, 740, 0.17),
		mix: ["roller", "missile", "missile", "hunter", "mine", "missile"],
		interval: 0.9,
		firstLaunch: 2.2,
		warning: 0.9,
		line: "Mind the gap. It is the only polite thing here.",
		clear: "You are making my clocks sweat.",
		emotion: "annoyed",
	},
	{
		id: "borrowed-time",
		name: "BORROWED TIME",
		cue: "HOLD A LANE • BUILD CHARGE • BRAKE THE CROSSFIRE",
		nominal: 90,
		formation: formation(32, ["braidRight", "loopLeft"], 4, 730, 0.16),
		mix: ["hunter", "mine", "missile", "roller", "hunter", "missile", "mine"],
		interval: 0.88,
		firstLaunch: 2.1,
		warning: 0.9,
		line: "Your borrowed seconds are accruing interest!",
		clear: "Fine. That was almost magnificent.",
		emotion: "praise",
	},
	{
		id: "last-call",
		name: "LAST CALL FOR YESTERDAY",
		cue: "ALL WEAPONS ACTIVE. BREAK THROUGH TO THE RIFT.",
		nominal: 90,
		formation: formation(
			36,
			["braidLeft", "braidRight", "loopLeft", "loopRight"],
			4,
			740,
			0.16,
		),
		mix: ["missile", "hunter", "mine", "roller", "mine", "hunter", "missile"],
		interval: 0.84,
		firstLaunch: 2,
		warning: 0.95,
		line: "I shall handle this myself. After these final minions.",
		clear: "ENOUGH! Come and face the management.",
		emotion: "furious",
	},
]);
export const BOSS_PHASES = Object.freeze([
	{
		id: "mask",
		name: "THE FACE OF BAD TIMING",
		hp: 38,
		mix: ["missile", "mine", "missile", "mine"],
		interval: 0.82,
		cycle: 8,
		openAt: 2.1,
		openFor: 4.7,
		warning: 0.8,
		line: "BEHOLD! My extremely intimidating projection!",
		clear: "That was only the decorative face!",
		emotion: "gloat",
		xAmplitude: 220,
		xSpeed: 0.33,
	},
	{
		id: "machine",
		name: "THE UNREASONABLE MACHINE",
		hp: 44,
		mix: ["roller", "missile", "hunter", "mine", "missile"],
		interval: 0.86,
		cycle: 8.5,
		openAt: 2.2,
		openFor: 4.6,
		warning: 0.95,
		line: "My warranty specifically excludes laser damage!",
		clear: "You have invalidated EVERYTHING!",
		emotion: "furious",
		xAmplitude: 260,
		xSpeed: 0.38,
	},
	{
		id: "last-second",
		name: "THE LAST SECOND",
		hp: 50,
		mix: ["hunter", "missile", "mine", "roller", "hunter", "missile"],
		interval: 0.8,
		cycle: 7.5,
		openAt: 1.9,
		openFor: 3.9,
		warning: 0.95,
		line: "I AM TIMELESS! Stop checking the expiration date!",
		clear: "I demand a rematch. Next Tuesday. Approximately.",
		emotion: "furious",
		xAmplitude: 280,
		xSpeed: 0.42,
	},
]);
export const THREAT_VALUES = Object.freeze({
	missile: 2,
	mine: 4,
	roller: 8,
	hunter: 16,
});
export function validateCampaign() {
	const errors = [];
	if (WAVES.length !== 8 || BOSS_PHASES.length !== 3)
		errors.push("Campaign must have eight waves and three boss phases.");
	for (const [i, w] of WAVES.entries()) {
		if (!w.id || !w.name || !w.line || !w.clear || !w.cue)
			errors.push(`Wave ${i}: missing copy.`);
		if (w.formation.count < 1 || w.interval <= 0 || w.firstLaunch < 0)
			errors.push(`Wave ${i}: invalid timings/count.`);
		if (w.formation.paths.some((p) => !PATHS[p]))
			errors.push(`Wave ${i}: unknown path.`);
		if (w.mix.some((t) => !(t in THREAT_VALUES)))
			errors.push(`Wave ${i}: unknown threat.`);
	}
	for (const [key, points] of Object.entries(PATHS))
		if (
			points.length < 4 ||
			points.some((p) => p.length !== 2 || p.some((v) => !Number.isFinite(v)))
		)
			errors.push(`Invalid path ${key}.`);
	for (const spec of TUNING_SPEC)
		if (
			!(
				DEFAULT_TUNING[spec.key] >= spec.min &&
				DEFAULT_TUNING[spec.key] <= spec.max
			)
		)
			errors.push(`Invalid default ${spec.key}.`);
	for (const p of BOSS_PHASES)
		if (p.hp <= 0 || p.openAt < 0 || p.openAt + p.openFor > p.cycle)
			errors.push(`Invalid boss ${p.id}.`);
	return errors;
}
