use physics_wasm::common::rotation::*;

#[test]
fn test_earth_rotation_at_j2000() {
    // At J2000.0, GMST should be approximately 100.46 degrees
    let jd = 2451545.0;
    let angle = calculate_earth_rotation_angle(jd);
    let angle_deg = angle.to_degrees();
    
    // Should be close to 100.46 degrees (within a few degrees due to formula approximation)
    assert!((angle_deg - 100.46).abs() < 5.0, 
            "Expected ~100.46°, got {:.2}°", angle_deg);
}

#[test]
fn test_body_rotation_basic() {
    // Test at J2000: should return W0
    let jd = 2451545.0;
    let w0 = 45.0;
    let wdot = 10.0;
    
    let angle = calculate_body_rotation_angle(jd, w0, wdot);
    let angle_deg = angle.to_degrees();
    
    assert!((angle_deg - 45.0).abs() < 0.001, 
            "At J2000, angle should equal W0");
}

#[test]
fn test_body_rotation_advance() {
    // Test 1 day after J2000: should be W0 + Wdot
    let jd = 2451546.0; // 1 day after J2000
    let w0 = 45.0;
    let wdot = 10.0;
    
    let angle = calculate_body_rotation_angle(jd, w0, wdot);
    let angle_deg = angle.to_degrees();
    
    let expected = (45.0 + 10.0) % 360.0;
    assert!((angle_deg - expected).abs() < 0.001, 
            "After 1 day, angle should be W0 + Wdot");
}

#[test]
fn test_body_rotation_wraps() {
    // Test that angle wraps correctly
    let jd = 2451545.0 + 72.0; // 72 days after J2000
    let w0 = 0.0;
    let wdot = 360.0; // One full rotation per day
    
    let angle = calculate_body_rotation_angle(jd, w0, wdot);
    
    // Should wrap back to near 0 (72 full rotations)
    assert!(angle >= 0.0 && angle < 2.0 * std::f64::consts::PI, 
            "Angle should be normalized to [0, 2π)");
}
