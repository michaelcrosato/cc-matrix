//! Tempo Trauma's own frame path. `App::frame` is the engine demo's: boot, stats and guide
//! panels, rewind, the dense pause menu, touch layer, camera keys. When the scene is
//! `surgery*`, `frame` branches here and this file reuses `Gfx`, `SimHost`, `ViewBuilder`.

use std::collections::HashSet;

use glam::Vec2;
use pav_audio::music::Mus;
use pav_core::games::surgery::frame::SurgeryFrame;
use pav_core::games::surgery::{Mode, cue};
use pav_core::input::{SurgeonInput, SurgeryCmd, sbtn};
use pav_ui::Device;
use pav_ui::surgery::shell::{HubCard, NavIn, Screen, Shell, ShellCmd};
use pav_ui::surgery::{SaveFile, glyphs};
use winit::keyboard::KeyCode;

use super::App;

const SAVE_KEY: &str = "tempo-trauma-save";

static SNAPSHOT: std::sync::Mutex<Option<pav_core::SimState>> = std::sync::Mutex::new(None);

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum HubPhase {
    Wait,
    Card,
    Start,
    Play,
    Ended,
}

/// The hub round's state: the card, the clock, and the network (the host's sim is authoritative).
pub struct HubRun {
    pub phase: HubPhase,
    pub info: Option<crate::hook::HubInfo>,
    pub ready: Vec<i64>,
    pub left_ms: Option<f64>,
    pub mirror: Option<SurgeryFrame>,
    pub remote: [SurgeonInput; 4],
    pub snap_t: f32,
    pub in_t: f32,
    pub pub_t: f32,
    pub finished: bool,
    pub pressed_hist: [u16; 4],
    pub seen_frames: u32,
    pub sent: u32,
    pub last_in: Option<web_time::Instant>,
    pub last_snap: Option<web_time::Instant>,
    pub last_pub: Option<web_time::Instant>,
}

impl HubRun {
    pub fn new() -> Self {
        Self {
            phase: HubPhase::Wait,
            info: None,
            ready: vec![],
            left_ms: None,
            mirror: None,
            remote: [SurgeonInput::default(); 4],
            snap_t: 0.0,
            in_t: 0.0,
            pub_t: 0.0,
            finished: false,
            pressed_hist: [0; 4],
            seen_frames: 0,
            sent: 0,
            last_in: None,
            last_snap: None,
            last_pub: None,
        }
    }
}

fn round_json(v: &mut serde_json::Value) {
    match v {
        serde_json::Value::Number(n) if n.is_f64() => {
            let f = n.as_f64().unwrap_or(0.0);
            if let Some(x) = serde_json::Number::from_f64((f * 100.0).round() / 100.0) {
                *n = x;
            }
        }
        serde_json::Value::Array(a) => a.iter_mut().for_each(round_json),
        serde_json::Value::Object(o) => o.values_mut().for_each(round_json),
        _ => {}
    }
}

fn standings_json(f: &SurgeryFrame, players: &[crate::hook::HubPlayer]) -> serde_json::Value {
    let mut by: Vec<(u32, i64)> = players.iter().map(|p| (p.id, f.sg.get(p.id as usize).map(|s| s.score).unwrap_or(0))).collect();
    by.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    let mut groups: Vec<Vec<u32>> = Vec::new();
    let mut last = None;
    for (id, sc) in &by {
        if last == Some(*sc) {
            groups.last_mut().unwrap().push(*id);
        } else {
            groups.push(vec![*id]);
        }
        last = Some(*sc);
    }
    let mut scores = serde_json::Map::new();
    let mut stats = serde_json::Map::new();
    for (id, sc) in &by {
        scores.insert(id.to_string(), (*sc).into());
        let chain = f.sg.get(*id as usize).map(|s| s.chain).unwrap_or(0);
        stats.insert(id.to_string(), serde_json::json!({ "score": sc, "chain": chain }));
    }
    let won = f.mode != Mode::Dead && f.vitals > 0.0;
    let mut awards = Vec::new();
    if let Some((id, _)) = by.first() {
        awards.push(serde_json::json!({ "id": id, "title": "Immaculate Hands", "detail": "The highest score on the table." }));
    }
    serde_json::json!({ "standings": groups, "scores": scores, "won": won, "stats": stats, "awards": awards })
}


