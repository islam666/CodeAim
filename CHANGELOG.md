# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- README.md with full documentation, feature list, installation guide, and usage instructions
- CHANGELOG.md
- MIT LICENSE
- 128x128 extension icon
- `.vscodeignore` entries for cleaner packaging
- `onStartupFinished` activation event for reliable extension startup
- `repository` field in package.json

### Changed
- Split monolithic `overlayHtml.ts` into separate HTML/CSS/JS files under `webview/`
- Split monolithic `webviewHtml.ts` into separate HTML/CSS/JS files under `webview/`
- Changed extension category from `["Other", "Education"]` to `["Games"]`
- Replaced emoji medal indicators with CSS-styled text ranks
- Added error handling around Web Audio API initialization

### Fixed
- AudioContext initialization now wrapped in try/catch to prevent crashes when audio is blocked
- Warmup timer cleanup pattern refactored for reliability
