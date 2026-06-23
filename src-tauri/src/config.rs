use std::env;

/// Application configuration loaded from environment variables at startup.
///
/// All fields are optional: missing variables do NOT cause a startup failure.
/// The frontend reads the configuration through Tauri commands and surfaces
/// a persistent banner when `backend_url` is `None`.
#[derive(Debug, Clone)]
pub struct AppConfig {
    pub backend_url: Option<String>,
}

impl AppConfig {
    /// Build the configuration from the process environment.
    ///
    /// Reads `TICTRACK_BACKEND_URL`. If missing or not valid UTF-8, the field
    /// is set to `None`. The function never returns `Result`; the absence of
    /// a variable is a valid runtime state.
    pub fn from_env() -> Self {
        let backend_url = env::var("TICTRACK_BACKEND_URL")
            .ok()
            .filter(|s| !s.trim().is_empty());

        Self { backend_url }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_env_with_unset_var_returns_none() {
        // SAFETY: tests are single-threaded for env mutation in this scope.
        // SAFETY: process-wide env mutation only; no concurrent access in test.
        unsafe { env::remove_var("TICTRACK_BACKEND_URL") };
        let cfg = AppConfig::from_env();
        assert!(cfg.backend_url.is_none());
    }
}