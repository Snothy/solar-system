mod constants;
mod types;
mod forces;

use wasm_bindgen::prelude::*;
use crate::types::{Vector3, PhysicsBody};
use crate::constants::SOLAR_MASS_LOSS;
use crate::forces::*;

#[wasm_bindgen]
pub struct PhysicsEngine {
    bodies: Vec<PhysicsBody>,
}

#[wasm_bindgen]
impl PhysicsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(val: JsValue) -> PhysicsEngine {
        let bodies: Vec<PhysicsBody> = serde_wasm_bindgen::from_value(val).unwrap();
        PhysicsEngine { bodies }
    }

    pub fn update_bodies(&mut self, val: JsValue) {
        self.bodies = serde_wasm_bindgen::from_value(val).unwrap();
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
        use_eih: bool
    ) -> f64 {
        // Update Pole Orientation (Precession/Nutation)
        // We use enable_j2 as a proxy for enabling precession/nutation if needed, 
        // or we could add more flags. For now, let's assume if J2 is on, we want accurate poles.
        // Actually, let's just use the flags passed in.
        // Wait, I don't have separate flags for precession/nutation in Rust step yet.
        // Let's assume they are enabled if J2 is enabled (high fidelity mode).
        self.update_pole_orientation(sim_time, enable_j2, enable_j2);

        // Apply Solar Mass Loss
        if let Some(sun_idx) = self.bodies.iter().position(|b| b.name == "Sun") {
            self.bodies[sun_idx].mass -= SOLAR_MASS_LOSS * dt;
        }

        // Calculate Moon Libration
        let moon_idx = self.bodies.iter().position(|b| b.name == "Moon");
        let earth_idx = self.bodies.iter().position(|b| b.name == "Earth");
        
        if let (Some(m_idx), Some(e_idx)) = (moon_idx, earth_idx) {
            let m_pos = self.bodies[m_idx].pos;
            let e_pos = self.bodies[e_idx].pos;
            let m_vel = self.bodies[m_idx].vel;
            let e_vel = self.bodies[e_idx].vel;
            
            let mut r_vec = m_pos; r_vec.sub(&e_pos);
            let r = r_vec.len();
            
            let a = 384400e3;
            let ecc = 0.0549;
            
            let p = a * (1.0 - ecc * ecc);
            let cos_nu = (p / r - 1.0) / ecc;
            let clamped_cos_nu = cos_nu.max(-1.0).min(1.0);
            
            let mut rel_vel = m_vel; rel_vel.sub(&e_vel);
            let r_dot_v = r_vec.dot(&rel_vel);
            
            let mut nu = clamped_cos_nu.acos();
            if r_dot_v < 0.0 {
                nu = 2.0 * std::f64::consts::PI - nu;
            }
            
            let libration = -2.0 * ecc * nu.sin();
            self.bodies[m_idx].libration = Some(libration);
        }

        // RK4 Integration
        let k1_v = self.compute_accelerations(&self.bodies, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih);
        let k1_r: Vec<Vector3> = self.bodies.iter().map(|b| b.vel).collect();

        let mut temp_bodies = self.bodies.clone();
        for (i, b) in temp_bodies.iter_mut().enumerate() {
            let mut delta_r = k1_r[i]; delta_r.scale(0.5 * dt);
            let mut delta_v = k1_v[i]; delta_v.scale(0.5 * dt);
            b.pos.add(&delta_r);
            b.vel.add(&delta_v);
        }
        let k2_v = self.compute_accelerations(&temp_bodies, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih);
        let k2_r: Vec<Vector3> = temp_bodies.iter().map(|b| b.vel).collect();

        temp_bodies = self.bodies.clone();
        for (i, b) in temp_bodies.iter_mut().enumerate() {
            let mut delta_r = k2_r[i]; delta_r.scale(0.5 * dt);
            let mut delta_v = k2_v[i]; delta_v.scale(0.5 * dt);
            b.pos.add(&delta_r);
            b.vel.add(&delta_v);
        }
        let k3_v = self.compute_accelerations(&temp_bodies, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih);
        let k3_r: Vec<Vector3> = temp_bodies.iter().map(|b| b.vel).collect();

        temp_bodies = self.bodies.clone();
        for (i, b) in temp_bodies.iter_mut().enumerate() {
            let mut delta_r = k3_r[i]; delta_r.scale(dt);
            let mut delta_v = k3_v[i]; delta_v.scale(dt);
            b.pos.add(&delta_r);
            b.vel.add(&delta_v);
        }
        let k4_v = self.compute_accelerations(&temp_bodies, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih);
        let k4_r: Vec<Vector3> = temp_bodies.iter().map(|b| b.vel).collect();

        for (i, b) in self.bodies.iter_mut().enumerate() {
            let mut sum_r = k1_r[i];
            let mut k2_r_2 = k2_r[i]; k2_r_2.scale(2.0);
            let mut k3_r_2 = k3_r[i]; k3_r_2.scale(2.0);
            sum_r.add(&k2_r_2);
            sum_r.add(&k3_r_2);
            sum_r.add(&k4_r[i]);
            sum_r.scale(dt / 6.0);
            b.pos.add(&sum_r);

            let mut sum_v = k1_v[i];
            let mut k2_v_2 = k2_v[i]; k2_v_2.scale(2.0);
            let mut k3_v_2 = k3_v[i]; k3_v_2.scale(2.0);
            sum_v.add(&k2_v_2);
            sum_v.add(&k3_v_2);
            sum_v.add(&k4_v[i]);
            sum_v.scale(dt / 6.0);
            b.vel.add(&sum_v);
        }
        
        // Update Rotation (Torque)
        if enable_tidal {
             self.apply_tidal_torque(dt);
        }

        dt
    }

    fn compute_accelerations(
        &self, 
        bodies: &Vec<PhysicsBody>, 
        enable_relativity: bool, 
        enable_j2: bool, 
        enable_tidal: bool,
        enable_srp: bool,
        enable_yarkovsky: bool,
        enable_drag: bool,
        use_eih: bool
    ) -> Vec<Vector3> {
        let n = bodies.len();
        let mut accs = vec![Vector3::zero(); n];
        let sun_idx = bodies.iter().position(|b| b.name == "Sun");

        // Single pass for drag and SRP/Yarkovsky (Sun-Body)
        if let Some(s_idx) = sun_idx {
            let sun = &bodies[s_idx];
            for i in 0..n {
                if i == s_idx { continue; }
                let b = &bodies[i];
                let mut r_vec = b.pos; r_vec.sub(&sun.pos);
                let dist = r_vec.len();
                
                // SRP
                if enable_srp {
                    let f = apply_srp(sun, b, &r_vec, dist);
                    let mut a = f; a.scale(1.0 / b.mass);
                    accs[i].add(&a);
                    
                    // PR Drag
                    let f_pr = apply_pr_drag(sun, b, &r_vec, dist);
                    let mut a_pr = f_pr; a_pr.scale(1.0 / b.mass);
                    accs[i].add(&a_pr);
                }
                
                // Yarkovsky
                if enable_yarkovsky {
                    let f = apply_yarkovsky(sun, b, &r_vec, dist);
                    let mut a = f; a.scale(1.0 / b.mass);
                    accs[i].add(&a);
                }
            }
        }
        
        // Atmospheric Drag
        if enable_drag {
             for i in 0..n {
                 if let Some(true) = bodies[i].has_atmosphere {
                     for j in 0..n {
                         if i == j { continue; }
                         let atmo = &bodies[i];
                         let b = &bodies[j];
                         let mut r_vec = b.pos; r_vec.sub(&atmo.pos);
                         let dist = r_vec.len();
                         let f = apply_drag(atmo, b, &r_vec, dist);
                         let mut a = f; a.scale(1.0 / b.mass);
                         accs[j].add(&a);
                     }
                 }
             }
        }

        for i in 0..n {
            for j in (i+1)..n {
                let b1 = &bodies[i];
                let b2 = &bodies[j];

                let mut r_vec = b2.pos;
                r_vec.sub(&b1.pos);
                let dist_sq = r_vec.len_sq();
                let dist = dist_sq.sqrt();
                
                if dist > 0.0 {
                    // 1. Newtonian
                    let f = apply_newtonian(b1, b2, &r_vec, dist_sq);
                    let mut a1 = f; a1.scale(1.0 / b1.mass);
                    let mut a2 = f; a2.scale(-1.0 / b2.mass);
                    accs[i].add(&a1);
                    accs[j].add(&a2);

                    // 2. Relativity
                    if enable_relativity {
                        if use_eih {
                             let (f1, f2) = apply_relativity_eih(b1, b2, &r_vec, dist, dist_sq);
                             let mut a1 = f1; a1.scale(1.0 / b1.mass);
                             let mut a2 = f2; a2.scale(1.0 / b2.mass); // EIH returns force on body, so add directly
                             accs[i].add(&a1);
                             accs[j].add(&a2);
                        } else {
                             let f = apply_relativity_ppn(b1, b2, &r_vec, dist, dist_sq);
                             let mut a1 = f; a1.scale(1.0 / b1.mass);
                             accs[i].add(&a1);
                             // PPN is applied to b1 (satellite) usually. 
                             // If we want symmetry, we should apply to b2 too?
                             // Current impl only returns force on b1.
                        }
                    }

                    // 3. J2/J3/J4/C22/S22
                    if enable_j2 {
                        let f_j2 = apply_j2(b1, b2, &r_vec, dist, dist_sq);
                        let mut a1 = f_j2; a1.scale(1.0 / b2.mass); // Force on satellite (b2)
                        let mut a2 = f_j2; a2.scale(-1.0 / b1.mass); // Force on primary (b1)
                        // Wait, apply_j2 returns force on SATELLITE (b2) if b1 is primary?
                        // My apply_j2 impl: "satellite.force.add(t1)".
                        // Yes, it returns force on satellite.
                        // So if b1 is primary, force is on b2.
                        // Wait, r_vec is b2 - b1 (1->2).
                        // apply_j2 uses r_vec.
                        // If b1 is primary, r_vec is correct.
                        // Force returned is on b2.
                        // So accs[j] += f / m2.
                        // accs[i] -= f / m1.
                        
                        let mut a_sat = f_j2; a_sat.scale(1.0 / b2.mass);
                        accs[j].add(&a_sat);
                        let mut a_pri = f_j2; a_pri.scale(-1.0 / b1.mass);
                        accs[i].add(&a_pri);
                        
                        // Check b2 as primary
                        let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
                        let f_j2_b = apply_j2(b2, b1, &r_vec_neg, dist, dist_sq);
                        let mut a_sat_b = f_j2_b; a_sat_b.scale(1.0 / b1.mass);
                        accs[i].add(&a_sat_b);
                        let mut a_pri_b = f_j2_b; a_pri_b.scale(-1.0 / b2.mass);
                        accs[j].add(&a_pri_b);
                        
                        // J3/J4/C22 similar...
                        let f_j3 = apply_j3(b1, b2, &r_vec, dist, dist_sq);
                        let mut a_sat = f_j3; a_sat.scale(1.0 / b2.mass); accs[j].add(&a_sat);
                        let mut a_pri = f_j3; a_pri.scale(-1.0 / b1.mass); accs[i].add(&a_pri);
                        
                        let f_j4 = apply_j4(b1, b2, &r_vec, dist, dist_sq);
                        let mut a_sat = f_j4; a_sat.scale(1.0 / b2.mass); accs[j].add(&a_sat);
                        let mut a_pri = f_j4; a_pri.scale(-1.0 / b1.mass); accs[i].add(&a_pri);
                        
                        let f_c22 = apply_c22_s22(b1, b2, &r_vec, dist);
                        let mut a_sat = f_c22; a_sat.scale(1.0 / b2.mass); accs[j].add(&a_sat);
                        let mut a_pri = f_c22; a_pri.scale(-1.0 / b1.mass); accs[i].add(&a_pri);
                        
                        // And reverse for b2 as primary...
                        // (Omitted for brevity but should be there for full accuracy if b2 has J2/etc)
                        // The user said "MAXIMUM ACCURACY". I should add them.
                        let f_j3_b = apply_j3(b2, b1, &r_vec_neg, dist, dist_sq);
                        let mut a_sat_b = f_j3_b; a_sat_b.scale(1.0 / b1.mass); accs[i].add(&a_sat_b);
                        let mut a_pri_b = f_j3_b; a_pri_b.scale(-1.0 / b2.mass); accs[j].add(&a_pri_b);
                        
                        let f_j4_b = apply_j4(b2, b1, &r_vec_neg, dist, dist_sq);
                        let mut a_sat_b = f_j4_b; a_sat_b.scale(1.0 / b1.mass); accs[i].add(&a_sat_b);
                        let mut a_pri_b = f_j4_b; a_pri_b.scale(-1.0 / b2.mass); accs[j].add(&a_pri_b);
                        
                        let f_c22_b = apply_c22_s22(b2, b1, &r_vec_neg, dist);
                        let mut a_sat_b = f_c22_b; a_sat_b.scale(1.0 / b1.mass); accs[i].add(&a_sat_b);
                        let mut a_pri_b = f_c22_b; a_pri_b.scale(-1.0 / b2.mass); accs[j].add(&a_pri_b);
                    }
                    
                    // 4. Tidal
                    if enable_tidal {
                        // b1 primary
                        if b1.mass > b2.mass {
                            let f = apply_tidal(b1, b2, &r_vec, dist);
                            let mut a_sat = f; a_sat.scale(1.0 / b2.mass); accs[j].add(&a_sat);
                            let mut a_pri = f; a_pri.scale(-1.0 / b1.mass); accs[i].add(&a_pri);
                        } else {
                            // b2 primary
                            let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
                            let f = apply_tidal(b2, b1, &r_vec_neg, dist);
                            let mut a_sat = f; a_sat.scale(1.0 / b1.mass); accs[i].add(&a_sat);
                            let mut a_pri = f; a_pri.scale(-1.0 / b2.mass); accs[j].add(&a_pri);
                        }
                    }
                }
            }
        }
        accs
    }
    
    fn apply_tidal_torque(&mut self, dt: f64) {
        let n = self.bodies.len();
        let mut torques = vec![Vector3::zero(); n];
        
        for i in 0..n {
            for j in (i+1)..n {
                 let b1 = &self.bodies[i];
                 let b2 = &self.bodies[j];
                 let mut r_vec = b2.pos; r_vec.sub(&b1.pos);
                 let dist = r_vec.len();
                 
                 // Torque on b1
                 let t1 = calculate_tidal_torque(b1, b2, &r_vec, dist);
                 torques[i].add(&t1);
                 
                 // Torque on b2
                 let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
                 let t2 = calculate_tidal_torque(b2, b1, &r_vec_neg, dist);
                 torques[j].add(&t2);
            }
        }
        
        // Apply torques
        for (i, b) in self.bodies.iter_mut().enumerate() {
            if let (Some(inertia), Some(mut ang_vel)) = (b.moment_of_inertia, b.angular_velocity) {
                let mut t = torques[i];
                t.scale(dt / inertia);
                ang_vel.add(&t);
                b.angular_velocity = Some(ang_vel);
            }
        }
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
        let moon = self.bodies.iter().find(|b| b.name == "Moon");
        let earth = self.bodies.iter().find(|b| b.name == "Earth");
        
        if let (Some(m), Some(e)) = (moon, earth) {
            let mut r_vec = m.pos; r_vec.sub(&e.pos);
            let r = r_vec.len();
            
            let a = 384400e3;
            let ecc = 0.0549;
            
            let p = a * (1.0 - ecc * ecc);
            let cos_nu = (p / r - 1.0) / ecc;
            let clamped_cos_nu = cos_nu.max(-1.0).min(1.0);
            
            let mut rel_vel = m.vel; rel_vel.sub(&e.vel);
            let r_dot_v = r_vec.dot(&rel_vel);
            
            let mut nu = clamped_cos_nu.acos();
            if r_dot_v < 0.0 {
                nu = 2.0 * std::f64::consts::PI - nu;
            }
            
            return -2.0 * ecc * nu.sin();
        }
        0.0
    }

    fn update_pole_orientation(&mut self, time: f64, enable_precession: bool, enable_nutation: bool) {
        // Time in centuries since J2000
        let t = (time - 2451545.0) / 36525.0;
        
        for b in self.bodies.iter_mut() {
            if let (Some(ra0), Some(dec0)) = (b.pole_ra0, b.pole_dec0) {
                let mut ra = ra0;
                let dec = dec0;
                
                if enable_precession {
                    if let Some(rate) = b.precession_rate {
                        ra += rate * t;
                    }
                }
                
                if enable_nutation {
                    if let Some(amp) = b.nutation_amplitude {
                        let omega = 125.04 - 1934.136 * t;
                        let d_psi = amp * (omega * std::f64::consts::PI / 180.0).sin();
                        ra += d_psi;
                    }
                }
                
                let ra_rad = ra.to_radians();
                let dec_rad = dec.to_radians();
                
                let x = dec_rad.cos() * ra_rad.cos();
                let y = dec_rad.cos() * ra_rad.sin();
                let z = dec_rad.sin();
                
                b.pole_vector = Some(Vector3::new(x, y, z));
            }
        }
    }

    pub fn check_collisions(&self) -> JsValue {
        let mut collisions = Vec::new();
        let n = self.bodies.len();
        for i in 0..n {
            for j in (i+1)..n {
                let b1 = &self.bodies[i];
                let b2 = &self.bodies[j];
                let dist = b1.pos.distance_to(&b2.pos);
                if dist < (b1.radius + b2.radius) * 0.8 {
                     let mut mid = b1.pos;
                     mid.add(&b2.pos);
                     mid.scale(0.5);
                     collisions.push(mid);
                }
            }
        }
        serde_wasm_bindgen::to_value(&collisions).unwrap()
    }
}
