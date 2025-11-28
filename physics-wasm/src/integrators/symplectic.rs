use crate::common::types::PhysicsBody;
use crate::common::utils::{update_positions, update_velocities};
use crate::forces::calculate_accelerations;

pub fn step_symplectic_4(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &Vec<Option<usize>>,
    dt: f64,
    enable_relativity: bool, 
    enable_j2: bool, 
    enable_tidal: bool,
    enable_srp: bool,
    enable_yarkovsky: bool,
    enable_drag: bool,
    use_eih: bool,
    enable_pr_drag: bool,
    enable_comet_forces: bool
) {
    // Coefficients for Yoshida 4th order
    let w0 = -1.7024143839193153; // 2^(1/3) / (2 - 2^(1/3))
    let w1 = 1.3512071919596578;  // 1 / (2 - 2^(1/3))
    
    let c1 = w1 / 2.0;
    let c2 = (w0 + w1) / 2.0;
    let c3 = c2;
    let c4 = c1;
    
    let d1 = w1;
    let d2 = w0;
    let d3 = w1;

    // Step 1: Position Update 1
    update_positions(bodies, c1 * dt);
    
    // Step 2: Force Update 1 & Velocity Update 1
    let accs1 = calculate_accelerations(
        bodies, parent_indices, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih, enable_pr_drag, enable_comet_forces, true, false
    );
    update_velocities(bodies, &accs1, d1 * dt);

    // Step 3: Position Update 2
    update_positions(bodies, c2 * dt);

    // Step 4: Force Update 2 & Velocity Update 2
    let accs2 = calculate_accelerations(
        bodies, parent_indices, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih, enable_pr_drag, enable_comet_forces, true, false
    );
    update_velocities(bodies, &accs2, d2 * dt);

    // Step 5: Position Update 3
    update_positions(bodies, c3 * dt);

    // Step 6: Force Update 3 & Velocity Update 3
    let accs3 = calculate_accelerations(
        bodies, parent_indices, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih, enable_pr_drag, enable_comet_forces, true, false
    );
    update_velocities(bodies, &accs3, d3 * dt);

    // Step 7: Position Update 4
    update_positions(bodies, c4 * dt);
}
