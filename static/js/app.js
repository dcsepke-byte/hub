const currentPage = "{{ page }}";
let appState = { page: currentPage, projectFilter: null, taskFilter: "all", taskView: "list", path: "", projectDetail: null, activeList: "Einkauf", explorerView: "grid", notes: [], timer: null, chatThreadId: null };
let socket = null;
let chatHistory = [];
let autoRefreshTimer = null;
let quickAddModal = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function isInputFocused() {
  const active = document.activeElement;
  return active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
}

function isOverlayOpen() {
  return !!(document.querySelector(".action-sheet-overlay") || document.querySelector(".modal.show") || $("#quickAddModal")?.classList.contains("show"));
}

function showActionSheet(title, actions) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "action-sheet-overlay";
    const sheet = document.createElement("div");
    sheet.className = "action-sheet";
    let html = "";
    if (title) html += `<div class="sheet-title">${escapeHtml(title)}</div>`;
    html += `<div class="sheet-actions">`;
    actions.forEach((a) => {
      const cls = a.destructive ? "destructive" : (a.cancel ? "cancel" : "");
      html += `<button data-value="${a.value || ''}" class="${cls}">${escapeHtml(a.label)}</button>`;
    });
    html += `</div>`;
    sheet.innerHTML = html;
    document.body.appendChild(overlay);
    document.body.appendChild(sheet);
    const close = (value) => {
      overlay.style.animation = "none";
      overlay.style.opacity = "0";
      sheet.style.animation = "none";
      sheet.style.transform = "translateY(110%)";
      document.removeEventListener("keydown", esc);
      setTimeout(() => { overlay.remove(); sheet.remove(); resolve(value); }, 220);
    };
    const esc = (e) => { if (e.key === "Escape") close(""); };
    document.addEventListener("keydown", esc);
    sheet.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => close(btn.dataset.value));
    });
    overlay.addEventListener("click", () => close(""));
  });
}

function confirmSheet(message) {
  return showActionSheet(message, [
    { label: "Löschen", value: "ok", destructive: true },
    { label: "Abbrechen", value: "", cancel: true },
  ]).then((v) => v === "ok");
}

function promptWithFallback(message, def = "") {
  try {
    const v = prompt(message, def);
    return v === null ? null : v.trim();
  } catch (e) {
    return null;
  }
}

const PAGES = {
  home: renderHome,
  projects: renderProjects,
  tasks: renderTasks,
  explorer: renderExplorer,
  settings: renderSettings,
  project: renderProjectDetail,
  notes: renderNotes,
  budget: renderBudget,
  health: renderHealth,
  chat: renderChat,
  chatthread: renderChatThread,
  lydia: renderLydia,
};

function parseHash() {
  const raw = location.hash.slice(1) || "";
  if (raw.startsWith("chatthread/")) {
    appState.chatThreadId = raw.split("/")[1] || "";
    return "chatthread";
  }
  return raw.split("/")[0] || "home";
}

function init() {
  initNav();
  initSearch();
  initQuickAdd();
  initTheme();
  initShortcuts();
  initSocket();
  startAutoRefresh();
  initIdleLogout();
  startTimerTick();
  const start = parseHash() || localStorage.getItem('hub_last_page') || currentPage || "home";
  navigate(start, false);
  window.addEventListener("hashchange", () => navigate(parseHash(), false));
  window.addEventListener("popstate", () => {
    const page = parseHash() || localStorage.getItem('hub_last_page') || "home";
    navigate(page, false);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") maybeRefreshHome();
  });
}

function initNav() {
  const home = $("#homeBtn");
  if (home) home.addEventListener("click", (e) => { e.preventDefault(); navigate("home"); });
  const bottom = $("#bottomNav");
  if (!bottom) return;
  bottom.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.page));
  });
  const fab = $("#fab");
  if (fab) fab.addEventListener("click", () => $("#quickAddModal")?.classList.add("show"));
}

function initTheme() {
  const saved = localStorage.getItem("hub_theme");
  if (saved) document.body.className = saved;
  $("#themeToggle")?.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light");
    document.body.className = isLight ? "dark" : "light";
    localStorage.setItem("hub_theme", isLight ? "dark" : "light");
    // Icons dem Theme anpassen (monochrome Varianten neu laden)
    if (appState.page === "home") renderHome($("#content"));
  });
}

function initSearch() {
  const input = $("#globalSearch");
  const results = $("#searchResults");
  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { results.classList.remove("show"); return; }
    debounce = setTimeout(async () => {
      try {
        const data = await getJSON(`/api/search?q=${encodeURIComponent(q)}`);
        renderSearchResults(data);
      } catch (e) {
        results.innerHTML = `<div class="search-empty">Fehler</div>`;
        results.classList.add("show");
      }
    }, 250);
  });
  input.addEventListener("focus", () => { if (input.value.trim()) results.classList.add("show"); });
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) results.classList.remove("show");
  });
}

function renderSearchResults(data) {
  const box = $("#searchResults");
  const items = [];
  (data.projects || []).forEach((p) => items.push({ type: "Projekt", title: p.name, action: () => { appState.projectDetail = p.id; navigate("project"); } }));
  (data.tasks || []).forEach((t) => items.push({ type: "Task", title: t.title, meta: t.project, action: () => window.open(t.url, "_blank") }));
  (data.files || []).forEach((f) => items.push({ type: f.type === "folder" ? "Ordner" : "Datei", title: f.name, action: () => {
    if (f.type === "folder") { appState.path = f.path; navigate("explorer"); }
    else window.open(`/files/${encodeURIComponent(f.path)}`, "_blank");
  } }));
  box.innerHTML = items.length
    ? items.map((it) => `<div class="search-result"><div class="type">${it.type}</div><div>${it.title}${it.meta ? ` <span style="color:var(--text-tertiary);font-size:12px">(${it.meta})</span>` : ""}</div></div>`).join("")
    : `<div class="search-empty">Keine Ergebnisse</div>`;
  box.classList.add("show");
  box.querySelectorAll(".search-result").forEach((el, i) => {
    el.addEventListener("click", () => { items[i].action(); box.classList.remove("show"); $("#globalSearch").value = ""; });
  });
}

function initQuickAdd() {
  quickAddModal = $("#quickAddModal");
  if (!quickAddModal) return;
  const show = () => quickAddModal.classList.add("show");
  const hide = () => quickAddModal.classList.remove("show");
  $("#quickAdd")?.addEventListener("click", show);
  $(".close-modal")?.addEventListener("click", hide);
  quickAddModal.addEventListener("click", (e) => { if (e.target === quickAddModal) hide(); });
  let qtype = "task";
  $$(".quick-type").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".quick-type").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      qtype = btn.dataset.type;
      $("#quickDue").style.display = qtype === "task" ? "block" : "none";
      $("#quickEventTime").style.display = qtype === "event" ? "block" : "none";
      $("#quickFile").style.display = qtype === "file" ? "block" : "none";
    });
  });
  $("#quickForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#quickTitle").value.trim();
    const project = $("#quickProject")?.value || "";
    if (!title && qtype !== "file") return;
    if (qtype === "task") {
      const due = $("#quickDue").value;
      const res = await postJSON("/api/tasks", { title, project, due, status: "Offen" });
      flash(res.id || res.ok !== false ? "Task erstellt" : "Fehler", res.id ? "ok" : "error");
    } else if (qtype === "note") {
      const res = await postJSON("/api/notes", { title, project, content: "" });
      flash(res?.ok ? "Notiz erstellt" : "Fehler", res?.ok ? "ok" : "error");
    } else if (qtype === "event") {
      const time = $("#quickEventTime").value;
      if (!time) return flash("Zeit wählen", "error");
      const res = await postJSON("/api/calendar", { title, start: time, project });
      flash(res?.ok ? "Termin erstellt" : "Fehler", res?.ok ? "ok" : "error");
    } else if (qtype === "file") {
      const fileInput = $("#quickFile");
      if (!fileInput.files.length) return flash("Keine Datei", "error");
      const form = new FormData();
      form.append("file", fileInput.files[0]);
      const res = await fetch(`/api/explorer/upload?path=${encodeURIComponent(appState.path || "")}`, { method: "POST", body: form });
      flash(res.ok ? "Datei hochgeladen" : "Upload fehlgeschlagen", res.ok ? "ok" : "error");
    }
    hide();
    $("#quickForm").reset();
    if (appState.page === "tasks") renderTasks($("#content"));
    if (appState.page === "explorer") renderExplorer($("#content"));
  });
}

function closeOpenModals() {
  if (quickAddModal) quickAddModal.classList.remove("show");
  $(".lightbox")?.remove();
  const chat = $(".chat-widget");
  if (chat) chat.classList.remove("expanded");
  const search = $("#searchResults");
  if (search) search.classList.remove("show");
  const modals = document.querySelectorAll(".modal.show");
  modals.forEach((m) => m.classList.remove("show"));
}

function initShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (isInputFocused()) return;
    if (isOverlayOpen()) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeOpenModals();
      }
      return;
    }
    const key = e.key;
    if (e.metaKey || e.ctrlKey) {
      if (key.toLowerCase() === "k") {
        e.preventDefault();
        $("#globalSearch")?.focus();
        return;
      }
    }
    if (key === "Escape") {
      e.preventDefault();
      closeOpenModals();
      return;
    }
    if (key.toLowerCase() === "n") {
      e.preventDefault();
      quickAddModal?.classList.add("show");
      return;
    }
    if (["1", "2", "3", "4", "5"].includes(key)) {
      e.preventDefault();
      const map = { 1: "home", 2: "projects", 3: "tasks", 4: "explorer", 5: "settings" };
      navigate(map[key]);
      return;
    }
  });
}

function initSocket() {
  if (typeof io === "undefined") return;
  socket = io({ transports: ["polling"] });
  socket.on("connect", () => console.log("socket connected"));
  socket.on("chat_message", (msg) => {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) indicator.remove();
    chatHistory.push(msg);
    const box = $(".chat-messages");
    if (box) appendMessage(box, msg);
  });
  socket.on("connect_error", () => flash("Chat-Verbindung unterbrochen", "error"));
}

function navigate(page, push = true) {
  const target = PAGES[page] ? page : "home";
  const content = $("#content");
  content.classList.add("page-out");
  setTimeout(() => {
    appState.page = target;
    localStorage.setItem("hub_last_page", target);
    let hash = `#${target}`;
    // Thread-ID in URL für Deep-Link / Back-Support
    if (target === "chatthread" && appState.chatThreadId) hash = `#chatthread/${appState.chatThreadId}`;
    if (push && location.hash !== hash) history.pushState(null, "", hash);
    const home = $("#homeBtn");
    if (home) home.classList.toggle("active", target === "home");
    $("#bottomNav")?.querySelectorAll("button[data-page]").forEach((btn) => btn.classList.toggle("active", btn.dataset.page === target));
    content.innerHTML = "";
    content.classList.remove("page-out");
    content.classList.add("page-in");
    (PAGES[target] || renderHome)(content);
    document.title = `HUB — ${target[0].toUpperCase()}${target.slice(1)}`;
    requestAnimationFrame(() => setTimeout(() => content.classList.remove("page-in"), 30));
  }, 160);
}

async function getJSON(url) {
  try {
    const r = await fetch(url);
    if (r.status === 401) { window.location.href = "/login"; throw new Error("Nicht eingeloggt"); }
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  } catch (e) {
    if (!navigator.onLine) throw new Error("Du bist offline. Bitte prüfe deine Verbindung.");
    throw e;
  }
}

async function postJSON(url, body) {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 401) { window.location.href = "/login"; return { ok: false }; }
    return r.json().catch(() => ({ ok: false }));
  } catch (e) {
    if (!navigator.onLine) return { ok: false, error: "Offline. Daten werden gespeichert, sobald die Verbindung wieder da ist." };
    return { ok: false, error: e.message };
  }
}

async function patchJSON(url, body) {
  try {
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 401) { window.location.href = "/login"; return { ok: false }; }
    return r.json().catch(() => ({ ok: false }));
  } catch (e) {
    if (!navigator.onLine) return { ok: false, error: "Offline. Änderung wird später synchronisiert." };
    return { ok: false, error: e.message };
  }
}

async function deleteReq(url) {
  try {
    const r = await fetch(url, { method: "DELETE" });
    if (r.status === 401) { window.location.href = "/login"; return { ok: false }; }
    return r.json().catch(() => ({ ok: false }));
  } catch (e) {
    if (!navigator.onLine) return { ok: false, error: "Offline. Löschung wird später synchronisiert." };
    return { ok: false, error: e.message };
  }
}

