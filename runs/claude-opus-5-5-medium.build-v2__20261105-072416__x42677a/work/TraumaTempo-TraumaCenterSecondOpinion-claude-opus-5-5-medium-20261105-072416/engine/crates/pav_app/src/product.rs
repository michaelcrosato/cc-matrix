//! The game's own frame path. `App::frame` is the engine demo's: boot and stats panels, room cards,
//! hint bars, toasts, a touch layer, F-keys, camera keys, rewind on Backspace and a dense pause menu.
//! None of that belongs in this game. When the scene is `surgery*`, `frame` and `window_event`
//! branch here, reusing `Gfx`, `SimHost`, `ViewBuilder` and `CameraRig`.

use std::collections::{BTreeMap, HashSet};

use glam::{Mat4, Vec2, Vec3};
use pav_audio::director::Director;
use pav_audio::{BUS_EFFECTS, BUS_MUSIC, BUS_VOICES, Listener};
use pav_core::games::surgery::field::{TRAY_Z, tray_slot};
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_core::games::surgery::net::{self, NetCue};
use pav_core::games::surgery::tune::Difficulty;
use pav_core::games::surgery::{self, cue};
use pav_core::input::{SurgeonInput, surgeon_buttons as btn};
use pav_core::{Sim, SimEvent};
use pav_ui::Device;
use pav_ui::surgery::style;
use pav_ui::surgery::{About, CardInfo, Cmd, Input as ShellInput, Save, Screen, Shell};
use pav_view::CameraParams;
use serde_json::{Value, json};
use web_time::Instant;
use winit::event::{ElementState, MouseButton, MouseScrollDelta, WindowEvent};
use winit::event_loop::ActiveEventLoop;
use winit::keyboard::{KeyCode, PhysicalKey};

use crate::app::App;
use crate::hub;

const ABOUT: &str = include_str!("../../pav_ui/src/surgery/about.json");

/// Repeats a held direction: a press, a wait, then a steady rate.
#[derive(Default, Clone, Copy)]
struct Repeat {
    held: f32,
}

impl Repeat {
    fn tick(&mut self, on: bool, dt: f32) -> bool {
        if !on {
            self.held = 0.0;
            return false;
        }
        let was = self.held;
        self.held += dt;
        if was == 0.0 {
            return true;
        }
        if self.held > 0.4 {
            let period = 0.11;
            return ((self.held - 0.4) / period).floor() > ((was - 0.4).max(0.0) / period).floor();
        }
        false
    }
}

/// One pad's state this frame.
#[derive(Clone, Debug, Default)]
struct PadNow {
    index: usize,
    left: Vec2,
    right: Vec2,
    l2: f32,
    r2: f32,
    held: HashSet<u8>,
    pressed: HashSet<u8>,
    /// Which flick direction the left stick is in, if any.
    flick: Option<u8>,
    flick_new: bool,
}

// Our names for a pad's buttons.
const CROSS: u8 = 0;
const CIRCLE: u8 = 1;
const SQUARE: u8 = 2;
const TRIANGLE: u8 = 3;
const L1: u8 = 4;
const R1: u8 = 5;
const CREATE: u8 = 8;
const OPTIONS: u8 = 9;
const UP: u8 = 12;
const DOWN: u8 = 13;
const LEFT: u8 = 14;
const RIGHT: u8 = 15;

fn read_pads(gilrs: &mut gilrs::Gilrs, prev: &mut BTreeMap<usize, PadNow>) -> (Vec<PadNow>, bool) {
    use gilrs::{Axis, Button};
    let mut activity = false;
    while let Some(ev) = gilrs.next_event() {
        if matches!(ev.event, gilrs::EventType::ButtonPressed(..)) {
            activity = true;
        }
    }
    const MAP: [(Button, u8); 12] = [
        (Button::South, CROSS),
        (Button::East, CIRCLE),
        (Button::West, SQUARE),
        (Button::North, TRIANGLE),
        (Button::LeftTrigger, L1),
        (Button::RightTrigger, R1),
        (Button::Select, CREATE),
        (Button::Start, OPTIONS),
        (Button::DPadUp, UP),
        (Button::DPadDown, DOWN),
        (Button::DPadLeft, LEFT),
        (Button::DPadRight, RIGHT),
    ];
    let mut out = Vec::new();
    for (index, (id, gp)) in gilrs.gamepads().enumerate().take(4) {
        let key: usize = id.into();
        let before = prev.remove(&key).unwrap_or_default();
        let mut now = PadNow { index, ..Default::default() };
        let dz = |v: Vec2, d: f32| {
            let l = v.length();
            if l < d { Vec2::ZERO } else { v / l * ((l - d) / (1.0 - d)).min(1.0) }
        };
        now.left = dz(Vec2::new(gp.value(Axis::LeftStickX), gp.value(Axis::LeftStickY)), 0.18);
        now.right = dz(Vec2::new(gp.value(Axis::RightStickX), gp.value(Axis::RightStickY)), 0.14);
        now.l2 = gp.button_data(Button::LeftTrigger2).map(|d| d.value()).unwrap_or(0.0);
        now.r2 = gp.button_data(Button::RightTrigger2).map(|d| d.value()).unwrap_or(0.0);
        for (b, n) in MAP {
            if gp.is_pressed(b) {
                now.held.insert(n);
                if !before.held.contains(&n) {
                    now.pressed.insert(n);
                }
            }
        }
        // The stick flick: eight directions, instant, no menu. Up is 0, clockwise.
        let l = now.left.length();
        if l > 0.6 {
            let a = now.left.x.atan2(now.left.y); // 0 = up, clockwise positive
            let k = ((a / std::f32::consts::FRAC_PI_4).round() as i32).rem_euclid(8) as u8;
            now.flick = Some(k);
            now.flick_new = before.flick != Some(k);
        } else if l > 0.42 {
            now.flick = before.flick;
        }
        if !now.pressed.is_empty() || now.left.length() > 0.3 || now.right.length() > 0.3 || now.r2 > 0.1 || now.l2 > 0.1 {
            activity = true;
        }
        prev.insert(key, now.clone());
        out.push(now);
    }
    (out, activity)
}

#[derive(Default)]
pub struct HubState {
    pub active: bool,
    info: Option<Value>,
    pub me: usize,
    pub is_host: bool,
    pub server: bool,
    ready_sent: bool,
    started: bool,
    playing: bool,
    ended: bool,
    finished: bool,
    players: Vec<(usize, String)>,
    ready_ids: Vec<usize>,
    remote: [SurgeonInput; 4],
    send_t: f32,
    publish_t: f32,
    pending_cues: Vec<NetCue>,
    cue_serial: u32,
    seen_serial: u32,
    left: Vec<usize>,
    frames: u32,
    snapshot_size: usize,
    /// A client's tool change and button edges, repeated until the host has surely seen them:
    /// the messages are unreliable, and a tap can fall between two of them.
    out_tool: u8,
    out_pressed: u8,
    out_repeat: u8,
    /// Latest snapshots seen, for status.
    received: u32,
    sent: u32,
}

