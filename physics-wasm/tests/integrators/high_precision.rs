use physics_wasm::integrators::high_precision::step_high_precision;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::constants::G;

#[test]
fn test_step_high_precision() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();
    sun.vel = Vector3::zero();
    
    let mut earth = PhysicsBody::default();
    earth.name = "Earth".to_string();
    earth.mass = 5.972e24;
    earth.pos = Vector3::new(1.496e11, 0.0, 0.0);
    let v_circ = (G * (sun.mass + earth.mass) / 1.496e11).sqrt();
    earth.vel = Vector3::new(0.0, v_circ, 0.0);
    
    let mut bodies = vec![sun, earth];
    let parent_indices = vec![None, Some(0)];
    let dt = 86400.0; // 1 day
    let sim_time = 0.0;
    
    step_high_precision(
        &mut bodies,
        &parent_indices,
        dt,
        sim_time,
        false, false, false, false, false, false, false, false, false
    );
    
    // High precision (DOP853) should be extremely accurate
    let r = bodies[1].pos.distance_to(&bodies[0].pos);
    println!("HP r: {}", r);
    assert!((r - 1.496e11).abs() < 1.0);
}
