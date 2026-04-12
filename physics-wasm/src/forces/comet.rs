use crate::common::types::{PhysicsBody, Vector3};

pub fn apply_cometary_forces(
    sun: &PhysicsBody,
    body: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
) -> Vector3 {
    // Check for comet parameters
    if let Some(comet) = &body.comet {
        if let (Some(a1), Some(a2), Some(a3)) = (comet.comet_a1, comet.comet_a2, comet.comet_a3) {
            let au = 1.495978707e11;
            let r_au = dist / au;
            
            // g(r) function from Marsden et al.
            let alpha = 0.111262;
            let r0 = 2.808;
            let m = 2.15;
            let n = 5.093;
            let k = 4.6142;
            
            let term1 = (r_au / r0).powf(-m);
            let term2 = 1.0 + (r_au / r0).powf(n);
            let g_r = alpha * term1 * term2.powf(-k);
            
            // Directions
            // Radial (R): Sun -> Body
            let mut dir_r = *r_vec;
            dir_r.normalize();
            
            // Transverse (T): In orbital plane, perp to R, in direction of motion
            let mut rel_vel = body.vel;
            rel_vel.sub(&sun.vel);
            let mut dir_n = r_vec.cross(&rel_vel);
            dir_n.normalize();
            let mut dir_t = dir_n.cross(&dir_r);
            dir_t.normalize();
            
            let mut f = Vector3::zero();
            
            // Radial
            let mut f_r = dir_r;
            f_r.scale(a1 * g_r);
            f.add(&f_r);
            
            // Transverse
            let mut f_t = dir_t;
            f_t.scale(a2 * g_r);
            f.add(&f_t);
            
            // Normal
            let mut f_n = dir_n;
            f_n.scale(a3 * g_r);
            f.add(&f_n);
            
            // Convert AU/day^2 to m/s^2 if needed, or assume SI.
            // Assuming SI for now as per previous logic.
            
            return f;
        }
    }
    Vector3::zero()
}
