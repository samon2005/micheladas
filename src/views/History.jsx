import { useMemo, useState } from 'react';
import { Empty, Icon, MethodPill, PageHead, PeriodPicker, Segmented } from '../ui';
import { addDays, dayKey, downloadCSV, fmt, fmtDayLabel, fmtTime, inRange, periodRange } from '../utils';

export default function History({ sales, onDelete }) {
  const [period, setPeriod] = useState('hoy');
  const [custom, setCustom] = useState({ from: dayKey(addDays(new Date(), -6)), to: dayKey(new Date()) });
  const [method, setMethod] = useState('todos');

  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const list = useMemo(
    () => sales.filter((s) => inRange(s.created_at, range) && (method === 'todos' || s.method === method)),
    [sales, range, method]
  );

  const groups = useMemo(() => {
    const map = new Map();
    list.forEach((s) => {
      const k = dayKey(s.created_at);
      if (!map.has(k)) map.set(k, { key: k, label: fmtDayLabel(s.created_at), items: [], total: 0 });
      const g = map.get(k);
      g.items.push(s);
      g.total += s.total;
    });
    return [...map.values()];
  }, [list]);

  const total = list.reduce((a, s) => a + s.total, 0);

  const exportCSV = () => {
    downloadCSV(`ventas-${dayKey(new Date())}.csv`, [
      ['Fecha', 'Hora', 'Productos', 'Método', 'Total', 'Nota'],
      ...list.map((s) => [
        dayKey(s.created_at),
        fmtTime(s.created_at),
        s.items.map((i) => `${i.qty}x ${i.name}`).join(', '),
        s.method,
        s.total,
        s.note || '',
      ]),
    ]);
  };

  return (
    <div className="page">
      <PageHead title="Ventas" subtitle="Historial de todas las ventas registradas">
        <button className="btn ghost" onClick={exportCSV} disabled={!list.length}>
          <Icon name="download" size={18} /> Exportar
        </button>
      </PageHead>
      <PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />
      <div className="filter-row">
        <Segmented
          value={method}
          onChange={setMethod}
          options={[['todos', 'Todos'], ['efectivo', 'Efectivo'], ['transferencia', 'Transferencia']]}
        />
        <div className="summary-inline">
          <span>{list.length} {list.length === 1 ? 'venta' : 'ventas'}</span>
          <strong>{fmt(total)}</strong>
        </div>
      </div>

      {groups.length === 0 ? (
        <Empty icon="receipt" title="No hay ventas" text="No se encontraron ventas con estos filtros." />
      ) : (
        groups.map((g) => (
          <section key={g.key} className="day-group">
            <div className="day-head">
              <h3>{g.label}</h3>
              <span>{fmt(g.total)}</span>
            </div>
            <ul className="list">
              {g.items.map((s) => (
                <li key={s.id} className="list-item">
                  <div className="li-time">{fmtTime(s.created_at)}</div>
                  <div className="li-main">
                    <strong>{s.items.map((i) => `${i.qty > 1 ? `${i.qty}× ` : ''}${i.name}`).join(', ')}</strong>
                    <div className="li-meta">
                      <MethodPill method={s.method} />
                      {s.note && <span className="muted">· {s.note}</span>}
                    </div>
                  </div>
                  <strong className="li-amount">{fmt(s.total)}</strong>
                  <button className="icon-btn danger" aria-label="Eliminar venta"
                    onClick={() => confirm(`¿Eliminar esta venta de ${fmt(s.total)}?`) && onDelete(s.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
