//! Hazards and the gesture each tool performs on them.

use serde::{Deserialize, Serialize};

use super::kinds::*;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Hazard {
    pub id: u32,
    pub kind: u8,
    pub tool: u8,
    pub x: f32,
    pub z: f32,
    pub radius: f32,
    pub work: f32,
    pub need: f32,
    pub drain: f32,
    pub alive: bool,
    pub hidden: bool,
    pub revealed: f32,
    pub stage: u8,
    pub stages: u8,
    pub axis: f32,
    /// Heat, frost, swell, or bone angle (degrees).
    pub aux: f32,
    /// Last signed side, or time since the last stitch.
    pub aux2: f32,
    pub samples: u8,
    pub samples_need: u8,
    pub quality: f32,
    pub grabbed: bool,
    pub grab_x: f32,
    pub grab_z: f32,
    pub bits: u8,
    pub priority: i16,
    pub tag: u8,
    /// Seconds since a tool last engaged this hazard. Work fades when this grows.
    #[serde(default)]
    pub idle: f32,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Hit {
    pub engaged: bool,
    pub done: bool,
    pub rating: u8,
    pub misuse: u8,
    pub heal: f32,
    pub cue: u16,
}

impl Hazard {
    pub fn blank() -> Self {
        Self {
            id: 0,
            kind: K_POOL,
            tool: SUCTION,
            x: 0.0,
            z: 0.0,
            radius: 0.6,
            work: 0.0,
            need: 0.8,
            drain: 0.3,
            alive: true,
            hidden: false,
            revealed: 0.0,
            stage: 0,
            stages: 1,
            axis: 0.0,
            aux: 0.0,
            aux2: 0.0,
            samples: 0,
            samples_need: 1,
            quality: 0.0,
            grabbed: false,
            grab_x: 0.0,
            grab_z: 0.0,
            bits: 0,
            priority: 0,
            tag: 0,
            idle: 0.0,
        }
    }

    pub fn make(kind: u8, x: f32, z: f32) -> Self {
        let mut h = Self::blank();
        h.kind = kind;
        h.x = x;
        h.z = z;
        h.stages = stages_for(kind);
        h.tool = tool_for_kind(kind, 0);
        match kind {
            K_INCISION => {
                h.need = 2.4;
                h.radius = 0.55;
                h.drain = 0.0;
                h.axis = 0.0;
            }
            K_LACERATION => {
                h.need = 1.8;
                h.radius = 0.7;
                h.drain = 0.7;
                h.samples_need = 4;
                h.axis = 0.4;
            }
            K_POOL => {
                h.need = 0.7;
                h.radius = 0.75;
                h.drain = 0.45;
            }
            K_BLEEDER => {
                h.need = 0.9;
                h.radius = 0.6;
                h.drain = 2.4;
                h.samples_need = 3;
            }
            K_FOREIGN => {
                h.need = 0.85;
                h.radius = 0.55;
                h.drain = 0.45;
                h.axis = 0.6;
            }
            K_POLYP => {
                h.need = 1.15;
                h.radius = 0.5;
                h.drain = 0.25;
            }
            K_TUMOR => {
                h.need = 6.2832;
                h.radius = 0.85;
                h.drain = 0.55;
            }
            K_INFLAM | K_BURN => {
                h.need = 0.7;
                h.radius = 0.8;
                h.drain = 0.35;
                h.samples_need = 4;
            }
            K_BONE => {
                h.need = 0.35;
                h.radius = 0.6;
                h.drain = 0.15;
                h.aux = 38.0;
                h.samples_need = 2;
            }
            K_NODULE => {
                h.need = 0.85;
                h.radius = 0.5;
                h.drain = 0.35;
            }
            K_SAC => {
                h.need = 0.55;
                h.radius = 0.48;
                h.drain = 0.2;
                h.aux = 0.0;
            }
            K_EYE => {
                h.need = 1.6;
                h.radius = 0.5;
                h.drain = 0.5;
                h.samples_need = 2;
            }
            K_EMBER => {
                h.need = 0.95;
                h.radius = 0.5;
                h.drain = 0.3;
            }
            K_HEAT => {
                h.alive = true;
                h.drain = 0.0;
                h.radius = 12.0;
                h.need = 1.0;
            }
            K_TETHER => {
                h.need = 1.1;
                h.radius = 0.45;
                h.drain = 0.2;
            }
            K_TENDRIL => {
                h.need = 1.3;
                h.radius = 0.55;
                h.drain = 0.4;
                h.axis = 1.2;
            }
            K_DRESSING => {
                h.need = 0.85;
                h.radius = 1.1;
                h.drain = 0.0;
                h.samples_need = 4;
            }
            K_IV => {
                h.need = 1.0;
                h.radius = 0.45;
                h.drain = 0.0;
            }
            _ => {}
        }
        h
    }

    pub fn dist(&self, x: f32, z: f32) -> f32 {
        let dx = self.x - x;
        let dz = self.z - z;
        (dx * dx + dz * dz).sqrt()
    }

    pub fn accepts(&self, tool: u8) -> bool {
        if !self.alive || self.kind == K_HEAT {
            return false;
        }
        if self.hidden && self.revealed <= 0.0 {
            return tool == SCANNER;
        }
        if self.kind == K_SAC && tool == SUCTION {
            return true;
        }
        tool == self.tool
    }

    pub fn sync_tool(&mut self) {
        self.tool = tool_for_kind(self.kind, self.stage);
    }

    pub fn advance_stage(&mut self) -> bool {
        if self.stage + 1 >= self.stages {
            self.alive = false;
            return true;
        }
        self.stage += 1;
        self.work = 0.0;
        self.aux = if self.kind == K_BONE { 0.0 } else { 0.0 };
        self.aux2 = 0.0;
        self.samples = 0;
        self.quality = 0.0;
        self.grabbed = false;
        self.bits = 0;
        self.sync_tool();
        if self.kind == K_NODULE && self.stage == 1 {
            self.need = 0.7;
        }
        if self.kind == K_EYE && self.stage < 2 {
            self.need = 1.4;
            self.tool = SCALPEL;
        }
        if self.kind == K_TUMOR && self.stage == 1 {
            self.need = 0.8;
            self.radius = 0.55;
        }
        if self.kind == K_TUMOR && self.stage == 2 {
            self.need = 0.65;
            self.radius = 0.8;
            self.samples_need = 4;
        }
        if self.kind == K_EMBER && self.stage == 1 {
            self.need = 1.0;
        }
        if self.kind == K_EMBER && self.stage == 2 {
            self.need = 0.7;
        }
        if self.kind == K_BONE && self.stage == 1 {
            self.need = 1.2;
            self.samples_need = 2;
            self.radius = 0.65;
        }
        false
    }
}

fn side_of(h: &Hazard, x: f32, z: f32) -> (f32, f32) {
    let dx = x - h.x;
    let dz = z - h.z;
    let dirx = h.axis.cos();
    let dirz = h.axis.sin();
    let along = dx * dirx + dz * dirz;
    let side = -dx * dirz + dz * dirx;
    (along, side)
}

/// One tick of a tool against one hazard. `just_release` is use going up.
pub fn apply(
    h: &mut Hazard,
    x: f32,
    z: f32,
    tool: u8,
    use_held: bool,
    just_release: bool,
    pressure: f32,
    rot: i32,
    dt: f32,
    power: f32,
    diastole: bool,
    strict: f32,
) -> Hit {
    let mut hit = Hit::default();
    if !h.alive {
        return hit;
    }
    let d = h.dist(x, z);
    let near = d <= h.radius + 0.08;
    let p = pressure.clamp(0.15, 1.0) * power.max(0.2);

    if tool == SCANNER && use_held && d < h.radius + 0.35 {
        hit.engaged = true;
        hit.cue = CUE_PING;
        h.revealed = 8.0;
        h.hidden = false;
        if h.kind == K_FOREIGN || h.kind == K_NODULE {
            return hit;
        }
    }

    if h.hidden && h.revealed <= 0.0 {
        return hit;
    }

    match h.kind {
        K_INCISION | K_TETHER => {
            if tool != SCALPEL || !use_held {
                return hit;
            }
            let (along, side) = side_of(h, x, z);
            if side.abs() < 0.5 && along >= h.work - 0.15 && along <= h.work + 0.55 {
                hit.engaged = true;
                hit.cue = CUE_SLICE;
                h.quality += side.abs() * dt;
                h.work = h.work.max(along);
                if side.abs() > 0.62 {
                    hit.misuse = 1;
                }
            }
            if h.work >= h.need {
                finish(h, &mut hit, h.quality / h.need.max(0.3), strict);
            }
        }
        K_TUMOR if h.stage == 0 => {
            if tool != SCALPEL || !use_held {
                return hit;
            }
            let ang = h.work;
            let px = h.x + ang.cos() * (h.radius * 0.75);
            let pz = h.z + ang.sin() * (h.radius * 0.75);
            let dd = ((x - px).powi(2) + (z - pz).powi(2)).sqrt();
            if dd < 0.48 {
                hit.engaged = true;
                hit.cue = CUE_SLICE;
                h.work += dt * 2.4 * p;
                h.quality += dd * dt;
            }
            if h.work >= std::f32::consts::TAU {
                finish(h, &mut hit, h.quality / 2.0, strict);
            }
        }
        K_FOREIGN | K_TENDRIL | K_TUMOR if h.tool == FORCEPS => {
            forceps(h, x, z, tool, use_held, dt, &mut hit, strict, diastole);
        }
        K_NODULE if h.stage >= 1 => {
            forceps(h, x, z, tool, use_held, dt, &mut hit, strict, true);
        }
        K_EYE if h.stage >= 2 => {
            forceps(h, x, z, tool, use_held, dt, &mut hit, strict, true);
        }
        K_EMBER if h.stage >= 2 => {
            forceps(h, x, z, tool, use_held, dt, &mut hit, strict, true);
        }
        // The guard binds the whole or-pattern, so a stage check cannot share this arm
        // with wounds that suture on stage 0.
        K_LACERATION | K_BLEEDER => {
            suture(h, x, z, tool, use_held, dt, &mut hit, strict);
        }
        K_BONE if h.stage >= 1 => {
            suture(h, x, z, tool, use_held, dt, &mut hit, strict);
        }
        K_EYE if h.stage < 2 => {
            if tool == SCALPEL && use_held && near {
                hit.engaged = true;
                hit.cue = CUE_SLICE;
                h.work += dt * p;
                h.quality += d * dt;
                if h.work >= h.need {
                    finish(h, &mut hit, h.quality / h.need.max(0.2), strict);
                }
            }
        }
        K_POOL => {
            if tool == SUCTION && use_held && near {
                hit.engaged = true;
                hit.cue = CUE_GURGLE;
                h.work += dt * p;
                if h.work >= h.need {
                    hit.done = true;
                    hit.rating = R_GOOD;
                    h.alive = false;
                }
            }
        }
        K_SAC => {
            if tool == LASER && (use_held || just_release) {
                heat_tool(h, near, use_held, just_release, dt, p, strict, &mut hit, CUE_LASER, 2);
            } else if tool == SUCTION && use_held && near {
                hit.engaged = true;
                hit.cue = CUE_GURGLE;
                h.work += dt * 0.45 * p;
                if h.work >= 1.3 {
                    hit.done = true;
                    hit.rating = R_GOOD;
                    h.alive = false;
                }
            }
        }
        K_POLYP | K_NODULE | K_EMBER if h.stage == 0 && (h.kind != K_EMBER || h.tool == CRYO) => {
            let cue = if h.tool == CRYO { CUE_FROST } else { CUE_LASER };
            let misuse = if h.tool == CRYO { 4 } else { 2 };
            if tool == h.tool {
                heat_tool(h, near, use_held, just_release, dt, p, strict, &mut hit, cue, misuse);
            }
        }
        K_EMBER if h.stage == 1 => {
            if tool == SCALPEL && use_held && near {
                hit.engaged = true;
                hit.cue = CUE_SLICE;
                h.work += dt * p;
                if h.work >= h.need {
                    finish(h, &mut hit, 0.1, strict);
                }
            }
        }
        K_INFLAM | K_BURN | K_DRESSING | K_TUMOR if h.tool == GEL || h.tool == DRESSING => {
            paint(h, x, z, tool, use_held, d, dt, &mut hit, strict);
        }
        K_BONE if h.stage == 0 => {
            if rot > 0 {
                h.aux -= dt * 55.0;
            }
            if rot < 0 {
                h.aux += dt * 55.0;
            }
            h.aux = h.aux.clamp(-80.0, 80.0);
            if tool == FORCEPS && use_held && d < 0.55 && h.aux.abs() < 12.0 {
                hit.engaged = true;
                hit.cue = CUE_FORCEPS;
                h.work += dt;
                if h.work > 0.25 {
                    let err = (h.aux.abs() / 40.0) + (d * 0.4);
                    finish(h, &mut hit, err, strict);
                }
            }
        }
        K_IV => {
            if tool != IV {
                return hit;
            }
            hit.engaged = true;
            if use_held {
                h.aux += dt / 1.65 * p;
                hit.cue = CUE_IV;
                if h.aux > 1.12 {
                    hit.done = true;
                    hit.rating = R_SLOPPY;
                    hit.heal = -8.0;
                    hit.misuse = 3;
                    h.aux = 0.0;
                }
            } else if just_release && h.aux > 0.05 {
                if (0.75..1.05).contains(&h.aux) {
                    hit.done = true;
                    hit.rating = rate_error((h.aux - 0.9).abs() * 1.4, strict);
                    hit.heal = 18.0;
                    hit.cue = CUE_IV;
                }
                h.aux = 0.0;
            }
        }
        _ => {}
    }
    hit
}

fn finish(h: &mut Hazard, hit: &mut Hit, err: f32, strict: f32) {
    hit.done = true;
    hit.rating = rate_error(err, strict);
    hit.engaged = true;
    let cleared = h.advance_stage();
    if !cleared {
        hit.done = true;
    }
}

fn forceps(h: &mut Hazard, x: f32, z: f32, tool: u8, use_held: bool, dt: f32, hit: &mut Hit, strict: f32, allow: bool) {
    if tool != FORCEPS {
        return;
    }
    let d = h.dist(x, z);
    if use_held && !h.grabbed && d <= h.radius {
        h.grabbed = true;
        h.grab_x = x;
        h.grab_z = z;
        hit.engaged = true;
        hit.cue = CUE_FORCEPS;
    }
    if h.grabbed && use_held {
        hit.engaged = true;
        let dx = x - h.grab_x;
        let dz = z - h.grab_z;
        let dirx = h.axis.cos();
        let dirz = h.axis.sin();
        let along = dx * dirx + dz * dirz;
        let lat = (-dx * dirz + dz * dirx).abs();
        if h.kind == K_TENDRIL && !allow {
            h.work = (h.work - dt * 0.9).max(0.0);
            h.quality += 0.02;
        } else {
            h.work = h.work.max(along);
            h.quality += lat * dt;
            if lat > 0.6 && along > 0.25 {
                hit.misuse = 1;
            }
        }
        if h.work >= h.need {
            finish(h, hit, h.quality / h.need.max(0.3), strict);
            hit.cue = CUE_POP;
        }
    } else if !use_held {
        h.grabbed = false;
        if h.work < h.need {
            h.work = 0.0;
        }
    }
}

fn suture(h: &mut Hazard, x: f32, z: f32, tool: u8, use_held: bool, dt: f32, hit: &mut Hit, strict: f32) {
    if tool != SUTURE || !use_held {
        return;
    }
    let (along, side) = side_of(h, x, z);
    let span = h.need.max(0.4);
    let n = h.samples_need.max(1) as f32;
    let needle = -span * 0.5 + (h.samples as f32 + 0.5) * (span / n);
    if side.abs() > 0.06 {
        let prev = h.aux2;
        if prev.abs() > 0.06 && prev.signum() != side.signum() && (along - needle).abs() < 0.55 && side.abs() < 0.9 {
            h.samples = h.samples.saturating_add(1);
            h.quality += (h.aux - 0.28).abs() * 0.35;
            h.aux = 0.0;
            hit.engaged = true;
            hit.cue = CUE_ZIP;
            if h.samples >= h.samples_need {
                let err = h.quality / h.samples.max(1) as f32;
                finish(h, hit, err, strict);
            }
        } else if side.abs() < 0.95 && (along - needle).abs() < 0.75 {
            hit.engaged = true;
        }
        h.aux2 = side;
    } else if (along - needle).abs() < 0.75 {
        hit.engaged = true;
    }
    h.aux += dt;
}

fn heat_tool(h: &mut Hazard, near: bool, use_held: bool, just_release: bool, dt: f32, p: f32, strict: f32, hit: &mut Hit, cue: u16, misuse: u8) {
    let fill = h.need.max(0.35);
    if use_held && near {
        hit.engaged = true;
        hit.cue = cue;
        h.aux += dt / fill * p;
        if h.aux > 1.08 {
            hit.done = true;
            hit.rating = R_SLOPPY;
            hit.misuse = misuse;
            h.aux = 0.0;
            h.alive = false;
        }
    } else if just_release && h.aux > 0.05 {
        if (0.80..1.06).contains(&h.aux) {
            hit.done = true;
            hit.engaged = true;
            hit.rating = rate_error((h.aux - 0.92).abs() * 1.6, strict);
            hit.cue = CUE_SIZZLE;
            let _ = h.advance_stage();
        }
        h.aux = 0.0;
    } else if !near {
        h.aux = (h.aux - dt * 0.35).max(0.0);
    }
}

fn paint(h: &mut Hazard, x: f32, z: f32, tool: u8, use_held: bool, d: f32, dt: f32, hit: &mut Hit, strict: f32) {
    if tool != h.tool || !use_held {
        return;
    }
    if d <= h.radius {
        hit.engaged = true;
        hit.cue = CUE_GEL;
        let ang = (z - h.z).atan2(x - h.x);
        let q = ((ang + std::f32::consts::PI) / (std::f32::consts::FRAC_PI_2)).floor() as u8 % 4;
        h.bits |= 1 << q;
        h.work += dt;
        if h.bits.count_ones() >= 4 && h.work >= h.need * 0.55 {
            finish(h, hit, h.quality * 0.5, strict);
        }
    } else if d < h.radius * 2.1 {
        h.quality += dt;
        hit.engaged = true;
    }
}

/// Where the bot should put the cursor to continue this gesture.
pub fn aim_point(h: &Hazard, cursor_side: f32) -> (f32, f32) {
    match h.kind {
        K_INCISION | K_TETHER => {
            let dirx = h.axis.cos();
            let dirz = h.axis.sin();
            let along = (h.work + 0.22).min(h.need);
            (h.x + dirx * along, h.z + dirz * along)
        }
        K_TUMOR if h.stage == 0 => {
            let ang = h.work + 0.28;
            (h.x + ang.cos() * (h.radius * 0.75), h.z + ang.sin() * (h.radius * 0.75))
        }
        K_LACERATION | K_BLEEDER | K_BONE if h.stage >= 1 || h.kind != K_BONE => {
            let dirx = h.axis.cos();
            let dirz = h.axis.sin();
            let span = h.need.max(0.4);
            let n = h.samples_need.max(1) as f32;
            let needle = -span * 0.5 + (h.samples as f32 + 0.5) * (span / n);
            let across_x = -dirz;
            let across_z = dirx;
            let sign = if cursor_side >= 0.0 { -1.0 } else { 1.0 };
            (h.x + dirx * needle + across_x * 0.5 * sign, h.z + dirz * needle + across_z * 0.5 * sign)
        }
        K_FOREIGN | K_TENDRIL | K_NODULE | K_EYE | K_EMBER | K_TUMOR if h.grabbed || h.tool == FORCEPS && h.kind != K_TUMOR => {
            if h.grabbed || h.work > 0.05 {
                let dirx = h.axis.cos();
                let dirz = h.axis.sin();
                (h.grab_x + dirx * (h.need + 0.15), h.grab_z + dirz * (h.need + 0.15))
            } else {
                (h.x, h.z)
            }
        }
        _ => (h.x, h.z),
    }
}
