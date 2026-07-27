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
    <div class="app-grid">
      ${appIcon("party-arena", "Party Arena")}
      ${appIcon("piano-coach", "Klavier")}
      ${appIcon("projects", "Projekte", () => navigate("projects"))}
      ${appIcon("todo", "To-Do", () => navigate("tasks"))}
      ${appIcon("explorer", "Explorer", () => navigate("explorer"))}
      ${appIcon("chat", "Hermes", () => { document.querySelector(".chat-widget")?.classList.add("expanded"); })}
      ${appIcon("settings", "Settings", () => navigate("settings"))}
    </div>
    <h2 class="page-title">Übersicht</h2>
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
        <button class="btn-secondary" id="add-event-btn" style="margin-top:12px;width:100%">+ Termin</button>
      </div>
      <div class="card" id="tasks-card"><h3>✅ Heutige To-Do</h3><div class="loader"></div></div>
      <div class="card" id="day-card">
        <h3>📅 Tagesbericht</h3>
        <div id="daily-report" class="loader"></div>
      </div>
      <div class="card" id="news-card">
        <h3>📰 News</h3>
        <div id="news-list" class="loader"></div>
      </div>
    </div>
  `;

  bindAppClicks();
  loadDailyReport();

  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#chat-input");
    const text = input.value.trim();
    if (!text || !socket) return;
    socket.emit("chat_message", { text });
    input.value = "";
    const box = $("#chat-box");
    const typing = document.createElement("div");
    typing.className = "typing";
    typing.innerHTML = "Hermes denkt<span></span><span></span><span></span>";
    typing.id = "typing-indicator";
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;
  });

  const box = $("#chat-box");
  chatHistory.slice(-20).forEach((m) => appendMessage(box, m));

  loadWeather();
  loadTodayTasks();
  loadTodayEvents();
  loadNews();
  initChatExpand();
}

function appIcon(id, label, action = null) {
  return `
    <div class="app-icon" data-app="${id}">
      <img src="/static/images/apps/${id}.png" alt="${label}">
      <div class="label">${label}</div>
    </div>`;
}

function bindAppClicks() {
  $$(".app-icon").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.app;
      if (id === "party-arena") window.open("https://github.com/dcsepke-byte/DC-Minigame", "_blank");
      else if (id === "piano-coach") window.open("https://coach.danny-csepke.de", "_blank");
      else if (id === "projects") navigate("projects");
      else if (id === "todo") navigate("tasks");
      else if (id === "explorer") navigate("explorer");
      else if (id === "chat") document.querySelector(".chat-widget")?.classList.add("expanded");
      else if (id === "settings") navigate("settings");
    });
  });
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
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" }));
    }
    const data = await getJSON("/api/daily-report");
    el.classList.remove("loader");
    const text = data.text || "Kein Tagesbericht verfügbar.";
    const days = dates.map((date, i) => ({
      date,
      text: i === 6 ? text : "Vergangene Tage werden noch aus der Notion-Historie aggregiert.",
    }));
    el.innerHTML = days.map((d) => `
      <div class="report-day">
        <div class="date">${d.date}</div>
        <div style="white-space:pre-wrap">${d.text}</div>
      </div>`).join("");
  } catch (e) {
    if (el) { el.classList.remove("loader"); el.innerHTML = "<p class='empty-state'>Fehler beim Laden.</p>"; }
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
  container.innerHTML = `
    <div class="app-grid">
      ${appIcon("party-arena", "Party Arena")}
      ${appIcon("piano-coach", "Klavier")}
    </div>
    <h2 class="page-title">Projekte</h2>
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
    bindAppClicks();
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
    <div class="task-tabs">
      <button data-tab="tasks" class="active">Aufgaben</button>
      <button data-tab="lists">Listen</button>
    </div>
    <div id="task-panel">
      <div class="task-filter">
        <button data-filter="all" class="active">Alle</button>
        <button data-filter="Offen">Offen</button>
        <button data-filter="Erledigt">Erledigt</button>
        <button data-filter="Party Arena">Party Arena</button>
        <button data-filter="KI-Videos">KI-Videos</button>
        <button data-filter="Hochzeit">Hochzeit</button>
        <button data-filter="Server">Server</button>
      </div>
      <div class="task-list" id="task-list"><div class="loader"></div></div>
    </div>
    <div id="lists-panel" style="display:none">
      <div class="list-tabs" id="list-tabs"></div>
      <div class="task-list" id="lists-list"><div class="loader"></div></div>
      <form id="list-add-form" class="list-add-form">
        <input type="text" id="list-new-item" placeholder="Neuer Eintrag...">
        <button type="submit" class="btn-primary">+</button>
      </form>
    </div>`;

  $$(".task-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".task-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const isTasks = btn.dataset.tab === "tasks";
      $("#task-panel").style.display = isTasks ? "block" : "none";
      $("#lists-panel").style.display = isTasks ? "none" : "block";
      if (!isTasks) loadLists();
    });
  });

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

  $("#list-add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#list-new-item");
    if (!input.value.trim() || !appState.activeList) return;
    const res = await postJSON(`/api/lists/${encodeURIComponent(appState.activeList)}/items`, { text: input.value.trim() });
    if (res.ok) { input.value = ""; loadLists(); }
    else flash("Fehler", "error");
  });

  await loadTasks();
  appState.activeList = "Einkauf";
  loadLists();
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
    initSwipe(list, loadTasks);
    list.innerHTML += `<div class="swipe-hint">↔ Swipe: rechts erledigt · links blockiert</div>`;
  } catch (e) {
    list.innerHTML = "<p class='empty-state'>Fehler beim Laden.</p>";
  }
}

async function loadLists() {
  const tabs = $("#list-tabs");
  const list = $("#lists-list");
  if (!tabs || !list) return;
  list.innerHTML = "<div class='loader'></div>";
  try {
    const data = await getJSON("/api/lists");
    const names = Object.keys(data);
    appState.activeList = appState.activeList || names[0];
    tabs.innerHTML = names.map((n) => `<button class="list-tab ${n === appState.activeList ? 'active' : ''}" data-list="${n}">${n}</button>`).join("");
    $$("#list-tabs button").forEach((btn) => btn.addEventListener("click", () => { appState.activeList = btn.dataset.list; loadLists(); }));
    const items = data[appState.activeList] || [];
    list.innerHTML = items.length
      ? items.map((it) => `
        <div class="task-item ${it.done ? 'done' : ''}" data-list="${appState.activeList}" data-id="${it.id}">
          <input type="checkbox" ${it.done ? 'checked' : ''} data-list="${appState.activeList}" data-id="${it.id}">
          <div class="task-title" style="${it.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${it.text}</div>
        </div>`).join("")
      : "<p class='empty-state'>Liste leer.</p>";
    list.querySelectorAll("input[type=checkbox]").forEach((box) => {
      box.addEventListener("change", async () => {
        await patchJSON(`/api/lists/${encodeURIComponent(box.dataset.list)}/items/${box.dataset.id}/toggle`, {});
        loadLists();
      });
    });
    initSwipe(list, loadLists, true);
    list.innerHTML += `<div class="swipe-hint">↔ Swipe: rechts erledigt · links löschen</div>`;
  } catch (e) {
    list.innerHTML = "<p class='empty-state'>Fehler.</p>";
  }
}

function initSwipe(root, reloadFn, isList = false) {
  root.querySelectorAll(".task-item").forEach((el) => {
    let startX = 0;
    el.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", async (e) => {
      const endX = e.changedTouches[0].clientX;
      const diff = endX - startX;
      if (Math.abs(diff) < 80) return;
      const id = el.dataset.id;
      if (!isList) {
        if (diff > 0) await patchJSON(`/api/tasks/${id}/status`, { status: "Erledigt" });
        else await patchJSON(`/api/tasks/${id}/status`, { status: "Blockiert" }); // links = blockiert statt löschen
      } else {
        if (diff > 0) await patchJSON(`/api/lists/${encodeURIComponent(el.dataset.list)}/items/${id}/toggle`, {});
        else {
          const method = "DELETE";
          const r = await fetch(`/api/lists/${encodeURIComponent(el.dataset.list)}/items/${id}`, { method });
          if (!r.ok) return;
        }
      }
      reloadFn();
    }, { passive: true });
  });
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
      <div class="group">
        <button class="btn-secondary" id="up-btn">⬆ Hoch</button>
        <button class="btn-secondary" id="new-folder-btn">Neuer Ordner</button>
        <label class="btn-secondary">Upload<input type="file" id="explorer-upload" style="display:none" multiple></label>
      </div>
      <div class="group">
        <button class="btn-icon active" id="view-grid" title="Grid">▦</button>
        <button class="btn-icon" id="view-list" title="Liste">☰</button>
      </div>
    </div>
    <div class="explorer-breadcrumb" id="breadcrumb"></div>
    <div class="explorer-grid" id="explorer-grid" data-view="grid"><div class="loader"></div></div>`;

  $("#up-btn").addEventListener("click", () => { appState.path = appState.path.split("/").slice(0, -1).join("/"); loadExplorer(); });
  $("#new-folder-btn").addEventListener("click", () => {
    const name = prompt("Ordnername:");
    if (name) { appState.path = appState.path ? `${appState.path}/${name}` : name; loadExplorer(); }
  });
  $("#explorer-upload").addEventListener("change", async (e) => {
    for (const file of e.target.files) await uploadFile(file);
    e.target.value = "";
  });
  $("#view-grid").addEventListener("click", () => { appState.explorerView = "grid"; $("#explorer-grid").dataset.view = "grid"; $$(".view-toggle").forEach((b) => b.classList.toggle("active", b.id === "view-grid")); });
  $("#view-list").addEventListener("click", () => { appState.explorerView = "list"; $("#explorer-grid").dataset.view = "list"; $$(".view-toggle").forEach((b) => b.classList.toggle("active", b.id === "view-list")); });

  const grid = $("#explorer-grid");
  grid.addEventListener("dragover", (e) => { e.preventDefault(); grid.classList.add("drag-over"); });
  grid.addEventListener("dragleave", () => grid.classList.remove("drag-over"));
  grid.addEventListener("drop", async (e) => {
    e.preventDefault();
    grid.classList.remove("drag-over");
    for (const file of e.dataTransfer.files) await uploadFile(file);
  });

  await loadExplorer();
}

