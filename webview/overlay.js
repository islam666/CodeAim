// ═══════════════════════════════════════════════════════════════
//  CodeAim Overlay — Game Engine
// ═══════════════════════════════════════════════════════════════

// Polyfill for roundRect
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

// ═══════════════════════════════════════════════════════════════
//  SOUND ENGINE
// ═══════════════════════════════════════════════════════════════
let audioCtx = null;
function ensureAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not available:', e);
            soundEnabled = false;
        }
    }
}
function playTone(freq, duration, type, volume) {
    if (!soundEnabled || !audioCtx) return;
    try {
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
    } catch (e) {
        // Silently fail — audio is non-critical
    }
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

// ═══════════════════════════════════════════════════════════════
//  STREAK ANNOUNCER
// ═══════════════════════════════════════════════════════════════
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
    el.textContent = count + ' Hit \u2014 ' + tier.text;
    el.style.color = tier.color;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 1000);
    playStreakSound(count);
}

// ═══════════════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  GHOST TRAIL — DISABLED
// ═══════════════════════════════════════════════════════════════
// Removed per user request — the dot + trailing effect was causing
// crosshair alignment confusion. The SVG DOM crosshair is now the
// sole cursor indicator.
function updateGhostTrail(mx, my) {
    // no-op — ghost trail removed
}

// ═══════════════════════════════════════════════════════════════
//  CUSTOM CROSSHAIR
// ═══════════════════════════════════════════════════════════════
let crosshairX = -100, crosshairY = -100;
function updateCrosshair(x, y) {
    crosshairX = x; crosshairY = y;
    crosshair.style.left = x + 'px';
    crosshair.style.top = y + 'px';
    crosshair.style.display = 'block';
    accRing.style.left = x + 'px';
    accRing.style.top = y + 'px';
}
function drawAccuracyRing() {
    if (shots < 3) return;
    const acc = hits / shots;
    const r = 22;
    accRingCtx.clearRect(0, 0, 64, 64);
    accRingCtx.beginPath();
    accRingCtx.arc(32, 32, r, 0, Math.PI * 2);
    accRingCtx.strokeStyle = 'rgba(255,255,255,0.08)';
    accRingCtx.lineWidth = 3;
    accRingCtx.stroke();
    accRingCtx.beginPath();
    accRingCtx.arc(32, 32, r, -Math.PI / 2, -Math.PI / 2 + acc * Math.PI * 2);
    const accColor = acc >= 0.9 ? 'rgba(78,201,176,0.7)' : acc >= 0.7 ? 'rgba(220,204,170,0.7)' : 'rgba(241,76,76,0.6)';
    accRingCtx.strokeStyle = accColor;
    accRingCtx.lineWidth = 3;
    accRingCtx.stroke();
}

