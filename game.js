// ---------------- Canvas Setup ----------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ---------------- UI ----------------
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const difficultySelect = document.getElementById("difficultySelect");

const scoreDisplay = document.getElementById("scoreDisplay");
const livesDisplay = document.getElementById("livesDisplay");
const timeDisplay = document.getElementById("timeDisplay");
const streakDisplay = document.getElementById("streakDisplay");

// ---------------- Game Variables ----------------
let gameState = "menu";
let score = 0;
let lives = 3;
let timeLeft = 60;

let orbs = [];
let spawnTimer = 0;
let lastTimestamp = 0;

let difficulty = "normal";

const difficultyConfig = {
    easy: { lives: 4, duration: 70, spawnInterval: 1.0, minSpeed: 100, maxSpeed: 200 },
    normal: { lives: 3, duration: 60, spawnInterval: 0.8, minSpeed: 140, maxSpeed: 230 },
    hard: { lives: 3, duration: 50, spawnInterval: 0.6, minSpeed: 180, maxSpeed: 260 }
};

// ---- Power-ups ----
let slowTimer = 0;
let doubleTimer = 0;
let speedFactor = 1;          
let scoreMultiplier = 1;
let goldActive = false;
let streak = 0;

// ---------------- Player ----------------
const player = {
    width: 90,
    height: 18,
    x: canvas.width / 2 - 45,
    y: canvas.height - 50,
    speed: 380,
    movingLeft: false,
    movingRight: false
};

// ---------------- Input ----------------
window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) player.movingLeft = true;
    if (["ArrowRight", "d", "D"].includes(e.key)) player.movingRight = true;
    if (e.key === " " && gameState === "gameover") startGame();
});

window.addEventListener("keyup", (e) => {
    if (["ArrowLeft", "a", "A"].includes(e.key)) player.movingLeft = false;
    if (["ArrowRight", "d", "D"].includes(e.key)) player.movingRight = false;
});

// ---------------- Orb Spawning ----------------
function spawnOrb() {
    const t = ["good","good","good","bad","powerSlow","powerDouble"];
    const type = t[Math.floor(Math.random() * t.length)];

    const r = type === "bad" ? 15 : 12;
    const cfg = difficultyConfig[difficulty];

    orbs.push({
        x: r + Math.random() * (canvas.width - r * 2),
        y: -r,
        radius: r,
        speed: cfg.minSpeed + Math.random() * (cfg.maxSpeed - cfg.minSpeed),
        type
    });
}

// ---------------- START GAME ----------------
function startGame() {
    const cfg = difficultyConfig[difficulty];

    gameState = "playing";
    lastTimestamp = performance.now();

    score = 0;
    lives = cfg.lives;
    timeLeft = cfg.duration;

    orbs = [];
    spawnTimer = 0;

    // Reset power-ups
    slowTimer = 0;
    doubleTimer = 0;
    goldActive = false;
    speedFactor = 1;
    scoreMultiplier = 1;
    streak = 0;

    player.x = canvas.width / 2 - player.width / 2;

    startBtn.disabled = true;   // disable only while playing
    restartBtn.disabled = false;

    updateHUD();
}

// ---------------- RESTART GAME ----------------
function restartGame() {
    // Restart should behave like starting a fresh game with current difficulty
    startGame();
}

// ---------------- HUD ----------------
function updateHUD() {
    scoreDisplay.textContent = `Score: ${score}`;
    livesDisplay.textContent = `Lives: ${lives}`;
    timeDisplay.textContent = `Time: ${Math.ceil(timeLeft)}`;
    streakDisplay.textContent = `Streak x${scoreMultiplier}`;
}

// ---------------- GAME OVER ----------------
function gameOver() {
    gameState = "gameover";
    startBtn.disabled = false;
    restartBtn.disabled = false;
}

// ---------------- MAIN LOOP ----------------
function gameLoop(timestamp) {
    const dt = (timestamp - lastTimestamp) / 1000 || 0;
    lastTimestamp = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// ---------------- UPDATE ----------------
function update(dt) {
    if (gameState !== "playing") return;

    // Move player
    if (player.movingLeft)  player.x -= player.speed * dt;
    if (player.movingRight) player.x += player.speed * dt;
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

    // Slow motion timer
    if (slowTimer > 0) {
        slowTimer -= dt;
        if (slowTimer <= 0) speedFactor = 1;
    }

    // Double points timer
    if (doubleTimer > 0) {
        doubleTimer -= dt;
        if (doubleTimer <= 0) {
            goldActive = false;
            scoreMultiplier = 1;
        }
    }

    // Spawn orbs
    const cfg = difficultyConfig[difficulty];
    spawnTimer += dt;
    if (spawnTimer >= cfg.spawnInterval) {
        spawnOrb();
        spawnTimer = 0;
    }

    // Move orbs & collision
    for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];

        o.y += o.speed * speedFactor * dt;

        const hitX = o.x > player.x && o.x < player.x + player.width;
        const hitY = o.y + o.radius > player.y && o.y - o.radius < player.y + player.height;

        if (hitX && hitY) {
            handleCollision(o);
            orbs.splice(i, 1);
            continue;
        }

        if (o.y > canvas.height + 20) {
            if (o.type === "good" && !goldActive) {
                streak = 0;
                scoreMultiplier = 1;
            }
            orbs.splice(i, 1);
        }
    }

    // Timer
    timeLeft -= dt;
    if (timeLeft <= 0 || lives <= 0) {
        gameOver();
    }

    updateHUD();
}

// ---------------- COLLISION ----------------
function handleCollision(o) {

    if (o.type === "good") {
        streak++;

        if (!goldActive && streak >= 5 && scoreMultiplier < 3) {
            scoreMultiplier++;
            streak = 0;
        }

        score += 10 * scoreMultiplier;
    }

    else if (o.type === "bad") {
        lives--;
        streak = 0;
        if (!goldActive) scoreMultiplier = 1;
    }

    else if (o.type === "powerSlow") {
        slowTimer = 5;
        speedFactor = 0.4;
    }

    else if (o.type === "powerDouble") {
        goldActive = true;
        doubleTimer = 6;
        scoreMultiplier = 2;  // REAL double points
    }
}

// ---------------- RENDER ----------------
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Player
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Orbs
    for (const o of orbs) {
        ctx.fillStyle =
            o.type === "good" ? "#38bdf8" :
            o.type === "bad" ? "#f97373" :
            o.type === "powerSlow" ? "#22c55e" :
            "#facc15";

        ctx.beginPath();
        ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // overlays
    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    if (gameState === "menu") {
        ctx.font = "26px system-ui";
        ctx.fillText("Click START to begin", canvas.width/2, 200);
    }

    if (gameState === "gameover") {
        ctx.font = "26px system-ui";
        ctx.fillText("GAME OVER", canvas.width/2, 200);
        ctx.font = "18px system-ui";
        ctx.fillText(`Final Score: ${score}`, canvas.width/2, 240);
    }
}

// ---------------- Buttons ----------------
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);
difficultySelect.addEventListener("change", (e) => difficulty = e.target.value);

// ---------------- Start Loop ----------------
requestAnimationFrame(gameLoop);