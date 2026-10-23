import { useEffect, useMemo, useState } from 'react';
import { Empty, Icon, MethodPill, PageHead, PeriodPicker, Segmented } from '../ui';
import { addDays, dayKey, downloadCSV, fmt, fmtDayLabel, fmtTime, inRange, periodRange } from '../utils';

const EDIT_WINDOW = 15 * 60 * 1000;

export default function History({ sales, onDelete, isAdmin, me }) {
  const [period, setPeriod] = useState('hoy');
  const [custom, setCustom] = useState({ from: dayKey(addDays(new Date(), -6)), to: dayKey(new Date()) });
  const [method, setMethod] = useState('todos');
  const [seller, setSeller] = useState('');
  const [, setTick] = useState(0);

  // refresca cada minuto para que el botón de borrar del vendedor desaparezca al pasar 15 min
  useEffect(() => {
    if (isAdmin) return;
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, [isAdmin]);

  const sellers = useMemo(
    () => [...new Map(sales.filter((s) => s.seller_id).map((s) => [s.seller_id, s.seller_name || 'Sin nombre'])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
    [sales]
  );
  const canDelete = (s) => isAdmin || (s.seller_id === me.id && Date.now() - new Date(s.created_at).getTime() < EDIT_WINDOW);

  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const list = useMemo(
    () => sales.filter((s) => inRange(s.created_at, range) && (method === 'todos' || s.method === method) && (!seller || s.seller_id === seller)),
    [sales, range, method, seller]
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
      ['Fecha', 'Hora', 'Vendedor', 'Productos', 'Método', 'Total', 'Nota'],
      ...list.map((s) => [
        dayKey(s.created_at),
        fmtTime(s.created_at),
        s.seller_name || '',
        s.items.map((i) => `${i.qty}x ${i.name}`).join(', '),
        s.method,
        s.total,
        s.note || '',
      ]),
    ]);
  };

  return (
    <div className="page">
      <PageHead title={isAdmin ? 'Ventas' : 'Mis ventas'} subtitle={isAdmin ? 'Historial de todas las ventas registradas' : 'Historial de tus ventas'}>
        <button className="btn ghost" onClick={exportCSV} disabled={!list.length}>
          <Icon name="download" size={18} /> Exportar
        </button>
      </PageHead>
      <PeriodPicker period={period} setPeriod={setPeriod} custom={custom} setCustom={setCustom} />
      {isAdmin && sellers.length > 1 && (
        <div className="chips scroll seller-filter">
          <span className="chips-label">Vendedor:</span>
          <button className={`chip ${!seller ? 'active' : ''}`} onClick={() => setSeller('')}>Todos</button>
          {sellers.map(([id, name]) => (
            <button key={id} className={`chip ${seller === id ? 'active' : ''}`} onClick={() => setSeller(id)}>{name}</button>
          ))}
        </div>
      )}
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
                      {isAdmin && s.seller_name && <span className="tag">{s.seller_name}</span>}
                      {s.note && <span className="muted">· {s.note}</span>}
                    </div>
                  </div>
                  <strong className="li-amount">{fmt(s.total)}</strong>
                  {canDelete(s) ? (
                    <button className="icon-btn danger" aria-label="Eliminar venta"
                      onClick={() => confirm(`¿Eliminar esta venta de ${fmt(s.total)}?`) && onDelete(s.id)}>
                      <Icon name="trash" size={18} />
                    </button>
                  ) : <span className="icon-btn" />}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
