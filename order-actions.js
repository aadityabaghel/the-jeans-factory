(() => {
  'use strict';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const codeOf = (order) => order.tracking_code || order.order_code || order.order_number || 'TJF-000000';
  const linesOf = (order) => Array.isArray(order.items) ? order.items : (Array.isArray(order.order_items) ? order.order_items : []);
  const nameOf = (order) => order.customer_name || [order.first_name, order.last_name].filter(Boolean).join(' ') || order.name || 'Customer';
  const addressOf = (order) => {
    if (typeof order.shipping_address === 'string') return order.shipping_address;
    if (typeof order.address === 'string') return [order.address, order.address2, order.city, order.state, order.pincode, order.country].filter(Boolean).join(', ');
    const a = order.shipping_address || order.address || order.customer || order;
    return [a.address1 || a.line1, a.address2 || a.line2, a.city, a.state, a.pincode || a.postal_code, a.country].filter(Boolean).join(', ');
  };
  const summary = (order) => {
    const items = linesOf(order).map((item) => `• ${item.name || item.product_name || 'Denim'} — W${item.size || item.waist || '—'} × ${item.quantity || item.qty || 1}`).join('\n') || 'Item details unavailable';
    return `THE JEANS FACTORY — ORDER ${codeOf(order)}\nCustomer: ${nameOf(order)}\n${items}\nDiscount: ${money(order.discount_amount || order.coupon_discount || 0)}\nTotal: ${money(order.total_amount ?? order.total ?? order.amount)}\nStatus: ${String(order.order_status || 'CONFIRMED').toUpperCase()}`;
  };
  function invoice(order) {
    const items = linesOf(order);
    const rows = items.map((item) => {
      const qty = Number(item.quantity || item.qty || 1); const price = Number(item.unit_price ?? item.price ?? 0);
      return `<tr><td>${esc(item.name || item.product_name || 'Denim item')}<small>WAIST W${esc(item.size || item.waist || '—')}</small></td><td>${qty}</td><td>${money(price)}</td><td>${money(price * qty)}</td></tr>`;
    }).join('');
    const subtotal = items.reduce((sum, item) => sum + Number(item.unit_price ?? item.price ?? 0) * Number(item.quantity || item.qty || 1), 0);
    const discount = Number(order.discount_amount || order.coupon_discount || 0);
    const total = Number(order.total_amount ?? order.total ?? order.amount ?? subtotal - discount);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(codeOf(order))}</title><style>*{box-sizing:border-box}body{font:14px/1.5 Arial,sans-serif;color:#111;margin:0;padding:36px}main{max-width:760px;margin:auto;border:1px solid #222;padding:34px}.brand{font-size:22px;font-weight:900;letter-spacing:.08em}.mono{font:12px monospace;letter-spacing:.08em}header{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:18px;margin-bottom:24px}h1{font-size:21px;margin:0 0 4px}section{margin:22px 0}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:10px 7px;border-bottom:1px solid #bbb}th{font:11px monospace;text-transform:uppercase}td:nth-child(n+2),th:nth-child(n+2){text-align:right}small{display:block;color:#555;margin-top:4px}.totals{margin-left:auto;width:min(300px,100%)}.totals p{display:flex;justify-content:space-between;margin:8px 0}.grand{font-weight:bold;font-size:18px;border-top:2px solid #111;padding-top:10px}@media print{body{padding:0}main{border:0;padding:0}@page{margin:16mm}}</style></head><body><main><header><div><div class="brand">THE JEANS FACTORY®</div><div class="mono">RAW SELVEDGE / ENGINEERED IN INDIA</div></div><div style="text-align:right"><strong>TAX INVOICE</strong><div class="mono">${esc(codeOf(order))}</div><div>${esc(order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'))}</div></div></header><section><h1>Order receipt</h1><strong>${esc(nameOf(order))}</strong><p>${esc(addressOf(order) || 'Shipping address on file')}<br>${esc(order.phone || order.customer_phone || '')}</p></section><section><table><thead><tr><th>Item / size</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Item details unavailable</td></tr>'}</tbody></table></section><section class="totals"><p><span>Subtotal</span><strong>${money(order.subtotal ?? subtotal)}</strong></p><p><span>Discount${order.coupon_code ? ` (${esc(order.coupon_code)})` : ''}</span><strong>−${money(discount)}</strong></p><p class="grand"><span>Total paid / due</span><strong>${money(total)}</strong></p></section><p class="mono">THANK YOU FOR BACKING BETTER DENIM.</p></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))<\/script></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open(); win.document.write(html); win.document.close();
  }
  window.TJFOrderActions = {
    render(order, host) {
      if (!host || !order) return;
      host.innerHTML = '<button type="button" class="btn-solid tjf-order-whatsapp">SEND ORDER ON WHATSAPP ↗</button><button type="button" class="btn-outline tjf-order-invoice">DOWNLOAD / PRINT INVOICE</button>';
      host.querySelector('.tjf-order-whatsapp').addEventListener('click', () => {
        const number = window.TJFSettings?.supportNumber() || '919876543210';
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(summary(order))}`, '_blank', 'noopener');
      });
      host.querySelector('.tjf-order-invoice').addEventListener('click', () => invoice(order));
    },
  };
})();
