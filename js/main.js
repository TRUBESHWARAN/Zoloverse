const BACKEND_URL = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'api/';
let productsData = [];
let filteredProducts = [];
let cartItemCount = 0;
let activeProductId = null;
let activeProduct = null;

const categoryLabels = {
  tamil_actors: 'Tamil Actors',
  spiderman: 'Spider-Man',
  cars: 'Automotive',
  others: 'Minimalist & Tech'
};

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function syncCatalogMatrix() {
  try {
    const response = await fetch(`${BACKEND_URL}products.php`);
    productsData = await response.json();
    if (!Array.isArray(productsData)) {
      productsData = [];
    }
  } catch (e) {
    productsData = [];
  }
  filteredProducts = [...productsData];
  applyFiltersAndSort();
  restoreCart();
}

function restoreCart() {
  const cart = JSON.parse(localStorage.getItem('zoloverse_cart_payload') || '[]');
  cartItemCount = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartCountBadge').innerText = cartItemCount;
  if (cart.length) renderCartSidebarUI(cart);
}

function getMinPrice(product) {
  if (!product.variants || !product.variants.length) return 249;
  return Math.min(...product.variants.map(v => parseFloat(v.price)));
}

function renderStars(rating) {
  const r = Math.round(rating || 0);
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  document.getElementById('productCount').innerText = filteredProducts.length;

  if (!filteredProducts.length) {
    grid.innerHTML = '<p class="text-muted" style="grid-column:1/-1; text-align:center; padding:40px">No stickers match your filters.</p>';
    return;
  }

  filteredProducts.forEach((product, idx) => {
    const minPrice = getMinPrice(product);
    const rating = product.avg_rating || (3.5 + (product.id % 3) * 0.5);
    const reviewCount = product.review_count || 0;
    const inStock = (product.stock_qty ?? 50) > 0;
    const lowStock = inStock && product.stock_qty <= 5;
    const badge = idx < 3 ? '<span class="card-badge">Best Seller</span>' : '';
    const lowBadge = lowStock ? '<span class="card-badge low-stock">Low Stock</span>' : '';

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      ${badge}${lowBadge}
      <img src="${product.img}" alt="${product.title}" loading="lazy"
        onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80';">
      <div class="product-meta">
        <div class="product-category">${categoryLabels[product.category] || product.category}</div>
        <h3>${product.title}</h3>
        <div class="product-rating">${renderStars(rating)} <span>${rating.toFixed(1)}</span> <span style="color:var(--text-muted); font-weight:400">(${reviewCount || 'New'})</span></div>
        <div class="price-row">
          <span class="price-from">From</span>
          <div class="product-price">₹${minPrice}</div>
        </div>
        <div class="stock-label ${inStock ? '' : 'out'}">${inStock ? (lowStock ? `Only ${product.stock_qty} left` : 'In Stock') : 'Out of Stock'}</div>
        <div class="product-card-actions">
          <button class="btn btn-outline btn-quick" onclick="event.stopPropagation(); openModalById(${product.id})">View</button>
          <button class="btn btn-primary btn-quick" ${inStock ? '' : 'disabled style="opacity:0.5"'} onclick="event.stopPropagation(); quickAddToCart(${product.id})">Add to Cart</button>
        </div>
      </div>`;
    card.onclick = () => openModalById(product.id);
    grid.appendChild(card);
  });
}

function applyFiltersAndSort() {
  const checkedCats = [...document.querySelectorAll('.shop-sidebar input[type=checkbox][value]:checked')]
    .map(c => c.value).filter(v => ['tamil_actors','spiderman','cars','others'].includes(v));
  const maxPrice = parseInt(document.getElementById('priceRange')?.value || 1000);
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const sort = document.getElementById('sortBy')?.value || 'newest';

  filteredProducts = productsData.filter(p => {
    if (checkedCats.length && !checkedCats.includes(p.category)) return false;
    if (getMinPrice(p) > maxPrice) return false;
    if (search && !p.title.toLowerCase().includes(search)) return false;
    return true;
  });

  filteredProducts.sort((a, b) => {
    if (sort === 'price-low') return getMinPrice(a) - getMinPrice(b);
    if (sort === 'price-high') return getMinPrice(b) - getMinPrice(a);
    if (sort === 'popular') return (b.review_count || 0) - (a.review_count || 0);
    return b.id - a.id;
  });
  renderProducts();
}

function openModalById(id) {
  const product = productsData.find(p => p.id == id);
  if (!product) return;
  activeProductId = product.id;
  activeProduct = product;
  openModal(product);
}

function openModal(product) {
  document.getElementById('modalTitle').innerText = product.title;
  document.getElementById('modalImage').src = product.img;
  document.querySelector('.modal-breadcrumb')?.remove();
  const bc = document.createElement('div');
  bc.className = 'modal-breadcrumb';
  bc.textContent = categoryLabels[product.category] || product.category;
  document.querySelector('.modal-details > div').prepend(bc);

  const variants = product.variants || [{ size: 'A4', price: 99 }];
  const sizeContainer = document.getElementById('modalSizeOptions');
  sizeContainer.innerHTML = variants.map((v, i) =>
    `<button class="size-btn ${i === 0 ? 'selected' : ''}" data-size="${v.size}" data-price="${v.price}">${v.size} — ₹${v.price}</button>`
  ).join('');
  bindSizeButtons();

  updateModalPrice();
  document.getElementById('qtyInput').value = 1;
  document.getElementById('productModal').classList.add('active');
  loadProductReviews(product.id);
}

function bindSizeButtons() {
  document.querySelectorAll('#modalSizeOptions .size-btn').forEach(btn => {
    btn.onclick = function () {
      document.querySelectorAll('#modalSizeOptions .size-btn').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      updateModalPrice();
    };
  });
}

function updateModalPrice() {
  const sel = document.querySelector('#modalSizeOptions .size-btn.selected');
  const price = sel ? sel.dataset.price : getMinPrice(activeProduct);
  document.getElementById('modalPrice').innerHTML = `<span class="price-main">₹${price}</span><div class="price-note">Inclusive of all taxes</div>`;
}

async function loadProductReviews(productId) {
  const list = document.getElementById('modalReviewsList');
  try {
    const res = await fetch(`${BACKEND_URL}review.php?product_id=${productId}`);
    const reviews = await res.json();
    if (!reviews.length) {
      list.innerHTML = '<p class="text-muted" style="font-size:0.9rem">No reviews yet. Be the first!</p>';
    } else {
      list.innerHTML = reviews.slice(0, 5).map(r => `
        <div class="review-item">
          <div class="review-stars">${renderStars(r.rating)}</div>
          <div class="review-author">${r.user_name}</div>
          <div class="review-text">${r.comment || ''}</div>
        </div>`).join('');
    }
  } catch (e) {
    list.innerHTML = '<p class="text-muted">Reviews unavailable.</p>';
  }
  const token = localStorage.getItem('zoloverse_token');
  document.getElementById('reviewFormWrap').style.display = token ? 'block' : 'none';
}

async function submitReview() {
  const token = localStorage.getItem('zoloverse_token');
  const user = JSON.parse(localStorage.getItem('zoloverse_user') || '{}');
  if (!token) { window.location.href = 'login.html'; return; }
  const res = await fetch(`${BACKEND_URL}review.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: activeProductId,
      user_name: user.name || 'Customer',
      rating: parseInt(document.getElementById('reviewRating').value),
      comment: document.getElementById('reviewComment').value
    })
  });
  const data = await res.json();
  showToast(data.message || 'Review submitted!');
  document.getElementById('reviewComment').value = '';
}

