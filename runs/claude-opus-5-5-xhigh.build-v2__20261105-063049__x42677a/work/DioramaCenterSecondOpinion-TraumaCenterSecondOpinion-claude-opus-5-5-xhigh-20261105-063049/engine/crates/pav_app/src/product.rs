//! The surgery game's own frame path: when the scene is `surgery*`, `App::frame` and
//! `App::window_event` branch here, past the demo's boot, panels, cards, hint bar, touch layer,
//! F-keys, rewinding Backspace and bound keys. It reuses `Gfx`, `SimHost`, `ViewBuilder` and
//! `CameraRig`.

use std::collections::HashSet;

use glam::{Vec2, Vec3};
use pav_audio::music::{MusicInput, Sequencer};
use pav_audio::voice::{self, Speaker, VoiceDef};
use pav_audio::{BUS_MUSIC, BUS_VOICES};
use pav_core::games::surgery::content;
use pav_core::games::surgery::field::{HazardKind, Tool};
use pav_core::games::surgery::frame::{Stage, SurgeryFrame};
use pav_core::games::surgery::surgeon::{self, tray_place};
use pav_core::games::surgery::{Surgery, cue};
use pav_core::input::{SurgeonInput, SurgeryCmd, hands};
use pav_core::{Sim, SimEvent};
use pav_ui::Device;
use pav_ui::surgery::save::Save;
use pav_ui::surgery::{Screen, Shell, ShellCmd, ShellInput, style};
use web_time::Instant;
use winit::event::{ElementState, MouseButton, MouseScrollDelta, WindowEvent};
use winit::event_loop::ActiveEventLoop;
use winit::keyboard::{KeyCode, PhysicalKey};

use crate::app::App;

/// One pad's state this frame.
#[derive(Clone, Copy, Debug, Default)]
pub struct PadState {
    pub id: usize,
    pub left: Vec2,
    pub right: Vec2,
    pub l2: f32,
    pub r2: f32,
    pub cross: bool,
    pub circle: bool,
    pub square: bool,
    pub triangle: bool,
    pub l1: bool,
    pub r1: bool,
    pub options: bool,
    pub create: bool,
    pub up: bool,
    pub down: bool,
    pub dleft: bool,
    pub dright: bool,
}

impl PadState {
    fn any(&self) -> bool {
        self.left.length() > 0.3
            || self.right.length() > 0.3
            || self.l2 > 0.1
            || self.r2 > 0.1
            || self.cross
            || self.circle
            || self.square
            || self.triangle
            || self.l1
            || self.r1
            || self.options
            || self.up
            || self.down
            || self.dleft
            || self.dright
    }
}

fn deadzone(v: Vec2, dz: f32) -> Vec2 {
    let l = v.length();
    if l < dz { Vec2::ZERO } else { v / l * ((l - dz) / (1.0 - dz)).min(1.0) }
}

/// Reads every connected pad (up to four).
fn read_pads(g: &mut gilrs::Gilrs) -> Vec<PadState> {
    use gilrs::{Axis, Button};
    while g.next_event().is_some() {}
    let mut out = Vec::new();
    for (id, gp) in g.gamepads().take(4) {
        let val = |b: Button| gp.button_data(b).map(|d| d.value()).unwrap_or(0.0);
        out.push(PadState {
            id: usize::from(id),
            left: deadzone(Vec2::new(gp.value(Axis::LeftStickX), gp.value(Axis::LeftStickY)), 0.18),
            right: deadzone(Vec2::new(gp.value(Axis::RightStickX), gp.value(Axis::RightStickY)), 0.16),
            l2: val(Button::LeftTrigger2),
            r2: val(Button::RightTrigger2),
            cross: gp.is_pressed(Button::South),
            circle: gp.is_pressed(Button::East),
            square: gp.is_pressed(Button::West),
            triangle: gp.is_pressed(Button::North),
            l1: gp.is_pressed(Button::LeftTrigger),
            r1: gp.is_pressed(Button::RightTrigger),
            options: gp.is_pressed(Button::Start),
            create: gp.is_pressed(Button::Select),
            up: gp.is_pressed(Button::DPadUp) || gp.value(Axis::DPadY) > 0.5,
            down: gp.is_pressed(Button::DPadDown) || gp.value(Axis::DPadY) < -0.5,
            dleft: gp.is_pressed(Button::DPadLeft) || gp.value(Axis::DPadX) < -0.5,
            dright: gp.is_pressed(Button::DPadRight) || gp.value(Axis::DPadX) > 0.5,
        });
    }
    out
}

/// A slot's device-side state.
#[derive(Clone, Copy, Debug, Default)]
struct Hands {
    aim: Vec2,
    assist: bool,
    tool_hold: i8,
    tool_left: u8,
    ring: usize,
    held: u8,
    rotate_left: f32,
    rotate: i8,
}

pub struct Product {
    pub shell: Shell,
    keys: HashSet<KeyCode>,
    key_edges: HashSet<KeyCode>,
    mouse_pos: Vec2,
    mouse_moved: bool,
    mouse_left: bool,
    mouse_right: bool,
    left_edge: bool,
    right_edge: bool,
    wheel: f32,
    tap: Option<Vec2>,
    /// How long a drawn frame takes, and when the next may be drawn (hub rounds).
    draw_cost: f32,
    next_draw: Instant,
    drew_last: bool,
    /// Surface pixels per pointer pixel.
    ptr_scale: Vec2,
    view_size: Vec2,
    /// Test hook: no drawing, so a playthrough on a slow machine runs at game speed.
    pub(crate) no_draw: bool,
    finger_used: bool,
    key_used: bool,
    pad_used: bool,
    pads: Vec<PadState>,
    prev_pads: Vec<PadState>,
    /// The slot each pad is at, by pad id.
    pad_slot: Vec<(usize, usize)>,
    hands: [Hands; 4],
    device: Device,
    seq: Sequencer,
    story_voice: Speaker,
    op_voice: Speaker,
    fade: f32,
    last_stage: Stage,
    last_story: String,
    start: Instant,
    rumble_t: f32,
    last_beats: u32,
    snapshot: Option<Box<pav_core::sim::SimState>>,
    pub hook: crate::hub::Hook,
    pub hub: crate::hub::Hub,
    frames: u32,
    pub frames_total: u64,
    fps_t: f32,
    fps: f32,
    last_tick: u64,
    tps: f32,
    settings_sent: bool,
    fine_pointer: bool,
    first_frame_done: bool,
    last_cursor_visible: bool,
    seed: u64,
}

