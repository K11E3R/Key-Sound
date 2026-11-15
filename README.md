<div align="center">

# 🎹 Key-Sound
### Real-Time Acoustic Engine & Live Marketplace Sound Manager

[![GitHub Repo](https://img.shields.io/badge/GitHub-K11E3R%2FKey--Sound-10B981?style=for-the-badge&logo=github&logoColor=white)](https://github.com/K11E3R/Key-Sound)
[![License: MIT](https://img.shields.io/badge/License-MIT-059669?style=for-the-badge)](LICENSE)
[![Status: Active](https://img.shields.io/badge/Engine-Real--Time_Audio-10B981?style=for-the-badge)]()
[![Marketplace](https://img.shields.io/badge/Marketplace-Live_Sync-047857?style=for-the-badge)]()

**Key-Sound** is an ultra-low-latency keyboard and system audio engine featuring a **real-time marketplace link**. Browse, preview, download, and hot-swap custom mechanical switches, studio sound packs, and tactile audio profiles on the fly—without restarting your session.

[Features](#-key-features) • [Architecture](#-real-time-marketplace-architecture) • [Installation](#-installation) • [Usage](#-live-marketplace--usage) • [Custom Packs](#-configuration--pack-manifest) • [Contributing](#-contributing--publishing-packs)

</div>

---

## ⚡ Key Features

* **Ultra-Low-Latency Audio Engine:** Sub-millisecond keystroke detection and polyphonic audio playback engineered for zero input lag during rapid typing or gaming.
* **Live Marketplace Synchronization:** Connected directly to the remote sound registry in real time—discover newly published community switch packs and acoustic profiles the moment they drop.
* **Zero-Restart Hot-Swapping:** Install and activate sound packs directly from the live marketplace stream. Audio buffers reload dynamically in memory.
* **Per-Key & Multi-Sample Mapping:** Supports distinct press (`keydown`), release (`keyup`), modifier (`Space`, `Enter`, `Shift`, `Backspace`), and velocity-sensitive variations to eliminate robotic repetition.
* **Lightweight Background Daemon:** Minimal CPU and RAM footprint designed to run silently alongside heavy IDE, terminal, or creative workflows.

---

## 🏗️ Real-Time Marketplace Architecture

```text
+-------------------+       WebSocket / Live Poll       +--------------------------+
|  Key-Sound Engine | <===============================> |  Key-Sound Marketplace   |
|  (Local Daemon)   |                                   |  (Remote Pack Registry)  |
+-------------------+                                   +--------------------------+
         |                                                           |
         | 1. Intercept OS Key Event                                 | 2. Stream Pack Manifest
         v                                                           v
+-------------------+       3. Hot-Swap Audio Buffer    +--------------------------+
| Polyphonic Mixer  | <-------------------------------- |  Local Pack Cache & VFS  |
| (Zero-Latency IO) |                                   |  (~/.keysound/packs/)    |
+-------------------+                                   +--------------------------+
```

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/K11E3R/Key-Sound.git
cd Key-Sound
```

### 2. Install Dependencies & Build
*(Select your runtime environment below)*

**Node.js / Electron / TypeScript:**
```bash
npm install
npm run build
npm start
```

**Python / Native Daemon:**
```bash
pip install -r requirements.txt
python main.py
```

---

## 🛒 Live Marketplace & Usage

### Browse & Install in Real Time
Key-Sound connects directly to the marketplace index so you can preview and pull packs without manual zip extraction:

1. **Launch Key-Sound** and open the **Marketplace** tab (or run the CLI market sync).
2. **Live Preview:** Click or select any listed switch profile (e.g., *Holy Panda*, *Cherry MX Blue*, *Gateron Oil King*, *Cyberpunk Synth*, *Typewriter Vintage*) to test the acoustics in real time.
3. **One-Click Install:** Hit **Install**—Key-Sound streams the audio assets, verifies the checksum, caches the profile locally, and mounts it into the active audio mixer immediately.

### CLI Quick Commands
```bash
# Start the real-time key-sound listener
keysound start

# Fetch real-time pack listings from the Marketplace
keysound market list

# Search the live marketplace for specific switches
keysound market search "holy panda"

# Install and immediately activate a pack from the Marketplace
keysound market install <pack-id> --activate

# Switch between locally installed sound profiles
keysound use <pack-id>
```

---

## 🎛️ Configuration & Pack Manifest

Every Marketplace sound pack follows a standardized `manifest.json` schema for instant hot-reloading:

```json
{
  "id": "gateron-oil-king-v2",
  "name": "Gateron Oil King (Lubed)",
  "author": "K11E3R",
  "version": "2.0.0",
  "sampleRate": 44100,
  "polyphony": 32,
  "keys": {
    "default": ["press_1.wav", "press_2.wav", "press_3.wav"],
    "keyup": ["release_1.wav", "release_2.wav"],
    "SPACE": ["space_down.wav"],
    "ENTER": ["enter_down.wav"],
    "BACKSPACE": ["backspace_down.wav"]
  }
}
```

---

## 🤝 Contributing & Publishing Packs

Want to publish your own acoustic profile to the real-time marketplace?

1. Fork the repository and create a new pack folder containing your `.wav` or `.ogg` samples and `manifest.json`.
2. Test your latency and clipping locally using `keysound test ./my-pack`.
3. Submit a Pull Request to the Marketplace registry for instant indexing.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Architected and maintained by <a href="https://github.com/K11E3R">K11E3R</a></sub>
</div>
