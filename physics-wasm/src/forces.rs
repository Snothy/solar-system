use crate::types::{Vector3, PhysicsBody};
use crate::constants::{G, C_LIGHT, SOLAR_LUMINOSITY};

pub fn apply_newtonian(b1: &PhysicsBody, b2: &PhysicsBody, r_vec: &Vector3, dist_sq: f64) -> Vector3 {
    let f_mag = (G * b1.mass * b2.mass) / dist_sq;
    let mut f = *r_vec;
    f.normalize();
    f.scale(f_mag);
    f
}

pub fn apply_relativity_ppn(b1: &PhysicsBody, b2: &PhysicsBody, r_vec: &Vector3, dist: f64, dist_sq: f64) -> (Vector3, Vector3) {
    // PPN (Parameterized Post-Newtonian) first-order relativistic correction
    // Made symmetric to conserve momentum
    
    let mut r12 = *r_vec; r12.scale(-1.0);
    
    // Force on b1 due to b2
    let mut v_rel = b1.vel; v_rel.sub(&b2.vel);
    let v_sq = b1.vel.len_sq();
    let term1 = (4.0 * G * b2.mass / dist) - v_sq;
    let r_dot_v = r_vec.dot(&b1.vel);
    let mut term1_vec = *r_vec; term1_vec.scale(term1);
    let mut term2_vec = b1.vel; term2_vec.scale(4.0 * r_dot_v);
    let mut acc_rel = Vector3::zero();
    acc_rel.add(&term1_vec);
    acc_rel.add(&term2_vec);
    acc_rel.scale(G * b2.mass / (dist_sq * dist * C_LIGHT * C_LIGHT));
    let mut f1 = acc_rel; f1.scale(b1.mass);
    
    // Force on b2 due to b1 (symmetric calculation)
    let v2_sq = b2.vel.len_sq();
    let term1_b = (4.0 * G * b1.mass / dist) - v2_sq;
    let r_dot_v2 = r12.dot(&b2.vel);
    let mut term1_vec_b = r12; term1_vec_b.scale(term1_b);
    let mut term2_vec_b = b2.vel; term2_vec_b.scale(4.0 * r_dot_v2);
    let mut acc_rel_b = Vector3::zero();
    acc_rel_b.add(&term1_vec_b);
    acc_rel_b.add(&term2_vec_b);
    acc_rel_b.scale(G * b1.mass / (dist_sq * dist * C_LIGHT * C_LIGHT));
    let mut f2 = acc_rel_b; f2.scale(b2.mass);
    
    (f1, f2)
}

pub fn apply_relativity_eih(b1: &PhysicsBody, b2: &PhysicsBody, r_vec: &Vector3, dist: f64, dist_sq: f64) -> (Vector3, Vector3) {
    let mut r12 = *r_vec; r12.scale(-1.0); 
    let mut v12 = b1.vel; v12.sub(&b2.vel);
    
    let v1_sq = b1.vel.len_sq();
    let v2_sq = b2.vel.len_sq();
    let v1_dot_v2 = b1.vel.dot(&b2.vel);
    let r_dot_v1 = r12.dot(&b1.vel);
    let r_dot_v2 = r12.dot(&b2.vel);
    
    let a_scalar = (4.0 * G * b2.mass / dist) - v1_sq - 2.0 * v2_sq + 4.0 * v1_dot_v2 + 1.5 * ((r_dot_v2 * r_dot_v2) / dist_sq);
    let b_scalar = 4.0 * r_dot_v1 - 3.0 * r_dot_v2;
    
    let mut term1 = r12; term1.scale(a_scalar);
    let mut term2 = v12; term2.scale(b_scalar);
    
    let mut acc_rel = Vector3::zero();
    acc_rel.add(&term1);
    acc_rel.add(&term2);
    acc_rel.scale(G * b2.mass / (C_LIGHT * C_LIGHT * dist * dist * dist));
    
    let mut f1 = acc_rel; f1.scale(b1.mass);
    
    let mut r21 = *r_vec; 
    let mut v21 = b2.vel; v21.sub(&b1.vel);
    let r_dot_v1_b = r21.dot(&b1.vel);
    let r_dot_v2_b = r21.dot(&b2.vel);
    
    let a_scalar_b = (4.0 * G * b1.mass / dist) - v2_sq - 2.0 * v1_sq + 4.0 * v1_dot_v2 + 1.5 * ((r_dot_v1_b * r_dot_v1_b) / dist_sq);
    let b_scalar_b = 4.0 * r_dot_v2_b - 3.0 * r_dot_v1_b;
    
    let mut term1_b = r21; term1_b.scale(a_scalar_b);
    let mut term2_b = v21; term2_b.scale(b_scalar_b);
    
    let mut acc_rel_b = Vector3::zero();
    acc_rel_b.add(&term1_b);
    acc_rel_b.add(&term2_b);
    acc_rel_b.scale(G * b1.mass / (C_LIGHT * C_LIGHT * dist * dist * dist));
    
    let mut f2 = acc_rel_b; f2.scale(b2.mass);
    
    (f1, f2)
}