fn load_save() -> Save {
    crate::hub::load_text().and_then(|t| Save::parse(&t)).unwrap_or_default()
}

impl Product {
    pub fn new() -> Self {
        let mut shell = Shell::new(load_save());
        if let Some(a) = crate::hub::about_json().and_then(|t| pav_ui::surgery::about::About::parse(&t)) {
            shell.about = a;
        }
        let fine = crate::hub::fine_pointer();
        shell.touch_only = !fine;
        Self {
            shell,
            keys: HashSet::new(),
            key_edges: HashSet::new(),
            mouse_pos: Vec2::ZERO,
            mouse_moved: false,
            mouse_left: false,
            mouse_right: false,
            left_edge: false,
            right_edge: false,
            wheel: 0.0,
            tap: None,
            draw_cost: 0.0,
            next_draw: Instant::now(),
            drew_last: true,
            ptr_scale: Vec2::ONE,
            view_size: Vec2::ONE,
            no_draw: false,
            finger_used: false,
            key_used: false,
            pad_used: false,
            pads: Vec::new(),
            prev_pads: Vec::new(),
            pad_slot: Vec::new(),
            hands: Default::default(),
            device: if fine { Device::KeyboardMouse } else { Device::Touch },
            seq: Sequencer::new(),
            story_voice: Speaker::default(),
            op_voice: Speaker::default(),
            fade: 1.0,
            last_stage: Stage::Title,
            last_story: String::new(),
            start: Instant::now(),
            rumble_t: 0.0,
            last_beats: 0,
            snapshot: None,
            hook: Default::default(),
            hub: crate::hub::Hub::new(),
            frames: 0,
            frames_total: 0,
            fps_t: 0.0,
            fps: 0.0,
            last_tick: 0,
            tps: 0.0,
            settings_sent: false,
            fine_pointer: fine,
            first_frame_done: false,
            last_cursor_visible: true,
            seed: 1,
        }
    }

    fn key(&self, k: KeyCode) -> bool {
        self.keys.contains(&k)
    }
    fn tapped(&self, k: KeyCode) -> bool {
        self.key_edges.contains(&k)
    }

    fn pad_edge(&self, f: impl Fn(&PadState) -> bool) -> bool {
        self.pads.iter().any(|p| f(p) && !self.prev_pads.iter().find(|q| q.id == p.id).is_some_and(|q| f(q)))
    }

    /// The input for the shell's menus.
    fn shell_input(&mut self, dt: f32, ppp: f32) -> ShellInput {
        use KeyCode::*;
        let k = |c: KeyCode| self.key(c);
        let t = |c: KeyCode| self.tapped(c);
        let stick = self.pads.iter().fold(Vec2::ZERO, |a, p| if p.left.length() > a.length() { p.left } else { a });
        let confirm = t(Enter) || t(NumpadEnter) || self.pad_edge(|p| p.cross);
        let pad_pause = self.pads.iter().any(|p| p.options && !p.create) && self.pad_edge(|p| p.options);
        let any_pad = self.pads.iter().any(|p| p.any());
        let any_key = !self.key_edges.is_empty();
        let m = self.mouse_pos * self.ptr_scale;
        let pointer = (m.x >= 0.0).then(|| egui::pos2(m.x / ppp, m.y / ppp));
        let story = self.shell.screen == Screen::Playing && self.last_stage == Stage::Story;
        ShellInput {
            up: k(ArrowUp) || k(KeyW) || stick.y > 0.5 || self.pads.iter().any(|p| p.up),
            down: k(ArrowDown) || k(KeyS) || stick.y < -0.5 || self.pads.iter().any(|p| p.down),
            left: k(ArrowLeft) || k(KeyA) || stick.x < -0.5 || self.pads.iter().any(|p| p.dleft),
            right: k(ArrowRight) || k(KeyD) || stick.x > 0.5 || self.pads.iter().any(|p| p.dright),
            confirm: confirm || (story && (t(Space) || t(KeyE))),
            confirm_held: k(Enter) || k(NumpadEnter) || self.pads.iter().any(|p| p.cross) || (story && k(Space)),
            back: t(Escape) || t(Backspace) || self.pad_edge(|p| p.circle),
            tab_prev: t(KeyQ) || t(PageUp) || self.pad_edge(|p| p.l1),
            tab_next: t(KeyE) || t(PageDown) || self.pad_edge(|p| p.r1),
            pause: t(Escape) || pad_pause,
            chart: t(Tab) || self.pad_edge(|p| p.square),
            alt: t(KeyM) || self.pad_edge(|p| p.triangle),
            pointer,
            pointer_moved: self.mouse_moved,
            click: self.left_edge,
            drag: self.mouse_left,
            any: any_pad || any_key || self.mouse_moved || self.left_edge || self.right_edge || self.wheel != 0.0,
            tap: self.tap.map(|q| q * self.ptr_scale).map(|q| egui::pos2(q.x / ppp, q.y / ppp)),
            device: self.device,
            dt,
        }
    }
}

