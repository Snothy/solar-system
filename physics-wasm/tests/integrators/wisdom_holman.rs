use physics_wasm::integrators::wisdom_holman::step_wisdom_holman;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::constants::G;

#[test]
fn test_step_wisdom_holman() {
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
    
    step_wisdom_holman(
        &mut bodies,
        &parent_indices,
        dt,
        false, false, false, false, false, false, false, false, false
    );
    
    // WH is very stable for Keplerian motion (exact for 2-body if no perturbations?)
    // WH splits H = H_Kepler + H_Interaction.
    // If only 2 bodies, H_Interaction is 0 (if we consider Sun-Earth as Kepler).
    // But WH implementation usually treats Sun-Body as Kepler part.
    // So for 2-body Sun-Earth, Interaction is 0.
    // So it should be exact (within machine precision of Kepler solver).
    
    let r = bodies[1].pos.distance_to(&bodies[0].pos);
    println!("WH r: {}", r);
    assert!((r - 1.496e11).abs() < 100.0); // Radius should be constant for circular orbit
}
