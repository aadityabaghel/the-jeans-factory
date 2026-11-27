    (() => {
      'use strict';

      const $ = (sel, ctx = document) => ctx.querySelector(sel);
      const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
      const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
      const CART_KEY = 'tjf-cart-v1';
      const SHIPPING_THRESHOLD = 2499;
      let toastTimer = null;
      let appliedCoupon = null;

      function toast(message) {
        const el = $('#toast');
        if (!el) return;
        el.textContent = message;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
      }

      function loadCart() {
        try {
          const raw = localStorage.getItem(CART_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return [];
          return parsed.filter((it) => it && it.id && it.name && Number(it.price) >= 0 && Number(it.qty) > 0)
            .map((it) => ({ ...it, qty: Math.max(1, Math.floor(it.qty)), price: Number(it.price) }));
        } catch { return []; }
      }

      function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }

      function cartSubtotal() { return cart.reduce((sum, it) => sum + it.price * it.qty, 0); }
      function cartShipping() { const sub = cartSubtotal(); if (sub === 0) return 0; return sub >= SHIPPING_THRESHOLD ? 0 : 99; }
      function cartCODFee(method) { return method === 'COD' ? 49 : 0; }
      function couponDiscount() { return appliedCoupon ? Math.min(cartSubtotal(), appliedCoupon.amount) : 0; }
      function cartTotal(method) { return Math.max(0, cartSubtotal() - couponDiscount()) + cartShipping() + cartCODFee(method); }

      let cart = loadCart();

      function renderSummary() {
        const itemsEl = $('#checkout-items');
        const totalsEl = $('#checkout-totals');
        const payTotalEl = $('#pay-total');
        const method = $('input[name="payment"]:checked')?.value || 'UPI';

        if (!itemsEl || !totalsEl) return;

        if (!cart.length) {
          itemsEl.innerHTML = '<p class="mono" style="text-align:center; padding: 2rem;">YOUR BAG IS EMPTY</p>';
          totalsEl.innerHTML = '';
          if (payTotalEl) payTotalEl.textContent = '₹0';
          return;
        }

        itemsEl.innerHTML = cart.map((it) => `
          <div class="checkout-item">
            <div class="checkout-item-img img-ph"><img src="${it.image}" alt="${it.name}" loading="lazy" /></div>
            <div class="checkout-item-info">
              <h4>${it.name}</h4>
              <p class="mono">${it.fit} / SIZE ${it.size}</p>
              <span class="checkout-item-qty mono">Qty: ${it.qty}</span>
            </div>
            <span class="checkout-item-price mono">${money(it.price * it.qty)}</span>
          </div>
        `).join('');

        const sub = cartSubtotal();
        const ship = cartShipping();
        const fee = cartCODFee(method);
        const total = cartTotal(method);

        totalsEl.innerHTML = `
          <div class="summary-line"><span>SUBTOTAL</span><strong>${money(sub)}</strong></div>
          ${appliedCoupon ? `<div class="summary-line"><span>COUPON · ${appliedCoupon.code}</span><strong>−${money(couponDiscount())}</strong></div>` : ''}
          <div class="summary-line"><span>SHIPPING</span><strong class="${ship === 0 ? 'free' : ''}">${ship === 0 ? 'FREE' : money(ship)}</strong></div>
          <div class="summary-line"><span>${method === 'COD' ? 'COD HANDLING' : 'PAYMENT FEE'}</span><strong>${fee === 0 ? '₹0' : money(fee)}</strong></div>
          <div class="summary-line is-total"><span>TOTAL</span><strong>${money(total)}</strong></div>
        `;
        if (payTotalEl) payTotalEl.textContent = money(total);
        const countEl = $('#cart-count');
        if (countEl) countEl.textContent = String(cart.reduce((s, it) => s + it.qty, 0));
      }

      function updatePaymentDetails() {
        const method = $('input[name="payment"]:checked')?.value || 'UPI';
        $('#upi-details').hidden = method !== 'UPI';
        $('#card-details').hidden = method !== 'CARD';
        $('#cod-details').hidden = method !== 'COD';
        renderSummary();
      }

      function validateForm() {
        const required = $$('#checkout-form [required]');
        let valid = true;
        required.forEach((el) => {
          if (!el.value.trim()) {
            el.style.borderColor = 'var(--orange)';
            valid = false;
          } else {
            el.style.borderColor = '';
          }
        });
        // Validate pincode
        const pin = $('#pincode');
        if (pin && (!pin.value.trim() || !/^\d{6}$/.test(pin.value.trim()))) {
          pin.style.borderColor = 'var(--orange)';
          valid = false;
        }
        // Validate email
        const email = $('#email');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
          email.style.borderColor = 'var(--orange)';
          valid = false;
        }
        // Validate phone
        const phone = $('#phone');
        if (phone && !/^\+?91?\s?[6-9]\d{9}$/.test(phone.value.replace(/\s/g, ''))) {
          phone.style.borderColor = 'var(--orange)';
          valid = false;
        }
        return valid;
      }

      async function applyCoupon() {
        const code = $('#coupon-code')?.value.trim().toUpperCase();
        const feedback = $('#coupon-feedback');
        if (!code) { appliedCoupon = null; if (feedback) feedback.textContent = 'Enter a coupon code.'; renderSummary(); return; }
        if (!['TJF300', 'FIRSTDROP'].includes(code)) { appliedCoupon = null; if (feedback) feedback.textContent = 'That coupon code is not recognized.'; renderSummary(); return; }
        if (!window.sb) { if (feedback) feedback.textContent = 'Coupon service is unavailable. Try again shortly.'; return; }
        if (feedback) feedback.textContent = 'Checking code…';
        const { data, error } = await window.sb.from('coupons').select('*').eq('code', code).maybeSingle();
        const now = Date.now();
        const valid = data && data.is_active !== false && data.active !== false && data.enabled !== false &&
          (!data.expires_at || Date.parse(data.expires_at) > now) &&
          (!data.starts_at || Date.parse(data.starts_at) <= now) &&
          (!data.min_order_amount || cartSubtotal() >= Number(data.min_order_amount));
        if (error || !valid) {
          appliedCoupon = null;
          if (feedback) feedback.textContent = error ? 'Coupon service is unavailable. Try again shortly.' : 'This code is invalid, expired, or does not meet the order minimum.';
        } else {
          const flat = Number(data.discount_amount ?? data.amount ?? (code === 'TJF300' ? 300 : 0));
          const percent = Number(data.discount_percent ?? data.percent ?? (code === 'FIRSTDROP' ? 10 : 0));
          const amount = Math.min(cartSubtotal(), flat > 0 ? flat : cartSubtotal() * percent / 100);
          appliedCoupon = { code, amount };
          if (feedback) feedback.textContent = `${code} applied — ${money(amount)} off.`;
        }
        renderSummary();
      }

      async function placeOrder(e) {
        e.preventDefault();
        if (!validateForm()) {
          toast('PLEASE FILL ALL REQUIRED FIELDS CORRECTLY');
          return;
        }
        if (!cart.length) {
          toast('YOUR BAG IS EMPTY');
          return;
        }

        const method = $('input[name="payment"]:checked')?.value || 'UPI';
        const total = cartTotal(method);
        const submit = $('#place-order-btn');
        if (!window.sb) { toast('ORDER SERVICE IS UNAVAILABLE — PLEASE TRY AGAIN'); return; }
        if (submit) { submit.disabled = true; submit.dataset.originalText = submit.textContent; submit.textContent = 'PLACING ORDER…'; }
        const customer = {
          email: $('#email').value.trim(), phone: $('#phone').value.trim(),
          first_name: $('#firstName').value.trim(), last_name: $('#lastName').value.trim(),
          address1: $('#address1').value.trim(), address2: $('#address2').value.trim(),
          city: $('#city').value.trim(), state: $('#state').value,
          pincode: $('#pincode').value.trim(), country: 'India',
        };
        const items = cart.map((item) => ({ product_id: window.TJFInventory?.databaseId(item.id, item.name) ?? item.id, name: item.name, fit: item.fit, size: Number(String(item.size).match(/\d{2}/)?.[0]) || item.size, quantity: item.qty, unit_price: item.price, image: item.image }));
        let data, error;
        try {
          ({ data, error } = await window.sb.rpc('place_order', {
            p_customer: customer,
            p_items: items,
            p_coupon_code: appliedCoupon?.code || null,
            p_payment_method: method,
          }));
        } catch (requestError) {
          error = requestError;
        }
        if (error) {
          console.error('Order placement failed:', error);
          toast(error.message || 'ORDER COULD NOT BE PLACED');
          if (submit) { submit.disabled = false; submit.textContent = submit.dataset.originalText || 'PLACE ORDER'; }
          return;
        }
        const result = Array.isArray(data) ? data[0] : data;
        const savedOrder = result?.order || result;
        const orderId = typeof savedOrder === 'string' ? savedOrder : (savedOrder?.tracking_code || savedOrder?.order_code || savedOrder?.order_number || savedOrder?.tracking_id);
        if (!orderId || !/^TJF-\d{6}$/i.test(String(orderId))) {
          console.error('place_order returned no valid TJF tracking code:', data);
          toast('ORDER SAVED, BUT TRACKING CODE WAS NOT RETURNED. CONTACT SUPPORT.');
          if (submit) { submit.disabled = false; submit.textContent = submit.dataset.originalText || 'PLACE ORDER'; }
          return;
        }
        const methodLabel = method === 'COD' ? 'CASH ON DELIVERY' : method;

        $('#success-copy').textContent = `Order ${orderId} is locked. A confirmation is on its way to your inbox.`;
        $('#success-track-link').href = `track.html?code=${encodeURIComponent(orderId)}`;
        $('#success-payment').textContent = methodLabel;
        $('#success-total').textContent = money(Number(savedOrder?.total_amount ?? savedOrder?.total ?? total));
        const receiptOrder = {
          ...(savedOrder && typeof savedOrder === 'object' ? savedOrder : {}),
          tracking_code: orderId, items, first_name: customer.first_name, last_name: customer.last_name,
          phone: customer.phone, email: customer.email, address: customer.address1, address2: customer.address2,
          city: customer.city, state: customer.state, pincode: customer.pincode, country: 'India',
          subtotal: cartSubtotal(), discount_amount: couponDiscount(), coupon_code: appliedCoupon?.code || null,
          total_amount: Number(savedOrder?.total_amount ?? savedOrder?.total ?? total), order_status: 'CONFIRMED',
        };
        window.TJFOrderActions?.render(receiptOrder, $('#checkout-order-actions'));

        $('#checkout-form').hidden = true;
        $('#checkout-success').hidden = false;
        $('.checkout-progress').style.display = 'none';

        // Clear cart
        cart = [];
        saveCart();
        $('#cart-count').textContent = '0';
        appliedCoupon = null;

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Init
      function boot() {
        if (!cart.length) {
          window.location.href = 'index.html#drops';
          return;
        }

        renderSummary();
        updatePaymentDetails();

        $$('input[name="payment"]').forEach((radio) => {
          radio.addEventListener('change', updatePaymentDetails);
        });

        $('#checkout-form')?.addEventListener('submit', placeOrder);
        $('#apply-coupon')?.addEventListener('click', applyCoupon);
        $('#coupon-code')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); applyCoupon(); } });
        $('#pincode')?.addEventListener('input', (event) => {
          event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
          const estimate = $('#delivery-estimate');
          if (!estimate) return;
          estimate.textContent = /^\d{6}$/.test(event.target.value) ? 'Estimated delivery: 3–5 business days after dispatch.' : '';
        });

        // Input styling reset on input
        $$('#checkout-form input, #checkout-form select').forEach((el) => {
          el.addEventListener('input', () => { el.style.borderColor = ''; });
        });

        // Format card number
        const cardNum = $('#card-number');
        if (cardNum) {
          cardNum.addEventListener('input', () => {
            let v = cardNum.value.replace(/\D/g, '');
            v = v.replace(/(\d{4})/g, '$1 ').trim();
            cardNum.value = v.substring(0, 19);
          });
        }
        // Format card expiry
        const cardExp = $('#card-expiry');
        if (cardExp) {
          cardExp.addEventListener('input', () => {
            let v = cardExp.value.replace(/\D/g, '');
            if (v.length >= 2) v = v.substring(0,2) + '/' + v.substring(2,4);
            cardExp.value = v.substring(0,5);
          });
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
      } else {
        boot();
      }
    })();
