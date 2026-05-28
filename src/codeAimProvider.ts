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

export interface SessionResult {
    score: number;
    mode: string;
    acc: number;
    time: string;
    bestStreak: number;
    avgReaction: number;
    bestReaction: number;
    hits: number;
}

export interface GameMessage {
    type: 'start' | 'stop' | 'resetStats' | 'resetHighScore' | 'stats' | 'highScore'
        | 'loadSettings' | 'saveSettings' | 'loadLeaderboard' | 'sessionComplete'
        | 'saveLeaderboard';
    stats?: GameStats;
    highScore?: number;
    settings?: { targetRadius: number; targetLifetime: number; spawnInterval: number; maxTargets: number };
    leaderboard?: SessionResult[];
    sessionHistory?: number[];
    result?: SessionResult;
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

        webviewView.webview.onDidReceiveMessage(async (message: GameMessage) => {
            switch (message.type) {
                case 'stats':
                    break;
                case 'highScore':
                    if (message.highScore !== undefined) {
                        await this.context.globalState.update('codeaim.highScore', message.highScore);
                    }
                    break;
                case 'saveSettings':
                    if (message.settings) {
                        await this.context.globalState.update('codeaim.settings', message.settings);
                    }
                    break;
                case 'saveLeaderboard':
                    if (message.leaderboard) {
                        await this.context.globalState.update('codeaim.leaderboard', message.leaderboard);
                    }
                    if (message.sessionHistory) {
                        await this.context.globalState.update('codeaim.sessionHistory', message.sessionHistory);
                    }
                    break;
            }
        });
    }

    startGame(): void { this.postMessage({ type: 'start' }); }
    stopGame(): void { this.postMessage({ type: 'stop' }); }

    async resetHighScore(): Promise<void> {
        await this.context.globalState.update('codeaim.highScore', 0);
        this.postMessage({ type: 'resetHighScore' });
    }

    sendSettings(settings: { targetRadius: number; targetLifetime: number; spawnInterval: number; maxTargets: number }): void {
        this.postMessage({ type: 'loadSettings', settings });
    }

    sendLeaderboard(leaderboard: SessionResult[], sessionHistory: number[]): void {
        this.postMessage({ type: 'loadLeaderboard', leaderboard, sessionHistory });
    }

    private postMessage(message: GameMessage): void {
        if (this.view) {
            this.view.webview.postMessage(message);
        }
    }
}
