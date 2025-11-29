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
            let r_sum = bodies[i].radius + bodies[j].radius;

            if dist_sq < r_sum * r_sum {
                // Collision! Merge j into i (assuming i is larger or just first)
                // Actually merge smaller into larger
                let (big, small) = if bodies[i].mass >= bodies[j].mass {
                    (i, j)
                } else {
                    (j, i)
                };

                // Conservation of Momentum
                // V_new = (m1 v1 + m2 v2) / (m1 + m2)
                let m_total = bodies[big].mass + bodies[small].mass;

                let mut p1 = bodies[big].vel;
                p1.scale(bodies[big].mass);
                let mut p2 = bodies[small].vel;
                p2.scale(bodies[small].mass);
                p1.add(&p2);
                p1.scale(1.0 / m_total);
                bodies[big].vel = p1;

                // Center of Mass Position
                let mut pos1 = bodies[big].pos;
                pos1.scale(bodies[big].mass);
                let mut pos2 = bodies[small].pos;
                pos2.scale(bodies[small].mass);
                pos1.add(&pos2);
                pos1.scale(1.0 / m_total);
                bodies[big].pos = pos1;

                // New Mass
                bodies[big].mass = m_total;

                // New Radius (Volume conservation)
                // R^3 = R1^3 + R2^3
                let vol1 = bodies[big].radius.powi(3);
                let vol2 = bodies[small].radius.powi(3);
                bodies[big].radius = (vol1 + vol2).powf(1.0 / 3.0);

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
            if dist < (b1.radius + b2.radius) * 0.8 {
                let mut mid = b1.pos;
                mid.add(&b2.pos);
                mid.scale(0.5);
                collisions.push(mid);
            }
        }
    }
    collisions
}
