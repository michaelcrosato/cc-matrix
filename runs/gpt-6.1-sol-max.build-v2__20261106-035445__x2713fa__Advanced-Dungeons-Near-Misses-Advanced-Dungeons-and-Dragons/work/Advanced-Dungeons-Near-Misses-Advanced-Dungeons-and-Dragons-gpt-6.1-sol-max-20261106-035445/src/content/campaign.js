/* Authored expedition. All coordinates below are tiles; Geometry.compile owns conversion. */
(() => {
	globalThis.NM = globalThis.NM || {};
	const NM = globalThis.NM;
	const room = (id, name, x, y, w, h, clue, kind = "encounter") => ({
		id,
		name,
		x,
		y,
		w,
		h,
		clue,
		kind,
	});
	const link = (from, to, via) => ({ from, to, ...(via ? { via } : {}) });
	const enemy = (id, type, x, y, roomId, extra = {}) => ({
		id,
		type,
		x,
		y,
		room: roomId,
		...extra,
	});
	const supply = (id, x, y, amount, kind = "arrows") => ({
		id,
		x,
		y,
		kind,
		amount,
	});
	const cue = (id, x, y, text, objective, radius = 3) => ({
		id,
		x,
		y,
		radius,
		text,
		...(objective ? { objective } : {}),
	});
	const track = (id, x, y, type, angle = 0) => ({ id, x, y, type, angle });
	const caves = [
		{
			id: "chalk",
			name: "The Chalk Burrows",
			subtitle: "First delve · a bow, three arrows, and a little nerve",
			width: 58,
			height: 51,
			reward: "axe",
			palette: {
				floor: "#776b56",
				wall: "#b4aa89",
				accent: "#f3c66e",
				ambient: "#171d23",
			},
			spawn: [5.5, 8.5],
			exit: [6.5, 30.5],
			safeAnchors: [
				[5.5, 8.5],
				[24.5, 27.5],
			],
			story:
				"The Crown of Clear Skies lies broken above Hushvale. Bring its two lights home.",
			exitText:
				"The entry scree has fallen. Find the ladder and claim the forester’s axe before leaving.",
			rooms: [
				room(
					"chalk-mouth",
					"Fallen Mouth",
					2,
					3,
					12,
					10,
					"Fresh scree seals the way behind. A ranger goes forward.",
					"arrival",
				),
				room(
					"chalk-practice",
					"Shaft Rest",
					20,
					3,
					13,
					10,
					"A pale wall, an old quiver, and room to miss safely.",
					"lesson",
				),
				room(
					"chalk-scratches",
					"Scratch Bend",
					38,
					3,
					12,
					10,
					"Small prints vanish beneath a ledge. Something is scratching.",
				),
				room(
					"chalk-coil",
					"The Hissing Turn",
					38,
					21,
					14,
					12,
					"A raised coil points along its lunge. Step across its path, then shoot.",
				),
				room(
					"chalk-fork",
					"Three-Candle Fork",
					20,
					23,
					12,
					10,
					"The candles point toward the ladder. A narrow trace leads below.",
					"navigation",
				),
				room(
					"chalk-axe",
					"Forester’s Watch",
					3,
					23,
					12,
					12,
					"The axe waits beside the ladder. Its last keeper is smaller than expected.",
					"reward",
				),
				room(
					"chalk-cache",
					"The Unclaimed Lunch",
					21,
					39,
					10,
					8,
					"Follow the chalk bootprints. The forester left more than lunch.",
					"optional",
				),
			],
			passages: [
				link("chalk-mouth", "chalk-practice"),
				link("chalk-practice", "chalk-scratches"),
				link("chalk-scratches", "chalk-coil"),
				link("chalk-coil", "chalk-fork"),
				link("chalk-fork", "chalk-axe"),
				link("chalk-fork", "chalk-cache"),
				link("chalk-scratches", "chalk-coil", [
					[54.5, 8.5],
					[54.5, 26.5],
				]),
			],
			enemies: [
				enemy("chalk-rat-scratch", "rat", 44.5, 8.5, "chalk-scratches"),
				enemy("chalk-snake", "snake", 46.5, 26.5, "chalk-coil"),
				enemy("chalk-rat-watch", "rat", 9.5, 28.5, "chalk-axe"),
			],
			supplies: [
				supply("chalk-practice-quiver", 25.5, 6.5, 6),
				supply("chalk-turn-quiver", 42.5, 23.5, 4),
				supply("chalk-watch-quiver", 12.5, 31.5, 4),
				supply("chalk-fork-heart", 25.5, 29.5, 1, "heart"),
				supply("chalk-cache-coins", 25.5, 43.5, 3, "treasure"),
				supply("chalk-cache-arrows", 27.5, 42.5, 3),
			],
			tools: [{ id: "chalk-tool-axe", kind: "axe", x: 6.5, y: 27.5 }],
			banks: [{ id: "chalk-bank", ax: 30, ay: 4.5, bx: 32, by: 6.5 }],
			tracks: [
				track("chalk-foot-safe", 23.5, 9.5, "ranger", 0),
				track("chalk-rat-trace", 37.5, 8.5, "rat", 0),
				track("chalk-snake-trace", 45.5, 19.5, "snake", Math.PI / 2),
				track("chalk-cache-trace", 25.5, 36.5, "ranger", Math.PI / 2),
			],
			triggers: [
				cue(
					"chalk-intro",
					5.5,
					8.5,
					"Bring the two lights of the Crown home. First, find the axe.",
					"Find the forester’s axe",
				),
				cue(
					"chalk-listen",
					13.5,
					8.5,
					"Hold focus to walk softly and listen. The dark has a voice.",
				),
				cue(
					"chalk-shot",
					23.5,
					8.5,
					"Try your bow against the pale wall. A missed shaft can be picked up.",
				),
				cue(
					"chalk-supply",
					27.5,
					8.5,
					"A quiver. Take what fits; the rest will wait here.",
				),
				cue(
					"chalk-rat-cue",
					37.5,
					8.5,
					"Scratching ahead. Place the shot; save the next arrow.",
				),
				cue(
					"chalk-snake-cue",
					45.5,
					20.5,
					"A hiss, then a lunge. Sidestep its line and answer while it recoils.",
				),
				cue(
					"chalk-cache-cue",
					25.5,
					34.5,
					"Chalk bootprints turn away from the ladder. A small detour may pay.",
				),
				cue(
					"chalk-exit-cue",
					9.5,
					30.5,
					"The ladder is safe when its keepers are gone. Do not leave the axe behind.",
				),
			],
			guardIds: ["chalk-snake", "chalk-rat-watch"],
			criticalPath: [
				"chalk-mouth",
				"chalk-practice",
				"chalk-scratches",
				"chalk-coil",
				"chalk-fork",
				"chalk-axe",
			],
			checkpoints: [
				{
					id: "chalk-entry",
					x: 5.5,
					y: 8.5,
					remainingDamage: 4,
					reachableSupplyIds: [
						"chalk-practice-quiver",
						"chalk-turn-quiver",
						"chalk-watch-quiver",
					],
				},
			],
		},
		{
			id: "root",
			name: "Rootbell Hollow",
			subtitle: "Second delve · teach the stone to turn your shot",
			width: 65,
			height: 49,
			reward: "boat",
			palette: {
				floor: "#475749",
				wall: "#66785b",
				accent: "#b4e09a",
				ambient: "#101f21",
			},
			spawn: [5.5, 8.5],
			exit: [54.5, 37.5],
			safeAnchors: [
				[5.5, 8.5],
				[37.5, 32.5],
			],
			story:
				"Roots drink the daylight here. The ferryman’s folding boat never returned.",
			exitText:
				"A rootfall seals the entrance. The old ferry ladder opens toward the river.",
			rooms: [
				room(
					"root-bell",
					"The Crooked Bell",
					2,
					3,
					16,
					13,
					"Stand on the arrow mark. Shoot east at the sloping stone; listen for the bell.",
					"lesson",
				),
				room(
					"root-corner",
					"The Bent Passage",
					25,
					3,
					13,
					12,
					"A bat roosts beyond the turn. Stone carries an arrow where eyes cannot.",
				),
				room(
					"root-roost",
					"Wingbeat Hall",
					45,
					3,
					14,
					12,
					"Falling dust marks the wings. A hiss may hide beneath their clatter.",
				),
				room(
					"root-stash",
					"The Silk Cupboard",
					45,
					22,
					14,
					11,
					"White threads lead to a stolen quiver. The stash can be reclaimed without a fight.",
				),
				room(
					"root-crossing",
					"Old Root Bridge",
					25,
					22,
					13,
					11,
					"Two ways round the roots. One is quiet; one is short.",
					"navigation",
				),
				room(
					"root-ferry",
					"Ferryman’s Shelf",
					46,
					36,
					14,
					10,
					"The boat folds small enough for a ranger’s pack. The ladder returns to daylight.",
					"reward",
				),
				room(
					"root-cache",
					"The Honey Vault",
					4,
					24,
					12,
					12,
					"Amber gleams beside a sleeping coil. Keep the noise down.",
					"optional",
				),
			],
			passages: [
				link("root-bell", "root-corner"),
				link("root-corner", "root-roost"),
				link("root-roost", "root-stash"),
				link("root-stash", "root-crossing"),
				link("root-crossing", "root-ferry", [[31.5, 40.5]]),
				link("root-stash", "root-ferry"),
				link("root-crossing", "root-cache"),
			],
			enemies: [
				enemy("root-bank-bell", "target", 13.5, 12.5, "root-bell", {
					lesson: "bank",
				}),
				enemy("root-corner-bat", "bat", 34.5, 11.5, "root-corner"),
				enemy("root-roost-bat", "bat", 50.5, 7.5, "root-roost"),
				enemy("root-roost-snake", "snake", 56.5, 10.5, "root-roost"),
				enemy("root-spider", "spider", 52.5, 27.5, "root-stash", {
					stash: [56.5, 29.5],
				}),
				enemy("root-boat-snake", "snake", 55.5, 40.5, "root-ferry"),
				enemy("root-cache-snake", "snake", 10.5, 30.5, "root-cache"),
			],
			supplies: [
				supply("root-bell-quiver", 5.5, 5.5, 7),
				supply("root-roost-quiver", 47.5, 5.5, 5),
				supply("root-silk-stash", 56.5, 29.5, 4),
				supply("root-ferry-reserve", 48.5, 38.5, 5),
				supply("root-bridge-heart", 29.5, 29.5, 1, "heart"),
				supply("root-honey-treasure", 7.5, 32.5, 5, "treasure"),
				supply("root-honey-quiver", 6.5, 27.5, 4),
			],
			tools: [{ id: "root-tool-boat", kind: "boat", x: 50.5, y: 41.5 }],
			banks: [
				{ id: "root-lesson-bank", ax: 11, ay: 6, bx: 14, by: 9 },
				{ id: "root-corner-bank", ax: 33, ay: 5, bx: 36, by: 8 },
				{ id: "root-roost-bank", ax: 46, ay: 12, bx: 49, by: 9 },
			],
			tracks: [
				track("root-bank-floor-arrow", 6.5, 8.5, "bank", 0),
				track("root-bat-dust", 41.5, 8.5, "bat", 0),
				track("root-silk-trace", 52.5, 20.5, "spider", Math.PI / 2),
				track("root-stash-thread", 56.5, 26.5, "spider", Math.PI / 2),
				track("root-honey-trace", 20.5, 27.5, "snake", Math.PI),
			],
			triggers: [
				cue(
					"root-bank-lesson",
					5.5,
					8.5,
					"The bell only answers a banked shaft. Aim east along the floor arrow.",
					"Ring the Crooked Bell with a bank shot",
				),
				cue(
					"root-bank-return",
					14.5,
					10.5,
					"Beware the return! A banked arrow can strike its archer.",
				),
				cue(
					"root-corner-cue",
					25.5,
					8.5,
					"Pale stone at the turn. A bank shot can reach the roost.",
				),
				cue(
					"root-bat-cue",
					44.5,
					8.5,
					"Wingbeats drown a softer hiss. Watch the dust and the floor.",
				),
				cue(
					"root-spider-cue",
					52.5,
					22.5,
					"The spider gathers loose arrows. Follow the silk to reclaim them.",
				),
				cue(
					"root-shortcut-cue",
					32.5,
					28.5,
					"The bridge curls back beneath the ferry. Remember this way.",
				),
				cue(
					"root-boat-cue",
					50.5,
					38.5,
					"The river has kept the ferryman waiting. Take his boat and let him rest.",
				),
			],
			guardIds: ["root-bank-bell", "root-boat-snake"],
			criticalPath: [
				"root-bell",
				"root-corner",
				"root-roost",
				"root-stash",
				"root-crossing",
				"root-ferry",
			],
			checkpoints: [
				{
					id: "root-entry",
					x: 5.5,
					y: 8.5,
					remainingDamage: 10,
					reachableSupplyIds: [
						"root-bell-quiver",
						"root-roost-quiver",
						"root-silk-stash",
						"root-ferry-reserve",
					],
				},
			],
		},
		{
			id: "cistern",
			name: "The Sunken Ledger",
			subtitle: "Third delve · noise finds a path through stone",
			width: 68,
			height: 52,
			reward: "key",
			palette: {
				floor: "#3f5765",
				wall: "#687e8a",
				accent: "#83d9e3",
				ambient: "#0c1629",
			},
			spawn: [6.5, 9.5],
			exit: [59.5, 40.5],
			safeAnchors: [
				[6.5, 9.5],
				[33.5, 28.5],
			],
			story:
				"The gatekeeper dropped his key below the river. Something still follows the splash.",
			exitText:
				"The current took the entrance steps. The gatekeeper’s ladder climbs above the flood.",
			rooms: [
				room(
					"cistern-wharf",
					"Dry Wharf",
					2,
					4,
					13,
					11,
					"A spare quiver lies above the waterline. A wet scraping answers every step.",
					"arrival",
				),
				room(
					"cistern-ooze",
					"The Patient Guest",
					23,
					4,
					15,
					13,
					"Arrows cannot kill this ooze. Strike a distant wall and take the other way.",
					"lesson",
				),
				room(
					"cistern-loop",
					"The Listening Loop",
					23,
					25,
					14,
					12,
					"Water carries the echo round the wall. Watch which passage answers.",
					"navigation",
				),
				room(
					"cistern-drake",
					"The Snoring Sluice",
					46,
					4,
					16,
					13,
					"Heavy prints, deep snoring. The drake commits to a long straight charge.",
				),
				room(
					"cistern-records",
					"Drowned Records",
					46,
					25,
					16,
					12,
					"A hiss behind the wingbeats. Read the tracks before you hurry.",
				),
				room(
					"cistern-key",
					"Gatekeeper’s Rise",
					48,
					40,
					16,
					9,
					"The brass key is above the flood. Carry it to the old wall.",
					"reward",
				),
				room(
					"cistern-cache",
					"The Toll Cup",
					4,
					29,
					12,
					12,
					"The toll is long unpaid. A little silver still waits in the cup.",
					"optional",
				),
			],
			passages: [
				link("cistern-wharf", "cistern-ooze"),
				link("cistern-ooze", "cistern-drake"),
				link("cistern-wharf", "cistern-loop", [
					[8.5, 20.5],
					[29.5, 20.5],
				]),
				link("cistern-ooze", "cistern-loop"),
				link("cistern-loop", "cistern-records"),
				link("cistern-drake", "cistern-records"),
				link("cistern-records", "cistern-key"),
				link("cistern-loop", "cistern-cache"),
			],
			enemies: [
				enemy("cistern-ooze-listener", "ooze", 32.5, 10.5, "cistern-ooze"),
				enemy("cistern-drake-sluice", "drake", 55.5, 10.5, "cistern-drake"),
				enemy("cistern-record-bat", "bat", 51.5, 29.5, "cistern-records"),
				enemy("cistern-record-snake", "snake", 59.5, 30.5, "cistern-records"),
				enemy("cistern-key-drake", "drake", 58.5, 44.5, "cistern-key"),
				enemy("cistern-toll-spider", "spider", 10.5, 35.5, "cistern-cache", {
					stash: [7.5, 37.5],
				}),
			],
			supplies: [
				supply("cistern-wharf-quiver", 8.5, 7.5, 7),
				supply("cistern-loop-quiver", 31.5, 28.5, 5),
				supply("cistern-rise-reserve", 51.5, 42.5, 6),
				supply("cistern-record-heart", 48.5, 34.5, 1, "heart"),
				supply("cistern-toll-silver", 7.5, 37.5, 7, "treasure"),
				supply("cistern-toll-arrows", 6.5, 32.5, 4),
			],
			tools: [{ id: "cistern-tool-key", kind: "key", x: 53.5, y: 45.5 }],
			banks: [
				{ id: "cistern-lure-bank", ax: 34, ay: 6, bx: 36, by: 8 },
				{ id: "cistern-drake-bank", ax: 48, ay: 6, bx: 51, by: 9 },
				{ id: "cistern-record-bank", ax: 58, ay: 27, bx: 61, by: 30 },
			],
			tracks: [
				track("cistern-wet-drag", 20.5, 9.5, "ooze", 0),
				track("cistern-loop-splash", 29.5, 20.5, "ooze", Math.PI / 2),
				track("cistern-heavy-prints", 43.5, 10.5, "drake", 0),
				track("cistern-record-scales", 53.5, 23.5, "snake", Math.PI / 2),
				track("cistern-toll-silk", 20.5, 34.5, "spider", Math.PI),
			],
			triggers: [
				cue(
					"cistern-ooze-cue",
					17.5,
					9.5,
					"That slow ooze sheds arrows. A loud bank can draw it aside.",
					"Lure the ooze; find the gate key",
				),
				cue(
					"cistern-loop-cue",
					9.5,
					19.5,
					"A dry side passage skirts the listener. Sound must travel this way too.",
				),
				cue(
					"cistern-drake-cue",
					44.5,
					10.5,
					"Hear the snore? Wait for the lifted head, then leave its lane.",
				),
				cue(
					"cistern-layered-cue",
					53.5,
					24.5,
					"Wingbeats above. Scales below. Quiet feet buy time to choose.",
				),
				cue(
					"cistern-key-cue",
					52.5,
					42.5,
					"The gatekeeper’s key. The wall above has waited long enough.",
				),
			],
			guardIds: ["cistern-drake-sluice", "cistern-key-drake"],
			criticalPath: [
				"cistern-wharf",
				"cistern-ooze",
				"cistern-drake",
				"cistern-records",
				"cistern-key",
			],
			checkpoints: [
				{
					id: "cistern-entry",
					x: 6.5,
					y: 9.5,
					remainingDamage: 8,
					reachableSupplyIds: [
						"cistern-wharf-quiver",
						"cistern-loop-quiver",
						"cistern-rise-reserve",
					],
				},
			],
		},
		{
			id: "dawn",
			name: "The Amber Eyrie",
			subtitle: "Summit · first light of the broken Crown",
			width: 62,
			height: 39,
			reward: "dawn",
			palette: {
				floor: "#76523c",
				wall: "#a88765",
				accent: "#ffd38a",
				ambient: "#281a2a",
			},
			spawn: [6.5, 21.5],
			exit: [54.5, 6.5],
			safeAnchors: [
				[6.5, 21.5],
				[25.5, 22.5],
			],
			story:
				"Brasswing keeps the dawn beneath an armored breast. Make it listen somewhere else.",
			exitText:
				"Wind has taken the old stairs. The Crown’s first light opens the saddle to the cold wing.",
			rooms: [
				room(
					"dawn-shelter",
					"Last Sheltered Step",
					2,
					17,
					12,
					13,
					"Take the reserve quiver. A warm snore rolls down from the summit.",
					"arrival",
				),
				room(
					"dawn-echo",
					"The Turning Stones",
					21,
					17,
					13,
					13,
					"The guardian listens to stone. Place a loud miss, then move to its flank.",
					"lesson",
				),
				room(
					"dawn-arena",
					"Brasswing’s Lantern",
					39,
					10,
					19,
					23,
					"The amber lantern stands behind the armored guardian. Three honest wounds will free it.",
					"guardian",
				),
				room(
					"dawn-saddle",
					"The Wind Saddle",
					45,
					2,
					13,
					8,
					"A second light answers from the cold wing. A fresh quiver waits before the crossing.",
					"checkpoint",
				),
			],
			passages: [
				link("dawn-shelter", "dawn-echo"),
				link("dawn-echo", "dawn-arena"),
				link("dawn-arena", "dawn-saddle"),
			],
			enemies: [
				enemy("dawn-snake", "snake", 29.5, 24.5, "dawn-echo"),
				enemy("dawn-brasswing", "guardian1", 49.5, 21.5, "dawn-arena", {
					name: "Brasswing",
					landmark: "The Amber Lantern",
					signature: "Three hollow brass notes",
				}),
			],
			supplies: [
				supply("dawn-shelter-reserve", 8.5, 20.5, 8),
				supply("dawn-turning-reserve", 25.5, 19.5, 8),
				supply("dawn-arena-heart", 41.5, 29.5, 1, "heart"),
				supply("dawn-saddle-reserve", 49.5, 6.5, 12),
			],
			tools: [{ id: "dawn-crown-half", kind: "dawn", x: 54.5, y: 17.5 }],
			banks: [
				{ id: "dawn-turning-bank", ax: 29, ay: 18.5, bx: 32, by: 21.5 },
				{ id: "dawn-west-bank", ax: 41, ay: 14, bx: 44, by: 17 },
				{ id: "dawn-east-bank", ax: 53, ay: 27, bx: 56, by: 24 },
			],
			tracks: [
				track("dawn-snake-scales", 18.5, 23.5, "snake", 0),
				track("dawn-claw-marks", 36.5, 21.5, "guardian1", 0),
			],
			triggers: [
				cue(
					"dawn-reserve-cue",
					6.5,
					21.5,
					"Last camp before the wings. Refill here; a missed arrow is still yours.",
					"Free the amber half of the Crown",
				),
				cue(
					"dawn-armor-cue",
					35.5,
					21.5,
					"Brasswing’s breast turns arrows. Draw its ear, find its flank, or bank the shot.",
				),
				cue(
					"dawn-swoop-cue",
					42.5,
					21.5,
					"A wounded wing loads before it sweeps. Step clear when the shadow stretches.",
				),
				cue(
					"dawn-saddle-cue",
					50.5,
					9.5,
					"One light won. A safe crossing and a full reserve lie ahead.",
				),
			],
			guardIds: ["dawn-brasswing"],
			criticalPath: ["dawn-shelter", "dawn-echo", "dawn-arena", "dawn-saddle"],
			checkpoints: [
				{
					id: "dawn-entry",
					x: 6.5,
					y: 21.5,
					remainingDamage: 5,
					reachableSupplyIds: ["dawn-shelter-reserve", "dawn-turning-reserve"],
				},
				{
					id: "dawn-wing-complete",
					x: 49.5,
					y: 6.5,
					remainingDamage: 0,
					reachableSupplyIds: ["dawn-saddle-reserve"],
				},
			],
		},
		{
			id: "dusk",
			name: "The Blue Hour Vault",
			subtitle: "Summit · the last light waits beyond the breath",
			width: 63,
			height: 40,
			reward: "dusk",
			palette: {
				floor: "#46506c",
				wall: "#7b8ba5",
				accent: "#b6d7ff",
				ambient: "#11152f",
			},
			spawn: [6.5, 23.5],
			exit: [54.5, 6.5],
			safeAnchors: [
				[6.5, 23.5],
				[25.5, 22.5],
			],
			story:
				"Hushflame keeps the evening light. Let the breath pass; loose your shaft into the hush.",
			exitText:
				"Reunite dawn and dusk at the summit beacon. The valley is waiting.",
			rooms: [
				room(
					"dusk-rest",
					"The Blue Rest",
					2,
					18,
					12,
					12,
					"A fresh reserve, a quiet moment, and the cold wing beyond.",
					"checkpoint",
				),
				room(
					"dusk-vigil",
					"Vigil of Small Wings",
					21,
					18,
					13,
					13,
					"A bat and a silk trail stir before the last guardian. Keep a shaft for the silence after its breath.",
				),
				room(
					"dusk-arena",
					"Hushflame’s Mirror",
					39,
					11,
					20,
					24,
					"Blue fire marks a lane before it burns. Shelter by the banks; strike during the long exhale.",
					"guardian",
				),
				room(
					"dusk-beacon",
					"The Clear-Sky Beacon",
					47,
					2,
					13,
					9,
					"Fit the two lights to the Crown. Let Hushvale see the morning.",
					"resolution",
				),
			],
			passages: [
				link("dusk-rest", "dusk-vigil"),
				link("dusk-vigil", "dusk-arena"),
				link("dusk-arena", "dusk-beacon"),
			],
			enemies: [
				enemy("dusk-vigil-bat", "bat", 27.5, 22.5, "dusk-vigil"),
				enemy("dusk-vigil-spider", "spider", 30.5, 27.5, "dusk-vigil", {
					stash: [24.5, 27.5],
				}),
				enemy("dusk-hushflame", "guardian2", 49.5, 23.5, "dusk-arena", {
					name: "Hushflame",
					landmark: "The Moonwater Mirror",
					signature: "A falling glass chord, then a breath",
				}),
			],
			supplies: [
				supply("dusk-rest-reserve", 8.5, 22.5, 12),
				supply("dusk-vigil-reserve", 23.5, 20.5, 8),
				supply("dusk-silk-stash", 24.5, 27.5, 3),
				supply("dusk-arena-heart", 41.5, 31.5, 1, "heart"),
			],
			tools: [{ id: "dusk-crown-half", kind: "dusk", x: 55.5, y: 18.5 }],
			banks: [
				{ id: "dusk-west-bank", ax: 41, ay: 15, bx: 44, by: 18 },
				{ id: "dusk-east-bank", ax: 54, ay: 28, bx: 57, by: 25 },
				{ id: "dusk-vigil-bank", ax: 29, ay: 20, bx: 32, by: 23 },
			],
			tracks: [
				track("dusk-bat-dust", 18.5, 23.5, "bat", 0),
				track("dusk-spider-silk", 25.5, 27.5, "spider", Math.PI),
				track("dusk-scorched-lane", 36.5, 23.5, "guardian2", 0),
			],
			triggers: [
				cue(
					"dusk-reserve-cue",
					6.5,
					23.5,
					"A new checkpoint. The arrows here cover the final wing.",
					"Free the blue half; reunite the Crown",
				),
				cue(
					"dusk-breath-cue",
					35.5,
					23.5,
					"Hushflame marks the floor before breathing. Leave that lane, then shoot as it rests.",
				),
				cue(
					"dusk-bank-cue",
					42.5,
					16.5,
					"The pale banks turn a shaft and shelter a patient ranger.",
				),
				cue(
					"dusk-beacon-cue",
					52.5,
					11.5,
					"Dawn in one hand, dusk in the other. The Crown remembers the sky.",
				),
			],
			guardIds: ["dusk-hushflame"],
			criticalPath: ["dusk-rest", "dusk-vigil", "dusk-arena", "dusk-beacon"],
			checkpoints: [
				{
					id: "dusk-entry",
					x: 6.5,
					y: 23.5,
					remainingDamage: 5,
					reachableSupplyIds: [
						"dusk-rest-reserve",
						"dusk-vigil-reserve",
						"dusk-silk-stash",
					],
				},
			],
		},
	];

	const landmarks = [
		{
			id: "camp",
			name: "Hushvale Camp",
			x: 0.1,
			y: 0.78,
			kind: "camp",
			clue: "Two lights crown the summit. Three reserves carry us there.",
		},
		{
			id: "chalk",
			name: "Chalk Burrows",
			x: 0.24,
			y: 0.66,
			kind: "cave",
			cave: 0,
			clue: "Small tracks. A forester’s axe. Find the ladder through.",
		},
		{
			id: "forest",
			name: "Bramble Door",
			x: 0.36,
			y: 0.73,
			kind: "forest",
			requires: "axe",
			toolAction: "The axe opens the bramble road.",
			clue: "Thick old roots. An axe will open the way.",
		},
		{
			id: "root",
			name: "Rootbell Hollow",
			x: 0.43,
			y: 0.53,
			kind: "cave",
			cave: 1,
			clue: "Pale banks, stolen arrows, and a folding boat.",
		},
		{
			id: "river",
			name: "Murmur Ferry",
			x: 0.58,
			y: 0.62,
			kind: "river",
			requires: "boat",
			toolAction: "The boat unfolds. The party crosses together.",
			clue: "The river is too deep to ford. Bring the boat.",
		},
		{
			id: "cistern",
			name: "Sunken Ledger",
			x: 0.64,
			y: 0.41,
			kind: "cave",
			cave: 2,
			clue: "Follow the splash, bypass the ooze, claim the key.",
		},
		{
			id: "wall",
			name: "The Long-Shut Gate",
			x: 0.77,
			y: 0.47,
			kind: "wall",
			requires: "key",
			toolAction: "The brass key wakes the old gate.",
			clue: "A brass lock. Its key lies below the river.",
		},
		{
			id: "dawn",
			name: "Amber Eyrie",
			x: 0.83,
			y: 0.26,
			kind: "summit",
			cave: 3,
			clue: "An armored listener keeps the dawn. Aim for its flank.",
		},
		{
			id: "dusk",
			name: "Blue Hour Vault",
			x: 0.7,
			y: 0.15,
			kind: "summit",
			cave: 4,
			requires: "dawn",
			clue: "A cold breath guards the second light. Wait for the hush.",
		},
	];
	const routes = [
		{ from: "camp", to: "chalk" },
		{ from: "chalk", to: "forest", requires: "axe" },
		{ from: "forest", to: "root" },
		{ from: "root", to: "river", requires: "boat" },
		{ from: "river", to: "cistern" },
		{ from: "cistern", to: "wall", requires: "key" },
		{ from: "wall", to: "dawn" },
		{ from: "dawn", to: "dusk", requires: "dawn" },
		{ from: "root", to: "camp", requires: "boat", shortcut: true },
		{ from: "cistern", to: "forest", requires: "key", shortcut: true },
	];
	const enemyDefs = {
		rat: {
			hp: 1,
			speed: 31,
			hearing: 6,
			vision: 6,
			windup: 0.65,
			attackTime: 0.32,
			recovery: 1.2,
			damage: 1,
			cue: "scratching",
			radius: 3.7,
		},
		snake: {
			hp: 2,
			speed: 18,
			hearing: 5,
			vision: 6,
			windup: 0.95,
			attackTime: 0.42,
			recovery: 1.7,
			damage: 1,
			cue: "a rising hiss",
			radius: 4.5,
		},
		bat: {
			hp: 1,
			speed: 35,
			hearing: 8,
			vision: 7,
			windup: 0.75,
			attackTime: 0.35,
			recovery: 1.35,
			damage: 1,
			cue: "wingbeats",
			radius: 4,
		},
		spider: {
			hp: 1,
			speed: 26,
			hearing: 6,
			vision: 5,
			windup: 0.8,
			attackTime: 0.35,
			recovery: 1.4,
			damage: 1,
			cue: "silken clicks",
			radius: 4,
		},
		ooze: {
			hp: 999,
			indestructible: true,
			speed: 12,
			hearing: 13,
			vision: 0,
			windup: 1.2,
			attackTime: 0.4,
			recovery: 1.5,
			damage: 1,
			cue: "a wet scrape",
			radius: 6,
		},
		drake: {
			hp: 2,
			speed: 20,
			hearing: 8,
			vision: 7,
			windup: 1.25,
			attackTime: 0.65,
			recovery: 2.1,
			damage: 1,
			cue: "a deep snore",
			radius: 6,
		},
		guardian1: {
			hp: 3,
			speed: 20,
			hearing: 15,
			vision: 11,
			windup: 1.5,
			attackTime: 0.8,
			recovery: 2.4,
			damage: 1,
			cue: "three brass notes",
			radius: 10,
			armor: "front",
		},
		guardian2: {
			hp: 3,
			speed: 17,
			hearing: 12,
			vision: 12,
			windup: 1.6,
			attackTime: 0.75,
			recovery: 2.8,
			damage: 1,
			cue: "a falling glass chord",
			radius: 10,
			armor: "breathing",
		},
		target: {
			hp: 1,
			speed: 0,
			hearing: 0,
			vision: 0,
			windup: 0,
			attackTime: 0,
			recovery: 0,
			damage: 0,
			cue: "a waiting bell",
			radius: 3,
			bankOnly: true,
		},
	};

	/** Validator accepts a candidate campaign too, so authoring tools can reject edits before build. */
	function validate(candidate = { caves, landmarks, routes, enemyDefs }) {
		const errors = [];
		const ids = new Set();
		const unique = (id, scope) => {
			if (!id || ids.has(id))
				errors.push(`${scope}: missing or duplicate stable ID ${id}`);
			else ids.add(id);
		};
		const finite = (value) =>
			typeof value === "number" && Number.isFinite(value);
		for (const cave of candidate.caves || []) {
			unique(cave.id, "cave");
			const roomIds = new Set(cave.rooms.map((r) => r.id));
			const inBounds = ([x, y]) =>
				finite(x) &&
				finite(y) &&
				x >= 1 &&
				y >= 1 &&
				x < cave.width - 1 &&
				y < cave.height - 1;
			for (const r of cave.rooms) {
				unique(r.id, cave.id);
				if (
					![r.x, r.y, r.w, r.h].every(finite) ||
					r.w < 3 ||
					r.h < 3 ||
					!inBounds([r.x, r.y]) ||
					!inBounds([r.x + r.w - 1, r.y + r.h - 1])
				)
					errors.push(`${r.id}: room outside map or too small`);
				if (!r.clue || !r.kind)
					errors.push(`${r.id}: chamber lacks a meaningful purpose`);
			}
			const reached = new Set([cave.rooms[0]?.id]);
			let changed = true;
			while (changed) {
				changed = false;
				for (const passage of cave.passages) {
					if (!roomIds.has(passage.from) || !roomIds.has(passage.to))
						errors.push(`${cave.id}: unknown passage room`);
					if (reached.has(passage.from) && !reached.has(passage.to)) {
						reached.add(passage.to);
						changed = true;
					}
					if (reached.has(passage.to) && !reached.has(passage.from)) {
						reached.add(passage.from);
						changed = true;
					}
					if ((passage.via || []).some((point) => !inBounds(point)))
						errors.push(`${cave.id}: passage outside map`);
				}
			}
			if (reached.size !== cave.rooms.length)
				errors.push(`${cave.id}: isolated chamber`);
			for (const list of [
				"enemies",
				"supplies",
				"tools",
				"tracks",
				"triggers",
				"banks",
				"checkpoints",
			])
				for (const record of cave[list] || []) {
					unique(record.id, cave.id);
					if (list !== "banks" && !inBounds([record.x, record.y]))
						errors.push(`${record.id}: invalid coordinate`);
				}
			const inRoom = ([x, y]) =>
				cave.rooms.some(
					(r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
				);
			for (const point of [cave.spawn, cave.exit, ...cave.safeAnchors])
				if (!inRoom(point))
					errors.push(
						`${cave.id}: spawn, exit, or safe anchor is not in a floor chamber`,
					);
			for (const record of [...cave.enemies, ...cave.supplies, ...cave.tools])
				if (!inRoom([record.x, record.y]))
					errors.push(`${record.id}: entity is not on authored room floor`);
			for (const bank of cave.banks)
				if (
					![bank.ax, bank.ay, bank.bx, bank.by].every(finite) ||
					Math.hypot(bank.ax - bank.bx, bank.ay - bank.by) < 0.5 ||
					!inRoom([bank.ax, bank.ay]) ||
					!inRoom([bank.bx, bank.by])
				)
					errors.push(`${bank.id}: invalid bank segment`);
			const enemyIds = new Set(cave.enemies.map((e) => e.id));
			for (const guardId of cave.guardIds)
				if (!enemyIds.has(guardId))
					errors.push(`${cave.id}: unknown exit guard ${guardId}`);
			if (!cave.tools.some((t) => t.kind === cave.reward))
				errors.push(`${cave.id}: required reward is missing`);
			for (const e of cave.enemies)
				if (!candidate.enemyDefs[e.type] || !roomIds.has(e.room))
					errors.push(`${e.id}: unknown archetype or room`);
			for (const roomId of cave.criticalPath)
				if (!roomIds.has(roomId))
					errors.push(`${cave.id}: unknown critical chamber ${roomId}`);
			const supplyIds = new Map(cave.supplies.map((s) => [s.id, s]));
			for (const checkpoint of cave.checkpoints || []) {
				const supplies = checkpoint.reachableSupplyIds.map((id) =>
					supplyIds.get(id),
				);
				if (supplies.some((s) => s?.kind !== "arrows"))
					errors.push(`${checkpoint.id}: unknown reserve supply`);
				const arrows = supplies.reduce((sum, s) => sum + (s?.amount || 0), 0);
				if (arrows < checkpoint.remainingDamage + 3)
					errors.push(
						`${checkpoint.id}: reserve supply lacks a three-arrow safety margin`,
					);
			}
			const damageBudget = cave.enemies.reduce(
				(sum, e) =>
					sum +
					(candidate.enemyDefs[e.type]?.indestructible
						? 0
						: candidate.enemyDefs[e.type]?.hp || 0),
				0,
			);
			const ammoBudget = cave.supplies
				.filter((s) => s.kind === "arrows")
				.reduce((sum, s) => sum + s.amount, 0);
			if (ammoBudget < damageBudget + 3)
				errors.push(`${cave.id}: whole-cave ammo budget is insufficient`);
		}
		const landmarkIds = new Set((candidate.landmarks || []).map((l) => l.id));
		for (const landmark of candidate.landmarks || []) {
			// Cave and map-node identities intentionally match; these are separate namespaces.
			if (
				!landmark.name ||
				!landmark.clue ||
				!finite(landmark.x) ||
				!finite(landmark.y) ||
				landmark.x < 0 ||
				landmark.x > 1 ||
				landmark.y < 0 ||
				landmark.y > 1
			)
				errors.push(`${landmark.id}: invalid landmark`);
			if (landmark.cave !== undefined && !candidate.caves[landmark.cave])
				errors.push(`${landmark.id}: unknown cave`);
		}
		for (const route of candidate.routes || [])
			if (!landmarkIds.has(route.from) || !landmarkIds.has(route.to))
				errors.push("Route references an unknown landmark");
		const tools = new Set();
		const reached = new Set(["camp"]);
		let changed = true;
		while (changed) {
			changed = false;
			for (const landmark of candidate.landmarks || [])
				if (reached.has(landmark.id) && landmark.cave !== undefined) {
					const reward = candidate.caves[landmark.cave]?.reward;
					if (reward && !tools.has(reward)) {
						tools.add(reward);
						changed = true;
					}
				}
			for (const route of candidate.routes || []) {
				if (route.requires && !tools.has(route.requires)) continue;
				const a = (candidate.landmarks || []).find((l) => l.id === route.from);
				const b = (candidate.landmarks || []).find((l) => l.id === route.to);
				if (
					reached.has(route.from) &&
					(!b.requires || tools.has(b.requires)) &&
					!reached.has(route.to)
				) {
					reached.add(route.to);
					changed = true;
				}
				if (
					reached.has(route.to) &&
					(!a.requires || tools.has(a.requires)) &&
					!reached.has(route.from)
				) {
					reached.add(route.from);
					changed = true;
				}
			}
		}
		if (reached.size !== landmarkIds.size)
			errors.push(
				"Tool chain contains an unreachable landmark or self-locked tool",
			);
		return {
			valid: errors.length === 0,
			errors,
			chambers: (candidate.caves || []).reduce(
				(sum, c) => sum + c.rooms.length,
				0,
			),
			damageBudget: (candidate.caves || []).map((c) => ({
				cave: c.id,
				wounds: c.enemies.reduce(
					(sum, e) =>
						sum +
						(candidate.enemyDefs[e.type]?.indestructible
							? 0
							: candidate.enemyDefs[e.type]?.hp || 0),
					0,
				),
				arrows: c.supplies
					.filter((s) => s.kind === "arrows")
					.reduce((sum, s) => sum + s.amount, 0),
			})),
		};
	}
	NM.Content = {
		version: "near-misses-1",
		caves,
		landmarks,
		routes,
		enemyDefs,
		validate,
	};
})();