pub struct Product {
    pub shell: Shell,
    director: Director,
    device: Device,
    keys: HashSet<KeyCode>,
    key_taps: HashSet<KeyCode>,
    mouse: HashSet<MouseButton>,
    mouse_taps: HashSet<MouseButton>,
    cursor_px: Vec2,
    moved_px: f32,
    wheel: f32,
    tap: Option<Vec2>,
    any_event: bool,
    pads_prev: BTreeMap<usize, PadNow>,
    pad_slots: BTreeMap<usize, usize>,
    nav: [Repeat; 4],
    /// Whether a key or pad has ever been seen (a touch-only device unlocks when one arrives).
    seen_device: bool,
    touch_device: bool,
    keyboard_cursor: bool,
    rot_t: f32,
    fps: f32,
    fps_frames: u32,
    fps_t: Instant,
    hub: HubState,
    audio_seen_gesture: bool,
    paused: bool,
    scene: String,
    snapshot: Option<pav_core::SimState>,
    cam_distance: f32,
    last_beat: u32,
    bot_steps: bool,
    fonts_done: bool,
    last_save_text: String,
    peaks: [f32; 3],
    seed: u64,
    frame_count: u64,
    rot_dir: f32,
    more_key: bool,
    ready_tap: bool,
    last_stage: Option<Stage>,
    /// Tests on a software renderer: skip the 3D (a frame there takes seconds).
    lite: bool,
}

impl Product {
    pub fn new(scene: &str, seed: u64) -> Self {
        let save = hub::load_save().map(|t| Save::parse(&t)).unwrap_or_default();
        let about = About::parse(&hub::about_text().unwrap_or_else(|| ABOUT.to_string()));
        let shell = Shell::new(save, about);
        hub::install_hook();
        let mut pr = Product {
            shell,
            director: Director::default(),
            device: Device::KeyboardMouse,
            keys: HashSet::new(),
            key_taps: HashSet::new(),
            mouse: HashSet::new(),
            mouse_taps: HashSet::new(),
            cursor_px: Vec2::ZERO,
            moved_px: 0.0,
            wheel: 0.0,
            tap: None,
            any_event: false,
            pads_prev: BTreeMap::new(),
            pad_slots: BTreeMap::new(),
            nav: [Repeat::default(); 4],
            seen_device: false,
            touch_device: hub::touch_only(),
            keyboard_cursor: false,
            rot_t: 0.0,
            fps: 0.0,
            fps_frames: 0,
            fps_t: Instant::now(),
            hub: HubState { active: hub::active(), ..Default::default() },
            audio_seen_gesture: false,
            paused: false,
            scene: scene.to_string(),
            snapshot: None,
            cam_distance: 19.9,
            last_beat: 0,
            bot_steps: false,
            fonts_done: false,
            last_save_text: String::new(),
            peaks: [0.0; 3],
            seed,
            frame_count: 0,
            rot_dir: 1.0,
            more_key: false,
            ready_tap: false,
            last_stage: None,
            lite: hub::lite(),
        };
        // A scene named directly (a test, a direct link) goes straight there.
        pr.shell.screen = if pr.hub.active {
            Screen::Card
        } else if scene.contains("title") {
            Screen::Title
        } else if scene.contains("attract") {
            Screen::Attract
        } else {
            Screen::Playing
        };
        if pr.hub.active {
            pr.shell.session = true;
            pr.shell.card = Some(CardInfo::default());
        }
        pr
    }
}

impl App {
    fn product_load(&mut self, pr: &mut Product, scene: &str) {
        let Some(host) = &self.host else { return };
        let name = scene.to_string();
        let seed = pr.seed;
        pr.seed = pr.seed.wrapping_add(1);
        pr.scene = name.clone();
        let tune_shell = pr.shell.tune;
        let (diff, tremor, text_speed, auto) = (pr.shell.difficulty(), pr.shell.save.settings.tremor, pr.shell.save.settings.text_speed, pr.shell.auto);
        let dev = pr.shell.dev.clone();
        host.exec(move |sim| match Sim::new(&name, seed) {
            Ok(mut fresh) => {
                if let Some(g) = surgery::get_mut(&mut fresh) {
                    g.tune = tune_shell;
                    g.diff = diff;
                    g.tremor = tremor;
                    g.text_speed = text_speed;
                    g.auto_advance = auto;
                    g.dev.immortal |= dev.immortal;
                    g.dev.full_gift |= dev.full_gift;
                    g.dev.freeze_timer = dev.freeze_timer;
                    g.dev.one_hit = dev.one_hit;
                    g.dev.bot_plays = dev.bot_plays;
                }
                *sim = fresh;
            }
            Err(e) => log::error!("could not load scene: {e:#}"),
        });
        if let Some(gfx) = &mut self.gfx {
            gfx.renderer.clear_particles();
        }
        self.builder.clear_particles();
    }

    fn product_apply_audio(&self, pr: &Product) {
        if let Some(a) = &self.audio {
            let s = &pr.shell.save.settings;
            a.set_master(1.0);
            let ended = pr.hub.ended;
            a.set_bus(BUS_MUSIC, if ended { 0.0 } else { s.music });
            a.set_bus(BUS_EFFECTS, if ended { 0.0 } else { s.effects });
            a.set_bus(BUS_VOICES, if ended { 0.0 } else { s.voices });
        }
    }

    pub(crate) fn product_event(&mut self, el: &ActiveEventLoop, event: WindowEvent) {
        let Some(mut pr) = self.product.take() else { return };
        match event {
            WindowEvent::CloseRequested => el.exit(),
            WindowEvent::Focused(false) => {
                pr.keys.clear();
                pr.mouse.clear();
            }
            WindowEvent::Resized(sz) => {
                if let Some(g) = &mut self.gfx {
                    g.resize(sz.width, sz.height);
                }
            }
            WindowEvent::RedrawRequested => {
                self.product = Some(pr);
                self.frame();
                return;
            }
            WindowEvent::KeyboardInput { event, .. } => {
                #[cfg(target_arch = "wasm32")]
                self.resume_audio_again();
                pr.audio_seen_gesture = true;
                if let PhysicalKey::Code(code) = event.physical_key {
                    match event.state {
                        ElementState::Pressed => {
                            if !event.repeat {
                                pr.key_taps.insert(code);
                            }
                            pr.keys.insert(code);
                        }
                        ElementState::Released => {
                            pr.keys.remove(&code);
                        }
                    }
                    pr.device = Device::KeyboardMouse;
                    pr.seen_device = true;
                    pr.any_event = true;
                }
            }
            WindowEvent::MouseInput { state, button, .. } => {
                #[cfg(target_arch = "wasm32")]
                self.resume_audio_again();
                pr.audio_seen_gesture = true;
                match state {
                    ElementState::Pressed => {
                        pr.mouse.insert(button);
                        pr.mouse_taps.insert(button);
                    }
                    ElementState::Released => {
                        pr.mouse.remove(&button);
                    }
                }
                pr.device = Device::KeyboardMouse;
                pr.any_event = true;
                pr.keyboard_cursor = false;
            }
            WindowEvent::CursorMoved { position, .. } => {
                let p = Vec2::new(position.x as f32, position.y as f32);
                let d = (p - pr.cursor_px).length();
                pr.cursor_px = p;
                pr.moved_px += d;
                if d > 2.0 {
                    pr.device = Device::KeyboardMouse;
                    pr.keyboard_cursor = false;
                    pr.any_event = true;
                }
            }
            WindowEvent::MouseWheel { delta, .. } => {
                let lines = match delta {
                    MouseScrollDelta::LineDelta(_, y) => y,
                    MouseScrollDelta::PixelDelta(p) => p.y as f32 / 40.0,
                };
                pr.wheel += lines;
                pr.any_event = true;
                pr.device = Device::KeyboardMouse;
            }
            WindowEvent::Touch(t) => {
                #[cfg(target_arch = "wasm32")]
                self.resume_audio_again();
                if matches!(t.phase, winit::event::TouchPhase::Started) {
                    pr.tap = Some(Vec2::new(t.location.x as f32, t.location.y as f32));
                    pr.any_event = true;
                    pr.touch_device = pr.touch_device || !pr.seen_device;
                }
            }
            _ => {}
        }
        self.product = Some(pr);
    }

