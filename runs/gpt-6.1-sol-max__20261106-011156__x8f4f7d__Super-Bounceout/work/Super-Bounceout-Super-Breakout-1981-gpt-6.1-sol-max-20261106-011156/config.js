const TITLE = "Super Bounceout";
const DEFAULTS = Object.freeze({
	ballSpeed: 9.2,
	paddleWidth: 3.6,
	paddleSpeed: 25,
	popWindow: 0.25,
	advanceSeconds: 10,
	timeScale: 1,
});
const STAGES = [
	{
		name: "First contact",
		mode: "CLASSIC",
		subtitle: "A wall of colour. One small ship.",
		detail:
			"Clear the field. Hit with the edge of your paddle to change the angle. The ceiling makes your paddle smaller.",
		target: 64,
		color: "#f4ba45",
	},
	{
		name: "Company in the walls",
		mode: "CAVITY",
		subtitle: "Those lights are trying to get out.",
		detail:
			"Break the marked seals to free two captive balls. Twin paddles move together. More balls means more points.",
		target: 56,
		color: "#b8a0ed",
	},
	{
		name: "Double or nothing",
		mode: "DOUBLE",
		subtitle: "Two signals. Twice the trouble.",
		detail:
			"Two balls, two stacked paddles. Keep either ball alive to save your serve. Every live ball multiplies the score.",
		target: 64,
		color: "#ef8462",
	},
	{
		name: "The closing frontier",
		mode: "PROGRESSIVE",
		subtitle: "The universe is moving in.",
		detail:
			"Clear 64 bricks as the walls advance. A wall reaching the danger line costs a serve. POP a path through!",
		target: 64,
		color: "#9fcebd",
	},
];
const ROW_COLORS = [
	"#b4a0e4",
	"#b4a0e4",
	"#ef7863",
	"#ef7863",
	"#f3b74b",
	"#f3b74b",
	"#94c9b7",
	"#94c9b7",
];
const INK = "#192c39";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const safeStore = {
	get(k, fallback) {
		try {
			return JSON.parse(localStorage.getItem("bounceout." + k)) ?? fallback;
		} catch {
			return fallback;
		}
	},
	set(k, v) {
		try {
			localStorage.setItem("bounceout." + k, JSON.stringify(v));
		} catch {}
	},
};
