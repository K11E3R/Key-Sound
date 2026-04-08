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

    // Terminal sound — listens to onDidWriteTerminalData (proposed API).
    // Wrapped in try/catch: VS Code throws at property-access time if the
    // extension hasn't declared the proposal in enabledApiProposals, which
    // would abort activation entirely and silence all sounds.
    try {
        const termDisposable = (vscode.window as any).onDidWriteTerminalData?.(
            (e: { terminal: vscode.Terminal; data: string }) => {
                const cfg = vscode.workspace.getConfiguration('keySound');
                if (!cfg.get<boolean>('enabled', true))             { return; }
                if (!cfg.get<boolean>('playTerminalSound', true))   { return; }

                // Strip ANSI/VT escape sequences
                // eslint-disable-next-line no-control-regex
                const clean = e.data.replace(/\x1b(?:\[[0-9;]*[A-Za-z]|\][^\x07]*\x07|[()][AB012]|.)/g, '');

                if (clean === '\x7f' || clean === '\x08') {
                    soundManager?.play('delete');
                } else if (clean === '\r' || clean === '\r\n' || clean === '\n') {
                    soundManager?.play('enter');
                } else if (clean.length === 1 && clean.charCodeAt(0) >= 0x20) {
                    soundManager?.play('key');
                }
            }
        );
        if (termDisposable) {
            context.subscriptions.push(termDisposable);
        }
    } catch {
        // onDidWriteTerminalData not available in this VS Code build — terminal sounds disabled
    }

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
