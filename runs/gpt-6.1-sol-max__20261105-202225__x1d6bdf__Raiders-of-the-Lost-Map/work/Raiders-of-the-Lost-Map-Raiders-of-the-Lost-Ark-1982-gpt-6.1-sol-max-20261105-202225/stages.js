function disposeLevel() {
	if (level) {
		level.traverse((o) => {
			if (o.geometry && !o.isSprite) o.geometry.dispose();
			if (o.isSprite && o.material.map) {
				o.material.map.dispose();
				o.material.dispose();
			}
		});
		scene.remove(level);
	}
	if (playerRoot) {
		playerRoot.traverse((o) => {
			if (o.geometry) o.geometry.dispose();
		});
		scene.remove(playerRoot);
	}
	if (world) world.free();
}
function landscape(theme) {
	const dark = ["temple", "atlas", "well"].includes(theme);
	scene.background = new THREE.Color(dark ? 0x183d3c : 0xd4bd8e);
	scene.fog = new THREE.Fog(dark ? 0x183d3c : 0xd4bd8e, 75, 150);
	scene.getObjectByName("sunlight").intensity = dark ? 1.8 : 2.7;
	scene.getObjectByName("ambient").intensity = dark ? 1.25 : 1.4;
	const sea = mesh(
		new THREE.PlaneGeometry(400, 400),
		dark ? "deep" : "sand",
		0,
		-19,
		0,
	);
	sea.rotation.x = -PI / 2;
	sea.receiveShadow = false;
	worldRng = rngSeed(1936 + S.stage * 91);
	for (let i = 0; i < 24; i++) {
		const a = (i / 24) * TAU,
			r = 35 + worldRng() * 55,
			x = Math.cos(a) * r,
			z = Math.sin(a) * r,
			h = 7 + worldRng() * 17;
		const m = cylinder(
			x,
			-18 + h / 2,
			z,
			5 + worldRng() * 7,
			h,
			i % 2 ? "rock" : "rockDark",
			level,
			5 + Math.floor(worldRng() * 4),
			3 + worldRng() * 4,
		);
		m.rotation.y = worldRng() * 2;
	}
	if (!dark) {
		const sun = mesh(
			new THREE.SphereGeometry(8, 32, 24),
			new THREE.MeshBasicMaterial({ color: 0xf8d283 }),
			-35,
			22,
			-65,
		);
		sun.castShadow = false;
		for (let i = 0; i < 11; i++) {
			const cloud = box(
				-55 + i * 11,
				17 + worldRng() * 10,
				-55 - worldRng() * 30,
				8 + worldRng() * 12,
				0.2,
				1.1,
				"cream",
				level,
				false,
			);
			cloud.material = new THREE.MeshBasicMaterial({
				color: 0xf7dca9,
				transparent: true,
				opacity: 0.25,
			});
		}
	}
	const dust = new THREE.BufferGeometry(),
		pts = [];
	for (let i = 0; i < 180; i++)
		pts.push((worldRng() - 0.5) * 65, worldRng() * 16, (worldRng() - 0.5) * 55);
	dust.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
	const particles = new THREE.Points(
		dust,
		new THREE.PointsMaterial({
			color: dark ? 0xeba944 : 0xffedbd,
			size: 0.06,
			transparent: true,
			opacity: 0.5,
		}),
	);
	level.add(particles);
	S.dynamic.push({ kind: "dust", mesh: particles });
}
function floorDecor(w = 36, d = 25, key = "rockDark") {
	for (let i = 0; i < 75; i++) {
		const x = (worldRng() - 0.5) * w,
			z = (worldRng() - 0.5) * d,
			r = 0.06 + worldRng() * 0.2;
		const m = mesh(
			new THREE.CircleGeometry(r, 3),
			i % 4 ? "sandLight" : key,
			x,
			0.012,
			z,
		);
		m.rotation.x = -PI / 2;
		m.rotation.z = worldRng() * TAU;
	}
	for (let j = 0; j < 18; j++) {
		const x = (worldRng() - 0.5) * w,
			z = (worldRng() - 0.5) * d;
		line(
			[
				[x, 0.025, z],
				[x + 0.7, 0.025, z + 0.2],
				[x + 1.1, 0.025, z + 0.12],
			],
			0xb18e5e,
		);
	}
}
function boundRoom(w = 38, d = 27) {
	fixedBox(-w / 2 - 0.3, 1.5, 0, 0.6, 3, d + 1, "sand", false);
	fixedBox(w / 2 + 0.3, 1.5, 0, 0.6, 3, d + 1, "sand", false);
	fixedBox(0, 1.5, -d / 2 - 0.3, w + 1, 3, 0.6, "sand", false);
	fixedBox(0, 1.5, d / 2 + 0.3, w + 1, 3, 0.6, "sand", false);
}
function expeditionBanner(text = "✥", x = 0, z = 0) {
	const m = cloth(x, 3.6, z, 1.5, 2.6, "red");
	m.rotation.x = 0;
	m.rotation.z = 0.04;
	box(x - 0.9, 2, z, 0.08, 4, 0.08, "brown");
	box(x + 0.9, 2, z, 0.08, 4, 0.08, "brown");
	sign(text, x, 3.7, z + 0.06, 0.8);
}
function npc(x, z, color = "teal", name = "NADIA") {
	const v = makeExplorer(palette[color] || color);
	v.mesh.position.set(x, 0, z);
	level.add(v.mesh);
	v.mesh.rotation.y = -0.5;
	S.dynamic.push({ kind: "npc", visual: v, mesh: v.mesh });
	sign(name, x, 3.2, z, 0.8, "#f2d89f");
	return v;
}
function buildBazaar() {
	ground(0, 0, 40, 29, "sand");
	floorDecor(39, 28);
	boundRoom(40, 29);
	building(-13, -10, 9, 6, 6);
	building(12, -10, 10, 7, 6);
	doorway(0, -11, "TEMPLE OF THE COILED SUN");
	for (let side of [-1, 1]) {
		for (let i = 0; i < 3; i++) {
			const x = side * 15,
				z = -2 + i * 5;
			fixedBox(x, 1, z, 4, 2, 2.3, "sand");
			cloth(x, 3.2, z + 0.7, 5, 3.8, i % 2 ? "red" : "teal");
			for (let xx of [-2.1, 2.1])
				box(x + xx, 1.6, z + 2, 0.09, 3.2, 0.09, "brown");
			for (let j = 0; j < 3; j++)
				pot(x - 1 + j, z + 1.3, 0.45, i % 2 ? "gold" : "rock");
		}
	}
	palm(-17, 10, 0.95);
	palm(17, 9, 1.2);
	palm(-5, -9, 0.9);
	// A hand-woven route through the market.
	for (let z = 4; z > -8; z -= 3.2) {
		box(0, 0.025, z, 3, 0.04, 2.8, "teal", level, false);
		for (let x of [-1.2, 1.2])
			box(x, 0.05, z, 0.05, 0.02, 2.6, "gold", level, false);
		const diamond = mesh(new THREE.PlaneGeometry(0.7, 0.7), "gold", 0, 0.06, z);
		diamond.rotation.set(-PI / 2, 0, PI / 4);
	}
	const merchant = npc(9, 1, "teal", "NADIA / OUTFITTER");
	cloth(9, 0.04, 3.2, 6.7, 3.6, "red");
	pot(11, 1, 0.8);
	pot(7, 1, 0.6);
	crate(12, 4);
	const shop = addInteract(
		9,
		2.7,
		() => (S.flags.flute ? "Talk to Nadia" : "Trade 3 coins · field kit"),
		(p) => {
			if (S.flags.flute) {
				say("NADIA", "The sun reads the map. You merely carry the hat.");
				return;
			}
			if (S.coins < 3) {
				say(
					"NADIA",
					"Three coins. The snake flute and a shovel. Dignity costs extra.",
				);
				audio.fx("click");
				return;
			}
			S.coins -= 3;
			S.flags.flute = true;
			S.flags.shovel = true;
			audio.fx("chime");
			say(
				"NADIA",
				"A flute for the snakes. A shovel for everything the snakes are sitting on.",
			);
			toast("FIELD KIT ACQUIRED · Flute + shovel");
			saveCheckpoint();
		},
		{ radius: 3.5 },
	);
	shop.marker.position.y = 3.7;
	addInteract(
		0,
		-9.6,
		"Enter the temple",
		() => {
			if (!S.flags.flute) {
				say(
					"FIELD NOTE",
					"The doorway is crawling. Nadia sells a flute that might help.",
				);
				return;
			}
			advanceStage(1);
		},
		{ radius: 2.7 },
	);
	npc(-7, 7, "gold", "THE CARTOGRAPHER");
	addInteract(
		-7,
		7.8,
		"Ask about the lost map",
		() => {
			say(
				"THE CARTOGRAPHER",
				"I sold the map to a man who sold it to a man who lost it. Try the Sun Atlas.",
			);
			S.flags.cartographer = true;
		},
		{ hideMarker: true },
	);
	[
		[-11, 2],
		[-7, -3],
		[-4, 6],
		[4, 7],
		[7, -5],
		[14, 7],
		[-15, -5],
	].forEach((p, i) => coin(...p));
	crate(-8, 1, 1, true);
	crate(3, 5, 1, true);
	crate(4, -6, 0.9, true);
	crate(-13, 7, 0.8, true);
	spawnEnemy("thief", -5, -2);
	spawnEnemy("thief", 4, 2);
	spawnEnemy("snake", -1, -6);
	sign("S A F F R O N   B A Z A A R", 0, 8.3, -12, 1.8, "#8e4e35");
	brazier(-3, -10);
	brazier(3, -10);
}
function sealPlinth(x, z, index, symbol) {
	cylinder(x, 0.22, z, 1.15, 0.44, "rockDark", level, 12);
	cylinder(x, 0.46, z, 0.93, 0.1, "gold", level, 12);
	const emblem = sign(symbol, x, 0.9, z, 1.2, "#edc66c");
	ring(x, z, 1.55, "gold");
	const obj = addInteract(
		x,
		z,
		"Press the " + ["COIL", "SUN", "WING"][index] + " seal",
		(p) => {
			if (S.flags.templeSolved) {
				toast("The three seals are already awake.");
				return;
			}
			if (S.seals.length === index) {
				S.seals.push(index);
				audio.fx("chime");
				emblem.material.color.set("#fff4bf");
				toast(
					["THE COIL WAKES", "THE SUN ANSWERS", "THE WING OPENS THE WAY"][
						index
					],
				);
			} else {
				S.seals = [];
				audio.fx("hurt");
				say(
					"FIELD NOTE",
					"Coil, then sun, then wing. Whoever built this was very particular.",
				);
				spawnEnemy("snake", x + 2, z);
			}
			if (S.seals.length === 3) {
				S.flags.templeSolved = true;
				S.revision++;
				say(
					"EXPLORER",
					"A door that opens without an explosion. How civilized.",
				);
				saveCheckpoint();
			}
		},
		{ can: () => !S.flags.templeSolved },
	);
	S.dynamic.push({ kind: "seal", mesh: emblem, index });
}
function buildTemple() {
	ground(0, 0, 38, 28, "sand");
	floorDecor();
	boundRoom(38, 28);
	for (let x of [-15, -7, 7, 15]) for (let z of [-9, 4]) pillar(x, z, 6.4);
	for (let x of [-18, 18])
		for (let z = -10; z < 13; z += 4) box(x, 1.6, z, 1, 3.2, 3.5, "rockDark");
	box(0, 0.025, 0, 4, 0.05, 22, "rockDark", level, false);
	for (let z = -10; z < 10; z += 1.3)
		box(0, 0.06, z, 3.7, 0.05, 0.9, "sandLight", level, false);
	box(0, 4, -13, 36, 8, 1.2, "rock");
	box(0, 6.6, -12.35, 15, 1.8, 0.2, "deep");
	sign("COIL   →   SUN   →   WING", 0, 6.6, -12.1, 1.65, "#f5d388");
	doorway(0, -11.8, "THE SUN ATLAS");
	sealPlinth(-10, -1, 0, "∿");
	sealPlinth(0, -5, 1, "☀");
	sealPlinth(10, -1, 2, "⌁");
	const staff = addInteract(
		0,
		-8,
		"Take the sun staff",
		() => {
			S.flags.staff = true;
			audio.fx("chime");
			toast("SUN STAFF RECOVERED");
			say("EXPLORER", "The world’s most elaborate reading lamp.");
			saveCheckpoint();
		},
		{ can: () => S.flags.templeSolved && !S.flags.staff },
	);
	const staffmesh = new THREE.Group();
	level.add(staffmesh);
	staffmesh.position.set(0, 1, -8);
	cylinder(0, 0.8, 0, 0.08, 1.7, "gold", staffmesh, 8);
	torus(0, 1.85, 0, 0.36, 0.08, "gold", staffmesh);
	ball(0, 1.85, 0, 0.2, "blue", staffmesh);
	S.dynamic.push({ kind: "staff", mesh: staffmesh });
	chest(11, 8, "Open the expedition satchel", () => {
		if (S.flags.chute) {
			toast("Your parachute is packed. More or less.");
			return;
		}
		S.flags.chute = true;
		audio.fx("chime");
		toast("PARACHUTE FOUND · Canvas has never looked so reassuring.");
		saveCheckpoint();
	});
	addInteract(
		0,
		-10,
		"Descend to the Sun Atlas",
		() => {
			if (!S.flags.staff) {
				say(
					"FIELD NOTE",
					"The three seals guard a sun staff. Read the inscription above the door.",
				);
				return;
			}
			if (!S.flags.chute) {
				say(
					"FIELD NOTE",
					"That satchel by the southern pillar looks useful. Take the parachute.",
				);
				return;
			}
			advanceStage(2);
		},
		{ radius: 2 },
	);
	for (const p of [
		[-11, 3],
		[10, 3],
		[-5, -7],
		[5, -8],
	])
		spawnEnemy("snake", ...p);
	for (const p of [
		[-16, 0],
		[16, -6],
	])
		spawnEnemy("thief", ...p);
	for (let z of [5, -3]) {
		ring(0, z, 1.9, "red");
		S.dynamic.push({
			kind: "trap",
			x: -17,
			z,
			timer: 2 + worldRng() * 2,
			period: 4.4,
		});
		box(-17, 0.7, z, 1, 1, 1, "deep");
	}
	brazier(-11, -10);
	brazier(11, -10);
	pot(-12, 9, 1.2);
	pot(14, -5, 0.8);
	for (let i = 0; i < 8; i++) coin(-13 + i * 3.7, 11);
}
const mirrorTargets = [0, 1, 2];
const compassWords = ["NORTH", "EAST", "SOUTH", "WEST"];
let beamGroup,
	mirrorVisuals = [];
