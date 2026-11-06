//! Hands of Harbor's frame. A surgery scene never enters the demo menu, camera, or touch layer.

use std::cell::{Cell, RefCell};
use std::collections::HashSet;

use glam::{Vec2, Vec3};
use pav_core::games::surgery::{contextual_tool, cycle, octant, tray_tool, Surgery, SurgeryFrame, TITLE, TOOL_KEEP};

mod hub;
use pav_core::input::{surg, InputFrame, SurgeonInput, SurgeryCmd};
use pav_ui::surgery::{Cmd, DeviceKind, Input as ShellIn, Shell};
use pav_view::{CameraParams, ViewSettings};
use winit::event::{ElementState, MouseButton, MouseScrollDelta, WindowEvent};
use winit::event_loop::ActiveEventLoop;
use winit::keyboard::{KeyCode, PhysicalKey};
use winit::window::WindowId;

use super::App;

#[derive(Clone, Copy)]
struct PadHand {
    present: bool,
    left: Vec2,
    right: Vec2,
    south: bool,
    east: bool,
    north: bool,
    west: bool,
    l1: bool,
    r1: bool,
    start: bool,
    up: bool,
    down: bool,
    left_b: bool,
    right_b: bool,
    lt: f32,
    rt: f32,
}

impl Default for PadHand {
    fn default() -> Self {
        Self {
            present: false,
            left: Vec2::ZERO,
            right: Vec2::ZERO,
            south: false,
            east: false,
            north: false,
            west: false,
            l1: false,
            r1: false,
            start: false,
            up: false,
            down: false,
            left_b: false,
            right_b: false,
            lt: 0.0,
            rt: 0.0,
        }
    }
}

pub struct Harbor {
    pub shell: Shell,
    keys: HashSet<KeyCode>,
    just: Vec<KeyCode>,
    mouse: Vec2,
    mouse_left: bool,
    mouse_right: bool,
    mouse_click: bool,
    mouse_moved: bool,
    /// A still mouse keeps the last ground point until WASD or the right stick moves.
    mouse_owns: bool,
    wheel: f32,
    touch_click: bool,
    pads: [PadHand; 4],
    was: PadHand,
    prev_oct: [Option<u8>; 4],
    prev_l1: [bool; 4],
    prev_r1: [bool; 4],
    tool: [u8; 4],
    font: bool,
    music_name: String,
    music_left: f32,
    status: String,
    link: hub::Link,
    saw_card: bool,
    /// Host status vitals/timer: the last snapshot that actually went out.
    /// A new clock bucket is latched only when that send succeeds, so the page
    /// does not report a value the client has not been given yet.
    net_vitals: Option<f32>,
    net_timer: Option<f32>,
    net_bucket: i32,
    /// Client: highest snapshot bucket applied. Older packets are dropped.
    applied_bucket: i32,
}

impl Harbor {
    pub fn new(touch_only: bool) -> Self {
        let mut shell = Shell::new();
        shell.touch_only = touch_only;
        Self {
            shell,
            keys: HashSet::new(),
            just: Vec::new(),
            mouse: Vec2::ZERO,
            mouse_left: false,
            mouse_right: false,
            mouse_click: false,
            mouse_moved: false,
            mouse_owns: false,
            wheel: 0.0,
            touch_click: false,
            pads: std::array::from_fn(|_| PadHand::default()),
            was: PadHand::default(),
            prev_oct: [None; 4],
            prev_l1: [false; 4],
            prev_r1: [false; 4],
            tool: [0; 4],
            font: false,
            music_name: String::new(),
            music_left: 0.0,
            status: String::new(),
            link: hub::Link::new(),
            saw_card: false,
            net_vitals: None,
            net_timer: None,
            net_bucket: -1,
            applied_bucket: -1,
        }
    }

    fn key(&self, code: KeyCode) -> bool {
        self.keys.contains(&code)
    }

    fn ate(&mut self, code: KeyCode) -> bool {
        let hit = self.just.contains(&code);
        if hit {
            self.just.retain(|k| *k != code);
        }
        hit
    }

    fn poll_pads(&mut self, gilrs: Option<&mut gilrs::Gilrs>) {
        self.pads = read_pads(gilrs);
    }
}