function quickAddToCart(id) {
  openModalById(id);
  setTimeout(() => addToCart(), 100);
}

async function addToCart() {
  const token = localStorage.getItem('zoloverse_token');
  if (!token) {
    showToast('Please sign in to add items to cart');
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    return;
  }

  const title = document.getElementById('modalTitle').innerText;
  const selectedBtn = document.querySelector('#modalSizeOptions .size-btn.selected');
  const dbSize = selectedBtn ? selectedBtn.dataset.size : 'A4';
  const priceVal = selectedBtn ? selectedBtn.dataset.price : getMinPrice(activeProduct);
  const productId = activeProductId || 1;
  const qty = parseInt(document.getElementById('qtyInput').value) || 1;

  let currentCart = JSON.parse(localStorage.getItem('zoloverse_cart_payload') || '[]');
  currentCart.push({ product_id: productId, title, price: '₹' + priceVal, size: dbSize, qty });
  localStorage.setItem('zoloverse_cart_payload', JSON.stringify(currentCart));

  cartItemCount += qty;
  document.getElementById('cartCountBadge').innerText = cartItemCount;
  renderCartSidebarUI(currentCart);
  showToast(`Added ${qty} item(s) to cart`);
  closeModal();
}

function renderCartSidebarUI(cart) {
  let priceSum = 0;
  const container = document.getElementById('cartItems');
  if (!cart.length) {
    container.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    document.getElementById('cartTotal').innerText = '₹0';
    return;
  }
  container.innerHTML = cart.map((item, idx) => {
    const rawNumeric = parseInt(String(item.price).replace(/[^\d]/g, '')) || 0;
    priceSum += rawNumeric * item.qty;
    return `<div style="padding:12px 0; border-bottom:1px solid var(--glass-border);">
      <div style="display:flex; justify-content:space-between; align-items:start;">
        <div><strong style="font-size:0.9rem">${item.title}</strong><br>
        <small style="color:var(--text-muted)">${item.size} × ${item.qty}</small></div>
        <div style="text-align:right">
          <span style="color:var(--neon-bright); font-weight:700">${item.price}</span><br>
          <button onclick="removeCartItem(${idx})" style="background:none;border:none;color:#ff595e;font-size:0.78rem;cursor:pointer;margin-top:4px">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('cartTotal').innerText = '₹' + priceSum.toLocaleString('en-IN');
}

function removeCartItem(idx) {
  let cart = JSON.parse(localStorage.getItem('zoloverse_cart_payload') || '[]');
  cartItemCount -= cart[idx]?.qty || 0;
  cart.splice(idx, 1);
  localStorage.setItem('zoloverse_cart_payload', JSON.stringify(cart));
  document.getElementById('cartCountBadge').innerText = Math.max(0, cartItemCount);
  renderCartSidebarUI(cart);
}

function openCheckout() {
  const token = localStorage.getItem('zoloverse_token');
  const items = JSON.parse(localStorage.getItem('zoloverse_cart_payload') || '[]');
  if (!token) { window.location.href = 'login.html'; return; }
  if (!items.length) { showToast('Your cart is empty'); return; }

  let total = 0;
  document.getElementById('checkoutSummary').innerHTML = items.map(i => {
    const p = parseInt(String(i.price).replace(/[^\d]/g, '')) || 0;
    total += p * i.qty;
    return `<div class="checkout-summary-item"><span>${i.title} (${i.size}) × ${i.qty}</span><span>${i.price}</span></div>`;
  }).join('');
  document.getElementById('checkoutTotalDisplay').textContent = '₹' + total.toLocaleString('en-IN');
  document.getElementById('checkoutOverlay').classList.add('active');
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('active');
}

async function submitOrder(e) {
  e.preventDefault();
  const token = localStorage.getItem('zoloverse_token');
  const items = JSON.parse(localStorage.getItem('zoloverse_cart_payload') || '[]');
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  const totalVal = parseFloat(document.getElementById('checkoutTotalDisplay').textContent.replace(/[^\d]/g, ''));

  try {
    const res = await fetch(`${BACKEND_URL}orders.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items,
        total_amount: totalVal,
        customer_name: document.getElementById('checkoutName').value,
        phone: document.getElementById('checkoutPhone').value,
        address: document.getElementById('checkoutAddress').value
      })
    });
    const status = await res.json();
    if (status.orderId) {
      localStorage.removeItem('zoloverse_cart_payload');
      closeCheckout();
      showToast(`Order #${status.orderId} placed successfully!`);
      cartItemCount = 0;
      document.getElementById('cartCountBadge').innerText = '0';
      renderCartSidebarUI([]);
      document.getElementById('checkoutForm').reset();
    } else {
      showToast(status.message || 'Order failed. Please try again.');
    }
  } catch (err) {
    showToast('Unable to place order. Check your connection.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Place Order';
  }
}

