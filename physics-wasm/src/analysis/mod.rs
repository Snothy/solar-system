use crate::common::types::{Vector3, PhysicsBody};
use crate::common::constants::G;


pub fn update_moon_libration(bodies: &mut Vec<PhysicsBody>) {
    let moon_idx = bodies.iter().position(|b| b.name == "Moon");
    let earth_idx = bodies.iter().position(|b| b.name == "Earth");
    
    if let (Some(m_idx), Some(e_idx)) = (moon_idx, earth_idx) {
        // Clone values to avoid borrow checker issues
        let m_pos = bodies[m_idx].pos;
        let e_pos = bodies[e_idx].pos;
        let m_vel = bodies[m_idx].vel;
        let e_vel = bodies[e_idx].vel;
        let m_mass = bodies[m_idx].mass;
        let e_mass = bodies[e_idx].mass;
        
        let mut r_vec = m_pos; r_vec.sub(&e_pos);
        let r = r_vec.len();
        
        let mut rel_vel = m_vel; rel_vel.sub(&e_vel);
        let mu = G * (e_mass + m_mass);
        
        let v_sq = rel_vel.len_sq();
        let specific_energy = v_sq / 2.0 - mu / r;
        
        let a = -mu / (2.0 * specific_energy);
        let h_vec = r_vec.cross(&rel_vel);
        let h = h_vec.len();
        
        let ecc_sq = 1.0 + (2.0 * specific_energy * h * h) / (mu * mu);
        let ecc = if ecc_sq > 0.0 { ecc_sq.sqrt() } else { 0.0 };
        
        let p = a * (1.0 - ecc * ecc);
        
        if ecc > 1e-6 {
            let cos_nu = (p / r - 1.0) / ecc;
            let clamped_cos_nu = cos_nu.max(-1.0).min(1.0);
            
            let r_dot_v = r_vec.dot(&rel_vel);
            
            let mut nu = clamped_cos_nu.acos();
            if r_dot_v < 0.0 {
                nu = 2.0 * std::f64::consts::PI - nu;
            }
            
            let libration = -2.0 * ecc * nu.sin();
            bodies[m_idx].libration = Some(libration);
        } else {
            bodies[m_idx].libration = Some(0.0);
        }
    }
}

pub fn resolve_collisions(bodies: &mut Vec<PhysicsBody>) -> Vec<usize> {
    let mut bodies_to_remove = Vec::new();
    let n = bodies.len();
    let mut merged = vec![false; n];
    
    for i in 0..n {
        if merged[i] { continue; }
        for j in (i+1)..n {
            if merged[j] { continue; }
            
            let dist_sq = bodies[i].pos.distance_to(&bodies[j].pos).powi(2);
            let r_sum = bodies[i].radius + bodies[j].radius;
            
            if dist_sq < r_sum * r_sum {
                // Collision! Merge j into i (assuming i is larger or just first)
                // Actually merge smaller into larger
                let (big, small) = if bodies[i].mass >= bodies[j].mass { (i, j) } else { (j, i) };
                
                // Conservation of Momentum
                // V_new = (m1 v1 + m2 v2) / (m1 + m2)
                let m_total = bodies[big].mass + bodies[small].mass;
                
                let mut p1 = bodies[big].vel; p1.scale(bodies[big].mass);
                let mut p2 = bodies[small].vel; p2.scale(bodies[small].mass);
                p1.add(&p2);
                p1.scale(1.0 / m_total);
                bodies[big].vel = p1;
                
                // Center of Mass Position
                let mut pos1 = bodies[big].pos; pos1.scale(bodies[big].mass);
                let mut pos2 = bodies[small].pos; pos2.scale(bodies[small].mass);
                pos1.add(&pos2);
                pos1.scale(1.0 / m_total);
                bodies[big].pos = pos1;
                
                // New Mass
                bodies[big].mass = m_total;
                
                // New Radius (Volume conservation)
                // R^3 = R1^3 + R2^3
                let vol1 = bodies[big].radius.powi(3);
                let vol2 = bodies[small].radius.powi(3);
                bodies[big].radius = (vol1 + vol2).powf(1.0/3.0);
                
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
        for j in (i+1)..n {
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
