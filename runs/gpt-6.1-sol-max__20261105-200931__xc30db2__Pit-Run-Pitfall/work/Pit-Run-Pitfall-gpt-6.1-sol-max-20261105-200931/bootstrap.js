const app = new PitRun();
window.__game = app;
const hubInfo = AIHub.active
	? AIHub.connect({ mode: "shared-world", seats: [1, 4] })
	: Promise.resolve(null);
try {
	await app.init();
	const info = await hubInfo;
	if (info) await app.net.hub(info);
	app.renderer.setAnimationLoop((t) => app.frame(t));
	window.__gameReady = true;
} catch (error) {
	console.error(error);
	$("loading").hidden = false;
	$("loadMessage").textContent =
		"The trail could not load. " +
		error.message +
		" Check the connection and use a WebGPU or WebGL 2 browser.";
	if (AIHub.active) AIHub.fail(error.message);
}
