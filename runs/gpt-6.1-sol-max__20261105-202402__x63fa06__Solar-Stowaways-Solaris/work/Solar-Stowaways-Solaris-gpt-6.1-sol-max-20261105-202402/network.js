export class WingLink {
	constructor(onMessage, onStatus) {
		this.onMessage = onMessage;
		this.onStatus = onStatus;
		this.pc = null;
		this.channel = null;
		this.role = null;
		this.connected = false;
		this.status = "Two ships. One route. Highest flight score wins.";
		this.code = "";
	}
	say(s) {
		this.status = s;
		this.onStatus?.(s);
	}
	send(data) {
		if (this.channel?.readyState === "open") {
			this.channel.send(JSON.stringify(data));
			return true;
		}
		return false;
	}
	setupChannel(c) {
		this.channel = c;
		c.onopen = () => {
			this.connected = true;
			this.say(
				this.role === "host"
					? "Wing link established. Launch a new flight to start both ships."
					: "Wing link established. Waiting for the lead ship to launch.",
			);
		};
		c.onclose = () => {
			this.connected = false;
			this.say("Wing link closed. Your solo flight can continue.");
			this.onMessage({ type: "disconnect" });
		};
		c.onerror = () =>
			this.say(
				"The flight link could not carry data. Create fresh codes and retry.",
			);
		c.onmessage = (e) => {
			try {
				const d = JSON.parse(e.data);
				if (d && ["state", "begin", "finish"].includes(d.type))
					this.onMessage(d);
			} catch {}
		};
	}
	createPeer() {
		this.close();
		this.pc = new RTCPeerConnection({
			iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
		});
		this.pc.onconnectionstatechange = () => {
			if (["failed", "disconnected"].includes(this.pc.connectionState)) {
				this.connected = false;
				this.say(
					"Wing signal lost. Continue solo or exchange new flight codes.",
				);
			}
		};
		return this.pc;
	}
	async gather(pc) {
		if (pc.iceGatheringState === "complete") return;
		await new Promise((resolve) => {
			const timeout = setTimeout(resolve, 4500);
			const done = () => {
				if (pc.iceGatheringState === "complete") {
					clearTimeout(timeout);
					pc.removeEventListener("icegatheringstatechange", done);
					resolve();
				}
			};
			pc.addEventListener("icegatheringstatechange", done);
		});
	}
	encode(d) {
		return "SS1." + btoa(JSON.stringify({ type: d.type, sdp: d.sdp }));
	}
	decode(s) {
		s = s.trim();
		if (!s.startsWith("SS1."))
			throw new Error("That is not a Solar Stowaways flight code.");
		const d = JSON.parse(atob(s.slice(4)));
		if (
			!["offer", "answer"].includes(d.type) ||
			typeof d.sdp !== "string" ||
			d.sdp.length > 30000
		)
			throw new Error("The flight code is damaged. Copy the complete code.");
		return d;
	}
	async host() {
		try {
			this.say("Building lead ship code…");
			const pc = this.createPeer();
			this.role = "host";
			this.setupChannel(pc.createDataChannel("stowaways"));
			await pc.setLocalDescription(await pc.createOffer());
			await this.gather(pc);
			this.code = this.encode(pc.localDescription);
			this.say(
				"Send the lead code to your wingmate. Then paste their return code below.",
			);
			return this.code;
		} catch (e) {
			this.say(e.message);
			throw e;
		}
	}
	async join(code) {
		try {
			const d = this.decode(code);
			if (d.type !== "offer")
				throw new Error("Join needs the lead ship’s code, not a return code.");
			const pc = this.createPeer();
			this.role = "guest";
			pc.ondatachannel = (e) => this.setupChannel(e.channel);
			await pc.setRemoteDescription(d);
			await pc.setLocalDescription(await pc.createAnswer());
			await this.gather(pc);
			this.code = this.encode(pc.localDescription);
			this.say("Send this return code to the lead ship. Keep this page open.");
			return this.code;
		} catch (e) {
			this.say(e.message);
			throw e;
		}
	}
	async accept(code) {
		try {
			if (!this.pc || this.role !== "host")
				throw new Error("Create a lead code first.");
			const d = this.decode(code);
			if (d.type !== "answer")
				throw new Error("The lead ship needs a return code.");
			await this.pc.setRemoteDescription(d);
			this.say("Acquiring wing signal…");
		} catch (e) {
			this.say(e.message);
			throw e;
		}
	}
	close() {
		if (this.channel) {
			this.channel.onclose = null;
			this.channel.close();
		}
		if (this.pc) {
			this.pc.onconnectionstatechange = null;
			this.pc.close();
		}
		this.pc = null;
		this.channel = null;
		this.connected = false;
		this.code = "";
	}
}
