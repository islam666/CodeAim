import * as vscode from 'vscode';
import { CodeAimProvider } from './codeAimProvider';
import { getOverlayHtml } from './overlayHtml';

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
    statusBarItem.tooltip = 'Click to toggle overlay mode (Ctrl+Shift+A)';
    statusBarItem.command = 'codeaim.toggleOverlay';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Commands
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
    overlayPanel.webview.onDidReceiveMessage((msg: { type: string }) => {
        if (msg.type === 'closeOverlay') {
            closeOverlay(context);
        }
    });

    // Handle Esc key by registering a temporary command
    // (Esc is caught in the webview via keydown listener in HTML)

    overlayPanel.onDidDispose(() => {
        overlayPanel = undefined;
        updateStatusBar(false);
    });

    updateStatusBar(true);

    // Load high score
    const hs = context.globalState.get<number>('codeaim.highScore', 0);
    overlayPanel.webview.postMessage({ type: 'highScore', highScore: hs });
}

function closeOverlay(context: vscode.ExtensionContext): void {
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
