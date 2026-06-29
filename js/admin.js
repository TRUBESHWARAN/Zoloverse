const API = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'api/';
let products = [];
let searchTimer;

const titles = {
  dashboard: 'Dashboard', products: 'Products', 'add-product': 'Add Product',
  orders: 'Orders', customers: 'Customers', reviews: 'Reviews'
};

function switchPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.menu li a').forEach(a => a.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  document.getElementById('nav-' + id)?.classList.add('active');
  document.getElementById('pageTitle').textContent = titles[id] || id;
  if (id === 'products') renderProductsTable();
  if (id === 'orders') loadOrders();
  if (id === 'customers') loadCustomers();
  if (id === 'reviews') loadReviews();
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: getAuthHeaders() });
  if (res.status === 401) { executeLogout(); return null; }
  return res;
}

async function checkSystemHealth() {
  const el = document.getElementById('systemStatus');
  try {
    const res = await fetch(API + 'health.php');
    const data = await res.json();
    const up = data.status === 'operational';
    el.className = 'status-pill ' + (up ? 'up' : 'down');
    el.innerHTML = `<span class="dot"></span> ${up ? 'All Systems Operational' : 'Service Degraded'}`;
  } catch (e) {
    el.className = 'status-pill down';
    el.innerHTML = '<span class="dot"></span> Backend Offline';
  }
}

async function loadDashboard() {
  const res = await apiFetch(API + 'orders.php?action=dashboard_kpis');
  if (!res) return;
  const k = await res.json();
  document.getElementById('kpiRevenue').textContent = k.totalRevenueFormatted || ('₹' + k.totalRevenue);
  document.getElementById('kpiOrders').textContent = k.totalOrders;
  document.getElementById('kpiUsers').textContent = k.activeUsers;
  document.getElementById('kpiProducts').textContent = k.totalProducts;
  document.getElementById('kpiPending').textContent = k.pendingOrders;
  document.getElementById('kpiPrint').textContent = k.printQueue;

  const pendingBadge = document.getElementById('pendingBadge');
  if (k.pendingOrders > 0) { pendingBadge.textContent = k.pendingOrders; pendingBadge.style.display = 'inline'; }
  else pendingBadge.style.display = 'none';

  const reviewBadge = document.getElementById('reviewBadge');
  if (k.pendingReviews > 0) { reviewBadge.textContent = k.pendingReviews; reviewBadge.style.display = 'inline'; }
  else reviewBadge.style.display = 'none';

  loadUrgentAlerts(k);
  loadRecentOrders();
}

async function loadUrgentAlerts(kpis) {
  const container = document.getElementById('urgentAlerts');
  const alerts = [];
  if (kpis.pendingOrders > 0) alerts.push({ type: 'urgent', icon: 'fa-clock', text: `${kpis.pendingOrders} order(s) waiting for processing` });
  if (kpis.lowStock > 0) alerts.push({ type: 'warning', icon: 'fa-box-open', text: `${kpis.lowStock} product(s) running low on stock` });
  if (kpis.pendingReviews > 0) alerts.push({ type: 'warning', icon: 'fa-star', text: `${kpis.pendingReviews} review(s) awaiting moderation` });
  if (kpis.printQueue > 0) alerts.push({ type: 'urgent', icon: 'fa-print', text: `${kpis.printQueue} order(s) in print queue` });

  if (alerts.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--success); font-size:1.5rem; margin-bottom:8px; display:block"></i>All clear — no urgent tasks</div>';
    return;
  }
  container.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.type}"><i class="fas ${a.icon}"></i><span>${a.text}</span></div>
  `).join('');
}

async function loadRecentOrders() {
  const res = await apiFetch(API + 'orders.php');
  if (!res) return;
  const orders = (await res.json()).slice(0, 8);
  const tbody = document.getElementById('recentOrdersBody');
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No orders yet</td></tr>'; return; }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>#${o.id}</td>
      <td><strong>${o.customer}</strong><br><small style="color:var(--muted)">${o.phone || ''}</small></td>
      <td>${(o.products || []).map(i => `${i.product_title} (${i.size}) x${i.qty}`).join('<br>')}</td>
      <td style="color:var(--accent); font-weight:700">₹${parseFloat(o.amount).toFixed(0)}</td>
      <td>${statusBadge(o.status)}</td>
    </tr>
  `).join('');
}

