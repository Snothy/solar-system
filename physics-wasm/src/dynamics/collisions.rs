use crate::common::types::{PhysicsBody, Vector3};

pub fn resolve_collisions(bodies: &mut Vec<PhysicsBody>) -> Vec<usize> {
    let mut bodies_to_remove = Vec::new();
    let n = bodies.len();
    let mut merged = vec![false; n];

    for i in 0..n {
        if merged[i] {
            continue;
        }
        for j in (i + 1)..n {
            if merged[j] {
                continue;
            }

            let dist_sq = bodies[i].pos.distance_to(&bodies[j].pos).powi(2);
            let r_sum = bodies[i].equatorial_radius + bodies[j].equatorial_radius;

            if dist_sq < r_sum * r_sum {
                // Collision! Merge j into i (assuming i is larger or just first)
                // Actually merge smaller into larger
                let mass_i = bodies[i].gm / crate::common::constants::G;
                let mass_j = bodies[j].gm / crate::common::constants::G;
                let (big, small) = if mass_i >= mass_j {
                    (i, j)
                } else {
                    (j, i)
                };

                // Conservation of Momentum
                // V_new = (m1 v1 + m2 v2) / (m1 + m2)
                let m_total = mass_i + mass_j;

                let mut p1 = bodies[big].vel;
                p1.scale(mass_i);
                let mut p2 = bodies[small].vel;
                p2.scale(mass_j);
                p1.add(&p2);
                p1.scale(1.0 / m_total);
                bodies[big].vel = p1;

                // Center of Mass Position
                let mut pos1 = bodies[big].pos;
                pos1.scale(mass_i);
                let mut pos2 = bodies[small].pos;
                pos2.scale(mass_j);
                pos1.add(&pos2);
                pos1.scale(1.0 / m_total);
                bodies[big].pos = pos1;

                // New GM
                bodies[big].gm = m_total * crate::common::constants::G;

                // New Radius (Volume conservation)
                // R^3 = R1^3 + R2^3
                let vol1 = bodies[big].equatorial_radius.powi(3);
                let vol2 = bodies[small].equatorial_radius.powi(3);
                bodies[big].equatorial_radius = (vol1 + vol2).powf(1.0 / 3.0);

                merged[small] = true;
                bodies_to_remove.push(small);
            }
        }
    }

    // Sort descending so we can remove from back without invalidating indices
    bodies_to_remove.sort_by(|a, b| b.cmp(a));
    bodies_to_remove
}

pub fn check_collisions(bodies: &Vec<PhysicsBody>) -> Vec<Vector3> {
    let mut collisions = Vec::new();
    let n = bodies.len();
    for i in 0..n {
        for j in (i + 1)..n {
            let b1 = &bodies[i];
            let b2 = &bodies[j];
            let dist = b1.pos.distance_to(&b2.pos);
            if dist < (b1.equatorial_radius + b2.equatorial_radius) * 0.8 {
                let mut mid = b1.pos;
                mid.add(&b2.pos);
                mid.scale(0.5);
                collisions.push(mid);
            }
        }
    }
    collisions
}
