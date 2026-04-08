# 🎹 Key Sound

> Satisfying keyboard sounds as you write code in VS Code

![Version](https://img.shields.io/badge/version-0.4.0-blue)
![VS Code](https://img.shields.io/badge/vscode-^1.85.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **4 sound themes** — Mechanical, Typewriter, Bubble, Soft
- **Per-event sounds** — distinct sounds for typing, Enter, Backspace/Delete, Save (Ctrl+S), and Paste
- **Terminal sounds** — detects keystrokes echoed in the integrated terminal
- **Live equalizer** — animated waveform reacts to every keystroke in real time
- **Session stats** — tracks keys typed, lines added, deletes, and saves
- **Works everywhere in VS Code** — code editors, rename inputs, search boxes, git commit messages

---

## Getting Started

1. Install the extension from a `.vsix` file:
   - Open the **Extensions** sidebar (`Ctrl+Shift+X`)
   - Click `···` → **Install from VSIX…**
   - Select `key-sound-0.4.0.vsix`

2. The **Key Sound** panel opens automatically in the Activity Bar on first launch.

3. Click **"🎹 Key Sound"** in the Activity Bar any time to open the settings panel.

> **Audio activation:** On first open, the panel audio engine starts automatically. If you see the yellow "audio inactive" warning, click the pill once to activate.

---

## Settings Panel

Click the **🎹** icon in the Activity Bar to access:

| Control | Description |
|---|---|
| **Status pill** | Green = audio active, Yellow = click to activate |
| **Sounds enabled** toggle | Master on/off switch |
| **Live Activity** waveform | Animated equaliser showing real-time activity |
| **Sound Theme** cards | Mechanical / Typewriter / Bubble / Soft |
| **Volume slider** | 0–100% |
| **Save sound** toggle | Chime on Ctrl+S |
| **Paste sound** toggle | Burst of clicks on paste / AI completion |
| **Terminal sound** toggle | Sounds when typing in the integrated terminal |
| **Session Stats** | Keys / Lines / Deletes / Saves counter |

---

## Commands

Open with `Ctrl+Shift+P`:

| Command | Action |
|---|---|
| `Key Sound: Toggle On/Off` | Enable / disable all sounds |
| `Key Sound: Change Sound Theme` | Pick a theme via quick pick |

The **status bar** item (`🔊 Keys` / `🔇 Keys`) also toggles sounds on click.

---

## Sound Themes

| Theme | Icon | Feel |
|---|---|---|
| **Mechanical** | ⌨️ | Crisp, punchy clicks like a mechanical keyboard |
| **Typewriter** | 📜 | Classic clack-clack with carriage return swoosh |
| **Bubble** | 🫧 | Soft bubbly pops — easy on the ears |
| **Soft** | 🌙 | Barely-there gentle taps for quiet environments |

---

## Settings (`settings.json`)

```json
{
  "keySound.enabled": true,
  "keySound.theme": "mechanical",
  "keySound.volume": 0.5,
  "keySound.playSaveSound": true,
  "keySound.playPasteSound": true,
  "keySound.playTerminalSound": true
}
```

---

## How It Works

All audio synthesis happens inside a VS Code **Webview** using the built-in **Web Audio API** — no sound files, no native binaries. This means it works seamlessly across:

- WSL / Remote SSH / Dev Containers
- Windows, Linux, and macOS

The extension hooks into:
- The VS Code **`type` command** (one event per keystroke in editors)
- `onDidChangeTextDocument` (deletions, pastes, AI completions)
- `onDidSaveTextDocument` (save chime)
- `window.onDidWriteTerminalData` (terminal keystrokes via shell echo detection)

> **Note:** Copilot Chat and other webview panels (browser preview, etc.) are sandboxed by VS Code and cannot be intercepted by any extension.

---

## License

MIT © fun-features
