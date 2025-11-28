use physics_wasm::dynamics::torques::apply_yorp_torque;
use physics_wasm::common::types::{PhysicsBody, Vector3};

#[test]
fn test_apply_yorp_torque() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.pos = Vector3::zero();
    
    let mut asteroid = PhysicsBody::default();
    asteroid.name = "Asteroid".to_string();
    asteroid.pos = Vector3::new(1.0e11, 0.0, 0.0);
    asteroid.yorp_factor = Some(1.0e10);
    asteroid.angular_velocity = Some(Vector3::new(0.0, 0.0, 1.0));
    asteroid.pole_vector = Some(Vector3::new(0.0, 0.0, 1.0));
    
    let mut bodies = vec![sun, asteroid];
    let dt = 100.0;
    
    apply_yorp_torque(&mut bodies, dt);
    
    // d_omega = yorp / r^2 * dt = 1e10 / 1e22 * 100 = 1e-10
    // new omega = 1.0 + 1e-10
    let new_omega = bodies[1].angular_velocity.unwrap().z;
    assert!(new_omega > 1.0);
    assert!((new_omega - (1.0 + 1.0e-10)).abs() < 1e-15);
}