function mirrorPlinth(x, z, index) {
	cylinder(x, 0.45, z, 1.1, 0.9, "rockDark", level, 8);
	cylinder(x, 0.95, z, 1, 0.15, "gold", level, 8);
	const dial = new THREE.Group();
	level.add(dial);
	dial.position.set(x, 1.2, z);
	const mirror = box(0, 1, 0, 1.3, 1.8, 0.17, "blue", dial);
	mirror.rotation.x = -0.22;
	box(0, 1, 0, 1.55, 2.1, 0.08, "gold", dial);
	box(0, 1, 0.12, 1.28, 1.75, 0.07, "blue", dial);
	const arrow = mesh(
		new THREE.ConeGeometry(0.18, 0.6, 3),
		"gold",
		0,
		-0.1,
		0.85,
		dial,
	);
	arrow.rotation.x = PI / 2;
	mirrorVisuals[index] = dial;
	addInteract(
		x,
		z,
		() =>
			["I", "II", "III"][index] +
			" · " +
			compassWords[S.mirrors[index]] +
			" · rotate",
		() => {
			S.mirrors[index] = (S.mirrors[index] + 1) % 4;
			audio.fx("rotate");
			checkAtlas();
		},
		{ radius: 3.2 },
	);
	sign(["I / NORTH", "II / EAST", "III / SOUTH"][index], x, 4, z, 1, "#f0d697");
}
function checkAtlas() {
	if (
		S.flags.staffPlaced &&
		S.mirrors.every((v, i) => v === mirrorTargets[i]) &&
		!S.flags.mapped
	) {
		S.flags.mapped = true;
		audio.fx("chime");
		S.revision++;
		toast("THE LOST MAP REVEALS THE " + glyphNames[S.target] + " MESA");
		say(
			"EXPLORER",
			"The " +
				glyphNames[S.target].toLowerCase() +
				" mesa. Naturally, it’s the one with the appalling drop.",
		);
		saveCheckpoint();
	}
	updateBeams();
}
function updateBeams() {
	if (!beamGroup) return;
	while (beamGroup.children.length) {
		const child = beamGroup.children[0];
		child.geometry?.dispose();
		beamGroup.remove(child);
	}
	const path = [
		[-16, 3, -7],
		[-9, 2, -3],
		[2, 2, -5],
		[10, 2, 3],
		[0, 1.8, 0],
	];
	if (!S.flags.staffPlaced) return;
	let through = true;
	for (let i = 0; i < 4; i++) {
		if (!through) break;
		const a = vec(...path[i]),
			b = vec(...path[i + 1]);
		const g = new THREE.CylinderGeometry(0.055, 0.055, a.distanceTo(b), 8),
			m = new THREE.MeshBasicMaterial({ color: 0xffd078 });
		const beam = mesh(
			g,
			m,
			...a.clone().add(b).multiplyScalar(0.5).toArray(),
			beamGroup,
		);
		beam.quaternion.setFromUnitVectors(vec(0, 1, 0), b.sub(a).normalize());
		beam.castShadow = false;
		if (i < 3) through = S.mirrors[i] === mirrorTargets[i];
	}
}
function buildAtlas() {
	ground(0, 0, 38, 28, "deep");
	boundRoom(38, 28);
	floorDecor(36, 25, "teal");
	for (let x of [-16, 16])
		for (let z of [-9, -2, 6]) pillar(x, z, 6.7, "rockDark");
	for (let i = 0; i < 3; i++) {
		const r = ring(0, 0, 3.2 + i * 0.35, "gold");
		r.material.opacity = 0.5;
	}
	cylinder(0, 0.45, 0, 3, 0.9, "rockDark", level, 12);
	cylinder(0, 0.96, 0, 2.8, 0.12, "sand", level, 12);
	for (let i = 0; i < 3; i++) {
		const x = (i - 1) * 1.5,
			m = cylinder(
				x,
				1.4,
				-0.3,
				0.5,
				0.8,
				i === S.target && S.flags.mapped ? "gold" : "rock",
				level,
				5 + i,
				0.35,
			);
		S.dynamic.push({ kind: "mapMesa", mesh: m, index: i });
		sign(glyphNames[i], x, 2.4, -0.3, 0.39, "#ead49e");
	}
	const staffModel = new THREE.Group();
	staffModel.position.set(0, 1.2, 1);
	level.add(staffModel);
	cylinder(0, 1, 0, 0.08, 2, "gold", staffModel);
	torus(0, 2.12, 0, 0.34, 0.06, "gold", staffModel);
	ball(0, 2.12, 0, 0.16, "blue", staffModel);
	S.dynamic.push({ kind: "placedStaff", mesh: staffModel });
	addInteract(
		0,
		2.5,
		() => (S.flags.staffPlaced ? "Read the atlas" : "Place the sun staff"),
		() => {
			if (!S.flags.staffPlaced) {
				S.flags.staffPlaced = true;
				audio.fx("chime");
				say(
					"FIELD NOTE",
					"The plinths name their headings. Turn each mirror to its inscription.",
				);
				checkAtlas();
			} else if (S.flags.mapped)
				say(
					"FIELD NOTE",
					"The " +
						glyphNames[S.target] +
						" mesa holds the Well. Use the ankh gateway to travel there.",
				);
			else
				say(
					"FIELD NOTE",
					"I faces NORTH. II faces EAST. III faces SOUTH. Align the three mirrors.",
				);
		},
		{ radius: 3.3 },
	);
	mirrorVisuals = [];
	mirrorPlinth(-9, -3, 0);
	mirrorPlinth(2, -5, 1);
	mirrorPlinth(10, 3, 2);
	box(0, 5.7, -12.8, 24, 3.2, 0.6, "rockDark");
	sign("FOLLOW THE SUN. TRUST THE STONE.", 0, 6, -12.2, 1.45, "#eec98b");
	brazier(-13, -9);
	brazier(13, -9);
	brazier(-13, 9);
	brazier(13, 9);
	const ankh = new THREE.Group();
	ankh.position.set(-11, 2, 8);
	level.add(ankh);
	torus(0, 1.3, 0, 0.65, 0.16, "gold", ankh);
	box(0, 0.1, 0, 0.26, 1.7, 0.26, "gold", ankh);
	box(0, 0.5, 0, 1.4, 0.24, 0.24, "gold", ankh);
	ring(-11, 8, 2, "gold");
	addInteract(
		-11,
		8,
		"Invoke the ankh gateway",
		() => {
			if (!S.flags.mapped) {
				say(
					"FIELD NOTE",
					"The gateway needs a destination. Let the sun finish its work.",
				);
				return;
			}
			advanceStage(3);
		},
		{ radius: 3 },
	);
	beamGroup = new THREE.Group();
	level.add(beamGroup);
	updateBeams();
}
function mesa(x, z, rx, rz, height = 17, shape = 7) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	level.add(g);
	for (let j = 0; j < 5; j++) {
		const h = height / 5,
			top = j === 4;
		const m = cylinder(
			0,
			-height + (j + 0.5) * h,
			0,
			1,
			h + 0.05,
			top ? "sand" : j % 2 ? "rockDark" : "rock",
			g,
			shape,
			0.92,
		);
		m.scale.set(rx * (1 + (4 - j) * 0.035), 1, rz * (1 + (4 - j) * 0.035));
	}
	fixedBox(x, -0.4, z, rx * 1.65, 0.8, rz * 1.65, "sand", false);
	for (let j = 0; j < 8; j++) {
		const a = (j / 8) * TAU;
		line(
			[
				[Math.cos(a) * rx * 0.9, -0.02, Math.sin(a) * rz * 0.9],
				[Math.cos(a) * rx * 0.95, -4, Math.sin(a) * rz * 0.95],
			],
			0x744d38,
			g,
		);
	}
	return g;
}
function swingAnchor(x, z, to, label) {
	const anchor = new THREE.Group();
	anchor.position.set(x, 0, z);
	level.add(anchor);
	box(0, 2.5, 0, 0.25, 5, 0.25, "brown", anchor);
	box(0.8, 4.5, 0, 2, 0.2, 0.2, "brown", anchor);
	torus(1.5, 4.1, 0, 0.28, 0.09, "gold", anchor);
	addInteract(
		x,
		z,
		label,
		(p) => beginSwing(p, to, { x: x + 1.5, y: 4.1, z }),
		{ radius: 3.5 },
	);
}
function buildMesas() {
	mesa(-14, 7, 5.6, 5, 19, 7);
	mesa(-3, 0, 4.7, 4.4, 17, 6);
	mesa(6, -8, 4.6, 4, 20, 7);
	mesa(13, 4, 5, 5, 18, 8);
	palm(-16, 7, 0.8);
	rubble(-14, 10, 0.7);
	pot(-16, 4, 0.7);
	brazier(-12, 8);
	swingAnchor(-10, 5, [-3, 0, 1], "Whip across to the Ibis Mesa");
	swingAnchor(-5, 2, [-13, 0, 7], "Whip back to the trailhead");
	swingAnchor(-1, -2, [6, 0, -7], "Swing to the Cobra Mesa");
	swingAnchor(4, -6, [-3, 0, 0], "Swing back to the Ibis Mesa");
	swingAnchor(8, -6, [13, 0, 4], "Swing to the Scarab Mesa");
	swingAnchor(10, 2, [6, 0, -7], "Swing back to the Cobra Mesa");
	const positions = [
		[-3, 0],
		[6, -8],
		[13, 4],
	];
	positions.forEach(([x, z], i) => {
		sign(glyphNames[i], x, 4.5, z - 1, 0.95, "#ffe3a2");
		ring(x, z + 1.3, 1.1, i === S.target ? "gold" : "teal");
		addInteract(
			x,
			z + 1.5,
			"Parachute into the " + glyphNames[i] + " mesa",
			(p) => {
				S.selectedMesa = i;
				S.flags.parachuteOpen = false;
				advanceStage(4);
			},
			{ radius: 2.2, color: i === S.target ? "gold" : "blue" },
		);
		if (i === S.target)
			sign("✥  THE WELL IS HERE", x, 5.8, z - 1, 0.8, "#ffdd84");
	});
	for (let i = 0; i < 3; i++) {
		coin(-3 + i * 0.75, 0, 1);
		coin(12 + i * 0.7, 5.5, 1);
	}
	// A passing bird writes a small circle above the canyon.
	const bird = new THREE.Group();
	level.add(bird);
	box(-0.3, 0, 0, 0.8, 0.05, 0.24, "brown", bird);
	box(0.3, 0, 0, 0.8, 0.05, 0.24, "brown", bird);
	S.dynamic.push({ kind: "bird", mesh: bird });
}
function buildDescent() {
	// The cliff is open toward the camera; the landing ledge is visible below.
	for (let i = 0; i < 5; i++) {
		box(-17, 4 + i * 6, -1, 5, 5.9, 28, i % 2 ? "rock" : "rockDark");
		box(17, -15 + i * 3, -1, 5, 2.95, 28, i % 2 ? "rock" : "rockDark");
	}
	mesa(7, -5, 5.5, 5, 15, 7);
	doorway(7, -7, "THE WELL OF WHISPERS");
	ring(7, -4.2, 3.3, "gold", 0.08);
	sign("LAND HERE", 7, 2, -5, 1.1, "#f8d590");
	// Rings reward steering rather than perfect timing.
	[
		[-3, 16, 4],
		[2, 10, 0],
		[7, 5, -4],
	].forEach(([x, y, z], i) => {
		const m = torus(x, y, z, 1.5, 0.1, "gold");
		m.rotation.x = -0.4;
		S.pickups.push({
			kind: "airring",
			x,
			y,
			z,
			mesh: m,
			active: true,
			value: 2,
		});
	});
	for (let i = 0; i < 6; i++) {
		const z = -9 + i * 3.8;
		rubble(-12, z, 1, "rock");
		rubble(12, z, 0.8, "rock");
	}
	sign("✥", 7, 20, -9, 3.5, "#eac17b");
}
function digSite(x, z, index) {
	const g = new THREE.Group();
	g.position.set(x, 0.15, z);
	level.add(g);
	const pile = mesh(new THREE.ConeGeometry(1.8, 0.6, 9), "sand", 0, 0, 0, g);
	ring(x, z, 2.1, index === S.target ? "gold" : "teal");
	sign(glyphNames[index], x, 1.6, z, 1.05);
	addInteract(
		x,
		z,
		"Excavate the " + glyphNames[index] + " seal",
		(p) => {
			if (!S.flags.shovel) {
				say(
					"FIELD NOTE",
					"Nadia has the shovel. The sand appears unwilling to move itself.",
				);
				return;
			}
			p.dig = 0.75;
			animateActor(p, "dig");
			audio.fx("rotate");
			if (index !== S.target) {
				if (!S.flags["dug" + index]) {
					S.flags["dug" + index] = true;
					S.coins += 2;
					spawnEnemy("snake", x + 2, z);
					say("EXPLORER", "Two coins and a snake. A very small inheritance.");
				} else
					say(
						"FIELD NOTE",
						"The Sun Atlas marked the " + glyphNames[S.target] + " seal.",
					);
				return;
			}
			if (S.flags.bossDefeated) {
				takeRelic();
				return;
			}
			if (!S.flags.bossAwake) {
				S.flags.bossAwake = true;
				S.flags.excavated = true;
				pile.visible = false;
				spawnEnemy("boss", 0, -7);
				say(
					"CAPTAIN VOSS",
					"Splendid digging, professor. I’ll take it from here.",
				);
				audio.fx("slam");
				toast("VOSS · Dodge the slam. Whip when his guard drops.");
			} else say("EXPLORER", "One excavation. One unwanted colleague.");
		},
		{ can: () => !S.flags.relic, radius: 3 },
	);
}
function buildWell() {
	ground(0, 0, 38, 28, "deep");
	boundRoom(38, 28);
	floorDecor(35, 25, "rockDark");
	for (let x of [-16, -10, 10, 16])
		for (let z of [-10, 4]) pillar(x, z, 7, "rockDark");
	box(0, 4.5, -13, 35, 9, 1, "rockDark");
	box(0, 4.5, -12.4, 15, 6, 0.2, "deep");
	sign(
		"WHAT THE SUN HIDES, THE EARTH REMEMBERS.",
		0,
		7.2,
		-12,
		1.45,
		"#edc786",
	);
	for (let i = 0; i < 3; i++) digSite(-8 + i * 8, -2, i);
	for (let x of [-12, 12]) for (let z of [-8, 9]) brazier(x, z);
	for (let i = 0; i < 4; i++) spawnEnemy("snake", -10 + i * 7, 6);
	const relic = new THREE.Group();
	relic.position.set(0, 1, -7);
	level.add(relic);
	cylinder(0, -0.4, 0, 2, 0.7, "rockDark", relic, 12);
	box(0, 0.4, 0, 2.4, 0.95, 1.2, "gold", relic);
	box(0, 1, 0, 2.6, 0.2, 1.4, "cream", relic);
	for (let side of [-1, 1]) {
		const wing = box(side * 0.85, 1.45, 0, 0.15, 0.8, 0.7, "gold", relic);
		wing.rotation.z = -side * 0.65;
		ball(side * 0.5, 1.3, 0, 0.15, "gold", relic);
		torus(side * 1.1, 0.5, 0.65, 0.19, 0.05, "gold", relic);
	}
	S.dynamic.push({ kind: "relic", mesh: relic });
	addInteract(
		0,
		-6,
		"Take the golden reliquary",
		() => {
			if (S.flags.bossDefeated) takeRelic();
			else
				say(
					"FIELD NOTE",
					"The reliquary is under the seal named by the atlas.",
				);
		},
		{ can: () => S.flags.bossDefeated && !S.flags.relic, radius: 3 },
	);
	if (S.flags.bossAwake && !S.flags.bossDefeated) spawnEnemy("boss", 0, -7);
}
function buildEscape() {
	ground(0, -8, 14, 56, "sand");
	boundRoom(14, 58);
	for (let z = -32; z <= 18; z += 5) {
		for (let side of [-1, 1]) {
			box(side * 8, 2, z, 2, 4, 4.9, "rockDark");
			pillar(side * 6.5, z, 5.5, "rock");
		}
		if (z % 2 === 0) {
			box(0, 5.4, z, 14, 0.5, 1.6, "rock");
		}
	}
	for (let i = 0; i < 4; i++) {
		const z = 3 - i * 8,
			side = i % 2 ? -1 : 1;
		fixedBox(side * 3.3, 0.7, z, 3.5, 1.4, 2.2, "rock");
		rubble(side * 4, z - 1.2, 0.6, "rockDark");
		for (let j = 0; j < 3; j++) coin(-side * 3, z + j * 0.8, 1);
		S.dynamic.push({
			kind: "trap",
			x: -6,
			z: z - 3,
			timer: 1.6 + i * 0.3,
			period: 3.7,
		});
	}
	const boulder = mesh(
		new THREE.IcosahedronGeometry(3, 1),
		"rock",
		0,
		3,
		20,
		level,
		true,
	);
	S.dynamic.push({ kind: "boulder", mesh: boulder });
	S.escape = 20;
	biplane(0, -34);
	sign("DAYLIGHT  ↑", 0, 7, -31, 2, "#ffdf93");
	addInteract(0, -28, "Get aboard. Keep the hat.", () => winGame(), {
		radius: 4,
	});
	for (let i = 0; i < 6; i++) coin((i % 2 ? 1 : -1) * 2, -20 - i * 0.9);
	S.dynamic.push({ kind: "collapse", timer: 2.5 });
}
function buildStage(index, spawn = true) {
	S.stage = index;
	S.revision++;
	S.sceneSerial++;
	disposeLevel();
	world = new RAPIER.World({ x: 0, y: -tune.gravity, z: 0 });
	world.timestep = 1 / 60;
	level = new THREE.Group();
	scene.add(level);
	playerRoot = new THREE.Group();
	scene.add(playerRoot);
	S.enemies = [];
	S.pickups = [];
	S.interacts = [];
	S.projectiles = [];
	S.effects = [];
	S.dynamic = [];
	beamGroup = null;
	mirrorVisuals = [];
	nearest = null;
	hovered = null;
	landscape(stageData[index].palette);
	[
		buildBazaar,
		buildTemple,
		buildAtlas,
		buildMesas,
		buildDescent,
		buildWell,
		buildEscape,
	][index]();
	for (let i = 0; i < S.players.length; i++) {
		const p = S.players[i];
		p.visual = makeExplorer(p.color);
		playerRoot.add(p.visual.mesh);
		const start = stageData[index].start;
		p.pos = { x: start[0] + i * 0.75, y: start[1], z: start[2] + i * 0.35 };
		p.vy = 0;
		p.gliding = false;
		p.swing = null;
		p.roll = 0;
		p.invuln = 2;
		p.attackCd = 0;
		p.toolCd = 0;
		p.flute = 0;
		p.face = PI;
		p.floor = true;
		p.body = world.createRigidBody(
			RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
				p.pos.x,
				p.pos.y + 0.92,
				p.pos.z,
			),
		);
		p.collider = world.createCollider(
			RAPIER.ColliderDesc.capsule(0.52, 0.36),
			p.body,
		);
		p.controller = world.createCharacterController(0.035);
		p.controller.enableAutostep(0.3, 0.2, true);
		p.controller.enableSnapToGround(0.2);
		p.visual.mesh.position.copy(p.pos);
		p.checkpoint = { ...p.pos };
		p.lastInput = S.time;
	}
	world.step();
	cameraTarget.set(0, index === 4 ? 12 : 0, index === 6 ? -4 : 0);
	cameraLook.copy(cameraTarget);
	if (colliderDebug) {
		scene.remove(colliderDebug);
		colliderDebug.geometry.dispose();
		colliderDebug = null;
	}
	if (spawn && S.mode === "playing") {
		showStageCard(index);
		if (!S.attract) saveCheckpoint();
		if (index === 0)
			say(
				"EXPLORER",
				"The map is missing. The market is open. I’ve worked with less.",
			);
		if (index === 1)
			say(
				"FIELD NOTE",
				"The wall gives the seal order: COIL, SUN, WING. The flute buys you time.",
			);
		if (index === 3)
			say(
				"FIELD NOTE",
				"Find the " +
					glyphNames[S.target] +
					" mesa. Interact at a gold hook to swing across.",
			);
		if (index === 4)
			say(
				"FIELD NOTE",
				"Open the parachute, steer toward the gold landing circle, and try to look confident.",
			);
		if (index === 6)
			say("EXPLORER", "Of course there’s a boulder. There’s always a boulder.");
	}
	logEvent("stage", { index });
}
function advanceStage(index) {
	if (!hostAuthority() || S.won) return;
	buildStage(index);
	netTimer = 1;
	audio.fx("chime");
}
