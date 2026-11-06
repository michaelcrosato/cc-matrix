/* Original procedural dungeon art, registered in the engine's native systems. */
export const COLORS = {
	ink: "#101720",
	stone: "#43505c",
	trim: "#77818a",
	bronze: "#bd8d4e",
	gold: "#edc16c",
	war: "#a6d57c",
	spirit: "#77c8ed",
	bone: "#dfd6b5",
	coal: "#20272c",
};
let registered = false;
export function installArt(E) {
	if (registered) return;
	registered = true;
	E.MATERIALS.dangerStone = {
		color: "#53606a",
		pattern: "stones",
		size: 7,
		over: [["cracks"]],
	};
	E.MATERIALS.dangerGold = { color: "#bd8d4e", pattern: "metal", rivet: 0 };
	E.MATERIALS.dangerRune = { color: "#81d3ec", pattern: "none", glow: 1 };
	E.SHAPES.dangerUrn = {
		about: "covered funerary urn on a stone plinth",
		tags: "dungeon urn",
		mats: { s: "dangerStone", b: "bronze" },
		parts: [
			["box", "s", [0, 0, 0], [12, 12, 3]],
			[
				"lathe",
				"b",
				[0, 0, 3],
				[
					[0, 0],
					[3.8, 0],
					[5, 5],
					[4, 9],
					[2.4, 12],
					[3, 13],
					[0, 13],
				],
				{ seg: 8 },
			],
			["cyl", "b", [0, 0, 16], 3.3, 1, { r2: 0, seg: 8 }],
		],
	};
	E.SHAPES.dangerCrate = {
		about: "iron bound supply coffer",
		tags: "container dungeon supplies",
		mats: { w: "walnut", m: "iron", g: "gold" },
		parts: [
			["box", "w", [0, 0, 0], [18, 12, 10]],
			["row", 2, [11, 0, 0], ["box", "m", [0, 0, 0], [1.5, 12.3, 10.5]]],
			["box", "g", [0, 6.2, 5], [3, 1, 3]],
		],
	};
	E.SHAPES.dangerPedestal = {
		about: "octagonal vault pedestal",
		tags: "dungeon treasure",
		mats: { s: "dangerStone", g: "dangerGold" },
		parts: [
			["cyl", "s", [0, 0, 0], 10, 3, { seg: 8 }],
			["cyl", "s", [0, 0, 3], 7, 8, { seg: 8 }],
			["cyl", "g", [0, 0, 11], 9, 1, { seg: 8 }],
		],
	};
	E.Humanoid.pose("dangerWatch", (J, w) => {
		for (const s of ["L", "R"]) {
			J.handL[0] += w * 0.15;
			J["elbow" + s][2] += w * 0.6;
		}
	});
	E.Humanoid.pose("dangerCharge", (J, w) => {
		J.handR[2] += w * 6;
		J.elbowR[2] += w * 5;
		J.head[0] -= w * 1.5;
		J.shC[0] -= w * 0.8;
	});
	E.Humanoid.pose("dangerCast", (J, w) => {
		J.handL[0] += w * 4;
		J.handL[2] += w * 5;
		J.handR[0] += w * 4;
		J.handR[2] += w * 5;
		J.elbowL[2] += w * 2;
		J.elbowR[2] += w * 2;
	});
	E.Humanoid.weapon("dangerAxe", {
		length: 15,
		rest: [0.4, 0.15, 0.9],
		blade: true,
		draw(w) {
			const p = w.at(15),
				h = w.at(0);
			w.push(0, () => {
				E.px.line(w.g, h[0], h[1], p[0], p[1], "#a77e47", 2);
				E.px.disc(w.g, p[0], p[1], 3 * w.u, "#b6b2a1");
			});
		},
	});
	E.Humanoid.hat("dangerHorns", (h) => {
		const a = h.at(0, -h.R, h.R * 0.4),
			b = h.at(0, h.R, h.R * 0.4);
		for (const [p, s] of [
			[a, -1],
			[b, 1],
		]) {
			E.px.line(h.g, p[0], p[1], p[0] + s * h.r, p[1] - h.r, "#e3c690", 2);
		}
	});
	const T = E.World3D.THINGS;
	T.dangerLantern = (p, t, time) => {
		p.box(0, 0, 0, 3, 3, 10, "#333c42")
			.box(0, 0, 3, 5, 5, 1, "#bd8d4e")
			.box(0, 0, 8, 5, 5, 1, "#bd8d4e");
		const f = 1 + Math.sin(time * 5 + t.x) * 0.08;
		p.glow(0, 0, 5.5, 1.8 * f, t.color || "#ffc478");
		for (const s of [-1, 1])
			p.tube(s * 2, s * 2, 3, s * 2, s * 2, 8, 0.25, "#bd8d4e");
		p.cone(0, 0, 9, 0, 0, 11, 3, "#333c42");
	};
	T.dangerEye = (p, t, time) => {
		const c = t.color || "#79d1ef";
		p.box(0, -0.4, 22, 23, 1.5, 20, "#24313a").box(
			0,
			0.5,
			22,
			21,
			0.3,
			18,
			"#52616b",
		);
		p.tube(-9, 1, 22, 0, 1.4, 28, 0.55, "#bd8d4e")
			.tube(0, 1.4, 28, 9, 1, 22, 0.55, "#bd8d4e")
			.tube(-9, 1, 22, 0, 1.4, 16, 0.55, "#bd8d4e")
			.tube(0, 1.4, 16, 9, 1, 22, 0.55, "#bd8d4e");
		p.ball(0, 1.7, 22, 4, 0.5, 4, c).ball(0, 2.15, 22, 0.7, 0.35, 3, "#0b171f");
		for (let i = 0; i < 3; i++) p.box((i - 1) * 5, 1, 11, 2, 0.5, 1, "#a7a88f");
		p.glow(0, 2, 22, 0.35 + Math.sin(time) * 0.07, "#d7eff3");
	};
	T.dangerDoor = (p, t) => {
		const o = t.open || 0;
		p.box(-14, 0, 23, 4, 7, 46, "#52616d")
			.box(14, 0, 23, 4, 7, 46, "#52616d")
			.box(0, 0, 45, 32, 7, 4, "#60717b");
		const z = o * 45;
		p.box(0, 0, 22 + z, 24, 3, 42, "#42382b").box(
			0,
			-1.8,
			22 + z,
			20,
			0.4,
			36,
			"#66543a",
		);
		for (const a of [-8, 0, 8]) p.box(a, -2.2, 22 + z, 0.8, 0.4, 39, "#ad8754");
		p.box(0, -2.5, 22 + z, 5, 1, 6, t.locked ? "#d8b266" : "#749783").ball(
			0,
			-3.2,
			22 + z,
			0.8,
			0.4,
			0.8,
			"#171b1f",
		);
	};
	T.dangerGate = (p, t, time) => {
		const c = t.color || "#80c7e7";
		p.box(-13, 0, 20, 4, 5, 40, "#343f49")
			.box(13, 0, 20, 4, 5, 40, "#343f49")
			.box(0, 0, 41, 30, 5, 4, "#74828b");
		for (const s of [-1, 1])
			for (let k = 0; k < 4; k++)
				p.box(s * 12.8, -2.7, 7 + k * 8, 1, 0.4, 2, c);
		p.box(0, 0, 1, 24, 8, 1, "#232e37");
		for (let i = 0; i < 14; i++) {
			const a = (i / 14) * Math.PI * 2,
				blink = 0.4 + Math.sin(time * 2 + i) * 0.15;
			p.glow(Math.cos(a) * 10, 0, 22 + Math.sin(a) * 16, blink, c);
		}
		p.tube(-9, 0, 5, 9, 0, 39, 0.12, c).tube(9, 0, 5, -9, 0, 39, 0.12, c);
	};
	T.dangerLadder = (p) => {
		p.box(0, 0, 0.15, 23, 25, 0.3, "#0c1117")
			.box(-13, 0, 12, 3, 5, 24, "#65717a")
			.box(13, 0, 12, 3, 5, 24, "#65717a")
			.box(0, 0, 25, 29, 5, 3, "#9c8b68");
		for (let k = 0; k < 6; k++)
			p.tube(-8, 1, 2 + k * 3.5, 8, 1, 2 + k * 3.5, 0.65, "#a3834c");
		p.tube(-9, 1, 0, -9, 1, 23, 0.8, "#79613f").tube(
			9,
			1,
			0,
			9,
			1,
			23,
			0.8,
			"#79613f",
		);
	};
	T.dangerCamp = (p, t, time) => {
		p.box(0, 0, 1, 20, 20, 2, "#4d5358");
		for (let i = 0; i < 7; i++) {
			const a = (i / 7) * Math.PI * 2;
			p.ball(Math.cos(a) * 7, Math.sin(a) * 7, 3, 2.3, 2.3, 1.5, "#6d736f");
		}
		p.tube(-4, -3, 2, 4, 3, 3, 1.2, "#54432d")
			.tube(4, -3, 2, -4, 3, 3, 1.2, "#54432d")
			.glow(0, 0, 5, 2.4 + Math.sin(time * 5) * 0.4, "#f7bf65");
	};
	T.dangerTreasure = (p, t, time) => {
		p.box(0, 0, 2, 24, 16, 4, "#3a4247")
			.box(0, 0, 5, 20, 13, 4, "#ad8443")
			.box(0, 0, 9, 19, 12, 6, "#d5ab57");
		for (const x of [-7, 7]) p.box(x, 0, 9, 1.7, 12.5, 8, "#e9c77e");
		p.box(0, 6.3, 9, 4, 1, 5, "#a16d36");
		if (t.open > 0) {
			p.box(0, -5, 15, 20, 3, 5, "#bf9b5b");
			for (let i = 0; i < 12; i++) {
				const a = i * 2.4;
				p.glow(
					Math.cos(a) * 7,
					Math.sin(a) * 4,
					13 + Math.sin(time + i) * 1.5,
					1.1,
					"#f4d68e",
				);
			}
		} else p.box(0, 0, 14, 19, 12, 4, "#c09750");
	};
	T.dangerLoot = (p, t, time) => {
		const k = t.itemKind || "potion",
			c = t.color || "#edc16c";
		if (/food|ration|supply|arrows|quiver/.test(k)) {
			p.ball(0, 0, 3, 5, 3.5, 3, "#b99868").tube(
				-4,
				0,
				5,
				4,
				0,
				5,
				0.5,
				"#e0ca98",
			);
			if (/arrow|quiver/.test(k))
				for (let i = -2; i <= 2; i++)
					p.tube(i, 0, 2, i, 0, 14, 0.25, "#d5be8c");
		} else if (/sword|blade|knife|axe/.test(k)) {
			p.tube(0, 0, 1, 0, 0, 13, 0.6, "#907044")
				.bar(0, 0, 5, 0, 0, 17, 2, 0.3, "#d0d4c3")
				.tube(-3, 0, 6, 3, 0, 6, 0.55, "#d4a453");
		} else if (/bow/.test(k)) {
			p.tube(-4, 0, 2, -6, 0, 9, 0.65, "#b79253")
				.tube(-6, 0, 9, -3, 0, 16, 0.65, "#b79253")
				.tube(-3, 0, 16, -4, 0, 2, 0.1, "#d9d0b4");
		} else if (/rune|wand|staff|ember/.test(k)) {
			p.tube(0, 0, 1, 0, 0, 13, 0.75, "#8a734c")
				.ball(0, 0, 15, 2, 2, 3, "#68bacd")
				.glow(0, 0, 15, 0.75, "#b6f1ef");
		} else if (/book|sight|training|folio|primer/.test(k)) {
			p.box(0, 0, 3, 10, 7, 5, /war/.test(k) ? "#719361" : "#447690")
				.box(0, -0.15, 3, 8, 7.2, 3, "#dccda5")
				.tube(-2, 0, 6, 2, 0, 6, 0.3, "#d1b575");
		} else if (/scroll/.test(k)) {
			p.box(0, 0, 3, 10, 5, 1, "#d6cba9");
			for (const s of [-1, 1]) p.tube(s * 5, -3, 3, s * 5, 3, 3, 1, "#c2af7d");
		} else if (/shield|armor|mail/.test(k)) {
			p.box(0, 0, 7, 8, 2, 11, "#718477").box(0, -1.1, 7, 2, 0.3, 8, "#cfb779");
		} else if (/ring|ward/.test(k)) {
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * 6.283,
					b = ((i + 1) / 8) * 6.283;
				p.tube(
					Math.cos(a) * 3,
					0,
					5 + Math.sin(a) * 3,
					Math.cos(b) * 3,
					0,
					5 + Math.sin(b) * 3,
					0.65,
					"#d8b95d",
				);
			}
			p.glow(0, 0, 8, 0.65, "#7bd5f2");
		} else if (/key/.test(k)) {
			p.ball(0, 0, 6, 2.5, 0.8, 2.5, "#d7b66b")
				.tube(0, 0, 6, 0, 0, 15, 0.7, "#d7b66b")
				.box(2, 0, 14, 4, 1, 2, "#d7b66b");
		} else {
			p.ball(0, 0, 4, 3, 3, 4, c)
				.tube(0, 0, 5, 0, 0, 10, 1, "#e0d7bd")
				.box(0, 0, 10, 3, 3, 1, "#9d7746");
		}
		p.glow(0, 0, 0.6, 0.6 + Math.sin(time * 2) * 0.15, c);
	};
}

