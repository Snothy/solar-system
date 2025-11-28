mod constants;
mod types;
mod forces;
mod kepler;
mod hierarchy;
mod utils;
mod analysis;
mod torques;
pub mod integrators;

use wasm_bindgen::prelude::*;
use js_sys::Float32Array;
use crate::types::{Vector3, PhysicsBody};
use crate::constants::SOLAR_MASS_LOSS;
use crate::integrators::*;
use crate::hierarchy::update_hierarchy;
use crate::utils::update_pole_orientation;
use crate::analysis::{update_moon_libration, check_collisions};
use crate::torques::apply_tidal_torque;

#[wasm_bindgen]
pub struct PhysicsEngine {
    bodies: Vec<PhysicsBody>,
    trails: Vec<Vec<f32>>,
    trail_indices: Vec<usize>,
    parent_indices: Vec<Option<usize>>, // Cache parent index for each body
}

#[wasm_bindgen]
impl PhysicsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(val: JsValue) -> PhysicsEngine {
        let bodies: Vec<PhysicsBody> = serde_wasm_bindgen::from_value(val).unwrap();
        let n = bodies.len();
        // Initialize trails (e.g., 500 points * 3 coords)
        // We'll define TRAIL_LENGTH constant later or pass it. Let's assume 1000 for now or match JS.
        // JS uses TRAIL_LENGTH from constants. Let's use 2000 to be safe/high quality.
        let trail_len = 2000; 
        let trails = vec![vec![0.0; trail_len * 3]; n];
        let trail_indices = vec![0; n];
        
