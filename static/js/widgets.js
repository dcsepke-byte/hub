
// ===== iOS Widget Grid System =====
// Layout: widget_grid = [{id, col, row, w, h}, ...] in localStorage
// Grid: 4 columns, auto rows
// Sizes: sm (1x1), md (2x1), lg (4x1 or 2x2)

const GRID_COLS = 4;
const DEFAULT_WIDGET_LAYOUT = [
  {id:"weather", col:0, row:0, w:2, h:1},
  {id:"calendar", col:2, row:0, w:1, h:1},
  {id:"tasks", col:0, row:1, w:2, h:1},
  {id:"clock", col:2, row:1, w:1, h:1},
  {id:"water", col:3, row:0, w:1, h:2},
  {id:"news", col:0, row:2, w:4, h:1},
];

function getWidgetLayout() {
  try {
    const raw = localStorage.getItem("hub_widget_layout");
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length > 0) return arr; }
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_WIDGET_LAYOUT));
}

function saveWidgetLayout(layout) {
  localStorage.setItem("hub_widget_layout", JSON.stringify(layout));
}

function resetWidgetLayout() {
  localStorage.removeItem("hub_widget_layout");
}

// Check if a position is free in the grid
function isPositionFree(layout, col, row, w, h, excludeId) {
  for (const wg of layout) {
    if (wg.id === excludeId) continue;
    if (col < wg.col + wg.w && col + w > wg.col && row < wg.row + wg.h && row + h > wg.row) return false;
  }
  if (col + w > GRID_COLS) return false;
  return true;
}

// Find next free position for a new widget
function findFreeSlot(layout, w, h) {
  for (let r = 0; r < 20; r++) {
    for (let c = 0; c <= GRID_COLS - w; c++) {
      if (isPositionFree(layout, c, r, w, h, null)) return {col:c, row:r};
    }
  }
  return {col:0, row:layout.reduce((max,wg) => Math.max(max, wg.row+wg.h), 0)};
}

// Compact the grid — remove gaps
function compactLayout(layout) {
  layout.sort((a,b) => a.row - b.row || a.col - b.col);
  for (const wg of layout) {
    for (let r = 0; r <= wg.row; r++) {
      for (let c = 0; c <= GRID_COLS - wg.w; c++) {
        if (c === wg.col && r === wg.row) break;
        if (isPositionFree(layout, c, r, wg.w, wg.h, wg.id)) {
          wg.col = c; wg.row = r; break;
        }
      }
    }
  }
  return layout;
}

// --- Widget size classes ---
function sizeClass(w, h) {
  if (w >= 4 && h >= 2) return "lg";
  if (w >= 2 || h >= 2) return "md";
  return "sm";
}

// --- Skeleton loader ---
function widgetSkeleton(h) {
  return `<div class="skeleton card" style="height:${h||60}px;margin:0"></div>`;
}

// ===== Jiggle Mode =====
let jiggleActive = false;
let jiggleLongPress = null;
let dragInfo = null;

function exitJiggleMode() {
  jiggleActive = false;
  const grid = document.querySelector(".widget-grid");
  if (!grid) return;
  grid.querySelectorAll(".widget").forEach(w => { w.classList.remove("jiggle"); });
  const overlay = document.querySelector(".jiggle-overlay");
  if (overlay) overlay.remove();
  const doneBtn = document.querySelector(".jiggle-done-btn");
  if (doneBtn) doneBtn.remove();
  const addBtn = document.querySelector(".widget-add-btn");
  if (addBtn) addBtn.style.display = "";
  clearTimeout(jiggleLongPress);
  dragInfo = null;
}

function enterJiggleMode() {
  if (jiggleActive) return;
  jiggleActive = true;
  const grid = document.querySelector(".widget-grid");
  if (!grid) return;

  // Add jiggle overlay
  let overlay = document.querySelector(".jiggle-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "jiggle-overlay";
    overlay.addEventListener("click", exitJiggleMode);
    document.body.appendChild(overlay);
  }
  overlay.style.display = "block";

  // Add done button
  let doneBtn = document.querySelector(".jiggle-done-btn");
  if (!doneBtn) {
    doneBtn = document.createElement("button");
    doneBtn.className = "jiggle-done-btn";
    doneBtn.textContent = "Fertig";
    doneBtn.addEventListener("click", exitJiggleMode);
    document.body.appendChild(doneBtn);
  }
  doneBtn.style.display = "block";

  // Hide add button
  const addBtn = document.querySelector(".widget-add-btn");
  if (addBtn) addBtn.style.display = "none";

  // Add jiggle class to all widgets
  grid.querySelectorAll(".widget").forEach(w => {
    w.classList.add("jiggle");
    addResizeButtons(w);
  });
}

function addResizeButtons(widgetEl) {
  // Remove old resize buttons
  widgetEl.querySelectorAll(".widget-resize").forEach(b => b.remove());
  if (!jiggleActive) return;

  const wgId = widgetEl.dataset.widgetId;
  const layout = getWidgetLayout();
  const wg = layout.find(w => w.id === wgId);
  if (!wg) return;
  const sizes = WIDGET_REGISTRY[wgId]?.sizes || ["sm","md"];

  const btns = document.createElement("div");
  btns.className = "widget-resize";
  sizes.forEach(s => {
    const btn = document.createElement("button");
    btn.textContent = s === "sm" ? "S" : s === "md" ? "M" : "L";
    btn.className = "widget-resize-btn";
    if (sizeClass(wg.w, wg.h) === s) btn.classList.add("active");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      resizeWidget(wgId, s);
    });
    btns.appendChild(btn);
  });
  widgetEl.appendChild(btns);
}