    #[cfg(target_arch = "wasm32")]
    fn resume_audio_again(&mut self) {
        if let Some(a) = &self.audio {
            a.resume();
        }
    }

    /// A frame of the game.
    pub(crate) fn product_frame(&mut self) {
        let Some(mut pr) = self.product.take() else { return };
        self.product_frame_inner(&mut pr);
        self.product = Some(pr);
    }

    fn product_frame_inner(&mut self, pr: &mut Product) {
        let now = Instant::now();
        let wall_dt = (now - self.last).as_secs_f32().min(2.0);
        let dt = wall_dt.min(0.1);
        self.last = now;
        pr.frame_count += 1;
        pr.fps_frames += 1;
        let since = pr.fps_t.elapsed().as_secs_f32();
        if since > 0.5 {
            pr.fps = pr.fps_frames as f32 / since;
            pr.fps_frames = 0;
            pr.fps_t = now;
        }
        if !pr.fonts_done {
            pr.fonts_done = true;
            style::install(&self.egui_ctx);
            self.product_apply_audio(pr);
        }

        if let Some((x, y)) = hub::take_tap() {
            let (w, h) = self.gfx.as_ref().unwrap().size();
            pr.tap = Some(Vec2::new(x * w as f32, y * h as f32));
            pr.any_event = true;
        }
        // Pads.
        let (pads, pad_active) = match &mut self.input.gilrs {
            Some(g) => read_pads(g, &mut pr.pads_prev),
            None => (Vec::new(), false),
        };
        if pad_active {
            pr.device = Device::Gamepad;
            pr.seen_device = true;
            pr.any_event = true;
            if !pr.audio_seen_gesture {
                #[cfg(target_arch = "wasm32")]
                self.resume_audio_again();
                // Browsers may not count a pad press as a gesture: say so on the title.
                pr.shell.sound_note = true;
            }
        }
        if pr.audio_seen_gesture {
            pr.shell.sound_note = false;
        }

        self.host.as_ref().unwrap().pump();
        let (prev, curr, curr_at, tick_wall) = self.host.as_ref().unwrap().frames();
        let sf = curr.surgery.clone();
        let alpha = ((now - curr_at).as_secs_f32() / tick_wall.max(1e-4)).clamp(0.0, 1.0);

        // Particles left in the air don't survive a change of stage.
        let stage = sf.as_ref().map(|f| f.stage);
        if stage != pr.last_stage {
            pr.last_stage = stage;
            if stage == Some(Stage::Story) || stage == Some(Stage::Title) {
                if let Some(gfx) = &mut self.gfx {
                    gfx.renderer.clear_particles();
                }
            }
        }
        // The camera.
        let (w, h) = self.gfx.as_ref().unwrap().size();
        let shot = sf.as_ref().map(|f| f.camera).unwrap_or_default();
        let k = 1.0 - (-dt * 7.0).exp();
        pr.cam_distance += (shot.distance - pr.cam_distance) * k;
        if (shot.distance - pr.cam_distance).abs() > 8.0 {
            pr.cam_distance = shot.distance;
        }
        self.rig.params = CameraParams {
            tilt: shot.tilt,
            yaw: shot.yaw,
            distance: pr.cam_distance,
            fov: shot.fov,
            ortho: false,
            follow_lag: 0.0,
            height_offset: 0.0,
        };
        let focus = Vec3::from_array(shot.target);
        self.rig.update(focus, dt);
        self.rig.snap(focus);

        let host = self.host.as_ref().unwrap();
        // Menu input.
        let scale = self.gfx.as_ref().unwrap().window.scale_factor() as f32;
        let zoom = style::zoom_for(h as f32, scale);
        self.egui_ctx.set_zoom_factor(zoom);
        let ppp = zoom * scale;
        let to_points = |p: Vec2| egui::pos2(p.x / ppp, p.y / ppp);
        let tap_of = |k: &HashSet<KeyCode>, c: KeyCode| k.contains(&c);
        let key_any = |ks: &[KeyCode]| ks.iter().any(|c| tap_of(&pr.key_taps, *c));
        let pad_any = |b: u8| pads.iter().any(|p| p.pressed.contains(&b));
        let held_dir = |ks: &[KeyCode], pad_dir: u8, axis: fn(Vec2) -> f32| {
            ks.iter().any(|c| pr.keys.contains(c) || pr.key_taps.contains(c)) || pads.iter().any(|p| p.held.contains(&pad_dir) || axis(p.left) > 0.55)
        };
        let up = held_dir(&[KeyCode::ArrowUp, KeyCode::KeyW], UP, |v| v.y);
        let down = held_dir(&[KeyCode::ArrowDown, KeyCode::KeyS], DOWN, |v| -v.y);
        let left = held_dir(&[KeyCode::ArrowLeft, KeyCode::KeyA], LEFT, |v| -v.x);
        let right = held_dir(&[KeyCode::ArrowRight, KeyCode::KeyD], RIGHT, |v| v.x);
        let create_held = pads.iter().any(|p| p.held.contains(&CREATE));
        let pointer = Some(to_points(pr.cursor_px));
        let in_session = pr.shell.session;
        let si = ShellInput {
            up: pr.nav[0].tick(up, dt),
            down: pr.nav[1].tick(down, dt),
            left: pr.nav[2].tick(left, dt),
            right: pr.nav[3].tick(right, dt),
            confirm: key_any(&[KeyCode::Enter, KeyCode::Space, KeyCode::NumpadEnter]) || pad_any(CROSS),
            back: key_any(&[KeyCode::Escape, KeyCode::Backspace]) || pad_any(CIRCLE),
            tab_l: key_any(&[KeyCode::KeyQ, KeyCode::PageUp]) || pad_any(L1),
            tab_r: key_any(&[KeyCode::KeyE, KeyCode::PageDown]) || pad_any(R1),
            // Options is ignored while Create is held: that combination is the hub's.
            options: !in_session && (key_any(&[KeyCode::Escape]) || (pad_any(OPTIONS) && !create_held)),
            chart: key_any(&[KeyCode::Tab]) || pad_any(SQUARE),
            auto_toggle: key_any(&[KeyCode::KeyF]) || pad_any(TRIANGLE),
            pointer,
            pointer_moved: pr.moved_px > 2.0,
            click: pr.mouse_taps.contains(&MouseButton::Left),
            pointer_down: pr.mouse.contains(&MouseButton::Left),
            any: pr.any_event,
            device: pr.device,
            // The shell's clocks (attract) run on real time, however slow the frames.
            dt: wall_dt,
            fps: pr.fps,
            tps: host.shared.stats.lock().unwrap().tps,
            touch_only: pr.touch_device && !pr.seen_device,
            // On a touch-only device a browser may report a tap as a click.
            tap: pr.tap.map(to_points).or(if pr.touch_device && !pr.seen_device && pr.mouse_taps.contains(&MouseButton::Left) { pointer } else { None }),
        };

        // Game input.
        let f_opt = sf.as_deref();
        if let Some(f) = f_opt {
            let window = self.gfx.as_ref().unwrap().window.clone();
            let demo = pr.shell.screen == Screen::Attract;
            let in_op = demo || (f.stage == Stage::Op && pr.shell.wants_game_input() && pr.device == Device::KeyboardMouse && !pr.keyboard_cursor);
            window.set_cursor_visible(!in_op);
        }
        let (aim_px, ground) = {
            let size = Vec2::new(w as f32, h as f32);
            (self.rig.ground_point(pr.cursor_px, size, 0.6), size)
        };
        let _ = ground;
        let inputs = surgeon_inputs(pr, &pads, f_opt, aim_px.map(|p| Vec2::new(p.x, p.z)), dt);
        let local_slot = if pr.hub.active { pr.hub.me } else { 0 };
        pr.shell.local = local_slot.min(3);
        let local_aim = inputs[local_slot.min(3)].abs.then_some(inputs[local_slot.min(3)].aim);
        {
            let mut i = host.shared.input.lock().unwrap();
            let want = pr.shell.wants_game_input();
            for k in 0..4 {
                let mut s = if want { inputs[k] } else { SurgeonInput::default() };
                if pr.hub.active && pr.hub.is_host && k != pr.hub.me {
                    s = pr.hub.remote[k];
                }
                if pr.hub.active && pr.hub.server {
                    s = pr.hub.remote[k];
                }
                let keep_pressed = i.surgeons[k].pressed;
                let keep_tool = i.surgeons[k].tool;
                let keep_cycle = i.surgeons[k].cycle;
                i.surgeons[k] = s;
                i.surgeons[k].pressed |= keep_pressed;
                if s.tool == 0 {
                    i.surgeons[k].tool = keep_tool;
                }
                if s.cycle == 0 {
                    i.surgeons[k].cycle = keep_cycle;
                }
            }
        }
        if pr.hub.active {
            for k in 0..4 {
                pr.hub.remote[k].pressed = 0;
                pr.hub.remote[k].tool = 0;
                pr.hub.remote[k].cycle = 0;
            }
        }

        // Test hook: ticks and commands.
        let steps = hub::take_steps();
        if steps > 0 {
            let bot = pr.bot_steps;
            host.exec(move |sim| {
                for _ in 0..steps {
                    let input = if bot { sim.bot_input() } else { Default::default() };
                    sim.step(&input);
                    sim.drain_events();
                }
            });
        }

        // Effects and sound.
        self.builder.now = self.started.elapsed().as_secs_f64();
        let events: Vec<SimEvent> = std::mem::take(&mut *host.shared.events.lock().unwrap());
        self.builder.add_events(&events);
        if let Some(a) = &self.audio {
            let (_, right) = self.rig.ground_axes();
            let l = Listener { pos: Vec3::new(0.0, 0.0, 0.0), right };
            for e in &events {
                a.play_event(e, &l, 1.0);
            }
        }
        if pr.hub.active && pr.hub.is_host {
            for e in &events {
                if let SimEvent::Cue { id, pos, gain, pitch } = e {
                    // Heartbeats are every client's own to hear from the frame; others travel.
                    if *id != cue::MONITOR {
                        pr.hub.cue_serial += 1;
                        let c = NetCue { serial: pr.hub.cue_serial, id: *id, at: Vec2::new(pos.x, pos.z), gain: *gain, pitch: *pitch };
                        pr.hub.pending_cues.push(c);
                    }
                }
            }
            let n = pr.hub.pending_cues.len();
            if n > 8 {
                pr.hub.pending_cues.drain(..n - 8);
            }
        }
        if let (Some(f), Some(a)) = (f_opt, self.audio.as_mut()) {
            if !pr.hub.ended && !pr.paused {
                pr.director.update(a, f, dt);
            }
            let got = a.take_peaks();
            for k in 0..3 {
                pr.peaks[k] = (pr.peaks[k] * 0.9).max(got[k]);
            }
        }
        // Rumble: on the beat when vitals are low; on tool contact.
        if let Some(f) = f_opt {
            if pr.shell.save.settings.rumble && pr.device == Device::Gamepad && f.stage == Stage::Op && pr.frame_count % 2 == 0 {
                if f.beats != pr.last_beat {
                    pr.last_beat = f.beats;
                    if f.vitals < 45.0 {
                        hub::rumble(0, 120.0, 0.2, 0.2 + f.crisis * 0.6);
                    }
                }
                if f.slots.first().is_some_and(|s| s.eng != 0) {
                    hub::rumble(0, 40.0, 0.25, 0.0);
                }
            }
        }

        // The look: hub servers skip all of it.
        let server = pr.hub.active && pr.hub.server;
        {
            let s = &pr.shell.save.settings;
            self.builder.surgery.looks = pav_view::surgery::Looks { clinical: s.clinical, reduce_flashes: s.reduce_flashes, no_shake: !s.shake, headless: server || pr.lite };
            self.builder.surgery.local_cursor = local_aim.map(|a| (local_slot.min(3), a));
        }
        let view = self.view.clone();
        let mut scene = self.builder.build(&prev, &curr, alpha, &self.rig, w as f32 / h.max(1) as f32, &view, focus);
        if let Some(gfx) = &mut self.gfx {
            gfx.renderer.render_scale = 1.0;
        }

        // The UI.
        let vp = Mat4::from(scene.camera.proj * scene.camera.view);
        let gfx = self.gfx.as_mut().unwrap();
        let state = self.egui_state.as_mut().unwrap();
        let raw = state.take(&gfx.window);
        let shell = &mut pr.shell;
        let f_ref = sf.as_deref();
        let out = self.egui_ctx.run_ui(raw, |ui| {
            shell.ui(ui.ctx(), &si, f_ref, vp);
        });
        state.platform_output(&gfx.window, out.platform_output);
        let pixels = out.pixels_per_point;
        let prims = self.egui_ctx.tessellate(out.shapes, pixels);
        let mut textures = out.textures_delta;
        if server || pr.lite {
            scene.post.gi = 0.0;
            scene.post.bloom = 0.0;
            scene.sun.shadows = false;
            scene.point_lights.clear();
            scene.dynamic.clear();
            scene.meshes.clear();
            scene.sdfs.clear();
        }
        gfx.draw(&scene, Some((&prims, &mut textures, pixels)));

        // Clear this frame's edges.
        pr.key_taps.clear();
        pr.mouse_taps.clear();
        pr.moved_px = 0.0;
        pr.wheel = 0.0;
        pr.tap = None;
        pr.any_event = false;

        self.product_commands(pr);
        self.product_hub(pr, f_opt, &pads, &inputs);
        self.product_hook(pr, &curr);
        // The first frame: tell the hub we're loaded.
        if pr.hub.active && !pr.hub.ready_sent && pr.hub.info.is_some() {
            pr.hub.ready_sent = true;
            hub::ready();
        }
    }

