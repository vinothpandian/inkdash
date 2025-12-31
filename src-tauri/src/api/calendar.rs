use super::{CalendarEvent, EventDateTime};
use crate::oauth::google::get_valid_access_token;
use chrono::{Duration, Utc};
use reqwest::Client;
use serde::Deserialize;

const CALENDAR_API_BASE: &str = "https://www.googleapis.com/calendar/v3";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CalendarListResponse {
    items: Option<Vec<ApiEvent>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiEvent {
    id: String,
    summary: Option<String>,
    description: Option<String>,
    start: Option<ApiDateTime>,
    end: Option<ApiDateTime>,
    location: Option<String>,
    html_link: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiDateTime {
    date_time: Option<String>,
    date: Option<String>,
    time_zone: Option<String>,
}

pub async fn fetch_calendar_events() -> Result<Vec<CalendarEvent>, String> {
    let access_token = get_valid_access_token().await?;

    let client = Client::new();

    // Get events from now until 7 days from now
    let time_min = Utc::now().to_rfc3339();
    let time_max = (Utc::now() + Duration::days(7)).to_rfc3339();

    let url = format!(
        "{}/calendars/primary/events?timeMin={}&timeMax={}&singleEvents=true&orderBy=startTime&maxResults=50",
        CALENDAR_API_BASE,
        urlencoding::encode(&time_min),
        urlencoding::encode(&time_max)
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("Calendar API request failed: {}", e))?;

    if response.status().as_u16() == 401 {
        return Err("Google Calendar authentication expired. Please re-authenticate.".to_string());
    }

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Calendar API error {}: {}", status, error_text));
    }

    let data: CalendarListResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse calendar response: {}", e))?;

    let events = data
        .items
        .unwrap_or_default()
        .into_iter()
        .filter_map(|event| {
            let start = event.start?;
            let end = event.end?;

            Some(CalendarEvent {
                id: event.id,
                summary: event.summary.unwrap_or_else(|| "(No title)".to_string()),
                description: event.description,
                start: EventDateTime {
                    date_time: start.date_time,
                    date: start.date,
                    time_zone: start.time_zone,
                },
                end: EventDateTime {
                    date_time: end.date_time,
                    date: end.date,
                    time_zone: end.time_zone,
                },
                location: event.location,
                html_link: event.html_link,
            })
        })
        .collect();

    Ok(events)
}

pub fn is_calendar_configured() -> bool {
    if let Ok(config) = crate::config::load_config() {
        !config.google_calendar.access_token.is_empty()
    } else {
        false
    }
}
