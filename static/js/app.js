const currentPage = "{{ page }}";
let appState = { page: currentPage, projectFilter: null, taskFilter: "all", path: "", projectDetail: null, activeList: "Einkauf", explorerView: "grid" };
let socket = null;
let chatHistory = [];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const PAGES = {
  home: renderHome,
  projects: renderProjects,
  tasks: renderTasks,
  explorer: renderExplorer,
  settings: renderSettings,
  project: renderProjectDetail,
};

function init() {
  initNav();
  initSearch();
  initQuickAdd();
  initSocket();
  navigate(location.hash.slice(1) || currentPage || "home", false);
  window.addEventListener("hashchange", () => navigate(location.hash.slice(1), false));
}

function initNav() {
  const home = $("#homeBtn");
  if (home) home.addEventListener("click", (e) => { e.preventDefault(); navigate("home"); });
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
  const modal = $("#quickAddModal");
  if (!modal) return;
  const show = () => modal.classList.add("show");
  const hide = () => modal.classList.remove("show");
  $("#quickAdd")?.addEventListener("click", show);
  $("#fab")?.addEventListener("click", show);
  $(".close-modal")?.addEventListener("click", hide);
  modal.addEventListener("click", (e) => { if (e.target === modal) hide(); });
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
  appState.page = target;
  if (push && location.hash.slice(1) !== target) history.pushState(null, "", `#${target}`);
  const home = $("#homeBtn");
  if (home) home.classList.toggle("active", target === "home");
  const content = $("#content");
  content.innerHTML = "";
  (PAGES[target] || renderHome)(content);
  document.title = `HUB — ${target[0].toUpperCase()}${target.slice(1)}`;
}

async function getJSON(url) {
  const r = await fetch(url);
  if (r.status === 401) { window.location.href = "/login"; throw new Error("Nicht eingeloggt"); }
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function postJSON(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (r.status === 401) { window.location.href = "/login"; return { ok: false }; }
  return r.json().catch(() => ({ ok: false }));
}

async function patchJSON(url, body) {
  const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (r.status === 401) { window.location.href = "/login"; return { ok: false }; }
  return r.json().catch(() => ({ ok: false }));
}

async function deleteReq(url) {
  const r = await fetch(url, { method: "DELETE" });
  if (r.status === 401) { window.location.href = "/login"; return { ok: false }; }
  return r.json().catch(() => ({ ok: false }));
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

function appIcon(id, label) {
  return `<div class="app-icon" data-app="${id}"><img src="/static/images/apps/${id}.png" alt="${label}"><div class="label">${label}</div></div>`;
}

function bindAppClicks() {
  $$(".app-icon").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.app;
      if (id === "party-arena") window.open("https://performer-lang-governmental-uploaded.trycloudflare.com", "_blank");
      else if (id === "piano-coach") window.open("https://coach.danny-csepke.de", "_blank");
      else if (id === "projects") navigate("projects");
      else if (id === "todo") navigate("tasks");
      else if (id === "explorer") navigate("explorer");
      else if (id === "chat") $(".chat-widget")?.classList.add("expanded");
      else if (id === "settings") navigate("settings");
    });
  });
}

// --- Home ---
async function renderHome(container) {
  container.innerHTML = `
    <div class="app-grid">
      ${appIcon("party-arena", "Party Arena")}
      ${appIcon("piano-coach", "Klavier")}
      ${appIcon("projects", "Projekte")}
      ${appIcon("todo", "To-Do")}
      ${appIcon("explorer", "Explorer")}
      ${appIcon("chat", "Hermes")}
      ${appIcon("settings", "Settings")}
    </div>
    <h2 class="page-title">Übersicht</h2>
    <div class="grid grid-2">
      <div class="card" id="weather-card"><div class="loader"></div></div>
      <div class="card chat-widget">
        <div class="chat-header"><div class="chat-title">💬 Hermes Chat</div><button class="chat-close">×</button></div>
        <div class="chat-messages" id="chat-box"></div>
        <form class="chat-input" id="chat-form"><input type="text" id="chat-input" placeholder="Frage Hermes..." autocomplete="off"><button type="submit" class="btn-primary">➤</button></form>
      </div>
      <div class="card" id="calendar-card"><h3>🗓️ Termine heute</h3><div id="today-events" class="loader"></div><button class="btn-secondary" id="add-event-btn" style="margin-top:12px;width:100%">+ Termin</button></div>
      <div class="card" id="tasks-card"><h3>✅ Heutige To-Do</h3><div class="loader"></div></div>
      <div class="card" id="stocks-card"><h3>📈 Watchlist</h3><div class="loader"></div></div>
      <div class="card" id="news-card"><h3>📰 News</h3><div id="news-list" class="loader"></div></div>
    </div>`;
  bindAppClicks();
  initChat();
  loadWeather();
  loadTodayTasks();
  loadTodayEvents();
  loadNews();
  loadStocks();
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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") widget.classList.remove("expanded"); });
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
  $("#add-event-btn")?.addEventListener("click", () => {
    const title = prompt("Titel:"); if (!title) return;
    const time = prompt("Uhrzeit (HH:MM):"); if (!time) return;
    const today = new Date().toISOString().slice(0, 10);
    postJSON("/api/calendar", { title, start: `${today}T${time}:00` }).then((r) => { if (r.ok) { flash("Termin hinzugefügt"); loadTodayEvents(); } else flash("Fehler", "error"); });
  });
}

