use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

use crate::config::get_config_dir;

#[derive(Error, Debug)]
pub enum TimelineError {
    #[error("Config directory not found")]
    NoDirFound,
    #[error("Failed to read timeline config: {0}")]
    ReadError(#[from] std::io::Error),
    #[error("Failed to parse timeline config: {0}")]
    ParseError(#[from] toml::de::Error),
}

/// A single event on the timeline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEvent {
    /// Time in "HH:MM" format
    pub time: String,
    /// Label to display for this event
    pub label: String,
    /// Event type: "marker", "range-start", or "range-end"
    #[serde(rename = "type")]
    pub event_type: String,
}

/// A schedule containing a list of events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schedule {
    pub events: Vec<TimelineEvent>,
}

/// An override schedule for specific days
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineOverride {
    /// Days this override applies to (lowercase: monday, tuesday, etc.)
    pub days: Vec<String>,
    /// Events for this override
    pub events: Vec<TimelineEvent>,
}

/// The full timeline configuration from timeline.toml
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineConfig {
    /// Start hour for the timeline display (default: 6)
    #[serde(default = "default_start_hour")]
    pub start_hour: u8,
    /// End hour for the timeline display (default: 23)
    #[serde(default = "default_end_hour")]
    pub end_hour: u8,
    /// Default schedule used when no override matches
    pub default: Schedule,
    /// Optional day-specific overrides
    pub overrides: Option<Vec<TimelineOverride>>,
}

fn default_start_hour() -> u8 {
    6
}

fn default_end_hour() -> u8 {
    23
}

/// Response struct sent to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineResponse {
    pub events: Vec<TimelineEvent>,
    pub start_hour: u8,
    pub end_hour: u8,
}

/// Get the path to timeline.toml in the config directory
pub fn get_timeline_path() -> Result<PathBuf, TimelineError> {
    get_config_dir()
        .map(|p| p.join("timeline.toml"))
        .map_err(|_| TimelineError::NoDirFound)
}

/// Create the default timeline config matching the hardcoded values in DayTimelineWidget.tsx
fn default_timeline_config() -> TimelineConfig {
    TimelineConfig {
        start_hour: 6,
        end_hour: 23,
        default: Schedule {
            events: vec![
                TimelineEvent {
                    time: "06:30".to_string(),
                    label: "Alarm".to_string(),
                    event_type: "marker".to_string(),
                },
                TimelineEvent {
                    time: "07:00".to_string(),
                    label: "Wake up".to_string(),
                    event_type: "marker".to_string(),
                },
                TimelineEvent {
                    time: "08:30".to_string(),
                    label: "Work".to_string(),
                    event_type: "range-start".to_string(),
                },
                TimelineEvent {
                    time: "18:00".to_string(),
                    label: "".to_string(),
                    event_type: "range-end".to_string(),
                },
                TimelineEvent {
                    time: "18:30".to_string(),
                    label: "Bubble time".to_string(),
                    event_type: "marker".to_string(),
                },
                TimelineEvent {
                    time: "21:30".to_string(),
                    label: "In bed".to_string(),
                    event_type: "marker".to_string(),
                },
                TimelineEvent {
                    time: "22:30".to_string(),
                    label: "Sleep".to_string(),
                    event_type: "marker".to_string(),
                },
            ],
        },
        overrides: None,
    }
}

/// Load timeline configuration from timeline.toml
/// Returns the default config if the file doesn't exist
pub fn load_timeline_config() -> Result<TimelineConfig, TimelineError> {
    let path = get_timeline_path()?;

    if !path.exists() {
        return Ok(default_timeline_config());
    }

    let content = fs::read_to_string(&path)?;
    let config: TimelineConfig = toml::from_str(&content)?;
    Ok(config)
}

/// Get the current day of the week as a lowercase string
fn get_current_day() -> String {
    use chrono::Local;
    Local::now().format("%A").to_string().to_lowercase()
}

/// Get the timeline schedule for today
/// Checks if any override matches the current day, otherwise returns the default schedule
pub fn get_timeline_for_today() -> Result<TimelineResponse, TimelineError> {
    let config = load_timeline_config()?;
    let today = get_current_day();

    // Check if any override matches today
    let events = if let Some(ref overrides) = config.overrides {
        overrides
            .iter()
            .find(|o| o.days.iter().any(|d| d.to_lowercase() == today))
            .map(|o| o.events.clone())
            .unwrap_or_else(|| config.default.events.clone())
    } else {
        config.default.events.clone()
    };

    Ok(TimelineResponse {
        events,
        start_hour: config.start_hour,
        end_hour: config.end_hour,
    })
}