pub struct Product {
    pub shell: Shell,
    cursors: [Vec2; 4],
    prev_keys: HashSet<KeyCode>,
    hold_t: [f32; 4],
    flick: [bool; 4],
    pad_prev_buttons: [[bool; 16]; 4],
    wheel: f32,
    last_focus: (usize, &'static str),
    last_line: (String, u16, String),
    last_sub: String,
    last_mode: Option<Mode>,
    last_events_tick: u64,
    sound_ok: bool,
    mouse_prev: Vec2,
    mouse_down_prev: [bool; 2],
    pub status: String,
    scene_sent: bool,
    last_track: Mus,
    rumble_t: f32,
    pad_joined: [bool; 4],
    last_save_json: String,
    pub frame_count: u64,
    pub want_resume: bool,
    pub fps: f32,
    pub hub: HubRun,
}

fn load_save() -> SaveFile {
    #[cfg(target_arch = "wasm32")]
    {
        if let Some(s) = web_sys::window().and_then(|w| w.local_storage().ok().flatten()).and_then(|st| st.get_item(SAVE_KEY).ok().flatten()) {
            return SaveFile::from_json(&s);
        }
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        if let Ok(s) = std::fs::read_to_string(save_path()) {
            return SaveFile::from_json(&s);
        }
    }
    SaveFile::default()
}

#[cfg(not(target_arch = "wasm32"))]
fn save_path() -> std::path::PathBuf {
    std::env::var_os("TEMPO_TRAUMA_SAVE").map(Into::into).unwrap_or_else(|| crate::boot::exe_dir().join("tempo-trauma-save.json"))
}

fn store_save(json: &str) {
    #[cfg(target_arch = "wasm32")]
    if let Some(st) = web_sys::window().and_then(|w| w.local_storage().ok().flatten()) {
        let _ = st.set_item(SAVE_KEY, json);
    }
    #[cfg(not(target_arch = "wasm32"))]
    let _ = std::fs::write(save_path(), json);
}

fn about_json() -> Option<String> {
    #[cfg(target_arch = "wasm32")]
    {
        return web_sys::window().and_then(|w| w.document()).and_then(|d| d.get_element_by_id("about-data")).and_then(|e| e.text_content());
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        std::fs::read_to_string("about-data.json").ok().or_else(|| Some(include_str!("about-default.json").to_string())).filter(|s| !s.is_empty())
    }
}

fn tool_for_angle(v: Vec2) -> u8 {
    // 8 directions: up = 1 (scalpel), then clockwise.
    let a = v.x.atan2(v.y); // 0 = up (y positive is up here), clockwise positive
    let n = ((a / (std::f32::consts::TAU / 8.0)).round() as i32).rem_euclid(8);
    (n + 1) as u8
}

impl Product {
    pub fn new() -> Self {
        let mut shell = Shell::new(load_save());
        if let Some(j) = about_json() {
            shell.set_about_json(&j);
        }
        Self {
            shell,
            cursors: [Vec2::new(0.0, 0.5); 4],
            prev_keys: HashSet::new(),
            hold_t: [0.0; 4],
            flick: [false; 4],
            pad_prev_buttons: [[false; 16]; 4],
            wheel: 0.0,
            last_focus: (0, ""),
            last_line: (String::new(), 0, String::new()),
            last_sub: String::new(),
            last_mode: None,
            last_events_tick: 0,
            sound_ok: false,
            mouse_prev: Vec2::ZERO,
            mouse_down_prev: [false; 2],
            status: String::new(),
            scene_sent: false,
            last_track: Mus::Silence,
            rumble_t: 0.0,
            pad_joined: [false; 4],
            last_save_json: String::new(),
            frame_count: 0,
            want_resume: false,
            fps: 60.0,
            hub: HubRun::new(),
        }
    }
}

/// One pad's state this frame.
#[derive(Clone, Copy, Default)]
struct Pad {
    present: bool,
    left: Vec2,
    right: Vec2,
    l2: f32,
    r2: f32,
    b: [bool; 16],
}

// indices into Pad::b
const B_SOUTH: usize = 0;
const B_EAST: usize = 1;
const B_WEST: usize = 2;
const B_NORTH: usize = 3;
const B_L1: usize = 4;
const B_R1: usize = 5;
const B_START: usize = 6;
const B_SELECT: usize = 7;
const B_UP: usize = 8;
const B_DOWN: usize = 9;
const B_LEFT: usize = 10;
const B_RIGHT: usize = 11;

fn read_pads(input: &mut crate::input::Input) -> [Pad; 4] {
    use gilrs::{Axis, Button};
    let mut out = [Pad::default(); 4];
    if let Some(g) = &input.gilrs {
        for (i, (_, gp)) in g.gamepads().enumerate().take(4) {
            let dz = |v: Vec2, d: f32| {
                let l = v.length();
                if l < d { Vec2::ZERO } else { v / l * ((l - d) / (1.0 - d)).min(1.0) }
            };
            let trig = |b: Button| gp.button_data(b).map(|d| d.value()).unwrap_or(if gp.is_pressed(b) { 1.0 } else { 0.0 });
            let mut p = Pad {
                present: true,
                left: dz(Vec2::new(gp.value(Axis::LeftStickX), gp.value(Axis::LeftStickY)), 0.18),
                right: dz(Vec2::new(gp.value(Axis::RightStickX), gp.value(Axis::RightStickY)), 0.12),
                l2: trig(Button::LeftTrigger2),
                r2: trig(Button::RightTrigger2),
                b: [false; 16],
            };
            let map = [
                (B_SOUTH, Button::South),
                (B_EAST, Button::East),
                (B_WEST, Button::West),
                (B_NORTH, Button::North),
                (B_L1, Button::LeftTrigger),
                (B_R1, Button::RightTrigger),
                (B_START, Button::Start),
                (B_SELECT, Button::Select),
                (B_UP, Button::DPadUp),
                (B_DOWN, Button::DPadDown),
                (B_LEFT, Button::DPadLeft),
                (B_RIGHT, Button::DPadRight),
            ];
            for (i, b) in map {
                p.b[i] = gp.is_pressed(b);
            }
            out[i] = p;
        }
    }
    out
}

impl App {
    pub(crate) fn product_wanted(&self) -> bool {
        self.scene_name.starts_with("surgery")
    }

    fn cue_play(&self, id: u8) {
        if let Some(a) = &self.audio {
            let ev = pav_core::SimEvent::Cue { id, pos: glam::Vec3::ZERO, gain: 0.8, pitch: 1.0 };
            a.play_event(&ev, &pav_audio::Listener::default(), 1.0);
        }
    }