function flash(text, type = "ok") {
  const toast = document.createElement("div");
  toast.className = `flash ${type}`;
  toast.textContent = text;
  toast.style.position = "fixed";
  toast.style.top = "80px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.zIndex = "250";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function skeletonCard() { return `<div class="card"><div class="skeleton title"></div><div class="skeleton text"></div><div class="skeleton text" style="width:80%"></div></div>`; }
function skeletonList(count = 4) { return Array(count).fill(0).map(() => `<div class="task-item"><div class="skeleton circle"></div><div class="skeleton text" style="flex:1"></div></div>`).join(""); }
function skeletonGrid(n = 4) { return `<div class="grid grid-2">${Array(n).fill(0).map(skeletonCard).join("")}</div>`; }

function initPullToRefresh(callback) {
  if (window.matchMedia("(pointer: fine)").matches) return;
  const content = $("#content");
  if (!content || content.dataset.ptr === "1") return;
  content.dataset.ptr = "1";
  let startY = 0, pulling = false;
  content.classList.add("ptr");
  const indicator = document.createElement("div");
  indicator.className = "ptr-indicator"; indicator.textContent = "↓";
  content.prepend(indicator);
  content.addEventListener("touchstart", (e) => { if (content.scrollTop <= 2) startY = e.touches[0].clientY; }, { passive: true });
  content.addEventListener("touchmove", (e) => {
    const y = e.touches[0].clientY;
    const delta = y - startY;
    if (content.scrollTop <= 2 && delta > 0) {
      pulling = true;
      content.classList.add("pulling");
      if (delta > 100) content.classList.add("refreshing");
    }
  }, { passive: true });
  content.addEventListener("touchend", async () => {
    if (!pulling) return;
    pulling = false;
    if (!content.classList.contains("refreshing")) { content.classList.remove("pulling"); return; }
    indicator.textContent = "↻";
    try { await callback(); } catch (e) {}
    content.classList.remove("pulling", "refreshing");
    indicator.textContent = "↓";
  }, { passive: true });
}

function appIcon(id, label, emoji) {
  if (emoji) {
    return `<div class="app-icon" data-app="${id}"><div class="app-icon-emoji" role="img" aria-label="${label}">${emoji}</div><div class="label">${label}</div></div>`;
  }
  const mode = document.body.classList.contains("light") ? "light" : "dark";
  return `<div class="app-icon" data-app="${id}"><img src="/static/images/apps/${id}-${mode}.svg?v=9" alt="${label}" title="${label}"></div>`;
}

function bindAppClicks() {
  $$(".app-icon").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.app;
      if (id === "party-arena") window.open("https://performer-lang-governmental-uploaded.trycloudflare.com", "_blank");
      else if (id === "piano-coach") window.open("https://coach.danny-csepke.de", "_blank");
      else if (id === "bangkok") window.open("/bangkok", "_blank");
      else if (id === "projects") navigate("projects");
      else if (id === "todo") navigate("tasks");
      else if (id === "explorer") navigate("explorer");
      else if (id === "chat") navigate("chat");
      else if (id === "settings") navigate("settings");
      else if (id === "notizen") navigate("notes");
      else if (id === "budget") navigate("budget");
      else if (id === "health") navigate("health");
    });
  });
}

// --- Home ---
async function renderHome(container) {
  container.innerHTML = `
    <div class="app-grid">
      ${appIcon("party-arena", "Party Arena")}
      ${appIcon("piano-coach", "Klavier")}
      ${appIcon("bangkok", "Bangkok")}
      ${appIcon("notizen", "Notizen")}
      ${appIcon("projects", "Projekte")}
      ${appIcon("todo", "To-Do")}
      ${appIcon("budget", "Budget")}
      ${appIcon("explorer", "Explorer")}
      ${appIcon("health", "Gesundheit")}
      ${appIcon("chat", "Hermes")}
      ${appIcon("settings", "Settings")}
    </div>
    <div id="suggestion-chip" class="suggestion-chip" style="opacity:0;transform:translateY(-12px);transition:opacity 0.5s ease, transform 0.5s ease;cursor:pointer;">
      <div class="icon">⚡</div>
      <div class="text" id="chip-text">Lade Tasks...</div>
      <div class="cta">Tasks →</div>
    </div>
    <h2 class="page-title">Übersicht</h2>
    <div class="grid grid-2">
      <div class="card" id="weather-card">${skeletonCard()}</div>
      <div class="card chat-widget">
        <div class="chat-header"><div class="chat-title">💬 Hermes Chat</div><button class="chat-close">×</button></div>
        <div class="chat-messages" id="chat-box"></div>
        <form class="chat-input" id="chat-form"><input type="text" id="chat-input" placeholder="Frage Hermes..." autocomplete="off"><button type="submit" class="btn-primary">➤</button></form>
      </div>
      <div class="card" id="week-view-card">
        <h3>🗓️ Wochenübersicht</h3>
        <div id="week-title" class="page-subtitle"></div>
        <div class="week-view" id="week-view">${skeletonList(7)}</div>
        <button class="btn-secondary" id="add-event-btn" style="margin-top:12px;width:100%">+ Termin</button>
      </div>
      <div class="card" id="calendar-card"><h3>Termine heute</h3><div id="today-events">${skeletonList(3)}</div></div>
      <div class="card" id="tasks-card"><h3>✅ Heutige To-Do</h3><div class="task-list">${skeletonList(4)}</div></div>
      <div class="card" id="timer-card"><h3>⏱️ Timer</h3><div id="timer-body">${skeletonCard()}</div></div>
      <div class="card" id="water-card"><h3>💧 Wasser</h3><div id="water-body">${skeletonCard()}</div></div>
      <div class="card" id="stocks-card"><h3>📈 Watchlist</h3><div class="task-list">${skeletonList(3)}</div></div>
      <div class="card" id="news-card"><h3>📰 News</h3><div id="news-list">${skeletonList(3)}</div></div>
    </div>`;
  bindAppClicks();
  initChat();
  bindSuggestionChip();
  await Promise.all([loadWeather(), loadTodayTasks(), loadTodayEvents(), loadNews(), loadStocks(), loadCalendarWeek(), loadTimer(), loadWater()]);
  refreshSuggestionChip();
  initPullToRefresh(() => Promise.all([loadWeather(), loadTodayTasks(), loadTodayEvents(), loadNews(), loadStocks(), loadCalendarWeek(), loadTimer(), loadWater()]).then(refreshSuggestionChip));
}

function statusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("aktiv")) return "active";
  if (s.includes("arbeit") || s.includes("beendet")) return "done";
  if (s.includes("plan") || s.includes("vorbereitung")) return "planning";
  return "";
}

function bindSuggestionChip() {
  const chip = $("#suggestion-chip");
  if (!chip) return;
  chip.addEventListener("click", () => navigate("tasks"));
}

async function refreshSuggestionChip() {
  const chip = $("#suggestion-chip");
  if (!chip) return;
  try {
    const hour = new Date().getHours();
    const [tasks, cal] = await Promise.all([getJSON("/api/tasks?status=Offen"), getJSON("/api/calendar")]);
    const todayCount = tasks.filter((t) => dueClass(t.due) === "due-today").length;
    const overdueCount = tasks.filter((t) => dueClass(t.due) === "due-overdue").length;
    const evCount = (cal.today || []).length;
    let icon = "⚡", text = "";
    if (hour >= 5 && hour < 11) {
      // Morgen: Wetter + heute anstehende Termine
      icon = "🌅";
      text = `Heute ${evCount} Termin${evCount === 1 ? "" : "e"}, ${todayCount} Task${todayCount === 1 ? "" : "s"} fällig`;
      if (!evCount && !todayCount) text = `${tasks.length} offene Tasks — guter Start in den Tag`;
    } else if (hour >= 11 && hour < 17) {
      // Mittag: offene Tasks
      icon = "☀️";
      if (overdueCount > 0) text = `${overdueCount} Task${overdueCount === 1 ? "" : "s"} überfällig · ${tasks.length} offen`;
      else text = `${tasks.length} offene Task${tasks.length === 1 ? "" : "s"} · ${evCount} Termin${evCount === 1 ? "" : "e"} heute`;
    } else if (hour >= 17 && hour < 23) {
      // Abend: Tagesrückblick + morgen vorbereiten
      icon = "🌇";
      text = `Rückblick: ${evCount} Termin${evCount === 1 ? "" : "e"} heute, ${tasks.length} offene Tasks — morgen vorbereiten`;
    } else {
      // Nacht: Ruhe-Hinweis
      icon = "🌙";
      text = tasks.length ? `${tasks.length} offene Tasks — sonst gute Nacht 🌙` : "Gute Nacht 🌙 — morgen ist ein neuer Tag";
    }
    const iconEl = chip.querySelector(".icon");
    if (iconEl) iconEl.textContent = icon;
    $("#chip-text").textContent = text;
    chip.style.opacity = "1";
    chip.style.transform = "translateY(0)";
  } catch (e) {
    chip.style.opacity = "1";
    chip.style.transform = "translateY(0)";
    $("#chip-text").textContent = "Tasks anzeigen";
  }
}

async function maybeRefreshHome() {
  if (appState.page !== "home") return;
  if (document.visibilityState !== "visible") return;
  if (isInputFocused()) return;
  await Promise.all([loadWeather(), loadTodayTasks(), loadTodayEvents(), loadNews(), loadStocks(), loadCalendarWeek(), loadTimer(), loadWater(), refreshSuggestionChip()]);
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(maybeRefreshHome, 120000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearInterval(autoRefreshTimer); autoRefreshTimer = null;
    } else {
      if (!autoRefreshTimer) autoRefreshTimer = setInterval(maybeRefreshHome, 120000);
      maybeRefreshHome();
    }
  });
}

function stopAutoRefresh() {
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
}

function initChat() {
  const widget = $(".chat-widget");
  if (!widget) return;
  widget.querySelector(".chat-close").addEventListener("click", () => {
    widget.classList.toggle("expanded");
    if (widget.classList.contains("expanded")) $("#chat-input")?.focus();
  });
  $("#chat-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text || !socket) return;
    socket.emit("chat_message", { text });
    input.value = "";
    widget.classList.add("expanded");
    const box = $("#chat-box");
    const typing = document.createElement("div");
    typing.className = "typing"; typing.id = "typing-indicator"; typing.innerHTML = "Hermes denkt<span></span><span></span><span></span>";
    box.appendChild(typing); box.scrollTop = box.scrollHeight;
  });
  const box = $("#chat-box");
  chatHistory.slice(-30).forEach((m) => appendMessage(box, m));
  $("#chat-input")?.addEventListener("focus", () => widget.classList.add("expanded"));
}

function appendMessage(box, msg) {
  const div = document.createElement("div");
  div.className = `message ${msg.role}`;
  div.textContent = msg.text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

async function loadWeather() {
  try {
    const data = await getJSON("/api/weather");
    const el = $("#weather-card");
    if (!data.ok) { el.innerHTML = "<h3>🌤️ Wetter</h3><p class='empty-state'>Wetterdaten nicht verfügbar.</p>"; return; }
    const c = data.current, days = data.daily.slice(0, 4);
    el.innerHTML = `<h3>🌤️ Wetter — Braunschweig</h3><div class="weather-main"><div class="icon">${weatherIcon(c.code, c.is_day)}</div><div><div class="temp">${c.temp}°C</div><div class="weather-meta">Luftfeuchtigkeit ${c.humidity}% · Wind ${c.wind} km/h</div></div></div><div class="forecast">${days.map((d) => `<div class="forecast-day"><span class="icon">${weatherIcon(d.code, 1)}</span><div class="temps">${d.min}° / ${d.max}°</div><div class="temps">${d.date.slice(5)}</div></div>`).join("")}</div>`;
  } catch (e) { if ($("#weather-card")) $("#weather-card").innerHTML = "<h3>🌤️ Wetter</h3><p class='empty-state'>Fehler.</p>"; }
}

async function loadTodayEvents() {
  const el = $("#today-events");
  if (!el) return;
  try {
    const data = await getJSON("/api/calendar");
    el.classList.remove("loader");
    const events = data.today || [];
    el.innerHTML = events.length ? events.map((e) => eventRow(e, true)).join("") : "<p class='empty-state'>Keine Termine heute.</p>";
  } catch (e) { el.classList.remove("loader"); el.innerHTML = "<p class='empty-state'>Fehler.</p>"; }
  const addBtn = $("#add-event-btn");
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = "1";
    addBtn.addEventListener("click", async () => {
    const title = promptWithFallback("Titel:"); if (!title) return;
    const time = promptWithFallback("Uhrzeit (HH:MM):"); if (!time) return;
    const today = new Date().toISOString().slice(0, 10);
    const res = await postJSON("/api/calendar", { title, start: `${today}T${time}:00` });
    if (res.ok) { flash("Termin hinzugefügt"); loadTodayEvents(); }
    else flash("Fehler", "error");
    });
  }
}

