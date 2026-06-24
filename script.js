// ─── Configuração central (fonte única de verdade) ───────────────────────────

const CATEGORIES = {
  'Estudos':  { emoji: '📚' },
  'Trabalho': { emoji: '💼' },
  'Pessoal':  { emoji: '🏠' },
};

const PRIORITIES = {
  'Alta':  { emoji: '🔴', cls: 'priority-high' },
  'Média': { emoji: '🟡', cls: 'priority-medium' },
  'Baixa': { emoji: '🟢', cls: 'priority-low' },
};

const PRIORITY_ORDER = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };

// ─── Elementos DOM ────────────────────────────────────────────────────────────

const taskInput    = document.getElementById('taskInput');
const addBtn       = document.getElementById('addBtn');
const cancelEditBtn= document.getElementById('cancelEditBtn');
const taskList     = document.getElementById('taskList');
const taskCount    = document.getElementById('taskCount');
const categorySelect = document.getElementById('category');
const prioritySelect = document.getElementById('priority');
const deadlineInput  = document.getElementById('deadline');
const themeToggle  = document.getElementById('themeToggle');
const filterButtons= document.querySelectorAll('.filter-btn');
const searchInput  = document.getElementById('searchInput');
const modal        = document.getElementById('modal');
const modalMessage = document.getElementById('modalMessage');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel  = document.getElementById('modalCancel');

// ─── Estado ───────────────────────────────────────────────────────────────────

let currentFilter  = 'all';
let editingId      = null;
let tasks          = JSON.parse(localStorage.getItem('tasks')) || [];

// ─── Inicialização dos <select> via config ────────────────────────────────────

function populateSelects() {
  Object.entries(CATEGORIES).forEach(([name, { emoji }]) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${emoji} ${name}`;
    categorySelect.appendChild(opt);
  });

  Object.entries(PRIORITIES).forEach(([name, { emoji }]) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${emoji} ${name}`;
    prioritySelect.appendChild(opt);
  });
}

// ─── Persistência ─────────────────────────────────────────────────────────────

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ─── Tema ─────────────────────────────────────────────────────────────────────

function applyTheme() {
  const dark = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark', dark);
  themeToggle.textContent = dark ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
  const dark = localStorage.getItem('darkMode') === 'true';
  localStorage.setItem('darkMode', !dark);
  applyTheme();
});

// ─── Modal de confirmação ─────────────────────────────────────────────────────

function showModal(message, onConfirm) {
  modalMessage.textContent = message;
  modal.classList.remove('hidden');
  taskList.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    modal.classList.add('hidden');
    taskList.removeAttribute('aria-hidden');
    modalConfirm.removeEventListener('click', confirm);
    modalCancel.removeEventListener('click', cancel);
  };

  const confirm = () => { cleanup(); onConfirm(); };
  const cancel  = () => cleanup();

  modalConfirm.addEventListener('click', confirm);
  modalCancel .addEventListener('click', cancel);
}

modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.add('hidden');
});

// ─── Filtros e busca ──────────────────────────────────────────────────────────

function getFilteredTasks() {
  const q = searchInput.value.trim().toLowerCase();

  return tasks.filter(task => {
    const matchFilter =
      currentFilter === 'all' ||
      (currentFilter === 'pending'   && !task.completed) ||
      (currentFilter === 'completed' &&  task.completed);

    const matchSearch = !q || task.text.toLowerCase().includes(q);

    return matchFilter && matchSearch;
  });
}

// ─── Ordenação ────────────────────────────────────────────────────────────────

