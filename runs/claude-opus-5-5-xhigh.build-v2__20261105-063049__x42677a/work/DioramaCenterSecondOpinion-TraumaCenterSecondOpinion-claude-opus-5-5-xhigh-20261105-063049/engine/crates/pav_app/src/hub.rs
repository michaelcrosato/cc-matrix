//! The page's side of things: the AI Hub session, the test hook, storage, rumble. All JS goes
//! through `js_sys::Reflect` on `window`: the packer rejects wasm-bindgen snippets.

use std::collections::BTreeMap;

use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
#[cfg(target_arch = "wasm32")]
use pav_core::games::surgery::net;
use pav_core::input::SurgeonInput;
#[cfg(target_arch = "wasm32")]
use pav_core::input::{SurgeryCmd, hands};
#[cfg(target_arch = "wasm32")]
use pav_ui::surgery::{HubCard, Screen};
use serde_json::{Value, json};

use crate::app::App;
use crate::product::PadState;

/// What the test hook has queued.
#[derive(Default)]
pub struct Hook {
    pub installed: bool,
}

/// A hub round as this copy sees it.
#[derive(Default)]
pub struct Hub {
    pub active: bool,
    pub connected: bool,
    pub me: Option<usize>,
    pub host: bool,
    pub server: bool,
    pub players: Vec<(u32, String)>,
    pub seed: u64,
    pub started: bool,
    pub advanced: bool,
    pub ready_sent: bool,
    pub ended: bool,
    pub finished: bool,
    pub send_t: f32,
    pub publish_t: f32,
    pub cue_serial: u32,
    pub cues: Vec<(u32, u16, f32, f32)>,
    pub seen_cues: u32,
    pub remote: BTreeMap<u32, SurgeonInput>,
    pub local: SurgeonInput,
    pub gone: Vec<u32>,
    pub mirror: SurgeryFrame,
    pub last_time: Option<web_time::Instant>,
}

impl Hub {
    pub fn new() -> Self {
        Self { active: js_active(), ..Default::default() }
    }
    pub fn active(&self) -> bool {
        self.active
    }
    pub fn server(&self) -> bool {
        self.server
    }
    pub fn ended(&self) -> bool {
        self.ended
    }
    pub fn my_seat(&self) -> Option<usize> {
        if self.active { self.me } else { None }
    }
    /// Remembers cue events for the snapshots, with serials so clients can de-duplicate.
    pub fn note_cue(&mut self, id: u16, x: f32, z: f32) {
        if !self.active || !self.host {
            return;
        }
        self.cue_serial += 1;
        self.cues.push((self.cue_serial, id, x, z));
        if self.cues.len() > 8 {
            self.cues.remove(0);
        }
    }
    pub fn local_input(&mut self, out: &[SurgeonInput; 4]) {
        if let Some(me) = self.me {
            self.local = out[me.min(3)];
        }
    }
}

#[cfg(target_arch = "wasm32")]
mod js {
    use js_sys::{Function, JSON, Object, Reflect};
    use wasm_bindgen::prelude::*;

    fn window() -> Option<web_sys::Window> {
        web_sys::window()
    }
    pub fn hub() -> Option<JsValue> {
        let w = window()?;
        let h = Reflect::get(&w, &"__hub".into()).ok()?;
        (!h.is_undefined() && !h.is_null()).then_some(h)
    }
    pub fn get_bool(o: &JsValue, k: &str) -> bool {
        Reflect::get(o, &k.into()).ok().and_then(|v| v.as_bool()).unwrap_or(false)
    }
    pub fn call0(o: &JsValue, k: &str) -> Option<JsValue> {
        let f = Reflect::get(o, &k.into()).ok()?;
        let f: Function = f.dyn_into().ok()?;
        f.call0(o).ok()
    }
    pub fn call1(o: &JsValue, k: &str, a: &JsValue) -> Option<JsValue> {
        let f = Reflect::get(o, &k.into()).ok()?;
        let f: Function = f.dyn_into().ok()?;
        f.call1(o, a).ok()
    }
    pub fn call2(o: &JsValue, k: &str, a: &JsValue, b: &JsValue) -> Option<JsValue> {
        let f = Reflect::get(o, &k.into()).ok()?;
        let f: Function = f.dyn_into().ok()?;
        f.call2(o, a, b).ok()
    }
    pub fn json_of(v: &JsValue) -> Option<String> {
        JSON::stringify(v).ok().and_then(|s| s.as_string())
    }
    pub fn make_object() -> Object {
        Object::new()
    }
}

