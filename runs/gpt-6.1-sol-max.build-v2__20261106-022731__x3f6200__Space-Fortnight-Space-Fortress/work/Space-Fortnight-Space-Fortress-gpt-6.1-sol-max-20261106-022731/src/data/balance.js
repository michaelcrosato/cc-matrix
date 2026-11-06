(function (S) {
	"use strict";
	const W = 960,
		H = 540,
		DT = 1 / 120;
	const BOUNDS = { x0: 30, x1: 930, y0: 88, y1: 467 };
	const BALANCE_SPEC = [
		["thrust", "Thrust", 620, 200, 1100, 20, " u/s²"],
		["drag", "Flight drag", 3.7, 0.4, 7, 0.1, " /s"],
		["laserDamage", "Laser damage", 10, 2, 24, 1, " HP"],
		["laserCadence", "Laser interval", 0.17, 0.08, 0.5, 0.01, " s"],
		["boostRecharge", "Boost recovery", 13, 2, 40, 1, " /s"],
		["pulseCooldown", "Pulse recharge", 6, 1, 15, 0.5, " s"],
		["aggression", "Enemy pressure", 1, 0.25, 3, 0.05, " ×"],
		["gravity", "Gravity pull", 160, 20, 420, 10, " u/s²"],
		["heatHit", "Heat per impact", 9, 2, 24, 1, "%"],
		["cooling", "Radiator cooling", 2.3, 0.3, 6, 0.1, "%/s"],
		["baseDamage", "Ground impact", 6, 1, 18, 1, " HP"],
	];
	const DEFAULTS = Object.fromEntries(
		BALANCE_SPEC.map(([key, , value]) => [key, value]),
	);
	const ENEMIES = {
		hunter: {
			label: "Needle hunter",
			hp: 20,
			r: 13,
			score: 120,
			speed: 33,
			color: "#f89c83",
		},
		bomber: {
			label: "Coffin bomber",
			hp: 50,
			r: 23,
			score: 260,
			speed: 22,
			color: "#e9ac56",
		},
		scout: {
			label: "Anchor scout",
			hp: 30,
			r: 15,
			score: 180,
			speed: 30,
			color: "#c49aff",
		},
		anchor: {
			label: "Gravity anchor",
			hp: 34,
			r: 15,
			score: 300,
			speed: 0,
			color: "#bd9cff",
		},
		rammer: {
			label: "Anvil rammer",
			hp: 30,
			r: 15,
			score: 190,
			speed: 38,
			color: "#f87967",
		},
		tractor: {
			label: "Fork tractor",
			hp: 52,
			r: 22,
			score: 330,
			speed: 25,
			color: "#b5a1ef",
		},
		dive: {
			label: "Kite diver",
			hp: 20,
			r: 13,
			score: 140,
			speed: 48,
			color: "#f7c078",
		},
		relay: {
			label: "Siege relay",
			hp: 95,
			r: 21,
			score: 600,
			speed: 0,
			color: "#ef8b9c",
		},
	};
	const UPGRADES = [
		{
			id: "laser",
			title: "LANCE ARRAY",
			stat: "+30% laser damage",
			text: "A tighter beam. A shorter argument.",
			icon: "01",
		},
		{
			id: "boost",
			title: "DEEP RESERVE",
			stat: "+50 boost capacity",
			text: "More room to outrun a bad decision.",
			icon: "02",
		},
		{
			id: "pulse",
			title: "QUICK DISCHARGE",
			stat: "25% faster pulse",
			text: "Clear the lane. Catch your breath.",
			icon: "03",
		},
	];
	const RANKS = [
		[70000, "STAR MARSHAL"],
		[46000, "COMMODORE"],
		[28000, "WING COMMANDER"],
		[14000, "CAPTAIN"],
		[6000, "LIEUTENANT"],
		[0, "CADET"],
	];
	Object.assign(S, {
		W,
		H,
		DT,
		BOUNDS,
		BALANCE_SPEC,
		DEFAULTS,
		ENEMIES,
		UPGRADES,
		RANKS,
	});
})((globalThis.Fortnight = globalThis.Fortnight || {}));
