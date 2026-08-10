const API_BASE = 'http://localhost:5000/api';

// State Management
let state = {
  token: localStorage.getItem('bill_manager_token') || null,
  user: JSON.parse(localStorage.getItem('bill_manager_user')) || null,
  categories: [],
  bills: [],
  payments: [],
  notifications: [],
  currentMonth: new Date(),
  activePanel: 'dashboard'
};

// ==========================================
// API HELPER WRAPPERS
// ==========================================
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

// ==========================================
// VIEWS & NAVIGATION ROUTING
// ==========================================
function showView(viewId) {
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

function showPanel(panelId) {
  state.activePanel = panelId;
  document.querySelectorAll('.app-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  
  const targetPanel = document.getElementById(`${panelId}-panel`);
  if (targetPanel) targetPanel.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
  if (navBtn) navBtn.classList.add('active');

  document.getElementById('current-panel-title').textContent = panelId.charAt(0).toUpperCase() + panelId.slice(1);

  // Trigger refresh functions per panel
  if (panelId === 'dashboard') loadDashboard();
  if (panelId === 'bills') loadBillsTable();
  if (panelId === 'calendar') renderCalendar();
  if (panelId === 'history') loadPaymentsHistory();
  if (panelId === 'reports') loadReports();
  if (panelId === 'settings') loadSettings();
}

// ==========================================
// SESSION CHECK
// ==========================================
function checkSession() {
  if (state.token && state.user) {
    applyPreferences();
    showView('app-view');
    showPanel('dashboard');
    loadInitialData();
  } else {
    showView('splash-view');
  }
}

function applyPreferences() {
  if (state.user) {
    document.documentElement.setAttribute('data-theme', state.user.theme || 'dark');
    document.getElementById('app-user-name').textContent = state.user.name;
    document.getElementById('app-user-email').textContent = state.user.email;
    const initials = state.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('avatar-initials').textContent = initials;
  }
}

async function loadInitialData() {
  try {
    state.categories = await apiRequest('/categories');
    populateCategoryDropdowns();
    loadNotifications();
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }
}

// ==========================================
// AUTHENTICATION FLOW
// ==========================================
document.getElementById('get-started-btn').addEventListener('click', () => {
  showView('auth-view');
});

document.getElementById('go-to-signup').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-form-container').classList.add('hidden');
  document.getElementById('signup-form-container').classList.remove('hidden');
});

document.getElementById('go-to-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signup-form-container').classList.add('hidden');
  document.getElementById('login-form-container').classList.remove('hidden');
});

document.getElementById('forgot-password-link').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-form-container').classList.add('hidden');
  document.getElementById('forgot-form-container').classList.remove('hidden');
});

document.getElementById('back-to-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('forgot-form-container').classList.add('hidden');
  document.getElementById('otp-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.remove('hidden');
  document.getElementById('login-form-container').classList.remove('hidden');
});

// Login Form Submit
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  showAuthError('');

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password });
    saveSession(data.token, data.user);
  } catch (err) {
    showAuthError(err.message);
  }
});

// Signup Form Submit
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  showAuthError('');

  try {
    const data = await apiRequest('/auth/signup', 'POST', { name, email, password });
    saveSession(data.token, data.user);
  } catch (err) {
    showAuthError(err.message);
  }
});

// Forgot Password Form
document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  try {
    await apiRequest('/auth/forgot-password', 'POST', { email });
    document.getElementById('forgot-form').classList.add('hidden');
    document.getElementById('otp-form').classList.remove('hidden');
  } catch (err) {
    showAuthError(err.message);
  }
});

// OTP Verification Form
document.getElementById('otp-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;
  const otp = document.getElementById('otp-code').value;
  const newPassword = document.getElementById('otp-new-password').value;

  try {
    await apiRequest('/auth/verify-otp', 'POST', { email, otp, newPassword });
    showAuthSuccess('Password updated successfully. Logging in...');
    setTimeout(() => {
      document.getElementById('back-to-login').click();
    }, 2000);
  } catch (err) {
    showAuthError(err.message);
  }
});

function showAuthError(msg) {
  const errDiv = document.getElementById('auth-error');
  if (msg) {
    errDiv.textContent = msg;
    errDiv.classList.remove('hidden');
  } else {
    errDiv.classList.add('hidden');
  }
}

function showAuthSuccess(msg) {
  const successDiv = document.getElementById('auth-success');
  if (msg) {
    successDiv.textContent = msg;
    successDiv.classList.remove('hidden');
  } else {
    successDiv.classList.add('hidden');
  }
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('bill_manager_token', token);
  localStorage.setItem('bill_manager_user', JSON.stringify(user));
  applyPreferences();
  showView('app-view');
  showPanel('dashboard');
  loadInitialData();
}

document.getElementById('logout-btn').addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('bill_manager_token');
  localStorage.removeItem('bill_manager_user');
  showView('splash-view');
});

// ==========================================
// NOTIFICATIONS MANAGEMENT
// ==========================================
const bellBtn = document.getElementById('bell-btn');
const notifPopover = document.getElementById('notifications-popover');

bellBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  notifPopover.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  notifPopover.classList.add('hidden');
});

notifPopover.addEventListener('click', (e) => e.stopPropagation());

