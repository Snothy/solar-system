use approx::assert_relative_eq;
use physics_wasm::common::types;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::tidal::apply_tidal;

/// Test tidal forces between Earth and Moon
#[test]
fn test_earth_moon_tidal_force() {
    // Setup Earth-Moon system
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.radius = 6.371e6;
    earth.pos = Vector3::zero();
    earth.vel = Vector3::zero();
    earth.tidal = Some(types::TidalParams {
        k2: Some(0.3),
        tidal_q: Some(12.0),
    });
    earth.rotation = Some(types::RotationalParams {
        angular_velocity: Some(Vector3::new(0.0, 0.0, 7.292e-5)), // Earth rotation
        ..Default::default()
    });

    let mut moon = PhysicsBody::default();
    moon.name = "Moon".to_string();
    moon.mass = 7.348e22;
    moon.radius = 1.737e6;
    moon.pos = Vector3::new(3.844e8, 0.0, 0.0); // 384,400 km distance
    moon.vel = Vector3::new(0.0, 1022.0, 0.0); // Approx orbital velocity

    let mut r_vec = moon.pos;
    r_vec.sub(&earth.pos);
    let dist = r_vec.len();

    let tidal_force = apply_tidal(&earth, &moon, &r_vec, dist);

    // Tidal force should be non-zero
    assert!(tidal_force.len() > 0.0);

    // Tidal force should have a tangential component (dissipative) and radial component
    // For Earth-Moon, Earth spins faster than Moon orbits, so tidal bulge leads Moon.
    // Torque transfers angular momentum to Moon -> Moon accelerates -> Moves outward.
    // Force on Moon should have component in direction of velocity (+Y).

    let mut f_dir = tidal_force;
    f_dir.normalize();
    let mut v_dir = moon.vel;
    v_dir.normalize();

    let dot = f_dir.dot(&v_dir);
    assert!(dot > 0.0, "Tidal force should accelerate Moon (transfer angular momentum)");
}

#[test]
fn test_tidal_force_retrograde() {
    // Jupiter-Io like system but Jupiter spins retrograde (unrealistic but good for test)
    let mut jupiter = PhysicsBody::default();
    jupiter.mass = 1.898e27;
    jupiter.radius = 7.149e7;
    jupiter.tidal = Some(physics_wasm::common::types::TidalParams {
        k2: Some(0.5),
        tidal_q: Some(100.0),
    });
    jupiter.rotation = Some(physics_wasm::common::types::RotationalParams {
        angular_velocity: Some(Vector3::new(0.0, 0.0, -1.76e-4)), // Retrograde spin
        ..Default::default()
    });

    let mut io = PhysicsBody::default();
    io.mass = 8.93e22;
    io.pos = Vector3::new(4.217e8, 0.0, 0.0);
    io.vel = Vector3::new(0.0, 17334.0, 0.0); // Prograde orbit

    let mut r_vec = io.pos;
    r_vec.sub(&jupiter.pos);
    let dist = r_vec.len();

    let force = apply_tidal(&jupiter, &io, &r_vec, dist);

    // Retrograde spin -> bulge lags behind -> drags satellite -> decelerates
    let mut f_dir = force;
    f_dir.normalize();
    let mut v_dir = io.vel;
    v_dir.normalize();

    assert!(f_dir.dot(&v_dir) < 0.0, "Tidal force should decelerate Io for retrograde primary");
}

