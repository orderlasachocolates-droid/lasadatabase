/* ============================================================
   LASA CHOCOLATES – App Logic
   Firebase Firestore CRUD · Chart.js · html2pdf.js
   ============================================================ */

// ─── Firebase Config ─────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyA8oTzVovKT5kfre8e2eaZb8rk3dt6zE5s",
    authDomain: "lasa-data-base.firebaseapp.com",
    projectId: "lasa-data-base",
    storageBucket: "lasa-data-base.firebasestorage.app",
    messagingSenderId: "498222905311",
    appId: "1:498222905311:web:be0709dfe348dad801b66a",
    measurementId: "G-9PPFTV5FW2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const ordersRef = db.collection("orders");

// ─── State ───────────────────────────────────────────────────
let allOrders = [];
let pieChart = null;
let deleteDocId = null;

// ─── DOM Refs ────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const DOM = {
    loginScreen: $('loginScreen'),
    loginForm: $('loginForm'),
    loginPassword: $('loginPassword'),
    loginError: $('loginError'),
    loginBtn: $('loginBtn'),
    appContainer: $('appContainer'),
    sidebar: $('sidebar'),
    menuToggle: $('menuToggle'),
    sidebarOverlay: $('sidebarOverlay'),
    navLinks: document.querySelectorAll('.nav-link'),
    logoutBtn: $('logoutBtn'),
    views: document.querySelectorAll('.view'),
    // Dashboard
    totalOrdersCount: $('totalOrdersCount'),
    totalProfitValue: $('totalProfitValue'),
    topItemName: $('topItemName'),
    recentOrdersBody: $('recentOrdersBody'),
    recentEmptyState: $('recentEmptyState'),
    cardTotalProfit: $('cardTotalProfit'),
    seeAllOrders: $('seeAllOrders'),
    addOrderBtnDash: $('addOrderBtnDash'),
    // Orders
    allOrdersBody: $('allOrdersBody'),
    ordersEmptyState: $('ordersEmptyState'),
    searchInput: $('searchInput'),
    filterDateFrom: $('filterDateFrom'),
    filterDateTo: $('filterDateTo'),
    filterItem: $('filterItem'),
    clearFiltersBtn: $('clearFiltersBtn'),
    exportPdfBtn: $('exportPdfBtn'),
    addOrderBtnOrders: $('addOrderBtnOrders'),
    // Modal
    orderModal: $('orderModal'),
    modalTitle: $('modalTitle'),
    orderForm: $('orderForm'),
    editOrderId: $('editOrderId'),
    orderIdInput: $('orderIdInput'),
    customerName: $('customerName'),
    phoneNumber: $('phoneNumber'),
    orderDate: $('orderDate'),
    itemOrdered: $('itemOrdered'),
    customItemGroup: $('customItemGroup'),
    customItem: $('customItem'),
    amountProfit: $('amountProfit'),
    modalClose: $('modalClose'),
    modalCancelBtn: $('modalCancelBtn'),
    saveOrderBtn: $('saveOrderBtn'),
    // Delete
    deleteModal: $('deleteModal'),
    deleteCancelBtn: $('deleteCancelBtn'),
    deleteConfirmBtn: $('deleteConfirmBtn'),
    // Analytics
    profitPieChart: $('profitPieChart'),
    profitCards: $('profitCards'),
    // Toast
    toastContainer: $('toastContainer'),
};

// ============================================================
// LOGIN
// ============================================================
const ACCESS_CODE = "3004";

DOM.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = DOM.loginPassword.value.trim();
    if (pw === ACCESS_CODE) {
        DOM.loginError.style.display = 'none';
        DOM.loginScreen.style.display = 'none';
        DOM.appContainer.style.display = 'flex';
        showToast('Welcome to LASA CHOCOLATES Dashboard!', 'success');
    } else {
        DOM.loginError.style.display = 'flex';
        DOM.loginPassword.value = '';
        DOM.loginPassword.focus();
    }
});

DOM.logoutBtn.addEventListener('click', () => {
    DOM.appContainer.style.display = 'none';
    DOM.loginScreen.style.display = 'flex';
    DOM.loginPassword.value = '';
    DOM.loginError.style.display = 'none';
});

