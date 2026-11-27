(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const sizes = [28, 30, 32, 34, 36];
  const orderStatuses = ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  const paymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD'];
  const activeOrderStatuses = ['CONFIRMED', 'PACKED', 'SHIPPED'];
  const filters = { query: '', status: 'ALL' };
  let authorizedUser = null;
  let orders = [];
  let products = [];
  let coupons = [];
  let selectedFiles = [];
  let toastTimer;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');
  const statusOf = (order) => String(order.order_status || 'CONFIRMED').toUpperCase();
  const isProductActive = (product) => product.is_active !== false && product.is_active !== 0 && product.active !== false && product.active !== 0 && !['inactive', 'draft', 'archived'].includes(String(product.status || '').toLowerCase());
  const isAdmin = (user) => user?.app_metadata?.role === 'admin' || user?.app_metadata?.roles?.includes('admin');
  const canManage = () => isAdmin(authorizedUser);
  function notify(text, error = false) {
    const toast = $('#admin-toast');
    toast.textContent = text;
    toast.classList.toggle('is-error', error);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3100);
  }
  function loginMessage(text) { $('#admin-message').textContent = text; }

  function paintKpis() {
    const revenue = orders.reduce((sum, order) => statusOf(order) === 'CANCELLED' ? sum : sum + Number(order.total_amount ?? order.total ?? order.amount ?? order.total_price ?? 0), 0);
    const activeOrders = orders.filter((order) => activeOrderStatuses.includes(statusOf(order))).length;
    const lowSizes = products.reduce((sum, product) => sum + sizes.filter((size) => Number(product[`stock_${size}`] ?? 0) <= 5).length, 0);
    const liveCatalog = products.filter(isProductActive).length;
    $('#kpi-revenue').textContent = money(revenue);
    $('#kpi-orders').textContent = String(activeOrders).padStart(2, '0');
    $('#kpi-stock').textContent = String(lowSizes).padStart(2, '0');
    $('#kpi-catalog').textContent = String(liveCatalog).padStart(2, '0');
    $('#orders-tab-count').textContent = String(orders.length).padStart(2, '0');
  }

  async function loadOrders() {
    if (!canManage()) return;
    const { data, error } = await window.sb.from('orders').select('*').order('created_at', { ascending: false });
    if (error) { $('#admin-orders').innerHTML = `<p class="admin-empty">${esc(error.message)}</p>`; return; }
    orders = data || [];
    paintKpis();
    renderOrders();
  }

  async function loadProducts() {
    if (!canManage()) return;
    const { data, error } = await window.sb.from('products').select('*').order('name');
    if (error) { $('#admin-products').innerHTML = `<p class="admin-empty">${esc(error.message)}</p>`; return; }
    products = data || [];
    paintKpis();
    renderProducts();
    window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: products }));
  }

  async function loadCoupons() {
    if (!canManage()) return;
    const { data, error } = await window.sb.from('coupons').select('*').order('code');
    if (error) { $('#admin-coupons').innerHTML = `<p class="admin-empty">${esc(error.message)}</p>`; return; }
    coupons = data || [];
    renderCoupons();
  }

  function renderOrders() {
    const query = filters.query.toLowerCase();
    const visible = orders.filter((order) => {
      if (filters.status !== 'ALL' && statusOf(order) !== filters.status) return false;
      const haystack = [order.tracking_code, order.order_code, order.customer_name, order.first_name, order.last_name, order.phone, order.customer_phone, order.email]
        .filter(Boolean).join(' ').toLowerCase();
      return !query || haystack.includes(query);
    });
    const host = $('#admin-orders');
    if (!visible.length) { host.innerHTML = '<div class="admin-empty"><span>NO ORDERS MATCH THIS VIEW.</span></div>'; return; }
    host.innerHTML = `<div class="admin-orders-head mono"><span>ORDER / CUSTOMER</span><span>DATE</span><span>VALUE</span><span>ORDER STATUS</span><span>PAYMENT</span><span></span></div>${visible.map((order) => {
      const code = order.tracking_code || order.order_code || order.id;
      const name = order.customer_name || [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer';
      const phone = order.phone || order.customer_phone || '—';
      const current = statusOf(order);
      const payment = String(order.payment_status || 'PENDING').toUpperCase();
      const amount = order.total_amount ?? order.total ?? order.amount ?? order.total_price ?? 0;
      return `<article class="admin-order-row" data-order-id="${esc(order.id)}">
        <button type="button" class="admin-order-identity" data-order-detail="${esc(order.id)}"><strong>${esc(code)}</strong><span>${esc(name)} · ${esc(phone)}</span></button>
        <span class="admin-order-date mono">${esc(order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—')}</span>
        <strong class="admin-order-value mono">${money(amount)}</strong>
        <select class="admin-inline-select" data-order-field="order_status" aria-label="Order status">${orderStatuses.map((status) => `<option value="${status}" ${current === status ? 'selected' : ''}>${status}</option>`).join('')}</select>
        <select class="admin-inline-select" data-order-field="payment_status" aria-label="Payment status">${paymentStatuses.map((status) => `<option value="${status}" ${payment === status ? 'selected' : ''}>${status}</option>`).join('')}</select>
        <button class="admin-detail-arrow" data-order-detail="${esc(order.id)}" aria-label="View order details">↗</button>
      </article>`;
    }).join('')}`;
  }

  function renderProducts() {
    const activeProducts = products.filter(isProductActive);
    if (!products.length) { $('#admin-products').innerHTML = '<div class="admin-empty"><span>NO PRODUCTS YET — ADD THE FIRST DROP.</span></div>'; return; }
    $('#admin-products').innerHTML = products.map((product) => {
      const image = product.image_url || product.gallery_urls?.[0] || '';
      const active = isProductActive(product);
      return `<article class="admin-product-card" data-product-id="${esc(product.id)}">
        <div class="admin-product-image">${image ? `<img src="${esc(image)}" alt="${esc(product.name)}" loading="lazy" />` : '<span class="mono">NO IMAGE</span>'}<label class="admin-active-switch" title="Toggle live product"><input type="checkbox" data-product-active ${active ? 'checked' : ''} /><i></i><span class="mono">${active ? 'LIVE' : 'HIDDEN'}</span></label></div>
        <div class="admin-product-card-head"><div><p class="mono">${esc(product.fit || 'DENIM')} · ${esc(product.gsm || product.fabric_weight_gsm || 450)} GSM</p><h3>${esc(product.name || product.title || 'Untitled product')}</h3></div><strong>${money(product.price)}</strong></div>
        <p class="admin-product-wash mono">${esc(product.wash || 'WASH TBD')} ${product.badge ? `· ${esc(product.badge)}` : ''}</p>
        <form class="admin-card-stock-form"><div class="admin-stock-inputs">${sizes.map((size) => `<label class="mono">W${size}<input name="stock_${size}" type="number" min="0" step="1" value="${Math.max(0, Number(product[`stock_${size}`]) || 0)}" /></label>`).join('')}</div><div class="admin-product-actions"><button type="submit" class="admin-save-stock">SAVE STOCK</button><button type="button" class="admin-delete-product">DELETE PRODUCT</button></div></form>
      </article>`;
    }).join('');
    const activeCount = $('#kpi-catalog');
    if (activeCount) activeCount.textContent = String(activeProducts.length).padStart(2, '0');
  }

  function addressText(order) {
    const address = order.shipping_address || order.address || order.customer?.shipping_address || order.customer || {};
    if (typeof address === 'string') return address;
    return [address.address1 || address.address_line_1 || order.address1, address.address2 || address.address_line_2 || order.address2, address.city || order.city, address.state || order.state, address.pincode || address.postal_code || order.pincode, address.country || order.country]
      .filter(Boolean).join(', ');
  }
  function orderItems(order) {
    const list = order.items || order.order_items || [];
    return Array.isArray(list) ? list : [];
  }
  function showOrderDetail(id) {
    const order = orders.find((item) => String(item.id) === String(id));
    if (!order) return;
    const code = order.tracking_code || order.order_code || order.id;
    const name = order.customer_name || [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer';
    const phone = order.phone || order.customer_phone || '';
    const lines = orderItems(order);
    const itemsHtml = lines.length ? lines.map((item) => {
      const quantity = Number(item.quantity || item.qty || 1);
      const lineTotal = item.line_total ?? (item.unit_price != null ? Number(item.unit_price) * quantity : item.price);
      return `<div class="admin-detail-item"><span>${esc(item.name || item.product_name || 'Denim')} <small>W${esc(item.size || item.waist || '—')} × ${quantity}</small></span><strong>${money(lineTotal)}</strong></div>`;
    }).join('') : '<p class="mono">ITEM DETAIL NOT INCLUDED IN ORDER RECORD.</p>';
    const messageText = `Hi ${name}, your THE JEANS FACTORY order ${code} is ${statusOf(order)}. We’ll keep you posted on its next step.`;
    $('#order-detail-content').innerHTML = `<p class="mono cloud-kicker">ORDER FILE / ${esc(code)}</p><h2>${esc(name)}</h2><p class="admin-detail-contact">${esc(phone)} ${order.email ? `· ${esc(order.email)}` : ''}</p><div class="admin-detail-grid"><section><span class="mono">SHIP TO</span><p>${esc(addressText(order) || 'Address not present on this order.')}</p></section><section><span class="mono">ORDER / PAYMENT</span><p>${esc(statusOf(order))} · ${esc(String(order.payment_status || 'PENDING').toUpperCase())}</p></section></div><section class="admin-detail-items"><h3 class="mono">ITEM BREAKDOWN</h3>${itemsHtml}</section><div class="admin-detail-total"><span>COUPON ${esc(order.coupon_code || '—')}</span><strong>${money(order.discount_amount || order.coupon_discount || 0)} OFF</strong><b>TOTAL ${money(order.total_amount ?? order.total ?? order.amount)}</b></div><button class="admin-copy-whatsapp" type="button" data-copy-message="${esc(messageText)}">COPY WHATSAPP UPDATE</button>`;
    $('#order-detail-dialog').showModal();
  }

  function renderCoupons() {
    if (!coupons.length) { $('#admin-coupons').innerHTML = '<div class="admin-empty"><span>NO COUPONS FOUND.</span></div>'; return; }
    $('#admin-coupons').innerHTML = coupons.map((coupon) => {
      const active = coupon.is_active !== undefined ? coupon.is_active : coupon.active !== false;
      return `<article class="admin-coupon-row" data-coupon-id="${esc(coupon.id)}"><div><strong>${esc(coupon.code)}</strong><span class="mono">${money(coupon.discount_amount ?? coupon.amount ?? 0)} OFF · MIN ${money(coupon.min_order_amount || 0)}</span></div><label class="admin-active-switch"><input type="checkbox" data-coupon-active ${active ? 'checked' : ''} /><i></i><span class="mono">${active ? 'ACTIVE' : 'PAUSED'}</span></label></article>`;
    }).join('');
  }

  function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach((button) => {
      const active = button.dataset.tab === tabName;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.admin-tab-panel').forEach((panel) => { panel.hidden = panel.dataset.panel !== tabName; });
  }
  function openProductDrawer() {
    $('#product-drawer').classList.add('is-open');
    $('#product-drawer').setAttribute('aria-hidden', 'false');
    $('#product-drawer-backdrop').hidden = false;
    document.body.classList.add('admin-drawer-open');
    setTimeout(() => $('#new-product-form input[name="name"]')?.focus(), 180);
  }
  function closeProductDrawer() {
    $('#product-drawer').classList.remove('is-open');
    $('#product-drawer').setAttribute('aria-hidden', 'true');
    $('#product-drawer-backdrop').hidden = true;
    document.body.classList.remove('admin-drawer-open');
  }
  function previewPhotos() {
    const host = $('#product-photo-previews');
    host.innerHTML = selectedFiles.map((file, index) => `<div><img src="${URL.createObjectURL(file)}" alt="Selected product photo ${index + 1}" /><button type="button" data-remove-photo="${index}" aria-label="Remove photo">×</button></div>`).join('');
  }
  async function uploadPhotos(files) {
    const urls = [];
    for (const file of files) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
      const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error } = await window.sb.storage.from('product-images').upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = window.sb.storage.from('product-images').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('The uploaded image did not return a public URL.');
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function loadWorkspace() {
    if (!canManage()) return;
    await Promise.all([loadOrders(), loadProducts(), loadCoupons()]);
  }
  function subscribeLive() {
    window.sb.channel('tjf-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadProducts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => loadCoupons())
      .subscribe();
  }

  $('#admin-login')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.sb) { loginMessage('Supabase service is unavailable.'); return; }
    loginMessage('AUTHENTICATING…');
    const { data, error } = await window.sb.auth.signInWithPassword({ email: $('#admin-email').value.trim(), password: $('#admin-password').value });
    if (error) { loginMessage(error.message); return; }
    await showConsole(data.user);
  });
  async function showConsole(user) {
    if (!isAdmin(user)) { authorizedUser = null; loginMessage('This account is signed in but does not have the admin role.'); return; }
    authorizedUser = user;
    $('#admin-login-screen').hidden = true;
    $('#admin-console').hidden = false;
    $('#admin-signout').hidden = false;
    await loadWorkspace();
    if (!window._tjfAdminSubscribed) { subscribeLive(); window._tjfAdminSubscribed = true; }
  }

  $('#admin-signout')?.addEventListener('click', async () => {
    authorizedUser = null;
    await window.sb?.auth.signOut();
    $('#admin-console').hidden = true;
    $('#admin-signout').hidden = true;
    $('#admin-login-screen').hidden = false;
    loginMessage('SIGNED OUT.');
  });
  document.querySelectorAll('.admin-tab').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  $('#order-search')?.addEventListener('input', (event) => { filters.query = event.target.value.trim(); renderOrders(); });
  $('#order-filters')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-order-filter]');
    if (!button) return;
    filters.status = button.dataset.orderFilter;
    $('#order-filters').querySelectorAll('button').forEach((pill) => pill.classList.toggle('is-active', pill === button));
    renderOrders();
  });
  $('#admin-orders')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-order-detail]');
    if (button) showOrderDetail(button.dataset.orderDetail);
  });
  $('#admin-orders')?.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-order-field]');
    if (!select || !canManage()) return;
    const row = select.closest('[data-order-id]');
    select.disabled = true;
    const { error } = await window.sb.from('orders').update({ [select.dataset.orderField]: select.value }).eq('id', row.dataset.orderId);
    select.disabled = false;
    if (error) { notify(`SAVE FAILED · ${error.message}`, true); await loadOrders(); }
    else { const order = orders.find((item) => String(item.id) === row.dataset.orderId); if (order) order[select.dataset.orderField] = select.value; paintKpis(); notify('ORDER UPDATE SAVED'); }
  });
  $('#close-order-dialog')?.addEventListener('click', () => $('#order-detail-dialog').close());
  $('#order-detail-dialog')?.addEventListener('click', (event) => {
    if (event.target === $('#order-detail-dialog')) $('#order-detail-dialog').close();
    const copy = event.target.closest('[data-copy-message]');
    if (copy) navigator.clipboard.writeText(copy.dataset.copyMessage).then(() => notify('WHATSAPP UPDATE COPIED')).catch(() => notify('COULD NOT COPY UPDATE', true));
  });

  $('#admin-products')?.addEventListener('submit', async (event) => {
    const form = event.target.closest('.admin-card-stock-form');
    if (!form || !canManage()) return;
    event.preventDefault();
    const row = form.closest('[data-product-id]');
    const patch = Object.fromEntries(sizes.map((size) => [`stock_${size}`, Math.max(0, Math.floor(Number(new FormData(form).get(`stock_${size}`)) || 0))]));
    const button = form.querySelector('[type="submit"]'); button.disabled = true;
    const { error } = await window.sb.from('products').update(patch).eq('id', row.dataset.productId);
    button.disabled = false;
    if (error) notify(`STOCK SAVE FAILED · ${error.message}`, true); else { Object.assign(products.find((item) => String(item.id) === row.dataset.productId) || {}, patch); paintKpis(); notify('SIZE STOCK SAVED'); }
  });
  $('#admin-products')?.addEventListener('change', async (event) => {
    const toggle = event.target.closest('[data-product-active]');
    if (!toggle || !canManage()) return;
    const row = toggle.closest('[data-product-id]');
    const product = products.find((item) => String(item.id) === row.dataset.productId);
    const field = product && product.is_active === undefined && product.active !== undefined ? 'active' : 'is_active';
    const { error } = await window.sb.from('products').update({ [field]: toggle.checked }).eq('id', row.dataset.productId);
    if (error) { toggle.checked = !toggle.checked; notify(`CATALOG UPDATE FAILED · ${error.message}`, true); }
    else { if (product) product[field] = toggle.checked; paintKpis(); notify(toggle.checked ? 'PRODUCT IS LIVE' : 'PRODUCT HIDDEN'); window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: products })); }
  });
  $('#admin-products')?.addEventListener('click', async (event) => {
    const button = event.target.closest('.admin-delete-product');
    if (!button || !canManage()) return;
    const row = button.closest('[data-product-id]');
    const product = products.find((item) => String(item.id) === row.dataset.productId);
    if (!confirm(`Delete “${product?.name || 'this product'}” from the live catalog?`)) return;
    button.disabled = true;
    const { error } = await window.sb.from('products').delete().eq('id', row.dataset.productId);
    if (error) { button.disabled = false; notify(`DELETE FAILED · ${error.message}`, true); }
    else { products = products.filter((item) => String(item.id) !== row.dataset.productId); paintKpis(); renderProducts(); notify('PRODUCT DELETED'); window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: products })); }
  });

  $('#open-product-drawer')?.addEventListener('click', openProductDrawer);
  $('#close-product-drawer')?.addEventListener('click', closeProductDrawer);
  $('#product-drawer-backdrop')?.addEventListener('click', closeProductDrawer);
  $('#new-product-form select[name="fit"]')?.addEventListener('change', (event) => {
    const custom = $('.admin-custom-fit'); custom.hidden = event.target.value !== 'Custom';
    custom.querySelector('input').required = !custom.hidden;
  });
  const uploadZone = $('#product-upload-zone');
  uploadZone?.addEventListener('click', (event) => { if (!event.target.closest('[data-remove-photo]')) $('#product-photos').click(); });
  uploadZone?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('#product-photos').click(); } });
  ['dragenter', 'dragover'].forEach((type) => uploadZone?.addEventListener(type, (event) => { event.preventDefault(); uploadZone.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach((type) => uploadZone?.addEventListener(type, (event) => { event.preventDefault(); uploadZone.classList.remove('is-dragging'); }));
  uploadZone?.addEventListener('drop', (event) => { selectedFiles = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith('image/')); previewPhotos(); });
  $('#product-photos')?.addEventListener('change', (event) => { selectedFiles = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/')); previewPhotos(); });
  $('#product-photo-previews')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-photo]'); if (!button) return;
    selectedFiles.splice(Number(button.dataset.removePhoto), 1); previewPhotos();
  });
  $('#new-product-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!canManage()) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const feedback = $('#product-form-message');
    const publish = form.querySelector('[type="submit"]');
    publish.disabled = true; publish.textContent = 'UPLOADING & PUBLISHING…'; feedback.textContent = '';
    try {
      let uploadedUrls = [];
      if (selectedFiles.length) uploadedUrls = await uploadPhotos(selectedFiles);
      const externalUrl = String(values.get('image_url') || '').trim();
      if (externalUrl && !/^https?:\/\//i.test(externalUrl)) throw new Error('External image URLs must begin with http:// or https://.');
      const galleryUrls = uploadedUrls.length ? uploadedUrls : (externalUrl ? [externalUrl] : []);
      if (!galleryUrls.length) throw new Error('Upload at least one photo or paste an external image URL.');
      const fitRaw = String(values.get('fit'));
      const fit = fitRaw === 'Custom' ? String(values.get('custom_fit')).trim() : fitRaw;
      const product = {
        name: String(values.get('name')).trim(), fit, price: Number(values.get('price')),
        gsm: Number(values.get('gsm')) || 450, wash: String(values.get('wash')).trim(),
        badge: String(values.get('badge') || '').trim(), description: String(values.get('description') || '').trim(),
        image_url: galleryUrls[0], gallery_urls: galleryUrls, is_active: true,
      };
      sizes.forEach((size) => { product[`stock_${size}`] = Math.max(0, Math.floor(Number(values.get(`stock_${size}`)) || 0)); });
      const { data, error } = await window.sb.from('products').insert(product).select('*').single();
      if (error) throw error;
      products.unshift(data);
      paintKpis(); renderProducts();
      window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: products }));
      form.reset(); form.querySelector('[name="gsm"]').value = '450';
      selectedFiles = []; previewPhotos();
      closeProductDrawer();
      notify('PRODUCT PUBLISHED · LIVE ON STOREFRONT');
    } catch (error) {
      feedback.textContent = error.message || 'Product could not be published.';
      notify('PRODUCT PUBLISH FAILED', true);
    } finally { publish.disabled = false; publish.textContent = 'PUBLISH PRODUCT ↗'; }
  });

  $('#coupon-create-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!canManage()) return;
    const values = new FormData(event.currentTarget);
    const coupon = { code: String(values.get('code')).trim().toUpperCase(), discount_amount: Number(values.get('discount_amount')), min_order_amount: Number(values.get('min_order_amount')) || 0, is_active: true };
    const { data, error } = await window.sb.from('coupons').insert(coupon).select('*').single();
    if (error) { notify(`COUPON CREATE FAILED · ${error.message}`, true); return; }
    coupons.push(data); renderCoupons(); event.currentTarget.reset(); notify('COUPON CREATED');
  });
  $('#admin-coupons')?.addEventListener('change', async (event) => {
    const toggle = event.target.closest('[data-coupon-active]'); if (!toggle || !canManage()) return;
    const row = toggle.closest('[data-coupon-id]');
    const coupon = coupons.find((item) => String(item.id) === row.dataset.couponId);
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
      if (!session?.user) {
        authorizedUser = null; $('#admin-console').hidden = true; $('#admin-signout').hidden = true; $('#admin-login-screen').hidden = false;
      } else setTimeout(() => showConsole(session.user), 0);
    });
  });
})();
