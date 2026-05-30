import fs = require('fs');
import path = require('path');

export function getOverlayHtml(): string {
    // Read HTML template and JS, inline the JS into the HTML
    const basePath = path.resolve(__dirname, '..');
    const htmlPath = path.join(basePath, 'webview', 'overlay.html');
    const jsPath = path.join(basePath, 'webview', 'overlay.js');

    let html: string;
    let js: string;

    try {
        html = fs.readFileSync(htmlPath, 'utf8');
        js = fs.readFileSync(jsPath, 'utf8');
    } catch (_err) {
        // Running from out/ directory
        const altBase = path.resolve(__dirname, '..', '..');
        html = fs.readFileSync(path.join(altBase, 'webview', 'overlay.html'), 'utf8');
        js = fs.readFileSync(path.join(altBase, 'webview', 'overlay.js'), 'utf8');
    }

    // Replace <script src="overlay.js"></script> with inline <script>...</script>
    return html.replace(
        '<script src="overlay.js"></script>',
        '<script>\n' + js + '\n</script>'
    );
}
