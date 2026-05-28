import * as vscode from 'vscode';
import { CodeAimProvider } from './codeAimProvider';

let provider: CodeAimProvider | undefined;

export function activate(context: vscode.ExtensionContext): void {
    provider = new CodeAimProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codeaim.panel', provider, {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
        })
    );

    // Start training command
    context.subscriptions.push(
        vscode.commands.registerCommand('codeaim.start', () => {
            if (provider) {
                provider.startGame();
            }
        })
    );

    // Stop training command
    context.subscriptions.push(
        vscode.commands.registerCommand('codeaim.stop', () => {
            if (provider) {
                provider.stopGame();
            }
        })
    );

    // Reset high score command
    context.subscriptions.push(
        vscode.commands.registerCommand('codeaim.resetScore', async () => {
            if (provider) {
                await provider.resetHighScore();
                vscode.window.showInformationMessage('CodeAim: High score reset!');
            }
        })
    );
}

export function deactivate(): void {
    provider = undefined;
}
