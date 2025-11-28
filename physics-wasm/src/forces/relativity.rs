use crate::common::types::{Vector3, PhysicsBody};
use crate::common::constants::{G, C_LIGHT};

pub fn apply_relativity_ppn(b1: &PhysicsBody, b2: &PhysicsBody, r_vec: &Vector3, dist: f64, dist_sq: f64) -> (Vector3, Vector3) {
    // PPN (Parameterized Post-Newtonian) first-order relativistic correction
    // Made symmetric to conserve momentum
    
    let mut r12 = *r_vec; r12.scale(-1.0);
    
    // Force on b1 due to b2
    let mut v_rel = b1.vel; v_rel.sub(&b2.vel);
    let v_sq = b1.vel.len_sq();
    let term1 = (4.0 * G * b2.mass / dist) - v_sq;
    let r_dot_v = r_vec.dot(&b1.vel);
    let mut term1_vec = *r_vec; term1_vec.scale(term1);
    let mut term2_vec = b1.vel; term2_vec.scale(4.0 * r_dot_v);
    let mut acc_rel = Vector3::zero();
    acc_rel.add(&term1_vec);
    acc_rel.add(&term2_vec);
    acc_rel.scale(G * b2.mass / (dist_sq * dist * C_LIGHT * C_LIGHT));
    let mut f1 = acc_rel; f1.scale(b1.mass);
    
    // Force on b2 due to b1 (symmetric calculation)
    let v2_sq = b2.vel.len_sq();
    let term1_b = (4.0 * G * b1.mass / dist) - v2_sq;
    let r_dot_v2 = r12.dot(&b2.vel);
    let mut term1_vec_b = r12; term1_vec_b.scale(term1_b);
    let mut term2_vec_b = b2.vel; term2_vec_b.scale(4.0 * r_dot_v2);
    let mut acc_rel_b = Vector3::zero();
    acc_rel_b.add(&term1_vec_b);
    acc_rel_b.add(&term2_vec_b);
    acc_rel_b.scale(G * b1.mass / (dist_sq * dist * C_LIGHT * C_LIGHT));
    let mut f2 = acc_rel_b; f2.scale(b2.mass);
    
    (f1, f2)
}

pub fn apply_relativity_eih(b1: &PhysicsBody, b2: &PhysicsBody, r_vec: &Vector3, dist: f64, dist_sq: f64) -> (Vector3, Vector3) {
    let mut r12 = *r_vec; r12.scale(-1.0); 
    let mut v12 = b1.vel; v12.sub(&b2.vel);
    
    let v1_sq = b1.vel.len_sq();
    let v2_sq = b2.vel.len_sq();
    let v1_dot_v2 = b1.vel.dot(&b2.vel);
    let r_dot_v1 = r12.dot(&b1.vel);
    let r_dot_v2 = r12.dot(&b2.vel);
    
    let a_scalar = (4.0 * G * b2.mass / dist) - v1_sq - 2.0 * v2_sq + 4.0 * v1_dot_v2 + 1.5 * ((r_dot_v2 * r_dot_v2) / dist_sq);
    let b_scalar = 4.0 * r_dot_v1 - 3.0 * r_dot_v2;
    
    let mut term1 = r12; term1.scale(a_scalar);
    let mut term2 = v12; term2.scale(b_scalar);
    
    let mut acc_rel = Vector3::zero();
    acc_rel.add(&term1);
    acc_rel.add(&term2);
    acc_rel.scale(G * b2.mass / (C_LIGHT * C_LIGHT * dist * dist * dist));
    
    let mut f1 = acc_rel; f1.scale(b1.mass);
    
    let r21 = *r_vec; 
    let mut v21 = b2.vel; v21.sub(&b1.vel);
    let r_dot_v1_b = r21.dot(&b1.vel);
    let r_dot_v2_b = r21.dot(&b2.vel);
    
    let a_scalar_b = (4.0 * G * b1.mass / dist) - v2_sq - 2.0 * v1_sq + 4.0 * v1_dot_v2 + 1.5 * ((r_dot_v1_b * r_dot_v1_b) / dist_sq);
    let b_scalar_b = 4.0 * r_dot_v2_b - 3.0 * r_dot_v1_b;
    
    let mut term1_b = r21; term1_b.scale(a_scalar_b);
    let mut term2_b = v21; term2_b.scale(b_scalar_b);
    
    let mut acc_rel_b = Vector3::zero();
    acc_rel_b.add(&term1_b);
    acc_rel_b.add(&term2_b);
    acc_rel_b.scale(G * b1.mass / (C_LIGHT * C_LIGHT * dist * dist * dist));
    
    let mut f2 = acc_rel_b; f2.scale(b2.mass);
    
    (f1, f2)
}
