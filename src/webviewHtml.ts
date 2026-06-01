import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    // Primary: out/webview/ (after compile copies webview → out/webview)
    // Fallback: webview/ at extension root (development)
    const inOut = path.join(__dirname, 'webview', 'sidebar.html');
    const atRoot = path.join(extensionUri.fsPath, 'webview', 'sidebar.html');

    try {
        return fs.readFileSync(inOut, 'utf8');
    } catch (_e1) {
        try {
            return fs.readFileSync(atRoot, 'utf8');
        } catch (e2) {
            console.error('CodeAim: Failed to load sidebar webview:', e2);
            return '<html><body><p>CodeAim sidebar failed to load. Run <code>npm run compile</code>.</p></body></html>';
        }
    }
}