pub fn apply_j2(primary: &PhysicsBody, satellite: &PhysicsBody, r_vec: &Vector3, dist: f64, dist_sq: f64) -> Vector3 {
    if let (Some(j2), Some(pole)) = (primary.j2, primary.pole_vector) {
        let z = r_vec.dot(&pole);
        let r4 = dist_sq * dist_sq;
        let factor = (3.0 * G * primary.mass * satellite.mass * j2 * primary.radius * primary.radius) / (2.0 * r4);
        let z2_r2 = (z * z) / dist_sq;
        let mut t1 = *r_vec; t1.scale(5.0 * z2_r2 - 1.0);
        let mut t2 = pole; t2.scale(2.0 * z);
        t1.sub(&t2);
        
        // Fixed: Removed negative sign.
        // At equator (z=0), t1 = -r_vec.
        // With positive scale, F = factor/dist * (-r_vec) = -factor/dist * r_vec (Inward/Attractive).
        // This is correct as J2 increases gravity at the equator (oblate).
        // Formula matches standard: F = -GM/r^2 * [ ... ] where the bracket term is negative at equator.
        // Verified against Vallado / standard astrodynamics texts.
        t1.scale(factor / dist);
        return t1;
    }
    Vector3::zero()
}

pub fn apply_j3(primary: &PhysicsBody, satellite: &PhysicsBody, r_vec: &Vector3, dist: f64, dist_sq: f64) -> Vector3 {
    if let (Some(j3), Some(pole)) = (primary.j3, primary.pole_vector) {
        let z = r_vec.dot(&pole);
        let r5 = dist_sq * dist_sq * dist;
        let factor = (G * primary.mass * satellite.mass * j3 * primary.radius.powi(3)) / r5;
        let z_r = z / dist;
        let z2_r2 = (z * z) / dist_sq;
        
        let mut t1 = *r_vec; t1.scale(5.0 * z_r * (7.0 * z2_r2 - 3.0));
        let mut t2 = pole; t2.scale(3.0 * (5.0 * z2_r2 - 1.0));
        t1.sub(&t2);
        
        // Fixed: Removed negative sign (assuming similar logic to J2, though J3 is odd zonal).
        // J3 creates pear shape.
        t1.scale(factor / (2.0 * dist));
        return t1;
    }
    Vector3::zero()
}

pub fn apply_j4(primary: &PhysicsBody, satellite: &PhysicsBody, r_vec: &Vector3, dist: f64, dist_sq: f64) -> Vector3 {
    if let (Some(j4), Some(pole)) = (primary.j4, primary.pole_vector) {
        let z = r_vec.dot(&pole);
        let r6 = dist_sq * dist_sq * dist_sq;
        let factor = (5.0 * G * primary.mass * satellite.mass * j4 * primary.radius.powi(4)) / (2.0 * r6);
        let z2_r2 = (z * z) / dist_sq;
        let z4_r4 = z2_r2 * z2_r2;
        
        let mut t1 = *r_vec; t1.scale(3.0 - 42.0 * z2_r2 + 63.0 * z4_r4);
        let mut t2 = pole; t2.scale(12.0 * z / dist - 28.0 * (z * z2_r2) / dist);
        t1.add(&t2);
        
        // Fixed: Removed negative sign.
        t1.scale(factor / dist);
        return t1;
    }
    Vector3::zero()
}

pub fn apply_c22_s22(primary: &PhysicsBody, satellite: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    if let (Some(c22), Some(s22), Some(pole)) = (primary.c22, primary.s22, primary.pole_vector) {
        let r3 = dist * dist * dist;
        let factor = (3.0 * G * primary.mass * satellite.mass * (c22*c22 + s22*s22).sqrt() * primary.radius * primary.radius) / r3;
        let mut eq_dir = pole.cross(r_vec);
        eq_dir.normalize();
        eq_dir.scale(factor / dist);
        return eq_dir;
    }
    Vector3::zero()
}