function eventRow(e, showNav = false) {
  const start = new Date(e.start);
  const navUrl = e.location ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(e.location)}` : null;
  return `<div class="event-row"><div class="event-title">${escapeHtml(e.title)}</div><div class="event-date">${start.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}${showNav && navUrl ? ` <a class="event-nav" href="${escapeHtml(navUrl)}" target="_blank" rel="noopener">🗺️</a>` : ""}</div></div>`;
}

function renderCalendarWeek(container, days, events, reference) {
  const today = new Date().toISOString().slice(0, 10);
  const eventDates = new Set(events.map((e) => e.start ? new Date(e.start).toISOString().slice(0, 10) : "").filter(Boolean));
  const names = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const html = days.map((d, i) => {
    const isToday = d.date === today;
    const hasEvents = eventDates.has(d.date);
    const dt = new Date(d.date);
    return `<div class="week-day ${isToday ? 'today' : ''}" data-date="${d.date}">
      <div class="day-name">${names[i]}</div>
      <div class="day-num">${dt.getDate()}</div>
      ${hasEvents ? '<div class="dot"></div>' : '<div style="height:5px"></div>'}
    </div>`;
  }).join("");
  container.innerHTML = html;
}

async function loadCalendarWeek(offset = 0) {
  const container = $("#week-view");
  if (!container) return;
  try {
    const data = await getJSON(`/api/calendar/week?offset=${offset}`);
    const reference = new Date();
    if (offset !== 0) reference.setDate(reference.getDate() + offset * 7);
    renderCalendarWeek(container, data.days, data.events || [], reference);
    const title = $("#week-title");
    if (title) title.textContent = `KW ${getWeek(reference)} — ${formatDate(data.days[0].date)} bis ${formatDate(data.days[6].date)}`;
  } catch (e) { container.innerHTML = "<p class='empty-state'>Kalender nicht verfügbar.</p>"; }
}

function getWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

async function loadNews() {
  const el = $("#news-list");
  if (!el) return;
  try {
    const data = await getJSON("/api/news");
    el.classList.remove("loader");
    if (!data.ok || !data.items.length) { el.innerHTML = "<p class='empty-state'>News momentan nicht verfügbar.</p>"; return; }
    el.innerHTML = data.items.map((n) => `<a href="${escapeHtml(n.url)}" target="_blank" class="news-item" rel="noopener"><div class="news-title">${escapeHtml(n.title)}</div><div class="news-desc">${escapeHtml(n.description)}</div><div class="news-date">${n.published ? new Date(n.published).toLocaleString('de-DE', {weekday:'short', hour:'2-digit', minute:'2-digit'}) : ''}</div></a>`).join("");
  } catch (e) { el.classList.remove("loader"); el.innerHTML = "<p class='empty-state'>Fehler beim Laden.</p>"; }
}

async function loadStocks() {
  const el = $("#stocks-card");
  if (!el) return;
  try {
    const data = await getJSON("/api/stocks");
    el.classList.remove("loader");
    if (!data.ok) { el.innerHTML = `<h3>📈 Watchlist</h3><p class='empty-state'>${data.error || "Aktien nicht verfügbar"}</p>`; return; }
    el.innerHTML = `<h3>📈 Watchlist</h3><div class="task-list">${data.items.map((s) => `<div class="stock-card"><div class="stock-symbol">${s.symbol}</div><div class="stock-price"><div class="price">${s.price.toFixed(2)} $</div><div class="change ${s.change >= 0 ? 'stock-up' : 'stock-down'}">${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)} (${s.percent >= 0 ? '+' : ''}${s.percent.toFixed(2)}%)</div></div></div>`).join("")}</div>
      <form class="stock-form" id="stock-form"><input type="text" id="stock-symbol" placeholder="Symbol z.B. AAPL" maxlength="6"><button type="submit" class="btn-primary">+</button></form>`;
    $("#stock-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sym = $("#stock-symbol").value.trim().toUpperCase();
      const res = await postJSON("/api/stocks", { symbol: sym });
      flash(res.ok ? `${sym} hinzugefügt` : (res.error || "Fehler"), res.ok ? "ok" : "error");
      if (res.ok) loadStocks();
    });
    el.querySelectorAll(".stock-card").forEach((card) => {
      card.addEventListener("contextmenu", async (e) => {
        e.preventDefault();
        const ok = await confirmSheet(`${card.querySelector(".stock-symbol").textContent} entfernen?`);
        if (!ok) return;
        await deleteReq(`/api/stocks/${card.querySelector(".stock-symbol").textContent}`);
        loadStocks();
      });
    });
  } catch (e) { el.classList.remove("loader"); el.innerHTML = "<h3>📈 Watchlist</h3><p class='empty-state'>Fehler.</p>"; }
}

async function loadTodayTasks() {
  try {
    await loadPriosFromServer();
    const tasks = await getJSON("/api/tasks?status=Offen");
    const el = $("#tasks-card");
    const today = tasks.slice(0, 6);
    el.innerHTML = `<h3>✅ Heutige To-Do</h3><div class="task-list">${today.length ? today.map(taskRow).join("") : "<p class='empty-state'>Keine offenen Tasks. 🎉</p>"}</div>`;
    bindTaskCheckboxes(el, () => { loadTodayTasks(); if (appState.page === "tasks") renderTasks($("#content")); });
  } catch (e) { $("#tasks-card").innerHTML = "<h3>✅ Heutige To-Do</h3><p class='empty-state'>Fehler beim Laden.</p>"; }
}

function weatherIcon(code, isDay) {
  const map = { 0: isDay ? "☀️" : "🌙", 1: isDay ? "🌤️" : "☁️", 2: isDay ? "⛅" : "☁️", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌧️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️", 71: "🌨️", 73: "🌨️", 75: "🌨️", 77: "🌨️", 80: "🌦️", 81: "🌧️", 82: "🌧️", 85: "🌨️", 86: "🌨️", 95: "⛈️", 96: "⛈️", 99: "⛈️" };
  return map[code] || "❓";
}

// --- Projects ---
async function renderProjects(container) {
  container.innerHTML = `
    <div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div>
    <h2 class="page-title">Projekte</h2>
    <div class="card" style="margin-bottom:20px">
      <h3>➕ Neues Projekt</h3>
      <form id="project-form" class="project-form">
        <input type="text" id="p-name" placeholder="Name" required>
        <div class="row"><input type="text" id="p-icon" placeholder="Icon Emoji" value="📁"><input type="color" id="p-color" value="#6366f1"></div>
        <select id="p-status"><option>In Arbeit</option><option>Geplant</option><option>Aktiv</option><option>Vorbereitung</option><option>Beendet</option></select>
        <input type="text" id="p-desc" placeholder="Beschreibung">
        <div class="row"><input type="url" id="p-live" placeholder="Live URL"><input type="url" id="p-repo" placeholder="Repo URL"></div>
        <button type="submit" class="btn-primary">Projekt anlegen</button>
      </form>
    </div>
    <div class="grid grid-2" id="project-grid"><div class="loader"></div></div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  $("#project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await postJSON("/api/projects", {
      name: $("#p-name").value.trim(), icon: $("#p-icon").value, color: $("#p-color").value,
      status: $("#p-status").value, description: $("#p-desc").value,
      live_url: $("#p-live").value, repo_url: $("#p-repo").value,
    });
    if (res.ok) { flash("Projekt angelegt"); renderProjects(container); } else flash(res.error || "Fehler", "error");
  });
  const grid = $("#project-grid");
  grid.innerHTML = skeletonGrid(3);
  try {
    const projects = await getJSON("/api/projects");
    grid.innerHTML = projects.map((p) => {
      const total = p.total_tasks || p.tasks || 0;
      const completed = p.completed_tasks || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return `
        <div class="project-card" data-id="${p.id}">
          <div class="header"><div class="icon" style="background:${p.color}22">${p.icon}</div>
            <div class="project-meta">
              <div style="display:flex;align-items:center;gap:8px"><h4>${p.name}</h4><span class="badge ${statusBadgeClass(p.status)}">${p.status}</span></div>
              <div class="tasks">${completed}/${total} erledigt · ${p.tasks} offen</div>
            </div>
          </div>
          <div class="progress-wrap"><div class="progress-bar"><div style="width:${pct}%"></div></div><div class="progress-text">${pct}% abgeschlossen</div></div>
          <div class="project-actions"><button class="timer-btn" title="Timer für dieses Projekt">⏱</button><button class="open-btn">Öffnen</button><button class="edit-btn">Bearbeiten</button><button class="danger del-btn">Löschen</button></div>
        </div>`;
    }).join("");
    $$(".project-card").forEach((card) => {
      const id = card.dataset.id;
      card.querySelector(".timer-btn").addEventListener("click", async () => {
        const name = card.querySelector("h4").textContent;
        const res = await postJSON("/api/timetrack/start", { project: name, task: "" });
        flash(res.ok ? `⏱ Timer gestartet: ${name}` : (res.error || "Fehler"), res.ok ? "ok" : "error");
      });
      card.querySelector(".open-btn").addEventListener("click", () => { appState.projectDetail = id; navigate("project"); });
      card.querySelector(".edit-btn").addEventListener("click", () => editProject(id));
      card.querySelector(".del-btn").addEventListener("click", async () => {
        const ok = await confirmSheet("Projekt wirklich löschen?");
        if (!ok) return;
        await deleteReq(`/api/projects/${id}`);
        flash("Gelöscht");
        renderProjects(container);
      });
    });
  } catch (e) { $("#project-grid").innerHTML = "<p class='empty-state'>Projekte konnten nicht geladen werden.</p>"; }
  initPullToRefresh(() => renderProjects(container));
}

async function editProject(id) {
  const p = await getJSON(`/api/projects/${id}`);
  const form = document.createElement("div");
  form.className = "modal show";
  form.innerHTML = `<div class="modal-card"><div class="modal-header"><h3>Projekt bearbeiten</h3><button class="close-modal">×</button></div><div class="modal-body">
    <form id="edit-p-form" class="project-form"><input type="text" id="ep-name" value="${p.name}" required>
    <div class="row"><input type="text" id="ep-icon" value="${p.icon}"><input type="color" id="ep-color" value="${p.color}"></div>
    <select id="ep-status"><option ${p.status==='In Arbeit'?'selected':''}>In Arbeit</option><option ${p.status==='Geplant'?'selected':''}>Geplant</option><option ${p.status==='Aktiv'?'selected':''}>Aktiv</option><option ${p.status==='Vorbereitung'?'selected':''}>Vorbereitung</option><option ${p.status==='Beendet'?'selected':''}>Beendet</option></select>
    <input type="text" id="ep-desc" value="${p.description || ''}">
    <div class="row"><input type="url" id="ep-live" value="${p.live_url || ''}" placeholder="Live URL"><input type="url" id="ep-repo" value="${p.repo_url || ''}" placeholder="Repo URL"></div>
    <button type="submit" class="btn-primary">Speichern</button></form></div></div>`;
  document.body.appendChild(form);
  form.querySelector(".close-modal").addEventListener("click", () => form.remove());
  form.addEventListener("click", (e) => { if (e.target === form) form.remove(); });
  $("#edit-p-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await patchJSON(`/api/projects/${id}`, {
      name: $("#ep-name").value.trim(), icon: $("#ep-icon").value, color: $("#ep-color").value,
      status: $("#ep-status").value, description: $("#ep-desc").value,
      live_url: $("#ep-live").value, repo_url: $("#ep-repo").value,
    });
    if (res.ok) { flash("Gespeichert"); form.remove(); renderProjects($("#content")); } else flash(res.error || "Fehler", "error");
  });
}

