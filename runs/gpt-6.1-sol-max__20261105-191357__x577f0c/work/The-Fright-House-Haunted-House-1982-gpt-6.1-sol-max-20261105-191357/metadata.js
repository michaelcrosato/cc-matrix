import defaults from "./credits.json";

// AI Hub can update usage and catalogue details in this JSON block after import.
const block = document.getElementById("game-metadata");
const metadata = block ? JSON.parse(block.textContent) : defaults;
export default metadata;
