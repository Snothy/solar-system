use crate::types::{Vector3, PhysicsBody};

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

pub fn update_pole_orientation(bodies: &mut Vec<PhysicsBody>, time: f64, enable_precession: bool, enable_nutation: bool) {
    // Time in centuries since J2000
    let t = (time - 2451545.0) / 36525.0;
    
    for b in bodies.iter_mut() {
        if let (Some(ra0), Some(dec0)) = (b.pole_ra0, b.pole_dec0) {
            let mut ra = ra0;
            let dec = dec0;
            
            if enable_precession {
                if let Some(rate) = b.precession_rate {
                    ra += rate * t;
                }
            }
            
            if enable_nutation {
                if let Some(amp) = b.nutation_amplitude {
                    let omega = 125.04 - 1934.136 * t;
                    let d_psi = amp * (omega * std::f64::consts::PI / 180.0).sin();
                    ra += d_psi;
                }
            }
            
            let ra_rad = ra.to_radians();
            let dec_rad = dec.to_radians();
            
            let x = dec_rad.cos() * ra_rad.cos();
            let y = dec_rad.cos() * ra_rad.sin();
            let z = dec_rad.sin();
            
            b.pole_vector = Some(Vector3::new(x, y, z));
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
