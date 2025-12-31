use crate::config::{load_config, save_config, GoogleCalendarConfig};
use chrono::{DateTime, Duration, Utc};
use reqwest::Client;
use serde::Deserialize;
use std::sync::mpsc;
use std::thread;
use tiny_http::{Response, Server};
use url::Url;

const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const REDIRECT_URI: &str = "http://localhost:8847/oauth/callback";
const SCOPES: &str = "https://www.googleapis.com/auth/calendar.readonly";

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
    token_type: String,
}


pub fn start_oauth_flow(config: &GoogleCalendarConfig) -> Result<String, String> {
    if config.client_id.is_empty() || config.client_secret.is_empty() {
        return Err("Google Calendar client_id and client_secret must be configured".to_string());
    }

    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        GOOGLE_AUTH_URL,
        urlencoding::encode(&config.client_id),
        urlencoding::encode(REDIRECT_URI),
        urlencoding::encode(SCOPES)
    );

    // Open browser
    if let Err(e) = open::that(&auth_url) {
        return Err(format!("Failed to open browser: {}", e));
    }

    Ok(auth_url)
}

pub fn wait_for_oauth_callback() -> Result<String, String> {
    let (tx, rx) = mpsc::channel();

    // Start a temporary HTTP server to receive the callback
    thread::spawn(move || {
        let server = match Server::http("127.0.0.1:8847") {
            Ok(s) => s,
            Err(e) => {
                let _ = tx.send(Err(format!("Failed to start callback server: {}", e)));
                return;
            }
        };

        // Wait for a single request with timeout
        if let Some(request) = server.incoming_requests().next() {
            let url = request.url().to_string();

            // Parse the authorization code from the callback URL
            if let Ok(parsed) = Url::parse(&format!("http://localhost{}", url)) {
                if let Some(code) = parsed.query_pairs().find(|(k, _)| k == "code") {
                    // Send success response to browser
                    let response = Response::from_string(
                        "<html><body><h1>Authorization successful!</h1><p>You can close this window and return to inkdash.</p></body></html>"
                    ).with_header(
                        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap()
                    );
                    let _ = request.respond(response);
                    let _ = tx.send(Ok(code.1.to_string()));
                    return;
                }

                // Check for error
                if let Some(error) = parsed.query_pairs().find(|(k, _)| k == "error") {
                    let response = Response::from_string(
                        format!("<html><body><h1>Authorization failed</h1><p>{}</p></body></html>", error.1)
                    );
                    let _ = request.respond(response);
                    let _ = tx.send(Err(format!("OAuth error: {}", error.1)));
                    return;
                }
            }

            let response = Response::from_string("Invalid callback");
            let _ = request.respond(response);
            let _ = tx.send(Err("Invalid OAuth callback".to_string()));
        }
    });

    // Wait for the callback with a timeout
    rx.recv_timeout(std::time::Duration::from_secs(300))
        .map_err(|_| "OAuth callback timed out".to_string())?
}

pub async fn exchange_code_for_tokens(code: &str) -> Result<(), String> {
    let config = load_config().map_err(|e| format!("Failed to load config: {}", e))?;

    let client = Client::new();

    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("client_id", config.google_calendar.client_id.as_str()),
            ("client_secret", config.google_calendar.client_secret.as_str()),
            ("code", code),
            ("redirect_uri", REDIRECT_URI),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token exchange error: {}", error_text));
    }

    let tokens: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    // Calculate token expiry
    let expiry = Utc::now() + Duration::seconds(tokens.expires_in);

    // Update config with tokens
    let mut config = config;
    config.google_calendar.access_token = tokens.access_token;
    if let Some(refresh_token) = tokens.refresh_token {
        config.google_calendar.refresh_token = refresh_token;
    }
    config.google_calendar.token_expiry = expiry.to_rfc3339();

    save_config(&config).map_err(|e| format!("Failed to save config: {}", e))?;

    Ok(())
}

pub async fn refresh_access_token() -> Result<String, String> {
    let config = load_config().map_err(|e| format!("Failed to load config: {}", e))?;

    if config.google_calendar.refresh_token.is_empty() {
        return Err("No refresh token available. Please re-authenticate.".to_string());
    }

    let client = Client::new();

    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("client_id", config.google_calendar.client_id.as_str()),
            ("client_secret", config.google_calendar.client_secret.as_str()),
            ("refresh_token", config.google_calendar.refresh_token.as_str()),
            ("grant_type", "refresh_token"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token refresh failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token refresh error: {}", error_text));
    }

    let tokens: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    // Calculate token expiry
    let expiry = Utc::now() + Duration::seconds(tokens.expires_in);

    // Update config with new access token
    let mut config = config;
    config.google_calendar.access_token = tokens.access_token.clone();
    config.google_calendar.token_expiry = expiry.to_rfc3339();

    save_config(&config).map_err(|e| format!("Failed to save config: {}", e))?;

    Ok(tokens.access_token)
}

pub async fn get_valid_access_token() -> Result<String, String> {
    let config = load_config().map_err(|e| format!("Failed to load config: {}", e))?;

    if config.google_calendar.access_token.is_empty() {
        return Err("Not authenticated with Google Calendar".to_string());
    }

    // Check if token is expired
    if !config.google_calendar.token_expiry.is_empty() {
        if let Ok(expiry) = DateTime::parse_from_rfc3339(&config.google_calendar.token_expiry) {
            // Refresh if token expires in less than 5 minutes
            if expiry.with_timezone(&Utc) < Utc::now() + Duration::minutes(5) {
                return refresh_access_token().await;
            }
        }
    }

    Ok(config.google_calendar.access_token)
}
