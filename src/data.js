import { createClient } from '@supabase/supabase-js';
import { uid } from './utils';

// La clave pública (anon) está pensada para ir en el navegador: la seguridad la dan las políticas RLS.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://vlptkwoderbrbqylqjvx.supabase.co';
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscHRrd29kZXJicmJxeWxxanZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMjE4MTksImV4cCI6MjEwNTU5NzgxOX0.j13W3ilRH2iAkMC0a2YFCjp3h_bd5jlTdQGj_h1nTFI';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mic-auth' },
});

const TABLES = {
  products: 'mic_products',
  sales: 'mic_sales',
  expenses: 'mic_expenses',
  profiles: 'mic_profiles',
};

export const byDateDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at);

export function normalize(table, row) {
  if (table === 'products') return { ...row, price: Number(row.price) };
  if (table === 'sales') return { ...row, total: Number(row.total), items: row.items || [] };
  if (table === 'expenses') return { ...row, amount: Number(row.amount) };
  return row;
}

// Inserta o reemplaza por id manteniendo el orden por fecha (evita duplicados con el tiempo real)
export function upsertRow(list, row) {
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) {
    const copy = [...list];
    copy[i] = row;
    return copy;
  }
  return [row, ...list].sort(byDateDesc);
}

export const db = {
  async list(table) {
    const rows = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await supabase
        .from(TABLES[table])
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + page - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < page) break;
    }
    return rows.map((r) => normalize(table, r));
  },

  async insert(table, values) {
    const { data, error } = await supabase
      .from(TABLES[table])
      .insert({ id: uid(), ...values })
      .select()
      .single();
    if (error) throw error;
    return normalize(table, data);
  },

  async update(table, id, patch) {
    const { data, error } = await supabase.from(TABLES[table]).update(patch).eq('id', id).select().single();
    if (error) throw error;
    return normalize(table, data);
  },

  async remove(table, id) {
    const { data, error } = await supabase.from(TABLES[table]).delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('No tienes permiso para eliminar este registro');
  },

  // Escucha cambios en tiempo real de todas las tablas. Devuelve la función para cancelar.
  subscribe(onChange, onStatus) {
    let channel = supabase.channel('mic-cambios');
    Object.entries(TABLES).forEach(([name, table]) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) =>
        onChange(name, payload)
      );
    });
    channel.subscribe((status) => onStatus?.(status));
    return () => supabase.removeChannel(channel);
  },
};

export const auth = {
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async signUp(fullName, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  async ensureProfile(fullName) {
    const { data, error } = await supabase.rpc('mic_register', { p_full_name: fullName || '' });
    if (error) throw error;
    return data;
  },
};

export function authErrorMessage(e) {
  const m = e?.message || '';
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos';
  if (/email not confirmed/i.test(m)) return 'Debes confirmar tu correo antes de entrar (revisa tu bandeja de entrada)';
  if (/already registered/i.test(m)) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (/password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  return m || 'Ocurrió un error';
}
