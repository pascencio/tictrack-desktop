mod api;
mod config;

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_config = config::AppConfig::from_env();
    let api_state = api::ApiState::new(app_config.backend_url.clone());

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(if cfg!(debug_assertions) {
                    tauri_plugin_log::log::LevelFilter::Debug
                } else {
                    tauri_plugin_log::log::LevelFilter::Info
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            app.manage(api_state);
            if let Some(url) = &app_config.backend_url {
                tauri_plugin_log::log::info!("TICTRACK_BACKEND_URL configured: {url}");
            } else {
                tauri_plugin_log::log::warn!(
                    "TICTRACK_BACKEND_URL not set; frontend will show missing-config banner"
                );
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            api::api_request,
            api::get_backend_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}