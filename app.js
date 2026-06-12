const STORAGE_KEY = "today-todos";

const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoList = document.querySelector("#todo-list");
const todoTemplate = document.querySelector("#todo-template");
const todoSummary = document.querySelector("#todo-summary");
const emptyState = document.querySelector("#empty-state");
const clearCompletedButton = document.querySelector("#clear-completed");
const dateBadge = document.querySelector("#date-badge");

let todos = loadTodos();

function loadTodos() {
  try {
    const savedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedTodos) ? savedTodos : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function createTodo(text) {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now(),
  };
}

function renderTodos() {
  todoList.replaceChildren();

  for (const todo of todos) {
    const fragment = todoTemplate.content.cloneNode(true);
    const listItem = fragment.querySelector(".todo-item");
    const checkbox = fragment.querySelector(".todo-checkbox");
    const todoText = fragment.querySelector(".todo-text");
    const deleteButton = fragment.querySelector(".delete-button");

    listItem.dataset.id = todo.id;
    listItem.classList.toggle("completed", todo.completed);
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `将“${todo.text}”标记为${todo.completed ? "未完成" : "已完成"}`);
    todoText.textContent = todo.text;
    deleteButton.setAttribute("aria-label", `删除“${todo.text}”`);

    todoList.append(fragment);
  }

  updateStatus();
}

function updateStatus() {
  const remainingCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - remainingCount;

  if (todos.length === 0) {
    todoSummary.textContent = "暂无待办";
  } else if (remainingCount === 0) {
    todoSummary.textContent = `全部完成，共 ${todos.length} 项`;
  } else {
    todoSummary.textContent = `还剩 ${remainingCount} 项，共 ${todos.length} 项`;
  }

  emptyState.classList.toggle("hidden", todos.length > 0);
  clearCompletedButton.classList.toggle("visible", completedCount > 0);
}

function addTodo(text) {
  todos.unshift(createTodo(text));
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

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = todoInput.value.trim();

  if (!text) {
    todoInput.focus();
    return;
  }

  addTodo(text);
  todoForm.reset();
  todoInput.focus();
});

todoList.addEventListener("change", (event) => {
  if (!event.target.matches(".todo-checkbox")) {
    return;
  }

  const listItem = event.target.closest(".todo-item");
  toggleTodo(listItem.dataset.id);
});

todoList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-button");

  if (!deleteButton) {
    return;
  }

  const listItem = deleteButton.closest(".todo-item");
  deleteTodo(listItem.dataset.id);
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
