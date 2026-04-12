use crate::common::types::PhysicsBody;
use crate::common::indices::{BodyIndex, ParentIndex};

/// Detects the hierarchy of bodies (Parent-Child relationships) using Spheres of Influence (SOI).
/// 
/// Returns a vector of ParentIndex, where indices correspond to the input `bodies` vector.
pub fn update_hierarchy(bodies: &Vec<PhysicsBody>) -> Vec<ParentIndex> {
    let n = bodies.len();
    if n == 0 {
        return Vec::new();
    }

    let mut parent_indices = vec![None; n];

    // 1. Find the Sun (Most massive body)
    // We assume the most massive body determines the primary frame of reference for SOI calculations.
    let mut sun_idx = 0;
    let mut max_gm = 0.0;
    for (i, b) in bodies.iter().enumerate() {
        if b.gm > max_gm {
            max_gm = b.gm;
            sun_idx = i;
        }
    }

    let sun_pos = bodies[sun_idx].pos;

    // 2. Determine parent for each body
    for i in 0..n {
        // The Sun has no parent in this context
        if i == sun_idx {
            continue;
        }

        let body = &bodies[i];
        let mut best_parent = Some(BodyIndex(sun_idx)); // Default to Sun
        
        // We compare squared radii to avoid expensive SQRT calls in the loop
        let mut min_soi_radius_sq = f64::MAX; 

        for j in 0..n {
            if i == j { continue; }
            
            let parent = &bodies[j];

            // A. Physics Check: Parent must be more massive
            // This prevents smaller bodies from capturing larger ones (e.g., Moon capturing Earth)
            if parent.gm <= body.gm {
                continue;
            }

            // B. Calculate SOI Radius (Squared) relative to the Sun
            // Laplace Sphere of Influence: r = a * (m/M)^0.4
            // Squared version: r^2 = a^2 * (m/M)^0.8
            let r_soi_sq = if j == sun_idx {
                f64::MAX // Sun has effectively infinite SOI
            } else {
                // Distance from Parent to Sun (squared)
                let dx = parent.pos.x - sun_pos.x;
                let dy = parent.pos.y - sun_pos.y;
                let dz = parent.pos.z - sun_pos.z;
                let dist_to_sun_sq = dx*dx + dy*dy + dz*dz;
                
                let gm_ratio = parent.gm / max_gm;
                dist_to_sun_sq * gm_ratio.powf(0.8)
            };

            // C. Geometry Check: Is body inside this SOI?
            // Calculate distance between Body and Potential Parent (squared)
            let dx = body.pos.x - parent.pos.x;
            let dy = body.pos.y - parent.pos.y;
            let dz = body.pos.z - parent.pos.z;
            let dist_to_parent_sq = dx*dx + dy*dy + dz*dz;

            if dist_to_parent_sq < r_soi_sq {
                // If this SOI is "tighter" (smaller) than the previous best, 
                // it is a more local parent (e.g., Earth is more local than Sun for the Moon)
                if r_soi_sq < min_soi_radius_sq {
                    min_soi_radius_sq = r_soi_sq;
                    best_parent = Some(BodyIndex(j));
                }
            }
        }

        parent_indices[i] = best_parent;
    }

    parent_indices
}