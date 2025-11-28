
pub enum IntegratorMode {
    WisdomHolman,
    SABA4,
    HighPrecision,
}

// SABA4 Coefficients (Laskar & Robutel 2001)
// c coefficients (Drift)
pub const SABA4_C1: f64 = 0.06943184420297371;
pub const SABA4_C2: f64 = 0.26057763400459815;
pub const SABA4_C3: f64 = 0.33998104358485626;

// d coefficients (Kick)
pub const SABA4_D1: f64 = 0.17392742256872693;
pub const SABA4_D2: f64 = 0.3260725774312731;
