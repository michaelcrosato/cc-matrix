export function setupNetworkUI(
	network,
	{ toast = () => {}, onLocalCoop = () => {}, onLinked = () => {} } = {},
) {
	const $ = (id) => document.getElementById(id);
	const panel = $("netPanel");
	const status = $("netStatus");
	const hub = $("hubNet");
	const localButton = $("localCoop");
	const tabs = $("hostOnline").closest(".net-tabs");
	const lifetime = new AbortController();
	let connected = network.connected;
	let generation = 0;
	let connectionNote = null;

	function element(tag, text, properties = {}) {
		const node = document.createElement(tag);
		if (text !== undefined) node.textContent = text;
		Object.assign(node, properties);
		return node;
	}

	function paragraph(text) {
		return element("p", text, { className: "sub" });
	}

	function heading(text) {
		panel.append(element("h3", text));
	}

	function beginPanel() {
		generation++;
		panel.replaceChildren();
		panel.classList.remove("hidden");
		connectionNote = element("p", "", { className: "sub" });
		connectionNote.style.marginTop = ".8rem";
		return generation;
	}

	function field(
		label,
		{ readOnly = false, placeholder = "", multiline = true } = {},
	) {
		const id = `network-field-${generation}-${panel.querySelectorAll("input,textarea").length}`;
		const labelNode = element("label", label, { htmlFor: id });
		labelNode.style.display = "block";
		labelNode.style.marginTop = ".8rem";
		const node = element(multiline ? "textarea" : "input", undefined, {
			id,
			readOnly,
			placeholder,
			spellcheck: false,
			autocomplete: "off",
		});
		node.setAttribute("aria-label", label);
		if (!multiline) node.type = "text";
		if (readOnly) node.addEventListener("focus", () => node.select());
		panel.append(labelNode, node);
		return node;
	}

	function button(label, handler, primary = false) {
		const node = element("button", label, {
			type: "button",
			className: primary ? "small primary" : "small",
		});
		node.style.marginRight = ".5rem";
		node.style.marginTop = ".4rem";
		node.addEventListener("click", () => handler(node), {
			signal: lifetime.signal,
		});
		panel.append(node);
		return node;
	}

	function fail(error) {
		const text = error instanceof Error ? error.message : String(error);
		if (connectionNote) {
			connectionNote.textContent = text;
			if (!connectionNote.isConnected) panel.append(connectionNote);
		}
		toast(text);
	}

	async function busy(node, action) {
		const label = node.textContent;
		const panelGeneration = generation;
		node.disabled = true;
		node.textContent = "A moment…";
		try {
			await action();
		} catch (error) {
			if (generation === panelGeneration) fail(error);
		} finally {
			node.disabled = false;
			node.textContent = label;
		}
	}

	async function copy(fieldNode) {
		fieldNode.focus();
		fieldNode.select();
		try {
			if (!navigator.clipboard?.writeText)
				throw new Error("clipboard unavailable");
			await navigator.clipboard.writeText(fieldNode.value);
			toast("Copied. Send this code to your friend.");
		} catch {
			let copied = false;
			try {
				copied = document.execCommand("copy");
			} catch {
				// Selecting the entire field provides a native copy fallback.
			}
			toast(
				copied
					? "Copied. Send this code to your friend."
					: "Code selected. Use Copy or Ctrl+C.",
			);
		}
	}

	async function hostOnline() {
		if (network.active) return;
		const view = beginPanel();
		heading("1 · Invite your friend");
		panel.append(
			paragraph(
				"Make an invitation, then send the complete code to your friend using your usual messaging app. They open this same game and choose “Join with an invitation.”",
			),
		);
		const invitation = field("Your invitation", {
			readOnly: true,
			placeholder: "Your invitation will appear here.",
		});
		const make = button(
			"Make invitation",
			(node) =>
				busy(node, async () => {
					const code = await network.createOffer();
					if (generation !== view) return;
					invitation.value = code;
					invitation.focus();
					toast("Invitation ready. Send the whole code to your friend.");
				}),
			true,
		);
		button("Copy invitation", () =>
			invitation.value ? copy(invitation) : toast("Make an invitation first."),
		);
		heading("2 · Open their reply");
		panel.lastElementChild.style.marginTop = "1.3rem";
		panel.append(
			paragraph(
				"Your friend sends a reply code back. Paste it here to finish the connection.",
			),
		);
		const reply = field("Your friend’s reply", {
			placeholder: "Paste the reply code here.",
		});
		button(
			"Connect to friend",
			(node) =>
				busy(node, async () => {
					await network.acceptAnswer(reply.value);
					if (generation !== view) return;
					connectionNote.textContent =
						"Finding your friend… Keep both game windows open.";
					panel.append(connectionNote);
				}),
			true,
		);
		panel.append(
			paragraph(
				"Direct links work on many home networks. If a network blocks them, AI Hub can manage your shared session. No account is needed here.",
			),
		);
		make.focus();
	}

	function joinOnline() {
		if (network.active) return;
		const view = beginPanel();
		heading("1 · Open your invitation");
		panel.append(
			paragraph(
				"Paste the complete invitation your friend sent. Both of you need this same game open.",
			),
		);
		const invitation = field("Your friend’s invitation", {
			placeholder: "Paste the invitation code here.",
		});
		const reply = field("Your reply", {
			readOnly: true,
			placeholder: "Your reply will appear after you open the invitation.",
		});
		button(
			"Open invitation & make reply",
			(node) =>
				busy(node, async () => {
					const code = await network.acceptOffer(invitation.value);
					if (generation !== view) return;
					reply.value = code;
					connectionNote.textContent =
						"Send this whole reply to your friend. They paste it into “Open their reply.”";
					panel.append(connectionNote);
					reply.focus();
					toast("Reply ready. Send it back to your friend.");
				}),
			true,
		);
		button("Copy reply", () =>
			reply.value ? copy(reply) : toast("Open your invitation first."),
		);
		panel.append(
			paragraph(
				"2 · Send your reply back. When the link is ready, your friend can begin your shared adventure.",
			),
		);
		invitation.focus();
	}

	function sameBrowser() {
		if (network.active) return;
		beginPanel();
		heading("Two tabs, one browser");
		panel.append(
			paragraph(
				"For two game windows on this browser and address. For friends on different devices, use an online invitation or AI Hub.",
			),
		);
		const code = field("Room code", {
			readOnly: true,
			multiline: false,
			placeholder: "Create a room to get its code.",
		});
		button(
			"Create room",
			(node) =>
				busy(node, async () => {
					code.value = network.createLocalRoom();
					connectionNote.textContent =
						"Open this game in another tab, choose “Connect another tab,” and enter this room code.";
					panel.append(connectionNote);
					code.focus();
				}),
			true,
		);
		button("Copy room code", () =>
			code.value ? copy(code) : toast("Create a room first."),
		);
		const join = field("Or join an existing room", {
			multiline: false,
			placeholder: "Eight-character room code",
		});
		join.maxLength = 16;
		const joinButton = button(
			"Join room",
			(node) =>
				busy(node, async () => {
					network.joinLocalRoom(join.value);
					connectionNote.textContent = "Looking for the other tab…";
					panel.append(connectionNote);
				}),
			true,
		);
		join.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				joinButton.click();
			}
		});
		join.focus();
	}

	function refresh() {
		const active = network.active;
		hub.classList.toggle("hidden", !active);
		tabs.classList.toggle("hidden", active);
		localButton.closest(".net-box").classList.toggle("hidden", active);
		localButton.disabled = active;
		if (active) {
			hub.textContent =
				"AI Hub has your friends together already. Both players share the little visitor, the transmitter pieces, and the way home. AI Hub starts and ends this round.";
			panel.classList.add("hidden");
		}
		const dot = element("span", undefined, { className: "status-dot" });
		status.replaceChildren(dot, document.createTextNode(network.status()));
		if (network.connected && !connected) {
			if (connectionNote && !active) {
				connectionNote.textContent = network.isHost
					? "Your friend is here. Go back and begin the story together."
					: "You’re connected. Your friend can begin the story.";
				panel.append(connectionNote);
			}
			onLinked(network.info());
		}
		connected = network.connected;
	}

	$("hostOnline").addEventListener("click", hostOnline, {
		signal: lifetime.signal,
	});
	$("joinOnline").addEventListener("click", joinOnline, {
		signal: lifetime.signal,
	});
	$("sameBrowser").addEventListener("click", sameBrowser, {
		signal: lifetime.signal,
	});
	localButton.addEventListener(
		"click",
		() => {
			if (!network.active) onLocalCoop();
		},
		{ signal: lifetime.signal },
	);
	panel.addEventListener(
		"keydown",
		(event) => {
			if (event.target.matches("textarea,input")) event.stopPropagation();
		},
		{ signal: lifetime.signal },
	);
	const timer = setInterval(refresh, 500);
	refresh();
	return {
		refresh,
		destroy() {
			clearInterval(timer);
			lifetime.abort();
		},
	};
}
