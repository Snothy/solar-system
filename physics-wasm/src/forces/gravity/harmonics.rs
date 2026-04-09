use crate::common::constants::G;
use crate::common::types::{PhysicsBody, Vector3};
use super::legendre::legendre_and_derivative;

/// Apply generic zonal gravitational harmonics.
///
/// Dispatch logic:
/// - Indices 0, 1, 2 (J2, J3, J4) -> Use your robust Cartesian implementations.
/// - Indices 3+ (J5...) -> Use recursive Legendre polynomials.
pub fn apply_zonal_harmonics(
    primary: &PhysicsBody,
    _satellite: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
    pole_override: Option<Vector3>,
) -> Vector3 {
    let mut acc_total = Vector3::zero();

    if let Some(harmonics) = &primary.gravity_harmonics {
        // Use override if provided, otherwise fallback to static pole
        if let Some(pole) = pole_override.or(harmonics.pole_vector) {
            let coeffs: &[f64] = harmonics.get_zonal_coeffs();
            if coeffs.is_empty() {
                return Vector3::zero();
            }

            // --- 1. J2 (Index 0) ---
            if coeffs.len() > 0 {
                let j2 = coeffs[0];
                if j2.abs() > 1e-20 {
                    acc_total.add(&apply_j2_cartesian(primary, j2, pole, r_vec, dist, dist_sq));
                }
            }

            // --- 2. J3 (Index 1) ---
            if coeffs.len() > 1 {
                let j3 = coeffs[1];
                if j3.abs() > 1e-20 {
                    acc_total.add(&apply_j3_cartesian(primary, j3, pole, r_vec, dist, dist_sq));
                }
            }

            // --- 3. J4 (Index 2) ---
            if coeffs.len() > 2 {
                let j4 = coeffs[2];
                if j4.abs() > 1e-20 {
                    acc_total.add(&apply_j4_cartesian(primary, j4, pole, r_vec, dist, dist_sq));
                }
            }

            // --- 4. High-Order J5+ (Indices 3+) ---
            if coeffs.len() > 3 {
                acc_total.add(&apply_high_order_zonal(
                    primary,
                    &coeffs[3..], 
                    5, // Starts at J5
                    pole,
                    r_vec,
                    dist,
                    dist_sq
                ));
            }
        }
    }

    acc_total
}

