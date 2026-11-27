(() => {
  'use strict';
  const stages = ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'];
  const form = document.querySelector('#track-form');
  const result = document.querySelector('#track-result');
  const message = document.querySelector('#track-message');
  let liveChannel;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const label = (status) => String(status || 'CONFIRMED').toUpperCase();

  async function lookup(code, phone) {
    message.textContent = 'Checking your order…';
    result.hidden = true;
    if (!window.sb) { message.textContent = 'Order service is unavailable. Please try again shortly.'; return; }
    const { data, error } = await window.sb.from('orders').select('*').eq('tracking_code', code).eq('phone', phone).maybeSingle();
    if (error || !data) { message.textContent = error ? 'Could not reach order tracking. Try again shortly.' : 'No matching order found. Check the code and phone number.'; return; }
    message.textContent = '';
    render(data);
    if (liveChannel) window.sb.removeChannel(liveChannel);
    if (data.id) {
      liveChannel = window.sb.channel(`order-${data.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${data.id}` }, (event) => render(event.new))
        .subscribe();
    }
  }

  function render(order) {
    const current = Math.max(0, stages.indexOf(label(order.order_status)));
    const items = Array.isArray(order.items) ? order.items : [];
    result.innerHTML = `
      <div class="track-order-head"><div><span class="mono cloud-kicker">TRACKING CODE</span><h2>${esc(order.tracking_code || order.order_code || '')}</h2></div><span class="status-chip">${esc(label(order.order_status))}</span></div>
      <ol class="status-timeline">${stages.map((stage, index) => `<li class="${index <= current ? 'is-done' : ''} ${index === current ? 'is-current' : ''}"><span class="timeline-dot"></span><span class="mono">${stage}</span></li>`).join('')}</ol>
      <div class="track-items"><h3 class="mono">YOUR ITEMS</h3>${items.length ? items.map((item) => `<div class="track-item"><span>${esc(item.name || item.product_name || item.title || 'Denim item')} · W${esc(item.size || item.waist || '')} × ${esc(item.quantity || item.qty || 1)}</span><strong>${item.unit_price || item.price ? '₹' + Number(item.unit_price || item.price).toLocaleString('en-IN') : ''}</strong></div>`).join('') : '<p class="mono">Item breakdown is not available for this order.</p>'}</div>
      <p class="mono track-payment">PAYMENT · ${esc(String(order.payment_status || 'PENDING').toUpperCase())}</p>`;
    result.hidden = false;
  }

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = document.querySelector('#track-code').value.trim().toUpperCase();
    const phone = document.querySelector('#track-phone').value.trim();
    if (!/^TJF-\d{6}$/.test(code)) { message.textContent = 'Enter a valid TJF-123456 tracking code.'; return; }
    lookup(code, phone);
  });
  const codeParam = new URLSearchParams(location.search).get('code');
  if (codeParam) document.querySelector('#track-code').value = codeParam;
})();
