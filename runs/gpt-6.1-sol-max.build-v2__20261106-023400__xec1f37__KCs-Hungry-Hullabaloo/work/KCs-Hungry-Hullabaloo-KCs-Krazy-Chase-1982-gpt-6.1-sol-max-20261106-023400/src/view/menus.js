const E = globalThis.My3D2dge;
export const COLORS = {
	ink: "#0b1929",
	panel: "#112a3b",
	edge: "#466f79",
	cream: "#ffefd0",
	gold: "#ffd184",
	muted: "#a7c6cd",
	blue: "#85d7ec",
};
export const ascii = (s) =>
	String(s).replace(/[’‘]/g, "'").replace(/[–—]/g, "-").replace(/×/g, "x");
export function nativeMenu(
	game,
	items,
	onPick,
	{
		x = "center",
		y = "center",
		scale = 2,
		rows = 6,
		onCancel = null,
		title = null,
	} = {},
) {
	return new E.Menu(game, items, {
		x,
		y,
		scale,
		rows,
		title,
		onPick,
		onCancel,
		box: false,
		color: COLORS.cream,
		pick: COLORS.gold,
		dim: "#607f8c",
		bg: COLORS.panel,
		border: COLORS.edge,
	});
}
export function panel(
	r,
	title,
	body = "",
	{
		x = 24,
		y = 28,
		w = r.W - 48,
		h = r.H - 56,
		scale = 2,
		kicker = "",
		align = "left",
	} = {},
) {
	r.overlay((g) => {
		E.ui.box(g, x, y, w, h, {
			bg: ["#173748", "#0e2336"],
			border: COLORS.edge,
		});
		E.px.rect(g, x + 1, y + 1, w - 2, 2, COLORS.blue);
		if (kicker)
			E.font.text(g, ascii(kicker.toUpperCase()), x + 16, y + 12, COLORS.blue, {
				outline: false,
			});
		E.font.title(
			g,
			ascii(title),
			align === "center" ? x + w / 2 : x + 16,
			y + (kicker ? 29 : 16),
			{ scale, align, colors: [COLORS.cream, COLORS.gold], depth: 1 },
		);
		if (body)
			E.font.text(
				g,
				ascii(body),
				x + 16,
				y + (kicker ? 60 : 48),
				COLORS.cream,
				{ scale, outline: false, shadow: "#081626", wrap: w - 32 },
			);
	});
}
export function dim(r, alpha = 0.74) {
	r.overlay((g) =>
		E.px.blend(g, alpha, "normal", () =>
			E.px.rect(g, 0, 0, r.W, r.H, "#071421"),
		),
	);
}
export function text(r, s, x, y, color = COLORS.cream, o = {}) {
	r.text(ascii(s), x, y, color, { outline: false, shadow: "#091526", ...o });
}
export class NamePicker {
	constructor(value, onDone, onCancel) {
		this.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -!";
		this.value = ascii(value)
			.toUpperCase()
			.slice(0, 10)
			.padEnd(10, " ")
			.split("");
		this.i = 0;
		this.onDone = onDone;
		this.onCancel = onCancel;
		this.label = "Name your garden";
	}
	type(key) {
		if (key === "Backspace") {
			this.value[this.i] = " ";
			this.i = Math.max(0, this.i - 1);
			return;
		}
		const k = key.toUpperCase();
		if (k.length === 1 && this.chars.includes(k)) {
			this.value[this.i] = k;
			this.i = Math.min(9, this.i + 1);
		}
	}
	update(I, W, H) {
		if (I.pressed("cancel")) {
			this.onCancel();
			return;
		}
		if (I.repeat("left")) this.i = Math.max(0, this.i - 1);
		if (I.repeat("right")) this.i = Math.min(9, this.i + 1);
		for (const [action, step] of [
			["up", 1],
			["down", -1],
		])
			if (I.repeat(action))
				this.value[this.i] =
					this.chars[
						(this.chars.indexOf(this.value[this.i]) +
							step +
							this.chars.length) %
							this.chars.length
					];
		if (I.pressed("confirm")) {
			if (this.i < 9) this.i++;
			else this.onDone(this.value.join("").trim() || "MOONMINT");
		}
		const c = I.clicked();
		if (c) {
			const x = W / 2 - 120;
			if (
				c[1] >= H / 2 - 12 &&
				c[1] < H / 2 + 30 &&
				c[0] >= x &&
				c[0] < x + 240
			)
				this.i = Math.floor((c[0] - x) / 24);
			else if (c[1] > H / 2 + 45)
				this.onDone(this.value.join("").trim() || "MOONMINT");
		}
	}
	draw(r) {
		dim(r, 0.9);
		panel(r, this.label, "Up / down changes a letter. Left / right moves.", {
			y: r.H / 2 - 90,
			h: 190,
			scale: 2,
		});
		r.overlay((g) => {
			for (let i = 0; i < 10; i++) {
				const x = r.W / 2 - 120 + i * 24;
				E.px.rect(
					g,
					x,
					r.H / 2 - 6,
					21,
					26,
					i === this.i ? "#416470" : "#173344",
				);
				E.font.text(
					g,
					this.value[i],
					x + 10,
					r.H / 2 + 1,
					i === this.i ? COLORS.gold : COLORS.cream,
					{ scale: 2, align: "center", outline: false },
				);
			}
			E.font.text(
				g,
				"CONFIRM EACH LETTER  /  TAP HERE TO SAVE",
				r.W / 2,
				r.H / 2 + 55,
				COLORS.gold,
				{ align: "center", outline: false },
			);
		});
	}
}
