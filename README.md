<div align="center">

# Key Sound Pro

Add satisfying keyboard sounds to Visual Studio Code while you write, paste, save, and use the integrated terminal.

[![GitHub](https://img.shields.io/badge/GitHub-K11E3R%2FKey--Sound-10B981?style=for-the-badge&logo=github&logoColor=white)](https://github.com/K11E3R/Key-Sound)
[![License: MIT](https://img.shields.io/badge/License-MIT-059669?style=for-the-badge)](LICENSE)

</div>

## Features

- Real-time sounds while typing in VS Code
- Separate sounds for typing, Enter, deletion, paste, saving, and terminal commands
- Four built-in sound themes: **Mechanical**, **Typewriter**, **Bubble**, and **Soft**
- Adjustable volume
- Enable or disable sounds without leaving VS Code
- Activity Bar sidebar for audio activation, volume, theme, and feature controls
- No audio files or external services required; audio is synthesized in the webview

## Installation

Install **Key Sound Pro** from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=yna.key-sound-pro) and reload VS Code when prompted.

The extension activates automatically after startup, but its audio engine initializes when the **Key Sound** view is opened. Open this view in the Activity Bar in each VS Code window/session, including after a reload, and click **Tap to activate audio** if audio is not already active. The view can then be hidden for the rest of that session.

## Usage

Use the **Key Sound** view in the Activity Bar to:

- Activate the audio engine
- Choose a sound theme
- Adjust volume
- Toggle save, paste, and terminal sounds

You can also open the Command Palette and run:

- `Key Sound: Toggle On/Off`
- `Key Sound: Change Sound Theme`

## Settings

The following settings are available under **Key Sound**:

| Setting | Default | Description |
| --- | --- | --- |
| `keySound.enabled` | `true` | Enable or disable keyboard sounds |
| `keySound.theme` | `mechanical` | Select `mechanical`, `typewriter`, `bubble`, or `soft` |
| `keySound.volume` | `0.5` | Set volume from `0` to `1` |
| `keySound.playSaveSound` | `true` | Play a sound when saving a file |
| `keySound.playPasteSound` | `true` | Play a sound when pasting multiple characters |
| `keySound.playTerminalSound` | `true` | Play a sound when executing a command in a shell-integration terminal |

## Compatibility

Key Sound Pro supports VS Code `1.93.0` and later. When VSCodeVim is installed, the extension uses document-change detection so it does not interfere with Vim's typing commands.

## Development

```bash
git clone https://github.com/K11E3R/Key-Sound.git
cd Key-Sound
npm install
npm run compile
```

To continuously compile while developing:

```bash
npm run watch
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
