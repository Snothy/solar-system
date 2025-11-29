use serde::{Deserialize, Serialize};

/// Quality settings for the integrator
#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum IntegratorQuality {
    Low = 0,
    Medium = 1,
    High = 2,
    Ultra = 3,
}

impl From<u8> for IntegratorQuality {
    fn from(value: u8) -> Self {
        match value {
            0 => Self::Low,
            1 => Self::Medium,
            2 => Self::High,
            3 => Self::Ultra,
            _ => Self::Medium,
        }
    }
}

pub enum IntegratorMode {
    WisdomHolman,
    SABA4,
    HighPrecision,
}