async function loadNotifications() {
  try {
    state.notifications = await apiRequest('/notifications');
    const unread = state.notifications.filter(n => !n.is_read);
    const badge = document.getElementById('notif-badge');
    
    if (unread.length > 0) {
      badge.textContent = unread.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    const listContainer = document.getElementById('notif-list');
    listContainer.innerHTML = '';
    
    if (state.notifications.length === 0) {
      listContainer.innerHTML = `<div class="empty-notif">No notifications</div>`;
      return;
    }

    state.notifications.forEach(n => {
      const div = document.createElement('div');
      div.className = `popover-item ${n.is_read ? '' : 'unread'}`;
      div.innerHTML = `
        <p>${n.message}</p>
        <span class="popover-item-time">${new Date(n.created_at).toLocaleDateString()}</span>
      `;
      div.addEventListener('click', () => markNotificationRead(n.id));
      listContainer.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

async function markNotificationRead(id) {
  try {
    await apiRequest(`/notifications/${id}/read`, 'PUT');
    loadNotifications();
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('mark-all-read-btn').addEventListener('click', async () => {
  try {
    await apiRequest('/notifications/read-all', 'PUT');
    loadNotifications();
  } catch (err) {
    console.error(err);
  }
});

// ==========================================
// CATEGORIES POPULATOR
// ==========================================
function populateCategoryDropdowns() {
  const catFilter = document.getElementById('filter-category');
  const catForm = document.getElementById('form-bill-category');

  catFilter.innerHTML = '<option value="">All Categories</option>';
  catForm.innerHTML = '<option value="" disabled selected>Select Category</option>';

  state.categories.forEach(cat => {
    catFilter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    catForm.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
  });
}

function getCategoryName(catId) {
  const cat = state.categories.find(c => c.id === catId);
  return cat ? cat.name : 'Other';
}

function getCurrencySymbol() {
  const map = { 'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£' };
  return map[state.user?.currency || 'INR'] || '₹';
}

// ==========================================
// DASHBOARD PANEL CONTROLLER
// ==========================================
async function loadDashboard() {
  try {
    const summary = await apiRequest('/dashboard/summary');
    const recentBills = await apiRequest('/bills');

    // Update statistics numbers
    document.getElementById('stat-total-bills').textContent = summary.totalBills;
    document.getElementById('stat-due-today').textContent = summary.dueToday;
    document.getElementById('stat-upcoming').textContent = summary.upcoming;
    document.getElementById('stat-overdue').textContent = summary.overdue;

    // Monthly summary card
    const symbol = getCurrencySymbol();
    document.getElementById('summary-spent-amount').textContent = `${symbol}${summary.monthlySummary.spent.toLocaleString()}`;
    document.getElementById('summary-pending-amount').textContent = `${symbol}${summary.monthlySummary.pending.toLocaleString()}`;

    // Ratio progress bar calculation
    const total = summary.monthlySummary.spent + summary.monthlySummary.pending;
    let percentage = 0;
    if (total > 0) {
      percentage = Math.round((summary.monthlySummary.spent / total) * 100);
    }
    document.getElementById('summary-progress-bar').style.width = `${percentage}%`;
    document.getElementById('summary-progress-text').textContent = `${percentage}% of total bills paid`;

    // Populate table
    const tableBody = document.getElementById('dashboard-bills-list');
    tableBody.innerHTML = '';

    const urgentBills = recentBills.filter(b => b.status !== 'Paid').slice(0, 5);
    if (urgentBills.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No urgent or pending bills. All clear!</td></tr>`;
      return;
    }

    urgentBills.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.name}</strong></td>
        <td>${getCategoryName(b.category_id)}</td>
        <td>${new Date(b.due_date).toLocaleDateString()}</td>
        <td>${symbol}${b.amount.toLocaleString()}</td>
        <td><span class="badge-status ${b.status}">${b.status}</span></td>
        <td>
          <button class="action-btn pay" title="Mark Paid" onclick="quickMarkPaid(${b.id})"><i class="fa-solid fa-check"></i></button>
          <button class="action-btn" title="Edit" onclick="openEditBill(${b.id})"><i class="fa-solid fa-pen"></i></button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
  }
}

document.getElementById('view-all-bills-link').addEventListener('click', () => {
  showPanel('bills');
});

// ==========================================
// BILLS PANEL & CRUD CONTROLLER
// ==========================================
const billModal = document.getElementById('bill-modal');
const billForm = document.getElementById('bill-form');

document.getElementById('shortcut-add-bill-btn').addEventListener('click', () => openAddBill());
document.getElementById('close-modal-btn').addEventListener('click', () => closeModal());
document.getElementById('cancel-bill-btn').addEventListener('click', () => closeModal());

function openAddBill() {
  document.getElementById('modal-title').textContent = 'Add New Bill';
  billForm.reset();
  document.getElementById('form-bill-id').value = '';
  document.getElementById('form-bill-due-date').value = new Date().toISOString().split('T')[0];
  billModal.classList.remove('hidden');
}

async function openEditBill(id) {
  try {
    const bill = await apiRequest(`/bills`);
    const target = bill.find(b => b.id === id);
    if (!target) return;

    document.getElementById('modal-title').textContent = 'Edit Bill';
    document.getElementById('form-bill-id').value = target.id;
    document.getElementById('form-bill-name').value = target.name;
    document.getElementById('form-bill-amount').value = target.amount;
    document.getElementById('form-bill-category').value = target.category_id;
    document.getElementById('form-bill-due-date').value = target.due_date;
    document.getElementById('form-bill-recurrence').value = target.recurrence;
    document.getElementById('form-bill-status').value = target.status;
    document.getElementById('form-bill-desc').value = target.description;

    billModal.classList.remove('hidden');
  } catch (err) {
    console.error(err);
  }
}

function closeModal() {
  billModal.classList.add('hidden');
}

billForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('form-bill-id').value;
  const payload = {
    name: document.getElementById('form-bill-name').value,
    amount: document.getElementById('form-bill-amount').value,
    category_id: document.getElementById('form-bill-category').value,
    due_date: document.getElementById('form-bill-due-date').value,
    recurrence: document.getElementById('form-bill-recurrence').value,
    status: document.getElementById('form-bill-status').value,
    description: document.getElementById('form-bill-desc').value
  };

  try {
    if (id) {
      await apiRequest(`/bills/${id}`, 'PUT', payload);
    } else {
      await apiRequest('/bills', 'POST', payload);
    }
    closeModal();
    refreshCurrentPanel();
    loadNotifications();
  } catch (err) {
    alert(err.message);
  }
});

function refreshCurrentPanel() {
  showPanel(state.activePanel);
}

async function quickMarkPaid(id) {
  try {
    await apiRequest(`/bills/${id}`, 'PUT', { status: 'Paid' });
    refreshCurrentPanel();
    loadNotifications();
  } catch (err) {
    console.error(err);
  }
}

async function deleteBill(id) {
  if (!confirm('Are you sure you want to delete this bill?')) return;
  try {
    await apiRequest(`/bills/${id}`, 'DELETE');
    refreshCurrentPanel();
    loadNotifications();
  } catch (err) {
    console.error(err);
  }
}

async function duplicateBill(id) {
  try {
    await apiRequest(`/bills/${id}/duplicate', 'POST`);
    refreshCurrentPanel();
    loadNotifications();
  } catch (err) {
    console.error(err);
  }
}

// Load Bills list in Table with Search and Filtering
async function loadBillsTable() {
  try {
    state.bills = await apiRequest('/bills');
    renderBillsList();
  } catch (err) {
    console.error(err);
  }
}

function renderBillsList() {
  const searchQuery = document.getElementById('bills-search').value.toLowerCase();
  const catFilter = document.getElementById('filter-category').value;
  const statusFilter = document.getElementById('filter-status').value;
  const sortBy = document.getElementById('sort-by').value;

  let filtered = state.bills.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery);
    const matchesCat = catFilter ? b.category_id === Number(catFilter) : true;
    const matchesStatus = statusFilter ? b.status === statusFilter : true;
    return matchesSearch && matchesCat && matchesStatus;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'due_date-asc') return new Date(a.due_date) - new Date(b.due_date);
    if (sortBy === 'due_date-desc') return new Date(b.due_date) - new Date(a.due_date);
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  const tableBody = document.getElementById('main-bills-list');
  tableBody.innerHTML = '';
  const symbol = getCurrencySymbol();

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No bills match the filter criteria.</td></tr>`;
    return;
  }

  filtered.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${b.name}</strong></td>
      <td>${getCategoryName(b.category_id)}</td>
      <td>${b.recurrence}</td>
      <td>${new Date(b.due_date).toLocaleDateString()}</td>
      <td>${symbol}${b.amount.toLocaleString()}</td>
      <td><span class="badge-status ${b.status}">${b.status}</span></td>
      <td>
        ${b.status !== 'Paid' ? `<button class="action-btn pay" title="Mark Paid" onclick="quickMarkPaid(${b.id})"><i class="fa-solid fa-check"></i></button>` : ''}
        <button class="action-btn" title="Duplicate" onclick="duplicateBill(${b.id})"><i class="fa-solid fa-copy"></i></button>
        <button class="action-btn" title="Edit" onclick="openEditBill(${b.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="action-btn delete" title="Delete" onclick="deleteBill(${b.id})"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Add event listeners for filter bar inputs
document.getElementById('bills-search').addEventListener('input', renderBillsList);
document.getElementById('filter-category').addEventListener('change', renderBillsList);
document.getElementById('filter-status').addEventListener('change', renderBillsList);
document.getElementById('sort-by').addEventListener('change', renderBillsList);

// ==========================================
// CALENDAR RENDERING
// ==========================================
document.getElementById('prev-month-btn').addEventListener('click', () => {
  state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
  renderCalendar();
});

document.getElementById('next-month-btn').addEventListener('click', () => {
  state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
  renderCalendar();
});

async function renderCalendar() {
  try {
    state.bills = await apiRequest('/bills');
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    
    // Month label
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const daysGrid = document.getElementById('calendar-days');
    daysGrid.innerHTML = '';

    // Empty space cells for previous month padding
    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day empty';
      daysGrid.appendChild(cell);
    }

    // Actual calendar days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateStr === todayStr) {
        cell.classList.add('today');
      }

      cell.innerHTML = `<span class="day-number">${day}</span>`;
      
      // Filter bills on this day
      const dayBills = state.bills.filter(b => b.due_date === dateStr);
      const billsContainer = document.createElement('div');
      billsContainer.className = 'day-bills';

      dayBills.forEach(b => {
        const ind = document.createElement('span');
        ind.className = `cal-bill-indicator ${b.status}`;
        ind.title = `${b.name} - ₹${b.amount}`;
        ind.textContent = b.name;
        ind.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditBill(b.id);
        });
        billsContainer.appendChild(ind);
      });

      cell.appendChild(billsContainer);
      daysGrid.appendChild(cell);
    }
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// PAYMENT HISTORY CONTROLLER
// ==========================================
async function loadPaymentsHistory() {
  try {
    state.payments = await apiRequest('/payments');
    renderHistoryList();
  } catch (err) {
    console.error(err);
  }
}

function renderHistoryList() {
  const query = document.getElementById('history-search').value.toLowerCase();
  const tableBody = document.getElementById('payments-history-list');
  tableBody.innerHTML = '';
  const symbol = getCurrencySymbol();

  const filtered = state.payments.filter(p => p.bill_name.toLowerCase().includes(query) || p.method.toLowerCase().includes(query));

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No transaction logs found.</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.bill_name}</strong></td>
      <td>${new Date(p.payment_date).toLocaleDateString()}</td>
      <td>${p.method}</td>
      <td><span style="color: var(--color-success); font-weight: 700;">+${symbol}${p.amount.toLocaleString()}</span></td>
      <td><button class="action-btn" title="View Mock Receipt" onclick="alert('Receipt #${p.id} verified on chain.')"><i class="fa-solid fa-receipt"></i></button></td>
    `;
    tableBody.appendChild(tr);
  });
}

document.getElementById('history-search').addEventListener('input', renderHistoryList);

// ==========================================
// REPORTS & ANALYTICS CONTROLLER
// ==========================================
async function loadReports() {
  try {
    const analytics = await apiRequest('/reports/analytics');
    const symbol = getCurrencySymbol();

    // Category distribution breakdown progress bar list
    const categoryList = document.getElementById('category-report-list');
    categoryList.innerHTML = '';

    const breakdownKeys = Object.keys(analytics.categoryBreakdown);
    const maxVal = Math.max(...Object.values(analytics.categoryBreakdown), 1);

    breakdownKeys.forEach(catName => {
      const val = analytics.categoryBreakdown[catName];
      if (val === 0) return; // Skip zero expenses

      const pct = Math.round((val / maxVal) * 100);
      const row = document.createElement('div');
      row.className = 'breakdown-row';
      row.innerHTML = `
        <div class="breakdown-info">
          <span>${catName}</span>
          <span>${symbol}${val.toLocaleString()}</span>
        </div>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${pct}%"></div>
        </div>
      `;
      categoryList.appendChild(row);
    });

    if (categoryList.children.length === 0) {
      categoryList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No bill data registered yet.</div>`;
    }

    // Ratio Circle calculation
    const paid = analytics.paidVsPending.paid;
    const pending = analytics.paidVsPending.pending;
    const total = paid + pending;
    
    let paidPct = 0;
    if (total > 0) {
      paidPct = Math.round((paid / total) * 100);
    }

    document.getElementById('ratio-percentage').textContent = `${paidPct}%`;
    document.getElementById('report-paid-total').textContent = `${symbol}${paid.toLocaleString()}`;
    document.getElementById('report-pending-total').textContent = `${symbol}${pending.toLocaleString()}`;
    
    // Conic gradient mapping
    document.querySelector('.circle-ratio').style.background = `conic-gradient(var(--color-success) ${paidPct}%, var(--color-warning) ${paidPct}% 100%)`;

    // Monthly Bar Chart Rendering
    const chartWrapper = document.getElementById('monthly-bar-chart');
    chartWrapper.innerHTML = '';

    const maxMonthVal = Math.max(...analytics.monthlyExpenses.map(m => m.amount), 1);

    analytics.monthlyExpenses.forEach(m => {
      const barHeight = Math.round((m.amount / maxMonthVal) * 150); // Max height 150px
      const group = document.createElement('div');
      group.className = 'chart-bar-group';
      group.innerHTML = `
        <div class="bar-column" style="height: ${barHeight}px;" data-val="${symbol}${m.amount.toLocaleString()}"></div>
        <span class="bar-label">${m.month}</span>
      `;
      chartWrapper.appendChild(group);
    });

  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// SETTINGS PANEL CONTROLLER
// ==========================================
function loadSettings() {
  if (!state.user) return;
  document.getElementById('settings-name').value = state.user.name;
  document.getElementById('settings-email').value = state.user.email;
  document.getElementById('settings-currency').value = state.user.currency || 'INR';
  document.getElementById('settings-language').value = state.user.language || 'en';
  document.getElementById('settings-theme').value = state.user.theme || 'dark';
}

document.getElementById('settings-profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('settings-name').value;
  try {
    const updated = await apiRequest('/auth/profile', 'PUT', { name });
    state.user = { ...state.user, ...updated };
    localStorage.setItem('bill_manager_user', JSON.stringify(state.user));
    applyPreferences();
    alert('Profile saved successfully.');
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('settings-prefs-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currency = document.getElementById('settings-currency').value;
  const language = document.getElementById('settings-language').value;
  const theme = document.getElementById('settings-theme').value;

  try {
    const updated = await apiRequest('/auth/profile', 'PUT', { currency, language, theme });
    state.user = { ...state.user, ...updated };
    localStorage.setItem('bill_manager_user', JSON.stringify(state.user));
    applyPreferences();
    alert('Preferences saved.');
  } catch (err) {
    alert(err.message);
  }
});

// Sidebar panel switching event listener registration
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = btn.getAttribute('data-panel');
    showPanel(panel);
    // Close sidebar on mobile after choosing a panel
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
  });
});

// Mobile Sidebar Toggle
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebar = document.querySelector('.sidebar');

if (sidebarToggle && sidebarOverlay && sidebar) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
  });

  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  });
}