async function renderProjectDetail(container) {
  const id = appState.projectDetail;
  if (!id) { navigate("projects"); return; }
  container.innerHTML = `<div class="back-home"><button class="btn-secondary" id="back-home">← Home</button> <button class="btn-secondary" id="back-projects">← Projekte</button> <button class="btn-secondary" id="pd-chat-btn" style="display:none">💬 Chat</button></div>
    <h2 class="page-title" id="pd-title"></h2><div class="grid grid-2"><div class="card"><h3>📋 Offene Tasks</h3><div id="pd-tasks" class="loader"></div></div><div class="card"><h3>📅 Kommende Termine</h3><div id="pd-events" class="loader"></div></div><div class="card" style="grid-column:1/-1"><h3>🔗 Links</h3><div id="pd-links" class="loader"></div></div></div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  $("#back-projects")?.addEventListener("click", () => navigate("projects"));
  try {
    const p = await getJSON(`/api/projects/${id}`);
    $("#pd-title").textContent = `${p.icon} ${p.name}`;
    $("#pd-title").style.color = p.color;
    const chatBtn = $("#pd-chat-btn");
    if (chatBtn) {
      chatBtn.style.display = "";
      chatBtn.addEventListener("click", () => openOrCreateProjectChat(p.name));
    }
    const tasksEl = $("#pd-tasks"); tasksEl.classList.remove("loader");
    tasksEl.innerHTML = p.tasks?.length ? p.tasks.map(taskRow).join("") : "<p class='empty-state'>Keine offenen Tasks.</p>";
    bindTaskCheckboxes(tasksEl, () => renderProjectDetail(container));
    const eventsEl = $("#pd-events"); eventsEl.classList.remove("loader");
    eventsEl.innerHTML = p.events?.length ? p.events.map((e) => eventRow(e)).join("") : "<p class='empty-state'>Keine Termine.</p>";
    const linksEl = $("#pd-links"); linksEl.classList.remove("loader");
    linksEl.innerHTML = p.links?.length ? p.links.map((l) => `<a href="${l.url}" target="_blank" class="project-link" style="border-color:${p.color}">${l.name}</a>`).join("") : "<p class='empty-state'>Keine Links.</p>";
  } catch (e) { container.innerHTML = "<p class='empty-state'>Projekt konnte nicht geladen werden.</p>"; }
}

// --- Tasks ---
async function renderTasks(container) {
  container.innerHTML = `
    <div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div>
    <h2 class="page-title">To-Do</h2>
    <div class="task-tabs"><button data-tab="tasks" class="active">Aufgaben</button><button data-tab="lists">Listen</button><button data-tab="dashboard">Dashboard</button></div>
    <div id="task-panel">
      <div class="task-view-tabs"><button data-view="list" class="active">Liste</button><button data-view="matrix">Matrix</button></div>
      <div id="task-list-wrap">
        <div class="task-filter"><button data-filter="all" class="active">Alle</button><button data-filter="Offen">Offen</button><button data-filter="Erledigt">Erledigt</button><button data-filter="Party Arena">Party Arena</button><button data-filter="KI-Videos">KI-Videos</button><button data-filter="Hochzeit">Hochzeit</button><button data-filter="Server">Server</button></div>
        <div class="task-list" id="task-list">${skeletonList(6)}</div>
      </div>
      <div id="matrix-panel" style="display:none"></div>
    </div>
    <div id="lists-panel" style="display:none">
      <div class="list-tabs" id="list-tabs">${skeletonList(2)}</div>
      <div id="lists-list" class="task-list">${skeletonList(4)}</div>
      <form id="list-add-form" class="list-add-form">
        <input type="text" id="list-new-item" placeholder="Neuer Eintrag...">
        <input type="url" id="list-new-url" placeholder="URL (optional)" style="flex:1">
        <button type="submit" class="btn-primary">+</button>
      </form>
      <form id="list-create-form" class="list-add-form" style="margin-top:8px">
        <input type="text" id="list-new-name" placeholder="Neue Liste..." required>
        <button type="submit" class="btn-secondary">Liste anlegen</button>
      </form>
    </div>
    <div id="dashboard-panel" style="display:none"><div class="grid grid-3" id="dash-grid"></div></div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  $$(".task-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".task-tabs button").forEach((b) => b.classList.remove("active")); btn.classList.add("active");
      const tab = btn.dataset.tab;
      $(".task-view-tabs").style.display = tab === "tasks" ? "flex" : "none";
      $(".task-filter").style.display = tab === "tasks" ? "flex" : "none";
      $("#task-panel").style.display = tab === "tasks" ? "block" : "none";
      $("#lists-panel").style.display = tab === "lists" ? "block" : "none";
      $("#dashboard-panel").style.display = tab === "dashboard" ? "block" : "none";
      if (tab === "lists") loadLists();
      if (tab === "dashboard") loadDashboard();
    });
  });
  $$(".task-view-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".task-view-tabs button").forEach((b) => b.classList.remove("active")); btn.classList.add("active");
      appState.taskView = btn.dataset.view;
      $("#task-list-wrap").style.display = appState.taskView === "list" ? "block" : "none";
      $("#matrix-panel").style.display = appState.taskView === "matrix" ? "block" : "none";
      if (appState.taskView === "matrix") renderMatrixView();
    });
  });
  $$(".task-filter button").forEach((btn) => {
    btn.addEventListener("click", () => { $$(".task-filter button").forEach((b) => b.classList.remove("active")); btn.classList.add("active"); appState.taskFilter = btn.dataset.filter; loadTasks(); });
  });
  $("#idle-save").addEventListener("click", () => {
    const v = parseInt($("#idle-minutes").value, 10);
    if (!v || v < 1) return flash("Ungültige Minuten", "error");
    localStorage.setItem("hub_idle_minutes", String(v));
    flash(`Auto-Logout: ${v} Minuten`);
    if (window.hubIdleReset) window.hubIdleReset();
  });
  $("#list-add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $("#list-new-item").value.trim();
    const url = $("#list-new-url").value.trim();
    if (!text || !appState.activeList) return;
    const res = await postJSON(`/api/lists/${encodeURIComponent(appState.activeList)}/items`, { text, url });
    if (res.ok) { $("#list-add-form").reset(); loadLists(); } else flash("Fehler", "error");
  });
  $("#list-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#list-new-name").value.trim();
    if (!name) return;
    const res = await postJSON("/api/lists", { name });
    flash(res.ok ? `Liste "${name}" erstellt` : (res.error || "Fehler"), res.ok ? "ok" : "error");
    if (res.ok) { $("#list-create-form").reset(); appState.activeList = name; loadLists(); }
  });
  await loadTasks();
  appState.activeList = appState.activeList || "Einkauf"; loadLists();
}

function dueClass(due) {
  if (!due) return "";
  const d = new Date(due); d.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return "due-overdue";
  if (diff === 0) return "due-today";
  return "due-future";
}

async function loadTasks() {
  await loadPriosFromServer();
  if (appState.taskView === "matrix") return renderMatrixView();
  const list = $("#task-list"); if (!list) return;
  try {
    let url = "/api/tasks";
    const knownStatus = ["Offen", "Erledigt", "In Arbeit", "Blockiert"];
    if (knownStatus.includes(appState.taskFilter) && appState.taskFilter !== "all") url += `?status=${encodeURIComponent(appState.taskFilter)}`;
    else if (appState.taskFilter && appState.taskFilter !== "all") url += `?project=${encodeURIComponent(appState.taskFilter)}`;
    const tasks = await getJSON(url);
    list.innerHTML = tasks.length ? tasks.map(taskRow).join("") : "<p class='empty-state'>Keine Tasks.</p>";
    bindTaskCheckboxes(list, loadTasks);
    initSwipe(list, loadTasks);
  } catch (e) { list.innerHTML = "<p class='empty-state'>Fehler beim Laden.</p>"; }
}

async function loadDashboard() {
  const grid = $("#dash-grid");
  if (!grid) return;
  grid.innerHTML = skeletonGrid(4);
  try {
    const tasks = await getJSON("/api/tasks?status=Offen");
    const total = tasks.length;
    const overdue = tasks.filter((t) => dueClass(t.due) === "due-overdue").length;
    const today = tasks.filter((t) => dueClass(t.due) === "due-today").length;
    grid.innerHTML = `
      <div class="card"><h3>Offen</h3><div style="font-size:38px;font-weight:700">${total}</div></div>
      <div class="card" style="border-left:4px solid var(--danger)"><h3>Überfällig</h3><div style="font-size:38px;font-weight:700;color:var(--danger)">${overdue}</div></div>
      <div class="card" style="border-left:4px solid var(--warning)"><h3>Heute fällig</h3><div style="font-size:38px;font-weight:700;color:var(--warning)">${today}</div></div>
      <div class="card" style="grid-column:1/-1"><h3>Offene Tasks fällig in 14 Tagen</h3><div class="task-list">${tasks.filter((t) => t.due).slice(0,8).map(taskRow).join("") || "<p class='empty-state'>Keine Termine gesetzt.</p>"}</div></div>`;
    bindTaskCheckboxes(grid, loadDashboard);
  } catch (e) { grid.innerHTML = "<p class='empty-state'>Fehler.</p>"; }
}

async function loadLists() {
  const tabs = $("#list-tabs"), list = $("#lists-list");
  if (!tabs || !list) return;
  try {
    const data = await getJSON("/api/lists");
    const names = Object.keys(data);
    appState.activeList = appState.activeList || names[0];
    tabs.innerHTML = names.map((n) => `<button class="list-tab ${n === appState.activeList ? 'active' : ''}" data-list="${n}">${n}${n !== "Einkauf" && n !== "Filme" && n !== "Geschenke" && n !== "Ideen" && n !== "Wünsche" ? ' ×' : ''}</button>`).join("");
    $$("#list-tabs button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.textContent.includes("×")) {
          const ok = await confirmSheet(`Liste "${btn.dataset.list}" löschen?`);
          if (!ok) return;
          deleteReq(`/api/lists/${encodeURIComponent(btn.dataset.list)}`).then(loadLists);
          return;
        }
        appState.activeList = btn.dataset.list; loadLists();
      });
    });
    const items = data[appState.activeList] || [];
    list.innerHTML = items.length ? items.map((it) => listRow(it)).join("") : "<p class='empty-state'>Liste leer.</p>";
    list.querySelectorAll("input[type=checkbox]").forEach((box) => box.addEventListener("change", async () => { await patchJSON(`/api/lists/${encodeURIComponent(box.dataset.list)}/items/${box.dataset.id}/toggle`, {}); loadLists(); }));
    list.querySelectorAll(".edit-btn").forEach((btn) => btn.addEventListener("click", () => editListItem(btn.dataset.list, parseInt(btn.dataset.id, 10))));
    list.querySelectorAll(".del-btn").forEach((btn) => btn.addEventListener("click", async () => {
      const ok = await confirmSheet("Eintrag löschen?");
      if (!ok) return;
      await fetch(`/api/lists/${encodeURIComponent(btn.dataset.list)}/items/${btn.dataset.id}`, { method: "DELETE" });
      loadLists();
    }));
  } catch (e) { list.innerHTML = "<p class='empty-state'>Fehler.</p>"; }
  initPullToRefresh(() => loadLists());
}

function listRow(it) {
  return `<div class="list-row ${it.done ? 'done' : ''}" data-list="${appState.activeList}" data-id="${it.id}">
      <input type="checkbox" ${it.done ? 'checked' : ''} data-list="${appState.activeList}" data-id="${it.id}">
      <div class="text">${escapeHtml(it.text)}${it.url ? ` <a href="${escapeHtml(it.url)}" target="_blank" class="list-item-url" rel="noopener">↗</a>` : ""}</div>
      <div class="actions"><button class="edit-btn" data-list="${appState.activeList}" data-id="${it.id}">✎</button><button class="del-btn" data-list="${appState.activeList}" data-id="${it.id}">×</button></div>
    </div>`;
}

async function editListItem(listName, id) {
  const data = await getJSON("/api/lists");
  const item = data[listName]?.find((i) => i.id === id);
  if (!item) return;
  const text = promptWithFallback("Text:", item.text);
  if (text === null) return;
  const url = promptWithFallback("URL:", item.url || "");
  if (url === null) return;
  const res = await patchJSON(`/api/lists/${encodeURIComponent(listName)}/items/${id}`, { text: text.trim(), url: url.trim() });
  flash(res.ok ? "Gespeichert" : "Fehler", res.ok ? "ok" : "error");
  if (res.ok) loadLists();
}

function initSwipe(root, reloadFn, isList = false) {
  root.querySelectorAll(".task-item").forEach((el) => {
    let startX = 0;
    el.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", async (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) < 80) return;
      const id = el.dataset.id;
      if (!isList) {
        if (diff > 0) await patchJSON(`/api/tasks/${id}/status`, { status: "Erledigt" });
        else await patchJSON(`/api/tasks/${id}/status`, { status: "Blockiert" });
      } else {
        if (diff > 0) await patchJSON(`/api/lists/${encodeURIComponent(el.dataset.list)}/items/${id}/toggle`, {});
        else { await fetch(`/api/lists/${encodeURIComponent(el.dataset.list)}/items/${id}`, { method: "DELETE" }); }
      }
      reloadFn();
    }, { passive: true });
  });
}

function taskRow(t) {
  const done = t.status === "Erledigt";
  const dc = dueClass(t.due);
  const prio = getTaskPrios()[t.id] || "";
  let dueLabel = "";
  if (t.due) {
    const d = new Date(t.due); d.setHours(0,0,0,0); const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    dueLabel = diff === 0 ? "Heute" : diff === 1 ? "Morgen" : diff < 0 ? `${Math.abs(diff)}d überfällig` : `in ${diff}d`;
  }
  return `<div class="task-item ${done ? "done" : ""} ${dc}" data-id="${t.id}"><input type="checkbox" ${done ? "checked" : ""} data-id="${t.id}"><div class="task-title" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</div><span class="prio-badge ${prio ? `p${prio[1]}` : ""}" data-prio="${prio}" title="Priorität (P1-P4)">${prio || "–"}</span><div class="task-due">${dueLabel}</div><div class="task-meta">${escapeHtml(t.project || "—")}</div></div>`;
}

function bindTaskCheckboxes(root, cb) {
  root.querySelectorAll("input[type=checkbox]").forEach((box) => {
    box.addEventListener("change", async () => { await patchJSON(`/api/tasks/${box.dataset.id}/status`, { status: box.checked ? "Erledigt" : "Offen" }); cb && cb(); });
  });
  root.querySelectorAll(".prio-badge").forEach((badge) => {
    badge.addEventListener("click", async (e) => {
      e.stopPropagation();
      const item = badge.closest(".task-item");
      if (!item) return;
      const order = ["P1", "P2", "P3", "P4", ""];
      const cur = badge.dataset.prio || "";
      const next = order[(order.indexOf(cur) + 1) % order.length];
      await setTaskPrio(item.dataset.id, next);
      cb && cb();
    });
  });
}

