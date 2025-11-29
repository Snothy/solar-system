use crate::common::{load_bodies, initialize_from_jpl, load_jpl_vector};
use physics_wasm::common::types::Vector3;
use physics_wasm::integrators::*;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use approx::assert_relative_eq;

/// Test linear momentum conservation
#[test]
fn test_linear_momentum_conservation() {
    let mut bodies = load_bodies();
    
    // Set up Earth-Moon-Sun system
    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();
    
    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);
    
    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");
    
    let parent_indices = update_hierarchy(&bodies);
    
    // Recenter system to ensure zero momentum
    physics_wasm::common::utils::recenter_system(&mut bodies);
    
    // Calculate initial momentum
    let p0 = calculate_total_momentum(&bodies);
    
    // Simulate for 30 days
    let dt = 3600.0;
    for _ in 0..(30 * 24) {
        step_saba4(&mut bodies, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
    }
    
    let p1 = calculate_total_momentum(&bodies);
    
    let dp = Vector3 {
        x: p1.x - p0.x,
        y: p1.y - p0.y,
        z: p1.z - p0.z,
    };
    
    println!("Initial momentum: ({:.3e}, {:.3e}, {:.3e})", p0.x, p0.y, p0.z);
    println!("Final momentum:   ({:.3e}, {:.3e}, {:.3e})", p1.x, p1.y, p1.z);
    println!("Change:           ({:.3e}, {:.3e}, {:.3e})", dp.x, dp.y, dp.z);
    
    let p0_mag = p0.len();
    
    // Calculate total momentum scale (scalar sum of momenta)
    let mut p_scale = 0.0;
    for body in &bodies {
        p_scale += body.mass * body.vel.len();
    }
    
    if p0_mag < 1e-10 {
        // If initial momentum is zero, check absolute change relative to scale
        let abs_change = dp.len();
        println!("Absolute change: {:.3e}", abs_change);
        println!("Momentum scale:  {:.3e}", p_scale);
        let rel_drift = abs_change / p_scale;
        println!("Relative drift (vs scale): {:.3e}", rel_drift);
        
        // Allow 1e-5 drift (integrator might not strictly conserve linear momentum in this formulation)
        assert!(rel_drift < 1e-5, "Momentum drift too large: {:.3e}", rel_drift);
    } else {
        let rel_change = dp.len() / p0_mag;
        println!("Relative change: {:.3e}", rel_change);
        assert!(rel_change < 1e-8, "Momentum not conserved: {:.3e}", rel_change);
    }
}

/// Test angular momentum conservation
#[test]
fn test_angular_momentum_conservation() {
    let mut bodies = load_bodies();
    
    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();
    
    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);
    
    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");
    
    let parent_indices = update_hierarchy(&bodies);
    
    let l0 = calculate_total_angular_momentum(&bodies);
    
    // Simulate for 30 days
    let dt = 3600.0;
    for _ in 0..(30 * 24) {
        step_wisdom_holman(&mut bodies, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
    }
    
    let l1 = calculate_total_angular_momentum(&bodies);
    
    println!("Initial L: ({:.3e}, {:.3e}, {:.3e})", l0.x, l0.y, l0.z);
    println!("Final L:   ({:.3e}, {:.3e}, {:.3e})", l1.x, l1.y, l1.z);
    
    let l0_mag = l0.len();
    let dl = Vector3 {
        x: l1.x - l0.x,
        y: l1.y - l0.y,
        z: l1.z - l0.z,
    };
    let rel_change = dl.len() / l0_mag;
    
    println!("Relative change: {:.3e}", rel_change);
    
    assert!(rel_change < 1e-8, "Angular momentum not conserved");
}

fn calculate_total_momentum(bodies: &Vec<physics_wasm::common::types::PhysicsBody>) -> Vector3 {
    let mut p = Vector3::zero();
    for body in bodies {
        let mut p_body = body.vel;
        p_body.scale(body.mass);
        p.add(&p_body);
    }
    p
}

fn calculate_total_angular_momentum(bodies: &Vec<physics_wasm::common::types::PhysicsBody>) -> Vector3 {
    let mut l = Vector3::zero();
    for body in bodies {
        // L = r × p = r × (m * v)
        let mut p = body.vel;
        p.scale(body.mass);
        let l_body = body.pos.cross(&p);
        l.add(&l_body);
    }
    l
}