// ==========================================
// RECHARGE & UTILITIES FLOW LOGIC
// ==========================================
let currentRechargeTab = 'mobile';
let selectedCheckoutDetails = { payee: '', amount: 0, category: '', serviceId: '' };
let timerInterval = null;

// Tab switcher
const btnRechargeTabMobile = document.getElementById('btn-recharge-tab-mobile');
const btnRechargeTabTorrent = document.getElementById('btn-recharge-tab-torrent');
const sectionMobileRecharge = document.getElementById('mobile-recharge-section');
const sectionTorrentRecharge = document.getElementById('torrent-recharge-section');

if (btnRechargeTabMobile && btnRechargeTabTorrent) {
  btnRechargeTabMobile.addEventListener('click', () => {
    currentRechargeTab = 'mobile';
    btnRechargeTabMobile.classList.add('active');
    btnRechargeTabTorrent.classList.remove('active');
    sectionMobileRecharge.classList.add('active');
    sectionTorrentRecharge.classList.remove('active');
  });

  btnRechargeTabTorrent.addEventListener('click', () => {
    currentRechargeTab = 'torrent';
    btnRechargeTabMobile.classList.remove('active');
    btnRechargeTabTorrent.classList.add('active');
    sectionMobileRecharge.classList.remove('active');
    sectionTorrentRecharge.classList.add('active');
  });
}

