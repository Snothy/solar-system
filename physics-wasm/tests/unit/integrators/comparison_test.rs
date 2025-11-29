use crate::common::{load_bodies};
use physics_wasm::common::types::{Vector3, PhysicsBody};
use physics_wasm::integrators::*;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::common::constants::G;

/// Compare all 4 integrators head-to-head with solar system
#[test]
fn test_all_four_integrators_solar_system() {
    println!("\n=== COMPARING ALL 4 INTEGRATORS (Solar System) ===\n");
    
    let bodies_template = load_bodies();
    
    // Clone for each integrator
    let mut bodies_symp = bodies_template.clone();
    let mut bodies_wh = bodies_template.clone();
    let mut bodies_saba4 = bodies_template.clone();
    let mut bodies_hp = bodies_template;
    
    // Set up identical solar system for all
    for bodies in [&mut bodies_symp, &mut bodies_wh, &mut bodies_saba4, &mut bodies_hp] {
        setup_solar_system(bodies);
        // Filter out bodies that were not set up
        bodies.retain(|b| ["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter"].contains(&b.name.as_str()));
    }
    
    let parent_indices = update_hierarchy(&bodies_symp);
    let e0 = calculate_total_energy(&bodies_symp);
    
    // Simulate 30 days with all 4
    let dt = 3600.0;
    let steps = 30 * 24;
    
    for _ in 0..steps {
        step_symplectic_4(&mut bodies_symp, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
        step_wisdom_holman(&mut bodies_wh, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
        step_saba4(&mut bodies_saba4, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
        step_high_precision(&mut bodies_hp, &parent_indices, dt, 0.0,
            false, false, false, false, false, false, false, false, false);
    }
    
    // Compare final energies
    let e_symp = calculate_total_energy(&bodies_symp);
    let e_wh = calculate_total_energy(&bodies_wh);
    let e_saba4 = calculate_total_energy(&bodies_saba4);
    let e_hp = calculate_total_energy(&bodies_hp);
    
    let drift_symp = ((e_symp - e0) / e0).abs();
    let drift_wh = ((e_wh - e0) / e0).abs();
    let drift_saba4 = ((e_saba4 - e0) / e0).abs();
    let drift_hp = ((e_hp - e0) / e0).abs();
    
    println!("Initial Energy: {:.6e} J\n", e0);
    println!("Symplectic 4:      {:.6e} ({:.4}%)", drift_symp, drift_symp * 100.0);
    println!("Wisdom-Holman:     {:.6e} ({:.4}%)", drift_wh, drift_wh * 100.0);
    println!("SABA4:             {:.6e} ({:.4}%)", drift_saba4, drift_saba4 * 100.0);
    println!("High Precision:    {:.6e} ({:.4}%)\n", drift_hp, drift_hp * 100.0);
    
    // All should perform reasonably
    println!("✓ All 4 integrators tested with full solar system");
}

fn calculate_total_energy(bodies: &Vec<PhysicsBody>) -> f64 {
    let mut ke = 0.0;
    let mut pe = 0.0;
    
    for body in bodies {
        ke += 0.5 * body.mass * body.vel.len_sq();
    }
    
    for i in 0..bodies.len() {
        for j in (i+1)..bodies.len() {
            let dist = bodies[i].pos.distance_to(&bodies[j].pos);
            if dist > 0.0 {
                pe -= G * bodies[i].mass * bodies[j].mass / dist;
            }
        }
    }
    
    ke + pe
}

fn setup_solar_system(bodies: &mut Vec<PhysicsBody>) {
    if let Some(idx) = bodies.iter().position(|b| b.name == "Sun") {
        bodies[idx].pos = Vector3::zero();
        bodies[idx].vel = Vector3::zero();
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Mercury") {
        bodies[idx].pos = Vector3::new(5.79e10, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 47870.0, 0.0);
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Venus") {
        bodies[idx].pos = Vector3::new(1.082e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 35020.0, 0.0);
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Earth") {
        bodies[idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 29780.0, 0.0);
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Mars") {
        bodies[idx].pos = Vector3::new(2.279e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 24070.0, 0.0);
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Jupiter") {
        bodies[idx].pos = Vector3::new(7.785e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 13070.0, 0.0);
    }
}