    pub(crate) fn product_frame(&mut self, dt: f32) {
        if self.prod.is_none() {
            // The game has loaded: tell the hub shim (it sends `ready` once, with no key press).
            crate::hook::first_frame();
            let mut p = Product::new();
            p.shell.touch_only = self.touch_screen;
            self.prod = Some(p);
            // One OFL font, readable on a TV: Barlow Condensed SemiBold.
            let mut fonts = egui::FontDefinitions::default();
            fonts.font_data.insert(
                "barlow".into(),
                std::sync::Arc::new(egui::FontData::from_static(include_bytes!("../../../assets/fonts/BarlowCondensed-SemiBold.ttf"))),
            );
            if let Some(f) = fonts.families.get_mut(&egui::FontFamily::Proportional) {
                f.insert(0, "barlow".into());
            }
            self.egui_ctx.set_fonts(fonts);
        }
        #[cfg(target_arch = "wasm32")]
        if self.prod.as_ref().is_some_and(|p| p.want_resume) {
            self.prod.as_mut().unwrap().want_resume = false;
            self.resume_audio_pub();
        }
        let touch_only = self.touch_screen && !self.prod.as_ref().unwrap().sound_ok;
        // Devices.
        self.input.poll_gamepad();
        let pads = read_pads(&mut self.input);
        let (w, h) = self.gfx.as_ref().unwrap().size();
        let pt_per_px = 1080.0 / h.max(1) as f32;
        let zoom = (h as f32 / 1080.0) / self.gfx.as_ref().unwrap().window.scale_factor() as f32;
        self.egui_ctx.set_zoom_factor(zoom.max(0.1));
        let host = self.host.as_ref().unwrap();
        host.pump();
        crate::hook::bind_host(host);
        let in_hub = crate::hook::in_hub();
        if in_hub {
            let p = self.prod.as_mut().unwrap();
            hub_events(&mut p.hub, host, &self.sim_config, &mut p.shell);
        }
        let (prev, curr, curr_at, tick_wall) = host.frames();
        let (hub_client, hub_server) = {
            let i = self.prod.as_ref().unwrap().hub.info.clone();
            (in_hub && i.as_ref().is_some_and(|i| !i.is_host), in_hub && i.as_ref().is_some_and(|i| i.server))
        };
        let mut sf: Option<std::sync::Arc<SurgeryFrame>> = curr.surgery.clone();
        let mut curr = curr;
        if hub_client {
            if let Some(m) = self.prod.as_ref().unwrap().hub.mirror.clone() {
                let mut c = (*curr).clone();
                let a = std::sync::Arc::new(m);
                c.surgery = Some(a.clone());
                curr = std::sync::Arc::new(c);
                sf = Some(a);
            }
        }
        let alpha = (curr_at.elapsed().as_secs_f32() / tick_wall.max(1e-3)).clamp(0.0, 1.0);
        let key_taps = self.input.take_key_taps();
        let keys = self.input.keys.clone();
        let mouse_px = self.input.cursor;
        let mouse_down = [self.input.mouse.contains(&winit::event::MouseButton::Left), self.input.mouse.contains(&winit::event::MouseButton::Right)];
        let mouse_taps_left = self.input.take_mouse_tap(winit::event::MouseButton::Left);
        let mouse_taps_right = self.input.take_mouse_tap(winit::event::MouseButton::Right);
        let prod = self.prod.as_mut().unwrap();
        let down = |c: KeyCode| keys.contains(&c);
        let tap = |c: KeyCode| key_taps.contains(&c);
        // Device in use.
        let pad_activity = pads.iter().any(|p| p.present && (p.b.iter().any(|b| *b) || p.left.length() > 0.5 || p.right.length() > 0.5 || p.r2 > 0.3 || p.l2 > 0.3));
        let mouse_moved = (mouse_px - prod.mouse_prev).length() > 2.0;
        prod.mouse_prev = mouse_px;
        let key_activity = !key_taps.is_empty();
        let click = mouse_taps_left || mouse_taps_right;
        let any = pad_activity || key_activity || click || mouse_moved;
        if pad_activity {
            self.input.last_device = Device::Gamepad;
        }
        if key_activity || mouse_moved || click {
            self.input.last_device = Device::KeyboardMouse;
        }
        let device = if self.touch_screen && !prod.sound_ok && !pad_activity && !key_activity { Device::Touch } else { self.input.last_device };
        let device = if device == Device::Touch { Device::KeyboardMouse } else { device };
        if key_activity || click || pad_activity {
            prod.sound_ok = true;
            prod.shell.touch_only = false;
            prod.want_resume = true;
        }
        let _ = touch_only;
        // ---- Navigation input for the shell.
        let mut nav = NavIn { any, ..Default::default() };
        for c in crate::hook::take_shell_cmds() {
            if let Some(t) = c.strip_prefix("mode_t:") {
                prod.shell.mode_t = t.parse().unwrap_or(0.0);
                continue;
            }
            if let Some(sc) = c.strip_prefix("screen:") {
                prod.shell.screen = match sc {
                    "game" => Screen::Game,
                    "title" => Screen::Title,
                    "main" => Screen::Main,
                    "pause" => Screen::Pause,
                    "dev" => Screen::Dev(0),
                    "controls" => Screen::Controls,
                    "settings" => Screen::Settings(0),
                    "about" => Screen::About(0),
                    "cases" => Screen::Cases,
                    _ => prod.shell.screen,
                };
                prod.shell.focus = 0;
            }
        }
        let pad0 = pads[0];
        let edge = |prev: &HashSet<KeyCode>, c: KeyCode| (key_taps.contains(&c)) || (keys.contains(&c) && !prev.contains(&c));
        let dir_keys = [
            (0usize, [KeyCode::ArrowUp, KeyCode::KeyW]),
            (1, [KeyCode::ArrowDown, KeyCode::KeyS]),
            (2, [KeyCode::ArrowLeft, KeyCode::KeyA]),
            (3, [KeyCode::ArrowRight, KeyCode::KeyD]),
        ];
        for (i, ks) in dir_keys {
            let held = ks.iter().any(|k| down(*k)) || match i {
                0 => pad0.b[B_UP] || pad0.left.y > 0.6,
                1 => pad0.b[B_DOWN] || pad0.left.y < -0.6,
                2 => pad0.b[B_LEFT] || pad0.left.x < -0.6,
                _ => pad0.b[B_RIGHT] || pad0.left.x > 0.6,
            };
            let first = ks.iter().any(|k| edge(&prod.prev_keys, *k));
            let mut fire = ks.iter().any(|k| key_taps.contains(k));
            if held {
                if prod.hold_t[i] == 0.0 || first {
                    fire = true;
                }
                prod.hold_t[i] += dt;
                if prod.hold_t[i] > 0.4 {
                    prod.hold_t[i] = 0.3;
                    fire = true;
                }
                if prod.hold_t[i] == 0.0 {
                    prod.hold_t[i] = 1e-4;
                }
            } else {
                prod.hold_t[i] = 0.0;
            }
            match i {
                0 => nav.up = fire,
                1 => nav.down = fire,
                2 => nav.left = fire,
                _ => nav.right = fire,
            }
        }
        let pad_edge = |prod: &Product, i: usize, b: usize| pads[i].b[b] && !prod.pad_prev_buttons[i][b];
        nav.confirm = edge(&prod.prev_keys, KeyCode::Enter) || edge(&prod.prev_keys, KeyCode::Space) || pad_edge(prod, 0, B_SOUTH);
        nav.back = edge(&prod.prev_keys, KeyCode::Escape) || edge(&prod.prev_keys, KeyCode::Backspace) || pad_edge(prod, 0, B_EAST);
        nav.pause = edge(&prod.prev_keys, KeyCode::Escape) || pad_edge(prod, 0, B_START);
        nav.tab_l = edge(&prod.prev_keys, KeyCode::KeyQ) || edge(&prod.prev_keys, KeyCode::PageUp) || pad_edge(prod, 0, B_L1);
        nav.tab_r = edge(&prod.prev_keys, KeyCode::KeyE) || edge(&prod.prev_keys, KeyCode::PageDown) || pad_edge(prod, 0, B_R1);
        nav.square = edge(&prod.prev_keys, KeyCode::Tab) || pad_edge(prod, 0, B_WEST);
        nav.triangle = pad_edge(prod, 0, B_NORTH);
        nav.held_skip = down(KeyCode::ControlLeft) || (pads[0].b[B_SOUTH] && prod.pad_prev_buttons[0][B_SOUTH] && false);
        let ptr = Vec2::new(mouse_px.x * pt_per_px, mouse_px.y * pt_per_px);
        let in_op = prod.shell.screen == Screen::Game;
        nav.pointer = Some(egui::Pos2::new(ptr.x, ptr.y));
        nav.pointer_moved = mouse_moved;
        nav.click = mouse_taps_left;
        // In an operation a click is the instrument, not a menu: clear it for the shell unless a screen overlay is up.
        let mode = sf.as_ref().map(|f| f.mode);
        if in_op && mode == Some(Mode::Op) {
            nav.click = false;
            nav.confirm = false;
            nav.back = false;
            nav.up = false;
            nav.down = false;
            nav.left = false;
            nav.right = false;
        }
        if in_op && matches!(mode, Some(Mode::Story | Mode::Card | Mode::Results)) {
            // Story advance on click as well.
        }
        // ---- Surgeon inputs.
        let aspect = w as f32 / h.max(1) as f32;
        let shot = sf.as_ref().map(|f| f.camera);
        let mut si = [SurgeonInput::default(); 4];
        let op = in_op && mode == Some(Mode::Op);
        let active_n = sf.as_ref().map(|f| f.sg.iter().filter(|s| s.active).count()).unwrap_or(1);
        let _ = active_n;
        let speed_mul = prod.shell.settings.cursor_speed;
        let mut cmd_extra: Option<SurgeryCmd> = None;
        let team = sf.as_ref().map(|f| f.case == 8).unwrap_or(false);
        if in_op || prod.shell.screen == Screen::Attract {
            let kb_move = Vec2::new(
                (down(KeyCode::KeyD) || down(KeyCode::ArrowRight)) as i32 as f32 - (down(KeyCode::KeyA) || down(KeyCode::ArrowLeft)) as i32 as f32,
                (down(KeyCode::KeyS) || down(KeyCode::ArrowDown)) as i32 as f32 - (down(KeyCode::KeyW) || down(KeyCode::ArrowUp)) as i32 as f32,
            );
            // Slot 0: keyboard and mouse, or the first pad.
            let p0 = pads[0];
            let c0 = &mut prod.cursors[0];
            let mut s0 = SurgeonInput { active: true, ..Default::default() };
            if self.input.last_device == Device::KeyboardMouse {
                if mouse_moved || mouse_taps_left || mouse_down[0] {
                    if let Some(shot) = &shot {
                        *c0 = pav_view::surgery::pointer_to_field(shot, aspect, mouse_px.x / w.max(1) as f32, mouse_px.y / h.max(1) as f32);
                    }
                }
                if kb_move != Vec2::ZERO {
                    let sp = if down(KeyCode::ShiftLeft) { 0.35 } else { 1.0 };
                    *c0 += kb_move.normalize() * 9.0 * sp * speed_mul * dt;
                    s0.assist = true;
                }
                if mouse_down[0] || down(KeyCode::KeyE) {
                    s0.held |= sbtn::USE;
                }
                if mouse_taps_right || tap(KeyCode::KeyQ) {
                    s0.pressed |= sbtn::CANCEL;
                }
                if down(KeyCode::Space) {
                    s0.held |= sbtn::GIFT;
                }
                if (mouse_down[0] && mouse_down[1]) || down(KeyCode::KeyF) {
                    s0.held |= sbtn::DEFIB;
                }
                if down(KeyCode::ShiftLeft) {
                    s0.held |= sbtn::PRECISION;
                }
                for (i, k) in [KeyCode::Digit1, KeyCode::Digit2, KeyCode::Digit3, KeyCode::Digit4, KeyCode::Digit5, KeyCode::Digit6, KeyCode::Digit7, KeyCode::Digit8].iter().enumerate() {
                    if tap(*k) {
                        s0.tool = i as u8 + 1;
                    }
                }
                if tap(KeyCode::KeyR) {
                    s0.held |= sbtn::ROT_R;
                }
                if down(KeyCode::KeyR) {
                    s0.held |= sbtn::ROT_R;
                }
                if down(KeyCode::KeyG) {
                    s0.held |= sbtn::ROT_L;
                }
                // The wheel: rotate a held bone, else cycle instruments.
                let wheel = std::mem::take(&mut prod.wheel);
                if wheel.abs() > 0.01 {
                    let grabbed = sf.as_ref().map(|f| f.hz.iter().any(|h| h.grabbed == 0 && h.k == 8)).unwrap_or(false);
                    if grabbed {
                        s0.held |= if wheel > 0.0 { sbtn::ROT_R } else { sbtn::ROT_L };
                    } else if let Some(f) = &sf {
                        let cur = f.sg[0].tool.max(1) as i32;
                        let next = ((cur - 1 + if wheel > 0.0 { 1 } else { -1 }).rem_euclid(8) + 1) as u8;
                        s0.tool = next;
                    }
                }
                // Click an instrument on the tray.
                if mouse_taps_left && c0.y > 4.7 {
                    let slot = (((c0.x + 0.5 + 4.2 + 0.58) / 1.16).floor() as i32 + 1).clamp(1, 8) as u8;
                    s0.tool = slot;
                    s0.held &= !sbtn::USE;
                }
                s0.aim = *c0;
                s0.pressure = 0.0;
            } else if p0.present {
                // Pad: right stick integrates the cursor (15 u/s * s^2.2), L2 precision.
                let prec = if p0.l2 > 0.35 { 0.35 } else { 1.0 };
                let r = p0.right;
                let mag = r.length().min(1.0);
                if mag > 0.0 {
                    let v = r.normalize() * 15.0 * mag.powf(2.2) * prec * speed_mul;
                    *c0 += Vec2::new(v.x, -v.y) * dt;
                    s0.assist = true;
                }
                if p0.l2 > 0.35 {
                    s0.held |= sbtn::PRECISION;
                }
                s0.pressure = p0.r2;
                if p0.r2 > 0.25 || p0.b[B_SOUTH] {
                    s0.held |= sbtn::USE;
                }
                if p0.b[B_EAST] && !prod.pad_prev_buttons[0][B_EAST] {
                    s0.pressed |= sbtn::CANCEL;
                }
                if p0.b[B_NORTH] {
                    s0.held |= sbtn::GIFT;
                }
                if p0.l2 > 0.5 && p0.r2 > 0.5 {
                    s0.held |= sbtn::DEFIB;
                }
                // Flick: eight directions, instant.
                let l = p0.left;
                if l.length() > 0.72 {
                    if !prod.flick[0] {
                        prod.flick[0] = true;
                        s0.tool = tool_for_angle(l);
                    }
                } else if l.length() < 0.45 {
                    prod.flick[0] = false;
                }
                let r1e = pads[0].b[B_R1] && !prod.pad_prev_buttons[0][B_R1];
                let l1e = pads[0].b[B_L1] && !prod.pad_prev_buttons[0][B_L1];
                if r1e || l1e {
                    if let Some(f) = &sf {
                        let cur = f.sg[0].tool.max(1) as i32;
                        let d = if r1e { 1 } else { -1 };
                        s0.tool = ((cur - 1 + d).rem_euclid(8) + 1) as u8;
                        // rotate a held bone with the bumpers
                    }
                    let grabbed = sf.as_ref().map(|f| f.hz.iter().any(|h| h.grabbed == 0 && h.k == 8)).unwrap_or(false);
                    if grabbed {
                        s0.tool = 0;
                    }
                }
                if p0.b[B_L1] {
                    s0.held |= sbtn::ROT_L;
                }
                if p0.b[B_R1] {
                    s0.held |= sbtn::ROT_R;
                }
                s0.aim = *c0;
            } else {
                s0.aim = *c0;
            }
            c0.x = c0.x.clamp(-9.0, 9.0);
            c0.y = c0.y.clamp(-4.6, 4.8);
            s0.aim = *c0;
            if (nav.square || tap(KeyCode::Tab)) && op {
                s0.pressed |= sbtn::CHART;
            }
            si[0] = s0;
            // Extra pads join with Cross in Code Blue.
            for i in 1..4 {
                let p = pads[i];
                if !p.present {
                    continue;
                }
                let c = &mut prod.cursors[i];
                let mut s = SurgeonInput { active: prod.pad_joined[i], ..Default::default() };
                if !prod.pad_joined[i] && p.b[B_SOUTH] && !prod.pad_prev_buttons[i][B_SOUTH] && team {
                    prod.pad_joined[i] = true;
                    s.active = true;
                }
                if prod.pad_joined[i] {
                    let mag = p.right.length().min(1.0);
                    if mag > 0.0 {
                        let v = p.right.normalize() * 15.0 * mag.powf(2.2) * if p.l2 > 0.35 { 0.35 } else { 1.0 } * speed_mul;
                        *c += Vec2::new(v.x, -v.y) * dt;
                        s.assist = true;
                    }
                    c.x = c.x.clamp(-9.0, 9.0);
                    c.y = c.y.clamp(-4.6, 4.8);
                    s.aim = *c;
                    s.pressure = p.r2;
                    if p.r2 > 0.25 || p.b[B_SOUTH] {
                        s.held |= sbtn::USE;
                    }
                    if p.b[B_NORTH] {
                        s.held |= sbtn::GIFT;
                    }
                    if p.l2 > 0.5 && p.r2 > 0.5 {
                        s.held |= sbtn::DEFIB;
                    }
                    if p.l2 > 0.35 {
                        s.held |= sbtn::PRECISION;
                    }
                    if p.left.length() > 0.72 {
                        if !prod.flick[i] {
                            prod.flick[i] = true;
                            s.tool = tool_for_angle(p.left);
                        }
                    } else if p.left.length() < 0.45 {
                        prod.flick[i] = false;
                    }
                    if p.b[B_EAST] {
                        s.pressed |= sbtn::CANCEL;
                    }
                    si[i] = s;
                }
            }
        }
        // Story / card / results: advance.
        if matches!(mode, Some(Mode::Story | Mode::Card | Mode::Results | Mode::Dead)) && in_op {
            let adv = nav.confirm || mouse_taps_left || pad_edge(prod, 0, B_SOUTH);
            if adv && !matches!(mode, Some(Mode::Dead)) {
                si[0].active = true;
                si[0].pressed |= sbtn::ADVANCE;
            }
            si[0].active = true;
            if nav.held_skip || pads[0].b[B_NORTH] {
                si[0].held |= sbtn::SKIP;
            }
        }
        // The hub: the card's answers, the host's seats, and the clients' input messages.
        if in_hub {
            let ready_press = nav.confirm || mouse_taps_left || pad_edge(prod, 0, B_SOUTH);
            let more_press = pad_edge(prod, 0, B_NORTH) || edge(&prod.prev_keys, KeyCode::KeyM);
            let hub = &mut prod.hub;
            let info = hub.info.clone();
            if let Some(info) = info {
                let me = info.me;
                match hub.phase {
                    HubPhase::Card | HubPhase::Start => {
                        // A client tells the host it is here while the card runs.
                        if !info.is_host && !info.server && hub.last_in.is_none_or(|t| t.elapsed().as_secs_f32() >= 0.25) {
                            hub.last_in = Some(web_time::Instant::now());
                            crate::hook::hub_call("send", "{\"t\":\"hi\"}", info.host);
                            hub.sent += 1;
                        }
                        if ready_press {
                            crate::hook::hub_call("answer", "ready", 0);
                        }
                        if more_press {
                            crate::hook::hub_call("answer", "more", 0);
                        }
                        si = [SurgeonInput::default(); 4];
                    }
                    HubPhase::Play => {
                        if info.is_host {
                            let mut mapped = [SurgeonInput::default(); 4];
                            for (i, m) in mapped.iter_mut().enumerate() {
                                if i as i64 == me && !info.server {
                                    *m = si[0];
                                    m.active = true;
                                } else {
                                    *m = hub.remote[i];
                                    hub.remote[i].pressed = 0;
                                }
                            }
                            si = mapped;
                        } else {
                            hub.pressed_hist[0] |= si[0].pressed;
                            if hub.last_in.is_none_or(|t| t.elapsed().as_secs_f32() >= 1.0 / 15.0) && !info.server {
                                hub.last_in = Some(web_time::Instant::now());
                                let p = hub.pressed_hist[0] | hub.pressed_hist[1] | hub.pressed_hist[2];
                                hub.pressed_hist = [0, hub.pressed_hist[0], hub.pressed_hist[1], 0];
                                let m = serde_json::json!({ "t": "i", "a": [(si[0].aim.x * 100.0).round() / 100.0, (si[0].aim.y * 100.0).round() / 100.0], "h": si[0].held, "p": p, "tool": si[0].tool, "pr": si[0].pressure, "as": si[0].assist });
                                crate::hook::hub_call("send", &m.to_string(), info.host);
                                hub.sent += 1;
                            }
                            si = [SurgeonInput::default(); 4];
                        }
                    }
                    _ => si = [SurgeonInput::default(); 4],
                }
            }
        }
        // Pending input to the sim: pressed bits accumulate until a tick consumes them.
        {
            let mut i = host.shared.input.lock().unwrap();
            for s in 0..4 {
                let prev_pressed = i.surgeons[s].pressed;
                i.surgeons[s] = si[s];
                i.surgeons[s].pressed |= prev_pressed;
            }
            if let Some(c) = cmd_extra.take() {
                i.scmd = Some(c);
            }
        }
        // ---- The shell.
        let mut cmds: Vec<ShellCmd> = Vec::new();
        let prod_fps = {
            let p = self.prod.as_mut().unwrap();
            p.fps = p.fps * 0.9 + (1.0 / dt.max(0.001)) * 0.1;
            p.fps
        };
        let info = pav_ui::surgery::shell::ShellInfo {
            vp: None,
            fps: prod_fps,
            tick: curr.tick,
            in_hub: crate::hook::in_hub(),
            sound_note: !prod_sound_ok(&self.prod),
        };
        let gfx = self.gfx.as_mut().unwrap();
        let state = self.egui_state.as_mut().unwrap();
        let raw = state.take(&gfx.window);
        let prod = self.prod.as_mut().unwrap();
        let mut view = self.view.clone();
        view.particles = true;
        let mut scene = self.builder.build(&prev, &curr, alpha, &self.rig, aspect, &view, glam::Vec3::ZERO);
        prod.shell.info = info;
        prod.shell.info.vp = Some(scene.camera.proj * scene.camera.view);
        let focus_before = (prod.shell.focus, prod.shell.screen_name());
        let sfref = sf.as_deref();
        let card = if in_hub { hub_card(&prod.hub) } else { crate::hook::take_card() };
        let out = self.egui_ctx.run_ui(raw, |ui| {
            let ctx = ui.ctx().clone();
            if let Some(c) = &card {
                prod.shell.draw_card(&ctx, c);
            } else {
                cmds = prod.shell.run(&ctx, &nav, sfref, dt, device);
            }
        });
        let focus_after = (prod.shell.focus, prod.shell.screen_name());
        let nav_moved = focus_after.1 == focus_before.1 && focus_after.0 != focus_before.0;
        state.platform_output(&gfx.window, out.platform_output);
        let ppp = out.pixels_per_point;
        let prims = self.egui_ctx.tessellate(out.shapes, ppp);
        let mut textures = out.textures_delta;
        // Cursor: hidden while operating.
        gfx.window.set_cursor_visible(!(prod.shell.screen == Screen::Game && mode == Some(Mode::Op)));
        // ---- Apply shell commands.
        let mut stamp = false;
        let mut sim_cmds: Vec<SurgeryCmd> = Vec::new();
        let mut save = false;
        let mut sounds: Vec<u8> = Vec::new();
        for c in cmds {
            match c {
                ShellCmd::Sim(sc) => sim_cmds.push(sc),
                ShellCmd::SettingsChanged => {}
                ShellCmd::Fullscreen(on) => {
                    let is = gfx.window.fullscreen().is_some();
                    if is != on {
                        crate::platform::toggle_fullscreen(&gfx.window);
                    }
                }
                ShellCmd::Save => save = true,
                ShellCmd::Quit => self.quit = true,
                ShellCmd::DevPause(p) => host.set_control(|c| c.paused = p),
                ShellCmd::Sound(n) => sounds.push(match n {
                    "ui_ok" => cue::UI_OK,
                    "ui_back" => cue::UI_BACK,
                    _ => cue::UI_NAV,
                }),
                ShellCmd::Rumble(v) => crate::hook::rumble(v, 200),
                ShellCmd::Step => host.set_control(|c| c.step_requests += 1),
                ShellCmd::Rewind => {
                    let t = curr.tick.saturating_sub(300);
                    host.set_control(|c| c.scrub = Some(t));
                }
                ShellCmd::SnapshotSave => host.exec(|sim| {
                    *SNAPSHOT.lock().unwrap() = Some(sim.snapshot());
                }),
                ShellCmd::SnapshotLoad => host.exec(|sim| {
                    if let Some(s) = SNAPSHOT.lock().unwrap().clone() {
                        sim.restore(s);
                    }
                }),
                ShellCmd::ReloadContent => host.exec(|_| {
                    #[cfg(not(target_arch = "wasm32"))]
                    let _ = pav_core::games::surgery::data::reload();
                }),
            }
        }
        if nav_moved {
            sounds.push(cue::UI_NAV);
        }
        for sc in sim_cmds {
            host.exec(move |sim| {
                if let Some(g) = sim.state.play.as_mut().and_then(|p| p.surgery_mut()) {
                    g.command(sc);
                }
            });
        }
        if save || prod.shell.dirty {
            prod.shell.dirty = false;
            let j = prod.shell.save_file().to_json();
            if j != prod.last_save_json {
                store_save(&j);
                prod.last_save_json = j;
            }
        }
        // ---- Sound.
        let events: Vec<_> = std::mem::take(&mut *host.shared.events.lock().unwrap());
        if let Some(a) = &self.audio {
            let st = &prod.shell.settings;
            a.set_bus(pav_audio::BUS_FX, st.sfx);
            a.set_bus(pav_audio::BUS_MUSIC, st.music);
            a.set_bus(pav_audio::BUS_VOICE, st.voices);
            let l = pav_audio::Listener::default();
            for e in &events {
                a.play_event(e, &l, 1.0);
                if matches!(e, pav_core::SimEvent::Cue { id, .. } if *id == cue::LUBDUB) {
                    a.heartbeat();
                }
            }
            for id in &sounds {
                let ev = pav_core::SimEvent::Cue { id: *id, pos: glam::Vec3::ZERO, gain: 0.6, pitch: 1.0 };
                a.play_event(&ev, &l, 1.0);
            }
            if let Some(f) = sf.as_deref() {
                // Voices: a line of story, or a subtitle, as it appears.
                if f.mode == Mode::Story {
                    let content = pav_core::games::surgery::data::load();
                    if let Some(l) = content.scenes.iter().find(|s| s.id == f.story).and_then(|s| s.line.get(f.line as usize)) {
                        let key = (f.story.clone(), f.line, l.who.clone());
                        if prod.last_line != key {
                            prod.last_line = key;
                            if l.who != "narrator" {
                                a.speak(&l.text, &l.who);
                            }
                        }
                    }
                } else if let Some(sub) = &f.sub {
                    if prod.last_sub != sub.text {
                        prod.last_sub = sub.text.clone();
                        a.speak(&sub.text, &sub.who);
                    }
                }
                if f.mode == Mode::Story || f.sub.is_none() && f.mode != Mode::Op {
                    // keep last_sub fresh
                }
                // Music follows the screen and the heart.
                let (track, overlay) = music_for(f, prod.shell.screen);
                if prod.last_track != track {
                    prod.last_track = track;
                    a.set_track(track);
                }
                a.set_overlay(overlay);
                a.set_hush(f.hush > 0.0);
                a.set_crisis(if f.mode == Mode::Op { ((35.0 - f.vitals) / 35.0).clamp(0.0, 1.0) } else { 0.0 });
                if f.mode == Mode::Op && matches!(track, Mus::Or | Mus::CodeBlue) {
                    a.set_bpm(f.bpm.clamp(60.0, 160.0));
                } else {
                    a.set_bpm(pav_audio::music::default_bpm(track));
                }
                if prod.last_mode != Some(f.mode) {
                    prod.last_mode = Some(f.mode);
                    if f.mode == Mode::Results {
                        stamp = true;
                    }
                }
                // Rumble on the beat when vitals are low.
                prod.rumble_t -= dt;
                if prod.shell.settings.rumble && f.mode == Mode::Op && f.vitals < 40.0 && prod.rumble_t <= 0.0 && f.beat < 0.1 {
                    prod.rumble_t = 0.4;
                    crate::hook::rumble(0.4, 120);
                }
            }
        }
        // ---- Status for tests.
        let status = {
            let sim_status = host.query(|sim| sim.state.play.as_ref().and_then(|p| p.surgery()).map(|g| g.status_json()));
            let mut m = serde_json::Map::new();
            m.insert("sim".into(), sim_status.flatten().unwrap_or(serde_json::Value::Null));
            let pr = |a| glyphs::prompt(a, device, prod.shell.settings.xbox).glyph;
            m.insert(
                "shell".into(),
                serde_json::json!({
                    "screen": prod.shell.screen_name(),
                    "focus": prod.shell.focus,
                    "device": match device { Device::Gamepad => "pad", Device::KeyboardMouse => "mouse", Device::Touch => "touch" },
                    "prompts": { "confirm": pr(glyphs::Act::Confirm), "back": pr(glyphs::Act::Back), "gift": pr(glyphs::Act::Gift), "use": pr(glyphs::Act::Use) },
                    "xbox": prod.shell.settings.xbox,
                    "music_setting": prod.shell.settings.music,
                    "touch_only": prod.shell.touch_only,
                    "settings": serde_json::to_value(&prod.shell.settings).unwrap_or_default(),
                    "progress": serde_json::to_value(&prod.shell.progress).unwrap_or_default(),
                    "text": prod.shell.last_text.clone(),
                    "idle": prod.shell.idle,
                    "about_pages": prod.shell.about.pages.iter().map(|p| p.title.clone()).collect::<Vec<_>>(),
                }),
            );
            let (gains, peaks) = match &self.audio {
                Some(a) => (a.gains.lock().map(|g| *g).unwrap_or([0.0; 3]), a.take_peaks()),
                None => ([0.0; 3], [0.0; 3]),
            };
            m.insert("audio".into(), serde_json::json!({ "gains": gains, "peaks": peaks, "music": gains[1] }));
            m.insert(
                "hub".into(),
                serde_json::json!({
                    "active": in_hub,
                    "phase": format!("{:?}", prod.hub.phase),
                    "host": prod.hub.info.as_ref().map(|i| i.is_host),
                    "me": prod.hub.info.as_ref().map(|i| i.me),
                    "sent": prod.hub.sent,
                    "seen": prod.hub.seen_frames,
                    "mirror_vitals": prod.hub.mirror.as_ref().map(|m| m.vitals),
                    "mirror_case": prod.hub.mirror.as_ref().map(|m| m.case),
                    "remote_active": prod.hub.remote.iter().map(|r| r.active).collect::<Vec<_>>(),
                    "remote_aim": prod.hub.remote.iter().map(|r| [r.aim.x, r.aim.y]).collect::<Vec<_>>(),
                }),
            );
            m.insert("frame".into(), serde_json::json!({ "n": prod.frame_count, "tick": curr.tick, "w": w, "h": h }));
            serde_json::Value::Object(m).to_string()
        };
        prod.status = status.clone();
        prod.frame_count += 1;
        crate::hook::publish(status);
        // ---- Draw.
        if let Some(a) = &self.audio {
            let _ = a;
        }
        scene.post.outline_px = scene.post.outline_px.max(1.0);
        let first = self.boot_done_at.is_none();
        if !hub_server {
            let _ = gfx.draw(&scene, Some((&prims, &mut textures, ppp)));
        }
        if in_hub && prod_hub_host(&self.prod) {
            let prod = self.prod.as_mut().unwrap();
            let hub = &mut prod.hub;
            if let (Some(f), Some(info)) = (sf.as_deref(), hub.info.clone()) {
                if matches!(hub.phase, HubPhase::Play | HubPhase::Start) && hub.last_snap.is_none_or(|t| t.elapsed().as_secs_f32() >= 1.0 / 15.0) {
                    hub.last_snap = Some(web_time::Instant::now());
                    if let Ok(mut v) = serde_json::to_value(f) {
                        round_json(&mut v);
                        let m = serde_json::json!({ "t": "f", "d": v });
                        crate::hook::hub_call("send", &m.to_string(), -1);
                    }
                }
                if hub.phase == HubPhase::Play && hub.last_pub.is_none_or(|t| t.elapsed().as_secs_f32() >= 1.0) {
                    hub.last_pub = Some(web_time::Instant::now());
                    crate::hook::hub_call("publish", &standings_json(f, &info.players).to_string(), 0);
                }
                if hub.phase == HubPhase::Play && !hub.finished && matches!(f.mode, Mode::Results | Mode::Dead | Mode::Won) {
                    hub.finished = true;
                    crate::hook::hub_call("finish", &standings_json(f, &info.players).to_string(), 0);
                }
            }
        }
        if stamp {
            if let Some(a) = &self.audio {
                let ev = pav_core::SimEvent::Cue { id: cue::STAMP, pos: glam::Vec3::ZERO, gain: 0.8, pitch: 1.0 };
                a.play_event(&ev, &pav_audio::Listener::default(), 1.0);
            }
        }
        if first {
            self.boot_done_at = Some(web_time::Instant::now());
            crate::hook::first_frame();
        }
        let prod = self.prod.as_mut().unwrap();
        prod.prev_keys = keys;
        for i in 0..4 {
            prod.pad_prev_buttons[i] = pads[i].b;
        }
        let _ = (mouse_down, prod.mouse_down_prev);
        prod.mouse_down_prev = mouse_down;
    }

