use crate::common::constants::G;
use crate::common::types::{PhysicsBody, Vector3};
use crate::forces::{ForceConfig, GravityMode};
use crate::forces::gravity::apply_newtonian;
use crate::forces::solar::{apply_pr_drag, apply_srp, apply_yarkovsky};
use crate::forces::comet::apply_cometary_forces;

/// Apply forces related to the Sun (Gravity, SRP, PR Drag, Yarkovsky, Comet).
pub fn apply_sun_interactions(
    bodies: &[PhysicsBody],
    accs: &mut [Vector3],
    config: &ForceConfig,
    sun_idx: usize,
) {
    let sun = &bodies[sun_idx];
    let n = bodies.len();

    let enable_srp = config.physics.solar_radiation_pressure;
    let enable_yarkovsky = config.physics.yarkovsky_effect;
    let enable_pr_drag = config.physics.poynting_robertson_drag;
    let enable_comet = config.physics.comet_forces;
    
    let gravity_mode = config.gravity_mode;
    let parent_indices = &config.parent_indices;

    for i in 0..n {
        if i == sun_idx { continue; }
        let b = &bodies[i];
        let mut r_vec = b.pos; 
        r_vec.sub(&sun.pos);
        let dist = r_vec.len();
        let dist_sq = dist * dist;
        
        // --- Newtonian Gravity from Sun ---
        match gravity_mode {
            GravityMode::FullNBody => {
                // Standard N-body mode: Full gravity (Symplectic, DOP853)
                let f = apply_newtonian(sun, b, &r_vec, dist_sq);
                
                let mut a = f; a.scale(-1.0 / b.mass);
                accs[i].add(&a);
                
                let mut a_sun = f; a_sun.scale(1.0 / sun.mass);
                accs[sun_idx].add(&a_sun);
            }
            
            GravityMode::SplitDriftKick => {
                // SABA4/WH mode: Drift handles Sun's Keplerian term, kick handles perturbations
                // Only apply reaction force on Sun for momentum conservation
                let f_mag = (G * sun.mass * b.mass) / dist_sq;
                let mut f_on_sun = r_vec; 
                f_on_sun.normalize();
                f_on_sun.scale(f_mag);
                
                let mut a_sun = f_on_sun; a_sun.scale(1.0 / sun.mass);
                accs[sun_idx].add(&a_sun);
            }
            
            GravityMode::HierarchicalSubtraction => {
                // WH hierarchical mode: Apply tidal forces for moons
                let is_sun_parent = if let Some(p_idx) = parent_indices[i] { 
                    p_idx.as_usize() == sun_idx 
                } else { 
                    false 
                };
                
                if !is_sun_parent {
                    // Apply TIDAL force (Sun->Body - Sun->Parent) for moons
                    let f_sun_body = apply_newtonian(sun, b, &r_vec, dist_sq);
                    let mut a_sun_body = f_sun_body; a_sun_body.scale(-1.0 / b.mass);
                    
                    // Calculate parent's acceleration due to Sun
                    let mut a_sun_parent = Vector3::zero();
                    if let Some(p_idx) = parent_indices[i] {
                        let parent = &bodies[p_idx.as_usize()];
                        let mut r_p = parent.pos; r_p.sub(&sun.pos);
                        let dist_p_sq = r_p.len_sq();
                        let f_sun_parent = apply_newtonian(sun, parent, &r_p, dist_p_sq);
                        a_sun_parent = f_sun_parent; a_sun_parent.scale(-1.0 / parent.mass);
                    }
                    
                    // Apply tidal acceleration
                    let mut a_tidal = a_sun_body;
                    a_tidal.sub(&a_sun_parent);
                    accs[i].add(&a_tidal);
                }
                // If is_sun_parent (e.g. Earth), skip (handled by Drift operator)
            }
        }

        // --- Solar Radiation Pressure ---
        if enable_srp {
            let f = apply_srp(sun, b, &r_vec, dist);
            let mut a = f; a.scale(1.0 / b.mass);
            accs[i].add(&a);
        }

        // --- Poynting-Robertson Drag ---
        if enable_pr_drag {
            let f_pr = apply_pr_drag(sun, b, &r_vec, dist);
            let mut a_pr = f_pr; a_pr.scale(1.0 / b.mass);
            accs[i].add(&a_pr);
        }
        
        // --- Yarkovsky Effect ---
        if enable_yarkovsky {
            let f = apply_yarkovsky(sun, b, &r_vec, dist);
            let mut a = f; a.scale(1.0 / b.mass);
            accs[i].add(&a);
        }

        // --- Cometary Non-Gravitational Forces ---
        if enable_comet {
            let f = apply_cometary_forces(sun, b, &r_vec, dist);
            let mut a = f; a.scale(1.0 / b.mass);
            accs[i].add(&a);
        }
    }
}