fn read_pads(gilrs: Option<&mut gilrs::Gilrs>) -> [PadHand; 4] {
    let mut pads = std::array::from_fn(|_| PadHand::default());
    let Some(g) = gilrs else { return pads };
    while g.next_event().is_some() {}
    for (i, (_, gp)) in g.gamepads().take(4).enumerate() {
            use gilrs::{Axis, Button};
            let pressed = |b: Button| gp.is_pressed(b);
            let analog = |b: Button| gp.button_data(b).map(|d| d.value()).unwrap_or(0.0);
            pads[i] = PadHand {
                present: true,
                left: dead(Vec2::new(gp.value(Axis::LeftStickX), gp.value(Axis::LeftStickY))),
                right: dead(Vec2::new(gp.value(Axis::RightStickX), gp.value(Axis::RightStickY))),
                south: pressed(Button::South),
                east: pressed(Button::East),
                north: pressed(Button::North),
                west: pressed(Button::West),
                l1: pressed(Button::LeftTrigger),
                r1: pressed(Button::RightTrigger),
                start: pressed(Button::Start),
                up: pressed(Button::DPadUp),
                down: pressed(Button::DPadDown),
                left_b: pressed(Button::DPadLeft),
                right_b: pressed(Button::DPadRight),
                lt: analog(Button::LeftTrigger2),
                rt: analog(Button::RightTrigger2),
            };
        }
    pads
}

impl Harbor {
    /// Shell step plus one frame of surgeon hands. `aim` is the mouse on the field, if it hit.
    /// `local` is the hub seat this page owns; `None` is a solo table where slot 0 is always live.
    fn compose(&mut self, dt: f32, aim: Option<[f32; 2]>, local: Option<u8>, block_back: bool) -> (Vec<Cmd>, [SurgeonInput; 4], bool) {
        let op = self.shell.screen_name() == "op";
        let stick = self.pads[0].present && self.pads[0].right.length() > 0.12;
        let keys_aim = self.key(KeyCode::KeyW)
            || self.key(KeyCode::KeyA)
            || self.key(KeyCode::KeyS)
            || self.key(KeyCode::KeyD)
            || self.key(KeyCode::ArrowUp)
            || self.key(KeyCode::ArrowDown)
            || self.key(KeyCode::ArrowLeft)
            || self.key(KeyCode::ArrowRight);
        if stick || keys_aim {
            self.mouse_owns = false;
        } else if self.mouse_moved {
            self.mouse_owns = true;
        }
        let pad0 = self.pads[0];
        let pad_nav = pad0.present && (pad0.up || pad0.down || pad0.south || pad0.east || pad0.start || pad0.left.length() > 0.2 || pad0.right.length() > 0.2);
        let mouse_fine = self.mouse_moved || self.mouse_click || self.just.iter().any(|k| !matches!(k, KeyCode::F1 | KeyCode::F2 | KeyCode::F3));
        let device = if pad_nav && !mouse_fine { Some(DeviceKind::Gamepad) } else if mouse_fine || !self.just.is_empty() { Some(DeviceKind::KeyboardMouse) } else { None };
        let was = self.was;
        self.was = pad0;
        let up = self.ate(KeyCode::ArrowUp) || (pad0.up && !was.up);
        let down = self.ate(KeyCode::ArrowDown) || (pad0.down && !was.down);
        let left = self.ate(KeyCode::ArrowLeft) || (pad0.left_b && !was.left_b);
        let right = self.ate(KeyCode::ArrowRight) || (pad0.right_b && !was.right_b);
        let confirm = self.ate(KeyCode::Enter) || self.ate(KeyCode::NumpadEnter) || (!op && self.ate(KeyCode::Space)) || (!op && pad0.south && !was.south);
        let back = !block_back && (self.ate(KeyCode::Escape) || (!op && pad0.east && !was.east) || (pad0.start && !was.start));
        let any = device.is_some() || self.mouse_moved || self.touch_click || self.mouse_click || back || confirm || up || down;
        let pointer = if op { None } else { Some([self.mouse.x, self.mouse.y]) };
        let click = !op && (self.mouse_click || self.touch_click);
        let tab_l = self.ate(KeyCode::PageUp) || self.ate(KeyCode::BracketLeft);
        let tab_r = self.ate(KeyCode::PageDown) || self.ate(KeyCode::BracketRight);
        let cmds = self.shell.step(ShellIn {
            up: !op && up,
            down: !op && down,
            left: !op && left,
            right: !op && right,
            confirm: !op && confirm,
            back,
            tab_l,
            tab_r,
            pointer,
            click,
            any,
            dt,
            device,
        });
        let confirm_sim = cmds.iter().any(|c| matches!(c, Cmd::ConfirmSim));
        self.tools_from_hands(op, local);
        let mut surgeons = [SurgeonInput { tool: TOOL_KEEP, ..SurgeonInput::default() }; 4];
        if op {
            for i in 0..4 {
                let owns = local.is_none() && i == 0 && self.mouse_owns || local == Some(i as u8) && self.mouse_owns;
                surgeons[i] = self.hand(i, aim, owns, local);
            }
        } else if confirm_sim {
            surgeons[0].active = true;
            surgeons[0].tool = TOOL_KEEP;
            surgeons[0].held |= surg::CONFIRM;
            surgeons[0].pressed |= surg::CONFIRM;
        }
        self.mouse_click = false;
        self.mouse_moved = false;
        self.touch_click = false;
        self.wheel = 0.0;
        self.just.clear();
        (cmds, surgeons, confirm_sim)
    }