impl App {
    /// A window event, for the game's own input.
    pub(crate) fn product_event(&mut self, el: &ActiveEventLoop, event: WindowEvent) {
        match &event {
            WindowEvent::CloseRequested => {
                el.exit();
                return;
            }
            WindowEvent::Resized(sz) => {
                if let Some(g) = &mut self.gfx {
                    g.resize(sz.width, sz.height);
                }
                return;
            }
            WindowEvent::RedrawRequested => {
                self.frame();
                return;
            }
            _ => {}
        }
        let Some(p) = self.product.as_mut() else { return };
        let mut resume = false;
        match event {
            WindowEvent::Focused(false) => {
                p.keys.clear();
                p.mouse_left = false;
                p.mouse_right = false;
            }
            WindowEvent::KeyboardInput { event, .. } => {
                resume = true;
                if let PhysicalKey::Code(code) = event.physical_key {
                    match event.state {
                        ElementState::Pressed => {
                            if !event.repeat {
                                p.key_edges.insert(code);
                                p.key_used = true;
                                p.device = Device::KeyboardMouse;
                            }
                            p.keys.insert(code);
                        }
                        ElementState::Released => {
                            p.keys.remove(&code);
                        }
                    }
                }
            }
            WindowEvent::MouseInput { state, button, .. } => {
                resume = true;
                p.device = Device::KeyboardMouse;
                p.key_used = true;
                let down = state == ElementState::Pressed;
                match button {
                    MouseButton::Left => {
                        p.mouse_left = down;
                        p.left_edge |= down;
                    }
                    MouseButton::Right => {
                        p.mouse_right = down;
                        p.right_edge |= down;
                    }
                    _ => {}
                }
            }
            WindowEvent::MouseWheel { delta, .. } => {
                p.wheel += match delta {
                    MouseScrollDelta::LineDelta(_, y) => y,
                    MouseScrollDelta::PixelDelta(q) => q.y as f32 / 40.0,
                };
                p.device = Device::KeyboardMouse;
            }
            WindowEvent::CursorMoved { position, .. } => {
                let q = Vec2::new(position.x as f32, position.y as f32);
                if (q - p.mouse_pos).length() > 0.5 {
                    p.mouse_moved = true;
                    // A phone's emulated pointer isn't a mouse.
                    if p.fine_pointer {
                        p.device = Device::KeyboardMouse;
                    }
                }
                p.mouse_pos = q;
            }
            WindowEvent::Touch(t) => {
                // No touch controls at all: the shell only reads taps on its one button.
                p.finger_used = true;
                if t.phase == winit::event::TouchPhase::Ended {
                    p.tap = Some(Vec2::new(t.location.x as f32, t.location.y as f32));
                }
                if !p.key_used && !p.pad_used {
                    p.device = Device::Touch;
                }
            }
            _ => {}
        }
        #[cfg(target_arch = "wasm32")]
        if resume {
            self.resume_audio();
        }
        #[cfg(not(target_arch = "wasm32"))]
        let _ = resume;
    }