/// Apply Sectorial Harmonics (C22/S22).
pub fn apply_sectorial_harmonics(
    primary: &PhysicsBody,
    r_inertial: &Vector3,
    dist_sq: f64,
    body_rotation_angle: f64,
    pole_ra: f64,
    pole_dec: f64,
) -> Vector3 {
    if let Some(harmonics) = &primary.gravity_harmonics {
        if let (Some(c22), Some(s22)) = (harmonics.c22, harmonics.s22) {
            
            // Constants
            let epsilon = 23.43928_f64.to_radians(); // Obliquity of Ecliptic
            let sin_eps = epsilon.sin();
            let cos_eps = epsilon.cos();

            // 1. Ecliptic to Equatorial
            let x_eq = r_inertial.x;
            let y_eq = r_inertial.y * cos_eps - r_inertial.z * sin_eps;
            let z_eq = r_inertial.y * sin_eps + r_inertial.z * cos_eps;

            // 2. Equatorial to Node-Aligned (Rotate Z by alpha + 90)
            let theta1 = pole_ra + std::f64::consts::FRAC_PI_2;
            let (sin_t1, cos_t1) = theta1.sin_cos();
            
            let x_node = x_eq * cos_t1 + y_eq * sin_t1;
            let y_node = -x_eq * sin_t1 + y_eq * cos_t1;
            let z_node = z_eq;

            // 3. Node-Aligned to Pole-Aligned (Rotate X by 90 - delta)
            let theta2 = std::f64::consts::FRAC_PI_2 - pole_dec;
            let (sin_t2, cos_t2) = theta2.sin_cos();

            let x_pole = x_node;
            let y_pole = y_node * cos_t2 + z_node * sin_t2;
            let z_pole = -y_node * sin_t2 + z_node * cos_t2;

            // 4. Pole-Aligned to Body-Fixed (Rotate Z by W)
            let theta3 = body_rotation_angle;
            let (sin_t3, cos_t3) = theta3.sin_cos();

            let x_bf = x_pole * cos_t3 + y_pole * sin_t3;
            let y_bf = -x_pole * sin_t3 + y_pole * cos_t3;
            let z_bf = z_pole;

            // --- Calculate Acceleration in Body-Fixed Frame ---
            let r2 = dist_sq;
            let r4 = r2 * r2;
            let mu = G * primary.mass;
            let r_p_sq = primary.radius * primary.radius;
            let factor = 3.0 * mu * r_p_sq; 

            let term_bracket = c22 * (x_bf * x_bf - y_bf * y_bf) + 2.0 * s22 * x_bf * y_bf;

            let inv_r5 = 1.0 / (r4 * dist_sq.sqrt());
            let inv_r7 = inv_r5 / r2;

            let radial_decay = -5.0 * factor * term_bracket * inv_r7;
            let d_bracket_dx = 2.0 * x_bf * c22 + 2.0 * y_bf * s22;
            let d_bracket_dy = -2.0 * y_bf * c22 + 2.0 * x_bf * s22;

            let ax_bf = radial_decay * x_bf + factor * inv_r5 * d_bracket_dx;
            let ay_bf = radial_decay * y_bf + factor * inv_r5 * d_bracket_dy;
            let az_bf = radial_decay * z_bf;

            // --- Rotate Acceleration Back to Inertial (Inverse Sequence) ---
            
            // 1. Inverse Body-Fixed to Pole-Aligned (Rotate Z by -W)
            let ax_pole = ax_bf * cos_t3 - ay_bf * sin_t3;
            let ay_pole = ax_bf * sin_t3 + ay_bf * cos_t3;
            let az_pole = az_bf;

            // 2. Inverse Pole-Aligned to Node-Aligned (Rotate X by -(90 - delta))
            // cos(-t) = cos(t), sin(-t) = -sin(t)
            let ax_node = ax_pole;
            let ay_node = ay_pole * cos_t2 - az_pole * sin_t2;
            let az_node = ay_pole * sin_t2 + az_pole * cos_t2;

            // 3. Inverse Node-Aligned to Equatorial (Rotate Z by -(alpha + 90))
            let ax_eq = ax_node * cos_t1 - ay_node * sin_t1;
            let ay_eq = ax_node * sin_t1 + ay_node * cos_t1;
            let az_eq = az_node;

            // 4. Inverse Equatorial to Ecliptic (Rotate X by +epsilon)
            let ax_ecl = ax_eq;
            let ay_ecl = ay_eq * cos_eps + az_eq * sin_eps;
            let az_ecl = -ay_eq * sin_eps + az_eq * cos_eps;

            return Vector3::new(ax_ecl, ay_ecl, az_ecl);
        }
    }
    Vector3::zero()
}

// =========================================================================
//  Internal Helpers: YOUR EXACT IMPLEMENTATIONS
//  (Only 'satellite.mass' removed to return Acceleration instead of Force)
// =========================================================================

#[inline(always)]
fn apply_j2_cartesian(
    primary: &PhysicsBody,
    j2: f64,
    pole: Vector3,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
) -> Vector3 {
    let z = r_vec.dot(&pole);
    let r4 = dist_sq * dist_sq;
    
    // Formula: (3/2) * J2 * GM * R^2 / r^4
    let factor = (3.0 * G * primary.mass * j2 * primary.radius * primary.radius) / (2.0 * r4);
    
    let z2_r2 = (z * z) / dist_sq;
    
    let mut t1 = *r_vec;
    t1.scale(5.0 * z2_r2 - 1.0);
    
    let mut t2 = pole;
    t2.scale(2.0 * z);
    
    t1.sub(&t2);
    t1.scale(factor / dist);
    
    t1
}

