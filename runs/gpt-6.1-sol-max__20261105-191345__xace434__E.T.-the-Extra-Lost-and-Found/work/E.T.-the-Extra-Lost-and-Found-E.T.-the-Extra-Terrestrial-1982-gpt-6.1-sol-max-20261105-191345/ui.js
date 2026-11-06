function glyph(action) {
	const kb = {
		move: "WASD",
		interact: "E",
		pulse: "Space",
		sneak: "Shift",
		boost: "Shift",
		candy: "Q",
		map: "Tab",
		pause: "Esc",
		lift: "Space",
	};
	if (input.type !== "gamepad") return "<kbd>" + kb[action] + "</kbd>";
	const ps = {
			move: "L",
			interact: "×",
			pulse: "□",
			sneak: "○",
			boost: "R2",
			candy: "R1",
			map: "L1",
			pause: "≡",
			lift: "×",
		},
		xb = {
			move: "L",
			interact: "A",
			pulse: "X",
			sneak: "B",
			boost: "RT",
			candy: "RB",
			map: "LB",
			pause: "≡",
			lift: "A",
		};
	return (
		'<span class="glyph ' +
		(settings.glyphs === "PlayStation" ? "ps" : "") +
		'">' +
		(settings.glyphs === "PlayStation" ? ps : xb)[action] +
		"</span>"
	);
}
function updateHUD() {
	if (!body) return;
	const phase = state.phase,
		mission = {
			friend: [
				"01 / A STRANGER IN THE SHED",
				"Someone’s hiding.",
				"Follow the little golden trail to the shed.",
			],
			parts: [
				"02 / A TELEPHONE MADE OF LITTLE THINGS",
				"Find three little things.",
				"A toy on a porch. A battery under a crate. An umbrella behind a gate.",
			],
			signal: [
				"02 / THE CLEARING",
				"Make a little noise.",
				"Bring the pieces to the old stump in the woods.",
			],
			ride: [
				"03 / THE LONG WAY HOME",
				state.mounted
					? "Pedal past the searchlights."
					: "Your bicycle is waiting.",
				state.mounted
					? "Keep to the road. Save a glow for the roadblock."
					: "A friend fits nicely in the basket.",
			],
			flight: [
				"03 / ABOVE EVERYTHING",
				"The sky is a shortcut.",
				"Steer through the stars. Hold your glow to rise.",
			],
			farewell: [
				"04 / THE LAST LITTLE THING",
				"Walk him to the light.",
				"Sometimes a goodbye is a promise.",
			],
			ending: [
				"04 / HOME",
				"Somewhere, someone is waiting.",
				"And somewhere, someone will remember.",
			],
		}[phase];
	$("#chapterLabel").textContent = mission[0];
	$("#goalTitle").textContent = mission[1];
	$("#goalHint").textContent = mission[2];
	$("#parts").innerHTML = ["◒", "ϟ", "☂"]
		.map(
			(t, i) =>
				'<div class="part ' +
				(state.parts[i] ? "got" : "") +
				'" aria-label="' +
				["Talking toy", "Battery", "Umbrella"][i] +
				(state.parts[i] ? " collected" : " missing") +
				'">' +
				t +
				"</div>",
		)
		.join("");
	$("#parts").classList.toggle(
		"hidden",
		phase === "friend" || phaseOrder.indexOf(phase) > 2,
	);
	$("#bondValue").textContent = Math.round(state.bond);
	$("#bondFill").style.width = state.bond + "%";
	$("#alertFill").style.width = state.alert + "%";
	$("#alertLabel").textContent = state.seen
		? "SEEN"
		: state.hiding
			? "IN COVER"
			: state.alert > 10
				? "SEARCHING"
				: "HIDDEN";
	const c = state.screen === "play" ? nearestContext() : null;
	$("#action").classList.toggle("hidden", !c);
	if (c)
		$("#action").innerHTML =
			glyph(c.type === "power" ? "pulse" : "interact") +
			"<span>" +
			c.text +
			"</span>";
	const flight = phase === "flight";
	$("#controls").innerHTML =
		"<span>" +
		glyph("move") +
		(flight ? "Steer" : "Move") +
		"</span><span>" +
		glyph(flight ? "lift" : "pulse") +
		(flight ? "Rise / glide" : state.mounted ? "Lift" : "Heartlight") +
		"</span><span>" +
		glyph(state.mounted ? "boost" : "sneak") +
		(state.mounted ? "Pedal harder" : "Quiet steps") +
		"</span><span>" +
		glyph("candy") +
		"Candy · " +
		state.candy +
		"</span><span>" +
		glyph("map") +
		"Map</span><span>" +
		glyph("pause") +
		"Pause</span>";
	if (flight) {
		$("#controls").innerHTML =
			"<span>" +
			glyph("move") +
			"Steer</span><span>" +
			glyph("lift") +
			"Rise / glide</span><span>" +
			glyph("map") +
			"Map</span><span>" +
			glyph("pause") +
			"Pause</span>";
	}
	$(".alert-meter").classList.toggle(
		"hidden",
		flight || phase === "farewell" || phase === "ending",
	);
	$("#titleInput").textContent =
		input.type === "gamepad"
			? settings.glyphs === "PlayStation"
				? "L to wander · × to lend a hand · □ to glow"
				: "L to wander · A to lend a hand · X to glow"
			: "WASD to wander · E to lend a hand · Space to glow";
	$("#tuneKeys").textContent =
		input.type === "gamepad"
			? settings.glyphs === "PlayStation"
				? "□ low · △ middle · ○ high"
				: "X low · Y middle · B high"
			: "Use 1 · 2 · 3 or click a light.";
	$("#touchPulse").style.visibility =
		state.friend && (c?.type === "power" || state.mounted || state.alert > 15)
			? "visible"
			: "hidden";
	drawMap($("#minimap"), false);
	if (!$("#mapOverlay").classList.contains("hidden"))
		drawMap($("#largeMap"), true);
	updateRaceUI();
}
function objectivePoints() {
	if (state.phase === "friend")
		return [{ ...locations.friend, name: "A small friend" }];
	if (state.phase === "parts")
		return items
			.filter((i) => !i.collected)
			.map((i) => ({ x: i.x, z: i.z, name: i.name }));
	if (state.phase === "signal")
		return [{ ...locations.signal, name: "The telephone" }];
	if (state.phase === "ride")
		return [
			{
				...(state.mounted ? locations.barrier : locations.bike),
				name: state.mounted ? "The roadblock" : "Your bicycle",
			},
		];
	if (state.phase === "flight")
		return rings.filter((r) => !r.taken).map((r) => ({ ...r, name: "A star" }));
	return [{ ...locations.home, name: "Home" }];
}
function drawMap(canvas, large) {
	const c = canvas.getContext("2d"),
		w = canvas.width,
		h = canvas.height,
		p = body.translation(),
		span = large ? 205 : 54,
		centerZ = large ? -70 : p.z,
		centerX = large ? 0 : p.x,
		scale = w / span;
	const xy = (x, z) => [
		w / 2 + (x - centerX) * scale,
		h / 2 + (z - centerZ) * scale,
	];
	c.clearRect(0, 0, w, h);
	c.save();
	c.fillStyle = "#12303d";
	c.fillRect(0, 0, w, h);
	c.strokeStyle = "#4d6871";
	c.lineWidth = large ? 22 : 28;
	c.beginPath();
	for (let z = 25; z > -170; z -= 2) {
		const [x, y] = xy(roadX(z), z);
		z === 25 ? c.moveTo(x, y) : c.lineTo(x, y);
	}
	c.stroke();
	c.strokeStyle = "#a5b5a05c";
	c.lineWidth = 2;
	c.setLineDash([8, 9]);
	c.stroke();
	c.setLineDash([]);
	for (const [x, z] of [
		[-27, -3],
		[27, 10],
		[-27, -25],
		[29, -39],
		[-28, 20],
	]) {
		const [px, py] = xy(x, z);
		c.fillStyle = "#79928a";
		c.fillRect(px - 4 * scale, py - 3 * scale, 8 * scale, 6 * scale);
	}
	for (const g of guards) {
		const [x, y] = xy(g.x, g.z);
		c.fillStyle = g.stun ? "#8fd4c1" : "#e59887";
		c.beginPath();
		c.arc(x, y, large ? 4 : 5, 0, 6.28);
		c.fill();
	}
	for (const o of objectivePoints()) {
		const [x, y] = xy(o.x, o.z);
		c.fillStyle = "#f8d18a";
		c.beginPath();
		c.arc(x, y, large ? 7 : 8, 0, 6.28);
		c.fill();
		if (large) {
			c.font = "19px sans-serif";
			c.fillStyle = "#f8e4b9";
			c.fillText(o.name, x + 13, y + 6);
		}
	}
	for (const g of ghosts.values()) {
		if (!g.data) continue;
		const [x, y] = xy(g.data.x, g.data.z);
		c.fillStyle = g.color;
		c.beginPath();
		c.arc(x, y, 5, 0, 6.28);
		c.fill();
	}
	const [x, y] = xy(p.x, p.z);
	c.save();
	c.translate(x, y);
	c.rotate(-player.root.rotation.y);
	c.fillStyle = "#a6f3e0";
	c.beginPath();
	c.moveTo(0, -10);
	c.lineTo(7, 8);
	c.lineTo(0, 4);
	c.lineTo(-7, 8);
	c.closePath();
	c.fill();
	c.restore();
	if (large) {
		c.font = "26px serif";
		c.fillStyle = "#f8dfb0";
		c.fillText("A little map of a very big night", 35, 45);
		c.font = "16px sans-serif";
		c.fillStyle = "#acc8c6";
		c.fillText("THE NEIGHBORHOOD", w * 0.6, h * 0.15);
		c.fillText("THE WOODS", w * 0.6, h * 0.52);
		c.fillText("THE WAY HOME", w * 0.6, h * 0.87);
	}
	c.restore();
}
let menuBase = "title",
	aboutTab = "Source Information";
