const currentPage = "{{ page }}";
let appState = { page: currentPage, projectFilter: null, taskFilter: "all", path: "", projectDetail: null };
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
  initSidebar();
  initQuickAdd();
  initSocket();
  navigate(location.hash.slice(1) || currentPage || "home", false);
  window.addEventListener("hashchange", () => navigate(location.hash.slice(1), false));
}

function initNav() {
  $$(".nav-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
      closeSidebar();
    });
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
  (data.projects || []).forEach((p) => items.push({ type: "Projekt", title: p.name, action: () => { appState.taskFilter = p.name; navigate("tasks"); } }));
  (data.tasks || []).forEach((t) => items.push({ type: "Task", title: t.title, meta: t.project, action: () => window.open(t.url, "_blank") }));
  (data.files || []).forEach((f) => items.push({ type: f.type === "folder" ? "Ordner" : "Datei", title: f.name, action: () => {
    if (f.type === "folder") { appState.path = f.path; navigate("explorer"); }
    else window.open(`/files/${encodeURIComponent(f.path)}`, "_blank");
  } }));

  box.innerHTML = items.length
    ? items.map((it) => `<div class="search-result" data-action="">
        <div class="type">${it.type}</div>
        <div class="title">${it.title}${it.meta ? ` <span style="color:var(--muted);font-size:12px">(${it.meta})</span>` : ""}</div>
      </div>`).join("")
    : `<div class="search-empty">Keine Ergebnisse</div>`;
  box.classList.add("show");

  box.querySelectorAll(".search-result").forEach((el, i) => {
    el.addEventListener("click", () => { items[i].action(); box.classList.remove("show"); $("#globalSearch").value = ""; });
  });
}

function initSidebar() {
  $("#burger").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
    $("#overlay").classList.toggle("show");
  });
  $("#overlay").addEventListener("click", closeSidebar);
}

function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#overlay").classList.remove("show");
}

function initQuickAdd() {
  const modal = $("#quickAddModal");
  const show = () => modal.classList.add("show");
  const hide = () => modal.classList.remove("show");
  $("#quickAdd").addEventListener("click", show);
  $("#fab").addEventListener("click", show);
  $(".close-modal").addEventListener("click", hide);
  modal.addEventListener("click", (e) => { if (e.target === modal) hide(); });

  let qtype = "task";
  $$(".quick-type").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".quick-type").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      qtype = btn.dataset.type;
      $("#quickFile").style.display = qtype === "file" ? "block" : "none";
    });
  });

  $("#quickForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#quickTitle").value.trim();
    const project = $("#quickProject").value;
    if (!title && qtype !== "file") return;

    if (qtype === "task") {
      const res = await postJSON("/api/tasks", { title, project });
      if (res && (res.id || res.ok !== false)) {
        flash("Task erstellt");
        if (appState.page === "tasks") renderTasks();
      } else {
        flash("Fehler beim Erstellen", "error");
      }
    } else if (qtype === "note") {
      // Note = Notion Wissens-DB
      const res = await postJSON("/api/notes", { title, project, content: "" });
      flash(res?.ok ? "Notiz erstellt" : "Fehler", res?.ok ? "ok" : "error");
    } else if (qtype === "file") {
      const fileInput = $("#quickFile");
      if (!fileInput.files.length) return flash("Keine Datei", "error");
      const form = new FormData();
      form.append("file", fileInput.files[0]);
      const res = await fetch(`/api/explorer/upload?path=${encodeURIComponent(appState.path || "")}`, { method: "POST", body: form });
      if (res.ok) { flash("Datei hochgeladen"); if (appState.page === "explorer") renderExplorer(); }
      else flash("Upload fehlgeschlagen", "error");
    }
    hide();
    $("#quickForm").reset();
  });
}

function initSocket() {
  socket = io({ transports: ["polling"] });
  socket.on("connect", () => console.log("socket connected"));
  socket.on("chat_message", (msg) => {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) indicator.remove();
    chatHistory.push(msg);
    const box = $(".chat-messages");
    if (box) appendMessage(box, msg);
  });
  socket.on("connect_error", () => {
    flash("Chat-Verbindung unterbrochen", "error");
  });
}

function navigate(page, push = true) {
  const target = PAGES[page] ? page : "home";
  appState.page = target;
  if (push && location.hash.slice(1) !== target) history.pushState(null, "", `#${target}`);
  $$(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.page === target));
  const content = $("#content");
  content.innerHTML = "";
  const renderer = PAGES[target] || renderHome;
  renderer(content);
  document.title = `HUB — ${target[0].toUpperCase()}${target.slice(1)}`;
}

