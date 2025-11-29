use crate::common::constants::G;
use crate::common::types::{PhysicsBody, Vector3};

/// Calculate J2 oblateness gravitational perturbation.
pub fn apply_j2(
    primary: &PhysicsBody,
    satellite: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
) -> Vector3 {
    if let Some(harmonics) = &primary.gravity_harmonics {
        if let (Some(j2), Some(pole)) = (harmonics.j2, harmonics.pole_vector) {
            let z = r_vec.dot(&pole);
            let r4 = dist_sq * dist_sq;
            let factor =
                (3.0 * G * primary.mass * satellite.mass * j2 * primary.radius * primary.radius)
                    / (2.0 * r4);
            let z2_r2 = (z * z) / dist_sq;
            let mut t1 = *r_vec;
            t1.scale(5.0 * z2_r2 - 1.0);
            let mut t2 = pole;
            t2.scale(2.0 * z);
            t1.sub(&t2);
            t1.scale(factor / dist);
            return t1;
        }
    }
    Vector3::zero()
}

/// Calculate J3 pear-shaped gravitational perturbation.
pub fn apply_j3(
    primary: &PhysicsBody,
    satellite: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
) -> Vector3 {
    if let Some(harmonics) = &primary.gravity_harmonics {
        if let (Some(j3), Some(pole)) = (harmonics.j3, harmonics.pole_vector) {
            let z = r_vec.dot(&pole);
            let r5 = dist_sq * dist_sq * dist;
            let factor = (G * primary.mass * satellite.mass * j3 * primary.radius.powi(3)) / r5;
            let z_r = z / dist;
            let z2_r2 = (z * z) / dist_sq;

            let mut t1 = *r_vec;
            t1.scale(5.0 * z_r * (7.0 * z2_r2 - 3.0));
            let mut t2 = pole;
            t2.scale(3.0 * (5.0 * z2_r2 - 1.0));
            t1.sub(&t2);

            t1.scale(factor / (2.0 * dist));
            return t1;
        }
    }
    Vector3::zero()
}

/// Calculate J4 gravitational harmonic perturbation.
pub fn apply_j4(
    primary: &PhysicsBody,
    satellite: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
) -> Vector3 {
    if let Some(harmonics) = &primary.gravity_harmonics {
        if let (Some(j4), Some(pole)) = (harmonics.j4, harmonics.pole_vector) {
            let z = r_vec.dot(&pole);
            let r6 = dist_sq * dist_sq * dist_sq;
            let factor =
                (5.0 * G * primary.mass * satellite.mass * j4 * primary.radius.powi(4)) / (2.0 * r6);
            let z2_r2 = (z * z) / dist_sq;
            let z4_r4 = z2_r2 * z2_r2;

            let mut t1 = *r_vec;
            t1.scale(3.0 - 42.0 * z2_r2 + 63.0 * z4_r4);
            let mut t2 = pole;
            t2.scale(12.0 * z / dist - 28.0 * (z * z2_r2) / dist);
            t1.add(&t2);

            t1.scale(factor / dist);
            return t1;
        }
    }
    Vector3::zero()
}

/// Calculate C22/S22 tesseral harmonic perturbation.
pub fn apply_c22_s22(
    primary: &PhysicsBody,
    satellite: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
) -> Vector3 {
    if let Some(harmonics) = &primary.gravity_harmonics {
        if let (Some(c22), Some(s22), Some(pole)) = (harmonics.c22, harmonics.s22, harmonics.pole_vector) {
            let r3 = dist * dist * dist;
            let factor = (3.0
                * G
                * primary.mass
                * satellite.mass
                * (c22 * c22 + s22 * s22).sqrt()
                * primary.radius
                * primary.radius)
                / r3;
            let mut eq_dir = pole.cross(r_vec);
            eq_dir.normalize();
            eq_dir.scale(factor / dist);
            return eq_dir;
        }
    }
    Vector3::zero()
}
