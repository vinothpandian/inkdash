pub mod weather;
pub mod stocks;
pub mod ticktick;
pub mod calendar;

use serde::{Deserialize, Serialize};

// Shared types for API responses

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherData {
    pub location: WeatherLocation,
    pub condition: String,
    pub temperature: i32,
    pub feels_like: i32,
    pub humidity: i32,
    pub wind_speed: i32,
    pub unit: String,
    pub sunrise: String,
    pub sunset: String,
    pub hourly_forecast: Vec<HourlyWeather>,
    pub last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeatherLocation {
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyWeather {
    pub hour: i32,
    pub temperature: i32,
    pub condition: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StockData {
    pub ticker: String,
    pub name: String,
    pub price: f64,
    pub change: f64,
    pub change_percent: f64,
    pub currency: String,
    pub sparkline_data: Vec<f64>,
    pub price_hint: i32,
    pub last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TickTickData {
    pub tasks: Vec<TickTickTask>,
    pub projects: Vec<TickTickProject>,
    pub last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TickTickTask {
    pub id: String,
    pub title: String,
    pub is_completed: bool,
    pub priority: i32,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub project_id: String,
    pub project_name: Option<String>,
    pub tags: Vec<String>,
    pub created_time: String,
    pub modified_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TickTickProject {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub summary: String,
    pub description: Option<String>,
    pub start: EventDateTime,
    pub end: EventDateTime,
    pub location: Option<String>,
    pub html_link: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventDateTime {
    pub date_time: Option<String>,
    pub date: Option<String>,
    pub time_zone: Option<String>,
}
