use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct BackendState {
    child: Mutex<Option<CommandChild>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(BackendState {
            child: Mutex::new(None),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar_command = app
                .shell()
                .sidecar("candle-backend")
                .expect("Failed to define candle-backend sidecar engine");

            match sidecar_command.spawn() {
                Ok((_rx, child_proc)) => {
                    let state = app.state::<BackendState>();
                    *state.child.lock().unwrap() = Some(child_proc);
                    println!("[Tauri] Candle Python FastAPI backend sidecar successfully spawned.");
                }
                Err(e) => {
                    eprintln!("Failed to spawn compiled python backend sidecar: {}", e);
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let state = app_handle.state::<BackendState>();
                let mut lock = state.child.lock().unwrap();
                if let Some(child) = lock.take() {
                    let _ = child.kill();
                    println!("[Tauri] Backend process cleaned up successfully.");
                }
            }
        });
}

