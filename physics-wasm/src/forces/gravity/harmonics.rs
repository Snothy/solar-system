use crate::common::types::{PhysicsBody, Vector3};
use super::legendre::legendre_and_derivative;

/// Apply Zonal Gravitational Harmonics (J2, J3, J4...).
pub fn apply_zonal_harmonics(
    primary: &PhysicsBody,
    _satellite: &PhysicsBody, 
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
    pole_override: Option<Vector3>,
) -> Vector3 {
    let mut acc_total = Vector3::zero();

    let harmonics = match &primary.gravity_harmonics {
        Some(h) => h,
        None => return acc_total,
    };

    let pole = match pole_override.or(harmonics.pole_vector) {
        Some(p) => p,
        None => return acc_total, 
    };

    let coeffs = harmonics.get_zonal_coeffs();
    if coeffs.is_empty() {
        return acc_total;
    }

    let ref_radius = harmonics.j_ref_radius.unwrap_or(primary.equatorial_radius);

    // --- 1. J2 (Index 0) ---
    if coeffs[0].abs() > 1e-20 {
        acc_total.add(&apply_j2_cartesian(primary, coeffs[0], pole, r_vec, dist, dist_sq, ref_radius));
    }

    // --- 2. J3+ (Index 1+) ---
    if coeffs.len() > 1 {
        acc_total.add(&apply_high_order_zonal(
            primary,
            &coeffs[1..], 
            3, 
            pole,
            r_vec,
            dist,
            dist_sq,
            ref_radius
        ));
    }

    acc_total
}

/// Apply Sectorial Harmonics (C22/S22).
/// Signature restored to accept f64 angles to match your existing contract.
pub fn apply_sectorial_harmonics(
    primary: &PhysicsBody,
    r_inertial: &Vector3,
    dist_sq: f64,
    body_rotation_angle: f64,
    pole_ra: f64,
    pole_dec: f64,
) -> Vector3 {
    let harmonics = match &primary.gravity_harmonics {
        Some(h) => h,
        None => return Vector3::zero(),
    };

    let (c22, s22) = match (harmonics.c22, harmonics.s22) {
        (Some(c), Some(s)) => (c, s),
        _ => return Vector3::zero(),
    };

    // --- 1. Construct Basis Vectors from Angles ---
    // Z-axis (Spin Axis)
    let bz = Vector3::new(
        pole_dec.cos() * pole_ra.cos(),
        pole_dec.cos() * pole_ra.sin(),
        pole_dec.sin()
    );

    // Prime Meridian direction at J2000 (X-axis)
    // We rotate around the pole by the body's rotation angle
    let (sin_w, cos_w) = body_rotation_angle.sin_cos();
    
    // Create an arbitrary orthogonal vector to start (reference longitude)
    let ref_vec = if bz.z.abs() < 0.9 {
        Vector3::new(0.0, 0.0, 1.0)  // pole not near Z, safe to use Z as reference
    } else {
        Vector3::new(1.0, 0.0, 0.0)  // pole near Z, use X instead
    };
    
    let mut bx_base = bz.cross(&ref_vec);
    let len = bx_base.len();
    if len < 1e-10 { return Vector3::zero(); } // degenerate pole, skip
    bx_base.scale(1.0 / len); // manual normalize with guard
    let by_base = bz.cross(&bx_base);

    // Final Body-Fixed Basis X and Y
    let mut bx = bx_base;
    bx.scale(cos_w);
    let mut bx_y = by_base;
    bx_y.scale(sin_w);
    bx.add(&bx_y);

    let mut by = bz.cross(&bx);
    by.normalize();

    // --- 2. Transform to Body-Fixed Frame ---
    let r_bf = Vector3::new(
        r_inertial.dot(&bx),
        r_inertial.dot(&by),
        r_inertial.dot(&bz)
    );
    
    let mu = primary.gm;
    let ref_radius = harmonics.j_ref_radius.unwrap_or(primary.equatorial_radius);
    let r_ref_sq = ref_radius.powi(2);
    let dist = dist_sq.sqrt();
    
    let factor = 3.0 * mu * r_ref_sq; 
    let inv_r5 = 1.0 / (dist_sq * dist_sq * dist);
    let inv_r7 = inv_r5 / dist_sq;

    let xy_bracket = c22 * (r_bf.x * r_bf.x - r_bf.y * r_bf.y) + 2.0 * s22 * r_bf.x * r_bf.y;

    let radial_decay = -5.0 * factor * xy_bracket * inv_r7;
    let d_bracket_dx = 2.0 * (r_bf.x * c22 + r_bf.y * s22);
    let d_bracket_dy = 2.0 * (r_bf.x * s22 - r_bf.y * c22);

    let ax_bf = radial_decay * r_bf.x + factor * inv_r5 * d_bracket_dx;
    let ay_bf = radial_decay * r_bf.y + factor * inv_r5 * d_bracket_dy;
    let az_bf = radial_decay * r_bf.z;

    // --- 3. Transform Back to Inertial ---
    let mut acc_inertial = bx;
    acc_inertial.scale(ax_bf);

    let mut ay_part = by;
    ay_part.scale(ay_bf);
    
    let mut az_part = bz;
    az_part.scale(az_bf);

    acc_inertial.add(&ay_part);
    acc_inertial.add(&az_part);

    acc_inertial
}

#[inline(always)]
fn apply_j2_cartesian(
    primary: &PhysicsBody,
    j2: f64,
    pole: Vector3,
    r_vec: &Vector3,
    dist: f64,
    dist_sq: f64,
    ref_radius: f64,
) -> Vector3 {
    let z = r_vec.dot(&pole);
    let r4 = dist_sq * dist_sq;
    let factor = (1.5 * primary.gm * j2 * ref_radius * ref_radius) / r4;
    let z2_r2 = (z * z) / dist_sq;
    
    let mut t1 = *r_vec;
    t1.scale(5.0 * z2_r2 - 1.0);
    let mut t2 = pole;
    t2.scale(2.0 * z);
    
    t1.sub(&t2);
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
    dist_sq: f64,
    ref_radius: f64,
) -> Vector3 {
    let cos_theta = (r_vec.dot(&pole) / dist).clamp(-1.0, 1.0);
    let sin_theta_sq = 1.0 - cos_theta * cos_theta;
    
    let mut acc_radial = 0.0;
    let mut acc_theta = 0.0;
    let r_ratio = ref_radius / dist;
    let mut r_ratio_pow = r_ratio.powi(start_n as i32);
    let base_factor = primary.gm / dist_sq;
    
    for (i, &j_n) in coeffs.iter().enumerate() {
        if j_n.abs() < 1e-20 {
            r_ratio_pow *= r_ratio;
            continue;
        }
        let n = start_n + i;
        let (p_n, p_n_prime) = legendre_and_derivative(n, cos_theta);
        let factor = base_factor * j_n * r_ratio_pow;
        acc_radial += (n + 1) as f64 * factor * p_n;
        acc_theta  -= factor * p_n_prime;
        r_ratio_pow *= r_ratio;
    }

    let mut a_vec = *r_vec;
    a_vec.scale(acc_radial / dist);

    if sin_theta_sq > 1e-12 {
        let mut theta_dir = pole;
        let mut r_proj = *r_vec;
        r_proj.scale(cos_theta / dist);
        theta_dir.sub(&r_proj); 
        theta_dir.scale(acc_theta / dist); 
        a_vec.add(&theta_dir);
    }
    a_vec
}