document.querySelector('.checkout-btn').onclick = openCheckout;

function showPage(pageId) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelector(`.nav-item[onclick="showPage('${pageId}')"]`)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleCart() {
  document.getElementById('cartSidebar').classList.toggle('open');
}

function updateQty(change) {
  const input = document.getElementById('qtyInput');
  let newVal = parseInt(input.value) + change;
  if (newVal >= 1) input.value = newVal;
}

function closeModal() {
  document.getElementById('productModal').classList.remove('active');
}

document.getElementById('searchInput')?.addEventListener('input', applyFiltersAndSort);
document.getElementById('sortBy')?.addEventListener('change', applyFiltersAndSort);
document.getElementById('priceRange')?.addEventListener('input', function (e) {
  document.getElementById('priceValue').innerText = '₹' + e.target.value;
  applyFiltersAndSort();
});
document.querySelectorAll('.shop-sidebar input[type=checkbox]').forEach(cb => {
  cb.addEventListener('change', applyFiltersAndSort);
});
document.querySelector('.reset-filters')?.addEventListener('click', () => {
  document.querySelectorAll('.shop-sidebar input[type=checkbox]').forEach(c => c.checked = false);
  document.getElementById('priceRange').value = 1000;
  document.getElementById('priceValue').innerText = '₹1000';
  document.getElementById('searchInput').value = '';
  applyFiltersAndSort();
});

window.onload = syncCatalogMatrix;