async function getJSON(url) {
  const r = await fetch(url);
  if (r.status === 401) { window.location.href = "/login"; throw new Error("Nicht eingeloggt"); }
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status === 401) { window.location.href = "/login"; return { ok: false }; }
  return r.json().catch(() => ({ ok: false }));
}

async function patchJSON(url, body) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status === 401) { window.location.href = "/login"; return { ok: false }; }
  return r.json().catch(() => ({ ok: false }));
}

function flash(text, type = "ok") {
  // In-page lightweight toast
  const toast = document.createElement("div");
  toast.className = `flash ${type}`;
  toast.textContent = text;
  toast.style.position = "fixed";
  toast.style.top = "70px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.zIndex = "200";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// --- Home ---
async function renderHome(container) {
  container.innerHTML = `
    <h2 class="page-title">Home</h2>
    <div class="grid grid-2">
      <div class="card" id="weather-card"><div class="loader"></div></div>
      <div class="card chat-widget">
        <h3>💬 Hermes Chat</h3>
        <div class="chat-messages" id="chat-box"></div>
        <form class="chat-input" id="chat-form">
          <input type="text" id="chat-input" placeholder="Frage Hermes..." autocomplete="off">
          <button type="submit" class="btn-primary">➤</button>
        </form>
      </div>
      <div class="card" id="calendar-card">
        <h3>🗓️ Termine heute</h3>
        <div id="today-events" class="loader"></div>
        <button class="btn-secondary" id="add-event-btn" style="margin-top:10px;width:100%">+ Termin</button>
      </div>
      <div class="card" id="tasks-card"><h3>✅ Heutige To-Do</h3><div class="loader"></div></div>
      <div class="card" id="day-card">
        <h3>📅 Tagesbericht</h3>
        <div id="daily-report" class="loader"></div>
      </div>
      <div class="card" id="news-card">
        <h3>📰 News — tagesschau.de</h3>
        <div id="news-list" class="loader"></div>
      </div>
    </div>
  `;

  loadDailyReport();

  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text || !socket) return;
    socket.emit("chat_message", { text });
    input.value = "";
    // typing indicator
    const box = $("#chat-box");
    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = "Hermes denkt<span></span><span></span><span></span>";
    typing.id = "typing-indicator";
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;
  });

  // render existing chat
  const box = $("#chat-box");
  chatHistory.slice(-20).forEach((m) => appendMessage(box, m));

  loadWeather();
  loadTodayTasks();
  loadTodayEvents();
  loadNews();
}

async function loadTodayEvents() {
  const el = $("#today-events");
  if (!el) return;
  try {
    const data = await getJSON("/api/calendar");
    el.classList.remove("loader");
    const events = data.today || [];
    el.innerHTML = events.length
      ? events.map((e) => `
        <div class="event-row">
          <div class="event-title">${e.title}</div>
          <div class="event-date">${new Date(e.start).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</div>
        </div>`).join("")
      : "<p class='empty-state'>Keine Termine heute.</p>";
  } catch (e) {
    if (el) { el.classList.remove("loader"); el.innerHTML = "<p class='empty-state'>Fehler.</p>"; }
  }
  const btn = $("#add-event-btn");
  if (btn) btn.addEventListener("click", () => {
    const title = prompt("Titel:");
    if (!title) return;
    const time = prompt("Uhrzeit (HH:MM, z.B. 14:30):");
    if (!time) return;
    const today = new Date().toISOString().slice(0, 10);
    postJSON("/api/calendar", { title, start: `${today}T${time}:00` }).then((r) => {
      if (r.ok) { flash("Termin hinzugefügt"); loadTodayEvents(); }
      else flash("Fehler", "error");
    });
  });
}

async function loadNews() {
  const el = $("#news-list");
  if (!el) return;
  try {
    const data = await getJSON("/api/news");
    el.classList.remove("loader");
    if (!data.ok || !data.items.length) {
      el.innerHTML = "<p class='empty-state'>News momentan nicht verfügbar.</p>";
      return;
    }
    el.innerHTML = data.items.map((n) => `
      <a href="${n.url}" target="_blank" class="news-item">
        <div class="news-title">${n.title}</div>
        <div class="news-desc">${n.description}</div>
        <div class="news-date">${n.published ? new Date(n.published).toLocaleString('de-DE', {weekday:'short', hour:'2-digit', minute:'2-digit'}) : ''}</div>
      </a>`).join("");
  } catch (e) {
    if (el) { el.classList.remove("loader"); el.innerHTML = "<p class='empty-state'>Fehler beim Laden.</p>"; }
  }
}

