use std::collections::HashMap;
use std::path::PathBuf;

use serde::Serialize;

const WALLHAVEN_API_BASE: &str = "https://wallhaven.cc/api/v1";

fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("Wallery/0.1 (desktop wallpaper app)")
        .build()
        .expect("failed to build http client")
}

/// Proxies a GET request to the Wallhaven API so the frontend never has to deal with CORS.
#[tauri::command]
async fn api_get(path: String, params: HashMap<String, String>) -> Result<serde_json::Value, String> {
    let url = format!("{WALLHAVEN_API_BASE}{path}");
    let client = http_client();
    let response = client
        .get(&url)
        .query(&params)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("Wallhaven API returned {status}"));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse API response: {e}"))
}

async fn download_bytes(url: &str) -> Result<(bytes::Bytes, String), String> {
    let client = http_client();
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Failed to download image ({})", response.status()));
    }

    let extension = url
        .rsplit('.')
        .next()
        .filter(|ext| ext.len() <= 4 && !ext.contains('/'))
        .unwrap_or("jpg")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image data: {e}"))?;

    Ok((bytes, extension))
}

fn mime_for_extension(ext: &str) -> &'static str {
    match ext.to_ascii_lowercase().as_str() {
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "image/jpeg",
    }
}

/// Fetches an image through Rust's own HTTP client instead of the webview's,
/// and returns it as a base64 data URL. This exists purely as a fallback for
/// when the webview's own network stack refuses a request that a plain HTTP
/// client has no trouble with at all — observed specifically for full-size
/// (never thumbnail) NSFW/sketchy originals, consistent with some local
/// security software treating an unsigned, freshly-built exe's *browser
/// engine* traffic to adult-content domains with more suspicion than a
/// generic outbound HTTP request from the process. Not meant as the normal
/// path — only as a last resort after the direct <img> attempts are exhausted.
#[tauri::command]
async fn fetch_image_data_url(url: String) -> Result<String, String> {
    let (bytes, extension) = download_bytes(&url).await?;
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);
    Ok(format!("data:{};base64,{}", mime_for_extension(&extension), encoded))
}

// IDesktopWallpaper::SetWallpaper refuses files under %LOCALAPPDATA% (returns
// ERROR_FILE_NOT_FOUND even though the file exists) but accepts anything under
// the Pictures folder, so the cache lives there instead of the OS cache dir.
fn cache_dir() -> Result<PathBuf, String> {
    let mut dir = dirs::picture_dir().ok_or("Could not resolve Pictures directory")?;
    dir.push("Wallery");
    dir.push(".cache");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create cache dir: {e}"))?;
    Ok(dir)
}

// No localized label here — the frontend builds "Monitor N" in whichever
// language is currently active from `index`, so this stays language-neutral.
#[derive(Serialize, Clone)]
struct MonitorInfo {
    id: String,
    index: i32,
    width: i32,
    height: i32,
}

/// Saves an image already cropped, resized, and color-adjusted client-side
/// (via a canvas 2D context, so the crop area and color filters both bake
/// into the pixels exactly as previewed), then either sets it as the
/// wallpaper (already an exact resolution match, so "fill" never has to
/// scale or letterbox it) or saves it to `save_folder`. `data_base64` is a
/// raw base64-encoded JPEG payload, no `data:...;base64,` prefix.
#[tauri::command]
async fn save_edited_wallpaper(
    id: String,
    data_base64: String,
    monitor: Option<String>,
    mode: String,
    save_folder: Option<String>,
) -> Result<String, String> {
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data_base64)
        .map_err(|e| format!("Failed to decode image data: {e}"))?;

    let mut path = cache_dir()?;
    path.push(format!("{id}-edit.jpg"));
    std::fs::write(&path, &bytes).map_err(|e| format!("Failed to save image: {e}"))?;

    if mode == "save" {
        let dir = match save_folder {
            Some(f) => PathBuf::from(f),
            None => {
                let mut dir = dirs::picture_dir().ok_or("Could not resolve Pictures directory")?;
                dir.push("Wallery");
                dir
            }
        };
        std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create folder: {e}"))?;
        let mut dest = dir;
        dest.push(format!("wallhaven-{id}-edit.jpg"));
        std::fs::copy(&path, &dest).map_err(|e| format!("Failed to copy image: {e}"))?;
        return Ok(dest.to_string_lossy().to_string());
    }

    apply_wallpaper(&path, monitor.as_deref(), "fill")?;
    Ok(path.to_string_lossy().to_string())
}

