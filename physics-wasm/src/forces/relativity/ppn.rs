use crate::common::constants::{C_LIGHT, G};
use crate::common::types::{PhysicsBody, Vector3};

/// Apply first-order post-Newtonian relativistic correction (PPN).
pub fn apply_relativity_ppn(
    b1: &PhysicsBody,
    b2: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
) -> (Vector3, Vector3) {
    let mut r12 = *r_vec;
    r12.scale(-1.0);

    // Force on b1 due to b2
    let mut v_rel = b1.vel;
    v_rel.sub(&b2.vel);
    let v_sq = b1.vel.len_sq();
    let term1 = (4.0 * G * b2.mass / dist) - v_sq;
    let r_dot_v = r_vec.dot(&b1.vel);
    let mut term1_vec = *r_vec;
    term1_vec.scale(term1);
    let mut term2_vec = b1.vel;
    term2_vec.scale(4.0 * r_dot_v);
    let mut acc_rel = Vector3::zero();
    acc_rel.add(&term1_vec);
    acc_rel.add(&term2_vec);
    acc_rel.scale(G * b2.mass / (dist_sq * dist * C_LIGHT * C_LIGHT));
    let mut f1 = acc_rel;
    f1.scale(b1.mass);

    // Force on b2 due to b1 (symmetric calculation)
    let v2_sq = b2.vel.len_sq();
    let term1_b = (4.0 * G * b1.mass / dist) - v2_sq;
    let r_dot_v2 = r12.dot(&b2.vel);
    let mut term1_vec_b = r12;
    term1_vec_b.scale(term1_b);
    let mut term2_vec_b = b2.vel;
    term2_vec_b.scale(4.0 * r_dot_v2);
    let mut acc_rel_b = Vector3::zero();
    acc_rel_b.add(&term1_vec_b);
    acc_rel_b.add(&term2_vec_b);
    acc_rel_b.scale(G * b1.mass / (dist_sq * dist * C_LIGHT * C_LIGHT));
    let mut f2 = acc_rel_b;
    f2.scale(b2.mass);

    (f1, f2)
}
