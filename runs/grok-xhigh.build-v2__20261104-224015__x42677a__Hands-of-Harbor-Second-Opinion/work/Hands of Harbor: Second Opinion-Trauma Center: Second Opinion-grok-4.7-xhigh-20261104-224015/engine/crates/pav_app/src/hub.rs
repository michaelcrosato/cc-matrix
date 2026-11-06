//! Polls the page's `__hub` shim. Native builds stay idle: there is no session.

use pav_core::input::SurgeonInput;

#[derive(Clone, Debug)]
pub struct Boot {
    pub seed: u32,
    pub slots: Vec<u8>,
    pub server: bool,
    pub mirror: bool,
}

#[derive(Clone, Debug)]
pub struct Snap {
    pub vitals: f32,
    pub bpm: f32,
    pub phase: f32,
    pub flat: bool,
    pub timer: f32,
    pub code_t: f32,
    pub hazards: Vec<(u32, u8, f32, f32, bool, u8, f32)>,
    pub cursors: Vec<(u8, f32, f32, u8, bool, i32)>,
    pub bucket: i32,
}

#[derive(Clone, Copy, Debug)]
pub struct Dom {
    pub x: f32,
    pub y: f32,
    pub use_on: bool,
}

#[derive(Clone, Debug)]
pub struct View {
    pub active: bool,
    pub server: bool,
    pub host: bool,
    pub play: bool,
    pub ended: bool,
    pub slot: u8,
    pub boot: Option<Boot>,
    pub snap: Option<Snap>,
    pub remote: [Option<SurgeonInput>; 4],
    pub dom: Option<Dom>,
    pub card_lines: Vec<String>,
    pub present: Vec<u8>,
    /// `AIHub.time()` in milliseconds. Negative before the round clock starts.
    pub time_ms: f32,
}

