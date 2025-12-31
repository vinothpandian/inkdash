use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Config directory not found")]
    NoDirFound,
    #[error("Failed to read config: {0}")]
    ReadError(#[from] std::io::Error),
    #[error("Failed to parse config: {0}")]
    ParseError(#[from] toml::de::Error),
    #[error("Failed to serialize config: {0}")]
    SerializeError(#[from] toml::ser::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub weather: WeatherConfig,
    pub stocks: StocksConfig,
    pub ticktick: TickTickConfig,
    pub google_calendar: GoogleCalendarConfig,
    pub timezones: TimezonesConfig,
    pub display: DisplayConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeatherConfig {
    pub latitude: f64,
    pub longitude: f64,
    pub timezone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StocksConfig {
    pub tickers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickTickConfig {
    pub access_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleCalendarConfig {
    pub client_id: String,
    pub client_secret: String,
    #[serde(default)]
    pub access_token: String,
    #[serde(default)]
    pub refresh_token: String,
    #[serde(default)]
    pub token_expiry: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimezoneEntry {
    pub name: String,
    pub tz: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimezonesConfig {
    pub zones: Vec<TimezoneEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayConfig {
    #[serde(default)]
    pub fullscreen: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            weather: WeatherConfig {
                latitude: 43.6532,
                longitude: -79.3832,
                timezone: "America/Toronto".to_string(),
            },
            stocks: StocksConfig {
                tickers: vec![
                    "TRI".to_string(),
                    "VEQT.TO".to_string(),
                    "VGRO.TO".to_string(),
                    "ZGLD.TO".to_string(),
                ],
            },
            ticktick: TickTickConfig {
                access_token: String::new(),
            },
            google_calendar: GoogleCalendarConfig {
                client_id: String::new(),
                client_secret: String::new(),
                access_token: String::new(),
                refresh_token: String::new(),
                token_expiry: String::new(),
            },
            timezones: TimezonesConfig {
                zones: vec![
                    TimezoneEntry {
                        name: "Minnesota".to_string(),
                        tz: "America/Chicago".to_string(),
                    },
                    TimezoneEntry {
                        name: "London".to_string(),
                        tz: "Europe/London".to_string(),
                    },
                    TimezoneEntry {
                        name: "Zug".to_string(),
                        tz: "Europe/Zurich".to_string(),
                    },
                    TimezoneEntry {
                        name: "India".to_string(),
                        tz: "Asia/Kolkata".to_string(),
                    },
                    TimezoneEntry {
                        name: "Australia".to_string(),
                        tz: "Australia/Sydney".to_string(),
                    },
                ],
            },
            display: DisplayConfig { fullscreen: false },
        }
    }
}

pub fn get_config_dir() -> Result<PathBuf, ConfigError> {
    dirs::config_dir()
        .map(|p| p.join("inkdash"))
        .ok_or(ConfigError::NoDirFound)
}

pub fn get_config_path() -> Result<PathBuf, ConfigError> {
    Ok(get_config_dir()?.join("config.toml"))
}

pub fn load_config() -> Result<AppConfig, ConfigError> {
    let path = get_config_path()?;

    if !path.exists() {
        // Create default config
        let config = AppConfig::default();
        save_config(&config)?;
        return Ok(config);
    }

    let content = fs::read_to_string(&path)?;
    let config: AppConfig = toml::from_str(&content)?;
    Ok(config)
}

pub fn save_config(config: &AppConfig) -> Result<(), ConfigError> {
    let dir = get_config_dir()?;
    fs::create_dir_all(&dir)?;

    let path = dir.join("config.toml");
    let content = toml::to_string_pretty(config)?;
    fs::write(path, content)?;
    Ok(())
}