async function loadDailyReport() {
  const el = $("#daily-report");
  if (!el) return;
  try {
    const data = await getJSON("/api/daily-report");
    el.classList.remove("loader");
    el.style.whiteSpace = "pre-wrap";
    el.style.fontSize = "14px";
    el.style.lineHeight = "1.5";
    el.textContent = data.text || "Kein Tagesbericht verfügbar.";
  } catch (e) {
    if (el) { el.classList.remove("loader"); el.textContent = "Fehler beim Laden."; }
  }
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
    const c = data.current;
    const days = data.daily.slice(0, 4);
    const icon = weatherIcon(c.code, c.is_day);
    el.innerHTML = `
      <h3>🌤️ Wetter — Braunschweig</h3>
      <div class="weather-main">
        <div class="icon">${icon}</div>
        <div>
          <div class="temp">${c.temp}°C</div>
          <div class="weather-meta">Luftfeuchtigkeit ${c.humidity}% · Wind ${c.wind} km/h</div>
        </div>
      </div>
      <div class="forecast">${days.map((d) => `
        <div class="forecast-day">
          <span class="icon">${weatherIcon(d.code, 1)}</span>
          <div class="temps">${d.min}° / ${d.max}°</div>
          <div class="temps">${d.date.slice(5)}</div>
        </div>`).join("")}</div>
    `;
  } catch (e) {
    if ($("#weather-card")) $("#weather-card").innerHTML = "<h3>🌤️ Wetter</h3><p class='empty-state'>Fehler.</p>";
  }
}

async function loadTodayTasks() {
  try {
    const tasks = await getJSON("/api/tasks?status=Offen");
    const el = $("#tasks-card");
    const today = tasks.slice(0, 6);
    el.innerHTML = `
      <h3>✅ Heutige To-Do</h3>
      <div class="task-list">${today.length ? today.map(taskRow).join("") : "<p class='empty-state'>Keine offenen Tasks. 🎉</p>"}</div>
    `;
    bindTaskCheckboxes(el, () => { loadTodayTasks(); if (appState.page === "tasks") renderTasks(); });
  } catch (e) {
    $("#tasks-card").innerHTML = "<h3>✅ Heutige To-Do</h3><p class='empty-state'>Fehler beim Laden.</p>";
  }
}

function weatherIcon(code, isDay) {
  const map = {
    0: isDay ? "☀️" : "🌙", 1: isDay ? "🌤️" : "☁️", 2: isDay ? "⛅" : "☁️", 3: "☁️",
    45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌧️", 55: "🌧️",
    61: "🌧️", 63: "🌧️", 65: "🌧️", 71: "🌨️", 73: "🌨️", 75: "🌨️", 77: "🌨️",
    80: "🌦️", 81: "🌧️", 82: "🌧️", 85: "🌨️", 86: "🌨️", 95: "⛈️", 96: "⛈️", 99: "⛈️",
  };
  return map[code] || "❓";
}

// --- Projects ---
async function renderProjects(container) {
  container.innerHTML = `<h2 class="page-title">Projekte</h2>
    <div class="grid grid-2" id="project-grid"><div class="loader"></div></div>`;
  try {
    const projects = await getJSON("/api/projects");
    const grid = $("#project-grid");
    grid.innerHTML = projects.map((p) => `
      <div class="project-card" data-project="${p.name}" style="border-top:4px solid ${p.color}">
        <div class="header">
          <div class="icon" style="background:${p.color}20">${p.icon}</div>
          <div><h4>${p.name}</h4><div class="status">${p.status}</div></div>
        </div>
        <div class="tasks">${p.tasks} offene Task${p.tasks === 1 ? "" : "s"}</div>
      </div>`).join("");
    $$(".project-card").forEach((card) => {
      card.addEventListener("click", () => { appState.projectDetail = card.dataset.project; navigate("project"); });
    });
  } catch (e) {
    $("#project-grid").innerHTML = "<p class='empty-state'>Projekte konnten nicht geladen werden.</p>";
  }
}