function openMenu(kind) {
	if (state.screen === "hubEnded" || state.attract) return;
	if (menu === "none") menuBase = state.screen;
	state.screen = "menu";
	menu = kind;
	$("#menuLayer").classList.remove("hidden");
	renderMenu();
}
function closeMenu() {
	menu = "none";
	$("#menuLayer").classList.add("hidden");
	if (menuBase === "title") showTitle();
	else state.screen = menuBase;
	input.keys.clear();
	input.x = input.y = 0;
}
function menuBack() {
	if (menu === "pause" || menu === "online" || menuBase === "title")
		closeMenu();
	else {
		menu = "pause";
		renderMenu();
	}
}
function panel(content, wide = false, compact = false) {
	$("#menuLayer").innerHTML =
		'<section class="panel ' +
		(wide ? "wide " : "") +
		(compact ? "compact" : "") +
		'">' +
		content +
		"</section>";
	focusFirst();
}
function btn(id, label, cls = "") {
	return '<button id="' + id + '" class="' + cls + '">' + label + "</button>";
}
function bind(id, fn) {
	const e = $("#" + id);
	if (e)
		e.onclick = () => {
			state.lastMenuAction = id;
			audio.sfx("click");
			fn();
		};
}
function renderMenu() {
	if (menu === "pause") {
		panel(
			'<div class="kicker">TAKE A BREATH</div><h2>The night can wait.</h2><div class="menu-list">' +
				btn("resume", "Keep going", "primary") +
				btn("openSettings", "Settings") +
				btn("openHelp", "How to help a visitor") +
				btn("openDev", "Developer mode") +
				btn("openAbout", "About & credits") +
				(AIHub.active ? "" : btn("returnTitle", "Back to the title")) +
				"</div>",
		);
		bind("resume", closeMenu);
		bind("openSettings", () => openMenu("settings"));
		bind("openHelp", () => openMenu("help"));
		bind("openDev", () => openMenu("dev"));
		bind("openAbout", () => openMenu("about"));
		bind("returnTitle", () => {
			club?.leave();
			resetWorld();
			showTitle();
		});
	} else if (menu === "settings") {
		panel(
			'<div class="kicker">MAKE YOURSELF AT HOME</div><h2>A little adjustment.</h2>' +
				settingSlider("music", "Music", settings.music, 0, 1, 0.01, true) +
				settingSlider("sfx", "Sound & voices", settings.sfx, 0, 1, 0.01, true) +
				settingSlider(
					"sensitivity",
					"Camera speed",
					settings.sensitivity,
					0.3,
					2,
					0.1,
				) +
				'<div class="setting-row"><label>Controller symbols</label>' +
				btn("glyphToggle", settings.glyphs, "small") +
				'</div><div class="setting-row"><label>Camera drift & effects</label>' +
				btn(
					"motionToggle",
					settings.motion ? "Gentle motion" : "Reduced motion",
					"small",
				) +
				'</div><p class="note">Left stick moves. Right stick looks. In menus, use the D-pad or left stick; Cross selects and Circle goes back. Music starts at 10%.</p>' +
				btn(
					"fullScreen",
					document.fullscreenElement ? "Leave fullscreen" : "Play fullscreen",
					"small",
				) +
				btn("menuBack", "Back", "back"),
		);
		bindSlider("music", settings, true);
		bindSlider("sfx", settings, true);
		bindSlider("sensitivity", settings);
		bind("glyphToggle", () => {
			settings.glyphs =
				settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
			saveSettings();
			renderMenu();
			$("#glyphToggle").focus();
		});
		bind("motionToggle", () => {
			settings.motion = !settings.motion;
			saveSettings();
			renderMenu();
			$("#motionToggle").focus();
		});
		bind("fullScreen", async () => {
			try {
				if (document.fullscreenElement) await document.exitFullscreen();
				else await document.documentElement.requestFullscreen();
			} catch {
				toast("Fullscreen is unavailable in this browser.");
			}
		});
		bind("menuBack", menuBack);
	} else if (menu === "help") {
		panel(
			'<div class="kicker">A FRIEND, NOT A FIGHTER</div><h2>Small things matter.</h2><p>Follow the golden marks on the map. Offer the visitor candy, then gather three pieces for a telephone.</p><p>' +
				glyph("pulse") +
				" <b>Heartlight</b> brings flowers back, lifts heavy things, and startles searching adults. It comes back when you rest.</p><p>" +
				glyph("sneak") +
				" <b>Quiet steps</b> and hedges help you hide. " +
				glyph("candy") +
				" drops candy to draw flashlights away. Getting caught returns you to safety with your finds.</p><p>On the bicycle, pedal toward the woods. At the roadblock, glow to lift off. In the sky, steer and hold " +
				glyph("lift") +
				' to rise. Golden rings refill your light.</p><p class="note">WASD / left stick: move · mouse drag / right stick: camera · click ground: walk there · E / Cross: interact · Space / Square: glow · Shift / Circle: quiet · Q / R1: candy · Tab / L1: map · Esc / Options: pause.<br>Touch: left thumb moves, right thumb looks. Nearby help happens automatically; tap the contextual prompt to interact.</p>' +
				btn("menuBack", "Back", "back"),
			true,
		);
		bind("menuBack", menuBack);
	} else if (menu === "dev") {
		panel(
			'<div class="kicker">DEVELOPER MODE · LIVE FIELD NOTES</div><h2>Try a different night.</h2>' +
				settingSlider(
					"walkSpeed",
					"Walking speed",
					tuning.walkSpeed,
					2,
					12,
					0.1,
				) +
				settingSlider(
					"alertRate",
					"Searchlight buildup",
					tuning.alertRate,
					0,
					70,
					1,
				) +
				settingSlider(
					"recharge",
					"Heartlight recharge",
					tuning.recharge,
					0,
					25,
					0.5,
				) +
				settingSlider(
					"flightSpeed",
					"Flight speed",
					tuning.flightSpeed,
					5,
					24,
					0.5,
				) +
				'<div class="dev-grid">' +
				btn(
					"invincible",
					"Safe from capture: " + (tuning.invincible ? "on" : "off"),
				) +
				btn("freeze", "Patrols: " + (tuning.freeze ? "frozen" : "moving")) +
				btn("refill", "Refill heartlight & candy") +
				btn(
					"debugPhysics",
					"Physics lines: " + (debugLines.visible ? "on" : "off"),
				) +
				btn("tour", "Autopilot: " + (state.auto ? "on" : "off")) +
				btn("resetBalance", "Reset balance defaults") +
				'</div><p class="note">Jump to a chapter. The right equipment comes with you.</p><div class="pills">' +
				btn("jumpParts", "The telephone", "small") +
				btn("jumpRide", "The bicycle", "small") +
				btn("jumpFlight", "The sky", "small") +
				"</div>" +
				btn("menuBack", "Back", "back"),
			true,
			true,
		);
		for (const k of ["walkSpeed", "alertRate", "recharge", "flightSpeed"])
			bindSlider(k, tuning);
		bind("invincible", () => {
			tuning.invincible = !tuning.invincible;
			renderMenu();
		});
		bind("freeze", () => {
			tuning.freeze = !tuning.freeze;
			renderMenu();
		});
		bind("refill", () => {
			state.bond = 100;
			state.candy = 12;
			toast("A pocketful of possibilities.");
		});
		bind("debugPhysics", () => {
			debugLines.visible = !debugLines.visible;
			renderMenu();
		});
		bind("tour", () => {
			state.auto = !state.auto;
			autoRouteName = "";
			autoStep = 0;
			closeMenu();
		});
		bind("resetBalance", () => {
			Object.assign(tuning, defaults);
			debugLines.visible = false;
			renderMenu();
		});
		bind("jumpParts", () => devJump("parts"));
		bind("jumpRide", () => devJump("ride"));
		bind("jumpFlight", () => devJump("flight"));
		bind("menuBack", menuBack);
	} else if (menu === "about") renderAbout();
	else if (menu === "online") renderOnline();
}
function settingSlider(key, label, value, min, max, step, percent = false) {
	return (
		'<div class="setting-row"><label for="set-' +
		key +
		'">' +
		label +
		'</label><div class="range-wrap"><input id="set-' +
		key +
		'" type="range" min="' +
		min +
		'" max="' +
		max +
		'" step="' +
		step +
		'" value="' +
		value +
		'"><output id="out-' +
		key +
		'">' +
		(percent
			? Math.round(value * 100) + "%"
			: Number(value).toFixed(step < 1 ? 1 : 0)) +
		"</output></div></div>"
	);
}
function bindSlider(k, target, pct = false) {
	const el = $("#set-" + k);
	el.oninput = () => {
		target[k] = Number(el.value);
		$("#out-" + k).textContent = pct
			? Math.round(target[k] * 100) + "%"
			: target[k].toFixed(Number(el.step) < 1 ? 1 : 0);
		if (target === settings) {
			audio.volumes(settings.music, settings.sfx);
			saveSettings();
		}
	};
}
function saveSettings() {
	try {
		localStorage.setItem("etlaf-settings", JSON.stringify(settings));
	} catch {}
	updateHUD();
}
function devJump(phase) {
	resetWorld();
	state.friend = true;
	state.screen = "play";
	if (phase === "parts") {
		state.phase = "parts";
		putPlayer(7, 5);
	} else {
		state.parts = [true, true, true];
		items.forEach((i) => {
			i.collected = true;
			i.root.visible = false;
		});
		state.signal = true;
		state.crateMoved = true;
		state.gateOpen = true;
		gate.userData.collider.setEnabled(false);
		transmitter.visible = true;
		state.phase = "ride";
		putPlayer(4, -45);
		if (phase === "flight") {
			state.mounted = true;
			state.phase = "flight";
			friend.root.scale.setScalar(0.62);
			putPlayer(0, -88, 8);
		}
	}
	state.checkpoint = { x: body.translation().x, z: body.translation().z };
	menu = "none";
	$("#title").classList.add("hidden");
	$("#hud").classList.remove("hidden");
	$("#menuLayer").classList.add("hidden");
	toast("Chapter ready.");
	updateHUD();
}
const feedbackQuestions = {
	testingFeedback: [
		"Issues caught",
		"Critical / game breaking",
		"Most helpful test",
		"Least helpful test",
	],
	engineFeedback: [
		"Best part of the engine",
		"Where I got stuck",
		"Most important custom system",
		"Hardest part",
		"Engine changes",
		"One thing to improve",
	],
	promptFeedback: [
		"What worked well",
		"What was confusing",
		"Hardest requirement",
		"What I would change",
	],
};
function escapeHTML(s) {
	return String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
}
function renderAbout() {
	const tabs = [
		"Source Information",
		"Testing Feedback",
		"Engine Feedback",
		"Prompt Feedback",
	];
	let bodyHTML = "";
	if (aboutTab === "Source Information") {
		bodyHTML =
			Object.entries(credits.sourceInformation)
				.map(
					([k, v]) =>
						'<div class="credit-row"><b>' +
						escapeHTML(k[0].toUpperCase() + k.slice(1)) +
						"</b><span>" +
						escapeHTML(v) +
						"</span></div>",
				)
				.join("") +
			'<div class="credits-section"><h3>Research & inspiration</h3><p class="note">Film research: <a href="https://catalog.afi.com/Catalog/moviedetails/67140">AFI synopsis</a>, <a href="https://amblin.com/movie/e-t/">Amblin</a>, and <a href="https://www.loc.gov/static/programs/national-film-preservation-board/documents/ET.pdf">Library of Congress essay</a>. Friendship, homemade communication, botanical healing, looming flashlights, and moonlit flight became the game’s mechanics.</p><p class="note">An original, unofficial tribute. E.T. the Extra-Terrestrial © Universal Pictures / Amblin Entertainment. All game geometry, animation, writing, and synthesized music were created for this demo. No film audio or images are used.</p><p class="note">Three.js r180 (MIT) · Rapier 0.19.3 (Apache-2.0) · PeerJS 1.5.5 (MIT) · AI Hub Session client 1.4.0 · Libre Caslon Display and DM Sans (SIL Open Font License).</p></div>';
	} else {
		const key = {
			"Testing Feedback": "testingFeedback",
			"Engine Feedback": "engineFeedback",
			"Prompt Feedback": "promptFeedback",
		}[aboutTab];
		bodyHTML = credits[key]
			.map(
				(v, i) =>
					'<div class="feedback"><p><b>' +
					feedbackQuestions[key][i] +
					"</b><br>" +
					escapeHTML(v) +
					"</p></div>",
			)
			.join("");
	}
	panel(
		'<div class="kicker">E.T. THE EXTRA-LOST-AND-FOUND</div><h2>A small game. A big thank you.</h2><div class="pills">' +
			tabs
				.map((t, i) =>
					btn("creditTab" + i, t, "small " + (t === aboutTab ? "primary" : "")),
				)
				.join("") +
			'</div><div class="credits-scroll" style="margin-top:20px"><h3>' +
			aboutTab +
			"</h3>" +
			bodyHTML +
			"</div>" +
			btn("menuBack", "Back", "back"),
		true,
	);
	tabs.forEach((t, i) => {
		bind("creditTab" + i, () => {
			aboutTab = t;
			renderAbout();
			$("#creditTab" + i).focus();
		});
	});
	bind("menuBack", menuBack);
	if (AIHub.active)
		$$(".credits-scroll a").forEach((a) => {
			a.removeAttribute("href");
		});
}
function formatTime(s) {
	return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}
