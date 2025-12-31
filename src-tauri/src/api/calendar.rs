use super::{CalendarEvent, CalendarListEntry, EventDateTime};
use crate::config::{load_config, save_config, CalendarSource};
use crate::oauth::google::get_valid_access_token;
use chrono::{Duration, Utc};
use reqwest::Client;
use serde::Deserialize;

const CALENDAR_API_BASE: &str = "https://www.googleapis.com/calendar/v3";

// Default colors for calendars
const DEFAULT_COLORS: [&str; 8] = ["blue", "purple", "green", "red", "orange", "pink", "cyan", "amber"];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventsListResponse {
    items: Option<Vec<ApiEvent>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CalendarListApiResponse {
    items: Option<Vec<ApiCalendarListEntry>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiCalendarListEntry {
    id: String,
    summary: Option<String>,
    background_color: Option<String>,
    #[serde(default)]
    primary: Option<bool>,
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

/// Fetch the list of calendars the user has access to
pub async fn fetch_calendar_list() -> Result<Vec<CalendarListEntry>, String> {
    let access_token = get_valid_access_token().await?;
    let client = Client::new();

    let url = format!("{}/users/me/calendarList", CALENDAR_API_BASE);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("Calendar list API request failed: {}", e))?;

    if response.status().as_u16() == 401 {
        return Err("Google Calendar authentication expired. Please re-authenticate.".to_string());
    }

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Calendar list API error {}: {}", status, error_text));
    }

    let data: CalendarListApiResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse calendar list response: {}", e))?;

    let calendars = data
        .items
        .unwrap_or_default()
        .into_iter()
        .map(|cal| CalendarListEntry {
            id: cal.id,
            summary: cal.summary.unwrap_or_else(|| "Unnamed Calendar".to_string()),
            background_color: cal.background_color,
            primary: cal.primary.unwrap_or(false),
        })
        .collect();

    Ok(calendars)
}

/// Get configured calendar sources, or auto-discover them
pub async fn get_calendar_sources() -> Result<Vec<CalendarSource>, String> {
    let config = load_config().map_err(|e| e.to_string())?;

    // If calendars are already configured, return them
    if !config.google_calendar.calendars.is_empty() {
        return Ok(config.google_calendar.calendars);
    }

    // Otherwise, fetch from Google and auto-configure
    let calendar_list = fetch_calendar_list().await?;

    let sources: Vec<CalendarSource> = calendar_list
        .into_iter()
        .enumerate()
        .map(|(i, cal)| CalendarSource {
            id: cal.id,
            name: cal.summary,
            color: DEFAULT_COLORS[i % DEFAULT_COLORS.len()].to_string(),
        })
        .collect();

    // Save the discovered calendars to config
    let mut updated_config = config;
    updated_config.google_calendar.calendars = sources.clone();
    let _ = save_config(&updated_config);

    Ok(sources)
}

/// Fetch events from a single calendar
async fn fetch_events_from_calendar(
    client: &Client,
    access_token: &str,
    calendar_id: &str,
    time_min: &str,
    time_max: &str,
) -> Result<Vec<ApiEvent>, String> {
    let url = format!(
        "{}/calendars/{}/events?timeMin={}&timeMax={}&singleEvents=true&orderBy=startTime&maxResults=100",
        CALENDAR_API_BASE,
        urlencoding::encode(calendar_id),
        urlencoding::encode(time_min),
        urlencoding::encode(time_max)
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
        // Log error but don't fail the entire request
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        eprintln!("Calendar {} API error {}: {}", calendar_id, status, error_text);
        return Ok(vec![]);
    }

    let data: EventsListResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse calendar response: {}", e))?;

    Ok(data.items.unwrap_or_default())
}

pub async fn fetch_calendar_events() -> Result<Vec<CalendarEvent>, String> {
    let access_token = get_valid_access_token().await?;
    let client = Client::new();

    // Get events from now until 14 days from now (for week view navigation)
    let time_min = Utc::now().to_rfc3339();
    let time_max = (Utc::now() + Duration::days(14)).to_rfc3339();

    // Get calendar sources
    let sources = get_calendar_sources().await?;

    if sources.is_empty() {
        return Ok(vec![]);
    }

    // Fetch events from all calendars
    let mut all_events: Vec<CalendarEvent> = Vec::new();

    for source in &sources {
        let events = fetch_events_from_calendar(
            &client,
            &access_token,
            &source.id,
            &time_min,
            &time_max,
        )
        .await?;

        for event in events {
            if let (Some(start), Some(end)) = (event.start, event.end) {
                all_events.push(CalendarEvent {
                    id: format!("{}-{}", source.id, event.id),
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
                    calendar_id: source.id.clone(),
                    calendar_name: source.name.clone(),
                    calendar_color: source.color.clone(),
                });
            }
        }
    }

    // Sort by start time
    all_events.sort_by(|a, b| {
        let a_time = a.start.date_time.as_ref().or(a.start.date.as_ref());
        let b_time = b.start.date_time.as_ref().or(b.start.date.as_ref());
        a_time.cmp(&b_time)
    });

    Ok(all_events)
}

pub fn is_calendar_configured() -> bool {
    if let Ok(config) = crate::config::load_config() {
        !config.google_calendar.access_token.is_empty()
    } else {
        false
    }
}
