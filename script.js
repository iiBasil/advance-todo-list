/* =========================================================
   TaskFlow — script.js
   Vanilla JS To-Do List with LocalStorage
   ========================================================= */

// ─── State ───────────────────────────────────────────────
// tasks: array of task objects
// currentFilter: which tab is active ('all' | 'active' | 'completed')
let tasks = [];
let currentFilter = 'all';

// ─── DOM References ──────────────────────────────────────
const taskForm      = document.getElementById('addTaskForm');
const taskInput     = document.getElementById('taskInput');
const errorMsg      = document.getElementById('errorMsg');
const taskList      = document.getElementById('taskList');
const emptyState    = document.getElementById('emptyState');
const taskCounter   = document.getElementById('taskCounter');
const activeCount   = document.getElementById('activeCount');
const appFooter     = document.getElementById('appFooter');
const filterBtns    = document.querySelectorAll('.filter-btn');
const clearBtn      = document.getElementById('clearCompleted');

// ─── Init ─────────────────────────────────────────────────
// Load saved tasks from LocalStorage when the page loads
function init() {
  const saved = localStorage.getItem('taskflow_tasks');
  if (saved) {
    tasks = JSON.parse(saved);
  }
  render();
}

// ─── LocalStorage ────────────────────────────────────────
// Save the current tasks array to LocalStorage
function saveTasks() {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

// ─── Unique ID ───────────────────────────────────────────
// Generate a simple unique ID using timestamp + random number
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Add Task ────────────────────────────────────────────
taskForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const text = taskInput.value.trim();

  // Edge case: empty input
  if (!text) {
    showError('Please enter a task before adding.');
    return;
  }

  // Edge case: duplicate task (case-insensitive check)
  const isDuplicate = tasks.some(
    (t) => t.text.toLowerCase() === text.toLowerCase()
  );
  if (isDuplicate) {
    showError('This task already exists.');
    return;
  }

  // Create a new task object
  const newTask = {
    id: generateId(),
    text: text,
    completed: false,
    createdAt: Date.now(),
  };

  tasks.unshift(newTask); // Add to beginning of array
  saveTasks();
  taskInput.value = '';
  clearError();
  render();
});

// ─── Delete Task ─────────────────────────────────────────
function deleteTask(id) {
  // Find the list item element and animate it out before removing
  const li = taskList.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.classList.add('removing');
    // Wait for CSS transition to finish, then remove from data + re-render
    li.addEventListener('transitionend', () => {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      render();
    }, { once: true });
  }
}

// ─── Toggle Completed ────────────────────────────────────
function toggleTask(id) {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  saveTasks();
  render();
}

// ─── Edit Task ───────────────────────────────────────────
// Switch a task row into edit mode (show input instead of text)
function enterEditMode(id) {
  const li = taskList.querySelector(`[data-id="${id}"]`);
  if (!li) return;

  const textEl  = li.querySelector('.task-text');
  const actions = li.querySelector('.task-actions');
  const task    = tasks.find((t) => t.id === id);

  // Build inline input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-edit-input';
  input.value = task.text;
  input.maxLength = 120;

  // Replace text element with input
  textEl.replaceWith(input);
  input.focus();
  input.select();

  // Update action buttons to show Save + Cancel
  actions.innerHTML = `
    <button class="action-btn save" title="Save" aria-label="Save task">💾</button>
    <button class="action-btn delete" title="Cancel" aria-label="Cancel edit">✕</button>
  `;

  // Save on save button click
  actions.querySelector('.save').addEventListener('click', () => {
    saveEdit(id, input.value);
  });

  // Cancel on cancel button click — just re-render
  actions.querySelector('.delete').addEventListener('click', () => {
    render();
  });

  // Also save when user presses Enter or cancels with Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  saveEdit(id, input.value);
    if (e.key === 'Escape') render();
  });
}

// Commit the edit
function saveEdit(id, newText) {
  const trimmed = newText.trim();

  // Edge case: empty text — don't allow saving blank
  if (!trimmed) {
    showError('Task text cannot be empty.');
    return;
  }

  // Edge case: duplicate (ignore if it's the same task)
  const isDuplicate = tasks.some(
    (t) => t.id !== id && t.text.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) {
    showError('Another task with this name already exists.');
    return;
  }

  tasks = tasks.map((t) =>
    t.id === id ? { ...t, text: trimmed } : t
  );
  saveTasks();
  clearError();
  render();
}

// ─── Clear Completed ─────────────────────────────────────
clearBtn.addEventListener('click', () => {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  render();
});

// ─── Filter ──────────────────────────────────────────────
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;

    // Update active class on tabs
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    render();
  });
});

// ─── Error Helpers ───────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  // Auto-clear after 3 seconds
  clearTimeout(showError._timer);
  showError._timer = setTimeout(clearError, 3000);
}

function clearError() {
  errorMsg.textContent = '';
}

// ─── Render ──────────────────────────────────────────────
// Main render function — rebuilds the task list based on current state
function render() {
  // Filter tasks based on the active tab
  const filtered = tasks.filter((t) => {
    if (currentFilter === 'active')    return !t.completed;
    if (currentFilter === 'completed') return  t.completed;
    return true; // 'all'
  });

  // Clear the list
  taskList.innerHTML = '';

  // Show empty state if no tasks match the current filter
  if (filtered.length === 0) {
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;

    // Build each task item
    filtered.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' completed' : '');
      li.dataset.id = task.id;

      li.innerHTML = `
        <input
          type="checkbox"
          class="task-checkbox"
          ${task.completed ? 'checked' : ''}
          aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}"
        />
        <span class="task-text">${escapeHtml(task.text)}</span>
        <div class="task-actions">
          <button class="action-btn edit" title="Edit task" aria-label="Edit task">✏️</button>
          <button class="action-btn delete" title="Delete task" aria-label="Delete task">🗑️</button>
        </div>
      `;

      // Checkbox: toggle completion
      li.querySelector('.task-checkbox').addEventListener('change', () => {
        toggleTask(task.id);
      });

      // Edit button
      li.querySelector('.action-btn.edit').addEventListener('click', () => {
        enterEditMode(task.id);
      });

      // Delete button
      li.querySelector('.action-btn.delete').addEventListener('click', () => {
        deleteTask(task.id);
      });

      taskList.appendChild(li);
    });
  }

  // Update counters
  updateCounters();
}

// ─── Update Counters ─────────────────────────────────────
function updateCounters() {
  const totalCount  = tasks.length;
  const activeItems = tasks.filter((t) => !t.completed).length;
  const completedItems = tasks.filter((t) => t.completed).length;

  // Header counter
  taskCounter.textContent = totalCount === 1 ? '1 task' : `${totalCount} tasks`;

  // Footer
  if (totalCount === 0) {
    appFooter.hidden = true;
  } else {
    appFooter.hidden = false;
    activeCount.textContent = activeItems === 1 ? '1 left' : `${activeItems} left`;

    // Hide "Clear completed" button if no completed tasks
    clearBtn.style.visibility = completedItems > 0 ? 'visible' : 'hidden';
  }
}

// ─── Security: Escape HTML ───────────────────────────────
// Prevents XSS — converts special characters before inserting into DOM
function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ─── Start the app ───────────────────────────────────────
init();
