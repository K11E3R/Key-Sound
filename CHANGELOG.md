# Changelog

All notable changes to **Key Sound** are documented here.

---

## [0.4.0] — 2026-04-09

### Added
- **Terminal sound support** — detects keystrokes echoed in the integrated terminal via `onDidWriteTerminalData`. Single printable characters play a `key` sound, Enter plays `enter`, and backspace plays `delete`. Multi-character outputs (command results) are silently ignored.
- New setting `keySound.playTerminalSound` (boolean, default `true`) to toggle terminal sounds independently.
- **Terminal toggle** in the sidebar settings panel (🖥️ Terminal sound).

### Changed
- Version bumped to `0.4.0`.

---

## [0.3.0] — 2026-04-09

### Added
- Professional **Activity Bar icon** (🎹) opens a full settings panel in the sidebar.
- **Live equalizer waveform** animates on every keystroke.
- **2×2 sound theme cards** (Mechanical ⌨️, Typewriter 📜, Bubble 🫧, Soft 🌙).
- **Volume slider** (0–100%).
- **Save sound** — distinct 3-note chime on `Ctrl+S`.
- **Paste sound** — rapid click burst on paste or AI completion.
- **Session stats** — live counts for Keys, Lines, Deletes, Saves.
- Mini toggles for Save sound and Paste sound in the sidebar.

### Changed
- Replaced floating `WebviewPanel` with a `WebviewViewProvider` (sidebar) — no more popup tab.
- Extended `type` command override for per-keystroke coverage in all editors.
- Audio context auto-activates on Electron load — no manual click required on first use.
- Status bar item updated to `$(unmute) Keys` / `$(mute) Keys` with click-to-toggle.

---

## [0.2.0] — 2026-04-09

### Added
- Activity Bar container and sidebar view scaffold.
- SVG icon for the activity bar.
- Two new sound types: `save` and `paste`.
- `keySound.playSaveSound` and `keySound.playPasteSound` settings.

### Changed
- Migrated audio engine from floating `WebviewPanel` to sidebar `WebviewView`.

---

## [0.1.0] — 2026-04-09

### Initial Release
- Four sound themes: `mechanical`, `typewriter`, `bubble`, `soft`.
- Sounds for `key`, `delete`, and `enter` events via `onDidChangeTextDocument`.
- Status bar toggle item.
- `keySound.enabled`, `keySound.theme`, `keySound.volume` settings.
- Audio synthesis via Web Audio API inside a Webview — no audio files, works in WSL/SSH/Containers.
