import * as vscode from 'vscode';
import { getWebviewHtml } from './webviewHtml';

export interface GameStats {
    score: number;
    hits: number;
    misses: number;
    shots: number;
    accuracy: number;
    avgReactionMs: number;
    bestReactionMs: number;
    streak: number;
    bestStreak: number;
    highScore: number;
}

export interface GameMessage {
    type: 'start' | 'stop' | 'resetStats' | 'resetHighScore' | 'stats' | 'highScore';
    stats?: GameStats;
    highScore?: number;
}

export class CodeAimProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private extensionUri: vscode.Uri;
    private context: vscode.ExtensionContext;

    constructor(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this.extensionUri = extensionUri;
        this.context = context;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };

        webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((message: GameMessage) => {
            switch (message.type) {
                case 'stats':
                    // Stats updated from webview — could persist per-session
                    break;
                case 'highScore':
                    if (message.highScore !== undefined) {
                        this.context.globalState.update('codeaim.highScore', message.highScore);
                    }
                    break;
            }
        });
    }

    startGame(): void {
        this.postMessage({ type: 'start' });
    }

    stopGame(): void {
        this.postMessage({ type: 'stop' });
    }

    async resetHighScore(): Promise<void> {
        await this.context.globalState.update('codeaim.highScore', 0);
        this.postMessage({ type: 'resetHighScore' });
    }

    private postMessage(message: GameMessage): void {
        if (this.view) {
            this.view.webview.postMessage(message);
        }
    }
}
