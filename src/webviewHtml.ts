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
            display: flex; flex-direction: column;
            height: 100vh; padding: 0 10px;
        }

        /* ── Header ── */
        .header {
            padding: 12px 4px 8px;
            border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.08));
            flex-shrink: 0;
        }
        .header h1 {
            font-size: 14px; font-weight: 700;
            display: flex; align-items: center; gap: 6px;
            color: var(--vscode-terminal-ansiGreen, #4ec9b0);
        }
        .header p {
            font-size: 10px;
            color: var(--vscode-descriptionForeground, rgba(255,255,255,0.4));
            margin-top: 2px;
        }

        /* ── Section label ── */
        .section-label {
            font-size: 8px; text-transform: uppercase;
            letter-spacing: 1.2px;
            color: var(--vscode-descriptionForeground, rgba(255,255,255,0.35));
            margin-bottom: 5px;
        }

        /* ── Mode selector ── */
        .mode-section { padding: 8px 0 6px; flex-shrink: 0; }
        .mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
        .mode-btn {
            padding: 7px 4px; border: 1px solid rgba(255,255,255,0.08);
            border-radius: 5px; background: transparent;
            color: rgba(255,255,255,0.5); cursor: pointer;
            font-size: 10px; font-weight: 600;
            transition: all 0.15s;
            display: flex; align-items: center; justify-content: center; gap: 3px;
        }
        .mode-btn:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
        .mode-btn.active {
            background: rgba(78, 201, 176, 0.15);
            border-color: var(--vscode-terminal-ansiGreen, #4ec9b0);
            color: var(--vscode-terminal-ansiGreen, #4ec9b0);
        }

        /* ── Stats dashboard ── */
        .stats-section {
            padding: 6px 0 8px; flex-shrink: 0;
            border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.06));
        }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
        .stat-card {
            background: rgba(255,255,255,0.025); border-radius: 5px;
            padding: 6px 8px; text-align: center;
        }
        .stat-card-label {
            font-size: 7px; text-transform: uppercase;
            letter-spacing: 1px; color: rgba(255,255,255,0.3);
        }
        .stat-card-value {
            font-size: 16px; font-weight: 700;
            font-variant-numeric: tabular-nums; margin-top: 1px;
        }
        .sc-score { color: var(--vscode-terminal-ansiGreen, #4ec9b0); }
        .sc-accuracy { color: var(--vscode-terminal-ansiBlue, #569cd6); }
        .sc-streak { color: var(--vscode-terminal-ansiYellow, #dcdcaa); }
        .sc-reaction { color: #b5cea8; }
        .sc-best { color: #c586c0; }
        .sc-high { color: var(--vscode-terminal-ansiYellow, #dcdcaa); }

        /* ── Leaderboard + History ── */
        .leaderboard-section {
            padding: 8px 0; flex: 1; overflow-y: auto;
        }
        .lb-entry {
            display: flex; align-items: center; gap: 8px;
            padding: 5px 6px; border-radius: 4px;
            margin-bottom: 2px;
            font-size: 11px;
        }
        .lb-entry:nth-child(1) { background: rgba(255,215,0,0.06); }
        .lb-entry:nth-child(2) { background: rgba(192,192,192,0.04); }
        .lb-entry:nth-child(3) { background: rgba(205,127,50,0.04); }
        .lb-rank { font-weight: 700; font-size: 11px; width: 18px; text-align: center; }
        .lb-entry:nth-child(1) .lb-rank { color: #ffd700; }
        .lb-entry:nth-child(2) .lb-rank { color: #c0c0c0; }
        .lb-entry:nth-child(3) .lb-rank { color: #cd7f32; }
        .lb-entry:nth-child(n+4) .lb-rank { color: rgba(255,255,255,0.3); }
        .lb-info { flex: 1; }
        .lb-score { font-weight: 700; color: var(--vscode-terminal-ansiGreen, #4ec9b0); font-variant-numeric: tabular-nums; }
        .lb-detail { font-size: 9px; color: rgba(255,255,255,0.35); }

        /* ── Mini chart ── */
        .chart-wrap {
            height: 48px; margin-top: 6px;
            display: flex; align-items: flex-end; gap: 3px;
            padding: 0 2px;
        }
        .chart-bar {
            flex: 1; border-radius: 2px 2px 0 0;
            background: rgba(78,201,176,0.25);
            min-height: 2px;
            transition: height 0.3s;
        }
        .chart-bar:last-child { background: rgba(78,201,176,0.6); }

        /* ── Settings ── */
        .settings-section {
            padding: 8px 0; flex-shrink: 0;
            border-top: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.06));
        }
        .setting-row {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 6px; padding: 0 2px;
        }
        .setting-row label { font-size: 11px; color: rgba(255,255,255,0.55); }
        .setting-control { display: flex; align-items: center; gap: 5px; }
        .setting-control input[type="range"] { width: 70px; accent-color: var(--vscode-terminal-ansiGreen, #4ec9b0); }
        .setting-val {
            font-size: 10px; font-weight: 600;
            font-variant-numeric: tabular-nums;
            color: var(--vscode-terminal-ansiGreen, #4ec9b0);
            min-width: 28px; text-align: right;
        }
        .toggle-switch {
            width: 30px; height: 16px; border-radius: 8px;
            background: rgba(255,255,255,0.15); cursor: pointer;
            position: relative; transition: background 0.2s;
        }
        .toggle-switch.on { background: var(--vscode-terminal-ansiGreen, #4ec9b0); }
        .toggle-switch::after {
            content: ''; position: absolute;
            width: 12px; height: 12px; border-radius: 50%;
            background: #fff; top: 2px; left: 2px;
            transition: left 0.2s;
        }
        .toggle-switch.on::after { left: 16px; }

        /* ── Controls ── */
        .controls {
            padding: 8px 0 12px; flex-shrink: 0;
            display: flex; gap: 5px; justify-content: center;
        }
        button {
            padding: 5px 12px; border: none; border-radius: 4px;
            cursor: pointer; font-size: 11px; font-weight: 600;
            transition: opacity 0.15s;
        }
        button:hover { opacity: 0.8; }
        .btn-start { background: var(--vscode-terminal-ansiGreen, #4ec9b0); color: var(--vscode-editor-background, #1e1e1e); }
        .btn-stop  { background: #f14c4c; color: white; }
        .btn-reset { background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.08)); color: var(--vscode-button-secondaryForeground, rgba(255,255,255,0.6)); }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

        .empty-state { font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; padding: 12px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>◎ CodeAim</h1>
        <p>Aim trainer — train while you code</p>
    </div>

    <div class="mode-section">
        <div class="section-label">Mode</div>
        <div class="mode-grid">
            <button class="mode-btn active" data-mode="click" id="sbTabClick">◎ Click</button>
            <button class="mode-btn" data-mode="flick" id="sbTabFlick">⟐ Flick</button>
            <button class="mode-btn" data-mode="tracking" id="sbTabTracking">◉ Track</button>
            <button class="mode-btn" data-mode="reaction" id="sbTabReaction">⚡ React</button>
        </div>
    </div>

    <div class="stats-section">
        <div class="section-label">Session</div>
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
                <div class="stat-card-label">High</div>
                <div class="stat-card-value sc-high" id="highScore">0</div>
            </div>
        </div>
    </div>

    <div class="leaderboard-section">
        <div class="section-label">Leaderboard</div>
        <div id="leaderboard"></div>

        <div class="section-label" style="margin-top:8px">Recent Sessions</div>
        <div class="chart-wrap" id="chart"></div>
    </div>

    <div class="settings-section">
        <div class="section-label">Quick Settings</div>
        <div class="setting-row">
            <label>Target Size</label>
            <div class="setting-control">
                <input type="range" id="setRadius" min="14" max="50" value="28">
                <span class="setting-val" id="valRadius">28</span>
            </div>
        </div>
        <div class="setting-row">
            <label>Lifetime (ms)</label>
            <div class="setting-control">
                <input type="range" id="setLifetime" min="800" max="6000" value="3000" step="100">
                <span class="setting-val" id="valLifetime">3000</span>
            </div>
        </div>
        <div class="setting-row">
            <label>Spawn Rate (ms)</label>
            <div class="setting-control">
                <input type="range" id="setSpawn" min="400" max="3000" value="1200" step="50">
                <span class="setting-val" id="valSpawn">1200</span>
            </div>
        </div>
        <div class="setting-row">
            <label>Warm-up</label>
            <div class="toggle-switch" id="toggleWarmup"></div>
        </div>
    </div>

    <div class="controls">
        <button class="btn-start" id="startBtn">▶ Start</button>
        <button class="btn-stop" id="stopBtn">⏹ Stop</button>
        <button class="btn-reset" id="resetBtn">↺ Reset</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // ── State ──
        let score = 0, hits = 0, misses = 0, shots = 0;
        let streak = 0, bestStreak = 0, highScore = 0;
        let reactionTimes = [], bestReactionMs = Infinity;
        let currentMode = 'click';
        let warmupEnabled = false;
        let leaderboard = [];
        let sessionHistory = [];

        // ── DOM ──
        const scoreEl = document.getElementById('score');
        const accuracyEl = document.getElementById('accuracy');
        const streakEl = document.getElementById('streak');
        const reactionEl = document.getElementById('reaction');
        const bestReactionEl = document.getElementById('bestReaction');
        const highScoreEl = document.getElementById('highScore');
        const setRadius = document.getElementById('setRadius');
        const setLifetime = document.getElementById('setLifetime');
        const setSpawn = document.getElementById('setSpawn');
        const valRadius = document.getElementById('valRadius');
        const valLifetime = document.getElementById('valLifetime');
        const valSpawn = document.getElementById('valSpawn');
        const toggleWarmup = document.getElementById('toggleWarmup');

        function updateUI() {
            shots = hits + misses;
            scoreEl.textContent = score;
            accuracyEl.textContent = shots > 0 ? Math.round(hits/shots*100) + '%' : '—';
            streakEl.textContent = streak;
            const avg = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length) : 0;
            reactionEl.textContent = avg > 0 ? avg + 'ms' : '—';
            bestReactionEl.textContent = bestReactionMs < Infinity ? Math.round(bestReactionMs) + 'ms' : '—';
            if (score > highScore) { highScore = score; highScoreEl.textContent = highScore; }
        }

        function resetStats() {
            score = 0; hits = 0; misses = 0; shots = 0;
            streak = 0; bestStreak = 0; reactionTimes = [];
            bestReactionMs = Infinity;
            updateUI();
        }

        function renderLeaderboard() {
            const el = document.getElementById('leaderboard');
            if (leaderboard.length === 0) {
                el.innerHTML = '<div class="empty-state">No sessions yet. Start training!</div>';
                return;
            }
            el.innerHTML = leaderboard.slice(0, 10).map((entry, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
                const modeIcons = { click: '◎', flick: '⟐', tracking: '◉', reaction: '⚡' };
                return '<div class="lb-entry">'
                    + '<div class="lb-rank">' + medal + '</div>'
                    + '<div class="lb-info">'
                    + '<div class="lb-score">' + entry.score + '</div>'
                    + '<div class="lb-detail">' + (modeIcons[entry.mode] || '◎') + ' ' + entry.mode + ' · ' + entry.acc + '% · ' + entry.time + '</div>'
                    + '</div></div>';
            }).join('');
        }

        function renderChart() {
            const el = document.getElementById('chart');
            if (sessionHistory.length < 2) {
                el.innerHTML = '<div class="empty-state" style="font-size:10px;padding:4px">Play 2+ sessions to see trends</div>';
                return;
            }
            const max = Math.max(...sessionHistory, 1);
            el.innerHTML = sessionHistory.slice(-15).map(v => {
                const h = Math.max(4, (v / max) * 44);
                return '<div class="chart-bar" style="height:' + h + 'px"></div>';
            }).join('');
        }

        // ── Mode switching ──
        function switchMode(mode) {
            currentMode = mode;
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('sbTab' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
            resetStats();
        }
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });

        // ── Settings ──
        [setRadius, setLifetime, setSpawn].forEach(el => {
            el.addEventListener('input', () => {
                valRadius.textContent = setRadius.value;
                valLifetime.textContent = setLifetime.value;
                valSpawn.textContent = setSpawn.value;
                vscode.postMessage({
                    type: 'saveSettings',
                    settings: {
                        targetRadius: parseInt(setRadius.value),
                        targetLifetime: parseInt(setLifetime.value),
                        spawnInterval: parseInt(setSpawn.value),
                        maxTargets: 4,
                    }
                });
            });
        });

        toggleWarmup.addEventListener('click', () => {
            warmupEnabled = !warmupEnabled;
            toggleWarmup.classList.toggle('on', warmupEnabled);
        });

        // ── Buttons ──
        document.getElementById('startBtn').addEventListener('click', () => vscode.postMessage({ type: 'start' }));
        document.getElementById('stopBtn').addEventListener('click', () => vscode.postMessage({ type: 'stop' }));
        document.getElementById('resetBtn').addEventListener('click', () => { vscode.postMessage({ type: 'stop' }); resetStats(); });

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
                        updateUI();
                    }
                    break;
                case 'sessionComplete':
                    if (msg.result) {
                        leaderboard.push(msg.result);
                        leaderboard.sort((a, b) => b.score - a.score);
                        leaderboard = leaderboard.slice(0, 20);
                        sessionHistory.push(msg.result.score);
                        sessionHistory = sessionHistory.slice(-30);
                        vscode.postMessage({ type: 'saveLeaderboard', leaderboard, sessionHistory });
                        renderLeaderboard();
                        renderChart();
                    }
                    break;
                case 'resetStats': resetStats(); break;
                case 'highScore':
                    if (msg.highScore !== undefined) { highScore = msg.highScore; highScoreEl.textContent = highScore; }
                    break;
                case 'loadSettings':
                    if (msg.settings) {
                        setRadius.value = msg.settings.targetRadius || 28;
                        setLifetime.value = msg.settings.targetLifetime || 3000;
                        setSpawn.value = msg.settings.spawnInterval || 1200;
                        valRadius.textContent = setRadius.value;
                        valLifetime.textContent = setLifetime.value;
                        valSpawn.textContent = setSpawn.value;
                    }
                    break;
                case 'loadLeaderboard':
                    if (msg.leaderboard) leaderboard = msg.leaderboard;
                    if (msg.sessionHistory) sessionHistory = msg.sessionHistory;
                    renderLeaderboard();
                    renderChart();
                    break;
            }
        });

        updateUI();
        renderLeaderboard();
        renderChart();
    </script>
</body>
</html>`;
}