#[cfg(target_arch = "wasm32")]
fn js_active() -> bool {
    js::hub().is_some_and(|h| js::get_bool(&h, "active"))
}
#[cfg(not(target_arch = "wasm32"))]
fn js_active() -> bool {
    false
}

/// The player's save.
#[cfg(target_arch = "wasm32")]
pub fn load_text() -> Option<String> {
    web_sys::window()?.local_storage().ok()??.get_item("surgery-save").ok()?
}
#[cfg(target_arch = "wasm32")]
pub fn save_text(t: &str) {
    if let Some(s) = web_sys::window().and_then(|w| w.local_storage().ok().flatten()) {
        let _ = s.set_item("surgery-save", t);
    }
}
#[cfg(not(target_arch = "wasm32"))]
pub fn load_text() -> Option<String> {
    std::fs::read_to_string(crate::boot::exe_dir().join("surgery-save.json")).ok()
}
#[cfg(not(target_arch = "wasm32"))]
pub fn save_text(t: &str) {
    let _ = std::fs::write(crate::boot::exe_dir().join("surgery-save.json"), t);
}

/// The page's `about-data` block, if it has one.
#[cfg(target_arch = "wasm32")]
pub fn about_json() -> Option<String> {
    let d = web_sys::window()?.document()?;
    d.get_element_by_id("about-data")?.text_content()
}
#[cfg(not(target_arch = "wasm32"))]
pub fn about_json() -> Option<String> {
    None
}

/// Does this device have a fine pointer (a mouse)?
#[cfg(target_arch = "wasm32")]
pub fn fine_pointer() -> bool {
    web_sys::window().and_then(|w| w.match_media("(any-pointer: fine)").ok().flatten()).is_some_and(|m| m.matches())
}
#[cfg(not(target_arch = "wasm32"))]
pub fn fine_pointer() -> bool {
    true
}

/// Rumble: the page's helper, on every pad.
#[cfg(target_arch = "wasm32")]
pub fn rumble(pads: &[PadState], strong: f32, weak: f32, ms: u32, on: bool) {
    if !on || pads.is_empty() {
        return;
    }
    let Some(w) = web_sys::window() else { return };
    let Ok(f) = js_sys::Reflect::get(&w, &"__rumble".into()) else { return };
    let Ok(f) = wasm_bindgen::JsCast::dyn_into::<js_sys::Function>(f) else { return };
    let _ = f.call3(&w, &strong.into(), &weak.into(), &ms.into());
}
#[cfg(not(target_arch = "wasm32"))]
pub fn rumble(_pads: &[PadState], _strong: f32, _weak: f32, _ms: u32, _on: bool) {}

/// A card answer.
#[cfg(target_arch = "wasm32")]
pub fn answer(what: &str) {
    if let Some(h) = js::hub() {
        js::call1(&h, "answer", &what.into());
    }
}
#[cfg(not(target_arch = "wasm32"))]
pub fn answer(_what: &str) {}

#[cfg(target_arch = "wasm32")]
fn hub_time(h: &wasm_bindgen::JsValue) -> f64 {
    js::call0(h, "time").and_then(|v| v.as_f64()).unwrap_or(f64::NEG_INFINITY)
}

#[cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]
fn parse_info(hub: &mut Hub, info: &Value) {
    hub.me = info["me"].as_u64().map(|v| v as usize);
    hub.host = info["isHost"].as_bool().unwrap_or(false);
    hub.server = info["server"].as_bool().unwrap_or(false);
    hub.seed = info["seed"].as_f64().unwrap_or(1.0) as u64;
    hub.players = info["players"]
        .as_array()
        .map(|a| a.iter().map(|p| (p["id"].as_u64().unwrap_or(0) as u32, p["name"].as_str().unwrap_or("").to_string())).collect())
        .unwrap_or_default();
    if hub.server {
        hub.me = None;
    }
}

#[cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]
fn seat_mask(hub: &Hub) -> u8 {
    let mut m = 0u8;
    for (id, _) in &hub.players {
        if !hub.gone.contains(id) && *id < 4 {
            m |= 1 << id;
        }
    }
    m
}

