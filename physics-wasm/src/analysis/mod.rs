use crate::common::constants::G;
use crate::common::types::{PhysicsBody, Vector3};

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

        let mut r_vec = m_pos;
        r_vec.sub(&e_pos);
        let r = r_vec.len();

        let mut rel_vel = m_vel;
        rel_vel.sub(&e_vel);
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
            if let Some(moon_params) = &mut bodies[m_idx].moon {
                moon_params.libration = Some(libration);
            } else {
                // Initialize MoonParams if missing (though it should likely exist for the Moon)
                bodies[m_idx].moon = Some(crate::common::types::MoonParams {
                    libration: Some(libration),
                });
            }
        } else {
            if let Some(moon_params) = &mut bodies[m_idx].moon {
                moon_params.libration = Some(0.0);
            } else {
                bodies[m_idx].moon = Some(crate::common::types::MoonParams {
                    libration: Some(0.0),
                });
            }
        }
    }
}
