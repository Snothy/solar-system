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
    
    // Config Flags
    let enable_drag = config.physics.atmospheric_drag;
    let enable_relativity = config.physics.relativity;
    let enable_j2 = config.physics.gravitational_harmonics;
    let enable_tidal = config.physics.tidal_forces;
    let use_eih = config.physics.use_eih;
    let gravity_mode = config.gravity_mode;
    let parent_indices = &config.parent_indices;

    // --- 1. PRE-CALCULATION PHASE ---
    // Calculate Poles, Angular Velocities, and Rotation Angles for ALL bodies once.
    
    let mut rotation_angles = vec![0.0; n];
    let mut effective_poles = vec![None; n];
    let mut effective_pole_ras = vec![0.0; n];
    let mut effective_pole_decs = vec![std::f64::consts::FRAC_PI_2; n]; // Default 90 deg
    let mut effective_angular_velocities = vec![Vector3::zero(); n];

    // Obliquity of the Ecliptic (J2000) for coordinate transforms
    let epsilon = 23.43928_f64.to_radians();
    let cos_eps = epsilon.cos();
    let sin_eps = epsilon.sin();

    for (i, body) in bodies.iter().enumerate() {
        // A. Calculate Pole Orientation (RA/Dec & Vector)
        let mut calculated_pole = None;
        let mut calculated_ra = 0.0;
        let mut calculated_dec = std::f64::consts::FRAC_PI_2;
        let mut has_dynamic_orientation = false;
        let t_centuries = (current_jd - 2451545.0) / 36525.0;

        if let Some(precession) = &body.precession {
            // Check for dynamic rates first
            if let (Some(ra0), Some(dec0), Some(ra_rate), Some(dec_rate)) = (
                precession.pole_ra0, precession.pole_dec0, 
                precession.pole_ra_rate, precession.pole_dec_rate
            ) { 
                // Rates: degrees/century -> radians/century
                let ra_rate_rad = ra_rate.to_radians();
                let dec_rate_rad = dec_rate.to_radians();

                calculated_ra = ra0 + ra_rate_rad * t_centuries;
                calculated_dec = dec0 + dec_rate_rad * t_centuries;
                has_dynamic_orientation = true;

            } else if let (Some(ra0), Some(dec0)) = (precession.pole_ra0, precession.pole_dec0) {
                // Static orientation
                calculated_ra = ra0;
                calculated_dec = dec0;
                has_dynamic_orientation = true;
            }

            if has_dynamic_orientation {
                // Convert Equatorial (RA/Dec) -> Cartesian (Equatorial)
                let x_eq = calculated_dec.cos() * calculated_ra.cos();
                let y_eq = calculated_dec.cos() * calculated_ra.sin();
                let z_eq = calculated_dec.sin();

                // Rotate Equatorial -> Ecliptic
                let x_ecl = x_eq;
                let y_ecl = y_eq * cos_eps + z_eq * sin_eps;
                let z_ecl = -y_eq * sin_eps + z_eq * cos_eps;

                let mut v = Vector3::new(x_ecl, y_ecl, z_ecl);
                v.normalize();
                calculated_pole = Some(v);
            }
        }

        // Fallback: If no precession data, check if a static pole vector exists in Harmonics
        if calculated_pole.is_none() {
            if let Some(harmonics) = &body.gravity_harmonics {
                if let Some(p) = harmonics.pole_vector {
                    calculated_pole = Some(p);

                    // Reverse Engineer RA/Dec from Ecliptic Pole (needed for Sectorial Harmonics)
                    if !has_dynamic_orientation {
                        // Rotate Ecliptic -> Equatorial (Inverse Rotation)
                        let x_eq = p.x;
                        let y_eq = p.y * cos_eps - p.z * sin_eps; 
                        let z_eq = p.y * sin_eps + p.z * cos_eps;
                        
                        calculated_ra = y_eq.atan2(x_eq);
                        calculated_dec = z_eq.asin();
                    }
                }
            }
        }

        // B. Calculate Angular Velocity Vector (Omega)
        // Omega = PoleVector * (Wdot converted to rad/s)
        let mut w_vec = Vector3::zero();
        
        // 1. Try Wdot from precession
        let wdot_opt = body.precession.as_ref().and_then(|p| p.wdot);
        
        if let (Some(p), Some(wdot)) = (calculated_pole, wdot_opt) {
            let wdot_rad_s = wdot.to_radians() / 86400.0;
            w_vec = p;
            w_vec.scale(wdot_rad_s);
        } else if let Some(rot) = &body.rotation {
            // 2. Fallback to simple angular velocity if defined
            if let Some(av) = rot.angular_velocity {
                w_vec = av;
            }
        }

        // C. Calculate Rotation Angle (W) - Only needed if J2 is enabled
        if enable_j2 {
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

        // Store results
        effective_poles[i] = calculated_pole;
        effective_pole_ras[i] = calculated_ra;
        effective_pole_decs[i] = calculated_dec;
        effective_angular_velocities[i] = w_vec;
    }

    // --- 2. FORCE APPLICATION PHASE ---

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
                         
                         // Simple cutoff to avoid expensive calc for far away bodies
                         let drag_cutoff = bodies[j].equatorial_radius
                            + atmosphere.scale_height.unwrap_or(8_500.0) * 10.0;
                        if dist < drag_cutoff {
                            let a = apply_drag(&bodies[j], &bodies[i], &r_vec, dist);
                            accs[i].add(&a);
                        }
                     }
                 }
             }
         }
    }

    // --- N-Body Interactions ---
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
                
                // Determine if this is a parent-child pair (for hierarchical gravity modes)
                let is_parent_child = if let GravityMode::HierarchicalSubtraction = gravity_mode {
                    let i_is_parent_of_j = parent_indices[j].map(|p| p.as_usize()) == Some(i);
                    let j_is_parent_of_i = parent_indices[i].map(|p| p.as_usize()) == Some(j);
                    i_is_parent_of_j || j_is_parent_of_i
                } else {
                    false
                };
                
                // --- Newtonian Gravity ---
                if !is_sun_interaction && !is_parent_child {
                    let a1 = apply_newtonian(b1, b2, &r_vec, dist_sq);
                    let mut a2 = a1; a2.scale(-b1.gm / b2.gm);
                    accs[i].add(&a1);
                    accs[j].add(&a2);
                }

                // --- Post-Newtonian Relativity ---
                if enable_relativity {
                    let (a1, a2) = if use_eih {
                         apply_relativity_eih(b1, b2, &r_vec, dist, dist_sq)
                    } else {
                         apply_relativity_ppn(b1, b2, &r_vec, dist, dist_sq)
                    };
                    accs[i].add(&a1);
                    accs[j].add(&a2);
                }

                // --- Gravitational Harmonics (J2, J4, etc.) ---
                if enable_j2 {
                    let rot_b1 = rotation_angles[i];
                    let rot_b2 = rotation_angles[j];
                    
                    // 1. b1 acts on b2
                    let a_zonal = apply_zonal_harmonics(b1, b2, &r_vec, dist, dist_sq, effective_poles[i]);
                    let a_sectorial = apply_sectorial_harmonics(b1, &r_vec, dist_sq, rot_b1, effective_pole_ras[i], effective_pole_decs[i]);
                    let mut a_total = a_zonal; a_total.add(&a_sectorial);
                    
                    accs[j].add(&a_total);
                    // Reaction
                    let mut a_reaction = a_total; a_reaction.scale(-b2.gm / b1.gm); accs[i].add(&a_reaction);
                    
                    // 2. b2 acts on b1
                    let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
                    let a_zonal_b = apply_zonal_harmonics(b2, b1, &r_vec_neg, dist, dist_sq, effective_poles[j]);
                    let a_sectorial_b = apply_sectorial_harmonics(b2, &r_vec_neg, dist_sq, rot_b2, effective_pole_ras[j], effective_pole_decs[j]);
                    let mut a_total_b = a_zonal_b; a_total_b.add(&a_sectorial_b);
                    
                    accs[i].add(&a_total_b);
                    // Reaction
                    let mut a_reaction_b = a_total_b; a_reaction_b.scale(-b1.gm / b2.gm); accs[j].add(&a_reaction_b);
                }
                
                // --- Tidal Forces ---
                // Returns the acceleration ON THE PERTURBER due to the tidal bulge of the deforming body.
                if enable_tidal {
                    // 1. b1 is deformed by b2. r_vec points from b1 to b2.
                    //    a_on_b2 = tidal pull on b2 from b1's bulge
                    let a_on_b2 = apply_tidal(b1, b2, &r_vec, dist, effective_angular_velocities[i]);
                    accs[j].add(&a_on_b2);
                    // Newton's 3rd: reaction on b1, scaled by mass ratio
                    let mut a_on_b1_reaction = a_on_b2;
                    a_on_b1_reaction.scale(-b2.gm / b1.gm);
                    accs[i].add(&a_on_b1_reaction);

                    // 2. b2 is deformed by b1. r_vec_neg points from b2 to b1.
                    //    a_on_b1 = tidal pull on b1 from b2's bulge
                    let mut r_vec_neg = r_vec;
                    r_vec_neg.scale(-1.0);
                    let a_on_b1 = apply_tidal(b2, b1, &r_vec_neg, dist, effective_angular_velocities[j]);
                    accs[i].add(&a_on_b1);
                    // Newton's 3rd: reaction on b2, scaled by mass ratio
                    let mut a_on_b2_reaction = a_on_b1;
                    a_on_b2_reaction.scale(-b1.gm / b2.gm);
                    accs[j].add(&a_on_b2_reaction);
                }
            }
        }
    }
}