/// The standings as the hub wants them.
#[cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]
fn standings(hub: &Hub, f: &SurgeryFrame) -> Value {
    let mut list: Vec<(u32, i32)> = hub
        .players
        .iter()
        .filter(|(id, _)| !hub.gone.contains(id))
        .map(|(id, _)| (*id, f.surgeons.get(*id as usize).map(|s| s.score).unwrap_or(0)))
        .collect();
    list.sort_by_key(|x| -x.1);
    let standings: Vec<Value> = list.iter().map(|(id, _)| json!([id])).collect();
    let scores: serde_json::Map<String, Value> = list.iter().map(|(id, s)| (id.to_string(), json!(s))).collect();
    let won = f.vitals > 0.0 && f.stage != Stage::Dead;
    let best = list.first().copied();
    let awards: Vec<Value> = best
        .filter(|b| b.1 > 0)
        .map(|b| json!({"id": b.0, "title": "Immaculate Hands", "detail": format!("{} points at the table", b.1)}))
        .into_iter()
        .collect();
    let mut stats = serde_json::Map::new();
    for (id, _) in &list {
        if let Some(s) = f.surgeons.get(*id as usize) {
            stats.insert(id.to_string(), json!({"Best chain": s.chain, "Score": s.score}));
        }
    }
    json!({"standings": standings, "scores": scores, "won": won, "stats": stats, "awards": awards})
}

