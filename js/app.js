/**
 * CloudTasks - Etapa 1
 * Lógica de la aplicación en JavaScript puro.
 *
 * Persistencia: por ahora se usa localStorage como almacenamiento temporal.
 * En la Etapa 2 este módulo de almacenamiento se reemplazará por llamadas
 * a Supabase, manteniendo el resto de la aplicación (UI) sin cambios.
 */

(() => {
  "use strict";

  const STORAGE_KEY = "cloudtasks.tasks";

  // ---------------------------------------------------------------
  // Capa de datos (storage). Aislada para poder sustituirla por
  // Supabase en la Etapa 2 sin tocar el resto de la app.
  // ---------------------------------------------------------------
  const storage = {
    getAll() {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    },
    saveAll(tasks) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    },
  };

  // ---------------------------------------------------------------
  // Estado en memoria
  // ---------------------------------------------------------------
  let tasks = storage.getAll();
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

  const taskList = document.getElementById("task-list");
  const taskTemplate = document.getElementById("task-template");
  const emptyState = document.getElementById("empty-state");
  const taskCountBadge = document.getElementById("task-count");
  const sortSelect = document.getElementById("sort-select");
  const filterRadios = document.querySelectorAll('input[name="filter"]');

  // ---------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------
  function generateId() {
    return (crypto.randomUUID && crypto.randomUUID()) ||
      `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

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

  // ---------------------------------------------------------------
  // Validación de datos del formulario
  // ---------------------------------------------------------------
  function validateForm() {
    let valid = true;

    // Título obligatorio
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.classList.add("is-invalid");
      valid = false;
    } else {
      titleInput.classList.remove("is-invalid");
    }

    // Fecha límite no puede ser anterior a hoy (si se especifica)
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
  // Operaciones CRUD
  // ---------------------------------------------------------------
  function createTask({ title, description, deadline, priority }) {
    const newTask = {
      id: generateId(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      created_at: new Date().toISOString(),
      deadline: deadline || null,
      priority: priority || "medium",
    };
    tasks.push(newTask);
    persistAndRender();
  }

  function toggleTaskCompleted(id) {
    tasks = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    persistAndRender();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    persistAndRender();
  }

  function persistAndRender() {
    storage.saveAll(tasks);
    render();
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
    checkbox.addEventListener("change", () => toggleTaskCompleted(task.id));

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
    statusBadge.classList.toggle("text-bg-secondary", !task.completed);
    statusBadge.classList.toggle("text-bg-success", task.completed);

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
  // Inicio
  // ---------------------------------------------------------------
  render();
})();