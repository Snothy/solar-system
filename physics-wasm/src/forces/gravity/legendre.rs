/// Legendre polynomial computation using recurrence relations.
/// 
/// This module provides efficient computation of Legendre polynomials P_n(x)
/// and their derivatives P'_n(x), which are needed for gravitational harmonics.

/// Compute Legendre polynomial P_n(x) and its derivative P'_n(x).
///
/// ...
///
/// # Arguments
/// * `n` - Degree of the polynomial (n >= 0)
/// * `x` - Argument, typically cos(θ). 
///         Values outside [-1.0, 1.0] will be clamped.
///
/// # Returns
/// * `(P_n, P'_n)` - The polynomial value and its derivative
pub fn legendre_and_derivative(n: usize, mut x: f64) -> (f64, f64) {
    // Safety: Clamp x to valid cosine range to prevent numerical weirdness
    x = x.clamp(-1.0, 1.0);

    match n {
        0 => (1.0, 0.0),
        1 => (x, 1.0),
        _ => {
            let mut p_prev = 1.0; // P_0
            let mut p_curr = x;   // P_1
            
            // Standard recurrence for P_n
            for k in 1..n {
                let p_next = ((2 * k + 1) as f64 * x * p_curr - k as f64 * p_prev) 
                           / (k + 1) as f64;
                p_prev = p_curr;
                p_curr = p_next;
            }
            
            // Compute derivative
            // Singularity check for North (+1) and South (-1) poles
            let x_sq = x * x;
            if (1.0 - x_sq).abs() < 1e-10 {
                // Formula: P'_n(1) = n(n+1)/2
                // Formula: P'_n(-1) = (-1)^(n+1) * n(n+1)/2
                
                let magnitude = (n as f64) * (n as f64 + 1.0) / 2.0;
                
                let sign = if x > 0.0 {
                    1.0 // North Pole
                } else {
                    // South Pole: (-1)^(n+1)
                    // Even n -> (-1)^Odd -> -1
                    // Odd n  -> (-1)^Even -> +1
                    if n % 2 == 0 { -1.0 } else { 1.0 }
                };
                
                (p_curr, sign * magnitude)
            } else {
                // Standard recursive derivative formula
                let deriv = (n as f64) * (x * p_curr - p_prev) / (x_sq - 1.0);
                (p_curr, deriv)
            }
        }
    }
}

/// Compute just P_n(x) without the derivative (slightly faster).
///
/// # Arguments
/// * `n` - Degree of the polynomial
/// * `x` - Argument
///
/// # Returns
/// * `P_n(x)` - The polynomial value
pub fn legendre(n: usize, x: f64) -> f64 {
    match n {
        0 => 1.0,
        1 => x,
        _ => {
            let mut p_prev = 1.0;
            let mut p_curr = x;
            
            for k in 1..n {
                let p_next = ((2 * k + 1) as f64 * x * p_curr - k as f64 * p_prev) 
                           / (k + 1) as f64;
                p_prev = p_curr;
                p_curr = p_next;
            }
            
            p_curr
        }
    }
}