    fn tools_from_hands(&mut self, op: bool, local: Option<u8>) {
        if !op {
            return;
        }
        let pairs: Vec<(usize, usize)> = if let Some(me) = local {
            vec![(0, me as usize)]
        } else {
            (0..4).filter(|i| self.pads[*i].present).map(|i| (i, i)).collect()
        };
        for (pad_i, tool_i) in pairs {
            let pad = self.pads[pad_i];
            if !pad.present && local.is_none() {
                continue;
            }
            let using = pad.rt > 0.2 || pad.south;
            if pad.present && pad.l1 && !self.prev_l1[pad_i] && !using {
                self.tool[tool_i] = cycle(self.tool[tool_i], false);
            }
            if pad.present && pad.r1 && !self.prev_r1[pad_i] && !using {
                self.tool[tool_i] = cycle(self.tool[tool_i], true);
            }
            if pad.present {
                self.prev_l1[pad_i] = pad.l1;
                self.prev_r1[pad_i] = pad.r1;
                let oct = octant(pad.left);
                if let Some(t) = oct {
                    if self.prev_oct[pad_i] != Some(t) {
                        self.tool[tool_i] = t;
                    }
                }
                self.prev_oct[pad_i] = oct;
            }
        }
        let me = local.unwrap_or(0) as usize;
        if self.wheel.abs() > 0.01 && !self.mouse_left {
            self.tool[me] = cycle(self.tool[me], self.wheel > 0.0);
        }
        for (code, tool) in DIGITS {
            if self.ate(code) {
                self.tool[me] = tool;
            }
        }
    }

    fn hand(&self, slot: usize, mouse_aim: Option<[f32; 2]>, mouse_owns: bool, local: Option<u8>) -> SurgeonInput {
        if let Some(me) = local {
            if slot as u8 != me {
                return SurgeonInput { tool: TOOL_KEEP, ..SurgeonInput::default() };
            }
        }
        let pad = if local.is_some() { &self.pads[0] } else { &self.pads[slot] };
        let mine = local.is_some() || slot == 0;
        let mut held = 0;
        let mut aim = Vec2::ZERO;
        let mut pressure = 0.85;
        if mine && mouse_owns {
            if let Some(p) = mouse_aim {
                aim = Vec2::new(p[0], p[1]);
                held |= surg::AIM_ABSOLUTE | surg::SNAP;
            }
        } else if pad.present && pad.right.length() > 0.12 {
            aim = shape_stick(Vec2::new(pad.right.x, -pad.right.y));
        } else if mine && !mouse_owns {
            let mut v = Vec2::ZERO;
            if self.key(KeyCode::KeyW) || self.key(KeyCode::ArrowUp) {
                v.y += 1.0;
            }
            if self.key(KeyCode::KeyS) || self.key(KeyCode::ArrowDown) {
                v.y -= 1.0;
            }
            if self.key(KeyCode::KeyD) || self.key(KeyCode::ArrowRight) {
                v.x += 1.0;
            }
            if self.key(KeyCode::KeyA) || self.key(KeyCode::ArrowLeft) {
                v.x -= 1.0;
            }
            if v.length_squared() > 0.0 {
                aim = shape_stick(Vec2::new(v.x, -v.y));
            }
        }
        let use_key = mine && (self.mouse_left || self.key(KeyCode::KeyE));
        let use_pad = pad.present && (pad.rt > 0.08 || pad.south);
        if use_key || use_pad {
            held |= surg::USE;
            pressure = if pad.rt > 0.08 { pad.rt.max(0.15) } else { 1.0 };
        }
        let precise = (mine && self.key(KeyCode::ShiftLeft) && !mouse_owns) || pad.lt > 0.35;
        if precise {
            held |= surg::PRECISION;
        }
        if mine && (self.mouse_right || self.key(KeyCode::KeyQ)) || pad.east {
            held |= surg::CANCEL;
        }
        if mine && self.key(KeyCode::Space) || pad.north {
            held |= surg::GIFT;
        }
        if mine && self.key(KeyCode::Tab) || pad.west {
            held |= surg::CHART;
        }
        let both_mouse = mine && self.mouse_left && self.mouse_right;
        let both_trig = pad.lt > 0.45 && pad.rt > 0.45;
        if both_mouse || both_trig || self.tool[slot] == 10 && (use_key || use_pad) {
            held |= surg::DEFIB;
        }
        let using = held & surg::USE != 0;
        if using && pad.l1 {
            held |= surg::ROT_L;
        }
        if using && pad.r1 {
            held |= surg::ROT_R;
        }
        if mine && using && self.wheel > 0.1 {
            held |= surg::ROT_R;
        }
        if mine && using && self.wheel < -0.1 {
            held |= surg::ROT_L;
        }
        let active = local.is_some() || slot == 0 || pad.present;
        SurgeonInput { active, aim, held, pressed: 0, tool: self.tool[slot], pressure }
    }
}