    pub(crate) fn product_frame(&mut self) {
        let now = Instant::now();
        let wall_dt = (now - self.last).as_secs_f32().min(1.0);
        let dt = wall_dt.min(0.1);
        self.last = now;

        // Devices.
        let Some(p) = self.product.as_mut() else { return };
        p.prev_pads = std::mem::take(&mut p.pads);
        if let Some(g) = &mut self.input.gilrs {
            p.pads = read_pads(g);
        }
        if p.pads.iter().any(|q| q.any()) {
            p.device = Device::Gamepad;
            if !p.pad_used {
                p.pad_used = true;
                #[cfg(target_arch = "wasm32")]
                {
                    // The browser may keep sound off until a key or click: try, and say so.
                    self.audio_resumed = true;
                    if let Some(a) = &self.audio {
                        a.resume();
                    }
                }
            }
        }
        let p = self.product.as_mut().unwrap();
        if p.key_used || p.pad_used {
            p.shell.touch_only = false;
        }
        p.shell.sound_note = cfg!(target_arch = "wasm32") && p.pad_used && !p.key_used;

        // The game's frames.
        let Some(host) = self.host.as_ref() else { return };
        host.pump();
        let (prev, curr, curr_at, tick_wall) = host.frames();
        let alpha = ((now - curr_at).as_secs_f32() / tick_wall.max(1e-4)).clamp(0.0, 1.0);
        let Some(mut frame) = curr.surgery.clone() else {
            return;
        };
        // Names come from the hub, and appear only through egui text.
        if let Some(p) = self.product.as_ref().filter(|p| p.hub.active()) {
            let f = std::sync::Arc::make_mut(&mut frame);
            for (id, name) in &p.hub.players {
                if let Some(s) = f.surgeons.get_mut(*id as usize) {
                    s.name = name.as_str().into();
                }
            }
        }
        let Some(gfx) = self.gfx.as_ref() else { return };
        let (w, h) = gfx.size();
        let scale = gfx.window.scale_factor() as f32;
        style::set_canvas(&self.egui_ctx, w as f32, h as f32, scale);
        let ppp = self.egui_ctx.zoom_factor() * scale;
        let size = Vec2::new(w as f32, h as f32);
        // Pointer positions come in device pixels of the page; the canvas may be sized otherwise.
        #[cfg(target_arch = "wasm32")]
        let page_size = {
            use winit::platform::web::WindowExtWebSys;
            gfx.window
                .canvas()
                .map(|c| Vec2::new(c.client_width() as f32, c.client_height() as f32) * scale)
                .filter(|q| q.x > 0.0 && q.y > 0.0)
                .unwrap_or(size)
        };
        #[cfg(not(target_arch = "wasm32"))]
        let page_size = size;
        if let Some(p) = self.product.as_mut() {
            p.ptr_scale = size / page_size;
            p.view_size = size;
        }
        pav_view::surgery::apply_shot(&mut self.rig, &frame.shot);

        // Hands: pads, mouse, keys -> slots -> the simulation.
        self.surgeon_input(&frame, dt, size);

        // Sound and effects.
        let events: Vec<SimEvent> = std::mem::take(&mut *self.host.as_ref().unwrap().shared.events.lock().unwrap());
        self.builder.now = self.started.elapsed().as_secs_f64();
        self.builder.add_events(&events);
        let p = self.product.as_mut().unwrap();
        let view_opts = p.shell.save.settings.clone();
        if let Some(a) = &self.audio {
            let (_, right) = self.rig.ground_axes();
            let l = pav_audio::Listener { pos: Vec3::ZERO, right };
            for e in &events {
                a.play_event(e, &l, 1.0);
            }
        }
        for e in &events {
            if let SimEvent::Cue { id, pos, .. } = e {
                p.hub.note_cue(*id, pos.x, pos.z);
                if *id == cue::DEFIB_THUMP {
                    crate::hub::rumble(&p.pads, 1.0, 1.0, 300, view_opts.rumble);
                }
            }
        }
        // Music and voices.
        let wall = p.start.elapsed().as_secs_f32();
        p.music_and_voices(&frame, dt, wall, self.audio.as_ref());
        p.rumble(&frame, dt);

        // The scene.
        let mut local = pav_view::surgery::Local {
            clinical: view_opts.clinical,
            shake: view_opts.shake,
            reduce_flashes: view_opts.reduce_flashes,
            fade: p.fade,
            ..Default::default()
        };
        for (i, h) in p.hands.iter().enumerate() {
            if frame.surgeons.get(i).is_some_and(|s| s.present && !s.bot) && h.held != 0xFF && p.is_local(i) {
                local.aim[i] = Some(h.aim);
            }
        }
        if let Some(q) = self.rig.ground_point(p.mouse_pos * p.ptr_scale, size, 1.0) {
            local.hover_tray = tray_place(Vec2::new(q.x, q.z)).filter(|_| p.device == Device::KeyboardMouse);
        }
        // Scene cuts fade through black.
        let story_key = frame.story.as_ref().map(|s| s.set.to_string()).unwrap_or_default();
        if frame.stage != p.last_stage || story_key != p.last_story {
            let story_edge = (frame.stage == Stage::Story) != (p.last_stage == Stage::Story)
                || (story_key != p.last_story && !story_key.is_empty());
            if story_edge {
                p.fade = 1.0;
            }
            p.last_stage = frame.stage;
            p.last_story = story_key;
        }
        p.fade = (p.fade - dt * 2.4).max(0.0);
        local.fade = p.fade;
        local.skip = p.hub.server();
        self.builder.surgery.local = local;
        // A hub round on a slow machine: the network and the clock mustn't wait on drawing.
        let mut skip_draw = p.hub.server() || p.no_draw;
        if p.hub.active() {
            if p.drew_last {
                p.draw_cost += (wall_dt - p.draw_cost) * 0.3;
            }
            if p.draw_cost > 0.12 && now < p.next_draw {
                skip_draw = true;
            } else if !skip_draw {
                p.next_draw = now + std::time::Duration::from_secs_f32((p.draw_cost * 2.0).min(1.0));
            }
        }
        p.drew_last = !skip_draw;
        let view = pav_view::ViewSettings::default();
        let aspect = w as f32 / h.max(1) as f32;
        let scene = if skip_draw {
            None
        } else {
            Some(self.builder.build(&prev, &curr, alpha, &self.rig, aspect, &view, frame.shot.target.into()))
        };
        let vp = scene.as_ref().map(|s| s.camera.proj * s.camera.view).unwrap_or_default();

        // The shell.
        let p = self.product.as_mut().unwrap();
        // The shell keeps wall-clock time: attract comes after ten real seconds on a slow machine too.
        let input = p.shell_input(wall_dt, ppp);
        let state = self.egui_state.as_mut().unwrap();
        let gfx = self.gfx.as_mut().unwrap();
        let raw = state.take(&gfx.window);
        let ctx = self.egui_ctx.clone();
        if !p.first_frame_done {
            style::install_font(&ctx);
        }
        let shell = &mut p.shell;
        let hub_screen = shell.hub_active;
        let out = ctx.run_ui(raw, |ui| {
            let c = ui.ctx().clone();
            shell.frame(&c, &input, Some(&frame), vp);
        });
        let _ = hub_screen;
        state.platform_output(&gfx.window, out.platform_output);
        let pixels = out.pixels_per_point;
        let prims = self.egui_ctx.tessellate(out.shapes, pixels);
        let mut textures = out.textures_delta;
        if let Some(scene) = &scene {
            gfx.draw(scene, Some((&prims, &mut textures, pixels)));
        } else {
            textures.clear();
        }
        // Hide the OS cursor in operations.
        let want_visible = !matches!(frame.stage, Stage::Op | Stage::Code | Stage::OpStart)
            || !matches!(p.shell.screen, Screen::Playing | Screen::Session);
        if want_visible != p.last_cursor_visible {
            p.last_cursor_visible = want_visible;
            gfx.window.set_cursor_visible(want_visible);
        }

        // Edges consumed.
        p.key_edges.clear();
        p.left_edge = false;
        p.right_edge = false;
        p.mouse_moved = false;
        p.wheel = 0.0;
        p.tap = None;
        p.first_frame_done = true;

        // Stats.
        p.frames += 1;
        p.frames_total += 1;
        p.fps_t += dt;
        if p.fps_t >= 0.5 {
            p.fps = p.frames as f32 / p.fps_t;
            p.tps = (frame.tick.saturating_sub(p.last_tick)) as f32 / p.fps_t;
            p.last_tick = frame.tick;
            p.frames = 0;
            p.fps_t = 0.0;
            p.shell.dev.fps = p.fps;
            p.shell.dev.tps = p.tps;
        }

        // Do what the shell asked.
        let cmds = std::mem::take(&mut p.shell.cmds);
        for c in cmds {
            self.shell_cmd(c);
        }
        // First time through: what the player saved reaches the sim and the mixer.
        let p = self.product.as_mut().unwrap();
        if !p.settings_sent {
            p.settings_sent = true;
            let s = p.shell.save.settings.clone();
            if let Some(a) = &self.audio {
                a.set_bus(BUS_MUSIC, s.music);
                a.set_bus(pav_audio::BUS_EFFECTS, s.effects);
                a.set_bus(BUS_VOICES, s.voices);
            }
            self.send_settings();
        }
        self.hub_update(&frame);
        self.hook_update(&frame);
    }