async function renderProjectDetail(container) {
  const id = appState.projectDetail;
  if (!id) { navigate("projects"); return; }
  container.innerHTML = `
    <h2 class="page-title" id="pd-title"></h2>
    <div class="grid grid-2">
      <div class="card">
        <h3>📋 Offene Tasks</h3>
        <div id="pd-tasks" class="loader"></div>
      </div>
      <div class="card">
        <h3>📅 Kommende Termine</h3>
        <div id="pd-events" class="loader"></div>
      </div>
      <div class="card" style="grid-column:1/-1">
        <h3>🔗 Links</h3>
        <div id="pd-links" class="loader"></div>
      </div>
    </div>
  `;
  try {
    const p = await getJSON(`/api/projects/${encodeURIComponent(id)}`);
    $("#pd-title").textContent = `${p.icon} ${p.name}`;
    $("#pd-title").style.color = p.color;
    const tasksEl = $("#pd-tasks");
    tasksEl.classList.remove("loader");
    tasksEl.innerHTML = p.tasks?.length ? p.tasks.map(taskRow).join("") : "<p class='empty-state'>Keine offenen Tasks.</p>";
    bindTaskCheckboxes(tasksEl, () => renderProjectDetail(container));
    const eventsEl = $("#pd-events");
    eventsEl.classList.remove("loader");
    eventsEl.innerHTML = p.events?.length
      ? p.events.map((e) => `
        <div class="event-row">
          <div class="event-title">${e.title}</div>
          <div class="event-date">${new Date(e.start).toLocaleString('de-DE', {dateStyle:'short', timeStyle:'short'})}</div>
        </div>`).join("")
      : "<p class='empty-state'>Keine Termine.</p>";
    const linksEl = $("#pd-links");
    linksEl.classList.remove("loader");
    linksEl.innerHTML = p.links?.length
      ? p.links.map((l) => `<a href="${l.url}" target="_blank" class="project-link" style="border-color:${p.color}">${l.name}</a>`).join("")
      : "<p class='empty-state'>Keine Links.</p>";
  } catch (e) {
    container.innerHTML = "<p class='empty-state'>Projekt konnte nicht geladen werden.</p>";
  }
}

// --- Tasks ---
async function renderTasks(container) {
  container.innerHTML = `
    <h2 class="page-title">To-Do</h2>
    <div class="task-filter">
      <button data-filter="all" class="active">Alle</button>
      <button data-filter="Offen">Offen</button>
      <button data-filter="Erledigt">Erledigt</button>
      <button data-filter="Party Arena">Party Arena</button>
      <button data-filter="KI-Videos">KI-Videos</button>
      <button data-filter="Hochzeit">Hochzeit</button>
      <button data-filter="Server">Server</button>
    </div>
    <div class="task-list" id="task-list"><div class="loader"></div></div>`;

  $$(".task-filter button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".task-filter button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      appState.taskFilter = btn.dataset.filter;
      loadTasks();
    });
  });

  if (appState.projectFilter) {
    appState.taskFilter = appState.projectFilter;
    appState.projectFilter = null;
    $$(`.task-filter button[data-filter="${appState.taskFilter}"]`)?.[0]?.classList.add("active");
    $$(".task-filter button[data-filter='all']")?.[0]?.classList.remove("active");
  }

  await loadTasks();
}

async function loadTasks() {
  const list = $("#task-list");
  list.innerHTML = "<div class='loader'></div>";
  try {
    let url = "/api/tasks";
    const knownStatus = ["Offen", "Erledigt", "In Arbeit", "Blockiert"];
    if (knownStatus.includes(appState.taskFilter) && appState.taskFilter !== "all") {
      url += `?status=${encodeURIComponent(appState.taskFilter)}`;
    } else if (appState.taskFilter && appState.taskFilter !== "all") {
      url += `?project=${encodeURIComponent(appState.taskFilter)}`;
    }
    const tasks = await getJSON(url);
    list.innerHTML = tasks.length ? tasks.map(taskRow).join("") : "<p class='empty-state'>Keine Tasks.</p>";
    bindTaskCheckboxes(list, loadTasks);
  } catch (e) {
    list.innerHTML = "<p class='empty-state'>Fehler beim Laden.</p>";
  }
}

function taskRow(t) {
  const done = t.status === "Erledigt";
  return `
    <div class="task-item ${done ? "done" : ""}" data-id="${t.id}">
      <input type="checkbox" ${done ? "checked" : ""} data-id="${t.id}">
      <div class="task-title" title="${t.title}">${t.title}</div>
      <div class="task-meta" title="${t.project}">${t.project || "—"}</div>
    </div>`;
}

function bindTaskCheckboxes(root, cb) {
  root.querySelectorAll("input[type=checkbox]").forEach((box) => {
    box.addEventListener("change", async () => {
      const status = box.checked ? "Erledigt" : "Offen";
      await patchJSON(`/api/tasks/${box.dataset.id}/status`, { status });
      cb && cb();
    });
  });
}