const DIGITS: [(KeyCode, u8); 11] = [
    (KeyCode::Digit1, 0),
    (KeyCode::Digit2, 1),
    (KeyCode::Digit3, 2),
    (KeyCode::Digit4, 3),
    (KeyCode::Digit5, 4),
    (KeyCode::Digit6, 5),
    (KeyCode::Digit7, 6),
    (KeyCode::Digit8, 7),
    (KeyCode::Digit9, 8),
    (KeyCode::Digit0, 9),
    (KeyCode::Minus, 10),
];

fn dead(v: Vec2) -> Vec2 {
    if v.length() < 0.18 { Vec2::ZERO } else { v.clamp_length_max(1.0) }
}

fn shape_stick(v: Vec2) -> Vec2 {
    let mag = v.length().min(1.0);
    if mag < 0.001 {
        return Vec2::ZERO;
    }
    v.normalize() * mag.powf(2.2)
}

fn to_sim(c: Cmd) -> Option<SurgeryCmd> {
    Some(match c {
        Cmd::LoadCampaign => SurgeryCmd::LoadCampaign,
        Cmd::LoadCase(n) => SurgeryCmd::LoadCase(n),
        Cmd::LoadCode => SurgeryCmd::LoadCode,
        Cmd::LoadAttract => SurgeryCmd::LoadAttract,
        Cmd::ToTitle => SurgeryCmd::ToTitle,
        Cmd::SetDifficulty(d) => SurgeryCmd::SetDifficulty(d),
        Cmd::Retry => SurgeryCmd::Retry,
        Cmd::SetTune { id, value } => SurgeryCmd::SetTune { id, value },
        Cmd::ResetTune => SurgeryCmd::ResetTune,
        Cmd::SetBus { which, value } => SurgeryCmd::SetBus { which, value },
        Cmd::Dev { what, extra } => SurgeryCmd::Dev { what, extra },
        Cmd::ConfirmSim => return None,
    })
}

fn track_name(op: &SurgeryFrame) -> &'static str {
    if op.gift_hush > 0.0 {
        return "hush";
    }
    if op.flat || op.code_t >= 0.0 {
        return "code";
    }
    match op.mode {
        1 => {
            if op.case_id % 2 == 0 {
                "story_ward"
            } else {
                "story_night"
            }
        }
        3 | 6 => match op.strain {
            0..=3 => "introit",
            4..=7 => "lacrimosa",
            8..=10 => "dies",
            11..=17 => "libera",
            _ => {
                if op.case_id < 0 {
                    "code"
                } else {
                    "or"
                }
            }
        },
        4 => "results",
        5 => "crisis",
        7 => "code",
        _ => "title",
    }
}

