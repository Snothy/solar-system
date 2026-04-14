use crate::common::constants::{C_LIGHT, G};
use crate::common::types::{PhysicsBody, Vector3};

/// Apply first-order post-Newtonian relativistic correction (PPN).
/// Uses standard PPN parameters: β = γ = 1 (Minkowski/GR limit)
pub fn apply_relativity_ppn(
    b1: &PhysicsBody,
    b2: &PhysicsBody,
    r_vec: &Vector3, // Points from b1 to b2
    dist: f64,
    dist_sq: f64,
) -> (Vector3, Vector3) {
    // Standard GR parameters
    let gamma = 1.0;
    let beta = 1.0;
    let c2 = C_LIGHT * C_LIGHT;

    // We calculate a1 (accel of b1) and a2 (accel of b2) independently.
    let a1 = calculate_single_ppn(b1, b2, r_vec, dist, dist_sq, gamma, beta, c2);
    
    // For b2, the vector points from b2 to b1, so we reverse r_vec
    let r_vec_rev = r_vec.scaled(-1.0);
    let a2 = calculate_single_ppn(b2, b1, &r_vec_rev, dist, dist_sq, gamma, beta, c2);

    (a1, a2)
}

fn calculate_single_ppn(
    target: &PhysicsBody,
    source: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
    gamma: f64,
    beta: f64,
    c2: f64,
) -> Vector3 {
    let r_unit = r_vec.scaled(1.0 / dist);
    let vi = target.vel;
    let vj = source.vel;

    // 1. Potentials and Kinetic terms (Scalar part)
    // This is the classic EIH/PPN expansion for 1-body in the field of another
    let common_factor = source.gm / (c2 * dist_sq);
    
    let scalar_part = (2.0 * (gamma + beta) * (source.gm / dist)) 
                    - (gamma * vi.len_sq()) 
                    + (2.0 * (1.0 + gamma) * vi.dot(&vj)) 
                    - (vj.len_sq()) 
                    + (1.5 * (r_unit.dot(&vj).powi(2)));

    // 2. Velocity-dependent part (Vector part)
    // This provides the "drag" / frame-dragging components
    let mut v_diff = vi;
    v_diff.sub(&vj);
    let v_coeff = (2.0 + 2.0 * gamma) * (r_unit.dot(&vi) - r_unit.dot(&vj));

    // Combine: a = [common * scalar * r_unit] + [common * v_coeff * v_diff]
    let mut acc = r_unit.scaled(common_factor * scalar_part);
    acc.add(&v_diff.scaled(common_factor * v_coeff));

    acc
}