function resizeWidget(widgetId, newSize) {
  const layout = getWidgetLayout();
  const wg = layout.find(w => w.id === widgetId);
  if (!wg) return;
  let nw = wg.w, nh = wg.h;
  if (newSize === "sm") { nw = 1; nh = 1; }
  else if (newSize === "md") { nw = 2; nh = 1; }
  else if (newSize === "lg") { nw = 4; nh = 2; }

  if (nw === wg.w && nh === wg.h) return;
  // Check if new size fits
  const oldW = wg.w, oldH = wg.h;
  wg.w = nw; wg.h = nh;
  if (!isPositionFree(layout, wg.col, wg.row, wg.w, wg.h, wg.id)) {
    // Try to find a free slot with new size
    const slot = findFreeSlot(layout, nw, nh);
    wg.col = slot.col; wg.row = slot.row;
    wg.w = nw; wg.h = nh;
  }
  saveWidgetLayout(layout);
  refreshWidgetGrid();
  enterJiggleMode(); // Re-enter to re-add resize buttons
}

// ===== Drag & Drop =====
function initWidgetDrag(widgetEl) {
  let startX, startY, origCol, origRow, placeholder, ghost;
  let dragging = false;
  let touchId = null;

  function onStart(ex, ey) {
    if (!jiggleActive) return;
    dragging = true;
    const wgId = widgetEl.dataset.widgetId;
    const layout = getWidgetLayout();
    const wg = layout.find(w => w.id === wgId);
    if (!wg) return;
    origCol = wg.col; origRow = wg.row;
    startX = ex; startY = ey;

    // Create ghost
    ghost = widgetEl.cloneNode(true);
    ghost.style.position = "fixed";
    ghost.style.zIndex = "2000";
    ghost.style.opacity = "0.85";
    ghost.style.pointerEvents = "none";
    ghost.style.width = widgetEl.offsetWidth + "px";
    ghost.style.height = widgetEl.offsetHeight + "px";
    ghost.style.left = widgetEl.getBoundingClientRect().left + "px";
    ghost.style.top = widgetEl.getBoundingClientRect().top + "px";
    ghost.style.transition = "none";
    ghost.style.transform = "scale(1.05)";
    ghost.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)";
    document.body.appendChild(ghost);

    // Dim original
    widgetEl.style.opacity = "0.35";
    widgetEl.style.transition = "opacity 0.15s";

    // Create placeholder
    placeholder = document.createElement("div");
    placeholder.className = "widget-placeholder";
    placeholder.style.gridColumn = `span ${wg.w}`;
    placeholder.style.gridRow = `span ${wg.h}`;
    placeholder.style.minHeight = (wg.h * 140) + "px";
    widgetEl.parentNode.insertBefore(placeholder, widgetEl.nextSibling);
  }

  function onMove(ex, ey) {
    if (!dragging || !ghost) return;
    ghost.style.left = (ex - ghost.offsetWidth/2) + "px";
    ghost.style.top = (ey - ghost.offsetHeight/2) + "px";

    // Find target position
    const grid = document.querySelector(".widget-grid");
    if (!grid) return;
    const widgets = [...grid.querySelectorAll(".widget:not([style*=\"opacity: 0.35\"])")];
    let targetIdx = -1;
    for (let i = 0; i < widgets.length; i++) {
      const r = widgets[i].getBoundingClientRect();
      if (ex > r.left && ex < r.right && ey > r.top && ey < r.bottom) {
        targetIdx = i; break;
      }
    }
    // Move placeholder
    if (targetIdx >= 0 && placeholder.nextSibling !== widgets[targetIdx]) {
      grid.insertBefore(placeholder, widgets[targetIdx]);
    }
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    if (ghost) { ghost.remove(); ghost = null; }
    widgetEl.style.opacity = "";
    widgetEl.style.transition = "";

    // Recalculate positions based on placeholder
    if (placeholder) {
      const grid = document.querySelector(".widget-grid");
      const allWidgets = [...grid.querySelectorAll(".widget")];
      const phIdx = allWidgets.indexOf(placeholder);
      const wgIdx = allWidgets.indexOf(widgetEl);

      if (phIdx >= 0 && wgIdx >= 0 && phIdx !== wgIdx) {
        const layout = getWidgetLayout();
        const wgId = widgetEl.dataset.widgetId;
        const movingIdx = layout.findIndex(w => w.id === wgId);

        // Collect all widget IDs in DOM order
        const domOrder = [...grid.querySelectorAll(".widget")].map(w => w.dataset.widgetId);
        // Find target position
        const targetId = phIdx < domOrder.length ? domOrder[phIdx] : null;

        if (targetId && targetId !== wgId) {
          const targetIdx = layout.findIndex(w => w.id === targetId);
          if (movingIdx >= 0 && targetIdx >= 0 && movingIdx !== targetIdx) {
            const [moved] = layout.splice(movingIdx, 1);
            layout.splice(targetIdx > movingIdx ? targetIdx - 1 : targetIdx, 0, moved);
            // Recompute positions
            recomputeGridPositions(layout);
            saveWidgetLayout(layout);
            refreshWidgetGrid();
            enterJiggleMode();
          }
        }
      }
      placeholder.remove();
      placeholder = null;
    }
  }

  // Mouse events
  widgetEl.addEventListener("mousedown", (e) => {
    if (e.target.closest(".widget-resize")) return;
    onStart(e.clientX, e.clientY);
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (dragging) { onMove(e.clientX, e.clientY); e.preventDefault(); }
  });
  document.addEventListener("mouseup", () => { if (dragging) onEnd(); });

  // Touch events
  widgetEl.addEventListener("touchstart", (e) => {
    if (e.target.closest(".widget-resize")) return;
    if (jiggleActive) {
      touchId = e.changedTouches[0].identifier;
      onStart(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  }, {passive: false});
  document.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { onMove(t.clientX, t.clientY); break; }
    }
    e.preventDefault();
  }, {passive: false});
  document.addEventListener("touchend", (e) => {
    if (!dragging) return;
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { onEnd(); break; }
    }
  });
}