pub fn surgery_frame(app: &mut App) {
    if app.gfx.is_none() || app.host.is_none() {
        return;
    }
    // The display callback and the timer below both enter here. One frame at a time.
    #[cfg(target_arch = "wasm32")]
    if IN_FRAME.with(|f| f.replace(true)) {
        return;
    }
    #[cfg(target_arch = "wasm32")]
    let _frame_guard = FrameGuard;
    let now = web_time::Instant::now();
    let dt = (now - app.last).as_secs_f32().min(0.1);
    app.last = now;

    #[cfg(target_arch = "wasm32")]
    drain_hook(app);

    app.harbor.poll_pads(app.input.gilrs.as_mut());
    let hub = app.harbor.link.poll(dt);
    aim_rig(app);
    let (w, h) = app.gfx.as_ref().unwrap().size();
    let size = Vec2::new(w as f32, h as f32);
    let hit = app.rig.ground_point(app.harbor.mouse, size, 0.0).map(|p| [p.x, p.z]);
    if app.harbor.mouse_click {
        if let Some(p) = hit {
            if let Some(tool) = tray_tool(p[0], p[1]) {
                let me = if hub.active { hub.slot as usize } else { 0 };
                app.harbor.tool[me.min(3)] = tool;
            }
        }
    }
    let local = if hub.active && !hub.server { Some(hub.slot) } else { None };
    let (cmds, mut surgeons, _) = app.harbor.compose(dt, hit, local, hub.active);
    if hub.active {
        app.harbor.shell.card_lines = hub.card_lines.clone();
        if !app.harbor.saw_card {
            app.harbor.saw_card = true;
            let host = app.host.as_ref().unwrap();
            host.exec(|sim| {
                if let Some(g) = sim.state.play.as_mut().and_then(|p| p.get_mut::<Surgery>()) {
                    if g.mode == 0 || g.mode == 6 {
                        g.mode = 7;
                        g.case_id = -1;
                    }
                    // Coarse plate and no shadows, so the iframe still paints the field.
                    g.hub_quiet = true;
                }
            });
        }
        if let Some(boot) = hub.boot.clone() {
            let host = app.host.as_ref().unwrap();
            host.exec(move |sim| {
                if boot.mirror {
                    if let Some(g) = sim.state.play.as_mut().and_then(|p| p.get_mut::<Surgery>()) {
                        g.boot_mirror();
                    }
                } else {
                    Surgery::boot_hub_round(sim, boot.seed as u64, &boot.slots, true);
                }
            });
        }
        if let Some(snap) = hub.snap.clone() {
            if snap.bucket >= app.harbor.applied_bucket {
                app.harbor.applied_bucket = snap.bucket;
                let host = app.host.as_ref().unwrap();
                host.exec(move |sim| {
                    if let Some(g) = sim.state.play.as_mut().and_then(|p| p.get_mut::<Surgery>()) {
                        g.apply_mirror(snap.vitals, snap.bpm, snap.phase, snap.flat, snap.timer, snap.code_t, &snap.hazards, &snap.cursors);
                    }
                });
            }
        }
        if !hub.server {
            let me = hub.slot as usize;
            if me < 4 {
                if let Some(dom) = hub.dom {
                    if dom.x != 0.0 || dom.y != 0.0 {
                        surgeons[me].active = true;
                        surgeons[me].aim = shape_stick(Vec2::new(dom.x, -dom.y));
                        surgeons[me].held &= !(surg::AIM_ABSOLUTE | surg::SNAP);
                    }
                    if dom.use_on {
                        surgeons[me].held |= surg::USE;
                        surgeons[me].pressure = 1.0;
                    }
                }
            }
        } else {
            for s in &mut surgeons {
                *s = SurgeonInput { tool: TOOL_KEEP, ..SurgeonInput::default() };
            }
        }
        for (i, remote) in hub.remote.iter().enumerate() {
            if hub.server || i != hub.slot as usize {
                if let Some(hand) = remote {
                    surgeons[i] = *hand;
                }
            }
        }
    }
    let host = app.host.as_ref().unwrap();
    let shown = host.frames().1;
    if let Some(op) = shown.surgery.as_ref() {
        resolve_hands(&mut surgeons, op);
    }
    let paused = app.harbor.shell.paused();
    let hold = paused || hub.ended;
    host.set_control(|c| c.paused = hold);
    for cmd in cmds {
        if let Some(sim_cmd) = to_sim(cmd) {
            host.exec(move |sim| {
                if let Some(g) = sim.state.play.as_mut().and_then(|p| p.get_mut::<Surgery>()) {
                    g.apply_cmd(sim_cmd);
                }
            });
        }
    }
    {
        let mut input = host.shared.input.lock().unwrap();
        *input = InputFrame::default();
        input.surgeons = surgeons;
    }
    host.pump();

    let (prev, curr, curr_at, tick_wall) = host.frames();
    let _ = (curr_at, tick_wall);
    let op = curr.surgery.clone();
    if let Some(op) = &op {
        app.harbor.shell.note_mode(op.mode);
        if op.mode == 3 || op.mode == 8 {
            app.gfx.as_ref().unwrap().window.set_cursor_visible(false);
        } else {
            app.gfx.as_ref().unwrap().window.set_cursor_visible(true);
        }
    }
    let events: Vec<_> = std::mem::take(&mut *host.shared.events.lock().unwrap());
    if hub.active {
        // One stream per copy. Host and server send snapshots; clients send a hand.
        // Sending both blows the hub's 20 messages/second cap.
        if hub.host {
            if let Some(op) = op.as_ref() {
                let (vitals, timer, bucket) = latched_vitals(&app.harbor, op, hub.time_ms);
                let body = snap_json(op, &events, vitals, timer, bucket);
                if app.harbor.link.send_snap(&body) {
                    app.harbor.net_vitals = Some(vitals);
                    app.harbor.net_timer = Some(timer);
                    app.harbor.net_bucket = bucket;
                }
                if hub.play {
                    app.harbor.link.publish(&standings_json(&hub.present, op));
                }
            }
        } else if !hub.server {
            let me = hub.slot as usize;
            if me < 4 {
                app.harbor.link.send_input(&surgeons[me]);
            }
        }
    }
    let quiet_audio = hub.server || hub.ended;
    let music = if quiet_audio { 0.0 } else { op.as_ref().map(|o| o.music).unwrap_or(0.10) };
    let effects = if quiet_audio { 0.0 } else { op.as_ref().map(|o| o.effects).unwrap_or(0.80) };
    let voices = if quiet_audio { 0.0 } else { op.as_ref().map(|o| o.voices).unwrap_or(0.70) };
    let name = op.as_ref().map(|o| track_name(o)).unwrap_or("title");
    if app.harbor.music_name != name {
        app.harbor.music_name = name.to_string();
        app.harbor.music_left = 0.0;
    }
    app.harbor.music_left -= dt;
    let schedule = if quiet_audio {
        None
    } else if app.harbor.music_left <= 0.0 {
        let bpm = op.as_ref().map(|o| o.bpm).unwrap_or(72.0).clamp(60.0, 140.0);
        let (dur, notes) = pav_audio::music::phrase(name, bpm);
        app.harbor.music_left = dur.max(0.5);
        Some(notes)
    } else {
        None
    };
    if let Some(a) = &app.audio {
        a.set_buses(music, effects, voices);
        let l = pav_audio::Listener { pos: Vec3::new(0.0, 8.0, 12.0), right: Vec3::X };
        for e in &events {
            a.play_event(e, &l, effects);
        }
        if let Some(notes) = schedule {
            for n in notes {
                a.play_bus(n.patch, n.pan, n.gain, n.delay, pav_audio::BUS_MUSIC);
            }
        }
    }
    // The software GPU can spend the whole host-leave window on one present.
    // Countdown frames skip that present. Snapshots already left, above.
    // The field is drawn once the hub clock reaches zero. If that present
    // stops the display callback, the timer installed below keeps stepping.
    if !(hub.active && !hub.play) {
        app.builder.add_events(&events);
        app.builder.now = app.started.elapsed().as_secs_f64();
        let view = ViewSettings::default();
        let focus = curr.focus;
        let mut scene = app.builder.build(&prev, &curr, 1.0, &app.rig, w as f32 / h.max(1) as f32, &view, focus);

        let gfx = app.gfx.as_mut().unwrap();
        let native = gfx.window.scale_factor() as f32;
        let zoom = (h as f32 / 1080.0) / native.max(0.25);
        app.egui_ctx.set_zoom_factor(zoom);
        if !app.harbor.font {
            pav_ui::surgery::install_font(&app.egui_ctx);
            app.harbor.font = true;
        }
        let state = app.egui_state.as_mut().unwrap();
        let raw = state.take(&gfx.window);
        let shell = &app.harbor.shell;
        let op_ref = op.as_deref();
        let out = app.egui_ctx.run_ui(raw, |ui| {
            pav_ui::surgery::draw(ui, shell, op_ref);
        });
        state.platform_output(&gfx.window, out.platform_output);
        let ppp = out.pixels_per_point;
        let prims = app.egui_ctx.tessellate(out.shapes, ppp);
        let mut textures = out.textures_delta;
        gfx.draw(&scene, Some((&prims, &mut textures, ppp)));
        let _ = &mut scene;
    }

    let status = status_json(&app.harbor.shell, op.as_deref(), app.harbor.net_vitals, app.harbor.net_timer);
    app.harbor.status = status.clone();
    publish_status(&status);
    #[cfg(target_arch = "wasm32")]
    {
        install_hook(app);
        install_tick(app, hub.active);
    }
}