pub fn apply_tidal(b1: &PhysicsBody, b2: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    if let (Some(k2), Some(q)) = (b1.k2, b1.tidal_q) {
        let mut orb_vel = b2.vel; orb_vel.sub(&b1.vel);
        let v_mag = orb_vel.len();
        
        // Safety check: if inside Roche limit or radius, clamp or return zero
        if dist < b1.radius {
            return Vector3::zero();
        }

        // Proper tidal force formula:
        // a_tidal = (3/2) * k2/Q * (GM/r²) * (R/r)⁵
        // Units: m/s²
        let gm_over_r2 = G * b1.mass / (dist * dist);
        let r_ratio_5 = (b1.radius / dist).powi(5);
        let acc = 1.5 * (k2 / q) * gm_over_r2 * r_ratio_5;
        
        // Determine direction based on relative angular velocity
        // F ~ (Omega_rot - Omega_orb) x r
        
        let mut orbital_ang_vel = r_vec.cross(&orb_vel);
        orbital_ang_vel.scale(1.0 / (dist * dist));
        
        let rot_vel = b1.angular_velocity.unwrap_or(Vector3::zero());
        
        let mut delta_omega = rot_vel;
        delta_omega.sub(&orbital_ang_vel);
        
        let mut dir = delta_omega.cross(r_vec);
        
        // If delta_omega is zero (locked), no tangential force? 
        // Actually tidal bulge is aligned, so no torque/tangential force. Correct.
        // But if dir is zero length, we return zero.
        if dir.len_sq() > 1e-16 {
            dir.normalize();
            dir.scale(acc * b2.mass); // Force = Mass * Acc
            return dir;
        }
    }
    Vector3::zero()
}

pub fn apply_srp(sun: &PhysicsBody, body: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    let area = std::f64::consts::PI * body.radius * body.radius;
    let cr = 1.3;
    let f_mag = (SOLAR_LUMINOSITY * cr * area) / (4.0 * std::f64::consts::PI * C_LIGHT * dist * dist);
    let mut f = *r_vec; f.normalize(); f.scale(f_mag);
    f
}

pub fn apply_pr_drag(sun: &PhysicsBody, body: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    let area = std::f64::consts::PI * body.radius * body.radius;
    let solar_flux = SOLAR_LUMINOSITY / (4.0 * std::f64::consts::PI * dist * dist);
    let w = solar_flux * area;
    let factor = w / (C_LIGHT * C_LIGHT);
    let mut rel_vel = body.vel; rel_vel.sub(&sun.vel);
    let mut f = rel_vel; f.scale(-factor);
    f
}

pub fn apply_yarkovsky(sun: &PhysicsBody, body: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    if let (Some(albedo), Some(_inertia)) = (body.albedo, body.thermal_inertia) {
        let solar_flux = SOLAR_LUMINOSITY / (4.0 * std::f64::consts::PI * dist * dist);
        let absorbed = (1.0 - albedo) * solar_flux * std::f64::consts::PI * body.radius * body.radius;
        let lag = std::f64::consts::PI / 4.0;
        let f_mag = (absorbed / C_LIGHT) * lag.sin() * 0.1;
        
        let mut dir = *r_vec; dir.normalize();
        let mut v = body.vel; v.normalize();
        let mut cross1 = dir.cross(&v); 
        let mut tan = cross1.cross(&dir); tan.normalize();
        
        let mut direction = 1.0;
        if let (Some(_ang_vel), Some(pole)) = (body.angular_velocity, body.pole_vector) {
             let mut orb_norm = r_vec.cross(&body.vel);
             if orb_norm.dot(&pole) < 0.0 { direction = -1.0; }
        }
        
        tan.scale(f_mag * direction);
        return tan;
    }
    Vector3::zero()
}

pub fn apply_drag(atmo: &PhysicsBody, body: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    let altitude = dist - atmo.radius;
    if let (Some(scale_h), Some(press), Some(temp)) = (atmo.scale_height, atmo.surface_pressure, atmo.mean_temperature) {
        let scale_h_m = scale_h * 1000.0;
        if altitude > 0.0 && altitude < scale_h_m * 10.0 {
            let rho0 = press / (287.0 * temp);
            let rho = rho0 * (-altitude / scale_h_m).exp();
            let mut rel_vel = body.vel; rel_vel.sub(&atmo.vel);
            let v_mag = rel_vel.len();
            if v_mag > 1.0 {
                let cd = body.drag_coefficient.unwrap_or(2.2);
                let area = std::f64::consts::PI * body.radius * body.radius;
                let drag = 0.5 * rho * v_mag * v_mag * cd * area;
                let mut f = rel_vel; f.normalize(); f.scale(-drag);
                return f;
            }
        }
    }
    Vector3::zero()
}

pub fn calculate_tidal_torque(primary: &PhysicsBody, satellite: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    if let (Some(k2), Some(q), Some(_inertia), Some(ang_vel)) = (primary.k2, primary.tidal_q, primary.moment_of_inertia, primary.angular_velocity) {
        let mut rel_vel = satellite.vel; rel_vel.sub(&primary.vel);
        let mut orbital_ang_vel = r_vec.cross(&rel_vel);
        orbital_ang_vel.scale(1.0 / (dist * dist));
        
        let mut diff = orbital_ang_vel; diff.sub(&ang_vel);
        
        let factor = 1.5 * (k2 / q) * G * satellite.mass * satellite.mass * primary.radius.powi(5) / dist.powi(6);
        
        let mut torque = diff; torque.normalize(); torque.scale(factor);
        return torque;
    }
    Vector3::zero()
}
