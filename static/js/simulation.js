// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  running: false,
  n: 5,
  strategy: "resource_hierarchy",
  philosophers: [],
  forks: [],
  eatCounts: [],
  waitTimes: [],
  thinkTimes: [],
  eatTimes: [],
  deadlockCount: 0,
  totalEats: 0,
  startTime: null,
  eventSource: null
};

// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById("dining-canvas");
const ctx = canvas.getContext("2d");
const COLORS = {
  thinking: "#4a9eff",
  hungry:   "#ff8c42",
  eating:   "#4affa0",
  fork:     "#e8e8f0",
  forkUsed: "#7c6af7",
  table:    "#1a1a24",
  tableBorder: "#2a2a38",
  bg:       "#0a0a0f"
};

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const size = Math.min(wrap.clientWidth - 40, wrap.clientHeight - 40, 520);
  canvas.width = size;
  canvas.height = size;
  draw();
}

function getPhilosopherPositions(n, cx, cy, r) {
  return Array.from({length: n}, (_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle };
  });
}

function getForkPositions(n, cx, cy, r) {
  return Array.from({length: n}, (_, i) => {
    const angle = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

function draw() {
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  ctx.clearRect(0, 0, W, H);

  // Background gradient
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
  bgGrad.addColorStop(0, "#111120");
  bgGrad.addColorStop(1, "#0a0a0f");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const n = state.n || 5;
  const tableR = W * 0.22;
  const phR = W * 0.35;
  const forkR = W * 0.28;
  const phSize = Math.max(22, W * 0.07);

  // Table
  const tableGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, tableR);
  tableGrad.addColorStop(0, "#1e1e2e");
  tableGrad.addColorStop(1, "#14141f");
  ctx.beginPath();
  ctx.arc(cx, cy, tableR, 0, Math.PI * 2);
  ctx.fillStyle = tableGrad;
  ctx.fill();
  ctx.strokeStyle = "#2a2a38";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Table label
  ctx.fillStyle = "#444460";
  ctx.font = `bold ${W * 0.025}px Syne, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🍽 Bàn ăn", cx, cy);

  const phPositions = getPhilosopherPositions(n, cx, cy, phR);
  const forkPositions = getForkPositions(n, cx, cy, forkR);
  const philosophers = state.philosophers.length === n ? state.philosophers : Array(n).fill("thinking");
  const eatCounts = state.eatCounts.length === n ? state.eatCounts : Array(n).fill(0);

  // Draw forks
  forkPositions.forEach((fp, i) => {
    const leftPhIdx = i;
    const rightPhIdx = (i + 1) % n;
    const isUsed = philosophers[leftPhIdx] === "eating" || philosophers[rightPhIdx] === "eating";

    ctx.save();
    ctx.translate(fp.x, fp.y);
    ctx.font = `${W * 0.04}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = isUsed ? 0.5 : 1.0;
    ctx.fillText("🍴", 0, 0);

    // Fork number
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = isUsed ? COLORS.forkUsed : COLORS.fork;
    ctx.font = `bold ${W * 0.018}px JetBrains Mono, monospace`;
    ctx.fillText(i, 0, W * 0.03);
    ctx.restore();
  });

  // Connecting lines from philosopher to adjacent forks
  phPositions.forEach((pp, i) => {
    if (philosophers[i] === "eating") {
      const leftFork = forkPositions[i];
      const rightFork = forkPositions[(i + n - 1) % n];
      [leftFork, rightFork].forEach(fp => {
        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y);
        ctx.lineTo(fp.x, fp.y);
        ctx.strokeStyle = "rgba(74, 255, 160, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
    if (philosophers[i] === "hungry") {
      const leftFork = forkPositions[i];
      const rightFork = forkPositions[(i + n - 1) % n];
      [leftFork, rightFork].forEach(fp => {
        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y);
        ctx.lineTo(fp.x, fp.y);
        ctx.strokeStyle = "rgba(255, 140, 66, 0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  });

  // Draw philosophers
  phPositions.forEach((pp, i) => {
    const st = philosophers[i] || "thinking";
    const color = COLORS[st] || COLORS.thinking;

    // Glow
    const glow = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, phSize * 1.8);
    glow.addColorStop(0, color + "33");
    glow.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, phSize * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Outer ring (pulsing if hungry)
    if (st === "hungry") {
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, phSize + 5, 0, Math.PI * 2);
      ctx.strokeStyle = color + "88";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Circle
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, phSize, 0, Math.PI * 2);
    ctx.fillStyle = "#12121c";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = st === "eating" ? 3 : 2;
    ctx.stroke();

    // Emoji
    ctx.font = `${phSize * 0.9}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const emoji = st === "Suy nghĩ" ? "🤔" : st === "Đói" ? "😤" : "😋";
    ctx.fillText(emoji, pp.x, pp.y - 2);

    // Name + count
    ctx.fillStyle = color;
    ctx.font = `bold ${W * 0.022}px Syne, sans-serif`;
    ctx.fillText(`P${i}`, pp.x, pp.y + phSize + W * 0.02);
    ctx.fillStyle = "#8888a8";
    ctx.font = `${W * 0.016}px JetBrains Mono, monospace`;
    ctx.fillText(`×${eatCounts[i] || 0}`, pp.x, pp.y + phSize + W * 0.04);

    // State badge
    const badgeY = pp.y - phSize - W * 0.025;
    ctx.fillStyle = color + "22";
    const badgeW = W * 0.075;
    const badgeH = W * 0.022;
    ctx.beginPath();
    ctx.roundRect(pp.x - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 4);
    ctx.fill();
    ctx.strokeStyle = color + "66";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `${W * 0.014}px JetBrains Mono, monospace`;
    ctx.fillText(st.toUpperCase(), pp.x, badgeY + 1);
  });
}

// Animation loop
let animFrame;
function startAnimation() {
  function loop() {
    draw();
    animFrame = requestAnimationFrame(loop);
  }
  if (animFrame) cancelAnimationFrame(animFrame);
  loop();
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function updateStats() {
  const n = state.n;
  const grid = document.getElementById("stats-grid");
  const stateColors = { thinking: "#4a9eff", hungry: "#ff8c42", eating: "#4affa0" };
  const stateEmoji  = { thinking: "🤔", hungry: "😤", eating: "😋" };
  const maxEat = Math.max(...state.eatCounts, 1);
  const maxWait = Math.max(...state.waitTimes, 1);
  const maxThink = Math.max(...state.thinkTimes, 1);

  grid.innerHTML = Array.from({length: n}, (_, i) => {
    const st = state.philosophers[i] || "thinking";
    const ec = state.eatCounts[i] || 0;
    const wt = state.waitTimes[i] || 0;
    const tt = state.thinkTimes[i] || 0;
    const color = stateColors[st];
    return `
    <div class="stat-card ${st}">
      <div class="stat-name">
        <span>${stateEmoji[st]} Philosopher ${i}</span>
        <span class="stat-count">${ec} lần</span>
      </div>
      <div class="stat-bars">
        <div class="stat-row">
          <span>Ăn</span>
          <div class="bar-wrap"><div class="bar-fill bar-eat" style="width:${(ec/maxEat*100).toFixed(0)}%"></div></div>
          <span>${ec}</span>
        </div>
        <div class="stat-row">
          <span>Chờ</span>
          <div class="bar-wrap"><div class="bar-fill bar-wait" style="width:${(wt/maxWait*100).toFixed(0)}%"></div></div>
          <span>${wt.toFixed(1)}s</span>
        </div>
        <div class="stat-row">
          <span>Nghĩ</span>
          <div class="bar-wrap"><div class="bar-fill bar-think" style="width:${(tt/maxThink*100).toFixed(0)}%"></div></div>
          <span>${tt.toFixed(1)}s</span>
        </div>
      </div>
    </div>`;
  }).join("");

  document.getElementById("total-eats").textContent = state.eatCounts.reduce((a,b) => a+b, 0);
  document.getElementById("deadlock-count").textContent = state.deadlockCount;
}

// ─── Event Log ───────────────────────────────────────────────────────────────
const LOG_MAX = 200;
const logEl = document.getElementById("event-log");
let logCount = 0;
const baseTime = Date.now();

function addLogEntry(event) {
  logCount++;
  if (logEl.children.length > LOG_MAX) logEl.removeChild(logEl.firstChild);

  const ts = ((event.time - baseTime) / 1000).toFixed(1);
  const actionLabels = {
    thinking: "đang suy nghĩ…",
    hungry: "đói, chờ đũa",
    eating: "đang ăn 🍜",
    deadlock_abort: "⚠ timeout (deadlock?)"
  };
  const div = document.createElement("div");
  div.className = `log-entry log-${event.action}`;
  div.innerHTML = `
    <span class="log-time">${ts}s</span>
    <span class="log-ph" style="color:${["#4a9eff","#ff8c42","#4affa0","#f7a26a","#ff4a6a","#6af7c4","#c46af7","#f7e26a"][event.id % 8]}">P${event.id}</span>
    <span class="log-action">${actionLabels[event.action] || event.action}</span>`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

// ─── SSE ─────────────────────────────────────────────────────────────────────
function connectSSE() {
  if (state.pollInterval) clearInterval(state.pollInterval);
  state.pollInterval = setInterval(async () => {
    if (!state.running) return;
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      
      const prevStates = [...state.philosophers];
      state.philosophers = data.states || [];
      state.eatCounts = data.eat_counts || [];
      state.waitTimes = data.wait_times || [];
      state.thinkTimes = data.think_times || [];

      // Log thay đổi trạng thái
      state.philosophers.forEach((st, i) => {
        if (st !== prevStates[i]) {
          addLogEntry({ time: Date.now(), id: i, action: st, states: state.philosophers, counts: state.eatCounts, deadlock: data.deadlock });
        }
      });

      if (data.deadlock && state.running) state.deadlockCount++;
      updateStats();

      const alert = document.getElementById("deadlock-alert");
      if (data.deadlock) alert.classList.remove("hidden");
      else alert.classList.add("hidden");
    } catch(e) {}
  }, 500);
}

// ─── Controls ────────────────────────────────────────────────────────────────
const btnStart = document.getElementById("btn-start");
const btnStop  = document.getElementById("btn-stop");
const statusDot  = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

document.getElementById("n-input").addEventListener("input", function() { 
  state.n = +this.value;
  document.getElementById("n-display").textContent = this.value;
  if (!state.running) draw();
});

document.getElementById("speed-input").addEventListener("input", function() {
  const speed = +this.value;
  document.getElementById("speed-display").textContent = speed + "x";
  fetch("/api/speed", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({speed})
  });
});
document.querySelectorAll('input[name="strategy"]').forEach(r => {
  r.addEventListener("change", () => { state.strategy = r.value; });
});

btnStart.addEventListener("click", async () => {
  const n = +document.getElementById("n-input").value;
  const strategy = document.querySelector('input[name="strategy"]:checked').value;
  state.n = n;
  state.strategy = strategy;
  state.eatCounts = Array(n).fill(0);
  state.waitTimes = Array(n).fill(0);
  state.thinkTimes = Array(n).fill(0);
  state.philosophers = Array(n).fill("thinking");
  state.deadlockCount = 0;
  state.running = true;

  await fetch("/api/start", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({n, strategy})
  });

  connectSSE();
  statusDot.classList.add("active");
  statusText.textContent = `Đang chạy · ${n} triết gia · ${strategy}`;
  btnStart.disabled = true;
  btnStop.disabled = false;
  updateStats();
  startAnimation();
});

btnStop.addEventListener("click", async () => {
  await fetch("/api/stop", {method: "POST"});
  state.running = false;
  if (state.pollInterval) { clearInterval(state.pollInterval); state.pollInterval = null; }
  statusDot.classList.remove("active");
  statusText.textContent = "Đã dừng";
  btnStart.disabled = false;
  btnStop.disabled = true;
  document.getElementById("deadlock-alert").classList.add("hidden");
});

document.getElementById("btn-clear-log").addEventListener("click", () => {
  logEl.innerHTML = "";
  logCount = 0;
});

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
startAnimation();
updateStats();