// Prioritäten (Eisenhower): serverseitig + localStorage-Fallback
// _prioCache: Server-gewinner-Merge, nach loadPriosFromServer() gefüllt
let _prioCache = null;
let _prioLoading = false;
let _prioLoaded = false;

async function loadPriosFromServer() {
  if (_prioLoading) {
    // Warte auf laufenden Load (max 5s)
    const start = Date.now();
    while (_prioLoading && Date.now() - start < 5000) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (_prioLoaded) return;
  }
  _prioLoading = true;
  try {
    const serverPrios = await getJSON("/api/priorities");
    const localPrios = _getLocalPrios();
    // Server gewinnt, local als Fallback für IDs die nicht auf dem Server sind
    _prioCache = { ...localPrios, ...serverPrios };
    // Lokalen Stand mit Server synchronisieren
    localStorage.setItem("hub_task_prio", JSON.stringify(_prioCache));
    _prioLoaded = true;
  } catch (e) {
    _prioCache = _getLocalPrios();
    _prioLoaded = true;
  } finally {
    _prioLoading = false;
  }
}

function _getLocalPrios() {
  try { return JSON.parse(localStorage.getItem("hub_task_prio") || "{}"); } catch (e) { return {}; }
}

function getTaskPrios() {
  // Synchroner Zugriff: Cache oder localStorage-Fallback
  if (_prioCache) return _prioCache;
  _prioCache = _getLocalPrios();
  return _prioCache;
}

async function setTaskPrio(id, prio) {
  // Cache sicherstellen
  if (!_prioCache) await loadPriosFromServer();

  // Cache updaten
  if (!prio) delete _prioCache[id];
  else _prioCache[id] = prio;

  // localStorage synchron halten
  localStorage.setItem("hub_task_prio", JSON.stringify(_prioCache));

  // Server-Update (fire-and-forget mit Log)
  try {
    await patchJSON(`/api/priorities/${encodeURIComponent(id)}`, { prio: prio });
  } catch (e) {
    // Fallback: nur lokal gespeichert — wird beim nächsten loadPriosFromServer() überschrieben
    console.warn("Server-Prio update failed, saved locally only");
  }
}

// --- Explorer vereinfacht ---
async function renderExplorer(container) {
  container.innerHTML = `
    <div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div>
    <h2 class="page-title">Explorer</h2>
    <div class="explorer-wrap">
      <div class="explorer-main">
        <div class="explorer-toolbar">
          <button id="up-btn">⬆ Hoch</button>
          <button id="new-folder-btn">Neuer Ordner</button>
          <button id="rename-btn">Umbenennen</button>
          <button id="delete-btn">Löschen</button>
          <label>Upload<input type="file" id="explorer-upload" style="display:none" multiple></label>
          <button id="view-grid" class="active">▦ Grid</button>
          <button id="view-list">☰ Liste</button>
        </div>
        <div class="explorer-breadcrumb" id="breadcrumb"></div>
        <div class="explorer-content" id="explorer-content" data-view="grid">${skeletonGrid(6)}</div>
      </div>
    </div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  $("#up-btn").addEventListener("click", () => { appState.path = appState.path.split("/").slice(0, -1).join("/"); appState.selectedPath = null; loadExplorer(); });
  $("#new-folder-btn").addEventListener("click", () => { const name = prompt("Ordnername:"); if (name) postJSON("/api/explorer/folder", { path: appState.path || "", name }).then(() => loadExplorer()); });
  $("#rename-btn").addEventListener("click", () => { if (!appState.selectedPath) return flash("Datei wählen", "error"); const name = prompt("Neuer Name:"); if (name) postJSON("/api/explorer/rename", { path: appState.selectedPath, name }).then(() => { appState.selectedPath = null; loadExplorer(); }); });
  $("#delete-btn").addEventListener("click", async () => {
    if (!appState.selectedPath) return flash("Datei wählen", "error");
    const ok = await confirmSheet("Wirklich löschen?");
    if (!ok) return;
    postJSON("/api/explorer/delete", { path: appState.selectedPath }).then(() => { appState.selectedPath = null; loadExplorer(); });
  });
  $("#explorer-upload").addEventListener("change", async (e) => { for (const file of e.target.files) await uploadFile(file); e.target.value = ""; loadExplorer(); });
  $("#view-grid").addEventListener("click", () => { appState.explorerView = "grid"; $("#explorer-content").dataset.view = "grid"; $$("#view-grid,#view-list").forEach((b) => b.classList.toggle("active", b.id === "view-grid")); });
  $("#view-list").addEventListener("click", () => { appState.explorerView = "list"; $("#explorer-content").dataset.view = "list"; $$("#view-grid,#view-list").forEach((b) => b.classList.toggle("active", b.id === "view-list")); });
  loadExplorer();
  initPullToRefresh(() => loadExplorer());
}

async function loadExplorer() {
  const content = $("#explorer-content");
  try {
    const items = await getJSON(`/api/explorer?path=${encodeURIComponent(appState.path || "")}`);
    content.dataset.view = appState.explorerView || "grid";
    content.innerHTML = items.map((it) => `<div class="explorer-item ${appState.selectedPath === it.path ? 'selected' : ''}" data-path="${it.path}" data-type="${it.type}" data-name="${it.name}">
        <div class="icon">${it.type === "folder" ? "📁" : iconForFile(it.name)}</div>
        <div class="name">${it.name}</div>
        ${it.type === "file" ? `<div class="meta">${formatBytes(it.size)}</div>` : ""}
      </div>`).join("");
    $$(".explorer-item").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.type === "folder") { appState.path = el.dataset.path; appState.selectedPath = null; loadExplorer(); }
        else { appState.selectedPath = el.dataset.path; $$(".explorer-item").forEach((i) => i.classList.remove("selected")); el.classList.add("selected"); }
      });
      el.addEventListener("dblclick", () => { if (el.dataset.type === "file") openPreview(el.dataset.path, el.dataset.name); });
    });
    content.addEventListener("dragover", (e) => { e.preventDefault(); content.classList.add("drag-over"); });
    content.addEventListener("dragleave", () => content.classList.remove("drag-over"));
    content.addEventListener("drop", async (e) => { e.preventDefault(); content.classList.remove("drag-over"); for (const file of e.dataTransfer.files) await uploadFile(file); loadExplorer(); });
    renderBreadcrumb();
  } catch (e) { content.innerHTML = "<p class='empty-state'>Fehler.</p>"; }
}

async function uploadFile(file) {
  const form = new FormData(); form.append("file", file);
  const r = await fetch(`/api/explorer/upload?path=${encodeURIComponent(appState.path || "")}`, { method: "POST", body: form });
  flash(r.ok ? "Hochgeladen" : "Upload fehlgeschlagen", r.ok ? "ok" : "error");
  if (r.ok) loadExplorer();
}

function renderBreadcrumb() {
  const parts = appState.path ? appState.path.split("/").filter(Boolean) : [];
  const crumbs = ["Hub", ...parts];
  $("#breadcrumb").innerHTML = crumbs.map((p, i) => `<button data-idx="${i}">${p}</button>${i < crumbs.length - 1 ? "<span>/</span>" : ""}`).join("");
  $("#breadcrumb").querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => { appState.path = parts.slice(0, parseInt(btn.dataset.idx, 10)).join("/"); appState.selectedPath = null; loadExplorer(); }));
}

function openPreview(path, name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) showLightbox(`/files/${encodeURIComponent(path)}`);
  else if (ext === "pdf") window.open(`/files/${encodeURIComponent(path)}`, "_blank");
  else if (["md", "txt", "py", "js", "css", "html", "json"].includes(ext)) openTextEditor(path, name);
  else window.open(`/files/${encodeURIComponent(path)}`, "_blank");
}

function showLightbox(src) {
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML = `<img src="${src}" alt=""><button class="close-btn">×</button>`;
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}

async function openTextEditor(path, name) {
  try {
    const data = await getJSON(`/api/explorer/file?path=${encodeURIComponent(path)}`);
    const modal = document.createElement("div"); modal.className = "modal show";
    modal.innerHTML = `<div class="modal-card wide"><div class="modal-header"><h3>${name}</h3><button class="close-modal">×</button></div><div class="modal-body"><textarea id="file-editor" rows="22" style="width:100%;font-family:monospace;background:var(--surface-2);color:var(--text);border:none;border-radius:12px;padding:12px">${escapeHtml(data.content)}</textarea><button id="save-file" class="btn-primary" style="margin-top:12px">Speichern</button></div></div>`;
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
    modal.querySelector("#save-file").addEventListener("click", async () => { const res = await postJSON("/api/explorer/file", { path, content: modal.querySelector("#file-editor").value }); flash(res.ok ? "Gespeichert" : "Fehler", res.ok ? "ok" : "error"); });
    document.body.appendChild(modal);
  } catch (e) { flash("Fehler", "error"); }
}

function escapeHtml(text) { return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

function iconForFile(name) {
  const ext = name.split(".").pop().toLowerCase();
  const map = { pdf: "📄", jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", webp: "🖼️", md: "📝", txt: "📝", py: "🐍", js: "📜", html: "🌐", css: "🎨", mp3: "🎵", mp4: "🎬" };
  return map[ext] || "📄";
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// --- Settings ---
function renderSettings(container) {
  const isDark = document.body.classList.contains("dark");
  container.innerHTML = `<div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div><h2 class="page-title">Settings</h2><div class="grid grid-2"><div class="card"><h3>🎨 Erscheinungsbild</h3><div class="setting-row"><label>Dark Mode</label><input type="checkbox" id="dark-toggle" ${isDark ? "checked" : ""}></div></div><div class="card"><h3>🔌 Integrationen</h3><div class="integration-list"><div class="integration-item ok"><span class="status-dot"></span> Notion</div><div class="integration-item ok"><span class="status-dot"></span> Open-Meteo Wetter</div><div class="integration-item ok"><span class="status-dot"></span> DeepSeek KI</div><div class="integration-item gap"><span class="status-dot"></span> Google Calendar (Stufe 2)</div></div></div><div class="card"><h3>⏱️ Auto-Logout</h3><div class="setting-row"><label>Nach Inaktivität abmelden</label></div><div style="display:flex;gap:6px"><input type="number" id="idle-minutes" min="1" max="240" value="${localStorage.getItem("hub_idle_minutes") || 30}" style="flex:1;padding:9px 11px;border-radius:10px;border:none;background:var(--surface-2);color:var(--text);font-size:14px"><button class="btn-secondary" id="idle-save">Speichern</button></div><p style="font-size:11px;color:var(--text-tertiary);margin:6px 0 0">60 Sekunden vor Ablauf erscheint eine Warnung.</p></div><div class="card"><h3>🔔 Push-Benachrichtigungen</h3><div class="setting-row"><label>Benachrichtigungen</label><input type="checkbox" id="push-toggle"></div><p style="font-size:11px;color:var(--text-tertiary);margin:6px 0 0">Erhalte Benachrichtigungen für Tasks &amp; Termine direkt auf dein Gerät.</p></div><div class="card" style="grid-column:1/-1"><h3>🔐 Sicherheit</h3><div class="setting-row"><label>Passwort ändern</label><button class="btn-secondary" id="toggle-pw">Ändern</button></div><form id="pw-form" style="display:none; margin-top:10px"><input type="password" id="current-pw" placeholder="Aktuelles Passwort" required><input type="password" id="new-pw" placeholder="Neues Passwort" required><button type="submit" class="btn-primary">Speichern</button><pre id="pw-result" style="margin-top:10px; word-break:break-all; font-size:12px; color:var(--text-tertiary)"></pre></form></div></div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  const toggle = $("#dark-toggle");
  toggle.addEventListener("change", () => { document.body.classList.toggle("dark", toggle.checked); document.body.classList.toggle("light", !toggle.checked); localStorage.setItem("hub_theme", toggle.checked ? "dark" : "light"); });
  $("#toggle-pw")?.addEventListener("click", () => { const form = $("#pw-form"); form.style.display = form.style.display === "none" ? "block" : "none"; });
  // Push notification toggle
  pushIsEnabled().then(enabled => {
    const pt = $("#push-toggle");
    if (pt) { pt.checked = enabled; pt.addEventListener("change", async () => {
      if (pt.checked) { await pushSubscribe(); }
      else { await pushUnsubscribe(); }
      pt.checked = await pushIsEnabled();
    });}
  });
  $("#pw-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await postJSON("/api/settings/password", { current: $("#current-pw").value, new: $("#new-pw").value });
    const out = $("#pw-result");
    if (res.ok) { out.textContent = `Neuer Hash:\n${res.hash}\n\nEintragen in .env: HUB_PASSWORD_HASH=${res.hash}`; flash("Hash generiert — .env anpassen!"); }
    else { out.textContent = res.error || "Fehler"; flash(res.error || "Fehler", "error"); }
  });
}