    fn product_commands(&mut self, pr: &mut Product) {
        let cmds = std::mem::take(&mut pr.shell.cmds);
        for c in cmds {
            let Some(host) = &self.host else { return };
            let surgery_do = |f: Box<dyn FnOnce(&mut surgery::Surgery) + Send>| {
                host.exec(move |sim| {
                    if let Some(g) = surgery::get_mut(sim) {
                        f(g);
                    }
                });
            };
            match c {
                Cmd::Load(s) => self.product_load(pr, &s),
                Cmd::Paused(p) => {
                    pr.paused = p;
                    host.set_control(|c| {
                        c.paused = p;
                    });
                }
                Cmd::Apply => {
                    self.product_apply_audio(pr);
                    let (tremor, speed) = (pr.shell.save.settings.tremor, pr.shell.save.settings.text_speed);
                    surgery_do(Box::new(move |g| {
                        g.tremor = tremor;
                        g.text_speed = speed;
                    }));
                }
                Cmd::Save => {
                    if let Ok(text) = serde_json::to_string(&pr.shell.save) {
                        if text != pr.last_save_text {
                            hub::store_save(&text);
                            pr.last_save_text = text;
                        }
                    }
                }
                Cmd::Tune(k, v) => surgery_do(Box::new(move |g| {
                    g.tune.set(k, v);
                })),
                Cmd::ResetTune => surgery_do(Box::new(|g| g.tune = Default::default())),
                Cmd::Flag(k, v) => surgery_do(Box::new(move |g| match k {
                    "immortal" => g.dev.immortal = v,
                    "freeze_timer" => g.dev.freeze_timer = v,
                    "full_gift" => g.dev.full_gift = v,
                    "one_hit" => g.dev.one_hit = v,
                    "bot_plays" => g.dev.bot_plays = v,
                    _ => {}
                })),
                Cmd::Jump(case, phase) => {
                    let scene = format!("surgery/case/{case}/{phase}");
                    self.product_load(pr, &scene);
                }
                Cmd::SkipPhase => surgery_do(Box::new(|g| g.skip_phase())),
                Cmd::WinCase => surgery_do(Box::new(|g| g.win_case())),
                Cmd::ForceCode => surgery_do(Box::new(|g| g.force_code())),
                Cmd::KillPatient => surgery_do(Box::new(|g| g.kill_patient())),
                Cmd::Spawn(k) => surgery_do(Box::new(move |g| g.spawn_hazard(k))),
                Cmd::RetryCheckpoint => surgery_do(Box::new(|g| g.retry_checkpoint())),
                Cmd::RetryStart => surgery_do(Box::new(|g| g.retry_start())),
                Cmd::TimeScale(v) => host.set_control(|c| c.speed = v),
                Cmd::FrameStep => host.set_control(|c| c.step_requests += 1),
                Cmd::Rewind => host.exec(|sim| {
                    let t = sim.state.tick.saturating_sub(300);
                    let oldest = sim.history.oldest_tick().unwrap_or(t);
                    sim.rewind_to(t.max(oldest));
                    sim.commit_rewind();
                }),
                Cmd::SnapSave => {
                    pr.snapshot = host.query(|sim| sim.snapshot());
                }
                Cmd::SnapLoad => {
                    if let Some(s) = pr.snapshot.clone() {
                        host.exec(move |sim| sim.restore(s));
                    }
                }
                Cmd::Reload => {
                    #[cfg(not(target_arch = "wasm32"))]
                    if let Err(e) = pav_core::games::surgery::content::reload() {
                        log::error!("{e:#}");
                        pr.shell.stats_line = format!("{e:#}");
                    } else {
                        pr.shell.stats_line = "content reloaded".into();
                    }
                }
                Cmd::Difficulty(d) => {
                    let d = Difficulty::from_name(&d).unwrap_or_default();
                    surgery_do(Box::new(move |g| g.diff = d));
                }
                Cmd::Cue(id) => {
                    if let Some(a) = &self.audio {
                        a.play_event(&SimEvent::Cue { id, pos: Vec3::ZERO, gain: 1.0, pitch: 1.0 }, &Listener::default(), 1.0);
                    }
                }
                Cmd::Fullscreen(_) => {
                    if let Some(g) = &self.gfx {
                        crate::platform::toggle_fullscreen(&g.window);
                    }
                }
                Cmd::Auto(on) => surgery_do(Box::new(move |g| g.auto_advance = on)),
                Cmd::Quit => self.quit = true,
            }
        }
    }

