use crate::common::constants::G;
use std::f64::consts::PI;
use crate::common::types::{PhysicsBody, Vector3, MoonParams};

pub fn update_moon_libration(bodies: &mut Vec<PhysicsBody>) {
    // Note: In a high-perf loop, cache these indices instead of searching every frame.
    let moon_idx = bodies.iter().position(|b| b.name == "Moon");
    let earth_idx = bodies.iter().position(|b| b.name == "Earth");

    if let (Some(m_idx), Some(e_idx)) = (moon_idx, earth_idx) {
        
        // 1. Extract Vectors
        let m_pos = bodies[m_idx].pos;
        let e_pos = bodies[e_idx].pos;
        let m_vel = bodies[m_idx].vel;
        let e_vel = bodies[e_idx].vel;
        
        let mu = G * (bodies[e_idx].mass + bodies[m_idx].mass);

        let mut r_vec = m_pos;
        r_vec.sub(&e_pos);
        let r = r_vec.len();

        let mut v_vec = m_vel;
        v_vec.sub(&e_vel);
        let v_sq = v_vec.len_sq();

        // 2. Orbital Elements Calculation
        // Vis-viva equation: v^2/2 - mu/r = -mu/2a
        let energy = v_sq / 2.0 - mu / r;

        // Semi-major axis
        // let a = -mu / (2.0 * energy); 

        // Specific Angular Momentum
        let h_vec = r_vec.cross(&v_vec);
        let h_sq = h_vec.len_sq();

        // Eccentricity vector magnitude derived from energy and angular momentum
        // e = sqrt(1 + 2*Energy*h^2 / mu^2)
        let ecc_term = 1.0 + (2.0 * energy * h_sq) / (mu * mu);
        let ecc = if ecc_term > 0.0 { ecc_term.sqrt() } else { 0.0 };

        // 3. Libration Calculation
        let mut libration = 0.0;

        if ecc > 1e-6 {
            // Semi-latus rectum p = h^2 / mu
            let p = h_sq / mu;
            
            // Solve for True Anomaly (nu)
            // r = p / (1 + e cos nu)  =>  cos nu = (p/r - 1)/e
            let cos_nu = ((p / r) - 1.0) / ecc;
            let clamped_cos_nu = cos_nu.clamp(-1.0, 1.0);

            let mut nu = clamped_cos_nu.acos();
            
            // Check quadrant: if r dot v < 0, the satellite is moving closer to periapsis (or past it?)
            // Actually: r dot v > 0 means flying away from periapsis (0 < nu < PI)
            // r dot v < 0 means flying towards periapsis (PI < nu < 2PI)
            if r_vec.dot(&v_vec) < 0.0 {
                nu = 2.0 * PI - nu;
            }

            // Optical Libration in Longitude approximation: -2 * e * sin(nu)
            libration = -2.0 * ecc * nu.sin();
        }

        // 4. Update Struct
        if let Some(moon_params) = &mut bodies[m_idx].moon {
            moon_params.libration = Some(libration);
        } else {
            bodies[m_idx].moon = Some(MoonParams {
                libration: Some(libration),
            });
        }
    }
}