// Rich categorized operator plan datasets
const OPERATOR_PLANS = {
  Jio: {
    popular: [
      { price: 239, duration: '28 Days', data: '1.5 GB / Day', calls: 'Truly Unlimited', info: 'Best selling monthly pack' },
      { price: 299, duration: '28 Days', data: '2 GB / Day', calls: 'Truly Unlimited', info: 'Jio Welcome 5G Eligible' },
      { price: 666, duration: '84 Days', data: '1.5 GB / Day', calls: 'Truly Unlimited', info: 'Truly Unlimited Voice + SMS' },
      { price: 749, duration: '90 Days', data: '2 GB / Day', calls: 'Truly Unlimited', info: 'Unlimited 5G Data Included' },
      { price: 2999, duration: '365 Days', data: '2.5 GB / Day', calls: 'Truly Unlimited', info: 'Premium Yearly Plan' }
    ],
    data: [
      { price: 15, duration: 'Active Plan', data: '1 GB Total', calls: 'No Voice', info: 'Data Booster Pack' },
      { price: 25, duration: 'Active Plan', data: '2 GB Total', calls: 'No Voice', info: 'Data Booster Pack' },
      { price: 61, duration: 'Active Plan', data: '6 GB Total', calls: 'No Voice', info: '5G Upgrade Pack' },
      { price: 121, duration: 'Active Plan', data: '12 GB Total', calls: 'No Voice', info: 'High-speed Data Add-on' }
    ],
    talktime: [
      { price: 10, duration: 'Unlimited', data: 'N/A', calls: '₹7.47 Talktime', info: 'Topup Voucher' },
      { price: 20, duration: 'Unlimited', data: 'N/A', calls: '₹14.95 Talktime', info: 'Topup Voucher' },
      { price: 50, duration: 'Unlimited', data: 'N/A', calls: '₹39.37 Talktime', info: 'Topup Voucher' },
      { price: 100, duration: 'Unlimited', data: 'N/A', calls: '₹81.75 Talktime', info: 'Topup Voucher' }
    ]
  },
  Airtel: {
    popular: [
      { price: 265, duration: '28 Days', data: '1 GB / Day', calls: 'Truly Unlimited', info: 'Airtel Thanks Benefits' },
      { price: 319, duration: '1 Month', data: '2 GB / Day', calls: 'Truly Unlimited', info: 'Free Wynk Music' },
      { price: 779, duration: '90 Days', data: '1.5 GB / Day', calls: 'Truly Unlimited', info: 'Apollo 24|7 Circle Access' },
      { price: 839, duration: '84 Days', data: '2 GB / Day', calls: 'Truly Unlimited', info: 'Unlimited 5G Data Included' },
      { price: 3599, duration: '365 Days', data: '2 GB / Day', calls: 'Truly Unlimited', info: 'Free Wynk Music & Hellotunes' }
    ],
    data: [
      { price: 19, duration: '1 Day', data: '1 GB Total', calls: 'No Voice', info: 'Daily Data Add-on' },
      { price: 29, duration: 'Active Plan', data: '2 GB Total', calls: 'No Voice', info: 'Data Booster Pack' },
      { price: 58, duration: 'Active Plan', data: '3 GB Total', calls: 'No Voice', info: 'Data Booster Pack' },
      { price: 98, duration: 'Active Plan', data: '5 GB Total', calls: 'No Voice', info: 'High-speed Data Add-on' }
    ],
    talktime: [
      { price: 10, duration: 'Unlimited', data: 'N/A', calls: '₹7.47 Talktime', info: 'Topup Voucher' },
      { price: 20, duration: 'Unlimited', data: 'N/A', calls: '₹14.95 Talktime', info: 'Topup Voucher' },
      { price: 50, duration: 'Unlimited', data: 'N/A', calls: '₹39.37 Talktime', info: 'Topup Voucher' },
      { price: 100, duration: 'Unlimited', data: 'N/A', calls: '₹81.75 Talktime', info: 'Topup Voucher' }
    ]
  },
  Vi: {
    popular: [
      { price: 299, duration: '28 Days', data: '1.5 GB / Day', calls: 'Truly Unlimited', info: 'Weekend Data Rollover' },
      { price: 479, duration: '56 Days', data: '1.5 GB / Day', calls: 'Truly Unlimited', info: 'Binge All Night (12 AM - 6 AM)' },
      { price: 719, duration: '84 Days', data: '1.5 GB / Day', calls: 'Truly Unlimited', info: 'Unlimited Voice + Hero Rollover' },
      { price: 3199, duration: '365 Days', data: '2 GB / Day', calls: 'Truly Unlimited', info: 'Free Disney+ Hotstar Mobile' }
    ],
    data: [
      { price: 19, duration: 'Active Plan', data: '1 GB Total', calls: 'No Voice', info: 'Data Add-on' },
      { price: 39, duration: 'Active Plan', data: '3 GB Total', calls: 'No Voice', info: 'Data Booster' },
      { price: 75, duration: 'Active Plan', data: '6 GB Total', calls: 'No Voice', info: '5G Upgrade' },
      { price: 118, duration: 'Active Plan', data: '12 GB Total', calls: 'No Voice', info: 'High-speed Data Pack' }
    ],
    talktime: [
      { price: 10, duration: 'Unlimited', data: 'N/A', calls: '₹7.47 Talktime', info: 'Topup Voucher' },
      { price: 20, duration: 'Unlimited', data: 'N/A', calls: '₹14.95 Talktime', info: 'Topup Voucher' },
      { price: 50, duration: 'Unlimited', data: 'N/A', calls: '₹39.37 Talktime', info: 'Topup Voucher' },
      { price: 100, duration: 'Unlimited', data: 'N/A', calls: '₹81.75 Talktime', info: 'Topup Voucher' }
    ]
  },
  BSNL: {
    popular: [
      { price: 107, duration: '35 Days', data: '3 GB Total', calls: '200 Mins Local/STD', info: 'BSNL Tunes included' },
      { price: 397, duration: '150 Days', data: '2 GB / Day', calls: 'Truly Unlimited', info: 'Long validity budget plan' },
      { price: 1999, duration: '365 Days', data: '2 GB / Day', calls: 'Truly Unlimited', info: 'Eros Now Entertainment access' }
    ],
    data: [
      { price: 16, duration: '1 Day', data: '2 GB Total', calls: 'No Voice', info: 'Data Add-on' },
      { price: 98, duration: '22 Days', data: '2 GB / Day', calls: 'No Voice', info: 'Data Booster Pack' }
    ],
    talktime: [
      { price: 10, duration: 'Unlimited', data: 'N/A', calls: '₹7.47 Talktime', info: 'Topup Voucher' },
      { price: 20, duration: 'Unlimited', data: 'N/A', calls: '₹14.95 Talktime', info: 'Topup Voucher' },
      { price: 50, duration: 'Unlimited', data: 'N/A', calls: '₹39.37 Talktime', info: 'Topup Voucher' },
      { price: 100, duration: 'Unlimited', data: 'N/A', calls: '₹81.75 Talktime', info: 'Topup Voucher' }
    ]
  }
};