function eventRow(e, showNav = false) {
  const start = new Date(e.start);
  const navUrl = e.location ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(e.location)}` : null;
  return `<div class="event-row"><div class="event-title">${e.title}</div><div class="event-date">${start.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}${showNav && navUrl ? ` <a class="event-nav" href="${navUrl}" target="_blank">🗺️</a>` : ""}</div></div>`;
}

async function loadNews() {
  const el = $("#news-list");
  if (!el) return;
  try {
    const data = await getJSON("/api/news");
    el.classList.remove("loader");
    if (!data.ok || !data.items.length) { el.innerHTML = "<p class='empty-state'>News momentan nicht verfügbar.</p>"; return; }
    el.innerHTML = data.items.map((n) => `<a href="${n.url}" target="_blank" class="news-item"><div class="news-title">${n.title}</div><div class="news-desc">${n.description}</div><div class="news-date">${n.published ? new Date(n.published).toLocaleString('de-DE', {weekday:'short', hour:'2-digit', minute:'2-digit'}) : ''}</div></a>`).join("");
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
        if (confirm(`${card.querySelector(".stock-symbol").textContent} entfernen?`)) {
          await deleteReq(`/api/stocks/${card.querySelector(".stock-symbol").textContent}`);
          loadStocks();
        }
      });
    });
  } catch (e) { el.classList.remove("loader"); el.innerHTML = "<h3>📈 Watchlist</h3><p class='empty-state'>Fehler.</p>"; }
}

async function loadTodayTasks() {
  try {
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
  try {
    const projects = await getJSON("/api/projects");
    const grid = $("#project-grid");
    grid.innerHTML = projects.map((p) => `
      <div class="project-card" data-id="${p.id}">
        <div class="header"><div class="icon" style="background:${p.color}22">${p.icon}</div><div><h4>${p.name}</h4><div class="status">${p.status}</div></div></div>
        <div class="tasks">${p.tasks} offene Task${p.tasks === 1 ? "" : "s"}</div>
        <div class="project-actions"><button class="open-btn">Öffnen</button><button class="edit-btn">Bearbeiten</button><button class="danger del-btn">Löschen</button></div>
      </div>`).join("");
    $$(".project-card").forEach((card) => {
      const id = card.dataset.id;
      card.querySelector(".open-btn").addEventListener("click", () => { appState.projectDetail = id; navigate("project"); });
      card.querySelector(".edit-btn").addEventListener("click", () => editProject(id));
      card.querySelector(".del-btn").addEventListener("click", async () => { if (confirm("Projekt wirklich löschen?")) { await deleteReq(`/api/projects/${id}`); flash("Gelöscht"); renderProjects(container); } });
    });
  } catch (e) { $("#project-grid").innerHTML = "<p class='empty-state'>Projekte konnten nicht geladen werden.</p>"; }
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
  container.innerHTML = `<div class="back-home"><button class="btn-secondary" id="back-home">← Home</button> <button class="btn-secondary" id="back-projects">← Projekte</button></div>
    <h2 class="page-title" id="pd-title"></h2><div class="grid grid-2"><div class="card"><h3>📋 Offene Tasks</h3><div id="pd-tasks" class="loader"></div></div><div class="card"><h3>📅 Kommende Termine</h3><div id="pd-events" class="loader"></div></div><div class="card" style="grid-column:1/-1"><h3>🔗 Links</h3><div id="pd-links" class="loader"></div></div></div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  $("#back-projects")?.addEventListener("click", () => navigate("projects"));
  try {
    const p = await getJSON(`/api/projects/${id}`);
    $("#pd-title").textContent = `${p.icon} ${p.name}`;
    $("#pd-title").style.color = p.color;
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
      <div class="task-filter"><button data-filter="all" class="active">Alle</button><button data-filter="Offen">Offen</button><button data-filter="Erledigt">Erledigt</button><button data-filter="Party Arena">Party Arena</button><button data-filter="KI-Videos">KI-Videos</button><button data-filter="Hochzeit">Hochzeit</button><button data-filter="Server">Server</button></div>
      <div class="task-list" id="task-list"><div class="loader"></div></div>
    </div>
    <div id="lists-panel" style="display:none">
      <div class="list-tabs" id="list-tabs"></div>
      <div id="lists-list" class="task-list"><div class="loader"></div></div>
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
      $("#task-panel").style.display = tab === "tasks" ? "block" : "none";
      $("#lists-panel").style.display = tab === "lists" ? "block" : "none";
      $("#dashboard-panel").style.display = tab === "dashboard" ? "block" : "none";
      if (tab === "lists") loadLists();
      if (tab === "dashboard") loadDashboard();
    });
  });
  $$(".task-filter button").forEach((btn) => {
    btn.addEventListener("click", () => { $$(".task-filter button").forEach((b) => b.classList.remove("active")); btn.classList.add("active"); appState.taskFilter = btn.dataset.filter; loadTasks(); });
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
  const list = $("#task-list"); list.innerHTML = "<div class='loader'></div>";
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
  grid.innerHTML = "<div class='loader'></div>";
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
  list.innerHTML = "<div class='loader'></div>";
  try {
    const data = await getJSON("/api/lists");
    const names = Object.keys(data);
    appState.activeList = appState.activeList || names[0];
    tabs.innerHTML = names.map((n) => `<button class="list-tab ${n === appState.activeList ? 'active' : ''}" data-list="${n}">${n}${n !== "Einkauf" && n !== "Filme" && n !== "Geschenke" && n !== "Ideen" && n !== "Wünsche" ? ' ×' : ''}</button>`).join("");
    $$("#list-tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.textContent.includes("×") && confirm(`Liste "${btn.dataset.list}" löschen?`)) {
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
    list.querySelectorAll(".del-btn").forEach((btn) => btn.addEventListener("click", async () => { if (confirm("Eintrag löschen?")) { await fetch(`/api/lists/${encodeURIComponent(btn.dataset.list)}/items/${btn.dataset.id}`, { method: "DELETE" }); loadLists(); } }));
  } catch (e) { list.innerHTML = "<p class='empty-state'>Fehler.</p>"; }
}

function listRow(it) {
  return `<div class="list-row ${it.done ? 'done' : ''}" data-list="${appState.activeList}" data-id="${it.id}">
      <input type="checkbox" ${it.done ? 'checked' : ''} data-list="${appState.activeList}" data-id="${it.id}">
      <div class="text">${it.text}${it.url ? ` <a href="${it.url}" target="_blank" class="list-item-url">↗</a>` : ""}</div>
      <div class="actions"><button class="edit-btn" data-list="${appState.activeList}" data-id="${it.id}">✎</button><button class="del-btn" data-list="${appState.activeList}" data-id="${it.id}">×</button></div>
    </div>`;
}

async function editListItem(listName, id) {
  const data = await getJSON("/api/lists");
  const item = data[listName]?.find((i) => i.id === id);
  if (!item) return;
  const text = prompt("Text:", item.text);
  if (text === null) return;
  const url = prompt("URL:", item.url || "");
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
  let dueLabel = "";
  if (t.due) {
    const d = new Date(t.due); d.setHours(0,0,0,0); const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    dueLabel = diff === 0 ? "Heute" : diff === 1 ? "Morgen" : diff < 0 ? `${Math.abs(diff)}d überfällig` : `in ${diff}d`;
  }
  return `<div class="task-item ${done ? "done" : ""} ${dc}" data-id="${t.id}"><input type="checkbox" ${done ? "checked" : ""} data-id="${t.id}"><div class="task-title" title="${t.title}">${t.title}</div><div class="task-due">${dueLabel}</div><div class="task-meta">${t.project || "—"}</div></div>`;
}

function bindTaskCheckboxes(root, cb) {
  root.querySelectorAll("input[type=checkbox]").forEach((box) => {
    box.addEventListener("change", async () => { await patchJSON(`/api/tasks/${box.dataset.id}/status`, { status: box.checked ? "Erledigt" : "Offen" }); cb && cb(); });
  });
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
        <div class="explorer-content" id="explorer-content" data-view="grid"><div class="loader"></div></div>
      </div>
    </div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  $("#up-btn").addEventListener("click", () => { appState.path = appState.path.split("/").slice(0, -1).join("/"); appState.selectedPath = null; loadExplorer(); });
  $("#new-folder-btn").addEventListener("click", () => { const name = prompt("Ordnername:"); if (name) postJSON("/api/explorer/folder", { path: appState.path || "", name }).then(() => loadExplorer()); });
  $("#rename-btn").addEventListener("click", () => { if (!appState.selectedPath) return flash("Datei wählen", "error"); const name = prompt("Neuer Name:"); if (name) postJSON("/api/explorer/rename", { path: appState.selectedPath, name }).then(() => { appState.selectedPath = null; loadExplorer(); }); });
  $("#delete-btn").addEventListener("click", () => { if (!appState.selectedPath) return flash("Datei wählen", "error"); if (confirm("Wirklich löschen?")) postJSON("/api/explorer/delete", { path: appState.selectedPath }).then(() => { appState.selectedPath = null; loadExplorer(); }); });
  $("#explorer-upload").addEventListener("change", async (e) => { for (const file of e.target.files) await uploadFile(file); e.target.value = ""; loadExplorer(); });
  $("#view-grid").addEventListener("click", () => { appState.explorerView = "grid"; $("#explorer-content").dataset.view = "grid"; $$("#view-grid,#view-list").forEach((b) => b.classList.toggle("active", b.id === "view-grid")); });
  $("#view-list").addEventListener("click", () => { appState.explorerView = "list"; $("#explorer-content").dataset.view = "list"; $$("#view-grid,#view-list").forEach((b) => b.classList.toggle("active", b.id === "view-list")); });
  loadExplorer();
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

function escapeHtml(text) { return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

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
  container.innerHTML = `<div class="back-home"><button class="btn-secondary" id="back-home">← Home</button></div><h2 class="page-title">Settings</h2><div class="grid grid-2"><div class="card"><h3>🎨 Erscheinungsbild</h3><div class="setting-row"><label>Dark Mode</label><input type="checkbox" id="dark-toggle" ${isDark ? "checked" : ""}></div></div><div class="card"><h3>🔌 Integrationen</h3><div class="integration-list"><div class="integration-item ok"><span class="status-dot"></span> Notion</div><div class="integration-item ok"><span class="status-dot"></span> Open-Meteo Wetter</div><div class="integration-item ok"><span class="status-dot"></span> Ollama Cloud KI</div><div class="integration-item gap"><span class="status-dot"></span> Google Calendar (Stufe 2)</div></div></div><div class="card" style="grid-column:1/-1"><h3>🔐 Sicherheit</h3><div class="setting-row"><label>Passwort ändern</label><button class="btn-secondary" id="toggle-pw">Ändern</button></div><form id="pw-form" style="display:none; margin-top:10px"><input type="password" id="current-pw" placeholder="Aktuelles Passwort" required><input type="password" id="new-pw" placeholder="Neues Passwort" required><button type="submit" class="btn-primary">Speichern</button><pre id="pw-result" style="margin-top:10px; word-break:break-all; font-size:12px; color:var(--text-tertiary)"></pre></form></div></div>`;
  $("#back-home")?.addEventListener("click", () => navigate("home"));
  const toggle = $("#dark-toggle");
  toggle.addEventListener("change", () => { document.body.classList.toggle("dark", toggle.checked); document.body.classList.toggle("light", !toggle.checked); localStorage.setItem("hub-theme", toggle.checked ? "dark" : "light"); });
  $("#toggle-pw")?.addEventListener("click", () => { const form = $("#pw-form"); form.style.display = form.style.display === "none" ? "block" : "none"; });
  $("#pw-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await postJSON("/api/settings/password", { current: $("#current-pw").value, new: $("#new-pw").value });
    const out = $("#pw-result");
    if (res.ok) { out.textContent = `Neuer Hash:\n${res.hash}\n\nEintragen in .env: HUB_PASSWORD_HASH=${res.hash}`; flash("Hash generiert — .env anpassen!"); }
    else { out.textContent = res.error || "Fehler"; flash(res.error || "Fehler", "error"); }
  });
}

(function restoreTheme() {
  const saved = localStorage.getItem("hub-theme");
  if (saved === "light") document.body.classList.replace("dark", "light");
})();

document.addEventListener("DOMContentLoaded", init);
