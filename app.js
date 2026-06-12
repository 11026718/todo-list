const STORAGE_KEY = "today-todos";

const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const dueDateInput = document.querySelector("#due-date-input");
const keywordSearchInput = document.querySelector("#keyword-search-input");
const todoList = document.querySelector("#todo-list");
const todoTemplate = document.querySelector("#todo-template");
const todoSummary = document.querySelector("#todo-summary");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyMessage = document.querySelector("#empty-message");
const todoFilters = document.querySelector("#todo-filters");
const dateFilterInput = document.querySelector("#date-filter-input");
const clearDateFilterButton = document.querySelector("#clear-date-filter");
const statisticsFilters = document.querySelector("#statistics-filters");
const statTotal = document.querySelector("#stat-total");
const statCompleted = document.querySelector("#stat-completed");
const statActive = document.querySelector("#stat-active");
const statOverdue = document.querySelector("#stat-overdue");
const clearCompletedButton = document.querySelector("#clear-completed");
const dateBadge = document.querySelector("#date-badge");

let todos = loadTodos();
let currentFilter = "all";
let currentDateFilter = "";
let currentKeyword = "";
let currentStatisticsRange = "all";

function loadTodos() {
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);

    if (savedValue === null) {
      return [];
    }

    const savedTodos = JSON.parse(savedValue);

    if (!Array.isArray(savedTodos) || !savedTodos.every(isValidTodo)) {
      return [];
    }

    return savedTodos.map((todo) => ({
      ...todo,
      dueDate: todo.dueDate || "",
    }));
  } catch {
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch {
    return false;
  }
}

