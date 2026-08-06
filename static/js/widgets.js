// ===== Mini-Games & Widgets =====
// Each renders into a container element, self-contained CSS inline

// --- Tic Tac Toe ---
function renderTicTacToe(container) {
  let board = Array(9).fill(null);
  let player = "X";
  let gameOver = false;

  function checkWin(b) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b2,c] of wins) if (b[a] && b[a]===b[b2] && b[a]===b[c]) return b[a];
    return b.every(v=>v) ? "draw" : null;
  }

  function cellClick(i) {
    if (gameOver || board[i]) return;
    board[i] = player;
    const cells = container.querySelectorAll(".ttt-cell");
    cells[i].textContent = player;
    cells[i].classList.add(player === "X" ? "ttt-x" : "ttt-o");
    const winner = checkWin(board);
    if (winner) {
      gameOver = true;
      const status = container.querySelector(".ttt-status");
      status.textContent = winner === "draw" ? "Unentschieden!" : `${winner} gewinnt!`;
      status.style.color = winner === "draw" ? "var(--text-secondary)" : "var(--success)";
    } else {
      player = player === "X" ? "O" : "X";
      container.querySelector(".ttt-status").textContent = `Spieler ${player}`;
    }
  }

  function reset() {
    board = Array(9).fill(null);
    player = "X";
    gameOver = false;
    container.querySelectorAll(".ttt-cell").forEach((c,i) => { c.textContent = ""; c.className = "ttt-cell"; });
    const status = container.querySelector(".ttt-status");
    status.textContent = "Spieler X";
    status.style.color = "var(--text-secondary)";
  }

  container.innerHTML = `<div class="ttt-status">Spieler X</div>
    <div class="ttt-grid">${Array(9).fill(0).map((_,i)=>`<button class="ttt-cell" data-i="${i}"></button>`).join("")}</div>
    <button class="ttt-reset">🔄 Neustart</button>`;
  container.querySelectorAll(".ttt-cell").forEach(c => c.addEventListener("click", () => cellClick(parseInt(c.dataset.i))));
  container.querySelector(".ttt-reset").addEventListener("click", reset);
}

