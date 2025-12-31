use super::{HourlyWeather, WeatherData, WeatherLocation};
use crate::config::WeatherConfig;
use chrono::Local;
use reqwest::Client;
use serde::Deserialize;

const OPEN_METEO_BASE: &str = "https://api.open-meteo.com/v1/forecast";

#[derive(Debug, Deserialize)]
struct OpenMeteoResponse {
    current: CurrentWeather,
    hourly: HourlyData,
    daily: DailyData,
}

#[derive(Debug, Deserialize)]
struct CurrentWeather {
    temperature_2m: f64,
    apparent_temperature: f64,
    weather_code: i32,
    relative_humidity_2m: i32,
    wind_speed_10m: f64,
}

#[derive(Debug, Deserialize)]
struct HourlyData {
    time: Vec<String>,
    temperature_2m: Vec<f64>,
    weather_code: Vec<i32>,
}

#[derive(Debug, Deserialize)]
struct DailyData {
    sunrise: Vec<String>,
    sunset: Vec<String>,
}

fn map_weather_code(code: i32) -> &'static str {
    match code {
        0 => "clear",
        1..=3 => "partly-cloudy",
        45..=48 => "fog",
        51..=67 => "rain",
        71..=77 => "snow",
        80..=82 => "rain",
        85..=86 => "snow",
        95..=99 => "thunderstorm",
        _ => "cloudy",
    }
}

pub async fn fetch_weather(config: &WeatherConfig) -> Result<WeatherData, String> {
    let client = Client::new();

    let url = format!(
        "{}?latitude={}&longitude={}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,weather_code&daily=sunrise,sunset&timezone={}&forecast_days=1",
        OPEN_METEO_BASE,
        config.latitude,
        config.longitude,
        urlencoding::encode(&config.timezone)
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Weather API request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Weather API error: {}", response.status()));
    }

    let data: OpenMeteoResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse weather response: {}", e))?;

    // Build hourly forecast for fixed 0-23 hours (12am to 11pm)
    let mut hourly_forecast = Vec::with_capacity(24);
    for hour in 0..24 {
        let temp = data.hourly.temperature_2m.get(hour).copied().unwrap_or(0.0);
        let code = data.hourly.weather_code.get(hour).copied().unwrap_or(0);

        hourly_forecast.push(HourlyWeather {
            hour: hour as i32,
            temperature: temp.round() as i32,
            condition: map_weather_code(code).to_string(),
        });
    }

    Ok(WeatherData {
        location: WeatherLocation {
            name: "Toronto".to_string(),
            latitude: config.latitude,
            longitude: config.longitude,
        },
        condition: map_weather_code(data.current.weather_code).to_string(),
        temperature: data.current.temperature_2m.round() as i32,
        feels_like: data.current.apparent_temperature.round() as i32,
        humidity: data.current.relative_humidity_2m,
        wind_speed: data.current.wind_speed_10m.round() as i32,
        unit: "celsius".to_string(),
        sunrise: data.daily.sunrise.first().cloned().unwrap_or_default(),
        sunset: data.daily.sunset.first().cloned().unwrap_or_default(),
        hourly_forecast,
        last_updated: Local::now().to_rfc3339(),
    })
}
