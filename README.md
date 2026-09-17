# Wallery

[![GitHub release](https://img.shields.io/github/v/release/dmitrykirsh/wallery?label=release)](https://github.com/dmitrykirsh/wallery/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/dmitrykirsh/wallery/total)](https://github.com/dmitrykirsh/wallery/releases)
[![License](https://img.shields.io/github/license/dmitrykirsh/wallery)](LICENSE)
[![Stars](https://img.shields.io/github/stars/dmitrykirsh/wallery?style=social)](https://github.com/dmitrykirsh/wallery)

A fast, modern desktop wallpaper browser for [Wallhaven](https://wallhaven.cc), built with Tauri + React. Browse, filter, crop, and automatically rotate wallpapers — without ever leaving a native desktop app.

## Features

### Browse & get recommendations

A rotating hero banner (Hot / Top list / Latest / your own custom tags) and a personalized "Recommended for you" row based on your favorites and search history, plus an endless feed of wallpapers grouped by tag.

![Home page](https://github.com/user-attachments/assets/5baf0a7b-cdee-46da-96ca-6846a17ee34a)

### Search like on Wallhaven itself

The same resolution, aspect ratio, color, and sorting filters as the original site — including "At least" / "Exactly" resolution matching and grouped aspect ratios.

![Resolution filter](https://github.com/user-attachments/assets/c5b2b73e-cf9e-4146-9e01-42fda5786eea)
![Search results](https://github.com/user-attachments/assets/cacb7bb5-4c49-4fd2-b546-a1b415a0d190)

### Crop to your exact screen

Open any wallpaper, pick your monitor's resolution (auto-detected) or a custom size, pan and zoom to frame it, then save the crop or set it as your wallpaper directly.

![Wallpaper detail with crop tool](https://github.com/user-attachments/assets/2a462faa-2187-43d9-9739-368a17a55fa9)

### Automatic wallpaper slideshow

Set up rules — by tag, source, resolution, color, orientation — and Wallery rotates your wallpaper on a schedule, even per monitor, while running quietly in the tray.

![Slideshow rules](https://github.com/user-attachments/assets/ca08da86-b1e8-4739-b44e-bf1d62c2b66f)

Also included: favorites, search history, a multi-language UI (RU / EN / ES / FR / DE / ZH), launch-on-startup, and a system tray icon that keeps the slideshow running when the window is closed.

## Download

Grab the latest Windows installer from [Releases](../../releases) (`.exe` or `.msi`).

> Wallery talks to the [Wallhaven API](https://wallhaven.cc/api/v1). You'll need a free Wallhaven account and an API key (Settings → wallhaven.cc/settings/account) to see NSFW-flagged results.

## Building from source

```bash
npm install
npm run tauri dev    # run in dev mode
npm run tauri build  # build a release installer
```

Requires Node.js and the Rust toolchain — see the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

Windows only for now — wallpaper-setting, monitor detection, and autostart all go through Windows-specific APIs.

## Tech

Tauri 2 (Rust) + React + TypeScript + Tailwind CSS, talking to the Wallhaven API.

## License

[MIT](LICENSE)

---

Not affiliated with Wallhaven — just a desktop client for its public API.