function statusBadge(s) {
  const map = { Waiting: 'badge-waiting', Printing: 'badge-printing', Printed: 'badge-printing', Shipped: 'badge-shipped', Delivered: 'badge-delivered' };
  return `<span class="badge ${map[s] || 'badge-waiting'}">${s}</span>`;
}

async function loadProducts() {
  const res = await fetch(API + 'products.php');
  products = await res.json();
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!products.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No products. Add your first sticker!</td></tr>'; return; }
  tbody.innerHTML = products.map(p => {
    const prices = (p.variants || []).map(v => `${v.size}: ₹${v.price}`).join(', ');
    const stockClass = p.stock_qty <= 5 ? 'style="color:var(--danger); font-weight:700"' : '';
    return `<tr>
      <td><img src="${p.img}" class="table-img" onerror="this.src='https://via.placeholder.com/48'"></td>
      <td><strong>${p.title}</strong></td>
      <td><span class="badge badge-printing">${p.category}</span></td>
      <td>${prices || '—'}</td>
      <td ${stockClass}>${p.stock_qty}</td>
      <td>${p.status}</td>
      <td><div class="action-group">
        <button class="btn btn-secondary btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

function handleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('prodImageBase64').value = e.target.result;
    const preview = document.getElementById('imagePreview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('uploadText').textContent = 'Image loaded ✓';
  };
  reader.readAsDataURL(file);
}

async function saveProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('saveProductBtn');
  btn.disabled = true;
  const img = document.getElementById('prodImageBase64').value;
  if (!img) { alert('Please upload a product image.'); btn.disabled = false; return; }

  const payload = {
    id: document.getElementById('editProductId').value || undefined,
    title: document.getElementById('prodTitle').value,
    category: document.getElementById('prodCategory').value,
    description: document.getElementById('prodDescription').value,
    img,
    stock_qty: parseInt(document.getElementById('prodStock').value),
    status: document.getElementById('prodStatus').value,
    prices: {
      A4: parseFloat(document.getElementById('priceA4').value),
      A3: parseFloat(document.getElementById('priceA3').value),
      A2: parseFloat(document.getElementById('priceA2').value)
    }
  };

  const res = await apiFetch(API + 'products.php', { method: 'POST', body: JSON.stringify(payload) });
  btn.disabled = false;
  if (!res) return;
  const data = await res.json();
  if (data.success) {
    resetProductForm();
    await loadProducts();
    switchPanel('products');
  } else alert(data.message || 'Save failed');
}

function editProduct(id) {
  const p = products.find(x => x.id == id);
  if (!p) return;
  document.getElementById('editProductId').value = p.id;
  document.getElementById('prodTitle').value = p.title;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodStock').value = p.stock_qty;
  document.getElementById('prodStatus').value = p.status || 'Available';
  document.getElementById('prodDescription').value = p.description || '';
  document.getElementById('prodImageBase64').value = p.img;
  const preview = document.getElementById('imagePreview');
  preview.src = p.img; preview.style.display = 'block';
  document.getElementById('uploadText').textContent = 'Current image loaded';
  (p.variants || []).forEach(v => {
    const el = document.getElementById('price' + v.size);
    if (el) el.value = v.price;
  });
  document.getElementById('productFormTitle').innerHTML = '<i class="fas fa-edit" style="color:var(--accent)"></i> Edit Product';
  switchPanel('add-product');
}

async function deleteProduct(id) {
  if (!confirm('Delete this product permanently?')) return;
  await apiFetch(API + 'products.php?id=' + id, { method: 'DELETE' });
  await loadProducts();
  renderProductsTable();
}

function resetProductForm() {
  document.getElementById('productForm').reset();
  document.getElementById('editProductId').value = '';
  document.getElementById('prodImageBase64').value = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('uploadText').textContent = 'Click or drag to upload image';
  document.getElementById('productFormTitle').innerHTML = '<i class="fas fa-plus-circle" style="color:var(--accent)"></i> Add New Product';
  document.getElementById('prodStock').value = 50;
}

async function loadOrders() {
  const res = await apiFetch(API + 'orders.php');
  if (!res) return;
  const orders = await res.json();
  const tbody = document.getElementById('ordersTableBody');
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No orders yet</td></tr>'; return; }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>#${o.id}</strong></td>
      <td>${formatDate(o.created_at)}</td>
      <td>${o.customer}</td>
      <td>${o.phone || '—'}</td>
      <td style="max-width:180px; font-size:0.85rem">${o.address || '—'}</td>
      <td>${(o.products || []).map(i => `${i.product_title} (${i.size}) x${i.qty}`).join('<br>')}</td>
      <td style="font-weight:700; color:var(--accent)">₹${parseFloat(o.amount).toFixed(0)}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus(${o.id}, this.value)">
          ${['Waiting','Printing','Printed','Shipped','Delivered'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
    </tr>
  `).join('');
}

async function updateOrderStatus(orderId, status) {
  await apiFetch(API + 'orders.php', {
    method: 'PUT',
    body: JSON.stringify({ order_id: orderId, target_status: status })
  });
  loadDashboard();
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function debounceCustomerSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadCustomers, 350);
}

