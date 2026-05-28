export function getOverlayHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        html, body {
            width: 100%; height: 100%;
            overflow: hidden;
            background: transparent;
            font-family: var(--vscode-editor-font-family, 'Segoe UI', sans-serif);
            color: var(--vscode-editor-foreground, #d4d4d4);
        }

        /* ── Smooth overlay enter/exit ── */
        @keyframes overlayIn {
            0%   { opacity: 0; transform: scale(0.97); }
            100% { opacity: 1; transform: scale(1); }
        }
        @keyframes overlayOut {
            0%   { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.97); }
        }

        .overlay-root {
            width: 100%; height: 100%;
            display: flex; flex-direction: column;
            background: rgba(0, 0, 0, 0.25);
            position: relative;
            animation: overlayIn 0.25s ease-out;
        }
        .overlay-root.closing {
            animation: overlayOut 0.2s ease-in forwards;
        }

        /* ── Screen shake ── */
        @keyframes shake {
            0%, 100% { transform: translate(0, 0); }
            20%  { transform: translate(-3px, 2px); }
            40%  { transform: translate(3px, -2px); }
            60%  { transform: translate(-2px, -3px); }
            80%  { transform: translate(2px, 3px); }
        }
        .shake { animation: shake 0.2s ease-out; }

        /* ── Stats bar ── */
        .stats-bar {
            display: flex; justify-content: center; gap: 24px;
            padding: 7px 20px;
            background: rgba(30, 30, 30, 0.82);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0; z-index: 10;
        }
        .stat { display: flex; flex-direction: column; align-items: center; }
        .stat-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.35); }
        .stat-value { font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .stat-value.score { color: var(--vscode-terminal-ansiGreen, #4ec9b0); }
        .stat-value.accuracy { color: var(--vscode-terminal-ansiBlue, #569cd6); }
        .stat-value.streak { color: var(--vscode-terminal-ansiYellow, #dcdcaa); }
        .stat-value.timer { color: #c586c0; }
        .stat-value.reaction { color: #b5cea8; }
        .stat-value.high-score { color: var(--vscode-terminal-ansiYellow, #dcdcaa); }
        .stat-value.mode { color: var(--vscode-terminal-ansiMagenta, #c586c0); font-size: 13px; }

        /* ── Mode selector ── */
        .mode-tabs {
            display: flex; justify-content: center; gap: 5px;
            padding: 5px 14px;
            background: rgba(30, 30, 30, 0.50);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0; z-index: 10;
        }
        .mode-tab {
            padding: 3px 12px; border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.1);
            background: transparent; color: rgba(255,255,255,0.5);
            cursor: pointer; font-size: 11px; font-weight: 600;
            transition: all 0.15s;
        }
        .mode-tab:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
        .mode-tab.active {
            background: var(--vscode-terminal-ansiGreen, #4ec9b0);
            color: #1e1e1e;
            border-color: var(--vscode-terminal-ansiGreen, #4ec9b0);
        }

        /* ── Canvas area ── */
        .canvas-wrap {
            flex: 1; position: relative;
            cursor: none;
        }
        canvas { display: block; width: 100%; height: 100%; }

        /* ── Custom crosshair ── */
        .crosshair {
            position: fixed; pointer-events: none; z-index: 9999;
            transform: translate(-50%, -50%);
        }

        /* ── Center prompt / summary ── */
        .prompt {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            pointer-events: none;
            z-index: 5;
        }
        .prompt-title {
            font-size: 28px; font-weight: 700;
            color: rgba(255,255,255,0.7);
            margin-bottom: 6px;
            text-shadow: 0 2px 12px rgba(0,0,0,0.5);
        }
        .prompt-sub { font-size: 13px; color: rgba(255,255,255,0.4); }
        .prompt kbd {
            display: inline-block;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 4px; padding: 1px 6px;
            font-size: 11px; font-family: inherit; margin: 0 2px;
        }

        /* ── Warmup banner ── */
        .warmup-banner {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            text-align: center; pointer-events: none; z-index: 6;
            display: none;
        }
        .warmup-banner.visible { display: block; }
        .warmup-text { font-size: 36px; font-weight: 800; color: rgba(255,255,255,0.8); text-shadow: 0 2px 16px rgba(0,0,0,0.5); }
        .warmup-sub  { font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 4px; }

        /* ── Session summary card ── */
        .summary-card {
            background: rgba(30, 30, 30, 0.92);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 14px;
            padding: 26px 34px;
            min-width: 360px;
            pointer-events: auto;
        }
        .summary-card h2 {
            font-size: 22px; font-weight: 700;
            color: var(--vscode-terminal-ansiGreen, #4ec9b0);
            margin-bottom: 3px;
        }
        .summary-card .mode-label {
            font-size: 10px; color: rgba(255,255,255,0.4);
            text-transform: uppercase; letter-spacing: 1px;
            margin-bottom: 14px;
        }
        .summary-grid {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 8px 22px; margin-bottom: 14px;
        }
        .summary-item { text-align: center; }
        .summary-item-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.35); }
        .summary-item-value { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .summary-actions { display: flex; gap: 8px; justify-content: center; margin-top: 4px; }

        /* ── Bottom bar ── */
        .bottom-bar {
            display: flex; justify-content: center; align-items: center; gap: 8px;
            padding: 7px 14px;
            background: rgba(30, 30, 30, 0.82);
            backdrop-filter: blur(8px);
            border-top: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0; z-index: 10;
        }
        .btn {
            padding: 5px 16px; border: none; border-radius: 4px;
            cursor: pointer; font-size: 12px; font-weight: 600;
            transition: opacity 0.15s, transform 0.1s;
        }
        .btn:hover { opacity: 0.85; }
        .btn:active { transform: scale(0.97); }
        .btn-start  { background: var(--vscode-terminal-ansiGreen, #4ec9b0); color: #1e1e1e; }
        .btn-stop   { background: #f14c4c; color: #fff; }
        .btn-exit   { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 11px; padding: 4px 11px; }
        .btn-again  { background: var(--vscode-terminal-ansiGreen, #4ec9b0); color: #1e1e1e; }
        .btn-settings { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); font-size: 11px; padding: 4px 10px; }
        .btn-sound  { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); font-size: 11px; padding: 4px 10px; }
        .btn-sound.muted { color: rgba(241,76,76,0.7); }

        /* ── Hit flash ring ── */
        .hit-flash {
            position: absolute;
            width: 60px; height: 60px; border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%) scale(0);
            animation: hitPop 0.4s ease-out forwards;
            z-index: 20;
        }
        @keyframes hitPop {
            0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }

        /* ── Hit marker (checkmark that expands) ── */
        .hit-marker {
            position: absolute; pointer-events: none; z-index: 22;
            transform: translate(-50%, -50%) scale(0.5);
            animation: markerPop 0.5s ease-out forwards;
        }
        @keyframes markerPop {
            0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
            30%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }

        /* ── Miss indicator ── */
        .miss-indicator {
            position: absolute; pointer-events: none; z-index: 22;
            animation: missFade 0.6s ease-out forwards;
        }
        @keyframes missFade {
            0%   { opacity: 1; transform: translate(-50%, -50%) scale(0.8); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1.4); }
        }

        /* ── Streak announcer ── */
        .streak-announce {
            position: absolute; top: 28%; left: 50%;
            transform: translate(-50%, -50%);
            font-size: 26px; font-weight: 800;
            color: var(--vscode-terminal-ansiYellow, #dcdcaa);
            text-shadow: 0 2px 16px rgba(255,200,50,0.4);
            pointer-events: none; z-index: 25;
            white-space: nowrap;
            animation: streakFade 1.0s ease-out forwards;
        }
        @keyframes streakFade {
            0%   { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            20%  { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
            100% { transform: translate(-50%, -60%) scale(1); opacity: 0; }
        }

        /* ── Combo counter ── */
        .combo-counter {
            position: absolute; top: 18%; right: 5%;
            text-align: right; pointer-events: none; z-index: 25;
            transition: transform 0.1s;
        }
        .combo-counter .combo-num {
            font-size: 42px; font-weight: 900;
            color: var(--vscode-terminal-ansiYellow, #dcdcaa);
            text-shadow: 0 2px 16px rgba(255,200,50,0.3);
            line-height: 1;
        }
        .combo-counter .combo-label {
            font-size: 10px; text-transform: uppercase;
            letter-spacing: 2px; color: rgba(255,255,255,0.35);
        }
        .combo-counter.big .combo-num {
            font-size: 56px;
            color: #f14c4c;
            text-shadow: 0 2px 20px rgba(241,76,76,0.4);
        }
        @keyframes comboPulse {
            0%   { transform: scale(1); }
            50%  { transform: scale(1.15); }
            100% { transform: scale(1); }
        }
        .combo-counter.pulse { animation: comboPulse 0.15s ease-out; }

        /* ── Accuracy ring ── */
        .accuracy-ring {
            position: fixed; pointer-events: none; z-index: 9997;
            transform: translate(-50%, -50%);
        }

        /* ── Settings panel ── */
        .settings-panel {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(30, 30, 30, 0.93);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px; padding: 20px 28px;
            min-width: 310px; z-index: 30;
            display: none;
        }
        .settings-panel.visible { display: block; }
        .settings-panel h3 { font-size: 16px; font-weight: 600; margin-bottom: 14px; color: var(--vscode-terminal-ansiGreen, #4ec9b0); }
        .setting-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .setting-row label { font-size: 12px; color: rgba(255,255,255,0.7); }
        .setting-row input[type="range"] { width: 110px; accent-color: var(--vscode-terminal-ansiGreen, #4ec9b0); }
        .setting-row .setting-val { font-size: 12px; font-weight: 600; color: var(--vscode-terminal-ansiGreen, #4ec9b0); min-width: 36px; text-align: right; font-variant-numeric: tabular-nums; }
        .setting-toggle { display: flex; align-items: center; gap: 8px; }
        .toggle-switch {
            width: 34px; height: 18px; border-radius: 9px;
            background: rgba(255,255,255,0.15); cursor: pointer;
            position: relative; transition: background 0.2s;
        }
        .toggle-switch.on { background: var(--vscode-terminal-ansiGreen, #4ec9b0); }
        .toggle-switch::after {
            content: ''; position: absolute;
            width: 14px; height: 14px; border-radius: 50%;
            background: #fff; top: 2px; left: 2px;
            transition: left 0.2s;
        }
        .toggle-switch.on::after { left: 18px; }
        .settings-close {
            display: block; margin: 14px auto 0;
            padding: 5px 20px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.15);
            color: rgba(255,255,255,0.7);
            border-radius: 4px; cursor: pointer; font-size: 12px;
        }
        .settings-close:hover { background: rgba(255,255,255,0.15); }
    </style>
</head>
<body>
    <div class="overlay-root" id="overlayRoot">
        <div class="stats-bar">
            <div class="stat"><span class="stat-label">Score</span><span class="stat-value score" id="score">0</span></div>
            <div class="stat"><span class="stat-label">Accuracy</span><span class="stat-value accuracy" id="accuracy">—</span></div>
            <div class="stat"><span class="stat-label">Streak</span><span class="stat-value streak" id="streak">0</span></div>
            <div class="stat"><span class="stat-label">Time</span><span class="stat-value timer" id="timer">0:00</span></div>
            <div class="stat"><span class="stat-label">Avg ms</span><span class="stat-value reaction" id="reaction">—</span></div>
            <div class="stat"><span class="stat-label">Best ms</span><span class="stat-value reaction" id="bestReaction">—</span></div>
            <div class="stat"><span class="stat-label">High</span><span class="stat-value high-score" id="highScore">0</span></div>
            <div class="stat"><span class="stat-label">Mode</span><span class="stat-value mode" id="modeLabel">Click</span></div>
        </div>

        <div class="mode-tabs">
            <button class="mode-tab active" data-mode="click" id="tabClick">◎ Click</button>
            <button class="mode-tab" data-mode="flick" id="tabFlick">⟐ Flick</button>
            <button class="mode-tab" data-mode="tracking" id="tabTracking">◉ Track</button>
            <button class="mode-tab" data-mode="reaction" id="tabReaction">⚡ React</button>
        </div>

        <div class="canvas-wrap" id="canvasWrap">
            <canvas id="gameCanvas"></canvas>

            <div class="prompt" id="prompt">
                <div class="prompt-title">◎ CodeAim</div>
                <div class="prompt-sub"><kbd>Ctrl+Alt+Q</kbd> toggle · <kbd>Esc</kbd> exit · <kbd>1-4</kbd> modes</div>
                <div class="prompt-sub" style="margin-top:5px">Select a mode, then press ▶ Start</div>
            </div>

            <div class="warmup-banner" id="warmupBanner">
                <div class="warmup-text" id="warmupText">Get Ready</div>
                <div class="warmup-sub" id="warmupSub">Warm-up: 30 seconds</div>
            </div>

            <div class="combo-counter" id="comboCounter" style="display:none">
                <div class="combo-num" id="comboNum">0</div>
                <div class="combo-label">Combo</div>
            </div>

            <div class="settings-panel" id="settingsPanel">
                <h3>⚙ Settings</h3>
                <div class="setting-row">
                    <label>Target Size</label>
                    <input type="range" id="setRadius" min="14" max="50" value="28">
                    <span class="setting-val" id="valRadius">28</span>
                </div>
                <div class="setting-row">
                    <label>Target Lifetime (ms)</label>
                    <input type="range" id="setLifetime" min="800" max="6000" value="3000" step="100">
                    <span class="setting-val" id="valLifetime">3000</span>
                </div>
                <div class="setting-row">
                    <label>Spawn Interval (ms)</label>
                    <input type="range" id="setSpawn" min="400" max="3000" value="1200" step="50">
                    <span class="setting-val" id="valSpawn">1200</span>
                </div>
                <div class="setting-row">
                    <label>Max Targets</label>
                    <input type="range" id="setMaxTargets" min="1" max="10" value="4">
                    <span class="setting-val" id="valMaxTargets">4</span>
                </div>
                <div class="setting-row">
                    <div class="setting-toggle">
                        <label>Warm-up Mode</label>
                        <div class="toggle-switch" id="toggleWarmup"></div>
                    </div>
                </div>
                <button class="settings-close" id="settingsClose">Done</button>
            </div>
        </div>

        <div class="bottom-bar">
            <button class="btn btn-start" id="startBtn">▶ Start</button>
            <button class="btn btn-stop" id="stopBtn">⏹ Stop</button>
            <button class="btn btn-sound" id="soundBtn">🔊</button>
            <button class="btn btn-settings" id="settingsBtn">⚙</button>
            <button class="btn btn-exit" id="exitBtn">✕ Exit</button>
        </div>
    </div>
    <div class="crosshair" id="crosshair"></div>
    <canvas class="accuracy-ring" id="accRing" width="64" height="64" style="display:none"></canvas>

    <script>
        // ═══════════════════════════════════════════════════════
        //  Polyfill for roundRect
        // ═══════════════════════════════════════════════════════
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                this.moveTo(x + r, y);
                this.arcTo(x + w, y, x + w, y + h, r);
                this.arcTo(x + w, y + h, x, y + h, r);
                this.arcTo(x, y + h, x, y, r);
                this.arcTo(x, y, x + w, y, r);
                this.closePath();
                return this;
            };
        }

        const vscode = acquireVsCodeApi();

        // ── Settings ──
        let settings = { targetRadius: 28, targetLifetime: 3000, spawnInterval: 1200, maxTargets: 4 };
        let soundEnabled = true;
        let warmupEnabled = false;

        // ── Game State ──
        let gameRunning = false;
        let currentMode = 'click';
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
        let sessionTimer = null;
        let sessionSeconds = 0;

        // ── Mode-specific state ──
        let flickNextPos = null;
        let trackingTarget = null;
        let trackingMaxHp = 5;
        let trackingSpeed = 2.5;
        let reactionIdle = true;
        let reactionIdleTimer = null;

        // ── Ghost trail ──
        let mouseHistory = [];
        const GHOST_MAX = 14;
        const GHOST_SPACING = 3;
        let lastGhostPos = null;

        // ── Particles ──
        let particles = [];

        // ── DOM ──
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const wrap = document.getElementById('canvasWrap');
        const prompt = document.getElementById('prompt');
        const crosshair = document.getElementById('crosshair');
        const accRing = document.getElementById('accRing');
        const accRingCtx = accRing.getContext('2d');
        const overlayRoot = document.getElementById('overlayRoot');
        const scoreEl = document.getElementById('score');
        const accuracyEl = document.getElementById('accuracy');
        const streakEl = document.getElementById('streak');
        const timerEl = document.getElementById('timer');
        const reactionEl = document.getElementById('reaction');
        const bestReactionEl = document.getElementById('bestReaction');
        const highScoreEl = document.getElementById('highScore');
        const modeLabel = document.getElementById('modeLabel');
        const comboCounter = document.getElementById('comboCounter');
        const comboNum = document.getElementById('comboNum');
        const warmupBanner = document.getElementById('warmupBanner');
        const warmupText = document.getElementById('warmupText');
        const soundBtn = document.getElementById('soundBtn');

        // ═══════════════════════════════════════════════════════
        //  SOUND ENGINE
        // ═══════════════════════════════════════════════════════
        let audioCtx = null;
        function ensureAudio() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        function playTone(freq, duration, type, volume) {
            if (!soundEnabled) return;
            ensureAudio();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(volume || 0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }
        function playHitSound() {
            playTone(880, 0.12, 'sine', 0.12);
            setTimeout(() => playTone(1100, 0.08, 'sine', 0.08), 40);
        }
        function playMissSound() { playTone(220, 0.2, 'sawtooth', 0.08); }
        function playStreakSound(n) {
            const base = 600 + Math.min(n, 20) * 40;
            playTone(base, 0.1, 'sine', 0.10);
            setTimeout(() => playTone(base * 1.25, 0.1, 'sine', 0.10), 60);
            setTimeout(() => playTone(base * 1.5, 0.15, 'sine', 0.12), 120);
        }
        function playReactionGoSound() { playTone(440, 0.15, 'square', 0.10); }
        function playReactionFailSound() { playTone(150, 0.3, 'sawtooth', 0.12); }
        function playWarmupBeep() { playTone(660, 0.08, 'sine', 0.08); }
        function playWarmupGo() { playTone(880, 0.2, 'sine', 0.15); }

        // ═══════════════════════════════════════════════════════
        //  STREAK ANNOUNCER
        // ═══════════════════════════════════════════════════════
        const STREAK_TIERS = [
            { min: 5, text: 'Nice!', color: '#4ec9b0' },
            { min: 10, text: 'Great!', color: '#569cd6' },
            { min: 15, text: 'Amazing!', color: '#c586c0' },
            { min: 20, text: 'Incredible!', color: '#dcdcaa' },
            { min: 30, text: 'UNSTOPPABLE!', color: '#f14c4c' },
            { min: 50, text: 'GODLIKE!!!', color: '#ff6b6b' },
        ];
        function getStreakText(count) {
            let result = STREAK_TIERS[0];
            for (const tier of STREAK_TIERS) { if (count >= tier.min) result = tier; }
            return result;
        }
        function announceStreak(count) {
            const tier = getStreakText(count);
            const el = document.createElement('div');
            el.className = 'streak-announce';
            el.textContent = count + ' Hit — ' + tier.text;
            el.style.color = tier.color;
            wrap.appendChild(el);
            setTimeout(() => el.remove(), 1000);
            playStreakSound(count);
        }

        // ═══════════════════════════════════════════════════════
        //  PARTICLES
        // ═══════════════════════════════════════════════════════
        class Particle {
            constructor(x, y, color) {
                this.x = x; this.y = y; this.color = color;
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 3.5;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.life = 1;
                this.decay = 0.018 + Math.random() * 0.025;
                this.size = 2 + Math.random() * 3;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                this.vx *= 0.97; this.vy *= 0.97;
                this.life -= this.decay;
                this.size *= 0.97;
            }
        }
        function spawnParticles(x, y, color, count) {
            for (let i = 0; i < (count || 12); i++) particles.push(new Particle(x, y, color));
        }

        // ═══════════════════════════════════════════════════════
        //  GHOST TRAIL
        // ═══════════════════════════════════════════════════════
        function updateGhostTrail(mx, my) {
            if (lastGhostPos) {
                const dx = mx - lastGhostPos.x, dy = my - lastGhostPos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist >= GHOST_SPACING) {
                    const steps = Math.floor(dist / GHOST_SPACING);
                    for (let i = 1; i <= steps; i++) {
                        const t = i / (steps + 1);
                        mouseHistory.push({ x: lastGhostPos.x + dx * t, y: lastGhostPos.y + dy * t });
                    }
                    lastGhostPos = { x: mx, y: my };
                }
            } else { lastGhostPos = { x: mx, y: my }; }
            mouseHistory.push({ x: mx, y: my });
            while (mouseHistory.length > GHOST_MAX) mouseHistory.shift();
        }
        function drawGhostTrail() {
            for (let i = 0; i < mouseHistory.length; i++) {
                const t = i / mouseHistory.length;
                const r = 1.5 + t * 2;
                ctx.beginPath();
                ctx.arc(mouseHistory[i].x, mouseHistory[i].y, r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(78, 201, 176, ' + (t * 0.35) + ')';
                ctx.fill();
            }
        }

        // ═══════════════════════════════════════════════════════
        //  CUSTOM CROSSHAIR + ACCURACY RING
        // ═══════════════════════════════════════════════════════
        let crosshairX = -100, crosshairY = -100;
        function updateCrosshair(x, y) {
            crosshairX = x; crosshairY = y;
            crosshair.style.left = x + 'px';
            crosshair.style.top = y + 'px';
            accRing.style.left = x + 'px';
            accRing.style.top = y + 'px';
        }
        function drawCrosshair() {
            const size = 12, gap = 4, thick = 2;
            ctx.strokeStyle = 'rgba(78, 201, 176, 0.8)';
            ctx.lineWidth = thick;
            // 4 lines
            ctx.beginPath();
            ctx.moveTo(crosshairX - size, crosshairY); ctx.lineTo(crosshairX - gap, crosshairY);
            ctx.moveTo(crosshairX + gap, crosshairY); ctx.lineTo(crosshairX + size, crosshairY);
            ctx.moveTo(crosshairX, crosshairY - size); ctx.lineTo(crosshairX, crosshairY - gap);
            ctx.moveTo(crosshairX, crosshairY + gap); ctx.lineTo(crosshairX, crosshairY + size);
            ctx.stroke();
            // Center dot
            ctx.beginPath();
            ctx.arc(crosshairX, crosshairY, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(78, 201, 176, 0.9)';
            ctx.fill();
        }
        function drawAccuracyRing() {
            if (shots < 3) return;
            const acc = hits / shots;
            const r = 22;
            accRingCtx.clearRect(0, 0, 64, 64);
            // Background ring
            accRingCtx.beginPath();
            accRingCtx.arc(32, 32, r, 0, Math.PI * 2);
            accRingCtx.strokeStyle = 'rgba(255,255,255,0.08)';
            accRingCtx.lineWidth = 3;
            accRingCtx.stroke();
            // Accuracy arc
            accRingCtx.beginPath();
            accRingCtx.arc(32, 32, r, -Math.PI / 2, -Math.PI / 2 + acc * Math.PI * 2);
            const accColor = acc >= 0.9 ? 'rgba(78,201,176,0.7)' : acc >= 0.7 ? 'rgba(220,204,170,0.7)' : 'rgba(241,76,76,0.6)';
            accRingCtx.strokeStyle = accColor;
            accRingCtx.lineWidth = 3;
            accRingCtx.stroke();
        }

        // ═══════════════════════════════════════════════════════
        //  RESIZE
        // ═══════════════════════════════════════════════════════
        function resize() {
            const rect = wrap.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        window.addEventListener('resize', resize);
        resize();

        // ═══════════════════════════════════════════════════════
        //  TARGET CLASS
        // ═══════════════════════════════════════════════════════
        class Target {
            constructor(x, y, opts) {
                opts = opts || {};
                this.x = x; this.y = y;
                this.spawnTime = Date.now();
                this.hit = false; this.missed = false;
                this.scale = 0;
                this.deathAnim = 0; // 0→1 when dying
                this.pulse = Math.random() * Math.PI * 2;
                this.mode = opts.mode || 'click';
                this.isReaction = opts.isReaction || false;
                this.reactionGreen = opts.reactionGreen || false;
                this.isFlick = this.mode === 'flick';
                this.isTracking = this.mode === 'tracking';
                if (this.isTracking) {
                    const angle = Math.random() * Math.PI * 2;
                    this.vx = Math.cos(angle) * trackingSpeed;
                    this.vy = Math.sin(angle) * trackingSpeed;
                    this.hp = trackingMaxHp;
                    this.maxHp = trackingMaxHp;
                }
            }

            draw() {
                const age = Date.now() - this.spawnTime;
                const life = age / targetLifetime;

                // Death animation: shrink + fade
                if (this.hit && this.deathAnim < 1) {
                    this.deathAnim += 0.08;
                }
                const deathScale = 1 - this.deathAnim;
                const deathAlpha = 1 - this.deathAnim;

                if (!this.hit) {
                    this.scale = Math.min(1, this.scale + 0.1);
                }

                let alpha = deathAlpha;
                if (!this.isFlick && !this.hit && life > 0.7) {
                    alpha = 1 - (life - 0.7) / 0.3;
                }
                if (this.hit) alpha = deathAlpha;

                const pulse = 1 + Math.sin(this.pulse + Date.now() * 0.003) * 0.05;
                const r = targetRadius * this.scale * pulse * deathScale;
                if (r <= 0 || alpha <= 0) return false;

                let outerColor, midColor, innerColor;
                if (this.isReaction && !this.reactionGreen) {
                    outerColor = 'rgba(241, 76, 76, ' + alpha + ')';
                    midColor = 'rgba(241, 76, 76, ' + (alpha * 0.6) + ')';
                    innerColor = 'rgba(241, 76, 76, ' + alpha + ')';
                } else if (this.isReaction && this.reactionGreen) {
                    outerColor = 'rgba(78, 201, 176, ' + alpha + ')';
                    midColor = 'rgba(78, 201, 176, ' + (alpha * 0.6) + ')';
                    innerColor = 'rgba(78, 201, 176, ' + alpha + ')';
                } else if (this.isFlick) {
                    outerColor = 'rgba(197, 134, 192, ' + alpha + ')';
                    midColor = 'rgba(197, 134, 192, ' + (alpha * 0.7) + ')';
                    innerColor = 'rgba(197, 134, 192, ' + (alpha * 0.5) + ')';
                } else {
                    outerColor = 'rgba(78, 201, 176, ' + alpha + ')';
                    midColor = 'rgba(86, 156, 214, ' + (alpha * 0.8) + ')';
                    innerColor = 'rgba(206, 145, 120, ' + alpha + ')';
                }

                // Outer
                ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = outerColor; ctx.lineWidth = 2.5; ctx.stroke();
                // Middle
                ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.6, 0, Math.PI * 2);
                ctx.strokeStyle = midColor; ctx.lineWidth = 2; ctx.stroke();
                // Inner
                ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.25, 0, Math.PI * 2);
                ctx.fillStyle = innerColor; ctx.fill();

                // Death ring
                if (this.hit && this.deathAnim > 0) {
                    const deathR = targetRadius * (0.5 + this.deathAnim * 1.5);
                    ctx.beginPath(); ctx.arc(this.x, this.y, deathR, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(78, 201, 176, ' + (deathAlpha * 0.5) + ')';
                    ctx.lineWidth = 2 * deathScale;
                    ctx.stroke();
                }

                // Tracking HP bar
                if (this.isTracking) {
                    const barW = r * 2, barH = 4;
                    const barX = this.x - barW / 2, barY = this.y - r - 10;
                    ctx.fillStyle = 'rgba(255,255,255,0.12)';
                    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 2); ctx.fill();
                    const hpRatio = Math.max(0, this.hp / this.maxHp);
                    ctx.fillStyle = hpRatio > 0.5 ? 'rgba(78,201,176,0.8)' : hpRatio > 0.25 ? 'rgba(220,204,170,0.8)' : 'rgba(241,76,76,0.8)';
                    ctx.beginPath(); ctx.roundRect(barX, barY, barW * hpRatio, barH, 2); ctx.fill();
                }

                return true;
            }

            expired() {
                if (this.isFlick) return false;
                return Date.now() - this.spawnTime > targetLifetime;
            }
            contains(px, py) {
                const dx = px - this.x, dy = py - this.y;
                return dx*dx + dy*dy <= targetRadius*targetRadius;
            }
        }

        // ═══════════════════════════════════════════════════════
        //  SPAWN
        // ═══════════════════════════════════════════════════════
        function spawn() {
            if (!gameRunning) return;
            const rect = wrap.getBoundingClientRect();
            const pad = targetRadius + 20;
            let x = pad + Math.random() * (rect.width - pad * 2);
            let y = pad + Math.random() * (rect.height - pad * 2);

            if (currentMode === 'click') {
                targets.push(new Target(x, y, { mode: 'click' }));
            } else if (currentMode === 'flick') {
                const t = new Target(x, y, { mode: 'flick' });
                targets.push(t);
                let nx, ny, attempts = 0;
                do {
                    nx = pad + Math.random() * (rect.width - pad * 2);
                    ny = pad + Math.random() * (rect.height - pad * 2);
                    attempts++;
                } while (Math.hypot(nx - x, ny - y) < 200 && attempts < 20);
                flickNextPos = { x: nx, y: ny };
            } else if (currentMode === 'tracking') {
                if (!trackingTarget) {
                    trackingMaxHp = 5; trackingSpeed = 2.5;
                    trackingTarget = new Target(x, y, { mode: 'tracking' });
                    targets.push(trackingTarget);
                }
                return;
            } else if (currentMode === 'reaction') {
                if (reactionIdle) return;
                targets.push(new Target(x, y, { mode: 'reaction', isReaction: true, reactionGreen: true }));
            }
            lastSpawnTime = Date.now();
        }

        // ═══════════════════════════════════════════════════════
        //  HIT / MISS
        // ═══════════════════════════════════════════════════════
        function handleHit(target, ms) {
            target.hit = true;
            hits++; streak++;
            if (streak > bestStreak) bestStreak = streak;
            reactionTimes.push(ms);
            if (ms < bestReactionMs) bestReactionMs = ms;
            const timeBonus = Math.max(0, Math.floor((targetLifetime - ms) / targetLifetime * 50));
            const streakBonus = Math.min(streak * 5, 50);
            score += 100 + timeBonus + streakBonus;
            spawnInterval = Math.max(500, spawnInterval - 5);

            playHitSound();
            spawnParticles(target.x, target.y, '#4ec9b0', 16);

            // Hit marker (checkmark)
            const marker = document.createElement('div');
            marker.className = 'hit-marker';
            marker.style.left = target.x + 'px';
            marker.style.top = target.y + 'px';
            marker.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><polyline points="6,14 11,19 22,8" fill="none" stroke="#4ec9b0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            wrap.appendChild(marker);
            setTimeout(() => marker.remove(), 500);

            // Hit flash
            const flash = document.createElement('div');
            flash.className = 'hit-flash';
            flash.style.left = target.x + 'px';
            flash.style.top = target.y + 'px';
            flash.style.background = 'rgba(78,201,176,0.3)';
            wrap.appendChild(flash);
            setTimeout(() => flash.remove(), 400);

            // Streak announcements
            if (streak >= 5 && streak % 5 === 0) announceStreak(streak);

            // Combo counter
            updateComboCounter();

            // Flick: spawn next
            if (target.isFlick && flickNextPos) {
                const rect = wrap.getBoundingClientRect();
                const pad2 = targetRadius + 20;
                let nx, ny, attempts = 0;
                do {
                    nx = pad2 + Math.random() * (rect.width - pad2 * 2);
                    ny = pad2 + Math.random() * (rect.height - pad2 * 2);
                    attempts++;
                } while (Math.hypot(nx - flickNextPos.x, ny - flickNextPos.y) < 200 && attempts < 20);
                targets.push(new Target(flickNextPos.x, flickNextPos.y, { mode: 'flick' }));
                flickNextPos = { x: nx, y: ny };
            }

            // Tracking: reduce HP
            if (target.isTracking) {
                target.hp--;
                if (target.hp <= 0) {
                    score += 200;
                    playStreakSound(Math.min(streak, 20));
                    trackingTarget = null;
                    trackingSpeed = Math.min(trackingSpeed + 0.3, 6);
                    trackingMaxHp = Math.min(trackingMaxHp + 1, 12);
                }
            }
        }

        function handleMiss() {
            misses++; streak = 0;
            playMissSound();
            updateComboCounter();

            // Miss indicator at click position
            const miss = document.createElement('div');
            miss.className = 'miss-indicator';
            miss.style.left = (lastClickX || crosshairX) + 'px';
            miss.style.top = (lastClickY || crosshairY) + 'px';
            miss.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20"><line x1="4" y1="4" x2="16" y2="16" stroke="#f14c4c" stroke-width="2.5" stroke-linecap="round"/><line x1="16" y1="4" x2="4" y2="16" stroke="#f14c4c" stroke-width="2.5" stroke-linecap="round"/></svg>';
            wrap.appendChild(miss);
            setTimeout(() => miss.remove(), 600);

            // Screen shake
            overlayRoot.classList.remove('shake');
            void overlayRoot.offsetWidth; // force reflow
            overlayRoot.classList.add('shake');
        }

        // ═══════════════════════════════════════════════════════
        //  COMBO COUNTER
        // ═══════════════════════════════════════════════════════
        function updateComboCounter() {
            if (streak >= 3) {
                comboCounter.style.display = 'block';
                comboNum.textContent = streak;
                comboCounter.classList.toggle('big', streak >= 15);
                comboCounter.classList.remove('pulse');
                void comboCounter.offsetWidth;
                comboCounter.classList.add('pulse');
            } else {
                comboCounter.style.display = 'none';
            }
        }

        // ═══════════════════════════════════════════════════════
        //  SESSION TIMER
        // ═══════════════════════════════════════════════════════
        function startTimer() {
            sessionSeconds = 0;
            timerEl.textContent = '0:00';
            sessionTimer = setInterval(() => {
                sessionSeconds++;
                const m = Math.floor(sessionSeconds / 60);
                const s = sessionSeconds % 60;
                timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
            }, 1000);
        }
        function stopTimer() {
            if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }
        }

        // ═══════════════════════════════════════════════════════
        //  UI UPDATE
        // ═══════════════════════════════════════════════════════
        function updateUI() {
            shots = hits + misses;
            scoreEl.textContent = score;
            accuracyEl.textContent = shots > 0 ? Math.round(hits/shots*100) + '%' : '—';
            streakEl.textContent = streak;
            const avg = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length) : 0;
            reactionEl.textContent = avg > 0 ? avg + 'ms' : '—';
            bestReactionEl.textContent = bestReactionMs < Infinity ? Math.round(bestReactionMs) + 'ms' : '—';
            if (score > highScore) { highScore = score; highScoreEl.textContent = highScore; }
            modeLabel.textContent = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
            vscode.postMessage({ type: 'highScore', highScore });
        }

        // ═══════════════════════════════════════════════════════
        //  REACTION MODE
        // ═══════════════════════════════════════════════════════
        function startReactionIdle() {
            reactionIdle = true; targets = [];
            const delay = 1500 + Math.random() * 3000;
            reactionIdleTimer = setTimeout(() => {
                if (!gameRunning || currentMode !== 'reaction') return;
                reactionIdle = false;
                playReactionGoSound();
                spawn();
            }, delay);
        }

        // ═══════════════════════════════════════════════════════
        //  WARMUP MODE
        // ═══════════════════════════════════════════════════════
        let warmupTimer = null;
        function startWarmup() {
            warmupBanner.classList.add('visible');
            let warmupSeconds = 30;
            warmupText.textContent = 'Get Ready';
            warmupSub.textContent = 'Warm-up: ' + warmupSeconds + ' seconds';

            // Play beeps at 3, 2, 1
            const beep3 = setTimeout(() => { warmupText.textContent = '3'; playWarmupBeep(); }, 27000);
            const beep2 = setTimeout(() => { warmupText.textContent = '2'; playWarmupBeep(); }, 28000);
            const beep1 = setTimeout(() => { warmupText.textContent = '1'; playWarmupBeep(); }, 29000);

            warmupTimer = setTimeout(() => {
                warmupBanner.classList.remove('visible');
                playWarmupGo();
                warmupText.textContent = 'Go!';
                // Start the actual game
                lastSpawnTime = 0;
                startTimer();
                loop();
            }, 30000);

            // Countdown display
            const countdown = setInterval(() => {
                warmupSeconds--;
                if (warmupSeconds > 0 && warmupSeconds > 3) {
                    warmupSub.textContent = 'Warm-up: ' + warmupSeconds + ' seconds';
                }
            }, 1000);

            // Store cleanup refs
            warmupTimer._countdown = countdown;
            warmupTimer._beeps = [beep3, beep2, beep1];
        }

        function cancelWarmup() {
            if (warmupTimer) {
                clearTimeout(warmupTimer);
                if (warmupTimer._countdown) clearInterval(warmupTimer._countdown);
                if (warmupTimer._beeps) warmupTimer._beeps.forEach(clearTimeout);
                warmupTimer = null;
            }
            warmupBanner.classList.remove('visible');
        }

        // ═══════════════════════════════════════════════════════
        //  GAME LOOP
        // ═══════════════════════════════════════════════════════
        function loop() {
            if (!gameRunning && targets.length === 0 && particles.length === 0) return;

            const rect = wrap.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Ghost trail
            drawGhostTrail();

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.02)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < rect.width; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,rect.height); ctx.stroke(); }
            for (let gy = 0; gy < rect.height; gy += 40) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(rect.width,gy); ctx.stroke(); }

            // Particles
            particles = particles.filter(p => {
                p.update();
                if (p.life <= 0) return false;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
                ctx.fillStyle = p.color.replace(')', ',' + p.life + ')').replace('rgba(', 'rgba(');
                ctx.fill();
                return true;
            });

            // Spawn
            const now = Date.now();
            if (gameRunning) {
                if (currentMode === 'reaction') { /* handled by idle timer */ }
                else if (currentMode === 'tracking') { if (!trackingTarget && targets.length === 0) spawn(); }
                else if (targets.length < maxTargets && now - lastSpawnTime > spawnInterval) spawn();
            }

            // Tracking movement
            if (currentMode === 'tracking' && trackingTarget && !trackingTarget.hit) {
                trackingTarget.x += trackingTarget.vx;
                trackingTarget.y += trackingTarget.vy;
                const pad = targetRadius + 5;
                if (trackingTarget.x < pad || trackingTarget.x > rect.width - pad) trackingTarget.vx *= -1;
                if (trackingTarget.y < pad || trackingTarget.y > rect.height - pad) trackingTarget.vy *= -1;
                trackingTarget.x = Math.max(pad, Math.min(rect.width - pad, trackingTarget.x));
                trackingTarget.y = Math.max(pad, Math.min(rect.height - pad, trackingTarget.y));
            }

            // Draw targets (keep dying ones for animation)
            targets = targets.filter(t => {
                if (t.hit && t.deathAnim >= 1) return false;
                if (!t.hit && t.expired() && !t.missed) { handleMiss(); t.missed = true; }
                if (t.missed && !t.hit) return false;
                t.draw();
                return true;
            });

            // Reaction idle text
            if (gameRunning && currentMode === 'reaction' && reactionIdle) {
                ctx.save();
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.font = '15px var(--vscode-editor-font-family, sans-serif)';
                ctx.textAlign = 'center';
                ctx.fillText('Wait for green...', rect.width / 2, rect.height / 2);
                ctx.restore();
            }

            // Crosshair + accuracy ring
            drawCrosshair();
            drawAccuracyRing();

            updateUI();
            requestAnimationFrame(loop);
        }

        // ═══════════════════════════════════════════════════════
        //  MOUSE
        // ═══════════════════════════════════════════════════════
        let lastClickX = 0, lastClickY = 0;

        wrap.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            updateCrosshair(e.clientX, e.clientY);
            updateGhostTrail(mx, my);
        });

        canvas.addEventListener('mousedown', e => {
            if (!gameRunning) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            lastClickX = x; lastClickY = y;

            // Reaction: false start
            if (currentMode === 'reaction' && reactionIdle) {
                clearTimeout(reactionIdleTimer);
                playReactionFailSound();
                handleMiss();
                startReactionIdle();
                return;
            }

            let hitAny = false;
            const sortedTargets = currentMode === 'reaction'
                ? [...targets].sort((a, b) => (b.reactionGreen ? 1 : 0) - (a.reactionGreen ? 1 : 0))
                : targets;

            for (let i = sortedTargets.length - 1; i >= 0; i--) {
                if (sortedTargets[i].contains(x, y)) {
                    const ms = Date.now() - sortedTargets[i].spawnTime;
                    handleHit(sortedTargets[i], ms);
                    const idx = targets.indexOf(sortedTargets[i]);
                    if (idx >= 0) targets.splice(idx, 1);
                    hitAny = true;
                    if (currentMode === 'reaction') { reactionIdle = false; startReactionIdle(); }
                    break;
                }
            }

            if (!hitAny) {
                handleMiss();
                if (currentMode === 'reaction' && !reactionIdle) startReactionIdle();
            }
        });

        // ═══════════════════════════════════════════════════════
        //  MODE TABS
        // ═══════════════════════════════════════════════════════
        const MODE_LABELS = { click: 'Click', flick: 'Flick', tracking: 'Track', reaction: 'React' };
        const MODE_DESCS = {
            click: 'Click targets as fast as they appear',
            flick: 'Flick between targets in sequence',
            tracking: 'Click the moving target to drain its HP',
            reaction: 'Wait for green, then click as fast as possible'
        };

        function switchMode(mode) {
            if (gameRunning) stopGame();
            currentMode = mode;
            document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tab' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
            prompt.innerHTML = '<div class="prompt-title">' + MODE_LABELS[mode] + ' Mode</div>'
                + '<div class="prompt-sub">' + MODE_DESCS[mode] + '</div>';
        }

        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.addEventListener('click', () => switchMode(tab.dataset.mode));
        });

        // ═══════════════════════════════════════════════════════
        //  SETTINGS
        // ═══════════════════════════════════════════════════════
        const settingsPanel = document.getElementById('settingsPanel');
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsClose = document.getElementById('settingsClose');
        const setRadius = document.getElementById('setRadius');
        const setLifetime = document.getElementById('setLifetime');
        const setSpawn = document.getElementById('setSpawn');
        const setMaxTargets = document.getElementById('setMaxTargets');
        const valRadius = document.getElementById('valRadius');
        const valLifetime = document.getElementById('valLifetime');
        const valSpawn = document.getElementById('valSpawn');
        const valMaxTargets = document.getElementById('valMaxTargets');
        const toggleWarmup = document.getElementById('toggleWarmup');

        function syncSettingsUI() {
            setRadius.value = targetRadius;
            setLifetime.value = targetLifetime;
            setSpawn.value = spawnInterval;
            setMaxTargets.value = maxTargets;
            valRadius.textContent = targetRadius;
            valLifetime.textContent = targetLifetime;
            valSpawn.textContent = spawnInterval;
            valMaxTargets.textContent = maxTargets;
            toggleWarmup.classList.toggle('on', warmupEnabled);
        }

        function applySettings() {
            targetRadius = parseInt(setRadius.value);
            targetLifetime = parseInt(setLifetime.value);
            spawnInterval = parseInt(setSpawn.value);
            maxTargets = parseInt(setMaxTargets.value);
            valRadius.textContent = targetRadius;
            valLifetime.textContent = targetLifetime;
            valSpawn.textContent = spawnInterval;
            valMaxTargets.textContent = maxTargets;
            settings = { targetRadius, targetLifetime, spawnInterval, maxTargets };
            vscode.postMessage({ type: 'saveSettings', settings });
        }

        [setRadius, setLifetime, setSpawn, setMaxTargets].forEach(el => {
            el.addEventListener('input', applySettings);
        });

        toggleWarmup.addEventListener('click', () => {
            warmupEnabled = !warmupEnabled;
            toggleWarmup.classList.toggle('on', warmupEnabled);
        });

        settingsBtn.addEventListener('click', () => { syncSettingsUI(); settingsPanel.classList.toggle('visible'); });
        settingsClose.addEventListener('click', () => { settingsPanel.classList.remove('visible'); });

        // ═══════════════════════════════════════════════════════
        //  SOUND TOGGLE
        // ═══════════════════════════════════════════════════════
        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
            soundBtn.classList.toggle('muted', !soundEnabled);
        });

        // ═══════════════════════════════════════════════════════
        //  CONTROLS
        // ═══════════════════════════════════════════════════════
        function startGame() {
            if (gameRunning) return;
            gameRunning = true;
            lastSpawnTime = 0;
            prompt.style.display = 'none';
            ensureAudio();

            if (currentMode === 'reaction') {
                startReactionIdle();
            }

            if (warmupEnabled) {
                startWarmup();
            } else {
                startTimer();
                loop();
            }
        }

        function stopGame() {
            gameRunning = false;
            targets = [];
            particles = [];
            trackingTarget = null;
            comboCounter.style.display = 'none';
            cancelWarmup();
            stopTimer();
            if (reactionIdleTimer) { clearTimeout(reactionIdleTimer); reactionIdleTimer = null; }

            // Summary card
            shots = hits + misses;
            const acc = shots > 0 ? Math.round(hits/shots*100) : 0;
            const avg = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length) : 0;
            const bestMs = bestReactionMs < Infinity ? Math.round(bestReactionMs) : 0;
            const m = Math.floor(sessionSeconds / 60);
            const s = sessionSeconds % 60;
            const timeStr = m + ':' + (s < 10 ? '0' : '') + s;

            prompt.style.display = 'block';
            prompt.innerHTML = '<div class="summary-card">'
                + '<h2>Session Over</h2>'
                + '<div class="mode-label">' + MODE_LABELS[currentMode] + ' Mode · ' + timeStr + '</div>'
                + '<div class="summary-grid">'
                + '<div class="summary-item"><div class="summary-item-label">Score</div><div class="summary-item-value" style="color:#4ec9b0">' + score + '</div></div>'
                + '<div class="summary-item"><div class="summary-item-label">Accuracy</div><div class="summary-item-value" style="color:#569cd6">' + acc + '%</div></div>'
                + '<div class="summary-item"><div class="summary-item-label">Best Streak</div><div class="summary-item-value" style="color:#dcdcaa">' + bestStreak + '</div></div>'
                + '<div class="summary-item"><div class="summary-item-label">Avg Reaction</div><div class="summary-item-value" style="color:#b5cea8">' + (avg ? avg+'ms' : '—') + '</div></div>'
                + '<div class="summary-item"><div class="summary-item-label">Best Reaction</div><div class="summary-item-value" style="color:#b5cea8">' + (bestMs ? bestMs+'ms' : '—') + '</div></div>'
                + '<div class="summary-item"><div class="summary-item-label">Targets Hit</div><div class="summary-item-value" style="color:#c586c0">' + hits + '</div></div>'
                + '</div>'
                + '<div class="summary-actions">'
                + '<button class="btn btn-start" id="replayBtn" style="padding:6px 24px">▶ Play Again</button>'
                + '</div>'
                + '</div>';

            document.getElementById('replayBtn').addEventListener('click', () => {
                score = 0; hits = 0; misses = 0; shots = 0;
                streak = 0; bestStreak = 0; reactionTimes = [];
                bestReactionMs = Infinity;
                trackingTarget = null; trackingSpeed = 2.5; trackingMaxHp = 5;
                spawnInterval = settings.spawnInterval || 1200;
                startGame();
            });
        }

        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('stopBtn').addEventListener('click', stopGame);
        document.getElementById('exitBtn').addEventListener('click', () => {
            overlayRoot.classList.add('closing');
            setTimeout(() => vscode.postMessage({ type: 'closeOverlay' }), 200);
        });

        // ═══════════════════════════════════════════════════════
        //  KEYBOARD
        // ═══════════════════════════════════════════════════════
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                overlayRoot.classList.add('closing');
                setTimeout(() => vscode.postMessage({ type: 'closeOverlay' }), 200);
            }
            // Mode shortcuts: 1-4
            if (e.key === '1' && !gameRunning) switchMode('click');
            if (e.key === '2' && !gameRunning) switchMode('flick');
            if (e.key === '3' && !gameRunning) switchMode('tracking');
            if (e.key === '4' && !gameRunning) switchMode('reaction');
        });

        // ═══════════════════════════════════════════════════════
        //  MESSAGES FROM EXTENSION
        // ═══════════════════════════════════════════════════════
        window.addEventListener('message', e => {
            const msg = e.data;
            switch (msg.type) {
                case 'start': startGame(); break;
                case 'stop': stopGame(); break;
                case 'highScore':
                    if (msg.highScore !== undefined) { highScore = msg.highScore; highScoreEl.textContent = highScore; }
                    break;
                case 'loadSettings':
                    if (msg.settings) {
                        settings = msg.settings;
                        targetRadius = settings.targetRadius || 28;
                        targetLifetime = settings.targetLifetime || 3000;
                        spawnInterval = settings.spawnInterval || 1200;
                        maxTargets = settings.maxTargets || 4;
                        syncSettingsUI();
                    }
                    break;
            }
        });

        // ── Init ──
        syncSettingsUI();
        ensureAudio();
    </script>
</body>
</html>`;
}
