import fs = require('fs');
import path = require('path');

export function getOverlayHtml(): string {
    // Primary: out/webview/ (after compile copies webview → out/webview)
    // Fallback: ../webview/ (development — project root)
    const primary = path.join(__dirname, 'webview');
    const fallback = path.resolve(__dirname, '..', 'webview');

    let html: string;
    let js: string;

    try {
        html = fs.readFileSync(path.join(primary, 'overlay.html'), 'utf8');
        js = fs.readFileSync(path.join(primary, 'overlay.js'), 'utf8');
    } catch (_e1) {
        try {
            html = fs.readFileSync(path.join(fallback, 'overlay.html'), 'utf8');
            js = fs.readFileSync(path.join(fallback, 'overlay.js'), 'utf8');
        } catch (e2) {
            console.error('CodeAim: Failed to load overlay webview files:', e2);
            return '<html><body><p>CodeAim: Failed to load overlay. Please run <code>npm run compile</code>.</p></body></html>';
        }
    }

    // Replace <script src="overlay.js"></script> with inline <script>...</script>
    return html.replace(
        '<script src="overlay.js"></script>',
        '<script>\n' + js + '\n</script>'
    );
}