// Branch office mappings for Torrent Power
const BRANCH_OFFICES = {
  Bhiwandi: {
    address: 'Torrent Power Ltd, Old Agra Road, near Anjurphata, Bhiwandi, Maharashtra 421302',
    mapLink: 'https://maps.google.com/?q=Torrent+Power+Office+Bhiwandi'
  },
  Mumbra: {
    address: 'Torrent Power Ltd, Mumbra Kausa Bypass Road, near Kausa Lake, Mumbra, Thane, Maharashtra 400612',
    mapLink: 'https://maps.google.com/?q=Torrent+Power+Office+Mumbra'
  },
  Ahmedabad: {
    address: 'Torrent House, Ashram Road, Ahmedabad, Gujarat 380009',
    mapLink: 'https://maps.google.com/?q=Torrent+House+Ahmedabad'
  },
  Surat: {
    address: 'Torrent Power Ltd, Katargam Road, Surat, Gujarat 395004',
    mapLink: 'https://maps.google.com/?q=Torrent+Power+Surat'
  },
  Dahej: {
    address: 'Torrent Power Ltd, SEZ Area, Dahej, Gujarat 392130',
    mapLink: 'https://maps.google.com/?q=Torrent+Power+Dahej'
  },
  Agra: {
    address: 'Torrent Power Ltd, Sanjay Place, Civil Lines, Agra, Uttar Pradesh 282002',
    mapLink: 'https://maps.google.com/?q=Torrent+Power+Agra'
  }
};