function showResult() {
	state.screen = "result";
	$("#chapterSplash").classList.add("hidden");
	$("#menuLayer").classList.remove("hidden");
	const clubRound = club?.started;
	panel(
		'<div class="kicker">YOU GOT HIM HOME</div><h2>Some friendships<br>are bigger than the sky.</h2><p>A little bicycle is waiting at the edge of the woods.<br>Tomorrow, there will be stories nobody believes.</p><div class="result-stats"><div>' +
			formatTime(state.time) +
			"<small>ONE BIG NIGHT</small></div><div>" +
			state.healed +
			"/4<small>FLOWERS HEALED</small></div><div>" +
			state.rings +
			'/4<small>STARS TOUCHED</small></div></div><p class="note">' +
			(state.catches === 0
				? "Quiet as a secret. Nobody caught you."
				: state.catches + " close calls. You kept your promise anyway.") +
			'</p><div id="clubResults"></div>' +
			(AIHub.active
				? '<p class="good">Homecoming reported. Waiting for the other riders.</p>'
				: '<div class="menu-list">' +
					btn(
						"again",
						clubRound ? "Ride together again" : "One more night",
						"primary",
					) +
					btn("resultTitle", "Back to the title") +
					btn("resultAbout", "About & credits") +
					"</div>"),
	);
	bind("again", () => {
		if (clubRound && club.host) club.start();
		else if (clubRound) toast("The room’s host can start the next ride.");
		else startGame();
	});
	bind("resultTitle", () => {
		club?.leave();
		showTitle();
	});
	bind("resultAbout", () => {
		menuBase = "result";
		menu = "about";
		state.screen = "menu";
		renderAbout();
	});
}
function focusFirst() {
	const scope = !$("#menuLayer").classList.contains("hidden")
		? $("#menuLayer")
		: !$("#tuneOverlay").classList.contains("hidden")
			? $("#tuneOverlay")
			: $("#title");
	const b = scope.querySelector("button:not(:disabled),input");
	if (b) b.focus({ preventScroll: true });
}
function menuElements() {
	const scope = !$("#menuLayer").classList.contains("hidden")
		? $("#menuLayer")
		: !$("#tuneOverlay").classList.contains("hidden")
			? $("#tuneOverlay")
			: $("#title");
	return [...scope.querySelectorAll("button:not(:disabled),input")].filter(
		(e) => e.getClientRects().length,
	);
}
function navigateMenu(delta) {
	const els = menuElements();
	if (!els.length) return;
	let i = els.indexOf(document.activeElement);
	i = (i + delta + els.length) % els.length;
	els[i].focus({ preventScroll: true });
	els[i].scrollIntoView({ block: "nearest" });
	audio.sfx("click");
}
function adjustFocused(direction) {
	const e = document.activeElement;
	if (e?.type === "range") {
		e.value = clamp(
			Number(e.value) + direction * Number(e.step),
			Number(e.min),
			Number(e.max),
		);
		e.dispatchEvent(new Event("input"));
		return true;
	}
	if (e?.dataset.digit !== undefined) {
		const n = Number(e.dataset.digit);
		roomDigits[n] = (roomDigits[n] + direction + 10) % 10;
		renderOnline();
		$("#digit" + n).focus();
		return true;
	}
	return false;
}
function noteInput(type) {
	input.last = performance.now();
	if (state.screen === "hubEnded") return false;
	if (state.attract) {
		showTitle();
		return false;
	}
	if (input.type !== type) {
		input.type = type;
		document.body.classList.toggle("touch", type === "touch");
		updateHUD();
	}
	audio.unlock();
	return true;
}
function pause() {
	if (AIHub.active && state.screen === "hubWaiting") return;
	if (state.screen === "menu") {
		menuBack();
		return;
	}
	if (["play", "tune"].includes(state.screen)) openMenu("pause");
}
function toggleMap() {
	if (!["play", "map"].includes(state.screen)) return;
	const isOpen = state.screen === "map";
	state.screen = isOpen ? "play" : "map";
	$("#mapOverlay").classList.toggle("hidden", isOpen);
	if (!isOpen) {
		drawMap($("#largeMap"), true);
		$("#closeMap").focus();
	}
}
function handleKey(e) {
	if (!noteInput("keyboard")) {
		e.preventDefault();
		return;
	}
	const key = e.key.toLowerCase();
	if (
		[" ", "tab", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
			key,
		)
	)
		e.preventDefault();
	if (e.repeat) return;
	if (e.target.tagName === "INPUT" && e.target.type === "number") return;
	if (key === "escape") {
		if (state.screen === "map") toggleMap();
		else if (state.screen === "tune") {
			state.screen = "play";
			$("#tuneOverlay").classList.add("hidden");
		} else pause();
		return;
	}
	if (["menu", "title", "result"].includes(state.screen)) {
		if (["arrowdown", "s"].includes(key)) navigateMenu(1);
		else if (["arrowup", "w"].includes(key)) navigateMenu(-1);
		else if (key === "arrowleft") adjustFocused(-1);
		else if (key === "arrowright") adjustFocused(1);
		else if (key === "enter" || key === " ") {
			e.preventDefault();
			if (document.activeElement?.tagName === "BUTTON")
				document.activeElement.click();
			else if (state.screen === "title") $("#begin").click();
		}
		return;
	}
	if (state.screen === "hubWaiting" || state.screen === "hubEnded") return;
	if (state.screen === "tune") {
		if (["1", "2", "3"].includes(key)) submitNote(Number(key) - 1);
		return;
	}
	input.keys.add(key);
	if (
		[
			"w",
			"a",
			"s",
			"d",
			"arrowup",
			"arrowdown",
			"arrowleft",
			"arrowright",
		].includes(key)
	)
		input.click = null;
	if (key === "e") interact();
	if (key === " ") {
		pulse();
		input.lift = true;
	}
	if (key === "q") throwCandy();
	if (key === "tab") toggleMap();
}
document.addEventListener(
	"pointerdown",
	(e) => {
		if (!noteInput(e.pointerType === "touch" ? "touch" : "keyboard")) {
			e.preventDefault();
			e.stopPropagation();
		}
	},
	true,
);
document.addEventListener("keydown", handleKey);
document.addEventListener("keyup", (e) => {
	input.keys.delete(e.key.toLowerCase());
	if (e.key === " ") input.lift = false;
});
window.addEventListener("blur", () => {
	input.keys.clear();
	input.x = input.y = 0;
	input.lift = false;
	if (!AIHub.active && !state.attract && state.screen === "play")
		openMenu("pause");
});
document.addEventListener("pointermove", (e) => {
	if (
		e.pointerType === "mouse" &&
		Math.abs(e.movementX) + Math.abs(e.movementY) > 1
	) {
		if (!noteInput("keyboard")) return;
		if (e.buttons === 1 && pointerDown && state.screen === "play") {
			pointerDown.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
			if (pointerDown.moved > 5) {
				cameraYaw -= e.movementX * 0.004 * settings.sensitivity;
				cameraPitch = clamp(cameraPitch - e.movementY * 0.003, 0.35, 1.1);
			}
		}
	}
	const b = e.target.closest?.("button");
	if (b && e.pointerType === "mouse") b.focus({ preventScroll: true });
});
$("#world").addEventListener("pointerdown", (e) => {
	if (!noteInput(e.pointerType === "touch" ? "touch" : "keyboard")) return;
	if (e.pointerType === "touch") {
		touches.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY,
			startX: e.clientX,
			startY: e.clientY,
			left: e.clientX < innerWidth * 0.5,
		});
		$("#world").setPointerCapture(e.pointerId);
		if (e.clientX < innerWidth * 0.5) {
			$("#touchStick").style.cssText =
				"display:block;left:" +
				(e.clientX - 50) +
				"px;top:" +
				(e.clientY - 50) +
				"px";
		}
	} else pointerDown = { x: e.clientX, y: e.clientY, moved: 0 };
});
const touches = new Map();
$("#world").addEventListener("pointermove", (e) => {
	const t = touches.get(e.pointerId);
	if (!t) return;
	if (t.left) {
		input.touch = {
			x: clamp((e.clientX - t.startX) / 55, -1, 1),
			y: clamp((e.clientY - t.startY) / 55, -1, 1),
		};
	} else {
		cameraYaw -= (e.clientX - t.x) * 0.004 * settings.sensitivity;
		cameraPitch = clamp(cameraPitch - (e.clientY - t.y) * 0.003, 0.35, 1.1);
	}
	t.x = e.clientX;
	t.y = e.clientY;
});
$("#world").addEventListener("pointerup", (e) => {
	const t = touches.get(e.pointerId);
	if (t) {
		if (t.left) {
			input.touch = null;
			$("#touchStick").style.display = "none";
		} else if (Math.hypot(e.clientX - t.startX, e.clientY - t.startY) < 12)
			clickWorld(e.clientX, e.clientY);
		touches.delete(e.pointerId);
	} else if (pointerDown && pointerDown.moved < 6)
		clickWorld(e.clientX, e.clientY);
	pointerDown = null;
});
$("#world").addEventListener("pointercancel", (e) => {
	touches.delete(e.pointerId);
	input.touch = null;
	$("#touchStick").style.display = "none";
});
const raycaster = new THREE.Raycaster(),
	groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function clickWorld(x, y) {
	if (state.screen !== "play" || state.phase === "flight") return;
	raycaster.setFromCamera(
		new THREE.Vector2((x / innerWidth) * 2 - 1, (-y / innerHeight) * 2 + 1),
		camera,
	);
	const pt = new THREE.Vector3();
	if (raycaster.ray.intersectPlane(groundPlane, pt)) {
		input.click = { x: clamp(pt.x, -42, 42), z: clamp(pt.z, -168, 24) };
		input.clickAction = objectivePoints().some(
			(o) => Math.hypot(pt.x - o.x, pt.z - o.z) < 3,
		);
	}
}
let padNavTime = 0;
function pollInput(dt) {
	input.x =
		(input.keys.has("d") || input.keys.has("arrowright") ? 1 : 0) -
		(input.keys.has("a") || input.keys.has("arrowleft") ? 1 : 0);
	input.y =
		(input.keys.has("s") || input.keys.has("arrowdown") ? 1 : 0) -
		(input.keys.has("w") || input.keys.has("arrowup") ? 1 : 0);
	input.sneak = input.keys.has("shift");
	input.boost = input.keys.has("shift");
	if (input.touch) {
		input.x = input.touch.x;
		input.y = input.touch.y;
		input.sneak = true;
	}
	const pads = navigator.getGamepads?.() || [],
		pad = [...pads].find((p) => p && p.connected !== false);
	if (!pad) return;
	const down = (i) => !!pad.buttons[i]?.pressed || pad.buttons[i]?.value > 0.55,
		edge = (i) => down(i) && !input.padPrev[i],
		axis = (i) => (Math.abs(pad.axes[i] || 0) > 0.17 ? pad.axes[i] || 0 : 0),
		hasInput =
			[0, 1, 2, 3, 4, 5, 9, 12, 13, 14, 15].some(edge) ||
			Math.abs(axis(0)) +
				Math.abs(axis(1)) +
				Math.abs(axis(2)) +
				Math.abs(axis(3)) >
				0.2;
	if (hasInput && !noteInput("gamepad")) {
		input.padPrev = pad.buttons.map((_, i) => down(i));
		return;
	}
	padNavTime -= dt;
	if (["title", "menu", "result"].includes(state.screen)) {
		const dir =
			down(13) || axis(1) > 0.55 ? 1 : down(12) || axis(1) < -0.55 ? -1 : 0;
		if (dir && padNavTime <= 0) {
			navigateMenu(dir);
			padNavTime = 0.22;
		}
		if ((edge(14) || edge(15)) && !adjustFocused(edge(15) ? 1 : -1))
			navigateMenu(edge(15) ? 1 : -1);
		if (edge(0)) document.activeElement?.click();
		if (edge(1) && state.screen === "menu") menuBack();
		const scroll = $("#menuLayer .credits-scroll");
		if (scroll && Math.abs(axis(3)) > 0.1)
			scroll.scrollTop += axis(3) * dt * 400;
	} else if (state.screen === "tune") {
		if (edge(2)) submitNote(0);
		if (edge(3)) submitNote(1);
		if (edge(1)) submitNote(2);
		if (edge(9) && !down(8)) pause();
	} else if (state.screen === "map") {
		if (edge(1) || edge(4) || edge(9)) toggleMap();
	} else if (state.screen === "play") {
		if (hasInput) {
			input.x = axis(0);
			input.y = axis(1);
		}
		input.sneak = down(1) || input.sneak;
		input.boost = pad.buttons[7]?.value > 0.2 || input.boost;
		input.lift = down(0) || input.keys.has(" ");
		cameraYaw -= axis(2) * dt * 1.8 * settings.sensitivity;
		cameraPitch = clamp(cameraPitch - axis(3) * dt * 1.1, 0.35, 1.1);
		if (edge(0)) interact();
		if (edge(2)) pulse();
		if (edge(5)) throwCandy();
		if (edge(4)) toggleMap();
		if (edge(9) && !down(8)) pause();
	}
	input.padPrev = pad.buttons.map((_, i) => down(i));
}
bind("begin", () => {
	noteInput(input.type);
	startGame();
});
bind("onlineBtn", () => openMenu("online"));
bind("settingsBtn", () => openMenu("settings"));
bind("aboutBtn", () => openMenu("about"));
bind("pauseButton", pause);
bind("action", () => {
	noteInput(input.type);
	interact();
});
bind("touchPulse", () => {
	noteInput("touch");
	pulse();
});
$("#touchPulse").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	noteInput("touch");
	input.lift = true;
});
$("#touchPulse").addEventListener("pointerup", () => (input.lift = false));
bind("closeMap", toggleMap);
$$("#tuneNotes button").forEach((b) => {
	b.onclick = () => submitNote(Number(b.dataset.note));
});
bind("replayTune", () => {
	if (!state.tunePlaying) playPattern();
});
bind("leaveTune", () => {
	state.screen = "play";
	$("#tuneOverlay").classList.add("hidden");
});
function updateCamera(dt) {
	const titleView =
		state.screen === "title" ||
		(state.screen === "menu" && menuBase === "title");
	if (titleView) {
		const t = settings.motion ? Math.sin(state.elapsed * 0.09) * 1.2 : 0;
		camera.position.lerp(
			new THREE.Vector3(23 + t, 13.5, 30),
			Math.min(1, dt * 2),
		);
		lookTarget.lerp(new THREE.Vector3(1, 3, -7), Math.min(1, dt * 2));
	} else {
		const p = player.root.position,
			flight = state.phase === "flight",
			dist = flight ? 19 : camDistance + (innerWidth < 600 ? 8 : 0),
			pitch = flight ? 0.25 : cameraPitch;
		const desired = new THREE.Vector3(
			p.x + Math.sin(cameraYaw) * dist * Math.cos(pitch),
			p.y + Math.sin(pitch) * dist + (flight ? 4 : 0),
			p.z + Math.cos(cameraYaw) * dist * Math.cos(pitch),
		);
		camera.position.lerp(desired, Math.min(1, dt * (settings.motion ? 4 : 12)));
		lookTarget.lerp(
			new THREE.Vector3(p.x, p.y + (flight ? 2 : 1), p.z - (flight ? 7 : 2)),
			Math.min(1, dt * 6),
		);
		if (flight) {
			skyMoon.position.set(-22, 38, p.z - 75);
			skyMoon.scale.setScalar(35);
		} else {
			skyMoon.position.set(-29, 27, -90);
			skyMoon.scale.set(29, 29, 1);
		}
	}
	camera.lookAt(lookTarget);
}
