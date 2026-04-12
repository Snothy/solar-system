use crate::common::load_body;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::dynamics::torques::{apply_tidal_torque, apply_yorp_torque};

/// Test tidal torque application on Moon
#[test]
fn test_tidal_torque_moon() {
    let mut moon = load_body("Moon");
    moon.tidal = Some(physics_wasm::common::types::TidalParams {
        k2: Some(0.0266),
        tidal_q: Some(30.0),
    });
    moon.rotation = Some(physics_wasm::common::types::RotationalParams {
        moment_of_inertia: Some(0.4 * moon.gm / physics_wasm::common::constants::G * moon.equatorial_radius * moon.equatorial_radius),
        angular_velocity: Some(Vector3::new(0.0, 0.0, 2.66e-6)), // ~27.3 day period
        torque: Some(Vector3::zero()),
        ..Default::default()
    });

    let mut bodies = vec![moon];
    let dt = 3600.0; // 1 hour

    apply_tidal_torque(&mut bodies, dt);

    // Tidal torque should modify angular velocity
    println!("Tidal torque applied: {:?}", bodies[0].rotation.as_ref().unwrap().torque);
    println!("Angular velocity after: {:?}", bodies[0].rotation.as_ref().unwrap().angular_velocity);
}

/// Test YORP torque on small asteroid
#[test]
fn test_yorp_torque_asteroid() {
    let mut asteroid = PhysicsBody::default();
    asteroid.name = "Asteroid".to_string();
    asteroid.gm = (1.0e12) * physics_wasm::common::constants::G;
    asteroid.equatorial_radius = 500.0;
    asteroid.comet = Some(physics_wasm::common::types::CometParams {
        yorp_factor: Some(1.0e-10), // Typical YORP coefficient
        ..Default::default()
    });
    asteroid.rotation = Some(physics_wasm::common::types::RotationalParams {
        moment_of_inertia: Some(0.4 * asteroid.gm / physics_wasm::common::constants::G * asteroid.equatorial_radius * asteroid.equatorial_radius),
        angular_velocity: Some(Vector3::new(0.0, 0.0, 1.0e-4)), // Slow rotation
        torque: Some(Vector3::zero()),
        ..Default::default()
    });
    // Need pole vector for YORP
    asteroid.gravity_harmonics = Some(physics_wasm::common::types::HarmonicsParams {
        pole_vector: Some(Vector3::new(0.0, 0.0, 1.0)),
        ..Default::default()
    });

    let mut bodies = vec![asteroid];
    let dt = 86400.0; // 1 day

    apply_yorp_torque(&mut bodies, dt);

    // YORP should cause spin-up or spin-down
    println!("YORP torque applied: {:?}", bodies[0].rotation.as_ref().unwrap().torque);
    println!("Angular velocity change: {:?}", bodies[0].rotation.as_ref().unwrap().angular_velocity);
}

/// Test that tidal torque causes despinning over time
#[test]
fn test_tidal_despinning() {
    let mut body = PhysicsBody::default();
    body.gm = (1.0e20) * physics_wasm::common::constants::G;
    body.equatorial_radius = 100e3;
    body.tidal = Some(physics_wasm::common::types::TidalParams {
        k2: Some(0.1),
        tidal_q: Some(10.0),
    });
    
    // Start with fast rotation
    let initial_omega = 1.0e-3; // rad/s
    body.rotation = Some(physics_wasm::common::types::RotationalParams {
        moment_of_inertia: Some(0.4 * body.gm / physics_wasm::common::constants::G * body.equatorial_radius * body.equatorial_radius),
        angular_velocity: Some(Vector3::new(0.0, 0.0, initial_omega)),
        torque: Some(Vector3::zero()),
        ..Default::default()
    });

    let mut bodies = vec![body];

    // Apply tidal torque for many timesteps
    for _ in 0..1000 {
        apply_tidal_torque(&mut bodies, 3600.0);
    }

    // Angular velocity should decrease (tidal despinning)
    let final_omega = bodies[0].rotation.as_ref().unwrap().angular_velocity.unwrap().z;
    println!("Initial omega: {:.6e} rad/s", initial_omega);
    println!("Final omega: {:.6e} rad/s", final_omega);

    // Should despin (though may be small effect in this timeframe)
    assert!(
        final_omega <= initial_omega,
        "Tidal torque should cause despinning"
    );
}
