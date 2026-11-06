import Peer from "peerjs";
export class CrewLink {
	constructor(onMessage, onStatus) {
		this.onMessage = onMessage;
		this.onStatus = onStatus;
		this.role = null;
		this.connected = false;
		this.peer = null;
		this.conn = null;
		this.channel = null;
		this.id = crypto.randomUUID();
		this.remote = null;
		this.lastHeard = 0;
		this.sent = 0;
		this.received = 0;
	}
	openChannel(code) {
		this.channel = new BroadcastChannel("cosmic-arkipelago-v1-" + code);
		this.channel.onmessage = ({ data }) => {
			if (data.sender === this.id) return;
			if (data.type === "hello" && this.role === "host") {
				this.remote = data.sender;
				this.connected = true;
				this.channel.postMessage({ sender: this.id, type: "welcome" });
				this.onStatus("Crewmate aboard. Launch when ready.");
			} else if (data.type === "welcome" && this.role === "client") {
				this.remote = data.sender;
				this.connected = true;
				this.onStatus("Connected. Waiting for the captain to launch.");
			} else if (data.sender === this.remote) this.receive(data.payload);
		};
	}
	host() {
		this.close();
		this.role = "host";
		this.code = Array.from(
			crypto.getRandomValues(new Uint8Array(6)),
			(x) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32],
		).join("");
		this.openChannel(this.code);
		this.onStatus("Room open. Share the six-character code.");
		this.connectPeer(true);
		return this.code;
	}
	join(code) {
		this.close();
		this.role = "client";
		this.code = code.trim().toUpperCase();
		if (!/^[A-Z2-9]{6}$/.test(this.code)) {
			this.role = null;
			this.onStatus("Enter the six-character code from your captain.");
			return false;
		}
		this.openChannel(this.code);
		this.channel.postMessage({ sender: this.id, type: "hello" });
		this.onStatus("Hailing the Ark…");
		this.connectPeer(false);
		return true;
	}
	connectPeer(host) {
		try {
			this.peer = new Peer(host ? "arkipelago-" + this.code : undefined, {
				debug: 0,
			});
			this.peer.on("error", (e) => {
				if (!this.connected)
					this.onStatus(
						e.type === "peer-unavailable"
							? "Room not found. Check the code and try again."
							: "Internet relay unavailable. Same-browser room play remains available.",
					);
			});
			this.peer.on("connection", (conn) => {
				if (this.conn?.open) {
					conn.close();
					return;
				}
				this.attach(conn);
			});
			if (!host)
				this.peer.on("open", () =>
					this.attach(
						this.peer.connect("arkipelago-" + this.code, { reliable: true }),
					),
				);
		} catch {
			this.onStatus("Same-browser room ready. Internet relay is unavailable.");
		}
	}
	attach(conn) {
		this.conn = conn;
		conn.on("open", () => {
			this.connected = true;
			this.lastHeard = performance.now();
			this.onStatus(
				this.role === "host"
					? "Crewmate aboard. Launch when ready."
					: "Connected. Waiting for the captain to launch.",
			);
		});
		conn.on("data", (d) => this.receive(d));
		conn.on("close", () => {
			this.connected = !!this.remote;
			this.onStatus("Crew link lost. The captain can continue solo.");
		});
		conn.on("error", () => this.onStatus("Crew link interrupted."));
	}
	receive(d) {
		if (!d || typeof d !== "object") return;
		this.lastHeard = performance.now();
		this.received++;
		this.onMessage(d);
	}
	send(d) {
		if (!this.connected) return;
		this.sent++;
		if (this.conn?.open) this.conn.send(d);
		else if (this.channel)
			this.channel.postMessage({ sender: this.id, payload: d });
	}
	close() {
		if (this.channel) this.channel.close();
		if (this.conn) this.conn.close();
		if (this.peer) this.peer.destroy();
		this.channel = null;
		this.conn = null;
		this.peer = null;
		this.connected = false;
		this.role = null;
		this.remote = null;
	}
}