    fn cue_play_stamp(&self) {
        self.cue_play(cue::STAMP);
    }

    /// The mouse wheel in an operation.
    pub(crate) fn product_wheel(&mut self, lines: f32) {
        if let Some(p) = &mut self.prod {
            p.wheel += lines;
        }
    }
}

fn prod_sound_ok(p: &Option<Product>) -> bool {
    p.as_ref().map(|p| p.sound_ok).unwrap_or(false)
}

fn music_for(f: &SurgeryFrame, screen: Screen) -> (Mus, Mus) {
    match f.mode {
        Mode::Idle | Mode::Won => (Mus::Title, Mus::Silence),
        Mode::Story => {
            let content = pav_core::games::surgery::data::load();
            let m = content.scenes.iter().find(|s| s.id == f.story).map(|s| s.music.clone()).unwrap_or_default();
            (pav_audio::music::from_name(&m), Mus::Silence)
        }
        Mode::Card => (Mus::Tense, Mus::Silence),
        Mode::Results => (Mus::Fanfare, Mus::Silence),
        Mode::Dead => (Mus::Silence, Mus::Silence),
        Mode::Op => {
            let _ = screen;
            let overlay = match f.case {
                3 => Mus::Introit,
                4 => Mus::Lacrimosa,
                6 => Mus::DiesIrae,
                7 => Mus::Libera,
                _ => Mus::Silence,
            };
            if f.case == 8 { (Mus::CodeBlue, Mus::Silence) } else { (Mus::Or, overlay) }
        }
    }
}

fn hub_events(hub: &mut HubRun, host: &crate::simhost::SimHost, cfg: &pav_core::SimConfig, shell: &mut Shell) {
    if hub.info.is_none() {
        hub.info = crate::hook::hub_info();
        if hub.info.is_some() {
            hub.phase = HubPhase::Card;
        }
    }
    shell.screen = Screen::Game;
    shell.idle = 0.0;
    for ev in crate::hook::hub_poll() {
        let kind = ev.get(0).and_then(|v| v.as_str()).unwrap_or("").to_string();
        match kind.as_str() {
            "card" => {
                if let Some(d) = ev.get(1) {
                    hub.left_ms = d.get("left").and_then(|v| v.as_f64());
                    hub.ready = d.get("ready").and_then(|r| r.as_array()).map(|a| a.iter().filter_map(|v| v.as_i64()).collect()).unwrap_or_default();
                }
            }
            "start" => {
                hub.phase = HubPhase::Start;
                if let Some(info) = hub.info.clone() {
                    let n = info.players.len().clamp(1, 4) as u8;
                    let seed = info.seed as u64;
                    let cfg = cfg.clone();
                    let scene = if info.is_host { "surgery/codeblue" } else { "surgery/mirror" };
                    let host_side = info.is_host;
                    host.exec(move |sim| {
                        if let Ok(mut fresh) = pav_core::Sim::new(scene, seed) {
                            fresh.config = cfg;
                            *sim = fresh;
                            if host_side {
                                if let Some(g) = sim.state.play.as_mut().and_then(|p| p.surgery_mut()) {
                                    for i in 0..4u8 {
                                        g.command(SurgeryCmd::Seat(i, i < n));
                                    }
                                    g.command(SurgeryCmd::Pause(true));
                                }
                            }
                        }
                    });
                }
            }
            "message" => {
                let from = ev.get(2).and_then(|v| v.as_i64()).unwrap_or(-1);
                if let Some(d) = ev.get(1) {
                    match d.get("t").and_then(|t| t.as_str()) {
                        Some("f") => {
                            if let Some(frame) = d.get("d").and_then(|f| serde_json::from_value::<SurgeryFrame>(f.clone()).ok()) {
                                hub.mirror = Some(frame);
                                hub.seen_frames += 1;
                            }
                        }
                        Some("i") if (0..4).contains(&from) => {
                            let a = d.get("a").and_then(|v| v.as_array());
                            let num = |i: usize| a.and_then(|a| a.get(i)).and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                            let u = |k: &str| d.get(k).and_then(|v| v.as_u64()).unwrap_or(0) as u16;
                            let r = &mut hub.remote[from as usize];
                            r.active = true;
                            r.aim = Vec2::new(num(0), num(1));
                            r.held = u("h");
                            r.pressed |= u("p");
                            r.tool = u("tool") as u8;
                            r.pressure = d.get("pr").and_then(|v| v.as_f64()).unwrap_or(0.0) as f32;
                            r.assist = d.get("as").and_then(|v| v.as_bool()).unwrap_or(false);
                        }
                        _ => {}
                    }
                }
            }
            "leave" => {
                if let Some(id) = ev.get(1).and_then(|d| d.get("id")).and_then(|v| v.as_i64()) {
                    if hub.info.as_ref().is_some_and(|i| i.is_host) && (0..4).contains(&id) {
                        let id = id as u8;
                        host.exec(move |sim| {
                            if let Some(g) = sim.state.play.as_mut().and_then(|p| p.surgery_mut()) {
                                g.command(SurgeryCmd::Seat(id, false));
                            }
                        });
                        hub.remote[id as usize] = SurgeonInput::default();
                    }
                }
            }
            "end" => hub.phase = HubPhase::Ended,
            _ => {}
        }
    }
    if hub.phase == HubPhase::Start && crate::hook::hub_time() >= 0.0 {
        hub.phase = HubPhase::Play;
        if hub.info.as_ref().is_some_and(|i| i.is_host) {
            host.exec(|sim| {
                if let Some(g) = sim.state.play.as_mut().and_then(|p| p.surgery_mut()) {
                    g.command(SurgeryCmd::Pause(false));
                }
            });
        }
    }
}

fn hub_card(hub: &HubRun) -> Option<HubCard> {
    if matches!(hub.phase, HubPhase::Play | HubPhase::Ended) {
        return None;
    }
    let info = hub.info.clone().unwrap_or_default();
    let t = match hub.phase {
        HubPhase::Start => (-crate::hook::hub_time() / 1000.0).max(0.0) as f32,
        _ => hub.left_ms.map(|v| (v / 1000.0) as f32).unwrap_or(0.0),
    };
    Some(HubCard {
        title: pav_core::games::surgery::TITLE.to_string(),
        patient: "a stranger from the harbour".to_string(),
        players: info.players.iter().map(|p| (p.name.clone(), p.id as u8, hub.ready.contains(&(p.id as i64)))).collect(),
        goal: "Keep the patient alive until the clock runs out.".to_string(),
        time_left: t,
    })
}

fn prod_hub_host(p: &Option<Product>) -> bool {
    p.as_ref().and_then(|p| p.hub.info.as_ref()).is_some_and(|i| i.is_host)
}
