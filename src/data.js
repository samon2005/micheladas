import { createClient } from '@supabase/supabase-js';
import { uid } from './utils';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloud = Boolean(url && key);
const supabase = isCloud ? createClient(url, key) : null;

const TABLES = ['products', 'sales', 'expenses'];
const lsKey = (t) => `cv_${t}`;

function readLocal(table) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(table)) || '[]');
  } catch {
    return [];
  }
}
function writeLocal(table, rows) {
  localStorage.setItem(lsKey(table), JSON.stringify(rows));
}

const byDateDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at);

function normalize(table, row) {
  if (table === 'products') return { ...row, price: Number(row.price) };
  if (table === 'sales') return { ...row, total: Number(row.total), items: row.items || [] };
  if (table === 'expenses') return { ...row, amount: Number(row.amount) };
  return row;
}

export const db = {
  async list(table) {
    if (!TABLES.includes(table)) throw new Error('Tabla inválida');
    if (isCloud) {
      const rows = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + page - 1);
        if (error) throw error;
        rows.push(...data);
        if (data.length < page) break;
      }
      return rows.map((r) => normalize(table, r));
    }
    return readLocal(table).map((r) => normalize(table, r)).sort(byDateDesc);
  },

  async insert(table, values) {
    const row = { id: uid(), created_at: new Date().toISOString(), ...values };
    if (isCloud) {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      return normalize(table, data);
    }
    writeLocal(table, [row, ...readLocal(table)]);
    return normalize(table, row);
  },

  async update(table, id, patch) {
    if (isCloud) {
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return normalize(table, data);
    }
    const rows = readLocal(table).map((r) => (r.id === id ? { ...r, ...patch } : r));
    writeLocal(table, rows);
    return normalize(table, rows.find((r) => r.id === id));
  },

  async remove(table, id) {
    if (isCloud) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return;
    }
    writeLocal(table, readLocal(table).filter((r) => r.id !== id));
  },

  // Respaldo del modo local (copia de seguridad / pasar a otro dispositivo)
  exportAll() {
    return Object.fromEntries(TABLES.map((t) => [t, readLocal(t)]));
  },
  importAll(data) {
    TABLES.forEach((t) => Array.isArray(data?.[t]) && writeLocal(t, data[t]));
  },
};
