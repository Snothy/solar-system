use std::f64::consts::PI;

/// Calculate Earth's rotation angle using GMST (Greenwich Mean Sidereal Time).
///
/// This function computes the rotation of Earth relative to the inertial J2000 frame
/// using the IAU 1982 GMST formula.
///
/// # Arguments
/// * `jd` - Julian Date (JDTDB) in days
///
/// # Returns
/// Rotation angle in radians (the angle between the inertial X-axis and Earth's prime meridian)
pub fn calculate_earth_rotation_angle(jd: f64) -> f64 {
    // 1. Calculate T: Centuries since J2000.0 (JD 2451545.0)
    let t = (jd - 2451545.0) / 36525.0;

    // 2. IAU 1982 GMST formula (returns seconds of time)
    let seconds = 24110.54841 
                + 8640184.812866 * t 
                + 0.093104 * t * t 
                - 0.0000062 * t * t * t;

    // 3. Convert seconds to radians
    // 86400 seconds = 2 * PI radians (one full rotation)
    let fraction_of_day = seconds % 86400.0;
    let radians = fraction_of_day * (2.0 * PI / 86400.0);
    
    radians
}

/// Calculate a celestial body's rotation angle using IAU rotational elements.
///
/// This uses the standard IAU formula: W = W₀ + Ẇ × d
/// where d is the number of days since J2000.0
///
/// # Arguments
/// * `jd` - Julian Date (JDTDB) in days
/// * `w0` - Prime meridian angle at J2000 epoch (degrees)
/// * `wdot` - Rotation rate (degrees/day)
///
/// # Returns
/// Rotation angle in radians
pub fn calculate_body_rotation_angle(jd: f64, w0: f64, wdot: f64) -> f64 {
    // Days since J2000.0
    let d = jd - 2451545.0;
    
    // W = W₀ + Ẇ × d (in degrees)
    let w_deg = w0 + wdot * d;
    
    // Convert to radians and normalize to [0, 2π)
    let w_rad = w_deg.to_radians();
    w_rad.rem_euclid(2.0 * PI)
}