export function appendCreature(
	p,
	actor,
	kind,
	time,
	attack = null,
	phase = 1,
	dead = 0,
) {
	const rig = actor.rig,
		zScale = rig?.o.size || 1;
	if (kind === "scorpion") {
		const charge = attack?.phase === "wind" ? attack.u : 0,
			strike = attack?.phase === "active" ? Math.sin(attack.u * Math.PI) : 0;
		p.at(
			actor.x,
			actor.y,
			actor.z - actor.sink,
			actor.facing - Math.PI / 2,
			1,
			0,
			dead * 0.7,
		);
		p.ball(0, 0, 5, 6.5, 9, 3, "#405b68").box(0, 0, 6, 5, 11, 1, "#709c9c");
		for (let i = 0; i < 3; i++) {
			const y = (i - 1) * 4,
				sw = Math.sin(time * 2 + i) * 0.4;
			for (const s of [-1, 1])
				p.tube(s * 4, y, 5, s * 9, y - 2, 4, 0.7, "#668285").tube(
					s * 9,
					y - 2,
					4,
					s * (12 + sw),
					y + 2,
					0.7,
					0.45,
					"#8ca0a0",
				);
		}
		for (const s of [-1, 1]) {
			p.tube(s * 4, 5, 4, s * 9, 10, 5, 1.1, "#476977")
				.ball(s * 9, 10, 5, 2.4, 3.4, 1.8, "#6f9c9e")
				.cone(s * 10, 11, 5, s * 8, 15, 5, 1.2, "#8cc1bc");
		}
		const points = [
			[0, -7, 4],
			[0, -11, 8],
			[0, -13 + charge * 2, 13],
			[0, -11 + charge * 3, 19],
			[0, -6 + charge * 2 + strike * 12, 23 - strike * 9],
		];
		for (let i = 0; i < points.length - 1; i++) {
			const a = points[i],
				b = points[i + 1];
			p.tube(...a, ...b, 1.8 - i * 0.27, "#597d86").ball(
				...b,
				1.7 - i * 0.25,
				1.7 - i * 0.25,
				1.7 - i * 0.25,
				"#7ba8ae",
			);
		}
		p.cone(
			...points[4],
			0,
			-2 + strike * 15,
			20 - strike * 12,
			1.7,
			"#b4ddc6",
		).glow(...points[4], 0.6, "#6cdcf3");
		for (const s of [-1, 1]) p.glow(s * 2, 8, 7, 0.5, "#b3edf6");
	} else if (kind === "skeleton") {
		if (!rig) return;
		const head = rig.worldOffset(rig.J.head),
			chest = rig.worldOffset(rig.J.shC);
		p.at(
			actor.x + head[0],
			actor.y + head[1],
			actor.z + head[2] - actor.sink,
			actor.facing - Math.PI / 2,
			1,
		);
		p.ball(0, 2.5, -1.4, 2.1, 1, 1.4, "#c6bfa4").box(
			0,
			3.3,
			-1.4,
			2.7,
			0.2,
			0.45,
			"#252a26",
		);
		for (const sd of [-1, 1])
			p.ball(sd * 1.25, 2.9, 0.55, 0.95, 0.5, 1.1, "#242d2a").glow(
				sd * 1.25,
				3.35,
				0.5,
				0.22,
				"#bbdfb4",
			);
		p.cone(0, 3.4, 0.3, 0, 3.5, -0.7, 0.45, "#33392f");
		for (let j = 0; j < 4; j++)
			p.box((j - 1.5) * 0.65, 3.5, -1.5, 0.35, 0.3, 0.8, "#e2d8b5");
		p.at(
			actor.x + chest[0],
			actor.y + chest[1],
			actor.z + chest[2] - actor.sink,
			actor.facing - Math.PI / 2,
			1,
		);
		for (let row = 0; row < 4; row++)
			for (const sd of [-1, 1])
				p.tube(
					0,
					1.1,
					-2 - row * 1.35,
					sd * (3.2 - row * 0.3),
					1.7,
					-1.7 - row * 1.35,
					0.38,
					"#d7cbaa",
				).tube(
					sd * (3.2 - row * 0.3),
					1.7,
					-1.7 - row * 1.35,
					sd * 3,
					0,
					-1 - row * 1.35,
					0.35,
					"#c5bea5",
				);
	} else if (/minotaur|warden|boss/.test(kind)) {
		if (!rig) return;
		const J = rig.J,
			head = J.head,
			h = rig.worldOffset(head),
			cx = actor.x + h[0],
			cy = actor.y + h[1],
			cz = actor.z + h[2] - actor.sink;
		p.at(cx, cy, cz, actor.facing - Math.PI / 2, zScale);
		p.ball(0, 0.4, 0, 4.4, 3.5, 3.8, "#76553e").ball(
			0,
			4.4,
			-1.6,
			2.8,
			2.1,
			1.6,
			"#624735",
		);
		for (const s of [-1, 1]) {
			p.tube(s * 3, 0, 1, s * 6, -1, 3, 1.5, "#c3a774")
				.tube(s * 6, -1, 3, s * 7.8, -0.3, 5.2, 1, "#d4be91")
				.cone(s * 7.8, -0.3, 5.2, s * 7.2, 1.7, 7.8, 0.8, "#e5d2a8");
			p.ball(s * 2, 3.1, 1.1, 1.1, 0.55, 0.85, "#262b23")
				.glow(s * 2, 3.65, 1.15, 0.35, phase === 2 ? "#78cbed" : "#e0ba65")
				.tube(s * 0.9, 3.5, 2, s * 3.1, 2.8, 2.7, 0.65, "#493a2d");
			p.ball(s * 1.1, 6.1, -1.1, 0.5, 0.3, 0.35, "#211e19").cone(
				s * 3,
				-0.4,
				-1,
				s * 4.1,
				0.4,
				-5.5,
				1.4,
				"#4c3a2c",
			);
		}
		p.tube(-1.7, 5.6, -2.2, 1.7, 5.6, -2.2, 0.24, "#201c18");
		const chest = rig.worldOffset(J.shC),
			hip = rig.worldOffset(J.hipC);
		p.at(
			actor.x + chest[0],
			actor.y + chest[1],
			actor.z + chest[2] - actor.sink,
			actor.facing - Math.PI / 2,
			1,
		)
			.box(0, 0, -4.8, 13, 7.5, 11, "#505853")
			.box(0, 4, -4.8, 1, 0.5, 10, "#ad915e")
			.tube(-5, 4, -0.5, 5, 4, -9, 0.6, "#a38c5e");
		for (const joint of ["shL", "shR"]) {
			const q = rig.worldOffset(J[joint]);
			p.at(
				actor.x + q[0],
				actor.y + q[1],
				actor.z + q[2] - actor.sink,
				actor.facing - Math.PI / 2,
				1,
			)
				.ball(0, 0, 0, 3.8, 3.5, 2.9, "#66716b")
				.cone(0, 0, 2, 0, 0, 4, 1.1, "#ae9b73");
		}
		for (const joint of ["footL", "footR"]) {
			const q = rig.worldOffset(J[joint]);
			p.at(
				actor.x + q[0],
				actor.y + q[1],
				actor.z + q[2] - actor.sink,
				actor.facing - Math.PI / 2,
				1,
			)
				.box(0, 1, 0.3, 4, 5.5, 2.5, "#2d3029")
				.box(0, 3.7, 0.5, 0.3, 0.5, 2.1, "#0d171a");
		}
		// Heavy axe attached to the native animated right hand and blade direction.
		const hand = rig.worldOffset(J.handR),
			bd = J.bladeDir,
			L = rig.o.bladeLen || 15;
		const tip = rig.worldOffset([
			J.handR[0] + bd[0] * L,
			J.handR[1] + bd[1] * L,
			J.handR[2] + bd[2] * L,
		]);
		p.at().tube(
			actor.x + hand[0],
			actor.y + hand[1],
			actor.z + hand[2] - actor.sink,
			actor.x + tip[0],
			actor.y + tip[1],
			actor.z + tip[2] - actor.sink,
			1,
			"#9a6e3f",
		);
		p.at(
			actor.x + tip[0],
			actor.y + tip[1],
			actor.z + tip[2] - actor.sink,
			actor.facing,
			1,
		)
			.box(0, 0, 0, 9, 2, 6, phase === 2 ? "#79aab6" : "#b5b6a6")
			.cone(-4, 0, 2, -7, 0, -2, 3, "#d0c9b0");
	} else if (kind === "sentinel") {
		if (!rig) return;
		const J = rig.J,
			h = rig.worldOffset(J.handL);
		p.at(
			actor.x + h[0],
			actor.y + h[1],
			actor.z + h[2] - actor.sink,
			actor.facing - Math.PI / 2,
			1,
		)
			.box(0, 1, 0, 10, 2, 14, "#465d60")
			.box(0, 2.2, 0, 1, 0.5, 11, "#c3ab74")
			.box(0, 2.2, 0, 8, 0.5, 1, "#c3ab74")
			.glow(0, 2.5, 0, 0.5, "#78d2d9");
	} else if (kind === "wraith") {
		if (!rig) return;
		const h = rig.worldOffset(rig.J.head);
		p.at(actor.x, actor.y, actor.z - actor.sink, actor.facing - Math.PI / 2, 1);
		const dissolve = dead > 0 ? 1 - dead : 1;
		p.cone(0, 0, 23, 0, 0, 2, 6.4 * dissolve, "#2f455c")
			.ball(0, 0, h[2], 4.8, 3.8, 5.5, "#384e65")
			.ball(0, 3, h[2], 2.7, 1.2, 3.4, "#101b25");
		for (const s of [-1, 1]) p.glow(s * 1.2, 4, h[2] + 0.2, 0.45, "#9ad9ef");
		for (let i = 0; i < 7; i++) {
			const a = (i / 7) * 6.283,
				r = 4 + Math.sin(time * 2 + i) * 1.2;
			p.cone(
				Math.cos(a) * r,
				Math.sin(a) * r,
				12,
				Math.cos(a) * r * 0.7,
				Math.sin(a) * r * 0.7,
				Math.max(0, 3 + Math.sin(time * 2 + i) * 2),
				1.8 * dissolve,
				"#405c74",
			);
		}
	} else if (kind === "brute") {
		if (!rig) return;
		const h = rig.worldOffset(rig.J.handR);
		p.at(
			actor.x + h[0],
			actor.y + h[1],
			actor.z + h[2] - actor.sink,
			actor.facing,
			1,
		).ball(0, 0, -4, 4.5, 4.5, 6, "#7c7760");
	}
}