    /// Everything the settings tell the sim, after a scene loads.
    fn send_settings(&mut self) {
        let Some(p) = self.product.as_ref() else { return };
        let s = p.shell.save.settings.clone();
        let d = p.shell.save.difficulty;
        let tune = p.shell.dev.tune.clone();
        let joined: Vec<u8> = p.pad_slot.iter().filter(|(_, s)| *s > 0).map(|(_, s)| *s as u8).collect();
        let Some(host) = &self.host else { return };
        let mut q = host.shared.surgery_cmds.lock().unwrap();
        for slot in joined {
            q.push_back(SurgeryCmd::Join { slot });
        }
        q.push_back(SurgeryCmd::Difficulty(d));
        q.push_back(SurgeryCmd::TextSpeed(s.text_speed));
        q.push_back(SurgeryCmd::Tremor(s.tremor));
        for (i, v) in tune.v.iter().enumerate() {
            if *v != pav_core::games::surgery::tune::SLIDERS[i].default {
                q.push_back(SurgeryCmd::SetTune { id: i as u16, value: *v });
            }
        }
    }

    /// Loads a scene: a fresh sim, and the settings again.
    pub(crate) fn load_surgery_scene(&mut self, scene: &str, seed: u64) {
        let Some(host) = &self.host else { return };
        let scene2 = scene.to_string();
        host.exec(move |sim| match Sim::new(&scene2, seed) {
            Ok(fresh) => *sim = fresh,
            Err(e) => log::error!("could not load scene: {e:#}"),
        });
        host.shared.surgery_cmds.lock().unwrap().clear();
        host.set_control(|c| {
            c.paused = false;
            c.speed = 1.0;
        });
        *host.shared.input.lock().unwrap() = Default::default();
        host.shared.events.lock().unwrap().clear();
        self.builder.clear_particles();
        if let Some(g) = &mut self.gfx {
            g.renderer.clear_particles();
        }
        self.send_settings();
        if let Some(p) = self.product.as_mut() {
            p.fade = 1.0;
            p.shell.scene = scene.to_string();
        }
    }

    fn shell_cmd(&mut self, c: ShellCmd) {
        match c {
            ShellCmd::Load(scene) => {
                let p = self.product.as_mut().unwrap();
                p.seed = p.seed.wrapping_mul(0x9E37_79B9).wrapping_add(p.start.elapsed().as_nanos() as u64 | 1);
                let seed = p.seed;
                self.load_surgery_scene(&scene, seed);
            }
            ShellCmd::Sim(cmd) => {
                let Some(host) = &self.host else { return };
                if host.control().paused {
                    // Paused: it applies now, so menus and dev tools answer.
                    host.exec(move |sim| {
                        let f = pav_core::InputFrame { surgery: Some(cmd), ..Default::default() };
                        apply_now(sim, &f);
                    });
                } else {
                    host.shared.surgery_cmds.lock().unwrap().push_back(cmd);
                }
            }
            ShellCmd::Paused(on) => {
                if let Some(host) = &self.host {
                    host.set_control(|c| c.paused = on);
                    *host.shared.input.lock().unwrap() = Default::default();
                }
            }
            ShellCmd::Cue(id) => {
                if let Some(a) = &self.audio {
                    for (patch, delay) in pav_audio::cues::sound(id, 1.0, 1.0) {
                        a.play_on(pav_audio::BUS_EFFECTS, patch, 0.0, 1.0, delay);
                    }
                }
            }
            ShellCmd::Save(text) => crate::hub::save_text(&text),
            ShellCmd::Fullscreen(on) => {
                if let Some(g) = &self.gfx {
                    let is = g.window.fullscreen().is_some();
                    if is != on {
                        crate::platform::toggle_fullscreen(&g.window);
                    }
                }
            }
            ShellCmd::Mix { music, effects, voices } => {
                if let Some(a) = &self.audio {
                    a.set_bus(BUS_MUSIC, music);
                    a.set_bus(pav_audio::BUS_EFFECTS, effects);
                    a.set_bus(BUS_VOICES, voices);
                }
            }
            ShellCmd::FrameStep => {
                if let Some(host) = &self.host {
                    host.set_control(|c| {
                        c.paused = true;
                        c.step_requests += 1;
                    });
                }
            }
            ShellCmd::Rewind => {
                if let Some(host) = &self.host {
                    let ok = host.query(|sim| {
                        let oldest = sim.history.oldest_tick().unwrap_or(sim.state.tick);
                        let target = sim.state.tick.saturating_sub(300).max(oldest);
                        let ok = sim.rewind_to(target);
                        sim.commit_rewind();
                        ok
                    });
                    if let Some(p) = self.product.as_mut() {
                        p.shell.dev.status =
                            if ok == Some(true) { "Back five seconds.".into() } else { "Nothing to rewind to yet.".into() };
                    }
                }
            }
            ShellCmd::SnapshotSave => {
                if let Some(host) = &self.host {
                    let snap = host.query(|sim| Box::new(sim.state.clone()));
                    if let Some(p) = self.product.as_mut() {
                        p.snapshot = snap;
                        p.shell.dev.status = "Snapshot saved.".into();
                    }
                }
            }
            ShellCmd::SnapshotLoad => {
                let snap = self.product.as_ref().and_then(|p| p.snapshot.clone());
                if let (Some(host), Some(snap)) = (&self.host, snap) {
                    host.exec(move |sim| sim.state = *snap);
                    if let Some(p) = self.product.as_mut() {
                        p.shell.dev.status = "Snapshot loaded.".into();
                    }
                }
            }
            ShellCmd::ReloadContent => {
                let r = content::reload();
                if let Some(p) = self.product.as_mut() {
                    p.shell.dev.status = match r {
                        Ok(()) => "Content reloaded.".into(),
                        Err(e) => format!("{e:#}"),
                    };
                }
                self.builder.surgery.paper.clear();
            }
            ShellCmd::HubReady => crate::hub::answer("ready"),
            ShellCmd::HubMore => crate::hub::answer("more"),
        }
    }