// ============================================================
// NAVIGATION
// ============================================================
function switchView(viewName) {
    DOM.views.forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
    if (target) target.classList.add('active');

    DOM.navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-view="${viewName}"]`)?.classList.add('active');

    // Close mobile sidebar
    DOM.sidebar.classList.remove('open');
    DOM.sidebarOverlay.classList.remove('show');

    if (viewName === 'analytics') renderAnalytics();
}

DOM.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(link.dataset.view);
    });
});

DOM.cardTotalProfit.addEventListener('click', () => switchView('analytics'));
DOM.seeAllOrders.addEventListener('click', (e) => { e.preventDefault(); switchView('orders'); });

// Mobile sidebar
DOM.menuToggle.addEventListener('click', () => {
    DOM.sidebar.classList.toggle('open');
    DOM.sidebarOverlay.classList.toggle('show');
});
DOM.sidebarOverlay.addEventListener('click', () => {
    DOM.sidebar.classList.remove('open');
    DOM.sidebarOverlay.classList.remove('show');
});

// ============================================================
// FIRESTORE REAL-TIME LISTENER
// ============================================================
ordersRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    allOrders = [];
    snapshot.forEach(doc => {
        allOrders.push({ id: doc.id, ...doc.data() });
    });
    renderDashboard();
    renderOrdersTable();
}, (error) => {
    console.error("Firestore error:", error);
    showToast('Error connecting to database. Check your internet.', 'error');
});

// ============================================================
// DASHBOARD RENDERING
// ============================================================
function renderDashboard() {
    // Summary cards
    const totalOrders = allOrders.length;
    const totalProfit = allOrders.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);

    DOM.totalOrdersCount.textContent = totalOrders;
    DOM.totalProfitValue.textContent = '₹' + totalProfit.toLocaleString('en-IN');

    // Top selling item
    const itemCount = {};
    allOrders.forEach(o => {
        if (o.item) itemCount[o.item] = (itemCount[o.item] || 0) + 1;
    });
    const topItem = Object.entries(itemCount).sort((a, b) => b[1] - a[1])[0];
    DOM.topItemName.textContent = topItem ? topItem[0] : '—';

    // Recent orders (last 5)
    const recent = allOrders.slice(0, 5);
    DOM.recentOrdersBody.innerHTML = '';

    if (recent.length === 0) {
        DOM.recentEmptyState.style.display = 'block';
    } else {
        DOM.recentEmptyState.style.display = 'none';
        recent.forEach((order, idx) => {
            DOM.recentOrdersBody.appendChild(createOrderRow(order, idx + 1, false));
        });
    }
}

// ============================================================
// ORDERS TABLE RENDERING
// ============================================================
function getFilteredOrders() {
    let filtered = [...allOrders];
    const search = DOM.searchInput.value.trim().toLowerCase();
    const dateFrom = DOM.filterDateFrom.value;
    const dateTo = DOM.filterDateTo.value;
    const itemFilter = DOM.filterItem.value;

    if (search) {
        filtered = filtered.filter(o =>
            (o.customerName || '').toLowerCase().includes(search) ||
            (o.orderId || '').toLowerCase().includes(search)
        );
    }

    if (dateFrom) {
        filtered = filtered.filter(o => o.orderDate >= dateFrom);
    }

    if (dateTo) {
        filtered = filtered.filter(o => o.orderDate <= dateTo);
    }

    if (itemFilter) {
        filtered = filtered.filter(o => o.item === itemFilter);
    }

    return filtered;
}

function renderOrdersTable() {
    const filtered = getFilteredOrders();
    DOM.allOrdersBody.innerHTML = '';

    if (filtered.length === 0) {
        DOM.ordersEmptyState.style.display = 'block';
    } else {
        DOM.ordersEmptyState.style.display = 'none';
        filtered.forEach((order, idx) => {
            DOM.allOrdersBody.appendChild(createOrderRow(order, idx + 1, true));
        });
    }
}

function createOrderRow(order, serialNo, showPhone) {
    const tr = document.createElement('tr');
    const formattedDate = order.orderDate ? formatDate(order.orderDate) : '—';
    const amount = parseFloat(order.amount) || 0;

    let cells = `
        <td>${serialNo}</td>
        <td>${escapeHtml(order.orderId || '—')}</td>
        <td>${escapeHtml(order.customerName || '—')}</td>
    `;

    if (showPhone) {
        cells += `<td>${escapeHtml(order.phone || '—')}</td>`;
    }

    cells += `
        <td>${escapeHtml(order.item || '—')}</td>
        <td class="amount">₹${amount.toLocaleString('en-IN')}</td>
        <td>${formattedDate}</td>
        <td>
            <button class="btn-icon" onclick="openEditModal('${order.id}')" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon delete" onclick="openDeleteModal('${order.id}')" title="Delete">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;

    tr.innerHTML = cells;
    return tr;
}

