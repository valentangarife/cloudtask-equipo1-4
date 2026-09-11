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

  // ---------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------
  function todayISODate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  function formatDate(isoDate) {
    if (!isoDate) return "Sin fecha";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  }

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
    // Actualización optimista para que la UI responda al instante.
    tasks = tasks.map((t) => (t.id === id ? { ...t, completed } : t));
    render();

    const { error } = await supabaseClient
      .from(TASKS_TABLE)
      .update({ completed })
      .eq("id", id);

    if (error) {
      showStatus(`No se pudo actualizar la tarea: ${error.message}`);
      await loadTasks(); // revertir con el estado real
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
  // Render
  // ---------------------------------------------------------------
  function render() {
    const visible = getVisibleTasks();

    taskList.innerHTML = "";
    emptyState.classList.toggle("d-none", visible.length > 0);

    for (const task of visible) {
      taskList.appendChild(buildTaskElement(task));
    }

    const pendingCount = tasks.filter((t) => !t.completed).length;
    taskCountBadge.textContent = `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} · ${tasks.length} total`;
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

    const priorityBadge = node.querySelector(".priority-badge");
    priorityBadge.textContent = priorityLabels[task.priority] || "Media";
    priorityBadge.classList.add(`priority-${task.priority}`);

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

    // Si la sesión se cierra en otra pestaña, saca al usuario de aquí también.
    supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.location.replace("login.html");
      }
    });
  })();
})();
