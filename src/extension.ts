import * as vscode from 'vscode';
import { SoundManager } from './soundManager';

let soundManager: SoundManager | undefined;

export function activate(context: vscode.ExtensionContext) {
    soundManager = new SoundManager(context);

    // Register the sidebar settings + audio view
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SoundManager.viewType,
            soundManager,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Override the built-in 'type' command so every keystroke in any VS Code
    // text editor (including terminals, search boxes, etc.) triggers a sound.
    // Wrapped in try/catch in case another extension (e.g. vscodevim) already
    // owns this command — in that case we fall back to onDidChangeTextDocument.
    let typeCommandRegistered = false;
    try {
        context.subscriptions.push(
            vscode.commands.registerCommand('type', async (args: { text: string }) => {
                soundManager?.handleType(args.text);
                return vscode.commands.executeCommand('default:type', args);
            })
        );
        typeCommandRegistered = true;
    } catch {
        // fallback handled in onDidChangeTextDocument
    }

    // onDidChangeTextDocument handles:
    //   • deletions (backspace/delete — never go through 'type')
    //   • pastes / AI completions (multi-char changes)
    //   • single-char fallback when 'type' command is taken by another extension
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) =>
            handleDocChange(e, typeCommandRegistered)
        )
    );

    // Save sound
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
            const cfg = vscode.workspace.getConfiguration('keySound');
            if (cfg.get<boolean>('enabled', true) && cfg.get<boolean>('playSaveSound', true)) {
                soundManager?.play('save');
            }
        })
    );

    // Terminal sound — uses stable VS Code 1.93+ shell integration API.
    // onDidWriteTerminalData (proposed API) is permanently blocked for installed
    // extensions. Instead, onDidStartTerminalShellExecution fires whenever the
    // user presses Enter to execute a command in any shell-integration terminal.
    context.subscriptions.push(
        vscode.window.onDidStartTerminalShellExecution(() => {
            const cfg = vscode.workspace.getConfiguration('keySound');
            if (!cfg.get<boolean>('enabled', true))           { return; }
            if (!cfg.get<boolean>('playTerminalSound', true)) { return; }
            soundManager?.play('enter');
        })
    );

    // Commands + config watcher
    context.subscriptions.push(
        vscode.commands.registerCommand('keySound.toggle', toggleSound),
        vscode.commands.registerCommand('keySound.setTheme', setTheme),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('keySound')) {
                soundManager?.syncConfig();
            }
        })
    );

    // First install: open the sidebar once so the audio engine initialises.
    // After that, retainContextWhenHidden keeps it alive for the session.
    if (!context.globalState.get('keySoundOpened')) {
        context.globalState.update('keySoundOpened', true);
        vscode.commands.executeCommand('workbench.view.extension.keySoundContainer');
    }
}

function handleDocChange(
    event: vscode.TextDocumentChangeEvent,
    typeRegistered: boolean
): void {
    const cfg = vscode.workspace.getConfiguration('keySound');
    if (!cfg.get<boolean>('enabled', true)) { return; }
    if (event.contentChanges.length === 0) { return; }

    for (const change of event.contentChanges) {
        if (change.text === '' && change.rangeLength > 0) {
            // Deletion — backspace / delete key
            soundManager?.play('delete');
        } else if (change.text.length > 1 && cfg.get<boolean>('playPasteSound', true)) {
            // Paste or multi-char AI completion
            soundManager?.play('paste');
        } else if (!typeRegistered && change.text.length === 1) {
            // Fallback when 'type' command is owned by another extension
            const text = change.text;
            if (text === '\n' || text === '\r\n' || text === '\r') {
                soundManager?.play('enter');
            } else {
                soundManager?.play('key');
            }
        }
    }
}

async function toggleSound(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('keySound');
    const enabled = cfg.get<boolean>('enabled', true);
    await cfg.update('enabled', !enabled, vscode.ConfigurationTarget.Global);
    soundManager?.syncConfig();
    vscode.window.setStatusBarMessage(
        !enabled ? '$(unmute) Key Sound: Enabled' : '$(mute) Key Sound: Disabled',
        3000
    );
}

async function setTheme(): Promise<void> {
    const items: vscode.QuickPickItem[] = [
        { label: 'mechanical', description: 'Crisp mechanical keyboard clicks' },
        { label: 'typewriter', description: 'Classic typewriter clacks' },
        { label: 'bubble',     description: 'Bubbly popping sounds' },
        { label: 'soft',       description: 'Gentle quiet taps' },
    ];
    const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Choose a sound theme',
    });
    if (picked) {
        const cfg = vscode.workspace.getConfiguration('keySound');
        await cfg.update('theme', picked.label, vscode.ConfigurationTarget.Global);
        soundManager?.syncConfig();
    }
}

export function deactivate(): void {
    soundManager?.dispose();
}
