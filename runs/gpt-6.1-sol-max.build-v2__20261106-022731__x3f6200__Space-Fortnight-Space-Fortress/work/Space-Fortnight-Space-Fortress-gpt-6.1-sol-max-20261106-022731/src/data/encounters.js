(function (S) {
	"use strict";
	// Every group has an authored entrance, recovery gap and explicit completion goal.
	const group = (at, kind, count, side = "top", pattern = "fan") => ({
		at,
		kind,
		count,
		side,
		pattern,
	});
	const WAVES = [
		{
			act: 0,
			title: "OPEN THE CORRIDOR",
			min: 60,
			deadline: 74,
			goal: 9,
			radio: "Viper wing, this is Fortress 13. Make them regret the journey.",
			lesson:
				"Thrust to move. Aim and hold fire. Your engines drift; your laser does not.",
			groups: [
				group(3, "hunter", 2),
				group(17, "hunter", 3, "left"),
				group(33, "hunter", 3, "right"),
				group(47, "hunter", 3),
			],
		},
		{
			act: 0,
			title: "CUT THE BOMB RUN",
			min: 62,
			deadline: 77,
			goal: 10,
			radio: "Bomb bays opening. Read the amber lanes. Do not be in them.",
			lesson:
				"Wide ships mark bomb lanes. Intercept them before release. Boost crosses danger.",
			groups: [
				group(2, "bomber", 1),
				group(15, "hunter", 3, "left"),
				group(28, "bomber", 2),
				group(44, "scout", 1, "right"),
				group(51, "hunter", 3),
			],
		},
		{
			act: 0,
			title: "BREAK THE ESCORT",
			min: 65,
			deadline: 80,
			goal: 11,
			radio: "Gravity anchors! Break their hearts and take the charge.",
			lesson:
				"Purple rings pull inward. Destroy anchors for charge. Pulse breaks nearby fire.",
			groups: [
				group(2, "scout", 2),
				group(5, "anchor", 1),
				group(16, "hunter", 4, "right"),
				group(30, "bomber", 2),
				group(44, "relay", 2),
				group(53, "hunter", 3, "left"),
			],
		},
		{
			act: 1,
			title: "KEEP THE RADIATORS CLEAR",
			min: 67,
			deadline: 80,
			goal: 12,
			radio:
				"Fortress at combat range. Those wedges mean to ram us. Cut them down.",
			lesson:
				"HEAT rises when the fortress is hit. Clear attackers; radiators cool after 3 quiet seconds.",
			groups: [
				group(3, "rammer", 2),
				group(16, "rammer", 3, "left"),
				group(31, "hunter", 3, "right"),
				group(44, "bomber", 2),
				group(54, "rammer", 4, "bottom"),
			],
		},
		{
			act: 1,
			title: "BREAK THE LOCK",
			min: 67,
			deadline: 81,
			goal: 12,
			radio:
				"Tractor forks acquiring. Shoot the emitter. Let the fortress breathe.",
			lesson:
				"A solid purple tether locks a radiator. Kill its tractor. Pulse breaks your own lock.",
			groups: [
				group(2, "tractor", 1),
				group(16, "rammer", 3, "left"),
				group(29, "tractor", 2, "right"),
				group(41, "scout", 1),
				group(48, "bomber", 2),
				group(56, "hunter", 3, "left"),
			],
		},
		{
			act: 1,
			title: "HOLD FOR EVACUATION",
			min: 69,
			deadline: 84,
			goal: 13,
			radio:
				"Transports away. Cut the two shield relays, then fall back to the surface.",
			lesson:
				"Destroy the red relay cores. Protect the fortress until the evacuation is complete.",
			groups: [
				group(2, "relay", 2),
				group(12, "rammer", 4, "left"),
				group(25, "tractor", 1, "right"),
				group(36, "bomber", 2),
				group(48, "scout", 2),
				group(58, "rammer", 3, "bottom"),
			],
		},
		{
			act: 2,
			title: "DOCK. LOCK. HOLD.",
			min: 45,
			deadline: 58,
			goal: 11,
			radio:
				"Vipers docked. You are the last guns on the ground. Make every shot count.",
			lesson:
				"SIDE VIEW. Move left and right on the rail. Aim upward. Stop the dives before touchdown.",
			groups: [
				group(3, "dive", 4),
				group(16, "dive", 5, "top", "vee"),
				group(30, "hunter", 2),
				group(38, "dive", 4),
			],
		},
		{
			act: 2,
			title: "NO GROUND TO GIVE",
			min: 48,
			deadline: 60,
			goal: 13,
			radio: "Same sky. Fewer places to hide. Clear a gap and hold it.",
			lesson:
				"Bomb lanes and gravity return. Your pulse clears a local pocket; it cannot save the whole base.",
			groups: [
				group(2, "bomber", 2),
				group(12, "dive", 5, "top", "vee"),
				group(23, "scout", 2),
				group(35, "dive", 5),
				group(42, "tractor", 1),
			],
		},
		{
			act: 2,
			title: "THE LONG SHADOW",
			min: 45,
			deadline: 59,
			goal: 12,
			radio:
				"The siege ship is descending. Strip the screen. Then aim for its guns.",
			lesson:
				"One last screen before the siege ship. The ground base must survive.",
			groups: [
				group(2, "dive", 5),
				group(12, "bomber", 2),
				group(24, "scout", 1),
				group(34, "dive", 5, "top", "vee"),
				group(40, "hunter", 2),
			],
		},
	];
	const REINFORCEMENTS = [
		[
			[9, "hunter", 2, "right"],
			[24, "hunter", 2, "top"],
			[40, "hunter", 3, "left"],
			[55, "hunter", 3, "top"],
		],
		[
			[8, "hunter", 2, "left"],
			[21, "hunter", 2, "right"],
			[36, "hunter", 2, "top"],
			[57, "hunter", 3, "left"],
		],
		[
			[10, "hunter", 2, "left"],
			[23, "hunter", 3, "top"],
			[37, "hunter", 2, "right"],
			[59, "hunter", 3, "left"],
		],
		[
			[9, "hunter", 2, "right"],
			[23, "rammer", 2, "right"],
			[38, "hunter", 3, "left"],
			[61, "rammer", 2, "top"],
		],
		[
			[9, "hunter", 2, "left"],
			[22, "rammer", 2, "top"],
			[36, "hunter", 3, "left"],
			[62, "rammer", 2, "right"],
		],
		[
			[7, "hunter", 2, "right"],
			[19, "hunter", 3, "left"],
			[31, "rammer", 2, "right"],
			[42, "hunter", 2, "top"],
			[64, "rammer", 2, "left"],
		],
		[
			[9, "dive", 3, "top"],
			[24, "dive", 3, "top"],
			[43, "dive", 3, "top"],
		],
		[
			[7, "hunter", 2, "top"],
			[18, "dive", 3, "top"],
			[29, "dive", 3, "top"],
			[46, "dive", 3, "top"],
		],
		[
			[7, "hunter", 2, "top"],
			[19, "dive", 3, "top"],
			[29, "dive", 3, "top"],
			[44, "dive", 3, "top"],
		],
	];
	WAVES.forEach((wave, i) => {
		wave.groups.push(...REINFORCEMENTS[i].map((g) => group(...g)));
		wave.groups.sort((a, b) => a.at - b.at);
	});
	for (const wave of WAVES) {
		wave.min += 3;
		wave.deadline += 3;
	}
	const ACTS = [
		{
			name: "OUTER PERIMETER",
			code: "I",
			objective: "BREAK THE ESCORT SCREEN",
			color: "#8ae5dc",
		},
		{
			name: "FORTRESS ORBIT",
			code: "II",
			objective: "HOLD THE EVACUATION LINE",
			color: "#eec580",
		},
		{
			name: "THE GROUND LINE",
			code: "III",
			objective: "DEFEND THE LAST BASE",
			color: "#f69a86",
		},
	];
	function validateWaves(waves = WAVES) {
		const errors = [];
		waves.forEach((w, i) => {
			if (!Number.isInteger(w.act) || w.act < 0 || w.act > 2)
				errors.push(`Wave ${i}: act`);
			if (!(w.min > 0 && w.deadline > w.min && w.goal > 0))
				errors.push(`Wave ${i}: progression`);
			let at = -1;
			for (const g of w.groups) {
				if (!S.ENEMIES[g.kind]) errors.push(`Wave ${i}: unknown ${g.kind}`);
				if (g.at < at || g.at >= w.min || g.count < 1 || g.count > 8)
					errors.push(`Wave ${i}: group timing/count`);
				if (!["top", "bottom", "left", "right"].includes(g.side))
					errors.push(`Wave ${i}: entry`);
				at = g.at;
			}
		});
		return errors;
	}
	Object.assign(S, { WAVES, ACTS, validateWaves });
})(globalThis.Fortnight);
