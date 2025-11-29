use approx::assert_relative_eq;
use physics_wasm::common::types::Vector3;

#[test]
fn test_vector_addition() {
    let mut v1 = Vector3::new(1.0, 2.0, 3.0);
    let v2 = Vector3::new(4.0, 5.0, 6.0);
    v1.add(&v2);

    assert_relative_eq!(v1.x, 5.0);
    assert_relative_eq!(v1.y, 7.0);
    assert_relative_eq!(v1.z, 9.0);
}

#[test]
fn test_vector_subtraction() {
    let mut v1 = Vector3::new(1.0, 2.0, 3.0);
    let v2 = Vector3::new(4.0, 5.0, 6.0);
    v1.sub(&v2);

    assert_relative_eq!(v1.x, -3.0);
    assert_relative_eq!(v1.y, -3.0);
    assert_relative_eq!(v1.z, -3.0);
}

#[test]
fn test_vector_scaling() {
    let mut v = Vector3::new(1.0, 2.0, 3.0);
    v.scale(2.0);

    assert_relative_eq!(v.x, 2.0);
    assert_relative_eq!(v.y, 4.0);
    assert_relative_eq!(v.z, 6.0);
}

#[test]
fn test_vector_magnitude() {
    let v = Vector3::new(3.0, 4.0, 0.0);
    assert_relative_eq!(v.len(), 5.0);
}

#[test]
fn test_vector_normalization() {
    let mut v = Vector3::new(3.0, 4.0, 0.0);
    v.normalize();

    assert_relative_eq!(v.len(), 1.0);
    assert_relative_eq!(v.x, 0.6);
    assert_relative_eq!(v.y, 0.8);
}

#[test]
fn test_vector_dot_product() {
    let v1 = Vector3::new(1.0, 2.0, 3.0);
    let v2 = Vector3::new(4.0, 5.0, 6.0);
    let dot = v1.dot(&v2);

    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    assert_relative_eq!(dot, 32.0);
}

#[test]
fn test_vector_cross_product() {
    let v1 = Vector3::new(1.0, 0.0, 0.0);
    let v2 = Vector3::new(0.0, 1.0, 0.0);
    let cross = v1.cross(&v2);

    // i × j = k
    assert_relative_eq!(cross.x, 0.0);
    assert_relative_eq!(cross.y, 0.0);
    assert_relative_eq!(cross.z, 1.0);
}

#[test]
fn test_vector_distance() {
    let v1 = Vector3::new(0.0, 0.0, 0.0);
    let v2 = Vector3::new(3.0, 4.0, 0.0);
    let dist = v1.distance_to(&v2);

    assert_relative_eq!(dist, 5.0);
}
