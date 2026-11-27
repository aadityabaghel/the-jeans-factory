(() => {
  'use strict';
  if (!window.supabase?.createClient) return;
  window.sb = window.supabase.createClient(
    'https://mcmcmjtcqbkfegmkebrw.supabase.co',
    'sb_publishable_bKOOAbZDrnpsinIQTsVr6A_cZ_7MnHD'
  );

  const settingsCache = {};
  window.TJFSettings = {
    values: settingsCache,
    get(key, fallback = null) { return Object.prototype.hasOwnProperty.call(settingsCache, key) ? settingsCache[key] : fallback; },
    async refresh() {
      const { data, error } = await window.sb.from('store_settings').select('*');
      if (error) { console.warn('Store settings unavailable:', error.message); return settingsCache; }
      (data || []).forEach((row) => { settingsCache[row.key] = row.value; });
      window.dispatchEvent(new CustomEvent('tjf:settings', { detail: settingsCache }));
      return settingsCache;
    },
    supportNumber() {
      const raw = settingsCache.whatsapp_support;
      const value = raw && typeof raw === 'object' ? (raw.number || raw.phone) : raw;
      return String(value || '919876543210').replace(/\D/g, '') || '919876543210';
    },
  };
  window.TJFSettings.refresh();

  const updateSupportLinks = () => document.querySelectorAll('[data-whatsapp-support]').forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      const current = window.TJFCurrentProduct;
      const message = current?.name
        ? `Hi THE JEANS FACTORY, I’m interested in ${current.name}${current.size ? ` in size W${current.size}` : ''}. Can you help me?`
        : 'Hi THE JEANS FACTORY, I need help with my order or a product.';
      window.open(`https://wa.me/${window.TJFSettings.supportNumber()}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    };
  });
  document.addEventListener('DOMContentLoaded', updateSupportLinks);
  window.addEventListener('tjf:settings', updateSupportLinks);

  function initDropCountdown() {
    const bar = document.querySelector('#drop-countdown-bar');
    if (!bar) return;
    let timer;
    const paint = (settings) => {
      clearInterval(timer);
      let drop = settings.drop_countdown;
      if (typeof drop === 'string') { try { drop = JSON.parse(drop); } catch { drop = { label: drop }; } }
      if (!drop || drop.enabled === false) { bar.hidden = true; return; }
      bar.hidden = false;
      const label = bar.querySelector('[data-drop-label]');
      const clock = bar.querySelector('[data-drop-clock]');
      if (label) label.textContent = drop.label || 'NEXT DROP';
      const target = new Date(drop.ends_at || drop.date || drop.target_date || '').getTime();
      const tick = () => {
        const remain = Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0;
        const days = Math.floor(remain / 86400000); const hours = Math.floor((remain / 3600000) % 24);
        const mins = Math.floor((remain / 60000) % 60); const secs = Math.floor((remain / 1000) % 60);
        if (clock) clock.textContent = [days, hours, mins, secs].map((n) => String(n).padStart(2, '0')).join(' : ');
      };
      tick(); timer = setInterval(tick, 1000);
    };
    paint(window.TJFSettings?.values || {});
    window.addEventListener('tjf:settings', (event) => paint(event.detail || {}));
  }
  document.addEventListener('DOMContentLoaded', initDropCountdown);

  const sizes = [28, 30, 32, 34, 36];
  const stocks = (row) => Object.fromEntries(sizes.map((size) => [size, Math.max(0, Number(row?.[`stock_${size}`]) || 0)]));
  const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function findProduct(rows, id, name) {
    const keys = new Set([normalize(id), normalize(name)]);
    return rows.find((row) => [row.id, row.slug, row.handle, row.product_id, row.name, row.title]
      .some((value) => value != null && keys.has(normalize(value))));
  }
  window.TJFInventory = {
    sizes,
    rows: [],
    loaded: false,
    error: null,
    async refresh() {
      if (!window.sb) return this.rows;
      const { data, error } = await window.sb.from('products').select('*');
      if (error) throw error;
      this.rows = data || [];
      this.loaded = true;
      this.error = null;
      window.dispatchEvent(new CustomEvent('tjf:inventory', { detail: this.rows }));
      return this.rows;
    },
    row(id, name) { return findProduct(this.rows, id, name); },
    databaseId(id, name) {
      const row = findProduct(this.rows, id, name);
      return row?.id ?? row?.product_id ?? row?.slug ?? id;
    },
    stock(id, name, size) {
      const row = findProduct(this.rows, id, name);
      return row ? Math.max(0, Number(row[`stock_${size}`]) || 0) : null;
    },
    async subscribe() {
      if (!window.sb) return;
      const initial = this.refresh().catch((error) => { this.error = error; console.warn('Live inventory unavailable:', error.message); return this.rows; });
      window.sb.channel('tjf-products-stock')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          this.refresh().catch((error) => console.warn('Inventory refresh failed:', error.message));
        }).subscribe((status) => { if (status === 'SUBSCRIBED' && this.loaded) this.refresh().catch((error) => console.warn('Inventory refresh failed:', error.message)); });
      await initial;
      return this.rows;
    },
  };
  window.TJFInventory.ready = window.TJFInventory.subscribe();
})();