function isValidDateString(value) {
  if (value === "" || value === undefined) {
    return true;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}

function isValidTodo(todo) {
  const createdDate = new Date(todo?.createdAt);

  return todo !== null &&
    typeof todo === "object" &&
    typeof todo.id === "string" &&
    todo.id.length > 0 &&
    typeof todo.text === "string" &&
    todo.text.trim().length > 0 &&
    typeof todo.completed === "boolean" &&
    Number.isFinite(todo.createdAt) &&
    !Number.isNaN(createdDate.getTime()) &&
    isValidDateString(todo.dueDate);
}

function createTodo(text, dueDate) {
  return {
    id: crypto.randomUUID(),
    text,
    dueDate,
    completed: false,
    createdAt: Date.now(),
  };
}

function getDaysUntilDue(dueDate) {
  const [year, month, day] = dueDate.split("-").map(Number);
  const dueTime = new Date(year, month - 1, day).setHours(0, 0, 0, 0);
  const todayTime = new Date().setHours(0, 0, 0, 0);
  return Math.round((dueTime - todayTime) / 86400000);
}

function formatDueDate(dueDate) {
  const [year, month, day] = dueDate.split("-").map(Number);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function renderTodos() {
  todoList.replaceChildren();
  const visibleTodos = todos.filter((todo) => {
    const matchesStatus =
      currentFilter === "active" ? !todo.completed :
      currentFilter === "completed" ? todo.completed :
      true;
    const matchesDate = !currentDateFilter || todo.dueDate === currentDateFilter;
    const matchesKeyword = todo.text.toLocaleLowerCase("zh-CN").includes(currentKeyword);

    return matchesStatus && matchesDate && matchesKeyword;
  }).sort((firstTodo, secondTodo) => {
    if (!firstTodo.dueDate && !secondTodo.dueDate) {
      return secondTodo.createdAt - firstTodo.createdAt;
    }

    if (!firstTodo.dueDate) {
      return 1;
    }

    if (!secondTodo.dueDate) {
      return -1;
    }

    return firstTodo.dueDate.localeCompare(secondTodo.dueDate) ||
      secondTodo.createdAt - firstTodo.createdAt;
  });

  for (const todo of visibleTodos) {
    const fragment = todoTemplate.content.cloneNode(true);
    const listItem = fragment.querySelector(".todo-item");
    const checkbox = fragment.querySelector(".todo-checkbox");
    const todoText = fragment.querySelector(".todo-text");
    const dueDate = fragment.querySelector(".todo-due-date");
    const deleteButton = fragment.querySelector(".delete-button");

    listItem.dataset.id = todo.id;
    listItem.classList.toggle("completed", todo.completed);
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `将“${todo.text}”标记为${todo.completed ? "未完成" : "已完成"}`);
    todoText.textContent = todo.text;
    deleteButton.setAttribute("aria-label", `删除“${todo.text}”`);

    if (todo.dueDate) {
      const daysUntilDue = getDaysUntilDue(todo.dueDate);
      dueDate.textContent = `截止：${formatDueDate(todo.dueDate)}`;

      if (!todo.completed) {
        listItem.classList.toggle("overdue", daysUntilDue < 0);
        listItem.classList.toggle("due-today", daysUntilDue === 0);
        listItem.classList.toggle("due-soon", daysUntilDue > 0 && daysUntilDue <= 3);
        listItem.classList.toggle("due-upcoming", daysUntilDue > 3 && daysUntilDue <= 7);

        if (daysUntilDue < 0) {
          dueDate.textContent += `（已过期 ${Math.abs(daysUntilDue)} 天）`;
        } else if (daysUntilDue === 0) {
          dueDate.textContent += "（今天到期）";
        } else if (daysUntilDue <= 7) {
          dueDate.textContent += `（还剩 ${daysUntilDue} 天）`;
        }
      }
    } else {
      dueDate.textContent = "添加截止日期";
      dueDate.classList.add("no-due-date");
    }

    dueDate.setAttribute("title", "点击修改截止日期");
    todoList.append(fragment);
  }

  updateStatus(visibleTodos.length);
  renderStatistics();
}

function updateStatus(visibleCount) {
  const remainingCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - remainingCount;

  if (todos.length === 0) {
    todoSummary.textContent = "暂无待办";
  } else if (remainingCount === 0) {
    todoSummary.textContent = `全部完成，共 ${todos.length} 项`;
  } else {
    todoSummary.textContent = `还剩 ${remainingCount} 项，共 ${todos.length} 项`;
  }

  if (todos.length === 0) {
    emptyTitle.textContent = "清单空空如也";
    emptyMessage.textContent = "添加一件小事，开始今天的进度。";
  } else if (currentKeyword) {
    emptyTitle.textContent = "没有找到相关事项";
    emptyMessage.textContent = "请尝试其他关键词或调整筛选条件。";
  } else if (currentDateFilter) {
    emptyTitle.textContent = "该日期没有事项";
    emptyMessage.textContent = "请选择其他截止日期或清除日期查询。";
  } else if (currentFilter === "active") {
    emptyTitle.textContent = "没有未完成事项";
    emptyMessage.textContent = "所有待办都已经完成。";
  } else {
    emptyTitle.textContent = "没有已完成事项";
    emptyMessage.textContent = "完成的待办会显示在这里。";
  }

  emptyState.classList.toggle("hidden", visibleCount > 0);
  clearCompletedButton.classList.toggle("visible", completedCount > 0);
}

function isInStatisticsRange(createdAt) {
  if (currentStatisticsRange === "all") {
    return true;
  }

  const createdDate = new Date(createdAt);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end;

  if (currentStatisticsRange === "day") {
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  } else if (currentStatisticsRange === "week") {
    const dayOfWeek = start.getDay() || 7;
    start.setDate(start.getDate() - dayOfWeek + 1);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else {
    start.setDate(1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }

  return createdDate >= start && createdDate < end;
}

function renderStatistics() {
  const scopedTodos = todos.filter((todo) => isInStatisticsRange(todo.createdAt));
  const completedCount = scopedTodos.filter((todo) => todo.completed).length;
  const activeCount = scopedTodos.length - completedCount;
  const overdueCount = scopedTodos.filter((todo) =>
    !todo.completed && todo.dueDate && getDaysUntilDue(todo.dueDate) < 0
  ).length;

  statTotal.textContent = scopedTodos.length;
  statCompleted.textContent = completedCount;
  statActive.textContent = activeCount;
  statOverdue.textContent = overdueCount;
}

function addTodo(text, dueDate) {
  todos.unshift(createTodo(text, dueDate));
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
}

function updateTodoText(id, text) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, text } : todo
  );
  saveTodos();
  renderTodos();
}

function updateTodoDueDate(id, dueDate) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, dueDate } : todo
  );
  saveTodos();
  renderTodos();
}

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = todoInput.value.trim();
  const dueDate = dueDateInput.value;

  if (!text) {
    todoInput.focus();
    return;
  }

  addTodo(text, dueDate);
  todoForm.reset();
  todoInput.focus();
});