// --- Explorer ---
async function renderExplorer(container) {
  container.innerHTML = `
    <h2 class="page-title">Explorer</h2>
    <div class="explorer-toolbar">
      <button class="btn-secondary" id="up-btn">⬆ Hoch</button>
      <button class="btn-secondary" id="new-folder-btn">Neuer Ordner</button>
      <label class="btn-secondary">Upload<input type="file" id="explorer-upload" style="display:none"></label>
    </div>
    <div class="explorer-breadcrumb" id="breadcrumb"></div>
    <div class="explorer-grid" id="explorer-grid"><div class="loader"></div></div>`;

  $("#up-btn").addEventListener("click", () => { appState.path = appState.path.split("/").slice(0, -1).join("/"); loadExplorer(); });
  $("#new-folder-btn").addEventListener("click", () => {
    const name = prompt("Ordnername:");
    if (name) { appState.path = appState.path ? `${appState.path}/${name}` : name; loadExplorer(); }
  });
  $("#explorer-upload").addEventListener("change", async (e) => {
    if (!e.target.files.length) return;
    const form = new FormData();
    form.append("file", e.target.files[0]);
    const r = await fetch(`/api/explorer/upload?path=${encodeURIComponent(appState.path || "")}`, { method: "POST", body: form });
    if (r.ok) { flash("Hochgeladen"); loadExplorer(); }
    else flash("Fehler", "error");
    e.target.value = "";
  });

  await loadExplorer();
}

async function loadExplorer() {
  try {
    const items = await getJSON(`/api/explorer?path=${encodeURIComponent(appState.path || "")}`);
    renderBreadcrumb();
    const grid = $("#explorer-grid");
    grid.innerHTML = items.map((it) => `
      <div class="explorer-item" data-path="${it.path}" data-type="${it.type}">
        <div class="icon">${it.type === "folder" ? "📁" : iconForFile(it.name)}</div>
        <div class="name">${it.name}</div>
        <div class="meta">${it.type === "file" ? formatBytes(it.size) : "Ordner"}</div>
      </div>`).join("");

    $$(".explorer-item").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.type === "folder") {
          appState.path = el.dataset.path;
          loadExplorer();
        } else {
          // preview/download
          window.open(`/files/${encodeURIComponent(el.dataset.path)}`, "_blank");
        }
      });
    });
  } catch (e) {
    $("#explorer-grid").innerHTML = "<p class='empty-state'>Fehler.</p>";
  }
}

function renderBreadcrumb() {
  const parts = appState.path ? appState.path.split("/").filter(Boolean) : [];
  const crumbs = ["Hub", ...parts];
  $("#breadcrumb").innerHTML = crumbs.map((p, i) => `
    <button data-idx="${i}">${p}</button>
    ${i < crumbs.length - 1 ? "<span style='color:var(--muted)'>/</span>" : ""}`).join("");
  $("#breadcrumb").querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      appState.path = parts.slice(0, idx).join("/");
      loadExplorer();
    });
  });
}

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
  container.innerHTML = `
    <h2 class="page-title">Settings</h2>
    <div class="card">
      <div class="settings-group">
        <h4>Erscheinungsbild</h4>
        <div class="setting-row">
          <label>Dark Mode</label>
          <input type="checkbox" id="dark-toggle" checked>
        </div>
      </div>
      <div class="settings-group">
        <h4>Sicherheit</h4>
        <div class="setting-row">
          <label>Passwort ändern</label>
          <button class="btn-secondary" id="toggle-pw">Ändern</button>
        </div>
        <form id="pw-form" style="display:none; margin-top:10px">
          <input type="password" id="current-pw" placeholder="Aktuelles Passwort" required>
          <input type="password" id="new-pw" placeholder="Neues Passwort" required>
          <button type="submit" class="btn-primary">Speichern</button>
          <pre id="pw-result" style="margin-top:10px; word-break:break-all; font-size:12px; color:var(--muted)"></pre>
        </form>
      </div>
    </div>`;

  $("#dark-toggle").addEventListener("change", (e) => {
    document.body.classList.toggle("dark", e.target.checked);
  });
  $("#toggle-pw").addEventListener("click", () => {
    const form = $("#pw-form");
    form.style.display = form.style.display === "none" ? "block" : "none";
  });
  $("#pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await postJSON("/api/settings/password", {
      current: $("#current-pw").value,
      new: $("#new-pw").value,
    });
    const out = $("#pw-result");
    if (res.ok) {
      out.textContent = `Neuer Hash:\n${res.hash}\n\nEintragen in .env: HUB_PASSWORD_HASH=${res.hash}`;
      flash("Hash generiert — .env anpassen!");
    } else {
      out.textContent = res.error || "Fehler";
      flash(res.error || "Fehler", "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