// --- Snake ---
function renderSnake(container) {
  let snake, food, dir, nextDir, score, gameOver, speed, timer;
  let canvas, ctx, cellSize = 16, cols = 18, rows = 18;

  function init() {
    snake = [{x:8,y:9},{x:7,y:9},{x:6,y:9}];
    dir = {x:1,y:0}; nextDir = {x:1,y:0};
    score = 0; gameOver = false; speed = 130;
    spawnFood();
    container.querySelector(".snake-score").textContent = "Score: 0";
    container.querySelector(".snake-gameover").style.display = "none";
    if (timer) clearInterval(timer);
    timer = setInterval(tick, speed);
  }

  function spawnFood() {
    const free = [];
    for (let x=0; x<cols; x++) for (let y=0; y<rows; y++) if (!snake.some(s=>s.x===x&&s.y===y)) free.push({x,y});
    food = free[Math.floor(Math.random()*free.length)];
  }

  function tick() {
    dir = nextDir;
    const head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
    if (head.x<0||head.x>=cols||head.y<0||head.y>=rows||snake.some(s=>s.x===head.x&&s.y===head.y)) {
      gameOver = true; clearInterval(timer);
      container.querySelector(".snake-gameover").style.display = "block";
      return;
    }
    snake.unshift(head);
    if (head.x===food.x && head.y===food.y) { score+=10; spawnFood(); speed=Math.max(60,speed-2); clearInterval(timer); timer=setInterval(tick,speed); }
    else snake.pop();
    container.querySelector(".snake-score").textContent = `Score: ${score}`;
    draw();
  }

  function draw() {
    ctx.fillStyle = "var(--bg,#050507)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "var(--success,#22c55e)";
    snake.forEach(s=>ctx.fillRect(s.x*cellSize+1,s.y*cellSize+1,cellSize-2,cellSize-2));
    ctx.fillStyle = "var(--danger,#ef4444)"; ctx.beginPath(); ctx.arc(food.x*cellSize+cellSize/2,food.y*cellSize+cellSize/2,cellSize/2-1,0,Math.PI*2); ctx.fill();
  }

  function keyHandler(e) {
    const keys = {ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
    if (keys[e.key] && (keys[e.key].x!==-dir.x||keys[e.key].y!==-dir.y)) nextDir = keys[e.key];
  }

  function swipeHandler(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStart.x, dy = t.clientY - swipeStart.y;
    if (Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>20) nextDir = dx>0?{x:1,y:0}:{x:-1,y:0};
    else if (Math.abs(dy)>20) nextDir = dy>0?{x:0,y:1}:{x:0,y:-1};
    if ((nextDir.x===-dir.x&&nextDir.y===-dir.y)||(nextDir.x===dir.x&&nextDir.y===dir.y)) nextDir=dir;
  }
  let swipeStart = {x:0,y:0};

  container.innerHTML = `<div class="snake-score">Score: 0</div>
    <canvas class="snake-canvas" width="${cols*cellSize}" height="${rows*cellSize}"></canvas>
    <div class="snake-gameover" style="display:none">Game Over!</div>
    <button class="snake-reset">🔄 Neustart</button>`;
  canvas = container.querySelector(".snake-canvas");
  ctx = canvas.getContext("2d");
  document.addEventListener("keydown",keyHandler);
  canvas.addEventListener("touchstart",e=>{swipeStart={x:e.touches[0].clientX,y:e.touches[0].clientY}});
  canvas.addEventListener("touchend",swipeHandler);
  container.querySelector(".snake-reset").addEventListener("click",()=>{clearInterval(timer);init();});
  init();
}

// --- Memory ---
function renderMemory(container) {
  const emojis = ["🍎","🍊","🍋","🍇","🌸","🌟","🎈","🐶"];
  let cards, flipped, matched, moves;
  let lock = false;

  function init() {
    const pairs = [...emojis,...emojis];
    for (let i=pairs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]];}
    cards = pairs;
    flipped = []; matched = new Set(); moves = 0;
    container.querySelector(".mem-moves").textContent = "Züge: 0";
    const grid = container.querySelector(".mem-grid");
    grid.innerHTML = cards.map((emoji,i)=>`<button class="mem-cell" data-i="${i}">${matched.has(i)?emoji:"❓"}</button>`).join("");
    grid.querySelectorAll(".mem-cell").forEach(c=>c.addEventListener("click",()=>cellClick(parseInt(c.dataset.i))));
    lock = false;
  }

  function cellClick(i) {
    if (lock || matched.has(i) || flipped.includes(i)) return;
    flipped.push(i);
    moves++;
    container.querySelector(".mem-moves").textContent = `Züge: ${moves}`;
    updateCell(i);
    if (flipped.length === 2) {
      lock = true;
      const [a,b] = flipped;
      if (cards[a]===cards[b]) {
        matched.add(a); matched.add(b);
        updateCell(a); updateCell(b);
        flipped = []; lock = false;
        if (matched.size===cards.length) container.querySelector(".mem-moves").textContent = `Gewonnen in ${moves} Zügen! 🎉`;
      } else setTimeout(()=>{flipped.forEach(x=>updateCell(x));flipped=[];lock=false;},700);
    }
  }

  function updateCell(i) {
    const el = container.querySelectorAll(".mem-cell")[i];
    if (!el) return;
    el.textContent = matched.has(i)||flipped.includes(i) ? cards[i] : "❓";
    el.classList.toggle("mem-flipped", matched.has(i)||flipped.includes(i));
  }

  container.innerHTML = `<div class="mem-moves">Züge: 0</div>
    <div class="mem-grid">${Array(16).fill(0).map((_,i)=>`<button class="mem-cell" data-i="${i}">❓</button>`).join("")}</div>
    <button class="mem-reset">🔄 Neustart</button>`;
  container.querySelector(".mem-reset").addEventListener("click",init);
  init();
}