function recomputeGridPositions(layout) {
  // Simple: assign rows/cols based on order and available space
  let row = 0, col = 0;
  const maxRow = layout.reduce((m, w) => Math.max(m, w.row + w.h), 0);
  const grid = Array(maxRow + 10).fill(0).map(() => Array(GRID_COLS).fill(false));

  for (const wg of layout) {
    // Find slot
    let found = false;
    for (let r = 0; r < grid.length && !found; r++) {
      for (let c = 0; c <= GRID_COLS - wg.w && !found; c++) {
        let fits = true;
        for (let dr = 0; dr < wg.h && fits; dr++) {
          for (let dc = 0; dc < wg.w && fits; dc++) {
            if (grid[r+dr] && grid[r+dr][c+dc]) fits = false;
          }
        }
        if (fits) {
          wg.col = c; wg.row = r;
          for (let dr = 0; dr < wg.h; dr++)
            for (let dc = 0; dc < wg.w; dc++)
              if (grid[r+dr]) grid[r+dr][c+dc] = true;
          found = true;
        }
      }
    }
    if (!found) {
      wg.col = 0; wg.row = grid.length;
      for (let dr = 0; dr < wg.h; dr++) grid.push(Array(GRID_COLS).fill(false));
      for (let dc = 0; dc < wg.w; dc++) grid[wg.row][dc] = true;
    }
  }
}

// ===== Render Widget Grid =====
function renderWidgetGrid(container) {
  const layout = getWidgetLayout();
  let html = '<div class="widget-grid">';

  layout.forEach(wg => {
    const reg = WIDGET_REGISTRY[wg.id];
    if (!reg) return;
    const sc = sizeClass(wg.w, wg.h);
    const style = `grid-column: span ${wg.w}; grid-row: span ${wg.h};`;
    html += `<div class="widget widget-${sc}" data-widget-id="${wg.id}" style="${style}">`;
    html += `<div class="widget-inner" id="widget-${wg.id}">${widgetSkeleton(100)}</div>`;
    html += `</div>`;
  });

  html += '</div>';
  container.innerHTML = html;

  // Bind events
  const grid = container.querySelector(".widget-grid");
  grid.querySelectorAll(".widget").forEach(w => {
    // Long press for jiggle
    let longPressTimer;
    w.addEventListener("touchstart", () => {
      longPressTimer = setTimeout(() => enterJiggleMode(), 500);
    }, {passive: true});
    w.addEventListener("touchend", () => clearTimeout(longPressTimer));
    w.addEventListener("touchmove", () => clearTimeout(longPressTimer));
    w.addEventListener("mousedown", () => {
      longPressTimer = setTimeout(() => enterJiggleMode(), 500);
    });
    w.addEventListener("mouseup", () => clearTimeout(longPressTimer));
    w.addEventListener("mouseleave", () => clearTimeout(longPressTimer));

    initWidgetDrag(w);
  });

  // Render widgets async
  renderAllWidgets();
}

async function renderAllWidgets() {
  const layout = getWidgetLayout();
  const promises = layout.map(wg => {
    const el = document.getElementById("widget-" + wg.id);
    if (!el) return Promise.resolve();
    const reg = WIDGET_REGISTRY[wg.id];
    if (!reg) return Promise.resolve();
    const sc = sizeClass(wg.w, wg.h);
    return reg.render(el, sc);
  });
  await Promise.allSettled(promises);
}

function refreshWidgetGrid() {
  const content = document.getElementById("content");
  if (!content) return;
  // Preserve existing content structure: widget-grid + app-grid
  const oldGrid = content.querySelector(".widget-grid");
  if (!oldGrid) { renderHome(content); return; }

  const layout = getWidgetLayout();
  oldGrid.innerHTML = "";

  layout.forEach(wg => {
    const reg = WIDGET_REGISTRY[wg.id];
    if (!reg) return;
    const sc = sizeClass(wg.w, wg.h);
    const style = `grid-column: span ${wg.w}; grid-row: span ${wg.h};`;
    const div = document.createElement("div");
    div.className = `widget widget-${sc}`;
    div.dataset.widgetId = wg.id;
    div.style.cssText = style;
    div.innerHTML = `<div class="widget-inner" id="widget-${wg.id}">${widgetSkeleton(100)}</div>`;
    oldGrid.appendChild(div);

    // Re-bind long press + drag
    let longPressTimer;
    div.addEventListener("touchstart", () => { longPressTimer = setTimeout(() => enterJiggleMode(), 500); }, {passive: true});
    div.addEventListener("touchend", () => clearTimeout(longPressTimer));
    div.addEventListener("touchmove", () => clearTimeout(longPressTimer));
    div.addEventListener("mousedown", () => { longPressTimer = setTimeout(() => enterJiggleMode(), 500); });
    div.addEventListener("mouseup", () => clearTimeout(longPressTimer));
    div.addEventListener("mouseleave", () => clearTimeout(longPressTimer));
    initWidgetDrag(div);
  });

  renderAllWidgets();
}

