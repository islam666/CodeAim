import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const htmlPath = path.join(extensionUri.fsPath, 'webview', 'sidebar.html');

    try {
        return fs.readFileSync(htmlPath, 'utf8');
    } catch (_err) {
        const fallback = path.resolve(__dirname, '..', 'webview', 'sidebar.html');
        return fs.readFileSync(fallback, 'utf8');
    }
}
