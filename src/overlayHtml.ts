export function getOverlayHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: transparent;
            font-family: var(--vscode-editor-font-family, 'Segoe UI', sans-serif);
            color: #d4d4d4;
        }

        .overlay-root {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: rgba(0, 0, 0, 0.25);
            position: relative;
        }

        /* Stats bar - top floating */
        .stats-bar {
            display: flex;
            justify-content: center;
            gap: 32px;
            padding: 10px 24px;
            background: rgba(30, 30, 30, 0.75);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0;
            z-index: 10;
        }

        .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .stat-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgba(255,255,255,0.4);
        }

        .stat-value {
            font-size: 20px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }

        .stat-value.score { color: #4ec9b0; }
        .stat-value.accuracy { color: #569cd6; }
        .stat-value.streak { color: #ce9178; }
        .stat-value.reaction { color: #b5cea8; }
        .stat-value.high-score { color: #dcdcaa; }

        /* Canvas fills remaining space */
        .canvas-wrap {
            flex: 1;
            position: relative;
            cursor: crosshair;
        }

        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }

        /* Center prompt */
        .prompt {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            pointer-events: none;
            z-index: 5;
        }

        .prompt-title {
            font-size: 32px;
            font-weight: 700;
            color: rgba(255,255,255,0.7);
            margin-bottom: 8px;
            text-shadow: 0 2px 12px rgba(0,0,0,0.5);
        }

        .prompt-sub {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
        }

        .prompt kbd {
            display: inline-block;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 4px;
            padding: 1px 7px;
            font-size: 12px;
            font-family: inherit;
            margin: 0 2px;
        }

        /* Bottom bar */
        .bottom-bar {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            background: rgba(30, 30, 30, 0.75);
            backdrop-filter: blur(8px);
            border-top: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0;
            z-index: 10;
        }

        .btn {
            padding: 6px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: opacity 0.15s, transform 0.1s;
        }
        .btn:hover { opacity: 0.85; }
        .btn:active { transform: scale(0.97); }

        .btn-start { background: #4ec9b0; color: #1e1e1e; }
        .btn-stop  { background: #f14c4c; color: #fff; }
        .btn-exit  { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 11px; padding: 4px 14px; }

        /* Hit flash */
        .hit-flash {
            position: absolute;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%) scale(0);
            animation: hitPop 0.4s ease-out forwards;
            z-index: 20;
        }

        @keyframes hitPop {
            0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="overlay-root">
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

        <div class="canvas-wrap" id="canvasWrap">
            <canvas id="gameCanvas"></canvas>
            <div class="prompt" id="prompt">
                <div class="overlay-title">◎ CodeAim Overlay</div>
                <div class="prompt-sub">Press <kbd>Ctrl+Shift+A</kbd> to toggle · <kbd>Esc</kbd> to exit</div>
            </div>
        </div>

        <div class="bottom-bar">
            <button class="btn btn-start" id="startBtn">▶ Start</button>
            <button class="btn btn-stop" id="stopBtn">⏹ Stop</button>
            <button class="btn btn-exit" id="exitBtn">✕ Exit Overlay</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // ── State ──
        let gameRunning = false;
        let score = 0, hits = 0, misses = 0, shots = 0;
        let streak = 0, bestStreak = 0;
        let highScore = 0;
        let reactionTimes = [];
        let bestReactionMs = Infinity;
        let targets = [];
        let lastSpawnTime = 0;
        let spawnInterval = 1200;
        let maxTargets = 4;
        let targetLifetime = 3000;
        let targetRadius = 28;

        // ── DOM ──
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const wrap = document.getElementById('canvasWrap');
        const prompt = document.getElementById('prompt');
        const scoreEl = document.getElementById('score');
        const accuracyEl = document.getElementById('accuracy');
        const streakEl = document.getElementById('streak');
        const reactionEl = document.getElementById('reaction');
        const bestReactionEl = document.getElementById('bestReaction');
        const highScoreEl = document.getElementById('highScore');

        // ── Resize ──
        function resize() {
            const rect = wrap.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        window.addEventListener('resize', resize);
        resize();

        // ── Target ──
        class Target {
            constructor(x, y) {
                this.x = x; this.y = y;
                this.spawnTime = Date.now();
                this.hit = false; this.missed = false;
                this.scale = 0;
                this.pulse = Math.random() * Math.PI * 2;
            }
            draw() {
                const age = Date.now() - this.spawnTime;
                const life = age / targetLifetime;
                this.scale = Math.min(1, this.scale + 0.08);
                let alpha = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
                const pulse = 1 + Math.sin(this.pulse + Date.now() * 0.003) * 0.05;
                const r = targetRadius * this.scale * pulse;

                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = \`rgba(78, 201, 176, \${alpha})\`;
                ctx.lineWidth = 2.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(this.x, this.y, r * 0.6, 0, Math.PI * 2);
                ctx.strokeStyle = \`rgba(86, 156, 214, \${alpha * 0.8})\`;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(this.x, this.y, r * 0.25, 0, Math.PI * 2);
                ctx.fillStyle = \`rgba(206, 145, 120, \${alpha})\`;
                ctx.fill();

                return alpha > 0;
            }
            expired() { return Date.now() - this.spawnTime > targetLifetime; }
            contains(px, py) {
                const dx = px - this.x, dy = py - this.y;
                return dx*dx + dy*dy <= targetRadius*targetRadius;
            }
        }

        // ── Spawn ──
        function spawn() {
            if (!gameRunning) return;
            const rect = wrap.getBoundingClientRect();
            const pad = targetRadius + 15;
            const x = pad + Math.random() * (rect.width - pad * 2);
            const y = pad + Math.random() * (rect.height - pad * 2);
            targets.push(new Target(x, y));
            lastSpawnTime = Date.now();
        }

        // ── Hit / Miss ──
        function handleHit(target, ms) {
            target.hit = true; hits++; streak++;
            if (streak > bestStreak) bestStreak = streak;
            reactionTimes.push(ms);
            if (ms < bestReactionMs) bestReactionMs = ms;
            const timeBonus = Math.max(0, Math.floor((targetLifetime - ms) / targetLifetime * 50));
            const streakBonus = Math.min(streak * 5, 50);
            score += 100 + timeBonus + streakBonus;
            spawnInterval = Math.max(500, spawnInterval - 5);

            // hit flash
            const flash = document.createElement('div');
            flash.className = 'hit-flash';
            flash.style.left = target.x + 'px';
            flash.style.top = target.y + 'px';
            flash.style.background = 'rgba(78,201,176,0.35)';
            wrap.appendChild(flash);
            setTimeout(() => flash.remove(), 400);
        }

        function handleMiss() { misses++; streak = 0; }

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

        // ── Loop ──
        function loop() {
            if (!gameRunning && targets.length === 0) return;
            const now = Date.now();
            const rect = wrap.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            // subtle grid
            ctx.strokeStyle = 'rgba(255,255,255,0.02)';
            ctx.lineWidth = 1;
            for (let x = 0; x < rect.width; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,rect.height); ctx.stroke(); }
            for (let y = 0; y < rect.height; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(rect.width,y); ctx.stroke(); }

            if (gameRunning && targets.length < maxTargets && now - lastSpawnTime > spawnInterval) spawn();

            targets = targets.filter(t => {
                if (t.hit) return false;
                if (t.expired() && !t.missed) { handleMiss(); t.missed = true; }
                if (t.missed) return false;
                t.draw(); return true;
            });

            updateUI();
            requestAnimationFrame(loop);
        }

        // ── Mouse ──
        canvas.addEventListener('mousedown', e => {
            if (!gameRunning) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            let hitAny = false;
            for (let i = targets.length - 1; i >= 0; i--) {
                if (targets[i].contains(x, y)) {
                    handleHit(targets[i], Date.now() - targets[i].spawnTime);
                    targets.splice(i, 1); hitAny = true; break;
                }
            }
            if (!hitAny) handleMiss();
        });

        // ── Controls ──
        function startGame() {
            if (gameRunning) return;
            gameRunning = true; lastSpawnTime = 0;
            prompt.style.display = 'none';
            loop();
        }

        function stopGame() {
            gameRunning = false; targets = [];
            prompt.style.display = 'block';
            prompt.innerHTML = '<div class="overlay-title">Session Over</div>'
                + '<div class="prompt-sub">Score: ' + score + ' · Best Streak: ' + bestStreak
                + '</div><div class="prompt-sub" style="margin-top:6px">Press ▶ to play again</div>';
        }

        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('stopBtn').addEventListener('click', stopGame);
        document.getElementById('exitBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'closeOverlay' });
        });

        // ── Messages from extension ──
        window.addEventListener('message', e => {
            const msg = e.data;
            switch (msg.type) {
                case 'start': startGame(); break;
                case 'stop': stopGame(); break;
                case 'toggle':
                    if (gameRunning) stopGame(); else startGame();
                    break;
            }
        });
    </script>
</body>
</html>`;
}