// ===== Widget Gallery Modal =====
function showWidgetGallery() {
  let modal = document.querySelector(".widget-gallery-modal");
  if (modal) { modal.style.display = "flex"; return; }

  const layout = getWidgetLayout();
  const usedIds = new Set(layout.map(w => w.id));

  modal = document.createElement("div");
  modal.className = "widget-gallery-modal";
  modal.innerHTML = `
    <div class="widget-gallery-card">
      <div class="widget-gallery-header">
        <h3>Widget hinzufügen</h3>
        <button class="widget-gallery-close">×</button>
      </div>
      <div class="widget-gallery-grid">
        ${Object.entries(WIDGET_REGISTRY).map(([id, reg]) => `
          <div class="gallery-item ${usedIds.has(id) ? 'used' : ''}" data-widget-id="${id}">
            <span class="gallery-icon">${reg.icon}</span>
            <span class="gallery-name">${reg.name}</span>
            ${usedIds.has(id) ? '<span class="gallery-used">✓</span>' : ''}
          </div>
        `).join("")}
      </div>
    </div>`;

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("widget-gallery-close")) {
      modal.style.display = "none";
    }
  });

  modal.querySelectorAll(".gallery-item").forEach(item => {
    item.addEventListener("click", () => {
      const wgId = item.dataset.widgetId;
      const reg = WIDGET_REGISTRY[wgId];
      if (!reg) return;
      // Don't add duplicates unless user really wants
      const layout = getWidgetLayout();
      if (layout.some(w => w.id === wgId)) {
        modal.style.display = "none";
        return;
      }
      const defSize = reg.sizes.includes("md") ? "md" : (reg.sizes[0] || "sm");
      let nw = 1, nh = 1;
      if (defSize === "md") { nw = 2; nh = 1; }
      else if (defSize === "lg") { nw = 4; nh = 2; }
      const slot = findFreeSlot(layout, nw, nh);
      layout.push({id: wgId, col: slot.col, row: slot.row, w: nw, h: nh});
      saveWidgetLayout(layout);
      modal.style.display = "none";
      refreshWidgetGrid();
    });
  });

  document.body.appendChild(modal);
  modal.style.display = "flex";
}

// ===== Pull-to-Refresh for Widgets =====
function refreshAllWidgetData() {
  return renderAllWidgets();
}

// ===== Widget Registry =====
const WIDGET_REGISTRY = {};

// ===== Widget Type Definitions =====