let activePlansCategory = 'popular';

// Dynamic mobile plans handler function
function updateMobilePlans() {
  const numberInput = document.getElementById('recharge-mobile-number').value.trim();
  const plansContainer = document.getElementById('recharge-plans-container');
  const plansList = document.getElementById('recharge-plans-list');
  const operatorSelect = document.getElementById('recharge-operator').value;
  const circleSelect = document.getElementById('recharge-circle').value;

  let activeOperator = operatorSelect;
  let activeCircle = circleSelect || 'Gujarat';

  // If number is 10 digits, auto-detect (overriding manual selection if needed)
  if (numberInput.length === 10 && !isNaN(numberInput)) {
    let detectedOperator = 'Jio';
    let detectedCircle = 'Gujarat';

    const firstDigit = numberInput[0];
    if (firstDigit === '9') {
      detectedOperator = 'Airtel';
      detectedCircle = 'Delhi';
    } else if (firstDigit === '8') {
      detectedOperator = 'Jio';
      detectedCircle = 'Gujarat';
    } else if (firstDigit === '7') {
      detectedOperator = 'Vi';
      detectedCircle = 'Maharashtra';
    } else if (firstDigit === '6') {
      detectedOperator = 'BSNL';
      detectedCircle = 'Karnataka';
    }

    activeOperator = detectedOperator;
    activeCircle = detectedCircle;

    // Set UI dropdown selections
    document.getElementById('recharge-operator').value = detectedOperator;
    document.getElementById('recharge-circle').value = detectedCircle;
  }

  // Show plans if we have an operator selected (regardless of number length)
  if (activeOperator) {
    // Set status banner labels
    document.getElementById('detected-operator-label').textContent = activeOperator;
    document.getElementById('detected-circle-label').textContent = activeCircle;
    
    // Toggle the detected status banner (only show if it was auto-detected with 10 digits)
    const statusBanner = document.getElementById('operator-detection-status');
    if (numberInput.length === 10) {
      statusBanner.style.display = 'flex';
    } else {
      statusBanner.style.display = 'none';
    }

    // Load plans according to category
    const providerPlans = OPERATOR_PLANS[activeOperator] || { popular: [], data: [], talktime: [] };
    const plans = providerPlans[activePlansCategory] || [];
    plansList.innerHTML = '';
    
    if (plans.length === 0) {
      plansList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No plans available in this category.</div>';
    } else {
      plans.forEach(plan => {
        const planItem = document.createElement('div');
        planItem.className = 'plan-card-item';
        planItem.innerHTML = `
          <div class="plan-price">₹${plan.price}</div>
          <div class="plan-info">
            <strong>${plan.data} ${plan.duration ? `| Validity: ${plan.duration}` : ''}</strong>
            <span>${plan.calls} | ${plan.info}</span>
          </div>
        `;
        planItem.addEventListener('click', () => {
          const finalNum = numberInput || '9999999999';
          triggerPaymentGateway(`${activeOperator} Recharge (${finalNum})`, plan.price, 'Mobile', finalNum);
        });
        plansList.appendChild(planItem);
      });
    }

    plansContainer.classList.remove('hidden');
  } else {
    plansContainer.classList.add('hidden');
  }
}