    fn product_hook(&mut self, pr: &mut Product, curr: &pav_core::RenderFrame) {
        for text in hub::take_dos() {
            let Ok(v) = serde_json::from_str::<Value>(&text) else { continue };
            if let Some(s) = v.get("load").and_then(|x| x.as_str()) {
                let s = s.to_string();
                self.product_load(pr, &s);
                pr.shell.screen = if s.contains("title") { Screen::Title } else { Screen::Playing };
            }
            let Some(host) = &self.host else { continue };
            if let Some(b) = v.get("no_attract").and_then(|x| x.as_bool()) {
                pr.shell.no_attract = b;
            }
            if let Some(b) = v.get("bot").and_then(|x| x.as_bool()) {
                pr.bot_steps = b;
            }
            if let Some(n) = v.get("screen").and_then(|x| x.as_str()) {
                pr.shell.screen = match n {
                    "menu" => Screen::Menu,
                    "settings" => Screen::Settings,
                    "about" => Screen::About,
                    "pause" => Screen::Pause,
                    "dev" => Screen::Dev,
                    "playing" => Screen::Playing,
                    "cases" => Screen::Cases,
                    "controls" => Screen::Controls,
                    _ => Screen::Title,
                };
                pr.shell.focus = 0;
                pr.shell.page = 0;
            }
            if let Some(p) = v.get("page").and_then(|x| x.as_u64()) {
                pr.shell.page = p as usize;
            }
            if let Some(b) = v.get("paused").and_then(|x| x.as_bool()) {
                pr.paused = b;
                host.set_control(|c| c.paused = b);
            }
            if let Some(b) = v.get("dev_live").and_then(|x| x.as_bool()) {
                pr.shell.dev.live = b;
            }
            if let Some(b) = v.get("immortal").and_then(|x| x.as_bool()) {
                host.exec(move |sim| {
                    if let Some(g) = surgery::get_mut(sim) {
                        g.dev.immortal = b;
                    }
                });
            }
            if v.get("win").is_some() {
                host.exec(|sim| {
                    if let Some(g) = surgery::get_mut(sim) {
                        g.win_case();
                    }
                });
            }
            if let Some(a) = v.get("advance").and_then(|x| x.as_u64()) {
                // Hold the game's clock, drive so many ticks of bot.
                let n = a as u32;
                host.exec(move |sim| {
                    for _ in 0..n {
                        let input = sim.bot_input();
                        sim.step(&input);
                        sim.drain_events();
                    }
                });
            }
        }
        // What's going on, for tests.
        if pr.frame_count % 2 == 0 || hub::active() {
            let sim_status = curr.surgery.as_ref().map(|f| {
                json!({
                    "stage": format!("{:?}", f.stage),
                    "case": f.case,
                    "phase": f.phase,
                    "vitals": f.vitals,
                    "bpm": f.bpm,
                    "timer": f.timer,
                    "hazards": f.hazards.len(),
                    "tool": f.slots.first().map(|s| s.tool),
                    "ring_pos": f.slots.first().map(|s| s.ring_pos),
                    "using": f.slots.first().map(|s| s.using),
                    "pressure": f.slots.first().map(|s| s.pressure),
                    "cursor": f.slots.first().map(|s| [s.cursor.x, s.cursor.y]),
                    "cursors": f.slots.iter().map(|s| json!([s.active, s.cursor.x, s.cursor.y])).collect::<Vec<_>>(),
                    "demo": f.demo,
                    "music": f.music,
                    "tick": f.tick,
                    "beats": f.beats,
                })
            });
            let s = &pr.shell.save.settings;
            let status = json!({
                "title": pav_ui::surgery::TITLE,
                "scene": pr.scene,
                "device": match pr.device { Device::Gamepad => "pad", Device::Touch => "touch", Device::KeyboardMouse => "keys" },
                "shell": pr.shell.status(),
                "sim": sim_status,
                "bus": { "music": s.music, "effects": s.effects, "voices": s.voices },
                "peaks": pr.peaks,
                "audio_device": self.audio.is_some(),
                "paused": pr.paused,
                "fps": pr.fps,
                "frames": pr.frame_count,
                "outcome": match curr.surgery.as_ref().map(|f| f.stage) { Some(Stage::Done) => "won", Some(Stage::Dead) => "lost", _ => "playing" },
                "hub": {
                    "active": pr.hub.active,
                    "me": pr.hub.me,
                    "host": pr.hub.is_host,
                    "server": pr.hub.server,
                    "playing": pr.hub.playing,
                    "ended": pr.hub.ended,
                    "received": pr.hub.received,
                    "sent": pr.hub.sent,
                    "snapshot": pr.hub.snapshot_size,
                },
            });
            hub::set_status(&status);
        }
    }