#[test]
fn test_tidal_force_magnitude_scaling() {
    let mut earth = PhysicsBody::default();
    earth.mass = 5.972e24;
    earth.radius = 6.371e6;
    earth.tidal = Some(physics_wasm::common::types::TidalParams {
        k2: Some(0.3),
        tidal_q: Some(12.0),
    });
    earth.rotation = Some(physics_wasm::common::types::RotationalParams {
        angular_velocity: Some(Vector3::new(0.0, 0.0, 7.292e-5)),
        ..Default::default()
    });

    let mut moon = PhysicsBody::default();
    moon.mass = 7.348e22;
    moon.pos = Vector3::new(3.844e8, 0.0, 0.0);
    moon.vel = Vector3::new(0.0, 1022.0, 0.0);

    let r_vec = moon.pos;
    let dist = r_vec.len();

    let f1 = apply_tidal(&earth, &moon, &r_vec, dist);

    // Increase distance by 2x
    let dist2 = dist * 2.0;
    let mut r_vec2 = r_vec;
    r_vec2.scale(2.0);
    // Adjust velocity for circular orbit at 2x dist (v ~ 1/sqrt(r))
    moon.vel.scale(1.0 / 2.0f64.sqrt());

    let f2 = apply_tidal(&earth, &moon, &r_vec2, dist2);

    // Tidal force falls off as ~ 1/r^7 (Force) or 1/r^8?
    // Formula: F ~ 1/r^7 (Acceleration ~ 1/r^7 * mass? No, Acc ~ 1/r^7)
    // Wait, formula has (R/r)^5 * (1/r^2) = 1/r^7.
    // So f2 should be roughly f1 / 2^7 = f1 / 128.

    let ratio = f1.len() / f2.len();
    assert!(ratio > 100.0, "Tidal force should drop off rapidly with distance (approx 1/r^7)");
}

#[test]
fn test_tidal_q_factor() {
    let mut earth = PhysicsBody::default();
    earth.mass = 5.972e24;
    earth.radius = 6.371e6;
    earth.rotation = Some(physics_wasm::common::types::RotationalParams {
        angular_velocity: Some(Vector3::new(0.0, 0.0, 7.292e-5)),
        ..Default::default()
    });
    
    // Low Q (high dissipation)
    earth.tidal = Some(physics_wasm::common::types::TidalParams {
        k2: Some(0.3),
        tidal_q: Some(1.0),
    });

    let mut moon = PhysicsBody::default();
    moon.mass = 7.348e22;
    moon.pos = Vector3::new(3.844e8, 0.0, 0.0);
    moon.vel = Vector3::new(0.0, 1022.0, 0.0);
    let r_vec = moon.pos;
    let dist = r_vec.len();

    let f_low_q = apply_tidal(&earth, &moon, &r_vec, dist);

    // High Q (low dissipation)
    earth.tidal = Some(physics_wasm::common::types::TidalParams {
        k2: Some(0.3),
        tidal_q: Some(1000.0),
    });
    let f_high_q = apply_tidal(&earth, &moon, &r_vec, dist);

    // Dissipative force is proportional to 1/Q.
    // So low Q -> High Force.
    assert!(f_low_q.len() > f_high_q.len(), "Lower Q should result in stronger tidal dissipation force");
}

#[test]
fn test_tidal_lock_check() {
    // If orbital period == rotation period, tidal bulge is aligned.
    // Dissipative force should be zero (or very close).
    
    let mut earth = PhysicsBody::default();
    earth.mass = 5.972e24;
    earth.radius = 6.371e6;
    earth.tidal = Some(physics_wasm::common::types::TidalParams {
        k2: Some(0.3),
        tidal_q: Some(12.0),
    });

    let mut moon = PhysicsBody::default();
    moon.mass = 7.348e22;
    moon.pos = Vector3::new(3.844e8, 0.0, 0.0);
    moon.vel = Vector3::new(0.0, 1022.0, 0.0);

    let r_vec = moon.pos;
    let dist = r_vec.len();
    
    // Calculate orbital angular velocity: omega = v / r
    let omega_orb = 1022.0 / 3.844e8;
    
    // Set Earth rotation to match orbital angular velocity
    earth.rotation = Some(physics_wasm::common::types::RotationalParams {
        angular_velocity: Some(Vector3::new(0.0, 0.0, omega_orb)),
        ..Default::default()
    });

    let force = apply_tidal(&earth, &moon, &r_vec, dist);

    // Dissipative component should be zero.
    // Conservative component (radial) might still exist.
    // Let's check tangential component.
    
    let mut f_tan = force;
    let mut r_norm = r_vec; r_norm.normalize();
    // Remove radial component
    let radial_mag = f_tan.dot(&r_norm);
    let mut radial_vec = r_norm;
    radial_vec.scale(radial_mag);
    f_tan.sub(&radial_vec);
    
    assert!(f_tan.len() < 1e-10, "Tangential tidal force should be zero when tidally locked");
}