fn aim_rig(app: &mut App) {
    app.rig.params = CameraParams {
        tilt: 73.0,
        yaw: 0.0,
        distance: 19.9,
        fov: 36.0,
        ortho: false,
        follow_lag: 0.0,
        height_offset: 0.0,
    };
    app.rig.snap(Vec3::new(0.0, 0.0, 0.2));
}

/// Ring tool 0–7, then Cryoprobe or Dressing when the cursor is on that wound.
fn resolve_hands(surgeons: &mut [SurgeonInput; 4], op: &SurgeryFrame) {
    for (i, s) in surgeons.iter_mut().enumerate() {
        if !s.active || s.tool == TOOL_KEEP {
            continue;
        }
        let (x, z) = if s.held & surg::AIM_ABSOLUTE != 0 {
            (s.aim.x, s.aim.y)
        } else {
            (op.cursors[i].x, op.cursors[i].z)
        };
        s.tool = contextual_tool(s.tool, x, z, &op.hazards);
    }
}

/// Tenth-of-a-unit grid used on the wire. Both pages report this same f32.
fn tenth(v: f32) -> f32 {
    (v * 10.0).round() / 10.0
}

/// Vitals stay on one value for a 500 ms hub-clock bucket. The bucket advances
/// in the body only; the harbor latch updates after the send succeeds.
fn latched_vitals(harbor: &Harbor, op: &SurgeryFrame, time_ms: f32) -> (f32, f32, i32) {
    if time_ms >= 0.0 {
        let bucket = (time_ms / 500.0).floor() as i32;
        if harbor.net_vitals.is_none() || bucket != harbor.net_bucket {
            return (tenth(op.vitals), tenth(op.timer), bucket);
        }
    }
    (
        harbor.net_vitals.unwrap_or_else(|| tenth(op.vitals)),
        harbor.net_timer.unwrap_or_else(|| tenth(op.timer)),
        harbor.net_bucket,
    )
}