// Attach listeners for dynamic plan checks
const rechargeMobileInput = document.getElementById('recharge-mobile-number');
const rechargeOperatorSelect = document.getElementById('recharge-operator');
const rechargeCircleSelect = document.getElementById('recharge-circle');

if (rechargeMobileInput && rechargeOperatorSelect && rechargeCircleSelect) {
  rechargeMobileInput.addEventListener('input', updateMobilePlans);
  rechargeOperatorSelect.addEventListener('change', () => {
    // If manually changed, update detected label too
    document.getElementById('detected-operator-label').textContent = rechargeOperatorSelect.value;
    updateMobilePlans();
  });
  rechargeCircleSelect.addEventListener('change', () => {
    document.getElementById('detected-circle-label').textContent = rechargeCircleSelect.value;
  });
}

// Category tabs click registration
document.querySelectorAll('.plan-cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.plan-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activePlansCategory = btn.getAttribute('data-cat');
    updateMobilePlans();
  });
});

// Fetch Torrent Power Details
const torrentFetchBtn = document.getElementById('torrent-fetch-btn');
const torrentDetailsBlock = document.getElementById('torrent-fetched-details');
if (torrentFetchBtn) {
  torrentFetchBtn.addEventListener('click', () => {
    const serviceNo = document.getElementById('torrent-service-number').value.trim();
    const city = document.getElementById('torrent-city').value;

    if (!serviceNo || serviceNo.length !== 9 || isNaN(serviceNo)) {
      alert('Please enter a valid 9-digit Service / CA number.');
      return;
    }

    torrentFetchBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Fetching details...';
    torrentFetchBtn.disabled = true;

    // Simulated API response delay
    setTimeout(() => {
      torrentFetchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Fetch Bill Details';
      torrentFetchBtn.disabled = false;
      torrentDetailsBlock.classList.remove('hidden');

      // Randomize billing details slightly to look realistic
      const netAmount = Math.floor(Math.random() * (4500 - 1200 + 1)) + 1200;
      document.getElementById('fetched-amount').textContent = `₹${netAmount.toLocaleString()}`;
      
      // Update Branch Office Locator
      const branchInfo = BRANCH_OFFICES[city];
      const locatorBox = document.getElementById('torrent-branch-locator');
      if (branchInfo) {
        document.getElementById('torrent-branch-address').textContent = branchInfo.address;
        document.getElementById('torrent-branch-map-link').href = branchInfo.mapLink;
        locatorBox.classList.remove('hidden');
      } else {
        locatorBox.classList.add('hidden');
      }

      selectedCheckoutDetails = {
        payee: `Torrent Power (${city})`,
        amount: netAmount,
        category: 'Electricity',
        serviceId: serviceNo
      };
    }, 1000);
  });
}

// Proceed with Torrent Power payment
const torrentPayBtn = document.getElementById('torrent-pay-btn');
if (torrentPayBtn) {
  torrentPayBtn.addEventListener('click', () => {
    triggerPaymentGateway(selectedCheckoutDetails.payee, selectedCheckoutDetails.amount, 'Electricity', selectedCheckoutDetails.serviceId);
  });
}

// ==========================================
// SECURE PAYMENT GATEWAY LOGIC
// ==========================================
let currentPaymentMethod = 'upi';

const btnPmUpi = document.getElementById('btn-pm-upi');
const btnPmCard = document.getElementById('btn-pm-card');
const btnPmNetbanking = document.getElementById('btn-pm-netbanking');

const pmUpiSection = document.getElementById('pm-upi-section');
const pmCardSection = document.getElementById('pm-card-section');
const pmNetbankingSection = document.getElementById('pm-netbanking-section');

if (btnPmUpi && btnPmCard && btnPmNetbanking) {
  btnPmUpi.addEventListener('click', () => setPaymentMethod('upi'));
  btnPmCard.addEventListener('click', () => setPaymentMethod('card'));
  btnPmNetbanking.addEventListener('click', () => setPaymentMethod('netbanking'));
}

function setPaymentMethod(method) {
  currentPaymentMethod = method;
  [btnPmUpi, btnPmCard, btnPmNetbanking].forEach(btn => btn.classList.remove('active'));
  [pmUpiSection, pmCardSection, pmNetbankingSection].forEach(sec => sec.classList.remove('active'));

  if (method === 'upi') {
    btnPmUpi.classList.add('active');
    pmUpiSection.classList.add('active');
    startTimer(179); // Start 3-minute QR countdown
  } else if (method === 'card') {
    btnPmCard.classList.add('active');
    pmCardSection.classList.add('active');
    clearInterval(timerInterval);
  } else if (method === 'netbanking') {
    btnPmNetbanking.classList.add('active');
    pmNetbankingSection.classList.add('active');
    clearInterval(timerInterval);
  }
}