(function restoreTheme() {
  const saved = localStorage.getItem("hub_theme");
  if (saved === "light") document.body.classList.replace("dark", "light");
})();

// ===================== HUB v2.1 Features =====================

// --- Time-Tracking ---
function fmtDuration(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function loadTimer() {
  const body = $("#timer-body");
  if (!body) return;
  try {
    const data = await getJSON("/api/timetrack");
    appState.timer = data;
    renderTimerBody();
  } catch (e) { body.innerHTML = "<p class='empty-state'>Timer nicht verfügbar.</p>"; }
}

function renderTimerBody() {
  const body = $("#timer-body");
  if (!body || !appState.timer) return;
  const t = appState.timer;
  const secs = t.running ? t.current_seconds : t.elapsed_seconds;
  body.innerHTML = `
    <div class="timer-display ${t.running ? "running" : ""}" id="timer-display">${fmtDuration(secs)}</div>
    <div class="timer-meta">${t.project ? `${escapeHtml(t.project)}${t.task_title ? " · " + escapeHtml(t.task_title) : ""}` : "Kein Timer aktiv"}</div>
    <div class="row" style="display:flex;gap:6px;margin-top:10px">
      <button class="btn-primary timer-toggle" style="flex:1">${t.running ? "■ Stopp" : "▶ Start"}</button>
    </div>`;
  body.querySelector(".timer-toggle").addEventListener("click", async () => {
    if (appState.timer.running) {
      const res = await postJSON("/api/timetrack/stop", {});
      if (res.ok) flash("⏱ Timer gestoppt");
    } else {
      const name = promptWithFallback("Was arbeitest du gerade?", t.project || "");
      if (name === null) return;
      const res = await postJSON("/api/timetrack/start", { project: name, task: "" });
      if (res.ok) flash(`⏱ Timer gestartet: ${name}`);
    }
    loadTimer();
  });
}

function startTimerTick() {
  setInterval(() => {
    const el = $("#timer-display");
    if (el && appState.timer && appState.timer.running) {
      appState.timer.current_seconds = (appState.timer.current_seconds || 0) + 1;
      el.textContent = fmtDuration(appState.timer.current_seconds);
    }
  }, 1000);
}

// --- Wasser / Health (Home-Karte) ---
async function loadWater() {
  const el = $("#water-body");
  if (!el) return;
  try {
    const data = await getJSON("/api/health");
    const pct = Math.min(100, Math.round(data.water / data.goal * 100));
    el.innerHTML = `
      <div class="water-display small ${data.done ? "done" : ""}">${data.water.toFixed(2)}L <span class="water-goal">/ ${data.goal.toFixed(2)}L</span></div>
      <div class="progress-bar water ${data.done ? "done" : ""}"><div style="width:${pct}%"></div></div>
      <div class="progress-text">${data.done ? "🎉 Ziel erreicht! 🎉" : `${data.remaining.toFixed(2)}L noch`}</div>
      <div class="row" style="display:flex;gap:6px;margin-top:8px">
        <button class="btn-secondary water-add" data-a="0.25" style="flex:1">+0.25L</button>
        <button class="btn-secondary water-add" data-a="0.5" style="flex:1">+0.5L</button>
        <button class="btn-secondary" id="water-open" style="flex:1">Details</button>
      </div>`;
    el.querySelectorAll(".water-add").forEach((b) => b.addEventListener("click", async () => {
      const res = await postJSON("/api/health/water", { amount: parseFloat(b.dataset.a) });
      if (res.ok) { flash("💧 +" + b.dataset.a + "L"); loadWater(); if (appState.page === "health") renderHealth($("#content")); }
    }));
    $("#water-open").addEventListener("click", () => navigate("health"));
  } catch (e) { el.innerHTML = "<p class='empty-state'>Wasser nicht verfügbar.</p>"; }
}

// --- Notizen / Wiki ---
async function renderNotes(container) {
  container.innerHTML = `
    <div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div>
    <h2 class="page-title">📝 Notizen</h2>
    <div class="note-toolbar">
      <input type="text" id="note-search" placeholder="Notizen durchsuchen..." autocomplete="off">
      <button class="btn-primary" id="note-new">+ Neu</button>
    </div>
    <div class="task-list" id="note-list">${skeletonList(5)}</div>`;
  $("#back-home").addEventListener("click", () => navigate("home"));
  $("#note-new").addEventListener("click", () => openNoteEditor(null));
  let debounce;
  $("#note-search").addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => loadNotes(), 250);
  });
  await loadNotes();
  initPullToRefresh(() => loadNotes());
}

async function loadNotes() {
  const list = $("#note-list");
  if (!list) return;
  const q = $("#note-search")?.value.trim() || "";
  try {
    const notes = await getJSON(`/api/notes?q=${encodeURIComponent(q)}`);
    appState.notes = notes;
    list.innerHTML = notes.length ? notes.map(noteCard).join("") : "<p class='empty-state'>Keine Notizen. 📝</p>";
    list.querySelectorAll(".note-card").forEach((card) => {
      const note = () => appState.notes.find((n) => n.id === card.dataset.id);
      card.addEventListener("click", () => { const n = note(); if (n) openNoteEditor(n); });
      card.querySelector(".pin-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        const n = note(); if (!n) return;
        const res = await patchJSON(`/api/notes/${n.id}`, { pinned: !n.pinned });
        if (res.ok) { flash(n.pinned ? "Nicht mehr gepinnt" : "📌 Gepinnt"); loadNotes(); }
      });
      card.querySelector(".del-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        const n = note(); if (!n) return;
        const ok = await confirmSheet(`Notiz „${n.title}“ löschen?`);
        if (!ok) return;
        const res = await deleteReq(`/api/notes/${n.id}`);
        flash(res.ok ? "Notiz gelöscht" : "Fehler", res.ok ? "ok" : "error");
        loadNotes();
      });
    });
  } catch (e) { list.innerHTML = "<p class='empty-state'>Fehler beim Laden.</p>"; }
}

function noteCard(n) {
  const date = new Date(n.updated_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const preview = (n.content || "").replace(/\n/g, " ").slice(0, 110);
  return `<div class="note-card ${n.pinned ? "pinned" : ""}" data-id="${n.id}">
    <div class="note-head">
      <div class="note-title">${n.pinned ? "📌 " : ""}${escapeHtml(n.title)}</div>
      <div class="note-actions"><button class="pin-btn" title="Pinnen">${n.pinned ? "📌" : "📍"}</button><button class="del-btn" title="Löschen">🗑</button></div>
    </div>
    ${preview ? `<div class="note-preview">${escapeHtml(preview)}</div>` : ""}
    <div class="note-foot"><span class="badge">${escapeHtml(n.project || "Persoenlich")}</span><span class="note-date">${date}</span></div>
  </div>`;
}

function openNoteEditor(note) {
  const projects = ["Persoenlich", "Party Arena", "KI-Videos", "Hochzeit", "Server", "Klavier-Coach"];
  const modal = document.createElement("div");
  modal.className = "modal show";
  modal.innerHTML = `<div class="modal-card wide">
    <div class="modal-header"><h3>${note ? "✏️ Notiz bearbeiten" : "📝 Neue Notiz"}</h3><button class="close-modal">×</button></div>
    <div class="modal-body">
      <input type="text" id="note-title" placeholder="Titel" value="${escapeHtml(note?.title || '')}" maxlength="120">
      <select id="note-project">${projects.map((p) => `<option ${note && note.project === p ? "selected" : ""}>${p}</option>`).join("")}</select>
      <textarea id="note-content" rows="14" placeholder="Inhalt (Markdown)...">${escapeHtml(note?.content || '')}</textarea>
      <button id="note-save" class="btn-primary" style="width:100%">💾 Speichern</button>
    </div></div>`;
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
  modal.querySelector("#note-save").addEventListener("click", async () => {
    const title = modal.querySelector("#note-title").value.trim();
    if (!title) return flash("Titel fehlt", "error");
    const body = { title, project: modal.querySelector("#note-project").value, content: modal.querySelector("#note-content").value };
    const res = note ? await patchJSON(`/api/notes/${note.id}`, body) : await postJSON("/api/notes", body);
    flash(res.ok ? "Gespeichert" : (res.error || "Fehler"), res.ok ? "ok" : "error");
    if (res.ok) { modal.remove(); loadNotes(); }
  });
  document.body.appendChild(modal);
  modal.querySelector("#note-title").focus();
}

// --- Monatsbudget ---
async function renderBudget(container) {
  container.innerHTML = `
    <div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div>
    <h2 class="page-title">💰 Budget</h2>
    <div class="card" id="budget-summary">${skeletonCard()}</div>
    <div class="grid grid-2" id="budget-cats" style="margin-top:10px">${skeletonGrid(4)}</div>
    <div class="card" style="margin-top:10px">
      <h3>💸 Ausgabe erfassen</h3>
      <form id="expense-form" class="budget-form">
        <select id="exp-category" required></select>
        <input type="number" id="exp-amount" placeholder="Betrag €" step="0.01" min="0.01" required>
        <input type="text" id="exp-note" placeholder="Notiz (optional)">
        <button type="submit" class="btn-primary">Hinzufügen</button>
      </form>
    </div>
    <div class="card" style="margin-top:10px">
      <h3>➕ Kategorie anlegen</h3>
      <form id="cat-form" class="budget-form">
        <input type="text" id="cat-name" placeholder="Name z.B. Lebensmittel" required>
        <input type="number" id="cat-limit" placeholder="Monatslimit €" step="1" min="0">
        <button type="submit" class="btn-secondary">Anlegen</button>
      </form>
    </div>`;
  $("#back-home").addEventListener("click", () => navigate("home"));
  $("#expense-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await postJSON("/api/budget/expenses", {
      category: $("#exp-category").value,
      amount: parseFloat($("#exp-amount").value) || 0,
      note: $("#exp-note").value.trim(),
    });
    flash(res.ok ? "Ausgabe erfasst" : (res.error || "Fehler"), res.ok ? "ok" : "error");
    if (res.ok) { $("#expense-form").reset(); loadBudget(); }
  });
  $("#cat-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await postJSON("/api/budget/categories", {
      name: $("#cat-name").value.trim(),
      limit: parseFloat($("#cat-limit").value) || 0,
    });
    flash(res.ok ? "Kategorie angelegt" : (res.error || "Fehler"), res.ok ? "ok" : "error");
    if (res.ok) { $("#cat-form").reset(); loadBudget(); }
  });
  await loadBudget();
  initPullToRefresh(() => loadBudget());
}

async function loadBudget() {
  const summary = $("#budget-summary"), cats = $("#budget-cats");
  if (!summary) return;
  try {
    const data = await getJSON("/api/budget");
    const pct = data.total_limit > 0 ? Math.min(100, Math.round(data.total_spent / data.total_limit * 100)) : 0;
    summary.innerHTML = `<h3>Monat ${data.month}</h3>
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div style="font-size:30px;font-weight:700">${data.total_spent.toFixed(2)}€</div>
        <div style="color:var(--text-tertiary);font-size:13px">von ${data.total_limit.toFixed(2)}€</div>
      </div>
      <div class="progress-bar big ${data.over ? "over" : ""}"><div style="width:${pct}%"></div></div>
      <div class="progress-text">${data.over ? "⚠️ Über Budget" : `${data.remaining.toFixed(2)}€ übrig`}</div>`;
    cats.innerHTML = Object.entries(data.categories).length
      ? Object.entries(data.categories).map(([name, c]) => {
          const p = c.limit > 0 ? Math.min(100, Math.round(c.spent / c.limit * 100)) : 0;
          return `<div class="card budget-cat ${c.limit > 0 && c.spent > c.limit ? "over" : ""}" data-cat="${escapeHtml(name)}">
            <div class="budget-cat-head"><span class="name">${escapeHtml(name)}</span><button class="btn-secondary limit-btn">Limit</button></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin:6px 0 4px">
              <span style="color:var(--text-secondary)">${c.spent.toFixed(2)}€</span><span style="color:var(--text-tertiary)">${c.limit > 0 ? "von " + c.limit.toFixed(2) + "€" : "kein Limit"}</span>
            </div>
            <div class="progress-bar ${c.limit > 0 && c.spent > c.limit ? "over" : ""}"><div style="width:${p}%"></div></div>
          </div>`;
        }).join("")
      : "<p class='empty-state'>Noch keine Kategorien. Lege unten eine an.</p>";
    const sel = $("#exp-category");
    sel.innerHTML = Object.keys(data.categories).map((n) => `<option>${escapeHtml(n)}</option>`).join("");
    cats.querySelectorAll(".limit-btn").forEach((btn) => btn.addEventListener("click", async () => {
      const name = btn.closest(".budget-cat").dataset.cat;
      const v = promptWithFallback(`Monatslimit für ${name} (€):`, data.categories[name]?.limit || "");
      if (v === null) return;
      const res = await patchJSON(`/api/budget/categories/${encodeURIComponent(name)}`, { limit: parseFloat(v) || 0 });
      flash(res.ok ? "Limit gesetzt" : (res.error || "Fehler"), res.ok ? "ok" : "error");
      if (res.ok) loadBudget();
    }));
  } catch (e) { summary.innerHTML = "<p class='empty-state'>Budget nicht verfügbar.</p>"; }
}

