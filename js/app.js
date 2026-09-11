/**
 * CloudTasks - Etapa 2
 * Lógica de la aplicación en JavaScript puro.
 *
 * Persistencia: las tareas se guardan en Supabase (PostgreSQL) a través
 * de supabaseClient (ver js/config.js). Cada tarea pertenece al usuario
 * autenticado (columna user_id + Row Level Security).
 */

(() => {
  "use strict";

  const TASKS_TABLE = "tasks";

  // ---------------------------------------------------------------
  // Estado en memoria
  // ---------------------------------------------------------------
  let tasks = [];
  let currentUser = null;
  let currentFilter = "all";
  let currentSort = "created_desc";
  let selectedDay = null; // "YYYY-MM-DD" o null
  let calendarViewDate = new Date(); // mes que se muestra en el mini calendario

  // ---------------------------------------------------------------
  // Referencias al DOM
  // ---------------------------------------------------------------
  const form = document.getElementById("task-form");
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");
  const deadlineInput = document.getElementById("deadline");
  const priorityInput = document.getElementById("priority");
  const formSubmitBtn = form.querySelector('button[type="submit"]');

  const taskList = document.getElementById("task-list");
  const taskTemplate = document.getElementById("task-template");
  const emptyState = document.getElementById("empty-state");
  const taskCountBadge = document.getElementById("task-count");
  const sortSelect = document.getElementById("sort-select");
  const filterRadios = document.querySelectorAll('input[name="filter"]');
  const statusAlert = document.getElementById("status-alert");

  const userNameEl = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");

  const calGrid = document.getElementById("cal-grid");
  const calMonthLabel = document.getElementById("cal-month-label");
  const calPrevBtn = document.getElementById("cal-prev");
  const calNextBtn = document.getElementById("cal-next");
  const calClearBtn = document.getElementById("cal-clear");

  const dayFilterBanner = document.getElementById("day-filter-banner");
  const dayFilterLabel = document.getElementById("day-filter-label");
  const dayFilterClearInline = document.getElementById("day-filter-clear-inline");

  // ---------------------------------------------------------------
  // Utilidades de fecha
  // ---------------------------------------------------------------
  function todayISODate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toISODate(d);
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDate(isoDate) {
    if (!isoDate) return "Sin fecha";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  }

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const priorityLabels = { low: "Baja", medium: "Media", high: "Alta" };
  const priorityWeight = { low: 1, medium: 2, high: 3 };

  function showStatus(message, type = "danger") {
    statusAlert.textContent = message;
    statusAlert.className = `alert alert-${type}`;
    window.clearTimeout(showStatus._t);
    showStatus._t = window.setTimeout(() => {
      statusAlert.className = "alert d-none";
    }, 4000);
  }

  // ---------------------------------------------------------------
  // Sesión: proteger la página y mostrar datos del usuario
  // ---------------------------------------------------------------
  async function requireSession() {
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
      window.location.replace("login.html");
      return null;
    }
    return data.session.user;
  }

  function renderUser(user) {
    const meta = user.user_metadata || {};
    const nombre = meta.nombre || "";
    const apellido = meta.apellido || "";
    const display = (nombre || apellido)
      ? `${nombre} ${apellido}`.trim()
      : user.email;
    userNameEl.textContent = display;
  }

  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });

  // ---------------------------------------------------------------
  // Validación de datos del formulario
  // ---------------------------------------------------------------
  function validateForm() {
    let valid = true;

    const title = titleInput.value.trim();
    if (!title) {
      titleInput.classList.add("is-invalid");
      valid = false;
    } else {
      titleInput.classList.remove("is-invalid");
    }

    const deadline = deadlineInput.value;
    if (deadline && deadline < todayISODate()) {
      deadlineInput.classList.add("is-invalid");
      valid = false;
    } else {
      deadlineInput.classList.remove("is-invalid");
    }

    return valid;
  }

  // ---------------------------------------------------------------
  // Operaciones CRUD contra Supabase
  // ---------------------------------------------------------------
  async function loadTasks() {
    const { data, error } = await supabaseClient
      .from(TASKS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showStatus(`No se pudieron cargar las tareas: ${error.message}`);
      return;
    }

    tasks = data;
    render();
  }

  async function createTask({ title, description, deadline, priority }) {
    setFormLoading(true);

    const { error } = await supabaseClient.from(TASKS_TABLE).insert({
      user_id: currentUser.id,
      title: title.trim(),
      description: description.trim(),
      deadline: deadline || null,
      priority: priority || "medium",
    });

    setFormLoading(false);

    if (error) {
      showStatus(`No se pudo crear la tarea: ${error.message}`);
      return;
    }

    await loadTasks();
  }

  async function toggleTaskCompleted(id, completed) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, completed } : t));
    render();

    const { error } = await supabaseClient
      .from(TASKS_TABLE)
      .update({ completed })
      .eq("id", id);

    if (error) {
      showStatus(`No se pudo actualizar la tarea: ${error.message}`);
      await loadTasks();
    }
  }

  async function deleteTask(id) {
    const previous = tasks;
    tasks = tasks.filter((t) => t.id !== id);
    render();

    const { error } = await supabaseClient
      .from(TASKS_TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      showStatus(`No se pudo eliminar la tarea: ${error.message}`);
      tasks = previous;
      render();
    }
  }

  function setFormLoading(loading) {
    formSubmitBtn.disabled = loading;
    formSubmitBtn.innerHTML = loading
      ? '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...'
      : '<i class="bi bi-plus-lg"></i> Agregar tarea';
  }

  // ---------------------------------------------------------------
  // Filtro y orden
  // ---------------------------------------------------------------
  function getVisibleTasks() {
    let visible = tasks.slice();

    if (currentFilter === "pending") {
      visible = visible.filter((t) => !t.completed);
    } else if (currentFilter === "completed") {
      visible = visible.filter((t) => t.completed);
    }

    if (selectedDay) {
      visible = visible.filter((t) => t.deadline === selectedDay);
    }

    switch (currentSort) {
      case "deadline_asc":
        visible.sort((a, b) => {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        });
        break;
      case "priority_desc":
        visible.sort(
          (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]
        );
        break;
      case "created_desc":
      default:
        visible.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
    }

    return visible;
  }

  // ---------------------------------------------------------------
  // Render de tareas
  // ---------------------------------------------------------------
  function render() {
    const visible = getVisibleTasks();

    taskList.innerHTML = "";
    emptyState.classList.toggle("d-none", visible.length > 0);

    for (const task of visible) {
      taskList.appendChild(buildTaskElement(task));
    }

    const pendingCount = tasks.filter((t) => !t.completed).length;
    taskCountBadge.textContent = `${pendingCount}`;

    renderDayFilterBanner();
    renderCalendar();
  }

  function buildTaskElement(task) {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);

    node.dataset.id = task.id;
    node.classList.toggle("completed", task.completed);

    const checkbox = node.querySelector(".task-checkbox");
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () =>
      toggleTaskCompleted(task.id, checkbox.checked)
    );

    node.querySelector(".task-title").textContent = task.title;

    const descEl = node.querySelector(".task-description");
    if (task.description) {
      descEl.textContent = task.description;
    } else {
      descEl.remove();
    }

    const priorityPill = node.querySelector(".priority-pill");
    priorityPill.textContent = priorityLabels[task.priority] || "Media";
    priorityPill.classList.add(`priority-${task.priority}`);

    const statusBadge = node.querySelector(".status-badge");
    statusBadge.textContent = task.completed ? "Completada" : "Pendiente";
    statusBadge.classList.toggle("status-badge-pending", !task.completed);
    statusBadge.classList.toggle("status-badge-done", task.completed);

    node.querySelector(".task-created span").textContent = formatDate(
      task.created_at.slice(0, 10)
    );

    const deadlineWrap = node.querySelector(".task-deadline");
    const deadlineSpan = deadlineWrap.querySelector("span");
    deadlineSpan.textContent = formatDate(task.deadline);
    if (task.deadline && task.deadline < todayISODate() && !task.completed) {
      deadlineWrap.classList.add("overdue");
    }

    node.querySelector(".task-delete").addEventListener("click", () => {
      const confirmed = confirm(`¿Eliminar la tarea "${task.title}"?`);
      if (confirmed) deleteTask(task.id);
    });

    return node;
  }

  // ---------------------------------------------------------------
  // Mini calendario
  // ---------------------------------------------------------------
  function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    calMonthLabel.textContent = `${monthNames[month]} ${year}`;

    // Días con al menos una tarea (deadline), para pintar el puntico.
    const daysWithTasks = new Set(
      tasks.filter((t) => t.deadline).map((t) => t.deadline)
    );

    const firstOfMonth = new Date(year, month, 1);
    // Lunes = 0 ... Domingo = 6 (para que la semana empiece en lunes)
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = todayISODate();

    calGrid.innerHTML = "";

    // Celdas vacías antes del día 1
    for (let i = 0; i < firstWeekday; i++) {
      const empty = document.createElement("span");
      empty.className = "calendar-day calendar-day-empty";
      calGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toISODate(new Date(year, month, day));

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar-day";
      cell.textContent = day;

      if (iso === today) cell.classList.add("is-today");
      if (iso === selectedDay) cell.classList.add("is-selected");

      if (daysWithTasks.has(iso)) {
        const dot = document.createElement("span");
        dot.className = "calendar-dot";
        cell.appendChild(dot);
      }

      cell.addEventListener("click", () => {
        selectedDay = selectedDay === iso ? null : iso;
        render();
      });

      calGrid.appendChild(cell);
    }
  }

  function renderDayFilterBanner() {
    const hasDay = Boolean(selectedDay);
    dayFilterBanner.classList.toggle("d-none", !hasDay);
    calClearBtn.classList.toggle("d-none", !hasDay);
    if (hasDay) {
      dayFilterLabel.textContent = formatDate(selectedDay);
    }
  }

  calPrevBtn.addEventListener("click", () => {
    calendarViewDate = new Date(
      calendarViewDate.getFullYear(),
      calendarViewDate.getMonth() - 1,
      1
    );
    renderCalendar();
  });

  calNextBtn.addEventListener("click", () => {
    calendarViewDate = new Date(
      calendarViewDate.getFullYear(),
      calendarViewDate.getMonth() + 1,
      1
    );
    renderCalendar();
  });

  function clearDayFilter() {
    selectedDay = null;
    render();
  }

  calClearBtn.addEventListener("click", clearDayFilter);
  dayFilterClearInline.addEventListener("click", clearDayFilter);

  // ---------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    createTask({
      title: titleInput.value,
      description: descriptionInput.value,
      deadline: deadlineInput.value,
      priority: priorityInput.value,
    });

    form.reset();
    priorityInput.value = "medium";
    titleInput.focus();
  });

  filterRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      currentFilter = e.target.value;
      render();
    });
  });

  sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    render();
  });

  // ---------------------------------------------------------------
  // Inicio: exige sesión antes de cargar cualquier tarea
  // ---------------------------------------------------------------
  (async function init() {
    currentUser = await requireSession();
    if (!currentUser) return; // ya redirigido a login.html

    renderUser(currentUser);
    await loadTasks();

    supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.location.replace("login.html");
      }
    });
  })();
})();
