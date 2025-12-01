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

    // --- Optimization: Pre-calculate Rotation Angles & Update Pole Vectors ---
    // Avoids calculating Earth GMST N^2 times
    let mut rotation_angles = vec![0.0; n];
    // We need to update pole vectors if precession is enabled. 
    // Since bodies is immutable, we'll calculate updated poles and store them in a temporary vector.
    // However, apply_zonal_harmonics takes &PhysicsBody. 
    // Ideally, we should update the body state, but here we might need to pass the pole explicitly 
    // or clone/modify. For now, let's calculate the pole and pass it if we can modify the function signature later.
    // BUT, apply_zonal_harmonics reads body.gravity_harmonics.pole_vector.
    // Given the constraints, we will calculate the pole here.
    // Wait, we can't easily modify bodies[i] here as it is a slice.
    // We might need to handle this by calculating the pole on the fly inside the loop or 
    // creating a parallel array of effective poles.
    
    let mut effective_poles = vec![None; n];

    if enable_j2 {
        for (i, body) in bodies.iter().enumerate() {
            // 1. Rotation Angle (W)
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

            // 2. Pole Precession (RA/Dec)
            // 2. Pole Precession (RA/Dec)
            let mut calculated_pole = None;
            
            if let Some(precession) = &body.precession {
                if let (Some(ra0), Some(dec0), Some(ra_rate), Some(dec_rate)) = (
                    precession.pole_ra0, 
                    precession.pole_dec0, 
                    precession.pole_ra_rate, 
                    precession.pole_dec_rate
                ) {
                    // T = Julian centuries since J2000.0
                    let t = (current_jd - 2451545.0) / 36525.0;
                    
                    // Rates are in degrees/century. 
                    // ra0/dec0 are already in radians (converted in loader).
                    // We need to convert rates to radians.
                    let ra_rate_rad = ra_rate.to_radians();
                    let dec_rate_rad = dec_rate.to_radians();

                    let ra = ra0 + ra_rate_rad * t;
                    let dec = dec0 + dec_rate_rad * t;

                    // Convert to Cartesian (Equatorial J2000)
                    let x_eq = dec.cos() * ra.cos();
                    let y_eq = dec.cos() * ra.sin();
                    let z_eq = dec.sin();

                    // Rotate to Ecliptic J2000 (Obliquity = 23.43928 deg)
                    let epsilon = 23.43928_f64.to_radians();
                    let cos_eps = epsilon.cos();
                    let sin_eps = epsilon.sin();

                    let x_ecl = x_eq;
                    let y_ecl = y_eq * cos_eps + z_eq * sin_eps;
                    let z_ecl = -y_eq * sin_eps + z_eq * cos_eps;

                    let mut v = Vector3::new(x_ecl, y_ecl, z_ecl);
                    v.normalize();
                    calculated_pole = Some(v);
                }
            }
            
            // Fallback to static pole if dynamic calculation failed or wasn't applicable
            if calculated_pole.is_none() {
                if let Some(harmonics) = &body.gravity_harmonics {
                    calculated_pole = harmonics.pole_vector;
                }
            }
            
            effective_poles[i] = calculated_pole;
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
                    let a_zonal = apply_zonal_harmonics(b1, b2, &r_vec, dist, dist_sq, effective_poles[i]);
                    let a_sectorial = apply_sectorial_harmonics(b1, &r_vec, dist_sq, rot_b1);
                    let mut a_total = a_zonal; a_total.add(&a_sectorial);
                    
                    accs[j].add(&a_total);
                    // Reaction
                    let mut a_reaction = a_total; a_reaction.scale(-b2.mass / b1.mass); accs[i].add(&a_reaction);
                    
                    // 2. b2 acts on b1
                    let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
                    let a_zonal_b = apply_zonal_harmonics(b2, b1, &r_vec_neg, dist, dist_sq, effective_poles[j]);
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