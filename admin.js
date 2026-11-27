(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const sizes = [28, 30, 32, 34, 36];
  const orderStatuses = ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  const paymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD'];
  const fitOptions = ['Baggy', 'Wide', 'Straight', 'Slim', 'Carpenter', 'Bootcut'];
  const filters = { productQuery: '', orderQuery: '', orderStatus: 'ALL', productStatus: 'all', fit: 'all', sort: 'name' };
  let authorizedUser = null;
  let orders = [];
  let products = [];
  let coupons = [];
  let editingProductId = null;
  let selectedFiles = [];
  let imageUrls = [];
  let tags = [];
  let toastTimer;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');
  const isPublished = (product) => product?.is_active === true;
  const statusOf = (order) => String(order.order_status || 'CONFIRMED').toUpperCase();
  const isAdmin = (user) => user?.app_metadata?.role === 'admin' || user?.app_metadata?.roles?.includes('admin');
  const canManage = () => isAdmin(authorizedUser);

  function notify(text, error = false) {
    const toast = $('#admin-toast');
    toast.textContent = text;
    toast.classList.toggle('is-error', error);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }
  function loginMessage(text) { $('#admin-message').textContent = text; }
  function paintKpis() {
    const revenue = orders.reduce((sum, order) => statusOf(order) === 'CANCELLED' ? sum : sum + Number(order.total_amount ?? order.total ?? order.amount ?? order.total_price ?? 0), 0);
    const active = orders.filter((order) => ['CONFIRMED', 'PACKED', 'SHIPPED'].includes(statusOf(order))).length;
    const low = products.reduce((sum, product) => sum + sizes.filter((size) => Number(product[`stock_${size}`] ?? 0) <= 5).length, 0);
    $('#kpi-revenue').textContent = money(revenue);
    $('#kpi-orders').textContent = String(active).padStart(2, '0');
    $('#kpi-stock').textContent = String(low).padStart(2, '0');
    $('#kpi-catalog').textContent = String(products.filter(isPublished).length).padStart(2, '0');
    const orderCount = String(orders.length).padStart(2, '0');
    $('#orders-nav-count').textContent = orderCount;
    $('#orders-title-count').textContent = orderCount;
  }

  async function loadOrders() {
    if (!canManage()) return;
    const { data, error } = await window.sb.from('orders').select('*').order('created_at', { ascending: false });
    if (error) { $('#admin-orders').innerHTML = `<tr><td colspan="6" class="admin-empty">${esc(error.message)}</td></tr>`; return; }
    orders = data || [];
    paintKpis(); renderOrders(); renderRecentOrders();
  }
  async function loadProducts() {
    if (!canManage()) return;
    const { data, error } = await window.sb.from('products').select('*').order('name');
    if (error) { $('#admin-products').innerHTML = `<tr><td colspan="5" class="admin-empty">${esc(error.message)}</td></tr>`; return; }
    products = data || [];
    paintKpis(); renderProducts();
    window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: products }));
  }
  async function loadCoupons() {
    if (!canManage()) return;
    const { data, error } = await window.sb.from('coupons').select('*').order('code');
    if (error) { $('#admin-coupons').innerHTML = `<p class="admin-empty">${esc(error.message)}</p>`; return; }
    coupons = data || []; renderCoupons();
  }
  async function loadWorkspace() { if (canManage()) await Promise.all([loadOrders(), loadProducts(), loadCoupons()]); }

  function renderProducts() {
    const query = filters.productQuery.toLowerCase();
    let visible = products.filter((product) => {
      const published = isPublished(product);
      if (filters.productStatus === 'published' && !published) return false;
      if (filters.productStatus === 'draft' && published) return false;
      const productFit = String(product.fit || '').replace(/^Wide-Leg$/i, 'Wide');
      if (filters.fit !== 'all' && productFit.toLowerCase() !== filters.fit.toLowerCase()) return false;
      const text = [product.name, product.fit, product.wash, product.badge, product.gsm].filter(Boolean).join(' ').toLowerCase();
      return !query || text.includes(query);
    });
    if (filters.sort === 'price-asc') visible.sort((a, b) => Number(a.price) - Number(b.price));
    if (filters.sort === 'price-desc') visible.sort((a, b) => Number(b.price) - Number(a.price));
    if (filters.sort === 'stock') visible.sort((a, b) => stockTotal(a) - stockTotal(b));
    if (filters.sort === 'name') visible.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    $('#product-count-badge').textContent = String(products.length).padStart(2, '0');
    $('#product-results-count').textContent = `${visible.length} PRODUCTS`;
    const tbody = $('#admin-products');
    if (!visible.length) { tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">NO PRODUCTS MATCH THIS VIEW.</td></tr>'; return; }
    tbody.innerHTML = visible.map((product) => {
      const image = product.image_url || product.gallery_urls?.[0] || '';
      const total = stockTotal(product);
      const compare = Number(product.sale_price) > 0 ? Number(product.sale_price) : null;
      return `<tr data-product-row="${esc(product.id)}">
        <td><div class="admin-table-product">${image ? `<img src="${esc(image)}" alt="" loading="lazy" />` : '<span class="admin-product-thumb-empty">TJ</span>'}<span><strong>${esc(product.name || 'Untitled product')}</strong><small>${esc(product.fit || 'Denim')} · ${esc(product.gsm || product.fabric_weight_gsm || 450)} GSM</small></span></div></td>
        <td><span class="admin-status-pill ${isPublished(product) ? 'is-published' : 'is-draft'}"><i></i>${isPublished(product) ? 'Published' : 'Draft'}</span></td>
        <td><div class="admin-table-price">${money(product.price)}${compare ? `<del>${money(compare)}</del>` : ''}</div></td>
        <td><span class="admin-inventory-value ${total <= 15 ? 'is-low' : ''}">${total} in stock for 5 variants</span></td>
        <td><div class="admin-table-actions"><button type="button" class="admin-edit-product" data-edit-product="${esc(product.id)}">Edit</button><details class="admin-row-menu"><summary aria-label="More product actions">•••</summary><div><button type="button" data-duplicate-product="${esc(product.id)}">Duplicate</button><button type="button" data-toggle-product="${esc(product.id)}">${isPublished(product) ? 'Set as Draft' : 'Publish'}</button><button type="button" class="is-danger" data-delete-product="${esc(product.id)}">Delete</button></div></details></div></td>
      </tr>`;
    }).join('');
  }
  function stockTotal(product) { return sizes.reduce((sum, size) => sum + Math.max(0, Number(product[`stock_${size}`]) || 0), 0); }
  function renderOrders() {
    const query = filters.orderQuery.toLowerCase();
    const visible = orders.filter((order) => {
      if (filters.orderStatus !== 'ALL' && statusOf(order) !== filters.orderStatus) return false;
      const text = [order.tracking_code, order.order_code, order.customer_name, order.first_name, order.last_name, order.phone, order.customer_phone, order.email].filter(Boolean).join(' ').toLowerCase();
      return !query || text.includes(query);
    });
    $('#admin-orders').innerHTML = visible.length ? visible.map((order) => {
      const name = order.customer_name || [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer';
      const code = order.tracking_code || order.order_code || order.id;
      const payment = String(order.payment_status || 'PENDING').toUpperCase();
      const total = order.total_amount ?? order.total ?? order.amount ?? order.total_price ?? 0;
      return `<tr data-order-id="${esc(order.id)}"><td><button type="button" class="admin-order-identity" data-order-detail="${esc(order.id)}"><strong>${esc(code)}</strong><small>${esc(name)} · ${esc(order.phone || order.customer_phone || '—')}</small></button></td><td class="mono">${esc(order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—')}</td><td class="mono">${money(total)}</td><td><select class="admin-inline-select" data-order-field="order_status">${orderStatuses.map((value) => `<option value="${value}" ${statusOf(order) === value ? 'selected' : ''}>${value}</option>`).join('')}</select></td><td><select class="admin-inline-select" data-order-field="payment_status">${paymentStatuses.map((value) => `<option value="${value}" ${payment === value ? 'selected' : ''}>${value}</option>`).join('')}</select></td><td><button type="button" class="admin-detail-arrow" data-order-detail="${esc(order.id)}" aria-label="View order">↗</button></td></tr>`;
    }).join('') : '<tr><td colspan="6" class="admin-empty">NO ORDERS MATCH THIS VIEW.</td></tr>';
  }
  function renderRecentOrders() {
    const host = $('#admin-recent-orders');
    if (!orders.length) { host.innerHTML = '<p class="admin-empty">No recent orders.</p>'; return; }
    host.innerHTML = `<div class="admin-recent-table">${orders.slice(0, 5).map((order) => `<div><strong>${esc(order.tracking_code || order.order_code || order.id)}</strong><span>${esc(order.customer_name || [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer')}</span><b>${money(order.total_amount ?? order.total ?? order.amount)}</b><i>${esc(statusOf(order))}</i></div>`).join('')}</div>`;
  }
  function renderCoupons() {
    $('#admin-coupons').innerHTML = coupons.length ? coupons.map((coupon) => {
      const active = coupon.is_active !== undefined ? coupon.is_active === true : coupon.active === true;
      return `<article class="admin-coupon-row" data-coupon-id="${esc(coupon.id)}"><div><strong>${esc(coupon.code)}</strong><span class="mono">${money(coupon.discount_amount ?? coupon.amount ?? 0)} OFF · MIN ${money(coupon.min_order_amount || 0)}</span></div><label class="admin-active-switch"><input type="checkbox" data-coupon-active ${active ? 'checked' : ''} /><i></i><span>${active ? 'ACTIVE' : 'PAUSED'}</span></label></article>`;
    }).join('') : '<p class="admin-empty">NO COUPONS FOUND.</p>';
  }
  function setWorkspace(name) {
    if (name === 'editor') return;
    $$('.admin-view').forEach((view) => { view.hidden = view.dataset.view !== name; });
    $$('.admin-nav-item[data-workspace]').forEach((button) => button.classList.toggle('is-active', button.dataset.workspace === name));
    const title = { overview: 'Overview', products: 'Products', orders: 'Orders', coupons: 'Coupons' }[name] || 'Products';
    $('#admin-breadcrumb-current').textContent = title;
    document.body.classList.remove('admin-sidebar-open');
    $('#admin-sidebar-scrim').hidden = true;
  }
  function showEditor() {
    $$('.admin-view').forEach((view) => { view.hidden = view.dataset.view !== 'editor'; });
    $('#admin-breadcrumb-current').textContent = editingProductId ? 'Edit product' : 'Add product';
    document.body.classList.remove('admin-sidebar-open');
    $('#admin-sidebar-scrim').hidden = true;
  }
  function fitCode(value) { return String(value || 'WIDE').replace(/[^a-z0-9]/gi, '').toUpperCase() || 'CUSTOM'; }
  function updateSkuLabels() {
    const fit = $('[name="fit"]')?.value === 'Custom' ? $('[name="custom_fit"]')?.value : $('[name="fit"]')?.value;
    $$('[data-variant-sku]').forEach((node) => { node.textContent = `TJF-${fitCode(fit)}-${node.dataset.variantSku}`; });
  }
  function updatePricePreview() {
    const price = Number($('#product-editor-form [name="price"]').value || 0);
    const sale = Number($('#product-editor-form [name="sale_price"]').value || 0);
    const cost = Number($('#product-cost-preview').value || 0);
    const preview = $('#price-preview');
    if (!price) { preview.textContent = 'Enter a price to preview the comparison.'; return; }
    const margin = cost > 0 ? ` · Gross margin ${money(price - cost)} (${Math.round(((price - cost) / price) * 100)}%)` : ' · Add unit cost for margin preview';
    if (sale > price) {
      const saving = sale - price;
      const percent = Math.round((saving / sale) * 100);
      preview.innerHTML = `Customer price <strong>${money(price)}</strong> · Compare-at <del>${money(sale)}</del> · Save ${percent}% (${money(saving)})${margin}.`;
    } else if (sale > 0) preview.innerHTML = `Customer price <strong>${money(price)}</strong> · Compare-at ${money(sale)}. Set compare-at above price to show a discount${margin}.`;
    else preview.innerHTML = `Customer price <strong>${money(price)}</strong> · No compare-at price${margin}.`;
  }
  function renderTagChips() {
    $('#product-tags-chips').innerHTML = tags.map((tag, index) => `<button type="button" data-remove-tag="${index}">${esc(tag)} <span>×</span></button>`).join('');
    $('#product-editor-form [name="tags"]').value = JSON.stringify(tags);
  }
  function renderPhotoPreviews() {
    const existing = imageUrls.map((url, index) => ({ url, type: 'existing', index }));
    const added = selectedFiles.map((file, index) => ({ url: URL.createObjectURL(file), type: 'new', index }));
    const all = [...existing, ...added];
    $('#product-photo-previews').innerHTML = all.map((photo, index) => `<div class="admin-photo-preview ${index === 0 ? 'is-primary' : ''}"><img src="${esc(photo.url)}" alt="Product photo ${index + 1}" />${index === 0 ? '<span>PRIMARY</span>' : ''}<button type="button" data-remove-photo="${photo.type}:${photo.index}" aria-label="Remove photo">×</button></div>`).join('');
  }
  function openNewProductEditor() {
    editingProductId = null; selectedFiles = []; imageUrls = []; tags = [];
    const form = $('#product-editor-form'); form.reset();
    form.querySelector('[name="gsm"]').value = '450';
    form.querySelector('[name="is_active"]').value = 'true';
    sizes.forEach((size) => { form.querySelector(`[name="stock_${size}"]`).value = '10'; });
    $('#editor-title').textContent = 'Add product'; $('#editor-mode-label').textContent = 'NEW PRODUCT';
    $('#save-product').textContent = 'Save / Publish';
    $('.admin-custom-fit').hidden = true;
    renderTagChips(); renderPhotoPreviews(); updateSkuLabels(); updatePricePreview(); showEditor();
  }
  function editProduct(id) {
    const product = products.find((item) => String(item.id) === String(id));
    if (!product) return;
    editingProductId = product.id; selectedFiles = [];
    imageUrls = Array.isArray(product.gallery_urls) ? product.gallery_urls.slice() : (product.image_url ? [product.image_url] : []);
    tags = Array.isArray(product.tags) ? product.tags.slice() : [];
    const form = $('#product-editor-form'); form.reset();
    form.querySelector('[name="name"]').value = product.name || '';
    form.querySelector('[name="description"]').value = product.description || '';
    form.querySelector('[name="price"]').value = product.price ?? '';
    form.querySelector('[name="sale_price"]').value = product.sale_price ?? '';
    $('#product-cost-preview').value = product.cost_price ?? '';
    form.querySelector('[name="image_url"]').value = product.image_url || '';
    form.querySelector('[name="gsm"]').value = product.gsm ?? product.fabric_weight_gsm ?? 450;
    form.querySelector('[name="wash"]').value = product.wash || '';
    form.querySelector('[name="badge"]').value = product.badge || '';
    const fit = product.fit === 'Wide-Leg' ? 'Wide' : product.fit || 'Baggy';
    form.querySelector('[name="fit"]').value = fitOptions.includes(fit) ? fit : 'Custom';
    const custom = $('.admin-custom-fit'); custom.hidden = form.querySelector('[name="fit"]').value !== 'Custom';
    form.querySelector('[name="custom_fit"]').value = custom.hidden ? '' : product.fit;
    form.querySelector('[name="is_active"]').value = String(isPublished(product));
    sizes.forEach((size) => { form.querySelector(`[name="stock_${size}"]`).value = Math.max(0, Number(product[`stock_${size}`]) || 0); });
    $('#editor-title').textContent = product.name || 'Edit product'; $('#editor-mode-label').textContent = 'EDIT PRODUCT';
    $('#save-product').textContent = isPublished(product) ? 'Save / Publish' : 'Save Draft';
    renderTagChips(); renderPhotoPreviews(); updateSkuLabels(); updatePricePreview(); showEditor();
  }
  function returnToProducts() { setWorkspace('products'); }
  function stockValues(formData) { return Object.fromEntries(sizes.map((size) => [`stock_${size}`, Math.max(0, Math.floor(Number(formData.get(`stock_${size}`)) || 0))])); }
  async function uploadPhotos(files) {
    const uploaded = [];
    for (const file of files) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
      const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error } = await window.sb.storage.from('product-images').upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = window.sb.storage.from('product-images').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('The image upload did not return a public URL.');
      uploaded.push(data.publicUrl);
    }
    return uploaded;
  }
  async function saveProduct(event) {
    event.preventDefault(); if (!canManage()) return;
    const form = $('#product-editor-form'); const formData = new FormData(form);
    const button = $('#save-product'); const feedback = $('#product-form-message');
    button.disabled = true; button.textContent = 'SAVING…'; feedback.textContent = '';
    try {
      let urls = imageUrls.slice();
      if (selectedFiles.length) urls.push(...await uploadPhotos(selectedFiles));
      const external = String(formData.get('image_url') || '').trim();
      if (external && !/^https?:\/\//i.test(external)) throw new Error('Image URL must begin with http:// or https://.');
      if (external && !urls.includes(external)) urls.unshift(external);
      urls = Array.from(new Set(urls));
      if (!urls.length) throw new Error('Add at least one product photo or an external image URL.');
      const rawFit = String(formData.get('fit'));
      const fit = rawFit === 'Custom' ? String(formData.get('custom_fit')).trim() : rawFit;
      if (!fit) throw new Error('Enter a custom fit category.');
      tags = JSON.parse(String(formData.get('tags') || '[]'));
      const payload = {
        name: String(formData.get('name')).trim(), description: String(formData.get('description') || '').trim(),
        price: Number(formData.get('price')), sale_price: Number(formData.get('sale_price')) || null,
        image_url: urls[0], gallery_urls: urls, fit, wash: String(formData.get('wash') || '').trim(),
        badge: String(formData.get('badge') || '').trim(), tags,
        gsm: Number(formData.get('gsm')) || 450, is_active: formData.get('is_active') === 'true',
        ...stockValues(formData),
      };
      const existing = products.find((product) => String(product.id) === String(editingProductId));
      if (existing && Object.prototype.hasOwnProperty.call(existing, 'cost_price')) payload.cost_price = Number($('#product-cost-preview').value) || null;
      let response;
      if (editingProductId) response = await window.sb.from('products').update(payload).eq('id', editingProductId).select('*').single();
      else response = await window.sb.from('products').insert(payload).select('*').single();
      if (response.error) throw response.error;
      if (editingProductId) products = products.map((product) => String(product.id) === String(editingProductId) ? response.data : product);
      else products.unshift(response.data);
      paintKpis(); renderProducts();
      window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: products }));
      const wasPublished = payload.is_active;
      editingProductId = null; selectedFiles = []; imageUrls = [];
      notify(wasPublished ? 'PRODUCT PUBLISHED' : 'DRAFT SAVED');
      returnToProducts();
    } catch (error) {
      feedback.textContent = error.message || 'Product could not be saved.';
      notify(`SAVE FAILED · ${error.message || 'PRODUCT ERROR'}`, true);
    } finally { button.disabled = false; button.textContent = $('#product-editor-form [name="is_active"]').value === 'true' ? 'Save / Publish' : 'Save Draft'; }
  }

  function addressText(order) {
    const address = order.shipping_address || order.address || order.customer?.shipping_address || order.customer || {};
    if (typeof address === 'string') return address;
    return [address.address1 || address.address_line_1 || order.address1, address.address2 || address.address_line_2 || order.address2, address.city || order.city, address.state || order.state, address.pincode || address.postal_code || order.pincode, address.country || order.country].filter(Boolean).join(', ');
  }
  function showOrderDetail(id) {
    const order = orders.find((item) => String(item.id) === String(id)); if (!order) return;
    const code = order.tracking_code || order.order_code || order.id;
    const name = order.customer_name || [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer';
    const lines = Array.isArray(order.items) ? order.items : (Array.isArray(order.order_items) ? order.order_items : []);
    const items = lines.map((item) => { const qty = Number(item.quantity || item.qty || 1); const line = item.line_total ?? (item.unit_price != null ? Number(item.unit_price) * qty : item.price); return `<div class="admin-detail-item"><span>${esc(item.name || item.product_name || 'Denim')} <small>W${esc(item.size || item.waist || '—')} × ${qty}</small></span><strong>${money(line)}</strong></div>`; }).join('') || '<p class="mono">ITEM DETAIL NOT INCLUDED IN ORDER RECORD.</p>';
    const message = `Hi ${name}, your THE JEANS FACTORY order ${code} is ${statusOf(order)}. We’ll keep you posted on its next step.`;
    $('#order-detail-content').innerHTML = `<p class="mono cloud-kicker">ORDER FILE / ${esc(code)}</p><h2>${esc(name)}</h2><p class="admin-detail-contact">${esc(order.phone || order.customer_phone || '')} ${order.email ? `· ${esc(order.email)}` : ''}</p><div class="admin-detail-grid"><section><span class="mono">SHIP TO</span><p>${esc(addressText(order) || 'Address not present on this order.')}</p></section><section><span class="mono">ORDER / PAYMENT</span><p>${esc(statusOf(order))} · ${esc(String(order.payment_status || 'PENDING').toUpperCase())}</p></section></div><section class="admin-detail-items"><h3 class="mono">ITEM BREAKDOWN</h3>${items}</section><div class="admin-detail-total"><span>COUPON ${esc(order.coupon_code || '—')} · ${money(order.discount_amount || order.coupon_discount || 0)} OFF</span><b>TOTAL ${money(order.total_amount ?? order.total ?? order.amount)}</b></div><button class="admin-copy-whatsapp" type="button" data-copy-message="${esc(message)}">COPY WHATSAPP UPDATE</button>`;
    $('#order-detail-dialog').showModal();
  }
  function renderCoupons() {
    $('#admin-coupons').innerHTML = coupons.length ? coupons.map((coupon) => {
      const active = coupon.is_active !== undefined ? coupon.is_active === true : coupon.active === true;
      return `<article class="admin-coupon-row" data-coupon-id="${esc(coupon.id)}"><div><strong>${esc(coupon.code)}</strong><span class="mono">${money(coupon.discount_amount ?? coupon.amount ?? 0)} OFF · MIN ${money(coupon.min_order_amount || 0)}</span></div><label class="admin-active-switch"><input type="checkbox" data-coupon-active ${active ? 'checked' : ''} /><i></i><span>${active ? 'ACTIVE' : 'PAUSED'}</span></label></article>`;
    }).join('') : '<p class="admin-empty">NO COUPONS FOUND.</p>';
  }
  function subscribeLive() {
    window.sb.channel('tjf-admin-workspace')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => loadCoupons())
      .subscribe();
  }
  async function showConsole(user) {
    if (!isAdmin(user)) { authorizedUser = null; loginMessage('This account does not have the admin role.'); return; }
    authorizedUser = user;
    $('#admin-profile-email').textContent = user.email || 'adityabaghel215@gmail.com';
    $('#admin-topbar-email').textContent = user.email || 'adityabaghel215@gmail.com';
    $('#admin-nav').hidden = false; $('#admin-sidebar-profile').hidden = false;
    $('#admin-login-screen').hidden = true; $('#admin-console').hidden = false;
    await loadWorkspace();
    setWorkspace('products');
    if (!window._tjfAdminSubscribed) { subscribeLive(); window._tjfAdminSubscribed = true; }
  }

  $('#admin-login')?.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!window.sb) { loginMessage('SUPABASE SERVICE IS UNAVAILABLE.'); return; }
    loginMessage('AUTHENTICATING…');
    const { data, error } = await window.sb.auth.signInWithPassword({ email: $('#admin-email').value.trim(), password: $('#admin-password').value });
    if (error) { loginMessage(error.message); return; }
    await showConsole(data.user);
  });
  $('#admin-signout')?.addEventListener('click', async () => {
    authorizedUser = null; await window.sb?.auth.signOut();
    $('#admin-console').hidden = true; $('#admin-login-screen').hidden = false; loginMessage('SIGNED OUT.');
    $('#admin-nav').hidden = true; $('#admin-sidebar-profile').hidden = true;
  });
  $('#admin-nav')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-workspace]'); if (button) setWorkspace(button.dataset.workspace);
  });
  $$('[data-workspace="overview"], [data-workspace="products"], [data-workspace="orders"], [data-workspace="coupons"]').forEach((button) => button.addEventListener('click', () => setWorkspace(button.dataset.workspace)));
  $('#admin-mobile-menu')?.addEventListener('click', () => { document.body.classList.add('admin-sidebar-open'); $('#admin-sidebar-scrim').hidden = false; });
  $('#admin-sidebar-scrim')?.addEventListener('click', () => { document.body.classList.remove('admin-sidebar-open'); $('#admin-sidebar-scrim').hidden = true; });
  $('#open-product-editor')?.addEventListener('click', openNewProductEditor);
  $('#back-to-products')?.addEventListener('click', returnToProducts);
  $('#discard-product')?.addEventListener('click', () => { if (confirm('Discard product changes?')) { editingProductId = null; selectedFiles = []; imageUrls = []; returnToProducts(); } });
  $('#product-editor-form')?.addEventListener('submit', saveProduct);

  $('#product-search')?.addEventListener('input', (event) => { filters.productQuery = event.target.value.trim(); renderProducts(); });
  $('#product-status-filter')?.addEventListener('change', (event) => { filters.productStatus = event.target.value; renderProducts(); });
  $('#product-fit-filter')?.addEventListener('change', (event) => { filters.fit = event.target.value === 'all' ? 'all' : event.target.value; renderProducts(); });
  $('#product-sort')?.addEventListener('change', (event) => { filters.sort = event.target.value; renderProducts(); });
  $('#order-search')?.addEventListener('input', (event) => { filters.orderQuery = event.target.value.trim(); renderOrders(); });
  $('#order-filters')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-order-filter]'); if (!button) return;
    filters.orderStatus = button.dataset.orderFilter;
    $('#order-filters').querySelectorAll('button').forEach((pill) => pill.classList.toggle('is-active', pill === button)); renderOrders();
  });
  $('#admin-global-search')?.addEventListener('input', (event) => {
    const value = event.target.value.trim(); filters.productQuery = value; filters.orderQuery = value;
    $('#product-search').value = value; $('#order-search').value = value;
    if (value) setWorkspace(document.querySelector('.admin-view:not([hidden])')?.dataset.view === 'orders' ? 'orders' : 'products');
    renderProducts(); renderOrders();
  });

  $('#admin-products')?.addEventListener('click', async (event) => {
    const edit = event.target.closest('[data-edit-product]'); if (edit) { editProduct(edit.dataset.editProduct); return; }
    const duplicate = event.target.closest('[data-duplicate-product]');
    if (duplicate) {
      const source = products.find((item) => String(item.id) === duplicate.dataset.duplicateProduct); if (!source) return;
      editingProductId = null; selectedFiles = []; imageUrls = Array.isArray(source.gallery_urls) ? source.gallery_urls.slice() : (source.image_url ? [source.image_url] : []); tags = Array.isArray(source.tags) ? source.tags.slice() : [];
      const form = $('#product-editor-form'); form.reset();
      ['name','description','price','sale_price','image_url','gsm','wash','badge'].forEach((field) => { if (form.elements[field]) form.elements[field].value = field === 'name' ? `${source.name} (Copy)` : (source[field] ?? (field === 'gsm' ? 450 : '')); });
      const sourceFit = source.fit === 'Wide-Leg' ? 'Wide' : (source.fit || 'Baggy');
      form.elements.fit.value = fitOptions.includes(sourceFit) ? sourceFit : 'Custom';
      if (form.elements.fit.value === 'Custom') { $('.admin-custom-fit').hidden = false; form.elements.custom_fit.value = source.fit; }
      form.elements.is_active.value = 'false'; sizes.forEach((size) => { form.elements[`stock_${size}`].value = Math.max(0, Number(source[`stock_${size}`]) || 0); });
      $('#editor-title').textContent = 'Duplicate product'; $('#editor-mode-label').textContent = 'NEW DRAFT'; $('#save-product').textContent = 'Save Draft'; renderTagChips(); renderPhotoPreviews(); updateSkuLabels(); updatePricePreview(); showEditor(); return;
    }
    const toggle = event.target.closest('[data-toggle-product]');
    if (toggle && canManage()) {
      const product = products.find((item) => String(item.id) === toggle.dataset.toggleProduct); if (!product) return;
      const value = !isPublished(product); const { error } = await window.sb.from('products').update({ is_active: value }).eq('id', product.id);
      if (error) notify(`STATUS SAVE FAILED · ${error.message}`, true);
      else { product.is_active = value; renderProducts(); paintKpis(); window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: products })); notify(value ? 'PRODUCT PUBLISHED' : 'PRODUCT SET TO DRAFT'); }
      return;
    }
    const remove = event.target.closest('[data-delete-product]');
    if (remove && canManage()) {
      const product = products.find((item) => String(item.id) === remove.dataset.deleteProduct); if (!product || !confirm(`Delete “${product.name}” permanently?`)) return;
      remove.disabled = true; const { error } = await window.sb.from('products').delete().eq('id', product.id);
      if (error) { remove.disabled = false; notify(`DELETE FAILED · ${error.message}`, true); }
      else { products = products.filter((item) => String(item.id) !== String(product.id)); renderProducts(); paintKpis(); window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: products })); notify('PRODUCT DELETED'); }
    }
  });
  $('#admin-orders')?.addEventListener('click', (event) => { const button = event.target.closest('[data-order-detail]'); if (button) showOrderDetail(button.dataset.orderDetail); });
  $('#admin-orders')?.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-order-field]'); if (!select || !canManage()) return;
    const row = select.closest('[data-order-id]'); select.disabled = true;
    const { error } = await window.sb.from('orders').update({ [select.dataset.orderField]: select.value }).eq('id', row.dataset.orderId);
    select.disabled = false;
    if (error) { notify(`SAVE FAILED · ${error.message}`, true); await loadOrders(); }
    else { const order = orders.find((item) => String(item.id) === row.dataset.orderId); if (order) order[select.dataset.orderField] = select.value; paintKpis(); renderRecentOrders(); notify('ORDER UPDATE SAVED'); }
  });
  $('#close-order-dialog')?.addEventListener('click', () => $('#order-detail-dialog').close());
  $('#order-detail-dialog')?.addEventListener('click', (event) => {
    if (event.target === $('#order-detail-dialog')) $('#order-detail-dialog').close();
    const copy = event.target.closest('[data-copy-message]');
    if (copy) navigator.clipboard.writeText(copy.dataset.copyMessage).then(() => notify('WHATSAPP UPDATE COPIED')).catch(() => notify('COULD NOT COPY UPDATE', true));
  });

  $('#product-editor-form [name="fit"]')?.addEventListener('change', (event) => { const custom = $('.admin-custom-fit'); custom.hidden = event.target.value !== 'Custom'; custom.querySelector('input').required = !custom.hidden; updateSkuLabels(); });
  $('#product-editor-form [name="custom_fit"]')?.addEventListener('input', updateSkuLabels);
  ['price','sale_price'].forEach((name) => $('#product-editor-form')?.elements[name]?.addEventListener('input', updatePricePreview));
  $('#product-cost-preview')?.addEventListener('input', updatePricePreview);
  $('#product-tags-input')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return; event.preventDefault();
    const input = event.currentTarget; const tag = input.value.trim();
    if (tag && !tags.some((item) => item.toLowerCase() === tag.toLowerCase())) tags.push(tag);
    input.value = ''; renderTagChips();
  });
  $('#product-tags-chips')?.addEventListener('click', (event) => { const button = event.target.closest('[data-remove-tag]'); if (!button) return; tags.splice(Number(button.dataset.removeTag), 1); renderTagChips(); });
  const uploadZone = $('#product-upload-zone');
  uploadZone?.addEventListener('click', (event) => { if (!event.target.closest('[data-remove-photo]')) $('#product-photos').click(); });
  uploadZone?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('#product-photos').click(); } });
  ['dragenter','dragover'].forEach((type) => uploadZone?.addEventListener(type, (event) => { event.preventDefault(); uploadZone.classList.add('is-dragging'); }));
  ['dragleave','drop'].forEach((type) => uploadZone?.addEventListener(type, (event) => { event.preventDefault(); uploadZone.classList.remove('is-dragging'); }));
  uploadZone?.addEventListener('drop', (event) => { selectedFiles.push(...Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith('image/'))); renderPhotoPreviews(); });
  $('#product-photos')?.addEventListener('change', (event) => { selectedFiles.push(...Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'))); event.target.value = ''; renderPhotoPreviews(); });
  $('#product-photo-previews')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-photo]'); if (!button) return;
    const [type, indexValue] = button.dataset.removePhoto.split(':'); const index = Number(indexValue);
    if (type === 'existing') imageUrls.splice(index, 1); else selectedFiles.splice(index, 1);
    renderPhotoPreviews();
  });
  $('#coupon-create-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!canManage()) return;
    const values = new FormData(event.currentTarget);
    const payload = { code: String(values.get('code')).trim().toUpperCase(), discount_amount: Number(values.get('discount_amount')), min_order_amount: Number(values.get('min_order_amount')) || 0, is_active: true };
    const { data, error } = await window.sb.from('coupons').insert(payload).select('*').single();
    if (error) { notify(`COUPON CREATE FAILED · ${error.message}`, true); return; }
    coupons.push(data); renderCoupons(); event.currentTarget.reset(); notify('COUPON CREATED');
  });
  $('#admin-coupons')?.addEventListener('change', async (event) => {
    const toggle = event.target.closest('[data-coupon-active]'); if (!toggle || !canManage()) return;
    const row = toggle.closest('[data-coupon-id]'); const coupon = coupons.find((item) => String(item.id) === row.dataset.couponId);
    const field = coupon && coupon.is_active === undefined ? 'active' : 'is_active';
    const { error } = await window.sb.from('coupons').update({ [field]: toggle.checked }).eq('id', row.dataset.couponId);
    if (error) { toggle.checked = !toggle.checked; notify(`COUPON UPDATE FAILED · ${error.message}`, true); }
    else { if (coupon) coupon[field] = toggle.checked; renderCoupons(); notify(toggle.checked ? 'COUPON ACTIVATED' : 'COUPON PAUSED'); }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.sb) { loginMessage('SUPABASE SERVICE IS UNAVAILABLE.'); return; }
    const { data } = await window.sb.auth.getSession();
    if (data.session?.user) await showConsole(data.session.user);
    window.sb.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { authorizedUser = null; $('#admin-console').hidden = true; $('#admin-login-screen').hidden = false; $('#admin-nav').hidden = true; $('#admin-sidebar-profile').hidden = true; }
      else setTimeout(() => showConsole(session.user), 0);
    });
  });
})();