/// Runs the session side of a frame.
#[cfg(target_arch = "wasm32")]
pub fn update(app: &mut App, frame: &SurgeryFrame) {
    use wasm_bindgen::JsValue;
    let Some(p) = app.product.as_mut() else { return };
    if !p.hub.active {
        return;
    }
    let Some(h) = js::hub() else {
        p.hub.active = false;
        return;
    };
    if !js::get_bool(&h, "active") {
        // `connect` answered null: run as on its own.
        p.hub.active = false;
        p.shell.hub_active = false;
        if p.shell.screen == Screen::Card {
            p.shell.go(Screen::Title);
        }
        return;
    }
    p.shell.hub_active = true;
    // Connected?
    if !p.hub.connected {
        let info = js_sys::Reflect::get(&h, &"info".into()).unwrap_or(JsValue::NULL);
        if info.is_null() || info.is_undefined() {
            if p.shell.screen != Screen::Card {
                p.shell.screen = Screen::Card;
                p.shell.hub_card = Some(HubCard::default());
            }
            return;
        }
        let v: Value = js::json_of(&info).and_then(|t| serde_json::from_str(&t).ok()).unwrap_or(Value::Null);
        parse_info(&mut p.hub, &v);
        p.hub.connected = true;
        let card = HubCard { players: p.hub.players.clone(), me: p.hub.me.map(|m| m as u32), ..Default::default() };
        p.shell.hub_card = Some(card);
        p.shell.screen = Screen::Card;
        p.shell.load("surgery/card");
        return;
    }
    if !p.hub.ready_sent {
        p.hub.ready_sent = true;
        js::call0(&h, "ready");
        if let Some(a) = &app.audio {
            a.resume();
        }
    }
    // Events.
    let text = js::call0(&h, "poll").and_then(|v| v.as_string()).unwrap_or_default();
    let events: Vec<Value> = serde_json::from_str(&text).unwrap_or_default();
    let mut start = false;
    let mut mirror_frames = Vec::new();
    for e in &events {
        match e[0].as_str().unwrap_or("") {
            "card" => {
                let d = &e[1];
                if let Some(c) = p.shell.hub_card.as_mut() {
                    c.left_ms = d["left"].as_f64();
                    c.paused = d["paused"].as_bool().unwrap_or(false);
                    c.starting = d["starting"].as_bool().unwrap_or(false);
                    c.asking = d["asking"].as_u64().unwrap_or(0) as u32;
                    c.asked = d["asked"].as_bool().unwrap_or(false);
                    c.ready = d["ready"]
                        .as_array()
                        .map(|a| a.iter().filter_map(|x| x.as_u64()).map(|x| x as u32).collect())
                        .unwrap_or_default();
                }
            }
            "start" => start = true,
            "leave" => {
                if let Some(id) = e[1]["id"].as_u64() {
                    p.hub.gone.push(id as u32);
                    p.hub.remote.remove(&(id as u32));
                    if p.hub.host {
                        let m = seat_mask(&p.hub);
                        if let Some(host) = &app.host {
                            host.shared.surgery_cmds.lock().unwrap().push_back(SurgeryCmd::Seats(m));
                        }
                    }
                }
            }
            "message" => {
                let from = e[2].as_u64().unwrap_or(0) as u32;
                let d = &e[1];
                if p.hub.host {
                    if let Some(i) = d.get("i") {
                        let prev = p.hub.remote.get(&from).copied().unwrap_or_default();
                        let mut inp = net::decode_input(i);
                        inp.pressed = inp.held & !prev.held;
                        if inp.held & hands::CANCEL != 0 {
                            inp.pressed |= hands::CANCEL;
                        }
                        p.hub.remote.insert(from, inp);
                    }
                } else if d.get("s").is_some() {
                    mirror_frames.push(d.clone());
                }
            }
            "time-up" => {}
            "end" => {
                p.hub.ended = true;
                if let Some(a) = &app.audio {
                    a.silence();
                }
            }
            _ => {}
        }
    }
    if p.hub.ended {
        return;
    }
    if start && !p.hub.started {
        p.hub.started = true;
        let is_host = p.hub.host;
        let seed = p.hub.seed.max(1);
        let scene = if is_host { "surgery/codeblue" } else { "surgery/mirror" };
        p.shell.screen = Screen::Session;
        p.shell.scene = scene.to_string();
        app.load_surgery_scene(scene, seed);
        let p = app.product.as_mut().unwrap();
        if is_host {
            let mask = seat_mask(&p.hub);
            if let Some(host) = &app.host {
                host.shared.surgery_cmds.lock().unwrap().push_back(SurgeryCmd::Seats(mask));
            }
        }
        return;
    }
    if !p.hub.started {
        return;
    }
    let t = hub_time(&h);
    if let Some(c) = p.shell.hub_card.as_mut() {
        c.countdown = (t < 0.0 && t.is_finite()).then_some((-t / 1000.0) as f32);
    }
    let last_t = p.hub.last_time.replace(web_time::Instant::now());
    let dt = last_t.map(|x| x.elapsed().as_secs_f32()).unwrap_or(0.016);
    p.hub.send_t -= dt;
    if p.hub.host {
        // Start the operation so play begins on the hub's clock.
        if !p.hub.advanced && t >= -1700.0 && frame.stage == Stage::Chart {
            p.hub.advanced = true;
            if let Some(host) = &app.host {
                host.shared.surgery_cmds.lock().unwrap().push_back(SurgeryCmd::Advance);
            }
        }
        // Remote hands go in the sim's input.
        if let Some(host) = &app.host {
            let mut i = host.shared.input.lock().unwrap();
            for (id, inp) in &p.hub.remote {
                let k = *id as usize;
                if k < 4 && Some(k) != p.hub.me {
                    let carry = i.surgeons[k].pressed;
                    i.surgeons[k] = *inp;
                    i.surgeons[k].pressed |= carry;
                }
            }
        }
        for v in p.hub.remote.values_mut() {
            v.pressed = 0;
        }
        // One snapshot, about 15 a second.
        if p.hub.send_t <= 0.0 {
            p.hub.send_t = 1.0 / 15.0;
            let snap = net::encode_frame(frame, &p.hub.cues);
            let text = serde_json::to_string(&snap).unwrap_or_default();
            js::call2(&h, "send", &text.into(), &JsValue::UNDEFINED);
        }
        // Standings about once a second, for time-up.
        p.hub.publish_t -= dt;
        if p.hub.publish_t <= 0.0 {
            p.hub.publish_t = 1.0;
            let s = serde_json::to_string(&standings(&p.hub, frame)).unwrap_or_default();
            js::call1(&h, "publish", &s.into());
        }
        // The round's end.
        let over = matches!(frame.stage, Stage::Complete | Stage::Results | Stage::Dead | Stage::Finished);
        if over && !p.hub.finished && frame.tick > 10 {
            p.hub.finished = true;
            let s = serde_json::to_string(&standings(&p.hub, frame)).unwrap_or_default();
            js::call1(&h, "finish", &s.into());
        }
    } else {
        // A client: hands out at about 15 Hz; frames in.
        if p.hub.send_t <= 0.0 && p.hub.me.is_some() {
            p.hub.send_t = 1.0 / 15.0;
            let msg = json!({"i": net::encode_input(&p.hub.local, 0)});
            let host_id = js_sys::Reflect::get(&h, &"host".into()).unwrap_or(JsValue::UNDEFINED);
            js::call2(&h, "send", &msg.to_string().into(), &host_id);
        }
        if let Some(last) = mirror_frames.pop() {
            let f2 = net::decode_frame(&last, &p.hub.mirror);
            p.hub.mirror = f2.clone();
            // Cues the snapshot carries, once each.
            let mut new_cues = Vec::new();
            if let Some(list) = last["e"].as_array() {
                for c in list {
                    let serial = c[0].as_u64().unwrap_or(0) as u32;
                    if serial > p.hub.seen_cues {
                        p.hub.seen_cues = serial;
                        let (id, x, z) = (
                            c[1].as_u64().unwrap_or(0) as u16,
                            c[2].as_f64().unwrap_or(0.0) as f32 / 20.0,
                            c[3].as_f64().unwrap_or(0.0) as f32 / 20.0,
                        );
                        new_cues.push(pav_core::SimEvent::Cue { id, pos: glam::Vec3::new(x, 0.0, z), gain: 1.0, pitch: 1.0 });
                    }
                }
            }
            if let Some(host) = &app.host {
                let f3 = std::sync::Arc::new(f2);
                host.exec(move |sim| {
                    if let Some(g) = sim.state.play.as_mut().and_then(|g| g.get_mut::<pav_core::games::surgery::Surgery>()) {
                        g.mirror_frame = Some(f3.clone());
                    }
                    sim.push_events(new_cues);
                });
            }
        }
    }
}
#[cfg(not(target_arch = "wasm32"))]
pub fn update(_app: &mut App, _frame: &SurgeryFrame) {}

