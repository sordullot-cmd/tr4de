use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Manager, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[allow(unused_mut)]
  let mut builder = tauri::Builder::default();

  // single-instance DOIT être enregistré en premier. Sur Windows/Linux, le deep
  // link OAuth (taotrade://...) relance l'exécutable : single-instance ramène la
  // fenêtre au premier plan et le plugin deep-link route l'URL vers l'instance
  // déjà ouverte (feature "deep-link" activée côté Cargo).
  #[cfg(any(target_os = "windows", target_os = "linux"))]
  {
    builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
      if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
      }
    }));
  }

  builder
    // OAuth : ouverture du navigateur système + capture du retour deep link.
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_deep_link::init())
    // Notifications natives (relayées depuis la Web Notification API du site).
    .plugin(tauri_plugin_notification::init())
    // Démarrage automatique au login.
    .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
    .setup(|app| {
      // Sur Windows/Linux, enregistre les schemes deep link au runtime
      // (nécessaire notamment en dev où l'OS ne connaît pas encore l'app).
      #[cfg(any(target_os = "windows", target_os = "linux"))]
      {
        use tauri_plugin_deep_link::DeepLinkExt;
        let _ = app.deep_link().register_all();
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Active le démarrage auto de Windows au premier lancement.
      let _ = app.autolaunch().enable();

      // Icône dans la zone de notification (system tray) + menu clic-droit.
      let open_i = MenuItem::with_id(app, "open", "Ouvrir", true, None::<&str>)?;
      let quit_i = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&open_i, &quit_i])?;

      TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("tao trade")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "open" => {
            if let Some(w) = app.get_webview_window("main") {
              let _ = w.show();
              let _ = w.set_focus();
            }
          }
          "quit" => app.exit(0),
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          // Clic gauche sur l'icône = rouvrir la fenêtre.
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            if let Some(w) = tray.app_handle().get_webview_window("main") {
              let _ = w.show();
              let _ = w.set_focus();
            }
          }
        })
        .build(app)?;

      Ok(())
    })
    .on_window_event(|window, event| {
      // La croix ✕ cache la fenêtre dans le tray au lieu de quitter l'app.
      if let WindowEvent::CloseRequested { api, .. } = event {
        let _ = window.hide();
        api.prevent_close();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