#[inline(always)]
fn apply_j3_cartesian(
    primary: &PhysicsBody,
    j3: f64,
    pole: Vector3,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
) -> Vector3 {
    let z = r_vec.dot(&pole);
    let r5 = dist_sq * dist_sq * dist;
    
    // Formula: (1/2) * J3 * GM * R^3 / r^5
    let factor = (G * primary.mass * j3 * primary.radius.powi(3)) / r5;
    
    let z_r = z / dist;
    let z2_r2 = (z * z) / dist_sq;

    let mut t1 = *r_vec;
    t1.scale(5.0 * z_r * (7.0 * z2_r2 - 3.0));
    
    let mut t2 = pole;
    t2.scale(3.0 * (5.0 * z2_r2 - 1.0) * dist); // Scale by dist for unit consistency
    
    t1.sub(&t2);
    
    // Note: User logic scaled by (factor / 2.0 * dist)
    t1.scale(factor / (2.0 * dist));
    
    t1
}

#[inline(always)]
fn apply_j4_cartesian(
    primary: &PhysicsBody,
    j4: f64,
    pole: Vector3,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
) -> Vector3 {
    let z = r_vec.dot(&pole);
    let r6 = dist_sq * dist_sq * dist_sq;
    
    // Formula: (5/8) * J4 * GM * R^4 / r^6  (Corrected from 5/2)
    let factor = (5.0 * G * primary.mass * j4 * primary.radius.powi(4)) / (8.0 * r6);
    
    let z2_r2 = (z * z) / dist_sq;
    let z4_r4 = z2_r2 * z2_r2;

    let mut t1 = *r_vec;
    t1.scale(3.0 - 42.0 * z2_r2 + 63.0 * z4_r4);
    
    let mut t2 = pole;
    t2.scale((12.0 * z / dist - 28.0 * (z * z2_r2) / dist) * dist); // Scale by dist for unit consistency
    
    t1.add(&t2); // User logic: ADDED pole term
    t1.scale(factor / dist);
    
    t1
}

fn apply_high_order_zonal(
    primary: &PhysicsBody,
    coeffs: &[f64],
    start_n: usize,
    pole: Vector3,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64
) -> Vector3 {
    // Standard Legendre implementation for J5+
    let cos_theta = (r_vec.dot(&pole) / dist).clamp(-1.0, 1.0);
    let sin_theta_sq = 1.0 - cos_theta * cos_theta;
    
    let mut acc_radial = 0.0;
    let mut acc_theta = 0.0;
    
    let r_ratio = primary.radius / dist;
    let mut r_ratio_pow = r_ratio.powi(start_n as i32); 
    
    let base_factor = G * primary.mass / dist_sq;
    
    for (i, &j_n) in coeffs.iter().enumerate() {
        if j_n.abs() < 1e-20 {
            r_ratio_pow *= r_ratio;
            continue;
        }
        
        let n = start_n + i;
        let (p_n, p_n_prime) = legendre_and_derivative(n, cos_theta);
        
        let factor = base_factor * j_n * r_ratio_pow;
        
        acc_radial += (n + 1) as f64 * factor * p_n;
        acc_theta -= factor * p_n_prime;
        
        r_ratio_pow *= r_ratio;
    }

    let mut a_vec = *r_vec;
    a_vec.scale(acc_radial / dist);

    if sin_theta_sq > 1e-12 {
        let mut theta_vec = pole;
        let mut r_proj = *r_vec;
        r_proj.scale(cos_theta / dist);
        theta_vec.sub(&r_proj);
        theta_vec.scale(acc_theta); 
        a_vec.add(&theta_vec);
    }
    
    a_vec
}