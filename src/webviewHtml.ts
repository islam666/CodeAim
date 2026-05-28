import * as vscode from 'vscode';

export function getWebviewHtml(webview: vscode.Webview, _extensionUri: vscode.Uri): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: var(--vscode-editor-background, #1e1e1e);
            color: var(--vscode-editor-foreground, #d4d4d4);
            font-family: var(--vscode-editor-font-family, 'Segoe UI', sans-serif);
            font-size: var(--vscode-editor-font-size, 14px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        /* Header */
        .header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .header h1 {
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .header h1::before {
            content: '◎';
            color: #4ec9b0;
            font-size: 18px;
        }

        /* Stats bar */
        .stats-bar {
            padding: 8px 16px;
            display: flex;
            gap: 20px;
            border-bottom: 1px solid var(--vscode-panel-border, #333);
            flex-shrink: 0;
            font-size: 13px;
            background: var(--vscode-sideBar-background, #252526);
        }

        .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .stat-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground, #888);
        }

        .stat-value {
            font-size: 18px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }

        .stat-value.score { color: #4ec9b0; }
        .stat-value.accuracy { color: #569cd6; }
        .stat-value.streak { color: #ce9178; }
        .stat-value.reaction { color: #b5cea8; }
        .stat-value.high-score { color: #dcdcaa; }

        /* Canvas area */
        .canvas-container {
            flex: 1;
            position: relative;
            overflow: hidden;
        }

        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        /* Controls */
        .controls {
            padding: 10px 16px;
            border-top: 1px solid var(--vscode-panel-border, #333);
            display: flex;
            gap: 8px;
            justify-content: center;
            flex-shrink: 0;
        }

        button {
            padding: 6px 16px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: opacity 0.15s;
        }

        button:hover { opacity: 0.85; }

        .btn-start {
            background: #4ec9b0;
            color: #1e1e1e;
        }

        .btn-stop {
            background: #f14c4c;
            color: white;
        }

        .btn-reset {
            background: var(--vscode-button-secondaryBackground, #333);
            color: var(--vscode-button-secondaryForeground, #ccc);
        }

        /* Overlay messages */
        .overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            pointer-events: none;
            z-index: 10;
        }

        .overlay-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            opacity: 0.9;
        }

        .overlay-subtitle {
            font-size: 14px;
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CodeAim</h1>
    </div>

    <div class="stats-bar">
        <div class="stat">
            <span class="stat-label">Score</span>
            <span class="stat-value score" id="score">0</span>
        </div>
        <div class="stat">
            <span class="stat-label">Accuracy</span>
            <span class="stat-value accuracy" id="accuracy">—</span>
        </div>
        <div class="stat">
            <span class="stat-label">Streak</span>
            <span class="stat-value streak" id="streak">0</span>
        </div>
        <div class="stat">
            <span class="stat-label">Avg ms</span>
            <span class="stat-value reaction" id="reaction">—</span>
        </div>
        <div class="stat">
            <span class="stat-label">Best ms</span>
            <span class="stat-value reaction" id="bestReaction">—</span>
        </div>
        <div class="stat">
            <span class="stat-label">High Score</span>
            <span class="stat-value high-score" id="highScore">0</span>
        </div>
    </div>

    <div class="canvas-container" id="canvasContainer">
        <canvas id="gameCanvas"></canvas>
        <div class="overlay" id="overlay">
            <div class="overlay-title">Click Start to Begin</div>
            <div class="overlay-subtitle">Click targets as fast as you can</div>
        </div>
    </div>

    <div class="controls">
        <button class="btn-start" id="startBtn">▶ Start</button>
        <button class="btn-stop" id="stopBtn">⏹ Stop</button>
        <button class="btn-reset" id="resetBtn">↺ Reset</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // ── Game State ──────────────────────────────────────────
        let gameRunning = false;
        let score = 0;
        let hits = 0;
        let misses = 0;
        let shots = 0;
        let streak = 0;
        let bestStreak = 0;
        let highScore = 0;
        let reactionTimes = [];
        let bestReactionMs = Infinity;
        let targets = [];
        let lastSpawnTime = 0;
        let spawnInterval = 1200; // ms between spawns
        let maxTargets = 3;
        let targetLifetime = 3000; // ms before target disappears
        let targetRadius = 25;
        let gameStartTime = 0;

        // ── DOM Elements ────────────────────────────────────────
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('canvasContainer');
        const overlay = document.getElementById('overlay');
        const scoreEl = document.getElementById('score');
        const accuracyEl = document.getElementById('accuracy');
        const streakEl = document.getElementById('streak');
        const reactionEl = document.getElementById('reaction');
        const bestReactionEl = document.getElementById('bestReaction');
        const highScoreEl = document.getElementById('highScore');
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const resetBtn = document.getElementById('resetBtn');

        // ── Canvas Setup ────────────────────────────────────────
        function resizeCanvas() {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // ── Target Class ────────────────────────────────────────
        class Target {
            constructor(x, y, radius) {
                this.x = x;
                this.y = y;
                this.radius = radius;
                this.spawnTime = Date.now();
                this.hit = false;
                this.missed = false;
                this.scale = 0;
                this.pulsePhase = Math.random() * Math.PI * 2;
            }

            draw() {
                const now = Date.now();
                const age = now - this.spawnTime;
                const lifeRatio = age / targetLifetime;

                // Animate in
                if (this.scale < 1) {
                    this.scale = Math.min(1, this.scale + 0.1);
                }

                // Fade out near end of life
                let alpha = 1;
                if (lifeRatio > 0.7) {
                    alpha = 1 - (lifeRatio - 0.7) / 0.3;
                }

                const pulse = 1 + Math.sin(this.pulsePhase + now * 0.003) * 0.05;
                const r = this.radius * this.scale * pulse;

                // Outer ring
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = \`rgba(78, 201, 176, \${alpha})\`;
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Middle ring
                ctx.beginPath();
                ctx.arc(this.x, this.y, r * 0.65, 0, Math.PI * 2);
                ctx.strokeStyle = \`rgba(86, 156, 214, \${alpha * 0.8})\`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Inner dot
                ctx.beginPath();
                ctx.arc(this.x, this.y, r * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = \`rgba(206, 145, 120, \${alpha})\`;
                ctx.fill();

                // Bullseye
                ctx.beginPath();
                ctx.arc(this.x, this.y, r * 0.1, 0, Math.PI * 2);
                ctx.fillStyle = \`rgba(78, 201, 176, \${alpha})\`;
                ctx.fill();

                return alpha > 0;
            }

            isExpired() {
                return Date.now() - this.spawnTime > targetLifetime;
            }

            contains(px, py) {
                const dx = px - this.x;
                const dy = py - this.y;
                return dx * dx + dy * dy <= this.radius * this.radius;
            }
        }

        // ── Spawning ────────────────────────────────────────────
        function spawnTarget() {
            if (!gameRunning) return;

            const rect = container.getBoundingClientRect();
            const padding = targetRadius + 10;
            const x = padding + Math.random() * (rect.width - padding * 2);
            const y = padding + Math.random() * (rect.height - padding * 2);

            targets.push(new Target(x, y, targetRadius));
            lastSpawnTime = Date.now();
        }

        // ── Scoring ─────────────────────────────────────────────
        function handleHit(target, reactionMs) {
            target.hit = true;
            hits++;
            streak++;
            if (streak > bestStreak) bestStreak = streak;
            reactionTimes.push(reactionMs);
            if (reactionMs < bestReactionMs) bestReactionMs = reactionMs;

            // Score formula: base 100 + time bonus + streak bonus
            const timeBonus = Math.max(0, Math.floor((targetLifetime - reactionMs) / targetLifetime * 50));
            const streakBonus = Math.min(streak * 5, 50);
            score += 100 + timeBonus + streakBonus;

            // Speed things up
            spawnInterval = Math.max(500, spawnInterval - 5);
        }

        function handleMiss() {
            misses++;
            streak = 0;
        }

        function updateStats() {
            shots = hits + misses;
            const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
            const avgReaction = reactionTimes.length > 0
                ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
                : 0;

            scoreEl.textContent = score;
            accuracyEl.textContent = shots > 0 ? accuracy + '%' : '—';
            streakEl.textContent = streak;
            reactionEl.textContent = avgReaction > 0 ? avgReaction + 'ms' : '—';
            bestReactionEl.textContent = bestReactionMs < Infinity ? bestReactionMs + 'ms' : '—';

            if (score > highScore) {
                highScore = score;
                highScoreEl.textContent = highScore;
                vscode.postMessage({ type: 'highScore', highScore });
            }
        }

        // ── Game Loop ───────────────────────────────────────────
        function gameLoop() {
            if (!gameRunning && targets.length === 0) return;

            const now = Date.now();
            const rect = container.getBoundingClientRect();

            // Clear
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Draw subtle grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            for (let x = 0; x < rect.width; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, rect.height);
                ctx.stroke();
            }
            for (let y = 0; y < rect.height; y += 40) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(rect.width, y);
                ctx.stroke();
            }

            // Spawn targets
            if (gameRunning && targets.length < maxTargets && now - lastSpawnTime > spawnInterval) {
                spawnTarget();
            }

            // Update & draw targets
            targets = targets.filter(t => {
                if (t.hit) return false;
                if (t.isExpired() && !t.missed) {
                    handleMiss();
                    t.missed = true;
                }
                if (t.missed) return false;
                t.draw();
                return true;
            });

            updateStats();

            requestAnimationFrame(gameLoop);
        }

        // ── Input Handling ──────────────────────────────────────
        canvas.addEventListener('mousedown', (e) => {
            if (!gameRunning) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check targets (reverse order = top-most first)
            let hitAny = false;
            for (let i = targets.length - 1; i >= 0; i--) {
                if (targets[i].contains(x, y)) {
                    const reactionMs = Date.now() - targets[i].spawnTime;
                    handleHit(targets[i], reactionMs);
                    targets.splice(i, 1);
                    hitAny = true;
                    break;
                }
            }

            if (!hitAny) {
                handleMiss();
            }
        });

        // ── Controls ────────────────────────────────────────────
        function startGame() {
            if (gameRunning) return;
            gameRunning = true;
            gameStartTime = Date.now();
            lastSpawnTime = 0;
            overlay.style.display = 'none';
            gameLoop();
        }

        function stopGame() {
            gameRunning = false;
            targets = [];
            overlay.style.display = 'block';
            overlay.innerHTML = '<div class="overlay-title">Session Over</div><div class="overlay-subtitle">Score: ' + score + ' | Best Streak: ' + bestStreak + '</div>';
        }

        function resetStats() {
            score = 0;
            hits = 0;
            misses = 0;
            shots = 0;
            streak = 0;
            bestStreak = 0;
            reactionTimes = [];
            bestReactionMs = Infinity;
            spawnInterval = 1200;
            targets = [];
            gameRunning = false;
            overlay.style.display = 'block';
            overlay.innerHTML = '<div class="overlay-title">Click Start to Begin</div><div class="overlay-subtitle">Click targets as fast as you can</div>';
            updateStats();
        }

        startBtn.addEventListener('click', startGame);
        stopBtn.addEventListener('click', stopGame);
        resetBtn.addEventListener('click', resetStats);

        // ── VS Code Extension Messages ──────────────────────────
        window.addEventListener('message', (event) => {
            const msg = event.data;
            switch (msg.type) {
                case 'start': startGame(); break;
                case 'stop': stopGame(); break;
                case 'resetStats': resetStats(); break;
                case 'resetHighScore':
                    highScore = 0;
                    highScoreEl.textContent = '0';
                    break;
            }
        });

        // ── Initial draw ────────────────────────────────────────
        function initialDraw() {
            const rect = container.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            for (let x = 0; x < rect.width; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke();
            }
            for (let y = 0; y < rect.height; y += 40) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke();
            }
        }
        initialDraw();
    </script>
</body>
</html>`;
}
