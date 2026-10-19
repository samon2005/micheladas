const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export const fmt = (n) => money.format(Math.round(Number(n) || 0));

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const METHODS = {
  efectivo: { label: 'Efectivo', icon: '💵' },
  transferencia: { label: 'Transferencia', icon: '📲' },
};

export const PRODUCT_COLORS = [
  '#e2442f', '#f5a524', '#1baf7a', '#2a78d6', '#6250d6', '#e87ba4', '#0ea5b7', '#8a5a3c',
];

export const EXPENSE_CATEGORIES = [
  'Insumos', 'Arriendo', 'Servicios', 'Nómina', 'Transporte', 'Mantenimiento', 'Publicidad', 'Otros',
];

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const fromInputDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const PERIODS = [
  ['hoy', 'Hoy'],
  ['ayer', 'Ayer'],
  ['semana', 'Esta semana'],
  ['mes', 'Este mes'],
  ['todo', 'Todo'],
  ['rango', 'Rango'],
];

// Devuelve { from, to } (to exclusivo) para un periodo
export function periodRange(period, custom) {
  const today = startOfDay(new Date());
  switch (period) {
    case 'hoy':
      return { from: today, to: addDays(today, 1) };
    case 'ayer':
      return { from: addDays(today, -1), to: today };
    case 'semana': {
      const dow = (today.getDay() + 6) % 7; // lunes = 0
      return { from: addDays(today, -dow), to: addDays(today, 1) };
    }
    case 'mes':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: addDays(today, 1) };
    case 'rango': {
      const from = custom?.from ? fromInputDate(custom.from) : today;
      const to = custom?.to ? addDays(fromInputDate(custom.to), 1) : addDays(today, 1);
      return { from, to };
    }
    default:
      return { from: null, to: addDays(today, 1) };
  }
}

export const inRange = (iso, { from, to }) => {
  const t = new Date(iso).getTime();
  return (!from || t >= from.getTime()) && t < to.getTime();
};

const timeFmt = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
const shortFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });

export const fmtTime = (iso) => timeFmt.format(new Date(iso));
export const fmtDate = (iso) => dateFmt.format(new Date(iso));
export const fmtShort = (d) => shortFmt.format(new Date(d));

export function fmtDayLabel(iso) {
  const k = dayKey(iso);
  const today = new Date();
  if (k === dayKey(today)) return 'Hoy';
  if (k === dayKey(addDays(today, -1))) return 'Ayer';
  return fmtDate(iso);
}

export const parseAmount = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;

export const formatInput = (s) => {
  const n = parseAmount(s);
  return n ? n.toLocaleString('es-CO') : '';
};

export function downloadCSV(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
