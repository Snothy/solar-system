pub mod gravity;
pub mod relativity;
pub mod tidal;
pub mod solar;
pub mod drag;
pub mod comet;

use crate::common::types::{Vector3, PhysicsBody};
use crate::common::constants::G;

use self::gravity::{apply_newtonian, apply_j2, apply_j3, apply_j4, apply_c22_s22};
use self::relativity::{apply_relativity_ppn, apply_relativity_eih};
use self::tidal::apply_tidal;
use self::solar::{apply_srp, apply_pr_drag, apply_yarkovsky};
use self::drag::apply_drag;
use self::comet::apply_cometary_forces;

pub fn calculate_accelerations(
    bodies: &Vec<PhysicsBody>, 
    parent_indices: &Vec<Option<usize>>,
    enable_relativity: bool, 
    enable_j2: bool, 
    enable_tidal: bool,
    enable_srp: bool,
    enable_yarkovsky: bool,
    enable_drag: bool,
    use_eih: bool,
    enable_pr_drag: bool,
    enable_comet_forces: bool,
    include_sun_gravity: bool,
    subtract_parent_gravity: bool
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
            
            // Newtonian Gravity from Sun (Optional)
            if include_sun_gravity {
               // Check if Sun is the parent and we should subtract it
               let is_sun_parent = if let Some(p_idx) = parent_indices[i] { p_idx == s_idx } else { false };
               
               if !subtract_parent_gravity {
                   // Standard case: Full gravity
                   let dist_sq = dist * dist;
                   let f = apply_newtonian(sun, b, &r_vec, dist_sq);
                   
                   // Fix: Gravity is attractive!
                   let mut a = f; a.scale(-1.0 / b.mass);
                   accs[i].add(&a);
                   
                   let mut a_sun = f; a_sun.scale(1.0 / sun.mass);
                   accs[s_idx].add(&a_sun);
               } else if !is_sun_parent {
                   // Wisdom-Holman case:
                   // If Sun is NOT the direct parent (e.g. Moon, where parent is Earth),
                   // we must apply the TIDAL force (Sun->Moon - Sun->Earth).
                   // Because the Earth's motion around Sun is already handled by the drift of the Earth.
                   
                   let dist_sq = dist * dist;
                   let f_sun_body = apply_newtonian(sun, b, &r_vec, dist_sq);
                   let mut a_sun_body = f_sun_body; a_sun_body.scale(-1.0 / b.mass); // Accel of Body due to Sun
                   
                   // Calculate Accel of Parent due to Sun
                   let mut a_sun_parent = Vector3::zero();
                   if let Some(p_idx) = parent_indices[i] {
                       let parent = &bodies[p_idx];
                       let mut r_p = parent.pos; r_p.sub(&sun.pos);
                       let dist_p_sq = r_p.len_sq();
                       let f_sun_parent = apply_newtonian(sun, parent, &r_p, dist_p_sq);
                       a_sun_parent = f_sun_parent; a_sun_parent.scale(-1.0 / parent.mass);
                   }
                   
                   // Apply Difference (Tidal Acceleration) to Body
                   // a_final = a_sun_body - a_sun_parent
                   let mut a_tidal = a_sun_body;
                   a_tidal.sub(&a_sun_parent);
                   
                   accs[i].add(&a_tidal);
               }
               // If is_sun_parent is true (e.g. Earth), we skip entirely (handled by Drift).
            } else {
                // WH Mode (include_sun_gravity = false)
                // We still need to apply the REACTION force on the Sun from the planet!
                // Even though the planet's motion is handled by drift, the Sun must feel the planet's pull
                // to conserve momentum and allow the Sun to wobble.
                
                // Force on Sun due to Body i: F = G * M * m / r^2
                // Direction: Towards Body i. (r_vec points from Sun to Body)
                let dist_sq = dist * dist;
                let f_mag = (G * sun.mass * b.mass) / dist_sq;
                let mut f_on_sun = r_vec; 
                f_on_sun.normalize();
                f_on_sun.scale(f_mag);
                
                let mut a_sun = f_on_sun; a_sun.scale(1.0 / sun.mass);
                accs[s_idx].add(&a_sun);
            }

            // SRP
            if enable_srp {
                let f = apply_srp(sun, b, &r_vec, dist);
                let mut a = f; a.scale(1.0 / b.mass);
                accs[i].add(&a);
            }

            // PR Drag
            if enable_pr_drag {
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

            // Cometary Forces
            if enable_comet_forces {
                let f = apply_cometary_forces(sun, b, &r_vec, dist);
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
                // If one of them is Sun, we might skip if include_sun_gravity is false
                // But wait, we handled Sun gravity in the loop above ONLY if include_sun_gravity is true.
                // If include_sun_gravity is true, we handled it.
                // So here we should SKIP if one is Sun.
                
                let is_sun_interaction = sun_idx.is_some() && (i == sun_idx.unwrap() || j == sun_idx.unwrap());
                
                if !is_sun_interaction {
                     // Check parent-child relationship for subtraction
                     let mut skip_newtonian = false;
                     if subtract_parent_gravity {
                         // ONLY skip if they have a DIRECT parent-child relationship
                         // i.e., one is the IMMEDIATE parent of the other
                         // Do NOT skip sibling moons (they both have same parent)
                         let i_is_parent_of_j = parent_indices[j] == Some(i);
                         let j_is_parent_of_i = parent_indices[i] == Some(j);
                         
                         skip_newtonian = i_is_parent_of_j || j_is_parent_of_i;
                     }
                     
                     if !skip_newtonian {
                         let f = apply_newtonian(b1, b2, &r_vec, dist_sq);
                         let mut a1 = f; a1.scale(1.0 / b1.mass);
                         let mut a2 = f; a2.scale(-1.0 / b2.mass);
                         accs[i].add(&a1);
                         accs[j].add(&a2);
                     }
                }

                // 2. Relativity
                if enable_relativity {
                    if use_eih {
                         let (f1, f2) = apply_relativity_eih(b1, b2, &r_vec, dist, dist_sq);
                         let mut a1 = f1; a1.scale(1.0 / b1.mass);
                         let mut a2 = f2; a2.scale(1.0 / b2.mass);
                         accs[i].add(&a1);
                         accs[j].add(&a2);
                    } else {
                         // PPN is now symmetric
                         let (f1, f2) = apply_relativity_ppn(b1, b2, &r_vec, dist, dist_sq);
                         let mut a1 = f1; a1.scale(1.0 / b1.mass);
                         let mut a2 = f2; a2.scale(1.0 / b2.mass);
                         accs[i].add(&a1);
                         accs[j].add(&a2);
                    }
                }

                // 3. J2/J3/J4/C22/S22
                if enable_j2 {
                    let f_j2 = apply_j2(b1, b2, &r_vec, dist, dist_sq);
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