/// Downloads a wallpaper and sets it as the Windows desktop background.
/// `monitor` is a device path from `list_monitors`, or `null`/omitted for all monitors.
/// `style` is one of: fill, fit, stretch, tile, center, span.
#[tauri::command]
async fn set_wallpaper(id: String, url: String, monitor: Option<String>, style: String) -> Result<(), String> {
    let (bytes, extension) = download_bytes(&url).await?;

    let mut path = cache_dir()?;
    path.push(format!("{id}.{extension}"));
    std::fs::write(&path, &bytes).map_err(|e| format!("Failed to save image: {e}"))?;

    apply_wallpaper(&path, monitor.as_deref(), &style)
}

/// Downloads a wallpaper into the given folder (or Pictures/Wallery by default) and returns the saved path.
#[tauri::command]
async fn save_wallpaper(id: String, url: String, folder: Option<String>) -> Result<String, String> {
    let (bytes, extension) = download_bytes(&url).await?;

    let dir = match folder {
        Some(f) => PathBuf::from(f),
        None => {
            let mut dir = dirs::picture_dir().ok_or("Could not resolve Pictures directory")?;
            dir.push("Wallery");
            dir
        }
    };
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create folder: {e}"))?;

    let mut path = dir.clone();
    path.push(format!("wallhaven-{id}.{extension}"));
    std::fs::write(&path, &bytes).map_err(|e| format!("Failed to save image: {e}"))?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn list_monitors() -> Result<Vec<MonitorInfo>, String> {
    monitors_impl()
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Drops a widget window to the bottom of the Z-order — below every other
/// top-level window, but still above the desktop wallpaper/icons layer
/// (which is always behind everything regardless). Unlike reparenting into
/// the desktop's WorkerW, this never touches the window's parent, so it
/// can't break the layered/transparent rendering that trick did. It's a
/// one-shot placement, not a standing "always at the back" rule — call it
/// again (e.g. after the window is briefly focused) if something bumps it
/// forward.
#[cfg(target_os = "windows")]
#[tauri::command]
fn send_widget_to_back(app: tauri::AppHandle, label: String) -> Result<(), String> {
    use tauri::Manager;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{SetWindowPos, HWND_BOTTOM, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE};

    let window = app.get_webview_window(&label).ok_or_else(|| "Widget window not found".to_string())?;
    let raw_hwnd = window.hwnd().map_err(|e| format!("Failed to get window handle: {e}"))?;
    let target = HWND(raw_hwnd.0);

    unsafe {
        SetWindowPos(target, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE).map_err(|e| format!("SetWindowPos failed: {e}"))?;
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn send_widget_to_back(_app: tauri::AppHandle, _label: String) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
fn monitors_impl() -> Result<Vec<MonitorInfo>, String> {
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_APARTMENTTHREADED};
    use windows::Win32::UI::Shell::{DesktopWallpaper, IDesktopWallpaper};

    unsafe {
        let init = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let result: Result<Vec<MonitorInfo>, String> = (|| {
            let wallpaper: IDesktopWallpaper = CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create wallpaper COM object: {e}"))?;
            let count = wallpaper
                .GetMonitorDevicePathCount()
                .map_err(|e| format!("Failed to count monitors: {e}"))?;

            let mut monitors = Vec::new();
            for i in 0..count {
                if let Ok(mid) = wallpaper.GetMonitorDevicePathAt(i) {
                    let id = mid.to_string().unwrap_or_default();
                    let (width, height) = wallpaper
                        .GetMonitorRECT(mid)
                        .map(|rect| (rect.right - rect.left, rect.bottom - rect.top))
                        .unwrap_or((0, 0));
                    monitors.push(MonitorInfo { id, index: (i + 1) as i32, width, height });
                }
            }
            Ok(monitors)
        })();

        if init.is_ok() {
            CoUninitialize();
        }
        result
    }
}

#[cfg(not(target_os = "windows"))]
fn monitors_impl() -> Result<Vec<MonitorInfo>, String> {
    Ok(Vec::new())
}

#[cfg(target_os = "windows")]
pub fn apply_wallpaper(path: &PathBuf, monitor: Option<&str>, style: &str) -> Result<(), String> {
    use windows::core::{HSTRING, PCWSTR};
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_APARTMENTTHREADED};
    use windows::Win32::UI::Shell::{
        DesktopWallpaper, IDesktopWallpaper, DWPOS_CENTER, DWPOS_FILL, DWPOS_FIT, DWPOS_SPAN, DWPOS_STRETCH, DWPOS_TILE,
    };

    let position = match style {
        "fit" => DWPOS_FIT,
        "stretch" => DWPOS_STRETCH,
        "tile" => DWPOS_TILE,
        "center" => DWPOS_CENTER,
        "span" => DWPOS_SPAN,
        _ => DWPOS_FILL,
    };

    // The modern per-monitor-aware API (Windows 8+). Passing a null monitor id applies
    // the same picture to every monitor, which avoids the legacy SPI_SETDESKWALLPAPER
    // black-screen glitch on machines where wallpaper is managed per-monitor.
    unsafe {
        let init = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let result: Result<(), String> = (|| {
            let wallpaper: IDesktopWallpaper = CoCreateInstance(&DesktopWallpaper, None, CLSCTX_ALL)
                .map_err(|e| format!("Failed to create wallpaper COM object: {e}"))?;

            let hpath = HSTRING::from(path.to_string_lossy().as_ref());
            let hmonitor = monitor.map(HSTRING::from);
            let monitor_pcwstr = hmonitor.as_ref().map(|h| PCWSTR(h.as_ptr())).unwrap_or(PCWSTR::null());

            wallpaper
                .SetPosition(position)
                .map_err(|e| format!("Failed to set wallpaper position: {e}"))?;
            wallpaper
                .SetWallpaper(monitor_pcwstr, &hpath)
                .map_err(|e| format!("Failed to set wallpaper: {e}"))?;
            Ok(())
        })();

        if init.is_ok() {
            CoUninitialize();
        }
        result
    }
}

#[cfg(not(target_os = "windows"))]
pub fn apply_wallpaper(_path: &PathBuf, _monitor: Option<&str>, _style: &str) -> Result<(), String> {
    Err("Setting the wallpaper is only supported on Windows".to_string())
}

/// The tray menu is native OS UI, outside the React app, so it can't read
/// the app's i18n dictionary directly — the frontend calls this (on load and
/// whenever the language changes) to rebuild it with translated text.
#[tauri::command]
fn set_tray_labels(app: tauri::AppHandle, show: String, quit: String) -> Result<(), String> {
    use tauri::menu::{Menu, MenuItem};

    let show_item = MenuItem::with_id(&app, "show", show, true, None::<&str>).map_err(|e| e.to_string())?;
    let quit_item = MenuItem::with_id(&app, "quit", quit, true, None::<&str>).map_err(|e| e.to_string())?;
    let menu = Menu::with_items(&app, &[&show_item, &quit_item]).map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
    use tauri::{Manager, WindowEvent};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart".into()]),
        ))
        .invoke_handler(tauri::generate_handler![
            api_get,
            set_wallpaper,
            save_wallpaper,
            save_edited_wallpaper,
            list_monitors,
            quit_app,
            set_tray_labels,
            fetch_image_data_url,
            send_widget_to_back
        ])
        .setup(|app| {
            // English fallback until the frontend's first setTrayLabels call
            // (moments after launch) replaces it with the active UI language.
            let show_item = MenuItem::with_id(app, "show", "Show Wallery", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            // The main window is created hidden (see tauri.conf.json) so a
            // normal launch can show it with no flash of an unstyled/empty
            // frame; autostart's whole point is to start quietly in the
            // tray, so it's the one case that skips this and stays hidden.
            let launched_via_autostart = std::env::args().any(|a| a == "--autostart");
            if !launched_via_autostart {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