function sortTasks() {
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed - b.completed;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function formatDeadline(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < today;
}

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderTasks() {
  taskList.innerHTML = '';

  const filtered = getFilteredTasks();
  const pending  = tasks.filter(t => !t.completed).length;
  taskCount.textContent = `Tarefas pendentes: ${pending}`;

  if (filtered.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-message';
    p.textContent = searchInput.value.trim()
      ? 'Nenhuma tarefa encontrada para esta busca.'
      : 'Nenhuma tarefa aqui ainda.';
    taskList.appendChild(p);
    return;
  }

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.classList.add(PRIORITIES[task.priority]?.cls || 'priority-low');
    if (task.completed) li.classList.add('completed');

    // ── texto seguro (sem XSS) ──
    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    taskText.textContent = task.text;  // textContent → sem XSS

    // ── badges ──
    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const badgeCat = document.createElement('span');
    badgeCat.textContent = `${CATEGORIES[task.category]?.emoji ?? ''} ${task.category}`;

    const badgePri = document.createElement('span');
    badgePri.textContent = `${PRIORITIES[task.priority]?.emoji ?? ''} ${task.priority}`;

    const badgeDate = document.createElement('span');
    badgeDate.textContent = `📅 ${task.createdAt}`;

    meta.append(badgeCat, badgePri, badgeDate);

    if (task.deadline) {
      const badgeDl = document.createElement('span');
      badgeDl.className = 'badge-deadline' + (isOverdue(task.deadline) && !task.completed ? ' overdue' : '');
      badgeDl.textContent = `⏰ ${formatDeadline(task.deadline)}`;
      meta.appendChild(badgeDl);
    }

    if (task.updatedAt) {
      const badgeUpd = document.createElement('span');
      badgeUpd.className = 'badge-updated';
      badgeUpd.textContent = `✏️ ${task.updatedAt}`;
      meta.appendChild(badgeUpd);
    }

    const info = document.createElement('div');
    info.className = 'task-info';
    info.append(taskText, meta);

    // ── botões ──
    const editBtn     = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', 'Editar tarefa');

    const completeBtn     = document.createElement('button');
    completeBtn.className = 'complete-btn';
    completeBtn.textContent = task.completed ? '↩️' : '✔️';
    completeBtn.setAttribute('aria-label', task.completed ? 'Reabrir tarefa' : 'Concluir tarefa');

    const deleteBtn     = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑️';
    deleteBtn.setAttribute('aria-label', 'Excluir tarefa');

    const buttons = document.createElement('div');
    buttons.className = 'task-buttons';
    buttons.append(editBtn, completeBtn, deleteBtn);

    li.append(info, buttons);

    // ── eventos ──
    editBtn.addEventListener('click', () => startEdit(task.id));

    completeBtn.addEventListener('click', () => {
      const t = tasks.find(t => t.id === task.id);
      if (t) { t.completed = !t.completed; saveTasks(); renderTasks(); }
    });

    deleteBtn.addEventListener('click', () => {
      showModal('Deseja excluir esta tarefa?', () => {
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks();
        renderTasks();
      });
    });

    taskList.appendChild(li);
  });
}

// ─── Edição ───────────────────────────────────────────────────────────────────

function startEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  taskInput.value        = task.text;
  categorySelect.value   = task.category;
  prioritySelect.value   = task.priority;
  deadlineInput.value    = task.deadline || '';
  editingId              = id;

  addBtn.textContent = '💾 Salvar edição';
  cancelEditBtn.classList.remove('hidden');
  taskInput.focus();
}

function cancelEdit() {
  editingId = null;
  addBtn.textContent = 'Adicionar';
  cancelEditBtn.classList.add('hidden');
  taskInput.value       = '';
  deadlineInput.value   = '';
  categorySelect.value  = Object.keys(CATEGORIES)[0];
  prioritySelect.value  = Object.keys(PRIORITIES)[0];
}

cancelEditBtn.addEventListener('click', cancelEdit);

// ─── Adicionar / Salvar ───────────────────────────────────────────────────────

function addTask() {
  const text = taskInput.value.trim();

  if (!text) {
    taskInput.focus();
    taskInput.style.borderColor = '#ef4444';
    setTimeout(() => taskInput.style.borderColor = '', 1200);
    return;
  }

  const now = new Date().toLocaleString('pt-BR');

  if (editingId !== null) {
    const task = tasks.find(t => t.id === editingId);
    if (task) {
      task.text      = text;
      task.category  = categorySelect.value;
      task.priority  = prioritySelect.value;
      task.deadline  = deadlineInput.value || null;
      task.updatedAt = now;
    }
    editingId = null;
    addBtn.textContent = 'Adicionar';
    cancelEditBtn.classList.add('hidden');
  } else {
    tasks.push({
      id:        generateId(),
      text,
      completed: false,
      category:  categorySelect.value,
      priority:  prioritySelect.value,
      deadline:  deadlineInput.value || null,
      createdAt: now,
      updatedAt: null,
    });
  }

  sortTasks();
  saveTasks();
  renderTasks();

  taskInput.value      = '';
  deadlineInput.value  = '';
  categorySelect.value = Object.keys(CATEGORIES)[0];
  prioritySelect.value = Object.keys(PRIORITIES)[0];
  taskInput.focus();
}

addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') addTask();
});

// ─── Filtros ──────────────────────────────────────────────────────────────────

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

// ─── Busca ────────────────────────────────────────────────────────────────────

searchInput.addEventListener('input', renderTasks);

// ─── Boot ─────────────────────────────────────────────────────────────────────

populateSelects();
applyTheme();
sortTasks();
renderTasks();