// --- Gesundheit / Wasser ---
async function renderHealth(container) {
  container.innerHTML = `
    <div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div>
    <h2 class="page-title">💧 Gesundheit</h2>
    <div class="card" id="water-card-page">${skeletonCard()}</div>
    <div class="card" style="margin-top:10px">
      <h3>😴 Schlaf</h3>
      <form id="sleep-form" class="budget-form">
        <input type="date" id="sleep-date">
        <input type="number" id="sleep-hours" placeholder="Stunden (z.B. 7.5)" step="0.5" min="0" max="24" required>
        <button type="submit" class="btn-primary">Eintragen</button>
      </form>
      <div id="sleep-week" style="margin-top:10px">${skeletonList(7)}</div>
    </div>`;
  $("#back-home").addEventListener("click", () => navigate("home"));
  const dateInput = $("#sleep-date");
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  dateInput.value = yest.toISOString().slice(0, 10);
  $("#sleep-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await postJSON("/api/health/sleep", { hours: parseFloat($("#sleep-hours").value) || 0, date: dateInput.value });
    flash(res.ok ? "Schlaf eingetragen" : (res.error || "Fehler"), res.ok ? "ok" : "error");
    if (res.ok) { $("#sleep-hours").value = ""; loadHealth(); }
  });
  await loadHealth();
  initPullToRefresh(() => loadHealth());
}

async function loadHealth() {
  const el = $("#water-card-page");
  if (!el) return;
  try {
    const data = await getJSON("/api/health");
    const pct = Math.min(100, Math.round(data.water / data.goal * 100));
    el.innerHTML = `<h3>💧 Wasser</h3>
      <div class="water-display ${data.done ? "done" : ""}">${data.water.toFixed(2)}L <span class="water-goal">/ ${data.goal.toFixed(2)}L</span></div>
      <div class="progress-bar water ${data.done ? "done" : ""}"><div style="width:${pct}%"></div></div>
      <div class="progress-text">${data.done ? "🎉 Ziel erreicht! 🎉" : `${data.remaining.toFixed(2)}L noch`}</div>
      <div class="row" style="display:flex;gap:6px;margin-top:10px">
        <button class="btn-secondary water-add" data-a="0.25" style="flex:1">+0.25L</button>
        <button class="btn-secondary water-add" data-a="0.5" style="flex:1">+0.5L</button>
        <button class="btn-secondary" id="water-goal-btn" style="flex:1">Ziel</button>
      </div>
      <div id="water-week" style="margin-top:12px"></div>`;
    el.querySelectorAll(".water-add").forEach((b) => b.addEventListener("click", async () => {
      const res = await postJSON("/api/health/water", { amount: parseFloat(b.dataset.a) });
      if (res.ok) { flash("💧 +" + b.dataset.a + "L"); loadHealth(); if (appState.page === "home") loadWater(); }
    }));
    $("#water-goal-btn").addEventListener("click", async () => {
      const v = promptWithFallback("Tagesziel (Liter):", data.goal);
      if (v === null) return;
      const res = await patchJSON("/api/health/goal", { goal: parseFloat(v) || 2 });
      flash(res.ok ? "Ziel gesetzt" : (res.error || "Fehler"), res.ok ? "ok" : "error");
      if (res.ok) { loadHealth(); if (appState.page === "home") loadWater(); }
    });
    const ww = Object.entries(data.week_water);
    const max = Math.max(...ww.map(([, v]) => v), data.goal, 0.1);
    $("#water-week").innerHTML = `<div class="bar-chart">${ww.map(([d, v]) => `<div class="bar-col"><div class="bar" style="height:${Math.max(3, Math.round(v / max * 56))}px"></div><div class="bar-label">${d.slice(8)}</div></div>`).join("")}</div>`;
    const sleepWeek = $("#sleep-week");
    if (sleepWeek) {
      const sw = Object.entries(data.week_sleep);
      const sleepMax = Math.max(...sw.map(([, v]) => v), 8, 0.1);
      sleepWeek.innerHTML = `<div class="bar-chart sleep">${sw.map(([d, v]) => `<div class="bar-col"><div class="bar ${v > 0 ? "has" : ""}" style="height:${Math.max(3, Math.round(v / sleepMax * 56))}px"></div><div class="bar-label">${d.slice(8)}</div><div class="bar-value">${v > 0 ? v.toFixed(1) : "–"}</div></div>`).join("")}</div>`;
    }
  } catch (e) { el.innerHTML = "<p class='empty-state'>Health nicht verfügbar.</p>"; }
}