impl View {
    fn idle() -> Self {
        Self {
            active: false,
            server: false,
            host: false,
            play: false,
            ended: false,
            slot: 0,
            boot: None,
            snap: None,
            remote: [None, None, None, None],
            dom: None,
            card_lines: Vec::new(),
            present: Vec::new(),
            time_ms: -1.0,
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub struct Link;

#[cfg(not(target_arch = "wasm32"))]
impl Link {
    pub fn new() -> Self {
        Self
    }
    pub fn poll(&mut self, _dt: f32) -> View {
        View::idle()
    }
    pub fn send_input(&mut self, _hand: &SurgeonInput) {}
    pub fn send_snap(&mut self, _body: &str) -> bool {
        false
    }
    pub fn publish(&mut self, _body: &str) {}
}

#[cfg(target_arch = "wasm32")]
mod js {
    use super::{Dom, Snap};
    use pav_core::input::{surg, SurgeonInput};
    use wasm_bindgen::JsCast;

    pub struct Link {
        pub joined: bool,
        pub readied: bool,
        pub server: bool,
        pub host: bool,
        pub play: bool,
        /// The start message has arrived. Snapshots and hands go out during
        /// the countdown; the operation still waits until the hub clock is zero.
        pub armed: bool,
        pub ended: bool,
        pub booted: bool,
        pub slot: u8,
        pub seed: u32,
        pub names: Vec<(u8, String)>,
        pub present: Vec<u8>,
        pub ready_ids: Vec<u8>,
        pub remote: [Option<SurgeonInput>; 4],
        pub remote_age: [f32; 4],
        pub remote_seq: [u32; 4],
        pub card_lines: Vec<String>,
        pub pending_snap: Option<Snap>,
        pub send_acc: f32,
        pub seq: u32,
        pub prev_held: u32,
        pub prev_tool: u8,
        pub latch_pressed: u32,
        pub latch_left: u8,
        pub snap_acc: f32,
        pub frame_dt: f32,
        pub did_snap: bool,
        pub did_input: bool,
    }

    impl Link {
        pub fn new() -> Self {
            Self {
                joined: false,
                readied: false,
                server: false,
                host: false,
                play: false,
                armed: false,
                ended: false,
                booted: false,
                slot: 0,
                seed: 1,
                names: Vec::new(),
                present: Vec::new(),
                ready_ids: Vec::new(),
                remote: [None, None, None, None],
                remote_age: [1.0; 4],
                remote_seq: [0; 4],
                card_lines: Vec::new(),
                pending_snap: None,
                send_acc: 0.0,
                seq: 1,
                prev_held: 0,
                prev_tool: 0,
                latch_pressed: 0,
                latch_left: 0,
                snap_acc: 0.0,
                frame_dt: 0.0,
                did_snap: false,
                did_input: false,
            }
        }

        pub fn poll(&mut self, dt: f32) -> super::View {
            self.frame_dt = dt;
            let Some(hub) = hub_obj() else {
                return super::View::idle();
            };
            if !flag(&hub, "active") {
                return super::View::idle();
            }
            if !self.joined {
                if let Some(info) = json_field(&hub, "info") {
                    self.take_info(&info);
                }
            }
            if self.joined && !self.readied {
                let _ = call(&hub, "ready", &[]);
                self.readied = true;
            }
            if let Some(text) = call(&hub, "poll", &[]).and_then(|v| v.as_string()) {
                if let Ok(events) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
                    for ev in events {
                        self.on_event(&ev);
                    }
                }
            }
            let t = call(&hub, "time", &[]).and_then(|v| v.as_f64()).unwrap_or(f64::NEG_INFINITY);
            // -Infinity before start. A negative finite value is the countdown.
            if self.joined && !self.ended && t.is_finite() {
                self.armed = true;
            }
            if self.armed && t >= 0.0 {
                self.play = true;
            }
            for i in 0..4 {
                self.remote_age[i] += dt;
                if self.remote_age[i] > 0.35 {
                    self.remote[i] = None;
                }
            }
            let boot = if self.play && !self.booted && self.joined {
                self.booted = true;
                Some(super::Boot {
                    seed: self.seed,
                    slots: self.present.clone(),
                    server: self.server,
                    mirror: !self.host,
                })
            } else {
                None
            };
            super::View {
                active: true,
                server: self.server,
                host: self.host,
                play: self.play,
                ended: self.ended,
                slot: self.slot,
                boot,
                snap: self.pending_snap.take(),
                remote: self.remote,
                dom: read_dom(&hub),
                card_lines: self.card_lines.clone(),
                present: self.present.clone(),
                time_ms: if t.is_finite() { t as f32 } else { -1.0 },
            }
        }

        pub fn send_input(&mut self, hand: &SurgeonInput) {
            if !self.armed || self.ended || self.server || !self.joined {
                return;
            }
            let edge = hand.held & !self.prev_held;
            if hand.tool != self.prev_tool || edge != 0 {
                self.seq = self.seq.wrapping_add(1);
                self.latch_pressed |= edge;
                self.latch_left = 4;
            }
            self.prev_held = hand.held;
            self.prev_tool = hand.tool;
            // Iframes often paint far below 60 Hz. Count real time, and always send the first hand.
            self.send_acc += self.frame_dt.max(0.0);
            if self.did_input && self.send_acc < 1.0 / 15.0 && edge == 0 {
                return;
            }
            self.did_input = true;
            self.send_acc = 0.0;
            let body = serde_json::json!({
                "k": "i",
                "s": self.slot,
                "x": (hand.aim.x * 100.0).round() / 100.0,
                "z": (hand.aim.y * 100.0).round() / 100.0,
                "abs": if hand.held & surg::AIM_ABSOLUTE != 0 { 1 } else { 0 },
                "snap": if hand.held & surg::SNAP != 0 { 1 } else { 0 },
                "t": hand.tool,
                "h": hand.held,
                "pr": hand.pressed | self.latch_pressed,
                "p": (hand.pressure * 100.0).round() / 100.0,
                "n": self.seq,
            })
            .to_string();
            if self.latch_left > 0 {
                self.latch_left -= 1;
                if self.latch_left == 0 {
                    self.latch_pressed = 0;
                }
            }
            self.send_json(&body);
        }

        /// True only when this body was handed to the shim. Callers latch vitals on that.
        pub fn send_snap(&mut self, body: &str) -> bool {
            if !self.armed || self.ended || !self.host || !self.joined {
                return false;
            }
            self.snap_acc += self.frame_dt.max(0.0);
            if self.did_snap && self.snap_acc < 1.0 / 15.0 {
                return false;
            }
            self.did_snap = true;
            self.snap_acc = 0.0;
            if body.len() > 1400 {
                return false;
            }
            self.send_json(body);
            true
        }

        pub fn publish(&mut self, body: &str) {
            if !self.joined || self.ended {
                return;
            }
            let Some(hub) = hub_obj() else { return };
            let _ = call(&hub, "publish", &[wasm_bindgen::JsValue::from_str(body)]);
        }

        fn send_json(&self, body: &str) {
            let Some(hub) = hub_obj() else { return };
            let _ = call(&hub, "send", &[wasm_bindgen::JsValue::from_str(body)]);
        }

        fn take_info(&mut self, info: &serde_json::Value) {
            self.joined = true;
            self.server = info.get("server").and_then(|v| v.as_bool()).unwrap_or(false);
            self.slot = info.get("me").and_then(|v| v.as_u64()).unwrap_or(0).min(255) as u8;
            let host = info.get("host").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
            self.host = self.server || self.slot == host || info.get("isHost").and_then(|v| v.as_bool()).unwrap_or(false);
            self.seed = info.get("seed").and_then(|v| v.as_u64()).unwrap_or(1) as u32;
            self.names.clear();
            self.present.clear();
            if let Some(players) = info.get("players").and_then(|v| v.as_array()) {
                for p in players {
                    let id = p.get("id").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
                    let name = p.get("name").and_then(|v| v.as_str()).unwrap_or("Surgeon").to_string();
                    if (id as usize) < 4 && !self.present.contains(&id) {
                        self.present.push(id);
                        self.names.push((id, name));
                    }
                }
            }
            if self.present.is_empty() && !self.server && (self.slot as usize) < 4 {
                self.present.push(self.slot);
            }
            self.rebuild_card();
        }

        fn on_event(&mut self, ev: &serde_json::Value) {
            let Some(arr) = ev.as_array() else { return };
            let kind = arr.first().and_then(|v| v.as_str()).unwrap_or("");
            match kind {
                "card" => {
                    self.ready_ids.clear();
                    if let Some(ids) = arr.get(1).and_then(|v| v.get("ready")).and_then(|v| v.as_array()) {
                        for id in ids {
                            if let Some(n) = id.as_u64() {
                                self.ready_ids.push(n as u8);
                            }
                        }
                    }
                    self.rebuild_card();
                }
                "message" => {
                    if let Some(data) = arr.get(1) {
                        self.on_message(data);
                    }
                }
                "leave" => {
                    if let Some(id) = arr.get(1).and_then(|v| v.get("id")).and_then(|v| v.as_u64()) {
                        let id = id as u8;
                        self.present.retain(|p| *p != id);
                        self.names.retain(|(i, _)| *i != id);
                        if (id as usize) < 4 {
                            self.remote[id as usize] = None;
                        }
                        self.rebuild_card();
                    }
                }
                "end" => self.ended = true,
                _ => {}
            }
        }

        fn on_message(&mut self, data: &serde_json::Value) {
            let kind = data.get("k").and_then(|v| v.as_str()).unwrap_or("");
            if kind == "i" && self.host {
                let slot = data.get("s").and_then(|v| v.as_u64()).unwrap_or(9) as usize;
                if slot >= 4 || (!self.server && slot == self.slot as usize) {
                    return;
                }
                let mut held = data.get("h").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                if data.get("abs").and_then(|v| v.as_u64()).unwrap_or(0) != 0 {
                    held |= surg::AIM_ABSOLUTE;
                }
                if data.get("snap").and_then(|v| v.as_u64()).unwrap_or(0) != 0 {
                    held |= surg::SNAP;
                }
                let seq = data.get("n").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                let pressed = if seq != self.remote_seq[slot] {
                    self.remote_seq[slot] = seq;
                    data.get("pr").and_then(|v| v.as_u64()).unwrap_or(0) as u32
                } else {
                    0
                };
                let x = data.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                let z = data.get("z").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                self.remote[slot] = Some(SurgeonInput {
                    active: true,
                    aim: glam::Vec2::new(x, z),
                    held,
                    pressed,
                    tool: data.get("t").and_then(|v| v.as_u64()).unwrap_or(255) as u8,
                    pressure: data.get("p").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32,
                });
                self.remote_age[slot] = 0.0;
            } else if kind == "s" && !self.host {
                self.pending_snap = Some(parse_snap(data));
            }
        }

        fn rebuild_card(&mut self) {
            self.card_lines.clear();
            self.card_lines.push("Night Intake  ·  Code Blue".into());
            for (id, name) in &self.names {
                let mark = if self.ready_ids.contains(id) { "  ready" } else { "" };
                self.card_lines.push(format!("{name}{mark}"));
            }
            self.card_lines.push("Enter answers ready".into());
        }
    }

    fn parse_snap(data: &serde_json::Value) -> Snap {
        let num = |k: &str, d: f64| data.get(k).and_then(|v| v.as_f64()).unwrap_or(d) as f32;
        let mut hazards = Vec::new();
        if let Some(rows) = data.get("h").and_then(|v| v.as_array()) {
            for row in rows.iter().take(16) {
                let Some(a) = row.as_array() else { continue };
                let at = |i: usize| a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0);
                hazards.push((at(0) as u32, at(1) as u8, at(2) as f32, at(3) as f32, at(4) > 0.5, at(5) as u8, at(6) as f32));
            }
        }
        let mut cursors = Vec::new();
        if let Some(rows) = data.get("u").and_then(|v| v.as_array()) {
            for row in rows {
                let Some(a) = row.as_array() else { continue };
                let at = |i: usize| a.get(i).and_then(|v| v.as_f64()).unwrap_or(0.0);
                cursors.push((at(0) as u8, at(1) as f32, at(2) as f32, at(3) as u8, at(4) > 0.5, at(5) as i32));
            }
        }
        Snap {
            vitals: num("v", 70.0),
            bpm: num("b", 80.0),
            phase: num("p", 0.0),
            flat: num("f", 0.0) > 0.5,
            timer: num("tm", 240.0),
            code_t: num("cd", -1.0),
            hazards,
            cursors,
            bucket: data.get("bb").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
        }
    }

    fn hub_obj() -> Option<wasm_bindgen::JsValue> {
        let win = web_sys::window()?;
        let hub = js_sys::Reflect::get(&win, &"__hub".into()).ok()?;
        if hub.is_undefined() || hub.is_null() { None } else { Some(hub) }
    }

    fn flag(hub: &wasm_bindgen::JsValue, name: &str) -> bool {
        js_sys::Reflect::get(hub, &name.into()).ok().and_then(|v| v.as_bool()).unwrap_or(false)
    }

    fn call(hub: &wasm_bindgen::JsValue, name: &str, args: &[wasm_bindgen::JsValue]) -> Option<wasm_bindgen::JsValue> {
        let f = js_sys::Reflect::get(hub, &name.into()).ok()?;
        let f = f.dyn_into::<js_sys::Function>().ok()?;
        let arr = js_sys::Array::new();
        for a in args {
            arr.push(a);
        }
        f.apply(hub, &arr).ok()
    }

    fn json_field(hub: &wasm_bindgen::JsValue, name: &str) -> Option<serde_json::Value> {
        let v = js_sys::Reflect::get(hub, &name.into()).ok()?;
        if v.is_null() || v.is_undefined() {
            return None;
        }
        let text = js_sys::JSON::stringify(&v).ok()?.as_string()?;
        serde_json::from_str(&text).ok()
    }

    fn read_dom(hub: &wasm_bindgen::JsValue) -> Option<Dom> {
        let text = call(hub, "dom", &[])?.as_string()?;
        let v: serde_json::Value = serde_json::from_str(&text).ok()?;
        let x = v.get("x").and_then(|n| n.as_f64()).unwrap_or(0.0) as f32;
        let y = v.get("y").and_then(|n| n.as_f64()).unwrap_or(0.0) as f32;
        let use_on = v.get("use").and_then(|n| n.as_bool()).unwrap_or(false);
        if x == 0.0 && y == 0.0 && !use_on { None } else { Some(Dom { x, y, use_on }) }
    }
}

#[cfg(target_arch = "wasm32")]
pub use js::Link;