/// The test hook: `window.__game`.
#[cfg(target_arch = "wasm32")]
pub fn hook_update(app: &mut App, frame: &SurgeryFrame) {
    use wasm_bindgen::prelude::*;
    thread_local! {
        static QUEUE: std::cell::RefCell<(u64, bool, Vec<String>, String)> = const { std::cell::RefCell::new((0, false, Vec::new(), String::new())) };
    }
    let Some(p) = app.product.as_mut() else { return };
    if !p.hook.installed {
        p.hook.installed = true;
        let o = js::make_object();
        let step = Closure::<dyn FnMut(f64, bool)>::new(|n: f64, bot: bool| {
            QUEUE.with(|q| {
                let mut q = q.borrow_mut();
                q.0 += n as u64;
                q.1 = bot;
            });
        });
        let doit = Closure::<dyn FnMut(String)>::new(|s: String| {
            QUEUE.with(|q| q.borrow_mut().2.push(s));
        });
        let status = Closure::<dyn FnMut() -> String>::new(|| QUEUE.with(|q| q.borrow().3.clone()));
        let _ = js_sys::Reflect::set(&o, &"step".into(), step.as_ref());
        let _ = js_sys::Reflect::set(&o, &"do".into(), doit.as_ref());
        let _ = js_sys::Reflect::set(&o, &"statusText".into(), status.as_ref());
        step.forget();
        doit.forget();
        status.forget();
        if let Some(w) = web_sys::window() {
            let _ = js_sys::Reflect::set(&w, &"__game".into(), &o);
            let _ = js_sys::eval("window.__game.status = () => JSON.parse(window.__game.statusText() || 'null');");
        }
    }
    let (steps, bot, cmds) = QUEUE.with(|q| {
        let mut q = q.borrow_mut();
        let r = (q.0, q.1, std::mem::take(&mut q.2));
        q.0 = 0;
        r
    });
    for c in cmds {
        let v: Value = serde_json::from_str(&c).unwrap_or(Value::Null);
        if let Some(scene) = v["load"].as_str() {
            let scene = scene.to_string();
            app.load_surgery_scene(&scene, 7);
        }
        if let Some(off) = v["nodraw"].as_bool() {
            app.product.as_mut().unwrap().no_draw = off;
        }
        if let Some(s) = v["screen"].as_str() {
            let p = app.product.as_mut().unwrap();
            p.shell.screen = match s {
                "Title" => Screen::Title,
                "Menu" => Screen::Menu,
                "Playing" => Screen::Playing,
                "Dev" => Screen::Dev,
                "Pause" => Screen::Pause,
                "About" => Screen::About,
                "Settings" => Screen::Settings,
                _ => p.shell.screen,
            };
        }
        if let Some(cmd) = v.get("sim").and_then(|x| serde_json::from_value::<SurgeryCmd>(x.clone()).ok()) {
            if let Some(host) = &app.host {
                host.shared.surgery_cmds.lock().unwrap().push_back(cmd);
            }
        }
    }
    if steps > 0 {
        if let Some(host) = &app.host {
            host.exec(move |sim| {
                for _ in 0..steps {
                    let f = if bot { sim.bot_input() } else { Default::default() };
                    sim.step(&f);
                }
            });
        }
    }
    let status = app.status_json(frame);
    QUEUE.with(|q| q.borrow_mut().3 = status.to_string());
}
#[cfg(not(target_arch = "wasm32"))]
pub fn hook_update(_app: &mut App, _frame: &SurgeryFrame) {}