todoList.addEventListener("change", (event) => {
  if (event.target.matches(".due-date-edit-input")) {
    const listItem = event.target.closest(".todo-item");
    updateTodoDueDate(listItem.dataset.id, event.target.value);
    return;
  }

  if (!event.target.matches(".todo-checkbox")) {
    return;
  }

  const listItem = event.target.closest(".todo-item");
  toggleTodo(listItem.dataset.id);
});

todoList.addEventListener("click", (event) => {
  const removeDueDateButton = event.target.closest(".remove-due-date");

  if (removeDueDateButton) {
    const listItem = removeDueDateButton.closest(".todo-item");
    updateTodoDueDate(listItem.dataset.id, "");
    return;
  }

  const dueDate = event.target.closest(".todo-due-date");

  if (dueDate) {
    const listItem = dueDate.closest(".todo-item");
    const todo = todos.find((item) => item.id === listItem.dataset.id);
    const editor = document.createElement("div");
    const editInput = document.createElement("input");
    const removeButton = document.createElement("button");

    editor.className = "due-date-editor";
    editInput.className = "due-date-edit-input";
    editInput.type = "date";
    editInput.value = todo.dueDate || "";
    editInput.setAttribute("aria-label", "修改截止日期");
    removeButton.className = "remove-due-date";
    removeButton.type = "button";
    removeButton.textContent = "移除日期";

    editor.append(editInput, removeButton);
    dueDate.replaceWith(editor);
    editInput.focus();
    return;
  }

  const deleteButton = event.target.closest(".delete-button");

  if (!deleteButton) {
    return;
  }

  const listItem = deleteButton.closest(".todo-item");
  deleteTodo(listItem.dataset.id);
});

todoList.addEventListener("dblclick", (event) => {
  const todoText = event.target.closest(".todo-text");

  if (!todoText) {
    return;
  }

  const editInput = document.createElement("input");

  editInput.className = "todo-edit-input";
  editInput.type = "text";
  editInput.value = todoText.textContent;
  editInput.setAttribute("aria-label", "编辑待办事项");
  todoText.replaceWith(editInput);
  editInput.focus();
  editInput.select();
});

todoList.addEventListener("keydown", (event) => {
  if (event.target.matches(".due-date-edit-input")) {
    if (event.key === "Escape") {
      renderTodos();
    }
    return;
  }

  if (!event.target.matches(".todo-edit-input")) {
    return;
  }

  if (event.key === "Escape") {
    renderTodos();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  const text = event.target.value.trim();

  if (!text) {
    event.target.setCustomValidity("待办内容不能为空");
    event.target.reportValidity();
    return;
  }

  const listItem = event.target.closest(".todo-item");
  updateTodoText(listItem.dataset.id, text);
});

todoList.addEventListener("input", (event) => {
  if (event.target.matches(".todo-edit-input")) {
    event.target.setCustomValidity("");
  }
});

todoList.addEventListener("focusout", (event) => {
  if (event.target.matches(".due-date-edit-input")) {
    const editor = event.target.closest(".due-date-editor");

    if (!editor.contains(event.relatedTarget)) {
      renderTodos();
    }
    return;
  }

  if (event.target.matches(".todo-edit-input")) {
    renderTodos();
  }
});

todoFilters.addEventListener("click", (event) => {
  const filterButton = event.target.closest(".filter-button");

  if (!filterButton) {
    return;
  }

  currentFilter = filterButton.dataset.filter;

  for (const button of todoFilters.querySelectorAll(".filter-button")) {
    const isActive = button === filterButton;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  renderTodos();
});

keywordSearchInput.addEventListener("input", () => {
  currentKeyword = keywordSearchInput.value.trim().toLocaleLowerCase("zh-CN");
  renderTodos();
});

dateFilterInput.addEventListener("change", () => {
  currentDateFilter = dateFilterInput.value;
  renderTodos();
});

clearDateFilterButton.addEventListener("click", () => {
  dateFilterInput.value = "";
  currentDateFilter = "";
  renderTodos();
});

statisticsFilters.addEventListener("click", (event) => {
  const rangeButton = event.target.closest(".statistics-filter");

  if (!rangeButton) {
    return;
  }

  currentStatisticsRange = rangeButton.dataset.range;

  for (const button of statisticsFilters.querySelectorAll(".statistics-filter")) {
    const isActive = button === rangeButton;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  renderStatistics();
});

clearCompletedButton.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.completed);
  saveTodos();
  renderTodos();
});

dateBadge.textContent = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "short",
}).format(new Date());

renderTodos();