    /// Devices to slots. The local player's aim integrates here, ahead of the tick.
    fn surgeon_input(&mut self, frame: &SurgeryFrame, dt: f32, size: Vec2) {
        let live = matches!(frame.stage, Stage::Op | Stage::Code | Stage::OpStart) && !frame.attract;
        let Some(p) = self.product.as_mut() else { return };
        if p.hub.server() {
            return;
        }
        let on_menu = !matches!(p.shell.screen, Screen::Playing | Screen::Session | Screen::Dev);
        // Attract and menus keep the hands off; hub clients hand this to the network.
        let settings = p.shell.save.settings.clone();
        use pav_core::games::surgery::tune;
        let assist = settings.aim_assist * p.shell.dev.tune.get(tune::AIM_ASSIST);
        let speed = settings.cursor_speed * p.shell.dev.tune.get(tune::CURSOR_SPEED) / tune::SLIDERS[tune::CURSOR_SPEED].default;
        let mut out = [SurgeonInput { tool: -1, ..Default::default() }; 4];

        // Joining: any unassigned pad joins with Cross.
        let my_seat = p.hub.my_seat();
        let default_slot = my_seat.unwrap_or(0);
        let ids: Vec<usize> = p.pads.iter().map(|q| q.id).collect();
        p.pad_slot.retain(|(id, _)| ids.contains(id));
        if p.pad_slot.is_empty() {
            if let Some(first) = ids.first() {
                p.pad_slot.push((*first, default_slot));
            }
        }
        let mut joins = Vec::new();
        if my_seat.is_none() && !p.hub.active() {
            for q in p.pads.clone() {
                if !p.pad_slot.iter().any(|(id, _)| *id == q.id)
                    && q.cross
                    && !p.prev_pads.iter().any(|x| x.id == q.id && x.cross)
                {
                    if let Some(free) = (1..4).find(|s| !p.pad_slot.iter().any(|(_, x)| x == s)) {
                        p.pad_slot.push((q.id, free));
                        joins.push(free as u8);
                    }
                }
            }
        }
        for s in joins {
            if let Some(host) = &self.host {
                host.shared.surgery_cmds.lock().unwrap().push_back(SurgeryCmd::Join { slot: s });
            }
        }
        let p = self.product.as_mut().unwrap();

        if !live || on_menu {
            // Keep the cursors where they are; nothing reaches the sim.
            if let Some(host) = &self.host {
                if !p.hub.active() {
                    let mut i = host.shared.input.lock().unwrap();
                    i.surgeons = [SurgeonInput::default(); 4];
                }
            }
            return;
        }

        // Each pad's slot.
        let pad_map: Vec<(PadState, usize)> =
            p.pads.iter().filter_map(|q| p.pad_slot.iter().find(|(id, _)| *id == q.id).map(|(_, s)| (*q, *s))).collect();
        for (slot, o) in out.iter_mut().enumerate() {
            let mine = pad_map.iter().find(|(_, s)| *s == slot).map(|(q, _)| *q);
            let prev = mine.and_then(|m| p.prev_pads.iter().find(|x| x.id == m.id).copied()).unwrap_or_default();
            let keyboard = slot == default_slot;
            if mine.is_none() && !keyboard {
                continue;
            }
            let surgeon = frame.surgeons.get(slot);
            let tool = surgeon.map(|s| s.tool).unwrap_or(Tool::Forceps);
            let on_bone = surgeon
                .is_some_and(|s| s.engaged != 0 && frame.hazards.iter().any(|h| h.id == s.engaged && h.kind == HazardKind::Bone));
            let h = &mut p.hands[slot];
            if let Some(sv) = surgeon {
                if h.aim == Vec2::ZERO {
                    h.aim = sv.raw;
                }
            }
            o.active = true;
            let mut held = 0u8;
            let mut pressed = 0u8;
            let mut pressure = 1.0f32;
            let mut keyboard_stick = Vec2::ZERO;

            // The mouse aims, absolutely.
            if keyboard && p.mouse_moved && p.device == Device::KeyboardMouse {
                if let Some(q) = self.rig.ground_point(p.mouse_pos * p.ptr_scale, size, 0.55) {
                    h.aim = surgeon::clamp(Vec2::new(q.x, q.z));
                    h.assist = false;
                }
            }
            if keyboard {
                use KeyCode::*;
                let down = |k: KeyCode| p.keys.contains(&k);
                let mut v = Vec2::ZERO;
                if down(KeyW) || down(ArrowUp) {
                    v.y -= 1.0;
                }
                if down(KeyS) || down(ArrowDown) {
                    v.y += 1.0;
                }
                if down(KeyA) || down(ArrowLeft) {
                    v.x -= 1.0;
                }
                if down(KeyD) || down(ArrowRight) {
                    v.x += 1.0;
                }
                keyboard_stick = v.normalize_or_zero();
                if down(KeyE) || p.mouse_left {
                    held |= hands::USE;
                }
                if down(ShiftLeft) || down(ShiftRight) {
                    held |= hands::PRECISION;
                }
                if down(Space) {
                    held |= hands::GIFT;
                }
                if p.right_edge || p.key_edges.contains(&KeyQ) {
                    pressed |= hands::CANCEL;
                }
                if (p.mouse_left && p.mouse_right) || down(KeyF) {
                    held |= hands::DEFIB;
                }
                for (i, k) in [Digit1, Digit2, Digit3, Digit4, Digit5, Digit6, Digit7, Digit8].into_iter().enumerate() {
                    if p.key_edges.contains(&k) {
                        h.ring = i;
                        h.tool_hold = i as i8;
                        h.tool_left = 6;
                    }
                }
                // Click an instrument on the tray.
                if p.left_edge {
                    if let Some(q) = self.rig.ground_point(p.mouse_pos * p.ptr_scale, size, 1.0) {
                        if let Some(place) = tray_place(Vec2::new(q.x, q.z)) {
                            h.ring = place;
                            h.tool_hold = place as i8;
                            h.tool_left = 6;
                            held &= !hands::USE;
                        }
                    }
                }
                if p.wheel != 0.0 {
                    if on_bone {
                        h.rotate = if p.wheel > 0.0 { 1 } else { -1 };
                        h.rotate_left = 0.18;
                    } else {
                        let step = if p.wheel > 0.0 { 7 } else { 1 };
                        let cur = frame.ring.iter().position(|t| *t == tool).unwrap_or(h.ring);
                        h.ring = (cur + step) % 8;
                        h.tool_hold = h.ring as i8;
                        h.tool_left = 6;
                    }
                }
            }
            if let Some(q) = mine {
                // R2 is analog; Cross holds it fully.
                if q.r2 > 0.08 {
                    held |= hands::USE;
                    pressure = q.r2;
                }
                if q.cross {
                    held |= hands::USE;
                    pressure = 1.0;
                }
                if q.l2 > 0.25 && frame.stage != Stage::Code {
                    held |= hands::PRECISION;
                }
                if q.l2 > 0.5 && q.r2 > 0.5 {
                    held |= hands::DEFIB;
                }
                if q.triangle {
                    held |= hands::GIFT;
                }
                if q.circle && !prev.circle {
                    pressed |= hands::CANCEL;
                }
                // The signature: a flick switches tools, with no menu and no slowdown.
                if let Some(i) = surgeon::flick(q.left) {
                    h.tool_hold = i as i8;
                    h.tool_left = 3;
                    h.ring = i;
                }
                if on_bone {
                    if q.l1 {
                        h.rotate = -1;
                        h.rotate_left = dt.max(0.02);
                    }
                    if q.r1 {
                        h.rotate = 1;
                        h.rotate_left = dt.max(0.02);
                    }
                } else {
                    let cur = frame.ring.iter().position(|t| *t == tool).unwrap_or(h.ring);
                    if q.l1 && !prev.l1 {
                        h.ring = (cur + 7) % 8;
                        h.tool_hold = h.ring as i8;
                        h.tool_left = 6;
                    }
                    if q.r1 && !prev.r1 {
                        h.ring = (cur + 1) % 8;
                        h.tool_hold = h.ring as i8;
                        h.tool_left = 6;
                    }
                }
            }
            // A stick or keys move the cursor at the plan's speed curve, with aim assist.
            let stick = mine.map(|q| q.right).unwrap_or(Vec2::ZERO);
            let precise = held & hands::PRECISION != 0;
            let targets: Vec<Vec2> = frame.targets(tool).collect();
            if stick.length() > 0.0 {
                let d = Vec2::new(stick.x, -stick.y);
                h.aim = surgeon::integrate(h.aim, d, speed, precise, assist, dt, targets.iter().copied());
                h.assist = assist > 0.0;
            }
            if keyboard_stick != Vec2::ZERO {
                h.aim = surgeon::integrate(h.aim, keyboard_stick, speed * 0.85, precise, assist, dt, targets.iter().copied());
                h.assist = assist > 0.0;
            }
            if h.rotate_left > 0.0 {
                h.rotate_left -= dt;
                o.rotate = h.rotate;
            }
            // Edges wait for the tick.
            let edge = held & !h.held;
            h.held = held;
            o.aim = h.aim;
            o.held = held;
            o.pressed = pressed | edge;
            o.pressure = pressure;
            o.assist = if h.assist { assist } else { 0.0 };
            if h.tool_left > 0 {
                h.tool_left -= 1;
                o.tool = h.tool_hold;
            } else {
                o.tool = -1;
            }
        }
        // A person's slot is theirs only when in play: dev's Bot plays overrides in the sim.
        if let Some(host) = &self.host {
            let mut i = host.shared.input.lock().unwrap();
            let carried: [u8; 4] = std::array::from_fn(|k| i.surgeons[k].pressed);
            for k in 0..4 {
                let mut o2 = out[k];
                o2.pressed |= carried[k];
                i.surgeons[k] = o2;
            }
            drop(i);
            let p = self.product.as_mut().unwrap();
            p.hub.local_input(&out);
        }
    }

