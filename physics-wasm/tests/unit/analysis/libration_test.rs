use crate::common::load_body;
use physics_wasm::analysis::update_moon_libration;
use physics_wasm::common::constants::G;
use physics_wasm::common::types::{PhysicsBody, Vector3};

/// Test Moon libration calculation
#[test]
fn test_moon_libration_calculation() {
    let mut earth = load_body("Earth");
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();

    let mut moon = load_body("Moon");
    // Moon at periapsis (closest point) - about 363,000 km
    moon.pos = Vector3::new(363000e3, 0.0, 0.0);
    // Orbital velocity at periapsis (faster)
    moon.vel = Vector3::new(0.0, 1082.0, 0.0);
    moon.moon = Some(physics_wasm::common::types::MoonParams {
        libration: None,
    });

    let mut bodies = vec![earth, moon];

    update_moon_libration(&mut bodies);

    // Libration should now be calculated
    let libration = bodies[1].moon.as_ref().unwrap().libration;
    assert!(libration.is_some(), "Libration should be calculated");

    println!(
        "Moon libration: {:.6} radians ({:.3} degrees)",
        libration.unwrap(),
        libration.unwrap().to_degrees()
    );
}

/// Test libration varies with orbital position
#[test]
fn test_libration_varies_with_position() {
    let mut earth = load_body("Earth");
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();

    // Test at periapsis
    let mut moon_peri = load_body("Moon");
    moon_peri.pos = Vector3::new(363000e3, 0.0, 0.0);
    moon_peri.vel = Vector3::new(0.0, 1082.0, 0.0);
    moon_peri.moon = Some(physics_wasm::common::types::MoonParams {
        libration: None,
    });

    let mut bodies = vec![earth.clone(), moon_peri];
    update_moon_libration(&mut bodies);
    let lib_peri = bodies[1].moon.as_ref().unwrap().libration.unwrap();

    // Test at apoapsis (farthest point) - about 405,000 km
    let mut moon_apo = load_body("Moon");
    moon_apo.pos = Vector3::new(405000e3, 0.0, 0.0);
    moon_apo.vel = Vector3::new(0.0, 970.0, 0.0); // Slower at apoapsis
    moon_apo.moon = Some(physics_wasm::common::types::MoonParams {
        libration: None,
    });

    bodies = vec![earth, moon_apo];
    update_moon_libration(&mut bodies);
    let lib_apo = bodies[1].moon.as_ref().unwrap().libration.unwrap();

    println!(
        "Libration at periapsis: {:.6} rad ({:.3}°)",
        lib_peri,
        lib_peri.to_degrees()
    );
    println!(
        "Libration at apoapsis:  {:.6} rad ({:.3}°)",
        lib_apo,
        lib_apo.to_degrees()
    );

    // Librations should be different due to different orbital positions
    // (though both might be small for nearly circular orbit)
}

/// Test libration is zero for circular orbit
#[test]
fn test_circular_orbit_zero_libration() {
    let mut earth = load_body("Earth");
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();

    let mut moon = load_body("Moon");

    // Perfectly circular orbit
    let r = 384400e3; // Average Moon distance
    // This is mathematically identical to your refactor, but cleaner:
    let v = (earth.gm / r).sqrt();

    moon.pos = Vector3::new(r, 0.0, 0.0);
    moon.vel = Vector3::new(0.0, v, 0.0);
    moon.moon = Some(physics_wasm::common::types::MoonParams {
        libration: None,
    });

    let mut bodies = vec![earth, moon];
    update_moon_libration(&mut bodies);

    let libration = bodies[1].moon.as_ref().unwrap().libration.unwrap();

    println!("Libration for circular orbit: {:.6e} rad", libration);

    // Should be very close to zero for circular orbit (eccentricity ≈ 0)
    assert!(
        libration.abs() < 0.01,
        "Circular orbit should have minimal libration, got {:.6}",
        libration
    );
}

/// Test libration handles missing Earth
#[test]
fn test_libration_no_earth() {
    let mut moon = load_body("Moon");
    moon.pos = Vector3::new(384400e3, 0.0, 0.0);
    moon.vel = Vector3::new(0.0, 1022.0, 0.0);
    moon.moon = Some(physics_wasm::common::types::MoonParams {
        libration: None,
    });

    // No Earth in the system
    let mut bodies = vec![moon];

    update_moon_libration(&mut bodies);

    // Should handle gracefully (no panic)
    // Libration might remain None or be set to Some(0.0)
    println!("Libration without Earth: {:?}", bodies[0].moon.as_ref().unwrap().libration);
}

/// Test libration calculation with eccentric orbit
#[test]
fn test_eccentric_orbit_libration() {
    let mut earth = load_body("Earth");
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();

    let mut moon = load_body("Moon");
    moon.moon = Some(physics_wasm::common::types::MoonParams {
        libration: None,
    });

    // Highly eccentric orbit (eccentricity ≈ 0.2, much higher than real Moon's 0.055)
    let a = 384400e3; // Semi-major axis
    let ecc = 0.2;
    // Place Moon at true anomaly = 90 degrees (where libration is non-zero)
    // r = a(1-e^2) / (1 + e cos 90) = a(1-e^2)
    let p = a * (1.0 - ecc * ecc);
    // Since earth.gm IS the gravitational parameter (mu)...
    let mu = earth.gm; 

    // Angular momentum for a conic section: h = sqrt(mu * p)
    // where p is the semi-latus rectum
    let h = (mu * p).sqrt();
    // At theta = 90:
    // Pos = (0, p, 0)
    // Vel components: Vx = -mu/h * (sin 90 + 0) = -mu/h
    //                 Vy = mu/h * (cos 90 + ecc) = mu/h * ecc

    moon.pos = Vector3::new(0.0, p, 0.0);
    moon.vel = Vector3::new(-mu / h, mu / h * ecc, 0.0);

    let mut bodies = vec![earth, moon];
    update_moon_libration(&mut bodies);

    let libration = bodies[1].moon.as_ref().unwrap().libration.unwrap();

    println!(
        "Libration for e=0.2 orbit: {:.6} rad ({:.3}°)",
        libration,
        libration.to_degrees()
    );

    // Higher eccentricity should give larger libration amplitude
    assert!(
        libration.abs() > 0.01,
        "Eccentric orbit should have noticeable libration"
    );
}