// Filters
DOM.searchInput.addEventListener('input', renderOrdersTable);
DOM.filterDateFrom.addEventListener('change', renderOrdersTable);
DOM.filterDateTo.addEventListener('change', renderOrdersTable);
DOM.filterItem.addEventListener('change', renderOrdersTable);
DOM.clearFiltersBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    DOM.filterDateFrom.value = '';
    DOM.filterDateTo.value = '';
    DOM.filterItem.value = '';
    renderOrdersTable();
});

// ============================================================
// ORDER MODAL – ADD / EDIT
// ============================================================
function openAddModal() {
    DOM.editOrderId.value = '';
    DOM.orderForm.reset();
    DOM.customItemGroup.style.display = 'none';
    DOM.modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> New Order';
    DOM.saveOrderBtn.innerHTML = '<i class="fas fa-save"></i> Save Order';
    // Set today's date as default
    DOM.orderDate.value = new Date().toISOString().split('T')[0];
    DOM.orderModal.classList.add('show');
}

function openEditModal(docId) {
    const order = allOrders.find(o => o.id === docId);
    if (!order) return;

    DOM.editOrderId.value = docId;
    DOM.orderIdInput.value = order.orderId || '';
    DOM.customerName.value = order.customerName || '';
    DOM.phoneNumber.value = order.phone || '';
    DOM.orderDate.value = order.orderDate || '';
    DOM.amountProfit.value = order.amount || '';

    // Check if item is in dropdown
    const options = Array.from(DOM.itemOrdered.options).map(o => o.value);
    if (options.includes(order.item)) {
        DOM.itemOrdered.value = order.item;
        DOM.customItemGroup.style.display = 'none';
    } else {
        DOM.itemOrdered.value = '__custom__';
        DOM.customItemGroup.style.display = 'block';
        DOM.customItem.value = order.item || '';
    }

    DOM.modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Order';
    DOM.saveOrderBtn.innerHTML = '<i class="fas fa-save"></i> Update Order';
    DOM.orderModal.classList.add('show');
}

function closeModal() {
    DOM.orderModal.classList.remove('show');
}

DOM.addOrderBtnDash.addEventListener('click', openAddModal);
DOM.addOrderBtnOrders.addEventListener('click', openAddModal);
DOM.modalClose.addEventListener('click', closeModal);
DOM.modalCancelBtn.addEventListener('click', closeModal);

// Custom item toggle
DOM.itemOrdered.addEventListener('change', () => {
    if (DOM.itemOrdered.value === '__custom__') {
        DOM.customItemGroup.style.display = 'block';
        DOM.customItem.focus();
    } else {
        DOM.customItemGroup.style.display = 'none';
        DOM.customItem.value = '';
    }
});

// Save order
DOM.orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let item = DOM.itemOrdered.value;
    if (item === '__custom__') {
        item = DOM.customItem.value.trim();
        if (!item) {
            showToast('Please enter a custom item name.', 'error');
            return;
        }
    }

    if (!item) {
        showToast('Please select an item.', 'error');
        return;
    }

    const orderData = {
        orderId: DOM.orderIdInput.value.trim(),
        customerName: DOM.customerName.value.trim(),
        phone: DOM.phoneNumber.value.trim(),
        orderDate: DOM.orderDate.value,
        item: item,
        amount: parseFloat(DOM.amountProfit.value) || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const docId = DOM.editOrderId.value;

    try {
        if (docId) {
            // Update
            await ordersRef.doc(docId).update(orderData);
            showToast('Order updated successfully!', 'success');
        } else {
            // Add
            orderData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await ordersRef.add(orderData);
            showToast('Order added successfully!', 'success');
        }
        closeModal();
    } catch (err) {
        console.error(err);
        showToast('Error saving order. Please try again.', 'error');
    }
});

// ============================================================
// DELETE ORDER
// ============================================================
function openDeleteModal(docId) {
    deleteDocId = docId;
    DOM.deleteModal.classList.add('show');
}

DOM.deleteCancelBtn.addEventListener('click', () => {
    DOM.deleteModal.classList.remove('show');
    deleteDocId = null;
});

DOM.deleteConfirmBtn.addEventListener('click', async () => {
    if (!deleteDocId) return;
    try {
        await ordersRef.doc(deleteDocId).delete();
        showToast('Order deleted successfully.', 'success');
    } catch (err) {
        console.error(err);
        showToast('Error deleting order.', 'error');
    }
    DOM.deleteModal.classList.remove('show');
    deleteDocId = null;
});

