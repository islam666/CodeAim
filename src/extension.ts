import * as vscode from 'vscode';
import { CodeAimProvider } from './codeAimProvider';
import { getOverlayHtml } from './overlayHtml';

interface OverlaySettings {
    targetRadius: number;
    targetLifetime: number;
    spawnInterval: number;
    maxTargets: number;
}

let provider: CodeAimProvider | undefined;
let overlayPanel: vscode.WebviewPanel | undefined;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
    // Sidebar provider
    provider = new CodeAimProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codeaim.panel', provider, {
            webviewOptions: { retainContextWhenHidden: true },
        })
    );

    // Status bar item for overlay toggle
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '◎ CodeAim';
    statusBarItem.tooltip = 'Click to toggle overlay mode (Ctrl+Alt+Q)';
    statusBarItem.command = 'codeaim.toggleOverlay';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Load saved settings
    const savedSettings = context.globalState.get<OverlaySettings>('codeaim.settings', {
        targetRadius: 28,
        targetLifetime: 3000,
        spawnInterval: 1200,
        maxTargets: 4,
    });

    // ── Commands ──

    context.subscriptions.push(
        vscode.commands.registerCommand('codeaim.start', () => {
            if (overlayPanel) {
                overlayPanel.webview.postMessage({ type: 'start' });
            } else if (provider) {
                provider.startGame();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeaim.stop', () => {
            if (overlayPanel) {
                overlayPanel.webview.postMessage({ type: 'stop' });
            } else if (provider) {
                provider.stopGame();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeaim.resetScore', async () => {
            if (provider) {
                await provider.resetHighScore();
                vscode.window.showInformationMessage('CodeAim: High score reset!');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeaim.toggleOverlay', () => {
            if (overlayPanel) {
                closeOverlay(context);
            } else {
                openOverlay(context);
            }
        })
    );

    // Send saved settings to sidebar
    setTimeout(() => {
        if (provider) {
            provider.sendSettings(savedSettings);
        }
    }, 500);
}

function openOverlay(context: vscode.ExtensionContext): void {
    if (overlayPanel) return;

    overlayPanel = vscode.window.createWebviewPanel(
        'codeaimOverlay',
        'CodeAim Overlay',
        { viewColumn: vscode.ViewColumn.One, preserveFocus: false },
        {
            enableScripts: true,
            retainContextWhenHidden: false,
        }
    );

    overlayPanel.webview.html = getOverlayHtml();

    // Handle messages from overlay webview
    overlayPanel.webview.onDidReceiveMessage(async (msg: { type: string; settings?: OverlaySettings; highScore?: number }) => {
        switch (msg.type) {
            case 'closeOverlay':
                closeOverlay(context);
                break;
            case 'saveSettings':
                if (msg.settings) {
                    await context.globalState.update('codeaim.settings', msg.settings);
                    // Also sync to sidebar
                    if (provider) {
                        provider.sendSettings(msg.settings);
                    }
                }
                break;
            case 'highScore':
                if (msg.highScore !== undefined) {
                    await context.globalState.update('codeaim.highScore', msg.highScore);
                }
                break;
        }
    });

    overlayPanel.onDidDispose(() => {
        overlayPanel = undefined;
        updateStatusBar(false);
    });

    updateStatusBar(true);

    // Load settings and high score
    const settings = context.globalState.get<OverlaySettings>('codeaim.settings', {
        targetRadius: 28,
        targetLifetime: 3000,
        spawnInterval: 1200,
        maxTargets: 4,
    });
    const hs = context.globalState.get<number>('codeaim.highScore', 0);

    // Send after a short delay to ensure webview is ready
    setTimeout(() => {
        if (overlayPanel) {
            overlayPanel.webview.postMessage({ type: 'loadSettings', settings });
            overlayPanel.webview.postMessage({ type: 'highScore', highScore: hs });
        }
    }, 200);
}

function closeOverlay(_context: vscode.ExtensionContext): void {
    if (overlayPanel) {
        overlayPanel.dispose();
        overlayPanel = undefined;
    }
    updateStatusBar(false);
}

function updateStatusBar(active: boolean): void {
    if (active) {
        statusBarItem.text = '◎ CodeAim (Overlay)';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    } else {
        statusBarItem.text = '◎ CodeAim';
        statusBarItem.backgroundColor = undefined;
    }
}

export function deactivate(): void {
    provider = undefined;
    overlayPanel = undefined;
}