async function loadCustomers() {
  const q = document.getElementById('customerSearch')?.value || '';
  const res = await apiFetch(API + 'orders.php?action=customers_log&search=' + encodeURIComponent(q));
  if (!res) return;
  const customers = await res.json();
  const tbody = document.getElementById('customersTableBody');
  if (!customers.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No customers found</td></tr>'; return; }
  tbody.innerHTML = customers.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.email}</td>
      <td>${c.phone || '—'}</td>
      <td>${c.totalOrders}</td>
      <td style="font-weight:700; color:var(--accent)">₹${parseFloat(c.totalSpending || 0).toFixed(0)}</td>
    </tr>
  `).join('');
}

async function loadReviews() {
  const res = await apiFetch(API + 'review.php?scope=all_admin');
  if (!res) return;
  const reviews = await res.json();
  const tbody = document.getElementById('reviewsTableBody');
  if (!reviews.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No reviews yet</td></tr>'; return; }
  tbody.innerHTML = reviews.map(r => {
    const statusClass = { Pending: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected' };
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    return `<tr>
      <td>${r.product_title}</td>
      <td>${r.user_name}</td>
      <td><span class="stars">${stars}</span></td>
      <td style="max-width:200px">${r.comment || '—'}</td>
      <td><span class="badge ${statusClass[r.status] || 'badge-pending'}">${r.status}</span></td>
      <td>${r.status === 'Pending' ? `
        <div class="action-group">
          <button class="btn btn-success btn-sm" onclick="moderateReview(${r.id}, 'Approved')"><i class="fas fa-check"></i></button>
          <button class="btn btn-danger btn-sm" onclick="moderateReview(${r.id}, 'Rejected')"><i class="fas fa-times"></i></button>
        </div>` : '—'}
      </td>
    </tr>`;
  }).join('');
}

async function moderateReview(id, status) {
  await apiFetch(API + 'review.php', {
    method: 'PUT',
    body: JSON.stringify({ review_id: id, status })
  });
  loadReviews();
  loadDashboard();
}

window.onload = async () => {
  await verifySession();
  checkSystemHealth();
  await loadProducts();
  loadDashboard();
  setInterval(() => { checkSystemHealth(); loadDashboard(); }, 15000);
};