// ============================================================
// ANALYTICS – PIE CHART & PROFIT CARDS
// ============================================================
const CHART_COLORS = [
    '#d4a574', '#b8894e', '#e8c9a0', '#8b6f5a', '#c4a88e',
    '#60a5fa', '#4ade80', '#f87171', '#facc15', '#a78bfa',
    '#fb923c', '#2dd4bf', '#f472b6', '#818cf8', '#34d399'
];

function renderAnalytics() {
    // Group by item
    const itemProfit = {};
    const itemCount = {};
    allOrders.forEach(o => {
        const name = o.item || 'Unknown';
        itemProfit[name] = (itemProfit[name] || 0) + (parseFloat(o.amount) || 0);
        itemCount[name] = (itemCount[name] || 0) + 1;
    });

    const labels = Object.keys(itemProfit);
    const data = Object.values(itemProfit);

    // Pie chart
    const ctx = DOM.profitPieChart.getContext('2d');
    if (pieChart) pieChart.destroy();

    if (labels.length === 0) {
        DOM.profitCards.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No data available yet.</p>';
        return;
    }

    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CHART_COLORS.slice(0, labels.length),
                borderColor: 'rgba(15,9,7,0.8)',
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#c4a88e',
                        padding: 14,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        usePointStyle: true,
                        pointStyleWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#2c1810',
                    titleColor: '#d4a574',
                    bodyColor: '#f5e6d3',
                    borderColor: 'rgba(212,165,116,0.2)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(ctx) {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.parsed / total) * 100).toFixed(1);
                            return ` ₹${ctx.parsed.toLocaleString('en-IN')} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '55%',
        }
    });

    // Profit cards
    DOM.profitCards.innerHTML = '';
    labels.forEach((name, i) => {
        const card = document.createElement('div');
        card.className = 'profit-card';
        card.innerHTML = `
            <span class="profit-card-dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
            <span class="profit-card-name">${escapeHtml(name)}</span>
            <span class="profit-card-count">${itemCount[name]} orders</span>
            <span class="profit-card-value">₹${data[i].toLocaleString('en-IN')}</span>
        `;
        DOM.profitCards.appendChild(card);
    });
}

// ============================================================
// PDF EXPORT
// ============================================================
DOM.exportPdfBtn.addEventListener('click', () => {
    const filtered = getFilteredOrders();
    if (filtered.length === 0) {
        showToast('No orders to export.', 'error');
        return;
    }

    // Build HTML for PDF
    const totalProfit = filtered.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);

    let tableRows = filtered.map((o, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(o.orderId || '—')}</td>
            <td>${escapeHtml(o.customerName || '—')}</td>
            <td>${escapeHtml(o.phone || '—')}</td>
            <td>${escapeHtml(o.item || '—')}</td>
            <td>₹${(parseFloat(o.amount) || 0).toLocaleString('en-IN')}</td>
            <td>${o.orderDate ? formatDate(o.orderDate) : '—'}</td>
        </tr>
    `).join('');

    const pdfHtml = `
        <div class="pdf-export-area">
            <h2>LASA CHOCOLATES – Order Report</h2>
            <p style="text-align:center;margin-bottom:12px;font-size:11px;color:#666;">
                Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} &nbsp;|&nbsp;
                Total Orders: ${filtered.length} &nbsp;|&nbsp; Total Profit: ₹${totalProfit.toLocaleString('en-IN')}
            </p>
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Item</th>
                        <th>Amount</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            <p class="pdf-footer">LASA CHOCOLATES – Confidential</p>
        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = pdfHtml;
    document.body.appendChild(container);

    const opt = {
        margin: 0.4,
        filename: `LASA_Orders_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(container.firstElementChild).save().then(() => {
        document.body.removeChild(container);
        showToast('PDF downloaded successfully!', 'success');
    }).catch((err) => {
        console.error(err);
        document.body.removeChild(container);
        showToast('Error generating PDF.', 'error');
    });
});

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> <span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Close modals on overlay click
DOM.orderModal.addEventListener('click', (e) => {
    if (e.target === DOM.orderModal) closeModal();
});

DOM.deleteModal.addEventListener('click', (e) => {
    if (e.target === DOM.deleteModal) {
        DOM.deleteModal.classList.remove('show');
        deleteDocId = null;
    }
});

// Keyboard: Escape closes modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        DOM.deleteModal.classList.remove('show');
        deleteDocId = null;
    }
});
