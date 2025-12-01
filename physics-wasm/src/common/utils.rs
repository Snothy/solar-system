use crate::common::types::{PhysicsBody, Vector3};
use std::f64::consts::PI;

pub fn update_positions(bodies: &mut Vec<PhysicsBody>, dt: f64) {
    for b in bodies.iter_mut() {
        let mut delta_r = b.vel;
        delta_r.scale(dt);
        b.pos.add(&delta_r);
    }
}

pub fn update_velocities(bodies: &mut Vec<PhysicsBody>, accs: &Vec<Vector3>, dt: f64) {
    for (i, b) in bodies.iter_mut().enumerate() {
        let mut delta_v = accs[i];
        delta_v.scale(dt);
        b.vel.add(&delta_v);
    }
}



pub fn update_pole_orientation(
    bodies: &mut Vec<PhysicsBody>,
    time: f64,
    enable_precession: bool,
    enable_nutation: bool,
) {
    // Time in Julian Centuries since J2000
    let t = (time - 2451545.0) / 36525.0;

    // Obliquity of the Ecliptic (J2000)
    // FIX: Added _f64 suffix to resolve ambiguity
    let epsilon_deg = 23.43928_f64; 
    let epsilon_rad = epsilon_deg.to_radians();
    let cos_eps = epsilon_rad.cos();
    let sin_eps = epsilon_rad.sin();

    for b in bodies.iter_mut() {
        if let Some(precession) = &b.precession {
            if let (Some(ra0), Some(dec0)) = (precession.pole_ra0, precession.pole_dec0) {
                
                // FIXED: Convert Degrees to Radians!
                // The raw values from JSON (ra0, dec0) are in Degrees.
                let mut ra_rad = ra0.to_radians(); 
                let dec_rad = dec0.to_radians();

                // 2. Apply Precession
                if enable_precession {
                    if let Some(rate) = precession.precession_rate {
                        // Rate is usually small, assumed to be in compatible units (Radians/Century)
                        ra_rad += rate * t;
                    }
                }

                // 3. Apply Nutation
                if enable_nutation {
                    if let Some(amp) = precession.nutation_amplitude {
                        // Astronomical constants for Omega are usually in DEGREES
                        let omega_deg = 125.04 - 1934.136 * t;
                        let omega_rad = omega_deg.to_radians();
                        
                        // If 'amp' is in Degrees (standard), the result is degrees.
                        // We must convert the result to Radians to add it to 'ra_rad'.
                        let d_psi_deg = amp * omega_rad.sin();
                        ra_rad += d_psi_deg.to_radians();
                    }
                }

                // 4. Calculate Vector in Equatorial Frame (ICRF)
                let x_eq = dec_rad.cos() * ra_rad.cos();
                let y_eq = dec_rad.cos() * ra_rad.sin();
                let z_eq = dec_rad.sin();

                // 5. Rotate to Ecliptic Frame
                // This rotation aligns the Equatorial pole with your Ecliptic simulation.
                let x_ecl = x_eq;
                let y_ecl = y_eq * cos_eps + z_eq * sin_eps;
                let z_ecl = -y_eq * sin_eps + z_eq * cos_eps;

                if let Some(harmonics) = &mut b.gravity_harmonics {
                    harmonics.pole_vector = Some(Vector3::new(x_ecl, y_ecl, z_ecl));
                }
            }
        }
    }
}

pub fn recenter_system(bodies: &mut Vec<PhysicsBody>) {
    let mut total_mass = 0.0;
    let mut center_of_mass = Vector3::zero();
    let mut linear_momentum = Vector3::zero();

    for body in bodies.iter() {
        total_mass += body.mass;

        let mut mass_pos = body.pos;
        mass_pos.scale(body.mass);
        center_of_mass.add(&mass_pos);

        let mut momentum = body.vel;
        momentum.scale(body.mass);
        linear_momentum.add(&momentum);
    }

    if total_mass > 0.0 {
        // center_of_mass.scale(1.0 / total_mass);
        linear_momentum.scale(1.0 / total_mass); // Velocity of COM

        for body in bodies.iter_mut() {
            // Disable position recentering to prevent visual jumps when mass changes
            // body.pos.sub(&center_of_mass);

            // Keep velocity correction to prevent system drift
            body.vel.sub(&linear_momentum);
        }
    }
}
