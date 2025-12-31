use super::{TickTickData, TickTickProject, TickTickTask};
use chrono::Local;
use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;

const TICKTICK_API_BASE: &str = "https://api.ticktick.com/open/v1";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiProject {
    id: String,
    name: String,
    color: Option<String>,
    sort_order: i64,
    #[serde(default)]
    closed: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiTask {
    id: String,
    title: Option<String>,
    content: Option<String>,
    #[serde(default)]
    priority: i32,
    #[serde(default)]
    status: i32,
    due_date: Option<String>,
    start_date: Option<String>,
    project_id: String,
    #[serde(default)]
    tags: Vec<String>,
    // These fields may not be present in all API responses
    #[serde(default)]
    created_time: Option<String>,
    #[serde(default)]
    modified_time: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProjectData {
    #[serde(default)]
    tasks: Vec<ApiTask>,
}

async fn fetch_projects(client: &Client, access_token: &str) -> Result<Vec<ApiProject>, String> {
    let response = client
        .get(format!("{}/project", TICKTICK_API_BASE))
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("TickTick API request failed: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        log::error!("TickTick projects API error {}: {}", status, body);
        return Err(format!("TickTick API error: {} - {}", status, body));
    }

    let body = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse TickTick projects: {}", e))
}

async fn fetch_project_data(
    client: &Client,
    access_token: &str,
    project_id: &str,
) -> Result<ProjectData, String> {
    let response = client
        .get(format!("{}/project/{}/data", TICKTICK_API_BASE, project_id))
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("TickTick API request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("TickTick API error: {}", response.status()));
    }

    response
        .json()
        .await
        .map_err(|e| format!("Failed to parse TickTick project data: {}", e))
}

pub async fn fetch_ticktick(access_token: &str) -> Result<TickTickData, String> {
    if access_token.is_empty() {
        return Err("TickTick access token not configured".to_string());
    }

    let client = Client::new();

    // Fetch all projects
    let api_projects = fetch_projects(&client, access_token).await?;

    // Filter out closed projects
    let projects: Vec<TickTickProject> = api_projects
        .iter()
        .filter(|p| !p.closed)
        .map(|p| TickTickProject {
            id: p.id.clone(),
            name: p.name.clone(),
            color: p.color.clone(),
            sort_order: p.sort_order,
        })
        .collect();

    // Create a map of project id to name
    let project_map: HashMap<String, String> = projects
        .iter()
        .map(|p| (p.id.clone(), p.name.clone()))
        .collect();

    // Fetch tasks for each project
    let mut all_tasks = Vec::new();

    for project in &projects {
        match fetch_project_data(&client, access_token, &project.id).await {
            Ok(project_data) => {
                for task in project_data.tasks {
                    // Filter out completed tasks (status 0 = not completed)
                    if task.status == 0 {
                        all_tasks.push(TickTickTask {
                            id: task.id,
                            title: task.title.or(task.content).unwrap_or_else(|| "Untitled Task".to_string()),
                            is_completed: false,
                            priority: task.priority,
                            due_date: task.due_date,
                            start_date: task.start_date,
                            project_id: task.project_id.clone(),
                            project_name: project_map.get(&task.project_id).cloned(),
                            tags: task.tags,
                            created_time: task.created_time.unwrap_or_default(),
                            modified_time: task.modified_time.unwrap_or_default(),
                        });
                    }
                }
            }
            Err(e) => {
                log::warn!("TickTick: Failed to fetch project '{}': {}", project.name, e);
            }
        }
    }

    Ok(TickTickData {
        tasks: all_tasks,
        projects,
        last_updated: Local::now().to_rfc3339(),
    })
}
