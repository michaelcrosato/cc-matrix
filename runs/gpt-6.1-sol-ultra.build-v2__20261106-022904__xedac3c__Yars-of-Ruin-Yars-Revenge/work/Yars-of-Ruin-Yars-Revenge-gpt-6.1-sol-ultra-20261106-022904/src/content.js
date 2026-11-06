/* Authored encounter data. Coordinates are the overhead x/y plane; z is decorative. */
(() => {
	"use strict";
	const defaults = {
		scoutSpeed: 215,
		biteInterval: 0.15,
		chargeThreshold: 5,
		primaryInterval: 0.105,
		cannonSpeed: 840,
		cannonWindup: 0.28,
		pursuerSpeed: 51,
		pursuerTurn: 2.2,
		swirlSpeed: 258,
		swirlTelegraph: 1.2,
		refugeOutage: 3.4,
		reserveCount: 3,
	};
	const ranges = {
		scoutSpeed: {
			label: "Scout speed",
			min: 100,
			max: 360,
			step: 5,
			unit: "u/s",
		},
		biteInterval: {
			label: "Bite cadence",
			min: 0.06,
			max: 0.4,
			step: 0.01,
			unit: "s",
		},
		chargeThreshold: {
			label: "Bites to charge",
			min: 1,
			max: 12,
			step: 1,
			unit: "cells",
		},
		primaryInterval: {
			label: "Primary cadence",
			min: 0.045,
			max: 0.3,
			step: 0.005,
			unit: "s",
		},
		cannonSpeed: {
			label: "Siege speed",
			min: 350,
			max: 1300,
			step: 10,
			unit: "u/s",
		},
		cannonWindup: {
			label: "Siege warning",
			min: 0.15,
			max: 1.2,
			step: 0.01,
			unit: "s",
		},
		pursuerSpeed: {
			label: "Pursuer speed",
			min: 15,
			max: 130,
			step: 1,
			unit: "u/s",
		},
		pursuerTurn: {
			label: "Pursuer turning",
			min: 0.3,
			max: 5,
			step: 0.1,
			unit: "rad/s",
		},
		swirlSpeed: {
			label: "Swirl speed",
			min: 120,
			max: 450,
			step: 5,
			unit: "u/s",
		},
		swirlTelegraph: {
			label: "Swirl warning",
			min: 0.7,
			max: 3,
			step: 0.1,
			unit: "s",
		},
		refugeOutage: {
			label: "Refuge outage",
			min: 1,
			max: 7,
			step: 0.1,
			unit: "s",
		},
		reserveCount: {
			label: "Replacement scouts",
			min: 0,
			max: 8,
			step: 1,
			unit: "scouts",
		},
	};
	function arch() {
		const cells = [];
		for (let row = -7; row <= 7; row++) {
			for (let col = -8; col <= 3; col++) {
				const d = Math.hypot(col * 20, row * 20);
				if (d >= 100 && d <= 162 && col <= 1)
					cells.push({
						x: 810 + col * 20,
						y: 270 + row * 20,
						plate: 0,
						material: "normal",
					});
			}
		}
		return cells;
	}
	function plates() {
		const cells = [];
		for (let row = -7; row <= 7; row++) {
			for (let col = 0; col < 3; col++) {
				cells.push({
					x: 650 + col * 20,
					y: 270 + row * 20,
					plate: 0,
					material: col === 0 && (row + 7) % 4 === 0 ? "reflective" : "normal",
				});
				if (Math.abs(row) <= 5)
					cells.push({
						x: 745 + col * 20,
						y: 270 + row * 20,
						plate: 1,
						material:
							col === 2 && (row + 5) % 4 === 0 ? "reflective" : "normal",
					});
			}
		}
		return cells;
	}
	function carapace() {
		const cells = [];
		for (let row = -8; row <= 8; row++) {
			for (let col = -9; col <= 4; col++) {
				const d = Math.hypot(col * 20, row * 20);
				if (d >= 115 && d <= 188 && col <= 2)
					cells.push({
						x: 810 + col * 20,
						y: 270 + row * 20,
						plate: col < -5 ? 0 : 1,
						material: (row + 8) % 5 === 0 && col < -4 ? "reflective" : "normal",
					});
			}
		}
		return cells;
	}
	const sectors = [
		{
			id: "cinder-gate",
			name: "CINDER GATE",
			subtitle: "THE OUTER SHELL",
			introduction: "Our home is static. We still hear its wings.",
			clearLine: "The first voice falls silent. Beyond it: a second mouth.",
			palette: {
				bg: "#07141c",
				floor: "#102631",
				shadow: "#050d15",
				accent: "#50e1bd",
				shield: "#db704d",
				core: "#ff526f",
				light: "#8cf7d4",
				static: "#53a4b5",
			},
			musicRoot: 43,
			musicTempo: 88,
			silhouette: "arch",
			hp: 1,
			pursuers: 1,
			swirlDelay: 14,
			swirlPeriod: 18,
			refuge: { x: 355, w: 100 },
			plates: [{ id: 0, x: 0, y: 0, amplitude: 0, period: 9, phase: 0 }],
			cells: arch(),
			core: { x: 810, y: 270, hp: 1 },
			lessons: [
				"Move and fire to carve a path.",
				"Touch the shell: five bites fill your siege gun.",
				"Static hides you from pursuers. It silences both weapons.",
				"Align with the heart. Call the rail gun. Leave its lane.",
			],
		},
		{
			id: "glass-sepulcher",
			name: "GLASS SEPULCHER",
			subtitle: "THE MOVING DEFENSE",
			introduction:
				"It wears mirrors. Diamond cells return the cannon. Shoot them first.",
			clearLine: "Behind the glass, the hollow mind is awake.",
			palette: {
				bg: "#140e24",
				floor: "#271e39",
				shadow: "#0a0914",
				accent: "#e2b85b",
				shield: "#9873d1",
				core: "#ff7768",
				light: "#efd08a",
				static: "#a980d4",
			},
			musicRoot: 46,
			musicTempo: 98,
			silhouette: "plates",
			hp: 2,
			pursuers: 2,
			swirlDelay: 11,
			swirlPeriod: 15,
			refuge: { x: 355, w: 100 },
			plates: [
				{ id: 0, x: 0, y: 0, amplitude: 35, period: 10, phase: 0 },
				{ id: 1, x: 0, y: 0, amplitude: 42, period: 10, phase: Math.PI },
			],
			cells: plates(),
			core: { x: 845, y: 270, hp: 2 },
			lessons: [
				"Diamond cells return one siege shot. Watch the amber return lane.",
				"The plates move. A breach stays broken.",
				"Two heart strikes will silence this station.",
			],
		},
		{
			id: "null-regent",
			name: "THE NULL REGENT",
			subtitle: "THE FORTRESS INTELLIGENCE",
			introduction: "Little wings, says the mind. Nothing survives the signal.",
			clearLine: "Nothing? Listen.",
			palette: {
				bg: "#1b0c19",
				floor: "#321b2a",
				shadow: "#0c0810",
				accent: "#6bd9ed",
				shield: "#c95270",
				core: "#ffbe67",
				light: "#ffbe83",
				static: "#b96c98",
			},
			musicRoot: 39,
			musicTempo: 108,
			silhouette: "crown",
			hp: 3,
			pursuers: 2,
			swirlDelay: 10,
			swirlPeriod: 13,
			refuge: { x: 355, w: 100 },
			plates: [
				{ id: 0, x: 0, y: 0, amplitude: 17, period: 12, phase: 0 },
				{ id: 1, x: 0, y: 0, amplitude: 0, period: 12, phase: 0 },
			],
			cells: carapace(),
			core: { x: 810, y: 270, hp: 3 },
			lessons: [
				"The refuge will fracture. Its borders warn you first.",
				"Strip the shell. Catch the moving heart.",
				"The last strike must find it in flight.",
				"When it docks, touch the blue heart to refill. Then intercept.",
			],
		},
	];
	globalThis.RuinContent = {
		version: 1,
		defaults,
		ranges,
		sectors,
		scouts: [
			{ name: "RILL", color: "#65f4cb" },
			{ name: "VENN", color: "#ffd37f" },
		],
	};
})();
