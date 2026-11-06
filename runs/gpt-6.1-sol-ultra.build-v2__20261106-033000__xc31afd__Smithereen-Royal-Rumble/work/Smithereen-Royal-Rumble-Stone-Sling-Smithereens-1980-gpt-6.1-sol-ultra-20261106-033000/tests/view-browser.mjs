import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(
	fs.readFileSync(path.join(root, "project.json"), "utf8"),
);
export async function runViewChecks({ capture = false } = {}) {
	let count = 0;
	const failures = [],
		report = {};
	const check = (value, message) => {
		count++;
		if (!value) failures.push(message);
	};
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage({
				viewport: { width: 1920, height: 1080 },
			}),
			errors = [];
		page.on("pageerror", (e) => errors.push(e.message));
		await page.goto(
			pathToFileURL(path.join(root, "..", project.basename + ".html")).href,
		);
		await page.waitForFunction(() => window.__rumble?.ui);
		await page.evaluate(() => {
			const a = window.__rumble;
			a.start("quick", { court: 4, seed: 21023 });
			a.world.players[1].ai = null;
		});
		await page.keyboard.down("Space");
		await page.waitForTimeout(980);
		const charged = await page.evaluate(() => {
			const a = window.__rumble;
			return {
				power: a.world.players[0].charge?.power,
				view: a.view.diagnostics(),
				errors: a.game.errors,
			};
		});
		check(
			charged.power > 0.3 && charged.power < 1,
			"TV real keyboard hold must build visible tension",
		);
		check(
			charged.view.prediction,
			"TV charge must generate a landing prediction",
		);
		check(
			charged.errors.length === 0,
			"Native TV view must draw without game errors",
		);
		if (capture)
			await page.screenshot({
				path: path.join(root, "artifacts/combat-tv-charged.png"),
			});
		await page.keyboard.up("Space");
		await page.waitForTimeout(700);
		check(
			await page.evaluate(() => window.__rumble.world.stats.shots[0] === 1),
			"TV keyboard release must launch exactly once",
		);
		const audio = await page.evaluate(async () => {
			const a = window.__rumble;
			return {
				diag: a.audio.diagnostics(),
				mix: await a.audio.renderProbe(),
				music: await a.audio.renderProbe({ music: 1, effects: 0, voice: 0 }),
				effects: await a.audio.renderProbe({ music: 0, effects: 1, voice: 0 }),
				voice: await a.audio.renderProbe({ music: 0, effects: 0, voice: 1 }),
				mute: await a.audio.renderProbe({ music: 0, effects: 0, voice: 0 }),
			};
		});
		check(audio.diag.musicGain === 0.1, "Music default must be exactly 10%");
		check(
			audio.diag.context === "running",
			"Audio must unlock on real keyboard gesture",
		);
		for (const [name, result] of Object.entries(audio)) {
			if (name === "diag") continue;
			check(
				result.supported && result.finite,
				`${name} offline audio must be finite`,
			);
			if (name === "mute")
				check(result.peak === 0, "Muted buses must render silence");
			else {
				check(result.nonzero, `${name} bus must render nonzero audio`);
				check(!result.clipped, `${name} representative audio must not clip`);
			}
		}
		report.audio = audio;
		await page.evaluate(() => {
			const a = window.__rumble;
			a.world.players[1].crewUntil = a.world.time + 1.7;
			a.world.players[1].launcherUntil = a.world.time + 2.6;
			a.world.players[0].protectUntil = a.world.time + 1.25;
		});
		await page.waitForTimeout(60);
		if (capture)
			await page.screenshot({
				path: path.join(root, "artifacts/combat-tv-repair.png"),
			});
		await page.evaluate(() => {
			const a = window.__rumble;
			for (const b of a.world.blocks)
				if (b.seat === 1 && !b.foundation && b.z < 75) {
					b.alive = false;
					b.hp = 0;
				}
			a.world.revision++;
		});
		await page.waitForTimeout(180);
		if (capture)
			await page.screenshot({
				path: path.join(root, "artifacts/combat-tv-debris.png"),
			});
		await page.evaluate(() =>
			window.__rumble.start("local", { court: 2, seed: 21991 }),
		);
		await page.keyboard.down("Space");
		await page.keyboard.down("ShiftRight");
		await page.waitForTimeout(350);
		check(
			await page.evaluate(
				() =>
					window.__rumble.view.diagnostics().predictionSeats.join(",") ===
					"0,1",
			),
			"Both local humans must receive independent simultaneous range predictions",
		);
		await page.keyboard.up("ShiftRight");
		await page.keyboard.up("Space");
		await page.waitForTimeout(30);
		check(
			await page.evaluate(() =>
				window.__rumble.world.stats.shots.every((n) => n === 1),
			),
			"Opposite-order local releases must each produce one legal projectile",
		);
		check(errors.length === 0, "TV artifact must have no page errors");
		await page.close();
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 1,
			hasTouch: true,
			isMobile: true,
		});
		const phone = await context.newPage();
		const phoneErrors = [];
		phone.on("pageerror", (e) => phoneErrors.push(e.message));
		await phone.goto(
			pathToFileURL(path.join(root, "..", project.basename + ".html")).href,
		);
		await phone.waitForFunction(() => window.__rumble?.ui);
		await phone.evaluate(() => {
			const a = window.__rumble;
			a.start("quick", { court: 3, seed: 21023 });
			a.world.players[1].ai = null;
			a.device = "touch";
		});
		await phone.waitForTimeout(100);
		const phoneState = await phone.evaluate(() => {
			const a = window.__rumble,
				s = a.game.screen,
				canvas = s.canvas,
				rect = canvas.getBoundingClientRect(),
				clientX = (x) =>
					rect.left + ((x * s.S + s.OX) * rect.width) / canvas.width;
			return {
				world: a.world.blocks
					.filter((b) => b.alive)
					.map((b) => ({
						left: clientX(a.game.view.ax * b.x - s.ix),
						right: clientX(a.game.view.ax * (b.x + b.w) - s.ix),
					})),
				W: a.game.W,
				H: a.game.H,
				OX: s.OX,
				chips: a.touchChips,
				inset: a.view.diagnostics().inset,
				enemyBlocks: a.world.blocks.filter(
					(b) => b.alive && !b.foundation && b.seat === 1,
				).length,
				errors: a.game.errors,
			};
		});
		check(
			phoneState.world.every((p) => p.left >= 0 && p.right <= 390),
			"Portrait phone must show both complete castle silhouettes in physical viewport",
		);
		check(
			phoneState.OX >= 0,
			"Portrait buffer must never be cropped by a negative letterbox offset",
		);
		check(
			phoneState.chips.length === 2,
			"Touch must expose contextual previous and next stone chips",
		);
		check(
			phoneState.chips.every(
				(c) => c.x >= 0 && c.x + c.w <= 390 && c.y >= 0 && c.y + c.h <= 844,
			),
			"Phone stone chips must fit physical viewport",
		);
		check(
			phoneState.errors.length === 0,
			"Phone native view must draw without errors",
		);
		check(
			phoneState.inset?.remaining === phoneState.enemyBlocks &&
				phoneState.inset.seat === 1,
			"Portrait target inset must show the actual alive opposing objective blocks",
		);
		const insetRect = phoneState.inset?.clientRect;
		check(
			insetRect &&
				insetRect.x >= 0 &&
				insetRect.x + insetRect.w <= 390 &&
				insetRect.y >= 0 &&
				insetRect.y + insetRect.h <= 844,
			"Magnified target inset must fit within the physical phone viewport",
		);
		if (capture)
			await phone.screenshot({
				path: path.join(root, "artifacts/combat-phone.png"),
			});
		const chip = phoneState.chips.find((c) => c.delta === 1);
		await phone.touchscreen.tap(chip.x + chip.w / 2, chip.y + chip.h / 2);
		await phone.waitForTimeout(40);
		check(
			await phone.evaluate(() => window.__rumble.world.players[0].stone === 1),
			"Touch contextual next stone must change the stone",
		);
		check(
			(await phone.locator("[data-sys=need]:visible").count()) === 0,
			"Custom touch play must have no inherited controller-required blocker",
		);
		const cdp = await context.newCDPSession(phone);
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchStart",
			touchPoints: [{ x: 95, y: 635 }],
		});
		await phone.waitForTimeout(700);
		check(
			await phone.evaluate(
				() => window.__rumble.world.players[0].charge?.power > 0.2,
			),
			"A real held touchscreen contact must wind the launcher",
		);
		if (capture)
			await phone.screenshot({
				path: path.join(root, "artifacts/combat-phone-charged.png"),
			});
		await cdp.send("Input.dispatchTouchEvent", {
			type: "touchEnd",
			touchPoints: [],
		});
		await phone.waitForTimeout(30);
		check(
			await phone.evaluate(() => window.__rumble.world.stats.shots[0] === 1),
			"Touch release must launch exactly once",
		);
		await phone.evaluate(() => {
			const a = window.__rumble,
				enemy = a.world.blocks.filter((b) => b.seat === 1 && !b.foundation),
				last = enemy[0];
			for (const b of enemy)
				if (b !== last) {
					b.alive = false;
					b.hp = 0;
				}
			last.w = 9;
			last.h = 10;
			last.alive = true;
			a.world.revision++;
		});
		await phone.waitForTimeout(60);
		const fragment = await phone.evaluate(
			() => window.__rumble.view.diagnostics().inset,
		);
		check(
			fragment?.remaining === 1 && fragment.scale >= 2.5,
			"A tiny actual last fragment must be automatically magnified to a readable target",
		);
		if (capture)
			await phone.screenshot({
				path: path.join(root, "artifacts/combat-phone-last-fragment.png"),
			});
		check(phoneErrors.length === 0, "Phone artifact must have no page errors");
		await context.close();
		report.charged = charged;
		report.phone = phoneState;
	} catch (e) {
		failures.push(e.stack || String(e));
	} finally {
		await browser.close();
	}
	fs.writeFileSync(
		path.join(root, "artifacts/view-audio-evidence.json"),
		JSON.stringify({ count, failures, report }, null, 2),
	);
	return { count, failures };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const r = await runViewChecks({
		capture: process.argv.includes("--capture"),
	});
	for (const failure of r.failures) console.error(failure);
	console.log(`${r.count} view/audio checks, ${r.failures.length} failures`);
	if (r.failures.length) process.exitCode = 1;
}
