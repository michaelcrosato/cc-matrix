export const PALETTE = {
	olive: "#71734c",
	oliveLight: "#a3a17a",
	oliveDark: "#414b3b",
	metal: "#494d46",
	frame: "#323d36",
	brass: "#d4b47a",
	glass: "#86aaa0",
	sky: "#a8c5c4",
	sea: "#326f80",
	cream: "#f3dfaa",
	ink: "#112f35",
	orange: "#dc7850",
	red: "#b74738",
};
// Dimensions in metres; pen.at(..., size=16) converts to the engine's one-world unit scale.
export const BOMBER = {
	length: 27,
	span: 36,
	engineY: [-12, -6, 6, 12],
	mounts: {
		pilot: [7, 0, 2.3],
		nose: [12, 0, -0.1],
		starboard: [-1, 2, 0.2],
		tail: [-12, 0, 0.4],
		port: [-1, -2, 0.2],
		bombs: [9, 0, -1.3],
	},
};
export const CREW = [
	{
		role: "PILOT",
		name: "Finch",
		cloth: "#6e7254",
		skin: "#d3a675",
		hair: "#463a2e",
	},
	{
		role: "GUNNER",
		name: "Kit",
		cloth: "#a77b4f",
		skin: "#9c6849",
		hair: "#2d2826",
	},
	{
		role: "BOMBARDIER",
		name: "Moss",
		cloth: "#567d7a",
		skin: "#d5b58b",
		hair: "#a87943",
	},
	{
		role: "ENGINEER",
		name: "Brass",
		cloth: "#8a6a4c",
		skin: "#bb8c67",
		hair: "#3b302a",
	},
];
