pub mod symplectic;
pub mod wisdom_holman;
pub mod saba4;
pub mod high_precision;

pub use symplectic::step_symplectic_4;
pub use wisdom_holman::step_wisdom_holman;
pub use saba4::step_saba4;
pub use high_precision::step_high_precision;

pub enum IntegratorMode {
    WisdomHolman,
    SABA4,
    HighPrecision,
}
