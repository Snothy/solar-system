use crate::common::types::PhysicsBody;
use crate::common::indices::{BodyIndex, ParentIndex};

pub fn update_hierarchy(bodies: &Vec<PhysicsBody>) -> Vec<ParentIndex> {
    let n = bodies.len();
    let mut parent_indices = vec![None; n];

    // Dynamic Hierarchy Detection using Sphere of Influence (SOI)
    // 1. Find the most massive body (assumed to be the "Sun" / System Center)
    let mut sun_idx = 0;
    let mut max_mass = 0.0;
    for (i, b) in bodies.iter().enumerate() {
        if b.mass > max_mass {
            max_mass = b.mass;
            sun_idx = i;
        }
    }

    // 2. Determine parent for each body
    for i in 0..n {
        if i == sun_idx {
            continue;
        }

        let body = &bodies[i];
        let mut best_parent = Some(BodyIndex(sun_idx)); // Default to Sun
        let mut min_soi_radius = f64::MAX;

        // Check all potential parents (must be more massive)
        for j in 0..n {
            if i == j {
                continue;
            }
            let potential_parent = &bodies[j];

            // Only consider more massive bodies as parents
            if potential_parent.mass <= body.mass {
                continue;
            }

            // Calculate SOI radius of potential_parent relative to the Sun
            // r_SOI = a * (m / M)^0.4
            // We approximate 'a' as the current distance to Sun
            let r_soi = if j == sun_idx {
                f64::MAX // Sun has infinite SOI effectively
            } else {
                let dist_to_sun = potential_parent.pos.distance_to(&bodies[sun_idx].pos);
                dist_to_sun * (potential_parent.mass / max_mass).powf(0.4)
            };

            // Check if body is within this SOI
            let dist = body.pos.distance_to(&potential_parent.pos);

            if dist < r_soi {
                // If within SOI, this is a candidate.
                // We want the "most local" parent, i.e., the one with the smallest SOI radius
                // (or simply the closest one that satisfies the condition, but smallest SOI is more robust for hierarchy)
                if r_soi < min_soi_radius {
                    min_soi_radius = r_soi;
                    best_parent = Some(BodyIndex(j));
                }
            }
        }

        parent_indices[i] = best_parent;
    }
    parent_indices
}