        let mut engine = PhysicsEngine { bodies, trails, trail_indices, parent_indices: vec![None; n] };
        engine.update_hierarchy_internal();
        engine
    }

    pub fn update_bodies(&mut self, val: JsValue) {
        self.bodies = serde_wasm_bindgen::from_value(val).unwrap();
        // Resize trails if needed (simple approach: reset if size changes)
        if self.bodies.len() != self.trails.len() {
            let n = self.bodies.len();
            let trail_len = 2000;
            self.trails = vec![vec![0.0; trail_len * 3]; n];
            self.trail_indices = vec![0; n];
            self.parent_indices = vec![None; n];
        }
        self.update_hierarchy_internal();
    }

    fn update_hierarchy_internal(&mut self) {
        self.parent_indices = update_hierarchy(&self.bodies);
    }

    pub fn step(
        &mut self, 
        dt: f64, 
        sim_time: f64,
        enable_relativity: bool, 
        enable_j2: bool, 
        enable_tidal: bool,
        enable_srp: bool,
        enable_yarkovsky: bool,
        enable_drag: bool,
        use_eih: bool,
        enable_precession: bool,
        enable_nutation: bool,
        enable_solar_mass_loss: bool,
        enable_pr_drag: bool,
        integrator_type: u8, // 0=Adaptive, 1=Wisdom-Holman, 2=SABA4, 3=HighPrecision
        quality: u8 // 0=Low, 1=Medium, 2=High, 3=Ultra
    ) -> f64 {
        // Update Pole Orientation (Precession/Nutation)
        update_pole_orientation(&mut self.bodies, sim_time, enable_precession, enable_nutation);

        // Apply Solar Mass Loss
        if enable_solar_mass_loss {
            if let Some(sun_idx) = self.bodies.iter().position(|b| b.name == "Sun") {
                self.bodies[sun_idx].mass -= SOLAR_MASS_LOSS * dt;
            }
        }

        // FORCE HIERARCHY UPDATE
        self.update_hierarchy_internal();

        match integrator_type {
            1 => { // Wisdom-Holman
                let max_wh_substep = match quality {
                    0 => 300.0,
                    1 => 180.0,
                    2 => 100.0,
                    3 => 60.0,
                    _ => 180.0,
                };
                
                let mut time_remaining = dt;
                while time_remaining > 0.0 {
                    let sub_dt = if time_remaining > max_wh_substep { max_wh_substep } else { time_remaining };
                    step_wisdom_holman(
                        &mut self.bodies,
                        &self.parent_indices,
                        sub_dt,
                        enable_relativity,
                        enable_j2,
                        enable_tidal,
                        enable_srp,
                        enable_yarkovsky,
                        enable_drag,
                        use_eih,
                        enable_pr_drag
                    );
                    if enable_tidal { apply_tidal_torque(&mut self.bodies, sub_dt); }
                    update_moon_libration(&mut self.bodies);
                    time_remaining -= sub_dt;
                }
            },
            2 => { // SABA4
                let max_saba_substep = match quality {
                    0 => 1200.0,
                    1 => 600.0,
                    2 => 300.0,
                    3 => 150.0,
                    _ => 600.0,
                };
                
                let mut time_remaining = dt;
                while time_remaining > 0.0 {
                    let sub_dt = if time_remaining > max_saba_substep { max_saba_substep } else { time_remaining };
                    step_saba4(
                        &mut self.bodies,
                        &self.parent_indices,
                        sub_dt,
                        enable_relativity,
                        enable_j2,
                        enable_tidal,
                        enable_srp,
                        enable_yarkovsky,
                        enable_drag,
                        use_eih,
                        enable_pr_drag
                    );
                    if enable_tidal { apply_tidal_torque(&mut self.bodies, sub_dt); }
                    update_moon_libration(&mut self.bodies);
                    time_remaining -= sub_dt;
                }
            },
            3 => { // High Precision (DOP853)
                step_high_precision(
                    &mut self.bodies,
                    &self.parent_indices,
                    dt,
                    sim_time,
                    enable_relativity,
                    enable_j2,
                    enable_tidal,
                    enable_srp,
                    enable_yarkovsky,
                    enable_drag,
                    use_eih,
                    enable_pr_drag
                );
                if enable_tidal { apply_tidal_torque(&mut self.bodies, dt); }
                update_moon_libration(&mut self.bodies);
            },
            _ => { // Adaptive (Symplectic 4) - Default
                let max_substep = match quality {
                    0 => 60.0,
                    1 => 30.0,
                    2 => 10.0,
                    3 => 1.0,
                    _ => 10.0,
                };
                
                let mut time_remaining = dt;
                while time_remaining > 0.0 {
                    let sub_dt = if time_remaining > max_substep { max_substep } else { time_remaining };
                    step_symplectic_4(
                        &mut self.bodies,
                        &self.parent_indices,
                        sub_dt, 
                        enable_relativity, 
                        enable_j2, 
                        enable_tidal, 
                        enable_srp, 
                        enable_yarkovsky, 
                        enable_drag, 
                        use_eih, 
                        enable_pr_drag
                    );
                    if enable_tidal { apply_tidal_torque(&mut self.bodies, sub_dt); }
                    update_moon_libration(&mut self.bodies);
                    time_remaining -= sub_dt;
                }
            }
        }

        // Recenter System (Barycenter Correction) to prevent drift
        // Disabled for debugging Phobos instability - might be introducing energy drift
        // recenter_system(&mut self.bodies);

        dt
    }

    pub fn get_bodies(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.bodies).unwrap()
    }
    
    pub fn get_barycenter(&self) -> JsValue {
        let mut bary = Vector3::zero();
        let mut total_mass = 0.0;
        for b in &self.bodies {
            let mut p = b.pos;
            p.scale(b.mass);
            bary.add(&p);
            total_mass += b.mass;
        }
        if total_mass > 0.0 {
            bary.scale(1.0 / total_mass);
        }
        serde_wasm_bindgen::to_value(&bary).unwrap()
    }

    pub fn get_moon_libration(&self) -> f64 {
        // This is a getter for the UI, not the update logic
        // The update logic is in analysis::update_moon_libration which updates the body struct
        // Here we just read it from the Moon body
        if let Some(moon) = self.bodies.iter().find(|b| b.name == "Moon") {
            return moon.libration.unwrap_or(0.0);
        }
        0.0
    }

    pub fn check_collisions(&self) -> JsValue {
        let collisions = check_collisions(&self.bodies);
        serde_wasm_bindgen::to_value(&collisions).unwrap()
    }

    pub fn get_visual_state(
        &mut self,
        observer_x: f64,
        observer_y: f64,
        observer_z: f64,
        visual_scale: f64,
        use_visual_scale: bool,
        use_light_time_delay: bool,
        enable_light_aberration: bool,
        focused_body_idx: i32, // -1 if none
        scale_factor: f64 // e.g. 1.0/1000.0 or whatever SCALE constant is. JS passes SCALE.
    ) -> JsValue {
        let n = self.bodies.len();
        let mut visual_positions = vec![0.0; n * 3];
        let observer_pos = Vector3::new(observer_x, observer_y, observer_z);
        let c_light = 299792458.0;

        let observer_vel = if focused_body_idx >= 0 && (focused_body_idx as usize) < n {
            self.bodies[focused_body_idx as usize].vel
        } else {
            Vector3::zero()
        };

        let mut geometric_positions = vec![0.0; n * 3];

        for i in 0..n {
            let b = &self.bodies[i];
            
            // 1. Geometric Position (scaled)
            let mut pos = b.pos;
            pos.scale(scale_factor); // Convert to visual units
            
            geometric_positions[i * 3] = pos.x as f32;
            geometric_positions[i * 3 + 1] = pos.y as f32;
            geometric_positions[i * 3 + 2] = pos.z as f32;

            // 2. Visual Scale (Moon visibility)
            // ... (omitted for now)
            
            let mut vis_pos = pos;

            // 3. Light Time Delay
            if use_light_time_delay {
                let dist_visual = observer_pos.distance_to(&vis_pos);
                let dist_meters = dist_visual / scale_factor;
                let delay = dist_meters / c_light;
                
                let mut correction = b.vel;
                correction.scale(-delay * scale_factor); 
                vis_pos.add(&correction);
            }

            // 4. Light Aberration
            if enable_light_aberration {
                let mut to_obj = vis_pos;
                to_obj.sub(&observer_pos);
                to_obj.normalize();
                
                let mut v_cross = observer_vel.cross(&to_obj);
                let aberration_angle = v_cross.len() / c_light;
                
                if aberration_angle > 1e-12 {
                    let mut perp = v_cross;
                    perp.normalize();
                    let dist = observer_pos.distance_to(&vis_pos);
                    let shift_mag = dist * aberration_angle.sin();
                    perp.scale(shift_mag);
                    vis_pos.add(&perp);
                }
            }

            visual_positions[i * 3] = vis_pos.x as f32;
            visual_positions[i * 3 + 1] = vis_pos.y as f32;
            visual_positions[i * 3 + 2] = vis_pos.z as f32;

            // Update Trails (Internal Buffer - Optional if we use JS)
            let t_idx = self.trail_indices[i];
            let trail_len = self.trails[i].len() / 3;
            
            self.trails[i][t_idx * 3] = pos.x as f32;
            self.trails[i][t_idx * 3 + 1] = pos.y as f32;
            self.trails[i][t_idx * 3 + 2] = pos.z as f32;
            
            self.trail_indices[i] = (t_idx + 1) % trail_len;
        }

        // Return object with positions and trails
        let result = js_sys::Object::new();
        let pos_array = unsafe { js_sys::Float32Array::view(&visual_positions) };
        let geo_array = unsafe { js_sys::Float32Array::view(&geometric_positions) };
        
        js_sys::Reflect::set(&result, &"positions".into(), &pos_array).unwrap();
        js_sys::Reflect::set(&result, &"geometricPositions".into(), &geo_array).unwrap();
        result.into()
    }
    
    pub fn get_trail(&self, body_idx: usize) -> Float32Array {
        if body_idx < self.bodies.len() {
             // Return the trail buffer for this body
             unsafe { js_sys::Float32Array::view(&self.trails[body_idx]).into() }
        } else {
             Float32Array::new_with_length(0)
        }
    }
    
    pub fn get_trail_index(&self, body_idx: usize) -> usize {
        if body_idx < self.bodies.len() {
            self.trail_indices[body_idx]
        } else {
            0
        }
    }
}
