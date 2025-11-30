use crate::common::types::{PhysicsBody, Vector3};
use crate::forces::{ForceConfig, GravityMode};
use crate::forces::gravity::{apply_newtonian, apply_j2, apply_j3, apply_j4, apply_c22_s22};
use crate::forces::relativity::{apply_relativity_eih, apply_relativity_ppn};
use crate::forces::tidal::apply_tidal;
use crate::forces::drag::apply_drag;

/// Apply forces between bodies (Gravity, Harmonics, Relativity, Tidal, Drag).
pub fn apply_body_interactions(
    bodies: &[PhysicsBody],
    accs: &mut [Vector3],
    config: &ForceConfig,
    sun_idx: Option<usize>,
) {
    let n = bodies.len();
    
    let enable_drag = config.physics.atmospheric_drag;
    let enable_relativity = config.physics.relativity;
    let enable_j2 = config.physics.gravitational_harmonics;
    let enable_tidal = config.physics.tidal_forces;
    let use_eih = config.physics.use_eih;
    
    let gravity_mode = config.gravity_mode;
    let parent_indices = &config.parent_indices;

    // --- Atmospheric Drag ---
    if enable_drag {
         for j in 0..n { // j is the body with the atmosphere
             if let Some(atmosphere) = &bodies[j].atmosphere {
                 if atmosphere.has_atmosphere == Some(true) {
                     for i in 0..n { // i is the body experiencing drag
                         if i == j { continue; }
                         let atmo_body = &bodies[j];
                         let dragged_body = &bodies[i];
                         let mut r_vec = dragged_body.pos; r_vec.sub(&atmo_body.pos);
                         let dist = r_vec.len();
                         let f = apply_drag(atmo_body, dragged_body, &r_vec, dist);
                         let mut a = f; a.scale(1.0 / dragged_body.mass);
                         accs[i].add(&a);
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
                
                // Check if this is a parent-child pair that should be skipped
                let skip_parent_child = match gravity_mode {
                    GravityMode::HierarchicalSubtraction => {
                        let i_is_parent_of_j = parent_indices[j].map(|p| p.as_usize()) == Some(i);
                        let j_is_parent_of_i = parent_indices[i].map(|p| p.as_usize()) == Some(j);
                        i_is_parent_of_j || j_is_parent_of_i
                    }
                    _ => false,
                };
                
                // --- Newtonian Gravity (non-Sun pairs) ---
                if !is_sun_interaction && !skip_parent_child {
                    let f = apply_newtonian(b1, b2, &r_vec, dist_sq);
                    let mut a1 = f; a1.scale(1.0 / b1.mass);
                    let mut a2 = f; a2.scale(-1.0 / b2.mass);
                    accs[i].add(&a1);
                    accs[j].add(&a2);
                }

                // --- Post-Newtonian Relativity ---
                // Also skip relativity for parent-child pairs in WH mode
                if enable_relativity && !skip_parent_child {
                    if use_eih {
                         let (f1, f2) = apply_relativity_eih(b1, b2, &r_vec, dist, dist_sq);
                         let mut a1 = f1; a1.scale(1.0 / b1.mass);
                         let mut a2 = f2; a2.scale(1.0 / b2.mass);
                         accs[i].add(&a1);
                         accs[j].add(&a2);
                    } else {
                         let (f1, f2) = apply_relativity_ppn(b1, b2, &r_vec, dist, dist_sq);
                         let mut a1 = f1; a1.scale(1.0 / b1.mass);
                         let mut a2 = f2; a2.scale(1.0 / b2.mass);
                         accs[i].add(&a1);
                         accs[j].add(&a2);
                    }
                }

                // --- Gravitational Harmonics (J2, J3, J4, C22/S22) ---
                // Harmonics are perturbations and must be applied to all pairs, including parent-child
                if enable_j2 {
                    // b1 as primary
                    let f_j2 = apply_j2(b1, b2, &r_vec, dist, dist_sq);
                    let mut a_sat = f_j2; a_sat.scale(1.0 / b2.mass);
                    accs[j].add(&a_sat);
                    let mut a_pri = f_j2; a_pri.scale(-1.0 / b1.mass);
                    accs[i].add(&a_pri);
                    
                    // b2 as primary
                    let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
                    let f_j2_b = apply_j2(b2, b1, &r_vec_neg, dist, dist_sq);
                    let mut a_sat_b = f_j2_b; a_sat_b.scale(1.0 / b1.mass);
                    accs[i].add(&a_sat_b);
                    let mut a_pri_b = f_j2_b; a_pri_b.scale(-1.0 / b2.mass);
                    accs[j].add(&a_pri_b);
                    
                    // J3, J4, C22/S22 (similar pattern)
                    let f_j3 = apply_j3(b1, b2, &r_vec, dist, dist_sq);
                    let mut a_sat = f_j3; a_sat.scale(1.0 / b2.mass); accs[j].add(&a_sat);
                    let mut a_pri = f_j3; a_pri.scale(-1.0 / b1.mass); accs[i].add(&a_pri);
                    
                    let f_j4 = apply_j4(b1, b2, &r_vec, dist, dist_sq);
                    let mut a_sat = f_j4; a_sat.scale(1.0 / b2.mass); accs[j].add(&a_sat);
                    let mut a_pri = f_j4; a_pri.scale(-1.0 / b1.mass); accs[i].add(&a_pri);
                    
                    let f_c22 = apply_c22_s22(b1, b2, &r_vec, dist);
                    let mut a_sat = f_c22; a_sat.scale(1.0 / b2.mass); accs[j].add(&a_sat);
                    let mut a_pri = f_c22; a_pri.scale(-1.0 / b1.mass); accs[i].add(&a_pri);
                    
                    // Reverse for b2 as primary
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
                
                // --- Tidal Forces ---
                // Also skip tidal for parent-child pairs in WH mode
                if enable_tidal && !skip_parent_child {
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