fn snap_json(op: &SurgeryFrame, events: &[pav_core::SimEvent], vitals: f32, timer: f32, bucket: i32) -> String {
    let mut hazards = Vec::new();
    for h in op.hazards.iter().filter(|h| h.alive).take(12) {
        hazards.push(serde_json::json!([
            h.id,
            h.kind,
            (h.x * 100.0).round() / 100.0,
            (h.z * 100.0).round() / 100.0,
            1,
            h.stage,
            (h.work * 100.0).round() / 100.0
        ]));
    }
    let mut cursors = Vec::new();
    for (i, c) in op.cursors.iter().enumerate() {
        cursors.push(serde_json::json!([
            i,
            (c.x * 100.0).round() / 100.0,
            (c.z * 100.0).round() / 100.0,
            c.tool,
            if c.active { 1 } else { 0 },
            c.score
        ]));
    }
    let mut cues = Vec::new();
    for e in events.iter().rev().take(8) {
        if let pav_core::SimEvent::Cue { id, .. } = e {
            cues.push(*id);
        }
    }
    serde_json::json!({
        "k": "s",
        "v": vitals,
        "b": op.bpm.round(),
        "p": (op.phase * 100.0).round() / 100.0,
        "f": if op.flat { 1 } else { 0 },
        "tm": timer,
        "bb": bucket,
        "cd": (op.code_t * 10.0).round() / 10.0,
        "h": hazards,
        "u": cursors,
        "q": cues,
    })
    .to_string()
}

fn standings_json(present: &[u8], op: &SurgeryFrame) -> String {
    let ids: Vec<u8> = if present.is_empty() { vec![0] } else { present.to_vec() };
    let mut scores = serde_json::Map::new();
    for id in &ids {
        let score = op.cursors.get(*id as usize).map(|c| c.score).unwrap_or(0);
        scores.insert(id.to_string(), serde_json::json!(score));
    }
    serde_json::json!({
        "standings": [ids],
        "won": op.vitals > 0.0,
        "scores": scores,
    })
    .to_string()
}

fn status_json(shell: &Shell, op: Option<&SurgeryFrame>, vitals: Option<f32>, timer: Option<f32>) -> String {
    let music = op.map(|o| o.music).unwrap_or(0.10);
    let cursors: Vec<serde_json::Value> = op
        .map(|o| {
            o.cursors
                .iter()
                .map(|c| serde_json::json!({ "x": c.x, "z": c.z, "tool": c.tool, "active": c.active }))
                .collect()
        })
        .unwrap_or_default();
    serde_json::json!({
        "screen": shell.screen_name(),
        "focus": shell.focus(),
        "device": if shell.device == DeviceKind::Gamepad { "gamepad" } else { "keyboard" },
        "xbox": shell.xbox,
        "music": format!("{music:.2}"),
        "title": TITLE,
        "cursors": cursors,
        "vitals": vitals.or_else(|| op.map(|o| o.vitals)),
        "bpm": op.map(|o| o.bpm),
        "timer": timer.or_else(|| op.map(|o| o.timer)),
        "mode": op.map(|o| o.mode),
    })
    .to_string()
}

fn publish_status(s: &str) {
    STATUS.with(|c| *c.borrow_mut() = s.to_string());
}

thread_local! {
    static STATUS: RefCell<String> = const { RefCell::new(String::new()) };
    static BURST: Cell<u32> = const { Cell::new(0) };
    static HOOKED: Cell<bool> = const { Cell::new(false) };
}

#[cfg(target_arch = "wasm32")]
thread_local! {
    static IN_FRAME: Cell<bool> = const { Cell::new(false) };
    static LAST_MS: Cell<f64> = const { Cell::new(0.0) };
    static TICK_ON: Cell<bool> = const { Cell::new(false) };
    static HUB_LIVE: Cell<bool> = const { Cell::new(false) };
    static APP_PTR: Cell<*mut App> = const { Cell::new(std::ptr::null_mut()) };
}

#[cfg(target_arch = "wasm32")]
struct FrameGuard;

#[cfg(target_arch = "wasm32")]
impl Drop for FrameGuard {
    fn drop(&mut self) {
        IN_FRAME.with(|f| f.set(false));
    }
}

#[cfg(target_arch = "wasm32")]
fn frame_now_ms() -> f64 {
    js_sys::Date::now()
}