async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`/api/explorer/upload?path=${encodeURIComponent(appState.path || "")}`, { method: "POST", body: form });
  if (r.ok) { flash("Hochgeladen"); loadExplorer(); }
  else flash("Upload fehlgeschlagen", "error");
}

async function loadExplorer() {
  try {
    const items = await getJSON(`/api/explorer?path=${encodeURIComponent(appState.path || "")}`);
    renderBreadcrumb();
    const grid = $("#explorer-grid");
    grid.dataset.view = appState.explorerView || "grid";
    grid.innerHTML = items.map((it) => `
      <div class="explorer-item" data-path="${it.path}" data-type="${it.type}" data-name="${it.name}">
        <div class="icon">${it.type === "folder" ? "📁" : iconForFile(it.name)}</div>
        <div class="name">${it.name}</div>
        <div class="meta">${it.type === "file" ? formatBytes(it.size) : "Ordner"}</div>
      </div>`).join("");

    $$(".explorer-item").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.type === "folder") { appState.path = el.dataset.path; loadExplorer(); }
        else openPreview(el.dataset.path, el.dataset.name);
      });
    });
  } catch (e) {
    $("#explorer-grid").innerHTML = "<p class='empty-state'>Fehler.</p>";
  }
}

function openPreview(path, name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    showLightbox(`/files/${encodeURIComponent(path)}`);
  } else if (ext === "pdf") {
    window.open(`/files/${encodeURIComponent(path)}`, "_blank");
  } else if (["md", "txt", "py", "js", "css", "html", "json"].includes(ext)) {
    openTextEditor(path, name);
  } else {
    window.open(`/files/${encodeURIComponent(path)}`, "_blank");
  }
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
    const modal = document.createElement("div");
    modal.className = "modal show";
    modal.innerHTML = `
      <div class="modal-card wide">
        <div class="modal-header"><h3>${name}</h3><button class="close-modal">×</button></div>
        <div class="modal-body">
          <textarea id="file-editor" rows="20" style="width:100%;font-family:monospace">${data.content}</textarea>
          <button id="save-file" class="btn-primary" style="margin-top:10px">Speichern</button>
        </div>
      </div>`;
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
    modal.querySelector("#save-file").addEventListener("click", async () => {
      const content = modal.querySelector("#file-editor").value;
      const res = await postJSON("/api/explorer/file", { path, content });
      flash(res.ok ? "Gespeichert" : "Fehler", res.ok ? "ok" : "error");
    });
    document.body.appendChild(modal);
  } catch (e) { flash("Fehler", "error"); }
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
  const isDark = document.body.classList.contains("dark");
  container.innerHTML = `
    <h2 class="page-title">Settings</h2>
    <div class="grid grid-2">
      <div class="card">
        <h3>🎨 Erscheinungsbild</h3>
        <div class="setting-row">
          <label>Dark Mode</label>
          <input type="checkbox" id="dark-toggle" ${isDark ? "checked" : ""}>
        </div>
      </div>
      <div class="card">
        <h3>🔌 Integrationen</h3>
        <div class="integration-list">
          <div class="integration-item ok"><span class="status-dot"></span> Notion</div>
          <div class="integration-item ok"><span class="status-dot"></span> Open-Meteo Wetter</div>
          <div class="integration-item ok"><span class="status-dot"></span> Ollama Cloud KI</div>
          <div class="integration-item gap"><span class="status-dot"></span> Google Calendar (Stufe 2)</div>
        </div>
      </div>
      <div class="card" style="grid-column:1/-1">
        <h3>🔐 Sicherheit</h3>
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

  const toggle = $("#dark-toggle");
  const applyTheme = () => {
    document.body.classList.toggle("dark", toggle.checked);
    document.body.classList.toggle("light", !toggle.checked);
    localStorage.setItem("hub-theme", toggle.checked ? "dark" : "light");
  };
  toggle.addEventListener("change", applyTheme);
  applyTheme();

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

(function restoreTheme() {
  const saved = localStorage.getItem("hub-theme");
  if (saved === "light") document.body.classList.replace("dark", "light");
})();

function initChatExpand() {
  const input = $("#chat-input");
  if (!input) return;
  input.addEventListener("focus", () => {
    $(".chat-widget")?.classList.add("expanded");
  });
}

document.addEventListener("DOMContentLoaded", init);
