import * as vscode from 'vscode';

export type SoundType = 'key' | 'delete' | 'enter' | 'save' | 'paste';

export class SoundManager implements vscode.WebviewViewProvider {
    public static readonly viewType = 'keySound.settingsView';

    private _view?: vscode.WebviewView;
    private context: vscode.ExtensionContext;
    private ready = false;
    private queue: SoundType[] = [];
    private statusBarItem: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'keySound.toggle';
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);
        this.syncConfig();
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _ctx: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [],
        };

        webviewView.webview.html = this.buildHtml();

        webviewView.webview.onDidReceiveMessage((msg) => {
            if (msg.type === 'ready') {
                this.ready = true;
                this.sendConfig();
                this.queue.forEach((t) =>
                    this._view?.webview.postMessage({ type: 'play', sound: t })
                );
                this.queue = [];
                return;
            }
            if (msg.type === 'updateSetting') {
                const cfg = vscode.workspace.getConfiguration('keySound');
                cfg.update(msg.key, msg.value, vscode.ConfigurationTarget.Global)
                    .then(() => this.syncConfig());
            }
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) { this.sendConfig(); }
        });
    }

    /** Called by the 'type' command override — one call per keystroke. */
    handleType(text: string): void {
        const cfg = vscode.workspace.getConfiguration('keySound');
        if (!cfg.get<boolean>('enabled', true)) { return; }
        if (text === '\n' || text === '\r\n' || text === '\r') {
            this.play('enter');
        } else {
            this.play('key');
        }
    }

    play(type: SoundType): void {
        if (!this.ready || !this._view) {
            this.queue.push(type);
            return;
        }
        this._view.webview.postMessage({ type: 'play', sound: type });
    }

    syncConfig(): void {
        const cfg = vscode.workspace.getConfiguration('keySound');
        const enabled = cfg.get<boolean>('enabled', true);
        this.statusBarItem.text    = enabled ? '$(unmute) Keys' : '$(mute) Keys';
        this.statusBarItem.tooltip = enabled
            ? 'Key Sound ON — click to toggle'
            : 'Key Sound OFF — click to toggle';
        if (this.ready) { this.sendConfig(); }
    }

    private sendConfig(): void {
        const c = vscode.workspace.getConfiguration('keySound');
        this._view?.webview.postMessage({
            type:               'config',
            enabled:            c.get<boolean>('enabled',            true),
            theme:              c.get<string>('theme',               'mechanical'),
            volume:             c.get<number>('volume',              0.5),
            playSaveSound:      c.get<boolean>('playSaveSound',      true),
            playPasteSound:     c.get<boolean>('playPasteSound',     true),
            playTerminalSound:  c.get<boolean>('playTerminalSound',  true),
        });
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Webview HTML — all audio synthesis runs in the Chromium renderer via
    // the Web Audio API.  No audio files needed; works everywhere (WSL, SSH…).
    // ─────────────────────────────────────────────────────────────────────────
    private buildHtml(): string {
        return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{color-scheme:dark light}
body{
  font-family:var(--vscode-font-family,system-ui);
  font-size:var(--vscode-font-size,13px);
  color:var(--vscode-foreground);
  background:transparent;
  padding:10px 12px 20px;
  overflow-x:hidden;
}

/* ── Header ─────────────────────────── */
.hdr{display:flex;align-items:center;gap:9px;margin-bottom:13px}
.hdr-icon{font-size:24px;line-height:1}
.hdr-title{font-size:14px;font-weight:700;letter-spacing:-.01em}
.hdr-sub{font-size:10px;color:var(--vscode-descriptionForeground);margin-top:1px}

/* ── Section label ───────────────────── */
.lbl{
  font-size:10px;font-weight:600;text-transform:uppercase;
  letter-spacing:.1em;color:var(--vscode-descriptionForeground);
  margin:14px 0 6px;
}

/* ── Status pill ─────────────────────── */
.pill{
  display:flex;align-items:center;gap:8px;
  padding:6px 11px;border-radius:20px;
  font-size:11px;font-weight:500;cursor:pointer;
  user-select:none;margin-bottom:13px;
  transition:opacity .15s;border:1px solid transparent;
}
.pill:hover{opacity:.85}
.pill.on {background:rgba(78,201,176,.12);border-color:rgba(78,201,176,.3);color:#4ec9b0}
.pill.off{background:rgba(229,149,  0,.12);border-color:rgba(229,149,  0,.3);color:#e59500}
.dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.dot.on {background:#4ec9b0;box-shadow:0 0 6px #4ec9b080;animation:pulse 2s ease-in-out infinite}
.dot.off{background:#e59500}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.82)}}

/* ── Master toggle ───────────────────── */
.tog-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 11px;background:var(--vscode-input-background);
  border-radius:7px;border:1px solid var(--vscode-input-border,transparent);
}
.tog-lbl{font-size:12px;font-weight:500}
.sw{position:relative;display:inline-block;width:40px;height:22px}
.sw input{opacity:0;width:0;height:0}
.sl{
  position:absolute;cursor:pointer;inset:0;
  background:var(--vscode-badge-background,#555);
  border-radius:22px;transition:background .2s;
}
.sl::before{
  content:'';position:absolute;width:16px;height:16px;border-radius:50%;
  background:#fff;bottom:3px;left:3px;transition:transform .2s;
  box-shadow:0 1px 3px rgba(0,0,0,.3);
}
input:checked+.sl{background:var(--vscode-button-background,#0078d4)}
input:checked+.sl::before{transform:translateX(18px)}

/* ── Canvas ─────────────────────────── */
#wv{display:block;width:100%;height:52px;border-radius:7px;
    background:var(--vscode-input-background);
    border:1px solid var(--vscode-input-border,transparent)}

/* ── Theme grid ─────────────────────── */
.tgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tc{
  padding:10px 8px 8px;border-radius:8px;text-align:center;
  border:1.5px solid var(--vscode-input-border,#444);
  background:var(--vscode-input-background);
  cursor:pointer;user-select:none;transition:border-color .15s,background .15s;
}
.tc:hover{border-color:var(--vscode-focusBorder,#007acc)}
.tc.active{border-color:var(--vscode-button-background,#0078d4)}
.tc .ic{font-size:22px;display:block;margin-bottom:4px}
.tc .nm{font-size:11px;font-weight:600}
.tc .ds{font-size:10px;color:var(--vscode-descriptionForeground);margin-top:2px}

/* ── Volume ─────────────────────────── */
.vrow{display:flex;align-items:center;gap:8px}
.vic{font-size:14px;flex-shrink:0}
input[type=range]{
  flex:1;-webkit-appearance:none;height:4px;border-radius:2px;
  background:var(--vscode-scrollbarSlider-background,#555);
  outline:none;cursor:pointer;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;width:14px;height:14px;border-radius:50%;
  background:var(--vscode-button-background,#0078d4);
  cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.3);
}
.vval{font-size:11px;color:var(--vscode-descriptionForeground);min-width:33px;text-align:right;font-variant-numeric:tabular-nums}

/* ── Mini option rows ────────────────── */
.mrow{
  display:flex;align-items:center;justify-content:space-between;
  padding:6px 11px;background:var(--vscode-input-background);
  border-radius:6px;border:1px solid var(--vscode-input-border,transparent);
  margin-bottom:5px;
}
.mlbl{font-size:11px;color:var(--vscode-descriptionForeground)}
.sw2{position:relative;display:inline-block;width:30px;height:16px}
.sw2 input{opacity:0;width:0;height:0}
.sl2{
  position:absolute;cursor:pointer;inset:0;
  background:var(--vscode-badge-background,#555);
  border-radius:16px;transition:background .2s;
}
.sl2::before{
  content:'';position:absolute;width:10px;height:10px;border-radius:50%;
  background:#fff;bottom:3px;left:3px;transition:transform .2s;
}
input:checked+.sl2{background:var(--vscode-button-background,#0078d4)}
input:checked+.sl2::before{transform:translateX(14px)}

/* ── Stats ───────────────────────────── */
.sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.sc{
  background:var(--vscode-input-background);border-radius:6px;
  padding:7px 4px 6px;text-align:center;
  border:1px solid var(--vscode-input-border,transparent);
}
.si{font-size:13px;display:block;margin-bottom:2px}
.sv{font-size:13px;font-weight:700;display:block;line-height:1;font-variant-numeric:tabular-nums}
.sn{font-size:9px;color:var(--vscode-descriptionForeground);display:block;margin-top:2px}
</style>
</head>
<body>

<!-- Header -->
<div class="hdr">
  <span class="hdr-icon">🎹</span>
  <div>
    <div class="hdr-title">Key Sound</div>
    <div class="hdr-sub">Sounds while you code</div>
  </div>
</div>

<!-- Audio engine status -->
<div id="pill" class="pill off" onclick="activateAudio()">
  <span id="dot"  class="dot off"></span>
  <span id="ptxt">Tap to activate audio</span>
</div>

<!-- Master toggle -->
<div class="tog-row">
  <span class="tog-lbl">🔊&nbsp; Sounds enabled</span>
  <label class="sw">
    <input type="checkbox" id="masterToggle" onchange="onToggle(this.checked)">
    <span class="sl"></span>
  </label>
</div>

<!-- Waveform -->
<div class="lbl">Live Activity</div>
<canvas id="wv"></canvas>

<!-- Theme -->
<div class="lbl">Sound Theme</div>
<div class="tgrid">
  <div class="tc" data-theme="mechanical" onclick="setTheme('mechanical')">
    <span class="ic">⌨️</span><div class="nm">Mechanical</div><div class="ds">Crisp clicks</div>
  </div>
  <div class="tc" data-theme="typewriter" onclick="setTheme('typewriter')">
    <span class="ic">📜</span><div class="nm">Typewriter</div><div class="ds">Classic clack</div>
  </div>
  <div class="tc" data-theme="bubble" onclick="setTheme('bubble')">
    <span class="ic">🫧</span><div class="nm">Bubble</div><div class="ds">Soft pops</div>
  </div>
  <div class="tc" data-theme="soft" onclick="setTheme('soft')">
    <span class="ic">🌙</span><div class="nm">Soft</div><div class="ds">Gentle taps</div>
  </div>
</div>

<!-- Volume -->
<div class="lbl">Volume</div>
<div class="vrow">
  <span class="vic">🔈</span>
  <input type="range" id="volSlider" min="0" max="100" value="50"
         oninput="onVolume(this.value)" onchange="onVolumeDone(this.value)">
  <span class="vval" id="volDisp">50%</span>
</div>

<!-- Options -->
<div class="lbl">Options</div>
<div class="mrow">
  <span class="mlbl">💾&nbsp; Save sound</span>
  <label class="sw2"><input type="checkbox" id="saveToggle" onchange="onOpt('playSaveSound',this.checked)"><span class="sl2"></span></label>
</div>
<div class="mrow">
  <span class="mlbl">📋&nbsp; Paste sound</span>
  <label class="sw2"><input type="checkbox" id="pasteToggle" onchange="onOpt('playPasteSound',this.checked)"><span class="sl2"></span></label>
</div>
<div class="mrow">
  <span class="mlbl">🖥️&nbsp; Terminal sound</span>
  <label class="sw2"><input type="checkbox" id="termToggle" onchange="onOpt('playTerminalSound',this.checked)"><span class="sl2"></span></label>
</div>

<!-- Stats -->
<div class="lbl">Session Stats</div>
<div class="sgrid">
  <div class="sc"><span class="si">⌨️</span><span class="sv" id="sK">0</span><span class="sn">Keys</span></div>
  <div class="sc"><span class="si">⏎</span> <span class="sv" id="sE">0</span><span class="sn">Lines</span></div>
  <div class="sc"><span class="si">⌫</span> <span class="sv" id="sD">0</span><span class="sn">Deletes</span></div>
  <div class="sc"><span class="si">💾</span><span class="sv" id="sS">0</span><span class="sn">Saves</span></div>
</div>

<script>
const vscode = acquireVsCodeApi();

// ── State ─────────────────────────────────────────────────────────────────────
let audioCtx = null;
let theme    = 'mechanical';
let volume   = 0.5;
let enabled  = true;
const stats  = { k:0, e:0, d:0, s:0 };

// ── Canvas equalizer ─────────────────────────────────────────────────────────
const cv  = document.getElementById('wv');
const cx  = cv.getContext('2d');
const N   = 44;
const bars = new Float32Array(N).fill(0.04);

new ResizeObserver(() => {
  cv.width  = Math.round(cv.offsetWidth  * devicePixelRatio);
  cv.height = Math.round(cv.offsetHeight * devicePixelRatio);
}).observe(cv);

function excite(intensity) {
  for (let i = 0; i < N; i++) bars[i] = Math.random() * intensity + 0.08;
}

(function frame() {
  const w = cv.width, h = cv.height;
  cx.clearRect(0, 0, w, h);
  const bw  = w / N;
  const col = getComputedStyle(document.body)
                .getPropertyValue('--vscode-button-background').trim() || '#0078d4';
  for (let i = 0; i < N; i++) {
    bars[i] = Math.max(0.03, bars[i] - 0.018);
    const bh = Math.max(2 * devicePixelRatio, bars[i] * h);
    cx.fillStyle    = col;
    cx.globalAlpha  = 0.45 + bars[i] * 0.55;
    cx.fillRect(Math.floor(i * bw) + 1, h - bh, Math.max(1, Math.floor(bw) - 2), bh);
  }
  cx.globalAlpha = 1;
  requestAnimationFrame(frame);
})();

// ── Audio engine ──────────────────────────────────────────────────────────────
function getCtx() {
  if (!audioCtx) { try { audioCtx = new AudioContext(); } catch (_) { return null; } }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Attempt immediate auto-start (works in VS Code's Electron runtime)
try {
  audioCtx = new AudioContext();
  audioCtx.state !== 'running'
    ? audioCtx.resume().then(refreshPill).catch(refreshPill)
    : refreshPill();
} catch (_) {}

function activateAudio() {
  const c = getCtx();
  if (c) c.resume().then(refreshPill).catch(refreshPill);
}

function refreshPill() {
  const ok   = audioCtx && audioCtx.state === 'running';
  const pill = document.getElementById('pill');
  const dot  = document.getElementById('dot');
  const txt  = document.getElementById('ptxt');
  pill.className = 'pill ' + (ok ? 'on' : 'off');
  dot.className  = 'dot  ' + (ok ? 'on' : 'off');
  txt.textContent = ok ? 'Audio engine active' : 'Tap here to activate audio';
}
setInterval(() => { if (audioCtx) refreshPill(); }, 2000);

// ── Sound synthesis ───────────────────────────────────────────────────────────
function noise(ac, dur) {
  const n = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

const THEMES = {
  mechanical: {
    key(ac, v) {
      const t=ac.currentTime, s=noise(ac,.04), hp=ac.createBiquadFilter();
      hp.type='highpass'; hp.frequency.value=900;
      const g=ac.createGain(); g.gain.setValueAtTime(v*.72,t); g.gain.exponentialRampToValueAtTime(.0001,t+.035);
      s.connect(hp); hp.connect(g); g.connect(ac.destination); s.start(t);
      const o=ac.createOscillator(); o.type='square';
      o.frequency.setValueAtTime(900,t); o.frequency.exponentialRampToValueAtTime(450,t+.02);
      const og=ac.createGain(); og.gain.setValueAtTime(v*.09,t); og.gain.exponentialRampToValueAtTime(.0001,t+.02);
      o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t+.02);
    },
    delete(ac, v) {
      const t=ac.currentTime, s=noise(ac,.05), hp=ac.createBiquadFilter();
      hp.type='highpass'; hp.frequency.value=600;
      const g=ac.createGain(); g.gain.setValueAtTime(v*.5,t); g.gain.exponentialRampToValueAtTime(.0001,t+.05);
      s.connect(hp); hp.connect(g); g.connect(ac.destination); s.start(t);
    },
    enter(ac, v) {
      const t=ac.currentTime, o=ac.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(320,t); o.frequency.exponentialRampToValueAtTime(120,t+.07);
      const g=ac.createGain(); g.gain.setValueAtTime(v*.45,t); g.gain.exponentialRampToValueAtTime(.0001,t+.07);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.08);
      const s2=noise(ac,.025), g2=ac.createGain(); g2.gain.setValueAtTime(v*.6,t); g2.gain.exponentialRampToValueAtTime(.0001,t+.025);
      s2.connect(g2); g2.connect(ac.destination); s2.start(t);
    },
    save(ac, v) {
      const t=ac.currentTime;
      [440,550,660].forEach((f,i)=>{
        const dt=t+i*.06, o=ac.createOscillator(); o.type='sine'; o.frequency.value=f;
        const g=ac.createGain(); g.gain.setValueAtTime(v*.3,dt); g.gain.exponentialRampToValueAtTime(.0001,dt+.1);
        o.connect(g); g.connect(ac.destination); o.start(dt); o.stop(dt+.11);
      });
    },
    paste(ac, v) {
      const t=ac.currentTime;
      for(let i=0;i<5;i++){
        const dt=t+i*.012, s=noise(ac,.025), hp=ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=800;
        const g=ac.createGain(); g.gain.setValueAtTime(v*.45,dt); g.gain.exponentialRampToValueAtTime(.0001,dt+.025);
        s.connect(hp); hp.connect(g); g.connect(ac.destination); s.start(dt);
      }
    },
  },
  typewriter: {
    key(ac, v) {
      const t=ac.currentTime, s=noise(ac,.06), bp=ac.createBiquadFilter();
      bp.type='bandpass'; bp.frequency.value=1800; bp.Q.value=1.8;
      const g=ac.createGain(); g.gain.setValueAtTime(v*.75,t); g.gain.exponentialRampToValueAtTime(.0001,t+.055);
      s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(t);
    },
    delete(ac, v) {
      const t=ac.currentTime, o=ac.createOscillator(); o.type='sawtooth';
      o.frequency.setValueAtTime(520,t); o.frequency.exponentialRampToValueAtTime(260,t+.04);
      const g=ac.createGain(); g.gain.setValueAtTime(v*.3,t); g.gain.exponentialRampToValueAtTime(.0001,t+.04);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.05);
    },
    enter(ac, v) {
      const t=ac.currentTime, o=ac.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(700,t); o.frequency.linearRampToValueAtTime(180,t+.14);
      const g=ac.createGain(); g.gain.setValueAtTime(v*.35,t); g.gain.exponentialRampToValueAtTime(.0001,t+.14);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.15);
    },
    save(ac, v) {
      const t=ac.currentTime, o=ac.createOscillator(); o.type='sawtooth';
      o.frequency.setValueAtTime(400,t); o.frequency.linearRampToValueAtTime(800,t+.08);
      const g=ac.createGain(); g.gain.setValueAtTime(v*.25,t); g.gain.exponentialRampToValueAtTime(.0001,t+.08);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.1);
    },
    paste(ac, v) {
      const t=ac.currentTime;
      for(let i=0;i<6;i++){
        const dt=t+i*.018, s=noise(ac,.04), bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400; bp.Q.value=1.5;
        const g=ac.createGain(); g.gain.setValueAtTime(v*.55,dt); g.gain.exponentialRampToValueAtTime(.0001,dt+.038);
        s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(dt);
      }
    },
  },
  bubble: {
    key(ac, v) {
      const t=ac.currentTime, f=280+Math.random()*180, o=ac.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(f*1.6,t); o.frequency.exponentialRampToValueAtTime(f,t+.07);
      const g=ac.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v*.32,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+.07);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.08);
    },
    delete(ac, v) {
      const t=ac.currentTime, o=ac.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(380,t); o.frequency.exponentialRampToValueAtTime(190,t+.055);
      const g=ac.createGain(); g.gain.setValueAtTime(v*.28,t); g.gain.exponentialRampToValueAtTime(.0001,t+.055);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.06);
    },
    enter(ac, v) {
      const t=ac.currentTime;
      [1,2,3].forEach(h=>{
        const o=ac.createOscillator(); o.type='sine'; o.frequency.value=200*h;
        const g=ac.createGain(); g.gain.setValueAtTime(v*.22/h,t); g.gain.exponentialRampToValueAtTime(.0001,t+.1);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.12);
      });
    },
    save(ac, v) {
      const t=ac.currentTime;
      [300,450,600,750].forEach((f,i)=>{
        const dt=t+i*.04, o=ac.createOscillator(); o.type='sine';
        o.frequency.setValueAtTime(f*1.4,dt); o.frequency.exponentialRampToValueAtTime(f,dt+.06);
        const g=ac.createGain(); g.gain.setValueAtTime(v*.25,dt); g.gain.exponentialRampToValueAtTime(.0001,dt+.06);
        o.connect(g); g.connect(ac.destination); o.start(dt); o.stop(dt+.07);
      });
    },
    paste(ac, v) {
      const t=ac.currentTime;
      for(let i=0;i<5;i++){
        const dt=t+i*.022, f=250+Math.random()*250, o=ac.createOscillator(); o.type='sine';
        o.frequency.setValueAtTime(f*1.5,dt); o.frequency.exponentialRampToValueAtTime(f,dt+.05);
        const g=ac.createGain(); g.gain.setValueAtTime(v*.22,dt); g.gain.exponentialRampToValueAtTime(.0001,dt+.05);
        o.connect(g); g.connect(ac.destination); o.start(dt); o.stop(dt+.06);
      }
    },
  },
  soft: {
    key(ac, v) {
      const t=ac.currentTime, s=noise(ac,.03), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2800;
      const g=ac.createGain(); g.gain.setValueAtTime(v*.32,t); g.gain.exponentialRampToValueAtTime(.0001,t+.028);
      s.connect(lp); lp.connect(g); g.connect(ac.destination); s.start(t);
    },
    delete(ac, v) {
      const t=ac.currentTime, s=noise(ac,.035), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2000;
      const g=ac.createGain(); g.gain.setValueAtTime(v*.28,t); g.gain.exponentialRampToValueAtTime(.0001,t+.035);
      s.connect(lp); lp.connect(g); g.connect(ac.destination); s.start(t);
    },
    enter(ac, v) {
      const t=ac.currentTime, o=ac.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(260,t); o.frequency.exponentialRampToValueAtTime(180,t+.045);
      const g=ac.createGain(); g.gain.setValueAtTime(v*.22,t); g.gain.exponentialRampToValueAtTime(.0001,t+.045);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.05);
    },
    save(ac, v) {
      const t=ac.currentTime, o=ac.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(480,t); o.frequency.exponentialRampToValueAtTime(320,t+.08);
      const g=ac.createGain(); g.gain.setValueAtTime(v*.2,t); g.gain.exponentialRampToValueAtTime(.0001,t+.08);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+.1);
    },
    paste(ac, v) {
      const t=ac.currentTime;
      for(let i=0;i<4;i++){
        const dt=t+i*.015, s=noise(ac,.025), lp=ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2500;
        const g=ac.createGain(); g.gain.setValueAtTime(v*.25,dt); g.gain.exponentialRampToValueAtTime(.0001,dt+.025);
        s.connect(lp); lp.connect(g); g.connect(ac.destination); s.start(dt);
      }
    },
  },
};

function playSound(type) {
  const ac = getCtx();
  if (!ac) return;
  try {
    const bank = THEMES[theme] || THEMES.mechanical;
    const fn   = bank[type]  || bank.key;
    fn(ac, volume);
  } catch (_) {}
}

// ── Settings ──────────────────────────────────────────────────────────────────
function onToggle(checked) {
  enabled = checked;
  vscode.postMessage({ type:'updateSetting', key:'enabled', value:checked });
}
function setTheme(t) {
  theme = t;
  document.querySelectorAll('.tc').forEach(el => el.classList.toggle('active', el.dataset.theme === t));
  vscode.postMessage({ type:'updateSetting', key:'theme', value:t });
  playSound('key');
}
function onVolume(v)     { volume = v/100; document.getElementById('volDisp').textContent = v+'%'; }
function onVolumeDone(v) { volume = v/100; vscode.postMessage({ type:'updateSetting', key:'volume', value:volume }); }
function onOpt(key, val) { vscode.postMessage({ type:'updateSetting', key, value:val }); }

// ── Stats ─────────────────────────────────────────────────────────────────────
function fmt(n) { return n>=1000 ? (n/1000).toFixed(1)+'k' : String(n); }
function refreshStats() {
  document.getElementById('sK').textContent = fmt(stats.k);
  document.getElementById('sE').textContent = fmt(stats.e);
  document.getElementById('sD').textContent = fmt(stats.d);
  document.getElementById('sS').textContent = fmt(stats.s);
}

// ── Message handler ───────────────────────────────────────────────────────────
window.addEventListener('message', ev => {
  const m = ev.data;
  if (m.type === 'config') {
    if (m.enabled  !== undefined) { enabled = m.enabled; document.getElementById('masterToggle').checked = enabled; }
    if (m.theme    !== undefined) { theme   = m.theme;   document.querySelectorAll('.tc').forEach(el => el.classList.toggle('active', el.dataset.theme === theme)); }
    if (m.volume   !== undefined) {
      volume = m.volume;
      const pct = Math.round(volume*100);
      document.getElementById('volSlider').value = pct;
      document.getElementById('volDisp').textContent = pct+'%';
    }
    if (m.playSaveSound      !== undefined) document.getElementById('saveToggle').checked  = m.playSaveSound;
    if (m.playPasteSound     !== undefined) document.getElementById('pasteToggle').checked = m.playPasteSound;
    if (m.playTerminalSound  !== undefined) document.getElementById('termToggle').checked  = m.playTerminalSound;
  } else if (m.type === 'play') {
    if (!enabled) return;
    playSound(m.sound);
    if (m.sound==='key')    stats.k++;
    if (m.sound==='enter') { stats.k++; stats.e++; }
    if (m.sound==='delete') stats.d++;
    if (m.sound==='save')   stats.s++;
    if (m.sound==='paste')  stats.k += 3;
    refreshStats();
    const intensity = {enter:1.0,save:.85,paste:.9,delete:.55}[m.sound] ?? .65;
    excite(intensity);
  }
});

vscode.postMessage({ type:'ready' });
</script>
</body>
</html>`;
    }
}
