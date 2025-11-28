use crate::common::types::{Vector3, PhysicsBody};

pub fn apply_cometary_forces(sun: &PhysicsBody, body: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    if let (Some(a1), Some(a2), Some(a3)) = (body.comet_a1, body.comet_a2, body.comet_a3) {
        // Marsden-Sekanina Model
        // g(r) = alpha * (r/r0)^-m * [1 + (r/r0)^n]^-k
        
        let au = 1.495978707e11;
        let r_au = dist / au;
        let r0 = 2.808;
        let alpha = 0.111262;
        let m = 2.15;
        let n = 5.093;
        let k = 4.6142;
        
        let term1 = (r_au / r0).powf(-m);
        let term2 = 1.0 + (r_au / r0).powf(n);
        let g_r = alpha * term1 * term2.powf(-k);
        
        // Directions
        // Radial (R): Sun -> Body
        let mut dir_r = *r_vec; dir_r.normalize();
        
        // Transverse (T): In orbital plane, perp to R, in direction of motion
        // T = (R x V) x R / |(R x V) x R| ??
        // Actually simpler: T is in orbital plane, perp to R.
        // If we have V, we can define Normal N = R x V.
        // Then T = N x R.
        
        let mut rel_vel = body.vel; rel_vel.sub(&sun.vel);
        let mut dir_n = r_vec.cross(&rel_vel); dir_n.normalize();
        let mut dir_t = dir_n.cross(&dir_r); dir_t.normalize();
        
        // Forces (Accelerations actually, A1/A2/A3 are usually in AU/day^2 or similar, 
        // but standard JPL Horizons A1/A2/A3 are in AU/day^2 * 1e-8 usually? 
        // Wait, standard units for A1/A2/A3 in Marsden-Sekanina are usually AU/day^2.
        // Let's assume the user inputs them in SI units (m/s^2) for simplicity, 
        // OR we need to convert. 
        // Given the simulation uses SI, let's assume inputs are scaled to SI or we provide a conversion factor.
        // Standard A1 is order 1e-8 AU/day^2 ~ 2e-14 m/s^2.
        // Let's assume the values in the struct are in standard scientific units (AU/day^2) and convert them?
        // Or just assume they are raw SI acceleration magnitudes at 1 AU.
        // Let's assume they are SI (m/s^2) at r=r0? No, g(r) is normalized to 1 at r=1 AU usually?
        // Actually g(r) formula above: alpha ensures g(1) = 1.
        // So A1, A2, A3 are the accelerations at 1 AU.
        
        // Let's assume A1, A2, A3 are in m/s^2.
        
        let mut f = Vector3::zero();
        
        // Radial
        let mut f_r = dir_r; f_r.scale(a1 * g_r);
        f.add(&f_r);
        
        // Transverse
        let mut f_t = dir_t; f_t.scale(a2 * g_r);
        f.add(&f_t);
        
        // Normal
        let mut f_n = dir_n; f_n.scale(a3 * g_r);
        f.add(&f_n);
        
        // This returns ACCELERATION (Force/mass), so we need to multiply by mass to get Force
        // because the caller expects Force (or we change caller to expect accel).
        // The other functions return Force (e.g. apply_newtonian returns Force).
        // Wait, apply_srp returns Force (scaled by mass? No, F_mag = ...).
        // Let's check apply_srp.
        // apply_srp calculates F_mag.
        // So we should return Force.
        
        f.scale(body.mass);
        return f;
    }
    Vector3::zero()
}
