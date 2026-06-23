use std::time::Duration;

use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

/// Shared application state managed by Tauri via `app.manage(...)`.
///
/// Holds a long-lived `reqwest::Client` (connection pooling) and the
/// backend base URL read once at startup from `TICTRACK_BACKEND_URL`.
#[derive(Debug)]
pub struct ApiState {
    pub client: Client,
    pub backend_url: Option<String>,
}

impl ApiState {
    pub fn new(backend_url: Option<String>) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");

        Self {
            client,
            backend_url,
        }
    }
}

/// Request envelope sent from the frontend through `invoke('api_request', ...)`.
#[derive(Debug, Deserialize)]
pub struct ApiRequest {
    pub method: String,
    pub path: String,
    pub body: Option<Value>,
}

/// Response envelope returned to the frontend after a successful HTTP call.
#[derive(Debug, Serialize)]
pub struct ApiResponse {
    pub status: u16,
    pub body: Value,
}

/// All error variants the frontend can receive from `api_request` /
/// `get_backend_url`. The `#[serde(tag = "kind", content = "message")]`
/// attribute gives the frontend a discriminated union:
/// `{ kind: "BackendNotConfigured", message: "..." }`.
#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum ApiError {
    #[error("TICTRACK_BACKEND_URL no está configurada")]
    BackendNotConfigured,

    #[error("Error HTTP {status}")]
    HttpError { status: u16, body: String },

    #[error("No se pudo conectar con el backend: {0}")]
    ConnectionError(String),

    #[error("Respuesta inválida del backend: {0}")]
    SerializationError(String),
}

fn parse_method(method: &str) -> Result<Method, ApiError> {
    match method.to_uppercase().as_str() {
        "GET" => Ok(Method::GET),
        "POST" => Ok(Method::POST),
        "PUT" => Ok(Method::PUT),
        "PATCH" => Ok(Method::PATCH),
        "DELETE" => Ok(Method::DELETE),
        other => Err(ApiError::SerializationError(format!(
            "método HTTP no soportado: {other}"
        ))),
    }
}

/// Execute an HTTP request from the frontend through Rust to the BFF.
///
/// URL construction: `format!("{backend_url}{path}")`. The frontend only
/// sees `path` (e.g. `/tasks`) and never the full URL.
#[tauri::command]
pub async fn api_request(
    req: ApiRequest,
    state: tauri::State<'_, ApiState>,
) -> Result<ApiResponse, ApiError> {
    let base = state
        .backend_url
        .as_deref()
        .ok_or(ApiError::BackendNotConfigured)?;

    let method = parse_method(&req.method)?;
    let path = &req.path;
    let url = format!("{base}{path}");

    let mut builder = state.client.request(method, &url);
    if let Some(body) = req.body {
        builder = builder.json(&body);
    }

    let response = builder.send().await.map_err(|e| {
        ApiError::ConnectionError(format!("{e} (is_connect: {}, is_timeout: {})", e.is_connect(), e.is_timeout()))
    })?;

    let status = response.status().as_u16();

    // Read the response body as text first so we can surface it on error.
    let body_text = response
        .text()
        .await
        .map_err(|e| ApiError::ConnectionError(format!("failed to read response body: {e}")))?;

    if status >= 400 {
        return Err(ApiError::HttpError {
            status,
            body: body_text,
        });
    }

    // Try to parse as JSON; if the body is empty or not JSON, fall back to a
    // string payload so the frontend still receives something.
    let body: Value = if body_text.trim().is_empty() {
        Value::Null
    } else {
        serde_json::from_str(&body_text).unwrap_or(Value::String(body_text))
    };

    Ok(ApiResponse { status, body })
}

/// Return the configured backend URL, or `BackendNotConfigured` if unset.
///
/// Used by the frontend to decide whether to render the persistent banner.
#[tauri::command]
pub fn get_backend_url(state: tauri::State<'_, ApiState>) -> Result<String, ApiError> {
    state
        .backend_url
        .clone()
        .ok_or(ApiError::BackendNotConfigured)
}