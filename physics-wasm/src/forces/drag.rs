use crate::common::types::{PhysicsBody, Vector3};
use crate::common::constants::G;

pub fn apply_drag(
    atmo_body: &PhysicsBody, 
    sat_body: &PhysicsBody, 
    r_vec: &Vector3, 
    dist: f64
) -> Vector3 {
    let altitude = dist - atmo_body.equatorial_radius;
    
    // 1. Check if the central body actually has an atmosphere
    let atmosphere = match &atmo_body.atmosphere {
        Some(a) if a.has_atmosphere == Some(true) => a,
        _ => return Vector3::zero(),
    };

    let scale_h = atmosphere.scale_height.unwrap_or(8500.0); // Meters
    let pressure = atmosphere.surface_pressure.unwrap_or(101325.0); // Pascals
    let temp = atmosphere.mean_temperature.unwrap_or(288.0); // Kelvin
    
    // Use specific gas constant (R). Default to Earth's air (287.05)
    // For Mars/Venus (CO2), this should be ~188.9
    // TODO: Allow configuring this per body in the future, but for now we can hardcode it or infer it from the atmosphere type if available.
    let gas_constant = 287.05; // Hardcode it back to the Earth value for now

    // 2. Cutoff: Only calculate if within 10 scale heights (Standard atmospheric limit)
    if altitude <= 0.0 || altitude > scale_h * 10.0 {
        return Vector3::zero();
    }

    // 3. Calculate Density (Exponential Model)
    let rho0 = pressure / (gas_constant * temp);
    let rho = rho0 * (-altitude / scale_h).exp();

    // 4. Calculate Relative Velocity (Accounting for Atmospheric Rotation)
    // The atmosphere rotates with the planet: V_atm = V_center + (Omega x r)
    let mut v_rel = sat_body.vel;
    v_rel.sub(&atmo_body.vel);

    // Get the angular velocity vector (calculated in your rotation/precession module)
    // If not available, we assume rotation around the Z-axis for a simple model
    let omega = atmo_body.rotation.as_ref()
        .and_then(|r| r.angular_velocity)
        .unwrap_or(Vector3::new(0.0, 0.0, 7.2921159e-5)); // Earth default rad/s

    let wind_vel = omega.cross(r_vec);
    v_rel.sub(&wind_vel); 

    let v_mag = v_rel.len();
    if v_mag < 0.1 { return Vector3::zero(); }

    // 5. Drag Equation: F = 0.5 * rho * v^2 * Cd * A
    let cd = sat_body.atmosphere.as_ref()
        .and_then(|a| a.drag_coefficient)
        .unwrap_or(2.2);

    // Effective cross-sectional area
    let area = std::f64::consts::PI * sat_body.equatorial_radius.powi(2);
    
    let drag_force_mag = 0.5 * rho * v_mag * v_mag * cd * area;

    // 6. Convert Force to Acceleration: a = F / m
    // Using mass = GM / G
    let sat_mass = sat_body.gm / G;
    if sat_mass < 1e-9 { return Vector3::zero(); }

    let acc_mag = drag_force_mag / sat_mass;

    // Acceleration is in the opposite direction of relative velocity
    let mut acc_vec = v_rel;
    acc_vec.normalize();
    acc_vec.scale(-acc_mag);

    acc_vec
}