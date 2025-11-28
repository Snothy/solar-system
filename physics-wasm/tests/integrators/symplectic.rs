use physics_wasm::integrators::symplectic::step_symplectic_4;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::constants::G;

#[test]
fn test_step_symplectic_4() {
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
    let dt = 3600.0; // 1 hour
    
    step_symplectic_4(
        &mut bodies,
        &parent_indices,
        dt,
        false, false, false, false, false, false, false, false, false
    );
    
    // Check that Earth moved
    assert!(bodies[1].pos.x < 1.496e11); // Should move slightly inwards in x due to curvature?
    // Actually, x = r cos(theta). theta increases. cos(theta) < 1. So x decreases.
    assert!(bodies[1].pos.y > 0.0); // Moved in y
    
    // Check energy conservation (roughly)
    let r = bodies[1].pos.distance_to(&bodies[0].pos);
    let v_rel = bodies[1].vel; // Sun vel is small but non-zero
    // Better: calculate relative velocity
    let mut v_rel = bodies[1].vel; v_rel.sub(&bodies[0].vel);
    let v = v_rel.len();
    
    let energy = 0.5 * v * v - G * bodies[0].mass / r;
    let initial_energy = 0.5 * v_circ * v_circ - G * bodies[0].mass / 1.496e11;
    
    // Symplectic should conserve energy well
    assert!((energy - initial_energy).abs() / initial_energy.abs() < 1e-6);
}
