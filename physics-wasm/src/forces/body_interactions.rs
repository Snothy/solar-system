use crate::common::types::{PhysicsBody, Vector3};
use crate::common::rotation::{calculate_earth_rotation_angle, calculate_body_rotation_angle};
use crate::forces::{ForceConfig, GravityMode};
use crate::forces::gravity::{apply_newtonian, apply_zonal_harmonics, apply_sectorial_harmonics};
use crate::forces::relativity::{apply_relativity_eih, apply_relativity_ppn};
use crate::forces::tidal::apply_tidal;
use crate::forces::drag::apply_drag;

pub fn apply_body_interactions(
    bodies: &[PhysicsBody],
    accs: &mut [Vector3],
    config: &ForceConfig,
    sun_idx: Option<usize>,
    current_jd: f64,
) {
    let n = bodies.len();
    
    let enable_drag = config.physics.atmospheric_drag;
    let enable_relativity = config.physics.relativity;
    let enable_j2 = config.physics.gravitational_harmonics;
    let enable_tidal = config.physics.tidal_forces;
    let use_eih = config.physics.use_eih;
    
    let gravity_mode = config.gravity_mode;
    let parent_indices = &config.parent_indices;

    // --- Optimization: Pre-calculate Rotation Angles ---
    // Avoids calculating Earth GMST N^2 times
    let mut rotation_angles = vec![0.0; n];
    if enable_j2 {
        for (i, body) in bodies.iter().enumerate() {
            rotation_angles[i] = if body.name == "Earth" {
                calculate_earth_rotation_angle(current_jd)
            } else if let Some(precession) = &body.precession {
                if let (Some(w0), Some(wdot)) = (precession.w0, precession.wdot) {
                    calculate_body_rotation_angle(current_jd, w0, wdot)
                } else {
                    0.0
                }
            } else {
                0.0
            };
        }
    }

    // --- Atmospheric Drag ---
    if enable_drag {
         for j in 0..n {
             if let Some(atmosphere) = &bodies[j].atmosphere {
                 if atmosphere.has_atmosphere == Some(true) {
                     for i in 0..n {
                         if i == j { continue; }
                         let mut r_vec = bodies[i].pos; 
                         r_vec.sub(&bodies[j].pos);
                         let dist = r_vec.len();
                         
                         // Optimization: Skip expensive drag calculation if far outside atmosphere
                         // Assuming 2000km buffer above radius
                         if dist < bodies[j].radius + 2_000_000.0 { 
                            let f = apply_drag(&bodies[j], &bodies[i], &r_vec, dist);
                            let mut a = f; 
                            a.scale(1.0 / bodies[i].mass);
                            accs[i].add(&a);
                         }
                     }
                 }
             }
         }
    }

    // --- Body-Body Interactions ---
    for i in 0..n {
        for j in (i+1)..n {
            let b1 = &bodies[i];
            let b2 = &bodies[j];

            let mut r_vec = b2.pos;
            r_vec.sub(&b1.pos);
            let dist_sq = r_vec.len_sq();
            let dist = dist_sq.sqrt();
            
            if dist > 0.0 {
                let is_sun_interaction = sun_idx.is_some() && (i == sun_idx.unwrap() || j == sun_idx.unwrap());
                
                // Determine if this is a parent-child pair
                let is_parent_child = if let GravityMode::HierarchicalSubtraction = gravity_mode {
                    let i_is_parent_of_j = parent_indices[j].map(|p| p.as_usize()) == Some(i);
                    let j_is_parent_of_i = parent_indices[i].map(|p| p.as_usize()) == Some(j);
                    i_is_parent_of_j || j_is_parent_of_i
                } else {
                    false
                };
                
                // --- Newtonian Gravity ---
                if !is_sun_interaction && !is_parent_child {
                    let f = apply_newtonian(b1, b2, &r_vec, dist_sq);
                    let mut a1 = f; a1.scale(1.0 / b1.mass);
                    let mut a2 = f; a2.scale(-1.0 / b2.mass);
                    accs[i].add(&a1);
                    accs[j].add(&a2);
                }

                // --- Post-Newtonian Relativity ---
                if enable_relativity {
                    let (f1, f2) = if use_eih {
                         apply_relativity_eih(b1, b2, &r_vec, dist, dist_sq)
                    } else {
                         apply_relativity_ppn(b1, b2, &r_vec, dist, dist_sq)
                    };
                    let mut a1 = f1; a1.scale(1.0 / b1.mass);
                    let mut a2 = f2; a2.scale(1.0 / b2.mass);
                    accs[i].add(&a1);
                    accs[j].add(&a2);
                }

                // --- Gravitational Harmonics ---
                if enable_j2 {
                    let rot_b1 = rotation_angles[i];
                    let rot_b2 = rotation_angles[j];
                    
                    // 1. b1 acts on b2
                    let a_zonal = apply_zonal_harmonics(b1, b2, &r_vec, dist, dist_sq);
                    let a_sectorial = apply_sectorial_harmonics(b1, &r_vec, dist_sq, rot_b1);
                    let mut a_total = a_zonal; a_total.add(&a_sectorial);
                    
                    accs[j].add(&a_total);
                    // Reaction
                    let mut a_reaction = a_total; a_reaction.scale(-b2.mass / b1.mass); accs[i].add(&a_reaction);
                    
                    // 2. b2 acts on b1
                    let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
                    let a_zonal_b = apply_zonal_harmonics(b2, b1, &r_vec_neg, dist, dist_sq);
                    let a_sectorial_b = apply_sectorial_harmonics(b2, &r_vec_neg, dist_sq, rot_b2);
                    let mut a_total_b = a_zonal_b; a_total_b.add(&a_sectorial_b);
                    
                    accs[i].add(&a_total_b);
                    // Reaction
                    let mut a_reaction_b = a_total_b; a_reaction_b.scale(-b1.mass / b2.mass); accs[j].add(&a_reaction_b);
                }
                
                // --- Tidal Forces ---
                if enable_tidal {
                    if b1.mass > b2.mass {
                        let f = apply_tidal(b1, b2, &r_vec, dist);
                        let mut a_sat = f; a_sat.scale(1.0 / b2.mass); accs[j].add(&a_sat);
                        let mut a_pri = f; a_pri.scale(-1.0 / b1.mass); accs[i].add(&a_pri);
                    } else {
                        let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
                        let f = apply_tidal(b2, b1, &r_vec_neg, dist);
                        let mut a_sat = f; a_sat.scale(1.0 / b1.mass); accs[i].add(&a_sat);
                        let mut a_pri = f; a_pri.scale(-1.0 / b2.mass); accs[j].add(&a_pri);
                    }
                }
            }
        }
    }
}