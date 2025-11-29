use crate::common::units::{MetersCubed, Kilograms, Seconds, Meters, Watts, MassLossRate};

/// Gravitational Constant G (m^3 kg^-1 s^-2)
pub const G: f64 = 6.67430e-11; // TODO: Define a composite unit type for G if needed, or keep f64

/// Speed of Light (m/s)
pub const C_LIGHT: f64 = 299792458.0;

/// Solar Luminosity (W)
pub const SOLAR_LUMINOSITY: Watts = 3.828e26;

/// Solar Mass Loss Rate (kg/s)
pub const SOLAR_MASS_LOSS: MassLossRate = 4.26e9;