// ═══════════════════════════════════════════════════════════════
//  RESIZE
// ═══════════════════════════════════════════════════════════════
function resize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ═══════════════════════════════════════════════════════════════
//  TARGET CLASS
// ═══════════════════════════════════════════════════════════════
class Target {
    constructor(x, y, opts) {
        opts = opts || {};
        this.x = x; this.y = y;
        this.spawnTime = Date.now();
        this.hit = false; this.missed = false;
        this.scale = 0;
        this.deathAnim = 0;
        this.pulse = Math.random() * Math.PI * 2;
        this.mode = opts.mode || 'click';
        this.isReaction = opts.isReaction || false;
        this.reactionGreen = opts.reactionGreen || false;
        this.isFlick = this.mode === 'flick';
        this.isTracking = this.mode === 'tracking';
        if (this.isFlick) this.scale = 1;
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

        if (this.hit && this.deathAnim < 1) this.deathAnim += 0.08;
        const deathScale = 1 - this.deathAnim;
        const deathAlpha = 1 - this.deathAnim;

        if (!this.hit) this.scale = Math.min(1, this.scale + 0.1);

        let alpha = deathAlpha;
        if (!this.isFlick && !this.hit && life > 0.7) alpha = 1 - (life - 0.7) / 0.3;
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

        ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = outerColor; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = midColor; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = innerColor; ctx.fill();

        if (this.hit && this.deathAnim > 0) {
            const deathR = targetRadius * (0.5 + this.deathAnim * 1.5);
            ctx.beginPath(); ctx.arc(this.x, this.y, deathR, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(78, 201, 176, ' + (deathAlpha * 0.5) + ')';
            ctx.lineWidth = 2 * deathScale;
            ctx.stroke();
        }

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

// ═══════════════════════════════════════════════════════════════
//  SPAWN
// ═══════════════════════════════════════════════════════════════
function spawn() {
    if (!gameRunning) return;
    const rect = wrap.getBoundingClientRect();
    const pad = targetRadius + 20;
    const x = pad + Math.random() * (rect.width - pad * 2);
    const y = pad + Math.random() * (rect.height - pad * 2);

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

// ═══════════════════════════════════════════════════════════════
//  HIT / MISS
// ═══════════════════════════════════════════════════════════════
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

    const marker = document.createElement('div');
    marker.className = 'hit-marker';
    marker.style.left = target.x + 'px';
    marker.style.top = target.y + 'px';
    marker.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><polyline points="6,14 11,19 22,8" fill="none" stroke="#4ec9b0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    wrap.appendChild(marker);
    setTimeout(() => marker.remove(), 500);

    const flash = document.createElement('div');
    flash.className = 'hit-flash';
    flash.style.left = target.x + 'px';
    flash.style.top = target.y + 'px';
    flash.style.background = 'rgba(78,201,176,0.3)';
    wrap.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    if (streak >= 5 && streak % 5 === 0) announceStreak(streak);
    updateComboCounter();

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

    if (target.isTracking) {
        target.hp--;
        if (target.hp <= 0) {
            score += 200;
            playStreakSound(Math.min(streak, 20));
            // Remove dead tracking target immediately so it doesn't block respawn
            target.hit = true;
            target.deathAnim = 1;
            const idx = targets.indexOf(target);
            if (idx >= 0) targets.splice(idx, 1);
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

    const miss = document.createElement('div');
    miss.className = 'miss-indicator';
    miss.style.left = (lastClickX || crosshairX) + 'px';
    miss.style.top = (lastClickY || crosshairY) + 'px';
    miss.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20"><line x1="4" y1="4" x2="16" y2="16" stroke="#f14c4c" stroke-width="2.5" stroke-linecap="round"/><line x1="16" y1="4" x2="4" y2="16" stroke="#f14c4c" stroke-width="2.5" stroke-linecap="round"/></svg>';
    wrap.appendChild(miss);
    setTimeout(() => miss.remove(), 600);

    overlayRoot.classList.remove('shake');
    void overlayRoot.offsetWidth;
    overlayRoot.classList.add('shake');
}

// ═══════════════════════════════════════════════════════════════
//  COMBO COUNTER
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  SESSION TIMER
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  UI UPDATE
// ═══════════════════════════════════════════════════════════════
function updateUI() {
    shots = hits + misses;
    scoreEl.textContent = score;
    accuracyEl.textContent = shots > 0 ? Math.round(hits/shots*100) + '%' : '\u2014';
    streakEl.textContent = streak;
    const avg = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length) : 0;
    reactionEl.textContent = avg > 0 ? avg + 'ms' : '\u2014';
    bestReactionEl.textContent = bestReactionMs < Infinity ? Math.round(bestReactionMs) + 'ms' : '\u2014';
    if (score > highScore) { highScore = score; highScoreEl.textContent = highScore; }
    modeLabel.textContent = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
    vscode.postMessage({ type: 'highScore', highScore });
}

// ═══════════════════════════════════════════════════════════════
//  REACTION MODE
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  WARMUP MODE
// ═══════════════════════════════════════════════════════════════
let warmupCleanup = null;
function startWarmup() {
    warmupBanner.classList.add('visible');
    let warmupSeconds = 30;
    warmupText.textContent = 'Get Ready';
    warmupSub.textContent = 'Warm-up: ' + warmupSeconds + ' seconds';

    const beep3 = setTimeout(() => { warmupText.textContent = '3'; playWarmupBeep(); }, 27000);
    const beep2 = setTimeout(() => { warmupText.textContent = '2'; playWarmupBeep(); }, 28000);
    const beep1 = setTimeout(() => { warmupText.textContent = '1'; playWarmupBeep(); }, 29000);

    const warmupDone = setTimeout(() => {
        warmupBanner.classList.remove('visible');
        playWarmupGo();
        warmupText.textContent = 'Go!';
        lastSpawnTime = 0;
        startTimer();
        loop();
    }, 30000);

    const countdown = setInterval(() => {
        warmupSeconds--;
        if (warmupSeconds > 0 && warmupSeconds > 3) {
            warmupSub.textContent = 'Warm-up: ' + warmupSeconds + ' seconds';
        }
    }, 1000);

    warmupCleanup = { warmupDone, countdown, beeps: [beep3, beep2, beep1] };
}

function cancelWarmup() {
    if (warmupCleanup) {
        clearTimeout(warmupCleanup.warmupDone);
        clearInterval(warmupCleanup.countdown);
        warmupCleanup.beeps.forEach(clearTimeout);
        warmupCleanup = null;
    }
    warmupBanner.classList.remove('visible');
}

// ═══════════════════════════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════════════════════════
function loop() {
    if (!gameRunning && targets.length === 0 && particles.length === 0) return;

    const rect = wrap.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

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
        else if (currentMode === 'flick') { /* flick targets only spawned on hit + initial */ }
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

    // Draw targets
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

    drawAccuracyRing();

    updateUI();
    requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════════════════════
//  MOUSE
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  MODE TABS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
//  SOUND TOGGLE
// ═══════════════════════════════════════════════════════════════
soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07';
    soundBtn.classList.toggle('muted', !soundEnabled);
});

// ═══════════════════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════════════════
function startGame() {
    if (gameRunning) return;
    gameRunning = true;
    lastSpawnTime = 0;
    prompt.style.display = 'none';
    ensureAudio();

    if (currentMode === 'reaction') startReactionIdle();
    if (currentMode === 'flick') { lastSpawnTime = 0; spawn(); }
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
        + '<div class="mode-label">' + MODE_LABELS[currentMode] + ' Mode &middot; ' + timeStr + '</div>'
        + '<div class="summary-grid">'
        + '<div class="summary-item"><div class="summary-item-label">Score</div><div class="summary-item-value" style="color:#4ec9b0">' + score + '</div></div>'
        + '<div class="summary-item"><div class="summary-item-label">Accuracy</div><div class="summary-item-value" style="color:#569cd6">' + acc + '%</div></div>'
        + '<div class="summary-item"><div class="summary-item-label">Best Streak</div><div class="summary-item-value" style="color:#dcdcaa">' + bestStreak + '</div></div>'
        + '<div class="summary-item"><div class="summary-item-label">Avg Reaction</div><div class="summary-item-value" style="color:#b5cea8">' + (avg ? avg+'ms' : '\u2014') + '</div></div>'
        + '<div class="summary-item"><div class="summary-item-label">Best Reaction</div><div class="summary-item-value" style="color:#b5cea8">' + (bestMs ? bestMs+'ms' : '\u2014') + '</div></div>'
        + '<div class="summary-item"><div class="summary-item-label">Targets Hit</div><div class="summary-item-value" style="color:#c586c0">' + hits + '</div></div>'
        + '</div>'
        + '<div class="summary-actions">'
        + '<button class="btn btn-start" id="replayBtn" style="padding:6px 24px">&#9654; Play Again</button>'
        + '<button class="btn btn-share" id="shareBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> Share on X</button>'
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

    document.getElementById('shareBtn').addEventListener('click', () => {
        const modeName = MODE_LABELS[currentMode];
        const avgRt = avg > 0 ? avg + 'ms avg' : '';
        const bestRt = bestMs > 0 ? bestMs + 'ms best' : '';
        const reactionText = avgRt && bestRt ? avgRt + ' \u00B7 ' + bestRt : (avgRt || bestRt || '');
        const lines = [
            '\uD83D\uDCEF Just scored ' + score + ' in CodeAim!',
            '',
            '\uD83C\uDFC6 ' + modeName + ' Mode \u00B7 ' + acc + '% accuracy',
            '\uD83D\uDD25 ' + bestStreak + ' best streak' + (reactionText ? ' \u00B7 ' + reactionText : ''),
            '\u23F1 ' + timeStr + ' \u00B7 ' + hits + ' targets hit',
            '',
            'Train your aim inside VS Code',
        ];
        const tweetText = lines.join('\\n');
        const url = 'https://x.com/intent/tweet?text=' + encodeURIComponent(tweetText);
        vscode.postMessage({ type: 'openUrl', url });
    });

    // Save leaderboard
    vscode.postMessage({
        type: 'saveLeaderboard',
        leaderboard: [],  // Overley doesn't track leaderboard internally; extension handles it
        sessionHistory: []
    });
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('stopBtn').addEventListener('click', stopGame);
document.getElementById('exitBtn').addEventListener('click', () => {
    overlayRoot.classList.add('closing');
    setTimeout(() => vscode.postMessage({ type: 'closeOverlay' }), 200);
});

// ═══════════════════════════════════════════════════════════════
//  KEYBOARD
// ═══════════════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        overlayRoot.classList.add('closing');
        setTimeout(() => vscode.postMessage({ type: 'closeOverlay' }), 200);
    }
    if (e.key === '1' && !gameRunning) switchMode('click');
    if (e.key === '2' && !gameRunning) switchMode('flick');
    if (e.key === '3' && !gameRunning) switchMode('tracking');
    if (e.key === '4' && !gameRunning) switchMode('reaction');
});

// ═══════════════════════════════════════════════════════════════
//  MESSAGES FROM EXTENSION
// ═══════════════════════════════════════════════════════════════
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