// --- Dice ---
function renderDice(container) {
  let count = 2;
  let rolling = false;

  function diceFace(n) {
    const dots = {1:[[50,50]],2:[[25,25],[75,75]],3:[[25,25],[50,50],[75,75]],4:[[25,25],[75,25],[25,75],[75,75]],5:[[25,25],[75,25],[50,50],[25,75],[75,75]],6:[[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]};
    const p = dots[n]||[];
    return `<svg viewBox="0 0 100 100" class="dice-face"><rect x="6" y="6" width="88" height="88" rx="16" fill="var(--surface-2)"/><rect x="8" y="8" width="84" height="84" rx="14" fill="var(--surface-solid)"/>${p.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8" fill="var(--text)"/>`).join("")}</svg>`;
  }

  function roll() {
    if (rolling) return;
    rolling = true;
    const diceEl = container.querySelector(".dice-dice");
    const sumEl = container.querySelector(".dice-sum");
    let tick = 0;
    const interval = setInterval(()=>{
      const nums = Array(count).fill(0).map(()=>Math.floor(Math.random()*6)+1);
      diceEl.innerHTML = nums.map(n=>diceFace(n)).join("");
      tick++;
      if (tick>=12){clearInterval(interval);const final=nums.reduce((a,b)=>a+b,0);sumEl.textContent=final>0?`Summe: ${final}`:"";rolling=false;}
    },60);
  }

  container.innerHTML = `<div class="dice-controls">
    <button class="dice-count-btn" data-delta="-1">−</button>
    <span class="dice-count">${count}</span>
    <button class="dice-count-btn" data-delta="1">+</button>
    <button class="dice-roll-btn">🎲 Würfeln</button>
  </div>
  <div class="dice-dice">${Array(count).fill(0).map(()=>diceFace(1)).join("")}</div>
  <div class="dice-sum"></div>`;

  container.querySelectorAll(".dice-count-btn").forEach(b=>b.addEventListener("click",()=>{
    count=Math.max(1,Math.min(6,count+parseInt(b.dataset.delta)));
    container.querySelector(".dice-count").textContent=count;
    container.querySelector(".dice-dice").innerHTML=Array(count).fill(0).map(()=>diceFace(1)).join("");
    container.querySelector(".dice-sum").textContent="";
  }));
  container.querySelector(".dice-roll-btn").addEventListener("click",roll);
}

// --- Countdown ---
function renderCountdown(container) {
  let total = 0, remaining = 0, running = false, interval = null;
  let audioCtx = null;

  function beep() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.3;
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } catch(e) {}
  }

  function fmt(s) { const m=Math.floor(s/60), sec=s%60; return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; }

  function updateDisplay() {
    container.querySelector(".cd-display").textContent = fmt(remaining);
    const bar = container.querySelector(".cd-progress-fill");
    bar.style.width = total>0 ? `${(remaining/total)*100}%` : "100%";
    if (remaining<=10 && remaining>0 && running) bar.style.background = "var(--warning)";
    else if (remaining===0 && total>0) bar.style.background = "var(--danger)";
    else bar.style.background = "var(--accent)";
  }

  function start() {
    if (running) return;
    const min = parseInt(container.querySelector(".cd-min").value)||0;
    const sec = parseInt(container.querySelector(".cd-sec").value)||0;
    if (remaining===0) { total = min*60+sec; remaining = total; if (total<=0) return; }
    running = true;
    container.querySelector(".cd-start").textContent = "⏸ Pause";
    container.querySelector(".cd-inputs").style.display = "none";
    interval = setInterval(()=>{
      remaining--;
      updateDisplay();
      if (remaining<=0) { clearInterval(interval); interval=null; running=false; beep();
        container.querySelector(".cd-start").textContent="▶ Start"; updateDisplay(); }
    },1000);
  }

  function pause() {
    running = false;
    clearInterval(interval); interval = null;
    container.querySelector(".cd-start").textContent = "▶ Start";
  }

  function reset() {
    running = false; clearInterval(interval); interval = null;
    remaining = 0; total = 0;
    container.querySelector(".cd-start").textContent = "▶ Start";
    container.querySelector(".cd-min").value = ""; container.querySelector(".cd-sec").value = "";
    container.querySelector(".cd-inputs").style.display = "flex";
    updateDisplay();
  }

  container.innerHTML = `<div class="cd-display">00:00</div>
    <div class="cd-progress"><div class="cd-progress-fill"></div></div>
    <div class="cd-inputs">
      <input class="cd-min" type="number" min="0" placeholder="Min" inputmode="numeric">
      <input class="cd-sec" type="number" min="0" max="59" placeholder="Sek" inputmode="numeric">
    </div>
    <div class="cd-buttons">
      <button class="cd-start">▶ Start</button>
      <button class="cd-reset">🔄 Reset</button>
    </div>`;
  container.querySelector(".cd-start").addEventListener("click",()=>running?pause():start());
  container.querySelector(".cd-reset").addEventListener("click",reset);
  updateDisplay();
}

// --- Converter ---
function renderConverter(container) {
  const types = [
    {id:"cm-in",label:"cm ↔ inch",a:"cm",b:"inch",fn:v=>v/2.54,rv:v=>v*2.54},
    {id:"kg-lbs",label:"kg ↔ lbs",a:"kg",b:"lbs",fn:v=>v*2.20462,rv:v=>v/2.20462},
    {id:"km-mi",label:"km ↔ miles",a:"km",b:"miles",fn:v=>v*0.621371,rv:v=>v/0.621371},
    {id:"c-f",label:"°C ↔ °F",a:"°C",b:"°F",fn:v=>v*9/5+32,rv:v=>(v-32)*5/9},
  ];
  let current = types[0];

  function convert(fromA) {
    const elA = container.querySelector(".conv-a"), elB = container.querySelector(".conv-b");
    const v = parseFloat(fromA ? elA.value : elB.value);
    if (isNaN(v)) { if (fromA) elB.value=""; else elA.value=""; return; }
    if (fromA) elB.value = Math.round(current.fn(v)*100)/100;
    else elA.value = Math.round(current.rv(v)*100)/100;
  }

  container.innerHTML = `<div class="conv-tabs">${types.map(t=>`<button class="conv-tab${t===current?' active':''}" data-id="${t.id}">${t.label}</button>`).join("")}</div>
    <div class="conv-inputs">
      <div class="conv-field"><input class="conv-a" type="number" placeholder="${current.a}" inputmode="decimal"><span>${current.a}</span></div>
      <div class="conv-swap">⇄</div>
      <div class="conv-field"><input class="conv-b" type="number" placeholder="${current.b}" inputmode="decimal"><span>${current.b}</span></div>
    </div>`;

  container.querySelectorAll(".conv-tab").forEach(tab=>tab.addEventListener("click",()=>{
    container.querySelectorAll(".conv-tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    current = types.find(t=>t.id===tab.dataset.id)||current;
    container.querySelector(".conv-a").placeholder = current.a;
    container.querySelector(".conv-b").placeholder = current.b;
    container.querySelectorAll(".conv-field span")[0].textContent = current.a;
    container.querySelectorAll(".conv-field span")[1].textContent = current.b;
    container.querySelector(".conv-a").value=""; container.querySelector(".conv-b").value="";
  }));
  container.querySelector(".conv-a").addEventListener("input",()=>convert(true));
  container.querySelector(".conv-b").addEventListener("input",()=>convert(false));
}

// ===== Layout System =====
// Default layout: all widget IDs in display order
const DEFAULT_LAYOUT = [
  "weather","chat","weekview","calendar","tasks","timer","water","stocks","news",
  "tictactoe","snake","memory","dice","countdown","converter","currency"
];

// Human-readable widget labels
const WIDGET_LABELS = {
  weather:"Wetter",chat:"Chat",weekview:"Wochenübersicht",calendar:"Termine",
  tasks:"To-Do",timer:"Timer",water:"Wasser",stocks:"Watchlist",news:"News",
  tictactoe:"Tic Tac Toe",snake:"Snake",memory:"Memory",dice:"Würfel",
  countdown:"Countdown",converter:"Converter"
};

// Widget renderers – maps widget ID to rendering function
// Data widgets re-render themselves via their load functions, so they just return their card HTML
const WIDGET_RENDERERS = {
  weather: (c)=>c.innerHTML=`<h3>🌤️ Wetter</h3><div id="weather-card-body">${skeletonCard()}</div>`,
  chat: (c)=>c.innerHTML=`<div class="chat-header"><div class="chat-title">💬 Hermes Chat</div><button class="chat-close">×</button></div><div class="chat-messages" id="chat-box"></div><form class="chat-input" id="chat-form"><input type="text" id="chat-input" placeholder="Frage Hermes..." autocomplete="off"><button type="submit" class="btn-primary">➤</button></form>`,
  weekview: (c)=>c.innerHTML=`<h3>🗓️ Wochenübersicht</h3><div id="week-title" class="page-subtitle"></div><div class="week-view" id="week-view">${skeletonList(7)}</div><button class="btn-secondary" id="add-event-btn" style="margin-top:12px;width:100%">+ Termin</button>`,
  calendar: (c)=>c.innerHTML=`<h3>Termine heute</h3><div id="today-events">${skeletonList(3)}</div>`,
  tasks: (c)=>c.innerHTML=`<h3>✅ Heutige To-Do</h3><div class="task-list">${skeletonList(4)}</div>`,
  timer: (c)=>c.innerHTML=`<h3>⏱️ Timer</h3><div id="timer-body">${skeletonCard()}</div>`,
  water: (c)=>c.innerHTML=`<h3>💧 Wasser</h3><div id="water-body">${skeletonCard()}</div>`,
  stocks: (c)=>c.innerHTML=`<h3>📈 Watchlist</h3><div class="task-list">${skeletonList(3)}</div>`,
  news: (c)=>c.innerHTML=`<h3>📰 News</h3><div class="news-tabs" id="news-tabs"><button data-cat="top" class="active">Top</button><button data-cat="tech">Tech</button><button data-cat="wirtschaft">Wirtschaft</button><button data-cat="sport">Sport</button><button data-cat="wissenschaft">Wissenschaft</button></div><div id="news-list">${skeletonList(3)}</div>`,
  tictactoe: (c)=>{c.innerHTML=`<h3>🎮 Tic Tac Toe</h3><div id="ttt-body"></div>`;renderTicTacToe(c.querySelector("#ttt-body"));},
  snake: (c)=>{c.innerHTML=`<h3>🐍 Snake</h3><div id="snake-body"></div>`;renderSnake(c.querySelector("#snake-body"));},
  memory: (c)=>{c.innerHTML=`<h3>🧠 Memory</h3><div id="memory-body"></div>`;renderMemory(c.querySelector("#memory-body"));},
  dice: (c)=>{c.innerHTML=`<h3>🎲 Würfel</h3><div id="dice-body"></div>`;renderDice(c.querySelector("#dice-body"));},
  countdown: (c)=>{c.innerHTML=`<h3>⏱️ Countdown</h3><div id="cd-body"></div>`;renderCountdown(c.querySelector("#cd-body"));},
  converter: (c)=>{c.innerHTML=`<h3>🔄 Converter</h3><div id="conv-body"></div>`;renderConverter(c.querySelector("#conv-body"));},
};

// Data widgets that need async loading
const DATA_WIDGETS = ["weather","chat","weekview","calendar","tasks","timer","water","stocks","news"];

// Load layout from localStorage
function getLayout() {
  try {
    const raw = localStorage.getItem("hub_home_layout");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr.filter(id => DEFAULT_LAYOUT.includes(id));
    }
  } catch(e) {}
  return [...DEFAULT_LAYOUT];
}

// --- Währungsrechner ---
function renderCurrency(container) {
  container.innerHTML = `
    <h3>💱 Währungsrechner</h3>
    <div style="display:flex;gap:6px;margin:8px 0">
      <input type="number" id="curr-amount" value="1" min="0" step="0.01" style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--surface-2);color:var(--text);font-size:15px;min-width:0">
      <select id="curr-from" style="padding:10px;border-radius:10px;border:none;background:var(--surface-2);color:var(--text);font-size:14px;min-width:0">
        <option value="EUR">EUR</option><option value="USD" selected>USD</option><option value="GBP">GBP</option><option value="JPY">JPY</option><option value="CHF">CHF</option><option value="THB">THB</option>
      </select>
    </div>
    <div style="text-align:center;font-size:22px;margin:6px 0">↓</div>
    <div style="display:flex;gap:6px;margin:8px 0">
      <input type="number" id="curr-result" readonly style="flex:1;padding:10px;border-radius:10px;border:none;background:var(--surface-3);color:var(--text);font-size:15px;min-width:0;font-weight:700">
      <select id="curr-to" style="padding:10px;border-radius:10px;border:none;background:var(--surface-2);color:var(--text);font-size:14px;min-width:0">
        <option value="EUR" selected>EUR</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="JPY">JPY</option><option value="CHF">CHF</option><option value="THB">THB</option>
      </select>
    </div>
    <div id="curr-rate" style="text-align:center;font-size:11px;color:var(--text-tertiary);margin-top:4px">Lade Kurs...</div>`;
  const amount = container.querySelector("#curr-amount");
  const from = container.querySelector("#curr-from");
  const to = container.querySelector("#curr-to");
  const result = container.querySelector("#curr-result");
  const rateEl = container.querySelector("#curr-rate");

  async function convert() {
    const a = parseFloat(amount.value) || 0;
    const f = from.value, t = to.value;
    if (f === t) { result.value = a.toFixed(2); rateEl.textContent = "1 " + f + " = 1 " + t; return; }
    try {
      const r = await fetch(`https://api.frankfurter.app/latest?amount=${a}&from=${f}&to=${t}`);
      const d = await r.json();
      if (d.rates && d.rates[t]) {
        result.value = d.rates[t].toFixed(2);
        rateEl.textContent = `1 ${f} = ${(d.rates[t] / a).toFixed(4)} ${t}`;
      }
    } catch(e) { rateEl.textContent = "Kurs nicht verfügbar"; }
  }

  amount.addEventListener("input", convert);
  from.addEventListener("change", convert);
  to.addEventListener("change", convert);
  convert();
}

// Save layout to localStorage
function saveLayout(layout) {
  localStorage.setItem("hub_home_layout", JSON.stringify(layout));
}

// Reset layout to default
function resetLayout() {
  localStorage.removeItem("hub_home_layout");
}
