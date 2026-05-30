# CodeAim — VS Code Aim Trainer

> **Train your aim without leaving your editor.**

CodeAim is a lightweight aim trainer built directly into VS Code. Spawn targets on a canvas panel, click them as fast as you can, and track your accuracy, reaction time, and streaks — all without alt-tabbing to a browser.

![CodeAim Banner](images/banner.png)

## Features

- **4 Game Modes:**
  - **Click** — Targets spawn randomly. Click them before they expire.
  - **Flick** — Flick between sequential targets in a chain.
  - **Tracking** — A moving target with HP bars. Drain it to score.
  - **Reaction** — Red target turns green. Click as fast as possible. No false starts.
- **Full Overlay Mode** — Toggle an editor-overlay panel with `Ctrl+Alt+Q` for fullscreen aim training
- **Sound Effects** — Web Audio API synthesized sounds for hits, misses, streaks, and reaction prompts
- **Visual FX** — Particle explosions, ghost trails, screen shake, combo counter, accuracy ring
- **Score Tracking** — Persistent leaderboard, session history chart, high score tracking
- **Warmup Mode** — 30-second countdown timer before training begins
- **Settings** — Adjustable target size, lifetime, spawn rate, max targets
- **Share Results** — Post your session stats to X/Twitter directly from the summary card

## Installation

### From VSIX

1. Download the latest `.vsix` from the [Releases](https://github.com/islam666/CodeAim/releases) page
2. Open VS Code → Extensions sidebar → `⋯` → `Install from VSIX...`
3. Select the downloaded file

### From Source

```bash
git clone https://github.com/islam666/CodeAim.git
cd CodeAim
npm install
npm run compile
```

Then press `F5` to launch the Extension Development Host.

## Usage

### Sidebar Panel

1. Look for the **◎ CodeAim** icon in the Activity Bar (left sidebar)
2. Select a mode: **Click**, **Flick**, **Tracking**, or **Reaction**
3. Press **▶ Start**
4. Click the targets as they appear

### Overlay Mode

- Press `Ctrl+Alt+Q` (macOS: `Cmd+Alt+Q`) to toggle fullscreen overlay
- Press `Esc` to exit overlay mode
- Keys `1-4` switch between modes in overlay

### Commands

Open the Command Palette (`Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `CodeAim: Start Training` | Start the aim trainer |
| `CodeAim: Stop Training` | Stop the current session |
| `CodeAim: Reset High Score` | Reset your all-time high score |
| `CodeAim: Toggle Overlay Mode` | Toggle the fullscreen overlay |

## Configuration

Access settings directly in the sidebar or overlay panel:

| Setting | Default | Description |
|---|---|---|
| Target Size | `28` | Radius of targets in pixels (14–50) |
| Target Lifetime | `3000` | How long targets stay alive in ms (800–6000) |
| Spawn Interval | `1200` | Time between spawns in ms (400–3000) |
| Max Targets | `4` | Maximum simultaneous targets (1–10) |
| Warmup | `off` | 30-second countdown before session starts |
| Sound | `on` | Toggle sound effects |

## Scoring

- **Base score:** 100 points per hit
- **Time bonus:** Up to +50 points for fast reactions (faster = more points)
- **Streak bonus:** Up to +5 points per hit scaling with current streak
- **Tracking bonus:** +200 points for depleting a target's HP bar

## License

[MIT](LICENSE) © Islam Elshayib