    fn hub_update(&mut self, frame: &SurgeryFrame) {
        crate::hub::update(self, frame);
    }

    fn hook_update(&mut self, frame: &SurgeryFrame) {
        crate::hub::hook_update(self, frame);
    }

    #[cfg(target_arch = "wasm32")]
    pub(crate) fn status_json(&self, frame: &SurgeryFrame) -> serde_json::Value {
        let Some(p) = self.product.as_ref() else { return serde_json::Value::Null };
        let mut v = p.shell.status();
        let sim = self.host.as_ref().and_then(|h| h.peek(|sim| sim.play().map(|g| g.status(sim))));
        let sim = sim.unwrap_or(serde_json::Value::Null);
        v["drain_tune"] = sim["drain_tune"].clone();
        // Where the bot's wish lands on the canvas, 0..1: tests aim the real mouse there.
        if let Some(aim) = sim["wish"]["aim"].as_array() {
            let at = |i: usize| aim.get(i).and_then(|x| x.as_f64()).unwrap_or(0.0) as f32;
            let cam = self.rig.data(p.view_size.x / p.view_size.y.max(1.0));
            let ndc = (cam.proj * cam.view).project_point3(glam::Vec3::new(at(0), 0.55, at(1)));
            v["wish_px"] = serde_json::json!([(ndc.x + 1.0) / 2.0, (1.0 - ndc.y) / 2.0]);
        }
        v["sim"] = sim;
        v["stage"] = serde_json::json!(format!("{:?}", frame.stage));
        v["tick"] = serde_json::json!(frame.tick);
        v["fps"] = serde_json::json!(p.fps);
        v["frames"] = serde_json::json!(p.frames_total);
        v["pads"] = serde_json::json!(p.pads.len());
        if let Some(a) = &self.audio {
            v["bus_gains"] = serde_json::json!([a.bus_gain(0), a.bus_gain(1), a.bus_gain(2)]);
            v["bus_peaks"] = serde_json::json!([a.peak(0), a.peak(1), a.peak(2)]);
        }
        let hazards = frame.hazards.iter().filter(|h| h.required).count();
        v["required"] = serde_json::json!(hazards);
        v["cursor"] = serde_json::json!(frame.surgeons.first().map(|s| [s.cursor.x, s.cursor.y]));
        v["tool"] = serde_json::json!(frame.surgeons.first().map(|s| format!("{:?}", s.tool)));
        v["using"] = serde_json::json!(frame.surgeons.first().map(|s| s.using));
        v["pressure"] = serde_json::json!(frame.surgeons.first().map(|s| s.pressure));
        v["vitals"] = serde_json::json!(frame.vitals);
        v
    }
}