    fn product_hub(&mut self, pr: &mut Product, f: Option<&SurgeryFrame>, pads: &[PadNow], inputs: &[SurgeonInput; 4]) {
        if !pr.hub.active {
            return;
        }
        pr.hub.frames += 1;
        // Connection.
        if pr.hub.info.is_none() {
            match hub::info() {
                Some(Value::Null) => {
                    // No hub after all: run as on its own.
                    pr.hub.active = false;
                    pr.shell.session = false;
                    pr.shell.card = None;
                    pr.shell.screen = Screen::Title;
                }
                Some(info) => {
                    pr.hub.me = info.get("me").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                    pr.hub.is_host = info.get("isHost").and_then(|v| v.as_bool()).unwrap_or(false);
                    pr.hub.server = info.get("server").and_then(|v| v.as_bool()).unwrap_or(false);
                    pr.seed = info.get("seed").and_then(|v| v.as_u64()).unwrap_or(1);
                    if let Some(list) = info.get("players").and_then(|v| v.as_array()) {
                        pr.hub.players = list
                            .iter()
                            .map(|p| (p.get("id").and_then(|x| x.as_u64()).unwrap_or(0) as usize, p.get("name").and_then(|x| x.as_str()).unwrap_or("").to_string()))
                            .collect();
                        for (id, name) in &pr.hub.players {
                            if *id < 4 {
                                pr.shell.names[*id] = name.clone();
                            }
                        }
                    }
                    let card = pr.shell.card.get_or_insert_with(CardInfo::default);
                    card.players = pr.hub.players.iter().map(|(_, n)| (n.clone(), false)).collect();
                    card.me = pr.hub.me;
                    pr.hub.info = Some(info);
                    // The card scene: a beating heart behind the board.
                    self.product_load(pr, "surgery/card");
                }
                None => {}
            }
        }
        if pr.hub.info.is_none() {
            return;
        }
        // The card's answers.
        if !pr.hub.started {
            let card_ready = pads.iter().any(|p| p.pressed.contains(&CROSS));
            let more = pads.iter().any(|p| p.pressed.contains(&TRIANGLE)) || self.input_taps_more(pr);
            if card_ready {
                hub::answer("ready");
            }
            if more {
                hub::answer("more");
            }
            if pr.key_taps_touch_ready() {
                hub::answer("ready");
            }
        }
        // Events.
        for ev in hub::poll() {
            let name = ev.get(0).and_then(|v| v.as_str()).unwrap_or("");
            let data = ev.get(1).cloned().unwrap_or(Value::Null);
            match name {
                "card" => {
                    let card = pr.shell.card.get_or_insert_with(CardInfo::default);
                    card.left = data.get("left").and_then(|v| v.as_f64()).map(|m| m as f32 / 1000.0);
                    card.paused = data.get("paused").and_then(|v| v.as_bool()).unwrap_or(false);
                    card.starting = data.get("starting").and_then(|v| v.as_bool()).unwrap_or(false);
                    card.asked = data.get("asked").and_then(|v| v.as_bool()).unwrap_or(false);
                    let ready: Vec<usize> = data.get("ready").and_then(|v| v.as_array()).map(|a| a.iter().filter_map(|x| x.as_u64().map(|n| n as usize)).collect()).unwrap_or_default();
                    pr.hub.ready_ids = ready.clone();
                    card.players = pr.hub.players.iter().map(|(id, n)| (n.clone(), ready.contains(id))).collect();
                }
                "start" => {
                    pr.hub.started = true;
                    let scene = if pr.hub.is_host { "surgery/codeblue" } else { "surgery/mirror" };
                    self.product_load(pr, scene);
                    if let Some(host) = &self.host {
                        host.set_control(|c| c.paused = true);
                        let ids: Vec<usize> = pr.hub.players.iter().map(|(id, _)| *id).collect();
                        let server = pr.hub.server;
                        let is_host = pr.hub.is_host;
                        if is_host {
                            host.exec(move |sim| {
                                if let Some(g) = surgery::get_mut(sim) {
                                    g.no_local = server;
                                    if let Some(op) = &mut g.op {
                                        for (i, s) in op.slots.iter_mut().enumerate() {
                                            s.active = ids.contains(&i);
                                            s.bot = false;
                                        }
                                    }
                                }
                            });
                        }
                    }
                    #[cfg(target_arch = "wasm32")]
                    self.resume_audio_again();
                }
                "message" => {
                    let from = ev.get(2).and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                    pr.hub.received += 1;
                    if pr.hub.is_host {
                        if let Some(inp) = net::decode_input(&data) {
                            if from < 4 {
                                let old = pr.hub.remote[from];
                                pr.hub.remote[from] = inp;
                                pr.hub.remote[from].pressed |= old.pressed;
                            }
                        }
                    } else if let Some(frame) = net::decode(&data) {
                        let cues = net::decode_cues(&data);
                        let arc = std::sync::Arc::new(frame);
                        if let Some(host) = &self.host {
                            host.exec(move |sim| {
                                if let Some(g) = surgery::get_mut(sim) {
                                    g.mirror_frame = Some(arc);
                                }
                            });
                        }
                        if let Some(a) = &self.audio {
                            let l = Listener::default();
                            for c in cues {
                                if c.serial > pr.hub.seen_serial {
                                    pr.hub.seen_serial = c.serial;
                                    a.play_event(&SimEvent::Cue { id: c.id, pos: Vec3::new(c.at.x, 0.3, c.at.y), gain: c.gain, pitch: c.pitch }, &l, 1.0);
                                }
                            }
                        }
                    }
                }
                "leave" => {
                    let id = data.get("id").and_then(|v| v.as_u64()).unwrap_or(99) as usize;
                    pr.hub.left.push(id);
                    if let Some(c) = &mut pr.shell.card {
                        c.players.retain(|(n, _)| Some(n) != pr.hub.players.iter().find(|(i, _)| *i == id).map(|(_, n)| n));
                    }
                    if pr.hub.is_host {
                        if let Some(host) = &self.host {
                            host.exec(move |sim| {
                                if let Some(g) = surgery::get_mut(sim) {
                                    if let Some(op) = &mut g.op {
                                        if id < 4 {
                                            op.slots[id].active = false;
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
                "end" => {
                    pr.hub.ended = true;
                    self.product_apply_audio(pr);
                }
                _ => {}
            }
        }
        // The countdown.
        if pr.hub.started && !pr.hub.playing {
            let t = hub::time();
            if t >= 0.0 {
                pr.hub.playing = true;
                pr.shell.screen = Screen::Playing;
                if let Some(c) = &mut pr.shell.card {
                    c.playing = true;
                }
                if let Some(host) = &self.host {
                    host.set_control(|c| c.paused = false);
                }
            } else if let Some(c) = &mut pr.shell.card {
                c.countdown = if t.is_finite() { Some((-t / 1000.0) as f32) } else { None };
            }
        }
        if pr.hub.ended || !pr.hub.playing {
            return;
        }
        pr.hub.send_t += 1.0 / pr.fps.max(1.0);
        let period = 1.0 / 15.0;
        let dt_now = 0.0;
        let _ = dt_now;
        if pr.hub.is_host {
            let Some(f) = f else { return };
            if pr.hub.send_t >= period {
                pr.hub.send_t = 0.0;
                let v = net::encode(f, &pr.hub.pending_cues);
                pr.hub.snapshot_size = v.to_string().len();
                hub::send(&v);
                pr.hub.sent += 1;
            }
            pr.hub.publish_t += 1.0 / pr.fps.max(1.0);
            let done = matches!(f.stage, Stage::Results | Stage::Done | Stage::Dead);
            if pr.hub.publish_t > 1.0 || done {
                pr.hub.publish_t = 0.0;
                let won = !matches!(f.stage, Stage::Dead);
                let out = standings(&pr.hub.players, &pr.hub.left, f, won);
                hub::publish(&out);
                if done && !pr.hub.finished {
                    pr.hub.finished = true;
                    hub::finish(&out);
                }
            }
        } else {
            let me = pr.hub.me.min(3);
            let mut mine = inputs[me];
            // A cycle becomes the position it lands on, so a repeat can't turn it twice.
            let ring_pos = f.and_then(|x| x.slots.get(me)).map(|x| x.ring_pos as i32).unwrap_or(0);
            if mine.cycle != 0 {
                mine.tool = (ring_pos + mine.cycle as i32).rem_euclid(8) as u8 + 1;
                mine.cycle = 0;
            }
            if mine.tool != 0 {
                pr.hub.out_tool = mine.tool;
                pr.hub.out_repeat = 4;
            }
            if mine.pressed != 0 {
                pr.hub.out_pressed |= mine.pressed;
                pr.hub.out_repeat = 4;
            }
            if pr.hub.send_t >= period {
                pr.hub.send_t = 0.0;
                if pr.hub.out_repeat > 0 {
                    pr.hub.out_repeat -= 1;
                    mine.tool = pr.hub.out_tool;
                    mine.pressed |= pr.hub.out_pressed;
                    if pr.hub.out_repeat == 0 {
                        pr.hub.out_tool = 0;
                        pr.hub.out_pressed = 0;
                    }
                }
                hub::send(&net::encode_input(&mine));
                pr.hub.sent += 1;
            }
        }
    }

    fn input_taps_more(&self, pr: &Product) -> bool {
        pr.more_key
    }
}

impl Product {
    fn key_taps_touch_ready(&self) -> bool {
        self.ready_tap
    }
}

fn standings(players: &[(usize, String)], left: &[usize], f: &SurgeryFrame, won: bool) -> Value {
    let mut order: Vec<(usize, i64, u32)> = players
        .iter()
        .filter(|(id, _)| !left.contains(id))
        .map(|(id, _)| {
            let s = f.slots.get(*id);
            (*id, s.map(|x| x.score).unwrap_or(0), s.map(|x| x.chain).unwrap_or(0))
        })
        .collect();
    order.sort_by_key(|(_, score, _)| std::cmp::Reverse(*score));
    let list: Vec<Value> = order.iter().map(|(id, _, _)| json!([id])).collect();
    let mut scores = serde_json::Map::new();
    let mut stats = serde_json::Map::new();
    for (id, score, chain) in &order {
        scores.insert(id.to_string(), json!(score));
        stats.insert(id.to_string(), json!({ "Chain": chain, "Vitals left": f.vitals as i32 }));
    }
    let awards: Vec<Value> = order.first().map(|(id, _, _)| json!({ "id": id, "title": "Immaculate Hands", "detail": "Most points on the table" })).into_iter().collect();
    json!({ "standings": list, "scores": scores, "won": won, "stats": stats, "awards": awards })
}

/// Builds each seat's input from the devices.
fn surgeon_inputs(pr: &mut Product, pads: &[PadNow], f: Option<&SurgeryFrame>, mouse_aim: Option<Vec2>, dt: f32) -> [SurgeonInput; 4] {
    let mut out: [SurgeonInput; 4] = Default::default();
    let code = f.is_some_and(|x| x.code.is_some());
    let stage = f.map(|x| x.stage);
    let in_op = stage == Some(Stage::Op);
    let holding_bone = |slot: usize| f.and_then(|x| x.slots.get(slot)).is_some_and(|s| s.eng == 10);

    // Pads: the first plays seat 0; any unassigned pad joins with Cross.
    for p in pads {
        if !pr.pad_slots.contains_key(&p.index) {
            if p.index == 0 {
                pr.pad_slots.insert(0, 0);
            } else if p.pressed.contains(&CROSS) && in_op {
                let taken: Vec<usize> = pr.pad_slots.values().copied().collect();
                if let Some(free) = (1..4).find(|s| !taken.contains(s)) {
                    pr.pad_slots.insert(p.index, free);
                }
            }
        }
    }
    let solo_seat = if pr.hub.active { pr.hub.me.min(3) } else { 0 };
    for p in pads {
        let Some(&slot) = pr.pad_slots.get(&p.index) else { continue };
        let slot = if pr.hub.active { if p.index == 0 { solo_seat } else { continue } } else { slot };
        // Pad 0 shares seat 0 with the keyboard: it plays when it was used last.
        if slot == solo_seat && pr.device != Device::Gamepad {
            continue;
        }
        let mut s = SurgeonInput { active: true, abs: false, ..Default::default() };
        s.aim = Vec2::new(p.right.x, -p.right.y);
        let cross = p.held.contains(&CROSS);
        let use_ = p.r2 > 0.08 || cross;
        if code {
            if p.l2 > 0.3 && p.r2 > 0.3 {
                s.held |= btn::DEFIB;
            }
        } else if use_ {
            s.held |= btn::USE;
            s.pressure = if cross { 1.0 } else { p.r2 };
        }
        if p.l2 > 0.3 && !code {
            s.held |= btn::PRECISION;
        }
        if p.held.contains(&CIRCLE) {
            s.held |= btn::CANCEL;
        }
        if p.held.contains(&TRIANGLE) && in_op {
            s.held |= btn::GIFT;
        }
        if p.flick_new {
            if let Some(k) = p.flick {
                s.tool = k + 1;
            }
        }
        if holding_bone(slot) {
            if p.held.contains(&L1) {
                s.held |= btn::ROT_L;
            }
            if p.held.contains(&R1) {
                s.held |= btn::ROT_R;
            }
        } else {
            if p.pressed.contains(&L1) {
                s.cycle = -1;
            }
            if p.pressed.contains(&R1) {
                s.cycle = 1;
            }
        }
        // Story, chart, results and retry.
        if !in_op {
            if cross {
                s.held |= btn::ADVANCE;
            }
            if p.pressed.contains(&CROSS) {
                s.pressed |= btn::ADVANCE;
            }
            if p.pressed.contains(&CIRCLE) {
                s.pressed |= btn::CANCEL;
            }
        }
        out[slot] = s;
    }

    // Keyboard and mouse: seat 0 (or this copy's seat in a session).
    if pr.device == Device::KeyboardMouse {
        let k = |c: KeyCode| pr.keys.contains(&c);
        let mut s = SurgeonInput { active: true, ..Default::default() };
        let axis = Vec2::new(
            (k(KeyCode::KeyD) || k(KeyCode::ArrowRight)) as i32 as f32 - (k(KeyCode::KeyA) || k(KeyCode::ArrowLeft)) as i32 as f32,
            (k(KeyCode::KeyS) || k(KeyCode::ArrowDown)) as i32 as f32 - (k(KeyCode::KeyW) || k(KeyCode::ArrowUp)) as i32 as f32,
        );
        if axis != Vec2::ZERO {
            pr.keyboard_cursor = true;
        }
        if pr.keyboard_cursor {
            s.abs = false;
            s.aim = axis.normalize_or_zero() * 0.82;
        } else if let Some(a) = mouse_aim {
            s.abs = true;
            s.aim = a;
        }
        let left = pr.mouse.contains(&MouseButton::Left);
        let right = pr.mouse.contains(&MouseButton::Right);
        let on_tray = mouse_aim.is_some_and(|a| a.y > TRAY_Z) && !pr.keyboard_cursor;
        // Click an instrument on the tray.
        if pr.mouse_taps.contains(&MouseButton::Left) && on_tray {
            if let Some(a) = mouse_aim {
                let near = (0..8).min_by(|x, y| tray_slot(*x).distance(a).total_cmp(&tray_slot(*y).distance(a)));
                if let Some(n) = near {
                    s.tool = n as u8 + 1;
                }
            }
        }
        let use_key = k(KeyCode::KeyE);
        if code {
            if left && right {
                s.held |= btn::DEFIB;
            }
        } else if (left && !on_tray) || use_key {
            s.held |= btn::USE;
            s.pressure = 1.0;
        }
        if k(KeyCode::ShiftLeft) || k(KeyCode::ShiftRight) {
            s.held |= btn::PRECISION;
        }
        if (right && !code) || k(KeyCode::KeyQ) {
            s.held |= btn::CANCEL;
        }
        if k(KeyCode::Space) && in_op {
            s.held |= btn::GIFT;
        }
        for (i, c) in [KeyCode::Digit1, KeyCode::Digit2, KeyCode::Digit3, KeyCode::Digit4, KeyCode::Digit5, KeyCode::Digit6, KeyCode::Digit7, KeyCode::Digit8].iter().enumerate() {
            if pr.key_taps.contains(c) {
                s.tool = i as u8 + 1;
            }
        }
        let slot = solo_seat;
        pr.rot_t = (pr.rot_t - dt).max(0.0);
        if pr.wheel != 0.0 {
            if holding_bone(slot) {
                pr.rot_t = 0.14;
                pr.rot_dir = pr.wheel.signum();
            } else {
                s.cycle = if pr.wheel > 0.0 { -1 } else { 1 };
            }
        }
        if pr.rot_t > 0.0 {
            s.held |= if pr.rot_dir > 0.0 { btn::ROT_R } else { btn::ROT_L };
        }
        if !in_op {
            let adv = k(KeyCode::Enter) || k(KeyCode::Space) || k(KeyCode::NumpadEnter) || left;
            if adv {
                s.held |= btn::ADVANCE;
            }
            if pr.key_taps.contains(&KeyCode::Enter) || pr.key_taps.contains(&KeyCode::Space) || pr.key_taps.contains(&KeyCode::NumpadEnter) || pr.mouse_taps.contains(&MouseButton::Left) {
                s.pressed |= btn::ADVANCE;
            }
            if pr.key_taps.contains(&KeyCode::KeyQ) || pr.key_taps.contains(&KeyCode::Backspace) || pr.mouse_taps.contains(&MouseButton::Right) {
                s.pressed |= btn::CANCEL;
            }
        }
        out[slot] = s;
    }
    pr.more_key = pr.key_taps.contains(&KeyCode::KeyM);
    pr.ready_tap = pr.tap.is_some() || pr.mouse_taps.contains(&MouseButton::Left);
    out
}