/// The software-GPU present cancels the display callback after the first
/// hub operation frame. While that callback is quiet and a hub session is
/// active, this timer steps the sim, the hands, and the snapshots. Solo play
/// leaves it idle. A live callback keeps `LAST_MS` fresh and the timer does nothing.
#[cfg(target_arch = "wasm32")]
fn install_tick(app: &mut App, hub_active: bool) {
    LAST_MS.with(|t| t.set(frame_now_ms()));
    HUB_LIVE.with(|h| h.set(hub_active));
    APP_PTR.with(|p| p.set(app as *mut App));
    if TICK_ON.with(|t| t.get()) {
        return;
    }
    use wasm_bindgen::JsCast;
    let Some(win) = web_sys::window() else { return };
    let cb = wasm_bindgen::closure::Closure::wrap(Box::new(|| {
        if IN_FRAME.with(|f| f.get()) || !HUB_LIVE.with(|h| h.get()) {
            return;
        }
        let last = LAST_MS.with(|t| t.get());
        if frame_now_ms() - last < 50.0 {
            return;
        }
        let ptr = APP_PTR.with(|p| p.get());
        if ptr.is_null() {
            return;
        }
        // Safety: `App` is owned by the event loop for the page lifetime, and
        // this callback runs on the same thread only while no frame is in progress.
        unsafe { surgery_frame(&mut *ptr) };
    }) as Box<dyn FnMut()>);
    let _ = win.set_interval_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), 32);
    cb.forget();
    TICK_ON.with(|t| t.set(true));
}

#[cfg(target_arch = "wasm32")]
fn drain_hook(app: &mut App) {
    let n = BURST.with(|b| b.replace(0));
    if n > 0 {
        if let Some(host) = &app.host {
            host.burst(n);
        }
    }
}

#[cfg(target_arch = "wasm32")]
fn install_hook(app: &App) {
    if HOOKED.with(|h| h.get()) {
        return;
    }
    use wasm_bindgen::JsCast;
    let Some(win) = web_sys::window() else { return };
    let obj = js_sys::Object::new();
    let status = wasm_bindgen::closure::Closure::wrap(Box::new(|| {
        STATUS.with(|s| wasm_bindgen::JsValue::from_str(&s.borrow()))
    }) as Box<dyn Fn() -> wasm_bindgen::JsValue>);
    let _ = js_sys::Reflect::set(&obj, &"status".into(), status.as_ref().unchecked_ref());
    status.forget();
    let step = wasm_bindgen::closure::Closure::wrap(Box::new(|n: u32| {
        BURST.with(|b| b.set(b.get().saturating_add(n)));
    }) as Box<dyn Fn(u32)>);
    let _ = js_sys::Reflect::set(&obj, &"step".into(), step.as_ref().unchecked_ref());
    step.forget();
    let _ = js_sys::Reflect::set(&win, &"__game".into(), &obj);
    HOOKED.with(|h| h.set(true));
    let _ = app;
}

pub fn surgery_event(app: &mut App, el: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
    let consumed = match (&mut app.egui_state, &app.gfx) {
        (Some(st), Some(g)) => st.on_window_event(&g.window, &event),
        _ => false,
    };
    let _ = consumed;
    match event {
        WindowEvent::CloseRequested => el.exit(),
        WindowEvent::Resized(sz) => {
            if let Some(g) = &mut app.gfx {
                g.resize(sz.width, sz.height);
            }
        }
        WindowEvent::RedrawRequested => {
            surgery_frame(app);
            if app.quit {
                el.exit();
            }
        }
        WindowEvent::KeyboardInput { event, .. } => {
            #[cfg(target_arch = "wasm32")]
            app.resume_audio();
            if let PhysicalKey::Code(code) = event.physical_key {
                match event.state {
                    ElementState::Pressed if !event.repeat => {
                        app.harbor.keys.insert(code);
                        app.harbor.just.push(code);
                    }
                    ElementState::Released => {
                        app.harbor.keys.remove(&code);
                    }
                    _ => {}
                }
            }
        }
        WindowEvent::MouseInput { state, button, .. } => {
            #[cfg(target_arch = "wasm32")]
            app.resume_audio();
            let down = state == ElementState::Pressed;
            match button {
                MouseButton::Left => {
                    app.harbor.mouse_left = down;
                    if down {
                        app.harbor.mouse_click = true;
                    }
                }
                MouseButton::Right => app.harbor.mouse_right = down,
                _ => {}
            }
        }
        WindowEvent::CursorMoved { position, .. } => {
            let p = Vec2::new(position.x as f32, position.y as f32);
            if (p - app.harbor.mouse).length() > 1.5 {
                app.harbor.mouse_moved = true;
            }
            app.harbor.mouse = p;
        }
        WindowEvent::MouseWheel { delta, .. } => {
            let lines = match delta {
                MouseScrollDelta::LineDelta(_, y) => y,
                MouseScrollDelta::PixelDelta(p) => p.y as f32 / 40.0,
            };
            app.harbor.wheel += lines;
        }
        WindowEvent::Touch(t) => {
            app.harbor.shell.touch_only = true;
            if t.phase == winit::event::TouchPhase::Started {
                app.harbor.touch_click = true;
                app.harbor.mouse = Vec2::new(t.location.x as f32, t.location.y as f32);
            }
        }
        _ => {}
    }
}
