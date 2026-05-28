import * as vscode from 'vscode';

export function getWebviewHtml(webview: vscode.Webview, _extensionUri: vscode.Uri): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            background-color: var(--vscode-sideBar-background, var(--vscode-editor-background, #1e1e1e));
            color: var(--vscode-editor-foreground, #d4d4d4);
            font-family: var(--vscode-editor-font-family, 'Segoe UI', sans-serif);
            font-size: var(--vscode-editor-font-size, 13px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100vh;
            padding: 0 12px;
        }

        /* ── Header ── */
        .header {
            padding: 14px 4px 10px;
            border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
            flex-shrink: 0;
        }

        .header h1 {
            font-size: 15px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--vscode-terminal-ansiGreen, #4ec9b0);
        }

        .header p {
            font-size: 11px;
            color: var(--vscode-descriptionForeground, rgba(255,255,255,0.45));
            margin-top: 3px;
        }

        /* ── Mode selector ── */
        .mode-section {
            padding: 10px 0 8px;
            flex-shrink: 0;
        }

        .section-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: var(--vscode-descriptionForeground, rgba(255,255,255,0.4));
            margin-bottom: 6px;
        }

        .mode-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
        }

        .mode-btn {
            padding: 8px 6px;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 5px;
            background: transparent;
            color: rgba(255,255,255,0.55);
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }

        .mode-btn:hover {
            background: rgba(255,255,255,0.06);
            color: rgba(255,255,255,0.8);
        }

        .mode-btn.active {
            background: rgba(78, 201, 176, 0.15);
            border-color: var(--vscode-terminal-ansiGreen, #4ec9b0);
            color: var(--vscode-terminal-ansiGreen, #4ec9b0);
        }

        .mode-btn .mode-icon { font-size: 14px; }
        .mode-btn .mode-name { font-size: 11px; }

        /* ── Stats dashboard ── */
        .stats-section {
            padding: 8px 0;
            flex-shrink: 0;
            border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.06));
        }

        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
        }

        .stat-card {
            background: rgba(255,255,255,0.03);
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
        }

        .stat-card-label {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--vscode-descriptionForeground, rgba(255,255,255,0.35));
        }

        .stat-card-value {
            font-size: 18px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            margin-top: 2px;
        }

        .sc-score { color: var(--vscode-terminal-ansiGreen, #4ec9b0); }
        .sc-accuracy { color: var(--vscode-terminal-ansiBlue, #569cd6); }
        .sc-streak { color: var(--vscode-terminal-ansiYellow, #dcdcaa); }
        .sc-reaction { color: #b5cea8; }
        .sc-best { color: #c586c0; }
        .sc-high { color: var(--vscode-terminal-ansiYellow, #dcdcaa); }

        /* ── Settings ── */
        .settings-section {
            padding: 10px 0;
            flex: 1;
            overflow-y: auto;
        }

        .setting-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding: 0 2px;
        }

        .setting-row label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground, rgba(255,255,255,0.55));
        }

        .setting-control {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .setting-control input[type="range"] {
            width: 80px;
            accent-color: var(--vscode-terminal-ansiGreen, #4ec9b0);
        }

        .setting-val {
            font-size: 11px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: var(--vscode-terminal-ansiGreen, #4ec9b0);
            min-width: 30px;
            text-align: right;
        }

        /* ── Controls ── */
        .controls {
            padding: 10px 0 14px;
            border-top: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
            display: flex;
            gap: 6px;
            justify-content: center;
            flex-shrink: 0;
        }

        button {
            padding: 6px 14px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: opacity 0.15s;
        }
        button:hover { opacity: 0.8; }

        .btn-start {
            background: var(--vscode-terminal-ansiGreen, #4ec9b0);
            color: var(--vscode-editor-background, #1e1e1e);
        }

        .btn-stop {
            background: #f14c4c;
            color: white;
        }

        .btn-reset {
            background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.08));
            color: var(--vscode-button-secondaryForeground, rgba(255,255,255,0.6));
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>◎ CodeAim</h1>
        <p>Aim trainer inside VS Code — train while you code</p>
    </div>

    <div class="mode-section">
        <div class="section-label">Training Mode</div>
        <div class="mode-grid">
            <button class="mode-btn active" data-mode="click" id="sbTabClick">
                <span class="mode-icon">◎</span>
                <span class="mode-name">Click</span>
            </button>
            <button class="mode-btn" data-mode="flick" id="sbTabFlick">
                <span class="mode-icon">⟐</span>
                <span class="mode-name">Flick</span>
            </button>
            <button class="mode-btn" data-mode="tracking" id="sbTabTracking">
                <span class="mode-icon">◉</span>
                <span class="mode-name">Track</span>
            </button>
            <button class="mode-btn" data-mode="reaction" id="sbTabReaction">
                <span class="mode-icon">⚡</span>
                <span class="mode-name">React</span>
            </button>
        </div>
    </div>

    <div class="stats-section">
        <div class="section-label">Session Stats</div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-card-label">Score</div>
                <div class="stat-card-value sc-score" id="score">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">Accuracy</div>
                <div class="stat-card-value sc-accuracy" id="accuracy">—</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">Streak</div>
                <div class="stat-card-value sc-streak" id="streak">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">Avg ms</div>
                <div class="stat-card-value sc-reaction" id="reaction">—</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">Best ms</div>
                <div class="stat-card-value sc-best" id="bestReaction">—</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">High Score</div>
                <div class="stat-card-value sc-high" id="highScore">0</div>
            </div>
        </div>
    </div>

    <div class="settings-section">
        <div class="section-label">Settings</div>
        <div class="setting-row">
            <label>Target Size</label>
            <div class="setting-control">
                <input type="range" id="setRadius" min="14" max="50" value="28">
                <span class="setting-val" id="valRadius">28</span>
            </div>
        </div>
        <div class="setting-row">
            <label>Target Lifetime</label>
            <div class="setting-control">
                <input type="range" id="setLifetime" min="800" max="6000" value="3000" step="100">
                <span class="setting-val" id="valLifetime">3000</span>
            </div>
        </div>
        <div class="setting-row">
            <label>Spawn Interval</label>
            <div class="setting-control">
                <input type="range" id="setSpawn" min="400" max="3000" value="1200" step="50">
                <span class="setting-val" id="valSpawn">1200</span>
            </div>
        </div>
        <div class="setting-row">
            <label>Max Targets</label>
            <div class="setting-control">
                <input type="range" id="setMaxTargets" min="1" max="10" value="4">
                <span class="setting-val" id="valMaxTargets">4</span>
            </div>
        </div>
    </div>

    <div class="controls">
        <button class="btn-start" id="startBtn">▶ Start</button>
        <button class="btn-stop" id="stopBtn">⏹ Stop</button>
        <button class="btn-reset" id="resetBtn">↺ Reset</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // ── Game State ──
        let score = 0, hits = 0, misses = 0, shots = 0;
        let streak = 0, bestStreak = 0, highScore = 0;
        let reactionTimes = [], bestReactionMs = Infinity;
        let currentMode = 'click';

        // ── DOM ──
        const scoreEl = document.getElementById('score');
        const accuracyEl = document.getElementById('accuracy');
        const streakEl = document.getElementById('streak');
        const reactionEl = document.getElementById('reaction');
        const bestReactionEl = document.getElementById('bestReaction');
        const highScoreEl = document.getElementById('highScore');

        // ── Settings DOM ──
        const setRadius = document.getElementById('setRadius');
        const setLifetime = document.getElementById('setLifetime');
        const setSpawn = document.getElementById('setSpawn');
        const setMaxTargets = document.getElementById('setMaxTargets');
        const valRadius = document.getElementById('valRadius');
        const valLifetime = document.getElementById('valLifetime');
        const valSpawn = document.getElementById('valSpawn');
        const valMaxTargets = document.getElementById('valMaxTargets');

        function updateUI() {
            shots = hits + misses;
            scoreEl.textContent = score;
            accuracyEl.textContent = shots > 0 ? Math.round(hits/shots*100) + '%' : '—';
            streakEl.textContent = streak;
            const avg = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length) : 0;
            reactionEl.textContent = avg > 0 ? avg + 'ms' : '—';
            bestReactionEl.textContent = bestReactionMs < Infinity ? Math.round(bestReactionMs) + 'ms' : '—';
            if (score > highScore) {
                highScore = score;
                highScoreEl.textContent = highScore;
            }
        }

        function resetStats() {
            score = 0; hits = 0; misses = 0; shots = 0;
            streak = 0; bestStreak = 0; reactionTimes = [];
            bestReactionMs = Infinity;
            updateUI();
        }

        // ── Mode switching ──
        const MODE_DESCRIPTIONS = {
            click: 'Click targets as fast as they appear',
            flick: 'Flick between targets in sequence',
            tracking: 'Click the moving target to drain its HP',
            reaction: 'Wait for green, then click as fast as possible'
        };

        function switchMode(mode) {
            currentMode = mode;
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('sbTab' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
            resetStats();
        }

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });

        // ── Settings controls ──
        [setRadius, setLifetime, setSpawn, setMaxTargets].forEach(el => {
            el.addEventListener('input', () => {
                valRadius.textContent = setRadius.value;
                valLifetime.textContent = setLifetime.value;
                valSpawn.textContent = setSpawn.value;
                valMaxTargets.textContent = setMaxTargets.value;
                vscode.postMessage({
                    type: 'saveSettings',
                    settings: {
                        targetRadius: parseInt(setRadius.value),
                        targetLifetime: parseInt(setLifetime.value),
                        spawnInterval: parseInt(setSpawn.value),
                        maxTargets: parseInt(setMaxTargets.value),
                    }
                });
            });
        });

        // ── Buttons ──
        document.getElementById('startBtn').addEventListener('click', () => vscode.postMessage({ type: 'start' }));
        document.getElementById('stopBtn').addEventListener('click', () => vscode.postMessage({ type: 'stop' }));
        document.getElementById('resetBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'stop' });
            resetStats();
        });

        // ── Messages from extension ──
        window.addEventListener('message', e => {
            const msg = e.data;
            switch (msg.type) {
                case 'stats':
                    if (msg.stats) {
                        score = msg.stats.score || 0;
                        hits = msg.stats.hits || 0;
                        misses = msg.stats.misses || 0;
                        streak = msg.stats.streak || 0;
                        bestStreak = msg.stats.bestStreak || 0;
                        if (msg.stats.score > highScore) highScore = msg.stats.score;
                        updateUI();
                    }
                    break;
                case 'resetStats': resetStats(); break;
                case 'highScore':
                    if (msg.highScore !== undefined) {
                        highScore = msg.highScore;
                        highScoreEl.textContent = highScore;
                    }
                    break;
                case 'loadSettings':
                    if (msg.settings) {
                        setRadius.value = msg.settings.targetRadius || 28;
                        setLifetime.value = msg.settings.targetLifetime || 3000;
                        setSpawn.value = msg.settings.spawnInterval || 1200;
                        setMaxTargets.value = msg.settings.maxTargets || 4;
                        valRadius.textContent = setRadius.value;
                        valLifetime.textContent = setLifetime.value;
                        valSpawn.textContent = setSpawn.value;
                        valMaxTargets.textContent = setMaxTargets.value;
                    }
                    break;
            }
        });

        // ── Init ──
        updateUI();
    </script>
</body>
</html>`;
}
