use physics_wasm::forces::drag::apply_drag;
use physics_wasm::common::types::{PhysicsBody, Vector3};

#[test]
fn test_apply_drag() {
    let mut earth = PhysicsBody::default();
    earth.radius = 6.371e6;
    earth.scale_height = Some(8.5); // km
    earth.surface_pressure = Some(101325.0);
    earth.mean_temperature = Some(288.0);
    earth.vel = Vector3::zero();
    
    let mut sat = PhysicsBody::default();
    sat.pos = Vector3::new(6.371e6 + 10000.0, 0.0, 0.0); // 10km altitude
    sat.vel = Vector3::new(0.0, 7000.0, 0.0); // Moving fast
    sat.drag_coefficient = Some(2.2);
    sat.radius = 1.0;
    
    let mut r_vec = sat.pos; r_vec.sub(&earth.pos);
    let dist = r_vec.len();
    
    let force = apply_drag(&earth, &sat, &r_vec, dist);
    
    // Drag should oppose velocity
    // Velocity is +y, so drag should be -y
    assert!(force.y < 0.0);
    assert_eq!(force.x, 0.0); // Assuming atmosphere is static (earth.vel=0)
    assert_eq!(force.z, 0.0);
}
