//! Time-related types and utilities.
//!
//! Provides semantic types for time steps and simulation time to prevent unit errors.

use crate::common::units::Seconds;
use serde::{Serialize, Deserialize};

/// A simulation time step.
#[derive(Copy, Clone, Debug, PartialEq, PartialOrd, Serialize, Deserialize)]
pub struct TimeStep(pub Seconds);

impl TimeStep {
    /// Create a new TimeStep from seconds
    pub fn from_seconds(dt: f64) -> Self {
        Self(dt)
    }

    /// Get the value in seconds
    pub fn as_seconds(&self) -> f64 {
        self.0
    }
}

/// Current simulation time (epoch).
#[derive(Copy, Clone, Debug, PartialEq, PartialOrd, Serialize, Deserialize)]
pub struct SimulationTime(pub Seconds);

impl SimulationTime {
    pub fn new(time: f64) -> Self {
        Self(time)
    }
    
    pub fn as_seconds(&self) -> f64 {
        self.0
    }
}

/// Convert a calendar date to Julian Date.
///
/// # Arguments
/// * `year` - Year (e.g., 2025)
/// * `month` - Month (1-12)
/// * `day` - Day of month (1-31)
/// * `hour` - Hour (0-23)
/// * `min` - Minute (0-59)
/// * `sec` - Second (0.0-59.999...)
///
/// # Returns
/// Julian Date (JD)
pub fn date_to_jd(year: i32, month: i32, day: i32, hour: i32, min: i32, sec: f64) -> f64 {
    let mut y = year;
    let mut m = month;

    // If month is Jan or Feb, treat it as month 13 or 14 of previous year
    if m <= 2 {
        y -= 1;
        m += 12;
    }

    let a = (y as f64 / 100.0).floor();
    let b = 2.0 - a + (a / 4.0).floor();

    let day_fraction = (hour as f64 + min as f64 / 60.0 + sec / 3600.0) / 24.0;
    
    // The Magic Formula
    let jd = (365.25 * (y as f64 + 4716.0)).floor() 
           + (30.6001 * (m as f64 + 1.0)).floor() 
           + (day as f64 + day_fraction) 
           + b 
           - 1524.5;
           
    jd
}

/// Parse JPL date format to Julian Date.
///
/// Parses dates like "A.D. 2025-Nov-30 00:00:00.0000 TDB"
///
/// # Arguments
/// * `date_str` - JPL date string
///
/// # Returns
/// Julian Date if parsing succeeds, None otherwise
pub fn parse_jpl_date(date_str: &str) -> Option<f64> {
    // Remove "A.D. " prefix and " TDB" suffix
    let cleaned = date_str
        .trim()
        .strip_prefix("A.D. ")?
        .strip_suffix(" TDB")?;
    
    // Split into date and time parts: "2025-Nov-30 00:00:00.0000"
    let parts: Vec<&str> = cleaned.split_whitespace().collect();
    if parts.len() != 2 {
        return None;
    }
    
    // Parse date part: "2025-Nov-30"
    let date_parts: Vec<&str> = parts[0].split('-').collect();
    if date_parts.len() != 3 {
        return None;
    }
    
    let year: i32 = date_parts[0].parse().ok()?;
    let month = parse_month(date_parts[1])?;
    let day: i32 = date_parts[2].parse().ok()?;
    
    // Parse time part: "00:00:00.0000"
    let time_parts: Vec<&str> = parts[1].split(':').collect();
    if time_parts.len() != 3 {
        return None;
    }
    
    let hour: i32 = time_parts[0].parse().ok()?;
    let min: i32 = time_parts[1].parse().ok()?;
    let sec: f64 = time_parts[2].parse().ok()?;
    
    Some(date_to_jd(year, month, day, hour, min, sec))
}

/// Parse month name to number (1-12).
fn parse_month(month_str: &str) -> Option<i32> {
    match month_str {
        "Jan" => Some(1),
        "Feb" => Some(2),
        "Mar" => Some(3),
        "Apr" => Some(4),
        "May" => Some(5),
        "Jun" => Some(6),
        "Jul" => Some(7),
        "Aug" => Some(8),
        "Sep" => Some(9),
        "Oct" => Some(10),
        "Nov" => Some(11),
        "Dec" => Some(12),
        _ => None,
    }
}

/// Convert Unix timestamp (milliseconds since 1970-01-01 00:00:00 UTC) to Julian Date.
///
/// # Arguments
/// * `timestamp_ms` - Unix timestamp in milliseconds
///
/// # Returns
/// Julian Date (JD)
pub fn unix_timestamp_to_jd(timestamp_ms: f64) -> f64 {
    // Unix epoch is January 1, 1970, 00:00:00 UTC
    // Julian Date for Unix epoch: 2440587.5
    // 1 day = 86400000 milliseconds
    timestamp_ms / 86400000.0 + 2440587.5
}