// 1. Weather
WIDGET_REGISTRY.weather = {
  name: "Wetter", icon: "\ud83c\udf24\ufe0f", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/weather");
      if (!data.ok) { el.innerHTML = '<div class="widget-empty">Nicht verf\u00fcgbar</div>'; return; }
      const c = data.current, days = (data.daily||[]).slice(0,7);
      if (size === "sm") {
        el.innerHTML = `<div class="w-weather-sm"><span class="w-temp-big">${c.temp}\u00b0</span><span class="w-icon">${weatherIcon(c.code, c.is_day)}</span></div>`;
      } else if (size === "md") {
        el.innerHTML = `<div class="w-weather-md"><div class="w-weather-row"><span class="w-temp-big">${c.temp}\u00b0</span><span class="w-icon">${weatherIcon(c.code, c.is_day)}</span></div><div class="w-meta">\ud83d\udca7 ${c.humidity}% \u00b7 \ud83d\udca8 ${c.wind} km/h</div><div class="w-forecast-row">${days.slice(0,4).map(d=>`<div class="w-fc">${weatherIcon(d.code,1)}<span>${d.min}\u00b0</span></div>`).join("")}</div></div>`;
      } else {
        el.innerHTML = `<div class="w-weather-lg"><div class="w-weather-hero"><span class="w-temp-xl">${c.temp}\u00b0</span><span class="w-icon">${weatherIcon(c.code, c.is_day)}</span></div><div class="w-meta">Braunschweig \u00b7 Luftfeuchte ${c.humidity}% \u00b7 Wind ${c.wind} km/h</div><div class="w-forecast-row">${days.map(d=>`<div class="w-fc"><div>${d.date.slice(5)}</div><span>${weatherIcon(d.code,1)}</span><div>${d.min}\u00b0 / ${d.max}\u00b0</div></div>`).join("")}</div></div>`;
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 2. Calendar
WIDGET_REGISTRY.calendar = {
  name: "Termine", icon: "\ud83d\udcc5", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/calendar");
      const today = data.today || [];
      if (size === "sm") {
        el.innerHTML = today.length
          ? `<div class="w-cal-sm"><span class="w-cal-next">${escapeHtml(today[0].title||"Termin")}</span><span class="w-cal-time">${(today[0].start||"").slice(11,16)}</span></div>`
          : '<div class="widget-empty">Keine Termine</div>';
      } else if (size === "md") {
        el.innerHTML = `<div class="w-cal-md">${today.slice(0,3).map(e=>`<div class="w-cal-row"><span class="w-cal-time">${(e.start||"").slice(11,16)}</span><span>${escapeHtml(e.title||"")}</span></div>`).join("")}${today.length===0?'<div class="widget-empty">Keine Termine heute</div>':''}</div>`;
      } else {
        const week = data.week || [];
        el.innerHTML = `<div class="w-cal-lg"><div class="w-cal-week">${week.map(d=>`<div class="w-cal-day"><div class="w-cal-dow">${["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(d.date).getDay()]}</div><div class="w-cal-date">${d.date.slice(8)}</div>${(d.events||[]).slice(0,2).map(e=>`<div class="w-cal-ev">${escapeHtml(e.title||"").slice(0,15)}</div>`).join("")}</div>`).join("")}</div></div>`;
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 3. Tasks
WIDGET_REGISTRY.tasks = {
  name: "To-Do", icon: "\u2705", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/tasks?status=Offen");
      const open = Array.isArray(data) ? data : [];
      if (size === "sm") {
        el.innerHTML = `<div class="w-tasks-sm"><span class="w-count">${open.length}</span><span>offen</span></div>`;
      } else if (size === "md") {
        el.innerHTML = `<div class="w-tasks-md">${open.slice(0,3).map(t=>`<div class="w-task-row">${t.title||""}</div>`).join("")}${open.length===0?'<div class="widget-empty">Alles erledigt \ud83c\udf89</div>':''}</div>`;
      } else {
        el.innerHTML = `<div class="w-tasks-lg"><div class="w-tasks-header">${open.length} Tasks offen</div>${open.slice(0,8).map((t,i)=>`<div class="w-task-row"><input type="checkbox" class="w-task-cb" ${t.status==="Erledigt"?"checked":""}> <span>${escapeHtml(t.title||"")}</span></div>`).join("")}</div>`;
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 4. Timer
let timerInterval = null, timerRunning = false, timerSeconds = 0;
WIDGET_REGISTRY.timer = {
  name: "Timer", icon: "\u23f1\ufe0f", sizes: ["sm","md","lg"],
  render(el, size) {
    if (size === "sm") {
      el.innerHTML = `<div class="w-timer-sm" id="timer-sm">${fmtTimer(timerSeconds)}</div>`;
    } else if (size === "md") {
      el.innerHTML = `<div class="w-timer-md"><div class="w-timer-display" id="timer-md-display">${fmtTimer(timerSeconds)}</div><div class="w-timer-btns"><button class="w-btn-sm" id="timer-start">\u25b6</button><button class="w-btn-sm" id="timer-stop">\u23f9</button><button class="w-btn-sm" id="timer-reset">\u21ba</button></div></div>`;
      el.querySelector("#timer-start")?.addEventListener("click", startTimer);
      el.querySelector("#timer-stop")?.addEventListener("click", stopTimer);
      el.querySelector("#timer-reset")?.addEventListener("click", resetTimer);
    } else {
      el.innerHTML = `<div class="w-timer-lg"><div class="w-timer-display" id="timer-lg-display">${fmtTimer(timerSeconds)}</div><div class="w-timer-btns"><button class="w-btn" id="timer-start2">\u25b6 Start</button><button class="w-btn" id="timer-stop2">\u23f9 Stop</button><button class="w-btn" id="timer-reset2">\u21ba Reset</button></div><div class="w-timer-history" id="timer-history"></div></div>`;
      el.querySelector("#timer-start2")?.addEventListener("click", startTimer);
      el.querySelector("#timer-stop2")?.addEventListener("click", stopTimer);
      el.querySelector("#timer-reset2")?.addEventListener("click", resetTimer);
    }
    updateTimerDisplays();
  }
};
function fmtTimer(s) { const m=Math.floor(s/60), sec=s%60; return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; }
function startTimer() { if(!timerRunning){ timerRunning=true; timerInterval=setInterval(()=>{timerSeconds++;updateTimerDisplays();},1000); } }
function stopTimer() { timerRunning=false; clearInterval(timerInterval); updateTimerDisplays(); }
function resetTimer() { stopTimer(); timerSeconds=0; updateTimerDisplays(); localStorage.setItem("hub_timer", "0"); }
function updateTimerDisplays() {
  const els = document.querySelectorAll("#timer-sm, #timer-md-display, #timer-lg-display");
  els.forEach(e => { if(e) e.textContent = fmtTimer(timerSeconds); });
}

// 5. News
WIDGET_REGISTRY.news = {
  name: "News", icon: "\ud83d\udcf0", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/news");
      const items = (data.items || data || []).slice(0,5);
      if (size === "sm") {
        el.innerHTML = items.length ? `<div class="w-news-sm">${escapeHtml(items[0].title||"").slice(0,50)}</div>` : '<div class="widget-empty">Keine News</div>';
      } else if (size === "md") {
        el.innerHTML = `<div class="w-news-md">${items.slice(0,3).map(n=>`<div class="w-news-row">${escapeHtml(n.title||"").slice(0,60)}</div>`).join("")}</div>`;
      } else {
        el.innerHTML = `<div class="w-news-lg">${items.map(n=>`<div class="w-news-row"><strong>${escapeHtml((n.source||"News")).slice(0,20)}</strong> ${escapeHtml(n.title||"").slice(0,80)}</div>`).join("")}</div>`;
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 6. Water
WIDGET_REGISTRY.water = {
  name: "Wasser", icon: "\ud83d\udca7", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/health");
      const water = data.water || {current:0,goal:2500};
      const pct = Math.min(100, Math.round((water.current/water.goal)*100));
      if (size === "sm") {
        el.innerHTML = `<div class="w-water-sm"><div class="w-progress-ring" style="--pct:${pct}"><span>${water.current}ml</span></div></div>`;
      } else if (size === "md") {
        el.innerHTML = `<div class="w-water-md"><div class="w-progress-bar"><div class="w-progress-fill" style="width:${pct}%"></div></div><div class="w-water-stats">${water.current} / ${water.goal}ml (${pct}%)</div><div class="w-water-btns"><button class="w-btn-sm w-add-water" data-ml="250">+250ml</button><button class="w-btn-sm w-add-water" data-ml="500">+500ml</button></div></div>`;
        el.querySelectorAll(".w-add-water").forEach(b=>b.addEventListener("click",async()=>{
          await postJSON("/api/health/water",{amount:parseInt(b.dataset.ml)});
          WIDGET_REGISTRY.water.render(el,"md");
        }));
      } else {
        el.innerHTML = `<div class="w-water-lg"><div class="w-progress-bar large"><div class="w-progress-fill" style="width:${pct}%"></div></div><div class="w-water-stats">${water.current} / ${water.goal}ml (${pct}%)</div><div class="w-water-btns"><button class="w-btn w-add-water" data-ml="150">+150</button><button class="w-btn w-add-water" data-ml="250">+250</button><button class="w-btn w-add-water" data-ml="500">+500</button><button class="w-btn w-add-water" data-ml="1000">+1L</button></div><div class="w-water-week" id="water-week"></div></div>`;
        el.querySelectorAll(".w-add-water").forEach(b=>b.addEventListener("click",async()=>{
          await postJSON("/api/health/water",{amount:parseInt(b.dataset.ml)});
          WIDGET_REGISTRY.water.render(el,"lg");
        }));
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 7. Stocks
WIDGET_REGISTRY.stocks = {
  name: "Stocks", icon: "\ud83d\udcc8", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/stocks");
      const items = Array.isArray(data) ? data : [];
      if (size === "sm") {
        el.innerHTML = items.length ? `<div class="w-stocks-sm"><span class="w-stock-sym">${items[0].symbol}</span><span class="${items[0].change>=0?'w-up':'w-down'}">${items[0].price}</span></div>` : '<div class="widget-empty">Keine Daten</div>';
      } else if (size === "md") {
        el.innerHTML = `<div class="w-stocks-md">${items.slice(0,3).map(s=>`<div class="w-stock-row"><span>${s.symbol}</span><span class="${s.change>=0?'w-up':'w-down'}">${s.price}</span></div>`).join("")}</div>`;
      } else {
        el.innerHTML = `<div class="w-stocks-lg">${items.slice(0,8).map(s=>`<div class="w-stock-row"><span>${s.symbol}</span><span class="${s.change>=0?'w-up':'w-down'}">${s.price} (${s.change>=0?'+':''}${s.change}%)</span></div>`).join("")}</div>`;
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 8. Server
WIDGET_REGISTRY.server = {
  name: "Server", icon: "\ud83d\udda5\ufe0f", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/server");
      if (size === "sm") {
        el.innerHTML = `<div class="w-server-sm"><span class="w-count">${data.cpu||0}%</span><span>CPU</span></div>`;
      } else if (size === "md") {
        el.innerHTML = `<div class="w-server-md"><div>CPU: ${data.cpu||0}%</div><div>RAM: ${data.ram||0}%</div><div class="w-progress-bar"><div class="w-progress-fill" style="width:${data.cpu||0}%"></div></div></div>`;
      } else {
        el.innerHTML = `<div class="w-server-lg"><div>CPU: ${data.cpu||0}%</div><div class="w-progress-bar"><div class="w-progress-fill" style="width:${data.cpu||0}%"></div></div><div>RAM: ${data.ram||0}%</div><div class="w-progress-bar"><div class="w-progress-fill" style="width:${data.ram||0}%"></div></div><div>Disk: ${data.disk||0}%</div><div class="w-progress-bar"><div class="w-progress-fill" style="width:${data.disk||0}%"></div></div></div>`;
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 9. Chat
WIDGET_REGISTRY.chat = {
  name: "Chat", icon: "\ud83d\udcac", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/chats");
      const threads = (data.threads || []).slice(0,5);
      const lastMsg = threads.length ? (threads[0].last_message || "Keine Nachrichten") : "Keine Chats";
      if (size === "sm") {
        el.innerHTML = `<div class="w-chat-sm">${escapeHtml(lastMsg).slice(0,40)}</div>`;
      } else if (size === "md") {
        el.innerHTML = `<div class="w-chat-md">${threads.slice(0,3).map(t=>`<div class="w-chat-row"><strong>${escapeHtml(t.name||"")}</strong> <span>${escapeHtml(t.last_message||"").slice(0,30)}</span></div>`).join("")}</div>`;
      } else {
        el.innerHTML = `<div class="w-chat-lg"><div class="w-chat-preview">${threads.map(t=>`<div class="w-chat-row"><strong>${escapeHtml(t.name||"Chat")}</strong><p>${escapeHtml(t.last_message||"").slice(0,60)}</p></div>`).join("")}</div><button class="w-btn w-chat-open" onclick="navigate('chat')">Chat \u00f6ffnen</button></div>`;
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 10. TicTacToe
WIDGET_REGISTRY.tictactoe = {
  name: "TicTacToe", icon: "\ud83c\udfae", sizes: ["sm","md","lg"],
  render(el, size) {
    let board = Array(9).fill(null), player = "X", over = false;
    function checkWin(b){const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];for(const[a,b2,c]of w)if(b[a]&&b[a]===b[b2]&&b[a]===b[c])return b[a];return b.every(v=>v)?"draw":null;}
    function click(i){
      if(over||board[i])return;board[i]=player;const cells=el.querySelectorAll(".ttt-cell");cells[i].textContent=player;
      const w=checkWin(board);if(w){over=true;el.querySelector(".ttt-msg").textContent=w==="draw"?"Unentschieden!":`${w} gewinnt!`;}
      else{player=player==="X"?"O":"X";el.querySelector(".ttt-msg").textContent=`Spieler ${player}`;}
    }
    function reset(){board=Array(9).fill(null);player="X";over=false;el.querySelectorAll(".ttt-cell").forEach(c=>c.textContent="");el.querySelector(".ttt-msg").textContent="Spieler X";}
    const grid = Array(9).fill(0).map((_,i)=>`<button class="ttt-cell" data-i="${i}"></button>`).join("");
    el.innerHTML = `<div class="w-ttt"><div class="ttt-msg">Spieler X</div><div class="ttt-grid">${grid}</div>${size!=="sm"?`<button class="ttt-reset-btn">\ud83d\udd04 Neustart</button>`:""}</div>`;
    el.querySelectorAll(".ttt-cell").forEach(c=>c.addEventListener("click",()=>click(parseInt(c.dataset.i))));
    const rst = el.querySelector(".ttt-reset-btn"); if(rst) rst.addEventListener("click",reset);
  }
};

// 11. Countdown
WIDGET_REGISTRY.countdown = {
  name: "Countdown", icon: "\u23f0", sizes: ["sm","md","lg"],
  render(el, size) {
    let total=0, remaining=0, running=false, interval=null;
    function fmt(s){const m=Math.floor(s/60),sec=s%60;return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;}
    function update(){el.querySelector(".cd-display").textContent=fmt(remaining);}
    function start(){
      if(running)return;if(remaining===0){const min=parseInt(el.querySelector(".cd-min")?.value)||0;const sec=parseInt(el.querySelector(".cd-sec")?.value)||0;total=min*60+sec;remaining=total;if(total<=0)return;}
      running=true;interval=setInterval(()=>{remaining--;update();if(remaining<=0){clearInterval(interval);running=false;}},1000);
    }
    function pause(){running=false;clearInterval(interval);}
    function reset(){running=false;clearInterval(interval);remaining=0;total=0;update();}
    if (size === "sm") {
      el.innerHTML = `<div class="w-cd-sm"><div class="cd-display">00:00</div></div>`;
    } else if (size === "md") {
      el.innerHTML = `<div class="w-cd-md"><div class="cd-display">00:00</div><div class="w-cd-inputs"><input class="cd-min" type="number" min="0" placeholder="Min" style="width:50px"><input class="cd-sec" type="number" min="0" max="59" placeholder="Sek" style="width:50px"></div><div class="w-timer-btns"><button class="w-btn-sm cd-start">\u25b6</button><button class="w-btn-sm cd-pause">\u23f8</button><button class="w-btn-sm cd-reset">\u21ba</button></div></div>`;
      el.querySelector(".cd-start")?.addEventListener("click",start);
      el.querySelector(".cd-pause")?.addEventListener("click",pause);
      el.querySelector(".cd-reset")?.addEventListener("click",reset);
    } else {
      el.innerHTML = `<div class="w-cd-lg"><div class="cd-display" style="font-size:48px">00:00</div><div class="w-cd-inputs"><input class="cd-min" type="number" min="0" placeholder="Min" style="width:60px"><input class="cd-sec" type="number" min="0" max="59" placeholder="Sek" style="width:60px"></div><div class="w-cd-presets"><button class="w-btn-sm cd-pre" data-sec="60">1m</button><button class="w-btn-sm cd-pre" data-sec="180">3m</button><button class="w-btn-sm cd-pre" data-sec="300">5m</button><button class="w-btn-sm cd-pre" data-sec="600">10m</button><button class="w-btn-sm cd-pre" data-sec="900">15m</button><button class="w-btn-sm cd-pre" data-sec="1800">30m</button></div><div class="w-timer-btns"><button class="w-btn cd-start2">\u25b6 Start</button><button class="w-btn cd-pause2">\u23f8 Pause</button><button class="w-btn cd-reset2">\u21ba Reset</button></div></div>`;
      el.querySelector(".cd-start2")?.addEventListener("click",start);
      el.querySelector(".cd-pause2")?.addEventListener("click",pause);
      el.querySelector(".cd-reset2")?.addEventListener("click",reset);
      el.querySelectorAll(".cd-pre").forEach(b=>b.addEventListener("click",()=>{total=parseInt(b.dataset.sec);remaining=total;update();}));
    }
    update();
  }
};

// 12. Converter
WIDGET_REGISTRY.converter = {
  name: "Converter", icon: "\ud83d\udd04", sizes: ["sm","md","lg"],
  render(el, size) {
    const types=[{id:"cm-in",a:"cm",b:"inch",fn:v=>v/2.54,rv:v=>v*2.54},{id:"kg-lbs",a:"kg",b:"lbs",fn:v=>v*2.20462,rv:v=>v/2.20462},{id:"c-f",a:"\u00b0C",b:"\u00b0F",fn:v=>v*9/5+32,rv:v=>(v-32)*5/9},{id:"km-mi",a:"km",b:"mi",fn:v=>v*0.621371,rv:v=>v/0.621371}];
    let cur=types[0];
    function conv(fromA){const a=el.querySelector(".cv-a"),b=el.querySelector(".cv-b");const v=parseFloat(fromA?a.value:b.value);if(isNaN(v)){if(fromA)b.value="";else a.value="";return;}if(fromA)b.value=Math.round(cur.fn(v)*100)/100;else a.value=Math.round(cur.rv(v)*100)/100;}
    function switchType(t){cur=t;el.querySelectorAll(".cv-type").forEach(btn=>btn.classList.toggle("active",btn.dataset.id===t.id));}
    const typeBtns = (size==="sm"?types.slice(0,2):types).map(t=>`<button class="cv-type${t===cur?' active':''}" data-id="${t.id}">${t.a}\u2194${t.b}</button>`).join("");
    el.innerHTML = `<div class="w-conv"><div class="cv-tabs">${typeBtns}</div><div style="display:flex;gap:6px;margin:6px 0"><input class="cv-a" type="number" placeholder="${cur.a}" style="flex:1;min-width:0"><span class="cv-swap">\u21c4</span><input class="cv-b" type="number" placeholder="${cur.b}" style="flex:1;min-width:0"></div></div>`;
    el.querySelectorAll(".cv-type").forEach(btn=>btn.addEventListener("click",()=>{cur=types.find(t=>t.id===btn.dataset.id);switchType(cur);el.querySelector(".cv-a").value="";el.querySelector(".cv-b").value="";}));
    el.querySelector(".cv-a")?.addEventListener("input",()=>conv(true));
    el.querySelector(".cv-b")?.addEventListener("input",()=>conv(false));
  }
};

// 13. Notes
WIDGET_REGISTRY.notes = {
  name: "Notizen", icon: "\ud83d\udcdd", sizes: ["sm","md","lg"],
  async render(el, size) {
    try {
      const data = await getJSON("/api/notes");
      const notes = Array.isArray(data) ? data : [];
      if (size === "sm") {
        el.innerHTML = notes.length ? `<div class="w-notes-sm">${escapeHtml(notes[0].title||"").slice(0,40)}</div>` : '<div class="widget-empty">Keine Notizen</div>';
      } else if (size === "md") {
        el.innerHTML = `<div class="w-notes-md">${notes.slice(0,3).map(n=>`<div class="w-notes-row">${escapeHtml(n.title||"").slice(0,50)}</div>`).join("")}</div>`;
      } else {
        el.innerHTML = `<div class="w-notes-lg">${notes.slice(0,8).map(n=>`<div class="w-notes-row"><strong>${escapeHtml(n.title||"").slice(0,40)}</strong><p>${escapeHtml(n.content||"").slice(0,60)}</p></div>`).join("")}</div>`;
      }
    } catch(e) { el.innerHTML = '<div class="widget-empty">Fehler</div>'; }
  }
};

// 14. Clock
function updateClockWidgets() {
  const now = new Date();
  const time = now.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  const date = now.toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"});
  const sec = now.getSeconds();
  document.querySelectorAll(".w-clock-time").forEach(e=>e.textContent=time);
  document.querySelectorAll(".w-clock-date").forEach(e=>e.textContent=date);
  document.querySelectorAll(".w-clock-sec").forEach(e=>e.textContent=String(sec).padStart(2,"0"));
  // Analog clock
  document.querySelectorAll(".w-analog-needle-h").forEach(n=>{n.style.transform=`rotate(${(now.getHours()%12)*30+now.getMinutes()*0.5}deg)`;});
  document.querySelectorAll(".w-analog-needle-m").forEach(n=>{n.style.transform=`rotate(${now.getMinutes()*6}deg)`;});
  document.querySelectorAll(".w-analog-needle-s").forEach(n=>{n.style.transform=`rotate(${sec*6}deg)`;});
}
setInterval(updateClockWidgets, 1000);

WIDGET_REGISTRY.clock = {
  name: "Uhr", icon: "\ud83d\udd50", sizes: ["sm","md","lg"],
  render(el, size) {
    const now = new Date();
    const time = now.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
    const date = now.toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"});
    if (size === "sm") {
      el.innerHTML = `<div class="w-clock-sm"><span class="w-clock-time">${time}</span></div>`;
    } else if (size === "md") {
      el.innerHTML = `<div class="w-clock-md"><span class="w-clock-time">${time}</span><span class="w-clock-date">${date}</span><span class="w-clock-sec">${String(now.getSeconds()).padStart(2,"0")}</span></div>`;
    } else {
      el.innerHTML = `<div class="w-clock-lg"><div class="w-analog-clock"><div class="w-analog-needle-h"></div><div class="w-analog-needle-m"></div><div class="w-analog-needle-s"></div><div class="w-analog-center"></div></div><div class="w-clock-time">${time}</div><div class="w-clock-date">${date}</div></div>`;
    }
  }
};

// 15. Quote
const QUOTES = [
  {text:"Der Weg ist das Ziel.",author:"Konfuzius"},
  {text:"Die beste Zeit fuer einen Neuanfang ist jetzt.",author:"Unbekannt"},
  {text:"Weniger, aber besser.",author:"Dieter Rams"},
  {text:"Qualitaet ist kein Zufall.",author:"Aristoteles"},
  {text:"Einfachheit ist die hoechste Stufe der Vollendung.",author:"Leonardo da Vinci"},
  {text:"Tue, was du kannst, mit dem, was du hast.",author:"Theodore Roosevelt"},
  {text:"Nicht weil es schwer ist, wagen wir es nicht.",author:"Seneca"},
  {text:"Der Anfang ist die Haelfte des Ganzen.",author:"Aristoteles"},
  {text:"Es gibt keinen Weg zum Glueck. Gluecklichsein ist der Weg.",author:"Buddha"},
  {text:"Wer jeden Tag ein kleines Ziel erreicht, kommt grosse Strecken.",author:"Unbekannt"},
];
WIDGET_REGISTRY.quote = {
  name: "Zitat", icon: "\ud83d\udcad", sizes: ["sm","md","lg"],
  render(el, size) {
    const q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
    if (size === "sm") {
      el.innerHTML = `<div class="w-quote-sm">\u201c${escapeHtml(q.text).slice(0,60)}\u201d</div>`;
    } else if (size === "md") {
      el.innerHTML = `<div class="w-quote-md"><p>\u201c${escapeHtml(q.text)}\u201d</p><span>\u2014 ${escapeHtml(q.author)}</span></div>`;
    } else {
      const idx = Math.floor(Math.random()*QUOTES.length);
      el.innerHTML = `<div class="w-quote-lg"><p style="font-size:18px;font-style:italic">\u201c${escapeHtml(QUOTES[idx].text)}\u201d</p><span style="color:var(--text-secondary)">\u2014 ${escapeHtml(QUOTES[idx].author)}</span><button class="w-btn-sm w-quote-refresh" style="margin-top:10px">\ud83d\udd04 Neues Zitat</button></div>`;
      el.querySelector(".w-quote-refresh")?.addEventListener("click",()=>WIDGET_REGISTRY.quote.render(el,"lg"));
    }
  }
};

// ===== Timer state restoration =====
try { timerSeconds = parseInt(localStorage.getItem("hub_timer")||"0")||0; } catch(e) { timerSeconds = 0; }