// --- Lydia-Modus (einfache UI für Lydia) ---
function renderLydia(container) {
  container.innerHTML = `
    <div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div>
    <h2 class="page-title">👸 Lydia's Bereich</h2>
    <div class="lydia-grid">
      <div class="lydia-card" id="lydia-weather"><h3>🌤️ Wetter</h3><div id="lydia-weather-content">${skeletonCard()}</div></div>
      <div class="lydia-card" id="lydia-events"><h3>📅 Termine</h3><div id="lydia-events-content">${skeletonList(3)}</div></div>
      <div class="lydia-card" id="lydia-shopping"><h3>🛒 Einkauf</h3><div id="lydia-shopping-content">${skeletonList(3)}</div></div>
      <div class="lydia-card" id="lydia-recipes"><h3>🍳 Rezepte</h3><div id="lydia-recipes-content">${skeletonList(3)}</div><button class="btn-primary" id="lydia-add-recipe" style="margin-top:8px;width:100%">＋ Rezept</button></div>
    </div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  loadLydiaWeather();
  loadLydiaEvents();
  loadLydiaShopping();
  loadLydiaRecipes();
  $("#lydia-add-recipe")?.addEventListener("click", () => {
    const title = promptWithFallback("Name des Rezepts:");
    if (!title) return;
    const ingredients = promptWithFallback("Zutaten (durch Komma getrennt):");
    if (ingredients === null) return;
    const instructions = promptWithFallback("Zubereitung:");
    if (instructions === null) return;
    postJSON("/api/recipes", { title, ingredients, instructions }).then(() => loadLydiaRecipes());
  });
  initPullToRefresh(() => { loadLydiaWeather(); loadLydiaEvents(); loadLydiaShopping(); loadLydiaRecipes(); });
}

async function loadLydiaWeather() {
  const el = $("#lydia-weather-content"); if (!el) return;
  try {
    const data = await getJSON("/api/weather");
    if (!data.ok) { el.innerHTML = "<p class='empty-state'>Nicht verfügbar</p>"; return; }
    el.innerHTML = `<div class="lydia-temp">${data.current.temp}°C</div><div style="font-size:14px">${data.current.code === 0 ? '☀️' : '☁️'} Luft: ${data.current.humidity}%</div>`;
  } catch (e) { el.innerHTML = "<p class='empty-state'>Fehler</p>"; }
}

async function loadLydiaEvents() {
  const el = $("#lydia-events-content"); if (!el) return;
  try {
    const data = await getJSON("/api/calendar");
    const events = data.today || [];
    el.innerHTML = events.length ? events.slice(0, 3).map(e => `<div class="lydia-item"><span>${e.title}</span><span style="color:var(--text-secondary)">${new Date(e.start).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</span></div>`).join("") : "<p class='empty-state'>Keine Termine</p>";
  } catch (e) { el.innerHTML = "<p class='empty-state'>Fehler</p>"; }
}

async function loadLydiaShopping() {
  const el = $("#lydia-shopping-content"); if (!el) return;
  try {
    const data = await getJSON("/api/lists");
    const items = (data.Einkauf || []);
    el.innerHTML = items.length ? items.slice(0, 5).map(i => `<div class="lydia-item"><span>${escapeHtml(i.text)}</span></div>`).join("") : "<p class='empty-state'>Einkaufsliste leer</p>";
  } catch (e) { el.innerHTML = "<p class='empty-state'>Fehler</p>"; }
}

async function loadLydiaRecipes() {
  const el = $("#lydia-recipes-content"); if (!el) return;
  try {
    const recipes = await getJSON("/api/recipes");
    el.innerHTML = recipes.length ? recipes.map(r => `<div class="lydia-item"><div><strong>${escapeHtml(r.title)}</strong></div><div style="font-size:11px;color:var(--text-secondary)">${escapeHtml((r.ingredients || '').slice(0, 60))}${(r.ingredients||'').length > 60 ? '…' : ''}</div></div>`).join("") : "<p class='empty-state'>Noch keine Rezepte</p>";
  } catch (e) { el.innerHTML = "<p class='empty-state'>Fehler</p>"; }
}

// --- Eisenhower-Matrix ---
async function renderMatrixView() {
  await loadPriosFromServer();
  const panel = $("#matrix-panel");
  if (!panel) return;
  try {
    let url = "/api/tasks";
    const knownStatus = ["Offen", "Erledigt", "In Arbeit", "Blockiert"];
    if (knownStatus.includes(appState.taskFilter) && appState.taskFilter !== "all") url += `?status=${encodeURIComponent(appState.taskFilter)}`;
    else if (appState.taskFilter && appState.taskFilter !== "all") url += `?project=${encodeURIComponent(appState.taskFilter)}`;
    const tasks = await getJSON(url);
    renderMatrix(panel, tasks);
  } catch (e) { panel.innerHTML = "<p class='empty-state'>Fehler beim Laden.</p>"; }
}

function renderMatrix(container, tasks) {
  const prio = getTaskPrios();
  const quads = {
    P1: { title: "Wichtig & dringend", icon: "🔴", cls: "q1", tasks: [] },
    P2: { title: "Wichtig, nicht dringend", icon: "🟠", cls: "q2", tasks: [] },
    P3: { title: "Nicht wichtig, dringend", icon: "🟡", cls: "q3", tasks: [] },
    P4: { title: "Weder wichtig noch dringend", icon: "🟢", cls: "q4", tasks: [] },
  };
  const none = [];
  tasks.forEach((t) => {
    const p = prio[t.id];
    if (p && quads[p]) quads[p].tasks.push(t);
    else none.push(t);
  });
  container.innerHTML = `
    <div class="matrix-grid">
      ${Object.values(quads).map((q) => `
        <div class="matrix-quad ${q.cls}">
          <div class="matrix-head">${q.icon} ${q.title} <span class="count">${q.tasks.length}</span></div>
          <div class="matrix-tasks">${q.tasks.length ? q.tasks.map(taskRow).join("") : "<p class='empty-state'>Leer</p>"}</div>
        </div>`).join("")}
    </div>
    ${none.length ? `<div class="card" style="margin-top:12px"><h3>Ohne Priorität — Badge antippen zum Zuweisen (P1-P4)</h3><div class="task-list">${none.map(taskRow).join("")}</div></div>` : ""}`;
  const reload = () => { if (appState.page === "tasks") renderTasks($("#content")); };
  bindTaskCheckboxes(container, reload);
  initSwipe(container, reload);
}

// --- Auto-Logout ---
function initIdleLogout() {
  const events = ["click", "touchstart", "keydown", "mousemove", "scroll"];
  let timer = null, warned = false;
  const minutes = () => parseFloat(localStorage.getItem("hub_idle_minutes") || "30") || 30;
  const reset = () => {
    warned = false;
    removeIdleBanner();
    if (timer) clearTimeout(timer);
    const ms = Math.max(1, minutes()) * 60000;
    if (ms <= 60000) return; // unter 1 Minute: kein Auto-Logout
    timer = setTimeout(() => {
      warned = true;
      showIdleBanner(minutes());
      timer = setTimeout(() => { window.location.href = "/logout"; }, 60000);
    }, ms - 60000);
  };
  events.forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
  reset();
  window.hubIdleReset = reset;
}

function showIdleBanner(minutes) {
  if ($("#idle-banner")) return;
  const b = document.createElement("div");
  b.className = "idle-banner";
  b.id = "idle-banner";
  b.innerHTML = `<span>⏳ ${minutes} Min. inaktiv — Abmeldung in 60s</span><button id="idle-stay">Weiter arbeiten</button>`;
  document.body.appendChild(b);
  $("#idle-stay").addEventListener("click", () => { removeIdleBanner(); });
}

function removeIdleBanner() {
  const b = $("#idle-banner");
  if (b) b.remove();
}

// --- Hermes Chats (Multi-Thread) ---
let chatThreadsCache = [];
let chatSending = false;

function chatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 1) return "Gestern";
    if (diffDays < 7) return d.toLocaleDateString("de-DE", { weekday: "short" });
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  } catch (e) { return ""; }
}

async function renderChat(container) {
  container.innerHTML = `
    <div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div>
    <h2 class="page-title">💬 Hermes Chats</h2>
    <input type="search" class="chat-search" id="chat-search" placeholder="Chats durchsuchen..." autocomplete="off">
    <div class="chat-actions">
      <button class="btn-primary" id="chat-new">＋ Neuer Chat</button>
      <select class="chat-project-select" id="chat-project-select" aria-label="Chat zum Projekt"><option value="">💼 Chat zum Projekt...</option></select>
    </div>
    <div class="chat-thread-list" id="chat-thread-list">${skeletonList(5)}</div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  $("#chat-search")?.addEventListener("input", (e) => filterChatThreads(e.target.value));
  $("#chat-new")?.addEventListener("click", async () => {
    const res = await postJSON("/api/chats", { title: "Allgemein" });
    if (res && res.id) { appState.chatThreadId = res.id; navigate("chatthread"); }
    else flash(res?.error || "Chat konnte nicht erstellt werden", "error");
  });
  $("#chat-project-select")?.addEventListener("focus", loadChatProjectOptions);
  $("#chat-project-select")?.addEventListener("change", async (e) => {
    const name = e.target.value;
    e.target.value = "";
    if (!name) return;
    await openOrCreateProjectChat(name);
  });
  initPullToRefresh(() => loadChatThreads());
  await loadChatThreads();
  loadChatProjectOptions();
}

async function loadChatProjectOptions() {
  const sel = $("#chat-project-select");
  if (!sel || sel.dataset.loaded) return;
  try {
    const projects = await getJSON("/api/projects");
    sel.dataset.loaded = "1";
    sel.innerHTML = `<option value="">💼 Chat zum Projekt...</option>${projects.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.icon || "💼")} ${escapeHtml(p.name)}</option>`).join("")}`;
  } catch (e) { /* Projekte optional */ }
}

async function loadChatThreads() {
  const list = $("#chat-thread-list");
  if (!list) return;
  try {
    chatThreadsCache = await getJSON("/api/chats");
    renderChatThreadList(list, chatThreadsCache, $("#chat-search")?.value || "");
  } catch (e) {
    list.innerHTML = "<p class='empty-state'>Chats konnten nicht geladen werden.</p>";
  }
}

function filterChatThreads(q) {
  const list = $("#chat-thread-list");
  if (!list) return;
  renderChatThreadList(list, chatThreadsCache, q);
}

function renderChatThreadList(list, threads, q) {
  const query = (q || "").trim().toLowerCase();
  const filtered = query
    ? threads.filter((t) => ((t.title || "") + " " + (t.project || "")).toLowerCase().includes(query))
    : threads;
  if (!filtered.length) {
    list.innerHTML = `<div class="chat-empty"><div class="emoji">💬</div><div>${query ? "Keine Chats gefunden." : "Noch keine Chats. Starte dein erstes Gespräch mit Hermes!"}</div><button class="btn-primary" id="chat-empty-new">＋ Neuen Chat starten</button></div>`;
    $("#chat-empty-new")?.addEventListener("click", async () => {
      const res = await postJSON("/api/chats", { title: "Allgemein" });
      if (res && res.id) { appState.chatThreadId = res.id; navigate("chatthread"); }
    });
    return;
  }
  list.innerHTML = filtered.map((t) => `
    <div class="chat-thread-card" data-id="${escapeHtml(t.id)}">
      <div class="chat-thread-main">
        <div class="chat-thread-title">${escapeHtml(t.title)}</div>
        <div class="chat-thread-preview">${escapeHtml(t.last_preview || "Noch keine Nachrichten")}</div>
      </div>
      <div class="chat-thread-meta">
        ${t.project ? `<span class="chat-project-badge">${escapeHtml(t.project)}</span>` : ""}
        <span class="chat-thread-time">${chatTime(t.updated_at)}</span>
        <span class="chat-thread-count">${t.message_count || 0} 💬</span>
      </div>
      <button class="chat-thread-menu" aria-label="Chat-Menü">⋯</button>
    </div>`).join("");
  list.querySelectorAll(".chat-thread-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".chat-thread-menu")) return;
      appState.chatThreadId = card.dataset.id;
      navigate("chatthread");
    });
    card.querySelector(".chat-thread-menu").addEventListener("click", async () => {
      const title = card.querySelector(".chat-thread-title").textContent;
      const choice = await showActionSheet(title, [
        { label: "✏️ Umbenennen", value: "rename" },
        { label: "Löschen", value: "delete", destructive: true },
        { label: "Abbrechen", value: "", cancel: true },
      ]);
      if (choice === "rename") {
        const name = promptWithFallback("Neuer Name:", title);
        if (name === null || !name.trim()) return;
        const res = await patchJSON(`/api/chats/${encodeURIComponent(card.dataset.id)}`, { title: name.trim() });
        flash(res.ok ? "Umbenannt" : (res.error || "Fehler"), res.ok ? "ok" : "error");
        if (res.ok) loadChatThreads();
      } else if (choice === "delete") {
        const ok = await confirmSheet(`Chat "${title}" wirklich löschen?`);
        if (!ok) return;
        const res = await deleteReq(`/api/chats/${encodeURIComponent(card.dataset.id)}`);
        flash(res.ok ? "Chat gelöscht" : (res.error || "Fehler"), res.ok ? "ok" : "error");
        if (res.ok) loadChatThreads();
      }
    });
  });
}

async function openOrCreateProjectChat(name) {
  try {
    const threads = await getJSON("/api/chats");
    const existing = threads.find((t) => t.project === name);
    if (existing) { appState.chatThreadId = existing.id; navigate("chatthread"); return; }
    const res = await postJSON("/api/chats", { title: name, project: name });
    if (res && res.id) { appState.chatThreadId = res.id; navigate("chatthread"); }
    else flash(res?.error || "Chat konnte nicht erstellt werden", "error");
  } catch (e) { flash("Fehler beim Öffnen des Projekt-Chats", "error"); }
}

function renderMsgBubble(m) {
  const cls = m.role === "user" ? "user" : "hermes";
  return `<div class="msg-bubble ${cls}">${escapeHtml(m.content)}<div class="msg-meta">${chatTime(m.ts)}</div></div>`;
}

async function renderChatThread(container) {
  const id = appState.chatThreadId;
  if (!id) { navigate("chat"); return; }
  container.innerHTML = `
    <div class="chat-view">
      <div class="chat-view-header">
        <button class="btn-secondary chat-back" id="chat-back" aria-label="Zurück">←</button>
        <div class="chat-view-title" id="chat-view-title">…</div>
        <button class="chat-thread-menu" id="chat-thread-menu" aria-label="Chat-Menü">⋯</button>
      </div>
      <div class="chat-msgs" id="chat-msgs">${skeletonList(6)}</div>
      <div class="chat-composer">
        <textarea id="chat-msg-input" rows="1" placeholder="Nachricht an Hermes..." autocomplete="off"></textarea>
        <button id="chat-send" aria-label="Senden">➤</button>
      </div>
    </div>`;
  $("#chat-back")?.addEventListener("click", () => navigate("chat"));
  $("#chat-thread-menu")?.addEventListener("click", openThreadMenu);
  const input = $("#chat-msg-input");
  const send = $("#chat-send");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });
  send.addEventListener("click", sendChatMessage);
  try {
    const thread = await getJSON(`/api/chats/${encodeURIComponent(id)}`);
    const titleEl = $("#chat-view-title");
    if (titleEl) {
      titleEl.textContent = thread.title || "Chat";
      if (thread.project) {
        const badge = document.createElement("span");
        badge.className = "chat-project-badge";
        badge.textContent = thread.project;
        titleEl.appendChild(badge);
      }
    }
    const msgs = $("#chat-msgs");
    if (msgs) {
      msgs.innerHTML = (thread.messages || []).map(renderMsgBubble).join("") || "<p class='empty-state' id='chat-empty-state'>Noch keine Nachrichten. Frag Hermes etwas!</p>";
      msgs.scrollTop = msgs.scrollHeight;
    }
  } catch (e) {
    const msgs = $("#chat-msgs");
    if (msgs) msgs.innerHTML = "<p class='empty-state'>Chat konnte nicht geladen werden.</p>";
  }
}

async function openThreadMenu() {
  const title = $("#chat-view-title")?.textContent || "Chat";
  const choice = await showActionSheet(title, [
    { label: "✏️ Umbenennen", value: "rename" },
    { label: "Löschen", value: "delete", destructive: true },
    { label: "Abbrechen", value: "", cancel: true },
  ]);
  if (choice === "rename") {
    const name = promptWithFallback("Neuer Name:", title);
    if (name === null || !name.trim()) return;
    const res = await patchJSON(`/api/chats/${encodeURIComponent(appState.chatThreadId)}`, { title: name.trim() });
    flash(res.ok ? "Umbenannt" : (res.error || "Fehler"), res.ok ? "ok" : "error");
    if (res.ok) $("#chat-view-title")?.replaceChildren(document.createTextNode(name.trim()));
  } else if (choice === "delete") {
    const ok = await confirmSheet(`Chat "${title}" wirklich löschen?`);
    if (!ok) return;
    const res = await deleteReq(`/api/chats/${encodeURIComponent(appState.chatThreadId)}`);
    flash(res.ok ? "Chat gelöscht" : (res.error || "Fehler"), res.ok ? "ok" : "error");
    if (res.ok) navigate("chat");
  }
}

async function sendChatMessage() {
  if (chatSending) return;
  const input = $("#chat-msg-input");
  const msgs = $("#chat-msgs");
  if (!input || !msgs) return;
  const text = input.value.trim();
  if (!text) return;
  chatSending = true;
  input.value = "";
  input.style.height = "auto";
  input.disabled = true;
  $("#chat-send").disabled = true;
  // Empty-State entfernen (falls vorhanden)
  msgs.querySelector("#chat-empty-state")?.remove();
  // Optimistisch lokal anhängen, dann Antwort vom POST abwarten
  msgs.insertAdjacentHTML("beforeend", renderMsgBubble({ role: "user", content: text, ts: new Date().toISOString() }));
  const typing = document.createElement("div");
  typing.className = "typing-indicator";
  typing.innerHTML = "<span></span><span></span><span></span>";
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  // Kontext sammeln (welche Seite, welches Projekt)
  const context = { page: appState.page };
  if (appState.page === "project" && appState.projectDetail) {
    context.project = document.querySelector("#pd-title")?.textContent || "";
  } else if ((appState.page === "chat" || appState.page === "chatthread") && appState.chatThreadId) {
    // Thread-Infos für Kontext laden
    try {
      const threadRes = await fetch(`/api/chats/${encodeURIComponent(appState.chatThreadId)}`);
      const thread = await threadRes.json();
      if (thread && thread.project) context.project = thread.project;
    } catch (_) {}
  }

  try {
    const res = await postJSON(`/api/chats/${encodeURIComponent(appState.chatThreadId)}/messages`, { content: text, context });
    typing.remove();
    if (res && res.ok && res.assistant) {
      msgs.insertAdjacentHTML("beforeend", renderMsgBubble(res.assistant));
    } else {
      // Transiente Fehlerbubble mit Retry — wird NICHT persistiert
      const errDiv = document.createElement("div");
      errDiv.className = "msg-bubble hermes msg-error";
      errDiv.innerHTML = `<div>⚠️ Hermes ist gerade nicht erreichbar.</div><button class="btn-secondary msg-retry">↻ Erneut versuchen</button>`;
      errDiv.querySelector(".msg-retry").addEventListener("click", async () => {
        errDiv.remove();
        await sendChatMessage();
      });
      msgs.appendChild(errDiv);
    }
  } catch (e) {
    typing.remove();
    const errDiv = document.createElement("div");
    errDiv.className = "msg-bubble hermes msg-error";
    errDiv.innerHTML = `<div>⚠️ Antwort fehlgeschlagen.</div><button class="btn-secondary msg-retry">↻ Erneut versuchen</button>`;
    errDiv.querySelector(".msg-retry").addEventListener("click", async () => {
      errDiv.remove();
      await sendChatMessage();
    });
    msgs.appendChild(errDiv);
  }
  msgs.scrollTop = msgs.scrollHeight;
  chatSending = false;
  input.disabled = false;
  $("#chat-send").disabled = false;
  input.focus();
}

// --- Push Notifications ---

async function pushCanSubscribe() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

async function pushSubscribe() {
  if (!await pushCanSubscribe()) return false;
  const reg = await navigator.serviceWorker.ready;
  const key = (await getJSON('/api/push/public_key')).key;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(key)
  });
  const res = await postJSON('/api/push/subscribe', { subscription: sub.toJSON() });
  localStorage.setItem('hub_push_enabled', '1');
  return res.ok;
}

async function pushUnsubscribe() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  await postJSON('/api/push/unsubscribe', { endpoint: sub.endpoint });
  await sub.unsubscribe();
  localStorage.setItem('hub_push_enabled', '0');
  return true;
}

async function pushIsEnabled() {
  if (!await pushCanSubscribe()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

function urlB64ToUint8Array(base64) {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

document.addEventListener("DOMContentLoaded", init);