// Select bank logic
document.querySelectorAll('.bank-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.bank-item').forEach(b => b.classList.remove('active'));
    item.classList.add('active');
  });
});

// Timer countdown
function startTimer(duration) {
  clearInterval(timerInterval);
  let timer = duration, minutes, seconds;
  const display = document.getElementById('payment-timer-span');
  timerInterval = setInterval(() => {
    minutes = parseInt(timer / 60, 10);
    seconds = parseInt(timer % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    display.textContent = minutes + ":" + seconds;

    if (--timer < 0) {
      clearInterval(timerInterval);
      display.textContent = "EXPIRED";
    }
  }, 1000);
}

// Format card inputs
const cardInput = document.getElementById('checkout-card-num');
if (cardInput) {
  cardInput.addEventListener('input', (e) => {
    let target = e.target;
    let position = target.selectionEnd;
    let length = target.value.length;
    target.value = target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim();
    let diff = target.value.length - length;
    target.setSelectionRange(position + diff, position + diff);
  });
}

const expInput = document.getElementById('checkout-card-exp');
if (expInput) {
  expInput.addEventListener('input', (e) => {
    let target = e.target;
    target.value = target.value.replace(/[^\d]/g, '');
    if (target.value.length > 2) {
      target.value = target.value.slice(0, 2) + '/' + target.value.slice(2, 4);
    }
  });
}

function triggerPaymentGateway(payee, amount, category, serviceId) {
  selectedCheckoutDetails = { payee, amount, category, serviceId };
  
  document.getElementById('checkout-payee').textContent = payee;
  document.getElementById('checkout-amount').textContent = `₹${amount.toLocaleString()}`;

  // Reset payment tabs
  setPaymentMethod('upi');

  // Open modal
  document.getElementById('payment-modal').classList.remove('hidden');
}

// Close checkout modals
document.getElementById('close-payment-modal-btn').addEventListener('click', () => {
  document.getElementById('payment-modal').classList.add('hidden');
  clearInterval(timerInterval);
});

// Process Pay Safely Now
const payNowBtn = document.getElementById('pay-now-btn');
if (payNowBtn) {
  payNowBtn.addEventListener('click', async () => {
    // Basic checkout validations
    if (currentPaymentMethod === 'card') {
      const cardNum = document.getElementById('checkout-card-num').value.trim();
      const cardExp = document.getElementById('checkout-card-exp').value.trim();
      const cardCvv = document.getElementById('checkout-card-cvv').value.trim();
      const cardName = document.getElementById('checkout-card-name').value.trim();

      if (!cardNum || !cardExp || !cardCvv || !cardName) {
        alert('Please fill out all Credit/Debit card details.');
        return;
      }
    } else if (currentPaymentMethod === 'netbanking') {
      const activeBank = document.querySelector('.bank-item.active');
      if (!activeBank) {
        alert('Please select a bank to proceed.');
        return;
      }
    }

    // Hide checkout modal, show secure processing overlay
    document.getElementById('payment-modal').classList.add('hidden');
    clearInterval(timerInterval);
    
    const processingOverlay = document.getElementById('processing-overlay');
    const statusTitle = document.getElementById('processing-status-title');
    const statusSub = document.getElementById('processing-status-sub');
    
    processingOverlay.classList.remove('hidden');

    try {
      statusTitle.textContent = 'Connecting to secure gateway...';
      statusSub.textContent = 'Contacting bank authorization servers...';

      await new Promise(r => setTimeout(r, 1000));
      statusTitle.textContent = 'Authorizing transaction...';
      statusSub.textContent = 'Verifying account funds...';

      await new Promise(r => setTimeout(r, 1000));
      statusTitle.textContent = 'Finalizing transaction...';
      statusSub.textContent = 'Issuing billing receipts...';

      // Insert Paid Bill to Backend Database
      const categoryObj = state.categories.find(c => c.name.toLowerCase() === selectedCheckoutDetails.category.toLowerCase()) || { id: 12 };
      
      const billData = {
        name: selectedCheckoutDetails.payee,
        amount: selectedCheckoutDetails.amount,
        category_id: categoryObj.id,
        due_date: new Date().toISOString().split('T')[0],
        recurrence: 'One Time',
        status: 'Paid',
        description: `Utility bill payment reference ID: ${selectedCheckoutDetails.serviceId || 'N/A'}`
      };

      const res = await apiRequest('/bills', 'POST', billData);
      
      // Clear forms
      document.getElementById('mobile-recharge-number')?.replaceWith(document.getElementById('mobile-recharge-number')?.cloneNode(true));
      document.getElementById('mobile-recharge-form')?.reset();
      document.getElementById('torrent-bill-form')?.reset();
      document.getElementById('torrent-fetched-details')?.classList.add('hidden');

      await new Promise(r => setTimeout(r, 1000));
      processingOverlay.classList.add('hidden');

      // Refresh data
      if (state.token) {
        loadInitialData();
      }

      alert('Payment Successful! Receipt is generated in History.');
      showPanel('history');
    } catch (err) {
      processingOverlay.classList.add('hidden');
      alert(`Payment failed: ${err.message}`);
    }
  });
}

// App Startup Initialise
window.addEventListener('DOMContentLoaded', () => {
  checkSession();
});
