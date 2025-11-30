
#[cfg(test)]
mod tests {
    use physics_wasm::forces::gravity::legendre::legendre_and_derivative;
    use approx::assert_relative_eq;

    #[test]
    fn test_legendre_derivative_at_south_pole() {
        // Test n=2 at South Pole (x = -1.0)
        // P'_2(x) = 3x. At x=-1, P'_2(-1) = -3.0.
        let (_, deriv_2) = legendre_and_derivative(2, -1.0);
        assert_relative_eq!(deriv_2, -3.0, epsilon = 1e-10);

        // Test n=3 at South Pole (x = -1.0)
        // P'_3(x) = 0.5(15x^2 - 3). At x=-1, P'_3(-1) = 0.5(15-3) = 6.0.
        let (_, deriv_3) = legendre_and_derivative(3, -1.0);
        assert_relative_eq!(deriv_3, 6.0, epsilon = 1e-10);
        
        // Test n=4 at South Pole (x = -1.0)
        // P'_4(-1) = (-1)^5 * 4*5/2 = -1 * 10 = -10.0.
        let (_, deriv_4) = legendre_and_derivative(4, -1.0);
        assert_relative_eq!(deriv_4, -10.0, epsilon = 1e-10);
    }
    
    #[test]
    fn test_legendre_derivative_at_north_pole() {
        // Test n=2 at North Pole (x = 1.0)
        // P'_2(1) = 3(1) = 3.0.
        let (_, deriv_2) = legendre_and_derivative(2, 1.0);
        assert_relative_eq!(deriv_2, 3.0, epsilon = 1e-10);
    }
}
