// Designer-editable sortie data. Positions use metres on the X/Z snowfield.
export const DEFAULTS = {
	speed: 32,
	turn: 1.8,
	laserDamage: 1,
	enemyDamage: 1,
	pressure: 1,
	wraps: 2,
	timeScale: 1,
};
export const settingsDefault = {
	music: 0.1,
	sfx: 0.7,
	voice: 0.55,
	glyphs: "ps",
	camera: "chase",
	aimAssist: true,
	shake: true,
	sensitivity: 1,
};
export const MISSION = {
	walkers: [
		[-36, -42],
		[67, -114],
	],
	scouts: [
		[0, -45],
		[-73, -75],
		[76, -140],
	],
	repairs: [
		[-72, 53],
		[94, -8],
		[-91, -166],
		[48, -216],
	],
	escortRaiders: [
		[-65, 62],
		[75, -28],
		[-75, -130],
	],
	chapters: [
		{
			title: "THE COLD OPEN",
			objective: "CLEAR THE APPROACH",
			voice: "ROOK / FLIGHT LEAD",
			briefing:
				"Three scouts on the approach. Take them out before they find the refuge.",
		},
		{
			title: "BIG FEET. SMALL PROBLEM.",
			objective: "TANGLE THE TITANS",
			voice: "ROOK / FLIGHT LEAD",
			briefing:
				"The walkers are moving. Guns will barely scratch them. Get close and wrap their legs.",
		},
		{
			title: "THE LAST TRANSPORT",
			objective: "BRING THEM HOME",
			voice: "CONTROL / REFUGE",
			briefing:
				"Ark is lifting with thirty-eight aboard. Stay close and keep that corridor clear.",
		},
	],
};
