(() => {
  'use strict';
  if (!window.supabase?.createClient) return;
  window.sb = window.supabase.createClient(
    'https://mcmcmjtcqbkfegmkebrw.supabase.co',
    'sb_publishable_bKOOAbZDrnpsinIQTsVr6A_cZ_7MnHD'
  );

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
    async refresh() {
      if (!window.sb) return this.rows;
      const { data, error } = await window.sb.from('products').select('*');
      if (error) throw error;
      this.rows = data || [];
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
      try { await this.refresh(); } catch (error) { console.warn('Live inventory unavailable:', error.message); }
      window.sb.channel('tjf-products-stock')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          this.refresh().catch((error) => console.warn('Inventory refresh failed:', error.message));
        }).subscribe();
    },
  };
  window.TJFInventory.subscribe();
})();