/// A command on a paused sim: one step of `surgery` with no time passing.
fn apply_now(sim: &mut Sim, f: &pav_core::InputFrame) {
    if let Some(cmd) = f.surgery {
        if let Some(g) = sim.state.play.as_mut().and_then(|g| g.get_mut::<Surgery>()) {
            let mut ev = Vec::new();
            g.apply_cmd(cmd, &mut ev);
            sim.push_events(ev);
        }
    }
}

impl Product {
    /// Is this slot driven from this machine?
    fn is_local(&self, slot: usize) -> bool {
        let seat = self.hub.my_seat().unwrap_or(0);
        slot == seat || self.pad_slot.iter().any(|(_, s)| *s == slot)
    }

    fn music_and_voices(&mut self, f: &SurgeryFrame, dt: f32, now: f32, audio: Option<&pav_audio::AudioOut>) {
        let Some(a) = audio else { return };
        if self.hub.ended() {
            return;
        }
        let m = MusicInput {
            track: f.music.track.to_string(),
            bpm: f.bpm,
            heart: f.beats as f64 + f.beat as f64,
            crisis: f.music.crisis,
            hush: f.music.hush,
            motif: f.music.motif,
            flat: f.flat && !matches!(f.stage, Stage::Story | Stage::Title | Stage::Chart | Stage::Results),
        };
        let mut notes = Vec::new();
        self.seq.update(dt, &m, &mut notes);
        for (patch, pan, gain, delay) in notes {
            a.play_on(BUS_MUSIC, patch, pan, gain, delay);
        }
        // Voices: blips follow the text.
        let content = content::get();
        let mut blips = Vec::new();
        let def = |who: &str| -> Option<VoiceDef> {
            content.rigs.get(who).map(|r| VoiceDef {
                pitch: r.pitch,
                wave: voice::wave_named(&r.wave),
                pace: r.pace,
                jitter: r.jitter,
            })
        };
        if let Some(s) = &f.story {
            if let Some(v) = def(&s.who) {
                let serial = hash_str(&s.key).wrapping_add(s.line as u64 * 1009);
                self.story_voice.update(serial, &s.text, s.chars as usize, now, &v, &mut blips);
            }
        }
        if let Some(sub) = &f.subtitle {
            if let Some(v) = def(&sub.who) {
                let shown = (sub.age * 34.0) as usize;
                self.op_voice.update(sub.serial as u64 + 1, &sub.text, shown, now, &v, &mut blips);
            }
        }
        for b in blips {
            a.play_on(BUS_VOICES, b, 0.0, 1.0, 0.0);
        }
    }

    fn rumble(&mut self, f: &SurgeryFrame, dt: f32) {
        let on = self.shell.save.settings.rumble;
        self.rumble_t -= dt;
        if !matches!(f.stage, Stage::Op | Stage::Code) || f.attract {
            return;
        }
        if f.beats != self.last_beats {
            self.last_beats = f.beats;
            let low = (1.0 - f.vitals / 45.0).clamp(0.0, 1.0);
            if low > 0.0 {
                crate::hub::rumble(&self.pads, low * 0.8, low * 0.3, 90, on);
            }
        }
        let contact = f.surgeons.first().is_some_and(|s| s.using && s.engaged != 0);
        if contact && self.rumble_t <= 0.0 {
            self.rumble_t = 0.16;
            crate::hub::rumble(&self.pads, 0.0, 0.22, 60, on);
        }
    }
}

fn hash_str(s: &str) -> u64 {
    s.bytes().fold(1469598103934665603u64, |h, b| (h ^ b as u64).wrapping_mul(1099511628211))
}
