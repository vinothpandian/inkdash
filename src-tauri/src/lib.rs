mod api;
mod config;
mod oauth;

use api::{CalendarEvent, CalendarListEntry, StockData, TickTickData, WeatherData};
use config::{AppConfig, CalendarSource};
use tauri::{Manager, WebviewWindow};

// Tauri Commands

#[tauri::command]
fn get_config() -> Result<AppConfig, String> {
    config::load_config().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config(new_config: AppConfig) -> Result<(), String> {
    config::save_config(&new_config).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_weather() -> Result<WeatherData, String> {
    let config = config::load_config().map_err(|e| e.to_string())?;
    api::weather::fetch_weather(&config.weather).await
}

#[tauri::command]
async fn fetch_stocks() -> Result<Vec<StockData>, String> {
    let config = config::load_config().map_err(|e| e.to_string())?;
    api::stocks::fetch_stocks(&config.stocks.tickers).await
}

#[tauri::command]
async fn fetch_ticktick_tasks() -> Result<TickTickData, String> {
    let config = config::load_config().map_err(|e| e.to_string())?;
    api::ticktick::fetch_ticktick(&config.ticktick.access_token).await
}

#[tauri::command]
async fn fetch_calendar_events() -> Result<Vec<CalendarEvent>, String> {
    api::calendar::fetch_calendar_events().await
}

#[tauri::command]
async fn fetch_calendar_list() -> Result<Vec<CalendarListEntry>, String> {
    api::calendar::fetch_calendar_list().await
}

#[tauri::command]
async fn get_calendar_sources() -> Result<Vec<CalendarSource>, String> {
    api::calendar::get_calendar_sources().await
}

#[tauri::command]
fn is_calendar_configured() -> bool {
    api::calendar::is_calendar_configured()
}

#[tauri::command]
async fn start_google_oauth() -> Result<String, String> {
    let config = config::load_config().map_err(|e| e.to_string())?;
    oauth::google::start_oauth_flow(&config.google_calendar)
}

#[tauri::command]
async fn complete_google_oauth() -> Result<(), String> {
    // Wait for the OAuth callback
    let code = tokio::task::spawn_blocking(|| oauth::google::wait_for_oauth_callback())
        .await
        .map_err(|e| format!("Task failed: {}", e))??;

    // Exchange the code for tokens
    oauth::google::exchange_code_for_tokens(&code).await
}

#[tauri::command]
fn toggle_fullscreen(window: WebviewWindow) -> Result<(), String> {
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window
        .set_fullscreen(!is_fullscreen)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_fullscreen_state(window: WebviewWindow) -> Result<bool, String> {
    window.is_fullscreen().map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct RefreshIntervals {
    ticktick_minutes: u32,
    calendar_minutes: u32,
}

#[tauri::command]
fn get_refresh_intervals() -> Result<RefreshIntervals, String> {
    let config = config::load_config().map_err(|e| e.to_string())?;
    Ok(RefreshIntervals {
        ticktick_minutes: config.ticktick.refresh_interval_minutes,
        calendar_minutes: config.google_calendar.refresh_interval_minutes,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Set up logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Register F11 global shortcut for fullscreen toggle
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut};

                let shortcut = Shortcut::new(None, Code::F11);
                let app_handle = app.handle().clone();

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |_app, _shortcut, event| {
                            if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed
                            {
                                if let Some(window) = app_handle.get_webview_window("main") {
                                    if let Ok(is_fullscreen) = window.is_fullscreen() {
                                        let _ = window.set_fullscreen(!is_fullscreen);
                                    }
                                }
                            }
                        })
                        .build(),
                )?;

                app.global_shortcut().register(shortcut)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            fetch_weather,
            fetch_stocks,
            fetch_ticktick_tasks,
            fetch_calendar_events,
            fetch_calendar_list,
            get_calendar_sources,
            is_calendar_configured,
            start_google_oauth,
            complete_google_oauth,
            toggle_fullscreen,
            get_fullscreen_state,
            get_refresh_intervals,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
