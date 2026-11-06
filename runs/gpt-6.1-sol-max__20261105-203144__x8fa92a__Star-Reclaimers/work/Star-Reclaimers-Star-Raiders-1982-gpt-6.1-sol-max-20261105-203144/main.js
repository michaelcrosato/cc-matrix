import { Game } from "./game.js";

const game = new Game();
window.addEventListener("unhandledrejection", (event) => {
	console.error(event.reason);
});
game.init().catch((error) => {
	console.error(error);
	document.getElementById("load-status").textContent =
		"Flight systems could not start: " +
		error.message +
		". Try Chrome or Edge with hardware acceleration enabled.";
	document.getElementById("loading-bar").style.display = "none";
	if (AIHub.active) AIHub.fail(error.message);
});
