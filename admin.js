(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const sizes = [28, 30, 32, 34, 36];
  const statuses = ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  const payments = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD'];
  let authorizedUser = null;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const message = (text) => { $('#admin-message').textContent = text; };

  function isAdmin(user) {
    return user?.app_metadata?.role === 'admin' || user?.app_metadata?.roles?.includes('admin');
  }
  async function showConsole(user) {
    if (!isAdmin(user)) { authorizedUser = null; $('#admin-console').hidden = true; $('#admin-login').hidden = false; message('This account is signed in but does not have the admin role.'); return; }
    authorizedUser = user;
    $('#admin-login').hidden = true;
    $('#admin-console').hidden = false;
    message('');
    await Promise.all([loadOrders(), loadProducts()]);
  }
  async function loadOrders() {
    const wrap = $('#admin-orders');
    wrap.innerHTML = '<p class="mono">LOADING ORDERS…</p>';
    const { data, error } = await window.sb.from('orders').select('*').order('created_at', { ascending: false });
    if (error) { wrap.innerHTML = `<p class="cloud-error">${esc(error.message)}</p>`; return; }
    wrap.innerHTML = `<h2>ORDERS <span class="mono">${data.length}</span></h2>${data.map((order) => `
      <article class="admin-order" data-order-id="${esc(order.id)}">
        <div class="admin-order-meta"><strong>${esc(order.tracking_code || order.order_code || order.id)}</strong><span>${esc(order.customer_name || [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer')}</span><span>${esc(order.phone || order.customer_phone || '')}</span><span>${esc(order.email || '')}</span></div>
        <div class="admin-order-selects"><label class="mono">ORDER <select data-field="order_status">${statuses.map((status) => `<option ${String(order.order_status).toUpperCase() === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label><label class="mono">PAYMENT <select data-field="payment_status">${payments.map((status) => `<option ${String(order.payment_status).toUpperCase() === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label></div>
      </article>`).join('') || '<p class="mono">NO ORDERS YET.</p>'}`;
  }
  async function loadProducts() {
    const wrap = $('#admin-products');
    wrap.innerHTML = '<p class="mono">LOADING STOCK…</p>';
    const { data, error } = await window.sb.from('products').select('*').order('name');
    if (error) { wrap.innerHTML = `<p class="cloud-error">${esc(error.message)}</p>`; return; }
    wrap.innerHTML = (data || []).map((product) => `<form class="admin-stock-row" data-product-id="${esc(product.id)}"><strong>${esc(product.name || product.title || product.slug || product.id)}</strong><div class="stock-fields">${sizes.map((size) => `<label class="mono">W${size}<input type="number" min="0" step="1" name="stock_${size}" value="${Math.max(0, Number(product[`stock_${size}`]) || 0)}" /></label>`).join('')}</div><button class="btn-outline" type="submit">SAVE STOCK</button></form>`).join('') || '<p class="mono">NO PRODUCTS FOUND.</p>';
  }

  $('#admin-login')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.sb) { message('Supabase service is unavailable.'); return; }
    message('Signing in…');
    const { data, error } = await window.sb.auth.signInWithPassword({ email: $('#admin-email').value.trim(), password: $('#admin-password').value });
    if (error) { message(error.message); return; }
    await showConsole(data.user);
  });
  $('#admin-signout')?.addEventListener('click', async () => {
    authorizedUser = null;
    await window.sb?.auth.signOut();
    $('#admin-console').hidden = true;
    $('#admin-login').hidden = false;
    message('Signed out.');
  });
  $('#admin-orders')?.addEventListener('change', async (event) => {
    const select = event.target.closest('select[data-field]');
    if (!select) return;
    if (!isAdmin(authorizedUser)) return;
    const orderId = select.closest('[data-order-id]').dataset.orderId;
    const { error } = await window.sb.from('orders').update({ [select.dataset.field]: select.value }).eq('id', orderId);
    if (error) { message(error.message); loadOrders(); } else message('Order updated.');
  });
  $('#admin-products')?.addEventListener('submit', async (event) => {
    const form = event.target.closest('.admin-stock-row');
    if (!form) return;
    event.preventDefault();
    if (!isAdmin(authorizedUser)) return;
    const stock = Object.fromEntries(sizes.map((size) => [`stock_${size}`, Math.max(0, Math.floor(Number(new FormData(form).get(`stock_${size}`)) || 0))]));
    const button = form.querySelector('button');
    button.disabled = true;
    const { error } = await window.sb.from('products').update(stock).eq('id', form.dataset.productId);
    button.disabled = false;
    message(error ? error.message : 'Stock saved.');
  });
  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.sb) { message('Supabase service is unavailable.'); return; }
    const { data } = await window.sb.auth.getSession();
    if (data.session?.user) await showConsole(data.session.user);
    window.sb.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { authorizedUser = null; $('#admin-console').hidden = true; $('#admin-login').hidden = false; }
      else setTimeout(() => showConsole(session.user), 0);
    });
  });
})();
