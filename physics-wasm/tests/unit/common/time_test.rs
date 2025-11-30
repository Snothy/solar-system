use physics_wasm::common::time::*;

#[test]
fn test_date_to_jd_j2000() {
    // J2000.0 = January 1, 2000, 12:00:00 TT = JD 2451545.0
    let jd = date_to_jd(2000, 1, 1, 12, 0, 0.0);
    assert!((jd - 2451545.0).abs() < 0.001, 
            "J2000.0 should be 2451545.0, got {}", jd);
}

#[test]
fn test_date_to_jd_nov_2025() {
    // November 30, 2025, 00:00:00 = JD 2461009.5
    let jd = date_to_jd(2025, 11, 30, 0, 0, 0.0);
    assert!((jd - 2461009.5).abs() < 0.001,
            "Nov 30, 2025 midnight should be 2461009.5, got {}", jd);
}

#[test]
fn test_parse_jpl_date() {
    // Test parsing the actual JPL format
    let date_str = "A.D. 2025-Nov-30 00:00:00.0000 TDB";
    let jd = parse_jpl_date(date_str);
    
    assert!(jd.is_some(), "Should successfully parse JPL date");
    let jd_val = jd.unwrap();
    
    // Should match date_to_jd(2025, 11, 30, 0, 0, 0.0)
    let expected = date_to_jd(2025, 11, 30, 0, 0, 0.0);
    assert!((jd_val - expected).abs() < 0.001,
            "Parsed JD should match expected value");
}

#[test]
fn test_parse_jpl_date_with_time() {
    let date_str = "A.D. 2025-Jan-15 14:30:45.5000 TDB";
    let jd = parse_jpl_date(date_str);
    
    assert!(jd.is_some(), "Should parse date with non-zero time");
    let jd_val = jd.unwrap();
    
    let expected = date_to_jd(2025, 1, 15, 14, 30, 45.5);
    assert!((jd_val - expected).abs() < 0.001,
            "Parsed JD with time should match");
}
